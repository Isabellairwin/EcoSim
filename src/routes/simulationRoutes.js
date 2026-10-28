const express = require('express');
const router = express.Router();
const { runSimulation } = require('../simulation/simulationEngine');

/**
 * POST /api/simulation/calculate
 * Calculate smart city indicators on-the-fly without saving to database
 */
router.post('/calculate', (req, res) => {
  try {
    const results = runSimulation(req.body);
    res.json({
      success: true,
      simulation: results
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: 'Calculation error',
      message: err.message
    });
  }
});

module.exports = router;

