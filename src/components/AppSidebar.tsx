
import { Home, FileText, Users, CreditCard, Receipt, Settings } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Link, useLocation } from "react-router-dom";

const menuItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: Home,
  },
  {
    title: "Billing",
    url: "/billing",
    icon: FileText,
  },
  {
    title: "Customers",
    url: "/customers",
    icon: Users,
  },
  {
    title: "Transactions",
    url: "/transactions",
    icon: CreditCard,
  },
  {
    title: "Expenses",
    url: "/expenses",
    icon: Receipt,
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
  },
];

export function AppSidebar() {
  const location = useLocation();

  return (
    <Sidebar className="border-r bg-white">
      <SidebarHeader className="p-4 border-b">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">M</span>
          </div>
          <span className="font-bold text-xl text-gray-900">Metalic</span>
        </div>
        <SidebarTrigger className="ml-auto" />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Application</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={location.pathname === item.url}
                    className="hover:bg-blue-50 hover:text-blue-700 data-[active=true]:bg-blue-100 data-[active=true]:text-blue-700"
                  >
                    <Link to={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
