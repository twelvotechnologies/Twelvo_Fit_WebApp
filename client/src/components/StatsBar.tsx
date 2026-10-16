import React from 'react';
import { Users, UserCheck, Clock, DollarSign } from 'lucide-react';
import { IMember } from '../types';

interface StatsBarProps {
  members: IMember[];
}

export const StatsBar: React.FC<StatsBarProps> = ({ members }) => {
  const total = members.length;
  const active = members.filter((m) => m.status === 'ACTIVE').length;
  const expiredOrSuspended = members.filter(
    (m) => m.status === 'EXPIRED' || m.status === 'SUSPENDED' || m.status === 'INACTIVE'
  ).length;

  // Estimated Monthly Recurring Revenue based on plan values
  const revenue = members.reduce((acc, m) => {
    if (m.status !== 'ACTIVE') return acc;
    if (m.membershipPlan.toLowerCase().includes('annual') || m.membershipPlan.toLowerCase().includes('gold') || m.membershipPlan.toLowerCase().includes('platinum')) {
      return acc + 120;
    }
    return acc + 50;
  }, 0);

  return (
    <div className="stats-grid" id="stats-overview">
      <div className="glass-panel stat-card" style={{ '--stat-accent': 'var(--accent-emerald)' } as any}>
        <div className="stat-info">
          <span className="stat-label">Total Members</span>
          <span className="stat-value">{total}</span>
          <span className="stat-sub">Registered in Prisma DB</span>
        </div>
        <div className="stat-icon">
          <Users size={24} />
        </div>
      </div>

      <div className="glass-panel stat-card" style={{ '--stat-accent': 'var(--accent-cyan)' } as any}>
        <div className="stat-info">
          <span className="stat-label">Active Passes</span>
          <span className="stat-value">{active}</span>
          <span className="stat-sub">{total > 0 ? `${Math.round((active / total) * 100)}% retention rate` : 'No members'}</span>
        </div>
        <div className="stat-icon">
          <UserCheck size={24} />
        </div>
      </div>

      <div className="glass-panel stat-card" style={{ '--stat-accent': 'var(--accent-amber)' } as any}>
        <div className="stat-info">
          <span className="stat-label">Attention Needed</span>
          <span className="stat-value">{expiredOrSuspended}</span>
          <span className="stat-sub">Expired or suspended</span>
        </div>
        <div className="stat-icon">
          <Clock size={24} />
        </div>
      </div>

      <div className="glass-panel stat-card" style={{ '--stat-accent': 'var(--accent-purple)' } as any}>
        <div className="stat-info">
          <span className="stat-label">Est. Monthly MRR</span>
          <span className="stat-value">${revenue.toLocaleString()}</span>
          <span className="stat-sub">From active subscriptions</span>
        </div>
        <div className="stat-icon">
          <DollarSign size={24} />
        </div>
      </div>
    </div>
  );
};
