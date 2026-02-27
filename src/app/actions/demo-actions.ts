
'use server';

import { saveCollectionRecord } from './mysql-actions';
import { 
  DataSource, 
  Risk, 
  RiskMeasure, 
  Process, 
  ProcessingActivity, 
  Resource, 
  Feature, 
  User, 
  Assignment, 
  JobTitle, 
  ProcessNode, 
  ProcessOperation, 
  RiskControl, 
  PlatformUser, 
  DataSubjectGroup, 
  DataCategory, 
  ServicePartner, 
  ServicePartnerContact, 
  ServicePartnerArea, 
  DataStore, 
  Task, 
  TaskComment, 
  Policy, 
  PolicyVersion, 
  BackupJob, 
  SyncJob, 
  AssetTypeOption, 
  OperatingModelOption, 
  RegulatoryOption, 
  Entitlement,
  EntitlementAssignment,
  ProcessVersion,
  Tenant,
  OrgUnitType,
  OrgUnit,
  UserOrgUnit,
  Capability,
  UserCapability,
  Position,
  UserPosition
} from '@/lib/types';
import { logAuditEventAction } from './audit-actions';

/**
 * Generiert eine massive Menge an vernetzten Demo-Daten für eine Wohnungsbaugesellschaft.
 * Deckt alle Module der Plattform ab (IAM, RiskHub, WorkflowHub, PolicyHub, ITSecHub).
 */
