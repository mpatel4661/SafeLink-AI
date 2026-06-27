/**
 * SafeLink AI – script.js
 * Phishing URL Detection Simulator
 * Vanilla JavaScript (no dependencies)
 */

'use strict';

/* ═══════════════════════════════════════════════════════
   1. DOM REFERENCES
═══════════════════════════════════════════════════════ */
const $ = id => document.getElementById(id);

const themeToggle     = $('themeToggle');
const urlInput        = $('urlInput');
const scanBtn         = $('scanBtn');
const exampleBtn      = $('exampleBtn');
const clearBtn        = $('clearBtn');
const inputWrapper    = $('inputWrapper');
const errorMsg        = $('errorMsg');
const scanningOverlay = $('scanningOverlay');
const resultsSection  = $('resultsSection');
const scoreNumber     = $('scoreNumber');
const ringFill        = $('ringFill');
const statusBadge     = $('statusBadge');
const riskLevelText   = $('riskLevelText');
const threatList      = $('threatList');
const recommendGrid   = $('recommendGrid');
const downloadBtn     = $('downloadBtn');
const printBtn        = $('printBtn');
const clearHistoryBtn = $('clearHistoryBtn');
const historyList     = $('historyList');
const emptyHistory    = $('emptyHistory');
const backTop         = $('backTop');
const toast           = $('toast');
const meterFill       = $('meterFill');
const meterNote       = $('meterNote');

// Dashboard counters
const totalScansEl     = $('totalScans');
const safeCountEl      = $('safeCount');
const suspCountEl      = $('suspiciousCount');
const highRiskCountEl  = $('highRiskCount');

/* ═══════════════════════════════════════════════════════
   2. STATE
═══════════════════════════════════════════════════════ */
let currentScanResult = null; // stores the last scan result object
let isScanning = false;

/* ═══════════════════════════════════════════════════════
   3. THEME TOGGLE
═══════════════════════════════════════════════════════ */
(function initTheme() {
  const saved = localStorage.getItem('safelink-theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
})();

themeToggle.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('safelink-theme', next);
});

/* ═══════════════════════════════════════════════════════
   4. CANVAS CYBER BACKGROUND
═══════════════════════════════════════════════════════ */
(function initCanvas() {
  const canvas = $('bgCanvas');
  const ctx = canvas.getContext('2d');
  let W, H, nodes = [];

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function randBetween(a, b) { return a + Math.random() * (b - a); }

  function spawnNodes() {
    nodes = [];
    const count = Math.floor((W * H) / 14000);
    for (let i = 0; i < count; i++) {
      nodes.push({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: randBetween(-0.3, 0.3),
        vy: randBetween(-0.3, 0.3),
        r: randBetween(1, 2.5),
      });
    }
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    const dotColor = isLight ? '0, 80, 180' : '0, 200, 255';
    const lineColor = isLight ? '0, 80, 180' : '0, 200, 255';

    // Move nodes
    nodes.forEach(n => {
      n.x += n.vx; n.y += n.vy;
      if (n.x < 0 || n.x > W) n.vx *= -1;
      if (n.y < 0 || n.y > H) n.vy *= -1;
    });

    // Draw lines between close nodes
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const dist = Math.hypot(dx, dy);
        if (dist < 130) {
          const alpha = (1 - dist / 130) * 0.35;
          ctx.strokeStyle = `rgba(${lineColor}, ${alpha})`;
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(nodes[j].x, nodes[j].y);
          ctx.stroke();
        }
      }
    }

    // Draw dots
    nodes.forEach(n => {
      ctx.fillStyle = `rgba(${dotColor}, 0.7)`;
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fill();
    });

    requestAnimationFrame(draw);
  }

  resize(); spawnNodes(); draw();
  window.addEventListener('resize', () => { resize(); spawnNodes(); });
})();

/* ═══════════════════════════════════════════════════════
   5. INPUT HANDLING
═══════════════════════════════════════════════════════ */
urlInput.addEventListener('input', () => {
  clearBtn.classList.toggle('visible', urlInput.value.length > 0);
  hideError();
});

