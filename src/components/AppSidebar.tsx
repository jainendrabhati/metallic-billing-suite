
import {
  BarChart3,
  CreditCard,
  Package,
  Receipt,
  Settings,
  TrendingDown,
  UserCheck,
  Users,
  Clock,
  FileText,
  FileSpreadsheet
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { useSidebar } from "@/components/SidebarProvider";
import { useEffect, useState } from "react";

const items = [
  {
    title: "Dashboard",
    url: "/",
    icon: BarChart3,
  },
  {
    title: "Billing",
    url: "/billing",
    icon: Receipt,
  },
  {
    title: "Customers",
    url: "/customers",
    icon: Users,
  },
  {
    title: "Pending List",
    url: "/pending-list",
    icon: Clock,
  },
  {
    title: "Transactions",
    url: "/transactions",
    icon: CreditCard,
  },
  {
    title: "Stock Management",
    url: "/stock",
    icon: Package,
  },
  {
    title: "GST Bills",
    url: "/gst-bill",
    icon: FileText,
  },
  {
    title: "Employees",
    url: "/employees",
    icon: UserCheck,
  },
  {
    title: "Expenses",
    url: "/expenses",
    icon: TrendingDown,
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
  },
];

const AppSidebar = () => {
  const { isOpen, setIsOpen } = useSidebar();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (isMobile) {
      setIsOpen(false);
    } else {
      setIsOpen(true);
    }
  }, [isMobile, setIsOpen]);

  return (
    <aside
      className={`bg-gray-50 border-r border-gray-200 flex flex-col transition-all duration-300 fixed left-0 top-0 h-full z-10 ${
        isOpen ? "w-64" : "w-16"
      }`}
    >
      <div className="flex items-center justify-center h-16 shrink-0">
        <span
          className={`text-lg font-bold text-gray-900 transition-opacity duration-300 ${
            isOpen ? "opacity-100" : "opacity-0"
          }`}
        >
          Metalic
        </span>
      </div>
      <nav className="flex-1 py-4">
        <ul>
          {items.map((item) => (
            <li key={item.title}>
              <NavLink
                to={item.url}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-2 transition-colors duration-200 hover:bg-gray-100 ${
                    isActive ? "bg-gray-100 font-semibold text-blue-600" : "text-gray-700"
                  }`
                }
              >
                <item.icon className="h-5 w-5" />
                <span
                  className={`transition-opacity duration-300 ${
                    isOpen ? "opacity-100" : "opacity-0"
                  }`}
                >
                  {item.title}
                </span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      
    </aside>
  );
};

export default AppSidebar;