"use client";

import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import axios from "axios";
import {
    Target, History as HistoryIcon, Award, Menu, X, Gamepad2, LogOut, BookOpen, Briefcase, Compass, Download, Trash2, Github, Calendar
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
import TimetableSection from "@/components/dashboard/sections/TimetableSection";
import OnboardingTour from "@/components/dashboard/OnboardingTour";


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
    const [isAppInstalled, setIsAppInstalled] = useState(false);
    const [showInstallPopup, setShowInstallPopup] = useState(false);
    const [showIOSPrompt, setShowIOSPrompt] = useState(false);
    const [showGenericInstallModal, setShowGenericInstallModal] = useState(false);
    
    // 1b. Route-aware Tab State with Zero-Latency Response
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const [activeTab, setActiveTab] = useState<string>(() => searchParams.get('tab') || 'performance');

    useEffect(() => {
        const tabParam = searchParams.get('tab');
        if (tabParam && tabParam !== activeTab) {
            setActiveTab(tabParam);
        }
    }, [searchParams]);
    
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
    const [showTour, setShowTour] = useState(false);
    const mobileProfileRef = useRef<HTMLDivElement>(null);

    // Close mobile profile dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (mobileProfileRef.current && !mobileProfileRef.current.contains(e.target as Node)) {
                setShowMobileProfileMenu(false);
            }
        };
        if (showMobileProfileMenu) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [showMobileProfileMenu]);

    const { formatTime, isCooldownActive } = useCooldown(nextAllowedAt);

    // Auto-trigger Onboarding Tour for first-time students
    useEffect(() => {
        if (!loading && student) {
            const tourKey = student.usn ? `hasCompletedOnboardingTour_${student.usn}` : "hasCompletedOnboardingTour";
            const hasCompleted = localStorage.getItem(tourKey);
            if (!hasCompleted) {
                const timer = setTimeout(() => setShowTour(true), 600);
                return () => clearTimeout(timer);
            }
        }
    }, [loading, student]);

    // 2. Lifecycle
    useEffect(() => {
        setMounted(true);

        const checkInstalled = () => {
            const isStandalone = window.matchMedia('(display-mode: standalone)').matches || ((window.navigator as any).standalone === true);
            setIsAppInstalled(!!isStandalone);
            return !!isStandalone;
        };
        const alreadyInstalled = checkInstalled();

        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e);

            // Pop up install toast if not already installed and not dismissed this session
            const dismissedThisSession = sessionStorage.getItem("dismissedInstallPrompt");
            if (!alreadyInstalled && !dismissedThisSession) {
                setShowInstallPopup(true);
                // Trigger browser prompt if permitted
                try {
                    (e as any).prompt?.().catch(() => {});
                } catch {
                    // Handled gracefully by 1-tap floating banner
                }
            }
        };
        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        const handleAppInstalled = () => {
            setIsAppInstalled(true);
            setShowInstallPopup(false);
            setDeferredPrompt(null);
        };
        window.addEventListener('appinstalled', handleAppInstalled);

        // iOS detection
        const userAgent = window.navigator.userAgent.toLowerCase();
        const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
        
        if (isIosDevice && !alreadyInstalled) {
            const dismissed = localStorage.getItem("dismissedIOSInstallPrompt");
            if (!dismissed) {
                setShowIOSPrompt(true);
            }
        }

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, []);

    const handleInstallPWA = async () => {
        if (deferredPrompt) {
            try {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                if (outcome === 'accepted') {
                    setShowInstallPopup(false);
                    setDeferredPrompt(null);
                    setIsAppInstalled(true);
                }
            } catch (err) {
                console.error("Install prompt error:", err);
            }
        } else {
            const userAgent = window.navigator.userAgent.toLowerCase();
            const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
            if (isIosDevice) {
                setShowIOSPrompt(true);
            } else {
                setShowGenericInstallModal(true);
            }
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
        examHistory.reduce((acc: number, sem: any) => acc + (Number.parseInt(sem.credits_earned, 10) || 0), 0)
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
        credits: Number.parseInt(sem.credits_earned || 0, 10)
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
            return today.getDate() === Number.parseInt(day, 10) && (today.getMonth() + 1) === Number.parseInt(month, 10);
        } catch {
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
                if (!pSessionId) { router.push("/student-login"); return; }

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
                        router.push("/student-login");
                    }
                } catch (err: any) {
                    console.error("Proctor view mount error:", err);
                    if (err.response?.status === 401) {
                        localStorage.clear();
                        router.push("/student-login");
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

    // 4. Handlers (Optimized for instant 60fps responsiveness)
    const handleTabChange = useCallback((tab: string) => { 
        setActiveTab(tab);
        setSelectedSubject(null);
        setIsMobileMenuOpen(false); 
        if (typeof window !== 'undefined') {
            const currentUrl = new URL(window.location.href);
            currentUrl.searchParams.set('tab', tab);
            window.history.replaceState(null, '', currentUrl.toString());
        }
    }, []);
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
                    <Link href="/" className="sidebar-brand-link">
                        <Image src="/logo-icon.svg" alt="MSR Insight logo" width={30} height={30} priority className="sidebar-plain-logo-img" />
                        <span className="sidebar-app-name">MSR Insight</span>
                    </Link>
                </div>

                <nav className="sidebar-navigation">
                    {[
                        { id: 'performance', icon: <Target size={20} />, label: 'Current Semester' },
                        { id: 'timetable', icon: <Calendar size={20} />, label: 'Timetable' },
                        { id: 'notes', icon: <BookOpen size={20} />, label: 'Notes & PYQs' },
                        { id: 'analytics', icon: <BarChart3 size={20} />, label: 'Analytics' },
                        { id: 'placement', icon: <Briefcase size={20} />, label: 'Placements' },
                        { id: 'history', icon: <HistoryIcon size={20} />, label: 'Exam History' },
                        { id: 'simulator', icon: <Gamepad2 size={20} />, label: 'Simulator' },
                    ].map(tab => (
                        <button type="button" key={tab.id} className={`nav-button ${activeTab === tab.id ? 'active' : ''}`} onClick={() => handleTabChange(tab.id)}>
                            {tab.icon} <span>{tab.label}</span>
                        </button>
                    ))}
                    {!isAppInstalled && (
                        <button type="button" className="nav-button pwa-install-btn" onClick={handleInstallPWA} style={{ marginTop: 'auto', background: 'rgba(0, 173, 181, 0.1)', color: 'var(--accent-primary, #00ADB5)', border: '1px solid rgba(0, 173, 181, 0.2)' }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M12 12v9"/><path d="m8 17 4 4 4-4"/></svg>
                            <span>Install Web App</span>
                        </button>
                    )}
                </nav>
                <SidebarProfile 
                    user={student} 
                    onLogout={handleLogout} 
                    onDeleteData={() => setShowDeleteModal(true)} 
                    onStartTour={() => setShowTour(true)} 
                    onInstall={handleInstallPWA}
                    isInstalled={isAppInstalled}
                />
            </aside>

            {/* Mobile Top Navbar */}
            <header className="mobile-top-navbar">
                <div className="mobile-nav-brand">
                    <Image src="/logo-icon.svg" alt="MSR Insight logo" width={26} height={26} priority className="sidebar-plain-logo-img mobile" />
                    <span className="mobile-app-name">MSR Insight</span>
                </div>
                <div className="mobile-nav-profile" style={{ position: 'relative' }} ref={mobileProfileRef}>
                    <button 
                        type="button"
                        className="mobile-avatar-trigger"
                        onClick={() => setShowMobileProfileMenu(!showMobileProfileMenu)}
                        aria-label="Toggle profile menu"
                    >
                        <div className="profile-initials-avatar mobile-avatar" style={{ width: 34, height: 34, fontSize: 13 }}>
                            {student?.name?.charAt(0) || 'S'}
                        </div>
                        <span className="online-status-dot" />
                    </button>
                    {showMobileProfileMenu && (
                        <div className="mobile-profile-dropdown">
                            <div className="dropdown-student-header">
                                <div className="dropdown-student-avatar">
                                    {student?.name?.charAt(0) || 'S'}
                                </div>
                                <div className="dropdown-student-info">
                                    <div className="dropdown-student-name">{student?.name}</div>
                                    <div className="dropdown-student-usn">{student?.usn}</div>
                                    <div className="dropdown-student-status">Active Student</div>
                                </div>
                            </div>
                            <div className="dropdown-divider" />
                            <button
                                type="button"
                                className="dropdown-glass-btn tour"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowMobileProfileMenu(false);
                                    setShowTour(true);
                                }}
                            >
                                <Compass size={16} />
                                <span>Replay Tour</span>
                            </button>
                            {!isAppInstalled && (
                                <button 
                                    type="button"
                                    className="dropdown-glass-btn install"
                                    onClick={() => {
                                        setShowMobileProfileMenu(false);
                                        handleInstallPWA();
                                    }}
                                >
                                    <Download size={16} />
                                    <span>Install Web App</span>
                                </button>
                            )}
                            <button 
                                type="button"
                                className="dropdown-glass-btn logout"
                                onClick={handleLogout}
                            >
                                <LogOut size={16} />
                                <span>Logout</span>
                            </button>
                            <div className="dropdown-divider" />
                            <button
                                type="button"
                                className="dropdown-glass-btn delete"
                                onClick={() => {
                                    setShowMobileProfileMenu(false);
                                    setShowDeleteModal(true);
                                }}
                            >
                                <Trash2 size={15} />
                                <span>Delete Account</span>
                            </button>
                            <div className="profile-github-link-wrapper">
                                <a
                                    href="https://fun-ai-portfolio.vercel.app/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="profile-github-link"
                                    title="GitHub Profile"
                                    aria-label="GitHub Profile"
                                    onClick={() => setShowMobileProfileMenu(false)}
                                >
                                    <Github size={13} />
                                </a>
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
                            {activeTab === 'timetable' && (
                                <TimetableSection
                                    studentName={student?.name}
                                    timetableData={detailsBlob.timetable}
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
                    { id: 'timetable', icon: <Calendar size={20} />, label: 'Timetable' },
                    { id: 'notes', icon: <BookOpen size={20} />, label: 'Notes' },
                    { id: 'placement', icon: <Briefcase size={20} />, label: 'Placements' },
                    { id: 'analytics', icon: <BarChart3 size={20} />, label: 'Analytics' },
                    { id: 'history', icon: <HistoryIcon size={20} />, label: 'History' },
                    { id: 'simulator', icon: <Gamepad2 size={20} />, label: 'Sim' },
                ].map(tab => (
                    <button
                        type="button"
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
                <div className="glass-ios-prompt">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Image src="/logo-icon.svg" alt="logo" width={24} height={24} className="sidebar-plain-logo-img mobile" />
                            <span style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-primary)' }}>Install MSR Insight</span>
                        </div>
                        <button 
                            type="button"
                            onClick={() => {
                                setShowIOSPrompt(false);
                                localStorage.setItem("dismissedIOSInstallPrompt", "true");
                            }}
                            className="profile-options-trigger"
                            aria-label="Close install prompt"
                        >
                            <X size={16} />
                        </button>
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                        To install this app on your iPhone:
                        <ol style={{ paddingLeft: '20px', margin: '8px 0 0 0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <li>Tap the <strong>Share</strong> button <svg style={{ display: 'inline', verticalAlign: 'middle' }} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg> at the bottom.</li>
                            <li>Select <strong>Add to Home Screen</strong> <svg style={{ display: 'inline', verticalAlign: 'middle' }} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>.</li>
                        </ol>
                    </div>
                </div>
            )}

            {showDeleteModal && (
                <div className="glass-modal-overlay">
                    <button 
                        type="button" 
                        className="glass-modal-backdrop-btn" 
                        aria-label="Close delete modal backdrop"
                        onClick={() => setShowDeleteModal(false)} 
                    />
                    <div className="glass-modal-card" role="dialog" aria-modal="true" aria-labelledby="delete-modal-title">
                        <div className="glass-modal-icon-pod">
                            <Trash2 size={24} />
                        </div>
                        <h3 id="delete-modal-title" className="glass-modal-title">
                            Are you leaving us like that?
                        </h3>
                        <p className="glass-modal-desc">
                            All your academic logs, simulated grades, and placement records will be permanently erased. To confirm deletion, type your USN (<strong>{stdUsn}</strong>) below:
                        </p>
                        <input
                            type="text"
                            value={confirmUsnInput}
                            onChange={(e) => setConfirmUsnInput(e.target.value)}
                            placeholder="Enter USN to confirm"
                            className="glass-modal-input"
                            autoFocus
                        />
                        <div className="glass-modal-actions">
                            <button 
                                type="button"
                                onClick={handleDeleteAccount}
                                disabled={isDeleting || confirmUsnInput.trim().toUpperCase() !== stdUsn.toUpperCase()}
                                className="glass-modal-btn danger"
                            >
                                {isDeleting ? "Erasing everything..." : "Yes, delete permanently"}
                            </button>
                            <button 
                                type="button"
                                onClick={() => {
                                    setShowDeleteModal(false);
                                    setConfirmUsnInput("");
                                }}
                                disabled={isDeleting}
                                className="glass-modal-btn secondary"
                            >
                                Nevermind, keep my data
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Interactive Onboarding Tour */}
            <OnboardingTour isOpen={showTour} onClose={() => setShowTour(false)} />

            {/* Install as Web App Floating Notification */}
            {showInstallPopup && !isAppInstalled && (
                <div className="install-banner-toast fade-in">
                    <div className="install-banner-content">
                        <div className="install-banner-icon">
                            <Image src="/logo-icon.svg" alt="logo" width={22} height={22} />
                        </div>
                        <div className="install-banner-text">
                            <div className="install-banner-title">Install MSR Insight</div>
                            <div className="install-banner-subtitle">Install as a web app for instant 1-tap access</div>
                        </div>
                    </div>
                    <div className="install-banner-actions">
                        <button
                            type="button"
                            className="install-banner-btn-primary"
                            onClick={() => {
                                setShowInstallPopup(false);
                                handleInstallPWA();
                            }}
                        >
                            <Download size={13} />
                            <span>Install</span>
                        </button>
                        <button
                            type="button"
                            className="install-banner-btn-dismiss"
                            onClick={() => {
                                setShowInstallPopup(false);
                                sessionStorage.setItem("dismissedInstallPrompt", "true");
                            }}
                            title="Dismiss"
                            aria-label="Dismiss"
                        >
                            <X size={14} />
                        </button>
                    </div>
                </div>
            )}

            {/* Desktop / Generic Browser Install Guide Modal */}
            {showGenericInstallModal && (
                <div className="glass-modal-overlay fade-in">
                    <button
                        type="button"
                        className="glass-modal-backdrop-btn"
                        aria-label="Close install modal backdrop"
                        onClick={() => setShowGenericInstallModal(false)}
                    />
                    <div className="glass-modal-card" role="dialog" aria-modal="true" aria-labelledby="install-modal-title" style={{ maxWidth: '420px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Image src="/logo-icon.svg" alt="logo" width={28} height={28} className="sidebar-plain-logo-img" />
                                <h3 id="install-modal-title" style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>Install MSR Insight</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowGenericInstallModal(false)}
                                className="profile-options-trigger"
                                aria-label="Close modal"
                            >
                                <X size={16} />
                            </button>
                        </div>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5', margin: '0 0 14px 0' }}>
                            Install MSR Insight on your device for fast offline launch and standalone window experience:
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', background: 'rgba(255,255,255,0.04)', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
                                <span style={{ color: 'var(--accent-primary)', fontWeight: '700' }}>1.</span>
                                <span>Look at your browser&apos;s address bar and click the <strong>Install</strong> icon (computer/down arrow symbol).</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', background: 'rgba(255,255,255,0.04)', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
                                <span style={{ color: 'var(--accent-primary)', fontWeight: '700' }}>2.</span>
                                <span>Or click browser <strong>Menu (&vellip;) &rarr; Save and share &rarr; Install MSR Insight</strong>.</span>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowGenericInstallModal(false)}
                            className="btn btn-primary"
                            style={{ width: '100%', marginTop: '18px', padding: '9px', fontSize: '13px' }}
                        >
                            Got it
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

const BarChart3 = ({ size }: { size: number }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-bar-chart-3"><path d="M3 3v18h18" /><path d="M18 17V9" /><path d="M13 17V5" /><path d="M8 17v-3" /></svg>;

