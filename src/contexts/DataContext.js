import React, { createContext, useContext, useState } from 'react';

const DataContext = createContext();

export const DataProvider = ({ children }) => {
  const [data, setData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [columnTotals, setColumnTotals] = useState({});

  const saveData = (newData) => {
    setData(newData);
    setHeaders(newData[0] || []); // Set headers from the first row
  };

  return (
    <DataContext.Provider
      value={{
        data,
        headers,
        columnTotals,
        saveData,
        setColumnTotals,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useDataContext = () => {
  return useContext(DataContext);
};