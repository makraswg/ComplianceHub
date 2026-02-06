
"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BrainCircuit, Loader2, Save, Sparkles, Server, Cloud } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { usePluggableCollection } from '@/hooks/data/use-pluggable-collection';
import { useSettings } from '@/context/settings-context';
import { saveCollectionRecord } from '@/app/actions/mysql-actions';
import { testOllamaConnectionAction, testOpenRouterConnectionAction } from '@/app/actions/ai-actions';
import { AiConfig } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
    <div className="space-y-6">
      <Card className="rounded-none border shadow-none">
        <CardHeader className="bg-muted/10 border-b py-4">
          <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">
            <BrainCircuit className="w-4 h-4" /> KI Engine Konfiguration
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8 space-y-8">
          <div className="flex items-center justify-between p-4 border bg-blue-50/20 rounded-none">
            <div className="space-y-0.5">
              <Label className="text-sm font-bold">KI Unterstützung aktiv</Label>
              <p className="text-[9px] uppercase font-bold text-muted-foreground">Nutzt LLMs zur Analyse von Berechtigungsrisiken und Formular-Support.</p>
            </div>
            <Switch checked={!!aiDraft.enabled} onCheckedChange={v => setAiDraft({...aiDraft, enabled: v})} />
          </div>

          <div className="space-y-4">
            <Label className="text-[10px] font-bold uppercase text-muted-foreground">Aktiver Provider</Label>
            <Tabs value={aiDraft.provider} onValueChange={(v: any) => setAiDraft({...aiDraft, provider: v})} className="w-full">
              <TabsList className="grid grid-cols-3 h-12 bg-muted/50 rounded-none p-1 border">
                <TabsTrigger value="ollama" className="rounded-none gap-2 text-[10px] font-bold uppercase data-[state=active]:bg-white"><Server className="w-3 h-3" /> Ollama</TabsTrigger>
                <TabsTrigger value="google" className="rounded-none gap-2 text-[10px] font-bold uppercase data-[state=active]:bg-white"><Cloud className="w-3 h-3" /> Gemini</TabsTrigger>
                <TabsTrigger value="openrouter" className="rounded-none gap-2 text-[10px] font-bold uppercase data-[state=active]:bg-white"><Sparkles className="w-3 h-3" /> OpenRouter</TabsTrigger>
              </TabsList>

              <div className="mt-6 pt-6 border-t">
                <TabsContent value="ollama" className="space-y-4 mt-0">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase">Ollama Server URL</Label>
                      <Input value={aiDraft.ollamaUrl || ''} onChange={e => setAiDraft({...aiDraft, ollamaUrl: e.target.value})} placeholder="http://localhost:11434" className="rounded-none" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase">Modell</Label>
                      <Input value={aiDraft.ollamaModel || ''} onChange={e => setAiDraft({...aiDraft, ollamaModel: e.target.value})} placeholder="llama3" className="rounded-none" />
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => testOllamaConnectionAction(aiDraft.ollamaUrl!).then(res => toast({title: "Ollama-Test", description: res.message}))} className="rounded-none text-[9px] font-bold uppercase">Verbindung testen</Button>
                </TabsContent>

                <TabsContent value="google" className="space-y-4 mt-0">
                  <div className="space-y-2 max-w-md">
                    <Label className="text-[10px] font-bold uppercase">Gemini Modell</Label>
                    <Select value={aiDraft.geminiModel || 'gemini-1.5-flash'} onValueChange={v => setAiDraft({...aiDraft, geminiModel: v})}>
                      <SelectTrigger className="rounded-none"><SelectValue /></SelectTrigger>
                      <SelectContent className="rounded-none">
                        <SelectItem value="gemini-1.5-flash">Gemini 1.5 Flash (Schnell)</SelectItem>
                        <SelectItem value="gemini-1.5-pro">Gemini 1.5 Pro (Präzise)</SelectItem>
                        <SelectItem value="gemini-2.0-flash-exp">Gemini 2.0 Flash</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-[10px] text-muted-foreground italic">Hinweis: Die API-Authentifizierung erfolgt über die serverseitigen Umgebungsvariablen.</p>
                </TabsContent>

                <TabsContent value="openrouter" className="space-y-4 mt-0">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase">OpenRouter API Key</Label>
                      <Input type="password" value={aiDraft.openrouterApiKey || ''} onChange={e => setAiDraft({...aiDraft, openrouterApiKey: e.target.value})} placeholder="sk-or-v1-..." className="rounded-none" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase">Modellbezeichner</Label>
                      <Input value={aiDraft.openrouterModel || ''} onChange={e => setAiDraft({...aiDraft, openrouterModel: e.target.value})} placeholder="anthropic/claude-3.5-sonnet" className="rounded-none" />
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => testOpenRouterConnectionAction(aiDraft.openrouterApiKey!).then(res => toast({title: "OpenRouter-Test", description: res.message}))} className="rounded-none text-[9px] font-bold uppercase">Verbindung testen</Button>
                </TabsContent>
              </div>
            </Tabs>
          </div>

          <div className="flex justify-end pt-6 border-t">
            <Button onClick={handleSave} disabled={isSaving} className="rounded-none font-bold uppercase text-[10px] px-12 h-11 gap-2">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              KI-Einstellungen Speichern
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
