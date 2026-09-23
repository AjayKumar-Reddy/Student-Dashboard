"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
    Clock, Calendar, MapPin, User, ChevronDown, ChevronUp, Layers, CheckCircle2
} from "lucide-react";
import { UpdateButton } from "@/components/dashboard/UpdateButton";
import "@/styles/Home.css";

interface TimetableClass {
    time_start: string;
    time_end: string;
    course_code: string;
    course_name: string;
    faculty: string;
    room: string;
    batch: string;
}

interface TimetableDay {
    day: string;
    date: string;
    classes: TimetableClass[];
}

interface TimetableData {
    week_start: string;
    scraped_at: string;
    days: TimetableDay[];
}

interface HomeSectionProps {
    student: any;
    currentSem?: any[];
    overallAttendance?: number;
    totalCredits?: number;
    maxCredits?: number;
    currentCgpa?: string | null;
    timetableData?: TimetableData | null;
    handleUpdate: () => void;
    updateStatus: 'loading' | 'success' | 'error' | null;
    isCooldownActive: boolean;
    formatTime: string;
    examHistory?: any[];
    latestSGPA?: number;
    sgpaDiff?: string;
    isImproved?: boolean;
    onSelectSubject?: (subject: any) => void;
    initialShowFullTimetable?: boolean;
}

const DAY_ORDER = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
const DAY_SHORT: Record<string, string> = {
    MONDAY: "Mon", TUESDAY: "Tue", WEDNESDAY: "Wed",
    THURSDAY: "Thu", FRIDAY: "Fri", SATURDAY: "Sat", SUNDAY: "Sun"
};

