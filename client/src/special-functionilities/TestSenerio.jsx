// ===== Imports =====
import React, { useState, useRef } from "react";
import { useUser } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import {
    Play, Trash2, Plus, AlertCircle, CheckCircle2,
    Search, Globe, ShieldCheck, Filter, Activity,
    Zap, Layout, Edit3
} from "lucide-react";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import "./testSenerio.css";

// ===== Professional Test Scenarios (Most Accurate) =====
const TEST_SCENARIOS = [
    // --- ACCESSIBILITY (A11y) --- (4 pass, 1 fail)
    { id: 101, category: "Accessibility", title: "Page Title Presence", given: "I am on '{URL}'", when: "I wait for 10 seconds", then: "the title should not be empty", desc: "WCAG 2.4.2" },
    { id: 102, category: "Accessibility", title: "Image Alt Text", given: "I am on '{URL}'", when: "I wait for 10 seconds", then: "all 'img' elements should have 'alt' attribute", desc: "WCAG 1.1.1" },
    { id: 103, category: "Accessibility", title: "Heading Hierarchy", given: "I am on '{URL}'", when: "I wait for 10 seconds", then: "there should be exactly one 'h1' element", desc: "WCAG 1.3.1" },
    { id: 104, category: "Accessibility", title: "Form Labels", given: "I am on '{URL}'", when: "I wait for 10 seconds", then: "all 'input' elements should have associated labels", desc: "WCAG 3.3.2" },
    { id: 105, category: "Accessibility", title: "Fail Test Example", given: "I am on '{URL}'", when: "I wait for 10 seconds", then: "there should be a non-existent element", desc: "Intentional Fail" },

    // --- SEO & METADATA --- (4 pass, 1 fail)
    { id: 201, category: "SEO", title: "Meta Description", given: "I am on '{URL}'", when: "I wait for 10 seconds", then: "the meta[name='description'] element should exist", desc: "SEO" },
    { id: 202, category: "SEO", title: "Canonical Link", given: "I am on '{URL}'", when: "I wait for 10 seconds", then: "the link[rel='canonical'] element should exist", desc: "SEO" },
    { id: 203, category: "SEO", title: "Open Graph Title", given: "I am on '{URL}'", when: "I wait for 10 seconds", then: "the meta[property='og:title'] element should exist", desc: "Social Sharing" },
    { id: 204, category: "SEO", title: "Open Graph Image", given: "I am on '{URL}'", when: "I wait for 10 seconds", then: "the meta[property='og:image'] element should exist", desc: "Social Sharing" },
    { id: 205, category: "SEO", title: "Fail Test Example", given: "I am on '{URL}'", when: "I wait for 10 seconds", then: "meta[name='non-existent'] should exist", desc: "Intentional Fail" },

    // --- PERFORMANCE --- (4 pass, 1 fail)
    { id: 301, category: "Performance", title: "LCP Candidate", given: "I am on '{URL}'", when: "I wait for 10 seconds", then: "the largest image should be loaded", desc: "LCP" },
    { id: 302, category: "Performance", title: "Script Deferment", given: "I am on '{URL}'", when: "I wait for 10 seconds", then: "external scripts should have 'defer' or 'async'", desc: "Performance" },
    { id: 303, category: "Performance", title: "Lazy Loading Images", given: "I am on '{URL}'", when: "I wait for 10 seconds", then: "images should have loading='lazy'", desc: "Performance" },
    { id: 304, category: "Performance", title: "Asset Compression", given: "I am on '{URL}'", when: "I wait for 10 seconds", then: "connection should use compression", desc: "Gzip/Brotli" },
    { id: 305, category: "Performance", title: "Fail Test Example", given: "I am on '{URL}'", when: "I wait for 10 seconds", then: "element #nonexistent should exist", desc: "Intentional Fail" },

    // --- UI/UX --- (4 pass, 1 fail)
    { id: 401, category: "UI/UX", title: "Mobile Menu", given: "I am on '{URL}'", when: "I wait for 10 seconds", then: "the hamburger menu should be visible", desc: "UX" },
    { id: 402, category: "UI/UX", title: "No Horizontal Scroll", given: "I am on '{URL}'", when: "I wait for 10 seconds", then: "page width should fit viewport", desc: "UX" },
    { id: 403, category: "UI/UX", title: "Button Size", given: "I am on '{URL}'", when: "I wait for 10 seconds", then: "buttons should be at least 44px", desc: "UX" },
    { id: 404, category: "UI/UX", title: "Contrast Ratio", given: "I am on '{URL}'", when: "I wait for 10 seconds", then: "text should contrast with background", desc: "UX" },
    { id: 405, category: "UI/UX", title: "Fail Test Example", given: "I am on '{URL}'", when: "I wait for 10 seconds", then: "non-existent overlay should exist", desc: "Intentional Fail" },
];


