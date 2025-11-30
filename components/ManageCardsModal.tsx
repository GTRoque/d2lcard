import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Card } from '../types';
import { FamilySettings } from './FamilySettings';

interface ManageCardsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCardsUpdated: () => void;
}

export const ManageCardsModal: React.FC<ManageCardsModalProps> = ({ isOpen, onClose, onCardsUpdated }) => {
    const [activeTab, setActiveTab] = useState<'cards' | 'family'>('cards');
    const [cards, setCards] = useState<Card[]>([]);
    const [loading, setLoading] = useState(false);
    const [editingCard, setEditingCard] = useState<Card | null>(null);

    // New Card State
    const [newCardName, setNewCardName] = useState('');
    const [newCardType, setNewCardType] = useState('credit');
    const [newCardClosingDay, setNewCardClosingDay] = useState(18);
    const [newCardDueDay, setNewCardDueDay] = useState(27);
    const [newCardColor, setNewCardColor] = useState('#000000');

    useEffect(() => {
        if (isOpen && activeTab === 'cards') {
            loadCards();
        }
    }, [isOpen, activeTab]);

    const loadCards = async () => {
        setLoading(true);
        try {
            const data = await api.getCards();
            setCards(data);
        } catch (error) {
            console.error('Failed to load cards', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveCard = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingCard) {
                await api.updateCard(editingCard.id, {
                    name: newCardName,
                    closingDay: newCardClosingDay,
                    dueDay: newCardDueDay,
                    color: newCardColor
                });
            } else {
                await api.createCard({
                    type: newCardType,
                    name: newCardName,
                    closingDay: newCardClosingDay,
                    dueDay: newCardDueDay,
                    color: newCardColor
                });
            }
            setEditingCard(null);
            resetForm();
            loadCards();
            onCardsUpdated();
        } catch (error) {
            console.error('Failed to save card', error);
        }
    };

    const handleDeleteCard = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este cartão?')) return;
        try {
            await api.deleteCard(id);
            loadCards();
            onCardsUpdated();
        } catch (error) {
            console.error('Failed to delete card', error);
        }
    };

    const startEditing = (card: Card) => {
        setEditingCard(card);
        setNewCardName(card.name);
        setNewCardType(card.type);
        setNewCardClosingDay(card.closingDay);
        setNewCardDueDay(card.dueDay);
        setNewCardColor(card.color || '#000000');
    };

    const resetForm = () => {
        setNewCardName('');
        setNewCardType('credit');
        setNewCardClosingDay(18);
        setNewCardDueDay(27);
        setNewCardColor('#000000');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                <div className="p-6 border-b border-zinc-100 flex justify-between items-center bg-zinc-50">
                    <h2 className="text-xl font-light text-zinc-900">Configurações</h2>
                    <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-zinc-100">
                    <button
                        onClick={() => setActiveTab('cards')}
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'cards' ? 'border-b-2 border-zinc-900 text-zinc-900' : 'text-zinc-500 hover:text-zinc-700'}`}
                    >
                        Gerenciar Cartões
                    </button>
                    <button
                        onClick={() => setActiveTab('family')}
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'family' ? 'border-b-2 border-zinc-900 text-zinc-900' : 'text-zinc-500 hover:text-zinc-700'}`}
                    >
                        Grupo Familiar
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                    {activeTab === 'family' ? (
                        <FamilySettings />
                    ) : (
                        <div className="space-y-8">
                            {/* Form */}
                            <form onSubmit={handleSaveCard} className="space-y-4 bg-zinc-50 p-4 rounded-xl border border-zinc-100">
                                <h3 className="text-sm font-medium text-zinc-900 uppercase tracking-wider mb-2">
                                    {editingCard ? 'Editar Cartão' : 'Novo Cartão'}
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-zinc-500 mb-1">Nome do Cartão</label>
                                        <input
                                            type="text"
                                            value={newCardName}
                                            onChange={(e) => setNewCardName(e.target.value)}
                                            className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-800"
                                            placeholder="Ex: Nubank Black"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-zinc-500 mb-1">Cor (Hex)</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="color"
                                                value={newCardColor}
                                                onChange={(e) => setNewCardColor(e.target.value)}
                                                className="h-9 w-12 rounded cursor-pointer border border-zinc-200 p-0.5"
                                            />
                                            <input
                                                type="text"
                                                value={newCardColor}
                                                onChange={(e) => setNewCardColor(e.target.value)}
                                                className="flex-1 px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-800 uppercase"
                                                pattern="^#[0-9A-Fa-f]{6}$"
                                                placeholder="#000000"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-zinc-500 mb-1">Dia Fechamento</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="31"
                                            value={newCardClosingDay}
                                            onChange={(e) => setNewCardClosingDay(parseInt(e.target.value))}
                                            className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-800"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-zinc-500 mb-1">Dia Vencimento</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="31"
                                            value={newCardDueDay}
                                            onChange={(e) => setNewCardDueDay(parseInt(e.target.value))}
                                            className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-800"
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end gap-2 pt-2">
                                    {editingCard && (
                                        <button
                                            type="button"
                                            onClick={() => { setEditingCard(null); resetForm(); }}
                                            className="px-4 py-2 text-zinc-600 text-sm hover:bg-zinc-100 rounded-lg transition-colors"
                                        >
                                            Cancelar
                                        </button>
                                    )}
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-zinc-900 text-white text-sm font-medium rounded-lg hover:bg-zinc-800 transition-colors shadow-sm"
                                    >
                                        {editingCard ? 'Salvar Alterações' : 'Adicionar Cartão'}
                                    </button>
                                </div>
                            </form>

                            {/* List */}
                            <div className="space-y-3">
                                <h3 className="text-sm font-medium text-zinc-900 uppercase tracking-wider">Seus Cartões</h3>
                                {loading ? (
                                    <p className="text-zinc-400 text-sm">Carregando...</p>
                                ) : cards.length === 0 ? (
                                    <p className="text-zinc-400 text-sm italic">Nenhum cartão cadastrado.</p>
                                ) : (
                                    <div className="grid gap-3">
                                        {cards.map(card => (
                                            <div key={card.id} className="flex items-center justify-between p-4 bg-white border border-zinc-100 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className="w-10 h-6 rounded-md shadow-sm"
                                                        style={{ backgroundColor: card.color || '#000' }}
                                                    ></div>
                                                    <div>
                                                        <h4 className="font-medium text-zinc-900">{card.name}</h4>
                                                        <p className="text-xs text-zinc-500">
                                                            Fecha dia {card.closingDay} • Vence dia {card.dueDay}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => startEditing(card)}
                                                        className="p-2 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                        title="Editar"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteCard(card.id)}
                                                        className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Excluir"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
