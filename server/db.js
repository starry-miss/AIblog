const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '123456',
};

if (process.env.DB_SSL === 'true') {
  dbConfig.ssl = {};
}

const pool = mysql.createPool({
  ...dbConfig,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function getConnection() {
  const config = {
    ...dbConfig,
    database: process.env.DB_NAME || 'aiblog'
  };
  if (process.env.DB_SSL === 'true') {
    config.ssl = {};
  }
  const connection = await mysql.createConnection(config);
  return connection;
}

async function query(sql, params) {
  const conn = await getConnection();
  try {
    const [rows] = await conn.execute(sql, params);
    return rows;
  } finally {
    await conn.end();
  }
}

module.exports = { pool, getConnection, query };