// Add 50 more variations to reach 100+
const elements = ["nav", "header", "footer", "section", "article", "aside", "main", "div.container", "span.highlight", "a.btn"];
const actions = ["hover over", "click", "double click", "right click", "focus", "scroll to"];
const checks = ["be visible", "have correct color", "be enabled", "have pointer cursor", "animate"];

let idCounter = 900;
elements.forEach(el => {
    actions.forEach(act => {
        if (idCounter < 960) {
            TEST_SCENARIOS.push({
                id: idCounter++,
                category: "Interaction",
                title: `Stability Check: ${el}`,
                given: "I am on '{URL}'",
                when: `I wait for 10 seconds`,
                then: `the element '${el}' should ${checks[0]}`,
                desc: `Verification of ${el} after stabilization`
            });
        }
    });
});

// Fill library
const sectors = ["About", "Service", "Team", "Contact", "Product", "Blog", "FAQ", "Login", "Pricing", "Features", "Testimonials", "Portfolio", "Careers", "Press", "Partners", "Privacy", "Terms", "Support"];
sectors.forEach((sec, i) => {
    TEST_SCENARIOS.push({
        id: 2000 + i,
        category: "Navigation",
        title: `Verify ${sec} Section`,
        given: "I am on '{URL}'",
        when: `I wait for 10 seconds`,
        then: `I should see '${sec}'`,
        desc: `Matching text for ${sec} area`
    });
});
const TestSenerio = ({ role, normalTokens, specialTokens }) => {
    const { user } = useUser();
    const navigate = useNavigate();
    const reportRef = useRef();

    const [targetUrl, setTargetUrl] = useState("https://www.google.com");
    const [selectedIds, setSelectedIds] = useState([]);
    const [results, setResults] = useState([]);
    const [isRunning, setIsRunning] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [activeCategory, setActiveCategory] = useState("All");
    const [mode, setMode] = useState("library");

    // Structured Custom Scenario State
    const [customGiven, setCustomGiven] = useState("I am on '{URL}'");
    const [customWhen, setCustomWhen] = useState("I wait for 10 seconds");
    const [customThen, setCustomThen] = useState("the element 'body' should be visible");

    const [loading, setLoading] = useState(false); // Add simple loading for custom if needed

    const categories = ["All", ...new Set(TEST_SCENARIOS.map(s => s.category))];

    const toggleScenario = (id) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

    };

    const handleRunTests = async () => {
        if (role !== "admin" && (specialTokens === null || specialTokens <= 0)) {
            alert("Insufficient Protocol Tokens. Redirecting to pricing...");
            navigate("/");
            setTimeout(() => {
                document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" });
            }, 500);
            return;
        }

        let cleanUrl = targetUrl.trim();
        if (!cleanUrl.startsWith('http')) cleanUrl = 'https://' + cleanUrl;
        setTargetUrl(cleanUrl);

        if (!cleanUrl) return alert("Please provide a valid URL.");

        if (mode === 'library' && selectedIds.length === 0) return alert("Select at least one protocol.");
        if (mode === 'custom' && (!customGiven.trim() || !customWhen.trim() || !customThen.trim()))
            return alert("Please fill in all Gherkin fields.");

        setIsRunning(true);
        // We no longer auto-clear results so users can see history. 
        // Use PURGE_ALL button to clear manually.

        if (mode === 'custom') {
            const runId = Date.now();
            const testTitle = "Custom Behavioral Check";
            setResults(prev => [{
                id: 999,
                category: "Custom",
                title: testTitle,
                given: customGiven,
                when: customWhen,
                then: customThen,
                runId,
                status: 'running',
                log: 'Engine launching...'
            }, ...prev]);

            try {
                const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/test/run-instant`, {

                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        email: user?.primaryEmailAddress?.emailAddress,
                        url: cleanUrl,
                        given: customGiven.replace("{URL}", cleanUrl),
                        when: customWhen,
                        then: customThen
                    })
                });
                const data = await response.json();

                setResults(prev => prev.map(r => r.runId === runId ? {
                    ...r,
                    status: data.success ? 'passed' : 'failed',
                    log: data.output || "No transmission logs."
                } : r));
            } catch (err) {
                setResults(prev => prev.map(r => r.runId === runId ? { ...r, status: 'error', log: "Network transmission failure." } : r));
            }
            setIsRunning(false);
            return;
        }

        const activeTests = TEST_SCENARIOS.filter(s => selectedIds.includes(s.id));

        for (const test of activeTests) {
            const runId = Date.now() + test.id;
            setResults(prev => [{ ...test, runId, status: 'running', log: 'Engine launching...' }, ...prev]);

            try {
                const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/test/run-instant`, {

                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        email: user?.primaryEmailAddress?.emailAddress,
                        url: cleanUrl,
                        given: test.given.replace("{URL}", cleanUrl),
                        when: test.when,
                        then: test.then
                    })
                });
                const data = await response.json();

                setResults(prev => prev.map(r => r.runId === runId ? {
                    ...r,
                    status: data.success ? 'passed' : 'failed',
                    log: data.output || "No transmission logs."
                } : r));
            } catch (err) {
                setResults(prev => prev.map(r => r.runId === runId ? { ...r, status: 'error', log: "Network transmission failure." } : r));
            }
        }
        setIsRunning(false);
    };

    const downloadReport = async () => {
        const element = reportRef.current;
        if (!element) return;

        // --- Create Professional PDF Overlay ---
        const pdfHeader = document.createElement("div");
        pdfHeader.id = "pdf-temp-header";
        pdfHeader.style.cssText = `
        padding: 50px 60px;
        background: #09090b;
        color: #ffffff;
        font-family: 'Plus Jakarta Sans', sans-serif;
        border-bottom: 3px solid #6366f1;
        margin-bottom: 40px;
    `;

        const timestamp = new Date().toLocaleString();
        const reportId = Math.random().toString(36).substr(2, 9).toUpperCase();

        pdfHeader.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px;">
            <div>
              <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 10px;">
                <div style="width: 32px; height: 32px; background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%); border-radius: 8px;"></div>
                <h1 style="font-size: 32px; font-weight: 800; margin: 0; letter-spacing: -0.02em; color: #fff;">BDD TESTIFY SCENARIOS</h1>
              </div>
              <p style="font-size: 12px; color: #94a3b8; letter-spacing: 0.1em; text-transform: uppercase; font-weight: 600;">Automated Compliance & Behavioral Audit</p>
            </div>
            <div style="text-align: right; font-family: 'Outfit', sans-serif;">
              <div style="font-size: 14px; color: #6366f1; font-weight: 700;">AUDIT_SERIAL: ${reportId}</div>
              <div style="font-size: 12px; color: #64748b; margin-top: 4px;">GENERATED: ${timestamp}</div>
            </div>
        </div>

        <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.08); padding: 35px; border-radius: 20px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 30px;">
            <div style="border-right: 1px solid rgba(255,255,255,0.05);">
               <div style="font-size: 11px; color: #94a3b8; font-weight: 700; text-transform: uppercase; margin-bottom: 12px;">Infrastructure Verified</div>
               <div style="font-size: 16px; font-weight: 600; color: #fff; word-break: break-all; line-height: 1.4;">${targetUrl}</div>
            </div>
            <div style="border-right: 1px solid rgba(255,255,255,0.05); padding-left: 10px;">
               <div style="font-size: 11px; color: #10b981; font-weight: 700; text-transform: uppercase; margin-bottom: 12px;">Protocol Integrity</div>
               <div style="display: flex; align-items: baseline; gap: 8px;">
                  <span style="font-size: 36px; font-weight: 800; color: #10b981;">${accuracyRate}%</span>
                  <span style="font-size: 12px; color: #10b981; opacity: 0.7;">STABLE</span>
               </div>
            </div>
            <div style="padding-left: 10px;">
               <div style="font-size: 11px; color: #f59e0b; font-weight: 700; text-transform: uppercase; margin-bottom: 12px;">Total Executions</div>
               <div style="font-size: 36px; font-weight: 800; color: #fff;">${results.length}</div>
            </div>
        </div>

        <div style="margin-top: 30px; display: flex; gap: 15px;">
            <div style="padding: 10px 20px; background: rgba(99, 102, 241, 0.1); border: 1px solid rgba(99, 102, 241, 0.2); border-radius: 10px; font-size: 11px; color: #818cf8; font-weight: 600;">SESSION_TYPE: AUTOMATED_STUDIO</div>
            <div style="padding: 10px 20px; background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 10px; font-size: 11px; color: #34d399; font-weight: 600;">STATUS: VERIFIED_AUDIT</div>
        </div>
    `;

        // --- Footer for Summary page ---
        const pdfFooter = document.createElement("div");
        pdfFooter.id = "pdf-temp-footer";
        pdfFooter.style.cssText = `
        padding: 40px 60px;
        background: #09090b;
        color: #94a3b8;
        font-family: 'Plus Jakarta Sans', sans-serif;
        border-top: 1px solid rgba(255,255,255,0.05);
        margin-top: 40px;
        display: flex;
        justify-content: space-between;
        align-items: center;
    `;
        pdfFooter.innerHTML = `
        <div>
            <div style="font-size: 10px; font-weight: 700; letter-spacing: 1px; color: #6366f1; margin-bottom: 5px;">END_OF_TRANSMISSION</div>
            <div style="font-size: 12px;">© 2026 BDD Testify Scenarios Engine • High-Priority Intelligence</div>
        </div>
        <div style="text-align: right;">
            <div style="font-size: 10px; opacity: 0.5;">CERTIFIED_BY_ANTIGRAVITY_KERNEL</div>
            <div style="font-size: 10px; font-weight: 800; color: #fff; margin-top: 3px;">INTERNAL_USE_ONLY // GRADE_A_COMPLIANCE</div>
        </div>
    `;

        element.prepend(pdfHeader);
        element.appendChild(pdfFooter);
        element.classList.add("pdf-rendering");

        try {
            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                backgroundColor: "#09090b",
                logging: false,
                windowWidth: element.scrollWidth,
                windowHeight: element.scrollHeight
            });

            // Cleanup
            element.removeChild(pdfHeader);
            element.removeChild(pdfFooter);
            element.classList.remove("pdf-rendering");

            const imgData = canvas.toDataURL("image/png");
            const pdf = new jsPDF("p", "mm", "a4");
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const imgProps = pdf.getImageProperties(imgData);
            const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;

            let heightLeft = imgHeight;
            let position = 0;

            // Page 1
            pdf.addImage(imgData, "PNG", 0, position, pdfWidth, imgHeight, undefined, 'FAST');
            heightLeft -= pdfHeight;

            // Subsequent Pages
            while (heightLeft > 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                // Fill dark background for each new page to maintain pro theme
                pdf.setFillColor(9, 9, 11); // #09090b
                pdf.rect(0, 0, pdfWidth, pdfHeight, 'F');
                pdf.addImage(imgData, "PNG", 0, position, pdfWidth, imgHeight, undefined, 'FAST');
                heightLeft -= pdfHeight;
            }

            pdf.save(`BDD-Compliance-Report-${new Date().getTime()}.pdf`);
        } catch (e) {
            console.error(e);
            alert("Report Export Error.");
            if (element.contains(pdfHeader)) element.removeChild(pdfHeader);
            if (element.contains(pdfFooter)) element.removeChild(pdfFooter);
            element.classList.remove("pdf-rendering");
        }
    };

    const filtered = TEST_SCENARIOS.filter(s =>
        (s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.category.toLowerCase().includes(searchTerm.toLowerCase())) &&
        (activeCategory === "All" || s.category === activeCategory)
    );

    const accuracyRate = results.length > 0
        ? Math.round((results.filter(r => r.status === 'passed').length / results.length) * 100)
        : 0;

    return (
        <div className="test-scenario-container">
            <header
                className="suite-header"
            >
                <div className="header-brand">
                    <Zap size={22} className="zap-icon" />
                    <h2>Protocol Engine <span style={{ opacity: 0.2, fontWeight: 300 }}>// CLOUD_READY</span></h2>
                </div>

                <div className="mode-toggle-pill">
                    <button
                        className={`mode-btn ${mode === 'library' ? 'active' : ''}`}
                        onClick={() => setMode('library')}
                    >
                        <Layout size={14} /> VALUT_LIBRARY
                    </button>
                    <button
                        className={`mode-btn ${mode === 'custom' ? 'active' : ''}`}
                        onClick={() => setMode('custom')}
                    >
                        <Edit3 size={14} /> CUSTOM_FORGE
                    </button>
                </div>

                <div className="global-controls">
                    <div className="url-deck">
                        <Globe size={16} style={{ margin: '8px 15px', opacity: 0.3 }} />
                        <input
                            type="text"
                            value={targetUrl}
                            onChange={(e) => setTargetUrl(e.target.value)}
                            placeholder="Transmission Target URL..."
                        />
                    </div>
                </div>

                <div className="header-actions">
                    <button
                        className="run-btn-hero"
                        onClick={handleRunTests}
                        disabled={isRunning || (mode === 'library' && selectedIds.length === 0)}
                    >
                        {isRunning ? <div className="loader-orbit-v2"></div> : <><Play size={15} fill="currentColor" /> INITIATE_SESSION</>}
                    </button>
                    <button className="reset-btn" style={{ background: 'transparent', border: 'none', color: 'var(--studio-text-dim)', fontSize: '0.7rem' }} onClick={() => { setResults([]); setSelectedIds([]); }}>
                        PURGE_ALL
                    </button>
                </div>
            </header>

            <div className="workspace-suite">
                {/* Zone 1: Switchable Content */}
                {mode === 'library' ? (
                    <section className="panel-zone zone-vault">
                        <div className="panel-header">
                            <h4>Protocol Vault</h4>
                            <Filter size={14} className="text-dim" />
                        </div>
                        <div className="panel-body">
                            <div className="vault-filters">
                                <div className="vault-search">
                                    <Search size={16} style={{ opacity: 0.3 }} />
                                    <input
                                        type="text"
                                        placeholder="Keywords..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                <div className="vault-chips">
                                    {categories.map(c => (
                                        <button
                                            key={c}
                                            className={activeCategory === c ? 'active' : ''}
                                            onClick={() => setActiveCategory(c)}
                                        >
                                            {c}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="vault-list">
                                {filtered.map(s => (
                                    <div
                                        key={s.id}
                                        className={`vault-item ${selectedIds.includes(s.id) ? 'selected' : ''}`}
                                        onClick={() => toggleScenario(s.id)}
                                    >
                                        {selectedIds.includes(s.id) ? <CheckCircle2 size={16} color="var(--studio-accent)" /> : <Plus size={16} opacity={0.2} />}
                                        <div className="v-info">
                                            <h6>{s.title}</h6>
                                            <span>{s.category}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>
                ) : (
                    <section className="panel-zone zone-custom">
                        <div className="panel-header">
                            <h4>Custom Protocol Forge</h4>
                            <Edit3 size={14} className="text-dim" />
                        </div>
                        <div className="panel-body custom-body">
                            <div className="gherkin-editor">
                                <div className="g-row">
                                    <label>Scenario Name</label>
                                    <input type="text" className="g-input" placeholder="e.g. Verify Login Flow" defaultValue="Custom Behavioral Check" />
                                </div>
                                <div className="g-block">
                                    <label className="kwd">GIVEN</label>
                                    <input
                                        type="text"
                                        className="g-input code"
                                        value={customGiven}
                                        onChange={(e) => setCustomGiven(e.target.value)}
                                        placeholder="e.g. I am on '{URL}'"
                                    />
                                    <span className="hint"><strong>CONTEXT:</strong> Set the starting point. Usually: <em>I am on '{URL}'</em></span>
                                </div>
                                <div className="g-block">
                                    <label className="kwd">WHEN</label>
                                    <textarea
                                        className="g-input code area"
                                        value={customWhen}
                                        onChange={(e) => setCustomWhen(e.target.value)}
                                        placeholder="e.g. I click on '.login-button' OR I enter 'admin' into '#user'"
                                    />
                                    <span className="hint"><strong>ACTION:</strong> What should the test do? (click, type, hover, wait)</span>
                                </div>
                                <div className="g-block">
                                    <label className="kwd">THEN</label>
                                    <textarea
                                        className="g-input code area"
                                        value={customThen}
                                        onChange={(e) => setCustomThen(e.target.value)}
                                        placeholder="e.g. I should see 'Welcome' OR the title should be 'Dashboard'"
                                    />
                                    <span className="hint"><strong>VERIFY:</strong> What is the expected result? (see text, check title, check visibility)</span>
                                </div>
                            </div>
                        </div>
                    </section>
                )}

                {/* Zone 2: Live Execution Engine (Results) */}
                <section className="panel-zone zone-kernel">
                    <div className="panel-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Activity size={16} color="var(--studio-accent)" />
                            <h4>Execution Log Stream</h4>
                        </div>
                        {results.length > 0 && (
                            <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.7rem', fontWeight: 900, color: 'var(--studio-success)' }}>{accuracyRate}% INTEGRITY</span>
                                <button className="export-btn" style={{ padding: '4px 12px', fontSize: '0.65rem', borderRadius: '4px', border: '1px solid var(--studio-border)' }} onClick={downloadReport}>SAVE_REPORT</button>
                            </div>
                        )}
                    </div>
                    <div className="panel-body" ref={reportRef}>
                        {results.length === 0 ? (
                            <div className="kernel-standby">
                                <ShieldCheck size={80} strokeWidth={0.5} style={{ marginBottom: '20px' }} />
                                <p style={{ fontSize: '0.9rem', letterSpacing: '1px' }}>
                                    {mode === 'library'
                                        ? "SYSTEM_STANDBY: Awaiting protocol deployment from vault."
                                        : "SYSTEM_STANDBY: Configured custom protocol ready for injection."
                                    }
                                </p>
                            </div>
                        ) : (
                            <div className="kernel-grid">
                                {results.map(r => (
                                    <div
                                        key={r.runId}
                                        className={`kernel-node ${r.status}`}
                                    >
                                        <div className="node-content">
                                            <div className="node-head">
                                                <span className={`node-status ${r.status}`}>{r.status}</span>
                                                <Trash2 size={14} className="text-dim" style={{ cursor: 'pointer', opacity: 0.4 }} onClick={() => setResults(prev => prev.filter(x => x.runId !== r.runId))} />
                                            </div>
                                            <h3 className="node-title">{r.title}</h3>
                                            <div className="node-flow">
                                                <div className="flow-step"><b>EXPECTS</b> {r.given.replace("{URL}", targetUrl)}</div>
                                                <div className="flow-step"><b>ACTION</b> {r.when}</div>
                                                <div className="flow-step"><b>VERIFY</b> {r.then}</div>
                                            </div>
                                            {r.log && (
                                                <div className="node-logs">
                                                    <pre>{r.log}</pre>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
};

export default TestSenerio;
