/* SkillPath Cognitive Check — dynamic questions with config & source banner (MIT) */
const SECTIONS = ['intro','study','task','results'];
const SEC = s => document.getElementById(s);
const fmt = (ms)=>{ const m=Math.floor(ms/60000), s=Math.floor((ms%60000)/1000), d=Math.floor((ms%1000)/100); return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${d}`; };

// Embedded fallback items for file:// usage (when fetch is blocked)
const EMBEDDED_ITEMS = [{"id": "triangular-next", "kind": "mcq", "prompt": "Next triangular number after 10?", "choices": ["15", "16", "21"], "answer_index": 0, "construct": "STM", "weight": 1.0, "min_age": 10, "max_age": 18, "tags": ["math", "memory"]}, {"id": "traffic-go", "kind": "mcq", "prompt": "Which color is commonly associated with GO signals?", "choices": ["Red", "Green", "Blue"], "answer_index": 1, "construct": "STM", "weight": 1.0, "min_age": 8, "max_age": 18, "tags": ["general-knowledge"]}, {"id": "chunking-tip", "kind": "mcq", "prompt": "Which is the recommended quick memory strategy?", "choices": ["Write a poem", "Chunk in 3’s", "Sleep 8 hours now"], "answer_index": 1, "construct": "STM", "weight": 1.0, "min_age": 10, "max_age": 99, "tags": ["memory"]}, {"id": "doubling-series", "kind": "mcq", "prompt": "What comes next: 2, 4, 8, 16, …?", "choices": ["20", "24", "32"], "answer_index": 2, "construct": "FR", "weight": 1.5, "min_age": 12, "max_age": 99, "tags": ["pattern", "reasoning"]}, {"id": "easy-counting", "kind": "mcq", "prompt": "How many sides does a triangle have?", "choices": ["2", "3", "4"], "answer_index": 1, "construct": "STM", "weight": 0.5, "min_age": 6, "max_age": 9, "tags": ["math"]}, {"id": "color-primary", "kind": "mcq", "prompt": "Which one is a primary color of light?", "choices": ["Green", "Cyan", "Yellow"], "answer_index": 0, "construct": "STM", "weight": 0.8, "min_age": 10, "max_age": 18, "tags": ["science"]}];

const state = {
  started: false,
  age: null,
  study: { open:false, tStart:0, tEnd:0, max: 30000, hintCount:0 },
  task:  { tStart:0, tEnd:0, max: 120000, hintCount:0, submitted:false },
  clicks: { help:0, rl:0 },
  scores: { Si: 0, Sf: 0, Sa: 100 },
  iq: 50,
  completedFlag: 0,
  questionBank: [],
  activeQuestions: [],
  cfg: {},           // loaded from questions.json: {max_items, randomize}
  source: 'fallback'   // 'json' or 'fallback'
};

document.querySelectorAll('button.link').forEach(btn=>btn.addEventListener('click', ()=>showSection(btn.dataset.section)));
function showSection(id){ SECTIONS.forEach(s=>SEC(s).classList.toggle('show', s===id)); }

const contrastToggle = document.getElementById('contrastToggle');
contrastToggle.addEventListener('click', ()=>{ const b=document.body.classList.toggle('high-contrast'); contrastToggle.setAttribute('aria-pressed', b?'true':'false'); });

// Tiny status banner
function setBanner(text){ 
  let el = document.getElementById('qBanner');
  if(!el){ 
    el = document.createElement('div'); 
    el.id='qBanner'; 
    el.className='mono muted small'; 
    el.style.margin='0.5rem 0 0'; 
    SEC('task').insertBefore(el, SEC('task').firstChild);
  }
  el.textContent = text; 
}

async function loadQuestionBank(){
  try {
    const res = await fetch('questions.json', {cache:'no-store'});
    if(!res.ok) throw new Error('questions.json not found or blocked');
    const data = await res.json();
    state.questionBank = Array.isArray(data.items) ? data.items : [];
    state.cfg = data.config || {};
    state.source = 'json';
  } catch(e) {
    console.warn('Falling back to embedded items:', e.message);
    state.questionBank = EMBEDDED_ITEMS;
    state.cfg = {};
    state.source = 'fallback';
  }
}

SEC('consentForm').addEventListener('submit', async (e)=>{
  e.preventDefault();
  const ok = document.getElementById('consentChk').checked;
  if(!ok) { alert('Please confirm the consent statement.'); return; }
  const ageVal = Number(document.getElementById('ageInput').value);
  if(!Number.isFinite(ageVal) || ageVal < 4){ alert('Please enter a valid age.'); return; }
  state.age = ageVal;
  state.started = true;

  await loadQuestionBank();
  pickQuestionsForAge();

  showSection('study');
  state.study.open = true;
  state.study.tStart = performance.now();
  SEC('studyMax').textContent = fmt(state.study.max);
  SEC('taskMax').textContent = fmt(state.task.max);
});

function pickQuestionsForAge(){
  let pool = state.questionBank.filter(q => {
    const minA = (q.min_age ?? 0), maxA = (q.max_age ?? 200);
    return state.age >= minA && state.age <= maxA && q.kind === 'mcq';
  });

  // Optional randomize + max_items from config
  const maxItems = Number.isFinite(state.cfg.max_items) ? state.cfg.max_items : Infinity;
  if(state.cfg.randomize) {
    for(let i=pool.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [pool[i],pool[j]]=[pool[j],pool[i]]; }
  }

  // By default, include ALL items (no silent cap)
  state.activeQuestions = pool.slice(0, maxItems);

  renderQuestions();
  setBanner(`Loaded ${state.activeQuestions.length} item(s) for age ${state.age} from ${state.source==='json'?'questions.json':'embedded fallback'}`);
}

function renderQuestions(){
  const mount = document.getElementById('questionMount');
  mount.innerHTML = '';
  if(state.activeQuestions.length === 0){
    mount.innerHTML = '<p class="muted">No questions available for this age range yet. Please add items to <code>questions.json</code>.</p>';
    return;
  }
  state.activeQuestions.forEach((q, idx)=>{
    const field = document.createElement('fieldset');
    const legend = document.createElement('legend');
    legend.textContent = `Q${idx+1}. ${q.prompt}`;
    field.appendChild(legend);
    if(q.choices && Array.isArray(q.choices)){
      q.choices.forEach((choice, ci)=>{
        const lbl = document.createElement('label');
        const inp = document.createElement('input');
        inp.type = 'radio'; inp.name = `q_${q.id}`; inp.value = String(ci);
        lbl.appendChild(inp);
        lbl.append(' ' + choice);
        field.appendChild(lbl);
      });
    }
    mount.appendChild(field);
  });
}

let studyTicker=null;
function startStudyTicker(){
  if(studyTicker) cancelAnimationFrame(studyTicker);
  const tick=()=>{
    if(!state.study.open) return;
    const t = performance.now() - state.study.tStart;
    SEC('studyTimer').textContent = fmt(t);
    studyTicker = requestAnimationFrame(tick);
  };
  tick();
}
startStudyTicker();

document.getElementById('openHint').addEventListener('click', ()=>{
  state.study.hintCount += 1;
  state.clicks.help += 1;
  const hintEl = document.getElementById('hintArea');
  const tips = [
    'Triangular numbers add +1, +2, +3… 10 + 5 = 15.',
    'Traffic signals: green = go.',
    'Chunking groups items (e.g., 3s) for easier recall.'
  ];
  hintEl.textContent = tips[(state.study.hintCount-1) % tips.length];
});

document.getElementById('closeStudy').addEventListener('click', ()=>{
  if(state.study.open){ state.study.tEnd = performance.now(); state.study.open = false; }
  showSection('task'); startTaskTimer();
});

const iqSlider = document.getElementById('iqSlider');
const iqOut = document.getElementById('iqOut');
iqSlider.addEventListener('input', ()=>{ iqOut.textContent = iqSlider.value; state.iq = Number(iqSlider.value); });

let taskTicker=null;
function startTaskTimer(){
  state.task.tStart = performance.now(); state.completedFlag = 0;
  if(taskTicker) cancelAnimationFrame(taskTicker);
  const tick=()=>{
    if(state.task.submitted) return;
    const t = performance.now() - state.task.tStart;
    SEC('taskTimer').textContent = fmt(t);
    taskTicker = requestAnimationFrame(tick);
  };
  tick();
}

document.getElementById('taskHint').addEventListener('click', ()=>{ state.task.hintCount += 1; state.clicks.rl += 1; alert('Use elimination and pattern recognition.'); });

document.getElementById('quizForm').addEventListener('submit', (e)=>{
  e.preventDefault();
  if(state.activeQuestions.length === 0){ alert('No questions rendered.'); return; }
  let totalW=0, gotW=0;
  state.activeQuestions.forEach(q=>{
    const ans = (new FormData(e.target)).get(`q_${q.id}`);
    const weight = Number.isFinite(q.weight) ? q.weight : 1.0;
    totalW += weight;
    if(ans !== null && Number(ans) === Number(q.answer_index)) gotW += weight;
  });
  const pct = totalW>0 ? (gotW/totalW)*100 : 0;
  if(state.scores.Si === 0) state.scores.Si = Math.round(pct);
  state.scores.Sf = Math.round(pct);
  state.task.tEnd = performance.now();
  state.task.submitted = true;
  state.completedFlag = 1;
  computeAndRender(); showSection('results');
});

function computeAndRender(){
  const Sa = state.scores.Sa;
  const LTM = (state.scores.Si / Sa);
  const STM = (state.scores.Sf / Sa);
  const WM  = 0.5*STM + 0.5*(state.iq/100);
  const t_access = state.study.tEnd>0 ? (state.study.tEnd - state.study.tStart) : state.study.max;
  const AVPI = (state.study.max - Math.min(t_access, state.study.max)) / state.study.max;
  const AVP  = 0.5*STM + 0.5*AVPI;
  const fa = state.study.tEnd>0 ? 1 : 0;
  const fh = state.clicks.help;
  const frlh = state.clicks.rl;
  const invOrZero = x => x>0 ? 1/x : 0;
  const FRI = (invOrZero(fa) + invOrZero(fh) + invOrZero(frlh)) / 3;
  const FR  = 0.5*STM + 0.5*FRI;
  const Ts = Math.max(0, state.task.tEnd - state.task.tStart);
  const PSI = (state.task.max - Math.min(Ts, state.task.max)) / state.task.max;
  const PS  = 0.5*STM + 0.5*PSI;
  const Tp  = 0.5*(AVPI + PSI);
  const F   = state.completedFlag ? 1.0 : 0.1;
  const ATI = 0.5*Tp + 0.5*F;
  const ATN = 0.5*STM + 0.5*ATI;
  const alphas = [0.1,0.2,0.2,0.1,0.1,0.2,0.1];
  const metrics = [LTM, STM, WM, FR, AVP, PS, ATN];
  const CCS = metrics.reduce((acc,m,i)=> acc + alphas[i]*m, 0);
  const rows = [['LTM',LTM],['STM',STM],['WM',WM],['FR',FR],['AVP',AVP],['PS',PS],['ATN',ATN],['CCS',CCS]];
  const grid = document.getElementById('scoreGrid'); grid.innerHTML='';
  rows.forEach(([k,v])=>{ const card=document.createElement('div'); card.className='card show'; const pct=Math.round(v*100); card.innerHTML=`
      <div class="row space-between"><h3>${k}</h3><span class="badge ${pct>=60?'ok':'warn'}">${pct}</span></div>
      <div class="mono muted">raw: ${v.toFixed(3)}</div>
      <progress max="1" value="${v}" style="width:100%"></progress>`; grid.appendChild(card); });
  window._lastResults = {
    name: document.getElementById('displayName').value || null,
    age: state.age,
    timestamps: { studyStart: state.study.tStart||null, studyEnd: state.study.tEnd||null, taskStart: state.task.tStart||null, taskEnd: state.task.tEnd||null },
    counts: { studyOpens: state.study.tEnd>0 ? 1 : 0, helpClicks: state.clicks.help, hintClicks: state.clicks.rl },
    scores: { Si: state.scores.Si, Sf: state.scores.Sf, Sa: state.scores.Sa },
    IQ_proxy: state.iq,
    items: state.activeQuestions.map(q=>({ id:q.id, construct:q.construct, weight:q.weight })),
    metrics: Object.fromEntries(rows.map(([k,v])=>[k, Number(v.toFixed(6))]))
  };
}

document.getElementById('exportJson').addEventListener('click', ()=>{
  if(!window._lastResults) { alert('No results yet.'); return; }
  const blob = new Blob([JSON.stringify(window._lastResults,null,2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href:url, download:'skillpath_results.json' });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 2000);
});

document.getElementById('exportCsv').addEventListener('click', ()=>{
  if(!window._lastResults) { alert('No results yet.'); return; }
  const r = window._lastResults;
  const flat = {
    name: r.name || '',
    age: r.age || '',
    Si: r.scores.Si, Sf: r.scores.Sf, Sa: r.scores.Sa,
    IQ_proxy: r.IQ_proxy,
    LTM: r.metrics.LTM, STM: r.metrics.STM, WM: r.metrics.WM,
    FR: r.metrics.FR, AVP: r.metrics.AVP, PS: r.metrics.PS, ATN: r.metrics.ATN,
    CCS: r.metrics.CCS
  };
  const header = Object.keys(flat).join(',');
  const row = Object.values(flat).join(',');
  const csv = header + "\n" + row + "\n";
  const blob = new Blob([csv], {type:'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href:url, download:'skillpath_results.csv' });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 2000);
});

document.getElementById('reset').addEventListener('click', ()=>window.location.reload());
