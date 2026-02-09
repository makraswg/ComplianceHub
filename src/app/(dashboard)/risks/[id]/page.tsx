"use client";

import { useState, useMemo, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ChevronLeft, 
  Loader2, 
  AlertTriangle, 
  ShieldAlert, 
  Activity, 
  ShieldCheck, 
  Workflow, 
  FileCheck, 
  Zap, 
  Target, 
  ArrowRight,
  ClipboardList,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Info,
  Layers,
  Server,
  Pencil,
  Trash2,
  Save,
  BrainCircuit,
  Settings2,
  History,
  Clock,
  User as UserIcon,
  BadgeCheck,
  Split,
  Plus
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePluggableCollection } from '@/hooks/data/use-pluggable-collection';
import { useSettings } from '@/context/settings-context';
import { Risk, Resource, RiskMeasure, RiskControl, Process, Task, PlatformUser } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';
import { usePlatformAuth } from '@/context/auth-context';
import { getRiskAdvice, RiskAdvisorOutput } from '@/ai/flows/risk-advisor-flow';
import { Label } from '@/components/ui/label';

export default function RiskDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = usePlatformAuth();
  const { dataSource, activeTenantId } = useSettings();
  const [mounted, setMounted] = useState(false);
  
  // AI State
  const [isAdvisorLoading, setIsAdvisorLoading] = useState(false);
  const [aiAdvice, setAiAdvice] = useState<RiskAdvisorOutput | null>(null);

  const { data: risks, isLoading: isRisksLoading, refresh: refreshRisks } = usePluggableCollection<Risk>('risks');
  const { data: resources } = usePluggableCollection<Resource>('resources');
  const { data: processes } = usePluggableCollection<Process>('processes');
  const { data: allMeasures } = usePluggableCollection<RiskMeasure>('riskMeasures');
  const { data: allControls } = usePluggableCollection<RiskControl>('riskControls');
  const { data: allTasks } = usePluggableCollection<Task>('tasks');
  const { data: pUsers } = usePluggableCollection<PlatformUser>('platformUsers');

  useEffect(() => { setMounted(true); }, []);

  const risk = useMemo(() => risks?.find(r => r.id === id), [risks, id]);
  const asset = useMemo(() => resources?.find(r => r.id === risk?.assetId), [resources, risk]);
  const process = useMemo(() => processes?.find(p => p.id === risk?.processId), [processes, risk]);
  
  const linkedMeasures = useMemo(() => 
    allMeasures?.filter(m => m.riskIds?.includes(id as string)) || [],
    [allMeasures, id]
  );

  const linkedControls = useMemo(() => {
    const measureIds = new Set(linkedMeasures.map(m => m.id));
    return allControls?.filter(c => measureIds.has(c.measureId)) || [];
  }, [allControls, linkedMeasures]);

  const riskTasks = useMemo(() => 
    allTasks?.filter(t => t.entityId === id && t.entityType === 'risk') || [],
    [allTasks, id]
  );

  const residualScore = useMemo(() => {
    if (!risk) return 0;
    const impact = risk.residualImpact || risk.impact;
    const probability = risk.residualProbability || risk.probability;
    return impact * probability;
  }, [risk]);

  const handleOpenAdvisor = async () => {
    if (!risk) return;
    setIsAdvisorLoading(true);
    try {
      const advice = await getRiskAdvice({
        title: risk.title,
        description: risk.description || '',
        category: risk.category,
        impact: risk.impact,
        probability: risk.probability,
        assetName: asset?.name,
        tenantId: activeTenantId,
        dataSource
      });
      setAiAdvice(advice);
    } catch (e) {
      toast({ variant: "destructive", title: "KI-Fehler", description: "Beratung konnte nicht geladen werden." });
    } finally {
      setIsAdvisorLoading(false);
    }
  };

  if (!mounted) return null;

  if (isRisksLoading) {
    return <div className="h-full flex flex-col items-center justify-center py-40 gap-4"><Loader2 className="w-12 h-12 animate-spin text-accent opacity-20" /><p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Analysiere Risikoszenario...</p></div>;
  }

  if (!risk) {
    return <div className="p-20 text-center space-y-4"><AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" /><h2 className="text-xl font-headline font-bold text-slate-900">Risiko nicht gefunden</h2><Button onClick={() => router.push('/risks')}>Zurück zum Inventar</Button></div>;
  }

  const bruteScore = risk.impact * risk.probability;

  return (
    <div className="space-y-6 pb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b pb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/risks')} className="h-10 w-10 text-slate-400 hover:bg-slate-100 rounded-xl">
            <ChevronLeft className="w-6 h-6" />
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-headline font-bold text-slate-900 dark:text-white uppercase tracking-tight">{risk.title}</h1>
              <Badge className={cn(
                "rounded-full px-2 h-5 text-[9px] font-black uppercase tracking-widest border-none shadow-sm",
                bruteScore >= 15 ? "bg-red-50 text-red-700" : bruteScore >= 8 ? "bg-orange-50 text-orange-700" : "bg-emerald-50 text-emerald-700"
              )}>{risk.category}</Badge>
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">ID: {risk.id} • Status: {risk.status}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-9 rounded-md font-bold text-xs px-6 border-indigo-200 text-indigo-700 hover:bg-indigo-50 shadow-sm" onClick={handleOpenAdvisor} disabled={isAdvisorLoading}>
            {isAdvisorLoading ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : <BrainCircuit className="w-3.5 h-3.5 mr-2" />} KI-Berater
          </Button>
          <Button size="sm" className="h-9 rounded-md font-bold text-xs px-6 bg-accent hover:bg-accent/90 text-white shadow-lg active:scale-95 transition-all">
            <Settings2 className="w-3.5 h-3.5 mr-2" /> Bearbeiten
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <aside className="lg:col-span-1 space-y-4">
          <Card className="rounded-2xl border shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b p-4 px-6">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400">Quantitative Analyse</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-8">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 shadow-inner flex flex-col items-center gap-1">
                  <span className="text-[8px] font-black uppercase text-slate-400">Brutto-Score</span>
                  <p className={cn(
                    "text-2xl font-black",
                    bruteScore >= 15 ? "text-red-600" : bruteScore >= 8 ? "text-orange-600" : "text-emerald-600"
                  )}>{bruteScore}</p>
                </div>
                <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100 shadow-inner flex flex-col items-center gap-1">
                  <span className="text-[8px] font-black uppercase text-emerald-600">Netto-Score</span>
                  <p className="text-2xl font-black text-emerald-700">{residualScore}</p>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Behandlungsstrategie</p>
                <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center gap-3 shadow-sm">
                  <Target className="w-5 h-5 text-indigo-600" />
                  <div>
                    <p className="text-xs font-bold text-indigo-900 uppercase">{risk.treatmentStrategy || 'Mitigate'}</p>
                    <p className="text-[8px] font-bold text-indigo-400 italic">Planung aktiv</p>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Risiko-Eigner</p>
                <div className="flex items-center gap-3 p-1">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-primary font-bold text-xs shadow-inner">
                    {risk.owner?.charAt(0) || 'R'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">{risk.owner}</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase">Verantwortlich</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border shadow-sm bg-white overflow-hidden">
            <CardHeader className="bg-accent/5 border-b border-accent/10 p-4 px-6 flex flex-row items-center justify-between">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-accent">Impact Context</CardTitle>
              <Activity className="w-3.5 h-3.5 text-accent" />
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-1">
                <p className="text-[9px] font-black uppercase text-slate-400">Betroffenes System</p>
                <div className="flex items-center gap-2 text-slate-900 font-bold text-sm cursor-pointer hover:text-primary transition-colors" onClick={() => asset && router.push(`/resources/${asset.id}`)}>
                  <Server className="w-4 h-4 text-indigo-500" /> {asset?.name || 'Global / Strategisch'}
                </div>
              </div>
              {process && (
                <div className="space-y-1 pt-2 border-t border-slate-100">
                  <p className="text-[9px] font-black uppercase text-slate-400">Gefährdeter Prozess</p>
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-sm cursor-pointer hover:text-primary transition-colors" onClick={() => router.push(`/processhub/view/${process.id}`)}>
                    <Workflow className="w-4 h-4 text-orange-500" /> {process.title}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </aside>

        <div className="lg:col-span-3">
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="bg-slate-100 p-1 h-11 rounded-xl border w-full justify-start gap-1 shadow-inner">
              <TabsTrigger value="overview" className="rounded-lg px-6 gap-2 text-[11px] font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <Target className="w-3.5 h-3.5 text-accent" /> Risiko-Szenario
              </TabsTrigger>
              <TabsTrigger value="mitigation" className="rounded-lg px-6 gap-2 text-[11px] font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Maßnahmen (TOM)
              </TabsTrigger>
              <TabsTrigger value="tasks" className="rounded-lg px-6 gap-2 text-[11px] font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <ClipboardList className="w-3.5 h-3.5 text-indigo-600" /> Aufgaben ({riskTasks.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6 animate-in fade-in duration-500">
              <Card className="rounded-2xl border shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
                <CardHeader className="bg-slate-50/50 border-b p-6">
                  <CardTitle className="text-sm font-bold">Analyse & Bewertung</CardTitle>
                </CardHeader>
                <CardContent className="p-8 space-y-10">
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Bedrohungsszenario</Label>
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium bg-slate-50 dark:bg-slate-950 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-inner italic">
                      "{risk.description || 'Keine fachliche Beschreibung hinterlegt.'}"
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-6">
                      <div className="space-y-1">
                        <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Brutto-Wahrscheinlichkeit</p>
                        <div className="flex items-center gap-2">
                          <Progress value={risk.probability * 20} className="h-2 rounded-full bg-slate-100 flex-1" />
                          <span className="text-xs font-black w-8 text-right">{risk.probability}/5</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Brutto-Schaden (Impact)</p>
                        <div className="flex items-center gap-2">
                          <Progress value={risk.impact * 20} className="h-2 rounded-full bg-slate-100 flex-1" />
                          <span className="text-xs font-black w-8 text-right">{risk.impact}/5</span>
                        </div>
                      </div>
                    </div>
                    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col justify-center">
                      <div className="flex items-center gap-3 mb-2">
                        <History className="w-4 h-4 text-slate-400" />
                        <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Governance Historie</p>
                      </div>
                      <p className="text-xs font-bold text-slate-700">Zuletzt geprüft: {risk.lastReviewDate ? new Date(risk.lastReviewDate).toLocaleDateString() : 'Ausstehend'}</p>
                      <Badge className="w-fit mt-2 bg-emerald-100 text-emerald-700 border-none text-[8px] font-black uppercase h-4 px-1.5">Regelkonform</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {aiAdvice && (
                <Card className="rounded-2xl border border-indigo-100 shadow-xl bg-indigo-50/50 overflow-hidden animate-in zoom-in-95 duration-500">
                  <CardHeader className="bg-primary/5 border-b border-indigo-100 p-6">
                    <div className="flex items-center gap-3">
                      <BrainCircuit className="w-6 h-6 text-primary" />
                      <CardTitle className="text-sm font-bold uppercase tracking-widest text-indigo-900">KI-Risikoanalyse</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="p-8 space-y-6">
                    <p className="text-sm text-slate-700 leading-relaxed italic">"{aiAdvice.assessment}"</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                      <div className="space-y-3">
                        <h4 className="text-[10px] font-black uppercase text-primary">Vorgeschlagene Maßnahmen</h4>
                        <div className="space-y-2">
                          {aiAdvice.measures.map((m, i) => (
                            <div key={i} className="flex items-start gap-2 text-[11px] font-bold text-slate-800 bg-white/50 p-2 rounded-lg border border-indigo-100">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" /> {m}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-3">
                        <h4 className="text-[10px] font-black uppercase text-red-600">Lückenanalyse</h4>
                        <p className="text-[11px] text-slate-600 leading-relaxed">{aiAdvice.gapAnalysis}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="mitigation" className="space-y-6 animate-in fade-in duration-500">
              <div className="grid grid-cols-1 gap-4">
                {linkedMeasures.map(measure => {
                  const measureControls = linkedControls.filter(c => c.measureId === measure.id);
                  const isEffective = measureControls.some(c => c.isEffective);
                  
                  return (
                    <Card key={measure.id} className="rounded-2xl border shadow-sm bg-white overflow-hidden group hover:border-emerald-300 transition-all">
                      <CardContent className="p-6 flex items-center justify-between">
                        <div className="flex items-center gap-5">
                          <div className={cn(
                            "w-12 h-12 rounded-xl flex items-center justify-center shadow-inner border",
                            isEffective ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-slate-50 text-slate-400"
                          )}>
                            <ShieldCheck className="w-6 h-6" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-slate-900">{measure.title}</h4>
                            <div className="flex items-center gap-3 mt-1">
                              <Badge variant="outline" className="text-[8px] font-black uppercase border-none bg-slate-50 text-slate-400">{measure.tomCategory}</Badge>
                              <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 uppercase">
                                <UserIcon className="w-3 h-3" /> {measure.owner}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-[8px] font-black text-slate-400 uppercase">Status</p>
                            <Badge className={cn(
                              "border-none rounded-full h-4 px-1.5 text-[7px] font-black uppercase",
                              isEffective ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-600"
                            )}>{isEffective ? 'Wirksam' : 'Prüfung offen'}</Badge>
                          </div>
                          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl group-hover:bg-slate-100" onClick={() => router.push(`/risks/measures?search=${measure.title}`)}>
                            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-primary transition-all" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
                {linkedMeasures.length === 0 && (
                  <div className="py-20 text-center border-2 border-dashed rounded-3xl opacity-20 italic text-xs space-y-4 shadow-inner">
                    <ShieldAlert className="w-12 h-12 mx-auto" />
                    <p className="text-sm font-black uppercase">Keine Maßnahmen verknüpft</p>
                    <Button variant="outline" size="sm" className="rounded-xl h-9" onClick={() => router.push('/risks/measures')}>Maßnahmenplan öffnen</Button>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="tasks" className="space-y-6 animate-in fade-in duration-500">
              <Card className="rounded-2xl border shadow-sm bg-white overflow-hidden">
                <CardHeader className="bg-slate-50/50 border-b p-6 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ClipboardList className="w-5 h-5 text-indigo-600" />
                    <div>
                      <CardTitle className="text-sm font-bold">Verknüpfte operative Aufgaben</CardTitle>
                      <CardDescription className="text-[10px] font-bold uppercase tracking-widest">Maßnahmenumsetzung & Monitoring</CardDescription>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" className="h-8 rounded-lg text-[10px] font-black uppercase gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50 shadow-sm" onClick={() => router.push('/tasks')}>
                    <Plus className="w-3.5 h-3.5" /> Neue Aufgabe
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-slate-100">
                    {riskTasks.map(t => (
                      <div key={t.id} className="p-4 px-8 hover:bg-slate-50 transition-all flex items-center justify-between group cursor-pointer" onClick={() => router.push('/tasks')}>
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-9 h-9 rounded-lg flex items-center justify-center text-white shadow-sm",
                            t.status === 'done' ? "bg-emerald-500" : t.priority === 'critical' ? "bg-red-600" : "bg-indigo-600"
                          )}>
                            <ClipboardList className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800">{t.title}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Badge variant="outline" className="text-[8px] font-black h-4 px-1.5 border-slate-200 shadow-sm uppercase">{t.status}</Badge>
                              <span className="text-[9px] text-slate-400 font-medium italic">Fällig: {t.dueDate || '∞'}</span>
                            </div>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-all" />
                      </div>
                    ))}
                    {riskTasks.length === 0 && (
                      <div className="py-16 text-center opacity-20 italic text-xs uppercase tracking-widest">Keine offenen Aufgaben für dieses Risiko.</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
