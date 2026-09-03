import axios from 'axios'
import { EmergencyRequest, OptimizedResult } from '../types'

const API_BASE = '/api/v1'

export const apiClient = {
  async computeRoute(request: EmergencyRequest): Promise<OptimizedResult> {
    const response = await axios.post(`${API_BASE}/emergency/route`, request)
    return response.data
  },

  async checkHealth(): Promise<{ status: string }> {
    const response = await axios.get(`${API_BASE}/emergency/health`)
    return response.data
  },
}
