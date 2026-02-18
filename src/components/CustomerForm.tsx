import { useState, useEffect } from "react";
// import { triggerWebhook } from "@/lib/webhook"; // Webhook might need update or be removed if Supabase is primary
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import type { Customer } from "@/types";
// import { generateId } from "@/hooks/useLocalStorage"; // No longer needed with Supabase auto-ID, but keeping for type safety/fallback if needed

interface CustomerFormProps {
  open: boolean;
  onClose: () => void;
  onSave: (customer: Customer) => void;
  initial?: Customer | null;
}

export function CustomerForm({ open, onClose, onSave, initial }: CustomerFormProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [openingBalance, setOpeningBalance] = useState("");

  useEffect(() => {
    if (initial) {
      setName(initial.name);
      setPhone(initial.phone);
      setEmail(initial.email || "");
      setAddress(initial.address || "");
      setOpeningBalance(initial.opening_balance?.toString() || "");
    } else {
      setName("");
      setPhone("");
      setEmail("");
      setAddress("");
      setOpeningBalance("");
    }
  }, [initial, open]);

  const handleSave = () => {
    const customerData = {
      id: initial?.id || "",
      name,
      phone,
      email: email || undefined,
      address: address || undefined,
      opening_balance: openingBalance ? parseFloat(openingBalance) : 0,
    };

    onSave(customerData as Customer);
    // triggerWebhook({ action: 'add new-customer', ...customerData });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit Customer" : "Add Customer"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div>
            <Label>Customer Name</Label>
            <Input className="mt-1" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Phone</Label>
            <Input className="mt-1" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div>
            <Label>Email (Optional)</Label>
            <Input className="mt-1" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label>Opening Balance (Pre-Pending Amount)</Label>
            <Input
              className="mt-1"
              type="number"
              value={openingBalance}
              onChange={(e) => setOpeningBalance(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div>
            <Label>Address (optional)</Label>
            <Textarea className="mt-1" rows={2} value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!name || !phone}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
