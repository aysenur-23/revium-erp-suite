/**
 * useTaskFilters Hook
 * Centralized task filtering and sorting logic
 * Extracted from Tasks.tsx for better maintainability and performance
 */

import { useMemo, useCallback, useDeferredValue } from "react";
import { Timestamp } from "firebase/firestore";
import {
    normalizeStatus,
    isTaskOverdue,
    isTaskDueSoon,
    TaskLike,
} from "@/utils/taskHelpers";
import { convertOldPriorityToNew } from "@/utils/priority";
import { Task as FirebaseTask, TaskAssignment as FirebaseTaskAssignment } from "@/services/firebase/taskService";

export type FilterType = "all" | "my-tasks" | "general" | "pool" | "archive";
export type FocusFilter = "all" | "due_soon" | "overdue" | "high_priority";
export type SortBy = "created_at" | "priority" | "due_date";
export type SortDirection = "asc" | "desc";

export interface FilterState {
    searchTerm: string;
    statusFilter: string;
    focusFilter: FocusFilter;
    activeFilter: FilterType;
    selectedProject: string;
    assignedUserFilter: string;
    sortBy: SortBy;
    sortColumn: string | null;
    sortDirection: SortDirection;
}

export interface AdvancedSearchFilters {
    title: string;
    description: string;
    status: string;
    priority: string;
    projectId: string;
    assignedTo: string;
    dueDateFrom: string;
    dueDateTo: string;
}

interface UseTaskFiltersOptions {
    allTasks: TaskLike[];
    myTasks: TaskLike[];
    archivedTasks: TaskLike[];
    allFirebaseTasks: FirebaseTask[];
    assignmentsCache: Map<string, FirebaseTaskAssignment[]>;
    filters: FilterState;
}

interface UseTaskFiltersResult {
    filteredTasks: TaskLike[];
    filteredMyTasks: TaskLike[];
    filteredArchivedTasks: TaskLike[];
    tasksForStats: TaskLike[];
    taskStats: TaskStats;
    listData: TaskLike[];
}

export interface TaskStats {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    approved: number;
    overdue: number;
    dueSoon: number;
    highPriority: number;
}

/**
 * Check if task is deleted (not in allFirebaseTasks)
 */
const isTaskDeleted = (taskId: string, firebaseTaskIds: Set<string>): boolean => {
    return !firebaseTaskIds.has(taskId);
};

/**
 * Filter tasks based on filter criteria
 */
interface FilterContext {
    allFirebaseTasks: FirebaseTask[];
    assignmentsCache: Map<string, FirebaseTaskAssignment[]>;
    firebaseTaskIds: Set<string>;
}

/**
 * Filter tasks based on filter criteria
 */
