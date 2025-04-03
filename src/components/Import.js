import React, { useState, useRef, useEffect, useMemo } from "react";
import * as XLSX from "xlsx";
import { 
  Button, Card, CardContent, Typography, Box, Paper, Table, TableBody, 
  TableCell, TableHead, TableRow, Chip, LinearProgress, Dialog, 
  DialogTitle, DialogContent, DialogActions, TextField, Checkbox, 
  FormControlLabel, Tooltip, Tab, Tabs, IconButton, Grid,
  TablePagination, CircularProgress, Fade, Slide
} from "@mui/material";
import { 
  CloudUpload, Delete, CheckCircle, Error, Close, Refresh, 
  SaveAlt, Warning, Check, AutoFixHigh, Filter1, Spellcheck,
  Transgender, DateRange, Numbers, LocationOn, Badge
} from '@mui/icons-material';
import Swal from "sweetalert2";

// Add this new component for the progress bar
const ValidationProgressBar = ({ progress, isValidating }) => (
  <Slide direction="down" in={isValidating} mountOnEnter unmountOnExit>
    <Box sx={{ width: '100%', mt: 2, mb: 2 }}>
      <LinearProgress 
        variant="determinate" 
        value={progress} 
        sx={{ 
          height: 10,
          borderRadius: 5,
          transition: 'all 0.3s ease-out'
        }} 
      />
      <Typography variant="caption" display="block" textAlign="center" mt={1}>
        Validating data... {progress}%
      </Typography>
    </Box>
  </Slide>
);

