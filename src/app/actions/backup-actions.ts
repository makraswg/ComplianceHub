'use server';

import { saveCollectionRecord, getCollectionData, deleteCollectionRecord } from './mysql-actions';
import { DataSource, PlatformBackup } from '@/lib/types';
import { logAuditEventAction } from './audit-actions';

/**
 * Löst ein manuelles Backup der Plattform-Datenbank aus.
 * Simuliert den Export und speichert einen Log-Eintrag.
 */
export async function triggerSystemBackupAction(dataSource: DataSource = 'mysql', actorEmail: string = 'system') {
  const backupId = `bkp-${Math.random().toString(36).substring(2, 9)}`;
  const now = new Date().toISOString();
  
  const backupData: PlatformBackup = {
    id: backupId,
    timestamp: now,
    status: 'in_progress',
    fileName: `compliance_hub_export_${now.split('T')[0]}.sql`,
    fileSize: 0,
    type: 'manual',
    createdBy: actorEmail
  };

  try {
    // Phase 1: Start
    await saveCollectionRecord('platform_backups', backupId, backupData, dataSource);

    // Phase 2: Simulation (SQL Export)
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const finalData: PlatformBackup = {
      ...backupData,
      status: 'success',
      fileSize: 1024 * 1024 * 12.5 // ~12MB simuliert
    };

    await saveCollectionRecord('platform_backups', backupId, finalData, dataSource);

    await logAuditEventAction(dataSource as any, {
      tenantId: 'global',
      actorUid: actorEmail,
      action: `Plattform-Backup erstellt: ${finalData.fileName}`,
      entityType: 'backup',
      entityId: backupId,
      after: { fileName: finalData.fileName, size: finalData.fileSize }
    });

    return { success: true, backupId };
  } catch (e: any) {
    await saveCollectionRecord('platform_backups', backupId, { ...backupData, status: 'failed' }, dataSource);
    return { success: false, error: e.message };
  }
}

/**
 * Simuliert das Restore eines Backups.
 */
export async function restoreSystemBackupAction(backupId: string, dataSource: DataSource = 'mysql', actorEmail: string = 'system') {
  try {
    // 1. Suche Backup
    const res = await getCollectionData('platform_backups', dataSource);
    const backup = res.data?.find(b => b.id === backupId);
    if (!backup) throw new Error("Backup-Datei nicht gefunden.");

    // 2. Simulation (Integritätsprüfung & Restore)
    await new Promise(resolve => setTimeout(resolve, 2000));

    await logAuditEventAction(dataSource as any, {
      tenantId: 'global',
      actorUid: actorEmail,
      action: `Plattform-Restore durchgeführt von Backup: ${backup.fileName}`,
      entityType: 'backup',
      entityId: backupId
    });

    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

/**
 * Entfernt einen Backup-Eintrag.
 */
export async function deleteBackupEntryAction(id: string, dataSource: DataSource = 'mysql') {
  return await deleteCollectionRecord('platform_backups', id, dataSource);
}
