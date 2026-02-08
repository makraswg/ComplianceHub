
'use server';

import { saveCollectionRecord, deleteCollectionRecord, getCollectionData } from './mysql-actions';
import { MediaFile, MediaConfig, DataSource } from '@/lib/types';
import { logAuditEventAction } from './audit-actions';

/**
 * Speichert ein Medien-Dokument (Metadaten und Inhalt).
 */
export async function saveMediaAction(media: MediaFile, dataSource: DataSource = 'mysql') {
  const res = await saveCollectionRecord('media', media.id, media, dataSource);
  if (res.success) {
    await logAuditEventAction(dataSource as any, {
      tenantId: media.tenantId,
      actorUid: media.createdBy,
      action: `Medium hochgeladen: ${media.fileName} (${media.module})`,
      entityType: 'media',
      entityId: media.id,
      after: { fileName: media.fileName, type: media.fileType, size: media.fileSize }
    });
  }
  return res;
}

/**
 * Löscht ein Medium permanent.
 */
export async function deleteMediaAction(id: string, tenantId: string, actorEmail: string, dataSource: DataSource = 'mysql') {
  const res = await deleteCollectionRecord('media', id, dataSource);
  if (res.success) {
    await logAuditEventAction(dataSource as any, {
      tenantId,
      actorUid: actorEmail,
      action: `Medium gelöscht: ${id}`,
      entityType: 'media',
      entityId: id
    });
  }
  return res;
}

/**
 * Ruft die globale Medien-Konfiguration ab.
 */
export async function getMediaConfigAction(dataSource: DataSource = 'mysql'): Promise<MediaConfig> {
  const res = await getCollectionData('media_configs', dataSource);
  if (res.data && res.data.length > 0) return res.data[0];
  return { id: 'default', allowedTypes: ['image/jpeg', 'image/png', 'application/pdf'], maxFileSize: 5 * 1024 * 1024 };
}

/**
 * Speichert die Medien-Konfiguration.
 */
export async function saveMediaConfigAction(config: MediaConfig, dataSource: DataSource = 'mysql') {
  return await saveCollectionRecord('media_configs', config.id, config, dataSource);
}
