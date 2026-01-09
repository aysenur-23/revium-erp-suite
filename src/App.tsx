import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider, Outlet, Navigate, useParams } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AdminRoute } from "./components/AdminRoute";
import ErrorBoundary from "./components/ErrorBoundary";
import { ErrorPage } from "./components/ErrorPage";
import { Loader2 } from "lucide-react";
import { MainLayout } from "./components/Layout/MainLayout";

// Redirect component for project tasks
const ProjectTasksRedirect = () => {
  const { projectId } = useParams<{ projectId: string }>();
  return <Navigate to={`/tasks?project=${projectId}`} replace />;
};

// Lazy load pages for better performance with error handling
// Optimized for faster initial load - only retry on network errors
const lazyWithRetry = (componentImport: () => Promise<{ default: React.ComponentType<unknown> }>) => {
  return lazy(async () => {
    try {
      return await componentImport();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Sadece network hatalarında retry yap
      const isNetworkError = errorMessage.includes('ERR_CONNECTION_REFUSED') || 
                             errorMessage.includes('ERR_NETWORK_CHANGED') ||
                             errorMessage.includes('Failed to fetch') ||
                             errorMessage.includes('NetworkError') ||
                             errorMessage.includes('network');
      
      if (isNetworkError) {
        // Network hatası: 1 retry, 50ms delay
        if (import.meta.env.DEV) {
          console.warn('Lazy loading network error, retrying in 50ms...');
        }
        await new Promise(resolve => setTimeout(resolve, 50));
        try {
          return await componentImport();
        } catch (retryError) {
          if (import.meta.env.DEV) {
            console.error('Lazy loading failed after retry:', retryError);
          }
          throw retryError;
        }
      }
      
      // Network hatası değilse hemen fırlat (syntax error, module not found, vb.)
      if (import.meta.env.DEV) {
        console.error('Lazy loading error (non-network):', error);
      }
      throw error;
    }
  });
};

// Preload critical pages on app start
// Optimized: requestIdleCallback kullan ve daha geç başlat (non-blocking)
const preloadCriticalPages = () => {
  // Critical pages'i arka planda preload et (sadece gerçekten kritik olanlar)
  import("./pages/Dashboard").catch(() => {});
  import("./pages/Tasks").catch(() => {});
};

// App başladığında critical sayfaları preload et
if (typeof window !== 'undefined') {
  // requestIdleCallback kullan (tarayıcı müsait olduğunda)
  // Fallback: setTimeout ile 2000ms sonra (100ms → 2000ms)
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(
      () => {
        // İlk idle callback'te hemen preload et
        preloadCriticalPages();
      },
      { timeout: 2000 } // Maksimum 2 saniye bekle
    );
  } else {
    // Fallback: setTimeout ile 2000ms sonra preload et (non-blocking)
    setTimeout(preloadCriticalPages, 2000);
  }
}

const Dashboard = lazyWithRetry(() => import("./pages/Dashboard"));
const Production = lazyWithRetry(() => import("./pages/Production"));
const Tasks = lazyWithRetry(() => import("./pages/Tasks"));
const TaskDetail = lazyWithRetry(() => import("./pages/TaskDetail"));
const TaskPool = lazyWithRetry(() => import("./components/Tasks/TaskPool"));
const TasksArchive = lazyWithRetry(() => import("./pages/TasksArchive"));
const Customers = lazyWithRetry(() => import("./pages/Customers"));
const Products = lazyWithRetry(() => import("./pages/Products"));
const Orders = lazyWithRetry(() => import("./pages/Orders"));
const Reports = lazyWithRetry(() => import("./pages/Reports"));
const RawMaterials = lazyWithRetry(() => import("./pages/RawMaterials"));
const Settings = lazyWithRetry(() => import("./pages/Settings"));
const Profile = lazyWithRetry(() => import("./pages/Profile"));
const Admin = lazyWithRetry(() => import("./pages/Admin"));
const TeamManagement = lazyWithRetry(() => import("./pages/TeamManagement"));
const Projects = lazyWithRetry(() => import("./pages/Projects"));
const Warranty = lazyWithRetry(() => import("./pages/Warranty"));
const Requests = lazyWithRetry(() => import("./pages/Requests"));
const Notifications = lazyWithRetry(() => import("./pages/Notifications"));

// Auth pages - keep synchronous for faster initial load
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import VerifyEmail from "./pages/VerifyEmail";
import VerifyEmailPrompt from "./pages/VerifyEmailPrompt";
import ResetPassword from "./pages/ResetPassword";

// Loading component - MainLayout kullanmıyor çünkü Header/Sidebar useAuth gerektiriyor
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Sayfa yükleniyor...</p>
    </div>
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // Window focus'ta otomatik refetch'i kapat (performans için)
      retry: 1, // Retry sayısını 1'e indir (hata durumunda 1 kez dene)
      staleTime: 10 * 60 * 1000, // 10 dakika stale time (5 dakika → 10 dakika, daha agresif cache)
      gcTime: 15 * 60 * 1000, // 15 dakika cache time (10 dakika → 15 dakika, daha uzun cache)
      // İlk yüklemede daha hızlı render için
      refetchOnMount: false, // Mount'ta refetch yapma (cache'den göster - performans için)
      refetchOnReconnect: false, // Reconnect'te refetch yapma
      networkMode: 'online', // Sadece online'dayken fetch yap
      // Performans için: Query'leri daha agresif cache'le
      structuralSharing: true, // Structural sharing ile gereksiz re-render'ları önle
      // Placeholder data ile hızlı render
      placeholderData: (previousData) => previousData, // Önceki data'yı placeholder olarak kullan
      // Retry delay'i azalt (daha hızlı hata gösterimi)
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff, max 30s
    },
  },
});

