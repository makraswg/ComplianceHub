'use client';

import { Process, ProcessVersion, Tenant, JobTitle, ProcessingActivity, Resource, RiskMeasure, Policy, PolicyVersion, Department, Feature } from './types';

/**
 * Utility-Modul für den Export von Daten (PDF & Excel).
 */

export async function exportToExcel(data: any[], fileName: string) {
  try {
    const XLSX = await import('xlsx');
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Daten');
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
  } catch (error) {
    console.error('Excel Export fehlgeschlagen:', error);
  }
}

export async function exportUsersExcel(users: any[], tenants: any[]) {
  const data = users.map(u => ({
    'ID': u.id,
    'Anzeigename': u.displayName,
    'E-Mail': u.email,
    'Abteilung': u.department || '---',
    'Stelle': u.title || '---',
    'Mandant': tenants.find(t => t.id === u.tenantId)?.name || u.tenantId,
    'Status': u.enabled ? 'Aktiv' : 'Inaktiv',
    'Onboarding': u.onboardingDate || '---',
    'Letzter Sync': u.lastSyncedAt ? new Date(u.lastSyncedAt).toLocaleString() : '---'
  }));
  await exportToExcel(data, `Benutzerverzeichnis_${new Date().toISOString().split('T')[0]}`);
}

export async function exportRisksExcel(risks: any[], resources: any[]) {
  const data = risks.map(r => {
    const asset = resources.find(res => res.id === r.assetId);
    return {
      'Titel': r.title,
      'Kategorie': r.category,
      'Asset': asset?.name || 'Global',
      'Status': r.status,
      'Brutto-Wahrscheinlichkeit': r.probability,
      'Brutto-Schaden': r.impact,
      'Brutto-Score': r.probability * r.impact,
      'Netto-Wahrscheinlichkeit': r.residualProbability || '---',
      'Netto-Schaden': r.residualImpact || '---',
      'Netto-Score': (r.residualProbability && r.residualImpact) ? r.residualProbability * r.residualImpact : '---',
      'Verantwortlich': r.owner,
      'Letzter Review': r.lastReviewDate ? new Date(r.lastReviewDate).toLocaleDateString() : 'Ausstehend'
    };
  });
  await exportToExcel(data, `Risikoinventar_${new Date().toISOString().split('T')[0]}`);
}

export async function exportGdprExcel(activities: any[]) {
  const data = activities.map(a => ({
    'ID': a.id,
    'Name der Tätigkeit': a.name,
    'Version': a.version,
    'Verantwortliche Abteilung': a.responsibleDepartment,
    'Rechtsgrundlage': a.legalBasis,
    'Aufbewahrungsfrist': a.retentionPeriod,
    'Status': a.status,
    'Letzte Prüfung': a.lastReviewDate ? new Date(a.lastReviewDate).toLocaleDateString() : '---'
  }));
  await exportToExcel(data, `Verarbeitungsverzeichnis_VVT_${new Date().toISOString().split('T')[0]}`);
}

/**
 * Zeichnet eine grafische Repräsentation des Prozesses im PDF.
 */
