
'use client';

import { Process, ProcessVersion, Tenant, JobTitle, ProcessingActivity, Resource, RiskMeasure, Policy, PolicyVersion, Department, Feature, ProcessNode } from './types';

/**
 * Utility-Modul für den Export von Daten (PDF & Excel).
 * Optimiert für Enterprise-Reporting und GRC-Nachweise nach ISO-Standards.
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

export async function exportResourcesExcel(resources: any[], tenants: any[]) {
  const data = resources.map(r => ({
    'Name': r.name,
    'Typ': r.assetType,
    'Kategorie': r.category,
    'Betriebsmodell': r.operatingModel,
    'Kritikalität': r.criticality,
    'Mandant': tenants.find(t => t.id === r.tenantId)?.name || r.tenantId,
    'Standort': r.dataLocation || '---',
    'Status': r.status || 'active'
  }));
  await exportToExcel(data, `Ressourcenkatalog_${new Date().toISOString().split('T')[0]}`);
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
 * Synchronisierte Layout-Logik (Designer-Mirror).
 * Berechnet X/Y Positionen basierend auf Graphenstruktur (Ränge & Bahnen).
 */
function calculateDesignerLayout(nodes: ProcessNode[], edges: any[]) {
  const levels: Record<string, number> = {};
  const lanes: Record<string, number> = {};
  const occupiedLanesPerLevel = new Map<number, Set<number>>();

  nodes.forEach(n => levels[n.id] = 0);
  
  // 1. Ranking (X-Achse / Tiefe)
  let changed = true;
  let limit = nodes.length * 2;
  while (changed && limit > 0) {
    changed = false;
    edges.forEach(e => {
      if (levels[e.target] <= levels[e.source]) {
        levels[e.target] = levels[e.source] + 1;
        changed = true;
      }
    });
    limit--;
  }

  // 2. Lane-Zuweisung (Y-Achse / Parallele Pfade)
  const processed = new Set<string>();
  const queue = nodes.filter(n => !edges.some(e => e.target === n.id)).map(n => ({ id: n.id, lane: 0 }));
  
  while (queue.length > 0) {
    const { id, lane } = queue.shift()!;
    if (processed.has(id)) continue;
    
    const lv = levels[id];
    let finalLane = lane;
    if (!occupiedLanesPerLevel.has(lv)) occupiedLanesPerLevel.set(lv, new Set());
    const levelOccupancy = occupiedLanesPerLevel.get(lv)!;
    while (levelOccupancy.has(finalLane)) { finalLane++; }
    
    lanes[id] = finalLane;
    levelOccupancy.add(finalLane);
    processed.add(id);

    const children = edges.filter((e: any) => e.source === id).map((e: any) => e.target);
    children.forEach((childId: string, idx: number) => { 
      queue.push({ id: childId, lane: finalLane + idx }); 
    });
  }

  const layout: Record<string, { x: number, y: number, lv: number, lane: number }> = {};
  nodes.forEach(n => {
    layout[n.id] = {
      x: levels[n.id] * 50,
      y: lanes[n.id] * 25,
      lv: levels[n.id],
      lane: lanes[n.id]
    };
  });

  const maxLv = Math.max(...Object.values(levels), 0);
  const maxLane = Math.max(...Object.values(lanes), 0);

  return { layout, maxLv, maxLane };
}

/**
 * Zeichnet den Prozessgraphen maßstabsgetreu (Designer-Stil).
 */
