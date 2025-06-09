
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ExpenseStatusSelectProps {
  value: "paid" | "pending";
  onValueChange: (value: "paid" | "pending") => void;
}

const ExpenseStatusSelect = ({ value, onValueChange }: ExpenseStatusSelectProps) => {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger>
        <SelectValue placeholder="Select status" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="paid">Paid</SelectItem>
        <SelectItem value="pending">Pending</SelectItem>
      </SelectContent>
    </Select>
  );
};

export default ExpenseStatusSelect;
