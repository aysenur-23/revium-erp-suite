/**
 * Task Helper Functions
 * Pure utility functions for task operations
 * Extracted from Tasks.tsx for better maintainability
 */

import { Timestamp } from "firebase/firestore";
import { addDays, isAfter, isBefore, startOfDay } from "date-fns";
import { CheckCircle2, Clock, AlertCircle, CircleDot, ChevronDown, ChevronUp, Minus } from "lucide-react";
import { getPriorityOption, convertOldPriorityToNew } from "@/utils/priority";
import { cn } from "@/lib/utils";

// Types
export interface TaskLike {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  priority?: number;
  due_date?: string | null;
  dueDate?: Timestamp | Date | string | null;
  created_at?: string;
  createdAt?: Timestamp | Date | string;
  projectId?: string | null;
  isArchived?: boolean;
  is_archived?: boolean;
  approvalStatus?: "pending" | "approved" | "rejected";
  createdBy?: string;
}

export interface StatusConfig {
  icon: typeof CheckCircle2;
  color: string;
  bgColor: string;
}

export interface StatusItem {
  value: string;
  label: string;
  icon: typeof CircleDot;
  color: string;
}

// Constants
export const TASK_STATUS_WORKFLOW: StatusItem[] = [
  { value: "pending", label: "Yapılacak", icon: CircleDot, color: "text-amber-500" },
  { value: "in_progress", label: "Devam Ediyor", icon: Clock, color: "text-blue-500" },
  { value: "completed", label: "Tamamlandı", icon: CheckCircle2, color: "text-emerald-600" },
  { value: "approved", label: "Onaylandı", icon: CheckCircle2, color: "text-green-600" },
];

export const STATUS_CONFIG: Record<string, StatusConfig> = {
  pending: { 
    icon: CircleDot, 
    color: "text-amber-500", 
    bgColor: "bg-amber-50 border-amber-200" 
  },
  in_progress: { 
    icon: Clock, 
    color: "text-blue-500", 
    bgColor: "bg-blue-50 border-blue-200" 
  },
  completed: { 
    icon: CheckCircle2, 
    color: "text-emerald-600", 
    bgColor: "bg-emerald-50 border-emerald-200" 
  },
  approved: { 
    icon: CheckCircle2, 
    color: "text-green-600", 
    bgColor: "bg-green-50 border-green-200" 
  },
};

export const STATUS_LABELS: Record<string, string> = {
  pending: "Yapılacak",
  in_progress: "Devam Ediyor",
  completed: "Tamamlandı",
  approved: "Onaylandı",
};

// Helper Functions

/**
 * Extract first name from full name
 */
export const getFirstName = (fullName: string | null | undefined): string => {
  if (!fullName) return "";
  return fullName.split(" ")[0] || fullName;
};

/**
 * Normalize status - remove "column_" prefix if present
 */
export const normalizeStatus = (status: string | undefined | null): string => {
  if (!status) return "pending";
  
  // If starts with "column_", it's a column ID (might be numeric)
  if (status.startsWith("column_")) {
    const statusFromColumn = status.replace("column_", "");
    // Check valid status values
    if (["pending", "in_progress", "completed", "approved", "cancelled"].includes(statusFromColumn)) {
      return statusFromColumn === "cancelled" ? "pending" : statusFromColumn;
    }
    // Numeric ID or invalid value, treat as "pending"
    return "pending";
  }
  
  // Check valid status values
  if (["pending", "in_progress", "completed", "approved", "cancelled"].includes(status)) {
    return status === "cancelled" ? "pending" : status;
  }
  
  return "pending"; // Fallback
};

/**
 * Get status label in Turkish
 */
export const getStatusLabel = (status: string): string => {
  const normalized = normalizeStatus(status);
  return STATUS_LABELS[normalized] || normalized;
};

/**
 * Get status icon configuration
 */
export const getStatusConfig = (status: string): StatusConfig => {
  const normalized = normalizeStatus(status);
  return STATUS_CONFIG[normalized] || { 
    icon: AlertCircle, 
    color: "text-muted-foreground", 
    bgColor: "bg-muted border-border" 
  };
};

/**
 * Safe date formatting with error handling
 */
export const formatDateSafe = (dateInput?: string | Date | Timestamp | null): string => {
  if (!dateInput) return "-";
  
  try {
    let date: Date;
    if (dateInput instanceof Timestamp) {
      date = dateInput.toDate();
    } else if (dateInput instanceof Date) {
      date = dateInput;
    } else {
      date = new Date(dateInput);
    }
    
    if (Number.isNaN(date.getTime())) return "-";
    
    return date.toLocaleDateString("tr-TR", { 
      day: "2-digit", 
      month: "short", 
      year: "numeric" 
    });
  } catch {
    return "-";
  }
};

/**
 * Format due date (short format)
 */
