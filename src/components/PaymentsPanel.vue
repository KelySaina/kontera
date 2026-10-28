<script setup lang="ts">
import { computed, reactive } from 'vue'
import { useKontera } from '@/composables/useKontera'
import NumberField from './NumberField.vue'
import { formatAr, imputedPaid, totalToppedUp, type Transaction } from '@/domain'

const { store, period, tariff, nameA, nameB, readonly } = useKontera()
const cur = computed(() => tariff.value.currency)

const TYPE_LABELS: Record<Transaction['type'], string> = {
  payment: 'Paiement occupant',
  topup: "Achat de crédit (dépense)",
  refund: 'Remboursement à occupant',
  adjustment: 'Ajustement (signé)',
  carry: 'Report période précédente',
}

const form = reactive({
  type: 'payment' as Transaction['type'],
  apartment: 'A' as 'A' | 'B' | null,
  amount: null as number | null,
  kwh: null as number | null,
  note: '',
})

const txs = computed(() => period.value?.transactions ?? [])
const paidA = computed(() => imputedPaid(txs.value, 'A'))
const paidB = computed(() => imputedPaid(txs.value, 'B'))
const spent = computed(() => totalToppedUp(txs.value))

function add() {
  if (form.amount === null || form.amount <= 0) return
  store.addTransaction({
    type: form.type,
    apartment: form.type === 'topup' ? form.apartment : form.apartment,
    amount: form.amount,
    kwh: form.type === 'topup' ? form.kwh : null,
    date: new Date().toISOString(),
    note: form.note || undefined,
  })
  form.amount = null
  form.kwh = null
  form.note = ''
}
</script>

<template>
  <section v-if="period" class="card space-y-4">
    <header class="flex items-center justify-between">
      <h2 class="text-base font-semibold">2 · Paiements & crédit</h2>
    </header>

    <div class="grid grid-cols-3 gap-2 text-center text-sm">
      <div class="rounded-lg bg-slate-950/50 p-2">
        <p class="text-xs text-slate-500">{{ nameA }} net</p>
        <p class="font-semibold text-brand-300">{{ formatAr(paidA, cur) }}</p>
      </div>
      <div class="rounded-lg bg-slate-950/50 p-2">
        <p class="text-xs text-slate-500">{{ nameB }} net</p>
        <p class="font-semibold text-brand-300">{{ formatAr(paidB, cur) }}</p>
      </div>
      <div class="rounded-lg bg-slate-950/50 p-2">
        <p class="text-xs text-slate-500">Crédit acheté</p>
        <p class="font-semibold text-slate-300">{{ formatAr(spent, cur) }}</p>
      </div>
    </div>

    <div v-if="!readonly" class="grid grid-cols-1 gap-2 sm:grid-cols-2">
      <label class="block">
        <span class="label">Type</span>
        <select v-model="form.type" class="input">
          <option v-for="(l, k) in TYPE_LABELS" :key="k" :value="k">{{ l }}</option>
        </select>
      </label>
      <label class="block">
        <span class="label">Appartement</span>
        <select v-model="form.apartment" class="input">
          <option value="A">{{ nameA }}</option>
          <option value="B">{{ nameB }}</option>
          <option v-if="form.type === 'topup'" :value="null">Commun</option>
        </select>
      </label>
      <NumberField v-model="form.amount" label="Montant" :suffix="cur" :min="0" />
      <NumberField
        v-if="form.type === 'topup'"
        v-model="form.kwh"
        label="kWh achetés (optionnel)"
        suffix="kWh"
        :min="0"
      />
      <label class="block sm:col-span-2">
        <span class="label">Note (optionnel)</span>
        <input v-model="form.note" class="input" placeholder="ex: Mvola, espèces…" />
      </label>
      <div class="sm:col-span-2">
        <button class="btn-primary w-full" @click="add">Enregistrer la transaction</button>
      </div>
    </div>

    <ul v-if="txs.length" class="divide-y divide-slate-800 text-sm">
      <li v-for="t in txs" :key="t.id" class="flex items-center justify-between gap-2 py-2">
        <div>
          <p class="font-medium">
            {{ TYPE_LABELS[t.type] }}
            <span class="text-slate-500">· {{ t.apartment ?? 'commun' }}</span>
          </p>
          <p class="text-xs text-slate-500">
            {{ new Date(t.date).toLocaleDateString('fr-FR') }}
            <span v-if="t.note">· {{ t.note }}</span>
          </p>
        </div>
        <div class="flex items-center gap-3">
          <span
            class="font-semibold"
            :class="t.type === 'refund' ? 'text-rose-400' : 'text-slate-200'"
          >
            {{ formatAr(t.amount, cur) }}
          </span>
          <button
            v-if="!readonly"
            class="text-slate-500 hover:text-rose-400"
            title="Supprimer"
            @click="store.removeTransaction(t.id)"
          >
            ✕
          </button>
        </div>
      </li>
    </ul>
    <p v-else class="text-sm text-slate-500">Aucune transaction enregistrée.</p>
  </section>
</template>
