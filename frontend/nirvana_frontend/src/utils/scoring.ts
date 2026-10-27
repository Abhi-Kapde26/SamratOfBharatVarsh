// src/utils/scoring.ts

export function calculateKingdomValue(criteria: {
  army: number;
  wealth: number;
  territory: number;
  culture: number;
  politics: number;
  population: number;
}): number {
  return (
    criteria.army * 0.30 +
    criteria.wealth * 0.25 +
    criteria.territory * 0.15 +
    criteria.culture * 0.10 +
    criteria.politics * 0.10 +
    criteria.population * 0.10
  );
}
