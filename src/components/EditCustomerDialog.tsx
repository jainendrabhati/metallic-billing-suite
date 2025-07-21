
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { customerAPI } from "@/services/api";
import { useToast } from "@/hooks/use-toast";

interface EditCustomerDialogProps {
  customer: any;
  isOpen: boolean;
  onClose: () => void;
}

const EditCustomerDialog = ({ customer, isOpen, onClose }: EditCustomerDialogProps) => {
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [address, setAddress] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Update form when customer changes
  useEffect(() => {
    if (customer) {
      setName(customer.name || "");
      setMobile(customer.mobile || "");
      setAddress(customer.address || "");
    }
  }, [customer]);

  const updateCustomerMutation = useMutation({
    mutationFn: (data: { name: string; mobile: string; address: string }) =>
      customerAPI.update(customer.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast({
        title: "Success",
        description: "Customer updated successfully!",
      });
      onClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update customer.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !mobile || !address) {
      toast({
        title: "Error",
        description: "Please fill in all fields.",
        variant: "destructive",
      });
      return;
    }
    updateCustomerMutation.mutate({ name, mobile, address });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Customer</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Customer name"
            />
          </div>
          <div>
            <Label htmlFor="mobile">Mobile *</Label>
            <Input
              id="mobile"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              placeholder="Mobile number"
            />
          </div>
          <div>
            <Label htmlFor="address">Address *</Label>
            <Textarea
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Customer address"
              rows={3}
            />
          </div>
          <Button 
            type="submit" 
            className="w-full"
            disabled={updateCustomerMutation.isPending}
          >
            {updateCustomerMutation.isPending ? "Updating..." : "Update Customer"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditCustomerDialog;
