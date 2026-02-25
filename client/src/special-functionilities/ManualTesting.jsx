// ===== Imports =====
import React, { useState, useEffect, useRef } from "react";
import { useUser } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import {
    Play, Terminal, CheckCircle2, AlertCircle,
    Loader2, Sparkles, Activity, Globe, Send,
    RefreshCw, Cpu, Database, Save
} from "lucide-react";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import "./ManualTesting.css";

// ===== AI Smart Parser (Natural Language to Gherkin) =====
const parseToGherkin = (line) => {
    const l = line.trim();
    if (!l) return null;

    const patterns = [
        // Actions: Dropdowns & Complex Selections
        { regex: /^(?:select|choose|pick) (?:the )?['"]?([^'"]+)['"]? as ['"]?([^'"]+)['"]?$/i, template: "When I select '{1}' as '{2}'" },

        // Actions: Type/Fill
        { regex: /^(?:add|put|input|type|enter) (?:the )?['"]?([^'"]+)['"]? as ['"]?([^'"]+)['"]?$/i, template: "When I enter '{1}' as '{2}'" },
        { regex: /^(?:type|enter|input|write) (?:the )?['"]?([^'"]+)['"]? (?:in|into|at|inside) (?:the )?['"]?([^'"]+)['"]?$/i, template: "When I enter '{1}' into '{2}'" },

        // Assertions: Text & Navigation
        { regex: /^(?:see|verify|check|expect|assert|find|should see|i should be navigated to|is now|contains) (?:text |to |at |on |the )?['"]?([^'"]+)['"]?$/i, template: "Then I should see '{1}'" },

        // Standard Patterns...
        { regex: /^(?:open|go|navigate|visit|browse|load) (?:to |the website )?['"]?([^'"]+)['"]?$/i, template: "Given I am on '{1}'" },
        { regex: /^(?:click|press|hit|tap|select) (?:on |at )?(?:the )?['"]?([^'"]+)['"]?$/i, template: "When I click on '{1}'" },
        { regex: /^(?:fill) (?:the )?['"]?([^'"]+)['"]? (?:with) (?:the )?['"]?([^'"]+)['"]?$/i, template: "When I enter '{2}' into '{1}'" },
        { regex: /^(?:press|hit) (?:the )?['"]?([^'"]+)['"]? (?:key)?$/i, template: "When I press '{1}'" },
        { regex: /^(?:wait|sleep|pause) (?:for )?(\d+)(?: ?s| ?seconds)?$/i, template: "When I wait for {1} seconds" },
        { regex: /^(?:wait for|ensure|expect|wait until) (?:element |selector )?['"]?([^'"]+)['"]? (?:is |to be )?(?:visible|present|loaded)$/i, template: "When I wait for element '{1}' to be visible" },
        { regex: /^(?:verify|check|ensure|expect) (?:the )?title (?:is|to be|should be) ['"]?([^'"]+)['"]?$/i, template: "Then the title should be '{1}'" },
        { regex: /^(?:scroll|move|go) (?:to|down to) ['"]?([^'"]+)['"]?$/i, template: "When I scroll to '{1}'" },
        { regex: /^(?:screenshot|snap|capture|take a photo) (?:as |named )?['"]?([^'"]+)['"]?$/i, template: "Then I take a screenshot '{1}'" }
    ];

    for (const p of patterns) {
        const match = l.match(p.regex);
        if (match) {
            let gherkin = p.template;
            for (let i = 1; i < match.length; i++) {
                gherkin = gherkin.replace(`{${i}}`, match[i]);
            }
            return { original: l, gherkin, valid: true };
        }
    }

    // Direct Gherkin support
    if (/^(Given|When|Then|And|But)\s/i.test(l)) {
        return { original: l, gherkin: l, valid: true };
    }

    return { original: l, gherkin: `# Unrecognized step: ${l}`, valid: false };
};