async function drawProcessGraph(doc: any, version: ProcessVersion, startY: number) {
  const nodes = version.model_json.nodes || [];
  const edges = version.model_json.edges || [];
  
  if (nodes.length === 0) return startY;

  const { layout, maxLv, maxLane } = calculateDesignerLayout(nodes, edges);
  const margin = 14;
  const pageWidth = doc.internal.pageSize.getWidth();
  const canvasWidth = pageWidth - (2 * margin);
  
  const hGap = 50;
  const scale = Math.min((canvasWidth - 40) / (maxLv * hGap || 1), 1.0);
  const graphHeight = Math.max(40, (maxLane + 1) * 30);

  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.text('Visualisierung', margin, startY + 5);

  const getPdfCoords = (id: string) => {
    const pos = layout[id] || { x: 0, y: 0 };
    return {
      x: margin + 20 + (pos.x * scale),
      y: startY + 25 + (pos.y)
    };
  };

  // 1. Transitions
  doc.setLineWidth(0.2);
  edges.forEach((edge: any) => {
    const s = getPdfCoords(edge.source);
    const t = getPdfCoords(edge.target);
    
    const outCount = edges.filter((e: any) => e.source === edge.source).length;
    const inCount = edges.filter((e: any) => e.target === edge.target).length;
    
    if (outCount > 1 || inCount > 1) doc.setDrawColor(245, 158, 11); // Amber for branching
    else doc.setDrawColor(148, 163, 184); // Slate
    
    doc.line(s.x, s.y, t.x, t.y);
    
    // Simple Arrow Head
    const angle = Math.atan2(t.y - s.y, t.x - s.x);
    doc.line(t.x, t.y, t.x - 2 * Math.cos(angle - Math.PI/6), t.y - 2 * Math.sin(angle - Math.PI/6));
    doc.line(t.x, t.y, t.x - 2 * Math.cos(angle + Math.PI/6), t.y - 2 * Math.sin(angle + Math.PI/6));

    if (edge.label) {
      doc.setFontSize(5);
      doc.setTextColor(71, 85, 105);
      doc.text(edge.label, (s.x + t.x) / 2, (s.y + t.y) / 2 - 1, { align: 'center' });
    }
  });

  // 2. Steps
  nodes.forEach((node, i) => {
    const { x, y } = getPdfCoords(node.id);
    const r = 3.5;
    const outCount = edges.filter((e: any) => e.source === node.id).length;

    let color = [241, 245, 249]; 
    if (node.type === 'start') color = [16, 185, 129];
    else if (node.type === 'end') color = [239, 68, 68];
    else if (node.type === 'decision' || outCount > 1) color = [245, 158, 11];
    else if (node.type === 'subprocess') color = [79, 70, 229];

    doc.setFillColor(color[0], color[1], color[2]);
    doc.setDrawColor(100, 116, 139);
    doc.circle(x, y, r, 'FD');

    doc.setFontSize(6);
    doc.setTextColor(node.type === 'subprocess' || node.type === 'end' || node.type === 'start' ? 255 : 30);
    doc.setFont('helvetica', 'bold');
    doc.text(`${i + 1}`, x, y + 1, { align: 'center' });

    doc.setFontSize(6);
    doc.setTextColor(51, 65, 85);
    doc.text(node.title, x, y + r + 3, { align: 'center', maxWidth: 25 });
  });

  return startY + graphHeight + 35;
}

function addPageDecorations(doc: any, tenant: Tenant) {
  const pageCount = (doc as any).internal.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(tenant.name, 14, 8);
    doc.text('ComplianceHub • Prozess-Dokumentation', pageWidth - 14, 8, { align: 'right' });
    doc.setDrawColor(241, 245, 249);
    doc.line(14, 10, pageWidth - 14, 10);
    doc.line(14, pageHeight - 12, pageWidth - 14, pageHeight - 12);
    doc.text(`Seite ${i} von ${pageCount}`, pageWidth / 2, pageHeight - 8, { align: 'center' });
    doc.text(`Revisionsstand: ${new Date().toLocaleDateString()}`, 14, pageHeight - 8);
  }
}

