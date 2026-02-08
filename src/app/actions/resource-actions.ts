
'use server';

import { saveCollectionRecord, deleteCollectionRecord } from './mysql-actions';
import { Resource, DataSource } from '@/lib/types';
import { logAuditEventAction } from './audit-actions';

/**
 * Speichert oder aktualisiert eine IT-Ressource.
 */
export async function saveResourceAction(resource: Resource, dataSource: DataSource = 'mysql', actorEmail: string = 'system') {
  const isNew = !resource.id || resource.id === '';
  const id = isNew ? `res-${Math.random().toString(36).substring(2, 9)}` : resource.id;
  const now = new Date().toISOString();
  
  const data = {
    ...resource,
    id,
    createdAt: resource.createdAt || now,
    status: resource.status || 'active'
  };

  try {
    const res = await saveCollectionRecord('resources', id, data, dataSource);
    if (res.success) {
      await logAuditEventAction(dataSource as any, {
        tenantId: resource.tenantId,
        actorUid: actorEmail,
        action: isNew ? `Ressource registriert: ${resource.name}` : `Ressource aktualisiert: ${resource.name}`,
        entityType: 'resource',
        entityId: id,
        after: data
      });
    }
    return res;
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

/**
 * Archiviert oder löscht eine Ressource.
 */
export async function deleteResourceAction(id: string, dataSource: DataSource = 'mysql') {
  return await deleteCollectionRecord('resources', id, dataSource);
}
