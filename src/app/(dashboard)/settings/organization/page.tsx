
"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Briefcase, 
  Building2, 
  Plus, 
  Archive, 
  RotateCcw,
  Search,
  Layers,
  Loader2,
  Trash2,
  Pencil,
  Info,
  Save as SaveIcon,
  PlusCircle,
  X,
  Globe,
  Settings2,
  AlertTriangle,
  Network,
  ChevronRight,
  Maximize2,
  RefreshCw,
  Lock,
  Unlock
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { usePluggableCollection } from '@/hooks/data/use-pluggable-collection';
import { useSettings } from '@/context/settings-context';
import { saveCollectionRecord, deleteCollectionRecord } from '@/app/actions/mysql-actions';
import { logAuditEventAction } from '@/app/actions/audit-actions';
import { toast } from '@/hooks/use-toast';
import { Tenant, Department, JobTitle, Entitlement, Resource } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { usePlatformAuth } from '@/context/auth-context';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

export const dynamic = 'force-dynamic';

function escapeXml(unsafe: string) {
  if (!unsafe) return '';
  return unsafe.replace(/[<>&"']/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '"': return '&quot;';
      case "'": return '&apos;';
      default: return c;
    }
  });
}

function generateOrgChartXml(tenants: any[], depts: any[], jobs: any[]) {
  let xml = `<mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>`;
  const NODE_W = 180;
  const NODE_H = 60;
  const GAP_X = 250;
  const GAP_Y = 120;

  tenants.forEach((tenant, tIdx) => {
    const tX = 50;
    const tY = 50 + (tIdx * 400);
    xml += `<mxCell id="${tenant.id}" value="${escapeXml(tenant.name)}" style="rounded=1;fillColor=#0f172a;strokeColor=#1e293b;fontColor=#ffffff;fontStyle=1;fontSize=12;" vertex="1" parent="1"><mxGeometry x="${tX}" y="${tY}" width="${NODE_W}" height="${NODE_H}" as="geometry"/></mxCell>`;

    const tDepts = depts.filter(d => d.tenantId === tenant.id);
    tDepts.forEach((dept, dIdx) => {
      const dX = tX + GAP_X;
      const dY = tY + (dIdx * 150);
      xml += `<mxCell id="${dept.id}" value="${escapeXml(dept.name)}" style="rounded=1;fillColor=#f0fdf4;strokeColor=#166534;fontColor=#166534;fontStyle=1;fontSize=11;" vertex="1" parent="1"><mxGeometry x="${dX}" y="${dY}" width="${NODE_W}" height="${NODE_H}" as="geometry"/></mxCell>`;
      xml += `<mxCell id="edge-t-d-${dept.id}" style="edgeStyle=orthogonalEdgeStyle;rounded=1;strokeColor=#94a3b8;strokeWidth=1.5;endArrow=none;" edge="1" parent="1" source="${tenant.id}" target="${dept.id}"><mxGeometry relative="1" as="geometry"/></mxCell>`;

      const dJobs = jobs.filter(j => j.departmentId === dept.id);
      dJobs.forEach((job, jIdx) => {
        const jX = dX + GAP_X;
        const jY = dY + (jIdx * 70);
        xml += `<mxCell id="${job.id}" value="${escapeXml(job.name)}" style="rounded=1;fillColor=#ffffff;strokeColor=#3b82f6;fontColor=#1e40af;fontSize=10;" vertex="1" parent="1"><mxGeometry x="${jX}" y="${jY}" width="${NODE_W}" height="40" as="geometry"/></mxCell>`;
        xml += `<mxCell id="edge-d-j-${job.id}" style="edgeStyle=orthogonalEdgeStyle;rounded=1;strokeColor=#cbd5e1;strokeWidth=1.5;endArrow=none;" edge="1" parent="1" source="${dept.id}" target="${job.id}"><mxGeometry relative="1" as="geometry"/></mxCell>`;
      });
    });
  });

  xml += `</root></mxGraphModel>`;
  return xml;
}

