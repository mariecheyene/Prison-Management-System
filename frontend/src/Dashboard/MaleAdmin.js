import React, { useState, useEffect } from "react";
import { NavLink, Routes, Route, useLocation, Navigate } from "react-router-dom";
import "./css/Admin.css";
import "boxicons/css/boxicons.min.css";
import "bootstrap/dist/css/bootstrap.min.css";
import DashboardHome from "./Components/Dashboard";
import RecordVisits from "./Components/Admin/RecordVisits";
import Visitors from "./Components/Admin/Visitors";
import Inmates from "./Components/Admin/Inmates";
import Crimes from "./Components/Admin/Crimes";
import ReportsAnalytics from "./Components/Admin/ReportsAnalytics";
import UserManagement from "./Components/Admin/UserManagement";
import Maintenance from "./Components/Admin/Maintenance";
import Logs from "./Components/Admin/Logs";
import Guest from "./Components/Admin/Guest";
import ScanQR from "./Components/Admin/ScanQr";
import PendingRequests from "./Components/Admin/PendingRequests";
import { Badge, Dropdown, Button } from "react-bootstrap";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const MaleAdmin = () => {
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

  const getAdminTitle = () => {
    return "Prison Management System - Male Division";
  };

  const getAccessBadge = () => {
    return (
      <Badge bg="primary" className="ms-2 access-badge">
        Male Access Only
      </Badge>
    );
  };

  return (
    <div className="dashboard">
      <div className={`sidebar ${isSidebarClosed ? "close" : ""}`}>
        <NavLink to="/maleadmin/dashboard" className="logo">
          <i className="bx bx-shield-quarter"></i>
          <div className="logo-name">
            <span>Prison Management</span>
            {getAccessBadge()}
          </div>
        </NavLink>
        <ul className="side-menu">
          {[
            { name: "Dashboard", icon: "bx bxs-dashboard", path: "/maleadmin/dashboard" },
            { name: "Recorded Visits", icon: "bx bxs-calendar-check", path: "/maleadmin/record-visits" },
            { name: "Visitors", icon: "bx bxs-user-voice", path: "/maleadmin/visitors" },
            { name: "Guests", icon: "bx bxs-user-badge", path: "/maleadmin/guest" },
            { name: "Inmates", icon: "bx bxs-user-account", path: "/maleadmin/inmates" },
            { name: "Crime List", icon: "bx bxs-error", path: "/maleadmin/crimes" },
            { name: "Reports", icon: "bx bxs-report", path: "/maleadmin/reports-analytics" },
            { name: "Pending Visitors", icon: "bx bxs-time-five", path: "/maleadmin/pending-requests" },
            { name: "User Management", icon: "bx bxs-user-detail", path: "/maleadmin/user-management" },
            { name: "Maintenance", icon: "bx bxs-wrench", path: "/maleadmin/maintenance" },
            { name: "System Logs", icon: "bx bxs-notepad", path: "/maleadmin/logs" },
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
            <h5 className="mb-0">{getAdminTitle()}</h5>
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
                <img src="/img/admin.png" alt="Profile" />
                <span className="profile-info">
                  <strong>{user?.name || 'Male Admin'}</strong>
                  <small>MALE ADMIN</small>
                </span>
              </div>
            </Dropdown.Toggle>

            <Dropdown.Menu align="end">
              <Dropdown.Header>
                Signed in as {user?.name}
              </Dropdown.Header>
              <Dropdown.Item as={NavLink} to="/maleadmin/dashboard">
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
            <Route path="/" element={<Navigate to="/maleadmin/dashboard" />} />
            <Route path="/dashboard" element={<DashboardHome />} />
            <Route path="/record-visits" element={<RecordVisits />} />
            <Route path="/visitors" element={<Visitors />} />
            <Route path="/guest" element={<Guest />} />
            <Route path="/inmates" element={<Inmates />} />
            <Route path="/crimes" element={<Crimes />} />
            <Route path="/reports-analytics" element={<ReportsAnalytics />} />
            <Route path="/pending-requests" element={<PendingRequests />} />
            <Route path="/user-management" element={<UserManagement />} />
            <Route path="/maintenance" element={<Maintenance />} />
            <Route path="/logs" element={<Logs />} />
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

export default MaleAdmin;