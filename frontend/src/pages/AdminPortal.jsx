/* eslint-disable react-hooks/set-state-in-effect */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTheme } from '../context/ThemeContext'
import { adminAPI, buildAssetUrl } from '../utils/api'
import ImageAttachment from '../component/ImageAttachment'

const STATUS_OPTIONS = ['PENDING', 'IN_PROGRESS', 'RESOLVED', 'REJECTED']
const ALL_CATEGORIES = 'ALL'

function normalizeCategory(category) {
  return category?.trim() || 'General'
}

function hasCoordinates(location) {
  return typeof location?.latitude === 'number' && typeof location?.longitude === 'number'
}

function AdminPortal() {
  const { isDark } = useTheme()
  const [complaints, setComplaints] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeId, setActiveId] = useState('')
  const [selectedCategory, setSelectedCategory] = useState(ALL_CATEGORIES)
  const [statusImages, setStatusImages] = useState({})
  const [imageInputKeys, setImageInputKeys] = useState({})
  const statusImagesRef = useRef({})

  const loadComplaints = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const res = await adminAPI.getComplaints()
      setComplaints(res.data || [])
    } catch (err) {
      setError(err.message || 'Failed to load complaints')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadComplaints()
  }, [loadComplaints])

  useEffect(() => {
    statusImagesRef.current = statusImages
  }, [statusImages])

  const categoryOptions = useMemo(() => (
    [...new Set(complaints.map((complaint) => normalizeCategory(complaint.category)))]
      .sort((first, second) => first.localeCompare(second))
  ), [complaints])

  const filteredComplaints = useMemo(() => {
    if (selectedCategory === ALL_CATEGORIES) {
      return complaints
    }

    return complaints.filter((complaint) => normalizeCategory(complaint.category) === selectedCategory)
  }, [complaints, selectedCategory])

  useEffect(() => {
    if (selectedCategory !== ALL_CATEGORIES && !categoryOptions.includes(selectedCategory)) {
      setSelectedCategory(ALL_CATEGORIES)
    }
  }, [categoryOptions, selectedCategory])

  useEffect(() => () => {
    Object.values(statusImagesRef.current).forEach((item) => {
      if (item?.previewUrl) {
        URL.revokeObjectURL(item.previewUrl)
      }
    })
  }, [])

  const handleStatusImageChange = (complaintId, file) => {
    setStatusImages((prev) => {
      const current = prev[complaintId]
      if (current?.previewUrl) {
        URL.revokeObjectURL(current.previewUrl)
      }

      if (!file) {
        const next = { ...prev }
        delete next[complaintId]
        return next
      }

      return {
        ...prev,
        [complaintId]: {
          file,
          previewUrl: URL.createObjectURL(file),
        },
      }
    })
  }

  const updateStatus = async (complaintId, status) => {
    const selected = statusImages[complaintId]
    if (!selected?.file) {
      setError('Upload a status update image before changing the complaint state.')
      return
    }

    setActiveId(complaintId)
    setError('')
    try {
      const payload = new FormData()
      payload.append('status', status)
      payload.append('image', selected.file)

      const response = await adminAPI.reviewComplaint(complaintId, payload)
      const updateData = response?.data || {}
      setComplaints((prev) =>
        prev.map((item) =>
          item.complaint_id === complaintId
            ? {
                ...item,
                status,
                updated_at: updateData.updated_at || new Date().toISOString(),
                reviewed_by: updateData.reviewed_by,
                latest_status_image_url: updateData.status_image_url,
                latest_status_image_filename: updateData.status_image_filename,
                status_history: [
                  {
                    status,
                    updated_at: updateData.updated_at || new Date().toISOString(),
                    image_url: updateData.status_image_url,
                    image_filename: updateData.status_image_filename,
                    reviewed_by: updateData.reviewed_by,
                  },
                  ...(item.status_history || []),
                ],
              }
            : item,
        ),
      )
      if (selected.previewUrl) {
        URL.revokeObjectURL(selected.previewUrl)
      }
      setStatusImages((prev) => {
        const next = { ...prev }
        delete next[complaintId]
        return next
      })
      setImageInputKeys((prev) => ({
        ...prev,
        [complaintId]: (prev[complaintId] || 0) + 1,
      }))
    } catch (err) {
      setError(err.message || 'Failed to update status')
    } finally {
      setActiveId('')
    }
  }

  return (
    <div className={`min-h-screen px-4 py-20 ${isDark ? 'bg-[#0F1729] text-white' : 'bg-gray-50 text-gray-900'}`}>
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold">Admin Review Portal</h1>
          <button
            onClick={() => void loadComplaints()}
            className="rounded-lg border border-cyan-500 px-4 py-2 text-sm font-semibold text-cyan-500"
          >
            Refresh
          </button>
        </div>

        <div className={`mb-6 flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-end sm:justify-between ${isDark ? 'border-slate-700 bg-slate-900/70' : 'border-slate-200 bg-white'}`}>
          <div>
            <p className="text-sm font-semibold">Category Filter</p>
            <p className="mt-1 text-xs opacity-75">
              Review complaints for one category at a time when triaging updates.
            </p>
          </div>
          <div className="w-full sm:w-72">
            <label htmlFor="admin-category-filter" className="mb-2 block text-xs font-semibold uppercase tracking-wide opacity-75">
              Select category
            </label>
            <select
              id="admin-category-filter"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className={`w-full rounded-lg border px-3 py-2 text-sm ${isDark ? 'border-slate-600 bg-slate-950 text-white' : 'border-slate-300 bg-white text-slate-900'}`}
            >
              <option value={ALL_CATEGORIES}>All categories</option>
              {categoryOptions.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && <div className="mb-4 rounded-md bg-red-100 p-3 text-sm text-red-700">{error}</div>}

        {isLoading ? (
          <p>Loading complaints...</p>
        ) : complaints.length === 0 ? (
          <p>No complaints available.</p>
        ) : filteredComplaints.length === 0 ? (
          <p>No complaints found for the selected category.</p>
        ) : (
          <div className="space-y-3">
            {filteredComplaints.map((complaint) => (
              <div
                key={complaint.complaint_id}
                className={`rounded-lg border p-4 ${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}
              >
                <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-mono text-sm font-bold">{complaint.complaint_id}</p>
                    <p className="text-sm opacity-80">{complaint.name} • {complaint.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold">{normalizeCategory(complaint.category)}</span>
                    <span className="text-xs font-semibold">{complaint.department}</span>
                    <span className="text-xs font-semibold">{complaint.priority}</span>
                  </div>
                </div>

                <p className="mb-3 text-sm opacity-90">{complaint.description}</p>

                {complaint.image_url && (
                  <div className="mb-3">
                    <ImageAttachment
                      src={buildAssetUrl(complaint.image_url)}
                      alt={complaint.image_filename || 'Complaint evidence'}
                      filename={complaint.image_filename}
                      isDark={isDark}
                      imageClassName="max-h-64 w-full rounded-lg border object-cover"
                    />
                  </div>
                )}

                {hasCoordinates(complaint.location) && (
                  <div className={`mb-3 rounded-lg border px-3 py-3 text-sm ${isDark ? 'border-emerald-900 bg-emerald-950/20 text-emerald-100' : 'border-emerald-200 bg-emerald-50 text-emerald-900'}`}>
                    <p className="font-semibold">Reported Location</p>
                    <p className="mt-1">
                      {complaint.location.latitude.toFixed(6)}, {complaint.location.longitude.toFixed(6)}
                    </p>
                    {typeof complaint.location.accuracy === 'number' && (
                      <p className="mt-1 text-xs opacity-80">
                        Accuracy: {Math.round(complaint.location.accuracy)} meters
                      </p>
                    )}
                    {complaint.location.captured_at && (
                      <p className="mt-1 text-xs opacity-80">
                        Captured at: {new Date(complaint.location.captured_at).toLocaleString()}
                      </p>
                    )}
                    <a
                      href={`https://www.google.com/maps?q=${complaint.location.latitude},${complaint.location.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-block text-xs font-semibold underline"
                    >
                      Open in Maps
                    </a>
                  </div>
                )}

                {(complaint.ai_summary || complaint.ai_urgency) && (
                  <div className={`mb-3 rounded-lg border px-3 py-2 text-sm ${isDark ? 'border-cyan-900 bg-cyan-950/40 text-cyan-100' : 'border-cyan-200 bg-cyan-50 text-cyan-900'}`}>
                    <p className="font-semibold">AI Summary</p>
                    <p className="mt-1">{complaint.ai_summary || 'Summary unavailable.'}</p>
                    {complaint.ai_urgency && <p className="mt-2 text-xs font-semibold uppercase opacity-80">Urgency: {complaint.ai_urgency}</p>}
                  </div>
                )}

                {complaint.feedback_count > 0 && (
                  <div className={`mb-3 rounded-lg border px-3 py-3 text-sm ${isDark ? 'border-amber-900 bg-amber-950/30 text-amber-100' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <p className="font-semibold">User Feedback</p>
                      <span className="rounded-full bg-amber-200 px-2 py-1 text-xs font-bold text-amber-900">
                        {complaint.feedback_count}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {complaint.feedback_items.map((item, index) => (
                        <div
                          key={`${complaint.complaint_id}-feedback-${index}`}
                          className={`rounded-md px-3 py-2 ${isDark ? 'bg-gray-900/50 text-gray-100' : 'bg-white/80 text-gray-900'}`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-xs font-semibold uppercase tracking-wide opacity-80">
                              Suggested Department: {item.correct_department}
                            </p>
                            <p className="text-xs opacity-70">
                              {item.timestamp ? new Date(item.timestamp).toLocaleString() : 'Timestamp unavailable'}
                            </p>
                          </div>
                          <p className="mt-2 text-sm">{item.text}</p>
                          {item.submitted_by?.name && (
                            <p className="mt-2 text-xs opacity-75">
                              From: {item.submitted_by.name}{item.submitted_by.email ? ` (${item.submitted_by.email})` : ''}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className={`mb-4 rounded-lg border p-3 ${isDark ? 'border-slate-700 bg-slate-900/70' : 'border-slate-200 bg-slate-50'}`}>
                  <p className="text-sm font-semibold">Admin Status Update Proof *</p>
                  <p className="mt-1 text-xs opacity-75">
                    Upload an image for every status change so citizens can see progress updates.
                  </p>
                  <input
                    key={imageInputKeys[complaint.complaint_id] || 0}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(e) => handleStatusImageChange(complaint.complaint_id, e.target.files?.[0] || null)}
                    className={`mt-3 w-full rounded-lg border px-3 py-2 text-sm file:mr-4 file:rounded-md file:border-0 file:bg-cyan-600 file:px-3 file:py-2 file:font-semibold file:text-white ${
                      isDark ? 'border-slate-600 bg-slate-950 text-white' : 'border-slate-300 bg-white text-slate-900'
                    }`}
                  />
                  {statusImages[complaint.complaint_id]?.previewUrl && (
                    <img
                      src={statusImages[complaint.complaint_id].previewUrl}
                      alt="Status update preview"
                      className="mt-3 max-h-56 w-full rounded-lg border object-cover"
                    />
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {STATUS_OPTIONS.map((option) => (
                    <button
                      key={option}
                      disabled={
                        activeId === complaint.complaint_id ||
                        option === complaint.status ||
                        !statusImages[complaint.complaint_id]?.file
                      }
                      onClick={() => updateStatus(complaint.complaint_id, option)}
                      className={`rounded-md px-3 py-1 text-xs font-semibold ${
                        option === complaint.status
                          ? 'bg-cyan-600 text-white'
                          : isDark
                            ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      } disabled:opacity-60`}
                    >
                      {option}
                    </button>
                  ))}
                </div>

                {(complaint.status_history || []).length > 0 && (
                  <div className={`mt-4 rounded-lg border p-3 ${isDark ? 'border-emerald-900 bg-emerald-950/20 text-emerald-100' : 'border-emerald-200 bg-emerald-50 text-emerald-900'}`}>
                    <p className="mb-3 font-semibold">Status Update Timeline</p>
                    <div className="space-y-3">
                      {(complaint.status_history || []).map((entry, index) => (
                        <div
                          key={`${complaint.complaint_id}-status-history-${index}`}
                          className={`rounded-lg p-3 ${isDark ? 'bg-slate-900/60' : 'bg-white'}`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-semibold">{entry.status}</p>
                            <p className="text-xs opacity-75">
                              {entry.updated_at ? new Date(entry.updated_at).toLocaleString() : 'Timestamp unavailable'}
                            </p>
                          </div>
                          {entry.reviewed_by?.name && (
                            <p className="mt-1 text-xs opacity-80">
                              Updated by: {entry.reviewed_by.name}
                            </p>
                          )}
                          {entry.image_url && (
                            <ImageAttachment
                              src={buildAssetUrl(entry.image_url)}
                              alt={entry.image_filename || `Status update ${entry.status}`}
                              filename={entry.image_filename}
                              isDark={isDark}
                              imageClassName="max-h-64 w-full rounded-lg border object-cover"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminPortal
