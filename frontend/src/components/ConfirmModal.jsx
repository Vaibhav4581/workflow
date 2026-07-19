import React from 'react';

export default function ConfirmModal({ isOpen, message, onConfirm, onCancel, confirmText = "OK", cancelText = "Cancel" }) {
  if (!isOpen) return null;
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 99999,
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      backdropFilter: 'blur(3px)'
    }}>
      <div style={{
        background: 'var(--card-bg, #ffffff)',
        padding: '24px', borderRadius: '12px',
        maxWidth: '400px', width: '90%',
        boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
        color: 'var(--text-color, #333333)'
      }}>
        <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '1.2rem', color: 'var(--text-color, #1f2937)' }}>
          Confirm Action
        </h3>
        <p style={{ marginBottom: '24px', fontSize: '0.95rem', color: 'var(--text-color, #4b5563)' }}>
          {message}
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button onClick={onCancel} style={{
            padding: '8px 16px', border: '1px solid var(--border-color, #d1d5db)', background: 'transparent',
            borderRadius: '6px', cursor: 'pointer', color: 'var(--text-color, #374151)', fontWeight: '500'
          }}>
            {cancelText}
          </button>
          <button onClick={onConfirm} style={{
            padding: '8px 16px', border: 'none', background: '#3b82f6',
            borderRadius: '6px', cursor: 'pointer', color: '#ffffff', fontWeight: 'bold'
          }}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
