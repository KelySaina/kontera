<script setup lang="ts">
import { computed } from 'vue'
import { useKontera } from '@/composables/useKontera'
import NumberField from './NumberField.vue'
import { formatAr, formatKwh, type DiscrepancyMethod } from '@/domain'

const { store, period, settlement, tariff, nameA, nameB, readonly } = useKontera()
const cur = computed(() => tariff.value.currency)
const reg = computed(() => settlement.value?.regularization ?? null)
const ready = computed(() => settlement.value?.readings.complete ?? false)

const methods: Record<DiscrepancyMethod, string> = {
  proportional: 'Proportionnelle aux kWh',
  equal: 'À parts égales',
  ignore: 'Ignorer (barème sous-compteurs)',
}
</script>

<template>
  <section v-if="period" class="card space-y-4">
    <header>
      <h2 class="text-base font-semibold">4 · Régularisation réelle</h2>
      <p class="text-xs text-slate-500">
        Nécessite des relevés complets. Renseignez le compteur principal ou le montant facturé.
      </p>
    </header>

    <p v-if="!ready" class="rounded-lg bg-slate-950/50 p-3 text-sm text-slate-400">
      Complétez d'abord les relevés des deux sous-compteurs.
    </p>

    <template v-else>
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <NumberField
          :model-value="period.mainKwh"
          label="Compteur principal (kWh, optionnel)"
          suffix="kWh"
          :min="0"
          :disabled="readonly"
          @update:model-value="(v) => store.updateRegularizationInputs({ mainKwh: v })"
        />
        <NumberField
          :model-value="period.billedAmount"
          label="Montant facturé JIRAMA (optionnel)"
          :suffix="cur"
          :min="0"
          :disabled="readonly"
          @update:model-value="(v) => store.updateRegularizationInputs({ billedAmount: v })"
        />
        <label class="block sm:col-span-2">
          <span class="label">Répartition de l'écart compteur / sous-compteurs</span>
          <select
            class="input"
            :value="period.discrepancyMethod"
            :disabled="readonly"
            @change="store.updateRegularizationInputs({ discrepancyMethod: ($event.target as HTMLSelectElement).value as DiscrepancyMethod })"
          >
            <option v-for="(l, k) in methods" :key="k" :value="k">{{ l }}</option>
          </select>
        </label>
      </div>

      <div v-if="reg" class="space-y-3">
        <ul v-if="reg.warnings.length" class="space-y-1 rounded-lg bg-amber-950/40 p-3 text-sm text-amber-300">
          <li v-for="(w, i) in reg.warnings" :key="i">⚠ {{ w }}</li>
        </ul>

        <table class="w-full text-sm">
          <thead class="text-xs text-slate-500">
            <tr class="text-left">
              <th class="py-1"></th>
              <th>Conso réelle</th>
              <th>Tranche réduite</th>
              <th class="text-right">Coût réel</th>
            </tr>
          </thead>
          <tbody>
            <tr class="border-t border-slate-800">
              <td class="py-1.5 font-medium">{{ nameA }}</td>
              <td>{{ formatKwh((settlement!.readings.consumptionA) ?? 0) }}</td>
              <td>{{ formatKwh(reg.split.A.reducedKwh) }}</td>
              <td class="text-right font-semibold text-brand-300">{{ formatAr(reg.split.A.total, cur) }}</td>
            </tr>
            <tr class="border-t border-slate-800">
              <td class="py-1.5 font-medium">{{ nameB }}</td>
              <td>{{ formatKwh((settlement!.readings.consumptionB) ?? 0) }}</td>
              <td>{{ formatKwh(reg.split.B.reducedKwh) }}</td>
              <td class="text-right font-semibold text-brand-300">{{ formatAr(reg.split.B.total, cur) }}</td>
            </tr>
            <tr class="border-t border-slate-700 font-semibold">
              <td class="py-1.5">Total réel</td>
              <td colspan="2" class="text-xs text-slate-500">base : {{ reg.basis }}</td>
              <td class="text-right">{{ formatAr(reg.totalCost, cur) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </section>
</template>
