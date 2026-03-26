# Payment Harmony: Online Payment Reconciliation System

Payment Harmony is a comprehensive financial reconciliation platform designed to automate and streamline the process of matching payment transactions with internal records. It provides robust tools for identifying discrepancies, managing invoices, and tracking financial exceptions.

## 🚀 Key Features

- **Automated Reconciliation**: Scheduled jobs to match transactions accurately.
- **Manual Adjustments**: Capability to manually review and flag transactions.
- **Exception Management**: Dedicated register for tracking and resolving financial discrepancies.
- **Invoice Tracking**: Create, view, and update invoice statuses.
- **Stripe Integration**: Secure payment processing with real-time status updates via webhooks.
- **Visual Analytics**: Interactive dashboards for financial health overview.
- **Secure Authentication**: JWT-based user authentication.

## 🛠️ Tech Stack

### Frontend
- **Framework**: React with Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS & Shadcn UI
- **State Management**: TanStack Query (React Query)
- **Charts**: Recharts
- **Forms**: React Hook Form with Zod validation

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB (Mongoose)
- **Security**: JWT & Bcrypt
- **Storage**: Multer for file uploads
- **Scheduling**: Node-cron for reconciliation tasks
- **Payments**: Stripe Node.js API

## 📦 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- MongoDB account (Atlas or local)
- Stripe account (for API keys)

### 1. Clone the repository
```bash
git clone <repository-url>
cd payment-harmony-main
```

### 2. Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the `backend` folder and add:
   ```env
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret
   PORT=5000
   STRIPE_SECRET_KEY=your_stripe_secret_key
   STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
   FRONTEND_URL=http://localhost:8080
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

### 3. Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the `frontend` folder and add:
   ```env
   VITE_API_URL=http://localhost:5000/api
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

## 📂 Project Structure

- `/backend`: Express API, Mongoose models, and reconciliation logic.
- `/frontend`: React dashboard, components, and UI logic.
- `/sample-data`: Scripts and data for populating the database.

## 📝 License

This project is licensed under the MIT License.
