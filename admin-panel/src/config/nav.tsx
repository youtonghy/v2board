import {
  BarChart3,
  BookOpenText,
  Boxes,
  CreditCard,
  Gift,
  LayoutDashboard,
  LifeBuoy,
  Megaphone,
  Network,
  ReceiptText,
  Server,
  Settings2,
  Ticket,
  Users
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ResourcePageSpec } from "../types";

export interface NavItem {
  path: string;
  label: string;
  description: string;
  icon: LucideIcon;
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
        icon: LayoutDashboard
      }
    ]
  },
  {
    label: "Users & Orders",
    items: [
      { path: "/new/user", label: "Users", description: "Account management", icon: Users },
      {
        path: "/new/invite-link",
        label: "Invite Links",
        description: "Referral tokens and status",
        icon: Ticket
      },
      { path: "/new/order", label: "Orders", description: "Payment lifecycle", icon: ReceiptText }
    ]
  },
  {
    label: "Commerce",
    items: [
      { path: "/new/plan", label: "Plans", description: "Subscriptions and pricing", icon: Boxes },
      { path: "/new/coupon", label: "Coupons", description: "Discount issuance", icon: CreditCard },
      { path: "/new/giftcard", label: "Gift Cards", description: "Credit distribution", icon: Gift }
    ]
  },
  {
    label: "Content & Support",
    items: [
      { path: "/new/notice", label: "Notices", description: "Announcements", icon: Megaphone },
      { path: "/new/ticket", label: "Tickets", description: "Support queue", icon: LifeBuoy },
      {
        path: "/new/knowledge",
        label: "Knowledge",
        description: "Articles and categories",
        icon: BookOpenText
      }
    ]
  },
  {
    label: "Infrastructure",
    items: [
      { path: "/new/server/group", label: "Server Groups", description: "Grouping", icon: Server },
      { path: "/new/server/manage", label: "Servers", description: "Nodes and protocols", icon: Network },
      { path: "/new/server/route", label: "Routes", description: "Routing rules", icon: BarChart3 },
      { path: "/new/queue", label: "Queue", description: "Runtime workload", icon: BarChart3 }
    ]
  },
  {
    label: "Settings",
    items: [
      { path: "/new/config/system", label: "System", description: "Core settings", icon: Settings2 },
      { path: "/new/config/payment", label: "Payment", description: "Gateways and forms", icon: CreditCard },
      { path: "/new/config/theme", label: "Theme", description: "Fantastic-only config", icon: Settings2 }
    ]
  }
];

