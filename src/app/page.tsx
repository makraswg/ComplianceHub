
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, Loader2, AlertCircle } from 'lucide-react';
import { useAuth, useUser } from '@/firebase';
import { initiateAnonymousSignIn, initiateEmailSignIn } from '@/firebase/non-blocking-login';
import { useSettings } from '@/context/settings-context';
import { authenticatePlatformUserAction } from '@/app/actions/mysql-actions';
import { toast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function LoginPage() {
  const router = useRouter();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const { dataSource } = useSettings();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsActionLoading(true);
    setAuthError(null);

    try {
      // Wenn MySQL aktiv ist und Zugangsdaten eingegeben wurden, prüfen wir erst gegen DB
      if (dataSource === 'mysql' && email && password) {
        const result = await authenticatePlatformUserAction(email, password);
        
        if (!result.success) {
          setAuthError(result.error || "Authentifizierung fehlgeschlagen.");
          setIsActionLoading(false);
          return;
        }
        
        toast({ title: "MySQL Login erfolgreich", description: `Willkommen, ${result.user.displayName}` });
        
        // Nach erfolgreichem DB-Check starten wir eine anonyme Firebase-Sitzung für die App-Infrastruktur
        await initiateAnonymousSignIn(auth);
      } else if (email && password) {
        // Standard Firebase E-Mail Login (für Firestore Mode)
        await initiateEmailSignIn(auth, email, password);
      } else {
        // Einfacher Gast-Zugang
        await initiateAnonymousSignIn(auth);
      }
    } catch (err: any) {
      setAuthError(err.message || "Ein unerwarteter Fehler ist aufgetreten.");
    } finally {
      setIsActionLoading(false);
    }
  };

  if (isUserLoading || user) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="absolute top-0 left-0 p-8 flex items-center gap-2">
        <Shield className="w-8 h-8 text-primary" />
        <span className="text-2xl font-headline font-bold text-foreground">ComplianceHub</span>
      </div>
      <div className="w-full max-w-md">
        <Card className="border-none shadow-xl rounded-none">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-headline uppercase">Anmeldung</CardTitle>
            <CardDescription>
              {dataSource === 'mysql' 
                ? "Verifizierung über die MySQL-Plattformdatenbank." 
                : "Melden Sie sich an, um den ComplianceHub zu verwalten."}
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleLogin}>
            <CardContent className="space-y-4">
              {authError && (
                <Alert variant="destructive" className="rounded-none">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Fehler</AlertTitle>
                  <AlertDescription className="text-xs">{authError}</AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[10px] font-bold uppercase">E-Mail</Label>
                <Input id="email" type="email" placeholder="admin@company.com" value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-none" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" title="Passwort" className="text-[10px] font-bold uppercase">Passwort</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="rounded-none" />
              </div>
              
              <div className="p-3 bg-muted/20 border text-[9px] font-bold uppercase text-muted-foreground flex items-center gap-2">
                <Shield className="w-3 h-3" /> Aktiver Modus: {dataSource.toUpperCase()}
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <Button type="submit" className="w-full h-11 bg-primary hover:bg-primary/90 rounded-none font-bold uppercase text-xs" disabled={isActionLoading}>
                {isActionLoading ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : null}
                Anmelden
              </Button>
              <div className="relative w-full text-center">
                <span className="bg-background px-2 text-[10px] text-muted-foreground uppercase font-bold">Oder</span>
                <div className="absolute top-1/2 left-0 right-0 -z-10 h-px bg-border" />
              </div>
              <Button type="button" variant="outline" className="w-full rounded-none font-bold uppercase text-[10px]" onClick={() => initiateAnonymousSignIn(auth)} disabled={isActionLoading}>
                Anonym fortfahren (Demo)
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
