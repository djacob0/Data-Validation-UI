import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, TextField, Button, Typography, Box, CircularProgress, Grid, MenuItem
} from "@mui/material";
import Swal from "sweetalert2";
import api from "../connection/api"; 

const SignUp = () => {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    email: "",
    firstName: "",
    middleName: "",
    lastName: "",
    phoneNumber: "",
    confirmPassword: "",
    accountLevel: "",
    status: false
  });

  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value.trim() });
  };

  const handleCheckboxChange = (e) => {
    setFormData({ ...formData, status: e.target.checked });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { firstName, middleName, lastName, phoneNumber, username, email, password, confirmPassword, accountLevel, status } = formData;
    
    if (!firstName || !lastName || !phoneNumber || !username || !email || !password || !confirmPassword || !accountLevel) {
      Swal.fire({ title: "Error!", text: "All fields are required!", icon: "error" });
      return;
    }
  
    if (password !== confirmPassword) {
      Swal.fire({ title: "Error!", text: "Passwords do not match!", icon: "error" });
      return;
    }
  
    if (password.length < 8) {
      Swal.fire({ title: "Error!", text: "Password must be at least 8 characters long including at least one uppercase letter.", icon: "error" });
      return;
    }
  
    setLoading(true);
    try {
      const tempUser = {
        username,
        password,
        email,
        firstName,
        middleName,
        lastName,
        phoneNumber,
        accountLevel,
      };

      const response = await api.post("/api/signup", tempUser);

      navigate("/verify-signup-otp", {
        state: { 
          email,
          tempUser
        }
      });
    } catch (err) {
      Swal.fire({
        title: "Error!",
        text: err.response?.data?.message || "Failed to sign up",
        icon: "error",
        timer: 2000
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
      <Card sx={{ width: 600, padding: 4, boxShadow: 3 }}>
        <CardContent>
          <Box display="flex" flexDirection="column" alignItems="center" textAlign="center" mb={2}>
            <img src="/DAlogo.png" alt="Logo" style={{ height: 48, marginBottom: 8 }} />
            <Typography variant="h6" fontWeight="bold">
              Data Cleaning Self Service Sign Up
            </Typography>
          </Box>

          <form onSubmit={handleSubmit}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}><TextField fullWidth size="small" label="First Name" name="firstName" value={formData.firstName} onChange={handleChange} required /></Grid>
              <Grid item xs={12} sm={6}><TextField fullWidth size="small" label="Middle Name" name="middleName" value={formData.middleName} onChange={handleChange} /></Grid>
              <Grid item xs={12} sm={6}><TextField fullWidth size="small" label="Last Name" name="lastName" value={formData.lastName} onChange={handleChange} required /></Grid>
              <Grid item xs={12} sm={6}><TextField fullWidth size="small" label="Phone Number" name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} required /></Grid>
              <Grid item xs={12} sm={6}><TextField fullWidth size="small" label="Username" name="username" value={formData.username} onChange={handleChange} required /></Grid>
              <Grid item xs={12} sm={6}><TextField fullWidth size="small" type="email" label="Email" name="email" value={formData.email} onChange={handleChange} required /></Grid>
              <Grid item xs={12} sm={6}><TextField fullWidth size="small" type="password" label="Password" name="password" value={formData.password} onChange={handleChange} required /></Grid>
              <Grid item xs={12} sm={6}><TextField fullWidth size="small" type="password" label="Re-enter Password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} required /></Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth size="small" select label="Account Level" name="accountLevel" value={formData.accountLevel} onChange={handleChange} required>
                  <MenuItem value="Admin">Developer</MenuItem>
                  <MenuItem value="User">Admin</MenuItem>
                  <MenuItem value="Manager">User</MenuItem>
                </TextField>
              </Grid>
            </Grid>

            <Button type="submit" fullWidth variant="contained" sx={{ mt: 2, backgroundColor: "green", "&:hover": { backgroundColor: "#4caf50" } }} disabled={loading}>
              {loading ? <CircularProgress size={24} sx={{ color: "white" }} /> : "Sign Up"}
            </Button>
          </form>

          <Typography variant="body2" sx={{ mt: 2, textAlign: "center" }}>
            Already have an account? <Button onClick={() => navigate("/login")} sx={{ color: "green", textDecoration: "underline" }}>Sign In</Button>
          </Typography>

          <Typography variant="caption" color="gray" sx={{ mt: 2, textAlign: "center", display: "block" }}>
            © Department of Agriculture 2025
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default SignUp;