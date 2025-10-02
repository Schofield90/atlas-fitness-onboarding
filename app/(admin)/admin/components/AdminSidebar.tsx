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
} from "@heroicons/react/24/outline";

interface AdminSidebarProps {
  role: string;
}

export default function AdminSidebar({ role }: AdminSidebarProps) {
  const pathname = usePathname();

  const navigation: Array<{
    name: string;
    href: string;
    icon: any;
    indent?: boolean;
  }> = [
    { name: "Dashboard", href: "/admin", icon: HomeIcon },
    {
      name: "Organizations",
      href: "/admin/organizations",
      icon: BuildingOfficeIcon,
    },
    { name: "Users", href: "/admin/users", icon: UsersIcon },
    { name: "Billing", href: "/admin/billing", icon: CreditCardIcon },
    {
      name: "Plans",
      href: "/admin/billing/plans",
      icon: CreditCardIcon,
      indent: true,
    },
    { name: "Analytics", href: "/admin/analytics", icon: ChartBarIcon },
    { name: "Audit Logs", href: "/admin/audit", icon: DocumentTextIcon },
    { name: "Security", href: "/admin/security", icon: ShieldCheckIcon },
    { name: "Settings", href: "/admin/settings", icon: CogIcon },
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
    <div className="w-64 bg-white shadow-sm min-h-screen">
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
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }
                `}
              >
                <item.icon
                  className={`
                    mr-3 h-5 w-5 flex-shrink-0
                    ${isActive ? "text-blue-700" : "text-gray-400 group-hover:text-gray-500"}
                  `}
                  aria-hidden="true"
                />
                {item.name}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="mt-auto p-4 border-t">
        <div className="text-xs text-gray-500">
          <p>Role: {role.replace("_", " ")}</p>
          <p className="mt-1">Session expires in 30m</p>
        </div>
      </div>
    </div>
  );
}
