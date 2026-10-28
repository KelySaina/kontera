<script setup lang="ts">
import { computed } from 'vue'
import { useKontera } from '@/composables/useKontera'
import { formatAr, formatKwh } from '@/domain'

const { settlement, period, tariff, nameA, nameB } = useKontera()
const cur = computed(() => tariff.value.currency)

const prevKwh = computed(() => settlement.value?.prevision.totalKwh ?? 0)
const realKwh = computed(() => settlement.value?.regularization?.measuredKwh ?? null)
const prevCost = computed(() => settlement.value?.prevision.expectedTotal ?? 0)
const realCost = computed(() => settlement.value?.regularization?.totalCost ?? null)
</script>

<template>
  <div v-if="settlement && period" class="grid grid-cols-2 gap-3 lg:grid-cols-4">
    <div class="card">
      <p class="label">kWh prévus</p>
      <p class="text-xl font-bold">{{ formatKwh(prevKwh) }}</p>
      <p class="mt-1 text-xs text-slate-500">
        {{ nameA }} {{ formatKwh(period.forecast.kwhA) }} · {{ nameB }}
        {{ formatKwh(period.forecast.kwhB) }}
      </p>
    </div>
    <div class="card">
      <p class="label">kWh réels</p>
      <p class="text-xl font-bold">{{ realKwh !== null ? formatKwh(realKwh) : '—' }}</p>
      <p v-if="settlement.regularization?.discrepancyKwh" class="mt-1 text-xs text-amber-400">
        écart {{ formatKwh(settlement.regularization.discrepancyKwh) }}
      </p>
    </div>
    <div class="card">
      <p class="label">Coût prévisionnel</p>
      <p class="text-xl font-bold text-brand-300">{{ formatAr(prevCost, cur) }}</p>
    </div>
    <div class="card">
      <p class="label">Coût réel</p>
      <p class="text-xl font-bold" :class="realCost !== null ? 'text-brand-300' : 'text-slate-500'">
        {{ realCost !== null ? formatAr(realCost, cur) : '—' }}
      </p>
      <p v-if="settlement.regularization?.fromBilledAmount" class="mt-1 text-xs text-amber-400">
        montant facturé
      </p>
    </div>
  </div>
</template>
