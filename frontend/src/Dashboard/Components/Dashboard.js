import React, { useState, useEffect } from "react";
import axios from "axios";
import { Card, Row, Col, Container, Button, Collapse, Table, Badge, Alert, ProgressBar } from "react-bootstrap";
import { 
  FaUsers, 
  FaUserFriends,
  FaUserCheck,
  FaUserTimes,
  FaChartBar, 
  FaVenus, 
  FaMars, 
  FaIdCard,
  FaUserShield,
  FaUserTie,
  FaUser,
  FaClock,
  FaCheckCircle,
  FaTimesCircle,
  FaExclamationTriangle,
  FaHourglassHalf,
  FaServer,
  FaNetworkWired,
  FaShieldAlt,
  FaUserClock,
  FaCalendarWeek,
  FaCalendarAlt,
  FaCalendarDay,
  FaHistory
} from "react-icons/fa";
import "bootstrap/dist/css/bootstrap.min.css";

const INMATES_API_URL = "http://localhost:5000/inmates";
const VISITORS_API_URL = "http://localhost:5000/visitors";
const USERS_API_URL = "http://localhost:5000/users";
const ACTIVE_TIMERS_URL = "http://localhost:5000/visitors/active-timers";
const DEBUG_TIMERS_URL = "http://localhost:5000/visitors-debug/timers";

