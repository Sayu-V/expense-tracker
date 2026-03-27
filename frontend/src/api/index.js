import client from './client'
export { expensesApi } from './expenses'

export const categoriesApi = {
  list: (params = {}) => client.get('/categories', { params }),  // supports ?category_type=expense|income
  create: (data) => client.post('/categories', data),
  update: (id, data) => client.put(`/categories/${id}`, data),
  delete: (id) => client.delete(`/categories/${id}`),
}

export const budgetsApi = {
  list: (params = {}) => client.get('/budgets', { params }),
  set: (data) => client.post('/budgets', data),
  status: (params = {}) => client.get('/budgets/status', { params }),
}

export const reportsApi = {
  monthlySummary: (params = {}) => client.get('/reports/monthly-summary', { params }),
  byCategory: (params = {}) => client.get('/reports/by-category', { params }),
  trend: (params = {}) => client.get('/reports/trend', { params }),
  topExpenses: (params = {}) => client.get('/reports/top-expenses', { params }),
}

export const insightsApi = {
  list: () => client.get('/insights'),
}
