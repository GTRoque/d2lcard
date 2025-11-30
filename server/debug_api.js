import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = join(__dirname, 'database.sqlite');

const db = new sqlite3.Database(dbPath);

// Simulate the query used in the API for a family user
// We need to find a user ID first. Let's pick one from the previous debug output if possible, or just query users.
db.get(`SELECT id, familyId FROM users LIMIT 1`, [], (err, user) => {
    if (err) {
        console.error(err);
        return;
    }
    console.log('Test User:', user);

    if (user && user.familyId) {
        const query = `
            SELECT e.*, c.name as cardName, c.type as cardType, c.color as cardColor, c.closingDay as cardClosingDay, c.dueDay as cardDueDay
            FROM expenses e 
            LEFT JOIN cards c ON e.cardId = c.id 
            WHERE e.userId IN (SELECT id FROM users WHERE familyId = ?)
            AND (e.description LIKE '%Mercado Livre%' OR e.description LIKE '%Casa Tudo%')
            ORDER BY e.date DESC
        `;

        db.all(query, [user.familyId], (err, rows) => {
            if (err) {
                console.error(err);
            } else {
                const expenses = rows.map(r => ({
                    description: r.description,
                    date: r.date,
                    cardId: r.cardId,
                    cardClosingDayRaw: r.cardClosingDay,
                    cardDetails: {
                        closingDay: r.cardClosingDay || 18,
                        dueDay: r.cardDueDay || 27,
                        color: r.cardColor
                    }
                }));
                console.log('Simulated API Response:', JSON.stringify(expenses, null, 2));
            }
        });
    } else {
        console.log('User not in family, skipping family query test.');
    }
});
