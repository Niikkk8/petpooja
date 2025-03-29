'use client';

import { motion } from 'framer-motion';
import { FaPizzaSlice, FaWineBottle, FaCarrot, FaAppleAlt, FaBreadSlice, FaFish, FaEgg, FaCheese } from 'react-icons/fa';
import { GiMushroomGills, GiChickenLeg, GiBeerBottle, GiCupcake, GiSushis } from 'react-icons/gi';

const FloatingElements = () => {
  // Array of food and beverage items with their properties
  const elements = [
    {
      id: 1,
      icon: <FaPizzaSlice size={40} />,
      color: "text-red-400",
      position: { top: '10%', left: '5%' },
      animation: {
        y: [0, 15, 0],
        rotate: [0, 10, 0],
        transition: { duration: 6, repeat: Infinity, ease: "easeInOut" }
      }
    },
    {
      id: 2,
      icon: <FaWineBottle size={32} />,
      color: "text-purple-500",
      position: { top: '20%', right: '10%' },
      animation: {
        y: [0, -20, 0],
        x: [0, 10, 0],
        transition: { duration: 7, repeat: Infinity, ease: "easeInOut" }
      }
    },
    {
      id: 3,
      icon: <FaCarrot size={30} />,
      color: "text-orange-500",
      position: { bottom: '25%', left: '15%' },
      animation: {
        y: [0, 20, 0],
        rotate: [0, -15, 0],
        transition: { duration: 8, repeat: Infinity, ease: "easeInOut" }
      }
    },
    {
      id: 4,
      icon: <GiChickenLeg size={36} />,
      color: "text-amber-700",
      position: { top: '40%', right: '5%' },
      animation: {
        y: [0, -15, 0],
        x: [0, -10, 0],
        transition: { duration: 5, repeat: Infinity, ease: "easeInOut" }
      }
    },
    {
      id: 5,
      icon: <FaAppleAlt size={28} />,
      color: "text-red-500",
      position: { bottom: '15%', right: '20%' },
      animation: {
        y: [0, 10, 0],
        rotate: [0, 20, 0],
        transition: { duration: 7.5, repeat: Infinity, ease: "easeInOut" }
      }
    },
    {
      id: 6,
      icon: <GiBeerBottle size={34} />,
      color: "text-amber-400",
      position: { top: '70%', left: '7%' },
      animation: {
        y: [0, -25, 0],
        transition: { duration: 9, repeat: Infinity, ease: "easeInOut" }
      }
    },
    {
      id: 7,
      icon: <FaBreadSlice size={30} />,
      color: "text-yellow-600",
      position: { top: '35%', left: '25%' },
      animation: {
        y: [0, 15, 0],
        rotate: [0, -10, 0],
        transition: { duration: 6.5, repeat: Infinity, ease: "easeInOut" }
      }
    },
    {
      id: 8,
      icon: <GiCupcake size={28} />,
      color: "text-pink-400",
      position: { bottom: '30%', right: '30%' },
      animation: {
        y: [0, -20, 0],
        transition: { duration: 8, repeat: Infinity, ease: "easeInOut" }
      }
    },
    {
      id: 9,
      icon: <FaFish size={32} />,
      color: "text-blue-400",
      position: { top: '65%', right: '15%' },
      animation: {
        x: [0, 20, 0],
        transition: { duration: 7, repeat: Infinity, ease: "easeInOut" }
      }
    },
    {
      id: 10,
      icon: <GiSushis size={36} />,
      color: "text-gray-700",
      position: { top: '15%', left: '40%' },
      animation: {
        y: [0, 10, 0],
        rotate: [0, 5, 0],
        transition: { duration: 5.5, repeat: Infinity, ease: "easeInOut" }
      }
    },
    {
      id: 11,
      icon: <FaEgg size={26} />,
      color: "text-yellow-100",
      position: { bottom: '50%', left: '5%' },
      animation: {
        y: [0, -15, 0],
        x: [0, 10, 0],
        transition: { duration: 6, repeat: Infinity, ease: "easeInOut" }
      }
    },
    {
      id: 12,
      icon: <FaCheese size={30} />,
      color: "text-yellow-300",
      position: { bottom: '10%', left: '35%' },
      animation: {
        y: [0, 25, 0],
        rotate: [0, 15, 0],
        transition: { duration: 8.5, repeat: Infinity, ease: "easeInOut" }
      }
    },
    {
      id: 13,
      icon: <GiMushroomGills size={32} />,
      color: "text-gray-400",
      position: { top: '55%', left: '18%' },
      animation: {
        y: [0, -10, 0],
        rotate: [0, -5, 0],
        transition: { duration: 7, repeat: Infinity, ease: "easeInOut" }
      }
    }
  ];

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-20 z-0">
      {elements.map((element) => (
        <motion.div
          key={element.id}
          className={`absolute ${element.color}`}
          style={element.position}
          animate={element.animation}
        >
          {element.icon}
        </motion.div>
      ))}
    </div>
  );
};

export default FloatingElements;