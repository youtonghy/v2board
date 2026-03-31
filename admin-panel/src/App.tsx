import { HeroUIProvider } from "@heroui/react";
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { AdminShell } from "./components/AdminShell";
import { DashboardPage } from "./pages/DashboardPage";
import { TicketDetailPage } from "./pages/TicketDetailPage";
import { SessionRedirectPage } from "./pages/SessionRedirectPage";
import { SystemConfigPage } from "./pages/config/SystemConfigPage";
import { PaymentConfigPage } from "./pages/config/PaymentConfigPage";
import { ThemeConfigPage } from "./pages/config/ThemeConfigPage";
import { NoticePage } from "./pages/NoticePage";
import { CouponPage } from "./pages/CouponPage";
import { GiftCardPage } from "./pages/GiftCardPage";
import { PlanPage } from "./pages/PlanPage";
import { UserPage } from "./pages/UserPage";
import { InviteLinkPage } from "./pages/InviteLinkPage";
import { OrderPage } from "./pages/OrderPage";
import { TicketPage } from "./pages/TicketPage";
import { KnowledgePage } from "./pages/KnowledgePage";
import { ServerGroupPage } from "./pages/ServerGroupPage";
import { ServerManagePage } from "./pages/ServerManagePage";
import { ServerRoutePage } from "./pages/ServerRoutePage";
import { QueuePage } from "./pages/QueuePage";

export default function App() {
  return (
    <HashRouter>
      <HeroUIProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/new/dashboard" replace />} />
          <Route path="/new/login" element={<SessionRedirectPage />} />
          <Route path="/new" element={<AdminShell />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="user" element={<UserPage />} />
            <Route path="invite-link" element={<InviteLinkPage />} />
            <Route path="order" element={<OrderPage />} />
            <Route path="plan" element={<PlanPage />} />
            <Route path="coupon" element={<CouponPage />} />
            <Route path="giftcard" element={<GiftCardPage />} />
            <Route path="notice" element={<NoticePage />} />
            <Route path="ticket" element={<TicketPage />} />
            <Route path="ticket/:ticketId" element={<TicketDetailPage />} />
            <Route path="knowledge" element={<KnowledgePage />} />
            <Route path="server/group" element={<ServerGroupPage />} />
            <Route path="server/manage" element={<ServerManagePage />} />
            <Route path="server/route" element={<ServerRoutePage />} />
            <Route path="queue" element={<QueuePage />} />
            <Route path="config/system" element={<SystemConfigPage />} />
            <Route path="config/payment" element={<PaymentConfigPage />} />
            <Route path="config/theme" element={<ThemeConfigPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/new/dashboard" replace />} />
        </Routes>
      </HeroUIProvider>
    </HashRouter>
  );
}
