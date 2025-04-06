import React, { useState, useRef, useEffect, useMemo } from "react";
import * as XLSX from "xlsx";
import { 
  Button, Card, CardContent, Typography, Box, Paper, Table, TableBody, 
  TableCell, TableHead, TableRow, Chip, LinearProgress, Dialog, 
  DialogTitle, DialogContent, DialogActions, TextField, Checkbox, 
  FormControlLabel, Tooltip, Tab, Tabs, IconButton, Grid,
  TablePagination, CircularProgress, Fade, Slide, Snackbar, Alert
} from "@mui/material";
import { 
  CloudUpload, Delete, CheckCircle, Error, Close, Refresh, 
  SaveAlt, Warning, Check, AutoFixHigh, Filter1, Spellcheck,
  Transgender, DateRange, Numbers, LocationOn, Badge, Edit, Save
} from '@mui/icons-material';
import Swal from "sweetalert2";
import api from "../connection/api";
import { standardizeHeader, cleanText, cleanNameText, formatMobile, formatGender, cleanMiddleName, cleanExtensionName, cleanMotherMaidenName,
  formatRegion, validateSystemNumber, validateIdNumber, validateProvince, validateCityMunicipality, validateData,applyAutoFix, applyAllFixes
} from '../utils/AutoFixValidations';

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

const LazyLoadedDataTable = ({ 
  data, 
  headers, 
  validation, 
  pagination, 
  onChangePage, 
  onChangeRowsPerPage,
  onCellEdit,
  editMode
}) => {
  const [visibleRows, setVisibleRows] = useState([]);

  useEffect(() => {
    const start = pagination.page * pagination.rowsPerPage;
    const end = start + pagination.rowsPerPage;
    const rowsToShow = data.slice(1).slice(start, end);
    setVisibleRows(rowsToShow);
  }, [data, pagination]);

  const handleCellEdit = (rowIndex, colIndex, value) => {
    const actualRowIndex = (pagination.page * pagination.rowsPerPage) + rowIndex + 1;
    onCellEdit(actualRowIndex, colIndex, value);
  };

  return (
    <>
      <Paper style={{ maxHeight: '70vh', overflow: 'auto' }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>Row #</TableCell>
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
                      {editMode ? (
                        <EditableTableCell
                          value={cell}
                          rowIndex={rowIndex}
                          colIndex={colIndex}
                          onEdit={handleCellEdit}
                        />
                      ) : (
                        cell || <span style={{ color: '#999' }}>-</span>
                      )}
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
        count={data.length - 1}
        rowsPerPage={pagination.rowsPerPage}
        page={pagination.page}
        onPageChange={onChangePage}
        onRowsPerPageChange={onChangeRowsPerPage}
      />
    </>
  );
};

const EditableTableCell = ({ value, rowIndex, colIndex, onEdit }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);

  const handleSave = () => {
    onEdit(rowIndex, colIndex, editValue);
    setIsEditing(false);
  };

  return isEditing ? (
    <Box display="flex" alignItems="center">
      <TextField
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        size="small"
        autoFocus
        fullWidth
      />
      <IconButton onClick={handleSave} size="small" color="primary">
        <Save fontSize="small" />
      </IconButton>
    </Box>
  ) : (
    <Box display="flex" alignItems="center">
      {value || <span style={{ color: '#999' }}>-</span>}
      <IconButton 
        onClick={() => setIsEditing(true)} 
        size="small" 
        sx={{ ml: 1 }}
      >
        <Edit fontSize="small" />
      </IconButton>
    </Box>
  );
};

