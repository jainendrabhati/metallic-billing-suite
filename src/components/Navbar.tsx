import { useQuery } from "@tanstack/react-query";
import { settingsAPI } from "@/services/api";

const Navbar = () => {
  const { data: firmSettings } = useQuery({
    queryKey: ['firmSettings'],
    queryFn: settingsAPI.getFirmSettings,
  });

  return (
   <div className="bg-white border-b border-gray-200 px-4 py-3 text-center"> 
  <h1 
    className="font-bold text-gray-800 text-[30px]" 
   
  >
    {firmSettings?.firm_name || 'Metalic App'}
  </h1>
</div>
  );
};

export default Navbar;