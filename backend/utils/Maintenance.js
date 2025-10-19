// utils/Maintenance.js
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const Papa = require('papaparse');
const mongoose = require('mongoose');
const writeFile = promisify(fs.writeFile);

class Maintenance {
 constructor() {
  this.backupDir = path.resolve(__dirname, '../backups'); // Using path.resolve
  this.ensureBackupDir();
}

  ensureBackupDir() {
    console.log('Ensuring backup directory exists at:', this.backupDir);
    if (!fs.existsSync(this.backupDir)) {
      console.log('Creating backup directory');
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
    try {
      fs.accessSync(this.backupDir, fs.constants.W_OK);
      console.log('Directory is writable');
    } catch (err) {
      console.error('Directory is not writable:', err);
      throw err;
    }
  }

  async exportData(format = 'json') {
    console.log('Starting export with format:', format);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-${timestamp}.${format}`;
    const filepath = path.join(this.backupDir, filename);
    console.log('File will be saved to:', filepath);

    try {
      console.log('Fetching data from MongoDB...');
      const [residents, users, requests, announcements] = await Promise.all([
        mongoose.model('Resident').find().lean(),
        mongoose.model('User').find().lean(),
        mongoose.model('DocumentRequest').find().lean(),
        mongoose.model('Announcement').find().lean(),
      ]);
      console.log('Data fetched successfully');

      const data = {
        residents,
        users,
        requests,
        announcements,
        metadata: {
          exportedAt: new Date(),
          system: "Barangay Management System"
        }
      };

      let fileContent;
      if (format === 'json') {
        fileContent = JSON.stringify(data, null, 2);
      } else if (format === 'csv') {
        const csvData = {
          residents: Papa.unparse(residents),
          users: Papa.unparse(users),
          requests: Papa.unparse(requests),
          announcements: Papa.unparse(announcements),
        };
        fileContent = `Residents:\n${csvData.residents}\n\nUsers:\n${csvData.users}\n\nRequests:\n${csvData.requests}\n\nAnnouncements:\n${csvData.announcements}`;
      }

      console.log('Writing file...');
      await writeFile(filepath, fileContent);
      console.log('File written successfully');
      
      return { filename, filepath, size: fileContent.length };
    } catch (error) {
      console.error('Export failed:', error);
      throw error;
    }
  }

  async getBackupList() {
    try {
      if (!fs.existsSync(this.backupDir)) {
        return [];
      }
      const files = fs.readdirSync(this.backupDir)
        .filter(file => file.startsWith('backup-'))
        .map(file => ({
          name: file,
          size: fs.statSync(path.join(this.backupDir, file)).size,
          date: fs.statSync(path.join(this.backupDir, file)).mtime,
          format: file.endsWith('.json') ? 'JSON' : 'CSV'
        }))
        .sort((a, b) => b.date - a.date);
      
      return files;
    } catch (error) {
      console.error('Failed to list backups:', error);
      throw error;
    }
  }

  async getBackupFile(filename) {
    const filepath = path.join(this.backupDir, filename);
    if (!fs.existsSync(filepath)) {
      throw new Error(`Backup file not found at ${filepath}`);
    }
    return {
      path: filepath,
      filename: filename,
      stream: fs.createReadStream(filepath)
    };
  }
}

module.exports = new Maintenance();