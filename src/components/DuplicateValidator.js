import React, { useState, useRef, useEffect, useMemo } from "react";
import * as XLSX from "xlsx";
import {
  Button, Card, CardContent, Typography, LinearProgress, Dialog, DialogTitle, DialogContent,
  DialogActions, CircularProgress, Chip, Box, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Collapse, IconButton, TablePagination, Tabs, Tab,
  ToggleButton, ToggleButtonGroup, TextField, FormControlLabel, Checkbox, InputAdornment,
  Grid, List, ListItem, ListItemText
} from "@mui/material";

import {
  CloudUpload, Delete, CheckCircle, SaveAlt, ErrorOutline, KeyboardArrowDown,
  KeyboardArrowUp, CompareArrows, DataArray, Email, Send, Search, FilterList, Clear,
  CheckCircle as CheckCircleIcon, Edit as EditIcon, Error as ErrorIcon, Info as InfoIcon
} from '@mui/icons-material';
import Swal from "sweetalert2";
import dataMatchingAPI from "../connection/dataMatchingAPI"
import api from "../connection/api";
import { useFileContext } from '../context/FileContext';
import { standardizeHeader, validateData } from "../utils/DuplicateValidations";
import { processFile, matchDataWithAPI } from "../utils/FileProcessing";
import { exportValidatedData, sendValidationResults } from "../utils/ExportUtils";


