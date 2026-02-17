"use client";

import { useState, useMemo, useEffect, Suspense, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  ClipboardCheck, 
  Plus, 
  Search, 
  User as UserIcon, 
  CheckCircle2, 
  MoreHorizontal,
  Pencil, 
  Trash2, 
  Filter,
  Loader2,
  ShieldCheck,
  Save,
  Info,
  BadgeCheck,
  Target,
  Layers,
  Eye,
  ClipboardList,
  ChevronRight,
  PlusCircle,
  X,
  AlertTriangle
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { saveCollectionRecord, deleteCollectionRecord } from '@/app/actions/mysql-actions';
import { toast } from '@/hooks/use-toast';
import { Risk, RiskMeasure, Resource, RiskControl, Hazard, HazardMeasure, HazardMeasureRelation } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { usePluggableCollection } from '@/hooks/data/use-pluggable-collection';
import { useSettings } from '@/context/settings-context';
import { usePlatformAuth } from '@/context/auth-context';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AiFormAssistant } from '@/components/ai/form-assistant';
import { Input } from '@/components/ui/input';

function RiskMeasuresContent() {
  const { dataSource, activeTenantId } = useSettings();
  const { user: platformUser } = usePlatformAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const processedRiskParam = useRef<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedMeasure, setSelectedMeasure] = useState<RiskMeasure | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDesc] = useState('');
  const [owner, setOwner] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState<RiskMeasure['status']>('planned');
  const [isTom, setIsTom] = useState(false);
  const [tomCategory, setTomCategory] = useState<RiskMeasure['tomCategory']>('Zugriffskontrolle');
  const [selectedRiskIds, setSelectedRiskIds] = useState<string[]>([]);
  const [selectedResourceIds, setSelectedResourceIds] = useState<string[]>([]);
  const [catalogSearch, setCatalogSearch] = useState('');

  const { data: measures, isLoading, refresh } = usePluggableCollection<RiskMeasure>('riskMeasures');
  const { data: risks } = usePluggableCollection<Risk>('risks');
  const { data: resources } = usePluggableCollection<Resource>('resources');
  const { data: controls } = usePluggableCollection<RiskControl>('riskControls');
  const { data: hazards } = usePluggableCollection<Hazard>('hazards');
  const { data: hazardMeasures } = usePluggableCollection<HazardMeasure>('hazardMeasures');
  const { data: hazardMeasureRelations } = usePluggableCollection<HazardMeasureRelation>('hazardMeasureRelations');

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted || !risks) return;
    const riskParam = searchParams.get('riskId');
    if (!riskParam || processedRiskParam.current === riskParam) return;
    const exists = risks.some(r => r.id === riskParam);
    if (!exists) return;
    processedRiskParam.current = riskParam;
    resetForm();
    setSelectedRiskIds([riskParam]);
    setIsDialogOpen(true);
  }, [mounted, risks, searchParams]);

  const handleSave = async () => {
    if (!title || selectedRiskIds.length === 0) {
      toast({ variant: "destructive", title: "Fehler", description: "Titel und Risikobezug erforderlich." });
      return;
    }
    setIsSaving(true);
    const id = selectedMeasure?.id || `msr-${Math.random().toString(36).substring(2, 9)}`;
    const data: RiskMeasure = {
      ...selectedMeasure,
      id,
      title,
      description,
      owner,
      dueDate,
      status,
      isTom,
      tomCategory: isTom ? tomCategory : undefined,
      riskIds: selectedRiskIds,
      resourceIds: selectedResourceIds,
      effectiveness: selectedMeasure?.effectiveness || 3
    } as RiskMeasure;

    try {
      const res = await saveCollectionRecord('riskMeasures', id, data, dataSource);
      if (res.success) {
        toast({ title: selectedMeasure ? "Maßnahme aktualisiert" : "Maßnahme gespeichert" });
        setIsDialogOpen(false);
        refresh();
      }
    } finally {
      setIsSaving(false);
    }
  };

  const openEdit = (m: RiskMeasure) => {
    setSelectedMeasure(m);
    setTitle(m.title);
    setDesc(m.description || '');
    setOwner(m.owner || '');
    setDueDate(m.dueDate || '');
    setStatus(m.status);
    setIsTom(!!m.isTom);
    setTomCategory(m.tomCategory || 'Zugriffskontrolle');
    setSelectedRiskIds(m.riskIds || []);
    setSelectedResourceIds(m.resourceIds || []);
    setIsDialogOpen(true);
  };

  const filteredMeasures = useMemo(() => {
    if (!measures) return [];
    return measures.filter(m => {
      const matchSearch = m.title.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'all' || m.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [measures, search, statusFilter]);

  const resetForm = () => {
    setSelectedMeasure(null);
    setTitle('');
    setDesc('');
    setOwner(platformUser?.displayName || '');
    setDueDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    setStatus('planned');
    setIsTom(false);
    setSelectedRiskIds([]);
    setSelectedResourceIds([]);
    setCatalogSearch('');
  };

  const applyAiSuggestions = (s: any) => {
    if (s.title) setTitle(s.title);
    if (s.description) setDesc(s.description);
    if (s.tomCategory) setTomCategory(s.tomCategory);
    toast({ title: "KI-Vorschläge übernommen" });
  };

  const relatedHazardCodes = useMemo(() => {
    if (!risks || !hazards || selectedRiskIds.length === 0) return [];
    const hazardIds = new Set(risks.filter(r => selectedRiskIds.includes(r.id)).map(r => r.hazardId).filter(Boolean) as string[]);
    return hazards.filter(h => hazardIds.has(h.id)).map(h => h.code);
  }, [hazards, risks, selectedRiskIds]);

  const filteredCatalogMeasures = useMemo(() => {
    if (!hazardMeasures) return [] as HazardMeasure[];
    const searchValue = catalogSearch.toLowerCase();
    const measureMatchesSearch = (m: HazardMeasure) =>
      m.title.toLowerCase().includes(searchValue) ||
      m.code.toLowerCase().includes(searchValue) ||
      m.baustein.toLowerCase().includes(searchValue);

    if (!hazardMeasureRelations || relatedHazardCodes.length === 0) {
      return hazardMeasures.filter(measureMatchesSearch).slice(0, 200);
    }

    const allowedMeasureIds = new Set(
      hazardMeasureRelations
        .filter(rel => relatedHazardCodes.includes(rel.hazardCode))
        .map(rel => rel.measureId)
    );

    return hazardMeasures
      .filter(m => allowedMeasureIds.has(m.id))
      .filter(measureMatchesSearch)
      .slice(0, 200);
  }, [catalogSearch, hazardMeasures, hazardMeasureRelations, relatedHazardCodes]);

  const applyCatalogMeasure = (measure: HazardMeasure) => {
    setTitle(`${measure.code} ${measure.title}`);
    setDesc(prev => prev || `BSI-Maßnahme ${measure.code} (${measure.baustein}).`);
    setIsTom(true);
  };

  if (!mounted) return null;

  return (
    <div className="p-4 md:p-8 space-y-6 pb-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b pb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-500/10 text-emerald-600 flex items-center justify-center rounded-xl border border-emerald-500/10 shadow-sm transition-transform hover:scale-105">
            <ClipboardCheck className="w-6 h-6" />
          </div>
          <div>
            <Badge className="mb-1 rounded-full px-2 py-0 bg-emerald-100 text-emerald-700 text-[9px] font-bold border-none uppercase tracking-wider">Mitigation Plan</Badge>
            <h1 className="text-2xl font-headline font-bold text-slate-900 dark:text-white uppercase tracking-tight">Maßnahmenplan (TOM)</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Strategische Absicherung und Risikominderung (Art. 32 DSGVO).</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-9 rounded-md font-bold text-xs px-6 border-slate-200 hover:bg-slate-50" onClick={() => router.push('/risks/controls')}>
            <ShieldCheck className="w-3.5 h-3.5 mr-2 text-primary" /> Kontroll-Monitoring
          </Button>
          <Button size="sm" className="h-9 rounded-md font-bold text-xs px-6 bg-accent hover:bg-accent/90 text-white shadow-lg active:scale-95 transition-all" onClick={() => { resetForm(); setIsDialogOpen(true); }}>
            <Plus className="w-3.5 h-3.5 mr-2" /> Maßnahme planen
          </Button>
        </div>
      </div>

      <div className="flex flex-row items-center gap-3 bg-white dark:bg-slate-900 p-2 rounded-xl border shadow-sm">
        <div className="relative flex-1 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-focus-within:text-emerald-600 transition-colors" />
          <Input 
            placeholder="Maßnahme suchen..." 
            className="pl-9 h-9 rounded-lg border-slate-200 bg-slate-50/50 focus:bg-white transition-all shadow-none text-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-md border border-slate-200 h-9 shrink-0">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="border-none shadow-none h-full rounded-sm bg-transparent text-[10px] font-bold min-w-[120px]">
              <Filter className="w-3 h-3 mr-1.5 text-slate-400" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">Alle Status</SelectItem>
              <SelectItem value="planned" className="text-xs">Geplant</SelectItem>
              <SelectItem value="active" className="text-xs">Aktiv</SelectItem>
              <SelectItem value="completed" className="text-xs">Umgesetzt</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600 opacity-20" />
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Lade Maßnahmenplan...</p>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                <TableHead className="py-4 px-6 font-bold text-[11px] text-slate-400 uppercase tracking-widest">Maßnahme / Typ</TableHead>
                <TableHead className="font-bold text-[11px] text-slate-400 text-center uppercase tracking-widest">Status</TableHead>
                <TableHead className="font-bold text-[11px] text-slate-400 uppercase tracking-widest">Verantwortung</TableHead>
                <TableHead className="font-bold text-[11px] text-slate-400 uppercase tracking-widest">Kontrollen</TableHead>
                <TableHead className="text-right px-6 font-bold text-[11px] text-slate-400 uppercase tracking-widest">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMeasures.map((m) => {
                const measureControls = controls?.filter(c => c.measureId === m.id) || [];
                const effective = measureControls.some(c => c.isEffective);
                return (
                  <TableRow key={m.id} className="group hover:bg-slate-50 transition-colors border-b last:border-0 cursor-pointer" onClick={() => router.push(`/risks/measures/${m.id}`)}>
                    <TableCell className="py-4 px-6">
                      <div>
                        <div className="font-bold text-sm text-slate-800 group-hover:text-emerald-600 transition-colors">{m.title}</div>
                        <div className="flex items-center gap-2 mt-1">
                          {m.isTom && <Badge className="bg-emerald-50 text-emerald-700 border-none rounded-full text-[8px] font-black h-4 px-1.5 uppercase">TOM: {m.tomCategory}</Badge>}
                          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">{m.riskIds?.length || 0} Risiken verknüpft</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className={cn(
                        "text-[9px] font-bold h-5 px-2 uppercase border-none",
                        m.status === 'completed' ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                      )}>{m.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-600">
                        <UserIcon className="w-3 h-3 text-slate-300" /> {m.owner}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {measureControls.length > 0 ? (
                          <Badge className={cn(
                            "border-none rounded-full font-black text-[9px] h-5 px-2",
                            effective ? "bg-emerald-500 text-white" : "bg-amber-100 text-amber-700"
                          )}>
                            {effective ? 'Wirksam' : 'Prüfung offen'}
                          </Badge>
                        ) : (
                          <span className="text-[10px] text-slate-300 italic">Keine Prüfung</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right px-6" onClick={e => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md opacity-0 group-hover:opacity-100 transition-all hover:bg-white shadow-sm" onClick={() => router.push(`/risks/measures/${m.id}`)}>
                          <Eye className="w-3.5 h-3.5 text-primary" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md opacity-0 group-hover:opacity-100 transition-all hover:bg-white shadow-sm" onClick={() => openEdit(m)}>
                          <Pencil className="w-3.5 h-3.5 text-slate-400" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 rounded-md hover:bg-slate-100 transition-all shadow-sm"><MoreHorizontal className="w-4 h-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-xl w-64 p-1 shadow-2xl border">
                            <DropdownMenuItem className="text-indigo-600 font-bold gap-2 py-2 text-xs" onSelect={() => router.push(`/risks/controls?measureId=${m.id}`)}>
                              <ShieldCheck className="w-3.5 h-3.5" /> Kontrolle planen
                            </DropdownMenuItem>
                            <DropdownMenuItem className="gap-2 font-bold py-2 text-xs" onSelect={() => openEdit(m)}><Pencil className="w-3.5 h-3.5 text-primary" /> Bearbeiten</DropdownMenuItem>
                            <DropdownMenuSeparator className="my-1" />
                            <DropdownMenuItem className="text-red-600 gap-2 font-bold py-2 text-xs" onSelect={() => { if(confirm("Maßnahme permanent löschen?")) deleteCollectionRecord('riskMeasures', m.id, dataSource).then(() => refresh()); }}>
                              <Trash2 className="w-3.5 h-3.5" /> Löschen</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-5xl w-[95vw] h-[90vh] md:h-auto md:max-h-[85vh] rounded-2xl p-0 overflow-hidden flex flex-col shadow-2xl border-none bg-white">
          <DialogHeader className="p-6 bg-slate-800 text-white shrink-0 pr-10">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center text-primary border border-white/10 shadow-lg">
                  <ClipboardCheck className="w-6 h-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <DialogTitle className="text-lg font-headline font-bold uppercase tracking-tight">{selectedMeasure ? 'Maßnahme aktualisieren' : 'Neue Maßnahme planen'}</DialogTitle>
                  <DialogDescription className="text-[10px] text-white/50 font-bold uppercase tracking-widest mt-0.5">Technisch-organisatorische Maßnahme (TOM)</DialogDescription>
                </div>
              </div>
              <AiFormAssistant formType="measure" currentData={{ title, description, owner, status }} onApply={applyAiSuggestions} />
            </div>
          </DialogHeader>
          
          <Tabs defaultValue="base" className="flex-1 flex flex-col min-h-0">
            <div className="px-6 bg-white border-b shrink-0">
              <TabsList className="h-12 bg-transparent gap-8 p-0">
                <TabsTrigger value="base" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary h-full px-0 text-[10px] font-black uppercase tracking-widest text-slate-400 data-[state=active]:text-primary transition-all">Stammdaten</TabsTrigger>
                <TabsTrigger value="assignment" className="rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 h-full px-0 text-[10px] font-black uppercase tracking-widest text-slate-400 data-[state=active]:text-indigo-600 transition-all">Verknüpfungen</TabsTrigger>
              </TabsList>
            </div>

            <ScrollArea className="flex-1 bg-slate-50/30">
              <div className="p-8 space-y-10">
                <TabsContent value="base" className="mt-0 space-y-8 animate-in fade-in slide-in-from-bottom-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2 md:col-span-2">
                      <Label required className="text-[10px] font-bold uppercase text-slate-400 ml-1 tracking-widest">Bezeichnung der Maßnahme</Label>
                      <Input value={title} onChange={e => setTitle(e.target.value)} className="rounded-xl h-12 font-bold border-slate-200 bg-white shadow-sm" placeholder="z.B. Zwei-Faktor-Authentifizierung für Cloud-Anwendungen..." />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase text-slate-400 ml-1 tracking-widest">Verantwortlicher (Strategisch)</Label>
                      <Input value={owner} onChange={e => setOwner(e.target.value)} className="rounded-xl h-11 border-slate-200 bg-white shadow-sm" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase text-slate-400 ml-1 tracking-widest">Status</Label>
                      <Select value={status} onValueChange={(v:any) => setStatus(v)}>
                        <SelectTrigger className="rounded-xl h-11 border-slate-200 bg-white shadow-sm"><SelectValue /></SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="planned">In Planung</SelectItem>
                          <SelectItem value="active">In Umsetzung</SelectItem>
                          <SelectItem value="completed">Vollständig implementiert</SelectItem>
                          <SelectItem value="on_hold">Pausiert</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="p-6 bg-white border rounded-2xl md:col-span-2 shadow-sm space-y-6">
                      <div className="flex items-center justify-between border-b pb-3">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-emerald-600" />
                          <h4 className="text-xs font-black uppercase text-slate-900 tracking-widest">TOM-Eigenschaften (Art. 32)</h4>
                        </div>
                        <Switch checked={isTom} onCheckedChange={setIsTom} className="data-[state=checked]:bg-emerald-600" />
                      </div>
                      {isTom && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 animate-in slide-in-from-top-2">
                          <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase text-slate-400 ml-1">Kategorie</Label>
                            <Select value={tomCategory} onValueChange={(v:any) => setTomCategory(v)}>
                              <SelectTrigger className="rounded-xl h-11 bg-slate-50 border-slate-200"><SelectValue /></SelectTrigger>
                              <SelectContent className="rounded-xl">
                                {['Zugriffskontrolle', 'Zutrittskontrolle', 'Weitergabekontrolle', 'Verschlüsselung', 'Verfügbarkeitskontrolle', 'Trennungskontrolle', 'Belastbarkeit', 'Wiederherstellbarkeit'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-xl border border-emerald-100 self-end">
                            <Info className="w-4 h-4 text-emerald-600 shrink-0" />
                            <p className="text-[9px] text-emerald-700 font-bold leading-relaxed italic">
                              Diese Einstufung dient als Basis für den automatisierten DSGVO-Bericht (Art. 30/32).
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label className="text-[10px] font-bold uppercase text-slate-400 ml-1 tracking-widest">Strategische Beschreibung & Zielsetzung</Label>
                      <Textarea value={description} onChange={e => setDesc(e.target.value)} className="rounded-2xl min-h-[120px] p-5 border-slate-200 text-xs font-medium bg-white shadow-inner leading-relaxed" placeholder="Was soll mit dieser Maßnahme erreicht werden?..." />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="assignment" className="mt-0 space-y-10 animate-in fade-in slide-in-from-bottom-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <Label className="text-[10px] font-black uppercase text-accent tracking-widest flex items-center gap-2 ml-1">
                        <Target className="w-3.5 h-3.5" /> Risikobezug ({selectedRiskIds.length})
                      </Label>
                      <div className="p-2 rounded-2xl border bg-white shadow-inner">
                        <ScrollArea className="h-64">
                          <div className="space-y-1">
                            {risks?.filter(r => activeTenantId === 'all' || r.tenantId === activeTenantId).map(r => (
                              <div key={r.id} className={cn(
                                "flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border",
                                selectedRiskIds.includes(r.id) ? "bg-orange-50 border-orange-200 shadow-sm" : "bg-white border-transparent hover:bg-slate-50"
                              )} onClick={() => setSelectedRiskIds(prev => selectedRiskIds.includes(r.id) ? prev.filter(id => id !== r.id) : [...prev, r.id])}>
                                <Checkbox checked={selectedRiskIds.includes(r.id)} className="rounded-md" />
                                <div className="min-w-0 flex-1">
                                  <p className="text-[11px] font-bold text-slate-800 truncate">{r.title}</p>
                                  <p className="text-[8px] font-black uppercase text-slate-400 mt-0.5">{r.category}</p>
                                </div>
                              </div>
                            ))}
                            {(!risks || risks.length === 0) && (
                              <div className="py-10 text-center opacity-30 italic text-[10px] uppercase font-bold">Keine Risiken definiert</div>
                            )}
                          </div>
                        </ScrollArea>
                      </div>
                    </div>

                    <div className="space-y-4 md:col-span-2">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <Label className="text-[10px] font-black uppercase text-slate-600 tracking-widest flex items-center gap-2 ml-1">
                          <ClipboardList className="w-3.5 h-3.5" /> BSI-Maßnahmenkatalog
                        </Label>
                        <div className="flex items-center gap-2 text-[9px] font-bold text-slate-400 uppercase">
                          {relatedHazardCodes.length > 0 ? `Gefährdungen: ${relatedHazardCodes.join(', ')}` : 'Keine Gefährdung verknüpft'}
                        </div>
                      </div>
                      <div className="p-4 rounded-2xl border bg-white shadow-inner space-y-3">
                        <Input
                          placeholder="BSI-Maßnahme suchen (Code, Titel, Baustein)..."
                          value={catalogSearch}
                          onChange={(e) => setCatalogSearch(e.target.value)}
                          className="h-9 text-xs rounded-lg border-slate-200"
                        />
                        <ScrollArea className="h-64">
                          <div className="space-y-1">
                            {filteredCatalogMeasures.map(measure => (
                              <div key={measure.id} className="flex items-center gap-3 p-3 rounded-xl border border-transparent hover:border-slate-200 hover:bg-slate-50 transition-all">
                                <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center text-[9px] font-black">{measure.code}</div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-[11px] font-bold text-slate-800 truncate">{measure.title}</p>
                                  <p className="text-[8px] font-black uppercase text-slate-400 mt-0.5">Baustein: {measure.baustein}</p>
                                </div>
                                <Button variant="outline" size="sm" className="h-8 px-3 text-[10px] font-black uppercase" onClick={() => applyCatalogMeasure(measure)}>
                                  Übernehmen
                                </Button>
                              </div>
                            ))}
                            {filteredCatalogMeasures.length === 0 && (
                              <div className="py-10 text-center opacity-40 italic text-[10px] uppercase font-bold">Keine BSI-Maßnahmen gefunden</div>
                            )}
                          </div>
                        </ScrollArea>
                        <p className="text-[9px] text-slate-400 font-medium">
                          Tipp: Verknüpfen Sie zuerst das Risiko. Dann werden die passenden BSI-Maßnahmen automatisch gefiltert.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <Label className="text-[10px] font-black uppercase text-primary tracking-widest flex items-center gap-2 ml-1">
                        <Layers className="w-3.5 h-3.5" /> Systembezug ({selectedResourceIds.length})
                      </Label>
                      <div className="p-2 rounded-2xl border bg-white shadow-inner">
                        <ScrollArea className="h-64">
                          <div className="space-y-1">
                            {resources?.filter(res => activeTenantId === 'all' || res.tenantId === activeTenantId || res.tenantId === 'global').map(res => (
                              <div key={res.id} className={cn(
                                "flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border",
                                selectedResourceIds.includes(res.id) ? "bg-primary/5 border-primary/20 shadow-sm" : "bg-white border-transparent hover:bg-slate-50"
                              )} onClick={() => setSelectedResourceIds(prev => selectedResourceIds.includes(res.id) ? prev.filter(id => id !== res.id) : [...prev, res.id])}>
                                <Checkbox checked={selectedResourceIds.includes(res.id)} className="rounded-md" />
                                <div className="min-w-0 flex-1">
                                  <p className="text-[11px] font-bold text-slate-800 truncate">{res.name}</p>
                                  <p className="text-[8px] font-black uppercase text-slate-400 mt-0.5">{res.assetType}</p>
                                </div>
                              </div>
                            ))}
                            {(!resources || resources.length === 0) && (
                              <div className="py-10 text-center opacity-30 italic text-[10px] uppercase font-bold">Keine Ressourcen definiert</div>
                            )}
                          </div>
                        </ScrollArea>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </div>
            </ScrollArea>

            <DialogFooter className="p-4 bg-slate-50 border-t shrink-0 flex flex-col-reverse sm:flex-row gap-2">
              <Button variant="ghost" size="sm" onClick={() => setIsDialogOpen(false)} className="rounded-xl font-bold text-[10px] px-10 h-11 uppercase tracking-widest text-slate-400 hover:bg-white transition-all">Abbrechen</Button>
              <Button size="sm" onClick={handleSave} disabled={isSaving || !title || selectedRiskIds.length === 0} className="rounded-xl h-11 px-16 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] uppercase shadow-lg shadow-emerald-200/50 gap-2 transition-all active:scale-95">
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Maßnahme sichern
              </Button>
            </DialogFooter>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function RiskMeasuresPage() {
  return (
    <Suspense fallback={<div className="p-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-600 opacity-20" /></div>}>
      <RiskMeasuresContent />
    </Suspense>
  );
}
