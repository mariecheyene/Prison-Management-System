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

const Admin = () => {
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
    if (!user) return "Prison Management System";
    
    const role = user.role.toLowerCase();
    if (role === 'fulladmin') return "Prison Management System - Full Access";
    if (role === 'maleadmin') return "Prison Management System - Male Division";
    if (role === 'femaleadmin') return "Prison Management System - Female Division";
    return "Prison Management System";
  };

  const getAccessBadge = () => {
    if (!user) return null;
    
    const role = user.role.toLowerCase();
    let badgeText = "";
    let badgeVariant = "";
    
    if (role === 'fulladmin') {
      badgeText = "Full Access";
      badgeVariant = "success";
    } else if (role === 'maleadmin') {
      badgeText = "Male Access Only";
      badgeVariant = "primary";
    } else if (role === 'femaleadmin') {
      badgeText = "Female Access Only";
      badgeVariant = "danger";
    }
    
    return (
      <Badge bg={badgeVariant} className="ms-2 access-badge">
        {badgeText}
      </Badge>
    );
  };

  return (
    <div className="dashboard">
      <div className={`sidebar ${isSidebarClosed ? "close" : ""}`}>
        <NavLink to="/admin/dashboard" className="logo">
          <i className="bx bx-shield-quarter"></i>
          <div className="logo-name">
            <span>Prison Management</span>
            {getAccessBadge()}
          </div>
        </NavLink>
        <ul className="side-menu">
          {[
            { name: "Dashboard", icon: "bx bxs-dashboard", path: "/admin/dashboard" },
            { name: "Recorded Visits", icon: "bx bxs-calendar-check", path: "/admin/record-visits" },
            { name: "Visitors", icon: "bx bxs-user-voice", path: "/admin/visitors" },
            { name: "Guests", icon: "bx bxs-user-badge", path: "/admin/guest" },
            { name: "Inmates", icon: "bx bxs-user-account", path: "/admin/inmates" },
            { name: "Crime List", icon: "bx bxs-error", path: "/admin/crimes" },
            { name: "Reports", icon: "bx bxs-report", path: "/admin/reports-analytics" },
            { name: "Pending Visitors", icon: "bx bxs-time-five", path: "/admin/pending-requests" },
            { name: "User Management", icon: "bx bxs-user-detail", path: "/admin/user-management" },
            { name: "Maintenance", icon: "bx bxs-wrench", path: "/admin/maintenance" },
            { name: "System Logs", icon: "bx bxs-notepad", path: "/admin/logs" },
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
          
          {/* Scan QR Button in Navigation */}
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
                  <strong>{user?.name || 'Admin'}</strong>
                  <small>{user?.role || 'ADMIN'}</small>
                </span>
              </div>
            </Dropdown.Toggle>

            <Dropdown.Menu align="end">
              <Dropdown.Header>
                Signed in as {user?.name}
              </Dropdown.Header>
              <Dropdown.Item as={NavLink} to="/admin/dashboard">
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
            <Route path="/" element={<Navigate to="/admin/dashboard" />} />
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

      {/* QR Scanner Modal */}
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

export default Admin;