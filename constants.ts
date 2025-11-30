import { CardType, Expense, Purchaser } from "./types";

export const MOCK_EXPENSES: Expense[] = [
  {
    id: '1',
    description: 'iPhone 15 Pro',
    location: 'Apple Store',
    amount: 7200,
    installments: 12,
    date: '2023-11-15',
    card: CardType.MASTERCARD,
    purchaser: Purchaser.USER_A,
    category: 'Eletrônicos',
    isRecurring: false
  },
  {
    id: '2',
    description: 'Jantar Comemorativo',
    location: 'Coco Bambu',
    amount: 450.00,
    installments: 1,
    date: '2024-05-10',
    card: CardType.VISA,
    purchaser: Purchaser.SHARED,
    category: 'Alimentação',
    isRecurring: false
  },
  {
    id: '3',
    description: 'Supermercado Mensal',
    location: 'Carrefour',
    amount: 850.50,
    installments: 1,
    date: '2024-05-02',
    card: CardType.NUBANK,
    purchaser: Purchaser.SHARED,
    category: 'Casa',
    isRecurring: true
  },
  {
    id: '4',
    description: 'Tênis Corrida',
    location: 'Centauro',
    amount: 600.00,
    installments: 4,
    date: '2024-04-20',
    card: CardType.MASTERCARD,
    purchaser: Purchaser.USER_B,
    category: 'Lazer',
    isRecurring: false
  }
];