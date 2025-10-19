import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Form, Button, Spinner, Modal, Row, Col } from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import axios from "axios";
import { Badge } from 'react-bootstrap';
import "./Login.css";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showLoginForm, setShowLoginForm] = useState(false);
  
  const navigate = useNavigate();

  // Toggle login form visibility
  const toggleLoginForm = () => {
    setShowLoginForm(!showLoginForm);
    setErrorMessage("");
  };

  // Form validation
  const validateForm = () => {
    if (!email || !password) {
      setErrorMessage("Please fill in both fields.");
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setErrorMessage("Please enter a valid email.");
      return false;
    }
    return true;
  };

  // Handle form submission
  const handleLogin = async (e) => {
  e.preventDefault();
  setErrorMessage("");

  if (!validateForm()) return;

  setIsLoading(true);

  // Default admin credentials (for development/testing only)
  const defaultAdmin = {
    email: "admin@gmail.com",
    password: "Admin_0",
    role: "admin",
    name: "System Admin",
    _id: "default-admin-id" // Mock ID for local storage
  };

  // Check if it's the default admin
  if (email.toLowerCase() === defaultAdmin.email && password === defaultAdmin.password) {
    // Store in localStorage
    localStorage.setItem("user", JSON.stringify({
      email: defaultAdmin.email,
      role: defaultAdmin.role,
      name: defaultAdmin.name,
      _id: defaultAdmin._id
    }));

    toast.success(`Welcome, ${defaultAdmin.name}!`, {
      position: "top-center",
      autoClose: 2000,
      hideProgressBar: true,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      className: "custom-toast",
    });

    setTimeout(() => {
      navigate("/admin/dashboard");
    }, 2000);

    setIsLoading(false);
    return;
  }

  // If not default admin, try backend login
  try {
    const response = await axios.post("http://localhost:5000/login", {
      email: email.toLowerCase(),
      password,
    });

    if (!response.data.user) {
      throw new Error("Invalid response from server");
    }

    const { user } = response.data;
    
    localStorage.setItem("user", JSON.stringify({
      email: user.email,
      role: user.role,
      name: user.name,
      _id: user._id
    }));

    toast.success(`Welcome, ${user.name}!`, {
      position: "top-center",
      autoClose: 2000,
      hideProgressBar: true,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      className: "custom-toast",
    });

    setTimeout(() => {
      if (user.role === "admin") {
        navigate("/admin/dashboard");
      } else {
        navigate("/staff/dashboard");
      }
    }, 2000);
  } catch (error) {
    console.error("Login error:", error.response || error);
    toast.error(
      error.response?.data?.message || "Invalid credentials. Please try again."
    );
  }

  setIsLoading(false);
};

  return (
    <div
      className="login-page"
      style={{
        backgroundImage: `url('/img/acmac.jpg')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        position: "relative",
      }}
    >
      {/* Semi-transparent overlay */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          zIndex: 1,
        }}
      ></div>

      {/* Navigation links */}
      <div
        style={{
          position: "absolute",
          top: "20px",
          left: "20px",
          display: "flex",
          gap: "15px",
          zIndex: 2,
        }}
      >
        <div
          style={{ color: "white", cursor: "pointer" }}
          onClick={() => navigate("/about")}
        >
          About
        </div>
        <div
          style={{ color: "white", cursor: "pointer" }}
          onClick={() => navigate("/map")}
        >
          Map
        </div>
        <div
          style={{ color: "white", cursor: "pointer" }}
          onClick={() => navigate("/announcements")}
        >
          Announcements
        </div>
      </div>
      
      {/* Right side button */}
      <div
        style={{
          position: "absolute",
          top: "20px",
          right: "20px",
          zIndex: 2,
        }}
      >
        <div
          style={{
            color: "white",
            cursor: "pointer",
          }}
          onClick={toggleLoginForm}
        >
          Login
        </div>
      </div>

      {/* Logo and Welcome text (hidden when login form is visible) */}
      {!showLoginForm && (
        <div
          style={{
            position: "relative",
            zIndex: 2,
            textAlign: "center",
            backgroundColor: "rgba(255, 255, 255, 0.2)",
            padding: "20px",
            borderRadius: "15px",
            backdropFilter: "blur(5px)",
          }}
        >
          <img
            src="/img/logo.jpg"
            alt="Prison Management Logo"
            style={{
              width: "100px",
              height: "100px",
              borderRadius: "50%",
              marginBottom: "15px",
              border: "2px solid white",
            }}
          />
          <h1
            style={{
              color: "white",
              textShadow: "2px 2px 4px rgba(0, 0, 0, 0.5)",
              fontSize: "2.5rem",
              fontWeight: "bold",
            }}
          >
            Prison Management System
          </h1>
        </div>
      )}

      {/* Login form */}
      {showLoginForm && (
        <div className="login-container" style={{ zIndex: 2 }}>
          <div className="login-box">
            <h4 className="text-center login-title">Login</h4>
            <Form onSubmit={handleLogin} className="mt-3">
              <Form.Group className="mb-3" controlId="formEmail">
                <Form.Label>Email</Form.Label>
                <Form.Control
                  type="email"
                  placeholder="Enter email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  isInvalid={errorMessage && !email}
                  required
                />
                <Form.Control.Feedback type="invalid">
                  {errorMessage}
                </Form.Control.Feedback>
              </Form.Group>

              <Form.Group className="mb-3" controlId="formPassword">
                <Form.Label>Password</Form.Label>
                <Form.Control
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  isInvalid={errorMessage && !password}
                  required
                />
                <Form.Control.Feedback type="invalid">
                  {errorMessage}
                </Form.Control.Feedback>
              </Form.Group>

              <Button
                variant="primary"
                type="submit"
                className="w-100"
                disabled={isLoading}
              >
                {isLoading ? <Spinner animation="border" size="sm" /> : "Login"}
              </Button>
            </Form>
          </div>
        </div>
      )}

      <ToastContainer
        position="top-center"
        autoClose={2000}
        hideProgressBar
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        style={{ top: "20px", textAlign: "center" }}
      />
    </div>
  );
};

export default Login;