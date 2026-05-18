const crypto = require('crypto');
const FoodDonation = require('../models/FoodDonation');
const User = require('../models/User');
const Delivery = require('../models/Delivery');
const { sendBatchNotifications, sendNotification } = require('../utils/notifications');
const { sendNotificationEmail } = require('../utils/email');
const { getRoute: getOSRMRoute, getMultiLegRoute } = require('../utils/routing');
const { geocode } = require('../utils/geocoding');

// @desc    Create a food donation request
// @route   POST /api/food/create
// @access  Private (Donor)
const createDonation = async (req, res) => {
  try {
    const { foodType, quantity, preparedAt, expiryTime, pickupLocation, notes } = req.body;

    // Create a copy of pickupLocation to avoid reference issues
    const pickupLocationData = { ...pickupLocation };

    // Sanitize pickupLocation coordinates
    if (pickupLocationData.coordinates) {
      const { lat, lng } = pickupLocationData.coordinates;
      // Remove coordinates if they are not valid numbers
      const isLatValid = typeof lat === 'number' && isFinite(lat);
      const isLngValid = typeof lng === 'number' && isFinite(lng);

      if (!isLatValid || !isLngValid) {
        delete pickupLocationData.coordinates;
      }
    }

    // Auto-geocode: if no valid coordinates, resolve from address
    if (!pickupLocationData.coordinates && pickupLocationData.address) {
      try {
        const geoResult = await geocode(pickupLocationData.address);
        if (geoResult) {
          pickupLocationData.coordinates = { lat: geoResult.lat, lng: geoResult.lng };
          console.log(`[Donation] Auto-geocoded pickup: ${geoResult.lat}, ${geoResult.lng} (${geoResult.source})`);
        }
      } catch (geoErr) {
        console.warn('[Donation] Geocoding failed for pickup address:', geoErr.message);
        // Non-fatal: donation still created without coordinates
      }
    }

    // Validate expiry time is after prepared time
    if (new Date(expiryTime) <= new Date(preparedAt)) {
      return res.status(400).json({
        success: false,
        msg: 'Expiry time must be after prepared time'
      });
    }

    // Check if food is expired
    if (new Date(expiryTime) <= new Date()) {
      return res.status(400).json({
        success: false,
        msg: 'Food has already expired'
      });
    }

    // Generate cryptographically secure 6-digit OTP
    const pickupOtp = crypto.randomInt(100000, 999999).toString();

    const donation = await FoodDonation.create({
      donorId: req.user.id,
      foodType,
      quantity,
      preparedAt: new Date(preparedAt),
      expiryTime: new Date(expiryTime),
      pickupLocation: pickupLocationData,
      notes,
      pickupOtp
    });

    // Find nearby NGOs (for now, get all NGOs - can be improved with location-based queries)
    const ngos = await User.find({
      role: 'ngo',
      verified: true
    }).select('fcmToken email name');

    // Send notifications to NGOs
    const fcmTokens = ngos
      .filter(ngo => ngo.fcmToken)
      .map(ngo => ngo.fcmToken);

    if (fcmTokens.length > 0) {
      await sendBatchNotifications(
        fcmTokens,
        'New Food Donation Available',
        `${foodType} - Quantity: ${quantity} people`,
        {
          donationId: donation._id.toString(),
          type: 'new_donation'
        }
      );
    }

    // Send email notifications
    ngos.forEach(async (ngo) => {
      if (ngo.email) {
        await sendNotificationEmail(
          ngo.email,
          'New Food Donation Available',
          `A new food donation is available: ${foodType} (Quantity: ${quantity} people). Please check the dashboard to accept or reject.`,
          `${process.env.FRONTEND_URL || 'http://localhost:3000'}/ngo/donations/${donation._id}`
        );
      }
    });

    res.status(201).json({
      success: true,
      donation
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      msg: error.message || 'Server error creating donation'
    });
  }
};

