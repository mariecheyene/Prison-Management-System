import React, { useState, useEffect } from 'react';
import { Button, Card, Table, message, Space, Select, Tag } from 'antd';
import { DownloadOutlined, SyncOutlined } from '@ant-design/icons';
import axios from 'axios';

const Maintenance = () => {
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [format, setFormat] = useState('json');

  const API_BASE_URL = 'http://localhost:5000';

  const fetchBackups = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/backup/list`);
      setBackups(response.data);
    } catch (error) {
      message.error('Failed to fetch backups');
      console.error('Fetch backups error:', error);
    } finally {
      setLoading(false);
    }
  };

  const createBackup = async () => {
    setExportLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/backup`, { format });
      message.success(response.data.message);
      fetchBackups();
      
      // Create hidden link and trigger download
      const link = document.createElement('a');
      link.href = `${API_BASE_URL}/api/backup/download/${response.data.filename}`;
      link.setAttribute('download', response.data.filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message;
      message.error(`Backup failed: ${errorMsg}`);
      console.error('Backup error:', error);
    } finally {
      setExportLoading(false);
    }
  };

  const downloadBackup = (filename) => {
    const link = document.createElement('a');
    link.href = `${API_BASE_URL}/api/backup/download/${filename}`;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const columns = [
    {
      title: 'Filename',
      dataIndex: 'name',
      key: 'name',
      render: (text) => <span style={{ fontFamily: 'monospace' }}>{text}</span>
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      render: (date) => new Date(date).toLocaleString()
    },
    {
      title: 'Format',
      dataIndex: 'format',
      key: 'format',
      render: (format) => <Tag color={format === 'JSON' ? 'blue' : 'green'}>{format}</Tag>
    },
    {
      title: 'Size',
      dataIndex: 'size',
      key: 'size',
      render: (size) => `${(size / 1024).toFixed(2)} KB`
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Button 
          icon={<DownloadOutlined />} 
          onClick={() => downloadBackup(record.name)}
          size="small"
        >
          Download
        </Button>
      ),
    },
  ];

  useEffect(() => {
    fetchBackups();
  }, []);

  return (
    <Card 
      title="System Maintenance" 
      bordered={false}
      extra={
        <Button 
          icon={<SyncOutlined />} 
          onClick={fetchBackups}
          loading={loading}
        >
          Refresh
        </Button>
      }
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        <Space>
          <Select
            value={format}
            style={{ width: 120 }}
            onChange={setFormat}
            options={[
              { value: 'json', label: 'JSON' },
              { value: 'csv', label: 'CSV' },
            ]}
          />
          <Button 
            type="primary" 
            onClick={createBackup}
            loading={exportLoading}
            icon={<DownloadOutlined />}
          >
            Create Backup
          </Button>
        </Space>

        <Table
          columns={columns}
          dataSource={backups}
          loading={loading}
          rowKey="name"
          pagination={false}
          style={{ marginTop: 20 }}
        />
      </Space>
    </Card>
  );
};

export default Maintenance;