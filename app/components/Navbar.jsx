'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlineMenuAlt3, HiX } from 'react-icons/hi';

const Navbar = ({ isScrolled }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    return (
        <header
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-white shadow-md py-2' : 'bg-transparent py-4'
                }`}
        >
            <div className="container mx-auto px-4">
                <div className="flex justify-between items-center">
                    {/* Logo */}
                    <Link href="/">
                        <div className="flex items-center">
                            <motion.div
                                whileHover={{ rotate: 10 }}
                                className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center mr-2"
                            >
                                <span className="text-white font-bold text-xl">P</span>
                            </motion.div>
                            <span className={`font-bold text-xl ${isScrolled ? 'text-red-600' : 'text-red-600'}`}>
                                Pet Pooja
                            </span>
                        </div>
                    </Link>

                    {/* Desktop Navigation */}
                    <nav className="hidden md:flex items-center space-x-8">
                        <NavLink href="/tracks/inventory" title="Inventory" isScrolled={isScrolled} />
                        <NavLink href="/tracks/waste-prediction" title="Waste Prediction" isScrolled={isScrolled} />
                        <NavLink href="/tracks/menu-optimization" title="Menu Optimization" isScrolled={isScrolled} />
                        <NavLink href="/tracks/waste-analysis" title="Analytics" isScrolled={isScrolled} />
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-all"
                        >
                            Start Free Trial
                        </motion.button>
                    </nav>

                    {/* Mobile Menu Button */}
                    <div className="md:hidden">
                        <button
                            onClick={toggleMenu}
                            className={`text-2xl p-2 ${isScrolled ? 'text-red-600' : 'text-red-600'}`}
                        >
                            {isMenuOpen ? <HiX /> : <HiOutlineMenuAlt3 />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Navigation Menu */}
            <AnimatePresence>
                {isMenuOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="md:hidden bg-white shadow-lg overflow-hidden"
                    >
                        <div className="container mx-auto px-4 py-4">
                            <div className="flex flex-col space-y-4">
                                <MobileNavLink href="/tracks/inventory" title="Inventory" onClick={() => setIsMenuOpen(false)} />
                                <MobileNavLink href="/tracks/waste-prediction" title="Waste Prediction" onClick={() => setIsMenuOpen(false)} />
                                <MobileNavLink href="/tracks/menu-optimization" title="Menu Optimization" onClick={() => setIsMenuOpen(false)} />
                                <MobileNavLink href="/tracks/waste-analysis" title="Analytics" onClick={() => setIsMenuOpen(false)} />
                                <button className="px-4 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-all w-full">
                                    Start Free Trial
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </header>
    );
};

const NavLink = ({ href, title, isScrolled }) => (
    <Link href={href}>
        <span className={`font-medium hover:text-red-600 transition-colors cursor-pointer ${isScrolled ? 'text-gray-800' : 'text-gray-800'
            }`}>
            {title}
        </span>
    </Link>
);

const MobileNavLink = ({ href, title, onClick }) => (
    <Link href={href} onClick={onClick}>
        <span className="block px-2 py-3 text-gray-800 font-medium border-b border-gray-100 hover:text-red-600 transition-colors">
            {title}
        </span>
    </Link>
);

export default Navbar;