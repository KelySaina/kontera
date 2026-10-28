<script setup lang="ts">
import { ref } from 'vue'
import { useKontera } from '@/composables/useKontera'
import NumberField from './NumberField.vue'

const { store, floor, tariff } = useKontera()
const importError = ref('')

function download() {
  const blob = new Blob([store.exportJSON()], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `kontera-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

function onImport(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    try {
      store.importJSON(String(reader.result))
      importError.value = ''
    } catch (err) {
      importError.value = (err as Error).message
    }
  }
  reader.readAsText(file)
}
</script>

<template>
  <section class="card space-y-4">
    <h2 class="text-base font-semibold">Paramètres</h2>

    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <NumberField
        :model-value="tariff.reducedRate"
        label="Tarif réduit"
        suffix="Ar/kWh"
        :min="0"
        @update:model-value="(v) => store.updateTariff({ reducedRate: v ?? 0 })"
      />
      <NumberField
        :model-value="tariff.reducedThreshold"
        label="Tranche réduite (partagée)"
        suffix="kWh"
        :min="0"
        @update:model-value="(v) => store.updateTariff({ reducedThreshold: v ?? 0 })"
      />
      <NumberField
        :model-value="tariff.normalRate"
        label="Tarif au-delà"
        suffix="Ar/kWh"
        :min="0"
        @update:model-value="(v) => store.updateTariff({ normalRate: v ?? 0 })"
      />
      <label class="block">
        <span class="label">Devise</span>
        <input
          class="input"
          :value="tariff.currency"
          @input="store.updateTariff({ currency: ($event.target as HTMLInputElement).value })"
        />
      </label>
    </div>

    <div v-if="floor" class="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <label class="block sm:col-span-2"><span class="label">Nom de l'étage</span>
        <input class="input" :value="floor.name" @input="store.updateFloor(floor.id, { name: ($event.target as HTMLInputElement).value })" />
      </label>
      <label class="block"><span class="label">Nom appartement A</span>
        <input class="input" :value="floor.apartmentAName" @input="store.updateFloor(floor.id, { apartmentAName: ($event.target as HTMLInputElement).value })" />
      </label>
      <label class="block"><span class="label">Nom appartement B</span>
        <input class="input" :value="floor.apartmentBName" @input="store.updateFloor(floor.id, { apartmentBName: ($event.target as HTMLInputElement).value })" />
      </label>
    </div>

    <div class="flex flex-wrap gap-2 border-t border-slate-800 pt-3">
      <button class="btn-ghost" @click="download">⬇ Exporter (JSON)</button>
      <label class="btn-ghost cursor-pointer">
        ⬆ Importer (JSON)
        <input type="file" accept="application/json" class="hidden" @change="onImport" />
      </label>
    </div>
    <p v-if="importError" class="text-sm text-rose-400">{{ importError }}</p>
    <p class="text-xs text-slate-500">
      Les données restent locales (IndexedDB). Exportez régulièrement pour éviter toute perte.
    </p>
  </section>
</template>
