
"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileCode, Upload, Loader2 } from 'lucide-react';
import { usePluggableCollection } from '@/hooks/data/use-pluggable-collection';
import { useSettings } from '@/context/settings-context';
import { runBsiCrossTableImportAction } from '@/app/actions/bsi-cross-table-actions';
import { ImportRun } from '@/lib/types';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

export default function DataImportSettingsPage() {
  const { dataSource } = useSettings();
  const [isExcelImporting, setIsExcelImporting] = useState(false);

  const { data: importRuns, refresh } = usePluggableCollection<ImportRun>('importRuns');

  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsExcelImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = (event.target?.result as string).split(',')[1];
      const res = await runBsiCrossTableImportAction(base64, dataSource);
      if (res.success) {
        toast({ title: "Kreuztabellen importiert" });
        refresh();
      }
      setIsExcelImporting(false);
    };
    reader.readAsDataURL(file);
  };

  return (
    <Card className="rounded-none border shadow-none">
      <CardHeader className="bg-muted/10 border-b py-4">
        <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">
          <FileCode className="w-4 h-4" /> BSI Katalog Import
        </CardTitle>
      </CardHeader>
      <CardContent className="p-8 space-y-6">
        <div className="p-10 border-2 border-dashed rounded-none flex flex-col items-center gap-4 bg-muted/5">
          <Upload className="w-10 h-10 opacity-20" />
          <Input type="file" accept=".xlsx,.xls" onChange={handleExcelImport} className="max-w-xs" />
          <p className="text-[10px] text-muted-foreground uppercase font-bold text-center">Importiert BSI Kreuztabellen (Excel) zur Risikozuordnung.</p>
        </div>
        
        {isExcelImporting && (
          <div className="flex items-center justify-center gap-2 text-[10px] font-black uppercase text-blue-600 animate-pulse">
            <Loader2 className="w-4 h-4 animate-spin" /> Verarbeite Excel-Daten...
          </div>
        )}

        {importRuns && importRuns.length > 0 && (
          <div className="mt-8 space-y-4">
            <h4 className="text-[10px] font-black uppercase text-muted-foreground border-b pb-2">Letzte Import-Vorgänge</h4>
            <div className="border rounded-none overflow-hidden">
              <Table>
                <TableBody>
                  {importRuns.slice(0, 5).map(run => (
                    <TableRow key={run.id} className="text-[10px]">
                      <TableCell className="font-bold">{new Date(run.timestamp).toLocaleString()}</TableCell>
                      <TableCell>{run.itemCount} Einträge</TableCell>
                      <TableCell><Badge variant="outline" className={cn("text-[8px] border-none rounded-none", run.status === 'success' ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700")}>{run.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
