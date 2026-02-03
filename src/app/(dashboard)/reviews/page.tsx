
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
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Search, 
  ShieldAlert,
  Layers,
  Calendar,
  Loader2,
  RefreshCw,
  Info,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { 
  useFirestore, 
  updateDocumentNonBlocking, 
  addDocumentNonBlocking, 
  useUser 
} from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { usePluggableCollection } from '@/hooks/data/use-pluggable-collection';
import { useSettings } from '@/context/settings-context';
import { saveCollectionRecord } from '@/app/actions/mysql-actions';

export default function AccessReviewsPage() {
  const db = useFirestore();
  const { user } = useUser();
  const { dataSource } = useSettings();
  const [mounted, setMounted] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'pending' | 'completed' | 'all'>('pending');
  const [search, setSearch] = useState('');

  const { data: assignments, isLoading, refresh: refreshAssignments } = usePluggableCollection<any>('assignments');
  const { data: users } = usePluggableCollection<any>('users');
  const { data: entitlements } = usePluggableCollection<any>('entitlements');
  const { data: resources } = usePluggableCollection<any>('resources');

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleReview = async (assignmentId: string, action: 'certify' | 'revoke') => {
    const existing = assignments?.find(a => a.id === assignmentId);
    if (!existing) return;

    const reviewData = {
      status: action === 'certify' ? 'active' : 'removed',
      lastReviewedAt: new Date().toISOString(),
      reviewedBy: user?.uid || 'system'
    };

    const auditData = {
      actorUid: user?.uid || 'system',
      action: action === 'certify' ? 'Zertifizierung' : 'Widerruf (Review)',
      entityType: 'assignment',
      entityId: assignmentId,
      timestamp: new Date().toISOString(),
      tenantId: 't1'
    };

    if (dataSource === 'mysql') {
      const saveRes = await saveCollectionRecord('assignments', assignmentId, { ...existing, ...reviewData });
      if (!saveRes.success) {
        toast({ variant: "destructive", title: "Fehler", description: "Speichern in MySQL fehlgeschlagen." });
        return;
      }
      await saveCollectionRecord('auditEvents', `audit-${Math.random().toString(36).substring(2, 9)}`, auditData);
    } else {
      updateDocumentNonBlocking(doc(db, 'assignments', assignmentId), reviewData);
      addDocumentNonBlocking(collection(db, 'auditEvents'), auditData);
    }

    toast({
      title: action === 'certify' ? "Zuweisung zertifiziert" : "Zuweisung widerrufen",
      description: "Die Compliance-Anforderung wurde erfüllt.",
    });

    setTimeout(() => refreshAssignments(), 150);
  };

  const filteredAssignments = assignments?.filter(assignment => {
    const userDoc = users?.find(u => u.id === assignment.userId);
    const ent = entitlements?.find(e => e.id === assignment.entitlementId);
    const res = resources?.find(r => r.id === ent?.resourceId);
    
    const userName = userDoc?.displayName || userDoc?.name || '';
    const resName = res?.name || '';
    const matchesSearch = 
      userName.toLowerCase().includes(search.toLowerCase()) || 
      resName.toLowerCase().includes(search.toLowerCase());
    
    const isCompleted = !!assignment.lastReviewedAt;
    if (activeFilter === 'pending') return matchesSearch && !isCompleted && assignment.status !== 'removed';
    if (activeFilter === 'completed') return matchesSearch && isCompleted;
    return matchesSearch;
  });

  const stats = {
    total: assignments?.filter(a => a.status !== 'removed').length || 0,
    completed: assignments?.filter(a => !!a.lastReviewedAt).length || 0,
    overdue: assignments?.filter(a => {
      if (a.status === 'removed') return false;
      
      // Check for age > 90 days
      const ninetyDaysAgo = new Date().getTime() - (90 * 24 * 60 * 60 * 1000);
      const isOld = a.grantedAt && new Date(a.grantedAt).getTime() < ninetyDaysAgo;
      
      // Check for expired
      const isExpired = a.validUntil && new Date(a.validUntil).getTime() < new Date().getTime();
      
      return (isOld || isExpired) && !a.lastReviewedAt;
    }).length || 0,
    expired: assignments?.filter(a => a.status === 'active' && a.validUntil && new Date(a.validUntil).getTime() < new Date().getTime()).length || 0
  };

  const progressPercent = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  if (!mounted) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Access Reviews</h1>
          <p className="text-sm text-muted-foreground">Vierteljährliche Überprüfung kritischer Berechtigungen.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-9 font-bold uppercase text-[10px] rounded-none" onClick={() => refreshAssignments()}>
            <RefreshCw className="w-3.5 h-3.5 mr-2" /> Aktualisieren
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="shadow-none rounded-none border">
          <CardHeader className="py-3 bg-muted/20 border-b">
            <CardTitle className="text-[10px] font-bold uppercase text-muted-foreground">Fortschritt</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-3xl font-bold">{progressPercent}%</span>
              <span className="text-[10px] text-muted-foreground uppercase font-bold">Kampagne</span>
            </div>
            <Progress value={progressPercent} className="h-1.5 rounded-none bg-slate-100" />
            <p className="text-[9px] text-muted-foreground mt-2 font-bold uppercase tracking-wider">
              {stats.completed} von {stats.total} abgeschlossen
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-none rounded-none border border-red-200">
          <CardHeader className="py-3 bg-red-50/50 border-b border-red-200">
            <CardTitle className="text-[10px] font-bold uppercase text-red-700">Kritisch / Überfällig</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 flex items-center justify-between">
            <span className="text-3xl font-bold text-red-600">{stats.overdue}</span>
            <AlertCircle className="w-8 h-8 text-red-100" />
          </CardContent>
        </Card>

        <Card className="shadow-none rounded-none border border-orange-200">
          <CardHeader className="py-3 bg-orange-50/50 border-b border-orange-200">
            <CardTitle className="text-[10px] font-bold uppercase text-orange-700">Abgelaufen</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 flex items-center justify-between">
            <span className="text-3xl font-bold text-orange-600">{stats.expired}</span>
            <Clock className="w-8 h-8 text-orange-100" />
          </CardContent>
        </Card>

        <Alert className="rounded-none border shadow-none bg-blue-50/30">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-[10px] font-bold uppercase text-blue-800 tracking-wider">Review Guide</AlertTitle>
          <AlertDescription className="text-[10px] text-blue-700 leading-relaxed">
            Berechtigungen ohne Enddatum oder mit abgelaufener Gültigkeit (Gültig bis) müssen priorisiert geprüft werden.
          </AlertDescription>
        </Alert>
      </div>

      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex border rounded-none p-1 bg-muted/20 w-full md:w-auto">
          {['pending', 'completed', 'all'].map(id => (
            <Button 
              key={id}
              variant={activeFilter === id ? 'default' : 'ghost'} 
              size="sm" 
              className="flex-1 md:flex-none text-[10px] font-bold uppercase rounded-none h-8 px-6"
              onClick={() => setActiveFilter(id as any)}
            >
              {id === 'pending' ? 'Ausstehend' : id === 'completed' ? 'Erledigt' : 'Alle'}
            </Button>
          ))}
        </div>
        <div className="relative flex-1 md:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Suchen nach Benutzer oder System..." 
            className="pl-10 h-10 rounded-none bg-white shadow-none" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="admin-card overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="animate-spin w-8 h-8 text-primary" />
            <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Lade Review-Liste...</p>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="hover:bg-transparent">
                <TableHead className="py-4 font-bold uppercase tracking-widest text-[10px]">Benutzer</TableHead>
                <TableHead className="font-bold uppercase tracking-widest text-[10px]">System / Rolle</TableHead>
                <TableHead className="font-bold uppercase tracking-widest text-[10px]">Gültigkeit</TableHead>
                <TableHead className="font-bold uppercase tracking-widest text-[10px]">Risiko</TableHead>
                <TableHead className="text-right font-bold uppercase tracking-widest text-[10px]">Aktion</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAssignments?.map((assignment) => {
                const userDoc = users?.find(u => u.id === assignment.userId);
                const ent = entitlements?.find(e => e.id === assignment.entitlementId);
                const res = resources?.find(r => r.id === ent?.resourceId);
                const isExpired = assignment.validUntil && new Date(assignment.validUntil).getTime() < new Date().getTime();
                
                return (
                  <TableRow key={assignment.id} className="group hover:bg-muted/5 border-b">
                    <TableCell className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-none bg-slate-100 flex items-center justify-center text-[10px] font-bold uppercase">
                          {(userDoc?.displayName || userDoc?.name || '?').charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-sm">{userDoc?.displayName || userDoc?.name || assignment.userId}</div>
                          <div className="text-[9px] text-muted-foreground uppercase font-bold tracking-tighter">{userDoc?.department || 'Keine Abteilung'}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold text-sm">{res?.name}</span>
                        <span className="text-xs text-muted-foreground">{ent?.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {assignment.validUntil ? (
                        <div className={cn(
                          "flex items-center gap-1.5 font-bold text-[10px] uppercase",
                          isExpired ? "text-red-600" : "text-slate-600"
                        )}>
                          {isExpired ? <AlertTriangle className="w-3 h-3" /> : <Calendar className="w-3 h-3" />}
                          {new Date(assignment.validUntil).toLocaleDateString()}
                          {isExpired && <span className="ml-1 text-[8px] bg-red-100 px-1 py-0.5">ABGELAUFEN</span>}
                        </div>
                      ) : (
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider italic">Unbefristet</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn(
                        "rounded-none font-bold uppercase text-[9px] border-none",
                        ent?.riskLevel === 'high' ? "text-red-600 bg-red-50" : "text-blue-600 bg-blue-50"
                      )}>
                        {ent?.riskLevel || 'MEDIUM'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {assignment.lastReviewedAt ? (
                        <div className="flex items-center justify-end gap-1.5 text-emerald-600 font-bold text-[10px] uppercase">
                          <CheckCircle className="w-3.5 h-3.5" /> Zertifiziert
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="h-8 text-[9px] font-bold uppercase rounded-none border-red-200 text-red-600 hover:bg-red-50"
                            onClick={() => handleReview(assignment.id, 'revoke')}
                          >
                            <XCircle className="w-3 h-3 mr-1" /> Widerruf
                          </Button>
                          <Button 
                            size="sm" 
                            className="h-8 text-[9px] font-bold uppercase rounded-none bg-emerald-600 hover:bg-emerald-700"
                            onClick={() => handleReview(assignment.id, 'certify')}
                          >
                            <CheckCircle className="w-3 h-3 mr-1" /> Bestätigen
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {!isLoading && filteredAssignments?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                    <p className="text-[10px] font-bold uppercase tracking-widest">Keine ausstehenden Reviews gefunden.</p>
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
