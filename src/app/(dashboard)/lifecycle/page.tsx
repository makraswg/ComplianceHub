
"use client";

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  UserPlus, 
  UserMinus, 
  Package, 
  ShieldCheck, 
  ArrowRight, 
  Loader2, 
  Search,
  CheckCircle2,
  AlertTriangle,
  Info,
  Calendar,
  Zap,
  MoreHorizontal,
  X,
  Plus,
  Workflow
} from 'lucide-react';
import { usePluggableCollection } from '@/hooks/data/use-pluggable-collection';
import { 
  useFirestore, 
  setDocumentNonBlocking, 
  addDocumentNonBlocking, 
  updateDocumentNonBlocking,
  useUser as useAuthUser 
} from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';
import { useSettings } from '@/context/settings-context';
import { saveCollectionRecord } from '@/app/actions/mysql-actions';
import { createJiraTicket, getJiraConfigs } from '@/app/actions/jira-actions';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export default function LifecyclePage() {
  const { dataSource } = useSettings();
  const db = useFirestore();
  const { user: authUser } = useAuthUser();
  const [mounted, setMounted] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // States
  const [activeTab, setActiveTab] = useState('joiner');
  const [search, setSearch] = useState('');
  
  // Joiner State
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewEmail] = useState('');
  const [newUserDept, setNewDept] = useState('');
  const [selectedBundleId, setSelectedBundleId] = useState<string | null>(null);
  const [onboardingDate, setOnboardingDate] = useState(new Date().toISOString().split('T')[0]);

  // Bundle Create State
  const [isBundleCreateOpen, setIsBundleCreateOpen] = useState(false);
  const [bundleName, setBundleName] = useState('');
  const [bundleDesc, setBundleDesc] = useState('');
  const [selectedEntitlementIds, setSelectedEntitlementIds] = useState<string[]>([]);

  const { data: users, refresh: refreshUsers } = usePluggableCollection<any>('users');
  const { data: bundles, refresh: refreshBundles } = usePluggableCollection<any>('bundles');
  const { data: entitlements } = usePluggableCollection<any>('entitlements');
  const { data: resources } = usePluggableCollection<any>('resources');
  const { data: assignments, refresh: refreshAssignments } = usePluggableCollection<any>('assignments');

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleCreateBundle = async () => {
    if (!bundleName || selectedEntitlementIds.length === 0) {
      toast({ variant: "destructive", title: "Fehler", description: "Name und mindestens eine Rolle erforderlich." });
      return;
    }

    const bundleId = `bundle-${Math.random().toString(36).substring(2, 9)}`;
    const bundleData = {
      id: bundleId,
      tenantId: 't1',
      name: bundleName,
      description: bundleDesc,
      entitlementIds: selectedEntitlementIds
    };

    if (dataSource === 'mysql') {
      await saveCollectionRecord('bundles', bundleId, bundleData);
    } else {
      setDocumentNonBlocking(doc(db, 'bundles', bundleId), bundleData);
    }

    toast({ title: "Bundle erstellt" });
    setIsBundleCreateOpen(false);
    setBundleName('');
    setBundleDesc('');
    setSelectedEntitlementIds([]);
    refreshBundles();
  };

  const startOnboarding = async () => {
    if (!newUserName || !newUserEmail || !selectedBundleId) {
      toast({ variant: "destructive", title: "Fehler", description: "Bitte alle Felder ausfüllen." });
      return;
    }

    setIsActionLoading(true);
    const bundle = bundles?.find(b => b.id === selectedBundleId);
    
    // 1. Create User
    const userId = `u-${Math.random().toString(36).substring(2, 9)}`;
    const timestamp = new Date().toISOString();
    const userData = {
      id: userId,
      tenantId: 't1',
      externalId: `MANUAL_${userId}`,
      displayName: newUserName,
      email: newUserEmail,
      department: newUserDept,
      enabled: true,
      onboardingDate,
      lastSyncedAt: timestamp
    };

    if (dataSource === 'mysql') {
      await saveCollectionRecord('users', userId, userData);
    } else {
      setDocumentNonBlocking(doc(db, 'users', userId), userData);
    }

    // 2. Create Assignments for Bundle
    const roleListText: string[] = [];
    for (const eid of bundle.entitlementIds) {
      const ent = entitlements?.find(e => e.id === eid);
      const res = resources?.find(r => r.id === ent?.resourceId);
      roleListText.push(`${res?.name}: ${ent?.name}`);

      const assId = `ass-onb-${userId}-${eid}`.substring(0, 50);
      const assData = {
        id: assId,
        tenantId: 't1',
        userId,
        entitlementId: eid,
        status: 'active',
        grantedBy: 'onboarding-wizard',
        grantedAt: timestamp,
        validFrom: onboardingDate,
        ticketRef: 'ONBOARDING',
        notes: `Automatisch zugewiesen via Onboarding-Bundle: ${bundle.name}`
      };

      if (dataSource === 'mysql') {
        await saveCollectionRecord('assignments', assId, assData);
      } else {
        setDocumentNonBlocking(doc(db, 'assignments', assId), assData);
      }
    }

    // 3. Trigger Jira Ticket for Service Desk
    const configs = await getJiraConfigs();
    if (configs.length > 0 && configs[0].enabled) {
      const summary = `ONBOARDING: ${newUserName} (${newUserDept})`;
      const desc = `Bitte folgende Accounts für den neuen Mitarbeiter ${newUserName} erstellen:\n\nE-Mail: ${newUserEmail}\nStartdatum: ${onboardingDate}\n\nRollen laut Bundle '${bundle.name}':\n- ${roleListText.join('\n- ')}\n\nHinweis: Das System hat keinen Schreibzugriff. Bitte manuell provisionieren und Ticket schließen.`;
      
      const res = await createJiraTicket(configs[0].id, summary, desc);
      if (res.success) {
        toast({ title: "Jira Ticket erstellt", description: `Key: ${res.key}` });
      }
    }

    toast({ title: "Onboarding abgeschlossen", description: "Mitarbeiter und Rollen wurden im Hub registriert." });
    setIsActionLoading(false);
    resetJoinerForm();
    refreshUsers();
    refreshAssignments();
  };

  const startOffboarding = async (user: any) => {
    setIsActionLoading(true);
    const userAssignments = assignments?.filter(a => a.userId === user.id && a.status === 'active') || [];
    const timestamp = new Date().toISOString();
    const today = timestamp.split('T')[0];

    // 1. Disable User
    const updatedUser = { ...user, enabled: false, offboardingDate: today };
    if (dataSource === 'mysql') {
      await saveCollectionRecord('users', user.id, updatedUser);
    } else {
      updateDocumentNonBlocking(doc(db, 'users', user.id), { enabled: false, offboardingDate: today });
    }

    // 2. Revoke all Assignments
    const revokeList: string[] = [];
    for (const a of userAssignments) {
      const ent = entitlements?.find(e => e.id === a.entitlementId);
      const res = resources?.find(r => r.id === ent?.resourceId);
      revokeList.push(`${res?.name}: ${ent?.name}`);

      if (dataSource === 'mysql') {
        await saveCollectionRecord('assignments', a.id, { ...a, status: 'removed', validUntil: today });
      } else {
        updateDocumentNonBlocking(doc(db, 'assignments', a.id), { status: 'removed', validUntil: today });
      }
    }

    // 3. Create Audit Event
    const auditId = `audit-${Math.random().toString(36).substring(2, 9)}`;
    const auditData = {
      id: auditId,
      actorUid: authUser?.uid || 'system',
      action: `OFFBOARDING: ${user.displayName} (Alle Zugriffe entzogen)`,
      entityType: 'user',
      entityId: user.id,
      timestamp,
      tenantId: 't1',
      after: { rolesRemoved: revokeList.length }
    };
    if (dataSource === 'mysql') {
      await saveCollectionRecord('auditEvents', auditId, auditData);
    } else {
      addDocumentNonBlocking(collection(db, 'auditEvents'), auditData);
    }

    // 4. Trigger Jira Ticket for Deprovisioning
    const configs = await getJiraConfigs();
    if (configs.length > 0 && configs[0].enabled) {
      const summary = `OFFBOARDING (Account Löschung): ${user.displayName}`;
      const desc = `Der Mitarbeiter ${user.displayName} verlässt das Unternehmen.\nBitte folgende Accounts SOFORT DEAKTIVIEREN:\n\nE-Mail: ${user.email}\nAbteilung: ${user.department}\n\nBetroffene Systeme:\n- ${revokeList.join('\n- ')}\n\nBitte Rückmeldung geben, sobald alle Löschungen erfolgt sind.`;
      
      const res = await createJiraTicket(configs[0].id, summary, desc);
      if (res.success) {
        toast({ title: "Jira Lösch-Ticket erstellt", description: `Key: ${res.key}` });
      }
    }

    toast({ title: "Offboarding abgeschlossen", description: `${user.displayName} wurde deaktiviert.` });
    setIsActionLoading(false);
    refreshUsers();
    refreshAssignments();
  };

  const resetJoinerForm = () => {
    setNewUserName('');
    setNewEmail('');
    setNewDept('');
    setSelectedBundleId(null);
    setOnboardingDate(new Date().toISOString().split('T')[0]);
  };

  if (!mounted) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Identity Lifecycle Hub</h1>
          <p className="text-sm text-muted-foreground">Zentrale Verwaltung von Joiner-, Mover- und Leaver-Prozessen.</p>
        </div>
        <Button variant="outline" size="sm" className="h-9 font-bold uppercase text-[10px] rounded-none" onClick={() => setIsBundleCreateOpen(true)}>
          <Package className="w-3.5 h-3.5 mr-2" /> Bundle definieren
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-muted/50 p-1 h-12 rounded-none border w-full justify-start gap-2">
          <TabsTrigger value="joiner" className="rounded-none px-8 gap-2 text-[10px] font-bold uppercase data-[state=active]:bg-white">
            <UserPlus className="w-3.5 h-3.5" /> 1. Onboarding (Joiner)
          </TabsTrigger>
          <TabsTrigger value="leaver" className="rounded-none px-8 gap-2 text-[10px] font-bold uppercase data-[state=active]:bg-white">
            <UserMinus className="w-3.5 h-3.5" /> 2. Offboarding (Leaver)
          </TabsTrigger>
          <TabsTrigger value="bundles" className="rounded-none px-8 gap-2 text-[10px] font-bold uppercase data-[state=active]:bg-white">
            <Workflow className="w-3.5 h-3.5" /> 3. Bundle Übersicht
          </TabsTrigger>
        </TabsList>

        <TabsContent value="joiner" className="animate-in fade-in slide-in-from-left-2 duration-300">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-2 rounded-none shadow-none border">
              <CardHeader className="bg-muted/10 border-b">
                <CardTitle className="text-xs font-bold uppercase tracking-widest">Neuen Mitarbeiter registrieren</CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase">Dokumentiert die Identität und löst Berechtigungsanfragen aus.</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground">Vollständiger Name</Label>
                    <Input value={newUserName} onChange={e => setNewUserName(e.target.value)} placeholder="z.B. Max Mustermann" className="rounded-none h-10" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground">E-Mail (Arbeit)</Label>
                    <Input value={newUserEmail} onChange={e => setNewEmail(e.target.value)} placeholder="max@firma.de" className="rounded-none h-10" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground">Abteilung</Label>
                    <Input value={newUserDept} onChange={e => setNewDept(e.target.value)} placeholder="z.B. Vertrieb" className="rounded-none h-10" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground">Eintrittsdatum</Label>
                    <Input type="date" value={onboardingDate} onChange={e => setOnboardingDate(e.target.value)} className="rounded-none h-10" />
                  </div>
                </div>

                <div className="pt-6 border-t">
                  <Label className="text-[10px] font-bold uppercase text-primary mb-4 block tracking-widest">Rollen-Paket auswählen (Bundle)</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {bundles?.map(bundle => (
                      <div 
                        key={bundle.id} 
                        className={cn(
                          "p-4 border cursor-pointer transition-all hover:bg-muted/5 group",
                          selectedBundleId === bundle.id ? "border-primary bg-primary/5 ring-1 ring-primary" : "bg-white"
                        )}
                        onClick={() => setSelectedBundleId(bundle.id)}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-sm uppercase">{bundle.name}</span>
                          <Package className={cn("w-4 h-4", selectedBundleId === bundle.id ? "text-primary" : "text-slate-300")} />
                        </div>
                        <p className="text-[10px] text-muted-foreground line-clamp-1">{bundle.description}</p>
                        <div className="mt-2 flex gap-1 flex-wrap">
                          <Badge variant="outline" className="text-[8px] font-bold uppercase py-0 rounded-none bg-slate-50">{bundle.entitlementIds.length} ROLLEN</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 bg-blue-50 border border-blue-100 flex gap-3">
                  <Info className="w-5 h-5 text-blue-600 shrink-0" />
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase text-blue-800">Was passiert beim Klick auf Onboarding?</p>
                    <p className="text-[10px] text-blue-700 leading-relaxed uppercase">
                      1. Der Nutzer wird im Hub angelegt. 2. Alle Rollen des Bundles werden zugewiesen. 
                      3. Ein Jira-Ticket für die IT wird erstellt, um die Accounts manuell anzulegen.
                    </p>
                  </div>
                </div>
              </CardContent>
              <div className="p-6 border-t bg-muted/5 flex justify-end">
                <Button onClick={startOnboarding} disabled={isActionLoading || !selectedBundleId} className="rounded-none font-bold uppercase text-[10px] h-11 px-10 gap-2">
                  {isActionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                  Onboarding Prozess starten
                </Button>
              </div>
            </Card>

            <div className="space-y-6">
              <Card className="rounded-none shadow-none border">
                <CardHeader className="py-3 bg-muted/20 border-b">
                  <CardTitle className="text-[10px] font-bold uppercase text-muted-foreground">Kommende Joiner</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {users?.filter(u => u.onboardingDate && new Date(u.onboardingDate) >= new Date()).slice(0, 5).map(u => (
                      <div key={u.id} className="p-4 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold">{u.displayName}</p>
                          <p className="text-[9px] text-muted-foreground uppercase">{u.department}</p>
                        </div>
                        <Badge variant="outline" className="text-[9px] rounded-none border-blue-200 text-blue-600 font-bold uppercase">
                          {new Date(u.onboardingDate).toLocaleDateString()}
                        </Badge>
                      </div>
                    ))}
                    {users?.filter(u => u.onboardingDate && new Date(u.onboardingDate) >= new Date()).length === 0 && (
                      <div className="p-8 text-center text-[10px] text-muted-foreground italic font-bold uppercase">Keine geplanten Eintritte</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="leaver" className="animate-in fade-in slide-in-from-right-2 duration-300">
          <Card className="rounded-none shadow-none border overflow-hidden">
            <CardHeader className="bg-muted/10 border-b flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xs font-bold uppercase tracking-widest">Offboarding-Zentrale (Widerrufs-Management)</CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase mt-1">Sicherer Zugriffsentzug für ausscheidende Mitarbeiter.</CardDescription>
              </div>
              <div className="relative w-64">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input placeholder="Mitarbeiter suchen..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 rounded-none text-xs" />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="bg-muted/30 border-b">
                  <tr className="text-[10px] font-bold uppercase tracking-widest text-left">
                    <th className="p-4">Identität</th>
                    <th className="p-4">Aktive Zugriffe</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Aktion</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {users?.filter(u => u.displayName.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())).map(u => {
                    const activeCount = assignments?.filter(a => a.userId === u.id && a.status === 'active').length || 0;
                    const isEnabled = u.enabled === true || u.enabled === 1 || u.enabled === "1";
                    
                    return (
                      <tr key={u.id} className="hover:bg-muted/5 transition-colors group">
                        <td className="p-4">
                          <div className="font-bold">{u.displayName}</div>
                          <div className="text-[10px] text-muted-foreground uppercase">{u.email}</div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <ShieldCheck className={cn("w-4 h-4", activeCount > 0 ? "text-primary" : "text-slate-200")} />
                            <span className="font-bold text-xs">{activeCount} Rollen</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge variant="outline" className={cn("rounded-none font-bold uppercase text-[9px] border-none", isEnabled ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700")}>
                            {isEnabled ? "AKTIV" : "DEAKTIVIERT"}
                          </Badge>
                        </td>
                        <td className="p-4 text-right">
                          {isEnabled ? (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-8 text-[9px] font-bold uppercase rounded-none border-red-200 text-red-600 hover:bg-red-50"
                              onClick={() => startOffboarding(u)}
                              disabled={isActionLoading}
                            >
                              {isActionLoading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <UserMinus className="w-3 h-3 mr-1" />}
                              Offboarding starten
                            </Button>
                          ) : (
                            <span className="text-[10px] font-bold text-muted-foreground uppercase italic px-4">Bereits deaktiviert</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bundles" className="animate-in fade-in duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {bundles?.map(bundle => (
              <Card key={bundle.id} className="rounded-none shadow-none border group hover:border-primary transition-colors">
                <CardHeader className="bg-muted/10 border-b py-3 flex flex-row items-center justify-between">
                  <CardTitle className="text-xs font-bold uppercase tracking-tight">{bundle.name}</CardTitle>
                  <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100"><MoreHorizontal className="w-4 h-4" /></Button>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  <p className="text-xs text-muted-foreground h-10 overflow-hidden">{bundle.description || 'Keine Beschreibung vorhanden.'}</p>
                  <div className="space-y-1">
                    <p className="text-[9px] font-bold uppercase text-muted-foreground mb-2">Enthaltene Rollen ({bundle.entitlementIds.length})</p>
                    {bundle.entitlementIds.slice(0, 4).map(eid => {
                      const ent = entitlements?.find(e => e.id === eid);
                      const res = resources?.find(r => r.id === ent?.resourceId);
                      return (
                        <div key={eid} className="text-[10px] flex items-center justify-between py-1 border-b border-dashed last:border-0">
                          <span className="font-bold truncate max-w-[120px]">{res?.name}</span>
                          <span className="text-muted-foreground truncate">{ent?.name}</span>
                        </div>
                      );
                    })}
                    {bundle.entitlementIds.length > 4 && (
                      <p className="text-[9px] font-bold text-primary pt-2 uppercase">+{bundle.entitlementIds.length - 4} weitere Rollen...</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            <div 
              className="border-2 border-dashed rounded-none flex flex-col items-center justify-center p-8 cursor-pointer hover:bg-muted/20 transition-colors"
              onClick={() => setIsBundleCreateOpen(true)}
            >
              <div className="w-10 h-10 bg-muted flex items-center justify-center mb-3">
                <Plus className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-[10px] font-bold uppercase text-muted-foreground">Neues Bundle anlegen</p>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Bundle Create Dialog */}
      <Dialog open={isBundleCreateOpen} onOpenChange={setIsBundleCreateOpen}>
        <DialogContent className="rounded-none border shadow-2xl max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold uppercase">Rollen-Bundle definieren</DialogTitle>
            <DialogDescription className="text-xs font-bold uppercase">Gruppieren Sie häufig benötigte Berechtigungen für das Onboarding.</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground">Bundle Name</Label>
                <Input value={bundleName} onChange={e => setBundleName(e.target.value)} placeholder="z.B. Standard Developer" className="rounded-none h-10" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground">Beschreibung</Label>
                <Input value={bundleDesc} onChange={e => setBundleDesc(e.target.value)} placeholder="Kurze Zweckbeschreibung..." className="rounded-none h-10" />
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-[10px] font-bold uppercase text-primary tracking-widest">Rollen für dieses Bundle wählen</Label>
              <div className="border rounded-none h-64 overflow-y-auto bg-slate-50/50 p-2 grid grid-cols-1 gap-1">
                {entitlements?.map(e => {
                  const res = resources?.find(r => r.id === e.resourceId);
                  const isChecked = selectedEntitlementIds.includes(e.id);
                  return (
                    <div 
                      key={e.id} 
                      className={cn(
                        "flex items-center gap-3 p-2 text-xs border cursor-pointer hover:bg-white transition-colors",
                        isChecked ? "border-primary/30 bg-primary/5" : "border-transparent"
                      )}
                      onClick={() => {
                        setSelectedEntitlementIds(prev => 
                          prev.includes(e.id) ? prev.filter(id => id !== e.id) : [...prev, e.id]
                        );
                      }}
                    >
                      <div className={cn("w-4 h-4 border flex items-center justify-center", isChecked ? "bg-primary border-primary" : "bg-white")}>
                        {isChecked && <CheckCircle2 className="w-3 h-3 text-white" />}
                      </div>
                      <div className="flex flex-col truncate">
                        <span className="font-bold uppercase text-[10px] tracking-tighter">{res?.name}</span>
                        <span className="text-muted-foreground text-[10px]">{e.name}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBundleCreateOpen(false)} className="rounded-none">Abbrechen</Button>
            <Button onClick={handleCreateBundle} className="rounded-none font-bold uppercase text-[10px]">Bundle Speichern</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
