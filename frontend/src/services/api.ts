import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
})

// Inject JWT token on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('rr_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Handle 401 globally
api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('rr_token')
      localStorage.removeItem('rr_user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api
