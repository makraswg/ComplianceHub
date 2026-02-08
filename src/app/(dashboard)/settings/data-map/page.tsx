
"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { 
  Network, 
  Loader2, 
  RefreshCw, 
  Maximize2, 
  Lock, 
  Unlock, 
  Shield, 
  Layers, 
  Users, 
  Activity, 
  Workflow, 
  FileCheck, 
  Tag, 
  HardDrive,
  Filter,
  Info,
  ChevronRight,
  Database,
  Search,
  Eye,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePluggableCollection } from '@/hooks/data/use-pluggable-collection';
import { useSettings } from '@/context/settings-context';
import { cn } from '@/lib/utils';
import { 
  Process, 
  Resource, 
  Risk, 
  RiskMeasure, 
  Feature, 
  ProcessingActivity, 
  User, 
  DataStore,
  ProcessVersion
} from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

/**
 * Generates mxGraph XML for the entire ecosystem.
 * Automatically distributes nodes in a grid or layout pattern.
 */
function generateEcosystemXml(data: {
  users: any[],
  resources: any[],
  processes: any[],
  risks: any[],
  measures: any[],
  features: any[],
  vvts: any[],
  stores: any[],
  links: any[]
}) {
  let xml = `<mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>`;
  
  const allNodes: any[] = [
    ...data.users.map(u => ({ id: u.id, label: u.displayName, type: 'user' })),
    ...data.resources.map(r => ({ id: r.id, label: r.name, type: 'resource' })),
    ...data.processes.map(p => ({ id: p.id, label: p.title, type: 'process' })),
    ...data.risks.map(r => ({ id: r.id, label: r.title, type: 'risk' })),
    ...data.measures.map(m => ({ id: m.id, label: m.title, type: 'measure' })),
    ...data.features.map(f => ({ id: f.id, label: f.name, type: 'feature' })),
    ...data.vvts.map(v => ({ id: v.id, label: v.name, type: 'vvt' })),
    ...data.stores.map(s => ({ id: s.id, label: s.name, type: 'store' }))
  ];

  const styles: Record<string, string> = {
    user: 'shape=ellipse;fillColor=#dbeafe;strokeColor=#2563eb;strokeWidth=2;fontStyle=1;',
    resource: 'rounded=1;fillColor=#e0e7ff;strokeColor=#4338ca;strokeWidth=2;fontStyle=1;',
    process: 'rounded=1;fillColor=#fef3c7;strokeColor=#d97706;strokeWidth=2;fontStyle=1;',
    risk: 'shape=rhombus;fillColor=#fee2e2;strokeColor=#dc2626;strokeWidth=2;fontStyle=1;',
    measure: 'rounded=1;fillColor=#d1fae5;strokeColor=#059669;strokeWidth=2;fontStyle=1;',
    feature: 'rounded=1;fillColor=#f0f9ff;strokeColor=#0ea5e9;strokeWidth=2;fontStyle=1;',
    vvt: 'shape=hexagon;fillColor=#ecfdf5;strokeColor=#10b981;strokeWidth=2;fontStyle=1;',
    store: 'shape=cylinder;fillColor=#f3f4f6;strokeColor=#4b5563;strokeWidth=2;fontStyle=1;'
  };

  const nodeWidth = 160;
  const nodeHeight = 50;
  const spacingX = 250;
  const spacingY = 120;
  const cols = 5;

  allNodes.forEach((node, idx) => {
    const row = Math.floor(idx / cols);
    const col = idx % cols;
    const x = 50 + col * spacingX;
    const y = 50 + row * spacingY;
    const style = styles[node.type] || styles.resource;
    
    xml += `<mxCell id="${node.id}" value="${node.label}" style="${style}" vertex="1" parent="1"><mxGeometry x="${x}" y="${y}" width="${nodeWidth}" height="${nodeHeight}" as="geometry"/></mxCell>`;
  });

  data.links.forEach((link, idx) => {
    const exists = allNodes.some(n => n.id === link.from) && allNodes.some(n => n.id === link.to);
    if (exists) {
      xml += `<mxCell id="link-${idx}" value="${link.label || ''}" style="edgeStyle=orthogonalEdgeStyle;rounded=1;strokeColor=#94a3b8;strokeWidth=1.5;fontSize=9;endArrow=block;endFill=1;" edge="1" parent="1" source="${link.from}" target="${link.to}"><mxGeometry relative="1" as="geometry"/></mxCell>`;
    }
  });

  xml += `</root></mxGraphModel>`;
  return xml;
}

