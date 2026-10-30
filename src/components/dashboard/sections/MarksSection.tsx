"use client";

import React, { useState, useMemo } from "react";
import {
    Award, TrendingUp, BookOpen, Layers, BarChart2,
    Calendar, CheckCircle, ChevronRight, ChevronDown, FileText, Sparkles,
    SlidersHorizontal
} from "lucide-react";
import {
    Tooltip, ResponsiveContainer,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList, ReferenceDot
} from "recharts";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import "@/styles/Marks.css";

/**
 * Metric types that can be selected in the graph dropdown
 */
export type MetricType = 'total' | 'T1' | 'T2' | 'T3' | 'AQ1' | 'AQ2' | 'AQ3';

export interface MetricOption {
    value: MetricType;
    label: string;
    shortLabel: string;
    maxMarks: number;
}

export const METRIC_OPTIONS: MetricOption[] = [
    { value: 'total', label: 'Total (50 Marks)', shortLabel: 'Total CIE', maxMarks: 50 },
    { value: 'T1', label: 'Internal Test 1 (T1 - 30 Marks)', shortLabel: 'Test 1', maxMarks: 30 },
    { value: 'T2', label: 'Internal Test 2 (T2 - 30 Marks)', shortLabel: 'Test 2', maxMarks: 30 },
    { value: 'T3', label: 'Internal Test 3 (T3 - 30 Marks)', shortLabel: 'Test 3', maxMarks: 30 },
    { value: 'AQ1', label: 'Activity / Quiz 1 (AQ1 - 10 Marks)', shortLabel: 'A/Q 1', maxMarks: 10 },
    { value: 'AQ2', label: 'Activity / Quiz 2 (AQ2 - 10 Marks)', shortLabel: 'A/Q 2', maxMarks: 10 },
    { value: 'AQ3', label: 'Activity / Quiz 3 (AQ3 - 10 Marks)', shortLabel: 'A/Q 3', maxMarks: 10 },
];

/**
 * Extracts student score and class average for a specific assessment metric.
 */
