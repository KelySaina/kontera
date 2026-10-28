import { defineStore } from 'pinia'
import { get, set } from 'idb-keyval'
import {
  DEFAULT_TARIFF,
  computePrevision,
  computeReadings,
  regularize,
  computeSettlement,
  imputedPaid,
  type Tariff,
  type Transaction,
} from '@/domain'
import type { AppState, Floor, Period, PeriodStatus, SettledTransfer } from './model'
import { STATUS_ORDER } from './model'

const DB_KEY = 'kontera-state-v1'
const STATE_VERSION = 1

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
}

function nowISO(): string {
  return new Date().toISOString()
}

function makeFloor(name = 'Étage 1'): Floor {
  return {
    id: uid(),
    name,
    mainMeterLabel: 'Compteur principal JIRAMA',
    apartmentAName: 'Appartement A',
    apartmentBName: 'Appartement B',
  }
}

function makePeriod(floorId: string, label: string): Period {
  return {
    id: uid(),
    floorId,
    label,
    status: 'prevision',
    forecast: { kwhA: 0, kwhB: 0 },
    readings: { startA: null, endA: null, startB: null, endB: null },
    mainKwh: null,
    billedAmount: null,
    discrepancyMethod: 'proportional',
    transactions: [],
    settledTransfers: [],
    snapshot: null,
    createdAt: nowISO(),
  }
}

function defaultMonthLabel(): string {
  return new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(new Date())
}

function seedState(): AppState {
  const floor = makeFloor()
  const period = makePeriod(floor.id, defaultMonthLabel())
  return {
    version: STATE_VERSION,
    tariff: { ...DEFAULT_TARIFF },
    floors: [floor],
    periods: [period],
    activeFloorId: floor.id,
    activePeriodId: period.id,
  }
}

