"use client";

import { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  Layers, 
  ShieldCheck, 
  Activity, 
  RefreshCw,
  TrendingUp,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { cn } from '@/lib/utils';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';

const activityData = [
  { name: 'Mo', active: 400 },
  { name: 'Di', active: 300 },
  { name: 'Mi', active: 520 },
  { name: 'Do', active: 450 },
  { name: 'Fr', active: 600 },
  { name: 'Sa', active: 200 },
  { name: 'So', active: 150 },
];

const riskData = [
  { name: 'Niedrig', value: 40, color: '#3b82f6' },
  { name: 'Mittel', value: 30, color: '#f59e0b' },
  { name: 'Hoch', value: 15, color: '#ef4444' },
];

export default function DashboardPage() {
  const db = useFirestore();
  const [mounted, setMounted] = useState(false);

  const usersQuery = useMemoFirebase(() => collection(db, 'users'), [db]);
  const resourcesQuery = useMemoFirebase(() => collection(db, 'resources'), [db]);
  const assignmentsQuery = useMemoFirebase(() => collection(db, 'assignments'), [db]);
  const auditQuery = useMemoFirebase(() => collection(db, 'auditEvents'), [db]);

  const { data: users, isLoading: usersLoading } = useCollection(usersQuery);
  const { data: resources, isLoading: resourcesLoading } = useCollection(resourcesQuery);
  const { data: assignments, isLoading: assignmentsLoading } = useCollection(assignmentsQuery);
  const { data: auditLogs, isLoading: auditLoading } = useCollection(auditQuery);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const stats = [
    { title: 'Benutzer', value: users?.length || 0, icon: Users, label: 'LDAP Sync', color: 'text-blue-600', bg: 'bg-blue-50', loading: usersLoading },
    { title: 'Systeme', value: resources?.length || 0, icon: Layers, label: 'Inventar', color: 'text-indigo-600', bg: 'bg-indigo-50', loading: resourcesLoading },
    { title: 'Zuweisungen', value: assignments?.length || 0, icon: ShieldCheck, label: 'Aktiv', color: 'text-emerald-600', bg: 'bg-emerald-50', loading: assignmentsLoading },
    { title: 'Aktionen', value: auditLogs?.length || 0, icon: Activity, label: 'Audit Log', color: 'text-orange-600', bg: 'bg-orange-50', loading: auditLoading },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">System-Übersicht</h1>
          <p className="text-sm text-muted-foreground">Aktueller Status der Identitäts- und Zugriffsumgebung.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-9 font-semibold">
            <Activity className="w-4 h-4 mr-2" /> Bericht
          </Button>
          <Button size="sm" className="h-9 font-semibold">
            <RefreshCw className="w-4 h-4 mr-2" /> LDAP Sync
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="shadow-none rounded-md">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className={cn("p-2 rounded-md", stat.bg, stat.color)}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                  <div className="flex items-baseline gap-2">
                    {stat.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <h3 className="text-2xl font-bold">{stat.value}</h3>}
                    <span className="text-xs font-medium text-muted-foreground">{stat.title}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-none rounded-md">
          <CardHeader className="border-b bg-muted/10 py-4">
            <CardTitle className="text-base">Benutzer-Aktivität (Synchronisation)</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activityData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                  <Tooltip cursor={{fill: 'rgba(0,0,0,0.02)'}} />
                  <Bar dataKey="active" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none rounded-md">
          <CardHeader className="border-b bg-muted/10 py-4">
            <CardTitle className="text-base">Risiko-Profil</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={riskData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={4} dataKey="value" stroke="none">
                    {riskData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 mt-4">
              {riskData.map(item => (
                <div key={item.name} className="flex items-center justify-between text-xs font-medium">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{backgroundColor: item.color}} />
                    <span>{item.name} Risiko</span>
                  </div>
                  <span className="text-muted-foreground">{item.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-none rounded-md">
        <CardHeader className="border-b bg-muted/10 py-4 flex flex-row items-center justify-between">
          <CardTitle className="text-base">Letzte Audit-Ereignisse</CardTitle>
          <Button variant="ghost" size="sm" className="h-8 text-xs font-bold" asChild>
            <a href="/audit">Alle anzeigen <ChevronRight className="ml-1 w-3 h-3" /></a>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {auditLogs?.slice(0, 5).map((log) => (
              <div key={log.id} className="flex items-center justify-between p-4 hover:bg-muted/5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-slate-500">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">{log.action}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{log.actorUid} • {log.entityType}</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px] uppercase font-bold px-2 py-0">
                  {log.timestamp ? new Date(log.timestamp).toLocaleDateString() : 'Jetzt'}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
