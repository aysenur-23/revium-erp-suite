/**
 * TaskStats Component
 * Mini dashboard for task statistics
 * Extracted from Tasks.tsx for better maintainability
 */

import React, { memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    CheckCircle2,
    Clock,
    AlertCircle,
    CircleDot,
    Flame,
    CalendarDays,
    ChevronUp,
    ChevronDown,
    BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export interface TaskStatsData {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    approved: number;
    overdue: number;
    dueSoon: number;
    highPriority: number;
}

interface TaskStatsProps {
    stats: TaskStatsData;
    isExpanded: boolean;
    onToggleExpanded: () => void;
    onFilterChange?: (filter: string) => void;
    currentFilter?: string;
    className?: string;
}

interface StatCardProps {
    label: string;
    value: number;
    icon: React.ElementType;
    color: string;
    bgColor: string;
    onClick?: () => void;
    isActive?: boolean;
    percentage?: number;
}

const StatCard = memo(({
    label,
    value,
    icon: Icon,
    color,
    bgColor,
    onClick,
    isActive,
    percentage,
}: StatCardProps) => (
    <button
        type="button"
        onClick={onClick}
        className={cn(
            "flex items-center gap-3 p-3 rounded-lg border transition-all duration-200",
            "hover:shadow-sm hover:border-primary/20",
            isActive && "ring-2 ring-primary ring-offset-1",
            bgColor
        )}
        disabled={!onClick}
    >
        <div className={cn("p-2 rounded-full", color.replace("text-", "bg-").replace("500", "100").replace("600", "100"))}>
            <Icon className={cn("h-4 w-4", color)} />
        </div>
        <div className="flex flex-col items-start">
            <span className="text-2xl font-bold">{value}</span>
            <span className="text-xs text-muted-foreground">{label}</span>
            {percentage !== undefined && (
                <span className="text-xs text-muted-foreground">
                    {percentage.toFixed(0)}%
                </span>
            )}
        </div>
    </button>
));

StatCard.displayName = "StatCard";

interface QuickFilterProps {
    label: string;
    value: number;
    icon: React.ElementType;
    color: string;
    filterKey: string;
    onClick: (key: string) => void;
    isActive: boolean;
}

const QuickFilter = memo(({
    label,
    value,
    icon: Icon,
    color,
    filterKey,
    onClick,
    isActive
}: QuickFilterProps) => (
    <button
        type="button"
        onClick={() => onClick(filterKey)}
        className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg border transition-all",
            "hover:bg-accent hover:border-primary/20",
            isActive && "bg-primary/10 border-primary"
        )}
    >
        <Icon className={cn("h-4 w-4", color)} />
        <span className="text-sm font-medium">{label}</span>
        <Badge variant="secondary" className="ml-auto">
            {value}
        </Badge>
    </button>
));

QuickFilter.displayName = "QuickFilter";

