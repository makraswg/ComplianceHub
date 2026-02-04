
"use client";

import { useState, useEffect, useMemo } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Plus, 
  Search, 
  MoreHorizontal, 
  ExternalLink,
  Shield,
  Layers,
  Loader2,
  Trash2,
  Pencil,
  AlertTriangle,
  FileText,
  Info,
  Key,
  Users,
  Layout,
  CornerDownRight,
  HelpCircle,
  Box,
  RefreshCw,
  ShieldAlert,
  Building2,
  Globe,
  Network
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
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
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePluggableCollection } from '@/hooks/data/use-pluggable-collection';
import { 
  useFirestore, 
  deleteDocumentNonBlocking, 
  setDocumentNonBlocking,
  addDocumentNonBlocking,
  useUser as useAuthUser
} from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { exportResourcesPdf } from '@/lib/export-utils';
import { useSettings } from '@/context/settings-context';
import { saveCollectionRecord, deleteCollectionRecord } from '@/app/actions/mysql-actions';
import { Entitlement } from '@/lib/types';

export default function ResourcesPage() {
  const db = useFirestore();
  const { dataSource, activeTenantId } = useSettings();
  const { user: authUser } = useAuthUser();
  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState('');
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEntitlementOpen, setIsEntitlementOpen] = useState(false);
  const [selectedResource, setSelectedResource] = useState<any>(null);
  const [editingResource, setEditingResource] = useState<any>(null);

  // Entitlement Management State
  const [editingEntitlement, setEditingEntitlement] = useState<Entitlement | null>(null);
  const [isEntitlementEditOpen, setIsEntitlementEditOpen] = useState(false);
  const [entName, setEntName] = useState('');
  const [entDesc, setEntDesc] = useState('');
  const [entRisk, setEntRisk] = useState<'low' | 'medium' | 'high'>('medium');
  const [entIsAdmin, setEntIsAdmin] = useState(false);
  const [entExternalMapping, setEntExternalMapping] = useState('');

  const { data: resources, isLoading, refresh: refreshResources } = usePluggableCollection<any>('resources');
  const { data: entitlements, refresh: refreshEntitlements } = usePluggableCollection<any>('entitlements');

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSaveEntitlement = async () => {
    if (!entName || !selectedResource) return;

    const id = editingEntitlement?.id || `ent-${Math.random().toString(36).substring(2, 9)}`;
    const entData = {
      id,
      resourceId: selectedResource.id,
      tenantId: selectedResource.tenantId || 'global',
      name: entName,
      description: entDesc,
      riskLevel: entRisk,
      isAdmin: entIsAdmin,
      externalMapping: entExternalMapping
    };

    if (dataSource === 'mysql') {
      await saveCollectionRecord('entitlements', id, entData);
    } else {
      setDocumentNonBlocking(doc(db, 'entitlements', id), entData);
    }

    toast({ title: editingEntitlement ? "Rolle aktualisiert" : "Rolle erstellt" });
    setIsEntitlementEditOpen(false);
    setEditingEntitlement(null);
    setTimeout(() => refreshEntitlements(), 200);
  };

  const openEntitlementDialog = (ent?: Entitlement) => {
    if (ent) {
      setEditingEntitlement(ent);
      setEntName(ent.name);
      setEntDesc(ent.description);
      setEntRisk(ent.riskLevel);
      setEntIsAdmin(!!ent.isAdmin);
      setEntExternalMapping(ent.externalMapping || '');
    } else {
      setEditingEntitlement(null);
      setEntName('');
      setEntDesc('');
      setEntRisk('medium');
      setEntIsAdmin(false);
      setEntExternalMapping('');
    }
    setIsEntitlementEditOpen(true);
  };

  const filteredResources = resources?.filter((res: any) => {
    const matchesSearch = res.name.toLowerCase().includes(search.toLowerCase()) || (res.owner || '').toLowerCase().includes(search.toLowerCase());
    const isGlobal = res.tenantId === 'global' || !res.tenantId;
    const matchesTenant = activeTenantId === 'all' || isGlobal || res.tenantId === activeTenantId;
    return matchesSearch && matchesTenant;
  });

  if (!mounted) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ressourcenkatalog</h1>
          <p className="text-sm text-muted-foreground">Systeminventar und AD-Gruppen Mapping.</p>
        </div>
        <Button size="sm" className="h-9 font-bold uppercase text-[10px] rounded-none" onClick={() => setIsCreateOpen(true)}>
          <Plus className="w-3.5 h-3.5 mr-2" /> System registrieren
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input 
          placeholder="Suchen..." 
          className="pl-10 h-10 rounded-none shadow-none border-border"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="admin-card overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : (
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="py-4 font-bold uppercase text-[10px]">Anwendung</TableHead>
                <TableHead className="font-bold uppercase text-[10px]">Verfügbarkeit</TableHead>
                <TableHead className="font-bold uppercase text-[10px]">Rollen / AD Mapping</TableHead>
                <TableHead className="text-right font-bold uppercase text-[10px]">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredResources?.map((resource: any) => {
                const resourceEnts = entitlements?.filter(e => e.resourceId === resource.id) || [];
                return (
                  <TableRow key={resource.id} className="group hover:bg-muted/5 border-b">
                    <TableCell className="py-4">
                      <div className="font-bold text-sm">{resource.name}</div>
                      <div className="text-[10px] text-muted-foreground font-bold uppercase">{resource.type}</div>
                    </TableCell>
                    <TableCell>
                      {(!resource.tenantId || resource.tenantId === 'global') ? (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 rounded-none border-blue-100 text-[8px] font-bold uppercase">Global</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-slate-50 text-slate-700 rounded-none border-slate-200 text-[8px] font-bold uppercase">{resource.tenantId}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {resourceEnts.map(e => (
                          <Badge key={e.id} variant="secondary" className="rounded-none text-[8px] uppercase gap-1">
                            {e.isAdmin && <ShieldAlert className="w-2.5 h-2.5 text-red-600" />}
                            {e.name}
                            {e.externalMapping && <Network className="w-2.5 h-2.5 text-blue-600" />}
                          </Badge>
                        ))}
                        {resourceEnts.length === 0 && <span className="text-[10px] italic text-muted-foreground">Keine Rollen</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="h-8 text-[9px] font-bold uppercase" onClick={() => { setSelectedResource(resource); setIsEntitlementOpen(true); }}>Rollen verwalten</Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Role Management Dialog */}
      <Dialog open={isEntitlementOpen} onOpenChange={setIsEntitlementOpen}>
        <DialogContent className="max-w-4xl rounded-none">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold uppercase">Rollen für {selectedResource?.name}</DialogTitle>
            <DialogDescription className="text-xs">Definieren Sie Berechtigungen und deren AD-Gruppen Mapping.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Button size="sm" className="mb-4 h-8 text-[9px] font-bold uppercase rounded-none" onClick={() => openEntitlementDialog()}>
              <Plus className="w-3 h-3 mr-1" /> Neue Rolle
            </Button>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[10px] font-bold uppercase">Name</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase">AD Mapping (DN)</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase">Risiko</TableHead>
                  <TableHead className="text-right text-[10px] font-bold uppercase">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entitlements?.filter(e => e.resourceId === selectedResource?.id).map(e => (
                  <TableRow key={e.id}>
                    <TableCell className="font-bold text-xs">
                      <div className="flex items-center gap-2">
                        {e.isAdmin && <ShieldAlert className="w-3.5 h-3.5 text-red-600" />}
                        {e.name}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-[9px] text-muted-foreground truncate max-w-[200px]">{e.externalMapping || '—'}</TableCell>
                    <TableCell><Badge className="text-[8px] uppercase rounded-none">{e.riskLevel}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEntitlementDialog(e)}><Pencil className="w-3 h-3" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      {/* Role Edit/Create Dialog */}
      <Dialog open={isEntitlementEditOpen} onOpenChange={setIsEntitlementEditOpen}>
        <DialogContent className="rounded-none">
          <DialogHeader><DialogTitle className="text-sm font-bold uppercase">{editingEntitlement ? 'Rolle bearbeiten' : 'Neue Rolle'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase">Name der Rolle</Label>
              <Input value={entName} onChange={e => setEntName(e.target.value)} className="rounded-none h-10" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase text-blue-600 flex items-center gap-2">
                <Network className="w-3 h-3" /> AD Gruppe (Distinguished Name)
              </Label>
              <Input 
                placeholder="CN=Gruppe,OU=Roles,DC=..." 
                value={entExternalMapping} 
                onChange={e => setEntExternalMapping(e.target.value)} 
                className="rounded-none h-10 font-mono text-[10px]" 
              />
              <p className="text-[9px] text-muted-foreground italic">Mitglieder dieser AD-Gruppe werden beim Sync automatisch zugewiesen.</p>
            </div>
            <div className="flex items-center gap-4 pt-2">
              <div className="flex items-center space-x-2">
                <Checkbox id="is-admin" checked={entIsAdmin} onCheckedChange={(val) => setEntIsAdmin(!!val)} />
                <Label htmlFor="is-admin" className="text-[10px] font-bold uppercase cursor-pointer text-red-600">Admin-Berechtigung</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEntitlementEditOpen(false)} className="rounded-none">Abbrechen</Button>
            <Button onClick={handleSaveEntitlement} className="rounded-none font-bold uppercase text-[10px]">Speichern</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
