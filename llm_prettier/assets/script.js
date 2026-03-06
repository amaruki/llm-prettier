const jsonData = "/* INJECTION_JSON */";

// ── FORMATTERS ──────────────────────────────────────────
function fmtBytes(b) {
    if (b < 1024) return b + '\u202fB';
    if (b < 1048576) return (b / 1024).toFixed(1) + '\u202fKB';
    return (b / 1048576).toFixed(1) + '\u202fMB';
}

function escapeHTML(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// ── COPIER ──────────────────────────────────────────────
function copy(text, el) {
    navigator.clipboard.writeText(text).then(() => {
        const original = el.textContent;
        el.textContent = 'Copied!';
        el.style.color = 'var(--val-string)';
        setTimeout(() => {
            el.textContent = original;
            el.style.color = '';
        }, 1000);
    }).catch(err => console.error('Failed to copy', err));
}

function parseMixedContent(val) {
    const regex = /(?:```(?:json)?\s*([\s\S]*?)\s*```)|(?:<([a-zA-Z0-9_\-:]+)[^>]*>\s*([\s\S]*?)\s*<\/\2>)/g;
    let parts = [];
    let lastIndex = 0;
    let match;
    let hasJson = false;
    
    while ((match = regex.exec(val)) !== null) {
        if (match.index > lastIndex) {
            parts.push({ type: 'text', content: val.substring(lastIndex, match.index) });
        }
        let rawBlock = match[0];
        let innerStr = (match[1] || match[3] || '').trim();
        let tag = match[2] ? '<' + match[2] + '>' : '```json';
        
        let parsedObj = null;
        if ((innerStr.startsWith('{') && innerStr.endsWith('}')) || (innerStr.startsWith('[') && innerStr.endsWith(']'))) {
            try {
                parsedObj = JSON.parse(innerStr);
            } catch (e) {}
        }
        
        if (parsedObj) {
            parts.push({ type: 'json', content: parsedObj, raw: rawBlock, label: tag });
            hasJson = true;
        } else {
            parts.push({ type: 'text', content: rawBlock });
        }
        lastIndex = regex.lastIndex;
    }
    
    if (lastIndex < val.length) {
        parts.push({ type: 'text', content: val.substring(lastIndex) });
    }
    
    return hasJson ? parts : null;
}

// ── BUILD TREE HTML (EVENT DELEGATION) ──────────────────
function buildTreeHTML(val, key = null, path = '$', isLast = true) {
    let html = '<div class="node-row" role="treeitem">';
    
    if (key !== null) {
        html += `<span class="key" data-path="${escapeHTML(path)}" title="Click to copy path: ${escapeHTML(path)}">"${escapeHTML(key)}"</span>: `;
    }

    if (val === null) {
        html += `<span class="val-null searchable" data-val="null">null</span>`;
        if (!isLast) html += '<span class="comma">,</span>';
        html += `<span class="copy-hint" data-copy="null" title="Copy value">copy</span>`;
    } else if (typeof val === 'string') {
        let parsed = null;
        let t = val.trim();
        
        if ((t.startsWith('{') && t.endsWith('}')) || (t.startsWith('[') && t.endsWith(']'))) {
            try { parsed = JSON.parse(t); } catch (e) {}
        }
        
        if (!parsed && t.startsWith('```')) {
            const match = t.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
            if (match) {
                const inner = match[1].trim();
                if ((inner.startsWith('{') && inner.endsWith('}')) || (inner.startsWith('[') && inner.endsWith(']'))) {
                    try { parsed = JSON.parse(inner); } catch (e) {}
                }
            }
        }
        
        if (!parsed && t.startsWith('"') && t.endsWith('"')) {
            try {
                const unescaped = JSON.parse(t);
                if (typeof unescaped === 'string') {
                    const t2 = unescaped.trim();
                    if ((t2.startsWith('{') && t2.endsWith('}')) || (t2.startsWith('[') && t2.endsWith(']'))) {
                        parsed = JSON.parse(t2);
                    }
                }
            } catch (e) {}
        }

        let mixedParts = null;
        if (!parsed) {
            mixedParts = parseMixedContent(val);
        }

        if (parsed) {
            html += buildCollapsibleHTML(parsed, path + ' <parsed>', true, isLast);
        } else if (mixedParts) {
            html += `<div class="mixed-content-container">`;
            mixedParts.forEach((part, i) => {
                if (part.type === 'text') {
                    if (part.content.trim()) {
                        const displayPart = escapeHTML(part.content);
                        html += `<div class="val-string searchable multiline-string mixed-content-text" data-val="${displayPart}">${displayPart}</div>`;
                    }
                } else if (part.type === 'json') {
                    html += `<div class="mixed-content-label">${escapeHTML(part.label)}</div>`;
                    html += buildCollapsibleHTML(part.content, path + ' ' + part.label, true, true);
                }
            });
            html += `</div>`;
            if (!isLast) html += '<span class="comma">,</span>';
            const displayVal = escapeHTML(val);
            html += `<span class="copy-hint" data-copy="${displayVal}" style="position:absolute; right:10px; top:4px;" title="Copy value">copy</span>`;
        } else {
            const hasNewlines = val.includes('\n');
            const displayVal = escapeHTML(val);
            
            if (hasNewlines) {
                // multiline strings get rendered as standalone blocks for easy reading
                html += `<div><div class="val-string searchable multiline-string" data-val="${displayVal}">${displayVal}</div></div>`;
                if (!isLast) html += '<span class="comma">,</span>';
                html += `<span class="copy-hint" data-copy="${displayVal}" style="position:absolute; right:10px; top:4px;" title="Copy value">copy</span>`;
            } else {
                html += `<span class="val-string searchable" data-val="${displayVal}">"${displayVal}"</span>`;
                if (!isLast) html += '<span class="comma">,</span>';
                html += `<span class="copy-hint" data-copy="${displayVal}" title="Copy value">copy</span>`;
            }
        }
    } else if (typeof val === 'number') {
        html += `<span class="val-number searchable" data-val="${escapeHTML(val)}">${val}</span>`;
        if (!isLast) html += '<span class="comma">,</span>';
        html += `<span class="copy-hint" data-copy="${escapeHTML(val)}" title="Copy value">copy</span>`;
    } else if (typeof val === 'boolean') {
        html += `<span class="val-bool searchable" data-val="${val}">${val}</span>`;
        if (!isLast) html += '<span class="comma">,</span>';
        html += `<span class="copy-hint" data-copy="${escapeHTML(val)}" title="Copy value">copy</span>`;
    } else {
        html += buildCollapsibleHTML(val, path, false, isLast);
    }

    html += '</div>';
    return html;
}

function buildCollapsibleHTML(val, path, isParsed, isLast = true) {
    const isArr = Array.isArray(val);
    const depth = path.split(/[\.\[]/).length;
    const entries = isArr ? val : Object.keys(val);
    const count = entries.length;
    const prevText = isArr 
        ? count + (count === 1 ? ' item' : ' items')
        : count + (count === 1 ? ' key' : ' keys');

    let html = `<div class="expanded collapsible-node" data-depth="${depth}" role="group">`;
    html += `<span class="toggle" aria-label="Toggle"></span>`;
    html += isArr ? '[' : '{';
    
    if (isParsed) html += `<span class="badge">JSON string</span>`;

    html += `<span class="preview">${prevText}</span>`;
    html += `<div class="children">`;
    html += `<ul class="${isArr ? 'json-array' : 'json-dict'}">`;

    entries.forEach((entry, i) => {
        html += '<li>';
        const v = isArr ? entry : val[entry];
        const k = isArr ? null : entry;
        const p = isArr ? path + '[' + i + ']' : path + '.' + k;
        html += buildTreeHTML(v, k, p, i === count - 1);
        html += '</li>';
    });

    html += `</ul></div>${isArr ? ']' : '}'}`;
    if (!isLast) html += '<span class="comma">,</span>';
    html += `</div>`;
    return html;
}

// ── INIT ────────────────────────────────────────────────
function init() {
    // Restore theme/wrap
    if (localStorage.getItem('llm_theme') === 'dark') toggleTheme(true);
    if (localStorage.getItem('llm_wrap') === 'off') toggleWrap(true);

    const name = "/* INJECTION_TITLE */";
    const dot = name.lastIndexOf('.');
    const el = document.getElementById('file-title');
    if (dot !== -1) {
        el.innerHTML = '';
        el.appendChild(document.createTextNode(name.slice(0, dot)));
        const ext = document.createElement('span');
        ext.className = 'file-ext';
        ext.textContent = name.slice(dot);
        el.appendChild(ext);
    }

    // Render tree
    document.getElementById('viewer').innerHTML = buildTreeHTML(jsonData);

    // Compute Stats
    let keys = 0, depth = 0;
    function walk(v, d) {
        if (d > depth) depth = d;
        if (v && typeof v === 'object') {
            const ks = Object.keys(v);
            keys += ks.length;
            ks.forEach(k => walk(v[k], d + 1));
        }
    }
    walk(jsonData, 0);

    const size = new TextEncoder().encode(JSON.stringify(jsonData)).length;
    document.getElementById('stats').textContent =
        keys.toLocaleString() + ' keys · depth ' + depth + ' · ' + fmtBytes(size);
}

// ── TOGGLES ─────────────────────────────────────────────
function toggleTheme(forceDark = false) {
    const isDark = (forceDark === true) || document.body.getAttribute('data-theme') === 'light';
    document.body.setAttribute('data-theme', isDark ? 'dark' : 'light');
    document.getElementById('btn-theme').textContent = isDark ? 'Theme: Dark' : 'Theme: Light';
    localStorage.setItem('llm_theme', isDark ? 'dark' : 'light');
}

function toggleWrap(forceOff = false) {
    const isWrap = (forceOff === true) ? false : !document.body.classList.contains('wrap-text');
    if (isWrap) document.body.classList.add('wrap-text');
    else document.body.classList.remove('wrap-text');
    document.getElementById('btn-wrap').textContent = isWrap ? 'Wrap: ON' : 'Wrap: OFF';
    localStorage.setItem('llm_wrap', isWrap ? 'on' : 'off');
}

// ── EVENT DELEGATION ────────────────────────────────────
document.getElementById('viewer').addEventListener('click', (e) => {
    const target = e.target;

    if (target.classList.contains('toggle')) {
        const group = target.parentElement;
        const isExp = group.classList.contains('expanded');
        group.classList.toggle('expanded', !isExp);
        group.classList.toggle('collapsed', isExp);
        return;
    }

    if (target.classList.contains('preview')) {
        const group = target.parentElement;
        group.classList.add('expanded');
        group.classList.remove('collapsed');
        return;
    }

    if (target.classList.contains('key')) {
        const path = target.getAttribute('data-path');
        if (path) {
            document.getElementById('breadcrumb').textContent = path;
            copy(path, target);
        }
        return;
    }

    if (target.classList.contains('copy-hint')) {
        const textToCopy = target.getAttribute('data-copy');
        if (textToCopy !== null) copy(document.createElement('div').innerHTML = textToCopy, target); // Decode entities
        return;
    }
});

// ── CONTROLS ────────────────────────────────────────────
function expandAll() {
    document.querySelectorAll('.collapsible-node').forEach(n => {
        n.classList.add('expanded');
        n.classList.remove('collapsed');
    });
}

function collapseAll() {
    document.querySelectorAll('.collapsible-node').forEach(n => {
        n.classList.add('collapsed');
        n.classList.remove('expanded');
    });
}

function collapseToDepth(d) {
    document.querySelectorAll('.collapsible-node').forEach(n => {
        const deep = parseInt(n.getAttribute('data-depth')) >= d;
        n.classList.toggle('collapsed', deep);
        n.classList.toggle('expanded', !deep);
    });
}

// ── SEARCH ──────────────────────────────────────────────
let matches = [], mIdx = 0;
const sInput = document.getElementById('search-input');
const sActions = document.getElementById('search-actions');

let debounceTimer;
sInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        document.querySelectorAll('span.match').forEach(span => {
            const parent = span.parentNode;
            if (parent) {
                parent.replaceChild(document.createTextNode(span.textContent), span);
                parent.normalize();
            }
        });
        document.querySelectorAll('.match').forEach(el => el.classList.remove('match', 'match-active'));
        
        matches = [];
        mIdx = 0;
        const q = sInput.value.toLowerCase();
        if (!q) { sActions.textContent = ''; return; }

        document.querySelectorAll('.key, .searchable').forEach(el => {
            const text = el.textContent;
            const lowerText = text.toLowerCase();
            if (lowerText.includes(q)) {
                el.textContent = '';
                let lastIdx = 0;
                let matchIdx = lowerText.indexOf(q);
                
                while (matchIdx !== -1) {
                    if (matchIdx > lastIdx) {
                        el.appendChild(document.createTextNode(text.substring(lastIdx, matchIdx)));
                    }
                    const span = document.createElement('span');
                    span.className = 'match';
                    span.textContent = text.substring(matchIdx, matchIdx + q.length);
                    el.appendChild(span);
                    matches.push(span);
                    
                    lastIdx = matchIdx + q.length;
                    matchIdx = lowerText.indexOf(q, lastIdx);
                }
                if (lastIdx < text.length) {
                    el.appendChild(document.createTextNode(text.substring(lastIdx)));
                }

                let p = el.parentElement;
                while (p && p.id !== 'viewer') {
                    if (p.classList.contains('collapsible-node')) {
                        p.classList.add('expanded');
                        p.classList.remove('collapsed');
                    }
                    p = p.parentElement;
                }
            }
        });

        if (matches.length) highlightMatch();
        else sActions.textContent = '0 results';
    }, 200);
});

function highlightMatch() {
    matches.forEach(el => el.classList.remove('match-active'));
    const cur = matches[mIdx];
    cur.classList.add('match-active');
    cur.scrollIntoView({ behavior: 'smooth', block: 'center' });
    sActions.textContent = (mIdx + 1) + ' / ' + matches.length;
}

window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        sInput.focus();
    }
    if (e.key === 'Enter' && matches.length) {
        mIdx = (mIdx + (e.shiftKey ? -1 : 1) + matches.length) % matches.length;
        highlightMatch();
    }
    if (e.key === 'Escape') {
        sInput.value = '';
        sInput.dispatchEvent(new Event('input'));
        sInput.blur();
    }
});

init();
