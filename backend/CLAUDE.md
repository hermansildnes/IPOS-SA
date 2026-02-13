# IPOS-SA Development Brief

## Project Context
You are building **IPOS-SA (InfoPharma Ordering System - Server Application)**, one of three subsystems in a university team project. IPOS-SA is a web-based pharmaceutical distribution management system for InfoPharma Ltd, a pharmaceutical distributor.

**Key constraints:**
- Tech stack decided: FastAPI (Python), PostgreSQL, JavaScript frontend
- Architecture: REST API backend + web frontend (to be demoed locally)
- Timeline: Week 5 deliverable (Requirements + High-Level Design) due Feb 27, 2026; Final demo April 16, 2026
- Must expose REST endpoints for IPOS-CA (client application) and IPOS-PU (public platform) subsystems to consume
- Will need UML class diagrams for week 5 (interface fragment) and week 12 (full implementation)

---

## IPOS-SA Requirements (from official brief)

### Overview
"This subsystem should allow InfoPharma Ltd. to maintain an electronic catalogue of pharmaceutical products and control stock availability. The catalogue is accessed by merchants who should have valid user accounts set for them by the administrator of IPOS-SA. A valid user can access the catalogue and place an order by filling in an order form. Once an order is submitted IPOS-SA should generate an invoice which will be stored in the system database for further reference and can be displayed on screen or printed out by either the corresponding merchant or by the Operation's Manager at InfoPharma Ltd. The status of the orders (accepted, being processed, dispatched) will be maintained by IPOS – SA and members of staff at InfoPharma should be able to update it when needed (e.g., when an order is dispatched a member of the dispatching department will have to enter the following details: who dispatched it, when was the order dispatched, the courier used for the delivery, courier's Ref. No, expected delivery time). The merchant should be able to track their orders through IPOS, too."

### Credit & Payment System
"The merchants are given credit by InfoPharma Ltd. and can make payments for the goods they have ordered by the end of the calendar month. They can check their balance by accessing IPOS_SA. Payments by merchants are not part of IPOS-SA and should be made using other means, such as direct bank transfers using InfoPharma IBAN number shared with all registered merchants. Once a payment is received, payment details should be entered into the system by the accounting department at InfoPharma, and the account balance of the respective merchant will be updated. If a merchant is late no more than 15 days with their payment, they can continue to use the ordering system, but IPOS-SA will generate a reminder on the screen every time the account is accessed by the merchant. If a merchant is late with a payment between 15 days and 30 days, then IPOS-SA will suspend the user account, i.e. no further orders will be accepted. Once a payment is received within 30 days of the payment deadline the 'suspended' account is restored to 'normal' by the system and the user can resume placing new orders. If the payment delay is longer than 30 days, the user merchant account is flagged as 'in default'. Restoring an account from an 'in default' to 'normal' (or 'suspended') state can only be done after an authorisation by the Director of operations of InfoPharma Ltd."

---

## IPOS-SA Functional Packages

### IPOS-SA-ACC (Account Management)
"This package provides the functionality needed for setting up accounts for the users of IPOS-SA. Different users may have different privileges and use different parts of IPOS-SA. At least the following three groups of accounts must be implemented in the prototype:

i) **a merchant's account.** The user with such an account should be able to access the following packages: IPOS_SA-CAT and IPOS-SA-ORD. Once a new account is set up as a merchant account the system will ask for contact details to be provided, credit limit and discount plan to be set up for the new merchant before the account is activated. If the required details are not provided the account will not be created. The discount plan sets discount rates which will be applied to orders for respective merchant. At least the following two types of discount plans must be implemented:
   - **fixed discount plan**, i.e. the same discount rate applies to all items of any quantity ordered from the catalogue. The discount is applied to each order and the amount due is reduced by the amount of the discount at the time of placing an order.
   - **flexible discount plan**, in which the discount rates depend on the value of all orders within a calendar month, e.g. 1% for orders less than £1000, 2% for orders between £1000 and £2000 and 3% for orders in excess of £2000. With the flexible discount the value of the discount is calculated at the end of the calendar month. The amount of the discount is either paid back to the merchant by sending a cheque at the end of the month or deducted from the value of the next order(s) by the same merchant.

ii) **an administrator's account.** This account has full access to the functionality of IPOS-SA, i.e. access to all packages of IPOS-SA including IPOS-SA-ACC.

iii) **a manager's account.** This account allows the user an access to IPOS-SA-RPRT. This user can also access the merchant accounts and alter their credit limits, discount plans and change the state of an 'in default' account to either 'normal' or 'suspended'."

