import { motion } from 'framer-motion'

const AboutSection = () => {
  return (
    <motion.section
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-[#0F1729] py-20 px-4 sm:px-6 border-t border-cyan-500/20"
      id="about-section"
    >
      <div className="max-w-7xl mx-auto text-center">
        <h2 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-sky-400 to-teal-400 bg-clip-text text-transparent">
          About JanSeva AI
        </h2>
        
        <div className="max-w-4xl mx-auto text-left space-y-5 text-gray-300 mt-8 text-base sm:text-lg">
          <p>
            In many municipalities, citizens face severe delays in grievance redressal because complaints are routed manually. 
            A pothole complaint might sit in a general inbox for weeks before someone reads it and forwards it to the Roads department. 
            Sometimes, critical issues like sparking transformers are lost in the noise.
          </p>
          <p>
            <span className="text-cyan-400 font-semibold">JanSeva AI</span> was built to solve this bottleneck. 
            By leveraging natural language processing, our system automatically reads the text of a complaint the moment it is submitted. 
            It instantly identifies the category (Electricity, Water, Roads, Sanitation) and detects urgency (High, Medium, Low priority).
          </p>
          <p>
            This ensures that an emergency electrical issue is immediately flagged in red on the Electricity Department's dashboard, 
            while routine garbage collection requests are neatly organized for the Sanitation team. 
            <span className="text-teal-400 font-medium">The result? Faster response times, better resource allocation, and happier citizens.</span>
          </p>
        </div>

        {/* Cards */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/5 p-6 rounded-xl hover:bg-white/10 transition-all">
            <div className="text-4xl mb-3">🤖</div>
            <h3 className="text-cyan-400 text-xl font-bold">AI Powered</h3>
            <p className="text-gray-400 mt-2">Automatic classification & smart routing to departments</p>
          </div>
          <div className="bg-white/5 p-6 rounded-xl hover:bg-white/10 transition-all">
            <div className="text-4xl mb-3">⚡</div>
            <h3 className="text-cyan-400 text-xl font-bold">Real-time</h3>
            <p className="text-gray-400 mt-2">Live complaint tracking and instant updates</p>
          </div>
          <div className="bg-white/5 p-6 rounded-xl hover:bg-white/10 transition-all">
            <div className="text-4xl mb-3">🎯</div>
            <h3 className="text-cyan-400 text-xl font-bold">Smart Priority</h3>
            <p className="text-gray-400 mt-2">Automatic urgency detection (High/Medium/Low)</p>
          </div>
        </div>
      </div>
    </motion.section>
  )
}

export default AboutSection