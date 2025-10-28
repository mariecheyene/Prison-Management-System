const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const QRCode = require('qrcode');
const Papa = require('papaparse');
const bcrypt = require('bcrypt');
require("dotenv").config();
const archiver = require('archiver');
const { Parser } = require('json2csv');
const app = express();
const PORT = process.env.PORT || 5000;

// Create uploads directory if not exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }
});

app.use(express.json());
app.use(cors({
  origin: "http://localhost:3000",
  credentials: true
}));
app.use('/uploads', express.static(uploadDir));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/prison_db', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB'))
.catch((err) => console.error('MongoDB connection error:', err));

// Counter Schema for auto-increment IDs
const counterSchema = new mongoose.Schema({
  _id: String,
  seq: { type: Number, default: 0 }
});
const Counter = mongoose.model('Counter', counterSchema);

// Helper to generate auto-increment IDs
const autoIncrement = async (modelName) => {
  const counter = await Counter.findByIdAndUpdate(
    modelName,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return counter.seq.toString().padStart(3, '0');
};

// Generate QR Code
const generateQRCode = async (data) => {
  try {
    return await QRCode.toDataURL(JSON.stringify(data));
  } catch (err) {
    console.error('QR generation error:', err);
    return null;
  }
};

// Helper function to calculate duration between timeIn and timeOut
const calculateDuration = (timeIn, timeOut) => {
  if (!timeIn || !timeOut) return 'N/A';
  
  try {
    // Parse time strings (format: "HH:MM AM/PM")
    const parseTime = (timeStr) => {
      const [time, period] = timeStr.split(' ');
      const [hours, minutes] = time.split(':');
      let hour = parseInt(hours);
      
      if (period === 'PM' && hour !== 12) hour += 12;
      if (period === 'AM' && hour === 12) hour = 0;
      
      return new Date(0, 0, 0, hour, parseInt(minutes));
    };
    
    const start = parseTime(timeIn);
    const end = parseTime(timeOut);
    const diffMs = end - start;
    
    if (diffMs < 0) return 'Invalid';
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  } catch (error) {
    console.error('Error calculating duration:', error);
    return 'Error';
  }
};

// ======================
// SCHEMAS AND MODELS
// ======================

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role: { 
    type: String, 
    required: true, 
    enum: [
      'FullAdmin', 
      'MaleAdmin', 
      'FemaleAdmin', 
      'FullStaff', 
      'MaleStaff', 
      'FemaleStaff'
    ] 
  },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });
const User = mongoose.model('User', userSchema);

// Crime Schema
const crimeSchema = new mongoose.Schema({
  crime: { type: String, required: true, unique: true },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
}, { timestamps: true });
const Crime = mongoose.model('Crime', crimeSchema);

// Inmate Schema
const inmateSchema = new mongoose.Schema({
  inmateCode: { type: String, required: true, unique: true },
  lastName: { type: String, required: true },
  firstName: { type: String, required: true },
  middleName: String,
  extension: String,
  sex: { type: String, required: true, enum: ['Male', 'Female'] },
  dateOfBirth: { type: Date, required: true },
  address: { type: String, required: true },
  maritalStatus: { 
    type: String, 
    enum: ['Single', 'Married', 'Divorced', 'Widowed', 'Separated', ''] 
  },
  eyeColor: String,
  complexion: String,
  cellId: { type: String, required: true },
  sentence: String,
  dateFrom: Date,
  dateTo: Date,
  crime: { type: String, required: true },
  emergencyName: String,
  emergencyContact: String,
  emergencyRelation: String,
  status: { 
    type: String, 
    enum: ['active', 'inactive', 'released', 'transferred'], 
    default: 'active' 
  },
  frontImage: String,
  backImage: String,
  leftImage: String,
  rightImage: String,
}, { timestamps: true });

inmateSchema.virtual('fullName').get(function() {
  return `${this.lastName}, ${this.firstName} ${this.middleName || ''} ${this.extension || ''}`.trim();
});

const Inmate = mongoose.model('Inmate', inmateSchema);

// Pending Visitor Schema
const pendingVisitorSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  lastName: { type: String, required: true },
  firstName: { type: String, required: true },
  middleName: String,
  extension: String,
  
  // Visitor details
  photo: String,
  dateOfBirth: Date,
  age: Number,
  sex: { type: String, enum: ['Male', 'Female'] },
  address: String,
  contact: String,
  
  // Visitation details
  prisonerId: { type: String, required: true },
  relationship: String,
  
  // Status
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected'], 
    default: 'pending' 
  },
  rejectionReason: String,
  
  // System fields
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

pendingVisitorSchema.virtual('fullName').get(function() {
  return `${this.lastName}, ${this.firstName} ${this.middleName || ''} ${this.extension || ''}`.trim();
});

const PendingVisitor = mongoose.model('PendingVisitor', pendingVisitorSchema);

// Visitor Schema - ENHANCED WITH VISIT HISTORY
const visitorSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  lastName: { type: String, required: true },
  firstName: { type: String, required: true },
  middleName: String,
  extension: String,
  
  // Visitor details
  photo: String,
  dateOfBirth: Date,
  age: Number,
  sex: { type: String, enum: ['Male', 'Female'] },
  address: String,
  contact: String,
  
  // Visitation details
  prisonerId: { type: String, required: true, ref: 'Inmate' },
  relationship: String,
  
  // Time tracking fields (for current session)
  dateVisited: { type: Date, default: null },
  timeIn: { type: String, default: null },
  timeOut: { type: String, default: null },
  hasTimedIn: { type: Boolean, default: false },
  hasTimedOut: { type: Boolean, default: false },
  lastVisitDate: { type: Date, default: null },
  
  // NEW: Daily activity tracker
  lastActiveDate: { type: Date, default: null },


  
  // Timer fields
  timerStart: { type: Date, default: null },
  timerEnd: { type: Date, default: null },
  isTimerActive: { type: Boolean, default: false },
  visitApproved: { type: Boolean, default: false },
  
  // Daily visit tracking
  dailyVisits: [{
    visitDate: { type: Date, required: true },
    timeIn: String,
    timeOut: String,
    hasTimedIn: { type: Boolean, default: false },
    hasTimedOut: { type: Boolean, default: false },
    timerStart: Date,
    timerEnd: Date,
    isTimerActive: { type: Boolean, default: false },
    visitLogId: { type: mongoose.Schema.Types.ObjectId, ref: 'VisitLog' }
  }],
  
  // VISIT HISTORY - COMPLETE TRACKING
  visitHistory: [{
    visitDate: { type: Date, required: true },
    timeIn: { type: String, required: true },
    timeOut: { type: String, required: true },
    duration: String,
    prisonerId: { type: String, required: true },
    prisonerName: String,
    relationship: String,
    visitLogId: { type: mongoose.Schema.Types.ObjectId, ref: 'VisitLog' },
    status: { 
      type: String, 
      enum: ['completed', 'in-progress', 'cancelled'], 
      default: 'completed' 
    },
    createdAt: { type: Date, default: Date.now }
  }],
  
  // Status and violations
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected'], 
    default: 'pending' 
  },
  violationType: String,
  violationDetails: String,
  
  // Ban management fields
  isBanned: { type: Boolean, default: false },
  banReason: String,
  banDuration: String,
  banNotes: String,
  
  // Statistics
  totalVisits: { type: Number, default: 0 },
  lastVisitDuration: String,
  averageVisitDuration: String,
  
  // System fields
  qrCode: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

visitorSchema.virtual('fullName').get(function() {
  return `${this.lastName}, ${this.firstName} ${this.middleName || ''} ${this.extension || ''}`.trim();
});

const Visitor = mongoose.model('Visitor', visitorSchema);

// Pending Guest Schema
const pendingGuestSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  lastName: { type: String, required: true },
  firstName: { type: String, required: true },
  middleName: String,
  extension: String,
  
  // Guest details
  photo: String,
  dateOfBirth: Date,
  age: Number,
  sex: { type: String, enum: ['Male', 'Female'] },
  address: String,
  contact: String,
  
  // Visit details
  visitPurpose: { type: String, required: true },
  
  // Status
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected'], 
    default: 'pending' 
  },
  rejectionReason: String,
  
  // System fields
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

pendingGuestSchema.virtual('fullName').get(function() {
  return `${this.lastName}, ${this.firstName} ${this.middleName || ''} ${this.extension || ''}`.trim();
});

const PendingGuest = mongoose.model('PendingGuest', pendingGuestSchema);

// Guest Schema - ENHANCED WITH VISIT HISTORY
const guestSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  lastName: { type: String, required: true },
  firstName: { type: String, required: true },
  middleName: String,
  extension: String,
  
  // Guest details
  photo: String,
  dateOfBirth: Date,
  age: Number,
  sex: { type: String, enum: ['Male', 'Female'] },
  address: String,
  contact: String,
  
  // Visit details
  visitPurpose: { type: String, required: true },
  dateVisited: { type: Date, default: null },
  timeIn: String,
  timeOut: String,
  hasTimedIn: { type: Boolean, default: false },
  hasTimedOut: { type: Boolean, default: false },
  lastVisitDate: Date,
  
  // NEW: Daily activity tracker
  lastActiveDate: { type: Date, default: null },
  
  // Daily visit tracking
  dailyVisits: [{
    visitDate: { type: Date, required: true },
    timeIn: String,
    timeOut: String,
    hasTimedIn: { type: Boolean, default: false },
    hasTimedOut: { type: Boolean, default: false },
    visitLogId: { type: mongoose.Schema.Types.ObjectId, ref: 'VisitLog' }
  }],
  
  // VISIT HISTORY - COMPLETE TRACKING
  visitHistory: [{
    visitDate: { type: Date, required: true },
    timeIn: { type: String, required: true },
    timeOut: { type: String, required: true },
    duration: String,
    visitPurpose: { type: String, required: true },
    visitLogId: { type: mongoose.Schema.Types.ObjectId, ref: 'VisitLog' },
    status: { 
      type: String, 
      enum: ['completed', 'in-progress', 'cancelled'], 
      default: 'completed' 
    },
    createdAt: { type: Date, default: Date.now }
  }],
  
  // Violation fields
  violationType: String,
  violationDetails: String,
  
  // Ban management fields
  isBanned: { type: Boolean, default: false },
  banReason: String,
  banDuration: String,
  banNotes: String,
  
  // Statistics
  totalVisits: { type: Number, default: 0 },
  lastVisitDuration: String,
  averageVisitDuration: String,
  
  // Approval system
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected', 'completed'], 
    default: 'pending' 
  },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: Date,
  rejectedAt: Date,
  
  // System fields
  qrCode: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });
  
guestSchema.virtual('fullName').get(function() {
  return `${this.lastName}, ${this.firstName} ${this.middleName || ''} ${this.extension || ''}`.trim();
});

const Guest = mongoose.model('Guest', guestSchema);

// Visit Log Schema
const visitLogSchema = new mongoose.Schema({
  personId: { type: String, required: true },
  personName: { type: String, required: true },
  personType: { type: String, required: true, enum: ['visitor', 'guest'] },
  prisonerId: { type: String, default: null },
  inmateName: { type: String, default: null },
  visitDate: { type: Date, required: true },
  timeIn: { type: String, required: true },
  timeOut: { type: String, default: null },
  visitDuration: { type: String, default: null },
  status: { 
    type: String, 
    enum: ['in-progress', 'completed'], 
    default: 'in-progress' 
  },
  isTimerActive: { type: Boolean, default: false },
  timerStart: { type: Date, default: null },
  timerEnd: { type: Date, default: null }
}, { timestamps: true });

const VisitLog = mongoose.model('VisitLog', visitLogSchema);

// ======================
// VISIT HISTORY ENDPOINTS
// ======================

// Get visit history for a person
app.get("/:personType/:id/visit-history", async (req, res) => {
  try {
    const { personType, id } = req.params;
    const { limit = 50, page = 1 } = req.query;
    
    let Model;
    if (personType === 'visitor') {
      Model = Visitor;
    } else if (personType === 'guest') {
      Model = Guest;
    } else {
      return res.status(400).json({ message: "Invalid person type" });
    }

    const person = await Model.findOne({ id: id });
    if (!person) {
      return res.status(404).json({ message: `${personType} not found` });
    }

    const skip = (page - 1) * limit;
    const visitHistory = person.visitHistory
      .sort((a, b) => new Date(b.visitDate) - new Date(a.visitDate))
      .slice(skip, skip + parseInt(limit));

    res.json({
      success: true,
      visitHistory: visitHistory,
      totalVisits: person.visitHistory.length,
      totalPages: Math.ceil(person.visitHistory.length / limit),
      currentPage: parseInt(page),
      person: {
        id: person.id,
        fullName: person.fullName,
        totalVisits: person.totalVisits,
        lastVisitDate: person.lastVisitDate,
        averageVisitDuration: person.averageVisitDuration
      }
    });
  } catch (error) {
    console.error("Error fetching visit history:", error);
    res.status(500).json({ message: "Failed to fetch visit history", error: error.message });
  }
});

// Get visit statistics
app.get("/:personType/:id/visit-stats", async (req, res) => {
  try {
    const { personType, id } = req.params;
    
    let Model;
    if (personType === 'visitor') {
      Model = Visitor;
    } else if (personType === 'guest') {
      Model = Guest;
    } else {
      return res.status(400).json({ message: "Invalid person type" });
    }

    const person = await Model.findOne({ id: id });
    if (!person) {
      return res.status(404).json({ message: `${personType} not found` });
    }

    // Calculate statistics
    const totalVisits = person.visitHistory.length;
    const completedVisits = person.visitHistory.filter(v => v.status === 'completed').length;
    
    // Calculate average duration
    const durations = person.visitHistory
      .filter(v => v.duration && v.duration !== 'N/A' && v.duration !== 'Error')
      .map(v => {
        // Convert duration like "2h 30m" to minutes
        const match = v.duration.match(/(?:(\d+)h)?\s*(?:(\d+)m)?/);
        if (match) {
          const hours = parseInt(match[1] || 0);
          const minutes = parseInt(match[2] || 0);
          return hours * 60 + minutes;
        }
        return 0;
      });
    
    const averageDurationMinutes = durations.length > 0 
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : 0;
    
    const averageDuration = averageDurationMinutes > 0
      ? `${Math.floor(averageDurationMinutes / 60)}h ${averageDurationMinutes % 60}m`
      : 'N/A';

    // Monthly visits
    const monthlyVisits = {};
    person.visitHistory.forEach(visit => {
      const monthYear = new Date(visit.visitDate).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short' 
      });
      monthlyVisits[monthYear] = (monthlyVisits[monthYear] || 0) + 1;
    });

    res.json({
      success: true,
      statistics: {
        totalVisits,
        completedVisits,
        averageVisitDuration: averageDuration,
        lastVisitDate: person.lastVisitDate,
        monthlyVisits: Object.entries(monthlyVisits)
          .map(([month, count]) => ({ month, count }))
          .sort((a, b) => new Date(b.month) - new Date(a.month))
          .slice(0, 12)
      },
      recentVisits: person.visitHistory
        .sort((a, b) => new Date(b.visitDate) - new Date(a.visitDate))
        .slice(0, 5)
    });
  } catch (error) {
    console.error("Error fetching visit statistics:", error);
    res.status(500).json({ message: "Failed to fetch visit statistics", error: error.message });
  }
});

// ======================
// SCAN PROCESSING ENDPOINTS - ENHANCED WITH VISIT HISTORY
// ======================

