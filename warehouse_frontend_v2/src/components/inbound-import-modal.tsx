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
        api.get<{ content: any[] }>("/products", { params: { page: 0, size: 15 } }),
      ]);

      const warehouses = wRes.data;
      const suppliers = sRes.data;
      const products = pRes.data?.content ?? (pRes.data as any);

      // Populate DataSheet with available choices
      dataSheet.getCell("A1").value = "Warehouses";
      warehouses.forEach((w: any, idx: number) => {
        dataSheet.getCell(`A${idx + 2}`).value = w.code;
      });

      dataSheet.getCell("B1").value = "Suppliers";
      suppliers.forEach((s: any, idx: number) => {
        dataSheet.getCell(`B${idx + 2}`).value = s.name;
      });

      dataSheet.getCell("C1").value = "Products";
      products.forEach((p: any, idx: number) => {
        dataSheet.getCell(`C${idx + 2}`).value = p.sku;
      });

      // Hide the reference data sheet so it looks clean to the user
      dataSheet.state = "hidden";

      // Setup main Template sheet columns
      templateSheet.columns = [
        { header: "GroupKey", key: "groupKey", width: 12 },
        { header: "WAREHOUSE", key: "warehouse", width: 18 },
        { header: "DATE (yyyy-mm-dd)", key: "date", width: 20 },
        { header: "SUPPLIER", key: "supplier", width: 25 },
        { header: "PRODUCT", key: "product", width: 22 },
        { header: "QTY", key: "qty", width: 10 },
        { header: "UNIT_COST", key: "unitCost", width: 15 },
        { header: "NOTES", key: "notes", width: 30 }
      ];

      // Removed sample rows as requested by teacher

      // Apply Excel data validation (dropdowns) for rows 2 to 100
      const numWH = warehouses.length;
      const numSupp = suppliers.length;
      const numProd = products.length;

      for (let i = 2; i <= 100; i++) {
        templateSheet.getCell(`C${i}`).dataValidation = {
          type: "date",
          operator: "greaterThan",
          allowBlank: true,
          showErrorMessage: true,
          errorTitle: "Invalid Date",
          error: "Please enter a valid date (e.g. 2026-07-15)",
          formulae: [new Date("2000-01-01")]
        };

        templateSheet.getCell(`F${i}`).dataValidation = {
          type: "whole",
          operator: "greaterThan",
          allowBlank: true,
          showErrorMessage: true,
          errorTitle: "Invalid Quantity",
          error: "Quantity must be a whole number greater than 0.",
          formulae: [0]
        };

        templateSheet.getCell(`G${i}`).dataValidation = {
          type: "decimal",
          operator: "greaterThanOrEqual",
          allowBlank: true,
          showErrorMessage: true,
          errorTitle: "Invalid Unit Cost",
          error: "Unit cost must be a number greater than or equal to 0.",
          formulae: [0]
        };

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
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false }) as any[];

      if (jsonData.length === 0) {
        throw new Error("The Excel file is empty.");
      }

      const cleanJsonData = jsonData;

      if (cleanJsonData.length === 0) {
        throw new Error("No valid data to import. Please fill in your own data.");
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

        // Build remark from Date, Supplier and Notes
        const dateStr = firstRow["DATE (yyyy-mm-dd)"] ? `Date: ${String(firstRow["DATE (yyyy-mm-dd)"]).trim()}` : (firstRow.DATE ? `Date: ${String(firstRow.DATE).trim()}` : "");
        const suppStr = firstRow.SUPPLIER ? `Supplier: ${String(firstRow.SUPPLIER).trim()}` : "";
        const noteStr = firstRow.NOTES ? String(firstRow.NOTES).trim() : "";
        const remark = [dateStr, suppStr, noteStr].filter(Boolean).join(" | ") || null;

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
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="p-5 surface-card border border-border/60 rounded-xl flex flex-col justify-between">
            <div>
              <h3 className="font-semibold text-base mb-2">Step 1: Download Template</h3>
              <p className="text-muted-foreground text-xs leading-relaxed mb-4">
                Start by downloading the standard Excel template. It includes built-in dropdown choices for Warehouses, Suppliers, and Products.
              </p>
            </div>
            <button
              onClick={downloadTemplate}
              disabled={loading}
              className="h-10 px-4 rounded-lg border border-border bg-secondary hover:bg-muted font-medium inline-flex items-center justify-center gap-2 transition-colors w-full"
            >
              <Download className="size-4" /> Download Template
            </button>
          </div>

          <div className="p-5 surface-card border border-border/60 rounded-xl flex flex-col justify-between">
            <div>
              <h3 className="font-semibold text-base mb-2">Step 2: Upload Data</h3>
              <p className="text-muted-foreground text-xs leading-relaxed mb-4">
                Fill out the template. Select options from the dropdown cells in Excel, and upload it back.
              </p>
            </div>

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
              className={`border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:bg-secondary/30 transition-colors ${
                loading ? "opacity-60 pointer-events-none" : ""
              }`}
            >
              <Upload className="size-6 text-muted-foreground mx-auto mb-2" />
              <div className="font-medium text-xs">Click to browse or drag & drop</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">Excel or CSV files up to 5MB</div>
            </div>
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
