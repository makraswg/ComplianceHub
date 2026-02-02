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
import { useFirestore, useCollection } from '@/firebase';
import { collection } from 'firebase/firestore';

const data = [
  { name: 'Mo', active: 400 },
  { name: 'Di', active: 300 },
  { name: 'Mi', active: 520 },
  { name: 'Do', active: 450 },
  { name: 'Fr', active: 600 },
  { name: 'Sa', active: 200 },
  { name: 'So', active: 150 },
];

const riskData = [
  { name: 'Niedrig', value: 40, color: '#10b981' },
  { name: 'Mittel', value: 30, color: '#f59e0b' },
  { name: 'Hoch', value: 15, color: '#ef4444' },
];

export default function DashboardPage() {
  const db = useFirestore();
  const [mounted, setMounted] = useState(false);

  const usersQuery = useMemo(() => collection(db, 'users'), [db]);
  const resourcesQuery = useMemo(() => collection(db, 'resources'), [db]);
  const assignmentsQuery = useMemo(() => collection(db, 'assignments'), [db]);
  const auditQuery = useMemo(() => collection(db, 'auditEvents'), [db]);

  const { data: users, isLoading: usersLoading } = useCollection(usersQuery);
  const { data: resources, isLoading: resourcesLoading } = useCollection(resourcesQuery);
  const { data: assignments, isLoading: assignmentsLoading } = useCollection(assignmentsQuery);
  const { data: auditLogs, isLoading: auditLoading } = useCollection(auditQuery);

  useEffect(() => {
    setMounted(true);
  }, []);

  const stats = [
    { title: 'Benutzer insgesamt', value: users?.length || 0, icon: Users, trend: 'LDAP-synchronisiert', color: 'text-blue-500', loading: usersLoading },
    { title: 'Ressourcen', value: resources?.length || 0, icon: Layers, trend: 'Verwaltet', color: 'text-purple-500', loading: resourcesLoading },
    { title: 'Aktive Zuweisungen', value: assignments?.length || 0, icon: ShieldCheck, trend: 'Zertifiziert', color: 'text-green-500', loading: assignmentsLoading },
    { title: 'Letzte Ereignisse', value: auditLogs?.length || 0, icon: Activity, trend: 'Aufgezeichnet', color: 'text-orange-500', loading: auditLoading },
  ];

  if (!mounted) return null;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard-Übersicht</h1>
          <p className="text-muted-foreground mt-1">Echtzeitstatistiken für Ihr Zugriffsinventar.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="gap-2">
            <Activity className="w-4 h-4" />
            Bericht exportieren
          </Button>
          <Button className="bg-primary gap-2">
            LDAP synchronisieren
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Card key={stat.title} className="border-none shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={cn("p-2 rounded-lg bg-opacity-10", stat.color.replace('text', 'bg'))}>
                  <stat.icon className={cn("w-6 h-6", stat.color)} />
                </div>
                <span className="text-xs font-medium text-muted-foreground">{stat.trend}</span>
              </div>
              <div className="space-y-1">
                {stat.loading ? (
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                ) : (
                  <h3 className="text-2xl font-bold tracking-tight">{stat.value}</h3>
                )}
                <p className="text-sm text-muted-foreground font-medium">{stat.title}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-none shadow-sm">
          <CardHeader>
            <CardTitle>Aktivitäts-Synchronisierungsverlauf</CardTitle>
            <CardDescription>Benutzersynchronisationsmuster der letzten 7 Tage.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                />
                <Bar dataKey="active" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Berechtigungs-Risikostufen</CardTitle>
            <CardDescription>Verteilung der Zugriffsrisikoprofile.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] flex flex-col items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={riskData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {riskData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex gap-4 mt-4">
              {riskData.map(item => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{backgroundColor: item.color}} />
                  <span className="text-xs font-medium text-muted-foreground">{item.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="space-y-1">
              <CardTitle>Letzte Prüfprotokolle</CardTitle>
              <CardDescription>Neueste Änderungen im Inventar.</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="gap-1 text-primary hover:text-primary hover:bg-primary/5">
              Alle anzeigen <ChevronRight className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 pt-4">
              {auditLoading ? (
                <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
              ) : auditLogs && auditLogs.length > 0 ? (
                auditLogs.slice(0, 5).map((log, i) => (
                  <div key={log.id} className="flex items-start gap-4 p-3 rounded-lg hover:bg-accent/30 transition-colors group">
                    <div className="mt-1 w-2 h-2 rounded-full bg-primary" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">{log.action}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        <span className="font-medium text-foreground">{log.actorUid}</span> hat {log.entityType} geändert
                      </p>
                    </div>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {log.timestamp ? new Date(log.timestamp).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground text-sm">Keine kürzlichen Aktivitäten gefunden.</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm border-l-4 border-l-orange-500 bg-orange-50/20">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              <CardTitle className="text-orange-950">Systemeinblicke</CardTitle>
            </div>
            <CardDescription className="text-orange-900/70">
              Zusammenfassung des Inventarzustands und des Compliance-Status.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="p-4 bg-card rounded-xl border border-orange-100 shadow-sm">
                <p className="text-sm font-bold">Überprüfungskampagne fällig</p>
                <p className="text-xs text-muted-foreground">Die vierteljährliche Zugriffsüberprüfung für Hochrisikosysteme beginnt in 3 Tagen.</p>
              </div>
              <Button variant="link" className="text-orange-600 font-bold p-0 mt-2 hover:no-underline hover:text-orange-700">
                Überprüfungskampagnen verwalten <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