export const TaskStats = memo(({
    stats,
    isExpanded,
    onToggleExpanded,
    onFilterChange,
    currentFilter = "all",
    className,
}: TaskStatsProps) => {
    const handleFilterClick = (filter: string) => {
        if (onFilterChange) {
            onFilterChange(currentFilter === filter ? "all" : filter);
        }
    };

    // Calculate percentages
    const getPercentage = (value: number) => {
        if (stats.total === 0) return 0;
        return (value / stats.total) * 100;
    };

    return (
        <Collapsible open={isExpanded} onOpenChange={onToggleExpanded}>
            <div className={cn("mb-4", className)}>
                {/* Header with toggle */}
                <CollapsibleTrigger asChild>
                    <button
                        type="button"
                        className="flex items-center gap-2 mb-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors w-full"
                    >
                        <BarChart3 className="h-4 w-4" />
                        <span>İstatistikler</span>
                        <Badge variant="outline" className="ml-2">
                            {stats.total} görev
                        </Badge>
                        {isExpanded ? (
                            <ChevronUp className="h-4 w-4 ml-auto" />
                        ) : (
                            <ChevronDown className="h-4 w-4 ml-auto" />
                        )}
                    </button>
                </CollapsibleTrigger>

                <CollapsibleContent>
                    {/* Main Stats Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                        <StatCard
                            label="Yapılacak"
                            value={stats.pending}
                            icon={CircleDot}
                            color="text-amber-500"
                            bgColor="bg-amber-50/50 border-amber-200/50"
                            percentage={getPercentage(stats.pending)}
                            onClick={() => handleFilterClick("pending")}
                            isActive={currentFilter === "pending"}
                        />
                        <StatCard
                            label="Devam Ediyor"
                            value={stats.inProgress}
                            icon={Clock}
                            color="text-blue-500"
                            bgColor="bg-blue-50/50 border-blue-200/50"
                            percentage={getPercentage(stats.inProgress)}
                            onClick={() => handleFilterClick("in_progress")}
                            isActive={currentFilter === "in_progress"}
                        />
                        <StatCard
                            label="Tamamlandı"
                            value={stats.completed}
                            icon={CheckCircle2}
                            color="text-emerald-600"
                            bgColor="bg-emerald-50/50 border-emerald-200/50"
                            percentage={getPercentage(stats.completed)}
                            onClick={() => handleFilterClick("completed")}
                            isActive={currentFilter === "completed"}
                        />
                        <StatCard
                            label="Onaylandı"
                            value={stats.approved}
                            icon={CheckCircle2}
                            color="text-green-600"
                            bgColor="bg-green-50/50 border-green-200/50"
                            percentage={getPercentage(stats.approved)}
                            onClick={() => handleFilterClick("approved")}
                            isActive={currentFilter === "approved"}
                        />
                    </div>

                    {/* Quick Filters */}
                    <div className="flex flex-wrap gap-2">
                        <QuickFilter
                            label="Gecikmiş"
                            value={stats.overdue}
                            icon={AlertCircle}
                            color="text-destructive"
                            filterKey="overdue"
                            onClick={handleFilterClick}
                            isActive={currentFilter === "overdue"}
                        />
                        <QuickFilter
                            label="Yaklaşan"
                            value={stats.dueSoon}
                            icon={CalendarDays}
                            color="text-orange-500"
                            filterKey="due_soon"
                            onClick={handleFilterClick}
                            isActive={currentFilter === "due_soon"}
                        />
                        <QuickFilter
                            label="Yüksek Öncelik"
                            value={stats.highPriority}
                            icon={Flame}
                            color="text-red-500"
                            filterKey="high_priority"
                            onClick={handleFilterClick}
                            isActive={currentFilter === "high_priority"}
                        />
                    </div>

                    {/* Progress Bar */}
                    {stats.total > 0 && (
                        <div className="mt-4">
                            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                                <span>İlerleme</span>
                                <span>
                                    {((stats.completed + stats.approved) / stats.total * 100).toFixed(0)}% tamamlandı
                                </span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden flex">
                                <div
                                    className="h-full bg-emerald-500 transition-all duration-500"
                                    style={{ width: `${getPercentage(stats.completed)}%` }}
                                />
                                <div
                                    className="h-full bg-green-600 transition-all duration-500"
                                    style={{ width: `${getPercentage(stats.approved)}%` }}
                                />
                                <div
                                    className="h-full bg-blue-500 transition-all duration-500"
                                    style={{ width: `${getPercentage(stats.inProgress)}%` }}
                                />
                            </div>
                        </div>
                    )}
                </CollapsibleContent>

                {/* Collapsed Summary */}
                {!isExpanded && (
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                            <CircleDot className="h-3 w-3 text-amber-500" />
                            {stats.pending}
                        </span>
                        <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-blue-500" />
                            {stats.inProgress}
                        </span>
                        <span className="flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                            {stats.completed + stats.approved}
                        </span>
                        {stats.overdue > 0 && (
                            <span className="flex items-center gap-1 text-destructive">
                                <AlertCircle className="h-3 w-3" />
                                {stats.overdue} gecikmiş
                            </span>
                        )}
                    </div>
                )}
            </div>
        </Collapsible>
    );
});

TaskStats.displayName = "TaskStats";

export default TaskStats;
