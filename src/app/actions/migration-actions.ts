
'use server';

import { getPool, dbQuery } from '@/lib/mysql';
import { appSchema } from '@/lib/schema';
import bcrypt from 'bcryptjs';
import { logAuditEventAction } from './audit-actions';

/**
 * Prüft den Systemstatus. 
 */
export async function checkSystemStatusAction(): Promise<{ initialized: boolean }> {
  let connection: any = null;
  try {
    const pool = getPool();
    connection = await pool.getConnection();
    const dbName = connection.config.database;

    const [tableExists]: any = await connection.query(
      "SELECT count(*) as count FROM information_schema.tables WHERE table_schema = ? AND table_name = 'platformUsers'",
      [dbName]
    );

    if (tableExists[0].count === 0) return { initialized: false };

    const [rows]: any = await connection.query('SELECT count(*) as count FROM `platformUsers`');
    return { initialized: rows[0].count > 0 };
  } catch (e) {
    return { initialized: false };
  } finally {
    if (connection) connection.release();
  }
}

/**
 * Führt die Migration durch. 
 */
export async function runDatabaseMigrationAction(): Promise<{ success: boolean; message: string; details: string[] }> {
  const details: string[] = [];
  let connection: any = null;
  try {
    const pool = getPool();
    connection = await pool.getConnection();
    const dbName = connection.config.database;

    details.push(`✅ Datenbank '${dbName}' verbunden.`);

    for (const tableName of Object.keys(appSchema)) {
      const tableDefinition = appSchema[tableName];
      const [tableExistsResult]: any = await connection.query(
        `SELECT table_name FROM information_schema.tables WHERE table_schema = ? AND table_name = ?`,
        [dbName, tableName]
      );

      if (tableExistsResult.length === 0) {
        const columnsSql = Object.entries(tableDefinition.columns)
          .map(([colName, colDef]) => `\`${colName}\` ${colDef}`)
          .join(', \n');
        details.push(`🏃 Erstelle neue Tabelle '${tableName}'...`);
        await connection.query(`CREATE TABLE \`${tableName}\` (\n${columnsSql}\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);
      } else {
        for (const columnName of Object.keys(tableDefinition.columns)) {
          const [colRes]: any = await connection.query(
            `SELECT column_name FROM information_schema.columns WHERE table_schema = ? AND table_name = ? AND LOWER(column_name) = LOWER(?)`,
            [dbName, tableName, columnName]
          );
          
          if (colRes.length === 0) {
            details.push(`✨ Erweitere '${tableName}': Neue Spalte '${columnName}' erkannt.`);
            await connection.query(`ALTER TABLE \`${tableName}\` ADD COLUMN \`${columnName}\` ${tableDefinition.columns[columnName]}`);
          }
        }
      }
    }

    // Initialisierung der Standard Sync-Jobs
    const ldapSyncJob = {
      id: 'job-ldap-sync',
      name: 'LDAP/AD Voll-Synchronisation',
      lastStatus: 'idle',
      lastMessage: 'Bereit für den ersten Lauf.'
    };
    
    await connection.query(
      'INSERT INTO `syncJobs` (id, name, lastStatus, lastMessage) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name)',
      [ldapSyncJob.id, ldapSyncJob.name, ldapSyncJob.lastStatus, ldapSyncJob.lastMessage]
    );
    details.push(`🔄 Sync-Job 'job-ldap-sync' registriert.`);

    const successMsg = details.length > 1 ? 'Infrastruktur erfolgreich aktualisiert.' : 'Infrastruktur ist auf dem neuesten Stand.';
    return { success: true, message: successMsg, details };
  } catch (error: any) {
    console.error("Migration failed:", error);
    return { success: false, message: `Migrationsfehler: ${error.message}`, details };
  } finally {
    if (connection) connection.release();
  }
}

/**
 * Erstellt den ersten Administrator.
 */
export async function createInitialAdminAction(data: { 
  name: string, 
  email: string, 
  password: string,
  tenantName: string 
}): Promise<{ success: boolean; message: string }> {
  let connection: any = null;
  try {
    const pool = getPool();
    connection = await pool.getConnection();

    const tenantId = 't1';
    await connection.query(
      'INSERT INTO `tenants` (id, name, slug, createdAt, status) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name)', 
      [tenantId, data.tenantName, data.tenantName.toLowerCase().replace(/[^a-z0-9]/g, '-'), new Date().toISOString(), 'active']
    );

    const superAdminRole = {
      id: 'superAdmin',
      name: 'Super Administrator',
      description: 'Systemweite Vollberechtigung.',
      permissions: JSON.stringify({
        iam: 'write',
        risks: 'write',
        processhub: 'write',
        gdpr: 'write',
        settings: 'write',
        audit: 'write',
        media: 'write'
      })
    };

    await connection.query(
      'INSERT INTO `platformRoles` (id, name, description, permissions) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name)',
      [superAdminRole.id, superAdminRole.name, superAdminRole.description, superAdminRole.permissions]
    );

    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(data.password, salt);
    const adminId = 'puser-initial-admin';
    
    await connection.query(
      'INSERT INTO `platformUsers` (id, email, password, displayName, role, tenantId, enabled, createdAt, authSource) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [adminId, data.email, hashedPassword, data.name, 'superAdmin', 'all', 1, new Date().toISOString(), 'local']
    );

    await logAuditEventAction('mysql', {
      tenantId: 'global',
      actorUid: data.email,
      action: 'System-Initialisierung abgeschlossen.',
      entityType: 'system',
      entityId: 'setup'
    });

    return { success: true, message: 'Setup erfolgreich abgeschlossen.' };
  } catch (error: any) {
    return { success: false, message: `Setup-Fehler: ${error.message}` };
  } finally {
    if (connection) connection.release();
  }
}
