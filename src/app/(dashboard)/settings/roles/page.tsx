
"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  Plus, 
  Trash2, 
  Save, 
  Loader2, 
  Settings2,
  Lock,
  Eye,
  Edit3,
  X,
  FileCheck,
  BrainCircuit,
  Activity,
  Layers,
  FileStack,
  ScrollText,
  Users,
  Target,
  ListFilter,
  ClipboardList,
  Fingerprint,
  Workflow
} from 'lucide-react';
import { usePluggableCollection } from '@/hooks/data/use-pluggable-collection';
import { useSettings } from '@/context/settings-context';
import { saveCollectionRecord, deleteCollectionRecord } from '@/app/actions/mysql-actions';
import { PlatformRole } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function PlatformRolesPage() {
  const { dataSource } = useSettings();
  const [isSaving, setIsSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<PlatformRole | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [perms, setPermissions] = useState<PlatformRole['permissions']>({
    users: 'read',
    roles: 'none',
    groups: 'none',
    risks: 'none',
    measures: 'none',
    controls: 'none',
    processhub: 'none',
    features: 'none',
    gdpr: 'none',
    policies: 'none',
    settings: 'none',
    audit: 'none',
    media: 'none'
  });

  const { data: roles, refresh: refreshRoles, isLoading } = usePluggableCollection<PlatformRole>('platformRoles');

  const handleSave = async () => {
    if (!name) return;
    setIsSaving(true);
    const id = selectedRole?.id || `role-${Math.random().toString(36).substring(2, 9)}`;
    const roleData: PlatformRole = {
      id,
      name,
      description,
      permissions: perms
    };

    try {
      const res = await saveCollectionRecord('platformRoles', id, roleData, dataSource);
      if (res.success) {
        toast({ title: "Rolle gespeichert" });
        setIsDialogOpen(false);
        refreshRoles();
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if(!confirm("Rolle permanent löschen?")) return;
    try {
      const res = await deleteCollectionRecord('platformRoles', id, dataSource);
      if (res.success) {
        toast({ title: "Rolle entfernt" });
        refreshRoles();
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Fehler", description: e.message });
    }
  };

  const openEdit = (role: PlatformRole) => {
    setSelectedRole(role);
    setName(role.name);
    setDescription(role.description || '');
    setPermissions(role.permissions || {
      users: 'read', roles: 'none', groups: 'none', risks: 'none', measures: 'none', controls: 'none', processhub: 'none', features: 'none', gdpr: 'none', policies: 'none', settings: 'none', audit: 'none', media: 'none'
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setSelectedRole(null);
    setName('');
    setDescription('');
    setPermissions({
      users: 'read', roles: 'none', groups: 'none', risks: 'none', measures: 'none', controls: 'none', processhub: 'none', features: 'none', gdpr: 'none', policies: 'none', settings: 'none', audit: 'none', media: 'none'
    });
  };

  const PermSelector = ({ label, icon: Icon, value, onChange }: any) => (
    <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 border rounded-lg hover:border-primary/30 transition-all shadow-sm">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 border border-slate-200 dark:border-slate-700">
          <Icon className="w-4 h-4" />
        </div>
        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{label}</span>
      </div>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-[120px] h-8 text-[10px] font-bold">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none" className="text-xs">Kein Zugriff</SelectItem>
          <SelectItem value="read" className="text-xs">Nur Lesen</SelectItem>
          <SelectItem value="write" className="text-xs">Vollzugriff</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-500/10 text-indigo-600 flex items-center justify-center rounded-xl border border-indigo-100 shadow-sm">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-headline font-bold text-slate-900 dark:text-white uppercase">Plattform-Rollen</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Berechtigungsprofile für den Zugriff auf Plattform-Module.</p>
          </div>
        </div>
        <Button size="sm" className="h-9 font-bold text-xs gap-2" onClick={() => { resetForm(); setIsDialogOpen(true); }}>
          <Plus className="w-3.5 h-3.5" /> Neue Rolle
        </Button>
      </div>

      <Card className="rounded-xl border shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/50 dark:bg-slate-950/30">
              <TableRow className="hover:bg-transparent border-slate-100 dark:border-slate-800">
                <TableHead className="py-4 px-6 font-bold text-[11px] text-slate-400">Rollenbezeichnung</TableHead>
                <TableHead className="font-bold text-[11px] text-slate-400 text-center">IAM</TableHead>
                <TableHead className="font-bold text-[11px] text-slate-400 text-center">Risiko</TableHead>
                <TableHead className="font-bold text-[11px] text-slate-400 text-center">Policies</TableHead>
                <TableHead className="text-right px-6 font-bold text-[11px] text-slate-400">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles?.map(r => (
                <TableRow key={r.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 border-slate-100 dark:border-slate-800 transition-colors">
                  <TableCell className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 font-bold border border-indigo-100 shadow-inner">
                        <Shield className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-sm text-slate-800 dark:text-slate-100">{r.name}</div>
                        <div className="text-[10px] text-slate-400 font-medium truncate max-w-[200px]">{r.description}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className={cn("text-[8px] font-bold h-5", r.permissions?.users === 'write' ? "bg-emerald-50 text-emerald-600 border-none" : "bg-slate-50 text-slate-400 border-none")}>{r.permissions?.users || 'none'}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className={cn("text-[8px] font-bold h-5", r.permissions?.risks === 'write' ? "bg-emerald-50 text-emerald-600 border-none" : "bg-slate-50 text-slate-400 border-none")}>{r.permissions?.risks}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className={cn("text-[8px] font-bold h-5", r.permissions?.policies === 'write' ? "bg-indigo-50 text-indigo-600 border-none" : "bg-slate-50 text-slate-400 border-none")}>{r.permissions?.policies || 'none'}</Badge>
                  </TableCell>
                  <TableCell className="text-right px-6">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-slate-400 hover:text-primary opacity-0 group-hover:opacity-100 transition-all" onClick={() => openEdit(r)}>
                        <Edit3 className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-all" onClick={() => handleDelete(r.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl w-[95vw] rounded-xl p-0 overflow-hidden flex flex-col shadow-2xl bg-white dark:bg-slate-950">
          <DialogHeader className="p-6 bg-slate-800 text-white shrink-0">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                <Lock className="w-5 h-5" />
              </div>
              <DialogTitle className="text-lg font-bold text-white">Berechtigungsprofil</DialogTitle>
            </div>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh]">
            <div className="p-6 space-y-8">
              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2">
                  <Label className="text-[11px] font-bold text-slate-400">Rollenbezeichnung</Label>
                  <Input value={name} onChange={e => setName(e.target.value)} className="rounded-md h-11 border-slate-200 dark:border-slate-800" placeholder="z.B. Compliance-Officer" />
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <h3 className="text-[11px] font-black uppercase text-primary border-b pb-2 flex items-center gap-2">
                    <Users className="w-3.5 h-3.5" /> AccessHub (Identitäten)
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <PermSelector label="Benutzerverzeichnis" icon={Fingerprint} value={perms.users} onChange={(v: any) => setPermissions({...perms, users: v})} />
                    <PermSelector label="Rollenverwaltung" icon={ShieldCheck} value={perms.roles} onChange={(v: any) => setPermissions({...perms, roles: v})} />
                    <PermSelector label="Gruppen & Sync" icon={Workflow} value={perms.groups} onChange={(v: any) => setPermissions({...perms, groups: v})} />
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-[11px] font-black uppercase text-accent border-b pb-2 flex items-center gap-2">
                    <Target className="w-3.5 h-3.5" /> RiskHub (Risikomanagement)
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <PermSelector label="Risikoinventar" icon={AlertTriangle} value={perms.risks} onChange={(v: any) => setPermissions({...perms, risks: v})} />
                    <PermSelector label="Maßnahmenplan" icon={ClipboardList} value={perms.measures} onChange={(v: any) => setPermissions({...perms, measures: v})} />
                    <PermSelector label="Kontroll-Monitoring" icon={ShieldCheck} value={perms.controls} onChange={(v: any) => setPermissions({...perms, controls: v})} />
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-[11px] font-black uppercase text-emerald-600 border-b pb-2 flex items-center gap-2">
                    <Workflow className="w-3.5 h-3.5" /> WorkflowHub & Dokumente
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <PermSelector label="Prozessübersicht" icon={Layers} value={perms.processhub} onChange={(v: any) => setPermissions({...perms, processhub: v})} />
                    <PermSelector label="Datenmanagement" icon={ListFilter} value={perms.features} onChange={(v: any) => setPermissions({...perms, features: v})} />
                    <PermSelector label="VVT & DSGVO" icon={FileCheck} value={perms.gdpr} onChange={(v: any) => setPermissions({...perms, gdpr: v})} />
                    <PermSelector label="Richtlinien-Register" icon={ScrollText} value={perms.policies} onChange={(v: any) => setPermissions({...perms, policies: v})} />
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-[11px] font-black uppercase text-slate-400 border-b pb-2">System & Infrastruktur</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <PermSelector label="Medienverwaltung" icon={FileStack} value={perms.media} onChange={(v: any) => setPermissions({...perms, media: v})} />
                    <PermSelector label="Systemeinstellungen" icon={Settings2} value={perms.settings} onChange={(v: any) => setPermissions({...perms, settings: v})} />
                    <PermSelector label="Audit & Protokoll" icon={BrainCircuit} value={perms.audit} onChange={(v: any) => setPermissions({...perms, audit: v})} />
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="p-4 bg-slate-50 dark:bg-slate-900 border-t flex flex-col sm:flex-row gap-2">
            <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>Abbrechen</Button>
            <Button onClick={handleSave} disabled={isSaving} className="px-8 bg-primary text-white font-bold text-[11px] gap-2 shadow-lg">
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
