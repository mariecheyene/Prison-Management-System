import React, { useState, useEffect } from 'react';
import { 
  Container, Row, Col, Table, Button, Modal, Form, 
  Alert, Badge, Spinner, InputGroup, Card, ButtonGroup,
  Tabs, Tab
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
  Filter,
  Users,
  UserCheck
} from 'react-feather';

const PendingRequests = () => {
  const [pendingVisitors, setPendingVisitors] = useState([]);
  const [pendingGuests, setPendingGuests] = useState([]);
  const [filteredVisitors, setFilteredVisitors] = useState([]);
  const [filteredGuests, setFilteredGuests] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({ 
    pendingVisitors: 0, 
    pendingGuests: 0, 
    totalPending: 0 
  });
  const [rejectionReason, setRejectionReason] = useState('');
  const [activeTab, setActiveTab] = useState('visitors');

  useEffect(() => {
    fetchPendingRequests();
    fetchStats();
  }, []);

  useEffect(() => {
    filterRequests();
  }, [searchQuery, pendingVisitors, pendingGuests, activeTab]);

  const fetchPendingRequests = async () => {
    setIsLoading(true);
    try {
      const [visitorsResponse, guestsResponse] = await Promise.all([
        axios.get("http://localhost:5000/pending-visitors"),
        axios.get("http://localhost:5000/pending-guests")
      ]);
      setPendingVisitors(visitorsResponse.data);
      setPendingGuests(guestsResponse.data);
    } catch (error) {
      console.error("Error fetching pending requests:", error);
      toast.error("Failed to fetch pending requests");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const [visitorsStats, guestsStats] = await Promise.all([
        axios.get("http://localhost:5000/pending-visitors/stats"),
        axios.get("http://localhost:5000/pending-guests/stats")
      ]);
      
      setStats({
        pendingVisitors: visitorsStats.data.pending,
        pendingGuests: guestsStats.data.pending,
        totalPending: visitorsStats.data.pending + guestsStats.data.pending
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const filterRequests = () => {
    if (!searchQuery.trim()) {
      setFilteredVisitors(pendingVisitors);
      setFilteredGuests(pendingGuests);
      return;
    }

    const query = searchQuery.toLowerCase();
    
    if (activeTab === 'visitors') {
      const filtered = pendingVisitors.filter(visitor => {
        return (
          visitor.lastName?.toLowerCase().includes(query) ||
          visitor.firstName?.toLowerCase().includes(query) ||
          visitor.id?.toLowerCase().includes(query) ||
          visitor.prisonerId?.toLowerCase().includes(query)
        );
      });
      setFilteredVisitors(filtered);
    } else {
      const filtered = pendingGuests.filter(guest => {
        return (
          guest.lastName?.toLowerCase().includes(query) ||
          guest.firstName?.toLowerCase().includes(query) ||
          guest.id?.toLowerCase().includes(query) ||
          guest.visitPurpose?.toLowerCase().includes(query)
        );
      });
      setFilteredGuests(filtered);
    }
  };

  const handleView = (request, type) => {
    setSelectedRequest({ ...request, type });
    setShowModal(true);
  };

  const handleApprove = async (requestId, type) => {
    try {
      setIsLoading(true);
      let response;
      
      if (type === 'visitor') {
        response = await axios.post(`http://localhost:5000/pending-visitors/${requestId}/approve`);
        toast.success('Visitor approved successfully!');
      } else {
        response = await axios.post(`http://localhost:5000/pending-guests/${requestId}/approve`);
        toast.success('Guest approved successfully!');
      }
      
      fetchPendingRequests();
      fetchStats();
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
      
      if (type === 'visitor') {
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
      fetchPendingRequests();
      fetchStats();
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

  const getCurrentRequests = () => {
    return activeTab === 'visitors' ? filteredVisitors : filteredGuests;
  };

  const getCurrentCount = () => {
    return activeTab === 'visitors' ? filteredVisitors.length : filteredGuests.length;
  };

  return (
    <Container>
      <ToastContainer />
      
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 style={{ fontFamily: "Poppins, sans-serif", fontWeight: "600", color: "#2c3e50" }}>
            ⏳ Pending Approval Requests
          </h2>
          <Badge bg="warning" className="mb-2">
            Approval Required
          </Badge>
        </div>
      </div>

      {/* Stats Cards */}
      <Row className="mb-4">
        <Col md={4}>
          <Card className="border-warning">
            <Card.Body className="text-center">
              <Users size={24} className="text-warning mb-2" />
              <h4 className="text-warning">{stats.pendingVisitors}</h4>
              <p className="mb-0">Pending Visitors</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="border-warning">
            <Card.Body className="text-center">
              <UserCheck size={24} className="text-warning mb-2" />
              <h4 className="text-warning">{stats.pendingGuests}</h4>
              <p className="mb-0">Pending Guests</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="border-danger">
            <Card.Body className="text-center">
              <Clock size={24} className="text-danger mb-2" />
              <h4 className="text-danger">{stats.totalPending}</h4>
              <p className="mb-0">Total Pending</p>
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
            <Tab eventKey="visitors" title={
              <span>
                <Users size={16} className="me-1" />
                Visitors ({stats.pendingVisitors})
              </span>
            }>
              {/* Visitor tab content will be in the table below */}
            </Tab>
            <Tab eventKey="guests" title={
              <span>
                <UserCheck size={16} className="me-1" />
                Guests ({stats.pendingGuests})
              </span>
            }>
              {/* Guest tab content will be in the table below */}
            </Tab>
          </Tabs>

          <Row className="align-items-center">
            <Col md={8}>
              <InputGroup>
                <InputGroup.Text className="bg-white">
                  <Search size={16} />
                </InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder={`Search pending ${activeTab}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="border-start-0"
                />
              </InputGroup>
            </Col>
            <Col md={4}>
              <div className="text-muted small">
                {getCurrentCount()} pending {activeTab} found
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {isLoading && getCurrentCount() === 0 ? (
        <div className="text-center">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading pending requests...</span>
          </Spinner>
        </div>
      ) : getCurrentCount() === 0 ? (
        <Alert variant="info">
          {searchQuery 
            ? `No pending ${activeTab} found matching your search.` 
            : `No pending ${activeTab} requests. All clear!`
          }
        </Alert>
      ) : (
        <Table striped bordered hover responsive className="bg-white">
          <thead className="table-warning">
            <tr>
              <th>Request ID</th>
              <th>Full Name</th>
              <th>Gender</th>
              <th>Age</th>
              {activeTab === 'visitors' ? (
                <>
                  <th>Prisoner ID</th>
                  <th>Relationship</th>
                </>
              ) : (
                <th>Visit Purpose</th>
              )}
              <th>Contact</th>
              <th>Date Submitted</th>
              <th style={{ width: '180px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {getCurrentRequests().map(request => (
              <tr key={request._id}>
                <td><strong>{request.id}</strong></td>
                <td>{request.fullName}</td>
                <td>{request.sex}</td>
                <td>{calculateAge(request.dateOfBirth)}</td>
                {activeTab === 'visitors' ? (
                  <>
                    <td>{request.prisonerId}</td>
                    <td>{request.relationship}</td>
                  </>
                ) : (
                  <td>{request.visitPurpose}</td>
                )}
                <td>{request.contact}</td>
                <td>
                  {new Date(request.createdAt).toLocaleDateString()}
                </td>
                <td>
                  <ButtonGroup size="sm">
                    <Button 
                      variant="outline-info" 
                      onClick={() => handleView(request, activeTab)}
                      title="View Details"
                    >
                      <Eye size={14} />
                    </Button>
                    <Button 
                      variant="outline-success" 
                      onClick={() => handleApprove(request.id, activeTab)}
                      disabled={isLoading}
                      title="Approve"
                    >
                      <Check size={14} />
                    </Button>
                    <Button 
                      variant="outline-danger" 
                      onClick={() => openRejectModal(request, activeTab)}
                      disabled={isLoading}
                      title="Reject"
                    >
                      <X size={14} />
                    </Button>
                  </ButtonGroup>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {/* View Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {selectedRequest?.type === 'visitor' ? 'Visitor' : 'Guest'} Request Details - {selectedRequest?.id}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedRequest && (
            <Row>
              <Col md={6}>
                <Card className="mb-3">
                  <Card.Header>
                    <strong>
                      {selectedRequest.type === 'visitor' ? 'Visitor' : 'Guest'} Information
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
                      {selectedRequest.type === 'visitor' ? 'Visit' : 'Guest'} Details
                    </strong>
                  </Card.Header>
                  <Card.Body>
                    {selectedRequest.type === 'visitor' ? (
                      <>
                        <p><strong>Prisoner ID:</strong> {selectedRequest.prisonerId}</p>
                        <p><strong>Relationship:</strong> {selectedRequest.relationship}</p>
                      </>
                    ) : (
                      <p><strong>Visit Purpose:</strong> {selectedRequest.visitPurpose}</p>
                    )}
                    <p><strong>Status:</strong> <Badge bg="warning">Pending Approval</Badge></p>
                    <p><strong>Submitted:</strong> {new Date(selectedRequest.createdAt).toLocaleString()}</p>
                  </Card.Body>
                </Card>
                
                <Card className="border-warning">
                  <Card.Header className="bg-warning text-dark">
                    <strong>Approval Actions</strong>
                  </Card.Header>
                  <Card.Body>
                    <p className="text-muted small mb-3">
                      Review the {selectedRequest.type} information before approving or rejecting this request.
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
                        Approve {selectedRequest.type === 'visitor' ? 'Visitor' : 'Guest'}
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
              </Col>
            </Row>
          )}
        </Modal.Body>
      </Modal>

      {/* Reject Modal */}
      <Modal show={showRejectModal} onHide={() => setShowRejectModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>
            Reject {selectedRequest?.type === 'visitor' ? 'Visitor' : 'Guest'} Request
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