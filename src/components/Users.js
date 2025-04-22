import React, { useState, useEffect } from "react";
import api from "../connection/api";
import Swal from "sweetalert2";
import { motion, AnimatePresence } from "framer-motion";
import {Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, FormControl, InputLabel, Select,MenuItem, Grid, Typography, 
IconButton, Box, Chip, Tooltip
} from "@mui/material";
import { Close, Save, Delete, Edit, Verified, Pending, Block } from "@mui/icons-material";

const Users = () => {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const [newUser, setNewUser] = useState({
    username: "",
    email: "",
    password: "",
    firstName: "",
    middleName: "",
    lastName: "",
    phoneNumber: "",
    status: "PENDING",
    accountLevel: "3"
  });
  const [selectedUser, setSelectedUser] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentUserRole, setCurrentUserRole] = useState(null);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchUsers();
    fetchCurrentUser();
  }, []);

  const fetchCurrentUser = async () => {
    const token = localStorage.getItem("authToken");
    if (!token) return;

    try {
      const response = await api.get("/api/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCurrentUserRole(response.data.user.accountLevel);
    } catch (error) {
      console.error("Error fetching current user:", error);
    }
  };

  const fetchUsers = async () => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      setError("No token found. Please log in.");
      return;
    }

    try {
      const response = await api.get("/api/users-by-approver", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(response.data.users || []);
    } catch (error) {
      console.error("Error fetching users:", error.response?.data || error.message);
      setError("Unauthorized. Please log in again.");
    }
  };

  const createUser = async () => {
    if (!newUser.username || !newUser.password || !newUser.email || !newUser.firstName || !newUser.lastName) {
      Swal.fire({
        icon: "error",
        title: "Missing Fields",
        text: "Please fill in all required fields!",
        timer: 2000
      });
      return;
    }

    const token = localStorage.getItem("authToken");
    if (!token) {
      Swal.fire({ icon: "error", title: "Unauthorized", text: "Authentication token not found. Please log in." });
      return;
    }

    try {
      await api.post("/api/users", newUser, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setNewUser({
        username: "",
        email: "",
        password: "",
        firstName: "",
        middleName: "",
        lastName: "",
        phoneNumber: "",
        status: "PENDING",
        accountLevel: "3"
      });
      setIsModalOpen(false);
      fetchUsers();

      Swal.fire({ 
        icon: "success", 
        title: "User Created", 
        text: "User successfully created! Status: PENDING",
        timer: 2000, 
        showConfirmButton: false 
      });
    } catch (error) {
      console.error("Error creating user:", error.response?.data || error.message);
      Swal.fire({ 
        icon: "error", 
        title: "Error", 
        timer: 2000,
        text: error.response?.data?.message || "Error creating user." 
      });
    }
  };

  const updateUser = async () => {
    const token = localStorage.getItem("authToken");
    if (!token) {
        Swal.fire({ icon: "error", title: "Unauthorized", text: "Authentication token not found. Please log in." });
        return;
    }

    try {
        const updatePayload = {
            status: selectedUser.status,
            accountLevel: selectedUser.accountLevel
        };

        const response = await api.put(
            `/api/users-by-approver/${selectedUser.id}`, 
            updatePayload,
            {
                headers: { Authorization: `Bearer ${token}` },
            }
        );

        setIsModalOpen(false);
        setSelectedUser(null);
        fetchUsers();

        Swal.fire({ 
            icon: "success", 
            title: "User Updated", 
            text: `User successfully updated!`,
            timer: 2000, 
            showConfirmButton: false 
        });
    } catch (error) {
        console.error("Error updating user:", {
            error: error.response?.data || error.message,
            selectedUserId: selectedUser?.id,
            requestUrl: `/api/users-by-approver/${selectedUser?.id}`
        });
        Swal.fire({ 
            icon: "error", 
            title: "Error", 
            timer: 2000,
            text: error.response?.data?.message || "Error updating user status" 
        });
    }
};

const updateUserProfile = async (profileData) => {
  const token = localStorage.getItem("authToken");
  try {
    await api.put(
      `/api/users/${selectedUser.id}/profile`,
      profileData,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return true;
  } catch (error) {
    console.error("Profile update error:", error);
    Swal.fire({
      icon: "error",
      title: "Update Failed",
      timer: 2000,
      text: error.response?.data?.message || "Failed to update profile"
    });
    return false;
  }
};

  const deleteUser = async (id) => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      Swal.fire({ icon: "error", title: "Unauthorized", text: "Authentication token not found. Please log in." });
      return;
    }

    Swal.fire({
      icon: "warning",
      title: "Are you sure?",
      text: "This action cannot be undone!",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it!",
      cancelButtonText: "Cancel",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await api.delete(`/api/users/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          fetchUsers();

          Swal.fire({ 
            icon: "success", 
            title: "User Deleted", 
            text: "User successfully deleted!",
            timer: 2000, 
            showConfirmButton: false 
          });
        } catch (error) {
          console.error("Error deleting user:", error.response?.data || error.message);
          Swal.fire({ 
            icon: "error",
            timer: 2000,
            title: "Error",
            text: error.response?.data?.message || "Error deleting user." 
          });
        }
      }
    });
  };

  const handleUserInputChange = (e) => {
    const { name, value } = e.target;
    setNewUser(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEditUserInputChange = (e) => {
    const { name, value } = e.target;
    setSelectedUser(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case "APPROVED":
        return <Verified color="success" />;
      case "PENDING":
        return <Pending color="warning" />;
      case "REJECTED":
        return <Block color="error" />;
      default:
        return <Pending color="warning" />;
    }
  };

  const getAccountLevelLabel = (level) => {
    switch(level) {
      case 1: return "Developer";
      case 2: return "Admin";
      case 3: return "User";
      default: return "User";
    }
  };  

  const indexOfLastUser = currentPage * itemsPerPage;
  const indexOfFirstUser = indexOfLastUser - itemsPerPage;
  const currentUsers = users.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(users.length / itemsPerPage);

  return (
    <div className="p-4">

      <div className="space-y-2">
        {currentUsers.map((user, index) => (
          <motion.div 
            key={user.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            whileHover={{ scale: 1.01 }}
            className="p-4 border rounded-lg flex justify-between items-center bg-white shadow-sm hover:shadow-md transition-shadow"
          >
            <div>
              <p className="font-medium">{user.username}</p>
              <p className="text-gray-600 text-sm">{user.email}</p>
              <div className="flex space-x-2 mt-1">
              <Tooltip title={user.status}>
                  <Chip 
                    icon={getStatusIcon(user.status)}
                    label={user.status} 
                    size="small"
                    variant="outlined"
                    color={
                      user.status === "REJECTED" && !isModalOpen 
                        ? "error"
                        : user.status === "APPROVED"
                        ? "success"
                        : "warning"
                    }
                  />
                </Tooltip>
                <Tooltip title="Account Level">
                  <Chip 
                    label={getAccountLevelLabel(user.accountLevel)} 
                    size="small"
                    color="info"
                    variant="outlined"
                  />
                </Tooltip>
              </div>
            </div>
            <div className="flex space-x-2">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  variant="outlined"
                  startIcon={<Edit />}
                  onClick={() => {
                    setSelectedUser({
                      ...user,
                      status: ["APPROVED", "PENDING", "REJECTED"].includes(user.status) 
                        ? user.status 
                        : "PENDING"
                    });
                    setIsModalOpen(true);
                  }}
                  disabled={currentUserRole > 2}
                >
                  Edit
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<Delete />}
                  onClick={() => deleteUser(user.id)}
                  disabled={currentUserRole > 2 || ["1", "2"].includes(user.id)} // Can't delete protected users
                >
                  Delete
                </Button>
              </motion.div>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Dialog 
              open={isModalOpen} 
              onClose={() => {
                setIsModalOpen(false);
                setSelectedUser(null);
              }}
              maxWidth="sm"
              fullWidth
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
              >
                <DialogTitle>
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Typography variant="h6">
                      {selectedUser ? "Edit User" : "Add New User"}
                    </Typography>
                    <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                      <IconButton onClick={() => {
                        setIsModalOpen(false);
                        setSelectedUser(null);
                      }}>
                        <Close />
                      </IconButton>
                    </motion.div>
                  </Box>
                </DialogTitle>

                <DialogContent dividers>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="First Name"
                        name="firstName"
                        value={selectedUser?.firstName || ""}
                        onChange={handleEditUserInputChange}
                        margin="normal"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Last Name"
                        name="lastName"
                        value={selectedUser?.lastName || ""}
                        onChange={handleEditUserInputChange}
                        margin="normal"
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Middle Name"
                        name="middleName"
                        value={selectedUser ?.middleName || ""}
                        onChange={handleEditUserInputChange}
                        margin="normal"
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Email"
                        name="email"
                        type="email"
                        value={selectedUser?.email || ""}
                        onChange={handleEditUserInputChange}
                        required
                        margin="normal"
                      />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="Password"
                          name="password"
                          type="password"
                          value={newUser.password}
                          onChange={handleUserInputChange}
                          required
                          margin="normal"
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="Confirm Password"
                          name="confirmpassword"
                          type="confirmpassword"
                          // value={newUser.password}
                          onChange={handleUserInputChange}
                          required
                          margin="normal"
                        />
                      </Grid>
                      <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Phone Number"
                        name="phoneNumber"
                        value={selectedUser?.phoneNumber || ""}
                        onChange={handleEditUserInputChange}
                        margin="normal"
                      />
                    </Grid>
                    {selectedUser && currentUserRole <= 2 && (
                      <>
                        <Grid item xs={12} sm={6}>
                          <FormControl fullWidth margin="normal">
                            <InputLabel>Account Level</InputLabel>
                            <Select
                              name="accountLevel"
                              value={selectedUser?.accountLevel || "3"}
                              onChange={handleEditUserInputChange}
                              label="Account Level"
                              disabled={selectedUser.status === "REJECTED"}
                            >
                              <MenuItem value="1">Developer</MenuItem>
                              <MenuItem value="2">Admin</MenuItem>
                              <MenuItem value="3">User</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={12}>
                          <FormControl fullWidth margin="normal">
                            <InputLabel>Status</InputLabel>
                            <Select
                              name="status"
                              value={selectedUser?.status || "PENDING"}
                              onChange={handleEditUserInputChange}
                              label="Status"
                              disabled={selectedUser.status === "REJECTED"}
                            >
                              <MenuItem value="APPROVED">Approved</MenuItem>
                              <MenuItem value="PENDING">Pending</MenuItem>
                              <MenuItem value="REJECTED">Rejected</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                      </>
                    )}
                  </Grid>
                </DialogContent>
                <DialogActions>
                  <Button 
                    onClick={() => {
                      setIsModalOpen(false);
                      setSelectedUser();
                    }} 
                    sx={{ backgroundColor: 'white', color: 'red' }}
                    startIcon={<Close />}
                  >
                    Cancel
                  </Button>

                  {currentUserRole > 2 && (
                    <Button
                      onClick={async () => {
                        const success = await updateUserProfile({
                          firstName: selectedUser.firstName,
                          lastName: selectedUser.lastName,
                          phoneNumber: selectedUser.phoneNumber
                        });
                        if (success) {
                          setIsModalOpen(false);
                          fetchUsers();
                        }
                      }}
                      color="primary"
                      variant="contained"
                      startIcon={<Save />}
                    >
                      Save Profile
                    </Button>
                  )}
                  {currentUserRole <= 2 && (
                    <Button
                      onClick={updateUser}
                      color="primary"
                      variant="contained"
                      startIcon={<Save />}
                    >
                      Update User
                    </Button>
                  )}
                </DialogActions>
              </motion.div>
            </Dialog>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Users;