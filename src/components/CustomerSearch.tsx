import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { customerAPI, Customer } from "@/services/api";

interface CustomerSearchProps {
  value: string;
  onValueChange: (value: string) => void;
  onCustomerSelect: (customer: Customer) => void;
  onMobileChange: (mobile: string) => void;
  onAddressChange: (address: string) => void;
  placeholder?: string;
  className?: string;
}

const CustomerSearch = ({
  value,
  onValueChange,
  onCustomerSelect,
  onMobileChange,
  onAddressChange,
  placeholder = "Enter customer name",
  className = "",
}: CustomerSearchProps) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: allCustomers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: customerAPI.getAll,
  });

  const searchResults = value.length > 0
    ? allCustomers.filter((customer: Customer) =>
        customer.name.toLowerCase().startsWith(value.toLowerCase())
      )
    : [];

  useEffect(() => {
    setSelectedIndex(-1);
  }, [searchResults]);

  const handleInputChange = (inputValue: string) => {
    onValueChange(inputValue);
    setShowSuggestions(inputValue.length > 0);
    setSelectedIndex(-1);
  };

  const handleCustomerSelect = (customer: Customer) => {
    onCustomerSelect(customer);
    onValueChange(customer.name);
    onMobileChange(customer.mobile);
    onAddressChange(customer.address);
    setShowSuggestions(false);
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || searchResults.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < searchResults.length - 1 ? prev + 1 : 0
      );
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev > 0 ? prev - 1 : searchResults.length - 1
      );
    }

    if (e.key === "Enter" && selectedIndex >= 0) {
      e.preventDefault();
      handleCustomerSelect(searchResults[selectedIndex]);
    }

    if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  const handleClickOutside = (event: MouseEvent) => {
    if (
      containerRef.current &&
      !containerRef.current.contains(event.target as Node)
    ) {
      setShowSuggestions(false);
    }
  };

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => handleInputChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => setShowSuggestions(value.length > 0)}
        placeholder={placeholder}
        autoComplete="off"
        className={className}
      />
      {showSuggestions && searchResults.length > 0 && (
        <div className="absolute z-[100] w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg">
          {searchResults.slice(0, 5).map((customer, index) => (
            <div
              key={customer.id}
              className={`px-3 py-2 cursor-pointer select-none ${
                index === selectedIndex
                  ? "bg-blue-100 text-blue-900"
                  : "hover:bg-gray-100"
              }`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleCustomerSelect(customer)}
            >
              <div className="font-medium text-sm">{customer.name}</div>
              <div className="text-xs text-gray-500">{customer.mobile}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomerSearch;
