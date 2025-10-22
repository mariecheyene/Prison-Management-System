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
  XCircle,
  Eye,
  Users,
  RefreshCw
} from 'react-feather';

const RecordVisits = () => {
  const [visitLogs, setVisitLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [violators, setViolators] = useState([]);
  const [banned, setBanned] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [inmates, setInmates] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  
  // Filter states
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchBy, setSearchBy] = useState('personName');

  // Modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showViolationModal, setShowViolationModal] = useState(false);
  const [showBanModal, setShowBanModal] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [selectedPerson, setSelectedPerson] = useState(null);

  // Form states
  const [violationForm, setViolationForm] = useState({
    violationType: '',
    violationDetails: '',
    severity: 'medium'
  });
  const [banForm, setBanForm] = useState({
    reason: '',
    duration: '1_week',
    notes: ''
  });

  const API_BASE = 'http://localhost:5000';

  const searchOptions = [
    { value: 'personName', label: 'Person Name' },
    { value: 'personId', label: 'Person ID' },
    { value: 'inmateName', label: 'Inmate Name' },
    { value: 'prisonerId', label: 'Prisoner ID' },
    { value: 'personType', label: 'Type' }
  ];

  const violationTypes = [
    'Late Arrival',
    'Early Departure',
    'Misconduct',
    'Prohibited Items',
    'Unauthorized Areas',
    'Disruptive Behavior',
    'Other'
  ];

  const banDurations = [
    { value: '1_week', label: '1 Week' },
    { value: '2_weeks', label: '2 Weeks' },
    { value: '1_month', label: '1 Month' },
    { value: '3_months', label: '3 Months' },
    { value: '6_months', label: '6 Months' },
    { value: '1_year', label: '1 Year' },
    { value: 'permanent', label: 'Permanent' }
  ];

  useEffect(() => {
    fetchVisitLogs();
    fetchInmates();
    fetchViolators();
    fetchBanned();
  }, []);

  useEffect(() => {
    filterLogs();
  }, [visitLogs, startDate, endDate, searchQuery, searchBy, activeTab]);

  const fetchVisitLogs = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${API_BASE}/visit-logs`);
      
      const sortedLogs = response.data.sort((a, b) => {
        const dateA = new Date(a.visitDate);
        const dateB = new Date(b.visitDate);
        if (dateA.getTime() === dateB.getTime()) {
          return b.timeIn.localeCompare(a.timeIn);
        }
        return dateB - dateA;
      });
      
      setVisitLogs(sortedLogs);
    } catch (error) {
      console.error("Error fetching visit logs:", error);
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

  const fetchViolators = async () => {
    try {
      // Fetch visitors and guests with violations
      const [visitorsRes, guestsRes] = await Promise.all([
        axios.get(`${API_BASE}/visitors`),
        axios.get(`${API_BASE}/guests`)
      ]);
      
      const visitorsWithViolations = visitorsRes.data
        .filter(visitor => visitor.violationType || visitor.violations)
        .map(visitor => ({
          ...visitor,
          personType: 'visitor',
          personName: visitor.fullName,
          id: visitor._id || visitor.id
        }));
      
      const guestsWithViolations = guestsRes.data
        .filter(guest => guest.violationType || guest.violations)
        .map(guest => ({
          ...guest,
          personType: 'guest',
          personName: guest.fullName,
          id: guest._id || guest.id,
          visitPurpose: guest.visitPurpose // Include visit purpose
        }));
      
      const allViolators = [...visitorsWithViolations, ...guestsWithViolations];
      setViolators(allViolators);
    } catch (error) {
      console.error('Error fetching violators:', error);
      toast.error('Failed to fetch violators');
    }
  };

  const fetchBanned = async () => {
    try {
      // Fetch visitors and guests who are banned
      const [visitorsRes, guestsRes] = await Promise.all([
        axios.get(`${API_BASE}/visitors`),
        axios.get(`${API_BASE}/guests`)
      ]);
      
      const bannedVisitors = visitorsRes.data
        .filter(visitor => visitor.isBanned)
        .map(visitor => ({
          ...visitor,
          personType: 'visitor',
          personName: visitor.fullName,
          id: visitor._id || visitor.id
        }));
      
      const bannedGuests = guestsRes.data
        .filter(guest => guest.isBanned)
        .map(guest => ({
          ...guest,
          personType: 'guest',
          personName: guest.fullName,
          id: guest._id || guest.id,
          visitPurpose: guest.visitPurpose // Include visit purpose
        }));
      
      const allBanned = [...bannedVisitors, ...bannedGuests];
      setBanned(allBanned);
    } catch (error) {
      console.error('Error fetching banned persons:', error);
      toast.error('Failed to fetch banned persons');
    }
  };

  const filterLogs = () => {
    let filtered = visitLogs;

    if (activeTab === 'visitors') {
      filtered = filtered.filter(log => log.personType === 'visitor');
    } else if (activeTab === 'guests') {
      filtered = filtered.filter(log => log.personType === 'guest');
    }

    if (startDate) {
      filtered = filtered.filter(log => {
        const visitDate = new Date(log.visitDate).toISOString().split('T')[0];
        return visitDate >= startDate;
      });
    }

    if (endDate) {
      filtered = filtered.filter(log => {
        const visitDate = new Date(log.visitDate).toISOString().split('T')[0];
        return visitDate <= endDate;
      });
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(log => {
        switch (searchBy) {
          case 'personName':
            return log.personName?.toLowerCase().includes(query);
          case 'personId':
            return log.personId?.toLowerCase().includes(query);
          case 'inmateName':
            return log.inmateName?.toLowerCase().includes(query);
          case 'prisonerId':
            return log.prisonerId?.toLowerCase().includes(query);
          case 'personType':
            return log.personType?.toLowerCase().includes(query);
          default:
            return true;
        }
      });
    }

    setFilteredLogs(filtered);
  };

  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
    setSearchQuery('');
  };

  const openDetailsModal = (log) => {
    setSelectedLog(log);
    setShowDetailsModal(true);
  };

  const openDeleteModal = (log) => {
    setSelectedLog(log);
    setShowDeleteModal(true);
  };

  const openViolationModal = (log) => {
    setSelectedLog(log);
    setSelectedPerson(null);
    setViolationForm({
      violationType: '',
      violationDetails: '',
      severity: 'medium'
    });
    setShowViolationModal(true);
  };

  const openBanModal = (log) => {
    setSelectedLog(log);
    setSelectedPerson(null);
    setBanForm({
      reason: '',
      duration: '1_week',
      notes: ''
    });
    setShowBanModal(true);
  };

  const openEditViolationModal = (person) => {
    setSelectedPerson(person);
    setSelectedLog(null);
    setViolationForm({
      violationType: person.violationType || '',
      violationDetails: person.violationDetails || '',
      severity: 'medium'
    });
    setShowViolationModal(true);
  };

  const openEditBanModal = (person) => {
    setSelectedPerson(person);
    setSelectedLog(null);
    setBanForm({
      reason: person.banReason || '',
      duration: person.banDuration || '1_week',
      notes: person.banNotes || ''
    });
    setShowBanModal(true);
  };

  const handleDeleteLog = async (logId) => {
    try {
      await axios.delete(`${API_BASE}/visit-logs/${logId}`);
      toast.success("Visit record deleted successfully");
      setShowDeleteModal(false);
      setSelectedLog(null);
      fetchVisitLogs();
    } catch (error) {
      console.error("Error deleting visit log:", error);
      toast.error("Failed to delete visit record");
    }
  };

  const handleClearTimeRecords = async (log) => {
    if (!window.confirm(`Clear time records for ${log.personName} on ${formatDate(log.visitDate)}? This will allow them to scan again for this date.`)) {
      return;
    }

    try {
      await axios.put(`${API_BASE}/clear-time-records/${log.personId}`, {
        date: log.visitDate,
        personType: log.personType
      });
      
      toast.success("Time records cleared successfully");
      fetchVisitLogs();
    } catch (error) {
      console.error("Error clearing time records:", error);
      toast.error("Failed to clear time records");
    }
  };

  const handleAddViolation = async () => {
    if (!violationForm.violationType) {
      toast.error("Please select a violation type");
      return;
    }

    try {
      console.log('Adding violation for:', selectedLog);
      
      const endpoint = selectedLog.personType === 'visitor' 
        ? `${API_BASE}/visitors/${selectedLog.personId}/violation`
        : `${API_BASE}/guests/${selectedLog.personId}/violation`;
      
      const violationData = {
        violationType: violationForm.violationType,
        violationDetails: violationForm.violationDetails
      };
      
      console.log('Sending violation data:', violationData);
      console.log('Endpoint:', endpoint);
      
      const response = await axios.put(endpoint, violationData);
      console.log('Violation response:', response.data);
      
      toast.success("Violation added successfully");
      setShowViolationModal(false);
      setSelectedLog(null);
      fetchViolators();
      fetchVisitLogs();
    } catch (error) {
      console.error("Error adding violation:", error);
      console.error("Error details:", error.response?.data || error.message);
      toast.error(`Failed to add violation: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleEditViolation = async () => {
    if (!violationForm.violationType) {
      toast.error("Please select a violation type");
      return;
    }

    try {
      console.log('Editing violation for:', selectedPerson);
      
      const endpoint = selectedPerson.personType === 'visitor' 
        ? `${API_BASE}/visitors/${selectedPerson.id}/violation`
        : `${API_BASE}/guests/${selectedPerson.id}/violation`;
      
      const violationData = {
        violationType: violationForm.violationType,
        violationDetails: violationForm.violationDetails
      };
      
      console.log('Sending violation data:', violationData);
      console.log('Endpoint:', endpoint);
      
      const response = await axios.put(endpoint, violationData);
      console.log('Violation response:', response.data);
      
      toast.success("Violation updated successfully");
      setShowViolationModal(false);
      setSelectedPerson(null);
      fetchViolators();
    } catch (error) {
      console.error("Error updating violation:", error);
      console.error("Error details:", error.response?.data || error.message);
      toast.error(`Failed to update violation: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleRemoveViolation = async (personId, personType) => {
    if (!window.confirm("Are you sure you want to remove this violation?")) {
      return;
    }

    try {
      const endpoint = personType === 'visitor' 
        ? `${API_BASE}/visitors/${personId}/remove-violation`
        : `${API_BASE}/guests/${personId}/remove-violation`;
      
      await axios.put(endpoint);
      toast.success("Violation removed successfully");
      fetchViolators();
    } catch (error) {
      console.error("Error removing violation:", error);
      toast.error("Failed to remove violation");
    }
  };

  const handleAddBan = async () => {
    if (!banForm.reason) {
      toast.error("Please provide a ban reason");
      return;
    }

    try {
      console.log('Adding ban for:', selectedLog);
      
      const endpoint = selectedLog.personType === 'visitor' 
        ? `${API_BASE}/visitors/${selectedLog.personId}/ban`
        : `${API_BASE}/guests/${selectedLog.personId}/ban`;
      
      const banData = {
        reason: banForm.reason,
        duration: banForm.duration,
        notes: banForm.notes
      };
      
      console.log('Sending ban data:', banData);
      console.log('Endpoint:', endpoint);
      
      const response = await axios.put(endpoint, banData);
      console.log('Ban response:', response.data);
      
      toast.success("Person banned successfully");
      setShowBanModal(false);
      setSelectedLog(null);
      fetchBanned();
      fetchVisitLogs();
    } catch (error) {
      console.error("Error adding ban:", error);
      console.error("Error details:", error.response?.data || error.message);
      toast.error(`Failed to ban person: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleEditBan = async () => {
    if (!banForm.reason) {
      toast.error("Please provide a ban reason");
      return;
    }

    try {
      console.log('Editing ban for:', selectedPerson);
      
      const endpoint = selectedPerson.personType === 'visitor' 
        ? `${API_BASE}/visitors/${selectedPerson.id}/ban`
        : `${API_BASE}/guests/${selectedPerson.id}/ban`;
      
      const banData = {
        reason: banForm.reason,
        duration: banForm.duration,
        notes: banForm.notes
      };
      
      console.log('Sending ban data:', banData);
      console.log('Endpoint:', endpoint);
      
      const response = await axios.put(endpoint, banData);
      console.log('Ban response:', response.data);
      
      toast.success("Ban updated successfully");
      setShowBanModal(false);
      setSelectedPerson(null);
      fetchBanned();
    } catch (error) {
      console.error("Error updating ban:", error);
      console.error("Error details:", error.response?.data || error.message);
      toast.error(`Failed to update ban: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleRemoveBan = async (personId, personType) => {
    if (!window.confirm("Are you sure you want to remove this ban?")) {
      return;
    }

    try {
      const endpoint = personType === 'visitor' 
        ? `${API_BASE}/visitors/${personId}/remove-ban`
        : `${API_BASE}/guests/${personId}/remove-ban`;
      
      await axios.put(endpoint);
      toast.success("Ban removed successfully");
      fetchBanned();
    } catch (error) {
      console.error("Error removing ban:", error);
      toast.error("Failed to remove ban");
    }
  };

  // Export CSV function
  const exportToCSV = () => {
    const headers = [
      'Visit Date', 'Type', 'Person ID', 'Person Name', 'Prisoner ID', 'Inmate Name', 'Visit Purpose',
      'Time In', 'Time Out', 'Visit Duration', 'Status', 'Timer Active'
    ];

    const csvData = filteredLogs.map(log => [
      formatDate(log.visitDate),
      log.personType.toUpperCase(),
      log.personId,
      log.personName,
      log.prisonerId || 'N/A',
      log.inmateName || 'N/A',
      log.visitPurpose || 'N/A',
      formatTime(log.timeIn),
      formatTime(log.timeOut) || 'N/A',
      log.visitDuration || 'N/A',
      log.status,
      log.isTimerActive ? 'Yes' : 'No'
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `visit_logs_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
    
    toast.success(`Exported ${filteredLogs.length} ${activeTab} records to CSV`);
  };

  // Helper functions
  const getTypeVariant = (type) => {
    return type === 'visitor' ? 'primary' : 'info';
  };

  const getStatusVariant = (status) => {
    switch (status) {
      case 'completed': return 'success';
      case 'in-progress': return 'warning';
      default: return 'secondary';
    }
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
    return timeString;
  };

  // Calculate actual counts for visitors and guests from visit logs
  const getVisitorCount = () => {
    const visitorLogs = visitLogs.filter(log => log.personType === 'visitor');
    const uniqueVisitors = new Set(visitorLogs.map(log => log.personId));
    return uniqueVisitors.size;
  };

  const getGuestCount = () => {
    const guestLogs = visitLogs.filter(log => log.personType === 'guest');
    const uniqueGuests = new Set(guestLogs.map(log => log.personId));
    return uniqueGuests.size;
  };

  const renderVisitTable = (data) => {
    if (data.length === 0) {
      return (
        <Alert variant="info">
          No visit records found in this category.
        </Alert>
      );
    }

    return (
      <Table striped bordered hover responsive className="bg-white">
        <thead className="table-dark">
          <tr>
            <th>Visit Date</th>
            <th>Type</th>
            <th>Person Information</th>
            {activeTab === 'guests' ? (
              <th>Visit Purpose</th>
            ) : (
              <th>Inmate Details</th>
            )}
            <th>Time Details</th>
            <th>Status</th>
            <th style={{ width: '180px' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {data.map(log => (
            <tr key={log._id}>
              <td>
                <div className="fw-bold">{formatDate(log.visitDate)}</div>
                <div className="small text-muted">
                  {new Date(log.visitDate).toLocaleDateString('en-US', { weekday: 'short' })}
                </div>
              </td>
              <td>
                <Badge bg={getTypeVariant(log.personType)} className="fs-6">
                  {log.personType.toUpperCase()}
                </Badge>
              </td>
              <td>
                <div className="fw-bold">{log.personName}</div>
                <div className="small text-muted">
                  <User size={12} className="me-1" />
                  ID: {log.personId}
                </div>
              </td>
              {activeTab === 'guests' ? (
                <td>
                  <div className="fw-bold text-primary">{log.visitPurpose || 'General Visit'}</div>
                </td>
              ) : (
                <td>
                  {log.prisonerId ? (
                    <>
                      <div className="fw-bold">{log.inmateName}</div>
                      <div className="small text-muted">
                        Prisoner ID: {log.prisonerId}
                      </div>
                    </>
                  ) : (
                    <div className="text-muted">N/A</div>
                  )}
                </td>
              )}
              <td>
                <div className="small">
                  <div><strong>Time In:</strong> {formatTime(log.timeIn)}</div>
                  <div><strong>Time Out:</strong> {formatTime(log.timeOut) || 'Not checked out'}</div>
                  {log.visitDuration && (
                    <div><strong>Duration:</strong> {log.visitDuration}</div>
                  )}
                </div>
              </td>
              <td className="text-center">
                <Badge bg={getStatusVariant(log.status)} className="fs-6">
                  {log.status.toUpperCase()}
                </Badge>
                {log.isTimerActive && (
                  <div className="small mt-1">
                    <Badge bg="warning">TIMER ACTIVE</Badge>
                  </div>
                )}
              </td>
              <td>
                <div className="d-flex flex-column gap-1">
                  <Button
                    variant="outline-primary"
                    size="sm"
                    onClick={() => openDetailsModal(log)}
                    className="d-flex align-items-center justify-content-center"
                  >
                    <Eye size={14} className="me-1" />
                    View Details
                  </Button>
                  <Button
                    variant="outline-warning"
                    size="sm"
                    onClick={() => openViolationModal(log)}
                    className="d-flex align-items-center justify-content-center"
                  >
                    <AlertTriangle size={14} className="me-1" />
                    Add Violation
                  </Button>
                  <Button
                    variant="outline-danger"
                    size="sm"
                    onClick={() => openBanModal(log)}
                    className="d-flex align-items-center justify-content-center"
                  >
                    <Slash size={14} className="me-1" />
                    Ban Person
                  </Button>
                  <Button
                    variant="outline-info"
                    size="sm"
                    onClick={() => handleClearTimeRecords(log)}
                    className="d-flex align-items-center justify-content-center"
                    title="Clear time records (allow rescan for this date)"
                  >
                    <RefreshCw size={14} className="me-1" />
                    Reset Time
                  </Button>
                  <Button
                    variant="outline-danger"
                    size="sm"
                    onClick={() => openDeleteModal(log)}
                    className="d-flex align-items-center justify-content-center"
                  >
                    <Trash2 size={14} className="me-1" />
                    Delete Record
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    );
  };

  const renderViolatorsTable = () => {
    if (violators.length === 0) {
      return (
        <Alert variant="info">
          No violators found.
        </Alert>
      );
    }

    return (
      <Table striped bordered hover responsive className="bg-white">
        <thead className="table-dark">
          <tr>
            <th>Person ID</th>
            <th>Name</th>
            <th>Type</th>
            <th>Violation Type</th>
            <th>Violation Details</th>
            <th>Visit Purpose</th>
            <th style={{ width: '180px' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {violators.map(person => (
            <tr key={person.id}>
              <td>{person.id}</td>
              <td className="fw-bold">{person.personName}</td>
              <td>
                <Badge bg={getTypeVariant(person.personType)}>
                  {person.personType.toUpperCase()}
                </Badge>
              </td>
              <td>
                <Badge bg="danger">{person.violationType}</Badge>
              </td>
              <td>{person.violationDetails || 'No details provided'}</td>
              <td>
                {person.personType === 'guest' ? (
                  <span className="text-primary">{person.visitPurpose || 'General Visit'}</span>
                ) : (
                  <span className="text-muted">N/A</span>
                )}
              </td>
              <td>
                <div className="d-flex flex-column gap-1">
                  <Button
                    variant="outline-warning"
                    size="sm"
                    onClick={() => openEditViolationModal(person)}
                    className="d-flex align-items-center justify-content-center"
                  >
                    <Edit size={14} className="me-1" />
                    Edit Violation
                  </Button>
                  <Button
                    variant="outline-success"
                    size="sm"
                    onClick={() => handleRemoveViolation(person.id, person.personType)}
                    className="d-flex align-items-center justify-content-center"
                  >
                    <CheckCircle size={14} className="me-1" />
                    Remove Violation
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    );
  };

  const renderBannedTable = () => {
    if (banned.length === 0) {
      return (
        <Alert variant="info">
          No banned persons found.
        </Alert>
      );
    }

    return (
      <Table striped bordered hover responsive className="bg-white">
        <thead className="table-dark">
          <tr>
            <th>Person ID</th>
            <th>Name</th>
            <th>Type</th>
            <th>Ban Reason</th>
            <th>Ban Duration</th>
            <th>Visit Purpose</th>
            <th style={{ width: '180px' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {banned.map(person => (
            <tr key={person.id}>
              <td>{person.id}</td>
              <td className="fw-bold">{person.personName}</td>
              <td>
                <Badge bg={getTypeVariant(person.personType)}>
                  {person.personType.toUpperCase()}
                </Badge>
              </td>
              <td>{person.banReason || 'No reason provided'}</td>
              <td>
                <Badge bg="warning">
                  {person.banDuration ? banDurations.find(d => d.value === person.banDuration)?.label || person.banDuration : 'Permanent'}
                </Badge>
              </td>
              <td>
                {person.personType === 'guest' ? (
                  <span className="text-primary">{person.visitPurpose || 'General Visit'}</span>
                ) : (
                  <span className="text-muted">N/A</span>
                )}
              </td>
              <td>
                <div className="d-flex flex-column gap-1">
                  <Button
                    variant="outline-warning"
                    size="sm"
                    onClick={() => openEditBanModal(person)}
                    className="d-flex align-items-center justify-content-center"
                  >
                    <Edit size={14} className="me-1" />
                    Edit Ban
                  </Button>
                  <Button
                    variant="outline-success"
                    size="sm"
                    onClick={() => handleRemoveBan(person.id, person.personType)}
                    className="d-flex align-items-center justify-content-center"
                  >
                    <CheckCircle size={14} className="me-1" />
                    Remove Ban
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    );
  };

  const isEditingViolation = selectedPerson !== null;
  const isEditingBan = selectedPerson !== null;

  return (
    <Container>
      <ToastContainer />
      
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 style={{ fontFamily: "Poppins, sans-serif", fontWeight: "600", color: "#2c3e50" }}>
            📋 Visit History & Logs
          </h2>
          <p className="text-muted mb-0">View and manage all individual visit records</p>
        </div>
        <Button 
          variant="outline-dark" 
          onClick={exportToCSV} 
          disabled={filteredLogs.length === 0 && activeTab !== 'violators' && activeTab !== 'banned'}
        >
          <Download size={16} className="me-1" />
          Export CSV ({activeTab})
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
                <Users size={16} className="me-1" />
                All Visits <Badge bg="primary" className="ms-1">{filteredLogs.length}</Badge>
              </span>
            }>
              {/* Filters Card */}
              <Card className="mb-4 border-0 bg-light">
                <Card.Header className="bg-white">
                  <div className="d-flex align-items-center">
                    <Filter size={18} className="me-2" />
                    <h6 className="mb-0">Filter Visit Records</h6>
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
                            placeholder="Search visit records..."
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
              ) : renderVisitTable(filteredLogs)}
            </Tab>

            <Tab eventKey="visitors" title={
              <span>
                <User size={16} className="me-1" />
                Visitors <Badge bg="info" className="ms-1">{getVisitorCount()}</Badge>
              </span>
            }>
              {renderVisitTable(filteredLogs)}
            </Tab>

            <Tab eventKey="guests" title={
              <span>
                <Users size={16} className="me-1" />
                Guests <Badge bg="secondary" className="ms-1">{getGuestCount()}</Badge>
              </span>
            }>
              {renderVisitTable(filteredLogs)}
            </Tab>

            <Tab eventKey="violators" title={
              <span>
                <AlertTriangle size={16} className="me-1" />
                Violators <Badge bg="danger" className="ms-1">{violators.length}</Badge>
              </span>
            }>
              {renderViolatorsTable()}
            </Tab>

            <Tab eventKey="banned" title={
              <span>
                <Slash size={16} className="me-1" />
                Banned <Badge bg="dark" className="ms-1">{banned.length}</Badge>
              </span>
            }>
              {renderBannedTable()}
            </Tab>
          </Tabs>
        </Card.Body>
      </Card>

      {/* Statistics Card */}
      {filteredLogs.length > 0 && activeTab !== 'violators' && activeTab !== 'banned' && (
        <Card className="mt-4 border-0 bg-light">
          <Card.Body>
            <Row>
              <Col md={2} className="text-center">
                <div className="h4 text-primary mb-1">{filteredLogs.length}</div>
                <div className="text-muted small">Total Visits</div>
              </Col>
              <Col md={2} className="text-center">
                <div className="h4 text-info mb-1">
                  {filteredLogs.filter(log => log.personType === 'visitor').length}
                </div>
                <div className="text-muted small">Visitor Visits</div>
              </Col>
              <Col md={2} className="text-center">
                <div className="h4 text-secondary mb-1">
                  {filteredLogs.filter(log => log.personType === 'guest').length}
                </div>
                <div className="text-muted small">Guest Visits</div>
              </Col>
              <Col md={2} className="text-center">
                <div className="h4 text-success mb-1">
                  {filteredLogs.filter(log => log.status === 'completed').length}
                </div>
                <div className="text-muted small">Completed</div>
              </Col>
              <Col md={2} className="text-center">
                <div className="h4 text-warning mb-1">
                  {filteredLogs.filter(log => log.status === 'in-progress').length}
                </div>
                <div className="text-muted small">In Progress</div>
              </Col>
              <Col md={2} className="text-center">
                <div className="h4 text-danger mb-1">
                  {violators.length}
                </div>
                <div className="text-muted small">Violators</div>
              </Col>
            </Row>
          </Card.Body>
        </Card>
      )}

      {/* View Details Modal */}
      <Modal show={showDetailsModal} onHide={() => setShowDetailsModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <Eye size={20} className="me-2" />
            Visit Details - {selectedLog?.personId}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedLog && (
            <Row>
              <Col md={12}>
                <Card className="mb-4">
                  <Card.Header>
                    <strong>Visit Information</strong>
                  </Card.Header>
                  <Card.Body>
                    <Row>
                      <Col md={6}>
                        <p><strong>Visit Date:</strong> {formatDate(selectedLog.visitDate)}</p>
                        <p><strong>Time In:</strong> {formatTime(selectedLog.timeIn)}</p>
                        <p><strong>Type:</strong> <Badge bg={getTypeVariant(selectedLog.personType)}>{selectedLog.personType.toUpperCase()}</Badge></p>
                      </Col>
                      <Col md={6}>
                        <p><strong>Time Out:</strong> {formatTime(selectedLog.timeOut) || 'Not checked out'}</p>
                        <p><strong>Duration:</strong> {selectedLog.visitDuration || 'N/A'}</p>
                        <p><strong>Status:</strong> <Badge bg={getStatusVariant(selectedLog.status)}>{selectedLog.status.toUpperCase()}</Badge></p>
                      </Col>
                    </Row>
                  </Card.Body>
                </Card>
              </Col>

              <Col md={6}>
                <Card className="mb-3">
                  <Card.Header>
                    <strong>{selectedLog.personType === 'guest' ? 'Guest' : 'Visitor'} Information</strong>
                  </Card.Header>
                  <Card.Body>
                    <p><strong>Name:</strong> {selectedLog.personName}</p>
                    <p><strong>ID:</strong> {selectedLog.personId}</p>
                    <p><strong>Type:</strong> {selectedLog.personType.toUpperCase()}</p>
                    {selectedLog.personType === 'guest' && selectedLog.visitPurpose && (
                      <p><strong>Visit Purpose:</strong> {selectedLog.visitPurpose}</p>
                    )}
                  </Card.Body>
                </Card>
              </Col>
              
              <Col md={6}>
                <Card className="mb-3">
                  <Card.Header>
                    <strong>{selectedLog.personType === 'guest' ? 'Guest Details' : 'Inmate Information'}</strong>
                  </Card.Header>
                  <Card.Body>
                    {selectedLog.personType === 'guest' ? (
                      <>
                        <p><strong>Visit Purpose:</strong> {selectedLog.visitPurpose || 'General Visit'}</p>
                      </>
                    ) : selectedLog.prisonerId ? (
                      <>
                        <p><strong>Inmate Name:</strong> {selectedLog.inmateName}</p>
                        <p><strong>Prisoner ID:</strong> {selectedLog.prisonerId}</p>
                      </>
                    ) : (
                      <p className="text-muted">No inmate associated</p>
                    )}
                  </Card.Body>
                </Card>
              </Col>

              {selectedLog.isTimerActive && (
                <Col md={12}>
                  <Card className="mb-3 border-warning">
                    <Card.Header className="bg-warning text-dark">
                      <strong>Timer Information</strong>
                    </Card.Header>
                    <Card.Body>
                      <p><strong>Timer Status:</strong> <Badge bg="warning">ACTIVE</Badge></p>
                      <p><strong>Timer Started:</strong> {selectedLog.timerStart ? new Date(selectedLog.timerStart).toLocaleString() : 'N/A'}</p>
                      <p><strong>Timer Ends:</strong> {selectedLog.timerEnd ? new Date(selectedLog.timerEnd).toLocaleString() : 'N/A'}</p>
                    </Card.Body>
                  </Card>
                </Col>
              )}
            </Row>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDetailsModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Add/Edit Violation Modal */}
      <Modal show={showViolationModal} onHide={() => setShowViolationModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>
            <AlertTriangle size={20} className="me-2 text-warning" />
            {isEditingViolation ? 'Edit Violation' : 'Add Violation'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Violation Type *</Form.Label>
              <Form.Select 
                value={violationForm.violationType} 
                onChange={(e) => setViolationForm({...violationForm, violationType: e.target.value})}
              >
                <option value="">Select violation type</option>
                {violationTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Violation Details</Form.Label>
              <Form.Control 
                as="textarea" 
                rows={3} 
                placeholder="Enter violation details..." 
                value={violationForm.violationDetails}
                onChange={(e) => setViolationForm({...violationForm, violationDetails: e.target.value})}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowViolationModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="warning" 
            onClick={isEditingViolation ? handleEditViolation : handleAddViolation}
          >
            {isEditingViolation ? 'Update Violation' : 'Add Violation'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Add/Edit Ban Modal */}
      <Modal show={showBanModal} onHide={() => setShowBanModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>
            <Slash size={20} className="me-2 text-danger" />
            {isEditingBan ? 'Edit Ban' : 'Ban Person'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Ban Reason *</Form.Label>
              <Form.Control 
                as="textarea" 
                rows={3} 
                placeholder="Enter ban reason..." 
                value={banForm.reason}
                onChange={(e) => setBanForm({...banForm, reason: e.target.value})}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Ban Duration</Form.Label>
              <Form.Select 
                value={banForm.duration} 
                onChange={(e) => setBanForm({...banForm, duration: e.target.value})}
              >
                {banDurations.map(duration => (
                  <option key={duration.value} value={duration.value}>{duration.label}</option>
                ))}
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Additional Notes</Form.Label>
              <Form.Control 
                as="textarea" 
                rows={2} 
                placeholder="Enter additional notes..." 
                value={banForm.notes}
                onChange={(e) => setBanForm({...banForm, notes: e.target.value})}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowBanModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="danger" 
            onClick={isEditingBan ? handleEditBan : handleAddBan}
          >
            {isEditingBan ? 'Update Ban' : 'Ban Person'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>
            <Trash2 size={20} className="me-2 text-danger" />
            Delete Visit Record
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to delete this visit record?
          <br />
          <strong>Person:</strong> {selectedLog?.personName}
          <br />
          <strong>Date:</strong> {selectedLog ? formatDate(selectedLog.visitDate) : ''}
          <br />
          <strong>Time In:</strong> {selectedLog?.timeIn}
          <br />
          <span className="text-danger">
            This action cannot be undone. This will permanently delete the visit record.
          </span>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={() => handleDeleteLog(selectedLog?._id)}>
            <Trash2 size={16} className="me-1" />
            Delete Record
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default RecordVisits;