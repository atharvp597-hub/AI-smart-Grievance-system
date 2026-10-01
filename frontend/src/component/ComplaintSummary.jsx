/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Loader, AlertCircle, Copy, Check } from 'lucide-react';
import { complaintAPI } from '../utils/api';

export default function ComplaintSummary({ complaintId, isDark }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const fetchSummary = useCallback(async () => {
    if (!complaintId) return;

    setLoading(true);
    setError(null);
    try {
      const response = await complaintAPI.getSummary(complaintId);
      if (response.success && response.data) {
        setSummary(response.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to generate summary');
    } finally {
      setLoading(false);
    }
  }, [complaintId]);

  useEffect(() => {
    void fetchSummary();
  }, [fetchSummary]);

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-lg p-4 ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-blue-50 border border-blue-200'}`}
      >
        <div className="flex items-center gap-2">
          <Loader className="animate-spin" size={20} />
          <span className={isDark ? 'text-gray-400' : 'text-blue-900'}>Generating summary...</span>
        </div>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-lg p-4 ${isDark ? 'bg-red-900/30 border border-red-700' : 'bg-red-50 border border-red-200'}`}
      >
        <div className="flex items-center gap-2">
          <AlertCircle size={20} className={isDark ? 'text-red-400' : 'text-red-600'} />
          <span className={isDark ? 'text-red-400' : 'text-red-900'}>{error}</span>
        </div>
      </motion.div>
    );
  }

  if (!summary) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-lg p-6 ${isDark ? 'bg-gradient-to-br from-indigo-900/30 to-purple-900/30 border border-indigo-700' : 'bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200'}`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <FileText size={24} className={isDark ? 'text-indigo-400' : 'text-indigo-600'} />
          <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            📝 AI-Generated Summary
          </h3>
        </div>
      </div>

      {/* Summary Display */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className={`p-4 rounded-lg mb-4 ${isDark ? 'bg-gray-800/50' : 'bg-white/50'}`}
      >
        <p className={`text-sm leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>
          {summary.summary}
        </p>
      </motion.div>

      <div className="grid gap-3 md:grid-cols-2 mb-4">
        <div className={`p-3 rounded-lg border ${isDark ? 'border-indigo-700 bg-gray-800/40' : 'border-indigo-200 bg-white/70'}`}>
          <p className={`text-xs font-semibold uppercase ${isDark ? 'text-indigo-300' : 'text-indigo-700'}`}>AI Reasoning</p>
          <p className={`text-sm mt-1 ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>
            {summary.reasoning || 'Local ML analysis used for this complaint.'}
          </p>
        </div>
        <div className={`p-3 rounded-lg border ${isDark ? 'border-amber-700 bg-gray-800/40' : 'border-amber-200 bg-white/70'}`}>
          <p className={`text-xs font-semibold uppercase ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>Urgency</p>
          <p className={`text-sm mt-1 ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>
            {summary.urgency || 'Review recommended by AI analysis.'}
          </p>
        </div>
      </div>

      {/* Copy Button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => handleCopy(summary.summary)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition ${
          copied
            ? 'bg-green-600 text-white'
            : isDark
            ? 'bg-gray-700 hover:bg-gray-600 text-gray-200'
            : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
        }`}
      >
        {copied ? <Check size={16} /> : <Copy size={16} />}
        {copied ? 'Copied!' : 'Copy Summary'}
      </motion.button>

      {/* Metadata */}
      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
        <div className={`p-2 rounded ${isDark ? 'bg-gray-800' : 'bg-white/50'}`}>
          <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Department</p>
          <p className={`font-semibold ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>
            {summary.department}
          </p>
        </div>
        <div className={`p-2 rounded ${isDark ? 'bg-gray-800' : 'bg-white/50'}`}>
          <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Priority</p>
          <p className={`font-semibold ${
            summary.priority === 'High'
              ? 'text-red-500'
              : summary.priority === 'Medium'
              ? 'text-yellow-500'
              : 'text-green-500'
          }`}>
            {summary.priority}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
