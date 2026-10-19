/* Dice Dreams Fan Hub — shared scripts (all features guard on element presence) */
(function () {
  /* Cookie / EU-consent banner — auto-injected on every page.
     Records the visitor's choice in localStorage and pushes it to Google's
     consent mode where gtag is available (ads + analytics storage). */
  (function cookieConsent() {
    var KEY = '***';
    function setConsent(state) {
      if (typeof window.gtag === 'function') {
        window.gtag('consent', 'update', { ad_storage: state, analytics_storage: state });
      }
    }
    var saved = null;
    try { saved = localStorage.getItem(KEY); } catch (e) { saved = null; }
    if (saved === 'granted') { setConsent('granted'); return; }
    if (saved === 'denied') { setConsent('denied'); return; }

    var bar = document.createElement('div');
    bar.className = 'cookie-banner';
    bar.setAttribute('role', 'dialog');
    bar.setAttribute('aria-live', 'polite');
    bar.setAttribute('aria-label', 'Cookie consent');
    bar.innerHTML =
      '<div class="cb-copy"><strong>We use cookies.</strong> We use essential cookies and, with your consent, ' +
      'third-party cookies for advertising and analytics to help us improve the guide. ' +
      'Read our <a href="privacy-policy.html">Privacy Policy</a>.</div>' +
      '<div class="cb-actions">' +
      '<button type="button" class="cb-btn cb-decline" data-choice="denied">Decline</button>' +
      '<button type="button" class="cb-btn cb-accept" data-choice="granted">Accept</button>' +
      '</div>';
    document.body.appendChild(bar);

    // Give Google a chance to pick up a default before the first ad request.
    setConsent('denied');
    requestAnimationFrame(function () { bar.classList.add('show'); });

    bar.addEventListener('click', function (ev) {
      var btn = ev.target.closest ? ev.target.closest('.cb-btn') : null;
      if (!btn) return;
      var choice = btn.getAttribute('data-choice');
      try { localStorage.setItem(KEY, choice); } catch (e) { /* private mode: ignore */ }
      setConsent(choice);
      bar.classList.remove('show');
      bar.style.display = 'none';
    });
  })();

  /* Section fade-in (panels are visible via <noscript> fallback if JS is off) */
  var panels = document.querySelectorAll('.section-panel');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in-view'); io.unobserve(e.target); }
      });
    }, { threshold: 0.15 });
    panels.forEach(function (p) { io.observe(p); });
  } else {
    panels.forEach(function (p) { p.classList.add('in-view'); });
  }

  /* Event type filter — cards are static HTML so crawlers can read them */
  var eventGrid = document.getElementById('eventGrid');
  var eventFilters = document.getElementById('eventFilters');
  if (eventGrid && eventFilters) {
    eventFilters.querySelectorAll('.filter-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        eventFilters.querySelectorAll('.filter-btn').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        var f = btn.dataset.filter;
        eventGrid.querySelectorAll('.event-card').forEach(function (card) {
          card.classList.toggle('hidden', f !== 'All' && card.dataset.type !== f);
        });
      });
    });
  }

  /* On-page search */
  var searchInput = document.getElementById('siteSearch');
  if (searchInput) {
    var searchEmpty = document.getElementById('searchEmpty');
    var selectors = '.stage, .tip-card, .event-card, .order-list li, .duo-col li, .sticker-card';
    searchInput.addEventListener('input', function () {
      var q = searchInput.value.trim().toLowerCase();
      var visibleCount = 0;
      document.querySelectorAll(selectors).forEach(function (item) {
        var match = q === '' || item.textContent.toLowerCase().includes(q);
        item.style.display = match ? '' : 'none';
        if (match) visibleCount++;
      });
      document.querySelectorAll('.card-section').forEach(function (sec) {
        var hasSearchable = sec.querySelector(selectors);
        var anyVisible = Array.prototype.slice.call(sec.querySelectorAll(selectors))
          .some(function (el) { return el.style.display !== 'none'; });
        sec.style.display = (q !== '' && hasSearchable && !anyVisible) ? 'none' : '';
      });
      if (searchEmpty) searchEmpty.classList.toggle('show', q !== '' && visibleCount === 0);
    });
  }

  /* Dice allocation planner (used on the calculator page; IDs must match) */
  var totalDice = document.getElementById('totalDice');
  if (totalDice) {
    var evSlider = document.getElementById('evSlider');
    var buSlider = document.getElementById('buSlider');
    var pvSlider = document.getElementById('pvSlider');
    var evPct = document.getElementById('evPct');
    var buPct = document.getElementById('buPct');
    var pvPct = document.getElementById('pvPct');
    var calcWarn = document.getElementById('calcWarn');
    var outEvent = document.getElementById('outEvent');
    var outBuild = document.getElementById('outBuild');
    var outPvp = document.getElementById('outPvp');

    function updateCalc() {
      var total = Math.max(0, Number(totalDice.value) || 0);
      var ev = Number(evSlider.value), bu = Number(buSlider.value), pv = Number(pvSlider.value);
      var sum = ev + bu + pv;

      evPct.textContent = ev + '%';
      buPct.textContent = bu + '%';
      pvPct.textContent = pv + '%';

      calcWarn.textContent = sum !== 100
        ? 'Your three sliders add up to ' + sum + '%. Aim for 100% — figures below are scaled proportionally.'
        : '';

      var safeSum = sum || 1;
      outEvent.textContent = Math.round(total * ev / safeSum);
      outBuild.textContent = Math.round(total * bu / safeSum);
      outPvp.textContent = Math.round(total * pv / safeSum);
    }
    [totalDice, evSlider, buSlider, pvSlider].forEach(function (el) {
      el.addEventListener('input', updateCalc);
    });
    updateCalc();
  }

  /* Bet EV calculator (dice-calculator page second tool; IDs must match) */
  var betDice = document.getElementById('betDice');
  if (betDice) {
    var betMult = document.getElementById('betMult');
    var betRolls = document.getElementById('outRolls');
    var betPerRoll = document.getElementById('outPerRoll');
    var betTriggers = document.getElementById('outTriggers');
    var betAlt = document.getElementById('outAlt');
    var betVerdict = document.getElementById('betVerdict');

    function updateBet() {
      var dice = Math.max(1, Number(betDice.value) || 1);
      var mult = Math.max(1, Number(betMult.value) || 1);
      var rolls = Math.floor(dice / mult);
      // Coins scale with the bet, so total coins from the stack stays roughly flat;
      // but special triggers (raid/target hits) fire per roll, so high bet buys fewer chances.
      betRolls.textContent = rolls.toLocaleString('en-US');
      betPerRoll.textContent = mult + '×';
      betTriggers.textContent = rolls.toLocaleString('en-US');
      betAlt.textContent = Math.floor(dice).toLocaleString('en-US');
      var msg;
      if (mult <= 3) {
        msg = 'Good for collecting and trigger-farming: every roll has the same chance to hit a target or open a chest, and a low bet buys you the most rolls from your stack.';
      } else if (mult <= 15) {
        msg = 'A balanced choice. You clear castle costs fast while still keeping enough rolls that events and chest triggers keep firing. This is where most players should park the bet during normal play.';
      } else {
        msg = 'High bet = fastest coins to fund an expensive castle jump, but far fewer rolls, so card/trigger goals stall. Raise it only when you are short on coins for a specific build, then drop back down.';
      }
      betVerdict.textContent = msg;
    }
    [betDice, betMult].forEach(function (el) { el.addEventListener('input', updateBet); });
    updateBet();
  }

  /* Tip of the day — randomized from a fixed list so the site feels fresh on every
     visit with zero manual maintenance. Picks deterministically by calendar day, so
     it reads as a genuine "today's tip" rather than changing mid-scroll. */
  var tipEl = document.getElementById('tipOfDay');
  if (tipEl) {
    var TIPS = [
      'Bet low when you are hunting cards and chests, bet high only when you need coins to jump a castle level — the two goals want opposite bets.',
      'Never bank dice with no plan. Unspent dice outside an event window are worth a fraction of the same dice spent during a boosted race.',
      'Attack players you can actually finish — a fully destroyed target pays more than three partial hits, and wastes fewer rolls.',
      'Keep a shield up before you log off with a big coin pile; raids happen while you are away, not while you are playing.',
      'Join a team early. Team rewards and co-op events refill dice faster than almost any solo habit.',
      'Complete the daily quests before spending anything — they are the most under-used source of steady dice in the game.',
      'Finish one card set at a time. Half-done sets are worth far less than a closed one, so trade to close, then start the next.',
      'Do not chase the last card by grinding packs. A trading group with a few hundred players almost always has your missing card.',
      'Watch the event calendar before a big push: spending a stacked dice reserve inside a boosted window doubles its value.',
      'Raise the bet multiplier only to a level you can sustain — running max bet drains a stack in a third of the rolls.',
      'Spend coins into castle upgrades before logging off; built progress is much harder to raid than a loose coin pile.',
      'Feeding tokens into your best pet beats spreading them thin — one strong bonus outperforms three weak ones.'
    ];
    var start = new Date(new Date().getFullYear(), 0, 0);
    var dayIndex = Math.floor((new Date() - start) / 86400000);
    tipEl.textContent = TIPS[dayIndex % TIPS.length];
  }
})();
