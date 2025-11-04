# Backend Integration Guide

## ✅ Setup Complete!

Your backend is now fully configured and running! Here's a summary of what has been set up:

### Backend Components
- ✅ Express.js server with TypeScript
- ✅ Prisma ORM with PostgreSQL
- ✅ JWT-based authentication
- ✅ RESTful API endpoints
- ✅ CORS configured for React frontend
- ✅ Environment variables (.env file)
- ✅ Database schema with 7 models (User, Academic, Finance, Journal, Task, Skill, Lifestyle)

### Frontend Components
- ✅ API client utility (`client/src/lib/api.ts`)
- ✅ Environment variables for API URL
- ✅ Example authentication component

## 🚀 Backend is Running

Your backend server is currently running at: **http://localhost:5000**

### Quick Test
Test the backend health endpoint:
```
http://localhost:5000/api/health
```

## 📁 File Structure

### Backend (`/backend`)
```
backend/
├── prisma/
│   └── schema.prisma          # Database schema
├── src/
│   ├── controllers/
│   │   └── auth.controller.ts # Authentication logic
│   ├── middleware/
│   │   └── auth.middleware.ts # JWT authentication
│   ├── routes/
│   │   ├── auth.routes.ts     # Auth endpoints
│   │   ├── academic.routes.ts
│   │   ├── finance.routes.ts
│   │   ├── journal.routes.ts
│   │   ├── task.routes.ts
│   │   ├── skill.routes.ts
│   │   └── lifestyle.routes.ts
│   └── server.ts              # Main server file
├── .env                       # Environment variables
├── package.json
└── tsconfig.json
```

### Frontend API Integration (`/client`)
```
client/src/
└── lib/
    └── api.ts                 # API client with all endpoints
```

## 🔑 Authentication Flow

1. **Register a new user:**
```typescript
import { authAPI } from '@/lib/api';

const response = await authAPI.register({
  email: 'user@example.com',
  password: 'password123',
  firstName: 'John',
  lastName: 'Doe'
});
// Token is automatically stored in localStorage
```

2. **Login:**
```typescript
const response = await authAPI.login({
  email: 'user@example.com',
  password: 'password123'
});
// Token is automatically stored in localStorage
```

3. **Access protected routes:**
The token is automatically included in all API requests after login.

4. **Logout:**
```typescript
authAPI.logout(); // Removes token from localStorage
```

## 📊 Available API Endpoints

### Authentication (No auth required)
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Protected Endpoints (Require authentication)
- `GET /api/auth/profile` - Get user profile

### Academics
- `GET /api/academics` - Get all academic records
- `POST /api/academics` - Create record
- `PUT /api/academics/:id` - Update record
- `DELETE /api/academics/:id` - Delete record

### Finance
- `GET /api/finances` - Get all finance records
- `POST /api/finances` - Create record
- `PUT /api/finances/:id` - Update record
- `DELETE /api/finances/:id` - Delete record

### Journal
- `GET /api/journals` - Get all journal entries
- `GET /api/journals/:id` - Get specific entry
- `POST /api/journals` - Create entry
- `PUT /api/journals/:id` - Update entry
- `DELETE /api/journals/:id` - Delete entry

### Tasks
- `GET /api/tasks` - Get all tasks
- `POST /api/tasks` - Create task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task

### Skills
- `GET /api/skills` - Get all skills
- `POST /api/skills` - Create skill
- `PUT /api/skills/:id` - Update skill
- `DELETE /api/skills/:id` - Delete skill

### Lifestyle
- `GET /api/lifestyle` - Get all lifestyle records
- `POST /api/lifestyle` - Create record
- `PUT /api/lifestyle/:id` - Update record
- `DELETE /api/lifestyle/:id` - Delete record

## 💡 Usage Examples

### Using in React Components

```typescript
import { academicsAPI, financeAPI, tasksAPI } from '@/lib/api';

// Get all academic records
const academics = await academicsAPI.getAll();

// Create a new academic record
await academicsAPI.create({
  courseName: 'Computer Science 101',
  grade: 'A',
  credits: 3,
  semester: 'Fall',
  year: 2024,
  status: 'completed'
});

// Add a financial transaction
await financeAPI.create({
  category: 'expense',
  amount: 50.00,
  description: 'Textbooks',
  date: new Date()
});

// Create a task
await tasksAPI.create({
  title: 'Complete assignment',
  description: 'Math homework',
  priority: 'high',
  status: 'pending',
  dueDate: new Date('2024-12-31')
});
```

### Example Component
I've created an example authentication component at:
`client/src/components/examples/AuthExample.tsx`

You can import and use it in your app to test the authentication flow.

## 🛠️ Development Commands

### Backend
```powershell
cd backend

# Start dev server (already running)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Open Prisma Studio (database GUI)
npm run prisma:studio

# Generate Prisma Client
npm run prisma:generate
```

### Frontend
```powershell
cd client

# Start dev server
npm run dev
```

## 🔒 Security Notes

1. **Change JWT Secret:** Update `JWT_SECRET` in `backend/.env` before production
2. **Database Password:** Your PostgreSQL password is "root" as requested
3. **CORS:** Currently allowing requests from http://localhost:5173
4. **Tokens:** Stored in localStorage (consider httpOnly cookies for production)

## 🎯 Next Steps

1. **Integrate authentication** into your existing components
2. **Create protected routes** using the auth token
3. **Build UI components** that interact with the API endpoints
4. **Add error handling** and loading states
5. **Implement data validation** on forms
6. **Add refresh token logic** for better security (optional)

## 📝 Database Schema

Your database has the following models:
- **User** - User accounts with authentication
- **Academic** - Course and grade tracking
- **Finance** - Income/expense management
- **Journal** - Daily journal entries with mood tracking
- **Task** - Task/todo management with priorities
- **Skill** - Skills tracking with proficiency levels
- **Lifestyle** - Health and wellness tracking (sleep, exercise, etc.)

All models are automatically related to the User model through foreign keys.

## 🐛 Troubleshooting

If you encounter issues:
1. Ensure PostgreSQL is running
2. Check that port 5000 is available
3. Verify database credentials in `backend/.env`
4. Check backend terminal for error messages
5. Ensure frontend is using correct API URL

## 📚 Additional Resources

- [Prisma Documentation](https://www.prisma.io/docs)
- [Express.js Guide](https://expressjs.com/)
- [JWT Authentication](https://jwt.io/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

---

**Your backend is ready to use!** Start building your frontend components and integrate with the API endpoints. Happy coding! 🚀