const AppProviders = () => (
  <AuthProvider>
    <Outlet />
  </AuthProvider>
);

const router = createBrowserRouter(
  [
    {
      element: <AppProviders />,
      errorElement: <ErrorPage />,
      future: {
        v7_startTransition: true, // React Router v7 uyumluluğu için
      },
      children: [
        { path: "/verify-email", element: <VerifyEmail />, errorElement: <ErrorPage /> },
        { path: "/verify-email-prompt", element: <VerifyEmailPrompt />, errorElement: <ErrorPage /> },
        { path: "/reset-password", element: <ResetPassword />, errorElement: <ErrorPage /> },
        { path: "/auth", element: <Auth />, errorElement: <ErrorPage /> },
        { path: "/", element: <ProtectedRoute><Suspense fallback={<PageLoader />}><Dashboard /></Suspense></ProtectedRoute>, errorElement: <ErrorPage /> },
        { path: "/production", element: <ProtectedRoute><Suspense fallback={<PageLoader />}><Production /></Suspense></ProtectedRoute>, errorElement: <ErrorPage /> },
        { path: "/tasks", element: <ProtectedRoute><Suspense fallback={<PageLoader />}><Tasks /></Suspense></ProtectedRoute>, errorElement: <ErrorPage /> },
        { path: "/tasks/:id", element: <ProtectedRoute><Suspense fallback={<PageLoader />}><TaskDetail /></Suspense></ProtectedRoute>, errorElement: <ErrorPage /> },
        { path: "/tasks/archive", element: <ProtectedRoute><Navigate to="/tasks?filter=archive" replace /></ProtectedRoute>, errorElement: <ErrorPage /> },
        { path: "/task-pool", element: <ProtectedRoute><Navigate to="/tasks?filter=pool" replace /></ProtectedRoute>, errorElement: <ErrorPage /> },
        { path: "/projects", element: <ProtectedRoute><Suspense fallback={<PageLoader />}><Projects /></Suspense></ProtectedRoute>, errorElement: <ErrorPage /> },
        { 
          path: "/projects/:projectId/tasks", 
          element: <ProtectedRoute>
            <Suspense fallback={<PageLoader />}>
              <ProjectTasksRedirect />
            </Suspense>
          </ProtectedRoute>, 
          errorElement: <ErrorPage /> 
        },
        { path: "/customers", element: <ProtectedRoute><Suspense fallback={<PageLoader />}><Customers /></Suspense></ProtectedRoute>, errorElement: <ErrorPage /> },
        { path: "/products", element: <ProtectedRoute><Suspense fallback={<PageLoader />}><Products /></Suspense></ProtectedRoute>, errorElement: <ErrorPage /> },
        { path: "/orders", element: <ProtectedRoute><Suspense fallback={<PageLoader />}><Orders /></Suspense></ProtectedRoute>, errorElement: <ErrorPage /> },
        { path: "/requests", element: <ProtectedRoute><Suspense fallback={<PageLoader />}><Requests /></Suspense></ProtectedRoute>, errorElement: <ErrorPage /> },
        { path: "/reports", element: <ProtectedRoute><Suspense fallback={<PageLoader />}><Reports /></Suspense></ProtectedRoute>, errorElement: <ErrorPage /> },
        { path: "/raw-materials", element: <ProtectedRoute><Suspense fallback={<PageLoader />}><RawMaterials /></Suspense></ProtectedRoute>, errorElement: <ErrorPage /> },
        { path: "/warranty", element: <ProtectedRoute><Suspense fallback={<PageLoader />}><Warranty /></Suspense></ProtectedRoute>, errorElement: <ErrorPage /> },
        { path: "/admin", element: <AdminRoute><Suspense fallback={<PageLoader />}><Admin /></Suspense></AdminRoute>, errorElement: <ErrorPage /> },
        { path: "/team-management", element: <ProtectedRoute><Suspense fallback={<PageLoader />}><TeamManagement /></Suspense></ProtectedRoute>, errorElement: <ErrorPage /> },
        { path: "/settings", element: <ProtectedRoute><Suspense fallback={<PageLoader />}><Settings /></Suspense></ProtectedRoute>, errorElement: <ErrorPage /> },
        { path: "/profile", element: <ProtectedRoute><Suspense fallback={<PageLoader />}><Profile /></Suspense></ProtectedRoute>, errorElement: <ErrorPage /> },
        { path: "/notifications", element: <ProtectedRoute><Suspense fallback={<PageLoader />}><Notifications /></Suspense></ProtectedRoute>, errorElement: <ErrorPage /> },
        { path: "*", element: <NotFound />, errorElement: <ErrorPage /> },
      ],
    },
  ]
);

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <RouterProvider router={router} />
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
