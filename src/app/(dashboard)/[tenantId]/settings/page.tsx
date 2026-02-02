
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

export default function SettingsPage() {
  const [tenantName, setTenantName] = useState('Acme Corp');
  const [tenantSlug, setTenantSlug] = useState('acme');

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold">Tenant Settings</h1>
        <p className="text-muted-foreground mt-1">Configure your organization's AccessHub environment.</p>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="bg-card border h-12 p-1 gap-1 rounded-xl">
          <TabsTrigger value="general" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg px-6 gap-2">
            <Settings className="w-4 h-4" /> General
          </TabsTrigger>
          <TabsTrigger value="members" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg px-6 gap-2">
            <Users className="w-4 h-4" /> Members & Roles
          </TabsTrigger>
          <TabsTrigger value="ldap" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg px-6 gap-2">
            <Globe className="w-4 h-4" /> LDAP Config
          </TabsTrigger>
          <TabsTrigger value="security" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg px-6 gap-2">
            <Lock className="w-4 h-4" /> Security
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle>Organization Details</CardTitle>
              <CardDescription>Update your company profile and identifiers.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="tenant-name">Tenant Display Name</Label>
                  <Input 
                    id="tenant-name" 
                    value={tenantName} 
                    onChange={(e) => setTenantName(e.target.value)}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tenant-slug">Tenant Slug (URL Identifier)</Label>
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
              <Button className="bg-primary gap-2 px-8">
                <Save className="w-4 h-4" /> Save Changes
              </Button>
            </CardFooter>
          </Card>

          <Card className="border-none shadow-sm border-l-4 border-l-accent">
            <CardHeader>
              <CardTitle>Usage Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Audit Log Retention</Label>
                  <p className="text-sm text-muted-foreground">Store all inventory changes for 1 year.</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="h-px bg-border" />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Approval Workflow</Label>
                  <p className="text-sm text-muted-foreground">Require secondary approval for high-risk assignments.</p>
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
                <CardTitle>Tenant Members</CardTitle>
                <CardDescription>Admins and editors who can manage this tenant.</CardDescription>
              </div>
              <Button className="bg-primary gap-2">
                <Plus className="w-4 h-4" /> Invite Member
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
                        {member.role}
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
              <CardTitle>LDAP / AD Synchronization</CardTitle>
              <CardDescription>Configure the connection to your identity provider.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Server URL</Label>
                  <Input placeholder="ldaps://ad.company.com:636" className="h-11" />
                </div>
                <div className="space-y-2">
                  <Label>Base DN</Label>
                  <Input placeholder="OU=Users,DC=company,DC=com" className="h-11" />
                </div>
                <div className="space-y-2">
                  <Label>Service Account User</Label>
                  <Input placeholder="CN=SyncSvc,OU=Services,DC=company,DC=com" className="h-11" />
                </div>
                <div className="space-y-2">
                  <Label>Service Account Password</Label>
                  <Input type="password" value="********" className="h-11" />
                </div>
              </div>
              <div className="h-px bg-border my-2" />
              <div className="space-y-4">
                <Label className="text-base font-bold">Sync Schedule</Label>
                <div className="flex items-center gap-4">
                  <Badge variant="outline" className="px-4 py-2 border-primary text-primary bg-primary/5 font-bold">DAILY AT 02:00 AM</Badge>
                  <Button variant="ghost" size="sm" className="font-bold">Edit Schedule</Button>
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t pt-6 gap-3">
              <Button className="bg-primary px-8">Test Connection</Button>
              <Button variant="outline">Save Configuration</Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

import { cn } from '@/lib/utils';
