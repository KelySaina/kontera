/**
 * Soldes, crédits/dettes et transferts entre occupants.
 *
 *   solde = paiements imputés à la période − coût réel attribué
 *   solde > 0 : crédit (trop payé)   |   solde < 0 : dette
 *
 * Les transferts entre occupants ne modifient JAMAIS le montant total de la
 * facture : on ne transfère que le minimum entre le crédit de l'un et la dette
 * de l'autre. Aucun transfert artificiel n'est créé quand le total payé ne
 * couvre pas la facture ; la dette envers JIRAMA est alors affichée à part.
 */
import type { ApartmentKey, Balance, SettlementResult, Transfer } from './types'

export interface SettlementInput {
  forecastCostA: number
  forecastCostB: number
  paidA: number
  paidB: number
  finalCostA: number
  finalCostB: number
}

export function computeSettlement(input: SettlementInput): SettlementResult {
  const balanceA: Balance = {
    apartment: 'A',
    forecastCost: Math.round(input.forecastCostA),
    paid: Math.round(input.paidA),
    finalCost: Math.round(input.finalCostA),
    balance: Math.round(input.paidA) - Math.round(input.finalCostA),
  }
  const balanceB: Balance = {
    apartment: 'B',
    forecastCost: Math.round(input.forecastCostB),
    paid: Math.round(input.paidB),
    finalCost: Math.round(input.finalCostB),
    balance: Math.round(input.paidB) - Math.round(input.finalCostB),
  }

  const totalPaid = balanceA.paid + balanceB.paid
  const totalCost = balanceA.finalCost + balanceB.finalCost
  const providerDebt = Math.max(0, totalCost - totalPaid)

  const transfers: Transfer[] = []
  // On ne règle entre occupants que le minimum crédit/dette : jamais plus que
  // ce qui a réellement été trop ou pas assez payé.
  if (balanceA.balance > 0 && balanceB.balance < 0) {
    const amount = Math.min(balanceA.balance, -balanceB.balance)
    if (amount > 0) transfers.push({ from: 'B', to: 'A', amount })
  } else if (balanceB.balance > 0 && balanceA.balance < 0) {
    const amount = Math.min(balanceB.balance, -balanceA.balance)
    if (amount > 0) transfers.push({ from: 'A', to: 'B', amount })
  }

  const balances: Record<ApartmentKey, Balance> = { A: balanceA, B: balanceB }
  return { balances, transfers, totalPaid, totalCost, providerDebt }
}
