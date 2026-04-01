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
  BreadcrumbsItem,
  Button,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerHeader,
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
  showDesktopToggle
}: {
  collapsed: boolean;
  currentPath: string;
  userLabel: string;
  onNavigate: (path: string) => void;
  onToggleCollapse?: () => void;
  showDesktopToggle?: boolean;
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
        {showDesktopToggle ? (
          <Button
            isIconOnly
            variant="ghost"
            className="hidden shrink-0 text-slate-500 md:inline-flex"
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

  const pageLabel = useMemo(() => {
    const current = navGroups
      .flatMap(group => group.items)
      .find(item => item.path === location.pathname);
    return current?.label || "Dashboard";
  }, [location.pathname]);

  const breadcrumbItems = useMemo(() => {
    const current = navGroups
      .flatMap(group => group.items)
      .find(item => item.path === location.pathname);

    return [
      { key: "admin", label: "Admin", path: "/new/dashboard" },
      ...(current ? [{ key: current.path, label: current.label, path: current.path }] : [])
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

  const userAvatarUrl = useMemo(
    () => `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(userLabel)}`,
    [userLabel]
  );

  return (
    <div className="admin-app-shell min-h-screen text-ink">
      <Drawer isOpen={mobileOpen} onOpenChange={setMobileOpen}>
        <Drawer.Backdrop>
          <Drawer.Content placement="left">
            <Drawer.Dialog>
              <Drawer.Header className="sr-only">
                <Drawer.Heading>Navigation</Drawer.Heading>
              </Drawer.Header>
              <Drawer.Body className="bg-[#f5f7fb] p-0">
                <div className="flex h-full flex-col">
                  <SidebarContent
                    collapsed={false}
                    currentPath={location.pathname}
                    userLabel={userLabel}
                    onNavigate={handleNavigate}
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
            "admin-sidebar hidden border-r border-white/60 text-[#0f1720] transition-all duration-300 md:sticky md:top-0 md:flex md:h-screen md:flex-col",
            collapsed ? "md:w-[96px]" : "md:w-[272px]"
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
                  className="h-10 w-10 min-w-10 items-center justify-center text-slate-600 md:hidden"
                  onPress={() => setMobileOpen(true)}
                >
                  <Bars width={18} height={18} aria-hidden="true" />
                </Button>
                <div className="min-w-0">
                  <Breadcrumbs
                    separator={<span className="px-1 text-slate-300">/</span>}
                    className="text-slate-400"
                  >
                    {breadcrumbItems.map(item => (
                      <BreadcrumbsItem
                        key={item.key}
                        className="text-slate-400 aria-[current=page]:text-slate-600"
                        onPress={() => handleNavigate(item.path)}
                      >
                        {item.label}
                      </BreadcrumbsItem>
                    ))}
                  </Breadcrumbs>
                  <p className="truncate text-lg font-semibold text-slate-900">{pageLabel}</p>
                </div>
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
                  <Dropdown.Trigger aria-label={`Open account menu for ${userLabel}`}>
                    <div className="hidden items-center gap-3 rounded-full border border-white/70 bg-white px-3 py-2 shadow-sm transition hover:border-slate-200 hover:shadow-md lg:flex">
                      <Badge.Anchor>
                        <Avatar size="sm">
                          <Avatar.Image src={userAvatarUrl} alt={userLabel} />
                          <Avatar.Fallback>{userInitials}</Avatar.Fallback>
                        </Avatar>
                        {pendingTicketCount > 0 ? (
                          <Badge color="danger" size="sm">
                            {pendingTicketCount > 99 ? "99+" : pendingTicketCount}
                          </Badge>
                        ) : null}
                      </Badge.Anchor>
                      <div className="pr-1 text-left">
                        <p className="text-sm font-semibold text-slate-900">{userLabel}</p>
                        <p className="text-xs text-slate-500">Admin</p>
                      </div>
                    </div>
                  </Dropdown.Trigger>
                  <Dropdown.Popover placement="bottom-end" className="min-w-[17rem]">
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
