export interface Purchase {
  id: string;
  date: string;
  supplierName: string;
  itemName: string;
  quantity: number;
  price: number;
  totalAmount: number;
  notes?: string;
}

export interface Sale {
  id: string;
  date: string;
  customerName: string;
  itemName: string;
  quantity: number;
  price: number;
  totalAmount: number;
  notes?: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  email: string;
  address?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address?: string;
}
