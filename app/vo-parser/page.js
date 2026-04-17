"use client";

import {useState, useEffect, useRef} from "react";
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

function parseEnglishName(html, pageName) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    for (const table of doc.querySelectorAll('table')) {
        const ruSpan = table.querySelector('span[lang="ru"]');
        if (!ruSpan) continue;
        const ruText = ruSpan.textContent.trim();
        if (ruText !== pageName && !pageName.startsWith(ruText)) continue;

        for (const row of table.querySelectorAll('tr')) {
            const cells = row.querySelectorAll('td');
            if (cells.length >= 2 && cells[0].textContent.trim().includes('Английский')) {
                for (const node of cells[1].childNodes) {
                    const text = node.textContent.trim();
                    if (text) return text;
                }
            }
        }
    }

    return null;
}

function parseCharacterList(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const span = doc.querySelector('#Играбельные_персонажи');
    if (!span) return [];

    const h2 = span.closest('h2');
    let table = null;
    let el = h2.nextElementSibling;
    while (el) {
        if (el.tagName === 'TABLE') { table = el; break; }
        if (el.tagName === 'H2') break;
        el = el.nextElementSibling;
    }

    if (!table) return [];

    const results = [];
    for (const row of table.querySelectorAll('tr')) {
        const firstCell = row.querySelector('td');
        if (!firstCell) continue;
        const link = Array.from(firstCell.querySelectorAll('a[title]')).find(a => a.textContent.trim());
        if (!link) continue;
        const name = link.textContent.trim();
        const href = link.getAttribute('href');
        if (name && href) {
            results.push({ name, url: 'https://honkai-star-rail.fandom.com' + href });
        }
    }
    return results;
}


export default function VoParser() {
    const [characterName, setCharacterName] = useState("")
    const [loading, setLoading] = useState({ en: false, ru: false });
    const [results, setResults] = useState({ en: [], ru: [] });
    const [error, setError] = useState({ en: null, ru: null });
    const [characters, setCharacters] = useState([]);
    const [loadingCharacters, setLoadingCharacters] = useState(true);
    const [selectedUrl, setSelectedUrl] = useState(null);
    const [showDropdown, setShowDropdown] = useState(false);
    const inputRef = useRef(null);

    useEffect(() => {
        const listUrl = 'https://honkai-star-rail.fandom.com/ru/wiki/%D0%9F%D0%B5%D1%80%D1%81%D0%BE%D0%BD%D0%B0%D0%B6%D0%B8/%D0%A1%D0%BF%D0%B8%D1%81%D0%BE%D0%BA';
        fetch(`/api/fetch-page?url=${encodeURIComponent(listUrl)}`)
            .then(r => r.json())
            .then(data => {
                console.log('data', data);
                if (!data.error) {
                    const chars = parseCharacterList(data.html);
                    setCharacters(chars);
                }
                setLoadingCharacters(false);
            })
    }, []);

    async function handleParse() {
        if (!selectedUrl) return;
        setLoading({ en: true, ru: true });
        setError({ en: null, ru: null });

        try {
            const url = selectedUrl;
            const baseRes = await fetch(`/api/fetch-page?url=${encodeURIComponent(url)}`);
            const baseData = await baseRes.json();
            if (baseData.error) throw new Error(baseData.error);

            const pageName = decodeURIComponent(url.split('/wiki/')[1]).replace(/_/g, ' ');
            const enName = parseEnglishName(baseData.html, pageName);
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
                    <div className={styles.inputWrapper}>
                        <input
                            ref={inputRef}
                            className={styles.input}
                            placeholder="Выбери персонажа..."
                            value={characterName}
                            onChange={(e) => { setCharacterName(e.target.value); setSelectedUrl(null); }}
                            onFocus={() => setShowDropdown(true)}
                            onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                        />
                        {showDropdown && (
                            <div className={styles.dropdown}>
                                {loadingCharacters
                                    ? <div className={styles.dropdownLoading}>Загрузка...</div>
                                    : characters
                                        .filter(c => c.name.toLowerCase().includes(characterName.toLowerCase()))
                                        .map((c, i) => (
                                            <div
                                                key={i}
                                                className={styles.dropdownItem}
                                                onMouseDown={() => {
                                                    setCharacterName(c.name);
                                                    setSelectedUrl(c.url);
                                                    setShowDropdown(false);
                                                }}
                                            >
                                                {c.name}
                                            </div>
                                        ))
                                }
                            </div>
                        )}
                    </div>
                    <button className={styles.button} onClick={handleParse}>
                        {loading.en || loading.ru ? "Загрузка..." : "Разобрать"}
                    </button>
                </div>

                {(error.en || error.ru) && (
                    <span className={styles.error}>{error.en || error.ru}</span>
                )}
                {(loading.en || loading.ru) && (
                    <div className={styles.spinnerRow}>
                        <div className={styles.spinner} />
                    </div>
                )}

                {!loading.en && !loading.ru && results.en.length > 0 && (
                    <table className={styles.table}>
                        <tbody>
                            {results.en.map((item, i) => (
                                <tr key={i} className={styles.tableRow}>
                                    <td className={styles.tdTitle}>{item.title}</td>
                                    <td className={styles.tdEn}>
                                        <span
                                            className={styles.rowLink}
                                            onClick={() => new Audio(`/api/download?url=${encodeURIComponent(item.url)}`).play()}
                                        >
                                            {item.text}
                                        </span>
                                    </td>
                                    <td className={styles.tdDownload}>
                                        <a
                                            className={styles.downloadButton}
                                            href={`/api/download?url=${encodeURIComponent(item.url)}`}
                                            download
                                        >
                                            <svg viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M12 4a1 1 0 0 1 1 1v10.586l3.293-3.293a1 1 0 0 1 1.414 1.414l-5 5a1 1 0 0 1-1.414 0l-5-5a1 1 0 0 1 1.414-1.414L11 15.586V5a1 1 0 0 1 1-1z"/>
                                            </svg>
                                        </a>
                                    </td>
                                    <td className={styles.tdRuTitle}>{results.ru[i]?.title}</td>
                                    <td className={styles.tdRu}>{results.ru[i]?.text}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </main>
    );
}