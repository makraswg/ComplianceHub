
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
  Zap,
  ChevronRight
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

  // Local Form States
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
          }
        ]
      };
      const res = await runBsiImportAction({ catalogName: 'BSI IT-Grundschutz (Core)', version: '2023.1', data: mockData }, dataSource);
      if (res.success) {
        toast({ title: "Import erfolgreich" });
        refreshCatalogs(); refreshRuns();
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

  const navItems = [
    { id: 'general', label: 'Organisation', icon: Building2, desc: 'Stammdaten & Mandant' },
    { id: 'sync', label: 'Identität & Sync', icon: Network, desc: 'LDAP / AD Anbindung' },
    { id: 'integrations', label: 'Integrations', icon: RefreshCw, desc: 'Jira Cloud Gateway' },
    { id: 'ai', label: 'KI Advisor', icon: BrainCircuit, desc: 'LLM Konfiguration' },
    { id: 'email', label: 'E-Mail (SMTP)', icon: Mail, desc: 'Benachrichtigungs-Dienst' },
    { id: 'risks', label: 'Risiko-Steuerung', icon: Scale, desc: 'Compliance Zyklen' },
    { id: 'data', label: 'Katalog-Import', icon: Database, desc: 'BSI Grundschutz' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between border-b pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight uppercase font-headline">Systemeinstellungen</h1>
          <p className="text-muted-foreground text-sm mt-1">Zentrale Steuerung der Plattform-Governance und Schnittstellen.</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col md:flex-row gap-8">
        {/* Vertical Navigation Sidebar */}
        <aside className="w-full md:w-72 shrink-0">
          <nav className="space-y-1">
            <TabsList className="flex flex-col h-auto bg-transparent gap-1 p-0 w-full">
              {navItems.map((item) => (
                <TabsTrigger 
                  key={item.id} 
                  value={item.id}
                  className={cn(
                    "w-full justify-start items-center gap-3 px-4 py-3 rounded-none border border-transparent transition-all",
                    "data-[state=active]:bg-white data-[state=active]:border-border data-[state=active]:shadow-sm data-[state=active]:text-primary",
                    "hover:bg-muted/50 text-muted-foreground text-left"
                  )}
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  <div className="flex flex-col items-start overflow-hidden">
                    <span className="text-[11px] font-bold uppercase tracking-wider">{item.label}</span>
                    <span className="text-[9px] font-medium opacity-60 truncate w-full">{item.desc}</span>
                  </div>
                  {activeTab === item.id && <ChevronRight className="w-3 h-3 ml-auto opacity-50" />}
                </TabsTrigger>
              ))}
            </TabsList>
          </nav>
        </aside>

        {/* Content Area */}
        <div className="flex-1 min-w-0">
          {/* ORGANISATION */}
          <TabsContent value="general" className="mt-0 space-y-6">
            <Card className="rounded-none border shadow-none">
              <CardHeader className="bg-muted/10 border-b py-4">
                <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-primary">Mandanten-Konfiguration</CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground">Unternehmensname (Anzeige)</Label>
                    <Input defaultValue={activeTenant?.name} className="rounded-none h-11" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground">Eindeutiger Slug</Label>
                    <Input defaultValue={activeTenant?.slug} disabled className="rounded-none h-11 bg-muted/20" />
                  </div>
                  <div className="p-4 bg-blue-50 border border-blue-100 flex items-start gap-3">
                    <Info className="w-4 h-4 text-blue-600 mt-0.5" />
                    <p className="text-[11px] text-blue-700 leading-relaxed uppercase font-bold">
                      Sie bearbeiten den Fokus: {activeTenant?.name || 'Global'}.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* IDENTITY & SYNC */}
          <TabsContent value="sync" className="mt-0 space-y-6">
            <Card className="rounded-none border shadow-none">
              <CardHeader className="bg-muted/10 border-b py-4">
                <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-primary">Verzeichnisdienst (LDAP/AD)</CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-8">
                <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200">
                  <div className="flex items-center gap-3">
                    <Lock className="w-5 h-5 text-slate-400" />
                    <div>
                      <p className="text-xs font-bold uppercase">Automatisierter Sync</p>
                      <p className="text-[9px] text-muted-foreground uppercase font-bold">Zuweisungen via AD-Gruppen</p>
                    </div>
                  </div>
                  <Switch disabled />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 opacity-50 grayscale pointer-events-none">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase">LDAP URL</Label>
                    <Input placeholder="ldaps://dc01.firma.local" className="rounded-none" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase">Base DN</Label>
                    <Input placeholder="OU=Users,DC=firma,DC=local" className="rounded-none font-mono text-[10px]" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* JIRA */}
          <TabsContent value="integrations" className="mt-0 space-y-6">
            <Card className="rounded-none border shadow-none">
              <CardHeader className="bg-muted/10 border-b py-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-primary">Jira Cloud Gateway</CardTitle>
                  <Switch checked={activeJira.enabled} onCheckedChange={(val) => handleSaveJira({ enabled: val })} />
                </div>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase">Jira URL</Label>
                    <Input value={activeJira.url} onChange={(e) => handleSaveJira({ url: e.target.value })} className="rounded-none h-10" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase">API Token</Label>
                    <Input type="password" value={activeJira.apiToken} onChange={(e) => handleSaveJira({ apiToken: e.target.value })} className="rounded-none h-10" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase">Projekt Key</Label>
                      <Input value={activeJira.projectKey} onChange={(e) => handleSaveJira({ projectKey: e.target.value })} className="rounded-none h-10 uppercase font-black" />
                    </div>
                    <div className="flex items-end">
                      <Button variant="outline" className="w-full h-10 rounded-none font-bold uppercase text-[9px] gap-2" onClick={handleTestJira} disabled={isTesting === 'jira'}>
                        {isTesting === 'jira' ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3 h-3" />} Testen
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* AI */}
          <TabsContent value="ai" className="mt-0 space-y-6">
            <Card className="rounded-none border shadow-none">
              <CardHeader className="bg-muted/10 border-b py-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-primary">KI Advisor</CardTitle>
                  <Switch checked={activeAi.enabled} onCheckedChange={(val) => handleSaveAi({ enabled: val })} />
                </div>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase">Provider</Label>
                    <Select value={activeAi.provider} onValueChange={(val: any) => handleSaveAi({ provider: val })}>
                      <SelectTrigger className="rounded-none"><SelectValue /></SelectTrigger>
                      <SelectContent className="rounded-none">
                        <SelectItem value="ollama">Ollama (Lokal)</SelectItem>
                        <SelectItem value="google">Google Gemini (Cloud)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {activeAi.provider === 'ollama' && (
                    <div className="p-4 border bg-slate-50 space-y-4">
                      <div className="space-y-2">
                        <Label className="text-[9px] font-bold uppercase">API URL</Label>
                        <Input value={activeAi.ollamaUrl} onChange={(e) => handleSaveAi({ ollamaUrl: e.target.value })} className="h-9 bg-white rounded-none" />
                      </div>
                    </div>
                  )}
                  <Button variant="outline" className="w-full h-10 rounded-none font-bold uppercase text-[9px]" onClick={handleTestAi} disabled={isTesting === 'ai'}>
                    {isTesting === 'ai' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Server className="w-3 h-3 mr-2" />} Verbindung prüfen
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* SMTP */}
          <TabsContent value="email" className="mt-0 space-y-6">
            <Card className="rounded-none border shadow-none">
              <CardHeader className="bg-muted/10 border-b py-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-primary">SMTP Mail Versand</CardTitle>
                  <Switch checked={activeSmtp.enabled} />
                </div>
              </CardHeader>
              <CardContent className="p-8 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase">Host</Label>
                    <Input defaultValue={activeSmtp.host} className="rounded-none" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase">Port</Label>
                    <Input defaultValue={activeSmtp.port} className="rounded-none" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase">Absender</Label>
                  <Input defaultValue={activeSmtp.fromEmail} className="rounded-none" />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* RISKS */}
          <TabsContent value="risks" className="mt-0 space-y-6">
            <Card className="rounded-none border shadow-none">
              <CardHeader className="bg-muted/10 border-b py-4">
                <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-primary">Compliance Review Zyklen</CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <div className="grid grid-cols-1 gap-4">
                  {['IT-Sicherheit', 'Datenschutz', 'Rechtlich', 'Betrieblich'].map(cat => {
                    const setting = riskCategorySettings?.find(s => s.id === cat);
                    return (
                      <div key={cat} className="flex items-center justify-between p-4 border bg-slate-50/50">
                        <span className="font-bold text-xs uppercase">{cat}</span>
                        <div className="flex items-center gap-2">
                          <Input type="number" defaultValue={setting?.defaultReviewDays || 365} className="w-20 h-8 rounded-none text-center" onBlur={(e) => handleSaveRiskCategoryCycle(cat, parseInt(e.target.value))} />
                          <span className="text-[8px] font-black text-slate-400 uppercase">Tage</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* DATA IMPORT */}
          <TabsContent value="data" className="mt-0 space-y-6">
            <div className="grid grid-cols-1 gap-6">
              <Card className="rounded-none border shadow-none">
                <CardHeader className="bg-muted/10 border-b py-4">
                  <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-primary">BSI Katalog Import</CardTitle>
                </CardHeader>
                <CardContent className="p-8 text-center space-y-6">
                  <div className="p-8 border-2 border-dashed bg-muted/5 flex flex-col items-center gap-4">
                    <FileJson className="w-10 h-10 text-muted-foreground opacity-30" />
                    <p className="text-[10px] font-bold uppercase text-muted-foreground">Standardisierte BSI IT-Grundschutz Kataloge</p>
                    <Button variant="outline" className="rounded-none text-[10px] font-bold uppercase h-10 px-8 gap-2" onClick={handleManualImport} disabled={isImporting}>
                      {isImporting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />} Katalog laden
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-none border shadow-none">
                <CardHeader className="bg-slate-900 text-white py-3">
                  <CardTitle className="text-[10px] font-bold uppercase tracking-widest">Import Historie</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[300px]">
                    <Table>
                      <TableHeader className="bg-muted/20">
                        <TableRow>
                          <TableHead className="text-[9px] font-bold uppercase">Zeitpunkt</TableHead>
                          <TableHead className="text-[9px] font-bold uppercase">Katalog</TableHead>
                          <TableHead className="text-[9px] font-bold uppercase text-right">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {importRuns?.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map(run => {
                          const catalog = catalogs?.find(c => c.id === run.catalogId);
                          return (
                            <TableRow key={run.id} className="hover:bg-muted/5">
                              <TableCell className="text-[10px] font-mono py-3">{new Date(run.timestamp).toLocaleString()}</TableCell>
                              <TableCell className="text-[10px] font-bold uppercase">{catalog?.name || '---'}</TableCell>
                              <TableCell className="text-right">
                                <Badge variant="outline" className={cn("rounded-none text-[8px] font-black uppercase", run.status === 'success' ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700")}>
                                  {run.status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