export async function exportDetailedProcessPdf(
  process: Process,
  version: ProcessVersion,
  tenant: Tenant,
  jobTitles: JobTitle[],
  departments: Department[],
  resources: Resource[] = [],
  allFeatures: Feature[] = []
) {
  try {
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');
    
    const doc = new jsPDF();
    const now = new Date().toLocaleDateString('de-DE');
    const dept = departments.find(d => d.id === process.responsibleDepartmentId);
    const owner = jobTitles.find(j => j.id === process.ownerRoleId);

    const usedResourceIds = new Set<string>();
    const usedFeatureIds = new Set<string>();
    version.model_json.nodes.forEach(n => {
      n.resourceIds?.forEach(id => usedResourceIds.add(id));
      n.featureIds?.forEach(id => usedFeatureIds.add(id));
    });
    const resourceNames = resources.filter(r => usedResourceIds.has(r.id)).map(r => r.name).join(', ') || '---';
    const featureNames = allFeatures.filter(f => usedFeatureIds.has(f.id)).map(f => f.name).join(', ') || '---';

    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(process.title, 14, 25);
    
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`ID: ${process.id} | Mandant: ${tenant.name}`, 14, 30);

    const summaryRows = [
      ['Verantwortlich', owner?.name || '---'],
      ['Abteilung', dept?.name || '---'],
      ['Freigabe', `Freigegeben am ${now} durch ${owner?.name || 'Administrator'}`],
      ['VVT-Referenz', process.vvtId ? `Zweck ID: ${process.vvtId}` : '---'],
      ['Eingang (ISO)', process.inputs || '---'],
      ['Ausgang (ISO)', process.outputs || '---'],
      ['IT-Infrastruktur', resourceNames],
      ['Verarbeitete Daten', featureNames]
    ];

    autoTable(doc, {
      startY: 38,
      body: summaryRows,
      theme: 'grid',
      styles: { fontSize: 7.5, cellPadding: 2, font: 'helvetica' },
      columnStyles: { 0: { fontStyle: 'bold', width: 45, fillColor: [248, 250, 252] } }
    });

    const graphY = (doc as any).lastAutoTable.finalY + 8;
    const tableY = await drawProcessGraph(doc, version, graphY);

    const stepsData = version.model_json.nodes.map((node, index) => {
      const role = jobTitles.find(j => j.id === node.roleId);
      const nodeRes = resources.filter(r => node.resourceIds?.includes(r.id)).map(r => r.name).join(', ');
      
      const execution = [
        node.description || '',
        node.checklist?.length ? `Prüfpunkte:\n- ${node.checklist.join('\n- ')}` : '',
        node.tips ? `TIPP: ${node.tips}` : ''
      ].filter(Boolean).join('\n\n');

      const successors = version.model_json.edges
        ?.filter(e => e.source === node.id)
        .map(e => {
          const targetNode = version.model_json.nodes.find(n => n.id === e.target);
          const targetIdx = version.model_json.nodes.findIndex(n => n.id === e.target) + 1;
          const label = e.label ? `[${e.label}] ` : '';
          return `${label}→ (${targetIdx}) ${targetNode?.title}`;
        }).join('\n');

      return [
        { content: `${index + 1}. ${node.title}`, styles: { fontStyle: 'bold' } },
        role?.name || '---',
        nodeRes || '---',
        { content: execution || '---', styles: { overflow: 'linebreak' } },
        { content: successors || 'Ende', styles: { overflow: 'linebreak' } }
      ];
    });

    autoTable(doc, {
      startY: tableY + 5,
      head: [['Schritt', 'Zuständigkeit', 'Systeme', 'Operative Durchführung', 'Nächste Schritte']],
      body: stepsData,
      theme: 'striped',
      headStyles: { fillColor: [30, 41, 59], fontSize: 8 },
      styles: { fontSize: 7, cellPadding: 3, font: 'helvetica' },
      columnStyles: { 0: { width: 35 }, 3: { width: 75 }, 4: { width: 35 } }
    });

    addPageDecorations(doc, tenant);
    doc.save(`Prozessbericht_${process.title.replace(/\s+/g, '_')}.pdf`);
  } catch (error) {
    console.error('PDF Export fehlgeschlagen:', error);
  }
}

