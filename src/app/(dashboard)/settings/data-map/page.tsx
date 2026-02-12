
"use client";

import { useState, useMemo, useEffect, useRef, useCallback, ReactNode } from 'react';
import { 
  Network, 
  Loader2, 
  RefreshCw, 
  ZoomIn,
  ZoomOut,
  Users,
  Workflow,
  Database,
  AlertTriangle,
  CheckCircle2,
  Info,
  X
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
  ProcessVersion,
  Entitlement
} from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface MapNode {
  id: string;
  type: 'user' | 'role' | 'resource' | 'process' | 'vvt' | 'risk' | 'measure';
  label: string;
  description: string;
  icon: ReactNode;
  color: string;
  x: number;
  y: number;
  count?: number;
}

interface MapLink {
  from: string;
  to: string;
  label: string;
  type: 'creates' | 'uses' | 'protects' | 'enables' | 'mitigates' | 'affects';
}

const LAYER_Y = {
  users: 100,
  processes: 200,
  resources: 200,
  vvts: 300,
  risks: 400,
  measures: 400
};

const LAYER_X = {
  users: 100,
  roles: 100,
  processes: 300,
  vvts: 550,
  resources: 800,
  features: 800,
  risks: 1050,
  measures: 1300
};

export default function EcosystemDataMapPage() {
  const { activeTenantId } = useSettings();
  const canvasRef = useRef<SVGSVGElement>(null);
  const [mounted, setMounted] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [selectedNode, setSelectedNode] = useState<MapNode | null>(null);
  
  const { data: users, isLoading: uLoad } = usePluggableCollection<User>('users');
  const { data: roles, isLoading: roLoad } = usePluggableCollection<Entitlement>('entitlements');
  const { data: resources, isLoading: rLoad } = usePluggableCollection<Resource>('resources');
  const { data: processes, isLoading: pLoad } = usePluggableCollection<Process>('processes');
  const { data: risks, isLoading: rkLoad } = usePluggableCollection<Risk>('risks');
  const { data: measures, isLoading: mLoad } = usePluggableCollection<RiskMeasure>('riskMeasures');
  const { data: vvts, isLoading: vvtLoad } = usePluggableCollection<ProcessingActivity>('processingActivities');

  useEffect(() => { setMounted(true); }, []);

  const isLoading = uLoad || rLoad || pLoad || rkLoad || mLoad || vvtLoad || roLoad;

  const { nodes, links} = useMemo(() => {
    if (!mounted || isLoading) return { nodes: [], links: [] };

    const tFilter = (item: any) => activeTenantId === 'all' || item.tenantId === activeTenantId || item.tenantId === 'global';
    
    const mapNodes: MapNode[] = [];
    const mapLinks: MapLink[] = [];

    // Layer 1: Identitäten (Users & Roles)
    const fUsers = (users || []).filter(tFilter).slice(0, 5);
    fUsers.forEach((u, i) => {
      mapNodes.push({
        id: `user-${u.id}`,
        type: 'user',
        label: u.displayName || u.email,
        description: 'Benutzer',
        icon: <Users className="w-5 h-5" />,
        color: '#3b82f6',
        x: LAYER_X.users + (i * 120),
        y: LAYER_Y.users + (i * 80),
        count: fUsers.length
      });
    });

    const fRoles = (roles || []).filter(tFilter).slice(0, 5);
    fRoles.forEach((r, i) => {
      mapNodes.push({
        id: `role-${r.id}`,
        type: 'role',
        label: r.name || 'Rolle',
        description: 'Berechtigung / Rolle',
        icon: <CheckCircle2 className="w-5 h-5" />,
        color: '#8b5cf6',
        x: LAYER_X.roles + (i * 120),
        y: LAYER_Y.users + 100 + (i * 80),
        count: fRoles.length
      });

      // User -> Role Links
      fUsers.slice(0, 2).forEach(u => {
        mapLinks.push({
          from: `user-${u.id}`,
          to: `role-${r.id}`,
          label: 'hat Rolle',
          type: 'enables'
        });
      });
    });

    // Layer 2: Prozesse & Zwecke
    const fProcesses = (processes || []).filter(tFilter).slice(0, 4);
    fProcesses.forEach((p, i) => {
      mapNodes.push({
        id: `process-${p.id}`,
        type: 'process',
        label: p.title || 'Prozess',
        description: 'Business Prozess',
        icon: <Workflow className="w-5 h-5" />,
        color: '#f59e0b',
        x: LAYER_X.processes + (i * 140),
        y: LAYER_Y.processes,
        count: fProcesses.length
      });

      // Role -> Process
      fRoles.slice(0, 2).forEach(r => {
        mapLinks.push({
          from: `role-${r.id}`,
          to: `process-${p.id}`,
          label: 'führt durch',
          type: 'uses'
        });
      });
    });

    const fVvts = (vvts || []).filter(tFilter).slice(0, 3);
    fVvts.forEach((v, i) => {
      mapNodes.push({
        id: `vvt-${v.id}`,
        type: 'vvt',
        label: v.name || 'Zweck',
        description: 'Verarbeitungszweck (VVT)',
        icon: <Database className="w-5 h-5" />,
        color: '#10b981',
        x: LAYER_X.vvts + (i * 140),
        y: LAYER_Y.vvts,
        count: fVvts.length
      });

      // Process -> VVT
      fProcesses.forEach(p => {
        mapLinks.push({
          from: `process-${p.id}`,
          to: `vvt-${v.id}`,
          label: 'erfüllt',
          type: 'creates'
        });
      });
    });

    // Layer 3: Ressourcen & Daten
    const fResources = (resources || []).filter(tFilter).slice(0, 4);
    fResources.forEach((r, i) => {
      mapNodes.push({
        id: `resource-${r.id}`,
        type: 'resource',
        label: r.name || 'Ressource',
        description: 'Asset / System / Datenbestand',
        icon: <Database className="w-5 h-5" />,
        color: '#06b6d4',
        x: LAYER_X.resources + (i * 140),
        y: LAYER_Y.resources,
        count: fResources.length
      });

      // Process -> Resource (nutzt)
      fProcesses.slice(0, 2).forEach(p => {
        mapLinks.push({
          from: `process-${p.id}`,
          to: `resource-${r.id}`,
          label: 'verarbeitet',
          type: 'uses'
        });
      });
    });

    // Layer 4: Risiken
    const fRisks = (risks || []).filter(tFilter).slice(0, 3);
    fRisks.forEach((risk, i) => {
      mapNodes.push({
        id: `risk-${risk.id}`,
        type: 'risk',
        label: risk.title || 'Risiko',
        description: 'Bedrohung / Schwachstelle',
        icon: <AlertTriangle className="w-5 h-5" />,
        color: '#ef4444',
        x: LAYER_X.risks + (i * 140),
        y: LAYER_Y.risks,
        count: fRisks.length
      });

      // Resource -> Risk (bedroht)
      fResources.slice(0, 2).forEach(r => {
        mapLinks.push({
          from: `resource-${r.id}`,
          to: `risk-${risk.id}`,
          label: 'gefährdet durch',
          type: 'affects'
        });
      });
    });

    // Layer 5: Maßnahmen & Kontrollen
    const fMeasures = (measures || []).filter(tFilter).slice(0, 3);
    fMeasures.forEach((m, i) => {
      mapNodes.push({
        id: `measure-${m.id}`,
        type: 'measure',
        label: m.name || 'Maßnahme',
        description: 'Technische / Organisatorische Maßnahme (TOM)',
        icon: <CheckCircle2 className="w-5 h-5" />,
        color: '#22c55e',
        x: LAYER_X.measures + (i * 140),
        y: LAYER_Y.measures,
        count: fMeasures.length
      });

      // Measure -> Risk (mindert)
      fRisks.slice(0, 2).forEach(r => {
        mapLinks.push({
          from: `measure-${m.id}`,
          to: `risk-${r.id}`,
          label: 'mindert',
          type: 'mitigates'
        });
      });

      // Measure -> Resource (sichert)
      fResources.slice(0, 2).forEach(r => {
        mapLinks.push({
          from: `measure-${m.id}`,
          to: `resource-${r.id}`,
          label: 'sichert',
          type: 'protects'
        });
      });
    });

    return { nodes: mapNodes, links: mapLinks };
  }, [mounted, isLoading, users, roles, resources, processes, risks, measures, vvts, activeTenantId]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsPanning(true);
    setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    setPan({
      x: e.clientX - panStart.x,
      y: e.clientY - panStart.y
    });
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleZoom = (direction: 'in' | 'out') => {
    setZoom(prev => direction === 'in' ? Math.min(prev + 0.2, 3) : Math.max(prev - 0.2, 0.5));
  };

  const handleNodeClick = (node: MapNode, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedNode(node);
  };

  if (!mounted) return null;

  return (
    <div className="space-y-6 h-[calc(100vh-120px)] flex flex-col">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b pb-6 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary shadow-sm border border-primary/10">
            <Network className="w-6 h-6" />
          </div>
          <div>
            <Badge className="mb-1 rounded-full px-2 py-0 bg-primary/10 text-primary text-[9px] font-black uppercase tracking-wider">Architecture</Badge>
            <h1 className="text-2xl font-headline font-bold text-slate-900 dark:text-white uppercase tracking-tight">Ecosystem Map</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Interaktive Karte der Funktionsweise der Anwendung - Verwenden Sie Maus zum Bewegen und Scrollen zum Zoomen</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-9 rounded-xl font-bold text-[10px] uppercase gap-2" onClick={() => handleZoom('in')}>
            <ZoomIn className="w-3.5 h-3.5" /> Rein
          </Button>
          <Button variant="outline" size="sm" className="h-9 rounded-xl font-bold text-[10px] uppercase gap-2" onClick={() => handleZoom('out')}>
            <ZoomOut className="w-3.5 h-3.5" /> Raus
          </Button>
          <Button variant="outline" size="sm" className="h-9 rounded-xl font-bold text-[10px] uppercase gap-2" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}>
            <RefreshCw className="w-3.5 h-3.5" /> Reset
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden border rounded-3xl bg-white dark:bg-slate-950 shadow-2xl relative">
        <svg
          ref={canvasRef}
          className={cn(
            "w-full h-full cursor-grab active:cursor-grabbing select-none",
            isPanning && "cursor-grabbing"
          )}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{ backgroundColor: '#fafafa' }}
        >
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
              <polygon points="0 0, 10 3, 0 6" fill="#94a3b8" />
            </marker>
          </defs>

          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
            {/* Links / Connections */}
            {links.map((link, idx) => {
              const fromNode = nodes.find(n => n.id === link.from);
              const toNode = nodes.find(n => n.id === link.to);
              if (!fromNode || !toNode) return null;

              const midX = (fromNode.x + toNode.x) / 2;
              const midY = (fromNode.y + toNode.y) / 2;

              return (
                <g key={`link-${idx}`}>
                  <path
                    d={`M ${fromNode.x} ${fromNode.y} L ${toNode.x} ${toNode.y}`}
                    stroke="#cbd5e1"
                    strokeWidth="2"
                    fill="none"
                    markerEnd="url(#arrowhead)"
                  />
                  <text
                    x={midX}
                    y={midY - 8}
                    fontSize="11"
                    fill="#64748b"
                    textAnchor="middle"
                    fontWeight="600"
                    pointerEvents="none"
                  >
                    {link.label}
                  </text>
                </g>
              );
            })}

            {/* Nodes */}
            {nodes.map(node => (
              <g
                key={node.id}
                className="cursor-pointer group"
                onClick={(e) => handleNodeClick(node, e)}
              >
                {/* Node Background Circle */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r="45"
                  fill={node.color}
                  opacity="0.1"
                  className="group-hover:opacity-20 transition-opacity"
                  stroke={node.color}
                  strokeWidth="2"
                />

                {/* Node Icon */}
                <foreignObject x={node.x - 20} y={node.y - 20} width="40" height="40">
                  <div className="w-full h-full flex items-center justify-center text-white drop-shadow-lg" style={{ color: node.color }}>
                    {node.icon}
                  </div>
                </foreignObject>

                {/* Node Label */}
                <text
                  x={node.x}
                  y={node.y + 65}
                  fontSize="12"
                  fontWeight="bold"
                  fill="#1e293b"
                  textAnchor="middle"
                  className="group-hover:fill-primary transition-colors"
                  pointerEvents="none"
                >
                  {node.label.substring(0, 20)}
                </text>

                {/* Node Type */}
                <text
                  x={node.x}
                  y={node.y + 82}
                  fontSize="9"
                  fill="#64748b"
                  textAnchor="middle"
                  fontWeight="600"
                  pointerEvents="none"
                >
                  {node.description}
                </text>
              </g>
            ))}
          </g>
        </svg>

        {isLoading && (
          <div className="absolute inset-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-4 rounded-3xl">
            <Loader2 className="w-12 h-12 animate-spin text-primary opacity-20" />
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 animate-pulse">Lade Ecosystem Karte...</p>
          </div>
        )}
      </div>

      {/* Details Panel */}
      {selectedNode && (
        <div className="fixed bottom-6 left-6 z-50 max-w-sm w-full">
          <Card className="rounded-2xl shadow-2xl border-2" style={{ borderColor: selectedNode.color }}>
            <CardHeader className="pb-3 pt-4 px-4 flex flex-row items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: selectedNode.color + '20', color: selectedNode.color }}>
                  {selectedNode.icon}
                </div>
                <div>
                  <CardTitle className="text-sm font-bold">{selectedNode.label}</CardTitle>
                  <p className="text-[10px] text-slate-500 font-bold">{selectedNode.description}</p>
                </div>
              </div>
              <button onClick={() => setSelectedNode(null)} className="p-1 hover:bg-slate-100 rounded-lg transition-colors">
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </CardHeader>
            <CardContent className="text-[11px] space-y-2 pb-4">
              <div>
                <p className="font-bold text-slate-600 mb-1">Verbindungen:</p>
                <ul className="space-y-1">
                  {links
                    .filter(l => l.from === selectedNode.id || l.to === selectedNode.id)
                    .map((l, i) => (
                      <li key={i} className="text-slate-500 flex items-center gap-2">
                        → {l.label}
                      </li>
                    ))}
                </ul>
              </div>
              <div className="text-slate-400 text-[9px] pt-2 border-t">
                {selectedNode.count && selectedNode.count > 1 && (
                  <p>+ {selectedNode.count - 1} weitere Objekte diesen Typs</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
