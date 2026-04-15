"use client";

import {useState} from "react";
import styles from "./page.module.scss";
import {capitalize} from "@/app/utils/capitalize";

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

function parseEnglishName(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    const span = doc.querySelector('#На_других_языках');
    const heading = span?.closest('h2, h3');

    let table = null;
    if (heading) {
        let el = heading.nextElementSibling;
        while (el) {
            if (el.tagName === 'TABLE') { table = el; break; }
            if (/^H[23]$/.test(el.tagName)) break;
            el = el.nextElementSibling;
        }
    }

    if (!table) {
        table = doc.querySelector('table.article-table');
    }

    if (!table) return null;

    for (const row of table.querySelectorAll('tr')) {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 2 && cells[0].textContent.trim().includes('Английский')) {
            return cells[1].textContent.trim();
        }
    }

    return null;
}

export default function VoParser() {
    const [characterName, setCharacterName] = useState("")
    const [loading, setLoading] = useState({ en: false, ru: false });
    const [results, setResults] = useState({ en: [], ru: [] });
    const [error, setError] = useState({ en: null, ru: null });

    async function handleParse() {
        setLoading({ en: true, ru: true });
        setError({ en: null, ru: null });

        try {
            const url = `https://honkai-star-rail.fandom.com/ru/wiki/${capitalize(characterName.trim())}`;
            const baseRes = await fetch(`/api/fetch-page?url=${encodeURIComponent(url)}`);
            const baseData = await baseRes.json();
            if (baseData.error) throw new Error(baseData.error);

            const enName = parseEnglishName(baseData.html);
            if (!enName) throw new Error("Не удалось найти английское название");

            const enUrl = `https://honkai-star-rail.fandom.com/wiki/${encodeURIComponent(enName)}/Voice-Overs`;
            const ruUrl = url + `/${encodeURIComponent("Лор")}`;

            await Promise.all([
                fetch(`/api/fetch-page?url=${encodeURIComponent(enUrl)}`)
                    .then(r => r.json())
                    .then(data => {
                        if (data.error) throw new Error(data.error);
                        setResults(prev => ({ ...prev, en: parseVoiceTable(data.html) }));
                    })
                    .catch(e => setError(prev => ({ ...prev, en: e.message }))),

                fetch(`/api/fetch-page?url=${encodeURIComponent(ruUrl)}`)
                    .then(r => r.json())
                    .then(data => {
                        if (data.error) throw new Error(data.error);
                        setResults(prev => ({ ...prev, ru: parseRuVoiceTable(data.html) }));
                    })
                    .catch(e => setError(prev => ({ ...prev, ru: e.message }))),
            ]);
        } catch (e) {
            setError({ en: e.message, ru: e.message });
        } finally {
            setLoading({ en: false, ru: false });
        }
    }

    return (
        <main className={styles.page}>
            <div className={styles.container}>
                <h1 className={styles.title}>Парсер реплик</h1>
                <div className={styles.inputRow}>
                    <input
                        className={styles.input}
                        placeholder="Введи имя персонажа на русском языке..."
                        value={characterName}
                        onChange={(e) => setCharacterName(e.target.value)}
                    />
                    <button className={styles.button} onClick={handleParse}>
                        {loading.en || loading.ru ? "Загрузка..." : "Разобрать"}
                    </button>
                </div>

                {(error.en || error.ru) && (
                    <span className={styles.error}>{error.en || error.ru}</span>
                )}
                <div className={styles.columns}>
                    <div className={styles.column}>
                        {!loading.en && !loading.ru && results.en.map((item, i) => (
                            <div key={i} className={styles.row}>
                                <span className={styles.rowTitle}>{item.title} - </span>
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
                    <div className={`${styles.spinnerCol} ${loading.en || loading.ru ? styles.visible : ""}`}>
                        <div className={styles.spinner} />
                    </div>
                    <div className={styles.column}>
                        {!loading.en && !loading.ru && results.ru.map((item, i) => (
                            <div key={i} className={styles.row}>
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