const DataProcessingTool = () => {
  const fileInputRef = useRef(null);
  
  const { 
    fileState, 
    setFileName, 
    setFileSize, 
    setMatchedData, 
    setUnmatchedData,
    setOriginalHeaders,
    setOriginalData,
    clearFileData 
  } = useFileContext();
  
  const [processing, setProcessing] = useState(false);
  const [matching, setMatching] = useState(false);
  const [displayMode, setDisplayMode] = useState('ALL');
  const [openRows, setOpenRows] = useState({});
  const [saveDisabled, setSaveDisabled] = useState(true);
  const [validationDialogOpen, setValidationDialogOpen] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validData, setValidData] = useState([]);
  const [invalidData, setInvalidData] = useState([]);
  const [exportFileName, setExportFileName] = useState("");
  const [activeTab, setActiveTab] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailData, setEmailData] = useState({
    recipient: localStorage.getItem('userEmail') || '',
    subject: 'Data Validation Results',
    message: 'Please find attached the validation results for your data.',
    sendValid: true,
    sendInvalid: true
  });

  useEffect(() => {
    if (fileState.fileName) {
      setExportFileName(fileState.fileName.replace(/\.[^/.]+$/, ""));
    }
    
    setOpenRows({});
    setValidationDialogOpen(false);
    setIsValidating(false);
    setEmailDialogOpen(false);
    setPage(0);
  }, [fileState.fileName]);

  useEffect(() => {
    if (!matching && (fileState.matchedData.length > 0 || fileState.unmatchedData.length > 0)) {
      setSaveDisabled(false);
    } else {
      setSaveDisabled(true);
    }
  }, [matching, fileState.matchedData, fileState.unmatchedData]);

  const handleToggleRow = (id) => {
    setOpenRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const [filters, setFilters] = useState({
    rsbsaNo: '',
    name: '',
    status: '',
    remarks: ''
  });

  const handleFilterChange = (filterName) => (event) => {
    setFilters({
      ...filters,
      [filterName]: event.target.value
    });
    setPage(0);
  };

  const clearFilters = () => {
    setFilters({
      rsbsaNo: '',
      name: '',
      status: '',
      remarks: ''
    });
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
      const handleFileUpload = async (file) => {
      try {
        const rows = await processFile(
          file,
          setProcessing,
          setFileName,
          setExportFileName,
          setPage,
          setSaveDisabled,
          setMatchedData,
          setUnmatchedData,
          setOriginalHeaders,
          setOriginalData,
          setFileSize
        );
        await matchDataWithAPI(rows, setMatching, setMatchedData, setUnmatchedData);
      } catch (error) {
        console.error("File processing error:", error);
      }
    };

  const filteredData = useMemo(() => {
    let result = [...fileState.matchedData, ...fileState.unmatchedData];
    
    switch (displayMode) {
      case 'MATCHED':
        result = fileState.matchedData;
        break;
      case 'UNMATCHED':
        result = fileState.unmatchedData;
        break;
    }

    return result.filter(row => {
      const matchesRSBSA = filters.rsbsaNo === '' || 
        (row.RSBSA_NO && row.RSBSA_NO.toString().toLowerCase().includes(filters.rsbsaNo.toLowerCase())) ||
        (row.originalData?.RSBSA_NO && row.originalData.RSBSA_NO.toString().toLowerCase().includes(filters.rsbsaNo.toLowerCase()));

      const fullName = `${row.FIRSTNAME || row.originalData?.FIRSTNAME || ''} ${row.LASTNAME || row.originalData?.LASTNAME || ''}`.toLowerCase();
      const matchesName = filters.name === '' || 
        fullName.includes(filters.name.toLowerCase());

      return matchesRSBSA && matchesName;
    });
  }, [
    fileState.matchedData, 
    fileState.unmatchedData, 
    displayMode, 
    filters
  ]);

  const currentPageData = filteredData.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const handleDisplayModeChange = (event, newMode) => {
    if (newMode !== null) {
      setDisplayMode(newMode);
      setPage(0);
    }
  };

  const matchDataWithAPI = async (rows) => {
    setMatching(true);
    try {
      const batchSize = 10;
      let totalMatched = 0;
      let totalUnmatched = 0;
      let matchedResults = [];
      let unmatchedResults = [];
  
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        
        const results = await Promise.all(
          batch.map(async (row) => {
            try {
              const headers = {
                "RSBSASYSTEMGENERATEDNUMBER": row.RSBSA_NO || "",
                "FIRSTNAME": row.FIRSTNAME || "",
                "MIDDLENAME": row.MIDDLENAME || "",
                "LASTNAME": row.LASTNAME || "",
                "EXTENSIONNAME": row.EXTENSIONNAME || "",
                "SEX": row.SEX || "",
                "MOTHERMAIDENNAME": row.MOTHERMAIDENNAME || ""
              };
  
              const response = await dataMatchingAPI.get("/api/match/rsbsa", {
                headers: headers
              });
  
              if (
                response.data.success &&
                response.data.data &&
                Object.keys(response.data.data).length > 0 &&
                Array.isArray(response.data.data[Object.keys(response.data.data)[0]]) &&
                response.data.data[Object.keys(response.data.data)[0]].length > 0
              ) {
                const firstKey = Object.keys(response.data.data)[0];
                const matchedData = response.data.data[firstKey][0];
                const rsbsaNo = matchedData.rsbsa_no;
              
                totalMatched++;
                return {
                  ...row,
                  matchStatus: "MATCHED",
                  matchDetails: {       
                    rsbsa_no: rsbsaNo
                  },
                  showDetails: false // Add this to control dropdown visibility
                };
              } else {
                totalUnmatched++;
                return {
                  ...row,
                  matchStatus: "UNMATCHED",
                  remarks: response.data.message || "No matching record found",
                  unmatchedRecords: response.data.unmatchedRecords || [], // Add unmatched fields from API
                  showDetails: true // Show details by default for unmatched
                };
              }              
            } catch (error) {
              console.error("Error matching record:", error);
              totalUnmatched++;
              return {
                ...row,
                matchStatus: "ERROR",
                remarks: error.response?.data?.message || 
                         error.message || 
                         "API request failed",
                unmatchedRecords: error.response?.data?.unmatchedRecords || [],
                showDetails: true // Show details for errors
              };
            }
          })
        );
  
        const matched = results.filter(r => r.matchStatus === "MATCHED");
        const unmatched = results.filter(r => r.matchStatus !== "MATCHED");
        
        matchedResults = [...matchedResults, ...matched];
        unmatchedResults = [...unmatchedResults, ...unmatched];
        
  
        setMatchedData(matchedResults);
        setUnmatchedData(unmatchedResults);
  
        await new Promise(resolve => setTimeout(resolve, 100));
      }
  
      Swal.fire({
        title: 'Matching Complete',
        html: `
          <div>
            <p>Matched records: ${totalMatched}</p>
            <p>Unmatched records: ${totalUnmatched}</p>
          </div>
        `,
        icon: 'success',
        timer: 2000
      });
    } catch (error) {
      console.error("Batch matching error:", error);
      Swal.fire("Error", "Failed to complete matching process", "error");
    } finally {
      setMatching(false);
    }
  };

  const validateDataRows = (rows) => {
    setIsValidating(true);
    try {
      const { validRows, invalidRows } = validateData(rows);
      setValidData(validRows);
      setInvalidData(invalidRows);
    } catch (error) {
      console.error("Validation error:", error);
      Swal.fire("Error", "Failed to validate data", "error");
    } finally {
      setIsValidating(false);
    }
  };

  const handleOpenValidationDialog = () => {
    const dataToValidate = fileState.matchedData.map(item => ({
      ...item.originalData,
      originalIndex: item.id
    }));
    
    setValidationDialogOpen(true);
    validateDataRows(dataToValidate);
  };

  const handleCloseValidationDialog = () => {
    setValidationDialogOpen(false);
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleExport = (type) => {
    exportValidatedData(
      type === 'VALID' ? validData : invalidData,
      type,
      exportFileName
    );
  };


  const handleOpenEmailDialog = () => {
    setEmailDialogOpen(true);
  };

  const handleCloseEmailDialog = () => {
    setEmailDialogOpen(false);
  };

  const handleEmailInputChange = (e) => {
    const { name, value, checked } = e.target;
    setEmailData(prev => ({
      ...prev,
      [name]: name === 'sendValid' || name === 'sendInvalid' ? checked : value
    }));
  };

  const headerDisplayMap = {
    first_name: "FIRSTNAME",
    middle_name: "MIDDLENAME",
    surname: "LASTNAME",
    ext_name: "EXTENSIONNAME",
    mother_maiden_name: "MOTHERMAIDENNAME",
    sex: "SEX",
    birthday: "BIRTHDATE"
  };  

  const handleSendEmail = async () => {
    const success = await sendValidationResults(
      emailData,
      validData,
      invalidData,
      exportFileName
    );
    if (success) {
      handleCloseEmailDialog();
      handleCloseValidationDialog();
    }
  };

  const handleClearData = () => {
    clearFileData();
    setFileName("");
    setFileSize(0);
    setOpenRows({});
    setValidData([]);
    setInvalidData([]);
    setExportFileName("");
    fileInputRef.current.value = "";
    setSaveDisabled(true);
  };

  return (
    <div style={{ padding: '1rem', maxWidth: '1800px', margin: '0 auto' }}>
      <Card>
        <CardContent style={{ textAlign: 'center' }}>
          {processing || matching ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <CircularProgress />
              <Typography style={{ marginTop: '1rem' }}>
                {processing ? 'Processing file...' : 'Matching data...'}
              </Typography>
              {matching && (
                <>
                  <LinearProgress style={{ width: '100%', marginTop: '1rem' }} />
                  <Typography variant="caption">
                    {fileState.matchedData.length + fileState.unmatchedData.length} records processed
                  </Typography>
                </>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <CompareArrows style={{ fontSize: "4rem", color: "#1976d2", marginBottom: '1rem' }} />
              <Typography variant="h5" gutterBottom>
                Process Tool
              </Typography>
              <Typography variant="body2" color="textSecondary" style={{ marginBottom: '1.0rem' }}>
                Upload file to match against RSBSA database and validate for duplicates
              </Typography>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={(e) => e.target.files[0] && handleFileUpload(e.target.files[0])} 
                accept=".xlsx,.csv" 
                style={{ display: 'none' }} 
              />
              <Button
                variant="contained"
                color="primary"
                onClick={() => fileInputRef.current.click()}
                startIcon={<CloudUpload />}
                style={{ marginBottom: '1rem' }}
              >
                Select File
              </Button>
              {fileState.fileName && (
                <div style={{ marginTop: '1rem' }}>
                  <Typography variant="body2">
                    Selected: {fileState.fileName} ({Math.round(fileState.fileSize / 1024)} KB)
                  </Typography>
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<Delete />}
                    onClick={handleClearData}
                    style={{ marginTop: '0.5rem' }}
                  >
                    Remove File
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {(fileState.matchedData.length > 0 || fileState.unmatchedData.length > 0) && (
        <>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3, mb: 2 }}>
            <Box>
              <ToggleButtonGroup
                value={displayMode}
                exclusive
                onChange={handleDisplayModeChange}
                aria-label="display mode"
                size="small"
                sx={{ mr: 2 }}
              >
                <ToggleButton value="ALL" aria-label="show all">
                  <Typography variant="caption">All</Typography>
                </ToggleButton>
                <ToggleButton value="MATCHED" aria-label="show matched">
                  <CheckCircle fontSize="small" sx={{ mr: 0.5 }} />
                  <Typography variant="caption">{fileState.matchedData.length}</Typography>
                </ToggleButton>
                <ToggleButton value="UNMATCHED" aria-label="show unmatched">
                  <ErrorOutline fontSize="small" sx={{ mr: 0.5 }} />
                  <Typography variant="caption">{fileState.unmatchedData.length}</Typography>
                </ToggleButton>
              </ToggleButtonGroup>
              
              <Chip 
                label={`Total: ${filteredData.length}`} 
                color="default" 
                variant="outlined"
                size="small"
              />
            </Box>
            
            <Box>
              <Button
                variant="contained"
                color="primary"
                startIcon={<DataArray />}
                onClick={handleOpenValidationDialog}
                disabled={fileState.matchedData.length === 0}
                sx={{ mr: 1 }}
              >
                Validate Matches
              </Button>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
            <TextField
              label="Search RSBSA No"
              variant="outlined"
              size="small"
              value={filters.rsbsaNo}
              onChange={handleFilterChange('rsbsaNo')}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
              sx={{ minWidth: 200 }}
            />
            
            <TextField
              label="Search Name"
              variant="outlined"
              size="small"
              value={filters.name}
              onChange={handleFilterChange('name')}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
              sx={{ minWidth: 200 }}
            />
            <Button
              variant="outlined"
              startIcon={<Clear />}
              onClick={clearFilters}
              size="small"
              sx={{ height: 40 }}
            >
              Clear Filters
            </Button>
          </Box>

          <TableContainer component={Paper} sx={{ mb: 3 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell />
                  <TableCell>Status</TableCell>
                  <TableCell>RSBSA Number</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Details</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {currentPageData.length > 0 ? (
                  currentPageData.map((row) => (
                    <React.Fragment key={row.id}>
                      <TableRow sx={{ 
                        backgroundColor: row.matchStatus === "MATCHED" ? 'rgba(76, 175, 80, 0.08)' : 'rgba(244, 67, 54, 0.08)' 
                      }}>
                        <TableCell>
                          {row.matchStatus !== "MATCHED" && (
                            <IconButton
                              size="small"
                              onClick={() => handleToggleRow(row.id)}
                            >
                              {openRows[row.id] ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
                            </IconButton>
                          )}
                        </TableCell>
                        <TableCell>
                          {row.matchStatus === "MATCHED" ? (
                            <Chip 
                              label="Matched" 
                              color="success" 
                              size="small" 
                              icon={<CheckCircle fontSize="small" />}
                            />
                          ) : (
                            <Chip 
                              label={row.matchStatus === "ERROR" ? "Unmatched" : "Unmatched"} 
                              color={row.matchStatus === "ERROR" ? "error" : "error"} 
                              size="small"
                              icon={<ErrorOutline fontSize="small" />}
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          {row.RSBSA_NO || row.originalData?.RSBSA_NO || "N/A"}
                        </TableCell>
                        <TableCell>
                          {`${row.FIRSTNAME || row.originalData?.FIRSTNAME || ""} ${row.LASTNAME || row.originalData?.LASTNAME || ""}`}
                        </TableCell>
                        <TableCell>
                          {row.matchStatus === "MATCHED" 
                            ? `Match found (${row.matchDetails?.rsbsa_no})` 
                            : row.remarks}
                        </TableCell>
                      </TableRow>
                      {row.matchStatus !== "MATCHED" && (
                        <TableRow>
                          <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
                            <Collapse in={openRows[row.id]} timeout="auto" unmountOnExit>
                              <Box sx={{ margin: 2, maxWidth: "100%" }}>
                                <Typography variant="h6" gutterBottom component="div" sx={{ fontWeight: "bold", color: "#333" }}>
                                  Record Details
                                </Typography>
                                
                                <Paper 
                                  elevation={1} 
                                  sx={{ 
                                    p: 2, 
                                    mb: 2, 
                                    backgroundColor: row.matchStatus === "MATCHED" ? "#e8f5e9" : "#ffebee",
                                    borderLeft: row.matchStatus === "MATCHED" ? "5px solid #4caf50" : "5px solid #f44336"
                                  }}
                                >
                                  <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                                    {row.matchStatus === "MATCHED" ? (
                                      <CheckCircleIcon sx={{ color: "#4caf50", mr: 1 }} />
                                    ) : (
                                      <ErrorIcon sx={{ color: "#f44336", mr: 1 }} />
                                    )}
                                    <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
                                      Status: {row.matchStatus === "ERROR" ? "Unmatched" : row.matchStatus}
                                    </Typography>
                                  </Box>
                                  <Typography variant="body2">{row.remarks}</Typography>
                                </Paper>
                                
                                {row.unmatchedRecords && row.unmatchedRecords.length > 0 && (
                                  <Box sx={{ mb: 2 }}>
                                    <Typography variant="subtitle1" sx={{ fontWeight: "bold", mb: 1 }}>Matching Issues Found</Typography>
                                    
                                    {row.unmatchedRecords.map((record, index) => (
                                      <Paper key={index} elevation={1} sx={{ p: 2, mb: 2, backgroundColor: "#fff8e1", borderLeft: "5px solid #ffa000" }}>
                                        <Typography variant="subtitle2" sx={{ fontWeight: "bold", mb: 1 }}>
                                          {record.reason}
                                        </Typography>
                                        
                                        <Grid container spacing={2}>
                                          <Grid item xs={12} md={6}>
                                            <Typography variant="caption" sx={{ fontWeight: "bold", color: "#555" }}>Record Information</Typography>
                                            <List dense>
                                              {record.recordData.rsbsa_no && 
                                                <ListItem>
                                                  <ListItemText primary="RSBSA Number" secondary={record.recordData.rsbsa_no} />
                                                </ListItem>
                                              }
                                              {record.recordData.first_name && 
                                                <ListItem>
                                                  <ListItemText primary="First Name" secondary={record.recordData.first_name} />
                                                </ListItem>
                                              }
                                              {record.recordData.middle_name && 
                                                <ListItem>
                                                  <ListItemText primary="Middle Name" secondary={record.recordData.middle_name} />
                                                </ListItem>
                                              }
                                              {record.recordData.surname && 
                                                <ListItem>
                                                  <ListItemText primary="Last Name" secondary={record.recordData.surname} />
                                                </ListItem>
                                              }
                                              {record.recordData.ext_name && 
                                                <ListItem>
                                                  <ListItemText primary="Extension" secondary={record.recordData.ext_name} />
                                                </ListItem>
                                              }
                                              {record.recordData.sex && 
                                                <ListItem>
                                                  <ListItemText primary="Sex" secondary={record.recordData.sex} />
                                                </ListItem>
                                              }
                                              {record.recordData.mother_maiden_name && 
                                                <ListItem>
                                                  <ListItemText primary="Mother's Maiden Name" secondary={record.recordData.mother_maiden_name} />
                                                </ListItem>
                                              }
                                            </List>
                                          </Grid>
                                          
                                          <Grid item xs={12} md={6}>
                                            <Typography variant="caption" sx={{ fontWeight: "bold", color: "#555" }}>Mismatched Fields</Typography>
                                            {record.unmatchedFields && record.unmatchedFields.length > 0 ? (
                                              <TableContainer component={Paper} sx={{ mt: 1 }}>
                                                <Table size="small">
                                                  <TableHead>
                                                    <TableRow>
                                                      <TableCell>Field</TableCell>
                                                      <TableCell>Your Input</TableCell>
                                                      <TableCell>On Records</TableCell>
                                                    </TableRow>
                                                  </TableHead>
                                                  <TableBody>
                                                    {record.unmatchedFields.map((field, idx) => (
                                                      <TableRow key={idx} sx={{ backgroundColor: "#fff3e0" }}>
                                                        <TableCell sx={{ fontWeight: "medium" }}>
                                                          {headerDisplayMap[field.field] || field.field}
                                                        </TableCell>
                                                        <TableCell>{field.input || "(empty)"}</TableCell>
                                                        <TableCell>{field.db || "(empty)"}</TableCell>
                                                      </TableRow>
                                                    ))}
                                                  </TableBody>
                                                </Table>
                                              </TableContainer>
                                            ) : (
                                              <Typography variant="body2" sx={{ mt: 1, fontStyle: "italic" }}>
                                                No specific field mismatches detected.
                                              </Typography>
                                            )}
                                          </Grid>
                                        </Grid>

                                        {record.potentialMatch && (
                                          <Box sx={{ mt: 2, p: 1, backgroundColor: "#e3f2fd", borderRadius: 1 }}>
                                            <Typography variant="subtitle2" sx={{ fontWeight: "bold" }}>
                                              <InfoIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: "text-bottom" }} />
                                              Potential Match Found
                                            </Typography>
                                            <List dense>
                                              {record.potentialMatch.rsbsa_no && 
                                                <ListItem>
                                                  <ListItemText primary="RSBSA Number" secondary={record.potentialMatch.rsbsa_no} />
                                                </ListItem>
                                              }
                                              <ListItem>
                                                <ListItemText 
                                                  primary="Name" 
                                                  secondary={`${record.potentialMatch.first_name || ""} ${record.potentialMatch.middle_name || ""} ${record.potentialMatch.surname || ""} ${record.potentialMatch.ext_name || ""}`.trim()} 
                                                />
                                              </ListItem>
                                            </List>
                                          </Box>
                                        )}
                                      </Paper>
                                    ))}
                                  </Box>
                                )}
                                
                                {row.matchStatus === "MATCHED" && row.matchDetails && (
                                  <Box sx={{ mb: 2 }}>
                                    <Typography variant="subtitle1" sx={{ fontWeight: "bold", mb: 1 }}>Matched Record Details</Typography>
                                    <Paper elevation={1} sx={{ p: 2 }}>
                                      <Grid container spacing={2}>
                                        {Object.entries(row.matchDetails).map(([key, value]) => (
                                          <Grid item xs={12} sm={6} md={4} key={key}>
                                            <Typography variant="caption" sx={{ color: "#555" }}>{key}</Typography>
                                            <Typography variant="body2" sx={{ fontWeight: "medium" }}>
                                              {value || "(empty)"}
                                            </Typography>
                                          </Grid>
                                        ))}
                                      </Grid>
                                    </Paper>
                                  </Box>
                                )}
                              </Box>
                            </Collapse>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      <Typography variant="body2" color="textSecondary">
                        {Object.values(filters).some(f => f !== '') 
                          ? "No records match your filters" 
                          : `No ${displayMode.toLowerCase()} records found`}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <TablePagination
              rowsPerPageOptions={[10, 20, 50, 100]}
              component="div"
              count={filteredData.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </TableContainer>
        </>
      )}

      <Dialog 
        open={validationDialogOpen} 
        onClose={handleCloseValidationDialog}
        fullWidth
        maxWidth="lg"
      >
        <DialogTitle>Duplicate Validation Results</DialogTitle>
        <DialogContent>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
            <Tabs value={activeTab} onChange={handleTabChange}>
              <Tab label={`Valid (${validData.length})`} />
              <Tab label={`Invalid (${invalidData.length})`} />
            </Tabs>
          </Box>

          {isValidating ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {activeTab === 0 && (
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>RSBSA Number</TableCell>
                        <TableCell>Name</TableCell>
                        <TableCell>Details</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {validData.slice(0, 5).map((row) => (
                        <TableRow key={row.originalIndex}>
                          <TableCell>{row.RSBSASYSTEMGENERATEDNUMBER || "N/A"}</TableCell>
                          <TableCell>
                            {`${row.FIRSTNAME || ""} ${row.LASTNAME || ""}`}
                          </TableCell>
                          <TableCell>Valid record</TableCell>
                        </TableRow>
                      ))}
                      {validData.length > 5 && (
                        <TableRow>
                          <TableCell colSpan={3} align="center">
                            + {validData.length - 5} more valid records
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}

              {activeTab === 1 && (
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>RSBSA Number</TableCell>
                        <TableCell>Name</TableCell>
                        <TableCell>Remarks</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {invalidData.slice(0, 5).map((row) => (
                        <TableRow key={row.originalIndex}>
                          <TableCell>{row.RSBSASYSTEMGENERATEDNUMBER || "N/A"}</TableCell>
                          <TableCell>
                            {`${row.FIRSTNAME || ""} ${row.LASTNAME || ""}`}
                          </TableCell>
                          <TableCell>{row.Remarks}</TableCell>
                        </TableRow>
                      ))}
                      {invalidData.length > 5 && (
                        <TableRow>
                          <TableCell colSpan={3} align="center">
                            + {invalidData.length - 5} more invalid records
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}

              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2, gap: 1 }}>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<Email />}
                  onClick={handleOpenEmailDialog}
                  disabled={validData.length === 0 && invalidData.length === 0}
                >
                  Email Results
                </Button>
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<SaveAlt />}
                  onClick={() => exportValidatedData('VALID')}
                  disabled={validData.length === 0}
                >
                  Export Valid
                </Button>
                <Button
                  variant="contained"
                  color="error"
                  startIcon={<SaveAlt />}
                  onClick={() => exportValidatedData('INVALID')}
                  disabled={invalidData.length === 0}
                >
                  Export Invalid
                </Button>
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseValidationDialog}>Close</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={emailDialogOpen} onClose={handleCloseEmailDialog} fullWidth maxWidth="sm">
        <DialogTitle>Email Validation Results</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="Recipient Email"
              name="recipient"
              value={emailData.recipient}
              onChange={handleEmailInputChange}
              fullWidth
              required
              type="email"
            />
            <TextField
              label="Subject"
              name="subject"
              value={emailData.subject}
              onChange={handleEmailInputChange}
              fullWidth
            />
            <TextField
              label="Message"
              name="message"
              value={emailData.message}
              onChange={handleEmailInputChange}
              fullWidth
              multiline
              rows={4}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={emailData.sendValid}
                  onChange={handleEmailInputChange}
                  name="sendValid"
                  color="primary"
                />
              }
              label={`Include valid data (${validData.length} records)`}
              disabled={validData.length === 0}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={emailData.sendInvalid}
                  onChange={handleEmailInputChange}
                  name="sendInvalid"
                  color="primary"
                />
              }
              label={`Include invalid data (${invalidData.length} records)`}
              disabled={invalidData.length === 0}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEmailDialog}>Cancel</Button>
          <Button 
            onClick={sendValidationResults} 
            variant="contained" 
            color="primary"
            startIcon={<Send />}
            disabled={!emailData.recipient || (!emailData.sendValid && !emailData.sendInvalid)}
          >
            Send Email
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default DataProcessingTool;