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
    <div className="w-72 border-r bg-card/50 backdrop-blur-sm flex flex-col h-screen sticky top-0 z-40 sidebar-gradient">
      <div className="p-8 flex items-center gap-3">
        <div className="w-10 h-10 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30 rotate-3 group-hover:rotate-0 transition-transform">
          <ShieldCheck className="w-6 h-6 text-white" />
        </div>
        <div>
          <span className="font-headline font-bold text-2xl tracking-tighter text-foreground block leading-none">AccessHub</span>
          <span className="text-[10px] text-muted-foreground font-bold tracking-widest uppercase mt-1 block">Enterprise IAM</span>
        </div>
      </div>

      <div className="px-4 flex-1 overflow-y-auto space-y-8 pt-4">
        <div>
          <p className="px-4 mb-3 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">
            Navigation
          </p>
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link 
                  key={item.name} 
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group relative",
                    isActive 
                      ? "active-nav-item" 
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                  )}
                >
                  <item.icon className={cn(
                    "w-5 h-5 transition-transform duration-300 group-hover:scale-110",
                    isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
                  )} />
                  <span className="font-semibold text-sm">{item.name}</span>
                  {isActive && (
                    <span className="absolute right-2 w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        <div>
          <p className="px-4 mb-3 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">
            Administration
          </p>
          <nav className="space-y-1.5">
            <Link 
              href="/settings"
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group",
                pathname === '/settings' 
                  ? "active-nav-item" 
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              )}
            >
              <Settings className={cn(
                "w-5 h-5",
                pathname === '/settings' ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
              )} />
              <span className="font-semibold text-sm">Einstellungen</span>
            </Link>
          </nav>
        </div>
      </div>

      <div className="p-6 border-t bg-accent/5">
        <div className="flex items-center gap-3 mb-6 p-2 rounded-2xl transition-colors hover:bg-accent/10 cursor-pointer">
          <Avatar className="h-10 w-10 border-2 border-primary/20">
            <AvatarImage src="" />
            <AvatarFallback className="bg-primary/10 text-primary font-bold">MM</AvatarFallback>
          </Avatar>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-bold truncate text-foreground/90">Max Mustermann</p>
            <p className="text-[10px] text-muted-foreground truncate uppercase font-medium">Compliance Officer</p>
          </div>
        </div>
        <Button 
          variant="ghost" 
          className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/5 gap-3 px-4 h-11 rounded-xl transition-colors" 
          asChild
        >
          <Link href="/">
            <LogOut className="w-5 h-5" />
            <span className="text-sm font-bold">Abmelden</span>
          </Link>
        </Button>
      </div>
    </div>
  );
}
