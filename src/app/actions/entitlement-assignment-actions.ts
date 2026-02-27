'use server';

import { getCollectionData, getSingleRecord, saveCollectionRecord } from './mysql-actions';
import { logAuditEventAction } from './audit-actions';
import { Assignment, DataSource, Department, Entitlement, EntitlementAssignment, JobTitle, OrgUnit, OrgUnitType, Tenant, User, UserCapability, UserPosition } from '@/lib/types';
import { computeEffectiveAccess } from '@/lib/effective-access';

function nowIso() {
  return new Date().toISOString();
}

function dedupe(values: string[]) {
  return Array.from(new Set(values));
}

function toSet(values: string[]) {
  return new Set(values);
}

function setDifference(source: Set<string>, target: Set<string>) {
  return Array.from(source).filter((value) => !target.has(value));
}

export async function upsertEntitlementAssignmentAction(
  input: Partial<EntitlementAssignment> & {
    tenantId: string;
    subjectType: EntitlementAssignment['subjectType'];
    subjectId: string;
    entitlementId: string;
  },
  dataSource: DataSource = 'mysql',
  actorEmail: string = 'system'
) {
  try {
    const id = input.id || `eas-${Math.random().toString(36).substring(2, 10)}`;
    const data: EntitlementAssignment = {
      id,
      tenantId: input.tenantId,
      subjectType: input.subjectType,
      subjectId: input.subjectId,
      entitlementId: input.entitlementId,
      status: input.status || 'active',
      assignmentSource: input.assignmentSource || 'manual',
      reason: input.reason,
      validFrom: input.validFrom,
      validUntil: input.validUntil,
      scopeOrgUnitId: input.scopeOrgUnitId,
      scopeIncludeChildren: input.scopeIncludeChildren || false,
      scopeResourceContext: input.scopeResourceContext,
      grantedBy: input.grantedBy || actorEmail,
      grantedAt: input.grantedAt || nowIso(),
      ticketRef: input.ticketRef,
      notes: input.notes,
    };

    const result = await saveCollectionRecord('entitlementAssignments', id, data, dataSource);
    if (!result.success) return result;

    await logAuditEventAction(dataSource, {
      tenantId: data.tenantId,
      actorUid: actorEmail,
      action: input.id ? 'Entitlement-Zuweisung aktualisiert' : 'Entitlement-Zuweisung erstellt',
      entityType: 'entitlementAssignment',
      entityId: id,
      after: data,
    });

    return { success: true, id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function listEntitlementAssignmentsBySubjectAction(
  tenantId: string,
  subjectType: EntitlementAssignment['subjectType'],
  subjectId: string,
  dataSource: DataSource = 'mysql'
) {
  const response = await getCollectionData('entitlementAssignments', dataSource);
  if (response.error) return { data: [], error: response.error };

  const rows = (response.data || []) as EntitlementAssignment[];
  const filtered = rows.filter(
    (row) => row.tenantId === tenantId && row.subjectType === subjectType && row.subjectId === subjectId
  );

  return { data: filtered, error: null };
}

export async function getEffectiveAccessForUserAction(
  userId: string,
  dataSource: DataSource = 'mysql'
) {
  try {
    const userResponse = await getSingleRecord('users', userId, dataSource);
    const user = userResponse.data as User | null;
    if (!user) return { data: [], error: 'Benutzer nicht gefunden.' };

    const [entitlementRows, assignmentRows, userPositionsRows, userCapabilitiesRows] = await Promise.all([
      getCollectionData('entitlements', dataSource),
      getCollectionData('entitlementAssignments', dataSource),
      getCollectionData('userPositions', dataSource),
      getCollectionData('userCapabilities', dataSource),
    ]);

    if (entitlementRows.error) return { data: [], error: entitlementRows.error };
    if (assignmentRows.error) return { data: [], error: assignmentRows.error };
    if (userPositionsRows.error) return { data: [], error: userPositionsRows.error };
    if (userCapabilitiesRows.error) return { data: [], error: userCapabilitiesRows.error };

    const entitlements = (entitlementRows.data || []) as Entitlement[];
    const assignments = (assignmentRows.data || []) as EntitlementAssignment[];
    const userPositions = (userPositionsRows.data || []) as UserPosition[];
    const userCapabilities = (userCapabilitiesRows.data || []) as UserCapability[];

    const userPositionIds = userPositions
      .filter((item) => item.userId === userId && item.status === 'active')
      .map((item) => item.positionId);

    const userCapabilityIds = userCapabilities
      .filter((item) => item.userId === userId && item.status === 'active')
      .map((item) => item.capabilityId);

    const tenantAssignments = assignments.filter((item) => item.tenantId === user.tenantId);

    const data = computeEffectiveAccess({
      userId,
      userJobTitleIds: user.jobIds || [],
      userPositionIds,
      userCapabilityIds,
      directAssignments: tenantAssignments.filter((item) => item.subjectType === 'person'),
      inheritedAssignments: tenantAssignments.filter((item) => item.subjectType !== 'person'),
      entitlements,
    });

    return { data, error: null };
  } catch (error: any) {
    return { data: [], error: error.message };
  }
}

type BackfillScope = {
  tenantId?: string;
  includeRequestedAssignments?: boolean;
};

export async function runEntitlementBackfillMigrationAction(
  scope: BackfillScope = {},
  dataSource: DataSource = 'mysql',
  actorEmail: string = 'system'
) {
  try {
    const [
      tenantsResponse,
      departmentsResponse,
      usersResponse,
      jobTitlesResponse,
      assignmentsResponse,
      orgUnitTypesResponse,
      orgUnitsResponse,
      userOrgUnitsResponse,
      userPositionsResponse,
      entitlementAssignmentsResponse,
    ] = await Promise.all([
      getCollectionData('tenants', dataSource),
      getCollectionData('departments', dataSource),
      getCollectionData('users', dataSource),
      getCollectionData('jobTitles', dataSource),
      getCollectionData('assignments', dataSource),
      getCollectionData('orgUnitTypes', dataSource),
      getCollectionData('orgUnits', dataSource),
      getCollectionData('userOrgUnits', dataSource),
      getCollectionData('userPositions', dataSource),
      getCollectionData('entitlementAssignments', dataSource),
    ]);

    const possibleError = [
      tenantsResponse.error,
      departmentsResponse.error,
      usersResponse.error,
      jobTitlesResponse.error,
      assignmentsResponse.error,
      orgUnitTypesResponse.error,
      orgUnitsResponse.error,
      userOrgUnitsResponse.error,
      userPositionsResponse.error,
      entitlementAssignmentsResponse.error,
    ].find(Boolean);

    if (possibleError) {
      return { success: false, error: possibleError };
    }

    const tenants = (tenantsResponse.data || []) as Tenant[];
    const departments = (departmentsResponse.data || []) as Department[];
    const users = (usersResponse.data || []) as User[];
    const jobTitles = (jobTitlesResponse.data || []) as JobTitle[];
    const assignments = (assignmentsResponse.data || []) as Assignment[];
    const orgUnitTypes = (orgUnitTypesResponse.data || []) as OrgUnitType[];
    const orgUnits = (orgUnitsResponse.data || []) as OrgUnit[];
    const userOrgUnits = (userOrgUnitsResponse.data || []) as any[];
    const userPositions = (userPositionsResponse.data || []) as UserPosition[];
    const entitlementAssignments = (entitlementAssignmentsResponse.data || []) as EntitlementAssignment[];

    const activeTenants = tenants.filter((item) => !scope.tenantId || item.id === scope.tenantId);
    const now = nowIso();

    const counters = {
      orgUnitTypesCreated: 0,
      orgUnitsCreated: 0,
      userOrgUnitsCreated: 0,
      positionsCreated: 0,
      userPositionsCreated: 0,
      entitlementAssignmentsCreated: 0,
      skippedExisting: 0,
    };

    const orgUnitTypeIndex = new Map<string, OrgUnitType>();
    orgUnitTypes.forEach((item) => orgUnitTypeIndex.set(`${item.tenantId}|${item.key}`, item));

    const orgUnitIndex = new Map<string, OrgUnit>();
    orgUnits.forEach((item) => orgUnitIndex.set(item.id, item));

    const existingUserOrgLink = new Set(userOrgUnits.map((item) => `${item.userId}|${item.orgUnitId}`));
    const existingUserPositionLink = new Set(userPositions.map((item) => `${item.userId}|${item.positionId}`));
    const existingEntitlementAssignment = new Set(
      entitlementAssignments.map((item) => `${item.tenantId}|${item.subjectType}|${item.subjectId}|${item.entitlementId}`)
    );

    const ensureOrgType = async (tenantId: string, key: string, name: string, sortOrder: number) => {
      const lookup = `${tenantId}|${key}`;
      const existing = orgUnitTypeIndex.get(lookup);
      if (existing) return existing.id;

      const id = `out-${tenantId}-${key}`;
      const payload: OrgUnitType = {
        id,
        tenantId,
        key,
        name,
        enabled: true,
        sortOrder,
      };
      await saveCollectionRecord('orgUnitTypes', id, payload, dataSource);
      orgUnitTypeIndex.set(lookup, payload);
      counters.orgUnitTypesCreated += 1;
      return id;
    };

    const ensureOrgUnit = async (payload: OrgUnit) => {
      if (orgUnitIndex.has(payload.id)) return;
      await saveCollectionRecord('orgUnits', payload.id, payload, dataSource);
      orgUnitIndex.set(payload.id, payload);
      counters.orgUnitsCreated += 1;
    };

    for (const tenant of activeTenants) {
      const companyTypeId = await ensureOrgType(tenant.id, 'company', 'Firma', 0);
      const departmentTypeId = await ensureOrgType(tenant.id, 'department', 'Abteilung', 10);

      const tenantOrgUnitId = `ou-tenant-${tenant.id}`;
      await ensureOrgUnit({
        id: tenantOrgUnitId,
        tenantId: tenant.id,
        name: tenant.name,
        typeId: companyTypeId,
        parentId: undefined,
        status: 'active',
        sortOrder: 0,
      });

      const tenantDepartments = departments.filter((item) => item.tenantId === tenant.id);
      for (const department of tenantDepartments) {
        const deptOrgUnitId = `ou-dept-${department.id}`;
        await ensureOrgUnit({
          id: deptOrgUnitId,
          tenantId: tenant.id,
          name: department.name,
          typeId: departmentTypeId,
          parentId: tenantOrgUnitId,
          status: department.status === 'archived' ? 'archived' : 'active',
          sortOrder: 0,
        });
      }
    }

    const positionsById = new Set<string>();

    for (const jobTitle of jobTitles) {
      if (scope.tenantId && jobTitle.tenantId !== scope.tenantId) continue;

      const positionId = `pos-jt-${jobTitle.id}`;
      positionsById.add(positionId);
      const deptOrgUnitId = `ou-dept-${jobTitle.departmentId}`;
      const positionPayload = {
        id: positionId,
        tenantId: jobTitle.tenantId,
        name: jobTitle.name,
        orgUnitId: orgUnitIndex.has(deptOrgUnitId) ? deptOrgUnitId : undefined,
        jobTitleId: jobTitle.id,
        description: jobTitle.description,
        status: jobTitle.status === 'archived' ? 'archived' : 'active',
      };
      await saveCollectionRecord('positions', positionId, positionPayload, dataSource);
      counters.positionsCreated += 1;

      const blueprintEntitlements = dedupe(jobTitle.entitlementIds || []);
      for (const entitlementId of blueprintEntitlements) {
        const assignmentKey = `${jobTitle.tenantId}|jobTitle|${jobTitle.id}|${entitlementId}`;
        if (existingEntitlementAssignment.has(assignmentKey)) {
          counters.skippedExisting += 1;
          continue;
        }

        const id = `eas-jt-${jobTitle.id}-${entitlementId}`;
        const payload: EntitlementAssignment = {
          id,
          tenantId: jobTitle.tenantId,
          subjectType: 'jobTitle',
          subjectId: jobTitle.id,
          entitlementId,
          status: 'active',
          assignmentSource: 'profile',
          reason: 'Backfill aus Stellenprofil-Standardberechtigungen',
          grantedBy: actorEmail,
          grantedAt: now,
          validFrom: now,
        };
        await saveCollectionRecord('entitlementAssignments', id, payload, dataSource);
        existingEntitlementAssignment.add(assignmentKey);
        counters.entitlementAssignmentsCreated += 1;
      }
    }

    for (const user of users) {
      if (scope.tenantId && user.tenantId !== scope.tenantId) continue;

      if (user.department) {
        const matchingDepartment = departments.find(
          (item) => item.tenantId === user.tenantId && item.name.toLowerCase() === user.department.toLowerCase()
        );

        if (matchingDepartment) {
          const orgUnitId = `ou-dept-${matchingDepartment.id}`;
          const linkKey = `${user.id}|${orgUnitId}`;
          if (!existingUserOrgLink.has(linkKey)) {
            const id = `uou-${user.id}-${matchingDepartment.id}`;
            await saveCollectionRecord('userOrgUnits', id, {
              id,
              tenantId: user.tenantId,
              userId: user.id,
              orgUnitId,
              roleType: 'member',
              status: 'active',
              validFrom: now,
            }, dataSource);
            existingUserOrgLink.add(linkKey);
            counters.userOrgUnitsCreated += 1;
          } else {
            counters.skippedExisting += 1;
          }
        }
      }

      for (const jobId of dedupe(user.jobIds || [])) {
        const positionId = `pos-jt-${jobId}`;
        if (!positionsById.has(positionId)) continue;
        const linkKey = `${user.id}|${positionId}`;
        if (existingUserPositionLink.has(linkKey)) {
          counters.skippedExisting += 1;
          continue;
        }

        const id = `up-${user.id}-${jobId}`;
        await saveCollectionRecord('userPositions', id, {
          id,
          tenantId: user.tenantId,
          userId: user.id,
          positionId,
          isPrimary: (user.jobIds || [])[0] === jobId,
          status: 'active',
          validFrom: now,
        }, dataSource);
        existingUserPositionLink.add(linkKey);
        counters.userPositionsCreated += 1;
      }
    }

    const legacyAllowedStatuses: Assignment['status'][] = scope.includeRequestedAssignments
      ? ['active', 'requested', 'pending_removal']
      : ['active'];

    for (const assignment of assignments) {
      if (!legacyAllowedStatuses.includes(assignment.status)) continue;
      const user = users.find((item) => item.id === assignment.userId);
      if (!user) continue;
      if (scope.tenantId && user.tenantId !== scope.tenantId) continue;

      const key = `${user.tenantId}|person|${assignment.userId}|${assignment.entitlementId}`;
      if (existingEntitlementAssignment.has(key)) {
        counters.skippedExisting += 1;
        continue;
      }

      const id = `eas-legacy-${assignment.id}`;
      const payload: EntitlementAssignment = {
        id,
        tenantId: user.tenantId,
        subjectType: 'person',
        subjectId: assignment.userId,
        entitlementId: assignment.entitlementId,
        status: assignment.status === 'requested' ? 'requested' : 'active',
        assignmentSource: 'exception',
        reason: 'Backfill aus Legacy Assignment',
        grantedBy: assignment.grantedBy,
        grantedAt: assignment.grantedAt || now,
        validFrom: assignment.validFrom,
        validUntil: assignment.validUntil,
        ticketRef: assignment.ticketRef,
        notes: assignment.notes,
      };

      await saveCollectionRecord('entitlementAssignments', id, payload, dataSource);
      existingEntitlementAssignment.add(key);
      counters.entitlementAssignmentsCreated += 1;
    }

    await logAuditEventAction(dataSource, {
      tenantId: scope.tenantId || 'all',
      actorUid: actorEmail,
      action: 'Backfill-Migration für Entitlement-Modell durchgeführt',
      entityType: 'migration',
      entityId: `migration-backfill-${Date.now()}`,
      after: counters,
    });

    return { success: true, data: counters };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function compareEffectiveAccessBeforeAfterAction(
  tenantId?: string,
  dataSource: DataSource = 'mysql'
) {
  try {
    const [
      usersResponse,
      jobTitlesResponse,
      legacyAssignmentsResponse,
      newAssignmentsResponse,
      entitlementsResponse,
      userPositionsResponse,
      userCapabilitiesResponse,
    ] = await Promise.all([
      getCollectionData('users', dataSource),
      getCollectionData('jobTitles', dataSource),
      getCollectionData('assignments', dataSource),
      getCollectionData('entitlementAssignments', dataSource),
      getCollectionData('entitlements', dataSource),
      getCollectionData('userPositions', dataSource),
      getCollectionData('userCapabilities', dataSource),
    ]);

    const possibleError = [
      usersResponse.error,
      jobTitlesResponse.error,
      legacyAssignmentsResponse.error,
      newAssignmentsResponse.error,
      entitlementsResponse.error,
      userPositionsResponse.error,
      userCapabilitiesResponse.error,
    ].find(Boolean);

    if (possibleError) return { success: false, error: possibleError };

    const users = (usersResponse.data || []) as User[];
    const jobTitles = (jobTitlesResponse.data || []) as JobTitle[];
    const legacyAssignments = (legacyAssignmentsResponse.data || []) as Assignment[];
    const newAssignments = (newAssignmentsResponse.data || []) as EntitlementAssignment[];
    const entitlements = (entitlementsResponse.data || []) as Entitlement[];
    const userPositions = (userPositionsResponse.data || []) as UserPosition[];
    const userCapabilities = (userCapabilitiesResponse.data || []) as UserCapability[];

    const scopedUsers = users.filter((item) => !tenantId || item.tenantId === tenantId);
    const diffDetails: Array<{
      userId: string;
      displayName: string;
      missingAfter: string[];
      gainedAfter: string[];
      beforeCount: number;
      afterCount: number;
    }> = [];

    for (const user of scopedUsers) {
      const activeLegacyAssignmentIds = legacyAssignments
        .filter((item) => item.userId === user.id && item.status === 'active')
        .map((item) => item.entitlementId);

      const blueprintIds: string[] = [];
      for (const jobId of user.jobIds || []) {
        const jobTitle = jobTitles.find((item) => item.id === jobId);
        if (jobTitle?.entitlementIds?.length) blueprintIds.push(...jobTitle.entitlementIds);
      }

      const beforeSet = toSet(dedupe([...activeLegacyAssignmentIds, ...blueprintIds]));

      const tenantAssignments = newAssignments.filter((item) => item.tenantId === user.tenantId);
      const userPositionIds = userPositions
        .filter((item) => item.userId === user.id && item.status === 'active')
        .map((item) => item.positionId);
      const userCapabilityIds = userCapabilities
        .filter((item) => item.userId === user.id && item.status === 'active')
        .map((item) => item.capabilityId);

      const afterGrants = computeEffectiveAccess({
        userId: user.id,
        userJobTitleIds: user.jobIds || [],
        userPositionIds,
        userCapabilityIds,
        directAssignments: tenantAssignments.filter((item) => item.subjectType === 'person'),
        inheritedAssignments: tenantAssignments.filter((item) => item.subjectType !== 'person'),
        entitlements,
      });

      const afterSet = toSet(dedupe(afterGrants.map((item) => item.entitlementId)));

      const missingAfter = setDifference(beforeSet, afterSet);
      const gainedAfter = setDifference(afterSet, beforeSet);

      if (missingAfter.length > 0 || gainedAfter.length > 0) {
        diffDetails.push({
          userId: user.id,
          displayName: user.displayName,
          missingAfter,
          gainedAfter,
          beforeCount: beforeSet.size,
          afterCount: afterSet.size,
        });
      }
    }

    const summary = {
      usersChecked: scopedUsers.length,
      usersWithDiff: diffDetails.length,
      usersWithoutDiff: scopedUsers.length - diffDetails.length,
      totalMissingAfter: diffDetails.reduce((acc, item) => acc + item.missingAfter.length, 0),
      totalGainedAfter: diffDetails.reduce((acc, item) => acc + item.gainedAfter.length, 0),
    };

    return { success: true, data: { summary, diffs: diffDetails } };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