export const formatDueDate = (value?: string | null): string => {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "short",
    });
  } catch {
    return value;
  }
};

/**
 * Get priority color class
 */
export const getPriorityColor = (priority: number): string => {
  if (priority >= 3) return "text-destructive";
  if (priority === 2) return "text-warning";
  return "text-muted-foreground";
};

/**
 * Check if task is overdue
 */
export const isTaskOverdue = (task: TaskLike): boolean => {
  try {
    const dueDate = task.due_date 
      ? new Date(task.due_date) 
      : (task.dueDate 
        ? (task.dueDate instanceof Timestamp ? task.dueDate.toDate() : new Date(task.dueDate as string))
        : null);
    
    if (!dueDate || Number.isNaN(dueDate.getTime())) return false;
    
    return isBefore(dueDate, new Date()) && task.status !== "completed";
  } catch {
    return false;
  }
};

/**
 * Check if task is due soon (within 3 days)
 */
export const isTaskDueSoon = (task: TaskLike): boolean => {
  try {
    const dueDate = task.due_date 
      ? new Date(task.due_date) 
      : (task.dueDate 
        ? (task.dueDate instanceof Timestamp ? task.dueDate.toDate() : new Date(task.dueDate as string))
        : null);
    
    if (!dueDate || Number.isNaN(dueDate.getTime())) return false;
    
    const today = startOfDay(new Date());
    const threeDaysAfter = addDays(today, 3);
    
    return (
      !isTaskOverdue(task) &&
      (isAfter(dueDate, today) || dueDate.getTime() === today.getTime()) &&
      isBefore(dueDate, threeDaysAfter) &&
      task.status !== "completed"
    );
  } catch {
    return false;
  }
};

/**
 * Get initials from name (for avatar)
 */
export const getInitials = (name: string): string => {
  if (!name) return "";
  return name
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

/**
 * Format task key (Jira style: TASK-XXXXXX)
 */
export const formatTaskKey = (taskId: string): string => {
  if (!taskId) return "TASK-000000";
  const shortId = taskId.slice(-6).toUpperCase();
  return `TASK-${shortId}`;
};

/**
 * Get priority display info (label, icon, color)
 */
export const getPriorityDisplay = (priority: number | undefined) => {
  if (!priority) {
    const option = getPriorityOption(0);
    return { label: option.label, icon: ChevronDown, color: option.color };
  }
  
  // Convert old system (1-5) to new system (0-5)
  const newPriority = convertOldPriorityToNew(priority);
  const option = getPriorityOption(newPriority);
  
  // Icon selection: 0-1 = down, 2-3 = minus, 4-5 = up
  const icon = newPriority <= 1 ? ChevronDown : newPriority <= 3 ? Minus : ChevronUp;
  
  return { label: option.label, icon, color: option.color };
};

/**
 * Get current status index in workflow
 */
export const getCurrentStatusIndex = (
  status: string, 
  approvalStatus?: "pending" | "approved" | "rejected"
): number => {
  const normalized = normalizeStatus(status);
  
  // If task is completed and approved, show "Onaylandı" step
  if (normalized === "completed" && approvalStatus === "approved") {
    return 3; // "Onaylandı" index
  }
  
  // If task is completed but not approved, show "Tamamlandı" step
  if (normalized === "completed") {
    return 2; // "Tamamlandı" index
  }
  
  const index = TASK_STATUS_WORKFLOW.findIndex((statusItem) => statusItem.value === normalized);
  
  // If not found, treat as "pending" (index 0)
  return index === -1 ? 0 : index;
};

/**
 * Get next status in workflow
 */
export const getNextStatus = (
  currentStatus: string, 
  approvalStatus?: "pending" | "approved" | "rejected"
): StatusItem | null => {
  const currentIndex = getCurrentStatusIndex(currentStatus, approvalStatus);
  const normalizedStatus = normalizeStatus(currentStatus);
  
  // If task is "completed", can't directly change to "approved"
  // Only "Onaya Gönder" button should be shown
  if (normalizedStatus === "completed") {
    return null;
  }
  
  if (currentIndex === -1 || currentIndex >= TASK_STATUS_WORKFLOW.length - 1) {
    return null;
  }
  
  const nextStatus = TASK_STATUS_WORKFLOW[currentIndex + 1];
  
  // Can't directly change to "approved" - only through approval process
  if (nextStatus && nextStatus.value === "approved") {
    return null;
  }
  
  return nextStatus;
};

/**
 * Extract error message from unknown error
 */
export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "Bilinmeyen bir hata oluştu";
};

/**
 * Safe JSON parse with fallback
 */
export const safeJsonParse = <T>(json: string, fallback: T): T => {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
};

/**
 * Debounce function for search optimization
 */
export const debounce = <T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };
};

/**
 * Throttle function for scroll optimization
 */
export const throttle = <T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle = false;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
};
