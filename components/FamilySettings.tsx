import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Family } from '../types';

export const FamilySettings: React.FC = () => {
    const [family, setFamily] = useState<Family | null>(null);
    const [loading, setLoading] = useState(true);
    const [familyName, setFamilyName] = useState('');
    const [inviteCode, setInviteCode] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        loadFamily();
    }, []);

    const loadFamily = async () => {
        try {
            const data = await api.getFamily();
            setFamily(data);
        } catch (err) {
            console.error('Failed to load family', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateFamily = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const newFamily = await api.createFamily(familyName);
            setFamily(newFamily);
            // Reload to get members (which includes self)
            loadFamily();
        } catch (err) {
            setError('Erro ao criar família');
        }
    };

    const handleJoinFamily = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.joinFamily(inviteCode);
            loadFamily();
        } catch (err) {
            setError('Código inválido ou erro ao entrar');
        }
    };

    if (loading) return <div className="text-center p-4">Carregando...</div>;

    if (family) {
        return (
            <div className="space-y-6">
                <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl">
                    <h3 className="text-lg font-medium text-indigo-900 mb-1">Família: {family.name}</h3>
                    <p className="text-indigo-600 text-sm mb-4">
                        Compartilhe este código para convidar membros:
                        <span className="ml-2 font-mono font-bold bg-white px-2 py-1 rounded border border-indigo-200 select-all">
                            {family.inviteCode}
                        </span>
                    </p>

                    <h4 className="text-sm font-medium text-indigo-800 uppercase tracking-wider mb-3">Membros</h4>
                    <ul className="space-y-2">
                        {family.members?.map(member => (
                            <li key={member.id} className="flex items-center gap-3 bg-white p-2 rounded-lg border border-indigo-100">
                                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs">
                                    {member.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-zinc-900">{member.name}</p>
                                    <p className="text-xs text-zinc-500">{member.email}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Create Family */}
                <div className="space-y-4">
                    <h3 className="text-lg font-medium text-zinc-900">Criar Nova Família</h3>
                    <p className="text-sm text-zinc-500">
                        Crie um grupo para compartilhar despesas e cartões com outras pessoas.
                    </p>
                    <form onSubmit={handleCreateFamily} className="space-y-3">
                        <div>
                            <label className="block text-xs font-medium text-zinc-700 mb-1">Nome da Família</label>
                            <input
                                type="text"
                                value={familyName}
                                onChange={(e) => setFamilyName(e.target.value)}
                                className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-800"
                                placeholder="Ex: Família Silva"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            className="w-full bg-zinc-900 text-white py-2 rounded-lg text-sm font-medium hover:bg-zinc-800 transition-colors"
                        >
                            Criar Família
                        </button>
                    </form>
                </div>

                {/* Divider */}
                <div className="hidden md:block w-px bg-zinc-200 mx-auto"></div>
                <div className="md:hidden h-px bg-zinc-200 w-full"></div>

                {/* Join Family */}
                <div className="space-y-4">
                    <h3 className="text-lg font-medium text-zinc-900">Entrar em uma Família</h3>
                    <p className="text-sm text-zinc-500">
                        Já tem um código? Digite abaixo para entrar em um grupo existente.
                    </p>
                    <form onSubmit={handleJoinFamily} className="space-y-3">
                        <div>
                            <label className="block text-xs font-medium text-zinc-700 mb-1">Código de Convite</label>
                            <input
                                type="text"
                                value={inviteCode}
                                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                                className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-800 font-mono uppercase"
                                placeholder="Ex: X9Y2Z1"
                                required
                                maxLength={6}
                            />
                        </div>
                        <button
                            type="submit"
                            className="w-full bg-white border border-zinc-200 text-zinc-900 py-2 rounded-lg text-sm font-medium hover:bg-zinc-50 transition-colors"
                        >
                            Entrar na Família
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};
