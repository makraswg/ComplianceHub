"use client";

import { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  Layers, 
  ShieldCheck, 
  AlertTriangle, 
  ArrowRight,
  Activity,
  ChevronRight,
  Loader2,
  RefreshCw,
  TrendingUp
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
  { name: 'Niedrig', value: 40, color: '#29ABE2' },
  { name: 'Mittel', value: 30, color: '#FF9800' },
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

  const stats = [
    { title: 'Benutzer', value: users?.length || 0, icon: Users, trend: 'LDAP Sync', color: 'bg-blue-500', loading: usersLoading },
    { title: 'Systeme', value: resources?.length || 0, icon: Layers, trend: 'Inventarisiert', color: 'bg-purple-500', loading: resourcesLoading },
    { title: 'Zugriffe', value: assignments?.length || 0, icon: ShieldCheck, trend: 'Zertifiziert', color: 'bg-green-500', loading: assignmentsLoading },
    { title: 'Aktionen', value: auditLogs?.length || 0, icon: Activity, trend: 'Audit Trail', color: 'bg-orange-500', loading: auditLoading },
  ];

  if (!mounted) return null;

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold font-headline tracking-tighter">Willkommen, Max</h1>
          <p className="text-muted-foreground mt-2 font-medium">Ihre Sicherheitsumgebung ist auf dem neuesten Stand.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="h-12 px-6 rounded-xl border-2 hover:bg-accent/10 transition-all font-bold">
            <Activity className="w-5 h-5 mr-2" />
            Bericht generieren
          </Button>
          <Button className="h-12 px-8 rounded-xl bg-primary shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-all font-bold">
            <RefreshCw className="w-5 h-5 mr-2" />
            LDAP Synchronisieren
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Card key={stat.title} className="border-none shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 glass-card">
            <CardContent className="p-8">
              <div className="flex items-center justify-between mb-6">
                <div className={cn("p-4 rounded-2xl text-white shadow-lg", stat.color)}>
                  <stat.icon className="w-6 h-6" />
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{stat.trend}</span>
                </div>
              </div>
              <div className="space-y-1">
                {stat.loading ? (
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                ) : (
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-4xl font-bold tracking-tighter">{stat.value}</h3>
                    <TrendingUp className="w-4 h-4 text-green-500" />
                  </div>
                )}
                <p className="text-sm text-muted-foreground font-bold uppercase tracking-tight mt-1">{stat.title}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 border-none shadow-xl glass-card">
          <CardHeader className="p-8">
            <CardTitle className="text-xl font-bold">Synchronisations-Aktivität</CardTitle>
            <CardDescription>Verlauf der Benutzeränderungen über die letzte Woche.</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px] p-8 pt-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activityData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12, fontWeight: 600}} dy={15} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12, fontWeight: 600}} />
                <Tooltip 
                  cursor={{fill: 'rgba(41, 171, 226, 0.05)'}}
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)'}}
                />
                <Bar dataKey="active" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl glass-card">
          <CardHeader className="p-8">
            <CardTitle className="text-xl font-bold">Risiko-Profil</CardTitle>
            <CardDescription>Berechtigungs-Klassifizierung.</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px] p-8 pt-0 flex flex-col items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={riskData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={110}
                  paddingAngle={8}
                  dataKey="value"
                  stroke="none"
                >
                  {riskData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-3 gap-4 mt-8 w-full">
              {riskData.map(item => (
                <div key={item.name} className="flex flex-col items-center gap-1">
                  <div className="w-full h-1.5 rounded-full" style={{backgroundColor: item.color}} />
                  <span className="text-[10px] font-bold text-muted-foreground uppercase mt-1">{item.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-10">
        <Card className="border-none shadow-xl glass-card">
          <CardHeader className="p-8 flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-xl font-bold">Letzte Audit-Ereignisse</CardTitle>
              <CardDescription>Sicherheitsrelevante Änderungen.</CardDescription>
            </div>
            <Button variant="ghost" className="rounded-xl font-bold text-primary hover:bg-primary/5">
              Alle Logs <ChevronRight className="ml-2 w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent className="px-8 pb-8">
            <div className="space-y-4">
              {auditLoading ? (
                <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>
              ) : auditLogs && auditLogs.length > 0 ? (
                auditLogs.slice(0, 5).map((log) => (
                  <div key={log.id} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-accent/5 transition-all group border border-transparent hover:border-accent/10">
                    <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent group-hover:bg-accent group-hover:text-white transition-colors shadow-sm">
                      <Activity className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate group-hover:text-primary transition-colors">{log.action}</p>
                      <p className="text-[10px] text-muted-foreground mt-1 font-medium">
                        Akteur: <span className="text-foreground">{log.actorUid}</span> • {log.entityType}
                      </p>
                    </div>
                    <Badge variant="outline" className="rounded-lg text-[10px] font-bold py-1 border-muted text-muted-foreground">
                      {log.timestamp ? new Date(log.timestamp).toLocaleDateString() : 'JETZT'}
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-muted-foreground font-medium italic">Keine aktuellen Aktivitäten.</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl border-l-8 border-l-accent glass-card overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <AlertTriangle className="w-32 h-32" />
          </div>
          <CardHeader className="p-8">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/20">
                <AlertTriangle className="w-6 h-6 text-accent" />
              </div>
              <CardTitle className="text-xl font-bold">Compliance-Fokus</CardTitle>
            </div>
            <CardDescription className="font-medium mt-2">
              Kritische Aufgaben für die aktuelle Zertifizierungsperiode.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-8 pb-8 space-y-6">
            <div className="p-6 bg-accent/5 rounded-2xl border border-accent/10 relative overflow-hidden group">
              <div className="absolute inset-0 bg-accent/5 translate-x-full group-hover:translate-x-0 transition-transform duration-500" />
              <div className="relative">
                <p className="text-sm font-bold text-foreground/90">Quartals-Review fällig</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  34 hochriskante Berechtigungen müssen innerhalb der nächsten 48 Stunden zertifiziert werden.
                </p>
              </div>
            </div>
            <Button className="w-full h-12 bg-accent hover:bg-accent/90 shadow-lg shadow-accent/20 rounded-xl font-bold transition-all">
              Zertifizierungs-Kampagne starten <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
