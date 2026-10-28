/**
 * EcoSim — Miniature Smart City Simulator
 * Module: Simulation Engine
 * 
 * Reusable, deterministic simulation engine that computes key smart-city metrics
 * based on urban configuration (vehicles, buildings, trees, solar panels, green space).
 * All formulas use transparent mathematical models with documented assumptions.
 */

/**
 * Validates and sanitizes city configuration input parameters
 * @param {Object} input - Raw user inputs
 * @returns {Object} Sanitized numeric inputs with sensible defaults
 */
function sanitizeInputs(input = {}) {
  const sanitize = (val, min, max, defaultVal) => {
    const num = Number(val);
    if (isNaN(num)) return defaultVal;
    if (num < min) return min;
    if (max !== undefined && num > max) return max;
    return Math.round(num * 100) / 100; // Keep up to 2 decimal places
  };

  return {
    vehicles: sanitize(input.vehicles, 0, 100000, 250),
    buildings: sanitize(input.buildings, 0, 50000, 120),
    trees: sanitize(input.trees, 0, 200000, 600),
    solarPanels: sanitize(input.solarPanels, 0, 100000, 300),
    greenSpaceSqKm: sanitize(input.greenSpaceSqKm, 0, 500, 4.5),
    publicTransitRatio: sanitize(input.publicTransitRatio, 0, 100, 30) // 0 - 100%
  };
}

/**
 * Calculate Traffic Congestion (0 - 100%)
 * 
 * Assumptions:
 * - City road capacity scales with buildings (urban zones) with a baseline baseline capacity of 200 units.
 * - Each building contributes approximately 8 vehicle road-capacity units.
 * - Public transit reduces single-occupancy vehicle demand by up to 50% at 100% adoption.
 * - Congestion follows an asymptotic saturation curve: Congestion = (V / (V + Capacity)) * 100.
 */
function calculateTrafficCongestion(vehicles, buildings, publicTransitRatio = 30) {
  if (vehicles <= 0) {
    return {
      percentage: 0,
      level: 'Clear',
      description: 'Zero motorized traffic. Roads are completely free.'
    };
  }

  // Base capacity scaling with built environment
  const roadCapacity = Math.max(150, (buildings * 7.5) + 250);
  
  // Public transit mitigation factor: transit adoption takes cars off the road
  const transitMitigation = 1 - ((publicTransitRatio / 100) * 0.45);
  const effectiveVehicles = vehicles * transitMitigation;

  // Saturation formula
  const saturationRatio = effectiveVehicles / roadCapacity;
  const percentage = Math.min(100, Math.max(0, Math.round((saturationRatio / (saturationRatio + 0.95)) * 100)));

  let level = 'Smooth';
  let description = 'Free flowing traffic with minimal delays.';
  if (percentage >= 75) {
    level = 'Severe Congestion';
    description = 'Gridlock conditions. High idle emissions and transit delays.';
  } else if (percentage >= 50) {
    level = 'Moderate Congestion';
    description = 'Noticeable rush-hour slowdowns and bottlenecking.';
  } else if (percentage >= 25) {
    level = 'Light Congestion';
    description = 'Stable traffic with occasional minor slowdowns at intersections.';
  }

  return { percentage, level, description, effectiveVehicles: Math.round(effectiveVehicles) };
}

/**
 * Calculate Solar Energy Output (kWh/day and coverage %)
 * 
 * Assumptions:
 * - A standard modern commercial/residential PV panel produces ~1.75 kWh/day (4.5 peak sun hours @ 400W).
 * - An average smart-city building consumes ~35 kWh/day of electrical energy.
 * - Clean energy coverage measures the ratio of generated solar power against building demand.
 */