// SCAN PROCESSING - FIXED VERSION
app.post("/scan-process", async (req, res) => {
  try {
    const { qrData, personId, isGuest } = req.body;
    
    console.log('🔍 SCAN PROCESS STARTED:', { personId, isGuest });

    if (!personId) {
      return res.status(400).json({ message: "Person ID is required" });
    }

    let person;
    if (isGuest) {
      person = await Guest.findOne({ id: personId });
    } else {
      person = await Visitor.findOne({ id: personId });
    }

    if (!person) {
      return res.status(404).json({ message: "Person not found" });
    }

    const today = new Date();
    const todayDateString = today.toISOString().split('T')[0];
    const now = new Date();

    console.log('=== DEBUG INFORMATION ===');
    console.log('📅 SERVER TIME:', {
      currentTime: now.toString(),
      todayDateString: todayDateString,
      todayISO: today.toISOString(),
      serverTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    });
    
    console.log('👤 PERSON DATA (BEFORE ANY CHANGES):', {
      id: person.id,
      name: person.fullName,
      hasTimedIn: person.hasTimedIn,
      hasTimedOut: person.hasTimedOut,
      timeIn: person.timeIn,
      timeOut: person.timeOut,
      dateVisited: person.dateVisited,
      lastVisitDate: person.lastVisitDate,
      lastActiveDate: person.lastActiveDate
    });

    // Convert dates to strings for comparison (USE ORIGINAL VALUES)
    const lastActiveDate = person.lastActiveDate ? new Date(person.lastActiveDate) : null;
    const lastActiveDateString = lastActiveDate ? lastActiveDate.toISOString().split('T')[0] : 'NO LAST ACTIVE DATE';
    
    const lastVisitDate = person.lastVisitDate ? new Date(person.lastVisitDate) : null;
    const lastVisitDateString = lastVisitDate ? lastVisitDate.toISOString().split('T')[0] : 'NO LAST VISIT DATE';
    
    const dateVisited = person.dateVisited ? new Date(person.dateVisited) : null;
    const dateVisitedString = dateVisited ? dateVisited.toISOString().split('T')[0] : 'NO DATE VISITED';

    console.log('📊 DATE COMPARISONS (ORIGINAL DATA):', {
      today: todayDateString,
      lastActiveDate: lastActiveDateString,
      lastVisitDate: lastVisitDateString,
      dateVisited: dateVisitedString,
      isSameDayAsLastActive: lastActiveDateString === todayDateString,
      isSameDayAsLastVisit: lastVisitDateString === todayDateString,
      isSameDayAsDateVisited: dateVisitedString === todayDateString
    });

    // STEP 1: Check if we need to reset for new day (USE ORIGINAL lastActiveDate)
    let shouldAutoReset = false;
    
    if (lastActiveDateString !== 'NO LAST ACTIVE DATE' && lastActiveDateString !== todayDateString) {
      console.log('🔄 NEW DAY DETECTED via lastActiveDate');
      shouldAutoReset = true;
    } else if (lastActiveDateString === 'NO LAST ACTIVE DATE') {
      console.log('ℹ️ No lastActiveDate found - first time scan?');
      shouldAutoReset = true; // Reset if no lastActiveDate exists
    } else {
      console.log('ℹ️ Same day as lastActiveDate - no reset needed');
    }

    console.log('🔄 AUTO-RESET DECISION:', { shouldAutoReset });

    // STEP 2: AUTO-RESET for new day
    if (shouldAutoReset) {
      console.log('🔄 PERFORMING AUTO-RESET FOR NEW DAY');
      
      const resetData = {
        hasTimedIn: false,
        hasTimedOut: false,
        timeIn: null,
        timeOut: null,
        dateVisited: null,
        dailyVisits: []
      };

      if (isGuest) {
        resetData.status = 'approved';
      } else {
        resetData.isTimerActive = false;
        resetData.timerStart = null;
        resetData.timerEnd = null;
        resetData.visitApproved = false;
      }

      console.log('📝 RESET DATA:', resetData);

      if (isGuest) {
        await Guest.findOneAndUpdate(
          { id: personId },
          { $set: resetData }
        );
      } else {
        await Visitor.findOneAndUpdate(
          { id: personId },
          { $set: resetData }
        );
      }

      // Refresh person data after reset
      if (isGuest) {
        person = await Guest.findOne({ id: personId });
      } else {
        person = await Visitor.findOne({ id: personId });
      }

      console.log('✅ AFTER RESET - PERSON DATA:', {
        hasTimedIn: person.hasTimedIn,
        hasTimedOut: person.hasTimedOut,
        timeIn: person.timeIn,
        timeOut: person.timeOut
      });
    }

    // STEP 3: Check current status (AFTER potential reset)
    let canTimeIn = true;
    let message = "";

    if (person.hasTimedOut) {
      canTimeIn = false;
      message = "✅ Visit already completed today";
    } else if (person.hasTimedIn && !person.hasTimedOut) {
      canTimeIn = false;
      message = "🕒 Active visit found - ready for time out";
    } else {
      canTimeIn = true;
      message = shouldAutoReset ? "🕒 New day - time in allowed" : "🕒 Ready for time in";
    }

    console.log('🎯 FINAL DECISION:', {
      canTimeIn: canTimeIn,
      message: message,
      hasTimedIn: person.hasTimedIn,
      hasTimedOut: person.hasTimedOut
    });

    let scanType, canProceed, requiresApproval;

    if (canTimeIn && !person.hasTimedIn) {
      scanType = 'time_in_pending';
      canProceed = true;
      requiresApproval = true;
    } else if (person.hasTimedIn && !person.hasTimedOut) {
      scanType = 'time_out_pending';
      canProceed = true;
      requiresApproval = true;
    } else {
      scanType = 'completed';
      canProceed = false;
      requiresApproval = false;
    }


    const scanResult = {
      person: {
        ...person.toObject(),
        fullName: person.fullName
      },
      scanType: scanType,
      message: message,
      canProceed: canProceed,
      requiresApproval: requiresApproval,
      resetPerformed: shouldAutoReset
    };

    console.log('🎉 FINAL SCAN RESULT:', scanType);
    console.log('=== DEBUG END ===\n');
    res.json(scanResult);

  } catch (error) {
    console.error('❌ Scan process error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});
    
// APPROVE VISITOR TIME IN - FIXED
app.put("/visitors/:id/approve-time-in", async (req, res) => {
  try {
    const visitor = await Visitor.findOne({ id: req.params.id });
    if (!visitor) return res.status(404).json({ message: "Visitor not found" });

    const today = new Date();
    const todayDateString = today.toISOString().split('T')[0];
    const currentTime = new Date().toLocaleTimeString('en-US', { 
      hour12: true,
      hour: '2-digit',
      minute: '2-digit'
    });

    // Check if already timed in today
    const alreadyTimedIn = visitor.dailyVisits.some(visit => {
      if (!visit.visitDate) return false;
      const visitDate = new Date(visit.visitDate).toISOString().split('T')[0];
      return visitDate === todayDateString && visit.hasTimedIn && !visit.hasTimedOut;
    });

    if (alreadyTimedIn) {
      return res.status(400).json({ message: "Visitor already timed in today" });
    }

    // Create timer (3 hours)
    const timerStart = new Date();
    const timerEnd = new Date(timerStart.getTime() + (3 * 60 * 60 * 1000));

    // Get inmate name
    let inmateName = 'Unknown Inmate';
    try {
      const inmate = await Inmate.findOne({ inmateCode: visitor.prisonerId });
      if (inmate) inmateName = inmate.fullName;
    } catch (inmateError) {
      console.warn('Could not fetch inmate details:', inmateError);
    }

    // CREATE VISIT LOG
    const visitLog = new VisitLog({
      personId: visitor.id,
      personName: visitor.fullName,
      personType: 'visitor',
      prisonerId: visitor.prisonerId,
      inmateName: inmateName,
      visitDate: today,
      timeIn: currentTime,
      timerStart: timerStart,
      timerEnd: timerEnd,
      isTimerActive: true,
      status: 'in-progress'
    });

    await visitLog.save();

    // Create new daily visit
    const newVisit = {
      visitDate: today,
      timeIn: currentTime,
      timeOut: null,
      hasTimedIn: true,
      hasTimedOut: false,
      timerStart: timerStart,
      timerEnd: timerEnd,
      isTimerActive: true,
      visitLogId: visitLog._id
    };

    // Update visitor - REMOVED lastVisitDate from time-in!
    const updatedVisitor = await Visitor.findOneAndUpdate(
      { id: req.params.id },
      {
        $set: {
          hasTimedIn: true,
          hasTimedOut: false,
          timeIn: currentTime,
          timeOut: null,
          isTimerActive: true,
          timerStart: timerStart,
          timerEnd: timerEnd,
          dateVisited: today,        // Keep current visit date
          lastActiveDate: today      // Keep for daily tracking
          // REMOVED: lastVisitDate: today ← Don't set here!
        },
        $push: { dailyVisits: newVisit }
      },
      { new: true }
    );

    const visitorWithFullName = {
      ...updatedVisitor.toObject(),
      fullName: updatedVisitor.fullName
    };

    res.json({ 
      message: "Time in approved and timer started",
      visitor: visitorWithFullName,
      visitLog: visitLog
    });

  } catch (error) {
    console.error("Error approving time in:", error);
    res.status(500).json({ message: "Failed to approve time in", error: error.message });
  }
});

// APPROVE VISITOR TIME OUT - ENHANCED WITH VISIT HISTORY
app.put("/visitors/:id/approve-time-out", async (req, res) => {
  try {
    const visitor = await Visitor.findOne({ id: req.params.id });
    if (!visitor) return res.status(404).json({ message: "Visitor not found" });

    const currentTime = new Date().toLocaleTimeString('en-US', { 
      hour12: true,
      hour: '2-digit',
      minute: '2-digit'
    });
    const today = new Date();

    // SIMPLE CHECK
    if (!visitor.hasTimedIn || visitor.hasTimedOut) {
      return res.status(400).json({ message: "Visitor has not timed in or already timed out" });
    }

    // UPDATE VISIT LOG
    const activeVisitLog = await VisitLog.findOne({
      personId: visitor.id,
      personType: 'visitor',
      timeOut: null,
      status: 'in-progress'
    });

    let visitDuration = 'N/A';
    if (activeVisitLog) {
      visitDuration = calculateDuration(visitor.timeIn, currentTime);
      await VisitLog.findByIdAndUpdate(
        activeVisitLog._id,
        {
          timeOut: currentTime,
          visitDuration: visitDuration,
          isTimerActive: false,
          status: 'completed'
        }
      );
    }

    // Get inmate name for history
    let inmateName = 'Unknown Inmate';
    try {
      const inmate = await Inmate.findOne({ inmateCode: visitor.prisonerId });
      if (inmate) inmateName = inmate.fullName;
    } catch (inmateError) {
      console.warn('Could not fetch inmate details:', inmateError);
    }

    // ADD TO VISIT HISTORY
    const visitHistoryEntry = {
      visitDate: today,
      timeIn: visitor.timeIn,
      timeOut: currentTime,
      duration: visitDuration,
      prisonerId: visitor.prisonerId,
      prisonerName: inmateName,
      relationship: visitor.relationship,
      visitLogId: activeVisitLog?._id,
      status: 'completed'
    };

    // UPDATE VISITOR - Add to history and update statistics
    const updatedVisitor = await Visitor.findOneAndUpdate(
  { id: req.params.id },
  {
    $set: {
      hasTimedOut: true,
      timeOut: currentTime,
      isTimerActive: false,
      lastVisitDate: today,
      lastVisitDuration: visitDuration,
      lastActiveDate: today // ✅ ADD THIS LINE
    },
    $push: { visitHistory: visitHistoryEntry },
    $inc: { totalVisits: 1 }
  },
  { new: true }
);

    // Calculate average duration
    if (updatedVisitor.visitHistory && updatedVisitor.visitHistory.length > 0) {
      const durations = updatedVisitor.visitHistory
        .filter(v => v.duration && v.duration !== 'N/A' && v.duration !== 'Error')
        .map(v => {
          const match = v.duration.match(/(?:(\d+)h)?\s*(?:(\d+)m)?/);
          if (match) {
            const hours = parseInt(match[1] || 0);
            const minutes = parseInt(match[2] || 0);
            return hours * 60 + minutes;
          }
          return 0;
        });
      
      if (durations.length > 0) {
        const averageMinutes = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
        const averageDuration = `${Math.floor(averageMinutes / 60)}h ${averageMinutes % 60}m`;
        
        await Visitor.findOneAndUpdate(
          { id: req.params.id },
          { $set: { averageVisitDuration: averageDuration } }
        );
      }
    }

    const finalVisitor = await Visitor.findOne({ id: req.params.id });
    const visitorWithFullName = {
      ...finalVisitor.toObject(),
      fullName: finalVisitor.fullName
    };

    res.json({ 
      message: "Time out approved and visit completed",
      visitor: visitorWithFullName,
      visitHistory: visitHistoryEntry
    });

  } catch (error) {
    console.error("Error approving time out:", error);
    res.status(500).json({ message: "Failed to approve time out", error: error.message });
  }
});

// APPROVE GUEST TIME IN - FIXED
app.put("/guests/:id/approve-time-in", async (req, res) => {
  try {
    console.log('🔄 GUEST TIME-IN STARTED:', req.params.id);
    
    const guest = await Guest.findOne({ id: req.params.id });
    if (!guest) {
      return res.status(404).json({ message: "Guest not found" });
    }

    const today = new Date();
    const todayDateString = today.toISOString().split('T')[0];
    const currentTime = new Date().toLocaleTimeString('en-US', { 
      hour12: true,
      hour: '2-digit',
      minute: '2-digit'
    });

    console.log('⏰ Time in at:', currentTime, 'Date:', todayDateString);

    // Check if already timed in today
    const alreadyTimedIn = guest.dailyVisits.some(visit => {
      if (!visit.visitDate) return false;
      const visitDate = new Date(visit.visitDate).toISOString().split('T')[0];
      return visitDate === todayDateString && visit.hasTimedIn && !visit.hasTimedOut;
    });

    if (alreadyTimedIn) {
      return res.status(400).json({ message: "Guest already timed in today" });
    }

    // CREATE VISIT LOG
    const visitLog = new VisitLog({
      personId: guest.id,
      personName: guest.fullName,
      personType: 'guest',
      visitDate: today,
      timeIn: currentTime,
      status: 'in-progress'
    });

    await visitLog.save();
    console.log('✅ Visit log created:', visitLog._id);

    // CREATE NEW DAILY VISIT OBJECT
    const newVisit = {
      visitDate: today,
      timeIn: currentTime,
      timeOut: null,
      hasTimedIn: true,
      hasTimedOut: false,
      visitLogId: visitLog._id
    };

    // UPDATE GUEST
    await Guest.findOneAndUpdate(
      { id: req.params.id },
      {
        $pull: {
          dailyVisits: {
            visitDate: {
              $gte: new Date(todayDateString + 'T00:00:00.000Z'),
              $lt: new Date(todayDateString + 'T23:59:59.999Z')
            }
          }
        }
      }
    );

    const updatedGuest = await Guest.findOneAndUpdate(
      { id: req.params.id },
      {
        $set: {
          hasTimedIn: true,
          hasTimedOut: false,
          timeIn: currentTime,
          timeOut: null,
          dateVisited: today,        // Keep current visit date
          lastActiveDate: today,     // Keep for daily tracking
          status: 'approved'
          // REMOVED: lastVisitDate: today ← Don't set here!
        },
        $push: { 
          dailyVisits: newVisit 
        }
      },
      { new: true }
    );

    console.log('✅ Guest updated successfully');

    const guestWithFullName = {
      ...updatedGuest.toObject(),
      fullName: updatedGuest.fullName
    };

    res.json({ 
      message: "Guest time in approved successfully",
      guest: guestWithFullName,
      visitLog: visitLog
    });

  } catch (error) {
    console.error("❌ GUEST TIME-IN ERROR:", error);
    res.status(500).json({ 
      message: "Failed to approve time in", 
      error: error.message,
      stack: error.stack
    });
  }
});

// APPROVE GUEST TIME OUT - ENHANCED WITH VISIT HISTORY
app.put("/guests/:id/approve-time-out", async (req, res) => {
  try {
    console.log('🔄 GUEST TIME-OUT STARTED:', req.params.id);
    
    const guest = await Guest.findOne({ id: req.params.id });
    if (!guest) {
      return res.status(404).json({ message: "Guest not found" });
    }

    const currentTime = new Date().toLocaleTimeString('en-US', { 
      hour12: true,
      hour: '2-digit',
      minute: '2-digit'
    });
    const today = new Date();

    console.log('⏰ Time out at:', currentTime);

    // SIMPLE CHECK: Use main fields
    if (!guest.hasTimedIn || guest.hasTimedOut) {
      return res.status(400).json({ message: "Guest has not timed in or already timed out" });
    }

    // FIND ACTIVE VISIT LOG
    const activeVisitLog = await VisitLog.findOne({
      personId: guest.id,
      personType: 'guest', 
      timeOut: null,
      status: 'in-progress'
    });

    let visitDuration = 'N/A';
    if (activeVisitLog) {
      visitDuration = calculateDuration(guest.timeIn, currentTime);
      await VisitLog.findByIdAndUpdate(
        activeVisitLog._id,
        {
          timeOut: currentTime,
          visitDuration: visitDuration,
          status: 'completed'
        }
      );
      console.log('✅ Visit log updated');
    }

    // ADD TO VISIT HISTORY
    const visitHistoryEntry = {
      visitDate: today,
      timeIn: guest.timeIn,
      timeOut: currentTime,
      duration: visitDuration,
      visitPurpose: guest.visitPurpose,
      visitLogId: activeVisitLog?._id,
      status: 'completed'
    };

    // UPDATE GUEST - Add to history and update statistics
    const updatedGuest = await Guest.findOneAndUpdate(
  { id: req.params.id },
  {
    $set: {
      hasTimedOut: true,
      timeOut: currentTime,
      status: 'completed',
      lastVisitDate: today,
      lastVisitDuration: visitDuration,
      lastActiveDate: today // ✅ ADD THIS LINE
    },
    $push: { visitHistory: visitHistoryEntry },
    $inc: { totalVisits: 1 }
  },
  { new: true }
);

    // Calculate average duration
    if (updatedGuest.visitHistory && updatedGuest.visitHistory.length > 0) {
      const durations = updatedGuest.visitHistory
        .filter(v => v.duration && v.duration !== 'N/A' && v.duration !== 'Error')
        .map(v => {
          const match = v.duration.match(/(?:(\d+)h)?\s*(?:(\d+)m)?/);
          if (match) {
            const hours = parseInt(match[1] || 0);
            const minutes = parseInt(match[2] || 0);
            return hours * 60 + minutes;
          }
          return 0;
        });
      
      if (durations.length > 0) {
        const averageMinutes = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
        const averageDuration = `${Math.floor(averageMinutes / 60)}h ${averageMinutes % 60}m`;
        
        await Guest.findOneAndUpdate(
          { id: req.params.id },
          { $set: { averageVisitDuration: averageDuration } }
        );
      }
    }

    const finalGuest = await Guest.findOne({ id: req.params.id });
    console.log('✅ Guest time out completed');

    const guestWithFullName = {
      ...finalGuest.toObject(),
      fullName: finalGuest.fullName
    };

    res.json({ 
      message: "Guest time out approved successfully",
      guest: guestWithFullName,
      visitHistory: visitHistoryEntry
    });

  } catch (error) {
    console.error("❌ GUEST TIME-OUT ERROR:", error);
    res.status(500).json({ 
      message: "Failed to approve time out", 
      error: error.message 
    });
  }
});

// ======================
// VIOLATION & BAN MANAGEMENT ENDPOINTS
// ======================

// Add violation to visitor
app.put("/visitors/:id/violation", async (req, res) => {
  try {
    const { violationType, violationDetails } = req.body;
    
    const updatedVisitor = await Visitor.findOneAndUpdate(
      { id: req.params.id },
      { 
        violationType,
        violationDetails,
        status: 'approved'
      },
      { new: true }
    );

    if (!updatedVisitor) {
      return res.status(404).json({ message: "Visitor not found" });
    }

    res.json({ 
      message: "Violation added to visitor",
      visitor: updatedVisitor
    });
  } catch (error) {
    console.error("Error adding violation to visitor:", error);
    res.status(500).json({ message: "Failed to add violation", error: error.message });
  }
});

// Add violation to guest
app.put("/guests/:id/violation", async (req, res) => {
  try {
    const { violationType, violationDetails } = req.body;
    
    const updatedGuest = await Guest.findOneAndUpdate(
      { id: req.params.id },
      { 
        violationType,
        violationDetails,
        status: 'approved'
      },
      { new: true }
    );

    if (!updatedGuest) {
      return res.status(404).json({ message: "Guest not found" });
    }

    res.json({ 
      message: "Violation added to guest",
      guest: updatedGuest
    });
  } catch (error) {
    console.error("Error adding violation to guest:", error);
    res.status(500).json({ message: "Failed to add violation", error: error.message });
  }
});

// Remove violation from visitor
app.put("/visitors/:id/remove-violation", async (req, res) => {
  try {
    const updatedVisitor = await Visitor.findOneAndUpdate(
      { id: req.params.id },
      { 
        violationType: null,
        violationDetails: null
      },
      { new: true }
    );

    if (!updatedVisitor) {
      return res.status(404).json({ message: "Visitor not found" });
    }

    res.json({ 
      message: "Violation removed from visitor",
      visitor: updatedVisitor
    });
  } catch (error) {
    console.error("Error removing violation from visitor:", error);
    res.status(500).json({ message: "Failed to remove violation", error: error.message });
  }
});

// Remove violation from guest
app.put("/guests/:id/remove-violation", async (req, res) => {
  try {
    const updatedGuest = await Guest.findOneAndUpdate(
      { id: req.params.id },
      { 
        violationType: null,
        violationDetails: null
      },
      { new: true }
    );

    if (!updatedGuest) {
      return res.status(404).json({ message: "Guest not found" });
    }

    res.json({ 
      message: "Violation removed from guest",
      guest: updatedGuest
    });
  } catch (error) {
    console.error("Error removing violation from guest:", error);
    res.status(500).json({ message: "Failed to remove violation", error: error.message });
  }
});

// Ban visitor
app.put("/visitors/:id/ban", async (req, res) => {
  try {
    const { reason, duration, notes, isBanned = true } = req.body;
    
    const updatedVisitor = await Visitor.findOneAndUpdate(
      { id: req.params.id },
      { 
        isBanned,
        banReason: reason,
        banDuration: duration,
        banNotes: notes,
        violationType: 'Ban',
        violationDetails: reason || 'Banned by administrator'
      },
      { new: true }
    );

    if (!updatedVisitor) {
      return res.status(404).json({ message: "Visitor not found" });
    }

    res.json({ 
      message: "Visitor banned successfully",
      visitor: updatedVisitor
    });
  } catch (error) {
    console.error("Error banning visitor:", error);
    res.status(500).json({ message: "Failed to ban visitor", error: error.message });
  }
});

// Ban guest
app.put("/guests/:id/ban", async (req, res) => {
  try {
    const { reason, duration, notes, isBanned = true } = req.body;
    
    const updatedGuest = await Guest.findOneAndUpdate(
      { id: req.params.id },
      { 
        isBanned,
        banReason: reason,
        banDuration: duration,
        banNotes: notes,
        violationType: 'Ban',
        violationDetails: reason || 'Banned by administrator'
      },
      { new: true }
    );

    if (!updatedGuest) {
      return res.status(404).json({ message: "Guest not found" });
    }

    res.json({ 
      message: "Guest banned successfully",
      guest: updatedGuest
    });
  } catch (error) {
    console.error("Error banning guest:", error);
    res.status(500).json({ message: "Failed to ban guest", error: error.message });
  }
});

// Remove ban from visitor
app.put("/visitors/:id/remove-ban", async (req, res) => {
  try {
    const updatedVisitor = await Visitor.findOneAndUpdate(
      { id: req.params.id },
      { 
        isBanned: false,
        banReason: null,
        banDuration: null,
        banNotes: null
      },
      { new: true }
    );

    if (!updatedVisitor) {
      return res.status(404).json({ message: "Visitor not found" });
    }

    res.json({ 
      message: "Ban removed from visitor",
      visitor: updatedVisitor
    });
  } catch (error) {
    console.error("Error removing ban from visitor:", error);
    res.status(500).json({ message: "Failed to remove ban", error: error.message });
  }
});

// Remove ban from guest
app.put("/guests/:id/remove-ban", async (req, res) => {
  try {
    const updatedGuest = await Guest.findOneAndUpdate(
      { id: req.params.id },
      { 
        isBanned: false,
        banReason: null,
        banDuration: null,
        banNotes: null
      },
      { new: true }
    );

    if (!updatedGuest) {
      return res.status(404).json({ message: "Guest not found" });
    }

    res.json({ 
      message: "Ban removed from guest",
      guest: updatedGuest
    });
  } catch (error) {
    console.error("Error removing ban from guest:", error);
    res.status(500).json({ message: "Failed to remove ban", error: error.message });
  }
});

// ======================
// RESET ENDPOINTS (FOR TESTING ONLY)
// ======================

// RESET PERSON - FOR TESTING
app.put("/reset-person/:personId", async (req, res) => {
  try {
    const { personId } = req.params;
    const { personType } = req.body;

    if (!personType) {
      return res.status(400).json({ message: "Person type is required" });
    }

    let person;
    if (personType === 'visitor') {
      person = await Visitor.findOne({ id: personId });
    } else if (personType === 'guest') {
      person = await Guest.findOne({ id: personId });
    } else {
      return res.status(400).json({ message: "Invalid person type" });
    }

    if (!person) {
      return res.status(404).json({ message: "Person not found" });
    }

    // Reset all time fields but preserve visit history
    const updateData = {
      hasTimedIn: false,
      hasTimedOut: false,
      timeIn: null,
      timeOut: null,
      isTimerActive: false,
      timerStart: null,
      timerEnd: null,
      // Preserve lastVisitDate and dateVisited for historical tracking
      lastVisitDate: person.lastVisitDate,
      dateVisited: person.dateVisited,
      dailyVisits: []
    };

    let updatedPerson;
    if (personType === 'visitor') {
      updatedPerson = await Visitor.findOneAndUpdate(
        { id: personId },
        updateData,
        { new: true }
      );
    } else {
      updateData.status = 'approved';
      updatedPerson = await Guest.findOneAndUpdate(
        { id: personId },
        updateData,
        { new: true }
      );
    }

    res.json({ 
      message: `Person has been reset and can start fresh. Visit history preserved.`,
      person: updatedPerson
    });

  } catch (error) {
    console.error("Error resetting person:", error);
    res.status(500).json({ 
      message: "Failed to reset person", 
      error: error.message 
    });
  }
});

// MANUAL RESET FOR TESTING - Clears time records for a person but preserves history
app.put("/reset-person-time/:personId", async (req, res) => {
  try {
    const { personId } = req.params;
    const { personType } = req.body;

    console.log('🔄 MANUAL TIME RESET:', { personId, personType });

    if (!personType) {
      return res.status(400).json({ message: "Person type is required" });
    }

    let person;
    if (personType === 'visitor') {
      person = await Visitor.findOne({ id: personId });
    } else if (personType === 'guest') {
      person = await Guest.findOne({ id: personId });
    } else {
      return res.status(400).json({ message: "Invalid person type" });
    }

    if (!person) {
      return res.status(404).json({ message: "Person not found" });
    }

    // Reset all time fields but preserve visit history and last visit dates
    const updateData = {
      hasTimedIn: false,
      hasTimedOut: false,
      timeIn: null,
      timeOut: null,
      dailyVisits: []
    };

    // Add visitor-specific fields
    if (personType === 'visitor') {
      updateData.isTimerActive = false;
      updateData.timerStart = null;
      updateData.timerEnd = null;
      updateData.visitApproved = false;
    }

    // Add guest-specific fields
    if (personType === 'guest') {
      updateData.status = 'approved';
    }

    let updatedPerson;
    if (personType === 'visitor') {
      updatedPerson = await Visitor.findOneAndUpdate(
        { id: personId },
        updateData,
        { new: true }
      );
    } else {
      updatedPerson = await Guest.findOneAndUpdate(
        { id: personId },
        updateData,
        { new: true }
      );
    }

    // Also clear any active visit logs
    await VisitLog.updateMany(
      { 
        personId: personId, 
        timeOut: null 
      },
      {
        timeOut: new Date().toLocaleTimeString('en-US', { 
          hour12: true,
          hour: '2-digit',
          minute: '2-digit'
        }),
        status: 'completed'
      }
    );

    res.json({ 
      message: `Time records reset for ${updatedPerson.fullName}. Visit history preserved. They can now scan again.`,
      success: true,
      person: updatedPerson
    });

  } catch (error) {
    console.error("❌ Manual reset error:", error);
    res.status(500).json({ 
      message: "Failed to reset time records", 
      error: error.message 
    });
  }
});

// ======================
// VISIT LOG ENDPOINTS
// ======================

// Get all visit logs with filtering
app.get("/visit-logs", async (req, res) => {
  try {
    const { startDate, endDate, personType, personId } = req.query;
    
    let filter = {};
    
    if (startDate && endDate) {
      filter.visitDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate + 'T23:59:59.999Z')
      };
    }
    
    if (personType) filter.personType = personType;
    if (personId) filter.personId = personId;

    const visitLogs = await VisitLog.find(filter).sort({ visitDate: -1, timeIn: -1 });
    res.json(visitLogs);
  } catch (error) {
    console.error("Error fetching visit logs:", error);
    res.status(500).json({ message: "Failed to fetch visit logs", error: error.message });
  }
});

// Get active visitor timers for dashboard
app.get("/visit-logs/active-visitor-timers", async (req, res) => {
  try {
    const activeVisitLogs = await VisitLog.find({
      personType: 'visitor',
      isTimerActive: true,
      timerEnd: { $gt: new Date() },
      status: 'in-progress',
      timeOut: null
    });

    const activeTimersWithDetails = await Promise.all(
      activeVisitLogs.map(async (log) => {
        const timeRemaining = Math.max(0, new Date(log.timerEnd) - new Date());
        const timeRemainingMinutes = Math.floor(timeRemaining / (1000 * 60));
        
        return {
          ...log.toObject(),
          fullName: log.personName,
          timeRemaining: timeRemaining,
          timeRemainingMinutes: timeRemainingMinutes,
          prisonerId: log.prisonerId,
          inmateName: log.inmateName,
          timeIn: log.timeIn
        };
      })
    );

    const sortedTimers = activeTimersWithDetails.sort((a, b) => a.timeRemainingMinutes - b.timeRemainingMinutes);
    res.json(sortedTimers);
  } catch (error) {
    console.error("Error fetching active visitor timers:", error);
    res.status(500).json({ 
      message: "Failed to fetch active visitor timers", 
      error: error.message 
    });
  }
});

// Delete visit log
app.delete("/visit-logs/:id", async (req, res) => {
  try {
    const deletedLog = await VisitLog.findByIdAndDelete(req.params.id);
    
    if (!deletedLog) {
      return res.status(404).json({ message: "Visit log not found" });
    }
    
    res.json({ message: "Visit log deleted successfully" });
  } catch (error) {
    console.error("Error deleting visit log:", error);
    res.status(500).json({ message: "Failed to delete visit log", error: error.message });
  }
});

// ======================
// USER ENDPOINTS - FULL CRUD
// ======================

// CREATE USER
app.post("/users", async (req, res) => {
  const { name, email, password, role } = req.body;
  
  if (!name || !email || !password || !role) {
    return res.status(400).json({ 
      message: "All fields are required: name, email, password, role" 
    });
  }

  const validRoles = ['FullAdmin', 'MaleAdmin', 'FemaleAdmin', 'FullStaff', 'MaleStaff', 'FemaleStaff'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ 
      message: `Invalid role. Must be one of: ${validRoles.join(', ')}` 
    });
  }

  try {
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ 
        message: "User with this email already exists" 
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role: role
    });

    await user.save();
    
    const userResponse = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt
    };
    
    res.status(201).json({ 
      message: "User created successfully", 
      user: userResponse 
    });
  } catch (error) {
    console.error("User creation error:", error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        message: "Validation error", 
        error: error.message 
      });
    }
    
    if (error.code === 11000) {
      return res.status(409).json({ 
        message: "Email already exists" 
      });
    }
    
    res.status(500).json({ 
      message: "Failed to create user", 
      error: error.message 
    });
  }
});

