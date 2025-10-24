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

// Visitor Schema with Daily Visit Tracking
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
  
  // Current day status (for quick lookup)
  currentDayStatus: {
    visitDate: Date,
    hasTimedIn: { type: Boolean, default: false },
    hasTimedOut: { type: Boolean, default: false },
    timeIn: String,
    timeOut: String
  },
  
  // Status and violations
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected'], 
    default: 'pending' 
  },
  violationType: String,
  violationDetails: String,
  
  // System fields
  qrCode: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

visitorSchema.virtual('fullName').get(function() {
  return `${this.lastName}, ${this.firstName} ${this.middleName || ''} ${this.extension || ''}`.trim();
});

visitorSchema.virtual('timeRemaining').get(function() {
  if (!this.isTimerActive || !this.timerEnd) return null;
  const now = new Date();
  const end = new Date(this.timerEnd);
  return Math.max(0, end - now);
});

visitorSchema.virtual('timeRemainingMinutes').get(function() {
  const remaining = this.timeRemaining;
  if (remaining === null) return null;
  return Math.floor(remaining / (1000 * 60));
});

const Visitor = mongoose.model('Visitor', visitorSchema);

const guestSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  lastName: { type: String, required: true },
  firstName: { type: String, required: true },
  middleName: String,
  extension: String,
  
  // ADD THESE FIELDS TO GUEST SCHEMA:
  photo: String, // ADD THIS LINE
  dateOfBirth: Date,
  age: Number,
  sex: { type: String, enum: ['Male', 'Female'] },
  address: String,
  contact: String,
  
  // Visit details
  visitPurpose: { type: String, required: true },
  dateVisited: { type: Date, default: Date.now },
  timeIn: String,
  timeOut: String,
  hasTimedIn: { type: Boolean, default: false },
  hasTimedOut: { type: Boolean, default: false },
  lastVisitDate: Date,
  
  // Daily visit tracking
  dailyVisits: [{
    visitDate: { type: Date, required: true },
    timeIn: String,
    timeOut: String,
    hasTimedIn: { type: Boolean, default: false },
    hasTimedOut: { type: Boolean, default: false },
    visitLogId: { type: mongoose.Schema.Types.ObjectId, ref: 'VisitLog' }
  }],
  
  // Current day status
  currentDayStatus: {
    visitDate: Date,
    hasTimedIn: { type: Boolean, default: false },
    hasTimedOut: { type: Boolean, default: false },
    timeIn: String,
    timeOut: String
  },
  
  // ADD VIOLATION FIELDS TO GUEST SCHEMA:
  violationType: String, // ADD THIS LINE
  violationDetails: String, // ADD THIS LINE
  
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
// SMART SCAN PROCESSING ENDPOINTS
// ======================

// ======================
// SMART SCAN PROCESSING ENDPOINTS - UPDATED
// ======================

