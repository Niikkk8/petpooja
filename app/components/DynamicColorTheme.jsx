'use client';

import { createContext, useContext, useEffect } from 'react';

// Create context for the theme
const ThemeContext = createContext({ currentTheme: 'red' });

// Custom hook to use theme anywhere in the app
export const useTheme = () => useContext(ThemeContext);

// Dynamic color theme provider component
const DynamicColorTheme = ({ children, currentTheme = 'red' }) => {
  // Update theme colors when currentTheme changes
  useEffect(() => {
    // Define color mappings for different themes
    const colorMap = {
      red: {
        primary: '#ef4444', // red-600
        primaryRgb: '239, 68, 68',
        secondary: '#dc2626', // red-700
        secondaryRgb: '220, 38, 38',
        light: '#fee2e2', // red-100
        extraLight: '#fef2f2', // red-50
        accent: '#b91c1c' // red-800
      },
      crimson: {
        primary: '#dc2626', // red-700
        primaryRgb: '220, 38, 38',
        secondary: '#b91c1c', // red-800
        secondaryRgb: '185, 28, 28',
        light: '#fecaca', // red-200
        extraLight: '#fee2e2', // red-100
        accent: '#991b1b' // red-900
      },
      maroon: {
        primary: '#b91c1c', // red-800
        primaryRgb: '185, 28, 28',
        secondary: '#991b1b', // red-900
        secondaryRgb: '153, 27, 27',
        light: '#fca5a5', // red-300
        extraLight: '#fecaca', // red-200
        accent: '#ef4444' // red-600
      },
      firebrick: {
        primary: '#991b1b', // red-900
        primaryRgb: '153, 27, 27',
        secondary: '#7f1d1d', // red-950
        secondaryRgb: '127, 29, 29',
        light: '#f87171', // red-400
        extraLight: '#fca5a5', // red-300
        accent: '#dc2626' // red-700
      }
    };
    
    const currentColors = colorMap[currentTheme] || colorMap.red;
    
    // Set CSS variables - use a persistent method
    document.documentElement.style.setProperty('--color-primary', currentColors.primary);
    document.documentElement.style.setProperty('--color-primary-rgb', currentColors.primaryRgb);
    document.documentElement.style.setProperty('--color-secondary', currentColors.secondary);
    document.documentElement.style.setProperty('--color-secondary-rgb', currentColors.secondaryRgb);
    document.documentElement.style.setProperty('--color-light', currentColors.light);
    document.documentElement.style.setProperty('--color-extra-light', currentColors.extraLight);
    document.documentElement.style.setProperty('--color-accent', currentColors.accent);
    
  }, [currentTheme]);
  
  return (
    <ThemeContext.Provider value={{ currentTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export default DynamicColorTheme;