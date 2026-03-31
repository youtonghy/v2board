import type { ComponentType } from "react";
import {
  CouponIcon,
  DashboardIcon,
  GiftIcon,
  InviteIcon,
  KnowledgeIcon,
  NoticeIcon,
  OrdersIcon,
  PlansIcon,
  QueueIcon,
  RouteIcon,
  ServerIcon,
  SettingsIcon,
  TicketIcon,
  UsersIcon
} from "../components/AdminIcons";

export interface NavItem {
  path: string;
  label: string;
  description: string;
  icon: ComponentType<{ size?: number; className?: string }>;
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
        icon: DashboardIcon
      }
    ]
  },
  {
    label: "Users & Orders",
    items: [
      { path: "/new/user", label: "Users", description: "Account management", icon: UsersIcon },
      {
        path: "/new/invite-link",
        label: "Invite Links",
        description: "Referral tokens and status",
        icon: InviteIcon
      },
      { path: "/new/order", label: "Orders", description: "Payment lifecycle", icon: OrdersIcon }
    ]
  },
  {
    label: "Commerce",
    items: [
      { path: "/new/plan", label: "Plans", description: "Subscriptions and pricing", icon: PlansIcon },
      { path: "/new/coupon", label: "Coupons", description: "Discount issuance", icon: CouponIcon },
      { path: "/new/giftcard", label: "Gift Cards", description: "Credit distribution", icon: GiftIcon }
    ]
  },
  {
    label: "Content & Support",
    items: [
      { path: "/new/notice", label: "Notices", description: "Announcements", icon: NoticeIcon },
      { path: "/new/ticket", label: "Tickets", description: "Support queue", icon: TicketIcon },
      {
        path: "/new/knowledge",
        label: "Knowledge",
        description: "Articles and categories",
        icon: KnowledgeIcon
      }
    ]
  },
  {
    label: "Infrastructure",
    items: [
      { path: "/new/server/group", label: "Server Groups", description: "Grouping", icon: ServerIcon },
      { path: "/new/server/manage", label: "Servers", description: "Nodes and protocols", icon: ServerIcon },
      { path: "/new/server/route", label: "Routes", description: "Routing rules", icon: RouteIcon },
      { path: "/new/queue", label: "Queue", description: "Runtime workload", icon: QueueIcon }
    ]
  },
  {
    label: "Settings",
    items: [
      { path: "/new/config/system", label: "System", description: "Core settings", icon: SettingsIcon },
      { path: "/new/config/payment", label: "Payment", description: "Gateways and forms", icon: CouponIcon },
      { path: "/new/config/theme", label: "Theme", description: "Fantastic-only config", icon: SettingsIcon }
    ]
  }
];