// SMART SCAN PROCESSING - Handles both visitors and guests with daily limits
app.post("/scan-process", async (req, res) => {
  try {
    const { qrData, personId, isGuest } = req.body;
    
    console.log('🔍 Processing scan request:', { 
      personId, 
      isGuest, 
      qrData: qrData ? qrData.substring(0, 100) + '...' : 'empty' 
    });

    // Validate required fields
    if (!personId) {
      return res.status(400).json({ 
        message: "Person ID is required" 
      });
    }

    let person;
    try {
      if (isGuest) {
        person = await Guest.findOne({ id: personId });
      } else {
        person = await Visitor.findOne({ id: personId });
      }
    } catch (dbError) {
      console.error('❌ Database error:', dbError);
      return res.status(500).json({ 
        message: "Database error while fetching person", 
        error: dbError.message 
      });
    }

    if (!person) {
      console.log('❌ Person not found:', { personId, isGuest });
      return res.status(404).json({ 
        message: `${isGuest ? 'Guest' : 'Visitor'} with ID ${personId} not found` 
      });
    }

    const today = new Date();
    const todayDateString = today.toISOString().split('T')[0];
    
    // Find today's visit record
    let todayVisit = person.dailyVisits.find(visit => {
      if (!visit.visitDate) return false;
      const visitDate = new Date(visit.visitDate).toISOString().split('T')[0];
      return visitDate === todayDateString;
    });

    let scanResult = {
      person: person,
      scanType: '',
      message: '',
      canProceed: false,
      requiresApproval: false,
      todayVisit: todayVisit
    };

    console.log('📊 Today visit status:', { 
      hasTodayVisit: !!todayVisit,
      hasTimedIn: todayVisit?.hasTimedIn,
      hasTimedOut: todayVisit?.hasTimedOut 
    });

    // SCANNING LOGIC
    if (!todayVisit) {
      // FIRST SCAN OF THE DAY - TIME IN REQUEST
      scanResult.scanType = 'time_in_pending';
      scanResult.message = `🕒 ${isGuest ? 'GUEST' : 'VISITOR'} TIME IN REQUEST - Ready for first visit today`;
      scanResult.canProceed = true;
      scanResult.requiresApproval = true;
      
    } else if (todayVisit && !todayVisit.hasTimedIn) {
      // HAS VISIT RECORD BUT NOT TIMED IN YET
      scanResult.scanType = 'time_in_pending';
      scanResult.message = `🕒 ${isGuest ? 'GUEST' : 'VISITOR'} TIME IN REQUEST - Ready to start visit`;
      scanResult.canProceed = true;
      scanResult.requiresApproval = true;
      
    } else if (todayVisit && todayVisit.hasTimedIn && !todayVisit.hasTimedOut) {
      // HAS TIMED IN BUT NOT TIMED OUT - TIME OUT REQUEST
      scanResult.scanType = 'time_out_pending';
      scanResult.message = `🕒 ${isGuest ? 'GUEST' : 'VISITOR'} TIME OUT REQUEST - Ready to end visit`;
      scanResult.canProceed = true;
      scanResult.requiresApproval = true;
      
    } else if (todayVisit && todayVisit.hasTimedIn && todayVisit.hasTimedOut) {
      // ALREADY COMPLETED VISIT FOR TODAY
      scanResult.scanType = 'completed';
      scanResult.message = `✅ You have already completed your visit today. Please come back tomorrow.`;
      scanResult.canProceed = false;
      scanResult.requiresApproval = false;
    } else {
      // FALLBACK - Should not happen, but just in case
      scanResult.scanType = 'time_in_pending';
      scanResult.message = `🕒 ${isGuest ? 'GUEST' : 'VISITOR'} TIME IN REQUEST - Ready for visit`;
      scanResult.canProceed = true;
      scanResult.requiresApproval = true;
    }

    console.log('📊 Final scan result:', scanResult.scanType);
    res.json(scanResult);

  } catch (error) {
    console.error('❌ Scan processing error:', error);
    res.status(500).json({ 
      message: 'Failed to process scan', 
      error: error.message,
      stack: error.stack 
    });
  }
});

