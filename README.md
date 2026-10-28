# 🌱 EcoSim — A Miniature Smart City Simulator & Analytics Platform

> **Web Technology College Project**  
> *A full-stack, responsive, interactive smart city engineering simulation platform with persistent MongoDB Atlas storage and real-time deterministic environmental modeling.*

---

## 📌 Executive Summary

**EcoSim** is a full-stack Web Technology college capstone project designed to model, simulate, and analyze sustainable urban ecosystems. Users can design custom smart city configurations—adjusting vehicular load, high-density built structures, tree canopy buffers, distributed photovoltaic (solar) infrastructure, and public transit adoption. 

The application calculates immediate environmental telemetry (traffic congestion, daily solar generation, particulate & carbon air quality index, and green canopy coverage) in real time using deterministic mathematical formulations. City configurations and their simulated performance snapshots are persistently stored in a cloud-hosted **MongoDB Atlas** database, enabling full CRUD (Create, Read, Update, Delete) management and side-by-side comparative benchmarking.

---

## 🛠️ Technology Stack

| Layer | Technologies Used | Description |
| :--- | :--- | :--- |
| **Frontend** | HTML5, CSS3, JavaScript (ES6+) | Modern semantic structure, CSS variables, glassmorphism, responsive flex/grid layouts. |
| **UI Framework** | Bootstrap 5.3.3, FontAwesome 6 | Mobile-first responsive grids, accessible modals, tooltips, responsive navbars, toast alerts. |
| **Graphics & Charts** | HTML5 Canvas 2D Engine, Chart.js 4.4 | 60-FPS dynamic miniature city visualizer (reacts to pollution & congestion) + multi-axis radar, bar, and doughnut charts. |
| **Backend** | Node.js (v20+ / v24+), Express.js 4.21 | RESTful API server, routing, JSON parsing, static asset delivery, error handling. |
| **Database** | MongoDB Atlas, Mongoose 8.9 | Cloud NoSQL database (`ecosim` database, `cities` collection), strict schema validation, timestamps. |
| **Environment** | Dotenv 16.4 | Safe credential management via `.env` file isolation. |
| **Testing** | Node.js Native Test Runner (`node:test`) | Unit tests for simulation calculations, boundary conditions, and API endpoint integration. |

---

## 📂 Project Directory Structure

```text
EcoSim/
├── .env                        <-- Private environment variables (MONGODB_URI, PORT) [DO NOT COMMIT]
├── .env.example                <-- Public template of required environment variables
├── .gitignore                  <-- Git ignore rules (node_modules, .env, logs)
├── package.json                <-- Project metadata, dependencies, and npm scripts
├── server.js                   <-- Express server entry point & static asset mounting
├── README.md                   <-- Complete project documentation and academic report
├── public/                     <-- Frontend presentation assets
│   ├── index.html              <-- Main single-page application structure & modals
│   ├── style.css               <-- Custom eco-green theme, cards, animations, responsive rules
│   ├── app.js                  <-- Frontend logic, form handlers, Chart.js telemetry, CRUD API client
│   └── cityVisualizer.js       <-- HTML5 Canvas 2D animated miniature smart city engine
├── src/                        <-- Backend source modules
│   ├── config/
│   │   └── database.js         <-- MongoDB Atlas connection manager & state observer
│   ├── middleware/
│   │   └── validationMiddleware.js <-- Request body & ObjectId sanitization middleware
│   ├── models/
│   │   └── City.js             <-- Mongoose schema for the 'cities' collection
│   ├── routes/
│   │   ├── cityRoutes.js       <-- RESTful CRUD routes (/api/cities)
│   │   ├── healthRoutes.js     <-- System status & reconnect routes (/api/health)
│   │   └── simulationRoutes.js <-- Live calculation endpoint (/api/simulation/calculate)
│   └── simulation/
│       └── simulationEngine.js <-- Reusable deterministic urban engineering calculation engine
└── tests/                      <-- Automated test suites
    ├── simulation.test.js      <-- Unit tests for mathematical formulas and boundary handling
    ├── api.test.js             <-- API route & validation integration tests
    └── db-check.js             <-- CLI diagnostic utility to verify MongoDB Atlas connection
```

---

## 🔑 CRITICAL: MongoDB Atlas Connection Setup

Your MongoDB Atlas credentials must be placed inside the local `.env` file in the root of the project:

### File Location:
```text
EcoSim/.env
```

### Format in `.env`:
```env
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/ecosim?retryWrites=true&w=majority
PORT=3000
```

