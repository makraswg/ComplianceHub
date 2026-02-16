
"use client";

import { useState, useEffect, useMemo, useRef, useCallback, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { 
  Workflow, 
  ChevronLeft, 
  Loader2, 
  Save as SaveIcon, 
  Activity, 
  RefreshCw, 
  GitBranch, 
  Trash2,
  Lock,
  Unlock,
  PlusCircle,
  Zap,
  ClipboardList,
  Building2,
  Settings2,
  Clock,
  Info,
  Briefcase,
  X,
  Layers,
  ChevronRight,
  Maximize2,
  Plus,
  Minus,
  PlayCircle,
  StopCircle,
  HelpCircle,
  Search,
  CheckCircle2,
  Save,
  ArrowLeftCircle,
  ArrowRightCircle,
  Edit3,
  Check,
  Database,
  Link as LinkIcon,
  ArrowDownCircle,
  ArrowUpCircle,
  ShieldCheck,
  AlertTriangle,
  FileCheck,
  Scale,
  Network,
  Target,
  Tag,
  ListFilter,
  FileCode,
  MessageSquare,
  UserCircle,
  FileUp,
  ImageIcon,
  FileText,
  Crosshair,
  Paperclip,
  ShieldAlert,
  FlameKindling
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePluggableCollection } from '@/hooks/data/use-pluggable-collection';
import { useSettings } from '@/context/settings-context';
import { usePlatformAuth } from '@/context/auth-context';
import { applyProcessOpsAction, updateProcessMetadataAction, commitProcessVersionAction, cloneProcessAsEmergencyAction } from '@/app/actions/process-actions';
import { saveMediaAction, deleteMediaAction } from '@/app/actions/media-actions';
import { toast } from '@/hooks/use-toast';
import { ProcessModel, ProcessLayout, Process, JobTitle, ProcessNode, ProcessOperation, ProcessVersion, Department, Resource, Feature, UiConfig, ProcessType, MediaFile } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProcessStepsEditor } from '@/components/processhub/ProcessStepsEditor';
import { ProcessStepWizard } from '@/components/processhub/ProcessStepWizard';

const OFFSET_X = 2500;
const OFFSET_Y = 2500;
const H_GAP = 350;
const V_GAP = 160;
const COLLAPSED_NODE_HEIGHT = 82;
const EXPANDED_NODE_HEIGHT = 460;

function ensureUniqueId(requestedId: string | null | undefined, usedIds: Set<string>, prefix: string = 'node'): string {
  const idStr = String(requestedId || '').trim().toLowerCase();
  const isInvalid = !requestedId || 
                    idStr === 'undefined' || 
                    idStr === 'null' || 
                    idStr === '' ||
                    idStr === '[object object]';

  let baseId = isInvalid 
    ? `${prefix}-${Math.random().toString(36).substring(2, 7)}` 
    : String(requestedId);
  
  let finalId = baseId;
  let counter = 1;
  while (usedIds.has(finalId)) {
    finalId = `${baseId}-${counter}`;
    counter++;
  }
  return finalId;
}

