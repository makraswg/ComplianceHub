"use client";

import { useState, useEffect, useMemo } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Plus, 
  Search, 
  MoreHorizontal, 
  Loader2, 
  Trash2, 
  Pencil, 
  FileCheck,
  ShieldCheck,
  Calendar,
  Building2,
  Info,
  Scale,
  ClipboardList,
  RefreshCw,
  Eye,
  FileText,
  BadgeAlert,
  Save,
  Layers,
  History,
  GitBranch,
  Copy,
  ArrowRight,
  Clock,
  Download,
  MoreVertical,
  ChevronRight,
  BrainCircuit
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { usePluggableCollection } from '@/hooks/data/use-pluggable-collection';
import { useSettings } from '@/context/settings-context';
import { saveCollectionRecord, deleteCollectionRecord } from '@/app/actions/mysql-actions';
import { toast } from '@/hooks/use-toast';
import { ProcessingActivity, Resource } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { exportGdprExcel } from '@/lib/export-utils';
import { AiFormAssistant } from '@/components/ai/form-assistant';
import { Card, CardContent } from '@/components/ui/card';

export default function GdprPage() {
  const { dataSource, activeTenantId } = useSettings();
  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState('');
  
  // Modals
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Selection
  const [selectedActivity, setSelectedActivity] = useState<ProcessingActivity | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [version, setVersion] = useState('1.0');
  const [description, setDescription] = useState('');
  const [responsibleDepartment, setResponsibleDepartment] = useState('');
  const [legalBasis, setLegalBasis] = useState('Art. 6 Abs. 1 lit. b (Vertrag)');
  const [retentionPeriod, setRetentionPeriod] = useState('10 Jahre (Steuerrecht)');
  const [status, setStatus] = useState<ProcessingActivity['status']>('active');
  const [resourceIds, setResourceIds] = useState<string[]>([]);

  const { data: activities, isLoading, refresh } = usePluggableCollection<ProcessingActivity>('processingActivities');
  const { data: resources } = usePluggableCollection<Resource>('resources');

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSave = async (isNewVersion = false) => {
    if (!name) return;
    setIsSaving(true);
    
    const id = isNewVersion 
      ? `vvt-${Math.random().toString(36).substring(2, 9)}`
      : (selectedActivity?.id || `vvt-${Math.random().toString(36).substring(2, 9)}`);
    
    const originalId = isNewVersion 
      ? (selectedActivity?.originalId || selectedActivity?.id)
      : (selectedActivity?.originalId || id);

    const targetTenantId = activeTenantId === 'all' ? 't1' : activeTenantId;

    const data: ProcessingActivity = {
      ...selectedActivity,
      id,
      originalId,
      tenantId: targetTenantId,
      name,
      version: isNewVersion ? `${(parseFloat(version) + 0.1).toFixed(1)}` : version,
      description,
      responsibleDepartment,
      legalBasis,
      dataCategories: [],
      subjectCategories: [],
      recipientCategories: '',
      retentionPeriod,
      status: isNewVersion ? 'draft' : status,
      lastReviewDate: new Date().toISOString(),
      resourceIds
    };

    try {
      const res = await saveCollectionRecord('processingActivities', id, data, dataSource);
      if (res.success) {
        toast({ title: isNewVersion ? "Neue Version angelegt" : "VVT-Eintrag gespeichert" });
        setIsDialogOpen(false);
        refresh();
      }
    } finally {
      setIsSaving(false);
    }
  };

  const openEdit = (act: ProcessingActivity) => {
    setSelectedActivity(act);
    setName(act.name);
    setVersion(act.version || '1.0');
    setDescription(act.description || '');
    setResponsibleDepartment(act.responsibleDepartment || '');
    setLegalBasis(act.legalBasis || '');
    setRetentionPeriod(act.retentionPeriod || '');
    setStatus(act.status);
    setResourceIds(act.resourceIds || []);
    setIsDialogOpen(true);
  };

  const filteredActivities = useMemo(() => {
    if (!activities) return [];
    const map = new Map<string, ProcessingActivity>();
    activities.forEach(act => {
      const key = act.originalId || act.id;
      const existing = map.get(key);
      if (!existing || parseFloat(act.version) > parseFloat(existing.version)) {
        if (activeTenantId === 'all' || act.tenantId === activeTenantId) {
          map.set(key, act);
        }
      }
    });
    return Array.from(map.values()).filter(a => a.name.toLowerCase().includes(search.toLowerCase()));
  }, [activities, search, activeTenantId]);

  const applyAiSuggestions = (s: any) => {
    if (s.name) setName(s.name);
    if (s.description) setDescription(s.description);
    if (s.responsibleDepartment) setResponsibleDepartment(s.responsibleDepartment);
    if (s.legalBasis) setLegalBasis(s.legalBasis);
    if (s.retentionPeriod) setRetentionPeriod(s.retentionPeriod);
    toast({ title: "KI-Vorschläge übernommen" });
  };

  if (!mounted) return null;

  return (
    <div className="space-y-6 pb-10">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b pb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-500/10 text-emerald-600 flex items-center justify-center rounded-xl border border-emerald-500/10 shadow-sm">
            <FileCheck className="w-6 h-6" />
          </div>
          <div>
            <Badge className="mb-1 rounded-full px-2 py-0 bg-emerald-100 text-emerald-700 text-[9px] font-black uppercase tracking-wider">Compliance Registry</Badge>
            <h1 className="text-2xl font-headline font-bold text-slate-900 dark:text-white uppercase tracking-tight">Datenschutz (VVT)</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Verarbeitungsverzeichnis gemäß Art. 30 DSGVO.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="h-9 rounded-md font-bold uppercase text-[9px] tracking-wider px-4 border-slate-200 hover:bg-slate-50 transition-all active:scale-95" onClick={() => exportGdprExcel(filteredActivities)}>
            <Download className="w-3.5 h-3.5 mr-2 text-primary" /> Excel Export
          </Button>
          <Button size="sm" onClick={() => { setSelectedActivity(null); setIsDialogOpen(true); setVersion('1.0'); setResourceIds([]); }} className="h-9 rounded-md font-bold uppercase text-[10px] tracking-widest px-6 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200 transition-all active:scale-95">
            <Plus className="w-3.5 h-3.5 mr-2" /> Neue Tätigkeit
          </Button>
        </div>
      </div>

      {/* Toolbar Pattern */}
      <div className="flex flex-row items-center gap-3 bg-white dark:bg-slate-900 p-2 rounded-xl border shadow-sm">
        <div className="relative flex-1 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-focus-within:text-emerald-600 transition-colors" />
          <Input 
            placeholder="Nach Tätigkeiten oder Abteilungen suchen..." 
            className="pl-9 h-9 rounded-md border-slate-200 bg-slate-50/50 focus:bg-white transition-all shadow-none text-xs"
            value={search}
            onChange={e => setSearch(e.target.value)} 
          />
        </div>
        <div className="flex items-center gap-2 px-3 h-9 border rounded-md bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 shrink-0">
          <Scale className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-[10px] font-bold text-slate-500 whitespace-nowrap italic">VVT Monitor aktiv</span>
        </div>
      </div>

      {/* Main Content */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600 opacity-20" />
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Register wird geladen...</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-xl border shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="hover:bg-transparent border-b">
                <TableHead className="py-4 px-6 font-bold uppercase tracking-widest text-[9px] text-slate-400">Tätigkeit / Rechtsgrundlage</TableHead>
                <TableHead className="font-bold uppercase tracking-widest text-[9px] text-slate-400">Version</TableHead>
                <TableHead className="font-bold uppercase tracking-widest text-[9px] text-slate-400">Abteilung</TableHead>
                <TableHead className="font-bold uppercase tracking-widest text-[9px] text-slate-400">Status</TableHead>
                <TableHead className="text-right px-6 font-bold uppercase tracking-widest text-[9px] text-slate-400">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredActivities.map((act) => (
                <TableRow key={act.id} className="group hover:bg-slate-50 transition-colors border-b last:border-0">
                  <TableCell className="py-4 px-6">
                    <div>
                      <div className="font-bold text-xs text-slate-800 group-hover:text-emerald-600 transition-colors cursor-pointer" onClick={() => openEdit(act)}>{act.name}</div>
                      <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5 italic flex items-center gap-1.5">
                        <Scale className="w-2.5 h-2.5 opacity-50" /> {act.legalBasis}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="rounded-full bg-emerald-50 text-emerald-700 border-none font-black text-[8px] h-5 px-2 shadow-sm">V{act.version}</Badge>
                  </TableCell>
                  <TableCell className="text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-2 mt-2">
                    <Building2 className="w-3 h-3 text-slate-300" /> {act.responsibleDepartment}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn(
                      "rounded-full uppercase text-[8px] font-black h-5 px-2 border-none shadow-sm",
                      act.status === 'active' ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                    )}>{act.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right px-6">
                    <div className="flex justify-end items-center gap-1.5">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 rounded-md text-[9px] font-black uppercase tracking-wider gap-1.5 opacity-0 group-hover:opacity-100 hover:bg-emerald-50 hover:text-emerald-600 transition-all active:scale-95"
                        onClick={() => openEdit(act)}
                      >
                        Bearbeiten
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md hover:bg-slate-100 transition-all active:scale-95"><MoreHorizontal className="w-4 h-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 rounded-xl p-1 shadow-2xl border">
                          <DropdownMenuItem onSelect={() => openEdit(act)} className="rounded-lg py-2 gap-2 text-xs font-bold"><Pencil className="w-3.5 h-3.5 text-emerald-600" /> Bearbeiten</DropdownMenuItem>
                          <DropdownMenuSeparator className="my-1" />
                          <DropdownMenuItem className="text-red-600 rounded-lg py-2 gap-2 text-xs font-bold" onSelect={() => { if(confirm("Eintrag löschen?")) deleteCollectionRecord('processingActivities', act.id, dataSource).then(() => refresh()); }}>
                            <Trash2 className="w-3.5 h-3.5" /> Löschen
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* GDPR Dialog - Enterprise Pattern */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl w-[95vw] h-[90vh] rounded-2xl p-0 overflow-hidden flex flex-col border-none shadow-2xl bg-white">
          <DialogHeader className="p-6 bg-slate-50 border-b shrink-0 pr-10">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-600 border border-emerald-500/10 shadow-sm">
                  <FileCheck className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <DialogTitle className="text-lg font-headline font-bold uppercase tracking-tight text-slate-900 truncate">Verarbeitungstätigkeit</DialogTitle>
                  <DialogDescription className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Art. 30 DSGVO Dokumentation • Mandant: {activeTenantId}</DialogDescription>
                </div>
              </div>
              <AiFormAssistant 
                formType="gdpr" 
                currentData={{ name, description, responsibleDepartment, legalBasis, retentionPeriod, status }} 
                onApply={applyAiSuggestions} 
              />
            </div>
          </DialogHeader>
          <Tabs defaultValue="base" className="flex-1 flex flex-col min-h-0">
            <div className="px-6 bg-white border-b shrink-0">
              <TabsList className="h-12 bg-transparent gap-8 p-0">
                <TabsTrigger value="base" className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:bg-transparent h-full px-0 gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 data-[state=active]:text-emerald-600 transition-all">
                  <FileText className="w-4 h-4" /> Stammdaten
                </TabsTrigger>
                <TabsTrigger value="systems" className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-600 data-[state=active]:bg-transparent h-full px-0 gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 data-[state=active]:text-emerald-600 transition-all">
                  <Layers className="w-4 h-4" /> IT-Infrastruktur
                </TabsTrigger>
              </TabsList>
            </div>
            <ScrollArea className="flex-1 bg-slate-50/30">
              <div className="p-8 space-y-10">
                <TabsContent value="base" className="mt-0 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2 md:col-span-2">
                      <Label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">Bezeichnung der Tätigkeit</Label>
                      <Input value={name} onChange={e => setName(e.target.value)} className="rounded-xl h-12 text-sm font-bold border-slate-200 bg-white shadow-sm focus:border-emerald-500" placeholder="z.B. Lohnabrechnung, Bewerbermanagement..." />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">Verantwortlicher Bereich</Label>
                      <Input value={responsibleDepartment} onChange={e => setResponsibleDepartment(e.target.value)} className="rounded-xl h-11 text-xs font-bold border-slate-200 bg-white" placeholder="z.B. Personalwesen" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">Rechtsgrundlage</Label>
                      <Select value={legalBasis} onValueChange={setLegalBasis}>
                        <SelectTrigger className="rounded-xl h-11 text-xs font-bold border-slate-200 bg-white"><SelectValue /></SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="Art. 6 Abs. 1 lit. a (Einwilligung)" className="text-xs font-bold">Einwilligung</SelectItem>
                          <SelectItem value="Art. 6 Abs. 1 lit. b (Vertrag)" className="text-xs font-bold">Vertragserfüllung</SelectItem>
                          <SelectItem value="Art. 6 Abs. 1 lit. c (Rechtliche Verpflichtung)" className="text-xs font-bold">Rechtliche Verpflichtung</SelectItem>
                          <SelectItem value="Art. 6 Abs. 1 lit. f (Berechtigtes Interesse)" className="text-xs font-bold">Berechtigtes Interesse</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">Löschfrist / Aufbewahrung</Label>
                      <Input value={retentionPeriod} onChange={e => setRetentionPeriod(e.target.value)} className="rounded-xl h-11 text-xs font-bold border-slate-200 bg-white" placeholder="z.B. 10 Jahre gemäß Steuerrecht" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">Status der Prüfung</Label>
                      <Select value={status} onValueChange={(v:any) => setStatus(v)}>
                        <SelectTrigger className="rounded-xl h-11 text-xs font-bold border-slate-200 bg-white"><SelectValue /></SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="active" className="text-xs font-bold">Freigegeben</SelectItem>
                          <SelectItem value="draft" className="text-xs font-bold">In Prüfung</SelectItem>
                          <SelectItem value="archived" className="text-xs font-bold">Archiviert</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">Zweck & Datenumfang</Label>
                    <div className="relative">
                      <Textarea 
                        value={description} 
                        onChange={e => setDescription(e.target.value)} 
                        className="rounded-2xl min-h-[150px] p-5 border-slate-200 text-xs font-medium leading-relaxed bg-white shadow-inner" 
                        placeholder="Detaillierte Beschreibung des Verarbeitungszwecks und der betroffenen Datenkategorien..."
                      />
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="systems" className="mt-0">
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                      <Layers className="w-5 h-5 text-emerald-600" />
                      <div>
                        <h4 className="text-sm font-black uppercase tracking-tight text-slate-900">Zugeordnete IT-Systeme</h4>
                        <p className="text-[10px] font-bold text-slate-400">Wählen Sie die Anwendungen aus, in denen diese Daten verarbeitet werden.</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {resources?.map(res => (
                        <div 
                          key={res.id} 
                          className={cn(
                            "flex items-center gap-4 p-4 bg-white border rounded-2xl cursor-pointer transition-all shadow-sm group",
                            resourceIds.includes(res.id) 
                              ? "border-emerald-500 bg-emerald-50/20 ring-2 ring-emerald-500/10" 
                              : "border-slate-100 hover:border-slate-300"
                          )} 
                          onClick={() => setResourceIds(prev => resourceIds.includes(res.id) ? prev.filter(id => id !== res.id) : [...prev, res.id])}
                        >
                          <Checkbox checked={resourceIds.includes(res.id)} className="rounded-md h-5 w-5 border-2" />
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-black text-slate-800 truncate group-hover:text-emerald-700 transition-colors">{res.name}</p>
                            <div className="flex items-center gap-1.5 mt-1">
                              <Badge variant="outline" className="text-[7px] font-black uppercase px-1.5 h-4 border-slate-200 bg-slate-50 text-slate-400">{res.assetType}</Badge>
                              {res.criticality === 'high' && <BadgeAlert className="w-3 h-3 text-red-500" />}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {(!resources || resources.length === 0) && (
                      <div className="py-20 text-center border-2 border-dashed rounded-3xl bg-white/50">
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Keine Ressourcen im Katalog gefunden</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </div>
            </ScrollArea>
          </Tabs>
          <DialogFooter className="p-4 bg-slate-50 border-t shrink-0 flex flex-col-reverse sm:flex-row gap-2">
            <Button variant="ghost" size="sm" onClick={() => setIsDialogOpen(false)} className="w-full sm:w-auto rounded-xl font-black uppercase text-[9px] px-8 h-11 tracking-widest text-slate-400 hover:bg-white transition-all">Abbrechen</Button>
            <div className="flex flex-1 sm:flex-none gap-2">
              <Button size="sm" onClick={() => handleSave(false)} disabled={isSaving || !name} className="flex-1 sm:flex-none rounded-xl font-black uppercase text-[10px] tracking-widest px-12 h-11 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200 transition-all active:scale-95 gap-2">
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Speichern
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
