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

// Visitor Schema with Time Tracking
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
  
  // Time tracking fields
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

// ======================
// UPDATED GUEST SCHEMA
// ======================

const guestSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  lastName: { type: String, required: true },
  firstName: { type: String, required: true },
  middleName: String,
  extension: String,
  
  // Guest details
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

// ======================
// USER ENDPOINTS
// ======================

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

app.put("/users/:email", async (req, res) => {
  const { name, role, password } = req.body;
  const userEmail = req.params.email.toLowerCase();
  
  if (!name || !role) {
    return res.status(400).json({ 
      message: "Name and role are required" 
    });
  }

  const validRoles = ['FullAdmin', 'MaleAdmin', 'FemaleAdmin', 'FullStaff', 'MaleStaff', 'FemaleStaff'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ 
      message: `Invalid role. Must be one of: ${validRoles.join(', ')}` 
    });
  }

  try {
    const updateData = {
      name: name.trim(),
      role: role
    };

    if (password && password.trim() !== '') {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const updatedUser = await User.findOneAndUpdate(
      { email: userEmail },
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ 
        message: "User not found" 
      });
    }
    
    res.json({ 
      message: "User updated successfully", 
      user: updatedUser 
    });
  } catch (error) {
    console.error("User update error:", error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        message: "Validation error", 
        error: error.message 
      });
    }
    
    res.status(500).json({ 
      message: "Failed to update user", 
      error: error.message 
    });
  }
});

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

