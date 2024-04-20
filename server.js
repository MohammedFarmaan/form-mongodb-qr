const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");
const multer = require("multer");
const mongoose = require("mongoose");
const QRCode = require("qrcode");

const port = 3000;

app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));

// MongoDB setup
mongoose.connect("mongodb://localhost:27017/mydatabase", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
const db = mongoose.connection;

db.on("error", console.error.bind(console, "MongoDB connection error:"));
db.once("open", function () {
  console.log("Connected to MongoDB");
});

// Multer setup for handling file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "uploads"));
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + "-" + Date.now());
  },
});
const upload = multer({ storage: storage });

// Serve HTML form
app.get("/", (req, res) => {
  res.sendFile(path.resolve(__dirname, "form.html"));
});

// Handle form submission
app.post("/submit", upload.single("image"), (req, res) => {
  const formData = req.body;
  console.log("Form data:", formData);

  // Generate a unique ID for the form submission
  const uniqueId = new mongoose.Types.ObjectId().toString();

  // Create a MongoDB document with form data, image path, and unique ID
  const data = {
    _id: uniqueId, // Set the unique ID
    formData: formData,
    imagePath: req.file ? req.file.path : null, // Store the path to the uploaded image
  };

  // Save data to MongoDB using promises
  MyModel.create(data)
    .then((result) => {
      console.log("Data saved to MongoDB:", result);
      res.send("Form submitted successfully!");
    })
    .catch((error) => {
      console.error("Error saving data to MongoDB:", error);
      res.status(500).send("Error saving data to MongoDB");
    });
});

// Define a MongoDB schema and model
const Schema = mongoose.Schema;
const mySchema = new Schema({
  _id: String, // Define a field for the unique ID
  formData: Object,
  imagePath: String,
});
const MyModel = mongoose.model("MyModel", mySchema);

// Route to generate QR code for a given unique ID
app.get("/qr/:id", async (req, res) => {
  const id = req.params.id;

  try {
    // Find the form data by ID from MongoDB
    const data = await MyModel.findById(id);
    if (!data) {
      return res.status(404).send("Data not found");
    }

    // Generate QR code with form data
    const qrData = JSON.stringify(data.formData);
    const qrCode = await QRCode.toDataURL(qrData);

    // Send the QR code image as a response
    res.send(`<img src="${qrCode}" alt="QR Code">`);
  } catch (error) {
    console.error("Error generating QR code:", error);
    res.status(500).send("Error generating QR code");
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
