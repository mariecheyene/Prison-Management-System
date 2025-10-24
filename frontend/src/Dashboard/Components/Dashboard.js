import React, { useState, useEffect } from "react";
import axios from "axios";
import { Card, Row, Col, Container, Button, Alert, ProgressBar, Badge, Spinner } from "react-bootstrap";
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
  FaExclamationTriangle,
  FaExclamationCircle
} from "react-icons/fa";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import "bootstrap/dist/css/bootstrap.min.css";

const INMATES_API_URL = "http://localhost:5000/inmates";
const VISITORS_API_URL = "http://localhost:5000/visitors";
const GUESTS_API_URL = "http://localhost:5000/guests";
const USERS_API_URL = "http://localhost:5000/users";
const ACTIVE_TIMERS_URL = "http://localhost:5000/visit-logs/active-visitor-timers";
const VISIT_LOGS_URL = "http://localhost:5000/visit-logs";

// Color palette - muted and professional
const COLORS = {
  primary: '#4ECDC4',       // Teal
  secondary: '#556CD6',     // Muted blue
  success: '#27AE60',       // Green
  warning: '#F39C12',       // Orange
  danger: '#E74C3C',        // Red
  info: '#3498DB',          // Blue
  purple: '#9B59B6',        // Purple
  dark: '#2C3E50',          // Dark blue
  light: '#ECF0F1',         // Light gray
  gray: '#95A5A6'           // Gray
};

const CHART_COLORS = [
  COLORS.primary,
  COLORS.secondary,
  COLORS.success,
  COLORS.warning,
  COLORS.danger,
  COLORS.info,
  COLORS.purple,
  COLORS.dark
];

// Helper function to safely validate dates
const isValidDate = (date) => {
  if (!date) return false;
  const dateObj = new Date(date);
  return !isNaN(dateObj.getTime());
};

// Helper function to safely get date string in YYYY-MM-DD format
const getSafeDateString = (date) => {
  if (!isValidDate(date)) return null;
  const dateObj = new Date(date);
  return dateObj.toISOString().split('T')[0];
};

// Helper to get day name from date
const getDayName = (date) => {
  return new Date(date).toLocaleDateString('en-US', { weekday: 'short' });
};

