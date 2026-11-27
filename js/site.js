import { mountGlass } from './glass.js';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const money = value => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
const number = value => new Intl.NumberFormat('en-US').format(Math.round(value));

const TITLES = {
  home: 'Daedalus — The bank for robot fleets',
  'how-it-works': 'How it works — Daedalus',
  'robot-companies': 'For robot companies — Daedalus',
  'capital-partners': 'For capital partners — Daedalus',
  'why-now': 'Why now — Daedalus',
  compare: 'Compare — Daedalus',
  quote: 'Get a quote — Daedalus',
  contact: 'Contact — Daedalus'
};

function currentPage() {
  const hash = location.hash.replace('#', '') || 'home';
  return TITLES[hash] ? hash : 'home';
}

function route() {
  const page = currentPage();
  $$('.page').forEach(el => el.classList.toggle('active', el.dataset.page === page));
  $$('[data-route]').forEach(link => {
    const active = link.getAttribute('href') === `#${page}`;
    link.classList.toggle('active', active);
    if (active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  document.title = TITLES[page];
  document.querySelector('.site-head')?.classList.remove('open');
  $('.menu-button')?.setAttribute('aria-expanded', 'false');
  window.scrollTo({ top: 0, behavior: 'instant' });
  requestAnimationFrame(() => {
    const title = $(`.page[data-page="${page}"] h1`);
    if (title) {
      title.setAttribute('tabindex', '-1');
      title.focus({ preventScroll: true });
    }
    revealInView();
  });
}

function revealInView() {
  const io = revealInView.io ||= new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
  $$('[data-reveal]:not(.in)').forEach(el => io.observe(el));
}

function initNav() {
  const head = $('.site-head');
  $('.skip')?.addEventListener('click', event => {
    event.preventDefault();
    const title = $('.page.active h1');
    if (title) {
      title.setAttribute('tabindex', '-1');
      title.focus();
      title.scrollIntoView({ block: 'start' });
    }
  });
  const onScroll = () => head.classList.toggle('scrolled', scrollY > 12);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  $('.menu-button')?.addEventListener('click', () => {
    const open = head.classList.toggle('open');
    $('.menu-button').setAttribute('aria-expanded', String(open));
  });
  $$('.nav-links a').forEach(a => a.addEventListener('click', () => head.classList.remove('open')));
}

function initFaq() {
  $$('.qa button').forEach(button => {
    button.addEventListener('click', () => {
      const item = button.closest('.qa');
      const open = !item.classList.contains('open');
      item.classList.toggle('open', open);
      button.setAttribute('aria-expanded', String(open));
    });
  });
}

function bindRange(input, output, format = number) {
  const update = () => output.textContent = format(Number(input.value));
  input.addEventListener('input', update);
  update();
}

function initFleetCalculator() {
  const root = $('#fleet-calc');
  if (!root) return;
  const qty = $('#calc-qty'), cost = $('#calc-cost'), rent = $('#calc-rent');
  bindRange(qty, $('#calc-qty-out'));
  bindRange(cost, $('#calc-cost-out'), money);
  bindRange(rent, $('#calc-rent-out'), money);
  const update = () => {
    const q = Number(qty.value), c = Number(cost.value), r = Number(rent.value);
    $('#cash-tied').textContent = money(q * c);
    $('#monthly-rent').textContent = money(q * r);
    $('#payback').textContent = `${Math.ceil(c / r)} mo`;
    $('#placement-capital').textContent = money(q * c);
  };
  [qty, cost, rent].forEach(input => input.addEventListener('input', update));
  update();
}

const QUOTE_PRESETS = {
  layout: { cost: 90000, rent: 5000 },
  drilling: { cost: 140000, rent: 6900 },
  rebar: { cost: 75000, rent: 3900 }
};

function initQuote() {
  const root = $('#quote-tool');
  if (!root) return;
  const type = $('#q-type'), qty = $('#q-qty'), cost = $('#q-cost'), rent = $('#q-rent'), uptime = $('#q-uptime'), term = $('#q-term');
  const applyPreset = () => {
    const preset = QUOTE_PRESETS[type.value];
    cost.value = preset.cost;
    rent.value = preset.rent;
    update();
  };
  const update = () => {
    $('#q-qty-out').textContent = number(Number(qty.value));
    $('#q-uptime-out').textContent = `${uptime.value}%`;
    $('#q-cost-out').textContent = money(Number(cost.value));
    $('#q-rent-out').textContent = money(Number(rent.value));
    $('#q-term-out').textContent = `${term.value} mo`;

    const q = Number(qty.value), c = Number(cost.value), r = Number(rent.value), u = Number(uptime.value), months = Number(term.value);
    const advanceRate = Math.max(.5, Math.min(.85, .5 + (u - 70) / 30 * .35));
    const monthlyRate = .11 / 12;
    const paymentCap = q * r * .7;
    const annuityFactor = (1 - (1 + monthlyRate) ** -months) / monthlyRate;
    const funded = Math.min(q * c * advanceRate, paymentCap * annuityFactor);
    const payment = funded / annuityFactor;
    $('#quote-funded').textContent = money(funded);
    $('#quote-payment').textContent = money(payment);
    $('#quote-cash').textContent = money(q * c - funded);
    $('#quote-payback').textContent = `${Math.ceil(c / r)} mo`;
  };
  type.addEventListener('change', applyPreset);
  [qty, cost, rent, uptime, term].forEach(input => input.addEventListener('input', update));
  applyPreset();
}

function initMonitor() {
  const rows = $$('.fleet-row.body');
  if (!rows.length) return;
  const detailName = $('#detail-name'), detailMeta = $('#detail-meta'), detailNote = $('#detail-note');
  const data = {
    layout: {
      name: 'FieldPrinter L-014',
      meta: 'Layout robot · Dallas data-center shell · Example data',
      note: 'Hours are steady across the month. Two low-output days match a scheduled concrete pour.',
      bars: [82, 76, 88, 91, 85, 79, 92, 89, 84, 90, 93, 86, 82, 78, 87, 92, 94, 89, 85, 81, 77, 84, 91, 88, 86, 92, 89, 83]
    },
    drilling: {
      name: 'Drilling unit D-208',
      meta: 'Drilling robot · Fort Worth commercial project · Example data',
      note: 'Uptime slipped for three days after a bit replacement. Rent is current and utilization is recovering.',
      bars: [72, 78, 80, 84, 82, 74, 68, 38, 42, 57, 70, 77, 82, 86, 84, 79, 81, 85, 87, 83, 79, 76, 81, 84, 86, 82, 78, 80]
    },
    rebar: {
      name: 'Rebar unit R-101',
      meta: 'Rebar-tying robot · North Texas industrial build · Example data',
      note: 'The robot is ready most days, with output rising as the crew reaches a repeatable grid.',
      bars: [55, 59, 63, 68, 71, 69, 73, 76, 74, 78, 81, 79, 82, 85, 83, 80, 84, 86, 88, 85, 82, 86, 89, 91, 87, 84, 88, 90]
    }
  };
  const select = key => {
    rows.forEach(row => row.classList.toggle('selected', row.dataset.robot === key));
    const robot = data[key];
    detailName.textContent = robot.name;
    detailMeta.textContent = robot.meta;
    detailNote.textContent = robot.note;
    const chart = $('#detail-chart');
    chart.innerHTML = robot.bars.map(v => `<i class="${v < 50 ? 'low' : ''}" style="--h:${v}%"></i>`).join('');
  };
  rows.forEach(row => {
    row.addEventListener('click', () => select(row.dataset.robot));
    row.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        select(row.dataset.robot);
      }
    });
  });
  select('layout');
}

