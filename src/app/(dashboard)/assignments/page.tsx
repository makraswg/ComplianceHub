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
  Plus, 
  CheckCircle2, 
  Clock, 
  XCircle,
  Calendar,
  User as UserIcon,
  Layers,
  Loader2,
  ShieldCheck,
  BrainCircuit
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, useUser as useAuthUser } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { getAccessAdvice, type AccessAdvisorOutput } from '@/ai/flows/access-advisor-flow';

export default function AssignmentsPage() {
  const db = useFirestore();
  const { user: authUser } = useAuthUser();
  const [mounted, setMounted] = useState(false);
  
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'requested' | 'removed'>('all');
  const [search, setSearch] = useState('');
  
  // Assignment Creation State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedEntitlementId, setSelectedEntitlementId] = useState('');
  const [ticketRef, setTicketRef] = useState('');
  const [notes, setNotes] = useState('');

  // AI State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAdvice, setAiAdvice] = useState<AccessAdvisorOutput | null>(null);

  // Data Queries
  const assignmentsQuery = useMemoFirebase(() => collection(db, 'assignments'), [db]);
  const usersQuery = useMemoFirebase(() => collection(db, 'users'), [db]);
  const entitlementsQuery = useMemoFirebase(() => collection(db, 'entitlements'), [db]);
  const resourcesQuery = useMemoFirebase(() => collection(db, 'resources'), [db]);

  const { data: assignments, isLoading } = useCollection(assignmentsQuery);
  const { data: users } = useCollection(usersQuery);
  const { data: entitlements } = useCollection(entitlementsQuery);
  const { data: resources } = useCollection(resourcesQuery);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleCreateAssignment = () => {
    if (!selectedUserId || !selectedEntitlementId) {
      toast({ variant: "destructive", title: "Erforderliche Felder", description: "Wählen Sie einen Benutzer und eine Berechtigung aus." });
      return;
    }

    const assignmentData = {
      userId: selectedUserId,
      entitlementId: selectedEntitlementId,
      status: 'active',
      grantedBy: authUser?.uid || 'system',
      grantedAt: new Date().toISOString(),
      ticketRef,
      notes,
    };

    addDocumentNonBlocking(collection(db, 'assignments'), assignmentData);
    
    // Audit log
    addDocumentNonBlocking(collection(db, 'auditEvents'), {
      actorUid: authUser?.uid || 'system',
      action: 'Zuweisung erteilen',
      entityType: 'assignment',
      entityId: 'new',
      timestamp: new Date().toISOString()
    });

    toast({ title: "Zuweisung erstellt", description: "Der Zugriff wurde erfolgreich erteilt." });
    setIsCreateOpen(false);
    setSelectedUserId('');
    setSelectedEntitlementId('');
    setTicketRef('');
    setNotes('');
  };

  const runAiAdvisor = async (userId: string) => {
    const targetUser = users?.find(u => u.id === userId);
    if (!targetUser) return;

    setIsAnalyzing(userId === 'global' ? true : userId);
    setAiAdvice(null);

    const userAssignments = assignments?.filter(a => a.userId === userId) || [];
    const assignmentDetails = userAssignments.map(a => {
      const ent = entitlements?.find(e => e.id === a.entitlementId);
      const res = resources?.find(r => r.id === ent?.resourceId);
      return {
        resourceName: res?.name || 'Unbekannt',
        entitlementName: ent?.name || 'Unbekannt',
        riskLevel: ent?.riskLevel || 'mittel'
      };
    });

    try {
      const advice = await getAccessAdvice({
        userDisplayName: targetUser.displayName,
        userEmail: targetUser.email,
        department: targetUser.department || 'N/A',
        assignments: assignmentDetails
      });
      setAiAdvice(advice);
    } catch (e) {
      toast({ variant: "destructive", title: "KI-Fehler", description: "Rat konnte nicht generiert werden." });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const filteredAssignments = assignments?.filter(assignment => {
    const user = users?.find(u => u.id === assignment.userId);
    const entitlement = entitlements?.find(e => e.id === assignment.entitlementId);
    const resource = resources?.find(r => r.id === entitlement?.resourceId);

    const searchLower = search.toLowerCase();

    const matchesSearch = (
      assignment.id.toLowerCase().includes(searchLower) ||
      (user && user.displayName.toLowerCase().includes(searchLower)) ||
      (user && user.email.toLowerCase().includes(searchLower)) ||
      (entitlement && entitlement.name.toLowerCase().includes(searchLower)) ||
      (resource && resource.name.toLowerCase().includes(searchLower))
    );
    
    const matchesTab = activeTab === 'all' || assignment.status === activeTab;
    return matchesSearch && matchesTab;
  });

  if (!mounted) return null;

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Zuweisungen</h1>
          <p className="text-muted-foreground mt-1">Verwaltung von Benutzerberechtigungen und -rechten.</p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary gap-2 h-11 px-6 shadow-lg shadow-primary/20">
              <Plus className="w-5 h-5" /> Neue Zuweisung
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Neue Zuweisung erstellen</DialogTitle>
              <DialogDescription>Verknüpfen Sie einen Verzeichnisbenutzer mit einer bestimmten Systemberechtigung.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Benutzer</Label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Benutzer auswählen..." />
                  </SelectTrigger>
                  <SelectContent>
                    {users?.map(u => (
                      <SelectItem key={u.id} value={u.id}>{u.displayName} ({u.email})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Berechtigung</Label>
                <Select value={selectedEntitlementId} onValueChange={setSelectedEntitlementId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Berechtigung auswählen..." />
                  </SelectTrigger>
                  <SelectContent>
                    {entitlements?.map(e => {
                      const res = resources?.find(r => r.id === e.resourceId);
                      return (
                        <SelectItem key={e.id} value={e.id}>
                          {res?.name} - {e.name} ({e.riskLevel.toUpperCase()})
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Ticket-Referenz (Optional)</Label>
                <Input placeholder="z.B. SNOW-12345" value={ticketRef} onChange={e => setTicketRef(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Grund / Notizen</Label>
                <Input placeholder="Warum wird dieser Zugriff benötigt?" value={notes} onChange={e => setNotes(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreateAssignment} className="w-full">Zugriff gewähren</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {aiAdvice && (
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 animate-in zoom-in-95 duration-300">
          <div className="flex items-center gap-2 mb-4">
            <BrainCircuit className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-lg">KI-Zugriffsrisikoberater</h3>
            <Badge className="ml-auto font-bold" variant={aiAdvice.riskScore > 70 ? 'destructive' : 'default'}>
              Risikobewertung: {aiAdvice.riskScore}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mb-4">{aiAdvice.summary}</p>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-red-600">Bedenken</p>
              <ul className="text-xs space-y-1 text-muted-foreground">
                {aiAdvice.concerns.map((c, i) => <li key={i}>• {c}</li>)}
              </ul>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-green-600">Empfehlungen</p>
              <ul className="text-xs space-y-1 text-muted-foreground">
                {aiAdvice.recommendations.map((r, i) => <li key={i}>• {r}</li>)}
              </ul>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="mt-4 text-primary h-7 p-0 hover:bg-transparent" onClick={() => setAiAdvice(null)}>Verwerfen</Button>
        </div>
      )}

      <div className="flex flex-col gap-6">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {[
            { id: 'all', label: 'Alle Zuweisungen', icon: ShieldCheck },
            { id: 'active', label: 'Aktiv', icon: CheckCircle2 },
            { id: 'requested', label: 'Angefordert', icon: Clock },
            { id: 'removed', label: 'Entfernt', icon: XCircle },
          ].map((tab) => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? 'default' : 'outline'}
              className={cn(
                "h-12 px-6 gap-3 rounded-full border-none transition-all",
                activeTab === tab.id ? "bg-primary shadow-lg shadow-primary/30" : "bg-card text-muted-foreground"
              )}
              onClick={() => setActiveTab(tab.id as any)}
            >
              <tab.icon className="w-5 h-5" />
              <span className="font-bold">{tab.label}</span>
            </Button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Suche nach Benutzer, E-Mail, Berechtigung oder Ressource..." 
              className="pl-10 h-11 bg-card"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button variant="outline" className="h-11 gap-2 border-dashed">
            <Filter className="w-4 h-4" /> Filter
          </Button>
        </div>

        <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-muted-foreground font-medium">Zuweisungen werden geladen...</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-accent/30">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="py-4">Benutzer</TableHead>
                  <TableHead>Berechtigung</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ticket</TableHead>
                  <TableHead className="text-right">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAssignments?.map((assignment) => {
                  const user = users?.find(u => u.id === assignment.userId);
                  const ent = entitlements?.find(e => e.id === assignment.entitlementId);
                  const res = resources?.find(r => r.id === ent?.resourceId);
                  
                  return (
                    <TableRow key={assignment.id} className="group transition-colors hover:bg-accent/10">
                      <TableCell className="py-4">
                        <div className="flex items-center gap-3">
                          <UserIcon className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <div className="font-bold text-sm">{user?.displayName || assignment.userId}</div>
                            <div className="text-[10px] text-muted-foreground">{user?.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm font-bold">{res?.name}</span>
                          <span className="text-xs text-muted-foreground">{ent?.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn(
                          "border-none font-bold text-[10px]",
                          assignment.status === 'active' ? "bg-green-500/10 text-green-600" :
                          assignment.status === 'requested' ? "bg-orange-500/10 text-orange-600" :
                          "bg-red-500/10 text-red-600"
                        )}>
                          {assignment.status?.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] font-medium bg-accent/30 border-none">
                          {assignment.ticketRef || 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="font-bold text-primary gap-2"
                          onClick={() => runAiAdvisor(assignment.userId)}
                          disabled={isAnalyzing === assignment.userId}
                        >
                          {isAnalyzing === assignment.userId ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BrainCircuit className="w-3.5 h-3.5" />}
                          Risiko-KI
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}
