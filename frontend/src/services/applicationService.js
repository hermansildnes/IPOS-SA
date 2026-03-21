import { apiClient } from './apiClient';

export async function getAllApplications() {
  return apiClient.get('/commercial-applications');
}

export async function getApplication(id) {
  return apiClient.get(`/commercial-applications/${id}`);
}

export async function decideApplication(id, status) {
  return apiClient.patch(`/commercial-applications/${id}`, { status });
}