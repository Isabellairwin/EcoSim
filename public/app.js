/**
 * EcoSim — Main Frontend Application Logic
 * Integrates City Builder, Dynamic Canvas Visualizer, Chart.js telemetry,
 * and MongoDB Atlas REST API CRUD operations.
 */

// Global Application State
const EcoApp = {
  dbConnected: false,
  savedCities: [],
  currentCity: {
    cityName: 'Neo-Verdant Smart City',
    description: 'A forward-thinking smart district maximizing rooftop photovoltaic generation, protected greenways, and integrated zero-emission mobility.',
    vehicles: 250,
    buildings: 120,
    trees: 650,
    solarPanels: 400,
    greenSpaceSqKm: 4.5,
    publicTransitRatio: 35
  },
  simulation: null,
  visualizer: null,
  heroVisualizer: null,
  charts: {
    radar: null,
    energy: null,
    landUse: null
  },
  editingCityId: null,
  cityToDeleteId: null
};

// ============================================================================
// SIMULATION ENGINE (CLIENT-SIDE FOR INSTANT 60FPS SLIDER FEEDBACK)
// ============================================================================
function computeClientSimulation(config) {
  const vehicles = Math.max(0, Number(config.vehicles) || 0);
  const buildings = Math.max(0, Number(config.buildings) || 0);
  const trees = Math.max(0, Number(config.trees) || 0);
  const solarPanels = Math.max(0, Number(config.solarPanels) || 0);
  const greenSpaceSqKm = Math.max(0, Number(config.greenSpaceSqKm) || 0);
  const transitRatio = Math.max(0, Math.min(100, Number(config.publicTransitRatio) || 30));

  // 1. Traffic Congestion
  let trafficPercent = 0;
  let trafficLevel = 'Clear';
  if (vehicles > 0) {
    const roadCapacity = Math.max(150, (buildings * 7.5) + 250);
    const transitMitigation = 1 - ((transitRatio / 100) * 0.45);
    const effectiveVehicles = vehicles * transitMitigation;
    const ratio = effectiveVehicles / roadCapacity;
    trafficPercent = Math.min(100, Math.max(0, Math.round((ratio / (ratio + 0.95)) * 100)));
    
    if (trafficPercent >= 75) trafficLevel = 'Severe Congestion';
    else if (trafficPercent >= 50) trafficLevel = 'Moderate Congestion';
    else if (trafficPercent >= 25) trafficLevel = 'Light Congestion';
    else trafficLevel = 'Smooth Flow';
  }

  // 2. Solar Energy
  const dailyOutputKWh = Math.round(solarPanels * 1.75 * 10) / 10;
  const estimatedDemandKWh = Math.round(buildings * 35 * 10) / 10;
  let solarCoverage = 100;
  if (estimatedDemandKWh > 0) {
    solarCoverage = Math.min(100, Math.max(0, Math.round((dailyOutputKWh / estimatedDemandKWh) * 100)));
  } else if (dailyOutputKWh === 0) {
    solarCoverage = 0;
  }
  const co2SavedKg = Math.round(dailyOutputKWh * 0.42 * 10) / 10;

  // 3. Pollution Index
  let pollutionIndex = 0;
  let airQuality = 'Pristine';
  let grossEmissions = 0;
  let totalOffsets = Math.round((trees * 0.038 + solarPanels * 0.035) * 10) / 10;

  if (vehicles > 0 || buildings > 0) {
    grossEmissions = (vehicles * 0.085) + (buildings * 0.05);
    const netEmissions = Math.max(0, grossEmissions - totalOffsets);
    pollutionIndex = Math.min(100, Math.max(0, Math.round((netEmissions / (netEmissions + 65)) * 100)));
    
    if (pollutionIndex >= 75) airQuality = 'Hazardous Smog';
    else if (pollutionIndex >= 50) airQuality = 'Unhealthy';
    else if (pollutionIndex >= 25) airQuality = 'Moderate';
    else airQuality = 'Clean & Healthy';
  }

  // 4. Greenery Percentage
  const canopyM2 = trees * 20;
  const parkM2 = greenSpaceSqKm * 10000;
  const totalGreenM2 = canopyM2 + parkM2;
  const builtAreaM2 = Math.max(100, (buildings * 120) + (vehicles * 25));
  const totalAreaM2 = totalGreenM2 + builtAreaM2;
  const greeneryPercentage = Math.min(100, Math.max(0, Math.round((totalGreenM2 / totalAreaM2) * 100)));

  // 5. Composite Sustainability Score
  const energyFactor = solarCoverage;
  const cleanAirFactor = Math.max(0, 100 - pollutionIndex);
  const greeneryFactor = greeneryPercentage;
  const trafficFlowFactor = Math.max(0, 100 - trafficPercent);

  const weightedSum = (
    (energyFactor * 0.25) +
    (cleanAirFactor * 0.30) +
    (greeneryFactor * 0.25) +
    (trafficFlowFactor * 0.20)
  );

  const sustainabilityScore = Math.min(100, Math.max(0, Math.round(weightedSum)));
  let grade = 'F';
  let title = 'Ecological Crisis';
  if (sustainabilityScore >= 90) { grade = 'A+'; title = 'Eco-Utopia / Carbon-Neutral'; }
  else if (sustainabilityScore >= 80) { grade = 'A'; title = 'Exemplary Sustainable'; }
  else if (sustainabilityScore >= 70) { grade = 'B'; title = 'Progressive Green'; }
  else if (sustainabilityScore >= 55) { grade = 'C'; title = 'Developing Smart City'; }
  else if (sustainabilityScore >= 40) { grade = 'D'; title = 'High-Impact Urban'; }

  return {
    traffic: { percentage: trafficPercent, level: trafficLevel },
    solar: { dailyOutputKWh, estimatedDemandKWh, coveragePercentage: solarCoverage, co2SavedKgPerDay: co2SavedKg },
    pollution: { index: pollutionIndex, airQuality, grossEmissions: Math.round(grossEmissions * 10) / 10, totalOffsets },
    greenery: { percentage: greeneryPercentage, canopyAreaM2: canopyM2, parkAreaM2: parkM2, builtAreaM2 },
    sustainability: { score: sustainabilityScore, grade, title }
  };
}

