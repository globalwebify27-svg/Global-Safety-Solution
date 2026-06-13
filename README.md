# Global Safety Solution ERP

A comprehensive, enterprise-grade Enterprise Resource Planning (ERP) platform designed for safety management, real-time compliance tracking, client management, site inspections, and automated workforce operations.

---

## 🌟 Key Features

### 🔐 Security & Access Control
- **Role-Based Access Control (RBAC)**: Fine-grained permissions managing access to modules (Sales, Operations, HR, Finance, System Settings).
- **Secure Authentication**: JWT-based authentication with password hashing using `bcrypt`.
- **Predefined Roles**:
  - `SUPER_ADMIN`: Complete system access and role/organization management.
  - `HR_MANAGER`: Employee lifecycle, attendance logs, and payroll processing.
  - `FIELD_ENGINEER`: Site inspections and safety report uploads.
  - `SALES_EXECUTIVE`: Pipeline management, leads tracking, and quotation generation.
  - `CLIENT`: Dedicated portal for reports, invoices, and compliance certificates.

### 💼 Client & Lead Management
- **Leads Pipeline**: Track progress from fresh prospects to won deals.
- **Client Profiles**: Dedicated profiles linking leads, quotations, and active projects.
- **Officer Assignment**: Clear accountability with assigned officers for leads and accounts.

### 📄 Quotation & Invoice Hub
- **Interactive Quotations**: Easily generate, review, and approve quotations.
- **Instant Client/Project Conversion**: Convert approved quotations directly into active client profiles or operations projects.
- **Invoicing & Payments**: Send professional PDF invoices, track payment status, and reconcile balances.

### 👷 Operations & Compliance
- **Site Inspections**: Field engineers can submit inspection reports directly from sites.
- **Digital Vault**: Secure repository for uploading and storing project compliance certificates.
- **Automated Renewals**: Tracks certificate expiry and prompts for timely renewals.

### 👥 HR & Payroll
- **Employee Directory**: Manage detailed professional profiles.
- **Attendance Tracker**: Log and monitor daily clock-in/out records.
- **Payroll Processing**: Generate monthly salary slips, calculate allowances, and track disbursements.

---

## 🛠 Tech Stack

- **Monorepo Manager**: [Turborepo](https://turbo.build/)
- **Frontend**: [Next.js](https://nextjs.org/) (App Router, Turbopack, Tailwind CSS, Shadcn UI, Zustand, Sonner, Lucide Icons)
- **Backend**: [NestJS](https://nestjs.com/) (REST APIs, JWT Passport, Validation Pipes)
- **Database ORM**: [Prisma](https://www.prisma.io/)
- **Database Engine**: MySQL (Remote Production Host / Local Support)

---

## 📁 Repository Structure

```
global-safety-solution-erp/
├── apps/
│   ├── frontend/             # Next.js UI Application (Port 3000)
│   └── backend/              # NestJS Server Engine (Port 3001)
├── packages/
│   └── database/             # Prisma Schema & Client Generation
├── package.json              # Monorepo configuration and scripts
├── turbo.json                # Turborepo task pipeline config
└── README.md                 # Project Documentation
```

---

## ⚙ Getting Started

### Prerequisites
- Node.js (v18.x or above)
- npm (v10.x or above)
- MySQL instance (Local or Remote)

### Setup Instructions

1. **Clone the Repository**:
   ```bash
   git clone <repository-url>
   cd Global-Safety-Solution
   ```

2. **Configure Environment Variables**:
   Create a `.env` file in the **root directory**, **`apps/backend/`**, and **`packages/database/`**. Use the following template:

   ```env
   # Database connection (MySQL)
   DATABASE_URL="mysql://<user>:<password>@<host>:<port>/<database>"

   # Backend Server configuration
   PORT=3001
   JWT_SECRET="your_secure_jwt_random_secret_string"

   # SMTP Configurations (optional/fallback in place)
   SMTP_HOST="smtp.mailtrap.io"
   SMTP_PORT=2525
   SMTP_USER=""
   SMTP_PASS=""
   ```

3. **Install Dependencies**:
   ```bash
   npm install
   ```

4. **Sync Database Schema**:
   Deploy the Prisma schema to your target MySQL database:
   ```bash
   npm run db:push --workspace=@repo/database
   ```

5. **Seed Database Roles & Admin**:
   Populate roles, permissions, and the default super admin:
   ```bash
   npm run seed --workspace=backend
   ```

6. **Reset User Passwords** (Optional):
   Resets all database user passwords to the default developer password (`Staff@123`):
   ```bash
   npm run reset:passwords --workspace=backend
   ```

---

## 🚀 Execution Commands

| Command | Action | Workspace |
| :--- | :--- | :--- |
| `npm run dev` | Start development servers for frontend & backend | Global |
| `npm run build` | Compile and build the entire codebase for production | Global |
| `npm run start` | Run production servers | Global |
| `npm run db:push` | Push schema changes to the MySQL database | `@repo/database` |
| `npm run seed` | Seed initial roles, permissions, and default admin.

## 📝 License

Private / Confidential. All rights reserved.

#hello world