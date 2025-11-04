# 🚀 Quick Reference - Backend Integration

## Authentication in React Components

### 1. Wrap your app with AuthProvider

```typescript
// In your main App.tsx or main.tsx
import { AuthProvider } from '@/lib/useAuth';

function App() {
  return (
    <AuthProvider>
      {/* Your app components */}
    </AuthProvider>
  );
}
```

### 2. Use the useAuth hook in components

```typescript
import { useAuth } from '@/lib/useAuth';

function MyComponent() {
  const { user, login, logout, isAuthenticated, loading } = useAuth();

  const handleLogin = async () => {
    try {
      await login('user@example.com', 'password123');
      console.log('Logged in!');
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      {isAuthenticated ? (
        <div>
          <p>Welcome, {user?.email}</p>
          <button onClick={logout}>Logout</button>
        </div>
      ) : (
        <button onClick={handleLogin}>Login</button>
      )}
    </div>
  );
}
```

### 3. Protect routes

```typescript
import { ProtectedRoute } from '@/components/ProtectedRoute';

// In your router setup
<Route path="/dashboard" element={
  <ProtectedRoute>
    <Dashboard />
  </ProtectedRoute>
} />
```

## API Usage Examples

### Authentication

```typescript
import { authAPI } from '@/lib/api';

// Register
const response = await authAPI.register({
  email: 'user@example.com',
  password: 'password123',
  firstName: 'John',
  lastName: 'Doe'
});

// Login
const response = await authAPI.login({
  email: 'user@example.com',
  password: 'password123'
});

// Get Profile
const profile = await authAPI.getProfile();

// Logout
authAPI.logout();
```

### Academics

```typescript
import { academicsAPI } from '@/lib/api';

// Get all records
const academics = await academicsAPI.getAll();

// Create
const newCourse = await academicsAPI.create({
  courseName: 'Computer Science 101',
  grade: 'A',
  credits: 3,
  semester: 'Fall',
  year: 2024,
  status: 'completed'
});

// Update
await academicsAPI.update('course-id', { grade: 'A+' });

// Delete
await academicsAPI.delete('course-id');
```

### Finance

```typescript
import { financeAPI } from '@/lib/api';

// Get all records
const finances = await financeAPI.getAll();

// Add expense
await financeAPI.create({
  category: 'expense',
  amount: 50.00,
  description: 'Textbooks',
  date: new Date()
});

// Add income
await financeAPI.create({
  category: 'income',
  amount: 500.00,
  description: 'Part-time job',
  date: new Date()
});
```

### Journal

```typescript
import { journalAPI } from '@/lib/api';

// Get all entries
const journals = await journalAPI.getAll();

// Get specific entry
const entry = await journalAPI.getById('entry-id');

// Create entry
await journalAPI.create({
  title: 'Great Day!',
  content: 'Today was amazing...',
  mood: 'happy',
  tags: ['productivity', 'exercise'],
  date: new Date()
});

// Update
await journalAPI.update('entry-id', { mood: 'excited' });

// Delete
await journalAPI.delete('entry-id');
```

### Tasks

```typescript
import { tasksAPI } from '@/lib/api';

// Get all tasks
const tasks = await tasksAPI.getAll();

// Create task
await tasksAPI.create({
  title: 'Complete assignment',
  description: 'Math homework',
  priority: 'high',
  status: 'pending',
  dueDate: new Date('2024-12-31')
});

// Update task
await tasksAPI.update('task-id', { status: 'completed' });

// Delete task
await tasksAPI.delete('task-id');
```

### Skills

```typescript
import { skillsAPI } from '@/lib/api';

// Get all skills
const skills = await skillsAPI.getAll();

// Add skill
await skillsAPI.create({
  name: 'React',
  category: 'technical',
  level: 'intermediate',
  description: 'Frontend development'
});

// Update skill level
await skillsAPI.update('skill-id', { level: 'advanced' });
```

### Lifestyle

```typescript
import { lifestyleAPI } from '@/lib/api';

// Get all records
const lifestyle = await lifestyleAPI.getAll();

// Log daily data
await lifestyleAPI.create({
  date: new Date(),
  sleepHours: 7.5,
  exerciseMinutes: 30,
  waterIntake: 2.5,
  mealQuality: 'good',
  stressLevel: 3,
  notes: 'Felt energized today'
});
```