// ============================================================================
// INITIALIZATION ON DOM CONTENT LOADED
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
  initVisualizers();
  initCharts();
  bindInputEvents();
  checkDatabaseHealth();
  fetchSavedCities();

  // Initial simulation pass
  updateSimulation();
});

// ============================================================================
// VISUALIZER INITIALIZATION
// ============================================================================
function initVisualizers() {
  if (window.CityVisualizer) {
    EcoApp.visualizer = new CityVisualizer('cityMainCanvas');
    EcoApp.heroVisualizer = new CityVisualizer('heroCityCanvas', { isHero: true });
  }

  // Day/Night switch
  const dayNightToggle = document.getElementById('toggleDayNight');
  if (dayNightToggle) {
    dayNightToggle.addEventListener('change', (e) => {
      const isDay = e.target.checked;
      if (EcoApp.visualizer) EcoApp.visualizer.setDayNight(isDay);
      if (EcoApp.heroVisualizer) EcoApp.heroVisualizer.setDayNight(isDay);
    });
  }

  // Animation switch
  const animToggle = document.getElementById('toggleTrafficAnimation');
  if (animToggle) {
    animToggle.addEventListener('change', (e) => {
      const enable = e.target.checked;
      if (EcoApp.visualizer) EcoApp.visualizer.setAnimation(enable);
      if (EcoApp.heroVisualizer) EcoApp.heroVisualizer.setAnimation(enable);
    });
  }
}

// ============================================================================
// CHART.JS INITIALIZATION
// ============================================================================
function initCharts() {
  // 1. Multi-Criteria Radar Chart
  const radarCtx = document.getElementById('sustainabilityRadarChart');
  if (radarCtx) {
    EcoApp.charts.radar = new Chart(radarCtx, {
      type: 'radar',
      data: {
        labels: ['Clean Energy Mix', 'Clean Air Factor', 'Green Canopy', 'Traffic Fluidity', 'Transit Share'],
        datasets: [{
          label: 'Current Smart City',
          data: [75, 78, 64, 76, 35],
          backgroundColor: 'rgba(16, 185, 129, 0.25)',
          borderColor: '#10b981',
          pointBackgroundColor: '#065f46',
          pointBorderColor: '#ffffff',
          pointHoverBackgroundColor: '#ffffff',
          pointHoverBorderColor: '#10b981',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          r: {
            angleLines: { color: 'rgba(0, 0, 0, 0.08)' },
            grid: { color: 'rgba(0, 0, 0, 0.08)' },
            suggestedMin: 0,
            suggestedMax: 100,
            ticks: { stepSize: 20, display: false }
          }
        },
        plugins: {
          legend: { display: false }
        }
      }
    });
  }

  // 2. Daily Energy Balance (Stacked/Grouped Bar Chart)
  const energyCtx = document.getElementById('energyBalanceChart');
  if (energyCtx) {
    EcoApp.charts.energy = new Chart(energyCtx, {
      type: 'bar',
      data: {
        labels: ['Daily Energy Generation & Consumption'],
        datasets: [
          {
            label: 'Solar Generation (kWh/d)',
            data: [700],
            backgroundColor: '#f59e0b',
            borderRadius: 8
          },
          {
            label: 'Building Demand (kWh/d)',
            data: [4200],
            backgroundColor: '#0284c7',
            borderRadius: 8
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: { display: true, text: 'Kilowatt Hours (kWh / day)' }
          }
        }
      }
    });
  }

  // 3. Urban Land Use Doughnut Chart
  const landCtx = document.getElementById('landUseDoughnutChart');
  if (landCtx) {
    EcoApp.charts.landUse = new Chart(landCtx, {
      type: 'doughnut',
      data: {
        labels: ['Built Footprint (Buildings)', 'Transit Corridors (Roads)', 'Tree Canopy Coverage', 'Parkland Reserves'],
        datasets: [{
          data: [14400, 6250, 13000, 45000],
          backgroundColor: ['#0284c7', '#64748b', '#10b981', '#34d399'],
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' }
        },
        cutout: '65%'
      }
    });
  }
}

// ============================================================================
// INPUT EVENT BINDINGS
// ============================================================================
function bindInputEvents() {
  const sliders = [
    { id: 'sliderVehicles', valId: 'valVehicles', key: 'vehicles' },
    { id: 'sliderBuildings', valId: 'valBuildings', key: 'buildings' },
    { id: 'sliderTrees', valId: 'valTrees', key: 'trees' },
    { id: 'sliderSolar', valId: 'valSolar', key: 'solarPanels' },
    { id: 'sliderGreenSpace', valId: 'valGreenSpace', key: 'greenSpaceSqKm', unit: ' km²' },
    { id: 'sliderTransit', valId: 'valTransit', key: 'publicTransitRatio', unit: '%' }
  ];

  sliders.forEach(s => {
    const el = document.getElementById(s.id);
    const valEl = document.getElementById(s.valId);
    if (el) {
      el.addEventListener('input', (e) => {
        const val = Number(e.target.value);
        if (valEl) valEl.textContent = val + (s.unit || '');
        EcoApp.currentCity[s.key] = val;
        updateSimulation();
      });
    }
  });

  // City Name & Description text inputs
  const nameInput = document.getElementById('inputCityName');
  if (nameInput) {
    nameInput.addEventListener('input', (e) => {
      EcoApp.currentCity.cityName = e.target.value.trim() || 'Custom Smart City';
      const hudName = document.getElementById('hudCityName');
      if (hudName) hudName.textContent = EcoApp.currentCity.cityName;
    });
  }

  const descInput = document.getElementById('inputCityDescription');
  if (descInput) {
    descInput.addEventListener('input', (e) => {
      EcoApp.currentCity.description = e.target.value.trim();
    });
  }

  // Preset Buttons
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const preset = e.currentTarget.getAttribute('data-preset');
      applyPreset(preset);
    });
  });

  // Reset to Baseline Defaults
  const btnReset = document.getElementById('btnResetToDefaults');
  if (btnReset) {
    btnReset.addEventListener('click', () => applyPreset('balanced-hub'));
  }

  // Recalculate Live button
  const btnRecalc = document.getElementById('btnRecalculateLive');
  if (btnRecalc) {
    btnRecalc.addEventListener('click', () => {
      updateSimulation();
      showToast('Telemetry recalculated using deterministic model.', 'success');
    });
  }

  // City Builder Form Submit (Save / Update City)
  const form = document.getElementById('cityBuilderForm');
  if (form) {
    form.addEventListener('submit', handleFormSubmit);
  }

  // Cancel Edit Button
  const btnCancel = document.getElementById('btnCancelEdit');
  if (btnCancel) {
    btnCancel.addEventListener('click', resetEditMode);
  }

  // Refresh saved cities
  const btnRefreshCities = document.getElementById('btnRefreshSavedCities');
  if (btnRefreshCities) {
    btnRefreshCities.addEventListener('click', fetchSavedCities);
  }

  // Search filter for saved cities
  const searchInput = document.getElementById('savedCitySearch');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      renderSavedCitiesList(e.target.value);
    });
  }

  // Run Comparison Button
  const btnCompare = document.getElementById('btnRunComparison');
  if (btnCompare) {
    btnCompare.addEventListener('click', handleCompareCities);
  }

  // Database Health Test Buttons
  const btnCheckDb = document.getElementById('btnCheckDb');
  if (btnCheckDb) {
    btnCheckDb.addEventListener('click', triggerDatabaseReconnect);
  }

  const btnRetryBanner = document.getElementById('btnRetryDbBanner');
  if (btnRetryBanner) {
    btnRetryBanner.addEventListener('click', triggerDatabaseReconnect);
  }

  const btnModalTest = document.getElementById('btnModalTestDb');
  if (btnModalTest) {
    btnModalTest.addEventListener('click', () => {
      triggerDatabaseReconnect();
      // Close modal
      const modalEl = document.getElementById('dbConfigModal');
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();
    });
  }

  // Delete Confirmation Modal Button
  const btnConfirmDelete = document.getElementById('btnConfirmDeleteCity');
  if (btnConfirmDelete) {
    btnConfirmDelete.addEventListener('click', executeCityDelete);
  }
}

