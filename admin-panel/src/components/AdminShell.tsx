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
  AccordionItem,
  Avatar,
  Button,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerHeader,
  Listbox,
  ListboxItem,
  ScrollShadow,
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
      <Listbox
        aria-label="Admin navigation"
        selectionMode="single"
        selectedKeys={new Set([currentPath])}
        className="px-2"
        itemClasses={{
          base: "mb-2 rounded-[1.25rem] px-0",
          title: "hidden",
          selectedIcon: "hidden"
        }}
        onAction={key => onNavigate(String(key))}
      >
        {navGroups.flatMap(group =>
          group.items.map(item => {
            const Icon = item.icon;
            return (
              <ListboxItem
                key={item.path}
                textValue={item.label}
                startContent={
                  <Tooltip content={item.label} placement="right">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/80 text-slate-600">
                      <Icon width={18} height={18} aria-hidden="true" />
                    </span>
                  </Tooltip>
                }
                className="min-h-0 justify-center px-2 py-2 data-[selected=true]:bg-white data-[selected=true]:shadow-[0_16px_40px_rgba(15,23,32,0.08)]"
              >
                {item.label}
              </ListboxItem>
            );
          })
        )}
      </Listbox>
    );
  }

  return (
    <Accordion
      selectionMode="multiple"
      defaultExpandedKeys={navGroups.map(group => group.label)}
      showDivider={false}
      itemClasses={{
        base: "px-0",
        trigger: "px-3 py-2",
        title: "text-[11px] uppercase tracking-[0.24em] text-slate-400",
        content: "px-0 pb-0 pt-1"
      }}
      className="px-1"
    >
      {navGroups.map(group => (
        <AccordionItem key={group.label} aria-label={group.label} title={group.label}>
          <Listbox
            aria-label={group.label}
            selectionMode="single"
            selectedKeys={new Set([currentPath])}
            itemClasses={{
              base: "mb-1.5 rounded-[1.25rem] px-2 py-1 data-[hover=true]:bg-white/70 data-[selected=true]:bg-white data-[selected=true]:shadow-[0_16px_40px_rgba(15,23,32,0.08)]",
              title: "text-[14px] font-semibold text-slate-900",
              selectedIcon: "hidden"
            }}
            onAction={key => onNavigate(String(key))}
          >
            {group.items.map(item => {
              const Icon = item.icon;
              return (
                <ListboxItem
                  key={item.path}
                  description={item.description}
                  startContent={
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/80 text-slate-600">
                      <Icon width={18} height={18} aria-hidden="true" />
                    </span>
                  }
                  classNames={{
                    description: "text-xs text-slate-400"
                  }}
                >
                  {item.label}
                </ListboxItem>
              );
            })}
          </Listbox>
        </AccordionItem>
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
        {showDesktopToggle ? (
          <Button
            isIconOnly
            variant="light"
            className="hidden text-slate-500 md:inline-flex"
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

      <ScrollShadow className="flex-1 pb-6">
        <NavigationList collapsed={collapsed} currentPath={currentPath} onNavigate={onNavigate} />
      </ScrollShadow>

      <div className="border-t border-white/70 px-3 py-4">
        <div
          className={[
            "rounded-[1.25rem] border border-white/70 bg-white/85 p-3",
            collapsed ? "flex justify-center" : ""
          ].join(" ")}
        >
          {collapsed ? (
            <Tooltip content="System guidance and support" placement="right">
              <Avatar className="bg-[#1388ef] text-white" name={adminBootstrap.title.slice(0, 1).toUpperCase()} size="sm" />
            </Tooltip>
          ) : (
            <div className="flex items-center gap-3">
              <Avatar className="bg-[#1388ef] text-white" name={userLabel.slice(0, 1).toUpperCase()} size="sm" />
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

  const handleNavigate = (path: string) => {
    navigate(path);
    setMobileOpen(false);
  };

  return (
    <div className="admin-app-shell min-h-screen text-ink">
      <Drawer isOpen={mobileOpen} onOpenChange={setMobileOpen} placement="left" size="xs">
        <DrawerContent>
          <DrawerHeader className="sr-only">Navigation</DrawerHeader>
          <DrawerBody className="bg-[#f5f7fb] p-0">
            <div className="flex h-full flex-col">
              <SidebarContent
                collapsed={false}
                currentPath={location.pathname}
                userLabel={userLabel}
                onNavigate={handleNavigate}
              />
            </div>
          </DrawerBody>
        </DrawerContent>
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
                  variant="light"
                  className="h-10 w-10 min-w-10 items-center justify-center text-slate-600 md:hidden"
                  onPress={() => setMobileOpen(true)}
                >
                  <Bars width={18} height={18} aria-hidden="true" />
                </Button>
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Admin Workspace</p>
                  <p className="truncate text-lg font-semibold text-slate-900">{pageLabel}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 md:gap-3">
                <Button isIconOnly size="sm" radius="full" variant="flat" className="h-10 w-10 min-w-10 bg-white text-slate-700">
                  <Magnifier width={18} height={18} aria-hidden="true" />
                </Button>
                <Button isIconOnly size="sm" radius="full" variant="flat" className="h-10 w-10 min-w-10 bg-white text-slate-700">
                  <Bell width={18} height={18} aria-hidden="true" />
                </Button>
                <Button
                  color="primary"
                  radius="full"
                  className="hidden md:inline-flex"
                  startContent={<PersonPlus width={18} height={18} aria-hidden="true" />}
                >
                  Invite
                </Button>
                <div className="hidden items-center gap-3 rounded-full border border-white/70 bg-white px-3 py-2 shadow-sm lg:flex">
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
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