export const resourcePageSpecs: Record<string, ResourcePageSpec> = {
  "/new/user": {
    title: "Users",
    description: "Browse users in the new workspace. Mature edit flows still remain available in the legacy panel while the new UI stabilizes.",
    legacyPath: "/user",
    sources: [{ id: "users", label: "User Directory", endpoint: "user/fetch" }]
  },
  "/new/invite-link": {
    title: "Invite Links",
    description: "Monitor invite token usage and status while keeping legacy status updates one click away.",
    legacyPath: "/invite-link",
    sources: [{ id: "inviteLinks", label: "Invite Links", endpoint: "user/inviteLink/fetch" }]
  },
  "/new/order": {
    title: "Orders",
    description: "Track orders, inspect payloads, and switch to the legacy detail actions whenever payment reconciliation is required.",
    legacyPath: "/order",
    sources: [{ id: "orders", label: "Orders", endpoint: "order/fetch" }]
  },
  "/new/plan": {
    title: "Plans",
    description: "Review plan inventory and pricing records from a clean data view before moving the full editor into the new stack.",
    legacyPath: "/plan",
    sources: [{ id: "plans", label: "Plan Catalog", endpoint: "plan/fetch" }]
  },
  "/new/coupon": {
    title: "Coupons",
    description: "Observe coupon inventory in the new UI. Bulk generation and mutation remain available from the legacy workspace during coexistence.",
    legacyPath: "/coupon",
    sources: [{ id: "coupons", label: "Coupon Inventory", endpoint: "coupon/fetch" }]
  },
  "/new/giftcard": {
    title: "Gift Cards",
    description: "Gift card inventory is available in the new shell, with legacy generation kept intact until the dedicated editor is migrated.",
    legacyPath: "/giftcard",
    sources: [{ id: "giftcards", label: "Gift Card Inventory", endpoint: "giftcard/fetch" }]
  },
  "/new/notice": {
    title: "Notices",
    description: "Announcement content and visibility are easy to inspect here; authoring still falls back to the current production flow.",
    legacyPath: "/notice",
    sources: [{ id: "notices", label: "Announcement Feed", endpoint: "notice/fetch" }]
  },
  "/new/ticket": {
    title: "Tickets",
    description: "Support queue overview with cleaner reading surfaces and a direct link into the legacy threaded workflow for replies and closure.",
    legacyPath: "/ticket",
    sources: [{ id: "tickets", label: "Support Queue", endpoint: "ticket/fetch" }]
  },
  "/new/knowledge": {
    title: "Knowledge",
    description: "Knowledge base content becomes easier to audit in a split-ready layout before the rich editor is migrated.",
    legacyPath: "/knowledge",
    sources: [
      { id: "articles", label: "Articles", endpoint: "knowledge/fetch" },
      { id: "categories", label: "Categories", endpoint: "knowledge/getCategory" }
    ]
  },
  "/new/server/group": {
    title: "Server Groups",
    description: "Server grouping is exposed in the new UI with a lighter inventory page and a legacy handoff for edits.",
    legacyPath: "/server/group",
    sources: [{ id: "serverGroups", label: "Server Groups", endpoint: "server/group/fetch" }]
  },
  "/new/server/manage": {
    title: "Servers",
    description: "Node inventory and protocol overview move into the new workspace first; protocol-specific editors still live in the legacy panel.",
    legacyPath: "/server/manage",
    sources: [{ id: "nodes", label: "Node Inventory", endpoint: "server/manage/getNodes" }]
  },
  "/new/server/route": {
    title: "Routes",
    description: "Routing rules are readable here with a clear path back to the existing drag-sort and edit interactions.",
    legacyPath: "/server/route",
    sources: [{ id: "routes", label: "Route Rules", endpoint: "server/route/fetch" }]
  },
  "/new/queue": {
    title: "Queue",
    description: "Queue health and workload status are surfaced with lighter cards and snapshots for operations review.",
    legacyPath: "/queue",
    sources: [
      { id: "queueStats", label: "Queue Stats", endpoint: "system/getQueueStats" },
      { id: "queueWorkload", label: "Queue Workload", endpoint: "system/getQueueWorkload" }
    ]
  },
  "/new/config/system": {
    title: "System Config",
    description: "Core configuration is presented as a readable audit workspace first. Editing remains in the legacy form until the schema-driven editor lands.",
    legacyPath: "/config/system",
    sources: [
      { id: "config", label: "Current Config", endpoint: "config/fetch", query: { key: "site" } },
      { id: "emailTemplate", label: "Email Template", endpoint: "config/getEmailTemplate" }
    ]
  },
  "/new/config/payment": {
    title: "Payment Config",
    description: "Payment gateways and form metadata are visible in a cleaner information layout while the production editor remains unchanged.",
    legacyPath: "/config/payment",
    sources: [
      { id: "payments", label: "Payments", endpoint: "payment/fetch" },
      { id: "methods", label: "Available Methods", endpoint: "payment/getPaymentMethods" }
    ]
  },
  "/new/config/theme": {
    title: "Theme Config",
    description: "Fantastic-only theme data is grouped for inspection without mixing it into the legacy admin navigation.",
    legacyPath: "/config/theme",
    sources: [
      { id: "themes", label: "Installed Themes", endpoint: "theme/getThemes" },
      { id: "themeTemplate", label: "Theme Template", endpoint: "config/getThemeTemplate" }
    ]
  }
};
