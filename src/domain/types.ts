/**
 * Types du domaine métier Kontera.
 *
 * Convention monétaire : tous les montants sont des **ariary entiers** (Ar).
 * Les kWh peuvent être décimaux (relevés de compteur), les montants ne le sont
 * jamais après arrondi.
 */

/** Identifiant d'un appartement au sein d'un compteur principal. */
export type ApartmentKey = 'A' | 'B'

/** Barème de tarification JIRAMA, configurable. */
export interface Tariff {
  /** Tarif de la tranche réduite, en Ar/kWh (défaut 500). */
  reducedRate: number
  /** Taille de la tranche réduite, en kWh, **partagée par compteur principal** (défaut 50). */
  reducedThreshold: number
  /** Tarif au-delà de la tranche, en Ar/kWh (défaut 750). */
  normalRate: number
  /** Code devise affiché (défaut « Ar »). */
  currency: string
}

/** Barème par défaut du MVP. */
export const DEFAULT_TARIFF: Tariff = {
  reducedRate: 500,
  reducedThreshold: 50,
  normalRate: 750,
  currency: 'Ar',
}

/** Décomposition du coût d'un appartement (tranche réduite vs au-delà). */
export interface CostBreakdown {
  /** kWh facturés au tarif réduit. */
  reducedKwh: number
  /** kWh facturés au tarif normal. */
  normalKwh: number
  /** Coût de la part réduite, en Ar entiers. */
  reducedCost: number
  /** Coût de la part normale, en Ar entiers. */
  normalCost: number
  /** Coût total de l'appartement, en Ar entiers (= reducedCost + normalCost). */
  total: number
}

/** Résultat d'une répartition entre A et B. */
export interface Split {
  A: CostBreakdown
  B: CostBreakdown
  /** Coût total réparti, en Ar entiers. Toujours égal à A.total + B.total. */
  total: number
  /** kWh de la tranche réduite réellement disponibles et répartis. */
  reducedKwhUsed: number
}

/** Prévision de consommation pour une période. */
export interface Forecast {
  kwhA: number
  kwhB: number
}

/** Relevés des sous-compteurs pour une période. */
export interface Readings {
  startA: number | null
  endA: number | null
  startB: number | null
  endB: number | null
}

/** Problème détecté lors de la validation d'un relevé. */
export interface ReadingIssue {
  apartment: ApartmentKey
  field: 'start' | 'end' | 'pair'
  message: string
}

/** Résultat de la validation/calcul des relevés. */
export interface ReadingsResult {
  consumptionA: number | null
  consumptionB: number | null
  issues: ReadingIssue[]
  /** true si A et B sont tous deux valides et complets. */
  complete: boolean
}

/** Méthode de répartition d'un écart compteur principal / sous-compteurs. */
export type DiscrepancyMethod = 'proportional' | 'equal' | 'ignore'

/** Entrée de la régularisation réelle. */
export interface RegularizationInput {
  /** Consommation réelle mesurée par le sous-compteur A (kWh). */
  realA: number
  /** Consommation réelle mesurée par le sous-compteur B (kWh). */
  realB: number
  /**
   * Consommation totale du compteur principal (kWh), si connue.
   * Sert à détecter l'écart avec la somme des sous-compteurs.
   */
  mainKwh?: number | null
  /**
   * Montant réellement facturé par JIRAMA (Ar), si on veut l'utiliser
   * directement au lieu du barème théorique.
   */
  billedAmount?: number | null
  /** Méthode de répartition de l'écart (défaut « proportional »). */
  discrepancyMethod?: DiscrepancyMethod
}

/** Résultat de la régularisation réelle. */
export interface RegularizationResult {
  split: Split
  /** Base de référence du coût total. */
  basis: 'scale-submeters' | 'scale-main' | 'billed-amount'
  /** Coût total retenu, en Ar entiers. */
  totalCost: number
  /** kWh mesurés par les sous-compteurs (realA + realB). */
  measuredKwh: number
  /** Écart compteur principal − sous-compteurs (kWh), null si mainKwh inconnu. */
  discrepancyKwh: number | null
  /** true quand le total repose sur un montant facturé et non sur le barème. */
  fromBilledAmount: boolean
  /** Avertissements à afficher (écart non masqué, etc.). */
  warnings: string[]
}

/** Solde et imputations d'un appartement sur une période. */
export interface Balance {
  apartment: ApartmentKey
  /** Contribution prévisionnelle (Ar). */
  forecastCost: number
  /** Montant réellement payé/imputé à la période (Ar). */
  paid: number
  /** Coût définitif attribué (Ar). */
  finalCost: number
  /** solde = paid − finalCost. Positif = crédit, négatif = dette. */
  balance: number
}

/** Transfert suggéré entre occupants pour solder la période. */
export interface Transfer {
  from: ApartmentKey
  to: ApartmentKey
  amount: number
}

/** Synthèse des soldes d'une période. */
export interface SettlementResult {
  balances: Record<ApartmentKey, Balance>
  transfers: Transfer[]
  /** Total payé par les occupants (Ar). */
  totalPaid: number
  /** Coût total de la facture (Ar). */
  totalCost: number
  /** Dette résiduelle envers JIRAMA si la facture n'est pas couverte (Ar, ≥ 0). */
  providerDebt: number
}
