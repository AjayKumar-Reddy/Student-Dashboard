"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import axios from "axios";
import {
    Target, History as HistoryIcon, Award, Menu, X, Gamepad2, LogOut, BookOpen, Briefcase
} from "lucide-react";
import "@/styles/StudentDashboard.css";
import { API_BASE_URL } from "@/config/api.config";
import SubjectDetail from "@/app/(dashboard)/student/dashboard/components/SubjectDetail";
import SidebarProfile from "@/components/dashboard/SidebarProfile";
import Image from "next/image";
import Link from "next/link";

// Update Components
import { useCooldown } from "@/hooks/useCooldown";

// Section Components
import PerformanceSection from "@/components/dashboard/sections/PerformanceSection";
import AnalyticsSection from "@/components/dashboard/sections/AnalyticsSection";
import HistorySection from "@/components/dashboard/sections/HistorySection";
import SimulatorSection from "@/components/dashboard/sections/SimulatorSection";
import NotesSection from "@/components/dashboard/sections/NotesSection";
import LoadingScreen from "@/components/dashboard/LoadingScreen";
import BirthdayBanner from "@/components/dashboard/BirthdayBanner";
import PlacementSection from "@/components/dashboard/sections/PlacementSection";


const GRADE_COLORS: Record<string, string> = {
    'O': '#8b5cf6',
    'A+': '#3b82f6',
    'A': '#10b981',
    'B+': '#f59e0b',
    'B': 'var(--accent-primary)',
    'C': '#ef4444',
    'P': '#64748b',
    'F': '#1e293b',
};

const GRADE_POINTS: Record<string, number> = {
    'O': 10, 'A+': 9, 'A': 8, 'B+': 7, 'B': 6, 'C': 5, 'P': 4, 'F': 0
};

