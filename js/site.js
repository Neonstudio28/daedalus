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
    const funded = q * c * advanceRate;
    const monthlyRate = .11 / 12;
    const amortized = funded * monthlyRate / (1 - (1 + monthlyRate) ** -months);
    const payment = Math.min(q * r * .7, amortized);
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
  const copy = $('#copy-note');
  const status = $('.copy-status');
  const compose = () => {
    const data = new FormData(form);
    return `Hello Daedalus,\n\nMy name is ${data.get('name') || ''}.\nI am a: ${data.get('type') || ''}\nCompany or organization: ${data.get('org') || ''}\n\n${data.get('message') || ''}\n\nReply to: ${data.get('email') || ''}`;
  };
  form.addEventListener('input', () => {
    $('#mailto-link').href = `mailto:hello@daedalus.tech?subject=${encodeURIComponent('Fleet financing inquiry')}&body=${encodeURIComponent(compose())}`;
  });
  copy.addEventListener('click', async event => {
    event.preventDefault();
    try {
      await navigator.clipboard.writeText(compose());
      status.textContent = 'Copied. Paste it into your email app.';
    } catch {
      status.textContent = 'Copy is unavailable in this browser.';
    }
    setTimeout(() => status.textContent = '', 3000);
  });
  form.dispatchEvent(new Event('input'));
}

function init() {
  mountGlass();
  initNav();
  initFaq();
  initFleetCalculator();
  initQuote();
  initMonitor();
  initContact();
  route();
  revealInView();
}

addEventListener('hashchange', route);
addEventListener('DOMContentLoaded', init);