export default function UnifiedOrganizationPage() {
  const { dataSource } = useSettings();
  const { user } = usePlatformAuth();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState('list');
  const [showArchived, setShowArchived] = useState(false);
  const [search, setSearch] = useState('');
  const [isIframeReady, setIsIframeReady] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  
  const [activeAddParent, setActiveAddParent] = useState<{ id: string, type: 'tenant' | 'dept' } | null>(null);
  const [newName, setNewName] = useState('');

  const [isTenantDialogOpen, setIsTenantDialogOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Partial<Tenant> | null>(null);
  const [tenantName, setTenantName] = useState('');
  const [tenantSlug, setTenantSlug] = useState('');
  const [tenantRegion, setTenantRegion] = useState('EU-DSGVO');
  const [tenantDescription, setTenantDescription] = useState('');
  const [tenantLogoUrl, setTenantLogoUrl] = useState('');
  const [isSavingTenant, setIsSavingTenant] = useState(false);

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<JobTitle | null>(null);
  const [jobName, setJobName] = useState('');
  const [jobDesc, setJobDesc] = useState('');
  const [jobEntitlementIds, setJobEntitlementIds] = useState<string[]>([]);
  const [isSavingJob, setIsSavingJob] = useState(false);
  const [roleSearch, setRoleSearch] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<{ id: string, type: 'tenants' | 'departments' | 'jobTitles', label: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: tenants, refresh: refreshTenants, isLoading: tenantsLoading } = usePluggableCollection<Tenant>('tenants');
  const { data: departments, refresh: refreshDepts, isLoading: deptsLoading } = usePluggableCollection<Department>('departments');
  const { data: jobTitles, refresh: refreshJobs, isLoading: jobsLoading } = usePluggableCollection<JobTitle>('jobTitles');
  const { data: entitlements } = usePluggableCollection<Entitlement>('entitlements');
  const { data: resources } = usePluggableCollection<Resource>('resources');

  useEffect(() => {
    setMounted(true);
  }, []);

  const isSuperAdmin = user?.role === 'superAdmin';

  const filteredData = useMemo(() => {
    if (!tenants) return [];
    
    const jobsByDept = new Map<string, JobTitle[]>();
    (jobTitles || []).forEach(j => {
      const matchStatus = showArchived ? j.status === 'archived' : j.status !== 'archived';
      if (!matchStatus) return;
      if (!jobsByDept.has(j.departmentId)) jobsByDept.set(j.departmentId, []);
      jobsByDept.get(j.departmentId)?.push(j);
    });

    const deptsByTenant = new Map<string, any[]>();
    (departments || []).forEach(d => {
      const matchStatus = showArchived ? d.status === 'archived' : d.status !== 'archived';
      if (!matchStatus) return;
      if (!deptsByTenant.has(d.tenantId)) deptsByTenant.set(d.tenantId, []);
      deptsByTenant.get(d.tenantId)?.push({
        ...d,
        jobs: jobsByDept.get(d.id) || []
      });
    });

    return tenants
      .filter(t => (showArchived ? t.status === 'archived' : t.status !== 'archived'))
      .map(tenant => ({
        ...tenant,
        departments: deptsByTenant.get(tenant.id) || []
      }))
      .filter(t => {
        if (!search) return true;
        const s = search.toLowerCase();
        const matchT = t.name.toLowerCase().includes(s);
        const matchD = t.departments.some((d: any) => d.name.toLowerCase().includes(s));
        const matchJ = t.departments.some((d: any) => d.jobs.some((j: any) => j.name.toLowerCase().includes(s)));
        return matchT || matchD || matchJ;
      });
  }, [tenants, departments, jobTitles, search, showArchived]);

  const syncChart = useCallback(() => {
    if (!iframeRef.current || !isIframeReady) return;
    const xml = generateOrgChartXml(tenants || [], departments || [], jobTitles || []);
    iframeRef.current.contentWindow?.postMessage(JSON.stringify({ action: 'load', xml: xml, autosave: 1 }), '*');
    setTimeout(() => iframeRef.current?.contentWindow?.postMessage(JSON.stringify({ action: 'zoom', type: 'fit' }), '*'), 500);
  }, [tenants, departments, jobTitles, isIframeReady]);

  useEffect(() => {
    if (activeTab === 'chart' && isIframeReady) syncChart();
  }, [activeTab, isIframeReady, syncChart]);

  const handleCreateTenant = async () => {
    if (!tenantName || !tenantSlug) return;
    setIsSavingTenant(true);
    const id = editingTenant?.id || `t-${Math.random().toString(36).substring(2, 7)}`;
    const data: Tenant = {
      ...editingTenant,
      id,
      name: tenantName,
      slug: tenantSlug.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      region: tenantRegion,
      companyDescription: tenantDescription,
      logoUrl: tenantLogoUrl,
      status: editingTenant?.status || 'active',
      createdAt: editingTenant?.createdAt || new Date().toISOString(),
    } as Tenant;

    const res = await saveCollectionRecord('tenants', id, data, dataSource);
    if (res.success) {
      setIsTenantDialogOpen(false);
      refreshTenants();
      toast({ title: "Mandant gespeichert" });
    }
    setIsSavingTenant(false);
  };

  const handleCreateSub = async () => {
    if (!newName || !activeAddParent) return;
    const id = `${activeAddParent.type === 'tenant' ? 'd' : 'j'}-${Math.random().toString(36).substring(2, 7)}`;
    if (activeAddParent.type === 'tenant') {
      await saveCollectionRecord('departments', id, { id, tenantId: activeAddParent.id, name: newName, status: 'active' }, dataSource);
      refreshDepts();
    } else {
      const dept = departments?.find(d => d.id === activeAddParent.id);
      if (dept) {
        await saveCollectionRecord('jobTitles', id, { id, tenantId: dept.tenantId, departmentId: activeAddParent.id, name: newName, status: 'active' }, dataSource);
        refreshJobs();
      }
    }
    setNewName('');
    setActiveAddParent(null);
    toast({ title: "Eintrag erstellt" });
  };

  const handleStatusChange = async (coll: string, item: any, newStatus: 'active' | 'archived') => {
    const updated = { ...item, status: newStatus };
    const res = await saveCollectionRecord(coll, item.id, updated, dataSource);
    if (res.success) {
      if (coll === 'tenants') refreshTenants();
      if (coll === 'departments') refreshDepts();
      if (coll === 'jobTitles') refreshJobs();
      toast({ title: "Status aktualisiert" });
    }
  };

  const executeDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    const res = await deleteCollectionRecord(deleteTarget.type, deleteTarget.id, dataSource);
    if (res.success) {
      toast({ title: "Eintrag permanent gelöscht" });
      if (deleteTarget.type === 'tenants') refreshTenants();
      if (deleteTarget.type === 'departments') refreshDepts();
      if (deleteTarget.type === 'jobTitles') refreshJobs();
      setDeleteTarget(null);
    }
    setIsDeleting(false);
  };

  const openTenantEdit = (tenant: Partial<Tenant>) => {
    setEditingTenant(tenant);
    setTenantName(tenant.name || '');
    setTenantSlug(tenant.slug || '');
    setTenantRegion(tenant.region || 'EU-DSGVO');
    setTenantDescription(tenant.companyDescription || '');
    setTenantLogoUrl(tenant.logoUrl || '');
    setIsTenantDialogOpen(true);
  };

  const openJobEditor = (job: JobTitle) => {
    setEditingJob(job);
    setJobName(job.name);
    setJobDesc(job.description || '');
    setJobEntitlementIds(job.entitlementIds || []);
    setIsEditorOpen(true);
  };

  const saveJobEdits = async () => {
    if (!editingJob) return;
    setIsSavingJob(true);
    const updatedJob = { ...editingJob, name: jobName, description: jobDesc, entitlementIds: jobEntitlementIds };
    const res = await saveCollectionRecord('jobTitles', editingJob.id, updatedJob, dataSource);
    if (res.success) {
      setIsEditorOpen(false);
      refreshJobs();
      toast({ title: "Rollenprofil gespeichert" });
    }
    setIsSavingJob(false);
  };

  const filteredEntitlements = useMemo(() => {
    if (!entitlements || !editingJob) return [];
    return entitlements.filter(e => {
      const res = resources?.find(r => r.id === e.resourceId);
      if (res?.tenantId !== 'global' && res?.tenantId !== editingJob.tenantId) return false;
      const s = roleSearch.toLowerCase();
      return e.name.toLowerCase().includes(s) || res?.name.toLowerCase().includes(s);
    });
  }, [entitlements, resources, editingJob, roleSearch]);

  useEffect(() => {
    const handleMessage = (evt: MessageEvent) => {
      if (!evt.data || typeof evt.data !== 'string') return;
      try {
        const msg = JSON.parse(evt.data);
        if (msg.event === 'init') setIsIframeReady(true);
      } catch (e) {}
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  if (!mounted) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b pb-6">
        <div>
          <Badge className="mb-1 rounded-full px-2 py-0 bg-primary/10 text-primary text-[9px] font-bold border-none uppercase tracking-widest">Organisationsstruktur</Badge>
          <h1 className="text-2xl font-headline font-bold text-slate-900 dark:text-white uppercase tracking-tight">Mandanten &amp; Rollenplan</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Zentrale Verwaltung der Standorte, Abteilungen und Rollen-Blueprints.</p>
        </div>
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 h-10 rounded-xl border gap-1">
          <button 
            className={cn("px-4 rounded-lg text-[10px] font-bold uppercase transition-all", activeTab === 'list' ? "bg-white dark:bg-slate-700 shadow-sm text-primary" : "text-slate-500 hover:text-slate-700")}
            onClick={() => setActiveTab('list')}
          >
            Liste
          </button>
          <button 
            className={cn("px-4 rounded-lg text-[10px] font-bold uppercase transition-all", activeTab === 'chart' ? "bg-white dark:bg-slate-700 shadow-sm text-primary" : "text-slate-500 hover:text-slate-700")}
            onClick={() => setActiveTab('chart')}
          >
            Stammbaum
          </button>
        </div>
      </div>

      {activeTab === 'list' ? (
        <div className="space-y-6 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div className="relative group max-w-md flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <Input 
                placeholder="Name, Abteilung oder Rolle suchen..." 
                className="pl-9 h-10 rounded-md border-slate-200 bg-white shadow-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className={cn("h-9 rounded-md font-bold text-xs", showArchived && "text-orange-600 bg-orange-50")} onClick={() => setShowArchived(!showArchived)}>
                {showArchived ? <RotateCcw className="w-3.5 h-3.5 mr-2" /> : <Archive className="w-3.5 h-3.5 mr-2" />}
                {showArchived ? 'Aktiv' : 'Archiv'}
              </Button>
              <Button size="sm" className="h-9 rounded-md font-bold text-xs shadow-lg" onClick={() => { setEditingTenant(null); setTenantName(''); setTenantSlug(''); setIsTenantDialogOpen(true); }}>
                <Plus className="w-3.5 h-3.5 mr-2" /> Neuer Mandant
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            {(tenantsLoading || deptsLoading || jobsLoading) ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-primary opacity-20" />
                <p className="text-[10px] font-bold text-slate-400">Synchronisiere Struktur...</p>
              </div>
            ) : filteredData.length === 0 ? (
              <div className="py-20 text-center border-2 border-dashed rounded-xl bg-white/50">
                <Info className="w-10 h-10 mx-auto mb-3 text-slate-200" />
                <p className="text-xs font-bold text-slate-400">Keine Daten gefunden. Bitte initialisieren Sie den Hub.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {filteredData.map(tenant => (
                  <Card key={tenant.id} className="border shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
                    <CardHeader className="bg-slate-50/80 dark:bg-slate-900/80 border-b p-4 px-6 flex flex-row items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary shadow-sm border border-primary/10">
                          {tenant.logoUrl ? <img src={tenant.logoUrl} alt="Logo" className="w-full h-full object-contain p-1" /> : <Building2 className="w-5 h-5" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-base font-bold text-slate-900 dark:text-white">{tenant.name}</CardTitle>
                            <Badge variant="outline" className="text-[8px] font-bold h-4 px-1">{tenant.region}</Badge>
                          </div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">{tenant.slug}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="ghost" className="h-8 text-[10px] font-bold hover:bg-primary/5 gap-1.5" onClick={() => openTenantEdit(tenant)}><Settings2 className="w-3.5 h-3.5" /> Details</Button>
                        <Button size="sm" variant="ghost" className="h-8 text-[10px] font-bold hover:bg-primary/5 gap-1.5" onClick={() => setActiveAddParent({ id: tenant.id, type: 'tenant' })}><PlusCircle className="w-3.5 h-3.5 text-primary" /> Abteilung</Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-500" onClick={() => handleStatusChange('tenants', tenant, tenant.status === 'active' ? 'archived' : 'active')}><Archive className="w-3.5 h-3.5" /></Button>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {tenant.departments.map((dept: any) => (
                          <div key={dept.id} className="group/dept">
                            <div className="flex items-center justify-between p-4 px-8 hover:bg-slate-50 transition-colors">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100"><Layers className="w-4 h-4" /></div>
                                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">{dept.name}</h4>
                              </div>
                              <div className="flex items-center gap-2 opacity-0 group-hover/dept:opacity-100">
                                <Button variant="ghost" size="sm" className="h-7 text-[10px] font-bold text-emerald-600 gap-1" onClick={() => setActiveAddParent({ id: dept.id, type: 'dept' })}><Plus className="w-3 h-3" /> Rolle</Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-300" onClick={() => handleStatusChange('departments', dept, dept.status === 'active' ? 'archived' : 'active')}><Archive className="w-3.5 h-3.5" /></Button>
                              </div>
                            </div>
                            <div className="bg-slate-50/30 px-8 pb-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 pl-10 border-l-2 border-slate-100 dark:border-slate-800 ml-4">
                                {dept.jobs?.map((job: any) => (
                                  <div key={job.id} className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-950 rounded-lg border shadow-sm group/job hover:border-primary/30 transition-all cursor-pointer" onClick={() => openJobEditor(job)}>
                                    <div className="flex items-center gap-2 min-w-0">
                                      <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                      <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate">{job.name}</p>
                                      {job.entitlementIds?.length > 0 && <Badge className="bg-blue-50 text-blue-600 border-none rounded-full h-3.5 px-1 text-[7px] font-black">{job.entitlementIds.length}</Badge>}
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover/job:opacity-100">
                                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); openJobEditor(job); }}><Pencil className="w-3.5 h-3.5" /></Button>
                                      {isSuperAdmin && <Button variant="ghost" size="icon" className="h-6 w-6 text-red-300 hover:text-red-600" onClick={(e) => { e.stopPropagation(); setDeleteTarget({ id: job.id, type: 'jobTitles', label: job.name }); }}><Trash2 className="w-3.5 h-3.5" /></Button>}
                                    </div>
                                  </div>
                                ))}
                                {activeAddParent?.id === dept.id && activeAddParent.type === 'dept' && (
                                  <div className="col-span-full pt-2">
                                    <div className="flex gap-2 p-2 bg-white rounded-lg border-2 border-primary shadow-sm">
                                      <Input autoFocus placeholder="Name der Rolle..." value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCreateSub()} className="h-8 border-none text-[11px] font-bold" />
                                      <Button size="sm" className="h-8 px-4 font-bold text-[10px]" onClick={handleCreateSub}>Hinzufügen</Button>
                                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setActiveAddParent(null)}><X className="w-3.5 h-3.5" /></Button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                        {activeAddParent?.id === tenant.id && activeAddParent.type === 'tenant' && (
                          <div className="p-4 px-8 bg-primary/5 border-y border-primary/10">
                            <div className="flex items-center gap-3">
                              <Input autoFocus placeholder="Abteilungsname..." value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCreateSub()} className="h-10 border-slate-200 rounded-md bg-white text-xs font-bold" />
                              <Button size="sm" className="h-10 px-6 rounded-md font-bold text-[10px]" onClick={handleCreateSub}>Erstellen</Button>
                              <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-400" onClick={() => setActiveAddParent(null)}><X className="w-4 h-4" /></Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 bg-white border rounded-2xl h-[calc(100vh-250px)] relative overflow-hidden shadow-inner">
          <div className="absolute top-6 right-6 z-10 bg-white/95 backdrop-blur-md shadow-2xl border rounded-xl p-1.5 flex flex-col gap-1.5">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={() => setIsLocked(!isLocked)} className={cn("h-9 w-9 rounded-lg transition-all", isLocked ? "bg-amber-50 text-amber-600" : "hover:bg-slate-100 text-slate-600")}>
                    {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">{isLocked ? 'Layout entsperren' : 'Layout sperren'}</TooltipContent>
              </Tooltip>
              <Button variant="ghost" size="icon" onClick={syncChart} className="h-9 w-9 rounded-lg hover:bg-slate-100"><RefreshCw className="w-4 h-4 text-slate-600" /></Button>
              <Button variant="ghost" size="icon" onClick={() => iframeRef.current?.contentWindow?.postMessage(JSON.stringify({ action: 'zoom', type: 'fit' }), '*')} className="h-9 w-9 rounded-lg hover:bg-slate-100"><Maximize2 className="w-4 h-4 text-slate-600" /></Button>
            </TooltipProvider>
          </div>
          <iframe ref={iframeRef} src="https://embed.diagrams.net/?embed=1&ui=min&spin=1&proto=json" className="absolute inset-0 w-full h-full border-none" />
          {(!isIframeReady) && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-4">
              <Loader2 className="w-12 h-12 animate-spin text-primary opacity-20" />
              <p className="text-[10px] font-black uppercase tracking-widest animate-pulse">Generiere Stammbaum...</p>
            </div>
          )}
        </div>
      )}

      {/* Role Editor Dialog */}
      <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <DialogContent className="max-w-4xl w-[95vw] rounded-xl p-0 overflow-hidden flex flex-col border shadow-2xl bg-white h-[90vh]">
          <DialogHeader className="p-6 bg-slate-900 text-white shrink-0">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center text-primary border border-white/10 shadow-lg"><Briefcase className="w-6 h-6" /></div>
              <div><DialogTitle className="text-lg font-headline font-bold uppercase tracking-tight">Rollenprofil &amp; Blueprint</DialogTitle><DialogDescription className="text-[10px] text-white/50 font-bold uppercase tracking-widest mt-0.5">{jobName}</DialogDescription></div>
            </div>
          </DialogHeader>
          <Tabs defaultValue="rbac" className="flex-1 flex flex-col min-h-0">
            <div className="px-6 border-b shrink-0 bg-white">
              <TabsList className="h-12 bg-transparent gap-8 p-0">
                <TabsTrigger value="base" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent h-full px-0 text-[10px] font-black uppercase tracking-widest text-slate-400 data-[state=active]:text-primary">Beschreibung</TabsTrigger>
                <TabsTrigger value="rbac" className="rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-600 data-[state=active]:bg-transparent h-full px-0 text-[10px] font-black uppercase tracking-widest text-slate-400 data-[state=active]:text-indigo-600">Standard-Rechte (Blueprint)</TabsTrigger>
              </TabsList>
            </div>
            <ScrollArea className="flex-1 bg-slate-50/30">
              <div className="p-8 space-y-10">
                <TabsContent value="base" className="mt-0 space-y-6">
                  <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Bezeichnung</Label><Input value={jobName} onChange={e => setJobName(e.target.value)} className="h-12 font-bold text-sm rounded-xl border-slate-200" /></div>
                  <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Stellenbeschreibung (ISO Context)</Label><Textarea value={jobDesc} onChange={e => setJobDesc(e.target.value)} className="min-h-[200px] p-5 rounded-2xl text-xs font-medium bg-white" placeholder="Aufgaben und Verantwortlichkeiten..." /></div>
                </TabsContent>
                <TabsContent value="rbac" className="mt-0 space-y-8">
                  <div className="flex items-center justify-between gap-4">
                    <h4 className="text-sm font-bold uppercase">Berechtigungs-Vorgabe</h4>
                    <Input placeholder="Rollen filtern..." value={roleSearch} onChange={e => setRoleSearch(e.target.value)} className="h-9 text-[10px] w-full max-w-xs" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {filteredEntitlements.map(ent => {
                      const res = resources?.find(r => r.id === ent.resourceId);
                      const isSelected = jobEntitlementIds.includes(ent.id);
                      return (
                        <div key={ent.id} className={cn("p-4 border rounded-2xl flex items-center gap-4 cursor-pointer transition-all shadow-sm bg-white", isSelected ? "border-indigo-500 bg-indigo-50/30" : "hover:border-slate-200")} onClick={() => setJobEntitlementIds(prev => isSelected ? prev.filter(id => id !== ent.id) : [...prev, ent.id])}>
                          <Checkbox checked={isSelected} />
                          <div className="min-w-0"><p className="text-[11px] font-bold truncate">{ent.name}</p><p className="text-[8px] font-black uppercase text-slate-400">{res?.name}</p></div>
                        </div>
                      );
                    })}
                  </div>
                </TabsContent>
              </div>
            </ScrollArea>
          </Tabs>
          <DialogFooter className="p-4 bg-slate-50 border-t flex flex-col sm:flex-row gap-2">
            <Button variant="ghost" onClick={() => setIsEditorOpen(false)} className="rounded-xl font-bold text-[10px] px-8 h-11 uppercase">Abbrechen</Button>
            <Button onClick={saveJobEdits} disabled={isSavingJob} className="rounded-xl h-11 px-12 bg-primary text-white font-bold text-[10px] uppercase gap-2 shadow-lg">{isSavingJob ? <Loader2 className="w-4 h-4 animate-spin" /> : <SaveIcon className="w-4 h-4" />} Speichern</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Alert */}
      <AlertDialog open={!!deleteTarget} onOpenChange={val => !val && setDeleteTarget(null)}>
        <AlertDialogContent className="rounded-2xl border-none shadow-2xl p-8">
          <AlertDialogHeader>
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4"><AlertTriangle className="w-6 h-6 text-red-600" /></div>
            <AlertDialogTitle className="text-xl font-headline font-bold text-red-600 text-center">Permanent löschen?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-slate-500 font-medium leading-relaxed pt-2 text-center">Möchten Sie <strong>{deleteTarget?.label}</strong> wirklich unwiderruflich löschen?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-6 gap-3 sm:justify-center">
            <AlertDialogCancel className="rounded-lg font-bold text-xs h-11 px-8">Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={executeDelete} disabled={isDeleting} className="bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-xs h-11 px-10 gap-2">{isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Löschen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
