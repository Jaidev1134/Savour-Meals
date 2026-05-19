import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [showPassword, setShowPassword] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(formData.email, formData.password);

    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.message);
    }

    setLoading(false);
  };

  return (
    <div className="auth-container">
      <div className="auth-visual-section">
        <div className="visual-content">
          <div className="sdg-badge">Surplus Food Sharing</div>
          <h1>Coalition of Partners<br/>To Prevent Food Waste</h1>
          <p>Understanding the scale of India's food crisis — and how Savour Meals helps bridge the gap.</p>

          {/* Infographic Circles */}
          <div className="info-circles-grid">
            <div className="info-circle green">
              <span className="circle-icon">🍽️</span>
              <p>With 10.04% of world's total food production, India is the second largest food producer after China.</p>
            </div>
            <div className="info-circle orange">
              <span className="circle-icon">👨‍👩‍👧‍👦</span>
              <p>India has 196 million under-nourished people, second highest in the world.</p>
            </div>
            <div className="info-circle gold">
              <span className="circle-icon">📊</span>
              <p>25% of hungry people worldwide live in India.</p>
            </div>
            <div className="info-circle blue">
              <span className="circle-icon">📉</span>
              <p>With a score of 31.1 in Global Hunger Index, India suffers from a serious level of hunger.</p>
            </div>
            <div className="info-circle red">
              <span className="circle-icon">🤝</span>
              <p>Stakeholder action is the only solution to tackle the ironical problem of food wastage and hunger.</p>
            </div>
          </div>
        </div>
      </div>
      <div className="auth-form-section">
        <div className="auth-card">
          <h2>Login to Savour Meals</h2>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
              />
              <button 
                type="button" 
                className="password-toggle-btn" 
                onClick={() => setShowPassword(!showPassword)}
                tabIndex="-1"
              >
                {showPassword ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                )}
              </button>
            </div>
          </div>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        <p className="auth-link">
          Don't have an account? <Link to="/register">Register here</Link>
        </p>
      </div>
      </div>
    </div>
  );
};

export default Login;

