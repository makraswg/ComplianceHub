"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertTriangle, Clock, Download, KeyRound, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePluggableCollection } from '@/hooks/data/use-pluggable-collection';
import { useSettings } from '@/context/settings-context';
import { usePlatformAuth } from '@/context/auth-context';
import { toast } from '@/hooks/use-toast';
import { Entitlement, Resource, ServiceAccount, Tenant } from '@/lib/types';
import { deleteServiceAccountAction, saveServiceAccountAction } from '@/app/actions/service-account-actions';
import { exportServiceAccountsExcel } from '@/lib/export-utils';

export const dynamic = 'force-dynamic';

function getRotationStatus(account: ServiceAccount): 'due' | 'ok' | 'none' {
  if (!account.lastRotatedAt || !account.rotationIntervalDays || account.rotationIntervalDays <= 0) return 'none';
  const date = new Date(account.lastRotatedAt);
  if (Number.isNaN(date.getTime())) return 'none';
  date.setDate(date.getDate() + account.rotationIntervalDays);
  return date.getTime() <= Date.now() ? 'due' : 'ok';
}

export default function ServiceAccountsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { dataSource, activeTenantId } = useSettings();
  const { user } = usePlatformAuth();

  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState('');
  const [rotationFilter, setRotationFilter] = useState<'all' | 'due' | 'ok' | 'none'>('all');
  const [resourceFilter, setResourceFilter] = useState<string>('all');

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editing, setEditing] = useState<ServiceAccount | null>(null);

  const [name, setName] = useState('');
  const [resourceId, setResourceId] = useState('');
  const [username, setUsername] = useState('');
  const [system, setSystem] = useState('');
  const [owner, setOwner] = useState('');
  const [purpose, setPurpose] = useState('');
  const [credentialType, setCredentialType] = useState('password');
  const [status, setStatus] = useState<ServiceAccount['status']>('active');
  const [rotationIntervalDays, setRotationIntervalDays] = useState('');
  const [lastRotatedAt, setLastRotatedAt] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [notes, setNotes] = useState('');
  const [entitlementIds, setEntitlementIds] = useState<string[]>([]);

  const { data: serviceAccounts, isLoading, refresh } = usePluggableCollection<ServiceAccount>('serviceAccounts');
  const { data: resources } = usePluggableCollection<Resource>('resources');
  const { data: entitlements } = usePluggableCollection<Entitlement>('entitlements');
  const { data: tenants } = usePluggableCollection<Tenant>('tenants');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const resourceQuery = searchParams.get('resourceId');
    const mode = searchParams.get('new');
    const editId = searchParams.get('edit');
    if (mode === '1') {
      resetForm();
      if (resourceQuery) setResourceId(resourceQuery);
      setIsDialogOpen(true);
      return;
    }

    if (editId && serviceAccounts) {
      const target = serviceAccounts.find((item) => item.id === editId);
      if (target) openEdit(target);
    }
  }, [searchParams, serviceAccounts]);

  const visibleResources = useMemo(() => {
    if (!resources) return [];
    if (activeTenantId === 'all') return resources;
    return resources.filter((item) => item.tenantId === activeTenantId);
  }, [resources, activeTenantId]);

  const visibleEntitlements = useMemo(() => {
    if (!entitlements) return [];
    return entitlements.filter((item) => (resourceId ? item.resourceId === resourceId : true));
  }, [entitlements, resourceId]);

  const filtered = useMemo(() => {
    if (!serviceAccounts) return [];

    const tenantFiltered = serviceAccounts.filter((item) => (activeTenantId === 'all' ? true : item.tenantId === activeTenantId));
    const q = search.trim().toLowerCase();

    return tenantFiltered
      .filter((item) => {
        if (!q) return true;
        const resourceName = resources?.find((res) => res.id === item.resourceId)?.name || '';
        return [item.name, item.username || '', item.owner || '', item.system || '', resourceName].some((v) =>
          v.toLowerCase().includes(q)
        );
      })
      .filter((item) => (resourceFilter === 'all' ? true : item.resourceId === resourceFilter))
      .filter((item) => (rotationFilter === 'all' ? true : getRotationStatus(item) === rotationFilter))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [serviceAccounts, activeTenantId, search, resources, resourceFilter, rotationFilter]);

  const resetForm = () => {
    setEditing(null);
    setName('');
    setResourceId('');
    setUsername('');
    setSystem('');
    setOwner('');
    setPurpose('');
    setCredentialType('password');
    setStatus('active');
    setRotationIntervalDays('');
    setLastRotatedAt('');
    setValidUntil('');
    setNotes('');
    setEntitlementIds([]);
  };

  const openCreate = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEdit = (item: ServiceAccount) => {
    setEditing(item);
    setName(item.name);
    setResourceId(item.resourceId);
    setUsername(item.username || '');
    setSystem(item.system || '');
    setOwner(item.owner || '');
    setPurpose(item.purpose || '');
    setCredentialType(item.credentialType || 'password');
    setStatus(item.status);
    setRotationIntervalDays(item.rotationIntervalDays ? String(item.rotationIntervalDays) : '');
    setLastRotatedAt(item.lastRotatedAt ? item.lastRotatedAt.slice(0, 10) : '');
    setValidUntil(item.validUntil ? item.validUntil.slice(0, 10) : '');
    setNotes(item.notes || '');
    setEntitlementIds(item.entitlementIds || []);
    setIsDialogOpen(true);
  };

  const toggleEntitlement = (id: string) => {
    setEntitlementIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const handleSave = async () => {
    if (!name || !resourceId) {
      toast({ variant: 'destructive', title: 'Fehlende Angaben', description: 'Name und Ressource sind erforderlich.' });
      return;
    }

    setIsSaving(true);
    try {
      const selectedResource = resources?.find((item) => item.id === resourceId);
      const tenantId = selectedResource?.tenantId || (activeTenantId === 'all' ? 't1' : activeTenantId);

      const result = await saveServiceAccountAction(
        {
          id: editing?.id,
          tenantId,
          resourceId,
          name,
          username: username || undefined,
          system: system || undefined,
          owner: owner || undefined,
          purpose: purpose || undefined,
          credentialType,
          status,
          entitlementIds,
          rotationIntervalDays: rotationIntervalDays ? Number(rotationIntervalDays) : undefined,
          lastRotatedAt: lastRotatedAt || undefined,
          validUntil: validUntil || undefined,
          notes: notes || undefined,
          createdAt: editing?.createdAt,
        },
        dataSource,
        user?.email || 'system'
      );

      if (!result.success) {
        toast({ variant: 'destructive', title: 'Speichern fehlgeschlagen', description: result.error || 'Unbekannter Fehler.' });
        return;
      }

      toast({ title: editing ? 'Servicekonto aktualisiert' : 'Servicekonto angelegt' });
      setIsDialogOpen(false);
      refresh();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (item: ServiceAccount) => {
    const confirmed = window.confirm(`Servicekonto "${item.name}" wirklich löschen?`);
    if (!confirmed) return;

    const result = await deleteServiceAccountAction(item.id, dataSource, user?.email || 'system');
    if (result.success) {
      toast({ title: 'Servicekonto gelöscht' });
      refresh();
      return;
    }

    toast({ variant: 'destructive', title: 'Löschen fehlgeschlagen', description: result.error || 'Unbekannter Fehler.' });
  };

  const handleExport = async () => {
    await exportServiceAccountsExcel(filtered, resources || [], entitlements || [], tenants || []);
  };

  if (!mounted) return null;

  if (isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 py-40">
        <Loader2 className="w-12 h-12 animate-spin text-primary opacity-30" />
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Lade Servicekonten...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 pb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b pb-6">
        <div>
          <h1 className="text-2xl font-headline font-bold uppercase tracking-tight text-slate-900 dark:text-white">Servicekonten</h1>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">Technische Identitäten je Ressource dokumentieren</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="h-9 rounded-xl text-xs font-bold" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" /> Export
          </Button>
          <Button className="h-9 rounded-xl text-xs font-bold" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" /> Servicekonto
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Input placeholder="Suche nach Name, Owner, Ressource..." value={search} onChange={(e) => setSearch(e.target.value)} className="md:col-span-2" />
        <Select value={resourceFilter} onValueChange={setResourceFilter}>
          <SelectTrigger><SelectValue placeholder="Ressource" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Ressourcen</SelectItem>
            {visibleResources.map((res) => <SelectItem key={res.id} value={res.id}>{res.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={rotationFilter} onValueChange={(value: any) => setRotationFilter(value)}>
          <SelectTrigger><SelectValue placeholder="Rotation" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Rotationsstände</SelectItem>
            <SelectItem value="due">Fällig</SelectItem>
            <SelectItem value="ok">OK</SelectItem>
            <SelectItem value="none">Nicht geplant</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-2xl border overflow-hidden bg-white dark:bg-slate-900">
        <Table>
          <TableHeader className="bg-slate-50 dark:bg-slate-800">
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Ressource</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Rotation</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((item) => {
              const resourceName = resources?.find((res) => res.id === item.resourceId)?.name || item.resourceId;
              const rotationStatus = getRotationStatus(item);
              return (
                <TableRow key={item.id} className="cursor-pointer" onClick={() => router.push(`/service-accounts/${item.id}`)}>
                  <TableCell>
                    <div className="font-bold text-slate-900 dark:text-slate-100">{item.name}</div>
                    <div className="text-xs text-slate-500">{item.username || '---'}</div>
                  </TableCell>
                  <TableCell>{resourceName}</TableCell>
                  <TableCell>{item.owner || '---'}</TableCell>
                  <TableCell>
                    {rotationStatus === 'due' && <Badge className="bg-red-100 text-red-700"><Clock className="w-3 h-3 mr-1" /> Fällig</Badge>}
                    {rotationStatus === 'ok' && <Badge className="bg-emerald-100 text-emerald-700">OK</Badge>}
                    {rotationStatus === 'none' && <Badge variant="outline">Nicht geplant</Badge>}
                  </TableCell>
                  <TableCell>
                    <Badge variant={item.status === 'active' ? 'default' : 'secondary'}>{item.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2" onClick={(e) => e.stopPropagation()}>
                    <Button size="icon" variant="ghost" onClick={() => openEdit(item)}><Pencil className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => handleDelete(item)}><Trash2 className="w-4 h-4" /></Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-16 text-center text-slate-400">
                  <div className="flex flex-col items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    <span>Keine Servicekonten für die aktuelle Auswahl.</span>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Servicekonto bearbeiten' : 'Servicekonto anlegen'}</DialogTitle>
            <DialogDescription>Technische Identität dokumentieren und mit Rollen verknüpfen.</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. svc-backup-prod" />
            </div>
            <div className="space-y-2">
              <Label>Ressource</Label>
              <Select value={resourceId} onValueChange={setResourceId}>
                <SelectTrigger><SelectValue placeholder="Ressource wählen" /></SelectTrigger>
                <SelectContent>
                  {visibleResources.map((res) => <SelectItem key={res.id} value={res.id}>{res.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Benutzername</Label>
              <Input value={username} onChange={(e) => setUsername(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>System</Label>
              <Input value={system} onChange={(e) => setSystem(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Owner</Label>
              <Input value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="Technischer Owner" />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(value: ServiceAccount['status']) => setStatus(value)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">active</SelectItem>
                  <SelectItem value="disabled">disabled</SelectItem>
                  <SelectItem value="archived">archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Credential-Typ</Label>
              <Select value={credentialType} onValueChange={setCredentialType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="password">password</SelectItem>
                  <SelectItem value="token">token</SelectItem>
                  <SelectItem value="certificate">certificate</SelectItem>
                  <SelectItem value="key">key</SelectItem>
                  <SelectItem value="managed_identity">managed_identity</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Rotationsintervall (Tage)</Label>
              <Input type="number" min={0} value={rotationIntervalDays} onChange={(e) => setRotationIntervalDays(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Letzte Rotation</Label>
              <Input type="date" value={lastRotatedAt} onChange={(e) => setLastRotatedAt(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Gültig bis</Label>
              <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Zweck</Label>
            <Textarea value={purpose} onChange={(e) => setPurpose(e.target.value)} className="min-h-[80px]" />
          </div>

          <div className="space-y-2">
            <Label>Notizen</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="min-h-[80px]" />
          </div>

          <div className="space-y-2">
            <Label>Verknüpfte Rollen</Label>
            <div className="max-h-40 overflow-auto rounded-md border p-2 space-y-1">
              {visibleEntitlements.length === 0 && <p className="text-xs text-slate-400">Keine Rollen für diese Ressource verfügbar.</p>}
              {visibleEntitlements.map((role) => {
                const selected = entitlementIds.includes(role.id);
                return (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => toggleEntitlement(role.id)}
                    className={`w-full text-left px-2 py-1.5 rounded text-sm flex items-center justify-between ${selected ? 'bg-primary/10 text-primary' : 'hover:bg-slate-50'}`}
                  >
                    <span>{role.name}</span>
                    {selected && <KeyRound className="w-4 h-4" />}
                  </button>
                );
              })}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Abbrechen</Button>
            <Button onClick={handleSave} disabled={isSaving}>{isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}Speichern</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
