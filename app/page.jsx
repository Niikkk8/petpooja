'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { FaUtensils, FaChartLine, FaRecycle, FaRobot, FaArrowDown } from 'react-icons/fa';
import { HiOutlineMenuAlt3 } from 'react-icons/hi';
import { useInView } from 'framer-motion';
import Navbar from './components/Navbar';
import FloatingElements from './components/FloatingElements';
import TeamSection from './components/TeamSection';
import ThreeDModel from './components/ThreeDModel';
import ParallaxSection from './components/ParallaxSection';
import TestimonialCarousel from './components/TestimonialCarousel';
import StatisticsCounter from './components/StatisticsCounter';
import DynamicColorTheme from './components/DynamicColorTheme';

export default function Home() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [currentColorTheme, setCurrentColorTheme] = useState('red');
  const [showScrollCta, setShowScrollCta] = useState(true);
  
  const heroRef = useRef(null);
  const heroInView = useInView(heroRef, { once: false });
  
  const { scrollY } = useScroll();
  const heroOpacity = useTransform(scrollY, [0, 300], [1, 0]);
  const heroScale = useTransform(scrollY, [0, 300], [1, 0.9]);
  
  // Track scroll progress for dynamic color theme
  const scrollProgress = useRef(0);
  const colorThemes = ['red', 'crimson', 'maroon', 'firebrick'];

  useEffect(() => {
    const handleScroll = () => {
      // Update scroll state for navbar
      if (window.scrollY > 10) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
      
      // Hide scroll CTA after scrolling
      if (window.scrollY > 100) {
        setShowScrollCta(false);
      } else {
        setShowScrollCta(true);
      }
      
      // Update color theme based on scroll position
      const scrollPercentage = window.scrollY / (document.body.scrollHeight - window.innerHeight);
      scrollProgress.current = scrollPercentage;
      
      // Change theme based on scroll position
      const themeIndex = Math.min(
        Math.floor(scrollPercentage * colorThemes.length),
        colorThemes.length - 1
      );
      setCurrentColorTheme(colorThemes[themeIndex]);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const features = [
    {
      id: 1,
      title: "Smart Inventory Management",
      description: "Computer vision that tracks inventory in real-time, eliminating manual counting and reducing labor costs by up to 30%",
      icon: <FaUtensils size={32} />,
      link: "/tracks/inventory"
    },
    {
      id: 2,
      title: "Waste Prediction",
      description: "AI algorithms that forecast food expiration and reduce waste by predicting optimal inventory levels based on historical data",
      icon: <FaRecycle size={32} />,
      link: "/tracks/waste-prediction"
    },
    {
      id: 3,
      title: "Menu Optimization",
      description: "Intelligent recipe suggestions based on your inventory that maximize profits and minimize waste with dynamic pricing models",
      icon: <FaRobot size={32} />,
      link: "/tracks/menu-optimization"
    },
    {
      id: 4,
      title: "Waste Analysis Reporting",
      description: "Visual analytics that turn kitchen data into profit with customizable dashboards that highlight opportunities for improvement",
      icon: <FaChartLine size={32} />,
      link: "/tracks/waste-analysis"
    }
  ];

  const testimonials = [
    {
      id: 1,
      quote: "Pet Pooja reduced our food waste by 35% in just three months. The ROI has been incredible for our restaurant chain.",
      author: "Rajiv Mehta",
      position: "Operations Manager, Spice Garden Group",
      image: "/api/placeholder/50/50"
    },
    {
      id: 2,
      quote: "The expiry date tracking alone saved us thousands in inventory costs. This is a game-changer for restaurant management.",
      author: "Anita Sharma",
      position: "Head Chef, Fusion Bites",
      image: "/api/placeholder/50/50"
    },
    {
      id: 3,
      quote: "We've decreased our inventory costs by 22% while improving our menu variety. Our customers are happier and so is our bottom line.",
      author: "Vikram Patel",
      position: "Owner, Mumbai Eats",
      image: "/api/placeholder/50/50"
    }
  ];

  const statistics = [
    { id: 1, label: "Restaurants Served", value: 250, suffix: "+" },
    { id: 2, label: "Food Waste Reduction", value: 35, suffix: "%" },
    { id: 3, label: "Average Cost Savings", value: 22, suffix: "%" },
    { id: 4, label: "Items Tracked Monthly", value: 1.2, suffix: "M" }
  ];

  return (
    <DynamicColorTheme currentTheme={currentColorTheme}>
      <div className="relative min-h-screen">
        {/* Floating food elements in background */}
        <FloatingElements />
        
        {/* Navbar */}
        <Navbar isScrolled={isScrolled} currentTheme={currentColorTheme} />
        
        {/* Hero Section with 3D Elements */}
        <section 
          ref={heroRef}
          className="relative min-h-screen flex items-center pt-20 overflow-hidden"
        >
          <motion.div 
            style={{ opacity: heroOpacity, scale: heroScale }}
            className="container mx-auto px-4 relative z-10"
          >
            <div className="flex flex-col md:flex-row items-center">
              <div className="w-full md:w-1/2 md:pr-12">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: heroInView ? 1 : 0, y: heroInView ? 0 : 20 }}
                  transition={{ duration: 0.6 }}
                >
                  <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6" style={{ color: 'var(--color-primary)' }}>
                    Smart Kitchen,<br />Tastier Profits
                  </h1>
                  <p className="text-lg md:text-xl text-gray-700 mb-8">
                    Pet Pooja uses computer vision and AI to minimize waste and maximize efficiency in restaurant kitchens.
                  </p>
                  <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-8 py-4 text-white rounded-lg font-semibold shadow-lg transition-all"
                      style={{ backgroundColor: 'var(--color-primary)' }}
                    >
                      Get Started
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-8 py-4 border-2 rounded-lg font-semibold transition-all"
                      style={{ 
                        borderColor: 'var(--color-primary)',
                        color: 'var(--color-primary)'
                      }}
                    >
                      Watch Demo
                    </motion.button>
                  </div>
                </motion.div>
              </div>
              <div className="w-full md:w-1/2 mt-12 md:mt-0 h-80 md:h-96">
                <ThreeDModel currentTheme={currentColorTheme} />
              </div>
            </div>
            
            {/* Scroll CTA */}
            {/* <AnimatePresence>
              {showScrollCta && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.6 }}
                  className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-center"
                >
                  <p className="text-gray-600 mb-2">Discover More</p>
                  <motion.div
                    animate={{ y: [0, 10, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    style={{ color: 'var(--color-primary)' }}
                  >
                    <FaArrowDown size={24} />
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence> */}
          </motion.div>
        </section>

        {/* Parallax Statistics Section */}
        <ParallaxSection>
          <div className="container mx-auto px-4 py-12">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {statistics.map((stat) => (
                <StatisticsCounter
                  key={stat.id}
                  value={stat.value}
                  label={stat.label}
                  suffix={stat.suffix}
                  color={currentColorTheme}
                />
              ))}
            </div>
          </div>
        </ParallaxSection>

        {/* Feature Section */}
        <section className="py-16 md:py-32 bg-gray-50 relative overflow-hidden">
          <div className="container mx-auto px-4 relative z-10">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="text-center max-w-3xl mx-auto mb-16"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">How Pet Pooja Makes Kitchens Smarter</h2>
              <p className="text-lg text-gray-600">Our AI-powered platform transforms restaurant operations from inventory to plate</p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {features.map((feature, index) => (
                <Link key={feature.id} href={feature.link}>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    viewport={{ once: true }}
                    whileHover={{ 
                      y: -5, 
                      boxShadow: '0 10px 25px -5px rgba(220, 38, 38, 0.1)',
                      borderColor: 'var(--color-light)'
                    }}
                    className="bg-white rounded-xl p-8 shadow-lg border border-gray-100 h-full flex flex-col transition-all cursor-pointer"
                  >
                    <div className="mb-4" style={{ color: 'var(--color-primary)' }}>{feature.icon}</div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                    <p className="text-gray-600 flex-grow">{feature.description}</p>
                    <div className="mt-6 font-medium" style={{ color: 'var(--color-primary)' }}>Learn more →</div>
                  </motion.div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* How it Works Section */}
        <section className="py-16 md:py-32 relative">
          <div className="container mx-auto px-4 relative z-10">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="text-center max-w-3xl mx-auto mb-16"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">How It Works</h2>
              <p className="text-lg text-gray-600">Transform your kitchen operations in three simple steps</p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  step: "1",
                  title: "Connect Your Kitchen",
                  description: "Install our smart cameras and connect to your POS system. Our setup team handles everything for a seamless integration."
                },
                {
                  step: "2",
                  title: "AI Analyzes Everything",
                  description: "Our algorithms track ingredients, predict demand, and identify waste patterns using advanced computer vision and machine learning."
                },
                {
                  step: "3",
                  title: "Receive Smart Insights",
                  description: "Get actionable recommendations to reduce waste and boost profits through our intuitive dashboard and alerts system."
                }
              ].map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.2 }}
                  viewport={{ once: true }}
                  className="relative"
                >
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-xl mb-6"
                    style={{ backgroundColor: 'var(--color-primary)' }}>
                    {item.step}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{item.title}</h3>
                  <p className="text-gray-600">{item.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="py-16 md:py-24 relative overflow-hidden" style={{ backgroundColor: 'var(--color-extra-light)' }}>
          <div className="container mx-auto px-4 relative z-10">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="text-center max-w-3xl mx-auto mb-12"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">What Our Customers Say</h2>
              <p className="text-lg text-gray-600">Join hundreds of satisfied restaurant owners who've transformed their kitchens</p>
            </motion.div>
            
            <TestimonialCarousel testimonials={testimonials} currentTheme={currentColorTheme} />
          </div>
        </section>

        {/* Interactive Demo Section */}
        <section className="py-16 md:py-32 relative overflow-hidden">
          <div className="container mx-auto px-4 relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
              >
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">See Pet Pooja in Action</h2>
                <p className="text-lg text-gray-600 mb-8">
                  Watch how our AI-powered system detects expiry dates, tracks inventory, and provides actionable insights to reduce waste and increase profits.
                </p>
                <ul className="space-y-4 mb-8">
                  {[
                    "Automated ingredient recognition with 98% accuracy",
                    "Real-time expiry date tracking and alerts",
                    "AI-powered demand forecasting to optimize purchasing",
                    "Customized reporting and analytics dashboard"
                  ].map((item, index) => (
                    <motion.li 
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: 0.1 * index }}
                      viewport={{ once: true }}
                      className="flex items-start"
                    >
                      <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mt-1 mr-3"
                        style={{ backgroundColor: 'var(--color-primary)' }}>
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className="text-gray-700">{item}</span>
                    </motion.li>
                  ))}
                </ul>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-6 py-3 text-white rounded-lg font-medium shadow-md transition-all"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                >
                  Schedule a Live Demo
                </motion.button>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
                className="relative h-80 md:h-96 w-full border-8 border-white shadow-2xl rounded-xl overflow-hidden"
              >
                <div className="absolute inset-0 flex items-center justify-center"
                  style={{ 
                    background: `linear-gradient(to top right, rgba(var(--color-primary-rgb), 0.2), rgba(var(--color-secondary-rgb), 0.4))`
                  }}>
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    className="w-20 h-20 rounded-full flex items-center justify-center cursor-pointer shadow-lg"
                    style={{ backgroundColor: 'var(--color-primary)' }}
                  >
                    <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M14.75 10.12L8.25 5.25C8.12 5.17 7.97 5.12 7.82 5.12C7.39 5.12 7.03 5.47 7.03 5.9V15.73C7.03 16.16 7.39 16.52 7.82 16.52C7.97 16.52 8.12 16.46 8.25 16.39L14.75 11.51C14.88 11.43 14.97 11.29 14.97 11.11C14.97 10.93 14.88 10.78 14.75 10.7V10.12Z" />
                    </svg>
                  </motion.div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Team Section */}
        <TeamSection currentTheme={currentColorTheme} />

        {/* CTA Section */}
        <section className="py-16 md:py-24 relative overflow-hidden" 
          style={{ backgroundColor: 'var(--color-primary)' }}>
          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-4xl mx-auto text-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
              >
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">Ready to Transform Your Kitchen?</h2>
                <p className="text-lg text-red-100 mb-8">Join hundreds of restaurants reducing waste and increasing profits with Pet Pooja</p>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-8 py-4 bg-white rounded-lg font-semibold shadow-lg transition-all"
                  style={{ color: 'var(--color-primary)' }}
                >
                  Get Started Today
                </motion.button>
              </motion.div>
            </div>
          </div>
          
          {/* Animated background shapes */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {Array.from({ length: 6 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute rounded-full bg-white opacity-10"
                style={{
                  top: `${Math.random() * 100}%`,
                  left: `${Math.random() * 100}%`,
                  width: `${50 + Math.random() * 100}px`,
                  height: `${50 + Math.random() * 100}px`,
                }}
                animate={{
                  y: [0, -100, 0],
                  x: [0, Math.random() * 50 - 25, 0],
                }}
                transition={{
                  duration: 10 + Math.random() * 10,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="py-12 bg-gray-900 text-white">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
              <div>
                <h3 className="text-2xl font-bold mb-4" style={{ color: 'var(--color-primary)' }}>Pet Pooja</h3>
                <p className="text-gray-400 mb-6">AI-Powered Smart Kitchen & Waste Minimizer for Restaurants</p>
                <div className="flex space-x-4">
                  {["facebook", "twitter", "instagram", "linkedin"].map((social) => (
                    <a 
                      key={social}
                      href="#" 
                      className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center transition-colors"
                      style={{ 
                        '&:hover': { 
                          backgroundColor: 'var(--color-primary)' 
                        }
                      }}
                    >
                      <span className="sr-only">{social}</span>
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.477 2 2 6.477 2 12C2 17.523 6.477 22 12 22C17.523 22 22 17.523 22 12C22 6.477 17.523 2 12 2Z" />
                      </svg>
                    </a>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="text-lg font-bold text-white mb-4">Product</h4>
                <ul className="space-y-2">
                  {["Features", "Pricing", "Case Studies", "Testimonials", "API"].map((item) => (
                    <li key={item}>
                      <a href="#" className="text-gray-400 hover:text-white transition-colors">{item}</a>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div>
                <h4 className="text-lg font-bold text-white mb-4">Solutions</h4>
                <ul className="space-y-2">
                  {features.map((feature) => (
                    <li key={feature.id}>
                      <Link href={feature.link} className="text-gray-400 hover:text-white transition-colors">
                        {feature.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div>
                <h4 className="text-lg font-bold text-white mb-4">Contact</h4>
                <ul className="space-y-2">
                  <li className="text-gray-400">
                    <span className="block">Email: info@petpooja.ai</span>
                  </li>
                  <li className="text-gray-400">
                    <span className="block">Phone: +91 123-456-7890</span>
                  </li>
                  <li className="text-gray-400">
                    <span className="block">Address: Tech Hub, Mumbai</span>
                  </li>
                </ul>
              </div>
            </div>
            
            <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center">
              <p className="text-gray-500 text-sm">© 2025 Pet Pooja. All rights reserved. Made for the Hackathon.</p>
              <div className="mt-4 md:mt-0 flex space-x-4">
                <a href="#" className="text-gray-500 hover:text-white text-sm">Privacy Policy</a>
                <a href="#" className="text-gray-500 hover:text-white text-sm">Terms of Service</a>
                <a href="#" className="text-gray-500 hover:text-white text-sm">Cookie Policy</a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </DynamicColorTheme>
  );
}