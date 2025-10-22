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

// ======================
// BACKUP & MAINTENANCE ENDPOINTS - KEEP USERS BUT PRESERVE ENCRYPTED PASSWORDS
// ======================

const { Parser } = require('json2csv');

// Backup directory
const backupDir = path.join(__dirname, 'backups');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

// SECURE: Remove only truly sensitive fields, but KEEP encrypted passwords
const removeSensitiveFields = (data, modelName) => {
  if (!data || typeof data !== 'object') return data;
  
  // Remove fields that could expose security, but KEEP encrypted passwords
  const sensitiveFields = ['qrCode', 'photo', 'frontImage', 'backImage', 'leftImage', 'rightImage'];
  
  if (Array.isArray(data)) {
    return data.map(item => removeSensitiveFields(item, modelName));
  }
  
  const cleaned = { ...data };
  sensitiveFields.forEach(field => {
    if (cleaned[field] !== undefined) {
      delete cleaned[field];
    }
  });
  
  return cleaned;
};

// Get all backups
app.get("/backups", async (req, res) => {
  try {
    if (!fs.existsSync(backupDir)) {
      return res.json({ backups: [], stats: {} });
    }

    const files = fs.readdirSync(backupDir)
      .filter(file => file.endsWith('.json') || file.endsWith('.csv'))
      .map(file => {
        const filePath = path.join(backupDir, file);
        const stats = fs.statSync(filePath);
        return {
          filename: file,
          createdAt: stats.birthtime,
          size: stats.size,
          format: file.endsWith('.json') ? 'json' : 'csv'
        };
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    const lastBackup = files.length > 0 ? files[0].createdAt : null;

    res.json({
      backups: files,
      stats: {
        totalBackups: files.length,
        totalSize,
        lastBackup,
        storageUsage: Math.min(100, (totalSize / (100 * 1024 * 1024)) * 100),
        collectionsCount: 7
      }
    });
  } catch (error) {
    console.error("Backup list error:", error);
    res.status(500).json({ message: "Failed to list backups", error: error.message });
  }
});

// Create backup - KEEP USERS WITH ENCRYPTED PASSWORDS
app.post("/backups/create", async (req, res) => {
  try {
    const { format = 'json' } = req.body;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-${timestamp}.${format}`;
    const filePath = path.join(backupDir, filename);

    const models = {
      'User': User,
      'Crime': Crime, 
      'Inmate': Inmate,
      'Visitor': Visitor,
      'Guest': Guest,
      'VisitLog': VisitLog,
      'Counter': Counter
    };

    const backupData = {
      metadata: {
        timestamp: new Date().toISOString(),
        database: 'prison_db',
        version: '1.0',
        collections: Object.keys(models),
        security: {
          passwords: 'encrypted', // Passwords remain bcrypt hashed
          sensitiveFieldsRemoved: ['qrCode', 'images'] // Only these are removed
        }
      },
      data: {}
    };

    for (const [modelName, Model] of Object.entries(models)) {
      try {
        const data = await Model.find({});
        // KEEP encrypted passwords, only remove other sensitive fields
        const cleanedData = removeSensitiveFields(data, modelName);
        backupData.data[modelName] = cleanedData;
        console.log(`✓ Backed up ${cleanedData.length} records from ${modelName} (passwords encrypted)`);
      } catch (error) {
        console.warn(`⚠️ Could not backup ${modelName}:`, error.message);
        backupData.data[modelName] = [];
      }
    }

    if (format === 'csv') {
      let csvContent = '';
      for (const [collectionName, data] of Object.entries(backupData.data)) {
        if (data.length > 0) {
          try {
            const fields = Object.keys(data[0]);
            const parser = new Parser({ fields });
            const csv = parser.parse(data);
            csvContent += `=== ${collectionName} ===\n`;
            csvContent += csv + '\n\n';
          } catch (error) {
            console.warn(`Could not convert ${collectionName} to CSV:`, error);
            csvContent += `=== ${collectionName} ===\n`;
            csvContent += 'Error converting to CSV\n\n';
          }
        }
      }
      fs.writeFileSync(filePath, csvContent);
    } else {
      fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2));
    }

    const stats = fs.statSync(filePath);

    res.json({
      message: "Backup created successfully with encrypted passwords preserved",
      filename,
      size: stats.size,
      collections: Object.keys(backupData.data),
      recordCount: Object.values(backupData.data).reduce((sum, arr) => sum + arr.length, 0),
      security: {
        passwords: 'encrypted (bcrypt)',
        sensitiveDataRemoved: ['qrCodes', 'images']
      }
    });
  } catch (error) {
    console.error("Backup creation error:", error);
    res.status(500).json({ message: "Backup creation failed", error: error.message });
  }
});

// Download backup
app.get("/backups/download/:filename", (req, res) => {
  try {
    const filename = req.params.filename;
    
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ message: "Invalid filename" });
    }

    const filePath = path.join(backupDir, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "Backup file not found" });
    }

    res.download(filePath, filename, (err) => {
      if (err) {
        console.error("Download error:", err);
        res.status(500).json({ message: "Download failed" });
      }
    });
  } catch (error) {
    console.error("Backup download error:", error);
    res.status(500).json({ message: "Download failed", error: error.message });
  }
});

// Delete backup
app.delete("/backups/:filename", (req, res) => {
  try {
    const filename = req.params.filename;
    
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ message: "Invalid filename" });
    }

    const filePath = path.join(backupDir, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "Backup file not found" });
    }

    fs.unlinkSync(filePath);
    res.json({ message: "Backup deleted successfully" });
  } catch (error) {
    console.error("Backup deletion error:", error);
    res.status(500).json({ message: "Deletion failed", error: error.message });
  }
});

// Restore backup - PRESERVE EXISTING ENCRYPTED PASSWORDS
app.post("/backups/restore/:filename", async (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(backupDir, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "Backup file not found" });
    }

    const backupData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    if (!backupData.data) {
      return res.status(400).json({ message: "Invalid backup file format" });
    }

    const models = {
      'User': User,
      'Crime': Crime,
      'Inmate': Inmate,
      'Visitor': Visitor,
      'Guest': Guest,
      'VisitLog': VisitLog,
      'Counter': Counter
    };

    const results = {
      restored: {},
      errors: {},
      warnings: {}
    };

    // Restore each collection
    for (const [modelName, data] of Object.entries(backupData.data)) {
      if (models[modelName] && Array.isArray(data)) {
        try {
          const Model = models[modelName];
          
          // Clear existing data
          await Model.deleteMany({});
          
          // Handle special cases for restoration
          let dataToRestore = data;
          
          // If restoring Visitors/Guests, regenerate QR codes (they were removed for security)
          if (modelName === 'Visitor' || modelName === 'Guest') {
            dataToRestore = await Promise.all(data.map(async (personData) => {
              const qrData = {
                id: personData.id,
                lastName: personData.lastName,
                firstName: personData.firstName,
                middleName: personData.middleName,
                extension: personData.extension,
                ...(modelName === 'Visitor' ? { prisonerId: personData.prisonerId } : { visitPurpose: personData.visitPurpose, type: 'guest' })
              };
              
              const newQrCode = await generateQRCode(qrData);
              return {
                ...personData,
                qrCode: newQrCode
              };
            }));
            console.log(`✓ Regenerated QR codes for ${dataToRestore.length} ${modelName} records`);
          }
          
          // Insert backup data
          if (dataToRestore.length > 0) {
            await Model.insertMany(dataToRestore);
          }
          
          results.restored[modelName] = dataToRestore.length;
          console.log(`✓ Restored ${dataToRestore.length} documents to ${modelName}`);
        } catch (error) {
          results.errors[modelName] = error.message;
          console.error(`❌ Error restoring ${modelName}:`, error);
        }
      }
    }

    res.json({ 
      message: "Database restore completed successfully",
      results: results,
      security: {
        passwords: "Encrypted passwords preserved",
        qrCodes: "Regenerated for visitors/guests"
      }
    });

  } catch (error) {
    console.error("Restore error:", error);
    res.status(500).json({ message: "Restore failed", error: error.message });
  }
});

// Quick backup - KEEP USERS WITH ENCRYPTED PASSWORDS
app.post("/backups/quick", async (req, res) => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `quick-backup-${timestamp}.json`;
    const filePath = path.join(backupDir, filename);

    const essentialModels = {
      'User': User,
      'Inmate': Inmate,
      'Visitor': Visitor,
      'Guest': Guest
    };

    const backupData = {
      metadata: {
        timestamp: new Date().toISOString(),
        type: 'quick',
        collections: Object.keys(essentialModels),
        security: {
          passwords: 'encrypted (bcrypt)',
          sensitiveFieldsRemoved: ['qrCode', 'images']
        }
      },
      data: {}
    };

    for (const [modelName, Model] of Object.entries(essentialModels)) {
      try {
        const data = await Model.find({});
        const cleanedData = removeSensitiveFields(data, modelName);
        backupData.data[modelName] = cleanedData;
      } catch (error) {
        console.warn(`Could not backup ${modelName}:`, error.message);
        backupData.data[modelName] = [];
      }
    }

    fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2));
    const stats = fs.statSync(filePath);

    res.json({
      message: "Quick backup created with encrypted passwords",
      filename,
      size: `${(stats.size / 1024 / 1024).toFixed(2)} MB`,
      records: Object.values(backupData.data).reduce((sum, arr) => sum + arr.length, 0),
      security: "Passwords encrypted, sensitive data removed"
    });
  } catch (error) {
    console.error("Quick backup error:", error);
    res.status(500).json({ message: "Quick backup failed", error: error.message });
  }
});

// Database statistics
app.get("/database/stats", async (req, res) => {
  try {
    const models = {
      'User': User,
      'Crime': Crime,
      'Inmate': Inmate,
      'Visitor': Visitor,
      'Guest': Guest,
      'VisitLog': VisitLog,
      'Counter': Counter
    };

    const stats = {
      totalCollections: Object.keys(models).length,
      collectionStats: {},
      totalRecords: 0
    };

    for (const [modelName, Model] of Object.entries(models)) {
      try {
        const count = await Model.countDocuments();
        stats.collectionStats[modelName] = count;
        stats.totalRecords += count;
      } catch (error) {
        stats.collectionStats[modelName] = 'Error: ' + error.message;
      }
    }

    res.json(stats);
  } catch (error) {
    console.error("Stats error:", error);
    res.status(500).json({ message: "Failed to get stats", error: error.message });
  }
});

// System health check
app.get("/health", async (req, res) => {
  try {
    const dbState = mongoose.connection.readyState;
    const dbStatus = dbState === 1 ? 'connected' : 'disconnected';

    let backupStats = { count: 0, totalSize: '0 MB' };
    try {
      if (fs.existsSync(backupDir)) {
        const files = fs.readdirSync(backupDir)
          .filter(file => file.endsWith('.json') || file.endsWith('.csv'));
        
        const totalSize = files.reduce((sum, file) => {
          const filePath = path.join(backupDir, file);
          return sum + (fs.existsSync(filePath) ? fs.statSync(filePath).size : 0);
        }, 0);

        backupStats = {
          count: files.length,
          totalSize: `${(totalSize / (1024 * 1024)).toFixed(2)} MB`
        };
      }
    } catch (e) {
      console.warn('Could not calculate backup stats:', e.message);
    }

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: dbStatus,
      backups: backupStats,
      memory: {
        used: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`,
        total: `${(process.memoryUsage().heapTotal / 1024 / 1024).toFixed(2)} MB`
      },
      security: {
        backupSecurity: 'Encrypted passwords preserved in backups',
        dataProtection: 'QR codes and images removed for security'
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ======================
// VIOLATION ENDPOINTS - ADD THESE
// ======================

// Add violation to visitor
app.put("/visitors/:id/violation", async (req, res) => {
  try {
    const { violationType, violationDetails } = req.body;
    console.log('Adding violation to visitor:', req.params.id, violationType);
    
    const updatedVisitor = await Visitor.findOneAndUpdate(
      { id: req.params.id },
      {
        violationType,
        violationDetails,
        violationDate: new Date()
      },
      { new: true }
    );

    if (!updatedVisitor) {
      return res.status(404).json({ message: "Visitor not found" });
    }

    res.json({ 
      message: "Violation added successfully",
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
    console.log('Adding violation to guest:', req.params.id, violationType);
    
    const updatedGuest = await Guest.findOneAndUpdate(
      { id: req.params.id },
      {
        violationType,
        violationDetails,
        violationDate: new Date()
      },
      { new: true }
    );

    if (!updatedGuest) {
      return res.status(404).json({ message: "Guest not found" });
    }

    res.json({ 
      message: "Violation added successfully",
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
        violationDetails: null,
        violationDate: null
      },
      { new: true }
    );

    if (!updatedVisitor) {
      return res.status(404).json({ message: "Visitor not found" });
    }

    res.json({ 
      message: "Violation removed successfully",
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
        violationDetails: null,
        violationDate: null
      },
      { new: true }
    );

    if (!updatedGuest) {
      return res.status(404).json({ message: "Guest not found" });
    }

    res.json({ 
      message: "Violation removed successfully",
      guest: updatedGuest
    });
  } catch (error) {
    console.error("Error removing violation from guest:", error);
    res.status(500).json({ message: "Failed to remove violation", error: error.message });
  }
});

// ======================
// BAN ENDPOINTS - ADD THESE
// ======================

// Ban visitor
app.put("/visitors/:id/ban", async (req, res) => {
  try {
    const { reason, duration, notes } = req.body;
    console.log('Banning visitor:', req.params.id, reason);
    
    const updatedVisitor = await Visitor.findOneAndUpdate(
      { id: req.params.id },
      {
        isBanned: true,
        banReason: reason,
        banDuration: duration,
        banNotes: notes,
        banDate: new Date()
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
    const { reason, duration, notes } = req.body;
    console.log('Banning guest:', req.params.id, reason);
    
    const updatedGuest = await Guest.findOneAndUpdate(
      { id: req.params.id },
      {
        isBanned: true,
        banReason: reason,
        banDuration: duration,
        banNotes: notes,
        banDate: new Date()
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
        banNotes: null,
        banDate: null
      },
      { new: true }
    );

    if (!updatedVisitor) {
      return res.status(404).json({ message: "Visitor not found" });
    }

    res.json({ 
      message: "Ban removed successfully",
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
        banNotes: null,
        banDate: null
      },
      { new: true }
    );

    if (!updatedGuest) {
      return res.status(404).json({ message: "Guest not found" });
    }

    res.json({ 
      message: "Ban removed successfully",
      guest: updatedGuest
    });
  } catch (error) {
    console.error("Error removing ban from guest:", error);
    res.status(500).json({ message: "Failed to remove ban", error: error.message });
  }
});

// ======================
// PENDING GUEST SCHEMA
// ======================

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
  
  // Violation fields
  violationType: String,
  violationDetails: String,
  
  // Status and tracking
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected'], 
    default: 'pending' 
  },
  submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  submittedByName: String,
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: Date,
  rejectedAt: Date,
  submissionDate: { type: Date, default: Date.now },
  
  // System fields
  qrCode: String
}, { timestamps: true });

pendingGuestSchema.virtual('fullName').get(function() {
  return `${this.lastName}, ${this.firstName} ${this.middleName || ''} ${this.extension || ''}`.trim();
});

const PendingGuest = mongoose.model('PendingGuest', pendingGuestSchema);

// ======================
// PENDING GUEST ENDPOINTS
// ======================

// CREATE PENDING GUEST (Staff submission)
app.post("/pending-guests", 
  upload.single('photo'),
  async (req, res) => {
    try {
      const seq = await autoIncrement('pendingGuestId');
      const id = `PGS${seq}`;

      const pendingGuestData = {
        ...req.body,
        id,
        dateOfBirth: req.body.dateOfBirth ? new Date(req.body.dateOfBirth) : null,
        status: 'pending',
        submissionDate: new Date()
      };

      if (req.file) {
        pendingGuestData.photo = req.file.filename;
      }

      // Generate QR code for pending guest
      const qrData = {
        id,
        lastName: pendingGuestData.lastName,
        firstName: pendingGuestData.firstName,
        middleName: pendingGuestData.middleName,
        extension: pendingGuestData.extension,
        visitPurpose: pendingGuestData.visitPurpose,
        type: 'pending-guest'
      };
      pendingGuestData.qrCode = await generateQRCode(qrData);

      const pendingGuest = new PendingGuest(pendingGuestData);
      await pendingGuest.save();

      const pendingGuestWithFullName = {
        ...pendingGuest.toObject(),
        fullName: pendingGuest.fullName
      };

      res.status(201).json({ 
        message: "Guest request submitted successfully! Waiting for admin approval.", 
        pendingGuest: pendingGuestWithFullName 
      });
    } catch (error) {
      console.error("Pending guest creation error:", error);
      
      if (error.code === 11000) {
        return res.status(409).json({ message: "Pending guest ID already exists" });
      }
      
      if (error.name === 'ValidationError') {
        return res.status(400).json({ message: "Validation error", error: error.message });
      }
      
      res.status(500).json({ message: "Failed to submit guest request", error: error.message });
    }
  }
);

// GET ALL PENDING GUESTS (For admin approval)
app.get("/pending-guests", async (req, res) => {
  try {
    const pendingGuests = await PendingGuest.find().sort({ createdAt: -1 });
    const pendingGuestsWithFullName = pendingGuests.map(guest => ({
      ...guest.toObject(),
      fullName: guest.fullName
    }));
    res.json(pendingGuestsWithFullName);
  } catch (error) {
    res.status(500).json({ message: "Fetch failed", error: error.message });
  }
});

// GET PENDING GUEST BY ID
app.get("/pending-guests/:id", async (req, res) => {
  try {
    const pendingGuest = await PendingGuest.findOne({ id: req.params.id });
    if (!pendingGuest) return res.status(404).json({ message: "Pending guest not found" });
    
    const pendingGuestWithFullName = {
      ...pendingGuest.toObject(),
      fullName: pendingGuest.fullName
    };
    res.json(pendingGuestWithFullName);
  } catch (error) {
    res.status(500).json({ message: "Fetch failed", error: error.message });
  }
});

// APPROVE PENDING GUEST (Move to main Guest collection)
app.put("/pending-guests/:id/approve", async (req, res) => {
  try {
    const pendingGuest = await PendingGuest.findOne({ id: req.params.id });
    if (!pendingGuest) {
      return res.status(404).json({ message: "Pending guest not found" });
    }

    if (pendingGuest.status !== 'pending') {
      return res.status(400).json({ message: "Guest request already processed" });
    }

    // Create new guest in main Guest collection
    const guestData = {
      id: `GST${await autoIncrement('guestId')}`,
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
      violationType: pendingGuest.violationType,
      violationDetails: pendingGuest.violationDetails,
      status: 'approved',
      approvedBy: req.body.approvedBy, // Admin user ID
      approvedAt: new Date(),
      dailyVisits: [],
      currentDayStatus: {
        visitDate: null,
        hasTimedIn: false,
        hasTimedOut: false,
        timeIn: null,
        timeOut: null
      }
    };

    // Generate QR code for approved guest
    const qrData = {
      id: guestData.id,
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

    // Update pending guest status
    pendingGuest.status = 'approved';
    pendingGuest.approvedBy = req.body.approvedBy;
    pendingGuest.approvedAt = new Date();
    await pendingGuest.save();

    const guestWithFullName = {
      ...guest.toObject(),
      fullName: guest.fullName
    };

    res.json({ 
      message: "Guest approved successfully and moved to guest list",
      guest: guestWithFullName,
      pendingGuest: pendingGuest
    });

  } catch (error) {
    console.error("Error approving pending guest:", error);
    res.status(500).json({ message: "Failed to approve guest", error: error.message });
  }
});

// REJECT PENDING GUEST
app.put("/pending-guests/:id/reject", async (req, res) => {
  try {
    const pendingGuest = await PendingGuest.findOne({ id: req.params.id });
    if (!pendingGuest) {
      return res.status(404).json({ message: "Pending guest not found" });
    }

    if (pendingGuest.status !== 'pending') {
      return res.status(400).json({ message: "Guest request already processed" });
    }

    pendingGuest.status = 'rejected';
    pendingGuest.rejectedBy = req.body.rejectedBy;
    pendingGuest.rejectedAt = new Date();
    pendingGuest.rejectionReason = req.body.rejectionReason;

    await pendingGuest.save();

    res.json({ 
      message: "Guest request rejected successfully",
      pendingGuest: pendingGuest
    });

  } catch (error) {
    console.error("Error rejecting pending guest:", error);
    res.status(500).json({ message: "Failed to reject guest", error: error.message });
  }
});

// DELETE PENDING GUEST
app.delete("/pending-guests/:id", async (req, res) => {
  try {
    const deletedPendingGuest = await PendingGuest.findOneAndDelete({ id: req.params.id });
    if (!deletedPendingGuest) return res.status(404).json({ message: "Not found" });
    
    if (deletedPendingGuest.photo) {
      const photoPath = path.join(uploadDir, deletedPendingGuest.photo);
      if (fs.existsSync(photoPath)) fs.unlinkSync(photoPath);
    }
    
    res.json({ message: "Pending guest deleted" });
  } catch (error) {
    res.status(500).json({ message: "Delete failed", error: error.message });
  }
});

// ======================
// ANALYTICS ENDPOINTS
// ======================

// Get analytics data with comprehensive reporting
app.get("/analytics/reports", async (req, res) => {
  try {
    const { startDate, endDate, reportType = 'daily' } = req.query;
    
    console.log('📊 Analytics request:', { startDate, endDate, reportType });

    // Build date filter
    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter.visitDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate + 'T23:59:59.999Z')
      };
    }

    // Fetch all necessary data
    const [visitLogs, inmates, visitors, guests] = await Promise.all([
      VisitLog.find(dateFilter).sort({ visitDate: 1 }),
      Inmate.find(),
      Visitor.find(),
      Guest.find()
    ]);

    console.log('📈 Data counts:', {
      visitLogs: visitLogs.length,
      inmates: inmates.length,
      visitors: visitors.length,
      guests: guests.length
    });

    // Process data based on report type
    let chartData = [];
    let summaryData = {};

    switch (reportType) {
      case 'daily':
        chartData = processDailyAnalytics(visitLogs);
        summaryData = calculateDailySummary(chartData, visitLogs);
        break;
      case 'weekly':
        chartData = processWeeklyAnalytics(visitLogs);
        summaryData = calculateWeeklySummary(chartData, visitLogs);
        break;
      case 'monthly':
        chartData = processMonthlyAnalytics(visitLogs);
        summaryData = calculateMonthlySummary(chartData, visitLogs);
        break;
      case 'yearly':
        chartData = processYearlyAnalytics(visitLogs);
        summaryData = calculateYearlySummary(chartData, visitLogs);
        break;
      case 'demographic':
        chartData = processDemographicAnalytics(visitors, guests, inmates);
        summaryData = calculateDemographicSummary(visitors, guests, inmates);
        break;
      case 'performance':
        chartData = processPerformanceAnalytics(visitLogs);
        summaryData = calculatePerformanceSummary(visitLogs);
        break;
      default:
        chartData = processDailyAnalytics(visitLogs);
        summaryData = calculateDailySummary(chartData, visitLogs);
    }

    res.json({
      success: true,
      chartData,
      summaryData,
      rawData: {
        visitLogs: visitLogs.length,
        inmates: inmates.length,
        visitors: visitors.length,
        guests: guests.length
      }
    });

  } catch (error) {
    console.error('❌ Analytics error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to generate analytics', 
      error: error.message 
    });
  }
});

// Analytics processing functions
function processDailyAnalytics(visitLogs) {
  const dailyCounts = {};
  
  visitLogs.forEach(log => {
    if (!log.visitDate) return;
    
    const date = new Date(log.visitDate);
    const dateKey = date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit' 
    });
    
    dailyCounts[dateKey] = (dailyCounts[dateKey] || 0) + 1;
  });

  return Object.entries(dailyCounts).map(([date, count]) => ({
    date,
    visitors: count,
    name: date
  })).sort((a, b) => new Date(a.date) - new Date(b.date));
}

function processWeeklyAnalytics(visitLogs) {
  const weeklyCounts = {};
  
  visitLogs.forEach(log => {
    if (!log.visitDate) return;
    
    const date = new Date(log.visitDate);
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
    
    const weekKey = weekStart.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
    
    weeklyCounts[weekKey] = (weeklyCounts[weekKey] || 0) + 1;
  });

  return Object.entries(weeklyCounts).map(([week, count]) => ({
    week: `Week of ${week}`,
    visitors: count,
    name: `Week of ${week}`
  })).sort((a, b) => new Date(a.week) - new Date(b.week));
}

function processMonthlyAnalytics(visitLogs) {
  const monthlyCounts = {};
  
  visitLogs.forEach(log => {
    if (!log.visitDate) return;
    
    const date = new Date(log.visitDate);
    const monthKey = date.toLocaleDateString('en-US', { 
      month: 'long', 
      year: 'numeric' 
    });
    
    monthlyCounts[monthKey] = (monthlyCounts[monthKey] || 0) + 1;
  });

  return Object.entries(monthlyCounts).map(([month, count]) => ({
    month,
    visitors: count,
    name: month
  })).sort((a, b) => new Date(a.month) - new Date(b.month));
}

function processYearlyAnalytics(visitLogs) {
  const yearlyCounts = {};
  
  visitLogs.forEach(log => {
    if (!log.visitDate) return;
    
    const year = new Date(log.visitDate).getFullYear();
    yearlyCounts[year] = (yearlyCounts[year] || 0) + 1;
  });

  return Object.entries(yearlyCounts).map(([year, count]) => ({
    year: year.toString(),
    visitors: count,
    name: year.toString()
  })).sort((a, b) => a.year - b.year);
}

function processDemographicAnalytics(visitors, guests, inmates) {
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
}

function processPerformanceAnalytics(visitLogs) {
  const performanceByDay = {};
  
  visitLogs.forEach(log => {
    if (!log.visitDate || !log.visitDuration) return;
    
    const date = new Date(log.visitDate).toLocaleDateString();
    
    if (!performanceByDay[date]) {
      performanceByDay[date] = { totalMinutes: 0, count: 0 };
    }
    
    // Parse duration (format: "Xh Ym")
    const durationMatch = log.visitDuration.match(/(\d+)h\s*(\d+)m/);
    if (durationMatch) {
      const hours = parseInt(durationMatch[1]);
      const minutes = parseInt(durationMatch[2]);
      performanceByDay[date].totalMinutes += (hours * 60) + minutes;
      performanceByDay[date].count += 1;
    }
  });

  return Object.entries(performanceByDay).map(([date, data]) => ({
    date,
    avgDuration: Math.round(data.totalMinutes / data.count),
    visits: data.count,
    name: date
  })).sort((a, b) => new Date(a.date) - new Date(b.date));
}

// Summary calculation functions
function calculateDailySummary(data, visitLogs) {
  const totalVisits = visitLogs.length;
  const avgVisitsPerDay = totalVisits / (data.length || 1);
  const completedVisits = visitLogs.filter(log => log.status === 'completed').length;
  const peakDay = data.reduce((max, day) => day.visitors > max.visitors ? day : max, { visitors: 0 });
  
  return {
    totalVisits,
    avgVisitsPerDay: Math.round(avgVisitsPerDay),
    completionRate: totalVisits > 0 ? Math.round((completedVisits / totalVisits) * 100) : 0,
    peakDay: peakDay.visitors > 0 ? `${peakDay.date}: ${peakDay.visitors} visits` : 'No data'
  };
}

function calculateWeeklySummary(data, visitLogs) {
  const totalVisits = visitLogs.length;
  const avgVisitsPerWeek = totalVisits / (data.length || 1);
  const peakWeek = data.reduce((max, week) => week.visitors > max.visitors ? week : max, { visitors: 0 });
  
  return {
    totalVisits,
    avgVisitsPerWeek: Math.round(avgVisitsPerWeek),
    peakWeek: peakWeek.visitors > 0 ? `${peakWeek.name}: ${peakWeek.visitors} visits` : 'No data'
  };
}

function calculateMonthlySummary(data, visitLogs) {
  const totalVisits = visitLogs.length;
  const currentMonth = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });
  const currentMonthData = data.find(item => item.month === currentMonth);
  const peakMonth = data.reduce((max, month) => month.visitors > max.visitors ? month : max, { visitors: 0 });
  
  return {
    totalVisits,
    currentMonthVisits: currentMonthData ? currentMonthData.visitors : 0,
    peakMonth: peakMonth.visitors > 0 ? `${peakMonth.month}: ${peakMonth.visitors} visits` : 'No data'
  };
}

