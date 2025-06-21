import { useQuery } from "@tanstack/react-query";
import { settingsAPI } from "@/services/api";

const Navbar = () => {
  const { data: firmSettings } = useQuery({
    queryKey: ['firmSettings'],
    queryFn: settingsAPI.getFirmSettings,
  });

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center gap-3">
      {firmSettings?.logo_path && (
        <img 
          src={firmSettings.logo_path} 
          alt="Company Logo" 
          className="h-8 w-8 object-contain rounded"
        />
      )}
      {firmSettings?.firm_name && (
        <h1 className="text-lg font-semibold text-gray-800">
          {firmSettings.firm_name}
        </h1>
      )}
    </div>
  );
};

export default Navbar;