
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
  MoreHorizontal, 
  RefreshCw,
  User as UserIcon,
  ChevronRight,
  ShieldCheck,
  Building2
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { MOCK_USERS } from '@/lib/mock-data';

export default function UsersPage() {
  const [search, setSearch] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = () => {
    setIsSyncing(true);
    setTimeout(() => setIsSyncing(false), 2000);
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">User Directory</h1>
          <p className="text-muted-foreground mt-1">Managed users synchronized via LDAP/Active Directory.</p>
        </div>
        <Button 
          variant="outline" 
          className="gap-2 h-11 px-6 border-primary text-primary hover:bg-primary/5"
          onClick={handleSync}
          disabled={isSyncing}
        >
          <RefreshCw className={cn("w-5 h-5", isSyncing && "animate-spin")} />
          {isSyncing ? "Syncing LDAP..." : "Sync from LDAP"}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search by name, email, department..." 
            className="pl-10 h-11 bg-card"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button variant="outline" className="h-11 gap-2">
          <Building2 className="w-4 h-4" /> All Departments
        </Button>
        <Button variant="outline" className="h-11 gap-2">
          <Filter className="w-4 h-4" /> More Filters
        </Button>
      </div>

      <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-accent/30">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[350px] py-4">Employee</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Synced</TableHead>
              <TableHead>Assignments</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {MOCK_USERS.map((user) => (
              <TableRow key={user.id} className="group transition-colors hover:bg-accent/10 cursor-pointer">
                <TableCell className="py-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-primary font-bold group-hover:scale-110 transition-transform">
                      {user.displayName.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold">{user.displayName}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{user.email}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium text-sm">{user.department}</span>
                    <span className="text-[10px] text-muted-foreground">{user.title}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge 
                    className={cn(
                      "font-bold",
                      user.enabled ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-600"
                    )}
                    variant="outline"
                  >
                    {user.enabled ? "ENABLED" : "DISABLED"}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-xs">
                  {new Date(user.lastSyncedAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5 font-bold text-primary">
                    <ShieldCheck className="w-4 h-4" /> 12
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-muted-foreground">
                        <MoreHorizontal className="w-5 h-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuItem className="font-medium">
                        View Profile <ChevronRight className="ml-auto w-4 h-4 text-muted-foreground" />
                      </DropdownMenuItem>
                      <DropdownMenuItem className="font-medium">
                        View Assignments <ChevronRight className="ml-auto w-4 h-4 text-muted-foreground" />
                      </DropdownMenuItem>
                      <div className="h-px bg-border my-1" />
                      <DropdownMenuItem className="font-medium text-primary">Sync This User Only</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

import { cn } from '@/lib/utils';
