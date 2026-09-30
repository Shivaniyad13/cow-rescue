import { Link } from 'react-router-dom';
import {
  AlertCircle, MapPin, Truck, CheckCircle, Heart, Phone, Clock, Shield,
} from 'lucide-react';
import { useConfig } from '../context/ConfigContext';
import './Home.css';

function Home() {
  const { config } = useConfig();
  const emergencyNumber = config.emergency_number;
  const emergencyLabel = config.emergency_label;
  const emergencyTel = `tel:${emergencyNumber}`;

  return (
    <div>
      <section className="home-hero">
        <div className="container">
          <div className="hero-grid">
            <div>
              <div className="hero-badge">
                <Heart size={16} />
                <span>Serving Cows, Serving Communities</span>
              </div>
              <h1 className="hero-title">
                Report an Injured Cow.
                <span className="hero-title-accent"> Save a Life.</span>
              </h1>
              <p className="hero-description">
                Found an injured, sick, or distressed cow? Report it in 60 seconds.
                We'll connect you with government ambulances and nearby NGOs instantly.
              </p>
              <div className="hero-buttons">
                <Link to="/report" className="btn btn-primary">
                  🚨 Report Cow Now
                </Link>
                <Link to="/track" className="btn btn-outline">
                  Track Existing Case
                </Link>
              </div>
              <div className="hero-checks">
                <div className="hero-check">
                  <CheckCircle size={16} className="hero-check-icon" />
                  <span>No login required</span>
                </div>
                <div className="hero-check">
                  <CheckCircle size={16} className="hero-check-icon" />
                  <span>Free service</span>
                </div>
              </div>
            </div>

            <div className="hero-emergency-card">
              <div className="emergency-header">
                <div className="emergency-icon">
                  <Phone size={24} />
                </div>
                <div>
                  <div className="emergency-label">Emergency Helpline</div>
                  <div className="emergency-number">{emergencyNumber}</div>
                </div>
              </div>
              <p className="emergency-description">
                {emergencyLabel} — 24x7, Free of cost.
              </p>
              <a href={emergencyTel} className="emergency-button">
                📞 Call {emergencyNumber} Now
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="section section-white">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">How It Works</h2>
            <p className="section-subtitle">Simple 3-step process to rescue a cow in distress</p>
          </div>
          <div className="steps-grid">
            {[
              { icon: AlertCircle, title: '1. Report', description: 'Fill a simple form with location, photo, and description. No login required.', color: 'danger' },
              { icon: Truck, title: '2. We Coordinate', description: 'System contacts emergency ambulance and nearby NGOs automatically.', color: 'primary' },
              { icon: CheckCircle, title: '3. Rescue & Track', description: 'Track the rescue in real-time. NGO accepts, cow gets treated, case completed.', color: 'primary' },
            ].map((step, i) => (
              <div key={i} className="step-card">
                <div className={`step-icon-wrapper ${step.color === 'danger' ? 'step-icon-danger' : 'step-icon-primary'}`}>
                  <step.icon size={32} />
                </div>
                <h3 className="step-title">{step.title}</h3>
                <p className="step-description">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-gray">
        <div className="container">
          <div className="features-grid">
            {[
              { icon: MapPin, title: 'Location Aware', desc: 'Auto-detects address from GPS' },
              { icon: Clock, title: '15 min Response', desc: 'Auto-escalates if no NGO responds' },
              { icon: Shield, title: 'Verified NGOs', desc: 'AWBI recognized partners only' },
              { icon: Heart, title: 'Free Forever', desc: 'No hidden charges for reporters' },
            ].map((feature, i) => (
              <div key={i} className="feature-item">
                <div className="feature-icon">
                  <feature.icon size={20} />
                </div>
                <div>
                  <div className="feature-title">{feature.title}</div>
                  <div className="feature-description">{feature.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="cta-section">
        <div className="container">
          <h2 className="cta-title">Every Second Counts</h2>
          <p className="cta-description">
            A cow in distress needs immediate attention. Your report can save a life.
          </p>
          <Link to="/report" className="cta-button">🐄 Report Cow Now</Link>
        </div>
      </section>
    </div>
  );
}

export default Home;