/**
 * TaskListItem Component
 * Single task row in the list view
 * Extracted from Tasks.tsx for better maintainability
 * 
 * Optimized with React.memo to prevent unnecessary re-renders
 */

import React, { memo, useCallback, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
    MoreVertical,
    Edit,
    Archive,
    Trash2,
    Lock,
    MessageSquare,
    CheckCircle2,
    Clock,
    CircleDot,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Timestamp } from "firebase/firestore";
import {
    normalizeStatus,
    getStatusLabel,
    formatDueDate,
    isTaskOverdue,
    isTaskDueSoon,
    getInitials,
    getPriorityDisplay,
    TASK_STATUS_WORKFLOW,
    TaskLike,
} from "@/utils/taskHelpers";

export interface Profile {
    id: string;
    full_name?: string;
    fullName?: string;
    displayName?: string;
    email?: string;
}

export interface TaskListItemData extends TaskLike {
    assignedUsers?: Profile[];
    isPrivate?: boolean;
    isInPool?: boolean;
}

interface TaskListItemProps {
    task: TaskListItemData;
    isSelected: boolean;
    isDeleting: boolean;
    isFocused: boolean;
    isOptimistic: boolean;
    commentCount: number;
    canEdit: boolean;
    canDelete: boolean;
    canChangeStatus: boolean;
    projectName?: string;
    onTaskClick: (taskId: string, status: string) => void;
    onStatusChange: (taskId: string, status: string) => void;
    onEdit: (taskId: string) => void;
    onArchive: (taskId: string) => void;
    onDelete: (taskId: string) => void;
    onSelect?: (taskId: string) => void;
    isMultiSelectMode?: boolean;
    columnWidths: {
        title: number;
        project: number;
        status: number;
        assignee: number;
        priority: number;
        dueDate: number;
    };
}