// GET ALL USERS
app.get("/users", async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ 
      message: "Failed to fetch users", 
      error: error.message 
    });
  }
});

// GET SINGLE USER
app.get("/users/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ 
      message: "Failed to fetch user", 
      error: error.message 
    });
  }
});

// UPDATE USER
app.put("/users/:id", async (req, res) => {
  try {
    const { name, email, role, password, isActive } = req.body;
    
    const updateData = { name, email, role, isActive };
    
    if (password && password.trim() !== '') {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ 
      message: "User updated successfully", 
      user: updatedUser 
    });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ 
      message: "Failed to update user", 
      error: error.message 
    });
  }
});

// DELETE USER
app.delete("/users/:id", async (req, res) => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.params.id);
    if (!deletedUser) {
      return res.status(404).json({ message: "User not found" });
    }
    
    res.json({ 
      message: "User deleted successfully",
      user: {
        name: deletedUser.name,
        email: deletedUser.email,
        role: deletedUser.role
      }
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ 
      message: "Failed to delete user", 
      error: error.message 
    });
  }
});

// LOGIN
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  
  try {
    const user = await User.findOne({ 
      email: email.toLowerCase(),
      isActive: true 
    });
    
    if (!user) {
      return res.status(400).json({ message: "User not found or inactive" });
    }
    
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: "Invalid credentials" });
    }
    
    const userResponse = {
      _id: user._id,
      email: user.email, 
      role: user.role,
      name: user.name,
      isActive: user.isActive
    };
    
    res.json({ 
      user: userResponse 
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ 
      message: "Login failed", 
      error: error.message 
    });
  }
});

