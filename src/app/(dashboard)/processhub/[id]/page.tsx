
"use client";

import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  Workflow, 
  MessageSquare, 
  Layers, 
  ChevronLeft, 
  Loader2, 
  Send, 
  Save, 
  Check, 
  X, 
  Zap, 
  Plus, 
  Trash2,
  FileText,
  History,
  ShieldCheck,
  Layout,
  ArrowRight,
  Maximize2,
  Download,
  Share2,
  ExternalLink,
  BookOpen
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePluggableCollection } from '@/hooks/data/use-pluggable-collection';
import { useSettings } from '@/context/settings-context';
import { usePlatformAuth } from '@/context/auth-context';
import { applyProcessOpsAction } from '@/app/actions/process-actions';
import { getProcessSuggestions, ProcessDesignerOutput } from '@/ai/flows/process-designer-flow';
import { publishToBookStackAction } from '@/app/actions/bookstack-actions';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Process, ProcessVersion, ProcessNode, ProcessModel, ProcessLayout } from '@/lib/types';

/**
 * Erzeugt MXGraph XML aus dem semantischen Modell.
 */
function generateMxGraphXml(model: ProcessModel, layout: ProcessLayout) {
  let xml = `<mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/>`;
  
  model.nodes.forEach(node => {
    const pos = layout.positions[node.id] || { x: 100, y: 100 };
    const style = node.type === 'start' ? 'ellipse;whiteSpace=wrap;html=1;aspect=fixed;fillColor=#d5e8d4;strokeColor=#82b366;' : 
                  node.type === 'end' ? 'ellipse;whiteSpace=wrap;html=1;aspect=fixed;fillColor=#f8cecc;strokeColor=#b85450;' :
                  node.type === 'decision' ? 'rhombus;whiteSpace=wrap;html=1;fillColor=#fff2cc;strokeColor=#d6b656;' :
                  'whiteSpace=wrap;html=1;rounded=1;fillColor=#f5f5f5;strokeColor=#666666;';
    
    xml += `<mxCell id="${node.id}" value="${node.title}" style="${style}" vertex="1" parent="1">
      <mxGeometry x="${pos.x}" y="${pos.y}" width="120" height="60" as="geometry"/>
    </mxCell>`;
  });

  model.edges.forEach(edge => {
    xml += `<mxCell id="${edge.id}" value="${edge.label || ''}" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jetline=1;html=1;" edge="1" parent="1" source="${edge.source}" target="${edge.target}">
      <mxGeometry relative="1" as="geometry"/>
    </mxCell>`;
  });

  xml += `</root></mxGraphModel>`;
  return xml;
}

