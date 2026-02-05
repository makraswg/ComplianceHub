'use server';

import { DataSource, ImportRun } from '@/lib/types';
import { saveCollectionRecord } from './mysql-actions';
import * as XLSX from 'xlsx';

/**
 * Importiert Maßnahmen und deren Relationen zu Gefährdungen aus der BSI Kreuztabelle (Excel).
 * Optimiert für Header-Strukturen wie: [Baustein-Code] | Name | CIA | G 0.x
 */
export async function runBsiCrossTableImportAction(
  base64Content: string, 
  dataSource: DataSource = 'mysql'
): Promise<{ success: boolean; message: string; count: number }> {
  const runId = `run-excel-${Math.random().toString(36).substring(2, 9)}`;
  const now = new Date().toISOString();
  let log = `Excel Kreuztabellen-Import gestartet um ${now}\n`;
  
  try {
    const buffer = Buffer.from(base64Content, 'base64');
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    
    let totalMeasures = 0;
    let totalRelations = 0;
    let processedSheetsCount = 0;

    log += `Workbook geladen. ${workbook.SheetNames.length} Blätter gefunden.\n`;

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      // Nutze {header: 1} für Array of Arrays (AOA)
      const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

      if (rows.length === 0) continue;

      // --- SCHRITT 1: Header suchen ---
      let headerRowIndex = -1;
      let colMap = {
        mCode: 0, // Meistens Spalte A
        mTitel: -1,
        hazards: [] as { code: string, index: number }[]
      };
      let foundBaustein = 'GLOBAL';

      // Scan die ersten 50 Zeilen nach Gefährdungs-Codes (G 0.x)
      for (let i = 0; i < Math.min(rows.length, 50); i++) {
        const row = rows[i];
        if (!row || !Array.isArray(row)) continue;

        const currentHazards: { code: string, index: number }[] = [];
        let titleIdx = -1;

        row.forEach((cell, idx) => {
          const val = String(cell || '').trim();
          if (!val) return;
          
          // 1. Gefährdungen erkennen (G 0.1, G 0.15 etc)
          const gMatch = val.match(/G\s*0[.\s]*([0-9]+)/i);
          if (gMatch) {
            currentHazards.push({ 
              code: `G 0.${gMatch[1]}`, 
              index: idx 
            });
            return;
          }

          // 2. Titel-Spalte erkennen
          const upperVal = val.toUpperCase();
          if (upperVal === 'NAME' || upperVal === 'TITEL' || upperVal === 'BEZEICHNUNG') {
            titleIdx = idx;
          }
        });

        // Ein Blatt ist relevant, wenn Gefährdungs-Spalten vorhanden sind
        if (currentHazards.length >= 1) {
          headerRowIndex = i;
          colMap.hazards = currentHazards;
          colMap.mTitel = titleIdx !== -1 ? titleIdx : 1; // Fallback auf Spalte B
          
          // Baustein aus der ersten Spaltenüberschrift extrahieren (z.B. "NET.2.2")
          const firstColHeader = String(rows[i][0] || '').trim();
          const bMatch = firstColHeader.match(/^[A-Z]{2,4}\.[0-9.]+/);
          if (bMatch) {
            foundBaustein = bMatch[0];
          } else {
            // Fallback: Baustein aus Blattnamen ableiten
            const sMatch = sheetName.match(/^[A-Z]{2,4}\.[0-9.]+/);
            if (sMatch) foundBaustein = sMatch[0];
          }
          break;
        }
      }

      if (headerRowIndex === -1) continue;

      log += `Blatt "${sheetName}": Header in Zeile ${headerRowIndex + 1} gefunden. Baustein: ${foundBaustein}, G-Spalten: ${colMap.hazards.length}\n`;
      processedSheetsCount++;

      // --- SCHRITT 2: Daten verarbeiten ---
      for (let i = headerRowIndex + 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || !Array.isArray(row)) continue;

        let mCode = String(row[colMap.mCode] || '').trim();
        const mTitel = String(row[colMap.mTitel] || '').trim();

        // Wenn kein Code und kein Titel da ist, ist es keine Datenzeile
        if (!mCode && !mTitel) continue;

        // Normalisierung: Code ohne Präfix (falls mCode nur "M 1" ist)
        const cleanMCode = mCode || `M-${i}`;
        const measureId = `m-${foundBaustein}-${cleanMCode}`.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        
        // Maßnahme speichern
        await saveCollectionRecord('hazardMeasures', measureId, {
          id: measureId,
          code: cleanMCode,
          title: mTitel || cleanMCode,
          baustein: foundBaustein
        }, dataSource);
        totalMeasures++;

        // Relationen zu den G-Spalten
        for (const hCol of colMap.hazards) {
          const cellVal = String(row[hCol.index] || '').trim();
          
          // Boolean Presence: Nicht leer = Relation
          if (cellVal !== '') {
            const relId = `rel-${measureId}-${hCol.code.replace(/[^a-z0-9]/gi, '_')}`.toLowerCase();
            
            await saveCollectionRecord('hazardMeasureRelations', relId, {
              id: relId,
              measureId: measureId,
              hazardCode: hCol.code
            }, dataSource);
            totalRelations++;
          }
        }
      }
    }

    if (processedSheetsCount === 0) {
      const errorMsg = "Keine relevanten Kreuztabellen-Blätter gefunden. Stellen Sie sicher, dass Spalten wie 'G 0.1' und Baustein-Codes vorhanden sind.";
      await saveCollectionRecord('importRuns', runId, {
        id: runId,
        catalogId: 'excel-krt',
        timestamp: now,
        status: 'failed',
        itemCount: 0,
        log: log + `FEHLER: ${errorMsg}`
      }, dataSource);
      return { success: false, message: errorMsg, count: 0 };
    }

    const successMsg = `Import erfolgreich: ${totalMeasures} Maßnahmen und ${totalRelations} Relationen aus ${processedSheetsCount} Blättern verarbeitet.`;
    await saveCollectionRecord('importRuns', runId, {
      id: runId,
      catalogId: 'excel-krt',
      timestamp: now,
      status: 'success',
      itemCount: totalMeasures,
      log: log + `ERFOLG: ${successMsg}`
    }, dataSource);

    return { success: true, message: successMsg, count: totalMeasures };
  } catch (error: any) {
    console.error("Excel Import Error:", error);
    await saveCollectionRecord('importRuns', runId, {
      id: runId,
      catalogId: 'excel-krt',
      timestamp: now,
      status: 'failed',
      itemCount: 0,
      log: log + `FEHLER: ${error.message}`
    }, dataSource);
    return { success: false, message: `Systemfehler: ${error.message}`, count: 0 };
  }
}
