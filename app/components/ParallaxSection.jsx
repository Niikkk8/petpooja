'use client';

import { useRef, useEffect } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

const ParallaxSection = ({ children, bgColor = 'bg-white' }) => {
    const ref = useRef(null);

    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ["start end", "end start"]
    });

    const y = useTransform(scrollYProgress, [0, 1], [100, -100]);
    const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0]);
    const scale = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0.8, 1, 1, 0.8]);

    // Handle mouse movement for interactive rotation - with reduced sensitivity
    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!containerRef.current) return;

            const { clientX, clientY } = e;
            const { left, top, width, height } = containerRef.current.getBoundingClientRect();

            // Calculate mouse position relative to container center (values between -1 and 1)
            const x = ((clientX - left) / width - 0.5) * 2;
            const y = ((clientY - top) / height - 0.5) * 2;

            // Apply dampening factor to reduce sensitivity (0.2 = 20% of original movement)
            const dampFactor = 0.2;

            // Apply smoothing by moving only partially toward the target position
            setPosition(prev => ({
                x: prev.x + (x * dampFactor - prev.x) * 0.1,
                y: prev.y + (y * dampFactor - prev.y) * 0.1
            }));
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    const calculateRotation = () => {
        // Limit maximum rotation to make it more subtle
        const maxRotation = 3; // degrees
        const xRotation = Math.max(-maxRotation, Math.min(maxRotation, position.x * 5));
        const yRotation = Math.max(-maxRotation, Math.min(maxRotation, -position.y * 5));

        return {
            transform: `rotateY(${xRotation}deg) rotateX(${yRotation}deg)`
        };
    };

    return (
        <section
            ref={ref}
            className={`relative py-16 md:py-24 overflow-hidden ${bgColor}`}
        >
            {/* Parallax background elements */}
            <div className="absolute inset-0 pointer-events-none">
                {/* Top right element */}
                <motion.div
                    className="absolute top-0 right-0 w-1/3 h-1/3 opacity-10"
                    style={{ y: useTransform(scrollYProgress, [0, 1], [-50, 50]), rotate: useTransform(scrollYProgress, [0, 1], [0, 10]) }}
                >
                    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                        <path
                            fill="#FF0066"
                            d="M44.2,-76.3C58.4,-69.2,71.9,-59.5,79.5,-46.4C87.1,-33.3,88.7,-16.7,86.9,-1.1C85.1,14.6,79.8,29.1,71.4,41.7C63,54.3,51.5,65,38.1,71.1C24.6,77.2,9.3,78.7,-6.3,78.2C-21.8,77.7,-37.6,75.1,-49.3,67.4C-60.9,59.7,-68.5,46.9,-74.4,33.2C-80.4,19.5,-84.7,4.9,-83.3,-9.2C-81.9,-23.3,-74.8,-36.9,-65.2,-48.4C-55.5,-59.9,-43.3,-69.3,-30,-75.1C-16.8,-80.9,-2.5,-83.2,10.6,-80.9C23.8,-78.7,30,-83.4,44.2,-76.3Z"
                            transform="translate(100 100)"
                        />
                    </svg>
                </motion.div>

                {/* Bottom left element */}
                <motion.div
                    className="absolute bottom-0 left-0 w-1/4 h-1/4 opacity-10"
                    style={{ y: useTransform(scrollYProgress, [0, 1], [50, -50]), rotate: useTransform(scrollYProgress, [0, 1], [0, -10]) }}
                >
                    <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                        <path
                            fill="#FF0066"
                            d="M43.9,-75.5C55.8,-69.2,63.9,-54.7,71.9,-40.3C79.9,-25.9,87.8,-12.9,87.3,-0.3C86.7,12.4,77.8,24.8,68.9,36.1C60.1,47.5,51.3,57.7,40.1,64.6C28.9,71.4,15.4,75,-1.1,76.9C-17.5,78.9,-35,79.3,-47.2,71.7C-59.3,64.1,-66.2,48.5,-73.3,33.2C-80.5,18,-87.9,3,-87.2,-12C-86.4,-27.1,-77.5,-42.1,-65.7,-48.8C-53.9,-55.6,-39.1,-54,-26.8,-60.2C-14.5,-66.5,-4.3,-80.5,7.3,-83.6C18.9,-86.8,31.9,-81.9,43.9,-75.5Z"
                            transform="translate(100 100)"
                        />
                    </svg>
                </motion.div>
            </div>

            {/* Content with parallax effect */}
            <motion.div
                className="relative z-10"
                style={{ y, opacity, scale }}
            >
                {children}
            </motion.div>
        </section>
    );
};

export default ParallaxSection;