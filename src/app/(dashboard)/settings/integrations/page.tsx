
"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  RefreshCw, 
  Loader2, 
  Ticket, 
  Layers, 
  ShieldCheck, 
  Save
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { usePluggableCollection } from '@/hooks/data/use-pluggable-collection';
import { useSettings } from '@/context/settings-context';
import { saveCollectionRecord } from '@/app/actions/mysql-actions';
import { 
  testJiraConnectionAction, 
  getJiraProjectsAction,
  getJiraProjectMetadataAction,
  getJiraWorkspacesAction,
  getJiraSchemasAction,
  getJiraObjectTypesAction
} from '@/app/actions/jira-actions';
import { JiraConfig } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

export default function JiraGatewaySettingsPage() {
  const { dataSource } = useSettings();
  const [isSaving, setIsSaving] = useState(false);
  const [isJiraFetching, setIsJiraFetching] = useState(false);
  
  const [jiraDraft, setJiraDraft] = useState<Partial<JiraConfig>>({});
  
  const [jiraProjects, setJiraProjects] = useState<any[]>([]);
  const [jiraIssueTypes, setJiraIssueTypes] = useState<any[]>([]);
  const [jiraStatuses, setJiraStatuses] = useState<any[]>([]);
  const [jiraWorkspaces, setJiraWorkspaces] = useState<any[]>([]);
  const [jiraSchemas, setJiraSchemas] = useState<any[]>([]);
  const [jiraObjectTypes, setJiraObjectTypes] = useState<any[]>([]);

  const { data: configs, refresh } = usePluggableCollection<JiraConfig>('jiraConfigs');

  useEffect(() => {
    if (configs && configs.length > 0) setJiraDraft(configs[0]);
    else setJiraDraft({ id: 'jira-default', enabled: false });
  }, [configs]);

  const handleFetchJiraOptions = async () => {
    if (!jiraDraft.url || !jiraDraft.apiToken) {
      toast({ variant: "destructive", title: "Fehlende Daten", description: "URL und Token erforderlich." });
      return;
    }
    setIsJiraFetching(true);
    try {
      const [pRes, wRes] = await Promise.all([
        getJiraProjectsAction(jiraDraft),
        getJiraWorkspacesAction(jiraDraft)
      ]);
      if (pRes.success) setJiraProjects(pRes.projects || []);
      if (wRes.success) setJiraWorkspaces(wRes.workspaces || []);
      toast({ title: "Jira Optionen geladen" });
    } finally {
      setIsJiraFetching(false);
    }
  };

  useEffect(() => {
    if (jiraDraft.projectKey && jiraDraft.url && jiraDraft.apiToken) {
      getJiraProjectMetadataAction(jiraDraft, jiraDraft.projectKey).then(meta => {
        if (meta.success) {
          setJiraIssueTypes(meta.issueTypes || []);
          setJiraStatuses(meta.statuses || []);
        }
      });
    }
  }, [jiraDraft.projectKey, jiraDraft.url, jiraDraft.apiToken]);

  useEffect(() => {
    if (jiraDraft.workspaceId && jiraDraft.url && jiraDraft.apiToken) {
      getJiraSchemasAction(jiraDraft, jiraDraft.workspaceId).then(res => {
        if (res.success) setJiraSchemas(res.schemas || []);
      });
    }
  }, [jiraDraft.workspaceId, jiraDraft.url, jiraDraft.apiToken]);

  useEffect(() => {
    if (jiraDraft.workspaceId && jiraDraft.schemaId && jiraDraft.url && jiraDraft.apiToken) {
      getJiraObjectTypesAction(jiraDraft, jiraDraft.workspaceId, jiraDraft.schemaId).then(res => {
        if (res.success) setJiraObjectTypes(res.objectTypes || []);
      });
    }
  }, [jiraDraft.schemaId, jiraDraft.workspaceId, jiraDraft.url, jiraDraft.apiToken]);

  const handleSave = async () => {
    if (!jiraDraft.id) return;
    setIsSaving(true);
    try {
      const res = await saveCollectionRecord('jiraConfigs', jiraDraft.id, jiraDraft, dataSource);
      if (res.success) {
        toast({ title: "Konfiguration gespeichert" });
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
          <RefreshCw className="w-4 h-4" /> Jira Gateway (API v3)
        </CardTitle>
      </CardHeader>
      <CardContent className="p-8 space-y-10">
        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 border bg-blue-50/20 rounded-none">
            <div className="space-y-0.5">
              <Label className="text-sm font-bold">Jira Gateway aktiv</Label>
              <p className="text-[9px] uppercase font-bold text-muted-foreground">Automatische Erstellung von Berechtigungs-Tickets.</p>
            </div>
            <Switch checked={!!jiraDraft.enabled} onCheckedChange={v => setJiraDraft({...jiraDraft, enabled: v})} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2"><Label className="text-[10px] font-bold uppercase">Jira Cloud URL</Label><Input value={jiraDraft.url || ''} onChange={e => setJiraDraft({...jiraDraft, url: e.target.value})} placeholder="https://firma.atlassian.net" className="rounded-none h-10" /></div>
            <div className="space-y-2"><Label className="text-[10px] font-bold uppercase">Reporter E-Mail</Label><Input value={jiraDraft.email || ''} onChange={e => setJiraDraft({...jiraDraft, email: e.target.value})} className="rounded-none h-10" /></div>
            <div className="space-y-2 md:col-span-2"><Label className="text-[10px] font-bold uppercase">API Token</Label><Input type="password" value={jiraDraft.apiToken || ''} onChange={e => setJiraDraft({...jiraDraft, apiToken: e.target.value})} className="rounded-none h-10" /></div>
          </div>
        </div>

        <Separator />

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase text-muted-foreground flex items-center gap-2">
              <Ticket className="w-3.5 h-3.5" /> 1. Workflow & Tickets
            </h3>
            <Button variant="outline" size="sm" onClick={handleFetchJiraOptions} disabled={isJiraFetching} className="h-8 rounded-none text-[9px] font-bold uppercase gap-2">
              {isJiraFetching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} 
              Optionen laden
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase">Projekt</Label>
              <Select value={jiraDraft.projectKey || ''} onValueChange={v => setJiraDraft({...jiraDraft, projectKey: v})}>
                <SelectTrigger className="rounded-none h-10"><SelectValue placeholder="Projekt..." /></SelectTrigger>
                <SelectContent className="rounded-none">
                  {jiraProjects.map(p => <SelectItem key={p.key} value={p.key}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase">Vorgangstyp</Label>
              <Select value={jiraDraft.issueTypeName || ''} onValueChange={v => setJiraDraft({...jiraDraft, issueTypeName: v})}>
                <SelectTrigger className="rounded-none h-10"><SelectValue placeholder="Typ..." /></SelectTrigger>
                <SelectContent className="rounded-none">
                  {jiraIssueTypes.map(it => <SelectItem key={it.name} value={it.name}>{it.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase text-emerald-600">Genehmigungs-Status</Label>
              <Select value={jiraDraft.approvedStatusName || ''} onValueChange={v => setJiraDraft({...jiraDraft, approvedStatusName: v})}>
                <SelectTrigger className="rounded-none h-10"><SelectValue placeholder="Wählen..." /></SelectTrigger>
                <SelectContent className="rounded-none">
                  {jiraStatuses.map(s => <SelectItem key={`app-${s.name}`} value={s.name}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase text-blue-600">Erledigt-Status</Label>
              <Select value={jiraDraft.doneStatusName || ''} onValueChange={v => setJiraDraft({...jiraDraft, doneStatusName: v})}>
                <SelectTrigger className="rounded-none h-10"><SelectValue placeholder="Wählen..." /></SelectTrigger>
                <SelectContent className="rounded-none">
                  {jiraStatuses.map(s => <SelectItem key={`done-${s.name}`} value={s.name}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Separator />

        <div className="space-y-6">
          <h3 className="text-xs font-black uppercase text-muted-foreground flex items-center gap-2">
            <Layers className="w-3.5 h-3.5" /> 2. JSM Assets Discovery
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase">Workspace</Label>
              <Select value={jiraDraft.workspaceId || ''} onValueChange={v => setJiraDraft({...jiraDraft, workspaceId: v, schemaId: '', objectTypeId: '', entitlementObjectTypeId: ''})}>
                <SelectTrigger className="rounded-none h-10"><SelectValue placeholder="Workspace..." /></SelectTrigger>
                <SelectContent className="rounded-none">
                  {jiraWorkspaces.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase">Schema</Label>
              <Select value={jiraDraft.schemaId || ''} onValueChange={v => setJiraDraft({...jiraDraft, schemaId: v, objectTypeId: '', entitlementObjectTypeId: ''})}>
                <SelectTrigger className="rounded-none h-10" disabled={!jiraDraft.workspaceId}><SelectValue placeholder="Schema..." /></SelectTrigger>
                <SelectContent className="rounded-none">
                  {jiraSchemas.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase">Typ: IT-Systeme</Label>
              <Select value={jiraDraft.objectTypeId || ''} onValueChange={v => setJiraDraft({...jiraDraft, objectTypeId: v})}>
                <SelectTrigger className="rounded-none h-10" disabled={!jiraDraft.schemaId}><SelectValue placeholder="Typ wählen..." /></SelectTrigger>
                <SelectContent className="rounded-none">
                  {jiraObjectTypes.map(ot => <SelectItem key={ot.id} value={ot.id}>{ot.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase">Typ: Rollen</Label>
              <Select value={jiraDraft.entitlementObjectTypeId || ''} onValueChange={v => setJiraDraft({...jiraDraft, entitlementObjectTypeId: v})}>
                <SelectTrigger className="rounded-none h-10" disabled={!jiraDraft.schemaId}><SelectValue placeholder="Typ wählen..." /></SelectTrigger>
                <SelectContent className="rounded-none">
                  {jiraObjectTypes.map(ot => <SelectItem key={`role-${ot.id}`} value={ot.id}>{ot.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center pt-6 border-t">
          <Button variant="outline" onClick={() => testJiraConnectionAction(jiraDraft).then(res => toast({ title: "Jira-Test", description: res.message }))} className="rounded-none text-[10px] font-bold uppercase h-11 px-8">Verbindung Testen</Button>
          <Button onClick={handleSave} disabled={isSaving} className="rounded-none font-bold uppercase text-[10px] px-12 h-11 gap-2">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Konfiguration Speichern
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
