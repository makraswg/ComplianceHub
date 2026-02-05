
'use server';

import { DataSource } from '@/lib/types';
import { saveCollectionRecord } from './mysql-actions';
import * as XLSX from 'xlsx';

export async function runBsiCrossTableImportAction(
  base64Content: string, 
  dataSource: DataSource = 'mysql'
): Promise<{ success: boolean; message: string; count: number }> {
  try {
    const buffer = Buffer.from(base64Content, 'base64');
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data: any[] = XLSX.utils.sheet_to_json(sheet);

    if (data.length === 0) throw new Error("Die Excel-Datei scheint leer zu sein.");

    let measureCount = 0;
    let relationCount = 0;

    // Wir suchen nach Spalten, die dem Muster G 0.x entsprechen
    const headers = Object.keys(data[0]);
    const hazardColumns = headers.filter(h => h.trim().match(/^G\s*0\.[0-9]+$/i));

    for (const row of data) {
      const baustein = row['Baustein'] || row['baustein'];
      const mCode = row['Maßnahmen-ID'] || row['Maßnahmen-ID'] || row['id'];
      const mTitel = row['Maßnahmen-Titel'] || row['Maßnahmen-Titel'] || row['titel'];

      if (!baustein || !mCode || !mTitel) continue;

      const measureId = `m-${baustein}-${mCode}`.replace(/\s+/g, '_').toLowerCase();
      
      // 1. Maßnahme anlegen
      await saveCollectionRecord('hazardMeasures', measureId, {
        id: measureId,
        code: mCode,
        title: mTitel,
        baustein: baustein
      }, dataSource);
      measureCount++;

      // 2. Relationen zu G 0.x Gefährdungen prüfen
      for (const col of hazardColumns) {
        const val = row[col];
        if (val !== undefined && val !== null && val.toString().trim() !== '') {
          const relId = `rel-${measureId}-${col.trim().replace(/\s+/g, '_')}`.toLowerCase();
          await saveCollectionRecord('hazardMeasureRelations', relId, {
            id: relId,
            measureId: measureId,
            hazardCode: col.trim().replace(/\s+/g, ' ') // Normalisiere zu "G 0.1"
          }, dataSource);
          relationCount++;
        }
      }
    }

    return { 
      success: true, 
      message: `${measureCount} Maßnahmen und ${relationCount} Relationen erfolgreich importiert.`,
      count: measureCount
    };
  } catch (error: any) {
    console.error("Cross Table Import Error:", error);
    return { success: false, message: error.message, count: 0 };
  }
}
