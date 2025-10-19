import React, { useState, useEffect } from "react";
import { NavLink, Routes, Route, useLocation, Navigate } from "react-router-dom";
import "./css/Admin.css";
import "boxicons/css/boxicons.min.css";
import "bootstrap/dist/css/bootstrap.min.css";
import DashboardHome from "./Components/Dashboard";
import ViewVisitors from "./Components/Staff/ViewVisitors";
import ViewInmates from "./Components/Staff/ViewInmates";
import ViewCrimes from "./Components/Staff/ViewCrimes";
import ViewReports from "./Components/Staff/ViewReports";
import Guest from "./Components/Staff/Guest"; // Assuming you have a Staff version of Guest
import ScanQR from "./Components/Staff/ScanQr"; // Assuming you have a Staff version
import { Badge, Dropdown, Button } from "react-bootstrap";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const Staff = () => {
  const [isSidebarClosed, setIsSidebarClosed] = useState(false);
  const [user, setUser] = useState(null);
  const [showScanModal, setShowScanModal] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user'));
    setUser(userData);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setIsSidebarClosed(window.innerWidth < 768);
    };

    window.addEventListener("resize", handleResize);
    handleResize();

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const getStaffTitle = () => {
    return "Prison Management System - Staff Access";
  };

  const getAccessBadge = () => {
    return (
      <Badge bg="info" className="ms-2 access-badge">
        Staff Access
      </Badge>
    );
  };

  return (
    <div className="dashboard">
      <div className={`sidebar ${isSidebarClosed ? "close" : ""}`}>
        <NavLink to="/staff/dashboard" className="logo">
          <i className="bx bx-shield-quarter"></i>
          <div className="logo-name">
            <span>Prison Management</span>
            {getAccessBadge()}
          </div>
        </NavLink>
        <ul className="side-menu">
          {[
            { name: "Dashboard", icon: "bx bxs-dashboard", path: "/staff/dashboard" },
            { name: "Visitors", icon: "bx bxs-user-voice", path: "/staff/visitors" },
            { name: "Guests", icon: "bx bxs-user-badge", path: "/staff/guest" },
            { name: "Inmates", icon: "bx bxs-user-account", path: "/staff/inmates" },
            { name: "Crime List", icon: "bx bxs-error", path: "/staff/crimes" },
            { name: "Reports", icon: "bx bxs-report", path: "/staff/reports-analytics" },
          ].map((link, index) => (
            <li key={index}>
              <NavLink
                to={link.path}
                className={({ isActive }) => (isActive ? "active" : "")}
              >
                <i className={link.icon}></i>
                <span>{link.name}</span>
              </NavLink>
            </li>
          ))}
        </ul>
        <ul className="side-menu">
          <li>
            <NavLink to="/" className="logout" onClick={() => localStorage.removeItem("user")}>
              <i className="bx bx-log-out-circle"></i>
              <span>Logout</span>
            </NavLink>
          </li>
        </ul>
      </div>

      <div className="content">
        <nav>
          <i 
            className="bx bx-menu toggle-sidebar" 
            onClick={() => setIsSidebarClosed(!isSidebarClosed)}
          ></i>
          
          <div className="nav-title">
            <h5 className="mb-0">{getStaffTitle()}</h5>
          </div>
          
          <Button 
            variant="success" 
            onClick={() => setShowScanModal(true)}
            className="me-3"
            size="sm"
          >
            <i className="bx bxs-qr-scan me-1"></i>
            Scan QR
          </Button>
          
          <Dropdown className="profile-dropdown">
            <Dropdown.Toggle variant="link" id="dropdown-profile">
              <div className="profile">
                <img src="/img/staff.png" alt="Profile" />
                <span className="profile-info">
                  <strong>{user?.name || 'Staff'}</strong>
                  <small>STAFF</small>
                </span>
              </div>
            </Dropdown.Toggle>

            <Dropdown.Menu align="end">
              <Dropdown.Header>
                Signed in as {user?.name}
              </Dropdown.Header>
              <Dropdown.Item as={NavLink} to="/staff/dashboard">
                <i className="bx bx-user me-2"></i>
                Profile
              </Dropdown.Item>
              <Dropdown.Divider />
              <Dropdown.Item as={NavLink} to="/" onClick={() => localStorage.removeItem("user")}>
                <i className="bx bx-log-out me-2"></i>
                Logout
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        </nav>

        <main>
          <Routes>
            <Route path="/" element={<Navigate to="/staff/dashboard" />} />
            <Route path="/dashboard" element={<DashboardHome />} />
            <Route path="/visitors" element={<ViewVisitors />} />
            <Route path="/guest" element={<Guest />} />
            <Route path="/inmates" element={<ViewInmates />} />
            <Route path="/crimes" element={<ViewCrimes />} />
            <Route path="/reports-analytics" element={<ViewReports />} />
          </Routes>
        </main>
      </div>

      <ScanQR 
        show={showScanModal} 
        onHide={() => setShowScanModal(false)} 
      />

      <ToastContainer 
        position="bottom-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </div>
  );
};

export default Staff;