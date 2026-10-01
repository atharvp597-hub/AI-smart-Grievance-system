import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

const EMERGENCY_KEYWORDS = [
  'fire', 'फायर', 'आग',
  'hospital', 'हॉस्पिटल', 'अस्पताल',
  'accident', 'एक्सीडेंट', 'दुर्घटना',
  'electrocution', 'इलेक्ट्रोक्यूशन', 'बिजली का झटका',
  'contamination', 'प्रदूषण',
  'gas leak', 'गैस रिसाव',
  'flood', 'बाढ़',
  'sewage', 'सीवेज',
  'collapse', 'गिरना',
  'danger', 'डेंजर', 'खतरा',
  'critical', 'गंभीर',
  'urgent', 'आपात',
  'emergency', 'इमरजेंसी'
];

export default function EmergencyBanner({ complaint }) {
  const isEmergency = complaint && EMERGENCY_KEYWORDS.some(keyword =>
    complaint.description?.toLowerCase().includes(keyword.toLowerCase())
  );

  if (!isEmergency) return null;

  return (
    <motion.div
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -100, opacity: 0 }}
      className="fixed top-0 left-0 right-0 z-40"
    >
      <motion.div
        animate={{
          backgroundColor: ['rgb(239, 68, 68)', 'rgb(220, 38, 38)', 'rgb(239, 68, 68)'],
        }}
        transition={{
          duration: 0.6,
          repeat: Infinity,
        }}
        className="bg-red-600 text-white px-4 py-4 flex items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 0.5, repeat: Infinity }}
          >
            <AlertTriangle size={28} className="flex-shrink-0" />
          </motion.div>
          <div>
            <p className="font-bold text-lg">🚨 EMERGENCY ALERT</p>
            <p className="text-sm opacity-90">
              This complaint has been automatically escalated to emergency response team
            </p>
          </div>
        </div>
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
          className="text-xl font-bold flex-shrink-0"
        >
          ⚡
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
