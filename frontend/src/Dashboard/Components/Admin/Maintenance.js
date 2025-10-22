import React, { useState, useEffect } from 'react';
import { 
  Button, 
  Card, 
  Table, 
  message, 
  Space, 
  Select, 
  Tag, 
  Row, 
  Col,
  Statistic,
  Progress,
  Modal,
  Alert
} from 'antd';
import { 
  DownloadOutlined, 
  SyncOutlined, 
  DatabaseOutlined,
  DeleteOutlined,
  EyeOutlined,
  SecurityScanOutlined,
  RocketOutlined
} from '@ant-design/icons';
import axios from 'axios';

const Maintenance = () => {
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [format, setFormat] = useState('json');
  const [stats, setStats] = useState({});
  const [health, setHealth] = useState({});
  const [restoreModalVisible, setRestoreModalVisible] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState(null);

  const API_BASE_URL = 'http://localhost:5000';

  // Fetch all backups
  const fetchBackups = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/backups`);
      setBackups(response.data.backups || []);
      setStats(response.data.stats || {});
    } catch (error) {
      console.error('Fetch backups error:', error);
      message.warning('Backup system not initialized or no backups found');
      setBackups([]);
      setStats({});
    } finally {
      setLoading(false);
    }
  };

  // Create new backup
  const createBackup = async () => {
    setExportLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/backups/create`, { format });
      message.success(response.data.message);
      fetchBackups();
      
      // Auto-download the backup file
      if (response.data.filename) {
        setTimeout(() => {
          const link = document.createElement('a');
          link.href = `${API_BASE_URL}/backups/download/${response.data.filename}`;
          link.setAttribute('download', response.data.filename);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }, 1000);
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Backup creation failed';
      message.error(`Backup failed: ${errorMsg}`);
      console.error('Backup error:', error);
    } finally {
      setExportLoading(false);
    }
  };

  // Quick backup
  const createQuickBackup = async () => {
    try {
      const response = await axios.post(`${API_BASE_URL}/backups/quick`);
      message.success(response.data.message);
      fetchBackups();
    } catch (error) {
      message.error('Quick backup failed');
      console.error('Quick backup error:', error);
    }
  };

  // Download backup
  const downloadBackup = (filename) => {
    const link = document.createElement('a');
    link.href = `${API_BASE_URL}/backups/download/${filename}`;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Delete backup
  const deleteBackup = async (filename) => {
    try {
      await axios.delete(`${API_BASE_URL}/backups/${filename}`);
      message.success('Backup deleted successfully');
      fetchBackups();
    } catch (error) {
      message.error('Failed to delete backup');
      console.error('Delete backup error:', error);
    }
  };

  // Restore backup
  const restoreBackup = async (filename) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/backups/restore/${filename}`);
      message.success(response.data.message);
      setRestoreModalVisible(false);
      setSelectedBackup(null);
      
      // Show restore results
      if (response.data.results) {
        const { restored, errors } = response.data.results;
        const successCount = Object.keys(restored).length;
        const errorCount = Object.keys(errors).length;
        
        message.info(`Restored ${successCount} collections, ${errorCount} errors`);
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Restore failed';
      message.error(`Restore failed: ${errorMsg}`);
    }
  };

  // System health check
  const runHealthCheck = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/health`);
      setHealth(response.data);
      message.success('System is healthy');
    } catch (error) {
      message.error('System health check failed');
      console.error('Health check error:', error);
    }
  };

  // Database statistics
  const getDatabaseStats = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/database/stats`);
      setStats(prev => ({ ...prev, ...response.data }));
      message.success('Database stats updated');
    } catch (error) {
      console.error('Database stats error:', error);
      message.warning('Could not fetch database stats');
    }
  };

  const columns = [
    {
      title: 'Filename',
      dataIndex: 'filename',
      key: 'filename',
      render: (text) => <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>{text}</span>
    },
    {
      title: 'Date Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => new Date(date).toLocaleString()
    },
    {
      title: 'Format',
      dataIndex: 'format',
      key: 'format',
      render: (format) => (
        <Tag color={format === 'json' ? 'blue' : 'green'}>
          {format?.toUpperCase()}
        </Tag>
      )
    },
    {
      title: 'Size',
      dataIndex: 'size',
      key: 'size',
      render: (size) => {
        if (!size) return '-';
        const sizeInKB = size / 1024;
        if (sizeInKB > 1024) {
          return `${(sizeInKB / 1024).toFixed(2)} MB`;
        }
        return `${sizeInKB.toFixed(2)} KB`;
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button 
            icon={<DownloadOutlined />} 
            onClick={() => downloadBackup(record.filename)}
            size="small"
          >
            Download
          </Button>
          <Button 
            icon={<EyeOutlined />}
            onClick={() => {
              setSelectedBackup(record);
              setRestoreModalVisible(true);
            }}
            size="small"
            type="dashed"
            danger
          >
            Restore
          </Button>
          <Button 
            icon={<DeleteOutlined />}
            onClick={() => deleteBackup(record.filename)}
            size="small"
            danger
          >
            Delete
          </Button>
        </Space>
      ),
    },
  ];

  useEffect(() => {
    fetchBackups();
    getDatabaseStats();
    runHealthCheck();
  }, []);

  return (
    <div style={{ padding: '24px' }}>
      <Row gutter={[16, 16]}>
        {/* System Health */}
        <Col span={24}>
          <Card title="System Health" size="small">
            <Row gutter={16}>
              <Col span={6}>
                <Statistic
                  title="Database"
                  value={health.database === 'connected' ? 'Connected' : 'Disconnected'}
                  valueStyle={{ color: health.database === 'connected' ? '#3f8600' : '#cf1322' }}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="Uptime"
                  value={health.uptime ? `${Math.floor(health.uptime / 60)}m` : 'Unknown'}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="Backups"
                  value={health.backups?.count || 0}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="Memory"
                  value={health.memory?.used || 'Unknown'}
                />
              </Col>
            </Row>
          </Card>
        </Col>

        {/* Statistics Cards */}
        <Col span={24}>
          <Row gutter={16}>
            <Col span={6}>
              <Card>
                <Statistic
                  title="Total Backups"
                  value={stats.totalBackups || 0}
                  prefix={<DatabaseOutlined />}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="Database Collections"
                  value={stats.collectionsCount || 0}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="Total Records"
                  value={stats.totalRecords || 0}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="Last Backup"
                  value={stats.lastBackup ? new Date(stats.lastBackup).toLocaleDateString() : 'Never'}
                />
              </Card>
            </Col>
          </Row>
        </Col>

        {/* Backup Actions */}
        <Col span={24}>
          <Card 
            title="Database Maintenance" 
            bordered={false}
            extra={
              <Space>
                <Button 
                  icon={<SecurityScanOutlined />}
                  onClick={runHealthCheck}
                >
                  Health Check
                </Button>
                <Button 
                  icon={<RocketOutlined />}
                  onClick={createQuickBackup}
                >
                  Quick Backup
                </Button>
                <Button 
                  icon={<SyncOutlined />} 
                  onClick={fetchBackups}
                  loading={loading}
                >
                  Refresh
                </Button>
              </Space>
            }
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              <Space wrap>
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
                  size="large"
                >
                  Create Backup
                </Button>
                <Button 
                  onClick={getDatabaseStats}
                  icon={<DatabaseOutlined />}
                >
                  Update Stats
                </Button>
              </Space>

              {/* Storage Usage */}
              {stats.storageUsage && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span>Storage Usage</span>
                    <span>{Math.round(stats.storageUsage)}%</span>
                  </div>
                  <Progress 
                    percent={stats.storageUsage} 
                    status={stats.storageUsage > 80 ? 'exception' : 'normal'}
                  />
                </div>
              )}
            </Space>
          </Card>
        </Col>

        {/* Collection Stats */}
        {stats.collectionStats && (
          <Col span={24}>
            <Card title="Collection Statistics" size="small">
              <Row gutter={[16, 16]}>
                {Object.entries(stats.collectionStats).map(([name, count]) => (
                  <Col span={6} key={name}>
                    <Card size="small">
                      <Statistic
                        title={name}
                        value={count}
                        valueStyle={{ fontSize: '16px' }}
                      />
                    </Card>
                  </Col>
                ))}
              </Row>
            </Card>
          </Col>
        )}

        {/* Backups Table */}
        <Col span={24}>
          <Card title="Backup Files">
            <Table
              columns={columns}
              dataSource={backups}
              loading={loading}
              rowKey="filename"
              pagination={{ pageSize: 10 }}
              scroll={{ x: 800 }}
              locale={{
                emptyText: backups.length === 0 && !loading ? 'No backups found. Create your first backup!' : 'No data'
              }}
            />
          </Card>
        </Col>
      </Row>

      {/* Restore Confirmation Modal */}
      <Modal
        title="⚠️ Confirm Database Restore"
        open={restoreModalVisible}
        onCancel={() => {
          setRestoreModalVisible(false);
          setSelectedBackup(null);
        }}
        footer={[
          <Button key="cancel" onClick={() => setRestoreModalVisible(false)}>
            Cancel
          </Button>,
          <Button 
            key="restore" 
            type="primary" 
            danger 
            onClick={() => selectedBackup && restoreBackup(selectedBackup.filename)}
          >
            I Understand - Restore Now
          </Button>,
        ]}
      >
        <Alert
          message="Critical Warning"
          description="This action will REPLACE ALL CURRENT DATA with the backup data. This cannot be undone!"
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
        
        <div style={{ padding: '10px 0' }}>
          <p><strong>Backup File:</strong> {selectedBackup?.filename}</p>
          <p><strong>Date:</strong> {selectedBackup && new Date(selectedBackup.createdAt).toLocaleString()}</p>
          <p><strong>Size:</strong> {selectedBackup?.size ? `${(selectedBackup.size / 1024 / 1024).toFixed(2)} MB` : 'Unknown'}</p>
        </div>

        <Alert
          message="Recommendation"
          description="Create a backup of your current data before proceeding with restore."
          type="warning"
          showIcon
        />
      </Modal>
    </div>
  );
};

export default Maintenance;