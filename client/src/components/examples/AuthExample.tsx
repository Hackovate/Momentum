import { useState } from 'react';
import { authAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function AuthExample() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [message, setMessage] = useState('');
  const [user, setUser] = useState<any>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await authAPI.register({
        email,
        password,
        firstName,
        lastName,
      });
      setMessage(`Registration successful! Welcome ${response.user.firstName}`);
      setUser(response.user);
    } catch (error: any) {
      setMessage(`Error: ${error.message}`);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await authAPI.login({ email, password });
      setMessage(`Login successful! Welcome back ${response.user.firstName || response.user.email}`);
      setUser(response.user);
    } catch (error: any) {
      setMessage(`Error: ${error.message}`);
    }
  };

  const handleGetProfile = async () => {
    try {
      const response = await authAPI.getProfile();
      setMessage(`Profile loaded for ${response.user.email}`);
      setUser(response.user);
    } catch (error: any) {
      setMessage(`Error: ${error.message}`);
    }
  };

  const handleLogout = () => {
    authAPI.logout();
    setUser(null);
    setMessage('Logged out successfully');
  };

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Authentication Example</h1>
      
      {message && (
        <div className={`p-4 mb-4 rounded ${message.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
          {message}
        </div>
      )}

      {user && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Current User</CardTitle>
          </CardHeader>
          <CardContent>
            <p><strong>Email:</strong> {user.email}</p>
            {user.firstName && <p><strong>First Name:</strong> {user.firstName}</p>}
            {user.lastName && <p><strong>Last Name:</strong> {user.lastName}</p>}
            <p><strong>ID:</strong> {user.id}</p>
            <Button onClick={handleLogout} variant="destructive" className="mt-4">
              Logout
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Register Form */}
        <Card>
          <CardHeader>
            <CardTitle>Register</CardTitle>
            <CardDescription>Create a new account</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <Label htmlFor="reg-email">Email</Label>
                <Input
                  id="reg-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="reg-password">Password</Label>
                <Input
                  id="reg-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="reg-firstName">First Name</Label>
                <Input
                  id="reg-firstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="reg-lastName">Last Name</Label>
                <Input
                  id="reg-lastName"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full">
                Register
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Login Form */}
        <Card>
          <CardHeader>
            <CardTitle>Login</CardTitle>
            <CardDescription>Sign in to your account</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="login-email">Email</Label>
                <Input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="login-password">Password</Label>
                <Input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                Login
              </Button>
              <Button type="button" onClick={handleGetProfile} variant="outline" className="w-full">
                Get Profile
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
