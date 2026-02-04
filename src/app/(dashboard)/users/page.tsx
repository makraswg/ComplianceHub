
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
  Building2,
  Network
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
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'disabled'>('all');

  const { data: users, isLoading, refresh: refreshUsers } = usePluggableCollection<any>('users');
  const { data: entitlements } = usePluggableCollection<any>('entitlements');
  const { data: assignments, refresh: refreshAssignments } = usePluggableCollection<any>('assignments');

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLdapSync = async () => {
    setIsSyncing(true);
    const timestamp = new Date().toISOString();
    
    try {
      // 1. Get all entitlements that have an external mapping
      const mappedEntitlements = entitlements?.filter(e => !!e.externalMapping) || [];
      
      // 2. Process each user (Mock logic representing AD Sync)
      for (const user of (users || [])) {
        // Simulating that users in AD have a list of group DNs
        // In a real scenario, this would come from the LDAP query results
        const mockAdGroups = user.adGroups || []; 
        
        for (const ent of mappedEntitlements) {
          const hasGroup = mockAdGroups.includes(ent.externalMapping!);
          const existingAssignment = assignments?.find(a => a.userId === user.id && a.entitlementId === ent.id);

          if (hasGroup && (!existingAssignment || existingAssignment.status === 'removed')) {
            // AUTO-ASSIGN ROLE
            const assId = `ldap-${user.id}-${ent.id}`.substring(0, 50);
            const assData = {
              id: assId,
              userId: user.id,
              entitlementId: ent.id,
              tenantId: user.tenantId,
              status: 'active',
              grantedBy: 'LDAP-Sync',
              grantedAt: timestamp,
              syncSource: 'ldap',
              notes: `Automatische Zuweisung via AD Gruppe: ${ent.externalMapping}`
            };

            if (dataSource === 'mysql') {
              await saveCollectionRecord('assignments', assId, assData);
            } else {
              setDocumentNonBlocking(doc(db, 'assignments', assId), assData);
            }
          }
        }

        // Update last sync timestamp for user
        const updatedUser = { ...user, lastSyncedAt: timestamp };
        if (dataSource === 'mysql') {
          await saveCollectionRecord('users', user.id, updatedUser);
        } else {
          setDocumentNonBlocking(doc(db, 'users', user.id), updatedUser);
        }
      }

      toast({ 
        title: "LDAP Sync abgeschlossen", 
        description: "Nutzerdaten und Rollen-Mappings wurden aktualisiert." 
      });
      
      setTimeout(() => {
        refreshUsers();
        refreshAssignments();
        setIsSyncing(false);
      }, 500);

    } catch (e: any) {
      toast({ variant: "destructive", title: "Sync Fehler", description: e.message });
      setIsSyncing(false);
    }
  };

  const filteredUsers = users?.filter((user: any) => {
    const displayName = user.name || user.displayName || '';
    const email = user.email || '';
    const matchesSearch = displayName.toLowerCase().includes(search.toLowerCase()) || email.toLowerCase().includes(search.toLowerCase());
    const isEnabled = user.enabled === true || user.enabled === 1 || user.enabled === "1";
    const matchesStatus = activeFilter === 'all' || (activeFilter === 'active' && isEnabled) || (activeFilter === 'disabled' && !isEnabled);
    const matchesTenant = activeTenantId === 'all' || user.tenantId === activeTenantId;
    return matchesSearch && matchesStatus && matchesTenant;
  });

  if (!mounted) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Benutzerverzeichnis</h1>
          <p className="text-sm text-muted-foreground">AD Sync mit Gruppen-Vererbung und Rollen-Mapping.</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="h-9 font-bold uppercase text-[10px] rounded-none border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100" 
            onClick={handleLdapSync} 
            disabled={isSyncing}
          >
            {isSyncing ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 mr-2" />} 
            LDAP & Gruppen Sync
          </Button>
          <Button size="sm" className="h-9 font-bold uppercase text-[10px] rounded-none" onClick={() => setIsAddOpen(true)}>
            <Plus className="w-3.5 h-3.5 mr-2" /> Benutzer anlegen
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Name oder E-Mail..." 
            className="pl-10 h-10 rounded-none shadow-none border-border bg-white"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex border rounded-none p-1 bg-muted/20">
          {['all', 'active', 'disabled'].map(f => (
            <Button key={f} variant={activeFilter === f ? 'default' : 'ghost'} size="sm" className="h-8 text-[9px] font-bold uppercase px-4 rounded-none" onClick={() => setActiveFilter(f as any)}>
              {f === 'all' ? 'Alle' : f === 'active' ? 'Aktiv' : 'Deaktiviert'}
            </Button>
          ))}
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
              <TableRow>
                <TableHead className="py-4 font-bold uppercase tracking-widest text-[10px]">Identität</TableHead>
                <TableHead className="font-bold uppercase tracking-widest text-[10px]">Firma</TableHead>
                <TableHead className="font-bold uppercase tracking-widest text-[10px]">Zuweisungen (AD)</TableHead>
                <TableHead className="font-bold uppercase tracking-widest text-[10px]">Status</TableHead>
                <TableHead className="text-right font-bold uppercase tracking-widest text-[10px]">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers?.map((user: any) => {
                const isEnabled = user.enabled === true || user.enabled === 1 || user.enabled === "1";
                const userAssignments = assignments?.filter(a => a.userId === user.id && a.status === 'active') || [];
                const adAssignedCount = userAssignments.filter(a => a.syncSource === 'ldap').length;
                
                return (
                  <TableRow key={user.id} className="group transition-colors hover:bg-muted/5 border-b">
                    <TableCell className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-slate-100 flex items-center justify-center text-slate-500 font-bold uppercase text-xs">
                          {user.displayName?.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-sm">{user.displayName}</div>
                          <div className="text-[10px] text-muted-foreground font-mono">{user.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[8px] font-bold uppercase rounded-none border-slate-200">
                        {user.tenantId}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs">{userAssignments.length} gesamt</span>
                        {adAssignedCount > 0 && (
                          <Badge className="bg-blue-50 text-blue-700 border-none rounded-none text-[8px] font-bold uppercase">
                            <Network className="w-2 h-2 mr-1" /> {adAssignedCount} via AD
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn(
                        "text-[9px] font-bold uppercase rounded-none border-none px-2", 
                        isEnabled ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                      )}>
                        {isEnabled ? "AKTIV" : "INAKTIV"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="w-4 h-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 rounded-none">
                          <DropdownMenuItem onSelect={() => router.push(`/assignments?search=${user.displayName}`)}>
                            <ShieldCheck className="w-3.5 h-3.5 mr-2" /> Zugriffe prüfen
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
    </div>
  );
}
