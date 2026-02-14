
"use client";

import { useState, useMemo, useEffect, useRef } from 'react';
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
  Plus,
  ArrowRight,
  Zap,
  Info,
  ExternalLink,
  Eye,
  FileEdit,
  Trash2,
  AlertTriangle,
  BadgeCheck,
  BrainCircuit,
  Target,
  Server,
  X,
  BookOpen,
  Share2,
  FileDown,
  Download,
  Briefcase,
  Bold,
  Italic,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Link as LinkIcon,
  Table as TableIcon,
  Minus,
  CalendarDays,
  Image as LuImage,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Type,
  PlusSquare,
  Columns,
  Rows,
  Trash,
  Paperclip,
  ImageIcon,
  FileUp,
  Search,
  Check,
  LayoutGrid,
  Layers,
  Globe,
  Lock,
  UserPlus,
  ShieldAlert,
  Settings2
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePluggableCollection } from '@/hooks/data/use-pluggable-collection';
import { useSettings } from '@/context/settings-context';
import { usePlatformAuth } from '@/context/auth-context';
import { Policy, PolicyVersion, JobTitle, MediaFile, Risk, RiskMeasure, Resource, RiskControl, BookStackConfig, Tenant, PlatformRole, PolicyPermission } from '@/lib/types';
import { approvePolicyAction, commitPolicyVersionAction, linkPolicyEntityAction, unlinkPolicyEntityAction, savePolicyPermissionAction, removePolicyPermissionAction } from '@/app/actions/policy-actions';
import { saveMediaAction, deleteMediaAction } from '@/app/actions/media-actions';
import { publishPolicyToBookStackAction } from '@/app/actions/bookstack-actions';
import { runPolicyValidation, PolicyValidatorOutput } from '@/ai/flows/policy-validator-flow';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { exportPolicyPdf, exportPolicyDocx } from '@/lib/export-utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';

// TipTap Imports
import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import Typography from '@tiptap/extension-typography';

