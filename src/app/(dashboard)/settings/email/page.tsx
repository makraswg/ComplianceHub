
"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, Loader2, Save, Send } from 'lucide-react';
import { usePluggableCollection } from '@/hooks/data/use-pluggable-collection';
import { useSettings } from '@/context/settings-context';
import { saveCollectionRecord } from '@/app/actions/mysql-actions';
import { testSmtpConnectionAction } from '@/app/actions/smtp-actions';
import { SmtpConfig } from '@/lib/types';
import { toast } from '@/hooks/use-toast';

export default function EmailSettingsPage() {
  const { dataSource } = useSettings();
  const [isSaving, setIsSaving] = useState(false);
  const [smtpDraft, setSmtpDraft] = useState<Partial<SmtpConfig>>({});

  const { data: configs, refresh } = usePluggableCollection<SmtpConfig>('smtpConfigs');

  useEffect(() => {
    if (configs && configs.length > 0) setSmtpDraft(configs[0]);
    else setSmtpDraft({ id: 'smtp-default', enabled: false });
  }, [configs]);

  const handleSave = async () => {
    if (!smtpDraft.id) return;
    setIsSaving(true);
    try {
      const res = await saveCollectionRecord('smtpConfigs', smtpDraft.id, smtpDraft, dataSource);
      if (res.success) {
        toast({ title: "E-Mail Einstellungen gespeichert" });
        refresh();
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="rounded-none border shadow-none">
      <CardHeader className="bg-muted/10 border-b py-4">
        <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">
          <Mail className="w-4 h-4" /> SMTP E-Mail Server
        </CardTitle>
      </CardHeader>
      <CardContent className="p-8 space-y-6">
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2"><Label className="text-[10px] font-bold uppercase">SMTP Host</Label><Input value={smtpDraft.host || ''} onChange={e => setSmtpDraft({...smtpDraft, host: e.target.value})} className="rounded-none h-10" /></div>
          <div className="space-y-2"><Label className="text-[10px] font-bold uppercase">Port</Label><Input value={smtpDraft.port || ''} onChange={e => setSmtpDraft({...smtpDraft, port: e.target.value})} className="rounded-none h-10" /></div>
          <div className="space-y-2"><Label className="text-[10px] font-bold uppercase">Benutzername</Label><Input value={smtpDraft.user || ''} onChange={e => setSmtpDraft({...smtpDraft, user: e.target.value})} className="rounded-none h-10" /></div>
          <div className="space-y-2"><Label className="text-[10px] font-bold uppercase">Absender-Adresse</Label><Input value={smtpDraft.fromEmail || ''} onChange={e => setSmtpDraft({...smtpDraft, fromEmail: e.target.value})} className="rounded-none h-10" /></div>
        </div>
        <div className="flex justify-between items-center pt-6 border-t">
          <Button variant="outline" onClick={() => testSmtpConnectionAction(smtpDraft).then(res => toast({title: "Mail-Test", description: res.message}))} className="rounded-none text-[10px] font-bold uppercase h-11 px-8 gap-2">
            <Send className="w-3.5 h-3.5" /> Verbindung Testen
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="rounded-none font-bold uppercase text-[10px] px-12 h-11 gap-2">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Speichern
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