export const getMetricData = (subj: any, metric: MetricType) => {
    const getScore = (type: string) => subj.assessments?.find((a: any) => a.type === type);
    const t1 = getScore('T1');
    const t2 = getScore('T2');
    const t3 = getScore('T3');
    const aq1 = getScore('AQ1');
    const aq2 = getScore('AQ2');
    const aq3 = getScore('AQ3');

    if (metric === 'total') {
        const valT1 = (t1 && typeof t1.obtained_marks === 'number' && t1.obtained_marks > 0) ? t1.obtained_marks : 0;
        const valT2 = (t2 && typeof t2.obtained_marks === 'number' && t2.obtained_marks > 0) ? t2.obtained_marks : 0;
        const valT3 = (t3 && typeof t3.obtained_marks === 'number' && t3.obtained_marks > 0) ? t3.obtained_marks : 0;
        const valAq1 = (aq1 && typeof aq1.obtained_marks === 'number' && aq1.obtained_marks > 0) ? aq1.obtained_marks : 0;
        const valAq2 = (aq2 && typeof aq2.obtained_marks === 'number' && aq2.obtained_marks > 0) ? aq2.obtained_marks : 0;

        const validTests = [valT1, valT2, valT3].filter(v => v > 0);
        let marks: number | null = null;
        if (validTests.length > 0) {
            let testAvg = 0;
            if (validTests.length === 3) {
                testAvg = Math.round((valT1 + valT2 + valT3) / 3);
            } else if (validTests.length === 2) {
                testAvg = Math.round((validTests[0] + validTests[1]) / 2);
            } else {
                testAvg = validTests[0];
            }
            marks = Math.min(50, Math.round(testAvg + valAq1 + valAq2));
        } else if (typeof subj.marks === 'number' && subj.marks > 0) {
            marks = Math.round(subj.marks);
        }

        // Calculate Total Class Average (out of 50):
        const valT1Class = (t1 && typeof t1.class_average === 'number' && t1.class_average > 0) ? t1.class_average : 0;
        const valT2Class = (t2 && typeof t2.class_average === 'number' && t2.class_average > 0) ? t2.class_average : 0;
        const valT3Class = (t3 && typeof t3.class_average === 'number' && t3.class_average > 0) ? t3.class_average : 0;
        const valAq1Class = (aq1 && typeof aq1.class_average === 'number' && aq1.class_average > 0) ? aq1.class_average : 0;
        const valAq2Class = (aq2 && typeof aq2.class_average === 'number' && aq2.class_average > 0) ? aq2.class_average : 0;

        const validClassAvgs = [valT1Class, valT2Class, valT3Class].filter(v => v > 0);
        let classAvg: number | null = null;
        if (validClassAvgs.length > 0) {
            let testClassComponent = 0;
            if (validClassAvgs.length === 3) {
                testClassComponent = (validClassAvgs[0] + validClassAvgs[1] + validClassAvgs[2]) / 3;
            } else if (validClassAvgs.length === 2) {
                testClassComponent = (validClassAvgs[0] + validClassAvgs[1]) / 2;
            } else {
                testClassComponent = validClassAvgs[0];
            }
            classAvg = Math.min(50, Math.round((testClassComponent + valAq1Class + valAq2Class) * 10) / 10);
        } else if (typeof subj.class_average === 'number' && subj.class_average > 0) {
            classAvg = Math.round(subj.class_average * 10) / 10;
        }

        return {
            marks,
            classAvg,
            maxMarks: 50,
            hasScore: marks !== null
        };
    }

    const targetAssessment = metric === 'T1' ? t1
        : metric === 'T2' ? t2
        : metric === 'T3' ? t3
        : metric === 'AQ1' ? aq1
        : metric === 'AQ2' ? aq2
        : aq3;

    const defaultMax = metric.startsWith('T') ? 30 : 10;
    const maxMarks = targetAssessment?.max_marks || defaultMax;

    let marks: number | null = null;
    if (targetAssessment && typeof targetAssessment.obtained_marks === 'number') {
        marks = targetAssessment.obtained_marks;
    }

    let classAvg: number | null = null;
    if (targetAssessment && typeof targetAssessment.class_average === 'number' && targetAssessment.class_average > 0) {
        classAvg = Math.round(targetAssessment.class_average * 10) / 10;
    }

    return {
        marks,
        classAvg,
        maxMarks,
        hasScore: marks !== null
    };
};

/**
 * Extracts acronym / short form from a subject name.
 * Example: "Human Resource Management" -> "HRM"
 *          "Distributed Computing" -> "DC"
 */
export const getSubjectShortName = (name?: string, fallbackCode?: string): string => {
    if (!name || typeof name !== 'string' || !name.trim()) {
        return fallbackCode || '';
    }
    const cleaned = name.replace(/[()[\]{}:;&/\\,-]/g, ' ').trim();
    const words = cleaned.split(/\s+/).filter(Boolean);
    const stopWords = new Set(['and', 'of', 'in', 'to', 'for', 'the', 'a', 'an', 'on', 'with']);
    const filteredWords = words.length > 1 ? words.filter(w => !stopWords.has(w.toLowerCase())) : words;
    const targetWords = filteredWords.length > 0 ? filteredWords : words;
    const acronym = targetWords.map(w => w[0]?.toUpperCase() || '').join('');
    return acronym || fallbackCode || '';
};

const MarksTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        const marks = typeof data.rawMarks === 'number' ? data.rawMarks : data.marks;
        const maxMarks = data.maxMarks || 50;
        const hasScore = data.hasScore && typeof marks === 'number';
        const classAvg = typeof data.classAvg === 'number' ? data.classAvg : null;

        return (
            <div className="custom-chart-tooltip" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', minWidth: '195px' }}>
                <p className="tooltip-title">{data.name}</p>
                <div className="tooltip-divider"></div>
                <div className="tooltip-row">
                    <span className="tooltip-label">Code</span>
                    <span className="tooltip-value">{data.code}</span>
                </div>
                {data.shortName && (
                    <div className="tooltip-row">
                        <span className="tooltip-label">Short Name</span>
                        <span className="tooltip-value" style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>{data.shortName}</span>
                    </div>
                )}
                {data.metricLabel && (
                    <div className="tooltip-row">
                        <span className="tooltip-label">Assessment</span>
                        <span className="tooltip-value" style={{ color: 'var(--text-secondary)' }}>{data.metricLabel}</span>
                    </div>
                )}
                <div className="tooltip-row">
                    <span className="tooltip-label">Your Score</span>
                    <span className="tooltip-value" style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>
                        {hasScore ? `${marks} / ${maxMarks}` : '— (Not Recorded)'}
                    </span>
                </div>
                {classAvg !== null && (
                    <div className="tooltip-row">
                        <span className="tooltip-label">Class Average</span>
                        <span className="tooltip-value" style={{ color: '#f59e0b', fontWeight: 700 }}>{classAvg} / {maxMarks}</span>
                    </div>
                )}
            </div>
        );
    }
    return null;
};