export default function PolicyDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = usePlatformAuth();
  const { dataSource, activeTenantId } = useSettings();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaPickerInputRef = useRef<HTMLInputElement>(null);
  
  const [mounted, setMounted] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [changelog, setChangelog] = useState('');

  // UI States
  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);
  const [isPermDialogOpen, setIsPermDialogOpen] = useState(false);

  // Permission Form
  const [newPermRole, setNewPermRole] = useState('');
  const [newPermType, setNewPermType] = useState<'read' | 'write'>('read');

  // AI State
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiAuditResult, setAiAuditResult] = useState<PolicyValidatorOutput | null>(null);

  const { data: policies, isLoading: isPolLoading, refresh: refreshPolicies } = usePluggableCollection<Policy>('policies');
  const { data: versions, refresh: refreshVersions } = usePluggableCollection<any>('policy_versions');
  const { data: mediaFiles, refresh: refreshMedia } = usePluggableCollection<MediaFile>('media');
  const { data: jobTitles } = usePluggableCollection<JobTitle>('jobTitles');
  const { data: risks } = usePluggableCollection<Risk>('risks');
  const { data: measures } = usePluggableCollection<RiskMeasure>('riskMeasures');
  const { data: policyLinks, refresh: refreshLinks } = usePluggableCollection<any>('policy_links');
  const { data: permissions, refresh: refreshPerms } = usePluggableCollection<PolicyPermission>('policy_permissions');
  const { data: platformRoles } = usePluggableCollection<PlatformRole>('platformRoles');
  const { data: bsConfigs } = usePluggableCollection<BookStackConfig>('bookstackConfigs');
  const { data: tenants } = usePluggableCollection<Tenant>('tenants');

  const policy = useMemo(() => policies?.find(p => p.id === id), [policies, id]);
  const parent = useMemo(() => policies?.find(p => p.id === policy?.parentId), [policies, policy]);

  const policyVersions = useMemo(() => 
    (versions || [])
      .filter((v: any) => v.policyId === id)
      .sort((a: any, b: any) => b.version - a.version || b.revision - a.revision) || [], 
    [versions, id]
  );
  const activeVersion = policyVersions[0];
  
  const currentPermissions = useMemo(() => 
    permissions?.filter(p => p.policyId === id) || [], 
    [permissions, id]
  );

  const parentPermissions = useMemo(() => {
    if (!policy?.parentId) return [];
    return permissions?.filter(p => p.policyId === policy.parentId) || [];
  }, [permissions, policy]);

  const hasBookStack = bsConfigs?.some(c => c.enabled);
  const tenant = useMemo(() => tenants?.find(t => t.id === policy?.tenantId), [tenants, policy]);

  const linkedRisks = useMemo(() => {
    const ids = policyLinks?.filter((l: any) => l.policyId === id && l.targetType === 'risk').map((l: any) => l.targetId);
    return risks?.filter(r => ids?.includes(r.id)) || [];
  }, [policyLinks, risks, id]);

  const linkedMeasures = useMemo(() => {
    const ids = policyLinks?.filter((l: any) => l.policyId === id && l.targetType === 'measure').map((l: any) => l.targetId);
    return measures?.filter(m => ids?.includes(m.id)) || [];
  }, [policyLinks, measures, id]);

  const linkedPolicies = useMemo(() => {
    const ids = policyLinks?.filter((l: any) => l.policyId === id && l.targetType === 'policy').map((l: any) => l.targetId);
    return policies?.filter(p => ids?.includes(p.id)) || [];
  }, [policyLinks, policies, id]);

  // TipTap Editor Configuration
  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({ inline: true, allowBase64: true, HTMLAttributes: { class: 'rounded-lg shadow-md border max-w-full h-auto' } }),
      Table.configure({ resizable: true, HTMLAttributes: { class: 'border-collapse table-auto w-full border border-slate-200 rounded-lg overflow-hidden' } }),
      TableRow, TableHeader, TableCell, Link, TextAlign.configure({ types: ['heading', 'paragraph'] }), Highlight, Typography,
      Placeholder.configure({ placeholder: 'Erstellen Sie den Inhalt der Richtlinie...' })
    ],
    content: '',
    editable: false,
  });

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (editor && activeVersion && !editMode) {
      editor.commands.setContent(activeVersion.content);
      editor.setEditable(false);
    }
  }, [activeVersion, editor, editMode]);

  useEffect(() => { if (editor) editor.setEditable(editMode); }, [editMode, editor]);

  const handleApprove = async () => {
    if (!id) return;
    setIsApproving(true);
    try {
      const res = await approvePolicyAction(id as string, user?.email || 'system', dataSource);
      if (res.success) {
        toast({ title: "Richtlinie freigegeben", description: "Das Dokument ist nun offiziell gültig." });
        refreshPolicies();
      }
    } finally { setIsApproving(false); }
  };

  const handleAddPermission = async () => {
    if (!newPermRole || !id) return;
    const res = await savePolicyPermissionAction({
      policyId: id as string,
      platformRoleId: newPermRole,
      permission: newPermType
    }, dataSource);
    if (res.success) {
      toast({ title: "Berechtigung hinzugefügt" });
      refreshPerms();
      setNewPermRole('');
    }
  };

  const handleSaveVersion = async (isMajor: boolean = false) => {
    if (!id || !editor) return;
    const content = editor.getHTML();
    setIsSaving(true);
    try {
      const res = await commitPolicyVersionAction(id as string, activeVersion?.version || 1, content, changelog || (isMajor ? "Release Candidate" : "Revision"), user?.email || 'system', dataSource, isMajor);
      if (res.success) {
        toast({ title: isMajor ? "Prüfung angefordert" : "Revision gespeichert" });
        setEditMode(false); setChangelog(''); refreshVersions(); refreshPolicies();
      }
    } finally { setIsSaving(false); }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      const mediaId = `med-pol-${Math.random().toString(36).substring(2, 9)}`;
      const res = await saveMediaAction({
        id: mediaId, tenantId: policy?.tenantId || activeTenantId || 'global',
        module: 'PolicyHub', entityId: id as string, fileName: file.name,
        fileType: file.type, fileSize: file.size, fileUrl: base64,
        createdAt: new Date().toISOString(), createdBy: user?.email || 'system'
      }, dataSource);
      if (res.success) { toast({ title: "Anhang hinzugefügt" }); refreshMedia(); }
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  if (!mounted) return null;
  if (isPolLoading) return <div className="h-full flex flex-col items-center justify-center py-40 gap-4"><Loader2 className="w-12 h-12 animate-spin text-emerald-600 opacity-20" /></div>;
  if (!policy) return null;

  const canApprove = (policy.status === 'draft' || policy.status === 'review') && user?.role === 'superAdmin';

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-700 max-w-[1600px] mx-auto p-4 md:p-8">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b pb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/policies')} className="h-10 w-10 text-slate-400 hover:bg-slate-100 rounded-xl"><ChevronLeft className="w-6 h-6" /></Button>
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-headline font-bold text-slate-800 dark:text-white uppercase tracking-tight">{policy.title}</h1>
              <Badge className={cn(
                "rounded-full px-3 h-6 text-[10px] font-black uppercase border-none shadow-sm",
                policy.status === 'published' ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"
              )}>{policy.status}</Badge>
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5 flex items-center gap-2">
              <ScrollText className="w-3 h-3" /> Eigenständige Richtlinie • V{policy.currentVersion}.0
              {parent && <span className="flex items-center gap-1 text-primary"><Lock className="w-3 h-3" /> Erbt von: {parent.title}</span>}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {canApprove && (
            <Button className="h-10 rounded-xl font-black text-xs px-8 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg animate-pulse" onClick={handleApprove} disabled={isApproving}>
              {isApproving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ShieldCheck className="w-4 h-4 mr-2" />} Freigeben
            </Button>
          )}
          <Button variant="outline" size="sm" className="h-10 rounded-xl font-bold text-xs px-6 border-indigo-200 text-indigo-700 hover:bg-indigo-50 shadow-sm" onClick={handleAiAudit} disabled={isAiLoading}>
            {isAiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <BrainCircuit className="w-4 h-4 mr-2" />} KI Audit
          </Button>
          {!editMode ? (
            <Button size="sm" className="h-10 rounded-xl font-bold text-xs px-8 bg-emerald-600 text-white shadow-lg active:scale-95 transition-all" onClick={() => setEditMode(true)}>
              <FileEdit className="w-4 h-4 mr-2" /> Editor öffnen
            </Button>
          ) : (
            <Button size="sm" className="h-10 rounded-xl font-bold text-xs px-8 bg-emerald-600 text-white shadow-lg" onClick={() => handleSaveVersion(false)} disabled={isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Revision sichern
            </Button>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <aside className="lg:col-span-1 space-y-6">
          <Card className="rounded-2xl border shadow-xl bg-white dark:bg-slate-800 overflow-hidden">
            <CardHeader className="bg-slate-50 dark:bg-slate-700 border-b p-4 px-6"><CardTitle className="text-[11px] font-black uppercase tracking-widest text-slate-400">Dokumenten-Info</CardTitle></CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="space-y-1">
                  <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Ownership (Rolle)</p>
                  <div className="flex items-center gap-2 p-2.5 bg-slate-50 dark:bg-slate-900 border rounded-xl shadow-inner">
                    <Briefcase className="w-4 h-4 text-primary" />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{jobTitles?.find(j => j.id === policy.ownerRoleId)?.name || 'Nicht zugewiesen'}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Integrität</p>
                  <Badge variant="outline" className={cn("w-full justify-center h-7 font-black", policy.status === 'published' ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700")}>
                    {policy.status === 'published' ? 'OFFIZIELL GÜLTIG' : 'IN PRÜFUNG'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border shadow-sm bg-white dark:bg-slate-800 overflow-hidden">
            <CardHeader className="bg-slate-50 dark:bg-slate-700 border-b p-4 px-6 flex flex-row items-center justify-between">
              <CardTitle className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                <Paperclip className="w-3.5 h-3.5" /> Anhänge ({mediaFiles?.filter(m => m.entityId === id).length || 0})
              </CardTitle>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" onClick={() => fileInputRef.current?.click()}>
                <Plus className="w-4 h-4" />
              </Button>
              <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-2">
                {mediaFiles?.filter(m => m.entityId === id).map(file => (
                  <div key={file.id} className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border flex items-center justify-between group hover:border-primary/20 transition-all">
                    <div className="min-w-0 flex items-center gap-2">
                      <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
                      <span className="text-[10px] font-bold truncate max-w-[120px]">{file.fileName}</span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 opacity-0 group-hover:opacity-100" onClick={() => deleteMediaAction(file.id, file.tenantId, user?.email || 'admin', dataSource).then(() => refreshMedia())}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </aside>

        <div className="lg:col-span-3">
          <Tabs defaultValue="content" className="space-y-6">
            <TabsList className="bg-slate-100 dark:bg-slate-800 p-1.5 h-14 rounded-2xl border w-full justify-start gap-2 shadow-inner">
              <TabsTrigger value="content" className="rounded-xl px-6 gap-3 text-[11px] font-black uppercase tracking-widest data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-lg"><BookOpen className="w-4 h-4" /> Inhalt</TabsTrigger>
              <TabsTrigger value="links" className="rounded-xl px-6 gap-3 text-[11px] font-black uppercase tracking-widest data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-lg"><Target className="w-4 h-4" /> GRC-Bezug</TabsTrigger>
              <TabsTrigger value="perms" className="rounded-xl px-6 gap-3 text-[11px] font-black uppercase tracking-widest data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-lg"><Lock className="w-4 h-4 text-indigo-600" /> Berechtigungen</TabsTrigger>
              <TabsTrigger value="history" className="rounded-xl px-6 gap-3 text-[11px] font-black uppercase tracking-widest data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-lg"><History className="w-4 h-4" /> Historie</TabsTrigger>
            </TabsList>

            <TabsContent value="content" className="animate-in fade-in duration-500">
              {editMode ? (
                <div className="w-full max-w-4xl min-h-[1000px] bg-white dark:bg-slate-800 shadow-2xl mx-auto p-20 rounded-sm relative prose prose-slate dark:prose-invert max-w-none">
                  <EditorContent editor={editor} className="outline-none min-h-[800px]" />
                </div>
              ) : (
                <Card className="rounded-2xl border shadow-xl bg-white dark:bg-slate-800 p-16 min-h-[700px] relative overflow-hidden">
                  <div className="max-w-4xl mx-auto">
                    {activeVersion ? (
                      <div className="space-y-10">
                        <header className="space-y-4">
                          <h1 className="font-headline font-black text-4xl text-slate-800 dark:text-white leading-tight">{policy.title}</h1>
                          <div className="flex items-center gap-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-700 w-fit">
                            <span className="flex items-center gap-2"><CalendarDays className="w-4 h-4 opacity-50" /> {new Date(activeVersion.createdAt).toLocaleDateString()}</span>
                            <span className="flex items-center gap-2"><BadgeCheck className="w-4 h-4 text-emerald-500" /> Version {activeVersion.version}.{activeVersion.revision}</span>
                          </div>
                        </header>
                        <Separator />
                        <div className="text-lg leading-relaxed text-slate-700 dark:text-slate-300 font-medium prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: activeVersion.content }} />
                      </div>
                    ) : (
                      <div className="py-32 text-center space-y-8 opacity-30">
                        <ScrollText className="w-16 h-16 mx-auto text-slate-300" />
                        <p className="text-lg font-bold uppercase tracking-widest text-slate-800">Kein Inhalt vorhanden.</p>
                        <Button className="rounded-xl" onClick={() => setEditMode(true)}>Editor öffnen</Button>
                      </div>
                    )}
                  </div>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="perms" className="space-y-6 animate-in fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="rounded-2xl border shadow-sm bg-white dark:bg-slate-900">
                  <CardHeader className="bg-slate-50 dark:bg-slate-800 border-b p-4 px-6 flex flex-row items-center justify-between">
                    <CardTitle className="text-xs font-black uppercase text-indigo-600 tracking-widest flex items-center gap-2"><Lock className="w-4 h-4" /> Dokumentenzugriff</CardTitle>
                    <Button variant="ghost" size="icon" onClick={() => setIsPermDialogOpen(true)} className="h-8 w-8 text-primary"><Plus className="w-4 h-4" /></Button>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y divide-slate-100">
                      {currentPermissions.map(p => (
                        <div key={p.id} className="p-4 px-6 flex items-center justify-between group">
                          <div className="flex items-center gap-3">
                            <Shield className="w-4 h-4 text-indigo-400" />
                            <div><p className="text-xs font-bold text-slate-800 dark:text-white">{platformRoles?.find(r => r.id === p.platformRoleId)?.name}</p><p className="text-[9px] text-slate-400 uppercase font-black">{p.permission}</p></div>
                          </div>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 opacity-0 group-hover:opacity-100" onClick={() => removePolicyPermissionAction(p.id, dataSource).then(() => refreshPerms())}><X className="w-3.5 h-3.5" /></Button>
                        </div>
                      ))}
                      {currentPermissions.length === 0 && <p className="py-12 text-center text-[10px] text-slate-300 uppercase italic">Keine individuellen Rechte definiert</p>}
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border shadow-sm bg-white dark:bg-slate-900">
                  <CardHeader className="bg-indigo-50/50 dark:bg-indigo-900/10 border-b p-4 px-6"><CardTitle className="text-xs font-black uppercase text-indigo-700 dark:text-indigo-300 flex items-center gap-2"><Network className="w-4 h-4" /> Geerbte Rechte</CardTitle></CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y divide-slate-100">
                      {parentPermissions.map(p => (
                        <div key={p.id} className="p-4 px-6 flex items-center gap-3 opacity-60">
                          <ShieldAlert className="w-4 h-4 text-slate-400" />
                          <div><p className="text-xs font-bold text-slate-800 dark:text-white">{platformRoles?.find(r => r.id === p.platformRoleId)?.name}</p><p className="text-[9px] text-slate-400 uppercase font-black">{p.permission} (inherited)</p></div>
                        </div>
                      ))}
                      {parentPermissions.length === 0 && <p className="py-12 text-center text-[10px] text-slate-300 uppercase italic">Keine vererbten Rechte</p>}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="links" className="space-y-6">
              {/* Linked GRC Elements Content */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="rounded-2xl border shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
                  <CardHeader className="bg-slate-50 dark:bg-slate-800 border-b p-4 px-8"><CardTitle className="text-xs font-black uppercase text-primary tracking-widest flex items-center gap-2"><Layers className="w-3.5 h-3.5" /> Querverweise</CardTitle></CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y divide-slate-100">
                      {linkedPolicies.map(lp => (
                        <div key={lp.id} className="p-4 px-8 flex items-center justify-between group hover:bg-slate-50 transition-colors">
                          <div className="flex items-center gap-4"><ScrollText className="w-5 h-5 text-indigo-400" /><span className="text-xs font-bold text-slate-800 dark:text-white">{lp.title}</span></div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => router.push(`/policies/${lp.id}`)}><ExternalLink className="w-3.5 h-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400" onClick={() => handleUnlink(lp.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="history" className="animate-in fade-in duration-500">
              <Card className="rounded-2xl border shadow-xl bg-white dark:bg-slate-800 overflow-hidden">
                <CardHeader className="bg-slate-50 dark:bg-slate-700 border-b p-6 px-8"><div className="flex items-center gap-3"><History className="w-5 h-5 text-slate-500" /><CardTitle className="text-sm font-headline font-bold uppercase tracking-tight">Audit Trail & Revisionen</CardTitle></div></CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-slate-100">
                    {policyVersions.map(v => (
                      <div key={v.id} className="p-8 hover:bg-slate-50 transition-all flex items-start justify-between group">
                        <div className="flex items-start gap-6">
                          <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center border shadow-inner", v.revision === 0 ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-400")}>
                            {v.revision === 0 ? <BadgeCheck className="w-7 h-7" /> : <History className="w-7 h-7" />}
                          </div>
                          <div><h4 className="font-black text-slate-800 text-base">Version {v.version}.{v.revision}</h4><p className="text-[11px] text-slate-600 italic bg-slate-50 p-3 rounded-xl border border-dashed mt-2">"{v.changelog || 'Revision'}"</p></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <Dialog open={isPermDialogOpen} onOpenChange={setIsPermDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl p-0 overflow-hidden bg-white shadow-2xl border-none">
          <DialogHeader className="p-6 bg-slate-900 text-white shrink-0">
            <div className="flex items-center gap-4">
              <Lock className="w-6 h-6 text-primary" />
              <DialogTitle className="text-lg font-headline font-bold uppercase tracking-tight">Zugriffsberechtigung hinzufügen</DialogTitle>
            </div>
          </DialogHeader>
          <div className="p-8 space-y-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-400">Plattform-Rolle wählen</Label>
              <Select value={newPermRole} onValueChange={setNewPermRole}>
                <SelectTrigger className="rounded-xl h-11"><SelectValue placeholder="Rolle wählen..." /></SelectTrigger>
                <SelectContent className="rounded-xl">
                  {platformRoles?.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-400">Zugriffsebene</Label>
              <Select value={newPermType} onValueChange={(v:any) => setNewPermType(v)}>
                <SelectTrigger className="rounded-xl h-11"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-xl"><SelectItem value="read">Nur Lesen</SelectItem><SelectItem value="write">Lese- & Schreibrecht</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="p-4 bg-slate-50 border-t flex gap-2">
            <Button variant="ghost" onClick={() => setIsPermDialogOpen(false)}>Abbrechen</Button>
            <Button className="rounded-xl bg-primary text-white font-black text-[10px] px-8 h-11 uppercase" onClick={handleAddPermission} disabled={!newPermRole}>Hinzufügen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
