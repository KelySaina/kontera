<script setup lang="ts">
import { ref } from 'vue'
import { useKontera } from '@/composables/useKontera'
import { STATUS_LABELS } from '@/stores/model'

const { store, floor, period } = useKontera()
const addingPeriod = ref(false)
const newPeriodLabel = ref('')
const addingFloor = ref(false)
const newFloorName = ref('')

function confirmPeriod() {
  store.addPeriod(newPeriodLabel.value, true)
  newPeriodLabel.value = ''
  addingPeriod.value = false
}
function confirmFloor() {
  store.addFloor(newFloorName.value)
  newFloorName.value = ''
  addingFloor.value = false
}
</script>

<template>
  <div class="card space-y-3">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-end">
      <label class="block flex-1">
        <span class="label">Étage / compteur</span>
        <div class="flex gap-2">
          <select
            class="input"
            :value="floor?.id"
            @change="store.selectFloor(($event.target as HTMLSelectElement).value)"
          >
            <option v-for="f in store.data.floors" :key="f.id" :value="f.id">{{ f.name }}</option>
          </select>
          <button class="btn-ghost shrink-0" title="Nouvel étage" @click="addingFloor = !addingFloor">
            + Étage
          </button>
        </div>
      </label>

      <label class="block flex-1">
        <span class="label">Période de facturation</span>
        <div class="flex gap-2">
          <select
            class="input"
            :value="period?.id"
            @change="store.selectPeriod(($event.target as HTMLSelectElement).value)"
          >
            <option v-for="p in store.periodsForActiveFloor" :key="p.id" :value="p.id">
              {{ p.label }} — {{ STATUS_LABELS[p.status] }}
            </option>
          </select>
          <button class="btn-ghost shrink-0" title="Nouvelle période" @click="addingPeriod = !addingPeriod">
            + Période
          </button>
        </div>
      </label>
    </div>

    <div v-if="addingFloor" class="flex gap-2">
      <input v-model="newFloorName" class="input" placeholder="Nom de l'étage (ex: Étage 2)" />
      <button class="btn-primary shrink-0" @click="confirmFloor">Créer</button>
    </div>
    <div v-if="addingPeriod" class="flex gap-2">
      <input v-model="newPeriodLabel" class="input" placeholder="Libellé de la période (ex: Mars 2026)" />
      <button class="btn-primary shrink-0" @click="confirmPeriod">Créer (reporte les soldes)</button>
    </div>
  </div>
</template>
