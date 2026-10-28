const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const City = require('../models/City');
const { runSimulation } = require('../simulation/simulationEngine');
const { validateObjectId, validateCityInput } = require('../middleware/validationMiddleware');
const { getConnectionStatus } = require('../config/database');

/**
 * Middleware to check if MongoDB is active before executing queries
 */
function requireConnectedDB(req, res, next) {
  if (mongoose.connection.readyState !== 1) {
    const dbStatus = getConnectionStatus();
    return res.status(503).json({
      success: false,
      error: 'Database Unavailable',
      dbStatus: dbStatus.status,
      message: 'MongoDB Atlas is not connected. Open EcoSim/.env and paste your connection string after MONGODB_URI=, then save with Ctrl+S.',
      details: dbStatus.message
    });
  }
  next();
}

/**
 * GET /api/cities
 * Retrieve all saved cities
 */
router.get('/', async (req, res) => {
  try {
    const dbStatus = getConnectionStatus();
    if (mongoose.connection.readyState !== 1) {
      return res.status(200).json({
        success: false,
        dbConnected: false,
        status: dbStatus.status,
        message: 'MongoDB Atlas is awaiting connection credentials in EcoSim/.env',
        count: 0,
        cities: []
      });
    }

    const { search, sort = 'createdAt', order = 'desc' } = req.query;
    const query = {};

    if (search && search.trim()) {
      query.$or = [
        { cityName: { $regex: search.trim(), $options: 'i' } },
        { description: { $regex: search.trim(), $options: 'i' } }
      ];
    }

    const sortOptions = {};
    sortOptions[sort] = order === 'asc' ? 1 : -1;

    const cities = await City.find(query).sort(sortOptions).lean();

    res.json({
      success: true,
      dbConnected: true,
      count: cities.length,
      cities
    });
  } catch (err) {
    console.error('Error fetching cities:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve cities',
      message: err.message
    });
  }
});

/**
 * GET /api/cities/:id
 * Retrieve a single city by its MongoDB Document ID
 */
router.get('/:id', validateObjectId, requireConnectedDB, async (req, res) => {
  try {
    const city = await City.findById(req.params.id);
    if (!city) {
      return res.status(404).json({
        success: false,
        error: 'City Not Found',
        message: `No city found with ID: ${req.params.id}`
      });
    }

    // Include freshly evaluated simulation metrics alongside stored
    const simResults = runSimulation({
      vehicles: city.vehicles,
      buildings: city.buildings,
      trees: city.trees,
      solarPanels: city.solarPanels,
      greenSpaceSqKm: city.greenSpaceSqKm,
      publicTransitRatio: city.publicTransitRatio
    });

    res.json({
      success: true,
      city,
      liveSimulation: simResults
    });
  } catch (err) {
    console.error('Error retrieving city:', err);
    res.status(500).json({
      success: false,
      error: 'Server error retrieving city',
      message: err.message
    });
  }
});

/**
 * POST /api/cities
 * Create and persist a new city configuration in MongoDB
 */
