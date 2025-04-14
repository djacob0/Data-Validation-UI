import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, TextField, Button, Typography, Box, CircularProgress, Grid
} from "@mui/material";
import Swal from "sweetalert2";
import api from "../connection/api";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [userId, setUserId] = useState(null);
  const [resendDisabled, setResendDisabled] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const navigate = useNavigate();

  useEffect(() => {
    let interval;
    if (resendDisabled && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    } else if (resendTimer === 0) {
      setResendDisabled(false);
      setResendTimer(60);
    }
    return () => clearInterval(interval);
  }, [resendDisabled, resendTimer]);

  const handleSendOtp = async (e) => {
    e?.preventDefault();
    if (!email) {
      setError("Email is required");
      return;
    }

    setLoading(true);
    try {
      const response = await api.post("/api/forgot-password", { email });
      setUserId(response.data.userId);
      setOtpSent(true);
      setResendDisabled(true);
      Swal.fire("Success", "OTP sent to your email", "success");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!email) {
      setError("Email is required");
      return;
    }

    setLoading(true);
    try {
      const response = await api.post("/api/resend-otp", { 
        email,
        purpose: "password_reset",
        userId
      });
      setResendDisabled(true);
      setResendTimer(60);
      Swal.fire("Success", "New OTP sent to your email", "success");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to resend OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e?.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    try {
      await api.post("/api/reset-password", {
        userId,
        otpCode: otp,
        newPassword
      });

      Swal.fire({
        title: "Success!",
        text: "Password reset successfully. Redirecting to login...",
        icon: "success",
        timer: 2000
      }).then(() => {
        navigate("/login");
      });
    } catch (err) {
      setError(err.response?.data?.message || "Password reset failed");
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
              Reset Password
            </Typography>
          </Box>

          {!otpSent ? (
            <form onSubmit={handleSendOtp} style={{ width: '100%' }}>
              <TextField
                fullWidth
                label="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                margin="normal"
                required
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 2, backgroundColor: "green", "&:hover": { backgroundColor: "#4caf50" } }}
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} sx={{ color: "white" }} /> : "Send OTP"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} style={{ width: '100%' }}>
              <TextField
                fullWidth
                label="OTP Code"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                margin="normal"
                required
              />
              
              <Grid container justifyContent="flex-end" sx={{ mb: 2 }}>
                <Button
                  onClick={handleResendOtp}
                  disabled={resendDisabled || loading}
                  sx={{ 
                    textTransform: 'none',
                    color: resendDisabled ? 'text.disabled' : 'primary.main'
                  }}
                >
                  {resendDisabled ? `Resend OTP in ${resendTimer}s` : 'Resend OTP'}
                </Button>
              </Grid>

              <TextField
                fullWidth
                type="password"
                label="New Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                margin="normal"
                required
              />
              <TextField
                fullWidth
                type="password"
                label="Confirm New Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                margin="normal"
                required
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 2, backgroundColor: "green", "&:hover": { backgroundColor: "#4caf50" } }}
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} sx={{ color: "white" }} /> : "Reset Password"}
              </Button>
            </form>
          )}

          {error && <Typography color="error" sx={{ mt: 2 }}>{error}</Typography>}

          <Button 
            onClick={() => navigate("/login")}
            sx={{ mt: 2, color: "green", textTransform: 'none' }}
          >
            Back to Login
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ForgotPassword;