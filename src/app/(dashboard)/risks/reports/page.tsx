"use client";

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  PieChart as PieChartIcon, 
  BarChart3, 
  Download, 
  RefreshCw, 
  Scale, 
  ShieldCheck, 
  FileText,
  TrendingUp,
  AlertTriangle,
  Layers,
  ArrowUpRight,
  ChevronRight
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip as RechartsTooltip, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid,
  Legend
} from 'recharts';
import { usePluggableCollection } from '@/hooks/data/use-pluggable-collection';
import { useSettings } from '@/context/settings-context';
import { cn } from '@/lib/utils';
import { Risk, RiskMeasure } from '@/lib/types';
import { Badge } from '@/components/ui/badge';

export default function RiskReportsPage() {
  const { activeTenantId } = useSettings();
  const [mounted, setMounted] = useState(false);

  const { data: risks, isLoading: risksLoading, refresh: refreshRisks } = usePluggableCollection<Risk>('risks');
  const { data: measures, isLoading: measuresLoading } = usePluggableCollection<RiskMeasure>('riskMeasures');

  useEffect(() => {
    setMounted(true);
  }, []);

  const filteredRisks = useMemo(() => {
    if (!risks) return [];
    return risks.filter(r => activeTenantId === 'all' || r.tenantId === activeTenantId);
  }, [risks, activeTenantId]);

  const stats = useMemo(() => {
    const total = filteredRisks.length;
    const scores = filteredRisks.map(r => r.impact * r.probability);
    const critical = scores.filter(s => s >= 15).length;
    const medium = scores.filter(s => s >= 8 && s < 15).length;
    const low = scores.filter(s => s < 8).length;

    const categories = Array.from(new Set(filteredRisks.map(r => r.category)));
    const catData = categories.map(cat => ({
      name: cat,
      count: filteredRisks.filter(r => r.category === cat).length
    })).sort((a, b) => b.count - a.count);

    return { total, critical, medium, low, catData };
  }, [filteredRisks]);

  const riskPieData = [
    { name: 'Kritisch', value: stats.critical, color: '#ef4444' },
    { name: 'Mittel', value: stats.medium, color: '#FF9800' },
    { name: 'Gering', value: stats.low, color: '#10b981' },
  ].filter(d => d.value > 0);

  if (!mounted) return null;

  return (
    <div className="space-y-10 pb-20">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-200 dark:border-slate-800 pb-8">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-primary/10 text-primary flex items-center justify-center rounded-2xl border-2 border-primary/20 shadow-xl shadow-primary/5">
            <PieChartIcon className="w-9 h-9" />
          </div>
          <div>
            <Badge className="mb-2 rounded-full px-3 py-0 bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest border-none">Analysis & Reporting</Badge>
            <h1 className="text-4xl font-headline font-bold tracking-tight text-slate-900 dark:text-white">Risk Intelligence</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Aggregierte Auswertung der Bedrohungslage.</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="h-11 rounded-2xl font-bold uppercase text-[10px] tracking-widest px-6 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all" onClick={() => refreshRisks()}>
            <RefreshCw className="w-4 h-4 mr-2" /> Daten-Sync
          </Button>
          <Button className="h-11 rounded-2xl font-bold uppercase text-[10px] tracking-widest px-8 bg-slate-900 text-white shadow-xl hover:bg-black transition-all">
            <Download className="w-4 h-4 mr-2" /> PDF Export
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Heatmap Matrix */}
        <Card className="lg:col-span-2 border-none shadow-xl shadow-slate-200/50 dark:shadow-none bg-white dark:bg-slate-900 rounded-[2.5rem] overflow-hidden">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800 py-6 px-8 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-headline font-bold text-slate-800 dark:text-slate-100 uppercase tracking-tight">Risiko-Matrix</CardTitle>
              <CardDescription className="text-[10px] font-bold uppercase tracking-widest mt-0.5">Management Visualisierung</CardDescription>
            </div>
            <Badge variant="outline" className="rounded-full bg-slate-50 text-slate-500 border-none font-black text-[10px] h-6 px-3">{stats.total} Risiken</Badge>
          </CardHeader>
          <CardContent className="p-8 md:p-12">
            <div className="grid grid-cols-[40px_repeat(5,1fr)] gap-3 aspect-[4/3] max-w-2xl mx-auto">
              {/* Y-Axis Label */}
              <div className="row-span-5 flex flex-col justify-between text-[9px] font-black text-slate-400 uppercase py-6 pr-3 text-right">
                <span className="text-red-500">Kritisch</span>
                <span>Mittel</span>
                <span className="text-emerald-500">Gering</span>
              </div>
              {/* Matrix Grid */}
              <div className="col-span-5 grid grid-cols-5 grid-rows-5 gap-3">
                {Array.from({ length: 25 }).map((_, i) => {
                  const x = (i % 5) + 1;
                  const y = 5 - Math.floor(i / 5);
                  const score = x * y;
                  const cellRisks = filteredRisks.filter(r => r.impact === y && r.probability === x);
                  
                  return (
                    <div 
                      key={i} 
                      className={cn(
                        "flex items-center justify-center border-2 rounded-2xl transition-all relative group",
                        score >= 15 ? "bg-red-50/50 border-red-100" : score >= 8 ? "bg-orange-50/50 border-orange-100" : "bg-emerald-50/50 border-emerald-100",
                        cellRisks.length > 0 ? "shadow-md scale-[1.02] border-white dark:border-slate-800" : "opacity-20 grayscale"
                      )}
                    >
                      {cellRisks.length > 0 && (
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black shadow-lg animate-in zoom-in",
                          score >= 15 ? "bg-red-600 text-white" : score >= 8 ? "bg-accent text-white" : "bg-emerald-600 text-white"
                        )}>
                          {cellRisks.length}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {/* X-Axis Label */}
              <div className="col-start-2 col-span-5 flex justify-between text-[9px] font-black text-slate-400 uppercase px-6 pt-4">
                <span>Selten</span>
                <span>Gelegentlich</span>
                <span>Häufig</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Charts Sidebar */}
        <div className="space-y-8">
          <Card className="border-none shadow-xl shadow-slate-200/50 dark:shadow-none bg-white dark:bg-slate-900 rounded-[2.5rem] overflow-hidden">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800 py-5 px-8">
              <CardTitle className="text-sm font-headline font-bold uppercase tracking-widest">Risikoklassen</CardTitle>
            </CardHeader>
            <CardContent className="p-8 h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie 
                    data={riskPieData} 
                    innerRadius={65} 
                    outerRadius={90} 
                    paddingAngle={8} 
                    dataKey="value"
                    stroke="none"
                  >
                    {riskPieData.map((entry, index) => <Cell key={index} fill={entry.color} cornerRadius={8} />)}
                  </Pie>
                  <RechartsTooltip contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', fontSize: '10px', fontWeight: 'bold' }} />
                  <Legend verticalAlign="bottom" align="center" iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'black', textTransform: 'uppercase', paddingTop: '20px' }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border-none shadow-xl shadow-slate-200/50 dark:shadow-none bg-white dark:bg-slate-900 rounded-[2.5rem] overflow-hidden">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800 py-5 px-8">
              <CardTitle className="text-sm font-headline font-bold uppercase tracking-widest text-primary">Top Kategorien</CardTitle>
            </CardHeader>
            <CardContent className="p-8 h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.catData} layout="vertical" margin={{ left: -10, right: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" width={90} style={{ fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase' }} tickLine={false} axisLine={false} />
                  <RechartsTooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 10, 10, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Detail Analysis List */}
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-2xl shadow-slate-200/50 dark:shadow-none overflow-hidden">
        <div className="bg-slate-900 text-white p-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <TrendingUp className="w-6 h-6 text-primary" />
            <h3 className="font-headline font-bold text-lg uppercase tracking-widest">Detail-Analyse</h3>
          </div>
          <div className="flex gap-6">
            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-500" /><span className="text-[10px] font-black uppercase text-slate-400">High Risk</span></div>
            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-accent" /><span className="text-[10px] font-black uppercase text-slate-400">Medium Risk</span></div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-950/50 border-b border-slate-100 dark:border-slate-800">
                <th className="p-6 px-10 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Risiko-Szenario</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 text-center">Score</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Kategorie</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Eigentümer</th>
                <th className="p-6 px-10 text-right text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredRisks.sort((a, b) => (b.impact * b.probability) - (a.impact * a.probability)).map(r => {
                const score = r.impact * r.probability;
                return (
                  <tr key={r.id} className="border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="p-6 px-10">
                      <div className="font-bold text-slate-800 dark:text-slate-100 text-sm">{r.title}</div>
                      <div className="text-[9px] font-black text-slate-400 uppercase mt-1 tracking-wider">Revision: {r.lastReviewDate ? new Date(r.lastReviewDate).toLocaleDateString() : 'Ausstehend'}</div>
                    </td>
                    <td className="p-6 text-center">
                      <Badge className={cn(
                        "rounded-xl h-8 w-10 font-black text-xs border-none shadow-sm",
                        score >= 15 ? "bg-red-50 text-red-600" : score >= 8 ? "bg-orange-50 text-orange-600" : "bg-emerald-50 text-emerald-600"
                      )}>
                        {score}
                      </Badge>
                    </td>
                    <td className="p-6">
                      <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">{r.category}</span>
                    </td>
                    <td className="p-6 font-bold text-xs uppercase text-slate-600 dark:text-slate-400">{r.owner || 'N/A'}</td>
                    <td className="p-6 px-10 text-right">
                      <Badge variant="outline" className="rounded-full uppercase text-[9px] font-black border-slate-200 dark:border-slate-800 h-6 px-3">
                        {r.status}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
