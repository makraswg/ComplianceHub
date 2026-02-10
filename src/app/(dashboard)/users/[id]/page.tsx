
"use client";

import { useState, useMemo, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ChevronLeft, 
  Loader2, 
  UserCircle, 
  Mail, 
  Building2, 
  Briefcase, 
  ShieldCheck, 
  ShieldAlert, 
  Activity, 
  Clock, 
  Layers, 
  Zap, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight,
  ExternalLink,
  History,
  Info,
  KeyRound,
  Fingerprint,
  RotateCcw,
  Plus,
  Trash2,
  Lock,
  CalendarDays,
  Target,
  Pencil,
  Globe,
  Server
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePluggableCollection } from '@/hooks/data/use-pluggable-collection';
import { useSettings } from '@/context/settings-context';
import { User, Assignment, Entitlement, Resource, Tenant, JobTitle, Department } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function UserDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { activeTenantId } = useSettings();
  const [mounted, setMounted] = useState(false);

  const { data: users, isLoading: isUsersLoading } = usePluggableCollection<User>('users');
  const { data: assignments } = usePluggableCollection<Assignment>('assignments');
  const { data: entitlements } = usePluggableCollection<Entitlement>('entitlements');
  const { data: resources } = usePluggableCollection<Resource>('resources');
  const { data: tenants } = usePluggableCollection<Tenant>('tenants');
  const { data: jobs } = usePluggableCollection<JobTitle>('jobTitles');
  const { data: departments } = usePluggableCollection<Department>('departments');
  const { data: auditLogs } = usePluggableCollection<any>('auditEvents');

  useEffect(() => { setMounted(true); }, []);

  const user = useMemo(() => users?.find(u => u.id === id), [users, id]);
  
  const userAssignments = useMemo(() => 
    assignments?.filter(a => a.userId === id) || [], 
    [assignments, id]
  );

  const userAuditLogs = useMemo(() => 
    auditLogs?.filter((log: any) => log.entityId === id || (log.after && log.after.id === id))
      .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()) || [],
    [auditLogs, id]
  );

  const driftInfo = useMemo(() => {
    if (!user || !entitlements || !assignments) return { hasDrift: false, missing: [], extra: [], integrity: 100 };

    const activeAssignedIds = userAssignments.filter(a => a.status === 'active').map(a => a.entitlementId);
    const job = jobs?.find(j => j.name === user.title && j.tenantId === user.tenantId);
    const blueprintIds = job?.entitlementIds || [];
    
    const targetIds = Array.from(new Set([...activeAssignedIds, ...blueprintIds]));
    const targetGroups = targetIds
      .map(eid => entitlements.find(e => e.id === eid)?.externalMapping)
      .filter(Boolean) as string[];

    const actualGroups = user.adGroups || [];
    const missing = targetGroups.filter(g => !actualGroups.includes(g));
    const extra = actualGroups.filter(g => {
      const isManaged = entitlements.some(e => e.externalMapping === g);
      return isManaged && !targetGroups.includes(g);
    });

    const integrity = Math.max(0, 100 - (missing.length * 10) - (extra.length * 20));
    return { hasDrift: missing.length > 0 || extra.length > 0, missing, extra, integrity };
  }, [user, userAssignments, entitlements, jobs, assignments]);

  if (!mounted) return null;

  if (isUsersLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center py-40 gap-4">
        <Loader2 className="w-12 h-12 animate-spin text-primary opacity-20" />
        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Lade Identitätsprofil...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-20 text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
        <h2 className="text-xl font-headline font-bold text-slate-900">Benutzer nicht gefunden</h2>
        <Button onClick={() => router.push('/users')}>Zurück zur Übersicht</Button>
      </div>
    );
  }

  const isEnabled = user.enabled === true || user.enabled === 1 || user.enabled === "1";

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b pb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/users')} className="h-10 w-10 text-slate-400 hover:bg-slate-100 rounded-xl transition-all">
            <ChevronLeft className="w-6 h-6" />
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-headline font-bold text-slate-900 dark:text-white uppercase tracking-tight">{user.displayName}</h1>
              <Badge className={cn(
                "rounded-full px-2 h-5 text-[9px] font-black uppercase tracking-widest border-none shadow-sm",
                isEnabled ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
              )}>{isEnabled ? 'Aktiv' : 'Inaktiv'}</Badge>
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5 flex items-center gap-2">
              <Mail className="w-3 h-3" /> {user.email} • ID: {user.id}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-9 rounded-xl font-bold text-xs px-6 border-indigo-200 text-indigo-700 hover:bg-indigo-50 shadow-sm transition-all" onClick={() => router.push(`/reviews?search=${user.displayName}`)}>
            <RotateCcw className="w-3.5 h-3.5 mr-2" /> Review starten
          </Button>
          <Button size="sm" className="h-9 rounded-xl font-bold text-xs px-6 bg-primary hover:bg-primary/90 text-white shadow-lg active:scale-95 transition-all">
            <Pencil className="w-3.5 h-3.5 mr-2" /> Profil bearbeiten
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <aside className="lg:col-span-1 space-y-6">
          <Card className="rounded-2xl border shadow-xl bg-white dark:bg-slate-900 overflow-hidden group">
            <CardHeader className="bg-slate-50 dark:bg-slate-800 border-b p-4 px-6">
              <CardTitle className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Identitäts-Kontext</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="space-y-1">
                  <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Abteilung</p>
                  <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 shadow-inner">
                    <Building2 className="w-4 h-4 text-primary" /> {user.department || '---'}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Rollenprofil (Stelle)</p>
                  <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 shadow-inner">
                    <Briefcase className="w-4 h-4 text-indigo-600" /> {user.title || '---'}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Mandant (Standort)</p>
                  <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 shadow-inner">
                    <Globe className="w-4 h-4 text-slate-400" /> {tenants?.find(t => t.id === user.tenantId)?.name || user.tenantId}
                  </div>
                </div>
              </div>
              
              <Separator className="bg-slate-100 dark:bg-slate-800" />
              
              <div className="space-y-3">
                <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">AD-Integrität</p>
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-[10px] font-black">
                    <span className={cn(driftInfo.integrity === 100 ? "text-emerald-600" : "text-amber-600")}>{driftInfo.integrity}% Match</span>
                    <span className="text-slate-400 uppercase">LDAP Sync</span>
                  </div>
                  <Progress value={driftInfo.integrity} className="h-1.5 rounded-full bg-slate-100" />
                </div>
                {driftInfo.hasDrift && (
                  <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-[9px] text-amber-700 font-bold leading-relaxed italic">Abweichung zum Active Directory erkannt.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </aside>

        <div className="lg:col-span-3">
          <Tabs defaultValue="assignments" className="space-y-6">
            <TabsList className="bg-slate-100 dark:bg-slate-800 p-1.5 h-14 rounded-2xl border w-full justify-start gap-2 shadow-inner overflow-x-auto no-scrollbar">
              <TabsTrigger value="assignments" className="rounded-xl px-5 gap-3 text-[11px] font-black uppercase tracking-widest data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-lg transition-all">
                <ShieldCheck className="w-4 h-4 text-primary" /> Berechtigungen
              </TabsTrigger>
              <TabsTrigger value="drift" className="rounded-xl px-5 gap-3 text-[11px] font-black uppercase tracking-widest data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-lg transition-all">
                <Activity className="w-4 h-4 text-indigo-600" /> Compliance
              </TabsTrigger>
              <TabsTrigger value="history" className="rounded-xl px-5 gap-3 text-[11px] font-black uppercase tracking-widest data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-lg transition-all">
                <History className="w-4 h-4 text-slate-500" /> Audit Log
              </TabsTrigger>
            </TabsList>

            <TabsContent value="assignments" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <Card className="rounded-2xl border shadow-xl bg-white dark:bg-slate-900 overflow-hidden">
                <CardHeader className="bg-slate-50 dark:bg-slate-800 border-b p-6 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Layers className="w-5 h-5 text-primary" />
                    <div>
                      <CardTitle className="text-sm font-headline font-bold uppercase tracking-tight text-slate-900 dark:text-white">Aktive Zugriffsrechte</CardTitle>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" className="h-8 rounded-xl text-[10px] font-black uppercase gap-2 border-primary/20 text-primary hover:bg-primary/5 shadow-sm" onClick={() => router.push('/assignments')}>
                    <Plus className="w-3.5 h-3.5" /> Recht hinzufügen
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-slate-50/30 dark:bg-slate-950/30">
                      <TableRow className="border-b last:border-0">
                        <TableHead className="py-3 px-6 font-black text-[10px] uppercase text-slate-400 tracking-widest">System (Asset)</TableHead>
                        <TableHead className="font-black text-[10px] uppercase text-slate-400 tracking-widest">Rolle / Recht</TableHead>
                        <TableHead className="font-black text-[10px] uppercase text-slate-400 tracking-widest">Herkunft</TableHead>
                        <TableHead className="font-black text-[10px] uppercase text-slate-400 tracking-widest">Gültigkeit</TableHead>
                        <TableHead className="text-right px-6 font-black text-[10px] uppercase text-slate-400 tracking-widest">Aktionen</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {userAssignments.filter(a => a.status === 'active').map(a => {
                        const ent = entitlements?.find(e => e.id === a.entitlementId);
                        const res = resources?.find(r => r.id === ent?.resourceId);
                        const isBlueprint = a.syncSource === 'blueprint' || a.syncSource === 'group';
                        
                        return (
                          <TableRow key={a.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 border-b last:border-0 transition-colors">
                            <TableCell className="py-4 px-6">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-slate-400 border border-slate-100 dark:border-slate-800 shadow-inner">
                                  <Server className="w-4 h-4" />
                                </div>
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{res?.name || 'Unbekannt'}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{ent?.name}</span>
                                {ent?.isAdmin && <Badge className="bg-red-50 text-red-600 border-none rounded-full h-3.5 px-1.5 text-[7px] font-black uppercase">Admin</Badge>}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={cn(
                                "text-[8px] font-black h-4 px-1.5 border-none uppercase shadow-none",
                                isBlueprint ? "bg-indigo-50 text-indigo-600" : "bg-emerald-50 text-emerald-600"
                              )}>{isBlueprint ? 'Blueprint' : 'Direkt'}</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
                                <CalendarDays className="w-3 h-3 opacity-30" />
                                {a.validUntil ? new Date(a.validUntil).toLocaleDateString() : 'Unbefristet'}
                              </div>
                            </TableCell>
                            <TableCell className="text-right px-6">
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all" onClick={() => router.push(`/assignments`)}><Trash2 className="w-3.5 h-3.5" /></Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {userAssignments.filter(a => a.status === 'active').length === 0 && (
                        <TableRow><TableCell colSpan={5} className="py-16 text-center opacity-30 italic text-xs uppercase tracking-widest">Keine Berechtigungen zugewiesen</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="drift" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="rounded-2xl border shadow-xl bg-white dark:bg-slate-900 overflow-hidden">
                  <CardHeader className="bg-amber-50/50 dark:bg-amber-900/10 border-b p-6">
                    <div className="flex items-center gap-3">
                      <ShieldAlert className="w-5 h-5 text-amber-600" />
                      <div>
                        <CardTitle className="text-sm font-bold uppercase tracking-tight">Fehlende Rollen (AD Drift)</CardTitle>
                        <CardDescription className="text-[10px] font-bold uppercase text-slate-400 mt-0.5">Im Hub definiert, aber im AD nicht vorhanden</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 space-y-3">
                    {driftInfo.missing.map((g, i) => (
                      <div key={i} className="p-3 bg-red-50/50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-xl flex items-center justify-between group shadow-sm">
                        <span className="text-[11px] font-bold text-red-700 dark:text-red-400 font-mono">{g}</span>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 group-hover:scale-110 transition-transform"><RotateCcw className="w-3.5 h-3.5" /></Button>
                      </div>
                    ))}
                    {driftInfo.missing.length === 0 && (
                      <div className="py-16 text-center space-y-2 opacity-30">
                        <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500" />
                        <p className="text-[9px] font-black uppercase tracking-widest">Vollständig synchron</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border shadow-xl bg-white dark:bg-slate-900 overflow-hidden">
                  <CardHeader className="bg-indigo-50/50 dark:bg-indigo-900/10 border-b p-6">
                    <div className="flex items-center gap-3">
                      <Target className="w-5 h-5 text-indigo-600" />
                      <div>
                        <CardTitle className="text-sm font-bold uppercase tracking-tight">Nicht autorisiert</CardTitle>
                        <CardDescription className="text-[10px] font-bold uppercase text-slate-400 mt-0.5">Im AD vorhanden, aber im Hub nicht autorisiert</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 space-y-3">
                    {driftInfo.extra.map((g, i) => (
                      <div key={i} className="p-3 bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-xl flex items-center justify-between group shadow-sm">
                        <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 font-mono">{g}</span>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-amber-400 group-hover:scale-110 transition-transform"><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    ))}
                    {driftInfo.extra.length === 0 && (
                      <div className="py-16 text-center space-y-2 opacity-30">
                        <ShieldCheck className="w-8 h-8 mx-auto text-primary" />
                        <p className="text-[9px] font-black uppercase tracking-widest">Keine Drift-Rechte</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="history" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <Card className="rounded-2xl border shadow-xl bg-white dark:bg-slate-900 overflow-hidden">
                <CardHeader className="bg-slate-50 dark:bg-slate-800 border-b p-6">
                  <div className="flex items-center gap-3">
                    <History className="w-5 h-5 text-slate-500" />
                    <div>
                      <CardTitle className="text-sm font-headline font-bold uppercase tracking-tight text-slate-900 dark:text-white">Audit Journal</CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {userAuditLogs.map((log: any) => (
                      <div key={log.id} className="p-4 px-8 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex items-center justify-between group">
                        <div className="flex items-start gap-4">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-950 flex items-center justify-center text-slate-400 mt-1 shadow-inner shrink-0 border border-slate-200 dark:border-slate-800">
                            <Activity className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-relaxed">{log.action}</p>
                            <div className="flex items-center gap-3 mt-1 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                              <span className="flex items-center gap-1"><Clock className="w-2.5 h-2.5 opacity-50" /> {new Date(log.timestamp).toLocaleString()}</span>
                              <span className="flex items-center gap-1"><UserCircle className="w-2.5 h-2.5 opacity-50" /> Akteur: {log.actorUid}</span>
                            </div>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-all hover:bg-white shadow-sm" onClick={() => router.push(`/audit?search=${log.id}`)}><ExternalLink className="w-3.5 h-3.5" /></Button>
                      </div>
                    ))}
                    {userAuditLogs.length === 0 && (
                      <div className="py-20 text-center opacity-30 italic text-xs uppercase tracking-widest">Keine Historie vorhanden</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
