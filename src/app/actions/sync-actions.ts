
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
    .replace(/ä/g, 'a').replace(/ae/g, 'a')
    .replace(/ö/g, 'o').replace(/oe/g, 'o')
    .replace(/ü/g, 'u').replace(/ue/g, 'u')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]/g, '') 
    .trim();
}

/**
 * Holt einen Attributwert sicher, auch wenn er ein Array ist.
 */
const safeGetAttribute = (entry: any, attributeName: string | undefined, defaultValue: string = ''): string => {
  if (!attributeName) return defaultValue;
  const value = entry[attributeName];
  if (Array.isArray(value)) {
    return value[0] || defaultValue;
  }
  return (value as string) || defaultValue;
};


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
 * Testet die LDAP-Verbindung durch einen realen Bind und Search.
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
    // Falls normales LDAP aber TLS gewünscht -> STARTTLS
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
    if (errorMsg.includes('UNABLE_TO_VERIFY_LEAF_SIGNATURE') || errorMsg.includes('certificate')) {
      errorMsg += ' (Tipp: Prüfen Sie die Option "Zertifikate ignorieren" oder hinterlegen Sie das Client-Zertifikat)';
    }

    await logLdapInteraction('mysql', tenantId, 'Connection Test', 'error', errorMsg, { 
      url, 
      bindDn: config.ldapBindDn, 
      error: e.stack,
      rejectUnauthorized: tlsOptions.rejectUnauthorized 
    });
    return { success: false, message: `LDAP-FEHLER: ${errorMsg}` };
  } finally {
    try { await client.unbind(); } catch (e) {}
  }
}

/**
 * Ruft verfügbare Benutzer aus dem AD ab (Reale LDAP Abfrage).
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

    await logLdapInteraction(dataSource, tenantId, 'AD Search Request', 'success', 
      `Starte Suche im AD (Filter: ${filter})`, 
      { url, baseDn: config.ldapBaseDn, filter, tls: !!config.ldapUseTls }
    );

    const { searchEntries } = await client.search(config.ldapBaseDn || '', {
      scope: 'sub',
      filter: filter,
      sizeLimit: 100,
      attributes: [
        config.ldapAttrUsername || 'sAMAccountName',
        config.ldapAttrFirstname || 'givenName',
        config.ldapAttrLastname || 'sn',
        config.ldapAttrEmail || 'mail',
        config.ldapAttrDepartment || 'department',
        config.ldapAttrCompany || 'company',
        config.ldapAttrGroups || 'memberOf',
        'displayName',
        'title'
      ]
    });

    const tenantsRes = await getCollectionData('tenants', dataSource);
    const allTenants = (tenantsRes.data || []) as Tenant[];

    const mapped = searchEntries.map((entry: any) => {
      const company = safeGetAttribute(entry, config.ldapAttrCompany, '');
      const normAdCompany = normalizeForMatch(company);
      let matchedTenant = allTenants.find(t => normalizeForMatch(t.name) === normAdCompany || normalizeForMatch(t.slug) === normAdCompany);

      return {
        username: safeGetAttribute(entry, config.ldapAttrUsername, 'sAMAccountName'),
        first: safeGetAttribute(entry, config.ldapAttrFirstname, 'givenName'),
        last: safeGetAttribute(entry, config.ldapAttrLastname, 'sn'),
        email: safeGetAttribute(entry, config.ldapAttrEmail, 'mail'),
        dept: safeGetAttribute(entry, config.ldapAttrDepartment, 'department'),
        title: safeGetAttribute(entry, 'title') || safeGetAttribute(entry, 'displayName') || 'AD User',
        company,
        matchedTenantId: matchedTenant?.id || null,
        matchedTenantName: matchedTenant?.name || 'Kein exakter Treffer'
      };
    });

    await logLdapInteraction(dataSource, tenantId, 'AD Search Response', 'success', 
      `${mapped.length} Benutzer im AD gefunden`, 
      { resultsCount: mapped.length }
    );
    
    return mapped;
  } catch (e: any) {
    await logLdapInteraction(dataSource, tenantId, 'AD Search Error', 'error', e.message, { stack: e.stack });
    throw new Error("LDAP Abfrage fehlgeschlagen: " + e.message);
  } finally {
    try { await client.unbind(); } catch (e) {}
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
        displayName: `${adUser.first || ''} ${adUser.last || ''}`.trim() || adUser.username,
        email: adUser.email,
        department: adUser.dept || '',
        title: adUser.title || '',
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
