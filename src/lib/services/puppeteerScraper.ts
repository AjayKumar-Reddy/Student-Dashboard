import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import axios from 'axios';
import https from 'https';
import { syncStudents } from './studentService';

// ---- Normalization Logic ----
class DataNormalizer {
    static standardizeAssessmentType(rawName: string): string {
        if (!rawName) return "";
        const name = rawName.toUpperCase().trim();
        
        if (/T\s*1/.test(name) || name === "T1") return "T1";
        if (/T\s*2/.test(name) || name === "T2") return "T2";
        if (/T\s*3/.test(name) || name === "T3") return "T3";
        if (/T\s*4/.test(name) || name === "T4") return "T4";
        
        if (/A\/Q\s*1/.test(name) || /AQ\s*1/.test(name)) return "AQ1";
        if (/A\/Q\s*2/.test(name) || /AQ\s*2/.test(name)) return "AQ2";
        if (/A\/Q\s*3/.test(name) || /AQ\s*3/.test(name)) return "AQ3";
            
        if (name.includes("FINAL") && name.includes("CIE")) {
            return "FINAL CIE";
        }
            
        return "";
    }

    static isValidNumeric(val: any): boolean {
        if (val === null || val === undefined) return false;
        if (typeof val === 'number') return !isNaN(val);
        if (typeof val === 'string') {
            const cleanVal = val.trim();
            if (cleanVal === "" || cleanVal === "-" || cleanVal === " - ") return false;
            const parsed = parseFloat(cleanVal);
            return !isNaN(parsed);
        }
        return false;
    }

    static normalizeStudentRecord(scrapedRecord: any): any {
        const currentSem = scrapedRecord.current_semester || [];
        const normalizedSubjects: any[] = [];

        for (const entry of currentSem) {
            const subjectCode = entry.code || "N/A";
            const subjectName = entry.name || "Unknown Subject";
            
            // Attendance Object
            const attDetails = entry.attendance_details || {};
            const present = parseInt(attDetails.present_classes || 0, 10);
            const absent = parseInt(attDetails.absent_classes || 0, 10);
            const remaining = parseInt(attDetails.still_to_go || 0, 10);
            
            const classesDetails = attDetails.classes || {};
            const presentDates = classesDetails.present_dates || [];
            const absentDates = classesDetails.absent_dates || [];
            
            const total = present + absent;
            const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
            
            const attendanceObj = {
                present,
                absent,
                remaining,
                percentage,
                present_dates: presentDates,
                absent_dates: absentDates
            };
            
            // Assessments
            const cieDetails = entry.cie_details || {};
            const rawTests = cieDetails.tests || [];
            const assessments: any[] = [];

            for (const t of rawTests) {
                const stdType = this.standardizeAssessmentType(t.test_name || "");
                if (!stdType) continue;
                
                const obtained = t.marks_obtained;
                const classAvg = t.class_average || 0;
                
                if (!this.isValidNumeric(obtained)) continue;
                
                const obtainedVal = parseFloat(obtained);
                const classAvgVal = this.isValidNumeric(classAvg) ? parseFloat(classAvg) : 0.0;
                
                assessments.push({
                    type: stdType,
                    obtained_marks: obtainedVal,
                    class_average: classAvgVal
                });
            }
            
            // Calculate Total Marks
            const getVal = (tType: string): number => {
                const a = assessments.find(x => x.type === tType);
                if (a) {
                    const val = parseFloat(a.obtained_marks);
                    return !isNaN(val) ? val : 0.0;
                }
                return 0.0;
            };

            const valT1 = getVal("T1");
            const valT2 = getVal("T2");
            const valAq1 = getVal("AQ1");
            const valAq2 = getVal("AQ2");

            const testAvg = (valT1 > 0 && valT2 > 0) ? Math.round((valT1 + valT2) / 2) : Math.max(valT1, valT2);
            const totalMarks = testAvg + valAq1 + valAq2;
            
            normalizedSubjects.push({
                code: String(subjectCode),
                name: String(subjectName),
                marks: totalMarks,
                attendance: percentage,
                attendance_details: attendanceObj,
                assessments: assessments
            });
        }

        const classDetails = scrapedRecord.class_details || "";
        const currentYear = DataNormalizer.deriveCurrentYearFromClassDetails(classDetails);

        return {
            usn: scrapedRecord.usn,
            name: scrapedRecord.name,
            class_details: scrapedRecord.class_details,
            cgpa: scrapedRecord.cgpa,
            last_updated: scrapedRecord.last_updated,
            current_year: currentYear,
            subjects: normalizedSubjects,
            exam_history: scrapedRecord.exam_history || [],
            placement: scrapedRecord.placement || null
        };
    }

