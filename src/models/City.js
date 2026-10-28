const mongoose = require('mongoose');

const CitySchema = new mongoose.Schema(
  {
    cityName: {
      type: String,
      required: [true, 'City name is required'],
      trim: true,
      minlength: [2, 'City name must have at least 2 characters'],
      maxlength: [60, 'City name cannot exceed 60 characters']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [300, 'Description cannot exceed 300 characters'],
      default: ''
    },
    vehicles: {
      type: Number,
      required: [true, 'Vehicle count is required'],
      min: [0, 'Vehicles cannot be negative'],
      max: [100000, 'Vehicle count cannot exceed 100,000'],
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} is not an integer value for vehicles'
      }
    },
    buildings: {
      type: Number,
      required: [true, 'Building count is required'],
      min: [0, 'Buildings cannot be negative'],
      max: [50000, 'Building count cannot exceed 50,000'],
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} is not an integer value for buildings'
      }
    },
    trees: {
      type: Number,
      required: [true, 'Tree count is required'],
      min: [0, 'Trees cannot be negative'],
      max: [200000, 'Tree count cannot exceed 200,000'],
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} is not an integer value for trees'
      }
    },
    solarPanels: {
      type: Number,
      required: [true, 'Solar panel count is required'],
      min: [0, 'Solar panels cannot be negative'],
      max: [100000, 'Solar panel count cannot exceed 100,000'],
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} is not an integer value for solar panels'
      }
    },
    greenSpaceSqKm: {
      type: Number,
      min: [0, 'Green space cannot be negative'],
      max: [500, 'Green space cannot exceed 500 sq km'],
      default: 4.5
    },
    publicTransitRatio: {
      type: Number,
      min: [0, 'Transit ratio cannot be negative'],
      max: [100, 'Transit ratio cannot exceed 100%'],
      default: 30
    },
    simulationMetrics: {
      trafficCongestion: { type: Number, default: 0 },
      trafficLevel: { type: String, default: 'Clear' },
      pollutionIndex: { type: Number, default: 0 },
      airQuality: { type: String, default: 'Clean' },
      solarEnergyOutputKWh: { type: Number, default: 0 },
      solarCoveragePercent: { type: Number, default: 0 },
      greeneryPercentage: { type: Number, default: 0 },
      sustainabilityScore: { type: Number, default: 0 },
      sustainabilityGrade: { type: String, default: 'N/A' },
      co2SavedKgPerDay: { type: Number, default: 0 }
    }
  },
  {
    collection: 'cities',
    timestamps: true
  }
);

// Virtual index for quick sorting and search
CitySchema.index({ cityName: 'text', description: 'text' });
CitySchema.index({ createdAt: -1 });

module.exports = mongoose.model('City', CitySchema);

