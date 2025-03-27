import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./components/Login";
import SignUp from "./components/SignUp";
import Layout from "./components/Layout";
import Dashboard from "./components/Dashboard";
import Import from "./components/Import";
import CountTab from "./components/CountTab";
import { DataProvider } from "./contexts/DataContext";

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(
    localStorage.getItem("authToken") ? true : false
  );

  const handleLogin = (token) => {
    localStorage.setItem("authToken", token);
    setIsAuthenticated(true);
  };

  const handleSignOut = () => {
    localStorage.removeItem("authToken");
    setIsAuthenticated(false);
  };

  return (
    <DataProvider>
      <Router>
        <Routes>
          {isAuthenticated ? (
            <>
              <Route path="/" element={<Layout onSignOut={handleSignOut} />}>
                <Route index element={<Dashboard />} />
                <Route path="import" element={<Import />} />
                <Route path="count" element={<CountTab />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </>
          ) : (
            <>
              <Route path="/login" element={<Login onLogin={handleLogin} />} />
              <Route path="/signup" element={<SignUp />} />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </>
          )}
        </Routes>
      </Router>
    </DataProvider>
  );
};

export default App;
