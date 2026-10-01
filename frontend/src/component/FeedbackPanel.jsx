import { useEffect, useState } from 'react'
import { MessageSquare } from 'lucide-react'
import { useSubmitFeedback } from '../hooks/useAPI'

const DEPARTMENT_OPTIONS = [
  'Water',
  'Electricity',
  'Roads',
  'Garbage',
  'Drainage',
  'Sanitation',
  'Transport',
  'Street Light',
  'Health',
  'Police',
  'General',
]

function FeedbackPanel({ complaint, isDark }) {
  const { submit, isLoading, error } = useSubmitFeedback()
  const [formData, setFormData] = useState({
    correct_department: complaint?.department || 'General',
    text: '',
  })
  const [message, setMessage] = useState('')

  useEffect(() => {
    setFormData({
      correct_department: complaint?.department || 'General',
      text: '',
    })
    setMessage('')
  }, [complaint?.complaint_id, complaint?.department])

  if (!complaint?.complaint_id) return null

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setMessage('')

    try {
      await submit({
        complaint_id: complaint.complaint_id,
        correct_department: formData.correct_department,
        text: formData.text.trim(),
      })
      setMessage('Feedback submitted. Thank you for helping improve the system.')
      setFormData((prev) => ({
        ...prev,
        text: '',
      }))
    } catch {
      // Error state is handled by the hook and surfaced below.
    }
  }

  return (
    <div className={`rounded-lg border p-4 ${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
      <div className="mb-4 flex items-center gap-3">
        <MessageSquare size={20} className={isDark ? 'text-cyan-300' : 'text-cyan-600'} />
        <div>
          <h3 className="text-lg font-bold">Share Feedback</h3>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Tell us if the routing looks right or suggest a better department.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={`mb-2 block text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            Suggested Department
          </label>
          <select
            name="correct_department"
            value={formData.correct_department}
            onChange={handleChange}
            className={`w-full rounded-lg border px-3 py-2 ${isDark ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300 bg-white text-gray-900'}`}
          >
            {DEPARTMENT_OPTIONS.map((department) => (
              <option key={department} value={department}>
                {department}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={`mb-2 block text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            Feedback
          </label>
          <textarea
            name="text"
            value={formData.text}
            onChange={handleChange}
            required
            minLength={3}
            maxLength={2000}
            rows={4}
            className={`w-full rounded-lg border px-3 py-2 resize-none ${isDark ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'}`}
            placeholder="Example: The complaint was classified correctly, or this should go to Roads instead of Water."
          />
          <p className={`mt-1 text-xs ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
            {formData.text.length}/2000 characters
          </p>
        </div>

        {message && (
          <div className={`rounded-lg border px-3 py-2 text-sm ${isDark ? 'border-green-800 bg-green-950/30 text-green-200' : 'border-green-200 bg-green-50 text-green-800'}`}>
            {message}
          </div>
        )}

        {error && (
          <div className={`rounded-lg border px-3 py-2 text-sm ${isDark ? 'border-red-800 bg-red-950/30 text-red-200' : 'border-red-200 bg-red-50 text-red-800'}`}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition ${
            isLoading
              ? 'cursor-not-allowed bg-gray-500 opacity-60'
              : 'bg-linear-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700'
          }`}
        >
          {isLoading ? 'Submitting...' : 'Submit Feedback'}
        </button>
      </form>
    </div>
  )
}

export default FeedbackPanel
