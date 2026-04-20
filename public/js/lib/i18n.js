import { requestRoute } from "./route-events.js";

const LANG_STORAGE_KEY = "tm-lang";
const DEFAULT_LANG = "en";

const SUPPORTED_LANGUAGES = [
  { code: "en", nativeName: "English" },
  { code: "zh-Hans", nativeName: "中文（简体）" },
  { code: "zh-Hant", nativeName: "中文（繁體）" },
  { code: "es", nativeName: "Español" },
  { code: "fr", nativeName: "Français" },
  { code: "de", nativeName: "Deutsch" },
  { code: "ja", nativeName: "日本語" },
  { code: "ko", nativeName: "한국어" },
  { code: "ru", nativeName: "Русский" },
  { code: "pt", nativeName: "Português" },
  { code: "eo", nativeName: "Esperanto" },
];

const MESSAGE_TABLE = {
  en: {
    "common.language": "Language",
    "common.languageBetaBadge": "Beta",
    "common.languageBetaNote": "Translations are currently incomplete.",
    "common.languageSelectHelp": "Applies to app UI and hint prompts only.",
    "shell.guest": "Guest",
    "shell.toggleTheme": "Toggle theme",
    "shell.nav.hunts": "Hunts",
    "shell.nav.saved": "Saved",
    "shell.nav.create": "Create",
    "shell.nav.rank": "Rank",
    "shell.nav.profile": "Profile",
    "shell.offlineReconnect": "Reconnect",
    "shell.offlineText":
      "Unable to connect to the internet. When your connection is back, tap Reconnect to reload this page.",
    "shell.portraitTitle": "Turn to portrait",
    "shell.portraitBody":
      "This experience is built for narrow phone screens in portrait. Use a mobile device or rotate your display to continue.",
    "login.languageSectionTitle": "Language",
    "login.languageSectionHint":
      "Interface and hint prompts only. Proper names stay unchanged.",
    "create.searchPlaceholder": "Place name, or leave blank + Search",
    "create.searchAria": "Search Manhattan address",
    "create.searchButton": "Search",
    "create.useMyLocation": "Use my location",
    "create.hintPlaceholder": "Street or landmark clue",
    "create.huntHintPlaceholder": "Optional clue for the entire hunt",
    "create.basicHintPlaceholder": "Landmark or street clue",
    "home.heroLead":
      "Timed photo hunts on Manhattan streets — open a listing to preview checkpoints, then start the clock. Tap + below to publish your own.",
    "home.openHunts": "Open hunts",
  },
  "zh-Hans": {
    "common.language": "语言",
    "common.languageBetaBadge": "测试版",
    "common.languageBetaNote": "当前翻译尚未完整。",
    "common.languageSelectHelp": "仅用于应用界面和 hint 提示词。",
    "shell.guest": "访客",
    "shell.toggleTheme": "切换主题",
    "shell.nav.hunts": "寻宝",
    "shell.nav.saved": "收藏",
    "shell.nav.create": "创建",
    "shell.nav.rank": "排行",
    "shell.nav.profile": "我的",
    "shell.offlineReconnect": "重新连接",
    "shell.offlineText":
      "当前无法连接互联网。网络恢复后，点击“重新连接”即可刷新页面。",
    "shell.portraitTitle": "请切换为竖屏",
    "shell.portraitBody": "该体验仅适配手机竖屏窄宽界面，请使用手机或旋转设备继续。",
    "login.languageSectionTitle": "语言",
    "login.languageSectionHint": "仅切换界面与 hint 提示词，专有名词保持不变。",
    "create.searchPlaceholder": "输入地点名，或留空后点击“搜索”",
    "create.searchAria": "搜索曼哈顿地址",
    "create.searchButton": "搜索",
    "create.useMyLocation": "使用我的位置",
    "create.hintPlaceholder": "街道或地标提示",
    "create.huntHintPlaceholder": "整个寻宝的可选提示",
    "create.basicHintPlaceholder": "地标或街道提示",
    "home.heroLead":
      "曼哈顿街道限时拍照寻宝——打开条目可预览检查点，然后开始计时。点击下方 + 发布你自己的寻宝。",
    "home.openHunts": "公开寻宝",
  },
  "zh-Hant": {
    "common.language": "語言",
    "common.languageBetaBadge": "測試版",
    "common.languageBetaNote": "目前翻譯尚未完整。",
    "common.languageSelectHelp": "僅用於應用介面與 hint 提示詞。",
    "shell.guest": "訪客",
    "shell.toggleTheme": "切換主題",
    "shell.nav.hunts": "尋寶",
    "shell.nav.saved": "收藏",
    "shell.nav.create": "建立",
    "shell.nav.rank": "排行",
    "shell.nav.profile": "我的",
    "shell.offlineReconnect": "重新連線",
    "shell.offlineText": "目前無法連線。網路恢復後，點擊「重新連線」即可重新載入頁面。",
    "shell.portraitTitle": "請切換為直向",
    "shell.portraitBody": "此體驗僅適合手機直向窄螢幕，請使用手機或旋轉裝置繼續。",
    "login.languageSectionTitle": "語言",
    "login.languageSectionHint": "僅切換介面與 hint 提示詞，專有名詞不變。",
    "create.searchPlaceholder": "輸入地點名稱，或留空後按「搜尋」",
    "create.searchAria": "搜尋曼哈頓地址",
    "create.searchButton": "搜尋",
    "create.useMyLocation": "使用我的位置",
    "create.hintPlaceholder": "街道或地標提示",
    "create.huntHintPlaceholder": "整個尋寶的可選提示",
    "create.basicHintPlaceholder": "地標或街道提示",
    "home.heroLead":
      "曼哈頓街道限時拍照尋寶——打開條目可預覽檢查點，然後開始計時。點擊下方 + 發佈你自己的尋寶。",
    "home.openHunts": "公開尋寶",
  },
  es: {
    "common.language": "Idioma",
    "common.languageSelectHelp": "Solo aplica a la UI y a prompts de pistas.",
    "shell.guest": "Invitado",
    "shell.toggleTheme": "Cambiar tema",
    "shell.nav.hunts": "Búsquedas",
    "shell.nav.saved": "Guardados",
    "shell.nav.create": "Crear",
    "shell.nav.rank": "Rango",
    "shell.nav.profile": "Perfil",
    "shell.offlineReconnect": "Reconectar",
    "shell.offlineText":
      "No se puede conectar a internet. Cuando vuelva la conexión, toca Reconectar para recargar la página.",
    "shell.portraitTitle": "Gira a vertical",
    "shell.portraitBody":
      "Esta experiencia está diseñada para pantallas de móvil estrechas en vertical.",
    "login.languageSectionTitle": "Idioma",
    "login.languageSectionHint":
      "Solo interfaz y prompts de pistas. Nombres propios no se traducen.",
    "create.searchPlaceholder": "Nombre del lugar, o vacío + Buscar",
    "create.searchAria": "Buscar dirección en Manhattan",
    "create.searchButton": "Buscar",
    "create.useMyLocation": "Usar mi ubicación",
    "create.hintPlaceholder": "Pista de calle o referencia",
    "create.huntHintPlaceholder": "Pista opcional para toda la búsqueda",
    "create.basicHintPlaceholder": "Pista de calle o referencia",
  },
  fr: {
    "common.language": "Langue",
    "common.languageSelectHelp":
      "S'applique uniquement a l'interface et aux invites d'indice.",
    "shell.guest": "Invite",
    "shell.toggleTheme": "Changer le theme",
    "shell.nav.hunts": "Chasses",
    "shell.nav.saved": "Enregistres",
    "shell.nav.create": "Creer",
    "shell.nav.rank": "Classement",
    "shell.nav.profile": "Profil",
    "shell.offlineReconnect": "Reconnecter",
    "shell.offlineText":
      "Connexion internet indisponible. Quand la connexion revient, appuyez sur Reconnecter.",
    "shell.portraitTitle": "Passez en mode portrait",
    "shell.portraitBody":
      "Cette experience est concue pour un ecran mobile etroit en portrait.",
    "login.languageSectionTitle": "Langue",
    "login.languageSectionHint":
      "Interface et invites d'indice uniquement. Les noms propres restent inchanges.",
    "create.searchPlaceholder": "Nom du lieu, ou vide + Rechercher",
    "create.searchAria": "Rechercher une adresse a Manhattan",
    "create.searchButton": "Rechercher",
    "create.useMyLocation": "Utiliser ma position",
    "create.hintPlaceholder": "Indice de rue ou de repere",
    "create.huntHintPlaceholder": "Indice facultatif pour toute la chasse",
    "create.basicHintPlaceholder": "Indice de rue ou de repere",
  },
  de: {
    "common.language": "Sprache",
    "common.languageSelectHelp": "Gilt nur fur UI und Hinweis-Prompts.",
    "shell.guest": "Gast",
    "shell.toggleTheme": "Design wechseln",
    "shell.nav.hunts": "Suchen",
    "shell.nav.saved": "Gespeichert",
    "shell.nav.create": "Erstellen",
    "shell.nav.rank": "Rang",
    "shell.nav.profile": "Profil",
    "shell.offlineReconnect": "Neu verbinden",
    "shell.offlineText":
      "Keine Internetverbindung. Tippe auf Neu verbinden, sobald die Verbindung wieder da ist.",
    "shell.portraitTitle": "Bitte auf Hochformat drehen",
    "shell.portraitBody":
      "Diese Ansicht ist fur schmale Handybildschirme im Hochformat optimiert.",
    "login.languageSectionTitle": "Sprache",
    "login.languageSectionHint":
      "Nur fur Oberflache und Hinweis-Prompts. Eigennamen bleiben unverandert.",
    "create.searchPlaceholder": "Ortsname oder leer + Suchen",
    "create.searchAria": "Manhattan-Adresse suchen",
    "create.searchButton": "Suchen",
    "create.useMyLocation": "Meinen Standort verwenden",
    "create.hintPlaceholder": "Hinweis zu Strasse oder Landmarke",
    "create.huntHintPlaceholder": "Optionaler Hinweis fur die ganze Suche",
    "create.basicHintPlaceholder": "Hinweis zu Strasse oder Landmarke",
  },
  ja: {
    "common.language": "言語",
    "common.languageSelectHelp": "アプリUIと言ヒント文のみ切り替えます。",
    "shell.guest": "ゲスト",
    "shell.toggleTheme": "テーマ切り替え",
    "shell.nav.hunts": "ハント",
    "shell.nav.saved": "保存",
    "shell.nav.create": "作成",
    "shell.nav.rank": "順位",
    "shell.nav.profile": "プロフィール",
    "shell.offlineReconnect": "再接続",
    "shell.offlineText":
      "インターネットに接続できません。回復したら再接続をタップしてください。",
    "shell.portraitTitle": "縦向きにしてください",
    "shell.portraitBody": "この体験はスマホの縦向き画面向けに設計されています。",
    "login.languageSectionTitle": "言語",
    "login.languageSectionHint":
      "UIと言ヒント文のみ。固有名詞は翻訳しません。",
    "create.searchPlaceholder": "地名を入力、または空欄で検索",
    "create.searchAria": "マンハッタン住所を検索",
    "create.searchButton": "検索",
    "create.useMyLocation": "現在地を使う",
    "create.hintPlaceholder": "通りやランドマークのヒント",
    "create.huntHintPlaceholder": "ハント全体の任意ヒント",
    "create.basicHintPlaceholder": "通りやランドマークのヒント",
  },
  ko: {
    "common.language": "언어",
    "common.languageSelectHelp": "앱 UI와 힌트 프롬프트에만 적용됩니다.",
    "shell.guest": "게스트",
    "shell.toggleTheme": "테마 전환",
    "shell.nav.hunts": "헌트",
    "shell.nav.saved": "저장됨",
    "shell.nav.create": "생성",
    "shell.nav.rank": "순위",
    "shell.nav.profile": "프로필",
    "shell.offlineReconnect": "다시 연결",
    "shell.offlineText":
      "인터넷에 연결할 수 없습니다. 연결이 돌아오면 다시 연결을 눌러 주세요.",
    "shell.portraitTitle": "세로 모드로 전환하세요",
    "shell.portraitBody": "이 화면은 세로형 모바일 화면에 맞춰져 있습니다.",
    "login.languageSectionTitle": "언어",
    "login.languageSectionHint": "UI와 힌트 프롬프트만 번역됩니다. 고유명사는 유지됩니다.",
    "create.searchPlaceholder": "장소명 입력 또는 비워두고 검색",
    "create.searchAria": "맨해튼 주소 검색",
    "create.searchButton": "검색",
    "create.useMyLocation": "내 위치 사용",
    "create.hintPlaceholder": "거리/랜드마크 힌트",
    "create.huntHintPlaceholder": "전체 헌트용 선택 힌트",
    "create.basicHintPlaceholder": "거리/랜드마크 힌트",
  },
  ru: {
    "common.language": "Язык",
    "common.languageSelectHelp": "Применяется только к интерфейсу и подсказкам.",
    "shell.guest": "Гость",
    "shell.toggleTheme": "Сменить тему",
    "shell.nav.hunts": "Охоты",
    "shell.nav.saved": "Сохраненное",
    "shell.nav.create": "Создать",
    "shell.nav.rank": "Рейтинг",
    "shell.nav.profile": "Профиль",
    "shell.offlineReconnect": "Переподключить",
    "shell.offlineText":
      "Нет подключения к интернету. Когда связь вернется, нажмите Переподключить.",
    "shell.portraitTitle": "Поверните в портретный режим",
    "shell.portraitBody":
      "Этот интерфейс рассчитан на узкий экран телефона в портретной ориентации.",
    "login.languageSectionTitle": "Язык",
    "login.languageSectionHint":
      "Только интерфейс и подсказки. Имена собственные не переводятся.",
    "create.searchPlaceholder": "Название места или пусто + Поиск",
    "create.searchAria": "Поиск адреса в Манхэттене",
    "create.searchButton": "Поиск",
    "create.useMyLocation": "Использовать мое местоположение",
    "create.hintPlaceholder": "Подсказка: улица или ориентир",
    "create.huntHintPlaceholder": "Необязательная подсказка для всей охоты",
    "create.basicHintPlaceholder": "Подсказка: улица или ориентир",
  },
  pt: {
    "common.language": "Idioma",
    "common.languageSelectHelp": "Aplica-se apenas a UI e prompts de dicas.",
    "shell.guest": "Convidado",
    "shell.toggleTheme": "Alternar tema",
    "shell.nav.hunts": "Caças",
    "shell.nav.saved": "Salvos",
    "shell.nav.create": "Criar",
    "shell.nav.rank": "Ranking",
    "shell.nav.profile": "Perfil",
    "shell.offlineReconnect": "Reconectar",
    "shell.offlineText":
      "Sem conexão com a internet. Quando voltar, toque em Reconectar para recarregar.",
    "shell.portraitTitle": "Gire para retrato",
    "shell.portraitBody":
      "Esta experiencia foi feita para tela estreita de celular em modo retrato.",
    "login.languageSectionTitle": "Idioma",
    "login.languageSectionHint":
      "Somente interface e prompts de dicas. Nomes proprios nao sao traduzidos.",
    "create.searchPlaceholder": "Nome do local, ou vazio + Buscar",
    "create.searchAria": "Buscar endereco em Manhattan",
    "create.searchButton": "Buscar",
    "create.useMyLocation": "Usar minha localizacao",
    "create.hintPlaceholder": "Dica de rua ou ponto de referencia",
    "create.huntHintPlaceholder": "Dica opcional para toda a caça",
    "create.basicHintPlaceholder": "Dica de rua ou ponto de referencia",
  },
  eo: {
    "common.language": "Lingvo",
    "common.languageSelectHelp": "Validas nur por interfaco kaj indikaj promesoj.",
    "shell.guest": "Gasto",
    "shell.toggleTheme": "Sxangxi temon",
    "shell.nav.hunts": "Cxasoj",
    "shell.nav.saved": "Konservitaj",
    "shell.nav.create": "Krei",
    "shell.nav.rank": "Rango",
    "shell.nav.profile": "Profilo",
    "shell.offlineReconnect": "Rekonekti",
    "shell.offlineText":
      "Ne eblas konekti al interreto. Kiam la reto revenos, frapu Rekonekti.",
    "shell.portraitTitle": "Turnu al portreta orientigxo",
    "shell.portraitBody":
      "Cxiu sperto estas por mallargxa telefona ekrano en portreta orientigxo.",
    "login.languageSectionTitle": "Lingvo",
    "login.languageSectionHint":
      "Nur interfaco kaj indikaj promesoj. Propraj nomoj restas netradukitaj.",
    "create.searchPlaceholder": "Nomo de loko, aux malplene + Sercxi",
    "create.searchAria": "Sercxi Manhattan-adreson",
    "create.searchButton": "Sercxi",
    "create.useMyLocation": "Uzi mian lokon",
    "create.hintPlaceholder": "Indiko pri strato aux orientilo",
    "create.huntHintPlaceholder": "Nedeviga indiko por la tuta cxaso",
    "create.basicHintPlaceholder": "Indiko pri strato aux orientilo",
  },
};

