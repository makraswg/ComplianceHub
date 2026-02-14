'use server';

import { saveCollectionRecord } from './mysql-actions';
import { DataSource, Risk, RiskMeasure, Process, ProcessingActivity, Resource, Feature, User, Assignment, JobTitle, ProcessNode, ProcessOperation, RiskControl, PlatformUser, DataSubjectGroup, DataCategory, ServicePartner, ServicePartnerContact, ServicePartnerArea, DataStore, Task, TaskComment, Policy, PolicyVersion, BackupJob, SyncJob, AssetTypeOption, OperatingModelOption, RegulatoryOption } from '@/lib/types';
import { logAuditEventAction } from './audit-actions';

/**
 * Generiert eine massive Menge an vernetzten Demo-Daten für eine Wohnungsbaugesellschaft.
 * Fokus: Maximale Konsistenz über alle Hubs hinweg (The Golden Chain).
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

    // --- 1. MANDANTEN ---
    const t1Id = 't-wohnbau-01';
    await saveCollectionRecord('tenants', t1Id, {
      id: t1Id, 
      name: 'Wohnbau Nord GmbH', 
      slug: 'wohnbau-nord', 
      status: 'active', 
      createdAt: offsetDate(60),
      companyDescription: 'Mittelständische Wohnungsbaugesellschaft mit ca. 5.000 Wohneinheiten. Fokus auf Mietverwaltung, Bestandsentwicklung und soziale Stadtentwicklung. IT-Strategie: Cloud-First mit ERP-Fokus auf Aareon Wodis Sigma.'
    }, dataSource);

    // --- 2. STAMMDATEN OPTIONEN ---
    const assetTypes = ['Software', 'Hardware', 'Cloud Service', 'Infrastruktur', 'Schnittstelle'];
    for (const name of assetTypes) {
      const id = `at-${name.toLowerCase().replace(/ /g, '-')}`;
      await saveCollectionRecord('asset_type_options', id, { id, name, enabled: true }, dataSource);
    }

    const opModels = ['On-Premise', 'SaaS Shared', 'SaaS Dedicated', 'Cloud', 'Managed Service'];
    for (const name of opModels) {
      const id = `om-${name.toLowerCase().replace(/ /g, '-')}`;
      await saveCollectionRecord('operating_model_options', id, { id, name, enabled: true }, dataSource);
    }

    const regOptions: RegulatoryOption[] = [
      { id: 'reg-iso27001', name: 'ISO 27001', description: 'Informationssicherheits-Managementsystem', enabled: true },
      { id: 'reg-dsgvo', name: 'DSGVO', description: 'Datenschutz-Grundverordnung', enabled: true },
      { id: 'reg-bsi', name: 'BSI IT-Grundschutz', description: 'Standard des Bundesamts für Sicherheit in der Informationstechnik', enabled: true }
    ];
    for (const opt of regOptions) await saveCollectionRecord('regulatory_options', opt.id, opt, dataSource);

    // --- 3. ABTEILUNGEN ---
    const departmentsData = [
      { id: 'd-mgmt', tenantId: t1Id, name: 'Geschäftsführung' },
      { id: 'd-best', tenantId: t1Id, name: 'Bestandsmanagement' },
      { id: 'd-fibu', tenantId: t1Id, name: 'Finanzbuchhaltung' },
      { id: 'd-it', tenantId: t1Id, name: 'IT & Digitalisierung' },
      { id: 'd-hr', tenantId: t1Id, name: 'Personalwesen' },
      { id: 'd-tech', tenantId: t1Id, name: 'Technik / Instandhaltung' },
      { id: 'd-legal', tenantId: t1Id, name: 'Recht & Datenschutz' }
    ];
    for (const d of departmentsData) await saveCollectionRecord('departments', d.id, { ...d, status: 'active' }, dataSource);

    // --- 4. DSGVO STAMMDATEN ---
    const subjectGroups: DataSubjectGroup[] = [
      { id: 'dsg-mieter', name: 'Mieter', tenantId: t1Id, status: 'active' },
      { id: 'dsg-mitarbeiter', name: 'Mitarbeiter', tenantId: t1Id, status: 'active' },
      { id: 'dsg-handwerker', name: 'Handwerker / Dienstleister', tenantId: t1Id, status: 'active' }
    ];
    for (const g of subjectGroups) await saveCollectionRecord('dataSubjectGroups', g.id, g, dataSource);

    const dataCategories: DataCategory[] = [
      { id: 'dcat-stamm', name: 'Identifikationsdaten / Stammdaten', tenantId: t1Id, status: 'active', isGdprRelevant: true },
      { id: 'dcat-bank', name: 'Bankverbindungen / Zahlungsdaten', tenantId: t1Id, status: 'active', isGdprRelevant: true },
      { id: 'dcat-verbrauch', name: 'Verbrauchs- und Abrechnungsdaten', tenantId: t1Id, status: 'active', isGdprRelevant: true }
    ];
    for (const c of dataCategories) await saveCollectionRecord('dataCategories', c.id, c, dataSource);

    // --- 5. DATENOBJEKTE (FEATURES) ---
    const featuresData = [
      { id: 'feat-mieter-stamm', name: 'Mieter-Stammdaten', carrier: 'objekt', description: 'Name, Anschrift, Geburtsdatum des Mieters.', purpose: 'Mietvertragsdurchführung', deptId: 'd-best', criticality: 'medium', matrixLegal: true },
      { id: 'feat-mieter-bank', name: 'Bankverbindung Mieter', carrier: 'mietvertrag', description: 'IBAN, BIC für Lastschrifteinzug.', purpose: 'Zahlungsverkehr', deptId: 'd-fibu', criticality: 'high', matrixFinancial: true, matrixLegal: true },
      { id: 'feat-personal-stamm', name: 'Personalakte', carrier: 'verwaltungseinheit', description: 'Alle Daten zum Arbeitsverhältnis.', purpose: 'Personalverwaltung', deptId: 'd-hr', criticality: 'high', matrixLegal: true, matrixExternal: true }
    ];
    for (const f of featuresData) {
      await saveCollectionRecord('features', f.id, { 
        ...f, tenantId: t1Id, status: 'active', createdAt: now, updatedAt: now, 
        confidentialityReq: f.criticality, integrityReq: f.criticality, availabilityReq: f.criticality,
        isComplianceRelevant: true, hasPersonalData: true
      }, dataSource);
    }

    // --- 6. SERVICE PARTNER ---
    const partnerId = 'sp-aareon';
    await saveCollectionRecord('service_partners', partnerId, {
      id: partnerId, tenantId: t1Id, name: 'Aareon Deutschland GmbH', industry: 'Software / ERP', website: 'https://www.aareon.de', status: 'active', createdAt: offsetDate(100)
    }, dataSource);

    // --- 7. RESSOURCEN ---
    const resourcesData = [
      { id: 'res-wodis', name: 'Aareon Wodis Sigma', assetType: 'Software', operatingModel: 'SaaS Shared', criticality: 'high', isDataRepository: true, backupRequired: true, updatesRequired: true },
      { id: 'res-ad', name: 'Active Directory', assetType: 'Infrastruktur', operatingModel: 'On-Premise', criticality: 'high', isIdentityProvider: true, backupRequired: true, updatesRequired: true },
      { id: 'res-sql-cluster', name: 'MS SQL Cluster', assetType: 'Infrastruktur', operatingModel: 'On-Premise', criticality: 'high', isDataRepository: true, backupRequired: true, updatesRequired: true }
    ];

    for (const r of resourcesData) {
      await saveCollectionRecord('resources', r.id, { 
        ...r, tenantId: t1Id, status: 'active', createdAt: offsetDate(45), 
        confidentialityReq: r.criticality, integrityReq: r.criticality, availabilityReq: r.criticality,
        hasPersonalData: true, dataLocation: 'RZ Hamburg', externalOwnerPartnerId: partnerId
      }, dataSource);
    }

    // --- 8. BACKUP JOBS (ITSecHub) ---
    const backupJobs: Partial<BackupJob>[] = [
      { id: 'bj-wodis-daily', name: 'Tägliche ERP Sicherung', resourceId: 'res-wodis', cycle: 'Täglich', storage_location: 'Aareon Cloud Vault', status: 'active' as any, responsible_type: 'external' },
      { id: 'bj-sql-hourly', name: 'SQL Transaktions-Log Backup', resourceId: 'res-sql-cluster', cycle: 'Benutzerdefiniert', custom_cycle: 'Alle 60 Minuten', storage_location: 'Lokales NAS / Tape', status: 'active' as any, responsible_type: 'internal' }
    ];
    for (const bj of backupJobs) await saveCollectionRecord('backup_jobs', bj.id!, { ...bj, createdAt: now, updatedAt: now }, dataSource);

    // --- 9. SYSTEMROLLEN (ENTITLEMENTS) ---
    const entitlementsData = [
      { id: 'e-wodis-user', resourceId: 'res-wodis', name: 'Standard-Anwender', riskLevel: 'low', isAdmin: false, externalMapping: 'WODIS_USER' },
      { id: 'e-wodis-admin', resourceId: 'res-wodis', name: 'ERP Key-User', riskLevel: 'high', isAdmin: true, externalMapping: 'WODIS_ADMIN' },
      { id: 'e-ad-user', resourceId: 'res-ad', name: 'Domain User', riskLevel: 'low', isAdmin: false, externalMapping: 'DOMAIN_USER' }
    ];
    for (const e of entitlementsData) await saveCollectionRecord('entitlements', e.id, { ...e, tenantId: t1Id }, dataSource);

    // --- 10. STELLEN-BLUEPRINTS (RBAC) ---
    const jobsData = [
      { id: 'j-immo-kfm', departmentId: 'd-best', name: 'Immobilienkaufmann', ents: ['e-wodis-user', 'e-ad-user'] },
      { id: 'j-it-admin', departmentId: 'd-it', name: 'Systemadministrator', ents: ['e-wodis-admin', 'e-ad-user'] }
    ];
    for (const j of jobsData) {
      await saveCollectionRecord('jobTitles', j.id, { id: j.id, tenantId: t1Id, departmentId: j.departmentId, name: j.name, status: 'active', entitlementIds: j.ents }, dataSource);
    }

    // --- 11. BENUTZER ---
    const userId = 'u-demo-max';
    await saveCollectionRecord('users', userId, {
      id: userId, tenantId: t1Id, displayName: 'Max Mustermann', email: 'max.m@wohnbau.de', department: 'Bestandsmanagement', jobIds: ['j-immo-kfm'], enabled: true, status: 'active', authSource: 'ldap', lastSyncedAt: now
    }, dataSource);

    // --- 12. PROZESSE ---
    const procId = 'p-rental';
    await saveCollectionRecord('processes', procId, {
      id: procId, tenantId: t1Id, title: 'Mietvertragsabschluss', status: 'published', process_type_id: 'pt-corp', currentVersion: 1, responsibleDepartmentId: 'd-best', vvtId: 'vvt-01', createdAt: now
    }, dataSource);

    const nodes = [
      { id: 'start', type: 'start', title: 'Start', description: 'Antrag geht ein' },
      { id: 'step1', type: 'step', title: 'Stammdaten pflegen', roleId: 'j-immo-kfm', resourceIds: ['res-wodis'], featureIds: ['feat-mieter-stamm'] },
      { id: 'end', type: 'end', title: 'Vertrag aktiv' }
    ];
    await saveCollectionRecord('process_versions', `ver-${procId}-1`, {
      id: `ver-${procId}-1`, process_id: procId, version: 1, revision: 1, created_at: now,
      model_json: { nodes, edges: [{id:'e1',source:'start',target:'step1'},{id:'e2',source:'step1',target:'end'}] },
      layout_json: { positions: { start: {x:50,y:100}, step1: {x:250,y:100}, end: {x:500,y:100} } }
    }, dataSource);

    // --- 13. VERARBEITUNGSTÄTIGKEITEN (VVT) ---
    const vvtId = 'vvt-01';
    await saveCollectionRecord('processingActivities', vvtId, {
      id: vvtId, tenantId: t1Id, name: 'Mietvertragsverwaltung', description: 'Verarbeitung von Mieterdaten zur Durchführung des Mietverhältnisses.', status: 'active', version: '1.0', legalBasis: 'Art. 6 Abs. 1 lit. b', responsibleDepartment: 'Bestandsmanagement', retentionPeriod: '10 Jahre nach Auszug', lastReviewDate: today
    }, dataSource);

    // --- 14. RICHTLINIEN (POLICIES) ---
    const polId = 'pol-it-sec';
    await saveCollectionRecord('policies', polId, {
      id: polId, tenantId: t1Id, title: 'IT-Sicherheitsleitlinie', type: 'ISK', status: 'published', currentVersion: 1, ownerRoleId: 'j-it-admin', createdAt: now, updatedAt: now
    }, dataSource);

    await saveCollectionRecord('policy_versions', `pv-${polId}-1-0`, {
      id: `pv-${polId}-1-0`, policyId: polId, version: 1, revision: 0, content: '<h1>IT-Sicherheitsleitlinie</h1><p>Diese Richtlinie definiert die Grundsätze für den sicheren Betrieb der IT-Systeme der Wohnbau Nord GmbH.</p>', changelog: 'Initialversion', validFrom: today, createdBy: actorEmail, createdAt: now
    }, dataSource);

    // --- 15. RISIKEN & KONTROLLEN ---
    const riskId = 'rk-data-loss';
    await saveCollectionRecord('risks', riskId, {
      id: riskId, tenantId: t1Id, title: 'Datenverlust im ERP-System', category: 'IT-Sicherheit', impact: 5, probability: 2, status: 'active', assetId: 'res-wodis', description: 'Verlust von Mieterdaten durch technisches Versagen.', createdAt: now
    }, dataSource);

    const measureId = 'msr-backup-sql';
    await saveCollectionRecord('riskMeasures', measureId, {
      id: measureId, riskIds: [riskId], title: 'Regelmäßige SQL-Backups', owner: 'IT-Leitung', status: 'active', isTom: true, tomCategory: 'Verfügbarkeitskontrolle', dueDate: in30Days
    }, dataSource);

    await saveCollectionRecord('riskControls', 'ctrl-01', {
      id: 'ctrl-01', measureId: measureId, title: 'Täglicher Backup-Check', owner: 'Systemadministrator', status: 'completed', isEffective: true, checkType: 'Review', lastCheckDate: today, nextCheckDate: in30Days, evidenceDetails: 'Log-Review vom Morgen erfolgreich.'
    }, dataSource);

    // --- 16. KI AUDIT KRITERIEN ---
    const criteria = [
      { id: 'crit-sod', title: 'Funktionstrennung (SoD)', description: 'Niemand darf gleichzeitig Buchhalter und IT-Admin sein.', severity: 'critical', enabled: true },
      { id: 'crit-admin', title: 'Überprivilegierung', description: 'Benutzer im Bestandsmanagement dürfen keine Admin-Rechte haben.', severity: 'high', enabled: true }
    ];
    for (const c of criteria) await saveCollectionRecord('aiAuditCriteria', c.id, c, dataSource);

    // --- 17. TASKS ---
    await saveCollectionRecord('tasks', 'task-01', {
      id: 'task-01', tenantId: t1Id, title: 'Backup-Audit Q1', status: 'todo', priority: 'high', assigneeId: 'puser-initial-admin', createdAt: now, updatedAt: now, description: 'Bitte die Sicherungsprotokolle für Wodis prüfen.'
    }, dataSource);

    await logAuditEventAction(dataSource, {
      tenantId: 'global', actorUid: actorEmail, action: 'Vollständiger Demo-Daten-Import (Enterprise-Scope) abgeschlossen.', entityType: 'system', entityId: 'seed-full'
    });

    return { success: true, message: "Vollständig vernetztes Enterprise-Szenario geladen." };
  } catch (e: any) {
    console.error("Seeding Error:", e);
    return { success: false, error: e.message };
  }
}
