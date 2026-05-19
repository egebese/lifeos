// Lightweight i18n dictionary. Add a new key here in both locales — the type
// system enforces parity. For strings that genuinely don't translate (acronyms
// like "BMI", "TDEE", "HRV") use the same value on both sides; that keeps the
// callsite consistent and makes future overrides trivial.

export type Locale = "en" | "tr";

export const LOCALES: readonly Locale[] = ["en", "tr"] as const;

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  tr: "Türkçe",
};

const en = {
  // ---- Navigation (sidebar / top nav — title case)
  "nav.dashboard": "Dashboard",
  "nav.workouts": "Workouts",
  "nav.programs": "Programs",
  "nav.food": "Food",
  "nav.foodLog": "Food Log",
  "nav.mealPlan": "Meal Plan",
  "nav.pantry": "Pantry",
  "nav.preferences": "Preferences",
  "nav.whoop": "Whoop",
  "nav.analysis": "Analysis",
  "nav.profile": "Profile",
  "nav.signOut": "Sign out",
  // ---- Sidebar section headers
  "nav.sectionOverview": "OVERVIEW",
  "nav.sectionTrain": "TRAIN",
  "nav.sectionEat": "EAT",
  "nav.sectionData": "DATA",
  // ---- Bottom nav (short, uppercase)
  "nav.dashShort": "DASH",
  "nav.trainShort": "TRAIN",
  "nav.foodShort": "FOOD",
  "nav.whoopShort": "WHOOP",
  "nav.meShort": "ME",

  // ---- Common buttons
  "common.save": "SAVE",
  "common.cancel": "CANCEL",
  "common.delete": "DELETE",
  "common.edit": "EDIT",
  "common.add": "ADD",
  "common.generate": "GENERATE",
  "common.start": "START",
  "common.stop": "STOP",
  "common.next": "NEXT",
  "common.prev": "PREVIOUS",
  "common.today": "TODAY",
  "common.open": "OPEN",
  "common.reset": "RESET",
  "common.use": "USE",
  "common.log": "LOG",
  "common.connect": "CONNECT",
  "common.loading": "LOADING…",
  "common.saving": "SAVING…",
  "common.busy": "…",

  // ---- Meal slots
  "meal.breakfast": "BREAKFAST",
  "meal.lunch": "LUNCH",
  "meal.dinner": "DINNER",
  "meal.snack": "SNACK",
  "meal.snacks": "SNACKS",
  "meal.breakfastLower": "breakfast",
  "meal.lunchLower": "lunch",
  "meal.dinnerLower": "dinner",
  "meal.snackLower": "snack",

  // ---- Goals
  "goal.cut": "CUT",
  "goal.maintain": "MAINTAIN",
  "goal.bulk": "BULK",

  // ---- Dashboard
  "dash.bmi": "BMI",
  "dash.tdeeWhoop": "TDEE · WHOOP",
  "dash.tdeeEst": "TDEE · EST",
  "dash.target": "TARGET",
  "dash.weight": "WEIGHT",
  "dash.goal": "GOAL",
  "dash.kcalToday": "KCAL TODAY",
  "dash.kcalOn": "KCAL ·",
  "dash.strain": "STRAIN",
  "dash.sleep": "SLEEP",
  "dash.sleepPerformance": "PERFORMANCE",
  "dash.recoveryToday": "RECOVERY · TODAY",
  "dash.recoveryOn": "RECOVERY ·",
  "dash.hrv": "HRV",
  "dash.rhr": "RHR",
  "dash.lastWorkout": "LAST WORKOUT",
  "dash.noWorkoutYet": "no workouts yet —",
  "dash.startOne": "start one",
  "dash.completed": "COMPLETED",
  "dash.inProgress": "IN PROGRESS",
  "dash.viewing": "· VIEWING",
  "dash.startWorkout": "START WORKOUT",
  "dash.logMeal": "LOG MEAL",
  "dash.generatePlan": "GENERATE PLAN",
  "dash.connectWhoop":
    "CONNECT WHOOP TO UNLOCK RECOVERY · STRAIN · SLEEP · MEASURED TDEE →",

  // ---- Weight projection
  "proj.title": "WEIGHT PROJECTION",
  "proj.kcalPerDay": "KCAL/DAY",
  "proj.now": "NOW",
  "proj.inWeeks": "IN {weeks}W",
  "proj.deficit": "DEFICIT",
  "proj.deficitUnit": "kcal/day",
  "proj.targetReached": "{kg} kg target reached at week {week}",
  "proj.targetNotReached": "target {kg} kg not reached within {weeks} weeks",
  "proj.needProfile":
    "Set profile (sex, height, age, weight) + a daily kcal target to see the projection.",

  // ---- Food entry
  "food.logEntry": "LOG ENTRY",
  "food.newMeal": "new meal",
  "food.aiAutolog": "AI · AUTOLOG",
  "food.defaultMeal": "DEFAULT MEAL",
  "food.describe": "DESCRIBE",
  "food.recordVoice": "RECORD VOICE",
  "food.transcribing": "TRANSCRIBING…",
  "food.parseWithAi": "PARSE WITH AI →",
  "food.parsing": "PARSING…",
  "food.singleItem": "SINGLE ITEM",
  "food.name": "NAME",
  "food.meal": "MEAL",
  "food.kcal": "KCAL",
  "food.proteinG": "PROTEIN (G)",
  "food.carbsG": "CARBS (G)",
  "food.fatG": "FAT (G)",
  "food.orPhotoManual": "OR · PHOTO / MANUAL",
  "food.fromHistorySkipAi": "FROM YOUR HISTORY · SKIP AI",
  "food.fromHistory": "FROM HISTORY",
  "food.matchKcalUse": "MATCH · {kcal} KCAL · USE →",

  // ---- Plan
  "plan.title": "diet plan",
  "plan.aiMealPlanner": "AI · MEAL PLANNER",
  "plan.generate": "GENERATE",
  "plan.days": "DAYS",
  "plan.daysCountOne": "{n} DAY",
  "plan.daysCountMany": "{n} DAYS",
  "plan.week": "WEEK",
  "plan.handMeasureTitle": "EL ÖLÇÜSÜ · PORTION GUIDE",
  "plan.shoppingList": "SHOPPING LIST",
  "plan.bought": "{done} / {total} bought · {pct}%",
  "plan.hideDone": "HIDE DONE",
  "plan.showAll": "SHOW ALL",
  "plan.allBought": "ALL BOUGHT",
  "plan.aisle.produce": "PRODUCE",
  "plan.aisle.meat": "MEAT",
  "plan.aisle.dairy": "DAIRY",
  "plan.aisle.pantry": "PANTRY",
  "plan.aisle.frozen": "FROZEN",
  "plan.aisle.other": "OTHER",

  // ---- Profile
  "profile.title": "profile",
  "profile.language": "LANGUAGE",
  "profile.languageHint": "Affects UI labels. AI responses always come back in English.",

  // ---- Greetings
  "greet.morning": "good morning",
  "greet.afternoon": "good afternoon",
  "greet.evening": "good evening",
  "greet.night": "good night",
} satisfies Record<string, string>;

