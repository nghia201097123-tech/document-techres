import * as XLSX from "xlsx";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

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
      const value = item[col.key] as unknown;
      // Format dates
      if (value instanceof Date) {
        return value.toLocaleDateString("vi-VN");
      }
      // Format booleans
      if (typeof value === "boolean") {
        return value ? "Có" : "Không";
      }
      return (value as string) ?? "";
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
            // Try exact match first, then try without asterisk (required marker)
            let value = row[excelHeader];
            if (value === undefined) {
              // Try with asterisk suffix (required field marker)
              value = row[`${excelHeader} *`];
            }
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
 * Create a template Excel file for importing (simple version)
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
 * Dropdown option for Excel data validation
 */
export interface DropdownOption {
  value: string;
  label: string;
}

/**
 * Column with dropdown configuration
 */
export interface TemplateColumnWithDropdown {
  header: string;
  example?: string;
  required?: boolean;
  dropdown?: DropdownOption[];
  dropdownSheetName?: string;
}

/**
 * Create a template Excel file with reference sheets for dropdown values
 * Users can see available values in reference sheets and copy/paste
 */
export function downloadTemplateWithDropdowns(
  columns: TemplateColumnWithDropdown[],
  filename: string,
  rowCount: number = 50
) {
  const wb = XLSX.utils.book_new();

  // Create headers with required markers
  const headers = columns.map((col) =>
    col.required ? `${col.header} *` : col.header
  );

  // Create main sheet with headers and empty rows
  const mainData: (string | undefined)[][] = [headers];

  // Add example row
  const exampleRow = columns.map((col) => col.example || "");
  mainData.push(exampleRow);

  // Add empty rows for data entry
  for (let i = 0; i < rowCount - 1; i++) {
    mainData.push(columns.map(() => ""));
  }

  const mainWs = XLSX.utils.aoa_to_sheet(mainData);

  // Set column widths
  mainWs["!cols"] = columns.map((col) => ({ wch: col.dropdown ? 30 : 20 }));

  // Add main sheet first
  XLSX.utils.book_append_sheet(wb, mainWs, "NhapDuLieu");

  // Create reference sheets for each dropdown
  const dropdownColumns = columns.filter((col) => col.dropdown && col.dropdown.length > 0);

  if (dropdownColumns.length > 0) {
    // Create a combined reference sheet with all dropdown options
    const maxLength = Math.max(...dropdownColumns.map((col) => col.dropdown!.length));
    const refHeaders = dropdownColumns.map((col) => col.header);
    const refData: string[][] = [refHeaders];

    for (let i = 0; i < maxLength; i++) {
      const row = dropdownColumns.map((col) => col.dropdown![i]?.label || "");
      refData.push(row);
    }

    const refWs = XLSX.utils.aoa_to_sheet(refData);
    refWs["!cols"] = dropdownColumns.map(() => ({ wch: 30 }));
    XLSX.utils.book_append_sheet(wb, refWs, "DanhSachChon");
  }

  // Generate file and trigger download
  XLSX.writeFile(wb, `${filename}_template.xlsx`);
}

/**
 * Create a template Excel file with REAL dropdown data validation using ExcelJS
 */
export async function downloadTemplateWithRealDropdowns(
  columns: TemplateColumnWithDropdown[],
  filename: string,
  rowCount: number = 100
) {
  const workbook = new ExcelJS.Workbook();

  // Create main data entry sheet
  const mainSheet = workbook.addWorksheet("NhapDuLieu");

  // Add headers
  const headerRow = mainSheet.getRow(1);
  columns.forEach((col, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = col.required ? `${col.header} *` : col.header;
    cell.font = { bold: true };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE0E0E0" },
    };
  });

  // Add example row
  const exampleRow = mainSheet.getRow(2);
  columns.forEach((col, index) => {
    exampleRow.getCell(index + 1).value = col.example || "";
  });

  // Set column widths
  columns.forEach((col, index) => {
    mainSheet.getColumn(index + 1).width = col.dropdown ? 25 : 20;
  });

  // Create reference sheet for dropdown values
  const dropdownColumns = columns.filter((col) => col.dropdown && col.dropdown.length > 0);

  if (dropdownColumns.length > 0) {
    const refSheet = workbook.addWorksheet("DanhSachChon");

    // Add dropdown values to reference sheet
    dropdownColumns.forEach((col, colIndex) => {
      // Header
      const headerCell = refSheet.getCell(1, colIndex + 1);
      headerCell.value = col.header;
      headerCell.font = { bold: true };

      // Values - use label for display
      col.dropdown!.forEach((option, rowIndex) => {
        refSheet.getCell(rowIndex + 2, colIndex + 1).value = option.label;
      });

      refSheet.getColumn(colIndex + 1).width = 25;
    });

    // Apply data validation to main sheet columns
    columns.forEach((col, colIndex) => {
      if (col.dropdown && col.dropdown.length > 0) {
        // Find the index in dropdownColumns
        const dropdownColIndex = dropdownColumns.findIndex((dc) => dc.header === col.header);
        if (dropdownColIndex !== -1) {
          const colLetter = getColumnLetter(dropdownColIndex);
          const valueCount = col.dropdown.length;

          // Apply data validation to each row in the column
          for (let row = 2; row <= rowCount + 1; row++) {
            const cell = mainSheet.getCell(row, colIndex + 1);
            cell.dataValidation = {
              type: "list",
              allowBlank: !col.required,
              formulae: [`DanhSachChon!$${colLetter}$2:$${colLetter}$${valueCount + 1}`],
              showErrorMessage: true,
              errorTitle: "Giá trị không hợp lệ",
              error: `Vui lòng chọn một giá trị từ danh sách cho cột "${col.header}"`,
              showInputMessage: true,
              promptTitle: col.header,
              prompt: "Chọn một giá trị từ danh sách",
            };
          }
        }
      }
    });
  }

  // Generate and download file
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  saveAs(blob, `${filename}_template.xlsx`);
}

/**
 * Get Excel column letter from index (0 = A, 1 = B, etc.)
 */
function getColumnLetter(index: number): string {
  let letter = "";
  let temp = index;
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
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
      Object.entries(validators).forEach(([field, validatorFn]) => {
        const validator = validatorFn as ((value: any) => string | null) | undefined;
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
