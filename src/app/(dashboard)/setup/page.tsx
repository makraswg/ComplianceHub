
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SetupRedirect() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to the new location under settings
    router.push('/settings/database');
  }, [router]);

  return null;
}
