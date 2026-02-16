"use client";

import React, { useState, useCallback, useMemo } from 'react';
import { 
  GripVertical, 
  Plus, 
  Trash2, 
  Edit3, 
  ChevronDown, 
  ChevronUp,
  Activity,
  GitBranch,
  RefreshCw,
  PlayCircle,
  Paperclip,
  CheckCircle2,
  ArrowRight,
  Copy
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ProcessNode } from '@/lib/types';

interface ProcessStepsEditorProps {
  nodes: ProcessNode[];
  edges: any[];
  onNodeSelect: (nodeId: string) => void;
  onNodeEdit: (node: ProcessNode) => void;
  onNodeDelete: (nodeId: string) => void;
  onNodesReorder: (nodes: ProcessNode[]) => void;
  onQuickAdd: (type: ProcessNode['type']) => void;
  selectedNodeId?: string;
  mediaFiles?: any[];
}

export function ProcessStepsEditor({
  nodes,
  edges,
  onNodeSelect,
  onNodeEdit,
  onNodeDelete,
  onNodesReorder,
  onQuickAdd,
  selectedNodeId,
  mediaFiles = []
}: ProcessStepsEditorProps) {
  const [draggedNode, setDraggedNode] = useState<string | null>(null);
  const [inlineEditId, setInlineEditId] = useState<string | null>(null);
  const [inlineEditValue, setInlineEditValue] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Berechne Abhängigkeiten für jeden Node
  const nodeInfo = useMemo(() => {
    const map: Record<string, { predecessors: ProcessNode[], successors: ProcessNode[] }> = {};
    
    nodes.forEach(node => {
      map[node.id] = { predecessors: [], successors: [] };
    });

    edges.forEach(edge => {
      const predNode = nodes.find(n => n.id === edge.source);
      const succNode = nodes.find(n => n.id === edge.target);
      if (predNode && map[edge.target]) {
        map[edge.target].predecessors.push(predNode);
      }
      if (succNode && map[edge.source]) {
        map[edge.source].successors.push(succNode);
      }
    });

    return map;
  }, [nodes, edges]);

  const handleDragStart = (e: React.DragEvent, nodeId: string) => {
    setDraggedNode(nodeId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (!draggedNode) return;

    const draggedIndex = nodes.findIndex(n => n.id === draggedNode);
    if (draggedIndex === -1 || draggedIndex === targetIndex) {
      setDraggedNode(null);
      return;
    }

    const newNodes = [...nodes];
    const [movedNode] = newNodes.splice(draggedIndex, 1);
    newNodes.splice(targetIndex, 0, movedNode);
    
    onNodesReorder(newNodes);
    setDraggedNode(null);
  };

  const handleInlineEditStart = (node: ProcessNode) => {
    setInlineEditId(node.id);
    setInlineEditValue(node.title || '');
  };

  const handleInlineEditSave = (node: ProcessNode) => {
    if (inlineEditValue.trim()) {
      onNodeEdit({ ...node, title: inlineEditValue });
    }
    setInlineEditId(null);
  };

  const getNodeIcon = (type: ProcessNode['type']) => {
    switch (type) {
      case 'decision':
        return <GitBranch className="w-4 h-4" />;
      case 'start':
        return <PlayCircle className="w-4 h-4" />;
      case 'subprocess':
        return <RefreshCw className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  const getNodeColor = (type: ProcessNode['type']) => {
    switch (type) {
      case 'decision':
        return 'bg-amber-50 text-amber-600';
      case 'start':
        return 'bg-emerald-50 text-emerald-600';
      case 'subprocess':
        return 'bg-indigo-600 text-white';
      default:
        return 'bg-slate-50 text-slate-500';
    }
  };

  const hasMedia = (nodeId: string) => mediaFiles.some(m => m.subEntityId === nodeId);
  const hasChecklist = (node: ProcessNode) => node.checklist && node.checklist.length > 0;

  return (
    <div className="space-y-3">
      {/* Quick Add Buttons */}
      <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-xl border">
        <Button 
          variant="outline" 
          size="sm" 
          className="h-8 text-[9px] font-bold rounded-lg gap-1.5"
          onClick={() => onQuickAdd('step')}
        >
          <Plus className="w-3 h-3" /> Schritt
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          className="h-8 text-[9px] font-bold rounded-lg gap-1.5"
          onClick={() => onQuickAdd('decision')}
        >
          <Plus className="w-3 h-3" /> Weiche
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          className="h-8 text-[9px] font-bold rounded-lg gap-1.5"
          onClick={() => onQuickAdd('subprocess')}
        >
          <Plus className="w-3 h-3" /> Referenz
        </Button>
      </div>

      {/* Steps List */}
      <div className="space-y-1.5 max-h-[600px] overflow-y-auto pr-2">
        {nodes.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <p className="text-[11px] font-bold uppercase">Keine Schritte vorhanden</p>
          </div>
        ) : (
          nodes.map((node, index) => {
            const isSelected = selectedNodeId === node.id;
            const isDragging = draggedNode === node.id;
            const deps = nodeInfo[node.id];
            const expanded = expandedId === node.id;

            return (
              <div
                key={node.id}
                draggable
                onDragStart={(e) => handleDragStart(e, node.id)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, index)}
                className={cn(
                  "group p-2 rounded-lg border transition-all cursor-move",
                  isDragging ? "opacity-50 border-dashed" : "",
                  isSelected ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "border-slate-200 bg-white hover:border-slate-300"
                )}
              >
                {/* Main Row */}
                <div className="flex items-center gap-2" onClick={() => !inlineEditId && onNodeSelect(node.id)}>
                  <GripVertical className="w-4 h-4 text-slate-300 shrink-0" />
                  
                  <div className={cn("w-7 h-7 rounded-md flex items-center justify-center shrink-0 border shadow-sm text-xs", getNodeColor(node.type))}>
                    {getNodeIcon(node.type)}
                  </div>

                  {/* Inline Edit or Title */}
                  {inlineEditId === node.id ? (
                    <Input
                      autoFocus
                      value={inlineEditValue}
                      onChange={(e) => setInlineEditValue(e.target.value)}
                      onBlur={() => handleInlineEditSave(node)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleInlineEditSave(node);
                        if (e.key === 'Escape') setInlineEditId(null);
                      }}
                      className="h-6 text-[10px] flex-1 rounded"
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold text-slate-800 truncate">
                        {index + 1}. {node.title || 'Unbenannter Schritt'}
                      </p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-[7px] font-bold uppercase text-slate-400">{node.type}</span>
                        {hasMedia(node.id) && <Paperclip className="w-2.5 h-2.5 text-indigo-400" />}
                        {hasChecklist(node) && <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />}
                        {deps?.predecessors.length > 0 && <Badge variant="outline" className="text-[7px] px-1 h-4">Eingang</Badge>}
                        {deps?.successors.length > 0 && <Badge variant="outline" className="text-[7px] px-1 h-4">Ausgang</Badge>}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-slate-400 hover:text-slate-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedId(expanded ? null : node.id);
                      }}
                    >
                      {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-primary hover:bg-primary/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleInlineEditStart(node);
                      }}
                    >
                      <Edit3 className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-red-400 hover:text-red-600 hover:bg-red-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        onNodeDelete(node.id);
                      }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

                {/* Expanded Details */}
                {expanded && (
                  <div className="mt-2 ml-6 pt-2 border-t border-slate-100 space-y-1.5">
                    {node.description && (
                      <div className="text-[9px] text-slate-600 italic bg-slate-50 p-1.5 rounded">
                        {node.description}
                      </div>
                    )}
                    
                    {deps?.predecessors.length > 0 && (
                      <div className="text-[8px] space-y-0.5">
                        <p className="font-bold uppercase text-slate-400">◀ Von:</p>
                        {deps.predecessors.map(p => (
                          <div key={p.id} className="flex items-center gap-1 text-blue-600">
                            <ArrowRight className="w-2 h-2" />
                            <span className="font-medium">{p.title}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {deps?.successors.length > 0 && (
                      <div className="text-[8px] space-y-0.5">
                        <p className="font-bold uppercase text-slate-400">Zu:</p>
                        {deps.successors.map(s => (
                          <div key={s.id} className="flex items-center gap-1 text-green-600">
                            <ArrowRight className="w-2 h-2" />
                            <span className="font-medium">{s.title}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[9px] w-full rounded-lg gap-1 hover:bg-slate-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        onNodeEdit(node);
                      }}
                    >
                      <Edit3 className="w-3 h-3" /> Vollständig bearbeiten
                    </Button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
