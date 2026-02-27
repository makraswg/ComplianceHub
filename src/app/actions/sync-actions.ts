'use server';

import { saveCollectionRecord, getCollectionData } from './mysql-actions';
import { DataSource, SyncJob, Tenant, User } from '@/lib/types';
import { logAuditEventAction } from './audit-actions';
import { Client } from 'ldapts';

/**
 * Normalisiert Texte für den Vergleich (Umlaute und Sonderzeichen).
 */
function normalizeForMatch(str: string): string {
  if (!str) return '';
  return str.toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ä/g, 'a').replace(/ae/g, 'a')
    .replace(/ö/g, 'o').replace(/oe/g, 'o')
    .replace(/ü/g, 'u').replace(/ue/g, 'u')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]/g, '') 
    .trim();
}

function findTenantByCompany(company: string, tenants: Tenant[]): Tenant | undefined {
  const normalizedCompany = normalizeForMatch(company);
  if (!normalizedCompany) return undefined;

  return tenants.find((tenant) => {
    const normalizedName = normalizeForMatch(tenant.name || '');
    const normalizedSlug = normalizeForMatch(tenant.slug || '');
    return normalizedName === normalizedCompany || normalizedSlug === normalizedCompany;
  });
}

/**
 * Holt einen Attributwert sicher, auch wenn er ein Array ist.
 */
const safeGetAttribute = (entry: any, attributeName: string, defaultValue: string = ''): string => {
  if (!attributeName || !entry[attributeName]) return defaultValue;
  const value = entry[attributeName];
  if (Array.isArray(value)) {
    return String(value[0] || defaultValue);
  }
  return String(value || defaultValue);
};

/**
 * Holt ein Attribut als Array (z.B. für memberOf).
 */
const getAttributeArray = (entry: any, attributeName: string | undefined): string[] => {
  if (!attributeName || !entry[attributeName]) return [];
  const value = entry[attributeName];
  if (Array.isArray(value)) return value.map(String);
  return [String(value)];
};

/**
 * Prüft anhand des userAccountControl Bitmask-Wertes, ob ein AD-Konto deaktiviert ist.
 */