### Step-by-Step Instructions to Obtain Your Atlas String:
1. Log into your account at [MongoDB Atlas](https://cloud.mongodb.com).
2. Navigate to **Database** (or **Clusters**) in the left navigation sidebar.
3. Click the **Connect** button next to your cluster.
4. Under "Connect your application", select **Drivers**.
5. Select **Driver: Node.js** and the latest version.
6. Copy the connection string provided.
7. Open `EcoSim/.env` in your editor.
8. Paste your connection string immediately after `MONGODB_URI=`.
9. **Important:** Replace `<username>` and `<password>` with your database user credentials (remove the angle brackets `< >`). Ensure the database name is `ecosim`.
10. If your password contains special characters (`@`, `:`, `/`, `#`), URL-encode them (e.g., `@` becomes `%40`).
11. In Atlas > **Network Access**, ensure your current IP address is whitelisted (or `0.0.0.0/0` is added to allow access from any IP during development and college demo).
12. Press `Ctrl + S` to save `EcoSim/.env`.

---

## ⚡ Quick Start & PowerShell Commands

### 1. Install Dependencies
Open Windows PowerShell in the `EcoSim` directory:
```powershell
npm install
```

### 2. Verify Database Connection
Run the built-in diagnostic tool to test if your Atlas connection string works:
```powershell
npm run test:db
```

### 3. Run Automated Tests
Execute all unit and integration tests:
```powershell
npm test
```

### 4. Start the Application
Start the Node.js Express server:
```powershell
npm start
```

Or start in development mode with file watching:
```powershell
npm run dev
```

### 5. Access the Local Website
Open your browser and navigate to:
```text
http://localhost:3000
```

---

## 📡 API Endpoint Reference

| HTTP Method | Endpoint | Description | Status Codes |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Application status, server uptime, and MongoDB connectivity state. | `200` |
| `POST` | `/api/health/reconnect` | Triggers a fresh database connection attempt without restarting server. | `200` |
| `GET` | `/api/cities` | Retrieves all saved cities from MongoDB (supports `?search=` and sorting). | `200`, `500` |
| `GET` | `/api/cities/:id` | Retrieves a single city by its 24-character hex MongoDB ObjectId. | `200`, `400`, `404` |
| `POST` | `/api/cities` | Validates input, calculates metrics, and persists a new city to Atlas. | `201`, `400`, `503` |
| `PUT` | `/api/cities/:id` | Updates an existing city document and recalculates simulation metrics. | `200`, `400`, `404`, `503` |
| `DELETE` | `/api/cities/:id` | Permanently deletes a city document from MongoDB Atlas. | `200`, `400`, `404`, `503` |
| `GET` | `/api/cities/compare/:id1/:id2` | Side-by-side comparison matrix of two saved cities with winner evaluation. | `200`, `400`, `404` |
| `POST` | `/api/simulation/calculate` | Calculates telemetry on-the-fly without saving to the database. | `200`, `400` |

---

## 🎓 Academic Project Report Documentation

### 3.1 Proposed Methodology
Urban environments are complex socio-ecological systems characterized by non-linear interactions among transit infrastructure, built density, industrial/HVAC emissions, and green sequestration assets. EcoSim proposes an interactive simulation methodology:
1. **Parameter Elicitation:** The user specifies quantitative urban zoning parameters (vehicles, buildings, trees, solar arrays, parklands, transit adoption).
2. **Deterministic Modeling:** The simulation engine processes the inputs through mathematical equations grounded in urban planning principles (road capacity saturation, photovoltaic peak hours, vegetative carbon sequestration).
3. **Multi-Sensory Feedback:** Telemetry is translated into both analytical indicators (radar, stacked bar, and doughnut charts) and a 60-FPS dynamic canvas illustration.
4. **Cloud Persistence & Comparative Synthesis:** Urban designs are committed to MongoDB Atlas NoSQL storage, enabling cross-model benchmarking and optimization.

```mermaid
flowchart LR
    A[Urban Planner / Student] -->|1. Configure Sliders| B[Interactive City Builder]
    B -->|2. Deterministic Modeling| C[Simulation Engine]
    C -->|3. Real-Time Telemetry| D[Dashboard & Chart.js]
    C -->|4. Dynamic Rendering| E[HTML5 Canvas 2D City]
    B -->|5. Save / Update| F[Express REST API]
    F -->|6. BSON Validation| G[(MongoDB Atlas 'cities')]
    G -->|7. Fetch & Compare| H[City Comparison Engine]
```

---

### 3.2 System Architecture — Three-Tier Architecture
EcoSim is structured according to the classic Three-Tier Architectural Pattern:

```mermaid
graph TD
    subgraph Presentation_Tier ["1. Presentation Tier (Client Browser)"]
        UI[Bootstrap 5 Responsive UI]
        CANVAS[HTML5 Canvas 2D Engine]
        CHARTS[Chart.js 4.4 Analytics]
        APP[app.js REST Client & Controller]
    end

    subgraph Application_Tier ["2. Application Tier (Node.js & Express)"]
        SERVER[server.js Server Dispatcher]
        ROUTES[REST Routes: /api/cities, /api/health]
        MIDDLEWARE[Validation & ObjectId Guard]
        SIM[Deterministic Simulation Engine]
    end

    subgraph Data_Tier ["3. Data Tier (Cloud Storage)"]
        MONGO[(MongoDB Atlas Cluster)]
        SCHEMA[Mongoose ODM Schema: 'cities']
    end

    UI --> APP
    CANVAS --> APP
    CHARTS --> APP
    APP -->|HTTP JSON Requests| ROUTES
    ROUTES --> MIDDLEWARE
    MIDDLEWARE --> SIM
    SIM --> ROUTES
    ROUTES -->|Mongoose Queries| SCHEMA
    SCHEMA -->|TLS Connection String| MONGO
```

---

### 3.3 Website Structure and Navigation Flow

```mermaid
flowchart TD
    HOME[Home / Hero Section] --> DASHBOARD[Smart City Dashboard]
    HOME --> BUILDER[Interactive City Builder]
    DASHBOARD --> KPIS[KPI Scorecards & Grade]
    BUILDER --> SLIDERS[Urban Parameter Sliders]
    BUILDER --> PRESETS[Presets: Eco-Utopia, Solar City, Industrial]
    BUILDER --> CANVAS[Dynamic City Canvas View]
    BUILDER --> POST_API[Save City to MongoDB]
    POST_API --> SAVED[Saved Cities Section]
    SAVED --> VIEW[Load into Builder]
    SAVED --> EDIT[Edit in Builder & PUT API]
    SAVED --> DEL[Delete City & Modal Confirmation]
    SAVED --> COMPARE[Compare Cities Section]
    COMPARE --> COMP_API[Compare Matrix & Winning Metrics]
    HOME --> METHODOLOGY[Project Methodology & Formulas]
```

---

### 3.4 UML Diagram — Use Case Diagram

```mermaid
flowchart LR
    User((College Evaluator / Student))

    subgraph EcoSim_System ["EcoSim Smart City Platform"]
        UC1([Explore Simulation Dashboard])
        UC2([Adjust Urban Sliders & Presets])
        UC3([Observe Dynamic Canvas Animation])
        UC4([Save City Configuration to Atlas])
        UC5([Retrieve & Filter Saved Cities])
        UC6([Update Existing City Document])
        UC7([Delete City with Confirmation])
        UC8([Compare Two Saved Cities])
        UC9([Verify Database Health & Diagnostics])
    end

    User --> UC1
    User --> UC2
    User --> UC3
    User --> UC4
    User --> UC5
    User --> UC6
    User --> UC7
    User --> UC8
    User --> UC9
```

---

### 3.5 Database Design (MongoDB `cities` Collection)

```mermaid
erDiagram
    CITY {
        ObjectId _id PK "Unique Document Identifier"
        string cityName "Required, 2-60 characters"
        string description "Optional, max 300 characters"
        number vehicles "Integer >= 0"
        number buildings "Integer >= 0"
        number trees "Integer >= 0"
        number solarPanels "Integer >= 0"
        number greenSpaceSqKm "Float >= 0, default 4.5"
        number publicTransitRatio "Percentage 0-100%, default 30"
        object simulationMetrics "Cached snapshot of calculated telemetry"
        date createdAt "Automatic Mongoose timestamp"
        date updatedAt "Automatic Mongoose timestamp"
    }

    SIMULATION_METRICS {
        number trafficCongestion "0 - 100%"
        string trafficLevel "Smooth, Moderate, Severe"
        number pollutionIndex "0 - 100 Air Quality Scale"
        string airQuality "Clean, Moderate, Unhealthy, Hazardous"
        number solarEnergyOutputKWh "Daily generation output"
        number solarCoveragePercent "Ratio of solar to building demand"
        number greeneryPercentage "Ratio of green canopy to urban area"
        number sustainabilityScore "Composite score 0 - 100"
        string sustainabilityGrade "A+, A, B, C, D, F"
        number co2SavedKgPerDay "Estimated daily carbon offset"
    }

    CITY ||--|| SIMULATION_METRICS : embeds
```

---

### 3.6 Simulation Mathematical Formulas & Assumptions

1. **Traffic Congestion ($T\%$):**
   $$\text{Road Capacity } (C) = \max(150, (B \times 7.5) + 250)$$
   $$V_{\text{effective}} = V \times \left(1 - \frac{\text{Transit}\%}{100} \times 0.45\right)$$
   $$\text{Congestion } \% = \min\left(100, \max\left(0, \frac{V_{\text{effective}} / C}{(V_{\text{effective}} / C) + 0.95} \times 100\right)\right)$$

2. **Solar Clean Energy Generation ($E_{\text{solar}}$):**
   $$\text{Daily Output } (kWh) = N_{\text{panels}} \times 1.75\text{ kWh/panel/day}$$
   $$\text{Building Demand } (kWh) = N_{\text{buildings}} \times 35\text{ kWh/building/day}$$
   $$\text{Solar Coverage } \% = \min\left(100, \frac{\text{Daily Output}}{\text{Building Demand}} \times 100\right)$$

3. **Air Quality / Pollution Index ($P$):**
   $$\text{Gross Emissions} = (V \times 0.085) + (B \times 0.050)$$
   $$\text{Carbon Offsets} = (T_{\text{trees}} \times 0.038) + (S_{\text{solar}} \times 0.035)$$
   $$\text{Net Emissions} = \max(0, \text{Gross Emissions} - \text{Carbon Offsets})$$
   $$P_{\text{index}} = \min\left(100, \frac{\text{Net Emissions}}{\text{Net Emissions} + 65} \times 100\right)$$

4. **Green Canopy Percentage ($G\%$):**
   $$\text{Green Area } (m^2) = (T_{\text{trees}} \times 20) + (\text{Parks}_{\text{sqkm}} \times 10,000)$$
   $$\text{Built Footprint } (m^2) = \max(100, (B \times 120) + (V \times 25))$$
   $$G\% = \min\left(100, \frac{\text{Green Area}}{\text{Green Area} + \text{Built Footprint}} \times 100\right)$$

5. **Composite Sustainability Score ($S$):**
   $$S = (E_{\text{coverage}} \times 0.25) + ((100 - P_{\text{index}}) \times 0.30) + (G\% \times 0.25) + ((100 - T\%) \times 0.20)$$

---

## 🌐 Public Deployment Guide for College Judges

When presenting your project publicly, host your application on platforms such as **Render**, **Railway**, or **Fly.io**:

### Recommended Provider: [Render.com](https://render.com) (Free Tier available)
1. Push your repository to **GitHub** (ensure `.env` is ignored by Git).
2. Create a free account on Render.
3. Click **New +** > **Web Service**.
4. Connect your GitHub repository.
5. Configure:
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
6. In the **Environment Variables** section on Render:
   - Add Key: `MONGODB_URI`
   - Add Value: Your full MongoDB Atlas connection string:  
     `mongodb+srv://<username>:<password>@<cluster>.mongodb.net/ecosim?retryWrites=true&w=majority`
   - Add Key: `PORT`
   - Add Value: `3000` (or leave default for Render to supply `PORT`)
7. Click **Deploy Web Service**.
8. In MongoDB Atlas, ensure **Network Access** includes `0.0.0.0/0` so the cloud hosting platform can connect securely to your database cluster.

---

## 🛡️ Security Best Practices Implemented
- **No Hardcoded Credentials:** Credentials are exclusively loaded via `process.env.MONGODB_URI`.
- **Sensitive File Exclusion:** `.env` and `node_modules/` are strictly excluded in `.gitignore`.
- **Safe URI Masking:** Logging routines automatically mask passwords (`mongodb+srv://***:***@cluster...`).
- **Input Sanitization & Bounds Checking:** Numeric inputs are checked for integer constraints, non-negativity, and reasonable maximums on the server.
- **ObjectId Format Guards:** Route parameters are validated with `mongoose.Types.ObjectId.isValid()` prior to database query execution.

---

## 👨‍💻 College Presentation Tips
- **Demonstrate Real-Time Responsiveness:** Move the vehicle slider from 100 to 2,000 and point out how the canvas vehicles slow down in traffic while the sky shifts into a smog haze.
- **Show Database Persistence:** Save a new city named "Judge Showcase City". Refresh the page in the browser to demonstrate that the data is loaded from MongoDB Atlas, not browser memory.
- **Show City Comparison:** Select "Val Verde Carbon-Neutral Oasis" and "Titan Industrial Metropolis" in the Compare tab to highlight the comparative matrix and advantage badges.