    /** B.E. programme: year = ceil(semester / 2), e.g. SEM 06 → year 3 */
    static deriveCurrentYearFromClassDetails(classDetails: string): number {
        if (!classDetails || typeof classDetails !== "string") return 0;
        const m = classDetails.match(/\bSEM\s*0*(\d+)\b/i);
        if (!m) return 0;
        const sem = parseInt(m[1], 10);
        if (Number.isNaN(sem) || sem <= 0) return 0;
        return Math.ceil(sem / 2);
    }
}

const COURSE_CODE_RE = /^[0-9A-Z]{5,14}$/;

interface Course {
    code: string;
    name: string;
    attLink: string;
    cieLink: string;
}

const extractCourseRowsFromDashboard = ($dash: cheerio.CheerioAPI): Course[] => {
    const courses: Course[] = [];
    const pushRow = ($row: cheerio.Cheerio<any>) => {
        const cols = $row.find("td");
        if (cols.length < 2) return;
        const rawCode = $dash(cols[0]).text().trim().split(/\s+/)[0];
        const code = rawCode.replace(/[()]/g, "").toUpperCase();
        if (!COURSE_CODE_RE.test(code)) return;
        const name = $dash(cols[1]).text().trim();
        const attLink =
            $row.find('a[href*="task=attendencelist"], a[href*="attendencelist"]').first().attr("href") ||
            "";
        const cieLink =
            $row.find('a[href*="task=ciedetails"], a[href*="ciedetails"]').first().attr("href") || "";
        if (!attLink && !cieLink) return;
        courses.push({ code, name, attLink, cieLink });
    };

    $dash('table[class*="dash_od_row"] tbody tr').each((_, row) => {
        pushRow($dash(row));
    });

    if (courses.length === 0) {
        $dash("table tbody tr").each((_, row) => {
            const $row = $dash(row);
            if (!$row.find('a[href*="attendencelist"], a[href*="ciedetails"]').length) return;
            pushRow($row);
        });
    }

    if (courses.length === 0) {
        $dash("tr").each((_, row) => {
            const $row = $dash(row);
            const cols = $row.find("td");
            if (cols.length < 2) return;
            const rawCode = $dash(cols[0]).text().trim().split(/\s+/)[0];
            const code = rawCode.replace(/[()]/g, "").toUpperCase();
            if (!COURSE_CODE_RE.test(code)) return;
            const name = $dash(cols[1]).text().trim();
            const attLink =
                $row.find('a[href*="task=attendencelist"], a[href*="attendencelist"]').first().attr("href") ||
                "";
            const cieLink =
                $row.find('a[href*="task=ciedetails"], a[href*="ciedetails"]').first().attr("href") || "";
            courses.push({ code, name, attLink, cieLink });
        });
    }

    const seen = new Set<string>();
    return courses.filter((c) => {
        if (seen.has(c.code)) return false;
        seen.add(c.code);
        return true;
    });
};

const resolveParentsUrl = (href: string): string => {
    if (!href || typeof href !== "string") return "";
    const h = href.trim();
    if (h.startsWith("http://") || h.startsWith("https://")) return h;
    if (h.startsWith("/")) return `https://parents.msrit.edu${h}`;
    return `https://parents.msrit.edu/newparents/${h.replace(/^\.\//, "")}`;
};

/** Balanced-bracket extraction for `var chartData = [ ... ];` (CIE marks chart). */
const extractChartDataJsonArray = (html: string): string | null => {
    if (!html) return null;
    const markers = ["var chartData", "chartData"];
    for (const m of markers) {
        const startIdx = html.indexOf(m);
        if (startIdx === -1) continue;
        const from = html.indexOf("[", startIdx);
        if (from === -1) continue;
        let depth = 0;
        for (let i = from; i < html.length; i++) {
            const c = html[i];
            if (c === "[") depth++;
            else if (c === "]") {
                depth--;
                if (depth === 0) {
                    return html.slice(from, i + 1);
                }
            }
        }
    }
    return null;
};