export default function EcosystemDataMapPage() {
  const { activeTenantId } = useSettings();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [mounted, setMounted] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [search, setSearch] = useState('');
  
  // Collections
  const { data: users, isLoading: uLoad } = usePluggableCollection<User>('users');
  const { data: resources, isLoading: rLoad } = usePluggableCollection<Resource>('resources');
  const { data: processes, isLoading: pLoad } = usePluggableCollection<Process>('processes');
  const { data: versions } = usePluggableCollection<ProcessVersion>('process_versions');
  const { data: risks, isLoading: rkLoad } = usePluggableCollection<Risk>('risks');
  const { data: measures, isLoading: mLoad } = usePluggableCollection<RiskMeasure>('riskMeasures');
  const { data: features, isLoading: fLoad } = usePluggableCollection<Feature>('features');
  const { data: vvts, isLoading: vLoad } = usePluggableCollection<ProcessingActivity>('processingActivities');
  const { data: stores, isLoading: sLoad } = usePluggableCollection<DataStore>('dataStores');
  const { data: featProcs } = usePluggableCollection<any>('feature_process_steps');

  useEffect(() => { setMounted(true); }, []);

  const isLoading = uLoad || rLoad || pLoad || rkLoad || mLoad || fLoad || vLoad || sLoad;

  const ecosystemData = useMemo(() => {
    if (!mounted || isLoading) return null;

    const tFilter = (item: any) => activeTenantId === 'all' || item.tenantId === activeTenantId || item.tenantId === 'global';

    const fUsers = (users || []).filter(tFilter);
    const fResources = (resources || []).filter(tFilter);
    const fProcesses = (processes || []).filter(tFilter);
    const fRisks = (risks || []).filter(tFilter);
    const fMeasures = (measures || []).filter(tFilter);
    const fFeatures = (features || []).filter(tFilter);
    const fVvts = (vvts || []).filter(tFilter);
    const fStores = (stores || []).filter(tFilter);

    const links: any[] = [];

    // Build Relations
    fProcesses.forEach(proc => {
      // Process -> Steps -> Resources
      const ver = versions?.find(v => v.process_id === proc.id);
      ver?.model_json?.nodes?.forEach(node => {
        node.resourceIds?.forEach(rid => {
          links.push({ from: proc.id, to: rid, label: 'nutzt' });
        });
      });
    });

    fRisks.forEach(risk => {
      if (risk.assetId) links.push({ from: risk.id, to: risk.assetId, label: 'bedroht' });
    });

    fMeasures.forEach(m => {
      m.riskIds?.forEach(rid => links.push({ from: m.id, to: rid, label: 'mindert' }));
      m.resourceIds?.forEach(rid => links.push({ from: m.id, to: rid, label: 'sichert' }));
    });

    fFeatures.forEach(feat => {
      if (feat.dataStoreId) links.push({ from: feat.id, to: feat.dataStoreId, label: 'liegt in' });
      // Feature -> Process Link
      const fps = featProcs?.filter((l: any) => l.featureId === feat.id) || [];
      fps.forEach((l: any) => {
        links.push({ from: feat.id, to: l.processId, label: l.usageType });
      });
    });

    fVvts.forEach(vvt => {
      vvt.resourceIds?.forEach(rid => links.push({ from: vvt.id, to: rid, label: 'verarbeitet in' }));
    });

    return { 
      users: fUsers, resources: fResources, processes: fProcesses, 
      risks: fRisks, measures: fMeasures, features: fFeatures, 
      vvts: fVvts, stores: fStores, links 
    };
  }, [mounted, isLoading, users, resources, processes, versions, risks, measures, features, vvts, stores, featProcs, activeTenantId]);

  const syncDiagram = useCallback(() => {
    if (!iframeRef.current || !ecosystemData || isLocked) return;
    const xml = generateEcosystemXml(ecosystemData);
    iframeRef.current.contentWindow?.postMessage(JSON.stringify({ action: 'load', xml: xml, autosave: 1 }), '*');
    setTimeout(() => {
      iframeRef.current?.contentWindow?.postMessage(JSON.stringify({ action: 'zoom', type: 'fit' }), '*');
    }, 500);
  }, [ecosystemData, isLocked]);

  useEffect(() => {
    if (!mounted || isLoading) return;
    const handleMessage = (evt: MessageEvent) => {
      if (!evt.data || typeof evt.data !== 'string') return;
      try {
        const msg = JSON.parse(evt.data);
        if (msg.event === 'init') syncDiagram();
      } catch (e) {}
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [mounted, isLoading, syncDiagram]);

  if (!mounted) return null;

  return (
    <div className="space-y-6 h-[calc(100vh-120px)] flex flex-col">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b pb-6 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary shadow-sm border border-primary/10 transition-transform hover:scale-105">
            <Network className="w-6 h-6" />
          </div>
          <div>
            <Badge className="mb-1 rounded-full px-2 py-0 bg-primary/10 text-primary text-[9px] font-black uppercase tracking-wider">Ecosystem Intelligence</Badge>
            <h1 className="text-2xl font-headline font-bold text-slate-900 dark:text-white uppercase tracking-tight">Ecosystem Live-Landkarte</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Visuelle Darstellung aller Entitäten und ihrer Vernetzung.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className={cn("h-9 rounded-xl font-bold text-[10px] uppercase gap-2 border-slate-200 transition-all", isLocked ? "bg-slate-100 text-slate-400" : "hover:bg-amber-50 text-amber-600")}
            onClick={() => setIsLocked(!isLocked)}
          >
            {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
            {isLocked ? 'Layout gesperrt' : 'Layout frei'}
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="h-9 rounded-xl font-bold text-[10px] uppercase gap-2 border-slate-200"
            onClick={syncDiagram}
          >
            <RefreshCw className="w-3.5 h-3.5" /> Synchronisieren
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden border rounded-3xl bg-white dark:bg-slate-950 shadow-2xl relative">
        {/* Left Control Panel */}
        <aside className="w-80 border-r bg-slate-50/50 dark:bg-slate-900/50 flex flex-col shrink-0">
          <div className="p-6 space-y-8">
            <div className="space-y-4">
              <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                <Filter className="w-3 h-3" /> Legende & Filter
              </Label>
              <div className="grid grid-cols-1 gap-2">
                {[
                  { type: 'process', label: 'Prozesse', icon: Workflow, color: 'text-amber-600', bg: 'bg-amber-100', count: ecosystemData?.processes.length },
                  { type: 'resource', label: 'IT-Ressourcen', icon: Layers, color: 'text-indigo-600', bg: 'bg-indigo-100', count: ecosystemData?.resources.length },
                  { type: 'feature', label: 'Merkmale', icon: Tag, color: 'text-sky-600', bg: 'bg-sky-100', count: ecosystemData?.features.length },
                  { type: 'risk', label: 'Risiken', icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-100', count: ecosystemData?.risks.length },
                  { type: 'measure', label: 'Maßnahmen', icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-100', count: ecosystemData?.measures.length },
                  { type: 'vvt', label: 'DSGVO (VVT)', icon: FileCheck, color: 'text-teal-600', bg: 'bg-teal-100', count: ecosystemData?.vvts.length },
                  { type: 'store', label: 'Datenspeicher', icon: HardDrive, color: 'text-slate-600', bg: 'bg-slate-100', count: ecosystemData?.stores.length }
                ].map(item => (
                  <div key={item.type} className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-900 border border-slate-100 rounded-xl shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", item.bg, item.color)}>
                        <item.icon className="w-4 h-4" />
                      </div>
                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200">{item.label}</span>
                    </div>
                    <Badge variant="secondary" className="text-[9px] font-black h-5 min-w-[20px] justify-center">{item.count || 0}</Badge>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-5 bg-primary/5 border border-primary/10 rounded-2xl space-y-3 shadow-inner">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-primary" />
                <p className="text-[10px] font-black uppercase text-primary">Map-Status</p>
              </div>
              <p className="text-[10px] text-slate-500 italic leading-relaxed">
                Die Karte zeigt alle aktiven Elemente des Mandanten <strong>{activeTenantId === 'all' ? 'Global' : activeTenantId}</strong>. Beziehungen werden aus den Verknüpfungs-Tabellen der jeweiligen Module abgeleitet.
              </p>
            </div>
          </div>
          
          <div className="mt-auto p-6 bg-white dark:bg-slate-900 border-t">
            <Button 
              className="w-full h-11 rounded-xl bg-slate-900 hover:bg-black text-white font-black text-[10px] uppercase tracking-widest gap-2 shadow-lg active:scale-95 transition-all"
              onClick={() => iframeRef.current?.contentWindow?.postMessage(JSON.stringify({ action: 'zoom', type: 'fit' }), '*')}
            >
              <Maximize2 className="w-4 h-4" /> Vollansicht
            </Button>
          </div>
        </aside>

        {/* Main Diagram Area */}
        <main className="flex-1 bg-slate-100 dark:bg-slate-950 relative overflow-hidden">
          <iframe 
            ref={iframeRef} 
            src="https://embed.diagrams.net/?embed=1&ui=min&spin=1&proto=json" 
            className="absolute inset-0 w-full h-full border-none" 
          />
          {isLoading && (
            <div className="absolute inset-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-4">
              <Loader2 className="w-12 h-12 animate-spin text-primary opacity-20" />
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 animate-pulse">Analysiere Relationen...</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
