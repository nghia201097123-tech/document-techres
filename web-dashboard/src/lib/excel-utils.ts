import * as XLSX from "xlsx";

/**
 * Export data to Excel file and trigger download
 */
export function exportToExcel<T extends Record<string, any>>(
  data: T[],
  columns: { key: keyof T; header: string; width?: number }[],
  filename: string
) {
  // Create worksheet data with headers
  const headers = columns.map((col) => col.header);
  const rows = data.map((item) =>
    columns.map((col) => {
      const value = item[col.key];
      // Format dates
      if (value instanceof Date) {
        return value.toLocaleDateString("vi-VN");
      }
      // Format booleans
      if (typeof value === "boolean") {
        return value ? "Có" : "Không";
      }
      return value ?? "";
    })
  );

  const wsData = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set column widths
  ws["!cols"] = columns.map((col) => ({ wch: col.width || 15 }));

  // Create workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Data");

  // Generate file and trigger download
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

/**
 * Read Excel file and return parsed data
 */
export async function readExcelFile<T>(
  file: File,
  columnMapping: { excelHeader: string; key: keyof T }[]
): Promise<{ data: Partial<T>[]; errors: string[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });

        // Get first sheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Convert to JSON with headers
        const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, {
          raw: false,
          defval: "",
        });

        const errors: string[] = [];
        const parsedData: Partial<T>[] = [];

        jsonData.forEach((row, index) => {
          const rowNumber = index + 2; // Excel row (1-indexed + header)
          const parsedRow: Partial<T> = {};

          columnMapping.forEach(({ excelHeader, key }) => {
            const value = row[excelHeader];
            if (value !== undefined && value !== "") {
              (parsedRow as any)[key] = value;
            }
          });

          // Only add if row has data
          if (Object.keys(parsedRow).length > 0) {
            parsedData.push(parsedRow);
          }
        });

        resolve({ data: parsedData, errors });
      } catch (error) {
        reject(new Error("Không thể đọc file Excel. Vui lòng kiểm tra định dạng file."));
      }
    };

    reader.onerror = () => {
      reject(new Error("Lỗi khi đọc file"));
    };

    reader.readAsArrayBuffer(file);
  });
}

/**
 * Create a template Excel file for importing
 */
export function downloadTemplate(
  columns: { header: string; example?: string; required?: boolean }[],
  filename: string
) {
  const headers = columns.map((col) =>
    col.required ? `${col.header} *` : col.header
  );
  const examples = columns.map((col) => col.example || "");

  const wsData = [headers, examples];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set column widths
  ws["!cols"] = columns.map(() => ({ wch: 20 }));

  // Create workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Template");

  // Generate file and trigger download
  XLSX.writeFile(wb, `${filename}_template.xlsx`);
}

/**
 * Validate imported data
 */
export function validateImportData<T>(
  data: Partial<T>[],
  requiredFields: (keyof T)[],
  validators?: Partial<Record<keyof T, (value: any) => string | null>>
): { valid: Partial<T>[]; errors: { row: number; field: string; message: string }[] } {
  const valid: Partial<T>[] = [];
  const errors: { row: number; field: string; message: string }[] = [];

  data.forEach((row, index) => {
    const rowNumber = index + 2; // Excel row number
    let hasError = false;

    // Check required fields
    requiredFields.forEach((field) => {
      if (!row[field] || (typeof row[field] === "string" && !(row[field] as string).trim())) {
        errors.push({
          row: rowNumber,
          field: String(field),
          message: `Trường "${String(field)}" là bắt buộc`,
        });
        hasError = true;
      }
    });

    // Run custom validators
    if (validators) {
      Object.entries(validators).forEach(([field, validator]) => {
        if (validator && row[field as keyof T]) {
          const error = validator(row[field as keyof T]);
          if (error) {
            errors.push({
              row: rowNumber,
              field,
              message: error,
            });
            hasError = true;
          }
        }
      });
    }

    if (!hasError) {
      valid.push(row);
    }
  });

  return { valid, errors };
}
