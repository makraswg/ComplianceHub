"use client";

import React, { useState, useMemo } from 'react';
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
  Zap,
  MoreHorizontal
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
      case 'decision': return <GitBranch className="w-3.5 h-3.5" />;
      case 'start': return <PlayCircle className="w-3.5 h-3.5" />;
      case 'subprocess': return <RefreshCw className="w-3.5 h-3.5" />;
      default: return <Activity className="w-3.5 h-3.5" />;
    }
  };

  const getNodeStyle = (type: ProcessNode['type']) => {
    switch (type) {
      case 'decision': return { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' };
      case 'start': return { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' };
      case 'subprocess': return { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-200' };
      default: return { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200' };
    }
  };

  const hasMedia = (nodeId: string) => mediaFiles?.some(m => m.subEntityId === nodeId) ?? false;
  const hasChecklist = (node: ProcessNode) => node.checklist && node.checklist.length > 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-slate-700">Prozessschritte</h3>
        <span className="text-[10px] text-slate-400 font-medium">{nodes.length} Schritte</span>
      </div>

      {/* Quick Add - Prominent */}
      <div className="p-3 bg-gradient-to-r from-primary/5 to-blue-50 rounded-xl border border-primary/10">
        <p className="text-[9px] font-bold text-slate-500 uppercase mb-2 flex items-center gap-1">
          <Zap className="w-3 h-3 text-primary" /> Neuen Schritt hinzufügen
        </p>
        <div className="grid grid-cols-3 gap-1.5">
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8 text-[9px] font-bold rounded-lg gap-1 bg-white hover:bg-slate-50 border-slate-200"
            onClick={() => onQuickAdd('step')}
          >
            <Activity className="w-3 h-3 text-slate-500" /> Schritt
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8 text-[9px] font-bold rounded-lg gap-1 bg-white hover:bg-amber-50 border-amber-200 text-amber-700"
            onClick={() => onQuickAdd('decision')}
          >
            <GitBranch className="w-3 h-3" /> Weiche
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8 text-[9px] font-bold rounded-lg gap-1 bg-white hover:bg-indigo-50 border-indigo-200 text-indigo-700"
            onClick={() => onQuickAdd('subprocess')}
          >
            <RefreshCw className="w-3 h-3" /> Verweis
          </Button>
        </div>
      </div>

      {/* Steps List */}
      <div className="space-y-1 max-h-[500px] overflow-y-auto">
        {nodes.length === 0 ? (
          <div className="text-center py-12 px-4">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
              <Plus className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-xs font-bold text-slate-500">Noch keine Schritte</p>
            <p className="text-[10px] text-slate-400 mt-1">Fügen Sie oben den ersten Schritt hinzu</p>
          </div>
        ) : (
          nodes.map((node, index) => {
            const isSelected = selectedNodeId === node.id;
            const isDragging = draggedNode === node.id;
            const deps = nodeInfo[node.id];
            const expanded = expandedId === node.id;
            const style = getNodeStyle(node.type);

            return (
              <div
                key={node.id}
                draggable
                onDragStart={(e) => handleDragStart(e, node.id)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, index)}
                className={cn(
                  "group rounded-lg border transition-all",
                  isDragging ? "opacity-50 border-dashed border-primary" : "",
                  isSelected 
                    ? "border-primary bg-primary/5 shadow-sm" 
                    : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
                )}
              >
                {/* Main Row */}
                <div 
                  className="flex items-center gap-2 p-2 cursor-pointer" 
                  onClick={() => !inlineEditId && onNodeSelect(node.id)}
                >
                  <GripVertical className="w-3.5 h-3.5 text-slate-300 shrink-0 cursor-grab active:cursor-grabbing" />
                  
                  {/* Step Number & Icon */}
                  <div className={cn("w-6 h-6 rounded-md flex items-center justify-center shrink-0", style.bg, style.text)}>
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
                      className="h-6 text-xs flex-1 rounded"
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-bold text-slate-400 w-4">{index + 1}.</span>
                        <p className="text-[11px] font-semibold text-slate-800 truncate">
                          {node.title || 'Unbenannt'}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 ml-5 mt-0.5">
                        {hasMedia(node.id) && (
                          <span className="flex items-center gap-0.5 text-[8px] text-indigo-500">
                            <Paperclip className="w-2.5 h-2.5" /> Datei
                          </span>
                        )}
                        {hasChecklist(node) && (
                          <span className="flex items-center gap-0.5 text-[8px] text-emerald-500">
                            <CheckCircle2 className="w-2.5 h-2.5" /> {node.checklist?.length}
                          </span>
                        )}
                        {deps?.successors.length > 0 && (
                          <span className="text-[8px] text-slate-400">
                            → {deps.successors.length} Nachfolger
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-primary hover:bg-primary/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        onNodeEdit(node);
                      }}
                      title="Bearbeiten"
                    >
                      <Edit3 className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-slate-400 hover:text-slate-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedId(expanded ? null : node.id);
                      }}
                      title="Details"
                    >
                      {expanded ? <ChevronUp className="w-3 h-3" /> : <MoreHorizontal className="w-3 h-3" />}
                    </Button>
                  </div>
                </div>

                {/* Expanded Details */}
                {expanded && (
                  <div className="px-3 pb-3 pt-1 border-t border-slate-100 bg-slate-50/50 space-y-2">
                    {node.description && (
                      <p className="text-[10px] text-slate-600 italic leading-relaxed">
                        "{node.description}"
                      </p>
                    )}
                    
                    <div className="flex flex-wrap gap-2">
                      {deps?.predecessors.length > 0 && (
                        <div className="text-[9px] bg-blue-50 text-blue-700 px-2 py-1 rounded-md">
                          ◀ {deps.predecessors.map(p => p.title).join(', ')}
                        </div>
                      )}
                      {deps?.successors.length > 0 && (
                        <div className="text-[9px] bg-green-50 text-green-700 px-2 py-1 rounded-md">
                          {deps.successors.map(s => s.title).join(', ')} ▶
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-[9px] flex-1 rounded-md gap-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          onNodeEdit(node);
                        }}
                      >
                        <Edit3 className="w-3 h-3" /> Bearbeiten
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-[9px] text-red-500 hover:text-red-600 hover:bg-red-50 rounded-md gap-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          onNodeDelete(node.id);
                        }}
                      >
                        <Trash2 className="w-3 h-3" /> Löschen
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Hint */}
      {nodes.length > 0 && (
        <p className="text-[9px] text-slate-400 text-center italic">
          Ziehen Sie Schritte zum Neuordnen • Klicken zum Auswählen
        </p>
      )}
    </div>
  );
}
