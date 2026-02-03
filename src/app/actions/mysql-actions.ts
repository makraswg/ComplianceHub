'use server';

import { getMysqlConnection, testMysqlConnection } from '@/lib/mysql';

// Eine einfache Zuordnung von Anwendungs-Sammlungsnamen zu echten MySQL-Tabellennamen.
const collectionToTableMap: { [key: string]: string } = {
  users: 'users',
  groups: 'groups',
  entitlements: 'entitlements',
  resources: 'resources',
  assignments: 'assignments',
  tenants: 'tenants',
  auditEvents: 'auditEvents',
};

/**
 * Führt eine sichere Leseoperation auf einer MySQL-Tabelle aus.
 */
export async function getCollectionData(collectionName: string): Promise<{ data: any[] | null; error: string | null; }> {
  const tableName = collectionToTableMap[collectionName];

  if (!tableName) {
    console.warn(`Attempted to query an invalid collection: ${collectionName}`);
    return { data: null, error: `Die Sammlung '${collectionName}' ist nicht für den Zugriff freigegeben.` };
  }

  let connection;
  try {
    connection = await getMysqlConnection();
    const [rows] = await connection.execute(`SELECT * FROM \`${tableName}\``);
    connection.release();
    
    // JSON Parsing für Listenfelder in Gruppen
    let data = JSON.parse(JSON.stringify(rows));
    
    if (tableName === 'groups') {
      data = data.map((item: any) => ({
        ...item,
        entitlementIds: item.entitlementIds ? JSON.parse(item.entitlementIds) : [],
        userIds: item.userIds ? JSON.parse(item.userIds) : [],
      }));
    }
    
    return { data, error: null };

  } catch (error: any) {
    console.error(`MySQL query failed for table '${tableName}':`, error);
    if (connection) {
      connection.release();
    }
    return { data: null, error: `Datenbankfehler: ${error.message}` };
  }
}

/**
 * Führt einen sicheren Verbindungstest für MySQL aus.
 */
export async function testMysqlConnectionAction(): Promise<{ success: boolean; message: string; }> {
    return await testMysqlConnection();
}
