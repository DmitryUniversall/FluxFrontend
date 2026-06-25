import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { Toaster } from "@/main/common/ui/toast";
import { GuideLayer } from "@/main/features/guide/ui/GuideLayer";
import { TourConfirm } from "@/main/features/guide/ui/TourConfirm";
import { registerInvitationActions } from "@/main/features/invitations/ui/register-actions";
import "./index.css";

// Hook invitation accept/decline buttons into the notification action registry.
registerInvitationActions();

createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <App />
        <Toaster />
        <GuideLayer />
        <TourConfirm />
    </React.StrictMode>,
);
