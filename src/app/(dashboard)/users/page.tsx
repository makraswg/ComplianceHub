
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
import { Label } from '@/components/ui/label';
import { usePluggableCollection } from '@/hooks/data/use-pluggable-collection';
import { useFirestore, setDocumentNonBlocking, useUser as useAuthUser } from '@/firebase';
import { doc } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { getAccessAdvice } from '@/ai/flows/access-advisor-flow';
import { useSettings } from '@/context/settings-context';
import { saveCollectionRecord } from '@/app/actions/mysql-actions';

export default function UsersPage() {
  const db = useFirestore();
  const router = useRouter();
  const { dataSource } = useSettings();
  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isAdvisorOpen, setIsAdvisorOpen] = useState(false);
  
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isAdvisorLoading, setIsAdvisorLoading] = useState(false);
  const [aiAdvice, setAiAdvice] = useState<any>(null);

  const [newDisplayName, setNewDisplayName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newDepartment, setNewDepartment] = useState('');
  const [newTitle, setNewTitle] = useState('');

  const { data: users, isLoading } = usePluggableCollection('users');
  const { data: assignments } = usePluggableCollection('assignments');
  const { data: entitlements } = usePluggableCollection('entitlements');
  const { data: resources } = usePluggableCollection('resources');

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleAddUser = async () => {
    if (!newDisplayName || !newEmail) {
      toast({ variant: "destructive", title: "Fehler", description: "Name und E-Mail sind erforderlich." });
      return;
    }
    
    const userId = `u-${Math.random().toString(36).substring(2, 9)}`;
    const userData = {
      id: userId,
      externalId: `MANUAL_${userId}`,
      displayName: newDisplayName,
      email: newEmail,
      department: newDepartment,
      title: newTitle,
      enabled: true,
      lastSyncedAt: new Date().toISOString(),
      tenantId: 't1'
    };

    if (dataSource === 'mysql') {
      const result = await saveCollectionRecord('users', userId, userData);
      if (!result.success) {
        toast({ variant: "destructive", title: "Fehler", description: "Speichern in MySQL fehlgeschlagen." });
        return;
      }
    } else {
      setDocumentNonBlocking(doc(db, 'users', userId), userData);
    }
    
    setIsAddOpen(false);
    toast({ title: "Benutzer hinzugefügt", description: `${newDisplayName} wurde im Verzeichnis angelegt.` });
    resetForm();
    
    // Im MySQL Modus müssen wir ggf. die Liste manuell refreshen, 
    // falls wir keinen Echtzeit-Listener haben. 
    // usePluggableCollection regelt das über den State der Seite.
    if (dataSource === 'mysql') {
        router.refresh();
    }
  };

  const resetForm = () => {
    setNewDisplayName('');
    setNewEmail('');
    setNewDepartment('');
    setNewTitle('');
  };

  const openAdvisor = async (userDoc: any) => {
    setSelectedUser(userDoc);
    setIsAdvisorLoading(true);
    setIsAdvisorOpen(true);
    setAiAdvice(null);
    
    try {
      const userAssignments = assignments?.filter(a => a.userId === userDoc.id && a.status === 'active') || [];
      const detailedAssignments = userAssignments.map(a => {
        const ent = entitlements?.find(e => e.id === a.entitlementId);
        const res = resources?.find(r => r.id === ent?.resourceId);
        return {
          resourceName: res?.name || 'Unbekannt',
          entitlementName: ent?.name || 'Unbekannt',
          riskLevel: ent?.riskLevel || 'medium'
        };
      });

      const advice = await getAccessAdvice({
        userDisplayName: userDoc.name || userDoc.displayName,
        userEmail: userDoc.email,
        department: userDoc.department || 'Allgemein',
        assignments: detailedAssignments
      });
      setAiAdvice(advice);
    } catch (e) {
      toast({ variant: "destructive", title: "KI-Fehler", description: "Empfehlungen konnten nicht geladen werden." });
      setIsAdvisorOpen(false);
    } finally {
      setIsAdvisorLoading(false);
    }
  };

  const filteredUsers = users?.filter(user => 
    (user.name || user.displayName || '').toLowerCase().includes(search.toLowerCase()) ||
    (user.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (user.department || '').toLowerCase().includes(search.toLowerCase())
  );

  if (!mounted) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground font-headline">Benutzerverzeichnis</h1>
          <p className="text-sm text-muted-foreground">Zentrale Verwaltung aller Identitäten ({dataSource.toUpperCase()}).</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-9 font-bold uppercase text-[10px] rounded-none shadow-none" onClick={() => setIsSyncing(true)} disabled={isSyncing}>
            <RefreshCw className={cn("w-3 h-3 mr-2", isSyncing && "animate-spin")} /> LDAP Sync
          </Button>
          <Button size="sm" className="h-9 font-bold uppercase text-[10px] rounded-none shadow-none" onClick={() => setIsAddOpen(true)}>
            <Plus className="w-3 h-3 mr-2" /> Hinzufügen
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input 
          placeholder="Suche nach Name, E-Mail, Abteilung..." 
          className="pl-10 h-10 rounded-none shadow-none border-border bg-white"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
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
                <TableHead className="font-bold uppercase tracking-widest text-[10px]">Abteilung / Rolle</TableHead>
                <TableHead className="font-bold uppercase tracking-widest text-[10px]">Status</TableHead>
                <TableHead className="font-bold uppercase tracking-widest text-[10px]">Zugriffsprofil</TableHead>
                <TableHead className="text-right font-bold uppercase tracking-widest text-[10px]">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers?.map((user) => {
                const userEntsCount = assignments?.filter(a => a.userId === user.id && a.status === 'active').length || 0;
                const displayName = user.name || user.displayName;
                return (
                  <TableRow key={user.id} className="group transition-colors hover:bg-muted/5 border-b">
                    <TableCell className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-none bg-slate-100 flex items-center justify-center text-slate-500 font-bold uppercase text-xs">
                          {displayName.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-sm">{displayName}</div>
                          <div className="text-[10px] text-muted-foreground">{user.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-xs">{user.department || '—'}</span>
                        <span className="text-[10px] text-muted-foreground uppercase">{user.title || 'Kein Titel'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn(
                        "text-[9px] font-bold uppercase rounded-none border-none px-2", 
                        user.enabled ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                      )}>
                        {user.enabled ? "AKTIV" : "DEAKTIVIERT"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 font-bold text-[10px] uppercase text-slate-600">
                        <ShieldCheck className="w-3.5 h-3.5 text-primary" /> {userEntsCount} Berechtigungen
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none hover:bg-muted">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 rounded-none p-1 shadow-xl border border-border">
                          <DropdownMenuItem onSelect={(e) => {
                            e.preventDefault();
                            setSelectedUser(user);
                            setTimeout(() => setIsProfileOpen(true), 150);
                          }}>
                            <UserCircle className="w-3.5 h-3.5 mr-2" /> Identitätsprofil
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => router.push(`/assignments?search=${displayName}`)}>
                            <ShieldCheck className="w-3.5 h-3.5 mr-2" /> Zugriffe verwalten
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-blue-600 font-bold" onSelect={(e) => {
                            e.preventDefault();
                            openAdvisor(user);
                          }}>
                            <BrainCircuit className="w-3.5 h-3.5 mr-2" /> KI-Access Advisor
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
              {!isLoading && filteredUsers?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                    <p className="text-[10px] font-bold uppercase tracking-widest">Keine Benutzer gefunden.</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Add User Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="rounded-none border shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold uppercase">Benutzer hinzufügen</DialogTitle>
            <DialogDescription className="text-xs">Identität manuell im Verzeichnis registrieren.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right text-[10px] font-bold uppercase">Name</Label>
              <Input value={newDisplayName} onChange={e => setNewDisplayName(e.target.value)} placeholder="Max Mustermann" className="col-span-3 rounded-none" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right text-[10px] font-bold uppercase">Email</Label>
              <Input value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="max@firma.de" className="col-span-3 rounded-none" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right text-[10px] font-bold uppercase">Abteilung</Label>
              <Input value={newDepartment} onChange={e => setNewDepartment(e.target.value)} placeholder="IT" className="col-span-3 rounded-none" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right text-[10px] font-bold uppercase">Titel</Label>
              <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Administrator" className="col-span-3 rounded-none" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)} className="rounded-none">Abbrechen</Button>
            <Button onClick={handleAddUser} className="rounded-none font-bold uppercase text-[10px]">Benutzer anlegen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Profile Dialog */}
      <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
        <DialogContent className="max-w-3xl rounded-none border shadow-2xl">
          <DialogHeader className="border-b pb-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/10 text-primary flex items-center justify-center font-bold text-xl uppercase">
                {selectedUser?.name?.charAt(0) || selectedUser?.displayName?.charAt(0) || '?'}
              </div>
              <div>
                <DialogTitle className="text-lg font-bold font-headline">{selectedUser?.name || selectedUser?.displayName}</DialogTitle>
                <DialogDescription className="text-xs font-bold uppercase tracking-wider">{selectedUser?.email} • {selectedUser?.department || 'Keine Abteilung'}</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="py-6 space-y-6">
            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-primary mb-4 flex items-center gap-2">
                <Shield className="w-4 h-4" /> Aktive Berechtigungen
              </h3>
              <div className="border rounded-none overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead className="h-10 text-[9px] font-bold uppercase">System</TableHead>
                      <TableHead className="h-10 text-[9px] font-bold uppercase">Rolle / Entitlement</TableHead>
                      <TableHead className="h-10 text-[9px] font-bold uppercase">Risiko</TableHead>
                      <TableHead className="h-10 text-[9px] font-bold uppercase">Zugeordnet am</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignments?.filter(a => a.userId === selectedUser?.id && a.status === 'active').map(a => {
                      const ent = entitlements?.find(e => e.id === a.entitlementId);
                      const res = resources?.find(r => r.id === ent?.resourceId);
                      return (
                        <TableRow key={a.id} className="text-xs">
                          <TableCell className="py-3">
                            <div className="flex items-center gap-2">
                              <Layers className="w-3.5 h-3.5 text-muted-foreground" />
                              <span className="font-bold">{res?.name || '—'}</span>
                            </div>
                          </TableCell>
                          <TableCell>{ent?.name || '—'}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn(
                              "text-[8px] font-bold uppercase rounded-none border-none px-1.5",
                              ent?.riskLevel === 'high' ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-700"
                            )}>
                              {ent?.riskLevel || 'MEDIUM'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {a.grantedAt ? new Date(a.grantedAt).toLocaleDateString() : 'Unbekannt'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {assignments?.filter(a => a.userId === selectedUser?.id && a.status === 'active').length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="h-20 text-center text-muted-foreground italic text-xs">
                          Keine aktiven Zugriffe gefunden.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>

          <DialogFooter className="border-t pt-4">
            <Button variant="outline" onClick={() => setIsProfileOpen(false)} className="rounded-none">Schließen</Button>
            <Button onClick={() => { setIsProfileOpen(false); router.push(`/assignments?search=${selectedUser?.name || selectedUser?.displayName}`); }} className="rounded-none font-bold uppercase text-[10px]">
              Zugriffe bearbeiten
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Advisor Dialog */}
      <Dialog open={isAdvisorOpen} onOpenChange={setIsAdvisorOpen}>
        <DialogContent className="max-w-2xl rounded-none border shadow-2xl overflow-hidden p-0">
          <div className="bg-slate-900 text-white p-6">
            <div className="flex items-center justify-between mb-2">
              <Badge className="bg-blue-600 text-white rounded-none border-none font-bold text-[9px]">ACCESS ADVISOR AI</Badge>
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-slate-400">
                <BrainCircuit className="w-4 h-4 text-blue-400" />
                Live Analyse
              </div>
            </div>
            <h2 className="text-xl font-bold font-headline">Sicherheitsbericht für {selectedUser?.name || selectedUser?.displayName}</h2>
            <p className="text-xs text-slate-400 mt-1">Status: {isAdvisorLoading ? 'Analysiere Daten...' : 'Analyse abgeschlossen'}</p>
          </div>
          
          <div className="p-6">
            {isAdvisorLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Berechne Risikoprofil...</p>
              </div>
            ) : aiAdvice && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className="grid grid-cols-2 gap-4">
                  <div className="admin-card p-4 border-l-4 border-l-blue-600 bg-blue-50/50">
                    <p className="text-[9px] font-bold uppercase text-blue-600 mb-1">Risiko-Score</p>
                    <div className="text-3xl font-bold flex items-baseline gap-1">
                      {aiAdvice.riskScore} <span className="text-sm font-normal text-muted-foreground">/ 100</span>
                    </div>
                  </div>
                  <div className="admin-card p-4 border-l-4 border-l-orange-500 bg-orange-50/50">
                    <p className="text-[9px] font-bold uppercase text-orange-600 mb-1">Kritische Zugriffe</p>
                    <div className="text-3xl font-bold">{aiAdvice.concerns.length}</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold uppercase text-primary tracking-widest flex items-center gap-2">
                    <span className="w-4 h-4 flex items-center justify-center bg-primary text-white rounded-full text-[8px]">!</span> Analyse-Zusammenfassung
                  </h4>
                  <p className="text-sm leading-relaxed text-slate-700 bg-slate-50 p-4 border italic">
                    "{aiAdvice.summary}"
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-bold uppercase text-red-600 tracking-widest">Risikobereiche</h4>
                    <ul className="space-y-2">
                      {aiAdvice.concerns.map((c: string, i: number) => (
                        <li key={i} className="text-xs flex gap-2">
                          <ShieldAlert className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                          <span>{c}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-bold uppercase text-emerald-600 tracking-widest">Empfehlungen</h4>
                    <ul className="space-y-2">
                      {aiAdvice.recommendations.map((r: string, i: number) => (
                        <li key={i} className="text-xs flex gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                          <span className="font-bold">{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter className="p-6 border-t bg-slate-50">
            <Button variant="outline" onClick={() => setIsAdvisorOpen(false)} className="rounded-none border-slate-300">Schließen</Button>
            <Button className="rounded-none bg-blue-600 hover:bg-blue-700 font-bold uppercase text-[10px]" onClick={() => { setIsAdvisorOpen(false); router.push('/reviews'); }}>
              Review starten
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
