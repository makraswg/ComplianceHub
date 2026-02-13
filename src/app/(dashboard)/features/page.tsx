
"use client";

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ListFilter, 
  Plus, 
  Search, 
  Loader2, 
  MoreVertical, 
  Trash2, 
  Pencil, 
  ArrowRight,
  ShieldCheck,
  Building2,
  Tag,
  Filter,
  Activity,
  Archive,
  RotateCcw,
  ShieldAlert,
  Save,
  Briefcase,
  FileEdit,
  Layers,
  ArrowUpRight,
  Scale,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  HardDrive,
  Database,
  Info,
  Network,
  Clock,
  CalendarDays,
  Link as LinkIcon
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
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
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePluggableCollection } from '@/hooks/data/use-pluggable-collection';
import { useSettings } from '@/context/settings-context';
import { saveFeatureAction, deleteFeatureAction } from '@/app/actions/feature-actions';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Feature, Department, JobTitle, Resource } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AiFormAssistant } from '@/components/ai/form-assistant';
import { usePlatformAuth } from '@/context/auth-context';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

export default function FeaturesOverviewPage() {
  const router = useRouter();
  const { user } = usePlatformAuth();
  const { dataSource, activeTenantId } = useSettings();
  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [carrierFilter, setCarrierFilter] = useState('all');
  const [complianceOnly, setComplianceOnly] = useState(false);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [status, setStatus] = useState<Feature['status']>('active');
  const [carrier, setCarrier] = useState<Feature['carrier']>('objekt');
  const [description, setDescription] = useState('');
  const [purpose, setPurpose] = useState('');
  const [isComplianceRelevant, setIsComplianceRelevant] = useState(false);
  const [deptId, setDeptId] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [dataStoreId, setDataStoreId] = useState('');
  const [maintenanceNotes, setMaintenanceNotes] = useState('');
  const [validFrom, setValidFrom] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [changeReason, setChangeReason] = useState('');

  // CIA State
  const [confidentialityReq, setConfidentialityReq] = useState<Feature['confidentialityReq']>('low');
  const [integrityReq, setIntegrityReq] = useState<Feature['integrityReq']>('low');
  const [availabilityReq, setAvailabilityReq] = useState<Feature['availabilityReq']>('low');

  // Matrix State
  const [matrixFinancial, setMatrixFinancial] = useState(false);
  const [matrixLegal, setMatrixLegal] = useState(false);
  const [matrixExternal, setMatrixExternal] = useState(false);
  const [matrixHardToCorrect, setMatrixHardToCorrect] = useState(false);
  const [matrixAutomatedDecision, setMatrixAutomatedDecision] = useState(false);
  const [matrixPlanning, setMatrixPlanning] = useState(false);

  // Dependency State
  const [selectedDepIds, setSelectedDepIds] = useState<string[]>([]);
  const [depSearch, setDepSearch] = useState('');

  const { data: features, isLoading, refresh } = usePluggableCollection<Feature>('features');
  const { data: departments } = usePluggableCollection<Department>('departments');
  const { data: jobTitles } = usePluggableCollection<JobTitle>('jobTitles');
  const { data: resources } = usePluggableCollection<Resource>('resources');
  const { data: featureDeps } = usePluggableCollection<any>('feature_dependencies');

  useEffect(() => { setMounted(true); }, []);

  const currentScore = useMemo(() => {
    let s = 0;
    if (matrixFinancial) s++;
    if (matrixLegal) s++;
    if (matrixExternal) s++;
    if (matrixHardToCorrect) s++;
    if (matrixAutomatedDecision) s++;
    if (matrixPlanning) s++;
    return s;
  }, [matrixFinancial, matrixLegal, matrixExternal, matrixHardToCorrect, matrixAutomatedDecision, matrixPlanning]);

  const currentLevel = useMemo(() => {
    if (currentScore >= 4) return 'high';
    if (currentScore >= 2) return 'medium';
    return 'low';
  }, [currentScore]);

  const repositoryResources = useMemo(() => {
    if (!resources) return [];
    return resources.filter(res => !!res.isDataRepository);
  }, [resources]);

  const handleSave = async () => {
    if (!name || !deptId || !carrier) {
      toast({ variant: "destructive", title: "Fehler", description: "Bitte füllen Sie alle Pflichtfelder aus." });
      return;
    }

    setIsSaving(true);
    const targetTenantId = activeTenantId === 'all' ? 't1' : activeTenantId;
    
    const featureData: any = {
      ...selectedFeature,
      id: selectedFeature?.id || '',
      tenantId: targetTenantId,
      name,
      status,
      carrier,
      description,
      purpose,
      isComplianceRelevant,
      deptId,
      ownerId: ownerId === 'none' ? undefined : ownerId,
      dataStoreId: dataStoreId === 'none' ? undefined : dataStoreId,
      maintenanceNotes,
      validFrom,
      validUntil,
      changeReason,
      confidentialityReq,
      integrityReq,
      availabilityReq,
      matrixFinancial,
      matrixLegal,
      matrixExternal,
      matrixHardToCorrect,
      matrixAutomatedDecision,
      matrixPlanning,
      criticality: currentLevel,
      criticalityScore: currentScore,
      dependentFeatureIds: selectedDepIds, // Custom handle in action
      createdAt: selectedFeature?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      const res = await saveFeatureAction(featureData, dataSource, user?.email || 'system');
      if (res.success) {
        toast({ title: selectedFeature ? "Datenobjekt aktualisiert" : "Datenobjekt angelegt" });
        setIsDialogOpen(false);
        resetForm();
        refresh();
      }
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setSelectedFeature(null);
    setName('');
    setStatus('active');
    setCarrier('objekt');
    setDescription('');
    setPurpose('');
    setIsComplianceRelevant(false);
    setDeptId('');
    setOwnerId('');
    setDataStoreId('');
    setMaintenanceNotes('');
    setValidFrom('');
    setValidUntil('');
    setChangeReason('');
    setConfidentialityReq('low');
    setIntegrityReq('low');
    setAvailabilityReq('low');
    setMatrixFinancial(false);
    setMatrixLegal(false);
    setMatrixExternal(false);
    setMatrixHardToCorrect(false);
    setMatrixAutomatedDecision(false);
    setMatrixPlanning(false);
    setSelectedDepIds([]);
    setDepSearch('');
  };

  const openEdit = (f: Feature) => {
    setSelectedFeature(f);
    setName(f.name || '');
    setStatus(f.status || 'active');
    setCarrier(f.carrier || 'objekt');
    setDescription(f.description || '');
    setPurpose(f.purpose || '');
    setIsComplianceRelevant(!!f.isComplianceRelevant);
    setDeptId(f.deptId || '');
    setOwnerId(f.ownerId || 'none');
    setDataStoreId(f.dataStoreId || 'none');
    setMaintenanceNotes(f.maintenanceNotes || '');
    setValidFrom(f.validFrom || '');
    setValidUntil(f.validUntil || '');
    setChangeReason(f.changeReason || '');
    setConfidentialityReq(f.confidentialityReq || 'low');
    setIntegrityReq(f.integrityReq || 'low');
    setAvailabilityReq(f.availabilityReq || 'low');
    setMatrixFinancial(!!f.matrixFinancial);
    setMatrixLegal(!!f.matrixLegal);
    setMatrixExternal(!!f.matrixExternal);
    setMatrixHardToCorrect(!!f.matrixHardToCorrect);
    setMatrixAutomatedDecision(!!f.matrixAutomatedDecision);
    setMatrixPlanning(!!f.matrixPlanning);
    
    // Load Dependencies
    const deps = featureDeps?.filter((d: any) => d.featureId === f.id).map((d: any) => d.dependentFeatureId) || [];
    setSelectedDepIds(deps);
    setDepSearch('');
    setIsDialogOpen(true);
  };

  const toggleDependency = (id: string) => {
    setSelectedDepIds(prev => 
      prev.includes(id) ? prev.filter(did => did !== id) : [...prev, id]
    );
  };

  const applyAiSuggestions = (s: any) => {
    if (s.name) setName(s.name);
    if (s.description) setDescription(s.description);
    if (s.purpose) setPurpose(s.purpose);
    if (s.maintenanceNotes) setMaintenanceNotes(s.maintenanceNotes);
    toast({ title: "KI-Vorschläge übernommen" });
  };

  const filteredFeatures = useMemo(() => {
    if (!features) return [];
    return features.filter(f => {
      const matchesTenant = activeTenantId === 'all' || f.tenantId === activeTenantId;
      const matchesStatus = statusFilter === 'all' || f.status === statusFilter;
      const matchesCarrier = carrierFilter === 'all' || f.carrier === carrierFilter;
      const matchesCompliance = !complianceOnly || !!f.isComplianceRelevant;
      const matchesSearch = f.name.toLowerCase().includes(search.toLowerCase());
      return matchesTenant && matchesStatus && matchesCarrier && matchesSearch && matchesCompliance;
    });
  }, [features, search, statusFilter, carrierFilter, activeTenantId, complianceOnly]);

  if (!mounted) return null;

  return (
    <div className="p-4 md:p-8 space-y-6 pb-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b pb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary shadow-sm border border-primary/10 transition-transform hover:scale-105">
            <ListFilter className="w-6 h-6" />
          </div>
          <div>
            <Badge className="mb-1 rounded-full px-2 py-0 bg-primary/10 text-primary text-[9px] font-bold border-none uppercase tracking-wider">WorkflowHub</Badge>
            <h1 className="text-2xl font-headline font-bold text-slate-900 dark:text-white uppercase tracking-tight">Datenmanagement</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Zentrale Verwaltung und Dokumentation fachlicher Datenobjekte.</p>
          </div>
        </div>
        <Button size="sm" className="h-9 rounded-md font-bold text-xs px-6 bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 transition-all active:scale-95" onClick={() => { resetForm(); setIsDialogOpen(true); }}>
          <Plus className="w-3.5 h-3.5 mr-2" /> Datenobjekt erfassen
        </Button>
      </div>

      <div className="flex flex-row items-center gap-3 bg-white dark:bg-slate-900 p-2 rounded-xl border shadow-sm">
        <div className="relative flex-1 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-focus-within:text-primary transition-colors" />
          <Input 
            placeholder="Nach Bezeichnung suchen..." 
            className="pl-9 h-9 rounded-md border-slate-200 bg-slate-50/50 focus:bg-white transition-all shadow-none text-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-md border border-slate-200 dark:border-slate-700 h-9 shrink-0">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="border-none shadow-none h-full rounded-sm bg-transparent text-[10px] font-bold min-w-[120px]">
              <Filter className="w-3 h-3 mr-1.5 text-slate-400" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">Alle Status</SelectItem>
              <SelectItem value="active" className="text-xs">Aktiv</SelectItem>
              <SelectItem value="in_preparation" className="text-xs">Vorbereitung</SelectItem>
              <SelectItem value="open_questions" className="text-xs">Offene Fragen</SelectItem>
              <SelectItem value="archived" className="text-xs">Archiv</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2 px-3 h-9 border rounded-md bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 shrink-0">
          <ShieldAlert className={cn("w-3.5 h-3.5", complianceOnly ? "text-emerald-600" : "text-slate-400")} />
          <Label htmlFor="compliance-only" className="text-[10px] font-bold cursor-pointer text-slate-500 whitespace-nowrap">Audit Fokus</Label>
          <Switch id="compliance-only" checked={complianceOnly} onCheckedChange={setComplianceOnly} className="scale-75" />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary opacity-20" />
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Lade Daten...</p>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="hover:bg-transparent border-b">
                <TableHead className="py-4 px-6 font-bold text-[11px] text-slate-400 uppercase tracking-widest">Datenobjekt (Bezeichnung)</TableHead>
                <TableHead className="font-bold text-[11px] text-slate-400 uppercase tracking-widest">Träger</TableHead>
                <TableHead className="font-bold text-[11px] text-slate-400 uppercase tracking-widest">Zuständigkeit</TableHead>
                <TableHead className="font-bold text-[11px] text-slate-400 text-center uppercase tracking-widest">Kritikalität</TableHead>
                <TableHead className="text-right px-6 font-bold text-[11px] text-slate-400 uppercase tracking-widest">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFeatures.map((f) => {
                const dept = departments?.find(d => d.id === f.deptId);
                const role = jobTitles?.find(j => j.id === f.ownerId);
                return (
                  <TableRow key={f.id} className="group hover:bg-slate-50 transition-colors border-b last:border-0 cursor-pointer" onClick={() => router.push(`/features/${f.id}`)}>
                    <TableCell className="py-4 px-6">
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border shadow-inner",
                          f.status === 'active' ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-slate-50 text-slate-400"
                        )}>
                          <Tag className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="font-bold text-sm text-slate-800 group-hover:text-primary transition-colors">{f.name}</div>
                            {f.isComplianceRelevant && <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />}
                          </div>
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{f.carrier}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="rounded-full text-[8px] font-black uppercase border-slate-200 text-slate-500 px-2 h-5">
                        {f.carrier}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-600">
                          <Building2 className="w-3 h-3 text-slate-300" /> {dept?.name || '---'}
                        </div>
                        {role && (
                          <div className="flex items-center gap-2 text-[9px] font-bold text-slate-400 italic">
                            <Briefcase className="w-3 h-3 text-slate-300" /> {role.name}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={cn(
                        "rounded-md font-bold text-[9px] h-5 px-2 border-none shadow-sm",
                        f.criticality === 'high' ? "bg-red-50 text-red-600" : f.criticality === 'medium' ? "bg-orange-50 text-orange-600" : "bg-emerald-50 text-emerald-600"
                      )}>{f.criticality?.toUpperCase()} ({f.criticalityScore})</Badge>
                    </TableCell>
                    <TableCell className="text-right px-6" onClick={e => e.stopPropagation()}>
                      <div className="flex justify-end items-center gap-1.5">
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md opacity-0 group-hover:opacity-100 transition-all hover:bg-white shadow-sm" onClick={() => openEdit(f)}>
                          <Pencil className="w-3.5 h-3.5 text-slate-400" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md hover:bg-slate-100 transition-all"><MoreVertical className="w-4 h-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-xl w-56 p-1 shadow-2xl border">
                            <DropdownMenuItem onSelect={() => router.push(`/features/${f.id}`)} className="rounded-lg py-2 gap-2 text-xs font-bold">
                              <ArrowRight className="w-3.5 h-3.5 text-primary" /> Details ansehen
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => openEdit(f)} className="rounded-lg py-2 gap-2 text-xs font-bold">
                              <FileEdit className="w-3.5 h-3.5 text-slate-400" /> Bearbeiten
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="my-1" />
                            <DropdownMenuItem className="text-red-600 rounded-lg py-2 gap-2 text-xs font-bold" onSelect={() => { if(confirm("Datenobjekt permanent löschen?")) deleteFeatureAction(f.id, dataSource).then(() => refresh()); }}>
                              <Trash2 className="w-3.5 h-3.5" /> Löschen
                            </DropdownMenuItem>
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

      <Dialog open={isDialogOpen} onOpenChange={(v) => !v && setIsDialogOpen(false)}>
        <DialogContent className="max-w-5xl w-[95vw] h-[90vh] rounded-2xl p-0 overflow-hidden flex flex-col border-none shadow-2xl bg-white">
          <DialogHeader className="p-6 bg-slate-900 text-white shrink-0 pr-10">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center text-primary border border-white/10 shadow-lg">
                  <ListFilter className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <DialogTitle className="text-lg font-headline font-bold uppercase tracking-tight">{selectedFeature ? 'Datenobjekt aktualisieren' : 'Neues Datenobjekt erfassen'}</DialogTitle>
                  <DialogDescription className="text-[10px] text-white/50 font-bold uppercase tracking-widest mt-0.5">Zentrale Daten-Governance & CIA-Mapping</DialogDescription>
                </div>
              </div>
              <AiFormAssistant 
                formType="gdpr" 
                currentData={{ name, description, purpose, maintenanceNotes }} 
                onApply={applyAiSuggestions} 
              />
            </div>
          </DialogHeader>
          
          <Tabs defaultValue="base" className="flex-1 flex flex-col min-h-0">
            <div className="px-6 border-b shrink-0 bg-white">
              <TabsList className="h-12 bg-transparent gap-8 p-0">
                <TabsTrigger value="base" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent h-full px-0 text-[10px] font-black uppercase tracking-widest text-slate-400 data-[state=active]:text-primary transition-all">Stammdaten</TabsTrigger>
                <TabsTrigger value="matrix" className="rounded-none border-b-2 border-transparent data-[state=active]:border-accent data-[state=active]:bg-transparent h-full px-0 text-[10px] font-black uppercase tracking-widest text-slate-400 data-[state=active]:text-accent transition-all">Kritikalität</TabsTrigger>
                <TabsTrigger value="cia" className="rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent h-full px-0 text-[10px] font-black uppercase tracking-widest text-slate-400 data-[state=active]:text-indigo-600 transition-all">Schutzbedarf (CIA)</TabsTrigger>
                <TabsTrigger value="deps" className="rounded-none border-b-2 border-transparent data-[state=active]:border-orange-600 h-full px-0 text-[10px] font-black uppercase tracking-widest text-slate-400 data-[state=active]:text-orange-600">Änderungsverbund</TabsTrigger>
              </TabsList>
            </div>

            <ScrollArea className="flex-1 bg-slate-50/30">
              <div className="p-8 space-y-10">
                <TabsContent value="base" className="mt-0 space-y-8 animate-in fade-in">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2 md:col-span-2">
                      <Label required className="text-[10px] font-bold uppercase text-slate-400 ml-1 tracking-widest">Bezeichnung / Code</Label>
                      <Input value={name} onChange={e => setName(e.target.value)} className="rounded-xl h-12 text-sm font-bold border-slate-200 bg-white shadow-sm" placeholder="z.B. DAT_001 - Kundennummer" />
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">Status</Label>
                      <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                        <SelectTrigger className="rounded-xl h-11 border-slate-200 bg-white shadow-sm"><SelectValue /></SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="active">Aktiv</SelectItem>
                          <SelectItem value="in_preparation">Vorbereitung</SelectItem>
                          <SelectItem value="open_questions">Offene Fragen</SelectItem>
                          <SelectItem value="archived">Archiv</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label required className="text-[10px] font-bold uppercase text-slate-400 ml-1 tracking-widest">Träger</Label>
                      <Select value={carrier} onValueChange={(v: any) => setCarrier(v)}>
                        <SelectTrigger className="rounded-xl h-11 border-slate-200 bg-white shadow-sm"><SelectValue /></SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="wirtschaftseinheit">Wirtschaftseinheit</SelectItem>
                          <SelectItem value="objekt">Objekt</SelectItem>
                          <SelectItem value="verwaltungseinheit">Verwaltungseinheit</SelectItem>
                          <SelectItem value="mietvertrag">Mietvertrag</SelectItem>
                          <SelectItem value="geschaeftspartner">Geschäftspartner</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="p-6 bg-white border rounded-2xl md:col-span-2 shadow-sm space-y-6">
                      <div className="flex items-center gap-3 border-b pb-3">
                        <ShieldCheck className="w-5 h-5 text-emerald-600" />
                        <h4 className="text-xs font-black uppercase text-slate-900 tracking-widest">Verantwortung & Ablage</h4>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label required className="text-[10px] font-bold uppercase text-slate-400 ml-1 tracking-widest">Verantwortliche Abteilung</Label>
                          <Select value={deptId} onValueChange={setDeptId}>
                            <SelectTrigger className="rounded-xl h-11 border-slate-200 bg-white"><SelectValue placeholder="Abteilung wählen..." /></SelectTrigger>
                            <SelectContent className="rounded-xl">
                              {departments?.filter(d => activeTenantId === 'all' || d.tenantId === activeTenantId).map(d => (
                                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-[10px] font-bold uppercase text-slate-400 ml-1 tracking-widest">Daten-Eigner (Rollen-Blueprint)</Label>
                          <Select value={ownerId} onValueChange={setOwnerId}>
                            <SelectTrigger className="rounded-xl h-11 border-slate-200 bg-white"><SelectValue placeholder="Wählen..." /></SelectTrigger>
                            <SelectContent className="rounded-xl">
                              <SelectItem value="none">Keine spezifische Rolle</SelectItem>
                              {jobTitles?.filter(j => activeTenantId === 'all' || j.tenantId === activeTenantId).map(j => (
                                <SelectItem key={j.id} value={j.id}>{j.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2 md:col-span-2">
                          <Label className="text-[10px] font-bold uppercase text-slate-400 ml-1 tracking-widest">Repository (Ablageort)</Label>
                          <Select value={dataStoreId} onValueChange={setDataStoreId}>
                            <SelectTrigger className="rounded-xl h-11 border-slate-200 bg-white shadow-sm">
                              <div className="flex items-center gap-2">
                                <Database className="w-3.5 h-3.5 text-slate-400" />
                                <SelectValue placeholder="Wählen..." />
                              </div>
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              <SelectItem value="none">Kein spezifischer Ablageort</SelectItem>
                              {repositoryResources.map(res => (
                                <SelectItem key={res.id} value={res.id}>{res.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:col-span-2">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase text-slate-400 ml-1 tracking-widest">Gültig von</Label>
                        <Input type="date" value={validFrom} onChange={e => setValidFrom(e.target.value)} className="rounded-xl h-11 border-slate-200 bg-white shadow-sm" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase text-slate-400 ml-1 tracking-widest">Gültig bis</Label>
                        <Input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} className="rounded-xl h-11 border-slate-200 bg-white shadow-sm" />
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-white border rounded-2xl md:col-span-2 shadow-sm">
                      <div className="space-y-0.5">
                        <Label className="text-[10px] font-bold uppercase text-slate-900">Compliance-relevant</Label>
                        <p className="text-[8px] text-slate-400 uppercase font-black">Teil des GRC-Monitorings</p>
                      </div>
                      <Switch checked={!!isComplianceRelevant} onCheckedChange={setIsComplianceRelevant} />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label className="text-[10px] font-bold uppercase text-slate-400 ml-1 tracking-widest">Zweck & Datenumfang</Label>
                      <Textarea value={description || ''} onChange={e => setDescription(e.target.value)} className="rounded-2xl min-h-[120px] p-5 border-slate-200 text-xs font-medium bg-white" placeholder="Fachliche Definition der Daten..." />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="matrix" className="mt-0 space-y-8 animate-in fade-in">
                  <div className="p-6 bg-white border rounded-2xl shadow-sm space-y-6">
                    <div className="flex items-center gap-3 border-b pb-3">
                      <Activity className="w-5 h-5 text-accent" />
                      <h4 className="text-xs font-black uppercase text-slate-900 tracking-widest">Punktematrix zur Kritikalität</h4>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <div className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer" onClick={() => setMatrixFinancial(!matrixFinancial)}>
                          <Checkbox id="mat-fin" checked={matrixFinancial as boolean} />
                          <Label htmlFor="mat-fin" className="text-[11px] font-bold leading-tight cursor-pointer">Fehler wirkt finanziell (Abrechnung)</Label>
                        </div>
                        <div className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer" onClick={() => setMatrixLegal(!matrixLegal)}>
                          <Checkbox id="mat-leg" checked={matrixLegal as boolean} />
                          <Label htmlFor="mat-leg" className="text-[11px] font-bold leading-tight cursor-pointer">Fehler wirkt rechtlich (Vertrag)</Label>
                        </div>
                        <div className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer" onClick={() => setMatrixExternal(!matrixExternal)}>
                          <Checkbox id="mat-ext" checked={matrixExternal as boolean} />
                          <Label htmlFor="mat-ext" className="text-[11px] font-bold leading-tight cursor-pointer">Fehler wirkt extern (Kunde/Behörde)</Label>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer" onClick={() => setMatrixHardToCorrect(!matrixHardToCorrect)}>
                          <Checkbox id="mat-hard" checked={matrixHardToCorrect as boolean} />
                          <Label htmlFor="mat-hard" className="text-[11px] font-bold leading-tight cursor-pointer">Fehler ist schwer korrigierbar</Label>
                        </div>
                        <div className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer" onClick={() => setMatrixAutomatedDecision(!matrixAutomatedDecision)}>
                          <Checkbox id="mat-auto" checked={matrixAutomatedDecision as boolean} />
                          <Label htmlFor="mat-auto" className="text-[11px] font-bold leading-tight cursor-pointer">Fließt in automatisierte Entscheidungen</Label>
                        </div>
                        <div className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer" onClick={() => setMatrixPlanning(!matrixPlanning)}>
                          <Checkbox id="mat-plan" checked={matrixPlanning as boolean} />
                          <Label htmlFor="mat-plan" className="text-[11px] font-bold leading-tight cursor-pointer">Fließt in strategische Planung</Label>
                        </div>
                      </div>
                    </div>

                    <div className="pt-6 border-t flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <p className="text-[10px] font-black uppercase text-slate-400">Score:</p>
                        <Badge className="bg-accent text-white rounded-lg font-black text-sm px-3 h-7 shadow-md">{currentScore} Pkt.</Badge>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="text-[10px] font-black uppercase text-slate-400">Stufe:</p>
                        <Badge className={cn(
                          "rounded-full font-black uppercase text-[10px] px-4 h-7 border-none shadow-md",
                          currentLevel === 'high' ? "bg-red-600 text-white" : currentLevel === 'medium' ? "bg-orange-500 text-white" : "bg-emerald-500 text-white"
                        )}>{currentLevel}</Badge>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="cia" className="mt-0 space-y-8 animate-in fade-in">
                  <div className="p-6 bg-white border rounded-2xl shadow-sm space-y-8">
                    <div className="flex items-center gap-3 border-b pb-3">
                      <ShieldCheck className="w-5 h-5 text-indigo-600" />
                      <h4 className="text-xs font-black uppercase text-slate-900 tracking-widest">Inhärenten Schutzbedarf definieren (CIA)</h4>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase text-slate-400 ml-1">Vertraulichkeit</Label>
                        <Select value={confidentialityReq} onValueChange={(v:any) => setConfidentialityReq(v)}>
                          <SelectTrigger className="rounded-xl h-11 border-slate-200 bg-white"><SelectValue /></SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="low" className="text-[10px] font-bold uppercase">LOW</SelectItem>
                            <SelectItem value="medium" className="text-[10px] font-bold uppercase text-orange-600">MEDIUM</SelectItem>
                            <SelectItem value="high" className="text-[10px] font-bold uppercase text-red-600">HIGH</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase text-slate-400 ml-1">Integrität</Label>
                        <Select value={integrityReq} onValueChange={(v:any) => setIntegrityReq(v)}>
                          <SelectTrigger className="rounded-xl h-11 border-slate-200 bg-white"><SelectValue /></SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="low" className="text-[10px] font-bold uppercase">LOW</SelectItem>
                            <SelectItem value="medium" className="text-[10px] font-bold uppercase text-orange-600">MEDIUM</SelectItem>
                            <SelectItem value="high" className="text-[10px] font-bold uppercase text-red-600">HIGH</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase text-slate-400 ml-1">Verfügbarkeit</Label>
                        <Select value={availabilityReq} onValueChange={(v:any) => setAvailabilityReq(v)}>
                          <SelectTrigger className="rounded-xl h-11 border-slate-200 bg-white"><SelectValue /></SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="low" className="text-[10px] font-bold uppercase">LOW</SelectItem>
                            <SelectItem value="medium" className="text-[10px] font-bold uppercase text-orange-600">MEDIUM</SelectItem>
                            <SelectItem value="high" className="text-[10px] font-bold uppercase text-red-600">HIGH</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="deps" className="mt-0 space-y-8 animate-in fade-in">
                  <div className="p-6 bg-white border rounded-2xl shadow-sm space-y-6">
                    <div className="flex items-center gap-3 border-b pb-3">
                      <Network className="w-5 h-5 text-orange-600" />
                      <h4 className="text-xs font-black uppercase text-slate-900 tracking-widest">Abhängige Datenobjekte (Änderungsverbund)</h4>
                    </div>
                    <div className="space-y-4">
                      <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-orange-600 transition-colors" />
                        <Input 
                          placeholder="Weitere Objekte suchen..." 
                          value={depSearch} 
                          onChange={e => setDepSearch(e.target.value)}
                          className="pl-10 h-11 rounded-xl bg-slate-50/50"
                        />
                      </div>
                      <ScrollArea className="h-64 border rounded-2xl bg-slate-50/30 p-2">
                        <div className="space-y-1">
                          {features?.filter(f => f.id !== selectedFeature?.id && f.name.toLowerCase().includes(depSearch.toLowerCase())).map(f => (
                            <div 
                              key={f.id} 
                              className={cn(
                                "flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border",
                                selectedDepIds.includes(f.id) ? "bg-orange-50 border-orange-200" : "bg-white border-transparent hover:bg-white hover:border-slate-200"
                              )}
                              onClick={() => toggleDependency(f.id)}
                            >
                              <Checkbox checked={selectedDepIds.includes(f.id)} onCheckedChange={() => toggleDependency(f.id)} />
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-800 truncate">{f.name}</p>
                                <p className="text-[8px] font-black uppercase text-slate-400">{f.carrier}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  </div>
                </TabsContent>
              </div>
            </ScrollArea>

            <DialogFooter className="p-4 bg-slate-50 border-t shrink-0 flex flex-col-reverse sm:flex-row gap-2">
              <Button variant="ghost" size="sm" onClick={() => setIsDialogOpen(false)} className="rounded-xl font-bold text-[10px] px-10 h-11 uppercase text-slate-400 hover:bg-white tracking-widest">Abbrechen</Button>
              <Button size="sm" onClick={handleSave} disabled={isSaving} className="rounded-xl h-11 px-16 bg-primary hover:bg-primary/90 text-white font-bold text-[10px] uppercase shadow-lg gap-2 active:scale-95">
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Speichern
              </Button>
            </DialogFooter>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}