## Complete Component Example

```typescript
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/useAuth';
import { academicsAPI } from '@/lib/api';

function AcademicsPage() {
  const { user, isAuthenticated } = useAuth();
  const [academics, setAcademics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAcademics();
  }, []);

  const fetchAcademics = async () => {
    try {
      setLoading(true);
      const data = await academicsAPI.getAll();
      setAcademics(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addCourse = async () => {
    try {
      await academicsAPI.create({
        courseName: 'New Course',
        grade: 'A',
        credits: 3,
        semester: 'Fall',
        year: 2024
      });
      fetchAcademics(); // Refresh list
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h1>Academic Records</h1>
      <button onClick={addCourse}>Add Course</button>
      <ul>
        {academics.map((course: any) => (
          <li key={course.id}>
            {course.courseName} - {course.grade}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

## Error Handling Pattern

```typescript
const handleApiCall = async () => {
  try {
    setLoading(true);
    const data = await someAPI.someMethod();
    // Handle success
  } catch (error: any) {
    if (error.message.includes('401')) {
      // Unauthorized - redirect to login
      logout();
      navigate('/login');
    } else {
      // Show error message
      setError(error.message);
    }
  } finally {
    setLoading(false);
  }
};
```

## Environment Variables

**Backend (.env)**
```
DATABASE_URL=postgresql://postgres:root@localhost:5432/student_dashboard?schema=public
PORT=5000
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
```

**Frontend (.env)**
```
VITE_API_URL=http://localhost:5000/api
```

## API Endpoints Reference

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/register` | Register new user | No |
| POST | `/api/auth/login` | Login user | No |
| GET | `/api/auth/profile` | Get user profile | Yes |
| GET | `/api/academics` | Get all academic records | Yes |
| POST | `/api/academics` | Create academic record | Yes |
| PUT | `/api/academics/:id` | Update academic record | Yes |
| DELETE | `/api/academics/:id` | Delete academic record | Yes |
| GET | `/api/finances` | Get all finance records | Yes |
| POST | `/api/finances` | Create finance record | Yes |
| PUT | `/api/finances/:id` | Update finance record | Yes |
| DELETE | `/api/finances/:id` | Delete finance record | Yes |
| GET | `/api/journals` | Get all journal entries | Yes |
| GET | `/api/journals/:id` | Get specific journal entry | Yes |
| POST | `/api/journals` | Create journal entry | Yes |
| PUT | `/api/journals/:id` | Update journal entry | Yes |
| DELETE | `/api/journals/:id` | Delete journal entry | Yes |
| GET | `/api/tasks` | Get all tasks | Yes |
| POST | `/api/tasks` | Create task | Yes |
| PUT | `/api/tasks/:id` | Update task | Yes |
| DELETE | `/api/tasks/:id` | Delete task | Yes |
| GET | `/api/skills` | Get all skills | Yes |
| POST | `/api/skills` | Create skill | Yes |
| PUT | `/api/skills/:id` | Update skill | Yes |
| DELETE | `/api/skills/:id` | Delete skill | Yes |
| GET | `/api/lifestyle` | Get all lifestyle records | Yes |
| POST | `/api/lifestyle` | Create lifestyle record | Yes |
| PUT | `/api/lifestyle/:id` | Update lifestyle record | Yes |
| DELETE | `/api/lifestyle/:id` | Delete lifestyle record | Yes |

## Running the Application

1. **Start Backend:**
```powershell
cd backend
npm run dev
```

2. **Start Frontend:**
```powershell
cd client
npm run dev
```

3. **Access Application:**
- Frontend: http://localhost:5173
- Backend: http://localhost:5000
- Health Check: http://localhost:5000/api/health

## Troubleshooting

**401 Unauthorized Error:**
- Token expired or invalid
- User not logged in
- Solution: Call `login()` again

**CORS Error:**
- Backend not running
- Wrong CLIENT_URL in backend .env
- Solution: Check backend console and CORS settings

**Database Error:**
- PostgreSQL not running
- Wrong credentials in .env
- Database doesn't exist
- Solution: Check PostgreSQL service and credentials

---

**Need more help?** Check:
- `SETUP.md` - Setup instructions
- `BACKEND_INTEGRATION.md` - Detailed integration guide
- `backend/README.md` - Backend API docs