// ======================
// CRIME ENDPOINTS - FULL CRUD
// ======================

// CREATE CRIME
app.post("/crimes", async (req, res) => {
  try {
    const { crime, status = 'active' } = req.body;
    
    if (!crime || !crime.trim()) {
      return res.status(400).json({ message: "Crime name is required" });
    }

    const existingCrime = await Crime.findOne({ 
      crime: { $regex: new RegExp(`^${crime.trim()}$`, 'i') } 
    });
    
    if (existingCrime) {
      return res.status(409).json({ message: "Crime already exists" });
    }

    const newCrime = new Crime({ 
      crime: crime.trim(), 
      status 
    });
    
    await newCrime.save();
    
    res.status(201).json({ 
      message: "Crime created successfully", 
      crime: newCrime 
    });
  } catch (error) {
    console.error("Crime creation error:", error);
    if (error.code === 11000) {
      return res.status(409).json({ message: "Crime already exists" });
    }
    res.status(500).json({ 
      message: "Failed to create crime", 
      error: error.message 
    });
  }
});

// GET ALL CRIMES
app.get("/crimes", async (req, res) => {
  try {
    const crimes = await Crime.find().sort({ createdAt: -1 });
    res.json(crimes);
  } catch (error) {
    console.error("Error fetching crimes:", error);
    res.status(500).json({ 
      message: "Failed to fetch crimes", 
      error: error.message 
    });
  }
});

// GET SINGLE CRIME
app.get("/crimes/:id", async (req, res) => {
  try {
    const crime = await Crime.findById(req.params.id);
    if (!crime) {
      return res.status(404).json({ message: "Crime not found" });
    }
    res.json(crime);
  } catch (error) {
    console.error("Error fetching crime:", error);
    res.status(500).json({ 
      message: "Failed to fetch crime", 
      error: error.message 
    });
  }
});

// UPDATE CRIME
app.put("/crimes/:id", async (req, res) => {
  try {
    const { crime, status } = req.body;
    
    const updatedCrime = await Crime.findByIdAndUpdate(
      req.params.id,
      { crime, status },
      { new: true, runValidators: true }
    );
    
    if (!updatedCrime) {
      return res.status(404).json({ message: "Crime not found" });
    }
    
    res.json({ 
      message: "Crime updated successfully",
      crime: updatedCrime 
    });
  } catch (error) {
    console.error("Error updating crime:", error);
    res.status(500).json({ 
      message: "Failed to update crime", 
      error: error.message 
    });
  }
});

// DELETE CRIME
app.delete("/crimes/:id", async (req, res) => {
  try {
    const deletedCrime = await Crime.findByIdAndDelete(req.params.id);
    
    if (!deletedCrime) {
      return res.status(404).json({ message: "Crime not found" });
    }
    
    res.json({ 
      message: "Crime deleted successfully", 
      crime: deletedCrime 
    });
  } catch (error) {
    console.error("Error deleting crime:", error);
    res.status(500).json({ 
      message: "Failed to delete crime", 
      error: error.message 
    });
  }
});

// ======================
// INMATE ENDPOINTS - FULL CRUD
// ======================

// CREATE INMATE
app.post("/inmates", 
  upload.fields([
    { name: 'frontImage', maxCount: 1 },
    { name: 'backImage', maxCount: 1 },
    { name: 'leftImage', maxCount: 1 },
    { name: 'rightImage', maxCount: 1 }
  ]), 
  async (req, res) => {
    try {
      const seq = await autoIncrement('inmateCode');
      const inmateCode = `INM${seq}`;
      
      const frontImage = req.files && req.files['frontImage'] ? req.files['frontImage'][0].filename : null;
      const backImage = req.files && req.files['backImage'] ? req.files['backImage'][0].filename : null;
      const leftImage = req.files && req.files['leftImage'] ? req.files['leftImage'][0].filename : null;
      const rightImage = req.files && req.files['rightImage'] ? req.files['rightImage'][0].filename : null;

      const inmateData = {
        ...req.body,
        inmateCode,
        frontImage,
        backImage,
        leftImage,
        rightImage
      };

      const inmate = new Inmate(inmateData);
      await inmate.save();
      
      res.status(201).json({ message: "Inmate created", inmate });
    } catch (error) {
      console.error("Inmate creation error:", error);
      res.status(500).json({ 
        message: "Create failed", 
        error: error.message
      });
    }
  }
);

// GET ALL INMATES
app.get("/inmates", async (req, res) => {
  try {
    const inmates = await Inmate.find();
    const inmatesWithFullName = inmates.map(inmate => ({
      ...inmate.toObject(),
      fullName: inmate.fullName
    }));
    res.json(inmatesWithFullName);
  } catch (error) {
    res.status(500).json({ message: "Fetch failed", error: error.message });
  }
});

// GET SINGLE INMATE
app.get("/inmates/:code", async (req, res) => {
  try {
    const inmate = await Inmate.findOne({ inmateCode: req.params.code });
    if (!inmate) return res.status(404).json({ message: "Not found" });
    
    const inmateWithFullName = {
      ...inmate.toObject(),
      fullName: inmate.fullName
    };
    res.json(inmateWithFullName);
  } catch (error) {
    res.status(500).json({ message: "Fetch failed", error: error.message });
  }
});

// UPDATE INMATE
app.put("/inmates/:code", 
  upload.fields([
    { name: 'frontImage', maxCount: 1 },
    { name: 'backImage', maxCount: 1 },
    { name: 'leftImage', maxCount: 1 },
    { name: 'rightImage', maxCount: 1 }
  ]), 
  async (req, res) => {
    try {
      const updateData = { ...req.body };
      
      if (req.files['frontImage']) 
        updateData.frontImage = req.files['frontImage'][0].filename;
      if (req.files['backImage']) 
        updateData.backImage = req.files['backImage'][0].filename;
      if (req.files['leftImage']) 
        updateData.leftImage = req.files['leftImage'][0].filename;
      if (req.files['rightImage']) 
        updateData.rightImage = req.files['rightImage'][0].filename;

      const updatedInmate = await Inmate.findOneAndUpdate(
        { inmateCode: req.params.code },
        updateData,
        { new: true }
      );
      
      if (!updatedInmate) return res.status(404).json({ message: "Not found" });
      
      const inmateWithFullName = {
        ...updatedInmate.toObject(),
        fullName: updatedInmate.fullName
      };
      res.json(inmateWithFullName);
    } catch (error) {
      res.status(500).json({ message: "Update failed", error: error.message });
    }
  }
);

// DELETE INMATE
app.delete("/inmates/:code", async (req, res) => {
  try {
    const deletedInmate = await Inmate.findOneAndDelete({ inmateCode: req.params.code });
    if (!deletedInmate) return res.status(404).json({ message: "Not found" });
    
    // Delete associated images
    ['frontImage', 'backImage', 'leftImage', 'rightImage'].forEach(imageField => {
      if (deletedInmate[imageField]) {
        const imagePath = path.join(uploadDir, deletedInmate[imageField]);
        if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
      }
    });
    
    res.json({ message: "Inmate deleted" });
  } catch (error) {
    res.status(500).json({ message: "Delete failed", error: error.message });
  }
});

// ======================
// VISITOR ENDPOINTS - FULL CRUD WITH VISIT HISTORY
// ======================

// CREATE VISITOR
app.post("/visitors", 
  upload.single('photo'),
  async (req, res) => {
    try {
      const seq = await autoIncrement('visitorId');
      const id = `VIS${seq}`;

      const visitorData = {
        ...req.body,
        id,
        dateOfBirth: req.body.dateOfBirth ? new Date(req.body.dateOfBirth) : null,
        hasTimedIn: false,
        hasTimedOut: false,
        timeIn: null,
        timeOut: null,
        dateVisited: null,
        lastVisitDate: null,
        isTimerActive: false,
        visitApproved: false,
        status: req.body.status || 'approved',
        dailyVisits: [],
        visitHistory: [],
        totalVisits: 0
      };

      if (req.file) {
        visitorData.photo = req.file.filename;
      }

      const qrData = {
        id,
        lastName: visitorData.lastName,
        firstName: visitorData.firstName,
        middleName: visitorData.middleName,
        extension: visitorData.extension,
        prisonerId: visitorData.prisonerId
      };
      visitorData.qrCode = await generateQRCode(qrData);

      const visitor = new Visitor(visitorData);
      await visitor.save();

      const visitorWithFullName = {
        ...visitor.toObject(),
        fullName: visitor.fullName
      };

      res.status(201).json({ 
        message: "Visitor created successfully", 
        visitor: visitorWithFullName 
      });
    } catch (error) {
      console.error("Visitor creation error:", error);
      
      if (error.code === 11000) {
        return res.status(409).json({ message: "Visitor ID already exists" });
      }
      
      if (error.name === 'ValidationError') {
        return res.status(400).json({ message: "Validation error", error: error.message });
      }
      
      res.status(500).json({ message: "Failed to create visitor", error: error.message });
    }
  }
);

// GET ALL VISITORS
app.get("/visitors", async (req, res) => {
  try {
    const visitors = await Visitor.find();
    const visitorsWithFullName = visitors.map(visitor => ({
      ...visitor.toObject(),
      fullName: visitor.fullName
    }));
    res.json(visitorsWithFullName);
  } catch (error) {
    res.status(500).json({ message: "Fetch failed", error: error.message });
  }
});

// GET SINGLE VISITOR
app.get("/visitors/:id", async (req, res) => {
  try {
    const visitor = await Visitor.findOne({ id: req.params.id });
    if (!visitor) return res.status(404).json({ message: "Visitor not found" });
    
    const visitorWithFullName = {
      ...visitor.toObject(),
      fullName: visitor.fullName
    };
    res.json(visitorWithFullName);
  } catch (error) {
    res.status(500).json({ message: "Fetch failed", error: error.message });
  }
});

// UPDATE VISITOR
app.put("/visitors/:id", 
  upload.single('photo'),
  async (req, res) => {
    try {
      const updateData = { ...req.body };
      if (req.file) updateData.photo = req.file.filename;

      const visitor = await Visitor.findOne({ id: req.params.id });
      if (!visitor) return res.status(404).json({ message: "Visitor not found" });

      const updatedVisitor = await Visitor.findOneAndUpdate(
        { id: req.params.id },
        updateData,
        { new: true, runValidators: true }
      );
      
      const visitorWithFullName = {
        ...updatedVisitor.toObject(),
        fullName: updatedVisitor.fullName
      };
      res.json(visitorWithFullName);
    } catch (error) {
      console.error("Error updating visitor:", error);
      res.status(500).json({ message: "Update failed", error: error.message });
    }
  }
);

// DELETE VISITOR
app.delete("/visitors/:id", async (req, res) => {
  try {
    const deletedVisitor = await Visitor.findOneAndDelete({ id: req.params.id });
    if (!deletedVisitor) return res.status(404).json({ message: "Not found" });
    
    if (deletedVisitor.photo) {
      const photoPath = path.join(uploadDir, deletedVisitor.photo);
      if (fs.existsSync(photoPath)) fs.unlinkSync(photoPath);
    }
    
    res.json({ message: "Visitor deleted" });
  } catch (error) {
    res.status(500).json({ message: "Delete failed", error: error.message });
  }
});

// ======================
// GUEST ENDPOINTS - FULL CRUD WITH VISIT HISTORY
// ======================

// CREATE GUEST
app.post("/guests", 
  upload.single('photo'),
  async (req, res) => {
    try {
      const seq = await autoIncrement('guestId');
      const id = `GST${seq}`;

      const guestData = {
        ...req.body,
        id,
        dateOfBirth: req.body.dateOfBirth ? new Date(req.body.dateOfBirth) : null,
        hasTimedIn: false,
        hasTimedOut: false,
        timeIn: null,
        timeOut: null,
        dateVisited: null,
        lastVisitDate: null,
        status: req.body.status || 'pending',
        dailyVisits: [],
        visitHistory: [],
        totalVisits: 0
      };

      if (req.file) {
        guestData.photo = req.file.filename;
      }

      const qrData = {
        id,
        lastName: guestData.lastName,
        firstName: guestData.firstName,
        middleName: guestData.middleName,
        extension: guestData.extension,
        visitPurpose: guestData.visitPurpose,
        type: 'guest'
      };
      guestData.qrCode = await generateQRCode(qrData);

      const guest = new Guest(guestData);
      await guest.save();

      const guestWithFullName = {
        ...guest.toObject(),
        fullName: guest.fullName
      };

      res.status(201).json({ 
        message: "Guest created successfully", 
        guest: guestWithFullName 
      });
    } catch (error) {
      console.error("Guest creation error:", error);
      
      if (error.code === 11000) {
        return res.status(409).json({ message: "Guest ID already exists" });
      }
      
      if (error.name === 'ValidationError') {
        return res.status(400).json({ message: "Validation error", error: error.message });
      }
      
      res.status(500).json({ message: "Failed to create guest", error: error.message });
    }
  }
);

// GET ALL GUESTS
app.get("/guests", async (req, res) => {
  try {
    const guests = await Guest.find();
    const guestsWithFullName = guests.map(guest => ({
      ...guest.toObject(),
      fullName: guest.fullName
    }));
    res.json(guestsWithFullName);
  } catch (error) {
    res.status(500).json({ message: "Fetch failed", error: error.message });
  }
});

// GET SINGLE GUEST
app.get("/guests/:id", async (req, res) => {
  try {
    const guest = await Guest.findOne({ id: req.params.id });
    if (!guest) return res.status(404).json({ message: "Guest not found" });
    
    const guestWithFullName = {
      ...guest.toObject(),
      fullName: guest.fullName
    };
    res.json(guestWithFullName);
  } catch (error) {
    res.status(500).json({ message: "Fetch failed", error: error.message });
  }
});

// UPDATE GUEST
app.put("/guests/:id", 
  upload.single('photo'),
  async (req, res) => {
    try {
      const updateData = { ...req.body };
      if (req.file) updateData.photo = req.file.filename;

      const guest = await Guest.findOne({ id: req.params.id });
      if (!guest) return res.status(404).json({ message: "Guest not found" });

      const updatedGuest = await Guest.findOneAndUpdate(
        { id: req.params.id },
        updateData,
        { new: true, runValidators: true }
      );
      
      const guestWithFullName = {
        ...updatedGuest.toObject(),
        fullName: updatedGuest.fullName
      };
      res.json(guestWithFullName);
    } catch (error) {
      console.error("Error updating guest:", error);
      res.status(500).json({ message: "Update failed", error: error.message });
    }
  }
);

// DELETE GUEST
app.delete("/guests/:id", async (req, res) => {
  try {
    const deletedGuest = await Guest.findOneAndDelete({ id: req.params.id });
    if (!deletedGuest) return res.status(404).json({ message: "Not found" });
    
    if (deletedGuest.photo) {
      const photoPath = path.join(uploadDir, deletedGuest.photo);
      if (fs.existsSync(photoPath)) fs.unlinkSync(photoPath);
    }
    
    res.json({ message: "Guest deleted" });
  } catch (error) {
    res.status(500).json({ message: "Delete failed", error: error.message });
  }
});

// ======================
// IMPORT AND EXPORTS
// ======================