// ============================================================================
// SIMULATION UPDATE & TELEMETRY DISPATCH
// ============================================================================
function updateSimulation() {
  const sim = computeClientSimulation(EcoApp.currentCity);
  EcoApp.simulation = sim;

  // 1. Update KPI Cards in Dashboard
  updateElement('kpiSustainabilityScore', `${sim.sustainability.score}<span class="fs-6 text-muted">/100</span>`);
  updateElement('kpiSustainabilityGrade', `Grade ${sim.sustainability.grade}`);
  updateElement('kpiSustainabilityTitle', sim.sustainability.title);
  setProgressBar('kpiSustainabilityBar', sim.sustainability.score);

  updateElement('kpiSolarOutput', `${sim.solar.dailyOutputKWh} <span class="fs-6 text-muted">kWh/d</span>`);
  updateElement('kpiSolarCoverage', `${sim.solar.coveragePercentage}%`);
  updateElement('kpiCo2Saved', `${sim.solar.co2SavedKgPerDay} kg CO₂/d`);
  setProgressBar('kpiSolarBar', sim.solar.coveragePercentage);

  updateElement('kpiPollutionIndex', `${sim.pollution.index}<span class="fs-6 text-muted">/100</span>`);
  updateElement('kpiAirQuality', sim.pollution.airQuality);
  setProgressBar('kpiPollutionBar', sim.pollution.index);

  updateElement('kpiTrafficCongestion', `${sim.traffic.percentage}<span class="fs-6 text-muted">%</span>`);
  updateElement('kpiTrafficLevel', sim.traffic.level);
  updateElement('kpiTransitShare', `Transit: ${EcoApp.currentCity.publicTransitRatio}%`);
  setProgressBar('kpiTrafficBar', sim.traffic.percentage);

  // 2. Update Hero Preview Section
  updateElement('heroTrafficVal', `${sim.traffic.percentage}%`);
  updateElement('heroSolarVal', `${sim.solar.dailyOutputKWh} kWh`);
  updateElement('heroAqiVal', sim.pollution.airQuality);
  updateElement('heroGreeneryVal', `${sim.greenery.percentage}%`);
  updateElement('heroSustainabilityBadge', `Eco Score: ${sim.sustainability.score} (Grade ${sim.sustainability.grade})`);

  // 3. Update HUD Badges on Visualizer
  updateElement('hudEcoGrade', `Sustainability: Grade ${sim.sustainability.grade} (${sim.sustainability.score}/100)`);
  updateElement('hudVehiclesCount', `<i class="fa-solid fa-car text-danger me-1"></i> ${EcoApp.currentCity.vehicles} Cars`);
  updateElement('hudTreesCount', `<i class="fa-solid fa-tree text-success me-1"></i> ${EcoApp.currentCity.trees} Trees`);

  // 4. Update Analytics Section Details
  updateElement('analyticsGrossEmissions', `${sim.pollution.grossEmissions} pts`);
  updateElement('analyticsTreeOffsets', `${Math.round(EcoApp.currentCity.trees * 0.038 * 10) / 10} pts`);
  updateElement('analyticsSolarOffsets', `${Math.round(EcoApp.currentCity.solarPanels * 0.035 * 10) / 10} pts`);
  updateElement('analyticsNetAqiBadge', `AQI Index: ${sim.pollution.index}`);
  setProgressBar('barGrossEmissions', Math.min(100, sim.pollution.grossEmissions * 2));
  setProgressBar('barTreeOffsets', Math.min(100, (EcoApp.currentCity.trees * 0.038) * 2));
  setProgressBar('barSolarOffsets', Math.min(100, (EcoApp.currentCity.solarPanels * 0.035) * 2));

  // 5. Update Canvas Visualizer
  if (EcoApp.visualizer) {
    EcoApp.visualizer.updateState({
      cityName: EcoApp.currentCity.cityName,
      vehicles: EcoApp.currentCity.vehicles,
      buildings: EcoApp.currentCity.buildings,
      trees: EcoApp.currentCity.trees,
      solarPanels: EcoApp.currentCity.solarPanels,
      greenSpaceSqKm: EcoApp.currentCity.greenSpaceSqKm,
      trafficPercentage: sim.traffic.percentage,
      pollutionIndex: sim.pollution.index,
      sustainabilityScore: sim.sustainability.score,
      sustainabilityGrade: sim.sustainability.grade
    });
  }

  if (EcoApp.heroVisualizer) {
    EcoApp.heroVisualizer.updateState({
      cityName: EcoApp.currentCity.cityName,
      vehicles: EcoApp.currentCity.vehicles,
      buildings: EcoApp.currentCity.buildings,
      trees: EcoApp.currentCity.trees,
      solarPanels: EcoApp.currentCity.solarPanels,
      greenSpaceSqKm: EcoApp.currentCity.greenSpaceSqKm,
      trafficPercentage: sim.traffic.percentage,
      pollutionIndex: sim.pollution.index,
      sustainabilityScore: sim.sustainability.score,
      sustainabilityGrade: sim.sustainability.grade
    });
  }

  // 6. Update Charts
  if (EcoApp.charts.radar) {
    EcoApp.charts.radar.data.datasets[0].data = [
      sim.solar.coveragePercentage,
      Math.max(0, 100 - sim.pollution.index),
      sim.greenery.percentage,
      Math.max(0, 100 - sim.traffic.percentage),
      EcoApp.currentCity.publicTransitRatio
    ];
    EcoApp.charts.radar.update('none'); // Update without animation lag
  }

  if (EcoApp.charts.energy) {
    EcoApp.charts.energy.data.datasets[0].data = [sim.solar.dailyOutputKWh];
    EcoApp.charts.energy.data.datasets[1].data = [sim.solar.estimatedDemandKWh];
    EcoApp.charts.energy.update('none');
  }

  if (EcoApp.charts.landUse) {
    EcoApp.charts.landUse.data.datasets[0].data = [
      sim.greenery.builtAreaM2,
      EcoApp.currentCity.vehicles * 25,
      sim.greenery.canopyAreaM2,
      sim.greenery.parkAreaM2
    ];
    EcoApp.charts.landUse.update('none');
  }
}

