<script setup lang="ts">
import { computed } from 'vue'
import { useKontera } from '@/composables/useKontera'
import { formatAr, type ApartmentKey, type Transfer } from '@/domain'

const { store, period, settlement, tariff, nameA, nameB } = useKontera()
const cur = computed(() => tariff.value.currency)

function aptName(k: ApartmentKey) {
  return k === 'A' ? nameA.value : nameB.value
}
function isSettled(t: Transfer) {
  return (period.value?.settledTransfers ?? []).some(
    (s) => s.from === t.from && s.to === t.to && s.amount === t.amount,
  )
}
function markPaid(t: Transfer) {
  store.settleTransfer({ ...t, id: '', date: new Date().toISOString() })
}
</script>

<template>
  <section v-if="settlement && period" class="card space-y-4">
    <header>
      <h2 class="text-base font-semibold">5 · Soldes & transferts</h2>
      <p class="text-xs text-slate-500">solde = payé − coût réel · positif = crédit, négatif = dette</p>
    </header>

    <table class="w-full text-sm">
      <thead class="text-xs text-slate-500">
        <tr class="text-left">
          <th class="py-1"></th>
          <th>Prévu</th>
          <th>Payé</th>
          <th>Coût réel</th>
          <th class="text-right">Solde</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="k in (['A', 'B'] as ApartmentKey[])" :key="k" class="border-t border-slate-800">
          <td class="py-2 font-medium">{{ aptName(k) }}</td>
          <td>{{ formatAr(settlement.balances[k].forecastCost, cur) }}</td>
          <td>{{ formatAr(settlement.balances[k].paid, cur) }}</td>
          <td>{{ formatAr(settlement.balances[k].finalCost, cur) }}</td>
          <td
            class="text-right font-bold"
            :class="settlement.balances[k].balance >= 0 ? 'text-emerald-400' : 'text-rose-400'"
          >
            {{ formatAr(settlement.balances[k].balance, cur) }}
          </td>
        </tr>
      </tbody>
    </table>

    <div v-if="settlement.providerDebt > 0" class="rounded-lg bg-rose-950/40 p-3 text-sm text-rose-300">
      ⚠ La facture n'est pas entièrement couverte. Dette envers JIRAMA :
      <strong>{{ formatAr(settlement.providerDebt, cur) }}</strong>.
      Aucun transfert artificiel n'est créé.
    </div>

    <div>
      <p class="label">Transferts à effectuer entre occupants</p>
      <ul v-if="settlement.transfers.length" class="space-y-2">
        <li
          v-for="(t, i) in settlement.transfers"
          :key="i"
          class="flex items-center justify-between rounded-lg bg-slate-950/50 p-3 text-sm"
        >
          <span>
            <strong>{{ aptName(t.from) }}</strong> doit verser
            <strong class="text-brand-300">{{ formatAr(t.amount, cur) }}</strong> à
            <strong>{{ aptName(t.to) }}</strong>
          </span>
          <button
            v-if="!isSettled(t)"
            class="btn-primary"
            @click="markPaid(t)"
          >
            Marquer réglé
          </button>
          <span v-else class="badge bg-emerald-900/60 text-emerald-300">✓ Réglé</span>
        </li>
      </ul>
      <p v-else class="text-sm text-slate-500">Aucun transfert nécessaire.</p>
    </div>

    <div v-if="period.settledTransfers.length" class="text-xs text-slate-500">
      <p class="mb-1 font-medium">Historique des règlements</p>
      <ul class="space-y-0.5">
        <li v-for="s in period.settledTransfers" :key="s.id">
          {{ new Date(s.date).toLocaleDateString('fr-FR') }} — {{ aptName(s.from) }} →
          {{ aptName(s.to) }} : {{ formatAr(s.amount, cur) }}
          <button class="ml-2 text-slate-600 hover:text-rose-400" @click="store.unsettleTransfer(s.id)">
            annuler
          </button>
        </li>
      </ul>
    </div>
  </section>
</template>
