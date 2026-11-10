require('dotenv').config();

const sslConfig = (process.env.DB_SSL === 'true' || process.env.TIDB_ENABLE_SSL === 'true')
  ? {
      ssl: {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false'
      }
    }
  : {};

const dbConfig = {
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'db_lulusin',
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  dialect: process.env.DB_DIALECT || 'mysql',
  dialectOptions: sslConfig
};

module.exports = {
  development: dbConfig,
  test: dbConfig,
  production: dbConfig
};
