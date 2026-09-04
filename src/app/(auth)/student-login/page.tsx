"use client";

import React, { useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { API_BASE_URL } from "@/config/api.config";

const CustomSelect = ({ value, onChange, options, placeholder }: { value: string, onChange: (val: string) => void, options: string[], placeholder: string }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="custom-select-container">
            <div
                className="select-trigger"
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className={value ? "value-text" : "placeholder-text"}>
                    {value || placeholder}
                </span>
                <span className="chevron">▼</span>
            </div>
            {isOpen && (
                <div className="select-dropdown">
                    {options.map((opt) => (
                        <div
                            key={opt}
                            className={`select-option ${value === opt ? "selected" : ""}`}
                            onClick={() => {
                                onChange(opt);
                                setIsOpen(false);
                            }}
                        >
                            {opt}
                        </div>
                    ))}
                </div>
            )}
            {isOpen && <div className="select-overlay" onClick={() => setIsOpen(false)} />}

            <style jsx>{`
                .custom-select-container { position: relative; flex: 1; }
                .select-trigger {
                    background: var(--bg-primary);
                    border: 1px solid var(--border-subtle);
                    padding: 10px 14px;
                    border-radius: var(--radius-md);
                    cursor: pointer;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    font-size: 0.9rem;
                    transition: all 0.2s ease;
                }
                .select-trigger:hover { border-color: var(--border-bright); background: var(--bg-secondary); }
                .value-text { color: var(--text-primary); }
                .placeholder-text { color: var(--text-muted); }
                .chevron { font-size: 8px; color: var(--text-muted); opacity: 0.7; }
                .select-dropdown {
                    position: absolute;
                    top: calc(100% + 6px);
                    left: 0;
                    right: 0;
                    background: var(--bg-secondary);
                    border: 1px solid var(--border-subtle);
                    border-radius: var(--radius-md);
                    max-height: 200px;
                    overflow-y: auto;
                    z-index: 100;
                    box-shadow: var(--shadow-lg);
                    padding: 4px;
                }
                .select-option {
                    padding: 8px 12px;
                    cursor: pointer;
                    border-radius: var(--radius-sm);
                    font-size: 0.85rem;
                    color: var(--text-secondary);
                    transition: all 0.2s ease;
                }
                .select-option:hover { background: var(--bg-surface); color: var(--text-primary); }
                .select-option.selected { background: var(--bg-surface); color: var(--accent-primary); font-weight: 600; }
                .select-overlay { position: fixed; inset: 0; z-index: 90; }
            `}</style>
        </div>
    );
};