export default function ProcessDesignerPage() {
  const { id } = useParams();
  const router = useRouter();
  const { dataSource } = useSettings();
  const { user } = usePlatformAuth();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState('design');
  const [chatMessage, setChatMessage] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<ProcessDesignerOutput | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const { data: processes } = usePluggableCollection<Process>('processes');
  const { data: versions, refresh: refreshVersion } = usePluggableCollection<ProcessVersion>('process_versions');
  
  const currentProcess = useMemo(() => processes?.find(p => p.id === id), [processes, id]);
  const currentVersion = useMemo(() => versions?.find(v => v.process_id === id), [versions, id]);

  useEffect(() => { setMounted(true); }, []);

  // diagrams.net Bridge Logic
  useEffect(() => {
    if (!mounted || !iframeRef.current || !currentVersion) return;

    const handleMessage = (evt: MessageEvent) => {
      if (evt.data.length === 0) return;
      try {
        const msg = JSON.parse(evt.data);
        if (msg.event === 'init') {
          // Send initial XML
          const xml = generateMxGraphXml(currentVersion.model_json, currentVersion.layout_json);
          iframeRef.current?.contentWindow?.postMessage(JSON.stringify({
            action: 'load',
            xml: xml
          }), '*');
        }
        if (msg.event === 'change') {
          // Here we could parse diagram changes back to semantic ops
          // For MVP, we primarily drive from semantic -> diagram
        }
      } catch (e) {}
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [mounted, currentVersion]);

  // Update Diagram when model changes
  useEffect(() => {
    if (iframeRef.current && currentVersion) {
      const xml = generateMxGraphXml(currentVersion.model_json, currentVersion.layout_json);
      iframeRef.current.contentWindow?.postMessage(JSON.stringify({
        action: 'load',
        xml: xml,
        autosave: 1
      }), '*');
    }
  }, [currentVersion?.revision]);

  const handleApplyOps = async (ops: any[]) => {
    if (!currentVersion || !user) return;
    setIsApplying(true);
    try {
      const res = await applyProcessOpsAction(
        currentVersion.process_id,
        currentVersion.version,
        ops,
        currentVersion.revision,
        user.id,
        dataSource
      );
      if (res.success) {
        toast({ title: "Modell aktualisiert" });
        setAiSuggestions(null);
        refreshVersion();
      } else if (res.conflict) {
        toast({ variant: "destructive", title: "Konflikt", description: "Andere Änderungen wurden erkannt. Bitte neu laden." });
      }
    } finally {
      setIsApplying(false);
    }
  };

  const handleAiChat = async () => {
    if (!chatMessage.trim() || !currentVersion) return;
    setIsAiLoading(true);
    try {
      const suggestions = await getProcessSuggestions({
        userMessage: chatMessage,
        currentModel: currentVersion.model_json,
        dataSource
      });
      setAiSuggestions(suggestions);
      setChatMessage('');
    } finally {
      setIsAiLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!currentProcess || !currentVersion) return;
    setIsPublishing(true);
    
    // diagrams.net export request
    iframeRef.current?.contentWindow?.postMessage(JSON.stringify({ action: 'export', format: 'svg' }), '*');
    
    // Listen for the export response once
    const handleExport = async (evt: MessageEvent) => {
      try {
        const msg = JSON.parse(evt.data);
        if (msg.event === 'export') {
          window.removeEventListener('message', handleExport);
          const svgBase64 = msg.data.split(',')[1] || msg.data;
          const res = await publishToBookStackAction(currentProcess.id, currentVersion.version, svgBase64, dataSource);
          if (res.success) {
            toast({ title: "Veröffentlicht!", description: "Der Prozess ist nun in BookStack verfügbar." });
            window.open(res.url, '_blank');
          } else {
            toast({ variant: "destructive", title: "Export fehlgeschlagen", description: res.error });
          }
          setIsPublishing(false);
        }
      } catch (e) {}
    };
    window.addEventListener('message', handleExport);
    
    // Timeout backup
    setTimeout(() => {
      if (isPublishing) {
        window.removeEventListener('message', handleExport);
        setIsPublishing(false);
        toast({ variant: "destructive", title: "Timeout", description: "Editor hat nicht geantwortet." });
      }
    }, 5000);
  };

  if (!mounted || !currentProcess || !currentVersion) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;
  }

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col -m-8 overflow-hidden bg-background">
      {/* Header Bar */}
      <div className="h-14 border-b bg-card flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/processhub')}><ChevronLeft className="w-5 h-5" /></Button>
          <div>
            <h2 className="font-bold text-sm uppercase tracking-wider">{currentProcess.title}</h2>
            <p className="text-[10px] text-muted-foreground uppercase font-black">Revision: {currentVersion.revision} | V{currentVersion.version}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="rounded-none h-8 text-[9px] font-bold uppercase" onClick={() => setActiveTab('export')}><Share2 className="w-3 h-3 mr-2" /> Export</Button>
          <Button size="sm" className="rounded-none h-8 text-[9px] font-bold uppercase bg-emerald-600 hover:bg-emerald-700" onClick={handlePublish} disabled={isPublishing}>
            {isPublishing ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <BookOpen className="w-3 h-3 mr-2" />}
            Publish to BookStack
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left: Steps */}
        <aside className="w-[350px] border-r flex flex-col bg-slate-50/50">
          <div className="p-4 border-b bg-white flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Prozessschritte</span>
            <Button variant="ghost" size="icon" className="h-6 w-6"><Plus className="w-3.5 h-3.5" /></Button>
          </div>
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-2">
              {currentVersion.model_json.nodes.map((node: ProcessNode) => (
                <div key={node.id} className="p-3 bg-white border border-slate-200 group hover:border-primary transition-all cursor-pointer">
                  <div className="flex items-center justify-between mb-1">
                    <Badge variant="outline" className="text-[8px] h-4 rounded-none">{node.type}</Badge>
                    <span className="text-[8px] font-mono text-slate-300 opacity-0 group-hover:opacity-100">{node.id}</span>
                  </div>
                  <div className="font-bold text-xs">{node.title}</div>
                  {node.description && <div className="text-[10px] text-muted-foreground mt-1 truncate">{node.description}</div>}
                </div>
              ))}
            </div>
          </ScrollArea>
        </aside>

        {/* Middle: Live Diagram */}
        <main className="flex-1 relative bg-white flex flex-col">
          <div className="h-10 border-b bg-slate-50 flex items-center px-4 gap-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
              <TabsList className="bg-transparent h-full p-0 gap-4">
                <TabsTrigger value="design" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary h-full text-[10px] font-bold uppercase">Diagramm</TabsTrigger>
                <TabsTrigger value="compliance" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary h-full text-[10px] font-bold uppercase">Compliance (ISO)</TabsTrigger>
                <TabsTrigger value="export" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary h-full text-[10px] font-bold uppercase">Export</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <div className="flex-1 relative">
            <iframe 
              ref={iframeRef}
              src="https://embed.diagrams.net/?embed=1&ui=min&spin=1&proto=json"
              className="absolute inset-0 w-full h-full border-none"
            />
          </div>
        </main>

        {/* Right: AI Co-Pilot */}
        <aside className="w-[400px] border-l flex flex-col bg-white">
          <div className="p-4 border-b bg-slate-900 text-white flex items-center gap-3">
            <div className="w-8 h-8 bg-primary/20 flex items-center justify-center rounded-sm">
              <Zap className="w-4 h-4 text-primary fill-current" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest block">AI Co-Pilot</span>
              <span className="text-[8px] font-bold text-slate-400 uppercase">Vibecoding aktiv</span>
            </div>
          </div>

          <ScrollArea className="flex-1 p-4 bg-slate-50/30">
            <div className="space-y-6">
              {aiSuggestions ? (
                <div className="animate-in slide-in-from-bottom-2 duration-300">
                  <div className="p-4 bg-blue-50 border-2 border-blue-100 rounded-none space-y-4 shadow-sm">
                    <div className="flex items-center justify-between border-b border-blue-200 pb-2">
                      <p className="text-[10px] font-black uppercase text-blue-700">Vorgeschlagene Änderungen</p>
                      <Badge className="bg-blue-600 text-white text-[8px] rounded-none">{aiSuggestions.proposedOps.length} Ops</Badge>
                    </div>
                    <p className="text-[11px] italic text-slate-700 leading-relaxed">"{aiSuggestions.explanation}"</p>
                    
                    <div className="flex gap-2 pt-2">
                      <Button onClick={() => handleApplyOps(aiSuggestions.proposedOps)} disabled={isApplying} className="flex-1 h-9 rounded-none bg-blue-600 hover:bg-blue-700 text-[10px] font-black uppercase">
                        {isApplying ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <Check className="w-3.5 h-3.5 mr-2" />}
                        Änderungen Übernehmen
                      </Button>
                      <Button variant="outline" onClick={() => setAiSuggestions(null)} className="h-9 rounded-none border-blue-200 text-blue-700 text-[10px] font-black uppercase">
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-20 opacity-20">
                  <MessageSquare className="w-12 h-12 mx-auto mb-4" />
                  <p className="text-[10px] font-black uppercase">Starten Sie das Vibecoding</p>
                  <p className="text-[9px] mt-1 italic">"Erstelle einen Review-Schritt nach dem Start"</p>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="p-4 border-t bg-white">
            <div className="flex gap-2">
              <Input 
                placeholder="Anweisung schreiben..." 
                value={chatMessage}
                onChange={e => setChatMessage(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAiChat()}
                className="h-11 rounded-none border-2 text-xs focus:ring-0 focus:border-slate-900"
                disabled={isAiLoading}
              />
              <Button size="icon" className="h-11 w-11 shrink-0 rounded-none bg-slate-900" onClick={handleAiChat} disabled={isAiLoading || !chatMessage}>
                {isAiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
