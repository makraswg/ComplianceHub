
"use client";

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
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
  CheckCircle2,
  RefreshCw,
  Lock,
  ChevronRight,
  Users,
  Plus,
  Trash2,
  MoreHorizontal,
  Shield,
  FileCode,
  AlertTriangle,
  History,
  Terminal,
  Layers,
  FileUp,
  Settings as SettingsIcon,
  Fingerprint,
  Workflow
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { useSettings } from '@/context/settings-context';
import { usePlatformAuth } from '@/context/auth-context';
import { saveCollectionRecord, deleteCollectionRecord } from '@/app/actions/mysql-actions';
import { 
  testJiraConnectionAction, 
  getJiraWorkspacesAction, 
  getJiraSchemasAction,
  getJiraObjectTypesAction,
  getJiraAttributesAction,
  getJiraConfigs
} from '@/app/actions/jira-actions';
import { runBsiXmlImportAction } from '@/app/actions/bsi-import-actions';
import { usePluggableCollection } from '@/hooks/data/use-pluggable-collection';
import { Tenant, JiraConfig, AiConfig, PlatformUser, ImportRun, Catalog, SmtpConfig } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

export default function SettingsPage() {
  const { dataSource, activeTenantId } = useSettings();
  const { user: authUser } = usePlatformAuth();
  const [activeTab, setActiveTab] = useState('general');
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState<string | null>(null);

  // Discovery States for Jira
  const [jiraWorkspaces, setJiraWorkspaces] = useState<any[]>([]);
  const [jiraSchemas, setJiraSchemas] = useState<any[]>([]);
  const [jiraObjectTypes, setJiraObjectTypes] = useState<any[]>([]);
  const [isDiscoveryLoading, setIsDiscoveryLoading] = useState(false);

  // Import State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importName, setImportName] = useState('BSI Kompendium');
  const [importVersion, setImportVersion] = useState('2023');
  const [isImporting, setIsImporting] = useState(false);

  // Data Fetching
  const { data: tenants, refresh: refreshTenants } = usePluggableCollection<Tenant>('tenants');
  const { data: pUsers, refresh: refreshPUsers } = usePluggableCollection<PlatformUser>('platformUsers');
  const { data: importRuns, refresh: refreshImportRuns } = usePluggableCollection<ImportRun>('importRuns');
  const { data: jiraConfigs, refresh: refreshJira } = usePluggableCollection<JiraConfig>('jiraConfigs');
  const { data: aiConfigs, refresh: refreshAi } = usePluggableCollection<AiConfig>('aiConfigs');
  const { data: smtpConfigs, refresh: refreshSmtp } = usePluggableCollection<SmtpConfig>('smtpConfigs');

  // Local Form States (Drafts)
  const [jiraDraft, setJiraDraft] = useState<Partial<JiraConfig>>({});
  const [aiDraft, setAiDraft] = useState<Partial<AiConfig>>({});
  const [tenantDraft, setTenantDraft] = useState<Partial<Tenant>>({});
  const [smtpDraft, setSmtpDraft] = useState<Partial<SmtpConfig>>({});

  useEffect(() => {
    if (jiraConfigs && jiraConfigs.length > 0) {
      setJiraDraft(jiraConfigs[0]);
    } else {
      setJiraDraft({ id: 'jira-default', enabled: false });
    }
  }, [jiraConfigs]);

  useEffect(() => {
    if (aiConfigs && aiConfigs.length > 0) {
      setAiDraft(aiConfigs[0]);
    } else {
      setAiDraft({ id: 'ai-default', enabled: false, provider: 'ollama' });
    }
  }, [aiConfigs]);

  useEffect(() => {
    if (smtpConfigs && smtpConfigs.length > 0) {
      setSmtpDraft(smtpConfigs[0]);
    } else {
      setSmtpDraft({ id: 'smtp-default', enabled: false });
    }
  }, [smtpConfigs]);

  useEffect(() => {
    const current = tenants?.find(t => t.id === (activeTenantId === 'all' ? 't1' : activeTenantId));
    if (current) setTenantDraft(current);
  }, [tenants, activeTenantId]);

  const handleSaveConfig = async (collection: string, id: string, data: any) => {
    setIsSaving(true);
    try {
      const res = await saveCollectionRecord(collection, id, data, dataSource);
      if (res.success) {
        toast({ title: "Einstellungen gespeichert" });
        if (collection === 'jiraConfigs') refreshJira();
        if (collection === 'aiConfigs') refreshAi();
        if (collection === 'tenants') refreshTenants();
        if (collection === 'platformUsers') refreshPUsers();
        if (collection === 'smtpConfigs') refreshSmtp();
      } else throw new Error(res.error || "Fehler");
    } catch (e: any) {
      toast({ variant: "destructive", title: "Fehler", description: e.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestJira = async () => {
    setIsTesting('jira');
    const res = await testJiraConnectionAction(jiraDraft);
    if (res.success) toast({ title: "Jira Verbindung OK", description: res.message });
    else toast({ variant: "destructive", title: "Jira Fehler", description: res.message });
    setIsTesting(null);
  };

  const handleDiscoverWorkspaces = async () => {
    if (!jiraDraft.url || !jiraDraft.apiToken) return;
    setIsDiscoveryLoading(true);
    try {
      const res = await getJiraWorkspacesAction({ 
        url: jiraDraft.url, email: jiraDraft.email || '', apiToken: jiraDraft.apiToken 
      });
      if (res.success && res.workspaces) setJiraWorkspaces(res.workspaces);
    } catch (e) {} finally {
      setIsDiscoveryLoading(false);
    }
  };

  const handleDiscoverSchemas = async (workspaceId: string) => {
    if (!jiraDraft.url || !jiraDraft.apiToken) return;
    setIsDiscoveryLoading(true);
    try {
      const res = await getJiraSchemasAction({ 
        url: jiraDraft.url, email: jiraDraft.email || '', apiToken: jiraDraft.apiToken, workspaceId 
      });
      if (res.success) setJiraSchemas(res.schemas || []);
    } catch (e) {} finally {
      setIsDiscoveryLoading(false);
    }
  };

  const handleDiscoverObjectTypes = async (schemaId: string) => {
    if (!jiraDraft.url || !jiraDraft.workspaceId) return;
    setIsDiscoveryLoading(true);
    try {
      const res = await getJiraObjectTypesAction({
        url: jiraDraft.url, email: jiraDraft.email || '', apiToken: jiraDraft.apiToken!, workspaceId: jiraDraft.workspaceId, schemaId
      });
      if (res.success) setJiraObjectTypes(res.objectTypes || []);
    } catch (e) {} finally {
      setIsDiscoveryLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.name.toLowerCase().endsWith('.xml')) {
        toast({ variant: "destructive", title: "Ungültiges Format", description: "Bitte laden Sie eine XML-Datei hoch." });
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleRunXmlImport = async () => {
    if (!selectedFile) return;
    setIsImporting(true);
    
    try {
      const reader = new FileReader();
      
      const xmlContent = await new Promise<string>((resolve, reject) => {
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = () => reject(new Error("Fehler beim Lesen der Datei"));
        reader.readAsText(selectedFile);
      });

      const res = await runBsiXmlImportAction({
        catalogName: importName,
        version: importVersion,
        xmlContent
      }, dataSource);

      if (res.success) {
        toast({ title: "Import erfolgreich", description: res.message });
        setSelectedFile(null);
        refreshImportRuns();
      } else throw new Error(res.message);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Import fehlgeschlagen", description: e.message });
    } finally {
      setIsImporting(false);
    }
  };

  const navItems = [
    { id: 'general', label: 'Organisation', icon: Building2 },
    { id: 'pusers', label: 'Plattform-Nutzer', icon: Users },
    { id: 'sync', label: 'Identität & Sync', icon: Network },
    { id: 'integrations', label: 'Jira Gateway', icon: RefreshCw },
    { id: 'ai', label: 'KI Access Advisor', icon: BrainCircuit },
    { id: 'email', label: 'E-Mail (SMTP)', icon: Mail },
    { id: 'risks', label: 'Risiko-Steuerung', icon: Scale },
    { id: 'data', label: 'Katalog-Import', icon: FileCode },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex items-center justify-between border-b pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight uppercase font-headline">Systemeinstellungen</h1>
          <p className="text-muted-foreground text-sm mt-1">Konfiguration der Governance-Engine und Infrastruktur.</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col lg:flex-row gap-8">
        <aside className="w-full lg:w-60 shrink-0">
          <TabsList className="flex flex-col h-auto bg-transparent gap-1 p-0">
            {navItems.map((item) => (
              <TabsTrigger 
                key={item.id} 
                value={item.id}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-none border border-transparent transition-all text-left justify-start data-[state=active]:bg-white data-[state=active]:border-border data-[state=active]:shadow-sm data-[state=active]:text-primary text-muted-foreground hover:bg-muted/50",
                )}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                <span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </aside>

        <div className="flex-1 min-w-0">
          {/* 1. General Section */}
          <TabsContent value="general" className="mt-0 space-y-6">
            <Card className="rounded-none border shadow-none">
              <CardHeader className="bg-muted/10 border-b py-4">
                <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-primary">Mandanten-Stammdaten</CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase">Unternehmensname</Label>
                    <Input value={tenantDraft.name || ''} onChange={e => setTenantDraft({...tenantDraft, name: e.target.value})} className="rounded-none h-10" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase">Eindeutiger Slug</Label>
                    <Input value={tenantDraft.slug || ''} disabled className="rounded-none h-10 bg-muted/20 font-mono" />
                  </div>
                </div>
                <div className="flex justify-end pt-4">
                  <Button onClick={() => handleSaveConfig('tenants', tenantDraft.id!, tenantDraft)} disabled={isSaving} className="rounded-none font-bold uppercase text-[10px] gap-2 px-10 h-11">
                    {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    Mandant Speichern
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 2. Platform Users Section */}
          <TabsContent value="pusers" className="mt-0">
            <Card className="rounded-none border shadow-none">
              <CardHeader className="bg-muted/10 border-b py-4 flex flex-row items-center justify-between">
                <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-primary">Plattform-Administratoren</CardTitle>
                <Button size="sm" className="h-8 rounded-none text-[9px] font-bold uppercase"><Plus className="w-3.5 h-3.5 mr-1" /> Neu hinzufügen</Button>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-muted/20">
                    <TableRow>
                      <TableHead className="text-[10px] font-bold uppercase py-3 px-6">Nutzer</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase">Rolle</TableHead>
                      <TableHead className="text-[10px] font-bold uppercase text-right pr-6">Aktionen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pUsers?.map(pu => (
                      <TableRow key={pu.id}>
                        <TableCell className="py-3 px-6">
                          <div className="font-bold text-xs">{pu.displayName}</div>
                          <div className="text-[9px] text-muted-foreground">{pu.email}</div>
                        </TableCell>
                        <TableCell><Badge variant="outline" className="text-[8px] uppercase font-bold rounded-none">{pu.role}</Badge></TableCell>
                        <TableCell className="text-right pr-6">
                          <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="w-3.5 h-3.5" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 3. Identität & Sync Section */}
          <TabsContent value="sync" className="mt-0 space-y-6">
            <Card className="rounded-none border shadow-none">
              <CardHeader className="bg-muted/10 border-b py-4 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-primary">Active Directory / LDAP Anbindung</CardTitle>
                  <CardDescription className="text-[9px] uppercase font-bold mt-1">Konfiguration für automatisierten Identitätsabgleich.</CardDescription>
                </div>
                <Switch checked={!!tenantDraft.ldapEnabled} onCheckedChange={val => setTenantDraft({...tenantDraft, ldapEnabled: val})} />
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase">Server URL</Label>
                    <Input value={tenantDraft.ldapUrl || ''} onChange={e => setTenantDraft({...tenantDraft, ldapUrl: e.target.value})} placeholder="ldap://dc01.firma.local" className="rounded-none h-10" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase">Port</Label>
                    <Input value={tenantDraft.ldapPort || '389'} onChange={e => setTenantDraft({...tenantDraft, ldapPort: e.target.value})} className="rounded-none h-10" />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label className="text-[10px] font-bold uppercase">Base DN (Users)</Label>
                    <Input value={tenantDraft.ldapBaseDn || ''} onChange={e => setTenantDraft({...tenantDraft, ldapBaseDn: e.target.value})} placeholder="OU=Users,DC=firma,DC=local" className="rounded-none h-10 font-mono text-xs" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase">Bind DN (Service Account)</Label>
                    <Input value={tenantDraft.ldapBindDn || ''} onChange={e => setTenantDraft({...tenantDraft, ldapBindDn: e.target.value})} className="rounded-none h-10 font-mono text-xs" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase">Bind Password</Label>
                    <Input type="password" value={tenantDraft.ldapBindPassword || ''} onChange={e => setTenantDraft({...tenantDraft, ldapBindPassword: e.target.value})} className="rounded-none h-10" />
                  </div>
                </div>
                <div className="flex justify-end pt-4">
                  <Button onClick={() => handleSaveConfig('tenants', tenantDraft.id!, tenantDraft)} disabled={isSaving} className="rounded-none font-bold uppercase text-[10px] gap-2 px-10 h-11">
                    <Save className="w-3.5 h-3.5" /> LDAP Speichern
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 4. Jira Gateway Section */}
          <TabsContent value="integrations" className="mt-0">
            <Card className="rounded-none border shadow-none">
              <CardHeader className="bg-muted/10 border-b py-4 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-primary">Jira Service Management Gateway</CardTitle>
                  <CardDescription className="text-[9px] uppercase font-bold mt-1">Automatisierung von Onboarding-Tickets und Assets-Sync.</CardDescription>
                </div>
                <Switch checked={!!jiraDraft.enabled} onCheckedChange={v => setJiraDraft({...jiraDraft, enabled: v})} />
              </CardHeader>
              <CardContent className="p-8">
                <Tabs defaultValue="basic" className="space-y-8">
                  <TabsList className="bg-slate-100 rounded-none h-10 p-1 border">
                    <TabsTrigger value="basic" className="rounded-none text-[9px] font-bold uppercase px-6">Verbindung</TabsTrigger>
                    <TabsTrigger value="ticketing" className="rounded-none text-[9px] font-bold uppercase px-6">Prozesse</TabsTrigger>
                    <TabsTrigger value="assets" className="rounded-none text-[9px] font-bold uppercase px-6">Assets Sync</TabsTrigger>
                  </TabsList>

                  <TabsContent value="basic" className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2 col-span-2">
                        <Label className="text-[10px] font-bold uppercase">Cloud Instanz URL</Label>
                        <Input value={jiraDraft.url || ''} onChange={e => setJiraDraft({...jiraDraft, url: e.target.value})} placeholder="https://firma.atlassian.net" className="rounded-none h-10" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase">Administrator E-Mail</Label>
                        <Input value={jiraDraft.email || ''} onChange={e => setJiraDraft({...jiraDraft, email: e.target.value})} className="rounded-none h-10" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase">API Token</Label>
                        <Input type="password" value={jiraDraft.apiToken || ''} onChange={e => setJiraDraft({...jiraDraft, apiToken: e.target.value})} className="rounded-none h-10" />
                      </div>
                    </div>
                    <Button variant="outline" className="w-full h-10 rounded-none font-bold uppercase text-[9px] gap-2" onClick={handleTestJira} disabled={!!isTesting}>
                      {isTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} 
                      Verbindung testen
                    </Button>
                  </TabsContent>

                  <TabsContent value="ticketing" className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase">Jira Projekt Key</Label>
                        <Input value={jiraDraft.projectKey || ''} onChange={e => setJiraDraft({...jiraDraft, projectKey: e.target.value})} placeholder="IT" className="rounded-none font-black uppercase" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase">Vorgangstyp Name</Label>
                        <Input value={jiraDraft.issueTypeName || 'Task'} onChange={e => setJiraDraft({...jiraDraft, issueTypeName: e.target.value})} className="rounded-none" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase">Status: Genehmigt</Label>
                        <Input value={jiraDraft.approvedStatusName || 'Approved'} onChange={e => setJiraDraft({...jiraDraft, approvedStatusName: e.target.value})} className="rounded-none" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase">Status: Erledigt</Label>
                        <Input value={jiraDraft.doneStatusName || 'Done'} onChange={e => setJiraDraft({...jiraDraft, doneStatusName: e.target.value})} className="rounded-none" />
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="assets" className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <Label className="text-[10px] font-bold uppercase">1. Assets Workspace</Label>
                          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={handleDiscoverWorkspaces}><RefreshCw className="w-3 h-3" /></Button>
                        </div>
                        <Select value={jiraDraft.workspaceId || ''} onValueChange={v => { setJiraDraft({...jiraDraft, workspaceId: v}); handleDiscoverSchemas(v); }}>
                          <SelectTrigger className="rounded-none h-10"><SelectValue placeholder="Wählen..." /></SelectTrigger>
                          <SelectContent className="rounded-none">
                            {jiraWorkspaces.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <Label className="text-[10px] font-bold uppercase">2. Object Schema</Label>
                          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => jiraDraft.workspaceId && handleDiscoverSchemas(jiraDraft.workspaceId)}><RefreshCw className="w-3 h-3" /></Button>
                        </div>
                        <Select value={jiraDraft.schemaId || ''} onValueChange={v => { setJiraDraft({...jiraDraft, schemaId: v}); handleDiscoverObjectTypes(v); }}>
                          <SelectTrigger className="rounded-none h-10"><SelectValue placeholder="Wählen..." /></SelectTrigger>
                          <SelectContent className="rounded-none">
                            {jiraSchemas.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
                <Separator className="my-8" />
                <div className="flex justify-end">
                  <Button onClick={() => handleSaveConfig('jiraConfigs', jiraDraft.id!, jiraDraft)} disabled={isSaving} className="rounded-none font-bold uppercase text-[10px] gap-2 px-10 h-11">
                    <Save className="w-4 h-4" /> Jira Konfiguration Speichern
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 5. AI Advisor Section */}
          <TabsContent value="ai" className="mt-0">
            <Card className="rounded-none border shadow-none">
              <CardHeader className="bg-muted/10 border-b py-4 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-primary">KI Access Advisor Engine</CardTitle>
                  <CardDescription className="text-[9px] uppercase font-bold mt-1">Unterstützung bei Risiko-Assessments und Rollen-Empfehlungen.</CardDescription>
                </div>
                <Switch checked={!!aiDraft.enabled} onCheckedChange={v => setAiDraft({...aiDraft, enabled: v})} />
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase">Provider</Label>
                    <Select value={aiDraft.provider} onValueChange={(v: any) => setAiDraft({...aiDraft, provider: v})}>
                      <SelectTrigger className="rounded-none h-10"><SelectValue /></SelectTrigger>
                      <SelectContent className="rounded-none">
                        <SelectItem value="ollama">Ollama (Local / On-Premise)</SelectItem>
                        <SelectItem value="google">Google Gemini (Cloud)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase">{aiDraft.provider === 'ollama' ? 'Ollama API URL' : 'Gemini Modell'}</Label>
                    {aiDraft.provider === 'ollama' ? (
                      <Input placeholder="http://localhost:11434" value={aiDraft.ollamaUrl || ''} onChange={e => setAiDraft({...aiDraft, ollamaUrl: e.target.value})} className="rounded-none" />
                    ) : (
                      <Input value={aiDraft.geminiModel || 'gemini-1.5-flash'} onChange={e => setAiDraft({...aiDraft, geminiModel: e.target.value})} className="rounded-none" />
                    )}
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button onClick={() => handleSaveConfig('aiConfigs', aiDraft.id!, aiDraft)} disabled={isSaving} className="rounded-none font-bold uppercase text-[10px] px-10 h-11">
                    KI Advisor Speichern
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 6. E-Mail Section */}
          <TabsContent value="email" className="mt-0">
            <Card className="rounded-none border shadow-none">
              <CardHeader className="bg-muted/10 border-b py-4 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-primary">SMTP Mail-Benachrichtigungen</CardTitle>
                  <CardDescription className="text-[9px] uppercase font-bold mt-1">Versand von Audit-Alerts und System-Mails.</CardDescription>
                </div>
                <Switch checked={!!smtpDraft.enabled} onCheckedChange={v => setSmtpDraft({...smtpDraft, enabled: v})} />
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2 col-span-2">
                    <Label className="text-[10px] font-bold uppercase">SMTP Host</Label>
                    <Input value={smtpDraft.host || ''} onChange={e => setSmtpDraft({...smtpDraft, host: e.target.value})} placeholder="smtp.firma.local" className="rounded-none h-10" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase">Port</Label>
                    <Input value={smtpDraft.port || '587'} onChange={e => setSmtpDraft({...smtpDraft, port: e.target.value})} className="rounded-none h-10" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase">Absender-E-Mail (From)</Label>
                    <Input value={smtpDraft.fromEmail || ''} onChange={e => setSmtpDraft({...smtpDraft, fromEmail: e.target.value})} placeholder="compliance@firma.de" className="rounded-none h-10" />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button onClick={() => handleSaveConfig('smtpConfigs', smtpDraft.id!, smtpDraft)} disabled={isSaving} className="rounded-none font-bold uppercase text-[10px] px-10 h-11">
                    SMTP Speichern
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 7. Risiko-Zyklen Section */}
          <TabsContent value="risks" className="mt-0">
            <Card className="rounded-none border shadow-none">
              <CardHeader className="bg-muted/10 border-b py-4">
                <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-primary">Compliance Risiko Review Zyklen</CardTitle>
                <CardDescription className="text-[9px] uppercase font-bold mt-1">Definition der Überprüfungszeiträume für das Risikoinventar.</CardDescription>
              </CardHeader>
              <CardContent className="p-8">
                <div className="space-y-4 max-w-sm">
                  {['IT-Sicherheit', 'Datenschutz', 'Rechtlich', 'Betrieblich'].map(c => (
                    <div key={c} className="flex justify-between items-center p-4 border bg-slate-50/50">
                      <span className="text-[11px] font-bold uppercase">{c}</span>
                      <div className="flex items-center gap-2">
                        <Input type="number" defaultValue="365" className="w-20 h-9 rounded-none text-center font-bold" />
                        <span className="text-[9px] font-bold text-muted-foreground uppercase">Tage</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 8. BSI Data Import Section */}
          <TabsContent value="data" className="mt-0 space-y-6">
            <Card className="rounded-none border shadow-none">
              <CardHeader className="bg-muted/10 border-b py-4">
                <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-primary">BSI IT-Grundschutz XML Import</CardTitle>
                <CardDescription className="text-[9px] uppercase font-bold mt-1">Einlesen offizieller Gefährdungskataloge zur Risiko-Ableitung.</CardDescription>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase">Katalog-Name</Label>
                    <Input value={importName} onChange={e => setImportName(e.target.value)} className="rounded-none h-10" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase">Katalog-Version</Label>
                    <Input value={importVersion} onChange={e => setImportVersion(e.target.value)} placeholder="z.B. 2023" className="rounded-none h-10" />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-2"><FileCode className="w-3.5 h-3.5" /> XML-Datei hochladen</Label>
                  <div 
                    className={cn(
                      "relative border-2 border-dashed rounded-none p-12 text-center flex flex-col items-center gap-4 transition-colors",
                      selectedFile ? "border-primary bg-primary/5" : "border-slate-200 bg-slate-50 hover:bg-slate-100"
                    )}
                  >
                    <div className={cn("w-16 h-16 rounded-full flex items-center justify-center", selectedFile ? "bg-primary/20 text-primary" : "bg-slate-200 text-slate-400")}>
                      {isImporting ? <Loader2 className="w-8 h-8 animate-spin" /> : <FileUp className="w-8 h-8" />}
                    </div>
                    <div className="space-y-1">
                      {selectedFile ? (
                        <p className="text-sm font-bold">{selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)</p>
                      ) : (
                        <>
                          <p className="text-sm font-bold uppercase">Datei hierher ziehen oder klicken</p>
                          <p className="text-[10px] text-muted-foreground font-bold uppercase">Unterstützt offizielle BSI .xml Formate</p>
                        </>
                      )}
                    </div>
                    <input 
                      type="file" 
                      accept=".xml" 
                      onChange={handleFileChange} 
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                      disabled={isImporting}
                    />
                    {!selectedFile && (
                      <Button variant="outline" className="rounded-none uppercase font-bold text-[9px] pointer-events-none">Datei auswählen</Button>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setSelectedFile(null)} className="rounded-none text-[10px] font-bold uppercase h-11" disabled={isImporting}>Leeren</Button>
                  <Button onClick={handleRunXmlImport} disabled={!selectedFile || isImporting} className="rounded-none font-bold uppercase text-[10px] h-11 px-12 gap-2 bg-slate-900 text-white">
                    {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} 
                    {isImporting ? 'Wird verarbeitet...' : 'Katalog Importieren'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-none border shadow-none">
              <CardHeader className="bg-slate-900 text-white py-3 flex flex-row items-center justify-between">
                <CardTitle className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2"><History className="w-4 h-4" /> Import Historie</CardTitle>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => refreshImportRuns()}><RefreshCw className="w-3 h-3" /></Button>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-64">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead className="text-[9px] font-bold uppercase py-2 px-6">Zeitpunkt</TableHead>
                        <TableHead className="text-[9px] font-bold uppercase">Katalog</TableHead>
                        <TableHead className="text-[9px] font-bold uppercase">Status</TableHead>
                        <TableHead className="text-right pr-6 text-[9px] font-bold uppercase">Einträge</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importRuns?.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map(run => (
                        <TableRow key={run.id}>
                          <TableCell className="text-[10px] font-mono px-6">{new Date(run.timestamp).toLocaleString()}</TableCell>
                          <TableCell className="text-[10px] font-bold uppercase">{run.catalogId?.split('-').slice(1,-1).join(' ') || '---'}</TableCell>
                          <TableCell><Badge variant="outline" className={cn("text-[8px] font-bold border-none px-1.5", run.status === 'success' ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700")}>{run.status}</Badge></TableCell>
                          <TableCell className="text-right pr-6 font-bold text-xs">{run.itemCount}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
