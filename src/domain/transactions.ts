/**
 * Transactions d'une période : paiements, achats de crédit, remboursements,
 * ajustements et reports. On distingue strictement :
 *   - `payment`    : argent versé par un occupant pour la facture (imputé au solde).
 *   - `topup`      : achat de crédit électrique (dépense, n'est PAS un paiement d'occupant).
 *   - `refund`     : remboursement versé à un occupant (sortie, ne recompte pas comme paiement).
 *   - `adjustment` : correction manuelle imputée au solde (signée).
 *   - `carry`      : report de crédit (+) ou de dette (−) depuis la période précédente.
 *
 * L'imputation au solde d'un occupant n'inclut JAMAIS les `topup` ni, en
 * positif, les `refund` : un remboursement ne doit pas être compté comme un
 * nouveau paiement de la facture.
 */
import type { ApartmentKey } from './types'

export type TransactionType = 'payment' | 'topup' | 'refund' | 'adjustment' | 'carry'

export interface Transaction {
  id: string
  type: TransactionType
  /** Appartement concerné ; null pour un topup global (achat de crédit commun). */
  apartment: ApartmentKey | null
  /** Montant en Ar (toujours positif ; le sens est porté par le type). */
  amount: number
  /** kWh achetés, si connu (topup uniquement). */
  kwh?: number | null
  date: string
  note?: string
}

/**
 * Montant imputé au solde d'un appartement (ce qu'il a « payé » pour la facture).
 *   = Σ payments − Σ refunds ± Σ adjustments + Σ carry
 * Les topups sont exclus (ce sont des dépenses, pas des paiements d'occupant).
 */
export function imputedPaid(transactions: Transaction[], apartment: ApartmentKey): number {
  let total = 0
  for (const t of transactions) {
    if (t.apartment !== apartment) continue
    switch (t.type) {
      case 'payment':
        total += t.amount
        break
      case 'refund':
        total -= t.amount // un remboursement réduit ce que l'occupant a net payé
        break
      case 'adjustment':
      case 'carry':
        total += t.amount // déjà signé à la saisie (peut être négatif)
        break
      case 'topup':
        break // dépense, jamais imputée à un occupant
    }
  }
  return Math.round(total)
}

/** Total réellement dépensé en achats de crédit (topups), tous occupants confondus. */
export function totalToppedUp(transactions: Transaction[]): number {
  return Math.round(
    transactions.filter((t) => t.type === 'topup').reduce((s, t) => s + t.amount, 0),
  )
}