function isUserAccountDisabled(uac: any): boolean {
  const val = parseInt(String(uac || '0'), 10);
  if (isNaN(val)) return false;
  return (val & 2) === 2;
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
 * Erzeugt die TLS-Konfiguration basierend auf den Mandanteneinstellungen.
 */
function getTlsOptions(config: Partial<Tenant>) {
  const options: any = {
    rejectUnauthorized: !config.ldapAllowInvalidSsl,
  };

  if (config.ldapClientCert) {
    options.ca = [config.ldapClientCert];
  }

  return options;
}

/**
 * Testet die LDAP-Verbindung.
 */
export async function testLdapConnectionAction(config: Partial<Tenant>): Promise<{ success: boolean; message: string }> {
  if (!config.ldapUrl || !config.ldapPort || !config.ldapBindDn || !config.ldapBindPassword) {
    return { success: false, message: 'Server-URL, Port und Bind-Daten sind erforderlich.' };
  }

  const tenantId = config.id || 'unknown';
  const url = `${config.ldapUrl.startsWith('ldap') ? config.ldapUrl : 'ldap://' + config.ldapUrl}:${config.ldapPort}`;
  const tlsOptions = getTlsOptions(config);
  
  const client = new Client({ 
    url, 
    timeout: 5000, 
    connectTimeout: 5000,
    tlsOptions: url.startsWith('ldaps') ? tlsOptions : undefined
  });

  try {
    if (!url.startsWith('ldaps') && config.ldapUseTls) {
      await client.startTLS(tlsOptions);
    }

    await client.bind(config.ldapBindDn, config.ldapBindPassword);
    
    await logLdapInteraction('mysql', tenantId, 'Connection Test', 'success', 
      'LDAP Bind erfolgreich. Prüfe Lesezugriff auf Base DN...', 
      { url, bindDn: config.ldapBindDn, tls: !!config.ldapUseTls, ignoreCertErrors: !!config.ldapAllowInvalidSsl }
    );

    const { searchEntries } = await client.search(config.ldapBaseDn || '', {
      scope: 'sub',
      filter: config.ldapUserFilter || '(objectClass=user)',
      sizeLimit: 1
    });

    await logLdapInteraction('mysql', tenantId, 'Read Probe', 'success', 
      `Integrität bestätigt. ${searchEntries.length} Test-Eintrag gelesen.`, 
      { filter: config.ldapUserFilter, entriesFound: searchEntries.length }
    );

    return { 
      success: true, 
      message: `Verbindung erfolgreich. Authentifizierung ok und Lesezugriff auf Base DN bestätigt.` 
    };
  } catch (e: any) {
    let errorMsg = e.message;
    await logLdapInteraction('mysql', tenantId, 'Connection Test', 'error', errorMsg, { 
      url, 
      bindDn: config.ldapBindDn, 
      error: e.stack
    });
    return { success: false, message: `LDAP-FEHLER: ${errorMsg}` };
  } finally {
    try { await client.unbind(); } catch (e) {}
  }
}

/**
 * Ruft verfügbare Benutzer aus dem AD ab.
 */
export async function getAdUsersAction(config: Partial<Tenant>, dataSource: DataSource = 'mysql', searchQuery: string = '') {
  if (!config.ldapUrl || !config.ldapBindDn || !config.ldapBindPassword) {
    throw new Error("LDAP-Konfiguration unvollständig.");
  }

  const tenantId = config.id || 'global';
  const url = `${config.ldapUrl.startsWith('ldap') ? config.ldapUrl : 'ldap://' + config.ldapUrl}:${config.ldapPort}`;
  const tlsOptions = getTlsOptions(config);

  const client = new Client({ 
    url, 
    timeout: 10000,
    tlsOptions: url.startsWith('ldaps') ? tlsOptions : undefined
  });

  try {
    if (!url.startsWith('ldaps') && config.ldapUseTls) {
      await client.startTLS(tlsOptions);
    }

    await client.bind(config.ldapBindDn, config.ldapBindPassword);
    
    let filter = config.ldapUserFilter || '(objectClass=user)';
    if (searchQuery) {
      const escapedQuery = searchQuery.replace(/[()]/g, '');
      filter = `(&${filter}(|(sAMAccountName=*${escapedQuery}*)(displayName=*${escapedQuery}*)(mail=*${escapedQuery}*)(sn=*${escapedQuery}*)))`;
    }

    const { searchEntries } = await client.search(config.ldapBaseDn || '', {
      scope: 'sub',
      filter: filter,
      sizeLimit: 250,
      attributes: [
        config.ldapAttrUsername || 'sAMAccountName',
        config.ldapAttrFirstname || 'givenName',
        config.ldapAttrLastname || 'sn',
        config.ldapAttrEmail || 'mail',
        config.ldapAttrDepartment || 'department',
        config.ldapAttrCompany || 'company',
        config.ldapAttrGroups || 'memberOf',
        'displayName',
        'title',
        'userAccountControl'
      ]
    });

    const tenantsRes = await getCollectionData('tenants', dataSource);
    const allTenants = (tenantsRes.data || []) as Tenant[];

    return searchEntries.map((entry: any) => {
      const company = safeGetAttribute(entry, config.ldapAttrCompany || 'company', '');
      const matchedTenant = findTenantByCompany(company, allTenants);

      const username = safeGetAttribute(entry, config.ldapAttrUsername || 'sAMAccountName', '');
      const isDisabled = isUserAccountDisabled(entry.userAccountControl);
      const groups = getAttributeArray(entry, config.ldapAttrGroups || 'memberOf');

      return {
        username: username || entry.dn || Math.random().toString(36).substring(7),
        first: safeGetAttribute(entry, config.ldapAttrFirstname || 'givenName', ''),
        last: safeGetAttribute(entry, config.ldapAttrLastname || 'sn', ''),
        displayName: safeGetAttribute(entry, 'displayName', ''),
        email: safeGetAttribute(entry, config.ldapAttrEmail || 'mail', ''),
        dept: safeGetAttribute(entry, config.ldapAttrDepartment || 'department', ''),
        title: safeGetAttribute(entry, 'title', 'AD User'),
        company,
        isDisabled,
        adGroups: groups,
        matchedTenantId: matchedTenant?.id || null,
        matchedTenantName: matchedTenant?.name || 'Kein exakter Treffer'
      };
    });
  } catch (e: any) {
    await logLdapInteraction(dataSource, tenantId, 'AD Search Error', 'error', e.message, { stack: e.stack });
    throw new Error("LDAP Abfrage fehlgeschlagen: " + e.message);
  } finally {
    try { await client.unbind(); } catch (e) {}
  }
}

/**
 * Repariert fehlerhafte Mandantenzuordnung bereits importierter LDAP-Benutzer.
 * Nützlich, wenn Mandanten erst nach einem Erstimport angelegt wurden.
 */
export async function repairLdapTenantAssignmentsAction(
  dataSource: DataSource = 'mysql',
  actorUid: string = 'system'
): Promise<{ success: boolean; moved: number; updatedProfiles: number; checked: number; message: string }> {
  try {
    const tenantsRes = await getCollectionData('tenants', dataSource);
    const usersRes = await getCollectionData('users', dataSource);

    const allTenants = (tenantsRes.data || []) as Tenant[];
    const hubUsers = (usersRes.data || []) as User[];
    const ldapTenants = allTenants.filter(
      (tenant) => !!tenant.ldapUrl && !!tenant.ldapPort && !!tenant.ldapBindDn && !!tenant.ldapBindPassword
    );

    if (ldapTenants.length === 0) {
      return {
        success: true,
        moved: 0,
        updatedProfiles: 0,
        checked: 0,
        message: 'Keine LDAP-fähigen Mandanten gefunden.'
      };
    }

    const adUsersByExternalId = new Map<string, any>();
    const adUsersByEmail = new Map<string, any>();

    for (const tenant of ldapTenants) {
      try {
        const adUsers = await getAdUsersAction(tenant, dataSource);
        for (const adUser of adUsers) {
          const externalKey = String(adUser.username || '').toLowerCase();
          const emailKey = String(adUser.email || '').toLowerCase();
          if (externalKey) adUsersByExternalId.set(externalKey, adUser);
          if (emailKey) adUsersByEmail.set(emailKey, adUser);
        }
      } catch (error: any) {
        await logLdapInteraction(
          dataSource,
          tenant.id,
          'Repair Tenant Assignment',
          'error',
          error?.message || 'Unbekannter Fehler beim AD-Lesen',
          { tenantId: tenant.id, tenantName: tenant.name }
        );
      }
    }

    let moved = 0;
    let updatedProfiles = 0;
    let checked = 0;

    for (const hubUser of hubUsers) {
      if (hubUser.authSource !== 'ldap') continue;
      checked++;

      const externalKey = String(hubUser.externalId || '').toLowerCase();
      const emailKey = String(hubUser.email || '').toLowerCase();
      const adMatch = (externalKey && adUsersByExternalId.get(externalKey)) || (emailKey && adUsersByEmail.get(emailKey));

      if (!adMatch?.matchedTenantId) continue;

      const shouldMoveTenant = hubUser.tenantId !== adMatch.matchedTenantId;
      const titleFromAd = String(adMatch.title || '').trim();
      const shouldUpdateTitle = !!titleFromAd && titleFromAd !== hubUser.title;

      if (!shouldMoveTenant && !shouldUpdateTitle) continue;

      const updatedUser: User = {
        ...hubUser,
        tenantId: shouldMoveTenant ? adMatch.matchedTenantId : hubUser.tenantId,
        title: shouldUpdateTitle ? titleFromAd : hubUser.title,
        lastSyncedAt: new Date().toISOString()
      };

      const saveRes = await saveCollectionRecord('users', hubUser.id, updatedUser, dataSource);
      if (!saveRes.success) continue;

      if (shouldMoveTenant) moved++;
      if (shouldUpdateTitle) updatedProfiles++;

      await logAuditEventAction(dataSource, {
        tenantId: updatedUser.tenantId,
        actorUid,
        action: `Debug-Korrektur LDAP-Zuordnung: ${hubUser.displayName}`,
        entityType: 'user',
        entityId: hubUser.id,
        before: hubUser,
        after: updatedUser
      });
    }

    const message = `Korrektur abgeschlossen: ${moved} Benutzer verschoben, ${updatedProfiles} Stellenprofile aktualisiert, ${checked} LDAP-Benutzer geprüft.`;
    try {
      await logLdapInteraction(dataSource, 'global', 'Repair Tenant Assignment', 'success', message, {
        moved,
        updatedProfiles,
        checked
      }, actorUid);
    } catch (logError) {
      console.error('Repair log write failed:', logError);
    }

    return { success: true, moved, updatedProfiles, checked, message };
  } catch (error: any) {
    return {
      success: false,
      moved: 0,
      updatedProfiles: 0,
      checked: 0,
      message: error?.message || 'Unbekannter Fehler bei der Debug-Korrektur.'
    };
  }
}

/**
 * Importiert eine Liste von AD-Benutzern in den Hub.
 */
export async function importUsersAction(usersToImport: any[], dataSource: DataSource = 'mysql', actorEmail: string = 'system') {
  let count = 0;
  try {
    for (const adUser of usersToImport) {
      const userId = `u-ad-${adUser.username}`.replace(/[^a-z0-9]/gi, '_');
      const userData = {
        id: userId,
        tenantId: adUser.matchedTenantId || 't1',
        externalId: adUser.username,
        displayName: adUser.displayName || `${adUser.first || ''} ${adUser.last || ''}`.trim() || adUser.username,
        email: adUser.email,
        department: adUser.dept || '',
        title: adUser.title || '',
        enabled: !adUser.isDisabled,
        status: adUser.isDisabled ? 'archived' : 'active',
        adGroups: adUser.adGroups || [],
        lastSyncedAt: new Date().toISOString(),
        authSource: 'ldap'
      };

      const res = await saveCollectionRecord('users', userId, userData, dataSource);
      if (res.success) {
        await logAuditEventAction(dataSource, {
          tenantId: userData.tenantId,
          actorUid: actorEmail,
          action: `Benutzer importiert (AD-Quelle): ${userData.displayName}`,
          entityType: 'user',
          entityId: userId,
          after: userData
        });
        count++;
      }
    }

    return { success: true, count };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

/**
 * Triggert einen automatischen Sync-Lauf.
 */
export async function triggerSyncJobAction(jobId: string, dataSource: DataSource = 'mysql', actorUid: string = 'system') {
  if (jobId !== 'job-ldap-sync') return { success: false, error: 'Job nicht unterstützt' };

  await updateJobStatusAction(jobId, 'running', 'Voll-Synchronisation gestartet...', dataSource);
  
  try {
    const tenantsRes = await getCollectionData('tenants', dataSource);
    const usersRes = await getCollectionData('users', dataSource);
    
    const activeTenants = (tenantsRes.data || []).filter((t: Tenant) => t.ldapEnabled);
    const hubUsers = (usersRes.data || []) as User[];
    
    let totalUpdated = 0;
    let totalDisabled = 0;

    for (const tenant of activeTenants) {
      try {
        const adUsers = await getAdUsersAction(tenant, dataSource);
        const tenantUsers = hubUsers.filter(hu => hu.tenantId === tenant.id && !!hu.externalId);

        for (const hubUser of tenantUsers) {
          const adMatch = adUsers.find(au => au.username.toLowerCase() === hubUser.externalId.toLowerCase());
          
          if (adMatch) {
            const shouldBeEnabled = !adMatch.isDisabled;
            const currentEnabled = hubUser.enabled === true || hubUser.enabled === 1;
            
            const adGroupsJson = JSON.stringify((adMatch.adGroups || []).sort());
            const hubGroupsJson = JSON.stringify((hubUser.adGroups || []).sort());

            const needsUpdate = currentEnabled !== shouldBeEnabled || 
                                hubUser.displayName !== adMatch.displayName ||
                                hubUser.email !== adMatch.email ||
                                hubUser.department !== adMatch.dept ||
                                adGroupsJson !== hubGroupsJson;

            if (needsUpdate) {
              const updatedUser = {
                ...hubUser,
                displayName: adMatch.displayName || hubUser.displayName,
                email: adMatch.email || hubUser.email,
                department: adMatch.dept || hubUser.department,
                enabled: shouldBeEnabled,
                status: shouldBeEnabled ? 'active' : 'archived',
                adGroups: adMatch.adGroups || [],
                lastSyncedAt: new Date().toISOString()
              };
              
              await saveCollectionRecord('users', hubUser.id, updatedUser, dataSource);
              
              await logAuditEventAction(dataSource, {
                tenantId: tenant.id,
                actorUid: 'system-sync',
                action: `AD-Sync: Profil aktualisiert (${hubUser.displayName}). Status: ${shouldBeEnabled ? 'Aktiv' : 'Deaktiviert'}`,
                entityType: 'user',
                entityId: hubUser.id,
                before: hubUser,
                after: updatedUser
              });

              totalUpdated++;
              if (!shouldBeEnabled && currentEnabled) totalDisabled++;
            }
          }
        }
        
        await logLdapInteraction(dataSource, tenant.id, 'Full Sync', 'success', 
          `Synchronisation abgeschlossen. ${totalUpdated} Profile aktualisiert.`, 
          { updated: totalUpdated, deactivated: totalDisabled }
        );
      } catch (tenantErr: any) {
        console.error(`Sync error for tenant ${tenant.name}:`, tenantErr);
        await logLdapInteraction(dataSource, tenant.id, 'Tenant Sync Error', 'error', tenantErr.message, { tenant: tenant.name });
      }
    }

    const msg = `Lauf beendet. ${totalUpdated} Updates durchgeführt (${totalDisabled} Deaktivierungen).`;
    await updateJobStatusAction(jobId, 'success', msg, dataSource);
    
    await logAuditEventAction(dataSource, {
      tenantId: 'global',
      actorUid,
      action: `LDAP Voll-Sync abgeschlossen: ${msg}`,
      entityType: 'sync',
      entityId: jobId
    });

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
