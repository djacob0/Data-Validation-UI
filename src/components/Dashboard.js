import React from 'react';

const Dashboard = ({ isCollapsed }) => {
  return (
    <div
      className={`p-4 sm:p-15 bg-white shadow-lg rounded-lg border transition-all duration-300 
        ${isCollapsed ? "ml-0" : "md:ml-64"} 
        h-screen flex flex-col overflow-hidden`}
    >
      <h2 className="text-2xl font-bold text-gray-600 text-center">
        Welcome to the Dashboard
      </h2>
    </div>
  );
};

export default Dashboard;
