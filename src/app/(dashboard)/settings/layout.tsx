
"use client";

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  Building2,
  Users,
  Network,
  RefreshCw,
  BrainCircuit,
  FileCheck,
  Mail,
  FileCode,
  Briefcase,
  Settings as SettingsIcon,
  ChevronRight,
  BookOpen
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const navItems = [
    { id: 'general', label: 'Organisation', icon: Building2, href: '/settings/general' },
    { id: 'structure', label: 'Struktur & Stellen', icon: Briefcase, href: '/settings/structure' },
    { id: 'pusers', label: 'Administratoren', icon: Users, href: '/settings/pusers' },
    { id: 'sync', label: 'Identität & Sync', icon: Network, href: '/settings/sync' },
    { id: 'integrations', label: 'Jira Gateway', icon: RefreshCw, href: '/settings/integrations' },
    { id: 'bookstack', label: 'BookStack Export', icon: BookOpen, href: '/settings/bookstack' },
    { id: 'ai', label: 'KI Access Advisor', icon: BrainCircuit, href: '/settings/ai' },
    { id: 'dsgvo', label: 'Datenschutz', icon: FileCheck, href: '/settings/dsgvo' },
    { id: 'email', label: 'E-Mail (SMTP)', icon: Mail, href: '/settings/email' },
    { id: 'data', label: 'Katalog-Import', icon: FileCode, href: '/settings/data' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between border-b pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight uppercase font-headline">Systemeinstellungen</h1>
          <p className="text-muted-foreground text-sm mt-1">Konfiguration der Governance-Engine und Infrastruktur.</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        <aside className="w-full lg:w-64 shrink-0">
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link 
                  key={item.id} 
                  href={item.href}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-3 rounded-none border transition-all group",
                    isActive 
                      ? "bg-white border-primary/20 text-primary shadow-sm ring-1 ring-primary/10" 
                      : "border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className={cn("w-4 h-4", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span>
                  </div>
                  {isActive && <ChevronRight className="w-3 h-3" />}
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="flex-1 min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
