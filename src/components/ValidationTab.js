import React from 'react';

const ValidationTab = () => {
  // Mock data for valid and invalid columns
  const validColumns = ['Name', 'Email', 'Age'];
  const invalidColumns = ['InvalidColumn1', 'InvalidColumn2'];

  return (
    <div>
      <h2 className="text-lg font-bold mb-4">Valid and Invalid Columns</h2>
      <h3 className="font-semibold">Valid Columns:</h3>
      <ul>
        {validColumns.map((col, index) => (
          <li key={index}>{col}</li>
        ))}
      </ul>
      <h3 className="font-semibold">Invalid Columns:</h3>
      <ul>
        {invalidColumns.map((col, index) => (
          <li key={index}>{col}</li>
        ))}
      </ul>
    </div>
  );
};

export default ValidationTab;