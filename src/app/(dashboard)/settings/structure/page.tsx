
"use client";

import { useState, useMemo } from 'react';
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
  Loader2
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { usePluggableCollection } from '@/hooks/data/use-pluggable-collection';
import { useSettings } from '@/context/settings-context';
import { saveCollectionRecord } from '@/app/actions/mysql-actions';
import { toast } from '@/hooks/use-toast';
import { Tenant, Department, JobTitle } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

export default function StructureSettingsPage() {
  const { dataSource } = useSettings();
  const [showArchived, setShowArchived] = useState(false);
  
  // Selection
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [selectedDeptId, setSelectedDeptId] = useState<string>('');

  // Input
  const [newTenantName, setNewTenantName] = useState('');
  const [newDeptName, setNewDeptName] = useState('');
  const [newJobName, setNewJobName] = useState('');

  const { data: tenants, refresh: refreshTenants } = usePluggableCollection<Tenant>('tenants');
  const { data: departments, refresh: refreshDepts } = usePluggableCollection<Department>('departments');
  const { data: jobTitles, refresh: refreshJobs } = usePluggableCollection<JobTitle>('jobTitles');

  const filteredTenants = useMemo(() => {
    return tenants?.filter(t => showArchived ? t.status === 'archived' : t.status !== 'archived') || [];
  }, [tenants, showArchived]);

  const filteredDepts = useMemo(() => {
    if (!selectedTenantId) return [];
    return departments?.filter(d => 
      d.tenantId === selectedTenantId && 
      (showArchived ? d.status === 'archived' : d.status !== 'archived')
    ) || [];
  }, [departments, selectedTenantId, showArchived]);

  const filteredJobs = useMemo(() => {
    if (!selectedDeptId) return [];
    return jobTitles?.filter(j => 
      j.departmentId === selectedDeptId && 
      (showArchived ? j.status === 'archived' : j.status !== 'archived')
    ) || [];
  }, [jobTitles, selectedDeptId, showArchived]);

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

  const handleCreateTenant = async () => {
    if (!newTenantName) return;
    const id = `t-${Math.random().toString(36).substring(2, 7)}`;
    const data: Tenant = {
      id,
      name: newTenantName,
      slug: newTenantName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      createdAt: new Date().toISOString(),
      status: 'active'
    };
    const res = await saveCollectionRecord('tenants', id, data, dataSource);
    if (res.success) {
      setNewTenantName('');
      refreshTenants();
      toast({ title: "Mandant angelegt" });
    }
  };

  const handleCreateDept = async () => {
    if (!newDeptName || !selectedTenantId) return;
    const id = `d-${Math.random().toString(36).substring(2, 7)}`;
    const data: Department = {
      id,
      tenantId: selectedTenantId,
      name: newDeptName,
      status: 'active'
    };
    const res = await saveCollectionRecord('departments', id, data, dataSource);
    if (res.success) {
      setNewDeptName('');
      refreshDepts();
      toast({ title: "Abteilung angelegt" });
    }
  };

  const handleCreateJob = async () => {
    if (!newJobName || !selectedDeptId) return;
    const dept = departments?.find(d => d.id === selectedDeptId);
    if (!dept) return;
    const id = `j-${Math.random().toString(36).substring(2, 7)}`;
    const data: JobTitle = {
      id,
      tenantId: dept.tenantId,
      departmentId: selectedDeptId,
      name: newJobName,
      status: 'active'
    };
    const res = await saveCollectionRecord('jobTitles', id, data, dataSource);
    if (res.success) {
      setNewJobName('');
      refreshJobs();
      toast({ title: "Stelle angelegt" });
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          <Briefcase className="w-4 h-4" /> Organisationsstruktur
        </h2>
        <div className="flex items-center gap-2 border bg-white p-1 rounded-none">
          <Badge variant="outline" className={cn("rounded-none border-none text-[9px] uppercase", showArchived ? "text-orange-600" : "text-emerald-600")}>
            {showArchived ? 'Archiv wird angezeigt' : 'Nur Aktive'}
          </Badge>
          <Button variant="ghost" size="sm" className="h-7 text-[9px] font-bold uppercase gap-2" onClick={() => setShowArchived(!showArchived)}>
            {showArchived ? <RotateCcw className="w-3 h-3" /> : <Archive className="w-3 h-3" />}
            {showArchived ? 'Aktive anzeigen' : 'Archiv anzeigen'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {/* TENANTS */}
        <Card className="rounded-none border shadow-none flex flex-col h-[600px]">
          <CardHeader className="bg-slate-900 text-white py-3 shrink-0">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
              <Building2 className="w-3.5 h-3.5 text-primary" /> 1. Mandanten
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4 flex-1 flex flex-col min-h-0">
            {!showArchived && (
              <div className="flex gap-1 border p-1 bg-muted/10 rounded-none shrink-0">
                <Input 
                  placeholder="Name..." 
                  value={newTenantName} 
                  onChange={e => setNewTenantName(e.target.value)} 
                  className="h-8 border-none shadow-none text-xs rounded-none bg-transparent" 
                />
                <Button size="icon" className="h-8 w-8 shrink-0 rounded-none" onClick={handleCreateTenant}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            )}
            <ScrollArea className="flex-1 -mx-4 px-4">
              <div className="space-y-1">
                {filteredTenants.map(t => (
                  <div 
                    key={t.id} 
                    className={cn(
                      "flex items-center justify-between p-2.5 border cursor-pointer group transition-all",
                      selectedTenantId === t.id ? "bg-primary/5 border-primary ring-1 ring-primary/20" : "bg-white hover:border-slate-300"
                    )}
                    onClick={() => { setSelectedTenantId(t.id); setSelectedDeptId(''); }}
                  >
                    <div className="min-w-0 flex-1">
                      <p className={cn("text-xs font-bold truncate", t.status === 'archived' && "line-through text-muted-foreground")}>{t.name}</p>
                      <p className="text-[8px] font-black uppercase text-muted-foreground">{t.slug}</p>
                    </div>
                    <Button 
                      variant="ghost" size="icon" 
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 rounded-none text-muted-foreground hover:text-red-600"
                      onClick={(e) => { e.stopPropagation(); handleStatusChange('tenants', t, t.status === 'active' ? 'archived' : 'active'); }}
                    >
                      {t.status === 'active' ? <Archive className="w-3.5 h-3.5" /> : <RotateCcw className="w-3.5 h-3.5" />}
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* DEPARTMENTS */}
        <Card className="rounded-none border shadow-none flex flex-col h-[600px]">
          <CardHeader className="bg-slate-900 text-white py-3 shrink-0">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-emerald-400" /> 2. Abteilungen
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4 flex-1 flex flex-col min-h-0">
            {!showArchived && (
              <div className={cn("flex gap-1 border p-1 bg-muted/10 rounded-none shrink-0", !selectedTenantId && "opacity-50 pointer-events-none")}>
                <Input 
                  placeholder={selectedTenantId ? "Abteilung..." : "Mandant wählen..."} 
                  value={newDeptName} 
                  onChange={e => setNewDeptName(e.target.value)} 
                  className="h-8 border-none shadow-none text-xs rounded-none bg-transparent" 
                />
                <Button size="icon" className="h-8 w-8 shrink-0 rounded-none" onClick={handleCreateDept} disabled={!selectedTenantId}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            )}
            <ScrollArea className="flex-1 -mx-4 px-4">
              <div className="space-y-1">
                {filteredDepts.map(d => (
                  <div 
                    key={d.id} 
                    className={cn(
                      "flex items-center justify-between p-2.5 border cursor-pointer group transition-all",
                      selectedDeptId === d.id ? "bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500/20" : "bg-white hover:border-slate-300"
                    )}
                    onClick={() => setSelectedDeptId(d.id)}
                  >
                    <p className={cn("text-xs font-bold truncate", d.status === 'archived' && "line-through text-muted-foreground")}>{d.name}</p>
                    <Button 
                      variant="ghost" size="icon" 
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 rounded-none text-muted-foreground hover:text-red-600"
                      onClick={(e) => { e.stopPropagation(); handleStatusChange('departments', d, d.status === 'active' ? 'archived' : 'active'); }}
                    >
                      {d.status === 'active' ? <Archive className="w-3.5 h-3.5" /> : <RotateCcw className="w-3.5 h-3.5" />}
                    </Button>
                  </div>
                ))}
                {selectedTenantId && filteredDepts.length === 0 && (
                  <div className="py-10 text-center text-[9px] font-bold uppercase text-muted-foreground">Keine Abteilungen gefunden.</div>
                )}
                {!selectedTenantId && (
                  <div className="py-10 text-center text-[9px] font-bold uppercase text-muted-foreground italic">Wählen Sie links einen Mandanten aus.</div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* JOB TITLES */}
        <Card className="rounded-none border shadow-none flex flex-col h-[600px]">
          <CardHeader className="bg-slate-900 text-white py-3 shrink-0">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
              <BadgeAlert className="w-3.5 h-3.5 text-orange-400" /> 3. Stellen / Rollen
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4 flex-1 flex flex-col min-h-0">
            {!showArchived && (
              <div className={cn("flex gap-1 border p-1 bg-muted/10 rounded-none shrink-0", !selectedDeptId && "opacity-50 pointer-events-none")}>
                <Input 
                  placeholder={selectedDeptId ? "Stellenbezeichnung..." : "Abt. wählen..."} 
                  value={newJobName} 
                  onChange={e => setNewJobName(e.target.value)} 
                  className="h-8 border-none shadow-none text-xs rounded-none bg-transparent" 
                />
                <Button size="icon" className="h-8 w-8 shrink-0 rounded-none" onClick={handleCreateJob} disabled={!selectedDeptId}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            )}
            <ScrollArea className="flex-1 -mx-4 px-4">
              <div className="space-y-1">
                {filteredJobs.map(j => (
                  <div 
                    key={j.id} 
                    className="flex items-center justify-between p-2.5 border bg-white group hover:border-slate-300"
                  >
                    <p className={cn("text-xs font-bold truncate", j.status === 'archived' && "line-through text-muted-foreground")}>{j.name}</p>
                    <Button 
                      variant="ghost" size="icon" 
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 rounded-none text-muted-foreground hover:text-red-600"
                      onClick={(e) => { e.stopPropagation(); handleStatusChange('jobTitles', j, j.status === 'active' ? 'archived' : 'active'); }}
                    >
                      {j.status === 'active' ? <Archive className="w-3.5 h-3.5" /> : <RotateCcw className="w-3.5 h-3.5" />}
                    </Button>
                  </div>
                ))}
                {selectedDeptId && filteredJobs.length === 0 && (
                  <div className="py-10 text-center text-[9px] font-bold uppercase text-muted-foreground">Keine Stellen gefunden.</div>
                )}
                {!selectedDeptId && (
                  <div className="py-10 text-center text-[9px] font-bold uppercase text-muted-foreground italic">Wählen Sie eine Abteilung aus.</div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
