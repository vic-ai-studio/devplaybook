<script setup lang="ts">
/**
 * Accessible tabbed interface with keyboard navigation and two visual variants.
 * @prop {TabItem[]} tabs - Tab definitions with value, label, and slot content
 * @prop {string} [modelValue] - Active tab value (v-model)
 * @prop {'line' | 'pill'} [variant='line'] - Visual style
 */
import { ref, computed } from 'vue';

interface TabItem {
  value: string;
  label: string;
  disabled?: boolean;
}

interface Props {
  tabs: TabItem[];
  modelValue?: string;
  variant?: 'line' | 'pill';
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'line',
});

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const internalTab = ref(props.tabs[0]?.value || '');
const active = computed(() => props.modelValue ?? internalTab.value);

function setActive(val: string) {
  internalTab.value = val;
  emit('update:modelValue', val);
}

const enabledTabs = computed(() => props.tabs.filter((t) => !t.disabled));

function handleKeyDown(e: KeyboardEvent, idx: number) {
  const tabs = enabledTabs.value;
  let nextIdx = idx;
  if (e.key === 'ArrowRight') nextIdx = (idx + 1) % tabs.length;
  else if (e.key === 'ArrowLeft') nextIdx = (idx - 1 + tabs.length) % tabs.length;
  else if (e.key === 'Home') nextIdx = 0;
  else if (e.key === 'End') nextIdx = tabs.length - 1;
  else return;
  e.preventDefault();
  setActive(tabs[nextIdx].value);
}
</script>

<template>
  <div class="tabs-container">
    <div
      role="tablist"
      aria-orientation="horizontal"
      :class="['tablist', variant]"
    >
      <button
        v-for="(tab, i) in tabs"
        :key="tab.value"
        role="tab"
        :id="`tab-${tab.value}`"
        :aria-selected="tab.value === active"
        :aria-controls="`panel-${tab.value}`"
        :tabindex="tab.value === active ? 0 : -1"
        :disabled="tab.disabled"
        :class="['tab', variant, { active: tab.value === active, disabled: tab.disabled }]"
        @click="setActive(tab.value)"
        @keydown="handleKeyDown($event, enabledTabs.indexOf(tab))"
      >
        {{ tab.label }}
      </button>
    </div>
    <div
      v-for="tab in tabs"
      :key="tab.value"
      v-show="tab.value === active"
      role="tabpanel"
      :id="`panel-${tab.value}`"
      :aria-labelledby="`tab-${tab.value}`"
      tabindex="0"
      class="tab-panel"
    >
      <slot :name="tab.value" />
    </div>
  </div>
</template>

<style scoped>
.tabs-container { width: 100%; }
.tablist.line {
  display: flex; gap: 0; border-bottom: 2px solid var(--border-color, #e5e7eb);
}
.tablist.pill {
  display: inline-flex; gap: 4px; padding: 4px;
  background: var(--tab-pill-bg, #f3f4f6); border-radius: 10px;
}
.tab {
  border: none; cursor: pointer; font-size: 14px; font-weight: 500;
  color: var(--text-secondary, #6b7280); outline: none; transition: all 0.15s;
  display: flex; align-items: center; gap: 6px;
}
.tab.line {
  padding: 10px 16px; background: none;
  border-bottom: 2px solid transparent; margin-bottom: -2px;
}
.tab.line.active { color: var(--primary, #3b82f6); border-bottom-color: var(--primary, #3b82f6); }
.tab.pill {
  padding: 8px 16px; border-radius: 8px; background: transparent;
}
.tab.pill.active {
  background: var(--tab-active-bg, #fff); color: var(--text-primary, #111827);
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
}
.tab.disabled { opacity: 0.4; cursor: not-allowed; }
.tab-panel { padding: 16px 0; }
</style>
