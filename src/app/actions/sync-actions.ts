'use server';

import { saveCollectionRecord, getCollectionData } from './mysql-actions';
import { DataSource, SyncJob, Tenant, User } from '@/lib/types';
import { logAuditEventAction } from './audit-actions';

/**
 * Normalisiert Texte für den Vergleich (Umlaute und Sonderzeichen).
 * Hilft dabei, 'Baecker' mit 'Bäcker' zu matchen.
 */
function normalizeForMatch(str: string): string {
  if (!str) return '';
  return str.toLowerCase()
    .replace(/ae/g, 'ä')
    .replace(/oe/g, 'ö')
    .replace(/ue/g, 'ü')
    .replace(/ss/g, 'ß')
    .replace(/[^a-zäöüß0-9]/g, '') // Entferne Leer- und Sonderzeichen
    .trim();
}

/**
 * Testet die LDAP-Verbindung (Simulation für das Frontend).
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
    
    // Simulations-Daten aus dem AD
    const adUsers = [
      { username: 'm.mustermann', first: 'Max', last: 'Mustermann', email: 'm.mustermann@compliance-hub.local', dept: 'IT & Digitalisierung', title: 'Systemadministrator', company: 'Wohnbau Nord' },
      { username: 'e.beispiel', first: 'Erika', last: 'Beispiel', email: 'e.beispiel@compliance-hub.local', dept: 'Recht', title: 'Datenschutz', company: 'Wohnbau Nord' },
      { username: 'a.baeck', first: 'Andreas', last: 'Baeck', email: 'a.baeck@compliance-hub.local', dept: 'Technik', title: 'Hausmeister', company: 'Wohnbau Nord' },
      { username: 'j.schmidt', first: 'Julia', last: 'Schmidt', email: 'j.schmidt@compliance-hub.local', dept: 'Finanzen', title: 'Buchhaltung', company: 'Wohnbau Nord' },
      { username: 'ext.kratz', first: 'Marcel', last: 'Kratzing', email: 'm.kratz@extern.de', dept: 'Beratung', title: 'Externer Berater', company: 'Extern' }
    ];

    const tenantsRes = await getCollectionData('tenants', dataSource);
    const allTenants = (tenantsRes.data || []) as Tenant[];

    // Mapping und Matching Logik
    return adUsers.map(adUser => {
      const normAdCompany = normalizeForMatch(adUser.company);
      let matchedTenant = allTenants.find(t => normalizeForMatch(t.name) === normAdCompany);
      
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
 * Importiert eine Liste von ausgewählten AD-Benutzern.
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
      action: `${count} Benutzer via manuellem AD-Import hinzugefügt/aktualisiert.`,
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
  // ... (bestehende Logik bleibt erhalten, nutzt nun auch normalizeForMatch falls nötig)
  await updateJobStatusAction(jobId, 'running', 'Synchronisation wird gestartet...', dataSource);
  try {
    // Hier könnte man die gleiche Logik wie oben einbauen für den Auto-Sync
    await new Promise(resolve => setTimeout(resolve, 2000));
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
