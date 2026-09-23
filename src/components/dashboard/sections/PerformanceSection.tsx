"use client";

import React from "react";
import { Award, BookOpen, Layers, TrendingUp } from "lucide-react";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import { UpdateButton } from "@/components/dashboard/UpdateButton";

interface PerformanceSectionProps {
    student: any;
    currentSem: any[];
    overallAttendance?: number;
    totalCredits: number;
    maxCredits: number;
    currentCgpa: string | null;
    onSelectSubject?: (subject: any) => void;
    handleUpdate: () => void;
    updateStatus: 'loading' | 'success' | 'error' | null;
    isCooldownActive: boolean;
    formatTime: string;
    examHistory: any[];
    latestSGPA: number;
    sgpaDiff: string;
    isImproved: boolean;
}

const PerformanceSection: React.FC<PerformanceSectionProps> = ({
    student,
    currentSem = [],
    totalCredits,
    maxCredits,
    currentCgpa,
    handleUpdate,
    updateStatus,
    isCooldownActive,
    formatTime,
    examHistory = [],
    latestSGPA,
    sgpaDiff,
    isImproved
}) => {
    return (
        <div className="tab-content">
            <DashboardHeader
                name={student?.name}
                sectionTitle="Current Semester Performance"
                sectionSubtitle="A detailed breakdown of your ongoing academic progress"
                actions={
                    <UpdateButton
                        onClick={handleUpdate}
                        isLoading={updateStatus === 'loading'}
                        cooldownActive={isCooldownActive}
                        formattedCooldown={formatTime}
                    />
                }
            />

            <div className="stats-grid">
                <div className="stat-card anim-left">
                    <div className="stat-header">
                        <span className="stat-label">Current CGPA</span>
                        <Award size={18} />
                    </div>
                    <div className="stat-value">{currentCgpa ?? "—"}{currentCgpa && <span className="stat-max">/10</span>}</div>
                    <p className="stat-footnote">Overall cumulative GPA</p>
                </div>
                <div className="stat-card anim-left">
                    <div className="stat-header">
                        <span className="stat-label">Total Credits</span>
                        <BookOpen size={18} />
                    </div>
                    <div className="stat-value">{totalCredits}<span className="stat-max">/{maxCredits}</span></div>
                    <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${(totalCredits / maxCredits) * 100}%`, backgroundColor: 'var(--accent-primary)' }}></div>
                    </div>
                </div>
                <div className="stat-card anim-right">
                    <div className="stat-header">
                        <span className="stat-label">Active Courses</span>
                        <Layers size={18} />
                    </div>
                    <div className="stat-value">{currentSem.length}</div>
                    <p className="stat-footnote">This semester load</p>
                </div>
                <div className="stat-card anim-right">
                    <div className="stat-header">
                        <span className="stat-label">Latest semester SGPA</span>
                        <TrendingUp size={18} />
                    </div>
                    <div className="stat-value">{examHistory.length > 0 ? latestSGPA : "—"}</div>
                    {examHistory.length > 1 ? (
                        <div className={`trend-badge ${isImproved ? 'positive' : 'negative'}`}>
                            {isImproved ? <TrendingUp size={14} /> : <TrendingUp size={14} style={{ transform: 'rotate(180deg)' }} />}
                            {sgpaDiff} vs previous
                        </div>
                    ) : (
                        <p className="stat-footnote">
                            {examHistory.length === 1
                                ? "Compares once more history is available"
                                : "No semester results in history yet"}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default React.memo(PerformanceSection);
