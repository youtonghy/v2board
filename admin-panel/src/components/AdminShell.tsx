import { Avatar, Button, ScrollShadow, Tooltip } from "@heroui/react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { adminBootstrap } from "../lib/bootstrap";
import { gatewayRequest } from "../lib/api";
import { navGroups } from "../config/nav";
import {
  BellIcon,
  ChevronDownIcon,
  CloseIcon,
  CollapseIcon,
  DownloadIcon,
  ExpandIcon,
  InviteIcon,
  MenuIcon,
  RefreshIcon,
  SearchIcon
} from "./AdminIcons";

function Sidebar({
  mobileOpen,
  collapsed,
  onClose,
  onToggleCollapse
}: {
  mobileOpen: boolean;
  collapsed: boolean;
  onClose: () => void;
  onToggleCollapse: () => void;
}) {
  return (
    <aside
      className={[
        "admin-sidebar fixed inset-y-0 left-0 z-50 flex flex-col border-r border-white/60 text-[#0f1720] transition-all duration-300 md:sticky md:translate-x-0",
        collapsed ? "w-[96px]" : "w-[282px]",
        mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      ].join(" ")}
    >
      <div className="flex items-center justify-between px-4 py-6">
        <div className={["flex items-center gap-3 transition-all", collapsed ? "justify-center" : ""].join(" ")}>
          <div className="admin-orb h-11 w-11 rounded-full" />
          {!collapsed ? (
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Fantastic</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{adminBootstrap.title}</p>
            </div>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <Button isIconOnly variant="light" className="text-slate-500 md:hidden" onPress={onClose}>
            <CloseIcon size={18} />
          </Button>
          <Button
            isIconOnly
            variant="light"
            className="hidden text-slate-500 md:inline-flex"
            onPress={onToggleCollapse}
          >
            {collapsed ? <ExpandIcon size={18} /> : <CollapseIcon size={18} />}
          </Button>
        </div>
      </div>

      <ScrollShadow className="flex-1 px-3 pb-6">
        <div className="space-y-7">
          {navGroups.map(group => (
            <div key={group.label}>
              {!collapsed ? (
                <p className="px-3 text-[11px] uppercase tracking-[0.24em] text-slate-400">{group.label}</p>
              ) : null}
              <div className={collapsed ? "space-y-2" : "mt-3 space-y-2"}>
                {group.items.map(item => {
                  const Icon = item.icon;
                  const link = (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      className={({ isActive }) =>
                        [
                          "group flex items-center rounded-[1.35rem] transition-all duration-200",
                          collapsed ? "justify-center px-0 py-3" : "gap-3 px-3 py-3.5",
                          isActive
                            ? "bg-white shadow-[0_16px_40px_rgba(15,23,32,0.08)]"
                            : "hover:bg-white/70"
                        ].join(" ")
                      }
                      onClick={onClose}
                    >
                      {({ isActive }) => (
                        <>
                          <span
                            className={[
                              "flex items-center justify-center rounded-2xl transition-all",
                              collapsed ? "h-11 w-11" : "h-10 w-10",
                              isActive
                                ? "bg-[#1388ef] text-white"
                                : "bg-white/70 text-slate-500 group-hover:bg-white group-hover:text-slate-700"
                            ].join(" ")}
                          >
                            <Icon size={collapsed ? 20 : 18} />
                          </span>
                          {!collapsed ? (
                            <span className="min-w-0 flex-1">
                              <span className="block text-[15px] font-semibold text-slate-900">{item.label}</span>
                              <span className="mt-1 block text-xs leading-5 text-slate-500">{item.description}</span>
                            </span>
                          ) : null}
                        </>
                      )}
                    </NavLink>
                  );

                  return collapsed ? (
                    <Tooltip key={item.path} content={item.label} placement="right">
                      {link}
                    </Tooltip>
                  ) : (
                    link
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </ScrollShadow>

      <div className="space-y-3 border-t border-white/70 px-3 py-4">
        <div className={["rounded-[1.25rem] bg-white/80 p-3", collapsed ? "flex justify-center" : ""].join(" ")}>
          {collapsed ? (
            <Avatar className="bg-[#1388ef] text-white" name={adminBootstrap.title.slice(0, 1).toUpperCase()} size="sm" />
          ) : (
            <div className="flex items-center gap-3">
              <Avatar className="bg-[#1388ef] text-white" name={adminBootstrap.title.slice(0, 1).toUpperCase()} size="sm" />
              <div>
                <p className="text-sm font-semibold text-slate-900">Help & Information</p>
                <p className="text-xs text-slate-500">System guidance and support</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

export function AdminShell() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [userLabel, setUserLabel] = useState("Administrator");

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("admin-v2-sidebar-collapsed");
      setCollapsed(raw === "1");
    } catch (error) {
      setCollapsed(false);
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem("admin-v2-sidebar-collapsed", collapsed ? "1" : "0");
    } catch (error) {}
  }, [collapsed]);

  useEffect(() => {
    void gatewayRequest<{ email?: string }>("user/info").then(response => {
      if (response.code === 200 && response.data?.email) {
        setUserLabel(response.data.email);
      }
    });
  }, []);

  const pageLabel = useMemo(() => {
    const current = navGroups
      .flatMap(group => group.items)
      .find(item => item.path === location.pathname);
    return current?.label || "Dashboard";
  }, [location.pathname]);

  return (
    <div className="admin-app-shell min-h-screen text-ink">
      <div
        className={[
          "fixed inset-0 z-40 bg-slate-950/18 backdrop-blur-[2px] transition md:hidden",
          mobileOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        ].join(" ")}
        onClick={() => setMobileOpen(false)}
      />

      <div className="flex min-h-screen">
        <Sidebar
          mobileOpen={mobileOpen}
          collapsed={collapsed}
          onClose={() => setMobileOpen(false)}
          onToggleCollapse={() => setCollapsed(value => !value)}
        />

        <main className="flex min-h-screen min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 px-4 pb-4 pt-5 md:px-8">
            <div className="admin-topbar flex items-center justify-between gap-4 rounded-[2rem] px-4 py-3 md:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <Button isIconOnly variant="light" className="text-slate-600 md:hidden" onPress={() => setMobileOpen(true)}>
                  <MenuIcon size={18} />
                </Button>
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Admin Workspace</p>
                  <p className="truncate text-lg font-semibold text-slate-900">{pageLabel}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 md:gap-3">
                <Button isIconOnly radius="full" variant="light" className="bg-white text-slate-700 shadow-sm">
                  <SearchIcon size={18} />
                </Button>
                <Button isIconOnly radius="full" variant="light" className="bg-white text-slate-700 shadow-sm">
                  <BellIcon size={18} />
                </Button>
                <Button color="primary" radius="full" className="hidden md:inline-flex" startContent={<InviteIcon size={18} />}>
                  Invite
                </Button>
                <div className="hidden items-center gap-3 rounded-full bg-white px-3 py-2 shadow-sm lg:flex">
                  <Avatar className="bg-[#1388ef] text-white" name={userLabel.slice(0, 1).toUpperCase()} size="sm" />
                  <div className="pr-1">
                    <p className="text-sm font-semibold text-slate-900">{userLabel}</p>
                    <p className="text-xs text-slate-500">Admin</p>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <div className="flex-1 px-4 pb-6 md:px-8 md:pb-8">
            <div className="mx-auto flex min-h-full w-full max-w-[1720px] flex-col gap-6">
              <div className="admin-toolbar flex flex-wrap items-center justify-between gap-4 rounded-[2rem] px-4 py-3 md:px-6">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Current Context</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{pageLabel} workspace</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Button isIconOnly radius="full" variant="light" className="bg-white text-slate-600 shadow-sm">
                    <RefreshIcon size={18} />
                  </Button>
                  <Button
                    variant="light"
                    radius="full"
                    className="bg-white px-4 text-slate-800 shadow-sm"
                    endContent={<ChevronDownIcon size={16} />}
                  >
                    Monthly
                  </Button>
                  <Button color="primary" radius="full" startContent={<DownloadIcon size={18} />}>
                    Download
                  </Button>
                </div>
              </div>

              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
