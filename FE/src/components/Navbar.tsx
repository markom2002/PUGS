import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./Navbar.css";
const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem("token");
  if (location.pathname === "/arena") return null;
  return (
    <nav className="navbar">
      <Link className="pugs-brand" to="/">
        PUGS<span>✳</span>
      </Link>
      <div className="navbar-links">
        <Link to="/arena">Arena uživo</Link>
        <Link to="/quizzes">Kvizovi</Link>
        {token ? (
          <>
            <Link to="/my-results">Moji rezultati</Link>
            <button
              onClick={() => {
                localStorage.removeItem("token");
                navigate("/");
              }}
            >
              Odjavi se
            </button>
          </>
        ) : (
          <>
            <Link to="/login">Prijava</Link>
            <Link className="nav-cta" to="/arena">
              Okupi ekipu ↗
            </Link>
          </>
        )}
      </div>
    </nav>
  );
};
export default Navbar;
