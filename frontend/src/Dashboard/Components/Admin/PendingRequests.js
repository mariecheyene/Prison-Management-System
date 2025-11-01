import React, { useState, useEffect } from 'react';
import { 
  Container, Row, Col, Table, Button, Modal, Form, 
  Alert, Badge, Spinner, InputGroup, Card, ButtonGroup,
  Tabs, Tab, Nav
} from 'react-bootstrap';
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import axios from "axios";
import { 
  Search, 
  Check, 
  X, 
  Eye,
  User,
  Clock,
  Users,
  UserCheck,
  Archive,
  RefreshCw
} from 'react-feather';

const PendingRequests = () => {
  const [pendingVisitors, setPendingVisitors] = useState([]);
  const [pendingGuests, setPendingGuests] = useState([]);
  const [rejectedVisitors, setRejectedVisitors] = useState([]);
  const [rejectedGuests, setRejectedGuests] = useState([]);
  const [filteredVisitors, setFilteredVisitors] = useState([]);
  const [filteredGuests, setFilteredGuests] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [activeTab, setActiveTab] = useState('pending');
  const [requestType, setRequestType] = useState('visitors');

  // Calculate counts from actual data arrays
  const stats = {
    pendingVisitors: pendingVisitors.length,
    pendingGuests: pendingGuests.length,
    rejectedVisitors: rejectedVisitors.length,
    rejectedGuests: rejectedGuests.length,
    totalPending: pendingVisitors.length + pendingGuests.length,
    totalRejected: rejectedVisitors.length + rejectedGuests.length
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    filterRequests();
  }, [searchQuery, pendingVisitors, pendingGuests, rejectedVisitors, rejectedGuests, activeTab, requestType]);

  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        fetchPendingRequests(),
        fetchRejectedRequests()
      ]);
      console.log('✅ All data fetched successfully');
      console.log('📊 Current counts:', stats);
    } catch (error) {
      console.error('❌ Error fetching all data:', error);
      toast.error('Failed to fetch data');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPendingRequests = async () => {
    try {
      console.log('📥 Fetching pending requests...');
      const [visitorsResponse, guestsResponse] = await Promise.all([
        axios.get("http://localhost:5000/pending-visitors"),
        axios.get("http://localhost:5000/pending-guests")
      ]);
      
      console.log('✅ Pending visitors:', visitorsResponse.data.length);
      console.log('✅ Pending guests:', guestsResponse.data.length);
      
      setPendingVisitors(visitorsResponse.data);
      setPendingGuests(guestsResponse.data);
    } catch (error) {
      console.error("❌ Error fetching pending requests:", error);
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
      }
      toast.error("Failed to fetch pending requests");
    }
  };

  const fetchRejectedRequests = async () => {
    try {
      console.log('📥 Fetching rejected requests...');
      const [visitorsResponse, guestsResponse] = await Promise.all([
        axios.get("http://localhost:5000/pending-visitors?status=rejected"),
        axios.get("http://localhost:5000/pending-guests?status=rejected")
      ]);
      
      console.log('✅ Rejected visitors:', visitorsResponse.data.length);
      console.log('✅ Rejected guests:', guestsResponse.data.length);
      
      setRejectedVisitors(visitorsResponse.data);
      setRejectedGuests(guestsResponse.data);
    } catch (error) {
      console.error("❌ Error fetching rejected requests:", error);
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
      }
      toast.error("Failed to fetch rejected requests");
    }
  };

  const filterRequests = () => {
    if (!searchQuery.trim()) {
      // No search query - show all requests for current tab and type
      if (activeTab === 'pending') {
        setFilteredVisitors(pendingVisitors);
        setFilteredGuests(pendingGuests);
      } else {
        setFilteredVisitors(rejectedVisitors);
        setFilteredGuests(rejectedGuests);
      }
      return;
    }

    const query = searchQuery.toLowerCase();
    
    if (activeTab === 'pending') {
      if (requestType === 'visitors') {
        const filtered = pendingVisitors.filter(visitor => 
          visitor.lastName?.toLowerCase().includes(query) ||
          visitor.firstName?.toLowerCase().includes(query) ||
          visitor.id?.toLowerCase().includes(query) ||
          visitor.prisonerId?.toLowerCase().includes(query) ||
          visitor.prisonerName?.toLowerCase().includes(query) // ADDED: Search by prisoner name
        );
        setFilteredVisitors(filtered);
      } else {
        const filtered = pendingGuests.filter(guest => 
          guest.lastName?.toLowerCase().includes(query) ||
          guest.firstName?.toLowerCase().includes(query) ||
          guest.id?.toLowerCase().includes(query) ||
          guest.visitPurpose?.toLowerCase().includes(query)
        );
        setFilteredGuests(filtered);
      }
    } else {
      if (requestType === 'visitors') {
        const filtered = rejectedVisitors.filter(visitor => 
          visitor.lastName?.toLowerCase().includes(query) ||
          visitor.firstName?.toLowerCase().includes(query) ||
          visitor.id?.toLowerCase().includes(query) ||
          visitor.prisonerId?.toLowerCase().includes(query) ||
          visitor.prisonerName?.toLowerCase().includes(query) // ADDED: Search by prisoner name
        );
        setFilteredVisitors(filtered);
      } else {
        const filtered = rejectedGuests.filter(guest => 
          guest.lastName?.toLowerCase().includes(query) ||
          guest.firstName?.toLowerCase().includes(query) ||
          guest.id?.toLowerCase().includes(query) ||
          guest.visitPurpose?.toLowerCase().includes(query)
        );
        setFilteredGuests(filtered);
      }
    }
  };

  const handleView = (request, type) => {
    setSelectedRequest({ ...request, type });
    setShowModal(true);
  };

  const handleApprove = async (requestId, type) => {
    try {
      setIsLoading(true);
      
      if (type === 'visitors') {
        await axios.post(`http://localhost:5000/pending-visitors/${requestId}/approve`);
        toast.success('Visitor approved successfully!');
      } else {
        await axios.post(`http://localhost:5000/pending-guests/${requestId}/approve`);
        toast.success('Guest approved successfully!');
      }
      
      // Refresh all data
      await fetchAllData();
    } catch (error) {
      console.error("Error approving request:", error);
      toast.error(error.response?.data?.message || `Failed to approve ${type}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async (requestId, type) => {
    try {
      setIsLoading(true);
      
      if (type === 'visitors') {
        await axios.post(`http://localhost:5000/pending-visitors/${requestId}/reject`, {
          rejectionReason
        });
        toast.success('Visitor rejected successfully!');
      } else {
        await axios.post(`http://localhost:5000/pending-guests/${requestId}/reject`, {
          rejectionReason
        });
        toast.success('Guest rejected successfully!');
      }
      
      setShowRejectModal(false);
      setRejectionReason('');
      
      // Refresh all data
      await fetchAllData();
    } catch (error) {
      console.error("Error rejecting request:", error);
      toast.error(error.response?.data?.message || `Failed to reject ${type}`);
    } finally {
      setIsLoading(false);
    }
  };

  const openRejectModal = (request, type) => {
    setSelectedRequest({ ...request, type });
    setShowRejectModal(true);
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

  // Get current requests from filtered arrays
  const getCurrentRequests = () => {
    return requestType === 'visitors' ? filteredVisitors : filteredGuests;
  };

  // Get count from filtered arrays for display
  const getCurrentCount = () => {
    return getCurrentRequests().length;
  };

  const getStatusBadge = () => {
    return activeTab === 'pending' ? 
      <Badge bg="warning">Pending Approval</Badge> : 
      <Badge bg="danger">Rejected</Badge>;
  };

  const refreshAll = () => {
    fetchAllData();
    toast.info("Data refreshed successfully!");
  };

  return (
    <Container>
      <ToastContainer />

      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 style={{ fontFamily: "Poppins, sans-serif", fontWeight: "600", color: "#2c3e50" }}>
            ⏳ Approval Requests Management
          </h2>
          <Badge bg={activeTab === 'pending' ? "warning" : "danger"} className="mb-2">
            {activeTab === 'pending' ? 'Approval Required' : 'Rejected Requests'}
          </Badge>
        </div>
        <Button variant="outline-primary" onClick={refreshAll} disabled={isLoading}>
          <RefreshCw size={16} className="me-1" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards - Using actual array lengths */}
      <Row className="mb-4">
        <Col md={3}>
          <Card className="border-warning">
            <Card.Body className="text-center">
              <Users size={24} className="text-warning mb-2" />
              <h4 className="text-warning">{stats.pendingVisitors}</h4>
              <p className="mb-0">Pending Visitors</p>
              <small className="text-muted">Actual: {pendingVisitors.length}</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-warning">
            <Card.Body className="text-center">
              <UserCheck size={24} className="text-warning mb-2" />
              <h4 className="text-warning">{stats.pendingGuests}</h4>
              <p className="mb-0">Pending Guests</p>
              <small className="text-muted">Actual: {pendingGuests.length}</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-danger">
            <Card.Body className="text-center">
              <Archive size={24} className="text-danger mb-2" />
              <h4 className="text-danger">{stats.rejectedVisitors}</h4>
              <p className="mb-0">Rejected Visitors</p>
              <small className="text-muted">Actual: {rejectedVisitors.length}</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-danger">
            <Card.Body className="text-center">
              <Archive size={24} className="text-danger mb-2" />
              <h4 className="text-danger">{stats.rejectedGuests}</h4>
              <p className="mb-0">Rejected Guests</p>
              <small className="text-muted">Actual: {rejectedGuests.length}</small>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Tabs and Search Section */}
      <Card className="mb-4 border-0 bg-light">
        <Card.Body>
          <Tabs
            activeKey={activeTab}
            onSelect={(tab) => setActiveTab(tab)}
            className="mb-3"
          >
            <Tab eventKey="pending" title={
              <span>
                <Clock size={16} className="me-1" />
                Pending Requests ({stats.totalPending})
              </span>
            }>
              {/* Pending requests content */}
            </Tab>
            <Tab eventKey="rejected" title={
              <span>
                <Archive size={16} className="me-1" />
                Rejected Requests ({stats.totalRejected})
              </span>
            }>
              {/* Rejected requests content */}
            </Tab>
          </Tabs>

          <Row className="align-items-center mb-3">
            <Col md={6}>
              <Nav variant="pills" activeKey={requestType} onSelect={setRequestType}>
                <Nav.Item>
                  <Nav.Link eventKey="visitors">
                    <Users size={14} className="me-1" />
                    Visitors ({activeTab === 'pending' ? stats.pendingVisitors : stats.rejectedVisitors})
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey="guests">
                    <UserCheck size={14} className="me-1" />
                    Guests ({activeTab === 'pending' ? stats.pendingGuests : stats.rejectedGuests})
                  </Nav.Link>
                </Nav.Item>
              </Nav>
            </Col>
            <Col md={6}>
              <InputGroup>
                <InputGroup.Text className="bg-white">
                  <Search size={16} />
                </InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder={`Search ${activeTab} ${requestType}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="border-start-0"
                />
              </InputGroup>
            </Col>
          </Row>

          <Row>
            <Col>
              <div className="text-muted small">
                Showing {getCurrentCount()} {activeTab} {requestType} 
                {searchQuery && ` matching "${searchQuery}"`}
                {getCurrentCount() === 0 && searchQuery && (
                  <span> - <Button variant="link" size="sm" onClick={() => setSearchQuery('')}>Clear search</Button></span>
                )}
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {isLoading && getCurrentCount() === 0 ? (
        <div className="text-center py-4">
          <Spinner animation="border" variant="primary" />
          <p className="mt-2">Loading requests...</p>
        </div>
      ) : getCurrentCount() === 0 ? (
        <Alert variant="info" className="text-center">
          {searchQuery 
            ? `No ${activeTab} ${requestType} found matching "${searchQuery}"` 
            : `No ${activeTab} ${requestType} requests found.`
          }
        </Alert>
      ) : (
        <div className="table-responsive" style={{ fontSize: '14px' }}>
          <Table striped bordered hover responsive className="bg-white">
            <thead className={activeTab === 'pending' ? 'table-warning' : 'table-danger'}>
              <tr>
                <th className="text-center">Request ID</th>
                <th className="text-center">Full Name</th>
                <th className="text-center">Gender</th>
                <th className="text-center">Age</th>
                {requestType === 'visitors' ? (
                  <>
                    <th className="text-center">Inmate ID</th>
                    <th className="text-center">Inmate Name</th> {/* ADDED: Prisoner Name Column */}
                    <th className="text-center">Relationship</th>
                  </>
                ) : (
                  <th className="text-center">Visit Purpose</th>
                )}
                <th className="text-center">Contact</th>
                <th className="text-center">Date Submitted</th>
                {activeTab === 'rejected' && <th className="text-center">Rejection Reason</th>}
                <th className="text-center" style={{ width: activeTab === 'pending' ? '180px' : '100px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {getCurrentRequests().map(request => (
                <tr key={request._id}>
                  <td className="text-center"><strong>{request.id}</strong></td>
                  <td className="text-center">{request.fullName}</td>
                  <td className="text-center">{request.sex}</td>
                  <td className="text-center">{calculateAge(request.dateOfBirth)}</td>
                  {requestType === 'visitors' ? (
                    <>
                      <td className="text-center">{request.prisonerId}</td>
                      <td className="text-center">{request.prisonerName || 'N/A'}</td> {/* ADDED: Prisoner Name */}
                      <td className="text-center">{request.relationship}</td>
                    </>
                  ) : (
                    <td className="text-center">{request.visitPurpose}</td>
                  )}
                  <td className="text-center">{request.contact}</td>
                  <td className="text-center">
                    {new Date(request.createdAt).toLocaleDateString()}
                  </td>
                  {activeTab === 'rejected' && (
                    <td className="text-center">{request.rejectionReason || 'No reason provided'}</td>
                  )}
                  <td className="text-center">
                    <ButtonGroup size="sm">
                      <Button 
                        variant="outline-info" 
                        onClick={() => handleView(request, requestType)}
                        title="View Details"
                      >
                        <Eye size={14} />
                      </Button>
                      {activeTab === 'pending' && (
                        <>
                          <Button 
                            variant="outline-success" 
                            onClick={() => handleApprove(request.id, requestType)}
                            disabled={isLoading}
                            title="Approve"
                          >
                            <Check size={14} />
                          </Button>
                          <Button 
                            variant="outline-danger" 
                            onClick={() => openRejectModal(request, requestType)}
                            disabled={isLoading}
                            title="Reject"
                          >
                            <X size={14} />
                          </Button>
                        </>
                      )}
                    </ButtonGroup>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}

      {/* View Modal - Updated with Prisoner Name */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {selectedRequest?.type === 'visitors' ? 'Visitor' : 'Guest'} Request Details - {selectedRequest?.id}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedRequest && (
            <Row>
              <Col md={6}>
                <Card className="mb-3">
                  <Card.Header>
                    <strong>
                      {selectedRequest.type === 'visitors' ? 'Visitor' : 'Guest'} Information
                    </strong>
                  </Card.Header>
                  <Card.Body>
                    {selectedRequest.photo && (
                      <div className="text-center mb-3">
                        <img 
                          src={`http://localhost:5000/uploads/${selectedRequest.photo}`}
                          alt={selectedRequest.type}
                          style={{ 
                            maxWidth: '200px', 
                            maxHeight: '200px', 
                            objectFit: 'cover',
                            borderRadius: '5px'
                          }}
                        />
                      </div>
                    )}
                    <p><strong>Full Name:</strong> {selectedRequest.fullName}</p>
                    <p><strong>Gender:</strong> {selectedRequest.sex}</p>
                    <p><strong>Date of Birth:</strong> {new Date(selectedRequest.dateOfBirth).toLocaleDateString()}</p>
                    <p><strong>Age:</strong> {calculateAge(selectedRequest.dateOfBirth)}</p>
                    <p><strong>Address:</strong> {selectedRequest.address}</p>
                    <p><strong>Contact:</strong> {selectedRequest.contact || 'N/A'}</p>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={6}>
                <Card className="mb-3">
                  <Card.Header>
                    <strong>
                      {selectedRequest.type === 'visitors' ? 'Visit' : 'Guest'} Details
                    </strong>
                  </Card.Header>
                  <Card.Body>
                    {selectedRequest.type === 'visitors' ? (
                      <>
                        <p><strong>Inmate ID:</strong> {selectedRequest.prisonerId}</p>
                        <p><strong>Inmate Name:</strong> {selectedRequest.prisonerName || 'N/A'}</p> {/* ADDED: Prisoner Name */}
                        <p><strong>Relationship:</strong> {selectedRequest.relationship}</p>
                      </>
                    ) : (
                      <p><strong>Visit Purpose:</strong> {selectedRequest.visitPurpose}</p>
                    )}
                    <p><strong>Status:</strong> {getStatusBadge()}</p>
                    <p><strong>Submitted:</strong> {new Date(selectedRequest.createdAt).toLocaleString()}</p>
                    {selectedRequest.rejectionReason && (
                      <p><strong>Rejection Reason:</strong> {selectedRequest.rejectionReason}</p>
                    )}
                  </Card.Body>
                </Card>
                
                {activeTab === 'pending' && (
                  <Card className="border-warning">
                    <Card.Header className="bg-warning text-dark">
                      <strong>Approval Actions</strong>
                    </Card.Header>
                    <Card.Body>
                      <p className="text-muted small mb-3">
                        Review the {selectedRequest.type === 'visitors' ? 'visitor' : 'guest'} information before approving or rejecting this request.
                      </p>
                      <div className="d-grid gap-2">
                        <Button 
                          variant="success" 
                          onClick={() => {
                            handleApprove(selectedRequest.id, selectedRequest.type);
                            setShowModal(false);
                          }}
                          disabled={isLoading}
                        >
                          <Check size={16} className="me-1" />
                          Approve {selectedRequest.type === 'visitors' ? 'Visitor' : 'Guest'}
                        </Button>
                        <Button 
                          variant="outline-danger" 
                          onClick={() => {
                            setShowModal(false);
                            openRejectModal(selectedRequest, selectedRequest.type);
                          }}
                          disabled={isLoading}
                        >
                          <X size={16} className="me-1" />
                          Reject Request
                        </Button>
                      </div>
                    </Card.Body>
                  </Card>
                )}
              </Col>
            </Row>
          )}
        </Modal.Body>
      </Modal>

      {/* Reject Modal - Same as before */}
      <Modal show={showRejectModal} onHide={() => setShowRejectModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>
            Reject {selectedRequest?.type === 'visitors' ? 'Visitor' : 'Guest'} Request
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>
            Are you sure you want to reject <strong>{selectedRequest?.fullName}</strong>?
          </p>
          <Form.Group className="mb-3">
            <Form.Label>Rejection Reason (Optional)</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Enter reason for rejection..."
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowRejectModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="danger" 
            onClick={() => handleReject(selectedRequest?.id, selectedRequest?.type)}
            disabled={isLoading}
          >
            {isLoading ? <Spinner size="sm" /> : 'Reject Request'}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default PendingRequests;