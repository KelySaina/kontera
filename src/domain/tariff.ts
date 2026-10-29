/**
 * Barème de tarification et répartition de la tranche réduite partagée.
 *
 * Règle centrale (ne JAMAIS dupliquer dans l'UI) :
 *   cost(K) = min(K, seuil) * tarifRéduit + max(K - seuil, 0) * tarifNormal
 *
 * La tranche réduite (50 kWh par défaut) est **partagée par le compteur
 * principal**, pas par appartement.
 */
import type { CostBreakdown, Split, Tariff } from './types'
import { allocate, roundAr } from './money'

/**
 * Coût théorique (Ar entiers) d'une consommation totale `K` (kWh) sur un
 * compteur principal, selon le barème.
 */
export function cost(K: number, tariff: Tariff): number {
  const k = Math.max(0, K)
  const reduced = Math.min(k, tariff.reducedThreshold)
  const normal = Math.max(k - tariff.reducedThreshold, 0)
  return roundAr(reduced * tariff.reducedRate + normal * tariff.normalRate)
}

/**
 * Détail du coût pour une consommation donnée, en connaissant combien de kWh
 * de tranche réduite sont alloués à cet appartement.
 */
function breakdown(kwh: number, reducedKwh: number, tariff: Tariff): CostBreakdown {
  const normalKwh = Math.max(0, kwh - reducedKwh)
  const reducedCost = reducedKwh * tariff.reducedRate
  const normalCost = normalKwh * tariff.normalRate
  return {
    reducedKwh,
    normalKwh,
    reducedCost: roundAr(reducedCost),
    normalCost: roundAr(normalCost),
    total: roundAr(reducedCost + normalCost),
  }
}

/**
 * Répartit le coût d'un compteur entre deux appartements A et B qui
 * consomment `kwhA` et `kwhB`, en **partageant** la tranche réduite à parts
 * égales (50/50), dans la limite de ce que chacun consomme. Si un appartement
 * consomme moins que sa moitié, le reliquat revient à l'autre.
 *
 * Propriétés garanties :
 *  - A.total + B.total === cost(kwhA + kwhB)  (après arrondi au ariary)
 *  - la tranche réduite n'est jamais attribuée à une consommation inexistante
 *    (si le total est < seuil, seul le total est traité au tarif réduit).
 *
 * Sert aussi bien à la prévision qu'à la régularisation réelle.
 */
export function splitCost(kwhA: number, kwhB: number, tariff: Tariff): Split {
  const a = Math.max(0, kwhA)
  const b = Math.max(0, kwhB)
  const total = a + b

  // kWh de tranche réduite réellement disponibles (jamais plus que le total).
  const reducedAvailable = Math.min(total, tariff.reducedThreshold)

  // Répartition à parts égales de la tranche réduite, plafonnée à la
  // consommation de chacun ; le reliquat non consommé passe à l'autre.
  // Comme reducedAvailable <= total, reducedB reste <= b.
  const half = reducedAvailable / 2
  const reducedA = Math.min(a, Math.max(half, reducedAvailable - b))
  const reducedB = reducedAvailable - reducedA

  const rawA = breakdown(a, reducedA, tariff)
  const rawB = breakdown(b, reducedB, tariff)

  // On garantit l'égalité exacte A.total + B.total == cost(total) en répartissant
  // le coût de référence par la méthode du plus fort reste (poids = coût brut).
  const target = cost(total, tariff)
  const [allocA, allocB] = allocate(target, [rawA.total, rawB.total])

  // Les totaux par appartement sont ajustés à l'entier ; on réaligne le détail
  // réduit/normal pour que reducedCost + normalCost == total de l'appartement.
  const A = reconcile(rawA, allocA)
  const B = reconcile(rawB, allocB)

  return { A, B, total: target, reducedKwhUsed: reducedAvailable }
}

/** Ajuste le détail d'un appartement pour coller au total entier imposé. */
function reconcile(bd: CostBreakdown, enforcedTotal: number): CostBreakdown {
  const delta = enforcedTotal - bd.total
  if (delta === 0) return { ...bd, total: enforcedTotal }
  // On applique l'écart d'arrondi (±1 Ar en général) sur la part normale,
  // ou sur la part réduite si l'appartement n'a pas de consommation normale.
  if (bd.normalKwh > 0 || bd.reducedKwh === 0) {
    return { ...bd, normalCost: bd.normalCost + delta, total: enforcedTotal }
  }
  return { ...bd, reducedCost: bd.reducedCost + delta, total: enforcedTotal }
}
