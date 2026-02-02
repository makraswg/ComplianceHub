"use client";

import { useParams } from 'next/navigation';
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
  Download,
  Activity,
  User as UserIcon,
  Layers,
  Shield,
  Clock,
  ExternalLink,
  Loader2
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { useState } from 'react';
import { cn } from '@/lib/utils';

export default function AuditLogPage() {
  const { tenantId } = useParams();
  const db = useFirestore();
  const [search, setSearch] = useState('');

  const auditQuery = useMemoFirebase(() => {
    return query(
      collection(db, 'tenants', tenantId as string, 'auditEvents'),
      orderBy('timestamp', 'desc')
    );
  }, [db, tenantId]);

  const { data: auditLogs, isLoading } = useCollection(auditQuery);

  const getEntityIcon = (type: string) => {
    switch (type) {
      case 'resource': return <Layers className="w-3.5 h-3.5" />;
      case 'entitlement': return <Shield className="w-3.5 h-3.5" />;
      case 'assignment': return <UserIcon className="w-3.5 h-3.5" />;
      default: return <Activity className="w-3.5 h-3.5" />;
    }
  };

  const filteredLogs = auditLogs?.filter(log => 
    log.action.toLowerCase().includes(search.toLowerCase()) ||
    log.actorUid.toLowerCase().includes(search.toLowerCase()) ||
    log.entityId.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline">Audit Logs</h1>
          <p className="text-muted-foreground mt-1">Immutable trail of all security and administrative actions.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2 h-11 px-6 border-primary text-primary hover:bg-primary/5">
            <Download className="w-5 h-5" /> Export Logs
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search by actor, action or entity ID..." 
            className="pl-10 h-11 bg-card"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button variant="outline" className="h-11 gap-2 border-dashed">
          <Filter className="w-4 h-4" /> Action Type
        </Button>
        <Button variant="outline" className="h-11 gap-2 border-dashed">
          <Clock className="w-4 h-4" /> Date Range
        </Button>
      </div>

      <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-muted-foreground font-medium">Loading audit history...</p>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-accent/30">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[200px] py-4">Timestamp</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Target Entity</TableHead>
                <TableHead className="text-right">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs?.map((log) => (
                <TableRow key={log.id} className="group transition-colors hover:bg-accent/10">
                  <TableCell className="py-4 text-xs font-medium text-muted-foreground">
                    {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'Just now'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center text-[10px] font-bold text-primary">
                        {log.actorUid.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-bold text-sm truncate max-w-[120px]">{log.actorUid}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium text-sm text-foreground">{log.action}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded bg-muted text-muted-foreground">
                        {getEntityIcon(log.entityType)}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold">{log.entityType.toUpperCase()}</span>
                        <span className="text-[10px] text-muted-foreground truncate max-w-[150px]">{log.entityId}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="text-primary hover:bg-primary/5 h-8 w-8">
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && filteredLogs?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    No audit events recorded yet.
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
