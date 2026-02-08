
"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  FileStack, 
  Loader2, 
  Save, 
  ShieldCheck, 
  Trash2, 
  FileCheck, 
  Info,
  BadgeCheck,
  Settings2,
  HardDrive
} from 'lucide-react';
import { usePluggableCollection } from '@/hooks/data/use-pluggable-collection';
import { useSettings } from '@/context/settings-context';
import { saveMediaConfigAction, getMediaConfigAction, deleteMediaAction } from '@/app/actions/media-actions';
import { MediaFile, MediaConfig } from '@/lib/types';
import { toast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { usePlatformAuth } from '@/context/auth-context';

export default function MediaSettingsPage() {
  const { dataSource } = useSettings();
  const { user } = usePlatformAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [config, setConfig] = useState<MediaConfig>({ id: 'default', allowedTypes: [], maxFileSize: 5 * 1024 * 1024 });

  const { data: mediaFiles, refresh: refreshMedia, isLoading: mediaLoading } = usePluggableCollection<MediaFile>('media');

  useEffect(() => {
    getMediaConfigAction(dataSource).then(setConfig);
  }, [dataSource]);

  const handleSaveConfig = async () => {
    setIsSaving(true);
    try {
      await saveMediaConfigAction(config, dataSource);
      toast({ title: "Governance-Einstellungen gespeichert" });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleType = (type: string) => {
    setConfig(prev => ({
      ...prev,
      allowedTypes: prev.allowedTypes.includes(type) 
        ? prev.allowedTypes.filter(t => t !== type) 
        : [...prev.allowedTypes, type]
    }));
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const totalStorage = mediaFiles?.reduce((acc, f) => acc + f.fileSize, 0) || 0;

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b pb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary shadow-sm border border-primary/10">
            <FileStack className="w-6 h-6" />
          </div>
          <div>
            <Badge className="mb-1 rounded-full px-2 py-0 bg-primary/10 text-primary text-[9px] font-bold border-none uppercase tracking-wider">Storage Governance</Badge>
            <h1 className="text-2xl font-headline font-bold text-slate-900 dark:text-white uppercase tracking-tight">Medien- & Dateiverwaltung</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Zentrale Steuerung von Uploads, OCR und Speichernutzung.</p>
          </div>
        </div>
        <div className="flex items-center gap-4 p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border">
          <HardDrive className="w-4 h-4 text-slate-400" />
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400">Belegter Speicher</p>
            <p className="text-sm font-black text-primary">{formatSize(totalStorage)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Card className="rounded-2xl border shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
            <CardHeader className="p-6 bg-slate-50/50 border-b">
              <CardTitle className="text-sm font-black uppercase text-slate-900 dark:text-white flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-primary" /> Governance Richtlinien
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="space-y-4">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Zulässige Dateitypen</Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { id: 'image/jpeg', label: 'JPEG Bilder' },
                    { id: 'image/png', label: 'PNG Bilder' },
                    { id: 'application/pdf', label: 'PDF Dokumente' },
                    { id: 'application/zip', label: 'ZIP Archive' },
                    { id: 'text/csv', label: 'CSV Daten' }
                  ].map(type => (
                    <div 
                      key={type.id} 
                      className={cn(
                        "p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all",
                        config.allowedTypes.includes(type.id) ? "bg-primary/5 border-primary/20 text-primary" : "bg-white border-slate-100 text-slate-400"
                      )}
                      onClick={() => toggleType(type.id)}
                    >
                      <span className="text-[11px] font-bold">{type.label}</span>
                      <Switch checked={config.allowedTypes.includes(type.id)} className="scale-75" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Maximale Dateigröße (Bytes)</Label>
                  <Input 
                    type="number" 
                    value={config.maxFileSize} 
                    onChange={e => setConfig({...config, maxFileSize: parseInt(e.target.value)})} 
                    className="h-11 rounded-xl font-mono text-sm"
                  />
                  <p className="text-[10px] text-slate-400 italic font-medium ml-1">Aktuelles Limit: {formatSize(config.maxFileSize)}</p>
                </div>
              </div>

              <div className="pt-6 border-t flex justify-end">
                <Button onClick={handleSaveConfig} disabled={isSaving} className="rounded-xl h-11 px-10 font-black uppercase text-[10px] tracking-widest gap-2 bg-primary text-white shadow-lg shadow-primary/20">
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Konfiguration speichern
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
            <CardHeader className="p-6 bg-slate-50/50 border-b">
              <CardTitle className="text-sm font-black uppercase text-slate-900 dark:text-white flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-indigo-600" /> Inventar-Übersicht
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[400px]">
                <div className="divide-y divide-slate-100">
                  {mediaFiles?.map(file => (
                    <div key={file.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400">
                          {file.fileType.includes('image') ? <HardDrive className="w-5 h-5" /> : <FileCheck className="w-5 h-5" />}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800">{file.fileName}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant="outline" className="text-[8px] font-black h-4 px-1">{file.module}</Badge>
                            <span className="text-[9px] text-slate-400 font-medium">{formatSize(file.fileSize)} • {new Date(file.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 opacity-0 group-hover:opacity-100 transition-all" onClick={() => { if(confirm("Datei permanent löschen?")) deleteMediaAction(file.id, file.tenantId, user?.email || 'admin', dataSource).then(() => refreshMedia()); }}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  {(!mediaFiles || mediaFiles.length === 0) && (
                    <div className="py-20 text-center space-y-3 opacity-30">
                      <HardDrive className="w-10 h-10 mx-auto" />
                      <p className="text-[10px] font-black uppercase">Keine Dateien im Speicher</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="rounded-2xl border-none shadow-xl bg-slate-900 text-white overflow-hidden">
            <CardContent className="p-8 space-y-6">
              <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center shadow-lg">
                <BadgeCheck className="w-6 h-6 text-white" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-headline font-bold uppercase tracking-tight">Compliance Readiness</h3>
                <p className="text-xs text-slate-400 leading-relaxed italic">
                  Alle Medien-Uploads werden revisionssicher geloggt. Durch die OCR-Funktion können auch Scans von physikalischen Dokumenten automatisiert ausgewertet werden.
                </p>
              </div>
              <div className="pt-4 space-y-3">
                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-primary">
                  <span>Integritäts-Check</span>
                  <span className="text-emerald-400">Aktiv</span>
                </div>
                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full w-[85%] bg-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="p-6 bg-blue-50/50 border border-blue-100 rounded-2xl flex items-start gap-4">
            <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-xs font-black uppercase text-slate-900">Speicher-Hinweis</p>
              <p className="text-[10px] text-slate-500 italic leading-relaxed">
                Der Hub nutzt aktuell das lokale Datenbanksystem zur Speicherung von Medien-Inhalten (Base64). Für große Datenmengen wird die Anbindung eines S3-kompatiblen Speichers empfohlen.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
