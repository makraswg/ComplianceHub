'use server';

import { saveCollectionRecord } from './mysql-actions';
import { DataSource, Risk, RiskMeasure, Process, ProcessingActivity, Resource, Feature, User, Assignment, JobTitle, ProcessNode, ProcessOperation, RiskControl, PlatformUser, DataSubjectGroup, DataCategory, ServicePartner, ServicePartnerContact, ServicePartnerArea, DataStore, Task, TaskComment } from '@/lib/types';
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

    // --- 2. ABTEILUNGEN ---
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

    // --- 3. DSGVO STAMMDATEN ---
    const subjectGroups: DataSubjectGroup[] = [
      { id: 'dsg-mieter', name: 'Mieter', tenantId: t1Id, status: 'active' },
      { id: 'dsg-interessent', name: 'Mietinteressenten', tenantId: t1Id, status: 'active' },
      { id: 'dsg-mitarbeiter', name: 'Mitarbeiter', tenantId: t1Id, status: 'active' },
      { id: 'dsg-handwerker', name: 'Handwerker / Dienstleister', tenantId: t1Id, status: 'active' }
    ];
    for (const g of subjectGroups) await saveCollectionRecord('dataSubjectGroups', g.id, g, dataSource);

    const dataCategories: DataCategory[] = [
      { id: 'dcat-stamm', name: 'Identifikationsdaten / Stammdaten', tenantId: t1Id, status: 'active', isGdprRelevant: true },
      { id: 'dcat-bank', name: 'Bankverbindungen / Zahlungsdaten', tenantId: t1Id, status: 'active', isGdprRelevant: true },
      { id: 'dcat-bonitaet', name: 'Bonitätsdaten (Schufa / Crefo)', tenantId: t1Id, status: 'active', isGdprRelevant: true },
      { id: 'dcat-verbrauch', name: 'Verbrauchs- und Abrechnungsdaten', tenantId: t1Id, status: 'active', isGdprRelevant: true },
      { id: 'dcat-bewerbung', name: 'Bewerberdaten (HR)', tenantId: t1Id, status: 'active', isGdprRelevant: true }
    ];
    for (const c of dataCategories) await saveCollectionRecord('dataCategories', c.id, c, dataSource);

    // --- 4. SERVICE PARTNER & KONTAKTE ---
    const partnerId = 'sp-aareon';
    await saveCollectionRecord('servicePartners', partnerId, {
      id: partnerId, tenantId: t1Id, name: 'Aareon Deutschland GmbH', industry: 'Software / ERP', website: 'https://www.aareon.de', status: 'active', createdAt: offsetDate(100)
    }, dataSource);

    const contactId = 'spc-aareon-support';
    await saveCollectionRecord('servicePartnerContacts', contactId, {
      id: contactId, partnerId, name: 'Support Team Wodis', email: 'support@aareon.de', phone: '+49 6131 301-0', role: 'Enterprise Support'
    }, dataSource);

    const partnerTechId = 'sp-elektro-nord';
    await saveCollectionRecord('servicePartners', partnerTechId, {
      id: partnerTechId, tenantId: t1Id, name: 'Elektro-Technik Nord GmbH', industry: 'Handwerk / Technik', website: 'https://www.elektro-nord.local', status: 'active', createdAt: offsetDate(200)
    }, dataSource);

    await saveCollectionRecord('servicePartnerAreas', 'spa-erp', {
      id: 'spa-erp', partnerId, name: 'ERP Betrieb', description: 'Hosting und Support für Wodis Sigma.'
    }, dataSource);

    // --- 5. RESSOURCEN & DATA STORES ---
    const resourcesData = [
      { id: 'res-wodis', name: 'Aareon Wodis Sigma', assetType: 'Software', operatingModel: 'SaaS Shared', criticality: 'high', isDataRepository: true, backupRequired: true, updatesRequired: true },
      { id: 'res-archiv', name: 'Aareon Archiv Kompakt', assetType: 'Software', operatingModel: 'SaaS Shared', criticality: 'high', isDataRepository: true, backupRequired: true },
      { id: 'res-m365', name: 'Microsoft 365', assetType: 'Cloud Service', operatingModel: 'Cloud', criticality: 'medium', isIdentityProvider: true },
      { id: 'res-ad', name: 'Active Directory', assetType: 'Infrastruktur', operatingModel: 'On-Premise', criticality: 'high', isIdentityProvider: true, backupRequired: true, updatesRequired: true },
      { id: 'res-mareon', name: 'Mareon Handwerkerportal', assetType: 'Software', operatingModel: 'SaaS Shared', criticality: 'medium', isDataRepository: false },
      { id: 'res-sql-cluster', name: 'MS SQL Cluster (Local)', assetType: 'Infrastruktur', operatingModel: 'On-Premise', criticality: 'high', isDataRepository: true, backupRequired: true, updatesRequired: true }
    ];

    for (const r of resourcesData) {
      await saveCollectionRecord('resources', r.id, { 
        ...r, tenantId: t1Id, status: 'active', createdAt: offsetDate(45), 
        confidentialityReq: r.criticality, integrityReq: r.criticality, availabilityReq: r.criticality,
        dataClassification: r.criticality === 'high' ? 'confidential' : 'internal',
        hasPersonalData: true, 
        dataLocation: r.operatingModel === 'On-Premise' ? 'RZ Hamburg' : 'Azure West Europe',
        externalOwnerPartnerId: r.operatingModel.includes('SaaS') ? partnerId : undefined,
        externalOwnerContactId: r.operatingModel.includes('SaaS') ? contactId : undefined
      }, dataSource);

      if (r.isDataRepository) {
        const dsId = `ds-repo-${r.id}`;
        await saveCollectionRecord('dataStores', dsId, {
          id: dsId, tenantId: t1Id, name: `Repository: ${r.name}`, description: 'Zentraler Datenbestand.', status: 'active'
        }, dataSource);
      }
    }

    // --- 6. SYSTEMROLLEN (ENTITLEMENTS) ---
    const entitlementsData = [
      { id: 'e-wodis-user', resourceId: 'res-wodis', name: 'Standard-Anwender', riskLevel: 'low', isAdmin: false, externalMapping: 'WODIS_USER' },
      { id: 'e-wodis-admin', resourceId: 'res-wodis', name: 'Key-User / Admin', riskLevel: 'high', isAdmin: true, externalMapping: 'WODIS_ADMIN' },
      { id: 'e-archiv-read', resourceId: 'res-archiv', name: 'Archiv-Leser', riskLevel: 'low', isAdmin: false, externalMapping: 'ARCHIV_READ' },
      { id: 'e-m365-user', resourceId: 'res-m365', name: 'Office Standard', riskLevel: 'low', isAdmin: false, externalMapping: 'M365_USER' },
      { id: 'e-ad-user', resourceId: 'res-ad', name: 'Domain User', riskLevel: 'low', isAdmin: false, externalMapping: 'DOMAIN_USER' },
      { id: 'e-mareon-tech', resourceId: 'res-mareon', name: 'Technik-Sachbearbeiter', riskLevel: 'medium', isAdmin: false, externalMapping: 'MAREON_TECH' }
    ];
    for (const e of entitlementsData) await saveCollectionRecord('entitlements', e.id, { ...e, tenantId: t1Id }, dataSource);

    // --- 7. STELLEN-BLUEPRINTS (RBAC) ---
    const jobsData = [
      { id: 'j-immo-kfm', departmentId: 'd-best', name: 'Immobilienkaufmann', ents: ['e-wodis-user', 'e-archiv-read', 'e-m365-user', 'e-ad-user'] },
      { id: 'j-it-admin', departmentId: 'd-it', name: 'Systemadministrator', ents: ['e-wodis-admin', 'e-m365-user', 'e-ad-user'] },
      { id: 'j-tech-ref', departmentId: 'd-tech', name: 'Technischer Referent', ents: ['e-mareon-tech', 'e-m365-user', 'e-ad-user'] },
      { id: 'j-ds-officer', departmentId: 'd-legal', name: 'Datenschutzbeauftragter', ents: ['e-m365-user', 'e-ad-user'] }
    ];
    for (const j of jobsData) {
      await saveCollectionRecord('jobTitles', j.id, { 
        id: j.id, tenantId: t1Id, departmentId: j.departmentId, name: j.name, 
        status: 'active', entitlementIds: j.ents, description: `Standard-Blueprint für die Rolle ${j.name}.`
      }, dataSource);
    }

    // --- 8. BENUTZER (MULTI-ROLE) ---
    const usersData = [
      { id: 'u-demo-01', name: 'Max Mustermann', email: 'm.mustermann@wohnbau-nord.de', dept: 'Bestandsmanagement', jobs: ['j-immo-kfm'], adGroups: ['DOMAIN_USER', 'WODIS_USER'] },
      { id: 'u-demo-02', name: 'Erika IT-Leiterin', email: 'e.it@wohnbau-nord.de', dept: 'IT & Digitalisierung', jobs: ['j-it-admin', 'j-immo-kfm'], adGroups: ['DOMAIN_USER', 'WODIS_ADMIN', 'M365_USER'] },
      { id: 'u-demo-03', name: 'Sarah Security', email: 's.compliance@wohnbau-nord.de', dept: 'Recht & Datenschutz', jobs: ['j-ds-officer'], adGroups: ['DOMAIN_USER'] }
    ];

    for (const u of usersData) {
      await saveCollectionRecord('users', u.id, {
        id: u.id, tenantId: t1Id, displayName: u.name, email: u.email, department: u.dept,
        jobIds: u.jobs, title: u.jobs[0], enabled: true, status: 'active', adGroups: u.adGroups,
        authSource: 'ldap', lastSyncedAt: offsetDate(1)
      }, dataSource);

      // Create initial assignments based on blueprints
      for (const jid of u.jobs) {
        const job = jobsData.find(j => j.id === jid);
        if (job) {
          for (const eid of job.ents) {
            const assId = `ass-${u.id}-${eid}`.substring(0, 50);
            await saveCollectionRecord('assignments', assId, {
              id: assId, userId: u.id, entitlementId: eid, status: 'active', tenantId: t1Id,
              grantedBy: 'system-demo', grantedAt: offsetDate(30), validFrom: today, syncSource: 'blueprint'
            }, dataSource);
          }
        }
      }
    }

    // --- 9. PROZESSE & BCM ---
    
    // 9.1 IT-NOTFALLPLÄNE
    const disasterProcId = 'p-disaster-erp';
    await saveCollectionRecord('processes', disasterProcId, {
      id: disasterProcId, tenantId: t1Id, title: 'BCM: Wiederherstellung ERP (SaaS Ausfall)', status: 'published',
      process_type_id: 'pt-disaster', currentVersion: 1, responsibleDepartmentId: 'd-it', createdAt: offsetDate(10)
    }, dataSource);

    const drNodes = [
      { id: 'start', type: 'start', title: 'Meldung Totalausfall' },
      { id: 'step1', type: 'step', title: 'Partner-Support kontaktieren', roleId: 'j-it-admin', resourceIds: ['res-wodis'] },
      { id: 'step2', type: 'step', title: 'Notbetrieb einleiten (Excel-Listen)', roleId: 'j-immo-kfm' },
      { id: 'end', type: 'end', title: 'System-Restore abgeschlossen' }
    ];
    await saveCollectionRecord('process_versions', `ver-${disasterProcId}-1`, {
      id: `ver-${disasterProcId}-1`, process_id: disasterProcId, version: 1, revision: 1, created_at: now,
      model_json: { nodes: drNodes, edges: [{id:'e1',source:'start',target:'step1'},{id:'e2',source:'step1',target:'step2'},{id:'e3',source:'step2',target:'end'}] },
      layout_json: { positions: { start: {x:50,y:100}, step1: {x:250,y:100}, step2: {x:500,y:100}, end: {x:750,y:100} } }
    }, dataSource);

    // 9.2 FACILITY MANAGEMENT NOTFALLPLÄNE
    const powerOutageId = 'p-emg-power';
    await saveCollectionRecord('processes', powerOutageId, {
      id: powerOutageId, tenantId: t1Id, title: 'BCM: Stromausfall in Liegenschaft', status: 'published',
      process_type_id: 'pt-disaster', currentVersion: 1, responsibleDepartmentId: 'd-tech', createdAt: offsetDate(5)
    }, dataSource);

    const powerNodes = [
      { id: 'start', type: 'start', title: 'Meldung Stromausfall' },
      { id: 'step1', type: 'step', title: 'Energieversorger kontaktieren', roleId: 'j-tech-ref' },
      { id: 'step2', type: 'step', title: 'Aufzugsanlagen prüfen / Personenbefreiung', roleId: 'j-tech-ref' },
      { id: 'step3', type: 'step', title: 'Notdienst Handwerker informieren', roleId: 'j-tech-ref' },
      { id: 'end', type: 'end', title: 'Energieversorgung stabil' }
    ];
    await saveCollectionRecord('process_versions', `ver-${powerOutageId}-1`, {
      id: `ver-${powerOutageId}-1`, process_id: powerOutageId, version: 1, revision: 1, created_at: now,
      model_json: { nodes: powerNodes, edges: [{id:'pe1',source:'start',target:'step1'},{id:'pe2',source:'step1',target:'step2'},{id:'pe3',source:'step2',target:'step3'},{id:'pe4',source:'step3',target:'end'}] },
      layout_json: { positions: { start: {x:50,y:100}, step1: {x:250,y:100}, step2: {x:500,y:100}, step3: {x:750,y:100}, end: {x:1000,y:100} } }
    }, dataSource);

    const floodingId = 'p-emg-flood';
    await saveCollectionRecord('processes', floodingId, {
      id: floodingId, tenantId: t1Id, title: 'BCM: Hochwasser / Großschadensereignis', status: 'published',
      process_type_id: 'pt-disaster', currentVersion: 1, responsibleDepartmentId: 'd-tech', createdAt: offsetDate(5)
    }, dataSource);

    const floodNodes = [
      { id: 'start', type: 'start', title: 'Meldung Wasserschaden' },
      { id: 'step1', type: 'step', title: 'Hauptabsperrhähne schließen', roleId: 'j-tech-ref' },
      { id: 'step2', type: 'step', title: 'Stromzufuhr gefährdeter Bereiche trennen', roleId: 'j-tech-ref' },
      { id: 'step3', type: 'step', title: 'Schadensdokumentation für Versicherung', roleId: 'j-immo-kfm' },
      { id: 'end', type: 'end', title: 'Gefahrenabwehr abgeschlossen' }
    ];
    await saveCollectionRecord('process_versions', `ver-${floodingId}-1`, {
      id: `ver-${floodingId}-1`, process_id: floodingId, version: 1, revision: 1, created_at: now,
      model_json: { nodes: floodNodes, edges: [{id:'fe1',source:'start',target:'step1'},{id:'fe2',source:'step1',target:'step2'},{id:'fe3',source:'step2',target:'step3'},{id:'fe4',source:'step3',target:'end'}] },
      layout_json: { positions: { start: {x:50,y:100}, step1: {x:250,y:100}, step2: {x:500,y:100}, step3: {x:750,y:100}, end: {x:1000,y:100} } }
    }, dataSource);

    // 9.3 STANDARD BIZ-PROZESSE (LINKED TO BCM)
    const bizProcId = 'p-vermietung';
    await saveCollectionRecord('processes', bizProcId, {
      id: bizProcId, tenantId: t1Id, title: 'Mietvertragsabschluss (Standard)', status: 'published', currentVersion: 1,
      process_type_id: 'pt-corp', responsibleDepartmentId: 'd-best', emergencyProcessId: disasterProcId, 
      vvtId: 'vvt-rental', createdAt: offsetDate(30), automationLevel: 'partial'
    }, dataSource);

    const maintenanceProcId = 'p-maint-01';
    await saveCollectionRecord('processes', maintenanceProcId, {
      id: maintenanceProcId, tenantId: t1Id, title: 'Reparatur- und Instandhaltungsmanagement', status: 'published', currentVersion: 1,
      process_type_id: 'pt-corp', responsibleDepartmentId: 'd-tech', emergencyProcessId: powerOutageId, 
      createdAt: offsetDate(20), automationLevel: 'manual'
    }, dataSource);

    // --- 10. RISIKEN & TOMS ---
    const riskId = 'rk-erp-down';
    await saveCollectionRecord('risks', riskId, {
      id: riskId, tenantId: t1Id, title: 'Ausfall des ERP-Systems (Wodis)', category: 'Betrieblich',
      impact: 5, probability: 2, status: 'active', assetId: 'res-wodis', owner: 'IT-Leitung',
      description: 'Verfügbarkeitsrisiko bei SaaS-Ausfall durch Provider.', createdAt: offsetDate(20)
    }, dataSource);

    const riskPowerId = 'rk-power-down';
    await saveCollectionRecord('risks', riskPowerId, {
      id: riskPowerId, tenantId: t1Id, title: 'Stromausfall in Wohnanlage', category: 'Betrieblich',
      impact: 4, probability: 3, status: 'active', owner: 'Leitung Technik',
      description: 'Gefahr für Bewohner (Aufzüge) und Infrastruktur.', createdAt: offsetDate(15)
    }, dataSource);

    const measureId = 'msr-bcm-plan';
    await saveCollectionRecord('riskMeasures', measureId, {
      id: measureId, riskIds: [riskId], resourceIds: ['res-wodis'], title: 'BCM-Plan für ERP-Ausfall',
      description: 'Definition von Notfallprozessen und Wiederherstellungszeiten.',
      owner: 'CISO', status: 'completed', isTom: true, tomCategory: 'Verfügbarkeitskontrolle',
      dueDate: in30Days, effectiveness: 5
    }, dataSource);

    const measurePowerId = 'msr-power-emg';
    await saveCollectionRecord('riskMeasures', measurePowerId, {
      id: measurePowerId, riskIds: [riskPowerId], title: 'Notfallplan Stromausfall',
      description: 'Bereitschaftsdienste und Handlungsanweisungen für technische Störungen.',
      owner: 'Facility Management', status: 'completed', isTom: true, tomCategory: 'Verfügbarkeitskontrolle',
      dueDate: in30Days, effectiveness: 4
    }, dataSource);

    await saveCollectionRecord('riskControls', 'ctrl-dr-test', {
      id: 'ctrl-dr-test', measureId: measureId, title: 'Jährlicher Restore-Test Wodis',
      owner: 'IT-Admin', status: 'completed', isEffective: true, checkType: 'Test',
      lastCheckDate: today, nextCheckDate: in30Days, evidenceDetails: 'Testprotokoll vom ' + today + ' erfolgreich archiviert.'
    }, dataSource);

    // --- 11. OPERATIVE TASKS ---
    const taskId = 'task-demo-01';
    await saveCollectionRecord('tasks', taskId, {
      id: taskId, tenantId: t1Id, title: 'Berechtigungs-Review Q1/2024', status: 'todo', priority: 'high',
      assigneeId: 'u-demo-02', creatorId: 'system', entityType: 'assignment', entityId: 'all',
      dueDate: in30Days, createdAt: now, updatedAt: now, description: 'Bitte alle administrativen Zugriffe in Wodis Sigma validieren.'
    }, dataSource);

    await saveCollectionRecord('task_comments', 'tcom-01', {
      id: 'tcom-01', taskId, userId: 'u-demo-02', userName: 'Erika IT-Leiterin',
      text: 'Start der Prüfung am Montag geplant.', createdAt: now
    }, dataSource);

    // --- 12. AUDIT LOG ---
    await logAuditEventAction(dataSource, {
      tenantId: 'global', actorUid: actorEmail, action: 'Massiver Demo-Daten-Import (Wohnbau-Szenario inkl. BCM Technik) abgeschlossen.',
      entityType: 'system', entityId: 'seed-v11'
    });

    return { success: true, message: "Tief vernetztes Wohnbau-Szenario mit BCM für Technik/IT erfolgreich geladen." };
  } catch (e: any) {
    console.error("Seeding Error:", e);
    return { success: false, error: e.message };
  }
}
