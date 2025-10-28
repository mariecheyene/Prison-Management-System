import React, { useState, useEffect, useRef } from 'react';
import { Modal, Button, Card, Row, Col, Badge, Alert, Spinner, Image, Form, Tab, Tabs, ProgressBar } from 'react-bootstrap';
import axios from "axios";
import { Printer, X, Check, XCircle, User, Camera, RefreshCw, Upload, FileText } from 'react-feather';
import QrScanner from 'qr-scanner';

const ScanQR = ({ show, onHide, onVisitUpdate }) => {
  const [scanner, setScanner] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedPerson, setScannedPerson] = useState(null);
  const [showPersonModal, setShowPersonModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [scanError, setScanError] = useState(null);
  const [isApproving, setIsApproving] = useState(false);
  const [lastScannedCode, setLastScannedCode] = useState('');
  const [availableCameras, setAvailableCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [scanConfidence, setScanConfidence] = useState(0);
  const [isValidatingScan, setIsValidatingScan] = useState(false);
  const [scanAttempts, setScanAttempts] = useState(0);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState('camera');
  const [uploadedImage, setUploadedImage] = useState(null);
  const [isProcessingUpload, setIsProcessingUpload] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const scanTimeoutRef = useRef(null);
  const validationTimeoutRef = useRef(null);
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);

  // Enhanced debounce with validation
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
      if (activeTab === 'camera') {
        initializeScanner();
      }
      loadCameras();
      setScanError(null);
      setRetryCount(0);
      setScanConfidence(0);
      setScanAttempts(0);
      setScanSuccess(false);
    } else {
      stopScanner();
      setScannedPerson(null);
      setShowPersonModal(false);
      setScanError(null);
      setUploadedImage(null);
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
      }
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
    }

    return () => {
      stopScanner();
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
      }
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
    };
  }, [show, activeTab]);

  const loadCameras = async () => {
    try {
      const cameras = await QrScanner.listCameras();
      setAvailableCameras(cameras);
      if (cameras.length > 0) {
        // Try to find rear camera first, otherwise use first available
        const rearCamera = cameras.find(cam => 
          cam.label.toLowerCase().includes('back') || 
          cam.label.toLowerCase().includes('rear') ||
          cam.label.toLowerCase().includes('environment')
        );
        setSelectedCamera(rearCamera ? rearCamera.id : cameras[0].id);
      }
    } catch (error) {
      console.log('Cannot list cameras:', error);
    }
  };

  const switchCamera = async (cameraId) => {
    if (scanner) {
      try {
        await scanner.setCamera(cameraId);
        setSelectedCamera(cameraId);
        setRetryCount(0);
        setScanConfidence(0);
        setScanAttempts(0);
      } catch (error) {
        console.error('Error switching camera:', error);
        setScanError('Failed to switch camera. Please try again.');
      }
    }
  };

  const initializeScanner = async () => {
    try {
      if (!videoRef.current) return;

      if (scanner) {
        scanner.stop();
        scanner.destroy();
      }

      const newScanner = new QrScanner(
        videoRef.current,
        (result) => {
          handleScanResult(result);
        },
        {
          highlightScanRegion: true,
          highlightCodeOutline: true,
          returnDetailedScanResult: true,
          maxScansPerSecond: 2,
          
          // FIXED: Remove mirroring and use proper camera orientation
          calculateScanRegion: (video) => {
            const size = Math.min(video.videoWidth, video.videoHeight) * 0.7;
            return {
              x: (video.videoWidth - size) / 2,
              y: (video.videoHeight - size) / 2,
              width: size,
              height: size,
            };
          },
          
          onDecodeError: (error) => {
            if (retryCount < 10) {
              setRetryCount(prev => prev + 1);
            }
          },
        }
      );
      
      const cameras = await QrScanner.listCameras();
      if (cameras.length > 0 && selectedCamera) {
        await newScanner.setCamera(selectedCamera);
      }
      
      await newScanner.start();
      
      // FIXED: Remove mirror effect for non-front cameras
      if (videoRef.current) {
        const isFrontCamera = selectedCamera && cameras.find(cam => cam.id === selectedCamera)?.label.toLowerCase().includes('front');
        if (!isFrontCamera) {
          videoRef.current.style.transform = 'scaleX(1)'; // Normal orientation for rear camera
          videoRef.current.style.webkitTransform = 'scaleX(1)';
        } else {
          videoRef.current.style.transform = 'scaleX(-1)'; // Mirror only for front camera
          videoRef.current.style.webkitTransform = 'scaleX(-1)';
        }
      }
      
      setScanner(newScanner);
      setIsScanning(true);
      setScanError(null);
    } catch (error) {
      console.error('Error initializing QR scanner:', error);
      setScanError('Failed to initialize camera. Please check camera permissions and ensure you have a camera available.');
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

  const restartScanner = async () => {
    stopScanner();
    setRetryCount(0);
    setScanConfidence(0);
    setScanAttempts(0);
    setScanError(null);
    setScanSuccess(false);
    await initializeScanner();
  };

  const validateScanResult = (result) => {
    if (!result || !result.data) return false;
    
    const data = result.data.trim();
    if (!data) return false;

    try {
      const parsed = JSON.parse(data);
      if (parsed.id || parsed.visitorId) {
        return true;
      }
    } catch (e) {
      if (data.length >= 8 && data.length <= 50) {
        return true;
      }
    }
    
    return false;
  };

  const handleScanResult = (result) => {
    if (isLoading || isValidatingScan) return;

    const confidence = result.cornerPoints ? 
      Math.min(100, Math.max(10, Math.round((result.cornerPoints.length / 4) * 100))) : 50;

    setScanConfidence(confidence);
    setScanAttempts(prev => prev + 1);

    if (confidence >= 60 && validateScanResult(result)) {
      setIsValidatingScan(true);
      setScanSuccess(true);
      
      validationTimeoutRef.current = setTimeout(() => {
        debouncedHandleScan(result.data, confidence);
      }, 800);
    } else {
      setScanError(`Low scan quality (${confidence}%). Hold steady and center the QR code.`);
      
      validationTimeoutRef.current = setTimeout(() => {
        setScanError(null);
        setIsValidatingScan(false);
      }, 2000);
    }
  };

  // Handle QR code image upload
  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setScanError('Please upload a valid image file (JPEG, PNG, etc.)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setScanError('Image size should be less than 5MB');
      return;
    }

    setUploadedImage(file);
    setScanError(null);
    processUploadedQRCode(file);
  };

  const processUploadedQRCode = async (file) => {
    setIsProcessingUpload(true);
    setUploadProgress(0);
    setScanError(null);

    try {
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 100);

      const result = await QrScanner.scanImage(file, {
        returnDetailedScanResult: true,
        alsoTryWithoutScanRegion: true
      });
      
      clearInterval(progressInterval);
      setUploadProgress(100);

      if (result && result.data) {
        setScanSuccess(true);
        setTimeout(() => {
          debouncedHandleScan(result.data, 95);
        }, 1000);
      } else {
        setScanError('No QR code found in the uploaded image. Please try another image.');
        setIsProcessingUpload(false);
        setUploadProgress(0);
      }
    } catch (scanError) {
      console.error('QR scan error:', scanError);
      setScanError('Failed to read QR code from image. Please ensure the image is clear and contains a valid QR code.');
      setIsProcessingUpload(false);
      setUploadProgress(0);
    }
  };

  // Refresh person data to get complete details
  const refreshPersonData = async (personId, personType) => {
    try {
      console.log('🔄 Refreshing person data for:', personId, personType);
      const response = await axios.get(`http://localhost:5000/${personType}s/${personId}`);
      console.log('✅ Refreshed person data:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error refreshing person data:', error);
      return null;
    }
  };

  // Generate full name from individual name fields
  const generateFullName = (person) => {
    if (!person) return 'Unknown';
    
    // If fullName exists, use it
    if (person.fullName) return person.fullName;
    
    // Otherwise generate from individual fields
    const { lastName, firstName, middleName, extension } = person;
    let fullName = `${lastName || ''}, ${firstName || ''}`;
    if (middleName) fullName += ` ${middleName}`;
    if (extension) fullName += ` ${extension}`;
    
    return fullName.trim() || 'Unknown Name';
  };

  // Detect if the scanned person is a guest or visitor
  const detectPersonType = (qrData) => {
    try {
      const parsedData = JSON.parse(qrData);
      if (parsedData.type === 'guest' || parsedData.visitPurpose || 
          (parsedData.id && parsedData.id.startsWith('GST'))) {
        return 'guest';
      }
      if (parsedData.prisonerId || parsedData.relationship ||
          (parsedData.id && parsedData.id.startsWith('VIS'))) {
        return 'visitor';
      }
    } catch (e) {
      if (qrData.startsWith('GST')) return 'guest';
      if (qrData.startsWith('VIS')) return 'visitor';
    }
    return 'visitor';
  };

  const debouncedHandleScan = debounce(async (qrData, confidence) => {
    if (isLoading || qrData === lastScannedCode) return;
    
    let personId;
    let isGuest = false;
    
    try {
      setIsLoading(true);
      setScanError(null);
      setLastScannedCode(qrData);
      setRetryCount(0);

      try {
        const parsedData = JSON.parse(qrData);
        personId = parsedData.id || parsedData.visitorId;
        isGuest = detectPersonType(qrData) === 'guest';
      } catch (e) {
        personId = qrData;
        isGuest = detectPersonType(qrData) === 'guest';
      }

      if (!personId) {
        setScanError('Invalid QR code format.');
        setIsLoading(false);
        setIsValidatingScan(false);
        setScanSuccess(false);
        setIsProcessingUpload(false);
        setUploadProgress(0);
        return;
      }

      // Use the scan-process endpoint to get person data and scan type
      const scanResponse = await axios.post("http://localhost:5000/scan-process", {
        qrData: qrData,
        personId: personId,
        isGuest: isGuest
      });

      const scanResult = scanResponse.data;
      console.log('📊 Scan process result:', scanResult);

      if (!scanResult.person) {
        setScanError(`${isGuest ? 'Guest' : 'Visitor'} not found in database.`);
        setIsLoading(false);
        setIsValidatingScan(false);
        setScanSuccess(false);
        setIsProcessingUpload(false);
        setUploadProgress(0);
        return;
      }

      // Refresh person data to ensure we have complete details
      const completePersonData = await refreshPersonData(personId, isGuest ? 'guest' : 'visitor');
      
      // Generate full name if it doesn't exist
      const personWithFullName = {
        ...(completePersonData || scanResult.person),
        fullName: generateFullName(completePersonData || scanResult.person)
      };

      // Set scanned person with complete data and scan type from backend
      setScannedPerson({
        ...personWithFullName,
        personType: isGuest ? 'guest' : 'visitor',
        scanType: scanResult.scanType,
        scanMessage: scanResult.message,
        scanConfidence: confidence
      });
      
      if (activeTab === 'camera') {
        stopScanner();
        onHide();
      }
      
      setTimeout(() => {
        setShowPersonModal(true);
        setIsValidatingScan(false);
        setScanSuccess(false);
        setIsProcessingUpload(false);
        setUploadProgress(0);
      }, 500);

    } catch (error) {
      console.error('❌ Error processing QR scan:', error);
      let errorMessage = 'Failed to process QR code.';
      
      if (error.response?.status === 404) {
        errorMessage = `${isGuest ? 'Guest' : 'Visitor'} not found in database.`;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setScanError(errorMessage);
      setIsValidatingScan(false);
      setScanSuccess(false);
      setIsProcessingUpload(false);
      setUploadProgress(0);
    } finally {
      setIsLoading(false);
    }
  }, 1000);

  const handleApproveVisit = async () => {
    if (!scannedPerson) return;

    try {
      setIsApproving(true);
      console.log('🔄 APPROVAL STARTED for:', scannedPerson.id, scannedPerson.scanType);
      
      const personType = scannedPerson.personType;
      const endpoint = scannedPerson.scanType === 'time_in_pending' 
        ? `http://localhost:5000/${personType}s/${scannedPerson.id}/approve-time-in`
        : `http://localhost:5000/${personType}s/${scannedPerson.id}/approve-time-out`;

      console.log('📞 Calling:', endpoint);

      const response = await axios.put(endpoint);
      console.log('✅ BACKEND RESPONSE:', response.data);

      // REFRESH: Get complete person data after approval
      const freshPersonData = await refreshPersonData(scannedPerson.id, personType);
      
      let updatedPersonData = freshPersonData || scannedPerson; // Fallback to original if refresh fails

      // If refresh failed, try to extract from response
      if (!freshPersonData) {
        if (response.data.guest) {
          updatedPersonData = response.data.guest;
        } else if (response.data.visitor) {
          updatedPersonData = response.data.visitor;
        } else if (response.data[personType]) {
          updatedPersonData = response.data[personType];
        } else {
          updatedPersonData = response.data;
        }
      }

      // Generate full name for the updated data
      const updatedPersonWithFullName = {
        ...updatedPersonData,
        fullName: generateFullName(updatedPersonData)
      };

      // FIXED: Proper merge with all original data preserved
      const updatedPerson = {
        ...scannedPerson, // Original complete data
        ...updatedPersonWithFullName, // Updated fields from backend
        // Ensure scan status is updated
        scanType: scannedPerson.scanType === 'time_in_pending' ? 'time_in_approved' : 'time_out_approved',
        scanMessage: response.data.message || 'Operation completed successfully',
        // Preserve the scan confidence
        scanConfidence: scannedPerson.scanConfidence
      };

      console.log('✅ FINAL UPDATED PERSON WITH COMPLETE DATA:', updatedPerson);
      setScannedPerson(updatedPerson);
      
      if (onVisitUpdate) {
        onVisitUpdate();
      }

    } catch (error) {
      console.error('❌ APPROVAL ERROR:', error);
      
      const errorMessage = error.response?.data?.message || error.message || 'Operation failed';
      
      setScannedPerson({
        ...scannedPerson,
        scanType: 'error',
        scanMessage: `❌ ${errorMessage}`
      });
    } finally {
      setIsApproving(false);
    }
  };

  const handleDeclineVisit = () => {
    // Simply close the modal without making any API calls
    setScannedPerson({
      ...scannedPerson,
      scanType: 'declined',
      scanMessage: '❌ Visit request declined - no time recorded'
    });
  };

  const handleClosePersonModal = () => {
    setShowPersonModal(false);
    setScannedPerson(null);
    setLastScannedCode('');
    setRetryCount(0);
    setScanConfidence(0);
    setScanAttempts(0);
    setScanSuccess(false);
    setUploadedImage(null);
    setIsProcessingUpload(false);
    setUploadProgress(0);
    
    // NEW: Close the entire scanner when person modal is closed
    handleCloseScanner();
  };

  const handleCloseScanner = () => {
    stopScanner();
    onHide();
    setLastScannedCode('');
    setRetryCount(0);
    setScanConfidence(0);
    setScanAttempts(0);
    setScanSuccess(false);
    setUploadedImage(null);
    setIsProcessingUpload(false);
    setUploadProgress(0);
    setActiveTab('camera');
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setScanError(null);
    setScanSuccess(false);
    setUploadedImage(null);
    setIsProcessingUpload(false);
    setUploadProgress(0);
    
    if (tab === 'camera') {
      initializeScanner();
    } else {
      stopScanner();
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const clearUpload = () => {
    setUploadedImage(null);
    setScanError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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

  const formatTimeDisplay = (timeString) => {
    if (!timeString) return 'Not recorded';
    
    if (timeString.includes('AM') || timeString.includes('PM')) {
      return timeString;
    }
    
    if (timeString.includes(':')) {
      const [hours, minutes] = timeString.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const twelveHour = hour % 12 || 12;
      return `${twelveHour}:${minutes} ${ampm}`;
    }
    
    return timeString;
  };

  // Render different content based on person type
  const renderPersonDetails = () => {
    if (!scannedPerson) return null;

    const isGuest = scannedPerson.personType === 'guest';
    const displayName = scannedPerson.fullName || generateFullName(scannedPerson);

    return (
      <>
        <Alert variant={getScanAlertVariant(scannedPerson.scanType)} className="mb-4">
          <strong>
            {scannedPerson.scanType === 'time_in_pending' ? `🕒 ${isGuest ? 'GUEST' : 'VISITOR'} TIME IN REQUEST - AWAITING APPROVAL` : 
             scannedPerson.scanType === 'time_out_pending' ? `🕒 ${isGuest ? 'GUEST' : 'VISITOR'} TIME OUT REQUEST - AWAITING APPROVAL` : 
             scannedPerson.scanType === 'time_in_approved' ? `✅ ${isGuest ? 'GUEST' : 'VISITOR'} TIME IN APPROVED - ${isGuest ? 'VISIT STARTED' : 'TIMER STARTED'}` : 
             scannedPerson.scanType === 'time_out_approved' ? `✅ ${isGuest ? 'GUEST' : 'VISITOR'} TIME OUT APPROVED - VISIT COMPLETED` : 
             scannedPerson.scanType === 'completed' ? `✅ ${isGuest ? 'GUEST' : 'VISITOR'} VISIT COMPLETED TODAY` : 
             scannedPerson.scanType === 'declined' ? `❌ ${isGuest ? 'GUEST' : 'VISITOR'} VISIT DECLINED` : 
             '❌ SCAN ERROR'}
          </strong>
          <br />
          {scannedPerson.scanMessage}
          {scannedPerson.scanConfidence && (
            <div className="mt-1">
              <small>Scan Quality: <Badge bg="info">{scannedPerson.scanConfidence}%</Badge></small>
            </div>
          )}
          {scannedPerson.scanType === 'time_in_approved' && !isGuest && (
            <div className="mt-2">
              <strong>⏰ Timer: 3 hours started</strong>
            </div>
          )}
        </Alert>
        
        <Row className="mb-4">
          <Col className="text-center">
            <div className="mb-3">
              {scannedPerson.photo ? (
                <Image 
                  src={`http://localhost:5000/uploads/${scannedPerson.photo}`} 
                  alt={displayName}
                  width={200}
                  height={200}
                  rounded
                  style={{ 
                    objectFit: 'cover',
                    border: '4px solid #dee2e6',
                    boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
                  }}
                  className="mb-2"
                />
              ) : (
                <div 
                  className="d-flex align-items-center justify-content-center bg-light rounded mx-auto"
                  style={{ 
                    width: 200, 
                    height: 200,
                    border: '4px solid #dee2e6'
                  }}
                >
                  <User size={64} className="text-muted" />
                </div>
              )}
            </div>
            <h4 className="mb-1">{displayName}</h4>
            <div>
              {/* REMOVED: Status badge (approved/rejected) */}
              <Badge bg={isGuest ? 'info' : 'primary'} className="fs-6">
                {isGuest ? 'GUEST' : 'VISITOR'}
              </Badge>
            </div>
            <div className="mt-2">
              <small className="text-muted">ID: {scannedPerson.id}</small>
            </div>
          </Col>
        </Row>

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
                    <p><strong>Date Visited:</strong> {scannedPerson.dateVisited ? new Date(scannedPerson.dateVisited).toLocaleDateString() : 'N/A'}</p>
                  </Col>
                  <Col md={6}>
                    <p><strong>Time Out:</strong> {scannedPerson.timeOut ? <Badge bg="info" className="fs-6">{formatTimeDisplay(scannedPerson.timeOut)}</Badge> : 'Not recorded'}</p>
                    <p><strong>Time Status:</strong> <Badge bg={getTimeStatus(scannedPerson).variant} className="fs-6">{getTimeStatus(scannedPerson).text}</Badge></p>
                    {!isGuest && scannedPerson.isTimerActive && (
                      <p><strong>Timer Active:</strong> <Badge bg="warning" className="fs-6">YES</Badge></p>
                    )}
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
                <p><strong>Full Name:</strong> {displayName}</p>
                <p><strong>Gender:</strong> {scannedPerson.sex}</p>
                <p><strong>Date of Birth:</strong> {scannedPerson.dateOfBirth ? new Date(scannedPerson.dateOfBirth).toLocaleDateString() : 'N/A'}</p>
                <p><strong>Age:</strong> {calculateAge(scannedPerson.dateOfBirth)}</p>
                <p><strong>Address:</strong> {scannedPerson.address}</p>
                <p><strong>Contact:</strong> {scannedPerson.contact || 'N/A'}</p>
              </Card.Body>
            </Card>
          </Col>
          
          <Col md={6}>
            <Card className="mb-3">
              <Card.Header>
                <strong>{isGuest ? 'Guest Details' : 'Visit Details'}</strong>
              </Card.Header>
              <Card.Body>
                {isGuest ? (
                  <>
                    <p><strong>Visit Purpose:</strong> {scannedPerson.visitPurpose}</p>
                    {/* REMOVED: Created At field */}
                  </>
                ) : (
                  <>
                    <p><strong>Prisoner ID:</strong> {scannedPerson.prisonerId}</p>
                    <p><strong>Relationship:</strong> {scannedPerson.relationship}</p>
                    {/* REMOVED: Visit Approved field */}
                  </>
                )}
              </Card.Body>
            </Card>
            
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

            {scannedPerson.isBanned && (
              <Card className="mb-3 border-warning">
                <Card.Header className="bg-warning text-dark">
                  <strong>Ban Information</strong>
                </Card.Header>
                <Card.Body>
                  <p><strong>Ban Reason:</strong> {scannedPerson.banReason}</p>
                  <p><strong>Ban Duration:</strong> {scannedPerson.banDuration}</p>
                  <p><strong>Ban Notes:</strong> {scannedPerson.banNotes || 'No additional notes'}</p>
                </Card.Body>
              </Card>
            )}
          </Col>
        </Row>
      </>
    );
  };

  return (
    <>
      <Modal show={show} onHide={handleCloseScanner} size="lg" centered backdrop="static">
        <Modal.Header closeButton>
          <Modal.Title>
            <Camera size={20} className="me-2" />
            Scan QR Code (Visitors & Guests)
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center">
          <Tabs activeKey={activeTab} onSelect={handleTabChange} className="mb-3" justify>
            <Tab eventKey="camera" title={<span><Camera size={16} className="me-1" />Camera Scan</span>}>
              <div className="mb-3">
                <p className="text-muted">Point camera at QR code to scan</p>
              </div>
              
              {scanError && (
                <Alert variant="danger" className="mb-3">
                  {scanError}
                </Alert>
              )}

              {scanSuccess && (
                <Alert variant="success" className="mb-3">
                  <strong>✅ QR Code Detected!</strong> Processing information...
                </Alert>
              )}
              
              <div style={{ position: 'relative', maxWidth: '100%', margin: '0 auto' }}>
                <video 
                  ref={videoRef}
                  style={{
                    width: '100%',
                    maxWidth: '400px',
                    height: '300px',
                    border: scanSuccess ? '3px solid #28a745' : '2px solid #dee2e6',
                    borderRadius: '8px',
                    backgroundColor: '#000',
                    // Transform is now handled dynamically in initializeScanner
                  }}
                ></video>
                
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '250px',
                  height: '250px',
                  border: scanConfidence >= 60 ? '3px solid #28a745' : '3px solid #ffc107',
                  borderRadius: '12px',
                  pointerEvents: 'none',
                  boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.4)',
                }}></div>

                {(isLoading || isValidatingScan) && (
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    backgroundColor: 'rgba(0, 0, 0, 0.9)',
                    padding: '20px',
                    borderRadius: '8px',
                    zIndex: 10,
                    color: 'white',
                    textAlign: 'center'
                  }}>
                    <Spinner animation="border" role="status" variant="light">
                      <span className="visually-hidden">Processing scan...</span>
                    </Spinner>
                    <div className="mt-2">
                      {isValidatingScan ? 'Validating QR code...' : 'Processing data...'}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-3">
                <Badge bg={isScanning ? (scanSuccess ? 'success' : 'primary') : 'warning'}>
                  {isScanning ? 
                    (scanSuccess ? '✅ QR Validated - Processing...' : 'Scanner Active - Ready to Scan') : 
                    'Scanner Inactive'}
                </Badge>
              </div>
            </Tab>

            <Tab eventKey="upload" title={<span><Upload size={16} className="me-1" />Upload QR Image</span>}>
              <div className="mb-3">
                <p className="text-muted">Upload an image containing a QR code</p>
              </div>

              {scanError && (
                <Alert variant="danger" className="mb-3">
                  {scanError}
                </Alert>
              )}

              <div className="text-center">
                <Card 
                  className={`border-2 ${uploadedImage ? 'border-success' : isProcessingUpload ? 'border-primary' : 'border-dashed'} mb-3`}
                  style={{ 
                    cursor: isProcessingUpload ? 'default' : 'pointer',
                    borderStyle: uploadedImage || isProcessingUpload ? 'solid' : 'dashed',
                  }}
                  onClick={isProcessingUpload ? undefined : triggerFileInput}
                >
                  <Card.Body className="py-5">
                    {isProcessingUpload ? (
                      <div className="text-center">
                        <Spinner animation="border" variant="primary" />
                        <div className="mt-2">
                          <strong>Processing Image...</strong>
                        </div>
                        {uploadProgress > 0 && (
                          <>
                            <ProgressBar 
                              now={uploadProgress} 
                              className="mt-2" 
                              style={{ height: '8px' }}
                              variant="success"
                            />
                            <small className="text-muted mt-1 d-block">
                              {uploadProgress}% Complete
                            </small>
                          </>
                        )}
                      </div>
                    ) : uploadedImage ? (
                      <div className="text-success">
                        <FileText size={48} className="mb-2" />
                        <div>
                          <strong>Image Selected</strong>
                        </div>
                        <small className="text-muted d-block">
                          {uploadedImage.name}
                        </small>
                      </div>
                    ) : (
                      <div>
                        <Upload size={48} className="text-muted mb-2" />
                        <div>
                          <strong>Click to Upload QR Image</strong>
                        </div>
                        <small className="text-muted">
                          Supports JPG, PNG, GIF (Max 5MB)
                        </small>
                      </div>
                    )}
                  </Card.Body>
                </Card>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  accept="image/*"
                  style={{ display: 'none' }}
                />

                <div className="d-grid gap-2 d-md-flex justify-content-md-center">
                  {!isProcessingUpload && (
                    <>
                      <Button
                        variant={uploadedImage ? "outline-primary" : "primary"}
                        onClick={triggerFileInput}
                        className="me-md-2"
                      >
                        <Upload size={16} className="me-1" />
                        {uploadedImage ? 'Change Image' : 'Select Image'}
                      </Button>
                      
                      {uploadedImage && (
                        <Button
                          variant="success"
                          onClick={() => processUploadedQRCode(uploadedImage)}
                        >
                          <Check size={16} className="me-1" />
                          Process QR Code
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </Tab>
          </Tabs>
        </Modal.Body>
        <Modal.Footer>
          {activeTab === 'camera' && (
            <div className="d-flex flex-wrap gap-2 align-items-center">
              {availableCameras.length > 1 && (
                <Form.Select 
                  value={selectedCamera} 
                  onChange={(e) => switchCamera(e.target.value)}
                  style={{ width: 'auto' }}
                  size="sm"
                >
                  {availableCameras.map(camera => (
                    <option key={camera.id} value={camera.id}>
                      {camera.label}
                    </option>
                  ))}
                </Form.Select>
              )}
              
              <Button 
                variant="outline-primary" 
                size="sm" 
                onClick={restartScanner}
                disabled={isLoading || isValidatingScan}
              >
                <RefreshCw size={14} className="me-1" />
                Restart Scanner
              </Button>
            </div>
          )}
          
          <Button variant="secondary" onClick={handleCloseScanner}>
            <X size={16} className="me-1" />
            Close Scanner
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showPersonModal} onHide={handleClosePersonModal} size="xl" centered>
        <Modal.Header closeButton>
          <Modal.Title>
            {scannedPerson?.personType === 'guest' ? 'Guest' : 'Visitor'} Scan Details - {scannedPerson?.id} 
            <Badge bg={getScanAlertVariant(scannedPerson?.scanType)} className="ms-2">
              {scannedPerson?.scanType?.replace(/_/g, ' ').toUpperCase() || 'SCAN'}
            </Badge>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {renderPersonDetails()}
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
                <XCircle size={18} className="me-1" />
                {isApproving ? 'Declining...' : 'Decline'}
              </Button>
              <Button 
                variant="success" 
                onClick={handleApproveVisit}
                disabled={isApproving}
                size="lg"
              >
                <Check size={18} className="me-1" />
                {isApproving ? 'Approving...' : 'Approve'}
              </Button>
            </>
          )}
          {showCompletedMessage() && (
            <Button variant="secondary" onClick={handleClosePersonModal} size="lg">
              Close
            </Button>
          )}
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default ScanQR;