import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import { useComplaints, useComplaint } from '../hooks/useAPI'
import { useAuth } from '../context/AuthContext'
import { API_BASE_URL, buildAssetUrl, getAuthState } from '../utils/api'
import EmergencyBanner from '../component/EmergencyBanner'
import AIExplanationPanel from '../component/AIExplanationPanel'
import ComplaintSummary from '../component/ComplaintSummary'
import FeedbackPanel from '../component/FeedbackPanel'
import ImageAttachment from '../component/ImageAttachment'
import { motion } from 'framer-motion'

function ComplaintTracking() {
  const { isDark } = useTheme()
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [selectedId, setSelectedId] = useState(null)
  const [searchId, setSearchId] = useState('')
  const [submissionNotice, setSubmissionNotice] = useState(null)

  const { complaints, isLoading, error, refetch } = useComplaints(undefined, true)
  const { complaint: selectedComplaint, refetch: refetchSelectedComplaint } = useComplaint(selectedId)

  const wsBase = useMemo(() => {
    if (API_BASE_URL.startsWith('http://')) return API_BASE_URL.replace('http://', 'ws://').replace('/api', '')
    if (API_BASE_URL.startsWith('https://')) return API_BASE_URL.replace('https://', 'wss://').replace('/api', '')
    return `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}`
  }, [])

  useEffect(() => {
    const auth = getAuthState()
    if (!auth?.token || !selectedId) return undefined

    const socket = new WebSocket(`${wsBase}/api/ws/complaints/${selectedId}?token=${encodeURIComponent(auth.token)}`)

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data)
        if (payload?.type === 'complaint_status_updated' && payload.complaint_id === selectedId) {
          refetch()
          refetchSelectedComplaint()
        }
      } catch {
        // ignore malformed payloads
      }
    }

    return () => socket.close()
  }, [selectedId, refetch, refetchSelectedComplaint, wsBase])

  useEffect(() => {
    const submittedComplaint = location.state?.submittedComplaint
    if (!submittedComplaint?.complaintId) return

    setSelectedId(submittedComplaint.complaintId)
    setSearchId(submittedComplaint.complaintId)
    setSubmissionNotice(submittedComplaint)

    const timer = setTimeout(() => {
      setSubmissionNotice(null)
      navigate(location.pathname, { replace: true, state: {} })
    }, 5000)

    return () => clearTimeout(timer)
  }, [location.pathname, location.state, navigate])

  const handleSearch = (id) => {
    if (id.trim()) {
      setSelectedId(id.trim())
    }
  }

  const filteredComplaints = complaints.filter(
    (c) => searchId === '' || c.complaint_id.toLowerCase().includes(searchId.toLowerCase()),
  )

  const statusColors = {
    PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    IN_PROGRESS: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    RESOLVED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  }

  const priorityColors = {
    LOW: 'text-green-600',
    MEDIUM: 'text-yellow-600',
    HIGH: 'text-red-600',
  }

  const renderLocation = (locationDetails) => {
    if (typeof locationDetails?.latitude !== 'number' || typeof locationDetails?.longitude !== 'number') {
      return null
    }

    return (
      <div>
        <p className={`text-xs font-semibold uppercase ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          Reported Location
        </p>
        <div className={`mt-2 rounded-lg border p-3 text-sm ${isDark ? 'border-emerald-900 bg-emerald-950/20 text-emerald-100' : 'border-emerald-200 bg-emerald-50 text-emerald-900'}`}>
          <p className="font-semibold">
            {locationDetails.latitude.toFixed(6)}, {locationDetails.longitude.toFixed(6)}
          </p>
          {typeof locationDetails.accuracy === 'number' && (
            <p className="mt-1 text-xs opacity-80">Accuracy: {Math.round(locationDetails.accuracy)} meters</p>
          )}
          {locationDetails.captured_at && (
            <p className="mt-1 text-xs opacity-80">
              Captured at: {new Date(locationDetails.captured_at).toLocaleString()}
            </p>
          )}
          <a
            href={`https://www.google.com/maps?q=${locationDetails.latitude},${locationDetails.longitude}`}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-block text-xs font-semibold underline"
          >
            Open in Maps
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen py-20 px-4 ${isDark ? 'bg-[#0F1729]' : 'bg-gray-50'}`}>
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-bold text-center mb-12">
          <span className="bg-linear-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent">
            Track Your Complaint
          </span>
        </h1>

        {submissionNotice && (
          <div className={`mb-6 rounded-xl border px-4 py-4 shadow-sm ${isDark ? 'border-green-800 bg-green-950/30 text-green-100' : 'border-green-200 bg-green-50 text-green-900'}`}>
            <p className="font-semibold">Complaint submitted successfully.</p>
            <p className="mt-1 text-sm">
              Tracking ID: <span className="font-mono">{submissionNotice.complaintId}</span>
            </p>
            <p className="mt-1 text-sm">
              Department: {submissionNotice.department} | Priority: {submissionNotice.priority}
            </p>
          </div>
        )}

        <div className="mb-8 flex gap-2">
          <input
            type="text"
            placeholder="Enter Complaint ID (e.g., CMP-ABC1234567)"
            value={searchId}
            onChange={(e) => setSearchId(e.target.value)}
            className={`flex-1 px-4 py-2 rounded-lg border ${
              isDark
                ? 'bg-gray-700 border-gray-600 text-white'
                : 'bg-white border-gray-300 text-black'
            }`}
          />
          <button
            onClick={() => handleSearch(searchId)}
            className="px-6 py-2 bg-linear-to-r from-cyan-500 to-blue-600 text-white rounded-lg hover:opacity-90"
          >
            Search
          </button>
          <button
            onClick={refetch}
            className={`px-6 py-2 rounded-lg border ${
              isDark
                ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                : 'border-gray-300 text-gray-700 hover:bg-gray-100'
            }`}
          >
            Refresh
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-100 text-red-800 rounded-lg">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
                <p className={`mt-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Loading complaints...</p>
              </div>
            ) : filteredComplaints.length === 0 ? (
              <div className={`text-center py-12 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
                <p className={`text-lg ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  {user?.name ? `${user.name}, no complaints found yet.` : 'No complaints found'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredComplaints.map((complaint) => (
                  <div
                    key={complaint.complaint_id}
                    onClick={() => setSelectedId(complaint.complaint_id)}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedId === complaint.complaint_id
                        ? 'border-cyan-500 ' + (isDark ? 'bg-gray-800' : 'bg-cyan-50')
                        : isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-bold text-sm">{complaint.complaint_id}</p>
                        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                          {complaint.name}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[complaint.status] || 'bg-gray-100'}`}>
                        {complaint.status}
                      </span>
                    </div>
                    <p className={`text-sm mb-2 line-clamp-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      {complaint.description}
                    </p>
                    {(complaint.ai_summary || complaint.ai_urgency) && (
                      <div className={`mb-2 rounded-md px-3 py-2 text-xs ${isDark ? 'bg-cyan-950/40 text-cyan-100' : 'bg-cyan-50 text-cyan-900'}`}>
                        <p className="font-semibold">AI Summary</p>
                        <p className="line-clamp-2">{complaint.ai_summary || 'Summary unavailable.'}</p>
                        {complaint.ai_urgency && <p className="mt-1 font-medium">Urgency: {complaint.ai_urgency}</p>}
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <div className="flex gap-3 text-xs">
                        <span className={`font-semibold ${priorityColors[complaint.priority] || 'text-gray-600'}`}>
                          {complaint.priority}
                        </span>
                        <span className={isDark ? 'text-gray-500' : 'text-gray-600'}>
                          {complaint.department}
                        </span>
                      </div>
                      <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
                        {new Date(complaint.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-1 space-y-4">
            {selectedComplaint ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <EmergencyBanner complaint={selectedComplaint} />
                <AIExplanationPanel complaint={selectedComplaint} />
                <ComplaintSummary complaintId={selectedComplaint.complaint_id} isDark={isDark} />
                <FeedbackPanel complaint={selectedComplaint} isDark={isDark} />

                {(selectedComplaint.ai_summary || selectedComplaint.ai_reasoning || selectedComplaint.ai_urgency) && (
                  <div className={`rounded-lg border p-4 ${isDark ? 'border-cyan-800 bg-cyan-950/20' : 'border-cyan-200 bg-cyan-50'}`}>
                    <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-cyan-600 dark:text-cyan-300">Gemini Insights</h3>
                    <div className="space-y-3 text-sm">
                      <div>
                        <p className="font-semibold">AI Summary</p>
                        <p className={`${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{selectedComplaint.ai_summary || 'Unavailable'}</p>
                      </div>
                      <div>
                        <p className="font-semibold">AI Reasoning</p>
                        <p className={`${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{selectedComplaint.ai_reasoning || 'Unavailable'}</p>
                      </div>
                      <div>
                        <p className="font-semibold">Urgency</p>
                        <p className={`${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{selectedComplaint.ai_urgency || 'Unavailable'}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className={`rounded-lg p-6 ${isDark ? 'bg-gray-800' : 'bg-white'} border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                  <h2 className="text-xl font-bold mb-4">Complaint Details</h2>

                  <div className="space-y-4">
                    {selectedComplaint.image_url && (
                      <div>
                        <p className={`text-xs font-semibold uppercase ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                          Uploaded Image
                        </p>
                        <ImageAttachment
                          src={buildAssetUrl(selectedComplaint.image_url)}
                          alt={selectedComplaint.image_filename || 'Complaint evidence'}
                          filename={selectedComplaint.image_filename}
                          isDark={isDark}
                        />
                      </div>
                    )}

                    {renderLocation(selectedComplaint.location)}

                    <div>
                      <p className={`text-xs font-semibold uppercase ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        ID
                      </p>
                      <p className="font-mono text-sm">{selectedComplaint.complaint_id}</p>
                    </div>

                    <div>
                      <p className={`text-xs font-semibold uppercase ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        Status
                      </p>
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${statusColors[selectedComplaint.status] || 'bg-gray-100'}`}>
                        {selectedComplaint.status}
                      </span>
                    </div>

                    <div>
                      <p className={`text-xs font-semibold uppercase ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        Submitted
                      </p>
                      <p className="text-sm">
                        {new Date(selectedComplaint.created_at).toLocaleString()}
                      </p>
                    </div>

                    <div>
                      <p className={`text-xs font-semibold uppercase ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        Last Updated
                      </p>
                      <p className="text-sm">
                        {new Date(selectedComplaint.updated_at).toLocaleString()}
                      </p>
                    </div>

                    {(selectedComplaint.status_history || []).length > 0 && (
                      <div>
                        <p className={`text-xs font-semibold uppercase ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                          Status Timeline
                        </p>
                        <div className="mt-3 space-y-3">
                          {(selectedComplaint.status_history || []).map((entry, index) => (
                            <div
                              key={`${selectedComplaint.complaint_id}-status-history-${index}`}
                              className={`rounded-lg border p-3 ${isDark ? 'border-gray-700 bg-gray-900/50' : 'border-gray-200 bg-gray-50'}`}
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${statusColors[entry.status] || 'bg-gray-100'}`}>
                                  {entry.status}
                                </span>
                                <p className="text-xs opacity-75">
                                  {entry.updated_at ? new Date(entry.updated_at).toLocaleString() : 'Timestamp unavailable'}
                                </p>
                              </div>
                              {entry.reviewed_by?.name && (
                                <p className="mt-2 text-xs opacity-80">
                                  Updated by: {entry.reviewed_by.name}
                                </p>
                              )}
                              {entry.image_url && (
                                <ImageAttachment
                                  src={buildAssetUrl(entry.image_url)}
                                  alt={entry.image_filename || `Status update ${entry.status}`}
                                  filename={entry.image_filename}
                                  isDark={isDark}
                                  imageClassName="w-full rounded-lg border object-cover"
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className={`rounded-lg p-6 text-center ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
                <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                  Select a complaint to view details
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ComplaintTracking
