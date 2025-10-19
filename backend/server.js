const express = require("express");
const { createClient } = require("redis");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const Papa = require("papaparse");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;


// Multer for file uploads (store in memory)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB file size limit
});

app.use(express.json());
app.use(cors());

// Redis Client
const client = createClient();
client.connect().catch(console.error);

client.on("error", (err) => console.error("Redis Client Error", err));

//normalize birthdate
const normalizeBirthdate = (date) => {
  if (!date) return ""; // Return empty string if date is missing or invalid

  // Parse the date string into a Date object
  const parsedDate = new Date(date);

  // Check if the parsed date is valid
  if (isNaN(parsedDate.getTime())) {
    console.warn(`Invalid date format: ${date}`);
    return ""; // Return empty string for invalid dates
  }

  // Format the date as yyyy-MM-dd
  const year = parsedDate.getFullYear();
  const month = String(parsedDate.getMonth() + 1).padStart(2, "0"); // Months are 0-indexed
  const day = String(parsedDate.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`; // e.g., "2003-12-24"
};

/**
 * 📌 Add Resident
 */
app.post("/residents", async (req, res) => {
  const {
    id,
    name,
    birthdate,
    age,
    sex,
    civilStatus,
    purokNumber,
    householdNumber,
    employmentStatus,
    educationalAttainment,
    votersStatus,
    address,
    phone,
    residenceStatus,
    yearsOfStay,
    role,
  } = req.body;

  console.log("Request Body:", req.body); // Log the request body

  if (!id || !name) {
    return res.status(400).json({ message: "ID and Name are required" });
  }

  try {
    const key = `resident:${id}`;
    console.log("Saving to Redis with key:", key); // Log the Redis key

    await client.hSet(key, "name", name || "");
    await client.hSet(key, "birthdate", birthdate || "");
    await client.hSet(key, "age", age || "");
    await client.hSet(key, "sex", sex || "");
    await client.hSet(key, "civilStatus", civilStatus || "");
    await client.hSet(key, "purokNumber", purokNumber || "");
    await client.hSet(key, "householdNumber", householdNumber || "");
    await client.hSet(key, "employmentStatus", employmentStatus || "");
    await client.hSet(key, "educationalAttainment", educationalAttainment || "");
    await client.hSet(key, "votersStatus", votersStatus || "");
    await client.hSet(key, "address", address || "");
    await client.hSet(key, "phone", phone || "");
    await client.hSet(key, "residenceStatus", residenceStatus || "");
    await client.hSet(key, "yearsOfStay", yearsOfStay || "");
    await client.hSet(key, "role", role || "");

    res.status(201).json({ message: "Resident saved successfully" });
  } catch (error) {
    console.error("Error saving resident:", error);
    res.status(500).json({ message: "Failed to save resident" });
  }
});

/**
 * 📌 Get All Residents
 */
app.get("/residents", async (req, res) => {
  try {
    const keys = await client.keys("resident:*");
    const residents = await Promise.all(
      keys.map(async (key) => {
        const residentData = await client.hGetAll(key);
        return { id: key.split(":")[1], ...residentData };
      })
    );

    res.json(residents);
  } catch (error) {
    console.error("Error fetching residents:", error);
    res.status(500).json({ message: "Failed to fetch residents" });
  }
});

/**
 * 📌 Update Resident
 */
app.put("/residents/:id", async (req, res) => {
  const { id } = req.params;
  const {
    name,
    birthdate,
    age,
    sex,
    civilStatus,
    purokNumber,
    householdNumber,
    employmentStatus,
    educationalAttainment,
    votersStatus,
    address,
    phone,
    residenceStatus,
    yearsOfStay,
    role,
  } = req.body;

  try {
    const key = `resident:${id}`;

    await client.hSet(key, "name", name || "");
    await client.hSet(key, "birthdate", birthdate || "");
    await client.hSet(key, "age", age || "");
    await client.hSet(key, "sex", sex || "");
    await client.hSet(key, "civilStatus", civilStatus || "");
    await client.hSet(key, "purokNumber", purokNumber || "");
    await client.hSet(key, "householdNumber", householdNumber || "");
    await client.hSet(key, "employmentStatus", employmentStatus || "");
    await client.hSet(key, "educationalAttainment", educationalAttainment || "");
    await client.hSet(key, "votersStatus", votersStatus || "");
    await client.hSet(key, "address", address || "");
    await client.hSet(key, "phone", phone || "");
    await client.hSet(key, "residenceStatus", residenceStatus || "");
    await client.hSet(key, "yearsOfStay", yearsOfStay || "");
    await client.hSet(key, "role", role || "");

    res.json({ message: "Resident updated successfully" });
  } catch (error) {
    console.error("Error updating resident:", error);
    res.status(500).json({ message: "Failed to update resident" });
  }
});

/**
 * 📌 Delete Resident
 */
app.delete("/residents/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await client.del(`resident:${id}`);
    res.json({ message: "Resident deleted successfully" });
  } catch (error) {
    console.error("Error deleting resident:", error);
    res.status(500).json({ message: "Failed to delete resident" });
  }
});

/**
 * 📌 CSV Upload for Residents
 */
app.post("/uploads", upload.single("csvFile"), async (req, res) => {
  try {
    if (!req.file) {
      console.log("❌ No file received in the request");
      return res.status(400).json({ message: "No file uploaded" });
    }

    console.log("✅ File received:", req.file.originalname); // Log the file name

    const csvData = req.file.buffer.toString();
    console.log("📄 CSV Data:", csvData); // Log the raw CSV data

    // Parse CSV
    const parsedData = Papa.parse(csvData, {
      header: true,
      skipEmptyLines: true,
      delimiter: ",",
    });

    console.log("📊 Parsed CSV Data:", parsedData.data); // Log parsed data

    const residents = parsedData.data.filter((resident) => resident.id);

    if (residents.length === 0) {
      console.log("❌ No residents with valid IDs found in CSV");
      return res.status(400).json({ message: "No residents with valid IDs found in CSV" });
    }

    // Loop through residents and save to Redis
    for (const resident of residents) {
      const normalizedResident = {
        id: resident.id,
        name: resident.name || "Unknown",
        birthdate: normalizeBirthdate(resident.birthdate) || "", // Normalize birthdate
        age: resident.age || "N/A",
        sex: resident.sex || "",
        civilStatus: resident.civilStatus || "",
        purokNumber: resident.purokNumber || "",
        householdNumber: resident.householdNumber || "",
        employmentStatus: resident.employmentStatus || "",
        educationalAttainment: resident.educationalAttainment || "",
        votersStatus: resident.votersStatus || "",
        address: resident.address || "No Address",
        phone: resident.phone || "No Phone",
        residenceStatus: resident.residenceStatus || "",
        yearsOfStay: resident.yearsOfStay || "0",
        role: resident.role || "",
      };

      const key = `resident:${normalizedResident.id}`;

      console.log("🔍 Saving to Redis:", key, normalizedResident); // Log normalized data

      // Save normalized resident data to Redis
      for (const [field, value] of Object.entries(normalizedResident)) {
        await client.hSet(key, field, value);
      }

      // Log the saved data in Redis
      const savedData = await client.hGetAll(key);
      console.log("✅ Saved data in Redis:", savedData); // Log saved data
    }

    res.status(200).json({ message: "CSV uploaded successfully", residents });
  } catch (error) {
    console.error("❌ CSV upload error:", error);
    res.status(500).json({ message: "Error processing CSV", error: error.message || "Unknown error" });
  }
});

/**
 * 📌 User
 */
app.post("/users", async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ message: "All fields are required" });
  }

  // Updated role validation to be more flexible
  const normalizedRole = role.toLowerCase();
  const validRoles = ['admin', 'barangayofficial', 'barangayofficial'];
  
  if (!validRoles.includes(normalizedRole)) {
    return res.status(400).json({ message: "Invalid role specified. Must be either 'admin' or 'barangayOfficial'" });
  }

  try {
    const normalizedEmail = email.toLowerCase();
    const userKey = `user:${normalizedEmail}`;
    const userExists = await client.hExists(userKey, "email");

    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Store with consistent role formatting
    const roleToStore = normalizedRole === 'barangayofficial' ? 'barangayOfficial' : 'admin';
    
    await client.hSet(userKey, "name", name);
    await client.hSet(userKey, "email", normalizedEmail);
    await client.hSet(userKey, "password", password);
    await client.hSet(userKey, "role", roleToStore);

    res.status(201).json({ message: "User created successfully" });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ message: "Failed to create user" });
  }
});

app.get("/users", async (req, res) => {
  try {
    const keys = await client.keys("user:*");
    const users = await Promise.all(
      keys.map(async (key) => {
        const userData = await client.hGetAll(key);
        return { email: key.split(":")[1], ...userData };
      })
    );

    res.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

app.delete("/users/:email", async (req, res) => {
  try {
    const { email } = req.params;
    await client.del(`user:${email}`);
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ message: "Failed to delete user" });
  }
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = email.toLowerCase();

  try {
    const userKey = `user:${normalizedEmail}`;
    const userExists = await client.hExists(userKey, "email");

    if (!userExists) {
      return res.status(400).json({ message: "User not found" });
    }

    const user = await client.hGetAll(userKey);

    if (user.password !== password) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Return role in consistent format
    const role = user.role === 'barangayofficial' ? 'barangayOfficial' : user.role;
    
    res.json({ 
      user: { 
        email: user.email, 
        role: role,
        name: user.name 
      } 
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Failed to login" });
  }
});

/**
 * 📌 Document Request Endpoints
 */

app.post("/document-requests", async (req, res) => {
  const { documentType, fullName, address, contactNumber, purpose } = req.body;

  try {
    const id = Date.now().toString();
    const key = `docreq:${id}`;
    
    await client.hSet(key, "documentType", documentType);
    await client.hSet(key, "fullName", fullName);
    await client.hSet(key, "address", address);
    await client.hSet(key, "contactNumber", contactNumber);
    await client.hSet(key, "purpose", purpose);
    await client.hSet(key, "requestDate", new Date().toISOString());
    await client.hSet(key, "status", "Pending");
    await client.hSet(key, "viewed", "false"); // Initialize as unread

    res.status(201).json({ 
      message: "Request submitted successfully",
      request: {
        id,
        documentType,
        fullName,
        address,
        contactNumber,
        purpose,
        requestDate: new Date().toISOString(),
        status: "Pending",
        viewed: false
      }
    });
  } catch (error) {
    console.error("Error submitting request:", error);
    res.status(500).json({ message: "Failed to submit request" });
  }
});

/**
 * 📌 Get All Document Requests
 */
app.get("/document-requests", async (req, res) => {
  try {
    const keys = await client.keys("docreq:*");
    const requests = await Promise.all(
      keys.map(async (key) => {
        const requestData = await client.hGetAll(key);
        return {
          id: key.split(":")[1],
          ...requestData,
          viewed: requestData.viewed === 'true' // Ensure boolean
        };
      })
    );
    res.json(requests);
  } catch (error) {
    console.error("Error fetching requests:", error);
    res.status(500).json({ message: "Failed to fetch requests" });
  }
});


// Update status of document request
app.put("/document-requests/:id", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status || !["Approved", "Rejected"].includes(status)) {
    return res.status(400).json({ message: "Invalid status value" });
  }

  try {
    const key = `docreq:${id}`;
    const exists = await client.exists(key);
    
    if (!exists) {
      return res.status(404).json({ message: "Request not found" });
    }

    await client.hSet(key, "status", status);
    const updatedRequest = await client.hGetAll(key);
    
    res.json({ 
      message: "Request status updated successfully",
      request: {
        id,
        ...updatedRequest
      }
    });
  } catch (error) {
    console.error("Error updating request status:", error);
    res.status(500).json({ message: "Failed to update request status" });
  }
});

// Delete document request
app.delete("/document-requests/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await client.del(`docreq:${id}`);
    res.json({ message: "Document request deleted successfully" });
  } catch (error) {
    console.error("Error deleting document request:", error);
    res.status(500).json({ message: "Failed to delete document request" });
  }
});
// Mark document request as viewed
app.patch('/document-requests/mark-all-read', async (req, res) => {
  try {
    const allKeys = await client.keys('docreq:*');
    
    // Mark all requests as viewed
    await Promise.all(
      allKeys.map(async (key) => {
        await client.hSet(key, 'viewed', 'true');
      })
    );
    
    // Get updated count
    const updatedRequests = await Promise.all(
      allKeys.map(async (key) => {
        return await client.hGetAll(key);
      })
    );
    
    res.json({
      success: true,
      unreadCount: 0,
      requests: updatedRequests.map(req => ({
        ...req,
        viewed: req.viewed === 'true'
      }))
    });
    
  } catch (error) {
    console.error('Error marking all requests as read:', error);
    res.status(500).json({ error: 'Failed to mark all requests as read' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});