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
        applyCameraOrientation(cameraId);
      } catch (error) {
        console.error('Error switching camera:', error);
        setScanError('Failed to switch camera. Please try again.');
      }
    }
  };

  const applyCameraOrientation = (cameraId) => {
    if (!videoRef.current) return;
    
    const camera = availableCameras.find(cam => cam.id === cameraId);
    const isFrontCamera = camera?.label.toLowerCase().includes('front');
    
    if (isFrontCamera) {
      videoRef.current.style.transform = 'scaleX(-1)';
      videoRef.current.style.webkitTransform = 'scaleX(-1)';
    } else {
      videoRef.current.style.transform = 'scaleX(1)';
      videoRef.current.style.webkitTransform = 'scaleX(1)';
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
          maxScansPerSecond: 3,
          
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
      
      applyCameraOrientation(selectedCamera);
      
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
        processScannedQRCode(result.data, confidence);
      }, 600);
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
          processScannedQRCode(result.data, 95);
        }, 800);
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

  // BULLETPROOF: Enhanced person data fetcher with multiple fallbacks
  const fetchCompletePersonData = async (personId, isGuest, maxRetries = 3) => {
    const endpoint = `http://localhost:5000/${isGuest ? 'guests' : 'visitors'}/${personId}`;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 Fetching person data attempt ${attempt}/${maxRetries}...`);
        const response = await axios.get(endpoint, { timeout: 10000 });
        
        if (response.data && (response.data.id || response.data.visitorId)) {
          console.log(`✅ Successfully fetched complete person data on attempt ${attempt}`);
          return response.data;
        } else {
          console.warn(`⚠️ Incomplete data received on attempt ${attempt}`, response.data);
        }
      } catch (error) {
        console.error(`❌ Attempt ${attempt} failed:`, error.message);
        
        if (attempt === maxRetries) {
          throw new Error(`Failed to fetch person data after ${maxRetries} attempts: ${error.message}`);
        }
        
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
    
    throw new Error('All attempts to fetch person data failed');
  };

  // BULLETPROOF: Enhanced QR code processing
  const processScannedQRCode = async (qrData, confidence) => {
    if (isLoading || qrData === lastScannedCode) return;
    
    let personId;
    let isGuest = false;
    
    try {
      setIsLoading(true);
      setScanError(null);
      setLastScannedCode(qrData);
      setRetryCount(0);

      console.log('🔍 RAW QR DATA:', qrData);

      // Parse QR data to get person ID and type
      try {
        const parsedData = JSON.parse(qrData);
        personId = parsedData.id || parsedData.visitorId;
        isGuest = detectPersonType(qrData) === 'guest';
        console.log('📋 PARSED QR DATA:', { personId, isGuest, parsedData });
      } catch (e) {
        personId = qrData;
        isGuest = detectPersonType(qrData) === 'guest';
        console.log('📋 SIMPLE QR DATA:', { personId, isGuest });
      }

      if (!personId) {
        setScanError('Invalid QR code format.');
        throw new Error('No person ID found in QR data');
      }

      console.log('🔄 CALLING SCAN-PROCESS ENDPOINT...');
      
      // Step 1: Use scan-process endpoint to determine scan type
      const scanResponse = await axios.post("http://localhost:5000/scan-process", {
        qrData: qrData,
        personId: personId,
        isGuest: isGuest
      }, { timeout: 15000 });

      const scanResult = scanResponse.data;
      console.log('📊 SCAN PROCESS RESULT:', scanResult);

      if (!scanResult.person) {
        setScanError(`${isGuest ? 'Guest' : 'Visitor'} not found in database.`);
        throw new Error('Person not found in scan process result');
      }

      // Step 2: BULLETPROOF - Fetch complete person data with retries
      console.log('🔄 FETCHING COMPLETE PERSON DETAILS...');
      let completePersonData;
      
      try {
        completePersonData = await fetchCompletePersonData(personId, isGuest, 3);
      } catch (fetchError) {
        console.warn('⚠️ Using scan process data as fallback:', fetchError.message);
        // Use scan process data as fallback
        completePersonData = scanResult.person;
      }

      console.log('✅ PERSON DATA FOR DISPLAY:', completePersonData);

      // Step 3: Generate display data with multiple fallbacks
      const displayData = generateDisplayData(completePersonData, scanResult, confidence, isGuest);
      
      console.log('🎯 FINAL DISPLAY DATA:', displayData);
      
      setScannedPerson(displayData);
      
      // Close scanner and show modal
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
      }, 400);

    } catch (error) {
      console.error('❌ ERROR PROCESSING QR SCAN:', error);
      
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
  };

  // BULLETPROOF: Generate display data with multiple fallbacks
  const generateDisplayData = (personData, scanResult, confidence, isGuest) => {
    // Start with scan result data as base
    const baseData = scanResult.person || {};
    
    // Merge with complete person data (prioritize complete data)
    const mergedData = {
      ...baseData,
      ...personData,
      // Ensure critical fields are always present
      id: personData.id || baseData.id || scanResult.personId,
      personType: isGuest ? 'guest' : 'visitor',
      scanType: scanResult.scanType,
      scanMessage: scanResult.message,
      scanConfidence: confidence
    };

    // Generate full name with multiple fallbacks
    mergedData.fullName = generateFullName(mergedData);

    // Ensure required fields have fallbacks
    const safeData = {
      ...mergedData,
      sex: mergedData.sex || 'Not specified',
      address: mergedData.address || 'Not specified',
      contact: mergedData.contact || 'Not available',
      dateOfBirth: mergedData.dateOfBirth || null,
      // Visitor specific - UPDATED: Use prisonerName instead of prisonerId
      prisonerName: mergedData.prisonerName || 'Not specified',
      relationship: mergedData.relationship || 'Not specified',
      // Guest specific  
      visitPurpose: mergedData.visitPurpose || 'Not specified',
      // Time tracking with fallbacks
      hasTimedIn: mergedData.hasTimedIn || false,
      hasTimedOut: mergedData.hasTimedOut || false,
      timeIn: mergedData.timeIn || null,
      timeOut: mergedData.timeOut || null,
      lastVisitDate: mergedData.lastVisitDate || null,
      // Violation and ban info
      violationType: mergedData.violationType || null,
      violationDetails: mergedData.violationDetails || null,
      isBanned: mergedData.isBanned || false,
      banReason: mergedData.banReason || null,
      banDuration: mergedData.banDuration || null,
      banNotes: mergedData.banNotes || null
    };

    console.log('🛡️ SAFE DISPLAY DATA GENERATED:', safeData);
    return safeData;
  };

  // Generate full name from individual name fields
  const generateFullName = (person) => {
    if (!person) return 'Unknown Person';
    
    // Priority 1: Use existing fullName
    if (person.fullName && person.fullName !== 'Unknown') return person.fullName;
    
    // Priority 2: Use name field
    if (person.name && person.name !== 'Unknown') return person.name;
    
    // Priority 3: Construct from individual fields
    const { lastName, firstName, middleName, extension } = person;
    
    if (lastName || firstName) {
      let fullName = `${lastName || ''}, ${firstName || ''}`.trim();
      if (middleName) fullName += ` ${middleName}`;
      if (extension) fullName += ` ${extension}`;
      return fullName || 'Unknown Name';
    }
    
    // Priority 4: Use ID as fallback
    return `Person ${person.id || 'Unknown'}`;
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

  const handleApproveVisit = async () => {
    if (!scannedPerson) return;

    try {
      setIsApproving(true);
      console.log('🔄 APPROVAL STARTED for:', scannedPerson.id, scannedPerson.scanType);
      
      const personType = scannedPerson.personType;
      const endpoint = scannedPerson.scanType === 'time_in_pending' 
        ? `http://localhost:5000/${personType}s/${scannedPerson.id}/approve-time-in`
        : `http://localhost:5000/${personType}s/${scannedPerson.id}/approve-time-out`;

      console.log('📞 CALLING:', endpoint);

      const response = await axios.put(endpoint);
      console.log('✅ BACKEND RESPONSE:', response.data);

      // BULLETPROOF: Get complete updated person data with retry
      console.log('🔄 FETCHING UPDATED PERSON DATA...');
      let updatedPersonData;
      
      try {
        updatedPersonData = await fetchCompletePersonData(scannedPerson.id, personType === 'guest', 2);
      } catch (fetchError) {
        console.warn('⚠️ Using response data as fallback:', fetchError.message);
        // Fallback to response data
        updatedPersonData = response.data[personType] || response.data.guest || response.data.visitor || response.data;
      }

      console.log('✅ UPDATED PERSON DATA:', updatedPersonData);

      // Generate updated display data
      const updatedDisplayData = generateDisplayData(
        updatedPersonData, 
        { 
          scanType: scannedPerson.scanType === 'time_in_pending' ? 'time_in_approved' : 'time_out_approved',
          message: response.data.message || 'Operation completed successfully'
        }, 
        scannedPerson.scanConfidence, 
        personType === 'guest'
      );

      console.log('✅ FINAL UPDATED PERSON:', updatedDisplayData);
      setScannedPerson(updatedDisplayData);
      
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

  const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return 'N/A';
    try {
      const birthDate = new Date(dateOfBirth);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age;
    } catch (e) {
      return 'N/A';
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

  // UPDATED: Show approval buttons only if not banned
  const showApprovalButtons = () => {
    if (!scannedPerson) return false;
    
    // If person is banned, only show reject button
    if (scannedPerson.isBanned) return false;
    
    return scannedPerson.scanType === 'time_in_pending' || scannedPerson.scanType === 'time_out_pending';
  };

  // NEW: Show only reject button for banned persons
  const showRejectButtonOnly = () => {
    return scannedPerson && scannedPerson.isBanned && 
           (scannedPerson.scanType === 'time_in_pending' || scannedPerson.scanType === 'time_out_pending');
  };

  const showCompletedMessage = () => {
    return scannedPerson && (scannedPerson.scanType === 'time_in_approved' || scannedPerson.scanType === 'time_out_approved' || scannedPerson.scanType === 'completed' || scannedPerson.scanType === 'declined');
  };

  const formatTimeDisplay = (timeString) => {
    if (!timeString) return 'Not recorded';
    
    if (timeString.includes('AM') || timeString.includes('PM')) {
      return timeString;
    }
    
    try {
      if (timeString.includes(':')) {
        const [hours, minutes] = timeString.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const twelveHour = hour % 12 || 12;
        return `${twelveHour}:${minutes} ${ampm}`;
      }
    } catch (e) {
      console.warn('Time format error:', e);
    }
    
    return timeString;
  };

  // UPDATED: Show complete personal details for banned persons, just without the separate violation table
  const renderPersonDetails = () => {
    if (!scannedPerson) {
      return (
        <Alert variant="warning" className="text-center">
          <Spinner animation="border" size="sm" className="me-2" />
          Loading person details...
        </Alert>
      );
    }

    const isGuest = scannedPerson.personType === 'guest';
    const displayName = scannedPerson.fullName || generateFullName(scannedPerson);
    const timeStatus = getTimeStatus(scannedPerson);

    return (
      <>
        {/* BANNED ALERT - Show prominent warning if person is banned */}
        {scannedPerson.isBanned && (
          <Alert variant="danger" className="mb-4">
            <div className="text-center">
              <h5>🚫 <strong>BANNED {isGuest ? 'GUEST' : 'VISITOR'}</strong></h5>
              <p className="mb-1"><strong>Reason:</strong> {scannedPerson.banReason || 'Not specified'}</p>
              <p className="mb-1"><strong>Duration:</strong> {scannedPerson.banDuration || 'Not specified'}</p>
              {scannedPerson.banNotes && (
                <p className="mb-0"><strong>Notes:</strong> {scannedPerson.banNotes}</p>
              )}
            </div>
          </Alert>
        )}

        <Alert variant={getScanAlertVariant(scannedPerson.scanType)} className="mb-4">
          <strong>
            {scannedPerson.scanType === 'time_in_pending' ? 
              `🕒 ${isGuest ? 'GUEST' : 'VISITOR'} TIME IN REQUEST - AWAITING APPROVAL` : 
             scannedPerson.scanType === 'time_out_pending' ? 
              `🕒 ${isGuest ? 'GUEST' : 'VISITOR'} TIME OUT REQUEST - AWAITING APPROVAL` : 
             scannedPerson.scanType === 'time_in_approved' ? 
              `✅ ${isGuest ? 'GUEST' : 'VISITOR'} TIME IN APPROVED - ${isGuest ? 'VISIT STARTED' : 'TIMER STARTED'}` : 
             scannedPerson.scanType === 'time_out_approved' ? 
              `✅ ${isGuest ? 'GUEST' : 'VISITOR'} TIME OUT APPROVED - VISIT COMPLETED` : 
             scannedPerson.scanType === 'completed' ? 
              `✅ ${isGuest ? 'GUEST' : 'VISITOR'} VISIT COMPLETED TODAY` : 
             scannedPerson.scanType === 'declined' ? 
              `❌ ${isGuest ? 'GUEST' : 'VISITOR'} VISIT DECLINED` : 
             '❌ SCAN ERROR'}
          </strong>
          <br />
          {scannedPerson.scanMessage || 'Processing scan...'}
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
              {/* UPDATED: Only show actual image, no fallback icon */}
              {scannedPerson.photo ? (
                <Image 
                  src={`http://localhost:5000/uploads/${scannedPerson.photo}`} 
                  alt={displayName}
                  width={200}
                  height={200}
                  rounded
                  style={{ 
                    objectFit: 'cover',
                    border: scannedPerson.isBanned ? '4px solid #dc3545' : '4px solid #dee2e6',
                    boxShadow: scannedPerson.isBanned ? '0 4px 8px rgba(220, 53, 69, 0.3)' : '0 4px 8px rgba(0,0,0,0.1)'
                  }}
                  className="mb-2"
                  onError={(e) => {
                    // If image fails to load, show nothing (no fallback icon)
                    e.target.style.display = 'none';
                  }}
                />
              ) : (
                // If no photo, show nothing (empty space)
                <div style={{ height: '200px' }}></div>
              )}
            </div>
            <h4 className="mb-1">{displayName}</h4>
            <div>
              {/* UPDATED: Only show person type badge, remove status badges for banned persons */}
              <Badge bg={isGuest ? 'info' : 'primary'} className="fs-6">
                {isGuest ? 'GUEST' : 'VISITOR'}
              </Badge>
              {/* REMOVED: Status badges (Not Checked In, Banned, etc.) */}
            </div>
            <div className="mt-2">
              <small className="text-muted">ID: {scannedPerson.id || 'Unknown'}</small>
            </div>
          </Col>
        </Row>

        <Row>
          {/* ALWAYS SHOW TIME TRACKING INFORMATION */}
          <Col md={12}>
            <Card className="mb-4">
              <Card.Header className={scannedPerson.isBanned ? "bg-danger text-white" : ""}>
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
                    <p><strong>Visit Status:</strong> <Badge bg={timeStatus.variant} className="fs-6">{timeStatus.text}</Badge></p>
                    {!isGuest && scannedPerson.isTimerActive && (
                      <p><strong>Timer Active:</strong> <Badge bg="warning" className="fs-6">YES</Badge></p>
                    )}
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Col>

          {/* ALWAYS SHOW PERSONAL INFORMATION */}
          <Col md={6}>
            <Card className="mb-3">
              <Card.Header className={scannedPerson.isBanned ? "bg-danger text-white" : ""}>
                <strong>Personal Information</strong>
              </Card.Header>
              <Card.Body>
                <p><strong>Full Name:</strong> {displayName}</p>
                <p><strong>Gender:</strong> {scannedPerson.sex || 'Not specified'}</p>
                <p><strong>Date of Birth:</strong> {scannedPerson.dateOfBirth ? new Date(scannedPerson.dateOfBirth).toLocaleDateString() : 'N/A'}</p>
                <p><strong>Age:</strong> {calculateAge(scannedPerson.dateOfBirth)}</p>
                <p><strong>Address:</strong> {scannedPerson.address || 'Not specified'}</p>
                <p><strong>Contact:</strong> {scannedPerson.contact || 'Not available'}</p>
              </Card.Body>
            </Card>
          </Col>
          
          {/* ALWAYS SHOW VISIT/GUEST DETAILS */}
          <Col md={6}>
            <Card className="mb-3">
              <Card.Header className={scannedPerson.isBanned ? "bg-danger text-white" : ""}>
                <strong>{isGuest ? 'Guest Details' : 'Visit Details'}</strong>
              </Card.Header>
              <Card.Body>
                {isGuest ? (
                  <>
                    <p><strong>Visit Purpose:</strong> {scannedPerson.visitPurpose || 'Not specified'}</p>
                  </>
                ) : (
                  <>
                    {/* UPDATED: Show only Prisoner Name (no Prisoner ID) */}
                    <p><strong>Inmate Name:</strong> {scannedPerson.prisonerName || 'Not specified'}</p>
                    <p><strong>Relationship:</strong> {scannedPerson.relationship || 'Not specified'}</p>
                  </>
                )}
              </Card.Body>
            </Card>
            
            {/* SHOW BAN INFORMATION FOR BANNED PERSONS */}
            {scannedPerson.isBanned && (
              <Card className="mb-3 border-warning">
                <Card.Header className="bg-warning text-dark">
                  <strong>Ban Information</strong>
                </Card.Header>
                <Card.Body>
                  <Row>
                    <Col md={6}>
                      <p><strong>Ban Reason:</strong> {scannedPerson.banReason || 'Not specified'}</p>
                      <p><strong>Ban Duration:</strong> {scannedPerson.banDuration || 'Not specified'}</p>
                    </Col>
                    <Col md={6}>
                      <p><strong>Ban Notes:</strong> {scannedPerson.banNotes || 'No additional notes'}</p>
                    </Col>
                  </Row>
                  {scannedPerson.violationDetails && (
                    <Row>
                    </Row>
                  )}
                </Card.Body>
              </Card>
            )}
            
            {/* SHOW VIOLATION INFORMATION ONLY FOR NON-BANNED PERSONS WITH VIOLATIONS */}
            {!scannedPerson.isBanned && scannedPerson.violationType && (
              <Card className="mb-3 border-danger">
                <Card.Header className="bg-danger text-white">
                  <strong>Violation Information</strong>
                </Card.Header>
                <Card.Body>
                  <p><strong>Violation Type:</strong> {scannedPerson.violationType}</p>
                  <p><strong>Violation Details:</strong> {scannedPerson.violationDetails || 'No additional details'}</p>
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
        <Modal.Header closeButton className={scannedPerson?.isBanned ? "bg-danger text-white" : ""}>
          <Modal.Title>
            {scannedPerson?.personType === 'guest' ? 'Guest' : 'Visitor'} Scan Details - {scannedPerson?.id || 'Unknown'} 
            <Badge bg={getScanAlertVariant(scannedPerson?.scanType)} className="ms-2">
              {scannedPerson?.scanType?.replace(/_/g, ' ').toUpperCase() || 'SCAN'}
            </Badge>
            {scannedPerson?.isBanned && (
              <Badge bg="danger" className="ms-2">
                BANNED
              </Badge>
            )}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {renderPersonDetails()}
        </Modal.Body>
        <Modal.Footer>
          {/* UPDATED: Show only reject button for banned persons */}
          {showRejectButtonOnly() && (
            <Button 
              variant="danger" 
              onClick={handleDeclineVisit}
              disabled={isApproving}
              size="lg"
            >
              <XCircle size={18} className="me-1" />
              {isApproving ? 'Declining...' : 'Reject Banned Person'}
            </Button>
          )}
          
          {/* Show both buttons for non-banned persons */}
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