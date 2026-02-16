
"use client";

import { useState, useEffect, useMemo, useRef, useCallback, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { 
  ChevronLeft, 
  Loader2, 
  ShieldCheck,
  Activity, 
  ExternalLink,
  Info,
  Briefcase,
  Building2,
  CheckCircle2,
  GitBranch,
  ArrowRight,
  Clock,
  Layers,
  Zap,
  Target,
  Server,
  AlertCircle,
  FileCheck,
  LayoutGrid,
  List,
  PlayCircle,
  Maximize2,
  Minus,
  Plus,
  Edit3,
  ArrowRightCircle,
  ArrowDownCircle,
  ArrowUpCircle,
  Workflow,
  Scale,
  ImageIcon,
  Paperclip,
  FileDown,
  Crosshair,
  ChevronDown,
  RefreshCw,
  X
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { usePluggableCollection } from '@/hooks/data/use-pluggable-collection';
import { useSettings } from '@/context/settings-context';
import { 
  Process, 
  ProcessVersion, 
  ProcessNode, 
  Department, 
  Feature, 
  Resource, 
  ProcessingActivity, 
  JobTitle,
  UiConfig,
  MediaFile,
  Tenant,
  ProcessType,
  User
} from '@/lib/types';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { exportDetailedProcessPdf } from '@/lib/export-utils';
import { toast } from '@/hooks/use-toast';

const OFFSET_X = 2500;
const OFFSET_Y = 2500;
const H_GAP = 350;
const V_GAP = 160;
const COLLAPSED_NODE_HEIGHT = 82;
const EXPANDED_NODE_HEIGHT = 460;

function ProcessDetailViewContent() {
  const { id } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { dataSource, activeTenantId } = useSettings();
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [mounted, setMounted] = useState(false);
  const [guideMode, setGuideMode] = useState<'list' | 'structure'>('structure');
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [connectionPaths, setConnectionPaths] = useState<any[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<MediaFile | null>(null);

  const [scale, setScale] = useState(0.8);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isProgrammaticMove, setIsProgrammaticMove] = useState(false);
  
  const hasAutoCentered = useRef(false);
  const stateRef = useRef({ position, scale, guideMode });
  
  useEffect(() => {
    stateRef.current = { position, scale, guideMode };
  }, [position, scale, guideMode]);

  const { data: uiConfigs } = usePluggableCollection<UiConfig>('uiConfigs');
  const { data: processes, refresh } = usePluggableCollection<Process>('processes');
  const { data: versions } = usePluggableCollection<any>('process_versions');
  const { data: jobTitles } = usePluggableCollection<JobTitle>('jobTitles');
  const { data: departments } = usePluggableCollection<Department>('departments');
  const { data: allFeatures } = usePluggableCollection<Feature>('features');
  const { data: resources } = usePluggableCollection<Resource>('resources');
  const { data: tenants } = usePluggableCollection<Tenant>('tenants');
  const { data: mediaFiles } = usePluggableCollection<MediaFile>('media');
  const { data: activities } = usePluggableCollection<ProcessingActivity>('processingActivities');
  const { data: processTypes } = usePluggableCollection<ProcessType>('process_types');
  const { data: users } = usePluggableCollection<User>('users');
  
  const currentProcess = useMemo(() => processes?.find((p: any) => p.id === id) || null, [processes, id]);
  const activeVersion = useMemo(() => versions?.find((v: any) => v.process_id === id && v.version === currentProcess?.currentVersion), [versions, id, currentProcess]);
  const processType = useMemo(() => processTypes?.find(pt => pt.id === currentProcess?.process_type_id), [processTypes, currentProcess]);
  const owner = useMemo(() => users?.find(u => u.id === currentProcess?.ownerUserId), [users, currentProcess]);
  const emergencyProcess = useMemo(() => processes?.find(p => p.id === currentProcess?.emergencyProcessId), [processes, currentProcess]);
  const processingActivity = useMemo(() => activities?.find(a => a.originalId === currentProcess?.vvtId), [activities, currentProcess]);

  const animationsEnabled = useMemo(() => {
    if (!uiConfigs || uiConfigs.length === 0) return true;
    return uiConfigs[0].enableAdvancedAnimations === true || uiConfigs[0].enableAdvancedAnimations === 1;
  }, [uiConfigs]);

  const gridNodes = useMemo(() => {
    if (!activeVersion) return [];
    const nodes = activeVersion.model_json.nodes || [];
    const edges = activeVersion.model_json.edges || [];
    
    const levels: Record<string, number> = {};
    const lanes: Record<string, number> = {};
    const occupiedLanesPerLevel = new Map<number, Set<number>>();

    nodes.forEach(n => levels[n.id] = 0);
    let changed = true;
    let limit = nodes.length * 2;
    while (changed && limit > 0) {
      changed = false;
      edges.forEach(edge => {
        if (levels[edge.target] <= levels[edge.source]) {
          levels[edge.target] = levels[edge.source] + 1;
          changed = true;
        }
      });
      limit--;
    }

    const processed = new Set<string>();
    const queue = nodes.filter(n => !edges.some(e => e.target === n.id)).map(n => ({ id: n.id, lane: 0 }));
    
    while (queue.length > 0) {
      const { id, lane } = queue.shift()!;
      if (processed.has(id)) continue;
      
      const lv = levels[id];
      let finalLane = lane;
      if (!occupiedLanesPerLevel.has(lv)) occupiedLanesPerLevel.set(lv, new Set());
      const levelOccupancy = occupiedLanesPerLevel.get(lv)!;
      while (levelOccupancy.has(finalLane)) { finalLane++; }
      
      lanes[id] = finalLane;
      levelOccupancy.add(finalLane);
      processed.add(id);

      const children = edges.filter(e => e.source === id).map(e => {
        const found = nodes.find(n => n.id === e.target);
        return found ? e.target : null;
      }).filter(Boolean);
      
      children.forEach((childId, idx) => { 
        if (childId) queue.push({ id: childId, lane: finalLane + idx }); 
      });
    }

    const WIDTH_DIFF = 600 - 256;

    return nodes.map(n => {
      const lane = lanes[n.id] || 0;
      const lv = levels[n.id] || 0;
      let x = lane * H_GAP;
      let y = lv * V_GAP;

      if (activeNodeId === n.id) {
        // No movement
      } else if (activeNodeId) {
        const activeLv = levels[activeNodeId];
        const activeLane = lanes[activeNodeId];
        if (lv === activeLv) {
          if (lane > activeLane) x += (WIDTH_DIFF / 2) + 40;
          if (lane < activeLane) x -= (WIDTH_DIFF / 2) + 40;
        }
        if (lv > activeLv) { y += 340; }
      }
      return { ...n, x, y };
    });
  }, [activeVersion, activeNodeId]);

  const centerOnNode = useCallback((nodeId: string) => {
    const node = gridNodes.find(n => n.id === nodeId);
    if (!node || !containerRef.current) return;

    if (guideMode === 'structure') {
      setIsProgrammaticMove(true);
      const containerWidth = containerRef.current.clientWidth;
      const containerHeight = containerRef.current.clientHeight;

      const edges = activeVersion?.model_json?.edges || [];
      const neighborIds = new Set<string>([nodeId]);
      edges.forEach((edge: any) => {
        if (edge.source === nodeId) neighborIds.add(edge.target);
        if (edge.target === nodeId) neighborIds.add(edge.source);
      });

      let top = Infinity;
      let bottom = -Infinity;
      gridNodes.forEach(n => {
        if (!neighborIds.has(n.id)) return;
        const height = n.id === nodeId ? EXPANDED_NODE_HEIGHT : COLLAPSED_NODE_HEIGHT;
        const y = n.y + OFFSET_Y;
        top = Math.min(top, y);
        bottom = Math.max(bottom, y + height);
      });

      const spanHeight = Number.isFinite(top) && Number.isFinite(bottom)
        ? (bottom - top)
        : (EXPANDED_NODE_HEIGHT + (V_GAP * 2));

      const availableHeight = Math.max(200, containerHeight - 60);
      const targetScale = Math.min(1.15, Math.max(0.75, availableHeight / spanHeight));

      const nodeWidth = nodeId === node.id ? 600 : 256;
      const nodeCenterX = node.x + OFFSET_X + (nodeWidth / 2);
      const nodeCenterY = (Number.isFinite(top) && Number.isFinite(bottom))
        ? ((top + bottom) / 2)
        : (node.y + OFFSET_Y + (EXPANDED_NODE_HEIGHT / 2));

      setPosition({
        x: -(nodeCenterX * targetScale) + (containerWidth / 2),
        y: -(nodeCenterY * targetScale) + (containerHeight / 2)
      });
      setScale(targetScale);
      setTimeout(() => setIsProgrammaticMove(false), 850);
    } else {
      const el = document.getElementById(`list-node-${nodeId}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [gridNodes, guideMode]);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (mounted && !hasAutoCentered.current && gridNodes.length > 0) {
      const startNode = gridNodes.find(n => n.type === 'start') || gridNodes[0];
      centerOnNode(startNode.id);
      hasAutoCentered.current = true;
    }
  }, [mounted, gridNodes, centerOnNode]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const canScrollInside = (target: HTMLElement | null) => {
      if (!target) return false;
      if (target.closest('[data-allow-scroll="true"]')) return true;
      let el: HTMLElement | null = target;
      while (el && el !== containerRef.current) {
        const style = window.getComputedStyle(el);
        const isScrollable = (style.overflowY === 'auto' || style.overflowY === 'scroll') && el.scrollHeight > el.clientHeight;
        if (isScrollable) return true;
        el = el.parentElement;
      }
      return false;
    };

    const handleWheelNative = (e: WheelEvent) => {
      const { position: pos, scale: s, guideMode: mode } = stateRef.current;
      if (mode !== 'structure') return;
      const target = e.target as HTMLElement | null;
      if (canScrollInside(target)) return;
      e.preventDefault();
      
      const delta = e.deltaY * -0.001;
      const newScale = Math.min(Math.max(0.2, s + delta), 2);
      
      const rect = el.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      const pivotX = (mouseX - pos.x) / s;
      const pivotY = (mouseY - pos.y) / s;
      
      const newX = mouseX - pivotX * newScale;
      const newY = mouseY - pivotY * newScale;
      
      setPosition({ x: newX, y: newY });
      setScale(newScale);
    };

    el.addEventListener('wheel', handleWheelNative, { passive: false });
    return () => el.removeEventListener('wheel', handleWheelNative);
  }, []);

  const updateFlowLines = useCallback(() => {
    if (!activeVersion || gridNodes.length === 0) { setConnectionPaths([]); return; }
    const edges = activeVersion.model_json.edges || [];
    const newPaths: any[] = [];

    edges.forEach((edge, i) => {
      const sNode = gridNodes.find(n => n.id === edge.source);
      const tNode = gridNodes.find(n => n.id === edge.target);
      if (sNode && tNode) {
        const sIsExp = sNode.id === activeNodeId;
        const isPathActive = sIsExp || tNode.id === activeNodeId;
        const sH = sIsExp ? EXPANDED_NODE_HEIGHT : COLLAPSED_NODE_HEIGHT; 
        const sX = sNode.x + OFFSET_X + 128;
        const sY = sNode.y + OFFSET_Y + sH;
        const tX = tNode.x + OFFSET_X + 128;
        const tY = tNode.y + OFFSET_Y;
        
        const dy = tY - sY;
        const path = `M ${sX} ${sY} C ${sX} ${sY + dy/2}, ${tX} ${tY - dy/2}, ${tX} ${tY}`;
        newPaths.push({ id: i, path, sourceId: edge.source, targetId: edge.target, label: edge.label, isActive: isPathActive });
      }
    });
    setConnectionPaths(newPaths);
  }, [activeVersion, gridNodes, activeNodeId]);

  useEffect(() => { updateFlowLines(); }, [gridNodes, activeNodeId, updateFlowLines]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0 || guideMode !== 'structure') return;
    setIsProgrammaticMove(false); 
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || guideMode !== 'structure') return;
    setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = () => { setIsDragging(false); };

  const handleNodeClick = useCallback((nodeId: string) => {
    if (activeNodeId === nodeId) {
      setActiveNodeId(null);
    } else {
      setActiveNodeId(nodeId);
      setTimeout(() => centerOnNode(nodeId), 50);
    }
  }, [activeNodeId, centerOnNode]);

  const handlePreviewFile = (file: MediaFile) => {
    setPreviewFile(file);
    setIsPreviewOpen(true);
  };

  const handleExportPdf = async () => {
    if (!currentProcess || !activeVersion || !tenants || !jobTitles || !departments) return;
    setIsExporting(true);
    try {
      const tenant = tenants.find(t => t.id === currentProcess.tenantId) || tenants[0];
      await exportDetailedProcessPdf(
        currentProcess, 
        activeVersion, 
        tenant, 
        jobTitles, 
        departments, 
        resources || [],
        activities || []
      );
      toast({ title: "Export erfolgreich", description: "PDF Bericht wurde generiert." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Fehler beim Export", description: e.message });
    } finally {
      setIsExporting(false);
    }
  };

  const getFullRoleName = useCallback((roleId?: string) => {
    if (!roleId) return '---';
    const role = jobTitles?.find(j => j.id === roleId);
    if (!role) return roleId;
    const dept = departments?.find(d => d.id === role.departmentId);
    return dept ? `${dept.name} — ${role.name}` : role.name;
  }, [jobTitles, departments]);

  const syncDiagram = () => {
    refresh();
  };

  if (!mounted) return null;
  
  const isTenantsLoading = !tenants;
  if (isTenantsLoading) return null;

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden bg-slate-50 relative w-full">
      <header className="h-16 border-b bg-white flex items-center justify-between px-8 shrink-0 z-20 shadow-sm">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/processhub')} className="h-10 w-10 rounded-xl transition-all"><ChevronLeft className="w-6 h-6" /></Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-headline font-bold text-slate-900">{currentProcess?.title}</h1>
              <Badge className="bg-emerald-50 text-emerald-700 border-none rounded-full px-2 h-5 text-[10px] font-black uppercase tracking-widest">{currentProcess?.status}</Badge>
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">V{activeVersion?.version || currentProcess?.currentVersion}.0 • Dokumentation</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-slate-100 p-1 rounded-xl flex gap-1 border">
            <Button variant={guideMode === 'list' ? 'secondary' : 'ghost'} size="sm" className="h-8 text-[9px] font-bold uppercase" onClick={() => setGuideMode('list')}><List className="w-3.5 h-3.5 mr-1.5" /> Liste</Button>
            <Button variant={guideMode === 'structure' ? 'secondary' : 'ghost'} size="sm" className="h-8 text-[9px] font-bold uppercase" onClick={() => setGuideMode('structure')}><LayoutGrid className="w-3.5 h-3.5 mr-1.5" /> Karte</Button>
          </div>
          <Button variant="outline" size="sm" className="h-8 rounded-lg text-[10px] font-bold uppercase gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50" onClick={handleExportPdf} disabled={isExporting}>
            {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />} PDF Bericht
          </Button>
          <Button variant="outline" size="sm" className="h-8 rounded-lg text-[10px] font-bold uppercase gap-2" onClick={() => router.push(`/processhub/${id}`)}><Edit3 className="w-3.5 h-3.5" /> Designer</Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden h-full relative">
        <aside className="w-80 border-r bg-white flex flex-col shrink-0 hidden lg:flex shadow-sm">
          <ScrollArea className="flex-1 p-6 space-y-8">
            <section className="space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b pb-2 flex items-center gap-2">
                <Info className="w-3.5 h-3.5" /> Stammdaten & Kontext
              </h3>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-[9px] font-black uppercase text-slate-400">Kurzbeschreibung</Label>
                  <p className="text-[11px] text-slate-600 leading-relaxed font-medium italic">
                    "{currentProcess?.description || 'Keine Beschreibung verfügbar.'}"
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-[9px] font-black uppercase text-slate-400">Verantwortliche Abteilung</Label>
                  <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border">
                    <Building2 className="w-3.5 h-3.5 text-primary" />
                    <span className="text-[11px] font-bold text-slate-800">
                      {departments?.find(d => d.id === currentProcess?.responsibleDepartmentId)?.name || '---'}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[9px] font-black uppercase text-slate-400">Process Owner</Label>
                  <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border">
                    <Briefcase className="w-3.5 h-3.5 text-indigo-600" />
                    <span className="text-[11px] font-bold text-slate-800">
                      {getFullRoleName(currentProcess?.ownerRoleId)}
                    </span>
                  </div>
                </div>
                
                {processType && (
                <div className="space-y-2">
                    <Label className="text-[9px] font-black uppercase text-slate-400">Prozesstyp</Label>
                    <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border">
                        <span className="text-[11px] font-bold text-slate-800">
                            {processType.name}
                        </span>
                    </div>
                </div>
                )}

                {emergencyProcess && (
                <div className="space-y-2">
                    <Label className="text-[9px] font-black uppercase text-red-600">Notfall-Fallback</Label>
                    <div className="flex items-center gap-2 p-2 bg-red-50/50 rounded-lg border border-red-100">
                        <span className="text-[11px] font-bold text-red-800">
                            {emergencyProcess.title}
                        </span>
                    </div>
                </div>
                )}

                {processingActivity && (
                <div className="space-y-1">
                    <Label className="text-[9px] font-black uppercase text-slate-400">VVT ID</Label>
                    <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border">
                        <span className="text-[11px] font-bold text-slate-800">
                            {processingActivity.name}
                        </span>
                    </div>
                </div>
                )}

                {owner && (
                <div className="space-y-1">
                    <Label className="text-[9px] font-black uppercase text-slate-400">Process Owner (User)</Label>
                    <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border">
                        <span className="text-[11px] font-bold text-slate-800">
                            {owner.displayName}
                        </span>
                    </div>
                </div>
                )}
                
                <div className="space-y-1">
                    <Label className="text-[9px] font-black uppercase text-slate-400">Erstellt am</Label>
                    <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border">
                        <span className="text-[11px] font-bold text-slate-800">
                            {currentProcess?.createdAt ? new Date(currentProcess.createdAt).toLocaleString() : ''}
                        </span>
                    </div>
                </div>

                <div className="space-y-1">
                    <Label className="text-[9px] font-black uppercase text-slate-400">Zuletzt aktualisiert</Label>
                    <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border">
                        <span className="text-[11px] font-bold text-slate-800">
                            {currentProcess?.updatedAt ? new Date(currentProcess.updatedAt).toLocaleString() : ''}
                        </span>
                    </div>
                </div>
                
                {currentProcess?.publishedVersion && (
                    <div className="space-y-1">
                        <Label className="text-[9px] font-black uppercase text-slate-400">Veröffentlichte Version</Label>
                        <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border">
                            <span className="text-[11px] font-bold text-slate-800">
                                {currentProcess.publishedVersion}
                            </span>
                        </div>
                    </div>
                )}
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-600 border-b pb-2 flex items-center gap-2">
                <Workflow className="w-3.5 h-3.5" /> ISO Schnittstellen
              </h3>
              <div className="space-y-4">
                <div className="space-y-1">
                  <Label className="text-[9px] font-black uppercase text-slate-400">Eingang (Inputs)</Label>
                  <div className="p-2.5 bg-indigo-50/30 border border-indigo-100 rounded-xl flex items-start gap-2">
                    <ArrowDownCircle className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                    <p className="text-[11px] font-bold text-slate-700 leading-tight">{currentProcess?.inputs || '---'}</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-[9px] font-black uppercase text-slate-400">Ausgang (Outputs)</Label>
                  <div className="p-2.5 bg-emerald-50/30 border border-emerald-100 rounded-xl flex items-start gap-2">
                    <ArrowUpCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <p className="text-[11px] font-bold text-slate-700 leading-tight">{currentProcess?.outputs || '---'}</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b pb-2 flex items-center gap-2">
                <Activity className="w-3.5 h-3.5" /> Operative Metriken
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-2 bg-slate-50 rounded-lg border flex flex-col gap-1">
                  <span className="text-[8px] font-black text-slate-400 uppercase">Automation</span>
                  <Badge variant="outline" className="text-[9px] font-black h-5 border-none bg-white shadow-sm">{currentProcess?.automationLevel || 'manual'}</Badge>
                </div>
                <div className="p-2 bg-slate-50 rounded-lg border flex flex-col gap-1">
                  <span className="text-[8px] font-black text-slate-400 uppercase">Frequenz</span>
                  <Badge variant="outline" className="text-[9px] font-black h-5 border-none bg-white shadow-sm">{currentProcess?.processingFrequency?.replace('_', ' ') || 'on demand'}</Badge>
                </div>
                <div className="p-2 bg-slate-50 rounded-lg border flex flex-col gap-1 col-span-2">
                  <span className="text-[8px] font-black text-slate-400 uppercase">Datenvolumen</span>
                  <Badge variant="outline" className="text-[9px] font-black h-5 border-none bg-white shadow-sm">{currentProcess?.dataVolume || 'low'}</Badge>
                </div>
              </div>
            </section>

            {currentProcess?.kpis && (
              <section className="space-y-4">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b pb-2 flex items-center gap-2">
                  <Target className="w-3.5 h-3.5 text-primary" /> Messgrößen (KPIs)
                </h3>
                <div className="p-3 bg-white border rounded-xl shadow-sm italic text-[11px] text-slate-600 leading-relaxed">
                  {currentProcess.kpis}
                </div>
              </section>
            )}

            {currentProcess?.openQuestions && (
              <section className="space-y-4">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-amber-600 border-b pb-2 flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5" /> Offene Punkte
                </h3>
                <div className="p-3 bg-amber-50/50 border border-amber-100 rounded-xl text-[11px] text-amber-900 font-medium">
                  {currentProcess.openQuestions}
                </div>
              </section>
            )}

            <div className="pb-20">
              <div className="flex flex-wrap gap-1.5">
                {currentProcess?.tags?.split(',').map((tag, i) => (
                  <Badge key={i} className="bg-slate-100 text-slate-500 border-none text-[8px] font-black px-2 h-4 uppercase">{tag.trim()}</Badge>
                ))}
              </div>
            </div>
          </ScrollArea>
        </aside>

        <main 
          ref={containerRef}
          className={cn("flex-1 relative overflow-hidden", guideMode === 'structure' ? "bg-slate-200 cursor-grab active:cursor-grabbing" : "bg-slate-50")} 
          onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}
        >
          {guideMode === 'list' ? (
            <ScrollArea className="h-full p-10">
              <div className="max-w-5xl mx-auto space-y-12 pb-40">
                {gridNodes.map((node, i) => (
                  <div key={node.id} id={`list-node-${node.id}`} className="relative">
                    <ProcessStepCard 
                      node={node} 
                      activeNodeId={activeNodeId} 
                      setActiveNodeId={handleNodeClick} 
                      resources={resources} 
                      allFeatures={allFeatures} 
                      getFullRoleName={getFullRoleName} 
                      allNodes={gridNodes} 
                      mediaFiles={mediaFiles} 
                      onPreviewFile={handlePreviewFile}
                      expandedByDefault 
                      animationsEnabled={animationsEnabled} 
                    />
                    {i < gridNodes.length - 1 && (
                      <div className="absolute left-1/2 -bottom-12 -translate-x-1/2 flex flex-col items-center">
                        <div className={cn("w-0.5 h-12 bg-slate-200 relative", activeNodeId === node.id && "bg-primary")}></div>
                        <ChevronDown className={cn("w-4 h-4 text-slate-200 -mt-1.5", activeNodeId === node.id && "text-primary")} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="absolute inset-0 origin-top-left" style={{ transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`, width: '5000px', height: '5000px', zIndex: 10, transition: isProgrammaticMove ? 'transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)' : 'none' }}>
              <svg className="absolute inset-0 pointer-events-none w-full h-full overflow-visible">
                <defs><marker id="arrowhead-v" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto"><polygon points="0 0, 5 2.5, 0 5" fill="currentColor" /></marker></defs>
                {connectionPaths.map((p) => (
                  <g key={p.id}>
                    <path d={p.path} fill="none" stroke={p.isActive ? "hsl(var(--primary))" : "#94a3b8"} strokeWidth={p.isActive ? "3" : "1.5"} strokeDasharray={p.isActive ? "8,4" : "none"} markerEnd="url(#arrowhead-v)" className={cn("transition-all", animationsEnabled && p.isActive && "animate-flow-dash")} />
                    {p.label && (
                      <g transform={`translate(${(p.path.match(/C\s([\d.-]+)\s([\d.-]+)/) || [])[1]}, ${(p.path.match(/C\s([\d.-]+)\s([\d.-]+)/) || [])[2]})`}>
                        <rect x="-30" y="-10" width="60" height="20" rx="4" fill="white" stroke="#cbd5e1" strokeWidth="1" />
                        <text fontSize="9" fontWeight="bold" fill="#64748b" textAnchor="middle" dy="3">{p.label}</text>
                      </g>
                    )}
                  </g>
                ))}
              </svg>
              {gridNodes.map(node => (<div key={node.id} className="absolute transition-all duration-500" style={{ left: node.x + OFFSET_X, top: node.y + OFFSET_Y }}><ProcessStepCard node={node} isMapMode activeNodeId={activeNodeId} setActiveNodeId={handleNodeClick} resources={resources} allFeatures={allFeatures} mediaFiles={mediaFiles} getFullRoleName={getFullRoleName} animationsEnabled={animationsEnabled} gridNodes={gridNodes} processes={processes} onPreviewFile={handlePreviewFile} /></div>))}
            </div>
          )}
          {guideMode === 'structure' && (
            <div data-zoom-control="true" className="absolute bottom-8 right-8 z-50 bg-white shadow-2xl border rounded-2xl p-1.5 flex flex-col gap-1.5">
              <TooltipProvider>
                <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); syncDiagram(); }} className="h-9 w-9 rounded-xl hover:bg-slate-100 transition-all"><RefreshCw className="w-4 h-4 text-slate-600" /></Button></TooltipTrigger><TooltipContent side="left" className="text-[10px] font-bold uppercase">Aktualisieren</TooltipContent></Tooltip>
                <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); setScale(s => Math.min(2, s + 0.1)); }} className="h-10 w-10"><Plus className="w-5 h-5" /></Button></TooltipTrigger><TooltipContent side="left" className="text-[10px] font-bold uppercase">Vergrößern</TooltipContent></Tooltip>
                <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-10 w-10" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); setScale(s => Math.max(0.2, s - 0.1)); }}><Minus className="w-5 h-5" /></Button></TooltipTrigger><TooltipContent side="left" className="text-[10px] font-bold uppercase">Verkleinern</TooltipContent></Tooltip>
              </TooltipProvider>
              <Separator className="my-1" />
              <Button variant="ghost" size="icon" className="h-10 w-10 text-primary" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); if(gridNodes.length > 0) centerOnNode(activeNodeId || gridNodes[0].id); }}><Crosshair className="w-5 h-5" /></Button>
            </div>
          )}
        </main>
      </div>

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-5xl w-[95vw] h-[85vh] p-0 overflow-hidden">
          <DialogHeader className="p-4 border-b">
            <DialogTitle className="text-sm font-bold">{previewFile?.fileName || 'Anhang'}</DialogTitle>
            <DialogDescription className="text-[10px]">Vorschau</DialogDescription>
          </DialogHeader>
          <div className="flex-1 h-[calc(85vh-64px)] bg-slate-950">
            {previewFile && isImageFile(previewFile) && (
              <img src={previewFile.fileUrl} alt={previewFile.fileName} className="w-full h-full object-contain" />
            )}
            {previewFile && isPdfFile(previewFile) && (
              <iframe title={previewFile.fileName} src={previewFile.fileUrl} className="w-full h-full" />
            )}
            {previewFile && !isImageFile(previewFile) && !isPdfFile(previewFile) && (
              <div className="w-full h-full flex items-center justify-center text-slate-200 text-sm">
                Keine Vorschau verfuegbar
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function isImageFile(file: MediaFile) {
  const name = (file.fileName || '').toLowerCase();
  return file.fileType?.startsWith('image/') || name.endsWith('.png') || name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.gif') || name.endsWith('.webp') || name.endsWith('.svg');
}

function isPdfFile(file: MediaFile) {
  const name = (file.fileName || '').toLowerCase();
  return file.fileType?.includes('pdf') || name.endsWith('.pdf');
}

function ProcessStepCard({ node, isMapMode = false, activeNodeId, setActiveNodeId, resources, allFeatures, mediaFiles, getFullRoleName, expandedByDefault = false, gridNodes = [], processes = [], onPreviewFile }: any) {
  const isActive = activeNodeId === node.id;
  const isExpanded = expandedByDefault || (isMapMode && isActive);
  const nodeResources = resources?.filter((r:any) => node.resourceIds?.includes(r.id));
  const nodeFeatures = allFeatures?.filter((f:any) => node.featureIds?.includes(f.id));
  const nodeMedia = mediaFiles?.filter((m: any) => m.subEntityId === node.id);
  const roleName = getFullRoleName(node.roleId);
  
  // Get predecessor and successor nodes
  const predecessorNodes = useMemo(() => {
    if (!node.predecessorIds || !gridNodes) return [];
    return node.predecessorIds
      .map((id: string) => gridNodes.find((n: any) => n.id === id))
      .filter(Boolean);
  }, [node.predecessorIds, gridNodes]);
  
  const successorNodes = useMemo(() => {
    if (!node.successorIds || !gridNodes) return [];
    return node.successorIds
      .map((id: string) => gridNodes.find((n: any) => n.id === id))
      .filter(Boolean);
  }, [node.successorIds, gridNodes]);

  return (
    <Card className={cn("rounded-2xl border transition-all duration-500 bg-white cursor-pointer relative overflow-hidden", isActive ? "border-primary border-2 shadow-lg z-[100]" : "border-slate-100 shadow-sm hover:border-primary/20", isMapMode && (isActive ? "w-[600px] h-[460px]" : "w-64 h-[82px]"))} style={isMapMode && isActive ? { transform: 'translateX(-172px)' } : {}} onClick={(e) => { e.stopPropagation(); setActiveNodeId(node.id); }}>
      <CardHeader className={cn("p-4 flex flex-row items-center justify-between gap-4 transition-colors", isExpanded ? "bg-slate-50 border-b" : "border-b-0")}>
        <div className="flex items-center gap-4 min-w-0">
          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border", node.type === 'start' ? "bg-emerald-50 text-emerald-600" : node.type === 'decision' ? "bg-amber-50 text-amber-600" : node.type === 'subprocess' ? "bg-indigo-600 text-white" : "bg-primary/5 text-primary")}>
            {node.type === 'start' ? <PlayCircle className="w-6 h-6" /> : node.type === 'decision' ? <GitBranch className="w-6 h-6" /> : node.type === 'subprocess' ? <RefreshCw className="w-6 h-6" /> : <Activity className="w-6 h-6" />}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h4 className={cn("font-black uppercase tracking-tight text-slate-900 truncate", isMapMode && !isActive ? "text-[10px]" : "text-sm")}>{node.title}</h4>
              {nodeMedia && nodeMedia.length > 0 && !isExpanded && <Paperclip className="w-2.5 h-2.5 text-indigo-400" />}
            </div>
            <div className="flex items-center gap-2 mt-0.5"><Briefcase className="w-3 h-3 text-slate-400" /><span className="text-[10px] font-bold text-slate-500 truncate max-w-[150px]">{roleName}</span></div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {nodeMedia && nodeMedia.length > 0 && !isExpanded && <Badge className="bg-indigo-50 text-indigo-600 border-none rounded-full h-4 px-1.5"><Paperclip className="w-2.5 h-2.5" /></Badge>}
          {isMapMode && isActive && <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600" onClick={(e) => { e.stopPropagation(); setActiveNodeId(null); }}><X className="w-4 h-4" /></Button>}
        </div>
      </CardHeader>
      {isExpanded && (
        <CardContent data-allow-scroll="true" className="p-6 space-y-4 animate-in fade-in overflow-y-auto max-h-[380px]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
            <div className="space-y-4 overflow-hidden flex flex-col">
              {/* Vorgänger und Nachfolger */}
              <div className="space-y-2">
                <Label className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Ablauf</Label>
                <div className="space-y-1.5">
                  {predecessorNodes.length > 0 && (
                    <div className="p-2 bg-blue-50 rounded-lg border border-blue-100">
                      <p className="text-[8px] font-black text-blue-600 uppercase mb-1">◀ Vorgänger</p>
                      <div className="space-y-1">
                        {predecessorNodes.map((pred: any) => (
                          <div key={pred.id} className="text-[9px] font-bold text-blue-700">{pred.title}</div>
                        ))}
                      </div>
                    </div>
                  )}
                  {successorNodes.length > 0 && (
                    <div className="p-2 bg-green-50 rounded-lg border border-green-100">
                      <p className="text-[8px] font-black text-green-600 uppercase mb-1">Nachfolger ▶</p>
                      <div className="space-y-1">
                        {successorNodes.map((succ: any) => (
                          <div key={succ.id} className="text-[9px] font-bold text-green-700">{succ.title}</div>
                        ))}
                      </div>
                    </div>
                  )}
                  {predecessorNodes.length === 0 && successorNodes.length === 0 && (
                    <p className="text-[9px] text-slate-300 italic">Keine Verbindungen</p>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Tätigkeit</Label>
                <ScrollArea className="max-h-[100px] pr-2">
                  <p className="text-sm text-slate-700 leading-relaxed font-medium italic">"{node.description || 'Keine Beschreibung hinterlegt.'}"</p>
                </ScrollArea>
              </div>
              
              <div className="space-y-2 flex-1 min-h-0">
                <Label className="text-[9px] font-black uppercase text-slate-400 tracking-widest">✓ Checkliste für den Mitarbeiter</Label>
                <ScrollArea className="h-full pr-2">
                  <div className="space-y-1.5">
                    {node.checklist?.map((item: string, i: number) => (
                      <div key={i} className="flex items-start gap-2 p-2 bg-slate-50 rounded-lg border border-slate-100">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5" />
                        <span className="text-[11px] font-bold text-slate-700">{item}</span>
                      </div>
                    ))}
                    {(!node.checklist || node.checklist.length === 0) && <p className="text-[10px] text-slate-300 italic">Keine Checkliste</p>}
                  </div>
                </ScrollArea>
              </div>

              {/* Tipps */}
              {node.tips && (
                <div className="space-y-1">
                  <Label className="text-[9px] font-black uppercase text-slate-400 tracking-widest">💡 Tipps</Label>
                  <div className="p-2 bg-amber-50 rounded-lg border border-amber-100">
                    <p className="text-[9px] text-amber-800">{node.tips}</p>
                  </div>
                </div>
              )}

              {/* Fehler/Probleme */}
              {node.errors && (
                <div className="space-y-1">
                  <Label className="text-[9px] font-black uppercase text-slate-400 tracking-widest">⚠️ Häufige Fehler</Label>
                  <div className="p-2 bg-red-50 rounded-lg border border-red-100">
                    <p className="text-[9px] text-red-800">{node.errors}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4 flex flex-col">
              <div className="space-y-2">
                <Label className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Infrastruktur & Daten</Label>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <p className="text-[8px] font-black text-slate-400 uppercase">IT-Systeme</p>
                    <div className="flex flex-wrap gap-1.5">
                      {nodeResources?.map((res:any) => <Badge key={res.id} variant="outline" className="text-[8px] font-black h-5 border-indigo-100 bg-indigo-50/30 text-indigo-700 uppercase">{res.name}</Badge>)}
                      {nodeResources?.length === 0 && <span className="text-[9px] text-slate-300 italic">Keine Systeme</span>}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[8px] font-black text-slate-400 uppercase">Datenobjekte</p>
                    <div className="flex flex-wrap gap-1.5">
                      {nodeFeatures?.map((f:any) => <Badge key={f.id} variant="outline" className="text-[8px] font-black h-5 border-emerald-100 bg-emerald-50/30 text-emerald-700 uppercase">{f.name}</Badge>)}
                      {nodeFeatures?.length === 0 && <span className="text-[9px] text-slate-300 italic">Keine Datenobjekte</span>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Links */}
              {node.links && node.links.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-[9px] font-black uppercase text-slate-400 tracking-widest">🔗 Ressourcen</Label>
                  <div className="space-y-1.5">
                    {node.links.map((link: any, idx: number) => (
                      <a key={idx} href={link.url} target="_blank" rel="noopener noreferrer" className="block p-2 bg-slate-50 rounded-lg border border-slate-100 hover:bg-slate-100 transition-all">
                        <p className="text-[9px] font-bold text-primary underline">{link.title}</p>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {nodeMedia && nodeMedia.length > 0 && (
                <div className="pt-4 border-t space-y-2">
                  <Label className="text-[9px] font-black uppercase text-indigo-600 tracking-widest">Materialien ({nodeMedia.length})</Label>
                  <div className="flex flex-wrap gap-2">
                    {nodeMedia.map((f: any) => (
                      <div key={f.id} className="p-2 bg-slate-50 rounded-lg border text-[10px] font-bold flex items-center gap-2 shadow-sm hover:bg-white transition-all" onClick={(e) => { e.stopPropagation(); if (onPreviewFile) onPreviewFile(f); }}>
                        <ImageIcon className="w-3 h-3 text-indigo-400" /> {f.fileName}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export default function ProcessDetailViewPage() {
  return (
    <Suspense fallback={<div className="flex h-full w-full items-center justify-center py-40"><Loader2 className="w-10 h-10 animate-spin text-primary opacity-20" /></div>}>
      <ProcessDetailViewContent />
    </Suspense>
  );
}
