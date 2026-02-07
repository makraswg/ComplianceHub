
"use client";

import { useState, useMemo, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  AlertTriangle, 
  Plus, 
  Search, 
  Loader2, 
  Library, 
  Filter,
  Layers,
  ShieldAlert,
  Download,
  MoreVertical,
  Activity,
  ArrowRight
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { usePluggableCollection } from '@/hooks/data/use-pluggable-collection';
import { useSettings } from '@/context/settings-context';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { exportRisksExcel } from '@/lib/export-utils';
import { Risk, Resource } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

function RiskDashboardContent() {
  const router = useRouter();
  const { dataSource, activeTenantId } = useSettings();
  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  
  const { data: risks, isLoading } = usePluggableCollection<Risk>('risks');
  const { data: resources } = usePluggableCollection<Resource>('resources');

  useEffect(() => { setMounted(true); }, []);

  const filteredRisks = useMemo(() => {
    if (!risks) return [];
    return risks.filter(r => {
      const matchesTenant = activeTenantId === 'all' || r.tenantId === activeTenantId;
      const matchesCategory = categoryFilter === 'all' || r.category === categoryFilter;
      const matchesSearch = r.title.toLowerCase().includes(search.toLowerCase());
      return matchesTenant && matchesCategory && matchesSearch;
    }).sort((a, b) => (b.impact * b.probability) - (a.impact * a.probability));
  }, [risks, search, categoryFilter, activeTenantId]);

  if (!mounted) return null;

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b pb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-accent/10 text-accent flex items-center justify-center rounded-xl border border-accent/10 shadow-sm transition-transform hover:scale-105">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <Badge className="mb-1 rounded-full px-2 py-0 bg-accent/10 text-accent text-[9px] font-bold border-none uppercase tracking-wider">RiskHub Governance</Badge>
            <h1 className="text-2xl font-headline font-bold text-slate-900 dark:text-white uppercase tracking-tight">Risikoinventar</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Zentrale Bedrohungslage für {activeTenantId === 'all' ? 'alle Standorte' : activeTenantId}.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="h-9 rounded-md font-bold text-xs px-4 border-slate-200 hover:bg-slate-50 transition-all active:scale-95" onClick={() => exportRisksExcel(filteredRisks, resources || [])}>
            <Download className="w-3.5 h-3.5 mr-2" /> Excel Export
          </Button>
          <Button variant="outline" size="sm" onClick={() => router.push('/risks/catalog')} className="h-9 rounded-md font-bold text-xs px-4 border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 transition-all active:scale-95">
            <Library className="w-3.5 h-3.5 mr-2" /> Gefährdungskatalog
          </Button>
          <Button size="sm" className="h-9 rounded-md font-bold text-xs px-6 bg-accent hover:bg-accent/90 text-white shadow-sm transition-all active:scale-95">
            <Plus className="w-3.5 h-3.5 mr-2" /> Risiko erfassen
          </Button>
        </div>
      </div>

      <div className="flex flex-row items-center gap-3 bg-white dark:bg-slate-900 p-2 rounded-xl border shadow-sm">
        <div className="relative flex-1 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-focus-within:text-accent transition-colors" />
          <Input 
            placeholder="Risiken oder Assets suchen..." 
            className="pl-9 h-9 rounded-md border-slate-200 bg-slate-50/50 focus:bg-white transition-all shadow-none text-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-md border border-slate-200 dark:border-slate-700 h-9 shrink-0">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="border-none shadow-none h-full rounded-sm bg-transparent text-[10px] font-bold min-w-[160px] hover:bg-white/50 transition-all">
              <Filter className="w-3 h-3 mr-1.5 text-slate-400" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all" className="text-xs">Alle Kategorien</SelectItem>
              <SelectItem value="IT-Sicherheit" className="text-xs">IT-Sicherheit</SelectItem>
              <SelectItem value="Datenschutz" className="text-xs">Datenschutz</SelectItem>
              <SelectItem value="Rechtlich" className="text-xs">Rechtlich</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-accent opacity-20" />
            <p className="text-[10px] font-bold text-slate-400">Inventar wird geladen...</p>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="hover:bg-transparent border-b">
                <TableHead className="py-4 px-6 font-bold text-[11px] text-slate-400">Risiko / Bezug</TableHead>
                <TableHead className="font-bold text-[11px] text-slate-400 text-center">Score</TableHead>
                <TableHead className="font-bold text-[11px] text-slate-400">Kategorie</TableHead>
                <TableHead className="font-bold text-[11px] text-slate-400">Status</TableHead>
                <TableHead className="text-right px-6 font-bold text-[11px] text-slate-400">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRisks.map((risk) => {
                const score = risk.impact * risk.probability;
                const asset = resources?.find(r => r.id === risk.assetId);
                return (
                  <TableRow key={risk.id} className="group hover:bg-slate-50 transition-colors border-b last:border-0">
                    <TableCell className="py-4 px-6">
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border shadow-inner", 
                          score >= 15 ? "bg-red-50 text-red-600 border-red-100" : "bg-orange-50 text-orange-600 border-orange-100"
                        )}>
                          <AlertTriangle className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-sm text-slate-800 group-hover:text-accent transition-colors">{risk.title}</div>
                          {asset && <p className="text-[9px] text-slate-400 font-bold mt-0.5 flex items-center gap-1.5"><Layers className="w-3 h-3 opacity-50" /> {asset.name}</p>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={cn(
                        "rounded-md font-bold text-[10px] h-6 min-w-[32px] justify-center shadow-sm border-none", 
                        score >= 15 ? "bg-red-50 text-red-600" : "bg-orange-50 text-orange-600"
                      )}>{score}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">{risk.category}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="rounded-full text-[8px] font-bold border-slate-200 text-slate-400 px-2 h-5 uppercase">
                        {risk.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="p-4 px-6 text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md opacity-0 group-hover:opacity-100 transition-all hover:bg-white shadow-sm">
                        <MoreVertical className="w-4 h-4 text-slate-400" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredRisks.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-20 text-center space-y-4">
                    <Activity className="w-12 h-12 text-slate-200 mx-auto opacity-20" />
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Keine Risiken in diesem Filter</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}

export default function RiskDashboardPage() {
  return (
    <Suspense fallback={<div className="p-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-accent opacity-20" /></div>}>
      <RiskDashboardContent />
    </Suspense>
  );
}
