import { useState, useEffect } from "react";
// import { triggerWebhook } from "@/lib/webhook";
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
import type { Supplier } from "@/types";
// import { generateId } from "@/hooks/useLocalStorage";

interface SupplierFormProps {
  open: boolean;
  onClose: () => void;
  onSave: (supplier: Supplier) => void;
  initial?: Supplier | null;
}

export function SupplierForm({ open, onClose, onSave, initial }: SupplierFormProps) {
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
    const supplierData = {
      id: initial?.id || "",
      name,
      phone,
      email: email || undefined,
      address: address || undefined,
      opening_balance: openingBalance ? parseFloat(openingBalance) : 0,
    };

    onSave(supplierData as Supplier);
    // triggerWebhook({ action: 'add new-supplier', ...supplierData });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit Supplier" : "Add Supplier"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div>
            <Label>Supplier Name</Label>
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
