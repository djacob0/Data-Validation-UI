import React, { useState, useEffect } from "react";
import api from "../connection/api";
import Swal from "sweetalert2";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Grid,
  Typography,
  IconButton,
  Box,
  Chip
} from "@mui/material";
import { Close, Save, PersonAdd, Delete, Edit } from "@mui/icons-material";

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
    status: true,
    accountLevel: "user"
  });
  const [selectedUser, setSelectedUser] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      setError("No token found. Please log in.");
      return;
    }

    try {
      const response = await api.get("/api/users", {
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
      });
      return;
    }

    const token = localStorage.getItem("authToken");
    if (!token) {
      Swal.fire({ icon: "error", title: "Unauthorized", text: "Authentication token not found. Please log in." });
      return;
    }

    try {
      const userToCreate = {
        ...newUser,
        status: newUser.status ? "active" : "inactive"
      };

      await api.post("/api/users", userToCreate, {
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
        status: true,
        accountLevel: "user"
      });
      setIsModalOpen(false);
      fetchUsers();

      Swal.fire({ 
        icon: "success", 
        title: "User Created", 
        text: "User successfully created!",
        timer: 2000, 
        showConfirmButton: false 
      });
    } catch (error) {
      console.error("Error creating user:", error.response?.data || error.message);
      Swal.fire({ 
        icon: "error", 
        title: "Error", 
        text: error.response?.data?.message || "Error creating user." 
      });
    }
  };

  const updateUser = async () => {
    if (!selectedUser.username || !selectedUser.email || !selectedUser.firstName || !selectedUser.lastName) {
      Swal.fire({
        icon: "error",
        title: "Missing Fields",
        text: "Please fill in all required fields!",
      });
      return;
    }

    const token = localStorage.getItem("authToken");
    if (!token) {
      Swal.fire({ icon: "error", title: "Unauthorized", text: "Authentication token not found. Please log in." });
      return;
    }

    try {
      const userToUpdate = {
        ...selectedUser,
        status: selectedUser.status ? "active" : "inactive"
      };

      await api.put(`/api/users/${selectedUser.id}`, userToUpdate, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setIsModalOpen(false);
      setSelectedUser(null);
      fetchUsers();

      Swal.fire({ 
        icon: "success", 
        title: "User Updated", 
        text: "User successfully updated!",
        timer: 2000, 
        showConfirmButton: false 
      });
    } catch (error) {
      console.error("Error updating user:", error.response?.data || error.message);
      Swal.fire({ 
        icon: "error", 
        title: "Error", 
        text: error.response?.data?.message || "Error updating user." 
      });
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
            title: "Error", 
            text: error.response?.data?.message || "Error deleting user." 
          });
        }
      }
    });
  };

  // Pagination Logic
  const indexOfLastUser = currentPage * itemsPerPage;
  const indexOfFirstUser = indexOfLastUser - itemsPerPage;
  const currentUsers = users.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(users.length / itemsPerPage);

  const handleUserInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNewUser(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleEditUserInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSelectedUser(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <div className="bg-gray-800 text-white p-3 rounded-lg shadow-md">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <div>
            <h2 className="text-3xl font-bold text-gray-800 tracking-tight">
              User Management
            </h2>
            <p className="text-gray-500 text-sm">
              Manage and control user accounts with ease
            </p>
          </div>
        </div>
        
        <Button
          variant="contained"
          startIcon={<PersonAdd />}
          onClick={() => setIsModalOpen(true)}
          className="bg-gray-800 hover:bg-gray-900"
        >
          Add User
        </Button>
      </div>
  
      {error && <p className="text-red-500">{error}</p>}
  
      <div className="space-y-2">
        {currentUsers.map((user) => (
          <div key={user.id} className="p-4 border rounded-lg flex justify-between items-center bg-white shadow-sm hover:shadow-md transition-shadow">
            <div>
              <p className="font-medium">{user.username}</p>
              <p className="text-gray-600 text-sm">{user.email}</p>
              <div className="flex space-x-2 mt-1">
                <Chip 
                  label={user.status || 'inactive'} 
                  size="small"
                  color={user.status === 'active' ? 'success' : 'error'}
                  variant="outlined"
                />
                <Chip 
                  label={user.accountLevel || 'user'} 
                  size="small"
                  color="info"
                  variant="outlined"
                />
              </div>
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outlined"
                startIcon={<Edit />}
                onClick={() => {
                  setSelectedUser({
                    ...user,
                    status: user.status === 'active'
                  });
                  setIsModalOpen(true);
                }}
              >
                Edit
              </Button>
              <Button
                variant="outlined"
                color="error"
                startIcon={<Delete />}
                onClick={() => deleteUser(user.id)}
              >
                Delete
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination Controls */}
      {users.length > 0 && (
        <div className="fixed bottom-4 right-4 bg-white shadow-md rounded-lg p-2 flex space-x-2 border border-gray-300">
          <Button
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            variant="outlined"
            size="small"
          >
            Prev
          </Button>

          {Array.from({ length: totalPages }, (_, i) => (
            <Button
              key={i}
              onClick={() => setCurrentPage(i + 1)}
              variant={currentPage === i + 1 ? "contained" : "outlined"}
              size="small"
            >
              {i + 1}
            </Button>
          ))}

          <Button
            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            variant="outlined"
            size="small"
          >
            Next
          </Button>
        </div>
      )}

      {/* Add/Edit User Dialog */}
      <Dialog 
        open={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false);
          setSelectedUser(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Typography variant="h6">
              {selectedUser ? "Edit User" : "Add New User"}
            </Typography>
            <IconButton onClick={() => {
              setIsModalOpen(false);
              setSelectedUser(null);
            }}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent dividers>
          <Grid container spacing={2}>
            {/* Required Fields */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={<span>Username <span style={{color: 'red'}}>*</span></span>}
                name="username"
                value={selectedUser ? selectedUser.username : newUser.username}
                onChange={selectedUser ? handleEditUserInputChange : handleUserInputChange}
                required
                margin="normal"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label={<span>First Name <span style={{color: 'red'}}>*</span></span>}
                name="firstName"
                value={selectedUser ? selectedUser.firstName : newUser.firstName}
                onChange={selectedUser ? handleEditUserInputChange : handleUserInputChange}
                required
                margin="normal"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Middle Name"
                name="middleName"
                value={selectedUser ? selectedUser.middleName : newUser.middleName}
                onChange={selectedUser ? handleEditUserInputChange : handleUserInputChange}
                margin="normal"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label={<span>Last Name <span style={{color: 'red'}}>*</span></span>}
                name="lastName"
                value={selectedUser ? selectedUser.lastName : newUser.lastName}
                onChange={selectedUser ? handleEditUserInputChange : handleUserInputChange}
                required
                margin="normal"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label={<span>Email <span style={{color: 'red'}}>*</span></span>}
                name="email"
                type="email"
                value={selectedUser ? selectedUser.email : newUser.email}
                onChange={selectedUser ? handleEditUserInputChange : handleUserInputChange}
                required
                margin="normal"
              />
            </Grid>

            {!selectedUser && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label={<span>Password <span style={{color: 'red'}}>*</span></span>}
                  name="password"
                  type="password"
                  value={newUser.password}
                  onChange={handleUserInputChange}
                  required
                  margin="normal"
                />
              </Grid>
            )}

            {/* Additional Fields */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Phone Number"
                name="phoneNumber"
                value={selectedUser ? selectedUser.phoneNumber : newUser.phoneNumber}
                onChange={selectedUser ? handleEditUserInputChange : handleUserInputChange}
                margin="normal"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth margin="normal">
                <InputLabel>LVL</InputLabel>
                <Select
                  name="accountLevel"
                  value={selectedUser ? selectedUser.accountLevel : newUser.accountLevel}
                  onChange={selectedUser ? handleEditUserInputChange : handleUserInputChange}
                  label="Account Level"
                >
                  <MenuItem value="user">User</MenuItem>
                  <MenuItem value="admin">Admin</MenuItem>
                  <MenuItem value="superadmin">Super Admin</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    name="status"
                    checked={selectedUser ? selectedUser.status : newUser.status}
                    onChange={selectedUser ? handleEditUserInputChange : handleUserInputChange}
                    color="primary"
                  />
                }
                label="Active Status"
              />
              <Typography variant="caption" display="block" color="textSecondary">
                {selectedUser 
                  ? selectedUser.status ? 'User will be active' : 'User will be inactive'
                  : newUser.status ? 'User will be active' : 'User will be inactive'}
              </Typography>
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions>
        <Button 
          onClick={() => {
            setIsModalOpen(false);
            setSelectedUser(null);
          }} 
          sx={{ backgroundColor: 'white', color: 'red' }}
          startIcon={<Close />}
        >
          Cancel
        </Button>
          <Button
            onClick={selectedUser ? updateUser : createUser}
            color="primary"
            variant="contained"
            startIcon={selectedUser ? <Save /> : <PersonAdd />}
          >
            {selectedUser ? 'Update User' : 'Add User'}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default Users;