async function drawProcessGraph(doc: any, version: ProcessVersion, startY: number) {
  const nodes = version.model_json.nodes || [];
  const edges = version.model_json.edges || [];
  
  if (nodes.length === 0) return startY;

  const nodeWidth = 40;
  const nodeHeight = 15;
  const margin = 14;
  const pageWidth = doc.internal.pageSize.getWidth();
  const availableWidth = pageWidth - (2 * margin);
  
  // Einfaches Auto-Layout für PDF (Zentralisierte Spalte)
  const centerX = pageWidth / 2;
  let currentY = startY + 10;

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text('Grafische Prozessübersicht', margin, startY + 5);

  const nodePositions: Record<string, { x: number, y: number }> = {};

  nodes.forEach((node, i) => {
    const x = centerX - (nodeWidth / 2);
    const y = currentY;
    nodePositions[node.id] = { x: centerX, y: y };

    // Draw Box
    let color = [240, 240, 240]; // Default grey
    if (node.type === 'start') color = [209, 250, 229]; // Emerald
    if (node.type === 'end') color = [254, 226, 226]; // Red
    if (node.type === 'decision') color = [255, 247, 237]; // Orange
    if (node.type === 'subprocess') color = [238, 242, 255]; // Indigo

    doc.setDrawColor(200);
    doc.setFillColor(color[0], color[1], color[2]);
    doc.roundedRect(x, y, nodeWidth, nodeHeight, 2, 2, 'FD');

    // Draw Label
    doc.setFontSize(7);
    doc.setTextColor(0);
    const splitTitle = doc.splitTextToSize(node.title, nodeWidth - 4);
    doc.text(splitTitle, centerX, y + (nodeHeight / 2) + 1, { align: 'center' });

    currentY += nodeHeight + 15;
  });

  // Draw Edges
  doc.setDrawColor(150);
  edges.forEach(edge => {
    const sPos = nodePositions[edge.source];
    const tPos = nodePositions[edge.target];
    if (sPos && tPos) {
      doc.line(sPos.x, sPos.y + nodeHeight, tPos.x, tPos.y);
      // Small arrow head
      doc.line(tPos.x - 1, tPos.y - 2, tPos.x, tPos.y);
      doc.line(tPos.x + 1, tPos.y - 2, tPos.x, tPos.y);
      
      if (edge.label) {
        doc.setFontSize(6);
        doc.text(edge.label, (sPos.x + tPos.x) / 2 + 2, (sPos.y + nodeHeight + tPos.y) / 2);
      }
    }
  });

  return currentY + 10;
}

/**
 * Fügt Header und Footer zu jeder Seite hinzu.
 */
