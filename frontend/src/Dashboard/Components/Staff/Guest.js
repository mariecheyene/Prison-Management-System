import React, { useState, useEffect } from 'react';
import { 
  Container, Row, Col, Table, Button, Modal, Form, 
  Alert, Badge, Spinner, InputGroup, Card
} from 'react-bootstrap';
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import axios from "axios";
import { 
  Search, 
  Plus, 
  Eye, 
  Download,
  Printer,
  Grid
} from 'react-feather';

const Guest = () => {
  const [guests, setGuests] = useState([]);
  const [filteredGuests, setFilteredGuests] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedGuest, setSelectedGuest] = useState(null);
  const [selectedQRGuest, setSelectedQRGuest] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchBy, setSearchBy] = useState('lastName');
  const [imageFile, setImageFile] = useState(null);

  const searchOptions = [
    { value: 'lastName', label: 'Last Name' },
    { value: 'firstName', label: 'First Name' },
    { value: 'id', label: 'Guest ID' },
    { value: 'visitPurpose', label: 'Visit Purpose' }
  ];

  useEffect(() => {
    fetchGuests();
  }, []);

  useEffect(() => {
    filterGuests();
  }, [searchQuery, searchBy, guests]);

  const fetchGuests = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get("http://localhost:5000/guests");
      // Filter only approved guests (not pending ones)
      const approvedGuests = response.data.filter(guest => guest.status === 'approved' || guest.status === 'completed');
      setGuests(approvedGuests);
    } catch (error) {
      console.error("Error fetching guests:", error);
      toast.error("Failed to fetch guests");
    } finally {
      setIsLoading(false);
    }
  };

  const filterGuests = () => {
    if (!searchQuery.trim()) {
      setFilteredGuests(guests);
      return;
    }

    const filtered = guests.filter(guest => {
      const query = searchQuery.toLowerCase();
      const value = guest[searchBy]?.toString().toLowerCase() || '';
      return value.includes(query);
    });
    
    setFilteredGuests(filtered);
  };

  const handleAdd = () => {
    const initialData = {
      lastName: '',
      firstName: '',
      middleName: '',
      extension: '',
      dateOfBirth: '',
      age: '',
      sex: '',
      address: '',
      contact: '',
      visitPurpose: '',
    };
    setFormData(initialData);
    setImageFile(null);
    setShowModal(true);
  };

  const handleView = (guest) => {
    setSelectedGuest(guest);
    setShowViewModal(true);
  };

  const handleShowQR = async (guest) => {
    setSelectedQRGuest(guest);
    setShowQRModal(true);
  };

  const [formData, setFormData] = useState({
    lastName: '',
    firstName: '',
    middleName: '',
    extension: '',
    dateOfBirth: '',
    age: '',
    sex: '',
    address: '',
    contact: '',
    visitPurpose: '',
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (name === 'dateOfBirth' && value) {
      const birthDate = new Date(value);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      setFormData(prev => ({ ...prev, age: age.toString() }));
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    setImageFile(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    if (!formData.lastName || !formData.firstName || !formData.sex || !formData.dateOfBirth || 
        !formData.address || !formData.contact || !formData.visitPurpose) {
      toast.error('Please fill in all required fields');
      setIsLoading(false);
      return;
    }

    try {
      const submitData = new FormData();
      
      const formattedData = {
        ...formData,
        middleName: formData.middleName || '',
        extension: formData.extension || '',
        age: formData.age || '',
      };

      Object.keys(formattedData).forEach(key => {
        if (formattedData[key] !== null && formattedData[key] !== undefined) {
          submitData.append(key, formattedData[key]);
        }
      });

      if (imageFile) {
        submitData.append('photo', imageFile);
      }

      // Submit to pending guests endpoint instead of regular guests
      const response = await axios.post("http://localhost:5000/pending-guests", submitData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      toast.success('Guest request submitted successfully! Waiting for admin approval.');
      
      setShowModal(false);
      resetForm();
    } catch (error) {
      console.error('Error submitting guest request:', error);
      const errorMessage = error.response?.data?.message || 
                        error.response?.data?.error || 
                        'Failed to submit guest request';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const downloadQRCode = () => {
    if (!selectedQRGuest?.qrCode) return;
    
    const link = document.createElement('a');
    link.href = selectedQRGuest.qrCode;
    link.download = `guest-qr-${selectedQRGuest.id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('QR code downloaded successfully!');
  };

  const resetForm = () => {
    setFormData({
      lastName: '',
      firstName: '',
      middleName: '',
      extension: '',
      dateOfBirth: '',
      age: '',
      sex: '',
      address: '',
      contact: '',
      visitPurpose: '',
    });
    setImageFile(null);
  };

  const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return 'N/A';
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const getTimeStatus = (guest) => {
    // Check today's visit status from dailyVisits
    const today = new Date().toISOString().split('T')[0];
    const todayVisit = guest.dailyVisits?.find(visit => {
      if (!visit.visitDate) return false;
      const visitDate = new Date(visit.visitDate).toISOString().split('T')[0];
      return visitDate === today;
    });

    if (!todayVisit) return { variant: 'secondary', text: 'Not Checked In' };
    if (todayVisit.hasTimedIn && !todayVisit.hasTimedOut) return { variant: 'success', text: 'Checked In' };
    if (todayVisit.hasTimedIn && todayVisit.hasTimedOut) return { variant: 'info', text: 'Checked Out' };
    return { variant: 'secondary', text: 'Not Checked In' };
  };

  const getViolationVariant = (guest) => {
    if (guest.violationType && guest.violationType.trim() !== '') {
      return 'danger';
    }
    return 'success';
  };

  const getViolationText = (guest) => {
    if (guest.violationType && guest.violationType.trim() !== '') {
      return guest.violationType;
    }
    return 'No violation';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No visits';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'No visits';
      }
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'No visits';
    }
  };

  const printGuestDetails = () => {
    const printWindow = window.open('', '_blank');
    const timeStatus = getTimeStatus(selectedGuest);
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Guest Details - ${selectedGuest?.id}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 20px; 
              line-height: 1.4;
              color: #333;
            }
            .header { 
              text-align: center; 
              margin-bottom: 30px; 
              border-bottom: 3px solid #333; 
              padding-bottom: 15px; 
            }
            .section { 
              margin-bottom: 25px; 
              padding: 15px;
              border: 1px solid #ddd;
              border-radius: 5px;
            }
            .section h3 {
              margin-top: 0;
              color: #2c3e50;
              border-bottom: 1px solid #eee;
              padding-bottom: 8px;
            }
            .info-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 15px;
            }
            .info-item {
              margin-bottom: 10px;
            }
            .label { 
              font-weight: bold; 
              color: #2c3e50;
              display: inline-block;
              width: 140px;
            }
            .full-width {
              grid-column: 1 / -1;
            }
            .violation { 
              background-color: #ffe6e6; 
              border-left: 4px solid #dc3545;
              padding: 10px;
              margin: 10px 0;
            }
            .qr-code {
              text-align: center;
              margin: 20px 0;
            }
            .qr-code img {
              max-width: 300px;
              height: auto;
              border: 1px solid #ddd;
              border-radius: 5px;
            }
            .guest-photo {
              text-align: center;
              margin: 20px 0;
            }
            .guest-photo img {
              max-width: 200px;
              max-height: 200px;
              object-fit: cover;
              border: 1px solid #ddd;
              border-radius: 5px;
            }
            .photo-container {
              display: flex;
              justify-content: space-around;
              align-items: flex-start;
              flex-wrap: wrap;
              gap: 20px;
              margin: 20px 0;
            }
            .photo-item {
              text-align: center;
            }
            .photo-item h4 {
              margin-bottom: 10px;
              color: #2c3e50;
            }
            .time-status {
              display: inline-block;
              padding: 4px 8px;
              border-radius: 4px;
              color: white;
              font-weight: bold;
            }
            .status-success { background-color: #28a745; }
            .status-info { background-color: #17a2b8; }
            .status-secondary { background-color: #6c757d; }
            @media print {
              body { margin: 10px; }
              .section { border: none; }
              .photo-container { 
                display: flex; 
                justify-content: space-around;
              }
              .header { border-bottom: 2px solid #333; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>PRISON MANAGEMENT SYSTEM</h1>
            <h2>GUEST DETAILS RECORD</h2>
            <h3>Guest ID: ${selectedGuest?.id}</h3>
          </div>
          
          ${selectedGuest ? `
            <div class="section">
              <h3>Time Tracking Information</h3>
              <div class="info-grid">
                <div class="info-item">
                  <span class="label">Last Visit Date:</span> ${selectedGuest.lastVisitDate ? new Date(selectedGuest.lastVisitDate).toLocaleDateString() : 'No visits yet'}
                </div>
                <div class="info-item">
                  <span class="label">Current Status:</span> 
                  <span class="time-status status-${timeStatus.variant}">${timeStatus.text}</span>
                </div>
              </div>
            </div>

            <div class="section">
              <h3>Identification</h3>
              <div class="photo-container">
                ${selectedGuest.photo ? `
                  <div class="photo-item">
                    <h4>Guest Photo</h4>
                    <div class="guest-photo">
                      <img src="http://localhost:5000/uploads/${selectedGuest.photo}" alt="Guest Photo" />
                    </div>
                  </div>
                ` : ''}
                ${selectedGuest.qrCode ? `
                  <div class="photo-item">
                    <h4>QR Code</h4>
                    <div class="qr-code">
                      <img src="${selectedGuest.qrCode}" alt="Guest QR Code" />
                    </div>
                  </div>
                ` : ''}
              </div>
            </div>

            <div class="section">
              <h3>Guest Information</h3>
              <div class="info-grid">
                <div class="info-item">
                  <span class="label">Full Name:</span> ${selectedGuest.fullName}
                </div>
                <div class="info-item">
                  <span class="label">Gender:</span> ${selectedGuest.sex}
                </div>
                <div class="info-item">
                  <span class="label">Date of Birth:</span> ${new Date(selectedGuest.dateOfBirth).toLocaleDateString()}
                </div>
                <div class="info-item">
                  <span class="label">Age:</span> ${calculateAge(selectedGuest.dateOfBirth)}
                </div>
                <div class="info-item full-width">
                  <span class="label">Address:</span> ${selectedGuest.address}
                </div>
                <div class="info-item">
                  <span class="label">Contact:</span> ${selectedGuest.contact || 'N/A'}
                </div>
              </div>
            </div>

            <div class="section">
              <h3>Visit Details</h3>
              <div class="info-grid">
                <div class="info-item full-width">
                  <span class="label">Visit Purpose:</span> ${selectedGuest.visitPurpose}
                </div>
              </div>
            </div>

            ${selectedGuest.violationType ? `
            <div class="section">
              <h3>Violation Information</h3>
              <div class="violation">
                <div class="info-item">
                  <span class="label">Violation Type:</span> ${selectedGuest.violationType}
                </div>
                <div class="info-item full-width">
                  <span class="label">Violation Details:</span> ${selectedGuest.violationDetails || 'No violation data'}
                </div>
              </div>
            </div>
            ` : ''}

            <div class="section">
              <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
                <p><strong>Generated on:</strong> ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
                <p><em>Official Document - Prison Management System</em></p>
              </div>
            </div>
          ` : ''}
        </body>
      </html>
    `);
    printWindow.document.close();
    
    // Wait for images to load before printing
    printWindow.onload = function() {
      setTimeout(() => {
        printWindow.print();
      }, 1000);
    };
  };

  return (
    <Container>
      <ToastContainer />
      
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 style={{ fontFamily: "Poppins, sans-serif", fontWeight: "600", color: "#2c3e50" }}>
            👤 Guests Management (Staff)
          </h2>
          <Badge bg="info" className="mb-2">
            Staff Access - View Only
          </Badge>
        </div>
        <div className="d-flex gap-2">
          <Button variant="dark" onClick={handleAdd}>
            <Plus size={16} className="me-1" />
            Request New Guest
          </Button>
        </div>
      </div>

      <Card className="mb-4 border-0 bg-light">
        <Card.Body>
          <Row className="align-items-center">
            <Col md={8}>
              <InputGroup>
                <InputGroup.Text className="bg-white">
                  <Search size={16} />
                </InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder="Search guests..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="border-start-0"
                />
                <Form.Select 
                  value={searchBy} 
                  onChange={(e) => setSearchBy(e.target.value)}
                  className="bg-white"
                  style={{ maxWidth: '150px' }}
                >
                  {searchOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Form.Select>
              </InputGroup>
            </Col>
            <Col md={4}>
              <div className="text-muted small">
                {filteredGuests.length} approved guests found
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {isLoading && guests.length === 0 ? (
        <div className="text-center">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading guests...</span>
          </Spinner>
        </div>
      ) : filteredGuests.length === 0 ? (
        <Alert variant="info">
          {searchQuery ? 'No guests found matching your search.' : 'No approved guests found.'}
        </Alert>
      ) : (
        <Table striped bordered hover responsive className="bg-white">
          <thead className="table-dark">
            <tr>
              <th>Guest ID</th>
              <th>Full Name</th>
              <th>Gender</th>
              <th>Visit Purpose</th>
              <th>Last Visit Date</th>
              <th>Time Status</th>
              <th>Violation Type</th>
              <th style={{ width: '100px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredGuests.map(guest => (
              <tr key={guest._id}>
                <td><strong>{guest.id}</strong></td>
                <td>{guest.fullName}</td>
                <td>{guest.sex}</td>
                <td>{guest.visitPurpose}</td>
                <td>
                  {guest.lastVisitDate ? (
                    <Badge bg="info">
                      {formatDate(guest.lastVisitDate)}
                    </Badge>
                  ) : (
                    <Badge bg="secondary">Not visited</Badge>
                  )}
                </td>
                <td>
                  <Badge bg={getTimeStatus(guest).variant}>
                    {getTimeStatus(guest).text}
                  </Badge>
                </td>
                <td>
                  <Badge bg={getViolationVariant(guest)}>
                    {getViolationText(guest)}
                  </Badge>
                </td>
                <td>
                  <div className="d-flex gap-1">
                    <Button 
                      variant="outline-primary" 
                      size="sm" 
                      onClick={() => handleShowQR(guest)}
                      className="p-1"
                      title="QR Code"
                    >
                      <Grid size={14} />
                    </Button>
                    <Button 
                      variant="outline-info" 
                      size="sm" 
                      onClick={() => handleView(guest)}
                      className="p-1"
                      title="View Details"
                    >
                      <Eye size={14} />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {/* Add Request Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Request New Guest</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            <Alert variant="warning">
              <strong>Note for Staff:</strong> All guest requests require admin approval. 
              The guest will be available in the system only after approval.
            </Alert>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Last Name *</Form.Label>
                  <Form.Control
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    required
                    placeholder="Enter last name"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>First Name *</Form.Label>
                  <Form.Control
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    required
                    placeholder="Enter first name"
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Middle Name</Form.Label>
                  <Form.Control
                    type="text"
                    name="middleName"
                    value={formData.middleName}
                    onChange={handleInputChange}
                    placeholder="Enter middle name"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Extension (Jr, Sr, III)</Form.Label>
                  <Form.Control
                    type="text"
                    name="extension"
                    value={formData.extension}
                    onChange={handleInputChange}
                    placeholder="e.g., Jr, Sr, III"
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Gender *</Form.Label>
                  <Form.Select
                    name="sex"
                    value={formData.sex}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Date of Birth *</Form.Label>
                  <Form.Control
                    type="date"
                    name="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleInputChange}
                    required
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Age</Form.Label>
                  <Form.Control
                    type="number"
                    name="age"
                    value={formData.age}
                    onChange={handleInputChange}
                    placeholder="Auto-calculated"
                    readOnly
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Contact Number *</Form.Label>
                  <Form.Control
                    type="text"
                    name="contact"
                    value={formData.contact}
                    onChange={handleInputChange}
                    required
                    placeholder="Phone number"
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Address *</Form.Label>
              <Form.Control
                type="text"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                required
                placeholder="Enter complete address"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Visit Purpose *</Form.Label>
              <Form.Control
                type="text"
                name="visitPurpose"
                value={formData.visitPurpose}
                onChange={handleInputChange}
                required
                placeholder="e.g., Official Business, Interview, Meeting"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Guest Photo</Form.Label>
              <Form.Control
                type="file"
                accept="image/*"
                onChange={handleImageChange}
              />
              <Form.Text className="text-muted">
                Upload guest's photo for identification
              </Form.Text>
            </Form.Group>

            <Alert variant="info" className="mt-3">
              <strong>Note:</strong> Time in and time out will be automatically recorded when the guest scans their QR code at the entrance/exit.
            </Alert>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button variant="dark" type="submit" disabled={isLoading}>
              {isLoading ? <Spinner size="sm" /> : 'Submit Request'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* View Modal */}
      <Modal show={showViewModal} onHide={() => setShowViewModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Guest Details - {selectedGuest?.id}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedGuest && (
            <Row>
              <Col md={12}>
                <Card className="mb-4">
                  <Card.Header>
                    <strong>Time Tracking Information</strong>
                  </Card.Header>
                  <Card.Body>
                    <Row>
                      <Col md={6}>
                        <p><strong>Last Visit Date:</strong> {selectedGuest.lastVisitDate ? new Date(selectedGuest.lastVisitDate).toLocaleDateString() : 'No visits yet'}</p>
                        <p><strong>Current Status:</strong> <Badge bg={getTimeStatus(selectedGuest).variant}>{getTimeStatus(selectedGuest).text}</Badge></p>
                      </Col>
                      <Col md={6}>
                        <p><strong>Total Visits:</strong> {selectedGuest.dailyVisits?.length || 0}</p>
                        <p><strong>Guest Status:</strong> <Badge bg={selectedGuest.status === 'approved' ? 'success' : 'secondary'}>{selectedGuest.status}</Badge></p>
                      </Col>
                    </Row>
                  </Card.Body>
                </Card>
              </Col>

              <Col md={12}>
                <Card className="mb-4">
                  <Card.Header>
                    <strong>QR Code</strong>
                  </Card.Header>
                  <Card.Body className="text-center">
                    {selectedGuest.qrCode ? (
                      <img 
                        src={selectedGuest.qrCode} 
                        alt="Guest QR Code" 
                        style={{ 
                          maxWidth: '300px', 
                          height: 'auto',
                          border: '1px solid #ddd',
                          borderRadius: '5px'
                        }}
                      />
                    ) : (
                      <Alert variant="warning">
                        QR code not generated yet.
                      </Alert>
                    )}
                  </Card.Body>
                </Card>
              </Col>
              
              <Col md={6}>
                <Card className="mb-3">
                  <Card.Header>
                    <strong>Guest Information</strong>
                  </Card.Header>
                  <Card.Body>
                    {selectedGuest.photo && (
                      <div className="text-center mb-3">
                        <img 
                          src={
                            selectedGuest.photo.startsWith('http') 
                              ? selectedGuest.photo 
                              : `http://localhost:5000/uploads/${selectedGuest.photo}`
                          }
                          alt="Guest"
                          style={{ 
                            maxWidth: '200px', 
                            maxHeight: '200px', 
                            objectFit: 'cover',
                            borderRadius: '5px'
                          }}
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                    <p><strong>Full Name:</strong> {selectedGuest.fullName}</p>
                    <p><strong>Gender:</strong> {selectedGuest.sex}</p>
                    <p><strong>Date of Birth:</strong> {new Date(selectedGuest.dateOfBirth).toLocaleDateString()}</p>
                    <p><strong>Age:</strong> {calculateAge(selectedGuest.dateOfBirth)}</p>
                    <p><strong>Address:</strong> {selectedGuest.address}</p>
                    <p><strong>Contact:</strong> {selectedGuest.contact || 'N/A'}</p>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={6}>
                <Card className="mb-3">
                  <Card.Header>
                    <strong>Visit Details</strong>
                  </Card.Header>
                  <Card.Body>
                    <p><strong>Visit Purpose:</strong> {selectedGuest.visitPurpose}</p>
                    <p><strong>Approval Date:</strong> {selectedGuest.approvedAt ? new Date(selectedGuest.approvedAt).toLocaleDateString() : 'N/A'}</p>
                  </Card.Body>
                </Card>

                {selectedGuest.violationType && (
                  <Card className="mb-3 border-danger">
                    <Card.Header className="bg-danger text-white">
                      <strong>Violation Information</strong>
                    </Card.Header>
                    <Card.Body>
                      <p><strong>Violation Type:</strong> {selectedGuest.violationType}</p>
                      <p><strong>Violation Details:</strong> {selectedGuest.violationDetails || 'No violation data'}</p>
                    </Card.Body>
                  </Card>
                )}
              </Col>
            </Row>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowViewModal(false)}>
            Close
          </Button>
          <Button variant="dark" onClick={printGuestDetails}>
            <Printer size={16} className="me-1" />
            Print
          </Button>
        </Modal.Footer>
      </Modal>

      {/* QR Code Modal */}
      <Modal show={showQRModal} onHide={() => setShowQRModal(false)} size="sm">
        <Modal.Header closeButton>
          <Modal.Title>Guest QR Code - {selectedQRGuest?.id}</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center">
          {selectedQRGuest && (
            <>
              {selectedQRGuest.qrCode ? (
                <>
                  <img 
                    src={selectedQRGuest.qrCode} 
                    alt="Guest QR Code" 
                    style={{ maxWidth: '100%', height: 'auto' }}
                  />
                  <p className="mt-3"><strong>{selectedQRGuest.fullName}</strong></p>
                  <p className="text-muted">Guest ID: {selectedQRGuest.id}</p>
                </>
              ) : (
                <Alert variant="warning">
                  QR code not generated yet.
                </Alert>
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowQRModal(false)}>
            Close
          </Button>
          <Button variant="dark" onClick={downloadQRCode} disabled={!selectedQRGuest?.qrCode}>
            <Download size={16} className="me-1" />
            Download QR
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default Guest;