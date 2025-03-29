'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { FaUtensils, FaChartLine, FaRecycle, FaRobot } from 'react-icons/fa';
import { HiOutlineMenuAlt3 } from 'react-icons/hi';
import Navbar from './components/Navbar';
import FloatingElements from './components/FloatingElements';
import TeamSection from './components/TeamSection';

export default function Home() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const features = [
    {
      id: 1,
      title: "Smart Inventory Management",
      description: "Computer vision that tracks inventory in real-time",
      icon: <FaUtensils size={32} />,
      link: "/tracks/inventory"
    },
    {
      id: 2,
      title: "Waste Prediction",
      description: "AI algorithms that forecast food expiration and reduce waste",
      icon: <FaRecycle size={32} />,
      link: "/tracks/waste-prediction"
    },
    {
      id: 3,
      title: "Menu Optimization",
      description: "Intelligent recipe suggestions based on your inventory",
      icon: <FaRobot size={32} />,
      link: "/tracks/menu-optimization"
    },
    {
      id: 4,
      title: "Waste Analysis Reporting",
      description: "Visual analytics that turn kitchen data into profit",
      icon: <FaChartLine size={32} />,
      link: "/tracks/waste-analysis"
    }
  ];

  return (
    <div className="relative min-h-screen">
      {/* Floating food elements in background */}
      <FloatingElements />
      
      {/* Navbar */}
      <Navbar isScrolled={isScrolled} />
      
      {/* Hero Section */}
      <section className="relative pt-20 md:pt-32 pb-16 md:pb-32 overflow-hidden">
        <div className="container mx-auto px-4 relative z-10">
          <div className="flex flex-col md:flex-row items-center">
            <div className="w-full md:w-1/2 md:pr-12">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <h1 className="text-4xl md:text-6xl font-bold text-red-600 leading-tight mb-6">
                  Smart Kitchen,<br />Tastier Profits
                </h1>
                <p className="text-lg md:text-xl text-gray-700 mb-8">
                  Pet Pooja uses computer vision and AI to minimize waste and maximize efficiency in restaurant kitchens.
                </p>
                <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-8 py-4 bg-red-600 text-white rounded-lg font-semibold shadow-lg hover:bg-red-700 transition-all"
                  >
                    Get Started
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-8 py-4 border-2 border-red-600 text-red-600 rounded-lg font-semibold hover:bg-red-50 transition-all"
                  >
                    Watch Demo
                  </motion.button>
                </div>
              </motion.div>
            </div>
            <div className="w-full md:w-1/2 mt-12 md:mt-0">
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8 }}
                className="relative"
              >
                <div className="w-full h-80 md:h-96 relative bg-red-100 rounded-xl overflow-hidden shadow-2xl">
                  {/* This would be an image or animation of the platform in use */}
                  <div className="absolute inset-0 bg-gradient-to-br from-red-600/10 to-red-800/30 flex items-center justify-center">
                    <p className="text-red-800 font-semibold text-lg">Smart Kitchen Dashboard</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

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
                  whileHover={{ y: -5, boxShadow: '0 10px 25px -5px rgba(220, 38, 38, 0.1)' }}
                  className="bg-white rounded-xl p-8 shadow-lg border border-gray-100 h-full flex flex-col hover:border-red-200 transition-all cursor-pointer"
                >
                  <div className="text-red-600 mb-4">{feature.icon}</div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                  <p className="text-gray-600 flex-grow">{feature.description}</p>
                  <div className="mt-6 text-red-600 font-medium">Learn more →</div>
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
                description: "Install our smart cameras and connect to your POS system"
              },
              {
                step: "2",
                title: "AI Analyzes Everything",
                description: "Our algorithms track ingredients, predict demand, and identify waste"
              },
              {
                step: "3",
                title: "Receive Smart Insights",
                description: "Get actionable recommendations to reduce waste and boost profits"
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
                <div className="bg-red-600 w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-xl mb-6">
                  {item.step}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{item.title}</h3>
                <p className="text-gray-600">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <TeamSection />

      {/* CTA Section */}
      <section className="py-16 md:py-24 bg-red-600 relative overflow-hidden">
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
                className="px-8 py-4 bg-white text-red-600 rounded-lg font-semibold shadow-lg hover:bg-red-50 transition-all"
              >
                Get Started Today
              </motion.button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-gray-900 text-white">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-6 md:mb-0">
              <h3 className="text-2xl font-bold text-red-500">Pet Pooja</h3>
              <p className="text-gray-400 mt-2">AI-Powered Smart Kitchen</p>
            </div>
            <div className="flex space-x-8">
              <Link href="/tracks/inventory" className="text-gray-300 hover:text-red-400 transition-colors">
                Inventory
              </Link>
              <Link href="/tracks/waste-prediction" className="text-gray-300 hover:text-red-400 transition-colors">
                Waste Prediction
              </Link>
              <Link href="/tracks/menu-optimization" className="text-gray-300 hover:text-red-400 transition-colors">
                Menu Optimization
              </Link>
              <Link href="/tracks/waste-analysis" className="text-gray-300 hover:text-red-400 transition-colors">
                Analytics
              </Link>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-500 text-sm">
            <p>© 2025 Pet Pooja. All rights reserved. Made for the Hackathon.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}