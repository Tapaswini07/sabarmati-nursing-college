import { useState } from "react";
import heroImage from "../assets/hero.png";
import "./ResponsiveShowcase.css";

const navItems = [
  { label: "Home", href: "#home" },
  { label: "Features", href: "#features" },
  { label: "Services", href: "#services" },
  { label: "Testimonials", href: "#testimonials" },
  { label: "Contact", href: "#contact" },
];

const featureCards = [
  {
    title: "Mobile-First Design",
    description:
      "Built for smaller screens first, then enhanced for tablets, laptops, and large desktops.",
  },
  {
    title: "Flexible Layout System",
    description:
      "Uses CSS Grid and Flexbox so sections adapt smoothly across a wide range of viewport sizes.",
  },
  {
    title: "Readable UI",
    description:
      "Balanced spacing, scalable type, and clear visual hierarchy keep the interface comfortable to use.",
  },
];

const serviceCards = [
  {
    title: "Responsive Websites",
    text: "Landing pages and business websites that feel polished on every device.",
  },
  {
    title: "Dashboard Interfaces",
    text: "Clean admin experiences with cards, tables, and navigation that scale properly.",
  },
  {
    title: "UI Modernization",
    text: "Refresh older layouts with better structure, motion, spacing, and mobile usability.",
  },
  {
    title: "Performance Friendly",
    text: "Lightweight components and scalable media help pages stay fast and fluid.",
  },
];

const stats = [
  { value: "100%", label: "Fluid layouts" },
  { value: "4", label: "Breakpoint ranges" },
  { value: "24/7", label: "Readable experience" },
];

const testimonials = [
  {
    name: "Anita Rao",
    role: "Product Lead",
    quote:
      "The layout feels consistent from phone to desktop, and the navigation is much easier for our users.",
  },
  {
    name: "Vikram Shah",
    role: "Startup Founder",
    quote:
      "We needed something modern and responsive quickly. This structure gave us a solid production-ready base.",
  },
];

export default function ResponsiveShowcase() {
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="showcase-page">
      <header className="site-header" id="home">
        <div className="showcase-container nav-shell">
          <a className="brand" href="#home" onClick={closeMenu}>
            <span className="brand-mark">S</span>
            <span className="brand-text">Seamless UI</span>
          </a>

          <button
            type="button"
            className={`menu-toggle ${menuOpen ? "is-open" : ""}`}
            aria-label="Toggle navigation menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            <span />
            <span />
            <span />
          </button>

          <nav className={`site-nav ${menuOpen ? "open" : ""}`}>
            {navItems.map((item) => (
              <a key={item.label} href={item.href} onClick={closeMenu}>
                {item.label}
              </a>
            ))}
            <a className="nav-cta" href="#contact" onClick={closeMenu}>
              Get Started
            </a>
          </nav>
        </div>
      </header>

      <main>
        <section className="hero-section">
          <div className="showcase-container hero-grid">
            <div className="hero-copy">
              <p className="eyebrow">Modern responsive website</p>
              <h1>
                A clean layout that looks sharp on mobile, tablet, laptop, and
                desktop.
              </h1>
              <p className="hero-text">
                This demo uses mobile-first CSS, fluid media, responsive
                breakpoints, and a collapsible navigation menu to create a
                layout that scales naturally across devices.
              </p>
              <div className="hero-actions">
                <a className="primary-btn" href="#features">
                  Explore Features
                </a>
                <a className="secondary-btn" href="#services">
                  View Sections
                </a>
              </div>

              <div className="stats-grid">
                {stats.map((item) => (
                  <div className="stat-card" key={item.label}>
                    <strong>{item.value}</strong>
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="hero-media">
              <div className="hero-image-frame">
                <img
                  src={heroImage}
                  alt="Responsive website preview"
                  className="hero-image"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="feature-section" id="features">
          <div className="showcase-container">
            <div className="section-heading">
              <p className="eyebrow">Why it works</p>
              <h2>Responsive structure with modern styling</h2>
              <p>
                Every section is designed to stretch, stack, and rebalance
                gracefully as screen size changes.
              </p>
            </div>

            <div className="feature-grid">
              {featureCards.map((card) => (
                <article className="feature-card" key={card.title}>
                  <div className="card-icon" />
                  <h3>{card.title}</h3>
                  <p>{card.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="service-section" id="services">
          <div className="showcase-container service-layout">
            <div className="service-copy">
              <p className="eyebrow">Built to scale</p>
              <h2>Flexible sections for real-world websites</h2>
              <p>
                Use this structure for portfolios, business sites, product
                pages, landing pages, or internal dashboards.
              </p>
            </div>

            <div className="service-grid">
              {serviceCards.map((card) => (
                <article className="service-card" key={card.title}>
                  <h3>{card.title}</h3>
                  <p>{card.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="testimonial-section" id="testimonials">
          <div className="showcase-container">
            <div className="section-heading">
              <p className="eyebrow">Feedback</p>
              <h2>Designed for clarity across screen sizes</h2>
            </div>

            <div className="testimonial-grid">
              {testimonials.map((item) => (
                <article className="testimonial-card" key={item.name}>
                  <p className="testimonial-quote">"{item.quote}"</p>
                  <div className="testimonial-author">
                    <strong>{item.name}</strong>
                    <span>{item.role}</span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer" id="contact">
        <div className="showcase-container footer-layout">
          <div>
            <h3>Seamless UI</h3>
            <p>
              A complete responsive React layout with hero, cards, fluid media,
              and a mobile navigation menu.
            </p>
          </div>

          <div className="footer-links">
            <a href="#home">Home</a>
            <a href="#features">Features</a>
            <a href="#services">Services</a>
            <a href="#testimonials">Testimonials</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