// APPROVE VISITOR TIME IN - FIXED to always create visit log
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

    // ALWAYS CREATE NEW VISIT LOG FOR TIME IN
    const timerStart = new Date();
    const timerEnd = new Date(timerStart.getTime() + (3 * 60 * 60 * 1000)); // 3 hours

    // Get inmate name for visit log
    let inmateName = 'Unknown Inmate';
    try {
      const inmate = await Inmate.findOne({ inmateCode: visitor.prisonerId });
      if (inmate) inmateName = inmate.fullName;
    } catch (inmateError) {
      console.warn('⚠️ Could not fetch inmate details:', inmateError);
    }

    // CREATE VISIT LOG (ALWAYS CREATE NEW ONE)
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

    // Update visitor record
    visitor.hasTimedIn = true;
    visitor.hasTimedOut = false;
    visitor.timeIn = currentTime;
    visitor.timeOut = null;
    visitor.isTimerActive = true;
    visitor.timerStart = timerStart;
    visitor.timerEnd = timerEnd;
    visitor.lastVisitDate = today;
    visitor.dateVisited = today;

    // Add to daily visits
    const todayVisit = {
      visitDate: today,
      timeIn: currentTime,
      hasTimedIn: true,
      hasTimedOut: false,
      timerStart: timerStart,
      timerEnd: timerEnd,
      isTimerActive: true,
      visitLogId: visitLog._id
    };
    
    // Remove any existing today's visit and add new one
    visitor.dailyVisits = visitor.dailyVisits.filter(visit => {
      const visitDate = new Date(visit.visitDate).toISOString().split('T')[0];
      return visitDate !== todayDateString;
    });
    visitor.dailyVisits.push(todayVisit);

    await visitor.save();

    const visitorWithFullName = {
      ...visitor.toObject(),
      fullName: visitor.fullName
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

// APPROVE VISITOR TIME OUT - FIXED to properly update visit log
app.put("/visitors/:id/approve-time-out", async (req, res) => {
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

    // Find today's visit
    const todayVisit = visitor.dailyVisits.find(visit => {
      const visitDate = new Date(visit.visitDate).toISOString().split('T')[0];
      return visitDate === todayDateString;
    });

    if (!todayVisit || !todayVisit.hasTimedIn) {
      return res.status(400).json({ message: "Visitor has not timed in today" });
    }

    // Update today's visit
    todayVisit.timeOut = currentTime;
    todayVisit.hasTimedOut = true;
    todayVisit.isTimerActive = false;

    // Update main visitor record
    visitor.hasTimedOut = true;
    visitor.timeOut = currentTime;
    visitor.isTimerActive = false;

    // UPDATE VISIT LOG - FIXED
    if (todayVisit.visitLogId) {
      // Calculate duration
      const timeInDate = new Date();
      const [timeInHours, timeInMinutes, timeInPeriod] = todayVisit.timeIn.split(/:| /);
      let timeInHour = parseInt(timeInHours);
      if (timeInPeriod === 'PM' && timeInHour !== 12) timeInHour += 12;
      if (timeInPeriod === 'AM' && timeInHour === 12) timeInHour = 0;
      
      const timeOutDate = new Date();
      const [timeOutHours, timeOutMinutes, timeOutPeriod] = currentTime.split(/:| /);
      let timeOutHour = parseInt(timeOutHours);
      if (timeOutPeriod === 'PM' && timeOutHour !== 12) timeOutHour += 12;
      if (timeOutPeriod === 'AM' && timeOutHour === 12) timeOutHour = 0;
      
      timeInDate.setHours(timeInHour, parseInt(timeInMinutes), 0, 0);
      timeOutDate.setHours(timeOutHour, parseInt(timeOutMinutes), 0, 0);
      
      const durationMs = timeOutDate - timeInDate;
      const durationMinutes = Math.floor(durationMs / (1000 * 60));
      const durationHours = Math.floor(durationMinutes / 60);
      const remainingMinutes = durationMinutes % 60;
      const visitDuration = `${durationHours}h ${remainingMinutes}m`;

      console.log('🔄 Updating visit log with time out:', {
        visitLogId: todayVisit.visitLogId,
        timeOut: currentTime,
        duration: visitDuration
      });

      const updatedLog = await VisitLog.findByIdAndUpdate(
        todayVisit.visitLogId,
        {
          timeOut: currentTime,
          visitDuration: visitDuration,
          isTimerActive: false,
          status: 'completed'
        },
        { new: true }
      );

      console.log('✅ Visit log updated:', updatedLog);
    }

    await visitor.save();

    const visitorWithFullName = {
      ...visitor.toObject(),
      fullName: visitor.fullName
    };

    res.json({ 
      message: "Time out approved and visit completed",
      visitor: visitorWithFullName
    });

  } catch (error) {
    console.error("Error approving time out:", error);
    res.status(500).json({ message: "Failed to approve time out", error: error.message });
  }
});

