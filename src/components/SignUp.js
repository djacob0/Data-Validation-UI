import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Box,
  CircularProgress,
  Grid,
  MenuItem,
} from "@mui/material";
import Swal from "sweetalert2";
import api from "../connection/api"; // Ensure this is correctly set up for Axios

const SignUp = () => {
  const [formData, setFormData] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    phoneNumber: "",
    username: "",
    email: "",
    password: "",
    accountLevel: "",
    status: "",
  });

  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value.trim() });
  };

  const handleRegister = async () => {
    const { firstName, middleName, lastName, phoneNumber, username, email, password, accountLevel, status } = formData;

    // Validate required fields
    if (!firstName || !lastName || !phoneNumber || !username || !email || !password || !accountLevel || !status) {
      Swal.fire({ title: "Error!", text: "All fields are required!", icon: "error" });
      return;
    }

    // Password length validation
    if (password.length < 6) {
      Swal.fire({ title: "Error!", text: "Password must be at least 6 characters.", icon: "error" });
      return;
    }

    setLoading(true);
    try {
      const response = await api.post("/api/register", formData);
      const data = response.data;

      Swal.fire({ title: "Registration Successful!", icon: "success", timer: 2000, showConfirmButton: false });
      navigate("/login");
    } catch (err) {
      Swal.fire({
        title: "Error!",
        text: err.response?.data?.message || "Failed to sign up",
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
      <Card sx={{ width: 600, padding: 3, boxShadow: 3 }}>
        <CardContent>
          <Box display="flex" alignItems="center" justifyContent="center" mb={2}>
            <img src="/DAlogo.png" alt="Logo" className="h-12 w-12 mr-2" />
            <Typography variant="h6" fontWeight="bold" textAlign="center">
              Data Validation and Profiling Sign Up
            </Typography>
          </Box>

          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField fullWidth label="First Name" name="firstName" value={formData.firstName} onChange={handleChange} required />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="Middle Name" name="middleName" value={formData.middleName} onChange={handleChange} required />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="Last Name" name="lastName" value={formData.lastName} onChange={handleChange} required />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="Phone Number" name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} required />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth label="Username" name="username" value={formData.username} onChange={handleChange} required />
            </Grid>
            <Grid item xs={6}>
              <TextField fullWidth type="password" label="Password" name="password" value={formData.password} onChange={handleChange} required />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                select
                label="Account Level"
                name="accountLevel"
                value={formData.accountLevel}
                onChange={handleChange}
                required
              >
                <MenuItem value="Admin">Admin</MenuItem>
                <MenuItem value="User">User</MenuItem>
                <MenuItem value="Manager">Manager</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                select
                label="Status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                required
              >
                <MenuItem value="Active">Active</MenuItem>
                <MenuItem value="Inactive">Inactive</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth type="email" label="Email" name="email" value={formData.email} onChange={handleChange} required />
            </Grid>
          </Grid>

          <Button
            onClick={handleRegister}
            fullWidth
            variant="contained"
            sx={{ mt: 2, backgroundColor: "green", "&:hover": { backgroundColor: "#86b02d" } }}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} sx={{ color: "white" }} /> : "Sign Up"}
          </Button>

          <Typography variant="body2" sx={{ mt: 2, textAlign: "center" }}>
            Already have an account?{" "}
            <Button onClick={() => navigate("/login")} sx={{ color: "green", textDecoration: "underline" }}>
              Sign In
            </Button>
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
