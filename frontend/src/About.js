import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Modal, Form } from 'react-bootstrap';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const About = () => {
  const navigate = useNavigate();
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showLoginForm, setShowLoginForm] = useState(false);
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
    navigate("/admin/dashboard"); // Adjust as needed
  };

  return (
    <div
      style={{
        backgroundImage: `url('/img/acmac.jpg')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        minHeight: "100vh",
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
      <Button 
  variant="outline-light" 
  onClick={() => navigate("/map")} // Make sure this matches your route path
>
  Map
</Button>
        <Button variant="outline-light" onClick={() => setShowRequestModal(true)}>
          Request Document
        </Button>
        <Button variant="outline-light" onClick={() => setShowLoginForm(true)}>
          Login
        </Button>
      </div>

      {/* Content */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          color: "white",
          textAlign: "center",
          padding: "80px 20px 20px",
          maxWidth: "800px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.2)",
            padding: "30px",
            borderRadius: "15px",
            backdropFilter: "blur(5px)",
          }}
        >
          <h1 style={{ marginBottom: "30px" }}>About Barangay Acmac</h1>
          
          <div style={{ textAlign: "left", marginBottom: "30px" }}>
            <h3>Our Community</h3>
            <p>
              Barangay Acmac is a vibrant community located in Iligan City, known for its rich
              cultural heritage and strong sense of community. We are committed to providing
              excellent services to our residents and maintaining a peaceful environment for all.
            </p>
          </div>

          <div style={{ textAlign: "left", marginBottom: "30px" }}>
            <h3>Our Mission</h3>
            <p>
              To serve our residents with integrity, transparency, and efficiency while fostering
              community development and preserving our cultural identity.
            </p>
          </div>

          <div style={{ textAlign: "left" }}>
            <h3>Our Vision</h3>
            <p>
              A progressive, united, and resilient Barangay Acmac where every resident enjoys
              quality public service and a high standard of living.
            </p>
          </div>
        </div>
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

export default About;