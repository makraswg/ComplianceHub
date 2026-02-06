
"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BookOpen, Loader2, Save, ExternalLink } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { usePluggableCollection } from '@/hooks/data/use-pluggable-collection';
import { useSettings } from '@/context/settings-context';
import { saveCollectionRecord } from '@/app/actions/mysql-actions';
import { BookStackConfig } from '@/lib/types';
import { toast } from '@/hooks/use-toast';

export default function BookStackSettingsPage() {
  const { dataSource } = useSettings();
  const [isSaving, setIsSaving] = useState(false);
  const [configDraft, setConfigDraft] = useState<Partial<BookStackConfig>>({});

  const { data: configs, refresh } = usePluggableCollection<BookStackConfig>('bookstackConfigs');

  useEffect(() => {
    if (configs && configs.length > 0) setConfigDraft(configs[0]);
    else setConfigDraft({ id: 'bs-default', enabled: false });
  }, [configs]);

  const handleSave = async () => {
    if (!configDraft.id) return;
    setIsSaving(true);
    try {
      const res = await saveCollectionRecord('bookstackConfigs', configDraft.id, configDraft, dataSource);
      if (res.success) {
        toast({ title: "BookStack Konfiguration gespeichert" });
        refresh();
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="rounded-none border shadow-none">
        <CardHeader className="bg-muted/10 border-b py-4">
          <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">
            <BookOpen className="w-4 h-4" /> BookStack Dokumentations-Export
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8 space-y-8">
          <div className="flex items-center justify-between p-4 border bg-emerald-50/20 rounded-none">
            <div className="space-y-0.5">
              <Label className="text-sm font-bold">BookStack Publishing aktiv</Label>
              <p className="text-[9px] uppercase font-bold text-muted-foreground">Erlaubt den Export von Prozess-Modellen als Dokumentationsseiten.</p>
            </div>
            <Switch checked={!!configDraft.enabled} onCheckedChange={v => setConfigDraft({...configDraft, enabled: v})} />
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase">BookStack Basis-URL</Label>
                <Input value={configDraft.url || ''} onChange={e => setConfigDraft({...configDraft, url: e.target.value})} placeholder="https://docs.firma.local" className="rounded-none h-10" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase">Standard Book ID</Label>
                <Input value={configDraft.default_book_id || ''} onChange={e => setConfigDraft({...configDraft, default_book_id: e.target.value})} placeholder="1" className="rounded-none h-10" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase">Token ID</Label>
                <Input value={configDraft.token_id || ''} onChange={e => setConfigDraft({...configDraft, token_id: e.target.value})} className="rounded-none h-10" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase">Token Secret</Label>
                <Input type="password" value={configDraft.token_secret || ''} onChange={e => setConfigDraft({...configDraft, token_secret: e.target.value})} className="rounded-none h-10" />
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center pt-6 border-t">
            <p className="text-[9px] text-muted-foreground italic flex items-center gap-1">
              Die API-Daten können in BookStack unter "Mein Profil -> API Tokens" generiert werden.
            </p>
            <Button onClick={handleSave} disabled={isSaving} className="rounded-none font-bold uppercase text-[10px] px-12 h-11 gap-2">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Speichern
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
