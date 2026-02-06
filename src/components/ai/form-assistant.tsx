
"use client";

import { useState } from 'react';
import { 
  BrainCircuit, 
  Sparkles, 
  Loader2, 
  Check, 
  Send, 
  MessageSquare,
  ChevronRight,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { getFormSuggestions } from '@/ai/flows/form-assistant-flow';
import { useSettings } from '@/context/settings-context';
import { cn } from '@/lib/utils';

interface AiFormAssistantProps {
  formType: 'resource' | 'risk' | 'measure' | 'gdpr';
  currentData: any;
  onApply: (suggestions: any) => void;
}

export function AiFormAssistant({ formType, currentData, onApply }: AiFormAssistantProps) {
  const { dataSource } = useSettings();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [lastResult, setLastResult] = useState<any>(null);

  const handleAsk = async () => {
    if (!query.trim()) return;
    setIsLoading(true);
    setHistory(prev => [...prev, { type: 'user', text: query }]);
    
    try {
      const res = await getFormSuggestions({
        formType,
        partialData: currentData,
        userPrompt: query,
        dataSource
      });
      
      setLastResult(res);
      setHistory(prev => [...prev, { 
        type: 'ai', 
        text: res.explanation,
        suggestions: res.suggestions 
      }]);
      setQuery('');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative">
      <Button 
        variant="outline" 
        size="sm" 
        className="h-8 rounded-none border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 gap-2 font-black uppercase text-[9px]"
        onClick={() => setIsOpen(!isOpen)}
      >
        <BrainCircuit className="w-3.5 h-3.5" />
        KI Hilfe
      </Button>

      {isOpen && (
        <div className="fixed bottom-20 right-8 w-[400px] h-[500px] bg-white border-2 shadow-2xl z-[100] flex flex-col animate-in slide-in-from-bottom-4">
          <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-[10px] font-black uppercase tracking-widest">KI Governance Assistent</span>
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-white hover:bg-white/10" onClick={() => setIsOpen(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          <ScrollArea className="flex-1 p-4 bg-slate-50/50">
            <div className="space-y-4">
              {history.length === 0 && (
                <div className="text-center py-10 space-y-2">
                  <BrainCircuit className="w-8 h-8 text-slate-200 mx-auto" />
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Wie kann ich Ihnen bei diesem {formType} helfen?</p>
                  <p className="text-[9px] text-slate-400 italic">"Schlage eine Risikobewertung für Malware vor" oder "Fülle die DSGVO-Felder aus"</p>
                </div>
              )}
              {history.map((msg, i) => (
                <div key={i} className={cn("flex flex-col gap-2", msg.type === 'user' ? "items-end" : "items-start")}>
                  <div className={cn(
                    "p-3 text-[11px] leading-relaxed max-w-[85%]",
                    msg.type === 'user' ? "bg-primary text-white" : "bg-white border shadow-sm text-slate-700"
                  )}>
                    {msg.text}
                  </div>
                  {msg.suggestions && Object.keys(msg.suggestions).length > 0 && (
                    <div className="w-full space-y-2 mt-1">
                      <div className="p-3 bg-blue-50 border border-blue-100 space-y-2">
                        <p className="text-[9px] font-black uppercase text-blue-700">Änderungsvorschlag:</p>
                        <div className="space-y-1">
                          {Object.entries(msg.suggestions).map(([key, val]: [string, any]) => (
                            <div key={key} className="text-[9px] flex gap-2">
                              <span className="font-bold text-slate-500 uppercase">{key}:</span>
                              <span className="text-slate-700 italic truncate">{String(val)}</span>
                            </div>
                          ))}
                        </div>
                        <Button 
                          size="sm" 
                          className="w-full h-7 rounded-none bg-blue-600 hover:bg-blue-700 text-white text-[9px] font-black uppercase"
                          onClick={() => {
                            onApply(msg.suggestions);
                            setIsOpen(false);
                          }}
                        >
                          Vorschläge übernehmen
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white border p-3 rounded-none flex items-center gap-2">
                    <Loader2 className="w-3 h-3 animate-spin text-primary" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Analysiere...</span>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="p-4 border-t bg-white">
            <div className="flex gap-2">
              <Input 
                placeholder="Schreiben Sie eine Anweisung..." 
                value={query} 
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAsk()}
                className="h-10 text-xs rounded-none border-2 focus:ring-0"
              />
              <Button size="icon" className="h-10 w-10 shrink-0 rounded-none" onClick={handleAsk} disabled={isLoading || !query}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