export async function exportProcessManualPdf(
  processes: Process[],
  versions: ProcessVersion[],
  tenant: Tenant,
  departments: Department[],
  jobTitles: JobTitle[],
  resources: Resource[] = [],
  allFeatures: Feature[] = []
) {
  try {
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');
    
    const doc = new jsPDF();
    const now = new Date().toLocaleDateString('de-DE');

    // --- COVER ---
    doc.setFillColor(37, 99, 235);
    doc.circle(105, 60, 12, 'F');
    doc.setTextColor(255);
    doc.setFontSize(9);
    doc.text('HUB', 105, 61, { align: 'center' });

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(28);
    doc.setFont('helvetica', 'bold');
    doc.text('Prozess-Handbuch', 105, 100, { align: 'center' });
    
    doc.setFontSize(14);
    doc.setTextColor(71, 85, 105);
    doc.text(tenant.name, 105, 112, { align: 'center' });
    
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.text(`Stand: ${now}`, 105, 135, { align: 'center' });

    // --- TOC ---
    const grouped: Record<string, Process[]> = {};
    processes.forEach(p => {
      const deptName = departments.find(d => d.id === p.responsibleDepartmentId)?.name || 'Zentral / Organisation';
      if (!grouped[deptName]) grouped[deptName] = [];
      grouped[deptName].push(p);
    });

    doc.addPage();
    const tocPage = (doc as any).internal.getNumberOfPages();
    doc.setTextColor(37, 99, 235);
    doc.setFontSize(18);
    doc.text('Inhaltsverzeichnis', 14, 25);
    
    const pageMap: Record<string, number> = {};

    for (const deptName of Object.keys(grouped).sort()) {
      for (const p of grouped[deptName]) {
        const ver = versions.find(v => v.process_id === p.id && v.version === p.currentVersion);
        if (!ver) continue;

        doc.addPage();
        pageMap[p.id] = (doc as any).internal.getNumberOfPages();
        
        doc.setFontSize(18);
        doc.setTextColor(30, 41, 59);
        doc.text(p.title, 14, 22);
        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.text(`Bereich: ${deptName} | V${p.currentVersion}.0`, 14, 27);
        doc.line(14, 30, 196, 30);

        const usedResourceIds = new Set<string>();
        const usedFeatureIds = new Set<string>();
        ver.model_json.nodes.forEach(n => {
          n.resourceIds?.forEach(id => usedResourceIds.add(id));
          n.featureIds?.forEach(id => usedFeatureIds.add(id));
        });
        const resNames = resources.filter(r => usedResourceIds.has(r.id)).map(r => r.name).join(', ') || '---';
        const featNames = allFeatures.filter(f => usedFeatureIds.has(f.id)).map(f => f.name).join(', ') || '---';

        autoTable(doc, {
          startY: 35,
          body: [
            ['Verantwortlich', jobTitles.find(j => j.id === p.ownerRoleId)?.name || '---'],
            ['Freigabe', `Freigegeben am ${now} durch ${jobTitles.find(j => j.id === p.ownerRoleId)?.name || 'Hub Admin'}`],
            ['VVT Link', p.vvtId || '---'],
            ['Eingang (ISO)', p.inputs || '---'],
            ['Ausgang (ISO)', p.outputs || '---'],
            ['IT-Ressourcen', resNames],
            ['Fach-Daten', featNames]
          ],
          theme: 'grid',
          styles: { fontSize: 7, font: 'helvetica' },
          columnStyles: { 0: { fontStyle: 'bold', width: 45, fillColor: [248, 250, 252] } }
        });

        const graphY = (doc as any).lastAutoTable.finalY + 8;
        const tableY = await drawProcessGraph(doc, ver, graphY);

        autoTable(doc, {
          startY: tableY + 5,
          head: [['Nr', 'Arbeitsschritt', 'Rolle', 'Anweisung / Checkliste', 'Nächste Schritte']],
          body: ver.model_json.nodes.map((n, i) => {
            const successors = ver.model_json.edges
              .filter(e => e.source === n.id)
              .map(e => {
                const targetNode = ver.model_json.nodes.find(node => node.id === e.target);
                const targetIdx = ver.model_json.nodes.findIndex(node => node.id === e.target) + 1;
                const label = e.label ? `[${e.label}] ` : '';
                return `${label}→ (${targetIdx}) ${targetNode?.title}`;
              }).join('\n');

            return [
              `${i + 1}`,
              { content: n.title, styles: { fontStyle: 'bold' } }, 
              jobTitles.find(j => j.id === n.roleId)?.name || '-',
              { content: `${n.description || ''}${n.checklist?.length ? '\n- ' + n.checklist.join('\n- ') : ''}`, styles: { overflow: 'linebreak' } },
              { content: successors || 'Ende', styles: { overflow: 'linebreak' } }
            ];
          }),
          theme: 'striped',
          styles: { fontSize: 6.5, font: 'helvetica' },
          columnStyles: { 0: { width: 8 }, 1: { width: 35 }, 3: { width: 75 }, 4: { width: 35 } }
        });
      }
    }

    // --- FILL TOC ---
    doc.setPage(tocPage);
    let tocY = 40;
    for (const deptName of Object.keys(grouped).sort()) {
      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59);
      doc.setFont('helvetica', 'bold');
      doc.text(deptName.toUpperCase(), 14, tocY);
      tocY += 8;
      
      grouped[deptName].forEach(p => {
        doc.setFontSize(9);
        doc.setTextColor(71, 85, 105);
        doc.setFont('helvetica', 'normal');
        const label = `   ${p.title}`;
        const pageNum = pageMap[p.id]?.toString() || '?';
        doc.text(label, 14, tocY);
        
        // Leader Line
        const labelWidth = doc.getTextWidth(label);
        const pageNumWidth = doc.getTextWidth(pageNum);
        const lineStart = 14 + labelWidth + 3;
        const lineEnd = 196 - pageNumWidth - 3;
        if (lineEnd > lineStart) {
          doc.setDrawColor(203, 213, 225);
          doc.setLineWidth(0.1);
          for (let dx = lineStart; dx < lineEnd; dx += 2) doc.line(dx, tocY - 1, dx + 0.5, tocY - 1);
        }
        
        doc.text(pageNum, 196, tocY, { align: 'right' });
        tocY += 6;
      });
      tocY += 4;
    }

    addPageDecorations(doc, tenant);
    doc.save(`Handbuch_${tenant.name.replace(/\s+/g, '_')}.pdf`);
  } catch (error) {
    console.error('Handbuch Export fehlgeschlagen:', error);
  }
}

