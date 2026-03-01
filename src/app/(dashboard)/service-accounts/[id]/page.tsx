"use client";

import { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowRight, ChevronLeft, Clock, KeyRound, Layers, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePluggableCollection } from '@/hooks/data/use-pluggable-collection';
import { Entitlement, Resource, ServiceAccount } from '@/lib/types';
import { computeEffectiveAccessForServiceAccount } from '@/lib/effective-access';

function getRotationMeta(account: ServiceAccount) {
  if (!account.lastRotatedAt || !account.rotationIntervalDays || account.rotationIntervalDays <= 0) {
    return { status: 'none', next: null as Date | null };
  }
  const next = new Date(account.lastRotatedAt);
  if (Number.isNaN(next.getTime())) return { status: 'none', next: null as Date | null };
  next.setDate(next.getDate() + account.rotationIntervalDays);
  return { status: next.getTime() <= Date.now() ? 'due' : 'ok', next };
}

export default function ServiceAccountDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const { data: serviceAccounts } = usePluggableCollection<ServiceAccount>('serviceAccounts');
  const { data: resources } = usePluggableCollection<Resource>('resources');
  const { data: entitlements } = usePluggableCollection<Entitlement>('entitlements');

  const serviceAccount = useMemo(() => serviceAccounts?.find((item) => item.id === id), [serviceAccounts, id]);
  const resource = useMemo(
    () => resources?.find((item) => item.id === serviceAccount?.resourceId),
    [resources, serviceAccount?.resourceId]
  );

  const grants = useMemo(() => {
    if (!serviceAccount || !entitlements) return [];
    return computeEffectiveAccessForServiceAccount(serviceAccount.id, serviceAccount.entitlementIds || [], entitlements);
  }, [serviceAccount, entitlements]);

  if (!serviceAccount) {
    return (
      <div className="p-10 space-y-4">
        <Button variant="outline" onClick={() => router.push('/service-accounts')}>
          <ChevronLeft className="w-4 h-4 mr-2" /> Zurück
        </Button>
        <p className="text-slate-500">Servicekonto nicht gefunden.</p>
      </div>
    );
  }

  const rotation = getRotationMeta(serviceAccount);

  return (
    <div className="p-6 space-y-6 pb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b pb-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push('/service-accounts')}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-headline font-bold uppercase tracking-tight text-slate-900 dark:text-white">{serviceAccount.name}</h1>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">Servicekonto-Detailansicht</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push(`/resources/${serviceAccount.resourceId}`)}>
            <Layers className="w-4 h-4 mr-2" /> Ressource öffnen
          </Button>
          <Button onClick={() => router.push(`/service-accounts?edit=${serviceAccount.id}`)}>
            Bearbeiten
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-widest">Stammdaten</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div><span className="text-slate-400">Ressource:</span> <span className="font-bold">{resource?.name || serviceAccount.resourceId}</span></div>
            <div><span className="text-slate-400">Benutzername:</span> <span className="font-bold">{serviceAccount.username || '---'}</span></div>
            <div><span className="text-slate-400">System:</span> <span className="font-bold">{serviceAccount.system || '---'}</span></div>
            <div><span className="text-slate-400">Owner:</span> <span className="font-bold">{serviceAccount.owner || '---'}</span></div>
            <div><span className="text-slate-400">Credential:</span> <span className="font-bold">{serviceAccount.credentialType || '---'}</span></div>
            <div className="pt-2">
              <Badge variant={serviceAccount.status === 'active' ? 'default' : 'secondary'}>{serviceAccount.status}</Badge>
            </div>
            <div className="pt-3 border-t">
              <p className="text-xs text-slate-500">{serviceAccount.purpose || 'Kein Zweck hinterlegt.'}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-widest flex items-center gap-2">
              <Clock className="w-4 h-4" /> Rotation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              {rotation.status === 'due' && <Badge className="bg-red-100 text-red-700">Fällig</Badge>}
              {rotation.status === 'ok' && <Badge className="bg-emerald-100 text-emerald-700">OK</Badge>}
              {rotation.status === 'none' && <Badge variant="outline">Nicht geplant</Badge>}
            </div>
            <div><span className="text-slate-400">Intervall:</span> <span className="font-bold">{serviceAccount.rotationIntervalDays || '---'} Tage</span></div>
            <div><span className="text-slate-400">Letzte Rotation:</span> <span className="font-bold">{serviceAccount.lastRotatedAt ? new Date(serviceAccount.lastRotatedAt).toLocaleDateString() : '---'}</span></div>
            <div><span className="text-slate-400">Nächste Rotation:</span> <span className="font-bold">{rotation.next ? rotation.next.toLocaleDateString() : '---'}</span></div>
            <div><span className="text-slate-400">Gültig bis:</span> <span className="font-bold">{serviceAccount.validUntil ? new Date(serviceAccount.validUntil).toLocaleDateString() : '---'}</span></div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-widest flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" /> Effektive Zugriffe
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rolle</TableHead>
                <TableHead>Ressource</TableHead>
                <TableHead>Quelle</TableHead>
                <TableHead className="text-right">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {grants.map((grant) => {
                const role = entitlements?.find((item) => item.id === grant.entitlementId);
                const grantResource = resources?.find((item) => item.id === grant.resourceId);
                return (
                  <TableRow key={grant.entitlementId}>
                    <TableCell className="font-bold">{role?.name || grant.entitlementId}</TableCell>
                    <TableCell>{grantResource?.name || grant.resourceId}</TableCell>
                    <TableCell>
                      <Badge variant="outline"><KeyRound className="w-3 h-3 mr-1" /> Servicekonto</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => router.push(`/roles/${grant.entitlementId}`)}>
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {grants.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-10 text-center text-slate-400">Keine verknüpften Rollen gepflegt.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
