<script setup lang="ts">
/**
 * Modal dialog with focus trap, overlay close, and keyboard support.
 * @prop {boolean} isOpen - Whether the modal is visible
 * @prop {string} [title] - Modal header title
 * @prop {'sm' | 'md' | 'lg'} [size='md'] - Modal width
 * @prop {boolean} [closeOnOverlay=true] - Close when clicking overlay
 */
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue';

interface Props {
  isOpen: boolean;
  title?: string;
  size?: 'sm' | 'md' | 'lg';
  closeOnOverlay?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  closeOnOverlay: true,
});

const emit = defineEmits<{
  close: [];
}>();

const dialogRef = ref<HTMLDivElement | null>(null);
const previousFocus = ref<HTMLElement | null>(null);

const sizeMap: Record<string, string> = { sm: '400px', md: '560px', lg: '720px' };

function handleKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close');
  if (e.key === 'Tab' && dialogRef.value) {
    const focusable = dialogRef.value.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
}

watch(() => props.isOpen, async (open) => {
  if (open) {
    previousFocus.value = document.activeElement as HTMLElement;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);
    await nextTick();
    dialogRef.value?.focus();
  } else {
    document.body.style.overflow = '';
    document.removeEventListener('keydown', handleKeyDown);
    previousFocus.value?.focus();
  }
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown);
  document.body.style.overflow = '';
});
</script>

<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="modal-overlay"
      @click="closeOnOverlay && emit('close')"
    >
      <div
        ref="dialogRef"
        role="dialog"
        aria-modal="true"
        :aria-label="title || 'Modal'"
        tabindex="-1"
        class="modal-dialog"
        :style="{ maxWidth: sizeMap[size] }"
        @click.stop
      >
        <div v-if="title" class="modal-header">
          <h2 class="modal-title">{{ title }}</h2>
          <button @click="emit('close')" aria-label="Close" class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <slot />
        </div>
        <div v-if="$slots.footer" class="modal-footer">
          <slot name="footer" />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.5);
  display: flex; align-items: center; justify-content: center; z-index: 9999;
}
.modal-dialog {
  background: var(--modal-bg, #fff); border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3); width: 90%; max-height: 85vh;
  display: flex; flex-direction: column; outline: none;
  animation: slideUp 0.2s ease;
}
.modal-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 16px 24px; border-bottom: 1px solid var(--border-color, #e5e7eb);
}
.modal-title { margin: 0; font-size: 18px; font-weight: 600; }
.modal-close {
  background: none; border: none; font-size: 20px; cursor: pointer;
  color: var(--text-secondary, #6b7280); padding: 4px 8px; border-radius: 6px;
}
.modal-body { padding: 24px; overflow-y: auto; flex: 1; }
.modal-footer {
  padding: 16px 24px; border-top: 1px solid var(--border-color, #e5e7eb);
  display: flex; justify-content: flex-end; gap: 8px;
}
@keyframes slideUp {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
