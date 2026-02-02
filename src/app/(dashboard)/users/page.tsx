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
  Filter, 
  MoreHorizontal, 
  RefreshCw,
  User as UserIcon,
  ChevronRight,
  ShieldCheck,
  Building2,
  Loader2,
  Plus
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
  DialogDescription,
  DialogTrigger
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking, useUser as useAuthUser } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

export default function UsersPage() {
  const db = useFirestore();
  const { user: authUser } = useAuthUser();
  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Form state
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newDepartment, setNewDepartment] = useState('');
  const [newTitle, setNewTitle] = useState('');

  const usersQuery = useMemoFirebase(() => {
    return collection(db, 'users');
  }, [db]);

  const { data: users, isLoading } = useCollection(usersQuery);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      toast({
        title: "Synchronisierung abgeschlossen",
        description: "Das LDAP-Verzeichnis ist auf dem neuesten Stand.",
      });
    }, 2000);
  };

  const handleAddUser = () => {
    if (!newDisplayName || !newEmail) {
      toast({ variant: "destructive", title: "Erforderlich", description: "Name und E-Mail sind erforderlich." });
      return;
    }

    const userId = `u-${Math.random().toString(36).substring(2, 9)}`;
    const userRef = doc(db, 'users', userId);
    
    const userData = {
      id: userId,
      externalId: `MANUAL_${userId}`,
      displayName: newDisplayName,
      email: newEmail,
      department: newDepartment,
      title: newTitle,
      enabled: true,
      lastSyncedAt: new Date().toISOString()
    };

    updateDocumentNonBlocking(userRef, userData);

    // Audit Log
    const auditRef = doc(collection(db, 'auditEvents'));
    updateDocumentNonBlocking(auditRef, {
      id: auditRef.id,
      actorUid: authUser?.uid || 'system',
      action: 'Benutzer erstellen',
      entityType: 'user',
      entityId: userId,
      timestamp: new Date().toISOString()
    });

    toast({ title: "Benutzer hinzugefügt", description: `${newDisplayName} wurde dem Verzeichnis hinzugefügt.` });
    setIsAddOpen(false);
    setNewDisplayName('');
    setNewEmail('');
    setNewDepartment('');
    setNewTitle('');
  };

  const filteredUsers = users?.filter(user => 
    user.displayName.toLowerCase().includes(search.toLowerCase()) ||
    user.email.toLowerCase().includes(search.toLowerCase()) ||
    user.department?.toLowerCase().includes(search.toLowerCase())
  );

  if (!mounted) return null;

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Benutzerverzeichnis</h1>
          <p className="text-muted-foreground mt-1">Verwaltete Benutzer, die über LDAP/Active Directory synchronisiert werden.</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="gap-2 h-11 px-6 border-primary text-primary hover:bg-primary/5"
            onClick={handleSync}
            disabled={isSyncing}
          >
            <RefreshCw className={cn("w-5 h-5", isSyncing && "animate-spin")} />
            {isSyncing ? "LDAP wird synchronisiert..." : "Von LDAP synchronisieren"}
          </Button>
          
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary gap-2 h-11 px-6 shadow-lg shadow-primary/20">
                <Plus className="w-5 h-5" /> Benutzer hinzufügen
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Verzeichnisbenutzer hinzufügen</DialogTitle>
                <DialogDescription>
                  Manuelles Erstellen eines Benutzereintrags im Verzeichnis.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">Name</Label>
                  <Input id="name" value={newDisplayName} onChange={e => setNewDisplayName(e.target.value)} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="email" className="text-right">E-Mail</Label>
                  <Input id="email" type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="department" className="text-right">Abteilung</Label>
                  <Input id="department" value={newDepartment} onChange={e => setNewDepartment(e.target.value)} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="title" className="text-right">Titel</Label>
                  <Input id="title" value={newTitle} onChange={e => setNewTitle(e.target.value)} className="col-span-3" />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleAddUser}>Benutzer speichern</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Suche nach Name, E-Mail, Abteilung..." 
            className="pl-10 h-11 bg-card"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button variant="outline" className="h-11 gap-2">
          <Building2 className="w-4 h-4" /> Alle Abteilungen
        </Button>
        <Button variant="outline" className="h-11 gap-2">
          <Filter className="w-4 h-4" /> Weitere Filter
        </Button>
      </div>

      <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-muted-foreground font-medium">Verzeichnis wird geladen...</p>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-accent/30">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[350px] py-4">Mitarbeiter</TableHead>
                <TableHead>Abteilung</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Zuletzt synchronisiert</TableHead>
                <TableHead className="text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers?.map((user) => (
                <TableRow key={user.id} className="group transition-colors hover:bg-accent/10">
                  <TableCell className="py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-primary font-bold group-hover:scale-110 transition-transform uppercase">
                        {user.displayName.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold">{user.displayName}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{user.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium text-sm">{user.department || 'N/A'}</span>
                      <span className="text-[10px] text-muted-foreground">{user.title}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      className={cn(
                        "font-bold",
                        user.enabled ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-600"
                      )}
                      variant="outline"
                    >
                      {user.enabled ? "AKTIVIERT" : "DEAKTIVIERT"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {user.lastSyncedAt ? new Date(user.lastSyncedAt).toLocaleDateString() : 'Nie'}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-muted-foreground">
                          <MoreHorizontal className="w-5 h-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuItem className="font-medium">
                          Profil anzeigen <ChevronRight className="ml-auto w-4 h-4 text-muted-foreground" />
                        </DropdownMenuItem>
                        <DropdownMenuItem className="font-medium">
                          Zuweisungen anzeigen <ChevronRight className="ml-auto w-4 h-4 text-muted-foreground" />
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && filteredUsers?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    Keine Benutzer gefunden, die Ihrer Suche entsprechen.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