const TaskListItem = memo(({
    task,
    isSelected,
    isDeleting,
    isFocused,
    isOptimistic,
    commentCount,
    canEdit,
    canDelete,
    canChangeStatus,
    projectName,
    onTaskClick,
    onStatusChange,
    onEdit,
    onArchive,
    onDelete,
    onSelect,
    isMultiSelectMode = false,
    columnWidths,
}: TaskListItemProps) => {
    // Memoized calculations
    const overdue = useMemo(() => isTaskOverdue(task), [task]);
    const dueSoon = useMemo(() => isTaskDueSoon(task), [task]);

    const displayStatus = useMemo(() => {
        const normalized = normalizeStatus(task.status);
        // If task is completed and approved, show as "approved"
        if (normalized === "completed" && task.approvalStatus === "approved") {
            return "approved";
        }
        return normalized;
    }, [task.status, task.approvalStatus]);

    const priorityDisplay = useMemo(() => getPriorityDisplay(task.priority), [task.priority]);

    const dueDate = useMemo(() => {
        if (task.due_date) return task.due_date;
        if (task.dueDate) {
            if (task.dueDate instanceof Timestamp) {
                return task.dueDate.toDate().toISOString();
            }
            if (task.dueDate instanceof Date) {
                return task.dueDate.toISOString();
            }
            return task.dueDate as string;
        }
        return null;
    }, [task.due_date, task.dueDate]);

    const assignedUsers = useMemo(() => task.assignedUsers || [], [task.assignedUsers]);

    // Handlers
    const handleTaskClick = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        if (!isMultiSelectMode) {
            onTaskClick(task.id, task.status);
        } else if (onSelect) {
            onSelect(task.id);
        }
    }, [task.id, task.status, isMultiSelectMode, onTaskClick, onSelect]);

    const handleStatusChange = useCallback((newStatus: string) => {
        onStatusChange(task.id, newStatus);
    }, [task.id, onStatusChange]);

    const handleEdit = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        onEdit(task.id);
    }, [task.id, onEdit]);

    const handleArchive = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        onArchive(task.id);
    }, [task.id, onArchive]);

    const handleDelete = useCallback(() => {
        onDelete(task.id);
    }, [task.id, onDelete]);

    // Status icon selector
    const getStatusIcon = (status: string) => {
        switch (status) {
            case "completed":
            case "approved":
                return CheckCircle2;
            case "in_progress":
                return Clock;
            default:
                return CircleDot;
        }
    };

    return (
        <article
            className={cn(
                "table-row group",
                "border-b border-[#DFE1E6] dark:border-[#38414A] hover:bg-[#F4F5F7] dark:hover:bg-[#22272B] transition-all duration-200 cursor-pointer",
                "bg-white dark:bg-[#1D2125]",
                isSelected && "bg-[#E3FCEF] dark:bg-[#1C3329] border-l-4 border-l-[#006644] dark:border-l-[#4BCE97]",
                overdue && "bg-[#FFEBE6] dark:bg-[#3D2115] border-l-4 border-l-[#DE350B] dark:border-l-[#FF5630]",
                dueSoon && !overdue && "bg-[#FFF7E6] dark:bg-[#3D2E1A] border-l-4 border-l-[#FF8B00] dark:border-l-[#F5CD47]",
                isOptimistic && "opacity-60",
                isFocused && "ring-2 ring-[#0052CC] dark:ring-[#4C9AFF] ring-offset-2 shadow-md"
            )}
            role="article"
            aria-labelledby={`task-title-${task.id}`}
            tabIndex={isFocused ? 0 : -1}
            onClick={handleTaskClick}
        >
            {/* Title */}
            <div
                className="table-cell px-2 py-1 align-middle border-r border-[#DFE1E6] dark:border-[#38414A] cursor-pointer"
                style={{ width: columnWidths.title }}
            >
                <div className="flex items-center gap-2">
                    {task.isPrivate && (
                        <Lock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    )}
                    <h3
                        id={`task-title-${task.id}`}
                        className="font-semibold text-[11px] sm:text-xs text-[#172B4D] dark:text-[#B6C2CF] line-clamp-1 hover:text-[#0052CC] dark:hover:text-[#4C9AFF] transition-colors leading-tight flex-1"
                    >
                        {task.title}
                    </h3>
                    {commentCount > 0 && (
                        <div className="flex items-center gap-0.5 text-[#6B778C] dark:text-[#8C9CB8]">
                            <MessageSquare className="h-3 w-3" />
                            <span className="text-[9px]">{commentCount}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Project */}
            <div
                className="table-cell px-2 py-1 align-middle border-r border-[#DFE1E6] dark:border-[#38414A]"
                style={{ width: columnWidths.project }}
            >
                {projectName ? (
                    <Badge
                        variant="outline"
                        className="h-3.5 px-1.5 text-[9px] font-medium border-[#DFE1E6] dark:border-[#38414A] text-[#42526E] dark:text-[#B6C2CF] bg-[#F4F5F7] dark:bg-[#22272B] leading-tight inline-flex"
                    >
                        {projectName}
                    </Badge>
                ) : (
                    <span className="text-[10px] sm:text-[11px] text-[#6B778C] dark:text-[#8C9CB8]">-</span>
                )}
            </div>

            {/* Status - Inline Editable */}
            <div
                onClick={(e) => e.stopPropagation()}
                className="table-cell px-2 py-1 align-middle border-r border-[#DFE1E6] dark:border-[#38414A]"
                style={{ width: columnWidths.status }}
            >
                <Select
                    value={displayStatus}
                    onValueChange={handleStatusChange}
                    disabled={!canChangeStatus}
                >
                    <SelectTrigger
                        className={cn(
                            "h-auto min-h-[24px] px-1.5 py-0.5 text-[10px] sm:text-xs border-0 bg-transparent rounded-full w-full transition-all duration-200 flex items-center justify-center group",
                            canChangeStatus
                                ? "hover:bg-[#EBECF0] dark:hover:bg-[#2C333A] cursor-pointer hover:shadow-md focus:ring-2 focus:ring-[#0052CC]/50 focus:ring-offset-2 active:scale-[0.97] focus-visible:outline-none"
                                : "cursor-not-allowed opacity-60"
                        )}
                    >
                        <SelectValue>
                            <Badge
                                variant="secondary"
                                className={cn(
                                    "h-3.5 px-1.5 text-[9px] sm:text-[10px] font-semibold border-0 leading-tight rounded-full inline-flex items-center justify-center gap-0.5 transition-all duration-200 shadow-sm whitespace-nowrap",
                                    displayStatus === "approved" && "bg-[#E3FCEF] text-[#006644] dark:bg-[#1C3329] dark:text-[#4BCE97]",
                                    displayStatus === "completed" && "bg-[#E3FCEF] text-[#006644] dark:bg-[#1C3329] dark:text-[#4BCE97]",
                                    displayStatus === "in_progress" && "bg-[#DEEBFF] text-[#0052CC] dark:bg-[#1C2B41] dark:text-[#4C9AFF]",
                                    displayStatus === "pending" && "bg-[#DEEBFF] text-[#0052CC] dark:bg-[#1C2B41] dark:text-[#4C9AFF]",
                                    isOptimistic && "opacity-50"
                                )}
                            >
                                {(() => {
                                    const Icon = getStatusIcon(displayStatus);
                                    return (
                                        <>
                                            <Icon className="h-3 w-3 flex-shrink-0" />
                                            <span className="whitespace-nowrap text-[9px] sm:text-[10px]">
                                                {getStatusLabel(displayStatus)}
                                            </span>
                                        </>
                                    );
                                })()}
                            </Badge>
                        </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="min-w-[180px] p-1.5 shadow-lg border border-[#DFE1E6] dark:border-[#38414A] rounded-lg">
                        {TASK_STATUS_WORKFLOW.map((statusItem) => {
                            const Icon = statusItem.icon;
                            const isCurrentStatus = statusItem.value === displayStatus;
                            return (
                                <SelectItem
                                    key={statusItem.value}
                                    value={statusItem.value}
                                    className={cn(
                                        "cursor-pointer rounded-md px-3 py-2.5 transition-all duration-150",
                                        "hover:bg-[#EBECF0] dark:hover:bg-[#2C333A]",
                                        isCurrentStatus && "bg-[#EBECF0] dark:bg-[#2C333A] font-semibold"
                                    )}
                                >
                                    <div className="flex items-center gap-2.5">
                                        <Icon className={cn("h-3 w-3 flex-shrink-0", statusItem.color)} />
                                        <span className="text-[10px] sm:text-[11px] font-medium">{statusItem.label}</span>
                                    </div>
                                </SelectItem>
                            );
                        })}
                    </SelectContent>
                </Select>
            </div>

            {/* Assignee */}
            <div
                className="table-cell px-2 py-1 align-middle border-r border-[#DFE1E6] dark:border-[#38414A]"
                style={{ width: columnWidths.assignee }}
            >
                {assignedUsers.length > 0 ? (
                    <div className="flex -space-x-1.5">
                        {assignedUsers.slice(0, 3).map((assignee) => {
                            const name = assignee.full_name || assignee.fullName || assignee.displayName || assignee.email || "";
                            return (
                                <Avatar
                                    key={assignee.id}
                                    className="h-5 w-5 border border-white dark:border-[#1D2125] ring-1 ring-[#DFE1E6] dark:ring-[#38414A]"
                                    title={name}
                                >
                                    <AvatarFallback className="text-[8px] bg-[#DFE1E6] dark:bg-[#38414A] text-[#42526E] dark:text-[#B6C2CF]">
                                        {getInitials(name)}
                                    </AvatarFallback>
                                </Avatar>
                            );
                        })}
                        {assignedUsers.length > 3 && (
                            <div className="h-5 w-5 rounded-full bg-[#DFE1E6] dark:bg-[#38414A] flex items-center justify-center text-[8px] font-medium text-[#42526E] dark:text-[#B6C2CF] border border-white dark:border-[#1D2125]">
                                +{assignedUsers.length - 3}
                            </div>
                        )}
                    </div>
                ) : (
                    <span className="text-[10px] sm:text-[11px] text-[#6B778C] dark:text-[#8C9CB8]">-</span>
                )}
            </div>

            {/* Priority */}
            <div
                className="table-cell px-2 py-1 align-middle border-r border-[#DFE1E6] dark:border-[#38414A]"
                style={{ width: columnWidths.priority }}
            >
                <Badge
                    variant="outline"
                    className={cn(
                        "h-3.5 px-1.5 text-[9px] font-medium border-0 leading-tight inline-flex items-center gap-0.5",
                        priorityDisplay.color
                    )}
                >
                    {(() => {
                        const PriorityIcon = priorityDisplay.icon;
                        return <PriorityIcon className="h-3 w-3" />;
                    })()}
                    <span>{priorityDisplay.label}</span>
                </Badge>
            </div>

            {/* Due Date */}
            <div
                className="table-cell px-2 py-1 align-middle"
                style={{ width: columnWidths.dueDate }}
            >
                <span className={cn(
                    "text-[10px] sm:text-[11px] whitespace-nowrap",
                    overdue ? "text-[#DE350B] dark:text-[#FF5630] font-semibold" :
                        dueSoon ? "text-[#FF8B00] dark:text-[#F5CD47] font-medium" :
                            "text-[#6B778C] dark:text-[#8C9CB8]"
                )}>
                    {dueDate ? formatDueDate(dueDate) : "-"}
                </span>
            </div>

            {/* Actions - Show on hover */}
            <div
                className="table-cell px-1 py-1 align-middle opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
            >
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                        >
                            <MoreVertical className="h-3.5 w-3.5" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                        {canEdit && (
                            <DropdownMenuItem onClick={handleEdit}>
                                <Edit className="h-3.5 w-3.5 mr-2" />
                                <span className="text-xs">Düzenle</span>
                            </DropdownMenuItem>
                        )}
                        {canEdit && (
                            <DropdownMenuItem onClick={handleArchive}>
                                <Archive className="h-3.5 w-3.5 mr-2" />
                                <span className="text-xs">Arşivle</span>
                            </DropdownMenuItem>
                        )}
                        {canDelete && (
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <DropdownMenuItem
                                        className="text-destructive focus:text-destructive"
                                        onSelect={(e) => e.preventDefault()}
                                    >
                                        <Trash2 className="h-3.5 w-3.5 mr-2" />
                                        <span className="text-xs">Sil</span>
                                    </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Görevi Sil</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            "{task.title}" görevini silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>İptal</AlertDialogCancel>
                                        <AlertDialogAction
                                            onClick={handleDelete}
                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                            disabled={isDeleting}
                                        >
                                            {isDeleting ? "Siliniyor..." : "Sil"}
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </article>
    );
}, (prevProps, nextProps) => {
    // Custom comparison for React.memo
    // Only re-render if these critical props change
    return (
        prevProps.task.id === nextProps.task.id &&
        prevProps.task.title === nextProps.task.title &&
        prevProps.task.status === nextProps.task.status &&
        prevProps.task.priority === nextProps.task.priority &&
        prevProps.task.approvalStatus === nextProps.task.approvalStatus &&
        prevProps.isSelected === nextProps.isSelected &&
        prevProps.isDeleting === nextProps.isDeleting &&
        prevProps.isFocused === nextProps.isFocused &&
        prevProps.isOptimistic === nextProps.isOptimistic &&
        prevProps.commentCount === nextProps.commentCount &&
        prevProps.canEdit === nextProps.canEdit &&
        prevProps.canDelete === nextProps.canDelete &&
        prevProps.canChangeStatus === nextProps.canChangeStatus &&
        prevProps.projectName === nextProps.projectName
    );
});

TaskListItem.displayName = "TaskListItem";

export { TaskListItem };
export default TaskListItem;
