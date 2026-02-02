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
  LayoutDashboard,
  ShieldCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export function AppSidebar() {
  const pathname = usePathname();

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Benutzerverzeichnis', href: '/users', icon: Users },
    { name: 'Ressourcenkatalog', href: '/resources', icon: Layers },
    { name: 'Zuweisungen', href: '/assignments', icon: Shield },
    { name: 'Zugriffsüberprüfungen', href: '/reviews', icon: CheckCircle },
    { name: 'Prüfprotokoll', href: '/audit', icon: Activity },
  ];

  return (
    <div className="w-64 sidebar-admin flex flex-col h-screen sticky top-0 z-40">
      <div className="p-6 flex items-center gap-3">
        <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
          <ShieldCheck className="w-5 h-5 text-white" />
        </div>
        <div>
          <span className="font-headline font-bold text-xl tracking-tight block">AccessHub</span>
          <span className="text-[10px] text-slate-400 font-bold tracking-widest uppercase block">Enterprise IAM</span>
        </div>
      </div>

      <div className="px-3 flex-1 overflow-y-auto space-y-6 pt-4">
        <div>
          <p className="px-3 mb-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            Hauptmenü
          </p>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link 
                  key={item.name} 
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md transition-all text-sm font-medium",
                    isActive 
                      ? "active-nav-item" 
                      : "text-slate-400 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div>
          <p className="px-3 mb-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            System
          </p>
          <nav className="space-y-1">
            <Link 
              href="/settings"
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md transition-all text-sm font-medium",
                pathname === '/settings' 
                  ? "active-nav-item" 
                  : "text-slate-400 hover:bg-white/10 hover:text-white"
              )}
            >
              <Settings className="w-4 h-4" />
              <span>Einstellungen</span>
            </Link>
          </nav>
        </div>
      </div>

      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-3 mb-4 p-2 rounded hover:bg-white/5 cursor-pointer">
          <Avatar className="h-8 w-8 rounded-sm">
            <AvatarFallback className="bg-primary/20 text-primary font-bold text-xs">MM</AvatarFallback>
          </Avatar>
          <div className="flex-1 overflow-hidden">
            <p className="text-xs font-bold truncate">Max Mustermann</p>
            <p className="text-[10px] text-slate-500 truncate uppercase">Admin</p>
          </div>
        </div>
        <Button 
          variant="ghost" 
          className="w-full justify-start text-slate-400 hover:text-red-400 hover:bg-red-400/10 gap-2 px-2 h-9 rounded-md transition-colors" 
          asChild
        >
          <Link href="/">
            <LogOut className="w-4 h-4" />
            <span className="text-xs font-bold">Abmelden</span>
          </Link>
        </Button>
      </div>
    </div>
  );
}
