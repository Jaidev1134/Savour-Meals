import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { volunteerAPI, routingAPI, geocodeAPI } from '../utils/api';
import { useToast } from '../components/Toast';
import MapComponent from '../components/MapComponent';
import DeliveryProgressBar from '../components/DeliveryProgressBar';
import './Dashboard.css';

const VolunteerDashboard = () => {
  const { user, logout } = useAuth();
  const toast = useToast();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Per-task state: markers, route, loading flags
  const [taskMapData, setTaskMapData] = useState({});

  // OTP Modal states
  const [otpModal, setOtpModal] = useState({ isOpen: false, taskId: null });
  const [otpValue, setOtpValue] = useState('');
  const [deliveryOtpModal, setDeliveryOtpModal] = useState({ isOpen: false, taskId: null });
  const [deliveryOtpValue, setDeliveryOtpValue] = useState('');

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const response = await volunteerAPI.getTasks();
      setTasks(response.data.tasks);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get or initialize map data for a task
   */
  const getTaskData = useCallback((taskId) => {
    return taskMapData[taskId] || {
      markers: [],
      routeGeometry: null,
      routeInfo: null,
      routeLoading: false,
      geocodeLoading: false,
    };
  }, [taskMapData]);

  const updateTaskData = useCallback((taskId, updates) => {
    setTaskMapData(prev => ({
      ...prev,
      [taskId]: { ...prev[taskId], ...updates }
    }));
  }, []);

  /**
   * Geocode an address using the server-side geocoding API
   */
  const geocodeAddress = async (address) => {
    if (!address) return null;
    try {
      const response = await geocodeAPI.search(address);
      if (response.data?.success && response.data?.location) {
        return response.data.location;
      }
    } catch (error) {
      console.warn('Geocode failed:', error.response?.data?.msg || error.message);
    }
    return null;
  };

  /**
   * Load all markers for a task: pickup + delivery + volunteer (if available)
   */
  const loadAllMarkers = async (task) => {
    const donation = task.donationId;
    const markers = [];

    updateTaskData(task._id, { geocodeLoading: true });

    // 1. Pickup location from donation coordinates (auto-geocoded on server)
    const pickupCoords = donation?.pickupLocation?.coordinates;
    if (pickupCoords?.lat && pickupCoords?.lng) {
      markers.push({
        lat: pickupCoords.lat,
        lng: pickupCoords.lng,
        popup: 'Pickup Location',
        details: donation.pickupLocation.address,
        type: 'pickup'
      });
    } else if (donation?.pickupLocation?.address) {
      // Fallback: geocode on client
      const geo = await geocodeAddress(donation.pickupLocation.address);
      if (geo) {
        markers.push({
          lat: geo.lat,
          lng: geo.lng,
          popup: 'Pickup Location',
          details: donation.pickupLocation.address,
          type: 'pickup'
        });
      }
    }

    // 2. Delivery location from delivery address
    if (task.deliveryAddress) {
      const deliveryGeo = await geocodeAddress(task.deliveryAddress);
      if (deliveryGeo) {
        markers.push({
          lat: deliveryGeo.lat,
          lng: deliveryGeo.lng,
          popup: 'Delivery Location',
          details: task.deliveryAddress,
          type: 'delivery'
        });
      }
    }

    updateTaskData(task._id, { markers, geocodeLoading: false });
    return markers;
  };

  /**
   * Share volunteer's current GPS location
   */
  const handleShareLocation = (task) => {
    if (!navigator.geolocation) {
      toast.warning('Geolocation is not supported by your browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const currentLocation = { lat: latitude, lng: longitude };

        // Update markers — keep existing non-volunteer markers, add/update volunteer
        setTaskMapData(prev => {
          const existing = prev[task._id] || {};
          const otherMarkers = (existing.markers || []).filter(m => m.type !== 'volunteer');
          return {
            ...prev,
            [task._id]: {
              ...existing,
              markers: [
                ...otherMarkers,
                { lat: latitude, lng: longitude, popup: 'My Location', details: 'Your current position', type: 'volunteer' }
              ]
            }
          };
        });

        // Also update status on server
        try {
          await volunteerAPI.updateTaskStatus(task._id, task.status, currentLocation);
          toast.success('Location shared successfully!');
        } catch (error) {
          // Location was still shown on map even if status update fails
          console.warn('Status update with location failed:', error);
        }
      },
      (error) => {
        toast.error('Unable to retrieve your location. Please enable GPS.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  /**
   * Get full route: Volunteer → Pickup → Delivery
   */
  const handleGetRoute = async (task) => {
    const donationId = task.donationId?._id || task.donationId;
    const currentData = getTaskData(task._id);

    // Ensure volunteer location is shared first
    const hasVolunteer = currentData.markers?.some(m => m.type === 'volunteer');
    if (!hasVolunteer) {
      toast.warning('Please share your location first to compute the route.');
      return;
    }

    updateTaskData(task._id, { routeLoading: true });

    try {
      const response = await routingAPI.getRoute(donationId);
      const { route, markers: serverMarkers } = response.data;

      // Build updated markers from server response (most accurate)
      const newMarkers = [];
      if (serverMarkers?.volunteer) {
        newMarkers.push({
          lat: serverMarkers.volunteer.lat,
          lng: serverMarkers.volunteer.lng,
          popup: 'My Location',
          details: 'Your current position',
          type: 'volunteer'
        });
      }
      if (serverMarkers?.pickup) {
        newMarkers.push({
          lat: serverMarkers.pickup.lat,
          lng: serverMarkers.pickup.lng,
          popup: 'Pickup Location',
          details: task.donationId?.pickupLocation?.address || 'Donor pickup point',
          type: 'pickup'
        });
      }
      if (serverMarkers?.delivery) {
        newMarkers.push({
          lat: serverMarkers.delivery.lat,
          lng: serverMarkers.delivery.lng,
          popup: 'Delivery Location',
          details: task.deliveryAddress || 'NGO delivery point',
          type: 'delivery'
        });
      }

      updateTaskData(task._id, {
        markers: newMarkers.length > 0 ? newMarkers : currentData.markers,
        routeGeometry: route.geometry,
        routeInfo: route,
        routeLoading: false,
      });

      toast.success('Route loaded successfully!');
    } catch (error) {
      const msg = error.response?.data?.msg || 'Unable to compute route.';
      toast.error(msg);
      updateTaskData(task._id, { routeLoading: false });
    }
  };

  // Status update handlers
  const updateStatus = async (taskId, status, currentLocation = null, otp = null) => {
    if (status === 'picked' && !otp) {
      setOtpModal({ isOpen: true, taskId });
      return;
    }
    if (status === 'delivered' && !otp) {
      setDeliveryOtpModal({ isOpen: true, taskId });
      return;
    }

    try {
      await volunteerAPI.updateTaskStatus(taskId, status, currentLocation, otp);
      fetchTasks();
      if (!currentLocation) {
        toast.success(`Status updated to ${status.replace('_', ' ').toUpperCase()}`);
      }
      setOtpModal({ isOpen: false, taskId: null });
      setOtpValue('');
      setDeliveryOtpModal({ isOpen: false, taskId: null });
      setDeliveryOtpValue('');
    } catch (error) {
      toast.error(error.response?.data?.msg || 'Error updating status');
    }
  };

  const handleOtpSubmit = (e) => {
    e.preventDefault();
    if (otpValue.trim()) {
      updateStatus(otpModal.taskId, 'picked', null, otpValue.trim());
    }
  };

  const handleDeliveryOtpSubmit = (e) => {
    e.preventDefault();
    if (deliveryOtpValue.trim()) {
      updateStatus(deliveryOtpModal.taskId, 'delivered', null, deliveryOtpValue.trim());
    }
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-content">
          <h1>Savour Meals <span className="role-badge" style={{ background: 'linear-gradient(135deg, #a855f7, #7c3aed)' }}>Volunteer</span></h1>
          <p className="welcome-text">Welcome, {user.name}</p>
        </div>
        <div className="header-actions">
          <Link to="/" className="btn-home">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            Home
          </Link>
          <button onClick={logout} className="btn-logout">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Logout
          </button>
        </div>
      </header>

      <div className="dashboard-content">
        <div className="donations-list">
          <h2>My Assigned Tasks</h2>
          {loading ? (
            <div>Loading...</div>
          ) : tasks.length === 0 ? (
            <div className="empty-state">No tasks assigned at the moment.</div>
          ) : (
            <div className="cards-grid">
              {tasks.map((task) => {
                const donation = task.donationId;
                const data = getTaskData(task._id);

                return (
                  <div key={task._id} className="card volunteer-card">
                    <div className="card-header">
                      <h3>{donation?.foodType}</h3>
                      <span className={`status-pill ${task.status}`}>
                        {task.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>

                    {/* Progress Stepper */}
                    <DeliveryProgressBar status={task.status} />

                    <div className="card-body">
                      {/* Map Section */}
                      <div className="map-section">
                        {data.markers && data.markers.length > 0 && (
                          <MapComponent
                            markers={data.markers}
                            routeGeometry={data.routeGeometry}
                            routeInfo={data.routeInfo}
                            height="320px"
                            zoom={14}
                          />
                        )}

                        {/* Map Controls */}
                        <div style={{ display: 'flex', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' }}>
                          <button
                            onClick={() => loadAllMarkers(task)}
                            className="btn-secondary"
                            style={{ flex: 1, minWidth: '120px' }}
                            disabled={data.geocodeLoading}
                          >
                            {data.geocodeLoading ? (
                              <span>Locating...</span>
                            ) : (
                              <span>📍 Show Locations</span>
                            )}
                          </button>
                          <button
                            onClick={() => handleShareLocation(task)}
                            className="btn-secondary"
                            style={{ flex: 1, minWidth: '120px', background: '#3b82f6', color: 'white' }}
                          >
                            📡 Share My Location
                          </button>
                        </div>

                        <button
                          onClick={() => handleGetRoute(task)}
                          className="btn-secondary"
                          style={{
                            width: '100%',
                            marginBottom: '12px',
                            background: 'linear-gradient(135deg, #8553f4, #00d2d3)',
                            color: 'white',
                            fontWeight: 700,
                            border: 'none',
                            padding: '12px',
                            borderRadius: 'var(--radius-sm)',
                          }}
                          disabled={data.routeLoading}
                        >
                          {data.routeLoading ? '⏳ Computing Route...' : '🗺️ Get Route & ETA'}
                        </button>

                        {/* Route legs breakdown */}
                        {data.routeInfo?.legs && (
                          <div style={{
                            background: 'rgba(133, 83, 244, 0.04)',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid rgba(133, 83, 244, 0.12)',
                            padding: '14px 18px',
                            marginBottom: '15px',
                          }}>
                            {data.routeInfo.legs.map((leg, idx) => (
                              <div key={idx} style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '8px 0',
                                borderBottom: idx < data.routeInfo.legs.length - 1 ? '1px solid rgba(0,0,0,0.06)' : 'none',
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{
                                    width: '22px', height: '22px', borderRadius: '50%',
                                    background: idx === 0 ? '#3b82f6' : '#22c55e',
                                    color: 'white', display: 'flex', alignItems: 'center',
                                    justifyContent: 'center', fontSize: '0.65rem', fontWeight: 800,
                                  }}>{idx + 1}</span>
                                  <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                                    {leg.from} → {leg.to}
                                  </span>
                                </div>
                                <div style={{ display: 'flex', gap: '12px', fontSize: '0.8rem', fontWeight: 700 }}>
                                  <span style={{ color: '#8553f4' }}>{leg.distance} km</span>
                                  <span style={{ color: '#00d2d3' }}>{leg.duration} min</span>
                                </div>
                              </div>
                            ))}

                            {/* Total */}
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              paddingTop: '10px',
                              marginTop: '8px',
                              borderTop: '2px solid rgba(133, 83, 244, 0.15)',
                            }}>
                              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--on-surface)' }}>
                                Total
                              </span>
                              <div style={{ display: 'flex', gap: '12px', fontSize: '0.85rem', fontWeight: 800 }}>
                                <span style={{ color: '#8553f4' }}>{data.routeInfo.totalDistance} km</span>
                                <span style={{ color: '#00d2d3' }}>{data.routeInfo.totalDuration} min</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="info-grid">
                        <div className="info-item">
                          <label>Quantity</label>
                          <p>{donation?.quantity} people</p>
                        </div>
                        <div className="info-item">
                          <label>Donor</label>
                          <p>{donation?.donorId?.name}</p>
                          <a href={`tel:${donation?.donorId?.phone}`} className="phone-link">{donation?.donorId?.phone}</a>
                        </div>
                        <div className="info-item full-width">
                          <label>Pickup Location</label>
                          <p>{donation?.pickupLocation?.address}</p>
                        </div>
                        <div className="info-item full-width">
                          <label>Delivery Address</label>
                          <p>{task.deliveryAddress}</p>
                        </div>
                      </div>

                      <div className="card-actions">
                        {task.status === 'assigned' && (
                          <button onClick={() => updateStatus(task._id, 'picked')} className="btn-primary full-width">
                            Mark as Picked Up
                          </button>
                        )}
                        {task.status === 'picked' && (
                          <button onClick={() => updateStatus(task._id, 'in_transit')} className="btn-warning full-width">
                            Start Delivery (In Transit)
                          </button>
                        )}
                        {task.status === 'in_transit' && (
                          <button onClick={() => updateStatus(task._id, 'delivered')} className="btn-success full-width">
                            Confirm Delivery
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Pickup OTP Modal (6-digit from Donor) */}
      {otpModal.isOpen && (
        <div className="modal otp-modal">
          <div className="modal-content">
            <h2>Enter Pickup OTP</h2>
            <p className="form-subtitle">Please enter the 6-digit OTP provided by the Donor to confirm you have picked up the food.</p>
            <form onSubmit={handleOtpSubmit}>
              <div className="form-group">
                <input
                  type="text"
                  value={otpValue}
                  onChange={(e) => setOtpValue(e.target.value)}
                  placeholder="e.g. 849204"
                  className="modern-input otp-input"
                  required
                  autoFocus
                  maxLength={6}
                />
              </div>
              <div className="modal-actions">
                <button type="submit" className="btn-primary">
                  Verify & Pick Up
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOtpModal({ isOpen: false, taskId: null });
                    setOtpValue('');
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delivery OTP Modal (4-digit to confirm delivery to NGO) */}
      {deliveryOtpModal.isOpen && (
        <div className="modal otp-modal">
          <div className="modal-content">
            <h2>Enter Delivery OTP</h2>
            <p className="form-subtitle">Please enter the 4-digit OTP provided by the NGO to confirm the food has been delivered successfully.</p>
            <form onSubmit={handleDeliveryOtpSubmit}>
              <div className="form-group">
                <input
                  type="text"
                  value={deliveryOtpValue}
                  onChange={(e) => setDeliveryOtpValue(e.target.value)}
                  placeholder="e.g. 4829"
                  className="modern-input otp-input"
                  required
                  autoFocus
                  maxLength={4}
                />
              </div>
              <div className="modal-actions">
                <button type="submit" className="btn-success">
                  Confirm Delivery
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDeliveryOtpModal({ isOpen: false, taskId: null });
                    setDeliveryOtpValue('');
                  }}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default VolunteerDashboard;
