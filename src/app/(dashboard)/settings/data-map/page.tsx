
"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { 
  Network, 
  Loader2, 
  RefreshCw, 
  Maximize2, 
  Lock, 
  Unlock, 
  Activity, 
  Workflow, 
  FileCheck, 
  Tag, 
  HardDrive,
  Filter,
  Info,
  Layers,
  Users,
  Shield,
  Target,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  ProcessVersion,
  Entitlement
} from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

/**
 * Generates mxGraph XML for the Ecosystem 2.0 (The Golden Chain).
 * Uses a columnar layout: Users/Roles -> Processes -> Assets/Data -> Risks -> Controls.
 */
function generateEcosystemXml(data: {
  users: any[],
  roles: any[],
  resources: any[],
  processes: any[],
  risks: any[],
  measures: any[],
  features: any[],
  vvts: any[],
  links: any[]
}) {
  let xml = `<mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>`;
  
  const COLUMN_WIDTH = 300;
  const ROW_HEIGHT = 80;
  const MARGIN_LEFT = 50;
  const MARGIN_TOP = 50;

  const columns = [
    { type: 'user_role', label: 'Identitäten & Rollen', items: [...data.users, ...data.roles] },
    { type: 'process_vvt', label: 'Workflows & Zwecke', items: [...data.processes, ...data.vvts] },
    { type: 'asset_data', label: 'Assets & Daten', items: [...data.resources, ...data.features] },
    { type: 'risk', label: 'Bedrohungen', items: data.risks },
    { type: 'measure', label: 'TOM / Kontrollen', items: data.measures }
  ];

  const styles: Record<string, string> = {
    user: 'shape=ellipse;fillColor=#dbeafe;strokeColor=#2563eb;strokeWidth=2;fontStyle=1;',
    entitlement: 'shape=hexagon;fillColor=#dbeafe;strokeColor=#2563eb;strokeWidth=1;',
    resource: 'rounded=1;fillColor=#e0e7ff;strokeColor=#4338ca;strokeWidth=2;fontStyle=1;',
    process: 'rounded=1;fillColor=#fef3c7;strokeColor=#d97706;strokeWidth=2;fontStyle=1;',
    risk: 'shape=rhombus;fillColor=#fee2e2;strokeColor=#dc2626;strokeWidth=2;fontStyle=1;',
    measure: 'rounded=1;fillColor=#d1fae5;strokeColor=#059669;strokeWidth=2;fontStyle=1;',
    feature: 'rounded=1;fillColor=#f0f9ff;strokeColor=#0ea5e9;strokeWidth=2;fontStyle=1;',
    vvt: 'shape=hexagon;fillColor=#ecfdf5;strokeColor=#10b981;strokeWidth=2;fontStyle=1;'
  };

  const nodeWidth = 180;
  const nodeHeight = 50;

  // Render Nodes
  columns.forEach((col, colIdx) => {
    col.items.forEach((item, rowIdx) => {
      const x = MARGIN_LEFT + colIdx * COLUMN_WIDTH;
      const y = MARGIN_TOP + rowIdx * ROW_HEIGHT;
      
      let type = 'resource';
      if ('displayName' in item) type = 'user';
      else if ('riskLevel' in item) type = 'entitlement';
      else if ('impact' in item) type = 'risk';
      else if ('vvtId' in item) type = 'process';
      else if ('carrier' in item) type = 'feature';
      else if ('legalBasis' in item) type = 'vvt';
      else if ('isTom' in item) type = 'measure';

      const label = item.name || item.title || item.displayName;
      xml += `<mxCell id="${item.id}" value="${label}" style="${styles[type]}" vertex="1" parent="1"><mxGeometry x="${x}" y="${y}" width="${nodeWidth}" height="${nodeHeight}" as="geometry"/></mxCell>`;
    });
  });

  // Render Links
  data.links.forEach((link, idx) => {
    xml += `<mxCell id="link-${idx}" value="${link.label || ''}" style="edgeStyle=orthogonalEdgeStyle;rounded=1;strokeColor=#94a3b8;strokeWidth=1.5;fontSize=9;endArrow=block;endFill=1;curved=1;" edge="1" parent="1" source="${link.from}" target="${link.to}"><mxGeometry relative="1" as="geometry"/></mxCell>`;
  });

  xml += `</root></mxGraphModel>`;
  return xml;
}

