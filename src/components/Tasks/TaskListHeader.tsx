/**
 * TaskListHeader Component
 * Header with filters, search, and view controls
 * Extracted from Tasks.tsx for better maintainability
 */

import React, { memo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SearchInput } from "@/components/ui/search-input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Plus,
    List,
    LayoutGrid,
    Folder,
    Lock,
    Check,
    ChevronDown,
    X,
    CheckSquare,
    Filter,
    RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { FilterType, FocusFilter } from "@/hooks/useTaskFilters";

export interface Project {
    id: string;
    name: string;
    isPrivate?: boolean;
}

interface TaskListHeaderProps {
    // View controls
    viewMode: "list" | "board";
    onViewModeChange: (mode: "list" | "board") => void;

    // Filter controls
    activeFilter: FilterType;
    onActiveFilterChange: (filter: FilterType) => void;

    // Project filter
    selectedProject: string;
    onProjectChange: (projectId: string) => void;
    projects: Project[];
    lastUsedProjectId?: string;

    // Search
    searchTerm: string;
    onSearchChange: (term: string) => void;

    // Status filter
    statusFilter: string;
    onStatusFilterChange: (status: string) => void;

    // Focus filter
    focusFilter: FocusFilter;
    onFocusFilterChange: (filter: FocusFilter) => void;

    // Assigned user filter
    assignedUserFilter: string;
    onAssignedUserFilterChange: (userId: string) => void;
    users: Array<{ id: string; fullName?: string; displayName?: string; email?: string }>;

    // Sort controls
    sortBy: string;
    onSortByChange: (sortBy: string) => void;

    // Actions
    canCreate: boolean;
    onCreateTask: () => void;
    canCreateProject: boolean;
    onCreateProject: () => void;
    onRefresh?: () => void;

    // Multi-select
    isMultiSelectMode: boolean;
    onMultiSelectModeChange: (enabled: boolean) => void;
    selectedCount: number;

    // Loading state
    loading?: boolean;

    className?: string;
}