function calculateSolarEnergy(solarPanels, buildings) {
  const KWH_PER_PANEL_PER_DAY = 1.75;
  const KWH_PER_BUILDING_PER_DAY = 35;

  const dailyOutputKWh = Math.round(solarPanels * KWH_PER_PANEL_PER_DAY * 10) / 10;
  const annualOutputMWh = Math.round((dailyOutputKWh * 365 / 1000) * 10) / 10;
  
  const estimatedDemandKWh = Math.round(buildings * KWH_PER_BUILDING_PER_DAY * 10) / 10;
  
  let coveragePercentage = 100;
  if (estimatedDemandKWh > 0) {
    coveragePercentage = Math.min(100, Math.max(0, Math.round((dailyOutputKWh / estimatedDemandKWh) * 100)));
  } else if (dailyOutputKWh === 0) {
    coveragePercentage = 0;
  }

  let status = 'Independent / Surplus';
  if (coveragePercentage < 25) status = 'Critically Low';
  else if (coveragePercentage < 50) status = 'Partial Clean Energy';
  else if (coveragePercentage < 80) status = 'High Renewable Mix';
  else if (coveragePercentage < 100) status = 'Near Self-Sufficient';

  return {
    dailyOutputKWh,
    annualOutputMWh,
    estimatedDemandKWh,
    coveragePercentage,
    status,
    co2SavedKgPerDay: Math.round(dailyOutputKWh * 0.42 * 10) / 10 // Avg 0.42 kg CO2 offset per kWh solar
  };
}

/**
 * Calculate Pollution Index (0 - 100 Scale)
 * 
 * Assumptions:
 * - Vehicles emit combustion gases, tire particles, NOx (+0.085 pollution score per vehicle).
 * - Buildings emit HVAC and electrical generation byproduct (+0.05 score per building).
 * - Trees act as carbon/particulate sinks (-0.038 score per tree).
 * - Solar panels offset fossil fuel grid load (-0.035 score per panel).
 * - Net emissions scale through an asymptotic curve into an Air Quality Index-style score (0-100).
 */
function calculatePollutionIndex(vehicles, buildings, trees, solarPanels) {
  if (vehicles === 0 && buildings === 0) {
    return {
      index: 0,
      category: 'Pure / Pristine',
      airQuality: 'Excellent',
      grossEmissions: 0,
      totalOffsets: Math.round((trees * 0.038 + solarPanels * 0.035) * 10) / 10
    };
  }

  const vehicleEmissions = vehicles * 0.085;
  const buildingEmissions = buildings * 0.050;
  const grossEmissions = vehicleEmissions + buildingEmissions;

  const treeOffset = trees * 0.038;
  const solarOffset = solarPanels * 0.035;
  const totalOffsets = treeOffset + solarOffset;

  const netEmissions = Math.max(0, grossEmissions - totalOffsets);

  // Smooth asymptotic mapping: net = 0 => 0, net = 60 => 50, net = 240 => 80
  const index = Math.min(100, Math.max(0, Math.round((netEmissions / (netEmissions + 65)) * 100)));

  let category = 'Good';
  let airQuality = 'Clean & Healthy';
  if (index >= 75) {
    category = 'Hazardous';
    airQuality = 'Smog Alert — Unsafe';
  } else if (index >= 50) {
    category = 'Unhealthy';
    airQuality = 'Elevated Particulates';
  } else if (index >= 25) {
    category = 'Moderate';
    airQuality = 'Acceptable';
  }

  return {
    index,
    category,
    airQuality,
    grossEmissions: Math.round(grossEmissions * 10) / 10,
    totalOffsets: Math.round(totalOffsets * 10) / 10,
    netEmissions: Math.round(netEmissions * 10) / 10
  };
}

/**
 * Calculate Greenery Percentage (0 - 100%)
 * 
 * Assumptions:
 * - Total urban footprint = built structures + road reserves + parklands.
 * - Trees provide canopy cover (~20 m² canopy area per tree).
 * - Designated green space reserves contribute 10,000 m² per sq km.
 * - Built footprint = buildings (120 m² base) + road footprint allocated to vehicles (25 m² per vehicle).
 */
