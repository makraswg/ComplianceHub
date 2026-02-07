
"use client";

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Workflow, 
  Loader2, 
  ChevronRight, 
  ArrowRight,
  GitBranch,
  Layers,
  Search,
  Network,
  ChevronLeft
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { usePluggableCollection } from '@/hooks/data/use-pluggable-collection';
import { useSettings } from '@/context/settings-context';
import { useRouter } from 'next/navigation';
import { Process, ProcessVersion } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

export default function ProcessMapPage() {
  const router = useRouter();
  const { activeTenantId } = useSettings();
  const [search, setSearch] = useState('');
  const [mounted, setMounted] = useState(false);

  const { data: processes, isLoading: isProcLoading } = usePluggableCollection<Process>('processes');
  const { data: versions, isLoading: isVerLoading } = usePluggableCollection<ProcessVersion>('process_versions');

  useEffect(() => { setMounted(true); }, []);

  const processRelations = useMemo(() => {
    if (!processes || !versions) return [];
    
    const relations: { fromId: string; toId: string; label: string }[] = [];
    
    versions.forEach(ver => {
      const fromProc = processes.find(p => p.id === ver.process_id);
      if (!fromProc) return;
      
      const nodes = ver.model_json?.nodes || [];
      nodes.filter(n => n.type === 'end' && !!n.targetProcessId && n.targetProcessId !== 'none').forEach(node => {
        relations.push({
          fromId: fromProc.id,
          toId: node.targetProcessId!,
          label: node.title
        });
      });
    });
    
    return relations;
  }, [processes, versions]);

  const filteredProcesses = useMemo(() => {
    if (!processes) return [];
    return processes.filter(p => {
      const matchTenant = activeTenantId === 'all' || p.tenantId === activeTenantId;
      const matchSearch = p.title.toLowerCase().includes(search.toLowerCase());
      return matchTenant && matchSearch;
    });
  }, [processes, search, activeTenantId]);

  if (!mounted) return null;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex items-center justify-between border-b pb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/processhub')} className="h-10 w-10">
            <ChevronLeft className="w-6 h-6" />
          </Button>
          <div className="w-12 h-12 bg-blue-500/10 text-blue-600 flex items-center justify-center border-2 border-blue-500/20">
            <Network className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight uppercase font-headline">Prozesslandkarte</h1>
            <p className="text-sm text-muted-foreground mt-1">Interaktive Übersicht der vernetzten Geschäftsabläufe.</p>
          </div>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input 
          placeholder="Nach Prozessen in der Karte suchen..." 
          className="pl-10 h-12 border-2 bg-white rounded-none shadow-none"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProcesses.map(proc => {
          const outgoing = processRelations.filter(r => r.fromId === proc.id);
          const incoming = processRelations.filter(r => r.toId === proc.id);
          
          return (
            <Card key={proc.id} className="rounded-none border-2 shadow-none hover:border-primary/50 transition-all group flex flex-col bg-card">
              <CardHeader className="bg-slate-900 text-white p-4 shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Workflow className="w-4 h-4 text-primary" />
                    <CardTitle className="text-xs font-black uppercase truncate max-w-[200px]">{proc.title}</CardTitle>
                  </div>
                  <Badge className="bg-blue-600 text-white rounded-none text-[8px] h-4">V{proc.currentVersion}</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-6 flex-1 flex flex-col space-y-6">
                <div className="space-y-3 flex-1">
                  <p className="text-[9px] font-black uppercase text-slate-400 border-b pb-1">Verknüpfte Vorgänger</p>
                  <div className="space-y-1.5">
                    {incoming.length > 0 ? incoming.map((rel, i) => (
                      <div key={i} className="flex items-center gap-2 text-[10px] bg-slate-50 p-2 border border-dashed rounded-none italic text-slate-600">
                        <ArrowRight className="w-3 h-3 text-slate-300" />
                        {processes?.find(p => p.id === rel.fromId)?.title}
                      </div>
                    )) : <p className="text-[9px] text-slate-300 italic">Keine Vorgänger-Verknüpfung</p>}
                  </div>
                </div>

                <div className="space-y-3 flex-1">
                  <p className="text-[9px] font-black uppercase text-emerald-600 border-b pb-1">Folgeprozesse (Output)</p>
                  <div className="space-y-1.5">
                    {outgoing.length > 0 ? outgoing.map((rel, i) => (
                      <div key={i} className="flex items-center gap-2 text-[10px] bg-emerald-50/50 p-2 border border-emerald-100 rounded-none font-bold text-emerald-900 group-hover:bg-emerald-50 transition-colors">
                        <ArrowRightCircle className="w-3 h-3 text-emerald-500" />
                        {processes?.find(p => p.id === rel.toId)?.title}
                      </div>
                    )) : <p className="text-[9px] text-slate-300 italic">Kein Handover konfiguriert</p>}
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <Button 
                    className="w-full h-10 rounded-none bg-slate-900 hover:bg-black text-white text-[10px] font-black uppercase tracking-widest gap-2"
                    onClick={() => router.push(`/processhub/${proc.id}`)}
                  >
                    Designer Öffnen <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {isProcLoading && (
        <div className="flex flex-col items-center justify-center py-40 gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Generiere Landkarte...</p>
        </div>
      )}
    </div>
  );
}
