export interface ApprovalHistoryItem {
  id: number;
  documentType: string;
  oldStatus: string;
  newStatus: string;
  note: string;
  approverId: number;
  approverName: string;
  createdAt: string;
}

export interface ReceiptMovement {
  id: string;
  receiptId: number;
  type: string;
  sku: string;
  product: string;
  partner: string;
  staff: string;
  warehouseId: string;
  qty: number;
  date: string;
  status: string;
  remark?: string;
  createdAt: string;
  updatedAt?: string;
  history?: ApprovalHistoryItem[];
  assignedUserId?: number;
  assignedUserName?: string;
  paymentTerm?: "PREPAID" | "COD" | "DEBT";
  paymentStatus?: "UNPAID" | "PARTIAL" | "PAID";
  totalAmount?: number;
  paidAmount?: number;
}

// Use `string` to allow dynamic categories from the backend database
// export type Category = string;

export type Role = "Admin" | "Manager" | "Warehouse_Manager" | "Staff";

export interface Warehouse {
  id: string;
  name: string;
  code: string;
  address: string;
  city: string;
  capacity: number;
}

export interface AppUser {
  id: string;
  name: string;
  role: Role;
  warehouseId: string | null;
  initials: string;
  title: string;
  avatarUrl?: string;
}

export interface Product {
  sku: string;
  name: string;
  category: string;
  brand: string;
  stock: number;
  reorder: number;
  price: number;
  cost: number;
  location: string;
  warehouseId: string;
}

export interface Movement {
  id: string;
  date: string;
  type: "Inbound" | "Outbound";
  sku: string;
  product: string;
  qty: number;
  partner: string;
  staff: string;
  warehouseId: string;
  status?: string;
  remark?: string;
  createdAt?: string;
  history?: ApprovalHistoryItem[];
  assignedUserId?: number;
  assignedUserName?: string;
}

export interface Order {
  id: string;
  customer: string;
  items: number;
  total: number;
  status: "Pending" | "Shipping" | "Completed" | "Cancelled";
  date: string;
  warehouseId: string;
  createdBy: string;
  assignedTo: string;
}

export interface Supplier {
  id: string;
  name: string;
  contact: string;
  phone: string;
  email: string;
  categories: string;
  rating: number;
  onTime: number;
  country: string;
}

export interface Stocktake {
  id: string;
  date: string;
  warehouseId: string;
  createdBy: string;
  assignedTo: string;
  status: "Draft" | "In Progress" | "Completed";
  items: number;
  variance: number;
}
