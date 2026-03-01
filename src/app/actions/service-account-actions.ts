'use server';

import { deleteCollectionRecord, getCollectionData, getSingleRecord, saveCollectionRecord } from './mysql-actions';
import { DataSource, Entitlement, ServiceAccount } from '@/lib/types';
import { logAuditEventAction } from './audit-actions';
import { computeEffectiveAccessForServiceAccount } from '@/lib/effective-access';

function computeNextRotationDate(account: ServiceAccount): Date | null {
  if (!account.lastRotatedAt || !account.rotationIntervalDays || account.rotationIntervalDays <= 0) {
    return null;
  }

  const base = new Date(account.lastRotatedAt);
  if (Number.isNaN(base.getTime())) return null;
  base.setDate(base.getDate() + account.rotationIntervalDays);
  return base;
}

export async function saveServiceAccountAction(
  serviceAccount: Partial<ServiceAccount> & Pick<ServiceAccount, 'tenantId' | 'resourceId' | 'name'>,
  dataSource: DataSource = 'mysql',
  actorEmail: string = 'system'
) {
  const isNew = !serviceAccount.id || serviceAccount.id === '';
  const id = isNew ? `sa-${Math.random().toString(36).substring(2, 10)}` : serviceAccount.id;
  const now = new Date().toISOString();

  const payload: ServiceAccount = {
    id,
    tenantId: serviceAccount.tenantId,
    resourceId: serviceAccount.resourceId,
    name: serviceAccount.name,
    username: serviceAccount.username,
    system: serviceAccount.system,
    owner: serviceAccount.owner,
    purpose: serviceAccount.purpose,
    credentialType: serviceAccount.credentialType,
    entitlementIds: serviceAccount.entitlementIds || [],
    rotationIntervalDays: serviceAccount.rotationIntervalDays,
    lastRotatedAt: serviceAccount.lastRotatedAt,
    validUntil: serviceAccount.validUntil,
    status: serviceAccount.status || 'active',
    notes: serviceAccount.notes,
    createdAt: serviceAccount.createdAt || now,
    updatedAt: now,
  };

  try {
    const result = await saveCollectionRecord('serviceAccounts', id, payload, dataSource);
    if (!result.success) return result;

    await logAuditEventAction(dataSource as any, {
      tenantId: payload.tenantId,
      actorUid: actorEmail,
      action: isNew ? `Servicekonto angelegt: ${payload.name}` : `Servicekonto aktualisiert: ${payload.name}`,
      entityType: 'serviceAccount',
      entityId: id,
      after: payload,
    });

    return { success: true, id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteServiceAccountAction(
  id: string,
  dataSource: DataSource = 'mysql',
  actorEmail: string = 'system'
) {
  try {
    const beforeResult = await getSingleRecord('serviceAccounts', id, dataSource);
    const before = beforeResult.data as ServiceAccount | null;

    const result = await deleteCollectionRecord('serviceAccounts', id, dataSource);
    if (!result.success) return result;

    await logAuditEventAction(dataSource as any, {
      tenantId: before?.tenantId || 'global',
      actorUid: actorEmail,
      action: `Servicekonto gelöscht: ${before?.name || id}`,
      entityType: 'serviceAccount',
      entityId: id,
      before,
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function listDueServiceAccountsAction(
  tenantId?: string,
  dataSource: DataSource = 'mysql'
): Promise<{ data: ServiceAccount[]; error: string | null }> {
  try {
    const rows = await getCollectionData('serviceAccounts', dataSource);
    if (rows.error) return { data: [], error: rows.error };

    const now = new Date();
    const data = ((rows.data || []) as ServiceAccount[])
      .filter((item) => (tenantId ? item.tenantId === tenantId : true))
      .filter((item) => item.status !== 'archived')
      .filter((item) => {
        const nextRotation = computeNextRotationDate(item);
        if (!nextRotation) return false;
        return nextRotation.getTime() <= now.getTime();
      })
      .sort((a, b) => {
        const aDate = computeNextRotationDate(a)?.getTime() || Number.MAX_SAFE_INTEGER;
        const bDate = computeNextRotationDate(b)?.getTime() || Number.MAX_SAFE_INTEGER;
        return aDate - bDate;
      });

    return { data, error: null };
  } catch (error: any) {
    return { data: [], error: error.message };
  }
}

export async function getEffectiveAccessForServiceAccountAction(
  serviceAccountId: string,
  dataSource: DataSource = 'mysql'
) {
  try {
    const [serviceAccountRow, entitlementRows] = await Promise.all([
      getSingleRecord('serviceAccounts', serviceAccountId, dataSource),
      getCollectionData('entitlements', dataSource),
    ]);

    if (!serviceAccountRow.data) return { data: [], error: 'Servicekonto nicht gefunden.' };
    if (entitlementRows.error) return { data: [], error: entitlementRows.error };

    const serviceAccount = serviceAccountRow.data as ServiceAccount;
    const data = computeEffectiveAccessForServiceAccount(
      serviceAccount.id,
      serviceAccount.entitlementIds || [],
      (entitlementRows.data || []) as Entitlement[]
    );

    return { data, error: null };
  } catch (error: any) {
    return { data: [], error: error.message };
  }
}
