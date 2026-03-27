import client from './client'
export { expensesApi } from './expenses'

export const categoriesApi = {
  list:   (params = {}) => client.get('/categories', { params }),
  create: (data)        => client.post('/categories', data),
  update: (id, data)    => client.put(`/categories/${id}`, data),
  delete: (id)          => client.delete(`/categories/${id}`),
}

export const budgetsApi = {
  list:       (params = {}) => client.get('/budgets', { params }),
  set:        (data)        => client.post('/budgets', data),
  status:     (params = {}) => client.get('/budgets/status', { params }),
  // v1.5.0 — edit & delete
  update:     (id, data)    => client.put(`/budgets/${id}`, data),
  delete:     (id)          => client.delete(`/budgets/${id}`),
  bulkDelete: (ids)         => client.post('/budgets/bulk-delete', { ids }),
}

export const reportsApi = {
  monthlySummary: (params = {}) => client.get('/reports/monthly-summary', { params }),
  byCategory:     (params = {}) => client.get('/reports/by-category', { params }),
  trend:          (params = {}) => client.get('/reports/trend', { params }),
  topExpenses:    (params = {}) => client.get('/reports/top-expenses', { params }),
}

export const insightsApi = {
  list: () => client.get('/insights'),
}

// v1.5.0 — Chat with your data
export const chatApi = {
  send: (message) => client.post('/chat', { message }),
}

// v1.7.0 — Recurring Expenses
export const recurringApi = {
  list:        ()          => client.get('/recurring-expenses'),
  create:      (data)      => client.post('/recurring-expenses', data),
  update:      (id, data)  => client.put(`/recurring-expenses/${id}`, data),
  delete:      (id)        => client.delete(`/recurring-expenses/${id}`),
  generate:    (id)        => client.post(`/recurring-expenses/${id}/generate`),
  generateAll: ()          => client.get('/recurring-expenses/generate-all'),
}

// v1.7.0 — Spending Alerts
export const alertsApi = {
  list:       (unreadOnly = false) => client.get('/alerts', { params: { unread_only: unreadOnly } }),
  generate:   ()                   => client.post('/alerts/generate'),
  markRead:   (id)                 => client.post(`/alerts/${id}/read`),
  markAllRead: ()                  => client.post('/alerts/read-all'),
  delete:     (id)                 => client.delete(`/alerts/${id}`),
}

// v1.7.0 — Goal Tracker
export const goalsApi = {
  list:   ()          => client.get('/goals'),
  create: (data)      => client.post('/goals', data),
  update: (id, data)  => client.put(`/goals/${id}`, data),
  delete: (id)        => client.delete(`/goals/${id}`),
}
