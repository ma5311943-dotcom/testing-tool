// ===== Imports =====
import { useState, useEffect, useRef, useLayoutEffect } from "react";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  UserButton,
  useUser,
} from "@clerk/clerk-react";
import { useNavigate, useLocation } from "react-router-dom";
import UrlInput from "./components/UrlInput";
import Dashboard from "./components/Dashboard";
import AdminDashboard from "./special-functionilities/AdminDashboard";
import UserDashboard from "./special-functionilities/UserDashboard";
import LandingPage from "./components/LandingPage";
import TestSenerio from "./special-functionilities/TestSenerio";
import ManualTesting from "./special-functionilities/ManualTesting";
import ChatPage from "./special-functionilities/ChatPage";
import {
  Menu,
  X,
  Zap,
  Shield,
  Target,
  Activity,
  Layout,
  Database,
  MessageSquare,
  Home,
} from "lucide-react";


import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import "./App.css";

gsap.registerPlugin(ScrollTrigger);

// ===== App Component =====
export default function App() {
  const { user: clerkUser } = useUser();
  const navigate = useNavigate();
  const location = useLocation();

  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [role, setRole] = useState(null);
  const [showDashboardOnly, setShowDashboardOnly] = useState(false);
  const [roleLoading, setRoleLoading] = useState(true);
  const [normalTokens, setNormalTokens] = useState(null);
  const [specialTokens, setSpecialTokens] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const urlSectionRef = useRef(null);
  const menuRef = useRef(null);
  const auditCardRef = useRef(null);

  const isTestSenerioPage = location.pathname === "/test-senerio";
  const isManualTestPage = location.pathname === "/manual-testing";
  const isChatPage = location.pathname === "/chat";
  const isDashboardPage = location.pathname === "/dashboard";
  const isHomePage = location.pathname === "/";



  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (location.pathname === "/dashboard") {
      setShowDashboardOnly(true);
    } else {
      setShowDashboardOnly(false);
    }
  }, [location.pathname]);

  // GSAP for Mobile Menu
  useEffect(() => {
    if (menuOpen && menuRef.current) {
      gsap.fromTo(menuRef.current, { y: -20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, ease: "power2.out" });
    }
  }, [menuOpen]);

  // GSAP for Audit Card
  useLayoutEffect(() => {
    // Small delay to ensure DOM is ready if switched views
    let ctx = gsap.context(() => {
      if (auditCardRef.current) {
        gsap.fromTo(auditCardRef.current,
          { opacity: 0, y: 40 },
          {
            opacity: 1,
            y: 0,
            duration: 0.8,
            ease: "power2.out",
            scrollTrigger: {
              trigger: auditCardRef.current,
              start: "top 85%",
              toggleActions: "play none none none"
            }
          }
        );
      }
    });
    return () => ctx.revert();
  }, [showDashboardOnly, results, isManualTestPage, isTestSenerioPage, isChatPage]); // Re-run when view changes



  useEffect(() => {
    const saveAndFetchUser = async () => {
      if (!clerkUser) return setRoleLoading(false);
      setRoleLoading(true);

      try {
        const email =
          clerkUser.primaryEmailAddress?.emailAddress ||
          clerkUser.emailAddresses[0]?.emailAddress;

        await fetch(`${import.meta.env.VITE_API_BASE_URL}/user/save`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clerkId: clerkUser.id, email }),
        });

        const roleResponse = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/user/${clerkUser.id}`
        );
        const roleData = await roleResponse.json();
        setRole(roleData.role?.toLowerCase() || "user");
        setNormalTokens(
          roleData.normalTokens !== undefined ? roleData.normalTokens : 3
        );
        setSpecialTokens(
          roleData.specialTokens !== undefined ? roleData.specialTokens : 3
        );
      } catch (err) {
        console.error(err);
      } finally {
        setRoleLoading(false);
      }
    };

    saveAndFetchUser();
  }, [clerkUser]);

  const fetchUserTokens = async () => {
    if (!clerkUser) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/user/${clerkUser.id}`);
      const data = await res.json();
      if (data.normalTokens !== undefined) setNormalTokens(data.normalTokens);
      if (data.specialTokens !== undefined)
        setSpecialTokens(data.specialTokens);
    } catch (e) {
      console.error("Failed to refresh tokens");
    }
  };

  const handleTestRun = async (url) => {
    if (role !== "admin" && (normalTokens === null || normalTokens <= 0)) {
      setError("Insufficient tokens. Please upgrade your plan to continue searching.");
      setTimeout(() => {
        document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" });
      }, 500);
      return;
    }

    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const email =
        clerkUser?.primaryEmailAddress?.emailAddress ||
        clerkUser?.emailAddresses?.[0]?.emailAddress;

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || "Test failed");
      }

      setResults(data);

      if (clerkUser) {
        fetchUserTokens();
        await fetch(`${import.meta.env.VITE_API_BASE_URL}/history`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userEmail: email, url, result: data }),
        });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStartTesting = () => {
    urlSectionRef.current?.scrollIntoView({ behavior: "smooth" });
    setMenuOpen(false);
  };

  return (
    <div className="app-container">
      <nav className={`navbar ${scrolled ? "scrolled" : ""}`}>
        <div className="logo" onClick={() => navigate("/")}>
          <span>Bdd</span> Testify Scenarios
        </div>

        <div className="nav-links">
          <button
            className={`nav-link ${isHomePage ? "active" : ""}`}
            onClick={() => navigate("/")}
          >
            Home
          </button>
          <SignedIn>
            <button
              className={`nav-link ${isDashboardPage ? "active" : ""}`}
              onClick={() => navigate("/dashboard")}
            >
              Dashboard
            </button>
            <button
              className={`nav-link ${isTestSenerioPage ? "active" : ""}`}
              onClick={() => navigate("/test-senerio")}
            >
              Custom Testing
            </button>
            <button
              className={`nav-link ${isManualTestPage ? "active" : ""}`}
              onClick={() => navigate("/manual-testing")}
            >
              Manual Testing
            </button>
            <button
              className={`nav-link chat-nav-link ${isChatPage ? "active" : ""}`}
              onClick={() => navigate("/chat")}
            >
              <MessageSquare size={18} />
              <span>Chat</span>
            </button>
            <button
              className="nav-link"
              onClick={() => {
                if (!isHomePage) {
                  navigate("/");
                  setTimeout(() => {
                    document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" });
                  }, 100);
                } else {
                  document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" });
                }
              }}
            >
              Pricing
            </button>
          </SignedIn>
          <SignedOut>
            <button
              className="nav-link"
              onClick={() => {
                document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              Pricing
            </button>
          </SignedOut>
        </div>

        <div className="nav-actions">
          <SignedOut>
            <SignInButton mode="modal">
              <button className="btn-primary">Sign In</button>
            </SignInButton>
          </SignedOut>

          <SignedIn>
            <div className="desktop-only">
              <UserButton afterSignOutUrl="/" />
            </div>
          </SignedIn>


          <button
            className="hamburger"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X /> : <Menu />}
          </button>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div
            ref={menuRef}
            className="mobile-menu"
          >
            <SignedIn>
              <div className="mobile-user-profile">
                <UserButton afterSignOutUrl="/" />
                <div className="user-details">
                  <span className="user-name">{clerkUser?.firstName || 'User'}</span>
                  <span className="user-email">{clerkUser?.primaryEmailAddress?.emailAddress}</span>
                </div>
              </div>
              <div className="menu-divider" />
            </SignedIn>

            <button
              onClick={() => {
                if (!isHomePage) {
                  navigate("/");
                  setTimeout(() => {
                    document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" });
                  }, 100);
                } else {
                  document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" });
                }
                setMenuOpen(false);
              }}
            >
              <Zap size={18} />
              Pricing
            </button>
            <button
              className={isHomePage ? "active" : ""}
              onClick={() => {
                navigate("/");
                setMenuOpen(false);
              }}
            >
              <Home size={18} />
              Home
            </button>
            <SignedIn>
              <button
                className={isDashboardPage ? "active" : ""}
                onClick={() => {
                  navigate("/dashboard");
                  setMenuOpen(false);
                }}
              >
                <Layout size={18} />
                Dashboard
              </button>
              <button
                className={isTestSenerioPage ? "active" : ""}
                onClick={() => {
                  navigate("/test-senerio");
                  setMenuOpen(false);
                }}
              >
                <Database size={18} />
                Studio
              </button>
              <button
                className={isManualTestPage ? "active" : ""}
                onClick={() => {
                  navigate("/manual-testing");
                  setMenuOpen(false);
                }}
              >
                <Activity size={18} />
                Manual
              </button>
              <button
                className={isChatPage ? "active" : ""}
                onClick={() => {
                  navigate("/chat");
                  setMenuOpen(false);
                }}
              >
                <MessageSquare size={18} />
                Chat
              </button>
            </SignedIn>



            <SignedOut>
              <SignInButton mode="modal">
                <button
                  onClick={() => setMenuOpen(false)}
                  style={{ width: "100%", background: "var(--grad-primary)", color: "#fff" }}
                >
                  Sign In to Access All Features
                </button>
              </SignInButton>
            </SignedOut>
          </div>
        )}
      </nav>

      <main className="main-section">
        {isManualTestPage ? (
          <ManualTesting role={role} normalTokens={normalTokens} specialTokens={specialTokens} />
        ) : isTestSenerioPage ? (
          <TestSenerio role={role} normalTokens={normalTokens} specialTokens={specialTokens} />
        ) : isChatPage ? (
          <ChatPage role={role} />
        ) : (

          <div className="container">
            <SignedIn>
              {showDashboardOnly ? (
                roleLoading ? (
                  <div className="loading-state">
                    <div className="loader-orbit">
                      <div className="loader-inner"></div>
                    </div>
                    <p>Syncing Data...</p>
                  </div>
                ) : role === "admin" ? (
                  <AdminDashboard />
                ) : (
                  <UserDashboard />
                )
              ) : results ? (
                <Dashboard data={results} />
              ) : (
                <>
                  <LandingPage onStart={handleStartTesting} />

                  <div
                    ref={auditCardRef}
                    className="audit-hub-card glass"
                    style={{
                      padding: "2.5rem",
                      borderRadius: "24px",
                      textAlign: "center",
                      marginTop: "4rem",
                      position: "relative",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      className="status-chip"
                      style={{ margin: "0 auto 1.5rem", fontSize: "0.65rem" }}
                    >
                      <div className="status-dot"></div> READY FOR ANALYSIS
                    </div>

                    <h2
                      className="hero-title"
                      style={{ fontSize: "2.2rem", marginBottom: "1rem" }}
                    >
                      Analyze Any <span className="gradient-text">Website</span>
                    </h2>

                    <div
                      className="token-display"
                      style={{
                        display: "flex",
                        gap: "1.5rem",
                        justifyContent: "center",
                        marginBottom: "2.5rem",
                      }}
                    >
                      <div
                        className="glass-panel"
                        style={{
                          padding: "0.75rem 1.5rem",
                          borderRadius: "12px",
                        }}
                      >
                        <p
                          style={{
                            fontSize: "0.7rem",
                            color: "var(--text-muted)",
                            marginBottom: "0.25rem",
                          }}
                        >
                          SCAN TOKENS
                        </p>
                        <h3
                          style={{
                            fontSize: "1.25rem",
                            color: "var(--primary)",
                          }}
                        >
                          {role === "admin" ? "∞" : normalTokens}
                        </h3>
                      </div>
                      <div
                        className="glass-panel"
                        style={{
                          padding: "0.75rem 1.5rem",
                          borderRadius: "12px",
                        }}
                      >
                        <p
                          style={{
                            fontSize: "0.7rem",
                            color: "var(--text-muted)",
                            marginBottom: "0.25rem",
                          }}
                        >
                          PROTOCOL TOKENS
                        </p>
                        <h3
                          style={{
                            fontSize: "1.25rem",
                            color: "var(--accent)",
                          }}
                        >
                          {role === "admin" ? "∞" : specialTokens}
                        </h3>
                      </div>
                    </div>

                    <p
                      style={{
                        maxWidth: "550px",
                        margin: "0 auto 2.5rem",
                        color: "var(--text-dim)",
                        fontSize: "0.95rem",
                      }}
                    >
                      Enter a URL below to perform a comprehensive audit across
                      security, performance, and accessibility vectors.
                    </p>

                    <div
                      ref={urlSectionRef}
                      className="input-container"
                      style={{ maxWidth: "650px", margin: "0 auto" }}
                    >
                      <UrlInput onRunTest={handleTestRun} isLoading={loading} />
                    </div>

                    {error && (
                      <div
                        className="error-msg"
                        style={{
                          marginTop: "1.5rem",
                          color: "var(--error)",
                          fontSize: "0.85rem",
                        }}
                      >
                        {error}
                      </div>
                    )}

                    {loading && (
                      <div
                        className="loading-state"
                        style={{ marginTop: "2.5rem" }}
                      >
                        <div
                          className="loader-orbit"
                          style={{ width: "40px", height: "40px" }}
                        >
                          <div className="loader-inner"></div>
                        </div>
                        <p
                          className="gradient-text"
                          style={{
                            fontWeight: 700,
                            marginTop: "0.75rem",
                            fontSize: "0.5rem",
                          }}
                        >
                          Deploying Engine...
                        </p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </SignedIn>

            <SignedOut>
              <LandingPage onStart={handleStartTesting} />
            </SignedOut>
          </div>
        )}
      </main>

      <footer className="footer">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-info">
              <h4 className="logo">
                <span>Bdd</span> Testify Scenarios
              </h4>
              <p>
                The standard in AI-driven web analysis. Providing deep insights
                into performance, security, and behavioral compliance.
              </p>
              <div className="social-links">
                {/* Social icons would go here */}
              </div>
            </div>

            <div className="footer-col">
              <h5>Platform</h5>
              <ul>
                <li>
                  <button className="nav-link" onClick={() => navigate("/")}>
                    Home
                  </button>
                </li>
                <li>
                  <button
                    className="nav-link"
                    onClick={() => {
                      if (!isHomePage) {
                        navigate("/");
                        setTimeout(() => {
                          document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" });
                        }, 100);
                      } else {
                        document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" });
                      }
                    }}
                  >
                    Pricing
                  </button>
                </li>
                <li>
                  <button
                    className="nav-link"
                    onClick={() => navigate("/dashboard")}
                  >
                    Dashboard
                  </button>
                </li>
                <li>
                  <button
                    className="nav-link"
                    onClick={() => navigate("/test-senerio")}
                  >
                    Studio
                  </button>
                </li>
                <li>
                  <button
                    className="nav-link"
                    onClick={() => navigate("/manual-testing")}
                  >
                    Manual
                  </button>
                </li>
              </ul>
            </div>

            <div className="footer-col">
              <h5>Resources</h5>
              <ul>
                <li>
                  <a href="#">Documentation</a>
                </li>
                <li>
                  <a href="#">API Reference</a>
                </li>
                <li>
                  <a href="#">Support</a>
                </li>
              </ul>
            </div>

            <div className="footer-col">
              <h5>Contact</h5>
              <p style={{ fontSize: "0.9rem", color: "var(--text-dim)" }}>
                Questions? Reach out to our team.
              </p>
              <p style={{ fontWeight: 600, marginTop: "0.5rem" }}>
                support@webtester.ai
              </p>
            </div>
          </div>

          <div className="footer-bottom">
            <p>© 2026 Bdd Testify Scenarios. All rights reserved.</p>
            <div style={{ display: "flex", gap: "2rem" }}>
              <a style={{ textDecoration: "none", color: "var(--text-dim)" }} href="#">Privacy Policy</a>
              <a style={{ textDecoration: "none", color: "var(--text-dim)" }} href="#">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
