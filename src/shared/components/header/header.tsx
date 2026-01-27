// Header.tsx
import {
  Plus,
  Search,
  Sun,
  Wand2,
  HelpCircle,
  Bell,
  User, 
  Building2
} from "lucide-react";

import { Button } from "../ui/ui/button";
import { Input } from "../ui/ui/input";

export default function Header() {
  return (
    <header className="h-16 bg-gradient-to-r from-green-600 to-black flex items-center px-6">
      <div className="flex w-full items-center justify-between text-white">

        

        {/* LEFT SIDE (already built earlier) */}
        <div className="flex items-center gap-3">
          <Building2 className="w-7 h-7" />

          <div className="leading-tight">
            <p className="text-sm text-gray-300">Cisco Commerce</p>
            <p className="text-lg font-semibold">Home</p>
          </div>
        </div>


        {/* RIGHT SIDE */}
        <div className="flex items-center gap-4">

          {/* Create Button */}
          <Button className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="w-4 h-4 mr-1" />
            Create
          </Button>

          {/* Divider */}
          <div className="h-6 w-px bg-white/30" />

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search"
              className="pl-9 bg-gray-800 border-none text-white placeholder:text-gray-400 w-64"
            />
          </div>

          {/* Icons */}
          <Sun className="w-5 h-5 opacity-80 cursor-pointer hover:opacity-100" />
          <Wand2 className="w-5 h-5 opacity-80 cursor-pointer hover:opacity-100" />
          <HelpCircle className="w-5 h-5 opacity-80 cursor-pointer hover:opacity-100" />
          <Bell className="w-5 h-5 opacity-80 cursor-pointer hover:opacity-100" />

          {/* User */}
          <div className="flex items-center gap-2 cursor-pointer">
            <User className="w-5 h-5" />
            <div className="leading-tight">
              <p className="text-sm font-medium">David Elson</p>
              <p className="text-xs text-gray-400">Portfolio seller</p>
            </div>
          </div>

        </div>
      </div>
    </header>
  );
}
