
'use server';

import { saveCollectionRecord, getCollectionData, getSingleRecord } from './mysql-actions';
import { DataSource, User, Assignment, Entitlement, Resource } from '@/lib/types';
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
    // 1. Benutzer laden
    const userRes = await getSingleRecord('users', userId, dataSource);
    const user = userRes.data as User;
    if (!user) throw new Error("Benutzer nicht gefunden.");

    const now = new Date().toISOString();
    const targetTenantId = user.tenantId;

    // 2. Aktive Berechtigungen finden
    const assignmentsRes = await getCollectionData('assignments', dataSource);
    const userAssignments = assignmentsRes.data?.filter((a: Assignment) => a.userId === userId && a.status === 'active') || [];

    // 3. Jira Ticket für Entzug vorbereiten
    const entitlementsRes = await getCollectionData('entitlements', dataSource);
    const resourcesRes = await getCollectionData('resources', dataSource);

    let jiraDescription = `Automatisches OFFBOARDING-Ticket erstellt via ComplianceHub Gateway.\n\n`;
    jiraDescription += `BENUTZERDATEN:\n`;
    jiraDescription += `- Name: ${user.displayName}\n`;
    jiraDescription += `- E-Mail: ${user.email}\n`;
    jiraDescription += `- Austrittsdatum: ${offboardingDate}\n\n`;
    jiraDescription += `ZU ENTZIEHENDE BERECHTIGUNGEN (${userAssignments.length}):\n`;

    for (const a of userAssignments) {
      const ent = entitlementsRes.data?.find((e: Entitlement) => e.id === a.entitlementId);
      const res = resourcesRes.data?.find((r: Resource) => r.id === ent?.resourceId);
      if (ent && res) {
        jiraDescription += `- [${res.name}] : ${ent.name}\n`;
      }
    }

    const configs = await getJiraConfigs(dataSource);
    let jiraKey = 'manuell';
    if (configs.length > 0 && configs[0].enabled) {
      const res = await createJiraTicket(configs[0].id, `Offboarding: ${user.displayName}`, jiraDescription, dataSource);
      if (res.success) jiraKey = res.key!;
    }

    // 4. Status-Updates in der DB
    // Benutzer auf inaktiv setzen
    const updatedUser = { ...user, enabled: false, status: 'archived', offboardingDate };
    await saveCollectionRecord('users', userId, updatedUser, dataSource);

    // Zuweisungen auf 'pending_removal' setzen
    for (const a of userAssignments) {
      const updatedAss = { ...a, status: 'pending_removal', jiraIssueKey: jiraKey };
      await saveCollectionRecord('assignments', a.id, updatedAss, dataSource);
    }

    // 5. Audit Log
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
