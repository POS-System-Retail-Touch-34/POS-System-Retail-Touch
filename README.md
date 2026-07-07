# RetailTouch POS System

RetailTouch is a full-stack retail management platform designed for modern point-of-sale operations. It combines a React-based storefront interface with a Spring Boot microservices backend to support sales, inventory, customer loyalty, reporting, authentication, and notifications in one integrated experience.

## Overview

This project demonstrates a practical retail workflow for stores and small businesses, including:

- POS-style sales processing with barcode entry, cart management, discounts, and payment handling
- Inventory control with stock updates, low-stock alerts, and stock transfers
- Customer management with loyalty points and transaction history
- Role-based access for admins, store managers, and cashiers
- Reporting and refund workflows for daily store operations
- Event-driven notifications through RabbitMQ

## Architecture

The application is split into a frontend and a backend microservices ecosystem:

- Frontend: React + Vite + Redux + React Query + Tailwind CSS
- Backend: Spring Boot 3, Spring Security, Spring Cloud Gateway, MySQL, MongoDB, RabbitMQ
- Containerization: Docker Compose for infrastructure and service orchestration

### Backend services

- Auth service: login, registration, JWT authentication, user management, and admin settings
- Gateway service: central API entry point and routing
- Inventory service: products, categories, stock adjustments, low-stock logic
- Sales service: transactions, refunds, invoice handling, and sales summaries
- Customer service: customer records and loyalty-related operations
- Reporting service: sales and operational reporting endpoints
- Notification service: background notifications and messaging integration

## Features

### Point of Sale

- Search products by name or category
- Barcode-based product lookup
- Add/remove items, apply discounts, and manage held transactions
- Customer association and loyalty point usage
- Payment flow with support for Razorpay integration
- Refund request workflow for managers and admins

### Inventory Management

- Create, edit, and delete products
- Track stock levels and minimum thresholds
- Low-stock and out-of-stock indicators
- Stock transfer and manual stock adjustment workflows
- Product request and issue reporting

### Administration

- User registration and role-based authorization
- Admin settings and configuration controls
- Store-level reporting and daily summaries
- Role-based access restrictions for sensitive operations

## Tech Stack

### Frontend

- React 19
- Vite
- Redux Toolkit
- React Query
- Tailwind CSS
- Axios
- React Router
- Recharts, jsPDF, and Formik/Yup

### Backend

- Java 17
- Spring Boot 3.2
- Spring Security
- Spring Cloud Gateway
- MySQL
- MongoDB
- RabbitMQ
- Lombok
- MapStruct
- Docker

## Project Structure

```text
RetailTouch/
├── Backend/
│   ├── auth-service/
│   ├── common-lib/
│   ├── customer-service/
│   ├── gateway-service/
│   ├── inventory-service/
│   ├── notification-service/
│   ├── reporting-service/
│   ├── sales-service/
│   ├── docker-compose.yml
│   └── pom.xml
├── Frontend/
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   ├── features/
│   │   ├── layouts/
│   │   ├── routes/
│   │   ├── services/
│   │   └── utils/
│   ├── package.json
│   └── vite.config.js
└── README.md
```

## Prerequisites

Before running the project, make sure you have:

- Java 17+
- Maven
- Node.js 18+
- Docker and Docker Compose
- A terminal with access to the project folder

## Environment Setup

1. Copy the backend environment example:

```bash
cd Backend
copy .env.example .env
```

2. Update the values in Backend/.env, especially:

- JWT_SECRET
- AUTH_SETTINGS_ENCRYPTION_KEY
- AUTH_DB_PASSWORD
- RABBITMQ_USER
- RABBITMQ_PASSWORD

3. The project already includes a sample environment template for local and Docker-based startup.

## Running the Project

### Option 1: Run with Docker Compose

From the Backend folder:

```bash
docker compose up --build
```

This starts:

- MySQL for authentication data
- MongoDB for inventory, sales, and customer data
- RabbitMQ for messaging
- All Spring Boot services
- The frontend application

The gateway and frontend are exposed through the configured ports, typically:

- Frontend: http://localhost:5173
- Gateway/API: http://localhost:8080

### Option 2: Run locally for development

#### Backend

Start the infrastructure services:

```bash
cd Backend
docker compose up mysql mongodb rabbitmq -d
```

Then run the backend services from their modules or from the parent Maven project. For example:

```bash
cd Backend
./mvnw spring-boot:run -pl auth-service
```

You can repeat the same pattern for the other services as needed.

#### Frontend

```bash
cd Frontend
npm install
npm run dev
```

The frontend will typically run on:

- http://localhost:5173

## Default Access

If bootstrap users are enabled in the environment configuration, the system can create initial accounts such as:

- Admin
- Manager
- Cashier

Use the configured credentials from Backend/.env to sign in after the auth service starts.

## API and Service Notes

- The frontend communicates with the backend through the gateway service.
- Authentication is handled with JWT tokens.
- The backend uses separate data stores for different domains:
  - MySQL for auth and user security data
  - MongoDB for inventory, sales, customer, and reporting data
  - RabbitMQ for asynchronous messaging and notifications

## Development Notes

- The frontend uses React Query for API state and caching.
- Redux is used for authentication, cart state, UI state, settings, and notifications.
- The backend is structured as independent modules, making it suitable for future scaling and service isolation.

## License

This project is intended for educational and demonstration purposes.
