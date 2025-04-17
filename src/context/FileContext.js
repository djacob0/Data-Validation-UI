
import { createContext, useContext, useState } from 'react';

export const FileContext = createContext();

export const FileProvider = ({ children }) => {
  const [fileState, setFileState] = useState({
    fileName: '',
    fileSize: 0,
    matchedData: [],
    unmatchedData: [],
    originalHeaders: [],
    originalData: []
  });

  const setFileName = (name) => setFileState(prev => ({ ...prev, fileName: name }));
  const setFileSize = (size) => setFileState(prev => ({ ...prev, fileSize: size }));
  const setMatchedData = (data) => setFileState(prev => ({ ...prev, matchedData: data }));
  const setUnmatchedData = (data) => setFileState(prev => ({ ...prev, unmatchedData: data }));
  const setOriginalHeaders = (headers) => setFileState(prev => ({ ...prev, originalHeaders: headers }));
  const setOriginalData = (data) => setFileState(prev => ({ ...prev, originalData: data }));
  
  const clearFileData = () => setFileState({
    fileName: '',
    fileSize: 0,
    matchedData: [],
    unmatchedData: [],
    originalHeaders: [],
    originalData: []
  });

  return (
    <FileContext.Provider value={{
      fileState,
      setFileName,
      setFileSize,
      setMatchedData,
      setUnmatchedData,
      setOriginalHeaders,
      setOriginalData,
      clearFileData
    }}>
      {children}
    </FileContext.Provider>
  );
};

export const useFileContext = () => {
  const context = useContext(FileContext);
  if (!context) {
    throw new Error('useFileContext must be used within a FileProvider');
  }
  return context;
};