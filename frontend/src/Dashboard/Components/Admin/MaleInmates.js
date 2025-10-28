import React, { useState, useEffect } from 'react';
import { 
  Container, Row, Col, Table, Button, Modal, Form, 
  Alert, Badge, Spinner, InputGroup, Card, ButtonGroup,
  ListGroup
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
  ChevronLeft,
  ChevronRight,
  User,
  X
} from 'react-feather';

const MaleInmates = () => {
  const [inmates, setInmates] = useState([]);
  const [filteredInmates, setFilteredInmates] = useState([]);
  const [crimes, setCrimes] = useState([]);
  const [filteredCrimes, setFilteredCrimes] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [editingInmate, setEditingInmate] = useState(null);
  const [selectedInmate, setSelectedInmate] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchBy, setSearchBy] = useState('lastName');
  const [csvFile, setCsvFile] = useState(null);
  const [imageFiles, setImageFiles] = useState({
    frontImage: null,
    backImage: null,
    leftImage: null,
    rightImage: null
  });
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [crimeSearch, setCrimeSearch] = useState('');
  const [showCrimeDropdown, setShowCrimeDropdown] = useState(false);

  const searchOptions = [
    { value: 'lastName', label: 'Last Name' },
    { value: 'firstName', label: 'First Name' },
    { value: 'inmateCode', label: 'Inmate Code' },
    { value: 'cellId', label: 'Cell ID' },
    { value: 'crime', label: 'Crime' },
    { value: 'status', label: 'Status' }
  ];

  useEffect(() => {
    fetchInmates();
    fetchCrimes();
  }, []);

  useEffect(() => {
    filterInmates();
  }, [searchQuery, searchBy, inmates]);

  useEffect(() => {
    // Filter crimes based on search input
    if (crimeSearch.trim() === '') {
      setFilteredCrimes(crimes.filter(crime => crime.status === 'active').slice(0, 10)); // Show first 10 when empty
    } else {
      const filtered = crimes.filter(crime => 
        crime.status === 'active' && 
        crime.crime.toLowerCase().includes(crimeSearch.toLowerCase())
      );
      setFilteredCrimes(filtered.slice(0, 10)); // Limit to 10 results
    }
  }, [crimeSearch, crimes]);

  const fetchInmates = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get("http://localhost:5000/inmates");
      // Filter only male inmates
      const maleInmates = response.data.filter(inmate => 
        inmate.sex?.toLowerCase() === 'male'
      );
      setInmates(maleInmates);
    } catch (error) {
      console.error("Error fetching inmates:", error);
      toast.error("Failed to fetch inmates");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCrimes = async () => {
    try {
      const response = await axios.get("http://localhost:5000/crimes");
      setCrimes(response.data);
    } catch (error) {
      console.error('Error fetching crimes:', error);
      toast.error('Failed to fetch crimes');
    }
  };

  const filterInmates = () => {
    let filtered = inmates;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(inmate => {
        const value = inmate[searchBy]?.toString().toLowerCase() || '';
        return value.includes(query);
      });
    }
    
    setFilteredInmates(filtered);
  };

  const handleAdd = () => {
    setEditingInmate(null);
    const initialData = {
      lastName: '',
      firstName: '',
      middleName: '',
      extension: '',
      sex: 'Male', // Default to Male and locked
      dateOfBirth: '',
      address: '',
      maritalStatus: '',
      eyeColor: '',
      complexion: '',
      cellId: '',
      sentence: '',
      dateFrom: '',
      dateTo: '',
      crime: '',
      emergencyName: '',
      emergencyContact: '',
      emergencyRelation: '',
      status: 'active'
    };
    setFormData(initialData);
    setImageFiles({
      frontImage: null,
      backImage: null,
      leftImage: null,
      rightImage: null
    });
    setCrimeSearch('');
    setShowCrimeDropdown(false);
    setShowModal(true);
  };

  const handleEdit = (inmate) => {
    setEditingInmate(inmate);
    const formattedInmate = {
      ...inmate,
      dateOfBirth: inmate.dateOfBirth ? inmate.dateOfBirth.split('T')[0] : '',
      dateFrom: inmate.dateFrom ? inmate.dateFrom.split('T')[0] : '',
      dateTo: inmate.dateTo ? inmate.dateTo.split('T')[0] : ''
    };
    setFormData(formattedInmate);
    setCrimeSearch(inmate.crime || '');
    setShowCrimeDropdown(false);
    setShowModal(true);
  };

  const handleView = (inmate) => {
    setSelectedInmate(inmate);
    setCurrentImageIndex(0);
    setShowViewModal(true);
  };

  const handleDelete = async (inmateCode) => {
    if (!window.confirm('Are you sure you want to delete this inmate?')) {
      return;
    }

    setIsLoading(true);
    try {
      await axios.delete(`http://localhost:5000/inmates/${inmateCode}`);
      toast.success('Inmate deleted successfully!');
      fetchInmates();
    } catch (error) {
      console.error('Error deleting inmate:', error);
      toast.error('Failed to delete inmate');
    } finally {
      setIsLoading(false);
    }
  };

  const [formData, setFormData] = useState({
    lastName: '',
    firstName: '',
    middleName: '',
    extension: '',
    sex: 'Male', // Default to Male
    dateOfBirth: '',
    address: '',
    maritalStatus: '',
    eyeColor: '',
    complexion: '',
    cellId: '',
    sentence: '',
    dateFrom: '',
    dateTo: '',
    crime: '',
    emergencyName: '',
    emergencyContact: '',
    emergencyRelation: '',
    status: 'active'
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCrimeSearchChange = (e) => {
    const value = e.target.value;
    setCrimeSearch(value);
    setFormData(prev => ({
      ...prev,
      crime: value
    }));
    setShowCrimeDropdown(true);
  };

  const handleCrimeSelect = (crimeName) => {
    setFormData(prev => ({
      ...prev,
      crime: crimeName
    }));
    setCrimeSearch(crimeName);
    setShowCrimeDropdown(false);
  };

  const clearCrimeSelection = () => {
    setFormData(prev => ({
      ...prev,
      crime: ''
    }));
    setCrimeSearch('');
    setShowCrimeDropdown(false);
  };

  const handleImageChange = (e, imageType) => {
    const file = e.target.files[0];
    setImageFiles(prev => ({
      ...prev,
      [imageType]: file
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    // Validate required fields
    if (!formData.lastName || !formData.firstName || !formData.sex || !formData.dateOfBirth || !formData.address || !formData.cellId || !formData.crime) {
      toast.error('Please fill in all required fields');
      setIsLoading(false);
      return;
    }

    try {
      const submitData = new FormData();
      
      // Format dates properly and handle empty values
      const formattedData = {
        ...formData,
        // Ensure empty strings for optional fields
        middleName: formData.middleName || '',
        extension: formData.extension || '',
        maritalStatus: formData.maritalStatus || '',
        eyeColor: formData.eyeColor || '',
        complexion: formData.complexion || '',
        sentence: formData.sentence || '',
        emergencyName: formData.emergencyName || '',
        emergencyContact: formData.emergencyContact || '',
        emergencyRelation: formData.emergencyRelation || '',
        // Handle date fields - set to null if empty
        dateFrom: formData.dateFrom || null,
        dateTo: formData.dateTo || null,
        // Force male gender
        sex: 'Male'
      };

      // Append all form data
      Object.keys(formattedData).forEach(key => {
        if (formattedData[key] !== null && formattedData[key] !== undefined) {
          submitData.append(key, formattedData[key]);
        }
      });

      // Append image files
      Object.keys(imageFiles).forEach(key => {
        if (imageFiles[key]) {
          submitData.append(key, imageFiles[key]);
        }
      });

      console.log("📤 Submitting male inmate data...");

      let response;
      if (editingInmate) {
        response = await axios.put(`http://localhost:5000/inmates/${editingInmate.inmateCode}`, submitData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
        toast.success('Male inmate updated successfully!');
      } else {
        response = await axios.post("http://localhost:5000/inmates", submitData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
        toast.success('Male inmate created successfully!');
      }
      
      setShowModal(false);
      resetForm();
      fetchInmates();
    } catch (error) {
      console.error('Error submitting inmate:', error);
      console.error('Error response:', error.response?.data);
      
      // Show more detailed error message
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          `Failed to ${editingInmate ? 'update' : 'create'} inmate`;
      
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
      const response = await axios.post('http://localhost:5000/inmates/upload-csv', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      toast.success(response.data.message);
      setShowUploadModal(false);
      setCsvFile(null);
      fetchInmates();
    } catch (error) {
      console.error('Error uploading CSV:', error);
      toast.error(error.response?.data?.message || 'Failed to upload CSV');
    } finally {
      setIsLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = [
      'Inmate Code', 'Last Name', 'First Name', 'Middle Name', 'Extension',
      'Sex', 'Date of Birth', 'Address', 'Marital Status', 'Eye Color',
      'Complexion', 'Cell ID', 'Sentence', 'Date From', 'Date To', 'Crime',
      'Emergency Name', 'Emergency Contact', 'Emergency Relation', 'Status'
    ];

    const csvData = inmates.map(inmate => [
      inmate.inmateCode,
      inmate.lastName,
      inmate.firstName,
      inmate.middleName || '',
      inmate.extension || '',
      inmate.sex,
      inmate.dateOfBirth ? new Date(inmate.dateOfBirth).toLocaleDateString() : '',
      inmate.address,
      inmate.maritalStatus || '',
      inmate.eyeColor || '',
      inmate.complexion || '',
      inmate.cellId,
      inmate.sentence || '',
      inmate.dateFrom ? new Date(inmate.dateFrom).toLocaleDateString() : '',
      inmate.dateTo ? new Date(inmate.dateTo).toLocaleDateString() : '',
      inmate.crime,
      inmate.emergencyName || '',
      inmate.emergencyContact || '',
      inmate.emergencyRelation || '',
      inmate.status
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `male_inmates_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
    
    toast.success(`Exported ${inmates.length} male inmates to CSV`);
  };

  const resetForm = () => {
    setFormData({
      lastName: '',
      firstName: '',
      middleName: '',
      extension: '',
      sex: 'Male', // Reset to Male
      dateOfBirth: '',
      address: '',
      maritalStatus: '',
      eyeColor: '',
      complexion: '',
      cellId: '',
      sentence: '',
      dateFrom: '',
      dateTo: '',
      crime: '',
      emergencyName: '',
      emergencyContact: '',
      emergencyRelation: '',
      status: 'active'
    });
    setImageFiles({
      frontImage: null,
      backImage: null,
      leftImage: null,
      rightImage: null
    });
    setCrimeSearch('');
    setShowCrimeDropdown(false);
  };

  const getGenderTitle = () => {
    return 'Male Inmates Management';
  };

  const getStatusVariant = (status) => {
    switch (status) {
      case 'active': return 'danger';
      case 'released': return 'success';
      case 'transferred': return 'warning';
      case 'inactive': return 'secondary';
      default: return 'secondary';
    }
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

  const getAvailableImages = (inmate) => {
    const images = [];
    if (inmate.frontImage) images.push({ type: 'Front', src: inmate.frontImage });
    if (inmate.backImage) images.push({ type: 'Back', src: inmate.backImage });
    if (inmate.leftImage) images.push({ type: 'Left Side', src: inmate.leftImage });
    if (inmate.rightImage) images.push({ type: 'Right Side', src: inmate.rightImage });
    return images;
  };

  const nextImage = () => {
    const images = getAvailableImages(selectedInmate);
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    const images = getAvailableImages(selectedInmate);
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const printInmateDetails = () => {
  const printWindow = window.open('', '_blank');
  const images = getAvailableImages(selectedInmate);
  
  const imageHTML = images.length > 0 ? `
    <div class="section">
      <h3>Inmate Photos</h3>
      <div style="display: flex; flex-wrap: wrap; gap: 10px; margin-top: 15px;">
        ${images.map(img => `
          <div style="text-align: center; flex: 1; min-width: 200px;">
            <div style="font-weight: bold; margin-bottom: 5px;">${img.type}</div>
            <img 
              src="http://localhost:5000/uploads/${img.src}" 
              alt="${img.type}" 
              style="max-width: 100%; height: 150px; object-fit: cover; border: 1px solid #ddd;"
              onload="window.print()"
            />
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';

  printWindow.document.write(`
    <html>
      <head>
        <title>Male Inmate Details - ${selectedInmate?.inmateCode}</title>
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
          @media print {
            body { margin: 10px; }
            .section { border: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>LANAO DEL NORTE DISTRICT JAIL - MALE DIVISION</h1>
          <h2>Region 10</h2>
          <h3>MALE INMATE DETAILS RECORD - ID: ${selectedInmate?.inmateCode}</h3>
        </div>
        
        ${selectedInmate ? `
          ${imageHTML}
          
          <div class="section">
            <h3>Personal Information</h3>
            <div class="info-grid">
              <div class="info-item">
                <span class="label">Full Name:</span> ${selectedInmate.fullName}
              </div>
              <div class="info-item">
                <span class="label">Gender:</span> ${selectedInmate.sex}
              </div>
              <div class="info-item">
                <span class="label">Date of Birth:</span> ${new Date(selectedInmate.dateOfBirth).toLocaleDateString()}
              </div>
              <div class="info-item">
                <span class="label">Age:</span> ${calculateAge(selectedInmate.dateOfBirth)}
              </div>
              <div class="info-item full-width">
                <span class="label">Address:</span> ${selectedInmate.address}
              </div>
              <div class="info-item">
                <span class="label">Marital Status:</span> ${selectedInmate.maritalStatus || 'N/A'}
              </div>
              <div class="info-item">
                <span class="label">Eye Color:</span> ${selectedInmate.eyeColor || 'N/A'}
              </div>
              <div class="info-item">
                <span class="label">Complexion:</span> ${selectedInmate.complexion || 'N/A'}
              </div>
            </div>
          </div>

          <div class="section">
            <h3>Legal Details</h3>
            <div class="info-grid">
              <div class="info-item">
                <span class="label">Cell ID:</span> ${selectedInmate.cellId}
              </div>
              <div class="info-item">
                <span class="label">Crime:</span> ${selectedInmate.crime}
              </div>
              <div class="info-item">
                <span class="label">Sentence:</span> ${selectedInmate.sentence || 'N/A'}
              </div>
              <div class="info-item">
                <span class="label">Status:</span> ${selectedInmate.status.toUpperCase()}
              </div>
              <div class="info-item">
                <span class="label">Date From:</span> ${selectedInmate.dateFrom ? new Date(selectedInmate.dateFrom).toLocaleDateString() : 'N/A'}
              </div>
              <div class="info-item">
                <span class="label">Date To:</span> ${selectedInmate.dateTo ? new Date(selectedInmate.dateTo).toLocaleDateString() : 'N/A'}
              </div>
            </div>
          </div>

          <div class="section">
            <h3>Emergency Contact</h3>
            <div class="info-grid">
              <div class="info-item">
                <span class="label">Name:</span> ${selectedInmate.emergencyName || 'N/A'}
              </div>
              <div class="info-item">
                <span class="label">Contact:</span> ${selectedInmate.emergencyContact || 'N/A'}
              </div>
              <div class="info-item">
                <span class="label">Relationship:</span> ${selectedInmate.emergencyRelation || 'N/A'}
              </div>
            </div>
          </div>

          <div class="section">
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
              <p><strong>Generated on:</strong> ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
              <p><em>Official Document - Lanao Del Norte District Jail Male Division, Region 10</em></p>
            </div>
          </div>
        ` : ''}
      </body>
    </html>
  `);
  printWindow.document.close();
  setTimeout(() => {
    printWindow.print();
  }, 1000);
};

  return (
    <Container>
      <ToastContainer />
      
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 style={{ fontFamily: "Poppins, sans-serif", fontWeight: "600", color: "#2c3e50" }}>
            ⚖️ {getGenderTitle()}
          </h2>
          <Badge bg="primary" className="mb-2">
            Male Division Access Only
          </Badge>
        </div>
        <div className="d-flex gap-2">
          <Button variant="outline-dark" size="sm" onClick={exportToCSV}>
            <Download size={16} className="me-1" />
            Export CSV
          </Button>
          <Button variant="outline-dark" size="sm" onClick={() => setShowUploadModal(true)}>
            <Upload size={16} className="me-1" />
            Import CSV
          </Button>
          <Button variant="dark" onClick={handleAdd}>
            <Plus size={16} className="me-1" />
            Add Male Inmate
          </Button>
        </div>
      </div>

      {/* Search Section */}
      <Card className="mb-4 border-0 bg-light">
        <Card.Body>
          <Row className="align-items-center">
            <Col md={12}>
              <InputGroup>
                <InputGroup.Text className="bg-white">
                  <Search size={16} />
                </InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder="Search male inmates..."
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
          </Row>
          <Row className="mt-2">
            <Col>
              <div className="text-muted small">
                Showing {filteredInmates.length} male inmates
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {isLoading && inmates.length === 0 ? (
        <div className="text-center">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading male inmates...</span>
          </Spinner>
        </div>
      ) : filteredInmates.length === 0 ? (
        <Alert variant="info">
          {searchQuery
            ? 'No male inmates found matching your criteria.' 
            : 'No male inmates found. Add your first male inmate to get started.'}
        </Alert>
      ) : (
        <Table striped bordered hover responsive className="bg-white">
          <thead className="table-dark">
            <tr>
              <th>Inmate Code</th>
              <th>Full Name</th>
              <th>Gender</th>
              <th>Cell ID</th>
              <th>Crime</th>
              <th>Status</th>
              <th style={{ width: '100px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredInmates.map(inmate => (
              <tr key={inmate._id}>
                <td><strong>{inmate.inmateCode}</strong></td>
                <td>{inmate.fullName}</td>
                <td>
                  <Badge bg="primary">
                    {inmate.sex}
                  </Badge>
                </td>
                <td>{inmate.cellId}</td>
                <td>{inmate.crime}</td>
                <td>
                  <Badge bg={getStatusVariant(inmate.status)}>
                    {inmate.status}
                  </Badge>
                </td>
                <td>
                  <div className="d-flex gap-1">
                    <Button 
                      variant="outline-info" 
                      size="sm" 
                      onClick={() => handleView(inmate)}
                      className="p-1"
                    >
                      <Eye size={14} />
                    </Button>
                    <Button 
                      variant="outline-warning" 
                      size="sm" 
                      onClick={() => handleEdit(inmate)}
                      className="p-1"
                    >
                      <Edit2 size={14} />
                    </Button>
                    <Button 
                      variant="outline-danger" 
                      size="sm" 
                      onClick={() => handleDelete(inmate.inmateCode)}
                      className="p-1"
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
      <Modal show={showModal} onHide={() => setShowModal(false)} size="xl">
        <Modal.Header closeButton>
          <Modal.Title>{editingInmate ? 'Edit Male Inmate' : 'Add New Male Inmate'}</Modal.Title>
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
                  <Form.Control
                    type="text"
                    value="Male"
                    disabled
                    className="bg-light"
                  />
                  <Form.Text className="text-muted">
                    Male Division - Gender is automatically set to Male
                  </Form.Text>
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
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Marital Status</Form.Label>
                  <Form.Select
                    name="maritalStatus"
                    value={formData.maritalStatus}
                    onChange={handleInputChange}
                  >
                    <option value="">Select Status</option>
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Divorced">Divorced</option>
                    <option value="Widowed">Widowed</option>
                    <option value="Separated">Separated</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Eye Color</Form.Label>
                  <Form.Control
                    type="text"
                    name="eyeColor"
                    value={formData.eyeColor}
                    onChange={handleInputChange}
                    placeholder="e.g., Brown, Blue, Green"
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Complexion</Form.Label>
                  <Form.Control
                    type="text"
                    name="complexion"
                    value={formData.complexion}
                    onChange={handleInputChange}
                    placeholder="e.g., Fair, Dark, Olive"
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Cell ID *</Form.Label>
                  <Form.Control
                    type="text"
                    name="cellId"
                    value={formData.cellId}
                    onChange={handleInputChange}
                    required
                    placeholder="Enter cell identification"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Crime *</Form.Label>
                  <div className="position-relative">
                    <InputGroup>
                      <Form.Control
                        type="text"
                        value={crimeSearch}
                        onChange={handleCrimeSearchChange}
                        onFocus={() => setShowCrimeDropdown(true)}
                        placeholder="Type to search crimes..."
                        required
                      />
                      {crimeSearch && (
                        <Button
                          variant="outline-secondary"
                          onClick={clearCrimeSelection}
                        >
                          <X size={16} />
                        </Button>
                      )}
                    </InputGroup>
                    
                    {/* Crime Dropdown */}
                    {showCrimeDropdown && filteredCrimes.length > 0 && (
                      <ListGroup className="position-absolute w-100 mt-1" style={{ zIndex: 1050, maxHeight: '200px', overflowY: 'auto' }}>
                        {filteredCrimes.map(crime => (
                          <ListGroup.Item
                            key={crime._id}
                            action
                            onClick={() => handleCrimeSelect(crime.crime)}
                            className="small"
                          >
                            {crime.crime}
                          </ListGroup.Item>
                        ))}
                      </ListGroup>
                    )}
                    
                    {/* No results message */}
                    {showCrimeDropdown && crimeSearch.trim() !== '' && filteredCrimes.length === 0 && (
                      <div className="position-absolute w-100 mt-1 border bg-white p-2 small text-muted" style={{ zIndex: 1050 }}>
                        No crimes found matching "{crimeSearch}"
                      </div>
                    )}
                  </div>
                  <Form.Text className="text-muted">
                    Start typing to search from available crimes
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Sentence</Form.Label>
                  <Form.Control
                    type="text"
                    name="sentence"
                    value={formData.sentence}
                    onChange={handleInputChange}
                    placeholder="e.g., 5 years imprisonment"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Status</Form.Label>
                  <Form.Select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="released">Released</option>
                    <option value="transferred">Transferred</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Date From</Form.Label>
                  <Form.Control
                    type="date"
                    name="dateFrom"
                    value={formData.dateFrom}
                    onChange={handleInputChange}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Date To</Form.Label>
                  <Form.Control
                    type="date"
                    name="dateTo"
                    value={formData.dateTo}
                    onChange={handleInputChange}
                  />
                </Form.Group>
              </Col>
            </Row>

            {/* Image Upload Section */}
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Front Image</Form.Label>
                  <Form.Control
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageChange(e, 'frontImage')}
                  />
                  <Form.Text className="text-muted">
                    Upload front view photo
                  </Form.Text>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Back Image</Form.Label>
                  <Form.Control
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageChange(e, 'backImage')}
                  />
                  <Form.Text className="text-muted">
                    Upload back view photo
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Left Side Image</Form.Label>
                  <Form.Control
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageChange(e, 'leftImage')}
                  />
                  <Form.Text className="text-muted">
                    Upload left side photo
                  </Form.Text>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Right Side Image</Form.Label>
                  <Form.Control
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageChange(e, 'rightImage')}
                  />
                  <Form.Text className="text-muted">
                    Upload right side photo
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>

            <h6>Emergency Contact</h6>
            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Name</Form.Label>
                  <Form.Control
                    type="text"
                    name="emergencyName"
                    value={formData.emergencyName}
                    onChange={handleInputChange}
                    placeholder="Emergency contact name"
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Contact Number</Form.Label>
                  <Form.Control
                    type="text"
                    name="emergencyContact"
                    value={formData.emergencyContact}
                    onChange={handleInputChange}
                    placeholder="Phone number"
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Relationship</Form.Label>
                  <Form.Control
                    type="text"
                    name="emergencyRelation"
                    value={formData.emergencyRelation}
                    onChange={handleInputChange}
                    placeholder="e.g., Spouse, Parent, Sibling"
                  />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button variant="dark" type="submit" disabled={isLoading}>
              {isLoading ? <Spinner size="sm" /> : (editingInmate ? 'Update' : 'Add') + ' Male Inmate'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* View Modal with Image Carousel */}
      <Modal show={showViewModal} onHide={() => setShowViewModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Male Inmate Details - {selectedInmate?.inmateCode}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedInmate && (
            <>
              {/* Image Carousel */}
              {getAvailableImages(selectedInmate).length > 0 && (
                <Card className="mb-4">
                  <Card.Header>
                    <strong>Inmate Photos</strong>
                  </Card.Header>
                  <Card.Body>
                    <div className="text-center position-relative">
                      <img 
                        src={`http://localhost:5000/uploads/${getAvailableImages(selectedInmate)[currentImageIndex].src}`}
                        alt={getAvailableImages(selectedInmate)[currentImageIndex].type}
                        style={{ 
                          maxWidth: '100%', 
                          maxHeight: '300px', 
                          objectFit: 'cover',
                          borderRadius: '5px'
                        }}
                      />
                      {getAvailableImages(selectedInmate).length > 1 && (
                        <>
                          <Button
                            variant="dark"
                            size="sm"
                            className="position-absolute top-50 start-0 translate-middle-y"
                            onClick={prevImage}
                            style={{ left: '10px' }}
                          >
                            <ChevronLeft size={16} />
                          </Button>
                          <Button
                            variant="dark"
                            size="sm"
                            className="position-absolute top-50 end-0 translate-middle-y"
                            onClick={nextImage}
                            style={{ right: '10px' }}
                          >
                            <ChevronRight size={16} />
                          </Button>
                        </>
                      )}
                      <div className="mt-2">
                        <Badge bg="dark">
                          {currentImageIndex + 1} / {getAvailableImages(selectedInmate).length} - 
                          {getAvailableImages(selectedInmate)[currentImageIndex].type}
                        </Badge>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              )}

              <Row>
                <Col md={6}>
                  <Card className="mb-3">
                    <Card.Header>
                      <strong>Personal Information</strong>
                    </Card.Header>
                    <Card.Body>
                      <p><strong>Full Name:</strong> {selectedInmate.fullName}</p>
                      <p><strong>Gender:</strong> {selectedInmate.sex}</p>
                      <p><strong>Date of Birth:</strong> {new Date(selectedInmate.dateOfBirth).toLocaleDateString()}</p>
                      <p><strong>Age:</strong> {calculateAge(selectedInmate.dateOfBirth)}</p>
                      <p><strong>Address:</strong> {selectedInmate.address}</p>
                      <p><strong>Marital Status:</strong> {selectedInmate.maritalStatus || 'N/A'}</p>
                      <p><strong>Eye Color:</strong> {selectedInmate.eyeColor || 'N/A'}</p>
                      <p><strong>Complexion:</strong> {selectedInmate.complexion || 'N/A'}</p>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={6}>
                  <Card className="mb-3">
                    <Card.Header>
                      <strong>Legal Details</strong>
                    </Card.Header>
                    <Card.Body>
                      <p><strong>Cell ID:</strong> {selectedInmate.cellId}</p>
                      <p><strong>Crime:</strong> {selectedInmate.crime}</p>
                      <p><strong>Sentence:</strong> {selectedInmate.sentence || 'N/A'}</p>
                      <p><strong>Status:</strong> <Badge bg={getStatusVariant(selectedInmate.status)}>{selectedInmate.status}</Badge></p>
                      <p><strong>Date From:</strong> {selectedInmate.dateFrom ? new Date(selectedInmate.dateFrom).toLocaleDateString() : 'N/A'}</p>
                      <p><strong>Date To:</strong> {selectedInmate.dateTo ? new Date(selectedInmate.dateTo).toLocaleDateString() : 'N/A'}</p>
                    </Card.Body>
                  </Card>
                  <Card>
                    <Card.Header>
                      <strong>Emergency Contact</strong>
                    </Card.Header>
                    <Card.Body>
                      <p><strong>Name:</strong> {selectedInmate.emergencyName || 'N/A'}</p>
                      <p><strong>Contact:</strong> {selectedInmate.emergencyContact || 'N/A'}</p>
                      <p><strong>Relationship:</strong> {selectedInmate.emergencyRelation || 'N/A'}</p>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowViewModal(false)}>
            Close
          </Button>
          <Button variant="dark" onClick={printInmateDetails}>
            <Printer size={16} className="me-1" />
            Print
          </Button>
        </Modal.Footer>
      </Modal>

      {/* CSV Upload Modal */}
      <Modal show={showUploadModal} onHide={() => setShowUploadModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Import Male Inmates from CSV</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group>
            <Form.Label>Select CSV File</Form.Label>
            <Form.Control
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
            />
            <Form.Text className="text-muted">
              CSV should include columns: lastName, firstName, middleName, extension, sex, dateOfBirth, address, maritalStatus, eyeColor, complexion, cellId, sentence, dateFrom, dateTo, crime, emergencyName, emergencyContact, emergencyRelation, status
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

export default MaleInmates;