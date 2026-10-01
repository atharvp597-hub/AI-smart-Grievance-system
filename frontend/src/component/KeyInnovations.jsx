import { motion } from 'framer-motion'
import { useTheme } from '../context/ThemeContext'

function KeyInnovations() {
  const { isDark } = useTheme()
  
  const innovations = [
    {
      icon: "🚀",
      stat: "40-60%",
      label: "FASTER PROCESSING",
      description: "Replacing manual sorting with autonomous, intelligent routing.",
      color: "from-cyan-500 to-blue-500"
    },
    {
      icon: "🎯",
      stat: "Errors↓",
      label: "MISROUTING MINIMIZED",
      description: "BERT-powered classification to the exact department responsible.",
      color: "from-teal-500 to-cyan-500"
    },
    {
      icon: "⚡",
      stat: "24/7",
      label: "AUTOMATED ROUTING",
      description: "Microservices architecture ready for nationwide deployment.",
      color: "from-blue-500 to-indigo-500"
    },
    {
      icon: "🌐",
      stat: "Multilingual",
      label: "SUPPORT",
      description: "Native support for Hindi and English with seamless translation.",
      color: "from-purple-500 to-pink-500"
    }
  ]

  const features = [
    {
      icon: "🗣️",
      title: "Multilingual",
      description: "Native support for Hindi and English with seamless translation."
    },
    {
      icon: "🚨",
      title: "Emergency Detection",
      description: "Instantly flags critical issues like accidents or medical emergencies."
    },
    {
      icon: "🧠",
      title: "Smart Routing",
      description: "BERT-powered classification to the exact department responsible."
    },
  ]

  return (
    <section id="key-innovations" className={`py-16 px-4 sm:px-6 transition-colors duration-300 ${
      isDark ? 'bg-[#0F1729]' : 'bg-[#F9FAFB]'
    }`}>
      <div className="max-w-7xl mx-auto">
        
        {/* Section Title */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold bg-gradient-to-r from-cyan-400 to-teal-400 bg-clip-text text-transparent">
            Key Innovations
          </h2>
          <p className={`mt-3 max-w-2xl mx-auto transition-colors duration-300 ${
            isDark ? 'text-gray-400' : 'text-gray-600'
          }`}>
            Replacing manual sorting with autonomous, intelligent routing
          </p>
        </motion.div>

        {/* Stats Cards Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-12 items-center">
          {innovations.map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: idx * 0.1 }}
              viewport={{ once: true }}
              className={`backdrop-blur-sm border rounded-xl p-4 sm:p-6 text-center transition-all duration-300 hover:scale-105 ${
                isDark 
                  ? 'bg-gray-900/50 border-gray-800 hover:border-cyan-500/50' 
                  : 'bg-white border-gray-200 hover:border-cyan-400 shadow-sm'
              }`}
            >
              <div className="text-3xl sm:text-4xl mb-2">{item.icon}</div>
              <div className={`text-2xl sm:text-3xl font-bold bg-gradient-to-r ${item.color} bg-clip-text text-transparent`}>
                {item.stat}
              </div>
              <div className={`text-xs sm:text-sm font-semibold mt-1 transition-colors duration-300 ${
                isDark ? 'text-gray-300' : 'text-gray-700'
              }`}>{item.label}</div>
              <p className={`text-[10px] sm:text-xs mt-2 hidden sm:block transition-colors duration-300 ${
                isDark ? 'text-gray-500' : 'text-gray-500'
              }`}>{item.description}</p>
            </motion.div>
          ))}
        </div>

        {/* Features Grid Row */}
        <div className="grid gap-4 sm:gap-6 justify-center [grid-template-columns:repeat(auto-fit,minmax(250px,1fr))] max-w-5xl mx-auto">
          {features.map((feature, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: idx * 0.1 }}
              viewport={{ once: true }}
              className={`border rounded-xl p-4 sm:p-5 transition-all duration-300 ${
                isDark 
                  ? 'bg-gray-900/30 border-gray-800 hover:border-cyan-500/30' 
                  : 'bg-white border-gray-200 hover:border-cyan-400 shadow-sm'
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="text-2xl sm:text-3xl">{feature.icon}</div>
                <h3 className={`font-semibold text-sm sm:text-base transition-colors duration-300 ${
                  isDark ? 'text-white' : 'text-gray-800'
                }`}>{feature.title}</h3>
              </div>
              <p className={`text-xs sm:text-sm leading-relaxed transition-colors duration-300 ${
                isDark ? 'text-gray-400' : 'text-gray-600'
              }`}>
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Bottom Note */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          viewport={{ once: true }}
          className="text-center mt-10"
        >
          {/* Empty - kept for structure */}
        </motion.div>
      </div>
    </section>
  )
}

export default KeyInnovations