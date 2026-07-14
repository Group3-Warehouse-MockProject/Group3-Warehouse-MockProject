export type Category =
  | "CPU"
  | "GPU"
  | "RAM"
  | "SSD"
  | "Mainboard"
  | "PSU"
  | "Case"
  | "Cooling"
  | "Laptop";

export type Role = "Admin" | "Manager" | "Warehouse_Manager" | "Staff";

export interface Warehouse {
  id: string;
  name: string;
  code: string;
  address: string;
  city: string;
  capacity: number;
}

export const warehouses: Warehouse[] = [
  { id: "1", name: "TechStock Saigon Hub", code: "TS-HCM-01", address: "Lot B12, Tan Binh Industrial Park", city: "Ho Chi Minh City", capacity: 12400 },
  { id: "2", name: "TechStock Hanoi Center", code: "TS-HN-01", address: "No. 88 Pham Hung Street, Nam Tu Liem", city: "Hanoi", capacity: 9600 },
  { id: "3", name: "TechStock Danang Depot", code: "TS-DN-01", address: "FPT Complex, Ngu Hanh Son District", city: "Da Nang", capacity: 5200 },
];

export interface AppUser {
  id: string;
  name: string;
  role: Role;
  warehouseId: string | null; // null => all warehouses
  initials: string;
  title: string;
  avatarUrl?: string;
}

export const users: AppUser[] = [
  { id: "U-001", name: "Alex Tran", role: "Admin", warehouseId: null, initials: "AT", title: "System Administrator" },
  { id: "U-002", name: "Diana Pham", role: "Manager", warehouseId: null, initials: "DP", title: "Operations Manager" },
  { id: "U-003", name: "Minh Quan", role: "Warehouse_Manager", warehouseId: "1", initials: "MQ", title: "Warehouse Manager — HCM" },
  { id: "U-004", name: "Hoang Yen", role: "Warehouse_Manager", warehouseId: "2", initials: "HY", title: "Warehouse Manager — HN" },
  { id: "U-005", name: "Hoai Linh", role: "Staff", warehouseId: "1", initials: "HL", title: "Inventory Staff" },
  { id: "U-006", name: "Tan Phong", role: "Staff", warehouseId: "1", initials: "TP", title: "Inventory Staff" },
  { id: "U-007", name: "Bao Tran", role: "Staff", warehouseId: "2", initials: "BT", title: "Warehouse Accountant" },
  { id: "U-008", name: "Van Khoa", role: "Staff", warehouseId: "2", initials: "VK", title: "Loader" },
  { id: "U-009", name: "Kim Anh", role: "Staff", warehouseId: "3", initials: "KA", title: "Inventory Staff" },
  { id: "U-010", name: "Duc Huy", role: "Staff", warehouseId: "3", initials: "DH", title: "Loader" },
];

export interface Product {
  sku: string;
  name: string;
  category: Category;
  brand: string;
  stock: number;
  reorder: number;
  price: number;
  cost: number;
  location: string;
  warehouseId: string;
}