// IMPROVED GUEST IMPORT ENDPOINT
app.post("/guests/import", upload.single('csvFile'), async (req, res) => {
  try {
    console.log('🔄 Starting guest import process...');
    
    if (!req.file) {
      return res.status(400).json({ message: 'No CSV file uploaded' });
    }

    console.log('📁 File received:', req.file.originalname);

    const guests = [];
    const errors = [];

    // Read and parse CSV file
    const fileContent = fs.readFileSync(req.file.path, 'utf8');
    console.log('📄 File content length:', fileContent.length);

    const results = Papa.parse(fileContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
      complete: (results) => {
        console.log('✅ CSV parsing completed, rows:', results.data.length);
      },
      error: (error) => {
        console.error('❌ CSV parsing error:', error);
      }
    });

    if (results.errors && results.errors.length > 0) {
      console.error('CSV parsing errors:', results.errors);
      return res.status(400).json({ 
        message: 'Invalid CSV format', 
        errors: results.errors 
      });
    }

    console.log('🔍 Processing CSV rows...');
    
    for (const [index, row] of results.data.entries()) {
      try {
        console.log(`📝 Processing row ${index + 1}:`, row);

        // Validate required fields
        const requiredFields = ['lastName', 'firstName', 'sex', 'dateOfBirth', 'address', 'contact', 'visitPurpose'];
        const missingFields = requiredFields.filter(field => !row[field] || row[field].trim() === '');
        
        if (missingFields.length > 0) {
          errors.push({
            row: index + 2,
            error: `Missing required fields: ${missingFields.join(', ')}`,
            data: row
          });
          console.log(`❌ Row ${index + 2} missing fields:`, missingFields);
          continue;
        }

        // Validate gender
        if (!['Male', 'Female'].includes(row.sex)) {
          errors.push({
            row: index + 2,
            error: 'Invalid gender. Must be Male or Female',
            data: row
          });
          console.log(`❌ Row ${index + 2} invalid gender:`, row.sex);
          continue;
        }

        // Parse date with multiple format support
        let dateOfBirth;
        try {
          // Try parsing different date formats
          dateOfBirth = new Date(row.dateOfBirth);
          if (isNaN(dateOfBirth.getTime())) {
            // Try MM/DD/YYYY format
            const parts = row.dateOfBirth.split('/');
            if (parts.length === 3) {
              dateOfBirth = new Date(parts[2], parts[0] - 1, parts[1]);
            }
            if (isNaN(dateOfBirth.getTime())) {
              throw new Error('Invalid date format');
            }
          }
        } catch (dateError) {
          errors.push({
            row: index + 2,
            error: `Invalid date format: ${row.dateOfBirth}. Use YYYY-MM-DD or MM/DD/YYYY`,
            data: row
          });
          console.log(`❌ Row ${index + 2} date error:`, row.dateOfBirth);
          continue;
        }

        // Calculate age
        const today = new Date();
        let age = today.getFullYear() - dateOfBirth.getFullYear();
        const monthDiff = today.getMonth() - dateOfBirth.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
          age--;
        }

        const guestData = {
          lastName: row.lastName.trim(),
          firstName: row.firstName.trim(),
          middleName: row.middleName ? row.middleName.trim() : '',
          extension: row.extension ? row.extension.trim() : '',
          dateOfBirth: dateOfBirth,
          age: age.toString(),
          sex: row.sex,
          address: row.address.trim(),
          contact: row.contact.trim(),
          visitPurpose: row.visitPurpose.trim(),
          status: 'approved'
        };

        console.log(`✅ Row ${index + 2} processed successfully:`, guestData.firstName, guestData.lastName);
        guests.push(guestData);
      } catch (rowError) {
        console.error(`❌ Error processing row ${index + 2}:`, rowError);
        errors.push({
          row: index + 2,
          error: rowError.message,
          data: row
        });
      }
    }

    console.log(`📊 Processing complete: ${guests.length} valid, ${errors.length} errors`);

    // Insert guests into database
    const importedGuests = [];
    for (const guestData of guests) {
      try {
        // Generate unique guest ID
        const guestSeq = await autoIncrement('guestId');
        const guestId = `GST${guestSeq}`;

        // Generate QR code
        const qrData = {
          id: guestId,
          lastName: guestData.lastName,
          firstName: guestData.firstName,
          middleName: guestData.middleName,
          extension: guestData.extension,
          visitPurpose: guestData.visitPurpose,
          type: 'guest'
        };
        const qrCode = await generateQRCode(qrData);

        const guest = new Guest({
          ...guestData,
          id: guestId,
          qrCode: qrCode,
          hasTimedIn: false,
          hasTimedOut: false,
          timeIn: null,
          timeOut: null,
          dateVisited: null,
          lastVisitDate: null,
          dailyVisits: [],
          visitHistory: [],
          totalVisits: 0
        });

        const savedGuest = await guest.save();
        importedGuests.push(savedGuest);
        console.log(`✅ Saved guest: ${guestId} - ${guestData.firstName} ${guestData.lastName}`);
      } catch (error) {
        console.error(`❌ Error saving guest ${guestData.firstName} ${guestData.lastName}:`, error);
        errors.push({
          guest: guestData,
          error: error.message
        });
      }
    }

    // Clean up uploaded file
    try {
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
        console.log('🧹 Cleaned up uploaded file');
      }
    } catch (cleanupError) {
      console.warn('Could not clean up file:', cleanupError);
    }

    const result = {
      message: 'Import completed',
      imported: importedGuests.length,
      errors: errors,
      totalProcessed: guests.length
    };

    console.log('🎉 Import final result:', result);
    res.json(result);

  } catch (error) {
    console.error('❌ Import process error:', error);
    
    // Clean up file on error
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.warn('Could not clean up file on error:', cleanupError);
      }
    }
    
    res.status(500).json({ 
      message: 'Failed to import guests', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Import visitors from CSV
app.post("/visitors/import", upload.single('csvFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No CSV file uploaded' });
    }

    const visitors = [];
    const errors = [];

    // Read and parse CSV file using Papa Parse
    const fileContent = fs.readFileSync(req.file.path, 'utf8');
    const results = Papa.parse(fileContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim()
    });

    if (results.errors.length > 0) {
      return res.status(400).json({ 
        message: 'Invalid CSV format', 
        errors: results.errors 
      });
    }

    for (const [index, row] of results.data.entries()) {
      try {
        // Validate required fields for visitors
        if (!row.lastName || !row.firstName || !row.sex || !row.dateOfBirth || 
            !row.address || !row.contact || !row.prisonerId || !row.relationship) {
          errors.push({
            row: index + 2,
            error: 'Missing required fields',
            data: row
          });
          continue;
        }

        // Validate gender
        if (!['Male', 'Female'].includes(row.sex)) {
          errors.push({
            row: index + 2,
            error: 'Invalid gender. Must be Male or Female',
            data: row
          });
          continue;
        }

        // Validate date
        const dateOfBirth = new Date(row.dateOfBirth);
        if (isNaN(dateOfBirth.getTime())) {
          errors.push({
            row: index + 2,
            error: 'Invalid date format. Use YYYY-MM-DD',
            data: row
          });
          continue;
        }

        // Verify prisoner exists
        const inmate = await Inmate.findOne({ inmateCode: row.prisonerId });
        if (!inmate) {
          errors.push({
            row: index + 2,
            error: `Prisoner with ID ${row.prisonerId} not found`,
            data: row
          });
          continue;
        }

        // Calculate age
        const today = new Date();
        let age = today.getFullYear() - dateOfBirth.getFullYear();
        const monthDiff = today.getMonth() - dateOfBirth.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
          age--;
        }

        const visitorData = {
          lastName: row.lastName.trim(),
          firstName: row.firstName.trim(),
          middleName: row.middleName ? row.middleName.trim() : '',
          extension: row.extension ? row.extension.trim() : '',
          dateOfBirth: dateOfBirth,
          age: age.toString(),
          sex: row.sex,
          address: row.address.trim(),
          contact: row.contact.trim(),
          prisonerId: row.prisonerId.trim(),
          relationship: row.relationship.trim(),
          status: 'approved'
        };

        visitors.push(visitorData);
      } catch (rowError) {
        errors.push({
          row: index + 2,
          error: rowError.message,
          data: row
        });
      }
    }

    // Insert visitors into database
    const importedVisitors = [];
    for (const visitorData of visitors) {
      try {
        // Generate unique visitor ID
        const visitorSeq = await autoIncrement('visitorId');
        const visitorId = `VIS${visitorSeq}`;

        // Generate QR code
        const qrData = {
          id: visitorId,
          lastName: visitorData.lastName,
          firstName: visitorData.firstName,
          middleName: visitorData.middleName,
          extension: visitorData.extension,
          prisonerId: visitorData.prisonerId,
          type: 'visitor'
        };
        const qrCode = await generateQRCode(qrData);

        const visitor = new Visitor({
          ...visitorData,
          id: visitorId,
          qrCode: qrCode,
          hasTimedIn: false,
          hasTimedOut: false,
          timeIn: null,
          timeOut: null,
          dateVisited: null,
          lastVisitDate: null,
          isTimerActive: false,
          visitApproved: false,
          dailyVisits: [],
          visitHistory: [],
          totalVisits: 0
        });

        const savedVisitor = await visitor.save();
        importedVisitors.push(savedVisitor);
      } catch (error) {
        errors.push({
          visitor: visitorData,
          error: error.message
        });
      }
    }

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    res.json({
      message: 'Import completed',
      imported: importedVisitors.length,
      errors: errors,
      totalProcessed: visitors.length
    });

  } catch (error) {
    console.error('Import error:', error);
    
    // Clean up file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ 
      message: 'Failed to import visitors', 
      error: error.message 
    });
  }
});

// ======================
// INMATES IMPORT ENDPOINTS - ADDED MISSING CODE
// ======================

// Import inmates from CSV
app.post("/inmates/import", upload.single('csvFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No CSV file uploaded' });
    }

    const inmates = [];
    const errors = [];

    // Read and parse CSV file using Papa Parse
    const fileContent = fs.readFileSync(req.file.path, 'utf8');
    const results = Papa.parse(fileContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim()
    });

    if (results.errors.length > 0) {
      return res.status(400).json({ 
        message: 'Invalid CSV format', 
        errors: results.errors 
      });
    }

    for (const [index, row] of results.data.entries()) {
      try {
        // Validate required fields
        if (!row.lastName || !row.firstName || !row.sex || !row.dateOfBirth || 
            !row.address || !row.cellId || !row.crime) {
          errors.push({
            row: index + 2,
            error: 'Missing required fields',
            data: row
          });
          continue;
        }

        // Validate gender
        if (!['Male', 'Female'].includes(row.sex)) {
          errors.push({
            row: index + 2,
            error: 'Invalid gender. Must be Male or Female',
            data: row
          });
          continue;
        }

        // Validate date
        const dateOfBirth = new Date(row.dateOfBirth);
        if (isNaN(dateOfBirth.getTime())) {
          errors.push({
            row: index + 2,
            error: 'Invalid date format. Use YYYY-MM-DD',
            data: row
          });
          continue;
        }

        // Validate other dates if provided
        let dateFrom = null;
        let dateTo = null;
        
        if (row.dateFrom && row.dateFrom.trim() !== '') {
          dateFrom = new Date(row.dateFrom);
          if (isNaN(dateFrom.getTime())) {
            errors.push({
              row: index + 2,
              error: 'Invalid dateFrom format. Use YYYY-MM-DD',
              data: row
            });
            continue;
          }
        }

        if (row.dateTo && row.dateTo.trim() !== '') {
          dateTo = new Date(row.dateTo);
          if (isNaN(dateTo.getTime())) {
            errors.push({
              row: index + 2,
              error: 'Invalid dateTo format. Use YYYY-MM-DD',
              data: row
            });
            continue;
          }
        }

        const inmateData = {
          lastName: row.lastName.trim(),
          firstName: row.firstName.trim(),
          middleName: row.middleName ? row.middleName.trim() : '',
          extension: row.extension ? row.extension.trim() : '',
          sex: row.sex,
          dateOfBirth: dateOfBirth,
          address: row.address.trim(),
          maritalStatus: row.maritalStatus ? row.maritalStatus.trim() : '',
          eyeColor: row.eyeColor ? row.eyeColor.trim() : '',
          complexion: row.complexion ? row.complexion.trim() : '',
          cellId: row.cellId.trim(),
          sentence: row.sentence ? row.sentence.trim() : '',
          dateFrom: dateFrom,
          dateTo: dateTo,
          crime: row.crime.trim(),
          emergencyName: row.emergencyName ? row.emergencyName.trim() : '',
          emergencyContact: row.emergencyContact ? row.emergencyContact.trim() : '',
          emergencyRelation: row.emergencyRelation ? row.emergencyRelation.trim() : '',
          status: row.status && ['active', 'inactive', 'released', 'transferred'].includes(row.status) 
            ? row.status 
            : 'active'
        };

        inmates.push(inmateData);
      } catch (rowError) {
        errors.push({
          row: index + 2,
          error: rowError.message,
          data: row
        });
      }
    }

    // Insert inmates into database
    const importedInmates = [];
    for (const inmateData of inmates) {
      try {
        // Generate unique inmate code
        const inmateSeq = await autoIncrement('inmateCode');
        const inmateCode = `INM${inmateSeq}`;

        const inmate = new Inmate({
          ...inmateData,
          inmateCode: inmateCode
        });

        const savedInmate = await inmate.save();
        importedInmates.push(savedInmate);
      } catch (error) {
        errors.push({
          inmate: inmateData,
          error: error.message
        });
      }
    }

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    res.json({
      message: 'Import completed',
      imported: importedInmates.length,
      errors: errors,
      totalProcessed: inmates.length
    });

  } catch (error) {
    console.error('Import error:', error);
    
    // Clean up file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ 
      message: 'Failed to import inmates', 
      error: error.message 
    });
  }
});

// CSV Upload for Inmates (legacy endpoint - matches your frontend call)
app.post("/inmates/upload-csv", upload.single('csvFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No CSV file uploaded' });
    }

    const inmates = [];
    const errors = [];

    // Read and parse CSV file
    const fileContent = fs.readFileSync(req.file.path, 'utf8');
    const results = Papa.parse(fileContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim()
    });

    if (results.errors.length > 0) {
      return res.status(400).json({ 
        message: 'Invalid CSV format', 
        errors: results.errors 
      });
    }

    for (const [index, row] of results.data.entries()) {
      try {
        // Validate required fields
        if (!row.lastName || !row.firstName || !row.sex || !row.dateOfBirth || 
            !row.address || !row.cellId || !row.crime) {
          errors.push({
            row: index + 2,
            error: 'Missing required fields',
            data: row
          });
          continue;
        }

        // Process inmate data (same logic as above)
        const dateOfBirth = new Date(row.dateOfBirth);
        if (isNaN(dateOfBirth.getTime())) {
          errors.push({
            row: index + 2,
            error: 'Invalid date format',
            data: row
          });
          continue;
        }

        const inmateData = {
          lastName: row.lastName.trim(),
          firstName: row.firstName.trim(),
          middleName: row.middleName ? row.middleName.trim() : '',
          extension: row.extension ? row.extension.trim() : '',
          sex: row.sex,
          dateOfBirth: dateOfBirth,
          address: row.address.trim(),
          maritalStatus: row.maritalStatus || '',
          eyeColor: row.eyeColor || '',
          complexion: row.complexion || '',
          cellId: row.cellId.trim(),
          sentence: row.sentence || '',
          dateFrom: row.dateFrom ? new Date(row.dateFrom) : null,
          dateTo: row.dateTo ? new Date(row.dateTo) : null,
          crime: row.crime.trim(),
          emergencyName: row.emergencyName || '',
          emergencyContact: row.emergencyContact || '',
          emergencyRelation: row.emergencyRelation || '',
          status: row.status || 'active'
        };

        inmates.push(inmateData);
      } catch (rowError) {
        errors.push({
          row: index + 2,
          error: rowError.message,
          data: row
        });
      }
    }

    // Insert into database
    const importedInmates = [];
    for (const inmateData of inmates) {
      try {
        const inmateSeq = await autoIncrement('inmateCode');
        const inmateCode = `INM${inmateSeq}`;

        const inmate = new Inmate({
          ...inmateData,
          inmateCode: inmateCode
        });

        const savedInmate = await inmate.save();
        importedInmates.push(savedInmate);
      } catch (error) {
        errors.push({
          inmate: inmateData,
          error: error.message
        });
      }
    }

    // Clean up
    fs.unlinkSync(req.file.path);

    res.json({
      message: `Successfully imported ${importedInmates.length} inmates`,
      imported: importedInmates.length,
      errors: errors
    });

  } catch (error) {
    console.error('CSV upload error:', error);
    
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ 
      message: 'Failed to upload CSV', 
      error: error.message 
    });
  }
});

