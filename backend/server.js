const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { Client } = require("pg");
const { PythonShell } = require("python-shell");
const cors = require("cors");
require('dotenv').config();
const app = express();

// ✅ CRITICAL: Middleware MUST be here, BEFORE importing router
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Now import the router AFTER middleware is set
const chatBotRouter = require("./chatBotRouter");

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// --- DB CONFIG ---
const dbClient = new Client({
  connectionString:
    process.env.DATABASE_URL,
});
dbClient.connect();

let isProcessing = false;
async function checkForNewData() {
  if (isProcessing) {
    console.log("⚠️ Previous batch still processing. Skipping this check.");
    return;
  }

  isProcessing = true;
  console.log("🔍 Checking for new data...");

  try {
    const query = `
      SELECT DISTINCT machine_id, cycle_id
      FROM ps1_data
      WHERE (machine_id, cycle_id) NOT IN (
        SELECT machine_id, cycle_id FROM model_outputs
      )
      ORDER BY machine_id ASC, cycle_id ASC;
    `;

    const res = await dbClient.query(query);

    const missing = res.rows.map(r => ({
      machineId: r.machine_id,
      cycleId: r.cycle_id,
    }));

    if (missing.length === 0) {
      console.log("✅ No missing combinations.");
    } else {
      console.log(`🚀 Found ${missing.length} new combinations to process.`);

      for (const pair of missing) {
        runMLPipelineWrapper(pair.machineId, pair.cycleId);
        io.emit("prediction_update");
      }
    }

  } catch (err) {
    console.error("❌ Error during polling:", err);
  } finally {
    isProcessing = false;
  }
}

function runMLPipelineWrapper(machineId, cycleId) {
  const options = {
    mode: "text",
    pythonPath: "python",
    scriptPath: __dirname,
    args: [machineId, cycleId],
  };

  console.log(`⚙️ Running pipeline for Machine ${machineId}, Cycle ${cycleId}...`);
  
  PythonShell.run("pipeline.py", options);
  io.emit("prediction_update");
}

function sendClientRefreshSignal() {
  io.emit("prediction_update");
  console.log("updated the dashboard");
}

// Set the interval for 1 minute (60,000 milliseconds)
const CLIENT_REFRESH_INTERVAL_MS =  10000; 

// Start the scheduled emission
setInterval(sendClientRefreshSignal, CLIENT_REFRESH_INTERVAL_MS);
const POLLING_INTERVAL_MS =  10000;

checkForNewData();
setInterval(checkForNewData, POLLING_INTERVAL_MS);

// --- API ENDPOINTS ---
app.get("/operators", async (req, res) => {
  try {
    const operatorsResult = await dbClient.query(`
      SELECT operator_id, operator_name
      FROM operators
      ORDER BY operator_id ASC
    `);
    
    const machinesResult = await dbClient.query(`
      SELECT 
        m.operator_id,
        m.machine_id,
        m.machine_name
      FROM machines m
      ORDER BY m.operator_id ASC, m.machine_id ASC
    `);
    
    const machinesMap = {};
    machinesResult.rows.forEach(row => {
      if (!machinesMap[row.operator_id]) {
        machinesMap[row.operator_id] = [];
      }
      machinesMap[row.operator_id].push({
        machine_id: row.machine_id,
        machine_name: row.machine_name
      });
    });
    
    const operators = operatorsResult.rows.map(row => ({
      operator_id: row.operator_id,
      name: row.operator_name,
      machines: machinesMap[row.operator_id] || []
    }));
    
    res.json(operators);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/history", async (req, res) => {
  const { operator_id, machine_id } = req.query;

  try {
    const result = await dbClient.query(
      `
      SELECT 
        mo.machine_id,
        mo.cycle_id,
        mo.start_time,
        mo.output1 AS cooler,
        mo.output2 AS valve,
        mo.output3 AS pump,
        mo.output4 AS accumulator
      FROM model_outputs mo
      JOIN machines m ON mo.machine_id = m.machine_id
      WHERE ($1::int IS NULL OR m.operator_id = $1)
        AND ($2::int IS NULL OR mo.machine_id = $2)
      ORDER BY mo.machine_id ASC, mo.start_time DESC
      LIMIT 100
      `,
      [operator_id || null, machine_id || null]
    );

    res.json(result.rows.reverse());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post("/force-check", async (req, res) => {
  checkForNewData();
  res.send({ message: "Manual check triggered" });
});

// ✅ Register chatbot route AFTER all middleware
app.use("/api/chatbot", chatBotRouter);

server.listen(3000, () => {
  console.log(
    `🚀 Polling Server running. Checking every ${
      POLLING_INTERVAL_MS / 1000 / 60
    } minutes.`
  );
});