
"use client";

import { useState, useMemo, useEffect, useRef } from 'react';
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
  Unlock,
  ShieldCheck,
  ShieldAlert,
  Workflow,
  Shield,
  LayoutGrid
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { usePluggableCollection } from '@/hooks/data/use-pluggable-collection';
import { useSettings } from '@/context/settings-context';
import { saveCollectionRecord, deleteCollectionRecord } from '@/app/actions/mysql-actions';
import { toast } from '@/hooks/use-toast';
import { Tenant, Department, JobTitle, Entitlement, OrgUnitType, OrgUnit, OrgUnitRelation } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
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
import { Checkbox } from '@/components/ui/checkbox';
import { usePlatformAuth } from '@/context/auth-context';
import { AiFormAssistant } from '@/components/ai/form-assistant';
import { Textarea } from '@/components/ui/textarea';
import { logAuditEventAction } from '@/app/actions/audit-actions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function UnifiedOrganizationPage() {
  const { dataSource, activeTenantId } = useSettings();
  const { user: authPlatformUser } = usePlatformAuth();
  const [mounted, setMounted] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [search, setSearch] = useState('');
  
  const [activeAddParent, setActiveAddParent] = useState<{ id: string, type: 'tenant' | 'dept' } | null>(null);
  const [newName, setNewName] = useState('');

  // Tenant Editor State
  const [isTenantDialogOpen, setIsTenantDialogOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<any>(null);
  const [tenantName, setTenantName] = useState('');
  const [tenantDescription, setTenantDescription] = useState('');
  const [isSavingTenant, setIsSavingTenant] = useState(false);

  // Job Editor State
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<JobTitle | null>(null);
  const [jobName, setJobName] = useState('');
  const [jobDesc, setJobDesc] = useState('');
  const [jobEntitlementIds, setJobEntitlementIds] = useState<string[]>([]);
  const [isSavingJob, setIsSavingJob] = useState(false);

  const { data: tenants, refresh: refreshTenants } = usePluggableCollection<Tenant>('tenants');
  const { data: departments, refresh: refreshDepts } = usePluggableCollection<Department>('departments');
  const { data: jobTitles, refresh: refreshJobs } = usePluggableCollection<JobTitle>('jobTitles');
  const { data: entitlements } = usePluggableCollection<Entitlement>('entitlements');
  const { data: orgUnitTypes, refresh: refreshOrgUnitTypes } = usePluggableCollection<OrgUnitType>('orgUnitTypes');
  const { data: orgUnits, refresh: refreshOrgUnits } = usePluggableCollection<OrgUnit>('orgUnits');
  const { data: orgUnitRelations, refresh: refreshOrgUnitRelations } = usePluggableCollection<OrgUnitRelation>('orgUnitRelations');

  const [selectedOrgTypeFilter, setSelectedOrgTypeFilter] = useState('all');
  const [newOrgTypeName, setNewOrgTypeName] = useState('');
  const [newOrgTypeKey, setNewOrgTypeKey] = useState('');
  const [newOrgUnitName, setNewOrgUnitName] = useState('');
  const [newOrgUnitTypeId, setNewOrgUnitTypeId] = useState('');
  const [newOrgUnitParentId, setNewOrgUnitParentId] = useState('none');
  const [newRelationFromId, setNewRelationFromId] = useState('');
  const [newRelationToId, setNewRelationToId] = useState('');
  const [newRelationType, setNewRelationType] = useState<'supports' | 'advises' | 'works_for'>('supports');

  useEffect(() => { setMounted(true); }, []);

  const isSuperAdmin = authPlatformUser?.role === 'superAdmin';

  const resetForm = () => {
    setEditingTenant(null);
    setTenantName('');
    setTenantDescription('');
    setActiveAddParent(null);
    setNewName('');
  };

  const groupedData = useMemo(() => {
    if (!tenants) return [];
    return tenants
      .filter(t => (showArchived ? t.status === 'archived' : t.status !== 'archived'))
      .map(tenant => {
        const tenantDepts = departments?.filter(d => d.tenantId === tenant.id) || [];
        const deptsWithJobs = tenantDepts.map(dept => ({
          ...dept,
          jobs: jobTitles?.filter(j => j.departmentId === dept.id) || []
        }));
        return { ...tenant, departments: deptsWithJobs };
      })
      .filter(t => !search || t.name.toLowerCase().includes(search.toLowerCase()));
  }, [tenants, departments, jobTitles, search, showArchived]);

  const availableOrgTypes = useMemo(() => {
    return (orgUnitTypes || [])
      .filter((item) => item.tenantId === activeTenantId || activeTenantId === 'all')
      .filter((item) => item.enabled === true || item.enabled === 1)
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  }, [orgUnitTypes, activeTenantId]);

  const orgUnitsInScope = useMemo(() => {
    return (orgUnits || []).filter((item) => item.tenantId === activeTenantId || activeTenantId === 'all');
  }, [orgUnits, activeTenantId]);

  const filteredOrgUnits = useMemo(() => {
    const allUnits = orgUnitsInScope;
    if (selectedOrgTypeFilter === 'all') return allUnits;
    return allUnits.filter((item) => item.typeId === selectedOrgTypeFilter);
  }, [orgUnitsInScope, selectedOrgTypeFilter]);

  const orgTreeRoots = useMemo(() => {
    const unitIds = new Set(filteredOrgUnits.map((item) => item.id));
    return filteredOrgUnits.filter((item) => !item.parentId || !unitIds.has(item.parentId));
  }, [filteredOrgUnits]);

  const relationRows = useMemo(() => {
    return (orgUnitRelations || []).filter((item) => item.tenantId === activeTenantId || activeTenantId === 'all');
  }, [orgUnitRelations, activeTenantId]);

  const relationTypeLabel: Record<'supports' | 'advises' | 'works_for', string> = {
    supports: 'Unterstützt',
    advises: 'Berät',
    works_for: 'Arbeitet für',
  };

  const getWritableTenantId = () => {
    if (activeTenantId === 'all') {
      toast({
        variant: 'destructive',
        title: 'Mandant auswählen',
        description: 'Bitte im Header einen konkreten Mandanten wählen, bevor OrgUnit-Einstellungen geändert werden.',
      });
      return null;
    }
    return activeTenantId;
  };

  const getOrgUnitName = (orgUnitId?: string) => {
    if (!orgUnitId) return '—';
    return orgUnits?.find((item) => item.id === orgUnitId)?.name || orgUnitId;
  };

  const renderOrgNode = (node: OrgUnit, level: number = 0): JSX.Element => {
    const children = filteredOrgUnits.filter((item) => item.parentId === node.id);
    const typeName = availableOrgTypes.find((item) => item.id === node.typeId)?.name || node.typeId;

    return (
      <div key={node.id} className="space-y-2">
        <div className="flex items-center gap-2" style={{ marginLeft: `${level * 16}px` }}>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{node.name}</span>
          <Badge variant="outline" className="text-[8px] uppercase">{typeName}</Badge>
        </div>
        {children.map((child) => renderOrgNode(child, level + 1))}
      </div>
    );
  };

  const handleCreateOrgUnitType = async () => {
    if (!newOrgTypeName) return;
    const writableTenantId = getWritableTenantId();
    if (!writableTenantId) return;
    const id = `out-${Math.random().toString(36).substring(2, 8)}`;
    const normalizedKey = (newOrgTypeKey || newOrgTypeName)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_');

    const data = {
      id,
      tenantId: writableTenantId,
      key: normalizedKey,
      name: newOrgTypeName,
      enabled: true,
      sortOrder: availableOrgTypes.length,
    };

    const result = await saveCollectionRecord('orgUnitTypes', id, data, dataSource);
    if (result.success) {
      await logAuditEventAction(dataSource, {
        tenantId: data.tenantId,
        actorUid: authPlatformUser?.email || 'system',
        action: `OrgUnit-Typ angelegt: ${newOrgTypeName}`,
        entityType: 'orgUnitType',
        entityId: id,
        after: data,
      });
      setNewOrgTypeName('');
      setNewOrgTypeKey('');
      refreshOrgUnitTypes();
      toast({ title: 'OrgUnit-Typ gespeichert' });
    }
  };

  const handleCreateOrgUnit = async () => {
    if (!newOrgUnitName || !newOrgUnitTypeId) return;
    const writableTenantId = getWritableTenantId();
    if (!writableTenantId) return;
    const id = `ou-${Math.random().toString(36).substring(2, 8)}`;
    const data = {
      id,
      tenantId: writableTenantId,
      name: newOrgUnitName,
      typeId: newOrgUnitTypeId,
      parentId: newOrgUnitParentId === 'none' ? null : newOrgUnitParentId,
      status: 'active',
      sortOrder: 0,
    };

    const result = await saveCollectionRecord('orgUnits', id, data, dataSource);
    if (result.success) {
      await logAuditEventAction(dataSource, {
        tenantId: data.tenantId,
        actorUid: authPlatformUser?.email || 'system',
        action: `OrgUnit angelegt: ${newOrgUnitName}`,
        entityType: 'orgUnit',
        entityId: id,
        after: data,
      });
      setNewOrgUnitName('');
      setNewOrgUnitTypeId('');
      setNewOrgUnitParentId('none');
      refreshOrgUnits();
      toast({ title: 'OrgUnit gespeichert' });
    }
  };

  const handleCreateRelation = async () => {
    if (!newRelationFromId || !newRelationToId || newRelationFromId === newRelationToId) return;
    const writableTenantId = getWritableTenantId();
    if (!writableTenantId) return;
    const id = `our-${Math.random().toString(36).substring(2, 8)}`;
    const data = {
      id,
      tenantId: writableTenantId,
      fromOrgUnitId: newRelationFromId,
      toOrgUnitId: newRelationToId,
      relationType: newRelationType,
      status: 'active',
      validFrom: new Date().toISOString(),
    };

    const result = await saveCollectionRecord('orgUnitRelations', id, data, dataSource);
    if (result.success) {
      await logAuditEventAction(dataSource, {
        tenantId: data.tenantId,
        actorUid: authPlatformUser?.email || 'system',
        action: `Stabsrelation gepflegt: ${newRelationType}`,
        entityType: 'orgUnitRelation',
        entityId: id,
        after: data,
      });
      setNewRelationFromId('');
      setNewRelationToId('');
      setNewRelationType('supports');
      refreshOrgUnitRelations();
      toast({ title: 'Relation gespeichert' });
    }
  };

  const handleDeleteRelation = async (relation: OrgUnitRelation) => {
    const result = await deleteCollectionRecord('orgUnitRelations', relation.id, dataSource);
    if (result.success) {
      await logAuditEventAction(dataSource, {
        tenantId: relation.tenantId,
        actorUid: authPlatformUser?.email || 'system',
        action: `Stabsrelation entfernt: ${relation.relationType}`,
        entityType: 'orgUnitRelation',
        entityId: relation.id,
        before: relation,
      });
      refreshOrgUnitRelations();
      toast({ title: 'Relation entfernt' });
    }
  };

  const handleSaveTenant = async () => {
    if (!tenantName) return;
    setIsSavingTenant(true);
    const id = editingTenant?.id || `t-${Math.random().toString(36).substring(2, 7)}`;
    const tenantData = {
      id,
      name: tenantName,
      slug: tenantName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      companyDescription: tenantDescription,
      status: editingTenant?.status || 'active',
      createdAt: editingTenant?.createdAt || new Date().toISOString()
    };
    try {
      const res = await saveCollectionRecord('tenants', id, tenantData, dataSource);
      if (res.success) {
        await logAuditEventAction(dataSource, {
          tenantId: id,
          actorUid: authPlatformUser?.email || 'system',
          action: editingTenant ? `Mandant aktualisiert: ${tenantName}` : `Mandant angelegt: ${tenantName}`,
          entityType: 'tenant',
          entityId: id,
          after: tenantData
        });
        setIsTenantDialogOpen(false);
        refreshTenants();
        toast({ title: "Mandant gespeichert" });
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Fehler", description: e.message });
    } finally {
      setIsSavingTenant(false);
    }
  };

  const handleCreateSub = async () => {
    if (!newName || !activeAddParent) return;
    const id = `${activeAddParent.type === 'tenant' ? 'd' : 'j'}-${Math.random().toString(36).substring(2, 7)}`;
    if (activeAddParent.type === 'tenant') {
      const data = { id, tenantId: activeAddParent.id, name: newName, status: 'active' };
      await saveCollectionRecord('departments', id, data, dataSource);
      await logAuditEventAction(dataSource, {
        tenantId: activeAddParent.id,
        actorUid: authPlatformUser?.email || 'system',
        action: `Abteilung angelegt: ${newName}`,
        entityType: 'department',
        entityId: id,
        after: data
      });
      refreshDepts();
    } else {
      const dept = departments?.find(d => d.id === activeAddParent.id);
      if (dept) {
        const data = { id, tenantId: dept.tenantId, departmentId: activeAddParent.id, name: newName, status: 'active', entitlementIds: [] };
        await saveCollectionRecord('jobTitles', id, data, dataSource);
        await logAuditEventAction(dataSource, {
          tenantId: dept.tenantId,
          actorUid: authPlatformUser?.email || 'system',
          action: `Rollen-Blueprint angelegt: ${newName} (Abt: ${dept.name})`,
          entityType: 'jobTitle',
          entityId: id,
          after: data
        });
        refreshJobs();
      }
    }
    setNewName('');
    setActiveAddParent(null);
    toast({ title: "Erfolgreich angelegt" });
  };

  const handleStatusChange = async (coll: string, item: any, newStatus: 'active' | 'archived') => {
    const res = await saveCollectionRecord(coll, item.id, { ...item, status: newStatus }, dataSource);
    if (res.success) {
      await logAuditEventAction(dataSource, {
        tenantId: item.tenantId || item.id,
        actorUid: authPlatformUser?.email || 'system',
        action: `${coll === 'tenants' ? 'Mandant' : coll === 'departments' ? 'Abteilung' : 'Stelle'} ${newStatus === 'archived' ? 'archiviert' : 'reaktiviert'}: ${item.name}`,
        entityType: coll,
        entityId: item.id
      });
      if (coll === 'tenants') refreshTenants();
      if (coll === 'departments') refreshDepts();
      if (coll === 'jobTitles') refreshJobs();
      toast({ title: "Status geändert" });
    }
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
    const data = {
      ...editingJob,
      name: jobName,
      description: jobDesc,
      entitlementIds: jobEntitlementIds
    };
    try {
      const res = await saveCollectionRecord('jobTitles', editingJob.id, data, dataSource);
      if (res.success) {
        await logAuditEventAction(dataSource, {
          tenantId: editingJob.tenantId,
          actorUid: authPlatformUser?.email || 'system',
          action: `Rollen-Blueprint aktualisiert: ${jobName}`,
          entityType: 'jobTitle',
          entityId: editingJob.id,
          after: data
        });
        setIsEditorOpen(false);
        refreshJobs();
        toast({ title: "Gespeichert" });
      }
    } finally {
      setIsSavingJob(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="p-4 md:p-8 space-y-6 w-full mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b pb-6">
        <div>
          <Badge className="mb-1 bg-primary/10 text-primary text-[9px] font-bold">Organisation</Badge>
          <h1 className="text-2xl font-headline font-bold text-slate-900 dark:text-white uppercase">Organisation & Struktur</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-9 font-bold text-[10px]" onClick={() => setShowArchived(!showArchived)}>{showArchived ? 'Aktive' : 'Archiv'}</Button>
          <Button size="sm" className="h-9 rounded-md font-bold text-[10px] px-6 bg-primary hover:bg-primary/90 text-white shadow-sm" onClick={() => { resetForm(); setIsTenantDialogOpen(true); }}>Neuer Mandant</Button>
        </div>
      </div>

      <Tabs defaultValue="master" className="space-y-4">
        <TabsList className="h-11 rounded-xl border p-1 bg-slate-50 w-full sm:w-auto">
          <TabsTrigger value="master" className="text-[11px] font-bold">Stammdaten</TabsTrigger>
          <TabsTrigger value="orgmodel" className="text-[11px] font-bold">Org-Modell (neu)</TabsTrigger>
        </TabsList>

        <TabsContent value="master" className="space-y-4">
          {groupedData.map(tenant => (
            <Card key={tenant.id} className="border shadow-sm bg-white dark:bg-slate-900 overflow-hidden rounded-2xl group">
              <CardHeader className="bg-slate-50 dark:bg-slate-900 border-b p-4 px-6 flex flex-row items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary shadow-sm"><Building2 className="w-5 h-5" /></div>
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base font-bold">{tenant.name}</CardTitle>
                      <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => { setEditingTenant(tenant); setTenantName(tenant.name); setTenantDescription(tenant.companyDescription || ''); setIsTenantDialogOpen(true); }}><Pencil className="w-3.5 h-3.5" /></Button>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="ghost" className="h-8 text-[10px] font-black" onClick={() => setActiveAddParent({ id: tenant.id, type: 'tenant' })}><PlusCircle className="w-3.5 h-3.5 mr-1.5" /> Abteilung</Button>
                  <Button variant="ghost" size="icon" onClick={() => handleStatusChange('tenants', tenant, tenant.status === 'active' ? 'archived' : 'active')}>
                    {tenant.status === 'archived' ? <RotateCcw className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-100">
                  {tenant.departments.map((dept: any) => (
                    <div key={dept.id}>
                      <div className="flex items-center justify-between p-4 px-8 hover:bg-slate-50 group/dept">
                        <div className="flex items-center gap-3"><Layers className="w-4 h-4 text-emerald-600" /><h4 className="text-xs font-bold">{dept.name}</h4></div>
                        <div className="flex items-center gap-2 opacity-0 group-hover/dept:opacity-100">
                          <Button variant="ghost" size="sm" className="h-7 text-[10px] font-black" onClick={() => setActiveAddParent({ id: dept.id, type: 'dept' })}><Plus className="w-3 h-3 mr-1" /> Zuweisung</Button>
                          <Button variant="ghost" size="icon" onClick={() => handleStatusChange('departments', dept, dept.status === 'active' ? 'archived' : 'active')}><Archive className="w-3.5 h-3.5" /></Button>
                        </div>
                      </div>
                      <div className="bg-slate-50/30 px-8 pb-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pl-10 border-l-2 ml-4">
                          {dept.jobs?.map((job: any) => (
                            <div key={job.id} className="p-3 bg-white rounded-xl border flex items-center justify-between group/job hover:border-primary/30 cursor-pointer" onClick={() => openJobEditor(job)}>
                              <div className="flex items-center gap-3 truncate"><Briefcase className="w-4 h-4 text-slate-400" /><span className="text-[11px] font-bold truncate">{job.name}</span></div>
                              <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover/job:opacity-100" onClick={(e) => { e.stopPropagation(); openJobEditor(job); }}><Pencil className="w-3.5 h-3.5" /></Button>
                            </div>
                          ))}
                          {activeAddParent?.id === dept.id && (
                            <div className="flex gap-2 p-2 bg-white rounded-lg border-2 border-primary">
                              <Input value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCreateSub()} className="h-8 border-none shadow-none text-[11px] font-bold" />
                              <Button size="sm" className="h-8 px-4 font-bold text-[10px]" onClick={handleCreateSub}>OK</Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {activeAddParent?.id === tenant.id && (
                    <div className="p-4 px-8 bg-primary/5 flex items-center gap-3">
                      <Input placeholder="Abteilungsname..." value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCreateSub()} className="h-10 text-xs rounded-xl" />
                      <Button size="sm" onClick={handleCreateSub}>Erstellen</Button>
                      <Button variant="ghost" size="icon" onClick={() => setActiveAddParent(null)}><X className="w-4 h-4" /></Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="orgmodel" className="space-y-4">
          <Card className="border shadow-sm bg-white dark:bg-slate-900 overflow-hidden rounded-2xl">
            <CardHeader className="bg-slate-50 dark:bg-slate-900 border-b p-4 px-6">
              <CardTitle className="text-base font-bold">OrgUnits & Stabsstellen</CardTitle>
              <p className="text-xs text-slate-500">Geführte Pflege: zuerst Typen, dann OrgUnits, danach fachliche Relationen.</p>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <div className="space-y-3 p-4 rounded-xl border bg-slate-50/40">
                  <p className="text-[10px] font-black uppercase text-slate-400">1) OrgUnit-Typen</p>
                  <Input value={newOrgTypeName} onChange={(event) => setNewOrgTypeName(event.target.value)} placeholder="Bezeichnung (z. B. Bereich)" className="h-9" />
                  <Input value={newOrgTypeKey} onChange={(event) => setNewOrgTypeKey(event.target.value)} placeholder="Technischer Key (optional)" className="h-9" />
                  <Button size="sm" onClick={handleCreateOrgUnitType} className="text-[10px] font-bold w-full">Typ anlegen</Button>
                  <div className="space-y-1">
                    {availableOrgTypes.map((type) => (
                      <div key={type.id} className="px-2 py-1.5 rounded-md bg-white border text-xs font-bold flex items-center justify-between">
                        <span>{type.name}</span>
                        <span className="text-[10px] text-slate-400">{type.key}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3 p-4 rounded-xl border bg-slate-50/40">
                  <p className="text-[10px] font-black uppercase text-slate-400">2) OrgUnit anlegen</p>
                  <Input value={newOrgUnitName} onChange={(event) => setNewOrgUnitName(event.target.value)} placeholder="Name (z. B. Team Marketing)" className="h-9" />
                  <Select value={newOrgUnitTypeId} onValueChange={setNewOrgUnitTypeId}>
                    <SelectTrigger className="h-9 bg-white"><SelectValue placeholder="Typ auswählen" /></SelectTrigger>
                    <SelectContent>
                      {availableOrgTypes.map((type) => <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={newOrgUnitParentId} onValueChange={setNewOrgUnitParentId}>
                    <SelectTrigger className="h-9 bg-white"><SelectValue placeholder="Übergeordnete Einheit (optional)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Keine (Root)</SelectItem>
                      {orgUnitsInScope.map((unit) => <SelectItem key={unit.id} value={unit.id}>{unit.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button size="sm" onClick={handleCreateOrgUnit} className="text-[10px] font-bold w-full">OrgUnit anlegen</Button>
                </div>

                <div className="space-y-3 p-4 rounded-xl border bg-slate-50/40">
                  <p className="text-[10px] font-black uppercase text-slate-400">3) Stabsstellen-Relation</p>
                  <Select value={newRelationFromId} onValueChange={setNewRelationFromId}>
                    <SelectTrigger className="h-9 bg-white"><SelectValue placeholder="Von OrgUnit" /></SelectTrigger>
                    <SelectContent>
                      {orgUnitsInScope.map((unit) => <SelectItem key={unit.id} value={unit.id}>{unit.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={newRelationType} onValueChange={(value) => setNewRelationType(value as 'supports' | 'advises' | 'works_for')}>
                    <SelectTrigger className="h-9 bg-white"><SelectValue placeholder="Relationstyp" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="supports">Unterstützt</SelectItem>
                      <SelectItem value="advises">Berät</SelectItem>
                      <SelectItem value="works_for">Arbeitet für</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={newRelationToId} onValueChange={setNewRelationToId}>
                    <SelectTrigger className="h-9 bg-white"><SelectValue placeholder="Ziel-OrgUnit" /></SelectTrigger>
                    <SelectContent>
                      {orgUnitsInScope.filter((unit) => unit.id !== newRelationFromId).map((unit) => <SelectItem key={unit.id} value={unit.id}>{unit.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button size="sm" onClick={handleCreateRelation} className="text-[10px] font-bold w-full">Relation speichern</Button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="p-4 border rounded-xl bg-slate-50/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold uppercase text-slate-400">OrgUnit-Baumansicht</p>
                    <Select value={selectedOrgTypeFilter} onValueChange={setSelectedOrgTypeFilter}>
                      <SelectTrigger className="h-8 w-[180px] bg-white text-xs"><SelectValue placeholder="Typ filtern" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Alle Typen</SelectItem>
                        {availableOrgTypes.map((type) => <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    {orgTreeRoots.map((root) => renderOrgNode(root))}
                    {orgTreeRoots.length === 0 && <p className="text-xs text-slate-500 italic">Noch keine OrgUnits vorhanden.</p>}
                  </div>
                </div>
                <div className="p-4 border rounded-xl bg-slate-50/40 space-y-2">
                  <p className="text-[10px] font-bold uppercase text-slate-400">Fachliche Relationen</p>
                  <div className="space-y-2 max-h-[280px] overflow-auto pr-1">
                    {relationRows.map((row) => (
                      <div key={row.id} className="p-2 rounded-lg bg-white border flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold">{getOrgUnitName(row.fromOrgUnitId)} → {getOrgUnitName(row.toOrgUnitId)}</p>
                          <p className="text-[10px] text-slate-500">{relationTypeLabel[(row.relationType as 'supports' | 'advises' | 'works_for')] || row.relationType}</p>
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => handleDeleteRelation(row)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))}
                    {relationRows.length === 0 && <p className="text-xs text-slate-500 italic">Noch keine fachlichen Relationen vorhanden.</p>}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isTenantDialogOpen} onOpenChange={(v) => !v && setIsTenantDialogOpen(false)}>
        <DialogContent className="max-w-xl rounded-2xl p-0 overflow-hidden shadow-2xl border-none">
          <DialogHeader className="p-6 bg-slate-900 text-white shrink-0">
            <DialogTitle className="text-lg font-bold">Mandant bearbeiten</DialogTitle>
            <DialogDescription className="text-[10px] text-white/50 font-bold uppercase">Stammdaten & Unternehmensbeschreibung</DialogDescription>
          </DialogHeader>
          <div className="p-8 space-y-6">
            <div className="space-y-2"><Label className="text-[10px] font-bold uppercase text-slate-400">Name</Label><Input value={tenantName} onChange={e => setTenantName(e.target.value)} className="h-11 font-bold" /></div>
            <div className="space-y-2"><Label className="text-[10px] font-bold uppercase text-slate-400">KI Beschreibung</Label><Textarea value={tenantDescription} onChange={e => setTenantDescription(e.target.value)} className="min-h-[100px] text-xs" /></div>
          </div>
          <DialogFooter className="p-4 bg-slate-50 border-t">
            <Button variant="ghost" onClick={() => setIsTenantDialogOpen(false)}>Abbrechen</Button>
            <Button onClick={handleSaveTenant} disabled={isSavingTenant}>{isSavingTenant ? <Loader2 className="w-4 h-4 animate-spin" /> : <SaveIcon className="w-4 h-4" />} Speichern</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditorOpen} onOpenChange={(v) => !v && setIsEditorOpen(false)}>
        <DialogContent className="max-w-4xl rounded-2xl p-0 overflow-hidden flex flex-col shadow-2xl bg-white h-[85vh]">
          <DialogHeader className="p-6 bg-slate-900 text-white">
            <DialogTitle>Rollen-Blueprint bearbeiten</DialogTitle>
            <DialogDescription className="text-[10px] text-white/50 font-bold uppercase">Standard-Berechtigungen für dieses Profil definieren</DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 p-8 space-y-10">
            <div className="space-y-4">
              <Label className="text-[10px] font-bold uppercase text-slate-400">Bezeichnung</Label>
              <Input value={jobName} onChange={e => setJobName(e.target.value)} className="h-11 font-bold" />
              <Label className="text-[10px] font-bold uppercase text-slate-400">Beschreibung</Label>
              <Textarea value={jobDesc} onChange={e => setJobDesc(e.target.value)} className="min-h-[100px] text-xs" />
            </div>
            <div className="pt-6 border-t">
              <Label className="text-xs font-bold text-primary mb-4 block">Enthaltene Berechtigungen ({jobEntitlementIds.length})</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {entitlements?.filter(e => activeTenantId === 'all' || e.tenantId === activeTenantId || e.tenantId === 'global').map(ent => (
                  <div key={ent.id} className={cn("p-3 border rounded-xl flex items-center gap-3 cursor-pointer", jobEntitlementIds.includes(ent.id) ? "border-primary bg-primary/5" : "bg-white")} onClick={() => setJobEntitlementIds(prev => prev.includes(ent.id) ? prev.filter(id => id !== ent.id) : [...prev, ent.id])}>
                    <Checkbox checked={jobEntitlementIds.includes(ent.id)} />
                    <span className="text-[11px] font-bold truncate">{ent.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="p-4 bg-slate-50 border-t">
            <Button variant="ghost" onClick={() => setIsEditorOpen(false)}>Abbrechen</Button>
            <Button onClick={saveJobEdits} disabled={isSavingJob}>{isSavingJob ? <Loader2 className="w-4 h-4 animate-spin" /> : <SaveIcon className="w-4 h-4" />} Speichern</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