const filterTasks = (
    tasks: TaskLike[],
    filters: FilterState,
    context: FilterContext
): TaskLike[] => {
    if (!Array.isArray(tasks)) return [];

    const { allFirebaseTasks, assignmentsCache, firebaseTaskIds } = context;
    const searchLower = (filters.searchTerm || "").toLocaleLowerCase('tr-TR');

    return tasks.filter(task => {
        if (!task) return false;

        // Filter deleted tasks
        if (firebaseTaskIds.size > 0 && isTaskDeleted(task.id, firebaseTaskIds)) {
            return false;
        }

        // Search filter
        const taskTitle = (task.title || "").toLocaleLowerCase('tr-TR');
        const taskDesc = (task.description || "").toLocaleLowerCase('tr-TR');
        const matchesSearch = !filters.searchTerm || filters.searchTerm.trim() === "" ||
            taskTitle.includes(searchLower) || taskDesc.includes(searchLower);

        // Status filter - cancelled tasks shown in "approved" column
        let matchesStatus = filters.statusFilter === "all" || task.status === filters.statusFilter;
        if (filters.statusFilter === "approved") {
            matchesStatus = task.status === "approved" || task.status === "cancelled" ||
                (task.status === "completed" && task.approvalStatus === "approved");
        } else if (filters.statusFilter !== "all") {
            matchesStatus = task.status === filters.statusFilter;
        }

        // Focus filter
        const matchesFocus =
            filters.focusFilter === "all" ||
            (filters.focusFilter === "due_soon" && isTaskDueSoon(task)) ||
            (filters.focusFilter === "overdue" && isTaskOverdue(task)) ||
            (filters.focusFilter === "high_priority" && (() => {
                const taskPriority = task.priority || 0;
                const newPriority = convertOldPriorityToNew(taskPriority);
                return newPriority >= 3;
            })());

        // Project filter
        let matchesProject = true;
        if (filters.selectedProject === "all") {
            matchesProject = true;
        } else if (filters.selectedProject === "general") {
            matchesProject = task.projectId === "general" || !task.projectId;
        } else {
            matchesProject = task.projectId === filters.selectedProject;
        }

        // Assigned user filter
        let matchesAssignedUser = true;
        if (filters.assignedUserFilter !== "all") {
            const taskAssignments = assignmentsCache.get(task.id) || [];
            const assignedUserIds = taskAssignments.map(a => a.assignedTo);
            matchesAssignedUser = assignedUserIds.includes(filters.assignedUserFilter);
        }

        return matchesSearch && matchesStatus && matchesFocus && matchesProject && matchesAssignedUser;
    });
};

/**
 * Sort tasks based on sort criteria
 */
const sortTasks = (
    tasks: TaskLike[],
    sortBy: SortBy,
    sortColumn: string | null,
    sortDirection: SortDirection
): TaskLike[] => {
    if (!Array.isArray(tasks)) return [];

    const sorted = [...tasks];

    // If sortColumn is set, use column-based sorting
    if (sortColumn) {
        return sorted.sort((a, b) => {
            let aValue: unknown;
            let bValue: unknown;

            switch (sortColumn) {
                case "key":
                    aValue = a.id;
                    bValue = b.id;
                    break;
                case "title":
                    aValue = (a.title || "").toLowerCase();
                    bValue = (b.title || "").toLowerCase();
                    break;
                case "status":
                    aValue = normalizeStatus(a.status || "pending");
                    bValue = normalizeStatus(b.status || "pending");
                    break;
                case "priority":
                    aValue = a.priority || 0;
                    bValue = b.priority || 0;
                    break;
                case "dueDate":
                    aValue = getDueDateValue(a);
                    bValue = getDueDateValue(b);
                    break;
                case "createdAt":
                    aValue = getCreatedAtValue(a);
                    bValue = getCreatedAtValue(b);
                    break;
                default:
                    return 0;
            }

            if (aValue === null || aValue === undefined) return 1;
            if (bValue === null || bValue === undefined) return -1;
            if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
            if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
            return 0;
        });
    }

    // Default sorting by sortBy
    return sorted.sort((a, b) => {
        if (!a || !b) return 0;

        if (sortBy === "priority") {
            return (b.priority || 0) - (a.priority || 0);
        }

        if (sortBy === "due_date") {
            const aDate = getDueDateValue(a);
            const bDate = getDueDateValue(b);
            if (!aDate) return 1;
            if (!bDate) return -1;
            return aDate - bDate;
        }

        // created_at (default)
        const aCreated = getCreatedAtValue(a);
        const bCreated = getCreatedAtValue(b);
        if (!aCreated) return 1;
        if (!bCreated) return -1;
        return bCreated - aCreated;
    });
};

/**
 * Get due date as timestamp value
 */
const getDueDateValue = (task: TaskLike): number | null => {
    const dueDate = task.due_date || task.dueDate;
    if (!dueDate) return null;

    if (dueDate instanceof Timestamp) {
        return dueDate.toDate().getTime();
    }
    if (dueDate instanceof Date) {
        return dueDate.getTime();
    }
    if (typeof dueDate === 'string') {
        const time = new Date(dueDate).getTime();
        return isNaN(time) ? null : time;
    }
    return null;
};

