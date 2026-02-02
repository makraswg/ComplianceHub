"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Settings, 
  Users, 
  Shield, 
  Mail, 
  Plus, 
  Save, 
  Trash2,
  Lock,
  Globe,
  Bell
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';

export default function SettingsPage() {
  const [tenantName, setTenantName] = useState('Acme Corp');
  const [tenantSlug, setTenantSlug] = useState('acme');

  const handleSave = () => {
    toast({ title: "Einstellungen gespeichert", description: "Ihre Änderungen wurden erfolgreich gespeichert." });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold">Mandanteneinstellungen</h1>
        <p className="text-muted-foreground mt-1">Konfigurieren Sie die AccessHub-Umgebung Ihrer Organisation.</p>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="bg-card border h-12 p-1 gap-1 rounded-xl">
          <TabsTrigger value="general" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg px-6 gap-2">
            <Settings className="w-4 h-4" /> Allgemein
          </TabsTrigger>
          <TabsTrigger value="members" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg px-6 gap-2">
            <Users className="w-4 h-4" /> Mitglieder & Rollen
          </TabsTrigger>
          <TabsTrigger value="ldap" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg px-6 gap-2">
            <Globe className="w-4 h-4" /> LDAP-Konfiguration
          </TabsTrigger>
          <TabsTrigger value="security" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg px-6 gap-2">
            <Lock className="w-4 h-4" /> Sicherheit
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle>Organisationsdetails</CardTitle>
              <CardDescription>Aktualisieren Sie Ihr Unternehmensprofil und Ihre Kennungen.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="tenant-name">Anzeigename des Mandanten</Label>
                  <Input 
                    id="tenant-name" 
                    value={tenantName} 
                    onChange={(e) => setTenantName(e.target.value)}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tenant-slug">Mandanten-Slug (URL-Kennung)</Label>
                  <div className="flex items-center gap-2">
                    <Input 
                      id="tenant-slug" 
                      value={tenantSlug} 
                      onChange={(e) => setTenantSlug(e.target.value)}
                      className="h-11"
                    />
                    <span className="text-sm text-muted-foreground">.accesshub.com</span>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t pt-6">
              <Button className="bg-primary gap-2 px-8" onClick={handleSave}>
                <Save className="w-4 h-4" /> Änderungen speichern
              </Button>
            </CardFooter>
          </Card>

          <Card className="border-none shadow-sm border-l-4 border-l-accent">
            <CardHeader>
              <CardTitle>Nutzungseinstellungen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Aufbewahrung von Prüfprotokollen</Label>
                  <p className="text-sm text-muted-foreground">Speichern Sie alle Inventaränderungen für 1 Jahr.</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="h-px bg-border" />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Genehmigungsworkflow</Label>
                  <p className="text-sm text-muted-foreground">Sekundäre Genehmigung für hochriskante Zuweisungen erforderlich.</p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="members" className="space-y-6">
          <Card className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Mandantenmitglieder</CardTitle>
                <CardDescription>Admins und Redakteure, die diesen Mandanten verwalten können.</CardDescription>
              </div>
              <Button className="bg-primary gap-2">
                <Plus className="w-4 h-4" /> Mitglied einladen
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { name: 'John Doe', email: 'john@acme.com', role: 'tenantOwner', status: 'Active' },
                  { name: 'Jane Smith', email: 'jane@acme.com', role: 'admin', status: 'Active' },
                  { name: 'Mike Johnson', email: 'mike@acme.com', role: 'editor', status: 'Active' },
                  { name: 'Sarah Wilson', email: 'sarah@acme.com', role: 'viewer', status: 'Pending' },
                ].map((member) => (
                  <div key={member.email} className="flex items-center justify-between p-4 rounded-xl border bg-accent/10 hover:bg-accent/20 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center">
                        {member.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-sm">{member.name}</p>
                        <p className="text-xs text-muted-foreground">{member.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-8">
                      <Badge className={cn(
                        "font-bold uppercase tracking-wider text-[10px]",
                        member.role === 'tenantOwner' ? "bg-purple-500 text-white" : "bg-primary/10 text-primary border-none"
                      )}>
                        {member.role === 'tenantOwner' ? 'Mandantenbesitzer' : member.role}
                      </Badge>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" className="text-muted-foreground">
                          <Settings className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ldap" className="space-y-6">
           <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle>LDAP / AD-Synchronisierung</CardTitle>
              <CardDescription>Konfigurieren Sie die Verbindung zu Ihrem Identitätsanbieter.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Server-URL</Label>
                  <Input placeholder="ldaps://ad.company.com:636" className="h-11" />
                </div>
                <div className="space-y-2">
                  <Label>Basis-DN</Label>
                  <Input placeholder="OU=Users,DC=company,DC=com" className="h-11" />
                </div>
                <div className="space-y-2">
                  <Label>Dienstkontobenutzer</Label>
                  <Input placeholder="CN=SyncSvc,OU=Services,DC=company,DC=com" className="h-11" />
                </div>
                <div className="space-y-2">
                  <Label>Dienstkontopasswort</Label>
                  <Input type="password" value="********" className="h-11" />
                </div>
              </div>
              <div className="h-px bg-border my-2" />
              <div className="space-y-4">
                <Label className="text-base font-bold">Synchronisierungszeitplan</Label>
                <div className="flex items-center gap-4">
                  <Badge variant="outline" className="px-4 py-2 border-primary text-primary bg-primary/5 font-bold">TÄGLICH UM 02:00 UHR</Badge>
                  <Button variant="ghost" size="sm" className="font-bold">Zeitplan bearbeiten</Button>
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t pt-6 gap-3">
              <Button className="bg-primary px-8">Verbindung testen</Button>
              <Button variant="outline" onClick={handleSave}>Konfiguration speichern</Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

import { cn } from '@/lib/utils';
