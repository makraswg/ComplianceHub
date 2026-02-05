
"use client";

import { useState, useMemo, useEffect } from 'react';
import { 
  Library, 
  Search, 
  ChevronRight, 
  Plus, 
  Loader2, 
  ArrowRight,
  Info,
  Database,
  FileJson,
  Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { usePluggableCollection } from '@/hooks/data/use-pluggable-collection';
import { useSettings } from '@/context/settings-context';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Hazard, HazardModule, Catalog } from '@/lib/types';
import { useRouter } from 'next/navigation';

export default function CatalogBrowserPage() {
  const router = useRouter();
  const { dataSource } = useSettings();
  const [search, setSearch] = useState('');
  const [selectedCatalogId, setSelectedCatalogId] = useState<string>('all');
  const [selectedModuleId, setSelectedModuleId] = useState<string>('all');

  const { data: catalogs, isLoading: isCatsLoading } = usePluggableCollection<Catalog>('catalogs');
  const { data: modules, isLoading: isModsLoading } = usePluggableCollection<HazardModule>('hazardModules');
  const { data: hazards, isLoading: isHazardsLoading } = usePluggableCollection<Hazard>('hazards');

  const filteredHazards = useMemo(() => {
    if (!hazards) return [];
    return hazards.filter(h => {
      const matchesSearch = h.title.toLowerCase().includes(search.toLowerCase()) || h.code.toLowerCase().includes(search.toLowerCase());
      const matchesModule = selectedModuleId === 'all' || h.moduleId === selectedModuleId;
      return matchesSearch && matchesModule;
    });
  }, [hazards, search, selectedModuleId]);

  const currentModules = useMemo(() => {
    if (!modules) return [];
    if (selectedCatalogId === 'all') return modules;
    return modules.filter(m => m.catalogId === selectedCatalogId);
  }, [modules, selectedCatalogId]);

  return (
    <div className="space-y-8 pb-20">
      <div className="flex items-center justify-between border-b pb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-500/10 text-blue-600 flex items-center justify-center border-2 border-blue-500/20">
            <Library className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight uppercase font-headline">Gefährdungskatalog</h1>
            <p className="text-sm text-muted-foreground mt-1">Strukturierte Basis für die Risiko-Ableitung nach BSI IT-Grundschutz.</p>
          </div>
        </div>
        <Button variant="outline" className="h-10 font-bold uppercase text-[10px] rounded-none border-primary/20" onClick={() => router.push('/settings?tab=data')}>
          <Database className="w-4 h-4 mr-2" /> Kataloge Verwalten
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Gefährdung suchen (z.B. Malware, Brand, Backup)..." 
            className="pl-10 h-11 border-2 bg-white dark:bg-slate-950 rounded-none shadow-none"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex border bg-card h-11 p-1 gap-1">
          <Select value={selectedCatalogId} onValueChange={setSelectedCatalogId}>
            <SelectTrigger className="border-none shadow-none h-full rounded-none bg-transparent min-w-[180px] text-[10px] font-bold uppercase border-r">
              <SelectValue placeholder="Standard" />
            </SelectTrigger>
            <SelectContent className="rounded-none">
              <SelectItem value="all">Alle Kataloge</SelectItem>
              {catalogs?.map(c => <SelectItem key={c.id} value={c.id}>{c.name} {c.version}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={selectedModuleId} onValueChange={setSelectedModuleId}>
            <SelectTrigger className="border-none shadow-none h-full rounded-none bg-transparent min-w-[180px] text-[10px] font-bold uppercase">
              <SelectValue placeholder="Modul" />
            </SelectTrigger>
            <SelectContent className="rounded-none">
              <SelectItem value="all">Alle Module</SelectItem>
              {currentModules.map(m => <SelectItem key={m.id} value={m.id}>{m.code}: {m.title}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-4">
          <div className="admin-card overflow-hidden">
            <ScrollArea className="h-[650px]">
              {isHazardsLoading ? (
                <div className="flex flex-col items-center justify-center py-40 gap-4">
                  <Loader2 className="w-10 h-10 animate-spin text-primary" />
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Lade Gefährdungen...</p>
                </div>
              ) : (
                <div className="divide-y">
                  {filteredHazards.map(h => {
                    const mod = modules?.find(m => m.id === h.moduleId);
                    return (
                      <div key={h.id} className="p-4 hover:bg-muted/5 transition-colors relative">
                        <div className="flex items-center justify-between gap-6">
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-blue-600 text-white rounded-none text-[8px] font-black h-4 px-1">{h.code}</Badge>
                              <h3 className="font-bold text-sm text-slate-900 dark:text-white leading-tight truncate">{h.title}</h3>
                            </div>
                            <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2">
                              {h.description}
                            </p>
                            <div className="flex items-center gap-2 pt-1">
                              <span className="text-[8px] font-black uppercase text-slate-400 bg-slate-100 px-1 py-0.5">Modul: {mod?.code || '---'}</span>
                              <span className="text-[8px] font-bold uppercase text-slate-400 truncate">{mod?.title}</span>
                            </div>
                          </div>
                          <Button 
                            className="shrink-0 bg-orange-600 hover:bg-orange-700 text-white rounded-none text-[9px] font-black uppercase h-8 px-3 gap-1.5 shadow-sm"
                            onClick={() => router.push(`/risks?derive=${h.id}`)}
                          >
                            <Plus className="w-3 h-3" /> Ableiten
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                  {filteredHazards.length === 0 && (
                    <div className="py-40 text-center space-y-4">
                      <FileJson className="w-12 h-12 text-muted-foreground mx-auto opacity-20" />
                      <p className="text-sm font-bold uppercase text-muted-foreground tracking-widest">Keine Ergebnisse für diese Auswahl.</p>
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        <div className="space-y-6">
          <Card className="rounded-none border-2 border-primary/20 shadow-none bg-primary/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                <Info className="w-3.5 h-3.5 text-primary" /> Wissensbasis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-[11px] leading-relaxed text-slate-700 dark:text-slate-300 italic">
                Der IT-Grundschutz-Katalog des BSI bietet eine standardisierte Basis für die Identifikation von Risiken.
              </p>
              <div className="p-3 bg-white dark:bg-slate-900 border text-[8px] font-black uppercase text-muted-foreground space-y-2">
                <div className="flex justify-between border-b pb-1"><span>Kataloge:</span> <span className="text-primary">{catalogs?.length || 0}</span></div>
                <div className="flex justify-between"><span>Gefährdungen:</span> <span className="text-primary">{hazards?.length || 0}</span></div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-none border shadow-none bg-slate-900 text-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-[9px] font-black uppercase text-orange-500 tracking-[0.2em]">Risiko-Ableitung</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-[10px] leading-relaxed text-slate-300 uppercase font-bold">
                Klicken Sie auf „Ableiten“, um eine Gefährdung in Ihr aktives Risikoinventar zu übernehmen.
              </p>
              <ul className="text-[9px] space-y-2 text-slate-400 font-bold uppercase">
                <li className="flex items-center gap-2"><ArrowRight className="w-2.5 h-2.5 text-orange-500" /> Titel & Beschreibung kopieren</li>
                <li className="flex items-center gap-2"><ArrowRight className="w-2.5 h-2.5 text-orange-500" /> Katalog-Referenz verknüpfen</li>
                <li className="flex items-center gap-2"><ArrowRight className="w-2.5 h-2.5 text-orange-500" /> Kategorie-Vorschlag setzen</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