app.delete("/users/:email", async (req, res) => {
  try {
    const userEmail = req.params.email.toLowerCase();
    
    const protectedAccounts = ["fulladmin@prison.com", "system@prison.com"];
    if (protectedAccounts.includes(userEmail)) {
      return res.status(403).json({ 
        message: "Cannot delete predefined system accounts" 
      });
    }

    const deletedUser = await User.findOneAndDelete({ email: userEmail });
    if (!deletedUser) {
      return res.status(404).json({ message: "User not found" });
    }
    
    res.json({ 
      message: "User deleted successfully",
      deletedUser: {
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
// CRIME ENDPOINTS
// ======================

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

app.put("/crimes/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    const updatedCrime = await Crime.findByIdAndUpdate(
      id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!updatedCrime) {
      return res.status(404).json({ message: "Crime not found" });
    }
    
    res.json(updatedCrime);
  } catch (error) {
    console.error("Error updating crime:", error);
    res.status(500).json({ 
      message: "Failed to update crime", 
      error: error.message 
    });
  }
});

app.delete("/crimes/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    const deletedCrime = await Crime.findByIdAndDelete(id);
    
    if (!deletedCrime) {
      return res.status(404).json({ message: "Crime not found" });
    }
    
    res.json({ message: "Crime deleted successfully", crime: deletedCrime });
  } catch (error) {
    console.error("Error deleting crime:", error);
    res.status(500).json({ 
      message: "Failed to delete crime", 
      error: error.message 
    });
  }
});

// ======================
// INMATE ENDPOINTS
// ======================

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

app.delete("/inmates/:code", async (req, res) => {
  try {
    const deletedInmate = await Inmate.findOneAndDelete({ inmateCode: req.params.code });
    if (!deletedInmate) return res.status(404).json({ message: "Not found" });
    
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
// VISITOR ENDPOINTS - FIXED TIMER LOGIC
// ======================

app.post("/visitors", 
  upload.single('photo'),
  async (req, res) => {
    try {
      const seq = await autoIncrement('visitorId');
      const id = `VIS${seq}`;

      console.log('Creating new visitor with data:', req.body);

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
        status: req.body.status || 'approved'
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

// FIXED: Start timer endpoint - COMPLETELY REWRITTEN
app.put("/visitors/:id/start-timer", async (req, res) => {
  try {
    console.log('🚀 STARTING TIMER for visitor:', req.params.id);
    
    const visitor = await Visitor.findOne({ id: req.params.id });
    if (!visitor) {
      console.log('❌ Visitor not found:', req.params.id);
      return res.status(404).json({ message: "Visitor not found" });
    }

    const timerStart = new Date();
    const timerEnd = new Date(timerStart.getTime() + (3 * 60 * 60 * 1000)); // 3 hours

    console.log('⏰ Timer settings:', {
      timerStart,
      timerEnd,
      duration: '3 hours'
    });

    // FIXED: Update ALL necessary fields to activate timer
    const updateData = {
      timerStart: timerStart,
      timerEnd: timerEnd,
      isTimerActive: true,
      visitApproved: true,
      status: 'approved',
      hasTimedIn: true,
      lastVisitDate: new Date(),
      dateVisited: new Date(),
      timeIn: new Date().toLocaleTimeString('en-US', { 
        hour12: true,
        hour: '2-digit',
        minute: '2-digit'
      })
    };

    console.log('📝 Update data:', updateData);

    const updatedVisitor = await Visitor.findOneAndUpdate(
      { id: req.params.id },
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedVisitor) {
      console.log('❌ Visitor not found after update');
      return res.status(404).json({ message: "Visitor not found after update" });
    }

    // Manually calculate virtual fields since they might not be populated
    const timeRemaining = Math.max(0, timerEnd - new Date());
    const timeRemainingMinutes = Math.floor(timeRemaining / (1000 * 60));

    const visitorWithFullName = {
      ...updatedVisitor.toObject(),
      fullName: updatedVisitor.fullName,
      timeRemaining: timeRemaining,
      timeRemainingMinutes: timeRemainingMinutes
    };

    console.log('✅ Timer started successfully:', {
      id: visitorWithFullName.id,
      name: visitorWithFullName.fullName,
      isTimerActive: visitorWithFullName.isTimerActive,
      timerStart: visitorWithFullName.timerStart,
      timerEnd: visitorWithFullName.timerEnd,
      timeRemainingMinutes: visitorWithFullName.timeRemainingMinutes
    });

    res.json(visitorWithFullName);
  } catch (error) {
    console.error("❌ Error starting timer:", error);
    res.status(500).json({ 
      message: "Failed to start timer", 
      error: error.message,
      stack: error.stack
    });
  }
});

// Stop timer
app.put("/visitors/:id/stop-timer", async (req, res) => {
  try {
    const visitor = await Visitor.findOne({ id: req.params.id });
    if (!visitor) return res.status(404).json({ message: "Visitor not found" });

    const updatedVisitor = await Visitor.findOneAndUpdate(
      { id: req.params.id },
      {
        isTimerActive: false,
        timerEnd: new Date(),
        hasTimedOut: true,
        timeOut: new Date().toLocaleTimeString('en-US', { 
          hour12: true,
          hour: '2-digit',
          minute: '2-digit'
        })
      },
      { new: true, runValidators: true }
    );

    const visitorWithFullName = {
      ...updatedVisitor.toObject(),
      fullName: updatedVisitor.fullName
    };

    res.json(visitorWithFullName);
  } catch (error) {
    console.error("Error stopping timer:", error);
    res.status(500).json({ message: "Failed to stop timer", error: error.message });
  }
});

// Get active timers for dashboard - FIXED QUERY
app.get("/visitors/active-timers", async (req, res) => {
  try {
    console.log('🔍 Fetching active timers...');
    
    const activeVisitors = await Visitor.find({
      isTimerActive: true,
      timerEnd: { $gt: new Date() }
    });

    console.log(`✅ Found ${activeVisitors.length} active visitors with timers`);

    // Manually calculate time remaining for each visitor
    const visitorsWithTimers = activeVisitors.map(visitor => {
      const timeRemaining = Math.max(0, new Date(visitor.timerEnd) - new Date());
      const timeRemainingMinutes = Math.floor(timeRemaining / (1000 * 60));
      
      return {
        ...visitor.toObject(),
        fullName: visitor.fullName,
        timeRemaining: timeRemaining,
        timeRemainingMinutes: timeRemainingMinutes
      };
    });

    // Sort by time remaining (ascending - least time first)
    const sortedVisitors = visitorsWithTimers.sort((a, b) => a.timeRemainingMinutes - b.timeRemainingMinutes);

    console.log('📊 Active timers summary:');
    sortedVisitors.forEach(visitor => {
      console.log(`   ⏰ ${visitor.fullName}: ${visitor.timeRemainingMinutes} minutes remaining`);
    });

    res.json(sortedVisitors);
  } catch (error) {
    console.error("❌ Error fetching active timers:", error);
    res.status(500).json({ 
      message: "Failed to fetch active timers", 
      error: error.message 
    });
  }
});

// Reset time records for a visitor
app.put("/visitors/:id/reset-time", async (req, res) => {
  try {
    const visitor = await Visitor.findOne({ id: req.params.id });
    if (!visitor) return res.status(404).json({ message: "Visitor not found" });

    const updatedVisitor = await Visitor.findOneAndUpdate(
      { id: req.params.id },
      {
        hasTimedIn: false,
        hasTimedOut: false,
        timeIn: null,
        timeOut: null,
        dateVisited: null,
        isTimerActive: false,
        timerStart: null,
        timerEnd: null
      },
      { new: true, runValidators: true }
    );

    const visitorWithFullName = {
      ...updatedVisitor.toObject(),
      fullName: updatedVisitor.fullName
    };

    res.json({ 
      message: "Time records reset successfully", 
      visitor: visitorWithFullName 
    });
  } catch (error) {
    console.error("Error resetting time records:", error);
    res.status(500).json({ 
      message: "Failed to reset time records", 
      error: error.message 
    });
  }
});

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

// Debug endpoint to check ALL visitors timer status
app.get("/visitors-debug/timers", async (req, res) => {
  try {
    const allVisitors = await Visitor.find();
    
    const debugInfo = allVisitors.map(visitor => ({
      id: visitor.id,
      name: visitor.fullName,
      hasTimedIn: visitor.hasTimedIn,
      hasTimedOut: visitor.hasTimedOut,
      isTimerActive: visitor.isTimerActive,
      timerStart: visitor.timerStart,
      timerEnd: visitor.timerEnd,
      timeIn: visitor.timeIn,
      timeOut: visitor.timeOut,
      status: visitor.status
    }));

    console.log('🔍 DEBUG - All visitors timer status:');
    debugInfo.forEach(visitor => {
      console.log(`   ${visitor.id} - ${visitor.name}: TimerActive=${visitor.isTimerActive}, HasTimedIn=${visitor.hasTimedIn}`);
    });

    res.json(debugInfo);
  } catch (error) {
    console.error("Error in debug endpoint:", error);
    res.status(500).json({ message: "Debug failed", error: error.message });
  }
});

// ======================
// GUEST ENDPOINTS
// ======================

// CREATE GUEST
app.post("/guests", 
  upload.single('photo'),
  async (req, res) => {
    try {
      const seq = await autoIncrement('guestId');
      const id = `GST${seq}`;

      console.log('Creating new guest with data:', req.body);

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
        status: req.body.status || 'pending'
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

// GUEST TIME IN
app.put("/guests/:id/time-in", async (req, res) => {
  try {
    const guest = await Guest.findOne({ id: req.params.id });
    if (!guest) return res.status(404).json({ message: "Guest not found" });

    const currentTime = new Date().toLocaleTimeString('en-US', { 
      hour12: true,
      hour: '2-digit',
      minute: '2-digit'
    });
    
    const currentDate = new Date();

    const updatedGuest = await Guest.findOneAndUpdate(
      { id: req.params.id },
      {
        hasTimedIn: true,
        timeIn: currentTime,
        lastVisitDate: currentDate,
        dateVisited: currentDate,
        status: 'approved'
      },
      { new: true, runValidators: true }
    );

    const guestWithFullName = {
      ...updatedGuest.toObject(),
      fullName: updatedGuest.fullName
    };

    res.json(guestWithFullName);
  } catch (error) {
    console.error("Error processing guest time in:", error);
    res.status(500).json({ message: "Failed to process time in", error: error.message });
  }
});

// GUEST TIME OUT
app.put("/guests/:id/time-out", async (req, res) => {
  try {
    const guest = await Guest.findOne({ id: req.params.id });
    if (!guest) return res.status(404).json({ message: "Guest not found" });

    const currentTime = new Date().toLocaleTimeString('en-US', { 
      hour12: true,
      hour: '2-digit',
      minute: '2-digit'
    });

    const updatedGuest = await Guest.findOneAndUpdate(
      { id: req.params.id },
      {
        hasTimedOut: true,
        timeOut: currentTime,
        status: 'completed'
      },
      { new: true, runValidators: true }
    );

    const guestWithFullName = {
      ...updatedGuest.toObject(),
      fullName: updatedGuest.fullName
    };

    res.json(guestWithFullName);
  } catch (error) {
    console.error("Error processing guest time out:", error);
    res.status(500).json({ message: "Failed to process time out", error: error.message });
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
});