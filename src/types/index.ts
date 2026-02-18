export interface Customer {
    id: string;
    name: string;
    phone: string;
    email?: string;
    address?: string;
    opening_balance?: number;
    created_at?: string;
}

export interface Supplier {
    id: string;
    name: string;
    phone: string;
    email?: string;
    address?: string;
    opening_balance?: number;
    created_at?: string;
}

export interface Sale {
    id: string;
    date: string;
    customer_name: string;
    bill_number: string;
    total_amount: number;
    notes?: string;
    created_at?: string;
}

export interface Purchase {
    id: string;
    date: string;
    supplier_name: string;
    bill_number: string;
    total_amount: number;
    notes?: string;
    created_at?: string;
}

export interface Receipt {
    id: string;
    date: string;
    customer_name: string;
    amount: number;
    notes?: string;
    created_at?: string;
}

export interface Payment {
    id: string;
    date: string;
    supplier_name: string;
    amount: number;
    notes?: string;
    created_at?: string;
}
