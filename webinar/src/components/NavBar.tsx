import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  AiOutlineClose,
  AiOutlineMenu,
  AiOutlineShoppingCart,
} from "react-icons/ai";
import CompanyLogo from "../assets/images/cequena_training.png";
import { useCart } from "../store/CartContext";
import { useAuth } from "../store/AuthContext";
const NavBar = () => {
  const links = [
    { label: "Home", href: "/" },
    { label: "Webinars", href: "/webinars" },
    { label: "Products", href: "/products" },
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
  ];
  const [nav, setNav] = useState(true);
  const [isDark, setDark] = useState(() => {
    if (typeof window === "undefined") return false; // SSR/defensive
    return localStorage.getItem("theme") === "dark";
  });
  const { items, openCart } = useCart();
  const { user, logout } = useAuth();
  const cartCount = items.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    const next = isDark ? "dark" : "light";
    document.documentElement.classList.toggle("dark", isDark);
    localStorage.setItem("theme", next);
  }, [isDark]);

  // const [isDark, setDark] = useState(false);

  // useEffect(() => {
  //   document.documentElement.classList.toggle("dark", isDark);
  // }, [isDark]);

  const toggleTheme = () => {
    setDark(!isDark);
  };

  const handleNav = () => {
    setNav(!nav);
  };

  return (
    <>
      <nav className="fixed top-0 left-0 z-420 w-full  bg-white dark:bg-black border-b border-[rgba(255,255,255,0.15)]">
        <div className="flex justify-between items-center h-24 max-w-[1240px] mx-auto px-4 text-white ">
          <h1 className="text-3xl font-bold text-lantern">
            <span className="hidden">Cequena Training and Consultancy</span>{" "}
            <Link className="block" to="/">
              <img
                className="w-20 rounded-full"
                src={CompanyLogo}
                alt="Cequeña Training and Consultancy"
              />
            </Link>
          </h1>
          <ul className="hidden md:flex items-center text-gray-700 dark:text-white">
            {links.map(({ label, href }) => (
              <li
                key={label}
                className="
        group relative flex items-center px-4 py-4 cursor-pointer text-slate-900 dark:text-slate-100
        
      "
              >
                <Link
                  className="relative inline-block
      after:absolute after:left-0 after:-bottom-1 after:h-0.5 after:w-full after:bg-current
      after:scale-x-0 after:origin-right after:transition-transform after:duration-300 after:ease-out
      group-hover:after:scale-x-100 group-hover:after:origin-left"
                  to={href}
                >
                  {label}
                </Link>
              </li>
            ))}
            <li className="flex items-center p-4 text-slate-900 dark:text-slate-100">
              <label className="inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={isDark}
                  onChange={toggleTheme}
                />
                <div className="relative w-11 h-6 bg-gray-200 rounded-full peer dark:bg-gray-900 peer-checked:bg-lantern dark:peer-checked:bg-lantern after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:w-5 after:h-5 after:bg-white after:rounded-full after:border after:border-gray-300 after:transition-all peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full" />
                <span className="ms-3 text-slate-900 dark:text-slate-100">
                  {isDark ? "Dark mode" : "Light mode"}
                </span>
              </label>
            </li>
            <li className="flex items-center p-4 text-slate-900 dark:text-slate-100">
              {user ? (
                <button
                  type="button"
                  onClick={logout}
                  className="text-sm font-semibold uppercase tracking-[0.08em] hover:opacity-80"
                >
                  Logout
                </button>
              ) : (
                <Link
                  to="/login?next=/checkout"
                  className="text-sm font-semibold uppercase tracking-[0.08em] hover:opacity-80"
                >
                  Login
                </Link>
              )}
            </li>
            <li className="flex items-center p-4 text-slate-900 dark:text-slate-100">
              <button
                type="button"
                onClick={openCart}
                className="relative cursor-pointer inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-900 transition hover:bg-black/5 dark:text-white dark:hover:bg-white/10"
                aria-label="Open cart"
              >
                <AiOutlineShoppingCart size={20} />
                {cartCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#e3b323] px-1 text-xs font-semibold text-black">
                    {cartCount}
                  </span>
                )}
              </button>
            </li>
          </ul>
          <div className="flex items-center gap-3 md:hidden">
            <button
              type="button"
              onClick={openCart}
              className="relative inline-flex h-10 w-10  cursor-pointer rounded-full text-slate-900 transition hover:bg-black/5 dark:text-white dark:hover:bg-white/10"
              aria-label="Open cart"
            >
              <AiOutlineShoppingCart size={20} />
              {cartCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#e3b323] px-1 text-xs font-semibold text-black">
                  {cartCount}
                </span>
              )}
            </button>
            <button
              type="button"
              className="cursor-pointer"
              onClick={handleNav}
              aria-label={nav ? "Open menu" : "Close menu"}
            >
              {nav ? (
                <AiOutlineMenu size={22} color={isDark ? "#fff" : "#0f172a"} />
              ) : (
                <AiOutlineClose size={22} color={isDark ? "#fff" : "#0f172a"} />
              )}
            </button>
          </div>
          {/*  */}
          <div
            className={
              !nav
                ? "fixed z-99 left-0 top-0 w-[60%] h-full border-r border-r-gray-900 bg-[#000300] ease-in-out duration-500 md:hidden"
                : "fixed left-[-100%] md:hidden"
            }
          >
            <h1 className="w-full text-3xl font-bold text-lantern m-4">
              REACT.
            </h1>
            <ul className="uppercase p-4">
              {links.map(({ label, href }) => (
                <li
                  key={label}
                  className="group relative px-4 py-2 border-b border-gray-600 last:border-b-0"
                >
                  <Link
                    to={href}
                    className="relative inline-block
                  after:absolute after:left-0 after:bottom-0 after:h-[2px] after:w-full after:bg-current
                  after:scale-x-0 after:origin-right after:transition-transform after:duration-300 after:ease-out
                  group-hover:after:scale-x-100 group-hover:after:origin-left"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </nav>
    </>
  );
};

export default NavBar;
