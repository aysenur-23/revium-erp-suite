/**
 * usePermissions Hook
 * Rol yetkilerini dinamik olarak kontrol eder ve real-time güncellemeleri dinler
 */

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { UserProfile } from "@/services/firebase/authService";
import {
  canCreateResource,
  canReadResource,
  canUpdateResource,
  canDeleteResource,
  canPerformSubPermission,
} from "@/utils/permissions";
import { onPermissionCacheChange } from "@/services/firebase/rolePermissionsService";

interface UsePermissionsResult {
  canCreate: (resource: string) => Promise<boolean>;
  canRead: (resource: string) => Promise<boolean>;
  canUpdate: (resource: string) => Promise<boolean>;
  canDelete: (resource: string) => Promise<boolean>;
  canPerformSubPerm: (resource: string, subPermissionKey: string) => Promise<boolean>;
  refreshPermissions: () => void;
}

export const usePermissions = (): UsePermissionsResult => {
  const { user } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);

  // Convert user to UserProfile format
  const getUserProfile = useCallback((): UserProfile | null => {
    if (!user) return null;
    return {
      id: user.id,
      email: user.email,
      emailVerified: user.emailVerified,
      fullName: user.fullName,
      displayName: user.fullName,
      phone: user.phone,
      dateOfBirth: user.dateOfBirth,
      role: user.roles,
      createdAt: null,
      updatedAt: null,
    };
  }, [user]);

  // Listen to permission cache changes
  useEffect(() => {
    const unsubscribe = onPermissionCacheChange(() => {
      // Force re-render when permissions change
      setRefreshKey(prev => prev + 1);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const canCreate = useCallback(async (resource: string): Promise<boolean> => {
    const userProfile = getUserProfile();
    if (!userProfile) return false;
    return await canCreateResource(userProfile, resource);
  }, [getUserProfile, refreshKey]);

  const canRead = useCallback(async (resource: string): Promise<boolean> => {
    const userProfile = getUserProfile();
    if (!userProfile) return false;
    return await canReadResource(userProfile, resource);
  }, [getUserProfile, refreshKey]);

  const canUpdate = useCallback(async (resource: string): Promise<boolean> => {
    const userProfile = getUserProfile();
    if (!userProfile) return false;
    return await canUpdateResource(userProfile, resource);
  }, [getUserProfile, refreshKey]);

  const canDelete = useCallback(async (resource: string): Promise<boolean> => {
    const userProfile = getUserProfile();
    if (!userProfile) return false;
    return await canDeleteResource(userProfile, resource);
  }, [getUserProfile, refreshKey]);

  const canPerformSubPerm = useCallback(async (
    resource: string,
    subPermissionKey: string
  ): Promise<boolean> => {
    const userProfile = getUserProfile();
    if (!userProfile) return false;
    return await canPerformSubPermission(userProfile, resource, subPermissionKey);
  }, [getUserProfile, refreshKey]);

  const refreshPermissions = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  return {
    canCreate,
    canRead,
    canUpdate,
    canDelete,
    canPerformSubPerm,
    refreshPermissions,
  };
};