// APPROVE GUEST TIME IN - FIXED to always create visit log
app.put("/guests/:id/approve-time-in", async (req, res) => {
  try {
    const guest = await Guest.findOne({ id: req.params.id });
    if (!guest) return res.status(404).json({ message: "Guest not found" });

    const today = new Date();
    const todayDateString = today.toISOString().split('T')[0];
    const currentTime = new Date().toLocaleTimeString('en-US', { 
      hour12: true,
      hour: '2-digit',
      minute: '2-digit'
    });

    // ALWAYS CREATE NEW VISIT LOG FOR GUEST TIME IN
    const visitLog = new VisitLog({
      personId: guest.id,
      personName: guest.fullName,
      personType: 'guest',
      prisonerId: null,
      inmateName: null,
      visitDate: today,
      timeIn: currentTime,
      isTimerActive: false,
      status: 'in-progress'
    });

    await visitLog.save();

    // Update guest record
    guest.hasTimedIn = true;
    guest.hasTimedOut = false;
    guest.timeIn = currentTime;
    guest.timeOut = null;
    guest.lastVisitDate = today;
    guest.dateVisited = today;
    guest.status = 'approved';

    // Add to daily visits
    const todayVisit = {
      visitDate: today,
      timeIn: currentTime,
      hasTimedIn: true,
      hasTimedOut: false,
      visitLogId: visitLog._id
    };
    
    // Remove any existing today's visit and add new one
    guest.dailyVisits = guest.dailyVisits.filter(visit => {
      const visitDate = new Date(visit.visitDate).toISOString().split('T')[0];
      return visitDate !== todayDateString;
    });
    guest.dailyVisits.push(todayVisit);

    await guest.save();

    const guestWithFullName = {
      ...guest.toObject(),
      fullName: guest.fullName
    };

    res.json({ 
      message: "Guest time in approved",
      guest: guestWithFullName,
      visitLog: visitLog
    });

  } catch (error) {
    console.error("Error approving guest time in:", error);
    res.status(500).json({ message: "Failed to approve guest time in", error: error.message });
  }
});

// APPROVE GUEST TIME OUT - FIXED to properly update visit log
app.put("/guests/:id/approve-time-out", async (req, res) => {
  try {
    const guest = await Guest.findOne({ id: req.params.id });
    if (!guest) return res.status(404).json({ message: "Guest not found" });

    const today = new Date();
    const todayDateString = today.toISOString().split('T')[0];
    const currentTime = new Date().toLocaleTimeString('en-US', { 
      hour12: true,
      hour: '2-digit',
      minute: '2-digit'
    });

    // Find today's visit
    const todayVisit = guest.dailyVisits.find(visit => {
      const visitDate = new Date(visit.visitDate).toISOString().split('T')[0];
      return visitDate === todayDateString;
    });

    if (!todayVisit || !todayVisit.hasTimedIn) {
      return res.status(400).json({ message: "Guest has not timed in today" });
    }

    // Update today's visit
    todayVisit.timeOut = currentTime;
    todayVisit.hasTimedOut = true;

    // Update main guest record
    guest.hasTimedOut = true;
    guest.timeOut = currentTime;
    guest.status = 'completed';

    // UPDATE VISIT LOG - FIXED for guest
    if (todayVisit.visitLogId) {
      // Calculate duration for guest
      const timeInDate = new Date();
      const [timeInHours, timeInMinutes, timeInPeriod] = todayVisit.timeIn.split(/:| /);
      let timeInHour = parseInt(timeInHours);
      if (timeInPeriod === 'PM' && timeInHour !== 12) timeInHour += 12;
      if (timeInPeriod === 'AM' && timeInHour === 12) timeInHour = 0;
      
      const timeOutDate = new Date();
      const [timeOutHours, timeOutMinutes, timeOutPeriod] = currentTime.split(/:| /);
      let timeOutHour = parseInt(timeOutHours);
      if (timeOutPeriod === 'PM' && timeOutHour !== 12) timeOutHour += 12;
      if (timeOutPeriod === 'AM' && timeOutHour === 12) timeOutHour = 0;
      
      timeInDate.setHours(timeInHour, parseInt(timeInMinutes), 0, 0);
      timeOutDate.setHours(timeOutHour, parseInt(timeOutMinutes), 0, 0);
      
      const durationMs = timeOutDate - timeInDate;
      const durationMinutes = Math.floor(durationMs / (1000 * 60));
      const durationHours = Math.floor(durationMinutes / 60);
      const remainingMinutes = durationMinutes % 60;
      const visitDuration = `${durationHours}h ${remainingMinutes}m`;

      console.log('🔄 Updating guest visit log with time out:', {
        visitLogId: todayVisit.visitLogId,
        timeOut: currentTime,
        duration: visitDuration
      });

      const updatedLog = await VisitLog.findByIdAndUpdate(
        todayVisit.visitLogId,
        {
          timeOut: currentTime,
          visitDuration: visitDuration,
          status: 'completed'
        },
        { new: true }
      );

      console.log('✅ Guest visit log updated:', updatedLog);
    }

    await guest.save();

    const guestWithFullName = {
      ...guest.toObject(),
      fullName: guest.fullName
    };

    res.json({ 
      message: "Guest time out approved",
      guest: guestWithFullName
    });

  } catch (error) {
    console.error("Error approving guest time out:", error);
    res.status(500).json({ message: "Failed to approve guest time out", error: error.message });
  }
});

