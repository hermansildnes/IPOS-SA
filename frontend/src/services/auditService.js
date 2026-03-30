import { apiClient } from './apiClient';

const auditService = {
  getLogs({ page = 1, pageSize = 50, category, action, username, targetType, startDate, endDate } = {}) {
    const params = new URLSearchParams();
    params.set('page', page);
    params.set('page_size', pageSize);
    if (category)   params.set('category', category);
    if (action)     params.set('action', action);
    if (username)   params.set('username', username);
    if (targetType) params.set('target_type', targetType);
    if (startDate)  params.set('start_date', startDate);
    if (endDate)    params.set('end_date', endDate);
    return apiClient.get(`/audit?${params.toString()}`);
  },

  getActions() {
    return apiClient.get('/audit/actions');
  },

  getCategories() {
    return apiClient.get('/audit/categories');
  },
};

export default auditService;