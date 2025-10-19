import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement,
} from "chart.js";
import { Bar, Pie, Line } from "react-chartjs-2";
import { Button, Card, Row, Col, Container, Table } from "react-bootstrap";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import {
  FaChartPie,
  FaChartBar,
  FaPrint,
  FaUsers,
  FaUser,
  FaHome,
  FaPhone,
  FaGraduationCap,
  FaIdCard,
  FaBriefcase,
} from "react-icons/fa";

// Register Chart.js components
ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement
);

const API_URL = "http://localhost:5000/residents"; // Adjust API URL

const ReportsAnalytics = () => {
  const [residents, setResidents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeReport, setActiveReport] = useState(null);
  const chartRefs = useRef({});

  useEffect(() => {
    fetchResidents();
  }, []);

  const fetchResidents = async () => {
    setLoading(true);
    try {
      const response = await axios.get(API_URL);
      setResidents(response.data);
    } catch (error) {
      toast.error("Error fetching residents");
    }
    setLoading(false);
  };

  // Helper functions for data processing
  const getResidentsPerPurok = () => {
    const purokCounts = residents.reduce((acc, resident) => {
      const purok = resident.purokNumber || "Unknown";
      acc[purok] = (acc[purok] || 0) + 1;
      return acc;
    }, {});
    return {
      labels: Object.keys(purokCounts).sort((a, b) => a - b), // Sort numerically
      datasets: [
        {
          label: "Residents per Purok",
          data: Object.keys(purokCounts)
            .sort((a, b) => a - b)
            .map((key) => purokCounts[key]),
          backgroundColor: [
            "#FF6384",
            "#36A2EB",
            "#FFCE56",
            "#4BC0C0",
            "#9966FF",
            "#FF9F40",
            "#1F75FE",
            "#D9534F",
          ],
        },
      ],
    };
  };

  const getAgeDistribution = () => {
    const ageGroups = { "0-5": 0, "6-12": 0, "13-18": 0, "19-35": 0, "36-59": 0, "60+": 0 };
    residents.forEach((resident) => {
      const age = resident.age || 0;
      if (age <= 5) ageGroups["0-5"]++;
      else if (age <= 12) ageGroups["6-12"]++;
      else if (age <= 18) ageGroups["13-18"]++;
      else if (age <= 35) ageGroups["19-35"]++;
      else if (age <= 59) ageGroups["36-59"]++;
      else ageGroups["60+"]++;
    });
    return {
      labels: Object.keys(ageGroups),
      datasets: [
        {
          label: "Age Distribution",
          data: Object.values(ageGroups),
          backgroundColor: [
            "#FF6384",
            "#36A2EB",
            "#FFCE56",
            "#4BC0C0",
            "#9966FF",
            "#FF9F40",
          ],
        },
      ],
    };
  };

  const getSexRatio = () => {
    const sexCounts = residents.reduce((acc, resident) => {
      const sex = resident.sex || "Unknown";
      acc[sex] = (acc[sex] || 0) + 1;
      return acc;
    }, {});
    return {
      labels: Object.keys(sexCounts),
      datasets: [
        {
          label: "Sex Ratio",
          data: Object.values(sexCounts),
          backgroundColor: ["#36A2EB", "#FF6384", "#FFCE56", "#4BC0C0"], // Added more colors
        },
      ],
    };
  };

  const getCivilStatusDistribution = () => {
    const civilStatusCounts = residents.reduce((acc, resident) => {
      const status = resident.civilStatus || "Unknown";
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
    return {
      labels: Object.keys(civilStatusCounts),
      datasets: [
        {
          label: "Civil Status Distribution",
          data: Object.values(civilStatusCounts),
          backgroundColor: [
            "#FF6384",
            "#36A2EB",
            "#FFCE56",
            "#4BC0C0",
            "#9966FF",
          ],
        },
      ],
    };
  };

  const getEmploymentStatusDistribution = () => {
    const employmentCounts = residents.reduce((acc, resident) => {
      const status = resident.employmentStatus || "Unknown";
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
    return {
      labels: Object.keys(employmentCounts),
      datasets: [
        {
          label: "Employment Status Distribution",
          data: Object.values(employmentCounts),
          backgroundColor: [
            "#FF6384",
            "#36A2EB",
            "#FFCE56",
            "#4BC0C0",
            "#9966FF",
          ],
        },
      ],
    };
  };

  const getEducationalAttainmentDistribution = () => {
    const educationCounts = residents.reduce((acc, resident) => {
      const education = resident.educationalAttainment || "Unknown";
      acc[education] = (acc[education] || 0) + 1;
      return acc;
    }, {});
    return {
      labels: Object.keys(educationCounts),
      datasets: [
        {
          label: "Educational Attainment Distribution",
          data: Object.values(educationCounts),
          backgroundColor: [
            "#FF6384",
            "#36A2EB",
            "#FFCE56",
            "#4BC0C0",
            "#9966FF",
            "#FF9F40",
          ],
        },
      ],
    };
  };

  const getVoterRegistration = () => {
    const registered = residents.filter(
      (resident) => resident.votersStatus === "Registered"
    ).length;
    const notRegistered = residents.length - registered;
    return {
      labels: ["Registered", "Not Registered"],
      datasets: [
        {
          label: "Voter Registration",
          data: [registered, notRegistered],
          backgroundColor: ["#36A2EB", "#FF6384"],
        },
      ],
    };
  };

  const getResidenceStatusDistribution = () => {
    const residenceCounts = residents.reduce((acc, resident) => {
      const status = resident.residenceStatus || "Unknown";
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
    return {
      labels: Object.keys(residenceCounts),
      datasets: [
        {
          label: "Residence Status Distribution",
          data: Object.values(residenceCounts),
          backgroundColor: [
            "#FF6384",
            "#36A2EB",
            "#FFCE56",
            "#4BC0C0",
          ],
        },
      ],
    };
  };

  const getHouseholdMembers = () => {
    const householdCounts = residents.reduce((acc, resident) => {
      const household = resident.householdNumber || "Unknown";
      acc[household] = (acc[household] || 0) + 1;
      return acc;
    }, {});
    return {
      labels: Object.keys(householdCounts).sort((a, b) => a - b), // Sort numerically
      datasets: [
        {
          label: "Household Members",
          data: Object.keys(householdCounts)
            .sort((a, b) => a - b)
            .map((key) => householdCounts[key]),
          backgroundColor: [
            "#FF6384",
            "#36A2EB",
            "#FFCE56",
            "#4BC0C0",
            "#9966FF",
            "#FF9F40",
          ],
        },
      ],
    };
  };

  const getContactInfo = () => {
    const withContact = residents.filter((resident) => resident.phone).sort((a, b) => a.name.localeCompare(b.name));
    const withoutContact = residents.filter((resident) => !resident.phone).sort((a, b) => a.name.localeCompare(b.name));
    return { withContact, withoutContact };
  };

  const getYearsOfStay = () => {
    const ranges = [
      { label: "0-5 years", min: 0, max: 5 },
      { label: "6-10 years", min: 6, max: 10 },
      { label: "11-15 years", min: 11, max: 15 },
      { label: "16-20 years", min: 16, max: 20 },
      { label: "20+ years", min: 21, max: Infinity }
    ];
  
    const counts = ranges.map(range => ({
      label: range.label,
      count: residents.filter(resident => {
        const years = parseInt(resident.yearsOfStay) || 0;
        return years >= range.min && years <= range.max;
      }).length
    }));
  
    return {
      labels: counts.map(range => range.label),
      datasets: [{
        label: "Number of Residents",
        data: counts.map(range => range.count),
        backgroundColor: [
          "#FF6384",
          "#36A2EB",
          "#FFCE56",
          "#4BC0C0",
          "#9966FF"
        ]
      }]
    };
  };

  // Export a single chart and summary to PDF
  const exportChartToPDF = (chartId, title, summaryId) => {
    const chartElement = document.getElementById(chartId);
    const summaryElement = document.getElementById(summaryId);

    if (!chartElement || !summaryElement) return;

    html2canvas(chartElement).then((chartCanvas) => {
      html2canvas(summaryElement).then((summaryCanvas) => {
        const pdf = new jsPDF("p", "mm", "a4"); // A4 size page
        const imgWidth = 180; // Width for the chart and summary
        const chartImgHeight = (chartCanvas.height * imgWidth) / chartCanvas.width;
        const summaryImgHeight = (summaryCanvas.height * imgWidth) / summaryCanvas.width;

        // Add Barangay Acmac title
        pdf.setFontSize(18);
        pdf.text("Barangay Acmac Reports and Analytics", 10, 20);
        pdf.setFontSize(14);
        pdf.text(title, 10, 30);

        // Add chart image below the title
        pdf.addImage(chartCanvas.toDataURL("image/png"), "PNG", 10, 40, imgWidth, chartImgHeight);

        // Add summary image below the chart
        pdf.addImage(summaryCanvas.toDataURL("image/png"), "PNG", 10, 40 + chartImgHeight + 10, imgWidth, summaryImgHeight);

        pdf.save(`${title}.pdf`);
      });
    });
  };

  // Render summary table
  const renderSummary = (data, title, summaryId) => {
    const total = data.datasets[0].data.reduce((a, b) => a + b, 0);
    const sortedLabels = data.labels.slice().sort((a, b) => {
      if (!isNaN(a)) return a - b; // Sort numerically for numeric categories
      return a.localeCompare(b); // Sort alphabetically for non-numeric categories
    });

    return (
      <Card id={summaryId} className="mt-3">
        <Card.Body>
          <Table striped bordered>
            <thead>
              <tr>
                <th>
                  {title === "Residents per Purok"
                    ? "Purok Number"
                    : title === "Voter Registration"
                    ? "Voter Status"
                    : title === "Age Distribution"
                    ? "Age Group"
                    : title === "Sex Ratio"
                    ? "Sex"
                    : title === "Civil Status Distribution"
                    ? "Civil Status"
                    : title === "Employment Status Distribution"
                    ? "Employment Status"
                    : title === "Educational Attainment Distribution"
                    ? "Education Level"
                    : title === "Residence Status Distribution"
                    ? "Residence Status"
                    : title === "Household Members"
                    ? "Household Number"
                    : title === "Contact Info"
                    ? "Contact Status"
                    : title === "Years of Stay"
                    ? "Years"
                    : "Category"}
                </th>
                <th>Count</th>
                <th>Percentage</th>
              </tr>
            </thead>
            <tbody>
              {sortedLabels.map((label, index) => (
                <tr key={index}>
                  <td>{label}</td>
                  <td>{data.datasets[0].data[data.labels.indexOf(label)]}</td>
                  <td>{((data.datasets[0].data[data.labels.indexOf(label)] / total) * 100).toFixed(2)}%</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card.Body>
      </Card>
    );
  };

  // Render visualization based on active report
  const renderVisualization = () => {
    const chartOptions = {
      maintainAspectRatio: false,
      plugins: {
        tooltip: {
          callbacks: {
            label: (context) => {
              const label = context.label || "";
              const value = context.raw || 0;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = ((value / total) * 100).toFixed(2);
              return `${label}: ${value} (${percentage}%)`;
            },
          },
        },
        legend: {
          display: true, // Show legend for all pie charts
        },
      },
    };

    switch (activeReport) {
      case "general":
        const residentsPerPurokData = getResidentsPerPurok();
        const yearsOfStayData = getYearsOfStay();
        return (
          <Row className="justify-content-center">
            <Col md={6}>
              <h5 className="text-center">Residents per Purok</h5>
              <div id="residents-per-purok" style={{ height: "300px" }}>
                <Pie data={residentsPerPurokData} options={chartOptions} />
              </div>
              {renderSummary(residentsPerPurokData, "Residents per Purok", "residents-per-purok-summary")}
              <Button onClick={() => exportChartToPDF("residents-per-purok", "Residents per Purok", "residents-per-purok-summary")} className="mt-2">
                <FaPrint /> Export as PDF
              </Button>
            </Col>
            <Col md={6}>
              <h5 className="text-center">Years of Stay</h5>
              <div id="years-of-stay" style={{ height: "300px" }}>
                <Line data={yearsOfStayData} options={chartOptions} />
              </div>
              {renderSummary(yearsOfStayData, "Years of Stay", "years-of-stay-summary")}
              <Button onClick={() => exportChartToPDF("years-of-stay", "Years of Stay", "years-of-stay-summary")} className="mt-2">
                <FaPrint /> Export as PDF
              </Button>
            </Col>
          </Row>
        );
      case "ageSex":
        const ageDistributionData = getAgeDistribution();
        const sexRatioData = getSexRatio();
        return (
          <Row className="justify-content-center">
            <Col md={6}>
              <h5 className="text-center">Age Distribution</h5>
              <div id="age-distribution" style={{ height: "300px" }}>
                <Bar
                  data={ageDistributionData}
                  options={{
                    ...chartOptions,
                    plugins: {
                      legend: {
                        display: false, // Hide legend for bar graphs
                      },
                    },
                    scales: {
                      x: { title: { display: true, text: "Age Groups" } },
                      y: { title: { display: true, text: "Number of Residents" } },
                    },
                  }}
                />
              </div>
              {renderSummary(ageDistributionData, "Age Distribution", "age-distribution-summary")}
              <Button onClick={() => exportChartToPDF("age-distribution", "Age Distribution", "age-distribution-summary")} className="mt-2">
                <FaPrint /> Export as PDF
              </Button>
            </Col>
            <Col md={6}>
              <h5 className="text-center">Sex Ratio</h5>
              <div id="sex-ratio" style={{ height: "300px" }}>
                <Pie data={sexRatioData} options={chartOptions} />
              </div>
              {renderSummary(sexRatioData, "Sex Ratio", "sex-ratio-summary")}
              <Button onClick={() => exportChartToPDF("sex-ratio", "Sex Ratio", "sex-ratio-summary")} className="mt-2">
                <FaPrint /> Export as PDF
              </Button>
            </Col>
          </Row>
        );
      case "civilStatus":
        const civilStatusData = getCivilStatusDistribution();
        return (
          <Row className="justify-content-center">
            <Col md={6}>
              <h5 className="text-center">Civil Status Distribution</h5>
              <div id="civil-status-distribution" style={{ height: "300px" }}>
                <Pie data={civilStatusData} options={chartOptions} />
              </div>
              {renderSummary(civilStatusData, "Civil Status Distribution", "civil-status-distribution-summary")}
              <Button onClick={() => exportChartToPDF("civil-status-distribution", "Civil Status Distribution", "civil-status-distribution-summary")} className="mt-2">
                <FaPrint /> Export as PDF
              </Button>
            </Col>
          </Row>
        );
      case "employment":
        const employmentData = getEmploymentStatusDistribution();
        return (
          <Row className="justify-content-center">
            <Col md={6}>
              <h5 className="text-center">Employment Status Distribution</h5>
              <div id="employment-status-distribution" style={{ height: "300px" }}>
                <Pie data={employmentData} options={chartOptions} />
              </div>
              {renderSummary(employmentData, "Employment Status Distribution", "employment-status-distribution-summary")}
              <Button onClick={() => exportChartToPDF("employment-status-distribution", "Employment Status Distribution", "employment-status-distribution-summary")} className="mt-2">
                <FaPrint /> Export as PDF
              </Button>
            </Col>
          </Row>
        );
      case "education":
        const educationData = getEducationalAttainmentDistribution();
        return (
          <Row className="justify-content-center">
            <Col md={6}>
              <h5 className="text-center">Educational Attainment Distribution</h5>
              <div id="educational-attainment-distribution" style={{ height: "300px" }}>
                <Pie data={educationData} options={chartOptions} />
              </div>
              {renderSummary(educationData, "Educational Attainment Distribution", "educational-attainment-distribution-summary")}
              <Button onClick={() => exportChartToPDF("educational-attainment-distribution", "Educational Attainment Distribution", "educational-attainment-distribution-summary")} className="mt-2">
                <FaPrint /> Export as PDF
              </Button>
            </Col>
          </Row>
        );
      case "voter":
        const voterData = getVoterRegistration();
        return (
          <Row className="justify-content-center">
            <Col md={6}>
              <h5 className="text-center">Voter Registration Status</h5>
              <div id="voter-registration" style={{ height: "300px" }}>
                <Pie data={voterData} options={chartOptions} />
              </div>
              {renderSummary(voterData, "Voter Registration", "voter-registration-summary")}
              <Button onClick={() => exportChartToPDF("voter-registration", "Voter Registration Status", "voter-registration-summary")} className="mt-2">
                <FaPrint /> Export as PDF
              </Button>
            </Col>
          </Row>
        );
      case "household":
        const residenceData = getResidenceStatusDistribution();
        const householdData = getHouseholdMembers();
        return (
          <Row className="justify-content-center">
            <Col md={6}>
              <h5 className="text-center">Residence Status Distribution</h5>
              <div id="residence-status-distribution" style={{ height: "300px" }}>
                <Pie data={residenceData} options={chartOptions} />
              </div>
              {renderSummary(residenceData, "Residence Status Distribution", "residence-status-distribution-summary")}
              <Button onClick={() => exportChartToPDF("residence-status-distribution", "Residence Status Distribution", "residence-status-distribution-summary")} className="mt-2">
                <FaPrint /> Export as PDF
              </Button>
            </Col>
            <Col md={6}>
              <h5 className="text-center">Household Members</h5>
              <div id="household-members" style={{ height: "300px" }}>
                <Bar
                  data={householdData}
                  options={{
                    ...chartOptions,
                    plugins: {
                      legend: {
                        display: false, // Hide legend for bar graphs
                      },
                    },
                    scales: {
                      x: { title: { display: true, text: "Household Number" } },
                      y: { title: { display: true, text: "Number of Residents" } },
                    },
                  }}
                />
              </div>
              {renderSummary(householdData, "Household Members", "household-members-summary")}
              <Button onClick={() => exportChartToPDF("household-members", "Household Members", "household-members-summary")} className="mt-2">
                <FaPrint /> Export as PDF
              </Button>
            </Col>
          </Row>
        );
      case "contact":
        const contactData = getContactInfo();
        return (
          <Row className="justify-content-center">
            <Col md={6}>
              <h5 className="text-center">Residents with Contact Info</h5>
              <Table striped bordered>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Phone</th>
                  </tr>
                </thead>
                <tbody>
                  {contactData.withContact.map((resident, index) => (
                    <tr key={index}>
                      <td>{resident.name}</td>
                      <td>{resident.phone}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Col>
            <Col md={6}>
              <h5 className="text-center">Households Without Contact Info</h5>
              <Table striped bordered>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Household Number</th>
                  </tr>
                </thead>
                <tbody>
                  {contactData.withoutContact.map((resident, index) => (
                    <tr key={index}>
                      <td>{resident.name}</td>
                      <td>{resident.householdNumber}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Col>
          </Row>
        );
      default:
        return null;
    }
  };

  return (
    <Container className="mt-5" id="reports-container">
      <h2 style={{ fontFamily: "Poppins, sans-serif", fontWeight: "600", color: "#2c3e50" }}>
        📊 Reports & Analytics
      </h2>

      {/* Clickable Icons */}
      <Row className="mb-4 justify-content-center">
        <Col xs={6} sm={4} md={3} lg={2} className="mb-3">
          <Button
            variant="primary"
            onClick={() => setActiveReport("general")}
            className="d-flex flex-column align-items-center p-3 w-100"
            style={{ backgroundColor: "#36A2EB" }}
          >
            <FaUsers size={24} />
            <span className="mt-2">General</span>
          </Button>
        </Col>
        <Col xs={6} sm={4} md={3} lg={2} className="mb-3">
          <Button
            variant="primary"
            onClick={() => setActiveReport("ageSex")}
            className="d-flex flex-column align-items-center p-3 w-100"
            style={{ backgroundColor: "#FF6384" }}
          >
            <FaUser size={24} />
            <span className="mt-2">Age & Sex</span>
          </Button>
        </Col>
        <Col xs={6} sm={4} md={3} lg={2} className="mb-3">
          <Button
            variant="primary"
            onClick={() => setActiveReport("civilStatus")}
            className="d-flex flex-column align-items-center p-3 w-100"
            style={{ backgroundColor: "#FFCE56" }}
          >
            <FaIdCard size={24} />
            <span className="mt-2">Civil Status</span>
          </Button>
        </Col>
        <Col xs={6} sm={4} md={3} lg={2} className="mb-3">
          <Button
            variant="primary"
            onClick={() => setActiveReport("employment")}
            className="d-flex flex-column align-items-center p-3 w-100"
            style={{ backgroundColor: "#4BC0C0" }}
          >
            <FaBriefcase size={24} />
            <span className="mt-2">Employment</span>
          </Button>
        </Col>
        <Col xs={6} sm={4} md={3} lg={2} className="mb-3">
          <Button
            variant="primary"
            onClick={() => setActiveReport("education")}
            className="d-flex flex-column align-items-center p-3 w-100"
            style={{ backgroundColor: "#9966FF" }}
          >
            <FaGraduationCap size={24} />
            <span className="mt-2">Education</span>
          </Button>
        </Col>
        <Col xs={6} sm={4} md={3} lg={2} className="mb-3">
          <Button
            variant="primary"
            onClick={() => setActiveReport("voter")}
            className="d-flex flex-column align-items-center p-3 w-100"
            style={{ backgroundColor: "#FF9F40" }}
          >
            <FaChartPie size={24} />
            <span className="mt-2">Voter</span>
          </Button>
        </Col>
        <Col xs={6} sm={4} md={3} lg={2} className="mb-3">
          <Button
            variant="primary"
            onClick={() => setActiveReport("household")}
            className="d-flex flex-column align-items-center p-3 w-100"
            style={{ backgroundColor: "#1F75FE" }}
          >
            <FaHome size={24} />
            <span className="mt-2">Household</span>
          </Button>
        </Col>
        <Col xs={6} sm={4} md={3} lg={2} className="mb-3">
          <Button
            variant="primary"
            onClick={() => setActiveReport("contact")}
            className="d-flex flex-column align-items-center p-3 w-100"
            style={{ backgroundColor: "#D9534F" }}
          >
            <FaPhone size={24} />
            <span className="mt-2">Contact</span>
          </Button>
        </Col>
      </Row>

      {/* Visualization Container */}
      <Card className="p-3">
        <Card.Body>{renderVisualization()}</Card.Body>
      </Card>

      <ToastContainer />
    </Container>
  );
};

export default ReportsAnalytics;