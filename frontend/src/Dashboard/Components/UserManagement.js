import React, { useState, useEffect } from "react";
import { Form, Button, Modal, Spinner, Table, Badge } from "react-bootstrap";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import axios from "axios";
import "../css/Dashboard.css";

const UserManagement = () => {
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "",
  });
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [roleError, setRoleError] = useState("");

  const predefinedAccounts = ["admin@gmail.com", "official@gmail.com"];

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

  const handleSubmit = async (e) => {
  e.preventDefault();
  
  if (!formData.role) {
    setRoleError("Please select a role");
    return;
  }

  setIsLoading(true);

  try {
    console.log("Submitting user:", formData); // Debug log

    const response = await axios.post("http://localhost:5000/users", {
      name: formData.name,
      email: formData.email.toLowerCase(),
      password: formData.password,
      role: formData.role === 'barangayOfficial' ? 'barangayOfficial' : formData.role
    });

    console.log("Response:", response); // Debug log

    if (response.status === 201) {
      toast.success("User created successfully!");
      setFormData({ name: "", email: "", password: "", role: "" });
      fetchUsers();
      setShowModal(false);
    }
  } catch (error) {
    console.error("Error details:", {
      message: error.message,
      response: error.response?.data,
      config: error.config
    });
    
    if (error.response?.data?.message?.includes("Invalid role")) {
      setRoleError("Server configuration error: Please contact support");
    } else {
      toast.error(error.response?.data?.message || "Failed to create user");
    }
  } finally {
    setIsLoading(false);
  }
};

  const handleDeleteUser = async (email) => {
    if (predefinedAccounts.includes(email.toLowerCase())) {
      toast.error("Cannot delete predefined accounts");
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

  return (
    <div className="user-management">
      <h2 style={{ fontFamily: "Poppins, sans-serif", fontWeight: "600", color: "#2c3e50" }}>
        👤 User Management
      </h2>
      <Button variant="primary" onClick={() => setShowModal(true)}>
        Add User
      </Button>

      <Table striped bordered hover className="mt-3">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => {
            const isPredefined = predefinedAccounts.includes(user.email.toLowerCase());
            const displayRole = user.role === 'barangayOfficial' ? 'Barangay Official' : 'Admin';
            
            return (
              <tr key={user.email}>
                <td>
                  {user.name}
                  {isPredefined && <Badge bg="primary" className="ms-2">System Account</Badge>}
                </td>
                <td>{user.email}</td>
                <td>{displayRole}</td>
                <td>
                  <Button
                    variant="danger"
                    onClick={() => handleDeleteUser(user.email)}
                    disabled={isLoading || isPredefined}
                  >
                    Delete
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </Table>

      <Modal show={showModal} onHide={() => {
        setShowModal(false);
        setRoleError("");
      }}>
        <Modal.Header closeButton>
          <Modal.Title>Add User</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Name</Form.Label>
              <Form.Control
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
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
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Role</Form.Label>
              <Form.Select
  name="role"
  value={formData.role}
  onChange={handleInputChange}
  required
  isInvalid={!!roleError}
>
  <option value="">Select a role</option>
  <option value="admin">Admin</option>
  <option value="barangayOfficial">Barangay Official</option> {/* Exact value */}
</Form.Select>
              <Form.Control.Feedback type="invalid">
                {roleError}
              </Form.Control.Feedback>
            </Form.Group>
            <Button variant="primary" type="submit" disabled={isLoading}>
              {isLoading ? <Spinner size="sm" /> : "Submit"}
            </Button>
          </Form>
        </Modal.Body>
      </Modal>

      <ToastContainer />
    </div>
  );
};

export default UserManagement;