const ManualTesting = ({ role, normalTokens, specialTokens }) => {
    const { user } = useUser();
    const navigate = useNavigate();

    // State
    const [input, setInput] = useState("");
    const [parsedSteps, setParsedSteps] = useState([]);
    const [url, setUrl] = useState("https://www.google.com");
    const [isRunning, setIsRunning] = useState(false);
    const [logs, setLogs] = useState([]);
    const [testStatus, setTestStatus] = useState("idle");
    const logScrollRef = useRef(null);
    const reportRef = useRef(null);

    // Auto-parse input into Gherkin steps
    useEffect(() => {
        const lines = input.split('\n').filter(l => l.trim() !== "");
        const parsed = lines.map(line => parseToGherkin(line));
        setParsedSteps(parsed);
    }, [input]);

    // Auto-scroll terminal logs
    useEffect(() => {
        if (logScrollRef.current) {
            logScrollRef.current.scrollTop = logScrollRef.current.scrollHeight;
        }
    }, [logs]);

    const handleRun = async () => {
        if (role !== "admin" && (specialTokens === null || specialTokens <= 0)) {
            alert("Insufficient Protocol Tokens. Redirecting to pricing...");
            navigate("/");
            setTimeout(() => {
                document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" });
            }, 500);
            return;
        }
        if (!url) return alert("Target URL is required.");
        if (parsedSteps.length === 0 || parsedSteps.some(s => !s.valid)) {
            alert("Please provide valid English instructions.");
            return;
        }

        setIsRunning(true);
        setTestStatus("running");
        setLogs([
            { type: 'agent', msg: "[SYSTEM] Initializing Test Kernel..." },
            { type: 'agent', msg: `[SYSTEM] Target: ${url}` },
            { type: 'agent', msg: "[SYSTEM] Compiling instructions into automated protocol..." }
        ]);

        let featureScript = "Feature: Manual AI Test\n  Scenario: User defined instructions\n";
        featureScript += `    Given I am on '${url}'\n`;

        parsedSteps.forEach(s => {
            // Skip redundant 'Given I am on' steps to prevent "the login page" navigation errors
            if (!s.gherkin.toLowerCase().includes("given i am on")) {
                featureScript += `    ${s.gherkin}\n`;
            }
        });

        try {
            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/test/run-instant`, {

                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: user?.primaryEmailAddress?.emailAddress,
                    url: url,
                    featureContent: featureScript
                })
            });

            const data = await response.json();

            if (data.success) {
                setTestStatus("passed");
                const newLogs = data.output.split('\n').map(line => ({ type: 'msg', msg: line }));
                setLogs(prev => [...prev, ...newLogs, { type: 'success', msg: "✅ AUTOMATION COMPLETE: PASS" }]);
            } else {
                setTestStatus("failed");
                const newLogs = data.output.split('\n').map(line => ({ type: 'error', msg: line }));
                setLogs(prev => [...prev, ...newLogs, { type: 'error', msg: "❌ AUTOMATION ERROR: FAIL" }]);
            }
        } catch (err) {
            setTestStatus("failed");
            setLogs(prev => [...prev, { type: 'error', msg: "ENGINE ERROR: Could not reach the automation server." }]);
        } finally {
            setIsRunning(false);
        }
    };

    const loadDemo = () => {
        const demoText = `Go to 'https://google.com'\nType 'OpenAI' in [name='q']\nPress Enter\nWait 3 seconds\nCheck 'ChatGPT'`;
        setInput(demoText);
        setUrl("https://www.google.com");
    };

    // ===== downloadReport =====
    const downloadReport = async () => {
        const element = reportRef.current;
        if (!element) return;

        // --- 1. Prepare Professional PDF Overlay ---
        const header = document.createElement("div");
        header.style.cssText = `
        padding: 50px 60px;
        background: #09090b;
        color: #ffffff;
        font-family: 'Plus Jakarta Sans', sans-serif;
        border-bottom: 3px solid #3b82f6;
        margin-bottom: 30px;
    `;

        const timestamp = new Date().toLocaleString();
        const reportId = Math.random().toString(36).substr(2, 9).toUpperCase();

        header.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px;">
            <div>
              <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 10px;">
                <div style="width: 32px; height: 32px; background: #3b82f6; border-radius: 8px;"></div>
                <h1 style="font-size: 32px; font-weight: 800; margin: 0; color: #fff;">MANUAL AUDIT LOG</h1>
              </div>
              <p style="font-size: 12px; color: #94a3b8; letter-spacing: 0.1em; text-transform: uppercase;">Behavioral Integrity Report</p>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 14px; color: #3b82f6; font-weight: 700;">AUDIT_ID: ${reportId}</div>
              <div style="font-size: 12px; color: #64748b; margin-top: 4px;">DATE: ${timestamp}</div>
            </div>
        </div>

        <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.08); padding: 30px; border-radius: 12px; display: grid; grid-template-columns: 2fr 1fr; gap: 30px;">
            <div>
               <div style="font-size: 11px; color: #3b82f6; font-weight: 700; text-transform: uppercase; margin-bottom: 12px;">Infrastructure Verified</div>
               <div style="font-size: 16px; font-weight: 600; color: #fff; word-break: break-all;">${url}</div>
            </div>
            <div>
               <div style="font-size: 11px; color: ${testStatus === 'passed' ? '#10b981' : '#ef4444'}; font-weight: 700; text-transform: uppercase; margin-bottom: 12px;">Status</div>
               <div style="font-size: 24px; font-weight: 900; color: ${testStatus === 'passed' ? '#10b981' : '#ef4444'};">${testStatus.toUpperCase()}</div>
            </div>
        </div>
    `;

        const insights = document.createElement("div");
        insights.className = "pdf-insights-deck";
        insights.innerHTML = `
    <h4 style="color: #fff; font-size: 14px; font-weight: 800; margin-bottom: 20px; letter-spacing: 1px;">ENGINE_DIAGNOSTICS & BEHAVIORAL_INSIGHTS</h4>
    <div class="insights-grid">
        <div class="insight-card">
            <h5>${testStatus === 'passed' ? 'Integrity Validation' : 'Anomalous Entry'}</h5>
            <p>${testStatus === 'passed'
                ? 'The behavioral engine successfully reconciled the natural language instructions with the target environment. All behavioral nodes validated.'
                : 'The execution cycle was interrupted by a DOM reconciliation error. The target element was either not reachable or failed the state check.'}</p>
        </div>
        <div class="insight-card">
            <h5>Operational Suggestion</h5>
            <p>${testStatus === 'passed'
                ? 'Protocol stability is high. Deployment to production regression pipeline is recommended for permanent monitoring.'
                : 'Analyze the Execution Kernel logs below. If a selector was not found, try using more specific attributes or increasing the "Wait" duration.'}</p>
        </div>
    </div>
`;

        const footerTag = document.createElement("div");
        footerTag.className = "pdf-footer-tag";
        footerTag.innerHTML = `
    <div style="margin-bottom: 10px; opacity: 0.5;">[ INTEGRITY_SEAL_VERIFIED ]</div>
    <div>AUTHENTICATED BEHAVIORAL ANALYSIS BY ANTIGRAVITY ENGINE v4.0</div>
`;

        // --- 2. Attach Rendering Overlay ---
        element.prepend(header);
        element.appendChild(insights);
        element.appendChild(footerTag);
        element.classList.add("pdf-rendering-manual");

        try {
            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                backgroundColor: "#09090b",
                logging: false,
                windowWidth: 1000,
                scrollY: -window.scrollY
            });

            const imgData = canvas.toDataURL("image/png");
            const pdf = new jsPDF("p", "mm", "a4");
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const imgProps = pdf.getImageProperties(imgData);
            const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;

            let heightLeft = imgHeight;
            let position = 0;

            pdf.addImage(imgData, "PNG", 0, position, pdfWidth, imgHeight, undefined, "FAST");
            heightLeft -= pdfHeight;

            while (heightLeft > 0) {
                position -= pdfHeight;
                pdf.addPage();
                pdf.setFillColor(9, 9, 11);
                pdf.rect(0, 0, pdfWidth, pdfHeight, "F");
                pdf.addImage(imgData, "PNG", 0, position, pdfWidth, imgHeight, undefined, "FAST");
                heightLeft -= pdfHeight;
            }

            pdf.save(`Manual-Audit-Report-${new Date().getTime()}.pdf`);
        } catch (e) {
            console.error(e);
            alert("PDF Generation Error.");
        } finally {
            if (element.contains(header)) element.removeChild(header);
            if (element.contains(insights)) element.removeChild(insights);
            if (element.contains(footerTag)) element.removeChild(footerTag);
            element.classList.remove("pdf-rendering-manual");
        }
    };
    return (
        <div className="manual-testing-page">
            {/* Nav Bar */}
            <div className="manual-nav">
                <div className="nav-left">
                    <h2><Cpu size={18} /> MANUAL<span> BOT</span></h2>
                    <div className="url-input-wrapper-v3">
                        <Globe className="url-icon" size={16} />
                        <input
                            type="text"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="Target URL (e.g. https://google.com)"
                        />
                    </div>
                </div>

                <div className="nav-right">
                    <div className={`status-indicator ${testStatus}`}>
                        {testStatus === "running" && <RefreshCw size={12} className="spin" />}
                        {testStatus.toUpperCase()}
                    </div>
                    {testStatus !== "idle" && (
                        <button className="export-btn-manual" onClick={downloadReport}>
                            <Save size={14} /> EXPORT_PDF
                        </button>
                    )}
                    <button
                        className="run-btn-primary"
                        onClick={handleRun}
                        disabled={isRunning || parsedSteps.length === 0}
                    >
                        {isRunning ? <Loader2 className="spin" size={16} /> : <Play size={16} />}
                        {isRunning ? " EXECUTING" : " RUN TEST"}
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="manual-workspace-v2">

                {/* 1. INPUT EDITOR (Left) */}
                <div className="editor-section">
                    <div className="panel-sub-header">
                        <span><Send size={14} /> Test Architect</span>
                        <button className="text-btn" onClick={loadDemo} style={{ color: '#3b82f6', background: 'none', border: 'none', fontSize: '0.7rem', cursor: 'pointer', textDecoration: 'underline' }}>
                            Load Demo Instructions
                        </button>
                    </div>
                    <textarea
                        className="editor-textarea"
                        placeholder="Type your instructions here in plain English...&#10;For example:&#10;1. Click 'Login'&#10;2. Type 'admin' in #username&#10;3. See 'Welcome'"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        spellCheck="false"
                    />
                    <div className="editor-footer">
                        <Database size={12} />
                        <span>AI Ready to Process {parsedSteps.length} Steps</span>
                        <span style={{ marginLeft: 'auto', opacity: 0.5 }}>UTF-8 / English</span>
                    </div>
                </div>

                {/* 2. OUTPUT STACK (Right) */}
                <div className="output-section" ref={reportRef}>

                    {/* TOP: LOGIC PREVIEW */}
                    <div className="output-top">
                        <div className="panel-sub-header">
                            <span><Activity size={14} /> Logic Analysis</span>
                        </div>
                        <div className="steps-scroller">
                            {parsedSteps.length === 0 ? (
                                <div className="no-steps">
                                    <Sparkles size={24} />
                                    <p>Start typing instructions to see AI interpretation...</p>
                                </div>
                            ) : (
                                parsedSteps.map((step, idx) => (
                                    <div key={idx} className={`step-item-v2 ${step.valid ? 'valid' : 'invalid'}`}>
                                        <div className="step-num">{idx + 1}</div>
                                        <div className="step-content-v2">
                                            <div className="orig">{step.original}</div>
                                            <div className="trans">{step.gherkin}</div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* BOTTOM: TERMINAL LOGS */}
                    <div className="output-bottom">
                        <div className="panel-sub-header">
                            <span><Terminal size={14} /> Live Automation Kernel</span>
                        </div>
                        <div className="terminal-output-v2" ref={logScrollRef} style={{ background: '#000' }}>
                            {logs.length === 0 ? (
                                <div className="no-steps">
                                    <p>SYSTEM READY - WAITING FOR ARCHITECT COMMANDS...</p>
                                </div>
                            ) : (
                                logs.map((log, i) => (
                                    <div key={i} className={`log-line ${log.type}`}>
                                        <span className="timestamp">[{new Date().toLocaleTimeString().split(' ')[0]}]</span>
                                        <span className="msg">{log.msg}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default ManualTesting;