// ============================================================================
// PRESET CONFIGURATIONS
// ============================================================================
function applyPreset(presetKey) {
  const presets = {
    'eco-utopia': {
      cityName: 'Val Verde Carbon-Neutral Oasis',
      description: 'Maximum renewable generation, aggressive tree planting, and low car dependency.',
      vehicles: 80,
      buildings: 90,
      trees: 2800,
      solarPanels: 2200,
      greenSpaceSqKm: 12.0,
      publicTransitRatio: 75
    },
    'solar-city': {
      cityName: 'Helios Sun-Powered District',
      description: 'Extensive rooftop and grid photovoltaic integration powering commercial towers.',
      vehicles: 350,
      buildings: 180,
      trees: 900,
      solarPanels: 2800,
      greenSpaceSqKm: 5.0,
      publicTransitRatio: 45
    },
    'balanced-hub': {
      cityName: 'Neo-Verdant Smart City',
      description: 'A harmonious balance of modern living, clean energy, and sustainable transit.',
      vehicles: 250,
      buildings: 120,
      trees: 650,
      solarPanels: 400,
      greenSpaceSqKm: 4.5,
      publicTransitRatio: 35
    },
    'industrial': {
      cityName: 'Titan Industrial Metropolis',
      description: 'High vehicular reliance and dense manufacturing with minimal canopy coverage.',
      vehicles: 1800,
      buildings: 450,
      trees: 80,
      solarPanels: 50,
      greenSpaceSqKm: 0.5,
      publicTransitRatio: 10
    }
  };

  const p = presets[presetKey];
  if (!p) return;

  EcoApp.currentCity = { ...p };

  // Update Form inputs
  setInputValue('inputCityName', p.cityName);
  setInputValue('inputCityDescription', p.description);
  setInputValue('sliderVehicles', p.vehicles);
  setInputValue('sliderBuildings', p.buildings);
  setInputValue('sliderTrees', p.trees);
  setInputValue('sliderSolar', p.solarPanels);
  setInputValue('sliderGreenSpace', p.greenSpaceSqKm);
  setInputValue('sliderTransit', p.publicTransitRatio);

  updateElement('valVehicles', p.vehicles);
  updateElement('valBuildings', p.buildings);
  updateElement('valTrees', p.trees);
  updateElement('valSolar', p.solarPanels);
  updateElement('valGreenSpace', p.greenSpaceSqKm + ' km²');
  updateElement('valTransit', p.publicTransitRatio + '%');

  updateSimulation();
  showToast(`Loaded preset: "${p.cityName}"`, 'info');
}

