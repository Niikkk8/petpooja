'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, useInView } from 'framer-motion';

const StatisticsCounter = ({ value, label, suffix = '', color = 'red' }) => {
  const [count, setCount] = useState(0);
  const countRef = useRef(null);
  const isInView = useInView(countRef, { once: true, margin: "-100px" });
  
  // Animate the counter when in view
  useEffect(() => {
    if (!isInView) return;
    
    let startValue = 0;
    const endValue = value;
    const duration = 2000; // 2 seconds
    
    // Calculate the increment value based on whether the end value is an integer or float
    const isFloat = !Number.isInteger(endValue);
    const increment = isFloat ? endValue / (duration / 20) : Math.ceil(endValue / (duration / 20));
    const stepTime = duration / (endValue / increment);
    
    let timer;
    
    const updateCount = () => {
      startValue += increment;
      
      // Ensure we don't exceed the target value
      if (startValue >= endValue) {
        setCount(endValue);
        clearInterval(timer);
        return;
      }
      
      // Format number for display (handle decimals for float values)
      setCount(isFloat ? parseFloat(startValue.toFixed(1)) : Math.floor(startValue));
    };
    
    timer = setInterval(updateCount, stepTime);
    
    return () => clearInterval(timer);
  }, [isInView, value]);
  
  return (
    <motion.div
      ref={countRef}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      transition={{ duration: 0.6 }}
      className="text-center p-6"
    >
      <div className="mb-2">
        <motion.div
          initial={{ scale: 0 }}
          animate={isInView ? { scale: 1 } : { scale: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 10, delay: 0.3 }}
          className={`w-16 h-16 rounded-full bg-${color}-100 mx-auto flex items-center justify-center`}
        >
          <svg 
            className={`w-8 h-8 text-${color}-600`} 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
            <line x1="9" y1="9" x2="9.01" y2="9"></line>
            <line x1="15" y1="9" x2="15.01" y2="9"></line>
          </svg>
        </motion.div>
      </div>
      <motion.h3 
        className={`text-4xl font-bold mb-1 text-${color}-600`}
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.6, delay: 0.5 }}
      >
        {count}{suffix}
      </motion.h3>
      <motion.p 
        className="text-gray-600"
        initial={{ opacity: 0 }}
        animate={isInView ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.6, delay: 0.6 }}
      >
        {label}
      </motion.p>
    </motion.div>
  );
};

export default StatisticsCounter;