// ======================
// CLEAR TIME RECORDS ENDPOINT
// ======================

app.put("/clear-time-records/:personId", async (req, res) => {
  try {
    const { personId } = req.params;
    const { date, personType } = req.body;

    console.log('🔄 Clearing time records for:', { personId, personType, date });

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

    // SIMPLE RESET - Just clear the main time fields
    const updateData = {
      hasTimedIn: false,
      hasTimedOut: false,
      timeIn: null,
      timeOut: null,
      isTimerActive: false,
      timerStart: null,
      timerEnd: null,
      lastVisitDate: null,
      dateVisited: null
    };

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

    res.json({ 
      message: `Time records cleared for ${person.fullName}. They can now scan again.`,
      success: true,
      person: updatedPerson
    });

  } catch (error) {
    console.error("❌ Error clearing time records:", error);
    res.status(500).json({ 
      message: "Failed to clear time records", 
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

// Get active visit logs (for dashboard)
app.get("/visit-logs/active", async (req, res) => {
  try {
    const activeLogs = await VisitLog.find({
      isTimerActive: true,
      timerEnd: { $gt: new Date() }
    }).sort({ timerEnd: 1 });

    res.json(activeLogs);
  } catch (error) {
    console.error("Error fetching active visit logs:", error);
    res.status(500).json({ message: "Failed to fetch active visit logs", error: error.message });
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
        error: error.message,
        details: error.errors || 'No additional details'
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
// VISITOR ENDPOINTS - FULL CRUD
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
        currentDayStatus: {
          visitDate: null,
          hasTimedIn: false,
          hasTimedOut: false,
          timeIn: null,
          timeOut: null
        }
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

// Get active timers from visit logs for dashboard
app.get("/visit-logs/active-timers", async (req, res) => {
  try {
    const activeVisitLogs = await VisitLog.find({
      isTimerActive: true,
      timerEnd: { $gt: new Date() },
      status: 'in-progress'
    });

    const activeTimersWithDetails = await Promise.all(
      activeVisitLogs.map(async (log) => {
        let person;
        
        if (log.personType === 'visitor') {
          person = await Visitor.findOne({ id: log.personId });
        } else {
          person = await Guest.findOne({ id: log.personId });
        }

        const timeRemaining = Math.max(0, new Date(log.timerEnd) - new Date());
        const timeRemainingMinutes = Math.floor(timeRemaining / (1000 * 60));
        
        return {
          ...log.toObject(),
          fullName: log.personName,
          timeRemaining: timeRemaining,
          timeRemainingMinutes: timeRemainingMinutes,
          prisonerId: log.prisonerId,
          timeIn: log.timeIn,
          // Include person details if available
          photo: person?.photo,
          contact: person?.contact
        };
      })
    );

    const sortedTimers = activeTimersWithDetails.sort((a, b) => a.timeRemainingMinutes - b.timeRemainingMinutes);
    res.json(sortedTimers);
  } catch (error) {
    console.error("Error fetching active timers from visit logs:", error);
    res.status(500).json({ 
      message: "Failed to fetch active timers", 
      error: error.message 
    });
  }
});

// Get active VISITOR timers only (not guests) for dashboard
app.get("/visit-logs/active-visitor-timers", async (req, res) => {
  try {
    const activeVisitLogs = await VisitLog.find({
      personType: 'visitor', // ONLY VISITORS
      isTimerActive: true,
      timerEnd: { $gt: new Date() },
      status: 'in-progress',
      timeOut: null // Only those who haven't timed out
    });

    console.log('🔍 Found active VISITOR timers:', activeVisitLogs.length);

    const activeTimersWithDetails = await Promise.all(
      activeVisitLogs.map(async (log) => {
        try {
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
        } catch (error) {
          console.warn(`⚠️ Error processing timer for ${log.personId}:`, error);
          return null;
        }
      })
    );

    // Filter out any null entries and sort by time remaining (most urgent first)
    const validTimers = activeTimersWithDetails.filter(timer => timer !== null);
    const sortedTimers = validTimers.sort((a, b) => a.timeRemainingMinutes - b.timeRemainingMinutes);
    
    console.log('✅ Sending active VISITOR timers:', sortedTimers.length);
    res.json(sortedTimers);
  } catch (error) {
    console.error("❌ Error fetching active VISITOR timers:", error);
    res.status(500).json({ 
      message: "Failed to fetch active visitor timers", 
      error: error.message 
    });
  }
});

// ======================
// GUEST ENDPOINTS - FULL CRUD
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
        currentDayStatus: {
          visitDate: null,
          hasTimedIn: false,
          hasTimedOut: false,
          timeIn: null,
          timeOut: null
        }
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
  console.log(`📊 Full CRUD operations: ENABLED for all entities`);
});

// ======================
// DEBUG ENDPOINTS - Add these to your backend
// ======================

// DEBUG: Get all QR data for testing
app.get("/debug-qr-codes", async (req, res) => {
  try {
    const visitors = await Visitor.find().select('id lastName firstName prisonerId qrCode');
    const guests = await Guest.find().select('id lastName firstName visitPurpose qrCode');
    
    const visitorQRCodes = visitors.map(v => ({
      id: v.id,
      name: v.fullName,
      type: 'visitor',
      prisonerId: v.prisonerId,
      qrData: v.qrCode ? 'Generated' : 'Missing'
    }));
    
    const guestQRCodes = guests.map(g => ({
      id: g.id,
      name: g.fullName,
      type: 'guest',
      visitPurpose: g.visitPurpose,
      qrData: g.qrCode ? 'Generated' : 'Missing'
    }));
    
    res.json({
      visitors: visitorQRCodes,
      guests: guestQRCodes,
      totalVisitors: visitors.length,
      totalGuests: guests.length
    });
  } catch (error) {
    console.error("QR codes debug error:", error);
    res.status(500).json({ message: "Failed to get QR codes", error: error.message });
  }
});

// DEBUG: Test QR code generation and parsing
app.post("/debug-qr", async (req, res) => {
  try {
    const { personId, isGuest, lastName, firstName, prisonerId, visitPurpose } = req.body;
    
    const qrData = {
      id: personId,
      lastName,
      firstName,
      prisonerId: isGuest ? null : prisonerId,
      type: isGuest ? 'guest' : 'visitor',
      visitPurpose: isGuest ? visitPurpose : null
    };

    const qrCode = await generateQRCode(qrData);
    
    res.json({
      originalData: qrData,
      qrCode: qrCode,
      parsedData: JSON.stringify(qrData),
      message: "QR data generated successfully"
    });
  } catch (error) {
    console.error("QR debug error:", error);
    res.status(500).json({ message: "QR debug failed", error: error.message });
  }
});

// DEBUG: Check if scan-process endpoint is working
app.get("/debug-scan-process", async (req, res) => {
  try {
    res.json({ 
      message: "Scan process endpoint is accessible",
      timestamp: new Date().toISOString(),
      status: "active"
    });
  } catch (error) {
    console.error("Scan process debug error:", error);
    res.status(500).json({ message: "Scan process debug failed", error: error.message });
  }
});

// DEBUG: Check if visit logs are being created
app.get("/debug-visit-logs", async (req, res) => {
  try {
    const visitLogs = await VisitLog.find().sort({ createdAt: -1 });
    
    res.json({
      totalLogs: visitLogs.length,
      logs: visitLogs.map(log => ({
        id: log._id,
        personId: log.personId,
        personName: log.personName,
        visitDate: log.visitDate,
        timeIn: log.timeIn,
        timeOut: log.timeOut,
        status: log.status,
        createdAt: log.createdAt
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});