import client from './client'

export const expensesApi = {
  list:            (params = {}) => client.get('/expenses', { params }),
  getById:         (id)          => client.get(`/expenses/${id}`),
  create:          (data)        => client.post('/expenses', data),
  update:          (id, data)    => client.put(`/expenses/${id}`, data),
  delete:          (id)          => client.delete(`/expenses/${id}`),
  // v1.1.0 — AI auto-categorisation
  suggestCategory: (description, entry_type = 'expense') =>
    client.get('/expenses/suggest-category', { params: { description, entry_type } }),
  // v1.5.0 — bulk delete
  bulkDelete:      (ids)         => client.post('/expenses/bulk-delete', { ids }),
}
