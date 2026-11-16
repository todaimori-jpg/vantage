import type { Apartment, Settings } from '../types';
import { clamp } from './format';

export function moveInCost(apartment: Apartment): number {
  const rent = apartment.rent ?? 0;
  const deposit = apartment.deposit ?? 0;
  const broker = apartment.brokerFee ?? 0;
  const lastMonth = apartment.lastMonth ? rent : 0;
  return rent + deposit + broker + lastMonth;
}

export function pricePerSqft(apartment: Apartment): number | undefined {
  if (!apartment.rent || !apartment.sqft || apartment.sqft <= 0) return undefined;
  return apartment.rent / apartment.sqft;
}

function median(values: number[]): number | undefined {
  if (!values.length) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export function apartmentScore(apartment: Apartment, settings: Settings, peers: Apartment[]): number {
  let budgetScore = 65;
  if (apartment.rent) {
    const budget = settings.rentBudget || apartment.rent;
    if (apartment.rent <= budget) budgetScore = 100;
    else budgetScore = clamp(100 - ((apartment.rent - budget) / budget) * 180, 0, 100);
  }

  const peerPerSqft = peers.map(pricePerSqft).filter((value): value is number => typeof value === 'number');
  const medianPerSqft = median(peerPerSqft);
  const ownPerSqft = pricePerSqft(apartment);
  let valueScore = 65;
  if (medianPerSqft && ownPerSqft) {
    valueScore = clamp((medianPerSqft / ownPerSqft) * 70, 25, 100);
  }

  let commuteScore = 60;
  if (apartment.commuteMin) {
    const target = settings.maxCommute || 35;
    if (apartment.commuteMin <= target * 0.6) commuteScore = 100;
    else if (apartment.commuteMin <= target) commuteScore = 85;
    else commuteScore = clamp(85 - (apartment.commuteMin - target) * 2.5, 20, 85);
  }

  const ratingScore = apartment.rating ? apartment.rating * 20 : 60;

  return Math.round(budgetScore * 0.35 + valueScore * 0.2 + commuteScore * 0.2 + ratingScore * 0.25);
}

export function scoreLabel(score: number): string {
  if (score >= 82) return 'Strong fit';
  if (score >= 68) return 'Solid fit';
  if (score >= 52) return 'Tradeoffs';
  return 'Weak fit';
}

export function monthlyCost(apartment: Apartment): number | undefined {
  return apartment.rent;
}
