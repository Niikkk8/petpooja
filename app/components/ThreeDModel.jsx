'use client';

import { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';

// Create a simpler, more stylized 3D-looking element with CSS
// This avoids the complexity and potential issues with Three.js
const ThreeDModel = ({ currentTheme = 'red' }) => {
  const containerRef = useRef(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isLoaded, setIsLoaded] = useState(false);

  // Handle loading
  useEffect(() => {
    setIsLoaded(true);
  }, []);

  // Handle mouse movement for interactive rotation
  // Handle mouse movement for interactive rotation - with refined sensitivity
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!containerRef.current) return;

      const { clientX, clientY } = e;
      const { left, top, width, height } = containerRef.current.getBoundingClientRect();

      // Calculate mouse position relative to container center (values between -1 and 1)
      const x = ((clientX - left) / width - 0.5) * 2;
      const y = ((clientY - top) / height - 0.5) * 2;

      // Apply smoothing by moving only partially toward the target position
      setPosition(prev => ({
        x: prev.x + (x - prev.x) * 0.1,
        y: prev.y + (y - prev.y) * 0.1
      }));
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const calculateRotation = () => {
    // Increased rotation for main dashboard
    const maxRotation = 8; // degrees - higher value for more noticeable rotation
    const xRotation = Math.max(-maxRotation, Math.min(maxRotation, position.x * 10));
    const yRotation = Math.max(-maxRotation, Math.min(maxRotation, -position.y * 10));

    return {
      transform: `rotateY(${xRotation}deg) rotateX(${yRotation}deg)`
    };
  };

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: isLoaded ? 1 : 0 }}
      transition={{ duration: 1 }}
      className="w-full h-full flex items-center justify-center perspective-1000"
    >
      <div className="relative w-full max-w-md h-full max-h-96 preserve-3d" style={calculateRotation()}>
        {/* Main dashboard screen */}
        <div
          className="absolute inset-0 rounded-xl shadow-2xl bg-white overflow-hidden border-4"
          style={{
            borderColor: 'var(--color-light)',
            transformStyle: 'preserve-3d',
            transform: 'translateZ(20px)'
          }}
        >
          {/* App header */}
          <div
            className="h-16 flex items-center px-6 border-b"
            style={{ backgroundColor: 'var(--color-primary)', borderColor: 'var(--color-light)' }}
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center">
                <span style={{ color: 'var(--color-primary)', fontWeight: 'bold' }}>P</span>
              </div>
              <span className="text-white font-bold text-lg">Pet Pooja</span>
            </div>
          </div>

          {/* Dashboard content */}
          <div className="p-6">
            <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--color-primary)' }}>
              Kitchen Dashboard
            </h2>

            {/* Stats cards - with minimal animation */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              {['Inventory', 'Waste', 'Sales', 'Profits'].map((stat, index) => (
                <div
                  key={stat}
                  className="p-3 rounded-lg"
                  style={{
                    backgroundColor: 'var(--color-extra-light)',
                    borderLeft: `4px solid var(--color-${index % 2 === 0 ? 'primary' : 'secondary'})`,
                    transform: `translateZ(${5 + index * 2}px)` // Reduced depth variation
                  }}
                >
                  <div className="text-gray-600 text-xs">{stat}</div>
                  <div className="font-bold" style={{ color: 'var(--color-primary)' }}>
                    {Math.floor(Math.random() * 90) + 10}%
                  </div>
                </div>
              ))}
            </div>

            {/* Chart placeholder - with reduced animation */}
            <div
              className="h-32 rounded-lg mb-6 relative overflow-hidden"
              style={{
                backgroundColor: 'var(--color-extra-light)',
                transform: 'translateZ(10px)' // Reduced depth
              }}
            >
              {/* Fake chart bars with fixed heights */}
              <div className="absolute inset-0 flex items-end p-4">
                {[45, 60, 75, 50, 65, 55, 70].map((height, i) => (
                  <div
                    key={i}
                    className="w-1/7 mx-1 rounded-t"
                    style={{
                      height: `${height}%`, // Fixed heights instead of random
                      backgroundColor: i % 2 === 0 ? 'var(--color-primary)' : 'var(--color-secondary)',
                      opacity: 0.7 + (i / 10)
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Inventory items */}
            <div
              className="space-y-2"
              style={{ transform: 'translateZ(15px)' }}
            >
              {['Tomatoes', 'Cheese', 'Flour', 'Olive Oil'].map((item, i) => (
                <div
                  key={item}
                  className="flex justify-between items-center p-2 rounded"
                  style={{ backgroundColor: i % 2 === 0 ? 'var(--color-extra-light)' : 'white' }}
                >
                  <span>{item}</span>
                  <div
                    className="w-24 h-2 rounded-full"
                    style={{
                      backgroundColor: 'var(--color-light)',
                      boxShadow: 'inset 0 0 5px rgba(0,0,0,0.1)'
                    }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${70 - (i * 15)}%`,
                        backgroundColor: 'var(--color-primary)'
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Floating elements to add 3D effect */}
        {/* Floating elements to add 3D effect - with reduced movement */}
        {['pizza', 'plate', 'utensils', 'analytics'].map((item, i) => {
          // Much smaller offsets for floating elements
          const randomX = (Math.random() - 0.5) * 40;
          const randomY = (Math.random() - 0.5) * 40;
          const randomZ = 20 + (Math.random() * 30); // Less depth variation

          return (
            <div
              key={item}
              className="absolute w-16 h-16 rounded-lg flex items-center justify-center"
              style={{
                backgroundColor: 'var(--color-primary)',
                opacity: 0.8,
                transform: `translate3d(${randomX}px, ${randomY}px, ${randomZ}px)`,
                boxShadow: '0 10px 20px rgba(0,0,0,0.1)',
                // Fixed position relative to main dashboard movement
                transformStyle: 'preserve-3d',
                transition: 'transform 0.5s ease-out'
              }}
            >
              <div className="text-white text-xs font-bold">{item}</div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};

export default ThreeDModel;