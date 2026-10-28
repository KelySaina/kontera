/**
 * Régularisation RÉELLE de la facture, à partir des consommations mesurées.
 *
 * Trois bases possibles, dans l'ordre de priorité :
 *  1. `billed-amount`  : un montant JIRAMA réel est fourni → on le répartit
 *     directement (signalé : ne repose pas sur le barème théorique).
 *  2. `scale-main`     : la conso du compteur principal est fournie → coût =
 *     cost(mainKwh). L'écart compteur principal / sous-compteurs est réparti
 *     selon la méthode choisie (proportionnelle par défaut) et jamais masqué.
 *  3. `scale-submeters`: ni montant ni conso principale → coût = cost(somme des
 *     sous-compteurs).
 *
 * Invariant : split.A.total + split.B.total === totalCost (au ariary près).
 */
import type {
  CostBreakdown,
  DiscrepancyMethod,
  RegularizationInput,
  RegularizationResult,
  Split,
  Tariff,
} from './types'
import { allocate, roundAr } from './money'
import { cost, splitCost } from './tariff'

/** Reconstruit un Split en imposant les totaux A et B (détail mis à l'échelle). */
function applyTotals(base: Split, totalA: number, totalB: number): Split {
  return {
    A: scaleBreakdown(base.A, totalA),
    B: scaleBreakdown(base.B, totalB),
    total: totalA + totalB,
    reducedKwhUsed: base.reducedKwhUsed,
  }
}

function scaleBreakdown(bd: CostBreakdown, enforcedTotal: number): CostBreakdown {
  if (bd.total === enforcedTotal) return { ...bd }
  if (bd.total === 0) {
    // Pas de base de répartition réduite/normale : tout en « normal ».
    return { ...bd, reducedCost: 0, normalCost: enforcedTotal, total: enforcedTotal }
  }
  const factor = enforcedTotal / bd.total
  const reducedCost = roundAr(bd.reducedCost * factor)
  const normalCost = enforcedTotal - reducedCost
  return { ...bd, reducedCost, normalCost, total: enforcedTotal }
}

export function regularize(input: RegularizationInput, tariff: Tariff): RegularizationResult {
  const realA = Math.max(0, input.realA)
  const realB = Math.max(0, input.realB)
  const measuredKwh = realA + realB
  const mainKwh = input.mainKwh ?? null
  const billed = input.billedAmount ?? null
  const method: DiscrepancyMethod = input.discrepancyMethod ?? 'proportional'
  const discrepancyKwh = mainKwh !== null ? mainKwh - measuredKwh : null
  const warnings: string[] = []

  // Répartition de base sur les kWh mesurés (tranche réduite partagée).
  const base = splitCost(realA, realB, tariff)

  // --- Cas 1 : montant facturé fourni ---------------------------------------
  if (billed !== null) {
    const totalCost = roundAr(billed)
    const [tA, tB] = allocate(totalCost, [realA, realB])
    warnings.push('Répartition basée sur le montant réellement facturé, pas sur le barème théorique.')
    if (discrepancyKwh !== null && discrepancyKwh !== 0) {
      warnings.push(formatDiscrepancy(discrepancyKwh))
    }
    return {
      split: applyTotals(base, tA, tB),
      basis: 'billed-amount',
      totalCost,
      measuredKwh,
      discrepancyKwh,
      fromBilledAmount: true,
      warnings,
    }
  }

  // --- Cas 2 : conso du compteur principal fournie --------------------------
  if (mainKwh !== null && method !== 'ignore') {
    const totalCost = cost(mainKwh, tariff)
    const extra = totalCost - base.total
    const weights = method === 'equal' ? [1, 1] : [realA, realB]
    const [extraA, extraB] = allocate(extra, weights)
    const tA = base.A.total + extraA
    const tB = base.B.total + extraB
    if (discrepancyKwh !== null && discrepancyKwh !== 0) {
      warnings.push(formatDiscrepancy(discrepancyKwh))
    }
    return {
      split: applyTotals(base, tA, tB),
      basis: 'scale-main',
      totalCost,
      measuredKwh,
      discrepancyKwh,
      fromBilledAmount: false,
      warnings,
    }
  }

  // --- Cas 3 : barème sur la somme des sous-compteurs -----------------------
  if (discrepancyKwh !== null && discrepancyKwh !== 0) {
    warnings.push(`${formatDiscrepancy(discrepancyKwh)} (non répartie : méthode « ignore »).`)
  }
  return {
    split: base,
    basis: 'scale-submeters',
    totalCost: base.total,
    measuredKwh,
    discrepancyKwh,
    fromBilledAmount: false,
    warnings,
  }
}

function formatDiscrepancy(d: number): string {
  const sign = d > 0 ? '+' : ''
  return `Écart compteur principal − sous-compteurs : ${sign}${Math.round(d * 100) / 100} kWh.`
}
