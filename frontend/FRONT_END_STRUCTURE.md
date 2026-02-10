# IPOS-SA Frontend Structure

## Overview
React based frontend for InfoPharma Ordering System - Server Application (Team A).
Built with React 18 and Vite

## Directory Structure

frontend/
├── public/                  # Static assets (favicon, images)
├── src/
│   ├── assets/             # Images, fonts, icons
│   ├── components/         # Reusable UI components
│   │   ├── common/        # Shared components (buttons, inputs, cards, modals)
│   │   ├── catalogue/     # Catalogue module components
│   │   ├── orders/        # Orders module components
│   │   ├── accounts/      # Accounts module components
│   │   └── reports/       # Reports module components
│   ├── pages/             # Full page components (routes)
│   ├── services/          # API services (mock data for now)
│   ├── utils/             # Helper functions
│   ├── context/           # React Context providers
│   ├── App.jsx            # Main app component
│   ├── main.jsx           # Entry point
│   └── index.css          # Global styles
├── package.json           # Dependencies and scripts
├── vite.config.js         # Vite configuration
└── README.md              # Setup instructions

# Module relating to IPOS-SA requirements:

## IPOS-SA-ACC (Account Management)
**Components:** `src/components/accounts/`
**Pages:** `AccountsPage.jsx`, `LoginPage.jsx`
**Services:** `authService.js`, `merchantService.js`
**User Stories:** SA-DIR-01, SA-MER-03
**Features:**
- User authentication (Admin, Director, Merchant roles)
- Merchant account creation and management
- Credit limit and discount plan configuration
- Account status management (normal, suspended, in default)