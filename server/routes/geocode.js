const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { geocode } = require('../utils/geocoding');

// @desc    Geocode an address to coordinates
// @route   GET /api/geocode
// @access  Private (any authenticated user)
router.get('/', auth, async (req, res) => {
  try {
    const { address } = req.query;

    if (!address || address.trim().length < 3) {
      return res.status(400).json({
        success: false,
        msg: 'Please provide an address with at least 3 characters'
      });
    }

    const result = await geocode(address.trim());

    if (!result) {
      return res.status(404).json({
        success: false,
        msg: 'Could not resolve this address. Try adding more details like city, state, or pin code.'
      });
    }

    res.json({
      success: true,
      location: {
        lat: result.lat,
        lng: result.lng,
        displayName: result.displayName,
        source: result.source
      }
    });
  } catch (error) {
    console.error('Geocode endpoint error:', error.message);
    res.status(500).json({
      success: false,
      msg: 'Geocoding service temporarily unavailable. Please try again.'
    });
  }
});

module.exports = router;