export const useAppStore = defineStore('app', {
  state: () => ({
    loaded: false,
    data: seedState() as AppState,
  }),

  getters: {
    activeFloor(state): Floor | null {
      return state.data.floors.find((f) => f.id === state.data.activeFloorId) ?? null
    },
    activePeriod(state): Period | null {
      return state.data.periods.find((p) => p.id === state.data.activePeriodId) ?? null
    },
    tariff(state): Tariff {
      return state.data.tariff
    },
    periodsForActiveFloor(state): Period[] {
      return state.data.periods
        .filter((p) => p.floorId === state.data.activeFloorId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    },
  },

  actions: {
    async load() {
      try {
        const stored = await get<AppState>(DB_KEY)
        if (stored && stored.floors?.length) {
          this.data = stored
        }
      } catch (e) {
        console.warn('Chargement IndexedDB échoué, état par défaut utilisé.', e)
      }
      this.loaded = true
    },

    async persist() {
      try {
        await set(DB_KEY, JSON.parse(JSON.stringify(this.data)))
      } catch (e) {
        console.warn('Persistance IndexedDB échouée.', e)
      }
    },

    // --- Sélection -----------------------------------------------------------
    selectFloor(id: string) {
      this.data.activeFloorId = id
      const first = this.data.periods.find((p) => p.floorId === id)
      this.data.activePeriodId = first?.id ?? null
      this.persist()
    },
    selectPeriod(id: string) {
      this.data.activePeriodId = id
      this.persist()
    },

    // --- Étages --------------------------------------------------------------
    addFloor(name: string) {
      const floor = makeFloor(name || `Étage ${this.data.floors.length + 1}`)
      const period = makePeriod(floor.id, defaultMonthLabel())
      this.data.floors.push(floor)
      this.data.periods.push(period)
      this.data.activeFloorId = floor.id
      this.data.activePeriodId = period.id
      this.persist()
    },
    updateFloor(id: string, patch: Partial<Floor>) {
      const f = this.data.floors.find((x) => x.id === id)
      if (f) Object.assign(f, patch)
      this.persist()
    },

    // --- Périodes ------------------------------------------------------------
    addPeriod(label: string, carryCredits = true) {
      const floorId = this.data.activeFloorId
      if (!floorId) return
      const period = makePeriod(floorId, label || defaultMonthLabel())
      // Report des crédits/dettes depuis la dernière période clôturée de l'étage.
      if (carryCredits) {
        const last = this.data.periods
          .filter((p) => p.floorId === floorId && p.snapshot)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
        if (last?.snapshot) {
          for (const apt of ['A', 'B'] as const) {
            const bal = last.snapshot.balances[apt]
            if (bal !== 0) {
              period.transactions.push({
                id: uid(),
                type: 'carry',
                apartment: apt,
                amount: bal,
                date: nowISO(),
                note: `Report depuis « ${last.label} »`,
              })
            }
          }
        }
      }
      this.data.periods.push(period)
      this.data.activePeriodId = period.id
      this.persist()
    },

    setStatus(status: PeriodStatus) {
      const p = this.activePeriod
      if (!p) return
      p.status = status
      this.persist()
    },

    /** Avance automatiquement le statut selon l'état de saisie (sans régresser une clôture). */
    autoAdvance(p: Period) {
      if (p.status === 'closed') return
      const r = computeReadings(p.readings)
      const hasPayments = p.transactions.some((t) => t.type === 'payment')
      let next: PeriodStatus = 'prevision'
      if (p.billedAmount !== null || (r.complete && p.mainKwh !== null)) next = 'regularized'
      else if (r.complete) next = 'readings-complete'
      else if (r.consumptionA !== null || r.consumptionB !== null) next = 'readings-partial'
      else if (hasPayments) next = 'payments'
      // On ne recule jamais en dessous du statut courant tant que non clôturé.
      if (STATUS_ORDER.indexOf(next) >= STATUS_ORDER.indexOf(p.status)) p.status = next
    },

    updateForecast(kwhA: number, kwhB: number) {
      const p = this.activePeriod
      if (!p || p.status === 'closed') return
      p.forecast = { kwhA, kwhB }
      this.autoAdvance(p)
      this.persist()
    },

    updateReadings(patch: Partial<Period['readings']>) {
      const p = this.activePeriod
      if (!p || p.status === 'closed') return
      Object.assign(p.readings, patch)
      this.autoAdvance(p)
      this.persist()
    },

    updateRegularizationInputs(patch: {
      mainKwh?: number | null
      billedAmount?: number | null
      discrepancyMethod?: Period['discrepancyMethod']
    }) {
      const p = this.activePeriod
      if (!p || p.status === 'closed') return
      if ('mainKwh' in patch) p.mainKwh = patch.mainKwh ?? null
      if ('billedAmount' in patch) p.billedAmount = patch.billedAmount ?? null
      if (patch.discrepancyMethod) p.discrepancyMethod = patch.discrepancyMethod
      this.autoAdvance(p)
      this.persist()
    },

    // --- Transactions --------------------------------------------------------
    addTransaction(tx: Omit<Transaction, 'id'>) {
      const p = this.activePeriod
      if (!p || p.status === 'closed') return
      p.transactions.push({ ...tx, id: uid() })
      this.autoAdvance(p)
      this.persist()
    },
    updateTransaction(id: string, patch: Partial<Transaction>) {
      const p = this.activePeriod
      if (!p || p.status === 'closed') return
      const t = p.transactions.find((x) => x.id === id)
      if (t) Object.assign(t, patch)
      this.persist()
    },
    removeTransaction(id: string) {
      const p = this.activePeriod
      if (!p || p.status === 'closed') return
      p.transactions = p.transactions.filter((x) => x.id !== id)
      this.persist()
    },

    // --- Transferts réglés ---------------------------------------------------
    settleTransfer(t: SettledTransfer) {
      const p = this.activePeriod
      if (!p) return
      p.settledTransfers.push({ ...t, id: uid() })
      this.persist()
    },
    unsettleTransfer(id: string) {
      const p = this.activePeriod
      if (!p) return
      p.settledTransfers = p.settledTransfers.filter((x) => x.id !== id)
      this.persist()
    },

    // --- Clôture / réouverture ----------------------------------------------
    closePeriod() {
      const p = this.activePeriod
      if (!p || p.status === 'closed') return
      const s = this.settlementFor(p)
      p.snapshot = {
        totalCost: s.totalCost,
        balances: { A: s.balances.A.balance, B: s.balances.B.balance },
        transfers: s.transfers,
        takenAt: nowISO(),
      }
      p.status = 'closed'
      this.persist()
    },
    reopenPeriod() {
      const p = this.activePeriod
      if (!p || p.status !== 'closed') return
      p.status = 'regularized'
      // L'instantané est conservé pour traçabilité ; une modif ultérieure est explicite.
      this.persist()
    },

    // --- Calculs (délégués au domaine) --------------------------------------
    settlementFor(p: Period) {
      const prev = computePrevision(p.forecast, this.data.tariff)
      const r = computeReadings(p.readings)
      const hasReal = r.complete
      const reg = hasReal
        ? regularize(
            {
              realA: r.consumptionA ?? 0,
              realB: r.consumptionB ?? 0,
              mainKwh: p.mainKwh,
              billedAmount: p.billedAmount,
              discrepancyMethod: p.discrepancyMethod,
            },
            this.data.tariff,
          )
        : null

      const finalA = reg ? reg.split.A.total : prev.contributionA
      const finalB = reg ? reg.split.B.total : prev.contributionB

      const paidA = imputedPaid(p.transactions, 'A')
      const paidB = imputedPaid(p.transactions, 'B')

      const settle = computeSettlement({
        forecastCostA: prev.contributionA,
        forecastCostB: prev.contributionB,
        paidA,
        paidB,
        finalCostA: finalA,
        finalCostB: finalB,
      })

      return { prevision: prev, readings: r, regularization: reg, ...settle }
    },

    // --- Paramètres ----------------------------------------------------------
    updateTariff(patch: Partial<Tariff>) {
      Object.assign(this.data.tariff, patch)
      this.persist()
    },

    // --- Export / import -----------------------------------------------------
    exportJSON(): string {
      return JSON.stringify(this.data, null, 2)
    },
    importJSON(json: string) {
      const parsed = JSON.parse(json) as AppState
      if (!parsed.floors || !parsed.periods) throw new Error('Fichier invalide.')
      this.data = parsed
      this.data.activeFloorId = parsed.activeFloorId ?? parsed.floors[0]?.id ?? null
      this.data.activePeriodId =
        parsed.activePeriodId ?? parsed.periods.find((p) => p.floorId === this.data.activeFloorId)?.id ?? null
      this.persist()
    },
  },
})
