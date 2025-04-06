import React, { useState } from "react";
import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { Menu, X, Users as UsersIcon, BarChart2, LogOut, Home, Import, Github, Mail, Facebook, ChevronDown, ChevronUp } from "lucide-react";
import Swal from "sweetalert2";
import api from "../connection/api";

const Layout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDuplicateCheckerOpen, setIsDuplicateCheckerOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavClick = () => {
    setIsSidebarOpen(false);
  };

  const toggleDuplicateChecker = () => {
    setIsDuplicateCheckerOpen(!isDuplicateCheckerOpen);
  };

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

        try {
          if (token) {
            await api.post("/api/logout", {}, { headers: { Authorization: `Bearer ${token}` } });
          }

          localStorage.removeItem("authToken");
          localStorage.removeItem("user");
        } catch (err) {
          console.error("Logout error:", err.response?.data?.message || err.message);
        } finally {
          window.location.href = "/login";
        }
      }
    });
  };

  const NavItems = [
    { name: "Dashboard", icon: <Home size={20} />, path: "/dashboard" },
    { 
      name: "Data matching and duplicate check", 
      icon: <BarChart2 size={20} />, 
      path: null,
      subItems: [
        { name: "Data Matching", path: "/data-matching" },
        { name: "Duplicate Checker", path: "/duplicate" }
      ]
    },
    { name: "Automatic file fixer", icon: <Import size={20} />, path: "/import" }, 
    { name: "Users", icon: <UsersIcon size={20} />, path: "/users" },
  ];

  // Social media links data
  const socialLinks = [
    { icon: <Github size={20} />, url: "https://github.com/djacob0", color: "hover:text-gray-300" },
    { icon: <Mail size={20} />, url: "mailto:jacob35lol@gmail.com", color: "hover:text-red-300" },
    { icon: <Facebook size={20} />, url: "https://www.facebook.com/djaayyn0/", color: "hover:text-blue-300" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Top Navigation Bar (no background image) */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-white shadow-md z-50 flex items-center justify-between px-4 md:px-6">
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="md:hidden text-gray-600 hover:text-gray-900"
        >
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        <div className="flex items-center space-x-3">
          <img src="/DAlogo2.png" alt="Logo" className="w-10 h-10 rounded-full object-cover" />
          <h1 className="text-xl font-bold text-gray-800 hidden md:block">Data Cleanup</h1>
        </div>

        <button
          onClick={handleSignOut}
          className="text-red-600 hover:text-red-800 flex items-center space-x-2"
        >
          <LogOut size={20} />
          <span className="hidden md:inline">Sign Out</span>
        </button>
      </header>

      <div className="flex flex-1 pt-16">
        {/* Sidebar with DA.png background only */}
        <aside
          className={`fixed md:static top-16 bottom-0 left-0 w-64 transform transition-transform duration-300 z-40 ${
            isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
          } overflow-y-auto flex flex-col`}
          style={{
            backgroundImage: "url('/DA.png')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat"
          }}
        >
          {/* Dark overlay for better text visibility */}
          <div className="absolute inset-0 bg-black bg-opacity-50"></div>
          
          <div className="relative z-10 p-4 flex flex-col h-full">
            <nav className="space-y-2 flex-1">
              {NavItems.map((item, index) => (
                <div key={index}>
                  {item.path ? (
                    <Link
                      to={item.path}
                      onClick={handleNavClick}
                      className={`block px-4 py-2 text-white hover:bg-green-700 hover:bg-opacity-50 rounded-md flex items-center space-x-3 transition-colors ${
                        location.pathname === item.path ? 'bg-green-700 bg-opacity-50' : ''
                      }`}
                    >
                      {item.icon}
                      <span>{item.name}</span>
                    </Link>
                  ) : (
                    <div>
                      <button
                        onClick={toggleDuplicateChecker}
                        className={`w-full px-4 py-2 text-white hover:bg-green-700 hover:bg-opacity-50 rounded-md flex items-center justify-between transition-colors ${
                          location.pathname.startsWith('/duplicate') || location.pathname.startsWith('/data-matching') 
                            ? 'bg-green-700 bg-opacity-50' : ''
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          {item.icon}
                          <span>{item.name}</span>
                        </div>
                        {isDuplicateCheckerOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </button>
                      
                      {isDuplicateCheckerOpen && (
                        <div className="ml-6 mt-1 space-y-1">
                          {item.subItems.map((subItem, subIndex) => (
                            <Link
                              key={subIndex}
                              to={subItem.path}
                              onClick={handleNavClick}
                              className={`block px-4 py-2 text-white hover:bg-green-700 hover:bg-opacity-50 rounded-md transition-colors ${
                                location.pathname === subItem.path ? 'bg-green-700 bg-opacity-50' : ''
                              }`}
                            >
                              {subItem.name}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </nav>

            {/* Social media icons section added here */}
            <div className="mt-auto pb-4">
              <div className="border-t border-gray-600 pt-4">
                <p className="text-gray-300 text-center text-sm mb-3 px-2">Connect with us :</p>
                <div className="flex justify-center space-x-4">
                  {socialLinks.map((link, index) => (
                    <a
                      key={index}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`text-gray-400 ${link.color} transition-colors`}
                    >
                      {link.icon}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto bg-gray-50">
          <div className="p-4 md:p-6">
            <Outlet />
          </div>
        </main>
      </div>

      {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)} 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
        />
      )}
    </div>
  );
};

export default Layout;