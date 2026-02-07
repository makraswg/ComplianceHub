"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Shield, 
  Plus, 
  Trash2, 
  Save, 
  Loader2, 
  CheckCircle2, 
  Info,
  Archive,
  RotateCcw
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { usePluggableCollection } from '@/hooks/data/use-pluggable-collection';
import { useSettings } from '@/context/settings-context';
import { saveCollectionRecord, deleteCollectionRecord } from '@/app/actions/mysql-actions';
import { toast } from '@/hooks/use-toast';
import { RegulatoryOption } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

export default function ComplianceSettingsPage() {
  const { dataSource, activeTenantId } = useSettings();
  const [isSaving, setIsSaving] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const { data: options, refresh, isLoading } = usePluggableCollection<RegulatoryOption>('regulatory_options');

  const handleAddOption = async () => {
    if (!newName) return;
    setIsSaving(true);
    const id = `reg-${Math.random().toString(36).substring(2, 7)}`;
    const data: RegulatoryOption = {
      id,
      tenantId: activeTenantId === 'all' ? 'global' : activeTenantId,
      name: newName,
      description: newDesc,
      enabled: true
    };

    try {
      const res = await saveCollectionRecord('regulatory_options', id, data, dataSource);
      if (res.success) {
        setNewName('');
        setNewDesc('');
        refresh();
        toast({ title: "Regulatorik hinzugefügt" });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const toggleEnabled = async (item: RegulatoryOption) => {
    const updated = { ...item, enabled: !item.enabled };
    await saveCollectionRecord('regulatory_options', item.id, updated, dataSource);
    refresh();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Regelwerk wirklich entfernen?")) return;
    await deleteCollectionRecord('regulatory_options', id, dataSource);
    refresh();
  };

  return (
    <div className="space-y-10">
      <Card className="rounded-xl border shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
        <CardHeader className="p-8 bg-slate-50 dark:bg-slate-900/50 border-b">
          <div className="flex items-center gap-6">
            <div className="w-14 h-14 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-600 border border-emerald-100 dark:border-emerald-900/30 shadow-sm">
              <Shield className="w-7 h-7" />
            </div>
            <div>
              <CardTitle className="text-xl font-headline font-bold uppercase tracking-tight text-slate-900 dark:text-white">Regulatorische Rahmenwerke</CardTitle>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1.5">Definition der Compliance-Standards für Prozess-Modelle</p>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-8 space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-1 space-y-6">
              <h3 className="text-xs font-black uppercase text-slate-900 dark:text-white tracking-widest border-b pb-2">Neuer Standard</h3>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Kurzbezeichnung</Label>
                  <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="z.B. ISO 9001:2015" className="h-11 rounded-lg" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Beschreibung</Label>
                  <Textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Zweck und Geltungsbereich..." className="min-h-[100px] rounded-lg" />
                </div>
                <Button onClick={handleAddOption} disabled={isSaving || !newName} className="w-full h-11 rounded-lg font-black uppercase text-[10px] tracking-widest gap-2 bg-primary text-white shadow-lg">
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Hinzufügen
                </Button>
              </div>
            </div>

            <div className="md:col-span-2 space-y-6 border-l pl-8 border-slate-100 dark:border-slate-800">
              <h3 className="text-xs font-black uppercase text-slate-900 dark:text-white tracking-widest border-b pb-2">Aktive Standards</h3>
              {isLoading ? (
                <div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary opacity-20" /></div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {options?.map(opt => (
                    <div key={opt.id} className={cn(
                      "p-4 border rounded-xl flex items-center justify-between group transition-all",
                      opt.enabled ? "bg-white dark:bg-slate-950 border-slate-100" : "bg-slate-50 dark:bg-slate-900/50 opacity-60 grayscale"
                    )}>
                      <div className="flex items-center gap-4">
                        <Switch checked={!!opt.enabled} onCheckedChange={() => toggleEnabled(opt)} />
                        <div>
                          <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{opt.name}</p>
                          <p className="text-[10px] text-slate-400 italic mt-0.5 truncate max-w-md">{opt.description || 'Keine Beschreibung'}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100" onClick={() => handleDelete(opt.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                  {(!options || options.length === 0) && (
                    <div className="py-20 text-center border-2 border-dashed rounded-xl bg-slate-50/50">
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest italic">Keine regulatorischen Standards definiert</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
