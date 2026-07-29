// ② 코드 블록 문법 하이라이트 — 외부 의존 없음.
// .codewrap.code pre 만 대상. 첫 줄로 파이썬·JSON·SQL·TOML(금고)을 판별하고, 그 밖은 그대로 둔다.
// pre.innerHTML만 바꾸므로 textContent(복사 버튼이 쓰는 값)는 변하지 않는다.
document.addEventListener('DOMContentLoaded', function () {
  function esc(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  var PY_KW = '\\b(?:import|from|as|def|return|if|elif|else|for|while|in|not|and|or|with|try|except|finally|lambda|class|pass|break|continue|is|True|False|None|raise|yield|del)\\b';
  var RULES = {
    python: {
      re: new RegExp(
        '(#[^\\n]*)' +
        '|("""[\\s\\S]*?"""|\'\'\'[\\s\\S]*?\'\'\')' +
        '|([fFrRbB]{0,2}"(?:[^"\\\\\\n]|\\\\.)*"|[fFrRbB]{0,2}\'(?:[^\'\\\\\\n]|\\\\.)*\')' +
        '|(^\\s*@[\\w.]+)' +
        '|(' + PY_KW + ')' +
        '|(\\b\\d+(?:\\.\\d+)?\\b)', 'gm'),
      cls: ['c', 's', 's', 'd', 'k', 'n'],
    },
    json: {
      re: /("(?:[^"\\]|\\.)*")(?=\s*:)|("(?:[^"\\]|\\.)*")|(-?\b\d+(?:\.\d+)?\b)|\b(true|false|null)\b/g,
      cls: ['d', 's', 'n', 'k'],
    },
    sql: {
      re: /(--[^\n]*)|('(?:[^'\\]|\\.)*')|("(?:[^"\\]|\\.)*")|\b(create|table|insert|select|alter|enable|policy|on|for|to|using|with|check|primary|key|default|not|null|bigint|text|timestamptz|now|generated|always|identity|row|level|security|anon|authenticated)\b/gi,
      cls: ['c', 's', 's', 'k'],
    },
    toml: {
      re: /(#[^\n]*)|("(?:[^"\\]|\\.)*")|^([A-Za-z_][\w]*)(?=\s*=)/gm,
      cls: ['c', 's', 'd'],
    },
  };

  function detect(text) {
    var t = text.trim();
    if (!t) return null;
    var first = t.split('\n')[0].trim();
    if (/^(import\s|from\s|#|@|def\s|""")/.test(first) || /^(import|from)\s/m.test(t)) return 'python';
    if (/^\{/.test(t)) return 'json';
    if (/^(create\s+table|alter\s+table|--)/i.test(first)) return 'sql';
    if (/^[A-Za-z_][\w]*\s*=\s*"/.test(first)) return 'toml';
    return null;
  }

  function paint(pre, mode) {
    var rule = RULES[mode];
    var text = pre.textContent;
    var out = '', last = 0, m;
    rule.re.lastIndex = 0;
    while ((m = rule.re.exec(text))) {
      out += esc(text.slice(last, m.index));
      var gi = -1;
      for (var i = 1; i < m.length; i++) { if (m[i] !== undefined) { gi = i; break; } }
      var c = gi > 0 ? rule.cls[gi - 1] : '';
      out += c ? '<span class="tok-' + c + '">' + esc(m[0]) + '</span>' : esc(m[0]);
      last = m.index + m[0].length;
      if (m[0].length === 0) rule.re.lastIndex++;
    }
    out += esc(text.slice(last));
    pre.innerHTML = out;
  }

  document.querySelectorAll('.codewrap.code pre').forEach(function (pre) {
    var mode = detect(pre.textContent);
    if (mode) paint(pre, mode);
  });
});
