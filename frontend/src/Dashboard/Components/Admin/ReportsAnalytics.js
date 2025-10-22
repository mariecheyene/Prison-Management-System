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

      // Fetch visit logs for analytics
      const visitLogsResponse = await axios.get('/visit-logs', { params });
      const visitLogs = visitLogsResponse.data;

      // Fetch additional data for comprehensive reports
      const [inmatesResponse, visitorsResponse, guestsResponse] = await Promise.all([
        axios.get('/inmates'),
        axios.get('/visitors'),
        axios.get('/guests')
      ]);

      const allData = {
        visitLogs,
        inmates: inmatesResponse.data,
        visitors: visitorsResponse.data,
        guests: guestsResponse.data
      };

      setRawData(allData);
      processAnalyticsData(allData);
    } catch (err) {
      console.error('Error fetching analytics data:', err);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const processAnalyticsData = (data) => {
    const { visitLogs, inmates, visitors, guests } = data;
    
    // Process data based on report type
    let processedData = [];
    let summary = {};

    switch (reportType) {
      case 'daily':
        processedData = processDailyData(visitLogs);
        summary = calculateDailySummary(processedData, visitLogs);
        break;
      case 'weekly':
        processedData = processWeeklyData(visitLogs);
        summary = calculateWeeklySummary(processedData, visitLogs);
        break;
      case 'monthly':
        processedData = processMonthlyData(visitLogs);
        summary = calculateMonthlySummary(processedData, visitLogs);
        break;
      case 'yearly':
        processedData = processYearlyData(visitLogs);
        summary = calculateYearlySummary(processedData, visitLogs);
        break;
      case 'demographic':
        processedData = processDemographicData(visitors, guests, inmates);
        summary = calculateDemographicSummary(visitors, guests, inmates);
        break;
      case 'performance':
        processedData = processPerformanceData(visitLogs);
        summary = calculatePerformanceSummary(visitLogs);
        break;
      default:
        processedData = processDailyData(visitLogs);
        summary = calculateDailySummary(processedData, visitLogs);
    }

    setChartData(processedData);
    setSummaryData(summary);
  };

  // Data processing functions
  const processDailyData = (visitLogs) => {
    const dailyCounts = {};
    
    visitLogs.forEach(log => {
      const date = new Date(log.visitDate).toLocaleDateString();
      dailyCounts[date] = (dailyCounts[date] || 0) + 1;
    });

    return Object.entries(dailyCounts).map(([date, count]) => ({
      date,
      visitors: count,
      name: date
    })).sort((a, b) => new Date(a.date) - new Date(b.date));
  };

  const processWeeklyData = (visitLogs) => {
    const weeklyCounts = {};
    
    visitLogs.forEach(log => {
      const date = new Date(log.visitDate);
      const weekStart = new Date(date.setDate(date.getDate() - date.getDay()));
      const weekKey = weekStart.toLocaleDateString();
      
      weeklyCounts[weekKey] = (weeklyCounts[weekKey] || 0) + 1;
    });

    return Object.entries(weeklyCounts).map(([week, count]) => ({
      week: `Week of ${week}`,
      visitors: count,
      name: `Week of ${week}`
    })).sort((a, b) => new Date(a.week) - new Date(b.week));
  };

  const processMonthlyData = (visitLogs) => {
    const monthlyCounts = {};
    
    visitLogs.forEach(log => {
      const date = new Date(log.visitDate);
      const monthKey = date.toLocaleString('default', { month: 'long', year: 'numeric' });
      
      monthlyCounts[monthKey] = (monthlyCounts[monthKey] || 0) + 1;
    });

    return Object.entries(monthlyCounts).map(([month, count]) => ({
      month,
      visitors: count,
      name: month
    })).sort((a, b) => new Date(a.month) - new Date(b.month));
  };

  const processYearlyData = (visitLogs) => {
    const yearlyCounts = {};
    
    visitLogs.forEach(log => {
      const year = new Date(log.visitDate).getFullYear();
      yearlyCounts[year] = (yearlyCounts[year] || 0) + 1;
    });

    return Object.entries(yearlyCounts).map(([year, count]) => ({
      year: year.toString(),
      visitors: count,
      name: year.toString()
    })).sort((a, b) => a.year - b.year);
  };

  const processDemographicData = (visitors, guests, inmates) => {
    // Gender distribution
    const genderData = [
      { name: 'Male Visitors', value: visitors.filter(v => v.sex === 'Male').length },
      { name: 'Female Visitors', value: visitors.filter(v => v.sex === 'Female').length },
      { name: 'Male Guests', value: guests.filter(g => g.sex === 'Male').length },
      { name: 'Female Guests', value: guests.filter(g => g.sex === 'Female').length },
      { name: 'Male Inmates', value: inmates.filter(i => i.sex === 'Male').length },
      { name: 'Female Inmates', value: inmates.filter(i => i.sex === 'Female').length }
    ];

    return genderData.filter(item => item.value > 0);
  };

  const processPerformanceData = (visitLogs) => {
    // Average visit duration by day
    const durationByDay = {};
    
    visitLogs.forEach(log => {
      if (log.visitDuration) {
        const date = new Date(log.visitDate).toLocaleDateString();
        if (!durationByDay[date]) {
          durationByDay[date] = { totalMinutes: 0, count: 0 };
        }
        
        // Parse duration (format: "Xh Ym")
        const durationMatch = log.visitDuration.match(/(\d+)h\s*(\d+)m/);
        if (durationMatch) {
          const hours = parseInt(durationMatch[1]);
          const minutes = parseInt(durationMatch[2]);
          durationByDay[date].totalMinutes += (hours * 60) + minutes;
          durationByDay[date].count += 1;
        }
      }
    });

    return Object.entries(durationByDay).map(([date, data]) => ({
      date,
      avgDuration: Math.round(data.totalMinutes / data.count),
      visits: data.count,
      name: date
    })).sort((a, b) => new Date(a.date) - new Date(b.date));
  };

  // Summary calculation functions
  const calculateDailySummary = (data, visitLogs) => {
    const totalVisits = visitLogs.length;
    const avgVisitsPerDay = totalVisits / (data.length || 1);
    const completedVisits = visitLogs.filter(log => log.status === 'completed').length;
    
    return {
      totalVisits,
      avgVisitsPerDay: Math.round(avgVisitsPerDay),
      completionRate: Math.round((completedVisits / totalVisits) * 100),
      peakDay: data.reduce((max, day) => day.visitors > max.visitors ? day : max, { visitors: 0 })
    };
  };

  const calculateWeeklySummary = (data, visitLogs) => {
    const totalVisits = visitLogs.length;
    const avgVisitsPerWeek = totalVisits / (data.length || 1);
    
    return {
      totalVisits,
      avgVisitsPerWeek: Math.round(avgVisitsPerWeek),
      peakWeek: data.reduce((max, week) => week.visitors > max.visitors ? week : max, { visitors: 0 })
    };
  };

  const calculateMonthlySummary = (data, visitLogs) => {
    const totalVisits = visitLogs.length;
    const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
    const currentMonthData = data.find(item => item.month === currentMonth);
    
    return {
      totalVisits,
      currentMonthVisits: currentMonthData ? currentMonthData.visitors : 0,
      peakMonth: data.reduce((max, month) => month.visitors > max.visitors ? month : max, { visitors: 0 })
    };
  };

  const calculateYearlySummary = (data, visitLogs) => {
    const totalVisits = visitLogs.length;
    const currentYear = new Date().getFullYear().toString();
    const currentYearData = data.find(item => item.year === currentYear);
    
    return {
      totalVisits,
      currentYearVisits: currentYearData ? currentYearData.visitors : 0,
      growthRate: calculateGrowthRate(data)
    };
  };

  const calculateDemographicSummary = (visitors, guests, inmates) => {
    const totalVisitors = visitors.length;
    const totalGuests = guests.length;
    const totalInmates = inmates.length;
    const maleInmates = inmates.filter(i => i.sex === 'Male').length;
    const femaleInmates = inmates.filter(i => i.sex === 'Female').length;
    
    return {
      totalVisitors,
      totalGuests,
      totalInmates,
      maleInmates,
      femaleInmates,
      genderRatio: Math.round((maleInmates / totalInmates) * 100) || 0
    };
  };

  const calculatePerformanceSummary = (visitLogs) => {
    const completedVisits = visitLogs.filter(log => log.status === 'completed');
    const avgDuration = completedVisits.reduce((total, log) => {
      if (log.visitDuration) {
        const match = log.visitDuration.match(/(\d+)h\s*(\d+)m/);
        if (match) {
          return total + (parseInt(match[1]) * 60) + parseInt(match[2]);
        }
      }
      return total;
    }, 0) / (completedVisits.length || 1);

    return {
      avgVisitDuration: Math.round(avgDuration),
      totalCompletedVisits: completedVisits.length,
      efficiency: Math.round((completedVisits.length / visitLogs.length) * 100)
    };
  };

  const calculateGrowthRate = (data) => {
    if (data.length < 2) return 0;
    
    const currentYear = data[data.length - 1].visitors;
    const previousYear = data[data.length - 2].visitors;
    
    return Math.round(((currentYear - previousYear) / previousYear) * 100);
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
    if (chartData.length === 0) {
      return (
        <Box display="flex" justifyContent="center" alignItems="center" height={400}>
          <Typography variant="h6" color="textSecondary">
            No data available for the selected criteria
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
              <Tooltip />
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
              <Tooltip />
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
              />
            </LineChart>
          </ResponsiveContainer>
        );
    }
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
          <Alert severity="error" sx={{ mb: 2 }}>
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
              >
                {loading ? <CircularProgress size={24} /> : 'Refresh Data'}
              </Button>
            </Grid>
          </Grid>
        </Paper>

        {/* Summary Cards */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {Object.entries(summaryData).map(([key, value], index) => (
            <Grid item xs={12} sm={6} md={3} key={key}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom variant="overline">
                    {key.replace(/([A-Z])/g, ' $1').toUpperCase()}
                  </Typography>
                  <Typography variant="h5" component="div">
                    {typeof value === 'object' ? JSON.stringify(value) : value}
                    {key.includes('Rate') || key.includes('Ratio') ? '%' : ''}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Chart */}
        <Paper sx={{ p: 3, mb: 3 }} ref={chartRef}>
          <Typography variant="h6" gutterBottom>
            {reportType.charAt(0).toUpperCase() + reportType.slice(1)} Analytics
          </Typography>
          {loading ? (
            <Box display="flex" justifyContent="center" alignItems="center" height={400}>
              <CircularProgress />
            </Box>
          ) : (
            renderChart()
          )}
        </Paper>

        {/* Data Table */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Raw Data
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  {chartData.length > 0 && Object.keys(chartData[0]).map((key) => (
                    <TableCell key={key}>
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
        </Paper>
      </Box>
    </LocalizationProvider>
  );
};

export default ReportsAnalytics;