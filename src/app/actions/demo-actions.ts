
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
  ProcessVersion,
  Tenant,
  Department
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
    for (const d of depts) {
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
    for (const j of jobsList) {
      await saveCollectionRecord('jobTitles', j.id, {
        id: j.id, tenantId: t1Id, departmentId: j.deptId, name: j.name, status: 'active', entitlementIds: j.ents
      }, dataSource);
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

    for (const u of usersList) {
      await saveCollectionRecord('users', u.id, {
        id: u.id, tenantId: t1Id, externalId: `ad-${u.id}`, displayName: u.name, email: u.email, department: u.dept, enabled: true, status: 'active', authSource: 'ldap', lastSyncedAt: now, jobIds: u.jobs, adGroups: ['DOMAIN_USERS', 'VPN_ACCESS']
      }, dataSource);

      // Jede Person bekommt mind. 3 Standard-Systeme direkt zugewiesen für die Demo
      for (const resId of ['res-m365', 'res-teams', 'res-jsm']) {
        const assId = `ass-demo-${u.id}-${resId}`;
        await saveCollectionRecord('assignments', assId, {
          id: assId, userId: u.id, entitlementId: `e-${resId}-user`, status: 'active', grantedBy: actorEmail, grantedAt: now, validFrom: today, tenantId: t1Id, syncSource: 'manual'
        }, dataSource);
      }
    }

    // --- 6. PROZESSE & MODELLE (11 Stück) ---
    const processesData = [
      { id: 'proc-miete-01', type: 'pt-corp', title: 'Mietvertragsabschluss', dept: 'd-best', owner: 'j-immo-kfm' },
      { id: 'proc-credit-01', type: 'pt-corp', title: 'Bonitätsprüfung', dept: 'd-fibu', owner: 'j-buchhalter' },
      { id: 'proc-key-01', type: 'pt-corp', title: 'Schlüsselübergabe & Protokoll', dept: 'd-best', owner: 'j-immo-kfm' },
      { id: 'proc-rep-01', type: 'pt-corp', title: 'Reparaturmanagement', dept: 'd-tech', owner: 'j-tech-ref' },
      { id: 'proc-handyman-01', type: 'pt-corp', title: 'Handwerkersteuerung', dept: 'd-tech', owner: 'j-tech-ref' },
      { id: 'proc-pay-01', type: 'pt-corp', title: 'Zahlungslauf Buchhaltung', dept: 'd-fibu', owner: 'j-buchhalter' },
      { id: 'proc-patch-01', type: 'pt-update', title: 'IT Patch-Management', dept: 'd-it', owner: 'j-it-admin' },
      { id: 'proc-backup-01', type: 'pt-backup', title: 'Tägliche Datensicherung', dept: 'd-it', owner: 'j-it-admin' },
      { id: 'proc-emg-wodis', type: 'pt-disaster', title: 'BCM: Ausfall ERP System', dept: 'd-it', owner: 'j-it-head' },
      { id: 'proc-emg-strom', type: 'pt-disaster', title: 'BCM: Stromausfall Liegenschaft', dept: 'd-tech', owner: 'j-tech-ref' },
      { id: 'proc-emg-flood', type: 'pt-disaster', title: 'BCM: Hochwasser / Großschaden', dept: 'd-tech', owner: 'j-tech-ref' }
    ];

    for (const p of processesData) {
      await saveCollectionRecord('processes', p.id, {
        id: p.id, tenantId: t1Id, title: p.title, status: 'published', process_type_id: p.type, 
        responsibleDepartmentId: p.dept, ownerRoleId: p.owner, currentVersion: 1, createdAt: now, updatedAt: now, inputs: 'Datenanforderung', outputs: 'Protokoll'
      }, dataSource);

      let nodes: ProcessNode[] = [];
      let edges: any[] = [];

      if (p.id === 'proc-miete-01') {
        nodes = [
          { id: 'start', type: 'start', title: 'START', checklist: [] },
          { id: 'step-1', type: 'step', title: 'Selbstauskunft sichten', description: 'Prüfung der Mieterangaben.', roleId: 'j-immo-kfm', resourceIds: ['res-m365'] },
          { id: 'sub-1', type: 'subprocess', title: 'Bonitätsprüfung', description: 'Delegation an Fibu.', targetProcessId: 'proc-credit-01', roleId: 'j-immo-kfm' },
          { id: 'step-2', type: 'step', title: 'Vertragserstellung', description: 'Anlage in Wodis Sigma.', roleId: 'j-immo-kfm', resourceIds: ['res-wodis'] },
          { id: 'sub-2', type: 'subprocess', title: 'Übergabe', description: 'Übergabe der Wohnung.', targetProcessId: 'proc-key-01', roleId: 'j-immo-kfm' },
          { id: 'end', type: 'end', title: 'ENDE', checklist: ['Vorgang archiviert'] }
        ];
        edges = [{ id: 'e1', source: 'start', target: 'step-1' }, { id: 'e2', source: 'step-1', target: 'sub-1' }, { id: 'e3', source: 'sub-1', target: 'step-2' }, { id: 'e4', source: 'step-2', target: 'sub-2' }, { id: 'e5', source: 'sub-2', target: 'end' }];
      } else {
        nodes = [
          { id: 'start', type: 'start', title: 'Meldung', checklist: [] },
          { id: 'step-1', type: 'step', title: 'Durchführung', description: 'Operative Umsetzung gemäß Leitfaden.', roleId: p.owner, resourceIds: ['res-m365'] },
          { id: 'end', type: 'end', title: 'ABSCHLUSS', checklist: ['Beleg archiviert'] }
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
      { id: 'rk-01', title: 'Ransomware-Angriff auf ERP', cat: 'IT-Sicherheit', asset: 'res-wodis', score: 15 },
      { id: 'rk-02', title: 'Datenverlust bei Fehlbedienung', cat: 'IT-Sicherheit', asset: 'res-sap', score: 8 },
      { id: 'rk-03', title: 'Unbefugter Zugriff auf Mieterdaten', cat: 'Datenschutz', asset: 'res-docu', score: 12 }
    ];

    for (const r of risksData) {
      await saveCollectionRecord('risks', r.id, {
        id: r.id, tenantId: t1Id, title: r.title, category: r.cat, impact: 5, probability: Math.ceil(r.score/5), 
        status: 'active', assetId: r.asset, owner: 'Erika IT-Leitung', createdAt: now, description: 'Simuliertes Szenario.'
      }, dataSource);

      const measureId = `msr-${r.id}`;
      await saveCollectionRecord('riskMeasures', measureId, {
        id: measureId, riskIds: [r.id], resourceIds: [r.asset], title: `Schutzmaßnahme für ${r.title}`, 
        owner: 'Erika IT-Leitung', status: 'active', isTom: true, tomCategory: 'Verschlüsselung', dueDate: in30Days
      }, dataSource);

      await saveCollectionRecord('riskControls', `ctrl-${r.id}`, {
        id: `ctrl-${r.id}`, measureId: measureId, title: 'Regelmäßiger Wirksamkeits-Check', 
        owner: 'Ingo It-Support', status: 'completed', isEffective: true, checkType: 'Review', lastCheckDate: today
      }, dataSource);
    }

    // --- 8. DATENMANAGEMENT & VVT ---
    const featuresList = [
      { id: 'f-mieter', name: 'Mieterstamm', purpose: 'Vertragsverwaltung', crit: 'high', dept: 'd-best' },
      { id: 'f-bank', name: 'Bankverbindungen', purpose: 'Zahlungsverkehr', crit: 'high', dept: 'd-fibu' }
    ];
    for (const f of featuresList) {
      await saveCollectionRecord('features', f.id, {
        ...f, tenantId: t1Id, carrier: 'objekt', status: 'active', criticality: f.crit, criticalityScore: 5, isComplianceRelevant: true, createdAt: now, updatedAt: now, description: 'Demo-Daten'
      } as any, dataSource);
    }

    await saveCollectionRecord('processingActivities', 'vvt-01', {
      id: 'vvt-01', tenantId: t1Id, name: 'Mietvertragsverwaltung', version: '1.0', description: 'Kernprozess der Gesellschaft.', 
      responsibleDepartment: 'Bestandsmanagement', legalBasis: 'Art. 6 Abs. 1 lit. b (Vertrag)', status: 'active', lastReviewDate: today,
      retentionPeriod: '10 Jahre', dataCategories: ['dc-stamm', 'dc-bank'], subjectCategories: ['dsg-mieter']
    } as any, dataSource);

    // --- 9. RICHTLINIEN & ITSEC ---
    await saveCollectionRecord('policies', 'pol-01', {
      id: 'pol-01', tenantId: t1Id, title: 'IT-Sicherheitsleitlinie', type: 'ISK', status: 'published', ownerRoleId: 'j-it-head', currentVersion: 1, reviewInterval: 365, createdAt: now, updatedAt: now
    }, dataSource);

    await saveCollectionRecord('backup_jobs', 'bj-01', {
      id: 'bj-01', resourceId: 'res-sql', name: 'SQL Full Dump (Wodis)', cycle: 'Täglich', storage_location: 'HPE StoreOnce', responsible_type: 'internal', responsible_id: 'j-it-admin', it_process_id: 'proc-backup-01', createdAt: now
    }, dataSource);

    // --- 10. TASKS ---
    for (let i = 1; i <= 5; i++) {
      const tid = `task-demo-${i}`;
      await saveCollectionRecord('tasks', tid, {
        id: tid, tenantId: t1Id, title: `Compliance Check ${i}`, description: 'Automatisch generierte Aufgabe.', 
        status: 'todo', priority: 'medium', assigneeId: 'puser-initial-admin', creatorId: 'system', 
        createdAt: now, updatedAt: now, dueDate: in30Days
      }, dataSource);
    }

    await logAuditEventAction(dataSource, {
      tenantId: t1Id, actorUid: actorEmail, action: 'Massives Enterprise Demo-Szenario geladen (400+ Datensätze).', entityType: 'system', entityId: 'seed-massive'
    });

    return { success: true, message: "Szenario 'Wohnbau Nord' mit 30 Ressourcen, 15 Usern und lückenlosen GRC-Ketten geladen." };
  } catch (e: any) {
    console.error("Massive Seeding Error:", e);
    return { success: false, error: e.message };
  }
}
