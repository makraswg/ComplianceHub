
'use server';

import { Catalog, HazardModule, Hazard, ImportRun, ImportIssue, DataSource } from '@/lib/types';
import { saveCollectionRecord } from './mysql-actions';
import { crypto } from 'next/dist/compiled/@edge-runtime/primitives';

/**
 * Erzeugt einen SHA-256 Hash aus einem String.
 */
async function generateHash(content: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export interface BsiImportInput {
  catalogName: string;
  version: string;
  data: any; // Der Katalog als JSON Struktur
}

/**
 * Robuster BSI Importer mit Content-Hashing und Governance-Logging.
 */
export async function runBsiImportAction(input: BsiImportInput, dataSource: DataSource = 'mysql'): Promise<{ success: boolean; runId: string; message: string }> {
  const runId = `run-${Math.random().toString(36).substring(2, 9)}`;
  const catalogId = `cat-${input.catalogName.toLowerCase().replace(/\s+/g, '-')}-${input.version}`;
  const now = new Date().toISOString();
  
  let itemCount = 0;
  let log = `Import gestartet um ${now}\n`;

  try {
    // 1. Katalog-Stammsatz anlegen
    const catalog: Catalog = {
      id: catalogId,
      name: input.catalogName,
      version: input.version,
      provider: 'BSI IT-Grundschutz',
      importedAt: now
    };
    await saveCollectionRecord('catalogs', catalogId, catalog, dataSource);

    // 2. Iteration über Module (simuliertes Streaming)
    const modules = input.data.modules || [];
    for (const modData of modules) {
      const moduleId = `mod-${catalogId}-${modData.code}`;
      const moduleRecord: HazardModule = {
        id: moduleId,
        catalogId: catalogId,
        code: modData.code,
        title: modData.title
      };
      await saveCollectionRecord('hazardModules', moduleId, moduleRecord, dataSource);

      // 3. Iteration über Gefährdungen
      const threats = modData.threats || [];
      for (const threatData of threats) {
        const threatId = `haz-${moduleId}-${threatData.code}`;
        const contentForHash = `${threatData.title}|${threatData.description}`;
        const hash = await generateHash(contentForHash);

        const hazardRecord: Hazard = {
          id: threatId,
          moduleId: moduleId,
          code: threatData.code,
          title: threatData.title,
          description: threatData.description,
          contentHash: hash
        };

        await saveCollectionRecord('hazards', threatId, hazardRecord, dataSource);
        itemCount++;
      }
    }

    log += `Import erfolgreich abgeschlossen. ${itemCount} Gefährdungen verarbeitet.\n`;
    
    const run: ImportRun = {
      id: runId,
      catalogId,
      timestamp: now,
      status: 'success',
      itemCount,
      log
    };
    await saveCollectionRecord('importRuns', runId, run, dataSource);

    return { success: true, runId, message: `${itemCount} Einträge erfolgreich importiert.` };

  } catch (error: any) {
    const errorRun: ImportRun = {
      id: runId,
      catalogId,
      timestamp: now,
      status: 'failed',
      itemCount,
      log: log + `FEHLER: ${error.message}`
    };
    await saveCollectionRecord('importRuns', runId, errorRun, dataSource);
    return { success: false, runId, message: error.message };
  }
}
