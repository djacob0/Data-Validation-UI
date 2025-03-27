import React, { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { Button } from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DeleteIcon from "@mui/icons-material/Delete";
import { useDataContext } from "../contexts/DataContext"; // Corrected import path
import Swal from "sweetalert2";  // Import SweetAlert2

const Import = ({ isCollapsed, setColumnTotalsFromProps = () => {} }) => {
  const { saveData, data, headers, setColumnTotals } = useDataContext(); // Get data, headers, and saveData from context
  const fileInputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);

  // Handle file selection
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      processFile(file);
    }
  };

  // Process and parse the Excel file
  const processFile = (file) => {
    const reader = new FileReader();
    reader.readAsBinaryString(file);

    reader.onload = (e) => {
      const binaryString = e.target.result;
      const workbook = XLSX.read(binaryString, { type: "binary" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const parsedData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

      saveData(parsedData);  // Save data to context
      calculateTotals(parsedData.slice(1), parsedData[0]);
    };
  };

  // Calculate column totals
  const calculateTotals = (rowData, columnHeaders) => {
    const totals = {};
    columnHeaders.forEach((header, index) => {
      totals[header] = rowData.reduce((sum, row) => {
        const value = parseFloat(row[index]);
        return !isNaN(value) ? sum + value : sum;
      }, 0);
    });

    setColumnTotals(totals); // Update column totals in context
    setColumnTotalsFromProps(totals); // Optionally update the totals passed as a prop
  };

  // Handle file removal (reset context data)
  const handleRemoveFile = () => {
    saveData([]);  // Reset the data in context
    setColumnTotals({});
    setColumnTotalsFromProps({});
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Handle save with SweetAlert notification
  const handleSave = () => {
    Swal.fire({
      icon: "info",  // Info icon
      title: "Data Saved",
      text: "Your data has been saved and go to Total Count tab for totals.",
      confirmButtonText: "OK",
      confirmButtonColor: "#3085d6",
    });
  };

  // Handle drag events for file upload
  const handleDragOver = (event) => {
    event.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => {
    setDragActive(false);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragActive(false);
    const file = event.dataTransfer.files[0];
    if (file) {
      processFile(file);
    }
  };

  return (
      <div
        className={`p-4 sm:p-15 bg-white shadow-lg rounded-lg border transition-all duration-300 
          ${isCollapsed ? "ml-0" : "md:ml-64"} 
          h-screen flex flex-col overflow-hidden`}
      >
      <h2 className="text-lg md:text-xl text-center font-bold mb-4">Import Excel and CSV files</h2>

      {/* Drag & Drop File Upload */}
      <div
        className={`border-2 border-dashed rounded-lg p-4 md:p-6 text-center cursor-pointer transition 
        ${dragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 bg-gray-100"}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <CloudUploadIcon className="text-blue-500 mb-2" style={{ fontSize: "48px" }} />
        <p className="text-gray-600">Drag & drop your file here, or</p>
        <input type="file" accept=".csv, .xlsx" onChange={handleFileChange} className="hidden" ref={fileInputRef} />
        <Button
          variant="contained"
          component="label"
          startIcon={<CloudUploadIcon />}
          className="mt-1 text-sm px-3 py-1 md:text-base md:px-1 md:py-1"
        >
          Choose File
          <input type="file" hidden accept=".csv, .xlsx" onChange={handleFileChange} />
        </Button>
      </div>

      {/* Save & Undo Buttons - Right Aligned */}
      {data.length > 0 && (
        <div className="flex justify-end mt-4 space-x-2">
          <Button variant="contained" color="primary" onClick={handleSave}>
            Save
          </Button>
          <Button variant="contained" startIcon={<DeleteIcon />} color="error" onClick={handleRemoveFile} size="small">
            Undo
          </Button>
        </div>
      )}

      {/* Table Preview */}
      {data.length > 0 && (
        <div className="flex-grow border rounded-md overflow-x-auto mt-4">
          <table className="min-w-full border-collapse">
            <thead className="sticky top-0 bg-gray-200 z-10">
              <tr>
                {headers.map((header, index) => (
                  <th key={index} className="p-2 md:p-3 text-left font-semibold border bg-gray-300 text-sm md:text-base">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, rowIndex) => (
                <tr key={rowIndex} className="odd:bg-white even:bg-gray-50">
                  {headers.map((_, cellIndex) => (
                    <td key={cellIndex} className="p-2 md:p-3 border whitespace-nowrap text-sm md:text-base">
                      {row[cellIndex] || ""}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Import;
