"use client";

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ShieldAlert, 
  Search, 
  Loader2, 
  RefreshCw, 
  Zap, 
  CheckCircle2, 
  AlertTriangle,
  Info,
  ChevronRight,
  ShieldCheck,
  BrainCircuit,
  Settings2,
  Lock,
  ArrowRight,
  Activity
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { usePluggableCollection } from '@/hooks/data/use-pluggable-collection';
import { useSettings } from '@/context/settings-context';
import { runIamAudit } from '@/ai/flows/iam-audit-flow';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { useRouter } from 'next/navigation';
import { Separator } from '@/components/ui/separator';

export default function IamAuditPage() {
  const router = useRouter();
  const { dataSource, activeTenantId } = useSettings();
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditResult, setAuditResult] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  const { data: users } = usePluggableCollection<any>('users');
  const { data: assignments } = usePluggableCollection<any>('assignments');
  const { data: resources } = usePluggableCollection<any>('resources');
  const { data: entitlements } = usePluggableCollection<any>('entitlements');
  const { data: criteria } = usePluggableCollection<any>('aiAuditCriteria');

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleStartAudit = async () => {
    if (!users || !assignments || !criteria) {
      toast({ variant: "destructive", title: "Daten fehlen", description: "Es konnten keine Audit-Daten geladen werden." });
      return;
    }
    
    setIsAuditing(true);
    try {
      const activeCriteria = criteria.filter((c: any) => c.enabled);
      const res = await runIamAudit({
        users: users.filter(u => activeTenantId === 'all' || u.tenantId === activeTenantId),
        assignments: assignments.filter(a => activeTenantId === 'all' || a.tenantId === activeTenantId),
        resources: resources || [],
        entitlements: entitlements || [],
        criteria: activeCriteria,
        dataSource
      });
      setAuditResult(res);
      toast({ title: "Audit abgeschlossen", description: "Die Ergebnisse liegen bereit." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Audit-Fehler", description: e.message });
    } finally {
      setIsAuditing(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="space-y-10 pb-20">
      {/* Header Area with Gradient */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-200 dark:border-slate-800 pb-8 bg-gradient-to-r from-transparent via-slate-50/50 to-transparent">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-indigo-500/10 text-indigo-600 flex items-center justify-center rounded-2xl border-2 border-indigo-500/20 shadow-xl shadow-indigo-500/5 transition-transform hover:scale-105 duration-500">
            <BrainCircuit className="w-9 h-9" />
          </div>
          <div>
            <Badge className="mb-2 rounded-full px-3 py-0 bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase tracking-widest border-none">AI Governance</Badge>
            <h1 className="text-4xl font-headline font-bold tracking-tight text-slate-900 dark:text-white uppercase">KI Identity Audit</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Automatisierte Analyse der Berechtigungs-Integrität für {activeTenantId === 'all' ? 'alle Standorte' : activeTenantId}.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" className="h-11 rounded-2xl font-bold uppercase text-[10px] tracking-widest px-6 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all active:scale-95" onClick={() => router.push('/settings/ai/audit-criteria')}>
            <Settings2 className="w-4 h-4 mr-2 text-primary" /> Kriterien
          </Button>
          <Button onClick={handleStartAudit} disabled={isAuditing || !users} className="h-11 rounded-2xl font-bold uppercase text-[10px] tracking-widest px-8 bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 dark:shadow-none transition-all gap-2 active:scale-95">
            {isAuditing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5 fill-current" />}
            Audit jetzt starten
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Context Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="rounded-[2.5rem] border-none shadow-xl shadow-slate-200/50 dark:shadow-none bg-slate-900 text-white overflow-hidden">
            <CardHeader className="border-b border-white/10 py-6 px-8 bg-slate-950/50">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Prüf-Kontext</CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="space-y-1">
                <p className="text-[9px] font-black uppercase text-slate-500 tracking-tighter">Analysierte Nutzer</p>
                <p className="text-4xl font-headline font-bold">{users?.length || 0}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[9px] font-black uppercase text-slate-500 tracking-tighter">Aktive Zuweisungen</p>
                <p className="text-4xl font-headline font-bold">{assignments?.filter((a: any) => a.status === 'active').length || 0}</p>
              </div>
              <Separator className="bg-white/5" />
              <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-inner">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase text-slate-300">Methodik</p>
                    <p className="text-[9px] text-slate-500 italic uppercase">Principle of Least Privilege</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="p-6 rounded-[2rem] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm">
            <p className="text-[10px] text-indigo-700 dark:text-indigo-400 font-bold uppercase tracking-widest flex items-center gap-2 mb-3">
              <Info className="w-4 h-4" /> Hinweis
            </p>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed italic">
              Der KI-Assistent erkennt komplexe Muster wie "Privilege Creep" automatisch über Mandantengrenzen hinweg.
            </p>
          </div>
        </div>

        {/* Results Area */}
        <div className="lg:col-span-3">
          {!auditResult && !isAuditing && (
            <div className="py-48 text-center border-4 border-dashed rounded-[3rem] bg-slate-50/50 dark:bg-slate-900/20 space-y-6 animate-in fade-in duration-1000">
              <div className="w-24 h-24 bg-white dark:bg-slate-800 rounded-3xl flex items-center justify-center mx-auto shadow-xl border border-slate-100 dark:border-slate-700">
                <ShieldCheck className="w-12 h-12 text-slate-200 dark:text-slate-600" />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-black uppercase text-slate-400 tracking-widest">Bereit zur Analyse</p>
                <p className="text-xs text-slate-400 uppercase font-bold max-w-xs mx-auto">Starten Sie den Scan, um potenzielle Compliance-Lücken aufzudecken.</p>
              </div>
            </div>
          )}

          {isAuditing && (
            <div className="py-48 text-center space-y-8 animate-in fade-in zoom-in-95">
              <div className="relative w-24 h-24 mx-auto">
                <Loader2 className="w-24 h-24 animate-spin text-indigo-600 opacity-20" />
                <Zap className="absolute inset-0 m-auto w-10 h-10 text-indigo-600 animate-pulse fill-current" />
              </div>
              <div className="space-y-3">
                <p className="text-lg font-headline font-bold text-indigo-600 uppercase tracking-widest">KI-Engine arbeitet...</p>
                <div className="max-w-xs mx-auto space-y-2">
                  <Progress value={45} className="h-2 rounded-full bg-slate-100 dark:bg-slate-800" />
                  <p className="text-[9px] text-slate-400 uppercase font-black">Analysiere Berechtigungs-Hierarchien</p>
                </div>
              </div>
            </div>
          )}

          {auditResult && (
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <Card className="rounded-[3rem] border-none shadow-2xl shadow-slate-200/50 dark:shadow-none overflow-hidden bg-white dark:bg-slate-900">
                <CardHeader className={cn(
                  "py-12 text-white px-12 flex flex-col sm:flex-row sm:items-center justify-between gap-8 transition-colors duration-1000",
                  auditResult.score > 80 ? "bg-emerald-600" : auditResult.score > 50 ? "bg-accent" : "bg-red-600"
                )}>
                  <div>
                    <CardTitle className="text-2xl font-headline font-bold uppercase tracking-widest drop-shadow-md">IAM Health Score</CardTitle>
                    <p className="text-[10px] uppercase font-black opacity-80 mt-1 tracking-widest">Compliance Status der Plattform</p>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="h-20 w-px bg-white/20 hidden sm:block" />
                    <div className="text-8xl font-headline font-black drop-shadow-2xl">{auditResult.score}%</div>
                  </div>
                </CardHeader>
                <CardContent className="p-12">
                  <div className="space-y-10">
                    <div className="p-8 rounded-[2rem] bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 relative overflow-hidden group">
                      <div className="absolute top-0 left-0 w-2 h-full bg-indigo-500 transition-all group-hover:w-3" />
                      <p className="text-lg font-medium italic text-slate-700 dark:text-slate-300 leading-relaxed pl-4">
                        "{auditResult.summary}"
                      </p>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between text-xs font-black uppercase tracking-widest text-slate-400">
                        <span>Compliance Level</span>
                        <span className={cn(
                          "font-black",
                          auditResult.score > 80 ? "text-emerald-600" : auditResult.score > 50 ? "text-accent" : "text-red-600"
                        )}>
                          {auditResult.score > 80 ? 'EXZELLENT' : auditResult.score > 50 ? 'HANDLUNGSBEDARF' : 'KRITISCH'}
                        </span>
                      </div>
                      <Progress value={auditResult.score} className="h-4 rounded-full bg-slate-100 dark:bg-slate-800" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-8">
                <div className="flex items-center justify-between px-2">
                  <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2 text-slate-500">
                    <AlertTriangle className="w-4 h-4 text-accent" /> Audit Feststellungen ({auditResult.findings?.length || 0})
                  </h3>
                </div>
                <div className="grid grid-cols-1 gap-6">
                  {auditResult.findings?.map((f: any, i: number) => (
                    <div key={i} className="p-8 bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row gap-8 hover:scale-[1.01] transition-all group active:scale-[0.99]">
                      <div className="shrink-0 flex flex-col items-center gap-4">
                        <Badge className={cn(
                          "rounded-full text-[10px] font-black h-7 px-4 border-none shadow-md",
                          f.severity === 'critical' ? "bg-red-600" : f.severity === 'high' ? "bg-accent" : "bg-indigo-600"
                        )}>
                          {f.severity.toUpperCase()}
                        </Badge>
                        <div className="w-16 h-16 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center shadow-inner group-hover:rotate-6 transition-transform duration-500 border border-slate-100 dark:border-slate-700">
                          <ShieldAlert className={cn("w-8 h-8", f.severity === 'critical' ? "text-red-600" : "text-slate-400")} />
                        </div>
                      </div>
                      <div className="flex-1 space-y-5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-4 border-slate-50 dark:border-slate-800">
                          <h4 className="font-headline font-bold text-xl text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors">{f.finding}</h4>
                          <span className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded">ID: {f.entityId}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs font-bold text-slate-500 uppercase tracking-tight">
                          <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-primary font-black">
                            {f.entityName?.charAt(0)}
                          </div>
                          <span>Betroffene Identität: <span className="text-slate-900 dark:text-slate-100">{f.entityName}</span></span>
                        </div>
                        <div className="p-6 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-3xl border border-indigo-100/50 dark:border-indigo-800/50 relative overflow-hidden">
                          <div className="absolute top-0 left-0 w-1 h-full bg-indigo-400" />
                          <p className="text-[10px] font-black uppercase text-indigo-700 dark:text-indigo-400 flex items-center gap-2 mb-3 tracking-widest">
                            <Zap className="w-3.5 h-3.5 fill-current" /> Empfehlung der KI
                          </p>
                          <p className="text-sm text-indigo-900 dark:text-indigo-200 font-medium leading-relaxed italic">{f.recommendation}</p>
                        </div>
                      </div>
                      <div className="shrink-0 flex items-center justify-center">
                        <Button variant="outline" size="icon" className="w-14 h-14 rounded-3xl hover:bg-indigo-600 hover:text-white transition-all shadow-md active:scale-90" onClick={() => router.push(`/users?search=${f.entityName}`)}>
                          <ArrowRight className="w-6 h-6" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
