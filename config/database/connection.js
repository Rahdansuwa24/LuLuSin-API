const { Sequelize } = require('sequelize');

const sslConfig = (process.env.DB_SSL === 'true' || process.env.TIDB_ENABLE_SSL === 'true')
    ? {
        ssl: {
            minVersion: 'TLSv1.2',
            rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false'
        }
      }
    : {};

const db = new Sequelize(
    process.env.DB_NAME || 'db_lulusin',
    process.env.DB_USER || 'root',
    process.env.DB_PASS || '',
    {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '3306', 10),
        dialect: process.env.DB_DIALECT || 'mysql',
        dialectOptions: sslConfig,
        logging: process.env.NODE_ENV === 'development' ? console.log : false,
        pool: {
            max: 10,
            min: 0,
            acquire: 30000,
            idle: 10000
        }
    }
);

async function connectDB() {
    try {
        await db.authenticate();
        console.log(`Database connected successfully [${process.env.DB_NAME || 'db_lulusin'}] (SSL: ${process.env.DB_SSL === 'true' ? 'Enabled' : 'Disabled'})`);
    } catch (error) {
        console.error("Database connection failed:", error.message);
    }
}

module.exports = { db, connectDB };
