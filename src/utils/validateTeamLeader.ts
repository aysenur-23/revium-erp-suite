/**
 * Ekip lideri validasyon fonksiyonları
 */

import { getDepartments, Department } from "@/services/firebase/departmentService";
import { getAllUsers, UserProfile } from "@/services/firebase/authService";
import { getTeamMembers } from "./permissions";

/**
 * Ekip liderinin mutlaka bir departmanın manager'ı olup olmadığını kontrol et
 */
export const validateTeamLeaderHasDepartment = async (
  userId: string
): Promise<{ isValid: boolean; message: string; departmentId?: string }> => {
  try {
    const departments = await getDepartments();
    const managedDepartment = departments.find(d => d.managerId === userId);
    
    if (!managedDepartment) {
      return {
        isValid: false,
        message: "Ekip lideri mutlaka bir departmanın yöneticisi olmalıdır.",
      };
    }
    
    return {
      isValid: true,
      message: "Ekip lideri geçerli bir departmanın yöneticisidir.",
      departmentId: managedDepartment.id,
    };
  } catch (error: unknown) {
    if (import.meta.env.DEV) {
      console.error("Validate team leader department error:", error);
    }
    return {
      isValid: false,
      message: error instanceof Error ? error.message : "Ekip lideri kontrolü yapılamadı",
    };
  }
};

/**
 * Ekip liderinin mutlaka bir ekibe sahip olup olmadığını kontrol et
 */
export const validateTeamLeaderHasTeam = async (
  userId: string
): Promise<{ isValid: boolean; message: string; teamMemberCount?: number }> => {
  try {
    const departments = await getDepartments();
    const allUsers = await getAllUsers();
    
    const teamMembers = await getTeamMembers(userId, departments, allUsers);
    
    if (teamMembers.length === 0) {
      return {
        isValid: false,
        message: "Ekip lideri mutlaka en az bir ekip üyesine sahip olmalıdır.",
      };
    }
    
    return {
      isValid: true,
      message: `Ekip lideri ${teamMembers.length} ekip üyesine sahiptir.`,
      teamMemberCount: teamMembers.length,
    };
  } catch (error: unknown) {
    if (import.meta.env.DEV) {
      console.error("Validate team leader team error:", error);
    }
    return {
      isValid: false,
      message: error instanceof Error ? error.message : "Ekip kontrolü yapılamadı",
    };
  }
};

/**
 * Ekip liderinin hem departman hem de ekip kontrolünü yap
 */
export const validateTeamLeader = async (
  userId: string
): Promise<{ isValid: boolean; message: string; departmentId?: string; teamMemberCount?: number }> => {
  const departmentValidation = await validateTeamLeaderHasDepartment(userId);
  if (!departmentValidation.isValid) {
    return departmentValidation;
  }
  
  const teamValidation = await validateTeamLeaderHasTeam(userId);
  if (!teamValidation.isValid) {
    return {
      isValid: false,
      message: teamValidation.message,
      departmentId: departmentValidation.departmentId,
    };
  }
  
  return {
    isValid: true,
    message: "Ekip lideri geçerlidir: Hem departman hem de ekip mevcut.",
    departmentId: departmentValidation.departmentId,
    teamMemberCount: teamValidation.teamMemberCount,
  };
};

