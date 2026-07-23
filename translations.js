let currentLang = 'ca';

const I18N = {
  ca: {
    appTitle: 'Àpatrack',
    appTagline: 'Registra els teus àpats i sabrem què millorar.',
    emailLabel: 'Correu electrònic',
    sendLinkBtn: "Envia'm l'enllaç d'accés",
    settingsBtn: '⚙️ Perfil',
    logoutBtn: 'Tanca sessió',
    quickAddMeal: '+ Registrar àpat',
    quickAddWeight: '+ Registrar pes',
    closeForm: '✕ Tanca formulari',
    profileTitle: 'El teu perfil',
    nameLabel: 'Nom',
    birthDateLabel: 'Data de naixement',
    genderLabel: 'Gènere',
    genderUnset: '— sense especificar —',
    genderMale: 'Home',
    genderFemale: 'Dona',
    genderOther: 'Altre',
    genderPreferNot: 'Prefereixo no dir-ho',
    heightLabel: 'Alçada (cm)',
    weightLabel: 'Pes (kg)',
    fastingGoalLabel: 'Objectiu de dejuni (hores)',
    languageLabel: 'Idioma',
    geminiKeyLabel: "Clau d'API de Google Gemini (opcional, per a l'anàlisi de fotos)",
    geminiKeyHelp: 'Obtén-la gratis a',
    geminiKeyHelpEnd: '. Es guarda només per a tu.',
    saveProfileBtn: 'Desa el perfil',
    mealFormTitle: 'Registra un àpat',
    mealFormTitleEdit: "Edita l'àpat",
    photoCameraBtn: '📷 Fer una foto',
    photoGalleryBtn: '🖼️ Puja una imatge',
    mealTypeLabel: 'Tipus',
    mealTypeEsmorzar: 'Esmorzar',
    mealTypeMigMati: 'Mig matí',
    mealTypeDinar: 'Dinar',
    mealTypeBerenar: 'Berenar',
    mealTypeSopar: 'Sopar',
    mealTypeAltre: 'Altre',
    dateLabel: 'Data',
    timeLabel: 'Hora',
    descriptionLabel: 'Què has menjat',
    notesLabel: 'Notes (opcional)',
    caloriesLabel: 'Calories aprox. (opcional)',
    nutritionLabel: 'Puntuació nutricional 1-10 (opcional)',
    saveMealBtn: 'Desa el registre',
    updateMealBtn: 'Actualitza registre',
    cancelEditBtn: "Cancel·la edició",
    weightFormTitle: 'Registra un pes',
    weightFormTitleEdit: 'Edita la lectura de pes',
    weightValueLabel: 'Pes (kg)',
    moreMetricsBtn: '+ Més mètriques (opcional)',
    fatLabel: 'Greix corporal (%)',
    waterLabel: 'Aigua (%)',
    muscleLabel: 'Múscul (kg)',
    boneLabel: 'Massa òssia (kg)',
    visceralLabel: 'Greix visceral',
    bmiLabel: 'BMI',
    proteinLabel: 'Proteïna (%)',
    basalLabel: 'Metabolisme basal (kcal)',
    saveWeightBtn: 'Desa la lectura',
    updateWeightBtn: 'Actualitza lectura',
    statsTitle: 'Últims 7 dies',
    statMeals: 'àpats',
    statActiveDays: 'dies actius',
    statAvgFasting: 'dejuni mitjà',
    fastingTitle: 'Dejuni: sopar → esmorzar',
    fastingGoalChartPrefix: 'objectiu',
    fastingEmpty: 'Encara no hi ha prou dades (calen un sopar i un esmorzar registrats seguits).',
    weightChartTitle: 'Evolució del pes',
    weightChartEmpty: "Calen almenys dues lectures de pes per veure l'evolució.",
    historyTitle: 'Historial',
    showMoreBtn: 'Veure més',
    loading: 'Carregant...',
    emptyHistory: 'Encara no hi ha registres.',
    editBtn: 'Edita',
    deleteBtn: 'Esborra',
    weightPill: 'pes',
    kcalUnit: 'kcal',
    nutritionUnit: 'nutrició',
    extraFat: 'greix',
    extraMuscle: 'múscul',
    extraWater: 'aigua',
    extraVisceral: 'greix visceral',
    extraBone: 'ossi',
    extraProtein: 'proteïna',
    extraBmi: 'BMI',
    extraBasal: 'met. basal',
    confirmDeleteMeal: 'Esborrar aquest registre?',
    confirmDeleteWeight: 'Esborrar aquesta lectura de pes?',
    weightRequired: 'El pes és obligatori.',
    savingText: 'Desant...',
    profileSaved: 'Perfil desat correctament.',
    sendingLink: 'Enviant...',
    checkEmailLink: "Revisa el teu correu i clica l'enllaç per entrar.",
    invalidEmail: 'Escriu un correu vàlid.',
    analyzingPhoto: 'Analitzant la foto amb IA...',
    photoFilled: "Camps omplerts amb IA. Revisa'ls abans de desar.",
  }
};

const LOCALE_MAP = { ca: 'ca-ES' };
function currentLocale() { return LOCALE_MAP[currentLang] || 'ca-ES'; }

function t(key) {
  return (I18N[currentLang] && I18N[currentLang][key]) || I18N.ca[key] || key;
}

function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.getAttribute('data-i18n'));
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = t(el.getAttribute('data-i18n-placeholder'));
  });
  if (typeof refreshToggleButtonLabels === 'function') refreshToggleButtonLabels();
}

applyTranslations();
