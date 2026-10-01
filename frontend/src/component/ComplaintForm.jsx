import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import { useSubmitComplaint } from '../hooks/useAPI'
import { useAuth } from '../context/AuthContext'
import { otpAPI } from '../utils/api'
import VoiceInput from './VoiceInput'
import { Camera, MapPin, Mic, RefreshCcw, X } from 'lucide-react'

const getDefaultFormData = (user) => ({
  name: user?.name || '',
  email: user?.email || '',
  phone: user?.phone || '',
  description: '',
})

function ComplaintForm() {
  const { isDark } = useTheme()
  const { user } = useAuth()
  const { submit, isLoading, error: submitError } = useSubmitComplaint()
  const navigate = useNavigate()
  const [voiceModalOpen, setVoiceModalOpen] = useState(false)
  const videoRef = useRef(null)
  const cameraStreamRef = useRef(null)

  const [formData, setFormData] = useState(() => getDefaultFormData(user))
  const [otp, setOtp] = useState('')
  const [otpStatus, setOtpStatus] = useState({ type: '', text: '' })
  const [otpVerifiedEmail, setOtpVerifiedEmail] = useState('')
  const [otpLoading, setOtpLoading] = useState(false)
  const [verifyLoading, setVerifyLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [showSuccess, setShowSuccess] = useState(false)
  const [imageFile, setImageFile] = useState(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState('')
  const [imageInputKey, setImageInputKey] = useState(0)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [cameraLoading, setCameraLoading] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [locationData, setLocationData] = useState(null)
  const [locationLoading, setLocationLoading] = useState(false)
  const [locationError, setLocationError] = useState('')
  const redirectTimerRef = useRef(null)

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      name: prev.name || user?.name || '',
      email: prev.email || user?.email || '',
      phone: prev.phone || user?.phone || '',
    }))
  }, [user])

  useEffect(() => () => {
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl)
    }
  }, [imagePreviewUrl])

  useEffect(() => () => {
    if (redirectTimerRef.current) {
      clearTimeout(redirectTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (cameraOpen && videoRef.current && cameraStreamRef.current) {
      videoRef.current.srcObject = cameraStreamRef.current
      void videoRef.current.play().catch(() => {})
    }
  }, [cameraOpen])

  useEffect(() => () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop())
    }
  }, [])

  const stopCameraStream = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop())
      cameraStreamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }

  const resetLocation = () => {
    setLocationData(null)
    setLocationError('')
  }

  const updateSelectedImage = (file) => {
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl)
    }

    resetLocation()
    setCameraError('')
    setImageFile(file)
    setImagePreviewUrl(file ? URL.createObjectURL(file) : '')
  }

  const handleVoiceTranscript = (transcript) => {
    setFormData((prev) => ({
      ...prev,
      description: transcript,
    }))
  }

  const handleImageChange = (e) => {
    const file = e.target.files?.[0] || null
    updateSelectedImage(file)
  }

  const handleOpenCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Camera access is not supported in this browser.')
      return
    }

    setCameraLoading(true)
    setCameraError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
        },
        audio: false,
      })

      stopCameraStream()
      cameraStreamRef.current = stream
      setCameraOpen(true)
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        void videoRef.current.play().catch(() => {})
      }
    } catch (error) {
      setCameraError('Unable to access the camera. Please allow permission and try again.')
      setCameraOpen(false)
    } finally {
      setCameraLoading(false)
    }
  }

  const handleCloseCamera = () => {
    stopCameraStream()
    setCameraOpen(false)
  }

  const handleCaptureImage = async () => {
    const video = videoRef.current
    if (!video || !video.videoWidth || !video.videoHeight) {
      setCameraError('Camera preview is not ready yet. Please try again.')
      return
    }

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const context = canvas.getContext('2d')

    if (!context) {
      setCameraError('Unable to capture the image right now.')
      return
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    const blob = await new Promise((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', 0.92)
    })

    if (!blob) {
      setCameraError('Unable to convert the captured image. Please try again.')
      return
    }

    const capturedFile = new File(
      [blob],
      `complaint-camera-${new Date().toISOString().replace(/[:.]/g, '-')}.jpg`,
      { type: 'image/jpeg' },
    )

    updateSelectedImage(capturedFile)
    handleCloseCamera()
  }

  const handleFetchLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Location access is not supported in this browser.')
      return
    }

    setLocationLoading(true)
    setLocationError('')

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocationData({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          capturedAt: new Date().toISOString(),
        })
        setLocationLoading(false)
      },
      (error) => {
        const fallbackMessage = 'Unable to fetch your location right now.'
        const messageByCode = {
          1: 'Location permission was denied.',
          2: 'Location information is unavailable.',
          3: 'Location request timed out.',
        }

        setLocationError(messageByCode[error.code] || fallbackMessage)
        setLocationLoading(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      },
    )
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))

    if (name === 'email') {
      setOtp('')
      setOtpStatus({ type: '', text: '' })
      setOtpVerifiedEmail('')
    }
  }

  const handleSendOtp = async () => {
    if (!formData.email.trim()) {
      setOtpStatus({ type: 'error', text: 'Enter your email first.' })
      return
    }

    setOtpLoading(true)
    setOtpStatus({ type: '', text: '' })
    try {
      const response = await otpAPI.sendOtp({ email: formData.email.trim() })
      setOtpVerifiedEmail('')
      const debugOtp = response?.data?.debug_otp
      const deliveryMode = response?.data?.delivery_mode
      setOtpStatus({
        type: 'success',
        text: debugOtp
          ? `OTP generated locally for testing: ${debugOtp}. Use this code to verify.`
          : deliveryMode === 'resend'
            ? (response?.message || 'OTP sent successfully. Check your email.')
            : (response?.message || 'OTP sent successfully.'),
      })
    } catch (err) {
      setOtpStatus({
        type: 'error',
        text: err.message || 'Failed to send OTP.',
      })
    } finally {
      setOtpLoading(false)
    }
  }

  const handleVerifyOtp = async () => {
    if (!formData.email.trim()) {
      setOtpStatus({ type: 'error', text: 'Enter your email first.' })
      return
    }
    if (!otp.trim()) {
      setOtpStatus({ type: 'error', text: 'Enter the 6-digit OTP.' })
      return
    }

    setVerifyLoading(true)
    setOtpStatus({ type: '', text: '' })
    try {
      const response = await otpAPI.verifyOtp({
        email: formData.email.trim(),
        otp: otp.trim(),
      })
      setOtpVerifiedEmail(formData.email.trim().toLowerCase())
      setOtpStatus({
        type: 'success',
        text: response?.message || 'Email verified successfully.',
      })
    } catch (err) {
      setOtpVerifiedEmail('')
      setOtpStatus({
        type: 'error',
        text: err.message || 'OTP verification failed.',
      })
    } finally {
      setVerifyLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage({ type: '', text: '' })
    setShowSuccess(false)

    if (otpVerifiedEmail !== formData.email.trim().toLowerCase()) {
      setMessage({
        type: 'error',
        text: 'Please verify your email with OTP before submitting the complaint.',
      })
      return
    }

    if (!imageFile) {
      setMessage({
        type: 'error',
        text: 'Please upload an image of the problem before submitting the complaint.',
      })
      return
    }

    try {
      const payload = new FormData()
      payload.append('name', formData.name)
      payload.append('email', formData.email)
      payload.append('phone', formData.phone)
      payload.append('description', formData.description)
      payload.append('image', imageFile)
      if (locationData) {
        payload.append('latitude', String(locationData.latitude))
        payload.append('longitude', String(locationData.longitude))
        payload.append('location_accuracy', String(locationData.accuracy))
        payload.append('location_captured_at', locationData.capturedAt)
      }

      const response = await submit(payload)

      if (response.success && response.data?.complaint_id) {
        const aiSummaryText = response.data.ai_summary ? `AI Summary: ${response.data.ai_summary}\n\n` : ''
        const aiUrgencyText = response.data.ai_urgency ? `Urgency: ${response.data.ai_urgency}\n\n` : ''
        setMessage({
          type: 'success',
          text: `Complaint submitted successfully!\n\nYour Tracking ID: ${response.data.complaint_id}\n\nDepartment: ${response.data.department}\nPriority: ${response.data.priority}\n\n${aiSummaryText}${aiUrgencyText}Redirecting you to the tracking portal...`,
        })
        setShowSuccess(true)
        setFormData((prev) => ({
          ...prev,
          description: '',
        }))
        if (imagePreviewUrl) {
          URL.revokeObjectURL(imagePreviewUrl)
        }
        setImageFile(null)
        setImagePreviewUrl('')
        setImageInputKey((prev) => prev + 1)
        resetLocation()
        setLocationLoading(false)
        setOtp('')
        setOtpVerifiedEmail('')
        setOtpStatus({ type: '', text: '' })

        redirectTimerRef.current = setTimeout(() => {
          navigate('/track', {
            state: {
              submittedComplaint: {
                complaintId: response.data.complaint_id,
                department: response.data.department,
                priority: response.data.priority,
              },
            },
          })
        }, 1800)
      }
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.message || 'Failed to submit complaint. Please try again.',
      })
    }
  }

  return (
    <div className={`min-h-screen py-20 px-4 ${isDark ? 'bg-[#0F1729]' : 'bg-gray-50'}`}>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-bold text-center mb-2">
          <span className="bg-linear-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent">
            Submit Your Complaint
          </span>
        </h1>
        <p className={`text-center mb-8 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          Our AI will automatically detect the department and priority from your description
        </p>

        <div className="h-1 w-24 mx-auto mb-8 rounded-full bg-linear-to-r from-cyan-500 to-blue-500"></div>

        <form onSubmit={handleSubmit} className={`rounded-xl p-6 shadow-lg ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="mb-4">
            <label className={`block mb-2 font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Full Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              minLength={2}
              maxLength={100}
              className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                isDark ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900'
              }`}
              placeholder="Enter your full name"
            />
          </div>

          <div className="mb-4">
            <label className={`block mb-2 font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Email Address *
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                isDark ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900'
              }`}
              placeholder="your.email@example.com"
            />
          </div>

          <div className={`mb-6 rounded-lg border p-4 ${isDark ? 'border-blue-900 bg-blue-950/20' : 'border-blue-200 bg-blue-50'}`}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <label className={`block mb-2 font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Email OTP Verification *
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                    isDark ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  placeholder="Enter 6-digit OTP"
                />
              </div>
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={otpLoading || !formData.email.trim()}
                className={`rounded-lg px-4 py-2 text-sm font-semibold text-white ${
                  otpLoading || !formData.email.trim()
                    ? 'bg-gray-500 cursor-not-allowed opacity-60'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {otpLoading ? 'Sending...' : 'Send OTP'}
              </button>
              <button
                type="button"
                onClick={handleVerifyOtp}
                disabled={verifyLoading || otp.trim().length !== 6}
                className={`rounded-lg px-4 py-2 text-sm font-semibold text-white ${
                  verifyLoading || otp.trim().length !== 6
                    ? 'bg-gray-500 cursor-not-allowed opacity-60'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {verifyLoading ? 'Verifying...' : 'Verify OTP'}
              </button>
            </div>
            {otpVerifiedEmail === formData.email.trim().toLowerCase() && (
              <p className={`mt-3 text-sm font-semibold ${isDark ? 'text-green-300' : 'text-green-700'}`}>
                Email verified. You can now submit your complaint.
              </p>
            )}
            {otpStatus.text && (
              <p className={`mt-3 text-sm ${otpStatus.type === 'error'
                ? isDark ? 'text-red-300' : 'text-red-700'
                : isDark ? 'text-cyan-200' : 'text-cyan-800'}`}
              >
                {otpStatus.text}
              </p>
            )}
            <p className={`mt-2 text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              A verified OTP is required for each complaint submission.
            </p>
          </div>

          <div className="mb-4">
            <label className={`block mb-2 font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Phone Number *
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              required
              pattern="[+]?[0-9]{8,15}"
              title="Enter 8 to 15 digits, with an optional + at the start"
              className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                isDark ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900'
              }`}
              placeholder="+919876543210"
            />
            <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
              Format: 8-15 digits, optional + prefix
            </p>
          </div>

          <div className={`mb-6 rounded-lg border px-4 py-3 text-sm ${isDark ? 'border-cyan-900 bg-cyan-950/30 text-cyan-100' : 'border-cyan-200 bg-cyan-50 text-cyan-900'}`}>
            Category and priority are inferred automatically, so you only need to describe the issue clearly.
          </div>

          <div className="mb-6">
            <label className={`block mb-2 font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Problem Image *
            </label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                key={imageInputKey}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                capture="environment"
                onChange={handleImageChange}
                required
                className={`w-full rounded-lg border px-4 py-2 file:mr-4 file:rounded-md file:border-0 file:bg-cyan-600 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white ${
                  isDark ? 'border-gray-600 bg-gray-700 text-white file:hover:bg-cyan-500' : 'border-gray-300 bg-white text-gray-900 file:hover:bg-cyan-700'
                }`}
              />
              <button
                type="button"
                onClick={handleOpenCamera}
                disabled={cameraLoading}
                className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 font-semibold ${
                  cameraLoading
                    ? 'cursor-not-allowed bg-gray-500 text-white opacity-60'
                    : 'bg-cyan-600 text-white hover:bg-cyan-700'
                }`}
              >
                <Camera size={18} />
                {cameraLoading ? 'Opening Camera...' : 'Open Camera'}
              </button>
            </div>
            <p className={`mt-2 text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Upload a clear JPG, PNG, or WEBP image up to 5 MB, or open the camera to click one directly from the site.
            </p>
            {cameraError && (
              <p className={`mt-2 text-sm ${isDark ? 'text-red-300' : 'text-red-700'}`}>
                {cameraError}
              </p>
            )}
            {cameraOpen && (
              <div className={`mt-4 rounded-lg border p-4 ${isDark ? 'border-cyan-900 bg-cyan-950/20' : 'border-cyan-200 bg-cyan-50'}`}>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">Live Camera</p>
                  <button
                    type="button"
                    onClick={handleCloseCamera}
                    className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${
                      isDark ? 'bg-gray-800 text-gray-100 hover:bg-gray-700' : 'bg-white text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <X size={16} />
                    Close
                  </button>
                </div>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="max-h-80 w-full rounded-lg bg-black object-cover"
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleCaptureImage}
                    className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700"
                  >
                    <Camera size={16} />
                    Capture Photo
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenCamera}
                    disabled={cameraLoading}
                    className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold ${
                      cameraLoading
                        ? 'cursor-not-allowed bg-gray-500 text-white opacity-60'
                        : isDark
                          ? 'bg-gray-800 text-gray-100 hover:bg-gray-700'
                          : 'bg-white text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <RefreshCcw size={16} />
                    Restart Camera
                  </button>
                </div>
              </div>
            )}
            {imageFile && (
              <div className={`mt-3 rounded-lg border p-3 ${isDark ? 'border-gray-700 bg-gray-900/50' : 'border-gray-200 bg-gray-50'}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium">{imageFile.name}</p>
                  <button
                    type="button"
                    onClick={() => {
                      updateSelectedImage(null)
                      setImageInputKey((prev) => prev + 1)
                      handleCloseCamera()
                    }}
                    className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${
                      isDark ? 'bg-gray-800 text-gray-100 hover:bg-gray-700' : 'bg-white text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <X size={16} />
                    Remove Image
                  </button>
                </div>
                {imagePreviewUrl && (
                  <img
                    src={imagePreviewUrl}
                    alt="Complaint preview"
                    className="mt-3 max-h-56 w-full rounded-lg object-cover"
                  />
                )}
                <div className={`mt-4 rounded-lg border p-3 ${isDark ? 'border-slate-700 bg-slate-950/60' : 'border-slate-200 bg-white'}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">Attach Current Location</p>
                      <p className={`mt-1 text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        Add the exact coordinates of where this image was taken to help faster routing.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={handleFetchLocation}
                        disabled={locationLoading}
                        className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${
                          locationLoading
                            ? 'cursor-not-allowed bg-gray-500 text-white opacity-60'
                            : 'bg-emerald-600 text-white hover:bg-emerald-700'
                        }`}
                      >
                        <MapPin size={16} />
                        {locationLoading ? 'Fetching...' : locationData ? 'Refresh Location' : 'Use My Location'}
                      </button>
                      {locationData && (
                        <button
                          type="button"
                          onClick={resetLocation}
                          className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${
                            isDark ? 'bg-gray-800 text-gray-100 hover:bg-gray-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          <X size={16} />
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                  {locationError && (
                    <p className={`mt-2 text-sm ${isDark ? 'text-red-300' : 'text-red-700'}`}>
                      {locationError}
                    </p>
                  )}
                  {locationData && (
                    <div className={`mt-3 rounded-lg border p-3 text-sm ${isDark ? 'border-emerald-900 bg-emerald-950/30 text-emerald-100' : 'border-emerald-200 bg-emerald-50 text-emerald-900'}`}>
                      <p className="font-semibold">Location attached</p>
                      <p className="mt-1">
                        {locationData.latitude.toFixed(6)}, {locationData.longitude.toFixed(6)}
                      </p>
                      <p className="mt-1 text-xs opacity-80">
                        Accuracy: {Math.round(locationData.accuracy)} meters
                      </p>
                      <a
                        href={`https://www.google.com/maps?q=${locationData.latitude},${locationData.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-block text-xs font-semibold underline"
                      >
                        Preview on map
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <label className={`font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Complaint Description *
              </label>
              <button
                type="button"
                onClick={() => setVoiceModalOpen(true)}
                className="flex items-center gap-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition"
              >
                <Mic size={16} />
                Voice Input
              </button>
            </div>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              minLength={10}
              maxLength={4000}
              rows="6"
              className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none ${
                isDark ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500' : 'bg-white border-gray-300 text-gray-900'
              }`}
              placeholder="Please describe your complaint in detail. The more information you provide, the better we can assist you..."
            />
            <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
              {formData.description.length}/4000 characters
            </p>
          </div>

          <VoiceInput
            isOpen={voiceModalOpen}
            onClose={() => setVoiceModalOpen(false)}
            onTranscript={handleVoiceTranscript}
          />

          {submitError && (
            <div className="mb-4 p-4 bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 rounded-lg border border-red-300 dark:border-red-700">
              <p className="font-semibold">Error</p>
              <p className="text-sm">{submitError}</p>
            </div>
          )}

          {message.type === 'success' && showSuccess && (
            <div className="mb-4 p-4 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-lg border border-green-300 dark:border-green-700 whitespace-pre-wrap">
              <p className="font-semibold">Success</p>
              <p className="text-sm mt-2">{message.text}</p>
            </div>
          )}

          {message.type === 'error' && (
            <div className="mb-4 p-4 bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 rounded-lg border border-red-300 dark:border-red-700">
              <p className="font-semibold">Error</p>
              <p className="text-sm">{message.text}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || otpVerifiedEmail !== formData.email.trim().toLowerCase()}
            className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-all duration-300 ${
              isLoading || otpVerifiedEmail !== formData.email.trim().toLowerCase()
                ? 'bg-gray-500 cursor-not-allowed opacity-50'
                : 'bg-linear-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700'
            }`}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin">*</span>
                Submitting...
              </span>
            ) : (
              'Submit Complaint'
            )}
          </button>

          <p className={`text-xs text-center mt-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            By submitting this complaint, you agree to our terms of service
          </p>
        </form>
      </div>
    </div>
  )
}

export default ComplaintForm
