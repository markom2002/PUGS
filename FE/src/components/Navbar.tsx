import React from "react";
import { Link, useLocation } from "react-router-dom";
import { InstallButton } from "./Pwa";
import "./Navbar.css";
export default function Navbar() {
  const location = useLocation();
  if (location.pathname === "/arena") return null;
  return (
    <nav className="navbar">
      <Link className="pugs-brand" to="/">
        <img src="/skocko.svg" alt="Skočko" width="48" height="54" />
      </Link>
      <div className="navbar-links">
        <a className="nav-how" href="/#kako-se-igra">
          Kako se igra
        </a>
        <InstallButton />
        <Link className="nav-cta" to="/arena">
          Okupi ekipu ↗
        </Link>
      </div>
    </nav>
  );
}
