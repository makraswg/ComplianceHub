
"use client";

import { AppSidebar } from '@/components/layout/app-sidebar';
import { Bell, ChevronDown, Globe, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SettingsProvider, useSettings } from '@/context/settings-context';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';

function HeaderContent() {
  const { activeTenantId, setActiveTenantId } = useSettings();

  const getTenantLabel = () => {
    if (activeTenantId === 't1') return 'Acme Corp';
    if (activeTenantId === 't2') return 'Global Tech';
    return 'Alle Firmen';
  };

  return (
    <header className="h-16 border-b bg-card flex items-center justify-between px-8 sticky top-0 z-30">
      <div className="flex-1 flex items-center">
        {/* Leerer Platzhalter */}
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="text-muted-foreground h-9 w-9">
            <Bell className="w-4 h-4" />
          </Button>
          <div className="w-px h-6 bg-border mx-1" />
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-2 rounded-none border-primary/20 bg-primary/5 text-primary hover:bg-primary/10">
                {activeTenantId === 'all' ? <Globe className="w-3.5 h-3.5" /> : <Building2 className="w-3.5 h-3.5" />}
                <span className="text-[10px] font-bold uppercase tracking-wider">{getTenantLabel()}</span>
                <ChevronDown className="w-3 h-3 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-none">
              <DropdownMenuLabel className="text-[9px] font-bold uppercase text-muted-foreground">Mandant auswählen</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setActiveTenantId('all')} className="gap-2 text-xs font-bold uppercase">
                <Globe className="w-3.5 h-3.5" /> Alle Firmen (Global)
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setActiveTenantId('t1')} className="gap-2 text-xs font-bold uppercase">
                <Building2 className="w-3.5 h-3.5" /> Acme Corp
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setActiveTenantId('t2')} className="gap-2 text-xs font-bold uppercase">
                <Building2 className="w-3.5 h-3.5" /> Global Tech
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SettingsProvider>
      <div className="flex min-h-screen bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <HeaderContent />
          <main className="flex-1 p-8 max-w-[1600px] mx-auto w-full">
            {children}
          </main>
        </div>
      </div>
    </SettingsProvider>
  );
}
