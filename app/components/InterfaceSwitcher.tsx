"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/app/lib/supabase/client";
import {
  Shield,
  Building2,
  Users,
  ChevronDown,
  Settings,
  LayoutDashboard,
  UserCircle,
} from "lucide-react";

interface InterfaceSwitcherProps {
  currentInterface?: "admin" | "gym" | "member";
}

export default function InterfaceSwitcher({
  currentInterface,
}: InterfaceSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // Define the authorized emails (you can expand this list)
  const AUTHORIZED_EMAILS = [
    "sam@gymleadhub.co.uk",
    "sam@atlas-gyms.co.uk",
    // Add more authorized emails here
  ];

  useEffect(() => {
    checkUser();

    // Click outside handler
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const checkUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setUser(user);

    // Check if user is authorized to see the switcher
    if (user && AUTHORIZED_EMAILS.includes(user.email?.toLowerCase() || "")) {
      setIsAuthorized(true);
    }
  };

  // Determine current interface based on pathname
  const getCurrentInterface = () => {
    if (pathname.startsWith("/admin")) {
      return "admin";
    } else if (pathname.startsWith("/portal")) {
      return "member";
    } else {
      return "gym";
    }
  };

  const current = currentInterface || getCurrentInterface();

  const interfaces = [
    {
      id: "admin",
      name: "SaaS Admin",
      description: "Platform administration",
      icon: Shield,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
      path: "/admin/dashboard",
    },
    {
      id: "gym",
      name: "Gym Owner",
      description: "Gym management dashboard",
      icon: Building2,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
      path: "/dashboard",
    },
    {
      id: "member",
      name: "Member Portal",
      description: "Customer-facing interface",
      icon: Users,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      path: "/portal",
    },
  ];

  const currentInterfaceData = interfaces.find((i) => i.id === current);

  const handleSwitch = (interfaceId: string) => {
    const targetInterface = interfaces.find((i) => i.id === interfaceId);
    if (targetInterface) {
      router.push(targetInterface.path);
      setIsOpen(false);
    }
  };

  // Don't show if user is not authorized
  if (!isAuthorized) {
    return null;
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors border border-gray-700"
      >
        {currentInterfaceData && (
          <>
            <div className={`p-1.5 rounded ${currentInterfaceData.bgColor}`}>
              <currentInterfaceData.icon
                className={`w-4 h-4 ${currentInterfaceData.color}`}
              />
            </div>
            <div className="text-left hidden sm:block">
              <div className="text-sm font-medium text-white">
                {currentInterfaceData.name}
              </div>
            </div>
          </>
        )}
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-gray-800 rounded-lg shadow-xl border border-gray-700 z-50">
          <div className="p-3 border-b border-gray-700">
            <div className="text-xs text-gray-400 mb-1">Logged in as</div>
            <div className="text-sm font-medium text-white">{user?.email}</div>
          </div>

          <div className="p-2">
            <div className="text-xs text-gray-400 px-2 py-1 mb-1">
              Switch Interface
            </div>
            {interfaces.map((interface_) => (
              <button
                key={interface_.id}
                onClick={() => handleSwitch(interface_.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  current === interface_.id
                    ? "bg-gray-700 text-white"
                    : "hover:bg-gray-700/50 text-gray-300"
                }`}
              >
                <div className={`p-2 rounded-lg ${interface_.bgColor}`}>
                  <interface_.icon className={`w-5 h-5 ${interface_.color}`} />
                </div>
                <div className="flex-1 text-left">
                  <div className="font-medium">{interface_.name}</div>
                  <div className="text-xs text-gray-400">
                    {interface_.description}
                  </div>
                </div>
                {current === interface_.id && (
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                )}
              </button>
            ))}
          </div>

          <div className="p-2 border-t border-gray-700">
            <div className="text-xs text-gray-400 px-2 py-1 mb-1">
              Quick Actions
            </div>
            <button
              onClick={() => {
                router.push("/admin/organizations");
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-700/50 text-gray-300"
            >
              <Settings className="w-4 h-4" />
              <span className="text-sm">Manage Organizations</span>
            </button>
            <button
              onClick={() => {
                router.push("/admin/impersonation");
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-700/50 text-gray-300"
            >
              <UserCircle className="w-4 h-4" />
              <span className="text-sm">Impersonate User</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
