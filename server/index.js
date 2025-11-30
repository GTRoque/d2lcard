import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import db from './db.js';

const app = express();
const PORT = 3001;
const SECRET_KEY = 'super-secret-key-change-this-later';

app.use(cors());
app.use(express.json());

// Middleware to verify token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// Auth Routes
app.post('/api/register', (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ error: 'Missing fields' });
    }

    const hashedPassword = bcrypt.hashSync(password, 8);
    const id = randomUUID();

    db.run(
        `INSERT INTO users (id, name, email, password) VALUES (?, ?, ?, ?)`,
        [id, name, email, hashedPassword],
        function (err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(400).json({ error: 'Email already exists' });
                }
                return res.status(500).json({ error: err.message });
            }
            const token = jwt.sign({ id, email, name }, SECRET_KEY, { expiresIn: '24h' });
            res.json({ token, user: { id, name, email } });
        }
    );
});

app.post('/api/login', (req, res) => {
    const { email, password } = req.body;

    db.get(`SELECT * FROM users WHERE email = ?`, [email], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const passwordIsValid = bcrypt.compareSync(password, user.password);
        if (!passwordIsValid) return res.status(401).json({ token: null, error: 'Invalid password' });

        const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, SECRET_KEY, {
            expiresIn: '24h',
        });

        res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
    });
});

// Family Routes
app.post('/api/family/create', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const { name } = req.body;
    const id = randomUUID();
    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    db.run(
        `INSERT INTO families (id, name, inviteCode) VALUES (?, ?, ?)`,
        [id, name, inviteCode],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });

            db.run(`UPDATE users SET familyId = ? WHERE id = ?`, [id, userId], (err) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ id, name, inviteCode });
            });
        }
    );
});

app.post('/api/family/join', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const { inviteCode } = req.body;

    db.get(`SELECT id, name FROM families WHERE inviteCode = ?`, [inviteCode], (err, family) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!family) return res.status(404).json({ error: 'Invalid invite code' });

        db.run(`UPDATE users SET familyId = ? WHERE id = ?`, [family.id, userId], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(family);
        });
    });
});

app.get('/api/family', authenticateToken, (req, res) => {
    const userId = req.user.id;

    db.get(`SELECT familyId FROM users WHERE id = ?`, [userId], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user || !user.familyId) return res.json(null);

        db.get(`SELECT * FROM families WHERE id = ?`, [user.familyId], (err, family) => {
            if (err) return res.status(500).json({ error: err.message });

            db.all(`SELECT id, name, email FROM users WHERE familyId = ?`, [user.familyId], (err, members) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ ...family, members });
            });
        });
    });
});

// Expenses Routes
app.get('/api/expenses', authenticateToken, (req, res) => {
    const userId = req.user.id;

    // Check if user is in a family
    db.get(`SELECT familyId FROM users WHERE id = ?`, [userId], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });

        let query = `
            SELECT e.*, c.name as cardName, c.type as cardType, c.color as cardColor, c.closingDay as cardClosingDay, c.dueDay as cardDueDay
            FROM expenses e 
            LEFT JOIN cards c ON e.cardId = c.id 
            WHERE e.userId = ?
            ORDER BY e.date DESC
        `;
        let params = [userId];

        if (user && user.familyId) {
            query = `
                SELECT e.*, c.name as cardName, c.type as cardType, c.color as cardColor, c.closingDay as cardClosingDay, c.dueDay as cardDueDay
                FROM expenses e 
                LEFT JOIN cards c ON e.cardId = c.id 
                WHERE e.userId IN (SELECT id FROM users WHERE familyId = ?)
                ORDER BY e.date DESC
            `;
            params = [user.familyId];
        }

        db.all(query, params, (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });

            const expenses = rows.map(r => ({
                ...r,
                isRecurring: !!r.isRecurring,
                // Fallback for old data or if join fails
                card: r.cardName || r.card,
                cardDetails: {
                    closingDay: r.cardClosingDay || 18, // Default fallback
                    dueDay: r.cardDueDay || 27,
                    color: r.cardColor
                }
            }));
            res.json(expenses);
        });
    });
});

app.post('/api/expenses', authenticateToken, (req, res) => {
    const { description, location, amount, installments, date, cardId, purchaser, category, isRecurring, observation } = req.body;
    const id = randomUUID();
    const userId = req.user.id;

    // We still need 'card' for backward compatibility or we can derive it from cardId if needed.
    // But for now, let's assume the frontend sends cardId.
    // We might want to fetch the card details to store the 'card' string if we want to keep that column populated for safety,
    // or just rely on the join. Let's rely on the join but we need to handle the 'card' column constraint if it's NOT NULL.
    // The schema says 'card TEXT NOT NULL'. So we must provide a value.

    db.get(`SELECT type, name FROM cards WHERE id = ?`, [cardId], (err, cardRow) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!cardRow) return res.status(400).json({ error: 'Invalid cardId' });

        const cardName = cardRow.name; // Use name as the 'card' string value

        db.run(
            `INSERT INTO expenses (id, userId, description, location, amount, installments, date, card, cardId, purchaser, category, isRecurring, observation) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, userId, description, location, amount, installments, date, cardName, cardId, purchaser, category, isRecurring ? 1 : 0, observation],
            function (err) {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ id, userId, description, location, amount, installments, date, card: cardName, cardId, purchaser, category, isRecurring, observation });
            }
        );
    });
});

// Card Routes
app.get('/api/cards', authenticateToken, (req, res) => {
    const userId = req.user.id;

    db.get(`SELECT familyId FROM users WHERE id = ?`, [userId], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });

        let query = `SELECT * FROM cards WHERE userId = ?`;
        let params = [userId];

        if (user && user.familyId) {
            query = `SELECT * FROM cards WHERE userId IN (SELECT id FROM users WHERE familyId = ?)`;
            params = [user.familyId];
        }

        db.all(query, params, (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        });
    });
});

app.post('/api/cards', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const { type, name, closingDay, dueDay, color } = req.body;
    const id = randomUUID();

    if (!type || !name || !closingDay || !dueDay) {
        return res.status(400).json({ error: 'Missing fields' });
    }

    db.run(
        `INSERT INTO cards (id, userId, type, name, closingDay, dueDay, color) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, userId, type, name, closingDay, dueDay, color],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id, userId, type, name, closingDay, dueDay, color });
        }
    );
});

app.put('/api/cards/:id', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;
    const { name, closingDay, dueDay, color } = req.body;

    db.run(
        `UPDATE cards SET name = ?, closingDay = ?, dueDay = ?, color = ? WHERE id = ? AND userId = ?`,
        [name, closingDay, dueDay, color, id, userId],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ id, userId, name, closingDay, dueDay, color });
        }
    );
});

app.delete('/api/cards/:id', authenticateToken, (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;

    db.run(`DELETE FROM cards WHERE id = ? AND userId = ?`, [id, userId], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Card deleted' });
    });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
