import React from 'react';
import { Search, Plus, Trash2, ShieldAlert, Phone, Mail } from 'lucide-react';
import { IMember } from '../types';

interface MemberTableProps {
  members: IMember[];
  searchTerm: string;
  onSearchChange: (val: string) => void;
  statusFilter: string;
  onStatusFilterChange: (val: string) => void;
  onOpenAddModal: () => void;
  onDeleteMember: (id: string, name: string) => void;
  isLoading: boolean;
}

export const MemberTable: React.FC<MemberTableProps> = ({
  members,
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  onOpenAddModal,
  onDeleteMember,
  isLoading,
}) => {
  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return iso;
    }
  };

  const getDaysRemaining = (iso: string) => {
    try {
      const diff = new Date(iso).getTime() - Date.now();
      const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
      if (days < 0) return `${Math.abs(days)}d ago`;
      if (days === 0) return 'Today';
      return `in ${days}d`;
    } catch {
      return '';
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '24px' }} id="members-section">
      {/* Controls Bar */}
      <div className="section-header">
        <div className="section-title-group">
          <h2>Member Registry</h2>
          <p>Manage memberships, subscription statuses, and athlete profiles.</p>
        </div>

        <div className="section-controls">
          <div className="search-wrapper">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              id="member-search-input"
            />
          </div>

          <select
            className="filter-select"
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            id="status-filter-select"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="EXPIRED">Expired</option>
            <option value="SUSPENDED">Suspended</option>
          </select>

          <button
            className="btn-primary"
            onClick={onOpenAddModal}
            id="add-member-btn"
          >
            <Plus size={18} />
            <span>Add Member</span>
          </button>
        </div>
      </div>

      {/* Table / List */}
      <div className="table-container">
        {isLoading ? (
          <div className="empty-state">
            <p>Loading members from Prisma database...</p>
          </div>
        ) : members.length === 0 ? (
          <div className="empty-state" id="empty-members-state">
            <ShieldAlert size={42} style={{ color: 'var(--text-muted)' }} />
            <h3>No members found</h3>
            <p>
              {searchTerm || statusFilter !== 'ALL'
                ? 'Try adjusting your search criteria or filter.'
                : 'Get started by adding your first gym member!'}
            </p>
            {!searchTerm && statusFilter === 'ALL' && (
              <button
                className="btn-primary"
                onClick={onOpenAddModal}
                style={{ marginTop: '16px', display: 'inline-flex' }}
              >
                <Plus size={16} /> Register First Member
              </button>
            )}
          </div>
        ) : (
          <table className="members-table" id="members-data-table">
            <thead>
              <tr>
                <th>Athlete / Member</th>
                <th>Contact Info</th>
                <th>Membership Plan</th>
                <th>Status</th>
                <th>Expires</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id} id={`member-row-${member.id}`}>
                  <td>
                    <div className="member-cell">
                      <div className="member-avatar">
                        {member.fullName.charAt(0).toUpperCase()}
                      </div>
                      <div className="member-info">
                        <h4>{member.fullName}</h4>
                        <span>ID: {member.id.slice(0, 8)}...</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.84rem' }}>
                        <Mail size={13} style={{ color: 'var(--text-muted)' }} />
                        {member.email}
                      </span>
                      {member.phone && member.phone !== 'N/A' && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          <Phone size={12} />
                          {member.phone}
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className="plan-badge">{member.membershipPlan}</span>
                  </td>
                  <td>
                    <span className={`status-chip ${member.status}`}>
                      ● {member.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.84rem', fontWeight: 500 }}>
                        {formatDate(member.expiresAt)}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {getDaysRemaining(member.expiresAt)}
                      </span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className="action-btn-danger"
                      onClick={() => onDeleteMember(member.id, member.fullName)}
                      title="Delete Member"
                      id={`delete-member-${member.id}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
