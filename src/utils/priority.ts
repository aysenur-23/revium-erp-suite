/**
 * Standard Priority System
 * Tüm uygulamada tutarlı öncelik sistemi
 * 0-5 arası değerler, 6 seviye
 */

export type PriorityLevel = 0 | 1 | 2 | 3 | 4 | 5;

export interface PriorityOption {
  value: PriorityLevel;
  label: string;
  shortLabel: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon?: string;
}

/**
 * Standard priority options - tüm uygulamada kullanılacak
 */
export const PRIORITY_OPTIONS: PriorityOption[] = [
  {
    value: 0,
    label: "Düşük",
    shortLabel: "Düşük",
    color: "text-slate-600 dark:text-slate-400",
    bgColor: "bg-slate-100 dark:bg-slate-800",
    borderColor: "border-slate-300 dark:border-slate-600",
  },
  {
    value: 1,
    label: "Normal",
    shortLabel: "Normal",
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
    borderColor: "border-blue-300 dark:border-blue-600",
  },
  {
    value: 2,
    label: "Orta",
    shortLabel: "Orta",
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
    borderColor: "border-amber-300 dark:border-amber-600",
  },
  {
    value: 3,
    label: "Yüksek",
    shortLabel: "Yüksek",
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-100 dark:bg-orange-900/30",
    borderColor: "border-orange-300 dark:border-orange-600",
  },
  {
    value: 4,
    label: "Çok Yüksek",
    shortLabel: "Çok Yüksek",
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-100 dark:bg-red-900/30",
    borderColor: "border-red-300 dark:border-red-600",
  },
  {
    value: 5,
    label: "Acil",
    shortLabel: "Acil",
    color: "text-destructive dark:text-destructive",
    bgColor: "bg-destructive/15 dark:bg-destructive/20",
    borderColor: "border-destructive/30 dark:border-destructive/40",
  },
];

/**
 * Priority değerinden label al
 */
export function getPriorityLabel(priority: number | null | undefined): string {
  if (priority === null || priority === undefined) {
    return PRIORITY_OPTIONS[0].label;
  }
  const option = PRIORITY_OPTIONS.find(opt => opt.value === priority);
  return option?.label || PRIORITY_OPTIONS[0].label;
}

/**
 * Priority değerinden short label al
 */
export function getPriorityShortLabel(priority: number | null | undefined): string {
  if (priority === null || priority === undefined) {
    return PRIORITY_OPTIONS[0].shortLabel;
  }
  const option = PRIORITY_OPTIONS.find(opt => opt.value === priority);
  return option?.shortLabel || PRIORITY_OPTIONS[0].shortLabel;
}

/**
 * Priority değerinden tam option objesi al
 */
export function getPriorityOption(priority: number | null | undefined): PriorityOption {
  if (priority === null || priority === undefined) {
    return PRIORITY_OPTIONS[0];
  }
  const option = PRIORITY_OPTIONS.find(opt => opt.value === priority);
  return option || PRIORITY_OPTIONS[0];
}

/**
 * Priority değerinden badge className al
 */
export function getPriorityBadgeClassName(priority: number | null | undefined): string {
  const option = getPriorityOption(priority);
  return `${option.bgColor} ${option.color} ${option.borderColor} border`;
}

/**
 * Priority değerinden meta bilgi al (eski sistemle uyumluluk için)
 */
export function getPriorityMeta(priority: number | null | undefined): {
  label: string;
  className: string;
  value: number;
} {
  const option = getPriorityOption(priority);
  return {
    label: `${option.label} (${option.value})`,
    className: getPriorityBadgeClassName(priority),
    value: option.value,
  };
}

/**
 * Priority select options (React Select için)
 */
export function getPrioritySelectOptions(): Array<{ value: string; label: string }> {
  return PRIORITY_OPTIONS.map(opt => ({
    value: opt.value.toString(),
    label: `${opt.label} (${opt.value})`,
  }));
}

/**
 * Priority değerini normalize et (0-5 arası)
 */
export function normalizePriority(priority: number | null | undefined): PriorityLevel {
  if (priority === null || priority === undefined) {
    return 0;
  }
  if (priority < 0) return 0;
  if (priority > 5) return 5;
  return priority as PriorityLevel;
}

/**
 * Priority değerini eski sistemden (1-5) yeni sisteme (0-5) çevir
 */
export function convertOldPriorityToNew(oldPriority: number | null | undefined): PriorityLevel {
  if (oldPriority === null || oldPriority === undefined) {
    return 0;
  }
  // Eski sistem: 1-5, Yeni sistem: 0-5
  // 1 -> 0, 2 -> 1, 3 -> 2, 4 -> 3, 5 -> 4 veya 5
  if (oldPriority >= 1 && oldPriority <= 5) {
    return (oldPriority - 1) as PriorityLevel;
  }
  return normalizePriority(oldPriority);
}

/**
 * Priority değerini yeni sistemden (0-5) eski sisteme (1-5) çevir (geriye dönük uyumluluk için)
 */
export function convertNewPriorityToOld(newPriority: number | null | undefined): number {
  if (newPriority === null || newPriority === undefined) {
    return 1;
  }
  // Yeni sistem: 0-5, Eski sistem: 1-5
  // 0 -> 1, 1 -> 2, 2 -> 3, 3 -> 4, 4 -> 5, 5 -> 5
  if (newPriority >= 0 && newPriority <= 5) {
    return Math.min(newPriority + 1, 5);
  }
  return 1;
}

