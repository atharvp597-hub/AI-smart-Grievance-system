import { motion } from 'framer-motion'
import { useTheme } from '../context/ThemeContext'

function LeftSection() {
  const { isDark } = useTheme()

  return (
    <motion.div
      initial={{ opacity: 0, x: -50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5 }}
      className='text-center lg:text-left py-16'
    >
      {/* Main Heading */}
      <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-4xl font-bold flex">
        <span className="mr-2">🤖</span>
        <span className="bg-gradient-to-r from-purple-400 via-pink-500 to-cyan-400 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(168,85,247,0.4)]">
          AI-Powered Grievance Redressal
        </span>
      </h1>

      {/* Subheading */}
      <p className={`text-sm sm:text-base md:text-lg mt-4 font-medium transition-colors duration-300 ${
        isDark ? 'text-gray-300' : 'text-gray-700'
      }`}>
        Intelligent Classification — <span className="text-purple-400">Zero Human Intervention</span>
      </p>

      {/* Description */}
      <p className={`text-xs sm:text-sm md:text-base mt-3 max-w-2xl mx-auto lg:mx-0 transition-colors duration-300 ${
        isDark ? 'text-gray-400' : 'text-gray-600'
      }`}>
        Stop wasting time on manual complaint sorting. Our AI reads, understands, and routes
        citizen grievances to the exact department automatically.
      </p>

      {/* Features List */}
      <div className="mt-5 space-y-2 sm:space-y-3">
        <div className="flex items-center gap-2 sm:gap-3 justify-center lg:justify-start">
          <span className="text-purple-400 text-sm sm:text-base">✨</span>
          <span className={`text-xs sm:text-sm transition-colors duration-300 ${
            isDark ? 'text-gray-300' : 'text-gray-700'
          }`}>BERT-based NLP classification</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 justify-center lg:justify-start">
          <span className="text-purple-400 text-sm sm:text-base">⚡</span>
          <span className={`text-xs sm:text-sm transition-colors duration-300 ${
            isDark ? 'text-gray-300' : 'text-gray-700'
          }`}>Real-time priority scoring</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 justify-center lg:justify-start">
          <span className="text-purple-400 text-sm sm:text-base">🎯</span>
          <span className={`text-xs sm:text-sm transition-colors duration-300 ${
            isDark ? 'text-gray-300' : 'text-gray-700'
          }`}>Auto-routing to 15+ departments</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 justify-center lg:justify-start">
          <span className="text-purple-400 text-sm sm:text-base">🌐</span>
          <span className={`text-xs sm:text-sm transition-colors duration-300 ${
            isDark ? 'text-gray-300' : 'text-gray-700'
          }`}>Hindi + English bilingual support</span>
        </div>
      </div>
    </motion.div>
  )
}

export default LeftSection