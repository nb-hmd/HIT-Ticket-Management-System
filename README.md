# HIT-TMS (Ticket Management System)

A comprehensive ticket management system built for Heavy Industries Taxila (HIT) to streamline support requests, approvals, and task assignments across different departments and factories.

## 🚀 Features

### Multi-Role Support
- **Admin**: Full system control, user management, ticket approvals
- **Support Staff**: Ticket handling, assignment management, resolution tracking
- **Employee**: Ticket creation, status tracking, communication

### Core Functionality
- **Ticket Management**: Create, track, and resolve support tickets
- **Approval Workflow**: Admin approval system for ticket processing
- **User Management**: Role-based access control and user administration
- **Factory Integration**: Multi-factory support with department-specific routing
- **Real-time Updates**: Live status updates and notifications
- **File Attachments**: Support for document and image uploads

## 🛠️ Technology Stack

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Zustand** for state management
- **React Router** for navigation
- **Vite** for build tooling

### Backend
- **Node.js** with Express.js
- **TypeScript** for type safety
- **SQLite** database with Sequelize ORM
- **JWT** authentication
- **Multer** for file uploads
- **Joi** for validation

## 📸 Application Screenshots

### Login Page
![Login Page](demo/Login%20Page.png)
*Secure authentication system with role-based access control for Admin, Support Staff, and Employee users*

### Admin Dashboard
![Admin Dashboard](demo/Admin%20-%20Dashboard.png)
*Comprehensive admin overview with system statistics, pending approvals, and quick action buttons for system management*

### Admin - User Management
![Admin User Management](demo/Admin%20-%20User%20managements.png)
*Complete user administration interface with role management, factory assignments, and user account controls*

### Admin - View Employee Tickets
![Admin View Tickets](demo/Admin%20-%20View%20employee%20tickets.png)
*Centralized ticket management dashboard with filtering capabilities, approval workflows, and ticket status tracking*

### Employee Dashboard
![Employee Dashboard](demo/Employee%20-%20Dashboard.png)
*Employee interface showing personal ticket history, status updates, and quick access to create new support requests*

### Support Staff Dashboard
![Support Dashboard](demo/Support%20Stuff%20-%20Dashboard.png)
*Support team interface with assigned tickets, workload management, and resolution tracking capabilities*

### Create Ticket Interface
![Create Ticket](demo/Admin,%20Employee,%20Support%20Stuff%20-%20Create%20Ticket.png)
*Universal ticket creation form with priority settings, factory selection, detailed descriptions, and file attachment support*

## 🚀 Installation & Setup

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn package manager

### Installation Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/nb-hmd/HIT-Ticket-Management-System.git
   cd HIT-Ticket-Management-System
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   # Configure your environment variables
   ```

4. **Database Setup**
   ```bash
   npm run db:migrate
   npm run db:seed
   ```

5. **Start Development Servers**
   ```bash
   # Start backend server (Port 3002)
   npm run server:dev
   
   # Start frontend development server (Port 5173)
   npm run client:dev
   ```

6. **Access the Application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3002

## 👥 Default User Accounts

| Role | Username | Password | Factory |
|------|----------|----------|---------|
| Admin | HIT000001 | admin123 | Heavy Rebuild |
| Support Staff | HIT000002 | support123 | Heavy Rebuild |
| Employee | HIT000003 | employee123 | Heavy Rebuild |

## 📚 API Documentation

### Authentication Endpoints
- `POST /api/auth/login` - User authentication
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user info

### Ticket Management
- `GET /api/tickets` - List tickets (filtered by role)
- `POST /api/tickets` - Create new ticket
- `GET /api/tickets/:id` - Get ticket details
- `PUT /api/tickets/:id` - Update ticket
- `POST /api/tickets/:id/approve` - Approve ticket (Admin)
- `POST /api/tickets/:id/assign` - Assign to support staff

### User Management (Admin Only)
- `GET /api/users` - List all users
- `POST /api/users` - Create new user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Factory Management
- `GET /api/users/factories/list` - List all factories

## 📁 Project Structure

```
HIT-Ticket-Management-System/
├── api/                    # Backend API
│   ├── config/            # Database configuration
│   ├── middleware/        # Authentication & error handling
│   ├── models/           # Database models
│   ├── routes/           # API routes
│   └── utils/            # Utilities and validation
├── src/                   # Frontend React application
│   ├── components/       # Reusable UI components
│   ├── pages/           # Page components
│   ├── stores/          # State management
│   └── utils/           # Frontend utilities
├── demo/                 # Application screenshots
├── migrations/          # Database migrations
└── public/              # Static assets
```

## 🔧 Available Scripts

- `npm run client:dev` - Start frontend development server
- `npm run server:dev` - Start backend development server
- `npm run build` - Build production version
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

## 🌟 Key Features

### Workflow Management
1. **Employee Creates Ticket** → Status: "pending"
2. **Admin Reviews Ticket** → Can approve or reject
3. **Admin Approves Ticket** → Status: "approved"
4. **Admin Forwards to Support Staff** → Status: "assigned"
5. **Support Staff Works on Ticket** → Status: "in_progress"
6. **Support Staff Completes** → Status: "resolved"

### Security Features
- JWT-based authentication
- Role-based access control
- Secure password hashing
- Protected API endpoints
- Input validation and sanitization

### User Experience
- Responsive design for all devices
- Real-time form validation
- Intuitive navigation
- Professional HIT branding
- Error handling and user feedback

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🏢 About HIT

Heavy Industries Taxila (HIT) is a state-owned defense production facility in Pakistan, specializing in the manufacture and rebuild of tanks, armored vehicles, and other military equipment.

## 📞 Support

For support and queries, please contact me or create an issue in this repository.
aneebahmed11@outlook.com | aneebahmed91@gmail.com

---

**Built with ❤️ for Heavy Industries Taxila**
