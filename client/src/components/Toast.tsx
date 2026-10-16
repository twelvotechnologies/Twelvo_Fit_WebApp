import React from 'react';
import { CheckCircle, AlertCircle } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error';
  text: string;
}

interface ToastProps {
  toasts: ToastMessage[];
}

export const Toast: React.FC<ToastProps> = ({ toasts }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="toast-container" id="toast-alerts-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.type}`}>
          {t.type === 'success' ? (
            <CheckCircle size={18} style={{ color: 'var(--accent-emerald)', flexShrink: 0 }} />
          ) : (
            <AlertCircle size={18} style={{ color: 'var(--accent-rose)', flexShrink: 0 }} />
          )}
          <span>{t.text}</span>
        </div>
      ))}
    </div>
  );
};
