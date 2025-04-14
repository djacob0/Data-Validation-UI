import React, { useState, useRef, useEffect } from "react";
import * as XLSX from "xlsx";
import { Button, Card, CardContent, Typography, LinearProgress,Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress, Chip, Box, Table, 
  TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Collapse, IconButton, TablePagination, Tabs, Tab, ToggleButton, ToggleButtonGroup
} from "@mui/material";
import { CloudUpload, Delete, CheckCircle, SaveAlt, ErrorOutline, KeyboardArrowDown, KeyboardArrowUp, CompareArrows, DataArray
} from '@mui/icons-material';
import Swal from "sweetalert2";
import dataMatchingAPI from "../connection/dataMatchingAPI";
import { standardizeHeader, validateData } from "../utils/DuplicateValidations";

const DataProcessingTool = () => {
  const fileInputRef = useRef(null);
  const [processing, setProcessing] = useState(false);
  const [matching, setMatching] = useState(false);
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState(0);
  const [matchedData, setMatchedData] = useState([]);
  const [unmatchedData, setUnmatchedData] = useState([]);
  const [displayMode, setDisplayMode] = useState('ALL');
  const [openRows, setOpenRows] = useState({});
  const [originalHeaders, setOriginalHeaders] = useState([]);
  const [originalData, setOriginalData] = useState([]);
  const [saveDisabled, setSaveDisabled] = useState(true);
  const [validationDialogOpen, setValidationDialogOpen] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validData, setValidData] = useState([]);
  const [invalidData, setInvalidData] = useState([]);
  const [exportFileName, setExportFileName] = useState("");
  const [activeTab, setActiveTab] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [showMatched, setShowMatched] = useState(true);
  const [showUnmatched, setShowUnmatched] = useState(true);

  useEffect(() => {
    if (!matching && (matchedData.length > 0 || unmatchedData.length > 0)) {
      setSaveDisabled(false);
    } else {
      setSaveDisabled(true);
    }
  }, [matching, matchedData, unmatchedData]);


  const handleToggleRow = (id) => {
    setOpenRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const processFile = async (file) => {
    setProcessing(true);
    setMatchedData([]);
    setUnmatchedData([]);
    setFileName(file.name);
    setExportFileName(file.name.replace(/\.[^/.]+$/, ""));
    setPage(0);
    setSaveDisabled(true);
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const workbook = XLSX.read(e.target.result, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const parsedData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

        if (parsedData.length < 2) {
          Swal.fire("Error", "The file is empty or has no data rows", "error");
          setProcessing(false);
          return;
        }

        const headers = parsedData[0].map(h => String(h).trim());
        setOriginalHeaders(headers);
        
        const getColIndex = (possibleNames) => {
          const index = headers.findIndex(h => 
            possibleNames.some(name => 
              String(h).trim().toUpperCase() === name
            )
          );
          return index !== -1 ? index : null;
        };

        const colIndices = {
          rsbsa: getColIndex(['RSBSASYSTEMGENERATEDNUMBER', 'RSBSA_NO']),
          firstName: getColIndex(['FIRSTNAME', 'FIRST_NAME']),
          middleName: getColIndex(['MIDDLENAME', 'MIDDLE_NAME']),
          lastName: getColIndex(['LASTNAME', 'SURNAME', 'LAST_NAME']),
          extName: getColIndex(['EXTENSIONNAME', 'EXT_NAME']),
          sex: getColIndex(['SEX', 'GENDER']),
          mother: getColIndex(['MOTHERMAIDENNAME'])
        };

        if (colIndices.rsbsa === null || colIndices.firstName === null || colIndices.lastName === null) {
          Swal.fire("Error", "File missing required columns (RSBSA Number, First Name, Last Name)", "error");
          setProcessing(false);
          return;
        }

        const rows = parsedData.slice(1).map((row, index) => {
          const originalRowData = {};
          headers.forEach((header, i) => {
            originalRowData[header] = row[i] || "";
          });

          return {
            id: index + 1,
            originalData: originalRowData,
            RSBSA_NO: row[colIndices.rsbsa] || "",
            FIRSTNAME: row[colIndices.firstName] || "",
            MIDDLENAME: colIndices.middleName !== null ? row[colIndices.middleName] || "" : "",
            LASTNAME: row[colIndices.lastName] || "",
            EXTENSIONNAME: colIndices.extName !== null ? row[colIndices.extName] || "" : "",
            SEX: colIndices.sex !== null ? row[colIndices.sex] || "" : "",
            MOTHERMAIDENNAME: colIndices.mother !== null ? row[colIndices.mother] || "" : ""
          };
        });

        setOriginalData(rows);
        setFileSize(file.size);
        await matchDataWithAPI(rows);
      } catch (error) {
        console.error("Error processing file:", error);
        Swal.fire("Error", "Failed to process the file", "error");
      } finally {
        setProcessing(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const getFilteredData = () => {
    switch (displayMode) {
      case 'MATCHED':
        return matchedData;
      case 'UNMATCHED':
        return unmatchedData;
      default:
        return [...matchedData, ...unmatchedData];
    }
  };

  const filteredData = getFilteredData();
  const currentPageData = filteredData.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const handleDisplayModeChange = (event, newMode) => {
    if (newMode !== null) {
      setDisplayMode(newMode);
      setPage(0); // Reset to first page when changing filters
    }
  };

  const matchDataWithAPI = async (rows) => {
    setMatching(true);
    try {
      const batchSize = 10;
      let totalMatched = 0;
      let totalUnmatched = 0;

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
                  }
                };
              } else {
                totalUnmatched++;
                return {
                  ...row,
                  matchStatus: "UNMATCHED",
                  remarks: response.data.message || "No matching record found"
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
                         "API request failed"
              };
            }
          })
        );

        const matched = results.filter(r => r.matchStatus === "MATCHED");
        const unmatched = results.filter(r => r.matchStatus !== "MATCHED");
        
        setMatchedData(prev => [...prev, ...matched]);
        setUnmatchedData(prev => [...prev, ...unmatched]);

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
        timer: 3000
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

      Swal.fire({
        title: 'Validation Complete',
        html: `
          <div>
            <p>Valid rows: ${validRows.length}</p>
            <p>Invalid rows: ${invalidRows.length}</p>
            ${invalidRows.length > 0 ? 
              '<p class="text-red-500">Check remarks for validation issues</p>' : 
              ''}
          </div>
        `,
        icon: 'success'
      });
    } catch (error) {
      console.error("Validation error:", error);
      Swal.fire("Error", "Failed to validate data", "error");
    } finally {
      setIsValidating(false);
    }
  };

  const handleOpenValidationDialog = () => {
    // Prepare data for validation - only matched records
    const dataToValidate = matchedData.map(item => ({
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

  const exportValidatedData = async (type) => {
    try {
      const dataToExport = type === 'VALID' ? validData : invalidData;
      if (dataToExport.length === 0) {
        Swal.fire("Info", `No ${type.toLowerCase()} data to export`, "info");
        return;
      }

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
      
      const filename = `${type.toLowerCase()}_${exportFileName}.xlsx`;
      XLSX.writeFile(workbook, filename);
      
      Swal.fire("Success", `${dataToExport.length} ${type.toLowerCase()} records exported`, "success");
    } catch (error) {
      console.error('Export error:', error);
      Swal.fire('Error', 'Failed to export data', 'error');
    }
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
                    {matchedData.length + unmatchedData.length} records processed
                  </Typography>
                </>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <CompareArrows style={{ fontSize: "4rem", color: "#1976d2", marginBottom: '1rem' }} />
              <Typography variant="h5" gutterBottom>
                Data Processing Tool
              </Typography>
              <Typography variant="body2" color="textSecondary" style={{ marginBottom: '1.0rem' }}>
                Upload file to match against RSBSA database and validate for duplicates
              </Typography>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={(e) => e.target.files[0] && processFile(e.target.files[0])} 
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
              {fileName && (
                <div style={{ marginTop: '1rem' }}>
                  <Typography variant="body2">
                    Selected: {fileName} ({Math.round(fileSize / 1024)} KB)
                  </Typography>
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<Delete />}
                    onClick={() => {
                      setFileName("");
                      setFileSize(0);
                      setMatchedData([]);
                      setUnmatchedData([]);
                      setExportFileName("");
                      fileInputRef.current.value = "";
                      setSaveDisabled(true);
                    }}
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

      {(matchedData.length > 0 || unmatchedData.length > 0) && (
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
                  <Typography variant="caption">{matchedData.length}</Typography>
                </ToggleButton>
                <ToggleButton value="UNMATCHED" aria-label="show unmatched">
                  <ErrorOutline fontSize="small" sx={{ mr: 0.5 }} />
                  <Typography variant="caption">{unmatchedData.length}</Typography>
                </ToggleButton>
              </ToggleButtonGroup>
              
              <Chip 
                label={`Total: ${matchedData.length + unmatchedData.length}`} 
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
                disabled={matchedData.length === 0}
                sx={{ mr: 1 }}
              >
                Validate Matches
              </Button>
            </Box>
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
                          <IconButton
                            size="small"
                            onClick={() => handleToggleRow(row.id)}
                          >
                            {openRows[row.id] ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
                          </IconButton>
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
                      <TableRow>
                        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
                          <Collapse in={openRows[row.id]} timeout="auto" unmountOnExit>
                            <Box sx={{ margin: 1 }}>
                              <Typography variant="subtitle2">Full Record</Typography>
                              <pre style={{ 
                                fontFamily: 'monospace',
                                backgroundColor: '#f5f5f5',
                                padding: '10px',
                                borderRadius: '4px',
                                overflowX: 'auto'
                              }}>
                                {JSON.stringify({
                                  ...row.originalData,
                                  matchStatus: row.matchStatus,
                                  matchDetails: row.matchDetails,
                                  remarks: row.remarks
                                }, null, 2)}
                              </pre>
                            </Box>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    </React.Fragment>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      <Typography variant="body2" color="textSecondary">
                        No {displayMode.toLowerCase()} records found
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

              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<SaveAlt />}
                  onClick={() => exportValidatedData('VALID')}
                  disabled={validData.length === 0}
                  sx={{ mr: 1 }}
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
    </div>
  );
};

export default DataProcessingTool;