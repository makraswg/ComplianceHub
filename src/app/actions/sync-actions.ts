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
 * Testet die LDAP-Verbindung (Simulation).
 */
export async function testLdapConnectionAction(config: Partial<Tenant>): Promise<{ success: boolean; message: string }> {
  if (!config.ldapUrl || !config.ldapPort) {
    return { success: false, message: 'URL und Port erforderlich.' };
  }

  try {
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    if (config.ldapUrl.includes('localhost') || config.ldapUrl.includes('127.0.0.1')) {
      return { success: false, message: 'Lokale LDAP-Hosts werden in der Cloud-Sandbox nicht unterstützt.' };
    }

    if (config.ldapBindPassword === 'wrong') {
      return { success: false, message: 'LDAP-FEHLER: Authentifizierungsfehler. Der Bind-DN oder das Passwort ist ungültig.' };
    }

    return { 
      success: true, 
      message: `Verbindung zu ${config.ldapUrl}:${config.ldapPort} erfolgreich etabliert. Domäne ${config.ldapDomain || 'unbekannt'} erreicht.` 
    };
  } catch (e: any) {
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

    return adUsers.map(adUser => {
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
  } catch (e: any) {
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

    return { success: true, count };
  } catch (e: any) {
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
    }

    await updateJobStatusAction(jobId, 'success', 'Automatischer Lauf erfolgreich beendet.', dataSource);
    return { success: true };
  } catch (e: any) {
    await updateJobStatusAction(jobId, 'error', e.message, dataSource);
    return { success: false, error: e.message };
  }
}

async function updateJobStatusAction(jobId: string, status: string, message: string, dataSource: DataSource) {
  const data = { id: jobId, lastRun: new Date().toISOString(), lastStatus: status, lastMessage: message };
  await saveCollectionRecord('syncJobs', jobId, data, dataSource);
}
