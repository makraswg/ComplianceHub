'use server';

import { DataSource } from '@/lib/types';
import { saveCollectionRecord } from './mysql-actions';
import * as XLSX from 'xlsx';

/**
 * Importiert Relationen zwischen Maßnahmen und Gefährdungen aus der BSI Kreuztabelle.
 * Die Logik sucht nun dynamisch nach der Header-Zeile, um auch Dateien mit 
 * Metadaten im Kopfbereich verarbeiten zu können.
 */
export async function runBsiCrossTableImportAction(
  base64Content: string, 
  dataSource: DataSource = 'mysql'
): Promise<{ success: boolean; message: string; count: number }> {
  try {
    const buffer = Buffer.from(base64Content, 'base64');
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    // Wir konvertieren zuerst in ein Array von Arrays (AOA), 
    // um die Kopfzeile flexibel suchen zu können.
    const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    if (rows.length === 0) throw new Error("Die Excel-Datei scheint leer zu sein.");

    let headerRowIndex = -1;
    let colIndices = {
      baustein: -1,
      mCode: -1,
      mTitel: -1,
      hazards: [] as { code: string, index: number }[]
    };

    // 1. Suche nach der Header-Zeile
    for (let i = 0; i < Math.min(rows.length, 20); i++) {
      const row = rows[i];
      if (!row || !Array.isArray(row)) continue;

      let foundG = false;
      let foundM = false;

      row.forEach((cell, idx) => {
        const val = String(cell || '').trim().toUpperCase();
        
        // Identifiziere Basis-Spalten
        if (val.includes('BAUSTEIN') || val === 'ELEMENT') colIndices.baustein = idx;
        if (val.includes('ID') || val.includes('CODE')) colIndices.mCode = idx;
        if (val.includes('TITEL') || val.includes('BEZEICHNUNG') || val.includes('MASSNAHME')) {
          // Wir bevorzugen Spalten, die explizit "Massnahme" oder "Titel" im Namen haben
          if (val.includes('MASSNAHME') || colIndices.mTitel === -1) colIndices.mTitel = idx;
        }

        // Identifiziere Gefährdungs-Spalten (G 0.x)
        if (/^G\s*0\.[0-9]+$/i.test(val.replace(/\s+/g, ' '))) {
          colIndices.hazards.push({ 
            code: val.replace(/\s+/g, ' ').toUpperCase(), 
            index: idx 
          });
          foundG = true;
        }
      });

      // Wenn wir Gefährdungs-Spalten und mindestens eine ID-Spalte gefunden haben, 
      // ist das unsere Header-Zeile.
      if (foundG && (colIndices.mCode !== -1 || colIndices.baustein !== -1)) {
        headerRowIndex = i;
        break;
      }
    }

    if (headerRowIndex === -1) {
      throw new Error("Kopfzeile konnte nicht identifiziert werden. Bitte prüfen Sie, ob die Spalten 'Baustein', 'ID' und Gefährdungen wie 'G 0.1' vorhanden sind.");
    }

    console.log(`Header gefunden in Zeile ${headerRowIndex + 1}. Spalten:`, colIndices);

    let measureCount = 0;
    let relationCount = 0;

    // 2. Daten ab der Header-Zeile verarbeiten
    for (let i = headerRowIndex + 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row) continue;

      const baustein = String(row[colIndices.baustein] || '').trim();
      const mCode = String(row[colIndices.mCode] || '').trim();
      const mTitel = String(row[colIndices.mTitel] || '').trim();

      // Eine valide Zeile braucht mindestens einen Code oder Baustein
      if (!mCode || !baustein) continue;

      const measureId = `m-${baustein}-${mCode}`.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      
      // 1. Maßnahme anlegen
      await saveCollectionRecord('hazardMeasures', measureId, {
        id: measureId,
        code: mCode,
        title: mTitel || mCode,
        baustein: baustein
      }, dataSource);
      measureCount++;

      // 2. Relationen prüfen
      for (const hCol of colIndices.hazards) {
        const val = row[hCol.index];
        // Ein Kreuz liegt vor, wenn die Zelle nicht leer ist
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
        ? `${measureCount} Maßnahmen und ${relationCount} Relationen erfolgreich importiert.`
        : `Keine Datenzeilen nach der Kopfzeile gefunden.`,
      count: measureCount
    };
  } catch (error: any) {
    console.error("Cross Table Import Error:", error);
    return { success: false, message: error.message, count: 0 };
  }
}
