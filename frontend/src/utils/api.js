/**
 * API Service Layer
 * Centralized API communication with proper error handling
 */

const DEFAULT_API_BASE_URL = '/api'

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL
export const ASSET_BASE_URL = import.meta.env.VITE_PROXY_TARGET || ''

export const AUTH_STORAGE_KEY = 'nivaran_auth'

export function getAuthState() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

/**
 * Make an API request with proper error handling
 */
async function apiRequest(path, options = {}) {
  const url = `${API_BASE_URL}${path}`
  const auth = getAuthState()
  const token = auth?.token
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData
  
  try {
    const response = await fetch(url, {
      headers: {
        ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {})
      },
      ...options
    })

    const contentType = response.headers.get('content-type') || ''
    const hasJson = contentType.includes('application/json')
    
    let payload
    try {
      payload = hasJson ? await response.json() : await response.text()
    } catch (parseError) {
      throw new Error('Failed to parse response', { cause: parseError })
    }

    if (!response.ok) {
      const message = payload?.detail || payload?.message || 'Request failed'
      const error = new Error(message)
      error.status = response.status
      error.response = payload
      throw error
    }

    return payload
  } catch (error) {
    // Re-throw with better context
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Network error', { cause: error })
  }
}

/**
 * Complaints API
 */
export const complaintAPI = {
  /**
   * Submit a new complaint
   */
  async create(complaint) {
    const isFormData = typeof FormData !== 'undefined' && complaint instanceof FormData
    return apiRequest('/complaints', {
      method: 'POST',
      body: isFormData ? complaint : JSON.stringify(complaint)
    })
  },

  // P16 fix: removed duplicate getAll() — use getComplaints() instead

  async getMine() {
    return apiRequest('/complaints/my')
  },

  /**
   * Get single complaint by ID
   */
  async getById(complaintId) {
    return apiRequest(`/complaints/${complaintId}`)
  },

  /**
   * Get complaints by priority
   */
  async getByPriority(level) {
    return apiRequest(`/complaints/priority/${level}`)
  },

  /**
   * Get complaints by department
   */
  async getByDepartment(department) {
    return apiRequest(`/complaints/department/${department}`)
  },

  /**
   * Update complaint status
   */
  async updateStatus(complaintId, status) {
    return apiRequest(`/complaints/${complaintId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    })
  },

  /**
   * Submit feedback on a complaint classification
   */
  async submitFeedback(feedback) {
    return apiRequest('/feedback', {
      method: 'POST',
      body: JSON.stringify(feedback)
    })
  },

  /**
   * Get AI summary of complaint
   */
  async getSummary(complaintId) {
    return apiRequest(`/complaints/${complaintId}/summary`)
  },

  /**
   * Get all complaints with optional filters
   */
  async getComplaints(params = {}) {
    const query = new URLSearchParams(params).toString()
    const path = query ? `/complaints?${query}` : '/complaints'
    return apiRequest(path)
  },

  /**
   * Get statistics
   */
  async getStats() {
    return apiRequest('/stats')
  }
}

export const authAPI = {
  async register(payload) {
    return apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  async login(payload) {
    return apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  async me() {
    return apiRequest('/auth/me')
  },

  async bootstrapAdmin(payload) {
    return apiRequest('/auth/bootstrap-admin', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
}

export const otpAPI = {
  async sendOtp(payload) {
    return apiRequest('/send-otp', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  async verifyOtp(payload) {
    return apiRequest('/verify-otp', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
}

export const chatAPI = {
  async sendMessage(payload) {
    return apiRequest('/chat', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },
}

export const adminAPI = {
  async getComplaints(params = {}) {
    const query = new URLSearchParams(params).toString()
    return apiRequest(query ? `/admin/complaints?${query}` : '/admin/complaints')
  },

  async reviewComplaint(complaintId, payload) {
    const isFormData = typeof FormData !== 'undefined' && payload instanceof FormData
    return apiRequest(`/admin/complaints/${complaintId}/status`, {
      method: 'PUT',
      body: isFormData ? payload : JSON.stringify(payload),
    })
  },
}

/**
 * Analytics API
 */
export const analyticsAPI = {
  /**
   * Get overall statistics
   */
  async getStats() {
    return apiRequest('/stats')
  },

  /**
   * Get department-wise statistics
   */
  async getDepartmentStats() {
    return apiRequest('/department-stats')
  }
}

/**
 * Health Check API
 */
export const healthAPI = {
  /**
   * Check API health
   */
  async check() {
    const response = await apiRequest('/health')
    const status = String(response?.status || '').toLowerCase()
    return response?.success === true || status === 'healthy' || status.includes('running')
  }
}

export function buildAssetUrl(path) {
  if (!path) return ''
  if (/^https?:\/\//i.test(path)) return path

  if (ASSET_BASE_URL) {
    const origin = ASSET_BASE_URL.replace(/\/api\/?$/, '')
    return path.startsWith('/') ? `${origin}${path}` : `${origin}/${path}`
  }

  if (API_BASE_URL.startsWith('http://') || API_BASE_URL.startsWith('https://')) {
    const origin = API_BASE_URL.replace(/\/api\/?$/, '')
    return path.startsWith('/') ? `${origin}${path}` : `${origin}/${path}`
  }

  return path
}

export default {
  apiRequest,
  complaintAPI,
  authAPI,
  otpAPI,
  chatAPI,
  adminAPI,
  analyticsAPI,
  healthAPI,
  buildAssetUrl,
  ASSET_BASE_URL,
  API_BASE_URL
}
