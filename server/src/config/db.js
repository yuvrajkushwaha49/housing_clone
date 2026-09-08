import mysql from 'mysql2/promise';
import config from './index.js';
import logger from '../utils/logger.js';

const pool = mysql.createPool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  waitForConnections: true,
  connectionLimit: 20,
  namedPlaceholders: true,
  dateStrings: true,
  timezone: '+00:00',
});

pool
  .query('SELECT 1')
  .then(() => logger.info('MySQL pool connected'))
  .catch((err) => logger.error(`MySQL connection failed: ${err.message}`));

/**
 * Execute a parameterized query.
 * @param {string} sql
 * @param {object|Array} params
 * @returns {Promise<[any, any]>}
 */
export async function query(sql, params = {}) {
  return pool.execute(sql, params);
}

/**
 * Run work inside a transaction.
 * @param {(conn: import('mysql2/promise').PoolConnection) => Promise<any>} work
 */
export async function withTransaction(work) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export default pool;
