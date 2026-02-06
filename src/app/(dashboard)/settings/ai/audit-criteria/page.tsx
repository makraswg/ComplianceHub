
"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  ShieldAlert, 
  Plus, 
  Trash2, 
  Save, 
  CheckCircle2, 
  AlertTriangle,
  Settings2,
  Loader2,
  ChevronLeft
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { usePluggableCollection } from '@/hooks/data/use-pluggable-collection';
import { useSettings } from '@/context/settings-context';
import { saveCollectionRecord, deleteCollectionRecord } from '@/app/actions/mysql-actions';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';

export default function AuditCriteriaSettingsPage() {
  const { dataSource } = useSettings();
  const [isSaving, setIsSaving] = useState(false);
  const { data: criteria, refresh } = usePluggableCollection<any>('aiAuditCriteria');

  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newSeverity, setNewSeverity] = useState('medium');

  const handleAdd = async () => {
    if (!newTitle) return;
    const id = `crit-${Math.random().toString(36).substring(2, 7)}`;
    const data = {
      id,
      title: newTitle,
      description: newDesc,
      severity: newSeverity,
      enabled: true,
      category: 'IAM'
    };
    await saveCollectionRecord('aiAuditCriteria', id, data, dataSource);
    setNewTitle(''); setNewDesc('');
    refresh();
    toast({ title: "Kriterium hinzugefügt" });
  };

  const toggleEnabled = async (item: any) => {
    const updated = { ...item, enabled: !item.enabled };
    await saveCollectionRecord('aiAuditCriteria', item.id, updated, dataSource);
    refresh();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Kriterium wirklich entfernen?")) return;
    await deleteCollectionRecord('aiAuditCriteria', id, dataSource);
    refresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/settings/ai">
          <Button variant="ghost" size="sm" className="h-8 rounded-none px-2">
            <ChevronLeft className="w-4 h-4 mr-1" /> Zurück
          </Button>
        </Link>
        <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          <Settings2 className="w-4 h-4" /> Audit-Kriterien Konfiguration
        </h2>
      </div>

      <Card className="rounded-none border shadow-none">
        <CardHeader className="bg-muted/10 border-b py-4">
          <CardTitle className="text-[10px] font-bold uppercase flex items-center gap-2">
            <Plus className="w-4 h-4 text-indigo-600" /> Neues Audit-Kriterium definieren
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase">Bezeichnung der Regel</Label>
              <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="z.B. Keine Admin-Rechte für Externe" className="rounded-none h-10" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase">Schweregrad</Label>
              <Select value={newSeverity} onValueChange={setNewSeverity}>
                <SelectTrigger className="rounded-none h-10"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-none">
                  <SelectItem value="low">Niedrig</SelectItem>
                  <SelectItem value="medium">Mittel</SelectItem>
                  <SelectItem value="high">Hoch</SelectItem>
                  <SelectItem value="critical">Kritisch</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase">Logik-Beschreibung für die KI</Label>
            <Textarea 
              value={newDesc} 
              onChange={e => setNewDesc(e.target.value)} 
              placeholder="Erkläre der KI, worauf sie achten soll (z.B. 'Prüfe ob Benutzer mit E-Mail-Endung @partner.de mehr als 3 Admin-Rollen haben')" 
              className="rounded-none min-h-[80px]"
            />
          </div>
          <Button onClick={handleAdd} className="rounded-none font-bold uppercase text-[10px] h-10 px-8">Hinzufügen</Button>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {criteria?.map((item: any) => (
          <div key={item.id} className={cn(
            "p-4 border-2 bg-white flex items-center justify-between group",
            !item.enabled && "opacity-50"
          )}>
            <div className="flex items-start gap-4">
              <div className="mt-1">
                <Switch checked={!!item.enabled} onCheckedChange={() => toggleEnabled(item)} />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-sm">{item.title}</span>
                  <Badge variant="outline" className="text-[8px] font-black uppercase rounded-none">{item.severity}</Badge>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1 max-w-2xl italic leading-relaxed">{item.description}</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 opacity-0 group-hover:opacity-100" onClick={() => handleDelete(item.id)}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