clearBtn.addEventListener('click', () => {
  urlInput.value = '';
  clearBtn.classList.remove('visible');
  hideError();
  urlInput.focus();
});

// Enter key support
urlInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') startScan();
});

exampleBtn.addEventListener('click', () => {
  const examples = [
    'http://secure-bank-login.free-verify.xyz/account/update?token=abc123',
    'http://192.168.1.1/paypal.com/login/verify',
    'https://www.paypa1-secure.com/confirm-password?redirect=true',
    'http://freereward-claim.net/user/verify?id=win2024',
    'http://login.bank-update.secure-service.payment.tk/account',
  ];
  urlInput.value = examples[Math.floor(Math.random() * examples.length)];
  clearBtn.classList.add('visible');
  hideError();
  urlInput.focus();
});

scanBtn.addEventListener('click', startScan);
downloadBtn.addEventListener('click', downloadReport);
printBtn.addEventListener('click', () => window.print());
clearHistoryBtn.addEventListener('click', clearHistory);
backTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

/* ═══════════════════════════════════════════════════════
   6. VALIDATION
═══════════════════════════════════════════════════════ */
function showError(msg) {
  errorMsg.textContent = '⚠️ ' + (msg || 'Please enter a valid URL to scan.');
  errorMsg.classList.add('visible');
  inputWrapper.classList.add('error');
  setTimeout(() => inputWrapper.classList.remove('error'), 600);
}

function hideError() {
  errorMsg.classList.remove('visible');
}

function isValidUrl(str) {
  try {
    const u = new URL(str);
    return ['http:', 'https:'].includes(u.protocol);
  } catch { return false; }
}

/* ═══════════════════════════════════════════════════════
   7. PHISHING DETECTION ENGINE
═══════════════════════════════════════════════════════ */
const PHISHING_KEYWORDS = [
  'login', 'verify', 'account', 'update', 'secure', 'bank',
  'payment', 'free', 'reward', 'confirm', 'password', 'signin',
  'credential', 'wallet', 'recover', 'support', 'service',
];

const SUSPICIOUS_TLDS = ['.xyz', '.tk', '.ml', '.ga', '.cf', '.gq', '.pw', '.top', '.club'];

/**
 * Runs all security checks and returns a result object.
 * @param {string} rawUrl
 * @returns {{ score: number, status: string, riskLevel: string, checks: Array, recommendations: Array, url: string }}
 */
