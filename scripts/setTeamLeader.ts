/**
 * Script to set a user as team leader by email
 * Usage: This script can be run from browser console or as a utility function
 */

import { getAllUsers } from "@/services/firebase/authService";
import { getDepartments, updateDepartment } from "@/services/firebase/departmentService";

/**
 * Set user as team leader by email
 * @param email - User email address
 * @param departmentId - Department ID to assign as manager (optional, if not provided, will use first available department)
 */
export const setUserAsTeamLeader = async (
  email: string,
  departmentId?: string
): Promise<{ success: boolean; message: string }> => {
  try {
    // Find user by email
    const users = await getAllUsers();
    const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());

    if (!user) {
      return {
        success: false,
        message: `Kullanıcı bulunamadı: ${email}`,
      };
    }

    // Get departments
    const departments = await getDepartments();

    if (departments.length === 0) {
      return {
        success: false,
        message: "Hiç departman bulunamadı. Önce departman oluşturun.",
      };
    }

    // If departmentId is provided, use it; otherwise use first available department
    let targetDepartment = departmentId
      ? departments.find((d) => d.id === departmentId)
      : departments[0];

    if (!targetDepartment) {
      return {
        success: false,
        message: `Departman bulunamadı: ${departmentId}`,
      };
    }

    // Update department with user as manager
    await updateDepartment(targetDepartment.id, {
      managerId: user.id,
    });

    return {
      success: true,
      message: `${user.fullName || user.email} kullanıcısı "${targetDepartment.name}" ekibinin lideri olarak atandı.`,
    };
  } catch (error: any) {
    console.error("Set team leader error:", error);
    return {
      success: false,
      message: error.message || "Ekip lideri atanırken hata oluştu",
    };
  }
};

/**
 * Set user as team leader for specific email
 * This is a convenience function for the specific email requested
 */
export const setFeralrexAsTeamLeader = async (): Promise<void> => {
  const email = "tevap36814@feralrex.com";
  const result = await setUserAsTeamLeader(email);
  
  if (result.success) {
    console.log("✅", result.message);
  } else {
    console.error("❌", result.message);
  }
};

