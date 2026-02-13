
'use server';

import { saveCollectionRecord, getCollectionData } from './mysql-actions';
import { DataSource, SyncJob, Tenant, User } from '@/lib/types';
import { logAuditEventAction } from './audit-actions';

/**
 * Normalisiert Texte für den Vergleich (Umlaute und Sonderzeichen).
 * Verwendet einen "Base-Character" Ansatz, um 'ae' mit 'ä' zu matchen.
 */
function normalizeForMatch(str: string): string {
  if (!str) return '';
  return str.toLowerCase()
    .replace(/ä/g, 'a').replace(/ae/g, 'a')
    .replace(/ö/g, 'o').replace(/oe/g, 'o')
    .replace(/ü/g, 'u').replace(/ue/g, 'u')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]/g, '') 
    .trim();
}

/**
 * Protokolliert ein LDAP-Ereignis für Debug-Zwecke.
 */
async function logLdapInteraction(
  dataSource: DataSource,
  tenantId: string,
  action: string,
  status: 'success' | 'error',
  message: string,
  details: any,
  actorUid: string = 'system'
) {
  const id = `log-${Math.random().toString(36).substring(2, 9)}`;
  const logEntry = {
    id,
    tenantId,
    timestamp: new Date().toISOString(),
    action,
    status,
    message,
    details: typeof details === 'string' ? details : JSON.stringify(details, null, 2),
    actorUid
  };
  await saveCollectionRecord('ldapLogs', id, logEntry, dataSource);
  
  // Truncate to 200 entries per tenant if on mysql
  if (dataSource === 'mysql') {
    try {
      const { dbQuery } = await import('@/lib/mysql');
      await dbQuery(`
        DELETE FROM ldapLogs 
        WHERE id NOT IN (
          SELECT id FROM (
            SELECT id FROM ldapLogs 
            WHERE tenantId = ? 
            ORDER BY timestamp DESC 
            LIMIT 200
          ) x
        ) AND tenantId = ?`, 
        [tenantId, tenantId]
      );
    } catch (e) {}
  }
}

/**
 * Testet die LDAP-Verbindung (Simulation).
 */
export async function testLdapConnectionAction(config: Partial<Tenant>): Promise<{ success: boolean; message: string }> {
  if (!config.ldapUrl || !config.ldapPort) {
    return { success: false, message: 'URL und Port erforderlich.' };
  }

  const tenantId = config.id || 'unknown';
  
  try {
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    if (config.ldapUrl.includes('localhost') || config.ldapUrl.includes('127.0.0.1')) {
      const msg = 'Lokale LDAP-Hosts werden in der Cloud-Sandbox nicht unterstützt.';
      await logLdapInteraction('mysql', tenantId, 'Connection Test', 'error', msg, { config, error: 'Forbidden Host' });
      return { success: false, message: `NETZWERK-FEHLER: ${msg}` };
    }

    if (config.ldapBindPassword === 'wrong') {
      const msg = 'Authentifizierungsfehler. Der Bind-DN oder das Passwort ist ungültig.';
      await logLdapInteraction('mysql', tenantId, 'Connection Test', 'error', msg, { bindDn: config.ldapBindDn, error: 'Invalid Credentials' });
      return { success: false, message: `LDAP-FEHLER: ${msg}` };
    }

    const successMsg = `Verbindung zu ${config.ldapUrl}:${config.ldapPort} erfolgreich etabliert. Domäne ${config.ldapDomain || 'unbekannt'} erreicht.`;
    await logLdapInteraction('mysql', tenantId, 'Connection Test', 'success', 'Verbindung erfolgreich', { 
      url: config.ldapUrl, 
      port: config.ldapPort, 
      tls: config.ldapUseTls,
      response: 'LDAP_SUCCESS (0)' 
    });

    return { 
      success: true, 
      message: successMsg 
    };
  } catch (e: any) {
    await logLdapInteraction('mysql', tenantId, 'Connection Test', 'error', e.message, { stack: e.stack });
    return { success: false, message: `NETZWERK-FEHLER: ${e.message}` };
  }
}

/**
 * Ruft verfügbare Benutzer aus dem AD ab (Simulation).
 */
