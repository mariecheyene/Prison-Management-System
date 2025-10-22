import React, { useState, useEffect, useRef } from 'react';
import { Modal, Button, Card, Row, Col, Badge, Alert, Spinner, Image } from 'react-bootstrap';
import axios from "axios";
import { Printer, X, Check, XCircle, User } from 'react-feather';
import QrScanner from 'qr-scanner';

const ScanQR = ({ show, onHide, onVisitUpdate }) => {
  const [scanner, setScanner] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedPerson, setScannedPerson] = useState(null);
  const [showVisitorModal, setShowVisitorModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [scanError, setScanError] = useState(null);
  const [isApproving, setIsApproving] = useState(false);
  const [lastScannedCode, setLastScannedCode] = useState('');
  const scanTimeoutRef = useRef(null);
  const videoRef = useRef(null);

  const API_BASE = 'http://localhost:5000';

  // Debounce scanning to prevent multiple rapid scans
  const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  };

  useEffect(() => {
    if (show) {
      initializeScanner();
      setScanError(null);
    } else {
      stopScanner();
      setScannedPerson(null);
      setShowVisitorModal(false);
      setScanError(null);
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
      }
    }

    return () => {
      stopScanner();
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
      }
    };
  }, [show]);

  const initializeScanner = async () => {
    try {
      if (!videoRef.current) return;

      if (scanner) {
        scanner.stop();
        scanner.destroy();
      }

      // Configure QR scanner with better settings
      const newScanner = new QrScanner(
        videoRef.current,
        (result) => {
          handleScanResult(result.data);
        },
        {
          highlightScanRegion: true,
          highlightCodeOutline: true,
          returnDetailedScanResult: true,
          maxScansPerSecond: 1, // Limit scans per second
          preferredCamera: 'environment',
          calculateScanRegion: (video) => {
            const size = Math.min(video.videoWidth, video.videoHeight) * 0.7;
            return {
              x: (video.videoWidth - size) / 2,
              y: (video.videoHeight - size) / 2,
              width: size,
              height: size,
            };
          }
        }
      );
      
      await newScanner.start();
      setScanner(newScanner);
      setIsScanning(true);
    } catch (error) {
      console.error('Error initializing QR scanner:', error);
      setScanError('Failed to initialize QR scanner. Please check camera permissions and ensure you have a camera available.');
    }
  };

  const stopScanner = () => {
    if (scanner) {
      scanner.stop();
      scanner.destroy();
      setScanner(null);
    }
    setIsScanning(false);
  };

  // Debounced scan handler to prevent multiple rapid scans
  const debouncedHandleScan = debounce(async (qrData) => {
    if (isLoading || qrData === lastScannedCode) return;
    
    let personId;
    let isGuest = false;
    
    try {
      setIsLoading(true);
      setScanError(null);
      setLastScannedCode(qrData);

      console.log('📱 QR Code Scanned:', qrData);

      // Parse QR data to determine if it's a visitor or guest
      try {
        const parsedData = JSON.parse(qrData);
        personId = parsedData.id || parsedData.visitorId;
        
        // IMPROVED LOGIC: Check both type field and ID prefix
        if (parsedData.type === 'guest') {
          isGuest = true;
        } else if (parsedData.type === 'visitor') {
          isGuest = false;
        } else if (parsedData.prisonerId) {
          // Has prisonerId = visitor
          isGuest = false;
        } else if (personId && personId.startsWith('GST')) {
          // ID starts with GST = guest
          isGuest = true;
        } else if (personId && personId.startsWith('VIS')) {
          // ID starts with VIS = visitor  
          isGuest = false;
        } else {
          // Fallback: check if it has visitPurpose (guest) or prisonerId (visitor)
          isGuest = !!parsedData.visitPurpose && !parsedData.prisonerId;
        }
      } catch (e) {
        // If not JSON, try to extract ID from string and determine by prefix
        personId = qrData;
        if (personId.startsWith('GST')) {
          isGuest = true;
        } else if (personId.startsWith('VIS')) {
          isGuest = false;
        }
        // If we can't determine, we'll try both endpoints
      }

      if (!personId) {
        setScanError('Invalid QR code format. Please ensure you are scanning a valid QR code.');
        setIsLoading(false);
        return;
      }

      console.log('🔍 Looking up person ID:', personId, 'isGuest:', isGuest);

      // Get person data based on type - with fallback
      let person;
      try {
        if (isGuest) {
          const response = await axios.get(`${API_BASE}/guests/${personId}`);
          person = response.data;
        } else {
          const response = await axios.get(`${API_BASE}/visitors/${personId}`);
          person = response.data;
        }
      } catch (firstError) {
        // If first attempt failed, try the opposite type
        console.log('⚠️ First lookup failed, trying opposite type...');
        try {
          if (isGuest) {
            // Tried guest first, now try visitor
            const response = await axios.get(`${API_BASE}/visitors/${personId}`);
            person = response.data;
            isGuest = false; // Update type since we found it as visitor
          } else {
            // Tried visitor first, now try guest
            const response = await axios.get(`${API_BASE}/guests/${personId}`);
            person = response.data;
            isGuest = true; // Update type since we found it as guest
          }
        } catch (secondError) {
          // Both attempts failed
          setScanError('Person not found in database. Please check the QR code.');
          setIsLoading(false);
          return;
        }
      }

      if (!person) {
        setScanError(`${isGuest ? 'Guest' : 'Visitor'} not found in database. Please check the QR code.`);
        setIsLoading(false);
        return;
      }

      const currentDate = new Date().toISOString().split('T')[0];
      const personLastVisitDate = person.lastVisitDate ? 
        new Date(person.lastVisitDate).toISOString().split('T')[0] : null;

      let scanType = '';
      let message = '';

      console.log('🔍 Scan Analysis:', {
        currentDate,
        personLastVisitDate,
        hasTimedIn: person.hasTimedIn,
        hasTimedOut: person.hasTimedOut,
        timeIn: person.timeIn,
        timeOut: person.timeOut
      });

      // SCANNING LOGIC - UPDATED FOR VISIT LOGS
      if (!person.hasTimedIn || personLastVisitDate !== currentDate) {
        // NEW DAY or FIRST TIME IN - Reset for new visit
        scanType = 'time_in_pending';
        message = `🕒 ${isGuest ? 'GUEST' : 'VISITOR'} TIME IN REQUEST - New visit today`;
      } else if (person.hasTimedIn && !person.hasTimedOut && personLastVisitDate === currentDate) {
        // SAME DAY - Ready for time out
        scanType = 'time_out_pending';
        message = `🕒 ${isGuest ? 'GUEST' : 'VISITOR'} TIME OUT REQUEST - Complete today's visit`;
      } else if (person.hasTimedIn && person.hasTimedOut && personLastVisitDate === currentDate) {
        // ALREADY COMPLETED TODAY'S VISIT
        scanType = 'completed';
        message = `✅ You have already completed your visit today. Please come back tomorrow.`;
      } else {
        // FALLBACK - Start new visit
        scanType = 'time_in_pending';
        message = `🕒 ${isGuest ? 'GUEST' : 'VISITOR'} TIME IN REQUEST - Ready for new visit`;
      }

      // ALWAYS set scanned person and show modal
      setScannedPerson({
        ...person,
        scanType: scanType,
        scanMessage: message,
        isGuest: isGuest
      });
      
      // STOP SCANNER and CLOSE SCANNER MODAL
      stopScanner();
      onHide();
      
      // Show visitor details modal
      setTimeout(() => {
        setShowVisitorModal(true);
      }, 500);

    } catch (error) {
      console.error('❌ Error processing QR scan:', error);
      if (error.response?.status === 404) {
        setScanError('Person not found. Please check if the QR code is valid.');
      } else {
        setScanError('Failed to process QR code. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  }, 1000); // 1 second debounce

  const handleScanResult = (qrData) => {
    debouncedHandleScan(qrData);
  };

 const handleApproveVisit = async () => {
  if (!scannedPerson) return;

  try {
    setIsApproving(true);
    
    let endpoint = '';
    let successMessage = '';

    // USE THE SPECIALIZED ENDPOINTS THAT CREATE VISIT LOGS
    if (scannedPerson.scanType === 'time_in_pending') {
      if (scannedPerson.isGuest) {
        endpoint = `${API_BASE}/guests/${scannedPerson.id}/approve-time-in`;
        successMessage = '✅ GUEST TIME IN APPROVED - Visit started';
      } else {
        endpoint = `${API_BASE}/visitors/${scannedPerson.id}/approve-time-in`;
        successMessage = '✅ VISITOR TIME IN APPROVED - Timer started (3 hours)';
      }
    } else if (scannedPerson.scanType === 'time_out_pending') {
      if (scannedPerson.isGuest) {
        endpoint = `${API_BASE}/guests/${scannedPerson.id}/approve-time-out`;
        successMessage = '✅ GUEST TIME OUT APPROVED - Visit completed';
      } else {
        endpoint = `${API_BASE}/visitors/${scannedPerson.id}/approve-time-out`;
        successMessage = '✅ VISITOR TIME OUT APPROVED - Visit completed';
      }
    }

    console.log('🔄 Calling approval endpoint:', endpoint);
    
    const response = await axios.put(endpoint);
    console.log('✅ Approval response:', response.data);

    // Update scanned person with success message
    const successType = scannedPerson.scanType === 'time_in_pending' ? 'time_in_approved' : 'time_out_approved';
    
    const updatedPerson = {
      ...(response.data.visitor || response.data.guest),
      scanType: successType,
      scanMessage: successMessage,
      isGuest: scannedPerson.isGuest
    };
    
    setScannedPerson(updatedPerson);

    // Notify parent component about the update
    if (onVisitUpdate) {
      onVisitUpdate();
    }

  } catch (error) {
    console.error('❌ Error approving visit:', error);
    setScannedPerson({
      ...scannedPerson,
      scanType: 'error',
      scanMessage: 'Failed to approve visit. Please try again. Error: ' + (error.response?.data?.message || error.message)
    });
  } finally {
    setIsApproving(false);
  }
};

  const handleDeclineVisit = async () => {
    if (!scannedPerson) return;

    try {
      setIsApproving(true);
      
      const endpoint = scannedPerson.isGuest 
        ? `${API_BASE}/guests/${scannedPerson.id}`
        : `${API_BASE}/visitors/${scannedPerson.id}`;
      
      await axios.put(endpoint, {
        status: 'rejected'
      });
      
      setScannedPerson({
        ...scannedPerson,
        scanType: 'declined',
        scanMessage: '❌ Visit request declined'
      });

    } catch (error) {
      console.error('Error declining visit:', error);
      setScannedPerson({
        ...scannedPerson,
        scanType: 'error',
        scanMessage: 'Failed to decline visit. Please try again.'
      });
    } finally {
      setIsApproving(false);
    }
  };

  const handleCloseVisitorModal = () => {
    setShowVisitorModal(false);
    setScannedPerson(null);
    setLastScannedCode('');
  };

  const handleCloseScanner = () => {
    stopScanner();
    onHide();
    setLastScannedCode('');
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

  const getStatusVariant = (status) => {
    switch (status) {
      case 'approved': return 'success';
      case 'pending': return 'warning';
      case 'rejected': return 'danger';
      default: return 'secondary';
    }
  };

  const getTimeStatus = (person) => {
    if (!person.hasTimedIn) return { variant: 'secondary', text: 'Not Checked In' };
    if (person.hasTimedIn && !person.hasTimedOut) return { variant: 'success', text: 'Checked In' };
    if (person.hasTimedIn && person.hasTimedOut) return { variant: 'info', text: 'Checked Out' };
    return { variant: 'secondary', text: 'Unknown' };
  };

  const getScanAlertVariant = (scanType) => {
    switch (scanType) {
      case 'time_in_pending': return 'warning';
      case 'time_out_pending': return 'warning';
      case 'time_in_approved': return 'success';
      case 'time_out_approved': return 'success';
      case 'completed': return 'info';
      case 'declined': return 'danger';
      case 'error': return 'danger';
      default: return 'secondary';
    }
  };

  const showApprovalButtons = () => {
    return scannedPerson && (scannedPerson.scanType === 'time_in_pending' || scannedPerson.scanType === 'time_out_pending');
  };

  const showCompletedMessage = () => {
    return scannedPerson && (scannedPerson.scanType === 'time_in_approved' || scannedPerson.scanType === 'time_out_approved' || scannedPerson.scanType === 'completed' || scannedPerson.scanType === 'declined');
  };

  // Format time display to 12-hour format
  const formatTimeDisplay = (timeString) => {
    if (!timeString) return 'Not recorded';
    
    // If it's already in 12-hour format, return as is
    if (timeString.includes('AM') || timeString.includes('PM')) {
      return timeString;
    }
    
    // Convert 24-hour format to 12-hour format
    if (timeString.includes(':')) {
      const [hours, minutes] = timeString.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const twelveHour = hour % 12 || 12;
      return `${twelveHour}:${minutes} ${ampm}`;
    }
    
    return timeString;
  };

  return (
    <>
      {/* QR Scanner Modal */}
      <Modal show={show} onHide={handleCloseScanner} size="lg" centered backdrop="static">
        <Modal.Header closeButton>
          <Modal.Title>Scan QR Code</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center">
          <div className="mb-3">
            <p className="text-muted">
              Position the QR code within the camera view. Hold steady for 1-2 seconds for accurate scanning.
            </p>
          </div>
          
          {scanError && (
            <Alert variant="danger" className="mb-3">
              <strong>Scan Error:</strong> {scanError}
            </Alert>
          )}
          
          <div style={{ position: 'relative', maxWidth: '100%', margin: '0 auto' }}>
            <video 
              ref={videoRef}
              id="qr-video"
              style={{
                width: '100%',
                maxWidth: '500px',
                height: 'auto',
                border: '2px solid #dee2e6',
                borderRadius: '8px',
                backgroundColor: '#f8f9fa'
              }}
            ></video>
            
            {/* Scanning overlay */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '200px',
              height: '200px',
              border: '2px solid #007bff',
              borderRadius: '8px',
              pointerEvents: 'none'
            }}></div>
            
            {isLoading && (
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                padding: '20px',
                borderRadius: '8px',
                zIndex: 10
              }}>
                <Spinner animation="border" role="status" variant="primary">
                  <span className="visually-hidden">Processing scan...</span>
                </Spinner>
                <div className="mt-2">Processing scan...</div>
              </div>
            )}
          </div>
          
          <div className="mt-3">
            <Badge bg={isScanning ? 'success' : 'warning'}>
              {isScanning ? 'Scanner Active - Ready to Scan' : 'Scanner Inactive'}
            </Badge>
          </div>

          <Card className="mt-3 bg-light">
            <Card.Body className="p-2">
              <small>
                <strong>Scanning Tips:</strong> 
                <br/>• Ensure good lighting
                <br/>• Hold QR code steady inside the blue frame
                <br/>• Keep the QR code flat and clearly visible
                <br/>• Avoid glare and reflections
              </small>
            </Card.Body>
          </Card>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseScanner}>
            <X size={16} className="me-1" />
            Close Scanner
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Person Details Modal with Approval */}
      <Modal show={showVisitorModal} onHide={handleCloseVisitorModal} size="xl" centered>
        <Modal.Header closeButton className="bg-light">
          <Modal.Title className="d-flex align-items-center">
            <User size={24} className="me-2" />
            {scannedPerson?.isGuest ? 'Guest' : 'Visitor'} Scan Details - {scannedPerson?.id} 
            <Badge bg={getScanAlertVariant(scannedPerson?.scanType)} className="ms-2 fs-6">
              {scannedPerson?.scanType?.replace(/_/g, ' ').toUpperCase() || 'SCAN'}
            </Badge>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ maxHeight: '80vh', overflowY: 'auto' }}>
          {scannedPerson && (
            <>
              <Alert variant={getScanAlertVariant(scannedPerson.scanType)} className="mb-4">
                <div className="d-flex align-items-center">
                  <div className="flex-grow-1">
                    <h5 className="alert-heading mb-2">
                      {scannedPerson.scanType === 'time_in_pending' ? '🕒 TIME IN REQUEST - AWAITING APPROVAL' : 
                       scannedPerson.scanType === 'time_out_pending' ? '🕒 TIME OUT REQUEST - AWAITING APPROVAL' : 
                       scannedPerson.scanType === 'time_in_approved' ? '✅ TIME IN APPROVED - TIMER STARTED' : 
                       scannedPerson.scanType === 'time_out_approved' ? '✅ TIME OUT APPROVED - VISIT COMPLETED' : 
                       scannedPerson.scanType === 'completed' ? '✅ VISIT COMPLETED TODAY' : 
                       scannedPerson.scanType === 'declined' ? '❌ VISIT DECLINED' : 
                       '❌ SCAN ERROR'}
                    </h5>
                    <p className="mb-0">{scannedPerson.scanMessage}</p>
                    {scannedPerson.scanType === 'time_in_approved' && !scannedPerson.isGuest && (
                      <div className="mt-2">
                        <strong>⏰ Timer: 3 hours started</strong>
                      </div>
                    )}
                  </div>
                </div>
              </Alert>
              
              <Row>
                {/* Person Photo - Larger and Centered */}
                <Col md={4}>
                  <Card className="mb-4">
                    <Card.Header className="text-center">
                      <strong>{scannedPerson.isGuest ? 'Guest' : 'Visitor'} Identification</strong>
                    </Card.Header>
                    <Card.Body className="text-center">
                      {scannedPerson.photo ? (
                        <Image 
                          src={`http://localhost:5000/uploads/${scannedPerson.photo}`} 
                          alt={scannedPerson.fullName}
                          width={280}
                          height={280}
                          rounded
                          style={{ 
                            objectFit: 'cover',
                            border: '3px solid #dee2e6'
                          }}
                          className="mb-3"
                        />
                      ) : (
                        <div 
                          className="d-flex align-items-center justify-content-center bg-light rounded mx-auto"
                          style={{ width: 280, height: 280 }}
                        >
                          <User size={64} className="text-muted" />
                        </div>
                      )}
                      <h5 className="mt-2">{scannedPerson.fullName}</h5>
                      <Badge bg={getStatusVariant(scannedPerson.status)} className="fs-6">
                        {scannedPerson.status.toUpperCase()}
                      </Badge>
                      <div className="mt-2">
                        <Badge bg={scannedPerson.isGuest ? 'info' : 'primary'} className="fs-6">
                          {scannedPerson.isGuest ? 'GUEST' : 'VISITOR'}
                        </Badge>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>

                <Col md={8}>
                  <Row>
                    <Col md={12}>
                      <Card className="mb-4">
                        <Card.Header>
                          <strong>Time Tracking Information</strong>
                        </Card.Header>
                        <Card.Body>
                          <Row>
                            <Col md={6}>
                              <p><strong>Last Visit Date:</strong> {scannedPerson.lastVisitDate ? new Date(scannedPerson.lastVisitDate).toLocaleDateString() : 'No previous visits'}</p>
                              <p><strong>Time In:</strong> {scannedPerson.timeIn ? <Badge bg="success" className="fs-6">{formatTimeDisplay(scannedPerson.timeIn)}</Badge> : 'Not recorded'}</p>
                            </Col>
                            <Col md={6}>
                              <p><strong>Time Out:</strong> {scannedPerson.timeOut ? <Badge bg="info" className="fs-6">{formatTimeDisplay(scannedPerson.timeOut)}</Badge> : 'Not recorded'}</p>
                              <p><strong>Time Status:</strong> <Badge bg={getTimeStatus(scannedPerson).variant} className="fs-6">{getTimeStatus(scannedPerson).text}</Badge></p>
                            </Col>
                          </Row>
                        </Card.Body>
                      </Card>
                    </Col>

                    <Col md={6}>
                      <Card className="mb-3">
                        <Card.Header>
                          <strong>Personal Information</strong>
                        </Card.Header>
                        <Card.Body>
                          <p><strong>Gender:</strong> {scannedPerson.sex}</p>
                          <p><strong>Date of Birth:</strong> {scannedPerson.dateOfBirth ? new Date(scannedPerson.dateOfBirth).toLocaleDateString() : 'N/A'}</p>
                          <p><strong>Age:</strong> {calculateAge(scannedPerson.dateOfBirth)}</p>
                          <p><strong>Address:</strong> {scannedPerson.address}</p>
                          <p><strong>Contact:</strong> {scannedPerson.contact || 'N/A'}</p>
                        </Card.Body>
                      </Card>
                    </Col>
                    
                    <Col md={6}>
                      {scannedPerson.isGuest ? (
                        <Card className="mb-3">
                          <Card.Header>
                            <strong>Guest Details</strong>
                          </Card.Header>
                          <Card.Body>
                            <p><strong>Visit Purpose:</strong> {scannedPerson.visitPurpose}</p>
                            <p><strong>Type:</strong> <Badge bg="info">GUEST</Badge></p>
                          </Card.Body>
                        </Card>
                      ) : (
                        <Card className="mb-3">
                          <Card.Header>
                            <strong>Visit Details</strong>
                          </Card.Header>
                          <Card.Body>
                            <p><strong>Prisoner ID:</strong> {scannedPerson.prisonerId}</p>
                            <p><strong>Relationship:</strong> {scannedPerson.relationship}</p>
                            <p><strong>Type:</strong> <Badge bg="primary">VISITOR</Badge></p>
                          </Card.Body>
                        </Card>
                      )}
                      
                      {scannedPerson.violationType && (
                        <Card className="mb-3 border-danger">
                          <Card.Header className="bg-danger text-white">
                            <strong>Violation Information</strong>
                          </Card.Header>
                          <Card.Body>
                            <p><strong>Violation Type:</strong> {scannedPerson.violationType}</p>
                            <p><strong>Violation Details:</strong> {scannedPerson.violationDetails || 'No violation data'}</p>
                          </Card.Body>
                        </Card>
                      )}
                    </Col>
                  </Row>
                </Col>
              </Row>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          {showApprovalButtons() && (
            <>
              <Button 
                variant="danger" 
                onClick={handleDeclineVisit}
                disabled={isApproving}
                size="lg"
              >
                <XCircle size={20} className="me-2" />
                {isApproving ? 'Declining...' : 'Decline Visit'}
              </Button>
              <Button 
                variant="success" 
                onClick={handleApproveVisit}
                disabled={isApproving}
                size="lg"
              >
                <Check size={20} className="me-2" />
                {isApproving ? 'Approving...' : 'Approve Visit'}
              </Button>
            </>
          )}
          {showCompletedMessage() && (
            <Button variant="secondary" onClick={handleCloseVisitorModal} size="lg">
              Close
            </Button>
          )}
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default ScanQR;