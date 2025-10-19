// QRCodeScanner.js
import React, { useEffect, useRef } from 'react';
import QrScanner from 'qr-scanner';
import { Modal, Button } from 'react-bootstrap';

const QRCodeScanner = ({ onScan, onClose }) => {
  const videoRef = useRef(null);
  const scannerRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && !scannerRef.current) {
      scannerRef.current = new QrScanner(
        videoRef.current,
        result => {
          onScan(result.data);
        },
        {
          highlightScanRegion: true,
          highlightCodeOutline: true,
        }
      );
      scannerRef.current.start();
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop();
        scannerRef.current.destroy();
      }
    };
  }, [onScan]);

  return (
    <Modal show={true} onHide={onClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>Scan QR Code</Modal.Title>
      </Modal.Header>
      <Modal.Body className="text-center">
        <video 
          ref={videoRef} 
          style={{
            width: '100%',
            maxWidth: '400px',
            border: '2px solid #007bff',
            borderRadius: '8px'
          }}
        />
        <p className="mt-3">Point your camera at a resident's QR code</p>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default QRCodeScanner;