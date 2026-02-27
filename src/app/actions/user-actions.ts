'use server';

import { saveCollectionRecord, getCollectionData, getSingleRecord, deleteCollectionRecord } from './mysql-actions';
import { DataSource, User, Assignment, Entitlement, Resource, Task, TaskComment, EntitlementAssignment, UserCapability, UserPosition } from '@/lib/types';
import { logAuditEventAction } from './audit-actions';
import { createJiraTicket, getJiraConfigs } from './jira-actions';

/**
 * Startet den Offboarding-Prozess für einen Mitarbeiter.
 */
export async function startOffboardingAction(
  userId: string, 
  offboardingDate: string,
  dataSource: DataSource = 'mysql',
  actorEmail: string = 'system'
) {
  try {
    const userRes = await getSingleRecord('users', userId, dataSource);
    const user = userRes.data as User;
    if (!user) throw new Error("Benutzer nicht gefunden.");

    const now = new Date().toISOString();
    const targetTenantId = user.tenantId;

    const assignmentsRes = await getCollectionData('assignments', dataSource);
    const userAssignments = assignmentsRes.data?.filter((a: Assignment) => a.userId === userId && a.status === 'active') || [];
    const entitlementAssignmentsRes = await getCollectionData('entitlementAssignments', dataSource);
    const userCapabilitiesRes = await getCollectionData('userCapabilities', dataSource);
    const userPositionsRes = await getCollectionData('userPositions', dataSource);

    const userEntitlementAssignments = (entitlementAssignmentsRes.data || [])
      .filter((item: EntitlementAssignment) => item.tenantId === targetTenantId)
      .filter((item: EntitlementAssignment) => item.subjectType === 'person' && item.subjectId === userId)
      .filter((item: EntitlementAssignment) => item.status === 'active' || item.status === 'approved');

    const activeUserCapabilities = (userCapabilitiesRes.data || [])
      .filter((item: UserCapability) => item.userId === userId && item.status === 'active');

    const activeUserPositions = (userPositionsRes.data || [])
      .filter((item: UserPosition) => item.userId === userId && item.status === 'active');

    const entitlementsRes = await getCollectionData('entitlements', dataSource);
    const resourcesRes = await getCollectionData('resources', dataSource);

    let jiraDescription = `Automatisches OFFBOARDING-Ticket erstellt via ComplianceHub Gateway.\n\n`;
    jiraDescription += `BENUTZERDATEN:\n`;
    jiraDescription += `- Name: ${user.displayName}\n`;
    jiraDescription += `- E-Mail: ${user.email}\n`;
    jiraDescription += `- Austrittsdatum: ${offboardingDate}\n\n`;
    jiraDescription += `ZU ENTZIEHENDE BERECHTIGUNGEN (${userAssignments.length + userEntitlementAssignments.length}):\n`;

    for (const a of userAssignments) {
      const ent = entitlementsRes.data?.find((e: Entitlement) => e.id === a.entitlementId);
      const res = resourcesRes.data?.find((r: Resource) => r.id === ent?.resourceId);
      if (ent && res) {
        jiraDescription += `- [${res.name}] : ${ent.name}\n`;
      }
    }

    for (const a of userEntitlementAssignments) {
      const ent = entitlementsRes.data?.find((e: Entitlement) => e.id === a.entitlementId);
      const res = resourcesRes.data?.find((r: Resource) => r.id === ent?.resourceId);
      if (ent && res) {
        jiraDescription += `- [${res.name}] : ${ent.name} (Entitlement-Assignment)\n`;
      }
    }

    const configs = await getJiraConfigs(dataSource);
    let jiraKey = 'manuell';
    if (configs.length > 0 && configs[0].enabled) {
      const res = await createJiraTicket(configs[0].id, `Offboarding: ${user.displayName}`, jiraDescription, dataSource);
      if (res.success) jiraKey = res.key!;
    }

    const updatedUser = { ...user, enabled: false, status: 'archived', offboardingDate };
    await saveCollectionRecord('users', userId, updatedUser, dataSource);

    for (const a of userAssignments) {
      const updatedAss = { ...a, status: 'pending_removal', jiraIssueKey: jiraKey };
      await saveCollectionRecord('assignments', a.id, updatedAss, dataSource);
    }

    for (const a of userEntitlementAssignments) {
      const updatedAss = { ...a, status: 'pending_removal', ticketRef: jiraKey };
      await saveCollectionRecord('entitlementAssignments', a.id, updatedAss, dataSource);
    }

    for (const link of activeUserCapabilities) {
      const updatedLink = { ...link, status: 'archived', validUntil: offboardingDate };
      await saveCollectionRecord('userCapabilities', link.id, updatedLink, dataSource);
    }

    for (const link of activeUserPositions) {
      const updatedLink = { ...link, status: 'archived', validUntil: offboardingDate };
      await saveCollectionRecord('userPositions', link.id, updatedLink, dataSource);
    }

    await logAuditEventAction(dataSource, {
      tenantId: targetTenantId,
      actorUid: actorEmail,
      action: `Offboarding Prozess gestartet: ${user.displayName} (Jira: ${jiraKey})`,
      entityType: 'user',
      entityId: userId,
      after: updatedUser
    });

    return { success: true, jiraKey };
  } catch (e: any) {
    console.error("Offboarding Error:", e);
    return { success: false, error: e.message };
  }
}

