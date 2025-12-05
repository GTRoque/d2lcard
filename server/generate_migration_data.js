import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = join(__dirname, 'database.sqlite');
const outputPath = join(__dirname, '..', 'supabase_data.sql');

const db = new sqlite3.Database(dbPath);

const escape = (val) => {
    if (val === null || val === undefined) return 'NULL';
    if (typeof val === 'number') return val;
    if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
    // Escape single quotes for SQL
    return `'${String(val).replace(/'/g, "''")}'`;
};

const generateInserts = async () => {
    const stream = fs.createWriteStream(outputPath);

    stream.write('-- Data Migration Script\n');
    stream.write('BEGIN;\n\n');

    // 1. Families
    await new Promise((resolve, reject) => {
        db.all('SELECT * FROM families', [], (err, rows) => {
            if (err) return reject(err);
            if (rows.length > 0) {
                stream.write('-- Families\n');
                rows.forEach(row => {
                    stream.write(`INSERT INTO families (id, name, "inviteCode", created_at) VALUES (${escape(row.id)}, ${escape(row.name)}, ${escape(row.inviteCode)}, ${escape(row.created_at || new Date().toISOString())}) ON CONFLICT (id) DO NOTHING;\n`);
                });
                stream.write('\n');
            }
            resolve();
        });
    });

    // 2. Users
    await new Promise((resolve, reject) => {
        db.all('SELECT * FROM users', [], (err, rows) => {
            if (err) return reject(err);
            if (rows.length > 0) {
                stream.write('-- Users\n');
                rows.forEach(row => {
                    stream.write(`INSERT INTO users (id, name, email, password, "familyId", created_at) VALUES (${escape(row.id)}, ${escape(row.name)}, ${escape(row.email)}, ${escape(row.password)}, ${escape(row.familyId)}, ${escape(row.created_at || new Date().toISOString())}) ON CONFLICT (id) DO NOTHING;\n`);
                });
                stream.write('\n');
            }
            resolve();
        });
    });

    // 3. Cards
    await new Promise((resolve, reject) => {
        db.all('SELECT * FROM cards', [], (err, rows) => {
            if (err) return reject(err);
            if (rows.length > 0) {
                stream.write('-- Cards\n');
                rows.forEach(row => {
                    stream.write(`INSERT INTO cards (id, "userId", type, name, "closingDay", "dueDay", color) VALUES (${escape(row.id)}, ${escape(row.userId)}, ${escape(row.type)}, ${escape(row.name)}, ${escape(row.closingDay)}, ${escape(row.dueDay)}, ${escape(row.color)}) ON CONFLICT (id) DO NOTHING;\n`);
                });
                stream.write('\n');
            }
            resolve();
        });
    });

    // 4. Expenses
    await new Promise((resolve, reject) => {
        db.all('SELECT * FROM expenses', [], (err, rows) => {
            if (err) return reject(err);
            if (rows.length > 0) {
                stream.write('-- Expenses\n');
                rows.forEach(row => {
                    stream.write(`INSERT INTO expenses (id, "userId", description, location, amount, installments, date, card, "cardId", purchaser, category, "isRecurring", observation) VALUES (${escape(row.id)}, ${escape(row.userId)}, ${escape(row.description)}, ${escape(row.location)}, ${escape(row.amount)}, ${escape(row.installments)}, ${escape(row.date)}, ${escape(row.card)}, ${escape(row.cardId)}, ${escape(row.purchaser)}, ${escape(row.category)}, ${escape(!!row.isRecurring)}, ${escape(row.observation)}) ON CONFLICT (id) DO NOTHING;\n`);
                });
                stream.write('\n');
            }
            resolve();
        });
    });

    stream.write('COMMIT;\n');
    stream.end();
    console.log('Migration file created at:', outputPath);
};

generateInserts().catch(console.error);
