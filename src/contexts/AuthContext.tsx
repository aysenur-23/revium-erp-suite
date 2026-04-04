import { createContext, useContext, useEffect, useState, useMemo, useRef, ReactNode } from "react";
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
import { Timestamp } from "firebase/firestore";

interface User {
  id: string;
  email: string;
  emailVerified: boolean;
  fullName: string;
  phone?: string;
  dateOfBirth?: string;
  roles: string[];
  lastLoginAt?: Timestamp | Date | null;
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
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isTeamLeader, setIsTeamLeader] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Departments cache - performans için
  const departmentsCacheRef = useRef<Array<{ id: string; managerId?: string }> | null>(null);
  const departmentsCacheTimeRef = useRef<number>(0);
  const CACHE_DURATION = 5 * 60 * 1000; // 5 dakika

  // Departments'ı cache'den al veya yükle
  const getDepartmentsCached = async (): Promise<Array<{ id: string; managerId?: string }>> => {
    const now = Date.now();
    // Cache varsa ve 5 dakikadan eski değilse kullan
    if (departmentsCacheRef.current && (now - departmentsCacheTimeRef.current) < CACHE_DURATION) {
      return departmentsCacheRef.current;
    }
    
    // Cache yoksa veya eskiyse yükle
    try {
      const { getDepartments } = await import("@/services/firebase/departmentService");
      const departments = await getDepartments();
      departmentsCacheRef.current = departments;
      departmentsCacheTimeRef.current = now;
      return departments;
    } catch (error) {
      // Hata durumunda cache'i kullan veya boş array döndür
      if (departmentsCacheRef.current) {
        return departmentsCacheRef.current;
      }
      return [];
    }
  };

  // Check roles based on role_permissions system - Firestore'dan kontrol et
  const checkRoles = async (userProfile: UserProfile | null) => {
    const normalizedRoles = normalizeRoles(userProfile?.role);

    if (!userProfile || normalizedRoles.length === 0) {
      setIsSuperAdmin(false);
      setIsAdmin(false);
      setIsTeamLeader(false);
      return;
    }

    const userRoles = normalizedRoles;
    
    // Super Admin kontrolü - Firestore'dan
    let hasSuperAdminPermission = false;
    for (const role of userRoles) {
      if (role === "super_admin" || role === "main_admin") {
        try {
          // Ensure permissions are initialized
          const { getRolePermissions } = await import("@/services/firebase/rolePermissionsService");
          await getRolePermissions();
          
          const permission = await getPermission(role, "role_permissions", true);
          hasSuperAdminPermission = permission?.canRead === true;
          if (hasSuperAdminPermission) break;
        } catch (error: unknown) {
          if (import.meta.env.DEV) {
            console.error("Error checking super admin permission:", error);
          }
          // Fallback: rol array'inden kontrol - super_admin rolü varsa true
          hasSuperAdminPermission = true;
          break;
        }
      }
    }
    setIsSuperAdmin(hasSuperAdminPermission);
    setIsAdmin(hasSuperAdminPermission);

    // Team Leader kontrolü - Firestore'dan
    let hasTeamLeaderPermission = false;
    for (const role of userRoles) {
      if (role === "team_leader") {
        try {
          // Ensure permissions are initialized
          const { getRolePermissions } = await import("@/services/firebase/rolePermissionsService");
          await getRolePermissions();
          
          // Team leader için departments kaynağında canUpdate yetkisi var mı?
          const permission = await getPermission(role, "departments", true);
          hasTeamLeaderPermission = permission?.canUpdate === true;
          if (hasTeamLeaderPermission) break;
        } catch (error: unknown) {
          if (import.meta.env.DEV) {
            console.error("Error checking team leader permission:", error);
          }
          // Fallback: manager kontrolü
          try {
            const departments = await getDepartmentsCached();
            hasTeamLeaderPermission = departments.some((dept) => dept.managerId === userProfile.id);
            if (hasTeamLeaderPermission) break;
          } catch (deptError: unknown) {
            if (import.meta.env.DEV) {
              console.error("Error checking team leader from departments:", deptError);
            }
          }
        }
      }
    }
    setIsTeamLeader(hasTeamLeaderPermission);
  };

  const normalizeRoles = (roles?: string[] | null): string[] => {
    if (!roles || roles.length === 0) return [];
    const mapped = roles.map((r) => (r === "admin" ? "super_admin" : r));
    // Tekrarlananları temizle
    return Array.from(new Set(mapped));
  };

  const convertUserProfileToUser = (profile: UserProfile | null): User | null => {
    if (!profile) return null;
    
    const normalizedRoles = normalizeRoles(profile.role);

    return {
      id: profile.id,
      email: profile.email,
      emailVerified: profile.emailVerified,
      fullName: profile.fullName || profile.displayName,
      phone: profile.phone,
      dateOfBirth: profile.dateOfBirth,
      roles: normalizedRoles,
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
          if (import.meta.env.DEV) {
            console.warn("Auth state timeout (5 saniye) - loading'i false yapıyoruz");
          }
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
            setCurrentUserProfile(userProfile);
            // Check roles based on role_permissions system
            await checkRoles(userProfile);
            
            // Listen to permission cache changes for real-time updates
            const unsubscribePermissions = onPermissionCacheChange(async () => {
              if (isMounted) {
                // Departments cache'ini invalidate et (rol değişiklikleri departments'ı etkileyebilir)
                departmentsCacheRef.current = null;
                departmentsCacheTimeRef.current = 0;
                
                // Kullanıcı profilini yeniden yükle (rol değişikliklerini yakalamak için)
                try {
                  const { getUserProfile } = await import("@/services/firebase/authService");
                  const { auth } = await import("@/lib/firebase");
                  if (auth?.currentUser) {
                    const updatedProfile = await getUserProfile(auth.currentUser.uid);
                    if (updatedProfile) {
                      const updatedUserData = convertUserProfileToUser(updatedProfile);
                      setUser(updatedUserData);
                      setCurrentUserProfile(updatedProfile);
                      await checkRoles(updatedProfile);
                    } else {
                      // Profil yüklenemezse mevcut userProfile ile devam et
                      await checkRoles(userProfile);
                    }
                  } else {
                    // Auth yoksa mevcut userProfile ile devam et
                    await checkRoles(userProfile);
                  }
                } catch (error) {
                  // Hata durumunda mevcut userProfile ile devam et
                  if (import.meta.env.DEV) {
                    if (import.meta.env.DEV) {
                      console.error("Permission cache değişikliğinde profil yenileme hatası:", error);
                    }
                  }
                  await checkRoles(userProfile);
                }
              }
            });
            
            // Store unsubscribe function for cleanup
            if (isMounted) {
              (window as Window & { __unsubscribePermissions?: () => void }).__unsubscribePermissions = unsubscribePermissions;
            }
          } else {
            setUser(null);
            setCurrentUserProfile(null);
            setIsAdmin(false);
            setIsSuperAdmin(false);
            setIsTeamLeader(false);
          }
        } catch (error) {
          // Callback içinde hata oluşursa
          if (import.meta.env.DEV) {
            if (import.meta.env.DEV) {
              console.error("Auth state callback hatası:", error);
            }
          }
          // Hata durumunda user'ı null yap ve loading'i false yap
          if (isMounted) {
            setUser(null);
            setCurrentUserProfile(null);
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
        if (import.meta.env.DEV) {
          console.error("Auth state listener hatası:", error);
        }
      }
      clearTimeout(loadingTimeout);
      if (isMounted) {
        setLoading(false);
        setUser(null);
        setCurrentUserProfile(null);
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
      const windowWithUnsubscribe = window as Window & { __unsubscribePermissions?: () => void };
      if (windowWithUnsubscribe.__unsubscribePermissions) {
        windowWithUnsubscribe.__unsubscribePermissions();
        delete windowWithUnsubscribe.__unsubscribePermissions;
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
    } catch (error: unknown) {
      return { success: false, message: error instanceof Error ? error.message : 'Giriş başarısız' };
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
    } catch (error: unknown) {
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
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        message: errorMsg || 'Kayıt başarısız',
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
      setCurrentUserProfile(null);
      setIsAdmin(false);
      setIsSuperAdmin(false);
      setIsTeamLeader(false);
      window.location.href = "/auth";
    }
  };

  const handleResetPassword = async (email: string) => {
    try {
      return await resetPassword(email);
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        message: errorMsg || 'Şifre sıfırlama başarısız',
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
