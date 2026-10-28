import { describe, it, expect } from 'vitest'
import {
  DEFAULT_TARIFF,
  cost,
  splitCost,
  computePrevision,
  computeReadings,
  regularize,
  computeSettlement,
  imputedPaid,
  type Transaction,
  type Tariff,
} from '../index'

const T: Tariff = DEFAULT_TARIFF

describe('barème cost(K)', () => {
  it('1. consommation de 0 kWh', () => {
    expect(cost(0, T)).toBe(0)
  })
  it('2. consommation de 30 kWh (tranche réduite)', () => {
    expect(cost(30, T)).toBe(30 * 500)
  })
  it('3. consommation exacte de 50 kWh (limite de tranche)', () => {
    expect(cost(50, T)).toBe(50 * 500)
  })
  it('4. consommation de 80 kWh (dépasse la tranche)', () => {
    expect(cost(80, T)).toBe(50 * 500 + 30 * 750)
  })
  it('consommation négative est traitée comme 0', () => {
    expect(cost(-10, T)).toBe(0)
  })
})

describe('prévision — tranche réduite partagée', () => {
  it('5. total prévisionnel < 50 kWh : pas de tranche attribuée à du vide', () => {
    // A=20, B=10 → total 30 < 50. Tout au tarif réduit, rien d'artificiel.
    const r = computePrevision({ kwhA: 20, kwhB: 10 }, T)
    expect(r.split.reducedKwhUsed).toBe(30)
    expect(r.contributionA).toBe(20 * 500)
    expect(r.contributionB).toBe(10 * 500)
    expect(r.expectedTotal).toBe(cost(30, T))
  })

  it('6. répartition de la tranche réduite entre deux appartements', () => {
    // A=60, B=40 → total 100. Tranche réduite 50 répartie 30/20.
    const r = computePrevision({ kwhA: 60, kwhB: 40 }, T)
    expect(r.split.reducedKwhUsed).toBe(50)
    expect(r.split.A.reducedKwh).toBeCloseTo(30, 6)
    expect(r.split.B.reducedKwh).toBeCloseTo(20, 6)
    // A : 30*500 + 30*750 = 37500 ; B : 20*500 + 20*750 = 25000
    expect(r.contributionA).toBe(30 * 500 + 30 * 750)
    expect(r.contributionB).toBe(20 * 500 + 20 * 750)
    expect(r.expectedTotal).toBe(cost(100, T))
  })

  it('invariant : A.total + B.total === cost(total) sur un échantillon', () => {
    for (let a = 0; a <= 120; a += 7) {
      for (let b = 0; b <= 120; b += 11) {
        const s = splitCost(a, b, T)
        expect(s.A.total + s.B.total).toBe(cost(a + b, T))
        expect(s.total).toBe(cost(a + b, T))
      }
    }
  })
})

describe('relevés de sous-compteurs', () => {
  it('calcule la consommation = final − initial', () => {
    const r = computeReadings({ startA: 1000, endA: 1060, startB: 500, endB: 540 })
    expect(r.consumptionA).toBe(60)
    expect(r.consumptionB).toBe(40)
    expect(r.complete).toBe(true)
    expect(r.issues).toHaveLength(0)
  })
  it('signale un relevé final < initial', () => {
    const r = computeReadings({ startA: 1000, endA: 990, startB: 500, endB: 540 })
    expect(r.consumptionA).toBeNull()
    expect(r.issues.some((i) => i.apartment === 'A' && i.field === 'pair')).toBe(true)
  })
  it('signale un relevé manquant', () => {
    const r = computeReadings({ startA: 1000, endA: null, startB: 500, endB: 540 })
    expect(r.complete).toBe(false)
    expect(r.issues.some((i) => i.field === 'end' && i.apartment === 'A')).toBe(true)
  })
})

describe('régularisation réelle', () => {
  it('7. estimation différente de la consommation réelle', () => {
    // Prévision A=60/B=40 mais réel A=40/B=60 → la répartition suit le réel.
    const prev = computePrevision({ kwhA: 60, kwhB: 40 }, T)
    const reg = regularize({ realA: 40, realB: 60 }, T)
    expect(reg.totalCost).toBe(cost(100, T))
    expect(reg.split.A.total).not.toBe(prev.contributionA)
    expect(reg.split.A.total).toBe(20 * 500 + 20 * 750) // A=40: 20 réduit, 20 normal
    expect(reg.split.A.total + reg.split.B.total).toBe(reg.totalCost)
  })

  it('11. écart compteur principal / sous-compteurs réparti proportionnellement', () => {
    // Sous-compteurs 40+40=80, compteur principal 90 → écart +10 kWh.
    const reg = regularize({ realA: 40, realB: 40, mainKwh: 90 }, T)
    expect(reg.discrepancyKwh).toBe(10)
    expect(reg.basis).toBe('scale-main')
    expect(reg.totalCost).toBe(cost(90, T))
    expect(reg.split.A.total + reg.split.B.total).toBe(reg.totalCost)
    expect(reg.warnings.some((w) => /Écart/.test(w))).toBe(true)
    // Réparti également (40/40) : chacun ~ moitié.
    expect(Math.abs(reg.split.A.total - reg.split.B.total)).toBeLessThanOrEqual(1)
  })

  it('utilise le montant facturé quand il est fourni, et le signale', () => {
    const reg = regularize({ realA: 40, realB: 60, billedAmount: 50000 }, T)
    expect(reg.basis).toBe('billed-amount')
    expect(reg.fromBilledAmount).toBe(true)
    expect(reg.totalCost).toBe(50000)
    expect(reg.split.A.total + reg.split.B.total).toBe(50000)
    // Réparti au prorata des kWh : 40/100 et 60/100.
    expect(reg.split.A.total).toBe(20000)
    expect(reg.split.B.total).toBe(30000)
  })
})

