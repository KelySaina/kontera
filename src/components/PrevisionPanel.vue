<script setup lang="ts">
import { computed } from 'vue'
import { useKontera } from '@/composables/useKontera'
import NumberField from './NumberField.vue'
import { formatAr, formatKwh } from '@/domain'

const { store, period, settlement, tariff, nameA, nameB, readonly } = useKontera()
const cur = computed(() => tariff.value.currency)
const prev = computed(() => settlement.value?.prevision ?? null)

function setA(v: number | null) {
  if (period.value) store.updateForecast(v ?? 0, period.value.forecast.kwhB)
}
function setB(v: number | null) {
  if (period.value) store.updateForecast(period.value.forecast.kwhA, v ?? 0)
}
</script>

<template>
  <section v-if="period && prev" class="card space-y-4">
    <header class="flex items-center justify-between">
      <h2 class="text-base font-semibold">1 · Prévision de consommation</h2>
      <span class="badge bg-slate-800 text-slate-400">{{ period.label }}</span>
    </header>

    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <NumberField
        :model-value="period.forecast.kwhA"
        :label="`${nameA} — kWh prévus`"
        suffix="kWh"
        :min="0"
        :disabled="readonly"
        @update:model-value="setA"
      />
      <NumberField
        :model-value="period.forecast.kwhB"
        :label="`${nameB} — kWh prévus`"
        suffix="kWh"
        :min="0"
        :disabled="readonly"
        @update:model-value="setB"
      />
    </div>

    <div class="rounded-xl bg-slate-950/50 p-3 text-sm">
      <p class="mb-2 text-xs uppercase tracking-wide text-slate-500">
        Détail du calcul (tranche réduite {{ formatKwh(tariff.reducedThreshold) }} partagée)
      </p>
      <table class="w-full text-sm">
        <thead class="text-xs text-slate-500">
          <tr class="text-left">
            <th class="py-1"></th>
            <th class="py-1">Tranche réduite</th>
            <th class="py-1">Au-delà</th>
            <th class="py-1 text-right">Contribution</th>
          </tr>
        </thead>
        <tbody>
          <tr class="border-t border-slate-800">
            <td class="py-1.5 font-medium">{{ nameA }}</td>
            <td>{{ formatKwh(prev.split.A.reducedKwh) }}</td>
            <td>{{ formatKwh(prev.split.A.normalKwh) }}</td>
            <td class="text-right font-semibold text-brand-300">
              {{ formatAr(prev.contributionA, cur) }}
            </td>
          </tr>
          <tr class="border-t border-slate-800">
            <td class="py-1.5 font-medium">{{ nameB }}</td>
            <td>{{ formatKwh(prev.split.B.reducedKwh) }}</td>
            <td>{{ formatKwh(prev.split.B.normalKwh) }}</td>
            <td class="text-right font-semibold text-brand-300">
              {{ formatAr(prev.contributionB, cur) }}
            </td>
          </tr>
          <tr class="border-t border-slate-700 font-semibold">
            <td class="py-1.5">Total attendu</td>
            <td colspan="2" class="text-xs text-slate-500">
              {{ formatKwh(prev.split.reducedKwhUsed) }} au tarif réduit
            </td>
            <td class="text-right">{{ formatAr(prev.expectedTotal, cur) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
