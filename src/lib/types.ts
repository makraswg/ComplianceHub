
export type Role = 'tenantOwner' | 'admin' | 'editor' | 'viewer' | 'superAdmin';
export type DataSource = 'firestore' | 'mock' | 'mysql';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  ldapEnabled?: boolean | number;
  ldapUrl?: string;
  ldapPort?: string;
  ldapBaseDn?: string;
  ldapBindDn?: string;
  ldapBindPassword?: string;
  ldapUserFilter?: string;
}

export interface User {
  id: string;
  tenantId: string;
  externalId: string;
  displayName: string;
  email: string;
  department: string;
  title: string;
  enabled: boolean | number;
  onboardingDate?: string;
  offboardingDate?: string;
  lastSyncedAt: string;
  adGroups?: string[];
}

export interface PlatformUser {
  id: string;
  uid?: string;
  email: string;
  password?: string;
  displayName: string;
  role: Role;
  tenantId: string;
  enabled: boolean | number;
  createdAt: string;
}

export interface Resource {
  id: string;
  tenantId: string;
  name: string;
  category: 'it_tool' | 'business_critical' | 'test' | 'standard_app' | 'infrastructure';
  type: 'SaaS' | 'OnPrem' | 'Private Cloud' | 'Webshop' | 'IoT' | 'Andere';
  operatorId: string;
  dataClassification: 'public' | 'internal' | 'confidential' | 'strictly_confidential';
  dataLocation: string;
  mfaType: 'none' | 'standard_otp' | 'standard_mail' | 'optional_otp' | 'optional_mail';
  authMethod: 'direct' | string;
  url: string;
  documentationUrl?: string;
  criticality: 'low' | 'medium' | 'high';
  notes: string;
  createdAt?: string;
}

export interface Entitlement {
  id: string;
  resourceId: string;
  parentId?: string;
  name: string;
  description: string;
  riskLevel: 'low' | 'medium' | 'high';
  isAdmin?: boolean | number;
  isSharedAccount?: boolean | number;
  passwordManagerUrl?: string;
  tenantId?: string;
  externalMapping?: string;
}

export interface Assignment {
  id: string;
  userId: string;
  entitlementId: string;
  originGroupId?: string;
  status: 'active' | 'requested' | 'removed' | 'pending_removal';
  grantedBy: string;
  grantedAt: string;
  validFrom?: string;
  validUntil?: string;
  ticketRef: string;
  jiraIssueKey?: string;
  notes: string;
  lastReviewedAt?: string;
  reviewedBy?: string;
  tenantId?: string;
  syncSource?: 'manual' | 'ldap' | 'group';
}

// Catalog System
export interface Catalog {
  id: string;
  name: string;
  version: string;
  provider: string; // e.g. BSI
  importedAt: string;
}

export interface HazardModule {
  id: string;
  catalogId: string;
  code: string; // e.g. ORP, APP
  title: string;
}

export interface Hazard {
  id: string;
  moduleId: string;
  code: string; // e.g. APP.1
  title: string;
  description: string;
  contentHash: string;
}

export interface ImportRun {
  id: string;
  catalogId: string;
  timestamp: string;
  status: 'success' | 'partial' | 'failed';
  itemCount: number;
  log: string;
}

export interface ImportIssue {
  id: string;
  runId: string;
  severity: 'warning' | 'error';
  itemRef: string;
  message: string;
}

// Risk 2.0
export interface Risk {
  id: string;
  tenantId: string;
  assetId?: string; // Link to Resource
  hazardId?: string; // Link to Catalog Hazard
  title: string;
  category: string;
  description: string;
  
  // Inherent (Raw)
  impact: number;
  probability: number;
  
  // Residual (After Controls)
  residualImpact?: number;
  residualProbability?: number;
  
  owner: string;
  status: 'active' | 'mitigated' | 'accepted' | 'closed';
  
  // Acceptance
  acceptanceStatus?: 'pending' | 'accepted' | 'rejected';
  acceptanceReason?: string;
  acceptedBy?: string;
  
  lastReviewDate?: string;
  reviewCycleDays?: number;
  createdAt: string;
}

export interface RiskCategorySetting {
  id: string;
  tenantId: string;
  defaultReviewDays: number;
}

export interface RiskMeasure {
  id: string;
  riskId: string;
  title: string;
  description?: string;
  owner: string;
  dueDate: string;
  status: 'planned' | 'active' | 'completed' | 'on_hold';
  effectiveness: number;
  notes?: string;
}

export interface Document {
  id: string;
  [key: string]: any;
}
