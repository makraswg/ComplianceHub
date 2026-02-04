
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
  Search, 
  RefreshCw,
  Plus,
  UserCircle,
  ShieldCheck,
  MoreHorizontal,
  Loader2,
  ShieldAlert,
  BrainCircuit,
  Info,
  X,
  Shield,
  Layers,
  CheckCircle2,
  AlertTriangle,
  History,
  Database,
  Globe,
  Trash2,
  Filter,
  Building2
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePluggableCollection } from '@/hooks/data/use-pluggable-collection';
import { 
  useFirestore, 
  setDocumentNonBlocking, 
  addDocumentNonBlocking, 
  deleteDocumentNonBlocking,
  useUser as useAuthUser 
} from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { getAccessAdvice } from '@/ai/flows/access-advisor-flow';
import { useSettings } from '@/context/settings-context';
import { saveCollectionRecord, deleteCollectionRecord } from '@/app/actions/mysql-actions';

export default function UsersPage() {
  const db = useFirestore();
  const router = useRouter();
  const { dataSource, activeTenantId } = useSettings();
  const { user: authUser } = useAuthUser();
  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isAdvisorOpen, setIsAdvisorOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isAdvisorLoading, setIsAdvisorLoading] = useState(false);
  const [aiAdvice, setAiAdvice] = useState<any>(null);

  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'disabled'>('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'ldap' | 'manual'>('all');

  const [newDisplayName, setNewDisplayName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newDepartment, setNewDepartment] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newTenantId, setNewTenantId] = useState<'t1' | 't2'>('t1');

  const { data: users, isLoading, refresh: refreshUsers } = usePluggableCollection<any>('users');
  const { data: assignments } = usePluggableCollection<any>('assignments');
  const { data: entitlements } = usePluggableCollection<any>('entitlements');
  const { data: resources } = usePluggableCollection<any>('resources');
  const { data: auditLogs } = usePluggableCollection<any>('auditEvents');

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleAddUser = async () => {
    if (!newDisplayName || !newEmail) {
      toast({ variant: "destructive", title: "Fehler", description: "Name und E-Mail sind erforderlich." });
      return;
    }
    
    const userId = `u-${Math.random().toString(36).substring(2, 9)}`;
    const timestamp = new Date().toISOString();
    const userData = {
      id: userId,
      externalId: `MANUAL_${userId}`,
      displayName: newDisplayName,
      email: newEmail,
      department: newDepartment,
      title: newTitle,
      enabled: true,
      lastSyncedAt: timestamp,
      tenantId: newTenantId
    };

    const auditData = {
      id: `audit-${Math.random().toString(36).substring(2, 9)}`,
      actorUid: authUser?.uid || 'system',
      action: `Benutzer manuell angelegt (Firma: ${newTenantId})`,
      entityType: 'user',
      entityId: userId,
      timestamp,
      tenantId: newTenantId
    };

    if (dataSource === 'mysql') {
      await saveCollectionRecord('users', userId, userData);
      await saveCollectionRecord('auditEvents', auditData.id, auditData);
    } else {
      setDocumentNonBlocking(doc(db, 'users', userId), userData);
      addDocumentNonBlocking(collection(db, 'auditEvents'), auditData);
    }
    
    setIsAddOpen(false);
    toast({ title: "Benutzer hinzugefügt", description: `${newDisplayName} wurde registriert.` });
    resetForm();
    setTimeout(() => refreshUsers(), 200);
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    const timestamp = new Date().toISOString();
    const auditData = {
      id: `audit-${Math.random().toString(36).substring(2, 9)}`,
      actorUid: authUser?.uid || 'system',
      action: 'Benutzer gelöscht',
      entityType: 'user',
      entityId: selectedUser.id,
      timestamp,
      tenantId: selectedUser.tenantId
    };

    if (dataSource === 'mysql') {
      await deleteCollectionRecord('users', selectedUser.id);
      await saveCollectionRecord('auditEvents', auditData.id, auditData);
    } else {
      deleteDocumentNonBlocking(doc(db, 'users', selectedUser.id));
      addDocumentNonBlocking(collection(db, 'auditEvents'), auditData);
    }

    toast({ title: "Benutzer entfernt" });
    setIsDeleteAlertOpen(false);
    setTimeout(() => refreshUsers(), 200);
  };

  const resetForm = () => {
    setNewDisplayName('');
    setNewEmail('');
    setNewDepartment('');
    setNewTitle('');
    setNewTenantId('t1');
  };

  const filteredUsers = users?.filter((user: any) => {
    const displayName = user.name || user.displayName || '';
    const email = user.email || '';
    const dept = user.department || '';
    
    const matchesSearch = 
      displayName.toLowerCase().includes(search.toLowerCase()) ||
      email.toLowerCase().includes(search.toLowerCase()) ||
      dept.toLowerCase().includes(search.toLowerCase());

    const isEnabled = user.enabled === true || user.enabled === 1 || user.enabled === "1";
    const matchesStatus = 
      activeFilter === 'all' || 
      (activeFilter === 'active' && isEnabled) || 
      (activeFilter === 'disabled' && !isEnabled);

    const matchesTenant = activeTenantId === 'all' || user.tenantId === activeTenantId;

    return matchesSearch && matchesStatus && matchesTenant;
  });

  if (!mounted) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight font-headline">Benutzerverzeichnis</h1>
          <p className="text-sm text-muted-foreground">Verwaltung von Identitäten für {activeTenantId === 'all' ? 'alle Firmen' : (activeTenantId === 't1' ? 'Acme Corp' : 'Global Tech')}.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-9 font-bold uppercase text-[10px] rounded-none" onClick={() => { setIsSyncing(true); setTimeout(() => { setIsSyncing(false); refreshUsers(); }, 1500); }} disabled={isSyncing}>
            <RefreshCw className={cn("w-3 h-3 mr-2", isSyncing && "animate-spin")} /> LDAP Sync
          </Button>
          <Button size="sm" className="h-9 font-bold uppercase text-[10px] rounded-none" onClick={() => setIsAddOpen(true)}>
            <Plus className="w-3 h-3 mr-2" /> Benutzer anlegen
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Suche nach Name, E-Mail oder Abteilung..." 
            className="pl-10 h-10 rounded-none shadow-none border-border bg-white"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex border rounded-none p-1 bg-muted/20">
          <Button 
            variant={activeFilter === 'all' ? 'default' : 'ghost'} 
            size="sm" 
            className="h-8 text-[9px] font-bold uppercase px-4 rounded-none"
            onClick={() => setActiveFilter('all')}
          >Alle</Button>
          <Button 
            variant={activeFilter === 'active' ? 'default' : 'ghost'} 
            size="sm" 
            className="h-8 text-[9px] font-bold uppercase px-4 rounded-none"
            onClick={() => setActiveFilter('active')}
          >Aktiv</Button>
          <Button 
            variant={activeFilter === 'disabled' ? 'default' : 'ghost'} 
            size="sm" 
            className="h-8 text-[9px] font-bold uppercase px-4 rounded-none"
            onClick={() => setActiveFilter('disabled')}
          >Deaktiviert</Button>
        </div>
      </div>

      <div className="admin-card overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest">Identitäten werden geladen...</p>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="hover:bg-transparent">
                <TableHead className="py-4 font-bold uppercase tracking-widest text-[10px]">Identität</TableHead>
                <TableHead className="font-bold uppercase tracking-widest text-[10px]">Firma</TableHead>
                <TableHead className="font-bold uppercase tracking-widest text-[10px]">Abteilung</TableHead>
                <TableHead className="font-bold uppercase tracking-widest text-[10px]">Status</TableHead>
                <TableHead className="text-right font-bold uppercase tracking-widest text-[10px]">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers?.map((user: any) => {
                const displayName = user.name || user.displayName;
                const isEnabled = user.enabled === true || user.enabled === 1 || user.enabled === "1";
                
                return (
                  <TableRow key={user.id} className="group transition-colors hover:bg-muted/5 border-b">
                    <TableCell className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-none bg-slate-100 flex items-center justify-center text-slate-500 font-bold uppercase text-xs">
                          {displayName.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-sm">{displayName}</div>
                          <div className="text-[10px] text-muted-foreground font-mono">{user.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[8px] font-bold uppercase rounded-none border-slate-200">
                        {user.tenantId === 't1' ? 'Acme Corp' : 'Global Tech'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-bold text-xs">{user.department || '—'}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn(
                        "text-[9px] font-bold uppercase rounded-none border-none px-2", 
                        isEnabled ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                      )}>
                        {isEnabled ? "AKTIV" : "DEAKTIVIERT"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none hover:bg-muted">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 rounded-none p-1 shadow-xl border border-border">
                          <DropdownMenuItem onSelect={() => { setSelectedUser(user); setIsProfileOpen(true); }}>
                            <UserCircle className="w-3.5 h-3.5 mr-2" /> Profil & Log
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => router.push(`/assignments?search=${displayName}`)}>
                            <ShieldCheck className="w-3.5 h-3.5 mr-2" /> Zugriffe
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600" onSelect={() => { setSelectedUser(user); setIsDeleteAlertOpen(true); }}>
                            <Trash2 className="w-3.5 h-3.5 mr-2" /> Löschen
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

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="rounded-none border shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold uppercase">Benutzer anlegen</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase">Firma / Mandant</Label>
              <Select value={newTenantId} onValueChange={(val: any) => setNewTenantId(val)}>
                <SelectTrigger className="rounded-none"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-none">
                  <SelectItem value="t1">Acme Corp</SelectItem>
                  <SelectItem value="t2">Global Tech</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase">Name</Label>
              <Input value={newDisplayName} onChange={e => setNewDisplayName(e.target.value)} className="rounded-none h-10" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase">E-Mail</Label>
              <Input value={newEmail} onChange={e => setNewEmail(e.target.value)} className="rounded-none h-10" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)} className="rounded-none">Abbrechen</Button>
            <Button onClick={handleAddUser} className="rounded-none font-bold uppercase text-[10px]">Registrieren</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
