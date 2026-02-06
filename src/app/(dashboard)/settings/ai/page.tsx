
"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BrainCircuit, Loader2, Save } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { usePluggableCollection } from '@/hooks/data/use-pluggable-collection';
import { useSettings } from '@/context/settings-context';
import { saveCollectionRecord } from '@/app/actions/mysql-actions';
import { testOllamaConnectionAction } from '@/app/actions/ai-actions';
import { AiConfig } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';

export default function AiSettingsPage() {
  const { dataSource } = useSettings();
  const [isSaving, setIsSaving] = useState(false);
  const [aiDraft, setAiDraft] = useState<Partial<AiConfig>>({});

  const { data: configs, refresh } = usePluggableCollection<AiConfig>('aiConfigs');

  useEffect(() => {
    if (configs && configs.length > 0) setAiDraft(configs[0]);
    else setAiDraft({ id: 'ai-default', enabled: false, provider: 'ollama' });
  }, [configs]);

  const handleSave = async () => {
    if (!aiDraft.id) return;
    setIsSaving(true);
    try {
      const res = await saveCollectionRecord('aiConfigs', aiDraft.id, aiDraft, dataSource);
      if (res.success) {
        toast({ title: "KI-Einstellungen gespeichert" });
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
          <BrainCircuit className="w-4 h-4" /> KI Access Advisor
        </CardTitle>
      </CardHeader>
      <CardContent className="p-8 space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border bg-blue-50/20 rounded-none mb-4">
            <div className="space-y-0.5">
              <Label className="text-sm font-bold">KI Unterstützung aktiv</Label>
              <p className="text-[9px] uppercase font-bold text-muted-foreground">Nutzt LLMs zur Analyse von Berechtigungsrisiken.</p>
            </div>
            <Switch checked={!!aiDraft.enabled} onCheckedChange={v => setAiDraft({...aiDraft, enabled: v})} />
          </div>
          
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase">Provider</Label>
              <Select value={aiDraft.provider} onValueChange={v => setAiDraft({...aiDraft, provider: v as any})}>
                <SelectTrigger className="rounded-none h-10"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-none">
                  <SelectItem value="ollama">Ollama (Lokal / On-Prem)</SelectItem>
                  <SelectItem value="google">Google Gemini (Cloud)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase">Modell-Name</Label>
              <Input 
                value={aiDraft.provider === 'ollama' ? aiDraft.ollamaModel : aiDraft.geminiModel} 
                onChange={e => setAiDraft({...aiDraft, [aiDraft.provider === 'ollama' ? 'ollamaModel' : 'geminiModel']: e.target.value})} 
                className="rounded-none h-10" 
              />
            </div>
          </div>

          {aiDraft.provider === 'ollama' && (
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase">Ollama Server URL</Label>
              <Input 
                value={aiDraft.ollamaUrl || ''} 
                onChange={e => setAiDraft({...aiDraft, ollamaUrl: e.target.value})} 
                className="rounded-none h-10" 
              />
            </div>
          )}
        </div>

        <div className="flex justify-between items-center pt-6 border-t">
          <Button 
            variant="outline" 
            onClick={() => aiDraft.provider === 'ollama' 
              ? testOllamaConnectionAction(aiDraft.ollamaUrl!).then(res => toast({title: "Ollama-Test", description: res.message})) 
              : toast({title: "Cloud-Test", description: "Verbindung zu Google Gemini ist konfiguriert."})
            } 
            className="rounded-none text-[10px] font-bold uppercase h-11 px-8"
          >
            Verbindung Testen
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