router.post('/', validateCityInput, requireConnectedDB, async (req, res) => {
  try {
    const {
      cityName,
      description = '',
      vehicles,
      buildings,
      trees,
      solarPanels,
      greenSpaceSqKm = 4.5,
      publicTransitRatio = 30
    } = req.body;

    // Run deterministic simulation engine
    const sim = runSimulation({
      vehicles,
      buildings,
      trees,
      solarPanels,
      greenSpaceSqKm,
      publicTransitRatio
    });

    const newCity = new City({
      cityName: cityName.trim(),
      description: description.trim(),
      vehicles: Number(vehicles),
      buildings: Number(buildings),
      trees: Number(trees),
      solarPanels: Number(solarPanels),
      greenSpaceSqKm: Number(greenSpaceSqKm),
      publicTransitRatio: Number(publicTransitRatio),
      simulationMetrics: {
        trafficCongestion: sim.metrics.traffic.percentage,
        trafficLevel: sim.metrics.traffic.level,
        pollutionIndex: sim.metrics.pollution.index,
        airQuality: sim.metrics.pollution.airQuality,
        solarEnergyOutputKWh: sim.metrics.solar.dailyOutputKWh,
        solarCoveragePercent: sim.metrics.solar.coveragePercentage,
        greeneryPercentage: sim.metrics.greenery.percentage,
        sustainabilityScore: sim.metrics.sustainability.score,
        sustainabilityGrade: sim.metrics.sustainability.grade,
        co2SavedKgPerDay: sim.metrics.solar.co2SavedKgPerDay
      }
    });

    const savedCity = await newCity.save();

    res.status(201).json({
      success: true,
      message: `City '${savedCity.cityName}' successfully saved to MongoDB!`,
      city: savedCity,
      simulation: sim
    });
  } catch (err) {
    console.error('Error creating city:', err);
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        error: 'Schema Validation Error',
        messages
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to create city in database',
      message: err.message
    });
  }
});

/**
 * PUT /api/cities/:id
 * Update an existing city document in MongoDB
 */
router.put('/:id', validateObjectId, validateCityInput, requireConnectedDB, async (req, res) => {
  try {
    const {
      cityName,
      description = '',
      vehicles,
      buildings,
      trees,
      solarPanels,
      greenSpaceSqKm = 4.5,
      publicTransitRatio = 30
    } = req.body;

    const existingCity = await City.findById(req.params.id);
    if (!existingCity) {
      return res.status(404).json({
        success: false,
        error: 'City Not Found',
        message: `Cannot update. No city found with ID: ${req.params.id}`
      });
    }

    // Recalculate simulation metrics
    const sim = runSimulation({
      vehicles,
      buildings,
      trees,
      solarPanels,
      greenSpaceSqKm,
      publicTransitRatio
    });

    existingCity.cityName = cityName.trim();
    existingCity.description = description.trim();
    existingCity.vehicles = Number(vehicles);
    existingCity.buildings = Number(buildings);
    existingCity.trees = Number(trees);
    existingCity.solarPanels = Number(solarPanels);
    existingCity.greenSpaceSqKm = Number(greenSpaceSqKm);
    existingCity.publicTransitRatio = Number(publicTransitRatio);
    existingCity.simulationMetrics = {
      trafficCongestion: sim.metrics.traffic.percentage,
      trafficLevel: sim.metrics.traffic.level,
      pollutionIndex: sim.metrics.pollution.index,
      airQuality: sim.metrics.pollution.airQuality,
      solarEnergyOutputKWh: sim.metrics.solar.dailyOutputKWh,
      solarCoveragePercent: sim.metrics.solar.coveragePercentage,
      greeneryPercentage: sim.metrics.greenery.percentage,
      sustainabilityScore: sim.metrics.sustainability.score,
      sustainabilityGrade: sim.metrics.sustainability.grade,
      co2SavedKgPerDay: sim.metrics.solar.co2SavedKgPerDay
    };

    const updatedCity = await existingCity.save();

    res.json({
      success: true,
      message: `City '${updatedCity.cityName}' successfully updated!`,
      city: updatedCity,
      simulation: sim
    });
  } catch (err) {
    console.error('Error updating city:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to update city in database',
      message: err.message
    });
  }
});

/**
 * DELETE /api/cities/:id
 * Delete a city from MongoDB
 */
router.delete('/:id', validateObjectId, requireConnectedDB, async (req, res) => {
  try {
    const deletedCity = await City.findByIdAndDelete(req.params.id);
    if (!deletedCity) {
      return res.status(404).json({
        success: false,
        error: 'City Not Found',
        message: `Cannot delete. No city found with ID: ${req.params.id}`
      });
    }

    res.json({
      success: true,
      message: `City '${deletedCity.cityName}' (ID: ${deletedCity._id}) was permanently deleted from MongoDB.`,
      deletedId: deletedCity._id
    });
  } catch (err) {
    console.error('Error deleting city:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to delete city',
      message: err.message
    });
  }
});

