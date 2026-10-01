import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, Brain, ChevronDown, MapPin, Signal, Sparkles, Globe } from 'lucide-react'

function getLanguageLabel(language, originalLanguage) {
  const current = String(language || '').toLowerCase()
  const source = String(originalLanguage || language || '').toLowerCase()

  if (current === 'en' && source && source !== 'en') {
    if (source === 'hi') return 'English (translated from Hindi)'
    if (source === 'hi-roman') return 'English (translated from Hinglish)'
    if (source === 'mixed') return 'English (translated from mixed input)'
    return `English (translated from ${source})`
  }

  if (current === 'hi') return 'Hindi'
  if (current === 'en') return 'English'
  if (current === 'hi-roman') return 'Hinglish'
  if (current === 'mixed') return 'Mixed Language'
  return 'Unknown'
}

function normalizePriority(priority) {
  return String(priority || 'MEDIUM').toUpperCase()
}

const CONFIDENCE_TEXT_CLASS = {
  green: 'text-green-600 dark:text-green-400',
  yellow: 'text-yellow-600 dark:text-yellow-400',
  red: 'text-red-600 dark:text-red-400',
}

const CONFIDENCE_BAR_CLASS = {
  green: 'bg-gradient-to-r from-green-400 to-green-600',
  yellow: 'bg-gradient-to-r from-yellow-400 to-orange-500',
  red: 'bg-gradient-to-r from-red-400 to-red-600',
}

const PRIORITY_BADGE_CLASS = {
  HIGH: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  MEDIUM: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  LOW: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
}

export default function AIExplanationPanel({ complaint }) {
  const [isExpanded, setIsExpanded] = useState(false)

  if (!complaint) return null

  const {
    department = 'Unknown',
    priority = 'MEDIUM',
    confidence = 0,
    severity_score = 0,
    severity_reasons = [],
    language = 'unknown',
    original_language = null,
    is_low_confidence = false,
  } = complaint

  const normalizedPriority = normalizePriority(priority)
  const confidencePct = Math.round(Number(confidence || 0) * 100)
  const safeSeverityScore = Math.max(0, Math.min(Number(severity_score || 0), 10))
  const severityPct = Math.round((safeSeverityScore / 10) * 100)
  const confidenceColor =
    confidencePct >= 80 ? 'green' : confidencePct >= 60 ? 'yellow' : 'red'
  const languageLabel = getLanguageLabel(language, original_language)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-4 rounded-lg border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-4 dark:border-gray-700 dark:from-gray-800 dark:to-gray-900"
    >
      <button
        onClick={() => setIsExpanded((prev) => !prev)}
        className="flex w-full items-center justify-between transition hover:opacity-80"
      >
        <div className="flex items-center gap-3">
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.3 }}
          >
            <Brain size={24} className="text-blue-600 dark:text-blue-400" />
          </motion.div>
          <div className="text-left">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">AI Analysis</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {department} • {normalizedPriority} Priority
            </p>
          </div>
        </div>
        <motion.div animate={{ rotate: isExpanded ? 180 : 0 }}>
          <ChevronDown size={20} className="text-gray-600 dark:text-gray-400" />
        </motion.div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-4 space-y-4 border-t border-blue-200 pt-4 dark:border-gray-700"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                  <Signal size={14} />
                  Confidence
                </label>
                <span className={`text-sm font-bold ${CONFIDENCE_TEXT_CLASS[confidenceColor]}`}>
                  {confidencePct}%
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-300 dark:bg-gray-700">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${confidencePct}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className={`h-full ${CONFIDENCE_BAR_CLASS[confidenceColor]}`}
                />
              </div>
              {is_low_confidence && (
                <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                  Low confidence - may need manual review
                </p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                  <AlertTriangle size={14} />
                  Severity
                </label>
                <span className="text-sm font-bold text-red-600 dark:text-red-400">
                  {safeSeverityScore}/10
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-300 dark:bg-gray-700">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${severityPct}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className="h-full bg-gradient-to-r from-orange-400 to-red-600"
                />
              </div>
            </div>

            {severity_reasons && severity_reasons.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Severity Factors
                </label>
                <div className="flex flex-wrap gap-2">
                  {severity_reasons.map((reason, idx) => (
                    <motion.span
                      key={`${reason}-${idx}`}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.08 }}
                      className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-800 dark:bg-red-900 dark:text-red-200"
                    >
                      {reason}
                    </motion.span>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                <Globe size={14} />
                Language Detected
              </label>
              <p className="mt-1 text-sm capitalize text-gray-600 dark:text-gray-400">
                {languageLabel}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className={`rounded-lg px-3 py-1 text-sm font-bold ${PRIORITY_BADGE_CLASS[normalizedPriority] || PRIORITY_BADGE_CLASS.MEDIUM}`}>
                {normalizedPriority} Priority
              </span>
              <span className="rounded-lg bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                <span className="inline-flex items-center gap-1">
                  <MapPin size={14} />
                  {department}
                </span>
              </span>
            </div>

            <div className="rounded-lg bg-blue-100 p-3 dark:bg-blue-900">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                <strong className="inline-flex items-center gap-1">
                  <Sparkles size={14} />
                  AI Insight:
                </strong>{' '}
                This complaint has been analyzed using multilingual AI models to estimate urgency, assign a department, and highlight cases that need faster attention.
              </p>
            </div>

            {(complaint.ai_summary || complaint.ai_reasoning || complaint.ai_urgency) && (
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-lg border border-cyan-200 bg-white/70 p-3 dark:border-cyan-800 dark:bg-gray-950/40">
                  <p className="text-xs font-semibold uppercase text-cyan-600 dark:text-cyan-300">Summary</p>
                  <p className="mt-1 text-sm text-gray-800 dark:text-gray-200">
                    {complaint.ai_summary || 'AI summary unavailable.'}
                  </p>
                </div>
                <div className="rounded-lg border border-violet-200 bg-white/70 p-3 dark:border-violet-800 dark:bg-gray-950/40">
                  <p className="text-xs font-semibold uppercase text-violet-600 dark:text-violet-300">Reasoning</p>
                  <p className="mt-1 text-sm text-gray-800 dark:text-gray-200">
                    {complaint.ai_reasoning || 'Local reasoning only.'}
                  </p>
                </div>
                <div className="rounded-lg border border-amber-200 bg-white/70 p-3 dark:border-amber-800 dark:bg-gray-950/40">
                  <p className="text-xs font-semibold uppercase text-amber-600 dark:text-amber-300">Urgency</p>
                  <p className="mt-1 text-sm text-gray-800 dark:text-gray-200">
                    {complaint.ai_urgency || 'Urgency inferred from ML severity.'}
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
