import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AlertCircle, Loader2, Phone, Building2, HandHeart, CheckCircle } from 'lucide-react';
import api, { trackCase, getCaseTimeline } from '../services/api';
import './CaseDetails.css';

function CaseDetails() {
  const { caseId } = useParams();
  const [caseData, setCaseData] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reporting, setReporting] = useState(false);
  const [minutesElapsed, setMinutesElapsed] = useState(0);

  useEffect(() => {
    loadCase();
  }, [caseId]);

  useEffect(() => {
    if (!caseData) return;
    const interval = setInterval(() => {
      const govEvent = timeline.find((e) =>
        e.event === 'STATUS_GOVERNMENT_CONTACTED' ||
        e.event === 'GOVERNMENT_CONTACT_REQUIRED'
      );
      if (govEvent) {
        const elapsed = Math.floor(
          (Date.now() - new Date(govEvent.created_at).getTime()) / 60000
        );
        setMinutesElapsed(elapsed);
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [caseData, timeline]);

  const loadCase = async () => {
    setLoading(true);
    try {
      const [caseRes, timelineRes] = await Promise.all([
        trackCase(caseId),
        getCaseTimeline(caseId),
      ]);
      setCaseData(caseRes.data);
      setTimeline(timelineRes.timeline || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Case not found');
    } finally {
      setLoading(false);
    }
  };

  const handleCalled1962 = async () => {
    if (!window.confirm('Kya aapne abhi 1962 ko call kiya?')) return;
    setReporting(true);
    try {
      await api.post(`/cases/${caseId}/user-action/called-1962`);
      toast.success('1962 call logged!');
      await loadCase();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setReporting(false);
    }
  };

  const handleNoResponse = async () => {
    if (!window.confirm(
      'Kya 1962 ne 15 minute mein respond nahi kiya? Nearest NGO ko alert jaayega.'
    )) return;
    setReporting(true);
    try {
      const res = await api.post(`/cases/${caseId}/user-action/no-response`);
      toast.success(res.data.message || 'Reported! NGO ko alert bheja gaya');
      await loadCase();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setReporting(false);
    }
  };

  const getStatusClass = (status) => {
    if (!status) return 'status-default';
    if (status.includes('GOVERNMENT')) return 'status-government';
    if (status.includes('PARTNER_ACCEPTED')) return 'status-accepted';
    if (status === 'COMPLETED') return 'status-completed';
    if (status === 'REPORTED') return 'status-reported';
    if (status.includes('PARTNER')) return 'status-partner';
    return 'status-default';
  };

  // Determine where the case is RIGHT NOW
  const getRoutingInfo = () => {
    if (!caseData) return null;
    const s = caseData.status;
    const gov = caseData.government_route_status;

    if (gov === 'NO_RESPONSE' || s.includes('PARTNER') || s.includes('ESCALATED')) {
      return {
        icon: HandHeart,
        label: 'NGO Route',
        detail: caseData.assigned_ngo_id
          ? `NGO ID ${caseData.assigned_ngo_id} notified`
          : 'Escalating to nearest NGO',
        color: 'ngo',
      };
    }
    if (gov === 'RESPONSE_RECEIVED' || gov === 'HANDLED' || s === 'GOVERNMENT_HANDLING') {
      return {
        icon: Building2,
        label: 'Government 1962',
        detail: 'Ambulance dispatched',
        color: 'gov',
      };
    }
    if (gov === 'CONTACT_REQUIRED' || s === 'GOVERNMENT_CONTACTED') {
      return {
        icon: Building2,
        label: 'Government 1962',
        detail: 'Waiting for ambulance response',
        color: 'gov',
      };
    }
    return {
      icon: AlertCircle,
      label: 'Not Routed Yet',
      detail: 'Please call 1962 to start',
      color: 'pending',
    };
  };

  if (loading) return <div className="case-loading">Loading case details...</div>;

  if (error) {
    return (
      <div className="case-loading">
        <h2>❌ {error}</h2>
        <Link to="/track" className="btn btn-primary" style={{ marginTop: 20, display: 'inline-block' }}>
          Try Another Case ID
        </Link>
      </div>
    );
  }

  const routing = getRoutingInfo();
  const RoutingIcon = routing.icon;

  // Button visibility logic
  const showCall1962 = caseData.status === 'REPORTED';
  const showNoResponse = ['GOVERNMENT_CONTACTED', 'WAITING_FOR_GOVERNMENT_RESPONSE'].includes(caseData.status);
  const showNGOAccepted = caseData.status === 'PARTNER_ACCEPTED';

  return (
    <div className="case-page">
      <div className="case-header">
        <div className="case-id-display">Case ID: {caseData.case_id}</div>
        <div className={`case-status-badge ${getStatusClass(caseData.status)}`}>
          {caseData.status?.replace(/_/g, ' ')}
        </div>
        <h1 className="case-title">
          {caseData.animal_type || 'Cow'} — {caseData.animal_condition || 'Rescue Case'}
        </h1>
        <p className="case-subtitle">{caseData.description}</p>
      </div>

      {/* ⬇️ ROUTING STATUS BOX — Ye dikhata hai case kaha gaya */}
      <div className={`routing-box routing-${routing.color}`}>
        <div className="routing-icon">
          <RoutingIcon size={28} />
        </div>
        <div className="routing-content">
          <div className="routing-label">Currently with</div>
          <div className="routing-title">{routing.label}</div>
          <div className="routing-detail">{routing.detail}</div>
        </div>
      </div>

      {/* ⬇️ ACTION BOX */}
      {(showCall1962 || showNoResponse || showNGOAccepted) && (
        <div className="action-box action-box-urgent">
          <div className="action-box-header">
            <AlertCircle size={22} className="action-box-icon" />
            <div>
              <div className="action-box-title">🚨 Action Required</div>
              <div className="action-box-desc">
                {showCall1962 && (
                  <>Please call <strong>1962</strong> immediately. Ambulance is FREE and 24x7.</>
                )}
                {showNoResponse && (
                  <>
                    Aapne 1962 ko call kiya tha. {minutesElapsed > 0 && <><strong>{minutesElapsed} minute</strong> ho gaye.</>}
                    {' '}Agar ambulance nahi aayi, toh neeche button dabao.
                  </>
                )}
                {showNGOAccepted && (
                  <>NGO ne case accept kar liya hai. Rescue in progress.</>
                )}
              </div>
            </div>
          </div>

          <div className="action-buttons">
            {showCall1962 && (
              <>
                <a href="tel:1962" className="action-btn action-btn-danger">
                  <Phone size={18} /> Call 1962 Now
                </a>
                <button
                  onClick={handleCalled1962}
                  disabled={reporting}
                  className="action-btn action-btn-primary"
                >
                  {reporting ? <Loader2 size={18} className="spin" /> : <CheckCircle size={18} />}
                  I Called 1962
                </button>
              </>
            )}

            {showNoResponse && (
              <>
                <a href="tel:1962" className="action-btn action-btn-danger">
                  <Phone size={18} /> Call Again
                </a>
                <button
                  onClick={handleNoResponse}
                  disabled={reporting}
                  className="action-btn action-btn-warning"
                >
                  {reporting ? (
                    <><Loader2 size={18} className="spin" /> Sending...</>
                  ) : (
                    <>⏰ 1962 Did Not Respond</>
                  )}
                </button>
              </>
            )}

            {showNGOAccepted && (
              <div className="action-success">
                <CheckCircle size={20} /> NGO is on the way to rescue
              </div>
            )}
          </div>

          {showCall1962 && (
            <p className="action-hint">
              💡 1962 ko call karne ke baad <strong>"I Called 1962"</strong> button dabao.
            </p>
          )}
        </div>
      )}

      {/* Location */}
      <div className="case-section">
        <h2 className="case-section-title">📍 Location</h2>
        <div className="case-info-grid">
          <div className="case-info-item">
            <div className="case-info-label">City</div>
            <div className="case-info-value">{caseData.location?.city || 'N/A'}</div>
          </div>
          <div className="case-info-item">
            <div className="case-info-label">District</div>
            <div className="case-info-value">{caseData.location?.district || 'N/A'}</div>
          </div>
          <div className="case-info-item">
            <div className="case-info-label">State</div>
            <div className="case-info-value">{caseData.location?.state || 'N/A'}</div>
          </div>
          <div className="case-info-item">
            <div className="case-info-label">Severity</div>
            <div className="case-info-value">{caseData.severity || 'MEDIUM'}</div>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="case-section">
        <h2 className="case-section-title">📅 Timeline</h2>
        {timeline.length === 0 ? (
          <p style={{ color: 'var(--gray-500)' }}>No events yet.</p>
        ) : (
          <div className="timeline">
            {timeline.map((event, i) => (
              <div key={i} className="timeline-item">
                <div className="timeline-dot">●</div>
                <div className="timeline-content">
                  <div className="timeline-event">{event.event?.replace(/_/g, ' ')}</div>
                  <div className="timeline-desc">{event.description}</div>
                  <div className="timeline-time">
                    {new Date(event.created_at).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default CaseDetails;