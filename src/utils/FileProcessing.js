import * as XLSX from "xlsx";
import Swal from "sweetalert2";
import dataMatchingAPI from "../connection/dataMatchingAPI";

export const processFile = async (file, setProcessing, setFileName, setExportFileName, setPage, setSaveDisabled, setMatchedData, setUnmatchedData, setOriginalHeaders, setOriginalData, setFileSize) => {
  setProcessing(true);
  setMatchedData([]);
  setUnmatchedData([]);
  setFileName(file.name);
  setExportFileName(file.name.replace(/\.[^/.]+$/, ""));
  setPage(0);
  setSaveDisabled(true);
  
  return new Promise((resolve, reject) => {
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
          reject("Empty file");
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
          reject("Missing required columns");
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
        resolve(rows);
      } catch (error) {
        console.error("Error processing file:", error);
        Swal.fire("Error", "Failed to process the file", "error");
        reject(error);
      } finally {
        setProcessing(false);
      }
    };
    reader.readAsBinaryString(file);
  });
};

export const matchDataWithAPI = async (rows, setMatching, setMatchedData, setUnmatchedData) => {
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
                showDetails: false
              };
            } else {
              totalUnmatched++;
              return {
                ...row,
                matchStatus: "UNMATCHED",
                remarks: response.data.message || "No matching record found",
                unmatchedRecords: response.data.unmatchedRecords || [],
                showDetails: true
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
              showDetails: true
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