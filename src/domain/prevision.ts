/**
 * Répartition PRÉVISIONNELLE de la consommation.
 *
 * Règle déterministe (documentée) :
 *  1. Additionner les kWh prévus par A et B.
 *  2. Déterminer les kWh de tranche réduite disponibles = min(total, seuil).
 *  3. Répartir ces kWh entre A et B au prorata de leurs estimations, sans
 *     dépasser leur consommation prévue.
 *  4. Facturer le reste au tarif normal.
 *  5. En déduire la contribution prévisionnelle de chacun et le total attendu.
 *
 * Si le cumul prévu est < seuil, on n'attribue pas artificiellement le reste
 * de la tranche à des kWh inexistants (géré par splitCost).
 */
import type { Forecast, Split, Tariff } from './types'
import { splitCost } from './tariff'

export interface PrevisionResult {
  split: Split
  /** Contribution prévisionnelle de A (Ar). */
  contributionA: number
  /** Contribution prévisionnelle de B (Ar). */
  contributionB: number
  /** Somme totale attendue (Ar) = contributionA + contributionB. */
  expectedTotal: number
  /** kWh totaux prévus. */
  totalKwh: number
}

export function computePrevision(forecast: Forecast, tariff: Tariff): PrevisionResult {
  const split = splitCost(forecast.kwhA, forecast.kwhB, tariff)
  return {
    split,
    contributionA: split.A.total,
    contributionB: split.B.total,
    expectedTotal: split.total,
    totalKwh: Math.max(0, forecast.kwhA) + Math.max(0, forecast.kwhB),
  }
}