export default function StudentDashboard() {
    // 1. Core Hooks & State
    const router = useRouter();
    const [student, setStudent] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [mounted, setMounted] = useState(false);

    // PWA Install State
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isInstallable, setIsInstallable] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [showIOSPrompt, setShowIOSPrompt] = useState(false);
    
    // 1b. Route-aware Tab State
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const activeTab = searchParams.get('tab') || 'performance';
    
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [nextAllowedAt, setNextAllowedAt] = useState<string | null>(null);
    const [selectedSubject, setSelectedSubject] = useState<any>(null);
    const [predictedGrades, setPredictedGrades] = useState<Record<string, string>>({});
    const [simulatedCredits, setSimulatedCredits] = useState<Record<string, number>>({});
    const [selectedHistoryIdx, setSelectedHistoryIdx] = useState<number>(0);
    const [updateStatus, setUpdateStatus] = useState<'loading' | 'success' | 'error' | null>(null);
    const [showMobileProfileMenu, setShowMobileProfileMenu] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [confirmUsnInput, setConfirmUsnInput] = useState("");

    const { formatTime, isCooldownActive } = useCooldown(nextAllowedAt);

    // 2. Lifecycle
    useEffect(() => {
        setMounted(true);

        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setIsInstallable(true);
        };
        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // iOS detection
        const userAgent = window.navigator.userAgent.toLowerCase();
        const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
        const isStandalone = ('standalone' in window.navigator) && ((window.navigator as any).standalone);
        
        setIsIOS(isIosDevice);
        if (isIosDevice && !isStandalone) {
            const dismissed = localStorage.getItem("dismissedIOSInstallPrompt");
            if (!dismissed) {
                setShowIOSPrompt(true);
            }
        }

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const handleInstallPWA = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setIsInstallable(false);
            setDeferredPrompt(null);
        }
    };

    useEffect(() => {
        const handleOutsideClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (!target.closest('.mobile-nav-profile')) {
                setShowMobileProfileMenu(false);
            }
        };
        if (showMobileProfileMenu) {
            document.addEventListener('click', handleOutsideClick);
        }
        return () => document.removeEventListener('click', handleOutsideClick);
    }, [showMobileProfileMenu]);

    // 2. Derived Data (useMemo)
    const detailsBlob = useMemo(() => student?.details || {}, [student]);
    const currentSem = useMemo(() => detailsBlob.subjects || detailsBlob.current_semester || [], [detailsBlob]);
    const examHistory = useMemo(() => detailsBlob.exam_history || [], [detailsBlob]);

    const currentCgpa = useMemo(() => {
        const val = (detailsBlob.cgpa ?? student?.cgpa ?? "").toString().trim();
        return val || null;
    }, [detailsBlob, student]);

    const totalCredits = useMemo(() =>
        examHistory.reduce((acc: number, sem: any) => acc + (parseInt(sem.credits_earned) || 0), 0)
        , [examHistory]);

    const latestSGPA = useMemo(() =>
        examHistory.length > 0 ? (parseFloat(examHistory[examHistory.length - 1].sgpa) || 0) : 0
        , [examHistory]);

    const prevSGPA = useMemo(() =>
        examHistory.length > 1 ? (parseFloat(examHistory[examHistory.length - 2].sgpa) || 0) : 0
        , [examHistory]);

    const sgpaDiffValue = useMemo(() => latestSGPA - prevSGPA, [latestSGPA, prevSGPA]);

    const stdUsn = useMemo(() => student?.usn || detailsBlob.usn || "", [student, detailsBlob]);

    const isLateralEntry = useMemo(() => /4\d{2}$/.test(stdUsn), [stdUsn]);
    const maxCredits = isLateralEntry ? 120 : 160;

    const overallAttendance = useMemo(() =>
        currentSem.length ? Math.round(currentSem.reduce((acc: number, curr: any) => acc + (curr.attendance || 0), 0) / currentSem.length) : 0
        , [currentSem]);

    const sgpaTrendData = useMemo(() => examHistory.map((sem: any) => ({
        name: sem.semester.split(' ')[0] + ' ' + (sem.semester.split(' ')[2]?.substring(2) || ''),
        sgpa: parseFloat(sem.sgpa),
        credits: parseInt(sem.credits_earned || 0)
    })), [examHistory]);

    const gradeChartData = useMemo(() => {

        const allGrades = examHistory.flatMap((sem: any) => sem.courses?.map((c: any) => c.grade) || []);
        const distribution = allGrades.reduce((acc: any, grade: string) => {
            acc[grade] = (acc[grade] || 0) + 1;
            return acc;
        }, {});
        return Object.entries(distribution)
            .map(([grade, count]) => ({ grade, count, color: (GRADE_COLORS[grade] || '#64748b') as string }))
            .sort((a, b) => (b.count as number) - (a.count as number));
    }, [examHistory]);

    const internalComparisonData = useMemo(() => {
        return currentSem.map((subj: any) => {
            const getScores = (type: string) => {
                const a = subj.assessments?.find((x: any) => x.type === type);
                return { me: a?.obtained_marks || 0, avg: a?.class_average || 0 };
            };
            const t1 = getScores('T1');
            const t2 = getScores('T2');
            const aq1 = getScores('AQ1');
            const aq2 = getScores('AQ2');
            const testAvg = (t1.me > 0 && t2.me > 0) ? Math.round((t1.me + t2.me) / 2) : Math.max(t1.me, t2.me);
            const avgTotal = (t1.avg > 0 && t2.avg > 0) ? Math.round((t1.avg + t2.avg) / 2) : Math.max(t1.avg, t2.avg);
            return {
                code: subj.code,
                name: subj.name,
                studentScore: testAvg + aq1.me + aq2.me,
                classAverage: avgTotal + aq1.avg + aq2.avg,
            };
        }).filter((d: any) => d.studentScore > 0 || d.classAverage > 0);
    }, [currentSem]);

    const bestSubject = useMemo(() => {
        return [...currentSem].filter(s => s.marks > 0 || (s.attendance && s.attendance > 0)).sort((a: any, b: any) => {
            const scoreA = ((a.marks || 0) * 2) + (a.attendance || 0);
            const scoreB = ((b.marks || 0) * 2) + (b.attendance || 0);
            return scoreB - scoreA;
        })[0];
    }, [currentSem]);

    const weakestSubject = useMemo(() => {
        return [...currentSem].filter(s => s.marks > 0 || (s.attendance && s.attendance > 0)).sort((a: any, b: any) => {
            const scoreA = ((a.marks || 0) * 2) + (a.attendance || 0);
            const scoreB = ((b.marks || 0) * 2) + (b.attendance || 0);
            return scoreA - scoreB;
        })[0];
    }, [currentSem]);

    const isBirthday = useMemo(() => {
        if (!student?.dob) return false;
        try {
            const [day, month] = student.dob.split('-');
            const today = new Date();
            return today.getDate() === parseInt(day, 10) && (today.getMonth() + 1) === parseInt(month, 10);
        } catch (e) {
            return false;
        }
    }, [student]);

    // 3. Effects
    useEffect(() => {
        const fetchProfile = async () => {
            const proctorView = searchParams.get("proctorView");
            const proctorId = searchParams.get("proctorId");
            const queryUsn = searchParams.get("usn");

            if (proctorView === "true" && proctorId && queryUsn) {
                const pSessionId = localStorage.getItem("proctorSessionId");
                if (!pSessionId) { router.push("/proctor-login"); return; }

                try {
                    const response = await axios.get(`${API_BASE_URL}/api/proctor/${proctorId}/student/${queryUsn}`, {
                        headers: { "x-session-id": pSessionId },
                    });
                    if (response.data.success && response.data.data) {
                        const data = response.data.data;
                        setStudent(data);

                        const lastSync = data.details?.last_updated || data.last_updated;
                        if (lastSync) {
                            const next = new Date(new Date(lastSync).getTime() + 5 * 60 * 1000).toISOString();
                            setNextAllowedAt(next);
                        }
                    } else {
                        router.push("/proctor-login");
                    }
                } catch (err: any) {
                    console.error("Proctor view mount error:", err);
                    if (err.response?.status === 401) {
                        localStorage.clear();
                        router.push("/proctor-login");
                    }
                } finally {
                    setLoading(false);
                }
                return;
            }

            const sessionId = localStorage.getItem("studentSessionId");
            const usn = localStorage.getItem("studentUsn");
            if (!sessionId || !usn) { router.push("/student-login"); return; }

            try {
                const response = await axios.get(`${API_BASE_URL}/api/auth/profile`, {
                    headers: { "x-session-id": sessionId },
                });
                if (response.data.success && response.data.data) {
                    const data = response.data.data;
                    setStudent(data);

                    const lastSync = data.details?.last_updated || data.last_updated;
                    if (lastSync) {
                        const next = new Date(new Date(lastSync).getTime() + 5 * 60 * 1000).toISOString();
                        setNextAllowedAt(next);
                    }

                } else {
                    // If success is false or no data, redirect to login
                    localStorage.clear();
                    router.push("/student-login");
                }
            } catch (err: any) {
                console.error("Dashboard mount error:", err);
                if (err.response?.status === 401) {
                    localStorage.clear();
                    router.push("/student-login");
                }
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, [router, searchParams]);

    useEffect(() => {
        if (currentSem.length > 0 && Object.keys(predictedGrades).length === 0) {
            const initialGrades: Record<string, string> = {};
            const initialCredits: Record<string, number> = {};
            currentSem.forEach((s: any) => {
                initialGrades[s.code] = 'O';
                initialCredits[s.code] = 4;
            });
            setPredictedGrades(initialGrades);
            setSimulatedCredits(initialCredits);
        }
    }, [currentSem, predictedGrades]);

    // 4. Handlers
    const handleTabChange = (tab: string) => { 
        const params = new URLSearchParams(searchParams.toString());
        params.set('tab', tab);
        router.push(`${pathname}?${params.toString()}`, { scroll: false });
        setSelectedSubject(null); // Clear subject view when navigating via sidebar
        setIsMobileMenuOpen(false); 
    };
    const handleLogout = () => { localStorage.clear(); router.push("/"); };

    const handleDeleteAccount = async () => {
        if (confirmUsnInput.trim().toUpperCase() !== stdUsn.toUpperCase()) {
            return;
        }

        try {
            setIsDeleting(true);
            const sessionId = localStorage.getItem("studentSessionId");
            const response = await axios.delete(`${API_BASE_URL}/api/auth/delete`, {
                headers: { "x-session-id": sessionId }
            });
            if (response.data.success) {
                localStorage.clear();
                router.push("/student-login");
            } else {
                alert(response.data.message || "Failed to delete account");
            }
        } catch (err: any) {
            console.error("Error deleting student data:", err);
            alert(err.response?.data?.message || "Failed to delete account");
        } finally {
            setIsDeleting(false);
            setShowDeleteModal(false);
            setConfirmUsnInput("");
        }
    };

    const handleUpdate = async () => {
        if (isCooldownActive) return;
        const sessionId = localStorage.getItem("studentSessionId");
        if (!sessionId || !stdUsn) return;

        setUpdateStatus('loading');
        try {
            const response = await axios.post(`${API_BASE_URL}/api/report/update`, 
                { usn: stdUsn },
                { headers: { "x-session-id": sessionId } }
            );

            if (response.data.success && response.data.data) {
                setStudent(response.data.data);
                setUpdateStatus('success');
                
                const lastSync = response.data.data.details?.last_updated || response.data.data.last_updated;
                if (lastSync) {
                    const next = new Date(new Date(lastSync).getTime() + 5 * 60 * 1000).toISOString();
                    setNextAllowedAt(next);
                }

            } else {
                setUpdateStatus('error');
            }
        } catch (err: any) {
            console.error("Manual update failed:", err);
            setUpdateStatus('error');
            if (err.response?.status === 429 && err.response?.data?.nextAllowedAt) {
                setNextAllowedAt(err.response.data.nextAllowedAt);
            }
        } finally {
            setTimeout(() => setUpdateStatus(null), 3000);
        }
    };

    if (!mounted || loading || !student) return <LoadingScreen />;


    return (
        <div className="student-dashboard-container">
            <aside className="dashboard-sidebar">
                <div className="sidebar-branding">
                    <Link href="/" className="flex items-center gap-2">
                        <Image src="/logo-icon.svg" alt="logo" width={32} height={32} priority />
                        <span className="sidebar-app-name">MSR Insight</span>
                    </Link>
                </div>

                <nav className="sidebar-navigation">
                    {[
                        { id: 'performance', icon: <Target size={20} />, label: 'Current Semester' },
                        { id: 'notes', icon: <BookOpen size={20} />, label: 'Notes & PYQs' },
                        { id: 'analytics', icon: <BarChart3 size={20} />, label: 'Analytics' },
                        { id: 'placement', icon: <Briefcase size={20} />, label: 'Placements' },
                        { id: 'history', icon: <HistoryIcon size={20} />, label: 'Exam History' },
                        { id: 'simulator', icon: <Gamepad2 size={20} />, label: 'Simulator' },
                    ].map(tab => (
                        <button key={tab.id} className={`nav-button ${activeTab === tab.id ? 'active' : ''}`} onClick={() => handleTabChange(tab.id)}>
                            {tab.icon} <span>{tab.label}</span>
                        </button>
                    ))}
                    {isInstallable && (
                        <button className="nav-button pwa-install-btn" onClick={handleInstallPWA} style={{ marginTop: 'auto', background: 'rgba(0, 173, 181, 0.1)', color: 'var(--accent-primary, #00ADB5)', border: '1px solid rgba(0, 173, 181, 0.2)' }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M12 12v9"/><path d="m8 17 4 4 4-4"/></svg>
                            <span>Install Web App</span>
                        </button>
                    )}
                </nav>
                <SidebarProfile user={student} onLogout={handleLogout} onDeleteData={() => setShowDeleteModal(true)} />
            </aside>

            {/* Mobile Top Navbar */}
            <header className="mobile-top-navbar">
                <div className="mobile-nav-brand">
                    <Image src="/logo-icon.svg" alt="logo" width={28} height={28} priority />
                    <span className="mobile-app-name">MSR Insight</span>
                </div>
                <div className="mobile-nav-profile" style={{ position: 'relative' }}>
                    <div 
                        className="profile-initials-avatar" 
                        style={{ width: 32, height: 32, fontSize: 12, cursor: 'pointer' }}
                        onClick={() => setShowMobileProfileMenu(!showMobileProfileMenu)}
                    >
                        {student?.name?.charAt(0) || 'S'}
                    </div>
                    {showMobileProfileMenu && (
                        <div className="mobile-profile-dropdown" style={{
                            position: 'absolute',
                            right: 0,
                            top: '42px',
                            background: 'var(--bg-card, #1B2333)',
                            border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
                            borderRadius: '12px',
                            padding: '12px',
                            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
                            minWidth: '180px',
                            zIndex: 1001,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px'
                        }}>
                            <div style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '8px' }}>
                                <div style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{student?.name}</div>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{student?.usn}</div>
                            </div>
                            {isInstallable && (
                                <button 
                                    onClick={handleInstallPWA}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        width: '100%',
                                        padding: '8px 10px',
                                        background: 'rgba(0, 173, 181, 0.1)',
                                        color: '#00ADB5',
                                        border: '1px solid rgba(0, 173, 181, 0.2)',
                                        borderRadius: '8px',
                                        fontSize: '13px',
                                        fontWeight: 600,
                                        cursor: 'pointer'
                                    }}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M12 12v9"/><path d="m8 17 4 4 4-4"/></svg>
                                    Install Web App
                                </button>
                            )}
                            <button 
                                onClick={handleLogout}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    width: '100%',
                                    padding: '8px 10px',
                                    background: 'rgba(239, 68, 68, 0.1)',
                                    color: '#EF4444',
                                    border: '1px solid rgba(239, 68, 68, 0.2)',
                                    borderRadius: '8px',
                                    fontSize: '13px',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                <LogOut size={16} /> Logout
                            </button>
                            <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', marginTop: '4px', paddingTop: '8px', textAlign: 'center' }}>
                                <button
                                    onClick={() => {
                                        setShowMobileProfileMenu(false);
                                        setShowDeleteModal(true);
                                    }}
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: 'var(--text-muted, #94a3b8)',
                                        fontSize: '11px',
                                        fontWeight: '600',
                                        cursor: 'pointer',
                                        textDecoration: 'underline',
                                        width: '100%',
                                        textAlign: 'center',
                                        padding: '4px 0'
                                    }}
                                >
                                    Delete Account
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </header>

            <main className="dashboard-main-content">
                <div className="content-wrapper">
                    {isBirthday && <BirthdayBanner studentName={student?.name || "Student"} />}
                    {selectedSubject ? (

                        <SubjectDetail
                            subject={selectedSubject}
                            allSubjects={currentSem}
                            onSubjectChange={setSelectedSubject}
                            onBack={() => setSelectedSubject(null)}
                        />
                    ) : (
                        <>
                            {activeTab === 'performance' && (
                                <PerformanceSection
                                    student={student} currentSem={currentSem} overallAttendance={overallAttendance} totalCredits={totalCredits}
                                    maxCredits={maxCredits} currentCgpa={currentCgpa} onSelectSubject={setSelectedSubject} handleUpdate={handleUpdate}
                                    updateStatus={updateStatus} isCooldownActive={isCooldownActive} formatTime={formatTime}
                                    examHistory={examHistory} latestSGPA={latestSGPA}
                                    isImproved={latestSGPA >= prevSGPA}
                                    sgpaDiff={(latestSGPA - prevSGPA >= 0 ? "+" : "") + (latestSGPA - prevSGPA).toFixed(2)}
                                />
                            )}
                            {activeTab === 'analytics' && (
                                <AnalyticsSection
                                    studentName={student?.name}
                                    internalComparisonData={internalComparisonData}
                                    gradeChartData={gradeChartData}
                                    bestSubject={bestSubject}
                                    weakestSubject={weakestSubject}
                                    overallAttendance={overallAttendance}
                                    detailsBlob={detailsBlob}
                                    latestSGPA={latestSGPA}
                                    sgpaDiffValue={sgpaDiffValue}
                                    sgpaTrendData={sgpaTrendData}
                                />
                            )}
                            {activeTab === 'history' && (
                                <HistorySection
                                    studentName={student?.name}
                                    examHistory={examHistory}
                                    selectedHistoryIdx={selectedHistoryIdx}
                                    setSelectedHistoryIdx={setSelectedHistoryIdx}
                                    GRADE_COLORS={GRADE_COLORS}
                                    isLateralEntry={isLateralEntry}
                                />
                            )}
                            {activeTab === 'notes' && (
                                <NotesSection
                                    studentName={student?.name}
                                    usn={stdUsn}
                                    currentSemSubjects={currentSem}
                                    examHistory={examHistory}
                                />
                            )}
                            {activeTab === 'placement' && (
                                <PlacementSection
                                    studentName={student?.name}
                                    placementData={detailsBlob.placement}
                                    handleUpdate={handleUpdate}
                                    updateStatus={updateStatus}
                                    isCooldownActive={isCooldownActive}
                                    formatTime={formatTime}
                                />
                            )}
                            {activeTab === 'simulator' && (
                                <SimulatorSection
                                    studentName={student?.name}
                                    currentSem={currentSem}
                                    predictedGrades={predictedGrades}
                                    simulatedCredits={simulatedCredits}
                                    setPredictedGrades={setPredictedGrades}
                                    setSimulatedCredits={setSimulatedCredits}
                                    currentCgpa={currentCgpa}
                                    totalCredits={totalCredits}
                                    GRADE_COLORS={GRADE_COLORS}
                                    GRADE_POINTS={GRADE_POINTS}
                                />
                            )}
                        </>
                    )}
                </div>
            </main>

            {/* Mobile Bottom Navigation */}
            <nav className="mobile-bottom-nav">
                {[
                    { id: 'performance', icon: <Target size={20} />, label: 'Semester' },
                    { id: 'notes', icon: <BookOpen size={20} />, label: 'Notes' },
                    { id: 'placement', icon: <Briefcase size={20} />, label: 'Placements' },
                    { id: 'analytics', icon: <BarChart3 size={20} />, label: 'Analytics' },
                    { id: 'history', icon: <HistoryIcon size={20} />, label: 'History' },
                    { id: 'simulator', icon: <Gamepad2 size={20} />, label: 'Sim' },
                ].map(tab => (
                    <button
                        key={tab.id}
                        className={`bottom-nav-item ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => handleTabChange(tab.id)}
                    >
                        {tab.icon}
                        <span>{tab.label}</span>
                    </button>
                ))}
            </nav>

            {showIOSPrompt && (
                <div className="ios-pwa-prompt" style={{
                    position: 'fixed',
                    bottom: '80px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'var(--bg-card, #1B2333)',
                    border: '1px solid var(--accent-primary, #00ADB5)',
                    borderRadius: '16px',
                    padding: '16px',
                    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
                    width: 'calc(100% - 32px)',
                    maxWidth: '400px',
                    zIndex: 2000,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    animation: 'slideUp 0.3s ease-out'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Image src="/logo-icon.svg" alt="logo" width={24} height={24} />
                            <span style={{ fontWeight: 'bold', fontSize: '14px', color: 'var(--text-primary)' }}>Install MSR Insight</span>
                        </div>
                        <button 
                            onClick={() => {
                                setShowIOSPrompt(false);
                                localStorage.setItem("dismissedIOSInstallPrompt", "true");
                            }}
                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                        >
                            <X size={16} />
                        </button>
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                        To install this app on your iPhone:
                        <ol style={{ paddingLeft: '20px', margin: '6px 0 0 0' }}>
                            <li>Tap the <strong>Share</strong> button <svg style={{ display: 'inline', verticalAlign: 'middle' }} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg> at the bottom.</li>
                            <li>Select <strong>Add to Home Screen</strong> <svg style={{ display: 'inline', verticalAlign: 'middle' }} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>.</li>
                        </ol>
                    </div>
                </div>
            )}

            {showDeleteModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.85)',
                    backdropFilter: 'blur(8px)',
                    zIndex: 2000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px'
                }}>
                    <div style={{
                        background: 'var(--bg-card, #131A26)',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        borderRadius: '16px',
                        padding: '30px',
                        maxWidth: '420px',
                        width: '100%',
                        textAlign: 'center',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
                        animation: 'fadeIn 0.2s ease'
                    }}>
                        <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--text-primary)', margin: '0 0 10px 0' }}>
                            Are you leaving us like that?
                        </h3>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5', margin: '0 0 20px 0' }}>
                            All your academic logs, simulated grades, and placement records will be permanently erased. To confirm deletion, type your USN (<strong>{stdUsn}</strong>) below:
                        </p>
                        <input
                            type="text"
                            value={confirmUsnInput}
                            onChange={(e) => setConfirmUsnInput(e.target.value)}
                            placeholder="Enter USN to confirm"
                            style={{
                                width: '100%',
                                padding: '10px 14px',
                                background: 'var(--bg-secondary, #1B2333)',
                                border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
                                borderRadius: '10px',
                                color: 'var(--text-primary)',
                                outline: 'none',
                                textAlign: 'center',
                                fontSize: '14px',
                                fontWeight: 'bold',
                                letterSpacing: '1px',
                                marginBottom: '20px'
                            }}
                        />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <button 
                                onClick={handleDeleteAccount}
                                disabled={isDeleting || confirmUsnInput.trim().toUpperCase() !== stdUsn.toUpperCase()}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    background: confirmUsnInput.trim().toUpperCase() === stdUsn.toUpperCase() ? '#EF4444' : 'rgba(239, 68, 68, 0.2)',
                                    color: confirmUsnInput.trim().toUpperCase() === stdUsn.toUpperCase() ? '#fff' : 'rgba(255, 255, 255, 0.3)',
                                    border: 'none',
                                    borderRadius: '10px',
                                    fontWeight: 'bold',
                                    cursor: (isDeleting || confirmUsnInput.trim().toUpperCase() !== stdUsn.toUpperCase()) ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {isDeleting ? "Erasing everything..." : "Yes, delete permanently"}
                            </button>
                            <button 
                                onClick={() => {
                                    setShowDeleteModal(false);
                                    setConfirmUsnInput("");
                                }}
                                disabled={isDeleting}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    background: 'var(--bg-secondary, #1B2333)',
                                    color: 'var(--text-primary)',
                                    border: '1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))',
                                    borderRadius: '10px',
                                    fontWeight: 'bold',
                                    cursor: isDeleting ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                No, I want to stay!
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const BarChart3 = ({ size }: { size: number }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-bar-chart-3"><path d="M3 3v18h18" /><path d="M18 17V9" /><path d="M13 17V5" /><path d="M8 17v-3" /></svg>;

