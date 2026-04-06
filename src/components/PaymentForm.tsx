import { useState, useEffect } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { triggerWebhook } from "@/lib/webhook";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import type { Payment, Supplier, Purchase } from "@/types/index";
import { generateId } from "@/hooks/useLocalStorage";

interface PaymentFormProps {
    open: boolean;
    onClose: () => void;
    onSave: (payment: Payment) => void;
    initial?: Payment | null;
    suppliers: Supplier[];
    defaultSupplier?: string;
    purchases?: Purchase[];
    defaultBillNumber?: string;
}

export function PaymentForm({ open, onClose, onSave, initial, suppliers, defaultSupplier, purchases, defaultBillNumber }: PaymentFormProps) {
    const [date, setDate] = useState<Date>(new Date());
    const [supplierName, setSupplierName] = useState("");
    const [amount, setAmount] = useState("");
    const [notes, setNotes] = useState("");
    const [billNumber, setBillNumber] = useState("");
    const [isOtherBill, setIsOtherBill] = useState(false);

    useEffect(() => {
        if (initial) {
            setDate(new Date(initial.date));
            setSupplierName(initial.supplier_name);
            setAmount(String(initial.amount));
            setNotes(initial.notes || "");
            
            const availableBills = purchases?.filter(p => p.supplier_name === initial.supplier_name && p.bill_number).map(p => p.bill_number) || [];
            if (initial.bill_number) {
                if (availableBills.includes(initial.bill_number)) {
                    setBillNumber(initial.bill_number);
                    setIsOtherBill(false);
                } else {
                    setBillNumber(initial.bill_number);
                    setIsOtherBill(true);
                }
            } else {
                setBillNumber("");
                setIsOtherBill(false);
            }
        } else {
            setDate(new Date());
            setSupplierName(defaultSupplier || "");
            setAmount("");
            setNotes("");
            
            if (defaultBillNumber) {
                const availableBills = purchases?.filter(p => p.supplier_name === (defaultSupplier || "") && p.bill_number).map(p => p.bill_number) || [];
                if (availableBills.includes(defaultBillNumber)) {
                    setBillNumber(defaultBillNumber);
                    setIsOtherBill(false);
                } else {
                    setBillNumber(defaultBillNumber);
                    setIsOtherBill(true);
                }
            } else {
                setBillNumber("");
                setIsOtherBill(false);
            }
        }
    }, [initial, open, defaultSupplier, purchases, defaultBillNumber]);

    const handleSave = () => {
        const total = parseFloat(amount) || 0;
        const paymentData = {
            id: initial?.id || generateId(),
            date: date.toISOString(),
            supplier_name: supplierName,
            amount: total,
            notes: notes || null,
            bill_number: billNumber || null,
        };

        onSave(paymentData);

        if (!initial) {
            triggerWebhook({ action: 'add new-payment', ...paymentData });
        }

        onClose();
    };

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{initial ? "Edit Payment" : "Add Payment"}</DialogTitle>
                </DialogHeader>
                {suppliers.length === 0 ? (
                    <p className="py-4 text-sm text-muted-foreground">Please add a supplier first.</p>
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
                            <Select value={supplierName} onValueChange={setSupplierName} disabled={!!defaultSupplier}>
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
                            <Label>Amount Paid</Label>
                            <Input className="mt-1" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
                        </div>
                        {purchases && purchases.length > 0 && (
                            <div>
                                <Label>Bill Number</Label>
                                <Select 
                                    value={isOtherBill ? "other" : (billNumber || "none")} 
                                    onValueChange={(val) => {
                                        if (val === "none") {
                                            setBillNumber("");
                                            setIsOtherBill(false);
                                        } else if (val === "other") {
                                            setBillNumber("");
                                            setIsOtherBill(true);
                                        } else {
                                            setBillNumber(val);
                                            setIsOtherBill(false);
                                        }
                                    }}
                                >
                                    <SelectTrigger className="mt-1">
                                        <SelectValue placeholder="Select bill number" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">None</SelectItem>
                                        {Array.from(new Set(purchases.filter(p => p.supplier_name === supplierName && p.bill_number).map(p => p.bill_number))).map(b => (
                                            <SelectItem key={b} value={b}>{b}</SelectItem>
                                        ))}
                                        {initial?.bill_number && !Array.from(new Set(purchases.filter(p => p.supplier_name === supplierName && p.bill_number).map(p => p.bill_number))).includes(initial.bill_number) && !isOtherBill && (
                                            <SelectItem value={initial.bill_number}>{initial.bill_number}</SelectItem>
                                        )}
                                        <SelectItem value="other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                                {isOtherBill && (
                                    <Input 
                                        className="mt-2" 
                                        placeholder="Enter custom bill number" 
                                        value={billNumber} 
                                        onChange={(e) => setBillNumber(e.target.value)} 
                                    />
                                )}
                            </div>
                        )}
                        <div>
                            <Label>Notes (optional)</Label>
                            <Textarea className="mt-1" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
                        </div>
                    </div>
                )}
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    {suppliers.length > 0 && (
                        <Button onClick={handleSave} disabled={!supplierName || !amount}>Save</Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