// ======================
// PENDING VISITOR ENDPOINTS
// ======================

// CREATE PENDING VISITOR
app.post("/pending-visitors", 
  upload.single('photo'),
  async (req, res) => {
    try {
      const seq = await autoIncrement('pendingVisitorId');
      const id = `PEN${seq}`;

      const pendingVisitorData = {
        ...req.body,
        id,
        dateOfBirth: req.body.dateOfBirth ? new Date(req.body.dateOfBirth) : null,
        status: 'pending'
      };

      if (req.file) {
        pendingVisitorData.photo = req.file.filename;
      }

      const pendingVisitor = new PendingVisitor(pendingVisitorData);
      await pendingVisitor.save();

      const pendingVisitorWithFullName = {
        ...pendingVisitor.toObject(),
        fullName: pendingVisitor.fullName
      };

      res.status(201).json({ 
        message: "Visitor request submitted for approval", 
        pendingVisitor: pendingVisitorWithFullName 
      });
    } catch (error) {
      console.error("Pending visitor creation error:", error);
      res.status(500).json({ message: "Failed to create pending visitor", error: error.message });
    }
  }
);

// GET PENDING VISITORS (with optional status filter)
app.get("/pending-visitors", async (req, res) => {
  try {
    const { status } = req.query;
    console.log('🔍 Fetching pending visitors with status:', status);
    
    const filter = status ? { status } : { status: 'pending' };
    console.log('📋 Filter being used:', filter);
    
    const pendingVisitors = await PendingVisitor.find(filter).sort({ createdAt: -1 });
    console.log('✅ Found visitors:', pendingVisitors.length);
    
    const pendingVisitorsWithFullName = pendingVisitors.map(pendingVisitor => ({
      ...pendingVisitor.toObject(),
      fullName: pendingVisitor.fullName
    }));
    
    res.json(pendingVisitorsWithFullName);
  } catch (error) {
    console.error('❌ Error fetching pending visitors:', error);
    res.status(500).json({ message: "Fetch failed", error: error.message });
  }
});

// GET SINGLE PENDING VISITOR
app.get("/pending-visitors/:id", async (req, res) => {
  try {
    const pendingVisitor = await PendingVisitor.findOne({ id: req.params.id });
    if (!pendingVisitor) {
      return res.status(404).json({ message: "Pending visitor not found" });
    }
    
    const pendingVisitorWithFullName = {
      ...pendingVisitor.toObject(),
      fullName: pendingVisitor.fullName
    };
    
    res.json(pendingVisitorWithFullName);
  } catch (error) {
    console.error("Error fetching pending visitor:", error);
    res.status(500).json({ message: "Fetch failed", error: error.message });
  }
});

// APPROVE PENDING VISITOR
app.post("/pending-visitors/:id/approve", async (req, res) => {
  try {
    console.log('🔄 Approving pending visitor:', req.params.id);
    
    const pendingVisitor = await PendingVisitor.findOne({ id: req.params.id });
    if (!pendingVisitor) {
      return res.status(404).json({ message: "Pending visitor not found" });
    }

    // Generate QR code for the approved visitor
    const visitorSeq = await autoIncrement('visitorId');
    const visitorId = `VIS${visitorSeq}`;

    const qrData = {
      id: visitorId,
      lastName: pendingVisitor.lastName,
      firstName: pendingVisitor.firstName,
      middleName: pendingVisitor.middleName,
      extension: pendingVisitor.extension,
      prisonerId: pendingVisitor.prisonerId
    };
    const qrCode = await generateQRCode(qrData);

    // Create the actual visitor
    const visitorData = {
      id: visitorId,
      lastName: pendingVisitor.lastName,
      firstName: pendingVisitor.firstName,
      middleName: pendingVisitor.middleName,
      extension: pendingVisitor.extension,
      photo: pendingVisitor.photo,
      dateOfBirth: pendingVisitor.dateOfBirth,
      age: pendingVisitor.age,
      sex: pendingVisitor.sex,
      address: pendingVisitor.address,
      contact: pendingVisitor.contact,
      prisonerId: pendingVisitor.prisonerId,
      relationship: pendingVisitor.relationship,
      qrCode: qrCode,
      status: 'approved',
      hasTimedIn: false,
      hasTimedOut: false,
      timeIn: null,
      timeOut: null,
      dateVisited: null,
      lastVisitDate: null,
      isTimerActive: false,
      visitApproved: false,
      dailyVisits: [],
      visitHistory: [],
      totalVisits: 0
    };

    const visitor = new Visitor(visitorData);
    await visitor.save();

    // Update pending visitor status to approved
    await PendingVisitor.findOneAndUpdate(
      { id: req.params.id },
      { status: 'approved' }
    );

    const visitorWithFullName = {
      ...visitor.toObject(),
      fullName: visitor.fullName
    };

    console.log('✅ Visitor approved successfully:', visitorId);

    res.json({ 
      message: "Visitor approved successfully", 
      visitor: visitorWithFullName 
    });

  } catch (error) {
    console.error("❌ Error approving pending visitor:", error);
    res.status(500).json({ message: "Failed to approve visitor", error: error.message });
  }
});

// REJECT PENDING VISITOR
app.post("/pending-visitors/:id/reject", async (req, res) => {
  try {
    const { rejectionReason } = req.body;
    console.log('🔄 Rejecting pending visitor:', req.params.id, 'Reason:', rejectionReason);
    
    const pendingVisitor = await PendingVisitor.findOneAndUpdate(
      { id: req.params.id },
      { 
        status: 'rejected',
        rejectionReason: rejectionReason || 'Rejected by administrator',
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!pendingVisitor) {
      return res.status(404).json({ message: "Pending visitor not found" });
    }

    console.log('✅ Visitor rejected successfully:', req.params.id);

    res.json({ 
      message: "Visitor rejected successfully", 
      pendingVisitor: pendingVisitor 
    });

  } catch (error) {
    console.error("❌ Error rejecting pending visitor:", error);
    res.status(500).json({ message: "Failed to reject visitor", error: error.message });
  }
});

// DELETE PENDING VISITOR
app.delete("/pending-visitors/:id", async (req, res) => {
  try {
    const deletedVisitor = await PendingVisitor.findOneAndDelete({ id: req.params.id });
    if (!deletedVisitor) {
      return res.status(404).json({ message: "Pending visitor not found" });
    }

    // Delete associated photo
    if (deletedVisitor.photo) {
      const photoPath = path.join(uploadDir, deletedVisitor.photo);
      if (fs.existsSync(photoPath)) {
        fs.unlinkSync(photoPath);
      }
    }

    res.json({ 
      message: "Pending visitor deleted successfully",
      visitor: deletedVisitor 
    });
  } catch (error) {
    console.error("Error deleting pending visitor:", error);
    res.status(500).json({ message: "Failed to delete pending visitor", error: error.message });
  }
});

// GET PENDING VISITOR STATS
app.get("/pending-visitors/stats", async (req, res) => {
  try {
    const totalPending = await PendingVisitor.countDocuments({ status: 'pending' });
    const totalApproved = await PendingVisitor.countDocuments({ status: 'approved' });
    const totalRejected = await PendingVisitor.countDocuments({ status: 'rejected' });

    console.log('📊 Pending Visitor Stats:', { pending: totalPending, approved: totalApproved, rejected: totalRejected });

    res.json({
      pending: totalPending,
      approved: totalApproved,
      rejected: totalRejected,
      total: totalPending + totalApproved + totalRejected
    });
  } catch (error) {
    console.error('❌ Error fetching pending visitor stats:', error);
    res.status(500).json({ message: "Failed to fetch stats", error: error.message });
  }
});

// ======================
// PENDING GUEST ENDPOINTS
// ======================

// CREATE PENDING GUEST
app.post("/pending-guests", 
  upload.single('photo'),
  async (req, res) => {
  try {
    const seq = await autoIncrement('pendingGuestId');
    const id = `PENG${seq}`;

    const pendingGuestData = {
      ...req.body,
      id,
      dateOfBirth: req.body.dateOfBirth ? new Date(req.body.dateOfBirth) : null,
      status: 'pending'
    };

    if (req.file) {
      pendingGuestData.photo = req.file.filename;
    }

    const pendingGuest = new PendingGuest(pendingGuestData);
    await pendingGuest.save();

    const pendingGuestWithFullName = {
      ...pendingGuest.toObject(),
      fullName: pendingGuest.fullName
    };

    res.status(201).json({ 
      message: "Guest request submitted for approval", 
      pendingGuest: pendingGuestWithFullName 
    });
  } catch (error) {
    console.error("Pending guest creation error:", error);
    res.status(500).json({ message: "Failed to create pending guest", error: error.message });
  }
});

// GET PENDING GUESTS (with optional status filter)
app.get("/pending-guests", async (req, res) => {
  try {
    const { status } = req.query;
    console.log('🔍 Fetching pending guests with status:', status);
    
    const filter = status ? { status } : { status: 'pending' };
    console.log('📋 Filter being used:', filter);
    
    const pendingGuests = await PendingGuest.find(filter).sort({ createdAt: -1 });
    console.log('✅ Found guests:', pendingGuests.length);
    
    const pendingGuestsWithFullName = pendingGuests.map(pendingGuest => ({
      ...pendingGuest.toObject(),
      fullName: pendingGuest.fullName
    }));
    
    res.json(pendingGuestsWithFullName);
  } catch (error) {
    console.error('❌ Error fetching pending guests:', error);
    res.status(500).json({ message: "Fetch failed", error: error.message });
  }
});

// GET SINGLE PENDING GUEST
app.get("/pending-guests/:id", async (req, res) => {
  try {
    const pendingGuest = await PendingGuest.findOne({ id: req.params.id });
    if (!pendingGuest) {
      return res.status(404).json({ message: "Pending guest not found" });
    }
    
    const pendingGuestWithFullName = {
      ...pendingGuest.toObject(),
      fullName: pendingGuest.fullName
    };
    
    res.json(pendingGuestWithFullName);
  } catch (error) {
    console.error("Error fetching pending guest:", error);
    res.status(500).json({ message: "Fetch failed", error: error.message });
  }
});

// APPROVE PENDING GUEST
app.post("/pending-guests/:id/approve", async (req, res) => {
  try {
    console.log('🔄 Approving pending guest:', req.params.id);
    
    const pendingGuest = await PendingGuest.findOne({ id: req.params.id });
    if (!pendingGuest) {
      return res.status(404).json({ message: "Pending guest not found" });
    }

    // Generate QR code for the approved guest
    const guestSeq = await autoIncrement('guestId');
    const guestId = `GST${guestSeq}`;

    const qrData = {
      id: guestId,
      lastName: pendingGuest.lastName,
      firstName: pendingGuest.firstName,
      middleName: pendingGuest.middleName,
      extension: pendingGuest.extension,
      visitPurpose: pendingGuest.visitPurpose,
      type: 'guest'
    };
    const qrCode = await generateQRCode(qrData);

    // Create the actual guest
    const guestData = {
      id: guestId,
      lastName: pendingGuest.lastName,
      firstName: pendingGuest.firstName,
      middleName: pendingGuest.middleName,
      extension: pendingGuest.extension,
      photo: pendingGuest.photo,
      dateOfBirth: pendingGuest.dateOfBirth,
      age: pendingGuest.age,
      sex: pendingGuest.sex,
      address: pendingGuest.address,
      contact: pendingGuest.contact,
      visitPurpose: pendingGuest.visitPurpose,
      qrCode: qrCode,
      status: 'approved',
      hasTimedIn: false,
      hasTimedOut: false,
      timeIn: null,
      timeOut: null,
      dateVisited: null,
      lastVisitDate: null,
      dailyVisits: [],
      visitHistory: [],
      totalVisits: 0
    };

    const guest = new Guest(guestData);
    await guest.save();

    // Update pending guest status to approved
    await PendingGuest.findOneAndUpdate(
      { id: req.params.id },
      { status: 'approved' }
    );

    const guestWithFullName = {
      ...guest.toObject(),
      fullName: guest.fullName
    };

    console.log('✅ Guest approved successfully:', guestId);

    res.json({ 
      message: "Guest approved successfully", 
      guest: guestWithFullName 
    });

  } catch (error) {
    console.error("❌ Error approving pending guest:", error);
    res.status(500).json({ message: "Failed to approve guest", error: error.message });
  }
});

// REJECT PENDING GUEST
app.post("/pending-guests/:id/reject", async (req, res) => {
  try {
    const { rejectionReason } = req.body;
    console.log('🔄 Rejecting pending guest:', req.params.id, 'Reason:', rejectionReason);
    
    const pendingGuest = await PendingGuest.findOneAndUpdate(
      { id: req.params.id },
      { 
        status: 'rejected',
        rejectionReason: rejectionReason || 'Rejected by administrator',
        updatedAt: new Date()
      },
      { new: true }
    );

    if (!pendingGuest) {
      return res.status(404).json({ message: "Pending guest not found" });
    }

    console.log('✅ Guest rejected successfully:', req.params.id);

    res.json({ 
      message: "Guest rejected successfully", 
      pendingGuest: pendingGuest 
    });

  } catch (error) {
    console.error("❌ Error rejecting pending guest:", error);
    res.status(500).json({ message: "Failed to reject guest", error: error.message });
  }
});

// DELETE PENDING GUEST
app.delete("/pending-guests/:id", async (req, res) => {
  try {
    const deletedGuest = await PendingGuest.findOneAndDelete({ id: req.params.id });
    if (!deletedGuest) {
      return res.status(404).json({ message: "Pending guest not found" });
    }

    // Delete associated photo
    if (deletedGuest.photo) {
      const photoPath = path.join(uploadDir, deletedGuest.photo);
      if (fs.existsSync(photoPath)) {
        fs.unlinkSync(photoPath);
      }
    }

    res.json({ 
      message: "Pending guest deleted successfully",
      guest: deletedGuest 
    });
  } catch (error) {
    console.error("Error deleting pending guest:", error);
    res.status(500).json({ message: "Failed to delete pending guest", error: error.message });
  }
});

// GET PENDING GUEST STATS
app.get("/pending-guests/stats", async (req, res) => {
  try {
    const totalPending = await PendingGuest.countDocuments({ status: 'pending' });
    const totalApproved = await PendingGuest.countDocuments({ status: 'approved' });
    const totalRejected = await PendingGuest.countDocuments({ status: 'rejected' });

    console.log('📊 Pending Guest Stats:', { pending: totalPending, approved: totalApproved, rejected: totalRejected });

    res.json({
      pending: totalPending,
      approved: totalApproved,
      rejected: totalRejected,
      total: totalPending + totalApproved + totalRejected
    });
  } catch (error) {
    console.error('❌ Error fetching pending guest stats:', error);
    res.status(500).json({ message: "Failed to fetch stats", error: error.message });
  }
});

// ======================
// BULK OPERATIONS
// ======================

// BULK APPROVE PENDING REQUESTS
app.post("/pending-requests/bulk-approve", async (req, res) => {
  try {
    const { ids, type } = req.body; // type: 'visitors' or 'guests'
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: "No IDs provided for bulk approval" });
    }

    if (!type || !['visitors', 'guests'].includes(type)) {
      return res.status(400).json({ message: "Invalid type. Must be 'visitors' or 'guests'" });
    }

    let results = {
      approved: 0,
      failed: 0,
      details: []
    };

    for (const id of ids) {
      try {
        if (type === 'visitors') {
          await axios.post(`http://localhost:5000/pending-visitors/${id}/approve`);
        } else {
          await axios.post(`http://localhost:5000/pending-guests/${id}/approve`);
        }
        results.approved++;
        results.details.push({ id, status: 'approved' });
      } catch (error) {
        results.failed++;
        results.details.push({ id, status: 'failed', error: error.message });
      }
    }

    res.json({
      message: `Bulk approval completed for ${type}`,
      results: results
    });

  } catch (error) {
    console.error("Bulk approval error:", error);
    res.status(500).json({ message: "Bulk approval failed", error: error.message });
  }
});

