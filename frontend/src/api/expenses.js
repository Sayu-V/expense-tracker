import client from './client'

export const expensesApi = {
  list: (params = {}) => client.get('/expenses', { params }),
  getById: (id) => client.get(`/expenses/${id}`),
  create: (data) => client.post('/expenses', data),
  update: (id, data) => client.put(`/expenses/${id}`, data),
  delete: (id) => client.delete(`/expenses/${id}`),
  // v1.1.0 — AI auto-categorisation
  suggestCategory: (description) => client.get('/expenses/suggest-category', { params: { description } }),
}