/**
 * Get created at as timestamp value
 */
const getCreatedAtValue = (task: TaskLike): number | null => {
    const createdAt = task.created_at || task.createdAt;
    if (!createdAt) return null;

    if (createdAt instanceof Timestamp) {
        return createdAt.toDate().getTime();
    }
    if (createdAt instanceof Date) {
        return createdAt.getTime();
    }
    if (typeof createdAt === 'string') {
        const time = new Date(createdAt).getTime();
        return isNaN(time) ? null : time;
    }
    return null;
};

/**
 * Calculate task statistics
 */
const calculateStats = (tasks: TaskLike[]): TaskStats => {
    const stats: TaskStats = {
        total: 0,
        pending: 0,
        inProgress: 0,
        completed: 0,
        approved: 0,
        overdue: 0,
        dueSoon: 0,
        highPriority: 0,
    };

    if (!Array.isArray(tasks)) return stats;

    for (const task of tasks) {
        if (!task) continue;

        stats.total++;

        const status = normalizeStatus(task.status);
        switch (status) {
            case "pending":
                stats.pending++;
                break;
            case "in_progress":
                stats.inProgress++;
                break;
            case "completed":
                stats.completed++;
                break;
            case "approved":
                stats.approved++;
                break;
        }

        if (isTaskOverdue(task)) stats.overdue++;
        if (isTaskDueSoon(task)) stats.dueSoon++;

        const priority = convertOldPriorityToNew(task.priority || 0);
        if (priority >= 3) stats.highPriority++;
    }

    return stats;
};

/**
 * Main hook for task filtering
 */
