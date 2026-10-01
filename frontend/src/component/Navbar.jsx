import { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "../context/ThemeContext"; 
import { useAuth } from "../context/AuthContext";

function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { isDark, toggleTheme } = useTheme(); 
  const { isAuthenticated, isAdmin, user, logout } = useAuth();

  // About click handler
  const handleAboutClick = (e) => {
    e.preventDefault();
    
    if (location.pathname === '/') {
      const aboutSection = document.getElementById('about');
      if (aboutSection) {
        aboutSection.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      navigate('/');
      setTimeout(() => {
        const aboutSection = document.getElementById('about');
        if (aboutSection) {
          aboutSection.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    }
    setIsOpen(false);
  };

  // Features click handler (Key Innovations ke liye)
  const handleFeaturesClick = (e) => {
    e.preventDefault();
    console.log("clicked");
    
    if (location.pathname === '/') {
      const featuresSection = document.getElementById('key-innovations');
      if (featuresSection) {
        featuresSection.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      navigate('/');
      setTimeout(() => {
        const featuresSection = document.getElementById('key-innovations');
        if (featuresSection) {
          featuresSection.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    }
    console.log("clicked");

    setIsOpen(false);
  };

  const navLinks = [
    { to: "/", label: "Home", onClick: null },
    { to: "/", label: "Features", onClick: handleFeaturesClick },
    { to: "/", label: "About", onClick: handleAboutClick },
    ...(isAuthenticated ? [{ to: "/complaint", label: "Submit Complaint", onClick: null }] : []),
    ...(isAuthenticated ? [{ to: "/track", label: "Track", onClick: null }] : []),
    ...(isAdmin ? [{ to: "/admin", label: "Admin Portal", onClick: null }] : []),
    ...(isAdmin ? [{ to: "/dashboard", label: "Analytics", onClick: null }] : []),
  ];

  return (
    <>
      <motion.nav
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7 }}
        className={`w-full h-14 flex justify-between items-center px-4 sm:px-6 sticky top-0 z-50 transition-colors duration-300 ${
          isDark 
            ? "bg-[#0F1729] border-b border-gray-600 text-white" 
            : "bg-white border-b border-gray-200 text-gray-900"
        }`}
      >
        {/* Logo */}
        <NavLink to="/" className="flex items-center font-bold text-base sm:text-lg cursor-pointer">
          <h1 className="bg-linear-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            Nivaran AI
          </h1>
        </NavLink>

        {/* Desktop Menu */}
        <div className="hidden md:flex gap-4 lg:gap-6 items-center text-xs sm:text-sm">
          {navLinks.map((link) => (
            link.onClick ? (
              <button
                key={link.label}
                onClick={link.onClick}
                className={`transition-colors duration-200 ${
                  isDark ? "text-gray-300 hover:text-cyan-400" : "text-gray-600 hover:text-cyan-600"
                }`}
              >
                {link.label}
              </button>
            ) : (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `transition-colors duration-200 ${
                    isActive 
                      ? `border-b-2 border-cyan-400 pb-1 ${isDark ? "text-cyan-400" : "text-cyan-600"}`
                      : isDark ? "text-gray-300 hover:text-cyan-400" : "text-gray-600 hover:text-cyan-600"
                  }`
                }
              >
                {link.label}
              </NavLink>
            )
          ))}

          {/* 🌙☀️ Theme Toggle Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleTheme}
            style={{
              transition: 'all 0.2s ease-in-out'
            }}
            className={`p-2 rounded-lg transition-all duration-200 ${
              isDark 
                ? "bg-gray-800 hover:bg-gray-700 text-yellow-400" 
                : "bg-gray-100 hover:bg-gray-200 text-gray-700"
            }`}
          >
            {isDark ? "☀️" : "🌙"}
          </motion.button>

          {isAuthenticated ? (
            <>
              <span className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>{user?.name}</span>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={logout}
                className="bg-linear-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200"
              >
                Logout
              </motion.button>
            </>
          ) : (
            <div className="flex gap-2 items-center">
              <NavLink to="/register">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-linear-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200"
                >
                  Register
                </motion.button>
              </NavLink>
              <NavLink to="/login">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-linear-to-r from-cyan-600 to-blue-700 hover:from-cyan-700 hover:to-blue-800 text-white px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200"
                >
                  Login
                </motion.button>
              </NavLink>
            </div>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="md:hidden flex flex-col gap-1.5 p-2 focus:outline-none z-50 relative"
        >
          <motion.span
            animate={isOpen ? { rotate: 45, y: 8 } : { rotate: 0, y: 0 }}
            className={`w-6 h-0.5 block transition-all duration-300 ${
              isDark ? "bg-white" : "bg-gray-900"
            }`}
          ></motion.span>
          <motion.span
            animate={isOpen ? { opacity: 0 } : { opacity: 1 }}
            className={`w-6 h-0.5 block transition-all duration-300 ${
              isDark ? "bg-white" : "bg-gray-900"
            }`}
          ></motion.span>
          <motion.span
            animate={isOpen ? { rotate: -45, y: -8 } : { rotate: 0, y: 0 }}
            className={`w-6 h-0.5 block transition-all duration-300 ${
              isDark ? "bg-white" : "bg-gray-900"
            }`}
          ></motion.span>
        </button>
      </motion.nav>

      {/* Mobile Menu Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.4 }}
            className={`fixed top-14 left-0 right-0 border-b z-40 md:hidden transition-colors duration-300 ${
              isDark ? "bg-[#0F1729] border-gray-600" : "bg-white border-gray-200"
            }`}
          >
            <div className="flex flex-col p-4 space-y-3">
              {navLinks.map((link) => (
                link.onClick ? (
                  <button
                    key={link.label}
                    onClick={link.onClick}
                    className={`block text-left py-2 px-3 rounded-lg transition-all duration-200 ${
                      isDark 
                        ? "text-gray-300 hover:bg-gray-800 hover:text-cyan-400" 
                        : "text-gray-600 hover:bg-gray-100 hover:text-cyan-600"
                    }`}
                  >
                    {link.label}
                  </button>
                ) : (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    onClick={() => setIsOpen(false)}
                    className={({ isActive }) =>
                      `block py-2 px-3 rounded-lg transition-all duration-200 ${
                        isActive
                          ? `border-l-4 border-cyan-400 ${isDark ? "bg-cyan-500/20 text-cyan-400" : "bg-cyan-50 text-cyan-600"}`
                          : isDark ? "text-gray-300 hover:bg-gray-800 hover:text-cyan-400" : "text-gray-600 hover:bg-gray-100 hover:text-cyan-600"
                      }`
                    }
                  >
                    {link.label}
                  </NavLink>
                )
              ))}
              
              {/* Theme Toggle in Mobile Menu */}
              <button
                onClick={toggleTheme}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg transition-all duration-200 ${
                  isDark 
                    ? "bg-gray-800 text-yellow-400 hover:bg-gray-700" 
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {isDark ? "☀️ Light Mode" : "🌙 Dark Mode"}
              </button>

              <div className="pt-2">
                {isAuthenticated ? (
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={logout}
                    className="w-full bg-linear-to-r from-red-500 to-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold"
                  >
                    Logout
                  </motion.button>
                ) : (
                  <div className="flex flex-col gap-2">
                    <NavLink to="/register" onClick={() => setIsOpen(false)} className="w-full">
                      <motion.button
                        whileTap={{ scale: 0.98 }}
                        className="w-full bg-linear-to-r from-green-600 to-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-semibold"
                      >
                        Register
                      </motion.button>
                    </NavLink>
                    <NavLink to="/login" onClick={() => setIsOpen(false)} className="w-full">
                      <motion.button
                        whileTap={{ scale: 0.98 }}
                        className="w-full bg-linear-to-r from-cyan-600 to-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold"
                      >
                        Login
                      </motion.button>
                    </NavLink>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default Navbar;
