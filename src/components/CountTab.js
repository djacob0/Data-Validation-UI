import React, { useState, useEffect } from "react";
import { useDataContext } from "../contexts/DataContext";

const CountTab = ({ isCollapsed, setColumnTotals = () => {} }) => {
  const { data, headers, setColumnTotals: contextSetColumnTotals } = useDataContext();
  const [totalCounts, setTotalCounts] = useState({
    totalRows: 0,
    totalColumns: 0,
    totalCountsPerColumn: {},
    totalCountsPerRow: [],
  });

  useEffect(() => {
    if (data.length > 0 && headers.length > 0) {
      calculateTotals(data, headers);
    }
  }, [data, headers]);

  const calculateTotals = (data, headers) => {
    const totalCountsPerColumn = {};
    const totalCountsPerRow = new Array(data.length).fill(0);

    headers.forEach((header, index) => {
      let columnSum = 0;
      data.forEach((row, rowIndex) => {
        const value = parseFloat(row[index]);
        if (!isNaN(value)) {
          columnSum += value;
          totalCountsPerRow[rowIndex] += value;
        }
      });
      totalCountsPerColumn[header] = columnSum;
    });

    setTotalCounts({
      totalRows: data.length,
      totalColumns: headers.length,
      totalCountsPerColumn,
      totalCountsPerRow,
    });
  };

  return (
    <div
      className={`p-4 sm:p-6 bg-white shadow-lg rounded-lg border transition-all duration-300
        ${isCollapsed ? "ml-0" : "md:ml-64"} 
        h-full flex flex-col overflow-y-auto`} // Ensure it takes the full height but scrolls vertically
    >
      <h2 className="text-lg md:text-xl text-center font-bold mb-4">Count Tab - Excel and CSV Import</h2>

      {/* Display Total Counts */}
      {data.length > 0 && headers.length > 0 && (
        <div className="mt-4">
          <h3 className="text-lg font-semibold">Total Counts</h3>

          {/* Total Rows */}
          <p>Total Rows: {totalCounts.totalRows}</p>

          {/* Total Columns */}
          <p>Total Columns: {totalCounts.totalColumns}</p>

          {/* Total Counts Per Column */}
          <div>
            <h4 className="font-semibold">Total Counts Per Column</h4>
            <ul>
              {Object.entries(totalCounts.totalCountsPerColumn).map(([column, total]) => (
                <li key={column}>{column}: {total}</li>
              ))}
            </ul>
          </div>

          {/* Total Counts Per Row */}
          <div>
            <h4 className="font-semibold">Total Counts Per Row</h4>
            <ul>
              {totalCounts.totalCountsPerRow.map((total, index) => (
                <li key={index}>Row {index + 1}: {total}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default CountTab;
