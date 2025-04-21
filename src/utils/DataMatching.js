import Swal from "sweetalert2";
import dataMatchingAPI from "../connection/dataMatchingAPI";

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