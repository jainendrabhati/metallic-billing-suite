
import { Home, FileText, Users, CreditCard, Receipt, Settings, UserCheck, Menu } from "lucide-react";
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
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
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
    title: "Employees",
    url: "/employees",
    icon: UserCheck,
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
  const { open, setOpen } = useSidebar();

  return (
    <div className="relative">
      <Sidebar className="border-r bg-white shadow-lg">
        <SidebarHeader className="p-4 border-b bg-gradient-to-r from-blue-600 to-blue-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-md">
              <span className="text-blue-600 font-bold text-lg">M</span>
            </div>
            <div className="text-white">
              <span className="font-bold text-xl">Metalic</span>
              <p className="text-blue-100 text-xs">Billing Suite</p>
            </div>
          </div>
          <SidebarTrigger className="ml-auto text-white hover:bg-blue-500" />
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel className="text-gray-600 font-semibold uppercase tracking-wide text-xs">
              Business Management
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {menuItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={location.pathname === item.url}
                      className="hover:bg-blue-50 hover:text-blue-700 data-[active=true]:bg-blue-100 data-[active=true]:text-blue-700 data-[active=true]:border-r-2 data-[active=true]:border-blue-600 rounded-lg mx-2 my-1"
                    >
                      <Link to={item.url} className="flex items-center gap-3 px-3 py-2">
                        <item.icon className="h-5 w-5" />
                        <span className="font-medium">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
      
      {!open && (
        <Button
          onClick={() => setOpen(true)}
          className="fixed left-2 top-4 z-50 h-8 w-8 p-0 bg-blue-600 hover:bg-blue-700 shadow-lg"
          size="icon"
        >
          <Menu className="h-4 w-4 text-white" />
        </Button>
      )}
    </div>
  );
}
