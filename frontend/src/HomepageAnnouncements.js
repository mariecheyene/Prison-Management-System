import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Badge } from 'react-bootstrap';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import axios from 'axios';

const HomepageAnnouncements = () => {
  const navigate = useNavigate();
  const [announcements, setAnnouncements] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const priorityColors = {
    high: "danger",
    normal: "warning",
    low: "success"
  };

  const fetchAnnouncements = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get("http://localhost:5000/announcements");
      setAnnouncements(response.data);
    } catch (error) {
      console.error("Error fetching announcements:", error);
      toast.error("Failed to fetch announcements");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Sort announcements by priority (high > normal > low)
  const sortedAnnouncements = [...announcements].sort((a, b) => {
    const priorityOrder = { high: 3, normal: 2, low: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });

  return (
    <div
      className="announcements-page"
      style={{
        backgroundImage: `url('/img/acmac.jpg')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        minHeight: "100vh",
        position: "relative",
      }}
    >
      {/* Overlay */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          zIndex: 1,
        }}
      ></div>

      {/* Navigation */}
      <div
        style={{
          position: "absolute",
          top: "20px",
          left: "20px",
          zIndex: 2,
        }}
      >
        <Button variant="outline-light" onClick={() => navigate("/")}>
          Back to Home
        </Button>
      </div>

      {/* Right side buttons */}
      <div
        style={{
          position: "absolute",
          top: "20px",
          right: "20px",
          display: "flex",
          gap: "15px",
          zIndex: 2,
        }}
      >
        <Button variant="outline-light" onClick={() => navigate("/map")}>
          Map
        </Button>
        <Button variant="outline-light" onClick={() => navigate("/about")}>
          About
        </Button>
      </div>

      {/* Content */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          color: "white",
          textAlign: "center",
          padding: "80px 20px 20px",
          maxWidth: "1000px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.2)",
            padding: "30px",
            borderRadius: "15px",
            backdropFilter: "blur(5px)",
          }}
        >
          <h1 style={{ marginBottom: "30px" }}>📢 Announcements</h1>
          
          {isLoading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-light" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : (
            <div className="announcements-container">
              {sortedAnnouncements.length > 0 ? (
                sortedAnnouncements.map((announcement) => (
                  <div 
                    key={announcement._id}
                    className="announcement-card mb-4 p-4 rounded-3"
                    style={{
                      backgroundColor: "rgba(0, 0, 0, 0.4)",
                      borderLeft: `5px solid ${
                        announcement.priority === "high" ? "#dc3545" : 
                        announcement.priority === "normal" ? "#ffc107" : "#28a745"
                      }`
                    }}
                  >
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <h3>{announcement.title}</h3>
                      <Badge bg={priorityColors[announcement.priority]}>
                        {announcement.priority.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-start">{announcement.content}</p>
                    <div className="text-end text-muted">
                      <small>{formatDate(announcement.date)}</small>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-5">
                  <h4>No announcements available</h4>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <ToastContainer position="top-center" />
    </div>
  );
};

export default HomepageAnnouncements;