/**
 * Tasks Components - Barrel Export
 * Centralized exports for all task-related components
 */

// Main Components
export { TaskBoard } from "./TaskBoard";
export { TaskInlineForm } from "./TaskInlineForm";
export { TaskPool } from "./TaskPool";
export { CreateTaskDialog } from "./CreateTaskDialog";

// New Modular Components
export { TaskStats } from "./TaskStats";
export type { TaskStatsData } from "./TaskStats";

export { TaskListItem } from "./TaskListItem";
export type { TaskListItemData, Profile } from "./TaskListItem";

export { TaskListHeader } from "./TaskListHeader";
export type { Project } from "./TaskListHeader";

// Shared Components
export { UserMultiSelect } from "./UserMultiSelect";
