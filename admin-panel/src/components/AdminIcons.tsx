import type { SVGProps } from "react";
import {
  ArrowChevronDown,
  ArrowDownToLine,
  ArrowLeftToLine,
  ArrowRightFromSquare,
  ArrowRightToLine,
  ArrowRotateRight,
  Bell,
  BookOpen,
  Bars,
  Gear,
  Gift,
  House,
  Layers,
  Link,
  Magnifier,
  Megaphone,
  PersonPlus,
  Persons,
  Receipt,
  Route,
  Server,
  Tag,
  Ticket,
  Timeline,
  Xmark
} from "@gravity-ui/icons";

type IconComponent = (props: SVGProps<SVGSVGElement>) => JSX.Element;
type IconProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

function createIcon(Icon: IconComponent) {
  return function WrappedIcon({ size = 20, className, ...props }: IconProps) {
    return <Icon width={size} height={size} className={className} aria-hidden="true" {...props} />;
  };
}

export const MenuIcon = createIcon(Bars);
export const CloseIcon = createIcon(Xmark);
export const CollapseIcon = createIcon(ArrowLeftToLine);
export const ExpandIcon = createIcon(ArrowRightToLine);
export const DashboardIcon = createIcon(House);
export const UsersIcon = createIcon(Persons);
export const LinkIcon = createIcon(Link);
export const OrdersIcon = createIcon(Receipt);
export const PlansIcon = createIcon(Layers);
export const CouponIcon = createIcon(Tag);
export const GiftIcon = createIcon(Gift);
export const NoticeIcon = createIcon(Megaphone);
export const TicketIcon = createIcon(Ticket);
export const KnowledgeIcon = createIcon(BookOpen);
export const ServerIcon = createIcon(Server);
export const RouteIcon = createIcon(Route);
export const QueueIcon = createIcon(Timeline);
export const SettingsIcon = createIcon(Gear);
export const SearchIcon = createIcon(Magnifier);
export const BellIcon = createIcon(Bell);
export const InviteIcon = createIcon(PersonPlus);
export const DownloadIcon = createIcon(ArrowDownToLine);
export const RefreshIcon = createIcon(ArrowRotateRight);
export const ChevronDownIcon = createIcon(ArrowChevronDown);
export const ExternalLinkIcon = createIcon(ArrowRightFromSquare);
