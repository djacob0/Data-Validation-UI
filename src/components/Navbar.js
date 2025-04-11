import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, Upload, ListOrdered, LogOut, Users } from "lucide-react";
import Swal from "sweetalert2";
import api from "../connection/api";

const Navbar = ({ onSignOut }) => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();

  const handleSignOut = async () => {
    Swal.fire({
      title: "Are you sure?",
      text: "You will be logged out of your account.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, Sign Out!",
    }).then(async (result) => {
      if (result.isConfirmed) {
        const token = localStorage.getItem("authToken");

        if (!token) {
          console.warn("No token found. Redirecting to login...");
          window.location.href = "/login";
          return;
        }

        try {
          // Send logout request
          await api.post("/api/logout", {}, { headers: { Authorization: `Bearer ${token}` } });

          // Clear session storage
          localStorage.removeItem("authToken");
          localStorage.removeItem("user");

          // Redirect to login page
          window.location.href = "/login";
        } catch (err) {
          console.error("Logout error:", err.response?.data?.message || err.message);
        }
      }
    });
  };

  return (
    <>
      {/* Mobile Top Navbar */}
      <div className="lg:hidden bg-green-900 bg-opacity-10 text-white p-4 flex justify-between items-center z-50 relative">
        <button onClick={() => setIsMobileOpen(!isMobileOpen)}>
          {isMobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
        <span className="text-lg font-bold"></span>
      </div>

      {/* Sidebar (Desktop) */}
      <nav className="fixed top-0 left-0 h-full w-64 bg-green-900 bg-opacity-80 text-white p-4 shadow-lg z-40 hidden lg:block pt-14">
        <ul className="mt-6 space-y-4">
          <li>
            <Link
              to="/"
              className={`flex items-center space-x-2 p-3 rounded-md transition ${
                location.pathname === "/" ? "bg-green-700 font-bold" : "hover:bg-green-800"
              }`}
            >
              <span>Dashboard</span>
            </Link>
          </li>
          <li>
            <Link
              to="/import"
              className={`flex items-center space-x-2 p-3 rounded-md transition ${
                location.pathname === "/import" ? "bg-green-700 font-bold" : "hover:bg-green-800"
              }`}
            >
              <Upload className="w-5 h-5" />
              <span>Import Data</span>
            </Link>
          </li>
          <li>
            <Link
              to="/count"
              className={`flex items-center space-x-2 p-3 rounded-md transition ${
                location.pathname === "/count" ? "bg-green-700 font-bold" : "hover:bg-green-800"
              }`}
            >
              <ListOrdered className="w-5 h-5" />
              <span>Total Count</span>
            </Link>
          </li>
          <li>
            <Link
              to="/users"
              className={`flex items-center space-x-2 p-3 rounded-md transition ${
                location.pathname === "/users" ? "bg-green-700 font-bold" : "hover:bg-green-800"
              }`}
            >
              <Users className="w-5 h-5" />
              <span>Users</span>
            </Link>
          </li>
          <li className="mt-6">
            <button
              onClick={handleSignOut}
              className="flex items-center space-x-2 bg-red-600 px-4 py-2 rounded-md hover:bg-red-700 transition w-full"
            >
              <LogOut className="w-5 h-5" />
              <span>Sign Out</span>
            </button>
          </li>
        </ul>
      </nav>

      {/* Mobile Overlay & Sidebar */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 top-14 bg-black bg-opacity-50 z-30 lg:hidden transition-opacity duration-100"
          onClick={() => setIsMobileOpen(false)}
        />
      )}
      <nav
        className={`fixed top-14 left-0 h-[calc(100vh-56px)] bg-[#084c33] bg-opacity-100 text-white p-4 shadow-lg transition-transform duration-300 ease-in-out z-40
            ${isMobileOpen ? "w-40 translate-x-0 opacity-90" : "-translate-x-full opacity-0"} lg:hidden`}
      >
        <ul className="mt-6 space-y-4">
          <li>
            <Link
              to="/"
              className={`flex items-center space-x-2 p-3 rounded-md transition ${
                location.pathname === "/" ? "bg-green-700 font-bold" : "hover:bg-green-800"
              }`}
              onClick={() => setIsMobileOpen(false)}
            >
              <span>Dashboard</span>
            </Link>
          </li>
          <li>
            <Link
              to="/import"
              className={`flex items-center space-x-2 p-3 rounded-md transition ${
                location.pathname === "/import" ? "bg-green-700 font-bold" : "hover:bg-green-800"
              }`}
              onClick={() => setIsMobileOpen(false)}
            >
              <Upload className="w-5 h-5" />
              <span>Import Data</span>
            </Link>
          </li>
          <li>
            <Link
              to="/count"
              className={`flex items-center space-x-2 p-3 rounded-md transition ${
                location.pathname === "/count" ? "bg-green-700 font-bold" : "hover:bg-green-800"
              }`}
              onClick={() => setIsMobileOpen(false)}
            >
              <ListOrdered className="w-5 h-5" />
              <span>Total Count</span>
            </Link>
          </li>
          <li>
            <Link
              to="/users"
              className={`flex items-center space-x-2 p-3 rounded-md transition ${
                location.pathname === "/users" ? "bg-green-700 font-bold" : "hover:bg-green-800"
              }`}
              onClick={() => setIsMobileOpen(false)}
            >
              <Users className="w-5 h-5" />
              <span>Users</span>
            </Link>
          </li>
          <li className="mt-6">
            <button
              onClick={handleSignOut}
              className="flex items-center space-x-2 bg-red-600 px-4 py-2 rounded-md hover:bg-red-700 transition w-full"
            >
              <LogOut className="w-5 h-5" />
              <span>Sign Out</span>
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
};

export default Navbar;
