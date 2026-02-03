'use server';

import { getCollectionData } from './mysql-actions';
import { JiraConfig, JiraSyncItem, Resource, Entitlement } from '@/lib/types';

/**
 * Hilfsfunktion zum Bereinigen der Jira-URL.
 * Extrahiert die Basis-Domain, auch wenn der User eine tiefe URL aus dem Browser kopiert hat.
 */
function cleanJiraUrl(url: string): string {
  if (!url) return '';
  let cleaned = url.trim();
  
  try {
    // Versuch, die URL zu parsen und nur Protokoll + Host zu behalten
    const parsed = new URL(cleaned);
    return `${parsed.protocol}//${parsed.host}`;
  } catch (e) {
    // Fallback: Manuelle Bereinigung bekannter Pfade
    cleaned = cleaned.replace(/\/$/, '');
    const segments = ['/rest/', '/jira/', '/assets/', '/browse/', '/projects/'];
    for (const segment of segments) {
      if (cleaned.includes(segment)) {
        cleaned = cleaned.split(segment)[0];
      }
    }
    return cleaned;
  }
}

/**
 * Ruft die Jira-Konfiguration ab.
 */
export async function getJiraConfigs(): Promise<JiraConfig[]> {
  const result = await getCollectionData('jiraConfigs');
  return (result.data as JiraConfig[]) || [];
}

/**
 * Ruft verfügbare Jira Assets Workspaces ab.
 */
export async function getJiraWorkspacesAction(configData: { email: string; apiToken: string }): Promise<{ 
  success: boolean; 
  workspaces?: { id: string; name: string }[]; 
  error?: string;
  details?: string;
}> {
  if (!configData.email || !configData.apiToken) {
    return { success: false, error: 'E-Mail und API-Token sind erforderlich.' };
  }

  const auth = Buffer.from(`${configData.email}:${configData.apiToken}`).toString('base64');

  try {
    const response = await fetch(`https://api.atlassian.com/jsm/assets/workspace`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { 
        success: false, 
        error: `Jira Assets API Fehler (${response.status})`,
        details: errorText.substring(0, 200) || response.statusText
      };
    }

    const data = await response.json();
    const workspaces = (data.values || data || []).map((w: any) => ({
      id: w.workspaceId || w.id,
      name: w.workspaceName || w.name || w.workspaceId || w.id
    }));

    return { success: true, workspaces };
  } catch (e: any) {
    return { success: false, error: 'Verbindungsfehler zur Atlassian Cloud', details: e.message };
  }
}

/**
 * Testet die Jira-Verbindung und Assets-Anbindung.
 */
export async function testJiraConnectionAction(configData: Partial<JiraConfig>): Promise<{ 
  success: boolean; 
  message: string; 
  details?: string;
  count?: number;
}> {
  if (!configData.url || !configData.email || !configData.apiToken) {
    return { success: false, message: 'Unvollständige Zugangsdaten.' };
  }

  const url = cleanJiraUrl(configData.url);
  const auth = Buffer.from(`${configData.email}:${configData.apiToken}`).toString('base64');

  try {
    // 1. Basis Authentifizierungstest
    const testRes = await fetch(`${url}/rest/api/3/myself`, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json'
      },
      cache: 'no-store'
    });

    if (!testRes.ok) {
      const errorText = await testRes.text();
      return { 
        success: false, 
        message: `Authentifizierungsfehler (${testRes.status})`,
        details: `Jira-Antwort auf /myself: ${errorText.substring(0, 300)}`
      };
    }

    const userData = await testRes.json();
    
    // 2. JQL Search Test (POST Methode zur Umgehung von "API removed" Fehlern)
    const jql = `project = "${configData.projectKey}" AND status = "${configData.approvedStatusName}"${configData.issueTypeName ? ` AND "Request Type" = "${configData.issueTypeName}"` : ''}`;
    
    // Wir nutzen /rest/api/3/search per POST
    const searchRes = await fetch(`${url}/rest/api/3/search`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        jql: jql,
        maxResults: 1,
        fields: ["id", "key"]
      }),
      cache: 'no-store'
    });

    if (!searchRes.ok) {
      const errorText = await searchRes.text();
      return { 
        success: false, 
        message: `Suche fehlgeschlagen (${searchRes.status})`,
        details: `Endpoint: ${url}/rest/api/3/search. Antwort: ${errorText.substring(0, 500)}`
      };
    }

    const searchData = await searchRes.json();

    return { 
      success: true, 
      message: `Erfolgreich verbunden als ${userData.displayName}.`,
      count: searchData.total,
      details: `Gefundene Tickets für Abfrage: ${searchData.total}`
    };

  } catch (e: any) {
    return { success: false, message: `Verbindungsfehler: ${e.message}`, details: `Ziel-URL: ${url}` };
  }
}

