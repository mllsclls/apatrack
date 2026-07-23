const SUPABASE_URL = 'https://nrhlfdcorynntnizymdk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5yaGxmZGNvcnlubnRuaXp5bWRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ1MzkyODIsImV4cCI6MjEwMDExNTI4Mn0.M8gOiLtvSeDIrWkcq32W0E675STIMJKtWxr7zMvU6HQ';

if (typeof supabase === 'undefined') {
  document.body.innerHTML = `
    <div style="max-width:420px;margin:15vh auto;padding:24px;text-align:center;font-family:sans-serif;color:#a4453b;background:#fdf3f2;border-radius:14px;">
      <strong>No s'ha pogut carregar una peça necessària de l'aplicació.</strong>
      <p style="color:#6b6a66;font-size:0.9rem;">
        Comprova la connexió a internet i torna-ho a provar. Si tens algun bloquejador de contingut o d'anuncis actiu (AdBlock, Brave Shields, un navegador "privacy" del mòbil...), prova de desactivar-lo per a aquesta pàgina: pot estar bloquejant cdn.jsdelivr.net.
      </p>
    </div>`;
  throw new Error('La llibreria de Supabase (window.supabase) no està disponible. Revisa si cdn.jsdelivr.net està bloquejat.');
}

const { createClient } = supabase;
console.log('Àpatrack script carregat — versió debug-2026-07-22-a');
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

const loginView = document.getElementById('login-view');
const appView = document.getElementById('app-view');
const loginMsg = document.getElementById('login-msg');
let editingId = null;
let aiGeneratedFlag = false;
let editingWeightId = null;
let allTimelineItems = [];
let timelineDisplayCount = 8;
const TIMELINE_PAGE_SIZE = 8;

function setMealFieldsToNow() {
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  document.getElementById('meal-date').value = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`;
  document.getElementById('meal-time').value = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

function setWeightFieldsToNow() {
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  document.getElementById('weight-date').value = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`;
  document.getElementById('weight-time').value = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

document.getElementById('send-link').addEventListener('click', async () => {
  console.log('Botó "Envia\'m l\'enllaç" clicat');
  const email = document.getElementById('email').value.trim();
  console.log('Correu llegit:', email);
  if (!email) { loginMsg.textContent = t('invalidEmail'); return; }
  loginMsg.style.color = 'var(--muted)';
  loginMsg.textContent = t('sendingLink');
  try {
    const { error } = await sb.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: window.location.origin + window.location.pathname
      }
    });
    if (error) {
      loginMsg.style.color = 'var(--danger)';
      loginMsg.textContent = 'Error: ' + error.message;
      console.error('signInWithOtp error:', error);
    } else {
      loginMsg.style.color = 'var(--accent)';
      loginMsg.textContent = t('checkEmailLink');
    }
  } catch (err) {
    loginMsg.style.color = 'var(--danger)';
    loginMsg.textContent = 'Error inesperat: ' + (err.message || err);
    console.error('Unexpected error sending magic link:', err);
  }
});

document.getElementById('logout-btn').addEventListener('click', async () => {
  await sb.auth.signOut();
});

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

document.getElementById('photo-camera-btn').addEventListener('click', () => {
  document.getElementById('photo-input-camera').click();
});
document.getElementById('photo-gallery-btn').addEventListener('click', () => {
  document.getElementById('photo-input-gallery').click();
});