export default function EcosystemDataMapPage() {
  const { activeTenantId } = useSettings();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [mounted, setMounted] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [isIframeReady, setIsIframeReady] = useState(false);
  
  const { data: users, isLoading: uLoad } = usePluggableCollection<User>('users');
  const { data: roles, isLoading: roLoad } = usePluggableCollection<Entitlement>('entitlements');
  const { data: resources, isLoading: rLoad } = usePluggableCollection<Resource>('resources');
  const { data: processes, isLoading: pLoad } = usePluggableCollection<Process>('processes');
  const { data: versions, isLoading: verLoad } = usePluggableCollection<ProcessVersion>('process_versions');
  const { data: risks, isLoading: rkLoad } = usePluggableCollection<Risk>('risks');
  const { data: measures, isLoading: mLoad } = usePluggableCollection<RiskMeasure>('riskMeasures');
  const { data: features, isLoading: fLoad } = usePluggableCollection<Feature>('features');
  const { data: vvts, isLoading: vvtLoad } = usePluggableCollection<ProcessingActivity>('processingActivities');
  const { data: featProcs, isLoading: fpLoad } = usePluggableCollection<any>('feature_process_steps');

  useEffect(() => { setMounted(true); }, []);

  const isLoading = uLoad || rLoad || pLoad || verLoad || rkLoad || mLoad || fLoad || vvtLoad || roLoad || fpLoad;

  const ecosystemData = useMemo(() => {
    if (!mounted || isLoading) return null;

    const tFilter = (item: any) => activeTenantId === 'all' || item.tenantId === activeTenantId || item.tenantId === 'global';

    const fUsers = (users || []).filter(tFilter).slice(0, 10);
    const fRoles = (roles || []).filter(tFilter).slice(0, 15);
    const fResources = (resources || []).filter(tFilter).slice(0, 15);
    const fProcesses = (processes || []).filter(tFilter).slice(0, 15);
    const fRisks = (risks || []).filter(tFilter).slice(0, 15);
    const fMeasures = (measures || []).filter(tFilter).slice(0, 15);
    const fFeatures = (features || []).filter(tFilter).slice(0, 15);
    const fVvts = (vvts || []).filter(tFilter).slice(0, 10);

    const links: any[] = [];

    // Chain: Process -> VVT
    fProcesses.forEach(p => {
      if (p.vvtId) links.push({ from: p.id, to: p.vvtId, label: 'erfüllt Zweck' });
      const ver = versions?.find(v => v.process_id === p.id);
      ver?.model_json?.nodes?.forEach(n => {
        n.resourceIds?.forEach(rid => links.push({ from: p.id, to: rid, label: 'nutzt' }));
      });
    });

    // Chain: Risk -> Asset
    fRisks.forEach(r => {
      if (r.assetId) links.push({ from: r.id, to: r.assetId, label: 'bedroht' });
      if (r.processId) links.push({ from: r.id, to: r.processId, label: 'stört' });
    });

    // Chain: Measure -> Risk / Asset
    fMeasures.forEach(m => {
      m.riskIds?.forEach(rid => links.push({ from: m.id, to: rid, label: 'mindert' }));
      m.resourceIds?.forEach(rid => links.push({ from: m.id, to: rid, label: 'sichert' }));
    });

    // Chain: User -> Role -> Resource
    fRoles.forEach(role => {
      if (role.resourceId) links.push({ from: role.id, to: role.resourceId, label: 'berechtigt' });
    });

    return { 
      users: fUsers, roles: fRoles, resources: fResources, processes: fProcesses, 
      risks: fRisks, measures: fMeasures, features: fFeatures, 
      vvts: fVvts, links 
    };
  }, [mounted, isLoading, users, roles, resources, processes, versions, risks, measures, features, vvts, activeTenantId]);

  const syncDiagram = useCallback(() => {
    if (!iframeRef.current || !ecosystemData || isLocked || !isIframeReady) return;
    const xml = generateEcosystemXml(ecosystemData);
    iframeRef.current.contentWindow?.postMessage(JSON.stringify({ action: 'load', xml: xml, autosave: 1 }), '*');
    setTimeout(() => iframeRef.current?.contentWindow?.postMessage(JSON.stringify({ action: 'zoom', type: 'fit' }), '*'), 500);
  }, [ecosystemData, isLocked, isIframeReady]);

  useEffect(() => {
    if (!mounted) return;
    const handleMessage = (evt: MessageEvent) => {
      if (!evt.data || typeof evt.data !== 'string') return;
      try {
        const msg = JSON.parse(evt.data);
        if (msg.event === 'init') setIsIframeReady(true);
      } catch (e) {}
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [mounted]);

  useEffect(() => {
    if (isIframeReady && ecosystemData && !isLocked) syncDiagram();
  }, [isIframeReady, ecosystemData, isLocked, syncDiagram]);

  if (!mounted) return null;

  return (
    <div className="space-y-6 h-[calc(100vh-120px)] flex flex-col">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b pb-6 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary shadow-sm border border-primary/10">
            <Network className="w-6 h-6" />
          </div>
          <div>
            <Badge className="mb-1 rounded-full px-2 py-0 bg-primary/10 text-primary text-[9px] font-black uppercase tracking-wider">Ecosystem 2.0</Badge>
            <h1 className="text-2xl font-headline font-bold text-slate-900 dark:text-white uppercase tracking-tight">The Golden Chain</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Visuelle Verknüpfung von Zwecken, Prozessen und Kontrollen.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className={cn("h-9 rounded-xl font-bold text-[10px] uppercase gap-2", isLocked ? "bg-slate-100 text-slate-400" : "hover:bg-amber-50 text-amber-600")}
            onClick={() => setIsLocked(!isLocked)}
          >
            {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
            {isLocked ? 'Layout fixiert' : 'Auto Layout'}
          </Button>
          <Button variant="outline" size="sm" className="h-9 rounded-xl font-bold text-[10px] uppercase gap-2" onClick={syncDiagram}>
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden border rounded-3xl bg-white dark:bg-slate-950 shadow-2xl relative">
        <main className="flex-1 bg-slate-100 dark:bg-slate-950 relative overflow-hidden">
          <iframe ref={iframeRef} src="https://embed.diagrams.net/?embed=1&ui=min&spin=1&proto=json" className="absolute inset-0 w-full h-full border-none" />
          {(isLoading || !isIframeReady) && (
            <div className="absolute inset-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-4">
              <Loader2 className="w-12 h-12 animate-spin text-primary opacity-20" />
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 animate-pulse">Lade Governance Kette...</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
