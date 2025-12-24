/**
 * Utility function to set a user as team leader by email
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

    // Also ensure the user has the team_leader role
    const currentRoles = user.role || [];
    if (!currentRoles.includes("team_leader") && !currentRoles.includes("super_admin")) {
       const { updateDoc, doc } = await import("firebase/firestore");
       const { db } = await import("@/lib/firebase");
       const userRef = doc(db, "users", user.id);
       await updateDoc(userRef, {
         role: [...currentRoles, "team_leader"]
       });
    }

    return {
      success: true,
      message: `${user.fullName || user.email} kullanıcısı "${targetDepartment.name}" ekibinin lideri olarak atandı ve rolü güncellendi.`,
    };
  } catch (error: unknown) {
    if (import.meta.env.DEV) {
      console.error("Set team leader error:", error);
    }
    return {
      success: false,
      message: error instanceof Error ? error.message : "Ekip lideri atanırken hata oluştu",
    };
  }
};

