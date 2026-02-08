
'use server';

import { saveCollectionRecord, getCollectionData, deleteCollectionRecord } from './mysql-actions';
import { Feature, FeatureLink, FeatureDependency, DataSource, FeatureProcessLink } from '@/lib/types';
import { logAuditEventAction } from './audit-actions';

/**
 * Berechnet den Kritikalitäts-Score und das Label basierend auf der Punktematrix.
 */
function calculateMatrixCriticality(feature: Partial<Feature>): { score: number, label: 'low' | 'medium' | 'high' } {
  let score = 0;
  if (feature.matrixFinancial) score++;
  if (feature.matrixLegal) score++;
  if (feature.matrixExternal) score++;
  if (feature.matrixHardToCorrect) score++;
  if (feature.matrixAutomatedDecision) score++;
  if (feature.matrixPlanning) score++;

  let label: 'low' | 'medium' | 'high' = 'low';
  if (score >= 4) label = 'high';
  else if (score >= 2) label = 'medium';

  return { score, label };
}

/**
 * Speichert oder aktualisiert ein Datenobjekt.
 */
export async function saveFeatureAction(feature: Feature, dataSource: DataSource = 'mysql', actorEmail: string = 'system') {
  const isNew = !feature.id || feature.id === '';
  const id = isNew ? `feat-${Math.random().toString(36).substring(2, 9)}` : feature.id;
  const now = new Date().toISOString();
  
  // Matrix Calculation
  const { score, label } = calculateMatrixCriticality(feature);

  const data = {
    ...feature,
    id,
    criticality: label,
    criticalityScore: score,
    createdAt: feature.createdAt || now,
    updatedAt: now
  };

  try {
    const res = await saveCollectionRecord('features', id, data, dataSource);
    if (res.success) {
      await logAuditEventAction(dataSource as any, {
        tenantId: feature.tenantId,
        actorUid: actorEmail,
        action: isNew ? `Datenobjekt angelegt: ${feature.name}` : `Datenobjekt aktualisiert: ${feature.name}`,
        entityType: 'feature',
        entityId: id,
        after: data
      });
    }
    return res;
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

/**
 * Verknüpft Daten mit einem Prozess.
 */
export async function linkFeatureToProcessAction(link: Omit<FeatureProcessLink, 'id'>, dataSource: DataSource = 'mysql') {
  const id = `fproc-${Math.random().toString(36).substring(2, 9)}`;
  return await saveCollectionRecord('feature_process_steps', id, { ...link, id }, dataSource);
}

/**
 * Entfernt eine Prozessverknüpfung.
 */
export async function unlinkFeatureFromProcessAction(linkId: string, featureId: string, dataSource: DataSource = 'mysql') {
  return await deleteCollectionRecord('feature_process_steps', linkId, dataSource);
}

/**
 * Löscht ein Datenobjekt und alle Verknüpfungen.
 */
export async function deleteFeatureAction(featureId: string, dataSource: DataSource = 'mysql') {
  try {
    const linksRes = await getCollectionData('feature_links', dataSource);
    const links = linksRes.data?.filter(l => l.featureId === featureId) || [];
    for (const link of links) {
      await deleteCollectionRecord('feature_links', link.id, dataSource);
    }

    const procLinksRes = await getCollectionData('feature_process_steps', dataSource);
    const procLinks = procLinksRes.data?.filter((l: any) => l.featureId === featureId) || [];
    for (const link of procLinks) {
      await deleteCollectionRecord('feature_process_steps', link.id, dataSource);
    }

    const depsRes = await getCollectionData('feature_dependencies', dataSource);
    const deps = depsRes.data?.filter(d => d.featureId === featureId || d.dependentFeatureId === featureId) || [];
    for (const dep of deps) {
      await deleteCollectionRecord('feature_dependencies', dep.id, dataSource);
    }

    return await deleteCollectionRecord('features', featureId, dataSource);
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function linkFeatureAction(link: Omit<FeatureLink, 'id'>, dataSource: DataSource = 'mysql') {
  const id = `flnk-${Math.random().toString(36).substring(2, 9)}`;
  return await saveCollectionRecord('feature_links', id, { ...link, id }, dataSource);
}

export async function addFeatureDependencyAction(dep: Omit<FeatureDependency, 'id'>, dataSource: DataSource = 'mysql') {
  const id = `fdep-${Math.random().toString(36).substring(2, 9)}`;
  return await saveCollectionRecord('feature_dependencies', id, { ...dep, id }, dataSource);
}
