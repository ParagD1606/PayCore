import {
  BookOpen,
  CreditCard,
  LayoutDashboard,
  Receipt,
  Settings,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  description?: string;
};

export const mainNav: NavItem[] = [
  {
    title: "Overview",
    href: "/",
    icon: LayoutDashboard,
    description: "Merchant metrics and recent activity",
  },
  {
    title: "Orders",
    href: "/orders",
    icon: Receipt,
    description: "Create and inspect payment orders",
  },
  {
    title: "Payments",
    href: "/payments",
    icon: CreditCard,
    description: "Payment intents and attempts",
  },
  {
    title: "Ledger",
    href: "/ledger",
    icon: Wallet,
    description: "Double-entry ledger transactions",
  },
  {
    title: "API Documentation",
    href: "/api-docs",
    icon: BookOpen,
    description: "Live backend endpoint reference",
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
    description: "Merchant profile and integration notes",
  },
];

export function getPageTitle(pathname: string): string {
  if (pathname === "/") return "Overview";
  const match = mainNav.find(
    (item) => item.href !== "/" && pathname.startsWith(item.href)
  );
  return match?.title ?? "Dashboard";
}
