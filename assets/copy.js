// 코드/프롬프트 블록에 복사 버튼을 자동으로 붙인다.
document.addEventListener('DOMContentLoaded', function () {
  // 구형·비보안(http, file://) 환경용 복사. 화면 밖 textarea에 담아 execCommand로 복사한다.
  function legacyCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '-1000px';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, ta.value.length); // 모바일 사파리는 이 줄이 있어야 전체가 잡힌다
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    return ok;
  }

  document.querySelectorAll('.codewrap').forEach(function (wrap) {
    var pre = wrap.querySelector('pre');
    if (!pre) return;
    var btn = document.createElement('button');
    btn.className = 'copy-btn';
    btn.type = 'button';
    btn.textContent = '복사';

    function flash(label, done) {
      btn.textContent = label;
      if (done) btn.classList.add('done');
      setTimeout(function () {
        btn.textContent = '복사';
        btn.classList.remove('done');
      }, done ? 1500 : 2500);
    }

    // 마지막 수단: 자동 복사가 다 막힌 환경에서만 직접 선택해 준다.
    function selectOnly() {
      var range = document.createRange();
      range.selectNodeContents(pre);
      var sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      flash('Ctrl+C(⌘+C)를 눌러주세요', false);
    }

    btn.addEventListener('click', function () {
      var text = pre.innerText;
      // 비보안(http·file://) 환경에는 navigator.clipboard 자체가 없다 → 곧장 대체 경로
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () {
          flash('복사됨 ✓', true);
        }).catch(function () {
          if (legacyCopy(text)) flash('복사됨 ✓', true);
          else selectOnly();
        });
      } else if (legacyCopy(text)) {
        flash('복사됨 ✓', true);
      } else {
        selectOnly();
      }
    });

    wrap.appendChild(btn);
  });
});