function addPageDecorations(doc: any, tenant: Tenant) {
  const pageCount = (doc as any).internal.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    
    // Header
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(tenant.name, 14, 10);
    doc.text('Vertraulich / Nur für den internen Gebrauch', pageWidth - 14, 10, { align: 'right' });
    doc.line(14, 12, pageWidth - 14, 12);

    // Footer
    doc.line(14, pageHeight - 15, pageWidth - 14, pageHeight - 15);
    doc.text(`Seite ${i} von ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    doc.text(`Generiert am ${new Date().toLocaleDateString()}`, 14, pageHeight - 10);
  }
}

/**
 * Detaillierter Prozessbericht (PDF)
 */
export async function exportDetailedProcessPdf(
  process: Process,
  version: ProcessVersion,
  tenant: Tenant,
  jobTitles: JobTitle[],
  departments: Department[]
) {
  try {
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');
    
    const doc = new jsPDF();
    const timestamp = new Date().toLocaleString('de-DE');
    const dept = departments.find(d => d.id === process.responsibleDepartmentId);
    const owner = jobTitles.find(j => j.id === process.ownerRoleId);

    // Title Page
    doc.setFontSize(28);
    doc.setTextColor(37, 99, 235);
    doc.text('Prozessdokumentation', 105, 80, { align: 'center' });
    doc.setFontSize(20);
    doc.setTextColor(0);
    doc.text(process.title, 105, 95, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`Mandant: ${tenant.name}`, 105, 110, { align: 'center' });
    doc.text(`Version: ${version.version}.0 | Stand: ${timestamp}`, 105, 117, { align: 'center' });

    doc.addPage();

    // 1. Stammdaten
    doc.setFontSize(14);
    doc.setTextColor(37, 99, 235);
    doc.text('1. Prozess-Steckbrief', 14, 25);
    
    autoTable(doc, {
      startY: 30,
      body: [
        ['Bezeichnung', process.title],
        ['Verantwortung', dept?.name || '---'],
        ['Process Owner', owner?.name || '---'],
        ['Automatisierung', process.automationLevel || 'manual'],
        ['Datenvolumen', process.dataVolume || 'medium'],
        ['Frequenz', process.processingFrequency || 'on_demand'],
        ['Regulatorik', process.regulatoryFramework || 'Standard'],
        ['Ziele / KPIs', process.kpis || '-']
      ],
      theme: 'grid',
      styles: { fontSize: 9 },
      columnStyles: { 0: { fontStyle: 'bold', width: 45, fillColor: [245, 247, 250] } }
    });

    // 2. Beschreibung
    const nextY = (doc as any).lastAutoTable.finalY + 15;
    doc.text('2. Fachliche Beschreibung', 14, nextY);
    doc.setFontSize(10);
    doc.setTextColor(0);
    const splitDesc = doc.splitTextToSize(process.description || 'Keine Beschreibung hinterlegt.', 180);
    doc.text(splitDesc, 14, nextY + 7);

    // 3. Graph
    const graphY = nextY + 15 + (splitDesc.length * 5);
    const finalGraphY = await drawProcessGraph(doc, version, graphY);

    // 4. Operativer Leitfaden
    doc.addPage();
    doc.setFontSize(14);
    doc.setTextColor(37, 99, 235);
    doc.text('3. Arbeitsschritte & Handover-Logik', 14, 25);
    
    const stepsData = (version.model_json.nodes || []).map((node) => {
      const role = jobTitles.find(j => j.id === node.roleId);
      const successors = version.model_json.edges
        ?.filter(e => e.source === node.id)
        .map(e => `${e.label ? '['+e.label+'] -> ' : ''}${version.model_json.nodes.find(n => n.id === e.target)?.title}`)
        .join(', ');

      return [
        node.title,
        role?.name || '-',
        node.description || '-',
        (node.checklist || []).join('\n'),
        successors || 'Ende'
      ];
    });

    autoTable(doc, {
      startY: 30,
      head: [['Schritt', 'Rolle', 'Tätigkeit', 'Prüfpunkte', 'Folge-Schritte']],
      body: stepsData,
      theme: 'striped',
      headStyles: { fillColor: [37, 99, 235] },
      styles: { fontSize: 7, cellPadding: 3 },
      columnStyles: { 2: { width: 40 }, 3: { width: 40 }, 4: { width: 35 } }
    });

    addPageDecorations(doc, tenant);
    doc.save(`Prozessbericht_${process.title.replace(/\s+/g, '_')}_V${version.version}.pdf`);
  } catch (error) {
    console.error('PDF Export fehlgeschlagen:', error);
  }
}

/**
 * Unternehmens-Handbuch: Alle Prozesse gruppiert nach Abteilungen
 */
export async function exportProcessManualPdf(
  processes: Process,
  versions: ProcessVersion[],
  tenant: Tenant,
  departments: Department[],
  jobTitles: JobTitle[]
) {
  try {
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');
    
    const doc = new jsPDF();
    const now = new Date().toLocaleDateString('de-DE');

    // Deckblatt
    doc.setFontSize(32);
    doc.setTextColor(37, 99, 235);
    doc.text('Unternehmens-Handbuch', 105, 80, { align: 'center' });
    
    doc.setFontSize(20);
    doc.setTextColor(100);
    doc.text(tenant.name, 105, 95, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text(`Dokumentation aller Geschäftsprozesse`, 105, 110, { align: 'center' });
    doc.text(`Stand: ${now} | Umfang: ${processes.length} Workflows`, 105, 117, { align: 'center' });

    // Inhaltsverzeichnis
    doc.addPage();
    doc.setFontSize(18);
    doc.setTextColor(37, 99, 235);
    doc.text('Inhaltsverzeichnis', 14, 30);
    doc.setDrawColor(37, 99, 235);
    doc.line(14, 33, 60, 33);
    
    let tocY = 45;
    departments.forEach(dept => {
      const deptProcs = processes.filter(p => p.responsibleDepartmentId === dept.id);
      if (deptProcs.length === 0) return;

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0);
      doc.text(dept.name, 14, tocY);
      tocY += 8;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(100);
      deptProcs.forEach(p => {
        doc.text(`- ${p.title}`, 20, tocY);
        tocY += 6;
        if (tocY > 270) { doc.addPage(); tocY = 20; }
      });
      tocY += 10;
    });

    // Hauptteil
    for (const dept of departments) {
      const deptProcs = processes.filter(p => p.responsibleDepartmentId === dept.id);
      if (deptProcs.length === 0) continue;

      doc.addPage();
      doc.setFontSize(22);
      doc.setTextColor(37, 99, 235);
      doc.text(`Bereich: ${dept.name}`, 14, 30);
      doc.line(14, 35, 196, 35);

      let currentY = 50;

      for (const p of deptProcs) {
        const ver = versions.find(v => v.process_id === p.id && v.version === p.currentVersion);
        if (!ver) continue;

        if (currentY > 220) { doc.addPage(); currentY = 30; }

        doc.setFontSize(16);
        doc.setTextColor(0);
        doc.text(p.title, 14, currentY);
        
        autoTable(doc, {
          startY: currentY + 5,
          head: [['Schritt', 'Rolle', 'Tätigkeit', 'Status']],
          body: ver.model_json.nodes.map(n => [
            n.title, 
            jobTitles.find(j => j.id === n.roleId)?.name || '-',
            n.description || '-',
            n.type.toUpperCase()
          ]),
          theme: 'striped',
          headStyles: { fillColor: [100, 116, 139] },
          styles: { fontSize: 8 }
        });
        
        currentY = (doc as any).lastAutoTable.finalY + 20;
      }
    }

    addPageDecorations(doc, tenant);
    doc.save(`Unternehmens_Handbuch_${tenant.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
  } catch (error) {
    console.error('Handbuch Export fehlgeschlagen:', error);
  }
}

export async function exportComplianceReportPdf(
  users: any[],
  resources: any[],
  assignments: any[],
  auditLogs: any[]
) {
  try {
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');
    
    const doc = new jsPDF();
    const timestamp = new Date().toLocaleString('de-DE');

    doc.setFontSize(22);
    doc.setTextColor(37, 99, 235);
    doc.text('ComplianceHub Compliance Statusbericht', 14, 25);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Erstellungsdatum: ${timestamp}`, 14, 35);
    doc.text('Status: Vertraulich / Intern', 14, 40);

    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text('1. Zusammenfassung der IAM-Umgebung', 14, 55);
    
    const statsData = [
      ['Metrik', 'Wert'],
      ['Gesamtbenutzer', (users?.length || 0).toString()],
      ['Systeme im Katalog', (resources?.length || 0).toString()],
      ['Aktive Zugriffsberechtigungen', (assignments?.filter((a: any) => a.status === 'active').length || 0).toString()],
      ['Review-Fortschritt', `${Math.round((assignments?.filter((a: any) => !!a.lastReviewedAt).length / (assignments?.length || 1)) * 100)}%`]
    ];

    autoTable(doc, {
      startY: 60,
      head: [['Metrik', 'Wert']],
      body: statsData.slice(1),
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235] }
    });

    doc.save(`Compliance_Statusbericht_${new Date().toISOString().split('T')[0]}.pdf`);
  } catch (error) {
    console.error('Compliance Export fehlgeschlagen:', error);
  }
}

export async function exportFullComplianceReportPdf(
  users: any[],
  resources: any[],
  entitlements: any[],
  assignments: any[],
  mode: 'user' | 'resource'
) {
  try {
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');
    
    const doc = new jsPDF();
    const timestamp = new Date().toLocaleString('de-DE');

    doc.setFontSize(20);
    doc.setTextColor(37, 99, 235);
    doc.text('Detaillierter Compliance Zuweisungsbericht', 14, 25);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Struktur: Gruppiert nach ${mode === 'user' ? 'Benutzern' : 'Ressourcen'}`, 14, 35);
    doc.text(`Erstellungsdatum: ${timestamp}`, 14, 40);

    let startY = 50;

    if (mode === 'user') {
      const activeAssignments = assignments.filter(a => a.status !== 'removed');
      const uniqueUserIds = [...new Set(activeAssignments.map(a => a.userId))];
      
      uniqueUserIds.forEach((uid, index) => {
        const user = users.find(u => u.id === uid);
        const userAssignments = activeAssignments.filter(a => a.userId === uid);
        
        if (startY > 250) { doc.addPage(); startY = 20; }

        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.text(`${index + 1}. ${user?.displayName || uid} (${user?.email || 'keine E-Mail'})`, 14, startY);
        startY += 5;

        const tableData = userAssignments.map(a => {
          const ent = entitlements.find(e => e.id === a.entitlementId);
          const res = resources.find(r => r.id === ent?.resourceId);
          return [
            res?.name || 'Unbekanntes System',
            ent?.name || 'Unbekannte Rolle',
            ent?.riskLevel?.toUpperCase() || 'MEDIUM',
            a.status.toUpperCase(),
            a.validUntil ? new Date(a.validUntil).toLocaleDateString() : 'Unbefristet'
          ];
        });

        autoTable(doc, {
          startY: startY,
          head: [['System', 'Rolle', 'Risiko', 'Status', 'Gültigkeit']],
          body: tableData,
          theme: 'striped',
          headStyles: { fillColor: [37, 99, 235] },
          styles: { fontSize: 8 },
          margin: { left: 14 }
        });

        startY = (doc as any).lastAutoTable.finalY + 15;
      });
    } else {
      const activeAssignments = assignments.filter(a => a.status !== 'removed');
      resources.forEach((res, index) => {
        const resAssignments = activeAssignments.filter(a => {
          const ent = entitlements.find(e => e.id === a.entitlementId);
          return ent?.resourceId === res.id;
        });

        if (resAssignments.length === 0) return;

        if (startY > 250) { doc.addPage(); startY = 20; }

        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.text(`${index + 1}. System: ${res.name}`, 14, startY);
        startY += 5;

        const tableData = resAssignments.map(a => {
          const user = users.find(u => u.id === a.userId);
          const ent = entitlements.find(e => e.id === a.entitlementId);
          return [
            user?.displayName || a.userId,
            user?.email || '-',
            ent?.name || 'Unbekannte Rolle',
            a.status.toUpperCase(),
            a.validUntil ? new Date(a.validUntil).toLocaleDateString() : 'Unbefristet'
          ];
        });

        autoTable(doc, {
          startY: startY,
          head: [['Benutzer', 'E-Mail', 'Rolle', 'Status', 'Gültigkeit']],
          body: tableData,
          theme: 'striped',
          headStyles: { fillColor: [37, 99, 235] },
          styles: { fontSize: 8 },
          margin: { left: 14 }
        });

        startY = (doc as any).lastAutoTable.finalY + 15;
      });
    }

    doc.save(`Compliance_Detailbericht_${mode}_${new Date().toISOString().split('T')[0]}.pdf`);
  } catch (error) {
    console.error('Compliance Export fehlgeschlagen:', error);
  }
}

