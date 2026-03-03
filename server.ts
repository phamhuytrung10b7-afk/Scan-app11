import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("production.db");

// Initialize Database Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS models (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS components (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    standard_time_minutes REAL NOT NULL,
    setup_time_minutes REAL DEFAULT 0,
    buffer_time_minutes REAL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS plan_details (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plan_id INTEGER NOT NULL,
    component_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    leadtime_minutes REAL NOT NULL,
    is_bottleneck BOOLEAN DEFAULT 0,
    FOREIGN KEY (plan_id) REFERENCES plans(id),
    FOREIGN KEY (component_id) REFERENCES components(id)
  );

  CREATE TABLE IF NOT EXISTS bom (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    model_id INTEGER NOT NULL,
    component_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    FOREIGN KEY (model_id) REFERENCES models(id),
    FOREIGN KEY (component_id) REFERENCES components(id)
  );

  CREATE TABLE IF NOT EXISTS capacity (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workers INTEGER NOT NULL,
    hours_per_day REAL NOT NULL
  );

  CREATE TABLE IF NOT EXISTS plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    model_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    start_date TEXT NOT NULL,
    deadline TEXT NOT NULL,
    estimated_completion_date TEXT,
    gap_hours REAL,
    status TEXT DEFAULT 'pending',
    FOREIGN KEY (model_id) REFERENCES models(id)
  );
