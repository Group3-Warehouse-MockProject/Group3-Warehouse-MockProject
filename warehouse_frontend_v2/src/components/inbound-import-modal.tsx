import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import ExcelJS from "exceljs";
import { Upload, Download, Loader2, FileSpreadsheet } from "lucide-react";
import { ModalShell } from "@/components/modal-shell";
import { api } from "@/lib/api";

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export function InboundImportModal({ open, onClose, onSaved }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = async () => {
    setLoading(true);
    setError(null);
    try {
      const workbook = new ExcelJS.Workbook();
      const templateSheet = workbook.addWorksheet("Template");
      const dataSheet = workbook.addWorksheet("DataSheet");

      // Fetch dynamic lookup data from backend
      const [wRes, sRes, pRes] = await Promise.all([
        api.get<any[]>("/warehouses"),
        api.get<any[]>("/suppliers"),
        api.get<any[]>("/products"),
      ]);

      const warehouses = wRes.data;
      const suppliers = sRes.data;
      const products = pRes.data;

      // Populate DataSheet with available choices
      dataSheet.getCell("A1").value = "Warehouses";
      warehouses.forEach((w, idx) => {
        dataSheet.getCell(`A${idx + 2}`).value = w.code;
      });

      dataSheet.getCell("B1").value = "Suppliers";
      suppliers.forEach((s, idx) => {
        dataSheet.getCell(`B${idx + 2}`).value = s.name;
      });

      dataSheet.getCell("C1").value = "Products";
      products.forEach((p, idx) => {
        dataSheet.getCell(`C${idx + 2}`).value = p.sku;
      });

      // Hide the reference data sheet so it looks clean to the user
      dataSheet.state = "hidden";

      // Setup main Template sheet columns
      templateSheet.columns = [
        { header: "GroupKey", key: "groupKey", width: 12 },
        { header: "WAREHOUSE", key: "warehouse", width: 18 },
        { header: "DATE", key: "date", width: 15 },
        { header: "SUPPLIER", key: "supplier", width: 25 },
        { header: "PRODUCT", key: "product", width: 22 },
        { header: "QTY", key: "qty", width: 10 },
        { header: "UNIT_COST", key: "unitCost", width: 15 },
        { header: "NOTES", key: "notes", width: 30 }
      ];

      // Add 3 sample rows illustrating grouping
      templateSheet.addRow({
        groupKey: 1,
        warehouse: warehouses[0]?.code || "TS-HCM-01",
        date: "15/07/2026",
        supplier: suppliers[0]?.name || "FPT Distribution",
        product: products[0]?.sku || "CPU-INT-14700K",
        qty: 50,
        unitCost: products[0]?.cost || 8000000,
        notes: "Imported batch A"
      });

      templateSheet.addRow({
        groupKey: 1,
        warehouse: warehouses[0]?.code || "TS-HCM-01",
        date: "15/07/2026",
        supplier: suppliers[0]?.name || "FPT Distribution",
        product: products[1]?.sku || "CPU-AMD-7800X3D",
        qty: 20,
        unitCost: products[1]?.cost || 8500000,
        notes: "Imported batch A"
      });

      templateSheet.addRow({
        groupKey: 2,
        warehouse: warehouses[1]?.code || warehouses[0]?.code || "TS-HN-01",
        date: "15/07/2026",
        supplier: suppliers[1]?.name || suppliers[0]?.name || "Digiworld",
        product: products[0]?.sku || "CPU-INT-14700K",
        qty: 30,
        unitCost: products[0]?.cost || 8000000,
        notes: "Imported batch B"
      });

      // Apply Excel data validation (dropdowns) for rows 2 to 100
      const numWH = warehouses.length;
      const numSupp = suppliers.length;
      const numProd = products.length;

      for (let i = 2; i <= 100; i++) {
        if (numWH > 0) {
          templateSheet.getCell(`B${i}`).dataValidation = {
            type: "list",
            allowBlank: true,
            formulae: [`'DataSheet'!$A$2:$A$${numWH + 1}`]
          };
        }
        if (numSupp > 0) {
          templateSheet.getCell(`D${i}`).dataValidation = {
            type: "list",
            allowBlank: true,
            formulae: [`'DataSheet'!$B$2:$B$${numSupp + 1}`]
          };
        }
        if (numProd > 0) {
          templateSheet.getCell(`E${i}`).dataValidation = {
            type: "list",
            allowBlank: true,
            formulae: [`'DataSheet'!$C$2:$C$${numProd + 1}`]
          };
        }
      }

      // Generate file buffer and trigger download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", "TechStock_Inbound_Import_Template.xlsx");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      console.error(err);
      setError("Failed to generate Excel template. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

      if (jsonData.length === 0) {
        throw new Error("The Excel file is empty.");
      }

      // Filter out exact sample rows from the template using their distinctive Notes
      const cleanJsonData = jsonData.filter((row) => {
        const note = String(row.NOTES || "").trim();
        return note !== "Imported batch A" && note !== "Imported batch B";
      });


      if (cleanJsonData.length === 0) {
        throw new Error("No valid data to import. Please delete the sample rows and fill in your own data.");
      }

      // Pre-fetch warehouses to resolve IDs by Warehouse Code
      const whRes = await api.get<any[]>("/warehouses");
      const warehouseList = whRes.data;

      // Group rows by GroupKey
      const groups: Record<string, any[]> = {};
      cleanJsonData.forEach((row) => {
        const key = row.GroupKey !== undefined ? String(row.GroupKey) : "default";
        if (!groups[key]) groups[key] = [];
        groups[key].push(row);
      });

      // Sequential POST requests for each receipt group
      for (const key of Object.keys(groups)) {
        const rows = groups[key];
        const firstRow = rows[0];

        // Resolve Warehouse ID from Warehouse Code
        const whCodeInput = firstRow.WAREHOUSE ? String(firstRow.WAREHOUSE).trim() : "";
        const whMatch = warehouseList.find(
          (w) => w.code.toLowerCase() === whCodeInput.toLowerCase()
        );

        if (!whMatch) {
          throw new Error(`Warehouse with code "${whCodeInput}" not found (GroupKey ${key}).`);
        }

        const warehouseId = whMatch.id;

        // Build remark from Supplier and Notes
        const suppStr = firstRow.SUPPLIER ? `Supplier: ${String(firstRow.SUPPLIER).trim()}` : "";
        const noteStr = firstRow.NOTES ? String(firstRow.NOTES).trim() : "";
        const remark = [suppStr, noteStr].filter(Boolean).join(" | ") || null;

        const items = rows.map((row, idx) => {
          const code = row.PRODUCT ? String(row.PRODUCT).trim() : "";
          const qty = Number(row.QTY);
          const unitCost = row.UNIT_COST !== undefined ? Number(row.UNIT_COST) : null;

          if (!code) {
            throw new Error(`Product SKU code is missing at row ${idx + 1} in GroupKey ${key}.`);
          }
          if (isNaN(qty) || qty <= 0) {
            throw new Error(`Invalid Qty for product ${code} in GroupKey ${key}.`);
          }
          if (unitCost !== null && (isNaN(unitCost) || unitCost < 0)) {
            throw new Error(`Invalid UNIT_COST for product ${code} in GroupKey ${key}.`);
          }

          return {
            productCode: code,
            quantity: qty,
            price: unitCost
          };
        });

        // Send create receipt API call
        await api.post("/receipts", {
          warehouseId,
          type: "INBOUND",
          remark,
          items
        });
      }

      alert("Inbound receipts imported successfully!");
      onClose();
      onSaved?.();
    } catch (err: any) {
      console.error(err);
      const apiMsg = err.response?.data?.message || err.response?.data || err.message;
      setError(typeof apiMsg === "string" ? apiMsg : "Error importing inbound receipts.");
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="Import from Excel"
      subtitle="Upload a .xlsx file to import inbound receipts in bulk"
      icon={<FileSpreadsheet className="size-5" />}
      footer={
        <>
          <button onClick={onClose} disabled={loading} className="h-10 px-4 rounded-lg bg-secondary border border-border text-sm hover:bg-muted">
            Cancel
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className="h-10 px-5 rounded-lg text-sm font-medium text-primary-foreground glow-ring flex items-center gap-2"
            style={{ background: "var(--gradient-primary)" }}
          >
            {loading && <Loader2 className="size-4 animate-spin" />}
            Upload File
          </button>
        </>
      }
    >
      <div className="space-y-6 text-sm">
        <div className="p-4 surface-card border border-border/60 rounded-lg">
          <h3 className="font-medium mb-2">Step 1: Download Template</h3>
          <p className="text-muted-foreground mb-4">
            Start by downloading the standard Excel template. It has built-in dropdown choices for Warehouses, Suppliers, and Products.
          </p>
          <button onClick={downloadTemplate} disabled={loading} className="h-9 px-4 rounded-md border border-border bg-secondary hover:bg-muted font-medium inline-flex items-center gap-2 transition-colors">
            <Download className="size-4" /> Download Template
          </button>
        </div>

        <div className="p-4 surface-card border border-border/60 rounded-lg">
          <h3 className="font-medium mb-2">Step 2: Upload Data</h3>
          <p className="text-muted-foreground mb-4">
            Fill out the template. Select options from the dropdown cells in Excel, and upload it back.
          </p>

          <input
            type="file"
            accept=".xlsx, .xls, .csv"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileUpload}
            disabled={loading}
          />

          <div
            onClick={() => !loading && fileInputRef.current?.click()}
            className={`border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:bg-secondary/30 transition-colors ${
              loading ? "opacity-60 pointer-events-none" : ""
            }`}
          >
            <Upload className="size-8 text-muted-foreground mx-auto mb-3" />
            <div className="font-medium">Click to browse or drag and drop</div>
            <div className="text-xs text-muted-foreground mt-1">Excel or CSV files up to 5MB</div>
          </div>
        </div>

        {error && (
          <div className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
            {error}
          </div>
        )}
      </div>
    </ModalShell>
  );
}
