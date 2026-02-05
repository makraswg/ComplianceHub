
"use client";

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Settings, 
  Save, 
  Database,
  Loader2,
  Building2,
  Network,
  Mail,
  BrainCircuit,
  Info,
  Scale,
  Upload,
  History,
  AlertCircle,
  FileJson,
  CheckCircle2,
  ShieldCheck,
  Server,
  Key,
  Globe,
  RefreshCw,
  ExternalLink,
  Lock,
  Zap
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { useSettings } from '@/context/settings-context';
import { saveCollectionRecord, getCollectionData } from '@/app/actions/mysql-actions';
import { runBsiImportAction } from '@/app/actions/bsi-import-actions';
import { testJiraConnectionAction } from '@/app/actions/jira-actions';
import { testSmtpConnectionAction } from '@/app/actions/smtp-actions';
import { testOllamaConnectionAction } from '@/app/actions/ai-actions';
import { usePluggableCollection } from '@/hooks/data/use-pluggable-collection';
import { RiskCategorySetting, Catalog, ImportRun, Tenant, JiraConfig, SmtpConfig, AiConfig } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

export default function SettingsPage() {
  const { dataSource, activeTenantId } = useSettings();
  const [activeTab, setActiveTab] = useState('general');
  const [isSaving, setIsSaving] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isTesting, setIsTesting] = useState<string | null>(null);

  // Data Fetching
  const { data: tenants, refresh: refreshTenants } = usePluggableCollection<Tenant>('tenants');
  const { data: riskCategorySettings, refresh: refreshRiskSettings } = usePluggableCollection<RiskCategorySetting>('riskCategorySettings');
  const { data: catalogs, refresh: refreshCatalogs } = usePluggableCollection<Catalog>('catalogs');
  const { data: importRuns, refresh: refreshRuns } = usePluggableCollection<ImportRun>('importRuns');
  const { data: jiraConfigs, refresh: refreshJira } = usePluggableCollection<JiraConfig>('jiraConfigs');
  const { data: smtpConfigs, refresh: refreshSmtp } = usePluggableCollection<SmtpConfig>('smtpConfigs');
  const { data: aiConfigs, refresh: refreshAi } = usePluggableCollection<AiConfig>('aiConfigs');

  // Local Form States (for nested objects)
  const activeTenant = useMemo(() => tenants?.find(t => t.id === (activeTenantId === 'all' ? 't1' : activeTenantId)), [tenants, activeTenantId]);
  const activeJira = useMemo(() => jiraConfigs?.[0] || { id: 'jira-default', enabled: false, url: '', email: '', apiToken: '', projectKey: '', issueTypeName: 'Task' }, [jiraConfigs]);
  const activeSmtp = useMemo(() => smtpConfigs?.[0] || { id: 'smtp-default', enabled: false, host: '', port: '587', user: '', password: '', fromEmail: '' }, [smtpConfigs]);
  const activeAi = useMemo(() => aiConfigs?.[0] || { id: 'ai-default', enabled: false, provider: 'ollama', ollamaUrl: 'http://localhost:11434', geminiModel: 'gemini-1.5-flash' }, [aiConfigs]);

  const handleSaveJira = async (data: Partial<JiraConfig>) => {
    setIsSaving(true);
    try {
      const updated = { ...activeJira, ...data };
      await saveCollectionRecord('jiraConfigs', updated.id, updated, dataSource);
      toast({ title: "Jira-Konfiguration gespeichert" });
      refreshJira();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Fehler", description: e.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAi = async (data: Partial<AiConfig>) => {
    setIsSaving(true);
    try {
      const updated = { ...activeAi, ...data };
      await saveCollectionRecord('aiConfigs', updated.id, updated, dataSource);
      toast({ title: "KI-Konfiguration gespeichert" });
      refreshAi();
    } catch (e: any) {
      toast({ variant: "destructive", title: "Fehler", description: e.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestJira = async () => {
    setIsTesting('jira');
    const res = await testJiraConnectionAction(activeJira);
    if (res.success) toast({ title: "Verbindung erfolgreich", description: res.message });
    else toast({ variant: "destructive", title: "Verbindung fehlgeschlagen", description: res.message });
    setIsTesting(null);
  };

  const handleTestAi = async () => {
    if (activeAi.provider !== 'ollama') {
      toast({ title: "Modus Cloud", description: "Verbindung zu Gemini wird bei Bedarf automatisch hergestellt." });
      return;
    }
    setIsTesting('ai');
    const res = await testOllamaConnectionAction(activeAi.ollamaUrl || '');
    if (res.success) toast({ title: "Ollama erreichbar", description: res.message });
    else toast({ variant: "destructive", title: "Fehler", description: res.message });
    setIsTesting(null);
  };

  const handleManualImport = async () => {
    setIsImporting(true);
    try {
      const mockData = {
        modules: [
          {
            code: 'APP', title: 'Anwendungen',
            threats: [
              { code: 'APP.1.G1', title: 'Fehlende Verschlüsselung', description: 'Daten werden im Klartext übertragen.' },
              { code: 'APP.1.G2', title: 'Software-Schwachstellen', description: 'Bekannte Lücken in Drittanbieter-Bibliotheken.' }
            ]
          },
          {
            code: 'ORP', title: 'Organisation & Personal',
            threats: [
              { code: 'ORP.1.G1', title: 'Insider-Angriffe', description: 'Böswillige Handlungen durch eigene Mitarbeiter.' }
            ]
          }
        ]
      };

      const res = await runBsiImportAction({
        catalogName: 'BSI IT-Grundschutz (Core)',
        version: '2023.1',
        data: mockData
      }, dataSource);

      if (res.success) {
        toast({ title: "Import erfolgreich", description: res.message });
        refreshCatalogs();
        refreshRuns();
      } else throw new Error(res.message);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Import fehlgeschlagen", description: e.message });
    } finally {
      setIsImporting(false);
    }
  };

  const handleSaveRiskCategoryCycle = async (category: string, days: number) => {
    const data: RiskCategorySetting = { id: category, tenantId: 'global', defaultReviewDays: days };
    await saveCollectionRecord('riskCategorySettings', category, data, dataSource);
    toast({ title: "Zyklus aktualisiert" });
    refreshRiskSettings();
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-20 animate-in fade-in duration-500">
      <div className="flex items-center justify-between border-b pb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 bg-primary/10 text-primary flex items-center justify-center rounded-none border border-primary/20">
              <Settings className="w-5 h-5" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight uppercase font-headline">Systemeinstellungen</h1>
          </div>
          <p className="text-muted-foreground text-sm">Zentrale Steuerung der Plattform-Governance, Schnittstellen und Automatisierung.</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
        <div className="border bg-card p-1 rounded-none shadow-sm">
          <TabsList className="bg-transparent h-12 gap-1 rounded-none w-full justify-start overflow-x-auto custom-scrollbar">
            <TabsTrigger value="general" className="rounded-none px-6 gap-2 text-[10px] font-bold uppercase data-[state=active]:bg-primary data-[state=active]:text-white"><Building2 className="w-3.5 h-3.5" /> Organisation</TabsTrigger>
            <TabsTrigger value="sync" className="rounded-none px-6 gap-2 text-[10px] font-bold uppercase data-[state=active]:bg-primary data-[state=active]:text-white"><Network className="w-3.5 h-3.5" /> Identität & Sync</TabsTrigger>
            <TabsTrigger value="integrations" className="rounded-none px-6 gap-2 text-[10px] font-bold uppercase data-[state=active]:bg-primary data-[state=active]:text-white"><RefreshCw className="w-3.5 h-3.5" /> Integrations</TabsTrigger>
            <TabsTrigger value="ai" className="rounded-none px-6 gap-2 text-[10px] font-bold uppercase data-[state=active]:bg-primary data-[state=active]:text-white"><BrainCircuit className="w-3.5 h-3.5" /> KI Advisor</TabsTrigger>
            <TabsTrigger value="email" className="rounded-none px-6 gap-2 text-[10px] font-bold uppercase data-[state=active]:bg-primary data-[state=active]:text-white"><Mail className="w-3.5 h-3.5" /> E-Mail (SMTP)</TabsTrigger>
            <TabsTrigger value="risks" className="rounded-none px-6 gap-2 text-[10px] font-bold uppercase data-[state=active]:bg-primary data-[state=active]:text-white"><Scale className="w-3.5 h-3.5" /> Risiko-Steuerung</TabsTrigger>
            <TabsTrigger value="data" className="rounded-none px-6 gap-2 text-[10px] font-bold uppercase data-[state=active]:bg-primary data-[state=active]:text-white"><Database className="w-3.5 h-3.5" /> Katalog-Import</TabsTrigger>
          </TabsList>
        </div>

        {/* ORGANISATION */}
        <TabsContent value="general" className="space-y-6">
          <Card className="rounded-none border shadow-none">
            <CardHeader className="bg-muted/10 border-b">
              <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                <Building2 className="w-4 h-4" /> Mandanten-Konfiguration
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground">Unternehmensname (Anzeige)</Label>
                    <Input defaultValue={activeTenant?.name} className="rounded-none h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground">Eindeutiger Slug (für URLs)</Label>
                    <Input defaultValue={activeTenant?.slug} disabled className="rounded-none h-11 bg-muted/20" />
                  </div>
                </div>
                <div className="p-6 bg-blue-50 border border-blue-100 flex items-start gap-4">
                  <Info className="w-5 h-5 text-blue-600 mt-1 shrink-0" />
                  <div>
                    <p className="text-xs font-bold uppercase text-blue-800 mb-1">Globaler Fokus</p>
                    <p className="text-[11px] text-blue-700 leading-relaxed">
                      Sie bearbeiten gerade die Einstellungen für <strong>{activeTenant?.name || 'die Plattform'}</strong>. 
                      Änderungen hier wirken sich auf alle zugeordneten Benutzer und Ressourcen dieses Mandanten aus.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* IDENTITY & SYNC (LDAP) */}
        <TabsContent value="sync" className="space-y-6">
          <Card className="rounded-none border shadow-none">
            <CardHeader className="bg-muted/10 border-b">
              <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                <Network className="w-4 h-4" /> Verzeichnisdienst-Anbindung (LDAP / AD)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white border flex items-center justify-center rounded-none shadow-sm">
                    <Lock className="w-5 h-5 text-slate-400" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase">Automatisierter Gruppen-Abgleich</p>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">Synchronisiert Identitäten und Berechtigungen</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-black uppercase text-muted-foreground">Inaktiv</span>
                  <Switch disabled />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 opacity-50 grayscale pointer-events-none">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground">LDAP URL / Host</Label>
                    <Input placeholder="ldaps://dc01.firma.local" className="rounded-none h-10" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground">Base DN</Label>
                    <Input placeholder="OU=Users,DC=firma,DC=local" className="rounded-none h-10 font-mono text-xs" />
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground">Bind User (Service Account)</Label>
                    <Input placeholder="CN=svc_compliance,OU=Service,DC=..." className="rounded-none h-10 font-mono text-xs" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground">Passwort</Label>
                    <Input type="password" value="********" className="rounded-none h-10" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* INTEGRATIONS (JIRA) */}
        <TabsContent value="integrations" className="space-y-6">
          <Card className="rounded-none border shadow-none">
            <CardHeader className="bg-muted/10 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" /> Jira Cloud Gateway
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Label className="text-[9px] font-bold uppercase">Aktiviert</Label>
                  <Switch 
                    checked={activeJira.enabled} 
                    onCheckedChange={(val) => handleSaveJira({ enabled: val })} 
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground">Jira URL</Label>
                    <Input 
                      value={activeJira.url} 
                      onChange={(e) => handleSaveJira({ url: e.target.value })}
                      placeholder="https://firma.atlassian.net" 
                      className="rounded-none h-10" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground">Service User (E-Mail)</Label>
                    <Input 
                      value={activeJira.email} 
                      onChange={(e) => handleSaveJira({ email: e.target.value })}
                      placeholder="admin@firma.de" 
                      className="rounded-none h-10" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground">API Token (Atlassian)</Label>
                    <Input 
                      type="password" 
                      value={activeJira.apiToken} 
                      onChange={(e) => handleSaveJira({ apiToken: e.target.value })}
                      placeholder="••••••••••••••••" 
                      className="rounded-none h-10" 
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground">Ziel-Projekt (Key)</Label>
                    <Input 
                      value={activeJira.projectKey} 
                      onChange={(e) => handleSaveJira({ projectKey: e.target.value })}
                      placeholder="IAM / HELP" 
                      className="rounded-none h-10 uppercase font-black" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground">Vorgangstyp (Issue Type)</Label>
                    <Input 
                      value={activeJira.issueTypeName} 
                      onChange={(e) => handleSaveJira({ issueTypeName: e.target.value })}
                      placeholder="Task" 
                      className="rounded-none h-10" 
                    />
                  </div>
                  <div className="pt-6">
                    <Button 
                      variant="outline" 
                      className="w-full h-11 rounded-none font-bold uppercase text-[10px] border-primary/20 hover:bg-primary/5 gap-2"
                      onClick={handleTestJira}
                      disabled={isTesting === 'jira'}
                    >
                      {isTesting === 'jira' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                      Verbindung zu Atlassian testen
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI ADVISOR */}
        <TabsContent value="ai" className="space-y-6">
          <Card className="rounded-none border shadow-none">
            <CardHeader className="bg-muted/10 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                  <BrainCircuit className="w-4 h-4" /> GenAI Advisor & Risiko-Analyse
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Label className="text-[9px] font-bold uppercase">KI Analyse Aktiv</Label>
                  <Switch 
                    checked={activeAi.enabled} 
                    onCheckedChange={(val) => handleSaveAi({ enabled: val })} 
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground">KI Provider (Modell-Quelle)</Label>
                    <Select 
                      value={activeAi.provider} 
                      onValueChange={(val: any) => handleSaveAi({ provider: val })}
                    >
                      <SelectTrigger className="rounded-none h-11"><SelectValue /></SelectTrigger>
                      <SelectContent className="rounded-none">
                        <SelectItem value="ollama">Ollama (Lokal / On-Premise)</SelectItem>
                        <SelectItem value="google">Google Gemini (Cloud Analysis)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {activeAi.provider === 'ollama' ? (
                    <div className="space-y-4 p-6 border bg-slate-50 rounded-none animate-in slide-in-from-left-2">
                      <div className="flex items-center gap-2 mb-2">
                        <Server className="w-4 h-4 text-orange-600" />
                        <span className="text-[10px] font-black uppercase text-orange-600">Lokale Instanz</span>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase">Ollama API URL</Label>
                        <Input 
                          value={activeAi.ollamaUrl} 
                          onChange={(e) => handleSaveAi({ ollamaUrl: e.target.value })}
                          placeholder="http://localhost:11434" 
                          className="rounded-none h-10 bg-white" 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase">Modell-Name</Label>
                        <Input 
                          value={activeAi.ollamaModel || 'llama3'} 
                          onChange={(e) => handleSaveAi({ ollamaModel: e.target.value })}
                          placeholder="llama3" 
                          className="rounded-none h-10 bg-white" 
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 p-6 border bg-blue-50/30 rounded-none animate-in slide-in-from-right-2">
                      <div className="flex items-center gap-2 mb-2">
                        <Globe className="w-4 h-4 text-blue-600" />
                        <span className="text-[10px] font-black uppercase text-blue-600">Cloud Managed</span>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase">Gemini Modell</Label>
                        <Select 
                          value={activeAi.geminiModel} 
                          onValueChange={(val) => handleSaveAi({ geminiModel: val })}
                        >
                          <SelectTrigger className="rounded-none h-10 bg-white"><SelectValue /></SelectTrigger>
                          <SelectContent className="rounded-none">
                            <SelectItem value="gemini-1.5-flash">Gemini 1.5 Flash (Schnell & Günstig)</SelectItem>
                            <SelectItem value="gemini-1.5-pro">Gemini 1.5 Pro (Max. Präzision)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-6">
                  <div className="p-6 bg-slate-900 text-white rounded-none space-y-4">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-primary fill-current" />
                      <h4 className="text-[10px] font-black uppercase tracking-[0.2em]">Advisor Fähigkeiten</h4>
                    </div>
                    <ul className="space-y-3">
                      {[
                        'Automatisierte Risiko-Einstufung',
                        'Least-Privilege Empfehlungen',
                        'Anomalie-Erkennung in Zuweisungen',
                        'Support bei Rezertifizierungen'
                      ].map((text, i) => (
                        <li key={i} className="flex items-center gap-3 text-[10px] font-bold uppercase text-slate-400">
                          <CheckCircle2 className="w-3 h-3 text-primary shrink-0" /> {text}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <Button 
                    variant="outline" 
                    className="w-full h-11 rounded-none font-bold uppercase text-[10px] gap-2 border-primary/20"
                    onClick={handleTestAi}
                    disabled={isTesting === 'ai'}
                  >
                    {isTesting === 'ai' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Server className="w-4 h-4" />}
                    KI-Verbindung prüfen
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* E-MAIL (SMTP) */}
        <TabsContent value="email" className="space-y-6">
          <Card className="rounded-none border shadow-none">
            <CardHeader className="bg-muted/10 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                  <Mail className="w-4 h-4" /> SMTP E-Mail Versand
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Label className="text-[9px] font-bold uppercase">E-Mail Versand Aktiv</Label>
                  <Switch checked={activeSmtp.enabled} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">SMTP Host</Label>
                  <Input defaultValue={activeSmtp.host} placeholder="smtp.office365.com" className="rounded-none h-10" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">Port</Label>
                  <Input defaultValue={activeSmtp.port} className="rounded-none h-10" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">Absender E-Mail</Label>
                  <Input defaultValue={activeSmtp.fromEmail} placeholder="compliance@firma.de" className="rounded-none h-10" />
                </div>
              </div>
              <div className="p-4 bg-muted/20 border text-center">
                <p className="text-[10px] font-bold uppercase text-muted-foreground">Diese Einstellungen werden für System-Alarme und Passwort-Reset Links verwendet.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* RISIKO STEUERUNG */}
        <TabsContent value="risks">
          <Card className="rounded-none border shadow-none">
            <CardHeader className="bg-muted/10 border-b">
              <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                <Scale className="w-4 h-4" /> Compliance-Prüfungszyklen (Reviews)
              </CardTitle>
              <CardDescription className="text-[9px] uppercase font-bold">Standardmäßige Zeiträume für regelmäßige Überprüfungen nach ISO 27001.</CardDescription>
            </CardHeader>
            <CardContent className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {['IT-Sicherheit', 'Datenschutz', 'Rechtlich', 'Betrieblich'].map(cat => {
                  const setting = riskCategorySettings?.find(s => s.id === cat);
                  return (
                    <div key={cat} className="flex items-center justify-between p-5 border bg-slate-50/50 hover:bg-white transition-colors group">
                      <div>
                        <p className="font-bold text-sm group-hover:text-primary transition-colors">{cat}</p>
                        <p className="text-[9px] text-muted-foreground uppercase font-bold">Review-Intervall</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <Input 
                          type="number" 
                          defaultValue={setting?.defaultReviewDays || 365} 
                          className="w-32 rounded-none h-10 font-bold text-center border-2 focus:ring-0 focus:border-primary" 
                          onBlur={(e) => handleSaveRiskCategoryCycle(cat, parseInt(e.target.value))}
                        />
                        <span className="text-[9px] font-black uppercase text-slate-400">TAGE</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* KATALOG IMPORT */}
        <TabsContent value="data" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            <Card className="md:col-span-5 rounded-none border shadow-none h-fit">
              <CardHeader className="bg-muted/10 border-b">
                <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                  <Upload className="w-4 h-4" /> Import Engine
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                <div className="p-8 border-2 border-dashed flex flex-col items-center justify-center text-center gap-6 py-16 bg-muted/5">
                  <div className="w-16 h-16 bg-white border shadow-sm flex items-center justify-center">
                    <FileJson className="w-8 h-8 text-muted-foreground opacity-30" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-bold uppercase">Standardisierte Kataloge (BSI)</p>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                      Laden Sie Gefährdungskataloge im JSON oder CSV Format hoch.<br/>
                      Das System erkennt Dubletten automatisch via SHA-256.
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    className="rounded-none font-bold uppercase text-[10px] h-12 px-8 border-primary/20 hover:bg-primary/5 gap-2 shadow-sm"
                    onClick={handleManualImport}
                    disabled={isImporting}
                  >
                    {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} 
                    Katalog Datei auswählen
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-7 rounded-none border shadow-none">
              <CardHeader className="bg-muted/10 border-b">
                <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                  <History className="w-4 h-4" /> Import Governance & Historie
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[450px]">
                  <Table>
                    <TableHeader className="bg-muted/20">
                      <TableRow>
                        <TableHead className="py-3 font-bold uppercase text-[9px]">Zeitpunkt</TableHead>
                        <TableHead className="font-bold uppercase text-[9px]">Katalog / Version</TableHead>
                        <TableHead className="font-bold uppercase text-[9px]">Umfang</TableHead>
                        <TableHead className="text-right font-bold uppercase text-[9px]">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importRuns?.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map(run => {
                        const catalog = catalogs?.find(c => c.id === run.catalogId);
                        return (
                          <TableRow key={run.id} className="hover:bg-muted/5 transition-colors">
                            <TableCell className="py-4 font-mono text-[10px] text-muted-foreground">
                              {new Date(run.timestamp).toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <div className="text-[10px] font-bold uppercase">{catalog?.name || 'Unbekannt'}</div>
                              <div className="text-[9px] text-muted-foreground uppercase font-black">{catalog?.version || 'v1.0'}</div>
                            </TableCell>
                            <TableCell className="text-[10px] font-bold">
                              {run.itemCount} Gefährdungen
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge variant="outline" className={cn(
                                "rounded-none text-[8px] font-black uppercase px-2 py-0.5", 
                                run.status === 'success' ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"
                              )}>
                                {run.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {(!importRuns || importRuns.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={4} className="h-32 text-center text-xs text-muted-foreground italic">
                            Noch keine Katalog-Importe protokolliert.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
