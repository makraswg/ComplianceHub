
"use client";

import { useState, useMemo, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ChevronLeft, 
  Loader2, 
  Shield, 
  Layers, 
  Users, 
  Building2, 
  ShieldAlert, 
  ShieldCheck, 
  Activity, 
  Clock, 
  Zap, 
  ArrowRight,
  ExternalLink,
  Package,
  Workflow,
  Info,
  KeyRound,
  Pencil, 
  Trash2, 
  Lock, 
  UserCircle,
  Briefcase,
  ChevronRight,
  CalendarDays,
  AlertTriangle,
  Target
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { usePluggableCollection } from '@/hooks/data/use-pluggable-collection';
import { useSettings } from '@/context/settings-context';
import { Entitlement, Resource, User, Assignment, Bundle, AssignmentGroup, JobTitle, Department } from '@/lib/types';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function RoleDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { activeTenantId } = useSettings();
  const [mounted, setMounted] = useState(false);

  const { data: roles, isLoading: isRolesLoading } = usePluggableCollection<Entitlement>('entitlements');
  const { data: resources } = usePluggableCollection<Resource>('resources');
  const { data: assignments } = usePluggableCollection<Assignment>('assignments');
  const { data: users } = usePluggableCollection<User>('users');
  const { data: bundles } = usePluggableCollection<Bundle>('bundles');
  const { data: groups } = usePluggableCollection<AssignmentGroup>('groups');
  const { data: jobTitles } = usePluggableCollection<JobTitle>('jobTitles');
  const { data: departments } = usePluggableCollection<Department>('departments');

  useEffect(() => { setMounted(true); }, []);

  const role = useMemo(() => roles?.find(r => r.id === id), [roles, id]);
  const resource = useMemo(() => resources?.find(r => r.id === role?.resourceId), [resources, role]);

  const assignedUsers = useMemo(() => {
    if (!assignments || !users) return [];
    const roleAssignments = assignments.filter(a => a.entitlementId === id && a.status === 'active');
    return roleAssignments.map(a => {
      const user = users.find(u => u.id === a.userId);
      return { ...user, assignment: a };
    }).filter(u => !!u.id);
  }, [assignments, users, id]);

  const usageInPackages = useMemo(() => {
    const affectedBundles = bundles?.filter(b => b.entitlementIds?.includes(id as string)) || [];
    const affectedGroups = groups?.filter(g => g.entitlementIds?.includes(id as string)) || [];
    const affectedBlueprints = jobTitles?.filter(j => j.entitlementIds?.includes(id as string)) || [];
    return { bundles: affectedBundles, groups: affectedGroups, blueprints: affectedBlueprints };
  }, [bundles, groups, jobTitles, id]);

  if (!mounted) return null;

  if (isRolesLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center py-40 gap-4">
        <Loader2 className="w-12 h-12 animate-spin text-primary opacity-20" />
        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Lade Rollenprofil...</p>
      </div>
    );
  }

  if (!role) {
    return (
      <div className="p-20 text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
        <h2 className="text-xl font-headline font-bold text-slate-900">Rolle nicht gefunden</h2>
        <Button onClick={() => router.push('/roles')}>Zurück zur Übersicht</Button>
      </div>
    );
  }

  return (
    <div className="px-6 space-y-6 pb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b pb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/roles')} className="h-10 w-10 text-slate-400 hover:bg-slate-100 rounded-xl">
            <ChevronLeft className="w-6 h-6" />
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-headline font-bold text-slate-900 dark:text-white uppercase tracking-tight">{role.name}</h1>
              <Badge className={cn(
                "rounded-full px-2 h-5 text-[9px] font-black uppercase tracking-widest border-none shadow-sm",
                role.isAdmin ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-700"
              )}>{role.isAdmin ? 'Privilegiert' : 'Standard'}</Badge>
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">System: {resource?.name || 'Unbekannt'} • ID: {role.id}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-9 rounded-md font-bold text-xs px-6 border-slate-200" onClick={() => router.push(`/audit?search=${role.id}`)}>
            <Activity className="w-3.5 h-3.5 mr-2" /> Historie
          </Button>
          <Button size="sm" className="h-9 rounded-md font-bold text-xs px-6 bg-primary hover:bg-primary/90 text-white shadow-lg active:scale-95 transition-all">
            <Pencil className="w-3.5 h-3.5 mr-2" /> Rolle bearbeiten
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar: Role Info */}
        <aside className="lg:col-span-1 space-y-4">
          <Card className="rounded-2xl border shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b p-4 px-6">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400">Rollen-Kontext</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="space-y-1">
                  <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">IT-System</p>
                  <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm cursor-pointer hover:text-primary transition-colors" onClick={() => router.push(`/resources/${resource?.id}`)}>
                    <Layers className="w-4 h-4 text-primary" /> {resource?.name || '---'}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Risiko-Einstufung</p>
                  <Badge variant="outline" className={cn(
                    "text-[10px] font-black h-6 px-3 border-none",
                    role.riskLevel === 'high' ? "bg-red-50 text-red-600" : 
                    role.riskLevel === 'medium' ? "bg-orange-50 text-orange-600" : "bg-emerald-50 text-emerald-600"
                  )}>
                    {role.riskLevel?.toUpperCase()}
                  </Badge>
                </div>
                <Separator />
                <div className="space-y-1">
                  <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Technisches Mapping</p>
                  <div className="p-2 rounded-md bg-slate-50 dark:bg-slate-800 font-mono text-[10px] text-slate-600 border border-slate-100">
                    {role.externalMapping || 'Keine ID hinterlegt'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b p-4 px-6">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400">Governance Status</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center shadow-lg">
                  <ShieldCheck className="w-6 h-6 text-white" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xl font-headline font-bold text-slate-900 dark:text-white">Audit Ready</h3>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-primary">
                  <span>Integrität</span>
                  <span className="text-emerald-400">100%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full w-full bg-primary" />
                </div>
                <p className="text-[9px] text-slate-500 dark:text-slate-400 leading-relaxed italic">
                  Diese Rolle ist vollständig dokumentiert und in die Standardzuweisungen integriert.
                </p>
              </div>
            </CardContent>
          </Card>
        </aside>

        {/* Main Content Area */}
        <div className="lg:col-span-3">
          <Tabs defaultValue="users" className="space-y-6">
            <TabsList className="bg-slate-100 p-1 h-11 rounded-xl border w-full justify-start gap-1 shadow-inner">
              <TabsTrigger value="users" className="rounded-lg px-6 gap-2 text-[11px] font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <Users className="w-3.5 h-3.5 text-primary" /> Berechtigte Benutzer ({assignedUsers.length})
              </TabsTrigger>
              <TabsTrigger value="usage" className="rounded-lg px-6 gap-2 text-[11px] font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <Package className="w-3.5 h-3.5 text-indigo-600" /> Verwendung in Standardzuweisungen
              </TabsTrigger>
              <TabsTrigger value="details" className="rounded-lg px-6 gap-2 text-[11px] font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <Info className="w-3.5 h-3.5 text-slate-500" /> Beschreibung & Umfang
              </TabsTrigger>
            </TabsList>

            <TabsContent value="users" className="space-y-6 animate-in fade-in duration-500">
              <Card className="rounded-2xl border shadow-sm bg-white overflow-hidden">
                <CardHeader className="bg-slate-50/50 border-b p-6">
                  <CardTitle className="text-sm font-bold">Mitarbeiter mit dieser Rolle</CardTitle>
                  <CardDescription className="text-[10px] font-bold uppercase tracking-widest">Alle Identitäten mit aktiver Zuweisung</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-slate-50/30">
                      <TableRow>
                        <TableHead className="py-3 px-6 font-bold text-[10px] uppercase text-slate-400">Identität</TableHead>
                        <TableHead className="font-bold text-[10px] uppercase text-slate-400">Abteilung</TableHead>
                        <TableHead className="font-bold text-[10px] uppercase text-slate-400">Zuweisungstyp</TableHead>
                        <TableHead className="font-bold text-[10px] uppercase text-slate-400">Gültigkeit</TableHead>
                        <TableHead className="text-right px-6 font-bold text-[10px] uppercase text-slate-400">Aktion</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assignedUsers.map(u => (
                        <TableRow key={u.id} className="group hover:bg-slate-50 border-b last:border-0">
                          <TableCell className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-primary font-bold text-xs">
                                {u.displayName?.charAt(0)}
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-xs text-slate-800 truncate">{u.displayName}</p>
                                <p className="text-[9px] text-slate-400 font-medium truncate">{u.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-[10px] font-bold text-slate-600">{u.department || '---'}</span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn(
                              "text-[8px] font-black h-4 px-1.5 border-none uppercase shadow-none",
                              u.assignment.syncSource === 'blueprint' || u.assignment.syncSource === 'group' ? "bg-indigo-50 text-indigo-600" : "bg-emerald-50 text-emerald-600"
                            )}>{u.assignment.syncSource === 'blueprint' || u.assignment.syncSource === 'group' ? 'Standard' : 'Direkt'}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
                              <CalendarDays className="w-3 h-3 opacity-30" />
                              {u.assignment.validUntil || 'Unbefristet'}
                            </div>
                          </TableCell>
                          <TableCell className="text-right px-6">
                            <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100" onClick={() => router.push(`/users/${u.id}`)}><ArrowRight className="w-4 h-4" /></Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {assignedUsers.length === 0 && (
                        <TableRow><TableCell colSpan={5} className="py-12 text-center opacity-30 italic text-xs uppercase tracking-widest">Keine Benutzer mit dieser Rolle gefunden</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="usage" className="space-y-6 animate-in fade-in duration-500">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Rollen-Standardzuweisungen (Bundles) */}
                <Card className="rounded-2xl border shadow-sm bg-white overflow-hidden">
                  <CardHeader className="bg-slate-50/50 border-b p-6">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <Package className="w-4 h-4 text-primary" /> Ergänzende Standardzuweisungen
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="h-[200px]">
                      <div className="divide-y divide-slate-50">
                        {usageInPackages.bundles.map(b => (
                          <div key={b.id} className="p-4 flex items-center justify-between group hover:bg-slate-50 cursor-pointer" onClick={() => router.push(`/lifecycle`)}>
                            <span className="text-xs font-bold text-slate-700">{b.name}</span>
                            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-primary transition-all" />
                          </div>
                        ))}
                        {usageInPackages.bundles.length === 0 && <div className="p-10 text-center opacity-20 italic text-xs">In keiner weiteren Zuweisung enthalten.</div>}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>

                {/* Groups */}
                <Card className="rounded-2xl border shadow-sm bg-white overflow-hidden">
                  <CardHeader className="bg-slate-50/50 border-b p-6">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <Workflow className="w-4 h-4 text-indigo-600" /> Zuweisungsgruppen
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="h-[200px]">
                      <div className="divide-y divide-slate-50">
                        {usageInPackages.groups.map(g => (
                          <div key={g.id} className="p-4 flex items-center justify-between group hover:bg-slate-50 cursor-pointer" onClick={() => router.push(`/groups`)}>
                            <span className="text-xs font-bold text-slate-700">{g.name}</span>
                            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 transition-all" />
                          </div>
                        ))}
                        {usageInPackages.groups.length === 0 && <div className="p-10 text-center opacity-20 italic text-xs">In keiner Gruppe enthalten.</div>}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>

                {/* Blueprints (Basis-Standardzuweisungen) */}
                <Card className="rounded-2xl border shadow-sm bg-white overflow-hidden md:col-span-2">
                  <CardHeader className="bg-slate-50/50 border-b p-6">
                    <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900">
                      <Briefcase className="w-4 h-4 text-primary" /> Basis-Standardzuweisungen (Organisation)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {usageInPackages.blueprints.map(j => {
                        const dept = departments?.find(d => d.id === j.departmentId);
                        return (
                          <div key={j.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between group hover:border-primary/30 transition-all cursor-pointer shadow-sm" onClick={() => router.push(`/settings/organization`)}>
                            <div className="min-w-0">
                              <p className="text-[11px] font-bold text-slate-800 truncate">{j.name}</p>
                              <p className="text-[8px] text-slate-400 font-black uppercase truncate">{dept?.name || '---'}</p>
                            </div>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-primary transition-all" />
                          </div>
                        );
                      })}
                      {usageInPackages.blueprints.length === 0 && <p className="col-span-full py-10 text-center opacity-30 italic text-xs">Diese Rolle ist in keiner Basis-Standardzuweisung definiert.</p>}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="details" className="space-y-6 animate-in fade-in duration-500">
              <Card className="rounded-2xl border shadow-sm bg-white overflow-hidden">
                <CardHeader className="bg-slate-50/50 border-b p-6">
                  <CardTitle className="text-sm font-bold">Funktion & Berechtigungsumfang</CardTitle>
                </CardHeader>
                <CardContent className="p-8 space-y-8">
                  <div className="space-y-3">
                    <Label className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Beschreibung der Rolle</Label>
                    <p className="text-sm text-slate-700 leading-relaxed font-medium bg-slate-50 p-5 rounded-2xl border border-slate-100 shadow-inner italic">
                      "{role.description || 'Keine detaillierte Funktionsbeschreibung hinterlegt.'}"
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Berechtigungstyp</p>
                        <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
                          {role.isAdmin ? <ShieldAlert className="w-4 h-4 text-red-600" /> : <ShieldCheck className="w-4 h-4 text-emerald-600" />}
                          {role.isAdmin ? 'Administrativ / Privilegiert' : 'Standard-Benutzerrecht'}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Technisches Mapping</p>
                        <p className="text-xs font-mono text-primary font-bold">{role.externalMapping || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                      <h4 className="text-[9px] font-black uppercase text-slate-400 mb-3 tracking-widest flex items-center gap-2"><Target className="w-3.5 h-3.5" /> Compliance Fokus</h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-[10px] font-bold">
                          <span className="text-slate-500">SoD Relevanz</span>
                          <Badge variant="outline" className="h-4 px-1.5 text-[7px] font-black">HOCH</Badge>
                        </div>
                        <div className="flex items-center justify-between text-[10px] font-bold">
                          <span className="text-slate-500">Rezertifizierungs-Zyklus</span>
                          <span className="text-slate-800">Alle 180 Tage</span>
                        </div>
                      </div>
                    </div>
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
