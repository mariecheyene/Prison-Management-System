import React, { useState, useEffect, useRef } from 'react';
import { Modal, Button, Card, Row, Col, Badge, Alert, Spinner, Image } from 'react-bootstrap';
import axios from "axios";
import { Printer, X, Check, XCircle, User } from 'react-feather';
import QrScanner from 'qr-scanner';

const ScanQR = ({ show, onHide, onVisitUpdate }) => {
  const [scanner, setScanner] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedVisitor, setScannedVisitor] = useState(null);
  const [showVisitorModal, setShowVisitorModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [scanError, setScanError] = useState(null);
  const [isApproving, setIsApproving] = useState(false);
  const [lastScannedCode, setLastScannedCode] = useState('');
  const scanTimeoutRef = useRef(null);
  const videoRef = useRef(null);

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
      setScannedVisitor(null);
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
    
    let visitorId;
    
    try {
      setIsLoading(true);
      setScanError(null);
      setLastScannedCode(qrData);

      console.log('📱 QR Code Scanned:', qrData);

      try {
        const parsedData = JSON.parse(qrData);
        visitorId = parsedData.id || parsedData.visitorId;
      } catch (e) {
        // If not JSON, try to extract ID from string
        visitorId = qrData;
      }

      if (!visitorId) {
        setScanError('Invalid QR code format. Please ensure you are scanning a valid visitor QR code.');
        setIsLoading(false);
        return;
      }

      console.log('🔍 Looking up visitor ID:', visitorId);

      // Get current visitor data first
      const response = await axios.get(`http://localhost:5000/visitors/${visitorId}`);
      const visitor = response.data;

      if (!visitor) {
        setScanError('Visitor not found in database. Please check the QR code.');
        setIsLoading(false);
        return;
      }

      const currentDate = new Date().toISOString().split('T')[0];
      const visitorLastVisitDate = visitor.lastVisitDate ? 
        new Date(visitor.lastVisitDate).toISOString().split('T')[0] : null;

      let scanType = '';
      let message = '';

      console.log('🔍 Scan Analysis:', {
        currentDate,
        visitorLastVisitDate,
        hasTimedIn: visitor.hasTimedIn,
        hasTimedOut: visitor.hasTimedOut,
        timeIn: visitor.timeIn,
        timeOut: visitor.timeOut
      });

      // DECISION LOGIC - UPDATED FOR DAILY RESET
      if (!visitor.hasTimedIn || visitorLastVisitDate !== currentDate) {
        // TIME IN - First scan of the day or new day
        scanType = 'time_in_pending';
        message = '🕒 TIME IN REQUEST - Waiting for approval';
      } else if (visitor.hasTimedIn && !visitor.hasTimedOut && visitorLastVisitDate === currentDate) {
        // TIME OUT - Second scan of the same day
        scanType = 'time_out_pending';
        message = '🕒 TIME OUT REQUEST - Waiting for approval';
      } else if (visitor.hasTimedIn && visitor.hasTimedOut && visitorLastVisitDate === currentDate) {
        // ALREADY COMPLETED TODAY
        scanType = 'completed';
        message = '✅ You have already completed your visit today. Visit finished.';
      } else {
        // This handles cases where time records were reset
        scanType = 'time_in_pending';
        message = '🕒 TIME IN REQUEST - Ready for new visit';
      }

      // ALWAYS set scanned visitor and show modal
      setScannedVisitor({
        ...visitor,
        scanType: scanType,
        scanMessage: message
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
        setScanError('Visitor not found. Please check if the QR code is valid.');
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
    if (!scannedVisitor) return;

    try {
      setIsApproving(true);
      
      // Convert to 12-hour format
      const currentTime = new Date().toLocaleTimeString('en-US', { 
        hour12: true,
        hour: '2-digit',
        minute: '2-digit'
      });
      
      const currentDate = new Date().toISOString().split('T')[0];
      
      let updateData = {};
      let timerEndpoint = '';
      
      if (scannedVisitor.scanType === 'time_in_pending') {
        // Start timer for time in - FIXED: Properly set timer fields
        updateData = { 
          hasTimedIn: true,
          timeIn: currentTime,
          lastVisitDate: currentDate,
          dateVisited: currentDate,
          status: 'approved',
          // CRITICAL: Set timer fields to activate the timer
          isTimerActive: true,
          timerStart: new Date(),
          timerEnd: new Date(Date.now() + (3 * 60 * 60 * 1000)), // 3 hours from now
          visitApproved: true
        };
        timerEndpoint = `http://localhost:5000/visitors/${scannedVisitor.id}/start-timer`;
      } else if (scannedVisitor.scanType === 'time_out_pending') {
        // Stop timer for time out
        updateData = { 
          hasTimedOut: true,
          timeOut: currentTime,
          isTimerActive: false // Stop the timer
        };
        timerEndpoint = `http://localhost:5000/visitors/${scannedVisitor.id}/stop-timer`;
      }

      console.log('🔄 Updating visitor data:', updateData);
      
      // Update visitor record - FIXED: Use PUT to update all fields including timer
      const updateResponse = await axios.put(`http://localhost:5000/visitors/${scannedVisitor.id}`, updateData);
      console.log('✅ Visitor updated:', updateResponse.data);

      // ALSO call the timer endpoint to ensure timer is started
      if (timerEndpoint && scannedVisitor.scanType === 'time_in_pending') {
        console.log('⏰ Calling timer endpoint:', timerEndpoint);
        try {
          const timerResponse = await axios.put(timerEndpoint);
          console.log('✅ Timer response:', timerResponse.data);
        } catch (timerError) {
          console.error('⚠️ Timer endpoint error (but visitor updated):', timerError);
          // Continue even if timer endpoint fails, since we already set timer fields
        }
      }

      // Update scanned visitor with success message
      const updatedVisitor = {
        ...updateResponse.data,
        scanType: scannedVisitor.scanType === 'time_in_pending' ? 'time_in_approved' : 'time_out_approved',
        scanMessage: scannedVisitor.scanType === 'time_in_pending' 
          ? '✅ TIME IN APPROVED - Timer started (3 hours)' 
          : '✅ TIME OUT APPROVED - Visit completed'
      };
      
      setScannedVisitor(updatedVisitor);

      // Notify parent component about the update
      if (onVisitUpdate) {
        onVisitUpdate();
      }

    } catch (error) {
      console.error('❌ Error approving visit:', error);
      setScannedVisitor({
        ...scannedVisitor,
        scanType: 'error',
        scanMessage: 'Failed to approve visit. Please try again. Error: ' + (error.response?.data?.message || error.message)
      });
    } finally {
      setIsApproving(false);
    }
  };

  const handleDeclineVisit = async () => {
    if (!scannedVisitor) return;

    try {
      setIsApproving(true);
      
      await axios.put(`http://localhost:5000/visitors/${scannedVisitor.id}`, {
        status: 'rejected'
      });
      
      setScannedVisitor({
        ...scannedVisitor,
        scanType: 'declined',
        scanMessage: '❌ Visit request declined'
      });

    } catch (error) {
      console.error('Error declining visit:', error);
      setScannedVisitor({
        ...scannedVisitor,
        scanType: 'error',
        scanMessage: 'Failed to decline visit. Please try again.'
      });
    } finally {
      setIsApproving(false);
    }
  };

  const handleCloseVisitorModal = () => {
    setShowVisitorModal(false);
    setScannedVisitor(null);
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

  const getTimeStatus = (visitor) => {
    if (!visitor.hasTimedIn) return { variant: 'secondary', text: 'Not Checked In' };
    if (visitor.hasTimedIn && !visitor.hasTimedOut) return { variant: 'success', text: 'Checked In' };
    if (visitor.hasTimedIn && visitor.hasTimedOut) return { variant: 'info', text: 'Checked Out' };
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
    return scannedVisitor && (scannedVisitor.scanType === 'time_in_pending' || scannedVisitor.scanType === 'time_out_pending');
  };

  const showCompletedMessage = () => {
    return scannedVisitor && (scannedVisitor.scanType === 'time_in_approved' || scannedVisitor.scanType === 'time_out_approved' || scannedVisitor.scanType === 'completed' || scannedVisitor.scanType === 'declined');
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
          <Modal.Title>Scan Visitor QR Code</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center">
          <div className="mb-3">
            <p className="text-muted">
              Position the visitor's QR code within the camera view. Hold steady for 1-2 seconds for accurate scanning.
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

      {/* Visitor Details Modal with Approval */}
      <Modal show={showVisitorModal} onHide={handleCloseVisitorModal} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>
            Visitor Scan Details - {scannedVisitor?.id} 
            <Badge bg={getScanAlertVariant(scannedVisitor?.scanType)} className="ms-2">
              {scannedVisitor?.scanType?.replace(/_/g, ' ').toUpperCase() || 'SCAN'}
            </Badge>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {scannedVisitor && (
            <>
              <Alert variant={getScanAlertVariant(scannedVisitor.scanType)} className="mb-3">
                <strong>
                  {scannedVisitor.scanType === 'time_in_pending' ? '🕒 TIME IN REQUEST - AWAITING APPROVAL' : 
                   scannedVisitor.scanType === 'time_out_pending' ? '🕒 TIME OUT REQUEST - AWAITING APPROVAL' : 
                   scannedVisitor.scanType === 'time_in_approved' ? '✅ TIME IN APPROVED - TIMER STARTED' : 
                   scannedVisitor.scanType === 'time_out_approved' ? '✅ TIME OUT APPROVED - VISIT COMPLETED' : 
                   scannedVisitor.scanType === 'completed' ? '✅ VISIT COMPLETED TODAY' : 
                   scannedVisitor.scanType === 'declined' ? '❌ VISIT DECLINED' : 
                   '❌ SCAN ERROR'}
                </strong>
                <br />
                {scannedVisitor.scanMessage}
                {scannedVisitor.scanType === 'time_in_approved' && (
                  <div className="mt-2">
                    <strong>⏰ Timer: 3 hours started</strong>
                  </div>
                )}
              </Alert>
              
              <Row>
                <Col md={12}>
                  <Card className="mb-4">
                    <Card.Header>
                      <strong>Time Tracking Information</strong>
                    </Card.Header>
                    <Card.Body>
                      <Row>
                        <Col md={6}>
                          <p><strong>Last Visit Date:</strong> {scannedVisitor.lastVisitDate ? new Date(scannedVisitor.lastVisitDate).toLocaleDateString() : 'No previous visits'}</p>
                          <p><strong>Time In:</strong> {scannedVisitor.timeIn ? <Badge bg="success">{formatTimeDisplay(scannedVisitor.timeIn)}</Badge> : 'Not recorded'}</p>
                        </Col>
                        <Col md={6}>
                          <p><strong>Time Out:</strong> {scannedVisitor.timeOut ? <Badge bg="info">{formatTimeDisplay(scannedVisitor.timeOut)}</Badge> : 'Not recorded'}</p>
                          <p><strong>Time Status:</strong> <Badge bg={getTimeStatus(scannedVisitor).variant}>{getTimeStatus(scannedVisitor).text}</Badge></p>
                        </Col>
                      </Row>
                    </Card.Body>
                  </Card>
                </Col>

                <Col md={6}>
                  <Card className="mb-3">
                    <Card.Header>
                      <strong>Visitor Information</strong>
                    </Card.Header>
                    <Card.Body>
                      <div className="d-flex align-items-center mb-3">
                        <div className="me-3">
                          {scannedVisitor.photo ? (
                            <Image 
                              src={`http://localhost:5000/uploads/${scannedVisitor.photo}`} 
                              alt={scannedVisitor.fullName}
                              width={80}
                              height={80}
                              rounded
                              style={{ objectFit: 'cover' }}
                            />
                          ) : (
                            <div 
                              className="d-flex align-items-center justify-content-center bg-light rounded"
                              style={{ width: 80, height: 80 }}
                            >
                              <User size={32} className="text-muted" />
                            </div>
                          )}
                        </div>
                        <div>
                          <h6 className="mb-1">{scannedVisitor.fullName}</h6>
                          <Badge bg={getStatusVariant(scannedVisitor.status)}>
                            {scannedVisitor.status}
                          </Badge>
                        </div>
                      </div>
                      
                      <p><strong>Gender:</strong> {scannedVisitor.sex}</p>
                      <p><strong>Date of Birth:</strong> {scannedVisitor.dateOfBirth ? new Date(scannedVisitor.dateOfBirth).toLocaleDateString() : 'N/A'}</p>
                      <p><strong>Age:</strong> {calculateAge(scannedVisitor.dateOfBirth)}</p>
                      <p><strong>Address:</strong> {scannedVisitor.address}</p>
                      <p><strong>Contact:</strong> {scannedVisitor.contact || 'N/A'}</p>
                    </Card.Body>
                  </Card>
                </Col>
                
                <Col md={6}>
                  <Card className="mb-3">
                    <Card.Header>
                      <strong>Visit Details</strong>
                    </Card.Header>
                    <Card.Body>
                      <p><strong>Prisoner ID:</strong> {scannedVisitor.prisonerId}</p>
                      <p><strong>Relationship:</strong> {scannedVisitor.relationship}</p>
                    </Card.Body>
                  </Card>
                  
                  {scannedVisitor.violationType && (
                    <Card className="mb-3 border-danger">
                      <Card.Header className="bg-danger text-white">
                        <strong>Violation Information</strong>
                      </Card.Header>
                      <Card.Body>
                        <p><strong>Violation Type:</strong> {scannedVisitor.violationType}</p>
                        <p><strong>Violation Details:</strong> {scannedVisitor.violationDetails || 'No violation data'}</p>
                      </Card.Body>
                    </Card>
                  )}
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
              >
                <XCircle size={16} className="me-1" />
                {isApproving ? 'Declining...' : 'Decline'}
              </Button>
              <Button 
                variant="success" 
                onClick={handleApproveVisit}
                disabled={isApproving}
              >
                <Check size={16} className="me-1" />
                {isApproving ? 'Approving...' : 'Approve'}
              </Button>
            </>
          )}
          {showCompletedMessage() && (
            <Button variant="secondary" onClick={handleCloseVisitorModal}>
              Close
            </Button>
          )}
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default ScanQR;