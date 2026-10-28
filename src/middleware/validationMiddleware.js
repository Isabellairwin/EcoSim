const mongoose = require('mongoose');

/**
 * Validates MongoDB ObjectId in route parameters (:id)
 */
function validateObjectId(req, res, next) {
  const { id } = req.params;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid City ID format',
      message: `The provided id '${id}' is not a valid 24-character hexadecimal MongoDB ObjectId.`
    });
  }
  next();
}

/**
 * Validates City creation and update request payloads
 */
function validateCityInput(req, res, next) {
  const { cityName, vehicles, buildings, trees, solarPanels, greenSpaceSqKm, publicTransitRatio } = req.body;
  const errors = [];

  // City Name Validation
  if (!cityName || typeof cityName !== 'string' || cityName.trim().length < 2) {
    errors.push('cityName is required and must be at least 2 characters long.');
  } else if (cityName.trim().length > 60) {
    errors.push('cityName cannot exceed 60 characters.');
  }

  // Helper for positive integers
  const validateNonNegativeInt = (val, fieldName, max = 200000) => {
    if (val === undefined || val === null || val === '') {
      errors.push(`${fieldName} is required.`);
    } else {
      const num = Number(val);
      if (isNaN(num) || !Number.isInteger(num)) {
        errors.push(`${fieldName} must be an integer.`);
      } else if (num < 0) {
        errors.push(`${fieldName} cannot be negative.`);
      } else if (num > max) {
        errors.push(`${fieldName} cannot exceed ${max.toLocaleString()}.`);
      }
    }
  };

  validateNonNegativeInt(vehicles, 'vehicles', 100000);
  validateNonNegativeInt(buildings, 'buildings', 50000);
  validateNonNegativeInt(trees, 'trees', 200000);
  validateNonNegativeInt(solarPanels, 'solarPanels', 100000);

  // Optional fields validation
  if (greenSpaceSqKm !== undefined && greenSpaceSqKm !== null && greenSpaceSqKm !== '') {
    const gs = Number(greenSpaceSqKm);
    if (isNaN(gs) || gs < 0 || gs > 500) {
      errors.push('greenSpaceSqKm must be a number between 0 and 500.');
    }
  }

  if (publicTransitRatio !== undefined && publicTransitRatio !== null && publicTransitRatio !== '') {
    const pt = Number(publicTransitRatio);
    if (isNaN(pt) || pt < 0 || pt > 100) {
      errors.push('publicTransitRatio must be a percentage between 0 and 100.');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'Validation Failed',
      messages: errors
    });
  }

  next();
}

module.exports = {
  validateObjectId,
  validateCityInput
};

