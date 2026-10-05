// api/_shared/db.js — MySQL connection (uses config.js)
const mysql = require('mysql2/promise');
const config = require('./config');

function createPool() {
  return mysql.createPool({
    host: config.DB_HOST,
    user: config.DB_USER,
    password: config.DB_PASS,
    database: config.DB_NAME,
    charset: config.DB_CHARSET,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });
}

async function query(sql, params = []) {
  const pool = createPool();
  try {
    const [rows] = await pool.query(sql, params);
    return rows;
  } finally {
    pool.end();
  }
}

async function fetchOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] || null;
}

async function lastInsertId() {
  const rows = await query('SELECT LAST_INSERT_ID() as id');
  return rows[0].id;
}

module.exports = { query, fetchOne, lastInsertId, createPool };