<script setup lang="ts">
import { computed } from 'vue'
import { useKontera } from '@/composables/useKontera'
import NumberField from './NumberField.vue'
import { formatKwh } from '@/domain'

const { store, period, settlement, nameA, nameB, readonly } = useKontera()
const r = computed(() => settlement.value?.readings ?? null)

function patch(key: 'startA' | 'endA' | 'startB' | 'endB', v: number | null) {
  store.updateReadings({ [key]: v })
}
</script>

<template>
  <section v-if="period && r" class="card space-y-4">
    <header>
      <h2 class="text-base font-semibold">3 · Relevés des sous-compteurs</h2>
      <p class="text-xs text-slate-500">consommation = relevé final − relevé initial</p>
    </header>

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div class="space-y-2">
        <p class="text-sm font-medium text-brand-300">{{ nameA }}</p>
        <NumberField :model-value="period.readings.startA" label="Relevé initial" suffix="kWh" :min="0" :disabled="readonly" @update:model-value="(v) => patch('startA', v)" />
        <NumberField :model-value="period.readings.endA" label="Relevé final" suffix="kWh" :min="0" :disabled="readonly" @update:model-value="(v) => patch('endA', v)" />
        <p class="text-sm">
          Consommation :
          <span class="font-semibold">{{ r.consumptionA !== null ? formatKwh(r.consumptionA) : '—' }}</span>
        </p>
      </div>
      <div class="space-y-2">
        <p class="text-sm font-medium text-brand-300">{{ nameB }}</p>
        <NumberField :model-value="period.readings.startB" label="Relevé initial" suffix="kWh" :min="0" :disabled="readonly" @update:model-value="(v) => patch('startB', v)" />
        <NumberField :model-value="period.readings.endB" label="Relevé final" suffix="kWh" :min="0" :disabled="readonly" @update:model-value="(v) => patch('endB', v)" />
        <p class="text-sm">
          Consommation :
          <span class="font-semibold">{{ r.consumptionB !== null ? formatKwh(r.consumptionB) : '—' }}</span>
        </p>
      </div>
    </div>

    <ul v-if="r.issues.length" class="space-y-1 rounded-lg bg-rose-950/40 p-3 text-sm text-rose-300">
      <li v-for="(i, idx) in r.issues" :key="idx">⚠ {{ i.message }}</li>
    </ul>
  </section>
</template>
