import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Grid
} from '@mui/material';
import {
  Check as CheckIcon,
  Close as CloseIcon,
  Visibility as ViewIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';

const PendingRequests = () => {
  const [pendingVisitors, setPendingVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedVisitor, setSelectedVisitor] = useState(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch pending visitors
  const fetchPendingVisitors = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch('http://localhost:5000/visitors');
      
      if (!response.ok) {
        throw new Error('Failed to fetch pending visitors');
      }
      
      const allVisitors = await response.json();
      
      // Filter for pending status visitors
      const pending = allVisitors.filter(visitor => visitor.status === 'pending');
      setPendingVisitors(pending);
      
    } catch (err) {
      setError(err.message);
      console.error('Error fetching pending visitors:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingVisitors();
  }, []);

  // Handle approve visitor
  const handleApprove = async (visitorId) => {
    try {
      setActionLoading(true);
      setError('');
      setSuccess('');

      const response = await fetch(`http://localhost:5000/visitors/${visitorId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'approved',
          dateVisited: new Date().toISOString().split('T')[0], // Set current date as visit date
          timeVisited: new Date().toLocaleTimeString() // Set current time
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to approve visitor');
      }

      await response.json();
      setSuccess('Visitor approved successfully!');
      
      // Refresh the list
      fetchPendingVisitors();
      
    } catch (err) {
      setError(err.message);
      console.error('Error approving visitor:', err);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle reject visitor
  const handleReject = async (visitorId) => {
    try {
      setActionLoading(true);
      setError('');
      setSuccess('');

      const response = await fetch(`http://localhost:5000/visitors/${visitorId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'rejected'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to reject visitor');
      }

      await response.json();
      setSuccess('Visitor rejected successfully!');
      
      // Refresh the list
      fetchPendingVisitors();
      
    } catch (err) {
      setError(err.message);
      console.error('Error rejecting visitor:', err);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle view visitor details
  const handleViewDetails = (visitor) => {
    setSelectedVisitor(visitor);
    setViewDialogOpen(true);
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  // Get status chip color
  const getStatusChip = (status) => {
    const statusConfig = {
      pending: { color: 'warning', label: 'Pending' },
      approved: { color: 'success', label: 'Approved' },
      rejected: { color: 'error', label: 'Rejected' }
    };
    
    const config = statusConfig[status] || statusConfig.pending;
    return (
      <Chip 
        label={config.label} 
        color={config.color} 
        size="small" 
      />
    );
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1" gutterBottom>
          Pending Visitor Requests
        </Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={fetchPendingVisitors}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      {/* Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Pending
              </Typography>
              <Typography variant="h4" component="div">
                {pendingVisitors.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Today's Requests
              </Typography>
              <Typography variant="h4" component="div">
                {pendingVisitors.filter(visitor => 
                  new Date(visitor.createdAt).toDateString() === new Date().toDateString()
                ).length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Pending Visitors Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>Visitor ID</strong></TableCell>
              <TableCell><strong>Full Name</strong></TableCell>
              <TableCell><strong>Prisoner ID</strong></TableCell>
              <TableCell><strong>Relationship</strong></TableCell>
              <TableCell><strong>Contact</strong></TableCell>
              <TableCell><strong>Date Submitted</strong></TableCell>
              <TableCell><strong>Status</strong></TableCell>
              <TableCell><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pendingVisitors.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <Typography variant="body1" color="textSecondary" py={3}>
                    No pending visitor requests found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              pendingVisitors.map((visitor) => (
                <TableRow key={visitor._id} hover>
                  <TableCell>{visitor.id}</TableCell>
                  <TableCell>
                    <Typography variant="subtitle2">
                      {visitor.fullName || `${visitor.lastName}, ${visitor.firstName} ${visitor.middleName || ''}`.trim()}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {visitor.sex} • {visitor.age || 'N/A'} years
                    </Typography>
                  </TableCell>
                  <TableCell>{visitor.prisonerId}</TableCell>
                  <TableCell>{visitor.relationship || 'N/A'}</TableCell>
                  <TableCell>{visitor.contact || 'N/A'}</TableCell>
                  <TableCell>{formatDate(visitor.createdAt)}</TableCell>
                  <TableCell>
                    {getStatusChip(visitor.status)}
                  </TableCell>
                  <TableCell>
                    <Box display="flex" gap={1}>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<ViewIcon />}
                        onClick={() => handleViewDetails(visitor)}
                        disabled={actionLoading}
                      >
                        View
                      </Button>
                      <Button
                        variant="contained"
                        color="success"
                        size="small"
                        startIcon={<CheckIcon />}
                        onClick={() => handleApprove(visitor.id)}
                        disabled={actionLoading}
                      >
                        Approve
                      </Button>
                      <Button
                        variant="outlined"
                        color="error"
                        size="small"
                        startIcon={<CloseIcon />}
                        onClick={() => handleReject(visitor.id)}
                        disabled={actionLoading}
                      >
                        Reject
                      </Button>
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* View Visitor Details Dialog */}
      <Dialog
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Visitor Details - {selectedVisitor?.id}
        </DialogTitle>
        <DialogContent>
          {selectedVisitor && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Full Name"
                  value={selectedVisitor.fullName || `${selectedVisitor.lastName}, ${selectedVisitor.firstName} ${selectedVisitor.middleName || ''}`.trim()}
                  fullWidth
                  margin="dense"
                  InputProps={{ readOnly: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Date of Birth"
                  value={formatDate(selectedVisitor.dateOfBirth)}
                  fullWidth
                  margin="dense"
                  InputProps={{ readOnly: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Sex"
                  value={selectedVisitor.sex || 'N/A'}
                  fullWidth
                  margin="dense"
                  InputProps={{ readOnly: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Age"
                  value={selectedVisitor.age || 'N/A'}
                  fullWidth
                  margin="dense"
                  InputProps={{ readOnly: true }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Address"
                  value={selectedVisitor.address || 'N/A'}
                  fullWidth
                  margin="dense"
                  InputProps={{ readOnly: true }}
                  multiline
                  rows={2}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Contact Number"
                  value={selectedVisitor.contact || 'N/A'}
                  fullWidth
                  margin="dense"
                  InputProps={{ readOnly: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Prisoner ID"
                  value={selectedVisitor.prisonerId}
                  fullWidth
                  margin="dense"
                  InputProps={{ readOnly: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Relationship"
                  value={selectedVisitor.relationship || 'N/A'}
                  fullWidth
                  margin="dense"
                  InputProps={{ readOnly: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Date Submitted"
                  value={formatDate(selectedVisitor.createdAt)}
                  fullWidth
                  margin="dense"
                  InputProps={{ readOnly: true }}
                />
              </Grid>
              {selectedVisitor.violationType && (
                <Grid item xs={12}>
                  <TextField
                    label="Violation Type"
                    value={selectedVisitor.violationType}
                    fullWidth
                    margin="dense"
                    InputProps={{ readOnly: true }}
                  />
                </Grid>
              )}
              {selectedVisitor.violationDetails && (
                <Grid item xs={12}>
                  <TextField
                    label="Violation Details"
                    value={selectedVisitor.violationDetails}
                    fullWidth
                    margin="dense"
                    InputProps={{ readOnly: true }}
                    multiline
                    rows={3}
                  />
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
          <Button
            variant="contained"
            color="success"
            startIcon={<CheckIcon />}
            onClick={() => {
              handleApprove(selectedVisitor.id);
              setViewDialogOpen(false);
            }}
            disabled={actionLoading}
          >
            Approve
          </Button>
          <Button
            variant="outlined"
            color="error"
            startIcon={<CloseIcon />}
            onClick={() => {
              handleReject(selectedVisitor.id);
              setViewDialogOpen(false);
            }}
            disabled={actionLoading}
          >
            Reject
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PendingRequests;