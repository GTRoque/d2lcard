import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = join(__dirname, 'database.sqlite');

const db = new sqlite3.Database(dbPath);

db.all(`SELECT e.id, e.description, e.date, e.cardId, e.installments, c.name as cardName, c.closingDay 
        FROM expenses e 
        LEFT JOIN cards c ON e.cardId = c.id
        WHERE e.description LIKE '%Mercado Livre%' OR e.description LIKE '%Casa Tudo%'`, [], (err, rows) => {
    if (err) {
        console.error(err);
    } else {
        console.log('Target Expenses:', JSON.stringify(rows, null, 2));
    }
});
