
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
  Scale
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
import { toast } from '@/hooks/use-toast';
import { Risk } from '@/lib/types';

export default function RiskDashboardPage() {
  const { dataSource, activeTenantId } = useSettings();
  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState('');
  const [isRiskDialogOpen, setIsRiskDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedRisk, setSelectedRisk] = useState<Risk | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Allgemein');
  const [impact, setImpact] = useState('3');
  const [probability, setProbability] = useState('3');
  const [owner, setOwner] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'active' | 'mitigated' | 'accepted' | 'closed'>('active');

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
      lastReviewDate: new Date().toISOString()
    };

    try {
      const res = await saveCollectionRecord('risks', id, riskData, dataSource);
      if (res.success) {
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
            <p className="text-sm text-muted-foreground mt-1">Identifikation, Bewertung und Steuerung von Compliance-Risiken.</p>
          </div>
        </div>
        <Button onClick={() => { resetForm(); setIsRiskDialogOpen(true); }} className="h-10 font-bold uppercase text-[10px] rounded-none px-6 bg-orange-600 hover:bg-orange-700">
          <Plus className="w-4 h-4 mr-2" /> Risiko identifizieren
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="rounded-none border-l-4 border-l-red-600 shadow-none">
          <CardContent className="p-4">
            <p className="text-[9px] font-bold uppercase text-muted-foreground">Kritische Risiken</p>
            <h3 className="text-3xl font-bold mt-1">{stats.high}</h3>
          </CardContent>
        </Card>
        <Card className="rounded-none border-l-4 border-l-orange-500 shadow-none">
          <CardContent className="p-4">
            <p className="text-[9px] font-bold uppercase text-muted-foreground">Mittlere Risiken</p>
            <h3 className="text-3xl font-bold mt-1">{stats.medium}</h3>
          </CardContent>
        </Card>
        <Card className="rounded-none border-l-4 border-l-emerald-500 shadow-none">
          <CardContent className="p-4">
            <p className="text-[9px] font-bold uppercase text-muted-foreground">Geringe Risiken</p>
            <h3 className="text-3xl font-bold mt-1">{stats.low}</h3>
          </CardContent>
        </Card>
        <Card className="rounded-none border-l-4 border-l-blue-500 shadow-none">
          <CardContent className="p-4">
            <p className="text-[9px] font-bold uppercase text-muted-foreground">Fällige Reviews</p>
            <h3 className="text-3xl font-bold mt-1">{stats.pendingReviews}</h3>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Heatmap Visual */}
        <Card className="lg:col-span-1 rounded-none border shadow-none bg-slate-50/50">
          <CardHeader className="border-b bg-white py-3">
            <CardTitle className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
              <Scale className="w-3.5 h-3.5 text-orange-600" /> Risiko-Matrix (Impact vs. Prob)
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
                        "flex items-center justify-center border text-[10px] font-bold transition-all relative group",
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
            <div className="mt-6 flex justify-center gap-4 text-[9px] font-bold uppercase text-muted-foreground">
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-red-100 border border-red-200" /> Hoch</div>
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-orange-100 border border-orange-200" /> Mittel</div>
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 bg-emerald-100 border border-emerald-200" /> Niedrig</div>
            </div>
          </CardContent>
        </Card>

        {/* Risk List */}
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
                  <TableHead className="font-bold uppercase text-[10px]">Score (I x P)</TableHead>
                  <TableHead className="font-bold uppercase text-[10px]">Verantwortung</TableHead>
                  <TableHead className="text-right font-bold uppercase text-[10px]">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={4} className="py-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" /></TableCell></TableRow>
                ) : filteredRisks.map((risk) => {
                  const score = risk.impact * risk.probability;
                  const riskMeasures = measures?.filter((m: any) => m.riskId === risk.id) || [];
                  
                  return (
                    <TableRow key={risk.id} className="hover:bg-muted/5 group cursor-pointer" onClick={() => openEdit(risk)}>
                      <TableCell className="py-4">
                        <div className="font-bold text-sm">{risk.title}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-muted-foreground uppercase font-bold">{risk.category}</span>
                          <span className="text-slate-300">|</span>
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Layers className="w-3 h-3" /> {riskMeasures.length} Maßnahmen
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className={cn("inline-flex items-center px-2.5 py-1 border font-black text-xs rounded-none", getRiskColor(score))}>
                          {score}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <UserIcon className="w-3 h-3 text-muted-foreground" />
                          <span className="text-xs font-bold">{risk.owner}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {getRiskStatusBadge(risk.status)}
                          <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredRisks.length === 0 && !isLoading && (
                  <TableRow><TableCell colSpan={4} className="h-32 text-center text-xs text-muted-foreground italic">Keine Risiken für diese Auswahl gefunden.</TableCell></TableRow>
                )}
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
                {selectedRisk ? 'Risiko bearbeiten & bewerten' : 'Neues Risiko identifizieren'}
              </DialogTitle>
            </div>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-white">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2 col-span-2">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground">Titel des Risikos</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="z.B. Verlust von Kundendaten durch SQL-Injection" className="rounded-none h-11 text-base font-bold" />
              </div>
              
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground">Risiko-Kategorie</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="rounded-none h-10"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-none">
                    <SelectItem value="IT-Sicherheit">IT-Sicherheit</SelectItem>
                    <SelectItem value="Datenschutz">Datenschutz (DSGVO)</SelectItem>
                    <SelectItem value="Rechtlich">Rechtlich / Verträge</SelectItem>
                    <SelectItem value="Personal">Personal / Know-How</SelectItem>
                    <SelectItem value="Betrieblich">Betrieblich / Verfügbarkeit</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground">Risikoverantwortlicher (Owner)</Label>
                <Input value={owner} onChange={e => setOwner(e.target.value)} placeholder="Name oder Abteilung" className="rounded-none h-10" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8 pt-6 border-t">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-orange-600" />
                  <h3 className="text-[10px] font-bold uppercase tracking-widest">Quantitative Bewertung</h3>
                </div>
                
                <div className="space-y-6">
                  <div className="space-y-3">
                    <div className="flex justify-between items-end">
                      <Label className="text-[10px] font-bold uppercase">Schadenshöhe (Impact)</Label>
                      <span className="text-xl font-black text-orange-600">{impact}</span>
                    </div>
                    <div className="flex gap-1">
                      {['1', '2', '3', '4', '5'].map(v => (
                        <button 
                          key={v} 
                          onClick={() => setImpact(v)}
                          className={cn(
                            "flex-1 h-8 text-[10px] font-bold border transition-all",
                            impact === v ? "bg-orange-600 border-orange-600 text-white" : "bg-white hover:bg-slate-50"
                          )}
                        >
                          {v === '1' ? 'Gering' : v === '5' ? 'Kritisch' : v}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-end">
                      <Label className="text-[10px] font-bold uppercase">Eintrittswahrscheinlichkeit</Label>
                      <span className="text-xl font-black text-orange-600">{probability}</span>
                    </div>
                    <div className="flex gap-1">
                      {['1', '2', '3', '4', '5'].map(v => (
                        <button 
                          key={v} 
                          onClick={() => setProbability(v)}
                          className={cn(
                            "flex-1 h-8 text-[10px] font-bold border transition-all",
                            probability === v ? "bg-orange-600 border-orange-600 text-white" : "bg-white hover:bg-slate-50"
                          )}
                        >
                          {v === '1' ? 'Selten' : v === '5' ? 'Ständig' : v}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-center justify-center p-6 bg-slate-50 border border-dashed relative overflow-hidden">
                <p className="text-[9px] font-bold uppercase text-muted-foreground mb-2">Berechneter Risiko-Score</p>
                <div className={cn(
                  "text-6xl font-black mb-2 transition-colors",
                  parseInt(impact) * parseInt(probability) >= 15 ? "text-red-600" : parseInt(impact) * parseInt(probability) >= 8 ? "text-orange-500" : "text-emerald-600"
                )}>
                  {parseInt(impact) * parseInt(probability)}
                </div>
                <Badge variant="outline" className="rounded-none uppercase text-[10px] font-bold border-black/10">
                  {parseInt(impact) * parseInt(probability) >= 15 ? "Hochrisiko" : parseInt(impact) * parseInt(probability) >= 8 ? "Mittleres Risiko" : "Geringfügig"}
                </Badge>
              </div>
            </div>

            <div className="space-y-2 pt-6 border-t">
              <Label className="text-[10px] font-bold uppercase text-muted-foreground">Beschreibung & Szenario</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Wie könnte das Risiko eintreten? Welche Folgen hat es?" className="rounded-none min-h-[100px] leading-relaxed" />
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-900 text-white mt-4">
              <div className="flex items-center gap-3">
                <History className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-[10px] font-bold uppercase">Risiko-Status</p>
                  <p className="text-[9px] text-slate-400 uppercase">Aktueller Stand der Behandlung</p>
                </div>
              </div>
              <div className="flex gap-1">
                {[
                  { id: 'active', label: 'Offen' },
                  { id: 'mitigated', label: 'Behandelt' },
                  { id: 'accepted', label: 'Akzeptiert' },
                  { id: 'closed', label: 'Geschlossen' }
                ].map(s => (
                  <button 
                    key={s.id} 
                    onClick={() => setStatus(s.id as any)}
                    className={cn(
                      "px-3 py-1.5 text-[9px] font-bold uppercase border border-white/10 transition-all",
                      status === s.id ? "bg-primary text-white border-primary" : "bg-white/5 hover:bg-white/10 text-slate-300"
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="p-6 bg-slate-50 border-t shrink-0">
            <Button variant="outline" onClick={() => setIsRiskDialogOpen(false)} className="rounded-none h-10 px-8">Abbrechen</Button>
            <Button onClick={handleSaveRisk} disabled={isSaving} className="rounded-none h-10 px-12 font-bold uppercase text-[10px] tracking-widest bg-orange-600 hover:bg-orange-700">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ShieldAlert className="w-4 h-4 mr-2" />} Risiko-Bewertung speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