// ============================================================================
// DATABASE CONNECTIVITY AND HEALTH CHECK
// ============================================================================
async function checkDatabaseHealth() {
  const dot = document.getElementById('dbStatusDot');
  const text = document.getElementById('dbStatusText');
  const alertBanner = document.getElementById('dbAlertBanner');

  try {
    const res = await fetch('/api/health');
    const data = await res.json();

    EcoApp.dbConnected = data.database && data.database.connected;

    if (EcoApp.dbConnected) {
      if (dot) {
        dot.className = 'status-dot status-dot-success';
      }
      if (text) {
        text.textContent = 'Atlas: Connected (ecosim)';
      }
      if (alertBanner) {
        alertBanner.classList.add('d-none');
      }
    } else {
      if (dot) {
        dot.className = 'status-dot status-dot-warning';
      }
      if (text) {
        text.textContent = 'Atlas: Awaiting .env URI';
      }
      if (alertBanner) {
        alertBanner.classList.remove('d-none');
      }
    }
  } catch (err) {
    console.warn('Health check error:', err);
    if (dot) dot.className = 'status-dot status-dot-danger';
    if (text) text.textContent = 'Backend Offline';
  }
}

async function triggerDatabaseReconnect() {
  const refreshIcon = document.getElementById('dbRefreshIcon');
  if (refreshIcon) refreshIcon.classList.add('fa-spin');

  try {
    const res = await fetch('/api/health/reconnect', { method: 'POST' });
    const data = await res.json();

    if (data.success) {
      showToast('Successfully connected to MongoDB Atlas!', 'success');
      checkDatabaseHealth();
      fetchSavedCities();
    } else {
      showToast(data.dbStatus ? data.dbStatus.message : 'Database connection pending. Check .env configuration.', 'warning');
      checkDatabaseHealth();
    }
  } catch (err) {
    showToast('Failed to contact server backend.', 'danger');
  } finally {
    if (refreshIcon) refreshIcon.classList.remove('fa-spin');
  }
}

// ============================================================================
// SAVED CITIES CRUD OPERATIONS
// ============================================================================
async function fetchSavedCities() {
  const container = document.getElementById('savedCitiesContainer');
  const countBadge = document.getElementById('savedCityCount');

  try {
    const res = await fetch('/api/cities');
    const data = await res.json();

    if (data.success && data.cities) {
      EcoApp.savedCities = data.cities;
      if (countBadge) countBadge.textContent = data.cities.length;
      renderSavedCitiesList();
      populateCompareDropdowns();
    } else {
      EcoApp.savedCities = [];
      if (countBadge) countBadge.textContent = '0';
      renderOfflineNotice(data.message);
      populateCompareDropdowns();
    }
  } catch (err) {
    console.error('Fetch saved cities error:', err);
    renderOfflineNotice('Could not reach backend API endpoint.');
  }
}

function renderSavedCitiesList(filterTerm = '') {
  const container = document.getElementById('savedCitiesContainer');
  if (!container) return;

  const term = (filterTerm || '').toLowerCase().trim();
  const filtered = EcoApp.savedCities.filter(c => 
    c.cityName.toLowerCase().includes(term) || (c.description || '').toLowerCase().includes(term)
  );

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="card border-0 shadow-sm rounded-4 p-5 text-center">
        <div class="fs-1 text-muted mb-3"><i class="fa-solid fa-city opacity-50"></i></div>
        <h5 class="fw-bold mb-2">No Saved Cities Found</h5>
        <p class="text-muted small mb-3">
          ${filterTerm ? 'No cities match your search filter.' : 'You have not saved any cities yet. Use the Interactive City Builder above to create your first smart city and save it to MongoDB Atlas!'}
        </p>
        <div>
          <a href="#builder" class="btn btn-success btn-sm rounded-pill px-4 fw-bold">
            <i class="fa-solid fa-sliders me-1"></i> Build A City Now
          </a>
        </div>
      </div>
    `;
    return;
  }

  let html = '<div class="row g-4">';
  filtered.forEach(city => {
    const metrics = city.simulationMetrics || {};
    const createdDate = new Date(city.createdAt).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });

    const gradeBadgeClass = (metrics.sustainabilityScore >= 80) ? 'bg-success' 
      : (metrics.sustainabilityScore >= 60 ? 'bg-info' : 'bg-warning');

    html += `
      <div class="col-12 col-md-6 col-xl-4">
        <div class="card h-100 city-item-card shadow-sm p-4 d-flex flex-column justify-content-between">
          <div>
            <div class="d-flex justify-content-between align-items-start mb-2">
              <h5 class="fw-bold mb-0 text-dark">${escapeHtml(city.cityName)}</h5>
              <span class="badge ${gradeBadgeClass} px-2 py-1 rounded-pill">
                Grade ${metrics.sustainabilityGrade || 'N/A'} (${metrics.sustainabilityScore || 0})
              </span>
            </div>
            <p class="small text-muted mb-3 text-truncate-2">${escapeHtml(city.description || 'No description provided.')}</p>

            <div class="row g-2 mb-3">
              <div class="col-6">
                <div class="city-stat-pill">
                  <span class="text-muted"><i class="fa-solid fa-car text-danger me-1"></i> Vehicles:</span>
                  <strong>${city.vehicles.toLocaleString()}</strong>
                </div>
              </div>
              <div class="col-6">
                <div class="city-stat-pill">
                  <span class="text-muted"><i class="fa-solid fa-building text-primary me-1"></i> Buildings:</span>
                  <strong>${city.buildings.toLocaleString()}</strong>
                </div>
              </div>
              <div class="col-6">
                <div class="city-stat-pill">
                  <span class="text-muted"><i class="fa-solid fa-tree text-success me-1"></i> Trees:</span>
                  <strong>${city.trees.toLocaleString()}</strong>
                </div>
              </div>
              <div class="col-6">
                <div class="city-stat-pill">
                  <span class="text-muted"><i class="fa-solid fa-solar-panel text-warning me-1"></i> Solar:</span>
                  <strong>${city.solarPanels.toLocaleString()}</strong>
                </div>
              </div>
            </div>
          </div>

          <div class="pt-3 border-top d-flex justify-content-between align-items-center">
            <span class="text-muted x-small"><i class="fa-regular fa-clock me-1"></i> ${createdDate}</span>
            <div class="btn-group btn-group-sm">
              <button class="btn btn-outline-success" onclick="loadCityIntoBuilder('${city._id}')" title="Load into Simulation Builder">
                <i class="fa-solid fa-eye me-1"></i> Load
              </button>
              <button class="btn btn-outline-primary" onclick="startEditCity('${city._id}')" title="Edit City Configuration">
                <i class="fa-solid fa-pen-to-square"></i>
              </button>
              <button class="btn btn-outline-danger" onclick="promptDeleteCity('${city._id}', '${escapeHtml(city.cityName).replace(/'/g, "\\'")}')" title="Delete City">
                <i class="fa-solid fa-trash-can"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  });
  html += '</div>';

  container.innerHTML = html;
}

