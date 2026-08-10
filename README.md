# Group3-Warehouse-MockProject
# 📦 TechStock — Smart Computers & Components Warehouse

> A comprehensive multi-warehouse management system built for the Group 3 Mock Project.

TechStock is designed to manage inventory, track inbound and outbound shipments, handle orders, manage suppliers, and perform stocktakes across multiple warehouse locations efficiently.

## 🚀 Features

### Core Modules
- **📦 Inventory Management**: Real-time tracking of products across multiple warehouses, racks, and bins.
- **📥 Inbound (Nhập kho)**: Create, manage, and approve inbound receipts. Automatic inventory increment upon manager approval.
- **📤 Outbound (Xuất kho)**: Create, manage, and approve outbound receipts for customer orders.
- **⚠️ Low Stock Alerts & Auto-Reorder**: Event-driven architecture that automatically generates pending inbound receipts when stock falls below the threshold.
- **👥 Role-based Access Control (RBAC)**: Secure access using JWT. Differentiates between Admin, Manager, Warehouse Manager, and Staff roles.

### Advanced Capabilities
- **📊 Dashboard & Statistics**: Visualize data with metrics like total units, receipts, and active suppliers.
- **📑 Approval Workflow**: Two-step verification process (Pending → Approved/Rejected) to ensure data integrity.
- **📁 Import/Export**: Export data to CSV with BOM support (for Excel). Import data using downloadable Excel templates with data validation.
- **🔍 Advanced Search & Filtering**: Server-side pagination, dynamic filtering, and search capabilities using JPQL `JOIN FETCH` to prevent N+1 issues.

## 💻 Tech Stack

### Backend (Java / Spring Boot)
- **Framework**: Spring Boot 3.x
- **Language**: Java 17+
- **Database**: MySQL
- **ORM**: Spring Data JPA / Hibernate
- **Security**: Spring Security + JWT Authentication
- **Tools**: Lombok, Maven

### Frontend (React / TypeScript)
- **Framework**: React 18
- **Build Tool**: Vite
- **Language**: TypeScript
- **Routing**: TanStack Router (File-based routing)
- **Styling**: Tailwind CSS
- **HTTP Client**: Axios (with Request/Response Interceptors)
- **State Management**: React Context API (`useApp`), React Hooks

## 📂 Project Structure

```text
Group3-Warehouse-MockProject/
├── sccw/                     # Backend Application (Spring Boot)
│   ├── src/main/java/com/fpt/sccw/
│   │   ├── controller/       # REST API endpoints
│   │   ├── service/          # Business logic
│   │   ├── repository/       # Database interactions (JPQL)
│   │   ├── entity/           # Database mapping (JPA)
│   │   ├── dto/              # Data Transfer Objects
│   │   └── security/         # JWT and Auth configurations
│   └── pom.xml               # Maven dependencies
│
└── warehouse_frontend_v2/    # Frontend Application (React + Vite)
    ├── src/
    │   ├── routes/           # TanStack Router page components (e.g., inbound.tsx)
│   ├── components/       # Reusable UI components & Modals
    │   ├── lib/              # Utils, Axios config (api.ts), App Context
    │   ├── types/            # TypeScript interfaces
    │   └── assets/           # Static files
    └── package.json          # NPM dependencies
```

## 🛠️ Setup & Installation

### 1. Prerequisites
- Java 17+
- Node.js 18+
- MySQL Server

### 2. Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd sccw
   ```
2. Configure the database connection in `src/main/resources/application.properties` (or `application.yml`).
3. Run the Spring Boot application:
   ```bash
   ./mvnw spring-boot:run
   ```
   *The backend will run on `http://localhost:8080`*

### 3. Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd warehouse_frontend_v2
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
   *The frontend will run on `http://localhost:5173`*

## 👥 Contributors
- **Group 3** - FPT Mock Project

---
*Developed with ❤️ by Group 3.*