// @desc    Get all pending donations (for NGOs)
// @route   GET /api/food/pending
// @access  Private (NGO)
const getPendingDonations = async (req, res) => {
  try {
    const donations = await FoodDonation.find({
      status: 'pending',
      expiryTime: { $gt: new Date() } // Only non-expired food
    })
      .populate('donorId', 'name phone location')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: donations.length,
      donations
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      msg: error.message || 'Server error fetching donations'
    });
  }
};

// @desc    Get donations by donor
// @route   GET /api/food/donor/:donorId
// @access  Private
const getDonorDonations = async (req, res) => {
  try {
    const donorId = req.params.donorId || req.user.id;

    // Only allow users to see their own donations unless they're admin/ngo
    if (donorId !== req.user.id && !['admin', 'ngo'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        msg: 'Not authorized to view these donations'
      });
    }

    const donations = await FoodDonation.find({ donorId })
      .populate('ngoId', 'name organizationName')
      .populate('volunteerId', 'name phone')
      .sort({ createdAt: -1 });

    // Fetch delivery details (including OTP) for these donations
    const donationIds = donations.map(d => d._id);
    const deliveries = await require('../models/Delivery').find({
      donationId: { $in: donationIds }
    });

    const donationMap = {};
    deliveries.forEach(d => {
      donationMap[d.donationId] = d;
    });

    // Merge delivery info into donation objects
    const donationsWithDelivery = donations.map(donation => {
      const delivery = donationMap[donation._id];
      const donationObj = donation.toObject();
      if (delivery) {
        donationObj.delivery = delivery;
      }
      return donationObj;
    });

    res.json({
      success: true,
      count: donationsWithDelivery.length,
      donations: donationsWithDelivery
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      msg: error.message || 'Server error fetching donations'
    });
  }
};

// @desc    Accept a donation (NGO)
// @route   PUT /api/food/accept/:id
// @access  Private (NGO)
const acceptDonation = async (req, res) => {
  try {
    const donation = await FoodDonation.findById(req.params.id);

    if (!donation) {
      return res.status(404).json({
        success: false,
        msg: 'Donation not found'
      });
    }

    if (donation.status !== 'pending') {
      return res.status(400).json({
        success: false,
        msg: 'Donation is no longer pending'
      });
    }

    donation.status = 'accepted';
    donation.ngoId = req.user.id;

    await donation.save();

    // Notify donor
    const donor = await User.findById(donation.donorId);
    if (donor && donor.fcmToken) {
      await sendNotification(
        donor.fcmToken,
        'Donation Accepted',
        `Your ${donation.foodType} donation has been accepted by an NGO`,
        {
          donationId: donation._id.toString(),
          type: 'donation_accepted'
        }
      );
    }

    res.json({
      success: true,
      donation
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      msg: error.message || 'Server error accepting donation'
    });
  }
};

// @desc    Reject a donation (NGO)
// @route   PUT /api/food/reject/:id
// @access  Private (NGO)
const rejectDonation = async (req, res) => {
  try {
    const { rejectedReason } = req.body;
    const donation = await FoodDonation.findById(req.params.id);

    if (!donation) {
      return res.status(404).json({
        success: false,
        msg: 'Donation not found'
      });
    }

    donation.status = 'rejected';
    donation.rejectedReason = rejectedReason;

    await donation.save();

    res.json({
      success: true,
      donation
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      msg: error.message || 'Server error rejecting donation'
    });
  }
};

// @desc    Update donation status
// @route   PUT /api/food/status/:id
// @access  Private (NGO/Volunteer)
const updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const donation = await FoodDonation.findById(req.params.id);

    if (!donation) {
      return res.status(404).json({
        success: false,
        msg: 'Donation not found'
      });
    }

    // Validate status value
    const validStatuses = ['pending', 'accepted', 'picked', 'delivered', 'rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        msg: 'Invalid status'
      });
    }

    // Enforce status transition order
    const statusFlow = {
      pending: ['accepted', 'rejected'],
      accepted: ['picked'],
      picked: ['delivered'],
      delivered: [],
      rejected: []
    };

    if (donation.status !== status) {
      const allowedNext = statusFlow[donation.status] || [];
      if (!allowedNext.includes(status)) {
        return res.status(400).json({
          success: false,
          msg: `Invalid status transition from '${donation.status}' to '${status}'`
        });
      }
    }

    donation.status = status;
    await donation.save();

    res.json({
      success: true,
      donation
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      msg: error.message || 'Server error updating status'
    });
  }
};

