
"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Users } from 'lucide-react';
import { usePluggableCollection } from '@/hooks/data/use-pluggable-collection';
import { useSettings } from '@/context/settings-context';
import { deleteCollectionRecord } from '@/app/actions/mysql-actions';
import { PlatformUser } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function PlatformUsersPage() {
  const { dataSource } = useSettings();
  const { data: pUsers, refresh } = usePluggableCollection<PlatformUser>('platformUsers');

  return (
    <Card className="rounded-none border shadow-none">
      <CardHeader className="bg-muted/10 border-b py-4">
        <CardTitle className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
          <Users className="w-4 h-4" /> Plattform Administratoren
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-[9px] font-bold uppercase">Benutzer</TableHead>
              <TableHead className="text-[9px] font-bold uppercase">Rolle</TableHead>
              <TableHead className="text-[9px] font-bold uppercase">Mandant</TableHead>
              <TableHead className="text-right"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pUsers?.map(u => (
              <TableRow key={u.id} className="text-xs">
                <TableCell>
                  <div className="font-bold">{u.displayName}</div>
                  <div className="text-[10px] text-muted-foreground">{u.email}</div>
                </TableCell>
                <TableCell><Badge variant="outline" className="text-[8px] uppercase">{u.role}</Badge></TableCell>
                <TableCell className="uppercase text-[9px] font-bold text-muted-foreground">{u.tenantId || 'global'}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => { if(confirm("Admin-Zugang entfernen?")) deleteCollectionRecord('platformUsers', u.id, dataSource).then(() => refresh()); }}>
                    <Trash2 className="w-3.5 h-3.5 text-red-600" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
