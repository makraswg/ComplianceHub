
"use client";

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Briefcase, 
  Building2, 
  Plus, 
  Archive, 
  RotateCcw,
  Search,
  ChevronRight,
  Filter,
  Layers,
  ArrowRight,
  BadgeAlert,
  Loader2,
  Trash2,
  Settings2,
  Network,
  GitBranch,
  UserCircle,
  FileText,
  ChevronDown,
  Pencil,
  Info,
  Save,
  PlusCircle,
  X
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { usePluggableCollection } from '@/hooks/data/use-pluggable-collection';
import { useSettings } from '@/context/settings-context';
import { saveCollectionRecord, deleteCollectionRecord } from '@/app/actions/mysql-actions';
import { toast } from '@/hooks/use-toast';
import { Tenant, Department, JobTitle } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export default function StructureSettingsPage() {
  const { dataSource } = useSettings();
  const [showArchived, setShowArchived] = useState(false);
  const [search, setSearch] = useState('');
  
  // Create State
  const [activeAddParent, setActiveAddParent] = useState<{ id: string, type: 'tenant' | 'dept' } | null>(null);
  const [newName, setNewName] = useState('');

  // Job Editor Dialog
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<JobTitle | null>(null);
  const [jobName, setJobName] = useState('');
  const [jobDesc, setJobDesc] = useState('');
  const [isSavingJob, setIsSavingJob] = useState(false);

  const { data: tenants, refresh: refreshTenants, isLoading: tenantsLoading } = usePluggableCollection<Tenant>('tenants');
  const { data: departments, refresh: refreshDepts, isLoading: deptsLoading } = usePluggableCollection<Department>('departments');
  const { data: jobTitles, refresh: refreshJobs, isLoading: jobsLoading } = usePluggableCollection<JobTitle>('jobTitles');

  const filteredData = useMemo(() => {
    if (!tenants) return [];
    
    return tenants
      .filter(t => (showArchived ? t.status === 'archived' : t.status !== 'archived'))
      .map(tenant => {
        const tenantDepts = departments?.filter(d => 
          d.tenantId === tenant.id && 
          (showArchived ? d.status === 'archived' : d.status !== 'archived')
        ) || [];

        const deptsWithJobs = tenantDepts.map(dept => {
          const deptJobs = jobTitles?.filter(j => 
            j.departmentId === dept.id && 
            (showArchived ? j.status === 'archived' : j.status !== 'archived')
          ) || [];
          return { ...dept, jobs: deptJobs };
        });

        return { ...tenant, departments: deptsWithJobs };
      })
      .filter(t => {
        if (!search) return true;
        const s = search.toLowerCase();
        const hasMatchingJob = t.departments.some(d => d.jobs.some(j => j.name.toLowerCase().includes(s)));
        const hasMatchingDept = t.departments.some(d => d.name.toLowerCase().includes(s));
        return t.name.toLowerCase().includes(s) || hasMatchingDept || hasMatchingJob;
      });
  }, [tenants, departments, jobTitles, search, showArchived]);

  const handleCreate = async () => {
    if (!newName || !activeAddParent) return;
    
    const id = `${activeAddParent.type === 'tenant' ? 'd' : 'j'}-${Math.random().toString(36).substring(2, 7)}`;
    
    if (activeAddParent.type === 'tenant') {
      const data: Department = {
        id,
        tenantId: activeAddParent.id,
        name: newName,
        status: 'active'
      };
      await saveCollectionRecord('departments', id, data, dataSource);
      refreshDepts();
      toast({ title: "Abteilung angelegt" });
    } else {
      const dept = departments?.find(d => d.id === activeAddParent.id);
      if (!dept) return;
      const data: JobTitle = {
        id,
        tenantId: dept.tenantId,
        departmentId: activeAddParent.id,
        name: newName,
        status: 'active'
      };
      await saveCollectionRecord('jobTitles', id, data, dataSource);
      refreshJobs();
      toast({ title: "Stelle angelegt" });
    }
    
    setNewName('');
    setActiveAddParent(null);
  };

  const handleStatusChange = async (coll: string, item: any, newStatus: 'active' | 'archived') => {
    const updated = { ...item, status: newStatus };
    const res = await saveCollectionRecord(coll, item.id, updated, dataSource);
    if (res.success) {
      toast({ title: newStatus === 'archived' ? "Archiviert" : "Reaktiviert" });
      if (coll === 'tenants') refreshTenants();
      if (coll === 'departments') refreshDepts();
      if (coll === 'jobTitles') refreshJobs();
    }
  };

  const openJobEditor = (job: JobTitle) => {
    setEditingJob(job);
    setJobName(job.name);
    setJobDesc(job.description || '');
    setIsEditorOpen(true);
  };

  const saveJobEdits = async () => {
    if (!editingJob) return;
    setIsSavingJob(true);
    const updated = { ...editingJob, name: jobName, description: jobDesc };
    try {
      const res = await saveCollectionRecord('jobTitles', editingJob.id, updated, dataSource);
      if (res.success) {
        toast({ title: "Stelle aktualisiert" });
        setIsEditorOpen(false);
        refreshJobs();
      }
    } finally {
      setIsSavingJob(false);
    }
  };

  return (
    <div className="space-y-10 pb-20">
      {/* Dynamic Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-200 dark:border-slate-800 pb-8 bg-gradient-to-r from-transparent via-slate-50/50 to-transparent">
        <div>
          <Badge className="mb-2 rounded-full px-3 py-0 bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest border-none">Org Structure</Badge>
          <h1 className="text-4xl font-headline font-bold tracking-tight text-slate-900 dark:text-white uppercase">Konzern-Struktur</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Stellenplan & hierarchische Definition der Organisationseinheiten.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button 
            variant="outline" 
            className={cn(
              "h-11 rounded-2xl font-bold uppercase text-[10px] tracking-widest px-6 border-slate-200 dark:border-slate-800 transition-all",
              showArchived ? "text-orange-600 bg-orange-50 border-orange-200" : "hover:bg-slate-50 dark:hover:bg-slate-900"
            )} 
            onClick={() => setShowArchived(!showArchived)}
          >
            {showArchived ? <RotateCcw className="w-4 h-4 mr-2" /> : <Archive className="w-4 h-4 mr-2" />}
            {showArchived ? 'Archiv verlassen' : 'Archiv einblenden'}
          </Button>
        </div>
      </div>

      {/* Global Search */}
      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
        <Input 
          placeholder="Nach Mandant, Abteilung oder Stelle suchen..." 
          className="pl-11 h-14 rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 focus:bg-white transition-all shadow-xl shadow-slate-200/20 dark:shadow-none"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Unified Hierarchical Explorer */}
      <div className="space-y-6">
        {(tenantsLoading || deptsLoading || jobsLoading) ? (
          <div className="flex flex-col items-center justify-center py-40 gap-4">
            <Loader2 className="w-12 h-12 animate-spin text-primary opacity-20" />
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Analysiere Hierarchie...</p>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="py-40 text-center space-y-6 bg-white dark:bg-slate-900 rounded-[3rem] border-2 border-dashed border-slate-100 dark:border-slate-800">
            <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800 rounded-[2.5rem] flex items-center justify-center mx-auto opacity-50 border-2 border-slate-200 dark:border-slate-700">
              <Network className="w-10 h-10 text-slate-400" />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-black uppercase text-slate-400 tracking-[0.2em]">Keine Einträge gefunden</p>
              <p className="text-xs text-slate-400 font-bold uppercase">Passen Sie Ihre Suche oder die Archiv-Filter an.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {filteredData.map(tenant => (
              <Card key={tenant.id} className="rounded-[2.5rem] border-none shadow-xl shadow-slate-200/50 dark:shadow-none bg-white dark:bg-slate-900 overflow-hidden">
                <CardHeader className="bg-slate-900 text-white p-8 flex flex-row items-center justify-between shrink-0">
                  <div className="flex items-center gap-6">
                    <div className="w-14 h-14 bg-primary/20 rounded-2xl flex items-center justify-center text-primary shadow-xl shadow-black/20">
                      <Building2 className="w-7 h-7" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-headline font-bold uppercase tracking-tight">{tenant.name}</CardTitle>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">Konzern-Mandant • {tenant.slug}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button 
                      size="sm" 
                      className="rounded-xl h-9 text-[10px] font-black uppercase px-4 bg-white/10 hover:bg-white/20 text-white border border-white/10 gap-2"
                      onClick={() => setActiveAddParent({ id: tenant.id, type: 'tenant' })}
                    >
                      <PlusCircle className="w-3.5 h-3.5" /> Abteilung
                    </Button>
                    <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-400 hover:text-red-500" onClick={() => handleStatusChange('tenants', tenant, tenant.status === 'active' ? 'archived' : 'active')}>
                      {tenant.status === 'active' ? <Archive className="w-4 h-4" /> : <RotateCcw className="w-4 h-4" />}
                    </Button>
                  </div>
                </CardHeader>
                
                <CardContent className="p-0">
                  {/* Departments within Tenant */}
                  <div className="divide-y divide-slate-50 dark:divide-slate-800">
                    {tenant.departments.map(dept => (
                      <div key={dept.id} className="group/dept">
                        <div className="flex items-center justify-between p-6 px-10 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-inner">
                              <Layers className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">{dept.name}</h4>
                              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{dept.jobs.length} Stellen definiert</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 opacity-0 group-hover/dept:opacity-100 transition-opacity">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 text-[9px] font-black uppercase text-emerald-600 hover:bg-emerald-50 rounded-lg gap-1.5"
                              onClick={() => setActiveAddParent({ id: dept.id, type: 'dept' })}
                            >
                              <Plus className="w-3 h-3" /> Stelle
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-red-500 rounded-lg" onClick={() => handleStatusChange('departments', dept, dept.status === 'active' ? 'archived' : 'active')}>
                              <Archive className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>

                        {/* Jobs within Department */}
                        <div className="bg-slate-50/30 dark:bg-slate-950/30 px-10 pb-6 space-y-2">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {dept.jobs.map(job => (
                              <div key={job.id} className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm group/job hover:border-primary/30 transition-all hover:shadow-md cursor-pointer" onClick={() => openJobEditor(job)}>
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="w-8 h-8 rounded-lg bg-slate-50 text-slate-400 flex items-center justify-center shrink-0">
                                    <Briefcase className="w-4 h-4" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{job.name}</p>
                                    {job.description && <p className="text-[8px] text-slate-400 uppercase font-bold truncate tracking-widest mt-0.5 italic">Doku bereit</p>}
                                  </div>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover/job:opacity-100 transition-opacity">
                                  <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md" onClick={(e) => { e.stopPropagation(); openJobEditor(job); }}><Pencil className="w-3 h-3" /></Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md text-red-400 hover:text-red-600" onClick={(e) => { e.stopPropagation(); handleStatusChange('jobTitles', job, job.status === 'active' ? 'archived' : 'active'); }}><Archive className="w-3 h-3" /></Button>
                                </div>
                              </div>
                            ))}
                            
                            {/* Inline Add Button for Job if parent is this Dept */}
                            {activeAddParent?.id === dept.id && activeAddParent.type === 'dept' ? (
                              <div className="col-span-full mt-2 animate-in slide-in-from-top-2">
                                <div className="flex gap-2 p-3 bg-white dark:bg-slate-900 rounded-2xl border-2 border-primary shadow-lg">
                                  <Input 
                                    autoFocus
                                    placeholder="Bezeichnung der neuen Stelle..." 
                                    value={newName} 
                                    onChange={e => setNewName(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleCreate()}
                                    className="h-10 border-none shadow-none text-xs font-bold"
                                  />
                                  <Button size="sm" className="h-10 px-6 rounded-xl font-black uppercase text-[10px]" onClick={handleCreate}>Erstellen</Button>
                                  <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => setActiveAddParent(null)}><X className="w-4 h-4" /></Button>
                                </div>
                              </div>
                            ) : (
                              dept.jobs.length === 0 && (
                                <p className="text-[10px] text-slate-300 font-black uppercase italic tracking-widest py-2 px-2">Keine Stellen definiert</p>
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Inline Add for Department if parent is this Tenant */}
                    {activeAddParent?.id === tenant.id && activeAddParent.type === 'tenant' && (
                      <div className="p-6 px-10 bg-primary/5 animate-in slide-in-from-top-2 border-y-2 border-primary/20">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center shadow-lg"><Layers className="w-5 h-5" /></div>
                          <div className="flex-1">
                            <Label className="text-[9px] font-black uppercase text-primary ml-1 mb-1.5 block tracking-widest">Neue Abteilung für {tenant.name}</Label>
                            <div className="flex gap-2">
                              <Input 
                                autoFocus
                                placeholder="Abteilungsname (z.B. Logistik, Vertrieb...)" 
                                value={newName} 
                                onChange={e => setNewName(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                                className="h-12 border-slate-200 dark:border-slate-800 rounded-xl bg-white text-sm font-bold"
                              />
                              <Button className="h-12 px-8 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20" onClick={handleCreate}>Anlegen</Button>
                              <Button variant="ghost" size="icon" className="h-12 w-12 rounded-xl text-slate-400" onClick={() => setActiveAddParent(null)}><X className="w-5 h-5" /></Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Job Editor Dialog */}
      <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <DialogContent className="max-w-2xl w-[95vw] rounded-[2rem] md:rounded-[3rem] p-0 overflow-hidden flex flex-col border-none shadow-2xl bg-white dark:bg-slate-950 h-[90vh] md:h-auto">
          <DialogHeader className="p-6 md:p-10 bg-slate-900 text-white shrink-0">
            <div className="flex items-center gap-6">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-primary/20 rounded-2xl flex items-center justify-center text-primary shadow-xl">
                <Briefcase className="w-6 h-6 md:w-8 md:h-8" />
              </div>
              <div>
                <DialogTitle className="text-xl md:text-2xl font-headline font-bold uppercase tracking-tight">Stelle bearbeiten</DialogTitle>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1.5 tracking-widest">Detail-Dokumentation für Audit-Zwecke</p>
              </div>
            </div>
          </DialogHeader>
          <ScrollArea className="flex-1">
            <div className="p-6 md:p-10 space-y-8">
              <div className="space-y-2">
                <Label className="text-[9px] font-black uppercase text-slate-400 ml-1 tracking-widest">Bezeichnung</Label>
                <Input value={jobName} onChange={e => setJobName(e.target.value)} className="rounded-2xl h-12 md:h-14 font-bold text-lg border-slate-200" />
              </div>
              <div className="space-y-2">
                <Label className="text-[9px] font-black uppercase text-slate-400 ml-1 tracking-widest">Stellenbeschreibung (Aufgaben & Kompetenzen)</Label>
                <Textarea value={jobDesc} onChange={e => setJobDesc(e.target.value)} className="min-h-[200px] rounded-3xl p-6 text-sm leading-relaxed border-slate-200" placeholder="Beschreiben Sie hier die Hauptaufgaben der Stelle..." />
              </div>
              <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800">
                <p className="text-[10px] text-slate-500 italic leading-relaxed">
                  <Info className="w-3.5 h-3.5 inline mr-1 text-primary" /> 
                  Diese Beschreibung dient der KI als Basis zur Bewertung, ob zugewiesene Berechtigungen (IAM) zur fachlichen Aufgabe passen (Least Privilege Check).
                </p>
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="p-6 md:p-8 bg-slate-50 dark:bg-slate-900/50 border-t shrink-0 flex flex-col sm:flex-row gap-3">
            <Button variant="ghost" onClick={() => setIsEditorOpen(false)} className="rounded-xl h-12 font-black uppercase text-[10px]">Abbrechen</Button>
            <Button onClick={saveJobEdits} disabled={isSavingJob} className="rounded-2xl h-12 md:h-14 px-12 bg-slate-900 text-white font-black uppercase text-[10px] tracking-widest shadow-xl">
              {isSavingJob ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />} Änderungen Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
