import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import pkg from 'pg';
const { Pool } = pkg;

// --- CONFIGURAÇÃO DO SUPABASE (POSTGRESQL) ---
// O Vercel injetará process.env.DATABASE_URL
const DATABASE_URL = process.env.DATABASE_URL;

const pool = new Pool({
    connectionString: DATABASE_URL,
});

pool.on('connect', () => {
    console.log('Conectado com sucesso ao Supabase (PostgreSQL)!');
});

pool.on('error', (err) => {
    console.error('Erro inesperado no pool do PostgreSQL:', err);
});

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

// --- AUTH ROUTES ---

app.post('/api/register', async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ error: 'Missing fields' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 8);
        const id = randomUUID();

        // PostgreSQL Query: INSERT
        const result = await pool.query(
            `INSERT INTO users (id, name, email, senha) VALUES ($1, $2, $3, $4) RETURNING id, name, email`,
            [id, name, email, hashedPassword]
        );

        // Se a inserção falhar (ex: email duplicado), o erro é capturado no catch

        const user = result.rows[0];
        const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, SECRET_KEY, { expiresIn: '24h' });

        res.json({ token, user: { id: user.id, name: user.name, email: user.email } });

    } catch (err) {
        console.error('Erro de Registro:', err.message);
        // Trata erro de email duplicado (código SQL 23505 = unique constraint violation)
        if (err.code === '23505') {
            return res.status(400).json({ error: 'Email already exists' });
        }
        res.status(500).json({ error: 'Erro interno ao registrar usuário.' });
    }
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // PostgreSQL Query: SELECT
        const result = await pool.query(`SELECT id, name, email, senha FROM users WHERE email = $1`, [email]);
        const user = result.rows[0];

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // bcrypt.compare() é uma função async
        const passwordIsValid = await bcrypt.compare(password, user.senha);

        if (!passwordIsValid) {
            return res.status(401).json({ token: null, error: 'Invalid password' });
        }

        const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, SECRET_KEY, {
            expiresIn: '24h',
        });

        res.json({ token, user: { id: user.id, name: user.name, email: user.email } });

    } catch (err) {
        console.error('Erro de Login:', err.message);
        res.status(500).json({ error: 'Erro interno ao tentar login.' });
    }
});

// --- FAMILY ROUTES ---

app.post('/api/family/create', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const { name } = req.body;
    const id = randomUUID();
    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    try {
        // 1. INSERT na tabela families
        await pool.query(
            `INSERT INTO families (id, name, "inviteCode") VALUES ($1, $2, $3)`,
            [id, name, inviteCode]
        );

        // 2. UPDATE na tabela users para ligar o usuário à família
        await pool.query(`UPDATE users SET "familyId" = $1 WHERE id = $2`, [id, userId]);

        res.json({ id, name, inviteCode });

    } catch (err) {
        console.error('Erro ao criar família:', err.message);
        res.status(500).json({ error: 'Erro interno ao criar família.' });
    }
});

app.post('/api/family/join', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const { inviteCode } = req.body;

    try {
        // 1. Buscar a família pelo inviteCode
        const familyResult = await pool.query(`SELECT id, name FROM families WHERE "inviteCode" = $1`, [inviteCode]);
        const family = familyResult.rows[0];

        if (!family) {
            return res.status(404).json({ error: 'Invalid invite code' });
        }

        // 2. UPDATE na tabela users para ligar o usuário à família
        await pool.query(`UPDATE users SET "familyId" = $1 WHERE id = $2`, [family.id, userId]);

        res.json(family);

    } catch (err) {
        console.error('Erro ao juntar família:', err.message);
        res.status(500).json({ error: 'Erro interno ao juntar família.' });
    }
});

app.get('/api/family', authenticateToken, async (req, res) => {
    const userId = req.user.id;

    try {
        // 1. Buscar familyId do usuário
        const userResult = await pool.query(`SELECT "familyId" FROM users WHERE id = $1`, [userId]);
        const user = userResult.rows[0];

        if (!user || !user.familyId) {
            return res.json(null);
        }

        // 2. Buscar detalhes da família
        const familyResult = await pool.query(`SELECT * FROM families WHERE id = $1`, [user.familyId]);
        const family = familyResult.rows[0];

        // 3. Buscar membros da família
        const membersResult = await pool.query(`SELECT id, name, email FROM users WHERE "familyId" = $1`, [user.familyId]);
        const members = membersResult.rows;

        res.json({ ...family, members });

    } catch (err) {
        console.error('Erro ao obter família:', err.message);
        res.status(500).json({ error: 'Erro interno ao obter dados da família.' });
    }
});

// --- EXPENSES ROUTES ---

