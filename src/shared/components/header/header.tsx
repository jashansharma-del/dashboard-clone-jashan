import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../../../store';
import { toggleTheme } from '../../../store/uiSlice';
import { logout } from '../../../store/authSlice';
import {
  Plus,
  Search,
  Sun,
  Moon,
  Wand2,
  HelpCircle,
  Bell,
  User,
  ChevronDown,
  LogOut,
} from "lucide-react";
import { Button } from "../ui/button/button";
import { Input } from "../ui/ui/input";


export default function Header() {
  const dispatch = useDispatch<AppDispatch>();
  const { theme } = useSelector((state: RootState) => state.ui);
  const navigate = useNavigate();
  
  const [open, setOpen] = useState(false);
  
  const userName = useSelector((state: RootState) => {
    const name = state.auth.user?.name;
    if (name && name.trim()) {
      return name;
    }
    try {
      const storedUser = localStorage.getItem("auth_user");
      if (storedUser) {
        const parsed = JSON.parse(storedUser) as { name?: string; email?: string };
        if (parsed.name && parsed.name.trim()) {
          return parsed.name;
        }
        if (parsed.email && parsed.email.trim()) {
          return parsed.email;
        }
      }
    } catch {
      // ignore parsing errors
    }
    return "User";
  });

  const handleToggleTheme = () => {
    dispatch(toggleTheme());
  };

  const handleLogout = async () => {
    try {
      console.log("Logout clicked");
      await dispatch(logout());
      // Set a flag in localStorage to signal other tabs
      localStorage.setItem('logout', 'true');
      setTimeout(() => {
        localStorage.removeItem('logout');
      }, 100); // Clear immediately after other tabs detect it
      navigate('/', { replace: true });
    } catch (err) {
      console.error(err);
    }
  };
  return (
    <header className="h-16 bg-gradient-to-r from-gray-800 to-gray-900 flex items-center px-6 transition-colors duration-300">
      <div className="flex w-full items-center justify-between text-white">
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <img src="/DotsNine.png" alt="Menu" className="w-8 h-8 sm:w-10 sm:h-10" />
          <img src="/Logo@2x.png" alt="Logo" className="w-8 h-6 sm:w-9 sm:h-6" />
          <div className="leading-tight hidden md:block">
            <p className="text-gray-300 text-xs sm:text-sm">Disco Commerce</p>
            <p className="text-base sm:text-lg font-semibold">Home</p>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 md:gap-4 flex-grow justify-end min-w-0">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white hidden md:flex">
            <Plus className="w-4 h-4 mr-1" />
            Create
            <ChevronDown className="w-4 h-4 ml-1" />
          </Button>

          <div className="h-6 w-px bg-white/30 hidden md:block" />

          <div className="relative hidden md:block min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search"
              className="pl-9 bg-gray-700 border-none text-white placeholder:text-gray-400 w-16 md:w-32 lg:w-64"
            />
          </div>

          <div 
            onClick={handleToggleTheme}
            className="w-5 h-5 cursor-pointer flex items-center justify-center flex-shrink-0"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </div>
          
          <Wand2 className="w-5 h-5 cursor-pointer flex-shrink-0 hidden lg:flex" />
          <HelpCircle className="w-5 h-5 cursor-pointer flex-shrink-0 hidden lg:flex" />
          <Bell className="w-5 h-5 cursor-pointer flex-shrink-0 hidden lg:flex" />

          <div className="relative flex-shrink-0">
            <div
              onClick={() => setOpen(!open)}
              className="flex items-center gap-2 cursor-pointer"
            >
              <User className="w-5 h-5" />
              <div className="leading-tight hidden sm:block">
                <p className="text-sm font-medium text-white truncate max-w-[60px]">{userName}</p>
                <p className="text-xs text-gray-400 hidden md:block">Logged in</p>
              </div>
              <ChevronDown className="w-4 h-4" />
            </div>

            {open && (
              <div className="bg-gray-800 text-white absolute right-0 mt-2 w-40 rounded shadow-md z-[100]">
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 w-full px-4 py-2 hover:bg-gray-700"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
