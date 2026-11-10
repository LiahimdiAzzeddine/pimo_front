import axios from 'axios'
import { localApiAdapter } from './localApi'

export const isLocalApp = true

const api = axios.create({
  baseURL: '/api',
  adapter: localApiAdapter,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
})

export default api
