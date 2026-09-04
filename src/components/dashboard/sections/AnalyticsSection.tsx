"use client";

import React from "react";
import { 
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
    CartesianGrid, Legend, Cell, ComposedChart, Line 
} from "recharts";
import { TrendingUp, Calendar, Star, AlertTriangle, BarChart3, Award, Sparkles, CalendarClock } from "lucide-react";
import DashboardHeader from "@/components/dashboard/DashboardHeader";

interface AnalyticsSectionProps {
    studentName: string;
    internalComparisonData: any[];
    gradeChartData: any[];
    bestSubject: any;
    weakestSubject: any;
    overallAttendance: number;
    detailsBlob: any;
    latestSGPA: number;
    sgpaDiffValue: number;
    sgpaTrendData: any[];
}

const AnalyticsTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="custom-chart-tooltip" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
                {/* Subject Name as Title */}
                <p className="tooltip-title">{data.name || label}</p>
                <div className="tooltip-divider"></div>

                {/* Subject Code Row (if applicable) */}
                {data.code && (
                    <div className="tooltip-row">
                        <span className="tooltip-label">Code</span>
                        <span className="tooltip-value">{data.code}</span>
                    </div>
                )}

                {/* Score Rows */}
                {payload.map((item: any, index: number) => (
                    <div key={item.dataKey || item.name || `tooltip-row-${item.value}-${index}`} className="tooltip-row">
                        <span className="tooltip-label">{item.name}</span>
                        <span className="tooltip-value" style={{ color: item.color || item.fill }}>
                            {item.value} {item.name.toLowerCase().includes('score') || item.name.toLowerCase().includes('average') ? '/ 50' : ''}
                        </span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

const BenchmarkChart: React.FC<{ data: any[] }> = ({ data }) => {
    if (data.length > 0) {
        return (
            <ResponsiveContainer width="100%" height={400}>
                <BarChart data={data} margin={{ top: 20, right: 10, bottom: 40, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.25)" />
                    <XAxis dataKey="code" stroke="#64748b" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis domain={[0, 50]} stroke="#64748b" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={40} />
                    <Tooltip content={<AnalyticsTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                    <Legend verticalAlign="top" height={40} iconType="circle" />
                    <Bar dataKey="studentScore" name="Your Score" fill="var(--accent-primary)" radius={[4, 4, 0, 0]} barSize={24} />
                    <Bar dataKey="classAverage" name="Class Average" fill="var(--accent-primary)" opacity={0.5} radius={[4, 4, 0, 0]} barSize={24} />
                </BarChart>
            </ResponsiveContainer>
        );
    }
    return (
        <div className="dashboard-empty-state">
            <div className="empty-state-icon-wrap blue">
                <BarChart3 size={26} />
            </div>
            <h4 className="empty-state-title">No CIE Data Yet</h4>
            <p className="empty-state-desc">Class comparisons will appear once assessments are graded.</p>
        </div>
    );
};

const GradeDistributionChart: React.FC<{ data: any[] }> = ({ data }) => {
    if (data.length > 0) {
        return (
            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.25)" vertical={false} />
                    <XAxis dataKey="grade" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} width={40} />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: 'var(--bg-secondary)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: '12px',
                            color: '#ffffff',
                        }}
                        labelStyle={{ color: '#ffffff' }}
                        itemStyle={{ color: '#ffffff' }}
                        cursor={{ fill: 'var(--bg-primary)', opacity: 0.4 }}
                    />
                    <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                        {data.map((entry, index) => <Cell key={`grade-bar-${entry.grade || entry.name || entry.color || index}`} fill={entry.color} />)}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        );
    }
    return (
        <div className="dashboard-empty-state" style={{ minHeight: '220px' }}>
            <div className="empty-state-icon-wrap emerald">
                <Award size={24} />
            </div>
            <h4 className="empty-state-title">No Grades Available</h4>
            <p className="empty-state-desc">Letter grades will show after semester results.</p>
        </div>
    );
};

const SgpaTrajectoryChart: React.FC<{ data: any[] }> = ({ data }) => {
    if (data.length > 0) {
        return (
            <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={data} margin={{ top: 20, right: 0, bottom: 0, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.25)" vertical={false} />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis yAxisId="left" stroke="#64748b" fontSize={11} tickLine={false} width={40} />
                    <YAxis yAxisId="right" orientation="right" hide />
                    <Tooltip content={<AnalyticsTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                    <Legend verticalAlign="top" height={36} iconType="circle" />
                    <Bar yAxisId="left" dataKey="credits" fill="rgba(16, 185, 129, 0.3)" radius={[4, 4, 0, 0]} name="Credits" />
                    <Line yAxisId="right" type="monotone" dataKey="sgpa" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6' }} activeDot={{ r: 6 }} name="SGPA" />
                </ComposedChart>
            </ResponsiveContainer>
        );
    }
    return (
        <div className="dashboard-empty-state" style={{ minHeight: '220px' }}>
            <div className="empty-state-icon-wrap purple">
                <TrendingUp size={24} />
            </div>
            <h4 className="empty-state-title">No Trajectory Data</h4>
            <p className="empty-state-desc">Trend will appear after initial semester results.</p>
        </div>
    );
};

const InsightsGrid: React.FC<{
    latestSGPA: number;
    sgpaDiffValue: number;
    overallAttendance: number;
    bestSubject: any;
    weakestSubject: any;
}> = ({ latestSGPA, sgpaDiffValue, overallAttendance, bestSubject, weakestSubject }) => {
    const getAttendanceStatus = () => {
        if (overallAttendance === 0) return 'Tracking in progress.';
        if (overallAttendance >= 85) return 'Excellent attendance record.';
        if (overallAttendance >= 75) return 'Attendance is adequate.';
        return 'Attendance needs improvement.';
    };

    const getAttendanceColor = () => {
        if (overallAttendance === 0) return 'var(--accent-primary)';
        if (overallAttendance >= 75) return 'var(--success)';
        return 'var(--error)';
    };

    const formatSgpaDiff = () => {
        if (sgpaDiffValue === 0) return "";
        const formatted = sgpaDiffValue.toFixed(2);
        const sign = sgpaDiffValue > 0 ? `+${formatted}` : formatted;
        return ` (${sign}) vs previous.`;
    };

    return (
        <div className="insights-grid">
            <div className="insight-item">
                <TrendingUp className="insight-icon success" />
                <div>
                    <div className="insight-label">Academic Standing</div>
                    <div className="insight-value">
                        {latestSGPA > 0 ? (
                            <>Current SGPA: {latestSGPA}.{formatSgpaDiff()}</>
                        ) : (
                            "Results will appear after exams."
                        )}
                    </div>
                </div>
            </div>
            <div className="insight-item">
                <Calendar className="insight-icon" style={{ color: getAttendanceColor() }} />
                <div>
                    <div className="insight-label">Attendance Analysis</div>
                    <div className="insight-value">{getAttendanceStatus()}</div>
                </div>
            </div>
            {bestSubject && (
                <div className="insight-item">
                    <Star className="insight-icon" style={{ color: '#F59E0B' }} />
                    <div>
                        <div className="insight-label">Top Subject</div>
                        <div className="insight-value">{bestSubject.name} ({bestSubject.code}) — {bestSubject.marks}/50</div>
                    </div>
                </div>
            )}
            {weakestSubject && weakestSubject.code !== bestSubject?.code && (
                <div className="insight-item">
                    <AlertTriangle className="insight-icon" style={{ color: '#EF4444' }} />
                    <div>
                        <div className="insight-label">Needs Attention</div>
                        <div className="insight-value">{weakestSubject.name} ({weakestSubject.code}) — {weakestSubject.marks}/50</div>
                    </div>
                </div>
            )}
            {!bestSubject && !weakestSubject && (
                <div className="insight-item">
                    <Sparkles className="insight-icon" style={{ color: 'var(--accent-primary)' }} />
                    <div>
                        <div className="insight-label">Focus Area</div>
                        <div className="insight-value">Aim for 85%+ attendance and consistent CIE scores.</div>
                    </div>
                </div>
            )}
        </div>
    );
};

const AnalyticsSection: React.FC<AnalyticsSectionProps> = ({
    studentName,
    internalComparisonData,
    gradeChartData,
    bestSubject,
    weakestSubject,
    overallAttendance,
    latestSGPA,
    sgpaDiffValue,
    sgpaTrendData
}) => {
    return (
        <div className="tab-content">
            <DashboardHeader name={studentName} sectionTitle="Academic Analytics" sectionSubtitle="Deep insights into your academic journey" />
            
            <div className="charts-grid">
                <div className="chart-card wide-chart">
                    <div className="chart-header">
                        <div>
                            <h3 className="chart-title">Class Benchmark: CIE Scores</h3>
                            <p className="chart-subtitle">Combined score (Avg of T1 & T2 + Assessments) compared to class average</p>
                        </div>
                    </div>
                    <div className="chart-body">
                        <BenchmarkChart data={internalComparisonData} />
                    </div>
                </div>

                <div className="chart-card">
                    <div className="chart-header">
                        <h3 className="chart-title">Grade Distribution</h3>
                    </div>
                    <div className="chart-body">
                        <GradeDistributionChart data={gradeChartData} />
                    </div>
                </div>

                <div className="chart-card">
                    <div className="chart-header"><h3 className="chart-title">SGPA & Credits Trajectory</h3></div>
                    <div className="chart-body">
                        <SgpaTrajectoryChart data={sgpaTrendData} />
                    </div>
                </div>
            </div>

            <div className="chart-card wide-chart performance-insights-card" style={{ marginTop: '24px' }}>
                <div className="chart-header"><h3 className="chart-title">Performance Insights</h3></div>
                <InsightsGrid
                    latestSGPA={latestSGPA}
                    sgpaDiffValue={sgpaDiffValue}
                    overallAttendance={overallAttendance}
                    bestSubject={bestSubject}
                    weakestSubject={weakestSubject}
                />
            </div>
        </div>
    );
};

export default React.memo(AnalyticsSection);
