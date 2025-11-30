
import React, { useState, useEffect } from 'react';
import { CardType, Expense, Purchaser, Card } from '../types';
import { analyzeExpense } from '../services/geminiService';

// ...

import { Button } from './Button';
import { api } from '../services/api';

interface ExpenseFormProps {
    onAddExpense: (expense: Expense) => void;
    onCancel: () => void;
    cardSettings?: Record<string, string>;
}

export const ExpenseForm: React.FC<ExpenseFormProps> = ({ onAddExpense, onCancel, cardSettings }) => {
    const [loading, setLoading] = useState(false);
    const [aiInsight, setAiInsight] = useState<string | null>(null);
    const [prompt, setPrompt] = useState('');

    const [formData, setFormData] = useState({
        description: '',
        location: '',
        amount: '',
        installments: 1,
        date: new Date().toISOString().split('T')[0],
        card: CardType.MASTERCARD,
        purchaser: 'Gustavo',
        category: 'Geral',
        observation: ''
    });

    const [cards, setCards] = useState<Card[]>([]);
    const [purchaserOptions, setPurchaserOptions] = useState<string[]>(['Gustavo', 'Larissa', 'Compartilhado']);
    const [isCustomPurchaser, setIsCustomPurchaser] = useState(false);

    useEffect(() => {
        loadCards();
        loadFamilyMembers();
    }, []);

    const loadFamilyMembers = async () => {
        try {
            const family = await api.getFamily();
            if (family && family.members) {
                // Filter out current user if needed, or just list all names
                // For simplicity, let's list all names + "Compartilhado"
                const names = family.members.map(m => m.name.split(' ')[0]); // First name only
                setPurchaserOptions([...names, 'Compartilhado']);
            }
        } catch (error) {
            console.error('Failed to load family', error);
        }
    };

    const loadCards = async () => {
        try {
            const data = await api.getCards();
            setCards(data);
            // Set default card if available and not set
            if (data.length > 0 && !formData.cardId) {
                setFormData(prev => ({ ...prev, cardId: data[0].id, card: data[0].name }));
            }
        } catch (error) {
            console.error('Failed to load cards', error);
        }
    };

    const handleAnalyze = async () => {
        if (!prompt) return;

        setLoading(true);
        setAiInsight(null);
        try {
            const result = await analyzeExpense(prompt);

            // Find matching card by type if possible, or just default
            const matchedCard = cards.find(c => c.type === result.card) || cards[0];

            setFormData({
                ...formData,
                description: result.description,
                amount: result.amount,
                category: result.category,
                card: matchedCard ? matchedCard.name : result.card,
                cardId: matchedCard ? matchedCard.id : undefined,
                purchaser: result.purchaser || 'Gustavo',
                date: new Date().toISOString().split('T')[0]
            });
            setAiInsight(`Sugestão: ${result.category} • ${result.card}`);
        } catch (error) {
            console.error('Error analyzing:', error);
            setAiInsight('Não foi possível analisar o texto. Tente preencher manualmente.');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Ensure cardId is set
        if (!formData.cardId && cards.length > 0) {
            // Fallback if user didn't select
            const defaultCard = cards[0];
            onAddExpense({
                ...formData,
                id: crypto.randomUUID(),
                card: defaultCard.name,
                cardId: defaultCard.id
            });
            return;
        }

        onAddExpense({
            ...formData,
            id: crypto.randomUUID()
        });
    };

    return (
        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 max-w-2xl mx-auto border border-zinc-100">
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-light text-zinc-900">Nova Despesa</h2>
                <button onClick={onCancel} className="text-zinc-400 hover:text-zinc-600 transition-colors">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>

            {/* AI Input */}
            <div className="mb-8 bg-zinc-50 p-4 rounded-xl border border-zinc-100">
                <label className="block text-sm font-medium text-zinc-700 mb-2">
                    ✨ Preenchimento Inteligente
                </label>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Ex: Almoço no Madero 150 reais no Nubank"
                        className="flex-1 bg-white border border-zinc-200 rounded-lg px-4 py-2.5 text-zinc-900 placeholder-zinc-400 focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 transition-all outline-none"
                        onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
                    />
                    <Button onClick={handleAnalyze} disabled={loading || !prompt}>
                        {loading ? '...' : 'Analisar'}
                    </Button>
                </div>
                {aiInsight && (
                    <div className="mt-2 text-sm text-emerald-600 flex items-center gap-1 animate-fade-in">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        {aiInsight}
                    </div>
                )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-xs uppercase tracking-wider text-zinc-500 font-medium">Descrição</label>
                        <input
                            required
                            type="text"
                            className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/10 transition-all"
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs uppercase tracking-wider text-zinc-500 font-medium">Local</label>
                        <input
                            type="text"
                            className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/10 transition-all"
                            value={formData.location}
                            onChange={e => setFormData({ ...formData, location: e.target.value })}
                            placeholder="Onde foi a compra?"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs uppercase tracking-wider text-zinc-500 font-medium">Valor (R$)</label>
                        <input
                            required
                            type="number"
                            step="0.01"
                            className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/10 transition-all"
                            value={formData.amount}
                            onChange={e => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs uppercase tracking-wider text-zinc-500 font-medium">Data</label>
                        <input
                            required
                            type="date"
                            className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/10 transition-all"
                            value={formData.date}
                            onChange={e => setFormData({ ...formData, date: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs uppercase tracking-wider text-zinc-500 font-medium">Cartão</label>
                        <select
                            className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/10 transition-all"
                            value={formData.cardId || ''}
                            onChange={e => {
                                const selected = cards.find(c => c.id === e.target.value);
                                if (selected) {
                                    setFormData({ ...formData, cardId: selected.id, card: selected.name });
                                }
                            }}
                        >
                            <option value="">Selecione...</option>
                            {cards.map(card => (
                                <option key={card.id} value={card.id}>{card.name} ({card.type})</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs uppercase tracking-wider text-zinc-500 font-medium">Parcelas</label>
                        <select
                            className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-3 text-zinc-900 focus:ring-2 focus:ring-zinc-300 focus:border-transparent outline-none transition-all"
                            value={formData.installments}
                            onChange={e => setFormData({ ...formData, installments: parseInt(e.target.value) })}
                        >
                            {[...Array(24)].map((_, i) => (
                                <option key={i} value={i + 1}>{i + 1}x {i === 0 ? '(À vista)' : ''}</option>
                            ))}
                        </select>
                    </div>



                    <div className="space-y-2">
                        <label className="text-xs uppercase tracking-wider text-zinc-500 font-medium">Quem comprou?</label>
                        <div className="grid grid-cols-2 gap-2 bg-zinc-50 rounded-lg p-2 border border-zinc-200">
                            {purchaserOptions.map(p => (
                                <button
                                    key={p}
                                    type="button"
                                    onClick={() => {
                                        setFormData({ ...formData, purchaser: p });
                                        setIsCustomPurchaser(false);
                                    }}
                                    className={`py-2 px-3 text-sm rounded-md transition-all truncate ${formData.purchaser === p && !isCustomPurchaser
                                        ? 'bg-white text-zinc-900 shadow border border-zinc-100 font-medium'
                                        : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100'
                                        } `}
                                    title={p}
                                >
                                    {p}
                                </button>
                            ))}
                            <button
                                type="button"
                                onClick={() => {
                                    setIsCustomPurchaser(true);
                                    setFormData({ ...formData, purchaser: '' });
                                }}
                                className={`py-2 px-3 text-sm rounded-md transition-all ${isCustomPurchaser
                                    ? 'bg-white text-zinc-900 shadow border border-zinc-100 font-medium'
                                    : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100'
                                    } `}
                            >
                                Outro
                            </button>
                        </div>
                        {isCustomPurchaser && (
                            <input
                                type="text"
                                autoFocus
                                placeholder="Digite o nome de quem comprou..."
                                className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/10 transition-all animate-fade-in"
                                value={formData.purchaser}
                                onChange={e => setFormData({ ...formData, purchaser: e.target.value })}
                            />
                        )}
                    </div>



                    <div className="col-span-1 md:col-span-2 space-y-2">
                        <label className="text-xs uppercase tracking-wider text-zinc-500 font-medium">Observação (Opcional)</label>
                        <textarea
                            className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-3 text-zinc-900 focus:ring-2 focus:ring-zinc-300 focus:border-transparent outline-none transition-all placeholder-zinc-400 resize-none h-24"
                            placeholder="Detalhes adicionais sobre a compra..."
                            value={formData.observation}
                            onChange={e => setFormData({ ...formData, observation: e.target.value })}
                        />
                    </div>
                </div>

                <div className="pt-6 flex justify-end gap-3 border-t border-zinc-100">
                    <Button type="button" variant="secondary" onClick={onCancel}>
                        Cancelar
                    </Button>
                    <Button type="submit" isLoading={loading}>
                        Salvar Despesa
                    </Button>
                </div>
            </form>
        </div>
    );
};