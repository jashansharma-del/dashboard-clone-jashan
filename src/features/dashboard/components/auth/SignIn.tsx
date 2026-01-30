import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { useForm } from "react-hook-form";
import {authService } from "../utils/authService";
import { account } from "./appwriteClient";




type AuthFormData = {
  name?: string;
  email: string;
  password: string;
};

export default function SignIn() {
  const navigate = useNavigate();

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AuthFormData>();

  useEffect(() => {
    const checkSession = async () => {
      try {
        await account.get();
        navigate("/boards");
      } catch {
        console.log("No active session");
      }
    };
    
    checkSession();
  }, [navigate]);

  const onSubmit = async (data: AuthFormData) => {
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const { name, email, password } = data;

      if (isRegister) {
        const user = await authService.register(email, password, name || "");
        console.log("Registration successful, user:", user);
        console.log("LocalStorage auth_user:", localStorage.getItem("auth_user"));

        setSuccess("✅ Account created successfully!");
        setTimeout(() => navigate("/boards"), 1500);
      } else {
        const user = await authService.login(email, password);
        console.log("Login successful, user:", user);
        console.log("LocalStorage auth_user:", localStorage.getItem("auth_user"));
        navigate("/boards");
      }
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'code' in err) {
        const error = err as { code: number };
        if (error.code === 409) setError("Account already exists");
        else if (error.code === 401) setError("Invalid email or password");
        else setError("Something went wrong");
      } else {
        setError("Something went wrong");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: "url('/ciscoimg.jpg')",
      }}
    >
      <div className="bg-black/15 backdrop-blur-[1px] border border-white/20 shadow-lg rounded-xl p-8 text-white">
        <h2 className="text-2xl font-bold text-center mb-2">
          {isRegister ? "Create Account" : "Welcome Back"}
        </h2>

        {error && <p className="text-red-500 text-center">{error}</p>}
        {success && <p className="text-green-500 text-center">{success}</p>}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {isRegister && (
            <div>
              <input
                placeholder="Full Name"
                {...register("name", { required: "Name is required" })}
                className="w-full border px-3 py-2"
              />
              {errors.name && <p className="text-red-500">{errors.name.message}</p>}
            </div>
          )}

          <input
            placeholder="Email"
            {...register("email", { required: "Email is required" })}
            className="w-full border px-3 py-2"
          />

          <input
            type="password"
            placeholder="Password"
            {...register("password", {
              required: "Password required",
              minLength: { value: 8, message: "Min 8 chars" },
            })}
            className="w-full border px-3 py-2"
          />

          <button
            type="submit"
            disabled={loading || isSubmitting}
            className="w-full bg-blue-600 text-white py-2 rounded"
          >
            {isRegister ? "Create Account" : "Sign In"}
          </button>
        </form>

        <p
          className="text-center mt-4 text-blue-600 cursor-pointer"
          onClick={() => {
            setIsRegister(!isRegister);
            setError("");
            setSuccess("");
            reset();
          }}
        >
          {isRegister ? "Sign In" : "Create Account"}
        </p>
      </div>
    </div>
  );
}