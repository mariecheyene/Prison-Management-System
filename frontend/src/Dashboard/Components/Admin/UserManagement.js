import React, { useState, useEffect } from "react";
import { Form, Button, Modal, Spinner, Table, Badge, Card, Row, Col } from "react-bootstrap";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import axios from "axios";
import { Edit2, Trash2 } from 'react-feather'; // Import the same icons
import "../../css/Dashboard.css";

const UserManagement = () => {
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "",
  });
  const [editFormData, setEditFormData] = useState({
    name: "",
    email: "",
    role: "",
  });
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [roleError, setRoleError] = useState("");

  // Predefined system accounts that cannot be edited or deleted
  const predefinedAccounts = ["fulladmin@prison.com", "system@prison.com"];

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get("http://localhost:5000/users");
      setUsers(response.data);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to fetch users");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (name === "role") setRoleError("");
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditFormData({ ...editFormData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.role) {
      setRoleError("Please select a role");
      return;
    }

    setIsLoading(true);

    try {
      const response = await axios.post("http://localhost:5000/users", {
        name: formData.name,
        email: formData.email.toLowerCase(),
        password: formData.password,
        role: formData.role
      });

      toast.success("User created successfully!");
      setFormData({ name: "", email: "", password: "", role: "" });
      fetchUsers();
      setShowModal(false);
    } catch (error) {
      console.error("Error:", error);
      const errorMessage = error.response?.data?.message || error.message || "Failed to create user";
      toast.error(`Error: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditUser = (user) => {
    console.log("Editing user:", user);
    setEditFormData({
      name: user.name,
      email: user.email,
      role: user.role
    });
    setShowEditModal(true);
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    
    if (!editFormData.role) {
      setRoleError("Please select a role");
      return;
    }

    setIsLoading(true);

    try {
      const response = await axios.put(`http://localhost:5000/users/${editFormData.email}`, {
        name: editFormData.name,
        role: editFormData.role
      });

      console.log("Update response:", response.data);
      toast.success("User updated successfully!");
      fetchUsers();
      setShowEditModal(false);
    } catch (error) {
      console.error("Update error:", error);
      const errorMessage = error.response?.data?.message || error.message || "Failed to update user";
      toast.error(`Error: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteUser = async (email) => {
    if (predefinedAccounts.includes(email.toLowerCase())) {
      toast.error("Cannot delete predefined system accounts");
      return;
    }

    if (!window.confirm("Are you sure you want to delete this user?")) {
      return;
    }

    setIsLoading(true);
    try {
      await axios.delete(`http://localhost:5000/users/${email}`);
      toast.success("User deleted successfully!");
      fetchUsers();
    } catch (error) {
      toast.error("Failed to delete user");
    } finally {
      setIsLoading(false);
    }
  };

  // Function to format role for display
  const formatRole = (role) => {
    const roleMap = {
      'FullAdmin': 'Full Admin',
      'MaleAdmin': 'Male Admin',
      'FemaleAdmin': 'Female Admin',
      'FullStaff': 'Full Staff',
      'MaleStaff': 'Male Staff',
      'FemaleStaff': 'Female Staff'
    };
    return roleMap[role] || role;
  };

  // Function to get badge color based on role
  const getRoleBadgeVariant = (role) => {
    const variantMap = {
      'FullAdmin': 'danger',
      'MaleAdmin': 'primary',
      'FemaleAdmin': 'info',
      'FullStaff': 'warning',
      'MaleStaff': 'success',
      'FemaleStaff': 'secondary'
    };
    return variantMap[role] || 'secondary';
  };

  return (
    <div className="user-management">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 style={{ fontFamily: "Poppins, sans-serif", fontWeight: "600", color: "#2c3e50" }}>
          👤User Management
        </h2>
        <Button variant="primary" onClick={() => setShowModal(true)}>
          + Add User
        </Button>
      </div>

      {/* Role Information Cards */}
      <Row className="mb-4">
        <Col md={12}>
          <Card>
            <Card.Header>
              <h6 className="mb-0">Role Permissions Overview</h6>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={4}>
                  <strong>Admin Roles:</strong>
                  <ul className="mb-0 mt-2">
                    <li><Badge bg="danger">Full Admin</Badge> - Full system access</li>
                    <li><Badge bg="primary">Male Admin</Badge> - Male section management</li>
                    <li><Badge bg="info">Female Admin</Badge> - Female section management</li>
                  </ul>
                </Col>
                <Col md={4}>
                  <strong>Staff Roles:</strong>
                  <ul className="mb-0 mt-2">
                    <li><Badge bg="warning">Full Staff</Badge> - Full staff access</li>
                    <li><Badge bg="success">Male Staff</Badge> - Male section access</li>
                    <li><Badge bg="secondary">Female Staff</Badge> - Female section access</li>
                  </ul>
                </Col>
                <Col md={4}>
                  <strong>Notes:</strong>
                  <ul className="mb-0 mt-2">
                    <li>System accounts cannot be deleted</li>
                    <li>Admins have higher privileges than staff</li>
                  </ul>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Users Table */}
      <Card>
        <Card.Header>
          <h5 className="mb-0">System Users</h5>
        </Card.Header>
        <Card.Body className="p-0">
          {isLoading ? (
            <div className="text-center p-4">
              <Spinner animation="border" role="status">
                <span className="visually-hidden">Loading...</span>
              </Spinner>
            </div>
          ) : (
            <Table striped bordered hover responsive className="mb-0">
              <thead className="bg-dark text-white">
                <tr>
                  <th className="text-center align-middle">Name</th>
                  <th className="text-center align-middle">Email</th>
                  <th className="text-center align-middle">Role</th>
                  <th className="text-center align-middle">Status</th>
                  <th className="text-center align-middle">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const isPredefined = predefinedAccounts.includes(user.email.toLowerCase());
                  
                  return (
                    <tr key={user.email}>
                      <td className="align-middle">
                        <div className="d-flex align-items-center justify-content-start">
                          <span>{user.name}</span>
                          {isPredefined && (
                            <Badge bg="primary" className="ms-2">System Account</Badge>
                          )}
                        </div>
                      </td>
                      <td className="align-middle text-center">{user.email}</td>
                      <td className="align-middle text-center">
                        <Badge bg={getRoleBadgeVariant(user.role)}>
                          {formatRole(user.role)}
                        </Badge>
                      </td>
                      <td className="align-middle text-center">
                        <Badge bg="success">Active</Badge>
                      </td>
                      <td className="align-middle text-center">
                        <div className="d-flex gap-1 justify-content-center">
                          <Button 
                            variant="outline-primary" 
                            size="sm" 
                            onClick={() => handleEditUser(user)}
                            disabled={isLoading}
                            className="p-1"
                            title="Edit User"
                          >
                            <Edit2 size={14} />
                          </Button>
                          <Button 
                            variant="outline-danger" 
                            size="sm" 
                            onClick={() => handleDeleteUser(user.email)}
                            disabled={isLoading || isPredefined}
                            className="p-1"
                            title="Delete User"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {users.length === 0 && (
                  <tr>
                    <td colSpan="5" className="text-center text-muted py-4">
                      No users found. Click "Add User" to create the first user.
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      {/* Add User Modal */}
      <Modal show={showModal} onHide={() => {
        setShowModal(false);
        setRoleError("");
        setFormData({ name: "", email: "", password: "", role: "" });
      }}>
        <Modal.Header closeButton>
          <Modal.Title>Add New User</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Full Name</Form.Label>
              <Form.Control
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Enter full name"
                required
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Email Address</Form.Label>
              <Form.Control
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Enter email address"
                required
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Password</Form.Label>
              <Form.Control
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Enter password"
                required
                minLength="6"
              />
              <Form.Text className="text-muted">
                Password must be at least 6 characters long.
              </Form.Text>
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>User Role</Form.Label>
              <Form.Select
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                required
                isInvalid={!!roleError}
              >
                <option value="">Select a role</option>
                <optgroup label="Administrator Roles">
                  <option value="FullAdmin">Full Admin</option>
                  <option value="MaleAdmin">Male Admin</option>
                  <option value="FemaleAdmin">Female Admin</option>
                </optgroup>
                <optgroup label="Staff Roles">
                  <option value="FullStaff">Full Staff</option>
                  <option value="MaleStaff">Male Staff</option>
                  <option value="FemaleStaff">Female Staff</option>
                </optgroup>
              </Form.Select>
              <Form.Control.Feedback type="invalid">
                {roleError}
              </Form.Control.Feedback>
              <Form.Text className="text-muted">
                Select appropriate role based on required access level.
              </Form.Text>
            </Form.Group>
            
            <div className="d-flex gap-2">
              <Button variant="primary" type="submit" disabled={isLoading} className="flex-fill">
                {isLoading ? <Spinner size="sm" /> : "Create User"}
              </Button>
              <Button 
                variant="outline-secondary" 
                onClick={() => {
                  setShowModal(false);
                  setRoleError("");
                }}
                disabled={isLoading}
              >
                Cancel
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      {/* Edit User Modal */}
      <Modal show={showEditModal} onHide={() => {
        setShowEditModal(false);
        setRoleError("");
      }}>
        <Modal.Header closeButton>
          <Modal.Title>Edit User</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleUpdateUser}>
            <Form.Group className="mb-3">
              <Form.Label>Full Name</Form.Label>
              <Form.Control
                type="text"
                name="name"
                value={editFormData.name}
                onChange={handleEditInputChange}
                placeholder="Enter full name"
                required
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Email Address</Form.Label>
              <Form.Control
                type="email"
                name="email"
                value={editFormData.email}
                disabled
                className="bg-light"
              />
              <Form.Text className="text-muted">
                Email cannot be changed.
              </Form.Text>
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>User Role</Form.Label>
              <Form.Select
                name="role"
                value={editFormData.role}
                onChange={handleEditInputChange}
                required
                isInvalid={!!roleError}
              >
                <option value="">Select a role</option>
                <optgroup label="Administrator Roles">
                  <option value="FullAdmin">Full Admin</option>
                  <option value="MaleAdmin">Male Admin</option>
                  <option value="FemaleAdmin">Female Admin</option>
                </optgroup>
                <optgroup label="Staff Roles">
                  <option value="FullStaff">Full Staff</option>
                  <option value="MaleStaff">Male Staff</option>
                  <option value="FemaleStaff">Female Staff</option>
                </optgroup>
              </Form.Select>
              <Form.Control.Feedback type="invalid">
                {roleError}
              </Form.Control.Feedback>
            </Form.Group>
            
            <div className="d-flex gap-2">
              <Button variant="warning" type="submit" disabled={isLoading} className="flex-fill">
                {isLoading ? <Spinner size="sm" /> : "Update User"}
              </Button>
              <Button 
                variant="outline-secondary" 
                onClick={() => setShowEditModal(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
};

export default UserManagement;