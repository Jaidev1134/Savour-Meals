import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './LandingPage.css';

const LandingPage = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Scroll-reveal animation
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      { threshold: 0.15 }
    );

    const elements = document.querySelectorAll('.reveal');
    elements.forEach((el) => observer.observe(el));
    return () => elements.forEach((el) => observer.unobserve(el));
  }, []);

  // Animated counter hook
  const useCounter = (target, duration = 2000) => {
    const [count, setCount] = useState(0);
    const [started, setStarted] = useState(false);

    useEffect(() => {
      if (!started) return;
      let start = 0;
      const increment = target / (duration / 16);
      const timer = setInterval(() => {
        start += increment;
        if (start >= target) {
          setCount(target);
          clearInterval(timer);
        } else {
          setCount(Math.floor(start));
        }
      }, 16);
      return () => clearInterval(timer);
    }, [started, target, duration]);

    return [count, setStarted];
  };

  const [meals, setMealsStarted] = useCounter(29000);
  const [donors, setDonorsStarted] = useCounter(500);
  const [ngos, setNGOsStarted] = useCounter(120);
  const [volunteers, setVolunteersStarted] = useCounter(1500);

  // Start counters when stats section is visible
  useEffect(() => {
    const statsSection = document.querySelector('.stats-section');
    if (!statsSection) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setMealsStarted(true);
          setDonorsStarted(true);
          setNGOsStarted(true);
          setVolunteersStarted(true);
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(statsSection);
    return () => observer.unobserve(statsSection);
  }, [setMealsStarted, setDonorsStarted, setNGOsStarted, setVolunteersStarted]);

  return (
    <div className="landing-page">
      {/* NAVBAR */}
      <nav className={`landing-navbar ${scrolled ? 'scrolled' : ''}`}>
        <Link to="/" className="navbar-logo">
          <img src="/logo.png" alt="Savour Meals" />
          <span>Savour Meals</span>
        </Link>

        <div className={`navbar-links ${mobileMenuOpen ? 'mobile-open' : ''}`}>
          <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)}>How It Works</a>
          <a href="#impact" onClick={() => setMobileMenuOpen(false)}>Impact</a>
          <a href="#mission" onClick={() => setMobileMenuOpen(false)}>Our Mission</a>
          <a href="#join" onClick={() => setMobileMenuOpen(false)}>Get Involved</a>
        </div>

        <div className="navbar-actions">
          {user ? (
            <Link to="/dashboard" className="btn-nav-register">Dashboard</Link>
          ) : (
            <>
              <Link to="/login" className="btn-nav-login">Login</Link>
              <Link to="/register" className="btn-nav-register">Register</Link>
            </>
          )}
        </div>

        <button
          className="navbar-hamburger"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </nav>

      {/* HERO SECTION */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-text">
            <div className="hero-badge">🌍 SDG Goal 2 — Zero Hunger</div>
            <h1>
              End Hunger.<br />
              <span className="text-gradient">Share Hope.</span>
            </h1>
            <p>
              Join India's growing community dedicated to redistributing surplus food
              to those who need it most. Every meal shared is a step towards Zero Hunger.
              Together, we can make a difference.
            </p>
            <div className="hero-buttons">
              <Link to="/register" className="btn-hero-primary">
                Donate Food Now →
              </Link>
              <a href="#how-it-works" className="btn-hero-secondary">
                See How It Works
              </a>
            </div>
          </div>
          <div className="hero-image">
            <img src="/hero_food_sharing.png" alt="Community food sharing" />
            <div className="hero-image-badge">
              <div className="badge-icon">🍽️</div>
              <div className="badge-text">
                <strong>29,000+</strong>
                <span>Meals Shared</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* IMPACT STATS */}
      <section className="stats-section" id="impact">
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-number">{meals.toLocaleString()}+</div>
            <div className="stat-label">Meals Shared</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{donors}+</div>
            <div className="stat-label">Active Donors</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{ngos}+</div>
            <div className="stat-label">NGO Partners</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{volunteers.toLocaleString()}+</div>
            <div className="stat-label">Volunteers</div>
          </div>
        </div>
      </section>

      {/* SURPLUS FOOD SHARING INFOGRAPHIC */}
      <section className="infographic-section reveal">
        <div className="infographic-header">
          <h2 className="infographic-title">Surplus Food Sharing</h2>
          <p className="infographic-subtitle">Coalition of Partners To Prevent Food Waste And Food Loss</p>
        </div>
        <div className="infographic-circles">
          <div className="info-bubble orange-bg small-bubble">
            <span className="bubble-icon">
              <svg viewBox="0 0 48 48" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="24" cy="24" r="14"/><path d="M17 24h14"/><path d="M24 17v14"/><path d="M14 32l-4 6"/><path d="M34 32l4 6"/></svg>
            </span>
            <p>With 10.04% of world's total food production, India is the second largest food producer after China.</p>
          </div>
          <div className="info-bubble green-bg large-bubble">
            <span className="bubble-icon">
              <svg viewBox="0 0 48 48" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="24" cy="14" r="5"/><circle cx="12" cy="18" r="4"/><circle cx="36" cy="18" r="4"/><path d="M16 28c0-4.4 3.6-8 8-8s8 3.6 8 8"/><path d="M8 32c0-3.3 2-6 5-7"/><path d="M40 32c0-3.3-2-6-5-7"/></svg>
            </span>
            <p>Inspite of this, India has 196 million under-nourished people, second highest in the world.</p>
          </div>
          <div className="info-bubble blue-bg small-bubble">
            <span className="bubble-icon">
              <svg viewBox="0 0 48 48" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="14" r="5"/><circle cx="32" cy="16" r="3.5"/><path d="M10 30c0-4.4 3.6-8 8-8s8 3.6 8 8"/><path d="M28 28c0-3 2-5.5 4.5-6.5"/><path d="M14 36v4"/><path d="M22 36v4"/></svg>
            </span>
            <p>Children under the age of 5 are underweight and about 33% of them stunted.</p>
          </div>
          <div className="info-bubble gold-bg large-bubble">
            <span className="bubble-icon">
              <svg viewBox="0 0 48 48" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="20" cy="14" r="5"/><circle cx="32" cy="14" r="5"/><path d="M12 28c0-4.4 3.6-8 8-8"/><path d="M24 28c0-4.4 3.6-8 8-8"/><text x="16" y="42" fill="white" stroke="none" fontSize="12" fontWeight="bold">%</text></svg>
            </span>
            <p>25% of hungry people worldwide live in India.</p>
          </div>
          <div className="info-bubble green-bg small-bubble">
            <span className="bubble-icon">
              <svg viewBox="0 0 48 48" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="8" y="28" width="6" height="12" rx="1"/><rect x="17" y="22" width="6" height="18" rx="1"/><rect x="26" y="16" width="6" height="24" rx="1"/><rect x="35" y="10" width="6" height="30" rx="1"/></svg>
            </span>
            <p>With a score of 31.1, in Global Hunger Index, India suffers from a level of hunger that is serious.</p>
          </div>
          <div className="info-bubble blue-bg large-bubble">
            <span className="bubble-icon">
              <svg viewBox="0 0 48 48" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="8,14 18,22 28,18 40,30"/><polyline points="32,30 40,30 40,22"/><line x1="8" y1="38" x2="40" y2="38"/></svg>
            </span>
            <p>India's low ranking trickles on the score of South Asia as India makes up three-fourth of its population.</p>
          </div>
          <div className="info-bubble red-bg small-bubble">
            <span className="bubble-icon">
              <svg viewBox="0 0 48 48" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="24" cy="10" r="5"/><path d="M24 18v12"/><path d="M18 22l6 8 6-8"/><rect x="16" y="32" width="16" height="10" rx="2"/><line x1="24" y1="32" x2="24" y2="42"/></svg>
            </span>
            <p>Stakeholder action is the only solution to tackle the ironical problem on food wastage and hunger.</p>
          </div>
        </div>
        <div className="infographic-footer-text">
          <p>India's primary issue is lack of cold chains and adequate storage facilities leading to a large amount of loss along the supply chain. This, coupled with rising incomes and lack of awareness on the issue of food waste, plays an important role in India's contribution to environmental degradation today.</p>
          <p>Not only do we need to put surplus food back into the food chain but we also need to secure food for future generations at a low environmental cost.</p>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="how-section reveal" id="how-it-works">
        <div className="section-header">
          <div className="section-badge">How It Works</div>
          <h2>Simple Steps to Share Food</h2>
          <p>
            Our platform makes it easy for donors, NGOs, and volunteers to connect
            and ensure no meal goes to waste.
          </p>
        </div>
        <div className="steps-grid">
          <div className="step-card">
            <div className="step-number">1</div>
            <span className="step-icon">🍲</span>
            <h3>List Surplus Food</h3>
            <p>
              Donors list their excess food — from restaurants, events, or homes.
              Specify quantity, type, and pickup time.
            </p>
          </div>
          <div className="step-card">
            <div className="step-number">2</div>
            <span className="step-icon">✅</span>
            <h3>NGO Accepts</h3>
            <p>
              Partner NGOs review and accept food donations based on their
              requirements and distribution capacity.
            </p>
          </div>
          <div className="step-card">
            <div className="step-number">3</div>
            <span className="step-icon">🚚</span>
            <h3>Volunteer Delivers</h3>
            <p>
              Our volunteers pick up the food from donors and safely deliver it
              to the NGO distribution centers.
            </p>
          </div>
          <div className="step-card">
            <div className="step-number">4</div>
            <span className="step-icon">💚</span>
            <h3>Feed the Needy</h3>
            <p>
              Food reaches those who need it most. Together we prevent waste and
              fight hunger in our communities.
            </p>
          </div>
        </div>
      </section>

      {/* MISSION SECTION */}
      <section className="mission-section reveal" id="mission">
        <div className="mission-content">
          <div className="mission-image">
            <img src="/sdg_hero.png" alt="SDG 2 Zero Hunger" />
          </div>
          <div className="mission-text">
            <div className="section-badge">Our Mission</div>
            <h2>Aligned with UN SDG Goal 2: Zero Hunger</h2>
            <p>
              Over 20 crore Indians go to bed hungry every day, while 1/3rd of all
              food produced in India is wasted before consumption. Savour Meals bridges
              this gap using technology to connect surplus food with those in need.
            </p>
            <p>
              We believe that no meal should go to waste when millions are hungry.
              Our platform brings together food donors, NGOs, and volunteers to create
              a sustainable food redistribution ecosystem.
            </p>
            <ul className="mission-highlights">
              <li>
                <span className="check-icon">✓</span>
                Real-time food donation tracking & matching
              </li>
              <li>
                <span className="check-icon">✓</span>
                Verified NGO and volunteer network
              </li>
              <li>
                <span className="check-icon">✓</span>
                Location-based delivery coordination
              </li>
              <li>
                <span className="check-icon">✓</span>
                Safe food handling guidelines (FSSAI aligned)
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* GET INVOLVED / ROLES */}
      <section className="roles-section reveal" id="join">
        <div className="section-header">
          <div className="section-badge">Get Involved</div>
          <h2>Everyone Has a Role to Play</h2>
          <p>Whether you have surplus food, want to volunteer, or represent an NGO — there's a place for you.</p>
        </div>
        <div className="roles-grid">
          <div className="role-card">
            <span className="role-icon">🏪</span>
            <h3>Food Donors</h3>
            <p>
              Restaurants, caterers, households, or events with surplus food. List your
              excess food in minutes and help it reach someone in need instead of the landfill.
            </p>
            <Link to="/register" className="btn-role">Start Donating →</Link>
          </div>
          <div className="role-card">
            <span className="role-icon">🏢</span>
            <h3>NGO Partners</h3>
            <p>
              Food banks, shelters, and community organizations. Register your NGO to
              receive food donations and distribute them to underserved communities.
            </p>
            <Link to="/register" className="btn-role">Register NGO →</Link>
          </div>
          <div className="role-card">
            <span className="role-icon">🤝</span>
            <h3>Volunteers</h3>
            <p>
              Be the bridge between donors and those in need. Sign up as a volunteer to
              help pick up and deliver food donations in your area.
            </p>
            <Link to="/register" className="btn-role">Volunteer Now →</Link>
          </div>
        </div>
      </section>

      {/* CTA SECTION */}
      <section className="cta-section reveal">
        <div className="cta-content">
          <h2>Ready to Make a Difference?</h2>
          <p>
            Join thousands of individuals and organizations working together to end hunger.
            Every plate of food shared counts.
          </p>
          <Link to="/register" className="btn-cta">
            Join Savour Meals Today →
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="landing-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <h3>Savour Meals</h3>
            <p>
              A technology-driven food redistribution platform connecting surplus
              food with those in need. Aligned with UN Sustainable Development
              Goal 2: Zero Hunger.
            </p>
            <div className="footer-sdg-badge">
              🌍 SDG Goal 2 — Zero Hunger
            </div>
          </div>
          <div className="footer-col">
            <h4>Platform</h4>
            <a href="#how-it-works">How It Works</a>
            <a href="#impact">Our Impact</a>
            <a href="#mission">Mission</a>
            <a href="#join">Get Involved</a>
          </div>
          <div className="footer-col">
            <h4>Roles</h4>
            <Link to="/register">Food Donor</Link>
            <Link to="/register">NGO Partner</Link>
            <Link to="/register">Volunteer</Link>
          </div>
          <div className="footer-col">
            <h4>Account</h4>
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
            {user && <Link to="/dashboard">Dashboard</Link>}
          </div>
        </div>
        <div className="footer-bottom">
          © {new Date().getFullYear()} Savour Meals. Built with 💚 for a hunger-free India.
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
