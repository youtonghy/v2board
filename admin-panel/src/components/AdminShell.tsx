import {
  ArrowLeftToLine,
  ArrowRightToLine,
  Bars,
  Bell,
  Magnifier,
  PersonPlus
} from "@gravity-ui/icons";
import {
  Accordion,
  Avatar,
  Badge,
  Breadcrumbs,
  Button,
  Drawer,
  Dropdown,
  Label,
  Tooltip
} from "@heroui/react";
import { useEffect, useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { navGroups } from "../config/nav";
import { adminBootstrap } from "../lib/bootstrap";
import { gatewayRequest } from "../lib/api";

function NavigationList({
  collapsed,
  currentPath,
  onNavigate
}: {
  collapsed: boolean;
  currentPath: string;
  onNavigate: (path: string) => void;
}) {
  if (collapsed) {
    return (
      <div className="space-y-2 px-2">
        {navGroups.flatMap(group =>
          group.items.map(item => {
            const Icon = item.icon;
            const selected = item.path === currentPath;
            return (
              <Button
                key={item.path}
                isIconOnly
                variant="ghost"
                aria-label={item.label}
                onPress={() => onNavigate(item.path)}
                className={[
                  "h-auto min-h-0 w-full rounded-[1.25rem] px-2 py-2",
                  selected
                    ? "bg-white shadow-[0_16px_40px_rgba(15,23,32,0.08)]"
                    : "hover:bg-white/70"
                ].join(" ")}
              >
                <Tooltip>
                  <Tooltip.Trigger>
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/80 text-slate-600">
                      <Icon width={18} height={18} aria-hidden="true" />
                    </span>
                  </Tooltip.Trigger>
                  <Tooltip.Content placement="right">{item.label}</Tooltip.Content>
                </Tooltip>
              </Button>
            );
          })
        )}
      </div>
    );
  }

  return (
    <Accordion
      hideSeparator
      defaultExpandedKeys={navGroups.map(group => group.label)}
      className="px-1"
    >
      {navGroups.map(group => (
        <Accordion.Item key={group.label} id={group.label} className="px-0">
          <Accordion.Heading className="px-3 py-2">
            <Accordion.Trigger className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-[0.24em] text-slate-400">{group.label}</span>
              <Accordion.Indicator />
            </Accordion.Trigger>
          </Accordion.Heading>
          <Accordion.Panel>
            <Accordion.Body className="px-0 pb-0 pt-1">
              <div className="space-y-1.5">
                {group.items.map(item => {
                  const Icon = item.icon;
                  const selected = item.path === currentPath;
                  return (
                    <Button
                      key={item.path}
                      variant="ghost"
                      onPress={() => onNavigate(item.path)}
                      className={[
                        "mb-1.5 h-auto w-full justify-start rounded-[1.25rem] px-2 py-1 text-left",
                        selected
                          ? "bg-white shadow-[0_16px_40px_rgba(15,23,32,0.08)]"
                          : "hover:bg-white/70"
                      ].join(" ")}
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/80 text-slate-600">
                        <Icon width={18} height={18} aria-hidden="true" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[14px] font-semibold text-slate-900">{item.label}</span>
                        <span className="block text-xs text-slate-400">{item.description}</span>
                      </span>
                    </Button>
                  );
                })}
              </div>
            </Accordion.Body>
          </Accordion.Panel>
        </Accordion.Item>
      ))}
    </Accordion>
  );
}

function SidebarContent({
  collapsed,
  currentPath,
  userLabel,
  onNavigate,
  onToggleCollapse,
  showDesktopToggle,
  headerAction
}: {
  collapsed: boolean;
  currentPath: string;
  userLabel: string;
  onNavigate: (path: string) => void;
  onToggleCollapse?: () => void;
  showDesktopToggle?: boolean;
  headerAction?: React.ReactNode;
}) {
  return (
    <>
      <div className="relative z-10 flex items-center justify-between px-4 py-6">
        <Button
          variant="ghost"
          className={[
            "h-auto min-h-0 justify-start rounded-[1.25rem] px-2 py-2 text-left text-slate-900",
            collapsed ? "w-auto min-w-0 justify-center" : "w-full max-w-[188px]"
          ].join(" ")}
          onPress={() => onNavigate("/new/dashboard")}
        >
          <div className={["flex items-center gap-3 transition-all", collapsed ? "justify-center" : ""].join(" ")}>
            <div className="admin-orb h-11 w-11 rounded-full shrink-0" />
            {!collapsed ? (
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Fantastic</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{adminBootstrap.title}</p>
              </div>
            ) : null}
          </div>
        </Button>
        {headerAction ? (
          headerAction
        ) : showDesktopToggle ? (
          <Button
            isIconOnly
            variant="ghost"
            className="hidden shrink-0 text-slate-500 lg:inline-flex"
            onPress={onToggleCollapse}
          >
            {collapsed ? (
              <ArrowRightToLine width={18} height={18} aria-hidden="true" />
            ) : (
              <ArrowLeftToLine width={18} height={18} aria-hidden="true" />
            )}
          </Button>
        ) : null}
      </div>

      <div className="flex-1 overflow-y-auto pb-6">
        <NavigationList collapsed={collapsed} currentPath={currentPath} onNavigate={onNavigate} />
      </div>

      <div className="border-t border-white/70 px-3 py-4">
        <div
          className={[
            "rounded-[1.25rem] border border-white/70 bg-white/85 p-3",
            collapsed ? "flex justify-center" : ""
          ].join(" ")}
        >
          {collapsed ? (
            <Tooltip>
              <Tooltip.Trigger>
                <Avatar className="bg-[#1388ef] text-white" size="sm">
                  <Avatar.Fallback>{adminBootstrap.title.slice(0, 1).toUpperCase()}</Avatar.Fallback>
                </Avatar>
              </Tooltip.Trigger>
              <Tooltip.Content placement="right">System guidance and support</Tooltip.Content>
            </Tooltip>
          ) : (
            <div className="flex items-center gap-3">
              <Avatar className="bg-[#1388ef] text-white" size="sm">
                <Avatar.Fallback>{userLabel.slice(0, 1).toUpperCase()}</Avatar.Fallback>
              </Avatar>
              <div>
                <p className="text-sm font-semibold text-slate-900">Help & Information</p>
                <p className="text-xs text-slate-500">System guidance and support</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export function AdminShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [userLabel, setUserLabel] = useState("Administrator");
  const [pendingTicketCount, setPendingTicketCount] = useState(0);

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

  useEffect(() => {
    void gatewayRequest<{ ticket_pending_total?: number }>("stat/getOverride").then(response => {
      if (response.code === 200 && response.data) {
        setPendingTicketCount(Math.max(0, Number(response.data.ticket_pending_total || 0)));
      }
    });
  }, []);

  const breadcrumbItems = useMemo(() => {
    const entries = navGroups.flatMap(group => {
      const groupPath = group.items[0]?.path || "/new/dashboard";
      return group.items.map(item => ({
        groupLabel: group.label,
        groupPath,
        item
      }));
    });

    const current = entries
      .filter(entry => location.pathname === entry.item.path || location.pathname.startsWith(`${entry.item.path}/`))
      .sort((left, right) => right.item.path.length - left.item.path.length)[0];

    const currentGroupLabel = current?.groupLabel || "Overview";
    const currentGroupPath = current?.groupPath || "/new/dashboard";
    const currentPageLabel = current?.item.label || "Dashboard";

    return [
      { key: "admin", label: "admin", path: "/new/dashboard" },
      { key: "group", label: currentGroupLabel.toLowerCase(), path: currentGroupPath },
      { key: "page", label: currentPageLabel }
    ];
  }, [location.pathname]);

  const handleNavigate = (path: string) => {
    navigate(path);
    setMobileOpen(false);
  };

  const userInitials = useMemo(() => {
    const normalized = userLabel.trim();
    if (!normalized) return "AD";
    const [localPart] = normalized.split("@");
    const compact = localPart.replace(/[^a-zA-Z0-9]/g, "");
    return compact.slice(0, 2).toUpperCase() || normalized.slice(0, 2).toUpperCase();
  }, [userLabel]);

  return (
    <div className="admin-app-shell min-h-screen text-ink">
      <Drawer>
        <Drawer.Backdrop
          isOpen={mobileOpen}
          onOpenChange={setMobileOpen}
          variant="blur"
          className="admin-nav-drawer-backdrop lg:hidden"
        >
          <Drawer.Content placement="left" className="admin-nav-drawer-content lg:hidden">
            <Drawer.Dialog
              aria-label="Navigation"
              className="admin-nav-drawer-dialog h-full border-r border-white/60 bg-[#f5f7fb]/95 shadow-[0_24px_80px_rgba(15,23,42,0.18)] backdrop-blur-xl"
            >
              <Drawer.CloseTrigger className="right-4 top-4 rounded-full border border-white/70 bg-white/90 text-slate-500 shadow-sm transition hover:bg-white hover:text-slate-900" />
              <Drawer.Header className="border-b border-white/60 px-4 py-4 pr-14">
                <Drawer.Heading className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Navigation
                </Drawer.Heading>
              </Drawer.Header>
              <Drawer.Body className="p-0">
                <div className="flex h-full flex-col">
                  <SidebarContent
                    collapsed={false}
                    currentPath={location.pathname}
                    userLabel={userLabel}
                    onNavigate={handleNavigate}
                    headerAction={
                      <Button
                        isIconOnly
                        variant="ghost"
                        className="shrink-0 text-slate-500"
                        aria-label="Close navigation"
                        onPress={() => setMobileOpen(false)}
                      >
                        <ArrowLeftToLine width={18} height={18} aria-hidden="true" />
                      </Button>
                    }
                  />
                </div>
              </Drawer.Body>
            </Drawer.Dialog>
          </Drawer.Content>
        </Drawer.Backdrop>
      </Drawer>

      <div className="flex min-h-screen">
        <aside
          className={[
            "admin-sidebar hidden border-r border-white/60 text-[#0f1720] transition-all duration-300 lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col",
            collapsed ? "lg:w-[96px]" : "lg:w-[272px]"
          ].join(" ")}
        >
          <SidebarContent
            collapsed={collapsed}
            currentPath={location.pathname}
            userLabel={userLabel}
            onNavigate={handleNavigate}
            onToggleCollapse={() => setCollapsed(value => !value)}
            showDesktopToggle
          />
        </aside>

        <main className="flex min-h-screen min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 px-4 pb-4 pt-5 md:px-8">
            <div className="admin-topbar flex items-center justify-between gap-4 rounded-[2rem] px-4 py-3 md:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <Button
                  isIconOnly
                  size="sm"
                  variant="ghost"
                  className="h-10 w-10 min-w-10 items-center justify-center text-slate-600 lg:hidden"
                  onPress={() => setMobileOpen(true)}
                  aria-label="Open navigation"
                >
                  <Bars width={18} height={18} aria-hidden="true" />
                </Button>
                <Breadcrumbs separator={<span className="px-1 text-slate-300">/</span>} className="min-w-0 text-slate-400">
                  {breadcrumbItems.map((item, index) => {
                    const isCurrent = index === breadcrumbItems.length - 1;

                    return (
                      <Breadcrumbs.Item
                        key={item.key}
                        className={[
                          "truncate text-sm transition",
                          isCurrent
                            ? "font-semibold text-slate-900"
                            : "text-slate-500 hover:text-slate-900"
                        ].join(" ")}
                        onPress={!isCurrent && item.path ? () => handleNavigate(item.path) : undefined}
                      >
                        {item.label}
                      </Breadcrumbs.Item>
                    );
                  })}
                </Breadcrumbs>
              </div>

              <div className="flex items-center gap-2 md:gap-3">
                <Button
                  isIconOnly
                  size="sm"
                  variant="secondary"
                  className="h-10 w-10 min-w-10 bg-white text-slate-700"
                  onPress={() => handleNavigate("/new/user")}
                >
                  <Magnifier width={18} height={18} aria-hidden="true" />
                </Button>
                <Button
                  isIconOnly
                  size="sm"
                  variant="secondary"
                  className="h-10 w-10 min-w-10 bg-white text-slate-700"
                  onPress={() => handleNavigate("/new/notice")}
                >
                  <Bell width={18} height={18} aria-hidden="true" />
                </Button>
                <Button
                  variant="primary"
                  className="hidden md:inline-flex"
                  onPress={() => handleNavigate("/new/invite-link")}
                >
                  <span className="inline-flex items-center gap-2">
                    <PersonPlus width={18} height={18} aria-hidden="true" />
                    <span>Invite</span>
                  </span>
                </Button>
                <Dropdown>
                  <Dropdown.Trigger
                    aria-label={`Open account menu for ${userLabel}`}
                    className="hidden h-auto min-w-0 rounded-full border-0 bg-transparent p-0 shadow-none outline-none lg:inline-flex"
                  >
                    {() => (
                      <Badge.Anchor>
                        <Avatar className="bg-[#1388ef] text-white" size="sm">
                          <Avatar.Fallback>{userInitials}</Avatar.Fallback>
                        </Avatar>
                        {pendingTicketCount > 0 ? (
                          <Badge color="danger" placement="top-right" size="md" variant="primary">
                            {pendingTicketCount > 99 ? "99+" : pendingTicketCount}
                          </Badge>
                        ) : null}
                      </Badge.Anchor>
                    )}
                  </Dropdown.Trigger>
                  <Dropdown.Popover placement="bottom end" className="min-w-[17rem]">
                    <Dropdown.Menu
                      aria-label="Account actions"
                      onAction={key => {
                        const action = String(key);
                        if (action === "dashboard") {
                          handleNavigate("/new/dashboard");
                        } else if (action === "users") {
                          handleNavigate("/new/user");
                        } else if (action === "tickets") {
                          handleNavigate("/new/ticket");
                        }
                      }}
                    >
                      <Dropdown.Item id="dashboard" textValue="Dashboard">
                        <Label>Dashboard</Label>
                      </Dropdown.Item>
                      <Dropdown.Item id="users" textValue="Users">
                        <Label>Users</Label>
                      </Dropdown.Item>
                      <Dropdown.Item id="tickets" textValue="Tickets">
                        <Label>Tickets</Label>
                      </Dropdown.Item>
                    </Dropdown.Menu>
                  </Dropdown.Popover>
                </Dropdown>
              </div>
            </div>
          </header>

          <div className="flex-1 px-4 pb-6 md:px-8 md:pb-8">
            <div className="mx-auto flex min-h-full w-full max-w-[1720px] flex-col gap-6">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