export const products: Product[] = [
  { sku: "CPU-INT-14700K", name: "Intel Core i7-14700K", category: "CPU", brand: "Intel", stock: 42, reorder: 20, price: 10990000, cost: 9200000, location: "A-01-03", warehouseId: "1" },
  { sku: "CPU-AMD-7800X3D", name: "AMD Ryzen 7 7800X3D", category: "CPU", brand: "AMD", stock: 18, reorder: 25, price: 11490000, cost: 9800000, location: "A-01-05", warehouseId: "1" },
  { sku: "GPU-NV-RTX4080S", name: "NVIDIA RTX 4080 Super FE", category: "GPU", brand: "NVIDIA", stock: 7, reorder: 10, price: 29990000, cost: 26500000, location: "B-02-01", warehouseId: "1" },
  { sku: "GPU-NV-RTX4070", name: "ASUS Dual RTX 4070", category: "GPU", brand: "ASUS", stock: 24, reorder: 15, price: 16990000, cost: 14800000, location: "B-02-04", warehouseId: "2" },
  { sku: "RAM-COR-32G-6000", name: "Corsair Vengeance 32GB DDR5 6000", category: "RAM", brand: "Corsair", stock: 86, reorder: 40, price: 2890000, cost: 2300000, location: "C-03-02", warehouseId: "1" },
  { sku: "RAM-GSK-16G-5600", name: "G.Skill Trident Z5 16GB DDR5 5600", category: "RAM", brand: "G.Skill", stock: 54, reorder: 30, price: 1690000, cost: 1380000, location: "C-03-04", warehouseId: "2" },
  { sku: "SSD-SAM-990P-2T", name: "Samsung 990 Pro 2TB NVMe", category: "SSD", brand: "Samsung", stock: 31, reorder: 25, price: 4590000, cost: 3900000, location: "C-04-01", warehouseId: "1" },
  { sku: "SSD-WD-SN850X-1T", name: "WD Black SN850X 1TB", category: "SSD", brand: "Western Digital", stock: 12, reorder: 20, price: 2690000, cost: 2200000, location: "C-04-03", warehouseId: "3" },
  { sku: "MB-MSI-Z790-EDGE", name: "MSI MPG Z790 Edge WiFi", category: "Mainboard", brand: "MSI", stock: 16, reorder: 15, price: 9590000, cost: 8100000, location: "A-02-02", warehouseId: "1" },
  { sku: "MB-GBT-B650E", name: "Gigabyte B650E Aorus Elite", category: "Mainboard", brand: "Gigabyte", stock: 22, reorder: 15, price: 6790000, cost: 5700000, location: "A-02-04", warehouseId: "2" },
  { sku: "PSU-COR-RM850X", name: "Corsair RM850x 80+ Gold", category: "PSU", brand: "Corsair", stock: 28, reorder: 20, price: 3990000, cost: 3300000, location: "D-01-02", warehouseId: "1" },
  { sku: "CASE-LL-O11D", name: "Lian Li O11 Dynamic Evo", category: "Case", brand: "Lian Li", stock: 9, reorder: 12, price: 4590000, cost: 3800000, location: "E-01-01", warehouseId: "3" },
  { sku: "COOL-NOC-D15", name: "Noctua NH-D15 chromax.black", category: "Cooling", brand: "Noctua", stock: 19, reorder: 15, price: 2890000, cost: 2400000, location: "D-02-03", warehouseId: "2" },
  { sku: "LAP-LEN-LOQ15", name: "Lenovo LOQ 15 i7 RTX 4060", category: "Laptop", brand: "Lenovo", stock: 6, reorder: 8, price: 27990000, cost: 24500000, location: "F-01-01", warehouseId: "1" },
];

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
}

export const movements: Movement[] = [
  { id: "MV-2410", date: "2026-06-24", type: "Inbound", sku: "GPU-NV-RTX4080S", product: "NVIDIA RTX 4080 Super FE", qty: 10, partner: "FPT Distribution", staff: "Minh Quan", warehouseId: "1" },
  { id: "MV-2409", date: "2026-06-24", type: "Outbound", sku: "CPU-INT-14700K", product: "Intel Core i7-14700K", qty: 4, partner: "PC Build Saigon", staff: "Hoai Linh", warehouseId: "1" },
  { id: "MV-2408", date: "2026-06-23", type: "Outbound", sku: "RAM-COR-32G-6000", product: "Corsair Vengeance 32GB DDR5", qty: 12, partner: "GearVN Hanoi", staff: "Hoang Yen", warehouseId: "2" },
  { id: "MV-2407", date: "2026-06-23", type: "Inbound", sku: "SSD-SAM-990P-2T", product: "Samsung 990 Pro 2TB", qty: 30, partner: "Samsung VN", staff: "Tan Phong", warehouseId: "1" },
  { id: "MV-2406", date: "2026-06-22", type: "Outbound", sku: "LAP-LEN-LOQ15", product: "Lenovo LOQ 15", qty: 2, partner: "Retail #2210", staff: "Hoai Linh", warehouseId: "1" },
  { id: "MV-2405", date: "2026-06-22", type: "Inbound", sku: "MB-MSI-Z790-EDGE", product: "MSI MPG Z790 Edge", qty: 8, partner: "MSI Vietnam", staff: "Tan Phong", warehouseId: "1" },
  { id: "MV-2404", date: "2026-06-21", type: "Outbound", sku: "PSU-COR-RM850X", product: "Corsair RM850x", qty: 6, partner: "An Phat PC", staff: "Minh Quan", warehouseId: "1" },
  { id: "MV-2403", date: "2026-06-21", type: "Inbound", sku: "CASE-LL-O11D", product: "Lian Li O11 Dynamic Evo", qty: 15, partner: "Lian Li APAC", staff: "Kim Anh", warehouseId: "3" },
  { id: "MV-2402", date: "2026-06-20", type: "Outbound", sku: "GPU-NV-RTX4070", product: "ASUS Dual RTX 4070", qty: 3, partner: "Phong Vu", staff: "Hoang Yen", warehouseId: "2" },
];

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

