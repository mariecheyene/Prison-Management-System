import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { GeoSearchControl, OpenStreetMapProvider } from 'leaflet-geosearch';
import { Button, Modal, Form } from 'react-bootstrap';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Fix for Leaflet's default marker icons
const markerIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const MapPage = () => {
  const navigate = useNavigate();
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showLoginForm, setShowLoginForm] = useState(false);
  const mapRef = useRef(null);
  const [requestData, setRequestData] = useState({
    documentType: "Barangay Clearance",
    fullName: "",
    address: "",
    contactNumber: "",
    purpose: ""
  });
  const [loginData, setLoginData] = useState({
    email: "",
    password: ""
  });

  useEffect(() => {
    // Initialize map only once
    if (!mapRef.current) {
      const mapInstance = L.map('map', {
        preferCanvas: true
      }).setView([8.2333, 124.2503], 14);
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(mapInstance);

      // Add default marker with proper icon
      L.marker([8.2333, 124.2503], { icon: markerIcon })
        .addTo(mapInstance)
        .bindPopup("Barangay Acmac, Iligan City")
        .openPopup();

      const provider = new OpenStreetMapProvider();
      const searchControl = new GeoSearchControl({
        provider,
        style: 'bar',
        showMarker: true,
        retainZoomLevel: false,
        animateZoom: true,
        searchLabel: 'Search for locations in Acmac, Iligan City...',
        keepResult: true,
        popupFormat: ({ result }) => result.label,
        marker: {
          icon: markerIcon
        }
      });

      mapInstance.addControl(searchControl);
      mapRef.current = mapInstance;

      return () => {
        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }
      };
    }
  }, []);

  const handleRequestChange = (e) => {
    setRequestData({ ...requestData, [e.target.name]: e.target.value });
  };

  const handleLoginChange = (e) => {
    setLoginData({ ...loginData, [e.target.name]: e.target.value });
  };

  const handleRequestSubmit = (e) => {
    e.preventDefault();
    toast.success("Document request submitted!");
    setShowRequestModal(false);
  };

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    toast.success("Login successful!");
    setShowLoginForm(false);
    navigate("/admin/dashboard");
  };

  return (
    <div
      className="login-page"
      style={{
        backgroundImage: `url('/img/acmac.jpg')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        position: "relative",
      }}
    >
      {/* Overlay */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          zIndex: 1,
        }}
      ></div>

      {/* Navigation */}
      <div
        style={{
          position: "absolute",
          top: "20px",
          left: "20px",
          zIndex: 2,
        }}
      >
        <Button variant="outline-light" onClick={() => navigate("/")}>
          Back to Home
        </Button>
      </div>

      {/* Right side buttons */}
      <div
        style={{
          position: "absolute",
          top: "20px",
          right: "20px",
          display: "flex",
          gap: "15px",
          zIndex: 2,
        }}
      >
        <Button variant="outline-light" onClick={() => navigate("/about")}>
          About
        </Button>
        <Button variant="outline-light" onClick={() => setShowRequestModal(true)}>
          Request Document
        </Button>
        <Button variant="outline-light" onClick={() => setShowLoginForm(true)}>
          Login
        </Button>
      </div>

      {/* Main Content */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          textAlign: "center",
          backgroundColor: "rgba(255, 255, 255, 0.2)",
          padding: "20px",
          borderRadius: "15px",
          backdropFilter: "blur(5px)",
          margin: "80px auto 20px",
          maxWidth: "90%",
        }}
      >
        <img
          src="/img/logo.jpg"
          alt="Barangay Acmac Logo"
          style={{
            width: "100px",
            height: "100px",
            borderRadius: "50%",
            marginBottom: "15px",
            border: "2px solid white",
          }}
        />
        <h1 style={{ color: "white", textShadow: "2px 2px 4px rgba(0, 0, 0, 0.5)" }}>
          Barangay Acmac Location
        </h1>
        
        <div 
          id="map" 
          style={{ 
            width: '100%', 
            height: '500px', 
            border: '1px solid #ccc',
            borderRadius: '8px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            margin: '20px auto',
            backgroundColor: 'white'
          }}
        ></div>
      </div>

      {/* Request Document Modal */}
      <Modal 
        show={showRequestModal} 
        onHide={() => setShowRequestModal(false)} 
        centered
        style={{ zIndex: 1050 }}
      >
        <Modal.Header closeButton>
          <Modal.Title>Request Document</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleRequestSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Document Type</Form.Label>
              <Form.Select
                name="documentType"
                value={requestData.documentType}
                onChange={handleRequestChange}
                required
              >
                <option value="Barangay Clearance">Barangay Clearance</option>
                <option value="Barangay Certificate">Barangay Certificate</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Full Name *</Form.Label>
              <Form.Control
                type="text"
                name="fullName"
                value={requestData.fullName}
                onChange={handleRequestChange}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Address *</Form.Label>
              <Form.Control
                type="text"
                name="address"
                value={requestData.address}
                onChange={handleRequestChange}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Contact Number *</Form.Label>
              <Form.Control
                type="text"
                name="contactNumber"
                value={requestData.contactNumber}
                onChange={handleRequestChange}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Purpose *</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="purpose"
                value={requestData.purpose}
                onChange={handleRequestChange}
                required
              />
            </Form.Group>

            <div className="d-flex justify-content-center">
              <Button variant="primary" type="submit">
                Submit Request
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      {/* Login Modal */}
      <Modal 
        show={showLoginForm} 
        onHide={() => setShowLoginForm(false)} 
        centered
        style={{ zIndex: 1050 }}
      >
        <Modal.Header closeButton>
          <Modal.Title>Login</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleLoginSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                name="email"
                placeholder="Enter email"
                value={loginData.email}
                onChange={handleLoginChange}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Password</Form.Label>
              <Form.Control
                type="password"
                name="password"
                placeholder="Password"
                value={loginData.password}
                onChange={handleLoginChange}
                required
              />
            </Form.Group>

            <Button variant="primary" type="submit" className="w-100">
              Login
            </Button>
          </Form>
        </Modal.Body>
      </Modal>

      <ToastContainer position="top-center" />
    </div>
  );
};

export default MapPage;