"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HomeIcon,
  BuildingOfficeIcon,
  UsersIcon,
  CreditCardIcon,
  ChartBarIcon,
  CogIcon,
  ShieldCheckIcon,
  DocumentTextIcon,
  ChatBubbleLeftRightIcon,
  ChatBubbleBottomCenterTextIcon,
  PhoneIcon,
  ClipboardDocumentListIcon,
  Cog8ToothIcon,
} from "@heroicons/react/24/outline";

interface AdminSidebarProps {
  role?: string;
}

export default function AdminSidebar({ role = "platform_owner" }: AdminSidebarProps) {
  const pathname = usePathname();

  const navigation: Array<{
    name: string;
    href: string;
    icon: any;
    indent?: boolean;
  }> = [
    { name: "Dashboard", href: "/saas-admin", icon: HomeIcon },
    {
      name: "Organizations",
      href: "/saas-admin/organizations",
      icon: BuildingOfficeIcon,
    },
    { name: "Users", href: "/saas-admin/users", icon: UsersIcon },
    { name: "Billing", href: "/saas-admin/billing", icon: CreditCardIcon },
    {
      name: "Plans",
      href: "/saas-admin/plans",
      icon: CreditCardIcon,
      indent: true,
    },
    { name: "Analytics", href: "/saas-admin/analytics", icon: ChartBarIcon },
    { name: "AI Assistant", href: "/saas-admin/ai-assistant", icon: ChatBubbleLeftRightIcon },
    { name: "Lead Bots", href: "/saas-admin/lead-bots", icon: ChatBubbleBottomCenterTextIcon },
    {
      name: "Conversations",
      href: "/saas-admin/lead-bots/conversations",
      icon: ChatBubbleBottomCenterTextIcon,
      indent: true,
    },
    {
      name: "Call Bookings",
      href: "/saas-admin/lead-bots/bookings",
      icon: PhoneIcon,
      indent: true,
    },
    {
      name: "AI SOPs",
      href: "/saas-admin/lead-bots/sops",
      icon: DocumentTextIcon,
      indent: true,
    },
    {
      name: "Guardrails",
      href: "/saas-admin/lead-bots/guardrails",
      icon: ShieldCheckIcon,
      indent: true,
    },
    {
      name: "Reports",
      href: "/saas-admin/lead-bots/reports",
      icon: ChartBarIcon,
      indent: true,
    },
    {
      name: "Task Templates",
      href: "/saas-admin/lead-bots/templates",
      icon: ClipboardDocumentListIcon,
      indent: true,
    },
    {
      name: "Agent Config",
      href: "/saas-admin/lead-bots/agents",
      icon: Cog8ToothIcon,
      indent: true,
    },
    { name: "Audit Logs", href: "/saas-admin/audit", icon: DocumentTextIcon },
    { name: "Security", href: "/saas-admin/security", icon: ShieldCheckIcon },
    { name: "Settings", href: "/saas-admin/settings", icon: CogIcon },
  ];

  const filteredNav = navigation.filter((item) => {
    if (
      role === "platform_readonly" &&
      ["Security", "Settings"].includes(item.name)
    ) {
      return false;
    }
    return true;
  });

  return (
    <div className="w-64 bg-gray-800 border-r border-gray-700 min-h-screen">
      <nav className="mt-5 px-2">
        <div className="space-y-1">
          {filteredNav.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`
                  group flex items-center px-2 py-2 text-sm font-medium rounded-md
                  ${item.indent ? "pl-11" : ""}
                  ${
                    isActive
                      ? "bg-orange-600 text-white"
                      : "text-gray-300 hover:bg-gray-700 hover:text-white"
                  }
                `}
              >
                <item.icon
                  className={`
                    mr-3 h-5 w-5 flex-shrink-0
                    ${isActive ? "text-white" : "text-gray-400 group-hover:text-gray-300"}
                  `}
                  aria-hidden="true"
                />
                {item.name}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="absolute bottom-0 w-64 p-4 border-t border-gray-700 bg-gray-800">
        <div className="text-xs text-gray-400">
          <p>Role: Platform Owner</p>
          <p className="mt-1">Email-based auth</p>
        </div>
      </div>
    </div>
  );
}
