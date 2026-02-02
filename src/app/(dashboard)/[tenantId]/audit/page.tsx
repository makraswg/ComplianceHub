
"use client";

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
  ExternalLink
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function AuditLogPage() {
  const auditLogs = [
    { id: '1', timestamp: '2024-03-15T10:30:00Z', actor: 'John Doe', action: 'Update Resource', entity: 'GitHub Enterprise', type: 'resource', status: 'success' },
    { id: '2', timestamp: '2024-03-15T09:15:00Z', actor: 'Security Bot', action: 'Revoke Access', entity: 'Expired validUntil', type: 'assignment', status: 'success' },
    { id: '3', timestamp: '2024-03-14T16:45:00Z', actor: 'Jane Smith', action: 'Create Entitlement', entity: 'Billing Admin (AWS)', type: 'entitlement', status: 'success' },
    { id: '4', timestamp: '2024-03-14T14:20:00Z', actor: 'System', action: 'Sync LDAP', entity: '243 users updated', type: 'system', status: 'warning' },
    { id: '5', timestamp: '2024-03-14T11:00:00Z', actor: 'Admin User', action: 'Login Success', entity: 'Web Console', type: 'auth', status: 'success' },
    { id: '6', timestamp: '2024-03-13T18:30:00Z', actor: 'Jane Smith', action: 'Approve Request', entity: 'u123 -> AWS Admin', type: 'assignment', status: 'success' },
  ];

  const getEntityIcon = (type: string) => {
    switch (type) {
      case 'resource': return <Layers className="w-3.5 h-3.5" />;
      case 'entitlement': return <Shield className="w-3.5 h-3.5" />;
      case 'assignment': return <UserIcon className="w-3.5 h-3.5" />;
      default: return <Activity className="w-3.5 h-3.5" />;
    }
  };

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
        <Table>
          <TableHeader className="bg-accent/30">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[200px] py-4">Timestamp</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Target Entity</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {auditLogs.map((log) => (
              <TableRow key={log.id} className="group transition-colors hover:bg-accent/10">
                <TableCell className="py-4 text-xs font-medium text-muted-foreground">
                  {new Date(log.timestamp).toLocaleString()}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center text-[10px] font-bold text-primary">
                      {log.actor.charAt(0)}
                    </div>
                    <span className="font-bold text-sm">{log.actor}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="font-medium text-sm text-foreground">{log.action}</span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="p-1 rounded bg-muted text-muted-foreground">
                      {getEntityIcon(log.type)}
                    </div>
                    <span className="text-xs font-medium truncate max-w-[150px]">{log.entity}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge 
                    className={cn(
                      "font-bold text-[10px] border-none px-2",
                      log.status === 'success' ? "bg-green-500/10 text-green-600" : "bg-orange-500/10 text-orange-600"
                    )}
                    variant="outline"
                  >
                    {log.status.toUpperCase()}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" className="text-primary hover:bg-primary/5 h-8 w-8">
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
