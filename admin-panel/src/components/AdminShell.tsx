import { Avatar, Button, Chip, ScrollShadow } from "@heroui/react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { adminBootstrap } from "../lib/bootstrap";
import { gatewayRequest } from "../lib/api";
import { navGroups } from "../config/nav";

function Sidebar({
  mobileOpen,
  onClose
}: {
  mobileOpen: boolean;
  onClose: () => void;
}) {
  return (
    <aside
      className={[
        "admin-sidebar fixed inset-y-0 left-0 z-50 flex w-[300px] flex-col border-r border-white/40 bg-[#0f1e28] text-white transition-transform md:sticky md:translate-x-0",
        mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      ].join(" ")}
    >
      <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-white/45">Fantastic Admin</p>
          <p className="mt-2 text-xl font-semibold">{adminBootstrap.title}</p>
        </div>
        <Button isIconOnly variant="light" className="text-white md:hidden" onPress={onClose}>
          <X size={18} />
        </Button>
      </div>
      <ScrollShadow className="flex-1 px-4 py-5">
        <div className="space-y-6">
          {navGroups.map(group => (
            <div key={group.label}>
              <p className="px-3 text-[11px] uppercase tracking-[0.24em] text-white/35">{group.label}</p>
              <div className="mt-3 space-y-2">
                {group.items.map(item => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      className={({ isActive }) =>
                        [
                          "flex items-start gap-3 rounded-[1.2rem] px-3 py-3 transition",
                          isActive
                            ? "bg-white text-ink shadow-lg"
                            : "text-white/75 hover:bg-white/10 hover:text-white"
                        ].join(" ")
                      }
                      onClick={onClose}
                    >
                      {({ isActive }) => (
                        <>
                          <span
                            className={[
                              "mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl",
                              isActive ? "bg-accentSoft text-accent" : "bg-white/10 text-white"
                            ].join(" ")}
                          >
                            <Icon size={18} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-semibold">{item.label}</span>
                            <span className="mt-1 block text-xs leading-5 opacity-80">{item.description}</span>
                          </span>
                        </>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </ScrollShadow>
    </aside>
  );
}

export function AdminShell() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userLabel, setUserLabel] = useState("Administrator");

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    void gatewayRequest<{ email?: string }>("user/info").then(response => {
      if (response.code === 200 && response.data?.email) {
        setUserLabel(response.data.email);
      }
    });
  }, []);

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <div
        className={[
          "fixed inset-0 z-40 bg-slate-950/45 transition md:hidden",
          mobileOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        ].join(" ")}
        onClick={() => setMobileOpen(false)}
      />
      <div className="mx-auto flex min-h-screen max-w-[1800px]">
        <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
        <main className="flex min-h-screen flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/80 backdrop-blur">
            <div className="flex items-center justify-between gap-4 px-4 py-4 md:px-8">
              <div className="flex items-center gap-3">
                <Button isIconOnly variant="flat" className="md:hidden" onPress={() => setMobileOpen(true)}>
                  <Menu size={18} />
                </Button>
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Admin Preview</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">{location.pathname.replace("/new/", "").replaceAll("/", " / ") || "dashboard"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Chip variant="flat" className="border-none bg-accentSoft text-accent">
                  {adminBootstrap.version}
                </Chip>
                <div className="hidden text-right md:block">
                  <p className="text-sm font-medium text-slate-800">{userLabel}</p>
                  <p className="text-xs text-slate-500">Legacy-safe coexistence mode</p>
                </div>
                <Avatar
                  name={userLabel.slice(0, 1).toUpperCase()}
                  className="bg-slate-900 text-white"
                  size="sm"
                />
              </div>
            </div>
          </header>
          <div className="flex-1 px-4 py-6 md:px-8 md:py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
