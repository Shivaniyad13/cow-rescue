import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { MapPin, Loader2, AlertCircle } from 'lucide-react';
import { reportCow } from '../services/api';
import { useConfig } from '../context/ConfigContext';
import './ReportCow.css';

function ReportCow() {
  const navigate = useNavigate();
  const { config } = useConfig();
  const emergencyNumber = config.emergency_number;
  const emergencyTel = `tel:${emergencyNumber}`;

  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [caseCreated, setCaseCreated] = useState(null);
  const [locationDetected, setLocationDetected] = useState(false);
  const [manualMode, setManualMode] = useState(false);

  const [form, setForm] = useState({
    reporter_name: '',
    reporter_phone: '',
    reporter_email: '',
    animal_condition: '',
    description: '',
    severity: 'MEDIUM',
    latitude: '',
    longitude: '',
    address: '',
    city: '',
  });

  const detectLocation = () => {
    if (!('geolocation' in navigator)) {
      toast.error('Geolocation not supported. Please enter manually.');
      setManualMode(true);
      return;
    }

    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setForm((prev) => ({
          ...prev,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }));
        setLocationDetected(true);
        setLocationLoading(false);
        setManualMode(false);
        toast.success('Location detected!');
      },
      (error) => {
        console.warn('Geolocation failed:', error);
        setLocationLoading(false);
        toast.error('Could not detect location. Please enter manually.');
        setManualMode(true);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  useEffect(() => { detectLocation(); }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.reporter_phone || form.reporter_phone.length < 10) {
      toast.error('Please enter a valid 10-digit phone number');
      return;
    }
    if (!form.animal_condition && !form.description) {
      toast.error("Please describe the cow's condition");
      return;
    }
    if (!form.latitude || !form.longitude) {
      toast.error('Please provide location');
      return;
    }

    const lat = Number(form.latitude);
    const lng = Number(form.longitude);

    setLoading(true);
    try {
      const response = await reportCow({ ...form, latitude: lat, longitude: lng });
      setCaseCreated(response.data);
      toast.success('Case reported successfully!');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to report.';
      toast.error(message);
      if (error.response?.data?.details) {
        error.response.data.details.forEach((d) => toast.error(d));
      }
    } finally {
      setLoading(false);
    }
  };

  if (caseCreated) {
    return (
      <div className="success-container">
        <div className="success-card">
          <div className="text-center">
            <div className="success-icon">✅</div>
            <h1 className="success-title">Report Successful!</h1>
            <p className="success-subtitle">Help is on the way.</p>
          </div>

          <div className="case-id-box">
            <div className="case-id-label">Your Case ID</div>
            <div className="case-id-value">{caseCreated.case_id}</div>
            <div className="case-id-sms">📱 SMS sent to {form.reporter_phone}</div>
          </div>

          <div className="urgent-action-box">
            <AlertCircle size={24} className="urgent-icon" />
            <div>
              <div className="urgent-title">🚨 Immediate Action Required</div>
              <p className="urgent-text">
                Please call <strong>{emergencyNumber}</strong> immediately.
              </p>
              <a href={emergencyTel} className="urgent-button">
                📞 Call {emergencyNumber} Now
              </a>
            </div>
          </div>

          <div className="success-actions">
            <button onClick={() => navigate(`/track/${caseCreated.case_id}`)} className="btn btn-primary">
              Track Case
            </button>
            <button onClick={() => window.location.reload()} className="btn btn-outline">
              Report Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="report-page">
      <div className="report-header">
        <h1 className="report-title">🐄 Report an Injured Cow</h1>
        <p className="report-subtitle">Fill this form. No login required.</p>
      </div>

      <form onSubmit={handleSubmit} className="report-form">
        <div className="report-section">
          <h2 className="report-section-title">👤 Your Information</h2>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Your Name <span className="optional">(optional)</span></label>
              <input type="text" name="reporter_name" value={form.reporter_name} onChange={handleChange} placeholder="e.g. Ramesh Kumar" className="form-input" />
            </div>
            <div className="form-group">
              <label className="form-label">Phone Number <span className="required">*</span></label>
              <input type="tel" name="reporter_phone" value={form.reporter_phone} onChange={handleChange} placeholder="10-digit" pattern="[0-9]{10}" maxLength="10" required className="form-input" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Email <span className="optional">(optional)</span></label>
            <input type="email" name="reporter_email" value={form.reporter_email} onChange={handleChange} placeholder="your@email.com" className="form-input" />
          </div>
        </div>

        <div className="report-section">
          <h2 className="report-section-title">🐄 Cow's Condition</h2>
          <div className="form-group">
            <label className="form-label">Condition <span className="required">*</span></label>
            <input type="text" name="animal_condition" value={form.animal_condition} onChange={handleChange} placeholder="e.g. Injured leg" className="form-input" />
          </div>
          <div className="form-group">
            <label className="form-label">Description <span className="optional">(optional)</span></label>
            <textarea name="description" value={form.description} onChange={handleChange} placeholder="Additional details..." rows={3} className="form-textarea" />
          </div>
          <div className="form-group">
            <label className="form-label">Severity</label>
            <div className="severity-grid">
              {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((s) => {
                const isActive = form.severity === s;
                const isDanger = s === 'CRITICAL' || s === 'HIGH';
                return (
                  <button type="button" key={s} onClick={() => setForm((p) => ({ ...p, severity: s }))} className={`severity-btn ${isActive ? (isDanger ? 'active-danger' : 'active-primary') : ''}`}>
                    {s}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="report-section">
          <h2 className="report-section-title">📍 Location</h2>
          <div className={`location-box ${locationDetected ? 'location-box-detected' : 'location-box-warning'}`}>
            {locationLoading ? (
              <><Loader2 size={20} className="location-icon-detected" style={{ animation: 'spin 1s linear infinite' }} /><span>Detecting...</span></>
            ) : locationDetected ? (
              <><MapPin size={20} className="location-icon-detected" /><div><div className="location-title location-title-detected">✅ Location detected</div><div className="location-coords">{Number(form.latitude).toFixed(4)}, {Number(form.longitude).toFixed(4)}</div></div></>
            ) : (
              <><AlertCircle size={20} className="location-icon-warning" /><div>Location not detected.</div></>
            )}
          </div>

          {!locationDetected && !locationLoading && (
            <button type="button" onClick={detectLocation} className="btn btn-outline" style={{ width: '100%', marginTop: 12 }}>🔄 Retry</button>
          )}

          <div style={{ marginTop: 20 }}>
            <button type="button" onClick={() => setManualMode(!manualMode)} style={{ background: 'none', border: 'none', color: 'var(--primary-600)', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}>
              {manualMode ? '✕ Hide manual input' : '📍 Enter manually'}
            </button>
          </div>

          {manualMode && (
            <div style={{ marginTop: 16, padding: 16, background: '#f9fafb', borderRadius: 8 }}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Latitude</label>
                  <input type="number" step="any" name="latitude" value={form.latitude} onChange={handleChange} placeholder="26.8467" className="form-input" />
                </div>
                <div className="form-group">
                  <label className="form-label">Longitude</label>
                  <input type="number" step="any" name="longitude" value={form.longitude} onChange={handleChange} placeholder="80.9462" className="form-input" />
                </div>
              </div>
            </div>
          )}
        </div>

        <button type="submit" disabled={loading || locationLoading} className="btn btn-primary report-submit">
          {loading ? <><Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> Reporting...</> : <>🚨 Report Cow Now</>}
        </button>
      </form>
    </div>
  );
}

export default ReportCow;