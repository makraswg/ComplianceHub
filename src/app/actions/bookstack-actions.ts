
'use server';

import { getCollectionData, saveCollectionRecord } from './mysql-actions';
import { BookStackConfig, DataSource, Process, ProcessVersion } from '@/lib/types';

/**
 * Ruft die BookStack-Konfiguration ab.
 */
export async function getBookStackConfigs(dataSource: DataSource = 'mysql'): Promise<BookStackConfig[]> {
  const result = await getCollectionData('bookstackConfigs', dataSource);
  return (result.data as BookStackConfig[]) || [];
}

/**
 * Publiziert einen Prozess nach BookStack.
 */
export async function publishToBookStackAction(
  processId: string,
  versionNum: number,
  diagramSvgBase64: string,
  dataSource: DataSource = 'mysql'
) {
  try {
    const configs = await getBookStackConfigs(dataSource);
    const config = configs.find(c => c.enabled);
    if (!config) throw new Error("Keine aktive BookStack-Konfiguration gefunden.");

    const procRes = await getCollectionData('processes', dataSource);
    const process = procRes.data?.find((p: Process) => p.id === processId);
    const verRes = await getCollectionData('process_versions', dataSource);
    const version = verRes.data?.find((v: ProcessVersion) => v.process_id === processId && v.version === versionNum);

    if (!process || !version) throw new Error("Prozess oder Version nicht gefunden.");

    // Erzeuge HTML-Inhalt
    let html = `<h1>${process.title} (V${version.version})</h1>`;
    html += `<p>${process.description || 'Keine Beschreibung vorhanden.'}</p>`;
    html += `<h2>Prozessdiagramm</h2>`;
    html += `<div style="border: 1px solid #ccc; padding: 10px; text-align: center;">`;
    html += `<img src="data:image/svg+xml;base64,${diagramSvgBase64}" style="max-width: 100%; height: auto;" />`;
    html += `</div>`;
    html += `<h2>Ablaufschritte</h2><ul>`;
    version.model_json.nodes.filter(n => n.type === 'step').forEach(node => {
      html += `<li><strong>${node.title}</strong>: ${node.description || '-'} (Rolle: ${node.roleId || 'N/A'})</li>`;
    });
    html += `</ul>`;
    html += `<hr/><p><small>Veröffentlicht aus ComplianceHub. ID: ${processId}</small></p>`;

    // API Aufruf zu BookStack
    // Wir nutzen hier die BookStack REST API v1
    const authHeader = `Token ${config.token_id}:${config.token_secret}`;
    
    // 1. Suche nach existierendem Export-Eintrag
    const exportRes = await getCollectionData('bookstack_exports', dataSource);
    const existingExport = exportRes.data?.find((e: any) => e.process_id === processId);

    let method = 'POST';
    let url = `${config.url}/api/pages`;
    
    const payload: any = {
      book_id: config.default_book_id,
      name: process.title,
      html: html
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
    const exportId = existingExport?.id || `exp-${Math.random().toString(36).substring(2, 9)}`;
    
    const exportRecord = {
      id: exportId,
      process_id: processId,
      version: versionNum,
      page_id: pageData.id,
      book_id: pageData.book_id,
      status: 'success',
      exported_at: new Date().toISOString()
    };

    await saveCollectionRecord('bookstack_exports', exportId, exportRecord, dataSource);

    return { success: true, pageId: pageData.id, url: `${config.url}/link/${pageData.id}` };

  } catch (error: any) {
    console.error("BookStack Export Error:", error);
    return { success: false, error: error.message };
  }
}
