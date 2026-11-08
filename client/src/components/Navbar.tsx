import React from 'react';
import { BookOpen, Dumbbell, RefreshCw } from 'lucide-react';
import { HealthCheckResult } from '../services/api';
import { API_BASE } from '../api/authFetch';

interface NavbarProps {
  health: HealthCheckResult;
  onRefreshHealth: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ health, onRefreshHealth }) => {
  const swaggerDocsUrl = API_BASE.startsWith('http')
    ? `${API_BASE.replace(/\/api\/?$/, '')}/api-docs`
    : 'https://twelvo-fit-webapp.onrender.com/api-docs';
  return (
    <nav className="glass-panel navbar" id="main-navbar">
      <div className="brand-section">
        <div className="brand-icon-wrapper">
          <Dumbbell size={24} />
        </div>
        <div className="brand-titles">
          <h1>
            PULSE <span className="brand-badge">Gym ERP</span>
          </h1>
          <span className="brand-subtitle">Enterprise Operations & Member Control</span>
        </div>
      </div>

      <div className="nav-actions">
        {/* Live Backend Connection Indicator */}
        <div
          className={`backend-status-badge ${health.online ? 'online' : 'offline'}`}
          title={health.online ? `Connected to ${health.data?.framework || 'Express'} (Node ${health.data?.nodeVersion})` : health.error}
          id="backend-health-status"
        >
          <div className={`status-dot ${health.online ? 'online' : 'offline'}`} />
          <span>
            {health.online ? (
              <>
                Backend: <strong>{health.data?.framework?.toUpperCase() || 'EXPRESS'}</strong>
                <span className="latency-text"> ({health.latencyMs}ms)</span>
              </>
            ) : (
              'Backend Offline'
            )}
          </span>
          <button
            onClick={onRefreshHealth}
            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', display: 'flex', marginLeft: '4px' }}
            title="Refresh connection status"
            id="refresh-health-btn"
          >
            <RefreshCw size={13} />
          </button>
        </div>

        {/* Swagger Docs Link */}
        <a
          href={swaggerDocsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="swagger-btn"
          id="swagger-docs-link"
          title="Open interactive Swagger API Docs"
        >
          <BookOpen size={16} />
          <span>Swagger Docs</span>
        </a>
      </div>
    </nav>
  );
};