function analyzeUrl(rawUrl) {
  let url;
  try { url = new URL(rawUrl); } catch { url = null; }

  const checks = [];
  let penalty = 0;

  /* ── Check 1: HTTPS ── */
  if (!url || url.protocol !== 'https:') {
    checks.push({ pass: false, name: 'No HTTPS Encryption', detail: 'Site uses plain HTTP — data is transmitted unencrypted.', type: 'fail' });
    penalty += 25;
  } else {
    checks.push({ pass: true, name: 'HTTPS Enabled', detail: 'Connection is encrypted via TLS/SSL.', type: 'pass' });
  }

  /* ── Check 2: URL Length ── */
  const urlLen = rawUrl.length;
  if (urlLen > 100) {
    checks.push({ pass: false, name: `Abnormal URL Length (${urlLen} chars)`, detail: 'Very long URLs often conceal the real destination.', type: 'fail' });
    penalty += urlLen > 150 ? 20 : 10;
  } else {
    checks.push({ pass: true, name: `Normal URL Length (${urlLen} chars)`, detail: 'URL length is within a safe range.', type: 'pass' });
  }

  /* ── Check 3: @ Symbol ── */
  if (rawUrl.includes('@')) {
    checks.push({ pass: false, name: 'Contains @ Symbol', detail: 'The @ symbol in a URL is a classic phishing trick to disguise the real host.', type: 'fail' });
    penalty += 25;
  } else {
    checks.push({ pass: true, name: 'No @ Symbol', detail: 'URL does not use @ symbol to mislead.', type: 'pass' });
  }

  /* ── Check 4: Subdomains ── */
  if (url) {
    const parts = url.hostname.split('.');
    const subCount = parts.length - 2;
    if (subCount > 2) {
      checks.push({ pass: false, name: `Excessive Subdomains (${subCount})`, detail: 'Phishing sites pile on subdomains to mimic legitimate URLs (e.g. paypal.com.login.evil.com).', type: 'fail' });
      penalty += subCount > 4 ? 25 : 15;
    } else {
      checks.push({ pass: true, name: 'Normal Subdomain Depth', detail: `${subCount} subdomains — within expected range.`, type: 'pass' });
    }
  }

  /* ── Check 5: IP Address as Host ── */
  if (url) {
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (ipv4Regex.test(url.hostname)) {
      checks.push({ pass: false, name: 'IP Address Used as Domain', detail: 'Legitimate sites use domain names, not raw IP addresses. Highly suspicious.', type: 'fail' });
      penalty += 30;
    } else {
      checks.push({ pass: true, name: 'Domain Name (Not IP)', detail: 'Host uses a proper domain name.', type: 'pass' });
    }
  }

  /* ── Check 6: Phishing Keywords ── */
  const lowerUrl = rawUrl.toLowerCase();
  const foundKeywords = PHISHING_KEYWORDS.filter(kw => lowerUrl.includes(kw));
  if (foundKeywords.length > 0) {
    const display = foundKeywords.slice(0, 4).join(', ');
    checks.push({ pass: false, name: `Suspicious Keywords (${foundKeywords.length} found)`, detail: `Detected: ${display}. Phishing URLs commonly contain these terms.`, type: 'fail' });
    penalty += Math.min(foundKeywords.length * 8, 30);
  } else {
    checks.push({ pass: true, name: 'No Suspicious Keywords', detail: 'URL does not contain common phishing keyword patterns.', type: 'pass' });
  }

  /* ── Check 7: Suspicious TLD ── */
  if (url) {
    const hostname = url.hostname.toLowerCase();
    const badTld = SUSPICIOUS_TLDS.find(tld => hostname.endsWith(tld));
    if (badTld) {
      checks.push({ pass: false, name: `High-Risk TLD (${badTld})`, detail: 'This top-level domain is heavily associated with free/throwaway phishing domains.', type: 'warn' });
      penalty += 20;
    } else {
      checks.push({ pass: true, name: 'Standard TLD', detail: 'Top-level domain does not appear in high-risk TLD lists.', type: 'pass' });
    }
  }

  /* ── Check 8: Hyphens in Domain ── */
  if (url) {
    const hyphenCount = (url.hostname.match(/-/g) || []).length;
    if (hyphenCount >= 3) {
      checks.push({ pass: false, name: `Multiple Hyphens in Domain (${hyphenCount})`, detail: 'Attackers use hyphens to misspell real brand names (e.g. paypa-l-secure.com).', type: 'warn' });
      penalty += 15;
    } else {
      checks.push({ pass: true, name: 'Normal Domain Hyphens', detail: `${hyphenCount} hyphen(s) — within normal range.`, type: 'pass' });
    }
  }

  /* ── Check 9: Query String Depth ── */
  if (url) {
    const paramCount = [...url.searchParams.keys()].length;
    if (paramCount > 4) {
      checks.push({ pass: false, name: `Complex Query String (${paramCount} params)`, detail: 'Excessive query parameters can be used to track victims or bypass filters.', type: 'warn' });
      penalty += 10;
    } else {
      checks.push({ pass: true, name: 'Clean Query String', detail: `${paramCount} parameter(s) — reasonable.`, type: 'pass' });
    }
  }

  /* ── Check 10: Numbers in Domain ── */
  if (url) {
    const numMatch = url.hostname.match(/\d+/g);
    const hasNumbers = numMatch && numMatch.join('').length > 3;
    if (hasNumbers) {
      checks.push({ pass: false, name: 'Numbers in Domain Name', detail: 'Numeric sequences in domain names often indicate auto-generated phishing domains.', type: 'warn' });
      penalty += 10;
    } else {
      checks.push({ pass: true, name: 'No Suspicious Numbers in Domain', detail: 'Domain name looks clean without suspicious number patterns.', type: 'pass' });
    }
  }

  /* ── Score & Status ── */
  const score = Math.max(0, Math.min(100, 100 - penalty));
  let status, riskLevel;
  if (score >= 70) {
    status = '🟢 Safe'; riskLevel = 'Low';
  } else if (score >= 40) {
    status = '🟡 Suspicious'; riskLevel = 'Medium';
  } else {
    status = '🔴 High Risk'; riskLevel = 'High';
  }

  /* ── Recommendations ── */
  const recommendations = buildRecommendations(score, foundKeywords, url, rawUrl);

  return { score, status, riskLevel, checks, recommendations, url: rawUrl, timestamp: new Date() };
}