function ProcessDesignerContent() {
  const { id } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { dataSource, activeTenantId } = useSettings();
  const { user } = usePlatformAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [mounted, setMounted] = useState(false);
  const [leftWidth] = useState(380);

  // Map & Navigation States
  const [scale, setScale] = useState(0.8);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isDiagramLocked, setIsDiagramLocked] = useState(false);
  const [isProgrammaticMove, setIsProgrammaticMove] = useState(false);
  const hasAutoCentered = useRef(false);
  
  const stateRef = useRef({ position, scale, isDiagramLocked });
  useEffect(() => {
    stateRef.current = { position, scale, isDiagramLocked };
  }, [position, scale, isDiagramLocked]);

  // UI States
  const [isApplying, setIsApplying] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [isSavingMeta, setIsSavingMeta] = useState(false);
  const [isCloning, setIsCloning] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isNodeEditorOpen, setIsNodeEditorOpen] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [editingNode, setEditingNode] = useState<any>(null);
  const [connectionPaths, setConnectionPaths] = useState<any[]>([]);

  // Node Editor Form State
  const [editTitle, setEditTitle] = useState('');
  const [editType, setEditType] = useState<ProcessNode['type']>('step');
  const [editDesc, setEditDesc] = useState('');
  const [editRoleId, setEditRoleId] = useState('');
  const [editResIds, setEditResIds] = useState<string[]>([]);
  const [editFeatIds, setEditFeatIds] = useState<string[]>([]);
  const [editChecklist, setEditChecklist] = useState<string[]>([]);
  const [newCheckItem, setNewCheckItem] = useState('');
  const [editTips, setEditTips] = useState('');
  const [editErrors, setEditErrors] = useState('');
  const [editTargetProcessId, setEditTargetProcessId] = useState('');
  const [editPredecessorIds, setEditPredecessorIds] = useState<string[]>([]);
  const [editSuccessors, setEditSuccessors] = useState<{ targetId: string, label: string }[]>([]);

  // Media States
  const [isUploading, setIsUploading] = useState(false);

  // Node Editor Search States
  const [resSearch, setResSearch] = useState('');
  const [featSearch, setFeatSearch] = useState('');
  const [predSearch, setPredSearch] = useState('');
  const [succSearch, setSuccSearch] = useState('');
  const [subProcSearch, setSubProcSearch] = useState('');

  // Master Data Form State
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDesc, setMetaDesc] = useState('');
  const [metaTypeId, setMetaTypeId] = useState('none');
  const [metaEmergencyId, setMetaEmergencyId] = useState('none');
  const [metaInputs, setMetaInputs] = useState('');
  const [metaOutputs, setMetaOutputs] = useState('');
  const [metaKpis, setMetaKpis] = useState('');
  const [metaTags, setMetaTags] = useState('');
  const [metaOpenQuestions, setMetaOpenQuestions] = useState('');
  const [metaDeptId, setMetaDeptId] = useState('none');
  const [metaOwnerRoleId, setMetaOwnerRoleId] = useState('none');
  const [metaAutomation, setMetaAutomation] = useState<'manual' | 'partial' | 'full'>('manual');
  const [metaVolume, setMetaDataVolume] = useState<'low' | 'medium' | 'high'>('low');
  const [metaFrequency, setMetaFrequency] = useState<'daily' | 'weekly' | 'monthly' | 'on_demand'>('on_demand');

  const { data: uiConfigs } = usePluggableCollection<UiConfig>('uiConfigs');
  const { data: processes, refresh: refreshProc } = usePluggableCollection<Process>('processes');
  const { data: versions, refresh: refreshVersion } = usePluggableCollection<any>('process_versions');
  const { data: jobTitles } = usePluggableCollection<JobTitle>('jobTitles');
  const { data: departments } = usePluggableCollection<Department>('departments');
  const { data: resources } = usePluggableCollection<Resource>('resources');
  const { data: allFeatures } = usePluggableCollection<Feature>('features');
  const { data: processTypes } = usePluggableCollection<ProcessType>('process_types');
  const { data: mediaFiles, refresh: refreshMedia } = usePluggableCollection<MediaFile>('media');
  
  const currentProcess = useMemo(() => processes?.find((p: any) => p.id === id) || null, [processes, id]);
  const activeVersion = useMemo(() => versions?.find((v: any) => v.process_id === id), [versions, id]);

  const animationsEnabled = useMemo(() => {
    if (!uiConfigs || uiConfigs.length === 0) return true;
    return uiConfigs[0].enableAdvancedAnimations === true || uiConfigs[0].enableAdvancedAnimations === 1;
  }, [uiConfigs]);

  useEffect(() => {
    if (currentProcess) {
      setMetaTitle(currentProcess.title);
      setMetaDesc(currentProcess.description || '');
      setMetaTypeId(currentProcess.process_type_id || 'none');
      setMetaEmergencyId(currentProcess.emergencyProcessId || 'none');
      setMetaInputs(currentProcess.inputs || '');
      setMetaOutputs(currentProcess.outputs || '');
      setMetaKpis(currentProcess.kpis || '');
      setMetaTags(currentProcess.tags || '');
      setMetaOpenQuestions(currentProcess.openQuestions || '');
      setMetaDeptId(currentProcess.responsibleDepartmentId || 'none');
      setMetaOwnerRoleId(currentProcess.ownerRoleId || 'none');
      setMetaAutomation(currentProcess.automationLevel || 'manual');
      setMetaDataVolume(currentProcess.dataVolume || 'low');
      setMetaFrequency(currentProcess.processingFrequency || 'on_demand');
    }
  }, [currentProcess]);

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

      const children = edges.filter(e => e.source === id).map(e => e.target);
      children.forEach((childId, idx) => { queue.push({ id: childId, lane: finalLane + idx }); });
    }

    const WIDTH_DIFF = 600 - 256;

    return nodes.map(n => {
      const lane = lanes[n.id] || 0;
      const lv = levels[n.id] || 0;
      let x = lane * H_GAP;
      let y = lv * V_GAP;

      if (selectedNodeId === n.id) {
        // No movement
      } else if (selectedNodeId) {
        const activeLv = levels[selectedNodeId];
        const activeLane = lanes[selectedNodeId];
        if (lv === activeLv) {
          if (lane > activeLane) x += (WIDTH_DIFF / 2) + 40;
          if (lane < activeLane) x -= (WIDTH_DIFF / 2) + 40;
        }
        if (lv > activeLv) y += 338; 
      }
      return { ...n, x, y, lv, lane };
    });
  }, [activeVersion, selectedNodeId]);

  const sortedSidebarNodes = useMemo(() => {
    return [...gridNodes].sort((a, b) => {
      if (a.lv !== b.lv) return a.lv - b.lv;
      return a.lane - b.lane;
    });
  }, [gridNodes]);

  const centerOnNode = useCallback((nodeId: string) => {
    const node = gridNodes.find(n => n.id === nodeId);
    if (!node || !containerRef.current) return;
    setIsProgrammaticMove(true);
    const containerWidth = containerRef.current.clientWidth;
    const containerHeight = containerRef.current.clientHeight;

    const isExpanded = selectedNodeId === nodeId;
    let targetScale = 1;
    let nodeCenterY = node.y + OFFSET_Y + (COLLAPSED_NODE_HEIGHT / 2);

    if (isExpanded) {
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

      const availableHeight = Math.max(200, containerHeight - 8);
      targetScale = Math.min(1.6, Math.max(0.2, availableHeight / spanHeight));
      nodeCenterY = (Number.isFinite(top) && Number.isFinite(bottom))
        ? ((top + bottom) / 2)
        : (node.y + OFFSET_Y + (EXPANDED_NODE_HEIGHT / 2));
    }

    const nodeWidth = isExpanded ? 600 : 256;
    const nodeCenterX = node.x + OFFSET_X + (nodeWidth / 2);

    setPosition({
      x: -(nodeCenterX * targetScale) + (containerWidth / 2),
      y: -(nodeCenterY * targetScale) + (containerHeight / 2)
    });
    setScale(targetScale);
    setTimeout(() => setIsProgrammaticMove(false), 850);
  }, [gridNodes]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !hasAutoCentered.current && gridNodes.length > 0) {
      const startNode = gridNodes.find(n => n.type === 'start') || gridNodes[0];
      centerOnNode(startNode.id);
      hasAutoCentered.current = true;
    }
  }, [mounted, gridNodes, centerOnNode]);

  const updateFlowLines = useCallback(() => {
    if (!activeVersion || gridNodes.length === 0) { setConnectionPaths([]); return; }
    const edges = activeVersion.model_json.edges || [];
    const newPaths: any[] = [];

    edges.forEach((edge, i) => {
      const sNode = gridNodes.find(n => n.id === edge.source);
      const tNode = gridNodes.find(n => n.id === edge.target);
      if (sNode && tNode) {
        const sIsExp = sNode.id === selectedNodeId;
        const isPathActive = sIsExp || tNode.id === selectedNodeId;
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
  }, [activeVersion, gridNodes, selectedNodeId]);

  useEffect(() => { updateFlowLines(); }, [gridNodes, selectedNodeId, updateFlowLines]);

  const handleNodeClick = useCallback((nodeId: string) => {
    if (selectedNodeId === nodeId) {
      setSelectedNodeId(null);
    } else {
      setSelectedNodeId(nodeId);
      setTimeout(() => centerOnNode(nodeId), 50);
    }
  }, [selectedNodeId, centerOnNode]);

  const openNodeEditor = (node: any) => {
    setEditingNode(node);
    setEditTitle(node.title || '');
    setEditType(node.type || 'step');
    setEditDesc(node.description || '');
    setEditRoleId(node.roleId || '');
    setEditResIds(node.resourceIds || []);
    setEditFeatIds(node.featureIds || []);
    setEditChecklist(node.checklist || []);
    setEditTips(node.tips || '');
    setEditErrors(node.errors || '');
    setEditTargetProcessId(node.targetProcessId || '');
    
    setResSearch('');
    setFeatSearch('');
    setPredSearch('');
    setSuccSearch('');
    setSubProcSearch('');

    const preds = activeVersion?.model_json?.edges?.filter((e: any) => e.target === node.id).map((e: any) => e.source) || [];
    const succs = activeVersion?.model_json?.edges?.filter((e: any) => e.source === node.id).map((e: any) => ({
      targetId: e.target,
      label: e.label || ''
    })) || [];
    
    setEditPredecessorIds(preds);
    setEditSuccessors(succs);
    setIsNodeEditorOpen(true);
  };

  const handleSaveNode = async () => {
    if (!editingNode) return;
    const ops: ProcessOperation[] = [{
      type: 'UPDATE_NODE',
      payload: {
        nodeId: editingNode.id,
        patch: {
          title: editTitle,
          type: editType,
          description: editDesc,
          roleId: editRoleId === 'none' ? '' : editRoleId,
          resourceIds: editResIds,
          featureIds: editFeatIds,
          checklist: editChecklist,
          tips: editTips,
          errors: editErrors,
          targetProcessId: editTargetProcessId === 'none' ? '' : editTargetProcessId
        }
      }
    }];

    const oldEdges = activeVersion?.model_json?.edges || [];
    const currentPredEdges = oldEdges.filter((e: any) => e.target === editingNode.id);
    const currentSuccEdges = oldEdges.filter((e: any) => e.source === editingNode.id);

    currentPredEdges.forEach((e: any) => {
      if (!editPredecessorIds.includes(e.source)) ops.push({ type: 'REMOVE_EDGE', payload: { edgeId: e.id } });
    });
    editPredecessorIds.forEach(sourceId => {
      if (!currentPredEdges.some((e: any) => e.source === sourceId)) {
        ops.push({ type: 'ADD_EDGE', payload: { edge: { id: `edge-${Date.now()}-${sourceId}`, source: sourceId, target: editingNode.id } } });
      }
    });

    const newSuccIds = editSuccessors.map(s => s.targetId);
    currentSuccEdges.forEach((e: any) => {
      if (!newSuccIds.includes(e.target)) {
        ops.push({ type: 'REMOVE_EDGE', payload: { edgeId: e.id } });
      } else {
        const matchingEdit = editSuccessors.find(s => s.targetId === e.target);
        if (matchingEdit && matchingEdit.label !== (e.label || '')) {
          ops.push({ type: 'REMOVE_EDGE', payload: { edgeId: e.id } });
          ops.push({ type: 'ADD_EDGE', payload: { edge: { id: `edge-${Date.now()}-${e.target}`, source: editingNode.id, target: e.target, label: matchingEdit.label } } });
        }
      }
    });
    editSuccessors.forEach(succ => {
      if (!currentSuccEdges.some((e: any) => e.target === succ.targetId)) {
        ops.push({ type: 'ADD_EDGE', payload: { edge: { id: `edge-${Date.now()}-${succ.targetId}`, source: editingNode.id, target: succ.targetId, label: succ.label } } });
      }
    });

    const success = await handleApplyOps(ops);
    if (success) setIsNodeEditorOpen(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingNode) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      const mediaId = `med-${Math.random().toString(36).substring(2, 9)}`;
      const mediaData: MediaFile = {
        id: mediaId,
        tenantId: currentProcess?.tenantId || activeTenantId || 'global',
        module: 'ProcessHub',
        entityId: currentProcess?.id || '',
        subEntityId: editingNode.id,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        fileUrl: base64,
        createdAt: new Date().toISOString(),
        createdBy: user?.email || 'system'
      };
      try {
        const res = await saveMediaAction(mediaData, dataSource);
        if (res.success) { toast({ title: "Datei hochgeladen" }); refreshMedia(); }
      } finally { setIsUploading(false); }
    };
    reader.readAsDataURL(file);
  };

  const addCheckItem = () => {
    if (!newCheckItem.trim()) return;
    setEditChecklist([...editChecklist, newCheckItem.trim()]);
    setNewCheckItem('');
  };

  const removeCheckItem = (idx: number) => {
    setEditChecklist(editChecklist.filter((_, i) => i !== idx));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0 || stateRef.current.isDiagramLocked) return;
    setIsProgrammaticMove(false);
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = () => { setIsDragging(false); };

  const handleApplyOps = async (ops: any[]) => {
    if (!activeVersion || !user || !ops.length) return false;
    setIsApplying(true);
    try {
      const res = await applyProcessOpsAction(activeVersion.process_id, activeVersion.version, ops, activeVersion.revision, user.id, dataSource);
      if (res.success) { refreshVersion(); refreshProc(); return true; }
      return false;
    } finally { setIsApplying(false); }
  };

  const handleDeleteNode = async (nodeId: string) => {
    if (!confirm("Schritt permanent löschen?")) return;
    const ops: ProcessOperation[] = [{ type: 'REMOVE_NODE', payload: { nodeId } }];
    await handleApplyOps(ops);
    if (selectedNodeId === nodeId) setSelectedNodeId(null);
  };

  const handleQuickAdd = (type: 'step' | 'decision' | 'subprocess') => {
    setIsWizardOpen(true);
  };

  const handleCreateStepFromWizard = async (stepData: Partial<ProcessNode>) => {
    if (!activeVersion) return;
    const newId = `${stepData.type}-${Date.now()}`;
    const nodes = activeVersion.model_json.nodes || [];
    const predecessor = selectedNodeId ? nodes.find((n: any) => n.id === selectedNodeId) : (nodes.length > 0 ? nodes[nodes.length - 1] : null);
    
    const newNode: ProcessNode = {
      id: newId,
      type: stepData.type || 'step',
      title: stepData.title || 'Unbenannter Schritt',
      description: stepData.description,
      checklist: stepData.checklist || [],
      roleId: predecessor?.roleId || '',
      resourceIds: stepData.resourceIds || predecessor?.resourceIds || [],
      featureIds: stepData.featureIds || predecessor?.featureIds || []
    };

    const ops: ProcessOperation[] = [{ type: 'ADD_NODE', payload: { node: newNode } }];
    if (predecessor) {
      ops.push({ type: 'ADD_EDGE', payload: { edge: { id: `edge-${Date.now()}`, source: predecessor.id, target: newId } } });
    }
    
    handleApplyOps(ops).then(s => { if(s) handleNodeClick(newId); });
  };

  const handleNodesReorder = async (reorderedNodes: ProcessNode[]) => {
    if (!activeVersion) return;
    const ops: ProcessOperation[] = [{ 
      type: 'REORDER_NODES', 
      payload: { nodes: reorderedNodes } 
    }];
    
    handleApplyOps(ops);
  };

  const handleQuickAddOld = (type: 'step' | 'decision' | 'subprocess') => {
    if (!activeVersion) return;
    const newId = `${type}-${Date.now()}`;
    const titles = { step: 'Neuer Schritt', decision: 'Entscheidung?', subprocess: 'Referenz' };
    const nodes = activeVersion.model_json.nodes || [];
    const predecessor = selectedNodeId ? nodes.find((n: any) => n.id === selectedNodeId) : (nodes.length > 0 ? nodes[nodes.length - 1] : null);
    
    const newNode: ProcessNode = {
      id: newId, type, title: titles[type], checklist: [],
      roleId: predecessor?.roleId || '',
      resourceIds: predecessor?.resourceIds || [],
      featureIds: predecessor?.featureIds || []
    };

    const ops: ProcessOperation[] = [{ type: 'ADD_NODE', payload: { node: newNode } }];
    if (predecessor) {
      ops.push({ type: 'ADD_EDGE', payload: { edge: { id: `edge-${Date.now()}`, source: predecessor.id, target: newId } } });
    }
    
    handleApplyOps(ops).then(s => { if(s) handleNodeClick(newId); });
  };

  const handleSaveMetadata = async () => {
    setIsSavingMeta(true);
    try {
      const res = await updateProcessMetadataAction(id as string, {
        title: metaTitle, description: metaDesc,
        process_type_id: metaTypeId === 'none' ? undefined : metaTypeId,
        emergencyProcessId: metaEmergencyId === 'none' ? undefined : metaEmergencyId,
        inputs: metaInputs, outputs: metaOutputs, kpis: metaKpis, tags: metaTags,
        openQuestions: metaOpenQuestions, responsibleDepartmentId: metaDeptId === 'none' ? undefined : metaDeptId,
        ownerRoleId: metaOwnerRoleId === 'none' ? undefined : metaOwnerRoleId,
        automationLevel: metaAutomation, dataVolume: metaVolume, processingFrequency: metaFrequency
      }, dataSource);
      if (res.success) { toast({ title: "Stammdaten gespeichert" }); refreshProc(); }
    } finally { setIsSavingMeta(false); }
  };

  const handleCloneAsEmergency = async () => {
    if (!id) return;
    setIsCloning(true);
    try {
      const res = await cloneProcessAsEmergencyAction(id as string, dataSource, user?.email || 'system');
      if (res.success) {
        toast({ title: "Notfallprozess erstellt", description: "Sie werden nun zum Designer weitergeleitet." });
        router.push(`/processhub/${res.processId}`);
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Fehler beim Klonen", description: e.message });
    } finally {
      setIsCloning(false);
    }
  };

  const handleCommitVersion = async () => {
    if (!activeVersion || !user) return;
    setIsCommitting(true);
    try {
      const res = await commitProcessVersionAction(currentProcess.id, activeVersion.version, user.email || user.id, dataSource);
      if (res.success) { toast({ title: "Revision gespeichert" }); refreshVersion(); }
    } finally { setIsCommitting(false); }
  };

  const getFullRoleName = useCallback((roleId?: string) => {
    if (!roleId) return '---';
    const role = jobTitles?.find(j => j.id === roleId);
    if (!role) return roleId;
    const dept = departments?.find(d => d.id === role.departmentId);
    return dept ? `${dept.name} — ${role.name}` : role.name;
  }, [jobTitles, departments]);

  if (!mounted) return null;

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col overflow-hidden bg-slate-50 relative">
      <header className="h-14 flex items-center justify-between px-6 shrink-0 z-20 border-b bg-white/80 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/processhub')} className="h-9 w-9 text-slate-400 hover:bg-slate-100 rounded-md"><ChevronLeft className="w-5 h-5" /></Button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="font-headline font-bold text-sm md:text-base tracking-tight text-slate-900 truncate max-w-md">{currentProcess?.title}</h2>
              <Badge className="bg-primary/10 text-primary border-none rounded-full text-[9px] font-bold px-2 h-4 hidden md:flex">Designer</Badge>
            </div>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">V{activeVersion?.version}.0 • Rev. {activeVersion?.revision}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" className="rounded-md h-8 text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-6 shadow-sm gap-2" onClick={handleCommitVersion} disabled={isCommitting}>
            {isCommitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <SaveIcon className="w-3.5 h-3.5" />} Revision sichern
          </Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden h-full relative">
        <aside className="border-r flex flex-col bg-white shrink-0 h-full shadow-sm hidden md:flex" style={{ width: `${leftWidth}px` }}>
          <Tabs defaultValue="steps" className="h-full flex flex-col overflow-hidden">
            <TabsList className="h-11 bg-slate-50 border-b gap-0 p-0 w-full justify-start shrink-0 rounded-none overflow-x-auto no-scrollbar">
              <TabsTrigger value="steps" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary h-full text-[10px] font-bold text-slate-500 data-[state=active]:text-primary uppercase">Modellierung</TabsTrigger>
              <TabsTrigger value="meta" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 h-full text-[10px] font-bold text-slate-500 data-[state=active]:text-blue-600 uppercase">Stammdaten</TabsTrigger>
            </TabsList>
            
            <TabsContent value="steps" className="flex-1 m-0 overflow-hidden data-[state=active]:flex flex-col p-0">
              <div className="px-6 py-4 border-b bg-white shrink-0">
                <ProcessStepsEditor
                  nodes={sortedSidebarNodes}
                  edges={activeVersion?.model_json?.edges || []}
                  selectedNodeId={selectedNodeId}
                  onNodeSelect={handleNodeClick}
                  onNodeEdit={openNodeEditor}
                  onNodeDelete={handleDeleteNode}
                  onNodesReorder={handleNodesReorder}
                  onQuickAdd={handleQuickAdd}
                  mediaFiles={mediaFiles}
                />
              </div>
            </TabsContent>

            <TabsContent value="meta" className="flex-1 m-0 overflow-hidden data-[state=active]:flex flex-col p-0">
              <ScrollArea className="flex-1 bg-white p-6 space-y-8">
                <section className="space-y-4">
                  <h3 className="text-[10px] font-black uppercase text-slate-400 border-b pb-2 flex items-center gap-2"><Info className="w-3.5 h-3.5" /> Stammdaten</h3>
                  <div className="space-y-1.5"><Label className="text-[10px] font-black uppercase text-slate-400">Prozesstitel</Label><Input value={metaTitle} onChange={e => setMetaTitle(e.target.value)} className="h-10 text-xs font-bold rounded-xl" /></div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400">Prozesstyp</Label>
                    <Select value={metaTypeId} onValueChange={setMetaTypeId}><SelectTrigger className="h-10 text-xs rounded-xl"><SelectValue /></SelectTrigger><SelectContent>{processTypes?.filter(t => t.enabled).map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent></Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-red-600 flex items-center gap-1.5">
                      <ShieldAlert className="w-3 h-3" /> BCM Notfall-Fallback
                    </Label>
                    <div className="flex gap-2">
                      <Select value={metaEmergencyId} onValueChange={setMetaEmergencyId}>
                        <SelectTrigger className="h-10 text-xs rounded-xl border-red-100 bg-red-50/10 text-red-700 font-bold flex-1"><SelectValue placeholder="Rückfall-Prozess wählen..." /></SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="none">Kein Fallback-Prozess</SelectItem>
                          {processes?.filter(p => p.process_type_id === 'pt-disaster' && p.id !== id).map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {currentProcess?.process_type_id !== 'pt-disaster' && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="icon" 
                                className="h-10 w-10 shrink-0 rounded-xl border-red-200 text-red-600 hover:bg-red-50"
                                onClick={handleCloneAsEmergency}
                                disabled={isCloning}
                              >
                                {isCloning ? <Loader2 className="w-4 h-4 animate-spin" /> : <FlameKindling className="w-4 h-4" />}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent className="text-[9px] font-black uppercase bg-slate-800 text-white border-none shadow-xl">Prozess als Notfall-Basis klonen</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1.5"><Label className="text-[10px] font-black uppercase text-slate-400">Beschreibung</Label><Textarea value={metaDesc} onChange={e => setMetaDesc(e.target.value)} className="min-h-[80px] text-xs rounded-xl" /></div>
                </section>

                <section className="space-y-4">
                  <h3 className="text-[10px] font-black uppercase text-indigo-600 border-b pb-2 flex items-center gap-2"><ArrowDownCircle className="w-3.5 h-3.5" /> Input & Output</h3>
                  <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-slate-400">Eingang (Inputs)</Label><Textarea value={metaInputs} onChange={e => setMetaInputs(e.target.value)} placeholder="Was wird benötigt?" className="min-h-[60px] text-xs rounded-xl" /></div>
                  <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-slate-400">Ergebnisse (Outputs)</Label><Textarea value={metaOutputs} onChange={e => setMetaOutputs(e.target.value)} placeholder="Was wird geliefert?" className="min-h-[60px] text-xs rounded-xl" /></div>
                </section>

                <section className="space-y-4">
                  <h3 className="text-[10px] font-black uppercase text-primary border-b pb-2 flex items-center gap-2">
                    <UserCircle className="w-3.5 h-3.5" /> Governance & Verantwortung
                  </h3>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400">Verantwortliche Abteilung</Label>
                    <Select value={metaDeptId} onValueChange={setMetaDeptId}><SelectTrigger className="h-10 text-xs rounded-xl"><SelectValue placeholder="Wählen..." /></SelectTrigger><SelectContent>{departments?.filter(d => activeTenantId === 'all' || d.tenantId === activeTenantId).map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent></Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400">Process Owner (Rolle)</Label>
                    <Select value={metaOwnerRoleId} onValueChange={setMetaOwnerRoleId}><SelectTrigger className="h-10 text-xs rounded-xl"><SelectValue placeholder="Wählen..." /></SelectTrigger><SelectContent>{jobTitles?.filter(j => activeTenantId === 'all' || j.tenantId === activeTenantId).map(j => <SelectItem key={j.id} value={j.id}>{j.name}</SelectItem>)}</SelectContent></Select>
                  </div>
                </section>

                <section className="space-y-4">
                  <h3 className="text-[10px] font-black uppercase text-emerald-600 border-b pb-2 flex items-center gap-2"><Scale className="w-3.5 h-3.5" /> Compliance & VVT</h3>
                  <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl space-y-3">
                    <div className="flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-emerald-600" />
                      <h4 className="text-[10px] font-black uppercase text-emerald-800">Rechenschaft</h4>
                    </div>
                    <p className="text-[9px] text-emerald-700 leading-relaxed italic">Diese Daten fließen direkt in den DSGVO-Bericht ein.</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400">Automatisierungsgrad</Label>
                    <Select value={metaAutomation} onValueChange={(v:any) => setMetaAutomation(v)}><SelectTrigger className="h-10 text-xs rounded-xl"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="manual">Manuell</SelectItem><SelectItem value="partial">Teil-Automatisiert</SelectItem><SelectItem value="full">Dunkelverarbeitung</SelectItem></SelectContent></Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400">Datenvolumen</Label>
                    <Select value={metaVolume} onValueChange={(v:any) => setMetaDataVolume(v)}><SelectTrigger className="h-10 text-xs rounded-xl"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">Gering (Einzeldatensätze)</SelectItem><SelectItem value="medium">Mittel</SelectItem><SelectItem value="high">Massenverarbeitung</SelectItem></SelectContent></Select>
                  </div>
                </section>

                <section className="space-y-4">
                  <h3 className="text-[10px] font-black uppercase text-slate-400 border-b pb-2 flex items-center gap-2"><Tag className="w-3.5 h-3.5" /> Analyse</h3>
                  <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-slate-400">Messgrößen (KPIs)</Label><Textarea value={metaKpis} onChange={e => setMetaKpis(e.target.value)} placeholder="Erfolgskriterien..." className="min-h-[60px] text-xs rounded-xl" /></div>
                  <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-slate-400">Offene Fragen / Review</Label><Textarea value={metaOpenQuestions} onChange={e => setMetaOpenQuestions(e.target.value)} placeholder="Was ist noch zu klären?" className="min-h-[60px] text-xs rounded-xl border-amber-200 bg-amber-50/20" /></div>
                </section>

                <div className="pt-4 border-t pb-20"><Button onClick={handleSaveMetadata} disabled={isSavingMeta} className="w-full h-10 rounded-xl bg-blue-600 text-white font-bold text-[10px] uppercase gap-2 shadow-lg">{isSavingMeta ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <SaveIcon className="w-3.5 h-3.5" />} Stammdaten sichern</Button></div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </aside>

        <main 
          ref={containerRef}
          className={cn("flex-1 relative overflow-auto bg-slate-200 cursor-grab active:cursor-grabbing")} 
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        >
          <div 
            className="absolute inset-0 origin-top-left"
            style={{ 
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`, 
              width: '5000px', height: '5000px', zIndex: 10,
              transition: isProgrammaticMove ? 'transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)' : 'none'
            }}
          >
            <svg className="absolute inset-0 pointer-events-none w-full h-full overflow-visible">
              <defs><marker id="arrowhead" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto"><polygon points="0 0, 5 2.5, 0 5" fill="currentColor" /></marker></defs>
              {connectionPaths.map((p, i) => (
                <g key={i}>
                  <path d={p.path} fill="none" stroke={p.isActive ? "hsl(var(--primary))" : "#94a3b8"} strokeWidth={p.isActive ? "3" : "1.5"} strokeDasharray={p.isActive ? "8,4" : "none"} markerEnd="url(#arrowhead)" className={cn("transition-all", animationsEnabled && p.isActive && "animate-flow-dash")} />
                  {p.label && (
                    <g transform={`translate(${(p.path.match(/C\s([\d.-]+)\s([\d.-]+)/) || [])[1]}, ${(p.path.match(/C\s([\d.-]+)\s([\d.-]+)/) || [])[2]})`}>
                      <rect x="-30" y="-10" width="60" height="20" rx="4" fill="white" stroke="#cbd5e1" strokeWidth="1" />
                      <text fontSize="9" fontWeight="bold" fill="#64748b" textAnchor="middle" dy="3">{p.label}</text>
                    </g>
                  )}
                </g>
              ))}
            </svg>
            {gridNodes.map(node => (
              <div key={node.id} className="absolute transition-all duration-500 ease-in-out" style={{ left: node.x + OFFSET_X, top: node.y + OFFSET_Y }}>
                <ProcessStepCard 
                  node={node} isMapMode={{ activeNodeId: selectedNodeId }} activeNodeId={selectedNodeId} 
                  setActiveNodeId={(id: string) => handleNodeClick(id)}
                  resources={resources} allFeatures={allFeatures} 
                  getFullRoleName={getFullRoleName} 
                  animationsEnabled={animationsEnabled}
                  mediaCount={mediaFiles?.filter(m => m.subEntityId === node.id).length || 0}
                  onEdit={openNodeEditor}
                  gridNodes={gridNodes}
                />
              </div>
            ))}
          </div>

          <div data-zoom-control="true" className="absolute bottom-8 right-8 z-50 bg-white/95 backdrop-blur-md border rounded-2xl p-1.5 shadow-2xl flex flex-col gap-1.5">
            <Button variant="ghost" size="icon" className="h-10 w-10" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); setScale(s => Math.min(2, s + 0.1)); }}><Plus className="w-5 h-5" /></Button>
            <Button variant="ghost" size="icon" className="h-10 w-10" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); setScale(s => Math.max(0.2, s - 0.1)); }}><Minus className="w-5 h-5" /></Button>
            <Separator className="my-1" />
            <Button variant="ghost" size="icon" className="h-10 w-10 text-primary" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); if(gridNodes.length > 0) centerOnNode(selectedNodeId || gridNodes[0].id); }}><Crosshair className="w-5 h-5" /></Button>
          </div>
        </main>
      </div>

      <Dialog open={isNodeEditorOpen} onOpenChange={setIsNodeEditorOpen}>
        <DialogContent className="max-w-3xl w-[95vw] max-h-[90vh] rounded-2xl p-0 flex flex-col border-none shadow-2xl bg-white overflow-hidden">
          {/* Header */}
          <DialogHeader className="p-5 bg-gradient-to-r from-slate-50 to-white border-b shrink-0 space-y-3">
            <div className="flex items-center gap-4">
              <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center shadow-md", 
                editType === 'decision' ? "bg-amber-500 text-white" : 
                editType === 'start' ? "bg-emerald-500 text-white" :
                editType === 'subprocess' ? "bg-indigo-500 text-white" : "bg-primary text-white"
              )}>
                {editType === 'decision' ? <GitBranch className="w-5 h-5" /> : 
                 editType === 'start' ? <PlayCircle className="w-5 h-5" /> :
                 editType === 'subprocess' ? <RefreshCw className="w-5 h-5" /> : <Activity className="w-5 h-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-base font-bold">Prozessschritt bearbeiten</DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">Dokumentieren Sie die Arbeitsanweisung</DialogDescription>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-600">Schritt-Typ</span>
              <Select value={editType} onValueChange={(v:any) => setEditType(v)}>
                <SelectTrigger className="w-40 h-9 text-xs rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="start">🟢 Startpunkt</SelectItem>
                  <SelectItem value="step">📋 Arbeitsschritt</SelectItem>
                  <SelectItem value="decision">🔀 Entscheidung</SelectItem>
                  <SelectItem value="subprocess">🔗 Verweis</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </DialogHeader>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto">
            <Tabs defaultValue="taetigkeit" className="w-full">
              <TabsList className="sticky top-0 z-10 bg-white border-b w-full h-11 justify-start gap-0 rounded-none px-4">
                <TabsTrigger value="taetigkeit" className="text-[10px] font-bold uppercase h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary px-4">📝 Tätigkeit</TabsTrigger>
                <TabsTrigger value="ablauf" className="text-[10px] font-bold uppercase h-full rounded-none border-b-2 border-transparent data-[state=active]:border-amber-500 data-[state=active]:text-amber-600 px-4">🔄 Ablauf</TabsTrigger>
                <TabsTrigger value="ressourcen" className="text-[10px] font-bold uppercase h-full rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-500 data-[state=active]:text-indigo-600 px-4">🖥️ Ressourcen</TabsTrigger>
                <TabsTrigger value="pruefung" className="text-[10px] font-bold uppercase h-full rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-500 data-[state=active]:text-emerald-600 px-4">✅ Prüfung</TabsTrigger>
              </TabsList>

              {/* Tab 1: Tätigkeit - Was wird gemacht? */}
              <TabsContent value="taetigkeit" className="p-6 space-y-6 mt-0">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-700">Name des Schritts *</Label>
                  <Input 
                    value={editTitle} 
                    onChange={e => setEditTitle(e.target.value)} 
                    placeholder="z.B. Antrag prüfen, Daten erfassen, Freigabe erteilen..."
                    className="h-11 text-sm font-medium rounded-lg" 
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-700">Was ist zu tun? (Arbeitsanweisung)</Label>
                  <Textarea 
                    value={editDesc} 
                    onChange={e => setEditDesc(e.target.value)} 
                    placeholder="Beschreiben Sie die Tätigkeit so, dass ein neuer Mitarbeiter sie verstehen und ausführen kann..."
                    className="min-h-[120px] rounded-lg text-sm" 
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-amber-700 flex items-center gap-1.5">
                      💡 Tipps & Hinweise
                    </Label>
                    <Textarea 
                      value={editTips} 
                      onChange={e => setEditTips(e.target.value)} 
                      placeholder="Hilfreiche Tipps für die Durchführung..."
                      className="min-h-[80px] rounded-lg text-xs bg-amber-50/50 border-amber-200 focus:border-amber-400" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-red-700 flex items-center gap-1.5">
                      ⚠️ Häufige Fehler vermeiden
                    </Label>
                    <Textarea 
                      value={editErrors} 
                      onChange={e => setEditErrors(e.target.value)} 
                      placeholder="Typische Fehler und wie man sie vermeidet..."
                      className="min-h-[80px] rounded-lg text-xs bg-red-50/50 border-red-200 focus:border-red-400" 
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Tab 2: Ablauf - Wie ist der Fluss? */}
              <TabsContent value="ablauf" className="p-6 space-y-6 mt-0">
                <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
                  <p className="text-xs text-blue-800 font-medium">
                    <strong>Ablauf definieren:</strong> Wählen Sie aus, welche Schritte vor diesem kommen und wohin es danach weitergeht.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-700">Wer führt diesen Schritt aus?</Label>
                  <Select value={editRoleId || 'none'} onValueChange={setEditRoleId}>
                    <SelectTrigger className="h-10 rounded-lg">
                      <SelectValue placeholder="Rolle/Position auswählen..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— Keine Rolle zugewiesen —</SelectItem>
                      {jobTitles?.filter(j => activeTenantId === 'all' || j.tenantId === activeTenantId).map(j => (
                        <SelectItem key={j.id} value={j.id}>{getFullRoleName(j.id)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Vorgänger */}
                  <div className="space-y-3">
                    <Label className="text-xs font-bold text-blue-700 flex items-center gap-1.5">
                      ◀ Kommt von (Vorgänger)
                    </Label>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
                      <Input placeholder="Suchen..." value={predSearch} onChange={e => setPredSearch(e.target.value)} className="h-9 text-xs pl-8 rounded-lg" />
                    </div>
                    <div className="border rounded-lg bg-white max-h-48 overflow-y-auto">
                      {activeVersion?.model_json?.nodes?.filter((n: any) => n.id !== editingNode?.id && n.title.toLowerCase().includes(predSearch.toLowerCase())).map((n: any) => (
                        <div 
                          key={n.id} 
                          className={cn("flex items-center gap-2 p-2.5 border-b last:border-0 cursor-pointer hover:bg-slate-50 transition-colors", editPredecessorIds.includes(n.id) && "bg-blue-50")}
                          onClick={() => setEditPredecessorIds(prev => prev.includes(n.id) ? prev.filter(id => id !== n.id) : [...prev, n.id])}
                        >
                          <Checkbox checked={editPredecessorIds.includes(n.id)} />
                          <span className="text-xs font-medium">{n.title}</span>
                        </div>
                      ))}
                      {activeVersion?.model_json?.nodes?.filter((n: any) => n.id !== editingNode?.id).length === 0 && (
                        <p className="p-4 text-xs text-slate-400 text-center">Keine anderen Schritte vorhanden</p>
                      )}
                    </div>
                  </div>

                  {/* Nachfolger */}
                  <div className="space-y-3">
                    <Label className="text-xs font-bold text-green-700 flex items-center gap-1.5">
                      Geht weiter zu (Nachfolger) ▶
                    </Label>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
                      <Input placeholder="Suchen..." value={succSearch} onChange={e => setSuccSearch(e.target.value)} className="h-9 text-xs pl-8 rounded-lg" />
                    </div>
                    <div className="border rounded-lg bg-white max-h-48 overflow-y-auto">
                      {activeVersion?.model_json?.nodes?.filter((n: any) => n.id !== editingNode?.id && n.title.toLowerCase().includes(succSearch.toLowerCase())).map((n: any) => {
                        const link = editSuccessors.find(s => s.targetId === n.id);
                        return (
                          <div key={n.id} className={cn("p-2.5 border-b last:border-0", link && "bg-green-50")}>
                            <div 
                              className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 transition-colors"
                              onClick={() => setEditSuccessors(prev => link ? prev.filter(s => s.targetId !== n.id) : [...prev, { targetId: n.id, label: '' }])}
                            >
                              <Checkbox checked={!!link} />
                              <span className="text-xs font-medium">{n.title}</span>
                            </div>
                            {link && (
                              <Input 
                                placeholder="Bedingung (z.B. 'Ja', 'Nein', 'Genehmigt')" 
                                value={link.label} 
                                onChange={e => setEditSuccessors(prev => prev.map(s => s.targetId === n.id ? { ...s, label: e.target.value } : s))} 
                                className="h-7 text-[10px] mt-2 ml-6 w-[calc(100%-24px)]" 
                                onClick={e => e.stopPropagation()}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Tab 3: Ressourcen - Was wird benötigt? */}
              <TabsContent value="ressourcen" className="p-6 space-y-6 mt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* IT-Systeme */}
                  <div className="space-y-3">
                    <Label className="text-xs font-bold text-indigo-700 flex items-center gap-1.5">
                      🖥️ Benötigte IT-Systeme
                    </Label>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
                      <Input placeholder="Suchen..." value={resSearch} onChange={e => setResSearch(e.target.value)} className="h-9 text-xs pl-8 rounded-lg" />
                    </div>
                    <div className="border rounded-lg bg-white max-h-48 overflow-y-auto">
                      {resources?.filter(res => res.name.toLowerCase().includes(resSearch.toLowerCase())).map(res => (
                        <div 
                          key={res.id} 
                          className={cn("flex items-center gap-2 p-2.5 border-b last:border-0 cursor-pointer hover:bg-slate-50", editResIds.includes(res.id) && "bg-indigo-50")}
                          onClick={() => setEditResIds(prev => prev.includes(res.id) ? prev.filter(id => id !== res.id) : [...prev, res.id])}
                        >
                          <Checkbox checked={editResIds.includes(res.id)} />
                          <span className="text-xs font-medium">{res.name}</span>
                        </div>
                      ))}
                      {(!resources || resources.length === 0) && <p className="p-4 text-xs text-slate-400 text-center">Keine IT-Systeme angelegt</p>}
                    </div>
                  </div>

                  {/* Datenobjekte */}
                  <div className="space-y-3">
                    <Label className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                      📊 Verwendete Daten/Dokumente
                    </Label>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
                      <Input placeholder="Suchen..." value={featSearch} onChange={e => setFeatSearch(e.target.value)} className="h-9 text-xs pl-8 rounded-lg" />
                    </div>
                    <div className="border rounded-lg bg-white max-h-48 overflow-y-auto">
                      {allFeatures?.filter(f => f.name.toLowerCase().includes(featSearch.toLowerCase())).map(f => (
                        <div 
                          key={f.id} 
                          className={cn("flex items-center gap-2 p-2.5 border-b last:border-0 cursor-pointer hover:bg-slate-50", editFeatIds.includes(f.id) && "bg-emerald-50")}
                          onClick={() => setEditFeatIds(prev => prev.includes(f.id) ? prev.filter(id => id !== f.id) : [...prev, f.id])}
                        >
                          <Checkbox checked={editFeatIds.includes(f.id)} />
                          <span className="text-xs font-medium">{f.name}</span>
                        </div>
                      ))}
                      {(!allFeatures || allFeatures.length === 0) && <p className="p-4 text-xs text-slate-400 text-center">Keine Datenobjekte angelegt</p>}
                    </div>
                  </div>
                </div>

                {/* Materialien Upload */}
                <div className="space-y-3 pt-4 border-t">
                  <Label className="text-xs font-bold text-slate-700">📎 Begleitmaterialien (Screenshots, Anleitungen, Vorlagen)</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div 
                      className="p-6 border-2 border-dashed rounded-xl bg-slate-50 flex flex-col items-center justify-center text-center gap-2 hover:bg-white hover:border-primary/50 cursor-pointer transition-all" 
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} disabled={isUploading} />
                      {isUploading ? <Loader2 className="w-6 h-6 animate-spin text-primary" /> : <FileUp className="w-6 h-6 text-slate-400" />}
                      <p className="text-xs font-bold text-slate-600">Datei hochladen</p>
                    </div>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {mediaFiles?.filter(m => m.subEntityId === editingNode?.id).map(f => (
                        <div key={f.id} className="p-2 bg-white border rounded-lg flex items-center justify-between shadow-sm group/file">
                          <div className="flex items-center gap-2 min-w-0">
                            <ImageIcon className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                            <span className="text-[10px] font-bold truncate">{f.fileName}</span>
                          </div>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-red-400 opacity-0 group-hover/file:opacity-100" onClick={() => { if(confirm("Datei löschen?")) deleteMediaAction(f.id, f.tenantId, user?.email || 'admin', dataSource).then(() => refreshMedia()); }}><Trash2 className="w-3 h-3" /></Button>
                        </div>
                      ))}
                      {(!mediaFiles || mediaFiles.filter(m => m.subEntityId === editingNode?.id).length === 0) && (
                        <p className="text-[10px] text-slate-400 italic p-2">Noch keine Dateien hochgeladen</p>
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Tab 4: Prüfung - Qualitätssicherung */}
              <TabsContent value="pruefung" className="p-6 space-y-6 mt-0">
                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
                  <p className="text-xs text-emerald-800 font-medium">
                    <strong>Checkliste:</strong> Definieren Sie Prüfpunkte, die vor Abschluss des Schritts kontrolliert werden sollen.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Input 
                      placeholder="Neuen Prüfpunkt eingeben und Enter drücken..." 
                      value={newCheckItem} 
                      onChange={e => setNewCheckItem(e.target.value)} 
                      onKeyDown={e => e.key === 'Enter' && addCheckItem()} 
                      className="h-10 rounded-lg"
                    />
                    <Button onClick={addCheckItem} className="bg-emerald-600 hover:bg-emerald-700 h-10 px-4">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {editChecklist.length === 0 ? (
                      <p className="text-xs text-slate-400 italic text-center py-8">Noch keine Prüfpunkte definiert</p>
                    ) : (
                      editChecklist.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-white border rounded-lg group hover:border-slate-300">
                          <div className="flex items-center gap-3">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            <span className="text-sm">{item}</span>
                          </div>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 opacity-0 group-hover:opacity-100" onClick={() => removeCheckItem(idx)}>
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Footer */}
          <DialogFooter className="p-4 bg-slate-50 border-t shrink-0 flex justify-between items-center">
            <p className="text-[10px] text-slate-400">* Pflichtfeld</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsNodeEditorOpen(false)} className="rounded-lg h-9 px-6 text-xs">Abbrechen</Button>
              <Button onClick={handleSaveNode} disabled={isApplying || !editTitle.trim()} className="rounded-lg bg-primary text-white h-9 px-8 text-xs gap-2">
                {isApplying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} 
                Speichern
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Step Wizard */}
      <ProcessStepWizard
        open={isWizardOpen}
        onOpenChange={setIsWizardOpen}
        onCreateStep={handleCreateStepFromWizard}
        connectedToNodeId={selectedNodeId}
      />
    </div>
  );
}

function ProcessStepCard({ node, isMapMode = false, activeNodeId, setActiveNodeId, resources, allFeatures, getFullRoleName, animationsEnabled, mediaCount = 0, gridNodes = [], onEdit }: any) {
  const isActive = activeNodeId === node.id;
  const nodeResources = resources?.filter((r:any) => node.resourceIds?.includes(r.id));
  const nodeFeatures = allFeatures?.filter((f:any) => node.featureIds?.includes(f.id));
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
    <Card className={cn("rounded-2xl border transition-all duration-500 bg-white cursor-pointer relative overflow-hidden", isActive ? "border-primary border-2 shadow-lg z-[100]" : "border-slate-100 shadow-sm hover:border-primary/20", isActive ? "w-[600px] h-[460px]" : "w-64 h-[82px]")} style={isActive ? { transform: 'translateX(-172px)' } : {}} onClick={(e) => { e.stopPropagation(); setActiveNodeId(node.id); }}>
      <CardHeader className={cn("p-4 flex flex-row items-center justify-between gap-4 transition-colors", isActive ? "bg-slate-50 border-b" : "border-b-0")}>
        <div className="flex items-center gap-4 min-w-0">
          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border", node.type === 'start' ? "bg-emerald-50 text-emerald-600" : node.type === 'decision' ? "bg-amber-50 text-amber-600" : node.type === 'subprocess' ? "bg-indigo-600 text-white" : "bg-primary/5 text-primary")}>
            {node.type === 'start' ? <PlayCircle className="w-6 h-6" /> : node.type === 'decision' ? <GitBranch className="w-6 h-6" /> : node.type === 'subprocess' ? <RefreshCw className="w-6 h-6" /> : <Activity className="w-6 h-6" />}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h4 className={cn("font-black uppercase tracking-tight text-slate-900 truncate", !isActive ? "text-[10px]" : "text-sm")}>{node.title}</h4>
              {mediaCount > 0 && !isActive && <Paperclip className="w-2.5 h-2.5 text-indigo-400" />}
            </div>
            <div className="flex items-center gap-2 mt-0.5"><Briefcase className="w-3 h-3 text-slate-400" /><span className="text-[10px] font-bold text-slate-500 truncate max-w-[150px]">{roleName}</span></div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {mediaCount > 0 && !isActive && <Badge className="bg-indigo-50 text-indigo-600 border-none rounded-full h-4 px-1.5"><Paperclip className="w-2.5 h-2.5" /></Badge>}
          {isActive && <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:bg-primary/10" onClick={(e) => { e.stopPropagation(); onEdit?.(node); }}><Edit3 className="w-4 h-4" /></Button>}
          {isActive && <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600" onClick={(e) => { e.stopPropagation(); setActiveNodeId(null); }}><X className="w-4 h-4" /></Button>}
        </div>
      </CardHeader>
      {isActive && (
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
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export default function ProcessDesignerPage() {
  return (
    <Suspense fallback={<div className="flex h-full w-full items-center justify-center py-40"><Loader2 className="w-10 h-10 animate-spin text-primary opacity-20" /></div>}>
      <ProcessDesignerContent />
    </Suspense>
  );
}
