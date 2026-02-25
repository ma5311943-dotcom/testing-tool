# FYP Auto Tester 🚀

A comprehensive full-stack application designed for automated BDD (Behavior Driven Development) testing, accessibility auditing, and performance benchmarking.

## 🌟 Features

- **Automated BDD Testing**: Integrated with Cucumber for Gherkin-style test execution.
- **Accessibility Auditing**: Powered by `axe-core` to ensure WCAG compliance.
- **Performance Benchmarking**: Uses `Lighthouse` for detailed performance insights.
- **Web Automation**: Leverages `Puppeteer` for seamless browser interactions.
- **Full-Stack Architecture**: Modern React frontend with a robust Node.js/Express backend.
- **Cloud Integration**: Cloudinary support for media management and Clerk for authentication.

## 🏗️ Project Structure

```text
.
├── client/          # Vite + React Frontend
├── server/          # Node.js + Express Backend (+ Mongoose/MySQL)
├── package.json     # Root configuration for concurrent execution
└── .gitignore       # Optimized git ignore rules
```

## 🛠️ Getting Started

### Prerequisites

- Node.js (v18 or higher)
- MongoDB / MySQL (depending on your configuration)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/ma5311943-dotcom/bdd.git
   cd bdd
   ```

2. Install all dependencies (root, client, and server):
   ```bash
   npm run install:all
   ```

### Configuration

Setup your environment variables by creating `.env` files in both `client` and `server` directories based on the provided `.env.example` files.

#### Server (`server/.env`)
```env
PORT=5000
MONGO_URI=your_mongodb_uri
CLOUDINARY_NAME=your_name
...
```

#### Client (`client/.env`)
```env
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_key
```

### Running the Application

To start both the client and server concurrently:

```bash
npm run dev
```

The application will be available at:
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`

## 🧪 Testing with BDD

The server includes a dedicated BDD service that processes Gherkin features and executes them using Puppeteer.

## 📜 License

This project is licensed under the MIT License.
