import { useState, useEffect } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatINR } from "@/lib/csv";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import type { Sale, Customer } from "@/types";
import { generateId } from "@/hooks/useLocalStorage";

interface SaleFormProps {
  open: boolean;
  onClose: () => void;
  onSave: (sale: Sale) => void;
  initial?: Sale | null;
  customers: Customer[];
}

export function SaleForm({ open, onClose, onSave, initial, customers }: SaleFormProps) {
  const [date, setDate] = useState<Date>(new Date());
  const [customerName, setCustomerName] = useState("");
  const [itemName, setItemName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (initial) {
      setDate(new Date(initial.date));
      setCustomerName(initial.customerName);
      setItemName(initial.itemName);
      setQuantity(String(initial.quantity));
      setPrice(String(initial.price));
      setNotes(initial.notes || "");
    } else {
      setDate(new Date());
      setCustomerName("");
      setItemName("");
      setQuantity("");
      setPrice("");
      setNotes("");
    }
  }, [initial, open]);

  const handleSave = () => {
    const qty = parseFloat(quantity) || 0;
    const prc = parseFloat(price) || 0;
    onSave({
      id: initial?.id || generateId(),
      date: date.toISOString(),
      customerName,
      itemName,
      quantity: qty,
      price: prc,
      totalAmount: qty * prc,
      notes: notes || undefined,
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit Sale" : "Add Sale"}</DialogTitle>
        </DialogHeader>
        {customers.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">Please add a customer first before creating a sale.</p>
        ) : (
          <div className="grid gap-3 py-2">
            <div>
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal mt-1", !date && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label>Customer</Label>
              <Select value={customerName} onValueChange={setCustomerName}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Item Name</Label>
              <Input className="mt-1" value={itemName} onChange={(e) => setItemName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Quantity</Label>
                <Input className="mt-1" type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
              </div>
              <div>
                <Label>Price</Label>
                <Input className="mt-1" type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              Total: <span className="font-medium text-foreground">{formatINR((parseFloat(quantity) || 0) * (parseFloat(price) || 0))}</span>
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Textarea className="mt-1" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          {customers.length > 0 && (
            <Button onClick={handleSave} disabled={!customerName || !itemName}>Save</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