export const orders: Order[] = [
  { id: "ORD-10241", customer: "PC Build Saigon", items: 12, total: 84500000, status: "Shipping", date: "2026-06-24", warehouseId: "1", createdBy: "Hoai Linh", assignedTo: "Minh Quan" },
  { id: "ORD-10240", customer: "GearVN Hanoi", items: 24, total: 156900000, status: "Completed", date: "2026-06-23", warehouseId: "2", createdBy: "Bao Tran", assignedTo: "Hoang Yen" },
  { id: "ORD-10239", customer: "An Phat PC", items: 8, total: 42300000, status: "Pending", date: "2026-06-23", warehouseId: "1", createdBy: "Tan Phong", assignedTo: "Minh Quan" },
  { id: "ORD-10238", customer: "Retail #2210", items: 2, total: 55980000, status: "Completed", date: "2026-06-22", warehouseId: "1", createdBy: "Hoai Linh", assignedTo: "Hoai Linh" },
  { id: "ORD-10237", customer: "Phong Vu", items: 36, total: 218400000, status: "Shipping", date: "2026-06-22", warehouseId: "2", createdBy: "Hoang Yen", assignedTo: "Van Khoa" },
  { id: "ORD-10236", customer: "Memory Zone", items: 18, total: 47200000, status: "Cancelled", date: "2026-06-21", warehouseId: "3", createdBy: "Kim Anh", assignedTo: "Duc Huy" },
  { id: "ORD-10235", customer: "TechZones Danang", items: 9, total: 36500000, status: "Completed", date: "2026-06-21", warehouseId: "3", createdBy: "Kim Anh", assignedTo: "Kim Anh" },
  { id: "ORD-10234", customer: "HACOM", items: 14, total: 92800000, status: "Pending", date: "2026-06-20", warehouseId: "2", createdBy: "Bao Tran", assignedTo: "Hoang Yen" },
];

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

