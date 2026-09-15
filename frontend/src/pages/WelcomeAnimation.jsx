import React, { useEffect } from 'react';
import './WelcomeAnimation.css';

const WelcomeAnimation = ({ onComplete }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 2000); // Increased to 2 seconds to show the full animation
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="welcome-overlay">
      <div className="welcome-content">
        <div className="animated-background">
          <div className="gradient-circle circle1"></div>
          <div className="gradient-circle circle2"></div>
          <div className="gradient-circle circle3"></div>
        </div>
        <div className="text-content">
          <h1>Welcome to</h1>
          <h2 className="gradient-text">SNGCE Workflow</h2>
        </div>
      </div>
    </div>
  );
};

export default WelcomeAnimation;
