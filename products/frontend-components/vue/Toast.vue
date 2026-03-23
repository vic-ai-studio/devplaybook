<script setup lang="ts">
/**
 * Toast notification with auto-dismiss and animated progress bar.
 * @prop {string} message - Notification text
 * @prop {'success' | 'error' | 'warning' | 'info'} [type='info'] - Toast variant
 * @prop {number} [duration=4000] - Auto-dismiss time in ms (0 = manual only)
 * @prop {'top-right' | 'bottom-right'} [position='top-right'] - Screen position
 */
import { ref, onMounted, onUnmounted, computed } from 'vue';

interface Props {
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  position?: 'top-right' | 'bottom-right';
}

const props = withDefaults(defineProps<Props>(), {
  type: 'info',
  duration: 4000,
  position: 'top-right',
});

const emit = defineEmits<{ close: [] }>();

const isExiting = ref(false);
let timer: ReturnType<typeof setTimeout> | undefined;

const icons: Record<string, string> = {
  success: '\u2713', error: '\u2715', warning: '\u26A0', info: '\u2139',
};

const colors: Record<string, { bg: string; border: string; icon: string }> = {
  success: { bg: '#f0fdf4', border: '#86efac', icon: '#16a34a' },
  error: { bg: '#fef2f2', border: '#fca5a5', icon: '#dc2626' },
  warning: { bg: '#fffbeb', border: '#fcd34d', icon: '#d97706' },
  info: { bg: '#eff6ff', border: '#93c5fd', icon: '#2563eb' },
};

const c = computed(() => colors[props.type]);

function dismiss() {
  isExiting.value = true;
  setTimeout(() => emit('close'), 200);
}

onMounted(() => {
  if (props.duration > 0) {
    timer = setTimeout(dismiss, props.duration);
  }
});

onUnmounted(() => { if (timer) clearTimeout(timer); });
</script>

<template>
  <div
    role="alert"
    aria-live="assertive"
    class="toast"
    :class="[position, { exiting: isExiting }]"
    :style="{
      background: c.bg,
      borderColor: c.border,
    }"
  >
    <span class="toast-icon" :style="{ color: c.icon }">{{ icons[type] }}</span>
    <p class="toast-message">{{ message }}</p>
    <button @click="dismiss" aria-label="Dismiss" class="toast-close">&times;</button>
    <div
      v-if="duration > 0"
      class="toast-progress"
      :style="{
        background: c.icon,
        animationDuration: duration + 'ms',
      }"
    />
  </div>
</template>

<style scoped>
.toast {
  position: fixed; z-index: 10000; display: flex; align-items: flex-start; gap: 12px;
  padding: 14px 18px; border: 1px solid; border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.12); min-width: 300px; max-width: 440px;
  animation: toastIn 0.25s ease;
}
.toast.exiting { animation: toastOut 0.2s ease forwards; }
.toast.top-right { top: 20px; right: 20px; }
.toast.bottom-right { bottom: 20px; right: 20px; }
.toast-icon { font-size: 18px; line-height: 1; flex-shrink: 0; margin-top: 1px; }
.toast-message { margin: 0; flex: 1; font-size: 14px; line-height: 1.5; color: #1f2937; }
.toast-close {
  background: none; border: none; cursor: pointer; font-size: 16px; color: #9ca3af;
  padding: 0 2px; line-height: 1;
}
.toast-progress {
  position: absolute; bottom: 0; left: 0; height: 3px;
  border-radius: 0 0 10px 10px; animation: shrink linear forwards;
}
@keyframes toastIn { from { opacity: 0; transform: translateX(40px); } to { opacity: 1; transform: translateX(0); } }
@keyframes toastOut { from { opacity: 1; } to { opacity: 0; transform: translateX(40px); } }
@keyframes shrink { from { width: 100%; } to { width: 0; } }
</style>