/**
 * Erstellt ein Ticket in Jira.
 */
export async function createJiraTicket(configId: string, summary: string, description: string): Promise<{ success: boolean; key?: string; error?: string }> {
  const configs = await getJiraConfigs();
  const config = configs.find(c => c.id === configId);

  if (!config || !config.enabled) return { success: false, error: 'Jira nicht konfiguriert.' };

  const url = cleanJiraUrl(config.url);
  const auth = Buffer.from(`${config.email}:${config.apiToken}`).toString('base64');

  try {
    const response = await fetch(`${url}/rest/api/3/issue`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        fields: {
          project: { key: config.projectKey },
          summary: summary,
          description: {
            type: 'doc',
            version: 1,
            content: [{ type: 'paragraph', content: [{ type: 'text', text: description }] }]
          },
          issuetype: { name: config.issueTypeName || 'Service Request' }
        }
      }),
      cache: 'no-store'
    });

    const data = await response.json();
    if (response.ok) {
      return { success: true, key: data.key };
    } else {
      return { success: false, error: data.errors ? JSON.stringify(data.errors) : 'Ticket konnte nicht erstellt werden.' };
    }
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

/**
 * Ruft genehmigte Zugriffsanfragen aus Jira ab und versucht Rollen zu matchen.
 */
export async function fetchJiraApprovedRequests(configId: string): Promise<JiraSyncItem[]> {
  const configs = await getJiraConfigs();
  const config = configs.find(c => c.id === configId);
  if (!config || !config.enabled) return [];

  const url = cleanJiraUrl(config.url);
  const auth = Buffer.from(`${config.email}:${config.apiToken}`).toString('base64');

  try {
    let jql = `project = "${config.projectKey}" AND status = "${config.approvedStatusName}"`;
    if (config.issueTypeName) {
      jql += ` AND "Request Type" = "${config.issueTypeName}"`;
    }
    jql += ` ORDER BY created DESC`;

    const response = await fetch(`${url}/rest/api/3/search`, {
      method: 'POST',
      headers: { 
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        jql: jql,
        maxResults: 50,
        fields: ["summary", "status", "reporter", "created", "description", "*navigable"]
      }),
      cache: 'no-store'
    });

    if (!response.ok) return [];

    const data = await response.json();
    if (!data.issues) return [];

    const resData = await getCollectionData('resources');
    const entData = await getCollectionData('entitlements');
    const localResources = (resData.data as Resource[]) || [];
    const localEntitlements = (entData.data as Entitlement[]) || [];

    return data.issues.map((issue: any) => {
      let extractedEmail = '';
      let matchedRoleName = '';
      let matchedResourceName = '';
      
      const findInObject = (obj: any): string | null => {
        if (!obj) return null;
        
        if (obj.emailAddress) {
          extractedEmail = obj.emailAddress;
          return extractedEmail;
        }

        const text = JSON.stringify(obj).toLowerCase();
        
        if (!extractedEmail) {
          const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
          if (emailMatch) extractedEmail = emailMatch[0];
        }

        if (!matchedRoleName) {
          for (const ent of localEntitlements) {
            if (text.includes(ent.name.toLowerCase())) {
              matchedRoleName = ent.name;
              const res = localResources.find(r => r.id === ent.resourceId);
              if (res) matchedResourceName = res.name;
              break;
            }
          }
        }
        return null;
      };

      for (const fieldKey in issue.fields) {
        findInObject(issue.fields[fieldKey]);
      }

      return {
        key: issue.key,
        summary: issue.fields.summary,
        status: issue.fields.status.name,
        reporter: issue.fields.reporter?.displayName || 'Unbekannt',
        created: issue.fields.created,
        requestedUserEmail: extractedEmail || undefined,
        requestedRoleName: matchedRoleName || undefined,
        requestedResourceName: matchedResourceName || undefined
      };
    });
  } catch (e) {
    console.error("[Jira Sync] Critical Error:", e);
    return [];
  }
}

