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
  Eye, 
  Check,
  X,
  Clock
} from 'react-feather';

const PendingRequests = () => {
  const [pendingGuests, setPendingGuests] = useState([]);
  const [filteredPendingGuests, setFilteredPendingGuests] = useState([]);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedGuest, setSelectedGuest] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchBy, setSearchBy] = useState('lastName');
  const [rejectionReason, setRejectionReason] = useState('');

  const searchOptions = [
    { value: 'lastName', label: 'Last Name' },
    { value: 'firstName', label: 'First Name' },
    { value: 'id', label: 'Request ID' },
    { value: 'visitPurpose', label: 'Visit Purpose' }
  ];

  useEffect(() => {
    fetchPendingGuests();
  }, []);

  useEffect(() => {
    filterPendingGuests();
  }, [searchQuery, searchBy, pendingGuests]);

  const fetchPendingGuests = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get("http://localhost:5000/pending-guests");
      // Filter only pending requests
      const pendingOnly = response.data.filter(guest => guest.status === 'pending');
      setPendingGuests(pendingOnly);
    } catch (error) {
      console.error("Error fetching pending guests:", error);
      toast.error("Failed to fetch pending requests");
    } finally {
      setIsLoading(false);
    }
  };

  const filterPendingGuests = () => {
    if (!searchQuery.trim()) {
      setFilteredPendingGuests(pendingGuests);
      return;
    }

    const filtered = pendingGuests.filter(guest => {
      const query = searchQuery.toLowerCase();
      const value = guest[searchBy]?.toString().toLowerCase() || '';
      return value.includes(query);
    });
    
    setFilteredPendingGuests(filtered);
  };

  const handleView = (guest) => {
    setSelectedGuest(guest);
    setShowViewModal(true);
  };

  const handleApprove = (guest) => {
    setSelectedGuest(guest);
    setShowApproveModal(true);
  };

  const handleReject = (guest) => {
    setSelectedGuest(guest);
    setRejectionReason('');
    setShowRejectModal(true);
  };

  const approveGuest = async () => {
    if (!selectedGuest) return;

    setIsLoading(true);
    try {
      // In a real app, you would get the admin user ID from auth context
      const adminUserId = 'admin-user-id'; // Replace with actual admin user ID

      await axios.put(`http://localhost:5000/pending-guests/${selectedGuest.id}/approve`, {
        approvedBy: adminUserId
      });

      toast.success('Guest approved successfully!');
      setShowApproveModal(false);
      fetchPendingGuests();
    } catch (error) {
      console.error('Error approving guest:', error);
      toast.error('Failed to approve guest');
    } finally {
      setIsLoading(false);
    }
  };

  const rejectGuest = async () => {
    if (!selectedGuest || !rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    setIsLoading(true);
    try {
      // In a real app, you would get the admin user ID from auth context
      const adminUserId = 'admin-user-id'; // Replace with actual admin user ID

      await axios.put(`http://localhost:5000/pending-guests/${selectedGuest.id}/reject`, {
        rejectedBy: adminUserId,
        rejectionReason: rejectionReason
      });

      toast.success('Guest request rejected successfully!');
      setShowRejectModal(false);
      setRejectionReason('');
      fetchPendingGuests();
    } catch (error) {
      console.error('Error rejecting guest:', error);
      toast.error('Failed to reject guest');
    } finally {
      setIsLoading(false);
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

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'N/A';
    }
  };

  const getStatusVariant = (status) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'approved': return 'success';
      case 'rejected': return 'danger';
      default: return 'secondary';
    }
  };

  return (
    <Container>
      <ToastContainer />
      
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 style={{ fontFamily: "Poppins, sans-serif", fontWeight: "600", color: "#2c3e50" }}>
            ⏳ Pending Guest Requests
          </h2>
          <Badge bg="warning" className="mb-2">
            Admin Approval Required
          </Badge>
        </div>
        <div className="text-muted">
          {pendingGuests.length} pending requests
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
                  placeholder="Search pending requests..."
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
        </Card.Body>
      </Card>

      {isLoading && pendingGuests.length === 0 ? (
        <div className="text-center">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading pending requests...</span>
          </Spinner>
        </div>
      ) : filteredPendingGuests.length === 0 ? (
        <Alert variant="success">
          {searchQuery ? 'No pending requests found matching your search.' : 'No pending guest requests. All clear!'}
        </Alert>
      ) : (
        <Table striped bordered hover responsive className="bg-white">
          <thead className="table-dark">
            <tr>
              <th>Request ID</th>
              <th>Full Name</th>
              <th>Gender</th>
              <th>Visit Purpose</th>
              <th>Submission Date</th>
              <th>Status</th>
              <th style={{ width: '150px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredPendingGuests.map(guest => (
              <tr key={guest._id}>
                <td><strong>{guest.id}</strong></td>
                <td>{guest.fullName}</td>
                <td>{guest.sex}</td>
                <td>{guest.visitPurpose}</td>
                <td>{formatDate(guest.submissionDate)}</td>
                <td>
                  <Badge bg={getStatusVariant(guest.status)}>
                    <Clock size={12} className="me-1" />
                    {guest.status.toUpperCase()}
                  </Badge>
                </td>
                <td>
                  <div className="d-flex gap-1">
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
                      variant="outline-success" 
                      size="sm" 
                      onClick={() => handleApprove(guest)}
                      className="p-1"
                      title="Approve Request"
                    >
                      <Check size={14} />
                    </Button>
                    <Button 
                      variant="outline-danger" 
                      size="sm" 
                      onClick={() => handleReject(guest)}
                      className="p-1"
                      title="Reject Request"
                    >
                      <X size={14} />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {/* View Modal */}
      <Modal show={showViewModal} onHide={() => setShowViewModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Guest Request Details - {selectedGuest?.id}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedGuest && (
            <Row>
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
                    <p><strong>Submission Date:</strong> {formatDate(selectedGuest.submissionDate)}</p>
                    <p><strong>Status:</strong> 
                      <Badge bg={getStatusVariant(selectedGuest.status)} className="ms-2">
                        {selectedGuest.status.toUpperCase()}
                      </Badge>
                    </p>
                  </Card.Body>
                </Card>

                {selectedGuest.violationType && (
                  <Card className="mb-3 border-warning">
                    <Card.Header className="bg-warning text-dark">
                      <strong>Violation Information</strong>
                    </Card.Header>
                    <Card.Body>
                      <p><strong>Violation Type:</strong> {selectedGuest.violationType}</p>
                      <p><strong>Violation Details:</strong> {selectedGuest.violationDetails || 'No violation data'}</p>
                    </Card.Body>
                  </Card>
                )}

                <Card className="mb-3">
                  <Card.Header>
                    <strong>QR Code</strong>
                  </Card.Header>
                  <Card.Body className="text-center">
                    {selectedGuest.qrCode ? (
                      <img 
                        src={selectedGuest.qrCode} 
                        alt="Guest QR Code" 
                        style={{ 
                          maxWidth: '200px', 
                          height: 'auto',
                          border: '1px solid #ddd',
                          borderRadius: '5px'
                        }}
                      />
                    ) : (
                      <Alert variant="warning">
                        QR code not generated.
                      </Alert>
                    )}
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowViewModal(false)}>
            Close
          </Button>
          <Button variant="success" onClick={() => handleApprove(selectedGuest)}>
            <Check size={16} className="me-1" />
            Approve
          </Button>
          <Button variant="danger" onClick={() => handleReject(selectedGuest)}>
            <X size={16} className="me-1" />
            Reject
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Approve Confirmation Modal */}
      <Modal show={showApproveModal} onHide={() => setShowApproveModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Approve Guest Request</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="success">
            <strong>Are you sure you want to approve this guest request?</strong>
          </Alert>
          <p>
            <strong>Guest:</strong> {selectedGuest?.fullName}<br/>
            <strong>Request ID:</strong> {selectedGuest?.id}<br/>
            <strong>Visit Purpose:</strong> {selectedGuest?.visitPurpose}
          </p>
          <p className="text-muted">
            Once approved, this guest will be added to the main guest list and can use the system.
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowApproveModal(false)}>
            Cancel
          </Button>
          <Button variant="success" onClick={approveGuest} disabled={isLoading}>
            {isLoading ? <Spinner size="sm" /> : 'Yes, Approve'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Reject Confirmation Modal */}
      <Modal show={showRejectModal} onHide={() => setShowRejectModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Reject Guest Request</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="danger">
            <strong>Are you sure you want to reject this guest request?</strong>
          </Alert>
          <p>
            <strong>Guest:</strong> {selectedGuest?.fullName}<br/>
            <strong>Request ID:</strong> {selectedGuest?.id}
          </p>
          <Form.Group className="mb-3">
            <Form.Label>Rejection Reason *</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Please provide a reason for rejection..."
              required
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowRejectModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={rejectGuest} disabled={isLoading || !rejectionReason.trim()}>
            {isLoading ? <Spinner size="sm" /> : 'Yes, Reject'}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default PendingRequests;