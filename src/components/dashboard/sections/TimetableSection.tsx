"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
    Clock, Calendar, CheckCircle2, Circle, MapPin, User, BookOpen,
    ChevronRight, Zap, Coffee, AlertCircle
} from "lucide-react";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import "@/styles/Timetable.css";

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

interface TimetableSectionProps {
    studentName?: string;
    timetableData?: TimetableData | null;
}

const DAY_ORDER = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
const DAY_SHORT: Record<string, string> = {
    MONDAY: "Mon", TUESDAY: "Tue", WEDNESDAY: "Wed",
    THURSDAY: "Thu", FRIDAY: "Fri", SATURDAY: "Sat", SUNDAY: "Sun"
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

const formatTime12h = (time24: string): string => {
    const [h, m] = time24.split(":").map(Number);
    const period = h >= 12 ? "PM" : "AM";
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${h12}:${m.toString().padStart(2, "0")} ${period}`;
};

const getTodayDayName = (): string => {
    const days = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
    return days[new Date().getDay()];
};

const StatusIcon = ({ status }: { status: "completed" | "in-progress" | "upcoming" }) => {
    switch (status) {
        case "completed":
            return <CheckCircle2 size={16} className="tt-status-icon completed" />;
        case "in-progress":
            return <div className="tt-pulse-dot" />;
        case "upcoming":
            return <Circle size={16} className="tt-status-icon upcoming" />;
    }
};

const TimetableSection: React.FC<TimetableSectionProps> = ({ studentName, timetableData }) => {
    const todayName = getTodayDayName();
    const [selectedDay, setSelectedDay] = useState<string>(todayName);
    const [, setTick] = useState(0);

    // Auto-refresh time-based status every 60 seconds
    useEffect(() => {
        const interval = setInterval(() => setTick(t => t + 1), 60000);
        return () => clearInterval(interval);
    }, []);

    // Deduplicate days client-side (handles cached data that may have duplicates)
    const cleanedTimetable = useMemo(() => {
        if (!timetableData?.days) return timetableData;
        const dayMap = new Map<string, TimetableDay>();
        for (const d of timetableData.days) {
            if (dayMap.has(d.day)) {
                const existing = dayMap.get(d.day)!;
                // Merge classes and deduplicate
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

    // Set default selected day to today if available in timetable, otherwise first day
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

    const selectedDayData = useMemo(() => {
        return cleanedTimetable?.days?.find(d => d.day === selectedDay) || null;
    }, [cleanedTimetable, selectedDay]);

    const isToday = selectedDay === todayName;

    const todayStats = useMemo(() => {
        if (!selectedDayData || !isToday) return null;
        const classes = selectedDayData.classes;
        const completed = classes.filter(c => getClassStatus(c.time_start, c.time_end, true) === "completed").length;
        const inProgress = classes.filter(c => getClassStatus(c.time_start, c.time_end, true) === "in-progress").length;
        const upcoming = classes.filter(c => getClassStatus(c.time_start, c.time_end, true) === "upcoming").length;
        const nextClass = classes.find(c => getClassStatus(c.time_start, c.time_end, true) === "upcoming");
        const currentClass = classes.find(c => getClassStatus(c.time_start, c.time_end, true) === "in-progress");
        return { completed, inProgress, upcoming, total: classes.length, nextClass, currentClass };
    }, [selectedDayData, isToday]);

    // Empty state
    if (!cleanedTimetable || !cleanedTimetable.days || cleanedTimetable.days.length === 0) {
        return (
            <div className="tab-content">
                <DashboardHeader
                    name={studentName}
                    sectionTitle="Weekly Timetable"
                    sectionSubtitle="Your class schedule at a glance"
                />
                <div className="tt-empty-state">
                    <div className="tt-empty-icon">
                        <Calendar size={48} />
                    </div>
                    <h3>No Timetable Available</h3>
                    <p>Your timetable data hasn&apos;t been synced yet. Click <strong>&quot;Update Data&quot;</strong> in the Current Semester tab to fetch your latest timetable from the portal.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="tab-content">
            <DashboardHeader
                name={studentName}
                sectionTitle="Weekly Timetable"
                sectionSubtitle="Your class schedule at a glance"
            />

            {/* Today's Quick Stats */}
            {isToday && todayStats && (
                <div className="tt-today-stats">
                    <div className="tt-stat-pill">
                        <BookOpen size={14} />
                        <span><strong>{todayStats.total}</strong> classes today</span>
                    </div>
                    <div className="tt-stat-pill completed">
                        <CheckCircle2 size={14} />
                        <span><strong>{todayStats.completed}</strong> completed</span>
                    </div>
                    {todayStats.inProgress > 0 && (
                        <div className="tt-stat-pill in-progress">
                            <Zap size={14} />
                            <span><strong>{todayStats.inProgress}</strong> in progress</span>
                        </div>
                    )}
                    {todayStats.upcoming > 0 && (
                        <div className="tt-stat-pill upcoming">
                            <Clock size={14} />
                            <span><strong>{todayStats.upcoming}</strong> remaining</span>
                        </div>
                    )}
                </div>
            )}

            {/* Currently in Progress Banner */}
            {isToday && todayStats?.currentClass && (
                <div className="tt-current-class-banner">
                    <div className="tt-current-pulse" />
                    <div className="tt-current-info">
                        <span className="tt-current-label">NOW IN CLASS</span>
                        <span className="tt-current-name">{todayStats.currentClass.course_code} — {todayStats.currentClass.course_name}</span>
                        <span className="tt-current-meta">
                            <MapPin size={12} /> {todayStats.currentClass.room} · <User size={12} /> {todayStats.currentClass.faculty} · {formatTime12h(todayStats.currentClass.time_start)} – {formatTime12h(todayStats.currentClass.time_end)}
                        </span>
                    </div>
                </div>
            )}

            {/* Day Selector Tabs */}
            <div className="tt-day-selector">
                {DAY_ORDER.map(day => {
                    const hasData = cleanedTimetable!.days.some(d => d.day === day);
                    const dayData = cleanedTimetable!.days.find(d => d.day === day);
                    const classCount = dayData?.classes?.length || 0;
                    return (
                        <button
                            type="button"
                            key={day}
                            className={`tt-day-tab ${selectedDay === day ? "active" : ""} ${day === todayName ? "today" : ""} ${!hasData ? "disabled" : ""}`}
                            onClick={() => hasData && setSelectedDay(day)}
                            disabled={!hasData}
                        >
                            <span className="tt-day-name">{DAY_SHORT[day]}</span>
                            {hasData && <span className="tt-day-count">{classCount}</span>}
                            {day === todayName && <span className="tt-today-dot" />}
                        </button>
                    );
                })}
            </div>

            {/* Day Header */}
            {selectedDayData && (
                <div className="tt-day-header">
                    <h3 className="tt-day-title">
                        {selectedDayData.day}
                        {isToday && <span className="tt-today-badge">TODAY</span>}
                    </h3>
                    {selectedDayData.date && (
                        <span className="tt-day-date">
                            <Calendar size={14} /> {selectedDayData.date}
                        </span>
                    )}
                </div>
            )}

            {/* Classes Timeline */}
            {selectedDayData && selectedDayData.classes.length > 0 ? (
                <div className="tt-timeline">
                    {selectedDayData.classes.map((cls, idx) => {
                        const status = getClassStatus(cls.time_start, cls.time_end, isToday);
                        const isNextClass = isToday && status === "upcoming" && 
                            !selectedDayData.classes.slice(0, idx).some(c => getClassStatus(c.time_start, c.time_end, true) === "upcoming");
                        
                        return (
                            <div
                                key={`${cls.course_code}-${cls.time_start}-${idx}`}
                                className={`tt-class-card ${status} ${isNextClass ? "next-class" : ""}`}
                            >
                                {/* Timeline connector */}
                                <div className="tt-timeline-track">
                                    <StatusIcon status={status} />
                                    {idx < selectedDayData.classes.length - 1 && (
                                        <div className={`tt-timeline-line ${status}`} />
                                    )}
                                </div>

                                {/* Class Content */}
                                <div className="tt-class-content">
                                    <div className="tt-class-time-row">
                                        <span className="tt-class-time">
                                            <Clock size={13} />
                                            {formatTime12h(cls.time_start)} – {formatTime12h(cls.time_end)}
                                        </span>
                                        {isNextClass && (
                                            <span className="tt-next-badge">
                                                <ChevronRight size={12} /> NEXT
                                            </span>
                                        )}
                                        {status === "in-progress" && (
                                            <span className="tt-live-badge">
                                                <Zap size={12} /> LIVE
                                            </span>
                                        )}
                                        {status === "completed" && (
                                            <span className="tt-done-badge">DONE</span>
                                        )}
                                    </div>

                                    <div className="tt-class-title-row">
                                        {cls.course_code && (
                                            <span className="tt-course-code">{cls.course_code}</span>
                                        )}
                                        <span className="tt-course-name">{cls.course_name}</span>
                                    </div>

                                    <div className="tt-class-meta">
                                        {cls.faculty && (
                                            <span className="tt-meta-item">
                                                <User size={13} /> {cls.faculty}
                                            </span>
                                        )}
                                        {cls.room && (
                                            <span className="tt-meta-item">
                                                <MapPin size={13} /> {cls.room}
                                            </span>
                                        )}
                                        {cls.batch && (
                                            <span className="tt-meta-item batch">
                                                <AlertCircle size={13} /> {cls.batch}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : selectedDayData ? (
                <div className="tt-no-classes">
                    <Coffee size={32} />
                    <p>No classes scheduled for {selectedDayData.day.charAt(0) + selectedDayData.day.slice(1).toLowerCase()}</p>
                </div>
            ) : null}

            {/* Week Overview - compact grid */}
            <div className="tt-week-overview">
                <h3 className="tt-week-title">Week Overview</h3>
                <div className="tt-week-grid">
                    {cleanedTimetable!.days.map(day => (
                        <div
                            key={day.day}
                            className={`tt-week-day-card ${day.day === selectedDay ? "selected" : ""} ${day.day === todayName ? "today" : ""}`}
                            onClick={() => setSelectedDay(day.day)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => e.key === "Enter" && setSelectedDay(day.day)}
                        >
                            <div className="tt-week-day-header">
                                <span className="tt-week-day-name">{DAY_SHORT[day.day]}</span>
                                {day.day === todayName && <span className="tt-week-today-indicator" />}
                            </div>
                            <div className="tt-week-day-classes">
                                {day.classes.map((cls, i) => {
                                    const status = getClassStatus(cls.time_start, cls.time_end, day.day === todayName);
                                    return (
                                        <div key={i} className={`tt-week-class-dot ${status}`} title={`${cls.time_start} - ${cls.course_code || cls.course_name}`}>
                                            <span className="tt-week-class-time">{cls.time_start}</span>
                                            <span className="tt-week-class-code">{cls.course_code || cls.course_name.substring(0, 8)}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default TimetableSection;
