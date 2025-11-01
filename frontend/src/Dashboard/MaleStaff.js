import React, { useState, useEffect } from "react";
import { NavLink, Routes, Route, useLocation, Navigate } from "react-router-dom";
import "./css/Sidebar.css";
import "boxicons/css/boxicons.min.css";
import "bootstrap/dist/css/bootstrap.min.css";
import DashboardHome from "./Components/Dashboard";

// Import Staff components
import ViewVisitorMaleDivision from "./Components/Staff/ViewVisitorMaleDivision";
import ViewRecordVisits from "./Components/Staff/ViewRecordVisits";
import ReportsAnalytics from "./Components/Staff/ReportsAnalytics";
import Guest from "./Components/Staff/Guest";
import ScanQR from "./Components/Staff/ScanQr";

import { Badge, Dropdown, Button } from "react-bootstrap";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const MaleStaff = () => {
  const [isSidebarClosed, setIsSidebarClosed] = useState(false);
  const [user, setUser] = useState(null);
  const [showScanModal, setShowScanModal] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
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

  // Real-time clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour12: true,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStaffTitle = () => {
    return "";
  };

  
  return (
      <div className="dashboard">
        <div className={`sidebar ${isSidebarClosed ? "close" : ""}`}>
          <NavLink to="/malestaff/dashboard" className="logo">
            <div className="logo-content">
              <div className="logo-img">
                <img src="/img/logo.jpg" alt="LANAO DEL NORTE DISTRICT JAIL REGION 10 Logo" />
              </div>
              <div className="logo-text">
                <div className="logo-main">LANAO DEL NORTE DISTRICT JAIL</div>
                <div className="logo-subtitle">REGION 10</div>
              </div>
            </div>
          </NavLink>
        <ul className="side-menu">
          {[
            { name: "Dashboard", icon: "bx bxs-dashboard", path: "/malestaff/dashboard" },
            { name: "Recorded Visits", icon: "bx bxs-calendar-check", path: "/malestaff/record-visits" },
            { name: "Visitors", icon: "bx bxs-user-voice", path: "/malestaff/visitors" },
            { name: "Guests", icon: "bx bxs-user-badge", path: "/malestaff/guest" },
            { name: "Reports", icon: "bx bxs-report", path: "/malestaff/reports-analytics" },
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
        {/* FIXED: Added fixed-nav class */}
        <nav className="fixed-nav">
          <i 
            className="bx bx-menu toggle-sidebar" 
            onClick={() => setIsSidebarClosed(!isSidebarClosed)}
          ></i>
          
          <div className="nav-title">
            <h5 className="mb-0">{getStaffTitle()}</h5>
            <div className="real-time-clock">
              {formatTime(currentTime)} | {formatDate(currentTime)}
            </div>
          </div>
          
          <Button 
            variant="success" 
            onClick={() => setShowScanModal(true)}
            className="me-3"
            size="sm"
          >
            <svg className="me-1" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 11h8V3H3v8zm2-6h4v4H5V5zM3 21h8v-8H3v8zm2-6h4v4H5v-4zm8-12v8h8V3h-8zm6 6h-4V5h4v4z"/>
              <path d="M19 19h2v2h-2zM15 15h2v2h-2zM15 19h2v2h-2zM11 11h2v2h-2zM7 15h2v2H7zM11 15h2v2h-2zM11 19h2v2h-2z"/>
            </svg>
            Scan QR
          </Button>
          
          <Dropdown className="profile-dropdown">
            <Dropdown.Toggle variant="link" id="dropdown-profile">
              <div className="profile">
                <img src="/img/staff.png" alt="Profile" />
                <span className="profile-info">
                  <strong>{user?.name || 'Male Staff'}</strong>
                  <small>MALE STAFF</small>
                </span>
              </div>
            </Dropdown.Toggle>

            <Dropdown.Menu align="end">
              <Dropdown.Header>
                Signed in as {user?.name}
              </Dropdown.Header>
              <Dropdown.Item as={NavLink} to="/malestaff/dashboard">
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

        {/* FIXED: Added main-content class */}
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Navigate to="/malestaff/dashboard" />} />
            <Route path="/dashboard" element={<DashboardHome />} />
            <Route path="/record-visits" element={<ViewRecordVisits />} />
            <Route path="/visitors" element={<ViewVisitorMaleDivision />} />
            <Route path="/guest" element={<Guest />} />
            <Route path="/reports-analytics" element={<ReportsAnalytics />} />
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

export default MaleStaff;