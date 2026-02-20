Documenting and explaining different parts for future reference 

Completed:

1. Set up basic routing
2. Auth context + protected routes so not everyone can access the next modules
3. Login Page UI
4. Organise layout and role based dashboard so a different view per role


NEXT:

5. Account Management
6. Catalogue Management
7. Order Management
8. Reports


When backend is ready: Integration



# Components

Reusable UI components all organised

## Structure
- `common/` - Shared components (buttons, inputs, cards, modals)
- `catalogue/` - Catalogue related components (product cards, search, filters)
- `orders/` - Order related components (order forms, tracking, history)
- `accounts/` - Account management components (merchant accounts, user roles)
- `reports/` - Reporting components (charts, tables, export)



# Services

API service layer for backend communication, once we develop it

## Planned Services
- `authService.js` - Authentication and authorisaing
- `catalogueService.js` - Catalogue CRUD operations
- `orderService.js` - Order management
- `merchantService.js` - Merchant account operations
- `reportService.js` - Report generation

We will initially use mock data until we've developed backend. 


# Utils

Helper functions and utilities

## Planned Utilities
- `formatters.js` - Date, currency, number formatting
- `validators.js` - Form validation helpers
- `constants.js` - App-wide constants (roles, statuses, etc.)


# Pages

Full page components that represent different routes in the app

## Planned Pages
- LoginPage - User authentication
- DashboardPage - Role based dashboard (Merchant/Director/Admin)
- CataloguePage - Browse and search products
- OrdersPage - Place and track orders
- AccountsPage - Manage merchant accounts (Admin/Director only)
- ReportsPage - Generate and view reports (Director/Manager only)


# Context

React Context providers for global state management.

# Planned Contexts
- `AuthContext.js` - User authentication state
- `ThemeContext.js` - UI theme settings (optional)






cd C:\Users\Leon\IdeaProjects\IPOS-SA\frontend
npm run dev
