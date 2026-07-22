import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="border-t   border-lantern/50 mt-32">
      <div className="footer-content py-10 px-4 flex justify-between items-center gap-4 max-w-full min-[1100px]:max-w-[1100px] mx-auto">
        <p className="footer-text">&copy; Train With Cequeña</p>
        <Link
          className="transition-all duration-300 ease-in-out hover:text-lantern"
          to="/privacy-policy"
        >
          Privacy Policy
        </Link>
      </div>
    </footer>
  );
};

export default Footer;
