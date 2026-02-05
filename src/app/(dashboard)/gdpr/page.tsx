
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
  BadgeAlert
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { usePluggableCollection } from '@/hooks/data/use-pluggable-collection';
import { useSettings } from '@/context/settings-context';
import { saveCollectionRecord, deleteCollectionRecord } from '@/app/actions/mysql-actions';
import { toast } from '@/hooks/use-toast';
import { ProcessingActivity } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function GdprPage() {
  const { dataSource, activeTenantId } = useSettings();
  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<ProcessingActivity | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [responsibleDepartment, setResponsibleDepartment] = useState('');
  const [legalBasis, setLegalBasis] = useState('Art. 6 Abs. 1 lit. b (Vertrag)');
  const [retentionPeriod, setRetentionPeriod] = useState('10 Jahre (Steuerrecht)');
  const [status, setStatus] = useState<ProcessingActivity['status']>('active');

  const { data: activities, isLoading, refresh } = usePluggableCollection<ProcessingActivity>('processingActivities');

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSave = async () => {
    if (!name) return;
    setIsSaving(true);
    const id = selectedActivity?.id || `vvt-${Math.random().toString(36).substring(2, 9)}`;
    const targetTenantId = activeTenantId === 'all' ? 't1' : activeTenantId;

    const data: ProcessingActivity = {
      id,
      tenantId: targetTenantId,
      name,
      description,
      responsibleDepartment,
      legalBasis,
      dataCategories: [],
      subjectCategories: [],
      recipientCategories: '',
      retentionPeriod,
      status,
      lastReviewDate: new Date().toISOString()
    };

    try {
      const res = await saveCollectionRecord('processingActivities', id, data, dataSource);
      if (res.success) {
        toast({ title: "VVT-Eintrag gespeichert" });
        setIsDialogOpen(false);
        refresh();
      } else throw new Error(res.error || "Fehler beim Speichern");
    } catch (e: any) {
      toast({ variant: "destructive", title: "Fehler", description: e.message });
    } finally {
      setIsSaving(false);
    }
  };

  const openEdit = (act: ProcessingActivity) => {
    setSelectedActivity(act);
    setName(act.name);
    setDescription(act.description || '');
    setResponsibleDepartment(act.responsibleDepartment || '');
    setLegalBasis(act.legalBasis || '');
    setRetentionPeriod(act.retentionPeriod || '');
    setStatus(act.status);
    setIsDialogOpen(true);
  };

  const filteredActivities = useMemo(() => {
    if (!activities) return [];
    return activities.filter(a => {
      const matchesTenant = activeTenantId === 'all' || a.tenantId === activeTenantId;
      const matchesSearch = a.name.toLowerCase().includes(search.toLowerCase());
      return matchesTenant && matchesSearch;
    });
  }, [activities, search, activeTenantId]);

  if (!mounted) return null;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between border-b pb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-500/10 text-emerald-600 flex items-center justify-center border-2 border-emerald-500/20">
            <FileCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight uppercase font-headline">Datenschutz Management</h1>
            <p className="text-sm text-muted-foreground mt-1">Verarbeitungsverzeichnis (VVT) gemäß Art. 30 DSGVO.</p>
          </div>
        </div>
        <Button onClick={() => { setSelectedActivity(null); setIsDialogOpen(true); }} className="h-10 font-bold uppercase text-[10px] rounded-none bg-emerald-600 hover:bg-emerald-700 text-white">
          <Plus className="w-4 h-4 mr-2" /> Neue Tätigkeit erfassen
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 border bg-white flex flex-col gap-2">
          <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Aktive Verarbeitungen</p>
          <p className="text-3xl font-black">{activities?.length || 0}</p>
        </div>
        <div className="p-6 border bg-white flex flex-col gap-2">
          <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Offene Prüfungen</p>
          <p className="text-3xl font-black text-orange-600">3</p>
        </div>
        <div className="p-6 border bg-white flex flex-col gap-2">
          <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">DSGVO-Compliance Score</p>
          <p className="text-3xl font-black text-emerald-600">92%</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input 
          placeholder="VVT-Einträge durchsuchen..." 
          className="pl-10 h-11 border-2 bg-white dark:bg-slate-900 rounded-none shadow-none"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="admin-card overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead className="py-4 font-bold uppercase text-[10px]">Verarbeitungstätigkeit</TableHead>
              <TableHead className="font-bold uppercase text-[10px]">Rechtsgrundlage</TableHead>
              <TableHead className="font-bold uppercase text-[10px]">Verantwortlich</TableHead>
              <TableHead className="font-bold uppercase text-[10px]">Status</TableHead>
              <TableHead className="text-right font-bold uppercase text-[10px]">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="py-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></TableCell></TableRow>
            ) : filteredActivities.map((act) => (
              <TableRow key={act.id} className="hover:bg-muted/5 group border-b last:border-0">
                <TableCell className="py-4">
                  <div className="font-bold text-sm">{act.name}</div>
                  <div className="text-[9px] text-muted-foreground uppercase font-black truncate max-w-xs">{act.description}</div>
                </TableCell>
                <TableCell className="text-xs font-bold text-slate-600">
                  {act.legalBasis}
                </TableCell>
                <TableCell className="text-xs font-bold uppercase">
                  {act.responsibleDepartment}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={cn(
                    "rounded-none uppercase text-[8px] font-black border-none px-2",
                    act.status === 'active' ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
                  )}>
                    {act.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="w-4 h-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-none w-48">
                      <DropdownMenuItem onSelect={() => openEdit(act)}><Pencil className="w-3.5 h-3.5 mr-2" /> Bearbeiten</DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600" onSelect={() => { if(confirm("Eintrag löschen?")) deleteCollectionRecord('processingActivities', act.id, dataSource).then(() => refresh()); }}><Trash2 className="w-3.5 h-3.5 mr-2" /> Löschen</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl rounded-none p-0 overflow-hidden flex flex-col border-2 shadow-2xl">
          <DialogHeader className="p-6 bg-slate-900 text-white shrink-0">
            <div className="flex items-center gap-3">
              <FileCheck className="w-5 h-5 text-emerald-500" />
              <DialogTitle className="text-sm font-bold uppercase tracking-wider">Verarbeitungstätigkeit erfassen</DialogTitle>
            </div>
          </DialogHeader>
          <ScrollArea className="flex-1 bg-white">
            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground">Name der Tätigkeit</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="z.B. Lohnabrechnung durchführen" className="rounded-none h-10 font-bold" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground">Beschreibung des Prozesses</Label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Was genau passiert hier?" className="rounded-none min-h-[80px]" />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">Verantwortliche Abteilung</Label>
                  <Input value={responsibleDepartment} onChange={e => setResponsibleDepartment(e.target.value)} className="rounded-none h-10" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">Rechtsgrundlage</Label>
                  <Select value={legalBasis} onValueChange={setLegalBasis}>
                    <SelectTrigger className="rounded-none h-10"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-none">
                      <SelectItem value="Art. 6 Abs. 1 lit. a (Einwilligung)">Einwilligung</SelectItem>
                      <SelectItem value="Art. 6 Abs. 1 lit. b (Vertrag)">Vertragserfüllung</SelectItem>
                      <SelectItem value="Art. 6 Abs. 1 lit. c (Rechtl. Verpflichtung)">Rechtliche Verpflichtung</SelectItem>
                      <SelectItem value="Art. 6 Abs. 1 lit. f (Berechtigte Interessen)">Berechtigte Interessen</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">Löschfrist / Aufbewahrung</Label>
                  <Input value={retentionPeriod} onChange={e => setRetentionPeriod(e.target.value)} className="rounded-none h-10" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">Status</Label>
                  <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                    <SelectTrigger className="rounded-none h-10"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-none">
                      <SelectItem value="draft">Entwurf</SelectItem>
                      <SelectItem value="active">Aktiv</SelectItem>
                      <SelectItem value="archived">Archiviert</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="p-6 bg-slate-50 border-t shrink-0">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-none h-10 px-8 font-bold uppercase text-[10px]">Abbrechen</Button>
            <Button onClick={handleSave} disabled={isSaving || !name} className="rounded-none h-10 px-12 font-bold uppercase text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />} Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
