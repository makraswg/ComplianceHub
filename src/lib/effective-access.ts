import { Entitlement, EntitlementAssignment, EffectiveAccessGrant } from './types';

type SubjectType = EntitlementAssignment['subjectType'];

export interface EffectiveAccessInput {
  userId: string;
  userJobTitleIds?: string[];
  userPositionIds?: string[];
  userCapabilityIds?: string[];
  directAssignments?: EntitlementAssignment[];
  inheritedAssignments?: EntitlementAssignment[];
  entitlements: Entitlement[];
  asOf?: string;
}

function isWithinValidityWindow(assignment: EntitlementAssignment, asOf: string): boolean {
  const from = assignment.validFrom ? Date.parse(assignment.validFrom) : null;
  const until = assignment.validUntil ? Date.parse(assignment.validUntil) : null;
  const ts = Date.parse(asOf);

  if (!Number.isFinite(ts)) return true;
  if (from !== null && Number.isFinite(from) && ts < from) return false;
  if (until !== null && Number.isFinite(until) && ts > until) return false;
  return true;
}

function isEffectiveStatus(status: EntitlementAssignment['status']): boolean {
  return status === 'active' || status === 'approved';
}

function getSourceLabel(subjectType: SubjectType): string {
  if (subjectType === 'person') return 'Person';
  if (subjectType === 'position') return 'Position';
  if (subjectType === 'jobTitle') return 'Stellenprofil';
  return 'Function';
}

export function computeEffectiveAccess(input: EffectiveAccessInput): EffectiveAccessGrant[] {
  const asOf = input.asOf ?? new Date().toISOString();
  const entitlementById = new Map(input.entitlements.map((entitlement) => [entitlement.id, entitlement]));

  const allowedSubjects = new Map<SubjectType, Set<string>>();
  allowedSubjects.set('person', new Set([input.userId]));
  allowedSubjects.set('position', new Set(input.userPositionIds ?? []));
  allowedSubjects.set('jobTitle', new Set(input.userJobTitleIds ?? []));
  allowedSubjects.set('capability', new Set(input.userCapabilityIds ?? []));

  const allAssignments = [...(input.inheritedAssignments ?? []), ...(input.directAssignments ?? [])];
  const grants: EffectiveAccessGrant[] = [];

  for (const assignment of allAssignments) {
    if (!isEffectiveStatus(assignment.status)) continue;
    if (!isWithinValidityWindow(assignment, asOf)) continue;

    const subjects = allowedSubjects.get(assignment.subjectType);
    if (!subjects || !subjects.has(assignment.subjectId)) continue;

    const entitlement = entitlementById.get(assignment.entitlementId);
    if (!entitlement) continue;

    grants.push({
      entitlementId: assignment.entitlementId,
      resourceId: entitlement.resourceId,
      sourceType: assignment.subjectType,
      sourceId: assignment.subjectId,
      sourceLabel: getSourceLabel(assignment.subjectType),
      scopeOrgUnitId: assignment.scopeOrgUnitId,
      scopeIncludeChildren: assignment.scopeIncludeChildren === true || assignment.scopeIncludeChildren === 1,
      scopeResourceContext: assignment.scopeResourceContext,
    });
  }

  return grants;
}
