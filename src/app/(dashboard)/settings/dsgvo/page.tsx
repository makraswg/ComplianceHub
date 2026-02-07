"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  FileCheck, 
  Plus, 
  Archive, 
  RotateCcw, 
  Layers, 
  Trash2,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { usePluggableCollection } from '@/hooks/data/use-pluggable-collection';
import { useSettings } from '@/context/settings-context';
import { saveCollectionRecord, deleteCollectionRecord } from '@/app/actions/mysql-actions';
import { DataSubjectGroup, DataCategory } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { usePlatformAuth } from '@/context/auth-context';
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
import { logAuditEventAction } from '@/app/actions/audit-actions';

export default function DsgvoSettingsPage() {
  const { dataSource, activeTenantId } = useSettings();
  const { user } = usePlatformAuth();
  const [newGroupName, setNewGroupName] = useState('');
  const [newCatName, setNewCatName] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<{ id: string, type: 'dataSubjectGroups' | 'dataCategories', label: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: subjectGroups, refresh: refreshGroups } = usePluggableCollection<DataSubjectGroup>('dataSubjectGroups');
  const { data: dataCategories, refresh: refreshCats } = usePluggableCollection<DataCategory>('dataCategories');

  const isSuperAdmin = user?.role === 'superAdmin';

  const handleCreateGroup = async () => {
    if (!newGroupName) return;
    const id = `dsg-${Math.random().toString(36).substring(2, 7)}`;
    const data: DataSubjectGroup = { 
      id, 
      name: newGroupName, 
      tenantId: activeTenantId === 'all' ? 't1' : activeTenantId,
      status: 'active'
    };
    await saveCollectionRecord('dataSubjectGroups', id, data, dataSource);
    setNewGroupName('');
    refreshGroups();
    toast({ title: "Gruppe hinzugefügt" });
  };

  const handleCreateCat = async () => {
    if (!newCatName) return;
    const id = `dcat-${Math.random().toString(36).substring(2, 7)}`;
    const data: DataCategory = { 
      id, 
      name: newCatName, 
      tenantId: activeTenantId === 'all' ? 't1' : activeTenantId,
      status: 'active'
    };
    await saveCollectionRecord('dataCategories', id, data, dataSource);
    setNewCatName('');
    refreshCats();
    toast({ title: "Kategorie hinzugefügt" });
  };

  const toggleStatus = async (coll: string, item: any) => {
    const updated = { ...item, status: item.status === 'active' ? 'archived' : 'active' };
    await saveCollectionRecord(coll, item.id, updated, dataSource);
    if (coll === 'dataSubjectGroups') refreshGroups();
    else refreshCats();
    toast({ title: "Status aktualisiert" });
  };

  const executeDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await deleteCollectionRecord(deleteTarget.type, deleteTarget.id, dataSource);
      if (res.success) {
        await logAuditEventAction(dataSource, {
          tenantId: 'global',
          actorUid: user?.email || 'system',
          action: `DSGVO-Basisdaten permanent gelöscht: ${deleteTarget.label} (${deleteTarget.type})`,
          entityType: 'gdpr-setting',
          entityId: deleteTarget.id
        });

        toast({ title: "Eintrag permanent gelöscht" });
        if (deleteTarget.type === 'dataSubjectGroups') refreshGroups();
        if (deleteTarget.type === 'dataCategories') refreshCats();
        setDeleteTarget(null);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-end">
        <button className={cn("h-8 text-[9px] font-bold uppercase gap-2 flex items-center px-3 rounded-md hover:bg-slate-100", showArchived && "text-orange-600 bg-orange-50")} onClick={() => setShowArchived(!showArchived)}>
          {showArchived ? <RotateCcw className="w-3 h-3" /> : <Archive className="w-3 h-3" />}
          {showArchived ? 'Aktive anzeigen' : 'Archiv anzeigen'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="rounded-none border shadow-none flex flex-col h-[500px]">
          <CardHeader className="bg-muted/10 border-b py-4">
            <CardTitle className="text-[10px] font-bold uppercase flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-emerald-600" /> Betroffene Personengruppen
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4 flex-1 flex flex-col min-h-0">
            {!showArchived && (
              <div className="flex gap-2 shrink-0">
                <Input placeholder="z.B. Mitarbeiter" value={newGroupName} onChange={e => setNewGroupName(e.target.value)} className="rounded-none h-9" />
                <Button onClick={handleCreateGroup} className="rounded-none h-9"><Plus className="w-4 h-4" /></Button>
              </div>
            )}
            <ScrollArea className="flex-1 border bg-slate-50 p-2">
              <div className="space-y-1">
                {subjectGroups?.filter(g => showArchived ? g.status === 'archived' : g.status !== 'archived').map(g => (
                  <div key={g.id} className="flex items-center justify-between p-2 bg-white border group">
                    <span className={cn("text-xs font-bold", g.status === 'archived' && "line-through text-muted-foreground")}>{g.name}</span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleStatus('dataSubjectGroups', g)}>
                        {g.status === 'active' ? <Archive className="w-3.5 h-3.5 text-muted-foreground" /> : <RotateCcw className="w-3.5 h-3.5 text-emerald-600" />}
                      </Button>
                      {isSuperAdmin && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600" onClick={() => setDeleteTarget({ id: g.id, type: 'dataSubjectGroups', label: g.name })}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="rounded-none border shadow-none flex flex-col h-[500px]">
          <CardHeader className="bg-muted/10 border-b py-4">
            <CardTitle className="text-[10px] font-bold uppercase flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" /> Datenkategorien (DSGVO)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4 flex-1 flex flex-col min-h-0">
            {!showArchived && (
              <div className="flex gap-2 shrink-0">
                <Input placeholder="z.B. Stammdaten" value={newCatName} onChange={e => setNewCatName(e.target.value)} className="rounded-none h-9" />
                <Button onClick={handleCreateCat} className="rounded-none h-9"><Plus className="w-4 h-4" /></Button>
              </div>
            )}
            <ScrollArea className="flex-1 border bg-slate-50 p-2">
              <div className="space-y-1">
                {dataCategories?.filter(c => showArchived ? c.status === 'archived' : c.status !== 'archived').map(c => (
                  <div key={c.id} className="flex items-center justify-between p-2 bg-white border group">
                    <span className={cn("text-xs font-bold", c.status === 'archived' && "line-through text-muted-foreground")}>{c.name}</span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleStatus('dataCategories', c)}>
                        {c.status === 'active' ? <Archive className="w-3.5 h-3.5 text-muted-foreground" /> : <RotateCcw className="w-3.5 h-3.5 text-emerald-600" />}
                      </Button>
                      {isSuperAdmin && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600" onClick={() => setDeleteTarget({ id: c.id, type: 'dataCategories', label: c.name })}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Permanent Delete Alert */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(val) => !val && setDeleteTarget(null)}>
        <AlertDialogContent className="rounded-xl border-none shadow-2xl p-8">
          <AlertDialogHeader>
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <AlertDialogTitle className="text-xl font-headline font-bold text-red-600 text-center">Permanent löschen?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-slate-500 font-medium leading-relaxed pt-2 text-center">
              Möchten Sie <strong>{deleteTarget?.label}</strong> wirklich permanent löschen? 
              <br/><br/>
              <span className="text-red-600 font-bold">Achtung:</span> Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-6 gap-3 sm:justify-center">
            <AlertDialogCancel className="rounded-md font-bold text-xs h-11 px-8">Abbrechen</AlertDialogCancel>
            <AlertDialogAction 
              onClick={executeDelete} 
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white rounded-md font-bold text-xs h-11 px-10 gap-2"
            >
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Permanent löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}