const TaskListHeader = memo(({
    viewMode,
    onViewModeChange,
    activeFilter,
    onActiveFilterChange,
    selectedProject,
    onProjectChange,
    projects,
    lastUsedProjectId,
    searchTerm,
    onSearchChange,
    statusFilter,
    onStatusFilterChange,
    focusFilter,
    onFocusFilterChange,
    assignedUserFilter,
    onAssignedUserFilterChange,
    users,
    sortBy,
    onSortByChange,
    canCreate,
    onCreateTask,
    canCreateProject,
    onCreateProject,
    onRefresh,
    isMultiSelectMode,
    onMultiSelectModeChange,
    selectedCount,
    loading = false,
    className,
}: TaskListHeaderProps) => {
    const [projectDropdownOpen, setProjectDropdownOpen] = React.useState(false);
    const [projectSearchQuery, setProjectSearchQuery] = React.useState("");

    // Check if any filters are active
    const hasActiveFilters = statusFilter !== "all" || focusFilter !== "all" || selectedProject !== "all" || assignedUserFilter !== "all";

    // Clear all filters
    const handleClearFilters = useCallback(() => {
        onStatusFilterChange("all");
        onFocusFilterChange("all");
        onProjectChange("all");
        onAssignedUserFilterChange("all");
        onSortByChange("created_at");
    }, [onStatusFilterChange, onFocusFilterChange, onProjectChange, onAssignedUserFilterChange, onSortByChange]);

    // Handle project selection
    const handleProjectSelect = useCallback((projectId: string) => {
        onProjectChange(projectId);
        setProjectDropdownOpen(false);
        setProjectSearchQuery("");
    }, [onProjectChange]);

    // Close dropdown when it closes
    React.useEffect(() => {
        if (!projectDropdownOpen) {
            setProjectSearchQuery("");
        }
    }, [projectDropdownOpen]);

    // Filter projects by search query
    const filteredProjects = React.useMemo(() => {
        if (!projectSearchQuery) return projects;
        const query = projectSearchQuery.toLowerCase();
        return projects.filter(p => p.name?.toLowerCase().includes(query));
    }, [projects, projectSearchQuery]);

    return (
        <div className={cn("space-y-3", className)}>
            {/* Top Row: Tabs and View Switcher */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
                {/* Filter Tabs */}
                <Tabs value={activeFilter} onValueChange={(v) => onActiveFilterChange(v as FilterType)}>
                    <TabsList className="h-8">
                        <TabsTrigger value="all" className="text-xs px-3 h-7">
                            Tümü
                        </TabsTrigger>
                        <TabsTrigger value="my-tasks" className="text-xs px-3 h-7">
                            Benim Görevlerim
                        </TabsTrigger>
                        <TabsTrigger value="pool" className="text-xs px-3 h-7">
                            Havuz
                        </TabsTrigger>
                        <TabsTrigger value="archive" className="text-xs px-3 h-7">
                            Arşiv
                        </TabsTrigger>
                    </TabsList>
                </Tabs>

                {/* Right Side Actions */}
                <div className="flex items-center gap-2">
                    {/* View Mode Switcher */}
                    <div className="flex items-center border rounded-md overflow-hidden">
                        <Button
                            variant={viewMode === "list" ? "default" : "ghost"}
                            size="sm"
                            className="h-7 px-2 rounded-none"
                            onClick={() => onViewModeChange("list")}
                        >
                            <List className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                            variant={viewMode === "board" ? "default" : "ghost"}
                            size="sm"
                            className="h-7 px-2 rounded-none"
                            onClick={() => onViewModeChange("board")}
                        >
                            <LayoutGrid className="h-3.5 w-3.5" />
                        </Button>
                    </div>

                    {/* Refresh Button */}
                    {onRefresh && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2"
                            onClick={onRefresh}
                            disabled={loading}
                        >
                            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
                        </Button>
                    )}

                    {/* Create Task Button */}
                    {canCreate && (
                        <Button
                            size="sm"
                            className="h-7 px-3 gap-1.5"
                            onClick={onCreateTask}
                        >
                            <Plus className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline text-xs">Görev Ekle</span>
                        </Button>
                    )}
                </div>
            </div>

            {/* Second Row: Filters */}
            <div className="flex items-center gap-2 flex-wrap">
                {/* Clear Filters Button */}
                {hasActiveFilters && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleClearFilters}
                        className="h-7 text-xs px-2 gap-1 text-muted-foreground hover:text-foreground"
                    >
                        <X className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Temizle</span>
                    </Button>
                )}

                {/* Project Filter */}
                <Popover open={projectDropdownOpen} onOpenChange={setProjectDropdownOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={projectDropdownOpen}
                            className="h-7 text-xs px-2.5 min-w-[160px] justify-between"
                        >
                            <div className="flex items-center gap-1.5">
                                <Folder className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="truncate">
                                    {selectedProject === "all" ? "Tüm Projeler" :
                                        selectedProject === "general" ? "Genel Görevler" :
                                            projects.find(p => p.id === selectedProject)?.name || "Proje Seçin"}
                                </span>
                            </div>
                            <ChevronDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[280px] p-0" align="start">
                        <Command shouldFilter={false}>
                            <CommandInput
                                placeholder="Proje ara..."
                                value={projectSearchQuery}
                                onValueChange={setProjectSearchQuery}
                                className="text-xs"
                            />
                            <CommandList className="max-h-[250px]">
                                <CommandEmpty>Proje bulunamadı.</CommandEmpty>
                                <CommandGroup>
                                    <CommandItem
                                        value="all"
                                        onSelect={() => handleProjectSelect("all")}
                                        className="cursor-pointer"
                                    >
                                        <div className="flex items-center gap-2 w-full">
                                            <CheckSquare className="h-4 w-4" />
                                            <span>Tüm Projeler</span>
                                            {selectedProject === "all" && (
                                                <Check className="ml-auto h-4 w-4" />
                                            )}
                                        </div>
                                    </CommandItem>
                                    <CommandItem
                                        value="general"
                                        onSelect={() => handleProjectSelect("general")}
                                        className="cursor-pointer"
                                    >
                                        <div className="flex items-center gap-2 w-full">
                                            <Folder className="h-4 w-4" />
                                            <span>Genel Görevler</span>
                                            {selectedProject === "general" && (
                                                <Check className="ml-auto h-4 w-4" />
                                            )}
                                        </div>
                                    </CommandItem>
                                </CommandGroup>
                                {filteredProjects.length > 0 && (
                                    <CommandGroup heading="Projeler">
                                        {filteredProjects.map((project) => (
                                            <CommandItem
                                                key={project.id}
                                                value={project.id}
                                                onSelect={() => handleProjectSelect(project.id)}
                                                className="cursor-pointer"
                                            >
                                                <div className="flex items-center gap-2 w-full">
                                                    {project.isPrivate && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                                                    <span className="flex-1">{project.name}</span>
                                                    {project.id === lastUsedProjectId && (
                                                        <Badge variant="outline" className="text-[9px] h-4 px-1">Son</Badge>
                                                    )}
                                                    {selectedProject === project.id && (
                                                        <Check className="ml-2 h-4 w-4" />
                                                    )}
                                                </div>
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                )}
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>

                {/* Status Filter */}
                <Select value={statusFilter} onValueChange={onStatusFilterChange}>
                    <SelectTrigger className="h-7 text-xs w-[120px]">
                        <SelectValue placeholder="Durum" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all" className="text-xs">Tüm Durumlar</SelectItem>
                        <SelectItem value="pending" className="text-xs">Yapılacak</SelectItem>
                        <SelectItem value="in_progress" className="text-xs">Devam Ediyor</SelectItem>
                        <SelectItem value="completed" className="text-xs">Tamamlandı</SelectItem>
                        <SelectItem value="approved" className="text-xs">Onaylandı</SelectItem>
                    </SelectContent>
                </Select>

                {/* Focus Filter */}
                <Select value={focusFilter} onValueChange={(v) => onFocusFilterChange(v as FocusFilter)}>
                    <SelectTrigger className="h-7 text-xs w-[130px]">
                        <SelectValue placeholder="Odak" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all" className="text-xs">Tümü</SelectItem>
                        <SelectItem value="overdue" className="text-xs">Gecikmiş</SelectItem>
                        <SelectItem value="due_soon" className="text-xs">Yaklaşan</SelectItem>
                        <SelectItem value="high_priority" className="text-xs">Yüksek Öncelik</SelectItem>
                    </SelectContent>
                </Select>

                {/* Assigned User Filter */}
                <Select value={assignedUserFilter} onValueChange={onAssignedUserFilterChange}>
                    <SelectTrigger className="h-7 text-xs w-[140px]">
                        <SelectValue placeholder="Atanan Kişi" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all" className="text-xs">Tüm Kişiler</SelectItem>
                        {users.map((user) => (
                            <SelectItem key={user.id} value={user.id} className="text-xs">
                                {user.fullName || user.displayName || user.email || "Bilinmiyor"}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {/* Search */}
                <div className="flex-1 min-w-[200px] max-w-[300px]">
                    <SearchInput
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder="Görev ara..."
                        className="h-7 text-xs"
                    />
                </div>

                {/* Sort */}
                <Select value={sortBy} onValueChange={onSortByChange}>
                    <SelectTrigger className="h-7 text-xs w-[110px]">
                        <SelectValue placeholder="Sırala" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="created_at" className="text-xs">Tarih</SelectItem>
                        <SelectItem value="priority" className="text-xs">Öncelik</SelectItem>
                        <SelectItem value="due_date" className="text-xs">Bitiş Tarihi</SelectItem>
                    </SelectContent>
                </Select>

                {/* Multi-select Toggle */}
                <Button
                    variant={isMultiSelectMode ? "default" : "outline"}
                    size="sm"
                    className="h-7 px-2 gap-1"
                    onClick={() => onMultiSelectModeChange(!isMultiSelectMode)}
                >
                    <CheckSquare className="h-3.5 w-3.5" />
                    {isMultiSelectMode && selectedCount > 0 && (
                        <Badge variant="secondary" className="h-4 px-1 text-[9px]">
                            {selectedCount}
                        </Badge>
                    )}
                </Button>
            </div>
        </div>
    );
});

TaskListHeader.displayName = "TaskListHeader";

export { TaskListHeader };
export default TaskListHeader;
