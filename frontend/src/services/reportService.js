import { apiClient } from './apiClient';

const reportService = {
  getTurnoverReport: (startDate, endDate) =>
    apiClient.get(`/reports/turnover?start_date=${startDate}&end_date=${endDate}`),

  getMerchantOrdersSummary: (merchantId, startDate, endDate) =>
    apiClient.get(
      `/reports/merchant-orders-summary?merchant_id=${merchantId}&start_date=${startDate}&end_date=${endDate}`
    ),

  getMerchantOrdersDetailed: (merchantId, startDate, endDate) =>
    apiClient.get(
      `/reports/merchant-orders-detailed?merchant_id=${merchantId}&start_date=${startDate}&end_date=${endDate}`
    ),

  getLowStockReport: () => apiClient.get('/reports/low-stock'),

  getStockTurnoverReport: (startDate, endDate) =>
    apiClient.get(`/reports/stock-turnover?start_date=${startDate}&end_date=${endDate}`),
};

export default reportService;