/** Build contextual recommendations based on findings */
function buildRecommendations(score, keywords, url, rawUrl) {
  const recs = [];

  if (score < 70) recs.push({ icon: '🚫', text: 'Do not enter any personal information on this website.' });
  if (keywords.length > 0) recs.push({ icon: '🔤', text: "Verify the exact spelling of the website domain in your browser's address bar." });
  if (!rawUrl.startsWith('https://')) recs.push({ icon: '🔒', text: 'Only submit sensitive data on sites using HTTPS (look for the padlock icon).' });
  if (url && url.hostname.split('.').length > 4) recs.push({ icon: '🌐', text: 'Be wary of long subdomain chains — legitimate sites rarely need them.' });
  recs.push({ icon: '🛡️', text: 'Enable two-factor authentication (2FA) on all important accounts.' });
  recs.push({ icon: '📧', text: 'If you received this URL via email, report the message as phishing.' });
  if (score < 40) recs.push({ icon: '🆘', text: 'Treat this link as malicious. Do not click it on your main device.' });
  recs.push({ icon: '🔑', text: 'Use a password manager so you never re-use credentials across sites.' });

  return recs.slice(0, 6);
}

/* ═══════════════════════════════════════════════════════
   8. SCAN ORCHESTRATION
═══════════════════════════════════════════════════════ */
async function startScan() {
  if (isScanning) return;

  const raw = urlInput.value.trim();
  if (!raw) { showError('URL cannot be empty.'); return; }
  if (!isValidUrl(raw)) { showError('Enter a full URL starting with http:// or https://'); return; }

  hideError();
  isScanning = true;
  scanBtn.disabled = true;
  scanBtn.querySelector('.btn-text').textContent = 'Scanning…';

  // Hide old results
  resultsSection.classList.remove('active');
  scanningOverlay.classList.add('active');

  await runScanAnimation();

  // Run detection
  const result = analyzeUrl(raw);
  currentScanResult = result;

  // Hide animation, show results
  scanningOverlay.classList.remove('active');
  renderResults(result);
  resultsSection.classList.add('active');

  // Save to history
  saveToHistory(result);
  refreshDashboard();

  // Scroll to results
  setTimeout(() => resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);

  isScanning = false;
  scanBtn.disabled = false;
  scanBtn.querySelector('.btn-text').textContent = 'Scan Now';

  showToast(`Scan complete — Risk Level: ${result.riskLevel}`);
}

/** Simulate step-by-step log animation */
function runScanAnimation() {
  return new Promise(resolve => {
    const logs = ['log1','log2','log3','log4','log5','log6'];
    let i = 0;

    // Reset
    logs.forEach(id => {
      const el = $(id);
      el.classList.remove('active','done');
    });

    const interval = setInterval(() => {
      if (i > 0) {
        $(logs[i - 1]).classList.remove('active');
        $(logs[i - 1]).classList.add('done');
      }
      if (i < logs.length) {
        $(logs[i]).classList.add('active');
        i++;
      } else {
        clearInterval(interval);
        setTimeout(resolve, 400);
      }
    }, 420);
  });
}

