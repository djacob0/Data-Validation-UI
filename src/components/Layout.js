import React from "react";
import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";

const Layout = ({ onSignOut }) => {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Bar */}
      <div className="fixed top-0 left-0 w-full h-14 bg-gray-800 text-white px-6 flex items-center justify-between shadow-md z-50">
        <div className="flex items-center space-x-3">
          <img
            src="/DAlogo2.png"
            alt="Logo"
            className="w-8 h-8 rounded-full object-cover"
          />
          <h1 className="text-xl italic font-['Roboto']">Data Cleanup System</h1>
        </div>
        <img
            src="/profile-pic.png"
            alt="Profile"
            className="w-8 h-8 rounded-full border border-white object-cover overflow-hidden aspect-square"
          />
      </div>

      {/* Main Layout */}
      <div className="flex flex-1 pt-14">
        {/* Navbar (Sidebar) */}
        <div className="sticky top-14 h-[calc(100vh-3.5rem)] bg-green-900 bg-opacity-85">
          <Navbar onSignOut={onSignOut} />
        </div>
        {/* Main Content */}
        <div className="flex-1 p-4 overflow-auto bg-gray-100">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default Layout;