const Import = () => {
  const fileInputRef = useRef(null);
  const [authError, setAuthError] = useState(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationProgress, setValidationProgress] = useState(0);
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState(0);
  const [data, setData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [needsRefresh, setNeedsRefresh] = useState(false);
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

  const checkAuth = async () => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      console.error("Auth check failed: No token found in localStorage");
      setAuthError("No authentication token found");
      setSessionExpired(true);
      return false;
    }
  
    try {
      const response = await api.get("/api/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });
      return true;
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message;
      const errorStatus = err.response?.status;
      
      console.error("Session validation failed:", {
        error: errorMessage,
        status: errorStatus,
        timestamp: new Date().toISOString(),
        token: token.substring(0, 10) + "..." 
      });
  
      setAuthError("Session expired. Please log in again.");
      setSessionExpired(true);
      localStorage.removeItem("authToken");
      return false;
    }
  };
  
  const [validationPagination, setValidationPagination] = useState({
    page: 0,
    rowsPerPage: 100
  });

  const handleCellEdit = (rowIndex, colIndex, value) => {
    const newData = [...data];
    newData[rowIndex][colIndex] = value;
    setData(newData);
    setNeedsRefresh(true);
  };

  const handleRefreshValidation = () => {
    runValidation();
    setNeedsRefresh(false);
  };

  const handleExportClick = () => {
    if (needsRefresh) {
      Swal.fire({
        title: 'Validation Required',
        text: 'You must refresh validation after editing before exporting',
        icon: 'warning'
      });
    } else {
      setShowExportDialog(true);
    }
  };

  const handleValidationPageChange = (event, newPage) => {
    setValidationPagination(prev => ({
      ...prev,
      page: newPage
    }));
  };
  
  const handleValidationRowsPerPageChange = (event) => {
    setValidationPagination({
      page: 0,
      rowsPerPage: parseInt(event.target.value, 10)
    });
  };

  const processedErrors = useMemo(() => {
    const errorMap = new Map();
    
    validation.errors.forEach(error => {
      const key = `${error.row}-${error.column}`;
      if (!errorMap.has(key)) {
        errorMap.set(key, error);
      }
    });
    
    return Array.from(errorMap.values()).sort((a, b) => a.row - b.row);
  }, [validation.errors]);

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

  const processFile = async (file) => {
    const isAuthenticated = await checkAuth();
    if (!isAuthenticated) return;

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
    const isAuthenticated = await checkAuth();
    if (!isAuthenticated) return;

    if (data.length === 0) {
      Swal.fire("Error", "No data to validate", "error");
      return;
    }
  
    setIsValidating(true);
    setValidationProgress(0);
    setShowValidation(false);
  
    const totalRows = data.length - 1;
    let progress = 0;
  
    const progressInterval = setInterval(() => {
      progress += 1;
      setValidationProgress(progress);
      if (progress >= 100) clearInterval(progressInterval);
    }, 30);
  
    const validationResults = validateData(data, headers, autoFixOptions);
  
    clearInterval(progressInterval);
    setValidation(validationResults);
    setIsValidating(false);
    setShowValidation(true);
  };

  const applyFix = (type) => {
    const newData = applyAutoFix(data, headers, type);
    setData(newData);
    setValidation(validateData(newData, headers));
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
    
    const newData = applyAllFixes(data, headers);
    setData(newData);
    setValidation(validateData(newData, headers));
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

        const isIdNumberCell = headers[cell.col - 1] === 'IDNUMBER';
        const govtIdType = row[headers.indexOf('GOVTIDTYPE')];
        const isBarangayCert = govtIdType?.toString().toUpperCase().includes('BARANGAY CERTIFICATE', 'Barangay Certificate');
        
        if (isIdNumberCell && isBarangayCert) {
          const idValue = row[headers.indexOf('IDNUMBER')]?.toString().toUpperCase();
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
              <CloudUpload style={{ fontSize: "4rem", color: "#1976d2" }} />
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
                Select File
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
                  Apply All Fixes except Barangay
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
                            <TableCell>Row #</TableCell>
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
                          <TableCell>Row #</TableCell>
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
                {editMode && needsRefresh && (
                  <Typography variant="body2" color="error">
                    (You must refresh validation after editing)
                  </Typography>
                )}
              </Typography>
              <div>
                <Button
                  variant={editMode ? "contained" : "outlined"}
                  startIcon={<Edit />}
                  onClick={() => {
                    setEditMode(!editMode);
                    if (!editMode) setNeedsRefresh(false);
                  }}
                  sx={{ mr: 2 }}
                >
                  {editMode ? 'Editing Mode' : 'Enable Editor'}
                </Button>
                {editMode && (
                  <Button
                    variant="contained"
                    color={needsRefresh ? "error" : "primary"}
                    startIcon={<Refresh />}
                    onClick={handleRefreshValidation}
                    sx={{ mr: 2 }}
                  >
                    {needsRefresh ? 'Refresh Required' : 'Refresh Validation'}
                  </Button>
                )}
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<SaveAlt />}
                  onClick={handleExportClick}
                  disabled={needsRefresh}
                >
                  Export Data
                </Button>
              </div>
            </div>
            <LazyLoadedDataTable 
              data={data}
              headers={headers}
              validation={validation}
              pagination={pagination}
              onChangePage={handleChangePage}
              onChangeRowsPerPage={handleChangeRowsPerPage}
              onCellEdit={handleCellEdit}
              editMode={editMode}
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
                <Warning fontSize="small" /> File contains {validation.errors.length} error{validation.errors.length !== 1 ? 's' : ''}. It is highly advisable to click the "Apply All Fixes" button or use other options to resolve them before exporting.
              </Box>
            ) : (
              <Box color="success.main">
                <Check fontSize="small" /> All values are valid
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