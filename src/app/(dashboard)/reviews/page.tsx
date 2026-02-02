"use client";

import { useState } from 'react';
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
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Search, 
  Filter, 
  ShieldAlert,
  Layers,
  Calendar,
  History,
  Loader2
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking, useUser } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';

export default function AccessReviewsPage() {
  const db = useFirestore();
  const { user } = useUser();
  const [activeFilter, setActiveFilter] = useState<'pending' | 'completed' | 'all'>('pending');
  const [search, setSearch] = useState('');

  const assignmentsQuery = useMemoFirebase(() => {
    return collection(db, 'assignments');
  }, [db]);

  const { data: assignments, isLoading } = useCollection(assignmentsQuery);

  const handleReview = (assignmentId: string, action: 'certify' | 'revoke') => {
    const docRef = doc(db, 'assignments', assignmentId);
    
    const updates = {
      status: action === 'certify' ? 'active' : 'removed',
      lastReviewedAt: new Date().toISOString(),
      reviewedBy: user?.uid || 'unknown'
    };

    updateDocumentNonBlocking(docRef, updates);
    
    // Also create audit event (simplified for demo)
    const auditRef = doc(collection(db, 'auditEvents'));
    updateDocumentNonBlocking(auditRef, {
      id: auditRef.id,
      actorUid: user?.uid || 'system',
      action: action === 'certify' ? 'Zuweisung zertifizieren' : 'Zuweisung widerrufen',
      entityType: 'assignment',
      entityId: assignmentId,
      timestamp: new Date().toISOString()
    });

    toast({
      title: action === 'certify' ? "Zuweisung zertifiziert" : "Zuweisung widerrufen",
      description: `Die Zugriffsrechte wurden erfolgreich aktualisiert.`,
    });
  };

  const filteredAssignments = assignments?.filter(assignment => {
    const matchesSearch = assignment.userId.toLowerCase().includes(search.toLowerCase()) || 
                         assignment.entitlementId.toLowerCase().includes(search.toLowerCase());
    
    const isCompleted = !!assignment.lastReviewedAt;
    if (activeFilter === 'pending') return matchesSearch && !isCompleted;
    if (activeFilter === 'completed') return matchesSearch && isCompleted;
    return matchesSearch;
  });

  const stats = {
    total: assignments?.length || 0,
    completed: assignments?.filter(a => !!a.lastReviewedAt).length || 0,
    overdue: assignments?.filter(a => {
      if (!a.grantedAt) return false;
      const days = (new Date().getTime() - new Date(a.grantedAt).getTime()) / (1000 * 3600 * 24);
      return days > 90 && !a.lastReviewedAt;
    }).length || 0
  };

  const progressPercent = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline">Zugriffsüberprüfungen</h1>
          <p className="text-muted-foreground mt-1">Zertifizieren oder widerrufen Sie Benutzerberechtigungen für die vierteljährliche Compliance.</p>
        </div>
        <Button variant="outline" className="gap-2 h-11 px-6 border-primary text-primary hover:bg-primary/5">
          <History className="w-4 h-4" /> Überprüfungsverlauf
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none shadow-sm bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Kampagnenfortschritt</CardTitle>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-primary">{progressPercent}%</span>
              <span className="text-xs text-muted-foreground">Q3-Überprüfung</span>
            </div>
          </CardHeader>
          <CardContent>
            <Progress value={progressPercent} className="h-2 bg-primary/10" />
            <p className="text-[10px] text-muted-foreground mt-2 font-medium">
              {stats.completed} von {stats.total} Überprüfungen abgeschlossen
            </p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm border-l-4 border-l-red-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Warten auf Überprüfung</CardTitle>
            <div className="flex items-baseline gap-2 text-red-600">
              <span className="text-3xl font-bold">{stats.overdue}</span>
              <AlertCircle className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Hochriskante oder veraltete Zuweisungen, die eine Zertifizierung erfordern.</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Zertifiziert</CardTitle>
            <div className="flex items-baseline gap-2 text-green-600">
              <span className="text-3xl font-bold">{stats.completed}</span>
              <CheckCircle className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Elemente, die während der aktuellen Kampagne überprüft wurden.</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex bg-card p-1 rounded-xl border w-full md:w-auto">
            <Button 
              variant={activeFilter === 'pending' ? 'default' : 'ghost'} 
              size="sm" 
              className="flex-1 md:flex-none"
              onClick={() => setActiveFilter('pending')}
            >
              Ausstehende Überprüfungen
            </Button>
            <Button 
              variant={activeFilter === 'completed' ? 'default' : 'ghost'} 
              size="sm"
              className="flex-1 md:flex-none"
              onClick={() => setActiveFilter('completed')}
            >
              Abgeschlossen
            </Button>
            <Button 
              variant={activeFilter === 'all' ? 'default' : 'ghost'} 
              size="sm"
              className="flex-1 md:flex-none"
              onClick={() => setActiveFilter('all')}
            >
              Alle Elemente
            </Button>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Nach Benutzer oder ID filtern..." 
                className="pl-10 h-10 bg-card" 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="animate-spin w-8 h-8 text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-accent/5">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[280px] py-4">Benutzer-ID</TableHead>
                  <TableHead>Berechtigungs-ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Gewährungsdatum</TableHead>
                  <TableHead className="text-right">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAssignments?.map((assignment) => (
                  <TableRow key={assignment.id} className="group hover:bg-accent/5 transition-colors">
                    <TableCell className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs uppercase">
                          {assignment.userId.charAt(0)}
                        </div>
                        <div className="font-bold text-sm truncate max-w-[150px]">{assignment.userId}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="p-1 rounded bg-blue-100 text-blue-600">
                          <Layers className="w-3.5 h-3.5" />
                        </div>
                        <span className="font-bold text-sm">{assignment.entitlementId}</span>
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
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{assignment.grantedAt ? new Date(assignment.grantedAt).toLocaleDateString() : 'Unbekannt'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {assignment.lastReviewedAt ? (
                        <Badge variant="outline" className="gap-1.5">
                          <CheckCircle className="w-3 h-3 text-green-600" />
                          Zertifiziert
                        </Badge>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="h-8 gap-1.5 text-red-600 hover:bg-red-50 hover:text-red-700 border-red-100 font-bold px-3"
                            onClick={() => handleReview(assignment.id, 'revoke')}
                          >
                            <XCircle className="w-3.5 h-3.5" /> Widerrufen
                          </Button>
                          <Button 
                            size="sm" 
                            className="h-8 gap-1.5 bg-green-600 hover:bg-green-700 text-white font-bold px-3"
                            onClick={() => handleReview(assignment.id, 'certify')}
                          >
                            <CheckCircle className="w-3.5 h-3.5" /> Zertifizieren
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {!isLoading && filteredAssignments?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      Keine Zuweisungen gefunden, die diesen Kriterien entsprechen.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}