function calculateGreenery(trees, greenSpaceSqKm, buildings, vehicles) {
  if (trees === 0 && greenSpaceSqKm === 0) {
    return {
      percentage: 0,
      assessment: 'Barren Concrete Jungle',
      canopyAreaM2: 0,
      urbanFootprintM2: Math.max(100, (buildings * 120) + (vehicles * 25))
    };
  }

  const canopyAreaM2 = trees * 20;
  const parkAreaM2 = greenSpaceSqKm * 10000;
  const totalGreenAreaM2 = canopyAreaM2 + parkAreaM2;

  const builtAreaM2 = Math.max(100, (buildings * 120) + (vehicles * 25));
  const totalAreaM2 = totalGreenAreaM2 + builtAreaM2;

  const percentage = Math.min(100, Math.max(0, Math.round((totalGreenAreaM2 / totalAreaM2) * 100)));

  let assessment = 'Dense Urban Greenery';
  if (percentage < 15) assessment = 'Critically Low Vegetation';
  else if (percentage < 35) assessment = 'Moderate Green Cover';
  else if (percentage < 60) assessment = 'Well-Vegetated Smart City';

  return {
    percentage,
    assessment,
    canopyAreaM2: Math.round(canopyAreaM2),
    totalGreenAreaM2: Math.round(totalGreenAreaM2),
    urbanFootprintM2: Math.round(builtAreaM2)
  };
}

/**
 * Calculate Overall Sustainability Score (0 - 100) & Grade
 * 
 * Balanced Multi-Criteria Evaluation:
 * - Clean Energy Coverage: 25% weight
 * - Air Quality (Inverse Pollution): 30% weight
 * - Greenery Canopy: 25% weight
 * - Traffic Flow (Inverse Congestion): 20% weight
 */
function calculateSustainabilityScore(traffic, solar, pollution, greenery) {
  const energyFactor = solar.coveragePercentage;
  const cleanAirFactor = Math.max(0, 100 - pollution.index);
  const greeneryFactor = greenery.percentage;
  const trafficFlowFactor = Math.max(0, 100 - traffic.percentage);

  const weightedSum = (
    (energyFactor * 0.25) +
    (cleanAirFactor * 0.30) +
    (greeneryFactor * 0.25) +
    (trafficFlowFactor * 0.20)
  );

  const score = Math.min(100, Math.max(0, Math.round(weightedSum)));

  let grade = 'F';
  let title = 'Ecological Hazard';
  let badgeClass = 'danger';

  if (score >= 90) {
    grade = 'A+';
    title = 'Eco-Utopia / Carbon-Neutral';
    badgeClass = 'success';
  } else if (score >= 80) {
    grade = 'A';
    title = 'Exemplary Sustainable City';
    badgeClass = 'success';
  } else if (score >= 70) {
    grade = 'B';
    title = 'Progressive Green City';
    badgeClass = 'info';
  } else if (score >= 55) {
    grade = 'C';
    title = 'Developing Smart City';
    badgeClass = 'warning';
  } else if (score >= 40) {
    grade = 'D';
    title = 'High-Impact Urban Center';
    badgeClass = 'warning';
  }

  return {
    score,
    grade,
    title,
    badgeClass,
    breakdown: {
      energyComponent: Math.round(energyFactor * 0.25 * 10) / 10,
      airQualityComponent: Math.round(cleanAirFactor * 0.30 * 10) / 10,
      greeneryComponent: Math.round(greeneryFactor * 0.25 * 10) / 10,
      trafficFlowComponent: Math.round(trafficFlowFactor * 0.20 * 10) / 10
    }
  };
}

/**
 * Master Simulation Execution
 * @param {Object} rawConfig - User parameters (vehicles, buildings, trees, solarPanels, etc.)
 * @returns {Object} Complete simulation results package
 */
function runSimulation(rawConfig) {
  const config = sanitizeInputs(rawConfig);
  
  const traffic = calculateTrafficCongestion(config.vehicles, config.buildings, config.publicTransitRatio);
  const solar = calculateSolarEnergy(config.solarPanels, config.buildings);
  const pollution = calculatePollutionIndex(config.vehicles, config.buildings, config.trees, config.solarPanels);
  const greenery = calculateGreenery(config.trees, config.greenSpaceSqKm, config.buildings, config.vehicles);
  const sustainability = calculateSustainabilityScore(traffic, solar, pollution, greenery);

  return {
    timestamp: new Date().toISOString(),
    config,
    metrics: {
      traffic,
      solar,
      pollution,
      greenery,
      sustainability
    },
    isEstimate: true,
    notice: 'Simulated estimates based on deterministic smart-city mathematical modeling. Not real-world sensor measurements.'
  };
}

module.exports = {
  sanitizeInputs,
  calculateTrafficCongestion,
  calculateSolarEnergy,
  calculatePollutionIndex,
  calculateGreenery,
  calculateSustainabilityScore,
  runSimulation
};

