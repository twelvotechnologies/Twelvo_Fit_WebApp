import React, { useState } from 'react';
import { X, UserPlus, AlertCircle } from 'lucide-react';
import { CreateMemberDTO } from '../types';

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateMemberDTO) => Promise<void>;
}

export const AddMemberModal: React.FC<AddMemberModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [membershipPlan, setMembershipPlan] = useState('Monthly Standard');
  const [validityDays, setValidityDays] = useState('30');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) {
      setError('Full Name and Email are required.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const days = parseInt(validityDays, 10);
      const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

      await onSubmit({
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        membershipPlan,
        status,
        expiresAt,
      });

      // Reset form
      setFullName('');
      setEmail('');
      setPhone('');
      setMembershipPlan('Monthly Standard');
      setValidityDays('30');
      setStatus('ACTIVE');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to register member');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} id="add-member-modal-overlay">
      <div
        className="modal-content animate-fade-in"
        onClick={(e) => e.stopPropagation()}
        id="add-member-modal"
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'rgba(16, 185, 129, 0.15)',
                color: 'var(--accent-emerald)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <UserPlus size={18} />
            </div>
            <h3>Register New Member</h3>
          </div>
          <button className="modal-close-btn" onClick={onClose} id="modal-close-btn">
            <X size={20} />
          </button>
        </div>

        {error && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 14px',
              borderRadius: '8px',
              background: 'rgba(244, 63, 94, 0.15)',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              color: '#fb7185',
              fontSize: '0.84rem',
              marginBottom: '16px',
            }}
          >
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} id="add-member-form">
          <div className="form-group">
            <label htmlFor="member-fullname">Full Name *</label>
            <input
              type="text"
              id="member-fullname"
              className="form-input"
              placeholder="e.g. Paul Saji"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="member-email">Email Address *</label>
            <input
              type="email"
              id="member-email"
              className="form-input"
              placeholder="e.g. paul.saji@twelvogym.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="member-phone">Phone Number</label>
            <input
              type="tel"
              id="member-phone"
              className="form-input"
              placeholder="e.g. +91 9876543210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="member-plan">Membership Plan</label>
              <select
                id="member-plan"
                className="form-input"
                value={membershipPlan}
                onChange={(e) => setMembershipPlan(e.target.value)}
              >
                <option value="Monthly Standard">Monthly Standard</option>
                <option value="Gold Annual">Gold Annual</option>
                <option value="Platinum VIP">Platinum VIP</option>
                <option value="Student Pass">Student Pass</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="member-duration">Pass Validity</label>
              <select
                id="member-duration"
                className="form-input"
                value={validityDays}
                onChange={(e) => setValidityDays(e.target.value)}
              >
                <option value="30">30 Days</option>
                <option value="90">90 Days (Quarterly)</option>
                <option value="180">180 Days (Bi-Annual)</option>
                <option value="365">365 Days (Annual)</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="member-status">Initial Status</label>
            <select
              id="member-status"
              className="form-input"
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting}
              id="submit-member-btn"
            >
              {isSubmitting ? 'Registering...' : 'Complete Registration'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
