import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, TextField, Button, Typography, Box, CircularProgress } from "@mui/material";
import Swal from "sweetalert2";
import api from "../connection/api";

const Login = ({ onLogin }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (localStorage.getItem("authToken")) {
      onLogin();
      navigate("/");
    }
  }, [navigate, onLogin]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError("Both fields are required!");
      return;
    }
  
    setLoading(true);
    setError("");
  
    try {
      const response = await api.post("/api/login", { email, password });
      
      // console.log("Login API Response:", response.data);
  
      if (response.data.requiresOtp) {
        localStorage.setItem("otpUserId", response.data.userId.toString());
        navigate("/verify-otp", {
          state: { 
            email,
            userId: response.data.userId
          }
        });
      } else {
        throw new Error("Unexpected response - OTP should be required");
      }
    } catch (err) {
      console.error("Login error details:", {
        error: err,
        response: err.response?.data,
        status: err.response?.status
      });
  
      const errorMessage = err.response?.data?.message || 
                         err.message || 
                         "Login failed. Please try again.";
      
      setError(errorMessage);
      
      Swal.fire({
        title: "Login Error",
        text: errorMessage,
        icon: "error",
        timer: 3000
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      height="100vh"
      sx={{
        backgroundImage: "url(/DA.png)",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <Card sx={{ width: 400, padding: 3, boxShadow: 3 }}>
        <CardContent className="flex flex-col items-center">
          <Box display="flex" alignItems="center" justifyContent="center" mb={2}>
            <img src="/DAlogo.png" alt="Logo" className="h-12 w-12 mr-2" />
            <Typography variant="h6" fontWeight="bold" textAlign="center">
              Data Cleanup Self Service
            </Typography>
          </Box>
          <form onSubmit={handleSubmit} style={{ width: '100%' }}>
            <TextField
              fullWidth
              label="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              type="password"
              label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              margin="normal"
              required
            />
            {error && <Typography color="error">{error}</Typography>}
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 2, backgroundColor: "green", "&:hover": { backgroundColor: "#4caf50" } }}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} sx={{ color: "white" }} /> : "Sign In"}
            </Button>
          </form>
          <Button 
            onClick={() => navigate("/forgot-password")}
            sx={{ 
              mt: 2, 
              color: "green", 
              textTransform: 'none',
              textDecoration: 'underline'
            }}
          >
            Forgot Password?
          </Button>
          <Typography variant="body2" sx={{ mt: 2 }}>
            Don't have an account?{" "}
            <Button onClick={() => navigate("/signup")} sx={{ color: "green", textDecoration: "underline" }}>
              Sign Up
            </Button>
          </Typography>
          <Typography variant="caption" color="gray" sx={{ mt: 2 }}>
            © Department of Agriculture 2025
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Login;