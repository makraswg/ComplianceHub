
import { getMysqlConnection } from '../lib/mysql';
import { appSchema } from '../lib/schema';

async function migrate() {
  let connection;
  try {
    connection = await getMysqlConnection();
    console.log('Connected to MySQL database.');

    for (const tableName of Object.keys(appSchema)) {
      const tableDefinition = appSchema[tableName];
      const columns = Object.entries(tableDefinition.columns)
        .map(([columnName, columnDefinition]) => `\`${columnName}\` ${columnDefinition}`)
        .join(',\\n');
      
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS \`${tableName}\` (
          ${columns}
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `;

      try {
        await connection.execute(createTableQuery);
        console.log(`Table '${tableName}' created or already exists.`);
      } catch (error: any) {
        console.error(`Error creating table '${tableName}':`, error.message);
        if (error.code === 'ER_PARSE_ERROR') {
          console.error('Query:', createTableQuery);
        }
      }
    }

    console.log('Database migration completed successfully.');
  } catch (error: any) {
    console.error('Error during database migration:', error.message);
  } finally {
    if (connection) {
      connection.release();
      console.log('MySQL connection released.');
    }
  }
}

migrate();