// ---- Placement Scrapers ----
const parsePlacementEvents = (html: string): any[] => {
    if (!html) return [];
    const $ = cheerio.load(html);
    const events: any[] = [];

    // 1. Look for lists (standard for Contineo placement sections)
    const listItems = $('ul.cn-elig_list li, .cn-elig_list li');
    if (listItems.length > 0) {
        listItems.each((_, li) => {
            const $li = $(li);
            if ($li.find('.cn-noevents').length > 0 || 
                $li.text().includes("No Events available") || 
                $li.text().includes("No events") ||
                $li.hasClass('cn-noevents')) {
                return;
            }
            
            const lines = $li.text().split('\n').map(l => l.trim()).filter(l => l.length > 0);
            let title = $li.find('.elig_name').text().trim() || $li.find('h4').text().trim();
            if (!title && lines.length > 0) {
                if (lines[0].length === 1 && lines.length > 1) {
                    title = lines[1];
                } else {
                    title = lines[0];
                }
            }
            title = title || "Placement Opportunity";
            const actionLink = $li.find('a').attr('href') || '';
            
            // Collect other descriptive fields
            const details: string[] = [];
            $li.find('p, span, div').each((_, el) => {
                const text = $(el).text().trim();
                // Exclude title text, single characters (logos), and file upload helpers
                if (text && text !== title && text.length > 1 && !text.includes("Choose file") && !text.includes("Upload")) {
                    details.push(text);
                }
            });
            
            events.push({
                title,
                details: Array.from(new Set(details)).slice(0, 10), // Unique details
                actionLink: actionLink ? resolveParentsUrl(actionLink) : ''
            });
        });
        
        if (events.length > 0) return events;
    }

    // 2. Fallback to general tables (just in case they render it in a table)
    const tables = $('table');
    if (tables.length > 0) {
        tables.each((_, table) => {
            const $table = $(table);
            const headers: string[] = [];
            $table.find('thead th, tr th').each((_, th) => {
                headers.push($(th).text().trim());
            });

            $table.find('tbody tr, tr').each((_, tr) => {
                const $tr = $(tr);
                if ($tr.find('th').length > 0) return; // skip header row
                const cols = $tr.find('td');
                if (cols.length === 0) return;

                const eventData: any = {};
                cols.each((i, td) => {
                    const header = headers[i] || `field_${i}`;
                    eventData[header] = $(td).text().trim();
                });
                
                const actionLink = $tr.find('a').attr('href') || '';
                if (actionLink) {
                    eventData.actionLink = resolveParentsUrl(actionLink);
                }
                
                if (Object.keys(eventData).length > 0) {
                    events.push(eventData);
                }
            });
        });
    }

    return events;
};

const parsePlacementProfile = (html: string): Record<string, string> => {
    if (!html) return {};
    const $ = cheerio.load(html);
    const profile: Record<string, string> = {};

    // 0. Scan custom .profile_info_row columns from placement profile page
    $('.profile_info_row').each((_, row) => {
        const $row = $(row);
        const label = $row.find('.profile_info_label').text().trim().replace(/:$/, '').trim();
        const value = $row.find('.profile_info_value').text().trim();
        if (label && value && label.length < 50 && value.length < 200) {
            profile[label] = value;
        }
    });

    // 1. Scan tables with 2 columns (labels and values)
    $('table tr').each((_, tr) => {
        const cols = $(tr).find('td, th');
        if (cols.length === 2) {
            const key = $(cols[0]).text().trim().replace(/:$/, '').trim();
            const value = $(cols[1]).text().trim();
            if (key && value && key.length < 50) {
                profile[key] = value;
            }
        }
    });

    // 2. Scan form control layouts
    $('.form-group, .uk-form-controls, div').each((_, group) => {
        const $group = $(group);
        const label = $group.find('label').text().trim().replace(/:$/, '').trim();
        const value = $group.find('input[type="text"], input[type="number"], select').val() || 
                      $group.find('.value, span, p').first().text().trim();
                      
        if (label && value && label.length < 50 && typeof value === 'string' && value.length < 200) {
            profile[label] = value;
        }
    });

    // 3. Scan input fields directly
    $('input[type="text"], input[type="email"], input[type="number"], select').each((_, input) => {
        const $input = $(input);
        const id = $input.attr('id') || '';
        const name = $input.attr('name') || '';
        const value = $input.val();
        
        // Find corresponding label
        let label = '';
        if (id) {
            label = $(`label[for="${id}"]`).text().trim().replace(/:$/, '').trim();
        }
        if (!label && name) {
            label = name;
        }
        if (label && value && typeof value === 'string') {
            profile[label] = value;
        }
    });

    // Clean up empty/duplicate keys
    const cleanProfile: Record<string, string> = {};
    for (const key in profile) {
        if (key && profile[key] && !key.toLowerCase().includes('token') && !key.toLowerCase().includes('submit')) {
            cleanProfile[key] = profile[key];
        }
    }

    return cleanProfile;
};