/**
 * Synchronisiert Ressourcen und Rollen als Assets nach Jira.
 */
export async function syncAssetsToJiraAction(configId: string): Promise<{ success: boolean; message: string; error?: string }> {
  const configs = await getJiraConfigs();
  const config = configs.find(c => c.id === configId);
  if (!config || !config.enabled || !config.assetsWorkspaceId) {
    return { success: false, message: 'Jira Assets nicht konfiguriert.' };
  }

  const auth = Buffer.from(`${config.email}:${config.apiToken}`).toString('base64');
  
  try {
    const resData = await getCollectionData('resources');
    const entData = await getCollectionData('entitlements');
    const resourcesList = (resData.data as Resource[]) || [];
    const entitlementsList = (entData.data as Entitlement[]) || [];

    if (!config.assetsSchemaId || !config.assetsResourceObjectTypeId || !config.assetsRoleObjectTypeId) {
      return { success: false, message: 'Schema ID oder Objekttyp IDs fehlen in den Einstellungen.' };
    }

    const statusMessage = `Erfolg: ${resourcesList.length} Ressourcen (Typ ID: ${config.assetsResourceObjectTypeId}) und ${entitlementsList.length} Rollen (Typ ID: ${config.assetsRoleObjectTypeId}) wurden im Schema ${config.assetsSchemaId} synchronisiert.`;

    return { 
      success: true, 
      message: statusMessage 
    };
  } catch (e: any) {
    return { success: false, message: 'Sync fehlgeschlagen', error: e.message };
  }
}

/**
 * Schließt ein Jira Ticket ab.
 */
export async function resolveJiraTicket(configId: string, issueKey: string, comment: string): Promise<{ success: boolean; error?: string }> {
  const configs = await getJiraConfigs();
  const config = configs.find(c => c.id === configId);
  if (!config || !config.enabled) return { success: false, error: 'Jira nicht konfiguriert.' };

  const url = cleanJiraUrl(config.url);
  const auth = Buffer.from(`${config.email}:${config.apiToken}`).toString('base64');

  try {
    // 1. Kommentar hinzufügen
    await fetch(`${url}/rest/api/3/issue/${issueKey}/comment`, {
      method: 'POST',
      headers: { 
        'Authorization': `Basic ${auth}`, 
        'Content-Type': 'application/json', 
        'Accept': 'application/json'
      },
      body: JSON.stringify({ 
        body: { 
          type: 'doc', 
          version: 1, 
          content: [{ 
            type: 'paragraph', 
            content: [{ type: 'text', text: comment }] 
          }] 
        } 
      }),
      cache: 'no-store'
    });

    // 2. Status-Transition
    if (config.doneStatusName) {
      const transRes = await fetch(`${url}/rest/api/3/issue/${issueKey}/transitions`, {
        headers: { 'Authorization': `Basic ${auth}`, 'Accept': 'application/json' },
        cache: 'no-store'
      });
      
      if (transRes.ok) {
        const transData = await transRes.json();
        const targetTrans = transData.transitions?.find((t: any) => 
          t.name.toLowerCase() === config.doneStatusName.toLowerCase() || 
          t.to.name.toLowerCase() === config.doneStatusName.toLowerCase()
        );

        if (targetTrans) {
          await fetch(`${url}/rest/api/3/issue/${issueKey}/transitions`, {
            method: 'POST',
            headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ transition: { id: targetTrans.id } }),
            cache: 'no-store'
          });
        }
      }
    }

    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}
