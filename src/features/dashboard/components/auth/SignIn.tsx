import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import usersData from "../../../../../data/users.json";

type User = {
  id: number;
  name: string;
  password: string;
};

export default function SignIn() {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [users, setUsers] = useState<User[]>([]); // ✅ Corrected
  const navigate = useNavigate();

  useEffect(() => {
    // Auto-login if 2-hour session exists
    const token = localStorage.getItem("authToken");
    const loginTime = localStorage.getItem("loginTime");
    const twoHours = 2 * 60 * 60 * 1000;

    if (token && loginTime && Date.now() - parseInt(loginTime) < twoHours) {
      navigate("/boards");
    } else {
      localStorage.removeItem("authToken");
      localStorage.removeItem("loginTime");
    }

    // Load users from localStorage or fallback JSON
    const storedUsers = localStorage.getItem("users");
    if (storedUsers) {
      setUsers(JSON.parse(storedUsers));
    } else {
      setUsers(usersData);
      localStorage.setItem("users", JSON.stringify(usersData));
    }
  }, [navigate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isRegister) {
      // Register new user
      const exists = users.find((u) => u.name === name);
      if (exists) {
        setError("User name already exists!");
        return;
      }

      const newUser: User = {
        id: users.length + 1,
        name,
        password,
      };

      const updatedUsers = [...users, newUser];
      setUsers(updatedUsers);
      localStorage.setItem("users", JSON.stringify(updatedUsers));

      setError("✅ Account created successfully! You can now login.");
      setIsRegister(false);
      setName("");
      setPassword("");
      return;
    }

    // Login
    const user = users.find((u) => u.name === name && u.password === password);
    if (user) {
      const token = btoa(JSON.stringify({ name: user.name }));
      localStorage.setItem("authToken", token);
      localStorage.setItem("loginTime", Date.now().toString());
      navigate("/boards");
    } else {
      setError("!! Invalid name or password !!");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white w-full max-w-md rounded-xl shadow-lg p-8">
        <h2 className="text-2xl font-bold text-center mb-2">
          {isRegister ? "Create Account" : "Welcome Back"}
        </h2>
        <p className="text-gray-700 text-center mb-6">
          {isRegister
            ? "Fill in the details to create your account"
            : "Please sign in to your account"}
        </p>

        {error && (
          <div className="bg-red-100 text-red-600 text-center p-2 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">User Name</label>
            <input
              type="text"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={!name || !password}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition disabled:opacity-50"
          >
            {isRegister ? "Create Account" : "Sign In"}
          </button>
        </form>

        <p className="text-center mt-4 text-sm text-gray-600">
          {isRegister ? "Already have an account? " : "Don't have an account? "}
          <span
            className="text-blue-600 cursor-pointer"
            onClick={() => {
              setError("");
              setIsRegister(!isRegister);
            }}
          >
            {isRegister ? "Sign In" : "Create Account"}
          </span>
        </p>
      </div>
    </div>
  );
}
