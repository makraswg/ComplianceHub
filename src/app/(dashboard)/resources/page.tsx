
"use client";

import { useState, useEffect } from 'react';
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
  Globe
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

export default function ResourcesPage() {
  const db = useFirestore();
  const { dataSource, activeTenantId } = useSettings();
  const { user: authUser } = useAuthUser();
  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState('');
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEntitlementOpen, setIsEntitlementOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedResource, setSelectedResource] = useState<any>(null);
  const [editingResource, setEditingResource] = useState<any>(null);

  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('SaaS');
  const [newOwner, setNewOwner] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newCriticality, setNewCriticality] = useState('medium');
  const [newResourceTenantId, setNewResourceTenantId] = useState<string>('global');

  const { data: resources, isLoading, refresh: refreshResources } = usePluggableCollection<any>('resources');
  const { data: entitlements, refresh: refreshEntitlements } = usePluggableCollection<any>('entitlements');

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSaveResource = async () => {
    if (!newName || !newOwner) {
      toast({ variant: "destructive", title: "Fehler", description: "Name und Besitzer sind erforderlich." });
      return;
    }

    const resourceId = editingResource?.id || `res-${Math.random().toString(36).substring(2, 9)}`;
    const resData = {
      id: resourceId,
      name: newName,
      type: newType,
      owner: newOwner,
      url: newUrl,
      criticality: newCriticality,
      tenantId: newResourceTenantId,
      createdAt: editingResource?.createdAt || new Date().toISOString()
    };

    if (dataSource === 'mysql') {
      await saveCollectionRecord('resources', resourceId, resData);
    } else {
      setDocumentNonBlocking(doc(db, 'resources', resourceId), resData);
    }

    toast({ title: editingResource ? "System aktualisiert" : "System registriert" });
    setIsCreateOpen(false);
    resetResourceForm();
    setTimeout(() => refreshResources(), 200);
  };

  const resetResourceForm = () => {
    setNewName('');
    setNewOwner('');
    setNewUrl('');
    setNewType('SaaS');
    setNewCriticality('medium');
    setNewResourceTenantId('global');
    setEditingResource(null);
  };

  const filteredResources = resources?.filter((res: any) => {
    const matchesSearch = res.name.toLowerCase().includes(search.toLowerCase()) || (res.owner || '').toLowerCase().includes(search.toLowerCase());
    
    // Filter Logik: Zeige Global + spezifischen Mandanten
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
          <p className="text-sm text-muted-foreground">Systeminventar für {activeTenantId === 'all' ? 'alle Standorte' : (activeTenantId === 't1' ? 'Acme Corp' : 'Global Tech')}.</p>
        </div>
        <Button size="sm" className="h-9 font-bold uppercase text-[10px] rounded-none" onClick={() => { resetResourceForm(); setIsCreateOpen(true); }}>
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
                <TableHead className="font-bold uppercase text-[10px]">Typ</TableHead>
                <TableHead className="font-bold uppercase text-[10px]">Kritikalität</TableHead>
                <TableHead className="text-right font-bold uppercase text-[10px]">Management</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredResources?.map((resource: any) => (
                <TableRow key={resource.id} className="group hover:bg-muted/5 border-b">
                  <TableCell className="py-4">
                    <div className="font-bold text-sm">{resource.name}</div>
                    <div className="text-[10px] text-muted-foreground font-bold uppercase">{resource.owner}</div>
                  </TableCell>
                  <TableCell>
                    {(!resource.tenantId || resource.tenantId === 'global') ? (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 rounded-none border-blue-100 text-[8px] font-bold uppercase">
                        <Globe className="w-2.5 h-2.5 mr-1" /> Global
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-slate-50 text-slate-700 rounded-none border-slate-200 text-[8px] font-bold uppercase">
                        <Building2 className="w-2.5 h-2.5 mr-1" /> {resource.tenantId === 't1' ? 'Acme Corp' : 'Global Tech'}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[9px] uppercase font-bold py-0 rounded-none">{resource.type}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={cn("rounded-none text-[9px] border-none", resource.criticality === 'high' ? "bg-red-500 text-white" : "bg-blue-600 text-white")}>
                      {resource.criticality.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="w-5 h-5" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-none w-48">
                        <DropdownMenuItem onSelect={() => { setEditingResource(resource); setNewName(resource.name); setNewType(resource.type); setNewOwner(resource.owner); setNewResourceTenantId(resource.tenantId || 'global'); setIsCreateOpen(true); }}>
                          Bearbeiten
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => { setSelectedResource(resource); setIsEntitlementOpen(true); }}>
                          Rollen verwalten
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="rounded-none border shadow-2xl">
          <DialogHeader><DialogTitle className="text-sm font-bold uppercase">System registrieren</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 gap-4 py-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase">Gültigkeitsbereich (Firma)</Label>
              <Select value={newResourceTenantId} onValueChange={setNewResourceTenantId}>
                <SelectTrigger className="rounded-none h-10"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-none">
                  <SelectItem value="global">Global (Für alle verfügbar)</SelectItem>
                  <SelectItem value="t1">Nur Acme Corp</SelectItem>
                  <SelectItem value="t2">Nur Global Tech</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase">Anwendungsname</Label>
              <Input value={newName} onChange={e => setNewName(e.target.value)} className="rounded-none" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase">Typ</Label>
                <Select value={newType} onValueChange={setNewType}>
                  <SelectTrigger className="rounded-none"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-none">
                    <SelectItem value="SaaS">SaaS</SelectItem>
                    <SelectItem value="OnPrem">On-Prem</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase">Besitzer</Label>
                <Input value={newOwner} onChange={e => setNewOwner(e.target.value)} className="rounded-none" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)} className="rounded-none">Abbrechen</Button>
            <Button onClick={handleSaveResource} className="rounded-none font-bold uppercase text-[10px]">Speichern</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
