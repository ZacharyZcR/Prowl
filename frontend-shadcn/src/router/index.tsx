import { lazy, Suspense, type ReactNode } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { useAuthStore } from "@/stores/auth";
import { usePermission } from "@/hooks/usePermission";
import { Layout } from "@/components/layout";
import { Skeleton } from "@/components/ui/skeleton";

// --- Guards ---

function AuthGuard({ children }: { children: ReactNode }) {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function GuestGuard({ children }: { children: ReactNode }) {
  const token = useAuthStore((s) => s.token);
  if (token) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function PermissionGuard({
  permission,
  children,
}: {
  permission: string;
  children: ReactNode;
}) {
  const { can } = usePermission();
  if (!can(permission)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

// --- Lazy pages ---

const Login = lazy(() => import("@/pages/login"));
const OAuthCallback = lazy(() => import("@/pages/oauth-callback"));
const NotFound = lazy(() => import("@/pages/not-found"));
const Dashboard = lazy(() => import("@/pages/dashboard"));
const Users = lazy(() => import("@/pages/users"));
const Roles = lazy(() => import("@/pages/roles"));
const Permissions = lazy(() => import("@/pages/permissions"));
const Projects = lazy(() => import("@/pages/projects"));
const ProjectDetail = lazy(() => import("@/pages/project-detail"));
const Activities = lazy(() => import("@/pages/activities"));
const LoginLogs = lazy(() => import("@/pages/login-logs"));
const ErrorLogs = lazy(() => import("@/pages/error-logs"));
const Settings = lazy(() => import("@/pages/settings"));
const SystemSettings = lazy(() => import("@/pages/system-settings"));
const Webhooks = lazy(() => import("@/pages/webhooks"));
const HealthMonitor = lazy(() => import("@/pages/health-monitor"));
const SystemLogs = lazy(() => import("@/pages/system-logs"));
const Files = lazy(() => import("@/pages/files"));
const CronJobs = lazy(() => import("@/pages/cron-jobs"));
const Announcements = lazy(() => import("@/pages/announcements"));
const Dictionaries = lazy(() => import("@/pages/dictionaries"));
const TaskQueue = lazy(() => import("@/pages/task-queue"));
const ApiKeys = lazy(() => import("@/pages/api-keys"));

// --- Suspense wrapper ---

function SuspenseWrapper({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="p-6">
          <Skeleton className="h-96 w-full" />
        </div>
      }
    >
      {children}
    </Suspense>
  );
}

function Guarded({
  permission,
  children,
}: {
  permission: string;
  children: ReactNode;
}) {
  return (
    <PermissionGuard permission={permission}>
      <SuspenseWrapper>{children}</SuspenseWrapper>
    </PermissionGuard>
  );
}

// --- Router ---

export const router = createBrowserRouter([
  {
    path: "/login",
    element: (
      <GuestGuard>
        <SuspenseWrapper>
          <Login />
        </SuspenseWrapper>
      </GuestGuard>
    ),
  },
  {
    path: "/login/oauth-callback",
    element: (
      <SuspenseWrapper>
        <OAuthCallback />
      </SuspenseWrapper>
    ),
  },
  {
    path: "/",
    element: (
      <AuthGuard>
        <Layout />
      </AuthGuard>
    ),
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      {
        path: "dashboard",
        element: (
          <SuspenseWrapper>
            <Dashboard />
          </SuspenseWrapper>
        ),
      },
      {
        path: "users",
        element: (
          <Guarded permission="user:read">
            <Users />
          </Guarded>
        ),
      },
      {
        path: "roles",
        element: (
          <Guarded permission="role:read">
            <Roles />
          </Guarded>
        ),
      },
      {
        path: "permissions",
        element: (
          <Guarded permission="role:read">
            <Permissions />
          </Guarded>
        ),
      },
      {
        path: "projects",
        element: (
          <Guarded permission="project:read">
            <Projects />
          </Guarded>
        ),
      },
      {
        path: "projects/:id",
        element: (
          <Guarded permission="project:read">
            <ProjectDetail />
          </Guarded>
        ),
      },
      {
        path: "activities",
        element: (
          <Guarded permission="activity:read">
            <Activities />
          </Guarded>
        ),
      },
      {
        path: "login-logs",
        element: (
          <Guarded permission="activity:read">
            <LoginLogs />
          </Guarded>
        ),
      },
      {
        path: "error-logs",
        element: (
          <Guarded permission="error_log:read">
            <ErrorLogs />
          </Guarded>
        ),
      },
      {
        path: "settings",
        element: (
          <SuspenseWrapper>
            <Settings />
          </SuspenseWrapper>
        ),
      },
      {
        path: "system-settings",
        element: (
          <Guarded permission="system:settings">
            <SystemSettings />
          </Guarded>
        ),
      },
      {
        path: "webhooks",
        element: (
          <Guarded permission="system:settings">
            <Webhooks />
          </Guarded>
        ),
      },
      {
        path: "health-monitor",
        element: (
          <Guarded permission="system:settings">
            <HealthMonitor />
          </Guarded>
        ),
      },
      {
        path: "system-logs",
        element: (
          <Guarded permission="system:settings">
            <SystemLogs />
          </Guarded>
        ),
      },
      {
        path: "files",
        element: (
          <Guarded permission="upload:create">
            <Files />
          </Guarded>
        ),
      },
      {
        path: "cron-jobs",
        element: (
          <Guarded permission="cron:read">
            <CronJobs />
          </Guarded>
        ),
      },
      {
        path: "announcements",
        element: (
          <Guarded permission="announcement:read">
            <Announcements />
          </Guarded>
        ),
      },
      {
        path: "dictionaries",
        element: (
          <Guarded permission="dict:read">
            <Dictionaries />
          </Guarded>
        ),
      },
      {
        path: "task-queue",
        element: (
          <Guarded permission="system:settings">
            <TaskQueue />
          </Guarded>
        ),
      },
      {
        path: "api-keys",
        element: (
          <SuspenseWrapper>
            <ApiKeys />
          </SuspenseWrapper>
        ),
      },
      {
        path: "*",
        element: (
          <SuspenseWrapper>
            <NotFound />
          </SuspenseWrapper>
        ),
      },
    ],
  },
]);
