
import mysql from 'mysql2/promise';

/**
 * Zentrales MySQL Connection Pooling.
 * Optimiert für den Betrieb in Docker-Containern und lokalen Umgebungen.
 */
let pool: mysql.Pool | null = null;

function getPool() {
  if (pool) return pool;

  const host = process.env.MYSQL_HOST || '127.0.0.1';
  // Port-Logik: Innerhalb Docker 3306, von außen (Host) meist 3307 laut docker-compose
  const port = Number(process.env.MYSQL_PORT || (host === 'compliance-db' ? 3306 : 3307));
  const user = process.env.MYSQL_USER || 'root';
  const password = process.env.MYSQL_PASSWORD || 'rootpassword';
  const database = process.env.MYSQL_DATABASE || 'compliance_hub';

  console.log(`[MySQL] Initialisiere Pool für ${host}:${port} (DB: ${database}, User: ${user})`);

  pool = mysql.createPool({
    host,
    port,
    user,
    password,
    database,
    waitForConnections: true,
    connectionLimit: 30, // Erhöht für parallele Hook-Abfragen
    maxIdle: 10,
    idleTimeout: 60000,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
    connectTimeout: 20000
  });
  
  return pool;
}

/**
 * Holt eine Verbindung aus dem Pool mit expliziter Fehlerbehandlung.
 */
export async function getMysqlConnection() {
  try {
    const p = getPool();
    return await p.getConnection();
  } catch (error: any) {
    console.error("[MySQL] Fehler beim Aufbau der Verbindung:", error.message);
    throw new Error(`Datenbankverbindung fehlgeschlagen: ${error.message}`);
  }
}

/**
 * Führt einen schnellen Ping-Test durch.
 */
export async function testMysqlConnection() {
  let connection;
  try {
    connection = await getMysqlConnection();
    await connection.ping();
    return { success: true, message: "MySQL Verbindung erfolgreich etabliert." };
  } catch (error: any) {
    return { success: false, message: `Verbindungsfehler: ${error.message}` };
  } finally {
    if (connection) connection.release();
  }
}
