"use client";

import { useEffect, useMemo, useState } from 'react';
import { Archive, Building2, ChevronRight, Loader2, Pencil, PlusCircle, RotateCcw, Save as SaveIcon, X } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

import { useSettings } from '@/context/settings-context';
import { usePlatformAuth } from '@/context/auth-context';
import { usePluggableCollection } from '@/hooks/data/use-pluggable-collection';
import { toast } from '@/hooks/use-toast';

import { saveCollectionRecord } from '@/app/actions/mysql-actions';
import { logAuditEventAction } from '@/app/actions/audit-actions';

import { Entitlement, JobTitle, OrgUnit, OrgUnitType, Tenant } from '@/lib/types';

export default function UnifiedOrganizationPage() {
  const { dataSource, activeTenantId } = useSettings();
  const { user: authPlatformUser } = usePlatformAuth();

  const [mounted, setMounted] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [search, setSearch] = useState('');

  const [newName, setNewName] = useState('');
  const [activeAddParentTenantId, setActiveAddParentTenantId] = useState<string | null>(null);
  const [activeCreateOrgUnitFor, setActiveCreateOrgUnitFor] = useState<string | null>(null);
  const [activeCreateJobFor, setActiveCreateJobFor] = useState<string | null>(null);

  const [isTenantDialogOpen, setIsTenantDialogOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [tenantName, setTenantName] = useState('');
  const [tenantDescription, setTenantDescription] = useState('');
  const [isSavingTenant, setIsSavingTenant] = useState(false);

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<JobTitle | null>(null);
  const [jobName, setJobName] = useState('');
  const [jobDesc, setJobDesc] = useState('');
  const [jobEntitlementIds, setJobEntitlementIds] = useState<string[]>([]);
  const [isSavingJob, setIsSavingJob] = useState(false);

  const { data: tenants, refresh: refreshTenants } = usePluggableCollection<Tenant>('tenants');
  const { data: orgUnits, refresh: refreshOrgUnits } = usePluggableCollection<OrgUnit>('orgUnits');
  const { data: orgUnitTypes, refresh: refreshOrgUnitTypes } = usePluggableCollection<OrgUnitType>('orgUnitTypes');
  const { data: jobTitles, refresh: refreshJobs } = usePluggableCollection<JobTitle>('jobTitles');
  const { data: entitlements } = usePluggableCollection<Entitlement>('entitlements');

  useEffect(() => setMounted(true), []);

  const tenantsInScope = useMemo(() => {
    return (tenants || [])
      .filter((tenant) => (activeTenantId === 'all' ? true : tenant.id === activeTenantId))
      .filter((tenant) => (showArchived ? tenant.status === 'archived' : tenant.status !== 'archived'))
      .filter((tenant) => (!search ? true : tenant.name.toLowerCase().includes(search.toLowerCase())));
  }, [tenants, activeTenantId, showArchived, search]);

  const orgUnitsInScope = useMemo(() => {
    return (orgUnits || []).filter((item) => (showArchived ? true : item.status !== 'archived'));
  }, [orgUnits, showArchived]);

  const getTenantRootOrgUnit = (tenantId: string) => {
    return orgUnitsInScope.find((item) => item.tenantId === tenantId && !item.parentId);
  };

  const ensureDefaultOrgUnitType = async (tenantId: string) => {
    const existingType = (orgUnitTypes || []).find(
      (item) => item.tenantId === tenantId && (item.key === 'unit' || item.key === 'department')
    );
    if (existingType) return existingType.id;

    const id = `out-unit-${tenantId}`;
    const payload = {
      id,
      tenantId,
      key: 'unit',
      name: 'Organisationseinheit',
      enabled: true,
      sortOrder: 0,
    };

    await saveCollectionRecord('orgUnitTypes', id, payload, dataSource);
    refreshOrgUnitTypes();
    return id;
  };

  const ensureTenantRoot = async (tenantId: string) => {
    const existingRoot = (orgUnits || []).find((item) => item.tenantId === tenantId && !item.parentId);
    if (existingRoot) return existingRoot;

    const typeId = await ensureDefaultOrgUnitType(tenantId);
    const rootId = `ou-root-${tenantId}`;
    const rootPayload = {
      id: rootId,
      tenantId,
      name: 'Organisation',
      typeId,
      parentId: undefined,
      status: 'active' as const,
      sortOrder: 0,
    };

    await saveCollectionRecord('orgUnits', rootId, rootPayload, dataSource);
    await logAuditEventAction(dataSource, {
      tenantId,
      actorUid: authPlatformUser?.email || 'system',
      action: 'Organisation-Root angelegt',
      entityType: 'orgUnit',
      entityId: rootId,
      after: rootPayload,
    });

    refreshOrgUnits();
    return rootPayload;
  };

  const resetForm = () => {
    setEditingTenant(null);
    setTenantName('');
    setTenantDescription('');
  };

  const handleSaveTenant = async () => {
    if (!tenantName.trim()) return;

    setIsSavingTenant(true);
    const id = editingTenant?.id || `t-${Math.random().toString(36).substring(2, 7)}`;
    const payload = {
      id,
      name: tenantName.trim(),
      slug: tenantName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      companyDescription: tenantDescription,
      status: editingTenant?.status || 'active',
      createdAt: editingTenant?.createdAt || new Date().toISOString(),
    };

    try {
      const res = await saveCollectionRecord('tenants', id, payload, dataSource);
      if (!res.success) return;

      await logAuditEventAction(dataSource, {
        tenantId: id,
        actorUid: authPlatformUser?.email || 'system',
        action: editingTenant ? `Mandant aktualisiert: ${tenantName}` : `Mandant angelegt: ${tenantName}`,
        entityType: 'tenant',
        entityId: id,
        after: payload,
      });

      if (!editingTenant) {
        await ensureTenantRoot(id);
      }

      refreshTenants();
      setIsTenantDialogOpen(false);
      toast({ title: 'Mandant gespeichert' });
    } finally {
      setIsSavingTenant(false);
    }
  };

  const handleCreateSub = async () => {
    if (!newName.trim()) return;

    if (activeAddParentTenantId) {
      const root = await ensureTenantRoot(activeAddParentTenantId);
      const typeId = await ensureDefaultOrgUnitType(activeAddParentTenantId);
      const id = `ou-${Math.random().toString(36).substring(2, 8)}`;
      const payload = {
        id,
        tenantId: activeAddParentTenantId,
        name: newName.trim(),
        typeId,
        parentId: root.id,
        status: 'active' as const,
        sortOrder: 0,
      };

      await saveCollectionRecord('orgUnits', id, payload, dataSource);
      await logAuditEventAction(dataSource, {
        tenantId: activeAddParentTenantId,
        actorUid: authPlatformUser?.email || 'system',
        action: `Organisationseinheit angelegt: ${newName}`,
        entityType: 'orgUnit',
        entityId: id,
        after: payload,
      });

      refreshOrgUnits();
      setNewName('');
      setActiveAddParentTenantId(null);
      toast({ title: 'Ebene angelegt' });
      return;
    }

    if (activeCreateOrgUnitFor) {
      const parent = (orgUnits || []).find((item) => item.id === activeCreateOrgUnitFor);
      if (!parent) return;

      const typeId = await ensureDefaultOrgUnitType(parent.tenantId);
      const id = `ou-${Math.random().toString(36).substring(2, 8)}`;
      const payload = {
        id,
        tenantId: parent.tenantId,
        name: newName.trim(),
        typeId,
        parentId: parent.id,
        status: 'active' as const,
        sortOrder: 0,
      };

      await saveCollectionRecord('orgUnits', id, payload, dataSource);
      await logAuditEventAction(dataSource, {
        tenantId: parent.tenantId,
        actorUid: authPlatformUser?.email || 'system',
        action: `Organisationseinheit angelegt: ${newName}`,
        entityType: 'orgUnit',
        entityId: id,
        after: payload,
      });

      refreshOrgUnits();
      setNewName('');
      setActiveCreateOrgUnitFor(null);
      toast({ title: 'Unterebene angelegt' });
      return;
    }

    if (activeCreateJobFor) {
      const unit = (orgUnits || []).find((item) => item.id === activeCreateJobFor);
      if (!unit) return;

      const id = `j-${Math.random().toString(36).substring(2, 7)}`;
      const payload = {
        id,
        tenantId: unit.tenantId,
        departmentId: unit.id,
        name: newName.trim(),
        status: 'active' as const,
        entitlementIds: [],
      };

      await saveCollectionRecord('jobTitles', id, payload, dataSource);
      await logAuditEventAction(dataSource, {
        tenantId: unit.tenantId,
        actorUid: authPlatformUser?.email || 'system',
        action: `Stellenprofil angelegt: ${newName}`,
        entityType: 'jobTitle',
        entityId: id,
        after: payload,
      });

      refreshJobs();
      setNewName('');
      setActiveCreateJobFor(null);
      toast({ title: 'Stellenprofil angelegt' });
    }
  };

  const handleStatusChange = async (collection: 'tenants' | 'orgUnits' | 'jobTitles', item: any, newStatus: 'active' | 'archived') => {
    const res = await saveCollectionRecord(collection, item.id, { ...item, status: newStatus }, dataSource);
    if (!res.success) return;

    await logAuditEventAction(dataSource, {
      tenantId: item.tenantId || item.id,
      actorUid: authPlatformUser?.email || 'system',
      action: `${collection === 'tenants' ? 'Mandant' : collection === 'orgUnits' ? 'Organisationseinheit' : 'Stellenprofil'} ${newStatus === 'archived' ? 'archiviert' : 'reaktiviert'}: ${item.name}`,
      entityType: collection,
      entityId: item.id,
    });

    if (collection === 'tenants') refreshTenants();
    if (collection === 'orgUnits') refreshOrgUnits();
    if (collection === 'jobTitles') refreshJobs();

    toast({ title: 'Status geändert' });
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
    const payload = {
      ...editingJob,
      name: jobName,
      description: jobDesc,
      entitlementIds: jobEntitlementIds,
    };

    try {
      const res = await saveCollectionRecord('jobTitles', editingJob.id, payload, dataSource);
      if (!res.success) return;

      await logAuditEventAction(dataSource, {
        tenantId: editingJob.tenantId,
        actorUid: authPlatformUser?.email || 'system',
        action: `Rollen-Blueprint aktualisiert: ${jobName}`,
        entityType: 'jobTitle',
        entityId: editingJob.id,
        after: payload,
      });

      refreshJobs();
      setIsEditorOpen(false);
      toast({ title: 'Gespeichert' });
    } finally {
      setIsSavingJob(false);
    }
  };

  const renderOrgNode = (node: OrgUnit, level = 0): JSX.Element => {
    const children = orgUnitsInScope.filter((item) => item.parentId === node.id);
    const nodeJobs = (jobTitles || []).filter((job) => job.departmentId === node.id);

    return (
      <div key={node.id} className="space-y-2">
        <div className="flex items-center justify-between gap-2" style={{ marginLeft: `${level * 18}px` }}>
          <div className="flex items-center gap-2">
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{node.name}</span>
            {node.status === 'archived' && <Badge variant="secondary" className="text-[9px]">Archiv</Badge>}
          </div>

          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              className="h-6 text-[10px]"
              onClick={() => {
                setActiveCreateOrgUnitFor(node.id);
                setActiveCreateJobFor(null);
                setActiveAddParentTenantId(null);
                setNewName('');
              }}
            >
              + Ebene
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 text-[10px]"
              onClick={() => {
                setActiveCreateJobFor(node.id);
                setActiveCreateOrgUnitFor(null);
                setActiveAddParentTenantId(null);
                setNewName('');
              }}
            >
              + Stellenprofil
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => handleStatusChange('orgUnits', node, node.status === 'active' ? 'archived' : 'active')}
            >
              {node.status === 'archived' ? <RotateCcw className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
            </Button>
          </div>
        </div>

        {activeCreateOrgUnitFor === node.id && (
          <div className="flex gap-2 pl-6" style={{ marginLeft: `${level * 18}px` }}>
            <Input
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              className="h-8 text-xs"
              placeholder="Name der Untereinheit"
            />
            <Button size="sm" className="h-8 text-[10px]" onClick={handleCreateSub}>Anlegen</Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setActiveCreateOrgUnitFor(null)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}

        {activeCreateJobFor === node.id && (
          <div className="flex gap-2 pl-6" style={{ marginLeft: `${level * 18}px` }}>
            <Input
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              className="h-8 text-xs"
              placeholder="Name des Stellenprofils"
            />
            <Button size="sm" className="h-8 text-[10px]" onClick={handleCreateSub}>Anlegen</Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setActiveCreateJobFor(null)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}

        {nodeJobs.length > 0 && (
          <div className="space-y-1 pl-6" style={{ marginLeft: `${level * 18}px` }}>
            {nodeJobs.map((job) => (
              <div key={job.id} className="flex items-center justify-between p-2 rounded-lg border bg-white dark:bg-slate-900">
                <button className="text-left flex-1" onClick={() => openJobEditor(job)}>
                  <span className="text-[11px] font-bold">{job.name}</span>
                </button>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openJobEditor(job)}>
                    <Pencil className="w-3.5 h-3.5 text-slate-400" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => handleStatusChange('jobTitles', job, job.status === 'active' ? 'archived' : 'active')}
                  >
                    {job.status === 'archived' ? <RotateCcw className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {children.map((child) => renderOrgNode(child, level + 1))}
      </div>
    );
  };

  if (!mounted) return null;

  return (
    <div className="p-4 md:p-8 space-y-6 w-full mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b pb-6">
        <div>
          <Badge className="mb-1 bg-primary/10 text-primary text-[9px] font-bold">Organisation</Badge>
          <h1 className="text-2xl font-headline font-bold text-slate-900 dark:text-white uppercase">Organisation & Stellenprofile</h1>
        </div>
        <div className="flex items-center gap-2">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Mandant suchen..."
            className="h-9 text-xs w-[220px]"
          />
          <Button variant="outline" size="sm" className="h-9 font-bold text-[10px]" onClick={() => setShowArchived((prev) => !prev)}>
            {showArchived ? 'Aktive' : 'Archiv'}
          </Button>
          <Button
            size="sm"
            className="h-9 rounded-md font-bold text-[10px] px-6 bg-primary hover:bg-primary/90 text-white shadow-sm"
            onClick={() => {
              resetForm();
              setIsTenantDialogOpen(true);
            }}
          >
            Neuer Mandant
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {tenantsInScope.map((tenant) => {
          const root = getTenantRootOrgUnit(tenant.id);
          const topLevelUnits = orgUnitsInScope.filter((item) => item.tenantId === tenant.id && item.parentId === root?.id);

          return (
            <Card key={tenant.id} className="border shadow-sm bg-white dark:bg-slate-900 overflow-hidden rounded-2xl group">
              <CardHeader className="bg-slate-50 dark:bg-slate-900 border-b p-4 px-6 flex flex-row items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary shadow-sm">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base font-bold">{tenant.name}</CardTitle>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100"
                      onClick={() => {
                        setEditingTenant(tenant);
                        setTenantName(tenant.name);
                        setTenantDescription(tenant.companyDescription || '');
                        setIsTenantDialogOpen(true);
                      }}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 text-[10px] font-black"
                    onClick={() => {
                      setActiveAddParentTenantId(tenant.id);
                      setActiveCreateOrgUnitFor(null);
                      setActiveCreateJobFor(null);
                      setNewName('');
                    }}
                  >
                    <PlusCircle className="w-3.5 h-3.5 mr-1.5" /> Ebene hinzufügen
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleStatusChange('tenants', tenant, tenant.status === 'active' ? 'archived' : 'active')}
                  >
                    {tenant.status === 'archived' ? <RotateCcw className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="p-4 space-y-3">
                {topLevelUnits.map((node) => renderOrgNode(node))}
                {topLevelUnits.length === 0 && <p className="text-xs text-slate-500 italic px-2">Noch keine Organisationseinheiten vorhanden.</p>}

                {activeAddParentTenantId === tenant.id && (
                  <div className="p-3 bg-primary/5 rounded-xl flex items-center gap-3">
                    <Input
                      placeholder="Name der Organisationseinheit..."
                      value={newName}
                      onChange={(event) => setNewName(event.target.value)}
                      onKeyDown={(event) => event.key === 'Enter' && handleCreateSub()}
                      className="h-10 text-xs rounded-xl"
                    />
                    <Button size="sm" onClick={handleCreateSub}>Erstellen</Button>
                    <Button variant="ghost" size="icon" onClick={() => setActiveAddParentTenantId(null)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={isTenantDialogOpen} onOpenChange={(open) => !open && setIsTenantDialogOpen(false)}>
        <DialogContent className="max-w-xl rounded-2xl p-0 overflow-hidden shadow-2xl border-none">
          <DialogHeader className="p-6 bg-slate-900 text-white shrink-0">
            <DialogTitle className="text-lg font-bold">Mandant bearbeiten</DialogTitle>
            <DialogDescription className="text-[10px] text-white/50 font-bold uppercase">Stammdaten & Unternehmensbeschreibung</DialogDescription>
          </DialogHeader>
          <div className="p-8 space-y-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase text-slate-400">Name</Label>
              <Input value={tenantName} onChange={(event) => setTenantName(event.target.value)} className="h-11 font-bold" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase text-slate-400">KI Beschreibung</Label>
              <Textarea value={tenantDescription} onChange={(event) => setTenantDescription(event.target.value)} className="min-h-[100px] text-xs" />
            </div>
          </div>
          <DialogFooter className="p-4 bg-slate-50 border-t">
            <Button variant="ghost" onClick={() => setIsTenantDialogOpen(false)}>Abbrechen</Button>
            <Button onClick={handleSaveTenant} disabled={isSavingTenant}>
              {isSavingTenant ? <Loader2 className="w-4 h-4 animate-spin" /> : <SaveIcon className="w-4 h-4" />} Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditorOpen} onOpenChange={(open) => !open && setIsEditorOpen(false)}>
        <DialogContent className="max-w-4xl rounded-2xl p-0 overflow-hidden flex flex-col shadow-2xl bg-white h-[85vh]">
          <DialogHeader className="p-6 bg-slate-900 text-white">
            <DialogTitle>Rollen-Blueprint bearbeiten</DialogTitle>
            <DialogDescription className="text-[10px] text-white/50 font-bold uppercase">Standard-Berechtigungen für dieses Profil definieren</DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 p-8 space-y-10">
            <div className="space-y-4">
              <Label className="text-[10px] font-bold uppercase text-slate-400">Bezeichnung</Label>
              <Input value={jobName} onChange={(event) => setJobName(event.target.value)} className="h-11 font-bold" />

              <Label className="text-[10px] font-bold uppercase text-slate-400">Beschreibung</Label>
              <Textarea value={jobDesc} onChange={(event) => setJobDesc(event.target.value)} className="min-h-[100px] text-xs" />
            </div>

            <div className="pt-6 border-t">
              <Label className="text-xs font-bold text-primary mb-4 block">Enthaltene Berechtigungen ({jobEntitlementIds.length})</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {(entitlements || [])
                  .filter((ent) => activeTenantId === 'all' || ent.tenantId === activeTenantId || ent.tenantId === 'global')
                  .map((ent) => (
                    <div
                      key={ent.id}
                      className={cn(
                        'p-3 border rounded-xl flex items-center gap-3 cursor-pointer',
                        jobEntitlementIds.includes(ent.id) ? 'border-primary bg-primary/5' : 'bg-white'
                      )}
                      onClick={() =>
                        setJobEntitlementIds((prev) =>
                          prev.includes(ent.id) ? prev.filter((id) => id !== ent.id) : [...prev, ent.id]
                        )
                      }
                    >
                      <Checkbox checked={jobEntitlementIds.includes(ent.id)} />
                      <span className="text-[11px] font-bold truncate">{ent.name}</span>
                    </div>
                  ))}
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="p-4 bg-slate-50 border-t">
            <Button variant="ghost" onClick={() => setIsEditorOpen(false)}>Abbrechen</Button>
            <Button onClick={saveJobEdits} disabled={isSavingJob}>
              {isSavingJob ? <Loader2 className="w-4 h-4 animate-spin" /> : <SaveIcon className="w-4 h-4" />} Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
