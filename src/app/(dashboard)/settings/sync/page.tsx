
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
  ShieldCheck, 
  Save as SaveIcon, 
  Activity, 
  Search, 
  Info,
  Server,
  KeyRound,
  Database
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { usePluggableCollection } from '@/hooks/data/use-pluggable-collection';
import { useSettings } from '@/context/settings-context';
import { saveCollectionRecord } from '@/app/actions/mysql-actions';
import { triggerSyncJobAction } from '@/app/actions/sync-actions';
import { Tenant, SyncJob } from '@/lib/types';
import { toast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export default function SyncSettingsPage() {
  const { dataSource, activeTenantId } = useSettings();
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState<string | null>(null);
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
        toast({ title: "Synchronisations-Profil gespeichert" });
        refreshTenants();
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleRunSync = async (jobId: string) => {
    setIsSyncing(jobId);
    try {
      const res = await triggerSyncJobAction(jobId, dataSource);
      if (res.success) {
        toast({ title: "Synchronisation gestartet" });
        refreshJobs();
      }
    } finally {
      setIsSyncing(null);
    }
  };

  return (
    <div className="space-y-10">
      <Card className="rounded-xl border shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
        <CardHeader className="p-8 bg-slate-50 dark:bg-slate-900/50 border-b shrink-0">
          <div className="flex items-center gap-6">
            <div className="w-14 h-14 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-600 shadow-sm border border-blue-100 dark:border-blue-900/30">
              <RefreshCw className="w-7 h-7" />
            </div>
            <div>
              <CardTitle className="text-xl font-headline font-bold uppercase tracking-tight text-slate-900 dark:text-white">Verzeichnis-Synchronisation</CardTitle>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1.5">Anbindung an Active Directory & LDAP Systeme</p>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-8 space-y-12">
          {/* LDAP Toggle */}
          <div className="flex items-center justify-between p-6 bg-blue-50/50 dark:bg-slate-950 rounded-xl border border-blue-100 dark:border-blue-800">
            <div className="space-y-1">
              <Label className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase">LDAP/AD Integration aktiv</Label>
              <p className="text-[10px] uppercase font-bold text-slate-400 italic">Ermöglicht den automatischen Abgleich von Identitäten und Gruppenmitgliedschaften.</p>
            </div>
            <Switch 
              checked={!!tenantDraft.ldapEnabled} 
              onCheckedChange={v => setTenantDraft({...tenantDraft, ldapEnabled: v})} 
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">LDAP Server URL</Label>
              <div className="relative">
                <Server className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                <Input value={tenantDraft.ldapUrl || ''} onChange={e => setTenantDraft({...tenantDraft, ldapUrl: e.target.value})} placeholder="ldap://ad.firma.local" className="rounded-xl h-12 pl-11 border-slate-200 dark:border-slate-800" />
              </div>
            </div>
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">Port</Label>
              <Input value={tenantDraft.ldapPort || ''} onChange={e => setTenantDraft({...tenantDraft, ldapPort: e.target.value})} placeholder="389 / 636" className="rounded-xl h-12 border-slate-200 dark:border-slate-800" />
            </div>
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">Bind-User (DN)</Label>
              <Input value={tenantDraft.ldapBindDn || ''} onChange={e => setTenantDraft({...tenantDraft, ldapBindDn: e.target.value})} placeholder="cn=admin,dc=firma,dc=local" className="rounded-xl h-12 border-slate-200 dark:border-slate-800" />
            </div>
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">Bind-Passwort</Label>
              <Input type="password" value={tenantDraft.ldapBindPassword || ''} onChange={e => setTenantDraft({...tenantDraft, ldapBindPassword: e.target.value})} className="rounded-xl h-12 border-slate-200 dark:border-slate-800 font-mono" />
            </div>
            <div className="space-y-3 md:col-span-2">
              <Label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">Base DN (User Search)</Label>
              <Input value={tenantDraft.ldapBaseDn || ''} onChange={e => setTenantDraft({...tenantDraft, ldapBaseDn: e.target.value})} placeholder="ou=Users,dc=firma,dc=local" className="rounded-xl h-12 border-slate-200 dark:border-slate-800" />
            </div>
          </div>

          <div className="flex justify-end pt-8 border-t border-slate-100 dark:border-slate-800">
            <Button 
              onClick={handleSaveLdap} 
              disabled={isSaving} 
              className="rounded-xl font-black uppercase text-xs tracking-[0.1em] h-12 px-12 gap-3 bg-primary text-white shadow-lg shadow-primary/20 transition-all active:scale-95"
            >
              {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <SaveIcon className="w-5 h-5" />}
              Profil Speichern
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-xl border shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
        <CardHeader className="p-8 bg-slate-50 dark:bg-slate-900/50 border-b shrink-0">
          <div className="flex items-center gap-4">
            <Activity className="w-6 h-6 text-primary" />
            <CardTitle className="text-lg font-headline font-bold uppercase tracking-tight">Geplante Aufgaben (Sync Jobs)</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {syncJobs?.map(job => (
              <div key={job.id} className="p-6 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                <div className="flex items-center gap-5">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-primary transition-colors">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-sm text-slate-800 dark:text-slate-100">{job.name}</span>
                      <Badge variant="outline" className={cn(
                        "text-[8px] font-black uppercase h-4 px-1.5 border-none",
                        job.lastStatus === 'success' ? "bg-emerald-50 text-emerald-600" : job.lastStatus === 'running' ? "bg-blue-50 text-blue-600" : "bg-red-50 text-red-600"
                      )}>
                        {job.lastStatus || 'IDLE'}
                      </Badge>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">Letzter Lauf: {job.lastRun ? new Date(job.lastRun).toLocaleString() : 'Noch nie'}</p>
                  </div>
                </div>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="h-9 rounded-lg text-[10px] font-black uppercase tracking-widest gap-2 border-slate-200 dark:border-slate-800"
                  disabled={isSyncing === job.id}
                  onClick={() => handleRunSync(job.id)}
                >
                  {isSyncing === job.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  Jetzt ausführen
                </Button>
              </div>
            ))}
            {(!syncJobs || syncJobs.length === 0) && (
              <div className="p-12 text-center text-[10px] font-bold text-slate-400 uppercase italic">Keine automatisierten Sync-Jobs konfiguriert</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
