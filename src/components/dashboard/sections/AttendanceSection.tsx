"use client";

import React, { useState } from "react";
import { Calculator, Calendar, CalendarClock } from "lucide-react";
import {
    RadialBarChart,
    RadialBar,
    PolarAngleAxis,
    Tooltip,
    ResponsiveContainer
} from "recharts";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import "@/styles/Attendance.css";

interface AttendanceSectionProps {
    studentName?: string;
    currentSem: any[];
    overallAttendance: number;
    onSelectSubject?: (subject: any) => void;
}

const CHART_COLORS = [
    'var(--accent-primary)', '#6366F1', '#10b981', '#f59e0b', '#ef4444',
    '#ec4899', '#3b82f6', '#14b8a6',
];

const AttendanceTooltip = ({ active, payload }: any) => {
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
                    <span className="tooltip-label">Attendance</span>
                    <span className="tooltip-value" style={{ color: data.fill || 'var(--accent-primary)' }}>{data.attendance}%</span>
                </div>
            </div>
        );
    }
    return null;
};

const AttendanceSection: React.FC<AttendanceSectionProps> = ({
    studentName,
    currentSem = [],
    onSelectSubject
}) => {
    // Target ranges: 60, 65, 70, 75, 80, 85
    const [targetPct, setTargetPct] = useState<number>(75);

    const hasAttendanceData = currentSem.length > 0 && currentSem.some((s: any) =>
        (s.attendance && s.attendance > 0) ||
        (s.attendance_details?.present && s.attendance_details.present > 0) ||
        (s.attendance_details?.absent && s.attendance_details.absent > 0)
    );

    const getStatusType = (pct: number): "safe" | "warning" | "danger" => {
        if (pct >= 85) return "safe";
        if (pct >= 75) return "warning";
        return "danger";
    };

    return (
        <div className="tab-content">
            <DashboardHeader
                name={studentName}
                sectionTitle="Attendance Tracker"
                sectionSubtitle="Subject-wise attendance breakdown, distribution chart and absence planning"
            />

            <div className="attendance-container">
                {/* 1. Attendance Overview Radial Distribution Chart */}
                <div className="chart-card">
                    <div className="chart-header">
                        <h3 className="chart-title">Attendance Overview</h3>
                        <p className="chart-subtitle">Subject-wise attendance distribution</p>
                    </div>
                    <div className="chart-body attendance-chart-body">
                        {hasAttendanceData ? (
                            <>
                                <div className="chart-container">
                                    <ResponsiveContainer width="100%" height={380}>
                                        <RadialBarChart
                                            cx="50%"
                                            cy="50%"
                                            innerRadius="25%"
                                            outerRadius="100%"
                                            barSize={12}
                                            data={currentSem.map((s: any, i: number) => ({
                                                ...s,
                                                attendance: Math.round(Number(s.attendance) || 0),
                                                fill: CHART_COLORS[i % CHART_COLORS.length]
                                            }))}
                                            startAngle={90}
                                            endAngle={-270}
                                        >
                                            <PolarAngleAxis
                                                type="number"
                                                domain={[0, 100]}
                                                angleAxisId={0}
                                                tick={false}
                                            />
                                            <RadialBar
                                                background={{ fill: 'var(--bg-primary)' }}
                                                dataKey="attendance"
                                                cornerRadius={20}
                                                angleAxisId={0}
                                                onClick={(d: any) => onSelectSubject?.(d.payload)}
                                            />
                                            <Tooltip content={<AttendanceTooltip />} cursor={{ fill: 'var(--bg-primary)' }} />
                                        </RadialBarChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="chart-legend-custom">
                                    {currentSem.map((s: any, i: number) => (
                                        <button
                                            type="button"
                                            key={s.code || s.name || i}
                                            className="legend-item-custom"
                                            onClick={() => onSelectSubject?.(s)}
                                        >
                                            <div
                                                className="legend-dot-custom"
                                                style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                                            />
                                            <span className="legend-label-custom">{s.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="dashboard-empty-state">
                                <div className="empty-state-icon-wrap">
                                    <CalendarClock size={26} />
                                </div>
                                <h4 className="empty-state-title">Attendance Not Yet Recorded</h4>
                                <p className="empty-state-desc">
                                    Daily attendance will appear here once classes begin.
                                </p>
                                {currentSem.length > 0 && (
                                    <div className="empty-state-chips">
                                        {currentSem.map((s: any, idx: number) => (
                                            <button
                                                type="button"
                                                key={s.code || s.name || idx}
                                                className="empty-state-chip"
                                                onClick={() => onSelectSubject?.(s)}
                                                title="Click for details"
                                            >
                                                <span className="empty-state-chip-dot" />
                                                <span>{s.name || s.code}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* 2. Target Selection Ranges */}
                <div className="att-calculator-card">
                    <div className="att-calc-title">
                        <Calculator size={18} style={{ color: "var(--accent-primary)" }} />
                        <span>Attendance Target Simulator</span>
                    </div>

                    <div className="att-threshold-selector">
                        <span style={{ fontSize: "11px", color: "var(--text-muted)", marginRight: "4px", textTransform: "uppercase", fontWeight: 600 }}>
                            Target:
                        </span>
                        {[60, 65, 70, 75, 80, 85].map(pct => (
                            <button
                                key={pct}
                                type="button"
                                className={`att-threshold-btn ${targetPct === pct ? "active" : ""}`}
                                onClick={() => setTargetPct(pct)}
                            >
                                {pct}%
                            </button>
                        ))}
                    </div>
                </div>

                {/* 3. Subject-wise Attendance Table */}
                <div className="att-table-card">
                    <div className="att-table-header">
                        <div className="att-table-title">Subject-wise Attendance</div>
                        <span className="att-table-count">{currentSem.length} Subjects Registered</span>
                    </div>

                    {currentSem.length === 0 ? (
                        <div className="dashboard-empty-state">
                            <Calendar size={32} />
                            <h3>No Subject Attendance Available</h3>
                            <p>Attendance records will appear once synced with the college portal.</p>
                        </div>
                    ) : (
                        <div className="att-table-responsive">
                            <table className="att-table">
                                <thead>
                                    <tr>
                                        <th className="att-col-subject">Subject</th>
                                        <th className="att-col-attendance">Attendance</th>
                                        <th className="att-col-margin">Can Miss</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {currentSem.map((subj) => {
                                        const att = subj.attendance_details || {};
                                        const presentDates: string[] = att.present_dates || [];
                                        const absentDates: string[] = att.absent_dates || [];
                                        const present = att.present ?? presentDates.length;
                                        const absent = att.absent ?? absentDates.length;
                                        const remaining = att.remaining ?? 0;
                                        const total = present + absent;

                                        // Strict check: if no classes conducted yet, attendance is not updated
                                        const hasAttendanceUpdated = total > 0;

                                        const pct = subj.attendance ?? (total > 0 ? Math.round((present / total) * 100) : 0);
                                        const status = getStatusType(pct);

                                        // Margin calculation only when attendance has been updated
                                        const T = targetPct / 100;
                                        const totalSubjClasses = present + absent + remaining;
                                        const canMiss = totalSubjClasses > 0
                                            ? Math.floor(present + remaining - T * totalSubjClasses)
                                            : 0;

                                        return (
                                            <tr
                                                key={subj.code}
                                                onClick={() => onSelectSubject?.(subj)}
                                                title={`Click to view ${subj.name} details`}
                                            >
                                                {/* Column 1: Subject Name & Code */}
                                                <td className="att-cell-subject">
                                                    <div className="att-subject-cell">
                                                        <span className="att-table-subj-name">{subj.name}</span>
                                                        <span className="att-table-subj-code">{subj.code}</span>
                                                    </div>
                                                </td>

                                                {/* Column 2: Attendance Percent only */}
                                                <td className="att-cell-attendance">
                                                    {hasAttendanceUpdated ? (
                                                        <span className={`att-badge ${status}`}>
                                                            {pct}%
                                                        </span>
                                                    ) : (
                                                        <span className="att-empty-cell">—</span>
                                                    )}
                                                </td>

                                                {/* Column 3: Can Miss (Right aligned) */}
                                                <td className="att-cell-margin">
                                                    {hasAttendanceUpdated ? (
                                                        <span
                                                            className={`att-margin-pill ${canMiss > 0 ? "can-miss" : canMiss === 0 ? "on-track" : "must-attend"}`}
                                                            title={canMiss >= 0 ? `Can safely miss ${canMiss} classes at ${targetPct}%` : `Cannot reach ${targetPct}% even with 100% future attendance`}
                                                        >
                                                            {canMiss > 0 ? `+${canMiss}` : canMiss === 0 ? "0" : "Not possible"}
                                                        </span>
                                                    ) : (
                                                        <span className="att-empty-cell">—</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default React.memo(AttendanceSection);
