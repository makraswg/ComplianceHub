"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileCode, Upload, Loader2, Database, Info, History } from 'lucide-react';
import { usePluggableCollection } from '@/hooks/data/use-pluggable-collection';
import { useSettings } from '@/context/settings-context';
import { runBsiCrossTableImportAction } from '@/app/actions/bsi-cross-table-actions';
import { ImportRun } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';

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
    <div className="space-y-10">
      <Card className="rounded-xl border shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
        <CardHeader className="p-8 bg-slate-50 dark:bg-slate-900/50 border-b shrink-0">
          <div className="flex items-center gap-6">
            <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center text-primary shadow-sm border border-primary/10">
              <FileCode className="w-7 h-7" />
            </div>
            <div>
              <CardTitle className="text-xl font-headline font-bold uppercase tracking-tight text-slate-900 dark:text-white">Katalog-Import & Datenpflege</CardTitle>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1.5">Anreicherung der Risiko-Intelligenz durch BSI-Daten</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-8 space-y-10">
          <div className="p-10 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center gap-6 bg-slate-50/50 dark:bg-slate-950/50 transition-all hover:bg-slate-100/50">
            <div className="w-16 h-16 bg-white dark:bg-slate-900 rounded-2xl flex items-center justify-center shadow-md border border-slate-100 dark:border-slate-800">
              <Upload className="w-8 h-8 text-primary opacity-40" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-sm font-black uppercase text-slate-800 dark:text-slate-100">BSI Kreuztabellen hochladen</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest max-w-sm">Unterstützt .XLSX Formate für die Verknüpfung von Gefährdungen und Maßnahmen.</p>
            </div>
            <Input type="file" accept=".xlsx,.xls" onChange={handleExcelImport} className="max-w-xs h-11 rounded-lg border-slate-200 cursor-pointer" />
          </div>
          
          {isExcelImporting && (
            <div className="flex items-center justify-center gap-3 p-4 bg-primary/5 rounded-xl border border-primary/10 animate-pulse">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span className="text-[10px] font-black uppercase text-primary tracking-[0.2em]">Verarbeite Excel-Daten...</span>
            </div>
          )}

          <div className="space-y-6 pt-6 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black uppercase text-slate-900 dark:text-white flex items-center gap-3 tracking-widest">
                <History className="w-5 h-5 text-slate-400" /> Letzte Import-Vorgänge
              </h3>
              <Badge variant="outline" className="rounded-full text-[8px] font-black uppercase px-3 h-5">{importRuns?.length || 0} Einträge</Badge>
            </div>
            
            <div className="bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="border-slate-100 dark:border-slate-800">
                    <TableHead className="py-4 px-6 text-[9px] font-black uppercase text-slate-400">Zeitpunkt</TableHead>
                    <TableHead className="text-[9px] font-black uppercase text-slate-400">Umfang</TableHead>
                    <TableHead className="text-right px-6 text-[9px] font-black uppercase text-slate-400">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importRuns?.slice(0, 8).map(run => (
                    <TableRow key={run.id} className="text-xs group hover:bg-slate-50 transition-colors border-slate-100 dark:border-slate-800">
                      <TableCell className="py-4 px-6 font-bold text-slate-700 dark:text-slate-300">
                        {new Date(run.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-slate-500 font-medium">
                        {run.itemCount} Einträge verarbeitet
                      </TableCell>
                      <TableCell className="text-right px-6">
                        <Badge variant="outline" className={cn(
                          "text-[8px] font-black uppercase border-none rounded-full px-3 h-5 shadow-sm", 
                          run.status === 'success' ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                        )}>
                          {run.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!importRuns || importRuns.length === 0) && (
                    <TableRow><TableCell colSpan={3} className="py-12 text-center text-[10px] font-bold text-slate-400 uppercase italic">Keine Historie vorhanden</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}