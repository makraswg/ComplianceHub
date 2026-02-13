
"use client";

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ScrollText, 
  Plus, 
  Search, 
  Loader2, 
  Filter,
  FileUp,
  MoreVertical,
  Trash2,
  Pencil,
  Building2,
  Clock,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  ChevronRight,
  Eye,
  Activity,
  FileCheck,
  Info,
  CalendarDays,
  Briefcase,
  AlertTriangle,
  FileText,
  Save,
  CheckCircle2,
  Zap,
  LayoutGrid,
  Library,
  Network
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePluggableCollection } from '@/hooks/data/use-pluggable-collection';
import { useSettings } from '@/context/settings-context';
import { usePlatformAuth } from '@/context/auth-context';
import { Policy, JobTitle, Department, PolicyVersion, MediaFile } from '@/lib/types';
import { savePolicyAction, deletePolicyAction, commitPolicyVersionAction } from '@/app/actions/policy-actions';
import { saveMediaAction } from '@/app/actions/media-actions';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';

export default function PoliciesPage() {
  const router = useRouter();
  const { user } = usePlatformAuth();
  const { dataSource, activeTenantId } = useSettings();
  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [type, setType] = useState<Policy['type']>('DA');
  const [ownerRoleId, setOwnerRoleId] = useState('');
  const [reviewInterval, setReviewInterval] = useState('365');
  const [importFile, setImportFile] = useState<File | null>(null);

  const { data: policies, isLoading, refresh } = usePluggableCollection<Policy>('policies');
  const { data: jobTitles } = usePluggableCollection<JobTitle>('jobTitles');

  useEffect(() => { setMounted(true); }, []);

  const handleSave = async () => {
    if (!title || !type) {
      toast({ variant: "destructive", title: "Fehler", description: "Titel und Typ sind erforderlich." });
      return;
    }

    setIsSaving(true);
    try {
      const targetTenantId = activeTenantId === 'all' ? 't1' : activeTenantId;
      const res = await savePolicyAction({
        ...selectedPolicy,
        title,
        type,
        ownerRoleId: ownerRoleId === 'none' ? undefined : ownerRoleId,
        reviewInterval: parseInt(reviewInterval),
        tenantId: targetTenantId
      }, dataSource, user?.email || 'system');

      if (res.success && importFile) {
        const reader = new FileReader();
        reader.onload = async (e) => {
          const base64 = e.target?.result as string;
          const content = `# Importiertes Dokument: ${importFile.name}\n\nDieses Dokument wurde als PDF/Datei importiert. Der Originalinhalt ist als Anhang verfügbar.\n\n---\n*System-Notiz: Import am ${new Date().toLocaleString()}*`;
          await commitPolicyVersionAction(res.policyId, 1, content, "Initialer Dokumenten-Import", user?.email || 'system', dataSource, true);
          
          const mediaId = `med-pol-${Math.random().toString(36).substring(2, 7)}`;
          await saveMediaAction({
            id: mediaId,
            tenantId: targetTenantId,
            module: 'PolicyHub',
            entityId: res.policyId,
            fileName: importFile.name,
            fileType: importFile.type,
            fileSize: importFile.size,
            fileUrl: base64,
            createdAt: new Date().toISOString(),
            createdBy: user?.email || 'system'
          }, dataSource);
        };
        reader.readAsDataURL(importFile);
      }

      if (res.success) {
        toast({ title: selectedPolicy ? "Richtlinie aktualisiert" : "Richtlinie registriert" });
        setIsDialogOpen(false);
        resetForm();
        refresh();
      }
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setSelectedPolicy(null);
    setTitle('');
    setType('DA');
    setOwnerRoleId('none');
    setReviewInterval('365');
    setImportFile(null);
  };

  const openEdit = (p: Policy) => {
    setSelectedPolicy(p);
    setTitle(p.title);
    setType(p.type);
    setOwnerRoleId(p.ownerRoleId || 'none');
    setReviewInterval(p.reviewInterval.toString());
    setImportFile(null);
    setIsDialogOpen(true);
  };

  const filteredPolicies = useMemo(() => {
    if (!policies) return [];
    return policies.filter(p => {
      const matchTenant = activeTenantId === 'all' || p.tenantId === activeTenantId;
      const matchSearch = p.title.toLowerCase().includes(search.toLowerCase());
      const matchType = typeFilter === 'all' || p.type === typeFilter;
      return matchTenant && matchSearch && matchType;
    }).sort((a, b) => a.title.localeCompare(b.title));
  }, [policies, search, typeFilter, activeTenantId]);

  if (!mounted) return null;

  return (
    <div className="p-4 md:p-8 space-y-6 pb-10 w-full mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b pb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-500/10 text-emerald-600 flex items-center justify-center rounded-xl border border-emerald-500/10 shadow-sm">
            <ScrollText className="w-6 h-6" />
          </div>
          <div>
            <Badge className="mb-1 rounded-full px-2 py-0 bg-emerald-100 text-emerald-700 text-[9px] font-bold border-none uppercase tracking-widest">Policy Hub</Badge>
            <h1 className="text-2xl font-headline font-bold text-slate-900 dark:text-white uppercase tracking-tight">Richtlinien & Vorgaben</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Zentrale Verwaltung eigenständiger Dokumente und Richtlinien.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" className="h-9 rounded-xl font-bold text-xs px-6 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg active:scale-95 transition-all" onClick={() => { resetForm(); setIsDialogOpen(true); }}>
            <Plus className="w-3.5 h-3.5 mr-2" /> Neues Dokument
          </Button>
        </div>
      </div>

      <div className="flex flex-row items-center gap-3 bg-white dark:bg-slate-900 p-2 rounded-xl border shadow-sm">
        <div className="relative flex-1 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-focus-within:text-emerald-600 transition-colors" />
          <Input 
            placeholder="Dokument suchen..." 
            className="pl-9 h-9 rounded-lg border-slate-200 bg-slate-50/50 focus:bg-white transition-all shadow-none text-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 h-9 shrink-0">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="border-none shadow-none h-full rounded-sm bg-transparent text-[10px] font-bold min-w-[140px]">
              <Filter className="w-3 h-3 mr-1.5 text-slate-400" />
              <SelectValue placeholder="Typ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Typen</SelectItem>
              <SelectItem value="DA">Dienstanweisung</SelectItem>
              <SelectItem value="BV">Betriebsvereinbarung</SelectItem>
              <SelectItem value="ISK">Sicherheitskonzept</SelectItem>
              <SelectItem value="DS">Datenschutz</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-20 text-center"><Loader2 className="w-8 h-8 animate-spin text-emerald-600 opacity-20 mx-auto" /></div>
        ) : filteredPolicies.length === 0 ? (
          <div className="py-20 text-center space-y-4 opacity-30">
            <ScrollText className="w-12 h-12 mx-auto text-slate-300" />
            <p className="text-xs font-black uppercase">Keine Dokumente gefunden</p>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="border-b">
                <TableHead className="py-4 px-6 font-bold text-[11px] text-slate-400 uppercase tracking-widest">Dokument / Titel</TableHead>
                <TableHead className="font-bold text-[11px] text-slate-400 uppercase tracking-widest">Typ</TableHead>
                <TableHead className="font-bold text-[11px] text-slate-400 uppercase tracking-widest">Status</TableHead>
                <TableHead className="font-bold text-[11px] text-slate-400 uppercase tracking-widest">Version</TableHead>
                <TableHead className="text-right px-6 font-bold text-[11px] text-slate-400 uppercase tracking-widest">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPolicies.map(p => (
                <TableRow key={p.id} className="group hover:bg-slate-50 transition-colors border-b last:border-0 cursor-pointer" onClick={() => router.push(`/policies/${p.id}`)}>
                  <TableCell className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center border shadow-inner bg-emerald-50 text-emerald-600 border-emerald-100">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-sm text-slate-800 group-hover:text-emerald-600 transition-colors">{p.title}</div>
                        <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">{p.tenantId}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[8px] font-black h-4 px-1.5 border-slate-200 text-slate-500 uppercase">{p.type}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={cn(
                      "rounded-full text-[9px] font-black h-5 px-3 border-none shadow-sm uppercase",
                      p.status === 'published' ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-500"
                    )}>{p.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-[10px] font-bold text-slate-600">V{p.currentVersion}.0</span>
                  </TableCell>
                  <TableCell className="text-right px-6" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-white shadow-sm" onClick={() => router.push(`/policies/${p.id}`)}><Eye className="w-3.5 h-3.5 text-primary" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md opacity-0 group-hover:opacity-100 transition-all hover:bg-white shadow-sm" onClick={() => openEdit(p)}><Pencil className="w-3.5 h-3.5 text-slate-400" /></Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 rounded-md hover:bg-slate-100 transition-all shadow-sm"><MoreVertical className="w-4 h-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl w-56 p-1 shadow-2xl border">
                          <DropdownMenuItem onSelect={() => router.push(`/policies/${p.id}`)} className="rounded-lg py-2.5 gap-3 text-xs font-bold"><Eye className="w-4 h-4 text-emerald-600" /> Details & Editor</DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => openEdit(p)} className="rounded-lg py-2.5 gap-3 text-xs font-bold"><Pencil className="w-4 h-4 text-slate-400" /> Metadaten</DropdownMenuItem>
                          <DropdownMenuSeparator className="my-1" />
                          <DropdownMenuItem className="text-red-600 rounded-lg py-2.5 gap-3 text-xs font-bold" onSelect={() => { if(confirm("Richtlinie permanent löschen?")) deletePolicyAction(p.id, dataSource).then(() => refresh()); }}><Trash2 className="w-4 h-4" /> Löschen</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Manual Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(v) => !v && setIsDialogOpen(false)}>
        <DialogContent className="max-w-xl w-[95vw] rounded-2xl p-0 overflow-hidden flex flex-col border-none shadow-2xl bg-white">
          <DialogHeader className="p-6 bg-slate-800 text-white shrink-0 pr-10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400 border border-white/10 shadow-lg">
                <ScrollText className="w-6 h-6" />
              </div>
              <div>
                <DialogTitle className="text-lg font-headline font-bold uppercase tracking-tight">{selectedPolicy ? 'Richtlinie bearbeiten' : 'Neue Richtlinie anlegen'}</DialogTitle>
                <DialogDescription className="text-[10px] text-white/50 font-bold uppercase tracking-widest mt-0.5">Dokumenten-Governance & Versionierung</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <ScrollArea className="max-h-[70vh]">
            <div className="p-8 space-y-8">
              <div className="space-y-2">
                <Label required className="text-[10px] font-bold uppercase text-slate-400 ml-1">Titel des Dokuments</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} className="rounded-xl h-12 font-bold" placeholder="z.B. IT-Sicherheitsleitlinie..." />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-slate-400 ml-1">Dokumenten-Typ</Label>
                  <Select value={type} onValueChange={(v: any) => setType(v)}>
                    <SelectTrigger className="rounded-xl h-11"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="DA">Dienstanweisung</SelectItem>
                      <SelectItem value="BV">Betriebsvereinbarung</SelectItem>
                      <SelectItem value="ISK">Sicherheitskonzept</SelectItem>
                      <SelectItem value="DS">Datenschutz</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-slate-400 ml-1">Review-Zyklus (Tage)</Label>
                  <Input type="number" value={reviewInterval} onChange={e => setReviewInterval(e.target.value)} className="rounded-xl h-11" />
                </div>
              </div>

              {!selectedPolicy && (
                <div className="space-y-4 pt-4 border-t border-dashed">
                  <Label className="text-[10px] font-black uppercase text-emerald-600 flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 fill-current" /> Quick Start: Dokumenten-Import
                  </Label>
                  <div className="p-6 border-2 border-dashed rounded-2xl bg-slate-50 flex flex-col items-center justify-center text-center gap-2 hover:bg-white transition-all cursor-pointer group" onClick={() => document.getElementById('file-import')?.click()}>
                    <input type="file" id="file-import" className="hidden" onChange={e => setImportFile(e.target.files?.[0] || null)} />
                    <FileUp className="w-8 h-8 text-slate-300 group-hover:text-emerald-500 transition-colors" />
                    {importFile ? (
                      <p className="text-xs font-bold text-emerald-600">{importFile.name}</p>
                    ) : (
                      <>
                        <p className="text-xs font-bold text-slate-700">Existierende Datei hochladen</p>
                        <p className="text-[10px] text-slate-400">PDF oder Word importiert Metadaten und Archiv-Kopie</p>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <DialogFooter className="p-4 bg-slate-50 border-t flex gap-2">
            <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="rounded-xl font-bold text-[10px] px-8 uppercase">Abbrechen</Button>
            <Button onClick={handleSave} disabled={isSaving || !title} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] px-12 h-11 shadow-lg gap-2 uppercase">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