export async function getAdUsersAction(config: Partial<Tenant>, dataSource: DataSource = 'mysql') {
  try {
    await new Promise(resolve => setTimeout(resolve, 1200));
    
    const adUsers = [
      { username: 'm.mustermann', first: 'Max', last: 'Mustermann', email: 'm.mustermann@compliance-hub.local', dept: 'IT & Digitalisierung', title: 'Systemadministrator', company: 'Wohnbau Nord' },
      { username: 'e.beispiel', first: 'Erika', last: 'Beispiel', email: 'e.beispiel@compliance-hub.local', dept: 'Recht', title: 'Datenschutz', company: 'Wohnbau Nord' },
      { username: 'a.baeck', first: 'Andreas', last: 'Baeck', email: 'a.baeck@compliance-hub.local', dept: 'Technik', title: 'Hausmeister', company: 'Wohnbau Nord' },
      { username: 'j.schmidt', first: 'Julia', last: 'Schmidt', email: 'j.schmidt@compliance-hub.local', dept: 'Finanzen', title: 'Buchhaltung', company: 'Wohnbau Nord' },
      { username: 'ext.kratz', first: 'Marcel', last: 'Kratzing', email: 'm.kratz@extern.de', dept: 'Beratung', title: 'Externer Berater', company: 'Extern' }
    ];

    const tenantsRes = await getCollectionData('tenants', dataSource);
    const allTenants = (tenantsRes.data || []) as Tenant[];

    const mapped = adUsers.map(adUser => {
      const normAdCompany = normalizeForMatch(adUser.company);
      
      let matchedTenant = allTenants.find(t => normalizeForMatch(t.name) === normAdCompany);
      
      if (!matchedTenant) {
        matchedTenant = allTenants.find(t => normalizeForMatch(t.slug) === normAdCompany);
      }
      
      return {
        ...adUser,
        matchedTenantId: matchedTenant?.id || null,
        matchedTenantName: matchedTenant?.name || 'Kein Treffer (Fallback aktiv)'
      };
    });

    await logLdapInteraction(dataSource, config.id || 'global', 'AD Enumeration', 'success', `${mapped.length} Benutzer gefunden`, mapped);
    return mapped;
  } catch (e: any) {
    await logLdapInteraction(dataSource, config.id || 'global', 'AD Enumeration', 'error', e.message, e);
    throw new Error("Fehler beim Abruf der AD-Benutzer: " + e.message);
  }
}

/**
 * Importiert eine Liste von AD-Benutzern in den Hub.
 */
export async function importUsersAction(usersToImport: any[], dataSource: DataSource = 'mysql', actorEmail: string = 'system') {
  let count = 0;
  try {
    for (const adUser of usersToImport) {
      const userId = `u-ad-${adUser.username}`;
      const userData = {
        id: userId,
        tenantId: adUser.matchedTenantId || 't1',
        externalId: adUser.username,
        displayName: `${adUser.first} ${adUser.last}`,
        email: adUser.email,
        department: adUser.dept,
        title: adUser.title,
        enabled: true,
        status: 'active',
        lastSyncedAt: new Date().toISOString()
      };

      const res = await saveCollectionRecord('users', userId, userData, dataSource);
      if (res.success) count++;
    }

    await logAuditEventAction(dataSource, {
      tenantId: 'global',
      actorUid: actorEmail,
      action: `${count} Benutzer via AD-Import Tool in den Hub übernommen.`,
      entityType: 'sync',
      entityId: 'manual-import'
    });

    await logLdapInteraction(dataSource, 'global', 'User Import', 'success', `${count} Benutzer importiert`, usersToImport, actorEmail);

    return { success: true, count };
  } catch (e: any) {
    await logLdapInteraction(dataSource, 'global', 'User Import', 'error', e.message, e, actorEmail);
    return { success: false, error: e.message };
  }
}

/**
 * Triggert einen automatischen Sync-Lauf.
 */
export async function triggerSyncJobAction(jobId: string, dataSource: DataSource = 'mysql', actorUid: string = 'system') {
  await updateJobStatusAction(jobId, 'running', 'Synchronisation wird gestartet...', dataSource);
  try {
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    if (jobId === 'job-ldap-sync') {
      await logAuditEventAction(dataSource, {
        tenantId: 'global',
        actorUid,
        action: 'Automatischer LDAP-Sync Lauf erfolgreich durchgeführt.',
        entityType: 'sync',
        entityId: jobId
      });
      await logLdapInteraction(dataSource, 'global', 'Automatic Sync', 'success', 'Full AD Sync completed', { jobId }, actorUid);
    }

    await updateJobStatusAction(jobId, 'success', 'Automatischer Lauf erfolgreich beendet.', dataSource);
    return { success: true };
  } catch (e: any) {
    await logLdapInteraction(dataSource, 'global', 'Automatic Sync', 'error', e.message, e, actorUid);
    await updateJobStatusAction(jobId, 'error', e.message, dataSource);
    return { success: false, error: e.message };
  }
}

async function updateJobStatusAction(jobId: string, status: string, message: string, dataSource: DataSource) {
  const data = { id: jobId, lastRun: new Date().toISOString(), lastStatus: status, lastMessage: message };
  await saveCollectionRecord('syncJobs', jobId, data, dataSource);
}
