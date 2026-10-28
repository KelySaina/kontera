<script setup lang="ts">
defineProps<{
  modelValue: number | null
  label?: string
  suffix?: string
  min?: number
  step?: number
  placeholder?: string
  disabled?: boolean
}>()
const emit = defineEmits<{ 'update:modelValue': [number | null] }>()

function onInput(e: Event) {
  const raw = (e.target as HTMLInputElement).value
  if (raw === '') {
    emit('update:modelValue', null)
    return
  }
  const n = Number(raw.replace(',', '.'))
  emit('update:modelValue', Number.isNaN(n) ? null : n)
}
</script>

<template>
  <label class="block">
    <span v-if="label" class="label">{{ label }}</span>
    <span class="relative block">
      <input
        class="input"
        type="number"
        inputmode="decimal"
        :value="modelValue ?? ''"
        :min="min"
        :step="step ?? 'any'"
        :placeholder="placeholder"
        :disabled="disabled"
        @input="onInput"
      />
      <span
        v-if="suffix"
        class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500"
        >{{ suffix }}</span
      >
    </span>
  </label>
</template>
