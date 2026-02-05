
"use client";

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Settings, 
  Save, 
  Database,
  Loader2,
  Building2,
  Network,
  Mail,
  BrainCircuit,
  Info,
  Scale,
  Upload,
  History,
  AlertCircle,
  FileJson,
  CheckCircle2
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { useSettings } from '@/context/settings-context';
import { saveCollectionRecord } from '@/app/actions/mysql-actions';
import { runBsiImportAction } from '@/app/actions/bsi-import-actions';
import { usePluggableCollection } from '@/hooks/data/use-pluggable-collection';
import { RiskCategorySetting, Catalog, ImportRun } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function SettingsPage() {
  const { dataSource } = useSettings();
  const [activeTab, setActiveTab] = useState('general');
  const [isImporting, setIsImporting] = useState(false);

  const { data: riskCategorySettings, refresh: refreshRiskSettings } = usePluggableCollection<RiskCategorySetting>('riskCategorySettings');
  const { data: catalogs, refresh: refreshCatalogs } = usePluggableCollection<Catalog>('catalogs');
  const { data: importRuns, refresh: refreshRuns } = usePluggableCollection<ImportRun>('importRuns');

  const handleManualImport = async () => {
    setIsImporting(true);
    try {
      const mockData = {
        modules: [
          {
            code: 'APP', title: 'Anwendungen',
            threats: [
              { code: 'APP.1.G1', title: 'Fehlende Verschlüsselung', description: 'Daten werden im Klartext übertragen.' },
              { code: 'APP.1.G2', title: 'Software-Schwachstellen', description: 'Bekannte Lücken in Drittanbieter-Bibliotheken.' }
            ]
          },
          {
            code: 'ORP', title: 'Organisation & Personal',
            threats: [
              { code: 'ORP.1.G1', title: 'Insider-Angriffe', description: 'Böswillige Handlungen durch eigene Mitarbeiter.' }
            ]
          }
        ]
      };

      const res = await runBsiImportAction({
        catalogName: 'BSI IT-Grundschutz (Core)',
        version: '2023.1',
        data: mockData
      }, dataSource);

      if (res.success) {
        toast({ title: "Import erfolgreich", description: res.message });
        refreshCatalogs();
        refreshRuns();
      } else throw new Error(res.message);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Import fehlgeschlagen", description: e.message });
    } finally {
      setIsImporting(false);
    }
  };

  const handleSaveRiskCategoryCycle = async (category: string, days: number) => {
    const data: RiskCategorySetting = { id: category, tenantId: 'global', defaultReviewDays: days };
    await saveCollectionRecord('riskCategorySettings', category, data, dataSource);
    toast({ title: "Zyklus aktualisiert" });
    refreshRiskSettings();
  };

  const categories = ['IT-Sicherheit', 'Datenschutz', 'Rechtlich', 'Betrieblich'];

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-20">
      <div className="flex items-center justify-between border-b pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Systemeinstellungen</h1>
          <p className="text-muted-foreground mt-1">Plattform-Governance und Automatisierung.</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-card border h-12 p-1 gap-1 rounded-none w-full justify-start">
          <TabsTrigger value="general" className="rounded-none px-6 gap-2 text-[10px] font-bold uppercase"><Settings className="w-3.5 h-3.5" /> Organisation</TabsTrigger>
          <TabsTrigger value="risks" className="rounded-none px-6 gap-2 text-[10px] font-bold uppercase"><Scale className="w-3.5 h-3.5" /> Risiko-Konfig</TabsTrigger>
          <TabsTrigger value="data" className="rounded-none px-6 gap-2 text-[10px] font-bold uppercase"><Database className="w-3.5 h-3.5" /> Katalog-Import</TabsTrigger>
        </TabsList>

        <TabsContent value="risks">
          <Card className="rounded-none border shadow-none">
            <CardHeader className="bg-muted/10 border-b">
              <CardTitle className="text-[10px] font-bold uppercase tracking-widest">Risiko-Review Zyklen</CardTitle>
              <CardDescription className="text-[9px] uppercase font-bold">Standardmäßige Zeiträume für regelmäßige Überprüfungen.</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-6">
                {categories.map(cat => {
                  const setting = riskCategorySettings?.find(s => s.id === cat);
                  return (
                    <div key={cat} className="flex items-center justify-between p-4 border bg-slate-50/50">
                      <div><p className="font-bold text-sm">{cat}</p></div>
                      <div className="flex items-center gap-4">
                        <Input 
                          type="number" 
                          defaultValue={setting?.defaultReviewDays || 365} 
                          className="w-32 rounded-none h-10 font-bold" 
                          onBlur={(e) => handleSaveRiskCategoryCycle(cat, parseInt(e.target.value))}
                        />
                        <span className="text-[9px] font-bold uppercase text-muted-foreground">TAGE</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="rounded-none border shadow-none">
              <CardHeader className="bg-muted/10 border-b">
                <CardTitle className="text-[10px] font-bold uppercase tracking-widest">Import Engine</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="p-4 border-2 border-dashed flex flex-col items-center justify-center text-center gap-4 py-12">
                  <Upload className="w-10 h-10 text-muted-foreground opacity-20" />
                  <div className="space-y-1">
                    <p className="text-xs font-bold uppercase">JSON/CSV Import</p>
                    <p className="text-[10px] text-muted-foreground">Laden Sie Gefährdungskataloge direkt in das System.</p>
                  </div>
                  <Button 
                    variant="outline" 
                    className="rounded-none font-bold uppercase text-[10px] h-10 border-primary/20 hover:bg-primary/5"
                    onClick={handleManualImport}
                    disabled={isImporting}
                  >
                    {isImporting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />} Katalog Importieren
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-none border shadow-none">
              <CardHeader className="bg-muted/10 border-b">
                <CardTitle className="text-[10px] font-bold uppercase tracking-widest">Import Historie</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[250px]">
                  <Table>
                    <TableBody>
                      {importRuns?.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map(run => (
                        <TableRow key={run.id}>
                          <TableCell className="py-3">
                            <div className="text-[10px] font-bold uppercase">{new Date(run.timestamp).toLocaleString()}</div>
                            <div className="text-[9px] text-muted-foreground">{run.itemCount} Items</div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant="outline" className={cn("rounded-none text-[8px] font-bold uppercase", run.status === 'success' ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700")}>
                              {run.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
