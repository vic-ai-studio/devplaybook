<script setup lang="ts">
/**
 * Sortable, searchable data table with custom column rendering.
 * @prop {Column[]} columns - Column definitions
 * @prop {Record<string, any>[]} data - Row data
 * @prop {string} [rowKey] - Unique key field name
 * @prop {boolean} [sortable=true] - Enable sorting
 * @prop {boolean} [searchable=false] - Show search bar
 * @prop {string} [emptyMessage='No data'] - Empty state text
 */
import { ref, computed } from 'vue';

interface Column {
  key: string;
  title: string;
  sortable?: boolean;
  width?: string;
}

interface Props {
  columns: Column[];
  data: Record<string, any>[];
  rowKey?: string;
  sortable?: boolean;
  searchable?: boolean;
  emptyMessage?: string;
}

const props = withDefaults(defineProps<Props>(), {
  sortable: true,
  searchable: false,
  emptyMessage: 'No data',
});

const emit = defineEmits<{ rowClick: [row: Record<string, any>] }>();

const sortKey = ref<string | null>(null);
const sortDir = ref<'asc' | 'desc' | null>(null);
const search = ref('');

function handleSort(key: string) {
  if (!props.sortable) return;
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : sortDir.value === 'desc' ? null : 'asc';
    if (!sortDir.value) sortKey.value = null;
  } else {
    sortKey.value = key;
    sortDir.value = 'asc';
  }
}

const processed = computed(() => {
  let rows = [...props.data];
  if (search.value) {
    const q = search.value.toLowerCase();
    rows = rows.filter((row) =>
      props.columns.some((col) => String(row[col.key] ?? '').toLowerCase().includes(q))
    );
  }
  if (sortKey.value && sortDir.value) {
    const k = sortKey.value;
    const dir = sortDir.value;
    rows.sort((a, b) => {
      const cmp = a[k] < b[k] ? -1 : a[k] > b[k] ? 1 : 0;
      return dir === 'asc' ? cmp : -cmp;
    });
  }
  return rows;
});

function sortIcon(key: string): string {
  if (sortKey.value !== key || !sortDir.value) return ' \u2195';
  return sortDir.value === 'asc' ? ' \u2191' : ' \u2193';
}
</script>

<template>
  <div class="table-wrapper">
    <div v-if="searchable" class="search-bar">
      <input
        v-model="search"
        type="search"
        placeholder="Search..."
        aria-label="Search table"
        class="search-input"
      />
    </div>
    <div class="table-container">
      <table role="grid">
        <thead>
          <tr>
            <th
              v-for="col in columns"
              :key="col.key"
              :style="{ width: col.width }"
              :aria-sort="sortKey === col.key ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined"
              @click="col.sortable !== false && sortable ? handleSort(col.key) : undefined"
            >
              {{ col.title }}
              <span v-if="sortable && col.sortable !== false" class="sort-icon">{{ sortIcon(col.key) }}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="processed.length === 0">
            <td :colspan="columns.length" class="empty">{{ emptyMessage }}</td>
          </tr>
          <tr
            v-for="(row, i) in processed"
            :key="rowKey ? row[rowKey] : i"
            class="data-row"
            @click="emit('rowClick', row)"
          >
            <td v-for="col in columns" :key="col.key">
              <slot :name="`cell-${col.key}`" :value="row[col.key]" :row="row">
                {{ row[col.key] ?? '' }}
              </slot>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.table-wrapper { width: 100%; }
.search-bar { margin-bottom: 12px; }
.search-input {
  width: 100%; max-width: 320px; padding: 8px 14px;
  border: 1px solid var(--border-color, #d1d5db); border-radius: 8px;
  font-size: 14px; outline: none;
}
.table-container {
  overflow-x: auto; border-radius: 8px;
  border: 1px solid var(--border-color, #e5e7eb);
}
table { width: 100%; border-collapse: collapse; font-size: 14px; }
th {
  text-align: left; padding: 12px 16px; font-weight: 600; font-size: 12px;
  text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-secondary, #6b7280);
  background: var(--table-header-bg, #f9fafb);
  border-bottom: 1px solid var(--border-color, #e5e7eb); cursor: pointer; user-select: none;
}
.sort-icon { font-size: 12px; margin-left: 4px; opacity: 0.6; }
.data-row { border-bottom: 1px solid var(--border-color, #f3f4f6); cursor: pointer; }
.data-row:hover { background: var(--hover-bg, #f9fafb); }
td { padding: 12px 16px; color: var(--text-primary, #111827); }
.empty { padding: 40px 16px; text-align: center; color: var(--text-tertiary, #9ca3af); }
</style>