`);

// Seed initial capacity if not exists
const capacityCount = db.prepare("SELECT COUNT(*) as count FROM capacity").get() as { count: number };
if (capacityCount.count === 0) {
  db.prepare("INSERT INTO capacity (workers, hours_per_day) VALUES (?, ?)").run(10, 8);
  
  // Seed sample models
  const m1 = db.prepare("INSERT INTO models (code, name) VALUES (?, ?)").run("WP-001", "Máy lọc nước RO 9 lõi");
  const m2 = db.prepare("INSERT INTO models (code, name) VALUES (?, ?)").run("WP-002", "Máy lọc nước Nano 7 lõi");

  // Seed sample components
  const c1 = db.prepare("INSERT INTO components (code, name, standard_time_minutes) VALUES (?, ?, ?)").run("TRAY-A", "Khay nhựa loại A", 5);
  const c2 = db.prepare("INSERT INTO components (code, name, standard_time_minutes) VALUES (?, ?, ?)").run("TRAY-B", "Khay nhựa loại B", 8);
  const c3 = db.prepare("INSERT INTO components (code, name, standard_time_minutes) VALUES (?, ?, ?)").run("FILTER-H", "Vỏ cốc lọc", 3);

  // Seed sample BOM
  db.prepare("INSERT INTO bom (model_id, component_id, quantity) VALUES (?, ?, ?)").run(m1.lastInsertRowid, c1.lastInsertRowid, 2);
  db.prepare("INSERT INTO bom (model_id, component_id, quantity) VALUES (?, ?, ?)").run(m1.lastInsertRowid, c2.lastInsertRowid, 1);
  db.prepare("INSERT INTO bom (model_id, component_id, quantity) VALUES (?, ?, ?)").run(m1.lastInsertRowid, c3.lastInsertRowid, 9);

  db.prepare("INSERT INTO bom (model_id, component_id, quantity) VALUES (?, ?, ?)").run(m2.lastInsertRowid, c1.lastInsertRowid, 1);
  db.prepare("INSERT INTO bom (model_id, component_id, quantity) VALUES (?, ?, ?)").run(m2.lastInsertRowid, c3.lastInsertRowid, 7);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  
  // Models
  app.get("/api/models", (req, res) => {
    const models = db.prepare("SELECT * FROM models").all();
    res.json(models);
  });

  app.post("/api/models", (req, res) => {
    const { code, name } = req.body;
    try {
      const result = db.prepare("INSERT INTO models (code, name) VALUES (?, ?)").run(code, name);
      res.json({ id: result.lastInsertRowid });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.put("/api/models/:id", (req, res) => {
    const { code, name } = req.body;
    try {
      db.prepare("UPDATE models SET code = ?, name = ? WHERE id = ?").run(code, name, req.params.id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.delete("/api/models/:id", (req, res) => {
    try {
      db.prepare("DELETE FROM models WHERE id = ?").run(req.params.id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // Components
  app.get("/api/components", (req, res) => {
    const components = db.prepare("SELECT * FROM components").all();
    res.json(components);
  });

  app.post("/api/components", (req, res) => {
    const { code, name, standard_time_minutes, setup_time_minutes, buffer_time_minutes } = req.body;
    try {
      const result = db.prepare("INSERT INTO components (code, name, standard_time_minutes, setup_time_minutes, buffer_time_minutes) VALUES (?, ?, ?, ?, ?)").run(code, name, standard_time_minutes, setup_time_minutes || 0, buffer_time_minutes || 0);
      res.json({ id: result.lastInsertRowid });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.put("/api/components/:id", (req, res) => {
    const { code, name, standard_time_minutes, setup_time_minutes, buffer_time_minutes } = req.body;
    try {
      db.prepare("UPDATE components SET code = ?, name = ?, standard_time_minutes = ?, setup_time_minutes = ?, buffer_time_minutes = ? WHERE id = ?").run(code, name, standard_time_minutes, setup_time_minutes || 0, buffer_time_minutes || 0, req.params.id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.delete("/api/components/:id", (req, res) => {
    try {
      db.prepare("DELETE FROM components WHERE id = ?").run(req.params.id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // BOM
  app.get("/api/bom/:modelId", (req, res) => {
    const bom = db.prepare(`
      SELECT bom.*, components.name as component_name, components.code as component_code, components.standard_time_minutes 
      FROM bom 
      JOIN components ON bom.component_id = components.id 
      WHERE model_id = ?
    `).all(req.params.modelId);
    res.json(bom);
  });

  app.post("/api/bom", (req, res) => {
    const { model_id, component_id, quantity } = req.body;
    try {
      const result = db.prepare("INSERT INTO bom (model_id, component_id, quantity) VALUES (?, ?, ?)").run(model_id, component_id, quantity);
      res.json({ id: result.lastInsertRowid });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.put("/api/bom/:id", (req, res) => {
    const { quantity } = req.body;
    try {
      db.prepare("UPDATE bom SET quantity = ? WHERE id = ?").run(quantity, req.params.id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.delete("/api/bom/:id", (req, res) => {
    try {
      db.prepare("DELETE FROM bom WHERE id = ?").run(req.params.id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // Capacity
  app.get("/api/capacity", (req, res) => {
    const capacity = db.prepare("SELECT * FROM capacity LIMIT 1").get();
    res.json(capacity);
  });

  app.post("/api/capacity", (req, res) => {
    const { workers, hours_per_day } = req.body;
    db.prepare("UPDATE capacity SET workers = ?, hours_per_day = ?").run(workers, hours_per_day);
    res.json({ success: true });
  });

  // Planning Logic
  const addDaysSkippingSundays = (date: Date, days: number): Date => {
    const result = new Date(date);
    let added = 0;
    const direction = days >= 0 ? 1 : -1;
    const absDays = Math.abs(days);
    
    while (added < absDays) {
      result.setDate(result.getDate() + direction);
      if (result.getDay() !== 0) { // 0 is Sunday
        added++;
      }
    }
    return result;
  };

  const calculatePlanData = (model_id: number, quantity: number, start_date: string, deadline: string) => {
    // 1. Get BOM for the model with component details
    const bom = db.prepare(`
      SELECT bom.quantity, components.id as component_id, components.name, components.standard_time_minutes, 
             components.setup_time_minutes, components.buffer_time_minutes
      FROM bom 
      JOIN components ON bom.component_id = components.id 
      WHERE model_id = ?
    `).all(model_id) as any[];

    if (bom.length === 0) {
      throw new Error("No BOM found for this model");
    }

    // 2. Get Capacity
    const capacity = db.prepare("SELECT * FROM capacity LIMIT 1").get() as { workers: number, hours_per_day: number };
    const dailyCapacityMinutes = capacity.workers * capacity.hours_per_day * 60;
    const shiftCapacityMinutes = capacity.hours_per_day * 60; // Capacity of one person/machine per shift

    // 3. Calculate Leadtime and Schedule for each component (Backward Scheduling)
    // We sort by leadtime descending to prioritize longer tasks (Resource Allocation heuristic)
    const componentSchedules = bom.map(item => {
      const leadtimeMinutes = (item.quantity * item.standard_time_minutes * quantity) + (item.setup_time_minutes || 0) + (item.buffer_time_minutes || 0);
      const daysNeeded = Math.ceil(leadtimeMinutes / dailyCapacityMinutes);
      const isBottleneck = leadtimeMinutes > shiftCapacityMinutes;

      return {
        ...item,
        leadtimeMinutes,
        daysNeeded,
        isBottleneck
      };
    }).sort((a, b) => b.leadtimeMinutes - a.leadtimeMinutes);

    const deadlineDate = new Date(deadline);
    const schedules = componentSchedules.map(item => {
      const endDate = new Date(deadlineDate);
      const startDate = addDaysSkippingSundays(endDate, -item.daysNeeded);
      
      return {
        component_id: item.component_id,
        quantity: item.quantity * quantity,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        leadtime_minutes: item.leadtimeMinutes,
        is_bottleneck: item.isBottleneck ? 1 : 0
      };
    });

    // 4. Calculate Total Production Time (minutes) for the whole plan
    let totalTimeMinutes = 0;
    bom.forEach(item => {
      totalTimeMinutes += item.quantity * item.standard_time_minutes * quantity;
    });

    // 5. Calculate Days Needed for the whole plan (Forward from start_date)
    const daysNeededTotal = Math.ceil(totalTimeMinutes / dailyCapacityMinutes);
    const startDateObj = new Date(start_date);
    const estimatedCompletionDate = addDaysSkippingSundays(startDateObj, daysNeededTotal);

    // 6. Calculate Gap Hours
    let gapHours = 0;
    if (estimatedCompletionDate > deadlineDate) {
      const diffMs = estimatedCompletionDate.getTime() - deadlineDate.getTime();
      gapHours = diffMs / (1000 * 60 * 60);
    }

    return {
      estimated_completion_date: estimatedCompletionDate.toISOString().split('T')[0],
      gap_hours: gapHours,
      total_time_minutes: totalTimeMinutes,
      days_needed: daysNeededTotal,
      schedules
    };
  };

  app.post("/api/plans", (req, res) => {
    const { model_id, quantity, start_date, deadline } = req.body;
    try {
      const planData = calculatePlanData(model_id, quantity, start_date, deadline);
      
      const insertPlan = db.transaction(() => {
        const result = db.prepare(`
          INSERT INTO plans (model_id, quantity, start_date, deadline, estimated_completion_date, gap_hours) 
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(model_id, quantity, start_date, deadline, planData.estimated_completion_date, planData.gap_hours);

        const planId = result.lastInsertRowid;

        const insertSchedule = db.prepare(`
          INSERT INTO plan_details (plan_id, component_id, quantity, start_date, end_date, leadtime_minutes, is_bottleneck)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        for (const s of planData.schedules) {
          insertSchedule.run(planId, s.component_id, s.quantity, s.start_date, s.end_date, s.leadtime_minutes, s.is_bottleneck);
        }

        return planId;
      });

      const planId = insertPlan();
      res.json({ id: planId, ...planData });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.put("/api/plans/:id", (req, res) => {
    const { model_id, quantity, start_date, deadline } = req.body;
    try {
      const planData = calculatePlanData(model_id, quantity, start_date, deadline);
      
      const updatePlan = db.transaction(() => {
        db.prepare(`
          UPDATE plans 
          SET model_id = ?, quantity = ?, start_date = ?, deadline = ?, estimated_completion_date = ?, gap_hours = ? 
          WHERE id = ?
        `).run(model_id, quantity, start_date, deadline, planData.estimated_completion_date, planData.gap_hours, req.params.id);

        db.prepare("DELETE FROM plan_details WHERE plan_id = ?").run(req.params.id);

        const insertSchedule = db.prepare(`
          INSERT INTO plan_details (plan_id, component_id, quantity, start_date, end_date, leadtime_minutes, is_bottleneck)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        for (const s of planData.schedules) {
          insertSchedule.run(req.params.id, s.component_id, s.quantity, s.start_date, s.end_date, s.leadtime_minutes, s.is_bottleneck);
        }
      });

      updatePlan();
      res.json({ success: true, ...planData });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.delete("/api/plans/:id", (req, res) => {
    try {
      const deletePlan = db.transaction(() => {
        db.prepare("DELETE FROM plan_details WHERE plan_id = ?").run(req.params.id);
        db.prepare("DELETE FROM plans WHERE id = ?").run(req.params.id);
      });
      deletePlan();
      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.get("/api/plans/:id/roadmap", (req, res) => {
    const roadmap = db.prepare(`
      SELECT plan_details.*, components.name as component_name, components.code as component_code
      FROM plan_details
      JOIN components ON plan_details.component_id = components.id
      WHERE plan_id = ?
      ORDER BY start_date ASC
    `).all(req.params.id);
    res.json(roadmap);
  });

  app.get("/api/plans", (req, res) => {
    const plans = db.prepare(`
      SELECT plans.*, models.name as model_name, models.code as model_code 
      FROM plans 
      JOIN models ON plans.model_id = models.id
      ORDER BY plans.id DESC
    `).all();
    res.json(plans);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
