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

/**
 * Stellt sicher, dass ein Wert immer ein Array ist.
 */
function ensureArray(val: any): any[] {
  if (val === undefined || val === null) return [];
  if (Array.isArray(val)) return val;
  return [val];
}

/**
 * Extrahiert rekursiv alle Textinhalte aus DocBook-Knoten (para, itemizedlist, etc.)
 */
function extractTextContent(node: any): string {
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (!node) return '';

  let text = '';

  // Wenn es ein Array von Inhalten ist (z.B. mehrere Absätze)
  if (Array.isArray(node)) {
    return node.map(n => extractTextContent(n)).join('\n\n');
  }

  // Wenn es ein Objekt ist, schauen wir in die Schlüssel
  if (typeof node === 'object') {
    // In fast-xml-parser liegen Texte oft in #text
    if (node['#text']) text += node['#text'];
    
    // Verarbeite bekannte DocBook Tags in der richtigen Reihenfolge
    const relevantKeys = ['para', 'formalpara', 'itemizedlist', 'orderedlist', 'table', 'listitem'];
    for (const key of relevantKeys) {
      if (node[key]) {
        text += '\n' + extractTextContent(node[key]);
      }
    }
  }

  return text.trim();
}

export interface BsiImportInput {
  catalogName: string;
  version: string;
  xmlContent: string;
}

/**
 * Verarbeitet BSI IT-Grundschutz DocBook 5 XML-Kataloge.
 */
export async function runBsiXmlImportAction(input: BsiImportInput, dataSource: DataSource = 'mysql'): Promise<{ success: boolean; runId: string; message: string }> {
  const runId = `run-${Math.random().toString(36).substring(2, 9)}`;
  const catalogId = `cat-${input.catalogName.toLowerCase().replace(/\s+/g, '-')}-${input.version.replace(/\./g, '_')}`;
  const now = new Date().toISOString();
  
  let itemCount = 0;
  let log = `DocBook 5 Import gestartet um ${now}\n`;

  try {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
      removeNSPrefix: true, // Entfernt db: Präfixe für leichteren Zugriff
      trimValues: true,
      parseTagValue: true,
      alwaysCreateTextNode: false
    });
    
    const jsonObj = parser.parse(input.xmlContent);
    
    // Root-Element Suche (DocBook <book>)
    const book = jsonObj.book;
    if (!book) {
      throw new Error("Kein <book> Element gefunden. Ungültiges DocBook Format.");
    }

    log += `DocBook Struktur erkannt.\n`;

    // 1. Katalog-Stammsatz anlegen
    const catalog: Catalog = {
      id: catalogId,
      name: input.catalogName,
      version: input.version,
      provider: 'BSI IT-Grundschutz (DocBook)',
      importedAt: now
    };
    await saveCollectionRecord('catalogs', catalogId, catalog, dataSource);

    // Kapitelerkennung (<chapter>)
    const chapters = ensureArray(book.chapter);
    log += `${chapters.length} Kapitel gefunden.\n`;

    for (const chapter of chapters) {
      const chapterTitle = typeof chapter.title === 'string' ? chapter.title : extractTextContent(chapter.title);
      
      // Prüfen, ob das Kapitel eine Gefährdungsgruppe ist (enthält "Gefährdungen")
      if (!chapterTitle.toLowerCase().includes('gefährdungen')) {
        continue;
      }

      log += `Verarbeite Gefährdungsgruppe: ${chapterTitle}\n`;

      const moduleId = `mod-${catalogId}-${chapter['@_xml:id'] || Math.random().toString(36).substring(2, 7)}`;
      const moduleRecord: HazardModule = {
        id: moduleId,
        catalogId: catalogId,
        code: chapterTitle.includes('G 0') ? 'G 0' : 
              chapterTitle.includes('G 1') ? 'G 1' : 
              chapterTitle.includes('G 2') ? 'G 2' : 
              chapterTitle.includes('G 3') ? 'G 3' : 'G X',
        title: chapterTitle
      };
      await saveCollectionRecord('hazardModules', moduleId, moduleRecord, dataSource);

      // Gefährdungen sind <section> innerhalb des Kapitels
      const sections = ensureArray(chapter.section);
      
      for (const section of sections) {
        const fullTitle = extractTextContent(section.title);
        
        // Erkennung einzelner Gefährdungen: "G <Gruppe>.<Nummer>"
        const hazardMatch = fullTitle.match(/^(G\s*[0-9]+\.[0-9]+)\s*(.*)$/);
        
        if (!hazardMatch) {
          continue;
        }

        const hazardCode = hazardMatch[1].replace(/\s+/g, ' '); // Normalisiere Leerzeichen (G 0.1)
        const hazardTitle = hazardMatch[2].trim();
        const hazardId = `haz-${catalogId}-${section['@_xml:id'] || hazardCode.replace(/\./g, '_')}`;

        // Beschreibung extrahieren aus para und anderen Elementen
        const hazardDescription = extractTextContent(section);

        // Content-Hashing zur Dublettenprüfung
        const contentForHash = `${hazardTitle}|${hazardDescription}`;
        const hash = await generateHash(contentForHash);

        const hazardRecord: Hazard = {
          id: hazardId,
          moduleId: moduleId,
          code: hazardCode,
          title: hazardTitle,
          description: hazardDescription,
          contentHash: hash
        };

        await saveCollectionRecord('hazards', hazardId, hazardRecord, dataSource);
        itemCount++;
      }
    }

    log += `Import erfolgreich. ${itemCount} Gefährdungen aus DocBook extrahiert.\n`;
    
    const run: ImportRun = {
      id: runId,
      catalogId,
      timestamp: now,
      status: 'success',
      itemCount,
      log
    };
    await saveCollectionRecord('importRuns', runId, run, dataSource);

    return { success: true, runId, message: `${itemCount} Gefährdungen erfolgreich aus DocBook XML importiert.` };

  } catch (error: any) {
    console.error("DocBook Import Error:", error);
    const errorRun: ImportRun = {
      id: runId,
      catalogId,
      timestamp: now,
      status: 'failed',
      itemCount: 0,
      log: log + `FEHLER: ${error.message}`
    };
    await saveCollectionRecord('importRuns', runId, errorRun, dataSource);
    return { success: false, runId, message: `Import Fehler: ${error.message}` };
  }
}
