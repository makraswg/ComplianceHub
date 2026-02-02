
import { Tenant, User, Resource, Entitlement, Assignment } from './types';

export const MOCK_TENANTS: Tenant[] = [
  { id: 't1', name: 'Acme Corp', slug: 'acme', createdAt: new Date().toISOString() },
  { id: 't2', name: 'Global Tech', slug: 'globaltech', createdAt: new Date().toISOString() },
];

export const MOCK_USERS: User[] = [
  { 
    id: 'u1', 
    externalId: 'ext_101', 
    displayName: 'John Doe', 
    email: 'john@acme.com', 
    department: 'IT Infrastructure', 
    title: 'Senior Admin', 
    enabled: true, 
    lastSyncedAt: new Date().toISOString() 
  },
  { 
    id: 'u2', 
    externalId: 'ext_102', 
    displayName: 'Jane Smith', 
    email: 'jane@acme.com', 
    department: 'Security', 
    title: 'SOC Analyst', 
    enabled: true, 
    lastSyncedAt: new Date().toISOString() 
  },
];

export const MOCK_RESOURCES: Resource[] = [
  { 
    id: 'r1', 
    name: 'GitHub Enterprise', 
    type: 'SaaS', 
    owner: 'Jane Smith', 
    url: 'https://github.com/acme', 
    criticality: 'high', 
    notes: 'Main source code repository' 
  },
  { 
    id: 'r2', 
    name: 'AWS Console', 
    type: 'SaaS', 
    owner: 'John Doe', 
    url: 'https://aws.amazon.com', 
    criticality: 'high', 
    notes: 'Cloud production environment' 
  },
];

export const MOCK_ENTITLEMENTS: Entitlement[] = [
  { id: 'e1', resourceId: 'r1', name: 'Admin', description: 'Full organization control', riskLevel: 'high' },
  { id: 'e2', resourceId: 'r1', name: 'Member', description: 'Regular repository access', riskLevel: 'medium' },
  { id: 'e3', resourceId: 'r2', name: 'Billing', description: 'View and manage costs', riskLevel: 'low' },
];

export const MOCK_ASSIGNMENTS: Assignment[] = [
  { 
    id: 'a1', 
    userId: 'u1', 
    entitlementId: 'e1', 
    status: 'active', 
    grantedBy: 'system', 
    grantedAt: new Date().toISOString(), 
    ticketRef: 'INC-1234', 
    notes: 'Primary admin' 
  },
];
