"use client";

import { useState } from "react";
import styles from "./page.module.scss";

function parseVoiceTable(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const results = [];
    let currentTitle = "";

    const combatHeading = doc.querySelector("#Combat");
    if (!combatHeading) return results;

    const h2 = combatHeading.closest("h2");
    let table = null;
    let el = h2.nextElementSibling;

    while (el) {
        if (el.tagName === "TABLE") { table = el; break; }
        if (el.tagName === "H2") break;
        el = el.nextElementSibling;
    }

    if (!table) return results;

    const rows = table.querySelectorAll("tr:not(.mobile-only)");

    for (const row of rows) {
        const th = row.querySelector("th.hidden");
        if (th) currentTitle = th.textContent.trim();

        const td = row.querySelector("td");
        if (!td || !currentTitle) continue;

        const segments = td.innerHTML.split(/<br\s*\/?>/i);

        for (const segment of segments) {
            const segDoc = parser.parseFromString(segment, "text/html");

            const audio = segDoc.querySelector("audio");
            if (!audio) continue;

            const url = audio.getAttribute("src");
            if (!url || url.includes("_2x")) continue;

            const textSpan = segDoc.querySelector('span[lang="en"]');
            const text = textSpan ? textSpan.textContent.trim() : "";

            if (text) results.push({ title: currentTitle, text, url });
        }
    }

    return results;
}

export default function VoParser() {
    const [url, setUrl] = useState("");
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    async function handleParse() {
        setLoading(true);
        setError(null);
        setResults([]);

        try {
            const res = await fetch(`/api/fetch-page?url=${encodeURIComponent(url)}`);
            const data = await res.json();

            if (data.error) throw new Error(data.error);

            setResults(parseVoiceTable(data.html));
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className={styles.page}>
            <div className={styles.container}>
                <h1 className={styles.title}>VO Parser</h1>

                <input
                    className={styles.input}
                    placeholder="Вставь ссылку на страницу wiki..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                />

                <button className={styles.button} onClick={handleParse} disabled={loading}>
                    {loading ? "Загрузка..." : "Разобрать"}
                </button>

                {error && <span className={styles.error}>{error}</span>}

                {results.map((item, i) => (
                    <div key={i} className={styles.row}>
                        <span className={styles.rowTitle}>{item.title}:</span>
                        <span
                            className={styles.rowLink}
                            onClick={() => new Audio(item.url).play()}
                        >
                            {item.text}
                        </span>
                        <a
                            className={styles.downloadButton}
                            href={`/api/download?url=${encodeURIComponent(item.url)}`}
                            download
                        >
                            <svg viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 4a1 1 0 0 1 1 1v10.586l3.293-3.293a1 1 0 0 1 1.414 1.414l-5 5a1 1 0 0 1-1.414 0l-5-5a1 1 0 0 1 1.414-1.414L11 15.586V5a1 1 0 0 1 1-1z"/>
                            </svg>
                        </a>
                    </div>
                ))}
            </div>
        </main>
    );
}