// ---- Scraping Logic ----
const getCompleteStudentData = async (usn: string, day: string, month: string, year: string) => {
    let browser;
    try {
        const browserlessToken = process.env.BROWSERLESS_TOKEN;
        if (browserlessToken) {
            console.log(`[*] Connecting to Browserless.io for USN: ${usn}...`);
            browser = await puppeteer.connect({
                browserWSEndpoint: `wss://chrome.browserless.io?token=${browserlessToken}`
            });
        } else {
            console.log(`[*] Launching local Puppeteer for USN: ${usn}...`);
            browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
        }
        const page = await browser.newPage();
        await page.setDefaultNavigationTimeout(60000); // 60 seconds
        await page.goto("https://parents.msrit.edu/newparents/", { waitUntil: 'domcontentloaded', timeout: 60000 });

        await page.type('#username', usn);
        await page.select('#dd', `${day} `);
        await page.select('#mm', month);
        await page.select('#yyyy', year);
        
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 }),
            page.evaluate(() => {
                const btn = document.querySelector('.cn-login-btn') as HTMLElement;
                if (btn) btn.click();
            })
        ]);

        const currentUrl = page.url();
        const content = await page.content();
        
        if (!currentUrl.toLowerCase().includes("dashboard") && !content.includes("Logout")) {
            throw new Error("Login failed or dashboard not loaded");
        }

        const scrapedData: any = { dashboard: content, attendance: {}, cie: {} };
        const cookies = await page.cookies();
        
        const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');

        // Close browser, switch to light HTTP requests
        await browser.close();
        browser = null;

        console.log("[*] Parsing Dashboard Course Table...");
        const $dash = cheerio.load(content);

        const courseRows = extractCourseRowsFromDashboard($dash);

        const urlToTargets = new Map<string, any[]>();
        const pushTarget = (href: string, courseCode: string, type: string) => {
            const url = resolveParentsUrl(href);
            if (!url) return;
            if (!urlToTargets.has(url)) urlToTargets.set(url, []);
            urlToTargets.get(url)?.push({ courseCode, type });
        };
        for (const row of courseRows) {
            if (row.attLink) pushTarget(row.attLink, row.code, "attendance");
            if (row.cieLink) pushTarget(row.cieLink, row.code, "cie");
        }

        const examsUrl = "https://parents.msrit.edu/newparents/index.php?option=com_history&task=getResult";
        urlToTargets.set(examsUrl, [{ courseCode: "EXAMS", type: "exams" }]);

        // Placement URLs
        const placementEligibilityUrl = "https://parents.msrit.edu/newparents/index.php?option=com_placement&controller=placement&task=placementeligibility";
        const placementStatusUrl = "https://parents.msrit.edu/newparents/index.php?option=com_placement&controller=placement&task=placementstatus";
        const placementResultsUrl = "https://parents.msrit.edu/newparents/index.php?option=com_placement&controller=placement&task=placementresults";
        const placementProfileUrl = "https://parents.msrit.edu/newparents/index.php?option=com_placement&controller=placement&task=getBasicprofiledetails";

        urlToTargets.set(placementEligibilityUrl, [{ courseCode: "PLACEMENT", type: "placement_eligibility" }]);
        urlToTargets.set(placementStatusUrl, [{ courseCode: "PLACEMENT", type: "placement_status" }]);
        urlToTargets.set(placementResultsUrl, [{ courseCode: "PLACEMENT", type: "placement_results" }]);
        urlToTargets.set(placementProfileUrl, [{ courseCode: "PLACEMENT", type: "placement_profile" }]);

        // HTTP Instance bypassing certs matching python session
        const axiosInstance = axios.create({
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                'Cookie': cookieString
            },
            httpsAgent: new https.Agent({ rejectUnauthorized: false })
        });

        const uniqueUrls = [...urlToTargets.keys()];
        const fetchPromises = uniqueUrls.map(async (url) => {
            try {
                await new Promise((r) => setTimeout(r, Math.random() * 400 + 100));
                const resp = await axiosInstance.get(url);
                return { url, html: resp.data };
            } catch (err) {
                return { url, html: "" };
            }
        });

        const fetched = await Promise.all(fetchPromises);
        const htmlByUrl = new Map(fetched.map((f) => [f.url, f.html]));

        for (const [url, targets] of urlToTargets) {
            const html = htmlByUrl.get(url) ?? "";
            for (const t of targets) {
                if (t.type === "exams") scrapedData.exams = html;
                else if (t.type === "attendance") scrapedData.attendance[t.courseCode] = html;
                else if (t.type === "cie") scrapedData.cie[t.courseCode] = html;
                else if (t.type === "placement_eligibility") scrapedData.placementEligibility = html;
                else if (t.type === "placement_status") scrapedData.placementStatus = html;
                else if (t.type === "placement_results") scrapedData.placementResults = html;
                else if (t.type === "placement_profile") scrapedData.placementProfile = html;
            }
        }

        return scrapedData;

    } catch (error: any) {
        console.error(`[X] Automation Error: ${error.message}`);
        return null;
    } finally {
        if (browser) await (browser as any).close();
    }
};

