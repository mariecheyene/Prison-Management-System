import React, { useState, useEffect } from 'react';
import { Container, Table, Button, Modal, Form, Badge, Spinner, Alert, Card, Row, Col } from 'react-bootstrap';
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import axios from 'axios';
import { Edit2, Trash2, Maximize2, Check, X } from 'react-feather';

const Guest = () => {
  const [guests, setGuests] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingGuest, setEditingGuest] = useState(null);
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
    dateVisited: new Date().toISOString().split('T')[0],
    timeIn: '',
    timeOut: '',
    status: 'pending'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedGuestQR, setSelectedGuestQR] = useState('');
  const [currentUser, setCurrentUser] = useState(null);

  // API base URL
  const API_BASE = 'http://localhost:5000';

  useEffect(() => {
    fetchGuests();
    // Get current user from localStorage or context
    const userData = localStorage.getItem('user');
    if (userData) {
      setCurrentUser(JSON.parse(userData));
    }
  }, []);

  const fetchGuests = async () => {
    setFetchLoading(true);
    try {
      const response = await axios.get(`${API_BASE}/guests`);
      setGuests(response.data);
    } catch (error) {
      console.error('Error fetching guests:', error);
      toast.error('Failed to fetch guests. Check if backend is running.');
    } finally {
      setFetchLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.lastName.trim() || !formData.firstName.trim()) {
      toast.error('Last name and first name are required');
      return;
    }

    if (!formData.visitPurpose.trim()) {
      toast.error('Visit purpose is required');
      return;
    }

    setIsLoading(true);
    
    try {
      const url = editingGuest 
        ? `${API_BASE}/guests/${editingGuest.id}`
        : `${API_BASE}/guests`;
      
      const method = editingGuest ? 'PUT' : 'POST';
      
      // Auto-approve if user is admin
      const isAdmin = currentUser && (
        currentUser.role === 'FullAdmin' || 
        currentUser.role === 'MaleAdmin' || 
        currentUser.role === 'FemaleAdmin'
      );
      
      const payload = {
        ...formData,
        age: parseInt(formData.age) || 0,
        // Auto-approve if admin is creating the guest
        status: isAdmin ? 'approved' : 'pending',
        createdBy: currentUser?._id || currentUser?.id
      };

      const response = await axios({
        method: method,
        url: url,
        data: payload
      });

      toast.success(`Guest ${editingGuest ? 'updated' : 'created'} successfully${isAdmin ? ' (Auto-approved)' : ' (Pending approval)'}`);
      setShowModal(false);
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
        dateVisited: new Date().toISOString().split('T')[0],
        timeIn: '',
        timeOut: '',
        status: 'pending'
      });
      fetchGuests();
      
    } catch (error) {
      console.error('Error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to process guest';
      toast.error(`Error: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (guestId) => {
    if (!window.confirm('Are you sure you want to delete this guest?')) {
      return;
    }

    setIsLoading(true);
    try {
      await axios.delete(`${API_BASE}/guests/${guestId}`);
      toast.success('Guest deleted successfully');
      fetchGuests();
    } catch (error) {
      console.error('Error deleting guest:', error);
      toast.error('Failed to delete guest');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (guestId) => {
    setIsLoading(true);
    try {
      await axios.put(`${API_BASE}/guests/${guestId}`, {
        status: 'approved',
        approvedBy: currentUser?._id || currentUser?.id,
        approvedAt: new Date()
      });
      toast.success('Guest approved successfully');
      fetchGuests();
    } catch (error) {
      console.error('Error approving guest:', error);
      toast.error('Failed to approve guest');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async (guestId) => {
    if (!window.confirm('Are you sure you want to reject this guest?')) {
      return;
    }

    setIsLoading(true);
    try {
      await axios.put(`${API_BASE}/guests/${guestId}`, {
        status: 'rejected',
        rejectedBy: currentUser?._id || currentUser?.id,
        rejectedAt: new Date()
      });
      toast.success('Guest rejected successfully');
      fetchGuests();
    } catch (error) {
      console.error('Error rejecting guest:', error);
      toast.error('Failed to reject guest');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTimeIn = async (guestId) => {
    const currentTime = new Date().toLocaleTimeString('en-US', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit'
    });
    
    setIsLoading(true);
    try {
      await axios.put(`${API_BASE}/guests/${guestId}`, {
        timeIn: currentTime,
        hasTimedIn: true,
        lastVisitDate: new Date()
      });
      toast.success('Guest timed in successfully');
      fetchGuests();
    } catch (error) {
      console.error('Error timing in:', error);
      toast.error('Failed to time in guest');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTimeOut = async (guestId) => {
    const currentTime = new Date().toLocaleTimeString('en-US', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit'
    });
    
    setIsLoading(true);
    try {
      await axios.put(`${API_BASE}/guests/${guestId}`, {
        timeOut: currentTime,
        hasTimedOut: true
      });
      toast.success('Guest timed out successfully');
      fetchGuests();
    } catch (error) {
      console.error('Error timing out:', error);
      toast.error('Failed to time out guest');
    } finally {
      setIsLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingGuest(null);
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
      dateVisited: new Date().toISOString().split('T')[0],
      timeIn: '',
      timeOut: '',
      status: 'pending'
    });
    setShowModal(true);
  };

  const openEditModal = (guest) => {
    setEditingGuest(guest);
    setFormData({
      lastName: guest.lastName,
      firstName: guest.firstName,
      middleName: guest.middleName || '',
      extension: guest.extension || '',
      dateOfBirth: guest.dateOfBirth ? guest.dateOfBirth.split('T')[0] : '',
      age: guest.age || '',
      sex: guest.sex || '',
      address: guest.address || '',
      contact: guest.contact || '',
      visitPurpose: guest.visitPurpose || '',
      dateVisited: guest.dateVisited ? guest.dateVisited.split('T')[0] : new Date().toISOString().split('T')[0],
      timeIn: guest.timeIn || '',
      timeOut: guest.timeOut || '',
      status: guest.status || 'pending'
    });
    setShowModal(true);
  };

  const openQRModal = async (guest) => {
    try {
      const response = await axios.get(`${API_BASE}/guests/${guest.id}/qrcode`);
      setSelectedGuestQR(response.data.qrCode);
      setShowQRModal(true);
    } catch (error) {
      console.error('Error fetching QR code:', error);
      toast.error('Failed to generate QR code');
    }
  };

  const closeModal = () => {
    setShowModal(false);
  };

  const closeQRModal = () => {
    setShowQRModal(false);
    setSelectedGuestQR('');
  };

  const formatFullName = (guest) => {
    return `${guest.lastName}, ${guest.firstName} ${guest.middleName || ''} ${guest.extension || ''}`.trim();
  };

  // Check if current user is admin
  const isAdmin = currentUser && (
    currentUser.role === 'FullAdmin' || 
    currentUser.role === 'MaleAdmin' || 
    currentUser.role === 'FemaleAdmin'
  );

  // Check if current user is staff
  const isStaff = currentUser && (
    currentUser.role === 'FullStaff' || 
    currentUser.role === 'MaleStaff' || 
    currentUser.role === 'FemaleStaff'
  );

  return (
    <Container>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 style={{ fontFamily: "Poppins, sans-serif", fontWeight: "600", color: "#2c3e50" }}>
          👥 Guest Management
        </h2>
        <Button variant="primary" onClick={openAddModal} disabled={isLoading}>
          + Add Guest
        </Button>
      </div>

      {/* Guest Information Card */}
      <Row className="mb-4">
        <Col md={12}>
          <Card>
            <Card.Header>
              <h6 className="mb-0">Guest Information & Approval System</h6>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={6}>
                  <strong>Approval Workflow:</strong>
                  <ul className="mb-0 mt-2">
                    <li>👤 <strong>Staff:</strong> Create guests with "Pending" status</li>
                    <li>👑 <strong>Admin:</strong> Auto-approve when creating guests</li>
                    <li>✅ <strong>Admin:</strong> Can approve/reject pending guests</li>
                    <li>⏰ <strong>Time Tracking:</strong> Only for approved guests</li>
                  </ul>
                </Col>
                <Col md={6}>
                  <strong>Status Meanings:</strong>
                  <ul className="mb-0 mt-2">
                    <li><Badge bg="warning">Pending</Badge> - Waiting for admin approval</li>
                    <li><Badge bg="success">Approved</Badge> - Can enter facility</li>
                    <li><Badge bg="danger">Rejected</Badge> - Not allowed to enter</li>
                    <li><Badge bg="info">Completed</Badge> - Visit finished</li>
                  </ul>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {fetchLoading ? (
        <div className="text-center">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading guests...</span>
          </Spinner>
          <p className="mt-2">Loading guests...</p>
        </div>
      ) : guests.length === 0 ? (
        <Alert variant="info">
          No guests found. Add your first guest to get started.
        </Alert>
      ) : (
        <Table striped bordered hover responsive>
          <thead>
            <tr>
              <th>Guest Name</th>
              <th>Contact</th>
              <th>Visit Purpose</th>
              <th>Visit Date</th>
              <th>Time In/Out</th>
              <th>Status</th>
              <th style={{ width: '180px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {guests.map(guest => (
              <tr key={guest.id}>
                <td>
                  <div>
                    <strong>{formatFullName(guest)}</strong>
                    <div className="text-muted small">{guest.sex} • {guest.age} years</div>
                    {guest.createdBy && (
                      <div className="text-muted small">Created by: {guest.createdBy.name || 'System'}</div>
                    )}
                  </div>
                </td>
                <td>
                  {guest.contact && <div>{guest.contact}</div>}
                  {guest.address && <div className="text-muted small">{guest.address}</div>}
                </td>
                <td>{guest.visitPurpose}</td>
                <td>
                  {guest.dateVisited ? new Date(guest.dateVisited).toLocaleDateString() : 'N/A'}
                </td>
                <td>
                  <div className="small">
                    {guest.timeIn && <div>In: {guest.timeIn}</div>}
                    {guest.timeOut && <div>Out: {guest.timeOut}</div>}
                    {!guest.timeIn && !guest.timeOut && guest.status === 'approved' && (
                      <div className="text-muted">Ready for time in</div>
                    )}
                    {!guest.timeIn && !guest.timeOut && guest.status !== 'approved' && (
                      <div className="text-muted">Not approved</div>
                    )}
                  </div>
                </td>
                <td>
                  <Badge bg={
                    guest.status === 'approved' ? 'success' : 
                    guest.status === 'pending' ? 'warning' : 
                    guest.status === 'rejected' ? 'danger' : 'info'
                  }>
                    {guest.status?.charAt(0).toUpperCase() + guest.status?.slice(1)}
                  </Badge>
                </td>
                <td>
                  <div className="d-flex gap-1 justify-content-center">
                    <Button 
                      variant="outline-info" 
                      size="sm" 
                      onClick={() => openQRModal(guest)}
                      disabled={isLoading}
                      className="p-1"
                      title="View QR Code"
                    >
                      <Maximize2 size={14} />
                    </Button>
                    
                    {/* Time In/Out - Only for approved guests */}
                    {guest.status === 'approved' && !guest.hasTimedIn && (
                      <Button 
                        variant="outline-success" 
                        size="sm" 
                        onClick={() => handleTimeIn(guest.id)}
                        disabled={isLoading}
                        className="p-1"
                        title="Time In"
                      >
                        ⏰ In
                      </Button>
                    )}
                    {guest.status === 'approved' && guest.hasTimedIn && !guest.hasTimedOut && (
                      <Button 
                        variant="outline-warning" 
                        size="sm" 
                        onClick={() => handleTimeOut(guest.id)}
                        disabled={isLoading}
                        className="p-1"
                        title="Time Out"
                      >
                        ⏰ Out
                      </Button>
                    )}

                    {/* Approval/Rejection - Only for admins and pending guests */}
                    {isAdmin && guest.status === 'pending' && (
                      <>
                        <Button 
                          variant="outline-success" 
                          size="sm" 
                          onClick={() => handleApprove(guest.id)}
                          disabled={isLoading}
                          className="p-1"
                          title="Approve Guest"
                        >
                          <Check size={14} />
                        </Button>
                        <Button 
                          variant="outline-danger" 
                          size="sm" 
                          onClick={() => handleReject(guest.id)}
                          disabled={isLoading}
                          className="p-1"
                          title="Reject Guest"
                        >
                          <X size={14} />
                        </Button>
                      </>
                    )}

                    <Button 
                      variant="outline-primary" 
                      size="sm" 
                      onClick={() => openEditModal(guest)}
                      disabled={isLoading || (guest.status === 'approved' && !isAdmin)}
                      className="p-1"
                      title="Edit Guest"
                    >
                      <Edit2 size={14} />
                    </Button>
                    
                    <Button 
                      variant="outline-danger" 
                      size="sm" 
                      onClick={() => handleDelete(guest.id)}
                      disabled={isLoading || (guest.status === 'approved' && !isAdmin)}
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

      {/* Add/Edit Guest Modal */}
      <Modal show={showModal} onHide={closeModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {editingGuest ? 'Edit Guest' : 'Add New Guest'}
            {isAdmin && !editingGuest && (
              <Badge bg="success" className="ms-2">Auto-approve</Badge>
            )}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            {!editingGuest && (
              <Alert variant={isAdmin ? "success" : "warning"} className="mb-3">
                {isAdmin 
                  ? "✅ You are an admin. This guest will be automatically approved."
                  : "⏳ This guest will be created as pending and require admin approval."
                }
              </Alert>
            )}
            
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Last Name *</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                    required
                    placeholder="Enter last name"
                    disabled={isLoading}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>First Name *</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                    required
                    placeholder="Enter first name"
                    disabled={isLoading}
                  />
                </Form.Group>
              </Col>
            </Row>

            {/* Rest of the form remains the same */}
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Middle Name</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.middleName}
                    onChange={(e) => setFormData({...formData, middleName: e.target.value})}
                    placeholder="Enter middle name"
                    disabled={isLoading}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Name Extension</Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.extension}
                    onChange={(e) => setFormData({...formData, extension: e.target.value})}
                    placeholder="e.g., Jr, Sr, III"
                    disabled={isLoading}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Date of Birth</Form.Label>
                  <Form.Control
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({...formData, dateOfBirth: e.target.value})}
                    disabled={isLoading}
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>Age</Form.Label>
                  <Form.Control
                    type="number"
                    value={formData.age}
                    onChange={(e) => setFormData({...formData, age: e.target.value})}
                    placeholder="Age"
                    disabled={isLoading}
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>Sex</Form.Label>
                  <Form.Select
                    value={formData.sex}
                    onChange={(e) => setFormData({...formData, sex: e.target.value})}
                    disabled={isLoading}
                  >
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Address</Form.Label>
              <Form.Control
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
                placeholder="Enter complete address"
                disabled={isLoading}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Contact Number</Form.Label>
              <Form.Control
                type="text"
                value={formData.contact}
                onChange={(e) => setFormData({...formData, contact: e.target.value})}
                placeholder="Enter contact number"
                disabled={isLoading}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Visit Purpose *</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={formData.visitPurpose}
                onChange={(e) => setFormData({...formData, visitPurpose: e.target.value})}
                placeholder="Describe the purpose of visit..."
                required
                disabled={isLoading}
              />
            </Form.Group>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Visit Date</Form.Label>
                  <Form.Control
                    type="date"
                    value={formData.dateVisited}
                    onChange={(e) => setFormData({...formData, dateVisited: e.target.value})}
                    disabled={isLoading}
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>Time In</Form.Label>
                  <Form.Control
                    type="time"
                    value={formData.timeIn}
                    onChange={(e) => setFormData({...formData, timeIn: e.target.value})}
                    disabled={isLoading}
                  />
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label>Time Out</Form.Label>
                  <Form.Control
                    type="time"
                    value={formData.timeOut}
                    onChange={(e) => setFormData({...formData, timeOut: e.target.value})}
                    disabled={isLoading}
                  />
                </Form.Group>
              </Col>
            </Row>

            {editingGuest && isAdmin && (
              <Form.Group className="mb-3">
                <Form.Label>Status</Form.Label>
                <Form.Select
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                  disabled={isLoading}
                >
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="completed">Completed</option>
                </Form.Select>
              </Form.Group>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={closeModal} disabled={isLoading}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  {editingGuest ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                editingGuest ? 'Update Guest' : 'Add Guest'
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* QR Code Modal */}
      <Modal show={showQRModal} onHide={closeQRModal}>
        <Modal.Header closeButton>
          <Modal.Title>Guest QR Code</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center">
          {selectedGuestQR ? (
            <div>
              <img src={selectedGuestQR} alt="Guest QR Code" style={{ maxWidth: '100%', height: 'auto' }} />
              <p className="mt-3 text-muted">Scan this QR code for guest information</p>
            </div>
          ) : (
            <Spinner animation="border" />
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeQRModal}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      <ToastContainer position="top-right" autoClose={3000} />
    </Container>
  );
};

export default Guest;