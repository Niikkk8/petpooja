'use client';

import { motion } from 'framer-motion';
import { FaGithub, FaLinkedin, FaTwitter } from 'react-icons/fa';

const TeamSection = () => {
    const teamMembers = [
        {
            id: 1,
            name: "Chinmay Patel",
            role: "Full Stack Developer",
            imagePlaceholder: "bg-red-200",
            socialLinks: {
                github: "#",
                linkedin: "#",
                twitter: "#"
            }
        },
        {
            id: 2,
            name: "Dev Mehta",
            role: "AI & ML Engineer",
            imagePlaceholder: "bg-red-300",
            socialLinks: {
                github: "#",
                linkedin: "#",
                twitter: "#"
            }
        },
        {
            id: 3,
            name: "Prem Joshi",
            role: "UI/UX Designer",
            imagePlaceholder: "bg-red-400",
            socialLinks: {
                github: "#",
                linkedin: "#",
                twitter: "#"
            }
        },
        {
            id: 4,
            name: "Niket Shah",
            role: "Backend Developer",
            imagePlaceholder: "bg-red-500",
            socialLinks: {
                github: "#",
                linkedin: "#",
                twitter: "#"
            }
        }
    ];

    return (
        <section className="py-16 md:py-32 bg-gray-50">
            <div className="container mx-auto px-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    viewport={{ once: true }}
                    className="text-center max-w-3xl mx-auto mb-16"
                >
                    <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Meet Our Team</h2>
                    <p className="text-lg text-gray-600">
                        The brilliant minds behind Pet Pooja's AI-powered kitchen innovation
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                    {teamMembers.map((member, index) => (
                        <motion.div
                            key={member.id}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                            viewport={{ once: true }}
                            className="bg-white rounded-xl overflow-hidden shadow-lg"
                        >
                            <div className={`h-48 ${member.imagePlaceholder} flex items-center justify-center`}>
                                <span className="text-3xl font-bold text-white">
                                    {member.name.split(' ').map(part => part[0]).join('')}
                                </span>
                            </div>
                            <div className="p-6">
                                <h3 className="text-xl font-bold text-gray-900 mb-1">{member.name}</h3>
                                <p className="text-gray-600 mb-4">{member.role}</p>
                                <div className="flex space-x-4">
                                    <a
                                        href={member.socialLinks.github}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-gray-500 hover:text-red-600 transition-colors"
                                    >
                                        <FaGithub size={20} />
                                    </a>
                                    <a
                                        href={member.socialLinks.linkedin}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-gray-500 hover:text-red-600 transition-colors"
                                    >
                                        <FaLinkedin size={20} />
                                    </a>
                                    <a
                                        href={member.socialLinks.twitter}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-gray-500 hover:text-red-600 transition-colors"
                                    >
                                        <FaTwitter size={20} />
                                    </a>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default TeamSection;