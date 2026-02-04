
"use client";

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  AlertTriangle, 
  BarChart3, 
  Plus, 
  Search, 
  ShieldAlert, 
  ArrowUpRight, 
  History,
  CheckCircle2,
  Clock,
  MoreHorizontal,
  Pencil,
  Trash2,
  ChevronRight,
  Info,
  Layers,
  User as UserIcon,
  Loader2,
  Scale,
  CalendarCheck
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
import { cn } from '@/lib/utils';
import { saveCollectionRecord, deleteCollectionRecord } from '@/app/actions/mysql-actions';
import { logAuditEventAction } from '@/app/actions/audit-actions';
import { toast } from '@/hooks/use-toast';
import { Risk } from '@/lib/types';
import { usePlatformAuth } from '@/context/auth-context';

export default function RiskDashboardPage() {
  const { dataSource, activeTenantId } = useSettings();
  const { user: authUser } = usePlatformAuth();
  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState('');
  
  // Modals
  const [isRiskDialogOpen, setIsRiskDialogOpen] = useState(false);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedRisk, setSelectedRisk] = useState<Risk | null>(null);

  // Form State Risk
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Allgemein');
  const [impact, setImpact] = useState('3');
  const [probability, setProbability] = useState('3');
  const [owner, setOwner] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'active' | 'mitigated' | 'accepted' | 'closed'>('active');

  // Form State Review
  const [reviewComment, setReviewComment] = useState('');

  const { data: risks, isLoading, refresh } = usePluggableCollection<Risk>('risks');
  const { data: measures } = usePluggableCollection<any>('riskMeasures');

  useEffect(() => {
    setMounted(true);
  }, []);

  const getRiskColor = (score: number) => {
    if (score >= 15) return 'text-red-600 bg-red-50 border-red-200';
    if (score >= 8) return 'text-orange-600 bg-orange-50 border-orange-200';
    return 'text-emerald-600 bg-emerald-50 border-emerald-200';
  };

  const getRiskStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <Badge className="bg-red-500 rounded-none uppercase text-[8px]">Kritisch</Badge>;
      case 'mitigated': return <Badge className="bg-emerald-500 rounded-none uppercase text-[8px]">Behandelt</Badge>;
      case 'accepted': return <Badge className="bg-blue-500 rounded-none uppercase text-[8px]">Akzeptiert</Badge>;
      default: return <Badge variant="outline" className="rounded-none uppercase text-[8px]">Inaktiv</Badge>;
    }
  };

  const handleSaveRisk = async () => {
    if (!title) return;
    setIsSaving(true);
    const id = selectedRisk?.id || `risk-${Math.random().toString(36).substring(2, 9)}`;
    const isNew = !selectedRisk;
    
    const riskData: Risk = {
      id,
      tenantId: activeTenantId === 'all' ? 't1' : activeTenantId,
      title,
      category,
      impact: parseInt(impact),
      probability: parseInt(probability),
      owner,
      description,
      status,
      createdAt: selectedRisk?.createdAt || new Date().toISOString(),
      lastReviewDate: selectedRisk?.lastReviewDate || new Date().toISOString()
    };

    try {
      const res = await saveCollectionRecord('risks', id, riskData, dataSource);
      if (res.success) {
        // Log auditing event
        await logAuditEventAction(dataSource, {
          tenantId: riskData.tenantId,
          actorUid: authUser?.email || 'system',
          action: isNew ? 'Risiko identifiziert' : 'Risiko-Bewertung aktualisiert',
          entityType: 'risk',
          entityId: id,
          after: riskData,
          before: selectedRisk || undefined
        });

        toast({ title: "Risiko gespeichert" });
        setIsRiskDialogOpen(false);
        resetForm();
        refresh();
      } else throw new Error(res.error || "Fehler beim Speichern");
    } catch (e: any) {
      toast({ variant: "destructive", title: "Fehler", description: e.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePerformReview = async () => {
    if (!selectedRisk) return;
    setIsSaving(true);
    
    const updatedRisk: Risk = {
      ...selectedRisk,
      impact: parseInt(impact),
      probability: parseInt(probability),
      status: status,
      lastReviewDate: new Date().toISOString()
    };

    try {
      const res = await saveCollectionRecord('risks', selectedRisk.id, updatedRisk, dataSource);
      if (res.success) {
        await logAuditEventAction(dataSource, {
          tenantId: updatedRisk.tenantId,
          actorUid: authUser?.email || 'system',
          action: `Risiko-Review durchgeführt: ${reviewComment || 'Reguläre Prüfung'}`,
          entityType: 'risk',
          entityId: selectedRisk.id,
          after: updatedRisk,
          before: selectedRisk
        });

        toast({ title: "Review abgeschlossen", description: "Die Bewertung wurde revisionssicher protokolliert." });
        setIsReviewDialogOpen(false);
        setReviewComment('');
        refresh();
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Review-Fehler", description: e.message });
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setSelectedRisk(null);
    setTitle('');
    setCategory('Allgemein');
    setImpact('3');
    setProbability('3');
    setOwner('');
    setDescription('');
    setStatus('active');
  };

  const openEdit = (risk: Risk) => {
    setSelectedRisk(risk);
    setTitle(risk.title);
    setCategory(risk.category);
    setImpact(risk.impact.toString());
    setProbability(risk.probability.toString());
    setOwner(risk.owner);
    setDescription(risk.description || '');
    setStatus(risk.status);
    setIsRiskDialogOpen(true);
  };

  const openReview = (risk: Risk) => {
    setSelectedRisk(risk);
    setImpact(risk.impact.toString());
    setProbability(risk.probability.toString());
    setStatus(risk.status);
    setReviewComment('');
    setIsReviewDialogOpen(true);
  };

  const handleDeleteRisk = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Risiko permanent löschen? Dies sollte nur bei Fehleingaben erfolgen.")) return;
    try {
      const res = await deleteCollectionRecord('risks', id, dataSource);
      if (res.success) {
        toast({ title: "Risiko gelöscht" });
        refresh();
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Fehler", description: e.message });
    }
  };

  const filteredRisks = useMemo(() => {
    if (!risks) return [];
    return risks.filter(r => {
      const matchesTenant = activeTenantId === 'all' || r.tenantId === activeTenantId;
      const matchesSearch = r.title.toLowerCase().includes(search.toLowerCase()) || r.owner.toLowerCase().includes(search.toLowerCase());
      return matchesTenant && matchesSearch;
    }).sort((a, b) => (b.impact * b.probability) - (a.impact * a.probability));
  }, [risks, search, activeTenantId]);

  const stats = useMemo(() => {
    if (!filteredRisks) return { high: 0, medium: 0, low: 0, pendingReviews: 0 };
    return {
      high: filteredRisks.filter(r => (r.impact * r.probability) >= 15).length,
      medium: filteredRisks.filter(r => (r.impact * r.probability) >= 8 && (r.impact * r.probability) < 15).length,
      low: filteredRisks.filter(r => (r.impact * r.probability) < 8).length,
      pendingReviews: filteredRisks.filter(r => !r.lastReviewDate || new Date(r.lastReviewDate).getTime() < Date.now() - 90 * 24 * 60 * 60 * 1000).length
    };
  }, [filteredRisks]);

  if (!mounted) return null;

  return (
    <div className="space-y-8 pb-20">
      <div className="flex items-center justify-between border-b pb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-orange-500/10 text-orange-600 flex items-center justify-center border-2 border-orange-500/20">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight uppercase font-headline">Compliance Risikomanagement</h1>
            <p className="text-sm text-muted-foreground mt-1">Zentrale Steuerung und revisionssichere Dokumentation von Risiken.</p>
          </div>
        </div>
        <Button onClick={() => { resetForm(); setIsRiskDialogOpen(true); }} className="h-10 font-bold uppercase text-[10px] rounded-none px-6 bg-orange-600 hover:bg-orange-700 shadow-lg">
          <Plus className="w-4 h-4 mr-2" /> Risiko identifizieren
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="rounded-none border-l-4 border-l-red-600 shadow-none bg-white">
          <CardContent className="p-4">
            <p className="text-[9px] font-bold uppercase text-muted-foreground">Kritische Risiken</p>
            <h3 className="text-3xl font-bold mt-1">{stats.high}</h3>
          </CardContent>
        </Card>
        <Card className="rounded-none border-l-4 border-l-orange-500 shadow-none bg-white">
          <CardContent className="p-4">
            <p className="text-[9px] font-bold uppercase text-muted-foreground">Mittlere Risiken</p>
            <h3 className="text-3xl font-bold mt-1">{stats.medium}</h3>
          </CardContent>
        </Card>
        <Card className="rounded-none border-l-4 border-l-emerald-500 shadow-none bg-white">
          <CardContent className="p-4">
            <p className="text-[9px] font-bold uppercase text-muted-foreground">Geringe Risiken</p>
            <h3 className="text-3xl font-bold mt-1">{stats.low}</h3>
          </CardContent>
        </Card>
        <Card className="rounded-none border-l-4 border-l-blue-500 shadow-none bg-white">
          <CardContent className="p-4">
            <p className="text-[9px] font-bold uppercase text-muted-foreground">Fällige Reviews</p>
            <h3 className="text-3xl font-bold mt-1">{stats.pendingReviews}</h3>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-1 rounded-none border shadow-none bg-slate-50/50">
          <CardHeader className="border-b bg-white py-3">
            <CardTitle className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
              <Scale className="w-3.5 h-3.5 text-orange-600" /> Risiko-Matrix
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-6 gap-1.5 aspect-square">
              <div className="col-span-1 row-span-5 flex flex-col justify-between text-[8px] font-bold text-muted-foreground uppercase py-2">
                <span>Hoch</span>
                <span>Mittel</span>
                <span>Niedrig</span>
              </div>
              <div className="col-span-5 grid grid-cols-5 grid-rows-5 gap-1.5">
                {Array.from({ length: 25 }).map((_, i) => {
                  const x = (i % 5) + 1;
                  const y = 5 - Math.floor(i / 5);
                  const score = x * y;
                  const risksInCell = filteredRisks.filter(r => r.impact === y && r.probability === x).length;
                  
                  return (
                    <div 
                      key={i} 
                      className={cn(
                        "flex items-center justify-center border text-[10px] font-bold transition-all",
                        score >= 15 ? "bg-red-100 border-red-200" : score >= 8 ? "bg-orange-100 border-orange-200" : "bg-emerald-100 border-emerald-200",
                        risksInCell > 0 ? "shadow-inner ring-1 ring-inset ring-black/5" : "opacity-40"
                      )}
                    >
                      {risksInCell > 0 && (
                        <div className="bg-slate-900 text-white rounded-full w-5 h-5 flex items-center justify-center text-[9px] animate-in zoom-in">
                          {risksInCell}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="col-start-2 col-span-5 flex justify-between text-[8px] font-bold text-muted-foreground uppercase px-2">
                <span>Selten</span>
                <span>Mittel</span>
                <span>Häufig</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Risiken oder Verantwortliche suchen..." 
              className="pl-10 h-11 border-2 bg-white rounded-none shadow-none"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="admin-card overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead className="py-4 font-bold uppercase text-[10px]">Risiko / Bereich</TableHead>
                  <TableHead className="font-bold uppercase text-[10px]">Score</TableHead>
                  <TableHead className="font-bold uppercase text-[10px]">Status</TableHead>
                  <TableHead className="text-right font-bold uppercase text-[10px]">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={4} className="py-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></TableCell></TableRow>
                ) : filteredRisks.map((risk) => {
                  const score = risk.impact * risk.probability;
                  const isReviewDue = !risk.lastReviewDate || new Date(risk.lastReviewDate).getTime() < Date.now() - 90 * 24 * 60 * 60 * 1000;
                  
                  return (
                    <TableRow key={risk.id} className="hover:bg-muted/5 group">
                      <TableCell className="py-4">
                        <div className="font-bold text-sm">{risk.title}</div>
                        <div className="flex items-center gap-2 mt-1 text-[9px] font-bold uppercase text-muted-foreground">
                          {risk.category} <span className="text-slate-300">|</span> 
                          <span className={cn(isReviewDue ? "text-red-600" : "text-muted-foreground")}>
                            Review: {risk.lastReviewDate ? new Date(risk.lastReviewDate).toLocaleDateString() : 'Ausstehend'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className={cn("inline-flex items-center px-2 py-0.5 border font-black text-xs", getRiskColor(score))}>
                          {score}
                        </div>
                      </TableCell>
                      <TableCell>{getRiskStatusBadge(risk.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" className="h-8 text-[9px] font-bold uppercase gap-1.5 hover:bg-blue-50 text-blue-600" onClick={() => openReview(risk)}>
                            <CalendarCheck className="w-3.5 h-3.5" /> Review
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="w-4 h-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="rounded-none w-48">
                              <DropdownMenuItem onSelect={() => openEdit(risk)}><Pencil className="w-3.5 h-3.5 mr-2" /> Bearbeiten</DropdownMenuItem>
                              <DropdownMenuItem className="text-red-600" onSelect={(e) => handleDeleteRisk(e as any, risk.id)}><Trash2 className="w-3.5 h-3.5 mr-2" /> Löschen</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Risk Edit Dialog */}
      <Dialog open={isRiskDialogOpen} onOpenChange={setIsRiskDialogOpen}>
        <DialogContent className="max-w-3xl rounded-none p-0 overflow-hidden flex flex-col h-[90vh] border-2 shadow-2xl">
          <DialogHeader className="p-6 bg-slate-900 text-white shrink-0">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              <DialogTitle className="text-sm font-bold uppercase tracking-wider">
                Risiko-Stammdaten pflegen
              </DialogTitle>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-white">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2 col-span-2">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground">Risiko-Bezeichnung</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Kurz & prägnant" className="rounded-none h-11 text-base font-bold" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground">Kategorie</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="rounded-none h-10"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-none">
                    <SelectItem value="IT-Sicherheit">IT-Sicherheit</SelectItem>
                    <SelectItem value="Datenschutz">Datenschutz (DSGVO)</SelectItem>
                    <SelectItem value="Rechtlich">Rechtlich / Verträge</SelectItem>
                    <SelectItem value="Betrieblich">Betrieblich / Verfügbarkeit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground">Verantwortlich (Owner)</Label>
                <Input value={owner} onChange={e => setOwner(e.target.value)} placeholder="Abteilung oder Name" className="rounded-none h-10" />
              </div>
            </div>
            <div className="space-y-2 pt-6 border-t">
              <Label className="text-[10px] font-bold uppercase text-muted-foreground">Szenario / Beschreibung</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Wie entsteht das Risiko? Was sind die Folgen?" className="rounded-none min-h-[120px] leading-relaxed" />
            </div>
          </div>
          <DialogFooter className="p-6 bg-slate-50 border-t shrink-0">
            <Button variant="outline" onClick={() => setIsRiskDialogOpen(false)} className="rounded-none h-10 px-8">Abbrechen</Button>
            <Button onClick={handleSaveRisk} disabled={isSaving} className="rounded-none h-10 px-12 font-bold uppercase text-[10px] tracking-widest bg-orange-600 hover:bg-orange-700">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />} Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review Dialog */}
      <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
        <DialogContent className="max-w-2xl rounded-none p-0 overflow-hidden border-2 shadow-2xl bg-white">
          <DialogHeader className="p-6 bg-blue-900 text-white shrink-0">
            <div className="flex items-center gap-3">
              <CalendarCheck className="w-5 h-5 text-blue-400" />
              <DialogTitle className="text-sm font-bold uppercase tracking-wider">Risiko-Review durchführen</DialogTitle>
            </div>
          </DialogHeader>
          <div className="p-8 space-y-8">
            <div className="admin-card p-4 bg-muted/10">
              <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Zu prüfendes Risiko</p>
              <p className="text-sm font-bold">{selectedRisk?.title}</p>
            </div>

            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-[10px] font-bold uppercase">Schadenshöhe (1-5)</Label>
                  <div className="flex gap-1">
                    {['1', '2', '3', '4', '5'].map(v => (
                      <button key={v} onClick={() => setImpact(v)} className={cn("flex-1 h-8 text-[10px] font-bold border", impact === v ? "bg-blue-600 border-blue-600 text-white" : "bg-white")}>{v}</button>
                    ))}
                  </div>
                </div>
                <div className="space-y-3">
                  <Label className="text-[10px] font-bold uppercase">Eintrittswahrscheinlichkeit (1-5)</Label>
                  <div className="flex gap-1">
                    {['1', '2', '3', '4', '5'].map(v => (
                      <button key={v} onClick={() => setProbability(v)} className={cn("flex-1 h-8 text-[10px] font-bold border", probability === v ? "bg-blue-600 border-blue-600 text-white" : "bg-white")}>{v}</button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="bg-slate-50 border-2 border-dashed flex flex-col items-center justify-center p-4">
                <p className="text-[9px] font-bold uppercase text-muted-foreground">Aktueller Score</p>
                <div className={cn("text-5xl font-black", parseInt(impact)*parseInt(probability) >= 15 ? "text-red-600" : "text-blue-600")}>
                  {parseInt(impact) * parseInt(probability)}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase text-muted-foreground">Prüfvermerk / Änderungsgrund</Label>
              <Textarea value={reviewComment} onChange={e => setReviewComment(e.target.value)} placeholder="Dokumentieren Sie hier kurz die Erkenntnisse aus dem Review..." className="rounded-none min-h-[100px]" />
            </div>
          </div>
          <DialogFooter className="p-6 bg-slate-50 border-t">
            <Button variant="ghost" onClick={() => setIsReviewDialogOpen(false)} className="rounded-none">Abbrechen</Button>
            <Button onClick={handlePerformReview} disabled={isSaving || !reviewComment} className="rounded-none bg-blue-600 hover:bg-blue-700 font-bold uppercase text-[10px] px-10">Review abschließen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Save } from 'lucide-react';
