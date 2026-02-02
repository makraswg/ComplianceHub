
"use client";

import { useState } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  Filter, 
  Plus, 
  CheckCircle2, 
  Clock, 
  XCircle,
  ShieldAlert,
  Calendar,
  ShieldCheck,
  User as UserIcon,
  Layers
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { MOCK_ASSIGNMENTS } from '@/lib/mock-data';

export default function AssignmentsPage() {
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'requested' | 'expired'>('all');

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Assignments</h1>
          <p className="text-muted-foreground mt-1">Management of user entitlements and permissions.</p>
        </div>
        <Button className="bg-primary gap-2 h-11 px-6 shadow-lg shadow-primary/20">
          <Plus className="w-5 h-5" /> New Assignment
        </Button>
      </div>

      <div className="flex flex-col gap-6">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {[
            { id: 'all', label: 'All Assignments', count: 4592, icon: ShieldCheck },
            { id: 'active', label: 'Active', count: 4200, icon: CheckCircle2 },
            { id: 'requested', label: 'Requested', count: 124, icon: Clock },
            { id: 'expired', label: 'Expired', count: 268, icon: XCircle },
          ].map((tab) => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? 'default' : 'outline'}
              className={cn(
                "h-12 px-6 gap-3 rounded-full shrink-0 border-none transition-all",
                activeTab === tab.id ? "bg-primary shadow-lg shadow-primary/30" : "bg-card hover:bg-accent/50 text-muted-foreground"
              )}
              onClick={() => setActiveTab(tab.id as any)}
            >
              <tab.icon className="w-5 h-5" />
              <span className="font-bold">{tab.label}</span>
              <Badge variant="secondary" className={cn("ml-1 font-bold", activeTab === tab.id ? "bg-white/20 text-white" : "bg-accent text-muted-foreground")}>
                {tab.count}
              </Badge>
            </Button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search by user, resource, or ticket ID..." 
              className="pl-10 h-11 bg-card"
            />
          </div>
          <Button variant="outline" className="h-11 gap-2 border-dashed">
            <Filter className="w-4 h-4" /> Advanced Filter
          </Button>
        </div>

        <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-accent/30">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[300px] py-4">User</TableHead>
                <TableHead>Entitlement</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Validity</TableHead>
                <TableHead>Ticket Reference</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MOCK_ASSIGNMENTS.map((assignment) => (
                <TableRow key={assignment.id} className="group transition-colors hover:bg-accent/10">
                  <TableCell className="py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-primary">
                        <UserIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-sm">John Doe</div>
                        <div className="text-[10px] text-muted-foreground font-medium">john@acme.com</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded bg-blue-100 text-blue-600">
                        <Layers className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-sm">GitHub Admin</span>
                        <span className="text-[10px] text-muted-foreground">Resource: GitHub Enterprise</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className="bg-green-500/10 text-green-600 border-none font-bold text-[10px]">
                      ACTIVE
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Permanent</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs font-medium bg-accent/30 border-none">
                      {assignment.ticketRef}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="font-bold text-primary hover:text-primary hover:bg-primary/5">
                      Modify
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {/* Dummy rows for visual feel */}
              {[...Array(5)].map((_, i) => (
                <TableRow key={i} className="hover:bg-accent/10 transition-colors">
                  <TableCell className="py-4">
                    <div className="flex items-center gap-3 opacity-60">
                      <div className="w-8 h-8 rounded-full bg-accent" />
                      <div className="space-y-1">
                        <div className="h-3 w-24 bg-accent rounded" />
                        <div className="h-2 w-16 bg-accent rounded" />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="opacity-60">
                    <div className="h-3 w-32 bg-accent rounded" />
                  </TableCell>
                  <TableCell>
                    <Badge className="bg-blue-500/10 text-blue-600 border-none font-bold text-[10px]">
                      REQUESTED
                    </Badge>
                  </TableCell>
                  <TableCell className="opacity-60">
                    <div className="h-3 w-20 bg-accent rounded" />
                  </TableCell>
                  <TableCell className="opacity-60">
                    <div className="h-3 w-16 bg-accent rounded" />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="font-bold text-muted-foreground">
                      Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

import { cn } from '@/lib/utils';
