import { computed } from 'vue'
import { useAppStore } from '@/stores/app'

/** Accès partagé au store + calculs réactifs de la période active. */
export function useKontera() {
  const store = useAppStore()
  const floor = computed(() => store.activeFloor)
  const period = computed(() => store.activePeriod)
  const tariff = computed(() => store.tariff)

  const settlement = computed(() =>
    period.value ? store.settlementFor(period.value) : null,
  )

  const nameA = computed(() => floor.value?.apartmentAName ?? 'Appartement A')
  const nameB = computed(() => floor.value?.apartmentBName ?? 'Appartement B')

  const readonly = computed(() => period.value?.status === 'closed')

  return { store, floor, period, tariff, settlement, nameA, nameB, readonly }
}
