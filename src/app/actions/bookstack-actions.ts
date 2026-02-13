
'use server';

import { getCollectionData, saveCollectionRecord } from './mysql-actions';
import { BookStackConfig, DataSource, Policy, PolicyVersion } from '@/lib/types';

/**
 * Ruft die BookStack-Konfiguration ab.
 */
export async function getBookStackConfigs(dataSource: DataSource = 'mysql'): Promise<BookStackConfig[]> {
  const result = await getCollectionData('bookstackConfigs', dataSource);
  return (result.data as BookStackConfig[]) || [];
}

/**
 * Publiziert ein Dokument (Policy) nach BookStack.
 */
export async function publishPolicyToBookStackAction(
  policyId: string,
  versionId: string,
  dataSource: DataSource = 'mysql'
) {
  try {
    const configs = await getBookStackConfigs(dataSource);
    const config = configs.find(c => c.enabled);
    if (!config) throw new Error("Keine aktive BookStack-Konfiguration gefunden.");

    const policyRes = await getCollectionData('policies', dataSource);
    const policy = policyRes.data?.find((p: Policy) => p.id === policyId);
    const verRes = await getCollectionData('policy_versions', dataSource);
    const version = verRes.data?.find((v: PolicyVersion) => v.id === versionId);

    if (!policy || !version) throw new Error("Dokument oder Version nicht gefunden.");

    // API Aufruf zu BookStack
    const authHeader = `Token ${config.token_id}:${config.token_secret}`;
    
    // Suche nach existierendem Export-Eintrag
    const exportRes = await getCollectionData('bookstack_exports', dataSource);
    const existingExport = exportRes.data?.find((e: any) => e.entity_id === policyId);

    let method = 'POST';
    let url = `${config.url}/api/pages`;
    
    const payload: any = {
      book_id: config.default_book_id,
      name: policy.title,
      markdown: version.content
    };

    if (existingExport?.page_id) {
      method = 'PUT';
      url = `${config.url}/api/pages/${existingExport.page_id}`;
    }

    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(`BookStack API Fehler: ${JSON.stringify(errData.error || errData)}`);
    }

    const pageData = await response.json();
    const exportId = existingExport?.id || `exp-pol-${Math.random().toString(36).substring(2, 9)}`;
    
    const exportRecord = {
      id: exportId,
      entity_id: policyId,
      version: version.version,
      page_id: pageData.id,
      book_id: pageData.book_id,
      status: 'success',
      exported_at: new Date().toISOString()
    };

    await saveCollectionRecord('bookstack_exports', exportId, exportRecord, dataSource);

    return { success: true, pageId: pageData.id, url: `${config.url}/link/${pageData.id}` };

  } catch (error: any) {
    console.error("BookStack Policy Export Error:", error);
    return { success: false, error: error.message };
  }
}
