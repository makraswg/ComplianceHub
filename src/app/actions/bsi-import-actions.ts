
'use server';

import { Catalog, HazardModule, Hazard, ImportRun, DataSource } from '@/lib/types';
import { saveCollectionRecord } from './mysql-actions';
import { XMLParser } from 'fast-xml-parser';
import { crypto } from 'next/dist/compiled/@edge-runtime/primitives';

/**
 * Erzeugt einen SHA-256 Hash aus einem String zur Dublettenprüfung.
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
  xmlContent: string;
}

/**
 * Verarbeitet BSI IT-Grundschutz XML-Kataloge.
 */
export async function runBsiXmlImportAction(input: BsiImportInput, dataSource: DataSource = 'mysql'): Promise<{ success: boolean; runId: string; message: string }> {
  const runId = `run-${Math.random().toString(36).substring(2, 9)}`;
  const catalogId = `cat-${input.catalogName.toLowerCase().replace(/\s+/g, '-')}-${input.version.replace(/\./g, '_')}`;
  const now = new Date().toISOString();
  
  let itemCount = 0;
  let log = `XML Import gestartet um ${now}\n`;

  try {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_"
    });
    
    const jsonObj = parser.parse(input.xmlContent);
    
    // Die Struktur von BSI XMLs variiert je nach Version (Kompendium vs. Katalog)
    // Wir suchen nach Modulen und Gefährdungen
    const root = jsonObj.grundschutz || jsonObj.kompendium || jsonObj;
    const modules = root.bausteine?.baustein || root.module?.modul || [];
    const modulesList = Array.isArray(modules) ? modules : [modules];

    // 1. Katalog-Stammsatz anlegen
    const catalog: Catalog = {
      id: catalogId,
      name: input.catalogName,
      version: input.version,
      provider: 'BSI IT-Grundschutz',
      importedAt: now
    };
    await saveCollectionRecord('catalogs', catalogId, catalog, dataSource);

    for (const mod of modulesList) {
      const modCode = mod['@_code'] || mod.code || 'UNKNOWN';
      const modTitle = mod.titel || mod.title || modCode;
      const moduleId = `mod-${catalogId}-${modCode}`;

      const moduleRecord: HazardModule = {
        id: moduleId,
        catalogId: catalogId,
        code: modCode,
        title: modTitle
      };
      await saveCollectionRecord('hazardModules', moduleId, moduleRecord, dataSource);

      // Gefährdungen extrahieren
      const threats = mod.gefaehrdungen?.gefaehrdung || mod.threats?.threat || [];
      const threatsList = Array.isArray(threats) ? threats : [threats];

      for (const threat of threatsList) {
        const threatCode = threat['@_code'] || threat.code || `G_${Math.random().toString(36).substring(2,5)}`;
        const threatTitle = threat.titel || threat.title || 'Unbenannt';
        const threatDesc = threat.beschreibung || threat.description || '';
        const threatId = `haz-${moduleId}-${threatCode}`;

        const contentForHash = `${threatTitle}|${threatDesc}`;
        const hash = await generateHash(contentForHash);

        const hazardRecord: Hazard = {
          id: threatId,
          moduleId: moduleId,
          code: threatCode,
          title: threatTitle,
          description: threatDesc,
          contentHash: hash
        };

        await saveCollectionRecord('hazards', threatId, hazardRecord, dataSource);
        itemCount++;
      }
    }

    log += `Import erfolgreich. ${itemCount} Gefährdungen verarbeitet.\n`;
    
    const run: ImportRun = {
      id: runId,
      catalogId,
      timestamp: now,
      status: 'success',
      itemCount,
      log
    };
    await saveCollectionRecord('importRuns', runId, run, dataSource);

    return { success: true, runId, message: `${itemCount} Einträge aus XML importiert.` };

  } catch (error: any) {
    console.error("BSI XML Import Error:", error);
    const errorRun: ImportRun = {
      id: runId,
      catalogId,
      timestamp: now,
      status: 'failed',
      itemCount,
      log: log + `FEHLER: ${error.message}`
    };
    await saveCollectionRecord('importRuns', runId, errorRun, dataSource);
    return { success: false, runId, message: `XML Parser Fehler: ${error.message}` };
  }
}
