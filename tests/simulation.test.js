const test = require('node:test');
const assert = require('node:assert/strict');
const {
  sanitizeInputs,
  calculateTrafficCongestion,
  calculateSolarEnergy,
  calculatePollutionIndex,
  calculateGreenery,
  calculateSustainabilityScore,
  runSimulation
} = require('../src/simulation/simulationEngine');

test('Simulation Engine - Input Sanitization & Boundary Handling', () => {
  // Test negative inputs are clamped to min (0)
  const clamped = sanitizeInputs({
    vehicles: -50,
    buildings: -10,
    trees: -500,
    solarPanels: -30
  });
  assert.equal(clamped.vehicles, 0);
  assert.equal(clamped.buildings, 0);
  assert.equal(clamped.trees, 0);
  assert.equal(clamped.solarPanels, 0);

  // Test invalid NaN falls back to defaults
  const defaults = sanitizeInputs({
    vehicles: 'invalid_string',
    buildings: null
  });
  assert.equal(typeof defaults.vehicles, 'number');
  assert.equal(typeof defaults.buildings, 'number');
});

test('Traffic Congestion Calculation - Zero and High Density', () => {
  // Zero vehicles must yield 0% congestion
  const zeroTraffic = calculateTrafficCongestion(0, 100, 30);
  assert.equal(zeroTraffic.percentage, 0);
  assert.equal(zeroTraffic.level, 'Clear');

  // Moderate vehicles
  const modTraffic = calculateTrafficCongestion(500, 100, 30);
  assert.ok(modTraffic.percentage > 0 && modTraffic.percentage < 100);

  // Over-saturation
  const heavyTraffic = calculateTrafficCongestion(50000, 50, 0);
  assert.ok(heavyTraffic.percentage >= 80);
});

test('Solar Energy Generation - Power & Offset Calculation', () => {
  // Zero panels
  const zeroSolar = calculateSolarEnergy(0, 50);
  assert.equal(zeroSolar.dailyOutputKWh, 0);
  assert.equal(zeroSolar.coveragePercentage, 0);

  // 1000 panels
  const highSolar = calculateSolarEnergy(1000, 50);
  assert.equal(highSolar.dailyOutputKWh, 1750);
  assert.ok(highSolar.coveragePercentage > 0);
  assert.ok(highSolar.co2SavedKgPerDay > 0);
});

test('Pollution Index - Emission vs Offset Balance', () => {
  // Zero emissions city
  const zeroEmissions = calculatePollutionIndex(0, 0, 500, 500);
  assert.equal(zeroEmissions.index, 0);
  assert.equal(zeroEmissions.category, 'Pure / Pristine');

  // Highly polluting city (many cars, few trees)
  const heavyPollution = calculatePollutionIndex(2000, 800, 10, 5);
  assert.ok(heavyPollution.index > 50);

  // High offset city (more trees and solar than cars)
  const balanced = calculatePollutionIndex(200, 50, 2000, 1000);
  assert.ok(balanced.index < heavyPollution.index);
});

test('Greenery Percentage - Urban footprint to canopy ratio', () => {
  // Zero trees and green space
  const barren = calculateGreenery(0, 0, 100, 200);
  assert.equal(barren.percentage, 0);

  // Lush eco-park city
  const lush = calculateGreenery(5000, 15, 20, 50);
  assert.ok(lush.percentage > 50);
  assert.ok(lush.canopyAreaM2 > 0);
});

test('Sustainability Composite Score & Grade Determination', () => {
  // High sustainability configuration
  const ecoResults = runSimulation({
    vehicles: 50,
    buildings: 50,
    trees: 2500,
    solarPanels: 2000,
    greenSpaceSqKm: 8,
    publicTransitRatio: 75
  });

  assert.ok(ecoResults.metrics.sustainability.score >= 75);
  assert.ok(['A+', 'A', 'B'].includes(ecoResults.metrics.sustainability.grade));
  assert.equal(ecoResults.isEstimate, true);

  // Low sustainability configuration
  const smogResults = runSimulation({
    vehicles: 4000,
    buildings: 1200,
    trees: 20,
    solarPanels: 10,
    greenSpaceSqKm: 0.1,
    publicTransitRatio: 5
  });

  assert.ok(smogResults.metrics.sustainability.score < 50);
  assert.ok(['D', 'F'].includes(smogResults.metrics.sustainability.grade));
});

