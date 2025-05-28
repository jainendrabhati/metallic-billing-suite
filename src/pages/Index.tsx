
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to dashboard since this is the main app
    navigate("/");
  }, [navigate]);

  return null;
};

export default Index;
