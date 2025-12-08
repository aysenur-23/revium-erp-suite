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
import { REQUIRE_EMAIL_VERIFICATION } from "@/config/auth";
import { getPermission, onPermissionCacheChange } from "@/services/firebase/rolePermissionsService";

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

  // Check roles based on role_permissions system
  const checkRoles = async (userProfile: UserProfile | null) => {
    if (!userProfile || !userProfile.role || userProfile.role.length === 0) {
      setIsSuperAdmin(false);
      setIsAdmin(false);
      setIsTeamLeader(false);
      return;
    }

    const userRoles = userProfile.role;
    
    // Super admin: super_admin rolüne sahip mi?
    const hasSuperAdminRole = userRoles.includes('super_admin');
    setIsSuperAdmin(hasSuperAdminRole);

    // Admin: admin veya super_admin rolüne sahip mi VE role_permissions sisteminde admin kaynaklarına erişim var mı?
    const hasAdminRole = userRoles.includes('admin') || hasSuperAdminRole;
    if (hasAdminRole) {
      try {
        // Admin paneli erişimi için audit_logs kaynağına canRead yetkisi kontrolü
        // Eğer super_admin ise direkt true, değilse role_permissions'tan kontrol et
        if (hasSuperAdminRole) {
          setIsAdmin(true);
        } else {
          const adminPermission = await getPermission('admin', 'audit_logs');
          setIsAdmin(adminPermission?.canRead === true);
        }
      } catch (error) {
        // Hata durumunda fallback: rol array'inden kontrol et
        setIsAdmin(hasAdminRole);
      }
    } else {
      setIsAdmin(false);
    }

    // Team leader: team_leader rolüne sahip mi veya bir departmanın managerId'si mi?
    const hasTeamLeaderRole = userRoles.includes('team_leader');
    if (hasTeamLeaderRole || hasAdminRole) {
      // Ekip lideri kontrolü: departments tablosundaki managerId alanına da bak
      try {
        const { getDepartments } = await import("@/services/firebase/departmentService");
        const departments = await getDepartments();
        const isManager = departments.some((dept) => dept.managerId === userProfile.id);
        setIsTeamLeader(hasTeamLeaderRole || isManager || hasAdminRole);
      } catch (error) {
        // Hata durumunda fallback: rol array'inden kontrol et
        setIsTeamLeader(hasTeamLeaderRole || hasAdminRole);
      }
    } else {
      setIsTeamLeader(false);
    }
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
    let unsubscribe: (() => void) | null = null;
    let isMounted = true;
    
    // Timeout: Eğer 5 saniye içinde auth state gelmezse loading'i false yap
    // Bu, Firebase başlatılamazsa veya network sorunları varsa kullanıcının takılıp kalmasını önler
    const loadingTimeout = setTimeout(() => {
      if (isMounted) {
        setLoading(false);
        if (import.meta.env.DEV) {
          console.warn("Auth state timeout (5 saniye) - loading'i false yapıyoruz");
        }
      }
    }, 5000);
    
    // Firebase Auth state listener'ı hemen başlat
    try {
      unsubscribe = onAuthChange(async (userProfile) => {
        if (!isMounted) return;
        
        clearTimeout(loadingTimeout);
        
        try {
          if (userProfile) {
            const userData = convertUserProfileToUser(userProfile);
            setUser(userData);
            // Check roles based on role_permissions system
            await checkRoles(userProfile);
            
            // Listen to permission cache changes for real-time updates
            const unsubscribePermissions = onPermissionCacheChange(async () => {
              if (isMounted && userProfile) {
                await checkRoles(userProfile);
              }
            });
            
            // Store unsubscribe function for cleanup
            if (isMounted) {
              (window as any).__unsubscribePermissions = unsubscribePermissions;
            }
          } else {
            setUser(null);
            setIsAdmin(false);
            setIsSuperAdmin(false);
            setIsTeamLeader(false);
          }
        } catch (error) {
          // Callback içinde hata oluşursa
          if (import.meta.env.DEV) {
            console.error("Auth state callback hatası:", error);
          }
          // Hata durumunda user'ı null yap ve loading'i false yap
          if (isMounted) {
            setUser(null);
            setIsAdmin(false);
            setIsSuperAdmin(false);
            setIsTeamLeader(false);
          }
        } finally {
          if (isMounted) {
            setLoading(false);
          }
        }
      });
    } catch (error) {
      // Firebase initialization hatası durumunda
      if (import.meta.env.DEV) {
        console.error("Auth state listener hatası:", error);
      }
      clearTimeout(loadingTimeout);
      if (isMounted) {
        setLoading(false);
        setUser(null);
        setIsAdmin(false);
        setIsSuperAdmin(false);
        setIsTeamLeader(false);
      }
    }

    return () => {
      isMounted = false;
      clearTimeout(loadingTimeout);
      if (unsubscribe) {
        unsubscribe();
      }
      // Cleanup permission cache listener
      if ((window as any).__unsubscribePermissions) {
        (window as any).__unsubscribePermissions();
        delete (window as any).__unsubscribePermissions;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const signIn = async (email: string, password: string) => {
    try {
      const result = await login(email, password);
      
      if (result.success && result.user) {
        const userData = convertUserProfileToUser(result.user);
        setUser(userData);
        
        // Check roles based on role_permissions system
        await checkRoles(result.user);
        
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
        
        // Check roles based on role_permissions system
        await checkRoles(result.user);
        
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
