import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Form, Button, Spinner } from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import axios from "axios";
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

    // Default admin credentials
    const defaultAdmin = {
      email: "admin@gmail.com",
      password: "Admin_0",
      role: "FullAdmin",
      name: "System Admin",
      _id: "default-admin-id"
    };

    // Default staff credentials
    const defaultStaff = {
      email: "staff@gmail.com",
      password: "Staff_0",
      role: "FullStaff",
      name: "System Staff",
      _id: "default-staff-id"
    };

    // Check if it's the default admin
    if (email.toLowerCase() === defaultAdmin.email && password === defaultAdmin.password) {
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

    // Check if it's the default staff
    if (email.toLowerCase() === defaultStaff.email && password === defaultStaff.password) {
      localStorage.setItem("user", JSON.stringify({
        email: defaultStaff.email,
        role: defaultStaff.role,
        name: defaultStaff.name,
        _id: defaultStaff._id
      }));

      toast.success(`Welcome, ${defaultStaff.name}!`, {
        position: "top-center",
        autoClose: 2000,
        hideProgressBar: true,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        className: "custom-toast",
      });

      setTimeout(() => {
        navigate("/staff/dashboard");
      }, 2000);

      setIsLoading(false);
      return;
    }

    // If not default accounts, try backend login
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
        // Route based on user role - exact role names from UserManagement
        const roleRoutes = {
          'FullAdmin': '/admin/dashboard',
          'MaleAdmin': '/maleadmin/dashboard',
          'FemaleAdmin': '/femaleadmin/dashboard',
          'FullStaff': '/staff/dashboard',
          'MaleStaff': '/malestaff/dashboard',
          'FemaleStaff': '/femalestaff/dashboard'
        };

        const route = roleRoutes[user.role];
        if (route) {
          navigate(route);
        } else {
          // Fallback for unknown roles
          console.warn('Unknown role, defaulting to staff dashboard');
          navigate('/staff/dashboard');
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
        backgroundImage: `url('/img/background.png')`,
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
            fontSize: "1.1rem",
            fontWeight: "bold",
            padding: "10px 20px",
            backgroundColor: "rgba(255, 255, 255, 0.2)",
            borderRadius: "25px",
            backdropFilter: "blur(5px)",
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
            padding: "30px",
            borderRadius: "15px",
            backdropFilter: "blur(5px)",
            maxWidth: "600px",
          }}
        >
          <img
            src="/img/logo.jpg"
            alt="Visitor Management Logo"
            style={{
              width: "120px",
              height: "120px",
              borderRadius: "50%",
              marginBottom: "20px",
              border: "3px solid white",
            }}
          />
          <h1
            style={{
              color: "white",
              textShadow: "2px 2px 4px rgba(0, 0, 0, 0.5)",
              fontSize: "2.8rem",
              fontWeight: "bold",
              marginBottom: "10px",
            }}
          >
            Visitor Management System
          </h1>
          <p
            style={{
              color: "white",
              fontSize: "1.2rem",
              textShadow: "1px 1px 2px rgba(0, 0, 0, 0.5)",
            }}
          >
          </p>
        </div>
      )}

      {/* Login form */}
      {showLoginForm && (
        <div className="login-container" style={{ zIndex: 2 }}>
          <div className="login-box">
            <h4 className="text-center login-title">System Login</h4>
            <p className="text-center text-muted mb-4">
              Enter your credentials to access the system
            </p>
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
                style={{
                  height: "45px",
                  fontSize: "1.1rem",
                  fontWeight: "bold"
                }}
              >
                {isLoading ? <Spinner animation="border" size="sm" /> : "Login"}
              </Button>

              {/* Default Credentials Info */}
              <div className="mt-4 p-3 bg-light rounded">
                <small className="text-muted">
                  <strong>Default Credentials:</strong><br/>
                  Admin: admin@gmail.com / Admin_0<br/>
                  Staff: staff@gmail.com / Staff_0
                </small>
              </div>

              {/* Role Information */}
              <div className="mt-3 p-3 bg-info bg-opacity-10 rounded">
                <small className="text-muted">
                </small>
              </div>
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