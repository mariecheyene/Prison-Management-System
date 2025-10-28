import React, { useState, useEffect } from 'react';
import { 
  Container, Row, Col, Table, Button, Modal, Form, 
  Alert, Badge, Spinner, InputGroup, Card, ButtonGroup 
} from 'react-bootstrap';
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import axios from "axios";
import { 
  Search, 
  Plus, 
  Eye, 
  Download,
  Upload,
  Printer,
  User,
  Grid,
  Clock,
  Calendar
} from 'react-feather';

const ViewVisitorFemaleDivision = () => {
  const [visitors, setVisitors] = useState([]);
  const [filteredVisitors, setFilteredVisitors] = useState([]);
  const [inmates, setInmates] = useState([]);
  const [femaleInmates, setFemaleInmates] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedVisitor, setSelectedVisitor] = useState(null);
  const [selectedQRVisitor, setSelectedQRVisitor] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchBy, setSearchBy] = useState('lastName');
  const [csvFile, setCsvFile] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [prisonerIdSuggestions, setPrisonerIdSuggestions] = useState([]);
  const [prisonerIdInput, setPrisonerIdInput] = useState('');

  const searchOptions = [
    { value: 'lastName', label: 'Last Name' },
    { value: 'firstName', label: 'First Name' },
    { value: 'id', label: 'Visitor ID' },
    { value: 'prisonerId', label: 'Prisoner ID' },
    { value: 'relationship', label: 'Relationship' },
    { value: 'status', label: 'Status' }
  ];

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
    prisonerId: '',
    relationship: '',
    status: 'pending' // Staff requests go to pending
  });

  useEffect(() => {
    const fetchData = async () => {
      await fetchInmates();
      await fetchVisitors();
    };
    fetchData();
  }, []);

  useEffect(() => {
    filterVisitors();
  }, [searchQuery, searchBy, visitors, femaleInmates]);

  const fetchVisitors = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get("http://localhost:5000/visitors");
      setVisitors(response.data);
    } catch (error) {
      console.error("Error fetching visitors:", error);
      toast.error("Failed to fetch visitors");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchInmates = async () => {
    try {
      const response = await axios.get("http://localhost:5000/inmates");
      setInmates(response.data);
      // Filter only female inmates for suggestions
      const femaleInmates = response.data.filter(inmate => 
        inmate.gender?.toLowerCase() === 'female' || inmate.sex?.toLowerCase() === 'female'
      );
      setFemaleInmates(femaleInmates);
    } catch (error) {
      console.error('Error fetching inmates:', error);
      toast.error('Failed to fetch inmates');
    }
  };

  const filterVisitors = () => {
    let filtered = visitors;

    // FIRST: Filter visitors to only show those connected to female inmates
    if (femaleInmates.length > 0) {
      const femaleInmateCodes = femaleInmates.map(inmate => inmate.inmateCode);
      filtered = filtered.filter(visitor => 
        femaleInmateCodes.includes(visitor.prisonerId)
      );
    }

    // SECOND: Apply search filter if there's a search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(visitor => {
        const value = visitor[searchBy]?.toString().toLowerCase() || '';
        return value.includes(query);
      });
    }
    
    // THIRD: Sort alphabetically by last name, then first name
    filtered = filtered.sort((a, b) => {
      const lastNameCompare = a.lastName.localeCompare(b.lastName);
      if (lastNameCompare !== 0) {
        return lastNameCompare;
      }
      return a.firstName.localeCompare(b.firstName);
    });
    
    setFilteredVisitors(filtered);
  };

  const handlePrisonerIdChange = (e) => {
    const value = e.target.value;
    setPrisonerIdInput(value);
    
    // Filter suggestions based on input - ONLY FEMALE INMATES
    if (value.trim()) {
      const filtered = femaleInmates.filter(inmate => 
        inmate.inmateCode.toLowerCase().includes(value.toLowerCase()) ||
        inmate.fullName.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 5); // Show only top 5 suggestions
      setPrisonerIdSuggestions(filtered);
    } else {
      setPrisonerIdSuggestions([]);
    }
    
    setFormData(prev => ({
      ...prev,
      prisonerId: value
    }));
  };

  const selectPrisonerSuggestion = (inmate) => {
    setPrisonerIdInput(`${inmate.inmateCode} - ${inmate.fullName}`);
    setFormData(prev => ({
      ...prev,
      prisonerId: inmate.inmateCode
    }));
    setPrisonerIdSuggestions([]);
  };

  const handleAdd = () => {
    setPrisonerIdInput('');
    setPrisonerIdSuggestions([]);
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
      prisonerId: '',
      relationship: '',
      status: 'pending' // Staff requests go to pending
    };
    setFormData(initialData);
    setImageFile(null);
    setShowModal(true);
  };

  const handleView = (visitor) => {
    setSelectedVisitor(visitor);
    setShowViewModal(true);
  };

  const handleShowQR = async (visitor) => {
    setSelectedQRVisitor(visitor);
    setShowQRModal(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Auto-calculate age if dateOfBirth changes
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

    // Validate required fields
    if (!formData.lastName || !formData.firstName || !formData.sex || !formData.dateOfBirth || 
        !formData.address || !formData.contact || !formData.prisonerId || !formData.relationship) {
      toast.error('Please fill in all required fields');
      setIsLoading(false);
      return;
    }

    // Validate that prisoner ID belongs to a female inmate
    const selectedInmate = femaleInmates.find(inmate => inmate.inmateCode === formData.prisonerId);
    if (!selectedInmate) {
      toast.error('Please select a valid female inmate from the suggestions');
      setIsLoading(false);
      return;
    }

    try {
      const submitData = new FormData();
      
      // Format data properly
      const formattedData = {
        ...formData,
        middleName: formData.middleName || '',
        extension: formData.extension || '',
        age: formData.age || '',
        status: 'pending' // Staff requests go to pending
      };

      // Append all form data
      Object.keys(formattedData).forEach(key => {
        if (formattedData[key] !== null && formattedData[key] !== undefined) {
          submitData.append(key, formattedData[key]);
        }
      });

      // Append image file
      if (imageFile) {
        submitData.append('photo', imageFile);
      }

      // Send to pending-visitors endpoint for approval
      const response = await axios.post("http://localhost:5000/pending-visitors", submitData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      toast.success('Visitor request submitted for approval!');
      setShowModal(false);
      resetForm();
      fetchVisitors();
    } catch (error) {
      console.error('Error submitting visitor:', error);
      console.error('Error response:', error.response?.data);
      
      const errorMessage = error.response?.data?.message || 
                        error.response?.data?.error || 
                        'Failed to create visitor request';
      
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (e) => {
    setCsvFile(e.target.files[0]);
  };

  const handleCsvUpload = async () => {
    if (!csvFile) {
      toast.error('Please select a CSV file');
      return;
    }

    setIsLoading(true);
    const formData = new FormData();
    formData.append('csvFile', csvFile);

    try {
      const response = await axios.post('http://localhost:5000/visitors/upload-csv', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      toast.success(response.data.message);
      setShowUploadModal(false);
      setCsvFile(null);
      fetchVisitors();
    } catch (error) {
      console.error('Error uploading CSV:', error);
      toast.error(error.response?.data?.message || 'Failed to upload CSV');
    } finally {
      setIsLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = [
      'Visitor ID', 'Last Name', 'First Name', 'Middle Name', 'Extension',
      'Date of Birth', 'Age', 'Gender', 'Address', 'Contact',
      'Prisoner ID', 'Relationship', 'Status', 'Date Visited', 'Time In', 'Time Out',
      'Violation Type', 'Violation Details'
    ];

    const csvData = filteredVisitors.map(visitor => [
      visitor.id,
      visitor.lastName,
      visitor.firstName,
      visitor.middleName || '',
      visitor.extension || '',
      visitor.dateOfBirth ? new Date(visitor.dateOfBirth).toLocaleDateString() : '',
      visitor.age || '',
      visitor.sex,
      visitor.address,
      visitor.contact,
      visitor.prisonerId,
      visitor.relationship,
      visitor.status,
      visitor.dateVisited ? new Date(visitor.dateVisited).toLocaleDateString() : 'Not visited',
      visitor.timeIn || 'Not recorded',
      visitor.timeOut || 'Not recorded',
      visitor.violationType || 'No violation',
      visitor.violationDetails || 'No violation data'
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `female_division_visitors_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
    
    toast.success(`Exported ${filteredVisitors.length} female division visitors to CSV`);
  };

  const downloadQRCode = () => {
    if (!selectedQRVisitor?.qrCode) return;
    
    const link = document.createElement('a');
    link.href = selectedQRVisitor.qrCode;
    link.download = `visitor-qr-${selectedQRVisitor.id}.png`;
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
      prisonerId: '',
      relationship: '',
      status: 'pending'
    });
    setPrisonerIdInput('');
    setPrisonerIdSuggestions([]);
    setImageFile(null);
  };

  const getStatusVariant = (status) => {
    switch (status) {
      case 'approved': return 'success';
      case 'pending': return 'warning';
      case 'rejected': return 'danger';
      default: return 'secondary';
    }
  };

  const getViolationVariant = (visitor) => {
    if (visitor.violationType && visitor.violationType.trim() !== '') {
      return 'danger';
    }
    return 'success';
  };

  const getViolationText = (visitor) => {
    if (visitor.violationType && visitor.violationType.trim() !== '') {
      return visitor.violationType;
    }
    return 'No violation';
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

  const getTimeStatus = (visitor) => {
    if (!visitor.hasTimedIn) return { variant: 'secondary', text: 'Not Checked In' };
    if (visitor.hasTimedIn && !visitor.hasTimedOut) return { variant: 'success', text: 'Checked In' };
    if (visitor.hasTimedIn && visitor.hasTimedOut) return { variant: 'info', text: 'Checked Out' };
    return { variant: 'secondary', text: 'Unknown' };
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

  const printVisitorDetails = () => {
    const printWindow = window.open('', '_blank');
    const timeStatus = getTimeStatus(selectedVisitor);
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Visitor Details - ${selectedVisitor?.id}</title>
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
            .header h1 {
              margin: 0;
              font-size: 24px;
              font-weight: bold;
              color: #2c3e50;
            }
            .header h2 {
              margin: 5px 0 0 0;
              font-size: 18px;
              font-weight: normal;
              color: #2c3e50;
            }
            .header h3 {
              margin: 10px 0 0 0;
              font-size: 16px;
              font-weight: bold;
              color: #2c3e50;
            }
            .division-badge {
              background-color: #e83e8c;
              color: white;
              padding: 5px 10px;
              border-radius: 4px;
              font-weight: bold;
              margin-left: 10px;
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
            .visitor-photo {
              text-align: center;
              margin: 20px 0;
            }
            .visitor-photo img {
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
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>LANAO DEL NORTE DISTRICT JAIL</h1>
            <h2>Region 10 - <span class="division-badge">FEMALE DIVISION</span></h2>
            <h3>VISITOR DETAILS RECORD - ID: ${selectedVisitor?.id}</h3>
          </div>
          
          ${selectedVisitor ? `
            <div class="section">
              <h3>Time Tracking Information</h3>
              <div class="info-grid">
                <div class="info-item">
                  <span class="label">Visit Date:</span> ${selectedVisitor.dateVisited ? new Date(selectedVisitor.dateVisited).toLocaleDateString() : 'Not yet visited'}
                </div>
                <div class="info-item">
                  <span class="label">Time In:</span> ${selectedVisitor.timeIn || 'Not recorded'}
                </div>
                <div class="info-item">
                  <span class="label">Time Out:</span> ${selectedVisitor.timeOut || 'Not recorded'}
                </div>
                <div class="info-item">
                  <span class="label">Time Status:</span> 
                  <span class="time-status status-${timeStatus.variant}">${timeStatus.text}</span>
                </div>
              </div>
            </div>

            <div class="section">
              <h3>Identification</h3>
              <div class="photo-container">
                ${selectedVisitor.photo ? `
                  <div class="photo-item">
                    <h4>Visitor Photo</h4>
                    <div class="visitor-photo">
                      <img src="http://localhost:5000/uploads/${selectedVisitor.photo}" alt="Visitor Photo" />
                    </div>
                  </div>
                ` : ''}
                ${selectedVisitor.qrCode ? `
                  <div class="photo-item">
                    <h4>QR Code</h4>
                    <div class="qr-code">
                      <img src="${selectedVisitor.qrCode}" alt="Visitor QR Code" />
                    </div>
                  </div>
                ` : ''}
              </div>
            </div>

            <div class="section">
              <h3>Visitor Information</h3>
              <div class="info-grid">
                <div class="info-item">
                  <span class="label">Full Name:</span> ${selectedVisitor.fullName}
                </div>
                <div class="info-item">
                  <span class="label">Gender:</span> ${selectedVisitor.sex}
                </div>
                <div class="info-item">
                  <span class="label">Date of Birth:</span> ${new Date(selectedVisitor.dateOfBirth).toLocaleDateString()}
                </div>
                <div class="info-item">
                  <span class="label">Age:</span> ${calculateAge(selectedVisitor.dateOfBirth)}
                </div>
                <div class="info-item full-width">
                  <span class="label">Address:</span> ${selectedVisitor.address}
                </div>
                <div class="info-item">
                  <span class="label">Contact:</span> ${selectedVisitor.contact || 'N/A'}
                </div>
                <div class="info-item">
                  <span class="label">Status:</span> ${selectedVisitor.status.toUpperCase()}
                </div>
              </div>
            </div>

            <div class="section">
              <h3>Visit Details</h3>
              <div class="info-grid">
                <div class="info-item">
                  <span class="label">Prisoner ID:</span> ${selectedVisitor.prisonerId}
                </div>
                <div class="info-item">
                  <span class="label">Relationship:</span> ${selectedVisitor.relationship}
                </div>
                <div class="info-item">
                  <span class="label">Division:</span> <strong>FEMALE DIVISION</strong>
                </div>
              </div>
            </div>

            ${selectedVisitor.violationType ? `
            <div class="section">
              <h3>Violation Information</h3>
              <div class="violation">
                <div class="info-item">
                  <span class="label">Violation Type:</span> ${selectedVisitor.violationType}
                </div>
                <div class="info-item full-width">
                  <span class="label">Violation Details:</span> ${selectedVisitor.violationDetails || 'No violation data'}
                </div>
              </div>
            </div>
            ` : ''}

            <div class="section">
              <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
                <p>Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
              </div>
            </div>
          ` : ''}
        </body>
      </html>
    `);
    printWindow.document.close();
    
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
            👥 Female Division Visitors Management
          </h2>
          <Badge bg="pink" className="mb-2" text="dark">
            Female Division Staff Access
          </Badge>
          <div className="text-muted small">
            Only showing visitors connected to female inmates
          </div>
        </div>
        <div className="d-flex gap-2">
          <Button variant="outline-dark" size="sm" onClick={exportToCSV}>
            <Download size={16} className="me-1" />
            Export CSV
          </Button>
          <Button variant="dark" onClick={handleAdd}>
            <Plus size={16} className="me-1" />
            Request New Visitor
          </Button>
        </div>
      </div>

      {/* Search Section */}
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
                  placeholder="Search female division visitors..."
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
                {filteredVisitors.length} female division visitors found
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {isLoading && visitors.length === 0 ? (
        <div className="text-center">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading female division visitors...</span>
          </Spinner>
        </div>
      ) : filteredVisitors.length === 0 ? (
        <Alert variant="info">
          {searchQuery ? 'No female division visitors found matching your search.' : 'No female division visitors found. Add your first visitor to get started.'}
        </Alert>
      ) : (
        <Table striped bordered hover responsive className="bg-white">
          <thead className="table-dark">
            <tr>
              <th>Visitor ID</th>
              <th>Full Name</th>
              <th>Gender</th>
              <th>Prisoner ID</th>
              <th>Relationship</th>
              <th>Last Visit Date</th>
              <th>Time Status</th>
              <th>Violation Type</th>
              <th style={{ width: '80px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredVisitors.map(visitor => (
              <tr key={visitor._id}>
                <td><strong>{visitor.id}</strong></td>
                <td>{visitor.fullName}</td>
                <td>{visitor.sex}</td>
                <td>{visitor.prisonerId}</td>
                <td>{visitor.relationship}</td>
                <td>
                  {visitor.dateVisited ? (
                    <Badge bg="info">
                      {formatDate(visitor.dateVisited)}
                    </Badge>
                  ) : (
                    <Badge bg="secondary">Not visited</Badge>
                  )}
                </td>
                <td>
                  <Badge bg={getTimeStatus(visitor).variant}>
                    {getTimeStatus(visitor).text}
                  </Badge>
                </td>
                <td>
                  <Badge bg={getViolationVariant(visitor)}>
                    {getViolationText(visitor)}
                  </Badge>
                </td>
                <td>
                  <div className="d-flex gap-1">
                    <Button 
                      variant="outline-primary" 
                      size="sm" 
                      onClick={() => handleShowQR(visitor)}
                      className="p-1"
                      title="QR Code"
                    >
                      <Grid size={14} />
                    </Button>
                    <Button 
                      variant="outline-info" 
                      size="sm" 
                      onClick={() => handleView(visitor)}
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

      {/* Add Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Request New Visitor - Female Division</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            <Alert variant="info" className="mb-3">
              <strong>Note:</strong> This form is for requesting visitors to <strong>Female Division inmates only</strong>.
              All requests will be submitted for approval.
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

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Prisoner ID * <Badge bg="pink" text="dark">Female Division Only</Badge></Form.Label>
                  <Form.Control
                    type="text"
                    value={prisonerIdInput}
                    onChange={handlePrisonerIdChange}
                    required
                    placeholder="Search female inmates by ID or name"
                  />
                  {prisonerIdSuggestions.length > 0 && (
                    <div className="border mt-1" style={{ maxHeight: '150px', overflowY: 'auto' }}>
                      {prisonerIdSuggestions.map(inmate => (
                        <div
                          key={inmate._id}
                          className="p-2 border-bottom hover-bg"
                          style={{ cursor: 'pointer' }}
                          onClick={() => selectPrisonerSuggestion(inmate)}
                        >
                          <strong>{inmate.inmateCode}</strong> - {inmate.fullName}
                          <Badge bg="pink" text="dark" className="ms-2">Female</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                  <Form.Text className="text-muted">
                    Only female division inmates will appear in search results
                  </Form.Text>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Relationship *</Form.Label>
                  <Form.Control
                    type="text"
                    name="relationship"
                    value={formData.relationship}
                    onChange={handleInputChange}
                    required
                    placeholder="e.g., Spouse, Parent, Friend"
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Visitor Photo</Form.Label>
              <Form.Control
                type="file"
                accept="image/*"
                onChange={handleImageChange}
              />
              <Form.Text className="text-muted">
                Upload visitor's photo for identification
              </Form.Text>
            </Form.Group>

            <Alert variant="info" className="mt-3">
              <strong>Note:</strong> All visitor requests will be submitted for approval.
              Once approved, a unique QR code will be generated for time-in/time-out tracking.
              Visitors can only be connected to female division inmates.
            </Alert>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button variant="dark" type="submit" disabled={isLoading}>
              {isLoading ? <Spinner size="sm" /> : 'Request Visitor'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* View Modal */}
      <Modal show={showViewModal} onHide={() => setShowViewModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            Visitor Details - {selectedVisitor?.id} 
            <Badge bg="pink" text="dark" className="ms-2">Female Division</Badge>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedVisitor && (
            <Row>
              <Col md={12}>
                <Card className="mb-4">
                  <Card.Header>
                    <strong>Time Tracking Information</strong>
                  </Card.Header>
                  <Card.Body>
                    <Row>
                      <Col md={6}>
                        <p><strong>Visit Date:</strong> {selectedVisitor.dateVisited ? new Date(selectedVisitor.dateVisited).toLocaleDateString() : 'Not yet visited'}</p>
                        <p><strong>Time In:</strong> {selectedVisitor.timeIn || 'Not recorded'}</p>
                      </Col>
                      <Col md={6}>
                        <p><strong>Time Out:</strong> {selectedVisitor.timeOut || 'Not recorded'}</p>
                        <p><strong>Time Status:</strong> <Badge bg={getTimeStatus(selectedVisitor).variant}>{getTimeStatus(selectedVisitor).text}</Badge></p>
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
                    {selectedVisitor.qrCode ? (
                      <img 
                        src={selectedVisitor.qrCode} 
                        alt="Visitor QR Code" 
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
                    <strong>Visitor Information</strong>
                  </Card.Header>
                  <Card.Body>
                    {selectedVisitor.photo && (
                      <div className="text-center mb-3">
                        <img 
                          src={`http://localhost:5000/uploads/${selectedVisitor.photo}`}
                          alt="Visitor"
                          style={{ 
                            maxWidth: '200px', 
                            maxHeight: '200px', 
                            objectFit: 'cover',
                            borderRadius: '5px'
                          }}
                        />
                      </div>
                    )}
                    <p><strong>Full Name:</strong> {selectedVisitor.fullName}</p>
                    <p><strong>Gender:</strong> {selectedVisitor.sex}</p>
                    <p><strong>Date of Birth:</strong> {new Date(selectedVisitor.dateOfBirth).toLocaleDateString()}</p>
                    <p><strong>Age:</strong> {calculateAge(selectedVisitor.dateOfBirth)}</p>
                    <p><strong>Address:</strong> {selectedVisitor.address}</p>
                    <p><strong>Contact:</strong> {selectedVisitor.contact || 'N/A'}</p>
                    <p><strong>Status:</strong> <Badge bg={getStatusVariant(selectedVisitor.status)}>{selectedVisitor.status}</Badge></p>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={6}>
                <Card className="mb-3">
                  <Card.Header>
                    <strong>Visit Details</strong>
                    <Badge bg="pink" text="dark" className="ms-2">Female Division</Badge>
                  </Card.Header>
                  <Card.Body>
                    <p><strong>Prisoner ID:</strong> {selectedVisitor.prisonerId}</p>
                    <p><strong>Relationship:</strong> {selectedVisitor.relationship}</p>
                    <p><strong>Division:</strong> <Badge bg="pink" text="dark">Female Division</Badge></p>
                  </Card.Body>
                </Card>
                
                {selectedVisitor.violationType && (
                  <Card className="mb-3 border-danger">
                    <Card.Header className="bg-danger text-white">
                      <strong>Violation Information</strong>
                    </Card.Header>
                    <Card.Body>
                      <p><strong>Violation Type:</strong> {selectedVisitor.violationType}</p>
                      <p><strong>Violation Details:</strong> {selectedVisitor.violationDetails || 'No violation data'}</p>
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
          <Button variant="dark" onClick={printVisitorDetails}>
            <Printer size={16} className="me-1" />
            Print
          </Button>
        </Modal.Footer>
      </Modal>

      {/* QR Code Modal */}
      <Modal show={showQRModal} onHide={() => setShowQRModal(false)} size="sm">
        <Modal.Header closeButton>
          <Modal.Title>
            Visitor QR Code - {selectedQRVisitor?.id}
            <Badge bg="pink" text="dark" className="ms-2">Female</Badge>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center">
          {selectedQRVisitor && (
            <>
              {selectedQRVisitor.qrCode ? (
                <>
                  <img 
                    src={selectedQRVisitor.qrCode} 
                    alt="Visitor QR Code" 
                    style={{ maxWidth: '100%', height: 'auto' }}
                  />
                  <p className="mt-3"><strong>{selectedQRVisitor.fullName}</strong></p>
                  <p className="text-muted">Visitor ID: {selectedQRVisitor.id}</p>
                  <Badge bg="pink" text="dark">Female Division Visitor</Badge>
                </>
              ) : (
                <Alert variant="warning">
                  QR code not generated yet. Please wait or regenerate QR code.
                </Alert>
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowQRModal(false)}>
            Close
          </Button>
          <Button variant="dark" onClick={downloadQRCode} disabled={!selectedQRVisitor?.qrCode}>
            <Download size={16} className="me-1" />
            Download QR
          </Button>
        </Modal.Footer>
      </Modal>

      {/* CSV Upload Modal */}
      <Modal show={showUploadModal} onHide={() => setShowUploadModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Import Visitors from CSV - Female Division</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="info" className="mb-3">
            <strong>Note:</strong> CSV imports will only process visitors for female division inmates.
            Prisoner IDs must belong to female inmates.
          </Alert>
          <Form.Group>
            <Form.Label>Select CSV File</Form.Label>
            <Form.Control
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
            />
            <Form.Text className="text-muted">
              CSV should include columns: lastName, firstName, middleName, extension, dateOfBirth, sex, address, contact, prisonerId, relationship
            </Form.Text>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowUploadModal(false)}>
            Cancel
          </Button>
          <Button variant="dark" onClick={handleCsvUpload} disabled={!csvFile || isLoading}>
            {isLoading ? <Spinner size="sm" /> : 'Upload CSV'}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default ViewVisitorFemaleDivision;