const formatTime12h = (time24: string): string => {
    if (!time24) return "";
    const [hStr, mStr] = time24.split(":");
    const h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);
    const period = h >= 12 ? "PM" : "AM";
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${h12}:${(m || 0).toString().padStart(2, "0")} ${period}`;
};

const getClassStatus = (timeStart: string, timeEnd: string, isToday: boolean): "completed" | "in-progress" | "upcoming" => {
    if (!isToday) return "upcoming";
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const [startH, startM] = timeStart.split(":").map(Number);
    const [endH, endM] = timeEnd.split(":").map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    if (currentMinutes >= endMinutes) return "completed";
    if (currentMinutes >= startMinutes && currentMinutes < endMinutes) return "in-progress";
    return "upcoming";
};

const getTodayDayName = (): string => {
    const days = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
    return days[new Date().getDay()];
};

export const HomeSection: React.FC<HomeSectionProps> = ({
    student,
    currentCgpa,
    timetableData,
    handleUpdate,
    updateStatus,
    isCooldownActive,
    formatTime,
    initialShowFullTimetable = false
}) => {
    const [showFullTimetable, setShowFullTimetable] = useState(initialShowFullTimetable);
    const todayName = getTodayDayName();
    const [selectedDay, setSelectedDay] = useState<string>(todayName);

    // Live Date and Time State
    const [currentTime, setCurrentTime] = useState<string>("");
    const [currentDateStr, setCurrentDateStr] = useState<string>("");

    useEffect(() => {
        const updateClock = () => {
            const now = new Date();
            setCurrentDateStr(now.toLocaleDateString('en-US', {
                weekday: 'long',
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            }));
            setCurrentTime(now.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true
            }));
        };
        updateClock();
        const timer = setInterval(updateClock, 1000);
        return () => clearInterval(timer);
    }, []);

    // Batch Selection State with persistence
    const [selectedBatch, setSelectedBatch] = useState<string>("ALL");

    useEffect(() => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem("selectedTimetableBatch");
            if (saved) {
                setSelectedBatch(saved);
            }
        }
    }, []);

    const handleBatchChange = (batch: string) => {
        setSelectedBatch(batch);
        if (typeof window !== "undefined") {
            localStorage.setItem("selectedTimetableBatch", batch);
        }
    };

    // Deduplicate timetable data
    const cleanedTimetable = useMemo(() => {
        if (!timetableData?.days) return timetableData;
        const dayMap = new Map<string, TimetableDay>();
        for (const d of timetableData.days) {
            if (dayMap.has(d.day)) {
                const existing = dayMap.get(d.day)!;
                const seen = new Set(existing.classes.map(c => `${c.time_start}-${c.time_end}-${c.course_code}-${c.faculty}-${c.batch}`));
                for (const cls of d.classes) {
                    const key = `${cls.time_start}-${cls.time_end}-${cls.course_code}-${cls.faculty}-${cls.batch}`;
                    if (!seen.has(key)) {
                        existing.classes.push(cls);
                        seen.add(key);
                    }
                }
            } else {
                dayMap.set(d.day, { ...d, classes: [...d.classes] });
            }
        }
        return { ...timetableData, days: [...dayMap.values()] };
    }, [timetableData]);

    // Discover all unique non-empty batches in the timetable
    const availableBatches = useMemo(() => {
        if (!cleanedTimetable?.days) return [];
        const batchSet = new Set<string>();
        for (const d of cleanedTimetable.days) {
            for (const c of d.classes) {
                if (c.batch && c.batch.trim()) {
                    batchSet.add(c.batch.trim());
                }
            }
        }
        return Array.from(batchSet).sort();
    }, [cleanedTimetable]);

    // Filter helper based on selected batch
    const filterByBatch = (cls: TimetableClass) => {
        if (selectedBatch === "ALL") return true;
        if (!cls.batch || !cls.batch.trim()) return true; // Theory / Common classes
        return cls.batch.trim().toUpperCase() === selectedBatch.trim().toUpperCase();
    };

    // Set initial selected day to today or first day
    useEffect(() => {
        if (cleanedTimetable?.days) {
            const todayExists = cleanedTimetable.days.some(d => d.day === todayName);
            if (todayExists) {
                setSelectedDay(todayName);
            } else if (cleanedTimetable.days.length > 0) {
                setSelectedDay(cleanedTimetable.days[0].day);
            }
        }
    }, [cleanedTimetable, todayName]);

    // Today's classes matching batch
    const todayClasses = useMemo(() => {
        if (!cleanedTimetable?.days) return [];
        const todayData = cleanedTimetable.days.find(d => d.day === todayName);
        return todayData?.classes.filter(filterByBatch) || [];
    }, [cleanedTimetable, todayName, selectedBatch]);

    // Remaining (in-progress or upcoming) classes for TODAY ONLY
    const upcomingTodayClasses = useMemo(() => {
        return todayClasses.filter(c => {
            const status = getClassStatus(c.time_start, c.time_end, true);
            return status === "in-progress" || status === "upcoming";
        });
    }, [todayClasses]);

    // Check if all classes for today are finished
    const isAllTodayFinished = useMemo(() => {
        return todayClasses.length > 0 && upcomingTodayClasses.length === 0;
    }, [todayClasses, upcomingTodayClasses]);

    // Next up to 2 classes for TODAY ONLY (Strict: Do NOT show tomorrow's classes today)
    const nextTwoClasses = useMemo(() => {
        if (upcomingTodayClasses.length === 0) return [];
        return upcomingTodayClasses.slice(0, 2).map(cls => ({
            cls,
            dayName: todayName,
            isToday: true,
            status: getClassStatus(cls.time_start, cls.time_end, true)
        }));
    }, [upcomingTodayClasses, todayName]);

    // Classes for selected day in full timetable (Filtered by Batch)
    const selectedDayClasses = useMemo(() => {
        const dayData = cleanedTimetable?.days?.find(d => d.day === selectedDay);
        if (!dayData?.classes) return [];
        return dayData.classes.filter(filterByBatch);
    }, [cleanedTimetable, selectedDay, selectedBatch]);

    const isToday = selectedDay === todayName;

    // Student identity details
    const detailsBlob = student?.details || {};
    const classDetails = detailsBlob.class_details || "";

    const { program, semester, section } = useMemo(() => {
        const raw = classDetails.trim();
        let prog = "";
        let sem = "";
        let sec = "";

        // Regex extraction for SEM and SEC
        const semMatch = raw.match(/SEM\s*0?(\d+)/i);
        if (semMatch) {
            sem = `Semester ${semMatch[1]}`;
        }

        const secMatch = raw.match(/SEC\s*([A-Za-z0-9]+)/i);
        if (secMatch) {
            sec = `Section ${secMatch[1]}`;
        }

        // Program / Branch extraction (e.g. "B.E-IS" or Department)
        const parts = raw.split(",").map((p: string) => p.trim());
        if (parts.length > 0 && !parts[0].toUpperCase().startsWith("SEM") && !parts[0].toUpperCase().startsWith("SEC")) {
            prog = parts[0];
        } else if (detailsBlob.placement?.profile?.Department) {
            prog = detailsBlob.placement.profile.Department;
        }

        // Fallbacks
        if (!sem && parts.length > 1) sem = parts[1];
        if (!sec && parts.length > 2) sec = parts[2];

        return { program: prog, semester: sem, section: sec };
    }, [classDetails, detailsBlob]);

    return (
        <div className="tab-content home-container">
            {/* ───────────────── 1. Professional Profile Card ───────────────── */}
            <div className="home-profile-card">
                {/* Top: Avatar + Greeting + Update */}
                <div className="home-profile-top">
                    <div className="home-profile-identity">
                        <div className="home-avatar">
                            <span className="home-avatar-text">
                                {(student?.name || "S")
                                    .split(" ")
                                    .filter(Boolean)
                                    .slice(0, 2)
                                    .map((w: string) => w[0])
                                    .join("")
                                    .toUpperCase()}
                            </span>
                        </div>
                        <div className="home-profile-greeting">
                            <h3 className="home-profile-name">{student?.name || "Student"}</h3>
                            <span className="home-profile-usn">{student?.usn || ""}</span>
                        </div>
                    </div>
                    <UpdateButton
                        onClick={handleUpdate}
                        isLoading={updateStatus === 'loading'}
                        cooldownActive={isCooldownActive}
                        formattedCooldown={formatTime}
                    />
                </div>

                {/* Divider */}
                <div className="home-profile-divider" />

                {/* Info Grid */}
                <div className="home-profile-info">
                    {program && (
                        <div className="home-info-item" style={{ animationDelay: '0.05s' }}>
                            <span className="home-info-label">Branch</span>
                            <span className="home-info-value">{program}</span>
                        </div>
                    )}
                    {semester && (
                        <div className="home-info-item" style={{ animationDelay: '0.1s' }}>
                            <span className="home-info-label">Semester</span>
                            <span className="home-info-value">{semester}</span>
                        </div>
                    )}
                    {section && (
                        <div className="home-info-item" style={{ animationDelay: '0.15s' }}>
                            <span className="home-info-label">Section</span>
                            <span className="home-info-value">{section}</span>
                        </div>
                    )}
                    <div className="home-info-item" style={{ animationDelay: '0.2s' }}>
                        <span className="home-info-label">CGPA</span>
                        <span className="home-info-value home-info-highlight">{currentCgpa || "—"}<span className="home-info-sub">/10</span></span>
                    </div>
                    {student?.current_year && (
                        <div className="home-info-item" style={{ animationDelay: '0.25s' }}>
                            <span className="home-info-label">Year</span>
                            <span className="home-info-value">{student.current_year}</span>
                        </div>
                    )}
                    {student?.dob && (
                        <div className="home-info-item" style={{ animationDelay: '0.3s' }}>
                            <span className="home-info-label">DOB</span>
                            <span className="home-info-value">{student.dob}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* ───────────────── 2. Class Schedule ───────────────── */}
            <div className="home-timetable-card">
                <div className="home-tt-header">
                    <div className="home-tt-title-wrap">
                        <div className="home-tt-icon-pod">
                            <Clock size={18} />
                        </div>
                        <div>
                            <h3 className="home-tt-title">Today&apos;s Schedule</h3>
                            <div className="home-live-clock">
                                <span className="home-clock-date">{currentDateStr || "Loading..."}</span>
                                {currentTime && (
                                    <>
                                        <span className="home-clock-sep">·</span>
                                        <span className="home-clock-time">{currentTime}</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="home-tt-header-controls">
                        {availableBatches.length > 0 && (
                            <div className="home-batch-control">
                                <label htmlFor="batch-select" className="home-batch-label">Batch:</label>
                                <select
                                    id="batch-select"
                                    value={selectedBatch}
                                    onChange={(e) => handleBatchChange(e.target.value)}
                                    className="home-batch-select"
                                >
                                    <option value="ALL">All Batches</option>
                                    {availableBatches.map(b => (
                                        <option key={b} value={b}>{b}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {cleanedTimetable?.days && cleanedTimetable.days.length > 0 && (
                            <button
                                type="button"
                                className="home-tt-view-btn"
                                onClick={() => setShowFullTimetable(!showFullTimetable)}
                                aria-expanded={showFullTimetable}
                            >
                                <Calendar size={14} />
                                <span>{showFullTimetable ? "Hide Timetable" : "Full Timetable"}</span>
                                {showFullTimetable ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>
                        )}
                    </div>
                </div>

                {/* Classes Display */}
                {isAllTodayFinished ? (
                    <div className="home-classes-finished-card">
                        <div className="home-finished-icon-wrap">
                            <CheckCircle2 size={26} />
                        </div>
                        <div className="home-finished-text">
                            <h4>All done for today!</h4>
                            <p>{todayClasses.length} class{todayClasses.length !== 1 ? 'es' : ''} completed. Enjoy the rest of your day.</p>
                        </div>
                    </div>
                ) : nextTwoClasses.length > 0 ? (
                    <div className="home-next-classes-grid">
                        {nextTwoClasses.map(({ cls, status }, idx) => (
                            <div
                                key={`${cls.course_code}-${cls.time_start}-${idx}`}
                                className={`home-class-tile ${status === 'in-progress' ? 'ongoing-class' : ''}`}
                                style={{ animationDelay: `${0.1 + idx * 0.08}s` }}
                            >
                                <div className="home-class-top">
                                    <div className="home-card-time-badge">
                                        <span className="home-card-time-start">{formatTime12h(cls.time_start)}</span>
                                        <span className="home-card-time-sep">to</span>
                                        <span className="home-card-time-end">{formatTime12h(cls.time_end)}</span>
                                    </div>

                                    {status === 'in-progress' ? (
                                        <span className="home-class-status-pill ongoing">
                                            <span className="home-class-live-dot" />
                                            Ongoing
                                        </span>
                                    ) : (
                                        <span className="home-class-status-pill upcoming">
                                            {idx === 0 ? "Next Up" : "Upcoming"}
                                        </span>
                                    )}
                                </div>

                                <div className="home-class-main">
                                    <h4 className="home-class-name">{cls.course_name}</h4>
                                    <span className="home-class-code-tag">{cls.course_code}</span>
                                </div>

                                <div className="home-class-meta">
                                    {cls.room && (
                                        <span className="home-class-meta-item">
                                            <MapPin size={12} />
                                            <span>{cls.room}</span>
                                        </span>
                                    )}
                                    {cls.faculty && (
                                        <span className="home-class-meta-item">
                                            <User size={12} />
                                            <span>{cls.faculty}</span>
                                        </span>
                                    )}
                                    {cls.batch && (
                                        <span className="home-class-meta-item">
                                            <Layers size={12} />
                                            <span>{cls.batch}</span>
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="home-empty-schedule">
                        <Calendar size={24} style={{ opacity: 0.4, marginBottom: 4 }} />
                        <p style={{ margin: 0 }}>No classes scheduled for today{selectedBatch !== "ALL" ? ` (${selectedBatch})` : ""}.</p>
                    </div>
                )}

                {/* ───────────────── Full Timetable Expander ───────────────── */}
                {showFullTimetable && cleanedTimetable?.days && (
                    <div className="home-full-timetable-wrap">
                        {/* Day Selector Tabs */}
                        <div className="home-tt-day-tabs">
                            {DAY_ORDER.filter(day => cleanedTimetable.days.some(d => d.day === day)).map(day => {
                                const isCurrentDay = day === todayName;
                                const isSelected = day === selectedDay;
                                return (
                                    <button
                                        key={day}
                                        type="button"
                                        className={`home-tt-day-tab ${isSelected ? 'active' : ''} ${isCurrentDay ? 'today' : ''}`}
                                        onClick={() => setSelectedDay(day)}
                                    >
                                        <span>{DAY_SHORT[day] || day}</span>
                                        {isCurrentDay && <span style={{ marginLeft: 4, fontSize: 10, opacity: 0.8 }}>(Today)</span>}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Classes for Selected Day (Filtered by Batch) */}
                        {selectedDayClasses.length > 0 ? (
                            <div className="home-tt-classes-list">
                                {selectedDayClasses.map((cls, idx) => {
                                    const status = getClassStatus(cls.time_start, cls.time_end, isToday);
                                    const isOngoing = isToday && status === 'in-progress';

                                    return (
                                        <div 
                                            key={`${cls.course_code}-${cls.time_start}-${idx}`} 
                                            className={`home-tt-period-row ${isOngoing ? 'ongoing-period' : ''}`}
                                        >
                                            {/* Column 1: Course Info */}
                                            <div className="home-tt-period-left">
                                                <h5 className="home-tt-period-name">{cls.course_name}</h5>
                                                <div className="home-tt-period-code">{cls.course_code}</div>
                                                <div className="home-tt-period-meta">
                                                    {cls.faculty && (
                                                        <span className="home-meta-item">
                                                            <User size={11} />
                                                            {cls.faculty}
                                                        </span>
                                                    )}
                                                    {cls.batch && (
                                                        <span className="home-batch-chip">{cls.batch}</span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Column 2 (Middle on Desktop): Highlighted Start Time & End Time */}
                                            <div className="home-tt-period-middle">
                                                <div className="home-period-time-badge">
                                                    <span className="home-time-start-hl">{formatTime12h(cls.time_start)}</span>
                                                    <span className="home-time-to-sub">to</span>
                                                    <span className="home-time-end-hl">{formatTime12h(cls.time_end)}</span>
                                                </div>
                                            </div>

                                            {/* Column 3: Room Number & Ongoing Status at Right End */}
                                            <div className="home-tt-period-right">
                                                {isOngoing && (
                                                    <span className="home-class-status-pill ongoing">
                                                        <span className="home-class-live-dot" />
                                                        Ongoing
                                                    </span>
                                                )}
                                                {cls.room && (
                                                    <div className="home-tt-room-end">
                                                        <MapPin size={12} />
                                                        <span>{cls.room}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="home-empty-schedule">
                                No classes scheduled for {DAY_SHORT[selectedDay] || selectedDay} {selectedBatch !== "ALL" ? `(${selectedBatch})` : ""}.
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default React.memo(HomeSection);
