
"use client";

import { useState, useEffect } from 'react';
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
  Database
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { usePluggableCollection } from '@/hooks/data/use-pluggable-collection';
import { useSettings } from '@/context/settings-context';
import { saveCollectionRecord } from '@/app/actions/mysql-actions';
import { triggerSyncJobAction } from '@/app/actions/sync-actions';
import { Tenant, SyncJob } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { usePlatformAuth } from '@/context/auth-context';

export default function SyncSettingsPage() {
  const { dataSource, activeTenantId } = useSettings();
  const { user: authUser } = usePlatformAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [isJobRunning, setIsJobRunning] = useState<string | null>(null);
  
  const [tenantDraft, setTenantDraft] = useState<Partial<Tenant>>({});

  const { data: tenants, refresh: refreshTenants } = usePluggableCollection<Tenant>('tenants');
  const { data: syncJobs, refresh: refreshJobs } = usePluggableCollection<SyncJob>('syncJobs');

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

  const handleRunJob = async (jobId: string) => {
    setIsJobRunning(jobId);
    try {
      const res = await triggerSyncJobAction(jobId, dataSource, authUser?.email || 'system');
      if (res.success) {
        toast({ title: "Job abgeschlossen" });
        refreshJobs();
      }
    } finally {
      setIsJobRunning(null);
    }
  };

  return (
    <div className="space-y-8">
      <Card className="rounded-none border shadow-none">
        <CardHeader className="bg-muted/10 border-b py-4">
          <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">
            <Network className="w-4 h-4" /> LDAP / Active Directory Sync
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8 space-y-8">
          <div className="flex items-center justify-between p-4 border bg-blue-50/20 rounded-none">
            <div className="space-y-0.5">
              <Label className="text-sm font-bold">LDAP Integration aktiv</Label>
              <p className="text-[9px] uppercase font-bold text-muted-foreground italic">Synchronisiert Identitäten und Abteilungen automatisch.</p>
            </div>
            <Switch 
              checked={!!tenantDraft.ldapEnabled} 
              onCheckedChange={v => setTenantDraft({...tenantDraft, ldapEnabled: v})} 
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase">LDAP Server URL</Label>
              <Input 
                value={tenantDraft.ldapUrl || ''} 
                onChange={e => setTenantDraft({...tenantDraft, ldapUrl: e.target.value})} 
                placeholder="ldap://dc1.firma.local" 
                className="rounded-none h-10" 
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase">Port</Label>
              <Input 
                value={tenantDraft.ldapPort || ''} 
                onChange={e => setTenantDraft({...tenantDraft, ldapPort: e.target.value})} 
                placeholder="389 / 636" 
                className="rounded-none h-10" 
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase">Base DN (Suche)</Label>
              <Input 
                value={tenantDraft.ldapBaseDn || ''} 
                onChange={e => setTenantDraft({...tenantDraft, ldapBaseDn: e.target.value})} 
                placeholder="OU=Users,DC=firma,DC=local" 
                className="rounded-none h-10" 
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase">User Filter</Label>
              <Input 
                value={tenantDraft.ldapUserFilter || ''} 
                onChange={e => setTenantDraft({...tenantDraft, ldapUserFilter: e.target.value})} 
                placeholder="(&(objectClass=user)(memberOf=...))" 
                className="rounded-none h-10" 
              />
            </div>
          </div>

          <div className="space-y-4 pt-6 border-t">
            <h3 className="text-xs font-black uppercase text-muted-foreground flex items-center gap-2">
              <Lock className="w-3.5 h-3.5" /> Bind Credentials
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase">Bind DN (Nutzer)</Label>
                <Input 
                  value={tenantDraft.ldapBindDn || ''} 
                  onChange={e => setTenantDraft({...tenantDraft, ldapBindDn: e.target.value})} 
                  placeholder="CN=ServiceAccount,..." 
                  className="rounded-none h-10" 
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase">Passwort</Label>
                <Input 
                  type="password"
                  value={tenantDraft.ldapBindPassword || ''} 
                  onChange={e => setTenantDraft({...tenantDraft, ldapBindPassword: e.target.value})} 
                  className="rounded-none h-10" 
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-6 border-t">
            <Button onClick={handleSaveLdap} disabled={isSaving} className="rounded-none font-bold uppercase text-[10px] h-11 px-12 gap-2">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              LDAP Einstellungen Speichern
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-none border shadow-none">
        <CardHeader className="bg-muted/10 border-b py-4">
          <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">
            <Database className="w-4 h-4" /> System-Jobs & Automatisierung
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[9px] font-bold uppercase">Job</TableHead>
                <TableHead className="text-[9px] font-bold uppercase">Letzter Lauf</TableHead>
                <TableHead className="text-[9px] font-bold uppercase">Status</TableHead>
                <TableHead className="text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[ 
                { id: 'job-ldap-sync', name: 'LDAP / AD Identitäten-Sync' }, 
                { id: 'job-jira-sync', name: 'Jira Gateway Warteschlange' } 
              ].map(job => {
                const dbJob = syncJobs?.find(j => j.id === job.id);
                const isRunning = isJobRunning === job.id;
                return (
                  <TableRow key={job.id} className="text-xs">
                    <TableCell className="font-bold">{job.name}</TableCell>
                    <TableCell className="text-muted-foreground">{dbJob?.lastRun ? new Date(dbJob.lastRun).toLocaleString() : '---'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("text-[8px] uppercase", dbJob?.lastStatus === 'success' ? "bg-emerald-50 text-emerald-700 border-none" : "bg-slate-50 text-slate-500 border-none")}>
                        {dbJob?.lastStatus || 'IDLE'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" className="h-7 text-[9px] font-bold uppercase rounded-none px-4 gap-2" disabled={isRunning} onClick={() => handleRunJob(job.id)}>
                        {isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                        Trigger
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