function calculateYearlySummary(data, visitLogs) {
  const totalVisits = visitLogs.length;
  const currentYear = new Date().getFullYear().toString();
  const currentYearData = data.find(item => item.year === currentYear);
  
  return {
    totalVisits,
    currentYearVisits: currentYearData ? currentYearData.visitors : 0,
    growthRate: calculateGrowthRate(data)
  };
}

function calculateDemographicSummary(visitors, guests, inmates) {
  const totalVisitors = visitors.length;
  const totalGuests = guests.length;
  const totalInmates = inmates.length;
  const maleInmates = inmates.filter(i => i.sex === 'Male').length;
  const femaleInmates = inmates.filter(i => i.sex === 'Female').length;
  const genderRatio = totalInmates > 0 ? Math.round((maleInmates / totalInmates) * 100) : 0;
  
  return {
    totalVisitors,
    totalGuests,
    totalInmates,
    maleInmates,
    femaleInmates,
    genderRatio: `${genderRatio}% Male`
  };
}

function calculatePerformanceSummary(visitLogs) {
  const completedVisits = visitLogs.filter(log => log.status === 'completed');
  let totalMinutes = 0;
  let validDurations = 0;

  completedVisits.forEach(log => {
    if (log.visitDuration) {
      const match = log.visitDuration.match(/(\d+)h\s*(\d+)m/);
      if (match) {
        totalMinutes += (parseInt(match[1]) * 60) + parseInt(match[2]);
        validDurations += 1;
      }
    }
  });

  const avgDuration = validDurations > 0 ? totalMinutes / validDurations : 0;
  const efficiency = visitLogs.length > 0 ? Math.round((completedVisits.length / visitLogs.length) * 100) : 0;

  return {
    avgVisitDuration: Math.round(avgDuration),
    totalCompletedVisits: completedVisits.length,
    efficiency: `${efficiency}%`
  };
}

