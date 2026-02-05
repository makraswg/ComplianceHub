'use server';

import { DataSource } from '@/lib/types';
import { saveCollectionRecord } from './mysql-actions';
import * as XLSX from 'xlsx';

/**
 * Importiert Relationen zwischen Maßnahmen und Gefährdungen aus der BSI Kreuztabelle.
 * Verbessert: Sucht nun aktiv nach dem Blatt "Kreuztabelle" und scannt Zeilen isoliert.
 */
export async function runBsiCrossTableImportAction(
  base64Content: string, 
  dataSource: DataSource = 'mysql'
): Promise<{ success: boolean; message: string; count: number }> {
  try {
    const buffer = Buffer.from(base64Content, 'base64');
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    
    // 1. Suche nach dem richtigen Tabellenblatt
    let sheetName = workbook.SheetNames[0];
    const preferredNames = ['KREUZTABELLE', 'KRT', 'MATRIX', 'RELATIONEN'];
    
    for (const name of workbook.SheetNames) {
      if (preferredNames.some(p => name.toUpperCase().includes(preferredNames[0]))) {
        sheetName = name;
        break;
      }
    }

    const sheet = workbook.Sheets[sheetName];
    const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    if (rows.length === 0) throw new Error(`Das Blatt "${sheetName}" scheint leer zu sein.`);

    let headerRowIndex = -1;
    let finalColIndices = {
      baustein: -1,
      mCode: -1,
      mTitel: -1,
      hazards: [] as { code: string, index: number }[]
    };

    // 2. Suche nach der Header-Zeile (Scan der ersten 50 Zeilen)
    for (let i = 0; i < Math.min(rows.length, 50); i++) {
      const row = rows[i];
      if (!row || !Array.isArray(row)) continue;

      const currentIndices = {
        baustein: -1,
        mCode: -1,
        mTitel: -1,
        hazards: [] as { code: string, index: number }[]
      };

      row.forEach((cell, idx) => {
        const val = String(cell || '').trim().toUpperCase();
        
        // Suche Basis-Spalten
        if (val.includes('BAUSTEIN') || val === 'ELEMENT') currentIndices.baustein = idx;
        if (val.includes('ID') || val.includes('CODE') || val === 'NR.') currentIndices.mCode = idx;
        if (val.includes('TITEL') || val.includes('BEZEICHNUNG') || val.includes('MASSNAHME')) {
          if (val.includes('MASSNAHME') || currentIndices.mTitel === -1) currentIndices.mTitel = idx;
        }

        // Suche Gefährdungs-Spalten (G 0.x) - Flexiblere Regex
        const gMatch = val.replace(/\s+/g, ' ').match(/G\s*0\.([0-9]+)/i);
        if (gMatch) {
          currentIndices.hazards.push({ 
            code: `G 0.${gMatch[1]}`, 
            index: idx 
          });
        }
      });

      // Validierung: Eine Header-Zeile muss mindestens Gefährdungen UND (ID oder Baustein) haben
      if (currentIndices.hazards.length >= 1 && (currentIndices.mCode !== -1 || currentIndices.baustein !== -1)) {
        headerRowIndex = i;
        finalColIndices = currentIndices;
        break;
      }
    }

    if (headerRowIndex === -1) {
      throw new Error(`Kopfzeile in Blatt "${sheetName}" nicht gefunden. Erwartet werden Spalten wie "Baustein", "ID" und Gefährdungs-Codes (G 0.1 etc.).`);
    }

    let measureCount = 0;
    let relationCount = 0;

    // 3. Daten ab der Header-Zeile verarbeiten
    for (let i = headerRowIndex + 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row) continue;

      const baustein = String(row[finalColIndices.baustein] || '').trim();
      const mCode = String(row[finalColIndices.mCode] || '').trim();
      const mTitel = String(row[finalColIndices.mTitel] || '').trim();

      // Zeile überspringen wenn keine Identifikation möglich
      if (!mCode && !baustein) continue;

      const measureId = `m-${baustein || 'global'}-${mCode || i}`.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      
      // Maßnahme anlegen/aktualisieren
      await saveCollectionRecord('hazardMeasures', measureId, {
        id: measureId,
        code: mCode || 'N/A',
        title: mTitel || mCode || 'Unbenannte Maßnahme',
        baustein: baustein || 'Allgemein'
      }, dataSource);
      measureCount++;

      // Relationen prüfen
      for (const hCol of finalColIndices.hazards) {
        const val = row[hCol.index];
        // Markierung liegt vor, wenn Zelle nicht leer
        if (val !== undefined && val !== null && String(val).trim() !== '') {
          const relId = `rel-${measureId}-${hCol.code.replace(/[^a-z0-9]/gi, '_')}`.toLowerCase();
          
          await saveCollectionRecord('hazardMeasureRelations', relId, {
            id: relId,
            measureId: measureId,
            hazardCode: hCol.code
          }, dataSource);
          relationCount++;
        }
      }
    }

    return { 
      success: measureCount > 0, 
      message: measureCount > 0 
        ? `${measureCount} Maßnahmen und ${relationCount} Relationen aus Blatt "${sheetName}" importiert.`
        : `Keine Datenzeilen nach der Kopfzeile gefunden.`,
      count: measureCount
    };
  } catch (error: any) {
    console.error("Cross Table Import Error:", error);
    return { success: false, message: error.message, count: 0 };
  }
}