const renderCIEBarLabel = (props: any) => {
    const { x, y, width, value } = props;
    if (typeof value !== 'number' || isNaN(value) || value <= 0) return null;
    return (
        <text 
            x={Number(x) + Number(width) / 2} 
            y={Number(y) - 8} 
            fill="var(--text-primary, #F8FAFC)" 
            textAnchor="middle" 
            fontSize="11" 
            fontWeight="700"
            className="cie-chart-bar-label"
        >
            {value}
        </text>
    );
};

const CIEBarChart = React.memo(({ 
    data, 
    maxMarks = 50,
    metric = 'total',
    onSelectSubject 
}: { 
    data: any[]; 
    maxMarks?: number;
    metric?: string;
    onSelectSubject?: (subj: any) => void 
}) => {
    const yDomain: [number, number] = maxMarks === 10 ? [0, 12] : maxMarks === 30 ? [0, 35] : [0, 55];
    const yTicks = maxMarks === 10 ? [0, 2, 4, 6, 8, 10] : maxMarks === 30 ? [0, 10, 20, 30] : [0, 10, 20, 30, 40, 50];

    return (
        <ResponsiveContainer width="100%" height={380}>
            <BarChart data={data} margin={{ top: 28, right: 28, left: -15, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
                <XAxis 
                    dataKey="shortName" 
                    stroke="var(--text-muted)" 
                    style={{ fontSize: '11px', fontWeight: 700 }} 
                    axisLine={false} 
                    tickLine={false} 
                    interval={0}
                />
                <YAxis 
                    domain={yDomain} 
                    ticks={yTicks} 
                    stroke="var(--text-muted)" 
                    style={{ fontSize: '12px' }} 
                    axisLine={false} 
                    tickLine={false} 
                />
                <Tooltip content={<MarksTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                <Bar 
                    dataKey="marks" 
                    radius={[6, 6, 0, 0]} 
                    barSize={24} 
                    fill="var(--accent-primary, #00ADB5)"
                    isAnimationActive={false}
                    onClick={(entry: any) => entry && onSelectSubject?.(entry.payload)}
                    style={{ cursor: 'pointer' }}
                >
                    <LabelList 
                        dataKey="marks" 
                        position="top" 
                        content={renderCIEBarLabel}
                    />
                </Bar>

                {/* Class Average Horizontal Benchmark Lines & Value Labels */}
                {data.map((item, idx) => {
                    if (typeof item.classAvg !== 'number' || isNaN(item.classAvg) || item.classAvg <= 0) {
                        return null;
                    }
                    return (
                        <ReferenceDot
                            key={`avg-dot-${item.code || item.shortName || idx}`}
                            x={item.shortName}
                            y={item.classAvg}
                            ifOverflow="visible"
                            shape={(dotProps: any) => {
                                const cx = dotProps.cx;
                                const cy = dotProps.cy;
                                if (typeof cx !== 'number' || typeof cy !== 'number' || isNaN(cx) || isNaN(cy)) {
                                    return <g />;
                                }
                                const lineWidth = 34;
                                return (
                                    <g className="cie-chart-avg-marker" key={`avg-${item.shortName}`}>
                                        {/* Background contrast shadow */}
                                        <line
                                            x1={cx - lineWidth / 2}
                                            y1={cy}
                                            x2={cx + lineWidth / 2}
                                            y2={cy}
                                            stroke="rgba(0, 0, 0, 0.65)"
                                            strokeWidth={5}
                                            strokeLinecap="round"
                                        />
                                        {/* Horizontal class average line */}
                                        <line
                                            x1={cx - lineWidth / 2}
                                            y1={cy}
                                            x2={cx + lineWidth / 2}
                                            y2={cy}
                                            stroke="#f59e0b"
                                            strokeWidth={2.5}
                                            strokeLinecap="round"
                                        />
                                        {/* Central indicator dot */}
                                        <circle
                                            cx={cx}
                                            cy={cy}
                                            r={2.5}
                                            fill="#ffffff"
                                            stroke="#f59e0b"
                                            strokeWidth={1.5}
                                        />
                                        {/* Class average number */}
                                        <text
                                            x={cx + lineWidth / 2 + 4}
                                            y={cy + 3.5}
                                            fill="#f59e0b"
                                            fontSize="10"
                                            fontWeight="800"
                                            textAnchor="start"
                                            className="cie-chart-avg-text"
                                        >
                                            {item.classAvg}
                                        </text>
                                    </g>
                                );
                            }}
                        />
                    );
                })}
            </BarChart>
        </ResponsiveContainer>
    );
});
CIEBarChart.displayName = "CIEBarChart";

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
    const [selectedMetric, setSelectedMetric] = useState<MetricType>('total');
    const [selectedHistoryIdx, setSelectedHistoryIdx] = useState<number>(0);
    const [expandedSubject, setExpandedSubject] = useState<string | null>(null);

    const toggleAccordion = (code: string) => {
        setExpandedSubject(prev => prev === code ? null : code);
    };

    // Reversed history (most recent first)
    const reversedHistory = useMemo(() => [...examHistory].reverse(), [examHistory]);

    // Check if any subject has AQ3
    const hasAq3 = useMemo(() => {
        return currentSem.some((s: any) => s.assessments?.some((a: any) => a.type === 'AQ3'));
    }, [currentSem]);

    // Filter available metric options
    const availableMetricOptions = useMemo(() => {
        return METRIC_OPTIONS.filter(opt => opt.value !== 'AQ3' || hasAq3);
    }, [hasAq3]);

    const currentOption = useMemo(() => {
        return availableMetricOptions.find(o => o.value === selectedMetric) || availableMetricOptions[0];
    }, [availableMetricOptions, selectedMetric]);

    // Compute dynamic CIE chart data based on selected metric (Total, T1, T2, T3, AQ1, AQ2, AQ3)
    const cieChartData = useMemo(() => {
        return currentSem.map((subj) => {
            const { marks, classAvg, maxMarks, hasScore } = getMetricData(subj, selectedMetric);
            const shortName = getSubjectShortName(subj.name, subj.code);

            return {
                ...subj,
                shortName,
                marks: hasScore && marks !== null ? marks : 0,
                rawMarks: marks,
                classAvg,
                maxMarks,
                hasScore,
                metricLabel: currentOption.label
            };
        });
    }, [currentSem, selectedMetric, currentOption]);

    const hasMarksData = currentSem.length > 0 && currentSem.some((s: any) => 
        (typeof s.marks === 'number' && s.marks > 0) || 
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
                            <div className="marks-chart-header">
                                <div className="marks-chart-header-left">
                                    <h3 className="chart-title">
                                        {selectedMetric === 'total' 
                                            ? 'Internal Marks (CIE)' 
                                            : `${currentOption.shortLabel} Scores`}
                                    </h3>
                                    <p className="chart-subtitle">
                                        {selectedMetric === 'total'
                                            ? 'Subject-wise total CIE scores out of 50 vs class average benchmark'
                                            : `Subject-wise scores out of ${currentOption.maxMarks} vs class average benchmark`}
                                    </p>
                                </div>

                                <div className="marks-chart-controls">
                                    {/* Visual Chart Legend */}
                                    <div className="marks-chart-legend">
                                        <div className="marks-legend-pill score">
                                            <span className="legend-indicator-bar" />
                                            <span>Your Score</span>
                                        </div>
                                        <div className="marks-legend-pill avg">
                                            <span className="legend-indicator-line" />
                                            <span>Class Avg</span>
                                        </div>
                                    </div>

                                    {/* Assessment Selector Dropdown */}
                                    <div className="marks-metric-select-wrap">
                                        <SlidersHorizontal size={13} className="marks-select-icon" />
                                        <select
                                            id="cie-metric-select"
                                            value={selectedMetric}
                                            onChange={(e) => setSelectedMetric(e.target.value as MetricType)}
                                            className="marks-metric-select"
                                            aria-label="Select CIE Assessment"
                                        >
                                            {availableMetricOptions.map((opt) => (
                                                <option key={opt.value} value={opt.value}>
                                                    {opt.label}
                                                </option>
                                            ))}
                                        </select>
                                        <ChevronDown size={14} className="marks-select-chevron" />
                                    </div>
                                </div>
                            </div>
                            <div className="chart-body marks-chart-body">
                                {hasMarksData ? (
                                    <CIEBarChart 
                                        data={cieChartData} 
                                        maxMarks={currentOption.maxMarks}
                                        metric={selectedMetric}
                                        onSelectSubject={onSelectSubject} 
                                    />
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

                        {/* Subject CIE Accordion List */}
                        {currentSem.length === 0 ? (
                            <div className="dashboard-empty-state">
                                <Award size={32} />
                                <h3>No CIE Data Available</h3>
                                <p>Internal marks will appear once published by faculty on the portal.</p>
                            </div>
                        ) : (
                            <div className="cie-accordion-list">
                                {currentSem.map((subj) => {
                                    const getScore = (type: string) => subj.assessments?.find((a: any) => a.type === type);
                                    const t1 = getScore('T1');
                                    const t2 = getScore('T2');
                                    const t3 = getScore('T3');
                                    const aq1 = getScore('AQ1');
                                    const aq2 = getScore('AQ2');
                                    const aq3 = getScore('AQ3');

                                    // 1. Calculate Normal Total Marks (Student's CIE score out of 50):
                                    const valT1 = (t1 && typeof t1.obtained_marks === 'number' && t1.obtained_marks > 0) ? t1.obtained_marks : 0;
                                    const valT2 = (t2 && typeof t2.obtained_marks === 'number' && t2.obtained_marks > 0) ? t2.obtained_marks : 0;
                                    const valT3 = (t3 && typeof t3.obtained_marks === 'number' && t3.obtained_marks > 0) ? t3.obtained_marks : 0;
                                    const valAq1 = (aq1 && typeof aq1.obtained_marks === 'number' && aq1.obtained_marks > 0) ? aq1.obtained_marks : 0;
                                    const valAq2 = (aq2 && typeof aq2.obtained_marks === 'number' && aq2.obtained_marks > 0) ? aq2.obtained_marks : 0;

                                    const validTests = [valT1, valT2, valT3].filter(v => v > 0);
                                    let normalMarks: number | null = null;

                                    if (validTests.length > 0) {
                                        let testAvg = 0;
                                        if (validTests.length === 3) {
                                            testAvg = Math.round((valT1 + valT2 + valT3) / 3);
                                        } else if (validTests.length === 2) {
                                            testAvg = Math.round((validTests[0] + validTests[1]) / 2);
                                        } else {
                                            testAvg = validTests[0]; // If 1 test uploaded, directly take that marks
                                        }
                                        normalMarks = Math.min(50, Math.round(testAvg + valAq1 + valAq2));
                                    } else if (typeof subj.marks === 'number' && subj.marks > 0) {
                                        normalMarks = Math.round(subj.marks);
                                    }

                                    // 2. Calculate Total Class Average (out of 50):
                                    const valT1Class = (t1 && typeof t1.class_average === 'number' && t1.class_average > 0) ? t1.class_average : 0;
                                    const valT2Class = (t2 && typeof t2.class_average === 'number' && t2.class_average > 0) ? t2.class_average : 0;
                                    const valT3Class = (t3 && typeof t3.class_average === 'number' && t3.class_average > 0) ? t3.class_average : 0;
                                    const valAq1Class = (aq1 && typeof aq1.class_average === 'number' && aq1.class_average > 0) ? aq1.class_average : 0;
                                    const valAq2Class = (aq2 && typeof aq2.class_average === 'number' && aq2.class_average > 0) ? aq2.class_average : 0;

                                    const validClassAvgs = [valT1Class, valT2Class, valT3Class].filter(v => v > 0);
                                    let totalClassAvg: number | null = null;

                                    if (validClassAvgs.length > 0) {
                                        let testClassComponent = 0;
                                        if (validClassAvgs.length === 3) {
                                            testClassComponent = Math.round((validClassAvgs[0] + validClassAvgs[1] + validClassAvgs[2]) / 3);
                                        } else if (validClassAvgs.length === 2) {
                                            testClassComponent = Math.round((validClassAvgs[0] + validClassAvgs[1]) / 2);
                                        } else {
                                            testClassComponent = Math.round(validClassAvgs[0]);
                                        }
                                        totalClassAvg = Math.min(50, Math.round(testClassComponent + valAq1Class + valAq2Class));
                                    }

                                    const displayMarks = normalMarks !== null ? normalMarks : '—';
                                    const pct = typeof displayMarks === 'number' ? Math.min(100, Math.max(0, (displayMarks / 50) * 100)) : 0;
                                    const isExpanded = expandedSubject === subj.code;

                                    const internalTests = [
                                        { id: 'T1', title: 'Test 1', data: t1, max: t1?.max_marks || 30 },
                                        { id: 'T2', title: 'Test 2', data: t2, max: t2?.max_marks || 30 },
                                        { id: 'T3', title: 'Test 3', data: t3, max: t3?.max_marks || 30 },
                                    ];

                                    const internalAqs = [
                                        { id: 'AQ1', title: 'A/Q 1', data: aq1, max: aq1?.max_marks || 10 },
                                        { id: 'AQ2', title: 'A/Q 2', data: aq2, max: aq2?.max_marks || 10 },
                                        { id: 'AQ3', title: 'A/Q 3', data: aq3, max: aq3?.max_marks || 10 },
                                    ];

                                    return (
                                        <div
                                            key={subj.code}
                                            className={`cie-accordion-item ${isExpanded ? 'expanded' : ''}`}
                                        >
                                            {/* Collapsed Header — always visible */}
                                            <div
                                                className="cie-accordion-header"
                                                onClick={() => toggleAccordion(subj.code)}
                                            >
                                                <div className="cie-acc-left">
                                                    <span className="cie-acc-code">{subj.code}</span>
                                                    <div className="cie-acc-name-wrap">
                                                        <span className="cie-acc-name">{subj.name}</span>
                                                        {displayMarks !== '—' && (
                                                            <div className="cie-acc-progress-row">
                                                                <div className="cie-acc-progress-track">
                                                                    <div 
                                                                        className="cie-acc-progress-fill" 
                                                                        style={{ width: `${pct}%`, backgroundColor: 'var(--accent-primary, #00ADB5)' }} 
                                                                    />
                                                                </div>
                                                                <span className="cie-acc-pct">{Math.round(pct)}%</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="cie-acc-right">
                                                    <div className="cie-acc-marks">
                                                        <span className="cie-acc-marks-val">
                                                            {displayMarks}
                                                        </span>
                                                        <span className="cie-acc-marks-max">/50</span>
                                                    </div>
                                                    <ChevronDown size={14} className={`cie-acc-chevron ${isExpanded ? 'rotated' : ''}`} />
                                                </div>
                                            </div>

                                            {/* Expanded Panel — revealed on click / hover */}
                                            <div className="cie-accordion-panel">
                                                <div className="cie-expanded-inner">
                                                    {/* Section 1: 3 Internal Tests */}
                                                    <div className="cie-group-block">
                                                        <div className="cie-group-header">
                                                            <FileText size={13} className="cie-group-icon" />
                                                            <span className="cie-group-title">Internal Tests (3 CIEs)</span>
                                                            <span className="cie-group-subtitle">Out of 30</span>
                                                        </div>
                                                        <div className="cie-cards-grid cie-tests-grid">
                                                            {internalTests.map((test) => {
                                                                const hasScore = test.data && typeof test.data.obtained_marks === 'number' && test.data.obtained_marks > 0;
                                                                const score = hasScore ? test.data.obtained_marks : null;
                                                                const testPct = hasScore ? Math.round((score! / test.max) * 100) : 0;
                                                                const hasAvg = test.data?.class_average && test.data.class_average > 0;
                                                                return (
                                                                    <div key={test.id} className={`cie-score-card ${hasScore ? 'has-data' : 'empty'}`}>
                                                                        <div className="cie-sc-top">
                                                                            <span className="cie-sc-tag">
                                                                                {test.title}
                                                                            </span>
                                                                            {hasScore ? (
                                                                                <span className="cie-sc-pct">
                                                                                    {testPct}%
                                                                                </span>
                                                                            ) : (
                                                                                <span className="cie-sc-status-muted">Upcoming</span>
                                                                            )}
                                                                        </div>
                                                                        <div className="cie-sc-body">
                                                                            <div className="cie-sc-score-row">
                                                                                <span className="cie-sc-score-val">{hasScore ? score : '—'}</span>
                                                                                <span className="cie-sc-score-max">/{test.max}</span>
                                                                            </div>
                                                                            <div className="cie-sc-meter">
                                                                                <div 
                                                                                    className="cie-sc-meter-fill" 
                                                                                    style={{ width: `${hasScore ? Math.min(100, testPct) : 0}%` }} 
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                        <div className="cie-sc-footer">
                                                                            {hasAvg ? (
                                                                                <span className="cie-sc-avg">Avg: <strong>{test.data.class_average}</strong></span>
                                                                            ) : (
                                                                                <span className="cie-sc-subtext">{hasScore ? 'Evaluated' : 'Not recorded'}</span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>

                                                    {/* Section 2: Quizzes & Activities (A/Q 1, 2, 3) */}
                                                    <div className="cie-group-block">
                                                        <div className="cie-group-header">
                                                            <Sparkles size={13} className="cie-group-icon" />
                                                            <span className="cie-group-title">Activities & Quizzes</span>
                                                            <span className="cie-group-subtitle">Out of 10</span>
                                                        </div>
                                                        <div className="cie-cards-grid cie-aqs-grid">
                                                            {internalAqs.map((aq) => {
                                                                const hasScore = aq.data && typeof aq.data.obtained_marks === 'number' && aq.data.obtained_marks > 0;
                                                                const score = hasScore ? aq.data.obtained_marks : null;
                                                                const aqPct = hasScore ? Math.round((score! / aq.max) * 100) : 0;
                                                                return (
                                                                    <div key={aq.id} className={`cie-score-card ${hasScore ? 'has-data' : 'empty'}`}>
                                                                        <div className="cie-sc-top">
                                                                            <span className="cie-sc-tag">
                                                                                {aq.title}
                                                                            </span>
                                                                            {hasScore ? (
                                                                                <span className="cie-sc-pct">
                                                                                    {aqPct}%
                                                                                </span>
                                                                            ) : (
                                                                                <span className="cie-sc-status-muted">Upcoming</span>
                                                                            )}
                                                                        </div>
                                                                        <div className="cie-sc-body">
                                                                            <div className="cie-sc-score-row">
                                                                                <span className="cie-sc-score-val">{hasScore ? score : '—'}</span>
                                                                                <span className="cie-sc-score-max">/{aq.max}</span>
                                                                            </div>
                                                                            <div className="cie-sc-meter">
                                                                                <div 
                                                                                    className="cie-sc-meter-fill" 
                                                                                    style={{ width: `${hasScore ? Math.min(100, aqPct) : 0}%` }} 
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                        <div className="cie-sc-footer">
                                                                            <span className="cie-sc-subtext">{hasScore ? 'Recorded' : 'Pending'}</span>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>

                                                    {/* Bottom Panel Actions & Total Class Average */}
                                                    <div className="cie-panel-footer">
                                                        <div className="cie-panel-avg">
                                                            <Sparkles size={13} />
                                                            <span>Total Class Avg: <strong>{totalClassAvg !== null ? `${totalClassAvg}/50` : '—/50'}</strong></span>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            className="cie-panel-action-btn"
                                                            onClick={(e) => { e.stopPropagation(); onSelectSubject?.(subj); }}
                                                        >
                                                            <BarChart2 size={13} />
                                                            <span>Full Subject Analytics</span>
                                                            <ChevronRight size={13} />
                                                        </button>
                                                    </div>
                                                </div>
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
