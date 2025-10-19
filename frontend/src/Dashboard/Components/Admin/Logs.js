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
  TextField,
  MenuItem,
  Card,
  CardContent,
  Grid,
  FormControl,
  InputLabel,
  Select,
  Button,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  Search as SearchIcon,
  Visibility as ViewIcon,
  Event as EventIcon,
  Person as PersonIcon,
  Group as GroupIcon,
  Security as SecurityIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

const Logs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    module: '',
    action: '',
    dateRange: 'all',
    startDate: null,
    endDate: null,
    search: ''
  });
  const [selectedLog, setSelectedLog] = useState(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    today: 0,
    users: 0,
    inmates: 0,
    visitors: 0
  });

  // Module options
  const moduleOptions = [
    { value: 'user', label: 'User Management' },
    { value: 'inmate', label: 'Inmate Management' },
    { value: 'visitor', label: 'Visitor Management' },
    { value: 'crime', label: 'Crime Management' },
    { value: 'system', label: 'System' },
    { value: 'auth', label: 'Authentication' }
  ];

  // Action options
  const actionOptions = [
    { value: 'create', label: 'Create' },
    { value: 'update', label: 'Update' },
    { value: 'delete', label: 'Delete' },
    { value: 'login', label: 'Login' },
    { value: 'logout', label: 'Logout' },
    { value: 'approve', label: 'Approve' },
    { value: 'reject', label: 'Reject' },
    { value: 'import', label: 'Import' },
    { value: 'export', label: 'Export' }
  ];

  // Date range options
  const dateRangeOptions = [
    { value: 'all', label: 'All Time' },
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'week', label: 'Last 7 Days' },
    { value: 'month', label: 'Last 30 Days' },
    { value: 'custom', label: 'Custom Range' }
  ];

  // Fetch logs from backend
  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError('');

      // In a real implementation, you would have a dedicated logs endpoint
      // For now, we'll simulate by combining data from multiple endpoints
      const [usersResponse, inmatesResponse, visitorsResponse] = await Promise.all([
        fetch('http://localhost:5000/users'),
        fetch('http://localhost:5000/inmates'),
        fetch('http://localhost:5000/visitors')
      ]);

      if (!usersResponse.ok || !inmatesResponse.ok || !visitorsResponse.ok) {
        throw new Error('Failed to fetch system data');
      }

      const [users, inmates, visitors] = await Promise.all([
        usersResponse.json(),
        inmatesResponse.json(),
        visitorsResponse.json()
      ]);

      // Transform data into log format
      const generatedLogs = generateLogsFromData(users, inmates, visitors);
      setLogs(generatedLogs);
      calculateStats(generatedLogs);

    } catch (err) {
      setError(err.message);
      console.error('Error fetching logs:', err);
    } finally {
      setLoading(false);
    }
  };

  // Generate simulated logs from system data
  const generateLogsFromData = (users, inmates, visitors) => {
    const logs = [];

    // User activities
    users.forEach(user => {
      logs.push({
        id: `log-${user._id}`,
        timestamp: new Date(user.createdAt),
        module: 'user',
        action: 'create',
        user: user.name,
        userId: user._id,
        description: `User account created for ${user.name} (${user.role})`,
        ipAddress: '192.168.1.100',
        status: 'success'
      });

      if (user.updatedAt !== user.createdAt) {
        logs.push({
          id: `log-${user._id}-update`,
          timestamp: new Date(user.updatedAt),
          module: 'user',
          action: 'update',
          user: user.name,
          userId: user._id,
          description: `User account updated for ${user.name}`,
          ipAddress: '192.168.1.100',
          status: 'success'
        });
      }
    });

    // Inmate activities
    inmates.forEach(inmate => {
      logs.push({
        id: `log-${inmate._id}`,
        timestamp: new Date(inmate.createdAt),
        module: 'inmate',
        action: 'create',
        user: 'System Admin',
        userId: 'system',
        description: `Inmate record created: ${inmate.inmateCode} - ${inmate.fullName}`,
        ipAddress: '192.168.1.100',
        status: 'success'
      });
    });

    // Visitor activities
    visitors.forEach(visitor => {
      logs.push({
        id: `log-${visitor._id}`,
        timestamp: new Date(visitor.createdAt),
        module: 'visitor',
        action: 'create',
        user: visitor.createdBy?.name || 'System',
        userId: visitor.createdBy?._id || 'system',
        description: `Visitor request submitted: ${visitor.id} - ${visitor.fullName}`,
        ipAddress: '192.168.1.100',
        status: 'success'
      });

      if (visitor.status !== 'pending') {
        logs.push({
          id: `log-${visitor._id}-status`,
          timestamp: new Date(visitor.updatedAt),
          module: 'visitor',
          action: visitor.status === 'approved' ? 'approve' : 'reject',
          user: 'Admin User',
          userId: 'admin',
          description: `Visitor request ${visitor.status}: ${visitor.id} - ${visitor.fullName}`,
          ipAddress: '192.168.1.100',
          status: 'success'
        });
      }
    });

    // Add some authentication logs
    logs.push({
      id: 'log-auth-1',
      timestamp: new Date(),
      module: 'auth',
      action: 'login',
      user: 'System Admin',
      userId: 'admin',
      description: 'User logged in successfully',
      ipAddress: '192.168.1.105',
      status: 'success'
    });

    // Sort by timestamp descending
    return logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  };

  // Calculate statistics
  const calculateStats = (logData) => {
    const today = new Date().toDateString();
    const todayLogs = logData.filter(log => 
      new Date(log.timestamp).toDateString() === today
    );

    const userLogs = logData.filter(log => log.module === 'user').length;
    const inmateLogs = logData.filter(log => log.module === 'inmate').length;
    const visitorLogs = logData.filter(log => log.module === 'visitor').length;

    setStats({
      total: logData.length,
      today: todayLogs.length,
      users: userLogs,
      inmates: inmateLogs,
      visitors: visitorLogs
    });
  };

  // Filter logs based on current filters
  const filteredLogs = logs.filter(log => {
    // Module filter
    if (filters.module && log.module !== filters.module) return false;

    // Action filter
    if (filters.action && log.action !== filters.action) return false;

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchesSearch = 
        log.description.toLowerCase().includes(searchLower) ||
        log.user.toLowerCase().includes(searchLower) ||
        log.ipAddress.includes(searchLower);
      if (!matchesSearch) return false;
    }

    // Date range filter
    if (filters.dateRange !== 'all') {
      const logDate = new Date(log.timestamp);
      const now = new Date();

      switch (filters.dateRange) {
        case 'today':
          if (logDate.toDateString() !== now.toDateString()) return false;
          break;
        case 'yesterday':
          const yesterday = subDays(now, 1);
          if (logDate.toDateString() !== yesterday.toDateString()) return false;
          break;
        case 'week':
          const weekAgo = subDays(now, 7);
          if (logDate < weekAgo) return false;
          break;
        case 'month':
          const monthAgo = subDays(now, 30);
          if (logDate < monthAgo) return false;
          break;
        case 'custom':
          if (filters.startDate && logDate < startOfDay(filters.startDate)) return false;
          if (filters.endDate && logDate > endOfDay(filters.endDate)) return false;
          break;
        default:
          break;
      }
    }

    return true;
  });

  // Handle filter changes
  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      module: '',
      action: '',
      dateRange: 'all',
      startDate: null,
      endDate: null,
      search: ''
    });
  };

  // View log details
  const handleViewDetails = (log) => {
    setSelectedLog(log);
    setViewDialogOpen(true);
  };

  // Get module icon
  const getModuleIcon = (module) => {
    switch (module) {
      case 'user': return <PersonIcon />;
      case 'inmate': return <SecurityIcon />;
      case 'visitor': return <GroupIcon />;
      default: return <EventIcon />;
    }
  };

  // Get status chip color
  const getStatusChip = (status) => {
    return (
      <Chip 
        label={status.charAt(0).toUpperCase() + status.slice(1)} 
        color={status === 'success' ? 'success' : 'error'} 
        size="small" 
      />
    );
  };

  // Get action chip color
  const getActionChip = (action) => {
    const actionConfig = {
      create: { color: 'success', label: 'Create' },
      update: { color: 'primary', label: 'Update' },
      delete: { color: 'error', label: 'Delete' },
      login: { color: 'info', label: 'Login' },
      logout: { color: 'warning', label: 'Logout' },
      approve: { color: 'success', label: 'Approve' },
      reject: { color: 'error', label: 'Reject' },
      import: { color: 'secondary', label: 'Import' },
      export: { color: 'info', label: 'Export' }
    };

    const config = actionConfig[action] || { color: 'default', label: action };
    return (
      <Chip 
        label={config.label} 
        color={config.color} 
        size="small" 
      />
    );
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4" component="h1" gutterBottom>
            System Logs
          </Typography>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchLogs}
            disabled={loading}
          >
            Refresh
          </Button>
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* Statistics Cards */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom variant="body2">
                  Total Logs
                </Typography>
                <Typography variant="h4" component="div">
                  {stats.total}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom variant="body2">
                  Today's Activities
                </Typography>
                <Typography variant="h4" component="div">
                  {stats.today}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom variant="body2">
                  User Activities
                </Typography>
                <Typography variant="h4" component="div">
                  {stats.users}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom variant="body2">
                  Inmate Activities
                </Typography>
                <Typography variant="h4" component="div">
                  {stats.inmates}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom variant="body2">
                  Visitor Activities
                </Typography>
                <Typography variant="h4" component="div">
                  {stats.visitors}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Filters */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                size="small"
                label="Search Logs"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Module</InputLabel>
                <Select
                  value={filters.module}
                  label="Module"
                  onChange={(e) => handleFilterChange('module', e.target.value)}
                >
                  <MenuItem value="">All Modules</MenuItem>
                  {moduleOptions.map(option => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Action</InputLabel>
                <Select
                  value={filters.action}
                  label="Action"
                  onChange={(e) => handleFilterChange('action', e.target.value)}
                >
                  <MenuItem value="">All Actions</MenuItem>
                  {actionOptions.map(option => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Date Range</InputLabel>
                <Select
                  value={filters.dateRange}
                  label="Date Range"
                  onChange={(e) => handleFilterChange('dateRange', e.target.value)}
                >
                  {dateRangeOptions.map(option => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            {filters.dateRange === 'custom' && (
              <>
                <Grid item xs={12} sm={6} md={2}>
                  <DatePicker
                    label="Start Date"
                    value={filters.startDate}
                    onChange={(date) => handleFilterChange('startDate', date)}
                    slotProps={{ textField: { size: 'small', fullWidth: true } }}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={2}>
                  <DatePicker
                    label="End Date"
                    value={filters.endDate}
                    onChange={(date) => handleFilterChange('endDate', date)}
                    slotProps={{ textField: { size: 'small', fullWidth: true } }}
                  />
                </Grid>
              </>
            )}
            <Grid item xs={12} md={1}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<FilterIcon />}
                onClick={clearFilters}
                size="small"
              >
                Clear
              </Button>
            </Grid>
          </Grid>
        </Paper>

        {/* Logs Table */}
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>Timestamp</strong></TableCell>
                <TableCell><strong>Module</strong></TableCell>
                <TableCell><strong>Action</strong></TableCell>
                <TableCell><strong>User</strong></TableCell>
                <TableCell><strong>Description</strong></TableCell>
                <TableCell><strong>IP Address</strong></TableCell>
                <TableCell><strong>Status</strong></TableCell>
                <TableCell><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <Typography variant="body1" color="textSecondary" py={3}>
                      No logs found matching the current filters
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log) => (
                  <TableRow key={log.id} hover>
                    <TableCell>
                      <Typography variant="body2">
                        {format(new Date(log.timestamp), 'MMM dd, yyyy')}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {format(new Date(log.timestamp), 'HH:mm:ss')}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        {getModuleIcon(log.module)}
                        <Typography variant="body2">
                          {moduleOptions.find(m => m.value === log.module)?.label || log.module}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      {getActionChip(log.action)}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {log.user}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {log.description}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontFamily="monospace">
                        {log.ipAddress}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {getStatusChip(log.status)}
                    </TableCell>
                    <TableCell>
                      <Tooltip title="View Details">
                        <IconButton
                          size="small"
                          onClick={() => handleViewDetails(log)}
                        >
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Log Details Dialog */}
        <Dialog
          open={viewDialogOpen}
          onClose={() => setViewDialogOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            Log Details
          </DialogTitle>
          <DialogContent>
            {selectedLog && (
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Log ID"
                    value={selectedLog.id}
                    fullWidth
                    margin="dense"
                    InputProps={{ readOnly: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Timestamp"
                    value={format(new Date(selectedLog.timestamp), 'PPpp')}
                    fullWidth
                    margin="dense"
                    InputProps={{ readOnly: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Module"
                    value={moduleOptions.find(m => m.value === selectedLog.module)?.label || selectedLog.module}
                    fullWidth
                    margin="dense"
                    InputProps={{ readOnly: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Action"
                    value={actionOptions.find(a => a.value === selectedLog.action)?.label || selectedLog.action}
                    fullWidth
                    margin="dense"
                    InputProps={{ readOnly: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="User"
                    value={selectedLog.user}
                    fullWidth
                    margin="dense"
                    InputProps={{ readOnly: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="IP Address"
                    value={selectedLog.ipAddress}
                    fullWidth
                    margin="dense"
                    InputProps={{ readOnly: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Status"
                    value={selectedLog.status}
                    fullWidth
                    margin="dense"
                    InputProps={{ readOnly: true }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Description"
                    value={selectedLog.description}
                    fullWidth
                    margin="dense"
                    InputProps={{ readOnly: true }}
                    multiline
                    rows={3}
                  />
                </Grid>
              </Grid>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </LocalizationProvider>
  );
};

export default Logs;