export async function seedDemoDataAction(dataSource: DataSource = 'mysql', actorEmail: string = 'system') {
  try {
    const now = new Date().toISOString();
    const today = now.split('T')[0];
    const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const offsetDate = (days: number) => {
      const d = new Date();
      d.setDate(d.getDate() - days);
      return d.toISOString();
    };

    // --- 1. MANDANTEN & STRUKTUR ---
    const t1Id = 't-wohnbau-01';
    await saveCollectionRecord('tenants', t1Id, {
      id: t1Id, 
      name: 'Wohnbau Nord GmbH', 
      slug: 'wohnbau-nord', 
      status: 'active', 
      createdAt: offsetDate(100),
      companyDescription: 'Mittelständische Wohnungsbaugesellschaft mit ca. 5.000 Wohneinheiten. Fokus auf Mietverwaltung, Bestandsentwicklung und soziale Stadtentwicklung.'
    }, dataSource);

    const depts = [
      { id: 'd-mgmt', name: 'Geschäftsführung' },
      { id: 'd-best', name: 'Bestandsmanagement' },
      { id: 'd-fibu', name: 'Finanzbuchhaltung' },
      { id: 'd-it', name: 'IT & Digitalisierung' },
      { id: 'd-hr', name: 'Personalwesen' },
      { id: 'd-tech', name: 'Technik / Instandhaltung' },
      { id: 'd-legal', name: 'Recht & Datenschutz' }
    ];

    const orgUnitTypes: OrgUnitType[] = [
      { id: 'out-company', tenantId: t1Id, key: 'company', name: 'Firma', enabled: true, sortOrder: 0 },
      { id: 'out-department', tenantId: t1Id, key: 'department', name: 'Abteilung', enabled: true, sortOrder: 10 },
      { id: 'out-team', tenantId: t1Id, key: 'team', name: 'Team', enabled: true, sortOrder: 20 },
    ];
    for (const type of orgUnitTypes) {
      await saveCollectionRecord('orgUnitTypes', type.id, type, dataSource);
    }

    const tenantRootOrgUnit: OrgUnit = {
      id: `ou-${t1Id}`,
      tenantId: t1Id,
      name: 'Wohnbau Nord GmbH',
      typeId: 'out-company',
      parentId: undefined,
      status: 'active',
      externalId: t1Id,
      sortOrder: 0,
    };
    await saveCollectionRecord('orgUnits', tenantRootOrgUnit.id, tenantRootOrgUnit, dataSource);

    for (const d of depts) {
      await saveCollectionRecord('orgUnits', d.id, {
        id: d.id,
        tenantId: t1Id,
        name: d.name,
        typeId: 'out-department',
        parentId: tenantRootOrgUnit.id,
        status: 'active',
        externalId: d.id,
        sortOrder: 0,
      }, dataSource);

      await saveCollectionRecord('departments', d.id, { ...d, tenantId: t1Id, status: 'active' }, dataSource);
    }

    // --- 2. DSGVO BASISDATEN ---
    const subjectGroups = [
      { id: 'dsg-mieter', name: 'Mieter & Mietinteressenten' },
      { id: 'dsg-mitarbeiter', name: 'Mitarbeiter (Beschäftigte)' },
      { id: 'dsg-partner', name: 'Service-Partner & Handwerker' }
    ];
    for (const sg of subjectGroups) {
      await saveCollectionRecord('dataSubjectGroups', sg.id, { ...sg, tenantId: t1Id, status: 'active' }, dataSource);
    }

    const dataCats = [
      { id: 'dc-stamm', name: 'Stammdaten (Name, Anschrift)', isGdprRelevant: true },
      { id: 'dc-bank', name: 'Bankverbindungen', isGdprRelevant: true },
      { id: 'dc-abrechnung', name: 'Verbrauchsabrechnungen', isGdprRelevant: true },
      { id: 'dc-vertrag', name: 'Vertragsdaten', isGdprRelevant: true },
      { id: 'dc-it-log', name: 'IT-Nutzungsprotokolle', isGdprRelevant: true }
    ];
    for (const dc of dataCats) {
      await saveCollectionRecord('dataCategories', dc.id, { ...dc, tenantId: t1Id, status: 'active' }, dataSource);
    }

    // --- 3. RESSOURCEN (30 Stück) & ENTITLEMENTS ---
    const resourcesList = [
      { id: 'res-wodis', name: 'Aareon Wodis Sigma', type: 'Software', model: 'SaaS Shared', cat: 'ERP' },
      { id: 'res-mareon', name: 'Mareon Portal', type: 'Software', model: 'SaaS Shared', cat: 'Handwerker-Anbindung' },
      { id: 'res-sap', name: 'SAP S/4HANA Finance', type: 'Software', model: 'Cloud', cat: 'Finanzen' },
      { id: 'res-datev', name: 'DATEV Unternehmen Online', type: 'Software', model: 'SaaS Shared', cat: 'Steuern' },
      { id: 'res-m365', name: 'Microsoft 365 Tenant', type: 'Cloud Service', model: 'SaaS Shared', cat: 'Office' },
      { id: 'res-ad', name: 'Active Directory (DC)', type: 'Infrastruktur', model: 'On-Premise', cat: 'Identity' },
      { id: 'res-ex', name: 'Exchange Online', type: 'Cloud Service', model: 'SaaS Shared', cat: 'E-Mail' },
      { id: 'res-sp', name: 'SharePoint Online', type: 'Cloud Service', model: 'SaaS Shared', cat: 'Intranet' },
      { id: 'res-teams', name: 'Microsoft Teams', type: 'Cloud Service', model: 'SaaS Shared', cat: 'Kollaboration' },
      { id: 'res-sql', name: 'MS SQL Cluster', type: 'Infrastruktur', model: 'On-Premise', cat: 'Datenbank' },
      { id: 'res-vmw', name: 'VMware vSphere', type: 'Infrastruktur', model: 'On-Premise', cat: 'Virtualisierung' },
      { id: 'res-veeam', name: 'Veeam Backup & Replication', type: 'Software', model: 'On-Premise', cat: 'Datensicherung' },
      { id: 'res-sophos', name: 'Sophos XGS Firewall', type: 'Hardware', model: 'On-Premise', cat: 'Netzwerksicherheit' },
      { id: 'res-s1', name: 'SentinelOne EDR', type: 'Software', model: 'SaaS Shared', cat: 'Endpoint Security' },
      { id: 'res-jsm', name: 'Jira Service Management', type: 'Software', model: 'SaaS Shared', cat: 'Ticketing' },
      { id: 'res-conf', name: 'Confluence Wiki', type: 'Software', model: 'SaaS Shared', cat: 'Wissensmanagement' },
      { id: 'res-sales', name: 'Salesforce CRM', type: 'Software', model: 'SaaS Shared', cat: 'Vertrieb' },
      { id: 'res-docu', name: 'DocuWare DMS', type: 'Software', model: 'Cloud', cat: 'Archivierung' },
      { id: 'res-elo', name: 'ELO Digital Office', type: 'Software', model: 'On-Premise', cat: 'DMS' },
      { id: 'res-planon', name: 'Planon Facility Mgmt', type: 'Software', model: 'SaaS Shared', cat: 'FM' },
      { id: 'res-techem', name: 'Techem Portal', type: 'Software', model: 'SaaS Shared', cat: 'Messdienst' },
      { id: 'res-brunata', name: 'Brunata Portal', type: 'Software', model: 'SaaS Shared', cat: 'Messdienst' },
      { id: 'res-ista', name: 'Ista Online', type: 'Software', model: 'SaaS Shared', cat: 'Messdienst' },
      { id: 'res-cisco', name: 'Cisco Core Switches', type: 'Hardware', model: 'On-Premise', cat: 'Netzwerk' },
      { id: 'res-hpe', name: 'HPE StoreOnce', type: 'Hardware', model: 'On-Premise', cat: 'Backup Hardware' },
      { id: 'res-forti', name: 'Fortinet VPN Gateway', type: 'Hardware', model: 'On-Premise', cat: 'Fernzugriff' },
      { id: 'res-azure', name: 'Azure Portal', type: 'Cloud Service', model: 'Cloud', cat: 'Cloud Management' },
      { id: 'res-aws', name: 'AWS Console', type: 'Cloud Service', model: 'Cloud', cat: 'Cloud Management' },
      { id: 'res-prtg', name: 'PRTG Network Monitor', type: 'Software', model: 'On-Premise', cat: 'Monitoring' },
      { id: 'res-graf', name: 'Grafana Dashboards', type: 'Software', model: 'Cloud', cat: 'Reporting' }
    ];

    for (const r of resourcesList) {
      await saveCollectionRecord('resources', r.id, {
        id: r.id, tenantId: t1Id, name: r.name, status: 'active', assetType: r.type, category: r.cat, operatingModel: r.model,
        criticality: 'medium', dataClassification: 'internal', confidentialityReq: 'medium', integrityReq: 'medium', availabilityReq: 'medium',
        hasPersonalData: true, isDataRepository: r.cat === 'Datenbank' || r.cat === 'ERP' || r.cat === 'DMS',
        backupRequired: true, updatesRequired: true, dataLocation: 'Region West', createdAt: offsetDate(30), url: 'https://app.local'
      }, dataSource);

      await saveCollectionRecord('entitlements', `e-${r.id}-user`, { id: `e-${r.id}-user`, resourceId: r.id, name: 'Standard User', riskLevel: 'low', isAdmin: false, tenantId: t1Id, externalMapping: `ACL_${r.id.toUpperCase()}_USER` }, dataSource);
      await saveCollectionRecord('entitlements', `e-${r.id}-admin`, { id: `e-${r.id}-admin`, resourceId: r.id, name: 'System Admin', riskLevel: 'high', isAdmin: true, tenantId: t1Id, externalMapping: `ACL_${r.id.toUpperCase()}_ADMIN` }, dataSource);
    }

    // --- 4. ROLLEN-BLUEPRINTS ---
    const jobsList = [
      { id: 'j-it-admin', deptId: 'd-it', name: 'IT-Systemadministrator', ents: ['e-res-ad-admin', 'e-res-sql-admin', 'e-res-vmw-admin', 'e-res-veeam-admin', 'e-res-azure-admin'] },
      { id: 'j-it-head', deptId: 'd-it', name: 'Leiter IT & Digitalisierung', ents: ['e-res-azure-admin', 'e-res-jsm-admin', 'e-res-graf-user'] },
      { id: 'j-immo-kfm', deptId: 'd-best', name: 'Immobilienkaufmann', ents: ['e-res-wodis-user', 'e-res-mareon-user', 'e-res-m365-user'] },
      { id: 'j-buchhalter', deptId: 'd-fibu', name: 'Finanzbuchhalter', ents: ['e-res-sap-user', 'e-res-datev-user', 'e-res-m365-user'] },
      { id: 'j-hr-ref', deptId: 'd-hr', name: 'Personalreferent', ents: ['e-res-sap-user', 'e-res-m365-user', 'e-res-docu-user'] },
      { id: 'j-tech-ref', deptId: 'd-tech', name: 'Technik / Bauleitung', ents: ['e-res-planon-user', 'e-res-mareon-user'] },
      { id: 'j-legal-dsb', deptId: 'd-legal', name: 'Datenschutzbeauftragter', ents: ['e-res-docu-user', 'e-res-conf-user', 'e-res-jsm-user'] },
      { id: 'j-gf', deptId: 'd-mgmt', name: 'Geschäftsführer', ents: ['e-res-sap-user', 'e-res-m365-user', 'e-res-graf-user'] }
    ];

    const rolePositionIdsByJob = new Map<string, string>();
    for (const j of jobsList) {
      const rolePositionId = `pos-role-${j.id}`;
      rolePositionIdsByJob.set(j.id, rolePositionId);

      await saveCollectionRecord('jobTitles', j.id, {
        id: j.id, tenantId: t1Id, departmentId: j.deptId, name: j.name, status: 'active', entitlementIds: j.ents, organizationalRoleIds: [rolePositionId]
      }, dataSource);

      const positionPayload: Position = {
        id: rolePositionId,
        tenantId: t1Id,
        name: `${j.name} (Org-Rolle)`,
        orgUnitId: j.deptId,
        jobTitleId: j.id,
        status: 'active',
      };
      await saveCollectionRecord('positions', rolePositionId, positionPayload, dataSource);

      if (j.ents.length > 0) {
        const assignmentId = `ea-pos-${j.id}`;
        const assignment: EntitlementAssignment = {
          id: assignmentId,
          tenantId: t1Id,
          subjectType: 'position',
          subjectId: rolePositionId,
          entitlementId: j.ents[0],
          status: 'active',
          assignmentSource: 'position',
          grantedBy: actorEmail,
          grantedAt: now,
        };
        await saveCollectionRecord('entitlementAssignments', assignmentId, assignment, dataSource);
      }

      for (const entitlementId of j.ents) {
        const assignmentId = `ea-jt-${j.id}-${entitlementId}`.substring(0, 64);
        const assignment: EntitlementAssignment = {
          id: assignmentId,
          tenantId: t1Id,
          subjectType: 'jobTitle',
          subjectId: j.id,
          entitlementId,
          status: 'active',
          assignmentSource: 'profile',
          grantedBy: actorEmail,
          grantedAt: now,
        };
        await saveCollectionRecord('entitlementAssignments', assignmentId, assignment, dataSource);
      }
    }

    const capabilitiesList: Capability[] = [
      { id: 'cap-marketing-assist', tenantId: t1Id, name: 'Marketing Assist', code: 'MKT_ASSIST', status: 'active' },
      { id: 'cap-network-admin', tenantId: t1Id, name: 'Network Operations', code: 'NET_OPS', status: 'active' },
    ];
    for (const capability of capabilitiesList) {
      await saveCollectionRecord('capabilities', capability.id, capability, dataSource);
    }

    const capabilityAssignments: EntitlementAssignment[] = [
      {
        id: 'ea-cap-marketing-assist',
        tenantId: t1Id,
        subjectType: 'capability',
        subjectId: 'cap-marketing-assist',
        entitlementId: 'e-res-sales-user',
        status: 'active',
        assignmentSource: 'function',
        grantedBy: actorEmail,
        grantedAt: now,
      },
      {
        id: 'ea-cap-network-admin',
        tenantId: t1Id,
        subjectType: 'capability',
        subjectId: 'cap-network-admin',
        entitlementId: 'e-res-cisco-admin',
        status: 'active',
        assignmentSource: 'function',
        grantedBy: actorEmail,
        grantedAt: now,
      },
    ];
    for (const assignment of capabilityAssignments) {
      await saveCollectionRecord('entitlementAssignments', assignment.id, assignment, dataSource);
    }

    // --- 5. BENUTZER & ASSIGNMENTS ---
    const usersList = [
      { id: 'u-01', name: 'Max Vorstand', email: 'm.vorstand@wohnbau.de', dept: 'Geschäftsführung', jobs: ['j-gf'] },
      { id: 'u-02', name: 'Erika IT-Leitung', email: 'e.it@wohnbau.de', dept: 'IT & Digitalisierung', jobs: ['j-it-head', 'j-it-admin'] },
      { id: 'u-03', name: 'Bernd Bestandsverwalter', email: 'b.best@wohnbau.de', dept: 'Bestandsmanagement', jobs: ['j-immo-kfm'] },
      { id: 'u-04', name: 'Sabine Service', email: 's.service@wohnbau.de', dept: 'Bestandsmanagement', jobs: ['j-immo-kfm'] },
      { id: 'u-05', name: 'Fritz Finanzler', email: 'f.fibu@wohnbau.de', dept: 'Finanzbuchhaltung', jobs: ['j-buchhalter'] },
      { id: 'u-06', name: 'Klaus Kontrolleur', email: 'k.kontr@wohnbau.de', dept: 'Finanzbuchhaltung', jobs: ['j-buchhalter'] },
      { id: 'u-07', name: 'Petra Personal', email: 'p.hr@wohnbau.de', dept: 'Personalwesen', jobs: ['j-hr-ref'] },
      { id: 'u-08', name: 'Hanna Human', email: 'h.hr@wohnbau.de', dept: 'Personalwesen', jobs: ['j-hr-ref'] },
      { id: 'u-09', name: 'Ingo It-Support', email: 'i.it@wohnbau.de', dept: 'IT & Digitalisierung', jobs: ['j-it-admin'] },
      { id: 'u-10', name: 'Stefan Security', email: 's.sec@wohnbau.de', dept: 'IT & Digitalisierung', jobs: ['j-it-admin'] },
      { id: 'u-11', name: 'Thomas Techniker', email: 't.tech@wohnbau.de', dept: 'Technik / Instandhaltung', jobs: ['j-tech-ref'] },
      { id: 'u-12', name: 'Mechthild Meisterin', email: 'm.meister@wohnbau.de', dept: 'Technik / Instandhaltung', jobs: ['j-tech-ref'] },
      { id: 'u-13', name: 'Robert Recht', email: 'r.recht@wohnbau.de', dept: 'Recht & Datenschutz', jobs: ['j-legal-dsb'] },
      { id: 'u-14', name: 'Dieter Datenschutz', email: 'd.dsb@wohnbau.de', dept: 'Recht & Datenschutz', jobs: ['j-legal-dsb'] },
      { id: 'u-15', name: 'Vera Vermieterin', email: 'v.verm@wohnbau.de', dept: 'Bestandsmanagement', jobs: ['j-immo-kfm'] }
    ];

    const deptNameToId = new Map(depts.map((dept) => [dept.name, dept.id]));

    for (const u of usersList) {
      await saveCollectionRecord('users', u.id, {
        id: u.id, tenantId: t1Id, externalId: `ad-${u.id}`, displayName: u.name, email: u.email, department: u.dept, enabled: true, status: 'active', authSource: 'ldap', lastSyncedAt: now, jobIds: u.jobs, adGroups: ['DOMAIN_USERS', 'VPN_ACCESS']
      }, dataSource);

      const orgUnitId = deptNameToId.get(u.dept);
      if (orgUnitId) {
        const userOrgUnitId = `uou-${u.id}-${orgUnitId}`;
        const link: UserOrgUnit = {
          id: userOrgUnitId,
          tenantId: t1Id,
          userId: u.id,
          orgUnitId,
          roleType: 'member',
          status: 'active',
          validFrom: now,
        };
        await saveCollectionRecord('userOrgUnits', userOrgUnitId, link, dataSource);
      }

      const primaryJobId = u.jobs[0];
      const rolePositionId = rolePositionIdsByJob.get(primaryJobId);
      if (rolePositionId) {
        const userPositionId = `up-${u.id}-${rolePositionId}`.substring(0, 64);
        const userPosition: UserPosition = {
          id: userPositionId,
          tenantId: t1Id,
          userId: u.id,
          positionId: rolePositionId,
          isPrimary: true,
          validFrom: today,
          status: 'active',
        };
        await saveCollectionRecord('userPositions', userPositionId, userPosition, dataSource);
      }

      if (u.id === 'u-15') {
        const marketingCapabilityLink: UserCapability = {
          id: `uc-${u.id}-marketing`,
          tenantId: t1Id,
          userId: u.id,
          capabilityId: 'cap-marketing-assist',
          validFrom: today,
          status: 'active',
          approvedBy: actorEmail,
          approvedAt: now,
        };
        await saveCollectionRecord('userCapabilities', marketingCapabilityLink.id, marketingCapabilityLink, dataSource);
      }

      for (const resId of ['res-m365', 'res-teams', 'res-jsm']) {
        const assId = `ass-demo-${u.id}-${resId}`;
        await saveCollectionRecord('assignments', assId, {
          id: assId, userId: u.id, entitlementId: `e-${resId}-user`, status: 'active', grantedBy: actorEmail, grantedAt: now, validFrom: today, tenantId: t1Id, syncSource: 'manual'
        }, dataSource);
      }
    }

    // --- 6. KOMPLEXE PROZESSE & MODELLE (25+ Stück) ---
    const processesData = [
      // Kernprozesse
      { id: 'proc-miete-01', type: 'pt-corp', title: 'Mietvertragsabschluss', dept: 'd-best', owner: 'j-immo-kfm' },
      { id: 'proc-credit-01', type: 'pt-corp', title: 'Bonitätsprüfung (VVT-Relevant)', dept: 'd-fibu', owner: 'j-buchhalter' },
      { id: 'proc-key-01', type: 'pt-corp', title: 'Wohnungsübergabe & Protokoll', dept: 'd-best', owner: 'j-immo-kfm' },
      { id: 'proc-abnahme-01', type: 'pt-corp', title: 'Wohnungsabnahme (Leaver-Prozess)', dept: 'd-best', owner: 'j-immo-kfm' },
      { id: 'proc-kuend-01', type: 'pt-corp', title: 'Kündigungsmanagement', dept: 'd-best', owner: 'j-immo-kfm' },
      { id: 'proc-mahn-01', type: 'pt-corp', title: 'Mahnwesen & Klageverfahren', dept: 'd-fibu', owner: 'j-buchhalter' },
      { id: 'proc-nk-01', type: 'pt-corp', title: 'Nebenkostenabrechnung (Jahr)', dept: 'd-fibu', owner: 'j-buchhalter' },
      { id: 'proc-modern-01', type: 'pt-corp', title: 'Modernisierungsvorhaben (CAPEX)', dept: 'd-tech', owner: 'j-tech-ref' },
      { id: 'proc-rep-01', type: 'pt-corp', title: 'Reparatur- & Instandhaltungsmanagement', dept: 'd-tech', owner: 'j-tech-ref' },
      { id: 'proc-handy-01', type: 'pt-corp', title: 'Handwerkersteuerung (Mareon)', dept: 'd-tech', owner: 'j-tech-ref' },
      { id: 'proc-pay-01', type: 'pt-corp', title: 'Kreditorenbuchhaltung & Freigabe', dept: 'd-fibu', owner: 'j-buchhalter' },
      { id: 'proc-hr-onb', type: 'pt-corp', title: 'Onboarding Mitarbeiter (IAM)', dept: 'd-hr', owner: 'j-hr-ref' },
      { id: 'proc-hr-off', type: 'pt-corp', title: 'Offboarding Mitarbeiter (IAM)', dept: 'd-hr', owner: 'j-hr-ref' },
      { id: 'proc-gremien-01', type: 'pt-corp', title: 'Vorstandssitzung & Beschlussfassung', dept: 'd-mgmt', owner: 'j-gf' },
      { id: 'proc-mv-01', type: 'pt-corp', title: 'Mitgliederversammlung (Genossenschaft)', dept: 'd-mgmt', owner: 'j-gf' },
      { id: 'proc-compl-01', type: 'pt-corp', title: 'Beschwerdemanagement Mieter', dept: 'd-best', owner: 'j-immo-kfm' },
      { id: 'proc-gewerbe-01', type: 'pt-corp', title: 'Gewerbevermietung', dept: 'd-best', owner: 'j-immo-kfm' },
      { id: 'proc-keys-mgmt', type: 'pt-corp', title: 'Schlüsselverwaltung (Zutritt)', dept: 'd-tech', owner: 'j-tech-ref' },
      { id: 'proc-ins-01', type: 'pt-corp', title: 'Versicherungsschadensabwicklung', dept: 'd-legal', owner: 'j-legal-dsb' },
      { id: 'proc-quart-01', type: 'pt-corp', title: 'Quartiersentwicklung & Planung', dept: 'd-mgmt', owner: 'j-gf' },
      
      // IT-Infrastruktur & Security
      { id: 'proc-patch-01', type: 'pt-update', title: 'IT Patch-Management', dept: 'd-it', owner: 'j-it-admin' },
      { id: 'proc-backup-01', type: 'pt-backup', title: 'Tägliche Datensicherung', dept: 'd-it', owner: 'j-it-admin' },
      
      // BCM / Notfallprozesse
      { id: 'proc-emg-cyber', type: 'pt-disaster', title: 'BCM: Cyber-Angriff (Ransomware)', dept: 'd-it', owner: 'j-it-head' },
      { id: 'proc-emg-wodis', type: 'pt-disaster', title: 'BCM: Totalausfall ERP (Wodis)', dept: 'd-it', owner: 'j-it-head' },
      { id: 'proc-emg-fire', type: 'pt-disaster', title: 'BCM: Brand in Hauptverwaltung', dept: 'd-mgmt', owner: 'j-gf' },
      { id: 'proc-emg-strom', type: 'pt-disaster', title: 'BCM: Stromausfall Quartier', dept: 'd-tech', owner: 'j-tech-ref' },
      { id: 'proc-emg-pipe', type: 'pt-disaster', title: 'BCM: Massiver Rohrbruch (Großschaden)', dept: 'd-tech', owner: 'j-tech-ref' }
    ];

    for (const p of processesData) {
      await saveCollectionRecord('processes', p.id, {
        id: p.id, tenantId: t1Id, title: p.title, status: 'published', process_type_id: p.type, 
        responsibleDepartmentId: p.dept, ownerRoleId: p.owner, currentVersion: 1, createdAt: now, updatedAt: now, 
        inputs: 'Vorgangsdaten', outputs: 'Prozess-Ergebnis', regulatoryFramework: 'ISO 9001 / MaRisk'
      }, dataSource);

      let nodes: ProcessNode[] = [];
      let edges: any[] = [];

      // Komplexes Modell für Mietvertragsabschluss
      if (p.id === 'proc-miete-01') {
        nodes = [
          { id: 'start', type: 'start', title: 'Start: Mietanfrage', checklist: [] },
          { id: 'step-1', type: 'step', title: 'Selbstauskunft sichten', description: 'Prüfung der Mieterangaben.', roleId: 'j-immo-kfm', resourceIds: ['res-m365'] },
          { id: 'dec-1', type: 'decision', title: 'Unterlagen vollständig?', description: 'Prüfung der eingereichten Dokumente.' },
          { id: 'sub-1', type: 'subprocess', title: 'Bonitätsprüfung', description: 'Delegation an Finanzbuchhaltung.', targetProcessId: 'proc-credit-01', roleId: 'j-immo-kfm' },
          { id: 'dec-2', type: 'decision', title: 'Bonität ok?', description: 'Entscheidung über Vertragsangebot.' },
          { id: 'step-2', type: 'step', title: 'Vertragserstellung', description: 'Anlage in Wodis Sigma ERP.', roleId: 'j-immo-kfm', resourceIds: ['res-wodis'] },
          { id: 'sub-2', type: 'subprocess', title: 'Wohnungsübergabe', description: 'Termin vor Ort.', targetProcessId: 'proc-key-01', roleId: 'j-immo-kfm' },
          { id: 'end-ok', type: 'end', title: 'Erfolg: Mietverhältnis aktiv', checklist: ['Vorgang archiviert'] },
          { id: 'end-fail', type: 'end', title: 'Abbruch: Ablehnung', checklist: ['Datenlöschung DSGVO prüfen'] }
        ];
        edges = [
          { id: 'e1', source: 'start', target: 'step-1' },
          { id: 'e2', source: 'step-1', target: 'dec-1' },
          { id: 'e3', source: 'dec-1', target: 'sub-1', label: 'Ja' },
          { id: 'e4', source: 'dec-1', target: 'step-1', label: 'Nein (Nachfordern)' },
          { id: 'e5', source: 'sub-1', target: 'dec-2' },
          { id: 'e6', source: 'dec-2', target: 'step-2', label: 'Ja' },
          { id: 'e7', source: 'dec-2', target: 'end-fail', label: 'Nein' },
          { id: 'e8', source: 'step-2', target: 'sub-2' },
          { id: 'e9', source: 'sub-2', target: 'end-ok' }
        ];
      } 
      // Komplexes Modell für Mahnwesen
      else if (p.id === 'proc-mahn-01') {
        nodes = [
          { id: 'start', type: 'start', title: 'Identifikation Außenstände', checklist: [] },
          { id: 'step-1', type: 'step', title: 'Zahlungserinnerung', description: 'Freundliche E-Mail via Outlook.', roleId: 'j-buchhalter', resourceIds: ['res-ex'] },
          { id: 'dec-1', type: 'decision', title: 'Zahlung erfolgt?' },
          { id: 'step-2', type: 'step', title: '1. Mahnung (Schriftlich)', description: 'Versand per Post.', roleId: 'j-buchhalter', resourceIds: ['res-wodis'] },
          { id: 'dec-2', type: 'decision', title: 'Zahlung erfolgt?' },
          { id: 'step-3', type: 'step', title: 'Klageverfahren einleiten', description: 'Übergabe an Rechtsabteilung.', roleId: 'j-legal-dsb', resourceIds: ['res-docu'] },
          { id: 'end', type: 'end', title: 'Vorgang abgeschlossen' }
        ];
        edges = [
          { id: 'e1', source: 'start', target: 'step-1' },
          { id: 'e2', source: 'step-1', target: 'dec-1' },
          { id: 'e3', source: 'dec-1', target: 'end', label: 'Ja' },
          { id: 'e4', source: 'dec-1', target: 'step-2', label: 'Nein' },
          { id: 'e5', source: 'step-2', target: 'dec-2' },
          { id: 'e6', source: 'dec-2', target: 'end', label: 'Ja' },
          { id: 'e7', source: 'dec-2', target: 'step-3', label: 'Nein' },
          { id: 'e8', source: 'step-3', target: 'end' }
        ];
      }
      else {
        nodes = [
          { id: 'start', type: 'start', title: 'Trigger: Ereignis', checklist: [] },
          { id: 'step-1', type: 'step', title: 'Bearbeitung', description: 'Durchführung der Aufgabe gemäß Standard.', roleId: p.owner, resourceIds: ['res-m365'] },
          { id: 'end', type: 'end', title: 'Abschluss: Dokumentation', checklist: ['Nachweis archiviert'] }
        ];
        edges = [{ id: 'e1', source: 'start', target: 'step-1' }, { id: 'e2', source: 'step-1', target: 'end' }];
      }

      const version: ProcessVersion = {
        id: `ver-${p.id}-1`, process_id: p.id, version: 1, revision: 1, created_by_user_id: 'system', created_at: now,
        model_json: { nodes, edges, roles: [], isoFields: {}, customFields: {} },
        layout_json: { positions: {} }
      };
      await saveCollectionRecord('process_versions', version.id, version, dataSource);
    }

    // --- 7. RISIKEN & TOMS ---
    const risksData = [
      { id: 'rk-01', title: 'Ransomware-Angriff auf ERP', cat: 'IT-Sicherheit', asset: 'res-wodis', score: 20 },
      { id: 'rk-02', title: 'Datenverlust bei SQL-Cluster Ausfall', cat: 'IT-Sicherheit', asset: 'res-sql', score: 15 },
      { id: 'rk-03', title: 'Phishing-Angriff auf GF', cat: 'IT-Sicherheit', asset: 'res-ex', score: 12 },
      { id: 'rk-04', title: 'Brand im Serverraum', cat: 'Betrieblich', asset: 'res-ad', score: 25 },
      { id: 'rk-05', title: 'Unbefugter Zugriff Mieterakte', cat: 'Datenschutz', asset: 'res-docu', score: 16 }
    ];

    for (const r of risksData) {
      await saveCollectionRecord('risks', r.id, {
        id: r.id, tenantId: t1Id, title: r.title, category: r.cat, impact: 5, probability: Math.ceil(r.score/5), 
        status: 'active', assetId: r.asset, owner: 'Erika IT-Leitung', createdAt: now, description: 'Szenario aus Risiko-Inventar.'
      }, dataSource);

      const measureId = `msr-${r.id}`;
      await saveCollectionRecord('riskMeasures', measureId, {
        id: measureId, riskIds: [r.id], resourceIds: [r.asset], title: `Schutzmaßnahme: ${r.title}`, 
        owner: 'Erika IT-Leitung', status: 'active', isTom: true, tomCategory: 'Verschlüsselung', dueDate: in30Days
      }, dataSource);

      await saveCollectionRecord('riskControls', `ctrl-${r.id}`, {
        id: `ctrl-${r.id}`, measureId: measureId, title: 'Prüfung der Wirksamkeit', 
        owner: 'Ingo It-Support', status: 'completed', isEffective: true, checkType: 'Review', lastCheckDate: today
      }, dataSource);
    }

    // --- 8. DATENMANAGEMENT & VVT ---
    const featuresList = [
      { id: 'f-mieter', name: 'Mieterstamm', purpose: 'Vertragsverwaltung', crit: 'high', dept: 'd-best' },
      { id: 'f-bank', name: 'Bankverbindungen', purpose: 'Mieteinzug', crit: 'high', dept: 'd-fibu' },
      { id: 'f-verbrauch', name: 'Verbrauchsdaten (Heizung)', purpose: 'Abrechnung', crit: 'medium', dept: 'd-tech' }
    ];
    for (const f of featuresList) {
      await saveCollectionRecord('features', f.id, {
        ...f, tenantId: t1Id, carrier: 'objekt', status: 'active', criticality: f.crit, criticalityScore: 5, isComplianceRelevant: true, createdAt: now, updatedAt: now, description: 'Kern-Datenobjekt.'
      } as any, dataSource);
    }

    await saveCollectionRecord('processingActivities', 'vvt-01', {
      id: 'vvt-01', tenantId: t1Id, name: 'Mietvertragsverwaltung', version: '1.0', description: 'Gesamtprozess der Mieterbetreuung.', 
      responsibleDepartment: 'Bestandsmanagement', legalBasis: 'Art. 6 Abs. 1 lit. b (Vertrag)', status: 'active', lastReviewDate: today,
      retentionPeriod: '10 Jahre', dataCategories: ['dc-stamm', 'dc-bank'], subjectCategories: ['dsg-mieter']
    } as any, dataSource);

    // --- 9. RICHTLINIEN & TASKS ---
    await saveCollectionRecord('policies', 'pol-01', {
      id: 'pol-01', tenantId: t1Id, title: 'IT-Sicherheitsleitlinie', type: 'ISK', status: 'published', ownerRoleId: 'j-it-head', currentVersion: 1, reviewInterval: 365, createdAt: now, updatedAt: now
    }, dataSource);

    for (let i = 1; i <= 8; i++) {
      const tid = `task-demo-${i}`;
      await saveCollectionRecord('tasks', tid, {
        id: tid, tenantId: t1Id, title: `Audit-Check: ${processesData[i].title}`, description: 'Bitte die Dokumentation auf Vollständigkeit prüfen.', 
        status: 'todo', priority: 'medium', assigneeId: 'puser-initial-admin', creatorId: 'system', 
        createdAt: now, updatedAt: now, dueDate: in30Days, entityType: 'process', entityId: processesData[i].id
      }, dataSource);
    }

    await logAuditEventAction(dataSource, {
      tenantId: t1Id, actorUid: actorEmail, action: 'Komplexes Wohnbau-Szenario mit 25+ verzweigten Prozessen und BCM-Plänen geladen.', entityType: 'system', entityId: 'seed-complex'
    });

    return { success: true, message: "Szenario 'Enterprise Genossenschaft' mit 25+ Prozessen, 30 Ressourcen und vollen GRC-Ketten geladen." };
  } catch (e: any) {
    console.error("Massive Seeding Error:", e);
    return { success: false, error: e.message };
  }
}
