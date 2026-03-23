<script setup lang="ts">
/**
 * Dropdown select with keyboard navigation and accessible markup.
 * @prop {DropdownOption[]} options - Selectable options
 * @prop {string} [modelValue] - Selected value (v-model)
 * @prop {string} [placeholder='Select...'] - Placeholder text
 * @prop {boolean} [disabled=false] - Disable the dropdown
 * @prop {string} [label] - Accessible label
 */
import { ref, computed, onMounted, onUnmounted } from 'vue';

interface DropdownOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface Props {
  options: DropdownOption[];
  modelValue?: string;
  placeholder?: string;
  disabled?: boolean;
  label?: string;
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'Select...',
  disabled: false,
});

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const isOpen = ref(false);
const highlightedIndex = ref(-1);
const containerRef = ref<HTMLDivElement | null>(null);

const selectedOption = computed(() => props.options.find((o) => o.value === props.modelValue));

function close() {
  isOpen.value = false;
  highlightedIndex.value = -1;
}

function toggle() {
  if (props.disabled) return;
  isOpen.value = !isOpen.value;
}

function select(opt: DropdownOption) {
  if (opt.disabled) return;
  emit('update:modelValue', opt.value);
  close();
}

function handleKeyDown(e: KeyboardEvent) {
  if (props.disabled) return;
  const enabled = props.options.filter((o) => !o.disabled);
  switch (e.key) {
    case 'Enter':
    case ' ':
      e.preventDefault();
      if (!isOpen.value) { isOpen.value = true; }
      else if (highlightedIndex.value >= 0) { select(enabled[highlightedIndex.value]); }
      break;
    case 'ArrowDown':
      e.preventDefault();
      if (!isOpen.value) { isOpen.value = true; break; }
      highlightedIndex.value = Math.min(highlightedIndex.value + 1, enabled.length - 1);
      break;
    case 'ArrowUp':
      e.preventDefault();
      highlightedIndex.value = Math.max(highlightedIndex.value - 1, 0);
      break;
    case 'Escape':
      close();
      break;
  }
}

function handleClickOutside(e: MouseEvent) {
  if (containerRef.value && !containerRef.value.contains(e.target as Node)) close();
}

onMounted(() => document.addEventListener('mousedown', handleClickOutside));
onUnmounted(() => document.removeEventListener('mousedown', handleClickOutside));
</script>

<template>
  <div ref="containerRef" class="dropdown">
    <label v-if="label" class="dropdown-label">{{ label }}</label>
    <button
      type="button"
      role="combobox"
      :aria-expanded="isOpen"
      aria-haspopup="listbox"
      :aria-label="label || placeholder"
      :disabled="disabled"
      class="dropdown-trigger"
      :class="{ open: isOpen, disabled }"
      @click="toggle"
      @keydown="handleKeyDown"
    >
      <span :class="selectedOption ? 'selected-text' : 'placeholder-text'">
        {{ selectedOption ? selectedOption.label : placeholder }}
      </span>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" :class="{ rotated: isOpen }">
        <path d="M4 6L8 10L12 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>
    <ul v-if="isOpen" role="listbox" class="dropdown-menu">
      <li
        v-for="(opt, i) in options"
        :key="opt.value"
        role="option"
        :aria-selected="opt.value === modelValue"
        :aria-disabled="opt.disabled"
        class="dropdown-option"
        :class="{
          selected: opt.value === modelValue,
          highlighted: i === highlightedIndex,
          'opt-disabled': opt.disabled,
        }"
        @click="select(opt)"
        @mouseenter="!opt.disabled && (highlightedIndex = i)"
      >
        {{ opt.label }}
      </li>
    </ul>
  </div>
</template>

<style scoped>
.dropdown { position: relative; width: 100%; }
.dropdown-label { display: block; margin-bottom: 6px; font-size: 14px; font-weight: 500; }
.dropdown-trigger {
  width: 100%; display: flex; align-items: center; justify-content: space-between;
  padding: 10px 14px; background: var(--input-bg, #fff); border: 1px solid var(--border-color, #d1d5db);
  border-radius: 8px; font-size: 14px; cursor: pointer; outline: none;
}
.dropdown-trigger.open { border-color: var(--primary, #3b82f6); box-shadow: 0 0 0 3px rgba(59,130,246,0.15); }
.dropdown-trigger.disabled { opacity: 0.5; cursor: not-allowed; }
.selected-text { color: var(--text-primary, #111827); }
.placeholder-text { color: var(--text-tertiary, #9ca3af); }
svg.rotated { transform: rotate(180deg); }
svg { transition: transform 0.2s; }
.dropdown-menu {
  position: absolute; top: 100%; left: 0; right: 0; margin-top: 4px; padding: 4px;
  background: var(--dropdown-bg, #fff); border: 1px solid var(--border-color, #e5e7eb);
  border-radius: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.12); list-style: none;
  z-index: 50; max-height: 240px; overflow-y: auto;
}
.dropdown-option {
  padding: 8px 12px; border-radius: 6px; cursor: pointer; font-size: 14px;
  transition: background 0.1s;
}
.dropdown-option.selected { font-weight: 600; color: var(--primary, #3b82f6); }
.dropdown-option.highlighted { background: var(--hover-bg, #f3f4f6); }
.dropdown-option.opt-disabled { opacity: 0.4; cursor: not-allowed; }
</style>