function renderOfflineNotice(customMessage) {
  const container = document.getElementById('savedCitiesContainer');
  if (!container) return;

  container.innerHTML = `
    <div class="card border-warning border-opacity-50 shadow-sm rounded-4 p-4 text-center bg-light">
      <div class="fs-1 text-warning mb-2"><i class="fa-solid fa-database"></i></div>
      <h5 class="fw-bold mb-1">MongoDB Atlas Connection Pending</h5>
      <p class="text-muted small mb-3">
        ${customMessage || 'Database operations require your Atlas connection string configured in EcoSim/.env.'}
      </p>
      <div class="d-flex justify-content-center gap-2">
        <button class="btn btn-warning btn-sm fw-bold rounded-pill px-3" data-bs-toggle="modal" data-bs-target="#dbConfigModal">
          <i class="fa-solid fa-key me-1"></i> View Setup Instructions
        </button>
        <button class="btn btn-outline-dark btn-sm rounded-pill px-3" onclick="triggerDatabaseReconnect()">
          <i class="fa-solid fa-rotate me-1"></i> Retry Connection
        </button>
      </div>
    </div>
  `;
}

// ============================================================================
// CREATE & UPDATE CITY (FORM SUBMISSION)
// ============================================================================
async function handleFormSubmit(e) {
  e.preventDefault();

  const cityName = document.getElementById('inputCityName').value.trim();
  const description = document.getElementById('inputCityDescription').value.trim();
  const vehicles = Number(document.getElementById('sliderVehicles').value);
  const buildings = Number(document.getElementById('sliderBuildings').value);
  const trees = Number(document.getElementById('sliderTrees').value);
  const solarPanels = Number(document.getElementById('sliderSolar').value);
  const greenSpaceSqKm = Number(document.getElementById('sliderGreenSpace').value);
  const publicTransitRatio = Number(document.getElementById('sliderTransit').value);

  if (!cityName || cityName.length < 2) {
    showToast('Please enter a city name with at least 2 characters.', 'warning');
    return;
  }

  const payload = {
    cityName,
    description,
    vehicles,
    buildings,
    trees,
    solarPanels,
    greenSpaceSqKm,
    publicTransitRatio
  };

  const btnSave = document.getElementById('btnSaveCity');
  const originalHtml = btnSave.innerHTML;
  btnSave.disabled = true;
  btnSave.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status"></span> Saving to MongoDB Atlas...`;

  try {
    const isEdit = !!EcoApp.editingCityId;
    const url = isEdit ? `/api/cities/${EcoApp.editingCityId}` : '/api/cities';
    const method = isEdit ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (res.ok && data.success) {
      showToast(data.message || (isEdit ? 'City successfully updated!' : 'City successfully saved to MongoDB Atlas!'), 'success');
      resetEditMode();
      await fetchSavedCities();

      // Smooth scroll to saved cities
      const savedSection = document.getElementById('savedCities');
      if (savedSection) savedSection.scrollIntoView({ behavior: 'smooth' });
    } else {
      if (res.status === 503) {
        showToast('MongoDB Atlas is not connected yet. Paste your connection string in EcoSim/.env', 'danger');
        const modal = new bootstrap.Modal(document.getElementById('dbConfigModal'));
        modal.show();
      } else {
        const errorMsg = data.messages ? data.messages.join(' ') : (data.error || 'Failed to save city');
        showToast(`Error: ${errorMsg}`, 'danger');
      }
    }
  } catch (err) {
    console.error('Save error:', err);
    showToast('Network error while saving to database.', 'danger');
  } finally {
    btnSave.disabled = false;
    btnSave.innerHTML = originalHtml;
  }
}

