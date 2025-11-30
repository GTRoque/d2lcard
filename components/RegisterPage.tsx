import React, { useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface RegisterPageProps {
    onLoginClick: () => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({ onLoginClick }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await api.register(name, email, password);
            login(response.token, response.user);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-silver-100 px-4">
            <div className="max-w-md w-full bg-zinc-50 rounded-xl shadow-lg p-8">
                <div className="text-center mb-8">
                    <img src="/logo.png" alt="D2L.Card Logo" className="h-24 mx-auto mb-6 rounded-2xl shadow-sm" />
                    <h2 className="text-3xl font-bold text-zinc-900">Crie sua conta</h2>
                    <p className="text-zinc-500 mt-2">Comece a controlar suas finanças hoje</p>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-zinc-700 mb-1">Nome</label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-zinc-300 bg-white focus:ring-2 focus:ring-zinc-900 focus:border-transparent outline-none transition-all"
                            placeholder="Seu nome"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-zinc-700 mb-1">Email</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-zinc-300 bg-white focus:ring-2 focus:ring-zinc-900 focus:border-transparent outline-none transition-all"
                            placeholder="seu@email.com"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-zinc-700 mb-1">Senha</label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-2 rounded-lg border border-zinc-300 bg-white focus:ring-2 focus:ring-zinc-900 focus:border-transparent outline-none transition-all"
                            placeholder="••••••••"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-zinc-900 text-white font-semibold py-3 rounded-lg hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Criar conta' : 'Cadastrar'}
                    </button>
                </form>

                <div className="mt-6 text-center text-sm text-zinc-500">
                    Já tem uma conta?{' '}
                    <button
                        onClick={onLoginClick}
                        className="text-zinc-900 font-semibold hover:underline"
                    >
                        Entrar
                    </button>
                </div>
            </div>
        </div>
    );
};