const Dashboard = () => {
  const [inmates, setInmates] = useState([]);
  const [visitors, setVisitors] = useState([]);
  const [guests, setGuests] = useState([]);
  const [users, setUsers] = useState([]);
  const [activeTimers, setActiveTimers] = useState([]);
  const [visitLogs, setVisitLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [chartLoading, setChartLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [error, setError] = useState(null);

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
    setChartLoading(true);
    setError(null);
    try {
      const [inmatesRes, visitorsRes, guestsRes, usersRes, visitLogsRes] = await Promise.all([
        axios.get(INMATES_API_URL),
        axios.get(VISITORS_API_URL),
        axios.get(GUESTS_API_URL),
        axios.get(USERS_API_URL),
        axios.get(VISIT_LOGS_URL)
      ]);
      
      setInmates(inmatesRes.data || []);
      setVisitors(visitorsRes.data || []);
      setGuests(guestsRes.data || []);
      setUsers(usersRes.data || []);
      setVisitLogs(visitLogsRes.data || []);
      
      await fetchActiveTimers();
      setLastUpdate(new Date());
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setError("Failed to fetch dashboard data. Please check if the server is running.");
    }
    setLoading(false);
    setChartLoading(false);
  };

  const fetchActiveTimers = async () => {
    try {
      const response = await axios.get(ACTIVE_TIMERS_URL);
      setActiveTimers(response.data || []);
    } catch (error) {
      console.error("❌ Error fetching active timers:", error);
    }
  };

  // Chart Data Preparation with REAL data from visitLogs
  const getWeeklyVisitData = () => {
    console.log('📊 Processing weekly data from visit logs:', visitLogs);
    
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    const weekData = days.map((day, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - today.getDay() + index);
      const dateString = getSafeDateString(date);
      
      // Count visits for this specific date
      const dayVisits = visitLogs.filter(log => {
        // Try different possible date fields
        const visitDate = log.visitDate || log.date || log.createdAt || log.timeIn;
        if (!isValidDate(visitDate)) return false;
        
        const logDateString = getSafeDateString(new Date(visitDate));
        return logDateString === dateString;
      }).length;

      return {
        name: day,
        visits: dayVisits,
        fullDate: dateString
      };
    });

    console.log('📈 Weekly visit data:', weekData);
    return weekData;
  };

  const getMonthlyVisitData = () => {
    console.log('📊 Processing monthly data from visit logs');
    
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    
    // Create 4 weeks for the current month
    const monthData = [];
    for (let week = 0; week < 4; week++) {
      const startDate = new Date(year, month, week * 7 + 1);
      const endDate = new Date(year, month, (week + 1) * 7);
      
      const weekVisits = visitLogs.filter(log => {
        const visitDate = log.visitDate || log.date || log.createdAt || log.timeIn;
        if (!isValidDate(visitDate)) return false;
        
        const logDate = new Date(visitDate);
        return logDate >= startDate && logDate <= endDate && 
               logDate.getMonth() === month && 
               logDate.getFullYear() === year;
      }).length;

      monthData.push({
        name: `Week ${week + 1}`,
        visits: weekVisits,
        range: `${startDate.getDate()}-${endDate.getDate()}`
      });
    }

    console.log('📈 Monthly visit data:', monthData);
    return monthData;
  };

  const getVisitTypeData = () => {
    console.log('📊 Processing visit type data');
    
    // Count based on actual data structure
    const totalVisits = visitLogs.length;
    const visitorVisits = visitors.length; // Total registered visitors
    const guestVisits = guests.length;     // Total registered guests
    
    // Alternative: Count from visit logs if type information exists
    const visitsFromLogs = {
      visitors: visitLogs.filter(log => log.visitType === 'visitor' || log.personType === 'visitor').length,
      guests: visitLogs.filter(log => log.visitType === 'guest' || log.personType === 'guest').length
    };

    const data = [
      { 
        name: 'Visitors', 
        value: visitsFromLogs.visitors > 0 ? visitsFromLogs.visitors : visitorVisits 
      },
      { 
        name: 'Guests', 
        value: visitsFromLogs.guests > 0 ? visitsFromLogs.guests : guestVisits 
      }
    ];

    console.log('📈 Visit type data:', data);
    return data;
  };

  const getTimeOfDayData = () => {
  console.log('🕒 Processing time of day data from visit logs:', visitLogs);
  
  const timeSlots = [
    { name: 'Morning\n(6AM-12PM)', range: [6, 11], count: 0 },
    { name: 'Afternoon\n(12PM-6PM)', range: [12, 17], count: 0 },
    { name: 'Evening\n(6PM-12AM)', range: [18, 23], count: 0 },
    { name: 'Night\n(12AM-6AM)', range: [0, 5], count: 0 }
  ];

  let processedCount = 0;
  let errorCount = 0;

  // Debug: Show all available time fields in the first few logs
  if (visitLogs.length > 0) {
    console.log('🔍 Available time fields in first log:', Object.keys(visitLogs[0]).filter(key => 
      key.toLowerCase().includes('time') || 
      key.toLowerCase().includes('date') ||
      key === 'createdAt' || 
      key === 'updatedAt'
    ));
    
    // Show sample of time data
    visitLogs.slice(0, 3).forEach((log, index) => {
      console.log(`📋 Sample log ${index} time data:`, {
        timeIn: log.timeIn,
        visitTime: log.visitTime,
        checkInTime: log.checkInTime,
        createdAt: log.createdAt,
        timestamp: log.timestamp,
        visitDate: log.visitDate
      });
    });
  }

  visitLogs.forEach((log, index) => {
    // Try multiple possible time fields in order of likelihood
    const timeFields = [
      log.timeIn,
      log.checkInTime, 
      log.visitTime,
      log.timestamp,
      log.createdAt,
      log.visitDate // Fallback to date if no time field
    ];

    let hour = null;
    let usedField = null;

    for (const field of timeFields) {
      if (field && isValidDate(field)) {
        try {
          const date = new Date(field);
          hour = date.getHours();
          usedField = field;
          break;
        } catch (error) {
          continue;
        }
      }
    }

    // If we found a valid hour, assign to time slot
    if (hour !== null) {
      console.log(`✅ Log ${index}: ${usedField} -> hour=${hour}`);
      
      let slotFound = false;
      timeSlots.forEach(slot => {
        if (hour >= slot.range[0] && hour <= slot.range[1]) {
          slot.count++;
          slotFound = true;
          processedCount++;
        }
      });
      
      if (!slotFound) {
        console.log(`❌ Hour ${hour} didn't match any time slot ranges`);
      }
    } else {
      console.log(`❌ No valid time field found in log ${index}`);
      errorCount++;
    }
  });

  console.log('📊 Time of day processing summary:', {
    totalLogs: visitLogs.length,
    successfullyProcessed: processedCount,
    errors: errorCount,
    timeSlotDistribution: timeSlots.map(slot => ({ name: slot.name, count: slot.count }))
  });

  const data = timeSlots.map(slot => ({
    name: slot.name,
    visits: slot.count
  }));

  return data;
};

  const getStatusDistributionData = () => {
    return [
      { name: 'Approved Visitors', value: getApprovedVisitors() },
      { name: 'Pending Visitors', value: getPendingVisitors() },
      { name: 'Rejected Visitors', value: getRejectedVisitors() },
      { name: 'Approved Guests', value: getApprovedGuests() },
      { name: 'Pending Guests', value: getPendingGuests() }
    ];
  };

  // Custom Tooltip for charts
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip" style={{
          backgroundColor: 'white',
          padding: '10px',
          border: `1px solid ${COLORS.gray}`,
          borderRadius: '5px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
        }}>
          <p className="label" style={{ margin: 0, fontWeight: 'bold', color: COLORS.dark }}>
            {`${label}`}
          </p>
          {payload.map((entry, index) => (
            <p key={index} style={{ 
              margin: '5px 0 0 0', 
              color: entry.color,
              fontWeight: 'bold'
            }}>
              {`${entry.name || 'Visits'}: ${entry.value}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Empty state component for charts
  const EmptyChartState = ({ message = "No data available" }) => (
    <div className="text-center py-4">
      <FaExclamationCircle size={32} className="text-muted mb-2" />
      <p className="text-muted mb-0">{message}</p>
    </div>
  );

  // Loading component for charts
  const ChartLoadingState = () => (
    <div className="text-center py-4">
      <Spinner animation="border" variant="primary" className="mb-2" />
      <p className="text-muted mb-0">Loading chart data...</p>
    </div>
  );

  // Check if we have any visit data for charts
  const hasVisitData = visitLogs.length > 0;

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
  
  const getTotalRecordedVisits = () => visitLogs.length;

  const getVisitorsThisWeek = () => {
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    
    return visitLogs.filter(log => {
      const visitDate = log.visitDate || log.date || log.createdAt;
      if (!isValidDate(visitDate)) return false;
      const visitDateObj = new Date(visitDate);
      return visitDateObj >= startOfWeek;
    }).length;
  };

  const getVisitorsThisMonth = () => {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    return visitLogs.filter(log => {
      const visitDate = log.visitDate || log.date || log.createdAt;
      if (!isValidDate(visitDate)) return false;
      const visitDateObj = new Date(visitDate);
      return visitDateObj >= startOfMonth;
    }).length;
  };

  const getVisitorsThisYear = () => {
    const startOfYear = new Date(new Date().getFullYear(), 0, 1);
    
    return visitLogs.filter(log => {
      const visitDate = log.visitDate || log.date || log.createdAt;
      if (!isValidDate(visitDate)) return false;
      const visitDateObj = new Date(visitDate);
      return visitDateObj >= startOfYear;
    }).length;
  };

  const getUniqueVisitors = () => {
    const validLogs = visitLogs.filter(log => {
      const visitDate = log.visitDate || log.date || log.createdAt;
      return (log.personId || log.visitorId || log.guestId) && isValidDate(visitDate);
    });
    const uniqueVisitorIds = new Set(validLogs.map(log => log.personId || log.visitorId || log.guestId));
    return uniqueVisitorIds.size;
  };

  const getRepeatVisitors = () => {
    const visitorCounts = {};
    const validLogs = visitLogs.filter(log => {
      const visitDate = log.visitDate || log.date || log.createdAt;
      return (log.personId || log.visitorId || log.guestId) && isValidDate(visitDate);
    });
    
    validLogs.forEach(log => {
      const visitorId = log.personId || log.visitorId || log.guestId;
      visitorCounts[visitorId] = (visitorCounts[visitorId] || 0) + 1;
    });
    
    return Object.values(visitorCounts).filter(count => count > 1).length;
  };

  const getActiveGuestsNow = () => {
    const today = getSafeDateString(new Date());
    if (!today) return 0;

    return guests.filter(guest => {
      if (!guest.dailyVisits || !Array.isArray(guest.dailyVisits)) return false;
      
      return guest.dailyVisits.some(visit => {
        if (!visit || !visit.visitDate) return false;
        
        const visitDate = getSafeDateString(visit.visitDate);
        if (!visitDate) return false;
        
        return visitDate === today && visit.hasTimedIn && !visit.hasTimedOut;
      });
    }).length;
  };

  // Timer helper functions
  const formatTimeRemaining = (minutes) => {
    if (minutes === null || minutes === undefined || isNaN(minutes)) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const formatTimeIn = (timeIn) => {
    if (!timeIn || !isValidDate(timeIn)) return 'N/A';
    try {
      return new Date(timeIn).toLocaleTimeString();
    } catch (error) {
      console.error('Error formatting time:', error);
      return 'N/A';
    }
  };

  const getTimerVariant = (minutes) => {
    if (minutes === null || minutes === undefined || isNaN(minutes)) return 'secondary';
    if (minutes > 120) return 'success';
    if (minutes > 30) return 'warning';
    return 'danger';
  };

  const getTimerProgress = (minutes) => {
    if (minutes === null || minutes === undefined || isNaN(minutes)) return 0;
    const totalMinutes = 180;
    return Math.max(0, Math.min(100, (minutes / totalMinutes) * 100));
  };

  const getUrgentTimers = () => {
    return activeTimers.filter(timer => 
      timer.timeRemainingMinutes !== null && 
      timer.timeRemainingMinutes !== undefined && 
      !isNaN(timer.timeRemainingMinutes) && 
      timer.timeRemainingMinutes < 30
    );
  };

  const getCriticalTimers = () => {
    return activeTimers.filter(timer => 
      timer.timeRemainingMinutes !== null && 
      timer.timeRemainingMinutes !== undefined && 
      !isNaN(timer.timeRemainingMinutes) && 
      timer.timeRemainingMinutes < 10
    );
  };

  const getTopUrgentTimers = () => {
    return activeTimers
      .filter(timer => 
        timer.timeRemainingMinutes !== null && 
        timer.timeRemainingMinutes !== undefined && 
        !isNaN(timer.timeRemainingMinutes)
      )
      .sort((a, b) => a.timeRemainingMinutes - b.timeRemainingMinutes)
      .slice(0, 5);
  };

  const getActiveVisitorsNow = () => {
    return activeTimers.length;
  };

  return (
    <Container className="mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 style={{ 
          color: COLORS.dark, 
          fontWeight: "600",
          borderBottom: `2px solid ${COLORS.primary}`,
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
          style={{ borderColor: COLORS.primary, color: COLORS.primary }}
        >
          {loading ? 'Refreshing...' : 'Refresh Data'}
        </Button>
      </div>

      {error && (
        <Alert variant="danger" className="mb-3">
          <FaExclamationCircle className="me-2" />
          {error}
        </Alert>
      )}

      {lastUpdate && (
        <div className="text-end mb-3">
          <small className="text-muted">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </small>
        </div>
      )}

      {/* Critical Alert Section */}
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

      {/* Active Timers Section */}
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
                              <div className="fw-bold fs-6">{timer.personName || 'Unknown Visitor'}</div>
                              <div className="text-muted small">
                                Timed In: {formatTimeIn(timer.timeIn)}
                              </div>
                              <div className="small text-muted">
                                Visitor ID: {timer.personId || 'N/A'}
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
          <h5 className="mb-3" style={{ color: COLORS.dark, borderBottom: "1px solid #dee2e6", paddingBottom: "8px" }}>
            <FaUsers className="me-2" />
            Core Statistics
          </h5>
        </Col>
      </Row>
      <Row className="mb-4 g-3">
        <Col md={3}>
          <Card className="text-center h-100 shadow-sm border-0">
            <Card.Body className="p-3">
              <FaUsers size={30} className="mb-2" style={{ color: COLORS.primary }} />
              <Card.Title style={{ fontSize: "1rem", color: COLORS.dark }}>Total Inmates</Card.Title>
              <Card.Text style={{ fontSize: "1.8rem", fontWeight: "bold", color: COLORS.dark }}>
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
              <FaUserFriends size={30} className="mb-2" style={{ color: COLORS.success }} />
              <Card.Title style={{ fontSize: "1rem", color: COLORS.dark }}>Total Visitors</Card.Title>
              <Card.Text style={{ fontSize: "1.8rem", fontWeight: "bold", color: COLORS.dark }}>
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
              <FaUserFriends size={30} className="mb-2" style={{ color: COLORS.info }} />
              <Card.Title style={{ fontSize: "1rem", color: COLORS.dark }}>Total Guests</Card.Title>
              <Card.Text style={{ fontSize: "1.8rem", fontWeight: "bold", color: COLORS.dark }}>
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
              <FaUser size={30} className="mb-2" style={{ color: COLORS.warning }} />
              <Card.Title style={{ fontSize: "1rem", color: COLORS.dark }}>Total System Users</Card.Title>
              <Card.Text style={{ fontSize: "1.8rem", fontWeight: "bold", color: COLORS.dark }}>
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

      {/* Visit Statistics Charts */}
      <Row className="mb-4">
        <Col>
          <h5 className="mb-3" style={{ color: COLORS.dark, borderBottom: "1px solid #dee2e6", paddingBottom: "8px" }}>
            <FaChartBar className="me-2" />
            Visit Statistics Charts
            {hasVisitData && (
              <Badge bg="success" className="ms-2">
                {visitLogs.length} Records
              </Badge>
            )}
          </h5>
        </Col>
      </Row>

      {chartLoading ? (
        <Row className="mb-4">
          <Col>
            <Card className="text-center shadow-sm border-0">
              <Card.Body className="py-5">
                <ChartLoadingState />
              </Card.Body>
            </Card>
          </Col>
        </Row>
      ) : !hasVisitData ? (
        <Row className="mb-4">
          <Col>
            <Card className="text-center shadow-sm border-0">
              <Card.Body className="py-5">
                <EmptyChartState message="No visit data available. Visit logs will appear here once visitors and guests start checking in." />
              </Card.Body>
            </Card>
          </Col>
        </Row>
      ) : (
        <>
          <Row className="mb-4 g-3">
            {/* Weekly Visits Line Chart */}
            <Col md={6}>
              <Card className="shadow-sm border-0 h-100">
                <Card.Header style={{ backgroundColor: COLORS.primary, color: 'white' }}>
                  <h6 className="mb-0">Weekly Visit Trend</h6>
                </Card.Header>
                <Card.Body>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={getWeeklyVisitData()}>
                      <CartesianGrid strokeDasharray="3 3" stroke={COLORS.light} />
                      <XAxis dataKey="name" stroke={COLORS.dark} />
                      <YAxis stroke={COLORS.dark} />
                      <Tooltip content={<CustomTooltip />} />
                      <Line 
                        type="monotone" 
                        dataKey="visits" 
                        stroke={COLORS.secondary} 
                        strokeWidth={2}
                        dot={{ fill: COLORS.secondary, strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, fill: COLORS.primary }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </Card.Body>
              </Card>
            </Col>

            {/* Visit Type Distribution Pie Chart */}
            <Col md={6}>
              <Card className="shadow-sm border-0 h-100">
                <Card.Header style={{ backgroundColor: COLORS.success, color: 'white' }}>
                  <h6 className="mb-0">Visit Type Distribution</h6>
                </Card.Header>
                <Card.Body>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={getVisitTypeData()}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {getVisitTypeData().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Row className="mb-4 g-3">
            {/* Monthly Visits Bar Chart */}
            <Col md={6}>
              <Card className="shadow-sm border-0 h-100">
                <Card.Header style={{ backgroundColor: COLORS.info, color: 'white' }}>
                  <h6 className="mb-0">Monthly Visit Distribution</h6>
                </Card.Header>
                <Card.Body>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={getMonthlyVisitData()}>
                      <CartesianGrid strokeDasharray="3 3" stroke={COLORS.light} />
                      <XAxis dataKey="name" stroke={COLORS.dark} />
                      <YAxis stroke={COLORS.dark} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="visits" fill={COLORS.purple} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Card.Body>
              </Card>
            </Col>

           {/* Time of Day Visits Bar Chart */}
<Col md={6}>
  <Card className="shadow-sm border-0 h-100">
    <Card.Header style={{ backgroundColor: COLORS.warning, color: 'white' }}>
      <h6 className="mb-0">Visits by Time of Day</h6>
    </Card.Header>
    <Card.Body>
      {getTimeOfDayData().some(slot => slot.visits > 0) ? (
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={getTimeOfDayData()}>
            <CartesianGrid strokeDasharray="3 3" stroke={COLORS.light} />
            <XAxis dataKey="name" stroke={COLORS.dark} />
            <YAxis stroke={COLORS.dark} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="visits" fill={COLORS.danger} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <EmptyChartState 
          message={
            visitLogs.length > 0 
              ? "No time data found in visit logs. Check if time fields exist."
              : "No visit data available"
          } 
        />
      )}
    </Card.Body>
  </Card>
</Col>
          </Row>
        </>
      )}

      {/* Quick Stats Cards */}
      <Row className="mb-4">
        <Col>
          <h5 className="mb-3" style={{ color: COLORS.dark, borderBottom: "1px solid #dee2e6", paddingBottom: "8px" }}>
            <FaChartBar className="me-2" />
            Visit Statistics Summary
          </h5>
        </Col>
      </Row>
      <Row className="mb-4 g-3">
        <Col md={4}>
          <Card className="text-center h-100 shadow-sm border-0" style={{ 
            background: `linear-gradient(135deg, ${COLORS.primary}20 0%, ${COLORS.secondary}20 100%)`,
            border: `1px solid ${COLORS.primary}30`
          }}>
            <Card.Body className="p-3">
              <FaCalendarWeek size={30} className="mb-2" style={{ color: COLORS.primary }} />
              <Card.Title style={{ fontSize: "1rem", color: COLORS.dark }}>Visits This Week</Card.Title>
              <Card.Text style={{ fontSize: "1.8rem", fontWeight: "bold", color: COLORS.dark }}>
                {getVisitorsThisWeek()}
              </Card.Text>
              <div className="small text-muted">
                All check-ins this week
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={4}>
          <Card className="text-center h-100 shadow-sm border-0" style={{ 
            background: `linear-gradient(135deg, ${COLORS.info}20 0%, ${COLORS.purple}20 100%)`,
            border: `1px solid ${COLORS.info}30`
          }}>
            <Card.Body className="p-3">
              <FaCalendarAlt size={30} className="mb-2" style={{ color: COLORS.info }} />
              <Card.Title style={{ fontSize: "1rem", color: COLORS.dark }}>Visits This Month</Card.Title>
              <Card.Text style={{ fontSize: "1.8rem", fontWeight: "bold", color: COLORS.dark }}>
                {getVisitorsThisMonth()}
              </Card.Text>
              <div className="small text-muted">
                All check-ins this month
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={4}>
          <Card className="text-center h-100 shadow-sm border-0" style={{ 
            background: `linear-gradient(135deg, ${COLORS.success}20 0%, ${COLORS.warning}20 100%)`,
            border: `1px solid ${COLORS.success}30`
          }}>
            <Card.Body className="p-3">
              <FaCalendarDay size={30} className="mb-2" style={{ color: COLORS.success }} />
              <Card.Title style={{ fontSize: "1rem", color: COLORS.dark }}>Visits This Year</Card.Title>
              <Card.Text style={{ fontSize: "1.8rem", fontWeight: "bold", color: COLORS.dark }}>
                {getVisitorsThisYear()}
              </Card.Text>
              <div className="small text-muted">
                All check-ins this year
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Visitor Analytics */}
      <Row className="mb-4">
        <Col>
          <h5 className="mb-3" style={{ color: COLORS.dark, borderBottom: "1px solid #dee2e6", paddingBottom: "8px" }}>
            <FaUserCheck className="me-2" />
            Visitor Analytics
          </h5>
        </Col>
      </Row>
      <Row className="mb-4 g-3">
        <Col md={3}>
          <Card className="text-center h-100 shadow-sm border-0">
            <Card.Body className="p-3">
              <FaUserFriends size={25} className="mb-2" style={{ color: COLORS.primary }} />
              <Card.Title style={{ fontSize: "0.9rem", color: COLORS.dark }}>Unique Visitors</Card.Title>
              <Card.Text style={{ fontSize: "1.5rem", fontWeight: "bold", color: COLORS.dark }}>
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
              <FaUserCheck size={25} className="mb-2" style={{ color: COLORS.success }} />
              <Card.Title style={{ fontSize: "0.9rem", color: COLORS.dark }}>Repeat Visitors</Card.Title>
              <Card.Text style={{ fontSize: "1.5rem", fontWeight: "bold", color: COLORS.dark }}>
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
              <FaUserClock size={25} className="mb-2" style={{ color: COLORS.warning }} />
              <Card.Title style={{ fontSize: "0.9rem", color: COLORS.dark }}>Active Visitors</Card.Title>
              <Card.Text style={{ fontSize: "1.5rem", fontWeight: "bold", color: COLORS.dark }}>
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
              <FaHistory size={25} className="mb-2" style={{ color: COLORS.info }} />
              <Card.Title style={{ fontSize: "0.9rem", color: COLORS.dark }}>Total Recorded Visits</Card.Title>
              <Card.Text style={{ fontSize: "1.5rem", fontWeight: "bold", color: COLORS.dark }}>
                {getTotalRecordedVisits()}
              </Card.Text>
              <div className="small text-muted">
                All time visit records
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Status Breakdown */}
      <Row className="mb-4">
        <Col>
          <h5 className="mb-3" style={{ color: COLORS.dark, borderBottom: "1px solid #dee2e6", paddingBottom: "8px" }}>
            <FaChartBar className="me-2" />
            Status Breakdown
          </h5>
        </Col>
      </Row>
      <Row className="mb-4 g-3">
        <Col md={6}>
          <Card className="text-center h-100 shadow-sm border-0">
            <Card.Header style={{ backgroundColor: COLORS.primary, color: 'white' }}>
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
            <Card.Header style={{ backgroundColor: COLORS.info, color: 'white' }}>
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