describe('12. arrondis au ariary', () => {
  it('la somme répartie égale toujours le total, au ariary entier', () => {
    // Choix de valeurs produisant des fractions.
    const s = splitCost(33, 67, T) // total 100
    expect(Number.isInteger(s.A.total)).toBe(true)
    expect(Number.isInteger(s.B.total)).toBe(true)
    expect(s.A.total + s.B.total).toBe(cost(100, T))
  })
  it('montant facturé impair réparti sans perte', () => {
    const reg = regularize({ realA: 1, realB: 2, billedAmount: 1001 }, T)
    expect(reg.split.A.total + reg.split.B.total).toBe(1001)
  })
})

describe('soldes et transferts', () => {
  it('8. un appartement paie trop, l autre pas assez → transfert', () => {
    const r = computeSettlement({
      forecastCostA: 25000,
      forecastCostB: 25000,
      paidA: 30000,
      paidB: 20000,
      finalCostA: 25000,
      finalCostB: 25000,
    })
    expect(r.balances.A.balance).toBe(5000)
    expect(r.balances.B.balance).toBe(-5000)
    expect(r.transfers).toEqual([{ from: 'B', to: 'A', amount: 5000 }])
    expect(r.providerDebt).toBe(0)
  })

  it('9. les deux appartements paient trop → aucun transfert', () => {
    const r = computeSettlement({
      forecastCostA: 25000,
      forecastCostB: 25000,
      paidA: 30000,
      paidB: 28000,
      finalCostA: 25000,
      finalCostB: 25000,
    })
    expect(r.transfers).toHaveLength(0)
    expect(r.providerDebt).toBe(0)
    expect(r.balances.A.balance).toBe(5000)
    expect(r.balances.B.balance).toBe(3000)
  })

  it('10. les deux paient trop peu → pas de transfert artificiel, dette fournisseur', () => {
    const r = computeSettlement({
      forecastCostA: 25000,
      forecastCostB: 25000,
      paidA: 20000,
      paidB: 15000,
      finalCostA: 25000,
      finalCostB: 25000,
    })
    expect(r.transfers).toHaveLength(0)
    expect(r.providerDebt).toBe(15000) // 50000 − 35000
  })

  it('le transfert ne modifie jamais le total de la facture', () => {
    const r = computeSettlement({
      forecastCostA: 0,
      forecastCostB: 0,
      paidA: 40000,
      paidB: 10000,
      finalCostA: 25000,
      finalCostB: 25000,
    })
    const moved = r.transfers.reduce((s, t) => s + t.amount, 0)
    // Le total payé et le total coût ne bougent pas avec les transferts.
    expect(r.totalPaid).toBe(50000)
    expect(r.totalCost).toBe(50000)
    expect(moved).toBe(15000) // B doit 15000 à A
  })
})

describe('transactions', () => {
  const base: Omit<Transaction, 'type' | 'amount'> = {
    id: 'x',
    apartment: 'A',
    date: '2026-01-01',
  }

  it('14. un remboursement n est pas compté comme un paiement', () => {
    const txs: Transaction[] = [
      { ...base, id: '1', type: 'payment', amount: 30000 },
      { ...base, id: '2', type: 'refund', amount: 5000 },
      { ...base, id: '3', type: 'topup', amount: 25000 }, // dépense, exclue
    ]
    // Net imputé = 30000 − 5000 = 25000 (le topup n'entre pas).
    expect(imputedPaid(txs, 'A')).toBe(25000)
  })

  it('13. report d un crédit sur la période suivante', () => {
    // Période N : A a un crédit de 5000 (solde positif).
    const settle = computeSettlement({
      forecastCostA: 0,
      forecastCostB: 0,
      paidA: 30000,
      paidB: 20000,
      finalCostA: 25000,
      finalCostB: 25000,
    })
    const credit = settle.balances.A.balance // +5000
    expect(credit).toBe(5000)
    // Période N+1 : on reporte ce crédit via une transaction « carry ».
    const next: Transaction[] = [
      { ...base, id: 'c', type: 'carry', amount: credit }, // +5000 imputé d'office
      { ...base, id: 'p', type: 'payment', amount: 20000 },
    ]
    expect(imputedPaid(next, 'A')).toBe(25000) // 5000 reporté + 20000 payé
  })
})