const parseAndProcessData = (scrapedData: any) => {
    if (!scrapedData) return null;

    const $dash = cheerio.load(scrapedData.dashboard);
    const name = $dash("h3").first().text().trim() || "Unknown";
    const usn = $dash("h2").first().text().trim() || "Unknown";
    const classInfo = $dash("p").first().text().trim() || "";

    const courseRows = extractCourseRowsFromDashboard($dash);

    const parseAttendanceHtml = (code: string) => {
        const details: any = { present_classes: 0, absent_classes: 0, still_to_go: 0, classes: { present_dates: [] as string[], absent_dates: [] as string[] } };
        const html = scrapedData.attendance?.[code];
        if (html) {
            const $ = cheerio.load(html);
            const mapping = [["present_classes", "cn-attend"], ["absent_classes", "cn-absent"], ["still_to_go", "cn-still"]];
            mapping.forEach(([key, cls]) => {
                const spanMatch = $(`span[class*="${cls}"]`).text().match(/\[(\d+)\]/);
                if (spanMatch) details[key] = parseInt(spanMatch[1], 10);
            });

            // Fallback when class names change: scan visible [n] counts near labels
            const bodyText = $.root().text();
            if (details.present_classes === 0) {
                const pm = bodyText.match(/present[^[]*\[(\d+)\]/i);
                if (pm) details.present_classes = parseInt(pm[1], 10);
            }
            if (details.absent_classes === 0) {
                const am = bodyText.match(/absent[^[]*\[(\d+)\]/i);
                if (am) details.absent_classes = parseInt(am[1], 10);
            }
            if (details.still_to_go === 0) {
                const rm = bodyText.match(/(?:still\s*to\s*go|remaining)[^[]*\[(\d+)\]/i);
                if (rm) details.still_to_go = parseInt(rm[1], 10);
            }

            $('table[class*="cn-attend-list1"] tbody tr, table[class*="attend-list1"] tbody tr').each((_, r) => {
                const cols = $(r).find("td");
                if (cols.length >= 2) details.classes.present_dates.push($(cols[1]).text().trim());
            });

            $('table[class*="cn-attend-list2"] tbody tr, table[class*="attend-list2"] tbody tr').each((_, r) => {
                const cols = $(r).find("td");
                if (cols.length >= 2) details.classes.absent_dates.push($(cols[1]).text().trim());
            });
        }
        return details;
    };

    const parseCieHtml = (code: string) => {
        let tests: any[] = [];
        let eligibility = "Unknown";
        const html = scrapedData.cie?.[code];
        
        if (html) {
            const $ = cheerio.load(html);
            const cieTable = $('table[class*="cn-cie-table"]');
            if (cieTable.length) {
                const headers = cieTable.find("thead th").map((_, el) => $(el).text().trim()).get();
                const idx = headers.indexOf("Eligibility");
                if (idx !== -1) {
                    const row = cieTable.find("tbody tr").first();
                    if (row.length && row.find("td").length > idx) {
                        eligibility = $(row.find("td")[idx]).text().trim();
                    }
                }
            }

            const chartJson = extractChartDataJsonArray(html);
            if (chartJson) {
                try {
                    const cleanedJson = chartJson.replace(/,\s*([}\]])/g, "$1");
                    const parsed = JSON.parse(cleanedJson);
                    tests = parsed.map((i: any) => ({
                        test_name: i.xaxis || "",
                        class_average: i.col1 || 0,
                        max_marks: i.col2 || 0,
                        marks_obtained: i.linevalue || 0,
                    }));
                } catch (e) {
                    // Ignore JSON parsing errors
                }
            }
        }
        return { tests, eligibility };
    };

    const currentSemesterData: any[] = [];
    for (const row of courseRows) {
        const att = parseAttendanceHtml(row.code);
        const { tests: cie, eligibility: elig } = parseCieHtml(row.code);
        currentSemesterData.push({
            code: row.code,
            name: row.name,
            eligibility: elig,
            attendance_details: att,
            cie_details: { tests: cie },
        });
    }

    const $exam = cheerio.load(scrapedData.exams || "");
    const cgpaP = $exam("p").filter((_, el) => /\d+\.\d+/.test($exam(el).text())).first();
    const finalCgpa = cgpaP.length ? cgpaP.text().trim() : "N/A";

    const semesterHistory: any[] = [];
    $exam("table.res-table").each((_, table) => {
        const cap = $exam(table).find("caption").text().replace(/\s+/g, " ").trim();
        const semName = cap.split("Credits")[0].trim();
        const sgpaMatch = cap.match(/SGPA:\s*(\d+\.\d+)/);
        const creditsMatch = cap.match(/Credits Earned\s*:\s*(\d+)/);
        
        const courses: any[] = [];
        $exam(table).find("tbody tr").each((_, r) => {
            const cols = $exam(r).find("td");
            if (cols.length >= 6) {
                courses.push({
                    code: $exam(cols[0]).text().trim(),
                    name: $exam(cols[1]).text().trim(),
                    gpa: $exam(cols[4]).text().trim(),
                    grade: $exam(cols[5]).text().trim()
                });
            }
        });

        semesterHistory.push({
            semester: semName,
            sgpa: sgpaMatch ? sgpaMatch[1] : "N/A",
            credits_earned: creditsMatch ? creditsMatch[1] : "N/A",
            courses
        });
    });

    const studentRecord = {
        name,
        usn,
        class_details: classInfo,
        cgpa: finalCgpa,
        last_updated: new Date().toISOString(),
        current_semester: currentSemesterData,
        exam_history: semesterHistory,
        placement: {
            profile: parsePlacementProfile(scrapedData.placementProfile),
            eligibilityEvents: parsePlacementEvents(scrapedData.placementEligibility),
            inProgressEvents: parsePlacementEvents(scrapedData.placementStatus),
            completedEvents: parsePlacementEvents(scrapedData.placementResults)
        }
    };

    const normalized = DataNormalizer.normalizeStudentRecord(studentRecord);
    return normalized;
};

// Helper for parsing DOB "DD-MM-YYYY" or "YYYY-MM-DD"
const parseDobParts = (dobString: any) => {
    if (dobString instanceof Date) {
        return {
            day: String(dobString.getDate()).padStart(2, '0'),
            month: String(dobString.getMonth() + 1).padStart(2, '0'),
            year: String(dobString.getFullYear())
        };
    }
    
    if (typeof dobString === 'string') {
        const parts = dobString.split(/[-/]/);
        if (parts.length === 3) {
            if (parts[0].length === 4) {
                return { day: parts[2].padStart(2, '0'), month: parts[1].padStart(2, '0'), year: parts[0] };
            } else {
                return { day: parts[0].padStart(2, '0'), month: parts[1].padStart(2, '0'), year: parts[2] };
            }
        }
        
        const d = new Date(dobString);
        if (!isNaN(d.valueOf())) {
            return {
                day: String(d.getDate()).padStart(2, '0'),
                month: String(d.getMonth() + 1).padStart(2, '0'),
                year: String(d.getFullYear())
            };
        }
    }
    throw new Error("Invalid DOB format");
};

export const scrapeAndSyncStudent = async (usn: string, dob: string) => {
    const { day, month, year } = parseDobParts(dob);
    console.log(`[Scraper] Starting scrape for ${usn} with DOB ${day}-${month}-${year}`);
    
    const scrapedData = await getCompleteStudentData(usn, day, month, year);
    if (!scrapedData) {
        throw new Error(`Failed to scrape data for USN: ${usn}`);
    }

    console.log("[Scraper] Normalizing parsed data...");
    const normalizedData = parseAndProcessData(scrapedData);

    if (normalizedData) {
        console.log(`[Scraper] Syncing ${usn} to database...`);
        normalizedData.dob = dob; // Inject dob for the upsert
        await syncStudents({ [usn]: normalizedData });
        return normalizedData;
    }
    throw new Error("Failed to parse and normalize the scraped data.");
};

export default { scrapeAndSyncStudent };
