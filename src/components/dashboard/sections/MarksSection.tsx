"use client";

import React, { useState, useMemo } from "react";
import {
    Award, TrendingUp, BookOpen, Layers, BarChart2,
    Calendar, CheckCircle, ChevronRight, FileText, Sparkles
} from "lucide-react";
import {
    Tooltip, ResponsiveContainer,
    BarChart, Bar, XAxis, YAxis, CartesianGrid
} from "recharts";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import "@/styles/Marks.css";

const MarksTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="custom-chart-tooltip" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
                <p className="tooltip-title">{data.name}</p>
                <div className="tooltip-divider"></div>
                <div className="tooltip-row">
                    <span className="tooltip-label">Code</span>
                    <span className="tooltip-value">{data.code}</span>
                </div>
                <div className="tooltip-row">
                    <span className="tooltip-label">Internal Marks</span>
                    <span className="tooltip-value" style={{ color: 'var(--accent-primary)' }}>{data.marks} / 50</span>
                </div>
            </div>
        );
    }
    return null;
};

interface MarksSectionProps {
    studentName?: string;
    currentSem: any[];
    examHistory: any[];
    currentCgpa: string | null;
    latestSGPA: number;
    totalCredits: number;
    maxCredits?: number;
    GRADE_COLORS: Record<string, string>;
    isLateralEntry?: boolean;
    onSelectSubject?: (subject: any) => void;
}

