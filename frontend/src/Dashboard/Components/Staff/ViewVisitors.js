import React, { useState, useEffect } from 'react';
import { Container, Table, Badge, Card } from 'react-bootstrap';

const ViewVisitors = ({ gender = 'all' }) => {
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVisitors();
  }, [gender]);

  const fetchVisitors = async () => {
    try {
      setLoading(true);
      const url = gender === 'all' 
        ? '/api/visitors' 
        : `/api/visitors/gender/${gender}`;
      
      const response = await fetch(url);
      const data = await response.json();
      setVisitors(data);
    } catch (error) {
      console.error('Error fetching visitors:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusVariant = (status) => {
    switch (status) {
      case 'approved': return 'success';
      case 'pending': return 'warning';
      case 'rejected': return 'danger';
      default: return 'secondary';
    }
  };

  const getTitle = () => {
    switch (gender) {
      case 'male': return 'Visitors for Male Inmates';
      case 'female': return 'Visitors for Female Inmates';
      default: return 'All Visitors';
    }
  };

  if (loading) {
    return (
      <Container>
        <div className="text-center">Loading visitors...</div>
      </Container>
    );
  }

  return (
    <Container>
      <Card>
        <Card.Header>
          <h4 className="mb-0">
            {getTitle()}
            <Badge bg="secondary" className="ms-2">{visitors.length}</Badge>
          </h4>
        </Card.Header>
        <Card.Body>
          <Table striped bordered hover responsive>
            <thead>
              <tr>
                <th>Visitor ID</th>
                <th>Full Name</th>
                <th>Contact</th>
                <th>Prisoner ID</th>
                <th>Relationship</th>
                <th>Date Visited</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {visitors.map(visitor => (
                <tr key={visitor._id}>
                  <td>{visitor.id}</td>
                  <td>{visitor.fullName}</td>
                  <td>{visitor.contact}</td>
                  <td>{visitor.prisonerId}</td>
                  <td>{visitor.relationship}</td>
                  <td>{new Date(visitor.dateVisited).toLocaleDateString()}</td>
                  <td>
                    <Badge bg={getStatusVariant(visitor.status)}>
                      {visitor.status}
                    </Badge>
                  </td>
                </tr>
              ))}
              {visitors.length === 0 && (
                <tr>
                  <td colSpan="7" className="text-center">No visitors found</td>
                </tr>
              )}
            </tbody>
          </Table>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default ViewVisitors;