import * as XLSX from "xlsx";

// ExcelJS and file-saver are loaded dynamically to avoid slowing down the app
// They are only needed when downloading templates with real dropdowns

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
  allowCustomValue?: boolean; // Allow user to enter custom values not in dropdown
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
 * Uses dynamic imports to avoid loading heavy libraries at startup
 */
export async function downloadTemplateWithRealDropdowns(
  columns: TemplateColumnWithDropdown[],
  filename: string,
  rowCount: number = 100
) {
  // Dynamic imports to avoid slowing down the app
  const [ExcelJS, { saveAs }] = await Promise.all([
    import("exceljs"),
    import("file-saver"),
  ]);

  const workbook = new ExcelJS.default.Workbook();

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

            if (col.allowCustomValue) {
              // Allow custom values - show dropdown but don't enforce
              cell.dataValidation = {
                type: "list",
                allowBlank: true,
                formulae: [`DanhSachChon!$${colLetter}$2:$${colLetter}$${valueCount + 1}`],
                showErrorMessage: false, // Don't show error for custom values
                showInputMessage: true,
                promptTitle: col.header,
                prompt: "Chọn từ danh sách hoặc nhập giá trị mới",
              };
            } else {
              // Strict validation - must select from dropdown
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
 * Dependent dropdown configuration
 * Used to create cascading dropdowns where child options depend on parent selection
 */
export interface DependentDropdownConfig {
  parentHeader: string;           // Header of the parent column (e.g., "Tỉnh/Thành phố")
  childHeader: string;            // Header of the child column (e.g., "Phường/Xã")
  parentOptions: DropdownOption[]; // Parent dropdown options
  childOptionsByParent: Map<string, DropdownOption[]>; // Map of parent label -> child options
}

/**
 * Sanitize string to be used as Excel named range
 * Excel named ranges cannot contain spaces or special characters
 */
function sanitizeForNamedRange(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
    .replace(/đ/g, "d").replace(/Đ/g, "D") // Handle Vietnamese đ
    .replace(/[^a-zA-Z0-9]/g, "_") // Replace non-alphanumeric with underscore
    .replace(/^(\d)/, "_$1") // Prefix with _ if starts with number
    .substring(0, 30); // Limit length
}

/**
 * Create a template Excel file with dependent dropdowns using ExcelJS
 * Supports cascading dropdowns where child options depend on parent selection
 */
export async function downloadTemplateWithDependentDropdowns(
  columns: TemplateColumnWithDropdown[],
  dependentDropdowns: DependentDropdownConfig[],
  filename: string,
  rowCount: number = 100
) {
  // Dynamic imports
  const [ExcelJS, { saveAs }] = await Promise.all([
    import("exceljs"),
    import("file-saver"),
  ]);

  const workbook = new ExcelJS.default.Workbook();

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
    mainSheet.getColumn(index + 1).width = col.dropdown ? 30 : 20;
  });

  // Get columns that are NOT part of dependent dropdowns (as child)
  const dependentChildHeaders = new Set(dependentDropdowns.map(d => d.childHeader));
  const simpleDropdownColumns = columns.filter(
    (col) => col.dropdown && col.dropdown.length > 0 && !dependentChildHeaders.has(col.header)
  );

  // Create reference sheet for simple dropdowns
  if (simpleDropdownColumns.length > 0) {
    const refSheet = workbook.addWorksheet("DanhSachChon");

    simpleDropdownColumns.forEach((col, colIndex) => {
      // Header
      const headerCell = refSheet.getCell(1, colIndex + 1);
      headerCell.value = col.header;
      headerCell.font = { bold: true };

      // Values
      col.dropdown!.forEach((option, rowIndex) => {
        refSheet.getCell(rowIndex + 2, colIndex + 1).value = option.label;
      });

      refSheet.getColumn(colIndex + 1).width = 30;
    });

    // Apply simple dropdown validations
    columns.forEach((col, colIndex) => {
      if (col.dropdown && col.dropdown.length > 0 && !dependentChildHeaders.has(col.header)) {
        const dropdownColIndex = simpleDropdownColumns.findIndex((dc) => dc.header === col.header);
        if (dropdownColIndex !== -1) {
          const colLetter = getColumnLetter(dropdownColIndex);
          const valueCount = col.dropdown.length;

          for (let row = 2; row <= rowCount + 1; row++) {
            const cell = mainSheet.getCell(row, colIndex + 1);
            cell.dataValidation = {
              type: "list",
              allowBlank: !col.required,
              formulae: [`DanhSachChon!$${colLetter}$2:$${colLetter}$${valueCount + 1}`],
              showErrorMessage: !col.allowCustomValue,
              errorTitle: "Giá trị không hợp lệ",
              error: `Vui lòng chọn một giá trị từ danh sách cho cột "${col.header}"`,
              showInputMessage: true,
              promptTitle: col.header,
              prompt: col.allowCustomValue ? "Chọn từ danh sách hoặc nhập giá trị mới" : "Chọn một giá trị từ danh sách",
            };
          }
        }
      }
    });
  }

  // Create sheets for dependent dropdowns
  for (const depConfig of dependentDropdowns) {
    const depSheet = workbook.addWorksheet(sanitizeForNamedRange(depConfig.childHeader).substring(0, 20));

    // Build columns for each parent option
    let colIndex = 0;
    const namedRanges: { name: string; ref: string }[] = [];

    for (const parentOption of depConfig.parentOptions) {
      const childOptions = depConfig.childOptionsByParent.get(parentOption.label) || [];
      if (childOptions.length === 0) continue;

      // Header (parent name)
      const headerCell = depSheet.getCell(1, colIndex + 1);
      headerCell.value = parentOption.label;
      headerCell.font = { bold: true };

      // Child values
      childOptions.forEach((childOpt, rowIndex) => {
        depSheet.getCell(rowIndex + 2, colIndex + 1).value = childOpt.label;
      });

      depSheet.getColumn(colIndex + 1).width = 30;

      // Create named range for this parent's children
      const rangeName = sanitizeForNamedRange(parentOption.label);
      const colLetter = getColumnLetter(colIndex);
      const sheetName = depSheet.name;

      // Add named range to workbook
      namedRanges.push({
        name: rangeName,
        ref: `'${sheetName}'!$${colLetter}$2:$${colLetter}$${childOptions.length + 1}`,
      });

      colIndex++;
    }

    // Define named ranges in workbook
    // ExcelJS doesn't have direct named range support, so we need to use definedNames
    namedRanges.forEach(({ name, ref }) => {
      // @ts-ignore - ExcelJS internal API
      if (!workbook.definedNames) {
        // @ts-ignore
        workbook.definedNames = { model: [] };
      }
      // @ts-ignore
      workbook.definedNames.model.push({
        name: name,
        ranges: [ref],
      });
    });

    // Find parent and child column indices in main sheet
    const parentColIndex = columns.findIndex((c) => c.header === depConfig.parentHeader);
    const childColIndex = columns.findIndex((c) => c.header === depConfig.childHeader);

    if (parentColIndex !== -1 && childColIndex !== -1) {
      const parentColLetter = getColumnLetter(parentColIndex);
      const childCol = columns[childColIndex];

      // Apply INDIRECT validation to child column
      for (let row = 2; row <= rowCount + 1; row++) {
        const cell = mainSheet.getCell(row, childColIndex + 1);

        // Use INDIRECT formula to reference named range based on parent cell value
        // The formula sanitizes the parent value to match our named range names
        cell.dataValidation = {
          type: "list",
          allowBlank: !childCol?.required,
          // INDIRECT formula that references the named range based on parent selection
          // We use SUBSTITUTE to handle Vietnamese characters and spaces
          formulae: [`INDIRECT(SUBSTITUTE(SUBSTITUTE(SUBSTITUTE(SUBSTITUTE(SUBSTITUTE($${parentColLetter}$${row}," ","_"),"ắ","a"),"ằ","a"),"ẳ","a"),"ẵ","a"))`],
          showErrorMessage: false, // Don't show error since INDIRECT might fail
          showInputMessage: true,
          promptTitle: depConfig.childHeader,
          prompt: `Chọn ${depConfig.childHeader} phù hợp với ${depConfig.parentHeader} đã chọn`,
        };
      }
    }
  }

  // Generate and download file
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  saveAs(blob, `${filename}_template.xlsx`);
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