const MarksSection: React.FC<MarksSectionProps> = ({
    studentName,
    currentSem = [],
    examHistory = [],
    currentCgpa,
    latestSGPA,
    totalCredits,
    maxCredits = 160,
    GRADE_COLORS,
    isLateralEntry = false,
    onSelectSubject
}) => {
    const [subTab, setSubTab] = useState<"cie" | "see">("cie");
    const [selectedHistoryIdx, setSelectedHistoryIdx] = useState<number>(0);

    // Reversed history (most recent first)
    const reversedHistory = useMemo(() => [...examHistory].reverse(), [examHistory]);

    const hasMarksData = currentSem.length > 0 && currentSem.some((s: any) => 
        (s.marks && s.marks > 0) || 
        (s.assessments && s.assessments.length > 0)
    );

    return (
        <div className="tab-content">
            <DashboardHeader
                name={studentName}
                sectionTitle="Academic Marks"
                sectionSubtitle="Continuous Internal Evaluation (CIE) & Semester End Results (SEE)"
            />

            <div className="marks-container">
                {/* Sub-tab navigation */}
                <div className="marks-subtab-bar">
                    <button
                        type="button"
                        className={`marks-subtab-btn ${subTab === 'cie' ? 'active' : ''}`}
                        onClick={() => setSubTab('cie')}
                    >
                        <Award size={16} />
                        <span>CIE (Internals)</span>
                    </button>
                    <button
                        type="button"
                        className={`marks-subtab-btn ${subTab === 'see' ? 'active' : ''}`}
                        onClick={() => setSubTab('see')}
                    >
                        <Layers size={16} />
                        <span>SEE (Semester End Exams)</span>
                    </button>
                </div>

                {/* ───────────────── 1. CIE VIEW ───────────────── */}
                {subTab === 'cie' && (
                    <>
                        {/* CIE Bar Chart at the Top */}
                        <div className="chart-card">
                            <div className="chart-header">
                                <div>
                                    <h3 className="chart-title">Internal Marks (CIE)</h3>
                                    <p className="chart-subtitle">Subject-wise CIE scores out of 50</p>
                                </div>
                            </div>
                            <div className="chart-body marks-chart-body">
                                {hasMarksData ? (
                                    <ResponsiveContainer width="100%" height={380}>
                                        <BarChart data={currentSem} margin={{ top: 20, right: 0, left: -20, bottom: 20 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.15)" vertical={false} />
                                            <XAxis dataKey="code" stroke="var(--text-muted)" style={{ fontSize: '11px' }} axisLine={false} tickLine={false} />
                                            <YAxis domain={[0, 50]} ticks={[0, 10, 20, 30, 40, 50]} stroke="var(--text-muted)" style={{ fontSize: '12px' }} axisLine={false} tickLine={false} />
                                            <Tooltip content={<MarksTooltip />} cursor={{ fill: 'var(--bg-primary)' }} />
                                            <Bar 
                                                dataKey="marks" 
                                                radius={[4, 4, 0, 0]} 
                                                barSize={20} 
                                                fill="var(--accent-primary)" 
                                                onClick={(data: any) => data && onSelectSubject?.(data.payload)}
                                                style={{ cursor: 'pointer' }}
                                            />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="dashboard-empty-state">
                                        <div className="empty-state-icon-wrap purple">
                                            <Award size={26} />
                                        </div>
                                        <h4 className="empty-state-title">No CIE Marks Available</h4>
                                        <p className="empty-state-desc">
                                            Internal assessment scores will display once published.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Subject CIE Cards */}
                        {currentSem.length === 0 ? (
                            <div className="dashboard-empty-state">
                                <Award size={32} />
                                <h3>No CIE Data Available</h3>
                                <p>Internal marks will appear once published by faculty on the portal.</p>
                            </div>
                        ) : (
                            <div className="cie-subjects-grid">
                                {currentSem.map((subj) => {
                                    const getScore = (type: string) => subj.assessments?.find((a: any) => a.type === type);
                                    const t1 = getScore('T1');
                                    const t2 = getScore('T2');
                                    const aq1 = getScore('AQ1');
                                    const aq2 = getScore('AQ2');
                                    const hasAverage = (t1?.class_average && t1.class_average > 0) || (t2?.class_average && t2.class_average > 0);
                                    const classAvg = hasAverage 
                                        ? Math.round(((t1?.class_average || 0) + (t2?.class_average || 0)) / (t1?.class_average && t2?.class_average ? 2 : 1)) 
                                        : null;

                                    return (
                                        <div
                                            key={subj.code}
                                            className="cie-card"
                                            onClick={() => onSelectSubject?.(subj)}
                                            role="button"
                                            tabIndex={0}
                                        >
                                            {/* Header: Code, Name & Score */}
                                            <div className="cie-card-header">
                                                <div className="cie-header-info">
                                                    <span className="cie-code-badge">{subj.code}</span>
                                                    <h4 className="cie-subj-name" title={subj.name}>{subj.name}</h4>
                                                </div>
                                                <div className="cie-score-badge">
                                                    <div className="cie-score-val">
                                                        {typeof subj.marks === 'number' ? subj.marks : '—'}
                                                        <span className="cie-score-denom">/50</span>
                                                    </div>
                                                    <span className="cie-score-label">Total CIE</span>
                                                </div>
                                            </div>

                                            {/* CIE Progress Meter */}
                                            {typeof subj.marks === 'number' && (
                                                <div className="cie-progress-container">
                                                    <div className="cie-progress-track">
                                                        <div 
                                                            className="cie-progress-fill" 
                                                            style={{ 
                                                                width: `${Math.min(100, Math.max(0, (subj.marks / 50) * 100))}%`,
                                                                backgroundColor: subj.marks >= 40 ? '#10b981' : subj.marks >= 25 ? 'var(--accent-primary, #00ADB5)' : '#f59e0b'
                                                            }} 
                                                        />
                                                    </div>
                                                    <div className="cie-progress-meta">
                                                        <span>CIE Performance</span>
                                                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                                            {Math.round((subj.marks / 50) * 100)}%
                                                        </span>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Assessments Grid (2x2 on Mobile, 4x1 on Desktop) */}
                                            <div className="cie-assessments-grid">
                                                <div className="cie-ass-tile">
                                                    <div className="cie-ass-header">
                                                        <span className="cie-ass-dot dot-t1" />
                                                        <span className="cie-ass-name">Test 1</span>
                                                    </div>
                                                    <div className="cie-ass-marks">
                                                        <span className="cie-ass-score t1">
                                                            {t1?.obtained_marks ?? '—'}
                                                        </span>
                                                        <span className="cie-ass-max">/{t1?.max_marks || 30}</span>
                                                    </div>
                                                </div>

                                                <div className="cie-ass-tile">
                                                    <div className="cie-ass-header">
                                                        <span className="cie-ass-dot dot-t2" />
                                                        <span className="cie-ass-name">Test 2</span>
                                                    </div>
                                                    <div className="cie-ass-marks">
                                                        <span className="cie-ass-score t2">
                                                            {t2?.obtained_marks ?? '—'}
                                                        </span>
                                                        <span className="cie-ass-max">/{t2?.max_marks || 30}</span>
                                                    </div>
                                                </div>

                                                <div className="cie-ass-tile">
                                                    <div className="cie-ass-header">
                                                        <span className="cie-ass-dot dot-aq1" />
                                                        <span className="cie-ass-name">Quiz 1</span>
                                                    </div>
                                                    <div className="cie-ass-marks">
                                                        <span className="cie-ass-score aq1">
                                                            {aq1?.obtained_marks ?? '—'}
                                                        </span>
                                                        <span className="cie-ass-max">/{aq1?.max_marks || 10}</span>
                                                    </div>
                                                </div>

                                                <div className="cie-ass-tile">
                                                    <div className="cie-ass-header">
                                                        <span className="cie-ass-dot dot-aq2" />
                                                        <span className="cie-ass-name">Quiz 2</span>
                                                    </div>
                                                    <div className="cie-ass-marks">
                                                        <span className="cie-ass-score aq2">
                                                            {aq2?.obtained_marks ?? '—'}
                                                        </span>
                                                        <span className="cie-ass-max">/{aq2?.max_marks || 10}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Class Benchmark Comparison */}
                                            {classAvg !== null && (
                                                <div className="cie-avg-banner">
                                                    <div className="cie-avg-label-wrap">
                                                        <Sparkles size={13} style={{ color: 'var(--accent-primary)' }} />
                                                        <span>Class Test Average</span>
                                                    </div>
                                                    <span className="cie-avg-value">
                                                        {classAvg} / 30
                                                    </span>
                                                </div>
                                            )}

                                            {/* Action Link */}
                                            <div className="cie-card-action">
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <BarChart2 size={14} style={{ color: 'var(--accent-primary)' }} />
                                                    <span>View Details & Attendance</span>
                                                </div>
                                                <ChevronRight size={14} className="cie-action-icon" />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}

                {/* ───────────────── 2. SEE VIEW (MERGED EXAM HISTORY) ───────────────── */}
                {subTab === 'see' && (
                    <div className="see-container">
                        {/* Cumulative Highlights */}
                        <div className="marks-stats-grid">
                            <div className="marks-stat-card">
                                <div className="marks-stat-icon cyan">
                                    <Award size={24} />
                                </div>
                                <div className="marks-stat-info">
                                    <span className="marks-stat-label">Cumulative GPA</span>
                                    <span className="marks-stat-value">{currentCgpa || "—"}</span>
                                </div>
                            </div>

                            <div className="marks-stat-card">
                                <div className="marks-stat-icon green">
                                    <TrendingUp size={24} />
                                </div>
                                <div className="marks-stat-info">
                                    <span className="marks-stat-label">Latest SGPA</span>
                                    <span className="marks-stat-value">{latestSGPA ? latestSGPA.toFixed(2) : "—"}</span>
                                </div>
                            </div>

                            <div className="marks-stat-card">
                                <div className="marks-stat-icon purple">
                                    <Layers size={24} />
                                </div>
                                <div className="marks-stat-info">
                                    <span className="marks-stat-label">Earned Credits</span>
                                    <span className="marks-stat-value">{totalCredits} <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>/ {maxCredits}</span></span>
                                </div>
                            </div>
                        </div>

                        {examHistory.length === 0 ? (
                            <div className="dashboard-empty-state" style={{ maxWidth: '520px', margin: '30px auto' }}>
                                <div className="empty-state-icon-wrap purple">
                                    <Layers size={26} />
                                </div>
                                <h3 className="empty-state-title">No Exam History Found</h3>
                                <p className="empty-state-desc">
                                    Past semester results and grade cards will appear here.
                                </p>
                            </div>
                        ) : (
                            <>
                                {/* Mobile Semester Selector Dropdown (only for mobile) */}
                                <div className="mobile-history-selector">
                                    <label htmlFor="sem-select-marks" className="stat-label" style={{ paddingLeft: '4px', fontSize: '11px', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>
                                        Select Semester
                                    </label>
                                    <select
                                        id="sem-select-marks"
                                        className="sem-history-select"
                                        value={selectedHistoryIdx}
                                        onChange={(e) => setSelectedHistoryIdx(Number.parseInt(e.target.value, 10))}
                                        style={{
                                            width: '100%',
                                            padding: '12px',
                                            background: 'var(--bg-secondary)',
                                            border: '1px solid var(--border-subtle)',
                                            borderRadius: '8px',
                                            color: 'var(--text-primary)',
                                            fontSize: '14px',
                                            outline: 'none',
                                            appearance: 'none'
                                        }}
                                    >
                                        {reversedHistory.map((sem: any, idx: number) => {
                                            const semNum = isLateralEntry ? (examHistory.length - idx + 2) : (examHistory.length - idx);
                                            return (
                                                <option key={sem.semester || idx} value={idx}>
                                                    Semester {semNum} (SGPA: {sem.sgpa})
                                                </option>
                                            );
                                        })}
                                    </select>
                                </div>

                                <div className="history-grid">
                                    {reversedHistory.map((sem: any, idx: number) => (
                                        <div
                                            key={sem.semester || idx}
                                            className={`chart-card history-card ${selectedHistoryIdx === idx ? 'mobile-show' : 'mobile-hide'}`}
                                        >
                                        <div className="chart-header" style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px', marginBottom: '16px', display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                            <div>
                                                <span className="pill" style={{ marginBottom: '8px', display: 'inline-block' }}>
                                                    Semester {isLateralEntry ? (examHistory.length - idx + 2) : (examHistory.length - idx)}
                                                </span>
                                                <h3 className="chart-title" style={{ margin: 0 }}>{sem.semester}</h3>
                                            </div>
                                            <div className="history-sgpa-badge" style={{ textAlign: 'right', flexShrink: 0 }}>
                                                <div className="stat-label" style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>SGPA</div>
                                                <div className="stat-value" style={{ fontSize: '24px', fontWeight: '800', color: 'var(--accent-primary)', lineHeight: 1 }}>{sem.sgpa}</div>
                                            </div>
                                        </div>
                                        <div className="dashboard-table-container">
                                            <table className="dashboard-table">
                                                <thead>
                                                    <tr>
                                                        <th>Course</th>
                                                        <th style={{ textAlign: 'right' }}>Grade</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {sem.courses?.map((c: any, i: number) => (
                                                        <tr key={c.code || c.name || i}>
                                                            <td>
                                                                <div style={{ fontWeight: 600, fontSize: '13.5px', color: 'var(--text-primary)', lineHeight: 1.4 }}>
                                                                    {c.name}
                                                                </div>
                                                                <div style={{ color: 'var(--text-muted)', fontSize: '11.5px', marginTop: '2px', letterSpacing: '0.3px', fontWeight: 500 }}>
                                                                    {c.code}
                                                                </div>
                                                            </td>
                                                            <td style={{ textAlign: 'right', fontWeight: 'bold', fontSize: '14px', color: GRADE_COLORS[c.grade] || 'var(--text-primary)' }}>
                                                                {c.grade}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default React.memo(MarksSection);