app.get('/api/expenses', authenticateToken, async (req, res) => {
    const userId = req.user.id;

    try {
        // 1. Check if user is in a family
        const userResult = await pool.query(`SELECT "familyId" FROM users WHERE id = $1`, [userId]);
        const user = userResult.rows[0];

        let query;
        let params;

        if (user && user.familyId) {
            // Se tem família: busca despesas de todos os membros da família
            query = `
                SELECT e.*, c.name as "cardName", c.type as "cardType", c.color as "cardColor", c."closingDay" as "cardClosingDay", c."dueDay" as "cardDueDay"
                FROM expenses e 
                LEFT JOIN cards c ON e."cardId" = c.id 
                WHERE e."userId" IN (SELECT id FROM users WHERE "familyId" = $1)
                ORDER BY e.date DESC
            `;
            params = [user.familyId];
        } else {
            // Se não tem família: busca despesas apenas do usuário
            query = `
                SELECT e.*, c.name as "cardName", c.type as "cardType", c.color as "cardColor", c."closingDay" as "cardClosingDay", c."dueDay" as "cardDueDay"
                FROM expenses e 
                LEFT JOIN cards c ON e."cardId" = c.id 
                WHERE e."userId" = $1
                ORDER BY e.date DESC
            `;
            params = [userId];
        }

        const result = await pool.query(query, params);
        const rows = result.rows;

        const expenses = rows.map(r => ({
            ...r,
            isRecurring: !!r.isRecurring,
            card: r.cardName || r.card,
            cardDetails: {
                closingDay: r.cardClosingDay || 18,
                dueDay: r.cardDueDay || 27,
                color: r.cardColor
            }
        }));

        res.json(expenses);

    } catch (err) {
        console.error('Erro ao obter despesas:', err.message);
        res.status(500).json({ error: 'Erro interno ao obter despesas.' });
    }
});

app.post('/api/expenses', authenticateToken, async (req, res) => {
    const { description, location, amount, installments, date, cardId, purchaser, category, isRecurring, observation } = req.body;
    const id = randomUUID();
    const userId = req.user.id;

    try {
        // 1. Buscar cardName para manter compatibilidade com a coluna 'card'
        const cardResult = await pool.query(`SELECT type, name FROM cards WHERE id = $1`, [cardId]);
        const cardRow = cardResult.rows[0];

        if (!cardRow) {
            return res.status(400).json({ error: 'Invalid cardId' });
        }

        const cardName = cardRow.name;

        // 2. INSERT na tabela expenses
        await pool.query(
            `INSERT INTO expenses (id, "userId", description, location, amount, installments, date, card, "cardId", purchaser, category, "isRecurring", observation) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
            [id, userId, description, location, amount, installments, date, cardName, cardId, purchaser, category, isRecurring ? true : false, observation]
        );

        res.json({ id, userId, description, location, amount, installments, date, card: cardName, cardId, purchaser, category, isRecurring, observation });

    } catch (err) {
        console.error('Erro ao criar despesa:', err.message);
        res.status(500).json({ error: 'Erro interno ao criar despesa.' });
    }
});

// --- CARD ROUTES ---

app.get('/api/cards', authenticateToken, async (req, res) => {
    const userId = req.user.id;

    try {
        // 1. Buscar familyId do usuário
        const userResult = await pool.query(`SELECT "familyId" FROM users WHERE id = $1`, [userId]);
        const user = userResult.rows[0];

        let query;
        let params;

        if (user && user.familyId) {
            // Se tem família: busca cartões de todos os membros da família
            query = `SELECT * FROM cards WHERE "userId" IN (SELECT id FROM users WHERE "familyId" = $1)`;
            params = [user.familyId];
        } else {
            // Se não tem família: busca cartões apenas do usuário
            query = `SELECT * FROM cards WHERE "userId" = $1`;
            params = [userId];
        }

        const result = await pool.query(query, params);
        res.json(result.rows);

    } catch (err) {
        console.error('Erro ao obter cartões:', err.message);
        res.status(500).json({ error: 'Erro interno ao obter cartões.' });
    }
});

app.post('/api/cards', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const { type, name, closingDay, dueDay, color } = req.body;
    const id = randomUUID();

    if (!type || !name || !closingDay || !dueDay) {
        return res.status(400).json({ error: 'Missing fields' });
    }

    try {
        // INSERT na tabela cards
        await pool.query(
            `INSERT INTO cards (id, "userId", type, name, "closingDay", "dueDay", color) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [id, userId, type, name, closingDay, dueDay, color]
        );

        res.json({ id, userId, type, name, closingDay, dueDay, color });

    } catch (err) {
        console.error('Erro ao criar cartão:', err.message);
        res.status(500).json({ error: 'Erro interno ao criar cartão.' });
    }
});

app.put('/api/cards/:id', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;
    const { name, closingDay, dueDay, color } = req.body;

    try {
        // UPDATE na tabela cards
        await pool.query(
            `UPDATE cards SET name = $1, "closingDay" = $2, "dueDay" = $3, color = $4 WHERE id = $5 AND "userId" = $6`,
            [name, closingDay, dueDay, color, id, userId]
        );

        res.json({ id, userId, name, closingDay, dueDay, color });

    } catch (err) {
        console.error('Erro ao atualizar cartão:', err.message);
        res.status(500).json({ error: 'Erro interno ao atualizar cartão.' });
    }
});

app.delete('/api/cards/:id', authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;

    try {
        // DELETE na tabela cards
        await pool.query(`DELETE FROM cards WHERE id = $1 AND "userId" = $2`, [id, userId]);

        res.json({ message: 'Card deleted' });

    } catch (err) {
        console.error('Erro ao deletar cartão:', err.message);
        res.status(500).json({ error: 'Erro interno ao deletar cartão.' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});