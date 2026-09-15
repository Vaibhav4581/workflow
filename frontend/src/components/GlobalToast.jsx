import React, { useState, useEffect } from 'react';

export const showToast = (message, type = 'success') => {
  const event = new CustomEvent('show-toast', { detail: { message, type } });
  window.dispatchEvent(event);
};

export default function GlobalToast() {
  const [toast, setToast] = useState(null);

  useEffect(() => {
    let timer;
    const handleToast = (e) => {
      setToast(e.detail);
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => setToast(null), 3000);
    };
    
    window.addEventListener('show-toast', handleToast);
    return () => {
      window.removeEventListener('show-toast', handleToast);
      if (timer) clearTimeout(timer);
    };
  }, []);

  if (!toast) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 24,
      left: '50%',
      transform: 'translateX(-50%)',
      background: toast.type === 'error' ? '#ef4444' : '#10b981',
      color: 'white',
      padding: '12px 24px',
      borderRadius: '8px',
      boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
      zIndex: 99999,
      fontWeight: '600',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      animation: 'slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      border: '1px solid rgba(255,255,255,0.2)'
    }}>
      <style>
        {`
          @keyframes slideDown {
            from { transform: translate(-50%, -20px); opacity: 0; }
            to { transform: translate(-50%, 0); opacity: 1; }
          }
        `}
      </style>
      <span style={{ fontSize: '1.25rem' }}>{toast.type === 'error' ? '❌' : '✅'}</span>
      {toast.message}
    </div>
  );
}
