/* eslint-disable react-hooks/set-state-in-effect */
/**
 * Custom React hooks for API calls
 * Provides reusable complaint and analytics data fetching
 */

import { useMemo, useState, useEffect, useCallback } from 'react'
import { complaintAPI, analyticsAPI, healthAPI } from '../utils/api'

/**
 * Hook for complaint submission
 */
export function useSubmitComplaint() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [complaintId, setComplaintId] = useState(null)

  const submit = useCallback(async (complaint) => {
    setIsLoading(true)
    setError(null)
    setComplaintId(null)

    try {
      const response = await complaintAPI.create(complaint)
      setComplaintId(response.data?.complaint_id)
      return response
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { submit, isLoading, error, complaintId }
}

/**
 * Hook for fetching all complaints
 */
export function useComplaints(params, onlyMine = false) {
  const [complaints, setComplaints] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const paramsKey = useMemo(() => JSON.stringify(params || {}), [params])
  const normalizedParams = useMemo(() => JSON.parse(paramsKey), [paramsKey])

  const fetch = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = onlyMine
        ? await complaintAPI.getMine()
        : await complaintAPI.getAll(normalizedParams)
      setComplaints(response.data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [normalizedParams, onlyMine])

  useEffect(() => {
    void fetch()
  }, [fetch])

  return { complaints, isLoading, error, refetch: fetch }
}

/**
 * Hook for fetching a single complaint
 */
export function useComplaint(complaintId) {
  const [complaint, setComplaint] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetch = useCallback(async () => {
    if (!complaintId) return

    setIsLoading(true)
    setError(null)
    try {
      const response = await complaintAPI.getById(complaintId)
      setComplaint(response.data)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [complaintId])

  useEffect(() => {
    void fetch()
  }, [fetch])

  return { complaint, isLoading, error, refetch: fetch }
}

/**
 * Hook for updating complaint status
 */
export function useUpdateComplaintStatus() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const update = useCallback(async (complaintId, status) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await complaintAPI.updateStatus(complaintId, status)
      return response
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { update, isLoading, error }
}

/**
 * Hook for submitting complaint feedback
 */
export function useSubmitFeedback() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const submit = useCallback(async (feedback) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await complaintAPI.submitFeedback(feedback)
      return response
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  return { submit, isLoading, error }
}

/**
 * Hook for analytics data
 */
export function useAnalytics() {
  const [stats, setStats] = useState(null)
  const [deptStats, setDeptStats] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetch = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [statsRes, deptRes] = await Promise.all([
        analyticsAPI.getStats(),
        analyticsAPI.getDepartmentStats()
      ])
      setStats(statsRes.data)
      setDeptStats(deptRes.data)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetch()
  }, [fetch])

  return { stats, deptStats, isLoading, error, refetch: fetch }
}

/**
 * Hook for API health check
 */
export function useHealthCheck() {
  const [isHealthy, setIsHealthy] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

    const check = async () => {
      if (!cancelled) setIsLoading(true)

      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          const healthy = await healthAPI.check()
          if (!cancelled) {
            setIsHealthy(healthy)
            setIsLoading(false)
          }
          return
        } catch {
          if (attempt < 2) {
            await delay(1200)
          }
        }
      }

      if (!cancelled) {
        setIsHealthy(false)
      }

      if (!cancelled) setIsLoading(false)
    }

    check()
    const interval = setInterval(check, 30000) // Check every 30 seconds

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  return { isHealthy, isLoading }
}
