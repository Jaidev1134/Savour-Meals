import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { adminAPI } from '../utils/api';
import { useToast } from '../components/Toast';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Doughnut, Line } from 'react-chartjs-2';
import './Dashboard.css';
import './AdminDashboard.css';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [analytics, setAnalytics] = useState(null);
  const [users, setUsers] = useState([]);
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [userFilters, setUserFilters] = useState({ role: 'all', search: '' });
  const [donationFilters, setDonationFilters] = useState({ status: 'all', search: '' });

  useEffect(() => {
    fetchAnalytics();
  }, []);

  useEffect(() => {
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'donations') fetchDonations();
  }, [activeTab, userFilters, donationFilters]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchAnalytics = async () => {
    try {
      const res = await adminAPI.getAnalytics();
      setAnalytics(res.data.analytics);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const params = {};
      if (userFilters.role !== 'all') params.role = userFilters.role;
      if (userFilters.search) params.search = userFilters.search;
      const res = await adminAPI.getUsers(params);
      setUsers(res.data.users);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchDonations = async () => {
    try {
      const params = {};
      if (donationFilters.status !== 'all') params.status = donationFilters.status;
      if (donationFilters.search) params.search = donationFilters.search;
      const res = await adminAPI.getDonations(params);
      setDonations(res.data.donations);
    } catch (error) {
      console.error('Error fetching donations:', error);
    }
  };

  const handleVerifyUser = async (userId, verified) => {
    try {
      await adminAPI.updateUser(userId, { verified });
      fetchUsers();
      if (activeTab === 'overview') fetchAnalytics();
      toast.success(verified ? 'User verified' : 'User unverified');
    } catch (error) {
      toast.error(error.response?.data?.msg || 'Error updating user');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      try {
        await adminAPI.deleteUser(userId);
        fetchUsers();
        if (activeTab === 'overview') fetchAnalytics();
        toast.success('User deleted');
      } catch (error) {
        toast.error(error.response?.data?.msg || 'Error deleting user');
      }
    }
  };

  // Chart configurations
  const donationsOverTimeChart = analytics?.donationsOverTime ? {
    labels: analytics.donationsOverTime.map(d => {
      const date = new Date(d._id);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }),
    datasets: [{
      label: 'Donations',
      data: analytics.donationsOverTime.map(d => d.count),
      fill: true,
      backgroundColor: 'rgba(133, 83, 244, 0.1)',
      borderColor: '#8553f4',
      borderWidth: 2,
      tension: 0.4,
      pointBackgroundColor: '#8553f4',
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
      pointRadius: 4,
      pointHoverRadius: 6
    }]
  } : null;

  const donationsByStatusChart = analytics?.donationsByStatus ? {
    labels: Object.keys(analytics.donationsByStatus).map(s => s.charAt(0).toUpperCase() + s.slice(1)),
    datasets: [{
      data: Object.values(analytics.donationsByStatus),
      backgroundColor: ['#eab308', '#3b82f6', '#a855f7', '#22c55e', '#ef4444', '#6b7280'],
      borderWidth: 0,
      hoverOffset: 8
    }]
  } : null;

  const usersByRoleChart = analytics?.usersByRole ? {
    labels: Object.keys(analytics.usersByRole).map(r => r.charAt(0).toUpperCase() + r.slice(1)),
    datasets: [{
      data: Object.values(analytics.usersByRole),
      backgroundColor: ['#f59e0b', '#0ea5e9', '#a855f7', '#ec4899'],
      borderWidth: 0,
      hoverOffset: 8
    }]
  } : null;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 20,
          usePointStyle: true,
          font: { family: 'Outfit', weight: '600', size: 12 }
        }
      }
    }
  };

  const lineChartOptions = {
    ...chartOptions,
    scales: {
      y: {
        beginAtZero: true,
        ticks: { font: { family: 'Outfit', weight: '500' } },
        grid: { color: 'rgba(0,0,0,0.04)' }
      },
      x: {
        ticks: { font: { family: 'Outfit', weight: '500' } },
        grid: { display: false }
      }
    }
  };

  return (
    <div className="dashboard admin-dashboard">
      <header className="dashboard-header">
        <div className="header-content">
          <h1>Savour Meals <span className="role-badge" style={{ background: 'linear-gradient(135deg, #ec4899, #a855f7)' }}>Admin</span></h1>
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
        {/* Tab Navigation */}
        <div className="admin-tabs">
          <button 
            className={`admin-tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button 
            className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            Users
          </button>
          <button 
            className={`admin-tab ${activeTab === 'donations' ? 'active' : ''}`}
            onClick={() => setActiveTab('donations')}
          >
            Donations
          </button>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="slide-down">
            {loading ? (
              <div className="loading-spinner">Loading analytics...</div>
            ) : analytics ? (
              <>
                {/* Stats Cards */}
                <div className="stats-grid">
                  <div className="stat-card purple">
                    <p className="stat-label">Total Users</p>
                    <p className="stat-value">{analytics.overview.totalUsers}</p>
                  </div>
                  <div className="stat-card teal">
                    <p className="stat-label">Total Donations</p>
                    <p className="stat-value">{analytics.overview.totalDonations}</p>
                  </div>
                  <div className="stat-card green">
                    <p className="stat-label">Delivered</p>
                    <p className="stat-value">{analytics.overview.totalDelivered}</p>
                  </div>
                  <div className="stat-card orange">
                    <p className="stat-label">People Fed</p>
                    <p className="stat-value">{analytics.overview.totalServings}</p>
                  </div>
                  <div className="stat-card blue">
                    <p className="stat-label">Success Rate</p>
                    <p className="stat-value">{analytics.overview.successRate}%</p>
                  </div>
                  <div className="stat-card pink">
                    <p className="stat-label">Avg. Delivery (min)</p>
                    <p className="stat-value">{analytics.overview.avgDeliveryTime}</p>
                  </div>
                </div>

                {/* Charts */}
                <div className="charts-grid">
                  <div className="chart-card">
                    <h3>Donation Volume (Last 30 Days)</h3>
                    <div style={{ height: '300px' }}>
                      {donationsOverTimeChart && (
                        <Line data={donationsOverTimeChart} options={lineChartOptions} />
                      )}
                      {!donationsOverTimeChart && <p style={{ color: 'var(--on-surface-variant)' }}>No data available yet.</p>}
                    </div>
                  </div>
                  <div className="chart-card">
                    <h3>Donations by Status</h3>
                    <div style={{ height: '300px' }}>
                      {donationsByStatusChart && (
                        <Doughnut data={donationsByStatusChart} options={chartOptions} />
                      )}
                      {!donationsByStatusChart && <p style={{ color: 'var(--on-surface-variant)' }}>No data available yet.</p>}
                    </div>
                  </div>
                </div>

                <div className="charts-grid">
                  <div className="chart-card">
                    <h3>Top Donors</h3>
                    {analytics.topDonors && analytics.topDonors.length > 0 ? (
                      <ul className="top-donors-list">
                        {analytics.topDonors.map((donor, index) => (
                          <li key={donor._id}>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                              <span className="donor-rank">{index + 1}</span>
                              <div className="donor-info">
                                <div className="name">{donor.name}</div>
                                <div className="email">{donor.email}</div>
                              </div>
                            </div>
                            <div className="donor-stats">
                              <div className="count">{donor.count}</div>
                              <div className="label">donations ({donor.totalQuantity} servings)</div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p style={{ color: 'var(--on-surface-variant)' }}>No donors yet.</p>
                    )}
                  </div>
                  <div className="chart-card">
                    <h3>Users by Role</h3>
                    <div style={{ height: '300px' }}>
                      {usersByRoleChart && (
                        <Doughnut data={usersByRoleChart} options={chartOptions} />
                      )}
                      {!usersByRoleChart && <p style={{ color: 'var(--on-surface-variant)' }}>No data available yet.</p>}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="empty-state">Unable to load analytics data.</div>
            )}
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="slide-down">
            <div className="admin-table-container">
              <div className="table-header">
                <h3>User Management ({users.length} users)</h3>
                <div className="table-filters">
                  <select
                    className="filter-select"
                    value={userFilters.role}
                    onChange={(e) => setUserFilters({ ...userFilters, role: e.target.value })}
                  >
                    <option value="all">All Roles</option>
                    <option value="donor">Donors</option>
                    <option value="ngo">NGOs</option>
                    <option value="volunteer">Volunteers</option>
                    <option value="admin">Admins</option>
                  </select>
                  <input
                    className="filter-input"
                    type="text"
                    placeholder="Search by name or email..."
                    value={userFilters.search}
                    onChange={(e) => setUserFilters({ ...userFilters, search: e.target.value })}
                  />
                </div>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Phone</th>
                      <th>Verified</th>
                      <th>Joined</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u._id}>
                        <td style={{ fontWeight: 700 }}>{u.name}</td>
                        <td>{u.email}</td>
                        <td><span className={`role-pill ${u.role}`}>{u.role}</span></td>
                        <td>{u.phone}</td>
                        <td>
                          <span className={`verified-badge ${u.verified ? 'yes' : 'no'}`}>
                            {u.verified ? '✓ Verified' : '✕ Unverified'}
                          </span>
                        </td>
                        <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                        <td>
                          <div className="action-btns">
                            {u.verified ? (
                              <button className="btn-sm unverify" onClick={() => handleVerifyUser(u._id, false)}>Unverify</button>
                            ) : (
                              <button className="btn-sm verify" onClick={() => handleVerifyUser(u._id, true)}>Verify</button>
                            )}
                            {u._id !== user.id && (
                              <button className="btn-sm delete" onClick={() => handleDeleteUser(u._id)}>Delete</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr>
                        <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--on-surface-variant)' }}>
                          No users found matching your filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Donations Tab */}
        {activeTab === 'donations' && (
          <div className="slide-down">
            <div className="admin-table-container">
              <div className="table-header">
                <h3>Donation Oversight ({donations.length} donations)</h3>
                <div className="table-filters">
                  <select
                    className="filter-select"
                    value={donationFilters.status}
                    onChange={(e) => setDonationFilters({ ...donationFilters, status: e.target.value })}
                  >
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="accepted">Accepted</option>
                    <option value="picked">Picked</option>
                    <option value="delivered">Delivered</option>
                    <option value="rejected">Rejected</option>
                  </select>
                  <input
                    className="filter-input"
                    type="text"
                    placeholder="Search by food type..."
                    value={donationFilters.search}
                    onChange={(e) => setDonationFilters({ ...donationFilters, search: e.target.value })}
                  />
                </div>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Food Type</th>
                      <th>Qty</th>
                      <th>Donor</th>
                      <th>NGO</th>
                      <th>Volunteer</th>
                      <th>Status</th>
                      <th>Expiry</th>
                      <th>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {donations.map((d) => (
                      <tr key={d._id}>
                        <td style={{ fontWeight: 700 }}>{d.foodType}</td>
                        <td>{d.quantity}</td>
                        <td>{d.donorId?.name || '—'}</td>
                        <td>{d.ngoId?.organizationName || d.ngoId?.name || '—'}</td>
                        <td>{d.volunteerId?.name || '—'}</td>
                        <td>
                          <span className={`status-pill ${d.status}`}>
                            {d.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td>{new Date(d.expiryTime).toLocaleString()}</td>
                        <td>{new Date(d.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                    {donations.length === 0 && (
                      <tr>
                        <td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: 'var(--on-surface-variant)' }}>
                          No donations found matching your filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
