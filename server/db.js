import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { randomUUID } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, 'database.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    initDb();
  }
});

function initDb() {
  db.serialize(() => {
    // Users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Expenses table
    db.run(`CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      description TEXT NOT NULL,
      location TEXT,
      amount REAL NOT NULL,
      installments INTEGER NOT NULL,
      date TEXT NOT NULL,
      card TEXT NOT NULL,
      purchaser TEXT NOT NULL,
      category TEXT NOT NULL,
      isRecurring INTEGER DEFAULT 0,
      observation TEXT,
      FOREIGN KEY (userId) REFERENCES users (id)
    )`);

    // Add observation column if it doesn't exist (for existing DBs)
    db.run(`ALTER TABLE expenses ADD COLUMN observation TEXT`, (err) => {
      // Ignore error if column already exists
    });

    // Cards table
    db.run(`CREATE TABLE IF NOT EXISTS cards (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      type TEXT NOT NULL,
      name TEXT NOT NULL,
      closingDay INTEGER NOT NULL,
      dueDay INTEGER NOT NULL,
      color TEXT,
      FOREIGN KEY (userId) REFERENCES users (id)
    )`);

    // Families table
    db.run(`CREATE TABLE IF NOT EXISTS families (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      inviteCode TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Add familyId to users if it doesn't exist
    db.run(`ALTER TABLE users ADD COLUMN familyId TEXT`, (err) => {
      // Ignore error if column already exists
    });

    // Add cardId to expenses if it doesn't exist
    db.run(`ALTER TABLE expenses ADD COLUMN cardId TEXT`, (err) => {
      if (!err) {
        console.log('Migrating expenses to use cardId...');
        db.all(`SELECT DISTINCT userId, card FROM expenses WHERE cardId IS NULL`, [], (err, rows) => {
          if (err || !rows) return;

          rows.forEach(row => {
            const newCardId = randomUUID();
            const cardType = row.card;
            const cardName = row.card; // Use type as name initially

            // Create card
            db.run(`INSERT INTO cards (id, userId, type, name, closingDay, dueDay, color) VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [newCardId, row.userId, cardType, cardName, 18, 27, '#000000'],
              (err) => {
                if (!err) {
                  // Update expenses
                  db.run(`UPDATE expenses SET cardId = ? WHERE userId = ? AND card = ?`, [newCardId, row.userId, cardType]);
                }
              }
            );
          });
        });
      }
    });

    // Rename Purchasers Migration
    db.run(`UPDATE expenses SET purchaser = 'Gustavo' WHERE purchaser = 'Você'`, function (err) {
      if (!err && this.changes > 0) console.log('Migrated purchaser Você -> Gustavo');
    });
    db.run(`UPDATE expenses SET purchaser = 'Larissa' WHERE purchaser = 'Parceiro(a)'`, function (err) {
      if (!err && this.changes > 0) console.log('Migrated purchaser Parceiro(a) -> Larissa');
    });
  });
}

export default db;
