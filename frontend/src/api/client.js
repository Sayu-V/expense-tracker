/**
 * api/client.js
 * -------------
 * Shared Axios instance. All API modules import from here.
 * Base URL points to the FastAPI backend.
 */

import axios from 'axios'

const client = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
})

// Response interceptor — log errors globally
client.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message)
    return Promise.reject(error)
  }
)

export default client
