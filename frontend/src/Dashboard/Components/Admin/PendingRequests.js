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
  Refresh as RefreshIcon,
  Person as PersonIcon
} from '@mui/icons-material';

const PendingRequests = () => {
  const [pendingVisitors, setPendingVisitors] = useState([]);
  const [pendingGuests, setPendingGuests] = useState([]);
  const [activeTab, setActiveTab] = useState('visitors'); // 'visitors' or 'guests'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch pending requests
  const fetchPendingRequests = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Fetch pending visitors
      const visitorsResponse = await fetch('http://localhost:5000/visitors');
      if (!visitorsResponse.ok) {
        throw new Error('Failed to fetch pending visitors');
      }
      const allVisitors = await visitorsResponse.json();
      const pendingVisitors = allVisitors.filter(visitor => visitor.status === 'pending');
      setPendingVisitors(pendingVisitors);
      
      // Fetch pending guests
      const guestsResponse = await fetch('http://localhost:5000/guests');
      if (!guestsResponse.ok) {
        throw new Error('Failed to fetch pending guests');
      }
      const allGuests = await guestsResponse.json();
      const pendingGuests = allGuests.filter(guest => guest.status === 'pending');
      setPendingGuests(pendingGuests);
      
    } catch (err) {
      setError(err.message);
      console.error('Error fetching pending requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingRequests();
  }, []);

  // Handle approve request
  const handleApprove = async (requestId, type) => {
    try {
      setActionLoading(true);
      setError('');
      setSuccess('');

      const endpoint = type === 'visitor' ? 'visitors' : 'guests';
      const currentUser = "Admin User"; // In real app, get from auth context

      const response = await fetch(`http://localhost:5000/${endpoint}/${requestId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'approved',
          dateVisited: new Date().toISOString().split('T')[0],
          timeVisited: new Date().toLocaleTimeString(),
          approvedBy: currentUser,
          approvedAt: new Date().toISOString()
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to approve ${type}`);
      }

      await response.json();
      setSuccess(`${type === 'visitor' ? 'Visitor' : 'Guest'} approved successfully!`);
      
      // Refresh the list
      fetchPendingRequests();
      
    } catch (err) {
      setError(err.message);
      console.error(`Error approving ${type}:`, err);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle reject request
  const handleReject = async (requestId, type) => {
    try {
      setActionLoading(true);
      setError('');
      setSuccess('');

      const endpoint = type === 'visitor' ? 'visitors' : 'guests';
      const currentUser = "Admin User"; // In real app, get from auth context

      const response = await fetch(`http://localhost:5000/${endpoint}/${requestId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'rejected',
          rejectedBy: currentUser,
          rejectedAt: new Date().toISOString()
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to reject ${type}`);
      }

      await response.json();
      setSuccess(`${type === 'visitor' ? 'Visitor' : 'Guest'} rejected successfully!`);
      
      // Refresh the list
      fetchPendingRequests();
      
    } catch (err) {
      setError(err.message);
      console.error(`Error rejecting ${type}:`, err);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle view request details
  const handleViewDetails = (request, type) => {
    setSelectedRequest({ ...request, type });
    setViewDialogOpen(true);
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  // Format datetime for display
  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
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

  // Get current data based on active tab
  const getCurrentData = () => {
    return activeTab === 'visitors' ? pendingVisitors : pendingGuests;
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
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={3}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Pending Approval Requests
          </Typography>
          <Typography variant="subtitle1" color="textSecondary">
            Review and approve or reject visitor and guest requests
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={fetchPendingRequests}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      {/* Tab Selection */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Button
          variant={activeTab === 'visitors' ? 'contained' : 'outlined'}
          onClick={() => setActiveTab('visitors')}
          sx={{ mr: 1 }}
        >
          Visitors ({pendingVisitors.length})
        </Button>
        <Button
          variant={activeTab === 'guests' ? 'contained' : 'outlined'}
          onClick={() => setActiveTab('guests')}
        >
          Guests ({pendingGuests.length})
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
                Total Pending Visitors
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
                Total Pending Guests
              </Typography>
              <Typography variant="h4" component="div">
                {pendingGuests.length}
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
                {[...pendingVisitors, ...pendingGuests].filter(request => 
                  new Date(request.createdAt).toDateString() === new Date().toDateString()
                ).length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Pending
              </Typography>
              <Typography variant="h4" component="div">
                {pendingVisitors.length + pendingGuests.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Requests Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>ID</strong></TableCell>
              <TableCell><strong>Full Name</strong></TableCell>
              <TableCell><strong>Type</strong></TableCell>
              {activeTab === 'visitors' && <TableCell><strong>Prisoner ID</strong></TableCell>}
              {activeTab === 'guests' && <TableCell><strong>Visit Purpose</strong></TableCell>}
              <TableCell><strong>Contact</strong></TableCell>
              <TableCell><strong>Date Submitted</strong></TableCell>
              <TableCell><strong>Created By</strong></TableCell>
              <TableCell><strong>Status</strong></TableCell>
              <TableCell><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {getCurrentData().length === 0 ? (
              <TableRow>
                <TableCell colSpan={activeTab === 'visitors' ? 9 : 8} align="center">
                  <Typography variant="body1" color="textSecondary" py={3}>
                    No pending {activeTab} requests found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              getCurrentData().map((request) => (
                <TableRow key={request._id} hover>
                  <TableCell>{request.id}</TableCell>
                  <TableCell>
                    <Typography variant="subtitle2">
                      {request.fullName || `${request.lastName}, ${request.firstName} ${request.middleName || ''}`.trim()}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {request.sex} • {request.age || 'N/A'} years
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      icon={<PersonIcon />} 
                      label={activeTab === 'visitors' ? 'Visitor' : 'Guest'} 
                      size="small" 
                      color={activeTab === 'visitors' ? 'primary' : 'secondary'}
                    />
                  </TableCell>
                  {activeTab === 'visitors' && (
                    <TableCell>{request.prisonerId}</TableCell>
                  )}
                  {activeTab === 'guests' && (
                    <TableCell>{request.visitPurpose || 'N/A'}</TableCell>
                  )}
                  <TableCell>{request.contact || 'N/A'}</TableCell>
                  <TableCell>{formatDate(request.createdAt)}</TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Chip 
                        label={request.createdBy || 'System'} 
                        size="small" 
                        variant="outlined"
                      />
                    </Box>
                  </TableCell>
                  <TableCell>
                    {getStatusChip(request.status)}
                  </TableCell>
                  <TableCell>
                    <Box display="flex" gap={1}>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<ViewIcon />}
                        onClick={() => handleViewDetails(request, activeTab)}
                        disabled={actionLoading}
                      >
                        View
                      </Button>
                      <Button
                        variant="contained"
                        color="success"
                        size="small"
                        startIcon={<CheckIcon />}
                        onClick={() => handleApprove(request.id, activeTab.slice(0, -1))} // Remove 's' from visitors/guests
                        disabled={actionLoading}
                      >
                        Approve
                      </Button>
                      <Button
                        variant="outlined"
                        color="error"
                        size="small"
                        startIcon={<CloseIcon />}
                        onClick={() => handleReject(request.id, activeTab.slice(0, -1))}
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

      {/* View Request Details Dialog */}
      <Dialog
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedRequest?.type === 'visitor' ? 'Visitor' : 'Guest'} Details - {selectedRequest?.id}
        </DialogTitle>
        <DialogContent>
          {selectedRequest && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Full Name"
                  value={selectedRequest.fullName || `${selectedRequest.lastName}, ${selectedRequest.firstName} ${selectedRequest.middleName || ''}`.trim()}
                  fullWidth
                  margin="dense"
                  InputProps={{ readOnly: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Date of Birth"
                  value={formatDate(selectedRequest.dateOfBirth)}
                  fullWidth
                  margin="dense"
                  InputProps={{ readOnly: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Sex"
                  value={selectedRequest.sex || 'N/A'}
                  fullWidth
                  margin="dense"
                  InputProps={{ readOnly: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Age"
                  value={selectedRequest.age || 'N/A'}
                  fullWidth
                  margin="dense"
                  InputProps={{ readOnly: true }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Address"
                  value={selectedRequest.address || 'N/A'}
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
                  value={selectedRequest.contact || 'N/A'}
                  fullWidth
                  margin="dense"
                  InputProps={{ readOnly: true }}
                />
              </Grid>
              
              {selectedRequest.type === 'visitor' ? (
                <>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Prisoner ID"
                      value={selectedRequest.prisonerId}
                      fullWidth
                      margin="dense"
                      InputProps={{ readOnly: true }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Relationship"
                      value={selectedRequest.relationship || 'N/A'}
                      fullWidth
                      margin="dense"
                      InputProps={{ readOnly: true }}
                    />
                  </Grid>
                </>
              ) : (
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Visit Purpose"
                    value={selectedRequest.visitPurpose || 'N/A'}
                    fullWidth
                    margin="dense"
                    InputProps={{ readOnly: true }}
                  />
                </Grid>
              )}
              
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Date Submitted"
                  value={formatDate(selectedRequest.createdAt)}
                  fullWidth
                  margin="dense"
                  InputProps={{ readOnly: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Created By"
                  value={selectedRequest.createdBy || 'System'}
                  fullWidth
                  margin="dense"
                  InputProps={{ readOnly: true }}
                />
              </Grid>
              
              {selectedRequest.violationType && (
                <Grid item xs={12}>
                  <TextField
                    label="Violation Type"
                    value={selectedRequest.violationType}
                    fullWidth
                    margin="dense"
                    InputProps={{ readOnly: true }}
                  />
                </Grid>
              )}
              {selectedRequest.violationDetails && (
                <Grid item xs={12}>
                  <TextField
                    label="Violation Details"
                    value={selectedRequest.violationDetails}
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
              handleApprove(selectedRequest.id, selectedRequest.type);
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
              handleReject(selectedRequest.id, selectedRequest.type);
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