// Load city into builder
window.loadCityIntoBuilder = function(cityId) {
  const city = EcoApp.savedCities.find(c => c._id === cityId);
  if (!city) return;

  EcoApp.currentCity = {
    cityName: city.cityName,
    description: city.description || '',
    vehicles: city.vehicles,
    buildings: city.buildings,
    trees: city.trees,
    solarPanels: city.solarPanels,
    greenSpaceSqKm: city.greenSpaceSqKm || 4.5,
    publicTransitRatio: city.publicTransitRatio || 30
  };

  setInputValue('inputCityName', city.cityName);
  setInputValue('inputCityDescription', city.description || '');
  setInputValue('sliderVehicles', city.vehicles);
  setInputValue('sliderBuildings', city.buildings);
  setInputValue('sliderTrees', city.trees);
  setInputValue('sliderSolar', city.solarPanels);
  setInputValue('sliderGreenSpace', city.greenSpaceSqKm || 4.5);
  setInputValue('sliderTransit', city.publicTransitRatio || 30);

  updateElement('valVehicles', city.vehicles);
  updateElement('valBuildings', city.buildings);
  updateElement('valTrees', city.trees);
  updateElement('valSolar', city.solarPanels);
  updateElement('valGreenSpace', (city.greenSpaceSqKm || 4.5) + ' km²');
  updateElement('valTransit', (city.publicTransitRatio || 30) + '%');

  updateSimulation();

  const builderSection = document.getElementById('builder');
  if (builderSection) builderSection.scrollIntoView({ behavior: 'smooth' });

  showToast(`Loaded "${city.cityName}" into Interactive City Builder.`, 'info');
};

// Start edit city mode
window.startEditCity = function(cityId) {
  loadCityIntoBuilder(cityId);
  EcoApp.editingCityId = cityId;

  const badge = document.getElementById('editModeBadge');
  if (badge) {
    badge.className = 'badge bg-warning text-dark border';
    badge.textContent = 'Editing Mode';
  }

  const btnSave = document.getElementById('btnSaveCity');
  if (btnSave) {
    btnSave.className = 'btn btn-primary btn-lg rounded-pill fw-bold shadow-sm';
    btnSave.innerHTML = `<i class="fa-solid fa-floppy-disk me-2"></i> Update City in MongoDB Atlas`;
  }

  const btnCancel = document.getElementById('btnCancelEdit');
  if (btnCancel) btnCancel.style.display = 'inline-block';
};

function resetEditMode() {
  EcoApp.editingCityId = null;

  const badge = document.getElementById('editModeBadge');
  if (badge) {
    badge.className = 'badge bg-light text-secondary border';
    badge.textContent = 'New Configuration';
  }

  const btnSave = document.getElementById('btnSaveCity');
  if (btnSave) {
    btnSave.className = 'btn btn-success btn-lg rounded-pill fw-bold shadow-sm';
    btnSave.innerHTML = `<i class="fa-solid fa-cloud-arrow-up me-2"></i> Save City to MongoDB Atlas`;
  }

  const btnCancel = document.getElementById('btnCancelEdit');
  if (btnCancel) btnCancel.style.display = 'none';
}

// Prompt delete city
window.promptDeleteCity = function(cityId, cityName) {
  EcoApp.cityToDeleteId = cityId;
  const nameEl = document.getElementById('deleteCityNameTarget');
  if (nameEl) nameEl.textContent = cityName;

  const modal = new bootstrap.Modal(document.getElementById('deleteConfirmModal'));
  modal.show();
};

async function executeCityDelete() {
  if (!EcoApp.cityToDeleteId) return;

  const modalEl = document.getElementById('deleteConfirmModal');
  const modal = bootstrap.Modal.getInstance(modalEl);

  try {
    const res = await fetch(`/api/cities/${EcoApp.cityToDeleteId}`, {
      method: 'DELETE'
    });
    const data = await res.json();

    if (modal) modal.hide();

    if (res.ok && data.success) {
      showToast(data.message || 'City successfully deleted.', 'success');
      EcoApp.cityToDeleteId = null;
      await fetchSavedCities();
    } else {
      showToast(data.error || 'Failed to delete city from MongoDB', 'danger');
    }
  } catch (err) {
    console.error('Delete error:', err);
    showToast('Network error while deleting city.', 'danger');
  }
}

// ============================================================================
// CITY COMPARISON
// ============================================================================
function populateCompareDropdowns() {
  const select1 = document.getElementById('selectCompareCity1');
  const select2 = document.getElementById('selectCompareCity2');
  if (!select1 || !select2) return;

  const optionsHtml = EcoApp.savedCities.length === 0
    ? '<option value="">No saved cities available</option>'
    : '<option value="">-- Choose a Saved City --</option>' +
      EcoApp.savedCities.map(c => `<option value="${c._id}">${escapeHtml(c.cityName)} (Grade ${c.simulationMetrics ? c.simulationMetrics.sustainabilityGrade : 'N/A'})</option>`).join('');

  select1.innerHTML = optionsHtml;
  select2.innerHTML = optionsHtml;

  // Pre-select first two if available
  if (EcoApp.savedCities.length >= 2) {
    select1.selectedIndex = 1;
    select2.selectedIndex = 2;
  }
}

async function handleCompareCities() {
  const id1 = document.getElementById('selectCompareCity1').value;
  const id2 = document.getElementById('selectCompareCity2').value;
  const container = document.getElementById('compareResultsContainer');

  if (!id1 || !id2) {
    showToast('Please select two distinct cities to compare.', 'warning');
    return;
  }

  if (id1 === id2) {
    showToast('Please select two different cities.', 'warning');
    return;
  }

  try {
    const res = await fetch(`/api/cities/compare/${id1}/${id2}`);
    const data = await res.json();

    if (!res.ok || !data.success) {
      showToast(data.message || 'Comparison failed', 'danger');
      return;
    }

    renderComparisonMatrix(data);
  } catch (err) {
    console.error('Comparison error:', err);
    showToast('Network error while requesting comparison.', 'danger');
  }
}

