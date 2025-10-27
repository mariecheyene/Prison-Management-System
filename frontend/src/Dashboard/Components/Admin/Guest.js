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
  Edit2, 
  Trash2, 
  Download,
  Upload,
  Printer,
  User,
  Grid
} from 'react-feather';

const Guest = () => {
  const [guests, setGuests] = useState([]);
  const [filteredGuests, setFilteredGuests] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingGuest, setEditingGuest] = useState(null);
  const [selectedGuest, setSelectedGuest] = useState(null);
  const [selectedQRGuest, setSelectedQRGuest] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchBy, setSearchBy] = useState('lastName');
  const [imageFile, setImageFile] = useState(null);
  const [importFile, setImportFile] = useState(null);
  const [importProgress, setImportProgress] = useState(0);
  const [isImporting, setIsImporting] = useState(false);

  const searchOptions = [
    { value: 'lastName', label: 'Last Name' },
    { value: 'firstName', label: 'First Name' },
    { value: 'id', label: 'Guest ID' },
    { value: 'visitPurpose', label: 'Visit Purpose' },
    { value: 'violationType', label: 'Violation Type' }
  ];

  // Define the functions that were causing ESLint errors
  const exportToCSV = () => {
    const headers = [
      'Guest ID', 'Last Name', 'First Name', 'Middle Name', 'Extension',
      'Date of Birth', 'Age', 'Gender', 'Address', 'Contact',
      'Visit Purpose', 'Status', 'Violation Type', 'Violation Details', 'Date Visited', 'Time In', 'Time Out'
    ];

    const csvData = guests.map(guest => [
      guest.id,
      guest.lastName,
      guest.firstName,
      guest.middleName || '',
      guest.extension || '',
      guest.dateOfBirth ? new Date(guest.dateOfBirth).toLocaleDateString() : '',
      guest.age || '',
      guest.sex,
      guest.address,
      guest.contact,
      guest.visitPurpose,
      guest.status || 'approved',
      guest.violationType || 'No violation',
      guest.violationDetails || 'No violation data',
      guest.dateVisited ? new Date(guest.dateVisited).toLocaleDateString() : 'Not visited',
      guest.timeIn || 'Not recorded',
      guest.timeOut || 'Not recorded'
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `guests_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
    
    toast.success(`Exported ${guests.length} guests to CSV`);
  };

  const downloadTemplate = () => {
    const templateHeaders = [
      'lastName', 'firstName', 'middleName', 'extension', 
      'dateOfBirth', 'sex', 'address', 'contact', 'visitPurpose'
    ];

    const templateData = [
      templateHeaders,
      ['Doe', 'John', 'Michael', 'Jr', '1990-05-15', 'Male', '123 Main St, City, State', '09123456789', 'Official Business'],
      ['Smith', 'Jane', 'Marie', '', '1985-08-22', 'Female', '456 Oak Ave, City, State', '09987654321', 'Meeting']
    ];

    const csvContent = templateData
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'guest_import_template.csv';
    link.click();
    window.URL.revokeObjectURL(url);
    
    toast.success('Template downloaded successfully!');
  };

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
      setGuests(response.data);
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
    setEditingGuest(null);
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
      status: 'approved'
    };
    setFormData(initialData);
    setImageFile(null);
    setShowModal(true);
  };

  const handleEdit = (guest) => {
    setEditingGuest(guest);
    const formattedGuest = {
      ...guest,
      dateOfBirth: guest.dateOfBirth ? guest.dateOfBirth.split('T')[0] : ''
    };
    setFormData(formattedGuest);
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

  const handleDelete = async (guestId) => {
    if (!window.confirm('Are you sure you want to delete this guest?')) {
      return;
    }

    setIsLoading(true);
    try {
      await axios.delete(`http://localhost:5000/guests/${guestId}`);
      toast.success('Guest deleted successfully!');
      fetchGuests();
    } catch (error) {
      console.error('Error deleting guest:', error);
      toast.error('Failed to delete guest');
    } finally {
      setIsLoading(false);
    }
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
    status: 'approved'
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

  const handleImportFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        setImportFile(file);
      } else {
        toast.error('Please select a valid CSV file');
        setImportFile(null);
      }
    }
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
        status: 'approved'
      };

      Object.keys(formattedData).forEach(key => {
        if (formattedData[key] !== null && formattedData[key] !== undefined) {
          submitData.append(key, formattedData[key]);
        }
      });

      if (imageFile) {
        submitData.append('photo', imageFile);
      }

      let response;
      if (editingGuest) {
        response = await axios.put(`http://localhost:5000/guests/${editingGuest.id}`, submitData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
        toast.success('Guest updated successfully!');
      } else {
        response = await axios.post("http://localhost:5000/guests", submitData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
        toast.success('Guest created successfully! QR code has been generated.');
      }
      
      setShowModal(false);
      resetForm();
      fetchGuests();
    } catch (error) {
      console.error('Error submitting guest:', error);
      const errorMessage = error.response?.data?.message || 
                        error.response?.data?.error || 
                        `Failed to ${editingGuest ? 'update' : 'create'} guest`;
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async () => {
    if (!importFile) {
      toast.error('Please select a CSV file');
      return;
    }

    setIsImporting(true);
    const formData = new FormData();
    formData.append('csvFile', importFile);

    try {
      const response = await axios.post('http://localhost:5000/guests/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const progress = (progressEvent.loaded / progressEvent.total) * 100;
          setImportProgress(Math.round(progress));
        },
      });

      toast.success(`Successfully imported ${response.data.imported} guests!`);
      if (response.data.errors && response.data.errors.length > 0) {
        console.warn('Import errors:', response.data.errors);
        toast.warning(`${response.data.errors.length} records had errors. Check console for details.`);
      }
      
      setShowImportModal(false);
      setImportFile(null);
      setImportProgress(0);
      fetchGuests();
    } catch (error) {
      console.error('Error importing guests:', error);
      const errorMessage = error.response?.data?.message || 'Failed to import guests';
      toast.error(errorMessage);
    } finally {
      setIsImporting(false);
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
      status: 'approved'
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
    if (!guest.hasTimedIn) return { variant: 'secondary', text: 'Not Checked In' };
    if (guest.hasTimedIn && !guest.hasTimedOut) return { variant: 'success', text: 'Checked In' };
    if (guest.hasTimedIn && guest.hasTimedOut) return { variant: 'info', text: 'Checked Out' };
    return { variant: 'secondary', text: 'Unknown' };
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

  const getStatusVariant = (guest) => {
    switch (guest.status) {
      case 'approved': return 'success';
      case 'completed': return 'info';
      case 'pending': return 'warning';
      case 'rejected': return 'danger';
      default: return 'secondary';
    }
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
            .status-badge {
              display: inline-block;
              padding: 4px 8px;
              border-radius: 4px;
              color: white;
              font-weight: bold;
              margin-left: 5px;
            }
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
            <h1>LANAO DEL NORTE DISTRICT JAIL</h1>
            <h2>Region 10</h2>
            <h3>GUEST DETAILS RECORD - ID: ${selectedGuest?.id}</h3>
          </div>
          
          ${selectedGuest ? `
            <div class="section">
              <h3>Time Tracking Information</h3>
              <div class="info-grid">
                <div class="info-item">
                  <span class="label">Visit Date:</span> ${selectedGuest.dateVisited ? new Date(selectedGuest.dateVisited).toLocaleDateString() : 'Not yet visited'}
                </div>
                <div class="info-item">
                  <span class="label">Time In:</span> ${selectedGuest.timeIn || 'Not recorded'}
                </div>
                <div class="info-item">
                  <span class="label">Time Out:</span> ${selectedGuest.timeOut || 'Not recorded'}
                </div>
                <div class="info-item">
                  <span class="label">Time Status:</span> 
                  <span class="time-status status-${timeStatus.variant}">${timeStatus.text}</span>
                </div>
                <div class="info-item">
                  <span class="label">Guest Status:</span> 
                  <span class="status-badge" style="background-color: ${
                    selectedGuest.status === 'approved' ? '#28a745' :
                    selectedGuest.status === 'completed' ? '#17a2b8' :
                    selectedGuest.status === 'pending' ? '#ffc107' :
                    selectedGuest.status === 'rejected' ? '#dc3545' : '#6c757d'
                  }">${selectedGuest.status?.toUpperCase() || 'APPROVED'}</span>
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
                ${selectedGuest.approvedBy ? `
                <div class="info-item">
                  <span class="label">Approved By:</span> ${selectedGuest.approvedBy}
                </div>
                ` : ''}
                ${selectedGuest.rejectedBy ? `
                <div class="info-item">
                  <span class="label">Rejected By:</span> ${selectedGuest.rejectedBy}
                </div>
                ` : ''}
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
                <p><em>Official Document - Lanao Del Norte District Jail, Region 10</em></p>
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
            👤 Guests Management
          </h2>
          <Badge bg="info" className="mb-2">
            Admin Access
          </Badge>
        </div>
        <div className="d-flex gap-2">
          {/* Export CSV Button - First (outline-dark) */}
          <Button variant="outline-dark" size="sm" onClick={exportToCSV}>
            <Download size={16} className="me-1" />
            Export CSV
          </Button>
          {/* Import CSV Button - Second (outline-dark) */}
          <Button variant="outline-dark" size="sm" onClick={() => setShowImportModal(true)}>
            <Upload size={16} className="me-1" />
            Import CSV
          </Button>
          {/* Add Guest Button - Third (dark) */}
          <Button variant="dark" onClick={handleAdd}>
            <Plus size={16} className="me-1" />
            Add Guest
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
                {filteredGuests.length} guests found 
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
          {searchQuery ? 'No guests found matching your search.' : 'No guests found. Add your first guest to get started.'}
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
              <th style={{ width: '120px' }}>Actions</th>
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
                  {guest.dateVisited ? (
                    <Badge bg="info">
                      {formatDate(guest.dateVisited)}
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
                    <Button 
                      variant="outline-warning" 
                      size="sm" 
                      onClick={() => handleEdit(guest)}
                      className="p-1"
                      title="Edit Guest"
                    >
                      <Edit2 size={14} />
                    </Button>
                    <Button 
                      variant="outline-danger" 
                      size="sm" 
                      onClick={() => handleDelete(guest.id)}
                      className="p-1"
                      title="Delete Guest"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {/* Add/Edit Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{editingGuest ? 'Edit Guest' : 'Add New Guest'}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body style={{ maxHeight: '70vh', overflowY: 'auto' }}>
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
              <strong>Note:</strong> Guests are for official visits and don't have time limits like regular visitors.
              A unique QR code will be generated for identification and tracking purposes.
            </Alert>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button variant="dark" type="submit" disabled={isLoading}>
              {isLoading ? <Spinner size="sm" /> : (editingGuest ? 'Update' : 'Add') + ' Guest'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Import Modal */}
      <Modal show={showImportModal} onHide={() => setShowImportModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Import Guests from CSV</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group>
            <Form.Label>Select CSV File</Form.Label>
            <Form.Control
              type="file"
              accept=".csv"
              onChange={handleImportFileChange}
            />
            <Form.Text className="text-muted">
              CSV should include columns: lastName, firstName, middleName, extension, dateOfBirth, sex, address, contact, visitPurpose
            </Form.Text>
          </Form.Group>

          {isImporting && (
            <div className="mb-3 mt-3">
              <div className="d-flex justify-content-between align-items-center">
                <span>Importing guests...</span>
                <span>{importProgress}%</span>
              </div>
              <div className="progress">
                <div 
                  className="progress-bar progress-bar-striped progress-bar-animated" 
                  style={{ width: `${importProgress}%` }}
                ></div>
              </div>
            </div>
          )}

          <div className="d-flex justify-content-between align-items-center mt-4">
            <Button variant="outline-secondary" size="sm" onClick={downloadTemplate}>
              Download Template
            </Button>
            <div className="text-muted small">
              Need help with the format?
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowImportModal(false)}>
            Cancel
          </Button>
          <Button variant="dark" onClick={handleImport} disabled={!importFile || isImporting}>
            {isImporting ? (
              <>
                <Spinner size="sm" className="me-2" />
                Importing...
              </>
            ) : (
              <>
                <Upload size={16} className="me-1" />
                Import CSV
              </>
            )}
          </Button>
        </Modal.Footer>
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
                        <p><strong>Visit Date:</strong> {selectedGuest.dateVisited ? new Date(selectedGuest.dateVisited).toLocaleDateString() : 'Not yet visited'}</p>
                        <p><strong>Time In:</strong> {selectedGuest.timeIn || 'Not recorded'}</p>
                      </Col>
                      <Col md={6}>
                        <p><strong>Time Out:</strong> {selectedGuest.timeOut || 'Not recorded'}</p>
                        <p><strong>Time Status:</strong> <Badge bg={getTimeStatus(selectedGuest).variant}>{getTimeStatus(selectedGuest).text}</Badge></p>
                        <p><strong>Guest Status:</strong> <Badge bg={getStatusVariant(selectedGuest)}>{selectedGuest.status?.toUpperCase() || 'APPROVED'}</Badge></p>
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
                    <p><strong>Status:</strong> <Badge bg={getStatusVariant(selectedGuest)}>{selectedGuest.status?.toUpperCase() || 'APPROVED'}</Badge></p>
                    {selectedGuest.approvedBy && (
                      <p><strong>Approved By:</strong> {selectedGuest.approvedBy}</p>
                    )}
                    {selectedGuest.rejectedBy && (
                      <p><strong>Rejected By:</strong> {selectedGuest.rejectedBy}</p>
                    )}
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
                  <Badge bg={getStatusVariant(selectedQRGuest)}>
                    Status: {selectedQRGuest.status?.toUpperCase() || 'APPROVED'}
                  </Badge>
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