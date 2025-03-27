const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { google } = require("googleapis");
const admin = require("firebase-admin");
require("dotenv").config();

const app = express();
const PORT = 3000;

// Middleware for parsing JSON
app.use(express.json());

// Initialize Firebase Admin SDK
const firebaseConfig = require("./firebase_credentials.json");
admin.initializeApp({
  credential: admin.credential.cert(firebaseConfig),
  databaseURL: "https://mywebapp-1300a-default-rtdb.firebaseio.com/", // Replace with your Firebase database URL
});
const db = admin.database();

// Configure Multer for file uploads
const upload = multer({ dest: "uploads/" });

// Google Drive Authentication
const auth = new google.auth.GoogleAuth({
  keyFile: "credentials.json",
  scopes: ["https://www.googleapis.com/auth/drive.file"],
});
const drive = google.drive({ version: "v3", auth });

// Upload Route: Saves username, email in Firebase, uploads file to Google Drive
// app.post("/upload", upload.single("audio"), async (req, res) => {
//   const { username, email } = req.body;

//   if (!username || !email || !req.file) {
//     return res
//       .status(400)
//       .json({ error: "Missing fields: username, email, or file" });
//   }

//   const fileMetadata = {
//     name: req.file.originalname,
//     parents: [process.env.GOOGLE_DRIVE_FOLDER_ID],
//   };
//   const media = {
//     mimeType: req.file.mimetype,
//     body: fs.createReadStream(req.file.path),
//   };

//   try {
//     // Upload file to Google Drive
//     const fileResponse = await drive.files.create({
//       resource: fileMetadata,
//       media,
//       fields: "id",
//     });
//     const fileId = fileResponse.data.id;

//     // Remove the local file after upload
//     fs.unlinkSync(req.file.path);

//     // Save user data and file ID to Firebase
//     const newEntry = db.ref("uploads").push();
//     await newEntry.set({ username, email, fileId });

//     res.json({ success: true, fileId });
//   } catch (error) {
//     res.status(500).json({ error: "Upload failed", details: error.message });
//   }
// });
app.post("/upload", upload.single("audio"), async (req, res) => {
  const { username, email } = req.body;

  if (!username || !email || !req.file) {
    return res
      .status(400)
      .json({ error: "Missing fields: username, email, or file" });
  }

  const fileMetadata = {
    name: `${username}_${req.file.originalname}`, // Name with username for easy identification
    parents: [process.env.GOOGLE_DRIVE_FOLDER_ID],
  };

  const media = {
    mimeType: req.file.mimetype,
    body: fs.createReadStream(req.file.path),
  };

  try {
    // Upload file to Google Drive
    const fileResponse = await drive.files.create({
      resource: fileMetadata,
      media,
      fields: "id, name, webViewLink",
    });

    const fileId = fileResponse.data.id;
    const fileName = fileResponse.data.name;
    const fileUrl = fileResponse.data.webViewLink; // Link to view in Drive

    // Remove local file after upload
    fs.unlinkSync(req.file.path);

    // Save to Firebase Database
    const newEntry = db.ref("uploads").push();
    await newEntry.set({ username, email, fileId, fileName, fileUrl });

    res.json({ success: true, fileId, fileName, fileUrl });
  } catch (error) {
    res.status(500).json({ error: "Upload failed", details: error.message });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