### IPOS-SA-CAT (Catalogue Management)
"This package contains the functionality necessary to maintain a catalogue of goods available to the merchants to order from. As a minimum the following functions are required:
- creating a (new) catalogue (optional, if it does not already exist. It is acceptable not to have this function as part of IPOS-SA, in which case the catalogue should be created using tools available for administering the IPOS-SA database),
- adding a new item, deleting an item, updating an item, searching for an item using various searching criteria (item ID, key term, etc.),
- adding new stock of a catalogue item (e.g. when they are delivered to InfoPharma). For each item in the catalogue a minimum stock level parameter can be set up (a non-negative integer). The system must warn the relevant users (administrator and the operation's manager) every time they use IPOS-SA about the occurrence of low stock conditions. A report should be possible generated on demand to list all items in the catalogue, which are below their set minimum stock levels (see Appendix 3)."

**Catalogue item details must include:**
- Product ID
- Product description
- Unit price
- Current availability (stock quantity)

### IPOS-SA-ORD (Order Management)
"This package contains the functionality necessary for a merchant to be able to place a new order (choosing items from the current catalogue) and track the status of their orders, the outstanding unpaid balances, etc. Once a new order is accepted by the system, the InfoPharma stock should be reduced accordingly. Raising invoices against accepted orders and entering data about the payments made for previous orders (bank transfers, card or cheque payments) is also part of this package."

**Order information must capture:** Order ID, merchant details, date, item list (product ID, description, quantity, unit price, cost), total, discount, amount due.

### IPOS-SA-RPT (Report Generation)
"This package should allow various reports to be generated by searching the system database. The report should be visualised on computer screen and printed (when required). The prototype should allow for generating the following reports:

i) Turnover for a given period of time in terms of quantities of goods sold to merchants and the revenue received by InfoPharma Ltd.

ii) List of orders received from a particular merchant for a given period of time with details: order ID, date of ordering, value of the order, date of dispatching, payment received (or pending), with a 'Totals' line concluding the report.

iii) Report about the activity of an individual merchant for a given period of time with: contact details of a merchant (as a header), list of all orders (including the individual items ordered, quantity ordered, individual cost, total cost of order, discount given if known, payment status).

iv) List of invoices raised against an individual merchant for a given period (on the screen) and then navigating through the details of the individual invoices. Printouts of all these should also be possible to generate.

v) List of all invoices raised by InfoPharma Ltd against merchants for a given period.

vi) Stock turnover (goods sold and newly received) within a given period of time."

---

## Cross-Subsystem Integration Requirements

### What IPOS-CA needs from IPOS-SA
From the brief: "IPOS-CA – ORD: This package allows the merchant to place an order with IPOS-SA, track its progress through IPOS-SA (shipping, delivery), view the previous orders and query own outstanding balance. A merchant is expected to access IPOS-SA-ORD by using a username and password created for them by the administrator of IPOS-SA."

Also: "orders from IPOS-SA and delivered to a merchant, should be easy to record in IPOS-CA and increase the merchant's stock."

**CA needs to be able to:**
- Authenticate merchants using credentials from SA
- Access/search the catalogue
- Place orders
- Track order status and history
- Query outstanding balance and account status
- Retrieve invoice details

### What IPOS-PU needs from IPOS-SA
From the brief: "Applications for commercial membership will be passed to IPOS-SA. A decision will be taken by InforPharma Ltd staff after conducting the necessary diligence checks. If the checks are successfully passed, the application for commercial membership will be approved. InfoPharma Ltd will notify the approved applicant by email, in which details on how to access IPOS – SA will be included."

**PU needs to be able to:**
- Submit commercial membership applications to SA (including: company reg no., director details, business type, address, email)
- Query application status
- (Optional) May provide shared email service that SA can use

---

## Development Guidelines
- Follow Netflix Dispatch structure: each feature folder is self-contained with router, service, models
- Service layer contains all business logic (routers handle request/response only)
- Proper separation of concerns
- Comprehensive error handling and validation
- Clear API documentation (FastAPI generates OpenAPI docs automatically)
- Think about data integrity and consistency

---

## Important Notes
- Payment processing is manual entry by accounting staff (not online payment processing)
- Email notifications can be logged to database if actual sending not implemented
- Reports should be designed for both screen display and print output
- The system will be demoed locally, not deployed to cloud
- Focus on meeting all functional requirements from the brief first, then polish

---

## Week 5 Deliverable Context
Soon you'll need to create design documentation including UML diagrams showing how SA interfaces with CA and PU. The actual REST API you implement now will form the basis of those interface specifications.
