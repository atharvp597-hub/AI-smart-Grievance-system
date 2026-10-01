import { motion } from 'framer-motion'
import { useTheme } from '../context/ThemeContext'

function RightSection() {
  const { isDark } = useTheme()

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="py-16"
    >
      <div className={`rounded-2xl border p-6 shadow-xl transition-all duration-300 ${
        isDark 
          ? 'bg-gradient-to-br from-gray-900/80 to-gray-800/40 border-purple-500/30' 
          : 'bg-gradient-to-br from-gray-100 to-white border-purple-300'
      }`}>
        
        <div className="text-center mb-5">
          <span className={`text-xs font-mono px-3 py-1 rounded-full ${
            isDark 
              ? 'text-purple-400 bg-purple-500/10' 
              : 'text-purple-600 bg-purple-100'
          }`}>
            BERT Transformers • HuggingFace
          </span>
        </div>

        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <span className="text-cyan-400 text-lg">🧠</span>
            <div>
              <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                Semantic Understanding
              </p>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                State-of-the-art NLP for multi-class classification
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <span className="text-yellow-400 text-lg">⚡</span>
            <div>
              <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                Urgency & Priority Detection
              </p>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Sentiment analysis + emotion scoring
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <span className="text-green-400 text-lg">🌐</span>
            <div>
              <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                Multilingual NLP
              </p>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Hindi-English translation + cross-lingual models
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <span className="text-purple-400 text-lg">🎯</span>
            <div>
              <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                Smart Auto-Routing
              </p>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Department mapping based on grievance type
              </p>
            </div>
          </div>
        </div>

        <div className={`my-5 h-px ${
          isDark 
            ? 'bg-gradient-to-r from-transparent via-purple-500/50 to-transparent' 
            : 'bg-gradient-to-r from-transparent via-purple-400 to-transparent'
        }`}></div>

        <div className="text-center">
          <p className={`text-xs tracking-wide ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            🇮🇳 VISION 2047 • VIKSIT BHARAT
          </p>
          <p className={`text-[11px] mt-1 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
            From complaint to resolution — in seconds.
          </p>
        </div>
      </div>
    </motion.div>
  )
}

export default RightSection