/* ═══════════════════════════════════════════════════════
   9. RENDER RESULTS
═══════════════════════════════════════════════════════ */
function renderResults(result) {
  /* ── Score ring ── */
  const circumference = 314; // 2 * π * 50
  const offset = circumference - (result.score / 100) * circumference;
  ringFill.style.strokeDashoffset = circumference; // reset
  requestAnimationFrame(() => {
    setTimeout(() => {
      ringFill.style.strokeDashoffset = offset;
      // Color
      if (result.score >= 70) {
        ringFill.style.stroke = getComputedStyle(document.documentElement).getPropertyValue('--green').trim();
      } else if (result.score >= 40) {
        ringFill.style.stroke = getComputedStyle(document.documentElement).getPropertyValue('--yellow').trim();
      } else {
        ringFill.style.stroke = getComputedStyle(document.documentElement).getPropertyValue('--red').trim();
      }
    }, 100);
  });

  /* ── Animated counter ── */
  animateCounter(scoreNumber, 0, result.score, 1000);

  /* ── Status badge ── */
  statusBadge.textContent = result.status;
  statusBadge.className = 'status-badge-result';
  if (result.riskLevel === 'Low')    statusBadge.classList.add('status-safe');
  if (result.riskLevel === 'Medium') statusBadge.classList.add('status-suspicious');
  if (result.riskLevel === 'High')   statusBadge.classList.add('status-highrisk');

  riskLevelText.textContent = result.riskLevel;
  riskLevelText.style.color = result.riskLevel === 'Low'
    ? 'var(--green)' : result.riskLevel === 'Medium'
    ? 'var(--yellow)' : 'var(--red)';

  /* ── Threat list ── */
  threatList.innerHTML = '';
  result.checks.forEach((c, idx) => {
    const li = document.createElement('li');
    li.className = `threat-item ${c.type}`;
    li.style.animationDelay = `${idx * 0.06}s`;
    li.innerHTML = `
      <span class="threat-icon">${c.type === 'pass' ? '✅' : c.type === 'warn' ? '⚠️' : '❌'}</span>
      <span class="threat-text">
        <span class="threat-name">${c.name}</span>
        <span class="threat-detail">${c.detail}</span>
      </span>`;
    threatList.appendChild(li);
  });

  /* ── Recommendations ── */
  recommendGrid.innerHTML = '';
  result.recommendations.forEach((r, idx) => {
    const div = document.createElement('div');
    div.className = 'rec-item';
    div.style.animationDelay = `${idx * 0.08}s`;
    div.innerHTML = `<span class="rec-icon">${r.icon}</span><span>${r.text}</span>`;
    recommendGrid.appendChild(div);
  });
}

/* ── Animate counter from start to end ── */
function animateCounter(el, start, end, duration) {
  const startTime = performance.now();
  function step(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3); // cubic ease-out
    el.textContent = Math.round(start + (end - start) * ease);
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

/* ═══════════════════════════════════════════════════════
   10. SCAN HISTORY (LocalStorage)
═══════════════════════════════════════════════════════ */
const HISTORY_KEY = 'safelink-history';

function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; }
  catch { return []; }
}

function saveToHistory(result) {
  const history = loadHistory();
  history.unshift({
    url: result.url,
    score: result.score,
    riskLevel: result.riskLevel,
    status: result.status,
    timestamp: result.timestamp.toISOString(),
  });
  // Keep last 50
  const trimmed = history.slice(0, 50);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
  renderHistory();
}

function renderHistory() {
  const history = loadHistory();
  historyList.innerHTML = '';

  if (!history.length) {
    historyList.appendChild(emptyHistory);
    return;
  }

  history.forEach((item, idx) => {
    const riskClass = item.riskLevel === 'Low' ? 'safe' : item.riskLevel === 'Medium' ? 'suspicious' : 'highrisk';
    const div = document.createElement('div');
    div.className = 'history-item';
    div.style.animationDelay = `${idx * 0.04}s`;

    const date = new Date(item.timestamp);
    const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    div.innerHTML = `
      <div class="hist-score ${riskClass}">${item.score}</div>
      <div class="hist-info" style="flex:1; min-width:0;">
        <div class="hist-url">${escapeHtml(item.url)}</div>
        <div class="hist-meta">${dateStr}</div>
      </div>
      <span class="hist-risk ${riskClass}">${item.riskLevel}</span>`;
    historyList.appendChild(div);
  });
}

