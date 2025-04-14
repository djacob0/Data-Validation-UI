import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, TextField, Button, Typography, Box, CircularProgress, Grid
} from "@mui/material";
import Swal from "sweetalert2";
import api from "../connection/api";

const VerifySignupOtp = () => {
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [isResendDisabled, setIsResendDisabled] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const { email, tempUser } = location.state || {};

  useEffect(() => {
    if (!email || !tempUser) {
      Swal.fire("Error", "Registration session expired. Please sign up again.", "error")
        .then(() => navigate("/signup"));
      return;
    }

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsResendDisabled(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [email, tempUser, navigate]);

  const handleVerify = async (e) => {
    e?.preventDefault();
    if (!otp || otp.length !== 6) {
      setError("Please enter a valid 6-digit OTP");
      return;
    }

    setLoading(true);
    try {
      const verificationData = {
        email,
        otpCode: otp,
        username: tempUser.username,
        password: tempUser.password,
        firstName: tempUser.firstName,
        middleName: tempUser.middleName || "",
        lastName: tempUser.lastName,
        phoneNumber: tempUser.phoneNumber,
        accountLevel: tempUser.accountLevel,
        status: tempUser.status
      };
      
      const response = await api.post("/api/verify-signup-otp", verificationData);

      await Swal.fire({
        title: "Success!",
        text: "Account verified successfully",
        icon: "success",
        timer: 3000
      });

      navigate("/login");
    } catch (err) {
      const errorMsg = err.response?.data?.message || 
                      "Verification failed. Please try again.";
      
      setError(errorMsg);
      await Swal.fire("Error", errorMsg, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    try {
      setLoading(true);
      const { email } = location.state || {};
      
      if (!email) {
        throw new Error("Registration session expired. Please sign up again.");
      }
  
      const payload = {
        email,
        purpose: "registration"
      };
  
      const response = await api.post("/api/resend-otp", payload);
      
      setCountdown(60);
      setIsResendDisabled(true);
      setOtp("");
      setError("");
  
      await Swal.fire({
        title: "Success!",
        html: `
          <div>
            <p>New OTP sent to ${email}</p>
            ${process.env.NODE_ENV === "development" ? 
             `<p class="debug-info">Debug OTP: ${response.data.debugCode}</p>` : ''}
          </div>
        `,
        icon: "success",
        timer: 3000
      });
  
    } catch (err) {
      const errorMessage = err.response?.data?.message || 
                         err.message || 
                         "Failed to resend OTP. Please try again.";
  
      setError(errorMessage);
      await Swal.fire({
        title: "Error!",
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
            <Typography variant="h6" fontWeight="bold">
              Verify Your Email
            </Typography>
          </Box>
          
          <Typography variant="body1" textAlign="center" mb={3}>
            We've sent a 6-digit code to {email}
          </Typography>

          <form onSubmit={handleVerify} style={{ width: '100%' }}>
            <TextField
              fullWidth
              label="Enter OTP"
              value={otp}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                setOtp(val);
                if (val.length === 6) setError("");
              }}
              error={!!error}
              helperText={error}
              margin="normal"
              inputProps={{ 
                maxLength: 6,
                inputMode: 'numeric'
              }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ 
                mt: 2, 
                bgcolor: "green",
                "&:hover": { bgcolor: "#4caf50" } 
              }}
              disabled={loading || otp.length !== 6}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : "Verify"}
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

          <Typography variant="caption" color="textSecondary" mt={2}>
            © Department of Agriculture 2025
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default VerifySignupOtp;