/**
 * useTaskPermissions Hook
 * Centralized permission checking for task operations
 * Extracted from Tasks.tsx for better maintainability
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { Timestamp } from "firebase/firestore";
import { UserProfile } from "@/services/firebase/authService";
import { getDepartments } from "@/services/firebase/departmentService";
import { onPermissionCacheChange } from "@/services/firebase/rolePermissionsService";
import {
    canCreateTask,
    canCreateProject,
    canDeleteProject,
    isMainAdmin,
    canUpdateResource,
    canDeleteTask,
    canEditTask,
} from "@/utils/permissions";
import { Project } from "@/services/firebase/projectService";
import { Task as FirebaseTask } from "@/services/firebase/taskService";

interface User {
    id: string;
    email: string;
    emailVerified: boolean;
    fullName: string;
    phone?: string;
    dateOfBirth?: string;
    roles: string[];
}

interface TaskPermissions {
    canCreate: boolean;
    canUpdate: boolean;
    isSuperAdmin: boolean;
    canCreateProject: boolean;
    canDeleteProject: boolean;
    canAccessTeamManagement: boolean;
    loading: boolean;
    checkTaskDeletePermission: (task: FirebaseTask) => Promise<boolean>;
    checkTaskEditPermission: (task: FirebaseTask) => Promise<boolean>;
    refreshPermissions: () => Promise<void>;
}

/**
 * Convert User to UserProfile format for permission checks
 */
const convertUserToProfile = (user: User): UserProfile => ({
    id: user.id,
    email: user.email,
    emailVerified: user.emailVerified,
    fullName: user.fullName,
    displayName: user.fullName,
    phone: user.phone,
    dateOfBirth: user.dateOfBirth,
    role: user.roles,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
});