function renderComparisonMatrix(data) {
  const container = document.getElementById('compareResultsContainer');
  if (!container) return;

  const c1 = data.city1.data;
  const s1 = data.city1.simulation.metrics;
  const c2 = data.city2.data;
  const s2 = data.city2.simulation.metrics;
  const ev = data.evaluation;

  const renderDiffBadge = (winnerName, diff, unit = '') => {
    return `<span class="badge bg-success bg-opacity-10 text-success fw-bold border border-success border-opacity-25 px-2 py-1">
      Advantage: ${escapeHtml(winnerName)} (+${diff}${unit})
    </span>`;
  };

  container.style.display = 'block';
  container.innerHTML = `
    <div class="card border-0 shadow-sm comparison-card mb-4">
      <div class="card-header bg-dark text-white p-4">
        <div class="row text-center align-items-center">
          <div class="col-5">
            <h4 class="fw-bold mb-1 text-success-light">${escapeHtml(c1.cityName)}</h4>
            <span class="badge bg-success">Grade ${s1.sustainability.grade} (${s1.sustainability.score}/100)</span>
          </div>
          <div class="col-2">
            <span class="badge bg-secondary rounded-pill px-3 py-2">VS</span>
          </div>
          <div class="col-5">
            <h4 class="fw-bold mb-1 text-info">${escapeHtml(c2.cityName)}</h4>
            <span class="badge bg-info">Grade ${s2.sustainability.grade} (${s2.sustainability.score}/100)</span>
          </div>
        </div>
      </div>

      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0 text-center">
            <thead class="table-light small text-uppercase">
              <tr>
                <th style="width: 35%">${escapeHtml(c1.cityName)}</th>
                <th style="width: 30%">Metric & Evaluation Criterion</th>
                <th style="width: 35%">${escapeHtml(c2.cityName)}</th>
              </tr>
            </thead>
            <tbody>
              <!-- Overall Sustainability -->
              <tr class="table-success bg-opacity-25">
                <td class="fw-bold fs-5">${s1.sustainability.score} / 100</td>
                <td>
                  <div class="fw-bold">Overall Sustainability Score</div>
                  <div class="x-small text-muted">${ev.sustainability.criterion}</div>
                  <div class="mt-1">${renderDiffBadge(ev.sustainability.winner, ev.sustainability.diff, ' pts')}</div>
                </td>
                <td class="fw-bold fs-5">${s2.sustainability.score} / 100</td>
              </tr>

              <!-- Solar Output -->
              <tr>
                <td><strong>${s1.solar.dailyOutputKWh} kWh/d</strong> (${s1.solar.coveragePercentage}% demand)</td>
                <td>
                  <div class="fw-semibold">Solar Clean Energy Generation</div>
                  <div class="x-small text-muted">${ev.cleanEnergy.criterion}</div>
                  <div class="mt-1">${renderDiffBadge(ev.cleanEnergy.winner, ev.cleanEnergy.diff, ' kWh')}</div>
                </td>
                <td><strong>${s2.solar.dailyOutputKWh} kWh/d</strong> (${s2.solar.coveragePercentage}% demand)</td>
              </tr>

              <!-- Pollution Index -->
              <tr>
                <td><strong>${s1.pollution.index} / 100</strong> (${s1.pollution.airQuality})</td>
                <td>
                  <div class="fw-semibold">Pollution Index (AQI Scale)</div>
                  <div class="x-small text-muted">${ev.pollution.criterion}</div>
                  <div class="mt-1">${renderDiffBadge(ev.pollution.winner, ev.pollution.diff, ' pts lower')}</div>
                </td>
                <td><strong>${s2.pollution.index} / 100</strong> (${s2.pollution.airQuality})</td>
              </tr>

              <!-- Green Canopy -->
              <tr>
                <td><strong>${s1.greenery.percentage}%</strong></td>
                <td>
                  <div class="fw-semibold">Green Canopy & Parkland Ratio</div>
                  <div class="x-small text-muted">${ev.greenery.criterion}</div>
                  <div class="mt-1">${renderDiffBadge(ev.greenery.winner, ev.greenery.diff, '%')}</div>
                </td>
                <td><strong>${s2.greenery.percentage}%</strong></td>
              </tr>

              <!-- Traffic Congestion -->
              <tr>
                <td><strong>${s1.traffic.percentage}%</strong> (${s1.traffic.level})</td>
                <td>
                  <div class="fw-semibold">Traffic Congestion Index</div>
                  <div class="x-small text-muted">${ev.traffic.criterion}</div>
                  <div class="mt-1">${renderDiffBadge(ev.traffic.winner, ev.traffic.diff, '% lower')}</div>
                </td>
                <td><strong>${s2.traffic.percentage}%</strong> (${s2.traffic.level})</td>
              </tr>

              <!-- Raw Urban Counts -->
              <tr class="table-light">
                <td class="small text-muted">${c1.vehicles} Vehicles | ${c1.buildings} Buildings</td>
                <td class="fw-bold small text-muted">Raw Urban Density</td>
                <td class="small text-muted">${c2.vehicles} Vehicles | ${c2.buildings} Buildings</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  container.scrollIntoView({ behavior: 'smooth' });
}

// ============================================================================
// UTILITIES & HELPERS
// ============================================================================
function updateElement(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}

function setProgressBar(id, percent) {
  const el = document.getElementById(id);
  if (el) el.style.width = `${Math.min(100, Math.max(0, percent))}%`;
}

function setInputValue(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function showToast(message, type = 'success') {
  const toastEl = document.getElementById('appToast');
  const msgEl = document.getElementById('toastMessage');
  const iconEl = document.getElementById('toastIcon');

  if (!toastEl || !msgEl) return;

  msgEl.textContent = message;

  // Palette classes
  toastEl.className = `toast align-items-center text-white border-0 shadow-lg rounded-3 bg-${type}`;

  if (iconEl) {
    iconEl.className = type === 'success' ? 'fa-solid fa-circle-check fs-5'
      : (type === 'warning' ? 'fa-solid fa-triangle-exclamation fs-5' : 'fa-solid fa-circle-xmark fs-5');
  }

  const toast = new bootstrap.Toast(toastEl, { delay: 4000 });
  toast.show();
}

