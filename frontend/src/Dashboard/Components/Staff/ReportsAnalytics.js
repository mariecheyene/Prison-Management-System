import React, { useState, useEffect, useRef } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { 
  Box, 
  Paper, 
  Typography, 
  Grid, 
  Card, 
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Alert,
  TextField
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import {
  Download,
  PictureAsPdf,
  Analytics,
  TrendingUp
} from '@mui/icons-material';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000'; // Add this constant

const ReportsAnalytics = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)),
    endDate: new Date()
  });
  const [reportType, setReportType] = useState('daily');
  const [chartData, setChartData] = useState([]);
  const [summaryData, setSummaryData] = useState({});
  const [rawData, setRawData] = useState({});

  const chartRef = useRef();

  // Colors for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

  useEffect(() => {
    fetchAnalyticsData();
  }, [dateRange, reportType]);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    setError('');
    
    try {
      const params = {
        startDate: dateRange.startDate.toISOString().split('T')[0],
        endDate: dateRange.endDate.toISOString().split('T')[0],
        reportType
      };

      console.log('🔄 Fetching REAL analytics data with params:', params);

      // FIXED: Use the correct backend URL
      const response = await axios.get(`${API_BASE_URL}/analytics/reports`, { params });
      
      if (response.data.success) {
        setChartData(response.data.chartData || []);
        setSummaryData(response.data.summaryData || {});
        setRawData(response.data.rawData || {});
        
        console.log('✅ REAL Analytics data loaded:', {
          chartDataPoints: response.data.chartData?.length,
          summaryData: response.data.summaryData,
          rawData: response.data.rawData
        });

        // Show message if no data found
        if (response.data.chartData.length === 0) {
          setError('No visit logs found in the system for the selected period. Data will appear when visits are logged.');
        }
      } else {
        throw new Error(response.data.message || 'Failed to fetch analytics');
      }
    } catch (err) {
      console.error('❌ Error fetching REAL analytics data:', err);
      setError('Failed to load analytics data: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  // Export to PDF function
  const exportToPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Title
    doc.setFontSize(20);
    doc.setTextColor(40, 40, 40);
    doc.text('Prison Management System - Analytics Report', pageWidth / 2, 20, { align: 'center' });
    
    // Report details
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text(`Report Type: ${reportType.charAt(0).toUpperCase() + reportType.slice(1)}`, 20, 40);
    doc.text(`Date Range: ${dateRange.startDate.toLocaleDateString()} - ${dateRange.endDate.toLocaleDateString()}`, 20, 50);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 60);
    
    let yPosition = 80;

    // Summary Section
    doc.setFontSize(16);
    doc.setTextColor(40, 40, 40);
    doc.text('Summary Statistics', 20, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    const summaryRows = Object.entries(summaryData).map(([key, value]) => [
      key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
      typeof value === 'object' ? JSON.stringify(value) : value.toString()
    ]);

    doc.autoTable({
      startY: yPosition,
      head: [['Metric', 'Value']],
      body: summaryRows,
      theme: 'grid',
      headStyles: { fillColor: [66, 66, 66] },
      styles: { fontSize: 9, cellPadding: 3 }
    });

    yPosition = doc.lastAutoTable.finalY + 20;

    // Chart Data Table
    doc.setFontSize(16);
    doc.text('Detailed Data', 20, yPosition);
    yPosition += 10;

    if (chartData.length > 0) {
      const tableHeaders = Object.keys(chartData[0]).map(key => 
        key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())
      );
      
      const tableData = chartData.map(item => 
        Object.values(item).map(value => 
          typeof value === 'object' ? JSON.stringify(value) : value.toString()
        )
      );

      doc.autoTable({
        startY: yPosition,
        head: [tableHeaders],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [66, 66, 66] },
        styles: { fontSize: 8, cellPadding: 2 }
      });
    }

    // Save the PDF
    doc.save(`prison-analytics-${reportType}-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // Render appropriate chart based on report type
  const renderChart = () => {
    console.log('📊 Rendering chart with REAL data:', chartData);

    if (!chartData || chartData.length === 0) {
      return (
        <Box display="flex" justifyContent="center" alignItems="center" height={400} flexDirection="column">
          <Typography variant="h6" color="textSecondary" gutterBottom>
            No Visit Data Available
          </Typography>
          <Typography variant="body2" color="textSecondary" align="center">
            No visit logs found in the system for the selected period.
            <br />
            Data will appear automatically when visitors and guests start using the system.
          </Typography>
          <Box sx={{ mt: 2, p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
            <Typography variant="caption" color="textSecondary">
              <strong>System Status:</strong><br />
              • Visitors: {rawData.visitors || 0}<br />
              • Guests: {rawData.guests || 0}<br />
              • Inmates: {rawData.inmates || 0}<br />
              • Visit Logs: {rawData.visitLogs || 0}
            </Typography>
          </Box>
        </Box>
      );
    }

    switch (reportType) {
      case 'demographic':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={150}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [`${value} people`, 'Count']} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'performance':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
              <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
              <Tooltip 
                formatter={(value, name) => {
                  if (name === 'Avg Duration') return [`${value} minutes`, name];
                  return [value, name];
                }}
              />
              <Legend />
              <Bar yAxisId="left" dataKey="avgDuration" fill="#8884d8" name="Avg Duration (mins)" />
              <Bar yAxisId="right" dataKey="visits" fill="#82ca9d" name="Number of Visits" />
            </BarChart>
          </ResponsiveContainer>
        );

      default:
        return (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="visitors" 
                stroke="#8884d8" 
                strokeWidth={2}
                dot={{ fill: '#8884d8', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: '#8884d8', strokeWidth: 2 }}
                name="Visitors"
              />
              <Line 
                type="monotone" 
                dataKey="guests" 
                stroke="#82ca9d" 
                strokeWidth={2}
                dot={{ fill: '#82ca9d', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: '#82ca9d', strokeWidth: 2 }}
                name="Guests"
              />
              <Line 
                type="monotone" 
                dataKey="total" 
                stroke="#ff8042" 
                strokeWidth={3}
                dot={{ fill: '#ff8042', strokeWidth: 2, r: 5 }}
                activeDot={{ r: 8, stroke: '#ff8042', strokeWidth: 2 }}
                name="Total Visits"
              />
            </LineChart>
          </ResponsiveContainer>
        );
    }
  };

  const getSummaryCards = () => {
    if (Object.keys(summaryData).length === 0 || chartData.length === 0) {
      return (
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                No Analytics Data
              </Typography>
              <Typography variant="body2">
                No visit logs found in the system. Analytics will appear when visitors start using the system.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      );
    }

    const keyMetrics = [
      { key: 'totalVisits', label: 'Total Visits', color: '#1976d2' },
      { key: 'totalVisitors', label: 'Total Visitors', color: '#2e7d32' },
      { key: 'totalGuests', label: 'Total Guests', color: '#ed6c02' },
      { key: 'avgDailyVisits', label: 'Avg Daily Visits', color: '#9c27b0' },
      { key: 'daysWithVisits', label: 'Active Days', color: '#d32f2f' },
      { key: 'averageDuration', label: 'Avg Duration', color: '#0288d1' }
    ];

    return keyMetrics
      .filter(metric => summaryData[metric.key] !== undefined)
      .map((metric, index) => (
        <Grid item xs={12} sm={6} md={4} lg={2} key={metric.key}>
          <Card sx={{ height: '100%', borderLeft: `4px solid ${metric.color}` }}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="overline" sx={{ fontSize: '0.7rem' }}>
                {metric.label}
              </Typography>
              <Typography variant="h5" component="div" sx={{ fontWeight: 'bold', color: metric.color }}>
                {summaryData[metric.key]}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      ));
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box p={3}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4" gutterBottom>
            <Analytics sx={{ mr: 2, verticalAlign: 'middle' }} />
            Reports & Analytics
          </Typography>
          <Button
            variant="contained"
            startIcon={<PictureAsPdf />}
            onClick={exportToPDF}
            disabled={loading || chartData.length === 0}
          >
            Export PDF Report
          </Button>
        </Box>

        {error && (
          <Alert 
            severity={error.includes('No visit logs') ? 'info' : 'error'} 
            sx={{ mb: 2 }}
            action={
              <Button 
                color="inherit" 
                size="small" 
                onClick={fetchAnalyticsData}
              >
                REFRESH
              </Button>
            }
          >
            {error}
          </Alert>
        )}

        {/* Filters */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={3}>
              <DatePicker
                label="Start Date"
                value={dateRange.startDate}
                onChange={(date) => setDateRange(prev => ({ ...prev, startDate: date }))}
                renderInput={(params) => <TextField {...params} fullWidth />}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <DatePicker
                label="End Date"
                value={dateRange.endDate}
                onChange={(date) => setDateRange(prev => ({ ...prev, endDate: date }))}
                renderInput={(params) => <TextField {...params} fullWidth />}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Report Type</InputLabel>
                <Select
                  value={reportType}
                  label="Report Type"
                  onChange={(e) => setReportType(e.target.value)}
                >
                  <MenuItem value="daily">Daily Visitors</MenuItem>
                  <MenuItem value="weekly">Weekly Trends</MenuItem>
                  <MenuItem value="monthly">Monthly Overview</MenuItem>
                  <MenuItem value="demographic">Demographics</MenuItem>
                  <MenuItem value="performance">Performance Metrics</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <Button
                variant="outlined"
                onClick={fetchAnalyticsData}
                disabled={loading}
                fullWidth
                startIcon={loading ? <CircularProgress size={20} /> : <TrendingUp />}
              >
                {loading ? 'Loading...' : 'Refresh Data'}
              </Button>
            </Grid>
          </Grid>
        </Paper>

        {/* Summary Cards */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {getSummaryCards()}
        </Grid>

        {/* Chart */}
        <Paper sx={{ p: 3, mb: 3 }} ref={chartRef}>
          <Typography variant="h6" gutterBottom>
            {reportType.charAt(0).toUpperCase() + reportType.slice(1)} Analytics
            {chartData.length > 0 && (
              <Chip 
                label={`${chartData.length} data points`} 
                size="small" 
                sx={{ ml: 2 }} 
                color="primary" 
                variant="outlined"
              />
            )}
          </Typography>
          
          {loading ? (
            <Box display="flex" justifyContent="center" alignItems="center" height={400}>
              <CircularProgress />
              <Typography variant="body2" sx={{ ml: 2 }}>
                Loading analytics data...
              </Typography>
            </Box>
          ) : (
            renderChart()
          )}
        </Paper>

        {/* Data Table */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Raw Data {chartData.length > 0 && `(${chartData.length} records)`}
          </Typography>
          
          {chartData.length === 0 ? (
            <Box display="flex" justifyContent="center" alignItems="center" height={100}>
              <Typography variant="body2" color="textSecondary">
                No data to display
              </Typography>
            </Box>
          ) : (
            <>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      {chartData.length > 0 && Object.keys(chartData[0]).map((key) => (
                        <TableCell key={key} sx={{ fontWeight: 'bold' }}>
                          {key.charAt(0).toUpperCase() + key.slice(1)}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {chartData.slice(0, 10).map((row, index) => (
                      <TableRow key={index}>
                        {Object.values(row).map((value, cellIndex) => (
                          <TableCell key={cellIndex}>
                            {typeof value === 'object' ? JSON.stringify(value) : value}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              {chartData.length > 10 && (
                <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
                  Showing first 10 of {chartData.length} records
                </Typography>
              )}
            </>
          )}
        </Paper>
      </Box>
    </LocalizationProvider>
  );
};

export default ReportsAnalytics;