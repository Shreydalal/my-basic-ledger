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
import type { Purchase, Supplier } from "@/types";
import { generateId } from "@/hooks/useLocalStorage";

interface PurchaseFormProps {
  open: boolean;
  onClose: () => void;
  onSave: (purchase: Purchase) => void;
  initial?: Purchase | null;
  suppliers: Supplier[];
}

export function PurchaseForm({ open, onClose, onSave, initial, suppliers }: PurchaseFormProps) {
  const [date, setDate] = useState<Date>(new Date());
  const [supplierName, setSupplierName] = useState("");
  const [itemName, setItemName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (initial) {
      setDate(new Date(initial.date));
      setSupplierName(initial.supplierName);
      setItemName(initial.itemName);
      setQuantity(String(initial.quantity));
      setPrice(String(initial.price));
      setNotes(initial.notes || "");
    } else {
      setDate(new Date());
      setSupplierName("");
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
      supplierName,
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
          <DialogTitle>{initial ? "Edit Purchase" : "Add Purchase"}</DialogTitle>
        </DialogHeader>
        {suppliers.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">Please add a supplier first before creating a purchase.</p>
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
              <Label>Supplier</Label>
              <Select value={supplierName} onValueChange={setSupplierName}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
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
          {suppliers.length > 0 && (
            <Button onClick={handleSave} disabled={!supplierName || !itemName}>Save</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
