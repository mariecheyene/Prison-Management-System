import React, { useState, useEffect } from "react";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Table, Form, Button, Modal, InputGroup, ButtonGroup, Row, Col, Card } from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
import { useNavigate } from "react-router-dom";
import { FaSearch, FaPrint, FaFileExport, FaQrcode, FaPlus, FaEye, FaEdit, FaTrash } from "react-icons/fa";
import Papa from "papaparse";
import QrScanner from "qr-scanner";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { format } from "date-fns";

const API_URL = "http://localhost:5000/visitors";

const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toISOString().split('T')[0];
};

const QRCodeScannerModal = ({ show, onScan, onClose }) => {
  const videoRef = React.useRef(null);
  const qrScannerRef = React.useRef(null);

  useEffect(() => {
    if (show && videoRef.current) {
      qrScannerRef.current = new QrScanner(
        videoRef.current,
        (result) => {
          onScan(result.data);
        },
        {
          highlightScanRegion: true,
          highlightCodeOutline: true,
        }
      );
      qrScannerRef.current.start();
    }

    return () => {
      if (qrScannerRef.current) {
        qrScannerRef.current.stop();
        qrScannerRef.current.destroy();
      }
    };
  }, [show, onScan]);

  return (
    <Modal show={show} onHide={onClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>Scan Visitor QR Code</Modal.Title>
      </Modal.Header>
      <Modal.Body className="text-center">
        <video 
          ref={videoRef} 
          style={{
            width: '100%',
            maxWidth: '400px',
            border: '2px solid #007bff',
            borderRadius: '8px'
          }}
        />
        <p className="mt-2">Point your camera at a visitor's QR code</p>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

const VisitorList = () => {
  const navigate = useNavigate();
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState("fullDetails");
  const [sortOrder, setSortOrder] = useState("asc");
  const [searchQuery, setSearchQuery] = useState("");
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [qrCode, setQrCode] = useState("");
  const [selectedVisitor, setSelectedVisitor] = useState({
    id: "",
    name: "",
    dateOfBirth: null,
    age: "",
    sex: "",
    address: "",
    contact: "",
    prisonerId: "",
    relationship: "",
    dateVisited: new Date(),
    status: "pending",
    violationType: "",
    violationDetails: "",
    qrCode: ""
  });

  // Add Visitor Form State
  const [addFormData, setAddFormData] = useState({
    name: "",
    dateOfBirth: null,
    age: "",
    sex: "",
    address: "",
    contact: "",
    prisonerId: "",
    relationship: "",
    dateVisited: new Date(),
    status: "pending",
    violationType: "",
    violationDetails: "",
  });

  useEffect(() => {
    fetchVisitors();
  }, []);

  const fetchVisitors = async () => {
    setLoading(true);
    try {
      const response = await axios.get(API_URL);
      setVisitors(response.data);
    } catch (error) {
      toast.error("Error fetching visitors");
    }
    setLoading(false);
  };

  const handleSortChange = (e) => {
    setSortBy(e.target.value);
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleViewVisitor = (visitor) => {
    setSelectedVisitor({
      ...visitor,
      dateOfBirth: visitor.dateOfBirth ? new Date(visitor.dateOfBirth) : null,
      dateVisited: visitor.dateVisited ? new Date(visitor.dateVisited) : new Date()
    });
    setShowViewModal(true);
  };

  const handleEditVisitor = (visitor) => {
    setSelectedVisitor({
      ...visitor,
      dateOfBirth: visitor.dateOfBirth ? new Date(visitor.dateOfBirth) : null,
      dateVisited: visitor.dateVisited ? new Date(visitor.dateVisited) : new Date()
    });
    setShowEditModal(true);
  };

  const handleDeleteVisitor = async (id) => {
    if (!window.confirm("Are you sure you want to delete this visitor?")) {
      return;
    }
    try {
      await axios.delete(`${API_URL}/${id}`);
      toast.success("Visitor deleted successfully");
      fetchVisitors();
    } catch (error) {
      toast.error("Error deleting visitor");
    }
  };

  const handleGenerateQrCode = async (visitorId) => {
    try {
      const visitor = visitors.find(v => v.id === visitorId);
      if (visitor) {
        setSelectedVisitor(visitor);
        const response = await axios.get(`${API_URL}/${visitorId}/qrcode`);
        setQrCode(response.data.qrCode);
        setShowQrModal(true);
      } else {
        toast.error("Visitor not found");
      }
    } catch (error) {
      console.error("Error generating QR code:", error);
      toast.error(error.response?.data?.message || "Failed to generate QR code");
    }
  };

  const downloadQrCode = () => {
    if (!qrCode) return;
    
    const link = document.createElement('a');
    link.href = qrCode;
    link.download = `visitor-${selectedVisitor.id}-qrcode.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleScanComplete = (scannedData) => {
    try {
      let visitorId;
      
      if (scannedData.startsWith('{')) {
        const data = JSON.parse(scannedData);
        visitorId = data.id;
      } else if (scannedData.startsWith('VIS')) {
        visitorId = scannedData;
      } else {
        visitorId = scannedData;
      }

      const visitor = visitors.find(v => v.id === visitorId);
      
      if (visitor) {
        setSelectedVisitor(visitor);
        setShowViewModal(true);
      } else {
        toast.error(`Visitor not found. Scanned data: ${scannedData}`);
      }
    } catch (error) {
      console.error('Error processing QR code:', error);
      toast.error(`Error processing QR code: ${scannedData}`);
    }
    setShowScannerModal(false);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();

    try {
      const formattedDateOfBirth = selectedVisitor.dateOfBirth ? format(selectedVisitor.dateOfBirth, "yyyy-MM-dd") : null;
      const formattedDateVisited = selectedVisitor.dateVisited ? format(selectedVisitor.dateVisited, "yyyy-MM-dd") : new Date();

      const updatedVisitor = { 
        ...selectedVisitor, 
        dateOfBirth: formattedDateOfBirth,
        dateVisited: formattedDateVisited
      };

      const response = await axios.put(`${API_URL}/${selectedVisitor.id}`, updatedVisitor);
      toast.success("Visitor updated successfully");
      setShowEditModal(false);
      fetchVisitors();
    } catch (error) {
      console.error("Error updating visitor:", error);
      toast.error("Failed to update visitor");
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setSelectedVisitor((prevVisitor) => ({
      ...prevVisitor,
      [name]: value,
    }));
  };

  const handleAddInputChange = (e) => {
    const { name, value } = e.target;
    setAddFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleDateOfBirthChange = (date) => {
    setAddFormData((prevData) => {
      const age = calculateAge(date);
      return { ...prevData, dateOfBirth: date, age };
    });
  };

  const handleEditDateOfBirthChange = (date) => {
    setSelectedVisitor((prevData) => {
      const age = calculateAge(date);
      return { ...prevData, dateOfBirth: date, age };
    });
  };

  const calculateAge = (birthdate) => {
    if (!birthdate) return "";
    const today = new Date();
    const birthDate = new Date(birthdate);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDifference = today.getMonth() - birthDate.getMonth();
    if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age.toString();
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();

    if (!addFormData.name.trim()) {
      toast.error("Name is required!");
      return;
    }

    try {
      const formattedDateOfBirth = addFormData.dateOfBirth ? format(addFormData.dateOfBirth, "yyyy-MM-dd") : null;
      const formattedDateVisited = addFormData.dateVisited ? format(addFormData.dateVisited, "yyyy-MM-dd") : new Date();

      const visitorData = {
        ...addFormData,
        dateOfBirth: formattedDateOfBirth,
        dateVisited: formattedDateVisited,
        createdBy: JSON.parse(localStorage.getItem("user"))._id
      };

      const response = await axios.post(API_URL, visitorData);
      
      if (response.data.visitor) {
        toast.success("Visitor added successfully");
        
        // Generate and show QR code
        const qrResponse = await axios.get(`${API_URL}/${response.data.visitor.id}/qrcode`);
        setQrCode(qrResponse.data.qrCode);
        setSelectedVisitor(response.data.visitor);
        setShowQrModal(true);
      }

      // Clear the form
      setAddFormData({
        name: "",
        dateOfBirth: null,
        age: "",
        sex: "",
        address: "",
        contact: "",
        prisonerId: "",
        relationship: "",
        dateVisited: new Date(),
        status: "pending",
        violationType: "",
        violationDetails: "",
      });
      
      setShowAddModal(false);
      fetchVisitors();
    } catch (error) {
      console.error("Error adding visitor:", error);
      if (error.response) {
        toast.error(error.response.data?.message || "Failed to save visitor");
      } else {
        toast.error(error.message || "Failed to save visitor");
      }
    }
  };

  const handleExportCSV = () => {
    const fileName = prompt("Enter a name for the CSV file:", "visitors");
    if (!fileName) return;

    const dataToExport = visitors
      .sort((a, b) => (sortOrder === "asc" ? a.id.localeCompare(b.id) : b.id.localeCompare(a.id)))
      .map((visitor) => ({
        ID: visitor.id,
        Name: visitor.name,
        "Date of Birth": formatDate(visitor.dateOfBirth) || "N/A",
        Age: visitor.age,
        Sex: visitor.sex,
        Address: visitor.address,
        Contact: visitor.contact,
        "Prisoner ID": visitor.prisonerId,
        Relationship: visitor.relationship,
        "Date Visited": formatDate(visitor.dateVisited),
        Status: visitor.status,
        "Violation Type": visitor.violationType,
        "Violation Details": visitor.violationDetails,
      }));

    const csv = Papa.unparse(dataToExport);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `${fileName}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <html>
        <head>
          <title>Visitor Details</title>
          <style>
            body { font-family: Arial, sans-serif; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #000; padding: 8px; text-align: left; font-size: 12px; }
            th { background-color: #f2f2f2; }
            .qr-code { margin-top: 20px; text-align: center; }
            .qr-code img { max-width: 200px; }
          </style>
        </head>
        <body>
          <h2>Visitor Details</h2>
          <p><strong>ID:</strong> ${selectedVisitor.id}</p>
          <p><strong>Name:</strong> ${selectedVisitor.name}</p>
          <p><strong>Date of Birth:</strong> ${formatDate(selectedVisitor.dateOfBirth) || "N/A"}</p>
          <p><strong>Age:</strong> ${selectedVisitor.age}</p>
          <p><strong>Sex:</strong> ${selectedVisitor.sex}</p>
          <p><strong>Address:</strong> ${selectedVisitor.address}</p>
          <p><strong>Contact:</strong> ${selectedVisitor.contact}</p>
          <p><strong>Prisoner ID:</strong> ${selectedVisitor.prisonerId}</p>
          <p><strong>Relationship:</strong> ${selectedVisitor.relationship}</p>
          <p><strong>Date Visited:</strong> ${formatDate(selectedVisitor.dateVisited)}</p>
          <p><strong>Status:</strong> ${selectedVisitor.status}</p>
          <p><strong>Violation Type:</strong> ${selectedVisitor.violationType}</p>
          <p><strong>Violation Details:</strong> ${selectedVisitor.violationDetails}</p>
          ${selectedVisitor.qrCode ? `
            <div class="qr-code">
              <h3>QR Code</h3>
              <img src="${selectedVisitor.qrCode}" alt="Visitor QR Code">
            </div>
          ` : ''}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const filteredVisitors = visitors.filter((visitor) =>
    Object.values(visitor).some((value) =>
      value?.toString().toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const sortedVisitors = filteredVisitors.sort((a, b) => {
    if (sortBy === "fullDetails") {
      return sortOrder === "asc" ? a.id.localeCompare(b.id) : b.id.localeCompare(a.id);
    }

    const aValue = a[sortBy]?.toString().toLowerCase() || "";
    const bValue = b[sortBy]?.toString().toLowerCase() || "";

    if (sortBy === "age") {
      return sortOrder === "asc" ? a[sortBy] - b[sortBy] : b[sortBy] - a[sortBy];
    } else if (sortBy === "dateOfBirth" || sortBy === "dateVisited") {
      const aDate = new Date(a[sortBy]);
      const bDate = new Date(b[sortBy]);
      return sortOrder === "asc" ? aDate - bDate : bDate - aDate;
    } else {
      return sortOrder === "asc" ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
    }
  });

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { variant: "warning", text: "Pending" },
      approved: { variant: "success", text: "Approved" },
      rejected: { variant: "danger", text: "Rejected" }
    };
    
    const config = statusConfig[status] || { variant: "secondary", text: status };
    return <span className={`badge bg-${config.variant}`}>{config.text}</span>;
  };

  return (
    <div className="container mt-5" style={{ backgroundColor: "#fff", padding: "20px", borderRadius: "10px" }}>
      <h2 style={{ fontFamily: "Poppins, sans-serif", fontWeight: "600", color: "#2c3e50" }}>
        👥 Visitor List
      </h2>

      <div className="d-flex justify-content-between align-items-center mb-4">
        <div className="d-flex">
          <Button 
            variant="primary" 
            onClick={() => setShowScannerModal(true)}
            className="me-2"
            style={{ height: "38px" }}
          >
            <FaQrcode /> Scan QR
          </Button>
          <InputGroup style={{ maxWidth: "400px" }}>
            <InputGroup.Text style={{ backgroundColor: "#007bff", border: "none", borderRadius: "25px 0 0 25px", color: "#fff" }}>
              <FaSearch />
            </InputGroup.Text>
            <Form.Control
              type="text"
              placeholder="Search visitors..."
              value={searchQuery}
              onChange={handleSearchChange}
              style={{ border: "none", boxShadow: "none", backgroundColor: "#e9f5ff", borderRadius: "0 25px 25px 0", height: "38px" }}
            />
          </InputGroup>
        </div>
        <div className="d-flex align-items-center">
          <Form.Select value={sortBy} onChange={handleSortChange} className="me-2" style={{ maxWidth: "200px", height: "38px" }}>
            <option value="fullDetails">Full Details</option>
            <option value="id">ID</option>
            <option value="name">Name</option>
            <option value="dateOfBirth">Date of Birth</option>
            <option value="age">Age</option>
            <option value="sex">Sex</option>
            <option value="prisonerId">Prisoner ID</option>
            <option value="relationship">Relationship</option>
            <option value="dateVisited">Date Visited</option>
            <option value="status">Status</option>
          </Form.Select>
          <Button
            variant="outline-secondary"
            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
            style={{ width: "50px", padding: "0.375rem 0.75rem", backgroundColor: "#e9ecef", borderColor: "#ced4da", height: "38px" }}
          >
            {sortOrder === "asc" ? "↑" : "↓"}
          </Button>
          <Button variant="success" onClick={handleExportCSV} className="ms-2" style={{ height: "38px" }}>
            <FaFileExport /> Export CSV
          </Button>
          <Button variant="primary" onClick={() => setShowAddModal(true)} className="ms-2" style={{ height: "38px" }}>
            <FaPlus /> Add Visitor
          </Button>
        </div>
      </div>

      <div className="table-responsive">
        <Table striped bordered hover className="shadow-sm" style={{ fontSize: "12px", width: "100%" }}>
          <thead>
            <tr>
              {sortBy === "fullDetails" ? (
                <>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Date of Birth</th>
                  <th>Age</th>
                  <th>Sex</th>
                  <th>Address</th>
                  <th>Contact</th>
                  <th>Prisoner ID</th>
                  <th>Relationship</th>
                  <th>Date Visited</th>
                  <th>Status</th>
                  <th style={{ width: "150px" }}>Actions</th>
                </>
              ) : (
                <>
                  <th>{sortBy.charAt(0).toUpperCase() + sortBy.slice(1)}</th>
                  {sortBy !== "name" && <th>Name</th>}
                  <th style={{ width: "150px" }}>Actions</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {sortedVisitors.length > 0 ? (
              sortedVisitors.map((visitor) => (
                <tr key={visitor.id}>
                  {sortBy === "fullDetails" ? (
                    <>
                      <td>{visitor.id}</td>
                      <td>{visitor.name}</td>
                      <td>{formatDate(visitor.dateOfBirth)}</td>
                      <td>{visitor.age}</td>
                      <td>{visitor.sex}</td>
                      <td>{visitor.address}</td>
                      <td>{visitor.contact}</td>
                      <td>{visitor.prisonerId}</td>
                      <td>{visitor.relationship}</td>
                      <td>{formatDate(visitor.dateVisited)}</td>
                      <td>{getStatusBadge(visitor.status)}</td>
                      <td>
                        <ButtonGroup>
                          <Button variant="info" size="sm" className="me-1" onClick={() => handleViewVisitor(visitor)} title="View">
                            <FaEye />
                          </Button>
                          <Button variant="warning" size="sm" className="me-1" onClick={() => handleEditVisitor(visitor)} title="Edit">
                            <FaEdit />
                          </Button>
                          <Button variant="success" size="sm" className="me-1" onClick={() => handleGenerateQrCode(visitor.id)} title="QR Code">
                            <FaQrcode />
                          </Button>
                          <Button variant="danger" size="sm" onClick={() => handleDeleteVisitor(visitor.id)} title="Delete">
                            <FaTrash />
                          </Button>
                        </ButtonGroup>
                      </td>
                    </>
                  ) : (
                    <>
                      <td>{sortBy === "status" ? getStatusBadge(visitor[sortBy]) : visitor[sortBy]}</td>
                      {sortBy !== "name" && <td>{visitor.name}</td>}
                      <td>
                        <ButtonGroup>
                          <Button variant="info" size="sm" className="me-1" onClick={() => handleViewVisitor(visitor)} title="View">
                            <FaEye />
                          </Button>
                          <Button variant="warning" size="sm" className="me-1" onClick={() => handleEditVisitor(visitor)} title="Edit">
                            <FaEdit />
                          </Button>
                          <Button variant="success" size="sm" className="me-1" onClick={() => handleGenerateQrCode(visitor.id)} title="QR Code">
                            <FaQrcode />
                          </Button>
                          <Button variant="danger" size="sm" onClick={() => handleDeleteVisitor(visitor.id)} title="Delete">
                            <FaTrash />
                          </Button>
                        </ButtonGroup>
                      </td>
                    </>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={sortBy === "fullDetails" ? 12 : 3} className="text-center">
                  No visitors found.
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>

      {/* View Visitor Modal */}
      <Modal show={showViewModal} onHide={() => setShowViewModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Visitor Details</Modal.Title>
        </Modal.Header>
        <Modal.Body id="modal-content">
          {selectedVisitor && (
            <div>
              <Row>
                <Col md={6}>
                  <p><strong>ID:</strong> {selectedVisitor.id}</p>
                  <p><strong>Name:</strong> {selectedVisitor.name}</p>
                  <p><strong>Date of Birth:</strong> {formatDate(selectedVisitor.dateOfBirth)}</p>
                  <p><strong>Age:</strong> {selectedVisitor.age}</p>
                  <p><strong>Sex:</strong> {selectedVisitor.sex}</p>
                  <p><strong>Address:</strong> {selectedVisitor.address}</p>
                </Col>
                <Col md={6}>
                  <p><strong>Contact:</strong> {selectedVisitor.contact}</p>
                  <p><strong>Prisoner ID:</strong> {selectedVisitor.prisonerId}</p>
                  <p><strong>Relationship:</strong> {selectedVisitor.relationship}</p>
                  <p><strong>Date Visited:</strong> {formatDate(selectedVisitor.dateVisited)}</p>
                  <p><strong>Status:</strong> {getStatusBadge(selectedVisitor.status)}</p>
                  {selectedVisitor.violationType && (
                    <p><strong>Violation Type:</strong> {selectedVisitor.violationType}</p>
                  )}
                </Col>
              </Row>
              {selectedVisitor.violationDetails && (
                <Row>
                  <Col md={12}>
                    <p><strong>Violation Details:</strong> {selectedVisitor.violationDetails}</p>
                  </Col>
                </Row>
              )}
              
              {selectedVisitor.qrCode && (
                <div className="text-center mt-4">
                  <h5>QR Code</h5>
                  <img 
                    src={selectedVisitor.qrCode} 
                    alt="Visitor QR Code" 
                    style={{ width: '100%', maxWidth: '200px' }}
                    className="mb-3"
                  />
                  <Button 
                    variant="primary"
                    onClick={() => {
                      setQrCode(selectedVisitor.qrCode);
                      setShowQrModal(true);
                    }}
                  >
                    View Full QR Code
                  </Button>
                </div>
              )}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowViewModal(false)}>
            Close
          </Button>
          <Button variant="primary" onClick={handlePrint}>
            <FaPrint /> Print
          </Button>
        </Modal.Footer>
      </Modal>

      {/* QR Code Modal */}
      <Modal show={showQrModal} onHide={() => setShowQrModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Visitor QR Code</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center">
          {qrCode && selectedVisitor && (
            <>
              <img 
                src={qrCode} 
                alt="Visitor QR Code" 
                style={{ width: '100%', maxWidth: '300px' }}
                className="mb-3"
              />
              <p className="mb-3">Visitor ID: {selectedVisitor.id}</p>
              <Button 
                variant="primary"
                onClick={downloadQrCode}
              >
                Download QR Code
              </Button>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowQrModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* QR Scanner Modal */}
      <QRCodeScannerModal 
        show={showScannerModal}
        onScan={handleScanComplete}
        onClose={() => setShowScannerModal(false)}
      />

      {/* Edit Visitor Modal */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Edit Visitor</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedVisitor && (
            <Form onSubmit={handleEditSubmit}>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>ID</Form.Label>
                    <Form.Control type="text" name="id" value={selectedVisitor.id} readOnly />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Name *</Form.Label>
                    <Form.Control type="text" name="name" value={selectedVisitor.name} onChange={handleInputChange} required />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Date of Birth</Form.Label>
                    <DatePicker
                      selected={selectedVisitor.dateOfBirth}
                      onChange={handleEditDateOfBirthChange}
                      className="form-control"
                      placeholderText="Select date of birth"
                      showYearDropdown
                      showMonthDropdown
                      dropdownMode="select"
                      yearDropdownItemNumber={100}
                      scrollableYearDropdown
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Age</Form.Label>
                    <Form.Control type="number" name="age" value={selectedVisitor.age} readOnly />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Sex</Form.Label>
                    <Form.Select name="sex" value={selectedVisitor.sex || ""} onChange={handleInputChange}>
                      <option value="">Select Sex</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </Form.Select>
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Address</Form.Label>
                    <Form.Control type="text" name="address" value={selectedVisitor.address} onChange={handleInputChange} />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Contact</Form.Label>
                    <Form.Control type="text" name="contact" value={selectedVisitor.contact} onChange={handleInputChange} />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Prisoner ID *</Form.Label>
                    <Form.Control type="text" name="prisonerId" value={selectedVisitor.prisonerId} onChange={handleInputChange} required />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Relationship</Form.Label>
                    <Form.Control type="text" name="relationship" value={selectedVisitor.relationship} onChange={handleInputChange} />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Date Visited</Form.Label>
                    <DatePicker
                      selected={selectedVisitor.dateVisited}
                      onChange={(date) => setSelectedVisitor({...selectedVisitor, dateVisited: date})}
                      className="form-control"
                      dateFormat="yyyy-MM-dd"
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Status</Form.Label>
                    <Form.Select name="status" value={selectedVisitor.status || "pending"} onChange={handleInputChange}>
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                    </Form.Select>
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Violation Type</Form.Label>
                    <Form.Control type="text" name="violationType" value={selectedVisitor.violationType} onChange={handleInputChange} />
                  </Form.Group>
                </Col>
              </Row>
              <Form.Group className="mb-3">
                <Form.Label>Violation Details</Form.Label>
                <Form.Control as="textarea" rows={3} name="violationDetails" value={selectedVisitor.violationDetails} onChange={handleInputChange} />
              </Form.Group>
              <Button type="submit" className="mt-3">
                Save Changes
              </Button>
            </Form>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEditModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Add Visitor Modal */}
      <Modal show={showAddModal} onHide={() => setShowAddModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Add New Visitor</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleAddSubmit}>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Name *</Form.Label>
                  <Form.Control type="text" name="name" value={addFormData.name} onChange={handleAddInputChange} required />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Date of Birth</Form.Label>
                  <DatePicker
                    selected={addFormData.dateOfBirth}
                    onChange={handleDateOfBirthChange}
                    className="form-control"
                    placeholderText="Select date of birth"
                    showYearDropdown
                    showMonthDropdown
                    dropdownMode="select"
                    yearDropdownItemNumber={100}
                    scrollableYearDropdown
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Age</Form.Label>
                  <Form.Control type="number" name="age" value={addFormData.age} readOnly />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Sex</Form.Label>
                  <Form.Select name="sex" value={addFormData.sex} onChange={handleAddInputChange}>
                    <option value="">Select Sex</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </Form.Select>
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Address</Form.Label>
                  <Form.Control type="text" name="address" value={addFormData.address} onChange={handleAddInputChange} />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Contact</Form.Label>
                  <Form.Control type="text" name="contact" value={addFormData.contact} onChange={handleAddInputChange} />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Prisoner ID *</Form.Label>
                  <Form.Control type="text" name="prisonerId" value={addFormData.prisonerId} onChange={handleAddInputChange} required />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Relationship</Form.Label>
                  <Form.Control type="text" name="relationship" value={addFormData.relationship} onChange={handleAddInputChange} />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Date Visited</Form.Label>
                  <DatePicker
                    selected={addFormData.dateVisited}
                    onChange={(date) => setAddFormData({...addFormData, dateVisited: date})}
                    className="form-control"
                    dateFormat="yyyy-MM-dd"
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Status</Form.Label>
                  <Form.Select name="status" value={addFormData.status} onChange={handleAddInputChange}>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </Form.Select>
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Violation Type</Form.Label>
                  <Form.Control type="text" name="violationType" value={addFormData.violationType} onChange={handleAddInputChange} />
                </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mb-3">
              <Form.Label>Violation Details</Form.Label>
              <Form.Control as="textarea" rows={3} name="violationDetails" value={addFormData.violationDetails} onChange={handleAddInputChange} />
            </Form.Group>
            <div className="d-flex justify-content-center mt-4">
              <Button type="submit" style={{ backgroundColor: "#007bff", border: "none", padding: "10px 30px" }}>
                Add Visitor
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      <ToastContainer
        position="top-right"
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

export default VisitorList;