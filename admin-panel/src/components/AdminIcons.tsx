import type { ReactNode, SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

function createIcon(paths: ReactNode, viewBox = "0 0 24 24") {
  return function Icon({ size = 20, className, ...props }: IconProps) {
    return (
      <svg
        viewBox={viewBox}
        fill="none"
        width={size}
        height={size}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden="true"
        {...props}
      >
        {paths}
      </svg>
    );
  };
}

export const MenuIcon = createIcon(
  <>
    <path d="M4 7h16" />
    <path d="M4 12h16" />
    <path d="M4 17h16" />
  </>
);

export const CloseIcon = createIcon(
  <>
    <path d="M6 6l12 12" />
    <path d="M18 6L6 18" />
  </>
);

export const CollapseIcon = createIcon(
  <>
    <path d="M4 5h4v14H4z" />
    <path d="M20 5h-8v14h8z" />
    <path d="M14 9l-3 3 3 3" />
  </>
);

export const ExpandIcon = createIcon(
  <>
    <path d="M4 5h8v14H4z" />
    <path d="M20 5h-4v14h4z" />
    <path d="M10 9l3 3-3 3" />
  </>
);

export const DashboardIcon = createIcon(
  <>
    <path d="M4 12.5a8 8 0 1 1 16 0" />
    <path d="M12 12l3.5-3.5" />
    <path d="M9 18h6" />
  </>
);

export const UsersIcon = createIcon(
  <>
    <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
    <path d="M9.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
    <path d="M20 21v-2a3 3 0 0 0-2-2.82" />
    <path d="M16 3.2a3.5 3.5 0 0 1 0 6.6" />
  </>
);

export const LinkIcon = createIcon(
  <>
    <path d="M10.5 13.5l3-3" />
    <path d="M7.5 16.5l-2 2a3 3 0 1 1-4.2-4.2l4-4a3 3 0 0 1 4.2 0" />
    <path d="M16.5 7.5l2-2a3 3 0 0 1 4.2 4.2l-4 4a3 3 0 0 1-4.2 0" />
  </>
);

export const OrdersIcon = createIcon(
  <>
    <path d="M6 4h12l1 15H5L6 4Z" />
    <path d="M9 8h6" />
    <path d="M8 12h8" />
    <path d="M10 16h4" />
  </>
);

export const PlansIcon = createIcon(
  <>
    <rect x="3" y="4" width="7" height="7" rx="2" />
    <rect x="14" y="4" width="7" height="7" rx="2" />
    <rect x="3" y="13" width="7" height="7" rx="2" />
    <rect x="14" y="13" width="7" height="7" rx="2" />
  </>
);

export const CouponIcon = createIcon(
  <>
    <path d="M6 7h12a2 2 0 0 1 2 2v2a2.5 2.5 0 0 0 0 5v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2.5 2.5 0 0 0 0-5V9a2 2 0 0 1 2-2Z" />
    <path d="M12 7v13" strokeDasharray="2.5 3.5" />
  </>
);

export const GiftIcon = createIcon(
  <>
    <path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-7" />
    <path d="M2 8h20v4H2z" />
    <path d="M12 8v13" />
    <path d="M12 8H8.5a2.5 2.5 0 1 1 0-5c2 0 3.5 2.5 3.5 5Z" />
    <path d="M12 8h3.5a2.5 2.5 0 1 0 0-5C13.5 3 12 5.5 12 8Z" />
  </>
);

export const NoticeIcon = createIcon(
  <>
    <path d="M4 12V8a4 4 0 0 1 4-4h8l4 4v4" />
    <path d="M7 12h10" />
    <path d="M8 16h8" />
    <path d="M10 20h4" />
  </>
);

export const TicketIcon = createIcon(
  <>
    <path d="M5 7h14a2 2 0 0 1 2 2v2a2 2 0 0 0-2 2v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 2-2V9a2 2 0 0 1 2-2Z" />
    <path d="M12 7v10" strokeDasharray="3 3" />
  </>
);

export const KnowledgeIcon = createIcon(
  <>
    <path d="M5 5.5A2.5 2.5 0 0 1 7.5 3H19v17H7.5A2.5 2.5 0 0 0 5 22Z" />
    <path d="M5 5.5V20" />
    <path d="M9 7h6" />
    <path d="M9 11h6" />
  </>
);

export const ServerIcon = createIcon(
  <>
    <rect x="4" y="4" width="16" height="6" rx="2" />
    <rect x="4" y="14" width="16" height="6" rx="2" />
    <path d="M8 7h.01" />
    <path d="M8 17h.01" />
  </>
);

export const RouteIcon = createIcon(
  <>
    <circle cx="6" cy="6" r="2.5" />
    <circle cx="18" cy="18" r="2.5" />
    <path d="M8 6h6a4 4 0 0 1 4 4v5" />
    <path d="M18 12v6" />
  </>
);

export const QueueIcon = createIcon(
  <>
    <path d="M6 6h12" />
    <path d="M6 12h9" />
    <path d="M6 18h6" />
    <path d="M17 10l3 2-3 2" />
  </>
);

export const SettingsIcon = createIcon(
  <>
    <path d="M12 8.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7Z" />
    <path d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V20a2 2 0 1 1-4 0v-.2a1 1 0 0 0-.6-.9 1 1 0 0 0-1.1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H4a2 2 0 1 1 0-4h.2a1 1 0 0 0 .9-.6 1 1 0 0 0-.2-1.1l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1 1 0 0 0 1.1.2 1 1 0 0 0 .6-.9V4a2 2 0 1 1 4 0v.2a1 1 0 0 0 .6.9 1 1 0 0 0 1.1-.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1 1 0 0 0-.2 1.1 1 1 0 0 0 .9.6H20a2 2 0 1 1 0 4h-.2a1 1 0 0 0-.9.6Z" />
  </>
);

export const SearchIcon = createIcon(
  <>
    <circle cx="11" cy="11" r="6" />
    <path d="m20 20-3.5-3.5" />
  </>
);

export const BellIcon = createIcon(
  <>
    <path d="M15 18H5.5a1.5 1.5 0 0 1-1.3-2.25L6 12V9a6 6 0 1 1 12 0v3l1.8 3.75A1.5 1.5 0 0 1 18.5 18H18" />
    <path d="M10 20a2 2 0 0 0 4 0" />
  </>
);

export const InviteIcon = createIcon(
  <>
    <path d="M16 21v-2.5a3.5 3.5 0 0 0-3.5-3.5H7a4 4 0 0 0-4 4V21" />
    <path d="M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
    <path d="M19 8v6" />
    <path d="M16 11h6" />
  </>
);

export const DownloadIcon = createIcon(
  <>
    <path d="M12 4v10" />
    <path d="m8 10 4 4 4-4" />
    <path d="M5 19h14" />
  </>
);

export const RefreshIcon = createIcon(
  <>
    <path d="M20 11a8 8 0 0 0-14.4-4.8L4 8" />
    <path d="M4 4v4h4" />
    <path d="M4 13a8 8 0 0 0 14.4 4.8L20 16" />
    <path d="M20 20v-4h-4" />
  </>
);

export const ChevronDownIcon = createIcon(<path d="m6 9 6 6 6-6" />);

export const ExternalLinkIcon = createIcon(
  <>
    <path d="M14 5h5v5" />
    <path d="M10 14 19 5" />
    <path d="M19 14v3a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h3" />
  </>
);