// @desc    Get OSRM route for a donation delivery (multi-leg: Volunteer → Pickup → Delivery)
// @route   GET /api/food/route/:id
// @access  Private (Volunteer/NGO)
const getRouteInfo = async (req, res) => {
  try {
    const donation = await FoodDonation.findById(req.params.id);

    if (!donation) {
      return res.status(404).json({
        success: false,
        msg: 'Donation not found'
      });
    }

    // Find associated delivery for volunteer location and delivery address
    const delivery = await Delivery.findOne({ donationId: donation._id });

    let pickupCoords = donation.pickupLocation?.coordinates;
    const volunteerCoords = delivery?.currentLocation;

    // Auto-geocode pickup if coordinates are missing
    if ((!pickupCoords?.lat || !pickupCoords?.lng) && donation.pickupLocation?.address) {
      const geoResult = await geocode(donation.pickupLocation.address);
      if (geoResult) {
        pickupCoords = { lat: geoResult.lat, lng: geoResult.lng };
        // Persist for future requests
        donation.pickupLocation.coordinates = pickupCoords;
        await donation.save();
      }
    }

    if (!pickupCoords?.lat || !pickupCoords?.lng) {
      return res.status(400).json({
        success: false,
        msg: 'Pickup location coordinates not available. Could not geocode the address.'
      });
    }

    if (!volunteerCoords?.lat || !volunteerCoords?.lng) {
      return res.status(400).json({
        success: false,
        msg: 'Volunteer location not available. Please share your location first.'
      });
    }

    // Try to geocode the delivery address for the 3rd waypoint
    let deliveryCoords = null;
    const deliveryAddress = delivery?.deliveryAddress || donation.deliveryAddress;
    if (deliveryAddress) {
      const deliveryGeo = await geocode(deliveryAddress);
      if (deliveryGeo) {
        deliveryCoords = { lat: deliveryGeo.lat, lng: deliveryGeo.lng };
      }
    }

    // Build waypoints array
    const waypoints = [
      { lat: volunteerCoords.lat, lng: volunteerCoords.lng },
      { lat: pickupCoords.lat, lng: pickupCoords.lng },
    ];
    if (deliveryCoords) {
      waypoints.push({ lat: deliveryCoords.lat, lng: deliveryCoords.lng });
    }

    // Use multi-leg route if 3 points, otherwise 2-point route
    let route;
    if (waypoints.length >= 3) {
      route = await getMultiLegRoute(waypoints);
    } else {
      const simpleRoute = await getOSRMRoute(
        volunteerCoords.lat, volunteerCoords.lng,
        pickupCoords.lat, pickupCoords.lng
      );
      if (simpleRoute) {
        route = {
          totalDistance: simpleRoute.distance,
          totalDuration: simpleRoute.duration,
          legs: [{
            legIndex: 0,
            from: 'Volunteer',
            to: 'Pickup',
            distance: simpleRoute.distance,
            duration: simpleRoute.duration,
          }],
          geometry: simpleRoute.geometry,
        };
      }
    }

    if (!route) {
      return res.status(503).json({
        success: false,
        msg: 'Routing service unavailable. Please try again later.'
      });
    }

    // Include marker coordinates in response so frontend can display them
    res.json({
      success: true,
      route,
      markers: {
        volunteer: volunteerCoords,
        pickup: pickupCoords,
        delivery: deliveryCoords,  // may be null
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      msg: error.message || 'Server error computing route'
    });
  }
};

module.exports = {
  createDonation,
  getPendingDonations,
  getDonorDonations,
  acceptDonation,
  rejectDonation,
  updateStatus,
  getRouteInfo
};

