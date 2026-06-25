import { motion } from "framer-motion";
import { Lock, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { serverConfig } from "@/main/common/api/server-config";
import { isTauri } from "@/main/common/platform";
import { Button } from "@/main/common/ui/Button";
import { Input, Label } from "@/main/common/ui/Field";
import { useInstanceMeta } from "@/main/features/admin/ui/useInstanceMeta";
import { useHelp } from "@/main/features/guide/ui/useHelp";
import { useAuth } from "./useAuth";

interface AuthPageProps {
    mode: "login" | "register";
}

export function AuthPage({ mode }: AuthPageProps) {
    const isLogin = mode === "login";
    const navigate = useNavigate();
    const { login, register, submitting, error } = useAuth();
    const meta = useInstanceMeta((s) => s.meta);
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    // Desktop only: which Flux server this client talks to. Persisted as you type
    // so the subsequent sign-in/register call already uses the new base URL.
    const [server, setServer] = useState(() => serverConfig.baseUrl());

    // Reflect the instance's registration switch (the server enforces it too).
    useEffect(() => {
        void useInstanceMeta.getState().load();
    }, []);
    const registrationClosed = !isLogin && meta?.registration_enabled === false;

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        const action = isLogin ? login : register;
        const ok = await action({ username: username.trim(), password });
        if (ok) {
            // New accounts land in the app with an offer to take the guided tour.
            if (!isLogin) useHelp.getState().offerOnboarding();
            navigate("/");
        }
    };

    return (
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-bg p-4">
            {/* restrained ambient glow */}
            <div
                className="pointer-events-none absolute left-1/2 top-1/3 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-25 blur-[120px]"
                style={{ background: "radial-gradient(circle, rgb(var(--accent)) 0%, transparent 70%)" }}
            />
            <motion.div
                className="relative w-full max-w-[380px]"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
                <div className="mb-7 flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-white shadow-lg shadow-accent/30">
                        <Zap size={18} fill="currentColor" />
                    </div>
                    <span className="text-lg font-bold tracking-tight">Flux</span>
                </div>

                <h1 className="text-xl font-semibold">{isLogin ? "Welcome back" : "Create your workspace"}</h1>
                <p className="mt-1 text-sm text-muted">
                    {isLogin ? "Sign in to your API workspace." : "Spin up a personal space for your APIs."}
                </p>

                {registrationClosed && (
                    <div className="mt-6 flex items-start gap-2 rounded-lg border border-border bg-elevated px-3 py-2.5 text-[13px] text-muted">
                        <Lock size={15} className="mt-0.5 shrink-0 text-subtle" />
                        <span>Registration is currently disabled on this instance. Ask an admin for an account.</span>
                    </div>
                )}

                <form onSubmit={submit} className="mt-6 space-y-4">
                    {isTauri() && (
                        <div>
                            <Label>Server</Label>
                            <Input
                                value={server}
                                onChange={(e) => {
                                    setServer(e.target.value);
                                    serverConfig.set(e.target.value);
                                }}
                                placeholder={serverConfig.defaultUrl()}
                                spellCheck={false}
                                autoComplete="off"
                            />
                            <p className="mt-1.5 text-[12px] text-subtle">URL of your Flux backend.</p>
                        </div>
                    )}
                    <div>
                        <Label>Username</Label>
                        <Input
                            autoFocus
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="jane.dev"
                            autoComplete="username"
                        />
                    </div>
                    <div>
                        <Label>Password</Label>
                        <Input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            autoComplete={isLogin ? "current-password" : "new-password"}
                        />
                    </div>

                    {error && (
                        <motion.p
                            className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[13px] text-red-300"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                        >
                            {error}
                        </motion.p>
                    )}

                    <Button
                        type="submit"
                        variant="primary"
                        className="w-full"
                        disabled={submitting || registrationClosed || !username.trim() || password.length < 6}
                    >
                        {submitting ? "Please wait…" : isLogin ? "Sign in" : "Create account"}
                    </Button>
                </form>

                <p className="mt-5 text-center text-[13px] text-muted">
                    {isLogin ? "No account yet? " : "Already have an account? "}
                    <Link to={isLogin ? "/register" : "/login"} className="font-medium text-accent hover:underline">
                        {isLogin ? "Create one" : "Sign in"}
                    </Link>
                </p>
            </motion.div>
        </div>
    );
}