// BULK REJECT PENDING REQUESTS
app.post("/pending-requests/bulk-reject", async (req, res) => {
  try {
    const { ids, type, rejectionReason } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: "No IDs provided for bulk rejection" });
    }

    if (!type || !['visitors', 'guests'].includes(type)) {
      return res.status(400).json({ message: "Invalid type. Must be 'visitors' or 'guests'" });
    }

    let results = {
      rejected: 0,
      failed: 0,
      details: []
    };

    for (const id of ids) {
      try {
        if (type === 'visitors') {
          await axios.post(`http://localhost:5000/pending-visitors/${id}/reject`, {
            rejectionReason
          });
        } else {
          await axios.post(`http://localhost:5000/pending-guests/${id}/reject`, {
            rejectionReason
          });
        }
        results.rejected++;
        results.details.push({ id, status: 'rejected' });
      } catch (error) {
        results.failed++;
        results.details.push({ id, status: 'failed', error: error.message });
      }
    }

    res.json({
      message: `Bulk rejection completed for ${type}`,
      results: results
    });

  } catch (error) {
    console.error("Bulk rejection error:", error);
    res.status(500).json({ message: "Bulk rejection failed", error: error.message });
  }
});

// ======================
// BACKUP & MAINTENANCE ENDPOINTS
// ======================

// Create backups directory if not exists
const backupsDir = path.join(__dirname, 'backups');
if (!fs.existsSync(backupsDir)) {
  fs.mkdirSync(backupsDir, { recursive: true });
}

// Helper function to get database stats
const getDatabaseStats = async () => {
  try {
    const [
      usersCount,
      inmatesCount,
      visitorsCount,
      guestsCount,
      crimesCount,
      visitLogsCount,
      activeTimersCount
    ] = await Promise.all([
      User.countDocuments(),
      Inmate.countDocuments(),
      Visitor.countDocuments(),
      Guest.countDocuments(),
      Crime.countDocuments(),
      VisitLog.countDocuments(),
      VisitLog.countDocuments({ 
        isTimerActive: true, 
        timerEnd: { $gt: new Date() } 
      })
    ]);

    const totalRecords = usersCount + inmatesCount + visitorsCount + guestsCount + crimesCount + visitLogsCount;
    
    // Calculate approximate storage usage (mock calculation)
    const storageUsage = Math.min(95, Math.round((totalRecords / 5000) * 100));

    return {
      totalRecords,
      storageUsage,
      collectionsCount: 6,
      lastBackup: await getLastBackupDate(),
      collectionStats: {
        Users: usersCount,
        Inmates: inmatesCount,
        Visitors: visitorsCount,
        Guests: guestsCount,
        Crimes: crimesCount,
        'Visit Logs': visitLogsCount,
        'Active Timers': activeTimersCount
      }
    };
  } catch (error) {
    console.error('Error getting database stats:', error);
    return {};
  }
};

// Helper function to get last backup date
const getLastBackupDate = async () => {
  try {
    const files = fs.readdirSync(backupsDir)
      .filter(file => file.endsWith('.json') || file.endsWith('.zip'))
      .map(file => {
        const filePath = path.join(backupsDir, file);
        const stats = fs.statSync(filePath);
        return stats.mtime;
      })
      .sort((a, b) => b - a);
    
    return files.length > 0 ? files[0] : null;
  } catch (error) {
    return null;
  }
};