function calculateGrowthRate(data) {
  if (data.length < 2) return '0%';
  
  const currentYear = data[data.length - 1].visitors;
  const previousYear = data[data.length - 2].visitors;
  const growth = ((currentYear - previousYear) / previousYear) * 100;
  
  return `${Math.round(growth)}%`;
}

// Get sample data for testing
app.get("/analytics/sample-data", async (req, res) => {
  try {
    // Create sample visit logs for testing
    const sampleData = [
      { date: '1/15/2024', visitors: 8, name: '1/15/2024' },
      { date: '1/16/2024', visitors: 12, name: '1/16/2024' },
      { date: '1/17/2024', visitors: 15, name: '1/17/2024' },
      { date: '1/18/2024', visitors: 10, name: '1/18/2024' },
      { date: '1/19/2024', visitors: 18, name: '1/19/2024' },
      { date: '1/20/2024', visitors: 14, name: '1/20/2024' },
      { date: '1/21/2024', visitors: 11, name: '1/21/2024' },
    ];

    const sampleSummary = {
      totalVisits: 88,
      avgVisitsPerDay: 13,
      completionRate: 92,
      peakDay: '1/19/2024: 18 visits'
    };

    res.json({
      success: true,
      chartData: sampleData,
      summaryData: sampleSummary,
      message: 'Sample data loaded for demonstration'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Failed to generate sample data', 
      error: error.message 
    });
  }
});