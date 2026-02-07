"use client";

import { useState, useMemo, useEffect } from 'react';
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
  Search, 
  Plus, 
  Workflow, 
  Loader2, 
  ChevronRight, 
  Clock,
  Tag,
  MoreVertical,
  Trash2,
  AlertTriangle,
  Network,
  Filter,
  Layers
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { usePluggableCollection } from '@/hooks/data/use-pluggable-collection';
import { useSettings } from '@/context/settings-context';
import { useRouter } from 'next/navigation';
import { createProcessAction, deleteProcessAction } from '@/app/actions/process-actions';
import { usePlatformAuth } from '@/context/auth-context';
import { toast } from '@/hooks/use-toast';
import { Process } from '@/lib/types';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function ProcessHubOverview() {
  const router = useRouter();
  const { dataSource, activeTenantId } = useSettings();
  const { user } = usePlatformAuth();
  const [search, setSearch] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  const [processToDelete, setProcessToDelete] = useState<string | null>(null);

  const { data: processes, isLoading, refresh } = usePluggableCollection<Process>('processes');

  useEffect(() => { setMounted(true); }, []);

  const handleCreate = async () => {
    if (!user || activeTenantId === 'all') {
      toast({ variant: "destructive", title: "Fehler", description: "Wählen Sie einen Mandanten aus (oben rechts)." });
      return;
    }
    setIsCreating(true);
    try {
      const res = await createProcessAction(activeTenantId, "Neuer Prozess", user.id, dataSource);
      if (res.success) {
        toast({ title: "Prozess angelegt" });
        router.push(`/processhub/${res.processId}`);
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Fehler", description: e.message });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!processToDelete) return;
    setIsDeleting(true);
    try {
      const res = await deleteProcessAction(processToDelete, dataSource);
      if (res.success) {
        toast({ title: "Prozess gelöscht" });
        refresh();
      } else throw new Error(res.error);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Fehler", description: e.message });
    } finally {
      setIsDeleting(false);
      setProcessToDelete(null);
    }
  };

  const filtered = useMemo(() => {
    if (!processes) return [];
    return processes.filter(p => {
      const matchesTenant = activeTenantId === 'all' || p.tenantId === activeTenantId;
      const matchesSearch = p.title.toLowerCase().includes(search.toLowerCase());
      return matchesTenant && matchesSearch;
    });
  }, [processes, search, activeTenantId]);

  if (!mounted) return null;

  return (
    <div className="space-y-10 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-200 dark:border-slate-800 pb-8">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-primary/10 text-primary flex items-center justify-center rounded-2xl border-2 border-primary/20 shadow-xl shadow-primary/5">
            <Workflow className="w-9 h-9" />
          </div>
          <div>
            <Badge className="mb-2 rounded-full px-3 py-0 bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest border-none">Workflow Engine</Badge>
            <h1 className="text-4xl font-headline font-bold tracking-tight text-slate-900 dark:text-white uppercase">ProcessHub</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Strukturierte Geschäftsprozesse & ISO 9001 Dokumentation.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" className="h-11 rounded-2xl font-bold uppercase text-[10px] tracking-widest px-6 border-blue-200 text-blue-700 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800 transition-all" onClick={() => router.push('/processhub/map')}>
            <Network className="w-4 h-4 mr-2" /> Prozesslandkarte
          </Button>
          <Button onClick={handleCreate} disabled={isCreating} className="h-11 rounded-2xl font-bold uppercase text-[10px] tracking-widest px-8 bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 transition-all">
            {isCreating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
            Prozess anlegen
          </Button>
        </div>
      </div>

      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
        <Input 
          placeholder="Nach Prozessen suchen..." 
          className="pl-11 h-14 rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 focus:bg-white transition-all shadow-xl shadow-slate-200/20 dark:shadow-none"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-2xl shadow-slate-200/50 dark:shadow-none overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-40 gap-4">
            <Loader2 className="w-12 h-12 animate-spin text-primary opacity-20" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Initialisiere Katalog...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-40 text-center space-y-6">
            <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800 rounded-[2.5rem] flex items-center justify-center mx-auto opacity-50 border-2 border-dashed border-slate-200 dark:border-slate-700">
              <Layers className="w-10 h-10 text-slate-400" />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-black uppercase text-slate-400 tracking-[0.2em]">Keine Prozesse</p>
              <p className="text-xs text-slate-400 font-bold uppercase max-w-xs mx-auto">Für diesen Mandanten wurden noch keine Prozesse modelliert. Beginnen Sie mit der Modellierung über den Button oben rechts.</p>
            </div>
            <Button variant="ghost" className="text-primary text-[10px] font-black uppercase gap-2" onClick={handleCreate}>
              <Plus className="w-3.5 h-3.5" /> Ersten Prozess erstellen
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-slate-50/50 dark:bg-slate-950/50">
              <TableRow className="hover:bg-transparent border-slate-100 dark:border-slate-800">
                <TableHead className="py-6 px-10 font-black uppercase tracking-[0.2em] text-[10px] text-slate-400 dark:text-slate-500">Bezeichnung</TableHead>
                <TableHead className="font-black uppercase tracking-[0.2em] text-[10px] text-slate-400 dark:text-slate-500">Status</TableHead>
                <TableHead className="font-black uppercase tracking-[0.2em] text-[10px] text-slate-400 dark:text-slate-500">Version</TableHead>
                <TableHead className="font-black uppercase tracking-[0.2em] text-[10px] text-slate-400 dark:text-slate-500">Letzte Änderung</TableHead>
                <TableHead className="text-right px-10 font-black uppercase tracking-[0.2em] text-[10px] text-slate-400 dark:text-slate-500">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(p => (
                <TableRow key={p.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 border-slate-100 dark:border-slate-800 transition-colors cursor-pointer" onClick={() => router.push(`/processhub/${p.id}`)}>
                  <TableCell className="py-5 px-10">
                    <div>
                      <div className="font-bold text-sm text-slate-800 dark:text-slate-100 group-hover:text-primary transition-colors">{p.title}</div>
                      <div className="text-[9px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest flex items-center gap-2 mt-1">
                        <Tag className="w-3 h-3" /> {p.tags || 'Keine Tags'}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn(
                      "rounded-full text-[9px] font-black uppercase px-3 h-6 border-none",
                      p.status === 'published' ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400" : "bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                    )}>
                      {p.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs font-black text-slate-700 dark:text-slate-300">V{p.currentVersion}.0</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                      <Clock className="w-3.5 h-3.5 opacity-50" /> 
                      {p.updatedAt ? new Date(p.updatedAt).toLocaleDateString() : '—'}
                    </div>
                  </TableCell>
                  <TableCell className="text-right px-10">
                    <div className="flex justify-end gap-2" onClick={e => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-white dark:hover:bg-slate-700 shadow-sm opacity-0 group-hover:opacity-100 transition-all" onClick={() => router.push(`/processhub/${p.id}`)}>
                        <ChevronRight className="w-5 h-5 text-slate-400" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"><MoreVertical className="w-4 h-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2 shadow-2xl border-slate-100 dark:border-slate-800">
                          <DropdownMenuItem className="rounded-xl py-2.5 gap-3" onSelect={() => router.push(`/processhub/${p.id}`)}><Workflow className="w-4 h-4" /> Designer öffnen</DropdownMenuItem>
                          <DropdownMenuSeparator className="my-2" />
                          <DropdownMenuItem className="text-red-600 dark:text-red-400 rounded-xl py-2.5 gap-3" onSelect={() => setProcessToDelete(p.id)}>
                            <Trash2 className="w-4 h-4" /> Prozess löschen
                          </DropdownMenuItem>
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

      <AlertDialog open={!!processToDelete} onOpenChange={val => !val && setProcessToDelete(null)}>
        <AlertDialogContent className="rounded-[2.5rem] border-none shadow-2xl p-10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-headline font-bold text-red-600 uppercase tracking-tight flex items-center gap-3">
              <AlertTriangle className="w-7 h-7" /> Prozess löschen?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-slate-500 font-medium leading-relaxed pt-2">
              Diese Aktion löscht den gesamten Prozess inklusive aller grafischen Diagramm-Daten und Revisionen permanent. Dies kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-6">
            <AlertDialogCancel className="rounded-xl font-bold uppercase text-[10px] tracking-widest h-12 px-8 active:scale-95 transition-transform">Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 rounded-xl font-black uppercase text-[10px] tracking-widest h-12 px-10 active:scale-95 transition-transform" disabled={isDeleting}>
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Prozess permanent löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
