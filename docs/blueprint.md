# **App Name**: AccessHub

## Core Features:

- Tenant Management: Create and manage tenants (name, slug, createdAt).
- User Directory (LDAP Sync): Synchronize users from LDAP, filterable by department and enabled status.
- Resource Catalog: Create, read, update, and delete resources (name, type, owner, URL, criticality, notes).
- Entitlement Management: Define entitlements for each resource (resourceId, name, description, riskLevel).
- Assignment Management: Assign entitlements to users manually (userId, entitlementId, status, grantedBy, grantedAt, ticketRef, validUntil, notes).
- Access Reviews: List high-risk assignments and mark them as reviewed.
- Audit Log: Log every change to resources, entitlements, and assignments.

## Style Guidelines:

- Primary color: A vibrant blue (#29ABE2) to evoke trust and security.
- Background color: Light gray (#F5F5F5), providing a clean and modern backdrop.
- Accent color: A warm orange (#FF9800) to highlight important actions and notifications.
- Body font: 'Inter', a sans-serif font providing a modern and neutral look.
- Headline font: 'Space Grotesk', a sans-serif font giving a computerized and techy feel; for longer text use 'Inter' as the body font.
- Use clear and concise icons to represent resources, entitlements, and actions.
- Clean and structured layout with clear separation between tenants and modules.