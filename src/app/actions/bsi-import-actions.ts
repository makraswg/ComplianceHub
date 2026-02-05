
'use server';

import { Catalog, HazardModule, Hazard, ImportRun, DataSource } from '@/lib/types';
import { saveCollectionRecord } from './mysql-actions';
import { XMLParser } from 'fast-xml-parser';
import { createHash } from 'node:crypto';

/**
 * Erzeugt einen SHA-256 Hash aus einem String zur Dublettenprüfung.
 */
async function generateHash(content: string): Promise<string> {
  return createHash('sha256').update(content).digest('hex');
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
    
    // Suche nach der Wurzel (BSI XML Struktur variiert je nach Edition)
    const root = jsonObj.grundschutz || jsonObj.kompendium || jsonObj.it_grundschutz || jsonObj;
    
    // Extrahiere Bausteine/Module
    const modules = root.bausteine?.baustein || root.module?.modul || root.elemente?.element || [];
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
      const modCode = mod['@_code'] || mod.code || mod.id || 'UNKNOWN';
      const modTitle = mod.titel || mod.title || mod.name || modCode;
      const moduleId = `mod-${catalogId}-${modCode}`;

      const moduleRecord: HazardModule = {
        id: moduleId,
        catalogId: catalogId,
        code: modCode,
        title: modTitle
      };
      await saveCollectionRecord('hazardModules', moduleId, moduleRecord, dataSource);

      // Gefährdungen extrahieren (Suche in verschiedenen Pfaden)
      const threats = mod.gefaehrdungen?.gefaehrdung || mod.threats?.threat || mod.risiken?.risiko || [];
      const threatsList = Array.isArray(threats) ? threats : [threats];

      for (const threat of threatsList) {
        const threatCode = threat['@_code'] || threat.code || threat.id || `G_${Math.random().toString(36).substring(2,5)}`;
        const threatTitle = threat.titel || threat.title || threat.name || 'Unbenannt';
        const threatDesc = threat.beschreibung || threat.description || threat.text || '';
        const threatId = `haz-${moduleId}-${threatCode}`;

        // Content-Hashing zur Dublettenprüfung
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

    return { success: true, runId, message: `${itemCount} Einträge erfolgreich aus XML importiert.` };

  } catch (error: any) {
    console.error("BSI XML Import Error:", error);
    const errorRun: ImportRun = {
      id: runId,
      catalogId,
      timestamp: now,
      status: 'failed',
      itemCount,
      log: log + `FEHLER BEIM PARSING: ${error.message}`
    };
    await saveCollectionRecord('importRuns', runId, errorRun, dataSource);
    return { success: false, runId, message: `XML Parser Fehler: ${error.message}` };
  }
}
