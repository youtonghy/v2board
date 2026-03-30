import { HeroUIProvider } from "@heroui/react";
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { AdminShell } from "./components/AdminShell";
import { resourcePageSpecs } from "./config/nav";
import { ResourceExplorer } from "./components/ResourceExplorer";
import { DashboardPage } from "./pages/DashboardPage";
import { TicketDetailPage } from "./pages/TicketDetailPage";
import { SessionRedirectPage } from "./pages/SessionRedirectPage";

function ResourceRoute({ path }: { path: string }) {
  const spec = resourcePageSpecs[path];
  return <ResourceExplorer spec={spec} />;
}

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
            <Route path="user" element={<ResourceRoute path="/new/user" />} />
            <Route path="invite-link" element={<ResourceRoute path="/new/invite-link" />} />
            <Route path="order" element={<ResourceRoute path="/new/order" />} />
            <Route path="plan" element={<ResourceRoute path="/new/plan" />} />
            <Route path="coupon" element={<ResourceRoute path="/new/coupon" />} />
            <Route path="giftcard" element={<ResourceRoute path="/new/giftcard" />} />
            <Route path="notice" element={<ResourceRoute path="/new/notice" />} />
            <Route path="ticket" element={<ResourceRoute path="/new/ticket" />} />
            <Route path="ticket/:ticketId" element={<TicketDetailPage />} />
            <Route path="knowledge" element={<ResourceRoute path="/new/knowledge" />} />
            <Route path="server/group" element={<ResourceRoute path="/new/server/group" />} />
            <Route path="server/manage" element={<ResourceRoute path="/new/server/manage" />} />
            <Route path="server/route" element={<ResourceRoute path="/new/server/route" />} />
            <Route path="queue" element={<ResourceRoute path="/new/queue" />} />
            <Route path="config/system" element={<ResourceRoute path="/new/config/system" />} />
            <Route path="config/payment" element={<ResourceRoute path="/new/config/payment" />} />
            <Route path="config/theme" element={<ResourceRoute path="/new/config/theme" />} />
          </Route>
          <Route path="*" element={<Navigate to="/new/dashboard" replace />} />
        </Routes>
      </HeroUIProvider>
    </HashRouter>
  );
}