async function handlePhotoFile(file) {
  if (!file) return;
  const statusEl = document.getElementById('photo-status');
  statusEl.style.color = 'var(--muted)';
  statusEl.textContent = t('analyzingPhoto');

  try {
    const base64 = await fileToBase64(file);
    const { data: sessionData } = await sb.auth.getSession();
    const accessToken = sessionData?.session?.access_token;

    const resp = await fetch(`${SUPABASE_URL}/functions/v1/analyze-meal-photo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'apikey': SUPABASE_ANON_KEY
      },
      body: JSON.stringify({ image: base64, mimeType: file.type || 'image/jpeg' })
    });

    const data = await resp.json();

    if (!resp.ok || data.error) {
      statusEl.style.color = 'var(--danger)';
      statusEl.textContent = data.message || `Error (${resp.status}) analitzant la foto.`;
      console.error('analyze-meal-photo error:', data);
      return;
    }

    const r = data.result;
    const validTypes = ['esmorzar','mig_mati','dinar','berenar','sopar','altre'];
    if (r.description) document.getElementById('description').value = r.description;
    if (r.meal_type_guess && validTypes.includes(r.meal_type_guess)) {
      document.getElementById('meal-type').value = r.meal_type_guess;
    }
    if (r.calories_approx) document.getElementById('calories').value = r.calories_approx;
    if (r.nutrition_score) document.getElementById('nutrition').value = r.nutrition_score;
    aiGeneratedFlag = true;

    statusEl.style.color = 'var(--accent)';
    statusEl.textContent = t('photoFilled');
  } catch (err) {
    statusEl.style.color = 'var(--danger)';
    statusEl.textContent = 'Error: ' + (err.message || err);
    console.error('Unexpected error analyzing photo:', err);
  }
}

document.getElementById('photo-input-camera').addEventListener('change', (e) => {
  handlePhotoFile(e.target.files[0]);
  e.target.value = '';
});
document.getElementById('photo-input-gallery').addEventListener('change', (e) => {
  handlePhotoFile(e.target.files[0]);
  e.target.value = '';
});

document.getElementById('settings-btn').addEventListener('click', async () => {
  const card = document.getElementById('settings-card');
  card.classList.toggle('hidden');
  if (!card.classList.contains('hidden')) {
    await loadProfileIntoForm();
  }
});

async function loadProfileIntoForm() {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return;
  const { data, error } = await sb.from('user_profiles').select('*').eq('user_id', user.id).maybeSingle();
  if (error) return;
  document.getElementById('display-name').value = data?.display_name || '';
  document.getElementById('birth-date').value = data?.birth_date || '';
  document.getElementById('gender').value = data?.gender || '';
  document.getElementById('height-cm').value = data?.height_cm ?? '';
  document.getElementById('weight-kg').value = data?.weight_kg ?? '';
  document.getElementById('gemini-key').value = data?.gemini_api_key || '';
  document.getElementById('profile-language').value = data?.language || 'ca';
  currentLang = data?.language || 'ca';
  applyTranslations();
}

document.getElementById('save-profile-btn').addEventListener('click', async () => {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return;
  const msg = document.getElementById('profile-msg');
  msg.style.color = 'var(--muted)';
  msg.textContent = t('savingText');

  const selectedLang = document.getElementById('profile-language').value || 'ca';

  const payload = {
    user_id: user.id,
    display_name: document.getElementById('display-name').value.trim() || null,
    birth_date: document.getElementById('birth-date').value || null,
    gender: document.getElementById('gender').value || null,
    height_cm: document.getElementById('height-cm').value ? parseFloat(document.getElementById('height-cm').value) : null,
    weight_kg: document.getElementById('weight-kg').value ? parseFloat(document.getElementById('weight-kg').value) : null,
    gemini_api_key: document.getElementById('gemini-key').value.trim() || null,
    language: selectedLang,
    updated_at: new Date().toISOString()
  };

  const { error } = await sb.from('user_profiles').upsert(payload, { onConflict: 'user_id' });
  if (error) {
    msg.style.color = 'var(--danger)';
    msg.textContent = 'Error: ' + error.message;
  } else {
    currentLang = selectedLang;
    applyTranslations();
    msg.style.color = 'var(--accent)';
    msg.textContent = t('profileSaved');
  }
});

function resetForm() {
  editingId = null;
  aiGeneratedFlag = false;
  document.getElementById('description').value = '';
  document.getElementById('notes').value = '';
  document.getElementById('calories').value = '';
  document.getElementById('nutrition').value = '';
  document.getElementById('photo-status').textContent = '';
  setMealFieldsToNow();
  document.getElementById('save-btn').textContent = t('saveMealBtn');
  document.getElementById('cancel-edit-btn').classList.add('hidden');
  document.getElementById('form-card-title').textContent = t('mealFormTitle');
}

function setFormOpen(which) {
  const mealCard = document.getElementById('meal-form-card');
  const weightCard = document.getElementById('weight-form-card');
  const mealBtn = document.getElementById('toggle-meal-form-btn');
  const weightBtn = document.getElementById('toggle-weight-form-btn');

  mealCard.classList.toggle('hidden', which !== 'meal');
  weightCard.classList.toggle('hidden', which !== 'weight');
  mealBtn.classList.toggle('open', which === 'meal');
  weightBtn.classList.toggle('open', which === 'weight');
  refreshToggleButtonLabels();
}

function refreshToggleButtonLabels() {
  const mealOpen = document.getElementById('toggle-meal-form-btn').classList.contains('open');
  const weightOpen = document.getElementById('toggle-weight-form-btn').classList.contains('open');
  document.getElementById('toggle-meal-form-btn').textContent = (mealOpen ? '▾ ' : '▸ ') + t('quickAddMeal');
  document.getElementById('toggle-weight-form-btn').textContent = (weightOpen ? '▾ ' : '▸ ') + t('quickAddWeight');
}

document.getElementById('toggle-meal-form-btn').addEventListener('click', () => {
  const isOpen = document.getElementById('toggle-meal-form-btn').classList.contains('open');
  setFormOpen(isOpen ? 'none' : 'meal');
});
document.getElementById('toggle-weight-form-btn').addEventListener('click', () => {
  const isOpen = document.getElementById('toggle-weight-form-btn').classList.contains('open');
  setFormOpen(isOpen ? 'none' : 'weight');
});

setFormOpen('none');

document.getElementById('cancel-edit-btn').addEventListener('click', resetForm);

document.getElementById('save-btn').addEventListener('click', async () => {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return;
  const mealType = document.getElementById('meal-type').value;
  const mealDateInput = document.getElementById('meal-date').value;
  const mealTimeInput = document.getElementById('meal-time').value;
  const description = document.getElementById('description').value.trim();
  const notes = document.getElementById('notes').value.trim();
  const caloriesInput = document.getElementById('calories').value;
  const nutritionInput = document.getElementById('nutrition').value;
  const mealTime = (mealDateInput && mealTimeInput)
    ? new Date(`${mealDateInput}T${mealTimeInput}`).toISOString()
    : new Date().toISOString();

  const payload = {
    meal_time: mealTime,
    meal_type: mealType,
    description: description || null,
    notes: notes || null,
    calories_approx: caloriesInput ? parseInt(caloriesInput, 10) : null,
    nutrition_score: nutritionInput ? parseInt(nutritionInput, 10) : null,
    ai_generated: aiGeneratedFlag
  };

  let error;
  if (editingId) {
    ({ error } = await sb.from('meal_logs').update(payload).eq('id', editingId));
  } else {
    ({ error } = await sb.from('meal_logs').insert({ user_id: user.id, ...payload }));
  }

  if (error) {
    alert('Error desant: ' + error.message);
    return;
  }
  resetForm();
  loadTimeline();
  loadStats();
  loadFasting();
});

const MEAL_ICONS = { esmorzar: '🌅', mig_mati: '☕', dinar: '🍽️', berenar: '🍎', sopar: '🌙', altre: '🍴' };

async function loadTimeline() {
  const list = document.getElementById('entries-list');
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return;

  const [mealsRes, weightsRes] = await Promise.all([
    sb.from('meal_logs').select('*').eq('user_id', user.id).order('meal_time', { ascending: false }).limit(100),
    sb.from('weight_logs').select('*').eq('user_id', user.id).order('measured_at', { ascending: false }).limit(100)
  ]);

  if (mealsRes.error || weightsRes.error) {
    const err = mealsRes.error || weightsRes.error;
    list.innerHTML = `<div class="empty">Error: ${err.message}</div>`;
    return;
  }

  const mealItems = (mealsRes.data || []).map(r => ({ ...r, _kind: 'meal', _time: r.meal_time }));
  const weightItems = (weightsRes.data || []).map(r => ({ ...r, _kind: 'weight', _time: r.measured_at }));

  allTimelineItems = [...mealItems, ...weightItems].sort((a, b) => new Date(b._time) - new Date(a._time));
  timelineDisplayCount = TIMELINE_PAGE_SIZE;
  renderTimeline();
}

function renderTimeline() {
  const list = document.getElementById('entries-list');
  const moreWrap = document.getElementById('timeline-more-wrap');

  if (!allTimelineItems.length) {
    list.innerHTML = `<div class="empty">${t('emptyHistory')}</div>`;
    moreWrap.classList.add('hidden');
    return;
  }

  const visible = allTimelineItems.slice(0, timelineDisplayCount);
  list.innerHTML = visible.map(renderTimelineItem).join('');
  moreWrap.classList.toggle('hidden', timelineDisplayCount >= allTimelineItems.length);
}

const MEAL_TYPE_KEYS = {
  esmorzar: 'mealTypeEsmorzar', mig_mati: 'mealTypeMigMati', dinar: 'mealTypeDinar',
  berenar: 'mealTypeBerenar', sopar: 'mealTypeSopar', altre: 'mealTypeAltre'
};

function renderTimelineItem(row) {
  const d = new Date(row._time);
  const dateStr = d.toLocaleDateString(currentLocale(), { day: '2-digit', month: '2-digit' });
  const timeStr = d.toLocaleTimeString(currentLocale(), { hour: '2-digit', minute: '2-digit' });

  if (row._kind === 'weight') {
    const extra = [];
    if (row.body_fat_pct != null) extra.push(`${t('extraFat')} ${row.body_fat_pct}%`);
    if (row.muscle_mass_kg != null) extra.push(`${t('extraMuscle')} ${row.muscle_mass_kg}kg`);
    if (row.water_pct != null) extra.push(`${t('extraWater')} ${row.water_pct}%`);
    if (row.visceral_fat != null) extra.push(`${t('extraVisceral')} ${row.visceral_fat}`);
    if (row.bone_mass_kg != null) extra.push(`${t('extraBone')} ${row.bone_mass_kg}kg`);
    if (row.protein_pct != null) extra.push(`${t('extraProtein')} ${row.protein_pct}%`);
    if (row.bmi != null) extra.push(`${t('extraBmi')} ${row.bmi}`);
    if (row.basal_metabolism_kcal != null) extra.push(`${t('extraBasal')} ${row.basal_metabolism_kcal} ${t('kcalUnit')}`);
    const extraLine = extra.length ? `<div class="weight-extra">${extra.join(' · ')}</div>` : '';
    return `
      <div class="entry">
        <div class="entry-icon type-weight">⚖️</div>
        <div class="entry-body">
          <div class="entry-header">
            <span class="entry-date">${dateStr} · ${timeStr}</span>
            <span class="pill pill-weight">${t('weightPill')}</span>
          </div>
          <div class="weight-main">${row.weight_kg} kg</div>
          ${extraLine}
        </div>
        <div class="entry-actions">
          <button class="del-btn" onclick="editWeight('${row.id}')">${t('editBtn')}</button>
          <button class="del-btn" onclick="deleteWeight('${row.id}')">${t('deleteBtn')}</button>
        </div>
      </div>`;
  }

  const nutriParts = [];
  if (row.calories_approx != null) nutriParts.push(`${row.calories_approx} ${t('kcalUnit')}`);
  if (row.nutrition_score != null) nutriParts.push(`${t('nutritionUnit')} ${row.nutrition_score}/10`);
  const nutriLine = nutriParts.length ? `<div class="nutri-info">${nutriParts.join(' · ')}</div>` : '';
  const aiTag = row.ai_generated ? ' 🤖' : '';
  const icon = MEAL_ICONS[row.meal_type] || '🍴';
  const typeLabel = t(MEAL_TYPE_KEYS[row.meal_type] || 'mealTypeAltre');

  return `
    <div class="entry">
      <div class="entry-icon mt-${row.meal_type}">${icon}</div>
      <div class="entry-body">
        <div class="entry-header">
          <span class="entry-date">${dateStr} · ${timeStr}${aiTag}</span>
          <span class="pill mt-${row.meal_type}">${typeLabel}</span>
        </div>
        <div class="desc">${row.description ? escapeHtml(row.description) : '<em>(sense descripció)</em>'}</div>
        ${nutriLine}
      </div>
      <div class="entry-actions">
        <button class="del-btn" onclick="editEntry('${row.id}')">${t('editBtn')}</button>
        <button class="del-btn" onclick="deleteEntry('${row.id}')">${t('deleteBtn')}</button>
      </div>
    </div>`;
}

document.getElementById('timeline-more-btn').addEventListener('click', () => {
  timelineDisplayCount += TIMELINE_PAGE_SIZE;
  renderTimeline();
});

async function deleteEntry(id) {
  if (!confirm(t('confirmDeleteMeal'))) return;
  const { error } = await sb.from('meal_logs').delete().eq('id', id);
  if (error) { alert('Error: ' + error.message); return; }
  loadTimeline();
  loadStats();
  loadFasting();
}
window.deleteEntry = deleteEntry;

function isoToDateTimeFields(iso) {
  const d = new Date(iso);
  const pad = n => String(n).padStart(2, '0');
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`
  };
}

async function editEntry(id) {
  const { data: row, error } = await sb.from('meal_logs').select('*').eq('id', id).single();
  if (error) { alert('Error: ' + error.message); return; }
  document.getElementById('meal-type').value = row.meal_type;
  const dt = isoToDateTimeFields(row.meal_time);
  document.getElementById('meal-date').value = dt.date;
  document.getElementById('meal-time').value = dt.time;
  document.getElementById('description').value = row.description || '';
  document.getElementById('notes').value = row.notes || '';
  document.getElementById('calories').value = row.calories_approx ?? '';
  document.getElementById('nutrition').value = row.nutrition_score ?? '';
  aiGeneratedFlag = !!row.ai_generated;
  editingId = id;
  setFormOpen('meal');
  document.getElementById('save-btn').textContent = t('updateMealBtn');
  document.getElementById('cancel-edit-btn').classList.remove('hidden');
  document.getElementById('form-card-title').textContent = t('mealFormTitleEdit');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
window.editEntry = editEntry;

document.getElementById('toggle-weight-extra-btn').addEventListener('click', () => {
  document.getElementById('weight-extra-fields').classList.toggle('hidden');
});

function resetWeightForm() {
  editingWeightId = null;
  document.getElementById('weight-value').value = '';
  ['weight-fat','weight-water','weight-muscle','weight-bone','weight-visceral','weight-bmi','weight-protein','weight-basal']
    .forEach(id => { document.getElementById(id).value = ''; });
  setWeightFieldsToNow();
  document.getElementById('save-weight-btn').textContent = t('saveWeightBtn');
  document.getElementById('cancel-weight-edit-btn').classList.add('hidden');
  document.getElementById('weight-form-title').textContent = t('weightFormTitle');
}

document.getElementById('cancel-weight-edit-btn').addEventListener('click', resetWeightForm);

document.getElementById('save-weight-btn').addEventListener('click', async () => {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return;

  const weightVal = document.getElementById('weight-value').value;
  if (!weightVal) { alert(t('weightRequired')); return; }

  const dateInput = document.getElementById('weight-date').value;
  const timeInput = document.getElementById('weight-time').value;
  const measuredAt = (dateInput && timeInput)
    ? new Date(`${dateInput}T${timeInput}`).toISOString()
    : new Date().toISOString();

  const numOrNull = id => {
    const v = document.getElementById(id).value;
    return v ? parseFloat(v) : null;
  };

  const payload = {
    measured_at: measuredAt,
    weight_kg: parseFloat(weightVal),
    body_fat_pct: numOrNull('weight-fat'),
    water_pct: numOrNull('weight-water'),
    muscle_mass_kg: numOrNull('weight-muscle'),
    bone_mass_kg: numOrNull('weight-bone'),
    visceral_fat: numOrNull('weight-visceral'),
    bmi: numOrNull('weight-bmi'),
    protein_pct: numOrNull('weight-protein'),
    basal_metabolism_kcal: document.getElementById('weight-basal').value ? parseInt(document.getElementById('weight-basal').value, 10) : null
  };

  let error;
  if (editingWeightId) {
    ({ error } = await sb.from('weight_logs').update(payload).eq('id', editingWeightId));
  } else {
    ({ error } = await sb.from('weight_logs').insert({ user_id: user.id, ...payload }));
  }

  if (error) { alert('Error desant: ' + error.message); return; }

  resetWeightForm();
  loadTimeline();
  loadWeightChart();
});

async function editWeight(id) {
  const { data: row, error } = await sb.from('weight_logs').select('*').eq('id', id).single();
  if (error) { alert('Error: ' + error.message); return; }
  const dt = isoToDateTimeFields(row.measured_at);
  document.getElementById('weight-date').value = dt.date;
  document.getElementById('weight-time').value = dt.time;
  document.getElementById('weight-value').value = row.weight_kg;
  document.getElementById('weight-fat').value = row.body_fat_pct ?? '';
  document.getElementById('weight-water').value = row.water_pct ?? '';
  document.getElementById('weight-muscle').value = row.muscle_mass_kg ?? '';
  document.getElementById('weight-bone').value = row.bone_mass_kg ?? '';
  document.getElementById('weight-visceral').value = row.visceral_fat ?? '';
  document.getElementById('weight-bmi').value = row.bmi ?? '';
  document.getElementById('weight-protein').value = row.protein_pct ?? '';
  document.getElementById('weight-basal').value = row.basal_metabolism_kcal ?? '';
  document.getElementById('weight-extra-fields').classList.remove('hidden');
  editingWeightId = id;
  setFormOpen('weight');
  document.getElementById('save-weight-btn').textContent = t('updateWeightBtn');
  document.getElementById('cancel-weight-edit-btn').classList.remove('hidden');
  document.getElementById('weight-form-title').textContent = t('weightFormTitleEdit');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
window.editWeight = editWeight;

async function deleteWeight(id) {
  if (!confirm(t('confirmDeleteWeight'))) return;
  const { error } = await sb.from('weight_logs').delete().eq('id', id);
  if (error) { alert('Error: ' + error.message); return; }
  loadTimeline();
  loadWeightChart();
}
window.deleteWeight = deleteWeight;

async function loadWeightChart() {
  const container = document.getElementById('weight-chart');
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return;

  const { data, error } = await sb
    .from('weight_logs')
    .select('measured_at, weight_kg')
    .eq('user_id', user.id)
    .order('measured_at', { ascending: true })
    .limit(200);

  if (error) { container.innerHTML = `<div class="empty">Error: ${error.message}</div>`; return; }
  if (!data || data.length < 2) {
    container.innerHTML = `<div class="empty">${t('weightChartEmpty')}</div>`;
    return;
  }
  container.innerHTML = renderWeightChart(data);
}

function renderWeightChart(rows) {
  const w = 320, h = 140;
  const padLeft = 34, padRight = 10, padTop = 16, padBottom = 20;
  const chartW = w - padLeft - padRight;
  const chartH = h - padTop - padBottom;

  const weights = rows.map(r => Number(r.weight_kg));
  const minW = Math.min(...weights);
  const maxW = Math.max(...weights);
  const range = (maxW - minW) || 1;
  const padRange = range * 0.15 || 1;
  const yMin = minW - padRange;
  const yMax = maxW + padRange;

  const n = rows.length;
  const xStep = n > 1 ? chartW / (n - 1) : 0;

  const points = rows.map((r, i) => {
    const x = padLeft + i * xStep;
    const y = padTop + chartH - ((Number(r.weight_kg) - yMin) / (yMax - yMin)) * chartH;
    return { x, y };
  });

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const circles = points.map((p, i) => {
    if (n > 10 && i !== 0 && i !== n - 1) return '';
    return `<circle class="weight-point" cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="2.5"></circle>`;
  }).join('');

  const firstLabel = new Date(rows[0].measured_at).toLocaleDateString(currentLocale(), { day: '2-digit', month: '2-digit' });
  const lastLabel = new Date(rows[n-1].measured_at).toLocaleDateString(currentLocale(), { day: '2-digit', month: '2-digit' });

  return `
    <svg class="weight-chart-svg" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
      <text class="axis-label" x="${padLeft}" y="${padTop + 4}" text-anchor="start">${maxW.toFixed(1)}</text>
      <text class="axis-label" x="${padLeft}" y="${padTop + chartH}" text-anchor="start">${minW.toFixed(1)}</text>
      <path class="weight-line" d="${pathD}"></path>
      ${circles}
      <text class="axis-label" x="${padLeft}" y="${h - 4}" text-anchor="start">${firstLabel}</text>
      <text class="axis-label" x="${w - padRight}" y="${h - 4}" text-anchor="end">${lastLabel}</text>
    </svg>`;
}

async function loadStats() {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return;
  const since = new Date();
  since.setDate(since.getDate() - 6);
  const sinceStr = since.toISOString().slice(0, 10);

  const { data, error } = await sb
    .from('meal_stats_daily')
    .select('*')
    .eq('user_id', user.id)
    .gte('day', sinceStr);

  const grid = document.getElementById('stats-grid');
  if (error || !data) { return; }
  const totalApats = data.reduce((s, r) => s + (r.total_apats || 0), 0);
  const diesActius = data.length;

  const { data: fastData } = await sb
    .from('fasting_windows')
    .select('fasting_hours')
    .eq('user_id', user.id)
    .gte('sopar_day', sinceStr);

  let mitjana = '–';
  if (fastData && fastData.length) {
    const avg = fastData.reduce((s, r) => s + Number(r.fasting_hours), 0) / fastData.length;
    mitjana = avg.toFixed(1) + 'h';
  }

  grid.innerHTML = `
    <div class="stat"><div class="n">${totalApats}</div><div class="l">àpats</div></div>
    <div class="stat"><div class="n">${diesActius}</div><div class="l">dies actius</div></div>
    <div class="stat"><div class="n">${mitjana}</div><div class="l">dejuni mitjà</div></div>`;
}

async function loadFasting() {
  const container = document.getElementById('fasting-chart');
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return;

  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  const sinceStr = days[0];

  const { data, error } = await sb
    .from('fasting_windows')
    .select('sopar_day, fasting_hours')
    .eq('user_id', user.id)
    .gte('sopar_day', sinceStr)
    .order('sopar_day', { ascending: true });

  if (error) { container.innerHTML = `<div class="empty">Error: ${error.message}</div>`; return; }

  // Si un dia té més d'un registre de dejuni, ens quedem amb la mitjana
  const byDay = {};
  (data || []).forEach(r => {
    const key = r.sopar_day;
    if (!byDay[key]) byDay[key] = [];
    byDay[key].push(Number(r.fasting_hours));
  });

  const values = days.map(day => {
    const arr = byDay[day];
    if (!arr || !arr.length) return null;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  });

  if (values.every(v => v === null)) {
    container.innerHTML = `<div class="empty">${t('fastingEmpty')}</div>`;
    return;
  }

  container.innerHTML = renderFastingChart(days, values);
}

function renderFastingChart(days, values) {
  const w = 320, h = 130;
  const padLeft = 4, padRight = 4, padTop = 18, padBottom = 18;
  const chartW = w - padLeft - padRight;
  const chartH = h - padTop - padBottom;
  const n = days.length;
  const gap = 8;
  const barW = (chartW - gap * (n - 1)) / n;
  const maxVal = Math.max(16, ...values.filter(v => v !== null));
  const goalHours = 12;

  const goalY = padTop + chartH - (goalHours / maxVal) * chartH;

  let bars = '';
  days.forEach((day, i) => {
    const v = values[i];
    const x = padLeft + i * (barW + gap);
    const label = new Date(day + 'T12:00:00').toLocaleDateString(currentLocale(), { weekday: 'short' }).replace('.', '');
    if (v === null) {
      const barH = 4;
      const y = padTop + chartH - barH;
      bars += `<rect class="bar empty-bar" x="${x}" y="${y}" width="${barW}" height="${barH}" rx="3"></rect>`;
    } else {
      const barH = Math.max(3, (v / maxVal) * chartH);
      const y = padTop + chartH - barH;
      bars += `<rect class="bar" x="${x}" y="${y}" width="${barW}" height="${barH}" rx="3"></rect>`;
      bars += `<text class="value-label" x="${x + barW / 2}" y="${y - 4}" text-anchor="middle">${v.toFixed(1)}</text>`;
    }
    bars += `<text class="axis-label" x="${x + barW / 2}" y="${h - 2}" text-anchor="middle">${label}</text>`;
  });

  return `
    <svg class="fasting-chart-svg" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
      <line class="goal-line" x1="${padLeft}" y1="${goalY}" x2="${w - padRight}" y2="${goalY}"></line>
      <text class="goal-label" x="${w - padRight}" y="${goalY - 3}" text-anchor="end">${t('fastingGoal')}</text>
      ${bars}
    </svg>`;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

async function showApp(user) {
  loginView.classList.add('hidden');
  appView.classList.remove('hidden');
  document.getElementById('user-email').textContent = user.email;

  const { data: profileLang } = await sb.from('user_profiles').select('language').eq('user_id', user.id).maybeSingle();
  currentLang = profileLang?.language || 'ca';
  applyTranslations();

  setMealFieldsToNow();
  setWeightFieldsToNow();
  loadTimeline();
  loadStats();
  loadFasting();
  loadWeightChart();
}

function showLogin() {
  appView.classList.add('hidden');
  loginView.classList.remove('hidden');
}

sb.auth.onAuthStateChange((_event, session) => {
  if (session && session.user) {
    showApp(session.user);
  } else {
    showLogin();
  }
});

sb.auth.getSession().then(({ data: { session } }) => {
  if (session && session.user) showApp(session.user);
  else showLogin();
});