export const suppliers: Supplier[] = [
  { id: "SUP-01", name: "FPT Distribution", contact: "Nguyen V. Hung", phone: "+84 28 7300 2222", email: "sales@fpt-dist.vn", categories: "GPU, CPU, Laptop", rating: 4.8, onTime: 96, country: "Vietnam" },
  { id: "SUP-02", name: "Samsung Vietnam", contact: "Lee J. Hoon", phone: "+84 24 3795 5555", email: "b2b@samsung.vn", categories: "SSD, RAM", rating: 4.9, onTime: 98, country: "Vietnam" },
  { id: "SUP-03", name: "MSI Vietnam", contact: "Tran T. Mai", phone: "+84 28 3823 1010", email: "partner@msi.vn", categories: "Mainboard, GPU", rating: 4.6, onTime: 91, country: "Vietnam" },
  { id: "SUP-04", name: "Corsair APAC", contact: "Daniel Lim", phone: "+65 6100 9080", email: "apac@corsair.com", categories: "RAM, PSU, Cooling", rating: 4.7, onTime: 94, country: "Singapore" },
  { id: "SUP-05", name: "Lian Li Industrial", contact: "Wendy Chen", phone: "+886 2 2999 8888", email: "sales@lian-li.com", categories: "Case, Cooling", rating: 4.5, onTime: 89, country: "Taiwan" },
  { id: "SUP-06", name: "ASUS Vietnam", contact: "Pham Q. Anh", phone: "+84 28 3636 1212", email: "b2b@asus.vn", categories: "GPU, Mainboard, Laptop", rating: 4.7, onTime: 93, country: "Vietnam" },
  { id: "SUP-07", name: "Western Digital APAC", contact: "Aaron Yip", phone: "+65 6234 7700", email: "apac@wdc.com", categories: "SSD, HDD", rating: 4.6, onTime: 92, country: "Singapore" },
  { id: "SUP-08", name: "Noctua GmbH", contact: "Klaus Meier", phone: "+43 1 4090 800", email: "b2b@noctua.at", categories: "Cooling", rating: 4.9, onTime: 97, country: "Austria" },
  { id: "SUP-09", name: "Gigabyte Vietnam", contact: "Le M. Hieu", phone: "+84 28 3812 9988", email: "vn@gigabyte.com", categories: "Mainboard, GPU", rating: 4.5, onTime: 90, country: "Vietnam" },
  { id: "SUP-10", name: "G.Skill International", contact: "Cindy Wu", phone: "+886 2 8226 5000", email: "sales@gskill.com", categories: "RAM", rating: 4.6, onTime: 92, country: "Taiwan" },
  { id: "SUP-11", name: "Lenovo Vietnam", contact: "Nguyen T. Bao", phone: "+84 28 3939 2020", email: "b2b@lenovo.vn", categories: "Laptop", rating: 4.7, onTime: 94, country: "Vietnam" },
  { id: "SUP-12", name: "NVIDIA Partner Hub", contact: "Sarah Kim", phone: "+82 2 555 1212", email: "partners@nvidia.com", categories: "GPU", rating: 4.8, onTime: 95, country: "Korea" },
];

export interface Stocktake {
  id: string;
  date: string;
  warehouseId: string;
  createdBy: string; // Warehouse_Manager
  assignedTo: string; // Staff
  status: "Draft" | "In Progress" | "Completed";
  items: number;
  variance: number;
}

export const stocktakes: Stocktake[] = [
  { id: "ST-0042", date: "2026-06-24", warehouseId: "1", createdBy: "Minh Quan", assignedTo: "Hoai Linh", status: "In Progress", items: 42, variance: 3 },
  { id: "ST-0041", date: "2026-06-20", warehouseId: "1", createdBy: "Minh Quan", assignedTo: "Tan Phong", status: "Completed", items: 38, variance: 1 },
  { id: "ST-0040", date: "2026-06-18", warehouseId: "2", createdBy: "Hoang Yen", assignedTo: "Bao Tran", status: "Completed", items: 56, variance: 4 },
  { id: "ST-0039", date: "2026-06-15", warehouseId: "3", createdBy: "Hoang Yen", assignedTo: "Kim Anh", status: "Draft", items: 20, variance: 0 },
  { id: "ST-0038", date: "2026-06-10", warehouseId: "1", createdBy: "Minh Quan", assignedTo: "Hoai Linh", status: "Completed", items: 64, variance: 2 },
];

export const weeklyFlow = [
  { day: "Mon", in: 42, out: 31 },
  { day: "Tue", in: 28, out: 44 },
  { day: "Wed", in: 56, out: 38 },
  { day: "Thu", in: 31, out: 49 },
  { day: "Fri", in: 64, out: 52 },
  { day: "Sat", in: 22, out: 68 },
  { day: "Sun", in: 18, out: 27 },
];

export const categoryShare = [
  { name: "CPU", value: 60 },
  { name: "GPU", value: 31 },
  { name: "RAM", value: 140 },
  { name: "SSD", value: 43 },
  { name: "Mainboard", value: 38 },
  { name: "Other", value: 62 },
];

export function formatVND(n: number) {
  return new Intl.NumberFormat("en-US").format(n) + " ₫";
}

export function warehouseName(id: string) {
  return warehouses.find((w) => w.id === id)?.name ?? id;
}

export function warehouseCode(id: string) {
  return warehouses.find((w) => w.id === id)?.code ?? id;
}
