
'use server';

import { saveCollectionRecord, getCollectionData } from './mysql-actions';
import { DataSource, SyncJob } from '@/lib/types';
import { logAuditEventAction } from './audit-actions';

/**
 * Aktualisiert den Status eines Synchronisations-Jobs.
 */
export async function updateJobStatusAction(
  jobId: string, 
  status: 'running' | 'success' | 'error', 
  message: string,
  dataSource: DataSource = 'mysql'
) {
  try {
    const jobsResult = await getCollectionData('syncJobs', dataSource);
    const existingJob = jobsResult.data?.find(j => j.id === jobId);
    
    if (!existingJob) return { success: false, error: 'Job nicht gefunden.' };

    const updateData = {
      ...existingJob,
      lastRun: new Date().toISOString(),
      lastStatus: status,
      lastMessage: message.substring(0, 1000)
    };

    await saveCollectionRecord('syncJobs', jobId, updateData, dataSource);
    
    return { success: true };
  } catch (e: any) {
    console.error(`Failed to update job status for ${jobId}:`, e);
    return { success: false, error: e.message };
  }
}

/**
 * Triggert eine Synchronisation (Platzhalter für echte Implementierung).
 */
export async function triggerSyncJobAction(jobId: string, dataSource: DataSource = 'mysql', actorUid: string = 'system') {
  // 1. Markiere als laufend
  await updateJobStatusAction(jobId, 'running', 'Synchronisation wurde manuell gestartet...', dataSource);

  try {
    // Hier würde die Logik je nach Job-ID verzweigen
    if (jobId === 'job-ldap-sync') {
      // Simulation einer LDAP Synchronisation
      await new Promise(resolve => setTimeout(resolve, 2000));
      await updateJobStatusAction(jobId, 'success', 'LDAP Sync erfolgreich abgeschlossen. 0 Nutzer geändert.', dataSource);
    } 
    else if (jobId === 'job-jira-sync') {
      // Jira Sync Simulation
      await new Promise(resolve => setTimeout(resolve, 1500));
      await updateJobStatusAction(jobId, 'success', 'Jira API erfolgreich abgefragt. Keine neuen Tickets zur Finalisierung.', dataSource);
    }
    else {
      await updateJobStatusAction(jobId, 'error', `Job-Logik für '${jobId}' noch nicht implementiert.`, dataSource);
    }

    await logAuditEventAction(dataSource as any, {
      tenantId: 'global',
      actorUid,
      action: `Sync-Job gestartet: ${jobId}`,
      entityType: 'sync-job',
      entityId: jobId
    });

    return { success: true };
  } catch (e: any) {
    await updateJobStatusAction(jobId, 'error', `Fehler bei Ausführung: ${e.message}`, dataSource);
    return { success: false, error: e.message };
  }
}
