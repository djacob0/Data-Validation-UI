import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, TextField, Button, Typography, Box, CircularProgress } from "@mui/material";
import Swal from "sweetalert2";
import api from "../connection/api";

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState("");
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
  

  const handleLogin = async () => {
    if (!username || !password) {
      setError("Both fields are required!");
      return;
    }
  
    setLoading(true);
    try {
      const response = await api.post("/api/login", { username, password });
  
      console.log("Login API Response:", response.data); // Debugging: Check response
  
      const { token, user } = response.data;
  
      if (!token) throw new Error("Invalid token received"); // Prevent login if no token
  
      localStorage.setItem("authToken", token);
      localStorage.setItem("user", JSON.stringify(user));
  
      Swal.fire({
        title: "Login Successful!",
        icon: "success",
        timer: 1000,
        showConfirmButton: false,
      });
  
      onLogin(token);
      navigate("/");
    } catch (err) {
      console.error("Login error:", err.response?.data || err.message);
      setError(err.response?.data?.message || "Invalid login credentials");
  
      Swal.fire({
        title: "Error!",
        text: err.response?.data?.message || "Login failed",
        icon: "error",
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
              Data Validation and Profiling
            </Typography>
          </Box>
          <TextField
            fullWidth
            label="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
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
            onClick={handleLogin}
            fullWidth
            variant="contained"
            sx={{ mt: 2, backgroundColor: "green", "&:hover": { backgroundColor: "#4caf50" } }}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} sx={{ color: "white" }} /> : "Sign In"}
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