function clearHistory() {
  if (!confirm('Clear all scan history? This cannot be undone.')) return;
  localStorage.removeItem(HISTORY_KEY);
  renderHistory();
  refreshDashboard();
  showToast('Scan history cleared.');
}

/* ═══════════════════════════════════════════════════════
   11. DASHBOARD STATS
═══════════════════════════════════════════════════════ */
function refreshDashboard() {
  const history = loadHistory();
  const total  = history.length;
  const safe   = history.filter(h => h.riskLevel === 'Low').length;
  const susp   = history.filter(h => h.riskLevel === 'Medium').length;
  const high   = history.filter(h => h.riskLevel === 'High').length;

  animateCounter(totalScansEl,    0, total, 600);
  animateCounter(safeCountEl,     0, safe,  600);
  animateCounter(suspCountEl,     0, susp,  600);
  animateCounter(highRiskCountEl, 0, high,  600);

  // Threat meter: weighted % of risk
  if (total > 0) {
    const riskPct = ((susp * 0.5 + high * 1) / total) * 100;
    meterFill.style.width = Math.min(100, riskPct) + '%';
    if (riskPct < 20) meterNote.textContent = `Mostly safe scans. ${safe}/${total} sites passed.`;
    else if (riskPct < 60) meterNote.textContent = `Mixed risk profile. ${high} high-risk URLs detected.`;
    else meterNote.textContent = `High threat activity. Exercise caution with scanned URLs.`;
  } else {
    meterFill.style.width = '0%';
    meterNote.textContent = 'No scans yet. Start by analyzing a URL above.';
  }
}

/* ═══════════════════════════════════════════════════════
   12. REPORT GENERATION
═══════════════════════════════════════════════════════ */
function buildReportText(result) {
  const line = '═'.repeat(54);
  const dash = '─'.repeat(54);
  const date = new Date(result.timestamp).toLocaleString();

  let text = `
${line}
  SafeLink AI — Phishing URL Detection Report
  Detect Suspicious Links Before They Become Threats
${line}

Scan Date   : ${date}
URL Analyzed: ${result.url}

${dash}
  AI SECURITY SCORE: ${result.score}/100
  STATUS           : ${result.status}
  RISK LEVEL       : ${result.riskLevel}
${dash}

THREAT ANALYSIS REPORT:
`;

  result.checks.forEach(c => {
    const icon = c.type === 'pass' ? '✓' : c.type === 'warn' ? '△' : '✗';
    text += `\n  ${icon} ${c.name}\n    ${c.detail}\n`;
  });

  text += `\n${dash}\nAI RECOMMENDATIONS:\n`;
  result.recommendations.forEach((r, i) => {
    text += `\n  ${i + 1}. ${r.text}\n`;
  });

  text += `\n${line}\nGenerated by SafeLink AI — For educational purposes only.\n${line}\n`;
  return text.trim();
}

function downloadReport() {
  if (!currentScanResult) { showToast('No scan results to download.'); return; }
  const text = buildReportText(currentScanResult);
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `safelink-report-${Date.now()}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Report downloaded ✓');
}

/* ═══════════════════════════════════════════════════════
   13. TOAST NOTIFICATION
═══════════════════════════════════════════════════════ */
let toastTimer;
function showToast(msg) {
  clearTimeout(toastTimer);
  toast.textContent = msg;
  toast.classList.add('show');
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3500);
}

/* ═══════════════════════════════════════════════════════
   14. SMOOTH SCROLL NAV & ACTIVE LINK
═══════════════════════════════════════════════════════ */
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    const target = document.querySelector(link.getAttribute('href'));
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    link.classList.add('active');
  });
});

// Back-to-top visibility
window.addEventListener('scroll', () => {
  backTop.classList.toggle('visible', window.scrollY > 400);
});

/* ═══════════════════════════════════════════════════════
   15. HELPERS
═══════════════════════════════════════════════════════ */
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ═══════════════════════════════════════════════════════
   16. INIT
═══════════════════════════════════════════════════════ */
(function init() {
  renderHistory();
  refreshDashboard();
})();