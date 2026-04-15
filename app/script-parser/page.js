"use client";

import {useState} from "react";
import styles from "./page.module.scss";
import {pluralize} from "@/app/utils/pluralize";

function parseScript(text) {
    const characters = {};
    const castMatch = text.match(/ДЕЙСТВУЮЩИЕ ЛИЦА[:\s]*([\s\S]*?)(?:\n_|\n\s*\n)/);
    const characterNames = [];

    if (castMatch) {
        const castBlock = castMatch[1];
        for (const line of castBlock.split("\n")) {
            const name = line.split(/\s*[-–—@]/)[0].trim();
            if (name) {
                characterNames.push(name);
                characters[name] = [];
            }
        }
    }

    const namePattern = characterNames
        .map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
        .join("|");

    if (!namePattern) return characters;

    const lineRegex = new RegExp(`^(${namePattern}):\\s*(.+)`, "m");

    for (const line of text.split("\n")) {
        const match = line.match(lineRegex);
        if (match) {
            characters[match[1]].push(match[2].trim());
        }
    }

    return characters;
}

export default function ScriptParser() {
    const [input, setInput] = useState("");
    const [result, setResult] = useState(null);
    const [copied, setCopied] = useState(false);
    const [expanded, setExpanded] = useState(false);

    function handleParse() {
        const parsed = parseScript(input);
        setResult(parsed);
        setCopied(false);
    }

    function handleCopy() {
        navigator.clipboard.writeText(JSON.stringify(result, null, 2));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }


    return (
        <main className={styles.page}>
            <div className={styles.container}>
                <h1 className={styles.title}>Анализатор сценария</h1>
                <textarea
                    className={styles.textarea}
                    placeholder="Вставь текст сценария..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                />

                <button className={styles.button} onClick={handleParse}>
                    Разобрать
                </button>

                {result && (
                    <div className={styles.result}>
                        <div className={styles.resultHeader}>
                            <div className={styles.metaToggle} onClick={() => setExpanded(!expanded)}>
                        <span className={styles.meta}>
                          {Object.keys(result).length} персонажей · {pluralize(Object.values(result).reduce((sum, lines) => sum + lines.length, 0), "реплика", "реплики", "реплик")}
                        </span>
                                <span className={styles.metaButton}>{expanded ? "˄" : "˅"}</span>
                            </div>
                            <button className={styles.copyButton} onClick={handleCopy}>
                                {copied ? "Скопировано!" : "Копировать JSON"}
                            </button>
                        </div>

                        <div className={`${styles.breakdownWrapper} ${expanded ? styles.open : ""}`}>
                            <div className={styles.breakdown}>
                                {Object.entries(result).map(([name, lines]) => (
                                    <div key={name} className={styles.breakdownRow}>
                                        <span>{name} · {" "}
                                            {pluralize(lines.length, "реплика", "реплики", "реплик")} · {" "}
                                            {pluralize(lines.join(" ").split(/\s+/).filter(Boolean).length, "слово", "слова", "слов")}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <pre className={styles.json}>
                        {JSON.stringify(result, null, 2)}
                    </pre>
                    </div>
                )
                }
            </div>
        </main>
    );
}