const LazyLoadedDataTable = ({ data, headers, validation, pagination, onChangePage, onChangeRowsPerPage }) => {
  const [visibleRows, setVisibleRows] = useState([]);

  useEffect(() => {
    const start = pagination.page * pagination.rowsPerPage;
    const end = start + pagination.rowsPerPage;
    // data[0] = headers, data[1] = ADRIAN (row 1), data[2] = ALEXITO (row 2)
    const rowsToShow = data.slice(1).slice(start, end);
    setVisibleRows(rowsToShow);
  }, [data, pagination]);

  return (
    <>
      <Paper style={{ maxHeight: '70vh', overflow: 'auto' }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>File Row #</TableCell>
              {headers.map((header, i) => (
                <TableCell key={i}>{header}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {visibleRows.map((row, rowIndex) => {
              const fileRowNumber = (pagination.page * pagination.rowsPerPage) + rowIndex + 1;
              
              return (
                <TableRow key={fileRowNumber}>
                  <TableCell>{fileRowNumber}</TableCell>
                  {row.map((cell, colIndex) => (
                    <TableCell key={colIndex}>
                      {cell || <span style={{ color: '#999' }}>-</span>}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Paper>
      <TablePagination
        rowsPerPageOptions={[10, 25, 50, 100]}
        count={data.length - 1} // Exclude header
        rowsPerPage={pagination.rowsPerPage}
        page={pagination.page}
        onPageChange={onChangePage}
        onRowsPerPageChange={onChangeRowsPerPage}
      />
    </>
  );
};

const Import = () => {
  const fileInputRef = useRef(null);
  const [processing, setProcessing] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationProgress, setValidationProgress] = useState(0);
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState(0);
  const [data, setData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [validation, setValidation] = useState({
    errors: [],
    warnings: [],
    validRows: [],
    invalidRows: [],
    cellErrors: {}
  });
  const [showValidation, setShowValidation] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportFileName, setExportFileName] = useState(`data_${new Date().toISOString().slice(0, 10)}`);
  const [autoFixOptions, setAutoFixOptions] = useState({
    cleanSpecialChars: false,
    formatMobileNumbers: false,
    standardizeGender: false,
    cleanSpaces: false,
    cleanMiddleNames: false,
    standardizeRegion: false,
    cleanMotherMaidenName: false,
    cleanExtensionName: false
  });
  const [activeTab, setActiveTab] = useState(0);
  const [pagination, setPagination] = useState({
    page: 0,
    rowsPerPage: 100
  });

  const requiredFields = ['FIRSTNAME', 'LASTNAME', 'RSBSASYSTEMGENERATEDNUMBER', 'SEX', 'BIRTHDATE'];

  const standardizeHeader = (name) => (name || '').toString().trim().toUpperCase();

  const [validationPagination, setValidationPagination] = useState({
    page: 0,
    rowsPerPage: 100
  });
  
  // Stable version of page change handler
  const handleValidationPageChange = (event, newPage) => {
    setValidationPagination(prev => ({
      ...prev,
      page: newPage
    }));
  };
  
  // Stable version of rows per page change
  const handleValidationRowsPerPageChange = (event) => {
    setValidationPagination({
      page: 0,  // Reset to first page when changing page size
      rowsPerPage: parseInt(event.target.value, 10)
    });
  };

  // Get this before your return statement
  const processedErrors = useMemo(() => {
    // Create a map to store unique errors by row+column
    const errorMap = new Map();
    
    validation.errors.forEach(error => {
      const key = `${error.row}-${error.column}`;
      if (!errorMap.has(key)) {
        errorMap.set(key, error);
      }
    });
    
    // Convert back to array and sort by row number
    return Array.from(errorMap.values()).sort((a, b) => a.row - b.row);
  }, [validation.errors]);

  console.log("Rows", data[0]);

  const validationResults = useMemo(() => {
    const cellErrors = {};
    const rowValidity = {};
    
    validation.errors.forEach(error => {
      const cellKey = `${error.row}-${error.column}`;
      cellErrors[cellKey] = true;
      rowValidity[error.row] = false;
    });
    
    return { cellErrors, rowValidity };
  }, [validation.errors]);

  const cleanText = (text, preserveSpaces = true) => {
    if (!text) return text;
    
    // First pass - basic cleaning
    let cleaned = text.toString()
      .replace(/Ñ/g, 'N')
      .replace(/ñ/g, 'n')
      .replace(/[^a-zA-Z0-9\s\-.,]/g, '');  // Allow basic punctuation
  
    // Second pass - clean spaces
    if (preserveSpaces) {
      cleaned = cleaned.replace(/\s{2,}/g, ' ').trim();
    } else {
      cleaned = cleaned.replace(/\s+/g, ' ').trim();
    }
  
    return cleaned;
  };

  const formatMobile = (num) => {
    if (!num) return num;
    const digits = num.toString().replace(/\D/g, '');
    return digits.length === 11 && digits.startsWith('0') ? digits.substring(1) : digits;
  };

  const fixBarangayCertificate = (value) => {
    return 'Barangay Certificate';
  };

  const formatGender = (gender) => {
    if (!gender) return gender;
    const g = gender.toString().toUpperCase();
    if (g === 'M' || g === 'MALE') return 'MALE';
    if (g === 'F' || g === 'FEMALE') return 'FEMALE';
    return g;
  };

  const cleanNameText = (text) => {
    if (!text) return text;
    return text.toString()
      .replace(/[^a-zA-Z\s-]/g, '')
      .replace(/\s{2,}/g, ' ') 
  };

  const cleanMiddleName = (name) => {
    if (!name) return '';
    let cleaned = cleanNameText(name);
    const lower = cleaned.toLowerCase();
    return ['n/a', 'na', 'not applicable', ''].includes(lower) ? '' : cleaned;
  };

  const cleanExtensionName = (name) => {
    if (!name) return '';
    return name.toString()
      .replace(/\./g, '')
      .replace(/\s+/g, '')
      .trim()
      .toUpperCase();
  };

  const cleanMotherMaidenName = (name) => {
    if (!name) return '';
    // Remove special characters but allow hyphens and apostrophes
    let cleaned = name.toString()
      .replace(/[^a-zA-Z\s\-']/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
    // Remove if it's just "n/a" or similar
    const lower = cleaned.toLowerCase();
    return ['n/a', 'na', 'not applicable', ''].includes(lower) ? '' : cleaned;
  };

  const formatRegion = (region) => {
    if (!region) return region;
    const cleaned = region.replace(/\(.*?\)/g, '').trim();
    const regionMap = {
      'REGION I': 'REGION I ILOCOS REGION',
      'REGION II': 'REGION II CAGAYAN VALLEY',
      'REGION III': 'REGION III CENTRAL LUZON',
      'REGION IV-A': 'REGION IV-A CALABARZON',
      'REGION IV-B': 'REGION IV-B MIMAROPA',
      'REGION V': 'REGION V BICOL REGION',
      'REGION VI': 'REGION VI WESTERN VISAYAS',
      'REGION VII': 'REGION VII CENTRAL VISAYAS',
      'REGION VIII': 'REGION VIII EASTERN VISAYAS',
      'REGION IX': 'REGION IX ZAMBOANGA PENINSULA',
      'REGION X': 'REGION X NORTHERN MINDANAO',
      'REGION XI': 'REGION XI DAVAO REGION',
      'REGION XII': 'REGION XII SOCCSKSARGEN',
      'REGION XIII': 'REGION XIII CARAGA',
      'BARMM': 'BARMM BANGSAMORO AUTONOMOUS REGION IN MUSLIM MINDANAO',
      'CAR': 'CAR CORDILLERA ADMINISTRATIVE REGION',
      'NCR': 'NCR NATIONAL CAPITAL REGION',
    };    
    return regionMap[cleaned] || cleaned;
  };

  const validateSystemNumber = (num) => {
    if (!num) return false;
    return /^\d{2}-\d{2}-\d{2}-\d{3}-\d{6}$/.test(num.toString());
  };  

  const validateIdNumber = (id, type) => {
    if (!id) return false;
    if (type && type.toString().toUpperCase().includes('BARANGAY')) {
      return id.toString().toUpperCase() === 'BARANGAY CERTIFICATE';
    }
    return true;
  };

  const validateProvince = (province) => {
    if (!province) return false;
    return !/[#@$%^&*]/.test(province.toString());
  };

  const validateCityMunicipality = (CityMunicipality) => {
    if (!CityMunicipality) return false;
    return !/[#@$%^&*]/.test(CityMunicipality.toString());
  };

  const validateData = (data) => {
    const errors = [];
    const warnings = [];
    const validRows = [];
    const invalidRows = [];
    const cellErrors = {};

    const noSpecialCharsFields = [
      'STREETNO_PUROKNO', 
      'BARANGAY', 
      'CITYMUNICIPALITY', 
      'DISTRICT',
      'PROVINCE',
      'REGION',
      'PLACEOFBIRTH',
      'NATIONALITY',
      'PROFESSION',
      'SOURCEOFFUNDS',
      'MOTHERMAIDENNAME',
      'NOOFFARMPARCEL'
    ];
    
    for (let arrayIndex = 1; arrayIndex < data.length; arrayIndex++) {
      const fileRowNumber = arrayIndex;
      const row = data[arrayIndex];
      const rowErrors = [];
      const rowWarnings = [];
      const rowData = {};
      let hasErrors = false;
  
      headers.forEach((header, colIndex) => {
        const originalColNumber = colIndex + 1;
        let value = row[colIndex];
        const stdHeader = standardizeHeader(header);
        rowData[stdHeader] = value;
  
        // All validation checks use fileRowNumber
        if (requiredFields.includes(stdHeader) && !value) {
          const error = {
            field: header,
            message: 'Required field is empty',
            value,
            row: fileRowNumber, // Actual row number from file
            column: originalColNumber
          };
          rowErrors.push(error);
          cellErrors[`${fileRowNumber}-${originalColNumber}`] = true;
          hasErrors = true;
        }

        // Apply auto-fixes if enabled
        if (autoFixOptions.cleanSpecialChars) {
          value = cleanText(value);
          row[colIndex] = value;
          rowData[stdHeader] = value;
        }

        if (autoFixOptions.formatMobileNumbers && stdHeader === 'MOBILENO') {
          value = formatMobile(value);
          row[colIndex] = value;
          rowData[stdHeader] = value;
        }

        if (autoFixOptions.standardizeGender && stdHeader === 'SEX') {
          value = formatGender(value);
          row[colIndex] = value;
          rowData[stdHeader] = value;
        }

        if (autoFixOptions.cleanMiddleNames && stdHeader === 'MIDDLENAME') {
          value = cleanMiddleName(value);
          row[colIndex] = value;
          rowData[stdHeader] = value;
        }

        if (autoFixOptions.cleanSpaces && ['FIRSTNAME', 'LASTNAME'].includes(stdHeader)) {
          value = (value || '').toString().replace(/\s{2,}/g, ' ').trim();
          row[colIndex] = value;
          rowData[stdHeader] = value;
        }

        if (autoFixOptions.standardizeRegion && stdHeader === 'REGION') {
          value = formatRegion(value);
          row[colIndex] = value;
          rowData[stdHeader] = value;
        }

        if (autoFixOptions.cleanMotherMaidenName && stdHeader === 'MOTHERMAIDENNAME') {
          value = cleanMotherMaidenName(value);
          row[colIndex] = value;
          rowData[stdHeader] = value;
        }

        if (autoFixOptions.cleanExtensionName && stdHeader === 'EXTENSIONNAME') {
          value = cleanExtensionName(value);
          row[colIndex] = value;
          rowData[stdHeader] = value;
        }

      // Validation checks
      if (requiredFields.includes(stdHeader)) {
        if (!value) {
          const error = {
            field: header,
            message: 'Required field is empty',
            value,
            row: fileRowNumber, // Using original row number
            column: originalColNumber // Using original column number
          };
          rowErrors.push(error);
          cellErrors[`${fileRowNumber}-${originalColNumber}`] = true;
          hasErrors = true;
        }
      }

      if (value && noSpecialCharsFields.includes(stdHeader)) {
        const hasSpecialChars = /[^a-zA-Z0-9\s\-.,]/.test(value.toString());
        if (hasSpecialChars) {
          const error = {
            field: header,
            message: 'Contains invalid special characters',
            value,
            row: fileRowNumber, // Using original row number
            column: originalColNumber // Using original column number
          };
          rowErrors.push(error);
          cellErrors[`${fileRowNumber}-${originalColNumber}`] = true;
          hasErrors = true;
        }
      }

      if (value) {
        if (['FIRSTNAME', 'LASTNAME', 'MIDDLENAME'].includes(stdHeader)) {
          // Check for special characters
          const hasInvalidChars = /[^a-zA-Z\s-]/.test(value.toString());
          if (hasInvalidChars) {
            const error = {
              field: header,
              message: 'Contains invalid characters (only letters, spaces and hyphens allowed)',
              value,
              row: fileRowNumber, // Using original row number
              column: originalColNumber // Using original column number
            };
            rowErrors.push(error);
            cellErrors[`${fileRowNumber}-${originalColNumber}`] = true;
            hasErrors = true;
          }
          
          // Check minimum length
          if (value.replace(/\s/g, '').length < 2) {
            const error = {
              field: header,
              message: 'Must be at least 2 characters',
              value,
              row: fileRowNumber, // Using original row number
              column: originalColNumber // Using original column number
            };
            rowErrors.push(error);
            cellErrors[`${fileRowNumber}-${originalColNumber}`] = true;
            hasErrors = true;
          }
          
          // Check for numbers
          if (/\d/.test(value)) {
            const error = {
              field: header,
              message: 'Contains numbers (only letters allowed)',
              value,
              row: fileRowNumber, // Using original row number
              column: originalColNumber // Using original column number
            };
            rowErrors.push(error);
            cellErrors[`${fileRowNumber}-${originalColNumber}`] = true;
            hasErrors = true;
          }
          
          // Check for extra spaces
          if (/\s{2,}/.test(value)) {
            rowWarnings.push({
              field: header,
              message: 'Extra spaces detected',
              value,
              row: fileRowNumber, // Using original row number
              column: originalColNumber // Using original column number
            });
          }
        }

        if (stdHeader === 'RSBSASYSTEMGENERATEDNUMBER' && !validateSystemNumber(value)) {
          const error = {
            field: header,
            message: 'Invalid system number (numbers only)',
            value,
            row: fileRowNumber, // Using original row number
            column: originalColNumber // Using original column number
          };
          rowErrors.push(error);
          cellErrors[`${fileRowNumber}-${originalColNumber}`] = true;
          hasErrors = true;
        }

        if (stdHeader === 'IDNUMBER') {
          const idType = rowData['GOVTIDTYPE']?.toString().toUpperCase().trim();
          
          if (idType === 'BARANGAY CERTIFICATE') {
            if (value.toString().toUpperCase().trim() !== 'BARANGAY CERTIFICATE') {
              const error = {
                field: header,
                message: 'Must be exactly "Barangay Certificate" when ID type is Barangay Certificate',
                value,
                row: fileRowNumber, // Using original row number
                column: originalColNumber // Using original column number
              };
              rowErrors.push(error);
              cellErrors[`${fileRowNumber}-${originalColNumber}`] = true;
              hasErrors = true;
            }
          }
        }

        if (stdHeader === 'MOBILENO') {
          const digits = value.toString().replace(/\D/g, '');
          if (digits.length !== 10) {
            const error = {
              field: header,
              message: 'Mobile number must be 10 digits',
              value,
              row: fileRowNumber, // Using original row number
              column: originalColNumber // Using original column number
            };
            rowErrors.push(error);
            cellErrors[`${fileRowNumber}-${originalColNumber}`] = true;
            hasErrors = true;
          }
        }

        if (stdHeader === 'SEX' && !['MALE', 'FEMALE'].includes(value.toString().toUpperCase())) {
          const error = {
            field: header,
            message: 'Invalid gender (must be MALE or FEMALE)',
            value,
            row: fileRowNumber, // Using original row number
            column: originalColNumber // Using original column number
          };
          rowErrors.push(error);
          cellErrors[`${fileRowNumber}-${originalColNumber}`] = true;
          hasErrors = true;
        }

        if (stdHeader === 'BIRTHDATE') {
          if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            const error = {
              field: header,
              message: 'Invalid date format (YYYY-MM-DD required)',
              value,
              row: fileRowNumber, // Using original row number
              column: originalColNumber // Using original column number
            };
            rowErrors.push(error);
            cellErrors[`${fileRowNumber}-${originalColNumber}`] = true;
            hasErrors = true;
          } else {
            const birthDate = new Date(value);
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
              age--;
            }
            
            if (age < 18 || age > 100) {
              const error = {
                field: header,
                message: `Age must be 18-100 (current: ${age})`,
                value,
                row: fileRowNumber, // Using original row number
                column: originalColNumber // Using original column number
              };
              rowErrors.push(error);
              cellErrors[`${fileRowNumber}-${originalColNumber}`] = true;
              hasErrors = true;
            }
          }
        }

        if (stdHeader === 'MOTHERMAIDENNAME') {
          const cleanedValue = cleanMotherMaidenName(value);
          if (cleanedValue !== value.toString().trim()) {
            rowWarnings.push({
              field: header,
              message: 'Special characters detected and cleaned',
              value: value,
              row: fileRowNumber, // Using original row number
              column: originalColNumber // Using original column number
            });
            row[colIndex] = cleanedValue;
            rowData[stdHeader] = cleanedValue;
          }
        }
        
        if (stdHeader === 'EXTENSIONNAME' && value && /[.]/.test(value)) {
          rowWarnings.push({
            field: header,
            message: 'Remove periods from extension name',
            value,
            row: fileRowNumber, // Using original row number
            column: originalColNumber // Using original column number
          });
        }
        
        if (stdHeader === 'PROVINCE' && !validateProvince(value)) {
          const error = {
            field: header,
            message: 'Invalid province format (special characters not allowed)',
            value,
            row: fileRowNumber, // Using original row number
            column: originalColNumber // Using original column number
          };
          rowErrors.push(error);
          cellErrors[`${fileRowNumber}-${originalColNumber}`] = true;
          hasErrors = true;
        }
      }
    });

    if (hasErrors) {
      invalidRows.push({
        row: fileRowNumber,
        data: rowData,
        errors: rowErrors,
        warnings: rowWarnings
      });
      errors.push(...rowErrors);
    } else {
      validRows.push({
        row: fileRowNumber,
        data: rowData
      });
    }
    
    warnings.push(...rowWarnings);
  }

  return { errors, warnings, validRows, invalidRows, cellErrors };
};

  const processFile = (file) => {
    setProcessing(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const workbook = XLSX.read(e.target.result, { type: "binary" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const parsedData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

      const standardizedHeaders = parsedData[0].map(header => standardizeHeader(header));
      parsedData[0] = standardizedHeaders;

      setData(parsedData);
      setHeaders(standardizedHeaders);
      setFileName(file.name);
      setFileSize(file.size);
      setProcessing(false);
    };
    reader.readAsBinaryString(file);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) processFile(file);
  };

  const handleRemoveFile = () => {
    setData([]);
    setHeaders([]);
    setFileName("");
    setFileSize(0);
    setValidation({
      errors: [],
      warnings: [],
      validRows: [],
      invalidRows: [],
      cellErrors: {}
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const runValidation = async () => {
    if (data.length === 0) {
      Swal.fire("Error", "No data to validate", "error");
      return;
    }
  
    setIsValidating(true);
    setValidationProgress(0);
    setShowValidation(false);
  
    const totalRows = data.length - 1;
    let progress = 0;
  
    // Simulate progress updates
    const progressInterval = setInterval(() => {
      progress += 1;
      setValidationProgress(progress);
      if (progress >= 100) clearInterval(progressInterval);
    }, 30);
  
    // Perform validation on all data
    const validationResults = validateData(data);
  
    clearInterval(progressInterval);
    setValidation(validationResults);
    setIsValidating(false);
    setShowValidation(true);
  };

  const applyFix = (type) => {
    const newData = [...data];
    
    newData.forEach((row, rowIndex) => {
      if (rowIndex === 0) return;
      
      // Create an object with all current row values for easy access
      const currentRowData = {};
      headers.forEach((header, colIndex) => {
        currentRowData[standardizeHeader(header)] = row[colIndex];
      });
  
      headers.forEach((header, colIndex) => {
        const stdHeader = standardizeHeader(header);
        let value = row[colIndex];
        
        switch(type) {
          case 'specialChars':
            if (['FIRSTNAME', 'LASTNAME', 'MIDDLENAME'].includes(stdHeader)) {
              value = cleanNameText(value);
            } else {
              value = cleanText(value);
            }
            break;
          case 'mobile':
            if (stdHeader === 'MOBILENO') {
              value = formatMobile(value);
            }
            break;
          case 'gender':
            if (stdHeader === 'SEX') {
              value = formatGender(value);
            }
            break;
          case 'spaces':
            if (['FIRSTNAME', 'LASTNAME'].includes(stdHeader)) {
              value = value.replace(/\s{2,}/g, ' ').trim();
            }
            break;
          case 'middlename':
            if (stdHeader === 'MIDDLENAME') {
              value = cleanMiddleName(value);
            }
            break;
          case 'motherMaiden':
            if (stdHeader === 'MOTHERMAIDENNAME') {
              value = cleanMotherMaidenName(value);
            }
            break;
          case 'extension':
            if (stdHeader === 'EXTENSIONNAME') {
              value = cleanExtensionName(value);
            }
            break;
          case 'region':
            if (stdHeader === 'REGION') {
              value = formatRegion(value);
            }
            break;
            case 'barangayId':
              if (stdHeader === 'IDNUMBER') {
                const govtIdType = currentRowData['GOVTIDTYPE']?.toString().toUpperCase().trim();
                if (govtIdType === 'BARANGAY CERTIFICATE') {
                  value = 'Barangay Certificate'; // Set exact required value
                }
              }
            break;
          default:
            break;
        }
        
        row[colIndex] = value;
      });
    });
    
    setData(newData);
    setValidation(validateData(newData));
  };
  
  const handleApplyAllFixes = () => {
    setAutoFixOptions({
      cleanSpecialChars: true,
      formatMobileNumbers: true,
      standardizeGender: true,
      cleanSpaces: true,
      cleanMiddleNames: true,
      standardizeRegion: true,
      cleanMotherMaidenName: true,
      cleanExtensionName: true
    });
    
    const newData = [...data];
    
    newData.forEach((row, rowIndex) => {
      if (rowIndex === 0) return;
      
      headers.forEach((header, colIndex) => {
        const stdHeader = standardizeHeader(header);
        let value = row[colIndex];
        
        // Apply all fixes
        value = cleanText(value);
        
        if (stdHeader === 'MOBILENO') {
          value = formatMobile(value);
        }
        
        if (stdHeader === 'SEX') {
          value = formatGender(value);
        }
        
        if (['FIRSTNAME', 'LASTNAME'].includes(stdHeader)) {
          value = value.replace(/\s{2,}/g, ' ').trim();
        }
        
        if (stdHeader === 'MIDDLENAME') {
          value = cleanMiddleName(value);
        }
        
        if (stdHeader === 'MOTHERMAIDENNAME') {
          value = cleanMotherMaidenName(value);
        }
        
        if (stdHeader === 'EXTENSIONNAME') {
          value = cleanExtensionName(value);
        }
        
        if (stdHeader === 'REGION') {
          value = formatRegion(value);
        }
        
        row[colIndex] = value;
      });
    });
    
    setData(newData);
    setValidation(validateData(newData));
  };

const exportToExcel = async () => {
  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Data');

  worksheet.columns = headers.map(header => ({
    header: header.toUpperCase(),
    key: header,
    width: 20,
    style: {
      font: { name: 'Calibri', size: 11, bold: true }
    }
  }));

  data.slice(1).forEach((row, rowIndex) => {
    const rowObj = {};
    headers.forEach((header, colIndex) => {
      rowObj[header] = row[colIndex];
    });

    const excelRow = worksheet.addRow(rowObj);
    
    excelRow.eachCell((cell) => {
      cell.style = {
        font: { name: 'Calibri', size: 11 },
        alignment: { vertical: 'middle', horizontal: 'left' }
      };

      const cellKey = `${rowIndex + 2}-${cell.col}`;
      const hasError = validation.cellErrors[cellKey];
      const hasWarning = validation.warnings.some(
        w => w.row === rowIndex + 2 && w.column === cell.col
      );

      // Special validation for Barangay Certificate IDs
      const isIdNumberCell = headers[cell.col - 1] === 'IDNUMBER';
      const govtIdType = row[headers.indexOf('GOVTIDTYPE')];
      const isBarangayCert = govtIdType?.toString().toUpperCase().includes('BARANGAY CERTIFICATE', 'Barangay Certificate');
      
      if (isIdNumberCell && isBarangayCert) {
        const idValue = row[headers.indexOf('IDNUMBER')]?.toString().toUpperCase();
        if (idValue !== 'BARANGAY CERTIFICATE') {
          cell.style.fill = { 
          };
          cell.note = {
            texts: [{ text: 'Must be "Barangay Certificate" for Certificate' }]
          };
          return;
        }
      }
    });
  });
  
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${exportFileName}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat(bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i];
  };

  const handleChangePage = (event, newPage) => {
    setPagination({ ...pagination, page: newPage });
  };

  const handleChangeRowsPerPage = (event) => {
    setPagination({
      page: 0,
      rowsPerPage: parseInt(event.target.value, 10)
    });
  };

  return (
    <div className="p-4 space-y-4" style={{
      transition: 'all 0.3s ease-out',
      opacity: isValidating ? 0.8 : 1,
      filter: isValidating ? 'blur(1px)' : 'none'
    }}>
      <div className="flex justify-between items-center">
        <div>
          <Typography variant="h5">Data Cleaning</Typography>
          <Typography variant="body2" color="textSecondary">
            Upload and validate beneficiary data files
          </Typography>
        </div>
        {fileName && (
          <div className="flex items-center gap-2">
            <Chip label={fileName} onDelete={handleRemoveFile} />
            <Chip label={formatSize(fileSize)} color="info" size="small" />
          </div>
        )}
      </div>

      <Card>
        <CardContent className="text-center p-6">
          {processing ? (
            <div className="space-y-4">
              <Refresh className="animate-spin text-blue-500" style={{ fontSize: "3rem" }} />
              <Typography>Processing file...</Typography>
              <LinearProgress />
            </div>
          ) : (
            <div className="space-y-4">
              <CloudUpload style={{ fontSize: "4rem", color: "#3f51b5" }} />
              <Typography variant="h6">Drag & drop files here</Typography>
              <Typography variant="body2" color="textSecondary">
                Supported formats: .xlsx, .csv (Max 10MB)
              </Typography>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept=".xlsx,.csv" 
                className="hidden" 
              />
              <Button
                variant="contained"
                color="primary"
                onClick={() => fileInputRef.current.click()}
                startIcon={<CloudUpload />}
              >
                Browse Files
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {data.length > 0 && (
        <div className="flex justify-end gap-2">
          <Button
            variant="outlined"
            color="error"
            startIcon={<Delete />}
            onClick={handleRemoveFile}
            disabled={isValidating}
          >
            Clear
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={isValidating ? <CircularProgress size={20} color="inherit" /> : <CheckCircle />}
            onClick={runValidation}
            disabled={isValidating || data.length === 0}
          >
            {isValidating ? 'Validating...' : 'Validate Data'}
          </Button>
        </div>
      )}

      <ValidationProgressBar progress={validationProgress} isValidating={isValidating} />

      {data.length > 0 && (
        <div className="space-y-2">
          <Typography variant="h6">Data Preview ({data.length - 1} rows)</Typography>
          <LazyLoadedDataTable 
            data={data}
            headers={headers}
            validation={validation}
            pagination={pagination}
            onChangePage={handleChangePage}
            onChangeRowsPerPage={handleChangeRowsPerPage}
          />
        </div>
      )}

      <Dialog
        open={showValidation}
        onClose={() => setShowValidation(false)}
        maxWidth="xl"
        fullWidth
        scroll="paper"
        TransitionComponent={Slide}
        transitionDuration={300}
      >
        <DialogTitle>
          <div className="flex justify-between items-center">
            <Typography variant="h6">Data Validation Results</Typography>
            <Button onClick={() => setShowValidation(false)}>
              <Close />
            </Button>
          </div>
        </DialogTitle>
        <DialogContent dividers>
          <div className="grid grid-cols-4 gap-4 mb-4">
            <Card className="bg-red-50">
              <CardContent className="text-center">
                <Typography color="textSecondary">Errors</Typography>
                <Typography variant="h4" color="error">
                  {validation.errors.length}
                </Typography>
              </CardContent>
            </Card>
            <Card className="bg-green-50">
              <CardContent className="text-center">
                <Typography color="textSecondary">Valid Rows</Typography>
                <Typography variant="h4" color="success.main">
                  {validation.validRows.length}
                </Typography>
              </CardContent>
            </Card>
            <Card className="bg-orange-50">
              <CardContent className="text-center">
                <Typography color="textSecondary">Warnings</Typography>
                <Typography variant="h4" color="warning.main">
                  {validation.warnings.length}
                </Typography>
              </CardContent>
            </Card>
            <Card className="bg-blue-50">
              <CardContent className="text-center">
                <Typography color="textSecondary">Total Rows</Typography>
                <Typography variant="h4" color="info.main">
                  {data.length - 1}
                </Typography>
              </CardContent>
            </Card>
          </div>

          <div className="border rounded p-4 mb-4">
            <Typography variant="subtitle1" gutterBottom>
              Quick Fix Tools
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6} sm={4} md={3}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<Spellcheck />}
                  onClick={() => applyFix('specialChars')}
                >
                  Clean Special Chars
                </Button>
              </Grid>
              <Grid item xs={6} sm={4} md={3}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<Filter1 />}
                  onClick={() => applyFix('mobile')}
                >
                  Format Mobile Numbers
                </Button>
              </Grid>
              <Grid item xs={6} sm={4} md={3}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<Transgender />}
                  onClick={() => applyFix('gender')}
                >
                  Standardize Gender
                </Button>
              </Grid>
              <Grid item xs={6} sm={4} md={3}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<Spellcheck />}
                  onClick={() => applyFix('spaces')}
                >
                  Fix Name Spaces
                </Button>
              </Grid>
              <Grid item xs={6} sm={4} md={3}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<Badge />}
                  onClick={() => applyFix('middlename')}
                >
                  Clean Middle Names
                </Button>
              </Grid>
              <Grid item xs={6} sm={4} md={3}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<Spellcheck />}
                  onClick={() => applyFix('motherMaiden')}
                >
                  Clean Mother's Name
                </Button>
              </Grid>
              <Grid item xs={6} sm={4} md={3}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<Badge />}
                  onClick={() => applyFix('extension')}
                >
                  Clean Extensions
                </Button>
              </Grid>
              <Grid item xs={6} sm={4} md={3}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<LocationOn />}
                  onClick={() => applyFix('region')}
                >
                  Standardize Regions
                </Button>
              </Grid>
              <Grid item xs={6} sm={4} md={3}>
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={<Badge />}
                  onClick={() => applyFix('barangayId')}
                >
                  Fix Barangay Certificates
                </Button>
              </Grid>
              <Grid item xs={12}>
                <Button
                  fullWidth
                  variant="contained"
                  color="primary"
                  startIcon={<AutoFixHigh />}
                  onClick={handleApplyAllFixes}
                >
                  Apply All Fixes
                </Button>
              </Grid>
            </Grid>
          </div>

          <Tabs
            value={activeTab}
            onChange={(e, newValue) => setActiveTab(newValue)}
            indicatorColor="primary"
            textColor="primary"
            variant="fullWidth"
          >
            <Tab label="Validation Issues" />
            <Tab label="Data Preview" />
          </Tabs>

            {activeTab === 0 && (
              <div className="mt-4">
                {validation.errors.length > 0 && (
                  <div className="mb-4">
                    <Typography variant="subtitle1" gutterBottom>
                      Validation Errors ({validation.errors.length} total)
                    </Typography>
                    
                    <TablePagination
                      component="div"
                      count={validation.errors.length}
                      page={validationPagination.page}
                      rowsPerPage={validationPagination.rowsPerPage}
                      onPageChange={handleValidationPageChange}
                      onRowsPerPageChange={handleValidationRowsPerPageChange}
                      rowsPerPageOptions={[50, 100, 200]}
                    />
                    
                    <Paper style={{ maxHeight: '60vh', overflow: 'auto' }}>
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow>
                            <TableCell>File Row #</TableCell>
                            <TableCell>Column</TableCell>
                            <TableCell>Error</TableCell>
                            <TableCell>Original Value</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {validation.errors
                            .sort((a, b) => a.row - b.row)
                            .slice(
                              validationPagination.page * validationPagination.rowsPerPage,
                              validationPagination.page * validationPagination.rowsPerPage + validationPagination.rowsPerPage
                            )
                            .map((error) => {
                              const rowData = data[error.row];
                              const actualValue = rowData[headers.indexOf(error.field)];
                              
                              return (
                                <TableRow key={`${error.row}-${error.column}`}>
                                  <TableCell>{error.row}</TableCell>
                                  <TableCell>{error.field}</TableCell>
                                  <TableCell>
                                    <Box color="error.main">{error.message}</Box>
                                  </TableCell>
                                  <TableCell>
                                    <Tooltip title={actualValue || 'Empty'}>
                                      <span>{actualValue || <span style={{ color: '#999' }}>-</span>}</span>
                                    </Tooltip>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                        </TableBody>
                      </Table>
                    </Paper>
                    
                    <TablePagination
                      component="div"
                      count={validation.errors.length}
                      page={validationPagination.page}
                      rowsPerPage={validationPagination.rowsPerPage}
                      onPageChange={handleValidationPageChange}
                      onRowsPerPageChange={handleValidationRowsPerPageChange}
                      rowsPerPageOptions={[50, 100, 200]}
                    />
                  </div>
                )}

              {/* Warnings Section */}
              {validation.warnings.length > 0 && (
                <div className="mb-4">
                  <Typography variant="subtitle1" gutterBottom>
                    Warnings ({validation.warnings.length} total)
                  </Typography>
                  
                  <TablePagination
                    component="div"
                    count={validation.warnings.length}
                    page={validationPagination.page}
                    rowsPerPage={validationPagination.rowsPerPage}
                    onPageChange={handleValidationPageChange}
                    onRowsPerPageChange={handleValidationRowsPerPageChange}
                    rowsPerPageOptions={[50, 100, 200, 500]}
                  />
                  
                  <Paper style={{ maxHeight: '60vh', overflow: 'auto' }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell>File Row #</TableCell>
                          <TableCell>Column</TableCell>
                          <TableCell>Warning</TableCell>
                          <TableCell>Original Value</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {validation.warnings
                          .sort((a, b) => a.row - b.row)
                          .slice(
                            validationPagination.page * validationPagination.rowsPerPage,
                            validationPagination.page * validationPagination.rowsPerPage + validationPagination.rowsPerPage
                          )
                          .map((warning) => (
                            <TableRow key={`${warning.row}-${warning.column}`}>
                              <TableCell>{warning.row}</TableCell>
                              <TableCell>{warning.field}</TableCell>
                              <TableCell>
                                <Box color="warning.main">{warning.message}</Box>
                              </TableCell>
                              <TableCell>
                                <Tooltip title={warning.value || 'Empty'}>
                                  <span>{warning.value || <span style={{ color: '#999' }}>-</span>}</span>
                                </Tooltip>
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </Paper>
                  
                  <TablePagination
                    component="div"
                    count={validation.warnings.length}
                    page={validationPagination.page}
                    rowsPerPage={validationPagination.rowsPerPage}
                    onPageChange={handleValidationPageChange}
                    onRowsPerPageChange={handleValidationRowsPerPageChange}
                    rowsPerPageOptions={[50, 100, 200, 500]}
                  />
                </div>
              )}
            </div>
          )}

          {activeTab === 1 && (
            <div className="mt-4">
              <div className="flex justify-between items-center mb-2">
                <Typography variant="subtitle1">
                  Data Preview with Validation ({data.length - 1} rows)
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<SaveAlt />}
                  onClick={() => setShowExportDialog(true)}
                >
                  Export Data
                </Button>
              </div>
              <LazyLoadedDataTable 
                data={data}
                headers={headers}
                validation={validation}
                pagination={pagination}
                onChangePage={handleChangePage}
                onChangeRowsPerPage={handleChangeRowsPerPage}
              />
            </div>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowValidation(false)}>Close</Button>
          <Button
            variant="contained"
            color="primary"
            onClick={() => {
              Swal.fire("Success", "Data imported successfully", "success");
              setShowValidation(false);
            }}
            disabled={validation.errors.length > 0}
          >
            Close Window
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={showExportDialog} onClose={() => setShowExportDialog(false)}>
        <DialogTitle>Export Data</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Filename"
            fullWidth
            value={exportFileName}
            onChange={(e) => setExportFileName(e.target.value)}
          />
          <Typography variant="body2" color="textSecondary" className="mt-2">
            {validation.errors.length > 0 ? (
              <Box color="warning.main">
                <Warning fontSize="small" /> File contains {validation.errors.length} errors. It is highly advisable to click the "Apply All Fixes" button or use other options to resolve them before exporting.
              </Box>
            ) : (
              <Box color="success.main">
                <Check fontSize="small" /> All data is valid
              </Box>
            )}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowExportDialog(false)}>Cancel</Button>
          <Button
            color="primary"
            onClick={() => {
              exportToExcel();
              setShowExportDialog(false);
            }}
          >
            Export
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default Import;