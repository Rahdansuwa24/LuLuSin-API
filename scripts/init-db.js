require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const { Sequelize } = require('sequelize');

async function ensureDatabaseExists() {
    const dbName = process.env.DB_NAME || 'db_lulusin';
    const host = process.env.DB_HOST || '127.0.0.1';
    const port = parseInt(process.env.DB_PORT || '3306', 10);
    const user = process.env.DB_USER || 'root';
    const password = process.env.DB_PASS || '';
    const isSSL = process.env.DB_SSL === 'true' || process.env.TIDB_ENABLE_SSL === 'true';

    console.log(`Checking database '${dbName}' on ${host}:${port}...`);

    try {
        const connection = await mysql.createConnection({
            host,
            port,
            user,
            password,
            ssl: isSSL ? {
                minVersion: 'TLSv1.2',
                rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false'
            } : undefined
        });

        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`);
        console.log(`✓ Database '${dbName}' is ready.`);
        await connection.end();
    } catch (err) {
        console.warn(`Notice while checking database existence: ${err.message}`);
        // Proceed anyway in case user doesn't have CREATE DATABASE permission or DB already exists
    }
}

async function initDB() {
    console.log('--- Initializing LuLuSin Database ---');
    console.log(`Target: ${process.env.DB_HOST}:${process.env.DB_PORT || 3306} / ${process.env.DB_NAME}`);
    console.log(`SSL: ${process.env.DB_SSL === 'true' ? 'Enabled (TiDB Cloud)' : 'Disabled'}`);

    try {
        await ensureDatabaseExists();

        // Connect using Sequelize connection
        const { db, connectDB } = require('../config/database/connection');
        // Require controller to register all model associations
        require('../config/database/table/controler');

        await connectDB();

        console.log('Synchronizing schema tables...');
        await db.sync({ alter: false, force: false });
        console.log('✓ Tables synchronized successfully.');

        // Check if admin table already has data
        const [adminRows] = await db.query('SELECT COUNT(*) as count FROM admins;');
        const adminCount = adminRows[0]?.count || 0;

        if (parseInt(adminCount, 10) > 0) {
            console.log(`Database already has data (${adminCount} admins found). Skipping seeding.`);
            console.log('Ready for local testing or production use!');
            process.exit(0);
        }

        console.log('Database is empty. Running seeders in chronological order...');
        const seedersDir = path.join(__dirname, '..', 'seeders');
        const seederFiles = fs.readdirSync(seedersDir)
            .filter(file => file.endsWith('.js'))
            .sort();

        const queryInterface = db.getQueryInterface();

        for (const file of seederFiles) {
            console.log(`  -> Running seeder: ${file}`);
            const seeder = require(path.join(seedersDir, file));
            if (typeof seeder.up === 'function') {
                await seeder.up(queryInterface, Sequelize);
            }
        }

        console.log('✓ All seeders executed successfully!');
        console.log('Database initialization complete.');
        process.exit(0);
    } catch (error) {
        console.error('✗ Database initialization failed:', error.message);
        if (error.original) {
            console.error('Details:', error.original.message);
        }
        process.exit(1);
    }
}

initDB();
