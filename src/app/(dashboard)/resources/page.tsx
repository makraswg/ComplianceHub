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
  X,
  AlertTriangle
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking, useUser, updateDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function ResourcesPage() {
  const db = useFirestore();
  const { user: authUser } = useUser();
  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState('');
  
  // Dialog States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEntitlementOpen, setIsEntitlementOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleteEntitlementOpen, setIsDeleteEntitlementOpen] = useState(false);
  
  const [selectedResource, setSelectedResource] = useState<any>(null);
  const [selectedEntitlement, setSelectedEntitlement] = useState<any>(null);

  // Resource Form State
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('SaaS');
  const [newOwner, setNewOwner] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newCriticality, setNewCriticality] = useState('medium');

  // Entitlement Form State
  const [editingEntitlementId, setEditingEntitlementId] = useState<string | null>(null);
  const [entName, setEntName] = useState('');
  const [entRisk, setEntRisk] = useState('medium');
  const [entDesc, setEntDesc] = useState('');

  const resourcesQuery = useMemoFirebase(() => collection(db, 'resources'), [db]);
  const entitlementsQuery = useMemoFirebase(() => collection(db, 'entitlements'), [db]);

  const { data: resources, isLoading } = useCollection(resourcesQuery);
  const { data: entitlements } = useCollection(entitlementsQuery);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleCreateResource = () => {
    if (!newName || !newOwner) {
      toast({ variant: "destructive", title: "Erforderlich", description: "Name und Besitzer sind erforderlich." });
      return;
    }

    addDocumentNonBlocking(collection(db, 'resources'), {
      name: newName,
      type: newType,
      owner: newOwner,
      url: newUrl,
      criticality: newCriticality,
      createdAt: new Date().toISOString()
    });
    
    setIsCreateOpen(false);
    toast({ title: "Ressource hinzugefügt" });
    setNewName('');
    setNewOwner('');
    setNewUrl('');
  };

  const handleAddOrUpdateEntitlement = () => {
    if (!entName || !selectedResource) return;

    const entData = {
      resourceId: selectedResource.id,
      name: entName,
      riskLevel: entRisk,
      description: entDesc,
    };

    if (editingEntitlementId) {
      updateDocumentNonBlocking(doc(db, 'entitlements', editingEntitlementId), entData);
      toast({ title: "Berechtigung aktualisiert" });
    } else {
      addDocumentNonBlocking(collection(db, 'entitlements'), entData);
      toast({ title: "Berechtigung hinzugefügt" });
    }

    resetEntitlementForm();
  };

  const resetEntitlementForm = () => {
    setEntName('');
    setEntDesc('');
    setEntRisk('medium');
    setEditingEntitlementId(null);
  };

  const confirmDeleteResource = () => {
    if (selectedResource) {
      deleteDocumentNonBlocking(doc(db, 'resources', selectedResource.id));
      toast({ title: "Ressource gelöscht" });
      setIsDeleteDialogOpen(false);
      setSelectedResource(null);
    }
  };

  const confirmDeleteEntitlement = () => {
    if (selectedEntitlement) {
      deleteDocumentNonBlocking(doc(db, 'entitlements', selectedEntitlement.id));
      toast({ title: "Berechtigung gelöscht" });
      setIsDeleteEntitlementOpen(false);
      setSelectedEntitlement(null);
    }
  };

  const filteredResources = resources?.filter(res => 
    res.name.toLowerCase().includes(search.toLowerCase()) ||
    res.owner.toLowerCase().includes(search.toLowerCase())
  );

  if (!mounted) return null;

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-500 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight">Ressourcenkatalog</h1>
          <p className="text-muted-foreground mt-1 font-medium italic">Zentrale Dokumentation aller autorisierten IT-Systeme.</p>
        </div>
        
        <Button 
          onClick={() => setIsCreateOpen(true)}
          className="bg-primary hover:bg-primary/90 gap-2 h-12 px-8 rounded-xl shadow-lg shadow-primary/30 font-bold transition-all"
        >
          <Plus className="w-5 h-5" /> Ressource registrieren
        </Button>
      </div>

      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
        <Input 
          placeholder="Ressourcen, Eigentümer oder IDs suchen..." 
          className="pl-12 h-14 bg-card border-none shadow-sm rounded-2xl focus-visible:ring-primary focus-visible:ring-2 transition-all font-medium"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="bg-card rounded-[2rem] border-none shadow-2xl overflow-hidden glass-card">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs">Inventar wird geladen...</p>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-accent/5">
              <TableRow className="hover:bg-transparent border-b-muted">
                <TableHead className="w-[350px] py-6 font-bold uppercase tracking-wider text-[10px] pl-8">Ressourcen-Details</TableHead>
                <TableHead className="font-bold uppercase tracking-wider text-[10px]">Typ</TableHead>
                <TableHead className="font-bold uppercase tracking-wider text-[10px]">Kritikalität</TableHead>
                <TableHead className="font-bold uppercase tracking-wider text-[10px]">Berechtigungen</TableHead>
                <TableHead className="text-right pr-8 font-bold uppercase tracking-wider text-[10px]">Management</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredResources?.map((resource) => {
                const resourceEnts = entitlements?.filter(e => e.resourceId === resource.id) || [];
                return (
                  <TableRow key={resource.id} className="group transition-all hover:bg-primary/5 border-b-muted/30">
                    <TableCell className="py-6 pl-8">
                      <div className="flex items-center gap-5">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform shadow-inner">
                          <Layers className="w-6 h-6" />
                        </div>
                        <div>
                          <div className="font-bold text-lg flex items-center gap-2">
                            {resource.name}
                            {resource.url && <a href={resource.url} target="_blank" className="text-muted-foreground hover:text-primary transition-colors"><ExternalLink className="w-4 h-4" /></a>}
                          </div>
                          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-tight mt-0.5">{resource.owner}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className="rounded-lg px-3 py-1 font-bold border-none bg-accent/10 text-accent" variant="outline">
                        {resource.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn(
                        "rounded-lg px-3 py-1 font-bold border-none shadow-sm uppercase tracking-tighter text-[10px]",
                        resource.criticality === 'high' ? "bg-red-500 text-white" : "bg-blue-500 text-white"
                      )}>
                        {resource.criticality}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-primary" />
                        <span className="font-bold text-sm">{resourceEnts.length} Rollen</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right pr-8">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="rounded-xl hover:bg-primary/10 hover:text-primary transition-colors">
                            <MoreHorizontal className="w-6 h-6" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2 shadow-2xl border-none glass-card">
                          <DropdownMenuItem className="rounded-xl p-3 font-bold" onSelect={(e) => {
                            e.preventDefault();
                            setSelectedResource(resource);
                            resetEntitlementForm();
                            setTimeout(() => setIsEntitlementOpen(true), 150);
                          }}>
                            <Shield className="w-4 h-4 mr-3 text-primary" /> Berechtigungen
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="rounded-xl p-3 font-bold text-destructive hover:bg-destructive/10" 
                            onSelect={(e) => {
                              e.preventDefault();
                              setSelectedResource(resource);
                              setTimeout(() => setIsDeleteDialogOpen(true), 150);
                            }}
                          >
                            <Trash2 className="w-4 h-4 mr-3" /> System löschen
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Create Resource Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="rounded-[2rem] border-none shadow-2xl glass-card">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold font-headline">System registrieren</DialogTitle>
            <DialogDescription className="font-medium">Erfassen Sie eine neue Ressource im Katalog.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-6">
            <div className="space-y-2">
              <Label className="font-bold text-xs uppercase tracking-widest text-muted-foreground ml-1">Anwendungsname</Label>
              <Input value={newName} onChange={e => setNewName(e.target.value)} className="h-12 rounded-xl bg-accent/5 border-none font-medium" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-bold text-xs uppercase tracking-widest text-muted-foreground ml-1">Typ</Label>
                <Select value={newType} onValueChange={setNewType}>
                  <SelectTrigger className="h-12 rounded-xl bg-accent/5 border-none font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-none shadow-2xl p-2">
                    <SelectItem value="SaaS" className="rounded-lg">Cloud / SaaS</SelectItem>
                    <SelectItem value="OnPrem" className="rounded-lg">On-Premises</SelectItem>
                    <SelectItem value="Tool" className="rounded-lg">Internes Tool</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-xs uppercase tracking-widest text-muted-foreground ml-1">Kritikalität</Label>
                <Select value={newCriticality} onValueChange={setNewCriticality}>
                  <SelectTrigger className="h-12 rounded-xl bg-accent/5 border-none font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-none shadow-2xl p-2">
                    <SelectItem value="low" className="rounded-lg">Niedrig (Standard)</SelectItem>
                    <SelectItem value="medium" className="rounded-lg">Mittel (Wichtig)</SelectItem>
                    <SelectItem value="high" className="rounded-lg">Hoch (Kritisch)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="font-bold text-xs uppercase tracking-widest text-muted-foreground ml-1">System-Besitzer</Label>
              <Input value={newOwner} onChange={e => setNewOwner(e.target.value)} className="h-12 rounded-xl bg-accent/5 border-none font-medium" placeholder="Abteilungsleiter oder Admin" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleCreateResource} className="w-full h-14 bg-primary rounded-xl font-bold text-lg shadow-lg shadow-primary/20">System speichern</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Resource Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="rounded-[2rem] border-none shadow-2xl glass-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-3 text-destructive text-2xl font-bold font-headline">
              <AlertTriangle className="w-8 h-8" /> System entfernen?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base font-medium leading-relaxed pt-4">
              Sind Sie sicher, dass Sie <strong>{selectedResource?.name}</strong> unwiderruflich löschen möchten? Alle Rollen und Berechtigungen gehen verloren.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-6">
            <AlertDialogCancel className="rounded-xl h-12 font-bold border-2">Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteResource} className="rounded-xl h-12 bg-destructive hover:bg-destructive/90 font-bold px-8">System endgültig löschen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Entitlement Management Dialog */}
      <Dialog open={isEntitlementOpen} onOpenChange={setIsEntitlementOpen}>
        <DialogContent className="sm:max-w-[700px] rounded-[2rem] border-none shadow-2xl glass-card overflow-hidden">
          <DialogHeader className="p-2">
            <DialogTitle className="text-2xl font-bold font-headline">Rollenmanagement: {selectedResource?.name}</DialogTitle>
            <DialogDescription className="font-medium">Definieren Sie Berechtigungsstufen für dieses System.</DialogDescription>
          </DialogHeader>
          <div className="space-y-8 p-2">
            <div className={cn(
              "space-y-6 p-6 rounded-[1.5rem] border-2 transition-all duration-500",
              editingEntitlementId ? "bg-primary/5 border-primary/30" : "bg-accent/5 border-accent/10"
            )}>
              <div className="flex items-center justify-between">
                <Label className="text-xs font-black uppercase tracking-widest text-primary">{editingEntitlementId ? "Rolle bearbeiten" : "Neue Rolle definieren"}</Label>
                {editingEntitlementId && (
                  <Button variant="ghost" size="sm" onClick={resetEntitlementForm} className="h-8 rounded-lg font-bold">
                    <X className="w-4 h-4 mr-2" /> Abbrechen
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="font-bold text-xs uppercase text-muted-foreground">Rollenname</Label>
                  <Input value={entName} onChange={e => setEntName(e.target.value)} placeholder="z.B. IT-Sicherheits-Admin" className="h-12 rounded-xl bg-white/50 border-none font-bold" />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-xs uppercase text-muted-foreground">Risikostufe</Label>
                  <Select value={entRisk} onValueChange={setEntRisk}>
                    <SelectTrigger className="h-12 rounded-xl bg-white/50 border-none font-bold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-none shadow-2xl">
                      <SelectItem value="low">Geringes Risiko</SelectItem>
                      <SelectItem value="medium">Mittel (Audit-relevant)</SelectItem>
                      <SelectItem value="high">Kritisch (Genehmigungspflichtig)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-xs uppercase text-muted-foreground">Berechtigungs-Scope (Optional)</Label>
                <Input value={entDesc} onChange={e => setEntDesc(e.target.value)} placeholder="Zweck dieser Rolle..." className="h-12 rounded-xl bg-white/50 border-none font-medium" />
              </div>
              <Button onClick={handleAddOrUpdateEntitlement} className="w-full h-14 rounded-xl font-black text-lg shadow-xl shadow-primary/10">
                {editingEntitlementId ? "Änderungen speichern" : "Rolle hinzufügen"}
              </Button>
            </div>

            <div className="space-y-4">
              <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Aktuell definierte Rollen</Label>
              <div className="grid grid-cols-1 gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {entitlements?.filter(e => e.resourceId === selectedResource?.id).map(e => (
                  <div key={e.id} className="p-4 flex items-center justify-between group rounded-[1.2rem] bg-card border-none shadow-sm hover:shadow-md hover:bg-primary/5 transition-all">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center shadow-inner",
                        e.riskLevel === 'high' ? "bg-red-500/10 text-red-500" : e.riskLevel === 'medium' ? "bg-orange-500/10 text-orange-500" : "bg-blue-500/10 text-blue-500"
                      )}>
                        <Shield className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-sm tracking-tight">{e.name}</p>
                        <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">{e.riskLevel} Risk • {e.description || 'Keine Notizen'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-10 w-10 rounded-lg hover:bg-primary/10 text-primary" onClick={() => {
                        setEditingEntitlementId(e.id);
                        setEntName(e.name);
                        setEntRisk(e.riskLevel);
                        setEntDesc(e.description || '');
                      }}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-10 w-10 rounded-lg hover:bg-destructive/10 text-destructive" onClick={() => {
                        setSelectedEntitlement(e);
                        setIsDeleteEntitlementOpen(true);
                      }}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Entitlement Confirmation */}
      <AlertDialog open={isDeleteEntitlementOpen} onOpenChange={setIsDeleteEntitlementOpen}>
        <AlertDialogContent className="rounded-[2rem] border-none shadow-2xl glass-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-bold font-headline">Rolle entfernen?</AlertDialogTitle>
            <AlertDialogDescription className="text-base font-medium leading-relaxed pt-4">
              Sind Sie sicher, dass Sie die Rolle <strong>{selectedEntitlement?.name}</strong> löschen möchten? Alle Benutzerzuweisungen für diese Rolle werden ebenfalls entfernt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-6">
            <AlertDialogCancel className="rounded-xl h-12 font-bold border-2" onClick={() => setSelectedEntitlement(null)}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteEntitlement} className="rounded-xl h-12 bg-destructive hover:bg-destructive/90 font-bold px-8">Rolle löschen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
