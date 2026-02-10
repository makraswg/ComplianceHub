"use client";

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Database, 
  RotateCcw, 
  Trash2, 
  Loader2, 
  Save, 
  History, 
  ShieldCheck, 
  AlertTriangle,
  Download,
  Activity,
  HardDrive,
  Info,
  Clock,
  PlayCircle
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { usePluggableCollection } from '@/hooks/data/use-pluggable-collection';
import { useSettings } from '@/context/settings-context';
import { usePlatformAuth } from '@/context/auth-context';
import { 
  triggerSystemBackupAction, 
  restoreSystemBackupAction, 
  deleteBackupEntryAction 
} from '@/app/actions/backup-actions';
import { toast } from '@/hooks/use-toast';
import { PlatformBackup } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const dynamic = 'force-dynamic';

export default function SystemBackupSettingsPage() {
  const { dataSource } = useSettings();
  const { user } = usePlatformAuth();
  const [mounted, setMounted] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState<PlatformBackup | null>(null);

  const { data: backups, refresh, isLoading } = usePluggableCollection<PlatformBackup>('platform_backups');

  useEffect(() => { setMounted(true); }, []);

  const handleCreateBackup = async () => {
    setIsProcessing(true);
    try {
      const res = await triggerSystemBackupAction(dataSource, user?.email || 'admin');
      if (res.success) {
        toast({ title: "Backup erfolgreich erstellt" });
        refresh();
      } else throw new Error(res.error);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Backup fehlgeschlagen", description: e.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRestore = async () => {
    if (!restoreTarget) return;
    setIsProcessing(true);
    try {
      const res = await restoreSystemBackupAction(restoreTarget.id, dataSource, user?.email || 'admin');
      if (res.success) {
        toast({ title: "System erfolgreich wiederhergestellt", description: "Die Daten wurden auf den Stand des Backups gesetzt." });
        setRestoreTarget(null);
      } else throw new Error(res.error);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Restore fehlgeschlagen", description: e.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '---';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!mounted) return null;

  return (
    <div className="space-y-10">
      <Card className="rounded-xl border shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
        <CardHeader className="p-8 bg-slate-50 dark:bg-slate-900/50 border-b shrink-0">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-6">
              <div className="w-14 h-14 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-600 border border-emerald-100 dark:border-emerald-900/30 shadow-sm">
                <Database className="w-7 h-7" />
              </div>
              <div>
                <CardTitle className="text-xl font-headline font-bold uppercase tracking-tight text-slate-900 dark:text-white">Backup & Restore</CardTitle>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1.5">Revisionssichere Sicherung der Plattform-Datenbank</p>
              </div>
            </div>
            <Button 
              onClick={handleCreateBackup} 
              disabled={isProcessing}
              className="rounded-xl h-11 px-8 font-black uppercase text-[10px] tracking-widest gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200"
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
              Vollsicherung starten
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="p-8 space-y-12">
          {/* Status Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-white dark:bg-slate-900 flex items-center justify-center text-slate-400 shadow-sm"><History className="w-5 h-5" /></div>
              <div>
                <p className="text-[9px] font-black uppercase text-slate-400">Backups vorhanden</p>
                <p className="text-xl font-black text-slate-800 dark:text-white">{backups?.length || 0}</p>
              </div>
            </div>
            <div className="p-6 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-white dark:bg-slate-900 flex items-center justify-center text-emerald-600 shadow-sm"><ShieldCheck className="w-5 h-5" /></div>
              <div>
                <p className="text-[9px] font-black uppercase text-emerald-600">Letzte Sicherung</p>
                <p className="text-sm font-bold text-slate-800 dark:text-white">
                  {backups?.length ? new Date(backups[backups.length - 1].timestamp).toLocaleDateString() : 'Nie'}
                </p>
              </div>
            </div>
            <div className="p-6 bg-blue-50/50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900/30 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-white dark:bg-slate-900 flex items-center justify-center text-blue-600 shadow-sm"><HardDrive className="w-5 h-5" /></div>
              <div>
                <p className="text-[9px] font-black uppercase text-blue-600">Speicherplatz</p>
                <p className="text-sm font-bold text-slate-800 dark:text-white">
                  {formatSize(backups?.reduce((acc, b) => acc + b.fileSize, 0) || 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between border-b pb-4">
              <h3 className="text-sm font-black uppercase text-slate-900 dark:text-white tracking-widest flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" /> Sicherungshistorie
              </h3>
              <Badge variant="outline" className="text-[8px] font-black uppercase border-slate-200 h-5 px-2">SQL / MySQL Exports</Badge>
            </div>

            <div className="bg-white dark:bg-slate-950 border rounded-xl overflow-hidden shadow-sm">
              {isLoading ? (
                <div className="py-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary opacity-20" /></div>
              ) : (
                <Table>
                  <TableHeader className="bg-slate-50/50 dark:bg-slate-900/50">
                    <TableRow className="border-slate-100 dark:border-slate-800">
                      <TableHead className="py-4 px-6 text-[9px] font-black uppercase text-slate-400">Zeitpunkt</TableHead>
                      <TableHead className="text-[9px] font-black uppercase text-slate-400">Datei / Quelle</TableHead>
                      <TableHead className="text-[9px] font-black uppercase text-slate-400">Größe</TableHead>
                      <TableHead className="text-[9px] font-black uppercase text-slate-400">Status</TableHead>
                      <TableHead className="text-right px-6 text-[9px] font-black uppercase text-slate-400">Wiederherstellen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {backups?.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map(bkp => (
                      <TableRow key={bkp.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-slate-100 dark:border-slate-800">
                        <TableCell className="py-4 px-6">
                          <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            {new Date(bkp.timestamp).toLocaleString()}
                          </div>
                          <div className="text-[8px] text-slate-400 uppercase font-bold mt-0.5">Von: {bkp.createdBy}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="h-4 px-1.5 text-[7px] font-black uppercase rounded-none">{bkp.type}</Badge>
                            <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400 truncate max-w-[200px]">{bkp.fileName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-[10px] font-bold text-slate-500">
                          {formatSize(bkp.fileSize)}
                        </TableCell>
                        <TableCell>
                          <Badge className={cn(
                            "text-[8px] font-black uppercase border-none rounded-full px-2 h-5 shadow-sm",
                            bkp.status === 'success' ? "bg-emerald-100 text-emerald-700" : bkp.status === 'failed' ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700 animate-pulse"
                          )}>
                            {bkp.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right px-6">
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-primary opacity-0 group-hover:opacity-100 transition-all hover:bg-primary/5"
                              onClick={() => setRestoreTarget(bkp)}
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-red-400 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-50"
                              onClick={() => deleteBackupEntryAction(bkp.id, dataSource).then(() => refresh())}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!backups || backups.length === 0) && (
                      <TableRow><TableCell colSpan={5} className="py-20 text-center text-[10px] font-bold text-slate-400 uppercase italic">Keine Sicherungen gefunden</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>

          <div className="p-6 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900/30 flex items-start gap-4">
            <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-xs font-black uppercase text-slate-900 dark:text-blue-400">Hinweis zur Systemstabilität</p>
              <p className="text-[10px] text-slate-500 italic leading-relaxed">
                Manuelle Backups sichern den aktuellen Stand der relationalen Datenbank. In einer Docker-Umgebung werden die SQL-Dumps im Volume des Datenbank-Containers abgelegt. Regelmäßige Backups sollten zusätzlich über die Infrastruktur-Ebene (Cloud oder On-Prem Snapshot) gesichert werden.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Restore Confirmation Dialog */}
      <AlertDialog open={!!restoreTarget} onOpenChange={(v) => !v && setRestoreTarget(null)}>
        <AlertDialogContent className="rounded-2xl border-none shadow-2xl p-8">
          <AlertDialogHeader>
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <RotateCcw className="w-6 h-6 text-red-600" />
            </div>
            <AlertDialogTitle className="text-xl font-headline font-bold text-red-600 text-center">System wiederherstellen?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-slate-500 font-medium leading-relaxed pt-2 text-center">
              Sie sind dabei, die gesamte Datenbank auf den Stand vom <br/>
              <strong className="text-slate-900">{restoreTarget && new Date(restoreTarget.timestamp).toLocaleString()}</strong> zurückzusetzen.
              <br/><br/>
              <span className="text-red-600 font-bold">Achtung:</span> Alle Änderungen seit diesem Zeitpunkt gehen verloren. Die Anwendung wird während des Vorgangs neu gestartet.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-6 gap-3 sm:justify-center">
            <AlertDialogCancel className="rounded-xl font-bold text-xs h-11 px-8 border-slate-200">Abbrechen</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleRestore} 
              disabled={isProcessing}
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs h-11 px-10 gap-2 shadow-lg shadow-red-200"
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
              Wiederherstellung ausführen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
