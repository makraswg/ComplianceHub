
"use client";

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  UserCircle, 
  Plus, 
  Trash2, 
  Save, 
  Loader2, 
  Archive, 
  RotateCcw,
  Search,
  Mail,
  Building2,
  Info,
  Pencil
} from 'lucide-react';
import { usePluggableCollection } from '@/hooks/data/use-pluggable-collection';
import { useSettings } from '@/context/settings-context';
import { saveCollectionRecord, deleteCollectionRecord } from '@/app/actions/mysql-actions';
import { toast } from '@/hooks/use-toast';
import { SystemOwner } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function SystemOwnersSettingsPage() {
  const { dataSource, activeTenantId } = useSettings();
  const [isSaving, setIsSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  
  const [editingOwner, setEditingOwner] = useState<SystemOwner | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('');

  const { data: owners, refresh, isLoading } = usePluggableCollection<SystemOwner>('systemOwners');

  const handleSaveOwner = async () => {
    if (!name) return;
    setIsSaving(true);
    const id = editingOwner?.id || `owner-${Math.random().toString(36).substring(2, 7)}`;
    const data: SystemOwner = {
      id,
      tenantId: activeTenantId === 'all' ? 'global' : activeTenantId,
      name,
      email,
      department,
      status: editingOwner?.status || 'active'
    };

    try {
      const res = await saveCollectionRecord('systemOwners', id, data, dataSource);
      if (res.success) {
        resetForm();
        refresh();
        toast({ title: "Systemverantwortlicher gespeichert" });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setEditingOwner(null);
    setName('');
    setEmail('');
    setDepartment('');
  };

  const toggleStatus = async (item: SystemOwner) => {
    const updated = { ...item, status: item.status === 'active' ? 'archived' : 'active' };
    await saveCollectionRecord('systemOwners', item.id, updated, dataSource);
    refresh();
    toast({ title: "Status aktualisiert" });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Eintrag permanent löschen?")) return;
    await deleteCollectionRecord('systemOwners', id, dataSource);
    refresh();
    toast({ title: "Eintrag entfernt" });
  };

  const filteredOwners = useMemo(() => {
    if (!owners) return [];
    return owners.filter(o => {
      const matchesStatus = showArchived ? o.status === 'archived' : o.status !== 'archived';
      const matchesSearch = o.name.toLowerCase().includes(search.toLowerCase()) || 
                            (o.email || '').toLowerCase().includes(search.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [owners, search, showArchived]);

  return (
    <div className="space-y-10">
      <Card className="rounded-xl border shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
        <CardHeader className="p-8 bg-slate-50 dark:bg-slate-900/50 border-b">
          <div className="flex items-center gap-6">
            <div className="w-14 h-14 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-600 border border-blue-100 dark:border-blue-900/30 shadow-sm">
              <UserCircle className="w-7 h-7" />
            </div>
            <div>
              <CardTitle className="text-xl font-headline font-bold uppercase tracking-tight text-slate-900 dark:text-white">Systemverantwortliche (Owners)</CardTitle>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1.5">Zentrale Verwaltung der IT-Verantwortlichen für Ressourcen</p>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-8 space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-1 space-y-6">
              <h3 className="text-xs font-black uppercase text-slate-900 dark:text-white tracking-widest border-b pb-2">
                {editingOwner ? 'Verantwortlichen bearbeiten' : 'Neuer Verantwortlicher'}
              </h3>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label required className="text-[10px] font-black uppercase text-slate-400 ml-1">Vollständiger Name</Label>
                  <Input value={name} onChange={e => setName(e.target.value)} placeholder="Max Mustermann" className="h-11 rounded-lg" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">E-Mail Adresse</Label>
                  <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="max@firma.de" className="h-11 rounded-lg" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Abteilung</Label>
                  <Input value={department} onChange={e => setDepartment(e.target.value)} placeholder="IT-Infrastruktur" className="h-11 rounded-lg" />
                </div>
                <div className="flex gap-2">
                  {editingOwner && (
                    <Button variant="ghost" className="h-11 rounded-lg flex-1 font-bold text-[10px] uppercase" onClick={resetForm}>Abbrechen</Button>
                  )}
                  <Button onClick={handleSaveOwner} disabled={isSaving || !name} className="flex-[2] h-11 rounded-lg font-black uppercase text-[10px] tracking-widest gap-2 bg-primary text-white shadow-lg">
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : editingOwner ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />} 
                    {editingOwner ? 'Speichern' : 'Hinzufügen'}
                  </Button>
                </div>
              </div>
            </div>

            <div className="md:col-span-2 space-y-6 border-l pl-8 border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between border-b pb-2">
                <h3 className="text-xs font-black uppercase text-slate-900 dark:text-white tracking-widest">Register</h3>
                <div className="flex items-center gap-2">
                  <div className="relative group">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                    <Input placeholder="Suchen..." value={search} onChange={e => setSearch(e.target.value)} className="h-8 pl-8 text-[10px] w-40 rounded-md" />
                  </div>
                  <Button variant="ghost" size="sm" className="h-8 text-[9px] font-bold gap-2" onClick={() => setShowArchived(!showArchived)}>
                    {showArchived ? <RotateCcw className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
                    {showArchived ? 'Aktive' : 'Archiv'}
                  </Button>
                </div>
              </div>

              {isLoading ? (
                <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary opacity-20" /></div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/50">
                        <TableHead className="py-2 text-[9px] font-black uppercase">Person</TableHead>
                        <TableHead className="py-2 text-[9px] font-black uppercase text-right">Aktionen</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOwners.map(o => (
                        <TableRow key={o.id} className={cn("group hover:bg-slate-50", o.status === 'archived' && "opacity-60")}>
                          <TableCell className="py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                                <UserCircle className="w-4 h-4" />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{o.name}</p>
                                <div className="flex items-center gap-3 mt-0.5">
                                  {o.email && <span className="text-[9px] text-slate-400 flex items-center gap-1"><Mail className="w-2.5 h-2.5" /> {o.email}</span>}
                                  {o.department && <span className="text-[9px] text-slate-400 flex items-center gap-1"><Building2 className="w-2.5 h-2.5" /> {o.department}</span>}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400" onClick={() => {
                                setEditingOwner(o);
                                setName(o.name);
                                setEmail(o.email || '');
                                setDepartment(o.department || '');
                              }}>
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400" onClick={() => toggleStatus(o)}>
                                {o.status === 'active' ? <Archive className="w-3.5 h-3.5" /> : <RotateCcw className="w-3.5 h-3.5" />}
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600" onClick={() => handleDelete(o.id)}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {filteredOwners.length === 0 && (
                    <div className="py-20 text-center opacity-30">
                      <UserCircle className="w-10 h-10 mx-auto mb-2" />
                      <p className="text-[10px] font-black uppercase">Keine Personen erfasst</p>
                    </div>
                  )}
                </ScrollArea>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
