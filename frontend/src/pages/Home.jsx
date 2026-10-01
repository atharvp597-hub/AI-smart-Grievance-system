import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import LeftSection from '../component/LeftSection'
import RightSection from '../component/RightSection'
import KeyInnovations from '../component/KeyInnovations'
import { useTheme } from '../context/ThemeContext' 

function Home() {
  const aboutRef = useRef(null);
  const featuresRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { isDark } = useTheme(); 

  useEffect(() => {
    if (location.hash === '#about') {
      setTimeout(() => {
        aboutRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
    if (location.hash === '#features') {
      setTimeout(() => {
        featuresRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [location]);

  return (
    <motion.div
      initial={{ opacity: 0, x: -500 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.7 }}
      className={`py-20 flex-col items-center justify-center px-4 sm:px-6 transition-colors duration-300 ${
        isDark ? 'bg-[#0F1729]' : 'bg-gray-50'
      }`}
    >
      <div className='text-center max-w-4xl mx-auto'>

        {/* Main Heading */}
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold flex items-center justify-center">
          <span className={`mr-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>⚡</span>
          <span className="bg-gradient-to-r from-sky-400 via-cyan-400 to-teal-400 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(34,211,238,0.4)]">
            Smart Grievance AI
          </span>
        </h1>

        {/* Subheading */}
        <p className={`text-base sm:text-lg md:text-xl mt-4 sm:mt-5 font-medium transition-colors duration-300 ${
          isDark ? 'text-gray-300' : 'text-gray-600'
        }`}>
          From Complaint to Resolution — <span className="text-cyan-400">In Seconds</span>
        </p>

        {/* Description */}
        <p className={`text-sm sm:text-base mt-4 sm:mt-5 max-w-2xl mx-auto px-2 transition-colors duration-300 ${
          isDark ? 'text-gray-400' : 'text-gray-500'
        }`}>
          AI-powered system that automatically classifies, prioritizes, and routes
          citizen complaints to the right government department.
        </p>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mt-6 sm:mt-8">
          <motion.button
            type="button"
            onClick={() => navigate('/complaint')}
            whileHover={{ scale: 1.05, rotate: -1 }}
            transition={{ duration: 0.1 }}
            className="bg-gradient-to-r from-cyan-600 to-blue-700 hover:from-cyan-700 hover:to-blue-800 text-white px-6 sm:px-8 py-2 rounded-xl font-semibold transition-all duration-300 shadow-lg shadow-cyan-700/30 text-sm sm:text-base">
            Submit Complaint →
          </motion.button>
          <motion.button
            type="button"
            onClick={() => navigate('/track')}
            whileHover={{ scale: 1.05, rotate: 1 }}
            transition={{ duration: 0.1 }}
            className="border border-cyan-500 text-cyan-400 hover:bg-cyan-500/10 px-6 sm:px-8 py-2.5 sm:py-3 rounded-xl font-semibold transition-all duration-300 text-sm sm:text-base">
            Track Complaint
          </motion.button>
        </div>
      </div>

      {/* Left + Right Section */}
      <div className='max-w-7xl mx-auto w-full py-16 px-4'>
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center'>
          <LeftSection />
          <RightSection />
        </div>
      </div>

      {/* Key Innovations Section */}
      <div ref={featuresRef} id="key-innovations">
        <KeyInnovations />
      </div>

      {/* About Section */}
      <div ref={aboutRef} id="about" className="max-w-7xl mx-auto py-20 px-4 mt-10">
        <h2 className="text-3xl sm:text-4xl font-bold text-center bg-gradient-to-r from-sky-400 to-teal-400 bg-clip-text text-transparent">
          About Nivaran AI
        </h2>
        <p className={`text-center mt-4 text-lg max-w-3xl mx-auto transition-colors duration-300 ${
          isDark ? 'text-gray-300' : 'text-gray-700'
        }`}>
          Nivaran AI is a cutting-edge grievance management system that uses artificial intelligence
          to automatically classify, prioritize, and route citizen complaints to the appropriate government departments.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          {/* Card Component - Reusable style */}
          {[
            { icon: "🤖", title: "AI-Powered", desc: "Automatic complaint classification and smart routing to right departments" },
            { icon: "⚡", title: "Real-time Tracking", desc: "Live updates on complaint status from submission to resolution" },
            { icon: "🎯", title: "Smart Prioritization", desc: "Automatic priority assignment based on urgency and impact" }
          ].map((item, idx) => (
            <div key={idx} className={`p-6 rounded-xl transition-all duration-300 ${
              isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-100 hover:bg-gray-200 border border-gray-200'
            }`}>
              <div className="text-4xl mb-3">{item.icon}</div>
              <h3 className="text-cyan-400 text-xl font-bold">{item.title}</h3>
              <p className={`mt-2 transition-colors duration-300 ${
                isDark ? 'text-gray-400' : 'text-gray-600'
              }`}>{item.desc}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {[
            { icon: "🔒", title: "Secure & Private", desc: "Your data is encrypted and protected with enterprise-grade security" },
            { icon: "📊", title: "Analytics Dashboard", desc: "Comprehensive insights and reports for better governance" }
          ].map((item, idx) => (
            <div key={idx} className={`p-6 rounded-xl transition-all duration-300 ${
              isDark ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-100 hover:bg-gray-200 border border-gray-200'
            }`}>
              <div className="text-4xl mb-3">{item.icon}</div>
              <h3 className="text-cyan-400 text-xl font-bold">{item.title}</h3>
              <p className={`mt-2 transition-colors duration-300 ${
                isDark ? 'text-gray-400' : 'text-gray-600'
              }`}>{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

export default Home
