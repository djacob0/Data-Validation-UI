import React, { useEffect, useState } from "react";
import api from "../connection/api";
import { Typography, Avatar, Chip, Divider, Tooltip, IconButton, Button, Dialog, DialogActions, DialogContent, DialogTitle, Badge
} from "@mui/material";
import { PersonOutline, EmailOutlined, PhoneOutlined, CalendarTodayOutlined, StarBorderOutlined, EditOutlined, RefreshOutlined, Notifications
} from '@mui/icons-material';
import { motion } from "framer-motion";

const Dashboard = ({ isCollapsed = false }) => {
  const [user, setUser] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [openModal, setOpenModal] = useState(false);

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
      
      if (response.data.user.accountLevel <= 2) {
        setIsAdmin(true);
        fetchPendingUsers();
      }
    } catch (err) {
      console.error("Profile fetch error:", err.response?.data?.message || err.message);
      setError("Failed to load profile. Please log in again.");
      localStorage.removeItem("authToken");
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingUsers = async () => {
    const token = localStorage.getItem("authToken");
    
    try {
      const response = await api.get("/api/pending-approvals", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPendingUsers(response.data.pendingUsers);
    } catch (err) {
      console.error("Fetch pending users error:", err);
    }
  };

  const handleApprove = async (userId) => {
    const token = localStorage.getItem("authToken");
  
    try {
      const response = await api.put(`/api/approve-user/${userId}`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchPendingUsers();
    } catch (err) {
      console.error("Approve user error:", err.response?.data?.message || err.message);
    }
  };

  const handleReject = async (userId) => {
    const token = localStorage.getItem("authToken");
    
    try {
      await api.put(`/api/reject-user/${userId}`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchPendingUsers();
    } catch (err) {
      console.error("Reject user error:", err);
    }
  };

  const getAccountLevelLabel = (level) => {
    switch (level) {
      case 1:
        return "Developer";
      case 2:
        return "Admin";
      case 3:
        return "User";
      default:
        return "Unknown";
    }
  };
  
  const renderStatCard = (label, value, icon, color) => (
    <div className="flex items-center gap-3 border border-gray-200 rounded-lg p-4 shadow-sm">
      <div className={`text-${color}-500`}>
        {icon}
      </div>
      <div>
        <Typography variant="body1" className="font-medium text-gray-800">
          {label}
        </Typography>
        <Typography variant="body2" className="text-gray-600">
          {value || 'N/A'}
        </Typography>
      </div>
    </div>
  );

  useEffect(() => {
    fetchProfile();
  }, []);

  const fullName = user ? formatFullName(user.firstName, user.middleName, user.lastName) : 'Loading...';

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
              Welcome back, <span className="text-primary-600">{user?.username || 'Loading...'}</span>!
            </Typography>
            <Typography variant="subtitle1" className="text-gray-500">
              Here's your account overview
            </Typography>
          </motion.div>
          
          <div className="flex items-center gap-4">
            {/* Notification Bell with Badge - Only for Admins */}
            {isAdmin && (
              <Tooltip title={pendingUsers.length > 0 ? "Pending approvals" : "No pending approvals"}>
                <IconButton 
                  onClick={() => pendingUsers.length > 0 && setOpenModal(true)}
                  color={pendingUsers.length > 0 ? "primary" : "default"}
                  disabled={pendingUsers.length === 0}
                >
                  <Badge 
                    badgeContent={pendingUsers.length} 
                    color="error"
                    max={99}
                  >
                    <Notifications />
                  </Badge>
                </IconButton>
              </Tooltip>
            )}
            
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

        {/* Profile and Account Details Section */}
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
                  src={user?.picture}
                  className="w-150 h-150 mx-auto mb-4 border-20 border-primary-200 shadow-md"
                  sx={{
                    backgroundColor: '#e0e0e0',
                    color: '#757575',
                    fontSize: '4rem'
                  }}
                >
                  {!user?.picture && <PersonOutline fontSize="inherit" />}
                </Avatar>
                {/* <Tooltip title="Edit profile">
                  <IconButton 
                    className="absolute bottom-4 right-1/4 bg-primary-100 hover:bg-primary-200"
                    size="small"
                  >
                    <EditOutlined fontSize="small" className="text-primary-600" />
                  </IconButton>
                </Tooltip> */}
              </div>
              
              <Typography variant="h5" className="font-semibold text-gray-800 mt-2">
                {fullName}
              </Typography>
              
              <Chip 
                label={`@${user?.username || 'Loading...'}`} 
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
                  label={user?.status || 'Loading...'} 
                  color={user?.status === 'active' ? 'success' : 'warning'}
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
                  user?.email || 'Loading...', 
                  <EmailOutlined />,
                  "secondary"
                )}
                {renderStatCard(
                  'Phone Number', 
                  user?.phoneNumber || 'Loading...', 
                  <PhoneOutlined />,
                  "info"
                )}
                {renderStatCard(
                  'Account Level', 
                  user?.accountLevel || 'Loading...', 
                  <StarBorderOutlined />,
                  "warning"
                )}
                {renderStatCard(
                  'Created By', 
                  user?.created_by || 'Loading...', 
                  <PersonOutline />,
                  "success"
                )}
                {renderStatCard(
                  'Member Since', 
                  user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Loading...', 
                  <CalendarTodayOutlined />,
                  "error"
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <Dialog 
        open={openModal} 
        onClose={() => setOpenModal(false)} 
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle className="flex items-center">
          Pending User Access Approvals
          {pendingUsers.length > 0 && (
            <Chip 
              label={`${pendingUsers.length} pending`} 
              color="primary" 
              size="small" 
              className="ml-3"
            />
          )}
        </DialogTitle>
        <DialogContent>
          {pendingUsers.length > 0 ? (
            <div className="space-y-4 mt-2">
              {pendingUsers.map((pendingUser) => (
                <div 
                  key={pendingUser.id} 
                  className="flex justify-between items-center p-3 border-b border-gray-100"
                >
                  <div>
                  <Typography variant="body2" className="text-gray-500">
                  @{pendingUser.username} • {pendingUser.email}
                  </Typography>
                  <Typography variant="body2" className="text-gray-500">
                    Role: {getAccountLevelLabel(pendingUser.accountLevel)}
                  </Typography>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="contained" 
                      color="success" 
                      size="small"
                      onClick={() => handleApprove(pendingUser.id)}
                    >
                      Approve
                    </Button>
                    <Button 
                      variant="outlined" 
                      color="error" 
                      size="small"
                      onClick={() => handleReject(pendingUser.id)}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <Typography variant="body2" className="text-gray-500">
            There are no users awaiting approval.
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setOpenModal(false)} color="primary">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  </div>
);
};

export default Dashboard;