export default function StudentLogin() {
    const router = useRouter();
    const [usn, setUsn] = useState("");
    const [day, setDay] = useState("");
    const [month, setMonth] = useState("");
    const [year, setYear] = useState("");

    // Secondary authentication & Remember Me fields
    const [authType, setAuthType] = useState("Father's Mobile");
    const [last4Digits, setLast4Digits] = useState("");
    const [rememberMe, setRememberMe] = useState(true);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [infoMsg, setInfoMsg] = useState("");
    const [mounted, setMounted] = useState(false);

    React.useEffect(() => {
        const sid = localStorage.getItem("studentSessionId");
        const userUsn = localStorage.getItem("studentUsn");
        if (sid && userUsn) {
            router.replace("/student/dashboard");
        } else {
            setMounted(true);
        }
    }, [router]);

    const days = Array.from({ length: 31 }, (_, i) => String(i + 1));
    const months = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 50 }, (_, i) => String(currentYear - i - 15));
    const authOptions = ["Father's Mobile", "Mother's Mobile", "ABC ID"];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!usn || !day || !month || !year) {
            setError("Please fill in all basic fields (USN and Date of Birth)");
            return;
        }

        if (!authType) {
            setError("Please select a verification method");
            return;
        }
        if (!last4Digits || last4Digits.length !== 4) {
            setError("Please enter the exact 4-digit PIN");
            return;
        }

        setError("");
        setInfoMsg("");
        setLoading(true);

        const monthIndex = String(months.indexOf(month) + 1).padStart(2, "0");
        const formattedDay = String(day).padStart(2, "0");
        const formattedDate = `${formattedDay}-${monthIndex}-${year}`;

        try {
            const cleanUsn = usn.trim().toUpperCase();
            const payload: any = {
                usn: cleanUsn,
                dob: formattedDate,
                authType: authType,
                last4Digits: last4Digits,
                rememberMe: rememberMe,
            };

            const response = await axios.post(`${API_BASE_URL}/api/auth/login`, payload);

            if (response.data.requiresSecondaryAuth) {
                setInfoMsg(response.data.message || "Verification details required for portal authentication.");
                setLoading(false);
                return;
            }

            if (response.data.success) {
                const { sessionId, usn: userUsn } = response.data.data;
                localStorage.setItem("studentSessionId", sessionId);
                localStorage.setItem("studentUsn", userUsn);
                router.push("/student/dashboard");
            }
        } catch (err: any) {
            setError(
                err.response?.data?.message || "Invalid credentials or login failed"
            );
        } finally {
            setLoading(false);
        }
    };

    if (!mounted) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: 'var(--bg-primary, #0A0A0A)' }} />
        );
    }

    return (
        <div className="login-page">
            <div className="login-card fade-in">
                <header className="login-header">
                    <div className="login-logo-container">
                        <img src="/logo-icon.svg" alt="MSR Insight" width={48} height={48} className="login-logo" />
                    </div>
                    <h1 className="login-title">Student Portal</h1>
                    <p className="login-subtitle">Sign in to access your reports</p>
                </header>

                <form onSubmit={handleSubmit} className="login-form">
                    <div className="form-group">
                        <label htmlFor="usn-input" className="form-label">University Seat Number</label>
                        <input
                            id="usn-input"
                            type="text"
                            className="input-field"
                            value={usn}
                            onChange={(e) => setUsn(e.target.value.toUpperCase().replace(/\s+/g, ""))}
                            placeholder="e.g. 1MS24CS001"
                        />
                    </div>

                    <div className="form-group">
                        <span className="form-label">Date of Birth</span>
                        <div className="dob-grid">
                            <CustomSelect
                                value={day}
                                onChange={setDay}
                                options={days}
                                placeholder="Day"
                            />
                            <CustomSelect
                                value={month}
                                onChange={setMonth}
                                options={months}
                                placeholder="Month"
                            />
                            <CustomSelect
                                value={year}
                                onChange={setYear}
                                options={years}
                                placeholder="Year"
                            />
                        </div>
                    </div>

                    <div className="secondary-auth-section fade-in">
                        <div className="secondary-header">
                            <h3>Security Verification</h3>
                            <p>Select verification option and enter 4-digit PIN</p>
                        </div>

                        <div className="form-group">
                            <span className="form-label">Verification Option</span>
                            <CustomSelect
                                value={authType}
                                onChange={setAuthType}
                                options={authOptions}
                                placeholder="Select Method"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="pin-input" className="form-label">Last 4 Digits (PIN)</label>
                            <input
                                id="pin-input"
                                type="password"
                                maxLength={4}
                                className="input-field pin-input"
                                value={last4Digits}
                                onChange={(e) => setLast4Digits(e.target.value.replace(/\D/g, ""))}
                                placeholder="e.g. 1234"
                            />
                        </div>
                    </div>

                    <label htmlFor="remember-me-checkbox" className="remember-me-container">
                        <input
                            id="remember-me-checkbox"
                            type="checkbox"
                            className="remember-me-checkbox"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                        />
                        <span className="remember-me-label">Remember me on this device</span>
                    </label>

                    {infoMsg && (
                        <div className="form-info">
                            {infoMsg}
                        </div>
                    )}

                    {error && (
                        <div className="form-error">
                            {error}
                        </div>
                    )}

                    <button type="submit" className="btn btn-primary login-btn" disabled={loading}>
                        {loading ? "Verifying & Syncing..." : "Sign In"}
                    </button>
                    
                    <div className="login-footer">
                        Secure academic access powered by MSR Insight
                    </div>
                </form>
            </div>

            <style jsx>{`
                .login-page {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: calc(100vh - var(--nav-height));
                    background: radial-gradient(circle at 50% 20%, rgba(2, 132, 199, 0.12) 0%, transparent 60%),
                                radial-gradient(circle at 80% 80%, rgba(99, 102, 241, 0.10) 0%, transparent 50%),
                                var(--bg-primary);
                    padding: 24px;
                }
                .login-card {
                    background: var(--glass-bg, rgba(17, 26, 44, 0.72));
                    backdrop-filter: var(--glass-blur, blur(20px) saturate(190%));
                    -webkit-backdrop-filter: var(--glass-blur, blur(20px) saturate(190%));
                    border: 1px solid var(--glass-border, rgba(255, 255, 255, 0.10));
                    border-radius: var(--radius-lg, 16px);
                    padding: 40px;
                    width: 100%;
                    max-width: 440px;
                    box-shadow: var(--glass-shadow), var(--glass-shine);
                    position: relative;
                    overflow: hidden;
                }
                .login-card::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 1px;
                    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.25), transparent);
                }
                .login-header {
                    margin-bottom: 32px;
                    text-align: center;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                }
                .login-logo-container {
                    width: 64px;
                    height: 64px;
                    border-radius: 18px;
                    background: linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(15, 23, 42, 0.7) 100%);
                    border: 1px solid rgba(255, 255, 255, 0.14);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-bottom: 16px;
                    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35), 0 0 15px rgba(0, 173, 181, 0.2);
                }
                .login-logo {
                    width: 42px;
                    height: 42px;
                    object-fit: contain;
                }
                .login-title {
                    font-size: 1.75rem;
                    font-weight: 800;
                    margin-bottom: 8px;
                    color: var(--text-primary);
                    letter-spacing: -0.02em;
                    background: linear-gradient(135deg, #FFFFFF 30%, #38BDF8 70%, #00ADB5 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }
                .login-subtitle {
                    color: var(--text-secondary);
                    font-size: 0.95rem;
                }
                .login-form {
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                }
                .dob-grid {
                    display: flex;
                    gap: 10px;
                }
                .login-btn {
                    margin-top: 10px;
                    font-weight: 600;
                    height: 44px;
                }
                .form-error {
                    background: rgba(239, 68, 68, 0.1);
                    border: 1px solid rgba(239, 68, 68, 0.2);
                    color: var(--error, #ef4444);
                    padding: 10px;
                    border-radius: var(--radius-md);
                    font-size: 0.85rem;
                    text-align: center;
                }
                .form-info {
                    background: rgba(59, 130, 246, 0.1);
                    border: 1px solid rgba(59, 130, 246, 0.25);
                    color: var(--accent-primary, #3b82f6);
                    padding: 10px 14px;
                    border-radius: var(--radius-md);
                    font-size: 0.85rem;
                    text-align: center;
                    line-height: 1.4;
                }
                .secondary-auth-section {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                    padding: 16px;
                    background: var(--bg-surface, rgba(255, 255, 255, 0.03));
                    border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
                    border-radius: var(--radius-md);
                    margin-top: 4px;
                }
                .secondary-header h3 {
                    font-size: 0.95rem;
                    font-weight: 700;
                    color: var(--text-primary);
                    margin-bottom: 2px;
                }
                .secondary-header p {
                    font-size: 0.8rem;
                    color: var(--text-muted);
                }
                .pin-input {
                    letter-spacing: 0.25em;
                    font-size: 1.1rem;
                    text-align: center;
                    font-weight: 700;
                }
                .remember-me-container {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    margin-top: 4px;
                    cursor: pointer;
                    user-select: none;
                }
                .remember-me-checkbox {
                    accent-color: var(--accent-primary, #3b82f6);
                    width: 16px;
                    height: 16px;
                    cursor: pointer;
                    border-radius: 4px;
                }
                .remember-me-label {
                    font-size: 0.85rem;
                    color: var(--text-secondary);
                }
                .login-footer {
                    margin-top: 24px;
                    text-align: center;
                    font-size: 0.75rem;
                    color: var(--text-muted);
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }

                @media (max-width: 768px) {
                    .login-card {
                        padding: 32px 24px;
                        max-width: 380px;
                        margin: 20px;
                    }
                    .login-title {
                        font-size: 1.5rem;
                    }
                }

                @media (max-width: 480px) {
                    .login-page {
                        align-items: flex-start;
                        padding-top: 40px;
                    }
                    .login-card {
                        padding: 24px 20px;
                        margin: 16px;
                        border-radius: var(--radius-md);
                    }
                    .dob-grid {
                        flex-direction: column;
                        gap: 12px;
                    }
                    .login-title {
                        font-size: 1.35rem;
                    }
                    .login-subtitle {
                        font-size: 0.85rem;
                    }
                }
            `}</style>
        </div>
    );
}

