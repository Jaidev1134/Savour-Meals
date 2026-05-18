import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { foodAPI, ngoAPI, routingAPI, geocodeAPI } from '../utils/api';
import { useToast } from '../components/Toast';
import DeliveryProgressBar from '../components/DeliveryProgressBar';
import MapComponent from '../components/MapComponent';
import './Dashboard.css';

const NGODashboard = () => {
  const { user, logout } = useAuth();
  const toast = useToast();
  const [pendingDonations, setPendingDonations] = useState([]);
  const [volunteers, setVolunteers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDonation, setSelectedDonation] = useState(null);
  const [assignForm, setAssignForm] = useState({ volunteerId: '', deliveryAddress: '' });

  // Rejection modal state
  const [rejectModal, setRejectModal] = useState({ isOpen: false, donationId: null });
  const [rejectReason, setRejectReason] = useState('');

  // Tracking modal state
  const [trackingModal, setTrackingModal] = useState({ isOpen: false, donation: null });
  const [trackingMapData, setTrackingMapData] = useState({ markers: [], routeGeometry: null, routeInfo: null, loading: false });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [donationsRes, volunteersRes] = await Promise.all([
        ngoAPI.getRequests(),
        ngoAPI.getVolunteers(),
      ]);
      setPendingDonations(donationsRes.data.requests);
      setVolunteers(volunteersRes.data.volunteers);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (donationId) => {
    try {
      await foodAPI.accept(donationId);
      fetchData();
      toast.success('Donation accepted successfully!');
    } catch (error) {
      toast.error(error.response?.data?.msg || 'Error accepting donation');
    }
  };

  const handleReject = async (e) => {
    e.preventDefault();
    if (rejectReason.trim()) {
      try {
        await foodAPI.reject(rejectModal.donationId, rejectReason.trim());
        setRejectModal({ isOpen: false, donationId: null });
        setRejectReason('');
        fetchData();
        toast.success('Donation rejected.');
      } catch (error) {
        toast.error(error.response?.data?.msg || 'Error rejecting donation');
      }
    }
  };

  const handleAssignVolunteer = async (e) => {
    e.preventDefault();
    try {
      await ngoAPI.assignVolunteer(selectedDonation, assignForm.volunteerId, assignForm.deliveryAddress);
      setSelectedDonation(null);
      setAssignForm({ volunteerId: '', deliveryAddress: '' });
      fetchData();
      toast.success('Volunteer assigned successfully!');
    } catch (error) {
      toast.error(error.response?.data?.msg || 'Error assigning volunteer');
    }
  };

  const handleTrackStatus = async (donation) => {
    setTrackingModal({ isOpen: true, donation });
    setTrackingMapData({ markers: [], routeGeometry: null, routeInfo: null, loading: true });

    // Build markers from available data
    const markers = [];
    const pickupCoords = donation.pickupLocation?.coordinates;
    if (pickupCoords?.lat && pickupCoords?.lng) {
      markers.push({
        lat: pickupCoords.lat,
        lng: pickupCoords.lng,
        popup: 'Pickup Location',
        details: donation.pickupLocation.address,
        type: 'pickup'
      });
    }

    // Volunteer location from delivery record
    const volunteerCoords = donation.delivery?.currentLocation;
    if (volunteerCoords?.lat && volunteerCoords?.lng) {
      markers.push({
        lat: volunteerCoords.lat,
        lng: volunteerCoords.lng,
        popup: 'Volunteer',
        details: donation.volunteerId?.name || 'Volunteer',
        type: 'volunteer'
      });
    }

    // Geocode delivery address
    const deliveryAddress = donation.delivery?.deliveryAddress || donation.deliveryAddress;
    if (deliveryAddress) {
      try {
        const geoRes = await geocodeAPI.search(deliveryAddress);
        if (geoRes.data?.success && geoRes.data?.location) {
          markers.push({
            lat: geoRes.data.location.lat,
            lng: geoRes.data.location.lng,
            popup: 'Delivery Location',
            details: deliveryAddress,
            type: 'delivery'
          });
        }
      } catch { /* ignore */ }
    }

    // Try to get route
    let routeGeometry = null;
    let routeInfo = null;
    if (volunteerCoords?.lat) {
      try {
        const routeRes = await routingAPI.getRoute(donation._id);
        if (routeRes.data?.success) {
          routeGeometry = routeRes.data.route?.geometry;
          routeInfo = routeRes.data.route;
        }
      } catch { /* route not available yet */ }
    }

    setTrackingMapData({ markers, routeGeometry, routeInfo, loading: false });
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-content">
          <h1>Savour Meals <span className="role-badge" style={{ background: 'linear-gradient(135deg, #0ea5e9, #06b6d4)' }}>NGO</span></h1>
          <p className="welcome-text">Welcome, {user.organizationName || user.name}</p>
        </div>
        <button onClick={logout} className="btn-logout">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          Logout
        </button>
      </header>

      <div className="dashboard-content">
        {/* Section 1: Nearby Requests (Pending) */}
        <div className="section-container">
          <h2>Nearby Requests</h2>
          {loading ? (
            <div>Loading...</div>
          ) : pendingDonations.filter(d => d.status === 'pending').length === 0 ? (
            <div className="empty-state">No pending requests nearby.</div>
          ) : (
            <div className="cards-grid">
              {pendingDonations.filter(d => d.status === 'pending').map((donation) => (
                <div key={donation._id} className="card pending-card">
                  <div className="card-header">
                    <h3>{donation.foodType}</h3>
                    <span className="status-pill pending">PENDING</span>
                  </div>
                  <div className="card-body">
                    <p><strong>Quantity:</strong> {donation.quantity} people</p>
                    <p><strong>Location:</strong> {donation.pickupLocation?.address}</p>
                    <p><strong>Prepared:</strong> {new Date(donation.preparedAt).toLocaleString()}</p>
                    <p><strong>Expires:</strong> {new Date(donation.expiryTime).toLocaleString()}</p>

                    {/* Freshness Indicator */}
                    {(() => {
                      const now = new Date();
                      const expiry = new Date(donation.expiryTime);
                      const prepared = new Date(donation.preparedAt);
                      const totalWindow = expiry - prepared;
                      const remaining = expiry - now;
                      const freshnessScore = totalWindow > 0 ? Math.max(0, Math.min(100, (remaining / totalWindow) * 100)) : 0;
                      const freshnessColor = freshnessScore > 60 ? '#22c55e' : freshnessScore > 30 ? '#eab308' : '#ef4444';
                      const freshnessLabel = freshnessScore > 60 ? 'Fresh' : freshnessScore > 30 ? 'Moderate' : 'Expiring Soon';
                      return (
                        <div className="freshness-indicator" style={{ marginTop: '12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: freshnessColor, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              {freshnessLabel}
                            </span>
                            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--on-surface-variant)' }}>
                              {Math.round(freshnessScore)}%
                            </span>
                          </div>
                          <div style={{ width: '100%', height: '6px', background: 'rgba(0,0,0,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: `${freshnessScore}%`, height: '100%', background: freshnessColor, borderRadius: '3px', transition: 'width 0.5s ease' }} />
                          </div>
                        </div>
                      );
                    })()}

                    <div className="card-actions">
                      <button onClick={() => handleAccept(donation._id)} className="btn-success">Accept</button>
                      <button onClick={() => setRejectModal({ isOpen: true, donationId: donation._id })} className="btn-danger">Reject</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 2: Active Deliveries */}
        <div className="section-container">
          <h2>Active Deliveries</h2>
          {loading ? (
            <div>Loading...</div>
          ) : pendingDonations.filter(d => d.status !== 'pending').length === 0 ? (
            <div className="empty-state">No active deliveries.</div>
          ) : (
            <div className="cards-grid">
              {pendingDonations.filter(d => d.status !== 'pending').map((donation) => (
                <div key={donation._id} className={`card status-${donation.status}`}>
                  <div className="card-header">
                    <h3>{donation.foodType}</h3>
                    <span className={`status-pill ${donation.status}`}>
                      {donation.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="card-body">
                    <p><strong>Quantity:</strong> {donation.quantity} people</p>
                    <p><strong>Donor:</strong> {donation.donorId?.name} ({donation.donorId?.phone})</p>
                    <p><strong>Pickup:</strong> {donation.pickupLocation?.address}</p>

                    {donation.volunteerId ? (
                      <div className="volunteer-info">
                        <p><strong>Volunteer:</strong> {donation.volunteerId.name}</p>
                        <p><strong>Contact:</strong> {donation.volunteerId.phone}</p>
                      </div>
                    ) : (
                      <div className="volunteer-needed">
                        <p>Volunteer needed</p>
                      </div>
                    )}

                    <DeliveryProgressBar status={donation.status} />

                    {/* Show 4-digit Delivery OTP for NGO to share with volunteer */}
                    {donation.delivery?.pickupOtp && ['accepted', 'picked', 'in_transit'].includes(donation.status) && (
                      <div className="otp-box" style={{ marginTop: '15px' }}>
                        <span className="otp-label">DELIVERY OTP</span>
                        <span className="otp-value">{donation.delivery.pickupOtp}</span>
                        <button 
                          className="btn-icon" 
                          style={{ width: '36px', height: '36px', fontSize: '1rem' }}
                          onClick={() => {
                            navigator.clipboard.writeText(donation.delivery.pickupOtp);
                            toast.success('Delivery OTP copied to clipboard');
                          }}
                          title="Copy OTP"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                        </button>
                      </div>
                    )}
                    {donation.delivery?.pickupOtp && ['accepted', 'picked', 'in_transit'].includes(donation.status) && (
                      <p style={{ fontSize: '0.8rem', color: 'var(--on-surface-variant)', marginTop: '8px', fontWeight: 500 }}>
                        Share this OTP with the volunteer to confirm delivery.
                      </p>
                    )}

                    <div className="card-actions">
                      {donation.status === 'accepted' && (
                        <button 
                          onClick={() => setSelectedDonation(donation._id)} 
                          className={`btn-primary ${donation.volunteerId ? 'disabled' : ''}`}
                          disabled={!!donation.volunteerId}
                          title={donation.volunteerId ? 'A volunteer has already been assigned' : 'Assign a new volunteer'}
                        >
                          {donation.volunteerId ? 'Volunteer Assigned' : 'Assign Volunteer'}
                        </button>
                      )}
                      {['accepted', 'picked', 'delivered'].includes(donation.status) && (
                        <button
                          onClick={() => handleTrackStatus(donation)}
                          className="btn-secondary"
                        >
                          Track Status
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Assign Volunteer Modal */}
        {selectedDonation && (
          <div className="modal">
            <div className="modal-content">
              <h2>Assign Volunteer</h2>
              <form onSubmit={handleAssignVolunteer}>
                <div className="form-group">
                  <label>Select Volunteer</label>
                  <select
                    value={assignForm.volunteerId}
                    onChange={(e) => setAssignForm({ ...assignForm, volunteerId: e.target.value })}
                    required
                  >
                    <option value="">Choose a volunteer...</option>
                    {volunteers.map((volunteer) => (
                      <option key={volunteer._id} value={volunteer._id}>
                        {volunteer.name} - {volunteer.phone}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Delivery Address</label>
                  <input
                    type="text"
                    value={assignForm.deliveryAddress}
                    onChange={(e) => setAssignForm({ ...assignForm, deliveryAddress: e.target.value })}
                    placeholder="Enter delivery address"
                    required
                  />
                </div>
                <div className="modal-actions">
                  <button type="submit" className="btn-primary">Assign</button>
                  <button type="button" onClick={() => setSelectedDonation(null)} className="btn-secondary">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Rejection Reason Modal */}
        {rejectModal.isOpen && (
          <div className="modal">
            <div className="modal-content">
              <h2>Reject Donation</h2>
              <p className="form-subtitle">Please provide a reason for rejecting this donation. This will be shared with the donor.</p>
              <form onSubmit={handleReject}>
                <div className="form-group">
                  <label>Rejection Reason</label>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="e.g., Food type not suitable for our beneficiaries, pickup location too far..."
                    className="modern-input"
                    rows="4"
                    required
                    autoFocus
                  />
                </div>
                <div className="modal-actions">
                  <button type="submit" className="btn-danger">Confirm Rejection</button>
                  <button type="button" onClick={() => { setRejectModal({ isOpen: false, donationId: null }); setRejectReason(''); }} className="btn-secondary">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Track Status Modal */}
        {trackingModal.isOpen && trackingModal.donation && (
          <div className="modal">
            <div className="modal-content" style={{ maxWidth: '600px' }}>
              <h2>Delivery Tracking</h2>
              <p className="form-subtitle">{trackingModal.donation.foodType} — {trackingModal.donation.quantity} people</p>
              
              <DeliveryProgressBar status={trackingModal.donation.status} />
              
              <div style={{ marginTop: '20px' }}>
                <div className="info-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</label>
                    <p style={{ margin: '4px 0', fontWeight: 600 }}>{trackingModal.donation.status.replace('_', ' ').toUpperCase()}</p>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Donor</label>
                    <p style={{ margin: '4px 0', fontWeight: 600 }}>{trackingModal.donation.donorId?.name}</p>
                  </div>
                  {trackingModal.donation.volunteerId && (
                    <>
                      <div>
                        <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Volunteer</label>
                        <p style={{ margin: '4px 0', fontWeight: 600 }}>{trackingModal.donation.volunteerId.name}</p>
                      </div>
                      <div>
                        <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Contact</label>
                        <p style={{ margin: '4px 0', fontWeight: 600 }}>
                          <a href={`tel:${trackingModal.donation.volunteerId.phone}`} style={{ color: 'var(--primary)' }}>
                            {trackingModal.donation.volunteerId.phone}
                          </a>
                        </p>
                      </div>
                    </>
                  )}
                </div>

                {trackingMapData.loading ? (
                  <div style={{ textAlign: 'center', padding: '20px', color: 'var(--on-surface-variant)' }}>Loading map data...</div>
                ) : trackingMapData.markers.length > 0 ? (
                  <div style={{ marginTop: '12px' }}>
                    <MapComponent
                      markers={trackingMapData.markers}
                      routeGeometry={trackingMapData.routeGeometry}
                      routeInfo={trackingMapData.routeInfo}
                      height="280px"
                      zoom={14}
                    />
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '20px', color: 'var(--on-surface-variant)', fontSize: '0.9rem' }}>
                    Map data not yet available. Volunteer needs to share their location.
                  </div>
                )}

                {/* Route legs breakdown */}
                {trackingMapData.routeInfo?.legs && (
                  <div style={{
                    background: 'rgba(133, 83, 244, 0.04)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid rgba(133, 83, 244, 0.12)',
                    padding: '12px 16px',
                    marginTop: '12px',
                  }}>
                    {trackingMapData.routeInfo.legs.map((leg, idx) => (
                      <div key={idx} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '6px 0', borderBottom: idx < trackingMapData.routeInfo.legs.length - 1 ? '1px solid rgba(0,0,0,0.06)' : 'none',
                      }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{leg.from} → {leg.to}</span>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#8553f4' }}>{leg.distance} km / {leg.duration} min</span>
                      </div>
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', marginTop: '6px', borderTop: '2px solid rgba(133,83,244,0.15)' }}>
                      <span style={{ fontWeight: 800, fontSize: '0.85rem' }}>Total</span>
                      <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#8553f4' }}>{trackingMapData.routeInfo.totalDistance} km / {trackingMapData.routeInfo.totalDuration} min</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="modal-actions">
                <button type="button" onClick={() => setTrackingModal({ isOpen: false, donation: null })} className="btn-secondary">Close</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NGODashboard;