/**
 * GET /api/cities/compare/:id1/:id2
 * Compare two cities side-by-side
 */
router.get('/compare/:id1/:id2', requireConnectedDB, async (req, res) => {
  try {
    const { id1, id2 } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id1) || !mongoose.Types.ObjectId.isValid(id2)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid ID format for comparison',
        message: 'Both IDs must be valid MongoDB ObjectIds.'
      });
    }

    if (id1 === id2) {
      return res.status(400).json({
        success: false,
        error: 'Identical Cities',
        message: 'Please select two distinct cities to perform a meaningful comparison.'
      });
    }

    const [city1, city2] = await Promise.all([
      City.findById(id1),
      City.findById(id2)
    ]);

    if (!city1 || !city2) {
      return res.status(404).json({
        success: false,
        error: 'City Not Found',
        message: !city1 ? `City ID ${id1} not found.` : `City ID ${id2} not found.`
      });
    }

    const sim1 = runSimulation({
      vehicles: city1.vehicles,
      buildings: city1.buildings,
      trees: city1.trees,
      solarPanels: city1.solarPanels,
      greenSpaceSqKm: city1.greenSpaceSqKm,
      publicTransitRatio: city1.publicTransitRatio
    });

    const sim2 = runSimulation({
      vehicles: city2.vehicles,
      buildings: city2.buildings,
      trees: city2.trees,
      solarPanels: city2.solarPanels,
      greenSpaceSqKm: city2.greenSpaceSqKm,
      publicTransitRatio: city2.publicTransitRatio
    });

    // Determine winners for each key metric
    const evaluation = {
      sustainability: {
        winner: sim1.metrics.sustainability.score >= sim2.metrics.sustainability.score ? city1.cityName : city2.cityName,
        diff: Math.abs(sim1.metrics.sustainability.score - sim2.metrics.sustainability.score),
        criterion: 'Higher overall sustainability score is superior.'
      },
      pollution: {
        winner: sim1.metrics.pollution.index <= sim2.metrics.pollution.index ? city1.cityName : city2.cityName,
        diff: Math.abs(sim1.metrics.pollution.index - sim2.metrics.pollution.index),
        criterion: 'Lower pollution index represents cleaner air quality.'
      },
      cleanEnergy: {
        winner: sim1.metrics.solar.dailyOutputKWh >= sim2.metrics.solar.dailyOutputKWh ? city1.cityName : city2.cityName,
        diff: Math.abs(sim1.metrics.solar.dailyOutputKWh - sim2.metrics.solar.dailyOutputKWh),
        criterion: 'Higher daily solar energy output provides greater renewable offset.'
      },
      greenery: {
        winner: sim1.metrics.greenery.percentage >= sim2.metrics.greenery.percentage ? city1.cityName : city2.cityName,
        diff: Math.abs(sim1.metrics.greenery.percentage - sim2.metrics.greenery.percentage),
        criterion: 'Higher green canopy percentage promotes urban biodiversity and cooling.'
      },
      traffic: {
        winner: sim1.metrics.traffic.percentage <= sim2.metrics.traffic.percentage ? city1.cityName : city2.cityName,
        diff: Math.abs(sim1.metrics.traffic.percentage - sim2.metrics.traffic.percentage),
        criterion: 'Lower traffic congestion percentage ensures better mobility and reduced idling.'
      }
    };

    res.json({
      success: true,
      city1: { data: city1, simulation: sim1 },
      city2: { data: city2, simulation: sim2 },
      evaluation
    });
  } catch (err) {
    console.error('Error comparing cities:', err);
    res.status(500).json({
      success: false,
      error: 'Comparison failed',
      message: err.message
    });
  }
});

module.exports = router;