// Get all backups
app.get("/backups", async (req, res) => {
  try {
    const files = fs.readdirSync(backupsDir)
      .filter(file => file.endsWith('.json') || file.endsWith('.zip'))
      .map(file => {
        const filePath = path.join(backupsDir, file);
        const stats = fs.statSync(filePath);
        const format = file.endsWith('.json') ? 'json' : 'zip';
        
        return {
          filename: file,
          createdAt: stats.birthtime,
          modifiedAt: stats.mtime,
          size: stats.size,
          format: format,
          type: file.includes('quick-') ? 'quick' : file.includes('auto-') ? 'auto' : 'manual'
        };
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const stats = await getDatabaseStats();
    
    res.json({
      backups: files,
      stats: stats,
      totalBackups: files.length
    });
  } catch (error) {
    console.error('Error fetching backups:', error);
    res.status(500).json({ 
      message: "Failed to fetch backups", 
      error: error.message 
    });
  }
});

// Create backup - FIXED CSV VERSION
app.post("/backups/create", async (req, res) => {
  try {
    const { format = 'json' } = req.body;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-${timestamp}.${format === 'csv' ? 'zip' : 'json'}`;
    const filePath = path.join(backupsDir, filename);

    console.log(`🔄 Creating backup: ${filename}, format: ${format}`);

    // Fetch all data from collections
    const [users, inmates, visitors, guests, crimes, visitLogs] = await Promise.all([
      User.find().lean(),
      Inmate.find().lean(),
      Visitor.find().lean(),
      Guest.find().lean(),
      Crime.find().lean(),
      VisitLog.find().lean()
    ]);

    const backupData = {
      metadata: {
        version: '1.0',
        created: new Date().toISOString(),
        collections: 6,
        totalRecords: users.length + inmates.length + visitors.length + guests.length + crimes.length + visitLogs.length,
        format: format
      },
      collections: {
        users,
        inmates,
        visitors,
        guests,
        crimes,
        visitLogs
      }
    };

    if (format === 'json') {
      // Save as JSON
      fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2));
      
      console.log(`✅ JSON backup created: ${filename}`);
      
      res.json({
        message: "JSON backup created successfully",
        filename: filename,
        size: fs.statSync(filePath).size,
        collections: Object.keys(backupData.collections).length,
        totalRecords: backupData.metadata.totalRecords
      });
      
    } else if (format === 'csv') {
      // Save as CSV files in a zip
      const output = fs.createWriteStream(filePath);
      const archive = archiver('zip', { 
        zlib: { level: 9 } 
      });

      output.on('close', () => {
        console.log(`✅ CSV backup created: ${filename}, size: ${archive.pointer()} bytes`);
        res.json({
          message: "CSV backup created successfully",
          filename: filename,
          size: archive.pointer(),
          collections: Object.keys(backupData.collections).length,
          totalRecords: backupData.metadata.totalRecords
        });
      });

      archive.on('error', (err) => {
        console.error('Archive error:', err);
        res.status(500).json({ 
          message: "CSV backup failed", 
          error: err.message 
        });
      });

      archive.pipe(output);

      // Add metadata
      archive.append(JSON.stringify(backupData.metadata, null, 2), { 
        name: 'metadata.json' 
      });

      // Helper function to convert MongoDB data to CSV-friendly format
      const convertForCSV = (data) => {
        return data.map(item => {
          const converted = {};
          
          for (const [key, value] of Object.entries(item)) {
            if (value === null || value === undefined) {
              converted[key] = '';
            } else if (typeof value === 'object') {
              // Handle MongoDB ObjectId
              if (value._id && typeof value._id === 'object' && value._id.toString) {
                converted[key] = value._id.toString();
              }
              // Handle Date objects
              else if (value instanceof Date) {
                converted[key] = value.toISOString();
              }
              // Handle nested objects (convert to JSON string)
              else if (typeof value === 'object' && !Array.isArray(value)) {
                converted[key] = JSON.stringify(value);
              }
              // Handle arrays (convert to JSON string)
              else if (Array.isArray(value)) {
                converted[key] = JSON.stringify(value);
              }
              // Handle Buffer objects (like _id)
              else if (Buffer.isBuffer(value)) {
                converted[key] = value.toString('hex');
              }
              else {
                converted[key] = String(value);
              }
            } else if (typeof value === 'boolean') {
              converted[key] = value ? 'true' : 'false';
            } else {
              converted[key] = String(value);
            }
          }
          
          return converted;
        });
      };

      // Convert each collection to CSV
      const collections = [
        { name: 'users', data: users },
        { name: 'inmates', data: inmates },
        { name: 'visitors', data: visitors },
        { name: 'guests', data: guests },
        { name: 'crimes', data: crimes },
        { name: 'visit_logs', data: visitLogs }
      ];

      for (const collection of collections) {
        if (collection.data && collection.data.length > 0) {
          try {
            // Convert data to CSV-friendly format
            const csvData = convertForCSV(collection.data);
            
            // Use json2csv for conversion
            const parser = new Parser();
            const csv = parser.parse(csvData);
            
            archive.append(csv, { name: `${collection.name}.csv` });
            console.log(`✅ Added ${collection.name}.csv with ${collection.data.length} records`);
            
          } catch (error) {
            console.warn(`⚠️ Could not convert ${collection.name} to CSV:`, error);
            // Add error information
            archive.append(
              `Error converting ${collection.name} to CSV: ${error.message}\n\nFirst record sample: ${JSON.stringify(collection.data[0], null, 2)}`,
              { name: `${collection.name}_ERROR.txt` }
            );
          }
        } else {
          console.log(`ℹ️ No data for ${collection.name}, skipping CSV`);
          archive.append('No data available for this collection', { 
            name: `${collection.name}_EMPTY.txt` 
          });
        }
      }

      // Add a README file explaining the CSV format
      const readmeContent = `CSV Backup Files - Format Explanation

Each CSV file contains data from the corresponding MongoDB collection.

Special Formatting:
- MongoDB ObjectId fields are converted to string format
- Date fields are converted to ISO string format (YYYY-MM-DDTHH:mm:ss.sssZ)
- Nested objects are converted to JSON strings
- Arrays are converted to JSON strings
- Boolean values are converted to 'true'/'false' strings
- Buffer objects are converted to hex strings

Files included:
- users.csv: System users data
- inmates.csv: Inmate records
- visitors.csv: Visitor records  
- guests.csv: Guest records
- crimes.csv: Crime definitions
- visit_logs.csv: Visit history logs

Backup created: ${new Date().toISOString()}
`;
      
      archive.append(readmeContent, { name: 'README.txt' });

      // Finalize the archive
      archive.finalize();

    } else {
      res.status(400).json({ 
        message: "Invalid format. Use 'json' or 'csv'" 
      });
    }

  } catch (error) {
    console.error('Backup creation error:', error);
    res.status(500).json({ 
      message: "Backup creation failed", 
      error: error.message 
    });
  }
});

// Simple CSV backup endpoint
app.post("/backups/create-csv-simple", async (req, res) => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `csv-simple-backup-${timestamp}.zip`;
    const filePath = path.join(backupsDir, filename);

    console.log(`🔄 Creating simple CSV backup: ${filename}`);

    // Fetch only users for testing (simplest collection)
    const users = await User.find().select('-password').lean();

    const output = fs.createWriteStream(filePath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      res.json({
        message: "Simple CSV backup created successfully",
        filename: filename,
        size: archive.pointer(),
        records: users.length
      });
    });

    archive.on('error', (err) => {
      throw err;
    });

    archive.pipe(output);

    // Simple CSV conversion
    if (users.length > 0) {
      const csv = Papa.unparse(users);
      archive.append(csv, { name: 'users.csv' });
    }

    // Add a readme file
    archive.append(
      'This is a simple CSV backup containing user data only.\nCreated: ' + new Date().toISOString(),
      { name: 'README.txt' }
    );

    archive.finalize();

  } catch (error) {
    console.error('Simple CSV backup error:', error);
    res.status(500).json({ 
      message: "Simple CSV backup failed", 
      error: error.message 
    });
  }
});

// Quick backup
app.post("/backups/quick", async (req, res) => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `quick-backup-${timestamp}.json`;
    const filePath = path.join(backupsDir, filename);

    console.log(`⚡ Creating quick backup: ${filename}`);

    // Fetch only essential data for quick backup
    const [users, inmates, visitors, guests] = await Promise.all([
      User.find().select('-password').lean(),
      Inmate.find().select('inmateCode lastName firstName status cellId crime').lean(),
      Visitor.find().select('id lastName firstName status prisonerId totalVisits lastVisitDate').lean(),
      Guest.find().select('id lastName firstName status visitPurpose totalVisits lastVisitDate').lean()
    ]);

    const quickBackupData = {
      metadata: {
        version: '1.0',
        created: new Date().toISOString(),
        type: 'quick',
        collections: 4,
        totalRecords: users.length + inmates.length + visitors.length + guests.length
      },
      collections: {
        users,
        inmates,
        visitors,
        guests
      }
    };

    fs.writeFileSync(filePath, JSON.stringify(quickBackupData, null, 2));

    res.json({
      message: "Quick backup created successfully",
      filename: filename,
      size: fs.statSync(filePath).size,
      type: 'quick'
    });

  } catch (error) {
    console.error('Quick backup error:', error);
    res.status(500).json({ 
      message: "Quick backup failed", 
      error: error.message 
    });
  }
});

// Download backup
app.get("/backups/download/:filename", (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(backupsDir, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "Backup file not found" });
    }

    // Security check - prevent directory traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ message: "Invalid filename" });
    }

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    if (filename.endsWith('.json')) {
      res.setHeader('Content-Type', 'application/json');
    } else if (filename.endsWith('.zip')) {
      res.setHeader('Content-Type', 'application/zip');
    }

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ 
      message: "Download failed", 
      error: error.message 
    });
  }
});

// Delete backup
app.delete("/backups/:filename", (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(backupsDir, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "Backup file not found" });
    }

    // Security check
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ message: "Invalid filename" });
    }

    fs.unlinkSync(filePath);

    res.json({ 
      message: "Backup deleted successfully",
      filename: filename
    });

  } catch (error) {
    console.error('Delete backup error:', error);
    res.status(500).json({ 
      message: "Failed to delete backup", 
      error: error.message 
    });
  }
});

// Restore backup
app.post("/backups/restore/:filename", async (req, res) => {
  let session = null;
  try {
    const filename = req.params.filename;
    const filePath = path.join(backupsDir, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "Backup file not found" });
    }

    console.log(`🔄 Restoring from backup: ${filename}`);

    // Start MongoDB transaction for atomic restore
    session = await mongoose.startSession();
    session.startTransaction();

    let backupData;
    
    if (filename.endsWith('.json')) {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      backupData = JSON.parse(fileContent);
    } else {
      return res.status(400).json({ message: "Only JSON backups can be restored currently" });
    }

    const results = {
      restored: {},
      errors: {},
      totalRestored: 0
    };

    // Restore each collection
    const collections = {
      users: User,
      inmates: Inmate,
      visitors: Visitor,
      guests: Guest,
      crimes: Crime,
      visitLogs: VisitLog
    };

    for (const [collectionName, Model] of Object.entries(collections)) {
      if (backupData.collections[collectionName]) {
        try {
          // Delete existing data
          await Model.deleteMany({}, { session });
          
          // Insert backup data
          if (backupData.collections[collectionName].length > 0) {
            const inserted = await Model.insertMany(backupData.collections[collectionName], { 
              session,
              ordered: false 
            });
            results.restored[collectionName] = inserted.length;
            results.totalRestored += inserted.length;
          } else {
            results.restored[collectionName] = 0;
          }
        } catch (error) {
          results.errors[collectionName] = error.message;
          console.error(`Error restoring ${collectionName}:`, error);
        }
      }
    }

    // Commit transaction
    await session.commitTransaction();
    
    res.json({
      message: "Backup restored successfully",
      results: results,
      backup: {
        filename: filename,
        created: backupData.metadata?.created,
        collections: Object.keys(results.restored).length
      }
    });

  } catch (error) {
    // Abort transaction on error
    if (session) {
      await session.abortTransaction();
    }
    console.error('Restore error:', error);
    res.status(500).json({ 
      message: "Restore failed", 
      error: error.message 
    });
  } finally {
    if (session) {
      session.endSession();
    }
  }
});

// Database statistics endpoint
app.get("/database/stats", async (req, res) => {
  try {
    const stats = await getDatabaseStats();
    res.json(stats);
  } catch (error) {
    console.error('Database stats error:', error);
    res.status(500).json({ 
      message: "Failed to fetch database stats", 
      error: error.message 
    });
  }
});

// System health check endpoint
app.get("/health", async (req, res) => {
  try {
    // Check database connection
    const dbState = mongoose.connection.readyState;
    const database = dbState === 1 ? 'connected' : 'disconnected';

    // Get memory usage
    const memoryUsage = process.memoryUsage();
    const memoryUsed = `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`;

    // Get uptime
    const uptime = process.uptime();

    // Get backup count
    const backupFiles = fs.readdirSync(backupsDir).filter(file => 
      file.endsWith('.json') || file.endsWith('.zip')
    );

    // Get active connections/collections stats
    const [usersCount, activeTimers] = await Promise.all([
      User.countDocuments(),
      VisitLog.countDocuments({ 
        isTimerActive: true, 
        timerEnd: { $gt: new Date() } 
      })
    ]);

    res.json({
      status: 'healthy',
      database: database,
      uptime: Math.floor(uptime),
      memory: {
        used: memoryUsed,
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`
      },
      backups: {
        count: backupFiles.length,
        lastBackup: await getLastBackupDate()
      },
      active: {
        users: usersCount,
        timers: activeTimers
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      status: 'unhealthy',
      database: 'error',
      uptime: process.uptime(),
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Auto-backup endpoint (can be called by cron job)
app.post("/backups/auto", async (req, res) => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `auto-backup-${timestamp}.json`;
    const filePath = path.join(backupsDir, filename);

    console.log(`🤖 Creating auto backup: ${filename}`);

    // Simple auto backup - just essential collections
    const [inmates, visitors, guests] = await Promise.all([
      Inmate.find().select('inmateCode lastName firstName status cellId crime').lean(),
      Visitor.find().select('id lastName firstName status prisonerId totalVisits lastVisitDate').lean(),
      Guest.find().select('id lastName firstName status visitPurpose totalVisits lastVisitDate').lean()
    ]);

    const autoBackupData = {
      metadata: {
        version: '1.0',
        created: new Date().toISOString(),
        type: 'auto',
        collections: 3,
        totalRecords: inmates.length + visitors.length + guests.length
      },
      collections: {
        inmates,
        visitors,
        guests
      }
    };

    fs.writeFileSync(filePath, JSON.stringify(autoBackupData, null, 2));

    // Cleanup old auto backups (keep last 10)
    const autoBackups = fs.readdirSync(backupsDir)
      .filter(file => file.startsWith('auto-backup-') && file.endsWith('.json'))
      .sort()
      .reverse();

    if (autoBackups.length > 10) {
      const toDelete = autoBackups.slice(10);
      toDelete.forEach(file => {
        fs.unlinkSync(path.join(backupsDir, file));
        console.log(`🧹 Deleted old auto backup: ${file}`);
      });
    }

    res.json({
      message: "Auto backup created successfully",
      filename: filename,
      size: fs.statSync(filePath).size,
      type: 'auto',
      cleanup: {
        deleted: autoBackups.length > 10 ? autoBackups.length - 10 : 0
      }
    });

  } catch (error) {
    console.error('Auto backup error:', error);
    res.status(500).json({ 
      message: "Auto backup failed", 
      error: error.message 
    });
  }
});

// Cleanup old backups endpoint
app.post("/backups/cleanup", async (req, res) => {
  try {
    const { keepLast = 20 } = req.body;

    const allBackups = fs.readdirSync(backupsDir)
      .filter(file => file.endsWith('.json') || file.endsWith('.zip'))
      .map(file => {
        const filePath = path.join(backupsDir, file);
        return {
          filename: file,
          path: filePath,
          mtime: fs.statSync(filePath).mtime
        };
      })
      .sort((a, b) => new Date(b.mtime) - new Date(a.mtime));

    const toDelete = allBackups.slice(keepLast);
    let deletedCount = 0;

    toDelete.forEach(backup => {
      try {
        fs.unlinkSync(backup.path);
        deletedCount++;
        console.log(`🧹 Deleted old backup: ${backup.filename}`);
      } catch (error) {
        console.error(`Error deleting ${backup.filename}:`, error);
      }
    });

    res.json({
      message: "Cleanup completed",
      totalBackups: allBackups.length,
      kept: allBackups.length - toDelete.length,
      deleted: deletedCount,
      details: {
        before: allBackups.length,
        after: allBackups.length - deletedCount
      }
    });

  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({ 
      message: "Cleanup failed", 
      error: error.message 
    });
  }
});

// ======================
// ANALYTICS & REPORTS ENDPOINTS
// ======================

// Get analytics and reports data
app.get("/analytics/reports", async (req, res) => {
  try {
    const { startDate, endDate, reportType = 'daily' } = req.query;
    
    console.log('📊 Generating analytics report:', { startDate, endDate, reportType });

    // Parse dates with proper validation
    const start = startDate ? new Date(startDate) : new Date(new Date().setMonth(new Date().getMonth() - 1));
    const end = endDate ? new Date(endDate + 'T23:59:59.999Z') : new Date();
    
    // Get counts for raw data
    const [visitorsCount, guestsCount, inmatesCount, visitLogsCount] = await Promise.all([
      Visitor.countDocuments(),
      Guest.countDocuments(),
      Inmate.countDocuments(),
      VisitLog.countDocuments({
        visitDate: { $gte: start, $lte: end }
      })
    ]);

    const rawData = {
      visitors: visitorsCount,
      guests: guestsCount,
      inmates: inmatesCount,
      visitLogs: visitLogsCount
    };

    let chartData = [];
    let summaryData = {};

    // Generate different analytics based on report type
    switch (reportType) {
      case 'daily':
        ({ chartData, summaryData } = await generateDailyAnalytics(start, end));
        break;
      case 'weekly':
        ({ chartData, summaryData } = await generateWeeklyAnalytics(start, end));
        break;
      case 'monthly':
        ({ chartData, summaryData } = await generateMonthlyAnalytics(start, end));
        break;
      case 'yearly':
        ({ chartData, summaryData } = await generateYearlyAnalytics(start, end));
        break;
      case 'demographic':
        ({ chartData, summaryData } = await generateDemographicAnalytics());
        break;
      case 'performance':
        ({ chartData, summaryData } = await generatePerformanceAnalytics(start, end));
        break;
      default:
        ({ chartData, summaryData } = await generateDailyAnalytics(start, end));
    }

    // Add system statistics to summary
    summaryData.totalVisitors = visitorsCount;
    summaryData.totalGuests = guestsCount;
    summaryData.totalInmates = inmatesCount;
    summaryData.totalVisitLogs = visitLogsCount;

    res.json({
      success: true,
      chartData,
      summaryData,
      rawData,
      reportType,
      dateRange: { startDate: start, endDate: end }
    });

  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({
      success: false,
      message: "Failed to generate analytics report",
      error: error.message
    });
  }
});

// Helper function for daily analytics
const generateDailyAnalytics = async (start, end) => {
  const visitLogs = await VisitLog.find({
    visitDate: { $gte: start, $lte: end }
  }).sort({ visitDate: 1 });

  // Group by date
  const dailyData = {};
  visitLogs.forEach(log => {
    const dateStr = log.visitDate.toISOString().split('T')[0];
    if (!dailyData[dateStr]) {
      dailyData[dateStr] = { visitors: 0, guests: 0, total: 0 };
    }
    
    if (log.personType === 'visitor') {
      dailyData[dateStr].visitors++;
    } else {
      dailyData[dateStr].guests++;
    }
    dailyData[dateStr].total++;
  });

  // Convert to chart format
  const chartData = Object.entries(dailyData).map(([date, data]) => ({
    name: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    visitors: data.visitors,
    guests: data.guests,
    total: data.total,
    date: date
  }));

  // Calculate summary
  const totalVisits = visitLogs.length;
  const totalVisitors = visitLogs.filter(log => log.personType === 'visitor').length;
  const totalGuests = visitLogs.filter(log => log.personType === 'guest').length;
  const avgDailyVisits = totalVisits / Math.max(1, Object.keys(dailyData).length);

  const summaryData = {
    totalVisits,
    totalVisitors,
    totalGuests,
    avgDailyVisits: Math.round(avgDailyVisits * 10) / 10,
    dateRange: `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`,
    daysWithVisits: Object.keys(dailyData).length
  };

  return { chartData, summaryData };
};

// Helper function for weekly analytics
const generateWeeklyAnalytics = async (start, end) => {
  const visitLogs = await VisitLog.find({
    visitDate: { $gte: start, $lte: end }
  });

  // Group by week
  const weeklyData = {};
  visitLogs.forEach(log => {
    const weekStart = getWeekStartDate(log.visitDate);
    const weekKey = weekStart.toISOString().split('T')[0];
    
    if (!weeklyData[weekKey]) {
      weeklyData[weekKey] = { visitors: 0, guests: 0, total: 0 };
    }
    
    if (log.personType === 'visitor') {
      weeklyData[weekKey].visitors++;
    } else {
      weeklyData[weekKey].guests++;
    }
    weeklyData[weekKey].total++;
  });

  const chartData = Object.entries(weeklyData).map(([weekStart, data]) => ({
    name: `Week ${new Date(weekStart).getDate()}/${new Date(weekStart).getMonth() + 1}`,
    visitors: data.visitors,
    guests: data.guests,
    total: data.total,
    weekStart: weekStart
  }));

  const totalVisits = visitLogs.length;
  const summaryData = {
    totalVisits,
    weeklyAverage: Math.round(totalVisits / Math.max(1, Object.keys(weeklyData).length)),
    weeksAnalyzed: Object.keys(weeklyData).length,
    peakWeek: Math.max(...Object.values(weeklyData).map(w => w.total))
  };

  return { chartData, summaryData };
};

// Helper function for monthly analytics
const generateMonthlyAnalytics = async (start, end) => {
  const visitLogs = await VisitLog.find({
    visitDate: { $gte: start, $lte: end }
  });

  const monthlyData = {};
  visitLogs.forEach(log => {
    const monthKey = log.visitDate.toISOString().substring(0, 7); // YYYY-MM
    
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = { visitors: 0, guests: 0, total: 0 };
    }
    
    if (log.personType === 'visitor') {
      monthlyData[monthKey].visitors++;
    } else {
      monthlyData[monthKey].guests++;
    }
    monthlyData[monthKey].total++;
  });

  const chartData = Object.entries(monthlyData).map(([month, data]) => ({
    name: new Date(month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    visitors: data.visitors,
    guests: data.guests,
    total: data.total,
    month: month
  }));

  const totalVisits = visitLogs.length;
  const summaryData = {
    totalVisits,
    monthlyAverage: Math.round(totalVisits / Math.max(1, Object.keys(monthlyData).length)),
    monthsAnalyzed: Object.keys(monthlyData).length,
    peakMonth: Math.max(...Object.values(monthlyData).map(m => m.total))
  };

  return { chartData, summaryData };
};

// Helper function for yearly analytics
const generateYearlyAnalytics = async (start, end) => {
  const visitLogs = await VisitLog.find({
    visitDate: { $gte: start, $lte: end }
  });

  const yearlyData = {};
  visitLogs.forEach(log => {
    const yearKey = log.visitDate.getFullYear().toString();
    
    if (!yearlyData[yearKey]) {
      yearlyData[yearKey] = { visitors: 0, guests: 0, total: 0 };
    }
    
    if (log.personType === 'visitor') {
      yearlyData[yearKey].visitors++;
    } else {
      yearlyData[yearKey].guests++;
    }
    yearlyData[yearKey].total++;
  });

  const chartData = Object.entries(yearlyData).map(([year, data]) => ({
    name: year,
    visitors: data.visitors,
    guests: data.guests,
    total: data.total,
    year: year
  }));

  const totalVisits = visitLogs.length;
  const summaryData = {
    totalVisits,
    yearlyAverage: Math.round(totalVisits / Math.max(1, Object.keys(yearlyData).length)),
    yearsAnalyzed: Object.keys(yearlyData).length,
    peakYear: Math.max(...Object.values(yearlyData).map(y => y.total))
  };

  return { chartData, summaryData };
};

// Helper function for demographic analytics
const generateDemographicAnalytics = async () => {
  const [visitors, guests, inmates] = await Promise.all([
    Visitor.find().select('sex age').lean(),
    Guest.find().select('sex age').lean(),
    Inmate.find().select('sex').lean()
  ]);

  // Gender distribution
  const genderData = {
    male: 0,
    female: 0
  };

  [...visitors, ...guests, ...inmates].forEach(person => {
    if (person.sex === 'Male') genderData.male++;
    else if (person.sex === 'Female') genderData.female++;
  });

  const chartData = [
    { name: 'Male', value: genderData.male },
    { name: 'Female', value: genderData.female }
  ];

  const summaryData = {
    totalPeople: visitors.length + guests.length + inmates.length,
    maleCount: genderData.male,
    femaleCount: genderData.female,
    genderRatio: `${Math.round((genderData.male / (genderData.male + genderData.female)) * 100)}% Male`
  };

  return { chartData, summaryData };
};

// Helper function for performance analytics
const generatePerformanceAnalytics = async (start, end) => {
  const visitLogs = await VisitLog.find({
    visitDate: { $gte: start, $lte: end },
    timeOut: { $ne: null }
  });

  // Calculate average duration and visits per day
    const dailyPerformance = {};
    visitLogs.forEach(log => {
      const dateStr = log.visitDate.toISOString().split('T')[0];
      if (!dailyPerformance[dateStr]) {
        dailyPerformance[dateStr] = { visits: 0, totalDuration: 0 };
      }
      dailyPerformance[dateStr].visits++;
      
      // Simple duration calculation (you can enhance this)
      if (log.timeIn && log.timeOut) {
        // Mock duration calculation - in real scenario, calculate actual duration
        dailyPerformance[dateStr].totalDuration += 60; // 60 minutes average
      }
    });

    const chartData = Object.entries(dailyPerformance).map(([date, data]) => ({
      name: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      visits: data.visits,
      avgDuration: Math.round(data.totalDuration / data.visits),
      date: date
    }));

    const totalVisits = visitLogs.length;
    const avgDuration = totalVisits > 0 ? 
      Math.round(Object.values(dailyPerformance).reduce((sum, day) => sum + day.totalDuration, 0) / totalVisits) : 0;

    const summaryData = {
      totalCompletedVisits: totalVisits,
      averageDuration: avgDuration + ' mins',
      busiestDay: Math.max(...Object.values(dailyPerformance).map(d => d.visits)),
      efficiencyScore: Math.round((totalVisits / Math.max(1, Object.keys(dailyPerformance).length)) * 10) / 10
    };

    return { chartData, summaryData };
};

// Helper function to get week start date (Monday)
const getWeekStartDate = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is Sunday
  return new Date(d.setDate(diff));
};

// Get real-time dashboard statistics
app.get("/analytics/dashboard-stats", async (req, res) => {
  try {
    const today = new Date();
    const todayStart = new Date(today.setHours(0, 0, 0, 0));
    const todayEnd = new Date(today.setHours(23, 59, 59, 999));

    const [
      totalVisitors,
      totalGuests,
      totalInmates,
      todayVisits,
      activeTimers,
      pendingApprovals
    ] = await Promise.all([
      Visitor.countDocuments(),
      Guest.countDocuments(),
      Inmate.countDocuments(),
      VisitLog.countDocuments({
        visitDate: { $gte: todayStart, $lte: todayEnd }
      }),
      VisitLog.countDocuments({
        isTimerActive: true,
        timerEnd: { $gt: new Date() }
      }),
      Visitor.countDocuments({ status: 'pending' }) + Guest.countDocuments({ status: 'pending' })
    ]);

    // Weekly trend
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - 7);
    const lastWeekVisits = await VisitLog.countDocuments({
      visitDate: { $gte: weekStart, $lte: todayEnd }
    });

    res.json({
      success: true,
      stats: {
        totalVisitors,
        totalGuests,
        totalInmates,
        todayVisits,
        activeTimers,
        pendingApprovals,
        lastWeekVisits
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard stats",
      error: error.message
    });
  }
});

// ======================
// HEALTH CHECK
// ======================

app.get("/", (req, res) => {
  res.json({ 
    message: "Prison Management System API", 
    status: "healthy",
    timestamp: new Date().toISOString()
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📁 Upload directory: ${uploadDir}`);
  console.log(`🖼️ Access images at: http://localhost:${PORT}/uploads/filename`);
  console.log(`⏰ Timer system: ACTIVE - 3-hour visit duration`);
  console.log(`🔍 Smart scanning: ENABLED - Daily visit limits enforced`);
  console.log(`📊 Visit History: ENABLED - Complete visit tracking with statistics`);
});