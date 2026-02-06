
"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Save } from 'lucide-react';
import { usePluggableCollection } from '@/hooks/data/use-pluggable-collection';
import { useSettings } from '@/context/settings-context';
import { saveCollectionRecord } from '@/app/actions/mysql-actions';
import { toast } from '@/hooks/use-toast';
import { Tenant } from '@/lib/types';

export default function GeneralSettingsPage() {
  const { dataSource, activeTenantId } = useSettings();
  const [isSaving, setIsSaving] = useState(false);
  const [tenantDraft, setTenantDraft] = useState<Partial<Tenant>>({});

  const { data: tenants, refresh } = usePluggableCollection<Tenant>('tenants');

  useEffect(() => {
    const current = tenants?.find(t => t.id === (activeTenantId === 'all' ? 't1' : activeTenantId));
    if (current) setTenantDraft(current);
  }, [tenants, activeTenantId]);

  const handleSave = async () => {
    if (!tenantDraft.id || !tenantDraft.name) return;
    setIsSaving(true);
    try {
      const res = await saveCollectionRecord('tenants', tenantDraft.id, tenantDraft, dataSource);
      if (res.success) {
        toast({ title: "Mandant gespeichert" });
        refresh();
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="rounded-none border shadow-none">
      <CardHeader className="bg-muted/10 border-b py-4">
        <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-primary">Mandanten-Stammdaten</CardTitle>
      </CardHeader>
      <CardContent className="p-8 space-y-6">
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase">Unternehmensname</Label>
            <Input 
              value={tenantDraft.name || ''} 
              onChange={e => setTenantDraft({...tenantDraft, name: e.target.value})} 
              className="rounded-none h-10 font-bold" 
            />
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase">Slug (URL-Alias)</Label>
            <Input 
              value={tenantDraft.slug || ''} 
              disabled 
              className="rounded-none h-10 bg-muted/20 font-mono" 
            />
          </div>
        </div>
        <div className="flex justify-end pt-4 border-t">
          <Button onClick={handleSave} disabled={isSaving} className="rounded-none font-bold uppercase text-[10px] h-11 px-10 gap-2">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Änderungen Speichern
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
