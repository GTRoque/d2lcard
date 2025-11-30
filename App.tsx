import React, { useState, useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { ExpenseForm } from './components/ExpenseForm';
import { LoginPage } from './components/LoginPage';
import { RegisterPage } from './components/RegisterPage';
import { Expense } from './types';
import { AuthProvider, useAuth } from './context/AuthContext';
import { api } from './services/api';

import { ManageCardsModal } from './components/ManageCardsModal';

enum View {
  DASHBOARD = 'dashboard',
  ADD_EXPENSE = 'add_expense',
  HISTORY = 'history'
}

const AuthenticatedApp: React.FC = () => {
  const [view, setView] = useState<View>(View.DASHBOARD);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [cards, setCards] = useState<any[]>([]); // Store cards
  const [cardSettings, setCardSettings] = useState<Record<string, string>>({});
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { logout, user } = useAuth();

  useEffect(() => {
    loadExpenses();
    loadCards();
    loadCardSettings();
  }, []);

  const loadExpenses = async () => {
    try {
      const data = await api.getExpenses();
      setExpenses(data);
    } catch (error) {
      console.error('Failed to load expenses:', error);
    }
  };

  const loadCards = async () => {
    try {
      const data = await api.getCards();
      setCards(data);
    } catch (error) {
      console.error('Failed to load cards:', error);
    }
  };

  const loadCardSettings = async () => {
    try {
      const data = await api.getCardSettings();
      const map: Record<string, string> = {};
      data.forEach(s => map[s.card] = s.nickname);
      setCardSettings(map);
    } catch (error) {
      console.error('Failed to load card settings:', error);
    }
  };

  const handleAddExpense = async (expenseData: Omit<Expense, 'id'>) => {
    try {
      const newExpense = await api.createExpense(expenseData);
      setExpenses(prev => [newExpense, ...prev]);
      setView(View.DASHBOARD);
    } catch (error) {
      console.error('Failed to create expense:', error);
    }
  };

  return (
    <div className="min-h-screen bg-silver-100 text-zinc-900 font-sans selection:bg-zinc-300 selection:text-zinc-900">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-zinc-200 bg-white/80 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setView(View.DASHBOARD)}>
              <img src="/logo.png" alt="D2L.Card Logo" className="w-10 h-10 rounded-lg shadow-sm bg-zinc-50 p-1" />
              <span className="text-xl font-light tracking-tight text-zinc-800">
                D2L.<span className="font-semibold text-zinc-600">Card</span>
              </span>
            </div>

            <div className="hidden md:flex items-center gap-4">
              <div className="flex items-baseline space-x-4">
                <button
                  onClick={() => setView(View.DASHBOARD)}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${view === View.DASHBOARD ? 'text-zinc-900 bg-zinc-100' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50'}`}
                >
                  Dashboard
                </button>
                <button
                  onClick={() => setView(View.ADD_EXPENSE)}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${view === View.ADD_EXPENSE ? 'text-zinc-900 bg-zinc-100' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50'}`}
                >
                  Adicionar Despesa
                </button>
                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className="px-3 py-2 rounded-md text-sm font-medium text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50 transition-colors"
                >
                  Configurar Cartões
                </button>
              </div>
              <div className="border-l border-zinc-200 pl-4 ml-4 flex items-center gap-3">
                <span className="text-sm text-zinc-500">Olá, {user?.name}</span>
                <button
                  onClick={logout}
                  className="text-sm text-red-600 hover:text-red-700 font-medium"
                >
                  Sair
                </button>
              </div>
            </div>

            {/* Mobile Menu Button - simplified */}
            <div className="md:hidden flex items-center gap-4">
              <button onClick={logout} className="text-sm text-red-600 font-medium">Sair</button>
              <button onClick={() => setView(view === View.ADD_EXPENSE ? View.DASHBOARD : View.ADD_EXPENSE)} className="text-zinc-500 hover:text-zinc-900">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {view === View.DASHBOARD && (
          <>
            <div className="flex justify-end mb-6 md:hidden">
              <button
                onClick={() => setView(View.ADD_EXPENSE)}
                className="w-full bg-zinc-900 text-white font-semibold py-3 rounded-lg shadow-lg"
              >
                + Nova Despesa
              </button>
            </div>
            <Dashboard expenses={expenses} cards={cards} cardSettings={cardSettings} />
          </>
        )}

        {view === View.ADD_EXPENSE && (
          <div className="animate-fade-in-up">
            <ExpenseForm
              onAddExpense={handleAddExpense}
              onCancel={() => setView(View.DASHBOARD)}
              cardSettings={cardSettings}
            />
          </div>
        )}
      </main>

      <ManageCardsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onUpdate={() => {
          loadCardSettings(); // Refresh cards if needed elsewhere
          // We might need to refresh expenses too if card details changed
        }}
      />

      {/* Footer */}
      <footer className="border-t border-zinc-200 mt-auto py-8 bg-white/50">
        <div className="max-w-7xl mx-auto px-4 text-center text-zinc-400 text-sm">
          <p>&copy; {new Date().getFullYear()} D2L.Card. Gestão financeira premium.</p>
        </div>
      </footer>
    </div>
  );
};

const AppContent: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);

  if (isAuthenticated) {
    return <AuthenticatedApp />;
  }

  if (isRegistering) {
    return <RegisterPage onLoginClick={() => setIsRegistering(false)} />;
  }

  return <LoginPage onRegisterClick={() => setIsRegistering(true)} />;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;