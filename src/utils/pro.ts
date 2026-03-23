// Pro status and daily usage utilities for DevPlaybook tools

export const FREE_DAILY_LIMIT = 3;
export const PRO_STORAGE_KEY = 'devplaybook_pro';

export function isProUser(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(PRO_STORAGE_KEY) === 'true';
}

function getToday(): string {
  return new Date().toISOString().slice(0, 10);
}

interface UsageRecord { count: number; date: string }

export function getDailyUsage(toolKey: string): UsageRecord {
  if (typeof window === 'undefined') return { count: 0, date: getToday() };
  try {
    const raw = localStorage.getItem(`dp_usage_${toolKey}`);
    if (!raw) return { count: 0, date: getToday() };
    const rec = JSON.parse(raw) as UsageRecord;
    if (rec.date !== getToday()) return { count: 0, date: getToday() };
    return rec;
  } catch {
    return { count: 0, date: getToday() };
  }
}

export function remainingUses(toolKey: string): number {
  if (isProUser()) return 999;
  return Math.max(0, FREE_DAILY_LIMIT - getDailyUsage(toolKey).count);
}

export function canUse(toolKey: string): boolean {
  if (isProUser()) return true;
  return getDailyUsage(toolKey).count < FREE_DAILY_LIMIT;
}

export function recordUsage(toolKey: string): void {
  const rec = getDailyUsage(toolKey);
  localStorage.setItem(`dp_usage_${toolKey}`, JSON.stringify({ count: rec.count + 1, date: getToday() }));
}

// Saved palettes for ColorPaletteGenerator
export const FREE_SAVE_LIMIT = 3;

export function getSavedPalettes(): Array<{ name: string; hex: string; mode: string; swatches: Array<{ label: string; hex: string }> }> {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('dp_saved_palettes');
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function canSavePalette(): boolean {
  if (isProUser()) return true;
  return getSavedPalettes().length < FREE_SAVE_LIMIT;
}

export function savePalette(name: string, hex: string, mode: string, swatches: Array<{ label: string; hex: string }>): void {
  const saved = getSavedPalettes();
  saved.unshift({ name, hex, mode, swatches });
  localStorage.setItem('dp_saved_palettes', JSON.stringify(saved));
}

export function deleteSavedPalette(index: number): void {
  const saved = getSavedPalettes();
  saved.splice(index, 1);
  localStorage.setItem('dp_saved_palettes', JSON.stringify(saved));
}
