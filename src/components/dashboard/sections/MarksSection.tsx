"use client";

import React, { useState, useMemo } from "react";
import {
    Award, TrendingUp, BookOpen, Layers, BarChart2,
    Calendar, CheckCircle, ChevronRight, FileText, Sparkles
} from "lucide-react";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import "@/styles/Marks.css";

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

    // CIE Metrics
    const cieMetrics = useMemo(() => {
        const subjectsWithMarks = currentSem.filter(s => typeof s.marks === 'number' && s.marks > 0);
        const avgScore = subjectsWithMarks.length > 0
            ? Math.round(subjectsWithMarks.reduce((acc, s) => acc + s.marks, 0) / subjectsWithMarks.length)
            : 0;

        const bestSubj = [...subjectsWithMarks].sort((a, b) => (b.marks || 0) - (a.marks || 0))[0];

        return {
            avgScore,
            bestSubj,
            trackedCount: subjectsWithMarks.length
        };
    }, [currentSem]);

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
                        {/* CIE Top Stats */}
                        <div className="marks-stats-grid">
                            <div className="marks-stat-card">
                                <div className="marks-stat-icon cyan">
                                    <Award size={24} />
                                </div>
                                <div className="marks-stat-info">
                                    <span className="marks-stat-label">Average Internal Score</span>
                                    <span className="marks-stat-value">{cieMetrics.avgScore} <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>/ 50</span></span>
                                </div>
                            </div>

                            <div className="marks-stat-card">
                                <div className="marks-stat-icon green">
                                    <TrendingUp size={24} />
                                </div>
                                <div className="marks-stat-info">
                                    <span className="marks-stat-label">Highest CIE Score</span>
                                    <span className="marks-stat-value">
                                        {cieMetrics.bestSubj ? `${cieMetrics.bestSubj.marks} / 50` : '—'}
                                    </span>
                                </div>
                            </div>

                            <div className="marks-stat-card">
                                <div className="marks-stat-icon purple">
                                    <BookOpen size={24} />
                                </div>
                                <div className="marks-stat-info">
                                    <span className="marks-stat-label">Subjects Tracked</span>
                                    <span className="marks-stat-value">{currentSem.length}</span>
                                </div>
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

                                    return (
                                        <div
                                            key={subj.code}
                                            className="cie-card"
                                            onClick={() => onSelectSubject?.(subj)}
                                        >
                                            <div className="cie-card-top">
                                                <div>
                                                    <span className="cie-subj-code">{subj.code}</span>
                                                    <h4 className="cie-subj-name">{subj.name}</h4>
                                                </div>
                                                <div className="cie-score-badge">
                                                    <div className="cie-score-main">
                                                        {typeof subj.marks === 'number' ? subj.marks : '—'}
                                                    </div>
                                                    <div className="cie-score-max">out of 50</div>
                                                </div>
                                            </div>

                                            {/* Assessments Grid */}
                                            <div className="cie-assessments-grid">
                                                <div className="cie-ass-item">
                                                    <span className="cie-ass-name">Test 1</span>
                                                    <span className="cie-ass-score t1">
                                                        {t1?.obtained_marks ?? '—'}
                                                    </span>
                                                    <span className="cie-ass-max">/ {t1?.max_marks || 30}</span>
                                                </div>
                                                <div className="cie-ass-item">
                                                    <span className="cie-ass-name">Test 2</span>
                                                    <span className="cie-ass-score t2">
                                                        {t2?.obtained_marks ?? '—'}
                                                    </span>
                                                    <span className="cie-ass-max">/ {t2?.max_marks || 30}</span>
                                                </div>
                                                <div className="cie-ass-item">
                                                    <span className="cie-ass-name">Quiz 1</span>
                                                    <span className="cie-ass-score aq1">
                                                        {aq1?.obtained_marks ?? '—'}
                                                    </span>
                                                    <span className="cie-ass-max">/ {aq1?.max_marks || 10}</span>
                                                </div>
                                                <div className="cie-ass-item">
                                                    <span className="cie-ass-name">Quiz 2</span>
                                                    <span className="cie-ass-score aq2">
                                                        {aq2?.obtained_marks ?? '—'}
                                                    </span>
                                                    <span className="cie-ass-max">/ {aq2?.max_marks || 10}</span>
                                                </div>
                                            </div>

                                            {/* Class Average Info */}
                                            {(t1?.class_average || t2?.class_average) && (
                                                <div className="cie-avg-comparison">
                                                    <div className="cie-avg-labels">
                                                        <span>Class Test Avg</span>
                                                        <strong>
                                                            {Math.round(((t1?.class_average || 0) + (t2?.class_average || 0)) / (t1 && t2 ? 2 : 1))} / 30
                                                        </strong>
                                                    </div>
                                                </div>
                                            )}

                                            <button
                                                type="button"
                                                className="att-details-btn"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onSelectSubject?.(subj);
                                                }}
                                            >
                                                <BarChart2 size={13} />
                                                <span>View Performance Details</span>
                                                <ChevronRight size={13} />
                                            </button>
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
                                    <span className="marks-stat-label">Latest Semester SGPA</span>
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
                                {/* Mobile Semester Selector Dropdown */}
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

                                {/* Desktop Semester Chips */}
                                <div className="see-sem-selector hide-on-mobile">
                                    {reversedHistory.map((sem: any, idx: number) => {
                                        const semNum = isLateralEntry ? (examHistory.length - idx + 2) : (examHistory.length - idx);
                                        return (
                                            <button
                                                key={sem.semester || idx}
                                                type="button"
                                                className={`see-sem-chip ${selectedHistoryIdx === idx ? 'active' : ''}`}
                                                onClick={() => setSelectedHistoryIdx(idx)}
                                            >
                                                Semester {semNum} • {sem.sgpa} SGPA
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Semester Results Grid */}
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
                                                            <th>Code</th>
                                                            <th>Course</th>
                                                            <th style={{ textAlign: 'right' }}>Grade</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {sem.courses?.map((c: any, i: number) => (
                                                            <tr key={c.code || c.name || i}>
                                                                <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{c.code}</td>
                                                                <td style={{ fontSize: '13px' }}>{c.name}</td>
                                                                <td style={{ textAlign: 'right', fontWeight: 'bold', color: GRADE_COLORS[c.grade] || 'var(--text-primary)' }}>
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
