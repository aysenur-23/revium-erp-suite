import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  register,
  login,
  logout,
  resetPassword,
  onAuthChange,
  getUserProfile,
  UserProfile,
  signInWithGoogle as signInWithGoogleService,
} from "@/services/firebase/authService";

interface User {
  id: string;
  email: string;
  emailVerified: boolean;
  fullName: string;
  phone?: string;
  dateOfBirth?: string;
  roles: string[];
  lastLoginAt?: any;
}

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isTeamLeader: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  signInWithGoogle: () => Promise<{ success: boolean; message?: string }>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    phone?: string,
    dateOfBirth?: string,
    selectedTeamId?: string,
  ) => Promise<{ success: boolean; message?: string; user: User | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; message?: string }>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isTeamLeader, setIsTeamLeader] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkRoles = (userRoles: string[]) => {
    setIsSuperAdmin(userRoles.includes('super_admin'));
    setIsAdmin(userRoles.includes('admin') || userRoles.includes('super_admin'));
    setIsTeamLeader(userRoles.includes('team_leader') || userRoles.includes('admin') || userRoles.includes('super_admin'));
  };

  const convertUserProfileToUser = (profile: UserProfile | null): User | null => {
    if (!profile) return null;
    
    return {
      id: profile.id,
      email: profile.email,
      emailVerified: profile.emailVerified,
      fullName: profile.fullName || profile.displayName,
      phone: profile.phone,
      dateOfBirth: profile.dateOfBirth,
      roles: profile.role || [],
      lastLoginAt: profile.lastLoginAt,
    };
  };

  useEffect(() => {
    // Firebase Auth state listener
    const unsubscribe = onAuthChange(async (userProfile) => {
      if (userProfile) {
        const userData = convertUserProfileToUser(userProfile);
        setUser(userData);
        if (userData?.roles) {
          checkRoles(userData.roles);
        }
        
        // Ekip lideri kontrolü: Sadece role array'ine bakmak yeterli değil,
        // departments tablosundaki managerId alanına da bakmalıyız
        try {
          const { getDepartments } = await import("@/services/firebase/departmentService");
          const departments = await getDepartments();
          const isManager = departments.some((dept) => dept.managerId === userProfile.id);
          
          // Eğer kullanıcı bir departmanın managerId'si ise, isTeamLeader'ı true yap
          if (isManager) {
            setIsTeamLeader(true);
          }
        } catch (error) {
          // Hata durumunda sessizce devam et, role kontrolü yeterli
          console.error("Ekip lideri kontrolü hatası:", error);
        }
      } else {
        setUser(null);
        setIsAdmin(false);
        setIsSuperAdmin(false);
        setIsTeamLeader(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const result = await login(email, password);
      
      if (result.success && result.user) {
        const userData = convertUserProfileToUser(result.user);
        setUser(userData);
        
        if (userData?.roles) {
          checkRoles(userData.roles);
        }
        
        // Ekip lideri kontrolü: departments tablosundaki managerId alanına da bak
        try {
          const { getDepartments } = await import("@/services/firebase/departmentService");
          const departments = await getDepartments();
          const isManager = departments.some((dept) => dept.managerId === result.user?.id);
          
          if (isManager) {
            setIsTeamLeader(true);
          }
        } catch (error) {
          // Hata durumunda sessizce devam et
          console.error("Ekip lideri kontrolü hatası:", error);
        }
        
        // Email verification flag - Set to false to disable email verification temporarily
        // TODO: Set to true when email verification is ready to be re-enabled
        const REQUIRE_EMAIL_VERIFICATION = false;
        
        // E-posta doğrulanmamışsa doğrulama sayfasına yönlendir - sadece flag true ise
        if (REQUIRE_EMAIL_VERIFICATION && userData && !userData.emailVerified) {
          window.location.href = "/verify-email-prompt";
          return { success: true };
        }
        
        window.location.href = "/";
        return { success: true };
      } else {
        return { success: false, message: result.message || 'Giriş başarısız' };
      }
    } catch (error: any) {
      return { success: false, message: error.message || 'Giriş başarısız' };
    }
  };

  const signInWithGoogle = async () => {
    try {
      const result = await signInWithGoogleService();
      
      if (result.success && result.user) {
        const userData = convertUserProfileToUser(result.user);
        setUser(userData);
        
        if (userData?.roles) {
          checkRoles(userData.roles);
        }
        
        // Ekip lideri kontrolü: departments tablosundaki managerId alanına da bak
        try {
          const { getDepartments } = await import("@/services/firebase/departmentService");
          const departments = await getDepartments();
          const isManager = departments.some((dept) => dept.managerId === result.user?.id);
          
          if (isManager) {
            setIsTeamLeader(true);
          }
        } catch (error) {
          // Hata durumunda sessizce devam et
          console.error("Ekip lideri kontrolü hatası:", error);
        }
        
        window.location.href = "/";
        return { success: true };
      } else {
        return { success: false, message: result.message || 'Google ile giriş başarısız' };
      }
    } catch (error: any) {
      return { success: false, message: error.message || 'Google ile giriş başarısız' };
    }
  };

  const signUp = async (email: string, password: string, fullName: string, phone?: string, dateOfBirth?: string, selectedTeamId?: string) => {
    try {
      const result = await register(email, password, fullName, phone, dateOfBirth, selectedTeamId);

      if (result.success && result.user) {
        const userData = convertUserProfileToUser(result.user);
        // Email doğrulaması yapılmadan kullanıcıyı giriş yaptırma
        // Kullanıcı email doğrulaması yapana kadar beklemeli
        return {
          success: true,
          message: result.message || 'Kayıt başarılı! Lütfen e-posta adresinize gönderilen doğrulama bağlantısına tıklayın.',
          user: userData,
        };
      } else {
        return {
          success: false,
          message: result.message || 'Kayıt başarısız',
          user: null,
        };
      }
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Kayıt başarısız',
        user: null,
      };
    }
  };

  const signOut = async () => {
    try {
      await logout();
    } catch (error) {
      // Ignore logout errors
    } finally {
      setUser(null);
      setIsAdmin(false);
      setIsSuperAdmin(false);
      setIsTeamLeader(false);
      window.location.href = "/auth";
    }
  };

  const handleResetPassword = async (email: string) => {
    try {
      return await resetPassword(email);
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Şifre sıfırlama başarısız',
      };
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAdmin, isSuperAdmin, isTeamLeader, signIn, signInWithGoogle, signUp, signOut, resetPassword: handleResetPassword, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
