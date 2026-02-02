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
  Loader2
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
import { Label } from '@/components/ui/label';
import { useFirestore, useCollection, useMemoFirebase, setDocumentNonBlocking, addDocumentNonBlocking, useUser as useAuthUser } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

export default function UsersPage() {
  const db = useFirestore();
  const router = useRouter();
  const { user: authUser } = useAuthUser();
  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  const [newDisplayName, setNewDisplayName] = useState('');
  const [newEmail, setNewEmail] = useState('');

  const usersQuery = useMemoFirebase(() => collection(db, 'users'), [db]);
  const { data: users, isLoading } = useCollection(usersQuery);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      toast({ title: "Synchronisierung abgeschlossen", description: "LDAP-Status aktualisiert." });
    }, 1500);
  };

  const handleAddUser = () => {
    if (!newDisplayName || !newEmail) return;

    const userId = `u-${Math.random().toString(36).substring(2, 9)}`;
    const userData = {
      id: userId,
      externalId: `MANUAL_${userId}`,
      displayName: newDisplayName,
      email: newEmail,
      enabled: true,
      lastSyncedAt: new Date().toISOString()
    };

    setDocumentNonBlocking(doc(db, 'users', userId), userData);
    addDocumentNonBlocking(collection(db, 'auditEvents'), {
      actorUid: authUser?.uid || 'system',
      action: 'Benutzer manuell erstellt',
      entityType: 'user',
      entityId: userId,
      timestamp: new Date().toISOString()
    });

    toast({ title: "Benutzer hinzugefügt" });
    setIsAddOpen(false);
    setNewDisplayName('');
    setNewEmail('');
  };

  const filteredUsers = users?.filter(user => 
    user.displayName.toLowerCase().includes(search.toLowerCase()) ||
    user.email.toLowerCase().includes(search.toLowerCase()) ||
    user.department?.toLowerCase().includes(search.toLowerCase())
  );

  if (!mounted) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Benutzerverzeichnis</h1>
          <p className="text-sm text-muted-foreground">Verwaltete Benutzer aus LDAP/Active Directory.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-9 font-semibold" onClick={handleSync} disabled={isSyncing}>
            <RefreshCw className={cn("w-4 h-4 mr-2", isSyncing && "animate-spin")} />
            {isSyncing ? "Sync..." : "LDAP Sync"}
          </Button>
          <Button size="sm" className="h-9 font-semibold" onClick={() => setIsAddOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> Hinzufügen
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input 
          placeholder="Suche nach Name, E-Mail, Abteilung..." 
          className="pl-10 h-10 shadow-none border-border"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="admin-card overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="hover:bg-transparent">
                <TableHead className="py-4 font-bold uppercase tracking-widest text-[10px]">Mitarbeiter</TableHead>
                <TableHead className="font-bold uppercase tracking-widest text-[10px]">Abteilung</TableHead>
                <TableHead className="font-bold uppercase tracking-widest text-[10px]">Status</TableHead>
                <TableHead className="font-bold uppercase tracking-widest text-[10px]">Letzter Sync</TableHead>
                <TableHead className="text-right font-bold uppercase tracking-widest text-[10px]">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers?.map((user) => (
                <TableRow key={user.id} className="group hover:bg-muted/5 border-b">
                  <TableCell className="py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded bg-slate-100 flex items-center justify-center text-slate-500 font-bold uppercase">
                        {user.displayName.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-sm">{user.displayName}</div>
                        <div className="text-[10px] text-muted-foreground">{user.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium text-xs">{user.department || '—'}</span>
                      <span className="text-[10px] text-muted-foreground uppercase">{user.title}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn("text-[9px] font-bold uppercase px-2 py-0", user.enabled ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200")}>
                      {user.enabled ? "AKTIV" : "INAKTIV"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-[10px] font-bold uppercase">
                    {user.lastSyncedAt ? new Date(user.lastSyncedAt).toLocaleDateString() : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 p-1">
                        <DropdownMenuItem onSelect={(e) => {
                          e.preventDefault();
                          setSelectedUser(user);
                          setTimeout(() => setIsProfileOpen(true), 150);
                        }}>
                          <UserCircle className="w-4 h-4 mr-2" /> Profil anzeigen
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => router.push(`/assignments?search=${user.displayName}`)}>
                          <ShieldCheck className="w-4 h-4 mr-2" /> Zuweisungen
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

      {/* Dialogs */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-sm rounded-lg">
          <DialogHeader><DialogTitle>Benutzer anlegen</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase">Name</Label>
              <Input value={newDisplayName} onChange={e => setNewDisplayName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase">E-Mail</Label>
              <Input value={newEmail} onChange={e => setNewEmail(e.target.value)} />
            </div>
          </div>
          <DialogFooter><Button onClick={handleAddUser} className="w-full">Speichern</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
        <DialogContent className="max-w-md rounded-lg">
          <DialogHeader><DialogTitle>Benutzerprofil</DialogTitle></DialogHeader>
          {selectedUser && (
            <div className="space-y-4 py-4 text-sm">
              <div className="flex items-center gap-4 p-4 border rounded-md">
                <div className="w-12 h-12 rounded bg-primary text-white flex items-center justify-center font-bold text-lg">{selectedUser.displayName.charAt(0)}</div>
                <div>
                  <h3 className="font-bold">{selectedUser.displayName}</h3>
                  <p className="text-xs text-muted-foreground">{selectedUser.email}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-[10px] uppercase font-bold text-muted-foreground">Abteilung</Label><p>{selectedUser.department || 'N/A'}</p></div>
                <div><Label className="text-[10px] uppercase font-bold text-muted-foreground">Titel</Label><p>{selectedUser.title || 'N/A'}</p></div>
                <div><Label className="text-[10px] uppercase font-bold text-muted-foreground">External ID</Label><p className="font-mono text-[10px]">{selectedUser.externalId}</p></div>
                <div><Label className="text-[10px] uppercase font-bold text-muted-foreground">Status</Label><p>{selectedUser.enabled ? 'Aktiviert' : 'Deaktiviert'}</p></div>
              </div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setIsProfileOpen(false)} className="w-full">Schließen</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
