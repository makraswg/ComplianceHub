
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, LayoutDashboard } from 'lucide-react';
import { MOCK_TENANTS } from '@/lib/mock-data';

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<'login' | 'tenant'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate auth
    setStep('tenant');
  };

  const selectTenant = (tenantId: string) => {
    router.push(`/${tenantId}/dashboard`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="absolute top-0 left-0 p-8 flex items-center gap-2">
        <Shield className="w-8 h-8 text-primary" />
        <span className="text-2xl font-headline font-bold text-foreground">AccessHub</span>
      </div>

      <div className="w-full max-w-md">
        {step === 'login' ? (
          <Card className="border-none shadow-xl">
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-headline">Welcome back</CardTitle>
              <CardDescription>
                Enter your credentials to access your tenant dashboard
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleLogin}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="admin@company.com" 
                    required 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <Button variant="link" className="px-0 font-normal text-xs text-muted-foreground">
                      Forgot password?
                    </Button>
                  </div>
                  <Input 
                    id="password" 
                    type="password" 
                    required 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full h-11 bg-primary hover:bg-primary/90">
                  Sign In
                </Button>
              </CardFooter>
            </form>
          </Card>
        ) : (
          <Card className="border-none shadow-xl">
            <CardHeader>
              <CardTitle className="text-2xl font-headline text-center">Select Tenant</CardTitle>
              <CardDescription className="text-center">
                You are a member of multiple organizations.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {MOCK_TENANTS.map((tenant) => (
                <Button 
                  key={tenant.id}
                  variant="outline"
                  className="w-full h-16 justify-between px-6 hover:border-primary hover:bg-primary/5 transition-all group"
                  onClick={() => selectTenant(tenant.id)}
                >
                  <div className="flex flex-col items-start">
                    <span className="font-semibold text-foreground group-hover:text-primary transition-colors">{tenant.name}</span>
                    <span className="text-xs text-muted-foreground">{tenant.slug}.accesshub.com</span>
                  </div>
                  <LayoutDashboard className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </Button>
              ))}
            </CardContent>
            <CardFooter className="flex-col gap-2">
              <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => setStep('login')}>
                Back to Login
              </Button>
              <div className="h-px w-full bg-border my-2" />
              <Button variant="outline" className="w-full border-dashed">
                + Create New Tenant
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>
    </div>
  );
}