/**
 * Prüft auf Abhängigkeiten und löscht einen Benutzer permanent.
 */
export async function deleteUserAction(userId: string, dataSource: DataSource = 'mysql', actorEmail: string = 'system') {
  try {
    const userRes = await getSingleRecord('users', userId, dataSource);
    const user = userRes.data as User;
    if (!user) throw new Error("Benutzer nicht gefunden.");

    const blockers: string[] = [];

    // 1. Check Assignments
    const assRes = await getCollectionData('assignments', dataSource);
    const userAss = assRes.data?.filter((a: Assignment) => a.userId === userId && a.status !== 'removed') || [];
    if (userAss.length > 0) {
      blockers.push(`Der Benutzer hat noch ${userAss.length} aktive oder angeforderte Berechtigungen.`);
    }

    // 1b. Check EntitlementAssignments (new model)
    const entitlementAssRes = await getCollectionData('entitlementAssignments', dataSource);
    const userEntitlementAss = entitlementAssRes.data?.filter(
      (a: EntitlementAssignment) => a.subjectType === 'person' && a.subjectId === userId && a.status !== 'removed'
    ) || [];
    if (userEntitlementAss.length > 0) {
      blockers.push(`Der Benutzer hat noch ${userEntitlementAss.length} aktive Entitlement-Zuweisungen.`);
    }

    // 1c. Check capability/position links
    const userCapabilitiesRes = await getCollectionData('userCapabilities', dataSource);
    const activeCapabilityLinks = userCapabilitiesRes.data?.filter((link: UserCapability) => link.userId === userId && link.status === 'active') || [];
    if (activeCapabilityLinks.length > 0) {
      blockers.push(`Der Benutzer hat noch ${activeCapabilityLinks.length} aktive Zusatzfunktionen.`);
    }

    const userPositionsRes = await getCollectionData('userPositions', dataSource);
    const activePositionLinks = userPositionsRes.data?.filter((link: UserPosition) => link.userId === userId && link.status === 'active') || [];
    if (activePositionLinks.length > 0) {
      blockers.push(`Der Benutzer hat noch ${activePositionLinks.length} aktive organisatorische Rollen.`);
    }

    // 2. Check Tasks
    const taskRes = await getCollectionData('tasks', dataSource);
    const userTasks = taskRes.data?.filter((t: Task) => t.assigneeId === userId || t.creatorId === userId) || [];
    if (userTasks.length > 0) {
      blockers.push(`Der Benutzer ist als Verantwortlicher oder Ersteller in ${userTasks.length} Aufgaben eingetragen.`);
    }

    // 3. Check Comments
    const commRes = await getCollectionData('task_comments', dataSource);
    const userComments = commRes.data?.filter((c: TaskComment) => c.userId === userId) || [];
    if (userComments.length > 0) {
      blockers.push(`Der Benutzer hat ${userComments.length} Kommentare im Aufgaben-Journal hinterlassen.`);
    }

    if (blockers.length > 0) {
      return { success: false, error: "Löschen nicht möglich", blockers };
    }

    const res = await deleteCollectionRecord('users', userId, dataSource);
    if (res.success) {
      await logAuditEventAction(dataSource, {
        tenantId: user.tenantId,
        actorUid: actorEmail,
        action: `Benutzer permanent gelöscht: ${user.displayName}`,
        entityType: 'user',
        entityId: userId,
        before: user
      });
    }
    return res;
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}
