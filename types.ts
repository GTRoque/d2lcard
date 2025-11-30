export enum CardType {
  MASTERCARD = 'Mastercard',
  VISA = 'Visa',
  AMEX = 'Amex',
  NUBANK = 'Nubank',
  OTHER = 'Outro'
}

export enum Purchaser {
  USER_A = 'Você',
  USER_B = 'Parceiro(a)',
  SHARED = 'Compartilhado'
}

export interface Card {
  id: string;
  userId: string;
  type: CardType;
  name: string;
  closingDay: number;
  dueDay: number;
  color?: string;
}

export interface Expense {
  id: string;
  userId: string;
  description: string;
  location?: string;
  amount: number; // Total amount
  installments: number; // Number of months
  date: string; // ISO string YYYY-MM-DD
  card: string; // Kept for display/legacy, populated with card name
  cardId?: string; // New field
  cardDetails?: {
    closingDay: number;
    dueDay: number;
    color?: string;
  };
  purchaser: string;
  category: string;
  isRecurring: boolean;
  observation?: string;
}

export interface CardSetting {
  card: string;
  nickname: string;
}

export interface MonthlyProjection {
  month: string; // "YYYY-MM"
  total: number;
  byPurchaser: Record<string, number>;
  items: ProjectedItem[];
}

export interface ProjectedItem {
  expenseId: string;
  description: string;
  installmentNumber: number;
  totalInstallments: number;
  amount: number;
  purchaser: string;
  card: string;
  location?: string;
  observation?: string;
  date: string;
}

export interface CategorySuggestion {
  category: string;
  insight: string;
}

export interface ParsedExpense {
  description: string;
  amount: number;
  date?: string;
  card?: string;
  purchaser?: string;
  category: string;
  insight: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  familyId?: string;
}

export interface Family {
  id: string;
  name: string;
  inviteCode: string;
  members?: User[];
}

export interface AuthResponse {
  token: string;
  user: User;
}
