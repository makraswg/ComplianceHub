
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
  ArrowRight
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
    if (!users || !assignments || !criteria) return;
    
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
      toast({ title: "Audit abgeschlossen" });
    } finally {
      setIsAuditing(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="space-y-8 pb-20">
      <div className="flex items-center justify-between border-b pb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-500/10 text-indigo-600 flex items-center justify-center border-2 border-indigo-500/20">
            <BrainCircuit className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight uppercase font-headline">KI Identity Audit</h1>
            <p className="text-sm text-muted-foreground mt-1">Automatische Identifizierung von Missständen und Risiken im IAM.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-10 font-bold uppercase text-[10px] rounded-none" onClick={() => router.push('/settings/ai/audit-criteria')}>
            <Settings2 className="w-3.5 h-3.5 mr-2" /> Audit-Kriterien
          </Button>
          <Button onClick={handleStartAudit} disabled={isAuditing || !users} className="h-10 font-bold uppercase text-[10px] rounded-none bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
            {isAuditing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 fill-current" />}
            Audit jetzt starten
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <Card className="rounded-none border shadow-none bg-slate-900 text-white">
            <CardHeader className="border-b border-white/10 py-4">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Prüf-Kontext</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="flex justify-between text-[10px] font-bold border-b border-white/5 pb-2">
                <span className="text-slate-400 uppercase">Analysierte Nutzer:</span>
                <span>{users?.length || 0}</span>
              </div>
              <div className="flex justify-between text-[10px] font-bold border-b border-white/5 pb-2">
                <span className="text-slate-400 uppercase">Aktive Zuweisungen:</span>
                <span>{assignments?.filter((a: any) => a.status === 'active').length || 0}</span>
              </div>
              <div className="flex justify-between text-[10px] font-bold pb-2">
                <span className="text-slate-400 uppercase">Prüf-Kriterien:</span>
                <span>{criteria?.filter((c: any) => c.enabled).length || 0}</span>
              </div>
            </CardContent>
          </Card>

          <div className="p-4 border-2 border-dashed rounded-none bg-muted/5 space-y-4">
            <div className="flex items-center gap-2 text-indigo-600">
              <Info className="w-4 h-4" />
              <h4 className="text-[10px] font-black uppercase tracking-widest">Audit Methodik</h4>
            </div>
            <p className="text-[10px] text-muted-foreground leading-relaxed italic">
              Der Governance Assistent prüft Ihre Daten gegen vordefinierte Best-Practices wie "Least Privilege" und "Separation of Duties". 
              Er erkennt Muster von Berechtigungsanhäufungen, die bei manuellen Stichproben oft unentdeckt bleiben.
            </p>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-8">
          {!auditResult && !isAuditing && (
            <div className="py-40 text-center border-2 border-dashed bg-slate-50">
              <ShieldCheck className="w-12 h-12 text-slate-200 mx-auto mb-4" />
              <p className="text-sm font-bold uppercase text-slate-400 tracking-widest">Bereit für Analyse. Starten Sie das Audit oben rechts.</p>
            </div>
          )}

          {isAuditing && (
            <div className="py-40 text-center space-y-6">
              <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mx-auto" />
              <div className="space-y-2">
                <p className="text-sm font-black uppercase text-indigo-600 tracking-widest animate-pulse">KI-Engine arbeitet...</p>
                <p className="text-[10px] text-muted-foreground uppercase font-bold">Analysiere Muster und Berechtigungs-Hierarchien</p>
              </div>
            </div>
          )}

          {auditResult && (
            <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
              <Card className="rounded-none border shadow-none overflow-hidden">
                <CardHeader className={cn(
                  "py-6 text-white flex flex-row items-center justify-between",
                  auditResult.score > 80 ? "bg-emerald-600" : auditResult.score > 50 ? "bg-orange-500" : "bg-red-600"
                )}>
                  <div>
                    <CardTitle className="text-sm font-black uppercase tracking-widest">Gesamt-Compliance-Score</CardTitle>
                    <p className="text-[10px] uppercase font-bold opacity-80 mt-1">Basiert auf gewichteten Audit-Feststellungen</p>
                  </div>
                  <div className="text-5xl font-black">{auditResult.score}%</div>
                </CardHeader>
                <CardContent className="p-8 bg-white">
                  <div className="space-y-4">
                    <p className="text-sm italic text-slate-600 leading-relaxed">"{auditResult.summary}"</p>
                    <Progress value={auditResult.score} className="h-2 rounded-none" />
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-500" /> Audit Feststellungen ({auditResult.findings.length})
                </h3>
                <div className="grid grid-cols-1 gap-4">
                  {auditResult.findings.map((f: any, i: number) => (
                    <div key={i} className="p-6 border-2 bg-white flex flex-col md:flex-row gap-6 hover:border-indigo-200 transition-all group">
                      <div className="shrink-0 flex flex-col items-center gap-2">
                        <Badge className={cn(
                          "rounded-none text-[8px] font-black h-5 px-2 border-none",
                          f.severity === 'critical' ? "bg-red-600" : f.severity === 'high' ? "bg-orange-600" : "bg-blue-600"
                        )}>
                          {f.severity.toUpperCase()}
                        </Badge>
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                          <ShieldAlert className={cn("w-5 h-5", f.severity === 'critical' ? "text-red-600" : "text-slate-400")} />
                        </div>
                      </div>
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-sm text-slate-900 group-hover:text-indigo-600 transition-colors">{f.finding}</h4>
                          <span className="text-[9px] font-black uppercase text-slate-400">ID: {f.entityId}</span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed italic border-l-2 border-slate-100 pl-3">
                          Betrifft: <span className="font-bold">{f.entityName}</span> | Regel: {f.criteriaMatched}
                        </p>
                        <div className="p-3 bg-blue-50 border border-blue-100 rounded-none">
                          <p className="text-[9px] font-black uppercase text-blue-700 flex items-center gap-2">
                            <Zap className="w-3 h-3 fill-current" /> Empfehlung der KI:
                          </p>
                          <p className="text-[10px] text-blue-900 mt-1 font-bold">{f.recommendation}</p>
                        </div>
                      </div>
                      <div className="shrink-0 flex items-center">
                        <Button variant="ghost" size="icon" className="rounded-none hover:bg-indigo-50" onClick={() => router.push(`/users?search=${f.entityName}`)}>
                          <ArrowRight className="w-4 h-4 text-indigo-600" />
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
