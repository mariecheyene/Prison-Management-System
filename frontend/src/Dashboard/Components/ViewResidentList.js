import React, { useState, useEffect } from "react";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Table, Form, Button, Modal, InputGroup, ButtonGroup } from "react-bootstrap";
import "bootstrap/dist/css/bootstrap.min.css";
import { useNavigate } from "react-router-dom";
import { FaSearch, FaPrint, FaFileExport, FaQrcode } from "react-icons/fa";
import Papa from "papaparse";
import QrScanner from "qr-scanner";
import "../css/Dashboard.css";

const API_URL = "http://localhost:5000/residents";

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
        <Modal.Title>Scan Resident QR Code</Modal.Title>
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
        <p className="mt-2">Point your camera at a resident's QR code</p>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

const ViewResidentList = () => {
  const navigate = useNavigate();
  const [residents, setResidents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState("fullDetails");
  const [sortOrder, setSortOrder] = useState("asc");
  const [searchQuery, setSearchQuery] = useState("");
  const [showViewModal, setShowViewModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [qrCode, setQrCode] = useState("");
  const [selectedResident, setSelectedResident] = useState({
    id: "",
    name: "",
    birthdate: "",
    age: "",
    sex: "",
    civilStatus: "",
    purokNumber: "",
    householdNumber: "",
    employmentStatus: "",
    educationalAttainment: "",
    votersStatus: "",
    address: "",
    phone: "",
    residenceStatus: "",
    yearsOfStay: "",
    role: "",
    qrCode: ""
  });

  useEffect(() => {
    fetchResidents();
  }, []);

  const fetchResidents = async () => {
    setLoading(true);
    try {
      const response = await axios.get(API_URL);
      setResidents(response.data);
    } catch (error) {
      toast.error("Error fetching residents");
    }
    setLoading(false);
  };

  const handleSortChange = (e) => {
    setSortBy(e.target.value);
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleViewResident = (resident) => {
    setSelectedResident(resident);
    setShowViewModal(true);
  };

  const handleGenerateQrCode = async (residentId) => {
    try {
      // First, find and set the selected resident
      const resident = residents.find(r => r.id === residentId);
      if (resident) {
        setSelectedResident(resident);
        
        // Then generate the QR code
        const response = await axios.get(`${API_URL}/${residentId}/qrcode`);
        setQrCode(response.data.qrCode);
        setShowQrModal(true);
      } else {
        toast.error("Resident not found");
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
    link.download = `resident-${selectedResident.id}-qrcode.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleScanComplete = (scannedData) => {
    try {
      // Try to extract ID from different possible QR code formats
      let residentId;
      
      // Case 1: QR contains just the ID
      if (/^\d+$/.test(scannedData)) {
        residentId = scannedData;
      } 
      // Case 2: QR contains a URL with ID as last part
      else if (scannedData.includes('/')) {
        const parts = scannedData.split('/');
        residentId = parts[parts.length - 1];
      }
      // Case 3: QR contains JSON data
      else if (scannedData.startsWith('{')) {
        const data = JSON.parse(scannedData);
        residentId = data.id;
      } else {
        residentId = scannedData; // fallback
      }

      const resident = residents.find(r => r.id === residentId || r.id.toString() === residentId.toString());
      
      if (resident) {
        setSelectedResident(resident);
        setShowViewModal(true);
      } else {
        toast.error(`Resident not found. Scanned data: ${scannedData}`);
        console.log('All residents:', residents); // Debugging
      }
    } catch (error) {
      console.error('Error processing QR code:', error);
      toast.error(`Error processing QR code: ${scannedData}`);
    }
    setShowScannerModal(false);
  };

  const handleExportCSV = () => {
    const fileName = prompt("Enter a name for the CSV file:", "residents");
    if (!fileName) return;

    const dataToExport = residents
      .sort((a, b) => (sortOrder === "asc" ? a.id - b.id : b.id - a.id))
      .map((resident) => ({
        ID: resident.id,
        Name: resident.name,
        Birthdate: formatDate(resident.birthdate) || "N/A",
        Age: resident.age,
        Sex: resident.sex,
        "Civil Status": resident.civilStatus,
        "Purok Number": resident.purokNumber,
        "Household Number": resident.householdNumber,
        "Employment Status": resident.employmentStatus,
        "Educational Attainment": resident.educationalAttainment,
        "Voter's Status": resident.votersStatus,
        Address: resident.address,
        Phone: resident.phone,
        "Residence Status": resident.residenceStatus,
        "Years of Stay": resident.yearsOfStay,
        Role: resident.role,
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
          <title>Resident Details</title>
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
          <h2>Resident Details</h2>
          <p><strong>ID:</strong> ${selectedResident.id}</p>
          <p><strong>Name:</strong> ${selectedResident.name}</p>
          <p><strong>Birthdate:</strong> ${formatDate(selectedResident.birthdate) || "N/A"}</p>
          <p><strong>Age:</strong> ${selectedResident.age}</p>
          <p><strong>Sex:</strong> ${selectedResident.sex}</p>
          <p><strong>Civil Status:</strong> ${selectedResident.civilStatus}</p>
          <p><strong>Purok Number:</strong> ${selectedResident.purokNumber}</p>
          <p><strong>Household Number:</strong> ${selectedResident.householdNumber}</p>
          <p><strong>Employment Status:</strong> ${selectedResident.employmentStatus}</p>
          <p><strong>Educational Attainment:</strong> ${selectedResident.educationalAttainment}</p>
          <p><strong>Voter's Status:</strong> ${selectedResident.votersStatus}</p>
          <p><strong>Address:</strong> ${selectedResident.address}</p>
          <p><strong>Phone:</strong> ${selectedResident.phone}</p>
          <p><strong>Residence Status:</strong> ${selectedResident.residenceStatus}</p>
          <p><strong>Years of Stay:</strong> ${selectedResident.yearsOfStay}</p>
          <p><strong>Role:</strong> ${selectedResident.role}</p>
          ${selectedResident.qrCode ? `
            <div class="qr-code">
              <h3>QR Code</h3>
              <img src="${selectedResident.qrCode}" alt="Resident QR Code">
            </div>
          ` : ''}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const filteredResidents = residents.filter((resident) =>
    Object.values(resident).some((value) =>
      value?.toString().toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const sortedResidents = filteredResidents.sort((a, b) => {
    if (sortBy === "fullDetails") {
      return sortOrder === "asc" ? a.id - b.id : b.id - a.id;
    }

    const aValue = a[sortBy]?.toString().toLowerCase() || "";
    const bValue = b[sortBy]?.toString().toLowerCase() || "";

    if (sortBy === "id" || sortBy === "purokNumber" || sortBy === "yearsOfStay" || sortBy === "age") {
      return sortOrder === "asc" ? a[sortBy] - b[sortBy] : b[sortBy] - a[sortBy];
    } else if (sortBy === "householdNumber") {
      const pad = (num) => num.toString().padStart(10, "0");
      const aPadded = pad(aValue);
      const bPadded = pad(bValue);
      return sortOrder === "asc" ? aPadded.localeCompare(bPadded) : bPadded.localeCompare(aPadded);
    } else if (sortBy === "birthdate") {
      const aDate = new Date(a.birthdate);
      const bDate = new Date(b.birthdate);
      return sortOrder === "asc" ? aDate - bDate : bDate - aDate;
    } else {
      return sortOrder === "asc" ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
    }
  });

  const groupedResidents = sortBy === "householdNumber"
    ? sortedResidents.reduce((acc, resident) => {
        const householdNumber = resident.householdNumber;
        if (!acc[householdNumber]) {
          acc[householdNumber] = [];
        }
        acc[householdNumber].push(resident);
        return acc;
      }, {})
    : null;

  return (
    <div className="container mt-5" style={{ backgroundColor: "#fff", padding: "20px", borderRadius: "10px" }}>
      <h2 style={{ fontFamily: "Poppins, sans-serif", fontWeight: "600", color: "#2c3e50" }}>
        📋 Resident List
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
              placeholder="Search residents..."
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
            <option value="birthdate">Birthdate</option>
            <option value="age">Age</option>
            <option value="sex">Sex</option>
            <option value="civilStatus">Civil Status</option>
            <option value="purokNumber">Purok Number</option>
            <option value="householdNumber">Household Number</option>
            <option value="employmentStatus">Employment Status</option>
            <option value="educationalAttainment">Educational Attainment</option>
            <option value="votersStatus">Voter's Status</option>
            <option value="address">Address</option>
            <option value="phone">Phone</option>
            <option value="residenceStatus">Residence Status</option>
            <option value="yearsOfStay">Years of Stay</option>
            <option value="role">Role</option>
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
        </div>
      </div>

      <div className="table-responsive">
        <Table striped bordered hover className="shadow-sm" style={{ fontSize: "12px", width: sortBy === "name" ? "50%" : "100%" }}>
          <thead>
            <tr>
              {sortBy === "fullDetails" ? (
                <>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Birthdate</th>
                  <th>Age</th>
                  <th>Sex</th>
                  <th>Civil Status</th>
                  <th>Purok Number</th>
                  <th>Household Number</th>
                  <th>Employment Status</th>
                  <th>Educational Attainment</th>
                  <th>Voter's Status</th>
                  <th>Address</th>
                  <th>Phone</th>
                  <th>Residence Status</th>
                  <th>Years of Stay</th>
                  <th>Role</th>
                  <th style={{ width: "120px" }}>Actions</th>
                </>
              ) : sortBy === "householdNumber" ? (
                <>
                  <th>Household Number</th>
                  <th>Name</th>
                  <th>Role</th>
                  <th style={{ width: "120px" }}>Actions</th>
                </>
              ) : sortBy === "birthdate" ? (
                <>
                  <th>Birthdate</th>
                  <th>Age</th>
                  <th>Name</th>
                  <th style={{ width: "120px" }}>Actions</th>
                </>
              ) : sortBy === "sex" ? (
                <>
                  <th>Sex</th>
                  <th>Name</th>
                  <th style={{ width: "120px" }}>Actions</th>
                </>
              ) : sortBy === "civilStatus" ? (
                <>
                  <th>Civil Status</th>
                  <th>Name</th>
                  <th style={{ width: "120px" }}>Actions</th>
                </>
              ) : (
                <>
                  <th>{sortBy.charAt(0).toUpperCase() + sortBy.slice(1)}</th>
                  {sortBy !== "name" && <th>Name</th>}
                  <th style={{ width: "120px" }}>Actions</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {sortBy === "householdNumber" ? (
              Object.entries(groupedResidents || {}).map(([householdNumber, residents]) => (
                <React.Fragment key={householdNumber}>
                  <tr>
                    <td colSpan={4} style={{ fontWeight: "bold", backgroundColor: "#f0f0f0" }}>
                      Household Number: {householdNumber}
                    </td>
                  </tr>
                  {residents.map((resident) => (
                    <tr key={resident.id}>
                      <td>{resident.householdNumber}</td>
                      <td>{resident.name}</td>
                      <td>{resident.role}</td>
                      <td>
                        <ButtonGroup>
                          <Button variant="info" size="sm" className="me-1" onClick={() => handleViewResident(resident)}>
                            View
                          </Button>
                          <Button variant="success" size="sm" onClick={() => handleGenerateQrCode(resident.id)}>
                            <FaQrcode />
                          </Button>
                        </ButtonGroup>
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))
            ) : sortBy === "sex" ? (
              <>
                <tr>
                  <td colSpan={3} style={{ fontWeight: "bold", backgroundColor: "#f0f0f0" }}>
                    Male
                  </td>
                </tr>
                {sortedResidents
                  .filter((resident) => resident.sex === "Male")
                  .map((resident) => (
                    <tr key={resident.id}>
                      <td>{resident.sex}</td>
                      <td>{resident.name}</td>
                      <td>
                        <ButtonGroup>
                          <Button variant="info" size="sm" className="me-1" onClick={() => handleViewResident(resident)}>
                            View
                          </Button>
                          <Button variant="success" size="sm" onClick={() => handleGenerateQrCode(resident.id)}>
                            <FaQrcode />
                          </Button>
                        </ButtonGroup>
                      </td>
                    </tr>
                  ))}

                <tr>
                  <td colSpan={3} style={{ fontWeight: "bold", backgroundColor: "#f0f0f0" }}>
                    Female
                  </td>
                </tr>
                {sortedResidents
                  .filter((resident) => resident.sex === "Female")
                  .map((resident) => (
                    <tr key={resident.id}>
                      <td>{resident.sex}</td>
                      <td>{resident.name}</td>
                      <td>
                        <ButtonGroup>
                          <Button variant="info" size="sm" className="me-1" onClick={() => handleViewResident(resident)}>
                            View
                          </Button>
                          <Button variant="success" size="sm" onClick={() => handleGenerateQrCode(resident.id)}>
                            <FaQrcode />
                          </Button>
                        </ButtonGroup>
                      </td>
                    </tr>
                  ))}
              </>
            ) : sortedResidents.length > 0 ? (
              sortedResidents.map((resident) => (
                <tr key={resident.id}>
                  {sortBy === "fullDetails" ? (
                    <>
                      <td>{resident.id}</td>
                      <td>{resident.name}</td>
                      <td>{formatDate(resident.birthdate)}</td>
                      <td>{resident.age}</td>
                      <td>{resident.sex}</td>
                      <td>{resident.civilStatus}</td>
                      <td>{resident.purokNumber}</td>
                      <td>{resident.householdNumber}</td>
                      <td>{resident.employmentStatus}</td>
                      <td>{resident.educationalAttainment}</td>
                      <td>{resident.votersStatus}</td>
                      <td>{resident.address}</td>
                      <td>{resident.phone}</td>
                      <td>{resident.residenceStatus}</td>
                      <td>{resident.yearsOfStay}</td>
                      <td>{resident.role}</td>
                      <td>
                        <ButtonGroup>
                          <Button variant="info" size="sm" className="me-1" onClick={() => handleViewResident(resident)}>
                            View
                          </Button>
                          <Button variant="success" size="sm" onClick={() => handleGenerateQrCode(resident.id)}>
                            <FaQrcode />
                          </Button>
                        </ButtonGroup>
                      </td>
                    </>
                  ) : sortBy === "birthdate" ? (
                    <>
                      <td>{formatDate(resident.birthdate)}</td>
                      <td>{resident.age}</td>
                      <td>{resident.name}</td>
                      <td>
                        <ButtonGroup>
                          <Button variant="info" size="sm" className="me-1" onClick={() => handleViewResident(resident)}>
                            View
                          </Button>
                          <Button variant="success" size="sm" onClick={() => handleGenerateQrCode(resident.id)}>
                            <FaQrcode />
                          </Button>
                        </ButtonGroup>
                      </td>
                    </>
                  ) : sortBy === "civilStatus" ? (
                    <>
                      <td>{resident.civilStatus}</td>
                      <td>{resident.name}</td>
                      <td>
                        <ButtonGroup>
                          <Button variant="info" size="sm" className="me-1" onClick={() => handleViewResident(resident)}>
                            View
                          </Button>
                          <Button variant="success" size="sm" onClick={() => handleGenerateQrCode(resident.id)}>
                            <FaQrcode />
                          </Button>
                        </ButtonGroup>
                      </td>
                    </>
                  ) : (
                    <>
                      <td>{resident[sortBy]}</td>
                      {sortBy !== "name" && <td>{resident.name}</td>}
                      <td>
                        <ButtonGroup>
                          <Button variant="info" size="sm" className="me-1" onClick={() => handleViewResident(resident)}>
                            View
                          </Button>
                          <Button variant="success" size="sm" onClick={() => handleGenerateQrCode(resident.id)}>
                            <FaQrcode />
                          </Button>
                        </ButtonGroup>
                      </td>
                    </>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={sortBy === "fullDetails" ? 17 : 3} className="text-center">
                  No residents found.
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>

      {/* View Resident Modal */}
      <Modal show={showViewModal} onHide={() => setShowViewModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Resident Details</Modal.Title>
        </Modal.Header>
        <Modal.Body id="modal-content">
          {selectedResident && (
            <div>
              <p><strong>ID:</strong> {selectedResident.id}</p>
              <p><strong>Name:</strong> {selectedResident.name}</p>
              <p><strong>Birthdate:</strong> {formatDate(selectedResident.birthdate)}</p>
              <p><strong>Age:</strong> {selectedResident.age}</p>
              <p><strong>Sex:</strong> {selectedResident.sex}</p>
              <p><strong>Civil Status:</strong> {selectedResident.civilStatus}</p>
              <p><strong>Purok Number:</strong> {selectedResident.purokNumber}</p>
              <p><strong>Household Number:</strong> {selectedResident.householdNumber}</p>
              <p><strong>Employment Status:</strong> {selectedResident.employmentStatus}</p>
              <p><strong>Educational Attainment:</strong> {selectedResident.educationalAttainment}</p>
              <p><strong>Voter's Status:</strong> {selectedResident.votersStatus}</p>
              <p><strong>Address:</strong> {selectedResident.address}</p>
              <p><strong>Phone:</strong> {selectedResident.phone}</p>
              <p><strong>Residence Status:</strong> {selectedResident.residenceStatus}</p>
              <p><strong>Years of Stay:</strong> {selectedResident.yearsOfStay}</p>
              <p><strong>Role:</strong> {selectedResident.role}</p>
              
              {selectedResident.qrCode && (
                <div className="text-center mt-4">
                  <h5>QR Code</h5>
                  <img 
                    src={selectedResident.qrCode} 
                    alt="Resident QR Code" 
                    style={{ width: '100%', maxWidth: '200px' }}
                    className="mb-3"
                  />
                  <Button 
                    variant="primary"
                    onClick={() => {
                      setQrCode(selectedResident.qrCode);
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
          <Modal.Title>Resident QR Code</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center">
          {qrCode && selectedResident && (
            <>
              <img 
                src={qrCode} 
                alt="Resident QR Code" 
                style={{ width: '100%', maxWidth: '300px' }}
                className="mb-3"
              />
              <p className="mb-3">Resident ID: {selectedResident.id}</p>
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

export default ViewResidentList;