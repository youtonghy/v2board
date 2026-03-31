import type { ComponentType } from "react";
import {
  BookOpen,
  Gift,
  Gear,
  House,
  Layers,
  Megaphone,
  PersonPlus,
  Persons,
  Receipt,
  Route,
  Server,
  Tag,
  Ticket,
  Timeline
} from "@gravity-ui/icons";

export interface NavItem {
  path: string;
  label: string;
  description: string;
  icon: ComponentType<{ className?: string; width?: number | string; height?: number | string }>;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const navGroups: NavGroup[] = [
  {
    label: "Overview",
    items: [
      {
        path: "/new/dashboard",
        label: "Dashboard",
        description: "Operations summary and live status",
        icon: House
      }
    ]
  },
  {
    label: "Users & Orders",
    items: [
      { path: "/new/user", label: "Users", description: "Account management", icon: Persons },
      {
        path: "/new/invite-link",
        label: "Invite Links",
        description: "Referral tokens and status",
        icon: PersonPlus
      },
      { path: "/new/order", label: "Orders", description: "Payment lifecycle", icon: Receipt }
    ]
  },
  {
    label: "Commerce",
    items: [
      { path: "/new/plan", label: "Plans", description: "Subscriptions and pricing", icon: Layers },
      { path: "/new/coupon", label: "Coupons", description: "Discount issuance", icon: Tag },
      { path: "/new/giftcard", label: "Gift Cards", description: "Credit distribution", icon: Gift }
    ]
  },
  {
    label: "Content & Support",
    items: [
      { path: "/new/notice", label: "Notices", description: "Announcements", icon: Megaphone },
      { path: "/new/ticket", label: "Tickets", description: "Support queue", icon: Ticket },
      {
        path: "/new/knowledge",
        label: "Knowledge",
        description: "Articles and categories",
        icon: BookOpen
      }
    ]
  },
  {
    label: "Infrastructure",
    items: [
      { path: "/new/server/group", label: "Server Groups", description: "Grouping", icon: Server },
      { path: "/new/server/manage", label: "Servers", description: "Nodes and protocols", icon: Server },
      { path: "/new/server/route", label: "Routes", description: "Routing rules", icon: Route },
      { path: "/new/queue", label: "Queue", description: "Runtime workload", icon: Timeline }
    ]
  },
  {
    label: "Settings",
    items: [
      { path: "/new/config/system", label: "System", description: "Core settings", icon: Gear },
      { path: "/new/config/payment", label: "Payment", description: "Gateways and forms", icon: Tag },
      { path: "/new/config/theme", label: "Theme", description: "Fantastic-only config", icon: Gear }
    ]
  }
];
