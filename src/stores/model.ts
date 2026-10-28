/** Modèle de données persisté (séparé de l'UI et des fonctions métier). */
import type {
  DiscrepancyMethod,
  Forecast,
  Readings,
  Tariff,
  Transfer,
} from '@/domain'
import type { Transaction } from '@/domain'

export type PeriodStatus =
  | 'prevision'
  | 'payments'
  | 'readings-partial'
  | 'readings-complete'
  | 'regularized'
  | 'closed'

export const STATUS_LABELS: Record<PeriodStatus, string> = {
  prevision: 'Prévision',
  payments: 'Paiements en cours',
  'readings-partial': 'Relevés partiels',
  'readings-complete': 'Relevés complets',
  regularized: 'Régularisée',
  closed: 'Clôturée',
}

export const STATUS_ORDER: PeriodStatus[] = [
  'prevision',
  'payments',
  'readings-partial',
  'readings-complete',
  'regularized',
  'closed',
]

/** Un transfert marqué comme réglé entre occupants. */
export interface SettledTransfer extends Transfer {
  id: string
  date: string
  note?: string
}

/** Instantané figé des calculs au moment de la clôture. */
export interface PeriodSnapshot {
  totalCost: number
  balances: { A: number; B: number }
  transfers: Transfer[]
  takenAt: string
}

export interface Period {
  id: string
  floorId: string
  label: string
  status: PeriodStatus
  forecast: Forecast
  readings: Readings
  /** Conso du compteur principal (kWh), si connue. */
  mainKwh: number | null
  /** Montant réellement facturé par JIRAMA (Ar), si connu. */
  billedAmount: number | null
  discrepancyMethod: DiscrepancyMethod
  transactions: Transaction[]
  settledTransfers: SettledTransfer[]
  snapshot: PeriodSnapshot | null
  createdAt: string
}

export interface Floor {
  id: string
  name: string
  mainMeterLabel: string
  apartmentAName: string
  apartmentBName: string
}

export interface AppState {
  version: number
  tariff: Tariff
  floors: Floor[]
  periods: Period[]
  activeFloorId: string | null
  activePeriodId: string | null
}
