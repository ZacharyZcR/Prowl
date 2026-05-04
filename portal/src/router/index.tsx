import { createBrowserRouter, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import { useAuthStore } from "@/stores/auth";
import PortalLayout from "@/components/PortalLayout";

const Login = lazy(() => import("@/pages/Login"));
const Register = lazy(() => import("@/pages/Register"));
const Home = lazy(() => import("@/pages/Home"));
const CompetitionDetail = lazy(() => import("@/pages/CompetitionDetail"));
const ChallengeList = lazy(() => import("@/pages/ChallengeList"));
const Scoreboard = lazy(() => import("@/pages/Scoreboard"));
const TeamManagement = lazy(() => import("@/pages/TeamManagement"));
const AWDServices = lazy(() => import("@/pages/AWDServices"));
const AWDTimeline = lazy(() => import("@/pages/AWDTimeline"));
const RedBluePortal = lazy(() => import("@/pages/RedBluePortal"));
const Objectives = lazy(() => import("@/pages/Objectives"));
const Summary = lazy(() => import("@/pages/Summary"));
const JudgePanel = lazy(() => import("@/pages/JudgePanel"));
const Profile = lazy(() => import("@/pages/Profile"));

function AuthGuard({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function GuestGuard({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  if (token) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function Wrap({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<div style={{ padding: "2rem", textAlign: "center" }}>Loading...</div>}>{children}</Suspense>;
}

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <GuestGuard><Wrap><Login /></Wrap></GuestGuard>,
  },
  {
    path: "/register",
    element: <GuestGuard><Wrap><Register /></Wrap></GuestGuard>,
  },
  {
    path: "/",
    element: <AuthGuard><PortalLayout /></AuthGuard>,
    children: [
      { index: true, element: <Wrap><Home /></Wrap> },
      { path: "competitions/:id", element: <Wrap><CompetitionDetail /></Wrap> },
      { path: "competitions/:id/challenges", element: <Wrap><ChallengeList /></Wrap> },
      { path: "competitions/:id/scoreboard", element: <Wrap><Scoreboard /></Wrap> },
      { path: "competitions/:id/awd", element: <Wrap><AWDServices /></Wrap> },
      { path: "competitions/:id/awd/timeline", element: <Wrap><AWDTimeline /></Wrap> },
      { path: "competitions/:id/summary", element: <Wrap><Summary /></Wrap> },
      { path: "competitions/:id/redblue", element: <Wrap><RedBluePortal /></Wrap> },
      { path: "competitions/:id/judge", element: <Wrap><JudgePanel /></Wrap> },
      { path: "competitions/:id/objectives", element: <Wrap><Objectives /></Wrap> },
      { path: "team", element: <Wrap><TeamManagement /></Wrap> },
      { path: "profile", element: <Wrap><Profile /></Wrap> },
    ],
  },
]);
