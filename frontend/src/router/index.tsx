import { createBrowserRouter, Navigate } from "react-router-dom";
import { lazy, Suspense, type ReactNode } from "react";
import { Skeleton } from "@yza/ui";
import { Layout } from "@/components/Layout";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import {
  TablePageSkeleton,
  TableWithKPISkeleton,
  SettingsPageSkeleton,
  InfoPageSkeleton,
  DetailPageSkeleton,
} from "@/components/PageSkeletons";
import { useAuthStore } from "@/stores/auth";
import { usePermission } from "@/hooks/usePermission";
import { useTransitionStore } from "@/stores/transition";

const Login = lazy(() => import("@/pages/Login"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Settings = lazy(() => import("@/pages/Settings"));
const Users = lazy(() => import("@/pages/Users"));
const Roles = lazy(() => import("@/pages/Roles"));
const Projects = lazy(() => import("@/pages/Projects"));
const ProjectDetail = lazy(() => import("@/pages/ProjectDetail"));
const Activities = lazy(() => import("@/pages/Activities"));
const LoginLogs = lazy(() => import("@/pages/LoginLogs"));
const ErrorLogs = lazy(() => import("@/pages/ErrorLogs"));
const SystemSettings = lazy(() => import("@/pages/SystemSettings"));
const Webhooks = lazy(() => import("@/pages/Webhooks"));
const HealthMonitor = lazy(() => import("@/pages/HealthMonitor"));
const SystemLogs = lazy(() => import("@/pages/SystemLogs"));
const Permissions = lazy(() => import("@/pages/Permissions"));
const Files = lazy(() => import("@/pages/Files"));
const OAuthCallback = lazy(() => import("@/pages/OAuthCallback"));
const CronJobs = lazy(() => import("@/pages/CronJobs"));
const Announcements = lazy(() => import("@/pages/Announcements"));
const Dictionaries = lazy(() => import("@/pages/Dictionaries"));
const TaskQueue = lazy(() => import("@/pages/TaskQueue"));
const ApiKeys = lazy(() => import("@/pages/ApiKeys"));

const CTFChallenges = lazy(() => import("@/pages/CTFChallenges"));
const CTFCompetitions = lazy(() => import("@/pages/CTFCompetitions"));
const AWDChallenges = lazy(() => import("@/pages/AWDChallenges"));
const AWDCompetitions = lazy(() => import("@/pages/AWDCompetitions"));
const Scenarios = lazy(() => import("@/pages/Scenarios"));
const RedBlueCompetitions = lazy(() => import("@/pages/RedBlueCompetitions"));
const CompetitionChallenges = lazy(() => import("@/pages/CompetitionChallenges"));
const AWDControl = lazy(() => import("@/pages/AWDControl"));
const RedBlueControl = lazy(() => import("@/pages/RedBlueControl"));
const DockerImages = lazy(() => import("@/pages/DockerImages"));
const ContainerMonitor = lazy(() => import("@/pages/ContainerMonitor"));
const Teams = lazy(() => import("@/pages/Teams"));

const NotFound = lazy(() => import("@/pages/NotFound"));

function AuthGuard({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function GuestGuard({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  const phase = useTransitionStore((s) => s.phase);
  // Allow login page to stay mounted during exit animation
  if (token && phase === "idle") return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function PermissionGuard({ permission, children }: { permission: string; children: React.ReactNode }) {
  const { can } = usePermission();
  if (!can(permission)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function SuspenseWrapper({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <Suspense fallback={fallback ?? <TablePageSkeleton />}>
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
          <SuspenseWrapper fallback={<InfoPageSkeleton />}>
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
          <SuspenseWrapper fallback={<DetailPageSkeleton />}>
            <PermissionGuard permission="project:read">
              <ProjectDetail />
            </PermissionGuard>
          </SuspenseWrapper>
        ),
      },
      {
        path: "ctf/challenges",
        element: (
          <SuspenseWrapper>
            <PermissionGuard permission="challenge:read">
              <CTFChallenges />
            </PermissionGuard>
          </SuspenseWrapper>
        ),
      },
      {
        path: "ctf",
        element: (
          <SuspenseWrapper>
            <PermissionGuard permission="competition:read">
              <CTFCompetitions />
            </PermissionGuard>
          </SuspenseWrapper>
        ),
      },
      {
        path: "awd/challenges",
        element: (
          <SuspenseWrapper>
            <PermissionGuard permission="challenge:read">
              <AWDChallenges />
            </PermissionGuard>
          </SuspenseWrapper>
        ),
      },
      {
        path: "awd",
        element: (
          <SuspenseWrapper>
            <PermissionGuard permission="competition:read">
              <AWDCompetitions />
            </PermissionGuard>
          </SuspenseWrapper>
        ),
      },
      {
        path: "competitions/:id/challenges",
        element: (
          <SuspenseWrapper>
            <PermissionGuard permission="competition:update">
              <CompetitionChallenges />
            </PermissionGuard>
          </SuspenseWrapper>
        ),
      },
      {
        path: "competitions/:id/awd",
        element: (
          <SuspenseWrapper>
            <PermissionGuard permission="competition:update">
              <AWDControl />
            </PermissionGuard>
          </SuspenseWrapper>
        ),
      },
      {
        path: "competitions/:id/redblue",
        element: (
          <SuspenseWrapper>
            <PermissionGuard permission="competition:read">
              <RedBlueControl />
            </PermissionGuard>
          </SuspenseWrapper>
        ),
      },
      {
        path: "redblue/scenarios",
        element: (
          <SuspenseWrapper>
            <PermissionGuard permission="competition:read">
              <Scenarios />
            </PermissionGuard>
          </SuspenseWrapper>
        ),
      },
      {
        path: "redblue",
        element: (
          <SuspenseWrapper>
            <PermissionGuard permission="competition:read">
              <RedBlueCompetitions />
            </PermissionGuard>
          </SuspenseWrapper>
        ),
      },
      {
        path: "teams",
        element: (
          <SuspenseWrapper>
            <PermissionGuard permission="team:read">
              <Teams />
            </PermissionGuard>
          </SuspenseWrapper>
        ),
      },
      {
        path: "docker/images",
        element: (
          <SuspenseWrapper>
            <PermissionGuard permission="container:read">
              <DockerImages />
            </PermissionGuard>
          </SuspenseWrapper>
        ),
      },
      {
        path: "docker/containers",
        element: (
          <SuspenseWrapper>
            <PermissionGuard permission="container:read">
              <ContainerMonitor />
            </PermissionGuard>
          </SuspenseWrapper>
        ),
      },
      {
        path: "activities",
        element: (
          <SuspenseWrapper fallback={<TableWithKPISkeleton />}>
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
          <SuspenseWrapper fallback={<TableWithKPISkeleton />}>
            <PermissionGuard permission="error_log:read">
              <ErrorLogs />
            </PermissionGuard>
          </SuspenseWrapper>
        ),
      },
      {
        path: "settings",
        element: (
          <SuspenseWrapper fallback={<SettingsPageSkeleton />}>
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
          <SuspenseWrapper fallback={<InfoPageSkeleton />}>
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
        path: "files",
        element: (
          <SuspenseWrapper>
            <PermissionGuard permission="upload:create">
              <Files />
            </PermissionGuard>
          </SuspenseWrapper>
        ),
      },
      {
        path: "cron-jobs",
        element: (
          <SuspenseWrapper>
            <PermissionGuard permission="cron:read">
              <CronJobs />
            </PermissionGuard>
          </SuspenseWrapper>
        ),
      },
      {
        path: "announcements",
        element: (
          <SuspenseWrapper>
            <PermissionGuard permission="announcement:read">
              <Announcements />
            </PermissionGuard>
          </SuspenseWrapper>
        ),
      },
      {
        path: "dictionaries",
        element: (
          <SuspenseWrapper>
            <PermissionGuard permission="dict:read">
              <Dictionaries />
            </PermissionGuard>
          </SuspenseWrapper>
        ),
      },
      {
        path: "task-queue",
        element: (
          <SuspenseWrapper>
            <PermissionGuard permission="system:settings">
              <TaskQueue />
            </PermissionGuard>
          </SuspenseWrapper>
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
        path: "system-settings",
        element: (
          <SuspenseWrapper fallback={<SettingsPageSkeleton />}>
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
