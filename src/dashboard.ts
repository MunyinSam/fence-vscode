import * as vscode from 'vscode';
import * as crypto from 'crypto';
import { getCurrentProfile, getHistory } from './profile';

// Only one dashboard panel open at a time.
// When the user closes it, onDidDispose clears this reference.
let currentPanel: vscode.WebviewPanel | undefined;

export function register(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('fence.showDashboard', () => openDashboard(context))
  );
}

function openDashboard(context: vscode.ExtensionContext): void {
  if (currentPanel) {
    // Panel already open — bring it to front and refresh the data
    currentPanel.reveal(vscode.ViewColumn.Beside);
    sendData(currentPanel);
    return;
  }

  currentPanel = vscode.window.createWebviewPanel(
    'fence.dashboard',          // stable internal ID (used for state restoration)
    'Fence Dashboard',          // tab title
    vscode.ViewColumn.Beside,   // open next to the current editor
    {
      enableScripts: true,           // webview JS is disabled by default — opt in
      retainContextWhenHidden: true, // keep DOM alive when the tab is hidden
    }
  );

  // When the user closes the tab, clear the reference so the next
  // call to openDashboard creates a fresh panel instead of trying to reveal a dead one.
  currentPanel.onDidDispose(() => { currentPanel = undefined; }, null, context.subscriptions);

  // Messages from the webview arrive here.
  // The webview sends { type: 'refresh' } when the user clicks the Refresh button.
  currentPanel.webview.onDidReceiveMessage(msg => {
    if (msg.type === 'refresh') sendData(currentPanel!);
  }, null, context.subscriptions);

  // A fresh nonce on every panel open — only scripts carrying this token can run.
  const nonce = crypto.randomBytes(16).toString('hex');
  currentPanel.webview.html = buildHtml(nonce);

  // Push the initial data after setting HTML — the webview isn't ready to receive
  // messages until after html is assigned, but postMessage queues safely anyway.
  sendData(currentPanel);
}

// Reads fresh data from disk and posts it to the webview.
// Called on open and whenever the user clicks Refresh.
function sendData(panel: vscode.WebviewPanel): void {
  panel.webview.postMessage({
    type: 'init',
    profile: getCurrentProfile(),
    history: getHistory(),
  });
}

// ── HTML ───────────────────────────────────────────────────────────────────
//
// The entire webview is one self-contained HTML string.
// All rendering logic lives in the embedded <script> — the extension only
// sends data, the webview decides how to display it.
//
// The script uses var + string concatenation instead of template literals
// to avoid backtick-escaping inside this TypeScript template string.
//
// VS Code CSS variables (--vscode-editor-foreground etc.) are automatically
// set by VS Code to match whatever theme the user has chosen, so the panel
// adapts to dark/light themes without any extra work.

