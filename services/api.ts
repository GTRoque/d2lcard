import { AuthResponse, Expense, User, CardSetting, Card, Family } from '../types';

const API_URL = '/api';

const getHeaders = () => {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
};

export const api = {
    async login(email: string, password: string): Promise<AuthResponse> {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Login failed');
        }
        return response.json();
    },

    async register(name: string, email: string, password: string): Promise<AuthResponse> {
        const response = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password }),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Registration failed');
        }
        return response.json();
    },

    async getExpenses(): Promise<Expense[]> {
        const response = await fetch(`${API_URL}/expenses`, {
            headers: getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to fetch expenses');
        return response.json();
    },

    async createExpense(expense: Omit<Expense, 'id'>): Promise<Expense> {
        const response = await fetch(`${API_URL}/expenses`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(expense),
        });
        if (!response.ok) throw new Error('Failed to create expense');
        return response.json();
    },

    async getCards(): Promise<Card[]> {
        const response = await fetch(`${API_URL}/cards`, {
            headers: getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to fetch cards');
        return response.json();
    },

    async createCard(card: Omit<Card, 'id' | 'userId'>): Promise<Card> {
        const response = await fetch(`${API_URL}/cards`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(card),
        });
        if (!response.ok) throw new Error('Failed to create card');
        return response.json();
    },

    async updateCard(id: string, card: Partial<Card>): Promise<Card> {
        const response = await fetch(`${API_URL}/cards/${id}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(card),
        });
        if (!response.ok) throw new Error('Failed to update card');
        return response.json();
    },

    async deleteCard(id: string): Promise<void> {
        const response = await fetch(`${API_URL}/cards/${id}`, {
            method: 'DELETE',
            headers: getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to delete card');
    },

    // Family Methods
    async createFamily(name: string): Promise<Family> {
        const response = await fetch(`${API_URL}/family/create`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ name }),
        });
        if (!response.ok) throw new Error('Failed to create family');
        return response.json();
    },

    async joinFamily(inviteCode: string): Promise<Family> {
        const response = await fetch(`${API_URL}/family/join`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ inviteCode }),
        });
        if (!response.ok) throw new Error('Failed to join family');
        return response.json();
    },

    async getFamily(): Promise<Family | null> {
        const response = await fetch(`${API_URL}/family`, {
            headers: getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to fetch family');
        return response.json();
    },

    // Deprecated/Legacy
    async getCardSettings(): Promise<CardSetting[]> {
        const response = await fetch(`${API_URL}/cards/settings`, {
            headers: getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to fetch card settings');
        return response.json();
    },

    async updateCardSetting(card: string, nickname: string): Promise<CardSetting> {
        const response = await fetch(`${API_URL}/cards/settings`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ card, nickname }),
        });
        if (!response.ok) throw new Error('Failed to update card setting');
        return response.json();
    },
};