export function useTaskFilters({
    allTasks,
    myTasks,
    archivedTasks,
    allFirebaseTasks,
    assignmentsCache,
    filters,
}: UseTaskFiltersOptions): UseTaskFiltersResult {
    // Memoize Firebase task lookups to improve performance (O(N) instead of O(N*M))
    const firebaseTaskMap = useMemo(() => {
        const map = new Map<string, FirebaseTask>();
        allFirebaseTasks.forEach(task => {
            if (task?.id) map.set(task.id, task);
        });
        return map;
    }, [allFirebaseTasks]);

    const firebaseTaskIds = useMemo(() => {
        return new Set(allFirebaseTasks.map(t => t?.id).filter((id): id is string => !!id));
    }, [allFirebaseTasks]);

    // Use deferred value for search to improve responsiveness
    const deferredSearchTerm = useDeferredValue(filters.searchTerm);
    const filtersWithDeferredSearch = useMemo(() => ({
        ...filters,
        searchTerm: deferredSearchTerm,
    }), [filters, deferredSearchTerm]);

    // Calculate tasks for statistics (base set before filtering)
    const tasksForStats = useMemo(() => {
        let tasks: TaskLike[] = [];

        switch (filters.activeFilter) {
            case "archive":
                tasks = Array.isArray(archivedTasks) ? archivedTasks.filter(t => t) : [];
                break;
            case "my-tasks":
                tasks = Array.isArray(myTasks) ? myTasks.filter(t => t) : [];
                break;
            case "pool":
                tasks = (Array.isArray(allTasks) ? allTasks : []).filter(task => {
                    if (!task?.id) return false;
                    const firebaseTask = firebaseTaskMap.get(task.id);
                    return firebaseTask?.isInPool === true && !firebaseTask?.onlyInMyTasks;
                });
                break;
            default:
                tasks = Array.isArray(allTasks) ? allTasks.filter(t => t) : [];
        }

        // Filter deleted tasks
        if (firebaseTaskIds.size > 0) {
            tasks = tasks.filter(task => task?.id && firebaseTaskIds.has(task.id));
        }

        // Filter archived tasks (unless viewing archive)
        if (filters.activeFilter !== "archive") {
            tasks = tasks.filter(task => task && !task.isArchived && !task.is_archived);
        }

        // Apply project filter
        if (filters.selectedProject && filters.selectedProject !== "all") {
            if (filters.selectedProject === "general") {
                tasks = tasks.filter(task => task && (task.projectId === "general" || !task.projectId));
            } else {
                tasks = tasks.filter(task => task && task.projectId === filters.selectedProject);
            }
        }

        return tasks;
    }, [allTasks, myTasks, archivedTasks, filters.activeFilter, filters.selectedProject, firebaseTaskMap, firebaseTaskIds]);

    // Calculate statistics
    const taskStats = useMemo(() => calculateStats(tasksForStats), [tasksForStats]);

    // Helper to pass cached IDs to filterTasks
    const filterContext = useMemo(() => ({
        allFirebaseTasks,
        assignmentsCache,
        firebaseTaskIds // Pass the pre-calculated Set
    }), [allFirebaseTasks, assignmentsCache, firebaseTaskIds]);

    // Filter and sort "my tasks"
    const filteredMyTasks = useMemo(() => {
        if (filters.activeFilter !== "my-tasks") return [];
        const filtered = filterTasks(tasksForStats, filtersWithDeferredSearch, filterContext);
        return sortTasks(filtered, filters.sortBy, filters.sortColumn, filters.sortDirection);
    }, [tasksForStats, filtersWithDeferredSearch, filterContext, filters.sortBy, filters.sortColumn, filters.sortDirection, filters.activeFilter]);

    // Filter and sort "all tasks"
    const filteredTasks = useMemo(() => {
        if (filters.activeFilter === "my-tasks" || filters.activeFilter === "archive") return [];
        const filtered = filterTasks(tasksForStats, filtersWithDeferredSearch, filterContext);
        return sortTasks(filtered, filters.sortBy, filters.sortColumn, filters.sortDirection);
    }, [tasksForStats, filtersWithDeferredSearch, filterContext, filters.sortBy, filters.sortColumn, filters.sortDirection, filters.activeFilter]);

    // Filter and sort "archived tasks"
    const filteredArchivedTasks = useMemo(() => {
        if (filters.activeFilter !== "archive") return [];
        const filtered = filterTasks(tasksForStats, filtersWithDeferredSearch, filterContext);
        return sortTasks(filtered, filters.sortBy, filters.sortColumn, filters.sortDirection);
    }, [tasksForStats, filtersWithDeferredSearch, filterContext, filters.sortBy, filters.sortColumn, filters.sortDirection, filters.activeFilter]);

    // Determine list data based on active filter
    const listData = useMemo(() => {
        let data: TaskLike[] = [];

        switch (filters.activeFilter) {
            case "my-tasks":
                data = filteredMyTasks;
                break;
            case "archive":
                data = filteredArchivedTasks;
                break;
            default:
                data = filteredTasks;
        }

        // Final check: filter deleted tasks (using cached Set)
        if (firebaseTaskIds.size > 0) {
            data = data.filter(task => task?.id && firebaseTaskIds.has(task.id));
        }

        return data;
    }, [filters.activeFilter, filteredMyTasks, filteredTasks, filteredArchivedTasks, firebaseTaskIds]);

    return {
        filteredTasks,
        filteredMyTasks,
        filteredArchivedTasks,
        tasksForStats,
        taskStats,
        listData,
    };
}

/**
 * Default filter state
 */
export const DEFAULT_FILTER_STATE: FilterState = {
    searchTerm: "",
    statusFilter: "all",
    focusFilter: "all",
    activeFilter: "all",
    selectedProject: "all",
    assignedUserFilter: "all",
    sortBy: "created_at",
    sortColumn: null,
    sortDirection: "desc",
};

/**
 * Default advanced search filters
 */
export const DEFAULT_ADVANCED_FILTERS: AdvancedSearchFilters = {
    title: "",
    description: "",
    status: "all",
    priority: "all",
    projectId: "all",
    assignedTo: "all",
    dueDateFrom: "",
    dueDateTo: "",
};
