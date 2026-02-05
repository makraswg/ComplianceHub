
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
  ChevronRight,
  Workflow,
  Cpu,
  ShieldAlert
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { useSettings } from '@/context/settings-context';
import { saveCollectionRecord } from '@/app/actions/mysql-actions';
import { runBsiImportAction } from '@/app/actions/bsi-import-actions';
import { testJiraConnectionAction, getJiraConfigs } from '@/app/actions/jira-actions';
import { testSmtpConnectionAction } from '@/app/actions/smtp-actions';
import { testOllamaConnectionAction } from '@/app/actions/ai-actions';
import { usePluggableCollection } from '@/hooks/data/use-pluggable-collection';
import { RiskCategorySetting, Catalog, ImportRun, Tenant, JiraConfig, SmtpConfig, AiConfig } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

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
  
  // Initialize config structures if not present
  const defaultJira: JiraConfig = { id: 'jira-default', enabled: false, url: '', email: '', apiToken: '', projectKey: '', issueTypeName: 'Task', approvedStatusName: 'Approved', doneStatusName: 'Done' };
  const defaultSmtp: SmtpConfig = { id: 'smtp-default', enabled: false, host: '', port: '587', user: '', password: '', fromEmail: '' };
  const defaultAi: AiConfig = { id: 'ai-default', enabled: false, provider: 'ollama', ollamaUrl: 'http://localhost:11434', geminiModel: 'gemini-1.5-flash', enabledForAdvisor: true };

  const currentJira = useMemo(() => jiraConfigs?.[0] || defaultJira, [jiraConfigs]);
  const currentSmtp = useMemo(() => smtpConfigs?.[0] || defaultSmtp, [smtpConfigs]);
  const currentAi = useMemo(() => aiConfigs?.[0] || defaultAi, [aiConfigs]);

  const handleSaveConfig = async (collection: string, id: string, data: any) => {
    setIsSaving(true);
    try {
      const res = await saveCollectionRecord(collection, id, data, dataSource);
      if (res.success) {
        toast({ title: "Einstellungen gespeichert" });
        if (collection === 'jiraConfigs') refreshJira();
        if (collection === 'smtpConfigs') refreshSmtp();
        if (collection === 'aiConfigs') refreshAi();
        if (collection === 'tenants') refreshTenants();
      } else throw new Error(res.error || "Fehler");
    } catch (e: any) {
      toast({ variant: "destructive", title: "Fehler", description: e.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestJira = async () => {
    setIsTesting('jira');
    const res = await testJiraConnectionAction(currentJira);
    if (res.success) toast({ title: "Jira Verbindung OK", description: res.message });
    else toast({ variant: "destructive", title: "Jira Fehler", description: res.message });
    setIsTesting(null);
  };

  const handleTestSmtp = async () => {
    setIsTesting('smtp');
    const res = await testSmtpConnectionAction(currentSmtp);
    if (res.success) toast({ title: "SMTP Verbindung OK", description: res.message });
    else toast({ variant: "destructive", title: "SMTP Fehler", description: res.message });
    setIsTesting(null);
  };

  const handleTestAi = async () => {
    if (currentAi.provider !== 'ollama') {
      toast({ title: "Modus Cloud", description: "Verbindung zu Gemini wird bei Bedarf automatisch hergestellt." });
      return;
    }
    setIsTesting('ai');
    const res = await testOllamaConnectionAction(currentAi.ollamaUrl || '');
    if (res.success) toast({ title: "Ollama erreichbar", description: res.message });
    else toast({ variant: "destructive", title: "Ollama Fehler", description: res.message });
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

  const navItems = [
    { id: 'general', label: 'Organisation', icon: Building2, desc: 'Stammdaten & Mandant' },
    { id: 'sync', label: 'Identität & Sync', icon: Network, desc: 'LDAP / AD Anbindung' },
    { id: 'integrations', label: 'Jira Gateway', icon: RefreshCw, desc: 'Ticket Automatisierung' },
    { id: 'ai', label: 'KI Advisor', icon: BrainCircuit, desc: 'LLM Konfiguration' },
    { id: 'email', label: 'E-Mail (SMTP)', icon: Mail, desc: 'Benachrichtigungen' },
    { id: 'risks', label: 'Risiko-Steuerung', icon: Scale, desc: 'Compliance Zyklen' },
    { id: 'data', label: 'Katalog-Import', icon: Database, desc: 'BSI Grundschutz' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
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
                <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-primary">Mandanten-Stammdaten</CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground">Unternehmensname (Anzeige)</Label>
                    <Input 
                      value={activeTenant?.name || ''} 
                      onChange={(e) => activeTenant && handleSaveConfig('tenants', activeTenant.id, { ...activeTenant, name: e.target.value })}
                      className="rounded-none h-11" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground">Eindeutiger Kennner (Slug)</Label>
                    <Input value={activeTenant?.slug || ''} disabled className="rounded-none h-11 bg-muted/20 font-mono" />
                  </div>
                  <div className="p-4 bg-blue-50 border border-blue-100 flex items-start gap-3">
                    <Info className="w-4 h-4 text-blue-600 mt-0.5" />
                    <p className="text-[11px] text-blue-700 leading-relaxed uppercase font-bold">
                      Aktiver Mandanten-Fokus: {activeTenant?.name || 'Globale Plattform'}.
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
                <div className="flex items-center justify-between">
                  <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-primary">Active Directory / LDAP Sync</CardTitle>
                  <Switch 
                    checked={!!activeTenant?.ldapEnabled} 
                    onCheckedChange={(val) => activeTenant && handleSaveConfig('tenants', activeTenant.id, { ...activeTenant, ldapEnabled: val })}
                  />
                </div>
              </CardHeader>
              <CardContent className="p-8 space-y-8">
                <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-6", !activeTenant?.ldapEnabled && "opacity-50 grayscale pointer-events-none")}>
                  <div className="space-y-2 col-span-2 md:col-span-1">
                    <Label className="text-[10px] font-bold uppercase">Server URL</Label>
                    <Input 
                      placeholder="ldaps://dc01.firma.local" 
                      value={activeTenant?.ldapUrl || ''} 
                      onChange={(e) => activeTenant && handleSaveConfig('tenants', activeTenant.id, { ...activeTenant, ldapUrl: e.target.value })}
                      className="rounded-none font-mono text-xs" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase">Port</Label>
                    <Input 
                      placeholder="636" 
                      value={activeTenant?.ldapPort || ''} 
                      onChange={(e) => activeTenant && handleSaveConfig('tenants', activeTenant.id, { ...activeTenant, ldapPort: e.target.value })}
                      className="rounded-none" 
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label className="text-[10px] font-bold uppercase">Base DN (Users)</Label>
                    <Input 
                      placeholder="OU=Users,DC=firma,DC=local" 
                      value={activeTenant?.ldapBaseDn || ''} 
                      onChange={(e) => activeTenant && handleSaveConfig('tenants', activeTenant.id, { ...activeTenant, ldapBaseDn: e.target.value })}
                      className="rounded-none font-mono text-xs" 
                    />
                  </div>
                  <Separator className="col-span-2" />
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase">Bind DN (User)</Label>
                    <Input 
                      placeholder="CN=SyncUser,OU=ServiceAccounts..." 
                      value={activeTenant?.ldapBindDn || ''} 
                      onChange={(e) => activeTenant && handleSaveConfig('tenants', activeTenant.id, { ...activeTenant, ldapBindDn: e.target.value })}
                      className="rounded-none text-xs" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase">Bind Passwort</Label>
                    <Input 
                      type="password" 
                      placeholder="••••••••" 
                      value={activeTenant?.ldapBindPassword || ''} 
                      onChange={(e) => activeTenant && handleSaveConfig('tenants', activeTenant.id, { ...activeTenant, ldapBindPassword: e.target.value })}
                      className="rounded-none" 
                    />
                  </div>
                </div>
                {!activeTenant?.ldapEnabled && (
                  <div className="p-4 bg-muted/20 border border-dashed text-center">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground">LDAP-Synchronisation ist für diesen Mandanten deaktiviert.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* JIRA */}
          <TabsContent value="integrations" className="mt-0 space-y-6">
            <Card className="rounded-none border shadow-none">
              <CardHeader className="bg-muted/10 border-b py-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-primary">Jira Cloud Gateway</CardTitle>
                  <Switch checked={currentJira.enabled} onCheckedChange={(val) => handleSaveConfig('jiraConfigs', currentJira.id, { ...currentJira, enabled: val })} />
                </div>
              </CardHeader>
              <CardContent className="p-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2 col-span-2">
                    <Label className="text-[10px] font-bold uppercase">Cloud Instanz URL</Label>
                    <Input 
                      placeholder="https://ihre-firma.atlassian.net" 
                      value={currentJira.url} 
                      onChange={(e) => handleSaveConfig('jiraConfigs', currentJira.id, { ...currentJira, url: e.target.value })}
                      className="rounded-none h-10" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase">Reporter E-Mail</Label>
                    <Input 
                      value={currentJira.email} 
                      onChange={(e) => handleSaveConfig('jiraConfigs', currentJira.id, { ...currentJira, email: e.target.value })}
                      className="rounded-none h-10" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase">API Token</Label>
                    <Input 
                      type="password" 
                      value={currentJira.apiToken} 
                      onChange={(e) => handleSaveConfig('jiraConfigs', currentJira.id, { ...currentJira, apiToken: e.target.value })}
                      className="rounded-none h-10" 
                    />
                  </div>
                  
                  <Separator className="col-span-2" />
                  
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase">Projekt Key</Label>
                    <Input 
                      value={currentJira.projectKey} 
                      onChange={(e) => handleSaveConfig('jiraConfigs', currentJira.id, { ...currentJira, projectKey: e.target.value })}
                      className="rounded-none h-10 uppercase font-black" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase">Vorgangstyp (Name)</Label>
                    <Input 
                      value={currentJira.issueTypeName} 
                      onChange={(e) => handleSaveConfig('jiraConfigs', currentJira.id, { ...currentJira, issueTypeName: e.target.value })}
                      placeholder="Task / Service Request"
                      className="rounded-none h-10" 
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase">Status: Genehmigt</Label>
                    <Input 
                      value={currentJira.approvedStatusName} 
                      onChange={(e) => handleSaveConfig('jiraConfigs', currentJira.id, { ...currentJira, approvedStatusName: e.target.value })}
                      className="rounded-none h-10" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase">Status: Erledigt</Label>
                    <Input 
                      value={currentJira.doneStatusName} 
                      onChange={(e) => handleSaveConfig('jiraConfigs', currentJira.id, { ...currentJira, doneStatusName: e.target.value })}
                      className="rounded-none h-10" 
                    />
                  </div>
                </div>
                <Button variant="outline" className="w-full h-11 rounded-none font-bold uppercase text-[10px] gap-2" onClick={handleTestJira} disabled={isTesting === 'jira'}>
                  {isTesting === 'jira' ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Verbindung & Projekt validieren
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* AI */}
          <TabsContent value="ai" className="mt-0 space-y-6">
            <Card className="rounded-none border shadow-none">
              <CardHeader className="bg-muted/10 border-b py-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-primary">KI Access Advisor</CardTitle>
                  <Switch checked={currentAi.enabled} onCheckedChange={(val) => handleSaveConfig('aiConfigs', currentAi.id, { ...currentAi, enabled: val })} />
                </div>
              </CardHeader>
              <CardContent className="p-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2 col-span-2 md:col-span-1">
                    <Label className="text-[10px] font-bold uppercase">Modell-Provider</Label>
                    <Select value={currentAi.provider} onValueChange={(val: any) => handleSaveConfig('aiConfigs', currentAi.id, { ...currentAi, provider: val })}>
                      <SelectTrigger className="rounded-none h-10"><SelectValue /></SelectTrigger>
                      <SelectContent className="rounded-none">
                        <SelectItem value="ollama">Ollama (Lokal / On-Premise)</SelectItem>
                        <SelectItem value="google">Google Gemini (Cloud Managed)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {currentAi.provider === 'ollama' ? (
                    <div className="space-y-2 col-span-2">
                      <Label className="text-[10px] font-bold uppercase">Ollama Server URL</Label>
                      <Input 
                        value={currentAi.ollamaUrl} 
                        onChange={(e) => handleSaveConfig('aiConfigs', currentAi.id, { ...currentAi, ollamaUrl: e.target.value })}
                        className="rounded-none h-10 font-mono text-xs" 
                      />
                    </div>
                  ) : (
                    <div className="space-y-2 col-span-2 md:col-span-1">
                      <Label className="text-[10px] font-bold uppercase">Gemini Modell</Label>
                      <Select value={currentAi.geminiModel} onValueChange={(val) => handleSaveConfig('aiConfigs', currentAi.id, { ...currentAi, geminiModel: val })}>
                        <SelectTrigger className="rounded-none h-10"><SelectValue /></SelectTrigger>
                        <SelectContent className="rounded-none">
                          <SelectItem value="gemini-1.5-flash">Gemini 1.5 Flash (Schnell & Günstig)</SelectItem>
                          <SelectItem value="gemini-1.5-pro">Gemini 1.5 Pro (Hochpräzise Analyse)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                
                <div className="p-4 bg-muted/30 border border-dashed rounded-none space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span className="text-[10px] font-bold uppercase">Governance-Checks aktiv</span>
                    </div>
                    <Switch checked={currentAi.enabledForAdvisor} onCheckedChange={(val) => handleSaveConfig('aiConfigs', currentAi.id, { ...currentAi, enabledForAdvisor: val })} />
                  </div>
                  <p className="text-[9px] text-muted-foreground uppercase leading-relaxed font-bold">
                    Der KI-Advisor gibt Empfehlungen bei Access-Reviews basierend auf dem Department und bisherigen Zuweisungen.
                  </p>
                </div>

                <Button variant="outline" className="w-full h-11 rounded-none font-bold uppercase text-[10px] gap-2" onClick={handleTestAi} disabled={isTesting === 'ai'}>
                  {isTesting === 'ai' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Server className="w-4 h-4" />} API-Schnittstelle prüfen
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* SMTP */}
          <TabsContent value="email" className="mt-0 space-y-6">
            <Card className="rounded-none border shadow-none">
              <CardHeader className="bg-muted/10 border-b py-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-primary">SMTP Mail-Versand</CardTitle>
                  <Switch checked={currentSmtp.enabled} onCheckedChange={(val) => handleSaveConfig('smtpConfigs', currentSmtp.id, { ...currentSmtp, enabled: val })} />
                </div>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2 col-span-2">
                    <Label className="text-[10px] font-bold uppercase">SMTP Host</Label>
                    <Input 
                      value={currentSmtp.host} 
                      onChange={(e) => handleSaveConfig('smtpConfigs', currentSmtp.id, { ...currentSmtp, host: e.target.value })}
                      className="rounded-none h-10" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase">Port</Label>
                    <Input 
                      value={currentSmtp.port} 
                      onChange={(e) => handleSaveConfig('smtpConfigs', currentSmtp.id, { ...currentSmtp, port: e.target.value })}
                      className="rounded-none h-10" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase">Benutzername</Label>
                    <Input 
                      value={currentSmtp.user} 
                      onChange={(e) => handleSaveConfig('smtpConfigs', currentSmtp.id, { ...currentSmtp, user: e.target.value })}
                      className="rounded-none h-10" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase">Passwort</Label>
                    <Input 
                      type="password" 
                      value={currentSmtp.password} 
                      onChange={(e) => handleSaveConfig('smtpConfigs', currentSmtp.id, { ...currentSmtp, password: e.target.value })}
                      className="rounded-none h-10" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase">Absender-Adresse</Label>
                    <Input 
                      value={currentSmtp.fromEmail} 
                      onChange={(e) => handleSaveConfig('smtpConfigs', currentSmtp.id, { ...currentSmtp, fromEmail: e.target.value })}
                      placeholder="compliance@firma.de"
                      className="rounded-none h-10" 
                    />
                  </div>
                </div>
                <Button variant="outline" className="w-full h-11 rounded-none font-bold uppercase text-[10px] gap-2" onClick={handleTestSmtp} disabled={isTesting === 'smtp'}>
                  {isTesting === 'smtp' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />} Test-E-Mail senden
                </Button>
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
                      <div key={cat} className="flex items-center justify-between p-4 border bg-slate-50/50 hover:bg-white transition-colors">
                        <div className="flex flex-col">
                          <span className="font-bold text-xs uppercase">{cat}</span>
                          <span className="text-[8px] text-muted-foreground uppercase font-black mt-0.5">Prüfungsintervall</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Input 
                            type="number" 
                            defaultValue={setting?.defaultReviewDays || 365} 
                            className="w-24 h-9 rounded-none text-center font-bold" 
                            onBlur={(e) => {
                              const days = parseInt(e.target.value);
                              if (!isNaN(days)) {
                                const data: RiskCategorySetting = { id: cat, tenantId: 'global', defaultReviewDays: days };
                                handleSaveConfig('riskCategorySettings', cat, data);
                              }
                            }} 
                          />
                          <span className="text-[9px] font-black text-slate-400 uppercase w-10">Tage</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-6 p-4 border border-orange-100 bg-orange-50/30 flex items-start gap-3">
                  <ShieldAlert className="w-4 h-4 text-orange-600 mt-0.5" />
                  <p className="text-[10px] text-orange-800 leading-relaxed font-bold uppercase">
                    Hinweis: Diese Intervalle bestimmen, wann ein Risiko im Dashboard als "Review fällig" markiert wird. Individuelle Abweichungen können am Risiko-Satz selbst eingestellt werden.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* DATA IMPORT */}
          <TabsContent value="data" className="mt-0 space-y-6">
            <div className="grid grid-cols-1 gap-6">
              <Card className="rounded-none border shadow-none">
                <CardHeader className="bg-muted/10 border-b py-4">
                  <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-primary">BSI Katalog Import Engine</CardTitle>
                </CardHeader>
                <CardContent className="p-12 text-center space-y-6 bg-white">
                  <div className="p-10 border-2 border-dashed bg-slate-50 flex flex-col items-center gap-6">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                      <FileJson className="w-8 h-8 text-primary opacity-60" />
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-black uppercase tracking-tight">Katalog-Abgleich starten</p>
                      <p className="text-[10px] font-bold uppercase text-muted-foreground max-w-xs mx-auto">
                        Lädt den standardisierten BSI IT-Grundschutz Katalog in die lokale Datenbank. Dubletten werden via SHA-256 Hash vermieden.
                      </p>
                    </div>
                    <Button variant="default" className="rounded-none text-[10px] font-bold uppercase h-12 px-12 gap-3 tracking-widest" onClick={handleManualImport} disabled={isImporting}>
                      {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Import-Prozess Starten
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-none border shadow-none">
                <CardHeader className="bg-slate-900 text-white py-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-[10px] font-bold uppercase tracking-widest">Import Historie & Governance</CardTitle>
                    <Badge variant="outline" className="text-[8px] font-black border-slate-700 text-slate-400">{importRuns?.length || 0} Läufe</Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[350px]">
                    <Table>
                      <TableHeader className="bg-muted/30">
                        <TableRow>
                          <TableHead className="text-[9px] font-black uppercase py-4">Zeitpunkt</TableHead>
                          <TableHead className="text-[9px] font-black uppercase">Katalog / Version</TableHead>
                          <TableHead className="text-[9px] font-black uppercase text-center">Elemente</TableHead>
                          <TableHead className="text-[9px] font-black uppercase text-right pr-6">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {importRuns?.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map(run => {
                          const catalog = catalogs?.find(c => c.id === run.catalogId);
                          return (
                            <TableRow key={run.id} className="hover:bg-muted/5 group">
                              <TableCell className="text-[10px] font-mono py-4 text-muted-foreground">{new Date(run.timestamp).toLocaleString()}</TableCell>
                              <TableCell className="text-[10px] font-bold uppercase">
                                {catalog?.name || 'Unbekannter Katalog'}
                                <span className="block text-[8px] opacity-50 font-normal mt-0.5">{catalog?.version}</span>
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge variant="outline" className="rounded-none text-[9px] font-black bg-white">{run.itemCount}</Badge>
                              </TableCell>
                              <TableCell className="text-right pr-6">
                                <div className="flex items-center justify-end gap-2">
                                  <Badge variant="outline" className={cn(
                                    "rounded-none text-[8px] font-black uppercase px-2",
                                    run.status === 'success' ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"
                                  )}>
                                    {run.status}
                                  </Badge>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        {(!importRuns || importRuns.length === 0) && (
                          <TableRow><TableCell colSpan={4} className="h-32 text-center text-xs text-muted-foreground italic">Noch keine Import-Läufe protokolliert.</TableCell></TableRow>
                        )}
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
