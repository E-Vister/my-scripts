"use client";

import {useState} from "react";
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
        if (el.tagName === "TABLE") {
            table = el;
            break;
        }
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

            if (text) results.push({title: currentTitle, text, url});
        }
    }

    return results;
}

function parseRuVoiceTable(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const results = [];

    const span = doc.querySelector('#Сражение');
    const sectionHeading = span?.closest('h2, h3');
    if (!sectionHeading) return results;

    let el = sectionHeading.nextElementSibling;
    while (el) {
        if (el.tagName === "TABLE") {
            const rows = el.querySelectorAll("tr");
            for (const row of rows) {
                const cells = row.querySelectorAll("td");
                if (cells.length >= 2) {
                    results.push({
                        title: cells[0].textContent.trim(),
                        text: cells[1].textContent.trim(),
                    });
                }
            }
            break;
        }
        if (el.tagName === "H2" || el.tagName === "H3") break;
        el = el.nextElementSibling;
    }

    return results;
}

export default function VoParser() {
    const [enUrl, setEnUrl] = useState("");
    const [ruUrl, setRuUrl] = useState("");
    const [loading, setLoading] = useState({ en: false, ru: false });
    const [results, setResults] = useState({ en: [], ru: [] });
    const [error, setError] = useState({ en: null, ru: null });

    async function handleParse(url, lang) {
        setLoading(prev => ({ ...prev, [lang]: true }));
        setError(prev => ({ ...prev, [lang]: null }));

        try {
            console.log(url)
            const res = await fetch(`/api/fetch-page?url=${encodeURIComponent(url)}`);
            const data = await res.json();
            if (data.error) throw new Error(data.error);

            const parsed = lang === "ru"
                ? parseRuVoiceTable(data.html)
                : parseVoiceTable(data.html);

            setResults(prev => ({ ...prev, [lang]: parsed }));
        } catch (e) {
            setError(prev => ({ ...prev, [lang]: e.message }));
        } finally {
            setLoading(prev => ({ ...prev, [lang]: false }));
        }
    }

    return (
        <main className={styles.page}>
            <div className={styles.container}>
                <h1 className={styles.title}>VO Parser</h1>
                <div className={styles.columns}>

                    <div className={styles.column}>
                        <input
                            className={styles.input}
                            placeholder="Вставь ссылку на EN страницу wiki..."
                            value={enUrl}
                            onChange={(e) => setEnUrl(e.target.value)}
                        />

                        <button className={styles.button} onClick={() => handleParse(enUrl, "en")}>
                            {loading.en ? "Загрузка..." : "Разобрать"}
                        </button>

                        {error.en && <span className={styles.error}>{error.en}</span>}

                        {results.en.map((item, i) => (
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

                    <div className={styles.column}>
                        <input
                            className={styles.input}
                            placeholder="Вставь ссылку на RU страницу wiki..."
                            value={ruUrl}
                            onChange={(e) => setRuUrl(e.target.value)}
                        />
                        <button className={styles.button} onClick={() => handleParse(ruUrl + "/%D0%9B%D0%BE%D1%80", "ru")}>
                            {loading.ru ? "Загрузка..." : "Разобрать"}
                        </button>

                        {results.ru.map((item, i) => (
                            <div key={i} className={styles.rowRu}>
                                <span className={styles.rowTitle}>{item.title} - </span>
                                <span className={styles.rowLink}>{item.text}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </main>
    );
}