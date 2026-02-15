import { ACCOUNT_STATUS, DISCOUNT_TYPES } from '../utils/constants';

// mock merchant accounts based on the structure defined in the brief
// each merchant has all the fields that IPOS-SA-ACC requires
// TODO: Replace with real API calls when backend is ready
export const MOCK_MERCHANTS = [
  {
    id: 1,
    // IPOS account number as shown in the brief's order form examples
    accountNumber: '0000235',
    companyName: 'Cosymed Ltd',
    contactName: 'John Smith',
    email: 'john.smith@cosymed.co.uk',
    phone: '0208 778 0124',
    address: '3, High Level Drive, Sydenham, SE26 3ET',
    status: ACCOUNT_STATUS.NORMAL,
    creditLimit: 10000,
    currentDebt: 2450,

    // Fixed plan = same discount rate on every order regardless of value
    discountType: DISCOUNT_TYPES.FIXED,
    discountRate: 5,

    // Flexible thresholds only apply when discountType is FLEXIBLE
    flexibleThresholds: null,
    createdAt: '2024-01-15',
    lastOrderDate: '2026-01-29',

    // These track where we are in the payment reminder process
    // See the reminder algorithm in the brief
    status1stReminder: 'no_need',
    status2ndReminder: 'no_need',
  },
  {
    id: 2,
    accountNumber: '0000412',
    companyName: 'MedShop Ltd',
    contactName: 'Sarah Jones',
    email: 'sarah.jones@medshop.co.uk',
    phone: '0207 123 4567',
    address: '15, Market Street, London, EC1A 1BB',
    status: ACCOUNT_STATUS.IN_DEFAULT,
    creditLimit: 15000,
    currentDebt: 8900,
    discountType: DISCOUNT_TYPES.FLEXIBLE,
    discountRate: null,

    // Flexible plan thresholds - discount increases with monthly order value
    flexibleThresholds: [
      { upTo: 1000, rate: 1 },
      { upTo: 2000, rate: 2 },
      { above: 2000, rate: 3 },
    ],
    createdAt: '2023-06-20',
    lastOrderDate: '2025-11-12',
    status1stReminder: 'sent',
    status2ndReminder: 'sent',
    
    // Reason logged when the director reinstates the account (SA-DIR-01)
    defaultReason: 'Payment overdue by 42 days',
  },
  {
    id: 3,
    accountNumber: '0000589',
    companyName: 'QuickPharma Ltd',
    contactName: 'Ahmed Hassan',
    email: 'ahmed@quickpharma.co.uk',
    phone: '0161 987 6543',
    address: '7, Industrial Park, Manchester, M1 2WN',
    status: ACCOUNT_STATUS.SUSPENDED,
    creditLimit: 8000,
    currentDebt: 3200,
    discountType: DISCOUNT_TYPES.FIXED,
    discountRate: 3,
    flexibleThresholds: null,
    createdAt: '2024-03-10',
    lastOrderDate: '2025-12-20',
    status1stReminder: 'sent',
    status2ndReminder: 'no_need',
  },
  {
    id: 4,
    accountNumber: '0000721',
    companyName: 'Pharma Plus Ltd',
    contactName: 'Emma Wilson',
    email: 'emma@pharmaplus.co.uk',
    phone: '0113 456 7890',
    address: '22, Business Quarter, Leeds, LS1 4AP',
    status: ACCOUNT_STATUS.NORMAL,
    creditLimit: 20000,
    currentDebt: 5600,
    discountType: DISCOUNT_TYPES.FLEXIBLE,
    discountRate: null,
    flexibleThresholds: [
      { upTo: 1000, rate: 1 },
      { upTo: 2000, rate: 2 },
      { above: 2000, rate: 3 },
    ],
    createdAt: '2023-12-01',
    lastOrderDate: '2026-02-01',
    status1stReminder: 'no_need',
    status2ndReminder: 'no_need',
  },
];