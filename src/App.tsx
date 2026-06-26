import { useEffect } from "react";
import { BrowserRouter, HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { isTauri } from "@/main/common/platform";
import { Spinner } from "@/main/common/ui/feedback";
import { AuthPage } from "@/main/features/auth/ui/AuthPage";
import { useAuth } from "@/main/features/auth/ui/useAuth";
import { LandingPage } from "@/main/features/landing/ui/LandingPage";
import { AppShell } from "@/main/features/shell/ui/AppShell";

// The desktop webview serves the bundled assets over a custom protocol with no
// SPA fallback, so history-based URLs can break on reload - hash routing is the
// safe equivalent there. The web build keeps clean URLs.
const Router = isTauri() ? HashRouter : BrowserRouter;

export default function App() {
    const status = useAuth((s) => s.status);
    const init = useAuth((s) => s.init);

    useEffect(() => {
        void init();
    }, [init]);

    if (status === "loading") {
        return (
            <div className="flex h-screen items-center justify-center bg-bg">
                <Spinner className="h-6 w-6 text-subtle" />
            </div>
        );
    }

    const authed = status === "authed";

    return (
        <Router>
            <Routes>
                <Route path="/login" element={authed ? <Navigate to="/" replace /> : <AuthPage mode="login" />} />
                <Route path="/register" element={authed ? <Navigate to="/" replace /> : <AuthPage mode="register" />} />
                {/* Logged-out web visitors land on the public landing page; the desktop
                    build has no landing and goes straight to sign-in. */}
                <Route
                    path="/"
                    element={authed ? <AppShell /> : isTauri() ? <Navigate to="/login" replace /> : <LandingPage />}
                />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Router>
    );
}
