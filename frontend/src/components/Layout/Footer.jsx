import { Heart, Phone, Mail, MapPin } from 'lucide-react';
import { useConfig } from '../../context/ConfigContext';
import './Footer.css';

function Footer() {
  const { config } = useConfig();
  const emergencyNumber = config.emergency_number;
  const emergencyLabel = config.emergency_label;

  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-grid">
          <div>
            <div className="footer-brand">
              <div className="footer-brand-icon"><Heart size={20} /></div>
              <span className="footer-brand-name">Cow Rescue</span>
            </div>
            <p className="footer-description">
              Connecting People, Services and Compassion for a Better Tomorrow.
            </p>
          </div>

          <div>
            <h3 className="footer-heading">🚨 Emergency</h3>
            <div className="footer-list">
              <div className="footer-item">
                <Phone size={16} className="footer-item-icon" />
                <div>
                  <div className="footer-item-title">{emergencyNumber}</div>
                  <div className="footer-item-sub">{emergencyLabel}</div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="footer-heading">📬 Contact</h3>
            <div className="footer-list">
              <div className="footer-item">
                <Mail size={16} className="footer-item-icon" />
                <span>help@cowrescue.in</span>
              </div>
              <div className="footer-item">
                <MapPin size={16} className="footer-item-icon" />
                <span>India</span>
              </div>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          © {new Date().getFullYear()} Cow Rescue Platform. Made with ❤️ for cows.
        </div>
      </div>
    </footer>
  );
}

export default Footer;