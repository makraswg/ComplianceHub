
"use client";

import { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  Layers, 
  ShieldCheck, 
  Activity, 
  RefreshCw,
  ChevronRight,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  FileDown,
  ExternalLink,
  ShieldAlert,
  FileText,
  UserCircle
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell,
  ResponsiveContainer,
  Tooltip
} from 'recharts';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { exportFullComplianceReportPdf } from '@/lib/export-utils';
import { toast } from '@/hooks/use-toast';
import { usePluggableCollection } from '@/hooks/data/use-pluggable-collection';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';
import { useSettings } from '@/context/settings-context';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';

const riskData = [
  { name: 'Niedriges Risiko', value: 65, color: '#3b82f6' },
  { name: 'Mittleres Risiko', value: 25, color: '#f59e0b' },
  { name: 'Hohes Risiko', value: 10, color: '#ef4444' },
];

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const { activeTenantId } = useSettings();

  const { data: users, isLoading: usersLoading } = usePluggableCollection<any>('users');
  const { data: resources, isLoading: resourcesLoading } = usePluggableCollection<any>('resources');
  const { data: entitlements } = usePluggableCollection<any>('entitlements');
  const { data: assignments, isLoading: assignmentsLoading } = usePluggableCollection<any>('assignments');
  const { data: auditLogs, isLoading: auditLoading } = usePluggableCollection<any>('auditEvents');

  useEffect(() => {
    setMounted(true);
  }, []);

  const filteredData = useMemo(() => {
    if (!users || !resources || !assignments) return { users: [], resources: [], assignments: [] };
    
    const fUsers = activeTenantId === 'all' ? users : users.filter((u: any) => u.tenantId === activeTenantId);
    const fResources = activeTenantId === 'all' ? resources : resources.filter((r: any) => r.tenantId === activeTenantId || r.tenantId === 'global' || !r.tenantId);
    const userIds = new Set(fUsers.map((u: any) => u.id));
    const fAssignments = assignments.filter((a: any) => userIds.has(a.userId));

    return { users: fUsers, resources: fResources, assignments: fAssignments };
  }, [users, resources, assignments, activeTenantId]);

  if (!mounted) return null;

  const stats = [
    { title: 'Benutzer', value: filteredData.users.length, icon: Users, label: 'Identitäten', color: 'text-blue-600', bg: 'bg-blue-50', loading: usersLoading },
    { title: 'Systeme', value: filteredData.resources.length, icon: Layers, label: 'Katalog', color: 'text-indigo-600', bg: 'bg-indigo-50', loading: resourcesLoading },
    { title: 'Zugriffe', value: filteredData.assignments.filter((a: any) => a.status === 'active').length, icon: ShieldCheck, label: 'Aktiv', color: 'text-emerald-600', bg: 'bg-emerald-50', loading: assignmentsLoading },
    { title: 'Audits', value: auditLogs?.length || 0, icon: Activity, label: 'Journal', color: 'text-orange-600', bg: 'bg-orange-50', loading: auditLoading },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">ComplianceHub Konsole</h1>
          <p className="text-sm text-muted-foreground">Übersicht für {activeTenantId === 'all' ? 'die gesamte IT-Landschaft' : (activeTenantId === 't1' ? 'Acme Corp' : 'Global Tech')}.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-9 font-bold uppercase text-[10px]" onClick={() => setIsReportDialogOpen(true)}>
            Compliance Bericht
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="shadow-none rounded-none border">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className={cn("p-2 rounded-sm", stat.bg, stat.color)}><stat.icon className="w-4 h-4" /></div>
                <div className="flex-1">
                  <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{stat.label}</p>
                  <h3 className="text-2xl font-bold">{stat.value}</h3>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-none rounded-none border">
          <CardHeader className="border-b bg-muted/10 py-3"><CardTitle className="text-xs font-bold uppercase tracking-widest">Zertifizierungs-Kampagne</CardTitle></CardHeader>
          <CardContent className="p-8">
            <div className="flex items-center justify-between mb-4">
              <p className="text-3xl font-bold">68%</p>
              <Badge className="rounded-none bg-blue-600 uppercase text-[9px]">Laufend</Badge>
            </div>
            <Progress value={68} className="h-2 rounded-none bg-slate-100" />
          </CardContent>
        </Card>

        <Card className="shadow-none rounded-none border">
          <CardHeader className="border-b bg-muted/10 py-3"><CardTitle className="text-xs font-bold uppercase tracking-widest">Risiko-Profil</CardTitle></CardHeader>
          <CardContent className="p-6">
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={riskData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={2} dataKey="value" stroke="none">
                    {riskData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
