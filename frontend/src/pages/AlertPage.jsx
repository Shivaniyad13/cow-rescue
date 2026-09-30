import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { CheckCircle, XCircle } from 'lucide-react';
import { getAlertDetails, acceptAlert, rejectAlert } from '../services/api';
import './AlertPage.css';

function AlertPage() {
  const { token } = useParams();
  const [alert, setAlert] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [responded, setResponded] = useState(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadAlert();
  }, [token]);

  const loadAlert = async () => {
    try {
      const res = await getAlertDetails(token);
      if (res.message && res.message.startsWith('Already responded')) {
        setResponded(res.data.response);
      } else {
        setAlert(res.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Alert not found');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    setProcessing(true);
    try {
      await acceptAlert(token, 'Team dispatched');
      setResponded('ACCEPTED');
      toast.success('Case accepted!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to accept');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    setProcessing(true);
    try {
      await rejectAlert(token, 'Not available');
      setResponded('REJECTED');
      toast.success('Case rejected');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reject');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <div className="case-loading">Loading alert...</div>;
  if (error) return <div className="case-loading"><h2>❌ {error}</h2></div>;

  if (responded) {
    return (
      <div className="alert-page">
        <div className="alert-card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 60, marginBottom: 16 }}>
            {responded === 'ACCEPTED' ? '✅' : '❌'}
          </div>
          <h1 className="alert-title">
            {responded === 'ACCEPTED' ? 'Case Accepted' : 'Case Rejected'}
          </h1>
          <p style={{ color: 'var(--gray-600)', marginTop: 12 }}>
            {responded === 'ACCEPTED'
              ? 'Thank you! Please proceed with the rescue.'
              : 'We will alert the next NGO.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="alert-page">
      <div className="alert-card">
        <div className="alert-header">
          <div className="alert-urgent">🚨 URGENT — ACTION REQUIRED</div>
          <h1 className="alert-title">Cow Rescue Alert</h1>
          <div className="alert-case-id">{alert.case_id}</div>
        </div>

        <div className="alert-details">
          <div className="alert-detail-item">
            <span className="alert-detail-label">NGO</span>
            <span className="alert-detail-value">{alert.ngo_name}</span>
          </div>
          <div className="alert-detail-item">
            <span className="alert-detail-label">Condition</span>
            <span className="alert-detail-value">{alert.animal_condition || 'Injured'}</span>
          </div>
          <div className="alert-detail-item">
            <span className="alert-detail-label">Severity</span>
            <span className="alert-detail-value">{alert.severity}</span>
          </div>
          <div className="alert-detail-item">
            <span className="alert-detail-label">Location</span>
            <span className="alert-detail-value">
              {alert.location?.city}, {alert.location?.district}
            </span>
          </div>
        </div>

        <div className="alert-actions">
          <button
            onClick={handleAccept}
            disabled={processing}
            className="btn btn-primary"
          >
            <CheckCircle size={20} />
            Accept Case
          </button>
          <button
            onClick={handleReject}
            disabled={processing}
            className="btn btn-danger"
          >
            <XCircle size={20} />
            Reject
          </button>
        </div>
      </div>
    </div>
  );
}

export default AlertPage;