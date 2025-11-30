import { CardType } from './types';

export interface CardConfig {
    closingDay: number;
    dueDay: number;
}

export const CARD_CONFIG: Record<CardType, CardConfig> = {
    [CardType.MASTERCARD]: { closingDay: 18, dueDay: 27 },
    [CardType.VISA]: { closingDay: 18, dueDay: 27 }, // Assuming same for now
    [CardType.AMEX]: { closingDay: 18, dueDay: 27 },
    [CardType.NUBANK]: { closingDay: 18, dueDay: 27 },
    [CardType.OTHER]: { closingDay: 18, dueDay: 27 },
};
