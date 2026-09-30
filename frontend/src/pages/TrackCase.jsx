import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Search } from 'lucide-react';
import './TrackCase.css';

function TrackCase() {
  const navigate = useNavigate();
  const [caseId, setCaseId] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const id = caseId.trim().toUpperCase();
    if (!id) {
      toast.error('Please enter a Case ID');
      return;
    }
    navigate(`/track/${id}`);
  };

  return (
    <div className="track-page">
      <div className="track-header">
        <h1 className="track-title">🔍 Track Your Case</h1>
        <p className="track-subtitle">
          Enter your Case ID to see the current rescue status
        </p>
      </div>

      <form onSubmit={handleSubmit} className="track-form">
        <div className="form-group">
          <label className="form-label">Case ID</label>
          <input
            type="text"
            value={caseId}
            onChange={(e) => setCaseId(e.target.value)}
            placeholder="e.g. CASE-2026-000020"
            className="form-input"
            style={{ fontFamily: 'monospace', textTransform: 'uppercase' }}
          />
        </div>
        <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
          <Search size={18} />
          Track Case
        </button>
      </form>
    </div>
  );
}

export default TrackCase;