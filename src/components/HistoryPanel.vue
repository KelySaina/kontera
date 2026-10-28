<script setup lang="ts">
import { computed } from 'vue'
import { useKontera } from '@/composables/useKontera'
import { STATUS_LABELS } from '@/stores/model'
import { formatAr } from '@/domain'

const { store, tariff } = useKontera()
const cur = computed(() => tariff.value.currency)
const periods = computed(() => store.periodsForActiveFloor)
</script>

<template>
  <section class="card space-y-3">
    <h2 class="text-base font-semibold">Historique des périodes</h2>
    <ul class="divide-y divide-slate-800 text-sm">
      <li
        v-for="p in periods"
        :key="p.id"
        class="flex cursor-pointer items-center justify-between gap-2 py-2 hover:text-brand-300"
        @click="store.selectPeriod(p.id)"
      >
        <div>
          <p class="font-medium">{{ p.label }}</p>
          <p class="text-xs text-slate-500">{{ STATUS_LABELS[p.status] }}</p>
        </div>
        <div class="text-right text-xs text-slate-500">
          <p v-if="p.snapshot">Total {{ formatAr(p.snapshot.totalCost, cur) }}</p>
          <p v-if="p.snapshot">
            Soldes A {{ formatAr(p.snapshot.balances.A, cur) }} · B
            {{ formatAr(p.snapshot.balances.B, cur) }}
          </p>
          <p v-else>en cours</p>
        </div>
      </li>
    </ul>
  </section>
</template>
