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
import { 
  DatePicker,
  LocalizationProvider 
} from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import {
  Download,
  PictureAsPdf,
  Analytics,
  People,
  Schedule,
  TrendingUp
} from '@mui/icons-material';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import axios from 'axios';

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
  const [rawData, setRawData] = useState([]);

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

      console.log('🔄 Fetching analytics with params:', params);

      // Use the new analytics endpoint
      const response = await axios.get('/analytics/reports', { params });
      
      if (response.data.success) {
        setChartData(response.data.chartData || []);
        setSummaryData(response.data.summaryData || {});
        setRawData(response.data.rawData || []);
        
        console.log('✅ Analytics data loaded:', {
          chartData: response.data.chartData?.length,
          summaryData: response.data.summaryData
        });
      } else {
        throw new Error(response.data.message || 'Failed to fetch analytics');
      }
    } catch (err) {
      console.error('❌ Error fetching analytics data:', err);
      
      // If there's no data, show sample data for demonstration
      if (err.response?.status === 404 || err.message.includes('No data')) {
        setError('No visit data found. Showing sample data for demonstration.');
        loadSampleData();
      } else {
        setError('Failed to load analytics data: ' + (err.response?.data?.message || err.message));
      }
    } finally {
      setLoading(false);
    }
  };

  const loadSampleData = async () => {
    try {
      const response = await axios.get('/analytics/sample-data');
      if (response.data.success) {
        setChartData(response.data.chartData);
        setSummaryData(response.data.summaryData);
      }
    } catch (err) {
      // Fallback to local sample data
      const sampleData = [
        { date: '1/15/2024', visitors: 8, name: '1/15/2024' },
        { date: '1/16/2024', visitors: 12, name: '1/16/2024' },
        { date: '1/17/2024', visitors: 15, name: '1/17/2024' },
        { date: '1/18/2024', visitors: 10, name: '1/18/2024' },
        { date: '1/19/2024', visitors: 18, name: '1/19/2024' },
      ];

      const sampleSummary = {
        totalVisits: 63,
        avgVisitsPerDay: 13,
        completionRate: 95,
        peakDay: '1/19/2024: 18 visits'
      };

      setChartData(sampleData);
      setSummaryData(sampleSummary);
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
    console.log('📊 Rendering chart with data:', chartData);

    if (!chartData || chartData.length === 0) {
      return (
        <Box display="flex" justifyContent="center" alignItems="center" height={400} flexDirection="column">
          <Typography variant="h6" color="textSecondary" gutterBottom>
            No Data Available
          </Typography>
          <Typography variant="body2" color="textSecondary" align="center">
            No analytics data found for the selected criteria.
            <br />
            Try adjusting your date range or check if there are visit logs in the system.
          </Typography>
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
                name="Number of Visitors"
              />
            </LineChart>
          </ResponsiveContainer>
        );
    }
  };

  const getSummaryCards = () => {
    if (Object.keys(summaryData).length === 0) {
      return (
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                No Summary Data Available
              </Typography>
              <Typography variant="body2">
                No analytics data to display summary statistics.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      );
    }

    return Object.entries(summaryData).map(([key, value], index) => (
      <Grid item xs={12} sm={6} md={3} key={key}>
        <Card sx={{ height: '100%' }}>
          <CardContent>
            <Typography color="textSecondary" gutterBottom variant="overline" sx={{ fontSize: '0.7rem' }}>
              {key.replace(/([A-Z])/g, ' $1').toUpperCase()}
            </Typography>
            <Typography variant="h5" component="div" sx={{ fontWeight: 'bold' }}>
              {typeof value === 'object' ? JSON.stringify(value) : value}
              {key.includes('Rate') || key.includes('Ratio') ? '%' : ''}
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
            severity={error.includes('sample data') ? 'info' : 'error'} 
            sx={{ mb: 2 }}
            action={
              <Button 
                color="inherit" 
                size="small" 
                onClick={fetchAnalyticsData}
              >
                RETRY
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
                  <MenuItem value="yearly">Yearly Analysis</MenuItem>
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