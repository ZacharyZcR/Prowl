import { createBrowserRouter, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import { Skeleton } from "@yza/ui";
import { Layout } from "@/components/Layout";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useAuthStore } from "@/stores/auth";
import { usePermission } from "@/hooks/usePermission";

const Login = lazy(() => import("@/pages/Login"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Settings = lazy(() => import("@/pages/Settings"));
const Users = lazy(() => import("@/pages/Users"));
const Roles = lazy(() => import("@/pages/Roles"));
const Projects = lazy(() => import("@/pages/Projects"));
const ProjectDetail = lazy(() => import("@/pages/ProjectDetail"));
const Competitions = lazy(() => import("@/pages/Competitions"));
const CompetitionManage = lazy(() => import("@/pages/CompetitionManage"));
const Activities = lazy(() => import("@/pages/Activities"));
const LoginLogs = lazy(() => import("@/pages/LoginLogs"));
const ErrorLogs = lazy(() => import("@/pages/ErrorLogs"));
const SystemSettings = lazy(() => import("@/pages/SystemSettings"));
const Webhooks = lazy(() => import("@/pages/Webhooks"));
const HealthMonitor = lazy(() => import("@/pages/HealthMonitor"));
const SystemLogs = lazy(() => import("@/pages/SystemLogs"));
const Permissions = lazy(() => import("@/pages/Permissions"));
const NotFound = lazy(() => import("@/pages/NotFound"));

function AuthGuard({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function GuestGuard({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function PermissionGuard({ permission, children }: { permission: string; children: React.ReactNode }) {
  const { can } = usePermission();
  if (!can(permission)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function SuspenseWrapper({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<Skeleton count={3} height={40} />}>
      <ErrorBoundary>{children}</ErrorBoundary>
    </Suspense>
  );
}

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
          <SuspenseWrapper>
            <PermissionGuard permission="user:read">
              <Users />
            </PermissionGuard>
          </SuspenseWrapper>
        ),
      },
      {
        path: "roles",
        element: (
          <SuspenseWrapper>
            <PermissionGuard permission="role:read">
              <Roles />
            </PermissionGuard>
          </SuspenseWrapper>
        ),
      },
      {
        path: "projects",
        element: (
          <SuspenseWrapper>
            <PermissionGuard permission="project:read">
              <Projects />
            </PermissionGuard>
          </SuspenseWrapper>
        ),
      },
      {
        path: "projects/:id",
        element: (
          <SuspenseWrapper>
            <PermissionGuard permission="project:read">
              <ProjectDetail />
            </PermissionGuard>
          </SuspenseWrapper>
        ),
      },
      {
        path: "competitions",
        element: (
          <SuspenseWrapper>
            <PermissionGuard permission="competition:read">
              <Competitions />
            </PermissionGuard>
          </SuspenseWrapper>
        ),
      },
      {
        path: "competitions/:id",
        element: (
          <SuspenseWrapper>
            <PermissionGuard permission="competition:read">
              <CompetitionManage />
            </PermissionGuard>
          </SuspenseWrapper>
        ),
      },
      {
        path: "activities",
        element: (
          <SuspenseWrapper>
            <PermissionGuard permission="activity:read">
              <Activities />
            </PermissionGuard>
          </SuspenseWrapper>
        ),
      },
      {
        path: "login-logs",
        element: (
          <SuspenseWrapper>
            <PermissionGuard permission="activity:read">
              <LoginLogs />
            </PermissionGuard>
          </SuspenseWrapper>
        ),
      },
      {
        path: "error-logs",
        element: (
          <SuspenseWrapper>
            <PermissionGuard permission="error_log:read">
              <ErrorLogs />
            </PermissionGuard>
          </SuspenseWrapper>
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
        path: "webhooks",
        element: (
          <SuspenseWrapper>
            <PermissionGuard permission="system:settings">
              <Webhooks />
            </PermissionGuard>
          </SuspenseWrapper>
        ),
      },
      {
        path: "health-monitor",
        element: (
          <SuspenseWrapper>
            <PermissionGuard permission="system:settings">
              <HealthMonitor />
            </PermissionGuard>
          </SuspenseWrapper>
        ),
      },
      {
        path: "system-logs",
        element: (
          <SuspenseWrapper>
            <PermissionGuard permission="system:settings">
              <SystemLogs />
            </PermissionGuard>
          </SuspenseWrapper>
        ),
      },
      {
        path: "permissions",
        element: (
          <SuspenseWrapper>
            <PermissionGuard permission="role:read">
              <Permissions />
            </PermissionGuard>
          </SuspenseWrapper>
        ),
      },
      {
        path: "system-settings",
        element: (
          <SuspenseWrapper>
            <PermissionGuard permission="system:settings">
              <SystemSettings />
            </PermissionGuard>
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
  {
    path: "*",
    element: (
      <SuspenseWrapper>
        <NotFound />
      </SuspenseWrapper>
    ),
  },
]);
