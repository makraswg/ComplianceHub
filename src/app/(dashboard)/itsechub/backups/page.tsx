
"use client";

import { useState, useEffect, useMemo } from 'react';
import { 
  HardDrive, 
  Loader2, 
  RefreshCw, 
  Search, 
  Filter, 
  Database, 
  UserCircle, 
  Clock, 
  ChevronRight, 
  Activity,
  Layers,
  ArrowRight,
  Download,
  Upload,
  AlertTriangle,
  Workflow,
  ShieldCheck,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { usePluggableCollection } from '@/hooks/data/use-pluggable-collection';
import { useSettings } from '@/context/settings-context';
import { BackupJob, Resource, JobTitle, Process } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';

export default function BackupMonitorPage() {
  const router = useRouter();
  const { dataSource, activeTenantId } = useSettings();
  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState('');
  const [cycleFilter, setCycleFilter] = useState('all');
  const [isSimulating, setIsSimulating] = useState(false);

  const { data: allBackupJobs, isLoading: isJobsLoading } = usePluggableCollection<BackupJob>('backup_jobs');
  const { data: resources } = usePluggableCollection<Resource>('resources');
  const { data: jobTitles } = usePluggableCollection<JobTitle>('jobTitles');
  const { data: processes } = usePluggableCollection<Process>('processes');

  useEffect(() => { setMounted(true); }, []);

  const filteredJobs = useMemo(() => {
    if (!allBackupJobs) return [];
    return allBackupJobs.filter(job => {
      const res = resources?.find(r => r.id === job.resourceId);
      const matchesTenant = activeTenantId === 'all' || res?.tenantId === activeTenantId;
      const matchesSearch = job.name.toLowerCase().includes(search.toLowerCase()) || res?.name.toLowerCase().includes(search.toLowerCase());
      const matchesCycle = cycleFilter === 'all' || job.cycle === cycleFilter;
      return matchesTenant && matchesSearch && matchesCycle;
    });
  }, [allBackupJobs, resources, search, cycleFilter, activeTenantId]);

  const uncoveredSystems = useMemo(() => {
    if (!resources || !allBackupJobs) return [];
    return resources.filter(res => {
      const isGlobal = res.tenantId === 'global' || !res.tenantId;
      const matchesTenant = activeTenantId === 'all' || isGlobal || res.tenantId === activeTenantId;
      if (!matchesTenant || res.status === 'archived') return false;
      
      const requiresBackup = !!res.backupRequired;
      const hasJob = allBackupJobs.some(j => j.resourceId === res.id);
      return requiresBackup && !hasJob;
    });
  }, [resources, allBackupJobs, activeTenantId]);

  const handleSimulateRestore = () => {
    setIsSimulating(true);
    setTimeout(() => {
      setIsSimulating(false);
      alert("Wiederherstellungs-Simulation für die ausgewählte Datenbankumgebung abgeschlossen.");
    }, 2000);
  };

  if (!mounted) return null;

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b pb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-orange-500/10 text-orange-600 flex items-center justify-center rounded-xl border border-orange-500/10 shadow-sm">
            <HardDrive className="w-6 h-6" />
          </div>
          <div>
            <Badge className="mb-1 rounded-full px-2 py-0 bg-orange-100 text-orange-700 text-[9px] font-bold border-none uppercase tracking-widest">ITSecHub / BCM</Badge>
            <h1 className="text-2xl font-headline font-bold text-slate-900 dark:text-white uppercase tracking-tight">Backup & Recovery Monitor</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Systemweite Überwachung der Datensicherungsprozesse (Business Continuity).</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-9 rounded-xl font-bold text-[10px] uppercase gap-2 border-slate-200">
            <Download className="w-3.5 h-3.5" /> System Dump
          </Button>
          <Button size="sm" className="h-9 rounded-xl font-bold text-[10px] uppercase gap-2 bg-orange-600 hover:bg-orange-700 text-white shadow-lg" onClick={handleSimulateRestore} disabled={isSimulating}>
            {isSimulating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} Restore Simulation
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="rounded-2xl border shadow-sm bg-white overflow-hidden">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Aktive Sicherungs-Jobs</p>
              <h3 className="text-3xl font-black text-slate-900">{allBackupJobs?.length || 0}</h3>
            </div>
            <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 shadow-inner"><Database className="w-6 h-6" /></div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border shadow-sm bg-white overflow-hidden">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase text-orange-600 tracking-widest">Tägliche Zyklen</p>
              <h3 className="text-3xl font-black text-orange-700">{allBackupJobs?.filter(j => j.cycle === 'Täglich').length || 0}</h3>
            </div>
            <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600 shadow-inner"><Clock className="w-6 h-6" /></div>
          </CardContent>
        </Card>
        <Card className={cn(
          "rounded-2xl border shadow-sm overflow-hidden transition-colors",
          uncoveredSystems.length > 0 ? "bg-red-50 border-red-100" : "bg-emerald-50 border-emerald-100"
        )}>
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className={cn("text-[10px] font-black uppercase tracking-widest", uncoveredSystems.length > 0 ? "text-red-600" : "text-emerald-600")}>
                Ungesicherte Assets
              </p>
              <h3 className={cn("text-3xl font-black", uncoveredSystems.length > 0 ? "text-red-700" : "text-emerald-700")}>
                {uncoveredSystems.length}
              </h3>
            </div>
            <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shadow-sm border", uncoveredSystems.length > 0 ? "bg-white text-red-600 border-red-100" : "bg-white text-emerald-600 border-emerald-100")}>
              {uncoveredSystems.length > 0 ? <AlertTriangle className="w-6 h-6" /> : <ShieldCheck className="w-6 h-6" />}
            </div>
          </CardContent>
        </Card>
      </div>

      {uncoveredSystems.length > 0 && (
        <Alert variant="destructive" className="rounded-2xl bg-red-600 text-white border-none shadow-xl animate-in slide-in-from-top-4">
          <AlertCircle className="h-5 w-5 text-white" />
          <AlertTitle className="text-sm font-black uppercase tracking-widest">Kritische Lücken in der Datensicherung</AlertTitle>
          <AlertDescription className="text-xs font-bold opacity-90 mt-1">
            Für {uncoveredSystems.length} IT-Systeme wurde ein Backup-Bedarf definiert, aber noch kein Sicherungs-Job konfiguriert: 
            {uncoveredSystems.map(s => s.name).join(', ')}.
          </AlertDescription>
        </Alert>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-3xl border shadow-xl overflow-hidden flex flex-col">
        <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-b flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-orange-600" />
            <Input 
              placeholder="Sicherung oder IT-System suchen..." 
              className="pl-10 h-11 rounded-xl bg-white border-slate-200 shadow-none focus:ring-orange-500/20"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-3">
            <Select value={cycleFilter} onValueChange={setCycleFilter}>
              <SelectTrigger className="h-11 w-44 rounded-xl bg-white border-slate-200 text-xs font-bold uppercase tracking-widest shadow-sm">
                <Filter className="w-3.5 h-3.5 mr-2 text-slate-400" />
                <SelectValue placeholder="Sicherungs-Zyklus" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all">Alle Zyklen</SelectItem>
                {['Täglich', 'Wöchentlich', 'Monatlich', 'Manuell'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/30">
              <TableRow>
                <TableHead className="py-4 px-8 text-[10px] font-black uppercase tracking-widest text-slate-400">Job & System</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Intervall</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">Verantwortlich</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">Dokumentation (Leitfaden)</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Zuletzt geprüft</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isJobsLoading ? (
                <TableRow><TableCell colSpan={5} className="h-40 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-orange-600 opacity-20" /></TableCell></TableRow>
              ) : filteredJobs.map(job => {
                const res = resources?.find(r => r.id === job.resourceId);
                const role = jobTitles?.find(j => j.id === job.responsibleRoleId);
                const itProc = processes?.find(p => p.id === job.it_process_id);
                
                return (
                  <TableRow key={job.id} className="group hover:bg-slate-50 transition-colors border-b last:border-0 cursor-pointer" onClick={() => res && router.push(`/resources/${res.id}`)}>
                    <TableCell className="py-5 px-8">
                      <div className="flex items-center gap-4">
                        <div className="w-9 h-9 rounded-xl bg-white border flex items-center justify-center text-orange-600 shadow-sm"><HardDrive className="w-4 h-4" /></div>
                        <div>
                          <p className="text-sm font-black text-slate-800">{job.name}</p>
                          <p className="text-[9px] text-slate-400 font-bold uppercase flex items-center gap-1.5"><Layers className="w-3 h-3 opacity-50" /> {res?.name || '---'}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="rounded-full bg-white text-[9px] font-black uppercase h-5 border-slate-200 text-slate-500 px-3">{job.cycle}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <UserCircle className="w-3.5 h-3.5 text-slate-300" />
                        <span className="text-[11px] font-bold text-slate-700">{role?.name || 'Nicht zugewiesen'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {itProc ? (
                        <div className="flex items-center gap-2 text-primary hover:underline font-bold text-[10px]" onClick={(e) => { e.stopPropagation(); router.push(`/processhub/view/${itProc.id}`); }}>
                          <Workflow className="w-3.5 h-3.5" /> {itProc.title}
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-300 italic">Kein IT-Leitfaden</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right px-8">
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-[10px] font-black text-slate-800">{job.lastReviewDate || 'Offen'}</span>
                        <div className="flex items-center gap-1.5">
                          <div className={cn("w-1.5 h-1.5 rounded-full", job.lastReviewDate ? "bg-emerald-500" : "bg-red-500")} />
                          <span className="text-[8px] font-black uppercase text-slate-400">Revisionsprüfung</span>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredJobs.length === 0 && !isJobsLoading && (
                <TableRow>
                  <TableCell colSpan={5} className="py-20 text-center opacity-30 italic text-xs uppercase tracking-widest">
                    <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-500" /> Alles im grünen Bereich
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
