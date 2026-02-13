
"use client";

import { useState, useMemo, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ChevronLeft, 
  Loader2, 
  ScrollText, 
  History, 
  Save, 
  CheckCircle2, 
  Clock, 
  Activity, 
  FileText, 
  UserCircle,
  ShieldCheck,
  ChevronRight,
  Plus,
  ArrowRight,
  MessageSquare,
  Zap,
  Info,
  Building2,
  Lock,
  ExternalLink,
  Eye,
  FileEdit,
  Globe,
  Tag,
  Paperclip,
  ImageIcon
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePluggableCollection } from '@/hooks/data/use-pluggable-collection';
import { useSettings } from '@/context/settings-context';
import { usePlatformAuth } from '@/context/auth-context';
import { Policy, PolicyVersion, JobTitle, MediaFile } from '@/lib/types';
import { commitPolicyVersionAction } from '@/app/actions/policy-actions';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

export default function PolicyDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = usePlatformAuth();
  const { dataSource } = useSettings();
  const [mounted, setMounted] = useState(false);
  
  const [editMode, setEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [draftContent, setDraftContent] = useState('');
  const [changelog, setChangelog] = useState('');

  const { data: policies, isLoading: isPolLoading } = usePluggableCollection<Policy>('policies');
  const { data: versions, refresh: refreshVersions } = usePluggableCollection<PolicyVersion>('policy_versions');
  const { data: mediaFiles } = usePluggableCollection<MediaFile>('media');
  const { data: jobTitles } = usePluggableCollection<JobTitle>('jobTitles');

  const policy = useMemo(() => policies?.find(p => p.id === id), [policies, id]);
  const policyVersions = useMemo(() => 
    versions?.filter(v => v.policyId === id)
      .sort((a, b) => b.version - a.version || b.revision - a.revision) || [], 
    [versions, id]
  );
  const activeVersion = policyVersions[0];
  const policyAttachments = mediaFiles?.filter(m => m.entityId === id && m.module === 'PolicyHub') || [];

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (activeVersion && !editMode) {
      setDraftContent(activeVersion.content);
    }
  }, [activeVersion, editMode]);

  const handleSaveVersion = async (isMajor: boolean = false) => {
    if (!id || !draftContent) return;
    setIsSaving(true);
    try {
      const res = await commitPolicyVersionAction(
        id as string, 
        activeVersion?.version || 1, 
        draftContent, 
        changelog || (isMajor ? "Neue Hauptversion" : "Revision"), 
        user?.email || 'system', 
        dataSource, 
        isMajor
      );
      if (res.success) {
        toast({ title: isMajor ? "Version veröffentlicht" : "Revision gespeichert" });
        setEditMode(false);
        setChangelog('');
        refreshVersions();
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (!mounted) return null;
  if (isPolLoading) return <div className="h-full flex flex-col items-center justify-center py-40 gap-4"><Loader2 className="w-12 h-12 animate-spin text-emerald-600 opacity-20" /><p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Lade Dokument...</p></div>;
  if (!policy) return null;

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b pb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/policies')} className="h-10 w-10 text-slate-400 hover:bg-slate-100 rounded-xl">
            <ChevronLeft className="w-6 h-6" />
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-headline font-bold text-slate-900 dark:text-white uppercase tracking-tight">{policy.title}</h1>
              <Badge className="rounded-full px-2 h-5 text-[9px] font-black uppercase bg-emerald-50 text-emerald-700 border-none shadow-sm">{policy.type}</Badge>
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5 flex items-center gap-2">
              <ScrollText className="w-3 h-3" /> Revisionssichere Verwaltung • V{policy.currentVersion}.0
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {!editMode ? (
            <Button size="sm" className="h-10 rounded-xl font-bold text-xs px-8 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg active:scale-95 transition-all" onClick={() => setEditMode(true)}>
              <FileEdit className="w-4 h-4 mr-2" /> Text bearbeiten
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="sm" className="h-10 rounded-xl font-bold text-xs px-6" onClick={() => setEditMode(false)}>Abbrechen</Button>
              <Button size="sm" className="h-10 rounded-xl font-bold text-xs px-8 bg-emerald-600 text-white" onClick={() => handleSaveVersion(false)} disabled={isSaving}>
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} Revision sichern
              </Button>
            </>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <aside className="lg:col-span-1 space-y-6">
          <Card className="rounded-2xl border shadow-xl bg-white dark:bg-slate-900 overflow-hidden group">
            <CardHeader className="bg-slate-50 dark:bg-slate-800 border-b p-4 px-6">
              <CardTitle className="text-[11px] font-black uppercase tracking-widest text-slate-400">Status & Fristen</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 shadow-inner flex flex-col items-center text-center">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Aktueller Stand</span>
                <p className={cn("text-3xl font-black uppercase", policy.status === 'published' ? "text-emerald-600" : "text-blue-600")}>{policy.status}</p>
                <Badge variant="outline" className="mt-2 bg-white text-[8px] font-black">ISO 27001 Konform</Badge>
              </div>
              
              <div className="space-y-4 pt-4 border-t">
                <div className="space-y-1">
                  <Label className="text-[9px] font-black uppercase text-slate-400">Verantwortung (Rolle)</Label>
                  <p className="text-xs font-bold text-slate-800">{jobTitles?.find(j => j.id === policy.ownerRoleId)?.name || 'Nicht zugewiesen'}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-[9px] font-black uppercase text-slate-400">Nächster Review</Label>
                  <div className="flex items-center gap-2 text-xs font-bold text-orange-600">
                    <Clock className="w-3.5 h-3.5" /> in {policy.reviewInterval} Tagen
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
            <CardHeader className="bg-slate-50 border-b p-4 px-6"><CardTitle className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2"><Paperclip className="w-3.5 h-3.5" /> Anhänge ({policyAttachments.length})</CardTitle></CardHeader>
            <CardContent className="p-4 space-y-2">
              {policyAttachments.map(file => (
                <div key={file.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between group hover:border-primary/20 cursor-pointer" onClick={() => window.open(file.fileUrl, '_blank')}>
                  <div className="min-w-0 flex items-center gap-2">
                    <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-[10px] font-bold truncate">{file.fileName}</span>
                  </div>
                  <ExternalLink className="w-3 h-3 text-slate-300 group-hover:text-primary" />
                </div>
              ))}
              {policyAttachments.length === 0 && <p className="py-6 text-center text-[10px] text-slate-300 italic">Keine Quelldokumente hinterlegt.</p>}
            </CardContent>
          </Card>
        </aside>

        <div className="lg:col-span-3">
          <Tabs defaultValue="content" className="space-y-6">
            <TabsList className="bg-slate-100 p-1.5 h-14 rounded-2xl border w-full justify-start gap-2 shadow-inner">
              <TabsTrigger value="content" className="rounded-xl px-6 gap-3 text-[11px] font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-lg">
                <FileText className="w-4 h-4" /> Dokumentinhalt
              </TabsTrigger>
              <TabsTrigger value="history" className="rounded-xl px-6 gap-3 text-[11px] font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-lg">
                <History className="w-4 h-4" /> Versionshistorie
              </TabsTrigger>
            </TabsList>

            <TabsContent value="content" className="animate-in fade-in duration-500">
              {editMode ? (
                <div className="space-y-6">
                  <Card className="rounded-2xl border shadow-xl overflow-hidden">
                    <CardHeader className="bg-slate-900 text-white p-4 px-6 flex flex-row items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FileEdit className="w-5 h-5 text-primary" />
                        <CardTitle className="text-sm font-bold uppercase tracking-widest">Markdown Editor</CardTitle>
                      </div>
                      <Badge className="bg-white/10 text-white border-none rounded-full h-5 text-[8px] font-black uppercase">Live Entwurf</Badge>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Textarea 
                        value={draftContent} 
                        onChange={e => setDraftContent(e.target.value)} 
                        className="min-h-[500px] rounded-none border-none p-8 font-mono text-sm leading-relaxed focus:ring-0 bg-slate-50/30"
                        placeholder="# Überschrift\n\nInhalt hier einfügen..."
                      />
                    </CardContent>
                    <div className="p-6 border-t bg-slate-50 space-y-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Änderungshistorie (Changelog)</Label>
                        <Input value={changelog} onChange={e => setChangelog(e.target.value)} placeholder="Kurze Beschreibung der Anpassungen..." className="h-11 rounded-xl bg-white" />
                      </div>
                      <div className="flex justify-end gap-3">
                        <Button variant="outline" className="rounded-xl h-11 px-8 font-bold text-xs" onClick={() => handleSaveVersion(true)} disabled={isSaving}>Major Release (V{policy.currentVersion + 1}.0)</Button>
                        <Button className="rounded-xl h-11 px-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-lg" onClick={() => handleSaveVersion(false)} disabled={isSaving}>Änderung speichern</Button>
                      </div>
                    </div>
                  </Card>
                </div>
              ) : (
                <Card className="rounded-2xl border shadow-xl bg-white overflow-hidden min-h-[600px]">
                  <CardContent className="p-10 md:p-16">
                    <div className="max-w-3xl mx-auto prose prose-slate dark:prose-invert">
                      {activeVersion ? (
                        <div className="space-y-6">
                          <h1 className="text-3xl font-headline font-black border-b-4 border-primary pb-4 mb-10 text-slate-900">{policy.title}</h1>
                          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 shadow-inner mb-10 italic text-slate-600 text-sm leading-relaxed">
                            {activeVersion.content.split('\n').map((line, i) => (
                              <p key={i} className="mb-4">{line}</p>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="py-20 text-center space-y-4 opacity-30">
                          <AlertTriangle className="w-12 h-12 mx-auto text-amber-500" />
                          <p className="text-sm font-black uppercase">Kein Inhalt hinterlegt</p>
                          <Button variant="outline" size="sm" onClick={() => setEditMode(true)}>Editor öffnen</Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="history" className="animate-in fade-in duration-500">
              <Card className="rounded-2xl border shadow-xl bg-white overflow-hidden">
                <CardContent className="p-0">
                  <div className="divide-y divide-slate-100">
                    {policyVersions.map(v => (
                      <div key={v.id} className="p-6 hover:bg-slate-50 transition-all flex items-start justify-between group">
                        <div className="flex items-start gap-5">
                          <div className={cn(
                            "w-12 h-12 rounded-xl flex items-center justify-center border shadow-inner transition-transform group-hover:scale-110",
                            v.revision === 0 ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-slate-50 text-slate-400 border-slate-100"
                          )}>
                            <History className="w-6 h-6" />
                          </div>
                          <div>
                            <div className="flex items-center gap-3">
                              <h4 className="font-black text-slate-900">Version {v.version}.{v.revision}</h4>
                              {v.revision === 0 && <Badge className="bg-emerald-500 text-white border-none rounded-full text-[8px] h-4 px-2 font-black uppercase">Hauptrelease</Badge>}
                            </div>
                            <p className="text-xs font-medium text-slate-600 mt-1 leading-relaxed">"{v.changelog || 'Keine Änderungshistorie hinterlegt.'}"</p>
                            <div className="flex items-center gap-4 mt-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                              <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> {new Date(v.createdAt).toLocaleString()}</span>
                              <span className="flex items-center gap-1.5"><UserCircle className="w-3 h-3" /> {v.createdBy}</span>
                            </div>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" className="h-9 rounded-xl font-black text-[10px] uppercase gap-2 opacity-0 group-hover:opacity-100 transition-all" onClick={() => setDraftContent(v.content)}>
                          <RotateCcw className="w-3.5 h-3.5" /> Wiederherstellen
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
