<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useAppStore } from '@/stores/app'
import ContextBar from '@/components/ContextBar.vue'
import StatusStepper from '@/components/StatusStepper.vue'
import SummaryGrid from '@/components/SummaryGrid.vue'
import PrevisionPanel from '@/components/PrevisionPanel.vue'
import PaymentsPanel from '@/components/PaymentsPanel.vue'
import ReadingsPanel from '@/components/ReadingsPanel.vue'
import RegularizationPanel from '@/components/RegularizationPanel.vue'
import SettlementPanel from '@/components/SettlementPanel.vue'
import HistoryPanel from '@/components/HistoryPanel.vue'
import SettingsPanel from '@/components/SettingsPanel.vue'

const store = useAppStore()
const tab = ref<'dashboard' | 'entry' | 'history' | 'settings'>('dashboard')

const tabs = [
  { key: 'dashboard', label: 'Tableau de bord' },
  { key: 'entry', label: 'Saisie' },
  { key: 'history', label: 'Historique' },
  { key: 'settings', label: 'Paramètres' },
] as const

onMounted(() => store.load())
</script>

<template>
  <div class="mx-auto flex min-h-full max-w-3xl flex-col px-4 pb-24 pt-5">
    <header class="mb-4 flex items-center gap-3">
      <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-700 text-xl">⚡</div>
      <div>
        <h1 class="text-lg font-bold leading-tight">Kontera</h1>
        <p class="text-xs text-slate-500">Répartition des frais d'électricité JIRAMA</p>
      </div>
    </header>

    <div v-if="!store.loaded" class="card text-center text-slate-400">Chargement…</div>

    <template v-else>
      <ContextBar class="mb-4" />
      <StatusStepper class="mb-4" />

      <main class="space-y-4">
        <template v-if="tab === 'dashboard'">
          <SummaryGrid />
          <SettlementPanel />
        </template>

        <template v-else-if="tab === 'entry'">
          <PrevisionPanel />
          <PaymentsPanel />
          <ReadingsPanel />
          <RegularizationPanel />
        </template>

        <template v-else-if="tab === 'history'">
          <HistoryPanel />
        </template>

        <template v-else>
          <SettingsPanel />
        </template>
      </main>
    </template>

    <nav
      class="fixed inset-x-0 bottom-0 z-10 border-t border-slate-800 bg-slate-950/90 backdrop-blur"
    >
      <div class="mx-auto flex max-w-3xl">
        <button
          v-for="t in tabs"
          :key="t.key"
          class="flex-1 py-3 text-xs font-medium transition"
          :class="tab === t.key ? 'text-brand-300' : 'text-slate-500 hover:text-slate-300'"
          @click="tab = t.key"
        >
          {{ t.label }}
        </button>
      </div>
    </nav>
  </div>
</template>
