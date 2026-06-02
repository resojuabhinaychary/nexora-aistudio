import { createFileRoute, Outlet, Navigate, useLocation } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated")({
  component: AuthGate,
});

function AuthGate() {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  const isGuest = typeof window !== "undefined" && window.localStorage.getItem("nexora_guest") === "1";
  if (!isAuthenticated && !isGuest) {
    return <Navigate to="/login" search={{ redirect: location.pathname }} replace />;
  }
  return <Outlet />;
}