function initContact() {
  const form = $('#contact-form');
  if (!form) return;
  const submit = $('#send-note');
  const status = $('.copy-status');
  const mailto = $('#mailto-link');
  const compose = () => {
    const data = new FormData(form);
    return `Hello Daedalus,\n\nMy name is ${data.get('name') || ''}.\nI am a: ${data.get('type') || ''}\nCompany or organization: ${data.get('org') || ''}\n\n${data.get('message') || ''}\n\nReply to: ${data.get('email') || ''}`;
  };
  form.addEventListener('input', () => {
    mailto.href = `mailto:sales@trydaedalus.tech?subject=${encodeURIComponent('Fleet financing inquiry')}&body=${encodeURIComponent(compose())}`;
  });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    submit.disabled = true;
    status.textContent = 'Sending…';
    const payload = Object.fromEntries(new FormData(form).entries());
    payload._replyto = payload.email;
    try {
      const endpoint = form.action.replace('https://formsubmit.co/', 'https://formsubmit.co/ajax/');
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload)
      });
      const text = await response.text();
      let result = {};
      try { result = JSON.parse(text); } catch {}
      const needsActivation = result.message?.includes('needs Activation') || text.includes('needs Activation');
      if (!needsActivation && (!response.ok || result.success === 'false' || result.success === false)) throw new Error(result.message || 'Submission failed');
      form.reset();
      form.dispatchEvent(new Event('input'));
      status.textContent = needsActivation
        ? 'Message received. It will be delivered after email activation is confirmed.'
        : 'Message sent. We will reply by email.';
    } catch {
      status.textContent = 'Sending failed. Please use the email app button.';
    } finally {
      submit.disabled = false;
      setTimeout(() => status.textContent = '', 5000);
    }
  });
  form.dispatchEvent(new Event('input'));
}