export function useTaskPermissions(user: User | null): TaskPermissions {
    const [canCreate, setCanCreate] = useState(false);
    const [canUpdate, setCanUpdate] = useState(false);
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);
    const [canCreateProjectState, setCanCreateProjectState] = useState(false);
    const [canDeleteProjectState, setCanDeleteProjectState] = useState(false);
    const [canAccessTeamManagement, setCanAccessTeamManagement] = useState(false);
    const [loading, setLoading] = useState(true);

    // Cache for task-specific permissions
    const taskDeletePermissionCache = useRef<Map<string, boolean>>(new Map());
    const taskEditPermissionCache = useRef<Map<string, boolean>>(new Map());

    /**
     * Check main permissions (super admin, update, etc.)
     */
    const checkMainPermissions = useCallback(async () => {
        if (!user) {
            setIsSuperAdmin(false);
            setCanUpdate(false);
            return;
        }

        try {
            const userProfile = convertUserToProfile(user);
            const [isMainAdminUser, hasUpdatePermission] = await Promise.all([
                isMainAdmin(userProfile),
                canUpdateResource(userProfile, "tasks"),
            ]);
            setIsSuperAdmin(isMainAdminUser);
            setCanUpdate(hasUpdatePermission);
        } catch (error: unknown) {
            if (import.meta.env.DEV) {
                console.error("Error checking main permissions:", error);
            }
            setIsSuperAdmin(false);
            setCanUpdate(false);
        }
    }, [user]);

    /**
     * Check task creation permission
     */
    const checkCreatePermission = useCallback(async () => {
        if (!user) {
            setCanCreate(false);
            return;
        }

        try {
            const departments = await getDepartments();
            const userProfile = convertUserToProfile(user);
            const hasPermission = await canCreateTask(userProfile, departments);
            setCanCreate(hasPermission);
        } catch (error: unknown) {
            if (import.meta.env.DEV) {
                console.error("Permission check error:", error);
            }
            setCanCreate(false);
        }
    }, [user]);

    /**
     * Check project permissions
     */
    const checkProjectPermissions = useCallback(async () => {
        if (!user) {
            setCanCreateProjectState(false);
            setCanDeleteProjectState(false);
            return;
        }

        try {
            const departments = await getDepartments();
            const userProfile = convertUserToProfile(user);

            const canCreateProj = await canCreateProject(userProfile, departments);

            // Create dummy project for delete permission check
            const dummyProject: Project = {
                id: "",
                name: "",
                description: null,
                status: "active",
                isPrivate: false,
                createdBy: user.id,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
            };

            const canDeleteProj = await canDeleteProject(dummyProject, userProfile);

            setCanCreateProjectState(canCreateProj);
            setCanDeleteProjectState(canDeleteProj);
        } catch (error: unknown) {
            if (import.meta.env.DEV) {
                console.error("Error checking project permissions:", error);
            }
            setCanCreateProjectState(false);
            setCanDeleteProjectState(false);
        }
    }, [user]);

    /**
     * Check team management access
     */
    const checkTeamManagementPermission = useCallback(async () => {
        if (!user) {
            setCanAccessTeamManagement(false);
            return;
        }

        try {
            const userProfile = convertUserToProfile(user);
            const canUpdateDepts = await canUpdateResource(userProfile, "departments");
            setCanAccessTeamManagement(canUpdateDepts);
        } catch (error: unknown) {
            if (import.meta.env.DEV) {
                console.error("Error checking team management permission:", error);
            }
            setCanAccessTeamManagement(false);
        }
    }, [user]);

    /**
     * Check if user can delete a specific task
     */
    const checkTaskDeletePermission = useCallback(async (task: FirebaseTask): Promise<boolean> => {
        if (!user) return false;

        // Check cache first
        const cached = taskDeletePermissionCache.current.get(task.id);
        if (cached !== undefined) return cached;

        try {
            const userProfile = convertUserToProfile(user);
            const canDelete = await canDeleteTask(task, userProfile);
            taskDeletePermissionCache.current.set(task.id, canDelete);
            return canDelete;
        } catch (error: unknown) {
            if (import.meta.env.DEV) {
                console.error("Error checking task delete permission:", error);
            }
            return false;
        }
    }, [user]);

    /**
     * Check if user can edit a specific task
     */
    const checkTaskEditPermission = useCallback(async (task: FirebaseTask): Promise<boolean> => {
        if (!user) return false;

        // Check cache first
        const cached = taskEditPermissionCache.current.get(task.id);
        if (cached !== undefined) return cached;

        try {
            const userProfile = convertUserToProfile(user);
            const canEdit = await canEditTask(task, userProfile);
            taskEditPermissionCache.current.set(task.id, canEdit);
            return canEdit;
        } catch (error: unknown) {
            if (import.meta.env.DEV) {
                console.error("Error checking task edit permission:", error);
            }
            return false;
        }
    }, [user]);

    /**
     * Refresh all permissions
     */
    const refreshPermissions = useCallback(async () => {
        setLoading(true);

        // Clear caches
        taskDeletePermissionCache.current.clear();
        taskEditPermissionCache.current.clear();

        try {
            await Promise.all([
                checkMainPermissions(),
                checkCreatePermission(),
                checkProjectPermissions(),
                checkTeamManagementPermission(),
            ]);
        } catch (error: unknown) {
            if (import.meta.env.DEV) {
                console.error("Error refreshing permissions:", error);
            }
        } finally {
            setLoading(false);
        }
    }, [checkMainPermissions, checkCreatePermission, checkProjectPermissions, checkTeamManagementPermission]);

    // Initial permission check
    useEffect(() => {
        refreshPermissions();
    }, [refreshPermissions]);

    // Listen to permission changes
    useEffect(() => {
        if (!user) return;

        const unsubscribe = onPermissionCacheChange(() => {
            // Clear caches and re-check permissions
            taskDeletePermissionCache.current.clear();
            taskEditPermissionCache.current.clear();
            checkCreatePermission();
            checkMainPermissions();
        });

        return () => unsubscribe();
    }, [user, checkCreatePermission, checkMainPermissions]);

    return {
        canCreate,
        canUpdate,
        isSuperAdmin,
        canCreateProject: canCreateProjectState,
        canDeleteProject: canDeleteProjectState,
        canAccessTeamManagement,
        loading,
        checkTaskDeletePermission,
        checkTaskEditPermission,
        refreshPermissions,
    };
}

export type { TaskPermissions, User };
