import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { foodAPI, geocodeAPI } from '../utils/api';
import { useToast } from '../components/Toast';
import MapComponent from '../components/MapComponent';
import DeliveryProgressBar from '../components/DeliveryProgressBar';
import './Dashboard.css';

const DonorDashboard = () => {
  const { user, logout } = useAuth();
  const toast = useToast();
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [copiedOtp, setCopiedOtp] = useState(null);
  const [formData, setFormData] = useState({
    foodType: '',
    quantity: '',
    preparedAt: '',
    expiryTime: '',
    pickupLocation: {
      address: '',
      coordinates: { lat: '', lng: '' },
    },
    notes: '',
  });

  // Address preview geocoding state
  const [addressPreview, setAddressPreview] = useState(null);
  const [geocodeLoading, setGeocodeLoading] = useState(false);
  const geocodeTimer = useRef(null);

  useEffect(() => {
    fetchDonations();
    // Auto-refresh every 30 seconds for tracking
    const interval = setInterval(fetchDonations, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchDonations = async () => {
    try {
      const response = await foodAPI.getDonorDonations();
      setDonations(response.data.donations);
    } catch (error) {
      console.error('Error fetching donations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation: Expiry time must be after prepared time
    if (new Date(formData.expiryTime) <= new Date(formData.preparedAt)) {
      toast.warning('Expiry time must be later than the preparation time.');
      return;
    }

    try {
      await foodAPI.create(formData);
      setShowForm(false);
      setFormData({
        foodType: '',
        quantity: '',
        preparedAt: '',
        expiryTime: '',
        pickupLocation: { address: '', coordinates: { lat: '', lng: '' } },
        notes: '',
      });
      fetchDonations();
      toast.success('Donation created successfully!');
    } catch (error) {
      toast.error(error.response?.data?.msg || 'Error creating donation');
    }
  };

  // Debounced address geocoding for form preview
  const handleAddressChange = (newAddress) => {
    setFormData({
      ...formData,
      pickupLocation: { ...formData.pickupLocation, address: newAddress },
    });

    // Clear previous timer
    if (geocodeTimer.current) clearTimeout(geocodeTimer.current);

    // Debounce: wait 800ms after user stops typing
    if (newAddress.trim().length >= 5) {
      geocodeTimer.current = setTimeout(async () => {
        setGeocodeLoading(true);
        try {
          const response = await geocodeAPI.search(newAddress);
          if (response.data?.success && response.data?.location) {
            const { lat, lng } = response.data.location;
            setAddressPreview({ lat, lng });
            // Also update form data coordinates
            setFormData(prev => ({
              ...prev,
              pickupLocation: {
                ...prev.pickupLocation,
                coordinates: { lat, lng },
              },
            }));
          } else {
            setAddressPreview(null);
          }
        } catch {
          setAddressPreview(null);
        } finally {
          setGeocodeLoading(false);
        }
      }, 800);
    } else {
      setAddressPreview(null);
    }
  };

  const handleCopyOtp = (otp) => {
    navigator.clipboard.writeText(otp);
    setCopiedOtp(otp);
    toast.success('OTP copied to clipboard');
    setTimeout(() => setCopiedOtp(null), 2000);
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-content">
          <h1>Savour Meals <span className="role-badge">Donor</span></h1>
          <p className="welcome-text">Welcome back, {user.name}</p>
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
        <div className="action-bar">
          <button
            onClick={() => setShowForm(!showForm)}
            className={`btn-primary ${showForm ? 'active' : ''}`}
          >
            {showForm ? '✕ Cancel' : '+ Create New Donation'}
          </button>
        </div>

        {showForm && (
          <div className="form-card slide-down">
            <h2>Share a Meal</h2>
            <p className="form-subtitle">Fill in the details to donate food.</p>
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Food Item</label>
                  <input
                    type="text"
                    value={formData.foodType}
                    onChange={(e) => setFormData({ ...formData, foodType: e.target.value })}
                    placeholder="e.g., Ven Pongal, Curd Rice"
                    required
                    className="modern-input"
                  />
                </div>
                <div className="form-group">
                  <label>Quantity (Servings)</label>
                  <input
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    min="1"
                    required
                    className="modern-input"
                  />
                </div>
                <div className="form-group">
                  <label>Prepared At</label>
                  <input
                    type="datetime-local"
                    value={formData.preparedAt}
                    onChange={(e) => setFormData({ ...formData, preparedAt: e.target.value })}
                    required
                    className="modern-input"
                  />
                </div>
                <div className="form-group">
                  <label>Expiry Time</label>
                  <input
                    type="datetime-local"
                    value={formData.expiryTime}
                    min={formData.preparedAt}
                    onChange={(e) => setFormData({ ...formData, expiryTime: e.target.value })}
                    required
                    className="modern-input"
                  />
                  <small className="hint-text">Must be after preparation time.</small>
                </div>
              </div>

              <div className="form-group full-width">
                <label>Pickup Address</label>
                <input
                  type="text"
                  value={formData.pickupLocation.address}
                  onChange={(e) => handleAddressChange(e.target.value)}
                  placeholder="Enter full address for pickup"
                  required
                  className="modern-input"
                />
                {geocodeLoading && (
                  <small className="hint-text" style={{ color: 'var(--primary)' }}>📍 Resolving address...</small>
                )}
                {addressPreview && !geocodeLoading && (
                  <small className="hint-text" style={{ color: '#22c55e' }}>✓ Location found</small>
                )}
              </div>

              {/* Address preview map */}
              {addressPreview && (
                <div className="full-width" style={{ marginBottom: '1rem' }}>
                  <MapComponent
                    center={addressPreview}
                    markers={[{ lat: addressPreview.lat, lng: addressPreview.lng, popup: 'Pickup Location', type: 'pickup' }]}
                    height="200px"
                    zoom={15}
                  />
                </div>
              )}

              <div className="form-group full-width">
                <label>Notes / Instructions (Optional)</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows="3"
                  className="modern-input"
                  placeholder="Any specific packing instructions or landmarks..."
                />
              </div>

              <div className="form-actions">
                <button type="submit" className="btn-submit">
                  Submit Donation
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="donations-section">
          <div className="section-header">
            <h2>Your Contributions</h2>
            <button onClick={fetchDonations} className="btn-icon" title="Refresh">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
            </button>
          </div>

          {loading ? (
            <div className="loading-spinner">Loading...</div>
          ) : donations.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{opacity: 0.4}}><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>
              </div>
              <h3>No donations yet</h3>
              <p>Your journey to ending hunger starts here. Create a donation above!</p>
            </div>
          ) : (
            <div className="cards-grid">
              {donations.map((donation) => {
                const showMap = ['accepted', 'picked', 'in_transit'].includes(donation.status);
                const delivery = donation.delivery;
                const volunteerLoc = delivery?.currentLocation;

                // Construct markers for map
                const markers = [];
                if (donation.pickupLocation?.coordinates?.lat) {
                  markers.push({
                    lat: donation.pickupLocation.coordinates.lat,
                    lng: donation.pickupLocation.coordinates.lng,
                    popup: 'Pickup Location',
                    type: 'pickup'
                  });
                }
                if (volunteerLoc && volunteerLoc.lat) {
                  markers.push({
                    lat: volunteerLoc.lat,
                    lng: volunteerLoc.lng,
                    popup: 'Volunteer',
                    type: 'volunteer'
                  });
                }

                return (
                  <div key={donation._id} className="card donation-card">
                    <div className="card-header">
                      <span className={`status-pill ${donation.status}`}>
                        {donation.status.replace('_', ' ').toUpperCase()}
                      </span>
                      <span className="date-badge">
                        {new Date(donation.preparedAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="card-body">
                      <h3 className="food-title">{donation.foodType}</h3>

                      <div className="card-details">
                        <div className="detail-item">
                          <span className="detail-label">Qty</span>
                          <span>{donation.quantity} servings</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Exp</span>
                          <span>Expires: {new Date(donation.expiryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                      
                      {/* Unified Theme Progress Bar placed here */}
                      <DeliveryProgressBar status={donation.status} />

                      {donation.ngoId && (
                        <div className="ngo-info">
                          <strong>Accepted by:</strong> {donation.ngoId.name || donation.ngoId.organizationName}
                        </div>
                      )}

                      {delivery && (
                        <div className="delivery-card">
                          <div className="volunteer-row">
                            <div className="volunteer-avatar">
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                            </div>
                            <div>
                              <p className="volunteer-name">{donation.volunteerId?.name}</p>
                              <p className="volunteer-role">Volunteer</p>
                            </div>
                            <a href={`tel:${donation.volunteerId?.phone}`} className="phone-btn">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                            </a>
                          </div>
                        </div>
                      )}

                      {donation.pickupOtp && ['accepted', 'picked'].includes(donation.status) && (
                        <div className="otp-box" style={{ marginTop: '15px' }}>
                          <span className="otp-label">PICKUP OTP</span>
                          <span className="otp-value">{donation.pickupOtp}</span>
                          <button 
                            className="btn-icon" 
                            style={{ width: '36px', height: '36px', fontSize: '1rem' }}
                            onClick={() => handleCopyOtp(donation.pickupOtp)}
                            title="Copy OTP"
                          >
                            {copiedOtp === donation.pickupOtp ? (
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                            ) : (
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                            )}
                          </button>
                        </div>
                      )}

                      {showMap && markers.length > 0 && (
                        <div className="map-wrapper">
                          <MapComponent
                            center={volunteerLoc || markers[0]}
                            markers={markers}
                            zoom={13}
                          />
                        </div>
                      )}
                    </div>
                    <div className="card-footer">
                      <p className="location-text">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{verticalAlign: 'middle', marginRight: '6px'}}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                        {donation.pickupLocation?.address}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DonorDashboard;
