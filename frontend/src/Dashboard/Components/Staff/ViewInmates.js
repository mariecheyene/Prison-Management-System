import React, { useState, useEffect } from 'react';
import { Container, Table, Badge, Card } from 'react-bootstrap';

const ViewInmates = ({ gender = 'all' }) => {
  const [inmates, setInmates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInmates();
  }, [gender]);

  const fetchInmates = async () => {
    try {
      setLoading(true);
      const url = gender === 'all' 
        ? '/api/inmates' 
        : `/api/inmates?gender=${gender}`;
      
      const response = await fetch(url);
      const data = await response.json();
      setInmates(data);
    } catch (error) {
      console.error('Error fetching inmates:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusVariant = (status) => {
    switch (status) {
      case 'incarcerated': return 'danger';
      case 'released': return 'success';
      case 'transferred': return 'warning';
      default: return 'secondary';
    }
  };

  const getTitle = () => {
    switch (gender) {
      case 'male': return 'Male Inmates';
      case 'female': return 'Female Inmates';
      default: return 'All Inmates';
    }
  };

  if (loading) {
    return (
      <Container>
        <div className="text-center">Loading inmates...</div>
      </Container>
    );
  }

  return (
    <Container>
      <Card>
        <Card.Header>
          <h4 className="mb-0">
            {getTitle()}
            <Badge bg="secondary" className="ms-2">{inmates.length}</Badge>
          </h4>
        </Card.Header>
        <Card.Body>
          <Table striped bordered hover responsive>
            <thead>
              <tr>
                <th>Inmate Code</th>
                <th>Full Name</th>
                <th>Gender</th>
                <th>Date of Birth</th>
                <th>Cell ID</th>
                <th>Crime</th>
                <th>Sentence</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {inmates.map(inmate => (
                <tr key={inmate._id}>
                  <td>{inmate.inmateCode}</td>
                  <td>{inmate.fullName}</td>
                  <td>{inmate.sex}</td>
                  <td>{new Date(inmate.dateOfBirth).toLocaleDateString()}</td>
                  <td>{inmate.cellId}</td>
                  <td>{inmate.crime}</td>
                  <td>{inmate.sentence}</td>
                  <td>
                    <Badge bg={getStatusVariant(inmate.status)}>
                      {inmate.status}
                    </Badge>
                  </td>
                </tr>
              ))}
              {inmates.length === 0 && (
                <tr>
                  <td colSpan="8" className="text-center">No inmates found</td>
                </tr>
              )}
            </tbody>
          </Table>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default ViewInmates;