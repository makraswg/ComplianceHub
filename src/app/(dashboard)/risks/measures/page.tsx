
"use client";

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  ClipboardCheck, 
  Plus, 
  Search, 
  Calendar, 
  User as UserIcon, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  MoreHorizontal,
  Pencil,
  Trash2,
  ChevronRight,
  Filter,
  Loader2,
  ArrowRight,
  ShieldAlert,
  AlertTriangle,
  X,
  FileCheck,
  Scale,
  Shield,
  Layers,
  Info,
  Save,
  HelpCircle,
  CalendarCheck,
  Link as LinkIcon,
  BadgeCheck,
  Activity
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { usePluggableCollection } from '@/hooks/data/use-pluggable-collection';
import { useSettings } from '@/context/settings-context';
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
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { saveCollectionRecord, deleteCollectionRecord } from '@/app/actions/mysql-actions';
import { toast } from '@/hooks/use-toast';
import { Risk, RiskMeasure, Resource } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { AiFormAssistant } from '@/components/ai/form-assistant';

export default function RiskMeasuresPage() {
  const { dataSource, activeTenantId } = useSettings();
  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState('');
  const [isMeasureDialogOpen, setIsMeasureDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedMeasure, setSelectedMeasure] = useState<RiskMeasure | null>(null);

  const [selectedRiskIds, setSelectedRiskIds] = useState<string[]>([]);
  const [selectedResourceIds, setSelectedResourceIds] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [owner, setOwner] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState<RiskMeasure['status']>('planned');
  const [effectiveness, setEffectiveness] = useState('3');
  const [description, setDescription] = useState('');
  const [isTom, setIsTom] = useState(false);
  const [tomCategory, setTomCategory] = useState<RiskMeasure['tomCategory']>('Zugriffskontrolle');
  const [isEffective, setIsEffective] = useState(false);
  const [checkType, setCheckType] = useState<RiskMeasure['checkType']>('Review');
  const [lastCheckDate, setLastCheckDate] = useState('');
  const [evidenceDetails, setEvidenceDetails] = useState('');

  const { data: measures, isLoading: isMeasuresLoading, refresh } = usePluggableCollection<RiskMeasure>('riskMeasures');
  const { data: risks } = usePluggableCollection<Risk>('risks');
  const { data: resources } = usePluggableCollection<Resource>('resources');

  useEffect(() => { setMounted(true); }, []);

  const handleSaveMeasure = async () => {
    if (!title || selectedRiskIds.length === 0) {
      toast({ variant: "destructive", title: "Fehler", description: "Bitte Titel und Risikobezug wählen." });
      return;
    }
    setIsSaving(true);
    const id = selectedMeasure?.id || `msr-${Math.random().toString(36).substring(2, 9)}`;
    const measureData: RiskMeasure = {
      ...selectedMeasure,
      id,
      riskIds: selectedRiskIds,
      resourceIds: selectedResourceIds,
      title,
      owner,
      dueDate,
      status,
      effectiveness: parseInt(effectiveness),
      description,
      isTom,
      tomCategory: isTom ? tomCategory : undefined,
      isEffective,
      checkType,
      lastCheckDate,
      evidenceDetails
    };

    try {
      const res = await saveCollectionRecord('riskMeasures', id, measureData, dataSource);
      if (res.success) {
        toast({ title: "Kontrolle gespeichert" });
        setIsMeasureDialogOpen(false);
        resetForm();
        refresh();
      }
    } finally {
      setIsSaving(false);
    }
  }

  const resetForm = () => {
    setSelectedMeasure(null);
    setSelectedRiskIds([]);
    setSelectedResourceIds([]);
    setTitle('');
    setOwner('');
    setDueDate('');
    setStatus('planned');
    setEffectiveness('3');
    setDescription('');
    setIsTom(false);
    setIsEffective(false);
    setCheckType('Review');
    setLastCheckDate('');
    setEvidenceDetails('');
  };

  const openEdit = (m: RiskMeasure) => {
    setSelectedMeasure(m);
    setSelectedRiskIds(m.riskIds || []);
    setSelectedResourceIds(m.resourceIds || []);
    setTitle(m.title);
    setOwner(m.owner);
    setDueDate(m.dueDate || '');
    setStatus(m.status);
    setEffectiveness(m.effectiveness.toString());
    setDescription(m.description || '');
    setIsTom(!!m.isTom);
    setTomCategory(m.tomCategory || 'Zugriffskontrolle');
    setIsEffective(!!m.isEffective);
    setCheckType(m.checkType || 'Review');
    setLastCheckDate(m.lastCheckDate || '');
    setEvidenceDetails(m.evidenceDetails || '');
    setIsMeasureDialogOpen(true);
  };

  const applyAiSuggestions = (s: any) => {
    if (s.title) setTitle(s.title);
    if (s.description) setDescription(s.description);
    if (s.effectiveness) setEffectiveness(String(s.effectiveness));
    if (s.tomCategory) setTomCategory(s.tomCategory);
    toast({ title: "KI-Modell angewendet" });
  };

  const filteredMeasures = useMemo(() => {
    if (!measures) return [];
    return measures.filter(m => m.title.toLowerCase().includes(search.toLowerCase()) || m.owner.toLowerCase().includes(search.toLowerCase()));
  }, [measures, search]);

  if (!mounted) return null;

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b pb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-500/10 text-emerald-600 flex items-center justify-center rounded-xl border border-emerald-500/10 shadow-sm transition-transform hover:scale-105">
            <ClipboardCheck className="w-6 h-6" />
          </div>
          <div>
            <Badge className="mb-1 rounded-full px-2 py-0 bg-emerald-100 text-emerald-700 text-[9px] font-bold border-none uppercase tracking-wider">Compliance Control</Badge>
            <h1 className="text-2xl font-headline font-bold text-slate-900 dark:text-white uppercase tracking-tight">Maßnahmen & Kontrollen</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Monitoring der risikomindernden Aktivitäten (TOM).</p>
          </div>
        </div>
        <Button size="sm" className="h-9 rounded-md font-bold text-xs px-6 bg-accent hover:bg-accent/90 text-white shadow-lg shadow-accent/20 transition-all active:scale-95" onClick={() => { resetForm(); setIsMeasureDialogOpen(true); }}>
          <Plus className="w-3.5 h-3.5 mr-2" /> Kontrolle planen
        </Button>
      </div>

      <div className="flex flex-row items-center gap-3 bg-white dark:bg-slate-900 p-2 rounded-xl border shadow-sm">
        <div className="relative flex-1 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-focus-within:text-emerald-600 transition-colors" />
          <Input 
            placeholder="Nach Maßnahmen oder Verantwortlichen suchen..." 
            className="pl-9 h-9 rounded-md border-slate-200 bg-slate-50/50 focus:bg-white transition-all shadow-none text-xs"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 px-3 h-9 border rounded-md bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 shrink-0">
          <Activity className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-[10px] font-bold text-slate-500 whitespace-nowrap italic">Control Monitor aktiv</span>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border shadow-sm overflow-hidden">
        {isMeasuresLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600 opacity-20" />
            <p className="text-[10px] font-bold text-slate-400">Kontrollen werden geladen...</p>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="hover:bg-transparent border-b">
                <TableHead className="py-4 px-6 font-bold text-[11px] text-slate-400 uppercase tracking-widest">Maßnahme</TableHead>
                <TableHead className="font-bold text-[11px] text-slate-400 uppercase tracking-widest">Frist / Audit</TableHead>
                <TableHead className="font-bold text-[11px] text-slate-400 uppercase tracking-widest">Verantwortung</TableHead>
                <TableHead className="font-bold text-[11px] text-slate-400 uppercase tracking-widest">Effizienz</TableHead>
                <TableHead className="text-right px-6 font-bold text-[11px] text-slate-400 uppercase tracking-widest">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMeasures.map((m) => (
                <TableRow key={m.id} className="group hover:bg-slate-50 transition-colors border-b last:border-0">
                  <TableCell className="py-4 px-6">
                    <div>
                      <div className="font-bold text-sm text-slate-800 group-hover:text-emerald-600 transition-colors">{m.title}</div>
                      {m.isTom && (
                        <Badge className="bg-emerald-50 text-emerald-700 border-none rounded-full text-[8px] font-black h-4 px-1.5 mt-1">
                          TOM: {m.tomCategory}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col text-[10px] font-bold text-slate-600">
                      <span className="flex items-center gap-1.5"><Clock className="w-3 h-3 opacity-30" /> {m.dueDate || '---'}</span>
                      <span className="text-[8px] font-black uppercase text-slate-400 mt-0.5 italic">Prüfung: {m.lastCheckDate || 'offen'}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                      <UserIcon className="w-3.5 h-3.5 text-slate-300" /> {m.owner || 'N/A'}
                    </div>
                  </TableCell>
                  <TableCell>
                    {m.isEffective ? (
                      <Badge className="bg-emerald-100 text-emerald-700 rounded-full text-[9px] font-black h-5 px-3 border-none shadow-sm flex items-center gap-1 w-fit">
                        <BadgeCheck className="w-3 h-3" /> WIRKSAM
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[9px] font-bold rounded-full border-slate-200 text-slate-400 px-3 h-5">PENDING</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right px-6">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md hover:bg-white opacity-0 group-hover:opacity-100 transition-all shadow-sm">
                          <MoreHorizontal className="w-4 h-4 text-slate-400" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-xl w-56 p-1 shadow-2xl border">
                        <DropdownMenuItem onSelect={() => openEdit(m)} className="rounded-lg py-2 gap-2 text-xs font-bold">
                          <Pencil className="w-3.5 h-3.5 text-primary" /> Bearbeiten
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600 rounded-lg py-2 gap-2 text-xs font-bold" onSelect={() => { if(confirm("Maßnahme permanent löschen?")) deleteCollectionRecord('riskMeasures', m.id, dataSource).then(() => refresh()); }}>
                          <Trash2 className="w-3.5 h-3.5" /> Löschen
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Enterprise Dialog Standards */}
      <Dialog open={isMeasureDialogOpen} onOpenChange={setIsMeasureDialogOpen}>
        <DialogContent className="max-w-5xl w-[95vw] h-[90vh] rounded-2xl p-0 overflow-hidden flex flex-col border-none shadow-2xl bg-white">
          <DialogHeader className="p-6 bg-slate-50 border-b shrink-0 pr-10">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-600 border border-emerald-500/10 shadow-sm">
                  <ClipboardCheck className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <DialogTitle className="text-lg font-headline font-bold text-slate-900 truncate">{selectedMeasure ? 'Maßnahme aktualisieren' : 'Maßnahme planen'}</DialogTitle>
                  <DialogDescription className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Risikominderung & Kontroll-Design</DialogDescription>
                </div>
              </div>
              <AiFormAssistant 
                formType="measure" 
                currentData={{ title, description, owner, effectiveness, isTom, tomCategory }} 
                onApply={applyAiSuggestions} 
              />
            </div>
          </DialogHeader>
          
          <Tabs defaultValue="base" className="flex-1 flex flex-col min-h-0">
            <div className="px-6 bg-white border-b shrink-0">
              <TabsList className="h-12 bg-transparent gap-8 p-0">
                <TabsTrigger value="base" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent h-full px-0 gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 data-[state=active]:text-primary transition-all">Stammdaten</TabsTrigger>
                <TabsTrigger value="tom" className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:bg-transparent h-full px-0 gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 data-[state=active]:text-emerald-600 transition-all">TOM & DSGVO</TabsTrigger>
                <TabsTrigger value="links" className="rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent h-full px-0 gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 data-[state=active]:text-indigo-600 transition-all">Bezüge</TabsTrigger>
                <TabsTrigger value="audit" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent h-full px-0 gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 data-[state=active]:text-blue-600 transition-all">Audit & Effektivität</TabsTrigger>
              </TabsList>
            </div>

            <ScrollArea className="flex-1 bg-slate-50/30">
              <div className="p-8 space-y-10">
                <TabsContent value="base" className="mt-0 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2 md:col-span-2">
                      <Label className="text-[10px] font-bold uppercase text-slate-400 ml-1 tracking-widest">Bezeichnung der Maßnahme</Label>
                      <Input value={title} onChange={e => setTitle(e.target.value)} className="rounded-xl h-12 text-sm font-bold border-slate-200 bg-white shadow-sm focus:border-primary" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase text-slate-400 ml-1 tracking-widest">Verantwortlicher (Owner)</Label>
                      <Input value={owner} onChange={e => setOwner(e.target.value)} className="rounded-xl h-11 text-xs font-bold border-slate-200 bg-white" placeholder="z.B. IT-Leiter" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase text-slate-400 ml-1 tracking-widest">Umsetzungsfrist (Deadline)</Label>
                      <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="rounded-xl h-11 text-xs font-bold border-slate-200 bg-white" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase text-slate-400 ml-1 tracking-widest">Funktionsbeschreibung & Design</Label>
                    <Textarea value={description} onChange={e => setDescription(e.target.value)} className="rounded-2xl min-h-[150px] p-5 border-slate-200 text-xs font-medium leading-relaxed bg-white shadow-inner" placeholder="Detaillierte Beschreibung der Kontrollschritte..." />
                  </div>
                </TabsContent>

                <TabsContent value="tom" className="mt-0 space-y-8">
                  <div className="flex items-center justify-between p-6 bg-emerald-50 border border-emerald-100 rounded-2xl shadow-sm">
                    <div className="space-y-1">
                      <Label className="text-sm font-black uppercase text-emerald-800">Technisch Organisatorische Maßnahme (TOM)</Label>
                      <p className="text-[10px] font-bold text-emerald-600 italic">Entspricht diese Kontrolle einer Schutzmaßnahme nach Art. 32 DSGVO?</p>
                    </div>
                    <Switch checked={isTom} onCheckedChange={setIsTom} className="data-[state=checked]:bg-emerald-600" />
                  </div>
                  {isTom && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-top-2">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase text-slate-400 ml-1">TOM-Kategorie</Label>
                        <Select value={tomCategory} onValueChange={(v:any) => setTomCategory(v)}>
                          <SelectTrigger className="rounded-xl h-11 text-xs font-bold border-slate-200 bg-white"><SelectValue /></SelectTrigger>
                          <SelectContent className="rounded-xl">
                            {['Zugriffskontrolle', 'Zutrittskontrolle', 'Weitergabekontrolle', 'Verschlüsselung', 'Verfügbarkeitskontrolle', 'Trennungskontrolle'].map(c => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="links" className="mt-0 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b pb-2">
                        <Label className="text-[10px] font-bold uppercase text-indigo-600 tracking-widest">Risikobezug ({selectedRiskIds.length})</Label>
                      </div>
                      <ScrollArea className="h-[300px] border border-slate-100 p-2 bg-white rounded-2xl shadow-inner">
                        <div className="space-y-1">
                          {risks?.filter(r => activeTenantId === 'all' || r.tenantId === activeTenantId).map(r => (
                            <div key={r.id} className={cn(
                              "flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border",
                              selectedRiskIds.includes(r.id) ? "border-indigo-200 bg-indigo-50/50" : "border-transparent hover:bg-slate-50"
                            )} onClick={() => setSelectedRiskIds(prev => selectedRiskIds.includes(r.id) ? prev.filter(id => id !== r.id) : [...prev, r.id])}>
                              <Checkbox checked={selectedRiskIds.includes(r.id)} className="rounded-md" />
                              <span className="text-[11px] font-bold text-slate-700 truncate">{r.title}</span>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b pb-2">
                        <Label className="text-[10px] font-bold uppercase text-indigo-600 tracking-widest">Betroffene Systeme ({selectedResourceIds.length})</Label>
                      </div>
                      <ScrollArea className="h-[300px] border border-slate-100 p-2 bg-white rounded-2xl shadow-inner">
                        <div className="space-y-1">
                          {resources?.filter(res => activeTenantId === 'all' || res.tenantId === activeTenantId || res.tenantId === 'global').map(res => (
                            <div key={res.id} className={cn(
                              "flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border",
                              selectedResourceIds.includes(res.id) ? "border-indigo-200 bg-indigo-50/50" : "border-transparent hover:bg-slate-50"
                            )} onClick={() => setSelectedResourceIds(prev => selectedResourceIds.includes(res.id) ? prev.filter(id => id !== res.id) : [...prev, res.id])}>
                              <Checkbox checked={selectedResourceIds.includes(res.id)} className="rounded-md" />
                              <span className="text-[11px] font-bold text-slate-700 truncate">{res.name}</span>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="audit" className="mt-0 space-y-10">
                  <div className="flex items-center justify-between p-6 bg-blue-50 border border-blue-100 rounded-2xl shadow-sm">
                    <div className="space-y-1">
                      <Label className="text-sm font-black uppercase text-blue-800">Wirksamkeit bestätigt?</Label>
                      <p className="text-[10px] font-bold text-blue-600 italic">Ist die Kontrolle im letzten Audit als „effektiv“ eingestuft worden?</p>
                    </div>
                    <Switch checked={isEffective} onCheckedChange={setIsEffective} className="data-[state=checked]:bg-blue-600" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase text-slate-400 ml-1">Letztes Prüfdatum</Label>
                      <Input type="date" value={lastCheckDate} onChange={e => setLastCheckDate(e.target.value)} className="rounded-xl h-11 text-xs font-bold border-slate-200 bg-white" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase text-slate-400 ml-1">Art der Prüfung</Label>
                      <Select value={checkType} onValueChange={(v:any) => setCheckType(v)}>
                        <SelectTrigger className="rounded-xl h-11 text-xs font-bold border-slate-200 bg-white"><SelectValue /></SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {['Formales Audit', 'Technischer Test', 'Stichproben-Review', 'Selbstauskunft'].map(t => <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase text-slate-400 ml-1 tracking-widest">Audit Evidence / Nachweisdetails</Label>
                    <Textarea value={evidenceDetails} onChange={e => setEvidenceDetails(e.target.value)} className="rounded-2xl min-h-[150px] p-5 border-slate-200 text-xs font-medium leading-relaxed bg-white shadow-inner" placeholder="Details zum Nachweis, Link zum Auditbericht oder Testprotokoll..." />
                  </div>
                </TabsContent>
              </div>
            </ScrollArea>
          </Tabs>

          <DialogFooter className="p-4 bg-slate-50 border-t shrink-0 flex flex-col-reverse sm:flex-row gap-2">
            <Button variant="ghost" size="sm" onClick={() => setIsMeasureDialogOpen(false)} className="w-full sm:w-auto rounded-xl font-bold text-[10px] px-8 h-11 tracking-widest text-slate-400 hover:bg-white transition-all">Abbrechen</Button>
            <Button size="sm" onClick={handleSaveMeasure} disabled={isSaving || selectedRiskIds.length === 0} className="w-full sm:w-auto rounded-xl font-bold text-[10px] tracking-widest px-12 h-11 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg transition-all active:scale-95 gap-2">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
