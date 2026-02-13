'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Network, 
  RefreshCw, 
  Loader2, 
  Play, 
  ShieldCheck, 
  Lock,
  Globe,
  Database,
  Building2,
  Activity,
  ArrowRight,
  Save,
  ShieldAlert,
  Server,
  KeyRound,
  FileCheck,
  Send,
  Users,
  Info,
  AlertTriangle,
  FileText,
  X,
  UserPlus,
  Check,
  Search,
  Fingerprint,
  Bug,
  Eye,
  FileCode,
  Terminal,
  Clock,
  Minus
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { usePluggableCollection } from '@/hooks/data/use-pluggable-collection';
import { useSettings } from '@/context/settings-context';
import { saveCollectionRecord } from '@/app/actions/mysql-actions';
import { 
  triggerSyncJobAction, 
  testLdapConnectionAction, 
  getAdUsersAction,
  importUsersAction 
} from '@/app/actions/sync-actions';
import { Tenant, SyncJob, User } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { usePlatformAuth } from '@/context/auth-context';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { useRouter } from 'next/navigation';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';


export default function SyncSettingsPage() {
  const router = useRouter();
  const { dataSource, activeTenantId } = useSettings();
  const { user: authUser } = usePlatformAuth();
  
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isJobRunning, setIsJobRunning] = useState<string | null>(null);
  
  const [tenantDraft, setTenantDraft] = useState<Partial<Tenant>>({});
  const [selectedJobMessage, setSelectedJobMessage] = useState<string | null>(null);
  const [selectedLogEntry, setSelectedLogEntry] = useState<any>(null);

  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isFetchingAd, setIsFetchingAd] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [adUsers, setAdUsers] = useState<any[]>([]);
  const [selectedAdUsers, setSelectedAdUsers] = useState<any[]>([]);
  const [adSearch, setAdSearch] = useState('');

  const { data: tenants, refresh: refreshTenants, isLoading: isTenantsLoading } = usePluggableCollection<Tenant>('tenants');
  const { data: syncJobs, refresh: refreshJobs } = usePluggableCollection<SyncJob>('syncJobs');
  const { data: ldapLogs, refresh: refreshLogs } = usePluggableCollection<any>('ldapLogs');
  const { data: hubUsers } = usePluggableCollection<User>('users');

  useEffect(() => {
    const current = tenants?.find(t => t.id === (activeTenantId === 'all' ? 't1' : activeTenantId));
    if (current) setTenantDraft(current);
  }, [tenants, activeTenantId]);

  const handleSaveLdap = async () => {
    if (!tenantDraft.id) return;
    setIsSaving(true);
    try {
      const res = await saveCollectionRecord('tenants', tenantDraft.id, tenantDraft, dataSource);
      if (res.success) {
        toast({ title: "LDAP-Konfiguration gespeichert" });
        refreshTenants();
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestLdap = async () => {
    setIsTesting(true);
    try {
      if (tenantDraft.id) {
        await saveCollectionRecord('tenants', tenantDraft.id, tenantDraft, dataSource);
      }
      const res = await testLdapConnectionAction(tenantDraft);
      toast({ title: "LDAP Test", description: res.message, variant: res.success ? "default" : "destructive" });
      setTimeout(refreshLogs, 500);
    } finally {
      setIsTesting(false);
    }
  };

  const handleOpenImport = async () => {
    setIsImportOpen(true);
    fetchAdUsers();
  };

  const fetchAdUsers = async (query: string = '') => {
    setIsFetchingAd(true);
    try {
      const users = await getAdUsersAction(tenantDraft, dataSource, query);
      setAdUsers(users);
      setSelectedAdUsers([]);
    } catch (e: any) {
      toast({ variant: "destructive", title: "AD Fehler", description: e.message });
    } finally {
      setIsFetchingAd(false);
    }
  };

  const handleToggleAdUserSelection = (user: any) => {
    setSelectedAdUsers(prev => {
      const isAlreadySelected = prev.some(u => u.username === user.username);
      if (isAlreadySelected) {
        return prev.filter(u => u.username !== user.username);
      } else {
        return [...prev, user];
      }
    });
  };

  const handleSelectAllAdUsers = (checked: boolean) => {
    if (!checked) {
      setSelectedAdUsers([]);
      return;
    }
    
    const nonExistingUsers = adUsers.filter(adUser => 
      !hubUsers?.some(hu => 
        hu.externalId === adUser.username || 
        (hu.email && adUser.email && hu.email.toLowerCase() === adUser.email.toLowerCase())
      )
    );
    setSelectedAdUsers(nonExistingUsers);
  };

  const handleImportSelected = async () => {
    if (selectedAdUsers.length === 0) return;
    setIsImporting(true);
    try {
      const res = await importUsersAction(selectedAdUsers, dataSource, authUser?.email || 'system');
      if (res.success) {
        toast({ title: "Import abgeschlossen", description: `${res.count} Benutzer wurden verarbeitet.` });
        setIsImportOpen(false);
        setSelectedAdUsers([]);
        refreshLogs();
      }
    } finally {
      setIsImporting(false);
    }
  };

  const handleRunJob = async (jobId: string) => {
    setIsJobRunning(jobId);
    try {
      const res = await triggerSyncJobAction(jobId, dataSource, authUser?.email || 'system');
      if (res.success) {
        toast({ title: "Job abgeschlossen" });
        refreshJobs();
        refreshLogs();
      }
    } finally {
      setIsJobRunning(null);
    }
  };

  const sortedLogs = useMemo(() => {
    if (!ldapLogs) return [];
    return ldapLogs
      .filter((log: any) => activeTenantId === 'all' || log.tenantId === activeTenantId || log.tenantId === 'global')
      .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [ldapLogs, activeTenantId]);

  if (!tenantDraft.id && !isTenantsLoading) {
    return (
      <div className="p-12 text-center border-2 border-dashed rounded-2xl bg-slate-50">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <h3 className="font-bold text-lg text-slate-900">Kein Mandant gefunden</h3>
        <Button className="mt-6 rounded-xl font-bold px-8" onClick={() => router.push('/settings/organization')}>Zu Mandanten</Button>
      </div>
    );
  }

  const allFilteredUsersSelected = adUsers.length > 0 && 
    adUsers.filter(u => !hubUsers?.some(hu => hu.externalId === u.username || (hu.email && u.email && hu.email.toLowerCase() === u.email.toLowerCase())))
    .every(u => selectedAdUsers.some(su => su.username === u.username));

  return (
    <div className="p-4 md:p-8 space-y-10 pb-20 w-full mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b pb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary shadow-sm border border-primary/10">
            <Fingerprint className="w-6 h-6" />
          </div>
          <div>
            <Badge className="mb-1 rounded-full px-2 py-0 bg-primary/10 text-primary text-[9px] font-bold border-none uppercase tracking-widest">Infrastruktur</Badge>
            <h1 className="text-2xl font-headline font-bold text-slate-900 dark:text-white uppercase tracking-tight">Identitäts-Synchronisation</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Konfiguration der AD/LDAP Anbindung und Attribut-Steuerung.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-9 rounded-md font-bold text-xs px-6 border-indigo-200 text-indigo-700 hover:bg-indigo-50 shadow-sm transition-all" onClick={handleOpenImport}>
            <UserPlus className="w-3.5 h-3.5 mr-2" /> AD Benutzer importieren
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-10">
          <Card className="rounded-2xl border shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
            <CardHeader className="p-8 bg-slate-50 dark:bg-slate-800/50 border-b shrink-0">
              <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-white flex items-center gap-3">
                <Server className="w-5 h-5 text-primary" /> 1. Verbindungs-Parameter
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-10">
              <div className="flex items-center justify-between p-6 bg-primary/5 dark:bg-slate-950 rounded-xl border border-primary/10">
                <div className="space-y-1">
                  <Label className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase">LDAP Integration aktiv</Label>
                  <p className="text-[10px] uppercase font-bold text-slate-400 italic">Synchronisiert Identitäten und Gruppen automatisch.</p>
                </div>
                <Switch checked={!!tenantDraft.ldapEnabled} onCheckedChange={v => setTenantDraft({...tenantDraft, ldapEnabled: v})} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">LDAP Server URL</Label>
                  <Input value={tenantDraft.ldapUrl || ''} onChange={e => setTenantDraft({...tenantDraft, ldapUrl: e.target.value})} placeholder="ldap://dc1.firma.local" className="rounded-xl h-12" />
                </div>
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Port</Label>
                  <Input value={tenantDraft.ldapPort || ''} onChange={e => setTenantDraft({...tenantDraft, ldapPort: e.target.value})} placeholder="389 / 636" className="rounded-xl h-12" />
                </div>
                <div className="space-y-3 lg:col-span-3">
                  <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Base DN</Label>
                  <Input value={tenantDraft.ldapBaseDn || ''} onChange={e => setTenantDraft({...tenantDraft, ldapBaseDn: e.target.value})} placeholder="OU=Users,DC=firma,DC=local" className="rounded-xl h-12" />
                </div>
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Bind-User (UPN)</Label>
                  <Input value={tenantDraft.ldapBindDn || ''} onChange={e => setTenantDraft({...tenantDraft, ldapBindDn: e.target.value})} placeholder="sync@firma.de" className="rounded-xl h-12" />
                </div>
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Passwort</Label>
                  <Input type="password" value={tenantDraft.ldapBindPassword || ''} onChange={e => setTenantDraft({...tenantDraft, ldapBindPassword: e.target.value})} className="rounded-xl h-12" />
                </div>
                <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">LDAP Domain</Label>
                    <Input value={tenantDraft.ldapDomain || ''} onChange={e => setTenantDraft({...tenantDraft, ldapDomain: e.target.value})} placeholder="firma.de" className="rounded-xl h-12" />
                </div>
                <div className="space-y-3 lg:col-span-3">
                    <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Benutzer-Filter (LQL)</Label>
                    <Input value={tenantDraft.ldapUserFilter || ''} onChange={e => setTenantDraft({...tenantDraft, ldapUserFilter: e.target.value})} placeholder="(&(objectClass=user)(memberOf=CN=AppUsers,...))" className="rounded-xl h-12" />
                </div>
              </div>

              <div className="space-y-6 pt-6 border-t">
                <h3 className="text-xs font-black uppercase text-slate-800 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-indigo-600" /> Sicherheit & Verschlüsselung
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border">
                    <div className="space-y-0.5">
                      <Label className="text-xs font-bold">TLS verwenden</Label>
                      <p className="text-[8px] font-bold text-slate-400 uppercase">StartTLS / SSL</p>
                    </div>
                    <Switch checked={!!tenantDraft.ldapUseTls} onCheckedChange={v => setTenantDraft({...tenantDraft, ldapUseTls: v})} />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border">
                    <div className="space-y-0.5">
                      <Label className="text-xs font-bold">Zertifikate ignorieren</Label>
                      <p className="text-[8px] font-bold text-slate-400 uppercase">Allow Invalid SSL</p>
                    </div>
                    <Switch checked={!!tenantDraft.ldapAllowInvalidSsl} onCheckedChange={v => setTenantDraft({...tenantDraft, ldapAllowInvalidSsl: v})} />
                  </div>
                  <div className="space-y-3 lg:col-span-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Client-Zertifikat (PEM)</Label>
                    <Textarea 
                      value={tenantDraft.ldapClientCert || ''} 
                      onChange={e => setTenantDraft({...tenantDraft, ldapClientCert: e.target.value})} 
                      placeholder="-----BEGIN CERTIFICATE----- ..." 
                      className="rounded-xl min-h-[100px] font-mono text-[10px] bg-slate-50/50" 
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center pt-8 border-t">
                <Button variant="outline" onClick={handleTestLdap} disabled={isTesting} className="rounded-xl h-11 px-10 font-bold text-[10px] uppercase border-slate-200">
                  {isTesting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />} Testen
                </Button>
                <Button onClick={handleSaveLdap} disabled={isSaving} className="rounded-xl h-11 px-16 font-bold text-[10px] uppercase shadow-lg shadow-primary/20 bg-primary text-white">
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4" />} Speichern
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
            <CardHeader className="p-8 bg-slate-50 dark:bg-slate-800/50 border-b shrink-0">
              <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-white flex items-center gap-3">
                <Users className="w-5 h-5 text-indigo-600" /> 2. Attribut-Mapping
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">GUID (Eindeutige ID)</Label>
                      <Input value={tenantDraft.ldapAttrObjectGUID || ''} onChange={e => setTenantDraft({...tenantDraft, ldapAttrObjectGUID: e.target.value})} placeholder="objectGUID" className="rounded-xl h-12 bg-slate-50/30" />
                  </div>
                   <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Benutzername</Label>
                      <Input value={tenantDraft.ldapAttrUsername || ''} onChange={e => setTenantDraft({...tenantDraft, ldapAttrUsername: e.target.value})} placeholder="sAMAccountName" className="rounded-xl h-12 bg-slate-50/30" />
                  </div>
                  <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Vorname</Label>
                      <Input value={tenantDraft.ldapAttrFirstname || ''} onChange={e => setTenantDraft({...tenantDraft, ldapAttrFirstname: e.target.value})} placeholder="givenName" className="rounded-xl h-12 bg-slate-50/30" />
                  </div>
                  <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Nachname</Label>
                      <Input value={tenantDraft.ldapAttrLastname || ''} onChange={e => setTenantDraft({...tenantDraft, ldapAttrLastname: e.target.value})} placeholder="sn" className="rounded-xl h-12 bg-slate-50/30" />
                  </div>
                  <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">E-Mail</Label>
                      <Input value={tenantDraft.ldapAttrEmail || ''} onChange={e => setTenantDraft({...tenantDraft, ldapAttrEmail: e.target.value})} placeholder="mail" className="rounded-xl h-12 bg-slate-50/30" />
                  </div>
                  <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Abteilung</Label>
                      <Input value={tenantDraft.ldapAttrDepartment || ''} onChange={e => setTenantDraft({...tenantDraft, ldapAttrDepartment: e.target.value})} placeholder="department" className="rounded-xl h-12 bg-slate-50/30" />
                  </div>
                  <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Gruppen (memberOf)</Label>
                      <Input value={tenantDraft.ldapAttrGroups || ''} onChange={e => setTenantDraft({...tenantDraft, ldapAttrGroups: e.target.value})} placeholder="memberOf" className="rounded-xl h-12 bg-slate-50/30" />
                  </div>
                  <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Firma (Mandanten-Matching)</Label>
                      <Input value={tenantDraft.ldapAttrCompany || ''} onChange={e => setTenantDraft({...tenantDraft, ldapAttrCompany: e.target.value})} placeholder="company" className="rounded-xl h-12 bg-slate-50/30" />
                  </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          <Card className="rounded-2xl border shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
            <CardHeader className="p-6 bg-slate-50 dark:bg-slate-800/50 border-b shrink-0">
                <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-white flex items-center gap-3">
                    <RefreshCw className="w-4 h-4 text-primary" /> Sync-Jobs Monitor
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <Table>
                    <TableHeader className="bg-slate-50/30">
                        <TableRow>
                            <TableHead className="text-[9px] font-bold uppercase py-3">Job</TableHead>
                            <TableHead className="text-[9px] font-bold uppercase py-3">Status</TableHead>
                            <TableHead className="text-right py-3"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {syncJobs?.map(job => (
                            <TableRow key={job.id} className="border-b last:border-0 hover:bg-slate-50/50 transition-colors">
                                <TableCell className="py-4">
                                  <p className="font-bold text-xs text-slate-800">{job.name}</p>
                                  <p className="text-[8px] text-slate-400 font-medium">{job.lastRun ? new Date(job.lastRun).toLocaleString() : 'Nie gelaufen'}</p>
                                </TableCell>
                                <TableCell>
                                    <Badge className={cn(
                                      "text-[8px] font-black uppercase h-4 border-none",
                                      job.lastStatus === 'success' ? 'bg-emerald-50 text-emerald-700' : 
                                      job.lastStatus === 'error' ? 'bg-red-50 text-red-700' : 
                                      job.lastStatus === 'running' ? 'bg-blue-50 text-blue-700' : 'bg-slate-50 text-slate-400'
                                    )}>
                                        {job.lastStatus}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right px-4">
                                  <div className="flex justify-end gap-1">
                                    <Button 
                                        size="icon" 
                                        variant="ghost" 
                                        className="h-7 w-7 rounded-md"
                                        onClick={() => handleRunJob(job.id)}
                                        disabled={!!isJobRunning}
                                    >
                                        {isJobRunning === job.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 text-primary" />}
                                    </Button>
                                    <Button size="icon" variant="ghost" className="h-7 w-7 rounded-md" onClick={() => setSelectedJobMessage(job.lastMessage)}><FileText className="w-3.5 h-3.5 text-slate-400" /></Button>
                                  </div>
                                </TableCell>
                            </TableRow>
                        ))}
                        {(!syncJobs || syncJobs.length === 0) && (
                          <TableRow>
                            <TableCell colSpan={3} className="py-10 text-center text-[10px] text-slate-400 uppercase italic">Keine Jobs konfiguriert</TableCell>
                          </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-2 border-slate-100 dark:border-slate-800 shadow-xl bg-white dark:bg-slate-900 overflow-hidden">
            <CardHeader className="bg-slate-800 text-white p-4 shrink-0">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-primary" /> Verbindungsprotokoll (Debug)
                </CardTitle>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-white/50 hover:text-white" onClick={() => refreshLogs()}>
                  <RefreshCw className="w-3.5 h-3.5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-80">
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {sortedLogs.map((log: any) => (
                    <div key={log.id} className="p-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-1.5 h-8 rounded-full",
                          log.status === 'success' ? "bg-emerald-500" : "bg-red-500"
                        )} />
                        <div>
                          <p className="text-[10px] font-black text-slate-800 dark:text-slate-100 uppercase">{log.action}</p>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-[8px] font-bold text-slate-400 flex items-center gap-1"><Clock className="w-2.5 h-2.5" /> {new Date(log.timestamp).toLocaleTimeString()}</span>
                            <span className={cn("text-[8px] font-bold truncate max-w-[150px]", log.status === 'success' ? "text-emerald-600" : "text-red-600")}>{log.message}</span>
                          </div>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 opacity-0 group-hover:opacity-100 transition-all" onClick={() => setSelectedLogEntry(log)}>
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                  {sortedLogs.length === 0 && (
                    <div className="py-20 text-center opacity-30 italic text-[10px] uppercase">Keine Protokolle vorhanden</div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <div className="p-6 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-3xl flex items-start gap-4 shadow-sm">
            <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-xs font-black uppercase text-slate-900 dark:text-white">Governance-Tipp</p>
              <p className="text-[10px] text-slate-500 italic leading-relaxed">
                Nutzen Sie die Debug-Konsole bei Fehlermeldungen wie "net::ERR_NAME_NOT_RESOLVED" oder "LDAP_INVALID_CREDENTIALS". Das Log speichert die letzten 200 Versuche.
              </p>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
        <DialogContent className="max-w-5xl w-[95vw] h-[85vh] p-0 overflow-hidden flex flex-col rounded-2xl border-none shadow-2xl bg-white">
          <DialogHeader className="p-6 bg-slate-800 text-white shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center text-primary shadow-lg border border-white/10">
                  <UserPlus className="w-6 h-6" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-headline font-bold uppercase tracking-tight">Active Directory Import Tool</DialogTitle>
                  <DialogDescription className="text-[10px] text-white/50 font-bold uppercase tracking-widest mt-1">Benutzer aus dem AD selektieren und in den Hub importieren</DialogDescription>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsImportOpen(false)} className="text-white/50 hover:text-white"><X className="w-5 h-5" /></Button>
            </div>
          </DialogHeader>

          <div className="p-4 bg-slate-50 border-b flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-1 items-center gap-3 max-w-xl">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                  placeholder="In AD suchen (z.B. Testmann)..." 
                  value={adSearch} 
                  onChange={e => setAdSearch(e.target.value)} 
                  onKeyDown={e => e.key === 'Enter' && fetchAdUsers(adSearch)}
                  className="pl-10 h-11 bg-white rounded-xl shadow-none border-slate-200" 
                />
              </div>
              <Button onClick={() => fetchAdUsers(adSearch)} disabled={isFetchingAd} className="h-11 rounded-xl px-6 font-bold uppercase text-[10px] tracking-widest">
                {isFetchingAd ? <Loader2 className="w-4 h-4 animate-spin" /> : "AD Suchen"}
              </Button>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-black uppercase text-slate-400">{selectedAdUsers.length} ausgewählt</span>
              <Button variant="outline" size="sm" onClick={() => handleSelectAllAdUsers(true)} className="h-8 text-[10px] font-bold rounded-lg uppercase">Alle wählen</Button>
              <Button variant="outline" size="sm" onClick={() => handleSelectAllAdUsers(false)} className="h-8 text-[10px] font-bold rounded-lg uppercase">Leeren</Button>
            </div>
          </div>

          <ScrollArea className="flex-1">
            {isFetchingAd ? (
              <div className="flex flex-col items-center justify-center py-40 gap-4">
                <Loader2 className="w-12 h-12 animate-spin text-primary opacity-20" />
                <p className="text-[10px] font-bold uppercase text-slate-400 animate-pulse">Lese Daten aus dem Active Directory...</p>
              </div>
            ) : adUsers.length === 0 ? (
              <div className="py-32 text-center space-y-4 opacity-40">
                <Search className="w-16 h-16 mx-auto text-slate-300" />
                <div>
                  <p className="text-sm font-black uppercase">Keine AD-Benutzer gefunden</p>
                  <p className="text-xs font-bold max-w-xs mx-auto mt-2 italic">Prüfen Sie Ihre LQL-Filterregeln oder suchen Sie gezielt nach einem Namen.</p>
                </div>
              </div>
            ) : (
              <Table>
                <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
                  <TableRow>
                    <th className="w-12 px-6">
                      <Checkbox 
                        checked={allFilteredUsersSelected}
                        onCheckedChange={handleSelectAllAdUsers}
                      />
                    </th>
                    <TableHead className="py-4 px-6 font-bold text-[11px] text-slate-400 uppercase">Identität im AD</TableHead>
                    <TableHead className="font-bold text-[11px] text-slate-400 uppercase">Abteilung</TableHead>
                    <TableHead className="font-bold text-[11px] text-slate-400 uppercase">Zugeordnete Firma</TableHead>
                    <TableHead className="font-bold text-[11px] text-slate-400 uppercase text-right px-6">Status im Hub</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {adUsers.map((u) => {
                    const alreadyExists = hubUsers?.some(hu => 
                      hu.externalId === u.username || 
                      (hu.email && u.email && hu.email.toLowerCase() === u.email.toLowerCase())
                    );
                    const isSelected = selectedAdUsers.some(su => su.username === u.username);
                    return (
                      <TableRow 
                        key={u.username} 
                        onClick={() => !alreadyExists && handleToggleAdUserSelection(u)} 
                        className={cn("group hover:bg-slate-50 transition-colors border-b cursor-pointer", isSelected && "bg-primary/5")}
                      >
                        <TableCell className="px-6" onClick={(e) => e.stopPropagation()}>
                          <Checkbox 
                            disabled={alreadyExists}
                            checked={isSelected} 
                            onCheckedChange={() => handleToggleAdUserSelection(u)}
                          />
                        </TableCell>
                        <TableCell className="py-4 px-6">
                          <div className="flex flex-col">
                            <span className="font-bold text-sm text-slate-800">{u.displayName || `${u.first || ''} ${u.last || ''}`.trim() || u.username}</span>
                            <span className="text-[10px] text-slate-400 font-medium">{u.email || 'Keine E-Mail'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-[11px] font-bold text-slate-600">{u.dept || '---'}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building2 className={cn("w-3.5 h-3.5", u.matchedTenantId ? "text-primary" : "text-amber-500")} />
                            <span className={cn("text-xs font-bold", u.matchedTenantId ? "text-slate-700" : "text-amber-600")}>
                              {u.matchedTenantName}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right px-6">
                          {alreadyExists ? (
                            <Badge className="bg-emerald-50 text-emerald-700 border-none rounded-full h-5 px-3 text-[8px] font-black uppercase">Importiert</Badge>
                          ) : u.isDisabled ? (
                             <Badge className="bg-slate-100 text-slate-500 border-none rounded-full h-5 px-3 text-[8px] font-black uppercase">AD: Deaktiviert</Badge>
                          ) : (
                            <Badge variant="outline" className="rounded-full h-5 px-3 text-[8px] font-black uppercase border-slate-200 text-slate-400">Neu</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </ScrollArea>

          <DialogFooter className="p-4 bg-slate-50 border-t shrink-0 flex items-center justify-between">
            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 px-4">
              <Info className="w-4 h-4" />
              <span>Matching basiert auf sAMAccountName oder E-Mail.</span>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setIsImportOpen(false)} className="rounded-xl font-bold text-[10px] h-11 px-8 uppercase">Abbrechen</Button>
              <Button onClick={handleImportSelected} disabled={isImporting || selectedAdUsers.length === 0} className="rounded-xl h-11 px-12 bg-primary text-white font-bold text-[10px] uppercase shadow-lg gap-2">
                {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" /> }
                Importieren ({selectedAdUsers.length})
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedJobMessage} onOpenChange={() => setSelectedJobMessage(null)}>
          <DialogContent className="max-w-2xl rounded-2xl p-0 overflow-hidden shadow-2xl border-none">
              <DialogHeader className="p-6 bg-slate-800 text-white">
                  <DialogTitle className="text-base font-headline font-bold uppercase tracking-widest flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" /> System Protokoll
                  </DialogTitle>
              </DialogHeader>
              <div className="bg-slate-50 p-6">
                <ScrollArea className="max-h-96 rounded-xl border border-slate-200 bg-white shadow-inner">
                    <pre className="text-[10px] font-mono p-6 whitespace-pre-wrap leading-relaxed text-slate-700">{selectedJobMessage}</pre>
                </ScrollArea>
              </div>
              <DialogFooter className="p-4 bg-white border-t">
                <Button onClick={() => setSelectedJobMessage(null)} className="rounded-xl font-bold text-[10px] uppercase px-8">Schließen</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>

      <Dialog open={!!selectedLogEntry} onOpenChange={() => setSelectedLogEntry(null)}>
          <DialogContent className="max-w-4xl w-[95vw] rounded-2xl p-0 overflow-hidden shadow-2xl border-none flex flex-col h-[80vh]">
              <DialogHeader className="p-6 bg-slate-800 text-white shrink-0">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center border",
                      selectedLogEntry?.status === 'success' ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-red-500/20 text-red-400 border-red-500/30"
                    )}>
                      <Terminal className="w-5 h-5" />
                    </div>
                    <div>
                      <DialogTitle className="text-sm font-bold uppercase tracking-widest">Technisches Protokoll (AD Connectivity)</DialogTitle>
                      <p className="text-[9px] font-bold text-white/50 uppercase mt-1">Aktion: {selectedLogEntry?.action} • {new Date(selectedLogEntry?.timestamp).toLocaleString()}</p>
                    </div>
                  </div>
              </DialogHeader>
              <ScrollArea className="flex-1 bg-slate-900">
                <div className="p-6">
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <Label className="text-[9px] font-black uppercase text-slate-500">Meldung</Label>
                      <p className={cn("text-xs font-bold", selectedLogEntry?.status === 'success' ? "text-emerald-400" : "text-red-400")}>
                        {selectedLogEntry?.message}
                      </p>
                    </div>
                    <Separator className="bg-slate-800" />
                    <div className="space-y-2">
                      <Label className="text-[9px] font-black uppercase text-slate-500 flex items-center gap-2">
                        <FileCode className="w-3 h-3" /> Rohdaten / Server Antwort
                      </Label>
                      <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 shadow-inner">
                        <pre className="text-[10px] font-mono text-blue-300 whitespace-pre-wrap leading-relaxed">
                          {selectedLogEntry?.details}
                        </pre>
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollArea>
              <DialogFooter className="p-4 bg-slate-800 border-t shrink-0">
                <Button onClick={() => setSelectedLogEntry(null)} className="rounded-xl font-bold text-[10px] uppercase px-8 h-10 bg-slate-700 text-white hover:bg-slate-600">Fenster schließen</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>

    </div>
  );
}
