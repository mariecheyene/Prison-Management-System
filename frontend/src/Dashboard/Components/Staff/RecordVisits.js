import React, { useState, useEffect } from 'react';
import { 
  Container, Row, Col, Table, Button, Card, 
  Form, Badge, Spinner, Alert, InputGroup,
  Modal, Tabs, Tab, ButtonGroup
} from 'react-bootstrap';
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import axios from "axios";
import { 
  Search, 
  Filter,
  Calendar,
  Download,
  User,
  Clock,
  MapPin,
  Trash2,
  AlertTriangle,
  Slash,
  Edit,
  CheckCircle,
  XCircle
} from 'react-feather';

const RecordVisits = () => {
  const [visits, setVisits] = useState([]);
  const [filteredVisits, setFilteredVisits] = useState([]);
  const [violators, setViolators] = useState([]);
  const [bannedVisitors, setBannedVisitors] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [inmates, setInmates] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  
  // Filter states
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchBy, setSearchBy] = useState('visitorName');

  // Modal states
  const [showViolationModal, setShowViolationModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showBanModal, setShowBanModal] = useState(false);
  const [showRemoveBanModal, setShowRemoveBanModal] = useState(false);
  const [showRemoveViolationModal, setShowRemoveViolationModal] = useState(false);
  const [selectedVisitor, setSelectedVisitor] = useState(null);
  const [violationData, setViolationData] = useState({
    violationType: '',
    violationDetails: ''
  });
  const [banData, setBanData] = useState({
    banDuration: '',
    banReason: ''
  });

  const API_BASE = 'http://localhost:5000';

  const searchOptions = [
    { value: 'visitorName', label: 'Visitor Name' },
    { value: 'inmateName', label: 'Inmate Name' },
    { value: 'relationship', label: 'Relationship' },
    { value: 'visitorId', label: 'Visitor ID' }
  ];

  useEffect(() => {
    fetchVisits();
    fetchInmates();
  }, []);

  useEffect(() => {
    filterVisits();
    updateViolatorsList();
    updateBannedList();
  }, [visits, startDate, endDate, searchQuery, searchBy]);

  const fetchVisits = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${API_BASE}/visitors`);
      // Filter visitors who have time tracking data (either timeIn or timeOut)
      const visitorsWithTimeTracking = response.data.filter(visit => 
        visit.timeIn || visit.timeOut || visit.dateVisited || visit.lastVisitDate
      );
      setVisits(visitorsWithTimeTracking);
    } catch (error) {
      console.error("Error fetching visits:", error);
      toast.error("Failed to fetch visit records");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchInmates = async () => {
    try {
      const response = await axios.get(`${API_BASE}/inmates`);
      setInmates(response.data);
    } catch (error) {
      console.error('Error fetching inmates:', error);
    }
  };

  const getInmateName = (prisonerId) => {
    const inmate = inmates.find(inmate => inmate.inmateCode === prisonerId);
    return inmate ? inmate.fullName : 'Unknown Inmate';
  };

  const filterVisits = () => {
    let filtered = visits;

    // Filter by date range
    if (startDate) {
      filtered = filtered.filter(visit => {
        if (!visit.lastVisitDate) return false;
        const visitDate = new Date(visit.lastVisitDate).toISOString().split('T')[0];
        return visitDate >= startDate;
      });
    }

    if (endDate) {
      filtered = filtered.filter(visit => {
        if (!visit.lastVisitDate) return false;
        const visitDate = new Date(visit.lastVisitDate).toISOString().split('T')[0];
        return visitDate <= endDate;
      });
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(visit => {
        switch (searchBy) {
          case 'visitorName':
            return visit.fullName?.toLowerCase().includes(query);
          case 'inmateName':
            return getInmateName(visit.prisonerId)?.toLowerCase().includes(query);
          case 'relationship':
            return visit.relationship?.toLowerCase().includes(query);
          case 'visitorId':
            return visit.id?.toLowerCase().includes(query);
          default:
            return true;
        }
      });
    }

    setFilteredVisits(filtered);
  };

  const updateViolatorsList = () => {
    const violatorsList = visits.filter(visit => 
      visit.violationType && visit.violationType.trim() !== '' && 
      visit.violationType !== 'Banned' && visit.violationType !== 'Permanent Ban'
    );
    setViolators(violatorsList);
  };

  const updateBannedList = () => {
    const bannedList = visits.filter(visit => 
      visit.violationType === 'Banned' || visit.violationType === 'Permanent Ban'
    );
    setBannedVisitors(bannedList);
  };

  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
    setSearchQuery('');
  };

  // FIXED: Reset time records function - only clears time records, keeps lastVisitDate
  // FIXED: Reset time records function - preserves lastVisitDate
const handleResetTimeRecords = async (visitorId) => {
  try {
    // Get current visitor data to preserve lastVisitDate
    const visitorResponse = await axios.get(`${API_BASE}/visitors/${visitorId}`);
    const currentVisitor = visitorResponse.data;
    
    // Reset only time tracking fields, preserve lastVisitDate
    const updateData = {
      hasTimedIn: false,
      hasTimedOut: false,
      timeIn: null,
      timeOut: null,
      dateVisited: null,
      // Keep the lastVisitDate unchanged - this is the key fix!
      lastVisitDate: currentVisitor.lastVisitDate
    };

    const response = await axios.put(`${API_BASE}/visitors/${visitorId}`, updateData);
    
    toast.success("Time records reset successfully! Visitor can now check in again.");
    setShowDeleteModal(false);
    setSelectedVisitor(null);
    fetchVisits(); // Refresh the list
  } catch (error) {
    console.error("Error resetting time records:", error);
    toast.error("Failed to reset time records");
  }
};

  // Add/Edit violation function
  const handleViolationSubmit = async () => {
    if (!violationData.violationType || !violationData.violationDetails) {
      toast.error("Please fill in all violation fields");
      return;
    }

    try {
      const response = await axios.put(`${API_BASE}/visitors/${selectedVisitor.id}`, {
        violationType: violationData.violationType,
        violationDetails: violationData.violationDetails
      });

      toast.success("Violation recorded successfully");
      setShowViolationModal(false);
      setSelectedVisitor(null);
      setViolationData({ violationType: '', violationDetails: '' });
      fetchVisits(); // Refresh the list
    } catch (error) {
      console.error("Error updating violation:", error);
      toast.error("Failed to record violation");
    }
  };

  // Remove violation function
  const handleRemoveViolation = async (visitorId) => {
    try {
      const response = await axios.put(`${API_BASE}/visitors/${visitorId}`, {
        violationType: '',
        violationDetails: ''
      });

      toast.success("Violation removed successfully");
      setShowRemoveViolationModal(false);
      setSelectedVisitor(null);
      fetchVisits(); // Refresh the list
    } catch (error) {
      console.error("Error removing violation:", error);
      toast.error("Failed to remove violation");
    }
  };

  // Ban visitor function
  const handleBanVisitor = async () => {
    if (!banData.banDuration || !banData.banReason) {
      toast.error("Please fill in all ban fields");
      return;
    }

    try {
      const response = await axios.put(`${API_BASE}/visitors/${selectedVisitor.id}`, {
        violationType: 'Banned',
        violationDetails: `Duration: ${banData.banDuration}. Reason: ${banData.banReason}`
      });

      toast.success("Visitor banned successfully");
      setShowBanModal(false);
      setSelectedVisitor(null);
      setBanData({ banDuration: '', banReason: '' });
      fetchVisits(); // Refresh the list
    } catch (error) {
      console.error("Error banning visitor:", error);
      toast.error("Failed to ban visitor");
    }
  };

  // Remove ban function
  const handleRemoveBan = async (visitorId) => {
    try {
      const response = await axios.put(`${API_BASE}/visitors/${visitorId}`, {
        violationType: '',
        violationDetails: ''
      });

      toast.success("Ban removed successfully");
      setShowRemoveBanModal(false);
      setSelectedVisitor(null);
      fetchVisits(); // Refresh the list
    } catch (error) {
      console.error("Error removing ban:", error);
      toast.error("Failed to remove ban");
    }
  };

  // Open violation modal
  const openViolationModal = (visitor) => {
    setSelectedVisitor(visitor);
    setViolationData({
      violationType: visitor.violationType || '',
      violationDetails: visitor.violationDetails || ''
    });
    setShowViolationModal(true);
  };

  // Open ban modal
  const openBanModal = (visitor) => {
    setSelectedVisitor(visitor);
    setBanData({ banDuration: '', banReason: '' });
    setShowBanModal(true);
  };

  // Open remove ban modal
  const openRemoveBanModal = (visitor) => {
    setSelectedVisitor(visitor);
    setShowRemoveBanModal(true);
  };

  // Open remove violation modal
  const openRemoveViolationModal = (visitor) => {
    setSelectedVisitor(visitor);
    setShowRemoveViolationModal(true);
  };

  // Open reset time records modal
  const openResetModal = (visitor) => {
    setSelectedVisitor(visitor);
    setShowDeleteModal(true);
  };

  const exportToCSV = () => {
    let dataToExport = [];
    
    switch (activeTab) {
      case 'all':
        dataToExport = filteredVisits;
        break;
      case 'violators':
        dataToExport = violators;
        break;
      case 'banned':
        dataToExport = bannedVisitors;
        break;
      default:
        dataToExport = filteredVisits;
    }

    const headers = [
      'Visitor ID', 'Visitor Name', 'Date of Birth', 'Age', 'Gender',
      'Address', 'Contact', 'Inmate Visited', 'Relationship', 'Last Visit Date',
      'Time In', 'Time Out', 'Time Status', 'Status', 'Violation Type', 'Violation Details'
    ];

    const csvData = dataToExport.map(visit => [
      visit.id,
      visit.fullName,
      visit.dateOfBirth ? new Date(visit.dateOfBirth).toLocaleDateString() : 'N/A',
      visit.age || 'N/A',
      visit.sex || 'N/A',
      visit.address || 'N/A',
      visit.contact || 'N/A',
      getInmateName(visit.prisonerId),
      visit.relationship || 'N/A',
      visit.lastVisitDate ? new Date(visit.lastVisitDate).toLocaleDateString() : 'N/A',
      visit.timeIn || 'N/A',
      visit.timeOut || 'N/A',
      getTimeStatus(visit).text,
      visit.status,
      visit.violationType || 'N/A',
      visit.violationDetails || 'N/A'
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `visit_records_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
    
    toast.success(`Exported ${dataToExport.length} records to CSV`);
  };

  const getStatusVariant = (status) => {
    switch (status) {
      case 'approved': return 'success';
      case 'pending': return 'warning';
      case 'rejected': return 'danger';
      default: return 'secondary';
    }
  };

  const getGenderVariant = (gender) => {
    return gender === 'Male' ? 'primary' : 'danger';
  };

  const getViolationVariant = (violationType) => {
    if (!violationType) return 'secondary';
    switch (violationType.toLowerCase()) {
      case 'banned': return 'danger';
      case 'permanent ban': return 'dark';
      case 'minor': return 'warning';
      case 'major': return 'danger';
      default: return 'warning';
    }
  };

  const getTimeStatus = (visitor) => {
    if (!visitor.hasTimedIn) return { variant: 'secondary', text: 'Not Checked In' };
    if (visitor.hasTimedIn && !visitor.hasTimedOut) return { variant: 'success', text: 'Checked In' };
    if (visitor.hasTimedIn && visitor.hasTimedOut) return { variant: 'info', text: 'Checked Out' };
    return { variant: 'secondary', text: 'Unknown' };
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'N/A';
      }
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return 'N/A';
    }
  };

  const formatTime = (timeString) => {
    if (!timeString) return 'Not recorded';
    // Convert to 12-hour format if needed
    if (timeString.includes(':')) {
      const [hours, minutes] = timeString.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const twelveHour = hour % 12 || 12;
      return `${twelveHour}:${minutes} ${ampm}`;
    }
    return timeString;
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

  // Render action buttons based on active tab
  const renderActionButtons = (visit) => {
    const isBanned = visit.violationType === 'Banned' || visit.violationType === 'Permanent Ban';
    const hasViolation = visit.violationType && visit.violationType.trim() !== '' && !isBanned;

    switch (activeTab) {
      case 'all':
        return (
          <div className="d-flex flex-column gap-1">
            <Button
              variant="outline-warning"
              size="sm"
              onClick={() => openViolationModal(visit)}
              className="d-flex align-items-center justify-content-center"
            >
              <Edit size={14} className="me-1" />
              Violation
            </Button>
            <Button
              variant="outline-danger"
              size="sm"
              onClick={() => openBanModal(visit)}
              className="d-flex align-items-center justify-content-center"
            >
              <Slash size={14} className="me-1" />
              Ban
            </Button>
            <Button
              variant="outline-dark"
              size="sm"
              onClick={() => openResetModal(visit)}
              className="d-flex align-items-center justify-content-center"
            >
              <Trash2 size={14} className="me-1" />
              Reset Time
            </Button>
          </div>
        );

      case 'violators':
        return (
          <div className="d-flex flex-column gap-1">
            <Button
              variant="outline-warning"
              size="sm"
              onClick={() => openViolationModal(visit)}
              className="d-flex align-items-center justify-content-center"
            >
              <Edit size={14} className="me-1" />
              Edit Violation
            </Button>
            <Button
              variant="outline-success"
              size="sm"
              onClick={() => openRemoveViolationModal(visit)}
              className="d-flex align-items-center justify-content-center"
            >
              <CheckCircle size={14} className="me-1" />
              Remove Violation
            </Button>
          </div>
        );

      case 'banned':
        return (
          <div className="d-flex flex-column gap-1">
            <Button
              variant="outline-warning"
              size="sm"
              onClick={() => openBanModal(visit)}
              className="d-flex align-items-center justify-content-center"
            >
              <Edit size={14} className="me-1" />
              Edit Ban
            </Button>
            <Button
              variant="outline-success"
              size="sm"
              onClick={() => openRemoveBanModal(visit)}
              className="d-flex align-items-center justify-content-center"
            >
              <XCircle size={14} className="me-1" />
              Remove Ban
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  const renderVisitsTable = (data) => {
    if (data.length === 0) {
      return (
        <Alert variant="info">
          No records found in this category.
        </Alert>
      );
    }

    return (
      <Table striped bordered hover responsive className="bg-white">
        <thead className="table-dark">
          <tr>
            <th>Visitor Information</th>
            <th>Visit Details</th>
            <th>Inmate Details</th>
            <th>Time Tracking</th>
            <th>Status</th>
            <th style={{ width: '140px' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {data.map(visit => (
            <tr key={visit._id}>
              <td>
                <div className="d-flex align-items-start">
                  <div className="flex-grow-1">
                    <div className="fw-bold">{visit.fullName}</div>
                    <div className="small text-muted">
                      <User size={12} className="me-1" />
                      ID: {visit.id}
                    </div>
                    <div className="small">
                      <Badge bg={getGenderVariant(visit.sex)} className="me-1">
                        {visit.sex}
                      </Badge>
                      Age: {calculateAge(visit.dateOfBirth)}
                    </div>
                    {visit.contact && (
                      <div className="small text-muted">
                        📞 {visit.contact}
                      </div>
                    )}
                    {visit.violationType && (
                      <div className="small mt-1">
                        <Badge bg={getViolationVariant(visit.violationType)}>
                          <AlertTriangle size={10} className="me-1" />
                          {visit.violationType}
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              </td>
              <td>
                <div>
                  <div className="fw-bold">
                    <Calendar size={14} className="me-1" />
                    Last Visit: {formatDate(visit.lastVisitDate)}
                  </div>
                  {visit.relationship && (
                    <div className="small text-muted">
                      Relationship: {visit.relationship}
                    </div>
                  )}
                  {visit.address && (
                    <div className="small text-muted">
                      <MapPin size={12} className="me-1" />
                      {visit.address}
                    </div>
                  )}
                </div>
              </td>
              <td>
                <div className="fw-bold">{getInmateName(visit.prisonerId)}</div>
                <div className="small text-muted">
                  Inmate ID: {visit.prisonerId}
                </div>
              </td>
              <td>
                <div className="small">
                  <div><strong>Time In:</strong> {formatTime(visit.timeIn)}</div>
                  <div><strong>Time Out:</strong> {formatTime(visit.timeOut)}</div>
                  <div className="mt-1">
                    <Badge bg={getTimeStatus(visit).variant}>
                      {getTimeStatus(visit).text}
                    </Badge>
                  </div>
                </div>
              </td>
              <td className="text-center">
                <Badge bg={getStatusVariant(visit.status)} className="fs-6">
                  {visit.status.toUpperCase()}
                </Badge>
              </td>
              <td className="text-center">
                {renderActionButtons(visit)}
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    );
  };

  return (
    <Container>
      <ToastContainer />
      
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 style={{ fontFamily: "Poppins, sans-serif", fontWeight: "600", color: "#2c3e50" }}>
            📋 Visit Records Management
          </h2>
          <p className="text-muted mb-0">Manage visitor records, violations, and bans</p>
        </div>
        <Button variant="outline-dark" onClick={exportToCSV} disabled={filteredVisits.length === 0}>
          <Download size={16} className="me-1" />
          Export CSV
        </Button>
      </div>

      {/* Tabs for different views */}
      <Card className="mb-4 border-0">
        <Card.Body className="p-0">
          <Tabs
            activeKey={activeTab}
            onSelect={(tab) => setActiveTab(tab)}
            className="mb-3"
          >
            <Tab eventKey="all" title={
              <span>
                All Visits <Badge bg="primary" className="ms-1">{filteredVisits.length}</Badge>
              </span>
            }>
              {/* Filters Card for All Visits */}
              <Card className="mb-4 border-0 bg-light">
                <Card.Header className="bg-white">
                  <div className="d-flex align-items-center">
                    <Filter size={18} className="me-2" />
                    <h6 className="mb-0">Filter Records</h6>
                  </div>
                </Card.Header>
                <Card.Body>
                  <Row className="g-3">
                    <Col md={3}>
                      <Form.Group>
                        <Form.Label>
                          <Calendar size={14} className="me-1" />
                          Start Date
                        </Form.Label>
                        <Form.Control
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={3}>
                      <Form.Group>
                        <Form.Label>
                          <Calendar size={14} className="me-1" />
                          End Date
                        </Form.Label>
                        <Form.Control
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group>
                        <Form.Label>
                          <Search size={14} className="me-1" />
                          Search
                        </Form.Label>
                        <InputGroup>
                          <Form.Control
                            type="text"
                            placeholder="Search records..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                          />
                          <Form.Select 
                            value={searchBy} 
                            onChange={(e) => setSearchBy(e.target.value)}
                            style={{ maxWidth: '150px' }}
                          >
                            {searchOptions.map(option => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </Form.Select>
                        </InputGroup>
                      </Form.Group>
                    </Col>
                    <Col md={2} className="d-flex align-items-end">
                      <Button 
                        variant="outline-secondary" 
                        onClick={clearFilters}
                        className="w-100"
                      >
                        Clear Filters
                      </Button>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>

              {/* All Visits Table */}
              {isLoading ? (
                <div className="text-center">
                  <Spinner animation="border" role="status">
                    <span className="visually-hidden">Loading visit records...</span>
                  </Spinner>
                  <p className="mt-2">Loading visit records...</p>
                </div>
              ) : renderVisitsTable(filteredVisits)}
            </Tab>

            <Tab eventKey="violators" title={
              <span>
                Violators <Badge bg="warning" className="ms-1">{violators.length}</Badge>
              </span>
            }>
              <Card className="mb-4 border-0 bg-warning bg-opacity-10">
                <Card.Header className="bg-warning bg-opacity-25">
                  <div className="d-flex align-items-center">
                    <AlertTriangle size={18} className="me-2 text-warning" />
                    <h6 className="mb-0 text-dark">Visitors with Violations</h6>
                  </div>
                </Card.Header>
              </Card>
              {renderVisitsTable(violators)}
            </Tab>

            <Tab eventKey="banned" title={
              <span>
                Banned Visitors <Badge bg="danger" className="ms-1">{bannedVisitors.length}</Badge>
              </span>
            }>
              <Card className="mb-4 border-0 bg-danger bg-opacity-10">
                <Card.Header className="bg-danger bg-opacity-25">
                  <div className="d-flex align-items-center">
                    <Slash size={18} className="me-2 text-danger" />
                    <h6 className="mb-0 text-dark">Banned Visitors</h6>
                  </div>
                </Card.Header>
              </Card>
              {renderVisitsTable(bannedVisitors)}
            </Tab>
          </Tabs>
        </Card.Body>
      </Card>

      {/* Statistics Card */}
      {filteredVisits.length > 0 && (
        <Card className="mt-4 border-0 bg-light">
          <Card.Body>
            <Row>
              <Col md={2} className="text-center">
                <div className="h4 text-primary mb-1">{filteredVisits.length}</div>
                <div className="text-muted small">Total Records</div>
              </Col>
              <Col md={2} className="text-center">
                <div className="h4 text-success mb-1">
                  {filteredVisits.filter(v => v.sex === 'Male').length}
                </div>
                <div className="text-muted small">Male Visitors</div>
              </Col>
              <Col md={2} className="text-center">
                <div className="h4 text-danger mb-1">
                  {filteredVisits.filter(v => v.sex === 'Female').length}
                </div>
                <div className="text-muted small">Female Visitors</div>
              </Col>
              <Col md={2} className="text-center">
                <div className="h4 text-info mb-1">
                  {new Set(filteredVisits.map(v => v.prisonerId)).size}
                </div>
                <div className="text-muted small">Unique Inmates</div>
              </Col>
              <Col md={2} className="text-center">
                <div className="h4 text-warning mb-1">{violators.length}</div>
                <div className="text-muted small">Violators</div>
              </Col>
              <Col md={2} className="text-center">
                <div className="h4 text-dark mb-1">{bannedVisitors.length}</div>
                <div className="text-muted small">Banned</div>
              </Col>
            </Row>
          </Card.Body>
        </Card>
      )}

      {/* Violation Modal */}
      <Modal show={showViolationModal} onHide={() => setShowViolationModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>
            <AlertTriangle size={20} className="me-2 text-warning" />
            {selectedVisitor ? `Record Violation for ${selectedVisitor.fullName}` : 'Record Violation'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Violation Type</Form.Label>
              <Form.Select
                value={violationData.violationType}
                onChange={(e) => setViolationData({...violationData, violationType: e.target.value})}
              >
                <option value="">Select violation type</option>
                <option value="Minor Infraction">Minor Infraction</option>
                <option value="Major Violation">Major Violation</option>
                <option value="Security Breach">Security Breach</option>
                <option value="Contraband">Contraband Attempt</option>
                <option value="Behavioral">Behavioral Issue</option>
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Violation Details</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                placeholder="Describe the violation details..."
                value={violationData.violationDetails}
                onChange={(e) => setViolationData({...violationData, violationDetails: e.target.value})}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowViolationModal(false)}>
            Cancel
          </Button>
          <Button variant="warning" onClick={handleViolationSubmit}>
            Save Violation
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Ban Modal */}
      <Modal show={showBanModal} onHide={() => setShowBanModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>
            <Slash size={20} className="me-2 text-danger" />
            {selectedVisitor ? `Ban Visitor: ${selectedVisitor.fullName}` : 'Ban Visitor'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Ban Duration</Form.Label>
              <Form.Select
                value={banData.banDuration}
                onChange={(e) => setBanData({...banData, banDuration: e.target.value})}
              >
                <option value="">Select duration</option>
                <option value="1 week">1 Week</option>
                <option value="2 weeks">2 Weeks</option>
                <option value="1 month">1 Month</option>
                <option value="3 months">3 Months</option>
                <option value="6 months">6 Months</option>
                <option value="1 year">1 Year</option>
                <option value="Permanent">Permanent</option>
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Ban Reason</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                placeholder="Explain the reason for banning this visitor..."
                value={banData.banReason}
                onChange={(e) => setBanData({...banData, banReason: e.target.value})}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowBanModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleBanVisitor}>
            Confirm Ban
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Remove Ban Modal */}
      <Modal show={showRemoveBanModal} onHide={() => setShowRemoveBanModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>
            <CheckCircle size={20} className="me-2 text-success" />
            Remove Ban
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to remove the ban from <strong>{selectedVisitor?.fullName}</strong>?
          <br />
          <span className="text-success">
            This will allow the visitor to schedule visits again.
          </span>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowRemoveBanModal(false)}>
            Cancel
          </Button>
          <Button variant="success" onClick={() => handleRemoveBan(selectedVisitor?.id)}>
            <CheckCircle size={16} className="me-1" />
            Remove Ban
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Remove Violation Modal */}
      <Modal show={showRemoveViolationModal} onHide={() => setShowRemoveViolationModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>
            <CheckCircle size={20} className="me-2 text-success" />
            Remove Violation
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to remove the violation from <strong>{selectedVisitor?.fullName}</strong>?
          <br />
          <span className="text-success">
            This will clear the violation record but keep the visitor's history.
          </span>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowRemoveViolationModal(false)}>
            Cancel
          </Button>
          <Button variant="success" onClick={() => handleRemoveViolation(selectedVisitor?.id)}>
            <CheckCircle size={16} className="me-1" />
            Remove Violation
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Reset Time Records Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>
            <Trash2 size={20} className="me-2 text-warning" />
            Reset Time Records
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to reset the time records for <strong>{selectedVisitor?.fullName}</strong>?
          <br />
          <span className="text-warning">
            This will clear their time-in and time-out records but keep their visitor profile and last visit date.
            The visitor will be able to check in again.
          </span>
          <div className="mt-3 p-2 bg-light rounded">
            <strong>What will be reset:</strong>
            <ul className="mb-0 mt-2">
              <li>Time In → Cleared</li>
              <li>Time Out → Cleared</li>
              <li>Check-in Status → Reset to "Not Checked In"</li>
              <li>Visit Date → Cleared</li>
            </ul>
            <strong className="mt-2 d-block">What will be preserved:</strong>
            <ul className="mb-0">
              <li>Last Visit Date → Preserved for history</li>
              <li>Visitor Profile → Unchanged</li>
              <li>Violation Records → Unchanged</li>
            </ul>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button variant="warning" onClick={() => handleResetTimeRecords(selectedVisitor?.id)}>
            <Trash2 size={16} className="me-1" />
            Reset Time Records
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default RecordVisits;