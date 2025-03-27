import React from 'react';

const FinalTab = () => {
  // Mock data for final valid and invalid records
  const finalValidRecords = [
    { Name: 'John Doe', Email: 'john@example.com', Age: 30 },
    { Name: 'Jane Smith', Email: 'jane@example.com', Age: 25 },
  ];

  const finalInvalidRecords = [
    { InvalidColumn1: 'Error1' },
    { InvalidColumn2: 'Error2' },
  ];

  return (
    <div>
      <h2 className="text-lg font-bold mb-4">Final Records</h2>
      <h3 className="font-semibold">Valid Records:</h3>
      <table className="min-w-full border">
        <thead>
          <tr>
            <th className="border px-4 py-2">Name</th>
            <th className="border px-4 py-2">Email</th>
            <th className="border px-4 py-2">Age</th>
          </tr>
        </thead>
        <tbody>
          {finalValidRecords.map((record, index) => (
            <tr key={index}>
              <td className="border px-4 py-2">{record.Name}</td>
              <td className="border px-4 py-2">{record.Email}</td>
              <td className="border px-4 py-2">{record.Age}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3 className="font-semibold mt-4">Invalid Records:</h3>
      <table className="min-w-full border">
        <thead>
          <tr>
            <th className="border px-4 py-2">Invalid Column 1</th>
            <th className="border px-4 py-2">Invalid Column 2</th>
          </tr>
        </thead>
        <tbody>
          {finalInvalidRecords.map((record, index) => (
            <tr key={index}>
              <td className="border px-4 py-2">{record.InvalidColumn1}</td>
              <td className="border px-4 py-2">{record.InvalidColumn2}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default FinalTab;