import { useState, useEffect } from "react";
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
import { generateId } from "@/hooks/useLocalStorage";

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

  useEffect(() => {
    if (initial) {
      setName(initial.name);
      setPhone(initial.phone);
      setEmail(initial.email);
      setAddress(initial.address || "");
    } else {
      setName("");
      setPhone("");
      setEmail("");
      setAddress("");
    }
  }, [initial, open]);

  const handleSave = () => {
    onSave({
      id: initial?.id || generateId(),
      name,
      phone,
      email,
      address: address || undefined,
    });
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
            <Label>Email</Label>
            <Input className="mt-1" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label>Address (optional)</Label>
            <Textarea className="mt-1" rows={2} value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!name || !phone || !email}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
