import React, { useMemo, useState } from 'react';
import { Expense, ProjectedItem, MonthlyProjection, Purchaser } from '../types';
import { StatCard } from './StatCard';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useAuth } from '../context/AuthContext';

interface DashboardProps {
  expenses: Expense[];
  cards?: any[]; // Add cards prop
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-zinc-200 p-3 rounded-lg shadow-xl">
        <p className="text-zinc-800 font-medium mb-1">{label}</p>
        <p className="text-emerald-600 text-sm">
          Total: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(payload[0].value as number)}
        </p>
      </div>
    );
  }
  return null;
};

export const Dashboard: React.FC<DashboardProps> = ({ expenses, cards = [] }) => {
  const { user } = useAuth();
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number>(new Date().getMonth());

  // Filters
  const [filterLocal, setFilterLocal] = useState('');
  const [filterPurchaser, setFilterPurchaser] = useState('');
  const [filterCard, setFilterCard] = useState('');

  // Extract unique values for filters
  const uniqueLocals = useMemo(() => Array.from(new Set(expenses.map(e => e.location || '').filter(Boolean))).sort(), [expenses]);
  const uniquePurchasers = useMemo(() => Array.from(new Set(expenses.map(e => e.purchaser))).sort(), [expenses]);
  const uniqueCards = useMemo(() => Array.from(new Set(expenses.map(e => e.card))).sort(), [expenses]);

  // Filter expenses first
  const filteredExpenses = useMemo(() => {
    return expenses.filter(expense => {
      const matchesLocal = !filterLocal || (expense.location || '').includes(filterLocal);
      const matchesPurchaser = !filterPurchaser || expense.purchaser === filterPurchaser;
      const matchesCard = !filterCard || expense.card === filterCard;
      return matchesLocal && matchesPurchaser && matchesCard;
    });
  }, [expenses, filterLocal, filterPurchaser, filterCard]);

  // Core Logic: Calculate monthly liabilities based on filtered expenses
  const projections = useMemo(() => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const monthsToProject = 24;
    const monthlyData: MonthlyProjection[] = [];

    for (let i = 0; i < monthsToProject; i++) {
      const targetDate = new Date(currentYear, i, 1);
      const monthLabel = targetDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

      let monthTotal = 0;
      const byPurchaser: Record<string, number> = {};
      const items: ProjectedItem[] = [];

      filteredExpenses.forEach(expense => {
        // Parse date manually to avoid timezone issues
        const [year, month, day] = expense.date.split('-').map(Number);
        const purchaseDay = day;

        // Find closing day: try cards prop first, then expense.cardDetails, then default
        let closingDay = 18;
        if (cards.length > 0 && expense.cardId) {
          const card = cards.find(c => c.id === expense.cardId);
          if (card) closingDay = card.closingDay;
        } else if (expense.cardDetails) {
          closingDay = expense.cardDetails.closingDay;
        }

        let billingMonthIndex = year * 12 + (month - 1); // month is 1-based in split
        if (purchaseDay >= closingDay) {
          billingMonthIndex += 1;
        }

        const targetMonthIndex = targetDate.getFullYear() * 12 + targetDate.getMonth();
        const diffMonths = targetMonthIndex - billingMonthIndex;

        if (diffMonths >= 0 && diffMonths < expense.installments) {
          const installmentAmount = expense.amount / expense.installments;
          monthTotal += installmentAmount;

          byPurchaser[expense.purchaser] = (byPurchaser[expense.purchaser] || 0) + installmentAmount;

          items.push({
            expenseId: expense.id,
            description: expense.description,
            installmentNumber: diffMonths + 1,
            totalInstallments: expense.installments,
            amount: installmentAmount,
            purchaser: expense.purchaser,
            card: expense.card,
            location: expense.location,
            observation: expense.observation,
            date: expense.date
          });
        }
      });

      items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      monthlyData.push({
        month: monthLabel,
        total: monthTotal,
        byPurchaser,
        items
      });
    }

    return monthlyData;
  }, [filteredExpenses]);

  const currentMonthData = projections[selectedMonthIndex];

  // Dynamic Summary Logic
  const isGustavo = user?.name.includes('Gustavo');
  const isLarissa = user?.name.includes('Larissa');

  const sharedTotal = currentMonthData.byPurchaser['Compartilhado'] || 0;
  const gustavoTotal = currentMonthData.byPurchaser['Gustavo'] || 0;
  const larissaTotal = currentMonthData.byPurchaser['Larissa'] || 0;

  let yourPart = 0;
  let othersPart = 0;

  if (isGustavo) {
    yourPart = gustavoTotal + (sharedTotal / 2);
    othersPart = larissaTotal + (sharedTotal / 2);
  } else if (isLarissa) {
    yourPart = larissaTotal + (sharedTotal / 2);
    othersPart = gustavoTotal + (sharedTotal / 2);
  } else {
    // Default fallback if name doesn't match
    yourPart = (currentMonthData.byPurchaser['Você'] || 0) + (sharedTotal / 2);
    othersPart = (currentMonthData.byPurchaser['Parceiro(a)'] || 0) + (sharedTotal / 2);
  }

  // If we are filtering by specific purchaser, the totals should reflect that directly?
  // The user requirement was "filters... alter cards". 
  // If I filter by "Larissa", filteredExpenses only has Larissa. 
  // So gustavoTotal will be 0. sharedTotal will be 0. larissaTotal will be X.
  // "Sua Parte" (Gustavo) = 0 + 0 = 0. Correct.
  // "Outros" (Larissa) = X + 0 = X. Correct.

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header with Month Selector */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-light text-zinc-900 tracking-tight">Visão Geral</h2>
          <p className="text-zinc-500 text-sm">Controle financeiro e projeções</p>
        </div>
        <div className="flex bg-white p-1 rounded-lg border border-zinc-200 overflow-x-auto max-w-full shadow-sm">
          {projections.map((p, idx) => (
            <button
              key={p.month}
              onClick={() => setSelectedMonthIndex(idx)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${selectedMonthIndex === idx
                ? 'bg-zinc-800 text-white shadow-md'
                : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50'
                }`}
            >
              {p.month.replace(' de ', '/').substring(0, 3) + '/' + p.month.split(' de ')[1].slice(2)}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title={`Fatura ${currentMonthData.month.split(' ')[0]}`}
          value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(currentMonthData.total)}
          subtitle="Total acumulado para o mês"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          }
        />
        <StatCard
          title="Sua Parte"
          value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(yourPart)}
          subtitle="Incluindo 50% dos compartilhados"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
          }
        />
        <StatCard
          title="Outros"
          value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(othersPart)}
          subtitle="Outros titulares + 50% compartilhados"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
          }
        />
      </div>

      {/* Chart */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm">
        <h3 className="text-zinc-500 text-sm font-medium uppercase tracking-wider mb-6">Projeção Semestral</h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={projections.slice(selectedMonthIndex, selectedMonthIndex + 6)}>
              <XAxis
                dataKey="month"
                tick={{ fill: '#71717a', fontSize: 12 }}
                tickFormatter={(val) => val.split(' ')[0]}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                hide
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }} />
              <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                {projections.slice(0, 6).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={index === selectedMonthIndex ? '#3f3f46' : '#d4d4d8'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Filters & Detailed Table */}
      <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-zinc-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="text-zinc-500 text-sm font-medium uppercase tracking-wider">Detalhamento: {currentMonthData.month}</h3>

          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <select
              value={filterLocal}
              onChange={(e) => setFilterLocal(e.target.value)}
              className="text-sm border border-zinc-200 rounded-lg px-2 py-1.5 outline-none focus:border-zinc-400 bg-zinc-50"
            >
              <option value="">Todos os Locais</option>
              {uniqueLocals.map(l => <option key={l} value={l}>{l}</option>)}
            </select>

            <select
              value={filterPurchaser}
              onChange={(e) => setFilterPurchaser(e.target.value)}
              className="text-sm border border-zinc-200 rounded-lg px-2 py-1.5 outline-none focus:border-zinc-400 bg-zinc-50"
            >
              <option value="">Todos os Titulares</option>
              {uniquePurchasers.map(p => <option key={p} value={p}>{p}</option>)}
            </select>

            <select
              value={filterCard}
              onChange={(e) => setFilterCard(e.target.value)}
              className="text-sm border border-zinc-200 rounded-lg px-2 py-1.5 outline-none focus:border-zinc-400 bg-zinc-50"
            >
              <option value="">Todos os Cartões</option>
              {uniqueCards.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-600">
            <thead className="bg-zinc-50 uppercase font-medium text-xs tracking-wider text-zinc-500">
              <tr>
                <th className="px-6 py-4">Data</th>
                <th className="px-6 py-4">Descrição</th>
                <th className="px-6 py-4">Local</th>
                <th className="px-6 py-4">Titular</th>
                <th className="px-6 py-4">Cartão</th>
                <th className="px-6 py-4 text-center">Parcela</th>
                <th className="px-6 py-4 text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {currentMonthData.items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-zinc-400">
                    Nenhuma fatura encontrada para este mês.
                  </td>
                </tr>
              ) : (
                currentMonthData.items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-zinc-50 transition-colors group">
                    <td className="px-6 py-4 text-zinc-500 text-xs">
                      {new Date(item.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                    </td>
                    <td className="px-6 py-4 font-medium text-zinc-900 flex items-center gap-2">
                      {item.description}
                      {item.observation && (
                        <div className="relative group/tooltip">
                          <span className="cursor-help text-zinc-400 hover:text-zinc-600">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
                            </svg>
                          </span>
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-zinc-800 text-white text-xs rounded-lg opacity-0 group-hover/tooltip:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                            {item.observation}
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-zinc-800"></div>
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-zinc-500">{item.location || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium
                            ${item.purchaser === 'Gustavo' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' :
                          item.purchaser === 'Larissa' ? 'bg-pink-50 text-pink-700 border border-pink-100' :
                            item.purchaser === 'Compartilhado' ? 'bg-purple-50 text-purple-700 border border-purple-100' :
                              'bg-zinc-50 text-zinc-700 border border-zinc-100'}`}>
                        {item.purchaser}
                      </span>
                    </td>
                    <td className="px-6 py-4">{item.card}</td>
                    <td className="px-6 py-4 text-center text-zinc-400">
                      {item.installmentNumber} / {item.totalInstallments}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-zinc-900">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};