export async function exportPolicyPdf(policy: Policy, version: PolicyVersion, tenantName: string) {
  try {
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');
    
    const doc = new jsPDF();
    const timestamp = new Date().toLocaleDateString('de-DE');

    doc.setFontSize(22);
    doc.setTextColor(5, 150, 105); 
    doc.text(policy.title, 14, 25);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Organisation: ${tenantName} | V${version.version}.${version.revision}`, 14, 35);
    doc.line(14, 40, 196, 40);

    autoTable(doc, {
      startY: 45,
      body: [['Typ', policy.type], ['Status', policy.status.toUpperCase()], ['Änderung', version.changelog || '-']],
      theme: 'grid',
      styles: { fontSize: 8, font: 'helvetica' }
    });

    const contentY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(11);
    doc.setTextColor(0);
    const splitContent = doc.splitTextToSize(version.content.replace(/<[^>]*>?/gm, ''), 180);
    doc.text(splitContent, 14, contentY);

    doc.save(`Richtlinie_${policy.title.replace(/\s+/g, '_')}.pdf`);
  } catch (error) {
    console.error('Policy PDF Export failed:', error);
  }
}

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
        ${version.content.replace(/<[^>]*>?/gm, '')}
      </div>
    </body>
    </html>
  `;

  const blob = new Blob(['\ufeff', content], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Richtlinie_${policy.title.replace(/\s+/g, '_')}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
