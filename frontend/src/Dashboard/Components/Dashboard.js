import React, { useState, useEffect } from "react";
import axios from "axios";
import { Card, Row, Col, Container, Button, Alert, ProgressBar, Badge } from "react-bootstrap";
import { 
  FaUsers, 
  FaUserFriends,
  FaUserCheck,
  FaChartBar, 
  FaVenus, 
  FaMars, 
  FaUserShield,
  FaUserTie,
  FaUser,
  FaUserClock,
  FaCalendarWeek,
  FaCalendarAlt,
  FaCalendarDay,
  FaHistory,
  FaExclamationTriangle
} from "react-icons/fa";
import "bootstrap/dist/css/bootstrap.min.css";

const INMATES_API_URL = "http://localhost:5000/inmates";
const VISITORS_API_URL = "http://localhost:5000/visitors";
const GUESTS_API_URL = "http://localhost:5000/guests";
const USERS_API_URL = "http://localhost:5000/users";
const ACTIVE_TIMERS_URL = "http://localhost:5000/visit-logs/active-visitor-timers";
const VISIT_LOGS_URL = "http://localhost:5000/visit-logs";

const Dashboard = () => {
  const [inmates, setInmates] = useState([]);
  const [visitors, setVisitors] = useState([]);
  const [guests, setGuests] = useState([]);
  const [users, setUsers] = useState([]);
  const [activeTimers, setActiveTimers] = useState([]);
  const [visitLogs, setVisitLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);

  useEffect(() => {
    fetchDashboardData();
    
    const timerInterval = setInterval(() => {
      fetchActiveTimers();
    }, 5000);

    const dataInterval = setInterval(() => {
      fetchDashboardData();
    }, 30000);

    return () => {
      clearInterval(timerInterval);
      clearInterval(dataInterval);
    };
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [inmatesRes, visitorsRes, guestsRes, usersRes, visitLogsRes] = await Promise.all([
        axios.get(INMATES_API_URL),
        axios.get(VISITORS_API_URL),
        axios.get(GUESTS_API_URL),
        axios.get(USERS_API_URL),
        axios.get(VISIT_LOGS_URL)
      ]);
      setInmates(inmatesRes.data);
      setVisitors(visitorsRes.data);
      setGuests(guestsRes.data);
      setUsers(usersRes.data);
      setVisitLogs(visitLogsRes.data);
      await fetchActiveTimers();
      setLastUpdate(new Date());
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    }
    setLoading(false);
  };

  const fetchActiveTimers = async () => {
    try {
      console.log('🔄 Fetching active VISITOR timers from:', ACTIVE_TIMERS_URL);
      const response = await axios.get(ACTIVE_TIMERS_URL);
      console.log('✅ Active VISITOR timers received:', response.data.length);
      
      setActiveTimers(response.data);
    } catch (error) {
      console.error("❌ Error fetching active timers:", error);
    }
  };

  // Helper functions for statistics
  const getTotalInmates = () => inmates.length;
  const getTotalVisitors = () => visitors.length;
  const getTotalGuests = () => guests.length;
  const getMaleInmates = () => inmates.filter(i => i.sex === "Male").length;
  const getFemaleInmates = () => inmates.filter(i => i.sex === "Female").length;
  const getPendingVisitors = () => visitors.filter(v => v.status === "pending").length;
  const getApprovedVisitors = () => visitors.filter(v => v.status === "approved").length;
  const getRejectedVisitors = () => visitors.filter(v => v.status === "rejected").length;
  const getPendingGuests = () => guests.filter(g => g.status === "pending").length;
  const getApprovedGuests = () => guests.filter(g => g.status === "approved").length;
  const getRejectedGuests = () => guests.filter(g => g.status === "rejected").length;
  const getCompletedGuests = () => guests.filter(g => g.status === "completed").length;
  const getTotalUsers = () => users.length;
  const getTotalAdmins = () => users.filter(u => u.role && u.role.includes('Admin')).length;
  const getTotalStaff = () => users.filter(u => u.role && u.role.includes('Staff')).length;
  
  // Count from visit logs
  const getTotalRecordedVisits = () => visitLogs.length;

  // Count visits for current week from visit logs
  const getVisitorsThisWeek = () => {
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    
    return visitLogs.filter(log => {
      const visitDate = new Date(log.visitDate);
      return visitDate >= startOfWeek;
    }).length;
  };

  // Count visits for current month from visit logs
  const getVisitorsThisMonth = () => {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    return visitLogs.filter(log => {
      const visitDate = new Date(log.visitDate);
      return visitDate >= startOfMonth;
    }).length;
  };

  // Count visits for current year from visit logs
  const getVisitorsThisYear = () => {
    const startOfYear = new Date(new Date().getFullYear(), 0, 1);
    
    return visitLogs.filter(log => {
      const visitDate = new Date(log.visitDate);
      return visitDate >= startOfYear;
    }).length;
  };

  // Get unique visitors from visit logs
  const getUniqueVisitors = () => {
    const uniqueVisitorIds = new Set(visitLogs.map(log => log.personId));
    return uniqueVisitorIds.size;
  };

  // Get repeat visitors from visit logs
  const getRepeatVisitors = () => {
    const visitorCounts = {};
    visitLogs.forEach(log => {
      visitorCounts[log.personId] = (visitorCounts[log.personId] || 0) + 1;
    });
    
    return Object.values(visitorCounts).filter(count => count > 1).length;
  };

  // Get active guests (for statistics) - guests don't have timers but can be checked in
  const getActiveGuestsNow = () => {
    const today = new Date().toISOString().split('T')[0];
    return guests.filter(guest => {
      const hasTodayVisit = guest.dailyVisits?.some(visit => {
        const visitDate = new Date(visit.visitDate).toISOString().split('T')[0];
        return visitDate === today && visit.hasTimedIn && !visit.hasTimedOut;
      });
      return hasTodayVisit;
    }).length;
  };

  // Timer helper functions - VISITORS ONLY
  const formatTimeRemaining = (minutes) => {
    if (minutes === null || minutes === undefined) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const formatTimeIn = (timeIn) => {
    if (!timeIn) return 'N/A';
    return timeIn;
  };

  const getTimerVariant = (minutes) => {
    if (minutes > 120) return 'success';
    if (minutes > 30) return 'warning';
    return 'danger';
  };

  const getTimerProgress = (minutes) => {
    const totalMinutes = 180; // 3 hours
    return Math.max(0, Math.min(100, (minutes / totalMinutes) * 100));
  };

  const getUrgentTimers = () => {
    return activeTimers.filter(timer => timer.timeRemainingMinutes < 30);
  };

  const getCriticalTimers = () => {
    return activeTimers.filter(timer => timer.timeRemainingMinutes < 10);
  };

  const getTopUrgentTimers = () => {
    return activeTimers
      .sort((a, b) => a.timeRemainingMinutes - b.timeRemainingMinutes)
      .slice(0, 5);
  };

  // Get active visitors count (for statistics)
  const getActiveVisitorsNow = () => {
    return activeTimers.length;
  };

  return (
    <Container className="mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 style={{ 
          color: "#2c3e50", 
          fontWeight: "600",
          borderBottom: "2px solid #4ECDC4",
          paddingBottom: "10px",
          margin: 0
        }}>
          Visitor Management Dashboard
        </h2>
        <Button 
          variant="outline-info" 
          size="sm" 
          onClick={fetchDashboardData}
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Refresh Data'}
        </Button>
      </div>

      {lastUpdate && (
        <div className="text-end mb-3">
          <small className="text-muted">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </small>
        </div>
      )}

      {/* Critical Alert Section - VISITORS ONLY */}
      {getCriticalTimers().length > 0 && (
        <Row className="mb-3">
          <Col>
            <Alert variant="danger" className="d-flex align-items-center">
              <FaExclamationTriangle size={24} className="me-3" />
              <div>
                <strong>CRITICAL ALERT:</strong> {getCriticalTimers().length} visitor(s) have less than 10 minutes remaining!
                <br />
                <small>Please ensure they complete their visit before time expires.</small>
              </div>
            </Alert>
          </Col>
        </Row>
      )}

      {/* Active Timers Section - VISITORS ONLY */}
      <Row className="mb-4">
        <Col>
          <Card className="shadow-sm border-0">
            <Card.Header className={
              activeTimers.length === 0 ? 'bg-secondary text-white' :
              getUrgentTimers().length > 0 ? 'bg-danger text-white' : 
              'bg-success text-white'
            }>
              <h5 className="mb-0 d-flex align-items-center justify-content-between">
                <div>
                  <FaUserClock className="me-2" />
                  Active Visitor Timers (3 Hours)
                  <Badge bg="light" text="dark" className="ms-2">
                    {activeTimers.length} Active
                  </Badge>
                  {getUrgentTimers().length > 0 && (
                    <Badge bg="warning" text="dark" className="ms-2">
                      <FaExclamationTriangle className="me-1" />
                      {getUrgentTimers().length} Urgent
                    </Badge>
                  )}
                </div>
                <div>
                  <small>Updates every 5 seconds</small>
                </div>
              </h5>
            </Card.Header>
            <Card.Body className="p-3">
              {activeTimers.length > 0 ? (
                <>
                  {getTopUrgentTimers().map((timer, index) => (
                    <div 
                      key={timer._id || index}
                      className={`mb-3 p-3 border rounded ${
                        timer.timeRemainingMinutes < 10 
                          ? 'border-danger bg-danger bg-opacity-10' 
                          : timer.timeRemainingMinutes < 30 
                          ? 'border-warning bg-warning bg-opacity-10' 
                          : 'border-success bg-success bg-opacity-10'
                      }`}
                    >
                      <Row className="align-items-center">
                        <Col md={4}>
                          <div className="d-flex align-items-center">
                            <div className="me-3">
                              <FaUserClock size={24} className={
                                timer.timeRemainingMinutes < 10 
                                  ? 'text-danger' 
                                  : timer.timeRemainingMinutes < 30 
                                  ? 'text-warning' 
                                  : 'text-success'
                              } />
                            </div>
                            <div>
                              <div className="fw-bold fs-6">{timer.personName}</div>
                              <div className="text-muted small">
                                Timed In: {formatTimeIn(timer.timeIn)}
                              </div>
                              <div className="small text-muted">
                                Visitor ID: {timer.personId}
                              </div>
                            </div>
                          </div>
                        </Col>
                        <Col md={3}>
                          <div className="small">
                            <div className="fw-bold">Prisoner:</div>
                            <div className="text-muted">{timer.prisonerId || 'N/A'}</div>
                            <div className="fw-bold mt-1">Inmate:</div>
                            <div className="text-muted">{timer.inmateName || 'N/A'}</div>
                          </div>
                        </Col>
                        <Col md={3}>
                          <div className="d-flex align-items-center">
                            <Badge 
                              bg={getTimerVariant(timer.timeRemainingMinutes)} 
                              className="me-3 p-2 fs-6"
                            >
                              {formatTimeRemaining(timer.timeRemainingMinutes)}
                            </Badge>
                            <div className="flex-grow-1" style={{ maxWidth: '120px' }}>
                              <ProgressBar 
                                now={getTimerProgress(timer.timeRemainingMinutes)} 
                                variant={getTimerVariant(timer.timeRemainingMinutes)}
                                animated={timer.timeRemainingMinutes < 30}
                                style={{ 
                                  height: '10px',
                                  backgroundColor: '#e9ecef'
                                }}
                              />
                            </div>
                          </div>
                        </Col>
                        <Col md={2} className="text-center">
                          {timer.timeRemainingMinutes < 10 && (
                            <Badge bg="danger" className="p-2 fs-6">
                              ⚠️ Critical
                            </Badge>
                          )}
                          {timer.timeRemainingMinutes >= 10 && timer.timeRemainingMinutes < 30 && (
                            <Badge bg="warning" text="dark" className="p-2 fs-6">
                              🔥 Urgent
                            </Badge>
                          )}
                          {timer.timeRemainingMinutes >= 30 && (
                            <Badge bg="success" className="p-2 fs-6">
                              ✅ Active
                            </Badge>
                          )}
                        </Col>
                      </Row>
                    </div>
                  ))}
                  
                  {activeTimers.length > 5 && (
                    <div className="text-center mt-3">
                      <Alert variant="info" className="mb-0">
                        <strong>... and {activeTimers.length - 5} more active visitor timers</strong>
                        <br />
                        <small>Total {activeTimers.length} visitors with active 3-hour timers</small>
                      </Alert>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-4">
                  <FaUserClock size={48} className="text-muted mb-3" />
                  <h5 className="text-muted">No Active Visitor Timers</h5>
                  <p className="text-muted">
                    When visitors check in and are approved, their 3-hour timers will appear here.
                    <br />
                    <small>Guests do not have timers - only time in/out recording.</small>
                  </p>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Core Statistics */}
      <Row className="mb-4">
        <Col>
          <h5 className="mb-3" style={{ color: "#2c3e50", borderBottom: "1px solid #dee2e6", paddingBottom: "8px" }}>
            <FaUsers className="me-2" />
            Core Statistics
          </h5>
        </Col>
      </Row>
      <Row className="mb-4 g-3">
        <Col md={3}>
          <Card className="text-center h-100 shadow-sm border-0">
            <Card.Body className="p-3">
              <FaUsers size={30} className="mb-2 text-primary" />
              <Card.Title style={{ fontSize: "1rem", color: "#2c3e50" }}>Total Inmates</Card.Title>
              <Card.Text style={{ fontSize: "1.8rem", fontWeight: "bold", color: "#2c3e50" }}>
                {getTotalInmates()}
              </Card.Text>
              <div className="small text-muted">
                <FaMars className="text-info me-1" /> {getMaleInmates()} Male • 
                <FaVenus className="text-danger ms-2 me-1" /> {getFemaleInmates()} Female
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3}>
          <Card className="text-center h-100 shadow-sm border-0">
            <Card.Body className="p-3">
              <FaUserFriends size={30} className="mb-2 text-success" />
              <Card.Title style={{ fontSize: "1rem", color: "#2c3e50" }}>Total Visitors</Card.Title>
              <Card.Text style={{ fontSize: "1.8rem", fontWeight: "bold", color: "#2c3e50" }}>
                {getTotalVisitors()}
              </Card.Text>
              <div className="small text-muted">
                <FaUserCheck className="text-success me-1" /> {getApprovedVisitors()} Approved
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3}>
          <Card className="text-center h-100 shadow-sm border-0">
            <Card.Body className="p-3">
              <FaUserFriends size={30} className="mb-2 text-info" />
              <Card.Title style={{ fontSize: "1rem", color: "#2c3e50" }}>Total Guests</Card.Title>
              <Card.Text style={{ fontSize: "1.8rem", fontWeight: "bold", color: "#2c3e50" }}>
                {getTotalGuests()}
              </Card.Text>
              <div className="small text-muted">
                <FaUserCheck className="text-success me-1" /> {getApprovedGuests()} Approved
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3}>
          <Card className="text-center h-100 shadow-sm border-0">
            <Card.Body className="p-3">
              <FaUser size={30} className="mb-2 text-warning" />
              <Card.Title style={{ fontSize: "1rem", color: "#2c3e50" }}>Total System Users</Card.Title>
              <Card.Text style={{ fontSize: "1.8rem", fontWeight: "bold", color: "#2c3e50" }}>
                {getTotalUsers()}
              </Card.Text>
              <div className="small text-muted">
                <FaUserShield className="me-1" /> {getTotalAdmins()} Admin • 
                <FaUserTie className="ms-2 me-1" /> {getTotalStaff()} Staff
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Visit Statistics */}
      <Row className="mb-4">
        <Col>
          <h5 className="mb-3" style={{ color: "#2c3e50", borderBottom: "1px solid #dee2e6", paddingBottom: "8px" }}>
            <FaChartBar className="me-2" />
            Visit Statistics (All Check-ins)
          </h5>
        </Col>
      </Row>
      <Row className="mb-4 g-3">
        <Col md={4}>
          <Card className="text-center h-100 shadow-sm border-0" style={{ 
            background: "linear-gradient(135deg, #ffd89b 0%, #19547b 100%)"
          }}>
            <Card.Body className="p-3">
              <FaCalendarWeek size={30} className="mb-2" style={{ color: "#fff" }} />
              <Card.Title style={{ fontSize: "1rem", color: "#fff" }}>Visits This Week</Card.Title>
              <Card.Text style={{ fontSize: "1.8rem", fontWeight: "bold", color: "#fff" }}>
                {getVisitorsThisWeek()}
              </Card.Text>
              <div className="small" style={{ color: "rgba(255,255,255,0.8)" }}>
                All check-ins this week
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={4}>
          <Card className="text-center h-100 shadow-sm border-0" style={{ 
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
          }}>
            <Card.Body className="p-3">
              <FaCalendarAlt size={30} className="mb-2" style={{ color: "#fff" }} />
              <Card.Title style={{ fontSize: "1rem", color: "#fff" }}>Visits This Month</Card.Title>
              <Card.Text style={{ fontSize: "1.8rem", fontWeight: "bold", color: "#fff" }}>
                {getVisitorsThisMonth()}
              </Card.Text>
              <div className="small" style={{ color: "rgba(255,255,255,0.8)" }}>
                All check-ins this month
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={4}>
          <Card className="text-center h-100 shadow-sm border-0" style={{ 
            background: "linear-gradient(135deg, #51cf66 0%, #94d82d 100%)"
          }}>
            <Card.Body className="p-3">
              <FaCalendarDay size={30} className="mb-2" style={{ color: "#fff" }} />
              <Card.Title style={{ fontSize: "1rem", color: "#fff" }}>Visits This Year</Card.Title>
              <Card.Text style={{ fontSize: "1.8rem", fontWeight: "bold", color: "#fff" }}>
                {getVisitorsThisYear()}
              </Card.Text>
              <div className="small" style={{ color: "rgba(255,255,255,0.8)" }}>
                All check-ins this year
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Visitor Analytics */}
      <Row className="mb-4">
        <Col>
          <h5 className="mb-3" style={{ color: "#2c3e50", borderBottom: "1px solid #dee2e6", paddingBottom: "8px" }}>
            <FaUserCheck className="me-2" />
            Visitor Analytics
          </h5>
        </Col>
      </Row>
      <Row className="mb-4 g-3">
        <Col md={3}>
          <Card className="text-center h-100 shadow-sm border-0">
            <Card.Body className="p-3">
              <FaUserFriends size={25} className="mb-2 text-primary" />
              <Card.Title style={{ fontSize: "0.9rem", color: "#2c3e50" }}>Unique Visitors</Card.Title>
              <Card.Text style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#2c3e50" }}>
                {getUniqueVisitors()}
              </Card.Text>
              <div className="small text-muted">
                Different people who visited
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3}>
          <Card className="text-center h-100 shadow-sm border-0">
            <Card.Body className="p-3">
              <FaUserCheck size={25} className="mb-2 text-success" />
              <Card.Title style={{ fontSize: "0.9rem", color: "#2c3e50" }}>Repeat Visitors</Card.Title>
              <Card.Text style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#2c3e50" }}>
                {getRepeatVisitors()}
              </Card.Text>
              <div className="small text-muted">
                Visitors who came multiple times
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3}>
          <Card className="text-center h-100 shadow-sm border-0">
            <Card.Body className="p-3">
              <FaUserClock size={25} className="mb-2 text-warning" />
              <Card.Title style={{ fontSize: "0.9rem", color: "#2c3e50" }}>Active Visitors</Card.Title>
              <Card.Text style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#2c3e50" }}>
                {getActiveVisitorsNow()}
              </Card.Text>
              <div className="small text-muted">
                Visitors with active timers
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3}>
          <Card className="text-center h-100 shadow-sm border-0">
            <Card.Body className="p-3">
              <FaHistory size={25} className="mb-2 text-info" />
              <Card.Title style={{ fontSize: "0.9rem", color: "#2c3e50" }}>Total Recorded Visits</Card.Title>
              <Card.Text style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#2c3e50" }}>
                {getTotalRecordedVisits()}
              </Card.Text>
              <div className="small text-muted">
                All time visit records
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Guest Analytics */}
      <Row className="mb-4">
        <Col>
          <h5 className="mb-3" style={{ color: "#2c3e50", borderBottom: "1px solid #dee2e6", paddingBottom: "8px" }}>
            <FaUserFriends className="me-2" />
            Guest Analytics
          </h5>
        </Col>
      </Row>
      <Row className="mb-4 g-3">
        <Col md={3}>
          <Card className="text-center h-100 shadow-sm border-0">
            <Card.Body className="p-3">
              <FaUserFriends size={25} className="mb-2 text-primary" />
              <Card.Title style={{ fontSize: "0.9rem", color: "#2c3e50" }}>Total Guests</Card.Title>
              <Card.Text style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#2c3e50" }}>
                {getTotalGuests()}
              </Card.Text>
              <div className="small text-muted">
                All registered guests
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3}>
          <Card className="text-center h-100 shadow-sm border-0">
            <Card.Body className="p-3">
              <FaUserCheck size={25} className="mb-2 text-success" />
              <Card.Title style={{ fontSize: "0.9rem", color: "#2c3e50" }}>Approved Guests</Card.Title>
              <Card.Text style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#2c3e50" }}>
                {getApprovedGuests()}
              </Card.Text>
              <div className="small text-muted">
                Currently approved
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3}>
          <Card className="text-center h-100 shadow-sm border-0">
            <Card.Body className="p-3">
              <FaUserClock size={25} className="mb-2 text-warning" />
              <Card.Title style={{ fontSize: "0.9rem", color: "#2c3e50" }}>Pending Guests</Card.Title>
              <Card.Text style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#2c3e50" }}>
                {getPendingGuests()}
              </Card.Text>
              <div className="small text-muted">
                Awaiting approval
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3}>
          <Card className="text-center h-100 shadow-sm border-0">
            <Card.Body className="p-3">
              <FaUserClock size={25} className="mb-2 text-info" />
              <Card.Title style={{ fontSize: "0.9rem", color: "#2c3e50" }}>Active Guests</Card.Title>
              <Card.Text style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#2c3e50" }}>
                {getActiveGuestsNow()}
              </Card.Text>
              <div className="small text-muted">
                Checked in today
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Status Breakdown */}
      <Row className="mb-4">
        <Col>
          <h5 className="mb-3" style={{ color: "#2c3e50", borderBottom: "1px solid #dee2e6", paddingBottom: "8px" }}>
            <FaChartBar className="me-2" />
            Status Breakdown
          </h5>
        </Col>
      </Row>
      <Row className="mb-4 g-3">
        <Col md={6}>
          <Card className="text-center h-100 shadow-sm border-0">
            <Card.Header className="bg-primary text-white">
              <h6 className="mb-0">Visitor Status</h6>
            </Card.Header>
            <Card.Body className="p-3">
              <Row>
                <Col>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span>Approved:</span>
                    <Badge bg="success">{getApprovedVisitors()}</Badge>
                  </div>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span>Pending:</span>
                    <Badge bg="warning" text="dark">{getPendingVisitors()}</Badge>
                  </div>
                  <div className="d-flex justify-content-between align-items-center">
                    <span>Rejected:</span>
                    <Badge bg="danger">{getRejectedVisitors()}</Badge>
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>

        <Col md={6}>
          <Card className="text-center h-100 shadow-sm border-0">
            <Card.Header className="bg-info text-white">
              <h6 className="mb-0">Guest Status</h6>
            </Card.Header>
            <Card.Body className="p-3">
              <Row>
                <Col>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span>Approved:</span>
                    <Badge bg="success">{getApprovedGuests()}</Badge>
                  </div>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span>Pending:</span>
                    <Badge bg="warning" text="dark">{getPendingGuests()}</Badge>
                  </div>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span>Rejected:</span>
                    <Badge bg="danger">{getRejectedGuests()}</Badge>
                  </div>
                  <div className="d-flex justify-content-between align-items-center">
                    <span>Completed:</span>
                    <Badge bg="secondary">{getCompletedGuests()}</Badge>
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Dashboard;