function buildHtml(nonce: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy"
        content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: var(--vscode-font-family);
      font-size: 13px;
      color: var(--vscode-editor-foreground);
      background: var(--vscode-editor-background);
      padding: 20px 24px;
      line-height: 1.5;
    }

    h2 {
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--vscode-descriptionForeground);
      margin: 24px 0 10px;
    }

    h2:first-of-type { margin-top: 0; }

    /* ── Tier badge ─────────────────────────────────────── */

    .tier-badge {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 14px 18px;
      border-radius: 6px;
      border-left: 4px solid currentColor;
    }

    .tier-number {
      font-size: 40px;
      font-weight: 700;
      line-height: 1;
    }

    .tier-label  { font-size: 16px; font-weight: 600; }
    .tier-score  { font-size: 12px; opacity: 0.75; margin-top: 2px; }

    /* ── Score bars ─────────────────────────────────────── */

    .score-row {
      display: grid;
      grid-template-columns: 128px 1fr 38px;
      align-items: center;
      gap: 10px;
      margin-bottom: 7px;
    }

    .score-label { font-size: 12px; }

    .bar-track {
      height: 7px;
      background: var(--vscode-editorWidget-border, #444);
      border-radius: 4px;
      overflow: hidden;
    }

    .bar-fill {
      height: 100%;
      border-radius: 4px;
      background: var(--vscode-progressBar-background, #0e70c0);
    }

    .bar-fill.penalty {
      background: var(--vscode-errorForeground, #f14c4c);
    }

    .score-value {
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
      text-align: right;
    }

    /* ── History chart ──────────────────────────────────── */

    .history-chart { width: 100%; display: block; }

    .history-dates {
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      color: var(--vscode-descriptionForeground);
      margin-top: 4px;
    }

    /* ── Construct lists ────────────────────────────────── */

    .constructs-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    .construct-col-header {
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
      margin-bottom: 6px;
    }

    .construct-item {
      display: flex;
      align-items: baseline;
      gap: 6px;
      font-size: 12px;
      margin-bottom: 3px;
    }

    .construct-item .icon { font-size: 10px; }
    .construct-item.known   .icon { color: #73c991; }
    .construct-item.unknown .icon { color: #f97583; }

    /* ── Misc ───────────────────────────────────────────── */

    .empty-state {
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
      font-style: italic;
      padding: 6px 0;
    }

    .footer {
      margin-top: 20px;
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
    }

    button {
      margin-top: 16px;
      padding: 5px 14px;
      font-size: 12px;
      font-family: var(--vscode-font-family);
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      border-radius: 2px;
      cursor: pointer;
    }

    button:hover { background: var(--vscode-button-hoverBackground); }
  </style>
</head>
<body>
  <div id="root"><p class="empty-state">Loading…</p></div>

  <script nonce="${nonce}">
    // Store the API handle once — acquireVsCodeApi() throws if called more than once.
    var vscodeApi = acquireVsCodeApi();

    // Tier → { color for text/border, background tint }
    // Semi-transparent backgrounds keep the panel readable in any theme.
    var TIER_STYLE = {
      1: { color: '#ff8a80', bg: 'rgba(244,67,54,0.08)'  },
      2: { color: '#ffb74d', bg: 'rgba(255,152,0,0.08)'  },
      3: { color: '#fff176', bg: 'rgba(255,235,59,0.08)' },
      4: { color: '#64b5f6', bg: 'rgba(33,150,243,0.10)' },
      5: { color: '#ce93d8', bg: 'rgba(156,39,176,0.10)' },
    };

    // The extension posts { type: 'init', profile, history } on open and on refresh.
    window.addEventListener('message', function(event) {
      var msg = event.data;
      if (msg.type === 'init') {
        render(msg.profile, msg.history);
      }
    });

    function render(profile, history) {
      var root = document.getElementById('root');

      if (!profile) {
        root.innerHTML = '<p class="empty-state">No profile yet — run <strong>Fence: Scan Workspace</strong> first.</p>';
        return;
      }

      var scores   = profile.scores;
      var tier     = profile.tier;
      var style    = TIER_STYLE[tier] || TIER_STYLE[3];
      var entries  = (history && history.entries) ? history.entries : [];

      root.innerHTML =
        tierSection(tier, profile.tierLabel, scores.finalScore, style) +
        scoreSection(scores) +
        historySection(entries) +
        constructSection(profile.knownConstructs, profile.unknownConstructs) +
        '<p class="footer">Last updated: ' + profile.lastUpdated.slice(0, 10) + '</p>' +
        '<button onclick="refresh()">&#8635; Refresh</button>';
    }

    // ── Section builders ─────────────────────────────────

    function tierSection(tier, label, finalScore, style) {
      return '<h2>Current Tier</h2>' +
        '<div class="tier-badge" style="color:' + style.color + ';background:' + style.bg + '">' +
          '<span class="tier-number">' + tier + '</span>' +
          '<div>' +
            '<div class="tier-label">' + capitalize(label) + '</div>' +
            '<div class="tier-score">Score: ' + finalScore.toFixed(1) + ' / 10</div>' +
          '</div>' +
        '</div>';
    }

    function scoreSection(scores) {
      return '<h2>Score Breakdown</h2>' +
        scoreBar('Idiom',          scores.idiomScore) +
        scoreBar('Complexity',     scores.complexityScore) +
        scoreBar('Abstraction',    scores.abstractionScore) +
        scoreBar('Error Handling', scores.errorHandlingScore) +
        scoreBar('Modern Syntax',  scores.modernSyntaxScore) +
        scoreBar('Construct Breadth', scores.breadthScore) +
        penaltyBar(scores.antiPatternPenalty);
    }

    function historySection(entries) {
      return '<h2>Growth Over Time</h2>' + buildHistoryChart(entries);
    }

    function constructSection(known, unknown) {
      var knownItems  = known.map(function(c)  { return constructItem(c, true);  }).join('');
      var unknownItems = unknown.map(function(c) { return constructItem(c, false); }).join('');

      return '<h2>Constructs</h2>' +
        '<div class="constructs-grid">' +
          '<div>' +
            '<div class="construct-col-header">Known (' + known.length + ')</div>' +
            knownItems +
          '</div>' +
          '<div>' +
            '<div class="construct-col-header">Unknown (' + unknown.length + ')</div>' +
            unknownItems +
          '</div>' +
        '</div>';
    }

    // ── Low-level renderers ──────────────────────────────

    function scoreBar(label, value) {
      var pct = Math.round(value * 100);
      return '<div class="score-row">' +
        '<span class="score-label">' + label + '</span>' +
        '<div class="bar-track"><div class="bar-fill" style="width:' + pct + '%"></div></div>' +
        '<span class="score-value">' + pct + '%</span>' +
        '</div>';
    }

    function penaltyBar(value) {
      // value is negative (e.g. -0.07); display its magnitude as a red bar
      var pct = Math.min(100, Math.round(Math.abs(value) * 100));
      return '<div class="score-row">' +
        '<span class="score-label">Anti-pattern</span>' +
        '<div class="bar-track"><div class="bar-fill penalty" style="width:' + pct + '%"></div></div>' +
        '<span class="score-value">-' + pct + '%</span>' +
        '</div>';
    }

    function constructItem(name, isKnown) {
      var cls  = isKnown ? 'known' : 'unknown';
      var icon = isKnown ? '&#10003;' : '&#10007;';
      return '<div class="construct-item ' + cls + '">' +
        '<span class="icon">' + icon + '</span>' +
        '<span>' + name + '</span>' +
        '</div>';
    }

    // ── SVG history chart ────────────────────────────────
    //
    // Simple line chart: X = time (scan index), Y = finalScore (0–10).
    // Uses SVG viewBox so it scales to any panel width.

    function buildHistoryChart(entries) {
      if (entries.length === 0) {
        return '<p class="empty-state">No history yet — run a scan to start tracking.</p>';
      }

      var W = 400, H = 110;
      var PAD_TOP = 10, PAD_BOTTOM = 14, PAD_LEFT = 24, PAD_RIGHT = 12;
      var plotW = W - PAD_LEFT - PAD_RIGHT;
      var plotH = H - PAD_TOP - PAD_BOTTOM;

      function xOf(i) {
        return PAD_LEFT + (entries.length === 1 ? plotW / 2 : (i / (entries.length - 1)) * plotW);
      }
      function yOf(score) {
        return PAD_TOP + plotH - (score / 10) * plotH;
      }

      // Horizontal guide lines at 2.5, 5, 7.5, 10
      var gridLines = [2.5, 5, 7.5, 10].map(function(v) {
        var y = yOf(v).toFixed(1);
        return '<line x1="' + PAD_LEFT + '" y1="' + y + '" x2="' + (W - PAD_RIGHT) + '" y2="' + y + '"' +
               ' stroke="var(--vscode-editorWidget-border,#555)" stroke-width="0.5" stroke-dasharray="3,3"/>' +
               '<text x="' + (PAD_LEFT - 4) + '" y="' + (parseFloat(y) + 3).toFixed(1) + '"' +
               ' fill="var(--vscode-descriptionForeground)" font-size="8" text-anchor="end">' + v + '</text>';
      }).join('');

      // Build point coordinates
      var coords = entries.map(function(e, i) {
        return { x: xOf(i).toFixed(1), y: yOf(e.finalScore).toFixed(1) };
      });

      var polyline = entries.length > 1
        ? '<polyline points="' + coords.map(function(p) { return p.x + ',' + p.y; }).join(' ') + '"' +
          ' fill="none" stroke="var(--vscode-progressBar-background,#0e70c0)" stroke-width="1.5"/>'
        : '';

      var dots = coords.map(function(p, i) {
        return '<circle cx="' + p.x + '" cy="' + p.y + '" r="3"' +
               ' fill="var(--vscode-progressBar-background,#0e70c0)"/>' +
               '<title>' + entries[i].date + ': ' + entries[i].finalScore.toFixed(1) + '</title>';
      }).join('');

      var svg = '<svg class="history-chart" viewBox="0 0 ' + W + ' ' + H + '"' +
                ' xmlns="http://www.w3.org/2000/svg" style="height:110px">' +
                gridLines + polyline + dots + '</svg>';

      var dateRow = '<div class="history-dates">' +
        '<span>' + entries[0].date + '</span>' +
        (entries.length > 1 ? '<span>' + entries[entries.length - 1].date + '</span>' : '') +
        '</div>';

      return svg + dateRow;
    }

    // ── Utilities ────────────────────────────────────────

    function capitalize(s) {
      return s.charAt(0).toUpperCase() + s.slice(1);
    }

    function refresh() {
      vscodeApi.postMessage({ type: 'refresh' });
    }
  </script>
</body>
</html>`;
}
