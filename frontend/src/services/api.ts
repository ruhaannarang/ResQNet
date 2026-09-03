import axios from 'axios'
import { EmergencyRequest, OptimizedResult } from '../types'

const API_BASE = '/api/v1'

export const apiClient = {
  async computeRoute(request: EmergencyRequest): Promise<OptimizedResult> {
    // Try canonical endpoint first, fallback to legacy
    try {
      const response = await axios.post(`${API_BASE}/routes/optimize`, request)
      return response.data
    } catch (e: any) {
      if (e.response?.status === 404) {
        const response = await axios.post(`${API_BASE}/emergency/route`, request)
        return response.data
      }
      throw e
    }
  },

  async checkHealth(): Promise<{ status: string }> {
    try {
      const response = await axios.get(`${API_BASE}/health`)
      return response.data
    } catch {
      const response = await axios.get(`${API_BASE}/emergency/health`)
      return response.data
    }
  },

  async getProvidersStatus(): Promise<any> {
    const response = await axios.get(`${API_BASE}/providers/status`)
    return response.data
  },

  async evaluateReroute(payload: { gps_update: any; current_route?: any }): Promise<any> {
    const response = await axios.post(`${API_BASE}/routes/evaluate-reroute`, payload)
    return response.data
  },
}
