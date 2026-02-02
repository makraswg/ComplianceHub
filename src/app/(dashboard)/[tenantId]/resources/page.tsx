
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
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  ExternalLink,
  Shield,
  Layers
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { MOCK_RESOURCES } from '@/lib/mock-data';

export default function ResourcesPage() {
  const [search, setSearch] = useState('');

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Resource Catalog</h1>
          <p className="text-muted-foreground mt-1">Documentation of systems, applications and internal tools.</p>
        </div>
        <Button className="bg-primary gap-2 h-11 px-6 shadow-lg shadow-primary/20">
          <Plus className="w-5 h-5" /> Add Resource
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search by name, owner or URL..." 
            className="pl-10 h-11 bg-card"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="h-11 gap-2">
            <Filter className="w-4 h-4" /> Filter
          </Button>
          <Button variant="outline" className="h-11">
            Sort: Newest
          </Button>
        </div>
      </div>

      <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-accent/30">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[300px] py-4">Resource</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Criticality</TableHead>
              <TableHead>Entitlements</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {MOCK_RESOURCES.map((resource) => (
              <TableRow key={resource.id} className="group transition-colors hover:bg-accent/10">
                <TableCell className="py-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold flex items-center gap-1.5">
                        {resource.name}
                        {resource.url && (
                          <a href={resource.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary">
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 max-w-[200px] truncate">{resource.notes}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="font-medium bg-secondary text-secondary-foreground">{resource.type}</Badge>
                </TableCell>
                <TableCell className="font-medium">{resource.owner}</TableCell>
                <TableCell>
                  <Badge 
                    className={cn(
                      "font-bold",
                      resource.criticality === 'high' ? "bg-red-500/10 text-red-500" :
                      resource.criticality === 'medium' ? "bg-orange-500/10 text-orange-500" :
                      "bg-blue-500/10 text-blue-500"
                    )}
                    variant="outline"
                  >
                    {resource.criticality.toUpperCase()}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex -space-x-2">
                    {[1, 2, 3].map((_, i) => (
                      <div key={i} className="w-7 h-7 rounded-full border-2 border-card bg-accent flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                        <Shield className="w-3 h-3" />
                      </div>
                    ))}
                    <div className="w-7 h-7 rounded-full border-2 border-card bg-accent flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                      +2
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-muted-foreground">
                        <MoreHorizontal className="w-5 h-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem className="font-medium">View Details</DropdownMenuItem>
                      <DropdownMenuItem className="font-medium">Edit Resource</DropdownMenuItem>
                      <DropdownMenuItem className="font-medium">Manage Entitlements</DropdownMenuItem>
                      <div className="h-px bg-border my-1" />
                      <DropdownMenuItem className="font-medium text-destructive">Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {MOCK_RESOURCES.length === 0 && (
          <div className="p-20 text-center flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center">
              <Search className="w-8 h-8 text-muted-foreground" />
            </div>
            <div>
              <p className="font-bold text-xl">No resources found</p>
              <p className="text-muted-foreground">Start by documenting your first IT resource or system.</p>
            </div>
            <Button className="mt-2 bg-primary">Add New Resource</Button>
          </div>
        )}
      </div>
    </div>
  );
}

import { cn } from '@/lib/utils';