function scrambleLabel(el, duration = 620) {
  if (el.dataset.scrambling) return;
  const original = el.dataset.originalText || el.textContent;
  el.dataset.originalText = original;
  el.dataset.scrambling = 'true';
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const start = performance.now();
  const tick = now => {
    const progress = Math.min(1, (now - start) / duration);
    const settled = Math.floor(progress * original.length);
    let out = '';
    for (let i = 0; i < original.length; i++) {
      const ch = original[i];
      if (ch === ' ' || i < settled) out += ch;
      else out += chars[Math.floor(Math.random() * chars.length)];
    }
    el.textContent = out;
    if (progress < 1) requestAnimationFrame(tick);
    else {
      el.textContent = original;
      delete el.dataset.scrambling;
    }
  };
  requestAnimationFrame(tick);
}

function initNavScramble() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  $$('.nav-links a').forEach(link => {
    link.dataset.originalText = link.textContent;
    const run = () => scrambleLabel(link);
    link.addEventListener('mouseenter', run);
    link.addEventListener('focus', run);
    link.addEventListener('click', run);
  });
}

function animateFigure(el) {
  if (el.dataset.animated) return;
  el.dataset.animated = 'true';
  const finalText = el.textContent.trim();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) return;
  const numeric = finalText.match(/^([^\d]*)([\d,.]+)([^\d]*)$/);
  const rangeLike = finalText.includes('-') || finalText.includes('–');
  if (!numeric || rangeLike) {
    scrambleLabel(el, 760);
    return;
  }
  const [, prefix, raw, suffix] = numeric;
  const target = Number(raw.replace(/,/g, ''));
  const decimals = (raw.split('.')[1] || '').length;
  const useCommas = raw.includes(',');
  const start = performance.now();
  const duration = 1250;
  const tick = now => {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - (1 - t) ** 4;
    const value = target * eased;
    const formatted = decimals ? value.toFixed(decimals) : useCommas ? number(value) : String(Math.round(value));
    el.textContent = `${prefix}${formatted}${suffix}`;
    if (t < 1) requestAnimationFrame(tick);
    else el.textContent = finalText;
  };
  el.textContent = `${prefix}${decimals ? (0).toFixed(decimals) : '0'}${suffix}`;
  requestAnimationFrame(tick);
}

function initGiantDecrypt() {
  const word = $('.decrypt-target');
  if (!word || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const chars = [...word.textContent.trim()];
  const pool = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const speed = 92;
  const maxIterations = 8;
  word.setAttribute('aria-label', chars.join(''));
  const measureContext = document.createElement('canvas').getContext('2d');
  if (!measureContext) return;
  let charIndex = 0;
  word.innerHTML = chars.join('').split(' ').map(part => {
    const html = `<span class="decrypt-word">${[...part].map(char => {
      const index = charIndex++;
      return `<span class="decrypt-char" data-i="${index}">${char}</span>`;
    }).join('')}</span>`;
    charIndex++;
    return html;
  }).join(' ');
  const letters = [...word.querySelectorAll('.decrypt-char')];
  const style = getComputedStyle(word);
  measureContext.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  letters.forEach(letter => { letter._decryptWidth = letter.getBoundingClientRect().width; });
  let frame = 0;
  let played = false;

  const randomChar = () => pool[Math.floor(Math.random() * pool.length)];
  const paint = (letter, glyph, revealed) => {
    const index = Number(letter.dataset.i);
    letter.classList.toggle('encrypted', !revealed);
    letter.textContent = glyph;
    if (revealed) {
      letter.style.transform = '';
      return;
    }
    const room = letter._decryptWidth || 1;
    const need = measureContext.measureText(glyph).width;
    letter.style.transform = need > room ? `scaleX(${Math.max(.45, room / need)})` : '';
  };
  const finish = () => {
    frame = 0;
    letters.forEach(letter => paint(letter, chars[Number(letter.dataset.i)], true));
  };
  const start = () => {
    cancelAnimationFrame(frame);
    const started = performance.now();
    const step = now => {
      const iteration = Math.max(1, Math.floor((now - started) / speed) + 1);
      letters.forEach((letter, index) => {
        const revealed = iteration > index + maxIterations;
        paint(letter, revealed ? chars[Number(letter.dataset.i)] : randomChar(), revealed);
      });
      if (iteration >= chars.length + maxIterations) finish();
      else frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
  };

  letters.forEach(letter => paint(letter, randomChar(), false));
  const observer = new IntersectionObserver(entries => {
    if (entries.some(entry => entry.isIntersecting) && !played) {
      played = true;
      start();
      observer.disconnect();
    }
  }, { threshold: 0.2 });
  observer.observe(word);
  word.closest('.cta')?.addEventListener('mouseenter', () => {
    if (played && !frame) start();
  });
}

function initFigureAnimations() {
  const figures = $$('.hero-facts b,.metric b,.stat b');
  if (!figures.length) return;
  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateFigure(entry.target);
        io.unobserve(entry.target);
      }
    });
  }, { threshold: .45 });
  figures.forEach(el => io.observe(el));
}

