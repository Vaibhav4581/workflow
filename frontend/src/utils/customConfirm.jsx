import React from 'react';
import { createRoot } from 'react-dom/client';

export const customConfirm = (message) => {
  return new Promise((resolve) => {
    // Create a temporary container
    const container = document.createElement('div');
    document.body.appendChild(container);
    
    // Create a root to render the React component
    const root = createRoot(container);
    
    const cleanup = () => {
      // Small timeout to allow exit animations if we had any
      setTimeout(() => {
        root.unmount();
        if (container.parentNode) {
          container.parentNode.removeChild(container);
        }
      }, 10);
    };

    const handleConfirm = () => {
      resolve(true);
      cleanup();
    };

    const handleCancel = () => {
      resolve(false);
      cleanup();
    };

    // Render the custom centered modal
    root.render(
      <div className="theme-modal-overlay" style={{ zIndex: 99999 }}>
        <div className="theme-modal" style={{ maxWidth: '400px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '22px', marginBottom: '16px', color: 'var(--text-primary, #1e293b)' }}>Confirm Action</h2>
          <p style={{ color: 'var(--text-secondary, #64748b)', marginBottom: '32px', fontSize: '16px', lineHeight: '1.5' }}>
            {message}
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button 
              style={{ 
                background: '#6b7280', 
                color: 'white', 
                flex: 1, 
                padding: '12px',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '15px',
                transition: 'background 0.2s'
              }}
              onMouseOver={e => e.target.style.background = '#4b5563'}
              onMouseOut={e => e.target.style.background = '#6b7280'}
              onClick={handleCancel}
            >
              Cancel
            </button>
            <button 
              style={{ 
                background: '#4f46e5', 
                color: 'white', 
                flex: 1, 
                padding: '12px',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '15px',
                transition: 'background 0.2s'
              }}
              onMouseOver={e => e.target.style.background = '#4338ca'}
              onMouseOut={e => e.target.style.background = '#4f46e5'}
              onClick={handleConfirm}
            >
              Confirm
            </button>
          </div>
        </div>
      </div>
    );
  });
};
