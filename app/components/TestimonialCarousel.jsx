'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const TestimonialCarousel = ({ testimonials, currentTheme = 'red' }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(null);
  
  // Auto-advance the carousel every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setDirection(1);
      setCurrentIndex((prevIndex) => (prevIndex + 1) % testimonials.length);
    }, 5000);
    
    return () => clearInterval(interval);
  }, [testimonials.length]);
  
  // Handle manual navigation
  const handlePrev = () => {
    setDirection(-1);
    setCurrentIndex((prevIndex) => 
      prevIndex === 0 ? testimonials.length - 1 : prevIndex - 1
    );
  };
  
  const handleNext = () => {
    setDirection(1);
    setCurrentIndex((prevIndex) => 
      (prevIndex + 1) % testimonials.length
    );
  };
  
  // Animation variants
  const variants = {
    enter: (direction) => ({
      x: direction > 0 ? 1000 : -1000,
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1
    },
    exit: (direction) => ({
      x: direction < 0 ? 1000 : -1000,
      opacity: 0
    })
  };
  
  return (
    <div className="relative px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="relative overflow-hidden">
          <AnimatePresence initial={false} custom={direction} mode="wait">
            <motion.div
              key={currentIndex}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: "tween", duration: 0.5 }}
              className={`bg-white p-8 rounded-xl shadow-lg border border-${currentTheme}-100`}
            >
              <div className="flex flex-col items-center">
                <div className={`w-16 h-16 rounded-full bg-${currentTheme}-100 mb-6 flex items-center justify-center`}>
                  <svg className={`w-8 h-8 text-${currentTheme}-600`} fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10.5 15h-8c-.3 0-.5-.2-.5-.5v-8c0-.3.2-.5.5-.5h8c.3 0 .5.2.5.5v8c0 .3-.2.5-.5.5zm7-10h-8c-.3 0-.5-.2-.5-.5v-3c0-.3.2-.5.5-.5h8c.3 0 .5.2.5.5v3c0 .3-.2.5-.5.5zm0 10h-8c-.3 0-.5-.2-.5-.5v-8c0-.3.2-.5.5-.5h8c.3 0 .5.2.5.5v8c0 .3-.2.5-.5.5z"/>
                  </svg>
                </div>
                
                <blockquote className="text-xl text-center text-gray-700 mb-6">"{testimonials[currentIndex].quote}"</blockquote>
                
                <div className="flex flex-col items-center">
                  <div className={`w-12 h-12 rounded-full overflow-hidden mb-2 border-2 border-${currentTheme}-500`}>
                    <img 
                      src={testimonials[currentIndex].image} 
                      alt={testimonials[currentIndex].author}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h4 className="text-lg font-bold">{testimonials[currentIndex].author}</h4>
                  <p className={`text-${currentTheme}-600`}>{testimonials[currentIndex].position}</p>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
          
          {/* Navigation buttons */}
          <div className="absolute inset-y-0 left-0 flex items-center">
            <button 
              onClick={handlePrev}
              className={`-ml-4 w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center focus:outline-none text-${currentTheme}-600 border border-${currentTheme}-100 hover:bg-${currentTheme}-50 transition-colors z-10`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          </div>
          
          <div className="absolute inset-y-0 right-0 flex items-center">
            <button 
              onClick={handleNext}
              className={`-mr-4 w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center focus:outline-none text-${currentTheme}-600 border border-${currentTheme}-100 hover:bg-${currentTheme}-50 transition-colors z-10`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
        
        {/* Dots indicator */}
        <div className="flex justify-center mt-6 space-x-2">
          {testimonials.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                setDirection(index > currentIndex ? 1 : -1);
                setCurrentIndex(index);
              }}
              className={`w-3 h-3 rounded-full ${
                index === currentIndex ? `bg-${currentTheme}-600` : `bg-${currentTheme}-200`
              } transition-colors`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default TestimonialCarousel;