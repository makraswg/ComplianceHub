
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
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Search, 
  Filter, 
  ShieldAlert,
  User as UserIcon,
  Layers,
  Calendar,
  History
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { MOCK_ASSIGNMENTS } from '@/lib/mock-data';

export default function AccessReviewsPage() {
  const [activeFilter, setActiveFilter] = useState<'pending' | 'completed' | 'all'>('pending');

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline">Access Reviews</h1>
          <p className="text-muted-foreground mt-1">Certify or revoke user entitlements for quarterly compliance.</p>
        </div>
        <Button className="bg-accent hover:bg-accent/90 text-white gap-2 h-11 px-6 shadow-lg shadow-accent/20">
          <History className="w-4 h-4" /> Review History
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none shadow-sm bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Current Campaign Progress</CardTitle>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-primary">68%</span>
              <span className="text-xs text-muted-foreground">Q3 Security Review</span>
            </div>
          </CardHeader>
          <CardContent>
            <Progress value={68} className="h-2 bg-primary/10" />
            <p className="text-[10px] text-muted-foreground mt-2 font-medium">1,240 of 1,824 reviews completed</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm border-l-4 border-l-red-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Overdue Reviews</CardTitle>
            <div className="flex items-baseline gap-2 text-red-600">
              <span className="text-3xl font-bold">12</span>
              <AlertCircle className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Assignments requiring immediate attention.</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">High Risk Pending</CardTitle>
            <div className="flex items-baseline gap-2 text-orange-600">
              <span className="text-3xl font-bold">45</span>
              <ShieldAlert className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Critical entitlements needing verification.</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex bg-card p-1 rounded-xl border w-full md:w-auto">
            <Button 
              variant={activeFilter === 'pending' ? 'default' : 'ghost'} 
              size="sm" 
              className="flex-1 md:flex-none"
              onClick={() => setActiveFilter('pending')}
            >
              Pending Reviews
            </Button>
            <Button 
              variant={activeFilter === 'completed' ? 'default' : 'ghost'} 
              size="sm"
              className="flex-1 md:flex-none"
              onClick={() => setActiveFilter('completed')}
            >
              Completed
            </Button>
            <Button 
              variant={activeFilter === 'all' ? 'default' : 'ghost'} 
              size="sm"
              className="flex-1 md:flex-none"
              onClick={() => setActiveFilter('all')}
            >
              All Items
            </Button>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Filter by user..." className="pl-10 h-10 bg-card" />
            </div>
            <Button variant="outline" className="h-10">
              <Filter className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-accent/5">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[280px] py-4">User</TableHead>
                <TableHead>Entitlement</TableHead>
                <TableHead>Risk Level</TableHead>
                <TableHead>Last Reviewed</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MOCK_ASSIGNMENTS.map((assignment) => (
                <TableRow key={assignment.id} className="group hover:bg-accent/5 transition-colors">
                  <TableCell className="py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                        JD
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
                        <span className="text-[10px] text-muted-foreground truncate max-w-[150px]">GitHub Enterprise • Admin</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className="bg-red-500/10 text-red-600 border-none font-bold text-[10px]">
                      HIGH RISK
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>92 days ago</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button size="sm" variant="outline" className="h-8 gap-1.5 text-red-600 hover:bg-red-50 hover:text-red-700 border-red-100 font-bold px-3">
                        <XCircle className="w-3.5 h-3.5" /> Revoke
                      </Button>
                      <Button size="sm" className="h-8 gap-1.5 bg-green-600 hover:bg-green-700 text-white font-bold px-3">
                        <CheckCircle className="w-3.5 h-3.5" /> Certify
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {/* Dummy row for variety */}
              <TableRow className="group hover:bg-accent/5 transition-colors">
                <TableCell className="py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-xs">
                      JS
                    </div>
                    <div>
                      <div className="font-bold text-sm">Jane Smith</div>
                      <div className="text-[10px] text-muted-foreground font-medium">jane@acme.com</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="p-1 rounded bg-orange-100 text-orange-600">
                      <ShieldAlert className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-sm">AWS Root</span>
                      <span className="text-[10px] text-muted-foreground truncate max-w-[150px]">AWS Console • SuperAdmin</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className="bg-red-500/10 text-red-600 border-none font-bold text-[10px]">
                    HIGH RISK
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                    <Calendar className="w-3.5 h-3.5" />
                    <span className="text-red-500">120 days ago</span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                   <div className="flex items-center justify-end gap-2">
                      <Button size="sm" variant="outline" className="h-8 gap-1.5 text-red-600 hover:bg-red-50 hover:text-red-700 border-red-100 font-bold px-3">
                        <XCircle className="w-3.5 h-3.5" /> Revoke
                      </Button>
                      <Button size="sm" className="h-8 gap-1.5 bg-green-600 hover:bg-green-700 text-white font-bold px-3">
                        <CheckCircle className="w-3.5 h-3.5" /> Certify
                      </Button>
                    </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