function normalizedLang(code) {
  if (!code || typeof code !== "string") return DEFAULT_LANG;
  const found = SUPPORTED_LANGUAGES.find((it) => it.code === code);
  return found ? found.code : DEFAULT_LANG;
}

export function getAppLanguage() {
  const stored = localStorage.getItem(LANG_STORAGE_KEY);
  return normalizedLang(stored);
}

export function setAppLanguage(code, options = {}) {
  const lang = normalizedLang(code);
  localStorage.setItem(LANG_STORAGE_KEY, lang);
  applyDocumentLanguage(lang);
  if (options.rerender !== false) requestRoute(true);
}

export function applyDocumentLanguage(code = getAppLanguage()) {
  const lang = normalizedLang(code);
  document.documentElement.lang = lang;
}

export function getSupportedLanguages() {
  return SUPPORTED_LANGUAGES.slice();
}

export function getLanguageNativeName(code) {
  const lang = SUPPORTED_LANGUAGES.find((it) => it.code === code);
  return lang?.nativeName || SUPPORTED_LANGUAGES[0].nativeName;
}

function formatMessage(raw, vars) {
  if (!vars) return raw;
  return raw.replace(/\{([a-zA-Z0-9_]+)\}/g, (_all, name) =>
    Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : "",
  );
}

export function t(key, vars) {
  const lang = getAppLanguage();
  const byLang = MESSAGE_TABLE[lang] || MESSAGE_TABLE[DEFAULT_LANG];
  const msg = byLang[key] ?? MESSAGE_TABLE[DEFAULT_LANG][key] ?? key;
  return formatMessage(msg, vars);
}

export function languageOptionsHtml(selectedLang = getAppLanguage()) {
  return getSupportedLanguages()
    .map((lang) => {
      const selected = lang.code === selectedLang ? " selected" : "";
      return `<option value="${lang.code}"${selected}>${lang.nativeName}</option>`;
    })
    .join("");
}
