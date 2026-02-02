
"use client";

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  Users, 
  Shield, 
  Layers, 
  CheckCircle, 
  Activity, 
  Settings, 
  LogOut, 
  ChevronRight,
  LayoutDashboard,
  Search,
  Bell
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useParams } from 'next/navigation';

export function AppSidebar() {
  const pathname = usePathname();
  const params = useParams();
  const tenantId = params.tenantId as string;

  const navItems = [
    { name: 'Dashboard', href: `/${tenantId}/dashboard`, icon: LayoutDashboard },
    { name: 'User Directory', href: `/${tenantId}/users`, icon: Users },
    { name: 'Resource Catalog', href: `/${tenantId}/resources`, icon: Layers },
    { name: 'Assignments', href: `/${tenantId}/assignments`, icon: Shield },
    { name: 'Access Reviews', href: `/${tenantId}/reviews`, icon: CheckCircle },
    { name: 'Audit Log', href: `/${tenantId}/audit`, icon: Activity },
  ];

  const adminItems = [
    { name: 'Tenant Settings', href: `/${tenantId}/settings`, icon: Settings },
  ];

  return (
    <div className="w-64 border-r bg-card flex flex-col h-screen sticky top-0">
      <div className="p-6 flex items-center gap-2 mb-4">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <span className="font-headline font-bold text-xl tracking-tight">AccessHub</span>
      </div>

      <div className="px-3 flex-1 overflow-y-auto space-y-6">
        <div>
          <p className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Overview
          </p>
          <nav className="space-y-1">
            {navItems.map((item) => (
              <Link 
                key={item.name} 
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md transition-all group",
                  pathname === item.href 
                    ? "bg-primary text-primary-foreground shadow-sm" 
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                )}
              >
                <item.icon className={cn(
                  "w-5 h-5",
                  pathname === item.href ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
                )} />
                <span className="font-medium text-sm">{item.name}</span>
              </Link>
            ))}
          </nav>
        </div>

        <div>
          <p className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Administration
          </p>
          <nav className="space-y-1">
            {adminItems.map((item) => (
              <Link 
                key={item.name} 
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md transition-all group",
                  pathname === item.href 
                    ? "bg-primary text-primary-foreground shadow-sm" 
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                )}
              >
                <item.icon className={cn(
                  "w-5 h-5",
                  pathname === item.href ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
                )} />
                <span className="font-medium text-sm">{item.name}</span>
              </Link>
            ))}
          </nav>
        </div>
      </div>

      <div className="p-4 border-t space-y-2">
        <div className="flex items-center gap-3 p-2">
          <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold">JD</div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-semibold truncate">John Doe</p>
            <p className="text-xs text-muted-foreground truncate">john@acme.com</p>
          </div>
        </div>
        <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-destructive gap-3 px-2 h-9" asChild>
          <Link href="/">
            <LogOut className="w-5 h-5" />
            <span className="text-sm font-medium">Sign Out</span>
          </Link>
        </Button>
      </div>
    </div>
  );
}
