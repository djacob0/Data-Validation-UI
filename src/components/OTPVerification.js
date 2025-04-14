import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, TextField, Button, Typography, Box, CircularProgress, Grid
} from "@mui/material";
import Swal from "sweetalert2";
import api from "../connection/api";

const OTPVerification = ({ onVerify }) => {
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [isResendDisabled, setIsResendDisabled] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  // Get username from location state (passed from login)
  const username = location.state?.username || "";

  useEffect(() => {
    let timer;
    if (countdown > 0 && isResendDisabled) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else if (countdown === 0) {
      setIsResendDisabled(false);
    }
    return () => clearTimeout(timer);
  }, [countdown, isResendDisabled]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) {
        setError("Please enter a valid 6-digit OTP");
        return;
    }
  
    setLoading(true);
    try {
        const { email, userId } = location.state || {};
        
        if (!email || !userId) {
            throw new Error("Verification data is incomplete");
        }

        const response = await api.post("/api/verify-login-otp", {
            userId,
            otpCode: otp
        });

        localStorage.setItem("authToken", response.data.token);
        localStorage.setItem("user", JSON.stringify(response.data.user));

        await Swal.fire({
            title: "Success!",
            text: "You're now logged in",
            icon: "success",
            timer: 3000
        });

        onVerify(response.data.token);
        navigate("/");
    } catch (err) {
        const errorMessage = err.response?.data?.message || 
                           "Verification failed. Please request a new OTP if this persists.";
        
        setError(errorMessage);
        await Swal.fire({
            title: "Error!",
            text: errorMessage,
            icon: "error",
            timer: 3000
        });
        
        // Clear OTP field on error
        setOtp("");
    } finally {
        setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    try {
        setLoading(true);
        const { email } = location.state || {};
        
        if (!email) {
            throw new Error("Session expired. Please login again.");
        }

        const response = await api.post("/api/resend-otp", { 
            email, 
            purpose: "login" 
        });

        if (!response.data.success) {
            throw new Error(response.data.message);
        }

        // Reset UI
        setCountdown(60);
        setIsResendDisabled(true);
        setOtp("");
        setError("");
        
        await Swal.fire({
            title: "Success!",
            text: "New OTP sent to your email",
            icon: "success",
            timer: 3000
        });
    } catch (err) {
        setError(err.message);
        await Swal.fire({
            title: "Error!",
            text: err.message,
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
              OTP Verification
            </Typography>
          </Box>
          
          <Typography variant="body1" textAlign="center" mb={3}>
            We've sent a 6-digit verification code to your registered email/phone
          </Typography>

          <form onSubmit={handleSubmit} style={{ width: '100%' }}>
            <TextField
              fullWidth
              label="Enter OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              margin="normal"
              required
              inputProps={{ maxLength: 6 }}
            />

            {error && (
              <Typography color="error" variant="body2" mt={1}>
                {error}
              </Typography>
            )}

            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ 
                mt: 2, 
                backgroundColor: "green", 
                "&:hover": { backgroundColor: "#4caf50" } 
              }}
              disabled={loading || otp.length !== 6}
            >
              {loading ? <CircularProgress size={24} sx={{ color: "white" }} /> : "Verify"}
            </Button>
          </form>

          <Grid container justifyContent="center" mt={2}>
            <Typography variant="body2">
              Didn't receive code?{" "}
              <Button 
                onClick={handleResendOTP}
                disabled={isResendDisabled || loading}
                sx={{ 
                  color: isResendDisabled ? "text.disabled" : "green",
                  textDecoration: "underline",
                  minWidth: 0
                }}
              >
                Resend {isResendDisabled && `(${countdown}s)`}
              </Button>
            </Typography>
          </Grid>

          <Typography variant="caption" color="gray" sx={{ mt: 2 }}>
            © Department of Agriculture 2025
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default OTPVerification;