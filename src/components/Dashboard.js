import React, { useEffect, useState } from "react";
import api from "../connection/api";
import { 
  Typography, 
  Avatar, 
  Chip, 
  Divider,
  LinearProgress,
  Tooltip,
  IconButton
} from "@mui/material";
import { 
  PersonOutline, 
  EmailOutlined, 
  PhoneOutlined, 
  CalendarTodayOutlined,
  SecurityOutlined,
  StarBorderOutlined,
  EditOutlined,
  RefreshOutlined
} from '@mui/icons-material';
import { motion } from "framer-motion";

const Dashboard = ({ isCollapsed = false }) => {
  const [user, setUser] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Helper function to concatenate names
  const formatFullName = (firstName, middleName, lastName) => {
    const nameParts = [
      firstName?.trim(), 
      middleName?.trim(), 
      lastName?.trim()
    ].filter(part => part && part !== '');
    
    return nameParts.length > 0 ? nameParts.join(' ') : 'N/A';
  };

  const fetchProfile = async () => {
    setLoading(true);
    const token = localStorage.getItem("authToken");

    if (!token) {
      setError("No token found. Please log in.");
      setLoading(false);
      return;
    }

    try {
      const response = await api.get("/api/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });

      setUser(response.data.user);
      setError("");
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Profile fetch error:", err.response?.data?.message || err.message);
      setError("Failed to load profile. Please log in again.");
      localStorage.removeItem("authToken");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const renderStatCard = (title, value, icon, color = "primary") => (
    <motion.div 
      whileHover={{ scale: 1.03 }}
      className={`p-4 bg-gradient-to-br from-${color}-50 to-white shadow-md rounded-lg flex items-center gap-4 transition-all duration-300 border border-${color}-100`}
    >
      <div className={`p-3 rounded-full bg-${color}-100`}>
        {React.cloneElement(icon, { className: `text-${color}-600` })}
      </div>
      <div>
        <Typography variant="subtitle2" className="text-gray-500">
          {title}
        </Typography>
        <Typography variant="h6" className="font-medium text-gray-800">
          {value || 'N/A'}
        </Typography>
      </div>
    </motion.div>
  );

  if (loading && !user) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <LinearProgress className="w-1/2" />
        <Typography className="mt-4 text-gray-600">
          Loading your profile...
        </Typography>
      </div>
    );
  }

  if (error) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="p-6 bg-red-50 rounded-lg text-center max-w-md mx-auto mt-8"
      >
        <Typography variant="h6" className="text-red-600 mb-2">
          Error Loading Profile
        </Typography>
        <Typography className="text-gray-700 mb-4">{error}</Typography>
        <button 
          onClick={fetchProfile}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
        >
          Try Again
        </button>
      </motion.div>
    );
  }

  const fullName = formatFullName(user.firstName, user.middleName, user.lastName);

  return (
    <div className="p-4 md:p-8">
      <div className="space-y-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Typography 
              variant="h3" 
              className="font-bold text-gray-900"
            >
              Welcome back, <span className="text-primary-600">{user.username}</span>!
            </Typography>
            <Typography variant="subtitle1" className="text-gray-500">
              Here's your account overview
            </Typography>
          </motion.div>
          
          <div className="flex items-center gap-2">
            {lastUpdated && (
              <Typography variant="caption" className="text-gray-400">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </Typography>
            )}
            <Tooltip title="Refresh data">
              <IconButton onClick={fetchProfile} color="primary">
                <RefreshOutlined />
              </IconButton>
            </Tooltip>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Profile Card */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="md:col-span-1"
          >
            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 text-center h-full">
              <div className="relative">
                <Avatar
                  alt="Profile Picture"
                  src={user.picture || "/default-avatar.jpg"}
                  className="w-40 h-40 mx-auto mb-4 border-4 border-primary-200 shadow-md"
                />
                <Tooltip title="Edit profile">
                  <IconButton 
                    className="absolute bottom-4 right-1/4 bg-primary-100 hover:bg-primary-200"
                    size="small"
                  >
                    <EditOutlined fontSize="small" className="text-primary-600" />
                  </IconButton>
                </Tooltip>
              </div>
              
              <Typography variant="h5" className="font-semibold text-gray-800 mt-2">
                {fullName}
              </Typography>
              
              <Chip 
                label={`@${user.username}`} 
                color="primary" 
                variant="outlined"
                size="small"
                className="mt-2"
              />
              
              <div className="mt-6 pt-4 border-t border-gray-100">
                <Typography variant="body2" className="text-gray-500 mb-1">
                  Account Status
                </Typography>
                <Chip 
                  label={user.status} 
                  color={user.status === 'active' ? 'success' : 'warning'}
                  size="small"
                />
              </div>
            </div>
          </motion.div>

          {/* User Details Grid */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="md:col-span-2"
          >
            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 h-full">
              <div className="flex justify-between items-center mb-4">
                <Typography variant="h5" className="font-semibold text-gray-800">
                  Account Details
                </Typography>
                <Tooltip title="Edit details">
                  <IconButton size="small">
                    <EditOutlined fontSize="small" className="text-gray-500" />
                  </IconButton>
                </Tooltip>
              </div>
              
              <Divider className="mb-6" />
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {renderStatCard(
                  'Full Name', 
                  fullName, 
                  <PersonOutline />,
                  "primary"
                )}
                {renderStatCard(
                  'Email Address', 
                  user.email, 
                  <EmailOutlined />,
                  "secondary"
                )}
                {renderStatCard(
                  'Phone Number', 
                  user.phoneNumber, 
                  <PhoneOutlined />,
                  "info"
                )}
                {renderStatCard(
                  'Account Level', 
                  user.accountLevel, 
                  <StarBorderOutlined />,
                  "warning"
                )}
                {renderStatCard(
                  'Created By', 
                  user.created_by, 
                  <PersonOutline />,
                  "success"
                )}
                {renderStatCard(
                  'Member Since', 
                  new Date(user.created_at).toLocaleDateString(), 
                  <CalendarTodayOutlined />,
                  "error"
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;