function initScrollAnimations() {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced || !window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);

  const quote = $('[data-quote-words]');
  if (quote) {
    const words = quote.textContent.trim().split(/\s+/);
    quote.innerHTML = words.map(word => `<span class="quote-word">${word}</span>`).join(' ');
    gsap.fromTo($$('.quote-word', quote), { opacity: .14 }, {
      opacity: 1,
      ease: 'none',
      stagger: .05,
      scrollTrigger: {
        trigger: quote,
        start: 'top 84%',
        end: 'bottom 38%',
        scrub: .55
      }
    });
  }

  const stage = $('.hero-stage');
  if (stage && innerWidth >= 768) {
    const frame = $('.device-frame', stage);
    const shade = $('.device-shade', stage);
    const caption = $('.caption', stage);
    gsap.set(frame, { transformPerspective: 1800, transformOrigin: '50% 0%' });
    gsap.timeline({
      scrollTrigger: {
        trigger: stage,
        start: 'top bottom',
        end: 'top top+=88',
        scrub: .6,
        invalidateOnRefresh: true
      }
    })
      .fromTo(frame, { rotateX: 10, scale: .94 }, { rotateX: 0, scale: .98, ease: 'none' }, 0)
      .fromTo(shade, { opacity: .08 }, { opacity: 0, ease: 'none' }, 0);

    if (stage.offsetHeight + 112 < innerHeight) {
      gsap.timeline({
        scrollTrigger: {
          trigger: stage,
          start: 'top top+=88',
          end: '+=45%',
          pin: true,
          scrub: .6,
          anticipatePin: 1
        }
      })
        .to(frame, { scale: 1, ease: 'none' }, 0)
        .fromTo(caption, { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, ease: 'none', duration: .6 }, .4);
    }
  }

  const line = $('[data-graph-line]');
  if (line) {
    const length = line.getTotalLength();
    const scan = $('[data-scan-dot]');
    const readout = $('[data-cash-readout]');
    const chart = line.closest('.cash-graph');
    const progress = { value: 0 };
    readout.textContent = 'Month 0 · −$90K cash';
    const timeline = gsap.timeline({
      scrollTrigger: { trigger: chart, start: 'top 82%', once: true }
    });
    timeline
      .fromTo(line,
        { strokeDasharray: length, strokeDashoffset: length },
        { strokeDashoffset: 0, duration: 1.7, ease: 'power2.inOut' }, 0)
      .from('.cash-graph .dot', {
        scale: 0,
        transformOrigin: '50% 50%',
        duration: .45,
        ease: 'back.out(3)',
        stagger: .1
      }, .35)
      .to(scan, { opacity: 1, duration: .18 }, 1.35)
      .to(progress, {
        value: 1,
        duration: 2.1,
        ease: 'power1.inOut',
        onUpdate() {
          const point = line.getPointAtLength(length * progress.value);
          scan.setAttribute('cx', point.x);
          scan.setAttribute('cy', point.y);
          const month = Math.round(progress.value * 36);
          const cash = -90 + month * 5;
          const sign = cash < 0 ? '−' : '+';
          readout.textContent = `Month ${month} · ${cash === 0 ? '$0' : `${sign}$${Math.abs(cash)}K`} cash`;
        }
      }, 1.45)
      .to(scan, { opacity: 0, duration: .3 }, '>-0.1');
  }
}

function init() {
  mountGlass();
  initNav();
  initFaq();
  initFleetCalculator();
  initQuote();
  initMonitor();
  initContact();
  initNavScramble();
  initGiantDecrypt();
  initFigureAnimations();
  initScrollAnimations();
  route();
  revealInView();
}

addEventListener('hashchange', route);
addEventListener('DOMContentLoaded', init);