/**
 * Richtlinien-Export als PDF.
 */
export async function exportPolicyPdf(policy: Policy, version: PolicyVersion, tenantName: string) {
  try {
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');
    
    const doc = new jsPDF();
    const timestamp = new Date().toLocaleDateString('de-DE');

    // Branding
    doc.setFontSize(22);
    doc.setTextColor(5, 150, 105); // Emerald Green
    doc.text(policy.title, 14, 25);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Mandant: ${tenantName}`, 14, 33);
    doc.text(`Stand: ${timestamp} • Version ${version.version}.${version.revision}`, 14, 38);
    
    doc.setDrawColor(200);
    doc.line(14, 45, 196, 45);

    // Metadata Table
    autoTable(doc, {
      startY: 50,
      body: [
        ['ID', policy.id],
        ['Dokumenten-Typ', policy.type],
        ['Status', policy.status.toUpperCase()],
        ['Letzte Änderung', version.changelog || '-']
      ],
      theme: 'grid',
      styles: { fontSize: 8 },
      columnStyles: { 0: { fontStyle: 'bold', width: 40 } }
    });

    // Main Content
    doc.setFontSize(12);
    doc.setTextColor(0);
    const splitContent = doc.splitTextToSize(version.content, 180);
    doc.text(splitContent, 14, (doc as any).lastAutoTable.finalY + 15);

    doc.save(`Richtlinie_${policy.title.replace(/\s+/g, '_')}_V${version.version}.pdf`);
  } catch (error) {
    console.error('Policy PDF Export failed:', error);
  }
}

/**
 * Richtlinien-Export als DOCX (Pragmatische HTML-Blob Lösung).
 */
export async function exportPolicyDocx(policy: Policy, version: PolicyVersion) {
  const content = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset='utf-8'><title>${policy.title}</title></head>
    <body style="font-family: Arial, sans-serif;">
      <h1 style="color: #059669;">${policy.title}</h1>
      <p><strong>Version:</strong> ${version.version}.${version.revision}</p>
      <p><strong>Status:</strong> ${policy.status}</p>
      <hr/>
      <div style="white-space: pre-wrap;">
        ${version.content.replace(/\n/g, '<br/>')}
      </div>
    </body>
    </html>
  `;

  const blob = new Blob(['\ufeff', content], {
    type: 'application/msword'
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Richtlinie_${policy.title.replace(/\s+/g, '_')}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
