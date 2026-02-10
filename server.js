
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Allow connections from any machine on the LAN
    methods: ["GET", "POST"]
  }
});

const DATA_FILE = path.join(__dirname, 'manufacturing_data.json');

// --- Default Data Structure ---
let appState = {
  history: [],
  stages: [
    { id: 1, name: "Kiểm tra sản phẩm", enableMeasurement: true, measurementLabel: "Kết quả Test" },
  ],
  stageEmployees: {}, // { 1: "NV001" }
};

// --- Load Data from Disk ---
if (fs.existsSync(DATA_FILE)) {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    appState = JSON.parse(raw);
    console.log("📂 Data loaded from disk.");
  } catch (e) {
    console.error("Error loading data:", e);
  }
}

// --- Save Data Helper ---
const saveData = () => {
  fs.writeFile(DATA_FILE, JSON.stringify(appState, null, 2), (err) => {
    if (err) console.error("Error saving data:", err);
  });
};

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // 1. Send initial data to the newly connected client
  socket.emit('init_data', appState);

  // 2. Listen for new scans
  socket.on('client_add_scan', (newRecord) => {
    // Add to history
    appState.history.unshift(newRecord);
    
    // Broadcast updated history to ALL clients
    io.emit('server_update_history', appState.history);
    saveData();
  });

  // 3. Listen for Stage Settings changes
  socket.on('client_update_stages', (newStages) => {
    appState.stages = newStages;
    io.emit('server_update_stages', appState.stages);
    saveData();
  });

  // 4. Listen for Employee changes
  socket.on('client_update_employee', ({ stageId, employeeId }) => {
    appState.stageEmployees[stageId] = employeeId;
    io.emit('server_update_employees', appState.stageEmployees);
    saveData();
  });

  // 5. Reset Data
  socket.on('client_reset_data', () => {
    appState.history = [];
    appState.stageEmployees = {};
    // Keep stages config
    io.emit('init_data', appState);
    saveData();
  });
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`🚀 ProScan Server running on port ${PORT}`);
  console.log(`📡 Connect clients to: http://[YOUR_PC_IP]:${PORT}`);
});