export type DictKey = keyof typeof en;

const tr: Record<DictKey, string> = {
  // ---- Navigation (sidebar / top nav — title case)
  "nav.dashboard": "Anasayfa",
  "nav.workouts": "Antrenman",
  "nav.programs": "Programlar",
  "nav.food": "Beslenme",
  "nav.foodLog": "Beslenme Günlüğü",
  "nav.mealPlan": "Diyet Planı",
  "nav.pantry": "Kiler",
  "nav.preferences": "Tercihler",
  "nav.whoop": "Whoop",
  "nav.analysis": "Analiz",
  "nav.profile": "Profil",
  "nav.signOut": "Çıkış",
  // ---- Sidebar section headers
  "nav.sectionOverview": "GENEL",
  "nav.sectionTrain": "ANTRENMAN",
  "nav.sectionEat": "BESLENME",
  "nav.sectionData": "VERİ",
  // ---- Bottom nav
  "nav.dashShort": "ANA",
  "nav.trainShort": "TREN",
  "nav.foodShort": "BESL",
  "nav.whoopShort": "WHOOP",
  "nav.meShort": "BEN",

  // ---- Common buttons
  "common.save": "KAYDET",
  "common.cancel": "İPTAL",
  "common.delete": "SİL",
  "common.edit": "DÜZENLE",
  "common.add": "EKLE",
  "common.generate": "OLUŞTUR",
  "common.start": "BAŞLAT",
  "common.stop": "DURDUR",
  "common.next": "İLERİ",
  "common.prev": "GERİ",
  "common.today": "BUGÜN",
  "common.open": "AÇ",
  "common.reset": "SIFIRLA",
  "common.use": "KULLAN",
  "common.log": "EKLE",
  "common.connect": "BAĞLA",
  "common.loading": "YÜKLENİYOR…",
  "common.saving": "KAYDEDİLİYOR…",
  "common.busy": "…",

  // ---- Meal slots
  "meal.breakfast": "KAHVALTI",
  "meal.lunch": "ÖĞLE",
  "meal.dinner": "AKŞAM",
  "meal.snack": "ARA ÖĞÜN",
  "meal.snacks": "ARA ÖĞÜNLER",
  "meal.breakfastLower": "kahvaltı",
  "meal.lunchLower": "öğle",
  "meal.dinnerLower": "akşam",
  "meal.snackLower": "ara öğün",

  // ---- Goals
  "goal.cut": "KÜTLE KAYBI",
  "goal.maintain": "KORUMA",
  "goal.bulk": "KÜTLE",

  // ---- Dashboard
  "dash.bmi": "BMI",
  "dash.tdeeWhoop": "TDEE · WHOOP",
  "dash.tdeeEst": "TDEE · TAHMİN",
  "dash.target": "HEDEF",
  "dash.weight": "KİLO",
  "dash.goal": "HEDEF",
  "dash.kcalToday": "BUGÜN KCAL",
  "dash.kcalOn": "KCAL ·",
  "dash.strain": "EFOR",
  "dash.sleep": "UYKU",
  "dash.sleepPerformance": "PERFORMANS",
  "dash.recoveryToday": "TOPARLANMA · BUGÜN",
  "dash.recoveryOn": "TOPARLANMA ·",
  "dash.hrv": "HRV",
  "dash.rhr": "DİNL. NABIZ",
  "dash.lastWorkout": "SON ANTRENMAN",
  "dash.noWorkoutYet": "henüz antrenman yok —",
  "dash.startOne": "yeni başlat",
  "dash.completed": "TAMAMLANDI",
  "dash.inProgress": "DEVAM EDİYOR",
  "dash.viewing": "· GÖRÜNTÜLEME",
  "dash.startWorkout": "ANTRENMANA BAŞLA",
  "dash.logMeal": "ÖĞÜN EKLE",
  "dash.generatePlan": "PLAN OLUŞTUR",
  "dash.connectWhoop":
    "WHOOP BAĞLA · TOPARLANMA · EFOR · UYKU · ÖLÇÜLEN TDEE →",

  // ---- Weight projection
  "proj.title": "KİLO PROJEKSİYONU",
  "proj.kcalPerDay": "KCAL/GÜN",
  "proj.now": "ŞİMDİ",
  "proj.inWeeks": "{weeks}H SONRA",
  "proj.deficit": "AÇIK",
  "proj.deficitUnit": "kcal/gün",
  "proj.targetReached": "{kg} kg hedefine {week}. haftada ulaşılır",
  "proj.targetNotReached": "{weeks} hafta içinde {kg} kg hedefine ulaşılmıyor",
  "proj.needProfile":
    "Projeksiyon için profilini doldur (cinsiyet, boy, yaş, kilo) + günlük kcal hedefi.",

  // ---- Food entry
  "food.logEntry": "GİRİŞ",
  "food.newMeal": "yeni öğün",
  "food.aiAutolog": "AI · OTO-GİRİŞ",
  "food.defaultMeal": "VARSAYILAN ÖĞÜN",
  "food.describe": "ANLAT",
  "food.recordVoice": "SESLE GİR",
  "food.transcribing": "ÇEVRİLİYOR…",
  "food.parseWithAi": "AI İLE ÇÖZÜMLE →",
  "food.parsing": "ÇÖZÜMLENİYOR…",
  "food.singleItem": "TEK KALEM",
  "food.name": "İSİM",
  "food.meal": "ÖĞÜN",
  "food.kcal": "KCAL",
  "food.proteinG": "PROTEİN (G)",
  "food.carbsG": "KARBONHİDRAT (G)",
  "food.fatG": "YAĞ (G)",
  "food.orPhotoManual": "VEYA · FOTOĞRAF / MANUEL",
  "food.fromHistorySkipAi": "GEÇMİŞTEN · AI'I ATLA",
  "food.fromHistory": "GEÇMİŞTEN",
  "food.matchKcalUse": "EŞLEŞME · {kcal} KCAL · KULLAN →",

  // ---- Plan
  "plan.title": "diyet planı",
  "plan.aiMealPlanner": "AI · DİYET PLANI",
  "plan.generate": "OLUŞTUR",
  "plan.days": "GÜN",
  "plan.daysCountOne": "{n} GÜN",
  "plan.daysCountMany": "{n} GÜN",
  "plan.week": "HAFTA",
  "plan.handMeasureTitle": "EL ÖLÇÜSÜ · PORSİYON REHBERİ",
  "plan.shoppingList": "ALIŞVERİŞ LİSTESİ",
  "plan.bought": "{done} / {total} alındı · %{pct}",
  "plan.hideDone": "BİTENLERİ GİZLE",
  "plan.showAll": "HEPSİNİ GÖSTER",
  "plan.allBought": "HEPSİ ALINDI",
  "plan.aisle.produce": "MANAV",
  "plan.aisle.meat": "ET / TAVUK",
  "plan.aisle.dairy": "SÜT ÜRÜNLERİ",
  "plan.aisle.pantry": "KİLER",
  "plan.aisle.frozen": "DONDURULMUŞ",
  "plan.aisle.other": "DİĞER",

  // ---- Profile
  "profile.title": "profil",
  "profile.language": "DİL",
  "profile.languageHint": "Arayüz metinlerini etkiler. AI yanıtları her zaman İngilizce gelir.",

  // ---- Greetings
  "greet.morning": "günaydın",
  "greet.afternoon": "iyi günler",
  "greet.evening": "iyi akşamlar",
  "greet.night": "iyi geceler",
};

const DICTS: Record<Locale, Record<DictKey, string>> = { en, tr };

export function translate(
  locale: Locale,
  key: DictKey,
  vars?: Record<string, string | number>,
): string {
  const raw = DICTS[locale]?.[key] ?? DICTS.en[key] ?? String(key);
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (m, k: string) =>
    Object.prototype.hasOwnProperty.call(vars, k) ? String(vars[k]) : m,
  );
}
