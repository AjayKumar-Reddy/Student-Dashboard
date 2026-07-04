"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
    const router = useRouter();

    useEffect(() => {
        const sid = localStorage.getItem("studentSessionId");
        const usn = localStorage.getItem("studentUsn");
        if (sid && usn) {
            router.replace("/student/dashboard");
        } else {
            router.replace("/student-login");
        }
    }, [router]);

    return (
        <div style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "100vh",
            background: "var(--bg-primary, #0A0A0A)",
            color: "var(--text-muted, #64748b)",
            fontFamily: "var(--font-inter), sans-serif"
        }}>
            Redirecting to student login...
        </div>
    );
}