const Dashboard = () => {
  const [inmates, setInmates] = useState([]);
  const [visitors, setVisitors] = useState([]);
  const [users, setUsers] = useState([]);
  const [activeTimers, setActiveTimers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);

  useEffect(() => {
    fetchDashboardData();
    
    // Update timers every 5 seconds for real-time countdown
    const timerInterval = setInterval(() => {
      fetchActiveTimers();
    }, 5000);

    // Update full data every 30 seconds
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
      const [inmatesRes, visitorsRes, usersRes] = await Promise.all([
        axios.get(INMATES_API_URL),
        axios.get(VISITORS_API_URL),
        axios.get(USERS_API_URL)
      ]);
      setInmates(inmatesRes.data);
      setVisitors(visitorsRes.data);
      setUsers(usersRes.data);
      await fetchActiveTimers();
      setLastUpdate(new Date());
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    }
    setLoading(false);
  };

  const fetchActiveTimers = async () => {
    try {
      console.log('🔄 Fetching active timers from:', ACTIVE_TIMERS_URL);
      const response = await axios.get(ACTIVE_TIMERS_URL);
      console.log('✅ Active timers received:', response.data.length);
      
      // Log detailed timer information
      response.data.forEach((timer, index) => {
        console.log(`   ${index + 1}. ${timer.fullName}: ${timer.timeRemainingMinutes}min - Active: ${timer.isTimerActive}`);
      });
      
      setActiveTimers(response.data);
    } catch (error) {
      console.error("❌ Error fetching active timers:", error);
      // Don't set empty array, keep previous timers
    }
  };

  // Debug function to check what's happening
  const debugTimers = async () => {
    try {
      console.log('🔍 DEBUG: Checking all visitors timer status...');
      const response = await axios.get(DEBUG_TIMERS_URL);
      console.log('📊 DEBUG - All visitors:', response.data);
      
      const activeCount = response.data.filter(v => v.isTimerActive).length;
      const timedInCount = response.data.filter(v => v.hasTimedIn).length;
      
      console.log(`📈 DEBUG Summary: ${activeCount} active timers, ${timedInCount} visitors timed in`);
      
      alert(`DEBUG: ${activeCount} active timers, ${timedInCount} visitors timed in. Check console for details.`);
    } catch (error) {
      console.error('❌ Debug error:', error);
    }
  };

  // Helper functions for statistics
  const getTotalInmates = () => inmates.length;
  const getTotalVisitors = () => visitors.length;
  const getMaleInmates = () => inmates.filter(i => i.sex === "Male").length;
  const getFemaleInmates = () => inmates.filter(i => i.sex === "Female").length;
  const getPendingVisitors = () => visitors.filter(v => v.status === "pending").length;
  const getApprovedVisitors = () => visitors.filter(v => v.status === "approved").length;
  const getRejectedVisitors = () => visitors.filter(v => v.status === "rejected").length;
  const getTotalUsers = () => users.length;
  const getTotalAdmins = () => users.filter(u => u.role && u.role.includes('Admin')).length;
  const getTotalStaff = () => users.filter(u => u.role && u.role.includes('Staff')).length;
  
  // Accurate visit statistics based on visitor logs
  const getTotalRecordedVisits = () => {
    return visitors.filter(v => v.hasTimedIn).length;
  };

  const getVisitorsThisWeek = () => {
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    
    return visitors.filter(v => {
      const visitDate = v.dateVisited ? new Date(v.dateVisited) : new Date(v.createdAt);
      return visitDate >= startOfWeek && v.hasTimedIn;
    }).length;
  };

  const getVisitorsThisMonth = () => {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    return visitors.filter(v => {
      const visitDate = v.dateVisited ? new Date(v.dateVisited) : new Date(v.createdAt);
      return visitDate >= startOfMonth && v.hasTimedIn;
    }).length;
  };

  const getVisitorsThisYear = () => {
    const startOfYear = new Date(new Date().getFullYear(), 0, 1);
    
    return visitors.filter(v => {
      const visitDate = v.dateVisited ? new Date(v.dateVisited) : new Date(v.createdAt);
      return visitDate >= startOfYear && v.hasTimedIn;
    }).length;
  };

  // Timer helper functions
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
    // If it's already a formatted time string, convert to 12-hour format
    if (typeof timeIn === 'string' && timeIn.includes(':')) {
      const [hours, minutes] = timeIn.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const twelveHour = hour % 12 || 12;
      return `${twelveHour}:${minutes} ${ampm}`;
    }
    return 'N/A';
  };

  const getTimerVariant = (minutes) => {
    if (minutes > 120) return 'success'; // More than 2 hours - green
    if (minutes > 30) return 'warning';  // 30 minutes to 2 hours - yellow
    return 'danger';                     // Less than 30 minutes - red
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

  // Get top 5 most urgent timers (least time remaining)
  const getTopUrgentTimers = () => {
    return activeTimers
      .sort((a, b) => a.timeRemainingMinutes - b.timeRemainingMinutes)
      .slice(0, 5);
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
          Prison Management Dashboard
        </h2>
        <Button 
          variant="outline-info" 
          size="sm" 
          onClick={debugTimers}
          title="Debug timer status"
        >
          🐛 Debug Timers
        </Button>
      </div>

      {/* Last update indicator */}
      {lastUpdate && (
        <div className="text-end mb-3">
          <small className="text-muted">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </small>
        </div>
      )}

      {/* Critical Alert Section - Always Visible */}
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

      {/* ACTIVE TIMERS SECTION - THIS WILL NOW SHOW TIMERS */}
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
                  <FaHourglassHalf className="me-2" />
                  Active Visitor Timers 
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
                  {/* Show top 5 urgent timers */}
                  {getTopUrgentTimers().map((visitor, index) => (
                    <div 
                      key={visitor._id || index}
                      className={`mb-3 p-3 border rounded ${
                        visitor.timeRemainingMinutes < 10 
                          ? 'border-danger bg-danger bg-opacity-10' 
                          : visitor.timeRemainingMinutes < 30 
                          ? 'border-warning bg-warning bg-opacity-10' 
                          : 'border-success bg-success bg-opacity-10'
                      }`}
                    >
                      <Row className="align-items-center">
                        <Col md={4}>
                          <div className="d-flex align-items-center">
                            <div className="me-3">
                              <FaUserClock size={24} className={
                                visitor.timeRemainingMinutes < 10 
                                  ? 'text-danger' 
                                  : visitor.timeRemainingMinutes < 30 
                                  ? 'text-warning' 
                                  : 'text-success'
                              } />
                            </div>
                            <div>
                              <div className="fw-bold fs-6">{visitor.fullName}</div>
                              <div className="text-muted small">
                                Timed In: {formatTimeIn(visitor.timeIn)}
                              </div>
                              <div className="small text-muted">
                                Visitor ID: {visitor.id}
                              </div>
                            </div>
                          </div>
                        </Col>
                        <Col md={3}>
                          <div className="small">
                            <div className="fw-bold">Prisoner:</div>
                            <div className="text-muted">{visitor.prisonerId}</div>
                          </div>
                        </Col>
                        <Col md={3}>
                          <div className="d-flex align-items-center">
                            <Badge 
                              bg={getTimerVariant(visitor.timeRemainingMinutes)} 
                              className="me-3 p-2 fs-6"
                            >
                              {formatTimeRemaining(visitor.timeRemainingMinutes)}
                            </Badge>
                            <div className="flex-grow-1" style={{ maxWidth: '120px' }}>
                              <ProgressBar 
                                now={getTimerProgress(visitor.timeRemainingMinutes)} 
                                variant={getTimerVariant(visitor.timeRemainingMinutes)}
                                animated={visitor.timeRemainingMinutes < 30}
                                style={{ 
                                  height: '10px',
                                  backgroundColor: '#e9ecef'
                                }}
                              />
                            </div>
                          </div>
                        </Col>
                        <Col md={2} className="text-center">
                          {visitor.timeRemainingMinutes < 10 && (
                            <Badge bg="danger" className="p-2 fs-6">
                              ⚠️ Critical
                            </Badge>
                          )}
                          {visitor.timeRemainingMinutes >= 10 && visitor.timeRemainingMinutes < 30 && (
                            <Badge bg="warning" text="dark" className="p-2 fs-6">
                              🔥 Urgent
                            </Badge>
                          )}
                          {visitor.timeRemainingMinutes >= 30 && (
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
                        <strong>... and {activeTimers.length - 5} more active timers</strong>
                        <br />
                        <small>Total {activeTimers.length} visitors with active timers</small>
                      </Alert>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-4">
                  <FaUserClock size={48} className="text-muted mb-3" />
                  <h5 className="text-muted">No Active Timers</h5>
                  <p className="text-muted">
                    When visitors check in and are approved, their timers will appear here.
                  </p>
                  <Button 
                    variant="outline-primary" 
                    size="sm"
                    onClick={fetchActiveTimers}
                  >
                    🔄 Check for Timers
                  </Button>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Rest of your dashboard statistics cards... */}
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
                <FaCheckCircle className="text-success me-1" /> {getApprovedVisitors()} Approved
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3}>
          <Card className="text-center h-100 shadow-sm border-0">
            <Card.Body className="p-3">
              <FaUser size={30} className="mb-2 text-info" />
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

        <Col md={3}>
          <Card className="text-center h-100 shadow-sm border-0">
            <Card.Body className="p-3">
              <FaHistory size={30} className="mb-2 text-warning" />
              <Card.Title style={{ fontSize: "1rem", color: "#2c3e50" }}>Total Recorded Visits</Card.Title>
              <Card.Text style={{ fontSize: "1.8rem", fontWeight: "bold", color: "#2c3e50" }}>
                {getTotalRecordedVisits()}
              </Card.Text>
              <div className="small text-muted">
                Visitors who completed check-in
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Time-based Visit Statistics */}
      <Row className="mb-4">
        <Col>
          <h5 className="mb-3" style={{ color: "#2c3e50", borderBottom: "1px solid #dee2e6", paddingBottom: "8px" }}>
            <FaChartBar className="me-2" />
            Visit Statistics
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
              <Card.Title style={{ fontSize: "1rem", color: "#fff" }}>Total Visitors This Week</Card.Title>
              <Card.Text style={{ fontSize: "1.8rem", fontWeight: "bold", color: "#fff" }}>
                {getVisitorsThisWeek()}
              </Card.Text>
              <div className="small" style={{ color: "rgba(255,255,255,0.8)" }}>
                Current week visits
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
              <Card.Title style={{ fontSize: "1rem", color: "#fff" }}>Total Visitors This Month</Card.Title>
              <Card.Text style={{ fontSize: "1.8rem", fontWeight: "bold", color: "#fff" }}>
                {getVisitorsThisMonth()}
              </Card.Text>
              <div className="small" style={{ color: "rgba(255,255,255,0.8)" }}>
                Current month visits
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
              <Card.Title style={{ fontSize: "1rem", color: "#fff" }}>Total Visitors This Year</Card.Title>
              <Card.Text style={{ fontSize: "1.8rem", fontWeight: "bold", color: "#fff" }}>
                {getVisitorsThisYear()}
              </Card.Text>
              <div className="small" style={{ color: "rgba(255,255,255,0.8)" }}>
                Current year visits
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Additional Statistics */}
      <Row className="mb-4">
        <Col>
          <h5 className="mb-3" style={{ color: "#2c3e50", borderBottom: "1px solid #dee2e6", paddingBottom: "8px" }}>
            <FaUserCheck className="me-2" />
            Additional Metrics
          </h5>
        </Col>
      </Row>
      <Row className="mb-4 g-3">
        <Col md={4}>
          <Card className="text-center h-100 shadow-sm border-0">
            <Card.Body className="p-3">
              <FaMars size={25} className="mb-2 text-info" />
              <Card.Title style={{ fontSize: "0.9rem", color: "#2c3e50" }}>Male Inmates</Card.Title>
              <Card.Text style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#2c3e50" }}>
                {getMaleInmates()}
              </Card.Text>
              <div className="small text-muted">
                {getTotalInmates() > 0 ? Math.round((getMaleInmates() / getTotalInmates()) * 100) : 0}% of total
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={4}>
          <Card className="text-center h-100 shadow-sm border-0">
            <Card.Body className="p-3">
              <FaVenus size={25} className="mb-2 text-danger" />
              <Card.Title style={{ fontSize: "0.9rem", color: "#2c3e50" }}>Female Inmates</Card.Title>
              <Card.Text style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#2c3e50" }}>
                {getFemaleInmates()}
              </Card.Text>
              <div className="small text-muted">
                {getTotalInmates() > 0 ? Math.round((getFemaleInmates() / getTotalInmates()) * 100) : 0}% of total
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={4}>
          <Card className="text-center h-100 shadow-sm border-0">
            <Card.Body className="p-3">
              <FaUserClock size={25} className="mb-2 text-warning" />
              <Card.Title style={{ fontSize: "0.9rem", color: "#2c3e50" }}>Active Visitors Now</Card.Title>
              <Card.Text style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#2c3e50" }}>
                {activeTimers.length}
              </Card.Text>
              <div className="small text-muted">
                Currently with active timers
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Refresh Button */}
      <Row className="mt-4">
        <Col className="text-center">
          <Button 
            variant="outline-primary" 
            onClick={fetchDashboardData}
            disabled={loading}
            size="sm"
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Refreshing...
              </>
            ) : (
              'Refresh Data'
            )}
          </Button>
        </Col>
      </Row>
    </Container>
  );
};

export default Dashboard;