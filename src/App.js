import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./components/Login";
import SignUp from "./components/SignUp";
import VerifySignupOtp from "./components/VerifySignupOtp";
import OTPVerification from "./components/OTPVerification";
import Layout from "./components/Layout";
import Dashboard from "./components/Dashboard";
import Import from "./components/Import";
import DuplicateValidator from "./components/DuplicateValidator";
import { DataProvider } from "./contexts/DataContext";
import Users from "./components/Users";
import ForgotPassword from "./components/ForgotPassword";
import DataMatching from "./components/DataMatching";

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
    localStorage.removeItem("user");
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
                <Route path="data-matching" element={<DataMatching />} />
                <Route path="duplicate" element={<DuplicateValidator />} />
                <Route path="users" element={<Users />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </>
          ) : (
            <>
              <Route path="/login" element={<Login onLogin={handleLogin} />} />
              <Route 
                path="/verify-otp" 
                element={<OTPVerification onVerify={handleLogin} />} 
              />
              <Route path="/signup" element={<SignUp />} />
              <Route path="/verify-signup-otp" element={<VerifySignupOtp />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </>
          )}
        </Routes>
      </Router>
    </DataProvider>
  );
};

export default App;