import client from './client'
export { expensesApi } from './expenses'

export const categoriesApi = {
  list: () => client.get('/categories'),
  create: (data) => client.post('/categories', data),
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
