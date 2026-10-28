<script setup lang="ts">
import { computed } from 'vue'
import { useKontera } from '@/composables/useKontera'
import { STATUS_LABELS, STATUS_ORDER } from '@/stores/model'

const { period, store } = useKontera()
const currentIdx = computed(() =>
  period.value ? STATUS_ORDER.indexOf(period.value.status) : 0,
)
</script>

<template>
  <div v-if="period" class="card">
    <div class="flex items-center justify-between gap-2">
      <ol class="flex flex-1 flex-wrap items-center gap-1 text-xs">
        <li
          v-for="(s, i) in STATUS_ORDER"
          :key="s"
          class="badge"
          :class="
            i < currentIdx
              ? 'bg-brand-800/60 text-brand-100'
              : i === currentIdx
                ? 'bg-brand-600 text-white'
                : 'bg-slate-800 text-slate-400'
          "
        >
          {{ STATUS_LABELS[s] }}
        </li>
      </ol>
      <div class="flex shrink-0 gap-2">
        <button
          v-if="period.status !== 'closed'"
          class="btn-ghost"
          @click="store.closePeriod()"
          title="Fige les calculs en instantané"
        >
          Clôturer
        </button>
        <button v-else class="btn-ghost" @click="store.reopenPeriod()">Rouvrir</button>
      </div>
    </div>
    <p v-if="period.status === 'closed' && period.snapshot" class="mt-2 text-xs text-amber-300/80">
      Période clôturée le
      {{ new Date(period.snapshot.takenAt).toLocaleString('fr-FR') }}. Les calculs sont figés ;
      rouvrez pour modifier (action tracée).
    </p>
  </div>
</template>
