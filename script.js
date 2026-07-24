import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import {
    getAuth,
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyArJ5M5qSt388mDX0B5XpuVU1Jz43HaFIM",
    authDomain: "olim-checklist.firebaseapp.com",
    projectId: "olim-checklist",
    storageBucket: "olim-checklist.firebasestorage.app",
    messagingSenderId: "900958562910",
    appId: "1:900958562910:web:fee72677f0e138110a2cf"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
auth.languageCode = "en"; // El popup de Google se muestra en inglés
const googleProvider = new GoogleAuthProvider();

let userDocRef = null;
let currentUsername = "";
let currentUserEmail = "";
let currentDisplayName = "";
let state = {};
let lang = "es";

// Convierte un email en un ID de documento seguro para Firestore
// (Firestore no permite "/" en los IDs; el resto de caracteres de un email son válidos,
// pero igual normalizamos para evitar sorpresas).
function emailToDocId(email) {
    return email.trim().toLowerCase().replace(/\//g, "_");
}

// ─────────────────────────────────────────────────────────────
//  UI: Español, Inglés + 10 idiomas más hablados del mundo + Hebreo
//  (Chino mandarín, Hindi, Francés, Árabe, Bengalí, Ruso, Portugués,
//   Urdu) + Hebreo (he)
// ─────────────────────────────────────────────────────────────
const UI = {
  es: {
    title: "Olim Checklist", subtitle: "Tu guía paso a paso para los trámites de Aliá en Israel",
    langLabel: "🌐 Idioma:", progressTitle: "📊 Tu progreso general",
    progressOf: "de", progressDone: "tareas completadas",
    chatTitle: "Asistente IA – Olim", chatSub: "Pregúntame sobre tus trámites",
    chatPlaceholder: "Escribe tu pregunta aquí…", sendBtn: "Enviar",
    chatWelcome: "¡Shalom! 👋 Soy tu asistente virtual para nuevos Olim. Puedo ayudarte con dudas sobre trámites, documentos y procesos burocráticos en Israel. ¿En qué te puedo ayudar hoy?",
    lockMsg: "🔒 Primero completa:", toastDone: "✅ ¡Progreso actualizado!", typingMsg: "Escribiendo…",
    priority: { critical: "Crítico", high: "Urgente", medium: "Importante", low: "Opcional" },
    footer: "Olim Checklist © 2026 · Conectado de forma segura a Firebase Firestore Cloud",
    showMore: "📖 Ver más info", showLess: "▲ Cerrar",
    videoLink: "▶ Ver video explicativo", govLink: "🏛 Sitio oficial del gobierno",
    noMatch: "🔍 No encontré coincidencia exacta. Prueba consultando sobre: **teudat oleh**, **banco**, **teudat zehut**, **bituach leumi**, **salud/kupat holim**, **dirección**, **escuela**, **sal klita**, **misrad haklita**, **ulpán**, **título profesional**, **licencia de conducir**, **empleo**, **municipio** o **kupa gemel**.",
    completedLabel: "Completado",
    dir: "ltr"
  },
  en: {
    title: "Olim Checklist", subtitle: "Your step-by-step guide to Aliyah procedures in Israel",
    langLabel: "🌐 Language:", progressTitle: "📊 Your overall progress",
    progressOf: "of", progressDone: "tasks completed",
    chatTitle: "AI Assistant – Olim", chatSub: "Ask me about your procedures",
    chatPlaceholder: "Type your question here…", sendBtn: "Send",
    chatWelcome: "Shalom! 👋 I'm your virtual assistant for new Olim. I can help you with questions about bureaucratic procedures, documents, and processes in Israel. How can I help you today?",
    lockMsg: "🔒 Complete first:", toastDone: "✅ Progress updated!", typingMsg: "Typing…",
    priority: { critical: "Critical", high: "Urgent", medium: "Important", low: "Optional" },
    footer: "Olim Checklist © 2026 · Securely connected to Firebase Firestore Cloud",
    showMore: "📖 More info", showLess: "▲ Close",
    videoLink: "▶ Watch explanatory video", govLink: "🏛 Official government site",
    noMatch: "🔍 No exact match found. Try typing keywords like: **teudat oleh**, **bank**, **teudat zehut**, **bituach leumi**, **health/kupat holim**, **address**, **school**, **sal klita**, **misrad haklita**, **ulpan**, **credential recognition**, **driver's license**, **employment** or **kupa gemel**.",
    completedLabel: "Completed",
    dir: "ltr"
  },
  zh: {
    title: "新移民清单", subtitle: "您在以色列办理阿利亚手续的分步指南",
    langLabel: "🌐 语言:", progressTitle: "📊 您的总体进度",
    progressOf: "共", progressDone: "项任务已完成",
    chatTitle: "AI 助手 – Olim", chatSub: "向我询问您的手续问题",
    chatPlaceholder: "在此输入您的问题…", sendBtn: "发送",
    chatWelcome: "沙洛姆！👋 我是新移民（Olim）的虚拟助手。我可以帮助您解答有关以色列文件和官僚手续的问题。今天我能帮您什么？",
    lockMsg: "🔒 请先完成：", toastDone: "✅ 进度已更新！", typingMsg: "正在输入…",
    priority: { critical: "紧急", high: "急需", medium: "重要", low: "可选" },
    footer: "Olim Checklist © 2026 · 安全连接至 Firebase Firestore 云端",
    showMore: "📖 查看更多信息", showLess: "▲ 收起",
    videoLink: "▶ 观看讲解视频", govLink: "🏛 政府官方网站",
    noMatch: "🔍 未找到精确匹配。请尝试输入关键词，例如：**银行**、**sal klita**、**ulpan**、**健康** 或 **teudat zehut**。",
    completedLabel: "已完成",
    dir: "ltr"
  },
  hi: {
    title: "ओलिम चेकलिस्ट", subtitle: "इज़राइल में अलिया प्रक्रियाओं के लिए आपका चरण-दर-चरण मार्गदर्शक",
    langLabel: "🌐 भाषा:", progressTitle: "📊 आपकी कुल प्रगति",
    progressOf: "में से", progressDone: "कार्य पूर्ण हुए",
    chatTitle: "एआई सहायक – Olim", chatSub: "अपनी प्रक्रियाओं के बारे में मुझसे पूछें",
    chatPlaceholder: "यहाँ अपना प्रश्न लिखें…", sendBtn: "भेजें",
    chatWelcome: "शालोम! 👋 मैं नए ओलिम के लिए आपका वर्चुअल सहायक हूं। मैं इज़राइल में दस्तावेज़ों और सरकारी प्रक्रियाओं से जुड़े सवालों में आपकी मदद कर सकता हूं। आज मैं आपकी कैसे मदद कर सकता हूं?",
    lockMsg: "🔒 पहले पूरा करें:", toastDone: "✅ प्रगति अपडेट हो गई!", typingMsg: "लिख रहा है…",
    priority: { critical: "अत्यावश्यक", high: "जरूरी", medium: "महत्वपूर्ण", low: "वैकल्पिक" },
    footer: "Olim Checklist © 2026 · Firebase Firestore क्लाउड से सुरक्षित रूप से जुड़ा हुआ",
    showMore: "📖 अधिक जानकारी देखें", showLess: "▲ बंद करें",
    videoLink: "▶ व्याख्यात्मक वीडियो देखें", govLink: "🏛 आधिकारिक सरकारी साइट",
    noMatch: "🔍 सटीक मिलान नहीं मिला। इन्हें आज़माएं: **बैंक**, **sal klita**, **ulpan**, **स्वास्थ्य** या **teudat zehut**।",
    completedLabel: "पूर्ण",
    dir: "ltr"
  },
  fr: {
    title: "Olim Checklist", subtitle: "Votre guide étape par étape pour les démarches d'Alya en Israël",
    langLabel: "🌐 Langue :", progressTitle: "📊 Votre progression globale",
    progressOf: "sur", progressDone: "tâches terminées",
    chatTitle: "Assistant IA – Olim", chatSub: "Posez-moi vos questions sur vos démarches",
    chatPlaceholder: "Écrivez votre question ici…", sendBtn: "Envoyer",
    chatWelcome: "Shalom ! 👋 Je suis votre assistant virtuel pour les nouveaux Olim. Je peux vous aider avec vos questions sur les démarches, documents et procédures administratives en Israël. Comment puis-je vous aider aujourd'hui ?",
    lockMsg: "🔒 Complétez d'abord :", toastDone: "✅ Progression mise à jour !", typingMsg: "En train d'écrire…",
    priority: { critical: "Critique", high: "Urgent", medium: "Important", low: "Facultatif" },
    footer: "Olim Checklist © 2026 · Connecté en toute sécurité à Firebase Firestore Cloud",
    showMore: "📖 Voir plus d'infos", showLess: "▲ Fermer",
    videoLink: "▶ Voir la vidéo explicative", govLink: "🏛 Site officiel du gouvernement",
    noMatch: "🔍 Aucune correspondance exacte. Essayez : **banque**, **sal klita**, **ulpan**, **santé** ou **teudat zehut**.",
    completedLabel: "Terminé",
    dir: "ltr"
  },
  ar: {
    title: "قائمة العولים", subtitle: "دليلك التفصيلي خطوة بخطوة لإجراءات العالياه في إسرائيل",
    langLabel: "🌐 اللغة:", progressTitle: "📊 تقدمك العام",
    progressOf: "من", progressDone: "مهام مكتملة",
    chatTitle: "مساعد الذكاء الاصطناعي – العولים", chatSub: "اسألني عن إجراءاتك",
    chatPlaceholder: "اكتب سؤالك هنا…", sendBtn: "إرسال",
    chatWelcome: "شالوم! 👋 أنا مساعدك الافتراضي للعولين الجدد. يمكنني مساعدتك في الأسئلة المتعلقة بالوثائق والإجراءات الحكومية في إسرائيل. كيف يمكنني مساعدتك اليوم؟",
    lockMsg: "🔒 أكمل أولاً:", toastDone: "✅ تم تحديث التقدم!", typingMsg: "يكتب…",
    priority: { critical: "حرج", high: "عاجل", medium: "مهم", low: "اختياري" },
    footer: "Olim Checklist © 2026 · متصل بأمان بسحابة Firebase Firestore",
    showMore: "📖 عرض المزيد من المعلومات", showLess: "▲ إغلاق",
    videoLink: "▶ مشاهدة الفيديو التوضيحي", govLink: "🏛 الموقع الرسمي للحكومة",
    noMatch: "🔍 لم يتم العثور على تطابق دقيق. جرّب البحث عن: **بنك**، **sal klita**، **ulpan**، **صحة** أو **teudat zehut**.",
    completedLabel: "مكتمل",
    dir: "rtl"
  },
  bn: {
    title: "ওলিম চেকলিস্ট", subtitle: "ইসরায়েলে আলিয়া প্রক্রিয়ার জন্য আপনার ধাপে ধাপে গাইড",
    langLabel: "🌐 ভাষা:", progressTitle: "📊 আপনার সামগ্রিক অগ্রগতি",
    progressOf: "এর মধ্যে", progressDone: "কাজ সম্পন্ন হয়েছে",
    chatTitle: "এআই সহায়ক – Olim", chatSub: "আপনার প্রক্রিয়া সম্পর্কে আমাকে জিজ্ঞাসা করুন",
    chatPlaceholder: "এখানে আপনার প্রশ্ন লিখুন…", sendBtn: "পাঠান",
    chatWelcome: "শালোম! 👋 আমি নতুন ওলিমদের জন্য আপনার ভার্চুয়াল সহায়ক। ইসরায়েলে নথিপত্র এবং সরকারি প্রক্রিয়া সম্পর্কিত প্রশ্নে আমি আপনাকে সাহায্য করতে পারি। আজ আমি আপনাকে কীভাবে সাহায্য করতে পারি?",
    lockMsg: "🔒 প্রথমে সম্পন্ন করুন:", toastDone: "✅ অগ্রগতি আপডেট হয়েছে!", typingMsg: "টাইপ করছে…",
    priority: { critical: "জরুরি", high: "অতীব জরুরি", medium: "গুরুত্বপূর্ণ", low: "ঐচ্ছিক" },
    footer: "Olim Checklist © 2026 · Firebase Firestore ক্লাউডের সাথে নিরাপদে সংযুক্ত",
    showMore: "📖 আরও তথ্য দেখুন", showLess: "▲ বন্ধ করুন",
    videoLink: "▶ ব্যাখ্যামূলক ভিডিও দেখুন", govLink: "🏛 সরকারি অফিসিয়াল সাইট",
    noMatch: "🔍 সঠিক মিল পাওয়া যায়নি। চেষ্টা করুন: **ব্যাংক**, **sal klita**, **ulpan**, **স্বাস্থ্য** বা **teudat zehut**।",
    completedLabel: "সম্পন্ন",
    dir: "ltr"
  },
  ru: {
    title: "Чек-лист Олим", subtitle: "Ваше пошаговое руководство по процедурам репатриации в Израиле",
    langLabel: "🌐 Язык:", progressTitle: "📊 Ваш общий прогресс",
    progressOf: "из", progressDone: "задач выполнено",
    chatTitle: "ИИ-помощник – Olim", chatSub: "Спросите меня о ваших процедурах",
    chatPlaceholder: "Введите свой вопрос здесь…", sendBtn: "Отправить",
    chatWelcome: "Шалом! 👋 Я ваш виртуальный помощник для новых репатриантов. Я могу помочь вам с вопросами о документах и бюрократических процедурах в Израиле. Чем я могу помочь вам сегодня?",
    lockMsg: "🔒 Сначала завершите:", toastDone: "✅ Прогресс обновлён!", typingMsg: "Печатает…",
    priority: { critical: "Критично", high: "Срочно", medium: "Важно", low: "Необязательно" },
    footer: "Olim Checklist © 2026 · Безопасно подключено к облаку Firebase Firestore",
    showMore: "📖 Подробнее", showLess: "▲ Закрыть",
    videoLink: "▶ Смотреть видео с объяснением", govLink: "🏛 Официальный сайт правительства",
    noMatch: "🔍 Точных совпадений не найдено. Попробуйте: **банк**, **sal klita**, **ulpan**, **здоровье** или **teudat zehut**.",
    completedLabel: "Выполнено",
    dir: "ltr"
  },
  pt: {
    title: "Lista de Olim", subtitle: "Seu guia passo a passo para os trâmites de Aliá em Israel",
    langLabel: "🌐 Idioma:", progressTitle: "📊 Seu progresso geral",
    progressOf: "de", progressDone: "tarefas concluídas",
    chatTitle: "Assistente de IA – Olim", chatSub: "Pergunte-me sobre seus trâmites",
    chatPlaceholder: "Digite sua pergunta aqui…", sendBtn: "Enviar",
    chatWelcome: "Shalom! 👋 Sou seu assistente virtual para novos Olim. Posso ajudá-lo com dúvidas sobre trâmites, documentos e processos burocráticos em Israel. Como posso ajudá-lo hoje?",
    lockMsg: "🔒 Complete primeiro:", toastDone: "✅ Progresso atualizado!", typingMsg: "Digitando…",
    priority: { critical: "Crítico", high: "Urgente", medium: "Importante", low: "Opcional" },
    footer: "Olim Checklist © 2026 · Conectado com segurança ao Firebase Firestore Cloud",
    showMore: "📖 Ver mais informações", showLess: "▲ Fechar",
    videoLink: "▶ Assistir vídeo explicativo", govLink: "🏛 Site oficial do governo",
    noMatch: "🔍 Nenhuma correspondência exata encontrada. Tente: **banco**, **sal klita**, **ulpan**, **saúde** ou **teudat zehut**.",
    completedLabel: "Concluído",
    dir: "ltr"
  },
  ur: {
    title: "اولیم چیک لسٹ", subtitle: "اسرائیل میں علیا کے مراحل کے لیے آپ کی قدم بہ قدم رہنمائی",
    langLabel: "🌐 زبان:", progressTitle: "📊 آپ کی مجموعی پیش رفت",
    progressOf: "میں سے", progressDone: "کام مکمل ہوئے",
    chatTitle: "اے آئی اسسٹنٹ – اولیم", chatSub: "اپنے مراحل کے بارے میں مجھ سے پوچھیں",
    chatPlaceholder: "اپنا سوال یہاں لکھیں…", sendBtn: "بھیجیں",
    chatWelcome: "شالوم! 👋 میں نئے اولیم کے لیے آپ کا ورچوئل اسسٹنٹ ہوں۔ میں اسرائیل میں دستاویزات اور سرکاری کارروائیوں سے متعلق سوالات میں آپ کی مدد کر سکتا ہوں۔ آج میں آپ کی کیسے مدد کر سکتا ہوں؟",
    lockMsg: "🔒 پہلے مکمل کریں:", toastDone: "✅ پیش رفت اپ ڈیٹ ہو گئی!", typingMsg: "لکھ رہا ہے…",
    priority: { critical: "نازک", high: "فوری", medium: "اہم", low: "اختیاری" },
    footer: "Olim Checklist © 2026 · Firebase Firestore کلاؤڈ سے محفوظ طریقے سے منسلک",
    showMore: "📖 مزید معلومات دیکھیں", showLess: "▲ بند کریں",
    videoLink: "▶ وضاحتی ویڈیو دیکھیں", govLink: "🏛 سرکاری آفیشل ویب سائٹ",
    noMatch: "🔍 کوئی درست میچ نہیں ملا۔ آزمائیں: **بینک**، **sal klita**، **ulpan**، **صحت** یا **teudat zehut**۔",
    completedLabel: "مکمل",
    dir: "rtl"
  },
  he: {
    title: "רשימת עולים", subtitle: "המדריך שלך צעד אחר צעד לתהליכי הקליטה בישראל",
    langLabel: "🌐 שפה:", progressTitle: "📊 ההתקדמות הכללית שלך",
    progressOf: "מתוך", progressDone: "משימות הושלמו",
    chatTitle: "עוזר AI – עולים", chatSub: "שאל אותי על התהליכים שלך",
    chatPlaceholder: "כתוב את שאלתך כאן…", sendBtn: "שלח",
    chatWelcome: "שלום! 👋 אני העוזר הווירטואלי שלך לעולים חדשים. אני יכול לעזור לך בשאלות על מסמכים ותהליכים בירוקרטיים בישראל. איך אוכל לעזור לך היום?",
    lockMsg: "🔒 קודם השלם:", toastDone: "✅ ההתקדמות עודכנה!", typingMsg: "מקליד…",
    priority: { critical: "קריטי", high: "דחוף", medium: "חשוב", low: "אופציונלי" },
    footer: "Olim Checklist © 2026 · מחובר בבטחה לענן Firebase Firestore",
    showMore: "📖 מידע נוסף", showLess: "▲ סגור",
    videoLink: "▶ צפה בסרטון הסבר", govLink: "🏛 אתר ממשלתי רשמי",
    noMatch: "🔍 לא נמצאה התאמה מדויקת. נסה: **בנק**, **sal klita**, **ulpan**, **בריאות** או **teudat zehut**.",
    completedLabel: "הושלם",
    dir: "rtl"
  }
};

const PHASES_DATA = [
  { id: "fase1", titleKey: "phase1Title", num: "1", tasks: [
    { id: "t1",  nameKey: "t1n", descKey: "t1d", priority: "critical", prereq: null },
    { id: "t2",  nameKey: "t2n", descKey: "t2d", priority: "critical", prereq: "t1" },
    { id: "t3",  nameKey: "t3n", descKey: "t3d", priority: "critical", prereq: "t1" },
    { id: "t4",  nameKey: "t4n", descKey: "t4d", priority: "critical", prereq: "t3" }
  ]},
  { id: "fase2", titleKey: "phase2Title", num: "2", tasks: [
    { id: "t5",  nameKey: "t5n", descKey: "t5d", priority: "high", prereq: "t4" },
    { id: "t6",  nameKey: "t6n", descKey: "t6d", priority: "high", prereq: "t3" },
    { id: "t7",  nameKey: "t7n", descKey: "t7d", priority: "high", prereq: "t6" }
  ]},
  { id: "fase3", titleKey: "phase3Title", num: "3", tasks: [
    { id: "t8",  nameKey: "t8n", descKey: "t8d", priority: "medium", prereq: "t4" },
    { id: "t9",  nameKey: "t9n", descKey: "t9d", priority: "medium", prereq: "t3" },
    { id: "t10", nameKey: "t10n",descKey: "t10d",priority: "medium", prereq: "t9" }
  ]},
  { id: "fase4", titleKey: "phase4Title", num: "4", tasks: [
    { id: "t11", nameKey: "t11n",descKey: "t11d",priority: "medium", prereq: "t9" },
    { id: "t12", nameKey: "t12n",descKey: "t12d",priority: "low",    prereq: "t6" },
    { id: "t13", nameKey: "t13n",descKey: "t13d",priority: "low",    prereq: "t4" }
  ]},
  { id: "fase5", titleKey: "phase5Title", num: "5", tasks: [
    { id: "t14", nameKey: "t14n",descKey: "t14d",priority: "low", prereq: "t6" },
    { id: "t15", nameKey: "t15n",descKey: "t15d",priority: "low", prereq: "t2" }
  ]}
];

// ─────────────────────────────────────────────────────────────
//  DATOS DE CADA TAREA: descripción corta, explicación larga,
//  video de YouTube y link al gobierno oficial de Israel
// ─────────────────────────────────────────────────────────────
const TASKS_T = {
  es: {
    phase1Title: "Fase 1 – Documentos esenciales al llegar",
    phase2Title: "Fase 2 – Salud y residencia",
    phase3Title: "Fase 3 – Beneficios y ayudas del gobierno",
    phase4Title: "Fase 4 – Trabajo y licencias",
    phase5Title: "Fase 5 – Integración y opcionales",

    t1n: "Recibir el Teudat Oleh (תעודת עולה)",
    t1d: "El documento oficial de inmigrante entregado en el aeropuerto o Ministerio de Aliá.",
    t1x: "La Teudat Oleh es el primer documento que recibís como nuevo inmigrante en Israel. Te lo entrega el Sochnut (Agencia Judía) o el Ministerio de Aliá en el aeropuerto Ben Gurión al llegar, o bien en una oficina consular antes de volar. Este documento acredita tu estatus de Olé Jadash y te da acceso a todos los beneficios de absorción del Estado: la Sal Klita, el Ulpán, exenciones impositivas, y mucho más. ¡Guardalo siempre en un lugar seguro!",
    t1v: "https://www.youtube.com/results?search_query=teudat+oleh+explicacion+aliya",
    t1g: "https://www.gov.il/he/departments/ministry_of_aliyah_and_integration",

    t2n: "Abrir cuenta bancaria israelí",
    t2d: "Requisito para recibir la Sal Klita. Bancos sugeridos: Hapoalim o Leumi.",
    t2x: "Para poder recibir los pagos mensuales de la Sal Klita necesitás sí o sí una cuenta bancaria israelí. Los bancos más populares entre Olim son Bank Hapoalim y Bank Leumi. Para abrir la cuenta necesitás: tu Teudat Oleh, un documento de identidad (pasaporte o Teudat Zehut temporal), y a veces un comprobante de domicilio. Muchos bancos tienen representantes que hablan español o inglés y atención especial para Olim recién llegados.",
    t2v: "https://www.youtube.com/results?search_query=abrir+cuenta+bancaria+israel+olim",
    t2g: "https://www.bankofisrael.org.il/en/",

    t3n: "Obtener la Teudat Zehut (ת\"ז)",
    t3d: "Tu documento de identidad nacional israelí en el Misrad Hapnim.",
    t3x: "La Teudat Zehut es el DNI israelí. Se tramita en el Misrad Hapnim (Ministerio del Interior). En el aeropuerto recibís un documento temporal, pero debés dirigirte a una oficina del Misrad Hapnim dentro de los primeros días para obtener la Teudat Zehut definitiva. Te recomendamos pedir turno con anticipación en la app MyVisit o en el sitio oficial para evitar largas esperas. Este documento es necesario para casi todos los demás trámites.",
    t3v: "https://www.youtube.com/results?search_query=teudat+zehut+misrad+hapnim+olim",
    t3g: "https://www.gov.il/he/departments/ministry_of_interior",

    t4n: "Registrarse en Bituach Leumi",
    t4d: "Seguridad social. Crucial para cobertura médica inmediata.",
    t4x: "El Bituach Leumi es el Instituto Nacional de Seguridad Social de Israel (equivalente a ANSES en Argentina o IMSS en México). Al registrarte activás tu derecho a elegir Kupat Holim (obra social de salud), recibís protección ante accidentes laborales, y quedás cubierto para futuras prestaciones. Como Olé Jadash tenés exenciones en los primeros meses. Podés registrarte online o en cualquier sucursal del Bituach Leumi presentando tu Teudat Oleh y Teudat Zehut.",
    t4v: "https://www.youtube.com/results?search_query=bituach+leumi+olim+registro",
    t4g: "https://www.btl.gov.il/English%20Homepage/Pages/default.aspx",

    t5n: "Elegir Kupat Holim (קופת חולים)",
    t5d: "Inscribirse en un fondo de salud (Clalit, Maccabi, Meuhedet o Leumit).",
    t5x: "Israel tiene un sistema de salud público obligatorio basado en 4 proveedores llamados Kupot Holim: Clalit (la más grande, cobertura amplia), Maccabi (muy popular entre angloparlantes e hispanohablantes), Meuhedet y Leumit. Como Olé Jadash estás exento del pago de la cuota mensual durante tus primeros meses. Podés elegir y cambiar de Kupat Holim una vez al año. Cada una tiene su red de médicos y farmacias.",
    t5v: "https://www.youtube.com/results?search_query=kupat+holim+israel+cual+elegir",
    t5g: "https://www.gov.il/en/service/choose_health_fund",

    t6n: "Registrar dirección permanente",
    t6d: "Actualizar domicilio oficial para recibir notificaciones y correos gubernamentales.",
    t6x: "Registrar tu dirección fija en el Misrad Hapnim es fundamental. Todos los documentos, notificaciones de Bituach Leumi, comunicaciones de tu municipio (Iriya) y el sistema escolar se envían a la dirección registrada en el sistema. Además, definir en qué ciudad vivís determina a qué municipio pagás Arnona (impuesto municipal) y en qué escuelas pueden inscribirse tus hijos. Se hace en el Misrad Hapnim con comprobante de vivienda.",
    t6v: "https://www.youtube.com/results?search_query=registrar+direccion+israel+misrad+hapnim",
    t6g: "https://www.gov.il/he/departments/ministry_of_interior",

    t7n: "Inscribir hijos en el sistema escolar",
    t7d: "Gestión con el municipio local para asignación de escuelas públicas.",
    t7x: "La educación pública en Israel es gratuita y obligatoria desde los 3 años hasta el bachillerato. Para inscribir a tus hijos debés acudir a la Iriya (municipio) de tu ciudad con: Teudat Oleh del niño, Teudat Zehut o pasaporte, y comprobante de domicilio. Existen escuelas con programas especiales para hijos de Olim que facilitan la integración al hebreo. Muchos municipios tienen coordinadores de absorción que hablan español.",
    t7v: "https://www.youtube.com/results?search_query=inscripcion+escolar+israel+olim+hijos",
    t7g: "https://edu.gov.il/en",

    t8n: "Solicitar la Sal Klita (סל קליטה)",
    t8d: "La canasta de absorción económica depositada mensualmente.",
    t8x: "La Sal Klita (canasta de absorción) es el apoyo económico principal del Estado de Israel para los Olim Jadashim durante su primer año. Se compone de un pago inicial en el aeropuerto y luego 6 pagos mensuales depositados en tu cuenta bancaria israelí. El monto varía según tu estado civil y si tenés hijos. Para activarla debés registrarte en el Misrad Haklita y vincular tu cuenta bancaria. ¡No dejes pasar el plazo!",
    t8v: "https://www.youtube.com/results?search_query=sal+klita+canasta+absorcion+israel",
    t8g: "https://www.gov.il/en/departments/guides/sal_klita",

    t9n: "Registrarse en Misrad Haklita",
    t9d: "Ministerio de Absorción para activar vouchers de ayuda y Ulpán.",
    t9x: "El Misrad Haklita (Ministerio de Absorción de Aliá) es la institución central para los Olim. Al registrarte activás acceso a: el voucher del Ulpán (curso de hebreo gratis), asistencia económica adicional, vouchers de vivienda, y orientación general. Tienen oficinas en todas las ciudades grandes de Israel y muchos funcionarios hablan español. Es uno de los primeros trámites que debés hacer apenas te instalás.",
    t9v: "https://www.youtube.com/results?search_query=misrad+haklita+olim+registro+beneficios",
    t9g: "https://www.gov.il/en/departments/ministry_of_aliyah_and_integration",

    t10n: "Inscribirse en el Ulpán (אולפן)",
    t10d: "Curso gratuito intensivo de idioma hebreo oficial para Olim.",
    t10x: "El Ulpán es el curso intensivo de hebreo moderno que Israel ofrece gratis a todos los Olim Jadashim. Se cursa generalmente en horario matutino, de domingo a jueves, durante 5 meses. Hay Ulpanim en todo el país. Podés elegir entre Ulpán del gobierno, municipal o privado (con subsidio). El voucher se obtiene en el Misrad Haklita y debés usarlo dentro de los 18 meses de tu Aliá. ¡El hebreo es clave para integrarse!",
    t10v: "https://www.youtube.com/results?search_query=ulpan+hebreo+israel+olim+gratis",
    t10g: "https://www.gov.il/en/service/ulpan-for-new-immigrants",

    t11n: "Solicitar reconocimiento de título",
    t11d: "Se tramita según tu profesión ante los organismos públicos correspondientes.",
    t11x: "Si tenés un título universitario o terciario de tu país de origen y querés ejercer tu profesión en Israel, debés tramitar el reconocimiento ante el organismo correspondiente. Para médicos es el Misrad Habriut, para abogados el Lishkat Orche Hadin, para ingenieros o arquitectos el Misrad Habinui, etc. El proceso puede llevar meses e incluir exámenes o pasantías. Te recomendamos investigar los requisitos específicos de tu profesión lo antes posible.",
    t11v: "https://www.youtube.com/results?search_query=reconocimiento+titulo+profesional+israel+olim",
    t11g: "https://www.gov.il/en/departments/guides/recognition-of-professional-qualifications",

    t12n: "Obtener licencia de conducir israelí",
    t12d: "Canje oficial de tu licencia extranjera en las oficinas de Misrad Harishui.",
    t12x: "Como Olé Jadash tenés derecho a canjear tu licencia de conducir extranjera por una israelí sin necesidad de dar el examen teórico ni el práctico, siempre que la licencia tenga al menos 2 años de antigüedad. El trámite se hace en el Misrad Harishui (Ministerio de Transporte). Necesitás: tu licencia original, Teudat Oleh, Teudat Zehut, revisión médica básica y pago de tasa. Este beneficio tiene un plazo: debés hacerlo dentro de tus primeros 3 años de Aliá.",
    t12v: "https://www.youtube.com/results?search_query=licencia+conducir+israel+canje+olim",
    t12g: "https://www.gov.il/en/service/converting-foreign-driving-license",

    t13n: "Registrarse en el Servicio de Empleo",
    t13d: "Inscripción en el Lishkat Taasuka para acceder a bolsas de trabajo.",
    t13x: "La Lishkat Taasuka (Oficina de Empleo) es el organismo estatal que conecta trabajadores con empleadores en Israel. Al inscribirte tenés acceso a bolsas de trabajo, cursos de capacitación subsidiados, y en algunos casos ayuda económica mientras buscás trabajo. También podés acceder a ferias de empleo especiales para Olim. El servicio está disponible en las principales ciudades y tiene recursos online en varios idiomas.",
    t13v: "https://www.youtube.com/results?search_query=lishkat+taasuka+israel+empleo+olim",
    t13g: "https://www.gov.il/en/departments/the_employment_service",

    t14n: "Registrarse en el municipio local",
    t14d: "Gestión de tasas municipales (Arnona) y alta de residente de la ciudad.",
    t14x: "Cada ciudad en Israel tiene su Iriya (municipalidad) donde debés registrarte como residente. Al hacerlo podés: tramitar descuentos en el Arnona (impuesto municipal sobre la propiedad), acceder a servicios municipales, inscribir a tus hijos en escuelas y jardines del municipio, y recibir comunicaciones oficiales. Muchas Iriyot tienen departamentos especiales de absorción con personal que habla español para asistir a Olim recién llegados.",
    t14v: "https://www.youtube.com/results?search_query=municipio+iriya+israel+registro+olim+arnona",
    t14g: "https://www.gov.il/he/departments/ministry_of_interior",

    t15n: "Abrir cuenta de ahorros (Kupa Gemel)",
    t15d: "Fondos de previsión con ventajas fiscales exclusivas para Olim Jadashim.",
    t15x: "La Kupa Gemel (קופת גמל) es un fondo de ahorro para la vejez o para objetivos específicos que ofrece importantes ventajas fiscales en Israel. Como Olé Jadash tenés beneficios adicionales como exenciones impositivas sobre los rendimientos durante los primeros años. Hay varios tipos: para jubilación (Pensia), para inversión general o para objetivos. Se abre en cualquier banco o casa financiera autorizada. Es una decisión financiera importante, considerá consultar con un asesor.",
    t15v: "https://www.youtube.com/results?search_query=kupa+gemel+israel+olim+ahorro",
    t15g: "https://www.gov.il/en/departments/ministry_of_finance"
  },
  en: {
    phase1Title: "Phase 1 – Essential documents upon arrival",
    phase2Title: "Phase 2 – Health and residence",
    phase3Title: "Phase 3 – Government benefits and aid",
    phase4Title: "Phase 4 – Work and licenses",
    phase5Title: "Phase 5 – Integration and optional steps",

    t1n: "Receive the Teudat Oleh",
    t1d: "Official immigrant document given at the airport or Ministry of Aliyah.",
    t1x: "The Teudat Oleh is the first document you receive as a new immigrant. It is issued by the Jewish Agency (Sochnut) or Ministry of Aliyah at Ben Gurion Airport upon arrival, or at a consular office before flying. This document certifies your status as a New Oleh and grants you access to all state absorption benefits: Sal Klita, Ulpan, tax exemptions, and much more. Keep it safe at all times!",
    t1v: "https://www.youtube.com/results?search_query=teudat+oleh+aliyah+explained",
    t1g: "https://www.gov.il/en/departments/ministry_of_aliyah_and_integration",

    t2n: "Open an Israeli bank account",
    t2d: "Required to receive your monthly Sal Klita payments.",
    t2x: "To receive your Sal Klita monthly payments, you need an Israeli bank account. The most popular banks among Olim are Bank Hapoalim and Bank Leumi. To open an account you will need: your Teudat Oleh, an ID document (passport or temporary Teudat Zehut), and sometimes proof of address. Many banks have staff who speak English or Spanish and offer special assistance for new Olim.",
    t2v: "https://www.youtube.com/results?search_query=open+bank+account+israel+new+olim",
    t2g: "https://www.bankofisrael.org.il/en/",

    t3n: "Obtain the Teudat Zehut",
    t3d: "Your Israeli national identity card handled at Misrad Hapnim.",
    t3x: "The Teudat Zehut is your Israeli national ID card. It is processed at the Misrad Hapnim (Ministry of the Interior). At the airport you receive a temporary document, but you must visit a Misrad Hapnim office within the first few days to get your permanent Teudat Zehut. We recommend booking an appointment in advance via the MyVisit app or official website to avoid long waits. This document is required for almost all other procedures.",
    t3v: "https://www.youtube.com/results?search_query=teudat+zehut+misrad+hapnim+aliyah+english",
    t3g: "https://www.gov.il/en/departments/ministry_of_interior",

    t4n: "Register with Bituach Leumi",
    t4d: "National insurance. Essential for your primary healthcare validation.",
    t4x: "Bituach Leumi is Israel's National Insurance Institute (similar to Social Security). By registering, you activate your right to choose a Kupat Holim (health fund), receive coverage for work accidents, and qualify for future benefits. As a new Oleh you are exempt from payments during your initial months. You can register online or at any Bituach Leumi branch by presenting your Teudat Oleh and Teudat Zehut.",
    t4v: "https://www.youtube.com/results?search_query=bituach+leumi+registration+new+olim+english",
    t4g: "https://www.btl.gov.il/English%20Homepage/Pages/default.aspx",

    t5n: "Choose a Kupat Holim",
    t5d: "Register in an Israeli health fund provider (Clalit, Maccabi, etc.).",
    t5x: "Israel has a mandatory public health system based on 4 providers called Kupot Holim: Clalit (the largest, broad coverage), Maccabi (very popular among English and Spanish speakers), Meuhedet and Leumit. As a new Oleh you are exempt from the monthly fee during your first months. You can switch your Kupat Holim once a year. Each has its own network of doctors and pharmacies.",
    t5v: "https://www.youtube.com/results?search_query=kupat+holim+israel+which+to+choose+english",
    t5g: "https://www.gov.il/en/service/choose_health_fund",

    t6n: "Register permanent address",
    t6d: "Update database with your fixed home address for official rights.",
    t6x: "Registering your fixed address at the Misrad Hapnim is essential. All documents, Bituach Leumi notifications, municipal communications and the school system are sent to the address registered in the system. Moreover, which city you live in determines which municipality (Iriya) you pay Arnona to, and which schools your children can enroll in. You do this at the Misrad Hapnim with proof of residence.",
    t6v: "https://www.youtube.com/results?search_query=register+address+israel+misrad+hapnim+english",
    t6g: "https://www.gov.il/en/departments/ministry_of_interior",

    t7n: "Enroll children in school",
    t7d: "Coordination with local municipality for public school assignation.",
    t7x: "Public education in Israel is free and compulsory from age 3 through high school. To enroll your children, go to the Iriya (municipality) of your city with: the child's Teudat Oleh, Teudat Zehut or passport, and proof of address. There are schools with special programs for Olim children to facilitate Hebrew integration. Many municipalities have absorption coordinators who speak English or other languages.",
    t7v: "https://www.youtube.com/results?search_query=enroll+children+school+israel+aliyah",
    t7g: "https://edu.gov.il/en",

    t8n: "Apply for Sal Klita",
    t8d: "The state financial assistance basket for your initial months.",
    t8x: "The Sal Klita (absorption basket) is the main financial support the State of Israel provides to new Olim during their first year. It consists of an initial payment at the airport followed by 6 monthly deposits to your Israeli bank account. The amount varies depending on marital status and number of children. To activate it you must register at Misrad Haklita and link your bank account. Don't miss the deadline!",
    t8v: "https://www.youtube.com/results?search_query=sal+klita+absorption+basket+israel+explained",
    t8g: "https://www.gov.il/en/departments/guides/sal_klita",

    t9n: "Register at Misrad Haklita",
    t9d: "Ministry of Aliyah validation for study and housing assistance programs.",
    t9x: "Misrad Haklita (Ministry of Aliyah and Integration) is the central institution for Olim. By registering you activate: the Ulpan voucher (free Hebrew course), additional financial assistance, housing vouchers, and general guidance. They have offices in all major Israeli cities and many staff speak English. This is one of the first things you should do once you settle in.",
    t9v: "https://www.youtube.com/results?search_query=misrad+haklita+register+benefits+english",
    t9g: "https://www.gov.il/en/departments/ministry_of_aliyah_and_integration",

    t10n: "Enroll in Ulpan",
    t10d: "Your free official intensive Hebrew language course voucher.",
    t10x: "The Ulpan is the intensive modern Hebrew course that Israel offers free of charge to all new Olim. It typically runs Sunday through Thursday mornings for 5 months. There are Ulpanim all over the country. You can choose between a government, municipal, or private (subsidized) Ulpan. The voucher is obtained at Misrad Haklita and must be used within 18 months of your Aliyah. Hebrew is the key to integration!",
    t10v: "https://www.youtube.com/results?search_query=ulpan+hebrew+course+israel+free+olim",
    t10g: "https://www.gov.il/en/service/ulpan-for-new-immigrants",

    t11n: "Request credential recognition",
    t11d: "Validation of professional degree at corresponding government entities.",
    t11x: "If you have a university or college degree from your home country and want to practice your profession in Israel, you must apply for recognition at the relevant body. For doctors it is Misrad Habriut, for lawyers Lishkat Orche Hadin, for engineers or architects Misrad Habinui, etc. The process can take months and may include exams or internships. Research the specific requirements for your profession as early as possible.",
    t11v: "https://www.youtube.com/results?search_query=professional+degree+recognition+israel+english",
    t11g: "https://www.gov.il/en/departments/guides/recognition-of-professional-qualifications",

    t12n: "Obtain Israeli driver's license",
    t12d: "Conversion of your foreign driver license at Misrad Harishui offices.",
    t12x: "As a new Oleh you can exchange your foreign driver's license for an Israeli one without taking the written or practical test, provided your license is at least 2 years old. The process is done at Misrad Harishui (Ministry of Transport). You will need: your original license, Teudat Oleh, Teudat Zehut, a basic medical check-up, and payment of a fee. This benefit has a time limit: you must do it within your first 3 years of Aliyah.",
    t12v: "https://www.youtube.com/results?search_query=convert+driving+license+israel+english+olim",
    t12g: "https://www.gov.il/en/service/converting-foreign-driving-license",

    t13n: "Register with Employment Service",
    t13d: "Registration at Lishkat Taasuka for placement opportunities.",
    t13x: "Lishkat Taasuka (Employment Office) is the government body that connects workers with employers in Israel. By registering you gain access to job boards, subsidized training courses, and in some cases financial assistance while job hunting. You can also attend special job fairs for Olim. The service is available in major cities and has online resources in multiple languages.",
    t13v: "https://www.youtube.com/results?search_query=lishkat+taasuka+employment+service+israel+english",
    t13g: "https://www.gov.il/en/departments/the_employment_service",

    t14n: "Register at local municipality",
    t14d: "Handling city taxes (Arnona) and registration benefits.",
    t14x: "Every city in Israel has an Iriya (municipality) where you need to register as a resident. By doing so you can: apply for discounts on the Arnona (municipal property tax), access municipal services, enroll your children in local schools and kindergartens, and receive official communications. Many municipalities have special absorption departments with staff who speak English to assist newly arrived Olim.",
    t14v: "https://www.youtube.com/results?search_query=iriya+municipality+israel+register+olim+english",
    t14g: "https://www.gov.il/en/departments/ministry_of_interior",

    t15n: "Open a savings fund (Kupa Gemel)",
    t15d: "Savings tracks with exclusive tax benefits for new Olim Jadashim.",
    t15x: "A Kupa Gemel (קופת גמל) is a retirement or general savings fund that offers important tax advantages in Israel. As a new Oleh you get additional benefits such as tax exemptions on returns during your first years. There are several types: for retirement (Pensia), for general investment, or for specific goals. It can be opened at any bank or licensed financial institution. This is an important financial decision — consider consulting a financial advisor.",
    t15v: "https://www.youtube.com/results?search_query=kupa+gemel+israel+olim+savings+english",
    t15g: "https://www.gov.il/en/departments/ministry_of_finance"
  },
  zh: {
    phase1Title: "第一阶段 – 抵达后的必要文件",
    phase2Title: "第二阶段 – 健康与居住登记",
    phase3Title: "第三阶段 – 政府福利与补助",
    phase4Title: "第四阶段 – 工作与执照",
    phase5Title: "第五阶段 – 融入与可选事项",

    t1n: "领取 Teudat Oleh（新移民证）",
    t1d: "在机场或阿利亚部（Ministry of Aliyah）颁发的官方移民文件。",
    t1x: "Teudat Oleh 是您作为以色列新移民收到的第一份文件，由犹太机构（Sochnut）或阿利亚部在本古里安机场发放，也可能在起飞前的领事馆办理。这份文件证明您的新移民身份，让您能享受国家提供的所有安置福利，包括 Sal Klita（安置补助）、Ulpan（希伯来语课程）和税收减免等。请务必妥善保管！",
    t1v: "https://www.youtube.com/results?search_query=teudat+oleh+aliyah+explained",
    t1g: "https://www.gov.il/en/departments/ministry_of_aliyah_and_integration",

    t2n: "开立以色列银行账户",
    t2d: "领取 Sal Klita 补助的必要条件，推荐银行：Hapoalim 或 Leumi。",
    t2x: "要领取每月的 Sal Klita 补助，您必须拥有一个以色列银行账户。Olim 中最常用的银行是 Bank Hapoalim 和 Bank Leumi。开户时需要：您的 Teudat Oleh、身份证件（护照或临时 Teudat Zehut），有时还需要地址证明。很多银行都有讲英语或西班牙语的工作人员，专门为新移民提供帮助。",
    t2v: "https://www.youtube.com/results?search_query=open+bank+account+israel+new+olim",
    t2g: "https://www.bankofisrael.org.il/en/",

    t3n: "办理 Teudat Zehut（身份证）",
    t3d: "在内政部（Misrad Hapnim）办理的以色列国民身份证。",
    t3x: "Teudat Zehut 是以色列的国民身份证，需在内政部（Misrad Hapnim）办理。抵达机场时您会拿到临时文件，但必须在最初几天内前往 Misrad Hapnim 办公室领取正式的 Teudat Zehut。建议提前通过 MyVisit 应用程序或官方网站预约，以避免长时间等待。此证件几乎是办理其他所有手续的必要条件。",
    t3v: "https://www.youtube.com/results?search_query=teudat+zehut+misrad+hapnim+aliyah+english",
    t3g: "https://www.gov.il/en/departments/ministry_of_interior",

    t4n: "在 Bituach Leumi 登记",
    t4d: "国民保险登记，是获得基本医疗保障的关键步骤。",
    t4x: "Bituach Leumi 是以色列国家保险局（类似社会保障机构）。登记后，您将获得选择 Kupat Holim（医疗基金）的权利，工伤事故保障，以及未来福利的资格。作为新移民，最初几个月您可免缴部分费用。您可以在线或前往任意 Bituach Leumi 分支机构登记，出示 Teudat Oleh 和 Teudat Zehut 即可。",
    t4v: "https://www.youtube.com/results?search_query=bituach+leumi+registration+new+olim+english",
    t4g: "https://www.btl.gov.il/English%20Homepage/Pages/default.aspx",

    t5n: "选择 Kupat Holim（医疗基金）",
    t5d: "在医疗基金机构注册（Clalit、Maccabi、Meuhedet 或 Leumit）。",
    t5x: "以色列的强制性公共医疗系统由四家医疗基金机构组成：Clalit（规模最大，覆盖广泛）、Maccabi（在英语和西班牙语使用者中很受欢迎）、Meuhedet 和 Leumit。作为新移民，最初几个月您可免缴月费。每年可以更换一次 Kupat Holim。每家机构都有各自的医生和药房网络。",
    t5v: "https://www.youtube.com/results?search_query=kupat+holim+israel+which+to+choose+english",
    t5g: "https://www.gov.il/en/service/choose_health_fund",

    t6n: "登记永久住址",
    t6d: "更新官方住址以便接收通知和政府邮件。",
    t6x: "在内政部登记您的固定住址至关重要。所有文件、Bituach Leumi 的通知、市政府（Iriya）的通讯以及学校系统的信函都将发送到系统中登记的地址。此外，您居住的城市决定了您向哪个市政府缴纳 Arnona（市政税），以及您的孩子可以在哪些学校就读。此手续需在 Misrad Hapnim 办理，需提供住所证明。",
    t6v: "https://www.youtube.com/results?search_query=register+address+israel+misrad+hapnim+english",
    t6g: "https://www.gov.il/en/departments/ministry_of_interior",

    t7n: "为子女办理入学登记",
    t7d: "与当地市政府协调，安排公立学校入学。",
    t7x: "以色列的公共教育从3岁到高中阶段是免费且强制性的。为孩子办理入学需前往您所在城市的 Iriya（市政府），携带：孩子的 Teudat Oleh、Teudat Zehut 或护照，以及住址证明。有些学校设有专门针对新移民子女的项目，帮助他们更好地融入希伯来语环境。许多市政府都设有讲英语等多种语言的安置协调员。",
    t7v: "https://www.youtube.com/results?search_query=enroll+children+school+israel+aliyah",
    t7g: "https://edu.gov.il/en",

    t8n: "申请 Sal Klita（安置补助）",
    t8d: "国家每月发放的经济安置补助金。",
    t8x: "Sal Klita（安置补助）是以色列国家在新移民第一年提供的主要经济支持，包括机场发放的初始款项，以及之后存入您以色列银行账户的6笔月付款。金额根据婚姻状况和子女数量而有所不同。要激活此补助，您需在 Misrad Haklita 登记并绑定银行账户。请务必不要错过申请期限！",
    t8v: "https://www.youtube.com/results?search_query=sal+klita+absorption+basket+israel+explained",
    t8g: "https://www.gov.il/en/departments/guides/sal_klita",

    t9n: "在 Misrad Haklita 登记",
    t9d: "阿利亚与融入部，用于激活学习和住房援助项目。",
    t9x: "Misrad Haklita（阿利亚与融入部）是服务新移民的核心机构。登记后您将获得：Ulpan 代金券（免费希伯来语课程）、额外经济援助、住房代金券以及一般性指导。该部门在以色列各大城市都设有办事处，许多工作人员会讲英语。这是您安顿下来后应尽早办理的手续之一。",
    t9v: "https://www.youtube.com/results?search_query=misrad+haklita+register+benefits+english",
    t9g: "https://www.gov.il/en/departments/ministry_of_aliyah_and_integration",

    t10n: "报名参加 Ulpan（希伯来语课程）",
    t10d: "官方提供的免费强化希伯来语课程代金券。",
    t10x: "Ulpan 是以色列为所有新移民免费提供的强化现代希伯来语课程，通常在周日至周四的上午上课，为期5个月。全国各地都设有 Ulpan。您可以选择政府、市立或私立（有补贴）Ulpan。代金券在 Misrad Haklita 领取，必须在阿利亚后的18个月内使用。希伯来语是融入以色列社会的关键！",
    t10v: "https://www.youtube.com/results?search_query=ulpan+hebrew+course+israel+free+olim",
    t10g: "https://www.gov.il/en/service/ulpan-for-new-immigrants",

    t11n: "申请学历/资格认证",
    t11d: "根据您的职业向相应的政府机构申请认证。",
    t11x: "如果您拥有本国的大学或专科学位，并希望在以色列从事相关职业，您必须向相应机构申请资格认证。医生需向卫生部（Misrad Habriut）申请，律师需向律师协会（Lishkat Orche Hadin）申请，工程师或建筑师则需向相关部门申请。此过程可能需要数月，并可能包含考试或实习。建议您尽早了解您所在职业的具体要求。",
    t11v: "https://www.youtube.com/results?search_query=professional+degree+recognition+israel+english",
    t11g: "https://www.gov.il/en/departments/guides/recognition-of-professional-qualifications",

    t12n: "办理以色列驾照",
    t12d: "在 Misrad Harishui 办理外国驾照换领手续。",
    t12x: "作为新移民，如果您的驾照已有至少2年历史，您可以无需参加笔试或路考，直接将外国驾照换成以色列驾照。此手续在交通部（Misrad Harishui）办理，需要：您的原始驾照、Teudat Oleh、Teudat Zehut、基础体检以及缴纳手续费。此优惠有时间限制：必须在阿利亚后的前3年内完成。",
    t12v: "https://www.youtube.com/results?search_query=convert+driving+license+israel+english+olim",
    t12g: "https://www.gov.il/en/service/converting-foreign-driving-license",

    t13n: "在就业服务处登记",
    t13d: "在 Lishkat Taasuka 登记以获取就业机会。",
    t13x: "Lishkat Taasuka（就业办公室）是以色列连接求职者与雇主的政府机构。登记后您可以获得工作信息、补贴培训课程，某些情况下还能在求职期间获得经济援助。您还可以参加专为新移民举办的招聘会。该服务在主要城市均可使用，并提供多语言的在线资源。",
    t13v: "https://www.youtube.com/results?search_query=lishkat+taasuka+employment+service+israel+english",
    t13g: "https://www.gov.il/en/departments/the_employment_service",

    t14n: "在当地市政府登记",
    t14d: "办理市政税（Arnona）及居民登记。",
    t14x: "以色列每个城市都有自己的市政府（Iriya），您需要在此登记为居民。登记后您可以：申请 Arnona（市政房产税）减免、使用市政服务、为子女办理学校和幼儿园入学，以及接收官方通知。许多市政府都设有专门的安置部门，配有讲英语的工作人员协助新移民。",
    t14v: "https://www.youtube.com/results?search_query=iriya+municipality+israel+register+olim+english",
    t14g: "https://www.gov.il/en/departments/ministry_of_interior",

    t15n: "开立储蓄基金（Kupa Gemel）",
    t15d: "专为新移民提供税收优惠的养老储蓄计划。",
    t15x: "Kupa Gemel（קופת גמל）是一种养老或综合储蓄基金，在以色列享有重要的税收优惠。作为新移民，您在最初几年内还可享受收益免税等额外福利。基金种类包括养老金（Pensia）、综合投资或特定目标储蓄。可在任何银行或持牌金融机构开立。这是一项重要的财务决策，建议咨询专业理财顾问。",
    t15v: "https://www.youtube.com/results?search_query=kupa+gemel+israel+olim+savings+english",
    t15g: "https://www.gov.il/en/departments/ministry_of_finance"
  },
  hi: {
    phase1Title: "चरण 1 – आगमन पर आवश्यक दस्तावेज़",
    phase2Title: "चरण 2 – स्वास्थ्य और निवास",
    phase3Title: "चरण 3 – सरकारी लाभ और सहायता",
    phase4Title: "चरण 4 – काम और लाइसेंस",
    phase5Title: "चरण 5 – एकीकरण और वैकल्पिक कदम",

    t1n: "Teudat Oleh प्राप्त करें",
    t1d: "हवाई अड्डे या अलिया मंत्रालय द्वारा जारी आधिकारिक अप्रवासी दस्तावेज़।",
    t1x: "Teudat Oleh वह पहला दस्तावेज़ है जो आपको इज़राइल में नए अप्रवासी के रूप में मिलता है। यह बेन गुरियन हवाई अड्डे पर यहूदी एजेंसी (Sochnut) या अलिया मंत्रालय द्वारा दिया जाता है, या उड़ान से पहले किसी वाणिज्य दूतावास कार्यालय में। यह दस्तावेज़ आपकी नए ओले की स्थिति प्रमाणित करता है और आपको Sal Klita, Ulpan, कर छूट जैसी सभी राज्य सुविधाओं तक पहुंच देता है। इसे हमेशा सुरक्षित स्थान पर रखें!",
    t1v: "https://www.youtube.com/results?search_query=teudat+oleh+aliyah+explained",
    t1g: "https://www.gov.il/en/departments/ministry_of_aliyah_and_integration",

    t2n: "इज़राइली बैंक खाता खोलें",
    t2d: "Sal Klita भुगतान प्राप्त करने के लिए आवश्यक। सुझाए गए बैंक: Hapoalim या Leumi।",
    t2x: "अपने मासिक Sal Klita भुगतान प्राप्त करने के लिए आपको एक इज़राइली बैंक खाते की आवश्यकता है। ओलिम के बीच सबसे लोकप्रिय बैंक Bank Hapoalim और Bank Leumi हैं। खाता खोलने के लिए आपको चाहिए: आपका Teudat Oleh, एक पहचान दस्तावेज़ (पासपोर्ट या अस्थायी Teudat Zehut), और कभी-कभी पते का प्रमाण। कई बैंकों में अंग्रेज़ी या हिंदी बोलने वाले कर्मचारी होते हैं और नए ओलिम के लिए विशेष सहायता उपलब्ध है।",
    t2v: "https://www.youtube.com/results?search_query=open+bank+account+israel+new+olim",
    t2g: "https://www.bankofisrael.org.il/en/",

    t3n: "Teudat Zehut प्राप्त करें",
    t3d: "Misrad Hapnim में जारी आपका इज़राइली राष्ट्रीय पहचान पत्र।",
    t3x: "Teudat Zehut आपका इज़राइली राष्ट्रीय पहचान पत्र है। यह Misrad Hapnim (आंतरिक मंत्रालय) में संसाधित होता है। हवाई अड्डे पर आपको एक अस्थायी दस्तावेज़ मिलता है, लेकिन स्थायी Teudat Zehut प्राप्त करने के लिए आपको पहले कुछ दिनों के भीतर Misrad Hapnim कार्यालय जाना होगा। लंबी प्रतीक्षा से बचने के लिए MyVisit ऐप या आधिकारिक वेबसाइट के माध्यम से पहले से अपॉइंटमेंट बुक करने की सलाह दी जाती है। यह दस्तावेज़ लगभग सभी अन्य प्रक्रियाओं के लिए आवश्यक है।",
    t3v: "https://www.youtube.com/results?search_query=teudat+zehut+misrad+hapnim+aliyah+english",
    t3g: "https://www.gov.il/en/departments/ministry_of_interior",

    t4n: "Bituach Leumi में पंजीकरण करें",
    t4d: "राष्ट्रीय बीमा। तत्काल स्वास्थ्य सुरक्षा के लिए आवश्यक।",
    t4x: "Bituach Leumi इज़राइल की राष्ट्रीय बीमा संस्था है (सामाजिक सुरक्षा के समान)। पंजीकरण करने से आप Kupat Holim (स्वास्थ्य निधि) चुनने का अधिकार सक्रिय करते हैं, कार्यस्थल दुर्घटनाओं के लिए कवरेज पाते हैं, और भविष्य के लाभों के लिए योग्य बनते हैं। नए ओले के रूप में आपको शुरुआती महीनों में भुगतान से छूट मिलती है। आप ऑनलाइन या किसी भी Bituach Leumi शाखा में अपना Teudat Oleh और Teudat Zehut दिखाकर पंजीकरण कर सकते हैं।",
    t4v: "https://www.youtube.com/results?search_query=bituach+leumi+registration+new+olim+english",
    t4g: "https://www.btl.gov.il/English%20Homepage/Pages/default.aspx",

    t5n: "Kupat Holim चुनें",
    t5d: "एक स्वास्थ्य निधि प्रदाता में पंजीकरण करें (Clalit, Maccabi, Meuhedet या Leumit)।",
    t5x: "इज़राइल की अनिवार्य सार्वजनिक स्वास्थ्य प्रणाली 4 प्रदाताओं पर आधारित है, जिन्हें Kupot Holim कहा जाता है: Clalit (सबसे बड़ी, व्यापक कवरेज), Maccabi (अंग्रेज़ी और हिंदी भाषियों में बहुत लोकप्रिय), Meuhedet और Leumit। नए ओले के रूप में आपको शुरुआती महीनों में मासिक शुल्क से छूट मिलती है। आप साल में एक बार अपनी Kupat Holim बदल सकते हैं। प्रत्येक का अपना डॉक्टरों और फार्मेसियों का नेटवर्क होता है।",
    t5v: "https://www.youtube.com/results?search_query=kupat+holim+israel+which+to+choose+english",
    t5g: "https://www.gov.il/en/service/choose_health_fund",

    t6n: "स्थायी पता दर्ज करें",
    t6d: "आधिकारिक सूचनाओं और सरकारी मेल प्राप्त करने के लिए अपना पता अपडेट करें।",
    t6x: "Misrad Hapnim में अपना स्थायी पता दर्ज करना आवश्यक है। सभी दस्तावेज़, Bituach Leumi की सूचनाएं, आपकी नगर पालिका (Iriya) के संचार, और स्कूल प्रणाली सिस्टम में दर्ज पते पर भेजे जाते हैं। इसके अलावा, आप किस शहर में रहते हैं यह तय करता है कि आप किस नगर पालिका को Arnona (नगरपालिका कर) चुकाते हैं और आपके बच्चे किन स्कूलों में दाखिला ले सकते हैं। यह Misrad Hapnim में निवास प्रमाण के साथ किया जाता है।",
    t6v: "https://www.youtube.com/results?search_query=register+address+israel+misrad+hapnim+english",
    t6g: "https://www.gov.il/en/departments/ministry_of_interior",

    t7n: "बच्चों का स्कूल में दाखिला कराएं",
    t7d: "सार्वजनिक स्कूल आवंटन के लिए स्थानीय नगर पालिका के साथ समन्वय।",
    t7x: "इज़राइल में सार्वजनिक शिक्षा 3 साल की उम्र से हाई स्कूल तक मुफ्त और अनिवार्य है। अपने बच्चों का दाखिला कराने के लिए आपको अपने शहर की Iriya (नगर पालिका) में जाना होगा, साथ में: बच्चे का Teudat Oleh, Teudat Zehut या पासपोर्ट, और पते का प्रमाण। कुछ स्कूलों में ओलिम के बच्चों के लिए विशेष कार्यक्रम होते हैं जो हिब्रू में एकीकरण को आसान बनाते हैं। कई नगर पालिकाओं में अंग्रेज़ी या अन्य भाषाएं बोलने वाले समन्वयक होते हैं।",
    t7v: "https://www.youtube.com/results?search_query=enroll+children+school+israel+aliyah",
    t7g: "https://edu.gov.il/en",

    t8n: "Sal Klita के लिए आवेदन करें",
    t8d: "राज्य द्वारा दी जाने वाली मासिक आर्थिक सहायता टोकरी।",
    t8x: "Sal Klita (अवशोषण टोकरी) इज़राइल राज्य द्वारा नए ओलिम को उनके पहले वर्ष में दी जाने वाली मुख्य आर्थिक सहायता है। इसमें हवाई अड्डे पर एक प्रारंभिक भुगतान और उसके बाद आपके इज़राइली बैंक खाते में जमा होने वाले 6 मासिक भुगतान शामिल हैं। राशि वैवाहिक स्थिति और बच्चों की संख्या के अनुसार भिन्न होती है। इसे सक्रिय करने के लिए आपको Misrad Haklita में पंजीकरण करना होगा और अपना बैंक खाता जोड़ना होगा। समय सीमा न चूकें!",
    t8v: "https://www.youtube.com/results?search_query=sal+klita+absorption+basket+israel+explained",
    t8g: "https://www.gov.il/en/departments/guides/sal_klita",

    t9n: "Misrad Haklita में पंजीकरण करें",
    t9d: "अध्ययन और आवास सहायता कार्यक्रमों के लिए अलिया मंत्रालय का सत्यापन।",
    t9x: "Misrad Haklita (अलिया और एकीकरण मंत्रालय) ओलिम के लिए केंद्रीय संस्था है। पंजीकरण करने से आप सक्रिय करते हैं: Ulpan वाउचर (मुफ्त हिब्रू कोर्स), अतिरिक्त आर्थिक सहायता, आवास वाउचर, और सामान्य मार्गदर्शन। उनके सभी प्रमुख इज़राइली शहरों में कार्यालय हैं और कई कर्मचारी अंग्रेज़ी बोलते हैं। बसने के बाद यह आपके सबसे पहले कामों में से एक होना चाहिए।",
    t9v: "https://www.youtube.com/results?search_query=misrad+haklita+register+benefits+english",
    t9g: "https://www.gov.il/en/departments/ministry_of_aliyah_and_integration",

    t10n: "Ulpan में दाखिला लें",
    t10d: "आपका मुफ्त आधिकारिक गहन हिब्रू भाषा कोर्स वाउचर।",
    t10x: "Ulpan गहन आधुनिक हिब्रू कोर्स है जो इज़राइल सभी नए ओलिम को मुफ्त में प्रदान करता है। यह आमतौर पर रविवार से गुरुवार सुबह, 5 महीनों तक चलता है। पूरे देश में Ulpanim उपलब्ध हैं। आप सरकारी, नगरपालिका या निजी (सब्सिडी वाले) Ulpan के बीच चुन सकते हैं। वाउचर Misrad Haklita में प्राप्त होता है और आपकी अलिया के 18 महीनों के भीतर इसका उपयोग करना होता है। हिब्रू एकीकरण की कुंजी है!",
    t10v: "https://www.youtube.com/results?search_query=ulpan+hebrew+course+israel+free+olim",
    t10g: "https://www.gov.il/en/service/ulpan-for-new-immigrants",

    t11n: "योग्यता मान्यता के लिए आवेदन करें",
    t11d: "आपके पेशे के अनुसार संबंधित सरकारी निकायों में मान्यता।",
    t11x: "यदि आपके पास अपने देश से विश्वविद्यालय या कॉलेज की डिग्री है और आप इज़राइल में अपने पेशे का अभ्यास करना चाहते हैं, तो आपको संबंधित निकाय में मान्यता के लिए आवेदन करना होगा। डॉक्टरों के लिए यह Misrad Habriut है, वकीलों के लिए Lishkat Orche Hadin, इंजीनियरों या वास्तुकारों के लिए Misrad Habinui आदि। इस प्रक्रिया में महीनों लग सकते हैं और परीक्षा या इंटर्नशिप शामिल हो सकती है। जितनी जल्दी हो सके अपने पेशे की विशिष्ट आवश्यकताओं पर शोध करें।",
    t11v: "https://www.youtube.com/results?search_query=professional+degree+recognition+israel+english",
    t11g: "https://www.gov.il/en/departments/guides/recognition-of-professional-qualifications",

    t12n: "इज़राइली ड्राइविंग लाइसेंस प्राप्त करें",
    t12d: "Misrad Harishui कार्यालयों में आपके विदेशी ड्राइवर लाइसेंस का रूपांतरण।",
    t12x: "नए ओले के रूप में आप बिना लिखित या व्यावहारिक परीक्षा दिए अपने विदेशी ड्राइविंग लाइसेंस को इज़राइली लाइसेंस से बदल सकते हैं, बशर्ते आपका लाइसेंस कम से कम 2 साल पुराना हो। यह प्रक्रिया Misrad Harishui (परिवहन मंत्रालय) में की जाती है। आपको चाहिए: आपका मूल लाइसेंस, Teudat Oleh, Teudat Zehut, एक बुनियादी मेडिकल जांच, और शुल्क का भुगतान। इस लाभ की एक समय सीमा है: आपको इसे अपनी अलिया के पहले 3 वर्षों के भीतर करना होगा।",
    t12v: "https://www.youtube.com/results?search_query=convert+driving+license+israel+english+olim",
    t12g: "https://www.gov.il/en/service/converting-foreign-driving-license",

    t13n: "रोज़गार सेवा में पंजीकरण करें",
    t13d: "नौकरी के अवसरों के लिए Lishkat Taasuka में पंजीकरण।",
    t13x: "Lishkat Taasuka (रोज़गार कार्यालय) वह सरकारी निकाय है जो इज़राइल में श्रमिकों को नियोक्ताओं से जोड़ता है। पंजीकरण करने से आपको नौकरी बोर्ड, सब्सिडी वाले प्रशिक्षण कोर्स, और कुछ मामलों में नौकरी खोजते समय आर्थिक सहायता तक पहुंच मिलती है। आप ओलिम के लिए विशेष नौकरी मेलों में भी भाग ले सकते हैं। यह सेवा प्रमुख शहरों में उपलब्ध है और कई भाषाओं में ऑनलाइन संसाधन प्रदान करती है।",
    t13v: "https://www.youtube.com/results?search_query=lishkat+taasuka+employment+service+israel+english",
    t13g: "https://www.gov.il/en/departments/the_employment_service",

    t14n: "स्थानीय नगर पालिका में पंजीकरण करें",
    t14d: "शहर कर (Arnona) और निवासी पंजीकरण संभालना।",
    t14x: "इज़राइल के हर शहर की अपनी Iriya (नगर पालिका) होती है जहां आपको निवासी के रूप में पंजीकरण करना होता है। ऐसा करने से आप: Arnona (नगरपालिका संपत्ति कर) पर छूट के लिए आवेदन कर सकते हैं, नगरपालिका सेवाओं तक पहुंच सकते हैं, अपने बच्चों को स्थानीय स्कूलों और किंडरगार्टन में दाखिला दिला सकते हैं, और आधिकारिक संचार प्राप्त कर सकते हैं। कई नगर पालिकाओं में नए ओलिम की सहायता के लिए अंग्रेज़ी बोलने वाले विशेष अवशोषण विभाग होते हैं।",
    t14v: "https://www.youtube.com/results?search_query=iriya+municipality+israel+register+olim+english",
    t14g: "https://www.gov.il/en/departments/ministry_of_interior",

    t15n: "बचत निधि खोलें (Kupa Gemel)",
    t15d: "नए ओलिम जदाशिम के लिए विशेष कर लाभ वाली बचत योजनाएं।",
    t15x: "Kupa Gemel (קופת גמל) एक सेवानिवृत्ति या सामान्य बचत निधि है जो इज़राइल में महत्वपूर्ण कर लाभ प्रदान करती है। नए ओले के रूप में आपको अपने शुरुआती वर्षों के दौरान रिटर्न पर कर छूट जैसे अतिरिक्त लाभ मिलते हैं। कई प्रकार होते हैं: सेवानिवृत्ति (Pensia) के लिए, सामान्य निवेश के लिए, या विशिष्ट लक्ष्यों के लिए। इसे किसी भी बैंक या लाइसेंस प्राप्त वित्तीय संस्थान में खोला जा सकता है। यह एक महत्वपूर्ण वित्तीय निर्णय है, वित्तीय सलाहकार से परामर्श करने पर विचार करें।",
    t15v: "https://www.youtube.com/results?search_query=kupa+gemel+israel+olim+savings+english",
    t15g: "https://www.gov.il/en/departments/ministry_of_finance"
  },
  fr: {
    phase1Title: "Phase 1 – Documents essentiels à l'arrivée",
    phase2Title: "Phase 2 – Santé et résidence",
    phase3Title: "Phase 3 – Aides et avantages gouvernementaux",
    phase4Title: "Phase 4 – Travail et permis",
    phase5Title: "Phase 5 – Intégration et démarches optionnelles",

    t1n: "Recevoir la Teudat Oleh",
    t1d: "Document officiel d'immigrant remis à l'aéroport ou au ministère de l'Alya.",
    t1x: "La Teudat Oleh est le premier document que vous recevez en tant que nouvel immigrant en Israël. Elle est délivrée par l'Agence Juive (Sochnut) ou le ministère de l'Alya à l'aéroport Ben Gourion, ou dans un consulat avant votre départ. Ce document certifie votre statut de nouvel Oleh et vous donne accès à toutes les aides d'absorption de l'État : Sal Klita, Ulpan, exonérations fiscales, et bien plus. Conservez-le toujours en lieu sûr !",
    t1v: "https://www.youtube.com/results?search_query=teudat+oleh+aliyah+explained",
    t1g: "https://www.gov.il/en/departments/ministry_of_aliyah_and_integration",

    t2n: "Ouvrir un compte bancaire israélien",
    t2d: "Requis pour recevoir vos paiements mensuels de la Sal Klita. Banques suggérées : Hapoalim ou Leumi.",
    t2x: "Pour recevoir vos paiements mensuels de Sal Klita, vous avez besoin d'un compte bancaire israélien. Les banques les plus populaires parmi les Olim sont Bank Hapoalim et Bank Leumi. Pour ouvrir un compte, il vous faut : votre Teudat Oleh, une pièce d'identité (passeport ou Teudat Zehut temporaire), et parfois un justificatif de domicile. De nombreuses banques ont du personnel parlant anglais ou français et proposent une assistance spéciale pour les nouveaux Olim.",
    t2v: "https://www.youtube.com/results?search_query=open+bank+account+israel+new+olim",
    t2g: "https://www.bankofisrael.org.il/en/",

    t3n: "Obtenir la Teudat Zehut",
    t3d: "Votre carte d'identité nationale israélienne, traitée au Misrad Hapnim.",
    t3x: "La Teudat Zehut est votre carte d'identité nationale israélienne, délivrée au Misrad Hapnim (ministère de l'Intérieur). À l'aéroport, vous recevez un document temporaire, mais vous devez vous rendre dans un bureau du Misrad Hapnim dans les premiers jours pour obtenir votre Teudat Zehut définitive. Nous recommandons de prendre rendez-vous à l'avance via l'application MyVisit ou le site officiel pour éviter de longues attentes. Ce document est nécessaire pour presque toutes les autres démarches.",
    t3v: "https://www.youtube.com/results?search_query=teudat+zehut+misrad+hapnim+aliyah+english",
    t3g: "https://www.gov.il/en/departments/ministry_of_interior",

    t4n: "S'inscrire au Bituach Leumi",
    t4d: "Assurance nationale. Essentielle pour votre couverture médicale immédiate.",
    t4x: "Le Bituach Leumi est l'Institut national d'assurance d'Israël (équivalent de la Sécurité sociale). En vous inscrivant, vous activez votre droit de choisir une Kupat Holim (caisse de santé), obtenez une couverture en cas d'accident du travail, et devenez éligible à de futures prestations. En tant que nouvel Oleh, vous êtes exonéré de paiement durant vos premiers mois. Vous pouvez vous inscrire en ligne ou dans n'importe quelle agence du Bituach Leumi en présentant votre Teudat Oleh et Teudat Zehut.",
    t4v: "https://www.youtube.com/results?search_query=bituach+leumi+registration+new+olim+english",
    t4g: "https://www.btl.gov.il/English%20Homepage/Pages/default.aspx",

    t5n: "Choisir une Kupat Holim",
    t5d: "Inscrivez-vous auprès d'une caisse de santé (Clalit, Maccabi, Meuhedet ou Leumit).",
    t5x: "Israël dispose d'un système de santé public obligatoire réparti entre 4 caisses appelées Kupot Holim : Clalit (la plus grande, couverture large), Maccabi (très populaire parmi les anglophones et francophones), Meuhedet et Leumit. En tant que nouvel Oleh, vous êtes exonéré de la cotisation mensuelle durant vos premiers mois. Vous pouvez changer de Kupat Holim une fois par an. Chacune dispose de son propre réseau de médecins et de pharmacies.",
    t5v: "https://www.youtube.com/results?search_query=kupat+holim+israel+which+to+choose+english",
    t5g: "https://www.gov.il/en/service/choose_health_fund",

    t6n: "Enregistrer votre adresse permanente",
    t6d: "Mettez à jour votre adresse officielle pour recevoir notifications et courriers gouvernementaux.",
    t6x: "Enregistrer votre adresse fixe au Misrad Hapnim est essentiel. Tous les documents, notifications du Bituach Leumi, communications de votre municipalité (Iriya) et le système scolaire sont envoyés à l'adresse enregistrée dans le système. De plus, la ville où vous vivez détermine à quelle municipalité vous payez l'Arnona (taxe municipale) et dans quelles écoles vos enfants peuvent être inscrits. Cette démarche se fait au Misrad Hapnim avec un justificatif de domicile.",
    t6v: "https://www.youtube.com/results?search_query=register+address+israel+misrad+hapnim+english",
    t6g: "https://www.gov.il/en/departments/ministry_of_interior",

    t7n: "Inscrire les enfants à l'école",
    t7d: "Coordination avec la municipalité locale pour l'affectation en école publique.",
    t7x: "L'éducation publique en Israël est gratuite et obligatoire de 3 ans jusqu'au lycée. Pour inscrire vos enfants, rendez-vous à l'Iriya (municipalité) de votre ville avec : la Teudat Oleh de l'enfant, sa Teudat Zehut ou passeport, et un justificatif de domicile. Certaines écoles proposent des programmes spéciaux pour les enfants d'Olim afin de faciliter leur intégration en hébreu. Beaucoup de municipalités ont des coordinateurs d'absorption parlant anglais ou d'autres langues.",
    t7v: "https://www.youtube.com/results?search_query=enroll+children+school+israel+aliyah",
    t7g: "https://edu.gov.il/en",

    t8n: "Demander la Sal Klita",
    t8d: "Le panier d'aide financière de l'État versé mensuellement.",
    t8x: "La Sal Klita (panier d'absorption) est le principal soutien financier accordé par l'État d'Israël aux nouveaux Olim durant leur première année. Elle se compose d'un versement initial à l'aéroport, suivi de 6 versements mensuels sur votre compte bancaire israélien. Le montant varie selon votre situation familiale et le nombre d'enfants. Pour l'activer, vous devez vous inscrire au Misrad Haklita et lier votre compte bancaire. Ne manquez pas le délai !",
    t8v: "https://www.youtube.com/results?search_query=sal+klita+absorption+basket+israel+explained",
    t8g: "https://www.gov.il/en/departments/guides/sal_klita",

    t9n: "S'inscrire au Misrad Haklita",
    t9d: "Ministère de l'Alya pour activer les bons d'études et de logement.",
    t9x: "Le Misrad Haklita (ministère de l'Alya et de l'Intégration) est l'institution centrale pour les Olim. En vous inscrivant, vous activez : le bon Ulpan (cours d'hébreu gratuit), une aide financière supplémentaire, des bons de logement, et une orientation générale. Ils ont des bureaux dans toutes les grandes villes israéliennes et beaucoup de personnel parle anglais. C'est l'une des premières démarches à faire dès votre installation.",
    t9v: "https://www.youtube.com/results?search_query=misrad+haklita+register+benefits+english",
    t9g: "https://www.gov.il/en/departments/ministry_of_aliyah_and_integration",

    t10n: "S'inscrire à l'Ulpan",
    t10d: "Votre bon officiel et gratuit pour un cours intensif d'hébreu.",
    t10x: "L'Ulpan est le cours intensif d'hébreu moderne qu'Israël offre gratuitement à tous les nouveaux Olim. Il a généralement lieu le matin, du dimanche au jeudi, pendant 5 mois. Il existe des Ulpanim partout dans le pays. Vous pouvez choisir entre un Ulpan gouvernemental, municipal ou privé (subventionné). Le bon s'obtient au Misrad Haklita et doit être utilisé dans les 18 mois suivant votre Alya. L'hébreu est la clé de l'intégration !",
    t10v: "https://www.youtube.com/results?search_query=ulpan+hebrew+course+israel+free+olim",
    t10g: "https://www.gov.il/en/service/ulpan-for-new-immigrants",

    t11n: "Demander la reconnaissance de diplôme",
    t11d: "Validation de votre diplôme professionnel auprès des organismes correspondants.",
    t11x: "Si vous avez un diplôme universitaire de votre pays d'origine et souhaitez exercer votre profession en Israël, vous devez demander sa reconnaissance auprès de l'organisme compétent. Pour les médecins, c'est le Misrad Habriut, pour les avocats le Lishkat Orche Hadin, pour les ingénieurs ou architectes le Misrad Habinui, etc. Le processus peut prendre des mois et inclure des examens ou stages. Renseignez-vous le plus tôt possible sur les exigences spécifiques de votre profession.",
    t11v: "https://www.youtube.com/results?search_query=professional+degree+recognition+israel+english",
    t11g: "https://www.gov.il/en/departments/guides/recognition-of-professional-qualifications",

    t12n: "Obtenir le permis de conduire israélien",
    t12d: "Conversion officielle de votre permis étranger au Misrad Harishui.",
    t12x: "En tant que nouvel Oleh, vous avez le droit d'échanger votre permis de conduire étranger contre un permis israélien sans passer l'examen théorique ni pratique, à condition que votre permis ait au moins 2 ans. La démarche se fait au Misrad Harishui (ministère des Transports). Il vous faut : votre permis original, votre Teudat Oleh, votre Teudat Zehut, un examen médical de base et le paiement d'une taxe. Cet avantage a une limite de temps : vous devez le faire dans vos 3 premières années d'Alya.",
    t12v: "https://www.youtube.com/results?search_query=convert+driving+license+israel+english+olim",
    t12g: "https://www.gov.il/en/service/converting-foreign-driving-license",

    t13n: "S'inscrire au Service de l'emploi",
    t13d: "Inscription au Lishkat Taasuka pour accéder aux offres d'emploi.",
    t13x: "Le Lishkat Taasuka (bureau de l'emploi) est l'organisme public qui met en relation travailleurs et employeurs en Israël. En vous inscrivant, vous avez accès à des offres d'emploi, des formations subventionnées, et parfois à une aide financière pendant votre recherche d'emploi. Vous pouvez aussi accéder à des salons de l'emploi spéciaux pour les Olim. Le service est disponible dans les grandes villes et propose des ressources en ligne en plusieurs langues.",
    t13v: "https://www.youtube.com/results?search_query=lishkat+taasuka+employment+service+israel+english",
    t13g: "https://www.gov.il/en/departments/the_employment_service",

    t14n: "S'inscrire à la municipalité locale",
    t14d: "Gestion des taxes municipales (Arnona) et enregistrement de résident.",
    t14x: "Chaque ville en Israël a son Iriya (municipalité) où vous devez vous inscrire comme résident. Cela vous permet : d'obtenir des remises sur l'Arnona (taxe foncière municipale), d'accéder aux services municipaux, d'inscrire vos enfants dans les écoles et jardins d'enfants locaux, et de recevoir les communications officielles. De nombreuses Iriyot disposent de départements d'absorption spéciaux avec du personnel parlant anglais pour aider les nouveaux Olim.",
    t14v: "https://www.youtube.com/results?search_query=iriya+municipality+israel+register+olim+english",
    t14g: "https://www.gov.il/en/departments/ministry_of_interior",

    t15n: "Ouvrir un fonds d'épargne (Kupa Gemel)",
    t15d: "Fonds de prévoyance avec avantages fiscaux exclusifs pour les nouveaux Olim.",
    t15x: "Le Kupa Gemel (קופת גמל) est un fonds d'épargne retraite ou général offrant d'importants avantages fiscaux en Israël. En tant que nouvel Oleh, vous bénéficiez d'avantages supplémentaires comme des exonérations fiscales sur les rendements durant vos premières années. Il existe plusieurs types : retraite (Pensia), investissement général, ou objectifs spécifiques. Il peut être ouvert dans n'importe quelle banque ou institution financière agréée. C'est une décision financière importante, envisagez de consulter un conseiller.",
    t15v: "https://www.youtube.com/results?search_query=kupa+gemel+israel+olim+savings+english",
    t15g: "https://www.gov.il/en/departments/ministry_of_finance"
  },
  ar: {
    phase1Title: "المرحلة 1 – الوثائق الأساسية عند الوصول",
    phase2Title: "المرحلة 2 – الصحة والإقامة",
    phase3Title: "المرحلة 3 – المزايا والمساعدات الحكومية",
    phase4Title: "المرحلة 4 – العمل والتراخيص",
    phase5Title: "المرحلة 5 – الاندماج وخطوات اختيارية",

    t1n: "استلام Teudat Oleh",
    t1d: "الوثيقة الرسمية للمهاجر التي تُمنح في المطار أو وزارة العالياه.",
    t1x: "Teudat Oleh هي أول وثيقة تحصل عليها كمهاجر جديد إلى إسرائيل. تُمنح من قبل الوكالة اليهودية (Sochnut) أو وزارة العالياه في مطار بن غوريون عند الوصول، أو في مكتب قنصلي قبل السفر. تثبت هذه الوثيقة وضعك كعولה جديد وتمنحك حق الوصول إلى جميع مزايا الاستيعاب: Sal Klita وUlpan والإعفاءات الضريبية وغيرها. احتفظ بها دائمًا في مكان آمن!",
    t1v: "https://www.youtube.com/results?search_query=teudat+oleh+aliyah+explained",
    t1g: "https://www.gov.il/en/departments/ministry_of_aliyah_and_integration",

    t2n: "فتح حساب بنكي إسرائيلي",
    t2d: "مطلوب لاستلام دفعات Sal Klita الشهرية. البنوك المقترحة: Hapoalim أو Leumi.",
    t2x: "لاستلام دفعات Sal Klita الشهرية، تحتاج إلى حساب بنكي إسرائيلي. أكثر البنوك شيوعًا بين العولين هي Bank Hapoalim وBank Leumi. لفتح الحساب تحتاج إلى: Teudat Oleh الخاصة بك، وثيقة هوية (جواز سفر أو Teudat Zehut مؤقتة)، وأحيانًا إثبات عنوان. تضم العديد من البنوك موظفين يتحدثون الإنجليزية أو العربية ويقدمون مساعدة خاصة للعولين الجدد.",
    t2v: "https://www.youtube.com/results?search_query=open+bank+account+israel+new+olim",
    t2g: "https://www.bankofisrael.org.il/en/",

    t3n: "الحصول على Teudat Zehut",
    t3d: "بطاقة الهوية الوطنية الإسرائيلية الخاصة بك، تُصدر في Misrad Hapnim.",
    t3x: "Teudat Zehut هي بطاقة الهوية الوطنية الإسرائيلية. تتم معالجتها في Misrad Hapnim (وزارة الداخلية). في المطار تحصل على وثيقة مؤقتة، لكن يجب عليك زيارة مكتب Misrad Hapnim خلال الأيام الأولى للحصول على Teudat Zehut الدائمة. نوصي بحجز موعد مسبق عبر تطبيق MyVisit أو الموقع الرسمي لتجنب الانتظار الطويل. هذه الوثيقة مطلوبة لمعظم الإجراءات الأخرى.",
    t3v: "https://www.youtube.com/results?search_query=teudat+zehut+misrad+hapnim+aliyah+english",
    t3g: "https://www.gov.il/en/departments/ministry_of_interior",

    t4n: "التسجيل في Bituach Leumi",
    t4d: "التأمين الوطني. أساسي للحصول على تغطية صحية فورية.",
    t4x: "Bituach Leumi هو معهد التأمين الوطني في إسرائيل (يشبه الضمان الاجتماعي). بالتسجيل، تُفعّل حقك في اختيار Kupat Holim (صندوق صحي)، وتحصل على تغطية لحوادث العمل، وتصبح مؤهلاً للمزايا المستقبلية. كعولה جديد، أنت معفى من الدفع خلال الأشهر الأولى. يمكنك التسجيل عبر الإنترنت أو في أي فرع لـ Bituach Leumi بتقديم Teudat Oleh وTeudat Zehut.",
    t4v: "https://www.youtube.com/results?search_query=bituach+leumi+registration+new+olim+english",
    t4g: "https://www.btl.gov.il/English%20Homepage/Pages/default.aspx",

    t5n: "اختيار Kupat Holim",
    t5d: "التسجيل في أحد صناديق الصحة (Clalit أو Maccabi أو Meuhedet أو Leumit).",
    t5x: "تمتلك إسرائيل نظامًا صحيًا عامًا إلزاميًا يعتمد على 4 مزودين يُطلق عليهم Kupot Holim: Clalit (الأكبر وتغطيته واسعة)، Maccabi (شعبي جدًا بين متحدثي الإنجليزية والعربية)، Meuhedet وLeumit. كعولה جديد، أنت معفى من الرسوم الشهرية خلال الأشهر الأولى. يمكنك تغيير Kupat Holim مرة واحدة في السنة. لكل صندوق شبكته الخاصة من الأطباء والصيدليات.",
    t5v: "https://www.youtube.com/results?search_query=kupat+holim+israel+which+to+choose+english",
    t5g: "https://www.gov.il/en/service/choose_health_fund",

    t6n: "تسجيل العنوان الدائم",
    t6d: "تحديث عنوانك الرسمي لتلقي الإشعارات والمراسلات الحكومية.",
    t6x: "تسجيل عنوانك الثابت في Misrad Hapnim أمر أساسي. تُرسل جميع الوثائق وإشعارات Bituach Leumi ومراسلات البلدية (Iriya) ونظام المدارس إلى العنوان المسجل في النظام. كما أن المدينة التي تعيش فيها تحدد البلدية التي تدفع لها Arnona (الضريبة البلدية) والمدارس التي يمكن لأطفالك الالتحاق بها. يتم ذلك في Misrad Hapnim مع إثبات السكن.",
    t6v: "https://www.youtube.com/results?search_query=register+address+israel+misrad+hapnim+english",
    t6g: "https://www.gov.il/en/departments/ministry_of_interior",

    t7n: "تسجيل الأطفال في المدرسة",
    t7d: "التنسيق مع البلدية المحلية لتوزيع المدارس الحكومية.",
    t7x: "التعليم العام في إسرائيل مجاني وإلزامي من سن 3 سنوات وحتى الثانوية. لتسجيل أطفالك، توجه إلى Iriya (البلدية) في مدينتك مع: Teudat Oleh الخاصة بالطفل، وTeudat Zehut أو جواز السفر، وإثبات العنوان. توجد مدارس ببرامج خاصة لأطفال العولين لتسهيل اندماجهم في اللغة العبرية. تمتلك العديد من البلديات منسقي استيعاب يتحدثون الإنجليزية أو لغات أخرى.",
    t7v: "https://www.youtube.com/results?search_query=enroll+children+school+israel+aliyah",
    t7g: "https://edu.gov.il/en",

    t8n: "طلب Sal Klita",
    t8d: "سلة المساعدة المالية الحكومية التي تُودع شهريًا.",
    t8x: "Sal Klita (سلة الاستيعاب) هي الدعم المالي الرئيسي الذي تقدمه دولة إسرائيل للعولين الجدد خلال سنتهم الأولى. تتكون من دفعة أولية في المطار تليها 6 دفعات شهرية تُودع في حسابك البنكي الإسرائيلي. يختلف المبلغ حسب الحالة الاجتماعية وعدد الأطفال. لتفعيلها يجب التسجيل في Misrad Haklita وربط حسابك البنكي. لا تفوّت الموعد النهائي!",
    t8v: "https://www.youtube.com/results?search_query=sal+klita+absorption+basket+israel+explained",
    t8g: "https://www.gov.il/en/departments/guides/sal_klita",

    t9n: "التسجيل في Misrad Haklita",
    t9d: "وزارة العالياه لتفعيل قسائم المساعدة الدراسية والسكنية.",
    t9x: "Misrad Haklita (وزارة العالياه والاندماج) هي المؤسسة المركزية للعولين. بالتسجيل تُفعّل: قسيمة Ulpan (دورة عبرية مجانية)، ومساعدة مالية إضافية، وقسائم سكنية، وتوجيهًا عامًا. لديهم مكاتب في جميع المدن الإسرائيلية الكبرى ويتحدث الكثير من الموظفين الإنجليزية. هذا من أوائل الإجراءات التي يجب القيام بها بمجرد استقرارك.",
    t9v: "https://www.youtube.com/results?search_query=misrad+haklita+register+benefits+english",
    t9g: "https://www.gov.il/en/departments/ministry_of_aliyah_and_integration",

    t10n: "التسجيل في Ulpan",
    t10d: "قسيمتك المجانية الرسمية لدورة اللغة العبرية المكثفة.",
    t10x: "Ulpan هو دورة العبرية الحديثة المكثفة التي تقدمها إسرائيل مجانًا لجميع العولين الجدد. تُقام عادة صباحًا من الأحد إلى الخميس لمدة 5 أشهر. توجد Ulpanim في جميع أنحاء البلاد. يمكنك الاختيار بين Ulpan حكومي أو بلدي أو خاص (مدعوم). تُستلم القسيمة من Misrad Haklita ويجب استخدامها خلال 18 شهرًا من عاليتك. العبرية هي مفتاح الاندماج!",
    t10v: "https://www.youtube.com/results?search_query=ulpan+hebrew+course+israel+free+olim",
    t10g: "https://www.gov.il/en/service/ulpan-for-new-immigrants",

    t11n: "طلب الاعتراف بالمؤهلات",
    t11d: "التحقق من الشهادة المهنية لدى الجهات الحكومية المعنية.",
    t11x: "إذا كنت تحمل شهادة جامعية من بلدك الأصلي وترغب في ممارسة مهنتك في إسرائيل، عليك تقديم طلب اعتراف لدى الجهة المختصة. للأطباء Misrad Habriut، وللمحامين Lishkat Orche Hadin، وللمهندسين أو المعماريين Misrad Habinui، وهكذا. قد تستغرق العملية شهورًا وقد تشمل امتحانات أو تدريبًا. نوصي بالبحث عن المتطلبات المحددة لمهنتك في أقرب وقت ممكن.",
    t11v: "https://www.youtube.com/results?search_query=professional+degree+recognition+israel+english",
    t11g: "https://www.gov.il/en/departments/guides/recognition-of-professional-qualifications",

    t12n: "الحصول على رخصة قيادة إسرائيلية",
    t12d: "استبدال رخصتك الأجنبية رسميًا في مكاتب Misrad Harishui.",
    t12x: "كعولה جديد، يحق لك استبدال رخصة القيادة الأجنبية برخصة إسرائيلية دون الحاجة لأداء الامتحان النظري أو العملي، شرط أن يكون عمر رخصتك سنتين على الأقل. يتم الإجراء في Misrad Harishui (وزارة النقل). تحتاج إلى: رخصتك الأصلية، وTeudat Oleh، وTeudat Zehut، وفحص طبي أساسي، ودفع رسوم. لهذه الميزة مهلة زمنية: يجب القيام بها خلال أول 3 سنوات من عاليتك.",
    t12v: "https://www.youtube.com/results?search_query=convert+driving+license+israel+english+olim",
    t12g: "https://www.gov.il/en/service/converting-foreign-driving-license",

    t13n: "التسجيل في خدمة التوظيف",
    t13d: "التسجيل في Lishkat Taasuka للوصول إلى فرص العمل.",
    t13x: "Lishkat Taasuka (مكتب التوظيف) هو الجهة الحكومية التي تربط العمال بأصحاب العمل في إسرائيل. بالتسجيل تحصل على إمكانية الوصول إلى لوحات الوظائف ودورات تدريبية مدعومة، وفي بعض الحالات مساعدة مالية أثناء البحث عن عمل. يمكنك أيضًا حضور معارض توظيف خاصة بالعولين. الخدمة متوفرة في المدن الرئيسية وتقدم موارد عبر الإنترنت بعدة لغات.",
    t13v: "https://www.youtube.com/results?search_query=lishkat+taasuka+employment+service+israel+english",
    t13g: "https://www.gov.il/en/departments/the_employment_service",

    t14n: "التسجيل في البلدية المحلية",
    t14d: "التعامل مع ضرائب المدينة (Arnona) ومزايا التسجيل.",
    t14x: "لكل مدينة في إسرائيل Iriya (بلدية) خاصة بها يجب أن تسجل فيها كمقيم. بالقيام بذلك يمكنك: طلب خصومات على Arnona (ضريبة الأملاك البلدية)، والوصول إلى الخدمات البلدية، وتسجيل أطفالك في المدارس ورياض الأطفال المحلية، واستلام المراسلات الرسمية. تمتلك العديد من البلديات أقسام استيعاب خاصة بموظفين يتحدثون الإنجليزية لمساعدة العولين حديثي الوصول.",
    t14v: "https://www.youtube.com/results?search_query=iriya+municipality+israel+register+olim+english",
    t14g: "https://www.gov.il/en/departments/ministry_of_interior",

    t15n: "فتح صندوق ادخار (Kupa Gemel)",
    t15d: "مسارات ادخار بمزايا ضريبية حصرية للعولين الجدد.",
    t15x: "Kupa Gemel (קופת גמל) هو صندوق ادخار للتقاعد أو لأغراض عامة يقدم مزايا ضريبية مهمة في إسرائيل. كعولה جديد، تحصل على مزايا إضافية مثل الإعفاءات الضريبية على العوائد خلال سنواتك الأولى. توجد عدة أنواع: للتقاعد (Pensia)، للاستثمار العام، أو لأهداف محددة. يمكن فتحه في أي بنك أو مؤسسة مالية مرخصة. هذا قرار مالي مهم، ننصح باستشارة مستشار مالي.",
    t15v: "https://www.youtube.com/results?search_query=kupa+gemel+israel+olim+savings+english",
    t15g: "https://www.gov.il/en/departments/ministry_of_finance"
  },
  bn: {
    phase1Title: "ধাপ ১ – আগমনের সময় প্রয়োজনীয় নথিপত্র",
    phase2Title: "ধাপ ২ – স্বাস্থ্য ও বসবাস",
    phase3Title: "ধাপ ৩ – সরকারি সুবিধা ও সহায়তা",
    phase4Title: "ধাপ ৪ – কাজ ও লাইসেন্স",
    phase5Title: "ধাপ ৫ – একীকরণ ও ঐচ্ছিক পদক্ষেপ",

    t1n: "Teudat Oleh গ্রহণ করুন",
    t1d: "বিমানবন্দর বা আলিয়া মন্ত্রণালয়ে প্রদত্ত অফিসিয়াল অভিবাসী নথি।",
    t1x: "Teudat Oleh হলো ইসরায়েলে নতুন অভিবাসী হিসেবে আপনার প্রথম প্রাপ্ত নথি। এটি বেন গুরিয়ন বিমানবন্দরে জিউয়িশ এজেন্সি (Sochnut) বা আলিয়া মন্ত্রণালয় দ্বারা প্রদান করা হয়, অথবা যাত্রার আগে কোনো কনস্যুলার অফিসে। এই নথি আপনার নতুন ওলে মর্যাদা প্রমাণ করে এবং Sal Klita, Ulpan, কর ছাড়সহ রাষ্ট্রের সব শোষণ সুবিধায় প্রবেশাধিকার দেয়। এটি সবসময় নিরাপদ স্থানে রাখুন!",
    t1v: "https://www.youtube.com/results?search_query=teudat+oleh+aliyah+explained",
    t1g: "https://www.gov.il/en/departments/ministry_of_aliyah_and_integration",

    t2n: "ইসরায়েলি ব্যাংক অ্যাকাউন্ট খুলুন",
    t2d: "Sal Klita পেমেন্ট পাওয়ার জন্য প্রয়োজনীয়। প্রস্তাবিত ব্যাংক: Hapoalim বা Leumi।",
    t2x: "আপনার মাসিক Sal Klita পেমেন্ট পেতে একটি ইসরায়েলি ব্যাংক অ্যাকাউন্ট প্রয়োজন। ওলিমদের মধ্যে সবচেয়ে জনপ্রিয় ব্যাংক হলো Bank Hapoalim এবং Bank Leumi। অ্যাকাউন্ট খুলতে প্রয়োজন: আপনার Teudat Oleh, একটি পরিচয়পত্র (পাসপোর্ট বা সাময়িক Teudat Zehut), এবং কখনো কখনো ঠিকানার প্রমাণ। অনেক ব্যাংকে ইংরেজি বা বাংলা বলা কর্মী থাকে এবং নতুন ওলিমদের জন্য বিশেষ সহায়তা প্রদান করে।",
    t2v: "https://www.youtube.com/results?search_query=open+bank+account+israel+new+olim",
    t2g: "https://www.bankofisrael.org.il/en/",

    t3n: "Teudat Zehut সংগ্রহ করুন",
    t3d: "Misrad Hapnim-এ প্রক্রিয়াকৃত আপনার ইসরায়েলি জাতীয় পরিচয়পত্র।",
    t3x: "Teudat Zehut হলো আপনার ইসরায়েলি জাতীয় পরিচয়পত্র, যা Misrad Hapnim (স্বরাষ্ট্র মন্ত্রণালয়) এ প্রক্রিয়াকৃত হয়। বিমানবন্দরে আপনি একটি সাময়িক নথি পাবেন, তবে স্থায়ী Teudat Zehut পেতে প্রথম কয়েক দিনের মধ্যে Misrad Hapnim অফিসে যেতে হবে। দীর্ঘ অপেক্ষা এড়াতে MyVisit অ্যাপ বা অফিসিয়াল ওয়েবসাইটের মাধ্যমে আগে থেকে অ্যাপয়েন্টমেন্ট বুক করার পরামর্শ দেওয়া হয়। প্রায় সব অন্যান্য প্রক্রিয়ার জন্য এই নথি প্রয়োজন।",
    t3v: "https://www.youtube.com/results?search_query=teudat+zehut+misrad+hapnim+aliyah+english",
    t3g: "https://www.gov.il/en/departments/ministry_of_interior",

    t4n: "Bituach Leumi-তে নিবন্ধন করুন",
    t4d: "জাতীয় বীমা। জরুরি চিকিৎসা সুরক্ষার জন্য অপরিহার্য।",
    t4x: "Bituach Leumi হলো ইসরায়েলের জাতীয় বীমা প্রতিষ্ঠান (সামাজিক নিরাপত্তার মতো)। নিবন্ধন করলে আপনি Kupat Holim (স্বাস্থ্য তহবিল) বেছে নেওয়ার অধিকার সক্রিয় করেন, কর্মক্ষেত্রে দুর্ঘটনার কভারেজ পান, এবং ভবিষ্যতের সুবিধার জন্য যোগ্য হন। নতুন ওলে হিসেবে আপনি প্রথম কয়েক মাস পেমেন্ট থেকে অব্যাহতি পান। আপনি অনলাইনে বা যেকোনো Bituach Leumi শাখায় Teudat Oleh এবং Teudat Zehut দেখিয়ে নিবন্ধন করতে পারেন।",
    t4v: "https://www.youtube.com/results?search_query=bituach+leumi+registration+new+olim+english",
    t4g: "https://www.btl.gov.il/English%20Homepage/Pages/default.aspx",

    t5n: "একটি Kupat Holim বেছে নিন",
    t5d: "একটি স্বাস্থ্য তহবিলে নিবন্ধন করুন (Clalit, Maccabi, Meuhedet বা Leumit)।",
    t5x: "ইসরায়েলের বাধ্যতামূলক পাবলিক স্বাস্থ্য ব্যবস্থা ৪টি প্রদানকারীর উপর ভিত্তি করে গঠিত, যাদের Kupot Holim বলা হয়: Clalit (সবচেয়ে বড়, বিস্তৃত কভারেজ), Maccabi (ইংরেজি ও বাংলাভাষীদের মধ্যে খুব জনপ্রিয়), Meuhedet এবং Leumit। নতুন ওলে হিসেবে প্রথম কয়েক মাস আপনি মাসিক ফি থেকে অব্যাহতি পান। বছরে একবার আপনি Kupat Holim পরিবর্তন করতে পারেন। প্রতিটির নিজস্ব ডাক্তার ও ফার্মেসির নেটওয়ার্ক আছে।",
    t5v: "https://www.youtube.com/results?search_query=kupat+holim+israel+which+to+choose+english",
    t5g: "https://www.gov.il/en/service/choose_health_fund",

    t6n: "স্থায়ী ঠিকানা নিবন্ধন করুন",
    t6d: "অফিসিয়াল বিজ্ঞপ্তি ও সরকারি চিঠিপত্র পেতে ঠিকানা আপডেট করুন।",
    t6x: "Misrad Hapnim-এ আপনার স্থায়ী ঠিকানা নিবন্ধন করা অপরিহার্য। সমস্ত নথি, Bituach Leumi-এর বিজ্ঞপ্তি, আপনার পৌরসভার (Iriya) যোগাযোগ এবং স্কুল ব্যবস্থা সিস্টেমে নিবন্ধিত ঠিকানায় পাঠানো হয়। এছাড়াও, আপনি কোন শহরে বাস করেন তা নির্ধারণ করে আপনি কোন পৌরসভায় Arnona (পৌর কর) দেন এবং আপনার সন্তানরা কোন স্কুলে ভর্তি হতে পারবে। এটি বাসস্থানের প্রমাণসহ Misrad Hapnim-এ করা হয়।",
    t6v: "https://www.youtube.com/results?search_query=register+address+israel+misrad+hapnim+english",
    t6g: "https://www.gov.il/en/departments/ministry_of_interior",

    t7n: "সন্তানদের স্কুলে ভর্তি করুন",
    t7d: "পাবলিক স্কুল বরাদ্দের জন্য স্থানীয় পৌরসভার সাথে সমন্বয়।",
    t7x: "ইসরায়েলে পাবলিক শিক্ষা ৩ বছর বয়স থেকে উচ্চ বিদ্যালয় পর্যন্ত বিনামূল্যে ও বাধ্যতামূলক। আপনার সন্তানদের ভর্তি করতে আপনার শহরের Iriya (পৌরসভা)-তে যান, সাথে থাকুন: সন্তানের Teudat Oleh, Teudat Zehut বা পাসপোর্ট, এবং ঠিকানার প্রমাণ। কিছু স্কুলে ওলিম সন্তানদের জন্য বিশেষ কর্মসূচি আছে যা হিব্রুতে একীকরণ সহজ করে। অনেক পৌরসভায় ইংরেজি বা অন্যান্য ভাষায় কথা বলা শোষণ সমন্বয়কারী থাকে।",
    t7v: "https://www.youtube.com/results?search_query=enroll+children+school+israel+aliyah",
    t7g: "https://edu.gov.il/en",

    t8n: "Sal Klita-র জন্য আবেদন করুন",
    t8d: "রাষ্ট্র প্রদত্ত মাসিক আর্থিক সহায়তার ঝুড়ি।",
    t8x: "Sal Klita (শোষণ ঝুড়ি) হলো ইসরায়েল রাষ্ট্র কর্তৃক নতুন ওলিমদের প্রথম বছরে প্রদত্ত প্রধান আর্থিক সহায়তা। এতে বিমানবন্দরে একটি প্রাথমিক পেমেন্ট এবং পরে আপনার ইসরায়েলি ব্যাংক অ্যাকাউন্টে জমা হওয়া ৬টি মাসিক পেমেন্ট থাকে। পরিমাণ বৈবাহিক অবস্থা এবং সন্তান সংখ্যার উপর নির্ভর করে ভিন্ন হয়। এটি সক্রিয় করতে আপনাকে Misrad Haklita-তে নিবন্ধন করতে হবে এবং ব্যাংক অ্যাকাউন্ট লিঙ্ক করতে হবে। সময়সীমা মিস করবেন না!",
    t8v: "https://www.youtube.com/results?search_query=sal+klita+absorption+basket+israel+explained",
    t8g: "https://www.gov.il/en/departments/guides/sal_klita",

    t9n: "Misrad Haklita-তে নিবন্ধন করুন",
    t9d: "অধ্যয়ন ও আবাসন সহায়তা কর্মসূচির জন্য আলিয়া মন্ত্রণালয়ের যাচাইকরণ।",
    t9x: "Misrad Haklita (আলিয়া ও একীকরণ মন্ত্রণালয়) ওলিমদের জন্য কেন্দ্রীয় প্রতিষ্ঠান। নিবন্ধন করলে আপনি সক্রিয় করেন: Ulpan ভাউচার (বিনামূল্যে হিব্রু কোর্স), অতিরিক্ত আর্থিক সহায়তা, আবাসন ভাউচার, এবং সাধারণ দিকনির্দেশনা। তাদের সব প্রধান ইসরায়েলি শহরে অফিস আছে এবং অনেক কর্মী ইংরেজি বলেন। বসতি স্থাপনের পর এটি আপনার প্রথম করণীয় কাজগুলোর একটি।",
    t9v: "https://www.youtube.com/results?search_query=misrad+haklita+register+benefits+english",
    t9g: "https://www.gov.il/en/departments/ministry_of_aliyah_and_integration",

    t10n: "Ulpan-এ ভর্তি হন",
    t10d: "আপনার বিনামূল্যে অফিসিয়াল নিবিড় হিব্রু ভাষা কোর্স ভাউচার।",
    t10x: "Ulpan হলো নিবিড় আধুনিক হিব্রু কোর্স যা ইসরায়েল সমস্ত নতুন ওলিমদের বিনামূল্যে প্রদান করে। এটি সাধারণত রবিবার থেকে বৃহস্পতিবার সকালে, ৫ মাস ধরে চলে। সারা দেশে Ulpanim আছে। আপনি সরকারি, পৌর বা বেসরকারি (ভর্তুকিপ্রাপ্ত) Ulpan বেছে নিতে পারেন। ভাউচারটি Misrad Haklita থেকে পাওয়া যায় এবং আপনার আলিয়ার ১৮ মাসের মধ্যে ব্যবহার করতে হবে। হিব্রু একীকরণের চাবিকাঠি!",
    t10v: "https://www.youtube.com/results?search_query=ulpan+hebrew+course+israel+free+olim",
    t10g: "https://www.gov.il/en/service/ulpan-for-new-immigrants",

    t11n: "যোগ্যতা স্বীকৃতির জন্য আবেদন করুন",
    t11d: "সংশ্লিষ্ট সরকারি সংস্থায় আপনার পেশাদার ডিগ্রির বৈধতা।",
    t11x: "আপনার যদি নিজ দেশের বিশ্ববিদ্যালয় বা কলেজ ডিগ্রি থাকে এবং ইসরায়েলে আপনার পেশা চর্চা করতে চান, তবে আপনাকে সংশ্লিষ্ট সংস্থায় স্বীকৃতির জন্য আবেদন করতে হবে। ডাক্তারদের জন্য Misrad Habriut, আইনজীবীদের জন্য Lishkat Orche Hadin, প্রকৌশলী বা স্থপতিদের জন্য Misrad Habinui ইত্যাদি। প্রক্রিয়াটি মাসের পর মাস সময় নিতে পারে এবং পরীক্ষা বা ইন্টার্নশিপ অন্তর্ভুক্ত থাকতে পারে। যত তাড়াতাড়ি সম্ভব আপনার পেশার নির্দিষ্ট প্রয়োজনীয়তা সম্পর্কে গবেষণা করুন।",
    t11v: "https://www.youtube.com/results?search_query=professional+degree+recognition+israel+english",
    t11g: "https://www.gov.il/en/departments/guides/recognition-of-professional-qualifications",

    t12n: "ইসরায়েলি ড্রাইভিং লাইসেন্স নিন",
    t12d: "Misrad Harishui অফিসে আপনার বিদেশি ড্রাইভিং লাইসেন্সের রূপান্তর।",
    t12x: "নতুন ওলে হিসেবে আপনি লিখিত বা ব্যবহারিক পরীক্ষা না দিয়ে আপনার বিদেশি ড্রাইভিং লাইসেন্স ইসরায়েলি লাইসেন্সের সাথে বিনিময় করতে পারেন, যদি আপনার লাইসেন্স কমপক্ষে ২ বছরের পুরনো হয়। প্রক্রিয়াটি Misrad Harishui (পরিবহন মন্ত্রণালয়) এ সম্পন্ন হয়। প্রয়োজন: আপনার আসল লাইসেন্স, Teudat Oleh, Teudat Zehut, একটি মৌলিক চিকিৎসা পরীক্ষা এবং ফি প্রদান। এই সুবিধার একটি সময়সীমা আছে: আপনাকে আপনার আলিয়ার প্রথম ৩ বছরের মধ্যে এটি করতে হবে।",
    t12v: "https://www.youtube.com/results?search_query=convert+driving+license+israel+english+olim",
    t12g: "https://www.gov.il/en/service/converting-foreign-driving-license",

    t13n: "কর্মসংস্থান সেবায় নিবন্ধন করুন",
    t13d: "চাকরির সুযোগের জন্য Lishkat Taasuka-তে নিবন্ধন।",
    t13x: "Lishkat Taasuka (কর্মসংস্থান অফিস) হলো সরকারি সংস্থা যা ইসরায়েলে কর্মীদের নিয়োগকর্তার সাথে সংযুক্ত করে। নিবন্ধন করলে আপনি চাকরির বোর্ড, ভর্তুকিপ্রাপ্ত প্রশিক্ষণ কোর্স, এবং কিছু ক্ষেত্রে চাকরি খোঁজার সময় আর্থিক সহায়তা পান। আপনি ওলিমদের জন্য বিশেষ চাকরি মেলায়ও যোগ দিতে পারেন। এই সেবা প্রধান শহরগুলোতে উপলব্ধ এবং একাধিক ভাষায় অনলাইন সম্পদ প্রদান করে।",
    t13v: "https://www.youtube.com/results?search_query=lishkat+taasuka+employment+service+israel+english",
    t13g: "https://www.gov.il/en/departments/the_employment_service",

    t14n: "স্থানীয় পৌরসভায় নিবন্ধন করুন",
    t14d: "শহরের কর (Arnona) এবং নিবাসী সুবিধা ব্যবস্থাপনা।",
    t14x: "ইসরায়েলের প্রতিটি শহরের নিজস্ব Iriya (পৌরসভা) আছে যেখানে আপনাকে বাসিন্দা হিসেবে নিবন্ধন করতে হবে। তা করলে আপনি: Arnona (পৌর সম্পত্তি কর)-এ ছাড়ের জন্য আবেদন, পৌর সেবায় প্রবেশাধিকার, স্থানীয় স্কুল ও কিন্ডারগার্টেনে সন্তানদের ভর্তি, এবং অফিসিয়াল যোগাযোগ পাওয়া সম্ভব। অনেক পৌরসভায় ইংরেজি বলা কর্মীসহ বিশেষ শোষণ বিভাগ আছে যারা নতুন আগত ওলিমদের সাহায্য করে।",
    t14v: "https://www.youtube.com/results?search_query=iriya+municipality+israel+register+olim+english",
    t14g: "https://www.gov.il/en/departments/ministry_of_interior",

    t15n: "সঞ্চয় তহবিল খুলুন (Kupa Gemel)",
    t15d: "নতুন ওলিম জাদাশিমের জন্য বিশেষ কর সুবিধাসহ সঞ্চয় পরিকল্পনা।",
    t15x: "Kupa Gemel (קופת גמל) হলো একটি অবসর বা সাধারণ সঞ্চয় তহবিল যা ইসরায়েলে গুরুত্বপূর্ণ কর সুবিধা প্রদান করে। নতুন ওলে হিসেবে আপনি প্রথম বছরগুলোতে রিটার্নের উপর কর ছাড়ের মতো অতিরিক্ত সুবিধা পান। বিভিন্ন প্রকার আছে: অবসর (Pensia), সাধারণ বিনিয়োগ, বা নির্দিষ্ট লক্ষ্যের জন্য। এটি যেকোনো ব্যাংক বা লাইসেন্সপ্রাপ্ত আর্থিক প্রতিষ্ঠানে খোলা যায়। এটি একটি গুরুত্বপূর্ণ আর্থিক সিদ্ধান্ত, একজন আর্থিক উপদেষ্টার সাথে পরামর্শ বিবেচনা করুন।",
    t15v: "https://www.youtube.com/results?search_query=kupa+gemel+israel+olim+savings+english",
    t15g: "https://www.gov.il/en/departments/ministry_of_finance"
  },
  ru: {
    phase1Title: "Этап 1 – Основные документы по прибытии",
    phase2Title: "Этап 2 – Здоровье и место жительства",
    phase3Title: "Этап 3 – Государственные пособия и помощь",
    phase4Title: "Этап 4 – Работа и лицензии",
    phase5Title: "Этап 5 – Интеграция и дополнительные шаги",

    t1n: "Получить Теудат Оле",
    t1d: "Официальный документ иммигранта, выдаваемый в аэропорту или Министерстве абсорбции.",
    t1x: "Теудат Оле — первый документ, который вы получаете как новый репатриант в Израиле. Его выдаёт Еврейское агентство (Сохнут) или Министерство алии в аэропорту Бен-Гурион по прибытии, либо консульство перед вылетом. Этот документ подтверждает ваш статус нового репатрианта и даёт доступ ко всем государственным льготам абсорбции: Саль Клита, ульпан, налоговые льготы и многое другое. Храните его в надёжном месте!",
    t1v: "https://www.youtube.com/results?search_query=teudat+oleh+aliyah+explained",
    t1g: "https://www.gov.il/en/departments/ministry_of_aliyah_and_integration",

    t2n: "Открыть израильский банковский счёт",
    t2d: "Необходимо для получения ежемесячных выплат Саль Клита. Рекомендуемые банки: Апоалим или Леуми.",
    t2x: "Чтобы получать ежемесячные выплаты Саль Клита, вам нужен израильский банковский счёт. Самые популярные банки среди репатриантов — Банк Апоалим и Банк Леуми. Для открытия счёта потребуется: Теудат Оле, документ, удостоверяющий личность (паспорт или временный Теудат Зеут), а иногда подтверждение адреса. Во многих банках есть сотрудники, говорящие по-английски или по-русски, и специальная поддержка для новых репатриантов.",
    t2v: "https://www.youtube.com/results?search_query=open+bank+account+israel+new+olim",
    t2g: "https://www.bankofisrael.org.il/en/",

    t3n: "Получить Теудат Зеут",
    t3d: "Ваше израильское удостоверение личности, оформляемое в Мисрад ха-Пним.",
    t3x: "Теудат Зеут — это израильское удостоверение личности. Оформляется в Мисрад ха-Пним (Министерство внутренних дел). В аэропорту вы получаете временный документ, но в первые дни нужно посетить офис Мисрад ха-Пним, чтобы получить постоянный Теудат Зеут. Рекомендуем заранее записаться через приложение MyVisit или официальный сайт, чтобы избежать длинных очередей. Этот документ необходим почти для всех остальных процедур.",
    t3v: "https://www.youtube.com/results?search_query=teudat+zehut+misrad+hapnim+aliyah+english",
    t3g: "https://www.gov.il/en/departments/ministry_of_interior",

    t4n: "Зарегистрироваться в Битуах Леуми",
    t4d: "Национальное страхование. Необходимо для немедленного медицинского обеспечения.",
    t4x: "Битуах Леуми — это Институт национального страхования Израиля (аналог социального страхования). Регистрируясь, вы активируете право выбрать купат холим (больничную кассу), получаете страхование от несчастных случаев на работе и право на будущие пособия. Как новый репатриант, вы освобождены от платежей в первые месяцы. Зарегистрироваться можно онлайн или в любом отделении Битуах Леуми, предъявив Теудат Оле и Теудат Зеут.",
    t4v: "https://www.youtube.com/results?search_query=bituach+leumi+registration+new+olim+english",
    t4g: "https://www.btl.gov.il/English%20Homepage/Pages/default.aspx",

    t5n: "Выбрать купат холим",
    t5d: "Зарегистрируйтесь в больничной кассе (Клалит, Маккаби, Меухедет или Леумит).",
    t5x: "В Израиле обязательная государственная система здравоохранения на базе 4 больничных касс: Клалит (крупнейшая, широкое покрытие), Маккаби (очень популярна среди англо- и русскоязычных), Меухедет и Леумит. Как новый репатриант вы освобождены от ежемесячной платы в первые месяцы. Менять кассу можно раз в год. У каждой своя сеть врачей и аптек.",
    t5v: "https://www.youtube.com/results?search_query=kupat+holim+israel+which+to+choose+english",
    t5g: "https://www.gov.il/en/service/choose_health_fund",

    t6n: "Зарегистрировать постоянный адрес",
    t6d: "Обновите официальный адрес для получения уведомлений и государственной почты.",
    t6x: "Регистрация постоянного адреса в Мисрад ха-Пним крайне важна. Все документы, уведомления Битуах Леуми, сообщения муниципалитета (Ирия) и школьной системы отправляются на адрес, зарегистрированный в системе. Кроме того, город проживания определяет, в какой муниципалитет вы платите арнону (муниципальный налог) и в какие школы могут поступить ваши дети. Делается это в Мисрад ха-Пним с подтверждением проживания.",
    t6v: "https://www.youtube.com/results?search_query=register+address+israel+misrad+hapnim+english",
    t6g: "https://www.gov.il/en/departments/ministry_of_interior",

    t7n: "Записать детей в школу",
    t7d: "Согласование с местным муниципалитетом для распределения в государственные школы.",
    t7x: "Государственное образование в Израиле бесплатно и обязательно с 3 лет до окончания школы. Чтобы записать детей, обратитесь в Ирия (муниципалитет) вашего города с: Теудат Оле ребёнка, Теудат Зеут или паспортом и подтверждением адреса. Есть школы со специальными программами для детей репатриантов, облегчающими интеграцию на иврите. Во многих муниципалитетах есть координаторы абсорбции, говорящие по-английски или на других языках.",
    t7v: "https://www.youtube.com/results?search_query=enroll+children+school+israel+aliyah",
    t7g: "https://edu.gov.il/en",

    t8n: "Подать заявку на Саль Клита",
    t8d: "Государственная корзина финансовой помощи, выплачиваемая ежемесячно.",
    t8x: "Саль Клита (корзина абсорбции) — основная финансовая поддержка государства Израиль для новых репатриантов в течение первого года. Состоит из первоначальной выплаты в аэропорту и последующих 6 ежемесячных выплат на ваш израильский банковский счёт. Сумма зависит от семейного положения и числа детей. Чтобы активировать её, нужно зарегистрироваться в Мисрад ха-Клита и привязать банковский счёт. Не пропустите срок!",
    t8v: "https://www.youtube.com/results?search_query=sal+klita+absorption+basket+israel+explained",
    t8g: "https://www.gov.il/en/departments/guides/sal_klita",

    t9n: "Зарегистрироваться в Мисрад ха-Клита",
    t9d: "Проверка Министерства абсорбции для активации ваучеров на учёбу и жильё.",
    t9x: "Мисрад ха-Клита (Министерство алии и интеграции) — центральное учреждение для репатриантов. Регистрация активирует: ваучер на ульпан (бесплатный курс иврита), дополнительную финансовую помощь, жилищные ваучеры и общее консультирование. У них есть офисы во всех крупных городах Израиля, и многие сотрудники говорят по-английски. Это одно из первых дел, которые стоит сделать после обустройства.",
    t9v: "https://www.youtube.com/results?search_query=misrad+haklita+register+benefits+english",
    t9g: "https://www.gov.il/en/departments/ministry_of_aliyah_and_integration",

    t10n: "Записаться в ульпан",
    t10d: "Ваш бесплатный официальный ваучер на интенсивный курс иврита.",
    t10x: "Ульпан — это интенсивный курс современного иврита, который Израиль бесплатно предлагает всем новым репатриантам. Обычно проходит по утрам с воскресенья по четверг в течение 5 месяцев. Ульпаны есть по всей стране. Можно выбрать государственный, муниципальный или частный (субсидируемый) ульпан. Ваучер получают в Мисрад ха-Клита, и его нужно использовать в течение 18 месяцев после алии. Иврит — ключ к интеграции!",
    t10v: "https://www.youtube.com/results?search_query=ulpan+hebrew+course+israel+free+olim",
    t10g: "https://www.gov.il/en/service/ulpan-for-new-immigrants",

    t11n: "Запросить признание квалификации",
    t11d: "Подтверждение профессионального диплома в соответствующих государственных органах.",
    t11x: "Если у вас есть университетский диплом из страны происхождения и вы хотите работать по профессии в Израиле, нужно подать заявку на признание в соответствующий орган. Для врачей это Мисрад ха-Бриют, для юристов — Лишкат Орхей ха-Дин, для инженеров или архитекторов — Мисрад ха-Бинуй и т.д. Процесс может занять месяцы и включать экзамены или стажировки. Рекомендуем изучить конкретные требования вашей профессии как можно раньше.",
    t11v: "https://www.youtube.com/results?search_query=professional+degree+recognition+israel+english",
    t11g: "https://www.gov.il/en/departments/guides/recognition-of-professional-qualifications",

    t12n: "Получить израильские водительские права",
    t12d: "Официальная замена ваших иностранных прав в офисах Мисрад ха-Ришуй.",
    t12x: "Как новый репатриант, вы имеете право обменять иностранные права на израильские без сдачи теоретического или практического экзамена, если правам не менее 2 лет. Процедура проводится в Мисрад ха-Ришуй (Министерство транспорта). Понадобятся: оригинал прав, Теудат Оле, Теудат Зеут, базовый медосмотр и оплата пошлины. У этой льготы есть срок: сделать это нужно в течение первых 3 лет после алии.",
    t12v: "https://www.youtube.com/results?search_query=convert+driving+license+israel+english+olim",
    t12g: "https://www.gov.il/en/service/converting-foreign-driving-license",

    t13n: "Зарегистрироваться в службе занятости",
    t13d: "Регистрация в Лишкат Таасука для доступа к вакансиям.",
    t13x: "Лишкат Таасука (служба занятости) — государственный орган, соединяющий работников с работодателями в Израиле. Регистрация даёт доступ к вакансиям, субсидируемым курсам обучения, а в некоторых случаях — финансовую помощь во время поиска работы. Также можно посещать специальные ярмарки вакансий для репатриантов. Служба доступна в крупных городах и предоставляет онлайн-ресурсы на нескольких языках.",
    t13v: "https://www.youtube.com/results?search_query=lishkat+taasuka+employment+service+israel+english",
    t13g: "https://www.gov.il/en/departments/the_employment_service",

    t14n: "Зарегистрироваться в местном муниципалитете",
    t14d: "Оформление городских налогов (арнона) и льгот жителя.",
    t14x: "У каждого города в Израиле есть своя Ирия (муниципалитет), где нужно зарегистрироваться как житель. Это позволяет: получить скидки на арнону (муниципальный налог на имущество), пользоваться городскими услугами, записать детей в местные школы и детские сады, а также получать официальные уведомления. Во многих Ирия есть специальные отделы абсорбции с сотрудниками, говорящими по-английски, для помощи новоприбывшим репатриантам.",
    t14v: "https://www.youtube.com/results?search_query=iriya+municipality+israel+register+olim+english",
    t14g: "https://www.gov.il/en/departments/ministry_of_interior",

    t15n: "Открыть сберегательный фонд (Купа Гемель)",
    t15d: "Накопительные программы с эксклюзивными налоговыми льготами для новых репатриантов.",
    t15x: "Купа Гемель (קופת גמל) — это пенсионный или общий сберегательный фонд, предоставляющий важные налоговые преимущества в Израиле. Как новый репатриант вы получаете дополнительные льготы, например освобождение от налога на доходность в первые годы. Есть несколько типов: для пенсии (Пенсия), для общих инвестиций или для конкретных целей. Открыть можно в любом банке или лицензированном финансовом учреждении. Это важное финансовое решение — стоит проконсультироваться с финансовым консультантом.",
    t15v: "https://www.youtube.com/results?search_query=kupa+gemel+israel+olim+savings+english",
    t15g: "https://www.gov.il/en/departments/ministry_of_finance"
  },
  pt: {
    phase1Title: "Fase 1 – Documentos essenciais na chegada",
    phase2Title: "Fase 2 – Saúde e residência",
    phase3Title: "Fase 3 – Benefícios e auxílios do governo",
    phase4Title: "Fase 4 – Trabalho e licenças",
    phase5Title: "Fase 5 – Integração e etapas opcionais",

    t1n: "Receber a Teudat Oleh",
    t1d: "Documento oficial de imigrante entregue no aeroporto ou no Ministério da Aliá.",
    t1x: "A Teudat Oleh é o primeiro documento que você recebe como novo imigrante em Israel. É entregue pela Agência Judaica (Sochnut) ou pelo Ministério da Aliá no Aeroporto Ben Gurion na chegada, ou em um consulado antes do voo. Este documento certifica seu status de novo Olé e dá acesso a todos os benefícios de absorção do Estado: Sal Klita, Ulpan, isenções fiscais e muito mais. Guarde-o sempre em local seguro!",
    t1v: "https://www.youtube.com/results?search_query=teudat+oleh+aliyah+explained",
    t1g: "https://www.gov.il/en/departments/ministry_of_aliyah_and_integration",

    t2n: "Abrir conta bancária israelense",
    t2d: "Necessário para receber os pagamentos mensais da Sal Klita. Bancos sugeridos: Hapoalim ou Leumi.",
    t2x: "Para receber os pagamentos mensais da Sal Klita, você precisa de uma conta bancária israelense. Os bancos mais populares entre os Olim são o Bank Hapoalim e o Bank Leumi. Para abrir a conta, você precisará: da sua Teudat Oleh, um documento de identidade (passaporte ou Teudat Zehut temporária) e, às vezes, comprovante de endereço. Muitos bancos têm atendentes que falam inglês ou português e oferecem assistência especial para novos Olim.",
    t2v: "https://www.youtube.com/results?search_query=open+bank+account+israel+new+olim",
    t2g: "https://www.bankofisrael.org.il/en/",

    t3n: "Obter a Teudat Zehut",
    t3d: "Sua carteira de identidade nacional israelense, emitida no Misrad Hapnim.",
    t3x: "A Teudat Zehut é sua carteira de identidade nacional israelense. É emitida no Misrad Hapnim (Ministério do Interior). No aeroporto você recebe um documento temporário, mas deve ir a um escritório do Misrad Hapnim nos primeiros dias para obter a Teudat Zehut definitiva. Recomendamos agendar com antecedência pelo aplicativo MyVisit ou pelo site oficial para evitar longas esperas. Este documento é necessário para quase todos os outros trâmites.",
    t3v: "https://www.youtube.com/results?search_query=teudat+zehut+misrad+hapnim+aliyah+english",
    t3g: "https://www.gov.il/en/departments/ministry_of_interior",

    t4n: "Registrar-se no Bituach Leumi",
    t4d: "Seguro nacional. Essencial para sua cobertura médica imediata.",
    t4x: "O Bituach Leumi é o Instituto Nacional de Seguro de Israel (equivalente ao INSS). Ao se registrar, você ativa seu direito de escolher uma Kupat Holim (fundo de saúde), recebe cobertura para acidentes de trabalho e se qualifica para benefícios futuros. Como novo Olé, você fica isento de pagamentos nos primeiros meses. Você pode se registrar online ou em qualquer agência do Bituach Leumi apresentando sua Teudat Oleh e Teudat Zehut.",
    t4v: "https://www.youtube.com/results?search_query=bituach+leumi+registration+new+olim+english",
    t4g: "https://www.btl.gov.il/English%20Homepage/Pages/default.aspx",

    t5n: "Escolher uma Kupat Holim",
    t5d: "Inscreva-se em um fundo de saúde (Clalit, Maccabi, Meuhedet ou Leumit).",
    t5x: "Israel tem um sistema de saúde público obrigatório baseado em 4 fundos chamados Kupot Holim: Clalit (o maior, ampla cobertura), Maccabi (muito popular entre falantes de inglês e português), Meuhedet e Leumit. Como novo Olé, você fica isento da mensalidade nos primeiros meses. Você pode trocar de Kupat Holim uma vez por ano. Cada uma tem sua própria rede de médicos e farmácias.",
    t5v: "https://www.youtube.com/results?search_query=kupat+holim+israel+which+to+choose+english",
    t5g: "https://www.gov.il/en/service/choose_health_fund",

    t6n: "Registrar endereço permanente",
    t6d: "Atualize seu endereço oficial para receber notificações e correspondências governamentais.",
    t6x: "Registrar seu endereço fixo no Misrad Hapnim é fundamental. Todos os documentos, notificações do Bituach Leumi, comunicações da sua prefeitura (Iriya) e do sistema escolar são enviados para o endereço registrado no sistema. Além disso, a cidade onde você mora determina a qual prefeitura você paga o Arnona (imposto municipal) e em quais escolas seus filhos podem se matricular. Isso é feito no Misrad Hapnim com comprovante de residência.",
    t6v: "https://www.youtube.com/results?search_query=register+address+israel+misrad+hapnim+english",
    t6g: "https://www.gov.il/en/departments/ministry_of_interior",

    t7n: "Matricular os filhos na escola",
    t7d: "Coordenação com a prefeitura local para alocação em escola pública.",
    t7x: "A educação pública em Israel é gratuita e obrigatória dos 3 anos até o ensino médio. Para matricular seus filhos, vá à Iriya (prefeitura) da sua cidade com: a Teudat Oleh da criança, Teudat Zehut ou passaporte, e comprovante de endereço. Existem escolas com programas especiais para filhos de Olim que facilitam a integração ao hebraico. Muitas prefeituras têm coordenadores de absorção que falam inglês ou outros idiomas.",
    t7v: "https://www.youtube.com/results?search_query=enroll+children+school+israel+aliyah",
    t7g: "https://edu.gov.il/en",

    t8n: "Solicitar a Sal Klita",
    t8d: "A cesta de assistência financeira do Estado, depositada mensalmente.",
    t8x: "A Sal Klita (cesta de absorção) é o principal apoio financeiro que o Estado de Israel oferece aos novos Olim durante o primeiro ano. É composta por um pagamento inicial no aeroporto seguido de 6 pagamentos mensais depositados na sua conta bancária israelense. O valor varia conforme o estado civil e o número de filhos. Para ativá-la, você deve se registrar no Misrad Haklita e vincular sua conta bancária. Não perca o prazo!",
    t8v: "https://www.youtube.com/results?search_query=sal+klita+absorption+basket+israel+explained",
    t8g: "https://www.gov.il/en/departments/guides/sal_klita",

    t9n: "Registrar-se no Misrad Haklita",
    t9d: "Validação do Ministério da Aliá para ativar vouchers de estudo e moradia.",
    t9x: "O Misrad Haklita (Ministério da Aliá e Integração) é a instituição central para os Olim. Ao se registrar, você ativa: o voucher do Ulpan (curso gratuito de hebraico), assistência financeira adicional, vouchers de moradia e orientação geral. Eles têm escritórios em todas as principais cidades israelenses e muitos funcionários falam inglês. Este é um dos primeiros trâmites a fazer assim que você se instalar.",
    t9v: "https://www.youtube.com/results?search_query=misrad+haklita+register+benefits+english",
    t9g: "https://www.gov.il/en/departments/ministry_of_aliyah_and_integration",

    t10n: "Matricular-se no Ulpan",
    t10d: "Seu voucher oficial e gratuito para um curso intensivo de hebraico.",
    t10x: "O Ulpan é o curso intensivo de hebraico moderno que Israel oferece gratuitamente a todos os novos Olim. Geralmente ocorre pela manhã, de domingo a quinta-feira, durante 5 meses. Há Ulpanim por todo o país. Você pode escolher entre um Ulpan governamental, municipal ou privado (subsidiado). O voucher é obtido no Misrad Haklita e deve ser usado dentro de 18 meses após sua Aliá. O hebraico é a chave para a integração!",
    t10v: "https://www.youtube.com/results?search_query=ulpan+hebrew+course+israel+free+olim",
    t10g: "https://www.gov.il/en/service/ulpan-for-new-immigrants",

    t11n: "Solicitar reconhecimento de diploma",
    t11d: "Validação do seu diploma profissional junto aos órgãos governamentais correspondentes.",
    t11x: "Se você tem um diploma universitário do seu país de origem e deseja exercer sua profissão em Israel, deve solicitar o reconhecimento junto ao órgão correspondente. Para médicos é o Misrad Habriut, para advogados o Lishkat Orche Hadin, para engenheiros ou arquitetos o Misrad Habinui, etc. O processo pode levar meses e incluir exames ou estágios. Recomendamos pesquisar os requisitos específicos da sua profissão o quanto antes.",
    t11v: "https://www.youtube.com/results?search_query=professional+degree+recognition+israel+english",
    t11g: "https://www.gov.il/en/departments/guides/recognition-of-professional-qualifications",

    t12n: "Obter carteira de motorista israelense",
    t12d: "Conversão oficial da sua carteira estrangeira nos escritórios do Misrad Harishui.",
    t12x: "Como novo Olé, você tem direito de trocar sua carteira de motorista estrangeira por uma israelense sem precisar fazer a prova teórica nem a prática, desde que a carteira tenha pelo menos 2 anos. O trâmite é feito no Misrad Harishui (Ministério dos Transportes). Você precisará: da sua carteira original, Teudat Oleh, Teudat Zehut, um exame médico básico e o pagamento de uma taxa. Este benefício tem prazo: deve ser feito dentro dos primeiros 3 anos da sua Aliá.",
    t12v: "https://www.youtube.com/results?search_query=convert+driving+license+israel+english+olim",
    t12g: "https://www.gov.il/en/service/converting-foreign-driving-license",

    t13n: "Registrar-se no Serviço de Emprego",
    t13d: "Inscrição no Lishkat Taasuka para acessar oportunidades de emprego.",
    t13x: "O Lishkat Taasuka (Serviço de Emprego) é o órgão estatal que conecta trabalhadores e empregadores em Israel. Ao se registrar, você tem acesso a vagas de emprego, cursos de capacitação subsidiados e, em alguns casos, ajuda financeira enquanto procura trabalho. Você também pode participar de feiras de emprego especiais para Olim. O serviço está disponível nas principais cidades e tem recursos online em vários idiomas.",
    t13v: "https://www.youtube.com/results?search_query=lishkat+taasuka+employment+service+israel+english",
    t13g: "https://www.gov.il/en/departments/the_employment_service",

    t14n: "Registrar-se na prefeitura local",
    t14d: "Gestão de impostos municipais (Arnona) e cadastro de residente.",
    t14x: "Cada cidade em Israel tem sua própria Iriya (prefeitura) onde você deve se registrar como residente. Ao fazer isso, você pode: solicitar descontos no Arnona (imposto predial municipal), acessar serviços municipais, matricular seus filhos em escolas e jardins de infância locais, e receber comunicações oficiais. Muitas Iriyot têm departamentos especiais de absorção com equipe que fala inglês para ajudar Olim recém-chegados.",
    t14v: "https://www.youtube.com/results?search_query=iriya+municipality+israel+register+olim+english",
    t14g: "https://www.gov.il/en/departments/ministry_of_interior",

    t15n: "Abrir fundo de poupança (Kupa Gemel)",
    t15d: "Planos de poupança com vantagens fiscais exclusivas para novos Olim Jadashim.",
    t15x: "A Kupa Gemel (קופת גמל) é um fundo de poupança para aposentadoria ou objetivos gerais que oferece importantes vantagens fiscais em Israel. Como novo Olé, você recebe benefícios adicionais, como isenções fiscais sobre os rendimentos nos primeiros anos. Existem vários tipos: para aposentadoria (Pensia), para investimento geral ou para objetivos específicos. Pode ser aberto em qualquer banco ou instituição financeira licenciada. É uma decisão financeira importante — considere consultar um assessor financeiro.",
    t15v: "https://www.youtube.com/results?search_query=kupa+gemel+israel+olim+savings+english",
    t15g: "https://www.gov.il/en/departments/ministry_of_finance"
  },
  ur: {
    phase1Title: "مرحلہ 1 – پہنچنے پر ضروری دستاویزات",
    phase2Title: "مرحلہ 2 – صحت اور رہائش",
    phase3Title: "مرحلہ 3 – سرکاری فوائد اور امداد",
    phase4Title: "مرحلہ 4 – کام اور لائسنس",
    phase5Title: "مرحلہ 5 – انضمام اور اختیاری اقدامات",

    t1n: "Teudat Oleh حاصل کریں",
    t1d: "ہوائی اڈے یا وزارتِ علیا میں دیا جانے والا سرکاری تارکِ وطن دستاویز۔",
    t1x: "Teudat Oleh وہ پہلی دستاویز ہے جو آپ کو اسرائیل میں نئے تارکِ وطن کے طور پر ملتی ہے۔ یہ بن گوریان ہوائی اڈے پر جیوش ایجنسی (Sochnut) یا وزارتِ علیا کی جانب سے دی جاتی ہے، یا پرواز سے پہلے کسی قونصلر دفتر میں۔ یہ دستاویز آپ کی نئے اولے کی حیثیت ثابت کرتی ہے اور آپ کو Sal Klita، Ulpan، ٹیکس چھوٹ سمیت تمام ریاستی مراعات تک رسائی دیتی ہے۔ اسے ہمیشہ محفوظ جگہ پر رکھیں!",
    t1v: "https://www.youtube.com/results?search_query=teudat+oleh+aliyah+explained",
    t1g: "https://www.gov.il/en/departments/ministry_of_aliyah_and_integration",

    t2n: "اسرائیلی بینک اکاؤنٹ کھولیں",
    t2d: "Sal Klita کی ادائیگیاں حاصل کرنے کے لیے ضروری۔ تجویز کردہ بینک: Hapoalim یا Leumi۔",
    t2x: "اپنی ماہانہ Sal Klita ادائیگیاں حاصل کرنے کے لیے آپ کو اسرائیلی بینک اکاؤنٹ درکار ہے۔ اولیم میں سب سے مقبول بینک Bank Hapoalim اور Bank Leumi ہیں۔ اکاؤنٹ کھولنے کے لیے آپ کو چاہیے: آپ کا Teudat Oleh، شناختی دستاویز (پاسپورٹ یا عارضی Teudat Zehut)، اور کبھی کبھار پتے کا ثبوت۔ بہت سے بینکوں میں انگریزی یا اردو بولنے والا عملہ موجود ہے اور نئے اولیم کے لیے خصوصی مدد فراہم کرتے ہیں۔",
    t2v: "https://www.youtube.com/results?search_query=open+bank+account+israel+new+olim",
    t2g: "https://www.bankofisrael.org.il/en/",

    t3n: "Teudat Zehut حاصل کریں",
    t3d: "Misrad Hapnim میں جاری ہونے والا آپ کا اسرائیلی قومی شناختی کارڈ۔",
    t3x: "Teudat Zehut آپ کا اسرائیلی قومی شناختی کارڈ ہے۔ یہ Misrad Hapnim (وزارتِ داخلہ) میں پروسیس کیا جاتا ہے۔ ہوائی اڈے پر آپ کو ایک عارضی دستاویز ملتی ہے، لیکن مستقل Teudat Zehut حاصل کرنے کے لیے آپ کو ابتدائی دنوں میں Misrad Hapnim کے دفتر جانا ہوگا۔ طویل انتظار سے بچنے کے لیے MyVisit ایپ یا سرکاری ویب سائٹ کے ذریعے پہلے سے اپائنٹمنٹ لینے کی سفارش کی جاتی ہے۔ یہ دستاویز تقریباً باقی تمام کارروائیوں کے لیے ضروری ہے۔",
    t3v: "https://www.youtube.com/results?search_query=teudat+zehut+misrad+hapnim+aliyah+english",
    t3g: "https://www.gov.il/en/departments/ministry_of_interior",

    t4n: "Bituach Leumi میں رجسٹریشن کروائیں",
    t4d: "قومی بیمہ۔ فوری طبی کوریج کے لیے لازمی۔",
    t4x: "Bituach Leumi اسرائیل کا قومی بیمہ ادارہ ہے (سماجی تحفظ کے مترادف)۔ رجسٹریشن کروانے سے آپ Kupat Holim (صحت فنڈ) منتخب کرنے کا حق حاصل کرتے ہیں، کام کی جگہ کے حادثات کے لیے کوریج پاتے ہیں، اور مستقبل کے فوائد کے اہل بنتے ہیں۔ نئے اولے کے طور پر ابتدائی مہینوں میں آپ ادائیگیوں سے مستثنیٰ ہیں۔ آپ آن لائن یا کسی بھی Bituach Leumi برانچ میں اپنا Teudat Oleh اور Teudat Zehut دکھا کر رجسٹر کر سکتے ہیں۔",
    t4v: "https://www.youtube.com/results?search_query=bituach+leumi+registration+new+olim+english",
    t4g: "https://www.btl.gov.il/English%20Homepage/Pages/default.aspx",

    t5n: "Kupat Holim منتخب کریں",
    t5d: "کسی صحت فنڈ میں رجسٹر ہوں (Clalit، Maccabi، Meuhedet یا Leumit)۔",
    t5x: "اسرائیل کا لازمی سرکاری صحت نظام 4 فراہم کنندگان پر مبنی ہے جنہیں Kupot Holim کہا جاتا ہے: Clalit (سب سے بڑا، وسیع کوریج)، Maccabi (انگریزی اور اردو بولنے والوں میں بہت مقبول)، Meuhedet اور Leumit۔ نئے اولے کے طور پر ابتدائی مہینوں میں آپ ماہانہ فیس سے مستثنیٰ ہیں۔ آپ سال میں ایک بار Kupat Holim تبدیل کر سکتے ہیں۔ ہر ایک کا اپنا ڈاکٹروں اور فارمیسیوں کا نیٹ ورک ہے۔",
    t5v: "https://www.youtube.com/results?search_query=kupat+holim+israel+which+to+choose+english",
    t5g: "https://www.gov.il/en/service/choose_health_fund",

    t6n: "مستقل پتہ رجسٹر کریں",
    t6d: "سرکاری اطلاعات اور خط و کتابت وصول کرنے کے لیے اپنا پتہ اپ ڈیٹ کریں۔",
    t6x: "Misrad Hapnim میں اپنا مستقل پتہ رجسٹر کرنا ضروری ہے۔ تمام دستاویزات، Bituach Leumi کی اطلاعات، آپ کی میونسپلٹی (Iriya) کی خط و کتابت اور اسکول نظام سسٹم میں درج پتے پر بھیجے جاتے ہیں۔ اس کے علاوہ، آپ جس شہر میں رہتے ہیں وہ طے کرتا ہے کہ آپ کس میونسپلٹی کو Arnona (میونسپل ٹیکس) ادا کرتے ہیں اور آپ کے بچے کن اسکولوں میں داخلہ لے سکتے ہیں۔ یہ رہائش کے ثبوت کے ساتھ Misrad Hapnim میں کیا جاتا ہے۔",
    t6v: "https://www.youtube.com/results?search_query=register+address+israel+misrad+hapnim+english",
    t6g: "https://www.gov.il/en/departments/ministry_of_interior",

    t7n: "بچوں کو اسکول میں داخل کروائیں",
    t7d: "سرکاری اسکول کی تخصیص کے لیے مقامی میونسپلٹی کے ساتھ تال میل۔",
    t7x: "اسرائیل میں سرکاری تعلیم 3 سال کی عمر سے ہائی اسکول تک مفت اور لازمی ہے۔ اپنے بچوں کو داخل کروانے کے لیے اپنے شہر کی Iriya (میونسپلٹی) جائیں، ساتھ لائیں: بچے کا Teudat Oleh، Teudat Zehut یا پاسپورٹ، اور پتے کا ثبوت۔ کچھ اسکولوں میں اولیم کے بچوں کے لیے خصوصی پروگرام ہیں جو عبرانی میں انضمام کو آسان بناتے ہیں۔ بہت سی میونسپلٹیوں میں انگریزی یا دیگر زبانیں بولنے والے انضمام کوآرڈینیٹرز موجود ہیں۔",
    t7v: "https://www.youtube.com/results?search_query=enroll+children+school+israel+aliyah",
    t7g: "https://edu.gov.il/en",

    t8n: "Sal Klita کے لیے درخواست دیں",
    t8d: "ریاست کی جانب سے ماہانہ جمع کی جانے والی مالی امداد کی ٹوکری۔",
    t8x: "Sal Klita (انضمام کی ٹوکری) ریاستِ اسرائیل کی جانب سے نئے اولیم کو ان کے پہلے سال کے دوران دی جانے والی بنیادی مالی مدد ہے۔ یہ ہوائی اڈے پر ایک ابتدائی ادائیگی اور پھر آپ کے اسرائیلی بینک اکاؤنٹ میں جمع ہونے والی 6 ماہانہ ادائیگیوں پر مشتمل ہے۔ رقم آپ کی ازدواجی حیثیت اور بچوں کی تعداد کے مطابق مختلف ہوتی ہے۔ اسے فعال کرنے کے لیے آپ کو Misrad Haklita میں رجسٹر ہونا اور اپنا بینک اکاؤنٹ منسلک کرنا ہوگا۔ آخری تاریخ مت چوکیں!",
    t8v: "https://www.youtube.com/results?search_query=sal+klita+absorption+basket+israel+explained",
    t8g: "https://www.gov.il/en/departments/guides/sal_klita",

    t9n: "Misrad Haklita میں رجسٹریشن کروائیں",
    t9d: "تعلیمی اور رہائشی امدادی پروگراموں کو فعال کرنے کے لیے وزارتِ علیا کی تصدیق۔",
    t9x: "Misrad Haklita (وزارتِ علیا و انضمام) اولیم کے لیے مرکزی ادارہ ہے۔ رجسٹریشن کروانے سے آپ فعال کرتے ہیں: Ulpan واؤچر (مفت عبرانی کورس)، اضافی مالی امداد، رہائشی واؤچرز، اور عمومی رہنمائی۔ ان کے دفاتر اسرائیل کے تمام بڑے شہروں میں موجود ہیں اور بہت سا عملہ انگریزی بولتا ہے۔ آباد ہونے کے بعد یہ آپ کے پہلے کاموں میں سے ایک ہونا چاہیے۔",
    t9v: "https://www.youtube.com/results?search_query=misrad+haklita+register+benefits+english",
    t9g: "https://www.gov.il/en/departments/ministry_of_aliyah_and_integration",

    t10n: "Ulpan میں داخلہ لیں",
    t10d: "آپ کا مفت سرکاری گہرا عبرانی زبان کورس واؤچر۔",
    t10x: "Ulpan وہ گہرا جدید عبرانی کورس ہے جو اسرائیل تمام نئے اولیم کو مفت فراہم کرتا ہے۔ یہ عام طور پر اتوار سے جمعرات صبح، 5 ماہ تک چلتا ہے۔ پورے ملک میں Ulpanim موجود ہیں۔ آپ سرکاری، میونسپل یا نجی (سبسڈی یافتہ) Ulpan میں سے انتخاب کر سکتے ہیں۔ واؤچر Misrad Haklita سے حاصل ہوتا ہے اور آپ کی علیا کے 18 ماہ کے اندر استعمال کرنا ہوتا ہے۔ عبرانی انضمام کی کنجی ہے!",
    t10v: "https://www.youtube.com/results?search_query=ulpan+hebrew+course+israel+free+olim",
    t10g: "https://www.gov.il/en/service/ulpan-for-new-immigrants",

    t11n: "اہلیت کی شناخت کے لیے درخواست دیں",
    t11d: "متعلقہ سرکاری اداروں میں آپ کی پیشہ ورانہ ڈگری کی توثیق۔",
    t11x: "اگر آپ کے پاس اپنے آبائی ملک کی یونیورسٹی یا کالج کی ڈگری ہے اور آپ اسرائیل میں اپنا پیشہ اپنانا چاہتے ہیں، تو آپ کو متعلقہ ادارے میں شناخت کے لیے درخواست دینی ہوگی۔ ڈاکٹروں کے لیے یہ Misrad Habriut ہے، وکلاء کے لیے Lishkat Orche Hadin، انجینئرز یا معماروں کے لیے Misrad Habinui وغیرہ۔ اس عمل میں مہینے لگ سکتے ہیں اور امتحانات یا انٹرن شپ شامل ہو سکتی ہے۔ جتنی جلدی ممکن ہو اپنے پیشے کی مخصوص ضروریات کی تحقیق کریں۔",
    t11v: "https://www.youtube.com/results?search_query=professional+degree+recognition+israel+english",
    t11g: "https://www.gov.il/en/departments/guides/recognition-of-professional-qualifications",

    t12n: "اسرائیلی ڈرائیونگ لائسنس حاصل کریں",
    t12d: "Misrad Harishui کے دفاتر میں آپ کے غیر ملکی لائسنس کی سرکاری تبدیلی۔",
    t12x: "نئے اولے کے طور پر آپ اپنا غیر ملکی ڈرائیونگ لائسنس بغیر تحریری یا عملی امتحان کے اسرائیلی لائسنس سے تبدیل کر سکتے ہیں، بشرطیکہ آپ کا لائسنس کم از کم 2 سال پرانا ہو۔ یہ کارروائی Misrad Harishui (وزارتِ ٹرانسپورٹ) میں کی جاتی ہے۔ آپ کو چاہیے: اصل لائسنس، Teudat Oleh، Teudat Zehut، بنیادی طبی معائنہ، اور فیس کی ادائیگی۔ اس سہولت کی ایک وقتی حد ہے: یہ آپ کی علیا کے پہلے 3 سالوں کے اندر کرنا ہوگا۔",
    t12v: "https://www.youtube.com/results?search_query=convert+driving+license+israel+english+olim",
    t12g: "https://www.gov.il/en/service/converting-foreign-driving-license",

    t13n: "ملازمت کی خدمت میں رجسٹریشن کروائیں",
    t13d: "روزگار کے مواقع تک رسائی کے لیے Lishkat Taasuka میں رجسٹریشن۔",
    t13x: "Lishkat Taasuka (روزگار کا دفتر) وہ سرکاری ادارہ ہے جو اسرائیل میں کارکنوں کو آجروں سے جوڑتا ہے۔ رجسٹریشن کروانے سے آپ کو ملازمتوں کی فہرستوں، سبسڈی یافتہ تربیتی کورسز، اور بعض صورتوں میں ملازمت تلاش کرتے ہوئے مالی امداد تک رسائی حاصل ہوتی ہے۔ آپ اولیم کے لیے خصوصی جاب فیئرز میں بھی شرکت کر سکتے ہیں۔ یہ خدمت بڑے شہروں میں دستیاب ہے اور متعدد زبانوں میں آن لائن وسائل فراہم کرتی ہے۔",
    t13v: "https://www.youtube.com/results?search_query=lishkat+taasuka+employment+service+israel+english",
    t13g: "https://www.gov.il/en/departments/the_employment_service",

    t14n: "مقامی میونسپلٹی میں رجسٹریشن کروائیں",
    t14d: "شہری ٹیکسز (Arnona) اور رہائشی مراعات کا انتظام۔",
    t14x: "اسرائیل کے ہر شہر کی اپنی Iriya (میونسپلٹی) ہے جہاں آپ کو بطور رہائشی رجسٹر ہونا ہوگا۔ ایسا کرنے سے آپ: Arnona (میونسپل پراپرٹی ٹیکس) پر رعایت کے لیے درخواست دے سکتے ہیں، میونسپل خدمات تک رسائی حاصل کر سکتے ہیں، اپنے بچوں کو مقامی اسکولوں اور کنڈرگارٹنز میں داخل کروا سکتے ہیں، اور سرکاری خط و کتابت وصول کر سکتے ہیں۔ بہت سی میونسپلٹیوں میں انگریزی بولنے والے عملے کے ساتھ خصوصی انضمام کے شعبے ہیں جو نئے آنے والے اولیم کی مدد کرتے ہیں۔",
    t14v: "https://www.youtube.com/results?search_query=iriya+municipality+israel+register+olim+english",
    t14g: "https://www.gov.il/en/departments/ministry_of_interior",

    t15n: "بچت فنڈ کھولیں (Kupa Gemel)",
    t15d: "نئے اولیم جداشیم کے لیے خصوصی ٹیکس فوائد کے ساتھ بچت اسکیمیں۔",
    t15x: "Kupa Gemel (קופת גמל) ایک ریٹائرمنٹ یا عمومی بچت فنڈ ہے جو اسرائیل میں اہم ٹیکس فوائد فراہم کرتا ہے۔ نئے اولے کے طور پر آپ کو ابتدائی سالوں میں منافع پر ٹیکس چھوٹ جیسے اضافی فوائد ملتے ہیں۔ کئی اقسام ہیں: ریٹائرمنٹ (Pensia) کے لیے، عمومی سرمایہ کاری، یا مخصوص مقاصد کے لیے۔ یہ کسی بھی بینک یا لائسنس یافتہ مالیاتی ادارے میں کھولا جا سکتا ہے۔ یہ ایک اہم مالی فیصلہ ہے، مالیاتی مشیر سے مشورہ کرنے پر غور کریں۔",
    t15v: "https://www.youtube.com/results?search_query=kupa+gemel+israel+olim+savings+english",
    t15g: "https://www.gov.il/en/departments/ministry_of_finance"
  },
  he: {
    phase1Title: "שלב 1 – מסמכים חיוניים עם ההגעה",
    phase2Title: "שלב 2 – בריאות ומגורים",
    phase3Title: "שלב 3 – זכויות וסיוע ממשלתי",
    phase4Title: "שלב 4 – עבודה ורישיונות",
    phase5Title: "שלב 5 – קליטה ושלבים אופציונליים",

    t1n: "קבלת תעודת עולה",
    t1d: "המסמך הרשמי לעולה חדש, ניתן בנמל התעופה או במשרד העלייה והקליטה.",
    t1x: "תעודת העולה היא המסמך הראשון שתקבלו כעולים חדשים בישראל. היא ניתנת על ידי הסוכנות היהודית או משרד העלייה והקליטה בנמל התעופה בן גוריון עם ההגעה, או בקונסוליה לפני הטיסה. המסמך מאשר את מעמדכם כעולה חדש ומעניק גישה לכל הטבות הקליטה של המדינה: סל קליטה, אולפן, פטורים ממס ועוד. שמרו עליה במקום בטוח!",
    t1v: "https://www.youtube.com/results?search_query=teudat+oleh+aliyah+explained",
    t1g: "https://www.gov.il/he/departments/ministry_of_aliyah_and_integration",

    t2n: "פתיחת חשבון בנק ישראלי",
    t2d: "נדרש לקבלת תשלומי סל הקליטה. בנקים מומלצים: הפועלים או לאומי.",
    t2x: "כדי לקבל את תשלומי סל הקליטה החודשיים נדרש חשבון בנק ישראלי. הבנקים הפופולריים ביותר בקרב עולים הם בנק הפועלים ובנק לאומי. לפתיחת החשבון תזדקקו לתעודת העולה, מסמך מזהה (דרכון או תעודת זהות זמנית), ולעיתים אישור מגורים. בבנקים רבים יש נציגים דוברי עברית ואנגלית ותמיכה מיוחדת לעולים חדשים.",
    t2v: "https://www.youtube.com/results?search_query=open+bank+account+israel+new+olim",
    t2g: "https://www.bankofisrael.org.il/en/",

    t3n: "הנפקת תעודת זהות",
    t3d: "תעודת הזהות הישראלית שלכם, מונפקת במשרד הפנים.",
    t3x: "תעודת הזהות היא המסמך הרשמי המזהה אתכם בישראל. היא מונפקת במשרד הפנים. בנמל התעופה תקבלו מסמך זמני, אך עליכם לפנות לסניף משרד הפנים בימים הראשונים כדי לקבל את תעודת הזהות הקבועה. מומלץ לקבוע תור מראש דרך אפליקציית MyVisit או האתר הרשמי כדי להימנע מהמתנה ארוכה. מסמך זה נדרש כמעט לכל ההליכים האחרים.",
    t3v: "https://www.youtube.com/results?search_query=teudat+zehut+misrad+hapnim+aliyah+english",
    t3g: "https://www.gov.il/he/departments/ministry_of_interior",

    t4n: "הרשמה לביטוח לאומי",
    t4d: "ביטוח לאומי – חיוני לכיסוי בריאותי מיידי.",
    t4x: "המוסד לביטוח לאומי הוא הגוף האחראי על הביטחון הסוציאלי בישראל. ההרשמה מפעילה את הזכות שלכם לבחור קופת חולים, מקנה כיסוי בגין תאונות עבודה, ומזכה אתכם בזכאות להטבות עתידיות. כעולים חדשים אתם פטורים מתשלום בחודשים הראשונים. ניתן להירשם באינטרנט או בכל סניף של הביטוח הלאומי בהצגת תעודת העולה ותעודת הזהות.",
    t4v: "https://www.youtube.com/results?search_query=bituach+leumi+registration+new+olim+english",
    t4g: "https://www.btl.gov.il/Hebrew%20Homepage/Pages/default.aspx",

    t5n: "בחירת קופת חולים",
    t5d: "הרשמה לאחת מקופות החולים (כללית, מכבי, מאוחדת או לאומית).",
    t5x: "בישראל קיימת מערכת בריאות ציבורית חובה המבוססת על 4 קופות חולים: כללית (הגדולה ביותר, כיסוי רחב), מכבי (פופולרית מאוד), מאוחדת ולאומית. כעולים חדשים אתם פטורים מדמי החבר בחודשים הראשונים. ניתן להחליף קופת חולים פעם בשנה. לכל קופה רשת רופאים ובתי מרקחת משלה.",
    t5v: "https://www.youtube.com/results?search_query=kupat+holim+israel+which+to+choose+english",
    t5g: "https://www.gov.il/he/service/choose_health_fund",

    t6n: "רישום כתובת קבע",
    t6d: "עדכון הכתובת הרשמית לקבלת הודעות ודואר ממשלתי.",
    t6x: "רישום כתובת הקבע במשרד הפנים חיוני. כל המסמכים, הודעות הביטוח הלאומי, פניות העירייה ומערכת החינוך נשלחים לכתובת הרשומה במערכת. בנוסף, עיר המגורים קובעת לאיזו עירייה תשלמו ארנונה ובאילו בתי ספר יוכלו ילדיכם להירשם. הרישום מתבצע במשרד הפנים עם אישור מגורים.",
    t6v: "https://www.youtube.com/results?search_query=register+address+israel+misrad+hapnim+english",
    t6g: "https://www.gov.il/he/departments/ministry_of_interior",

    t7n: "רישום ילדים למערכת החינוך",
    t7d: "תיאום מול הרשות המקומית לשיבוץ בבתי ספר ציבוריים.",
    t7x: "החינוך הציבורי בישראל חינם וחובה מגיל 3 ועד סוף התיכון. לרישום ילדיכם יש לפנות לעירייה בעיר מגוריכם עם: תעודת העולה של הילד, תעודת זהות או דרכון, ואישור מגורים. יש בתי ספר עם תוכניות מיוחדות לילדי עולים המקלות על הקליטה בעברית. ברשויות רבות יש רכזי קליטה דוברי אנגלית ושפות נוספות.",
    t7v: "https://www.youtube.com/results?search_query=enroll+children+school+israel+aliyah",
    t7g: "https://edu.gov.il/en",

    t8n: "בקשה לסל קליטה",
    t8d: "סל הסיוע הכלכלי הממשלתי המופקד מדי חודש.",
    t8x: "סל הקליטה הוא הסיוע הכלכלי המרכזי שמעניקה מדינת ישראל לעולים חדשים בשנה הראשונה. הוא כולל תשלום ראשוני בנמל התעופה ולאחריו 6 תשלומים חודשיים המופקדים לחשבון הבנק שלכם. הסכום משתנה בהתאם למצב המשפחתי ומספר הילדים. כדי להפעיל אותו יש להירשם במשרד הקליטה ולקשר את חשבון הבנק. אל תפספסו את המועד!",
    t8v: "https://www.youtube.com/results?search_query=sal+klita+absorption+basket+israel+explained",
    t8g: "https://www.gov.il/he/departments/guides/sal_klita",

    t9n: "הרשמה למשרד הקליטה",
    t9d: "משרד העלייה והקליטה, להפעלת שוברי סיוע לימודי ולדיור.",
    t9x: "משרד העלייה והקליטה הוא הגוף המרכזי עבור עולים. ההרשמה מפעילה: שובר האולפן (קורס עברית חינם), סיוע כלכלי נוסף, שוברי דיור והכוונה כללית. יש להם סניפים בכל הערים הגדולות בישראל ורבים מהעובדים דוברי אנגלית. זהו אחד הצעדים הראשונים שכדאי לעשות מיד עם ההתיישבות.",
    t9v: "https://www.youtube.com/results?search_query=misrad+haklita+register+benefits+english",
    t9g: "https://www.gov.il/he/departments/ministry_of_aliyah_and_integration",

    t10n: "הרשמה לאולפן",
    t10d: "השובר החינמי הרשמי שלכם לקורס עברית אינטנסיבי.",
    t10x: "האולפן הוא קורס העברית המודרנית האינטנסיבי שמדינת ישראל מציעה בחינם לכל העולים החדשים. הלימודים מתקיימים לרוב בבוקר, מימי ראשון עד חמישי, במשך 5 חודשים. יש אולפנים בכל רחבי הארץ. ניתן לבחור בין אולפן ממשלתי, עירוני או פרטי (מסובסד). השובר מתקבל במשרד הקליטה ויש לנצל אותו תוך 18 חודשים מהעלייה. העברית היא המפתח לקליטה!",
    t10v: "https://www.youtube.com/results?search_query=ulpan+hebrew+course+israel+free+olim",
    t10g: "https://www.gov.il/he/service/ulpan-for-new-immigrants",

    t11n: "בקשה להכרה בתעודות מקצועיות",
    t11d: "אימות תואר מקצועי מול הגופים הממשלתיים המתאימים.",
    t11x: "אם יש לכם תואר אקדמי ממדינת המוצא ואתם מעוניינים לעסוק במקצועכם בישראל, עליכם לבקש הכרה מהגוף הרלוונטי. עבור רופאים – משרד הבריאות, עבור עורכי דין – לשכת עורכי הדין, עבור מהנדסים או אדריכלים – משרד הבינוי, וכן הלאה. התהליך עשוי להימשך חודשים ולכלול מבחנים או התמחות. מומלץ לבדוק את הדרישות הספציפיות למקצועכם בהקדם האפשרי.",
    t11v: "https://www.youtube.com/results?search_query=professional+degree+recognition+israel+english",
    t11g: "https://www.gov.il/he/departments/guides/recognition-of-professional-qualifications",

    t12n: "קבלת רישיון נהיגה ישראלי",
    t12d: "החלפה רשמית של רישיון הנהיגה הזר במשרדי משרד הרישוי.",
    t12x: "כעולים חדשים זכאים להחליף את רישיון הנהיגה הזר שלכם ברישיון ישראלי ללא צורך במבחן עיוני או מעשי, בתנאי שהרישיון בתוקף לפחות שנתיים. ההליך מתבצע במשרד הרישוי. תזדקקו ל: הרישיון המקורי, תעודת עולה, תעודת זהות, בדיקה רפואית בסיסית ותשלום אגרה. להטבה זו יש מגבלת זמן: יש לבצע זאת בתוך 3 השנים הראשונות לעלייה.",
    t12v: "https://www.youtube.com/results?search_query=convert+driving+license+israel+english+olim",
    t12g: "https://www.gov.il/he/service/converting-foreign-driving-license",

    t13n: "הרשמה לשירות התעסוקה",
    t13d: "רישום בלשכת התעסוקה לגישה למאגרי דרושים.",
    t13x: "לשכת התעסוקה היא הגוף הממשלתי המחבר בין עובדים למעסיקים בישראל. ההרשמה מקנה גישה למאגרי דרושים, קורסי הכשרה מסובסדים, ובמקרים מסוימים סיוע כלכלי בזמן חיפוש עבודה. ניתן גם להשתתף ביריד תעסוקה מיוחד לעולים. השירות זמין בערים המרכזיות ומציע משאבים מקוונים במספר שפות.",
    t13v: "https://www.youtube.com/results?search_query=lishkat+taasuka+employment+service+israel+english",
    t13g: "https://www.gov.il/he/departments/the_employment_service",

    t14n: "הרשמה לרשות המקומית",
    t14d: "טיפול בארנונה ורישום כתושב העיר.",
    t14x: "לכל עיר בישראל יש עירייה משלה שבה עליכם להירשם כתושבים. הרישום מאפשר: בקשה להנחות בארנונה, גישה לשירותים עירוניים, רישום ילדים לבתי ספר וגני ילדים מקומיים, וקבלת התכתבויות רשמיות. בעיריות רבות יש מחלקות קליטה מיוחדות עם צוות דובר אנגלית לסיוע לעולים חדשים.",
    t14v: "https://www.youtube.com/results?search_query=iriya+municipality+israel+register+olim+english",
    t14g: "https://www.gov.il/he/departments/ministry_of_interior",

    t15n: "פתיחת קופת גמל",
    t15d: "מסלולי חיסכון עם הטבות מס ייחודיות לעולים חדשים.",
    t15x: "קופת גמל היא קרן חיסכון לפנסיה או למטרה כללית המעניקה הטבות מס משמעותיות בישראל. כעולים חדשים תיהנו מהטבות נוספות כגון פטור ממס על התשואות בשנים הראשונות. קיימים סוגים שונים: לפנסיה, להשקעה כללית או למטרה. ניתן לפתוח בכל בנק או גוף פיננסי מורשה. זוהי החלטה כלכלית חשובה – שקלו להתייעץ עם יועץ פיננסי.",
    t15v: "https://www.youtube.com/results?search_query=kupa+gemel+israel+olim+savings+english",
    t15g: "https://www.gov.il/he/departments/ministry_of_finance"
  }
};

// ─────────────────────────────────────────────────────────────
//  RESPUESTAS DEL ASISTENTE IA – palabras clave en cada idioma
//  para que la IA entienda preguntas en Español, Inglés, Chino,
//  Hindi, Francés, Árabe, Bengalí, Ruso, Portugués, Urdu y Hebreo.
// ─────────────────────────────────────────────────────────────
const AI_RESPONSES = {
  es: [
    { keywords: ["teudat oleh", "certificado de oleh", "certificado de aliá", "certificado de alia"], response: "📜 **Teudat Oleh:** Es el certificado que te acredita oficialmente como nuevo inmigrante (Oleh). Te lo entrega el Sochnut o el Ministerio de Aliá al llegar (aeropuerto o consular). Es la base para tramitar todos tus beneficios: Sal Klita, Ulpán, exenciones impositivas y más. ¡Guardalo bien!" },
    { keywords: ["banco", "cuenta bancaria", "dinero", "hapoalim", "leumi", "discount"], response: "🏦 **Cuenta Bancaria:** Para abrirla necesitás tu Teudat Oleh y la Teudat Zehut temporal (o pasaporte). Es obligatoria para recibir la Sal Klita. Los bancos más elegidos por Olim son Hapoalim y Leumi, muchos con atención en español." },
    { keywords: ["zehut", "documento de identidad", "dni", "identidad", "pnim", "misrad hapnim"], response: "🪪 **Teudat Zehut:** Es tu DNI israelí, se tramita en el Misrad Hapnim (Ministerio del Interior). En el aeropuerto recibís un documento temporal; andá a una oficina dentro de los primeros días para obtener el definitivo. Pedí turno previo en la app **MyVisit**." },
    { keywords: ["bituach leumi", "seguro social", "seguridad social", "instituto nacional de seguros"], response: "🛡️ **Bituach Leumi:** Es el Instituto Nacional de Seguridad Social. Al registrarte activás tu derecho a elegir Kupat Holim, quedás cubierto ante accidentes laborales y accedés a futuras prestaciones. Como Olé Jadash tenés exenciones los primeros meses." },
    { keywords: ["salud", "kupat", "médico", "medico", "clalit", "maccabi", "meuhedet", "obra social", "seguro medico"], response: "🏥 **Kupat Holim (Seguro de Salud):** La salud pública se gestiona a través de 4 proveedores: Clalit, Maccabi, Meuhedet o Leumit. El alta se hace vía Bituach Leumi. ¡Es gratis los primeros meses para Olim!" },
    { keywords: ["dirección", "direccion", "domicilio", "registrar dirección", "registrar direccion"], response: "🏠 **Registrar dirección permanente:** Se hace en el Misrad Hapnim con un comprobante de vivienda. De tu dirección depende a qué municipio (Iriya) pagás Arnona y en qué escuelas pueden anotarse tus hijos. Ahí llegan todas las notificaciones oficiales." },
    { keywords: ["escuela", "colegio", "hijos", "niños", "ninos", "educación", "educacion", "inscripción escolar", "inscripcion escolar"], response: "🎒 **Inscribir hijos en la escuela:** La educación pública es gratuita y obligatoria desde los 3 años. Andá a la Iriya (municipio) de tu ciudad con la Teudat Oleh del niño, documento de identidad y comprobante de domicilio. Hay escuelas con programas especiales para hijos de Olim." },
    { keywords: ["sal klita", "canasta", "ayuda económica", "ayuda economica", "plata", "absorcion", "absorción"], response: "💰 **Sal Klita (Canasta de Absorción):** Es la ayuda económica inicial. El primer pago se entrega en el aeropuerto. Los siguientes 6 pagos mensuales se depositan automáticamente en tu cuenta cuando la registrás en el Misrad Haklita." },
    { keywords: ["misrad haklita", "ministerio de absorción", "ministerio de absorcion", "ministerio de alia"], response: "🏛️ **Misrad Haklita:** Es el Ministerio de Absorción, la institución central para los Olim. Al registrarte activás el voucher del Ulpán, asistencia económica adicional, vouchers de vivienda y orientación general. Hacelo apenas te instales." },
    { keywords: ["ulpan", "ulpán", "hebreo", "idioma", "estudiar hebreo", "curso de hebreo"], response: "📚 **Ulpán (Curso de Hebreo):** Tenés derecho a un curso intensivo gratuito. Pedí tu voucher oficial en el Misrad Haklita dentro de tus primeros 18 meses. ¡Es clave para integrarte!" },
    { keywords: ["título", "titulo", "profesión", "profesion", "reconocimiento de título", "reconocimiento de titulo", "colegiado", "colegiatura"], response: "🎓 **Reconocimiento de título profesional:** Si tenés un título universitario y querés ejercer en Israel, tramitá el reconocimiento ante el organismo correspondiente a tu profesión (Misrad Habriut para médicos, Lishkat Orche Hadin para abogados, etc). Puede llevar meses e incluir exámenes." },
    { keywords: ["licencia de conducir", "licencia", "conducir", "manejar", "carnet de conducir"], response: "🚗 **Licencia de conducir israelí:** Como Olé Jadash podés canjear tu licencia extranjera por una israelí sin rendir examen, si tiene al menos 2 años de antigüedad. Se hace en el Misrad Harishui, con revisión médica básica. Tenés 3 años de plazo desde tu Aliá." },
    { keywords: ["empleo", "trabajo", "lishkat taasuka", "bolsa de trabajo", "buscar trabajo"], response: "💼 **Servicio de Empleo (Lishkat Taasuka):** Al inscribirte accedés a bolsas de trabajo, cursos de capacitación subsidiados y, en algunos casos, ayuda económica mientras buscás empleo. También hay ferias de empleo especiales para Olim." },
    { keywords: ["municipio", "iriya", "arnona", "residente"], response: "🏙️ **Registro en el municipio (Iriya):** Registrate como residente para acceder a descuentos en el Arnona (impuesto municipal), servicios municipales e inscripción escolar. Muchas Iriyot tienen departamentos de absorción con personal que habla español." },
    { keywords: ["kupa gemel", "fondo de ahorro", "fondo de pensión", "fondo de pension", "jubilación", "jubilacion", "pension"], response: "💹 **Kupa Gemel (fondo de ahorro):** Es un fondo para la vejez u otros objetivos con importantes ventajas fiscales para Olim Jadashim, incluyendo exenciones impositivas sobre rendimientos los primeros años. Se abre en cualquier banco o entidad financiera autorizada." }
  ],
  en: [
    { keywords: ["teudat oleh", "oleh certificate", "immigrant certificate"], response: "📜 **Teudat Oleh:** This is the official certificate that identifies you as a new immigrant (Oleh). You receive it upon arrival in Israel, at the airport or at the Misrad Haklita. It's the base document for claiming all your benefits: Sal Klita, Ulpan, tax breaks, and more. Keep it safe — you'll need it often!" },
    { keywords: ["bank", "bank account", "money", "hapoalim", "leumi", "discount"], response: "🏦 **Bank Account Setup:** You need your Teudat Oleh and temporary Teudat Zehut (or passport). This is mandatory to receive your Sal Klita payments. Popular options among Olim include Hapoalim and Leumi, many with English-speaking staff." },
    { keywords: ["zehut", "id card", "id", "identity", "pnim", "misrad hapnim"], response: "🪪 **Teudat Zehut:** Your Israeli national ID card, processed at the Misrad Hapnim (Ministry of the Interior). You get a temporary document at the airport; visit an office within your first days to get the permanent one. Book ahead via the **MyVisit** app." },
    { keywords: ["bituach leumi", "national insurance", "social security"], response: "🛡️ **Bituach Leumi:** Israel's National Insurance Institute. Registering activates your right to choose a Kupat Holim, covers you for work accidents, and qualifies you for future benefits. New Olim are exempt from payments during their initial months." },
    { keywords: ["health", "kupat", "medical", "doctor", "clalit", "maccabi", "meuhedet", "health insurance"], response: "🏥 **Healthcare (Kupat Holim):** Israel's system runs through 4 health funds: Clalit, Maccabi, Meuhedet, or Leumit. Register via Bituach Leumi. It is fully subsidized for Olim during your initial months!" },
    { keywords: ["address", "permanent address", "residence", "register address"], response: "🏠 **Register your permanent address:** Do this at the Misrad Hapnim with proof of residence. Your address determines which municipality (Iriya) you pay Arnona to and which schools your kids can enroll in. All official notifications are sent there." },
    { keywords: ["school", "children", "kids", "education", "enroll children", "enroll kids"], response: "🎒 **Enroll children in school:** Public education is free and compulsory from age 3. Go to your city's Iriya with the child's Teudat Oleh, ID or passport, and proof of address. Some schools have special programs to help Olim children integrate." },
    { keywords: ["sal klita", "basket", "financial aid", "aid", "payments", "absorption"], response: "💰 **Sal Klita (Absorption Basket):** Initial financial grant. Your first payment is given at the airport. The remaining 6 monthly payments are wired to your Israeli bank account once linked at Misrad Haklita." },
    { keywords: ["misrad haklita", "ministry of aliyah", "ministry of absorption"], response: "🏛️ **Misrad Haklita:** The Ministry of Aliyah and Integration, the central institution for Olim. Registering activates the Ulpan voucher, additional financial aid, housing vouchers, and general guidance. It's one of the first things to do once you settle in." },
    { keywords: ["ulpan", "hebrew", "language", "learn hebrew", "hebrew class", "hebrew course"], response: "📚 **Ulpan (Hebrew School):** New Olim get a voucher for a free intensive Hebrew course. Claim this voucher at your local Misrad Haklita office within your first 18 months." },
    { keywords: ["degree", "credential", "profession", "recognition", "professional license", "credential recognition"], response: "🎓 **Credential recognition:** If you have a university degree and want to practice your profession in Israel, apply for recognition at the relevant body (Misrad Habriut for doctors, Lishkat Orche Hadin for lawyers, etc). The process can take months and may include exams." },
    { keywords: ["driver", "driver's license", "drivers license", "driving", "car license"], response: "🚗 **Israeli driver's license:** As a new Oleh you can exchange your foreign license for an Israeli one without taking a test, if it's at least 2 years old. It's done at Misrad Harishui with a basic medical check. You have 3 years from your Aliyah to do this." },
    { keywords: ["employment", "job", "jobs", "work", "lishkat taasuka", "job search"], response: "💼 **Employment Service (Lishkat Taasuka):** Registering gives you access to job boards, subsidized training courses, and in some cases financial help while job hunting. There are also job fairs specifically for Olim." },
    { keywords: ["municipality", "iriya", "arnona", "resident", "local municipality"], response: "🏙️ **Register at the local municipality (Iriya):** Register as a resident to access Arnona (property tax) discounts, municipal services, and school enrollment. Many municipalities have absorption departments with English-speaking staff." },
    { keywords: ["kupa gemel", "savings fund", "pension", "retirement fund", "savings"], response: "💹 **Kupa Gemel (savings fund):** A retirement or general savings fund offering major tax advantages for new Olim, including exemptions on returns during your first years. It can be opened at any bank or licensed financial institution." }
  ],
  zh: [
    { keywords: ["银行", "账户", "账号", "钱", "hapoalim", "leumi"], response: "🏦 **开设银行账户:** 您需要 Teudat Oleh 和临时的 Teudat Zehut。这是接收 Sal Klita 存款的必要条件。最受欢迎的银行是 Hapoalim、Leumi 和 Discount Bank。" },
    { keywords: ["sal klita", "补助", "补贴", "安置", "经济援助"], response: "💰 **Sal Klita（安置补助）:** 这是国家提供的初期经济支持。第一笔款项在机场发放，之后的6笔月付款会在您于 Misrad Haklita 登记后自动存入银行账户。" },
    { keywords: ["ulpan", "希伯来语", "语言", "学习", "课程"], response: "📚 **Ulpan（希伯来语课程）:** 您有权获得免费的强化希伯来语课程。请在阿利亚后的18个月内前往 Misrad Haklita 办事处申请官方代金券。" },
    { keywords: ["zehut", "身份证", "证件", "身份"], response: "🪪 **Teudat Zehut:** 这是您的以色列身份证，在 Misrad Hapnim（内政部）办理。建议提前通过 **MyVisit** 应用预约，以避免长时间等待！" },
    { keywords: ["健康", "医疗", "kupat", "医生", "clalit", "maccabi"], response: "🏥 **医疗保险（Kupat Holim）:** 公共医疗由四家机构管理：Clalit、Maccabi、Meuhedet 或 Leumit。登记通过 Bituach Leumi 办理。新移民最初几个月完全免费！" }
  ],
  hi: [
    { keywords: ["बैंक", "खाता", "पैसा", "hapoalim", "leumi"], response: "🏦 **बैंक खाता खोलना:** आपको Teudat Oleh और अस्थायी Teudat Zehut चाहिए। यह Sal Klita भुगतान पाने के लिए अनिवार्य है। लोकप्रिय बैंक: Hapoalim, Leumi और Discount Bank।" },
    { keywords: ["sal klita", "टोकरी", "सहायता", "आर्थिक"], response: "💰 **Sal Klita (अवशोषण टोकरी):** यह प्रारंभिक आर्थिक सहायता है। पहला भुगतान हवाई अड्डे पर मिलता है। शेष 6 मासिक भुगतान Misrad Haklita में पंजीकरण के बाद आपके बैंक खाते में जमा होंगे।" },
    { keywords: ["ulpan", "हिब्रू", "भाषा", "पढ़ाई", "कोर्स"], response: "📚 **Ulpan (हिब्रू कोर्स):** आपको मुफ्त गहन हिब्रू कोर्स का अधिकार है। अपने पहले 18 महीनों के भीतर Misrad Haklita कार्यालय में आधिकारिक वाउचर के लिए आवेदन करें।" },
    { keywords: ["zehut", "दस्तावेज़", "पहचान", "कार्ड"], response: "🪪 **Teudat Zehut:** यह आपका इज़राइली पहचान पत्र है। Misrad Hapnim (आंतरिक मंत्रालय) में जारी होता है। लंबे इंतज़ार से बचने के लिए **MyVisit** ऐप में पहले से अपॉइंटमेंट लें!" },
    { keywords: ["स्वास्थ्य", "kupat", "डॉक्टर", "clalit", "maccabi"], response: "🏥 **स्वास्थ्य बीमा (Kupat Holim):** सार्वजनिक स्वास्थ्य सेवा 4 प्रदाताओं के माध्यम से संचालित होती है: Clalit, Maccabi, Meuhedet या Leumit। पंजीकरण Bituach Leumi के माध्यम से होता है। नए ओलिम के लिए शुरुआती महीनों में यह मुफ्त है!" }
  ],
  fr: [
    { keywords: ["banque", "compte", "argent", "hapoalim", "leumi"], response: "🏦 **Ouverture de compte bancaire :** Vous avez besoin de votre Teudat Oleh et d'une Teudat Zehut temporaire. C'est obligatoire pour recevoir la Sal Klita. Les banques les plus choisies sont Hapoalim, Leumi et Discount Bank." },
    { keywords: ["sal klita", "panier", "aide", "financière", "absorption"], response: "💰 **Sal Klita (panier d'absorption) :** C'est l'aide économique initiale. Le premier versement est remis à l'aéroport. Les 6 versements mensuels suivants seront déposés automatiquement sur votre compte une fois enregistré au Misrad Haklita." },
    { keywords: ["ulpan", "hébreu", "langue", "étudier", "cours"], response: "📚 **Ulpan (cours d'hébreu) :** Vous avez droit à un cours d'hébreu intensif gratuit. Demandez votre bon officiel au bureau du Misrad Haklita dans les 18 premiers mois." },
    { keywords: ["zehut", "document", "identité", "carte", "pnim"], response: "🪪 **Teudat Zehut :** C'est votre carte d'identité israélienne. Elle est délivrée au Misrad Hapnim (ministère de l'Intérieur). Prenez rendez-vous à l'avance via l'application **MyVisit** pour éviter les longues attentes !" },
    { keywords: ["santé", "kupat", "médecin", "clalit", "maccabi"], response: "🏥 **Assurance santé (Kupat Holim) :** La santé publique est gérée par 4 caisses : Clalit, Maccabi, Meuhedet ou Leumit. L'inscription se fait via le Bituach Leumi. C'est gratuit les premiers mois pour les Olim !" }
  ],
  ar: [
    { keywords: ["بنك", "حساب", "مال", "hapoalim", "leumi"], response: "🏦 **فتح حساب بنكي:** تحتاج إلى Teudat Oleh وTeudat Zehut المؤقتة. هذا إلزامي لاستلام دفعات Sal Klita. البنوك الأكثر اختيارًا هي Hapoalim وLeumi وBank Discount." },
    { keywords: ["sal klita", "سلة", "مساعدة", "استيعاب"], response: "💰 **Sal Klita (سلة الاستيعاب):** هي المساعدة المالية الأولية. تُمنح الدفعة الأولى في المطار. تُودع الدفعات الشهرية الست التالية تلقائيًا في حسابك بعد التسجيل في Misrad Haklita." },
    { keywords: ["ulpan", "عبري", "لغة", "دراسة", "دورة"], response: "📚 **Ulpan (دورة العبرية):** يحق لك الحصول على دورة عبرية مكثفة مجانية. اطلب قسيمتك الرسمية من مكتب Misrad Haklita خلال أول 18 شهرًا." },
    { keywords: ["zehut", "وثيقة", "هوية", "بطاقة", "pnim"], response: "🪪 **Teudat Zehut:** هي بطاقة هويتك الإسرائيلية. تُصدر في Misrad Hapnim (وزارة الداخلية). احجز موعدًا مسبقًا عبر تطبيق **MyVisit** لتجنب الانتظار الطويل!" },
    { keywords: ["صحة", "kupat", "طبيب", "clalit", "maccabi"], response: "🏥 **التأمين الصحي (Kupat Holim):** تُدار الصحة العامة عبر 4 مزودين: Clalit وMaccabi وMeuhedet أو Leumit. يتم التسجيل عبر Bituach Leumi. إنه مجاني للعولين خلال الأشهر الأولى!" }
  ],
  bn: [
    { keywords: ["ব্যাংক", "অ্যাকাউন্ট", "টাকা", "hapoalim", "leumi"], response: "🏦 **ব্যাংক অ্যাকাউন্ট খোলা:** আপনার Teudat Oleh এবং সাময়িক Teudat Zehut প্রয়োজন। Sal Klita পেমেন্ট পেতে এটি বাধ্যতামূলক। জনপ্রিয় ব্যাংক: Hapoalim, Leumi এবং Discount Bank।" },
    { keywords: ["sal klita", "ঝুড়ি", "সহায়তা", "আর্থিক"], response: "💰 **Sal Klita (শোষণ ঝুড়ি):** এটি প্রাথমিক আর্থিক সহায়তা। প্রথম পেমেন্ট বিমানবন্দরে দেওয়া হয়। Misrad Haklita তে নিবন্ধনের পর বাকি ৬টি মাসিক পেমেন্ট স্বয়ংক্রিয়ভাবে আপনার অ্যাকাউন্টে জমা হবে।" },
    { keywords: ["ulpan", "হিব্রু", "ভাষা", "পড়াশোনা", "কোর্স"], response: "📚 **Ulpan (হিব্রু কোর্স):** আপনি বিনামূল্যে নিবিড় হিব্রু কোর্সের অধিকারী। প্রথম ১৮ মাসের মধ্যে Misrad Haklita অফিসে অফিসিয়াল ভাউচারের জন্য আবেদন করুন।" },
    { keywords: ["zehut", "নথি", "পরিচয়", "কার্ড"], response: "🪪 **Teudat Zehut:** এটি আপনার ইসরায়েলি পরিচয়পত্র। Misrad Hapnim (স্বরাষ্ট্র মন্ত্রণালয়) এ ইস্যু হয়। দীর্ঘ অপেক্ষা এড়াতে **MyVisit** অ্যাপে আগে থেকে অ্যাপয়েন্টমেন্ট নিন!" },
    { keywords: ["স্বাস্থ্য", "kupat", "ডাক্তার", "clalit", "maccabi"], response: "🏥 **স্বাস্থ্য বীমা (Kupat Holim):** সরকারি স্বাস্থ্যসেবা ৪টি প্রতিষ্ঠানের মাধ্যমে পরিচালিত হয়: Clalit, Maccabi, Meuhedet বা Leumit। নিবন্ধন Bituach Leumi এর মাধ্যমে হয়। নতুন ওলিমদের জন্য প্রথম কয়েক মাস বিনামূল্যে!" }
  ],
  ru: [
    { keywords: ["банк", "счёт", "счет", "деньги", "hapoalim", "leumi"], response: "🏦 **Открытие банковского счёта:** Вам нужны Теудат Оле и временный Теудат Зеут. Это обязательно для получения выплат Саль Клита. Популярные банки: Апоалим, Леуми и Discount Bank." },
    { keywords: ["sal klita", "корзина", "помощь", "абсорбция"], response: "💰 **Саль Клита (корзина абсорбции):** Это начальная финансовая помощь. Первая выплата производится в аэропорту. Следующие 6 ежемесячных выплат будут автоматически зачисляться на счёт после регистрации в Мисрад ха-Клита." },
    { keywords: ["ulpan", "ульпан", "иврит", "язык", "курс"], response: "📚 **Ульпан (курс иврита):** Вы имеете право на бесплатный интенсивный курс иврита. Получите официальный ваучер в офисе Мисрад ха-Клита в течение первых 18 месяцев." },
    { keywords: ["zehut", "зеут", "документ", "удостоверение", "pnim"], response: "🪪 **Теудат Зеут:** Это ваше израильское удостоверение личности. Оформляется в Мисрад ха-Пним (МВД). Запишитесь заранее через приложение **MyVisit**, чтобы избежать долгого ожидания!" },
    { keywords: ["здоровье", "kupat", "врач", "clalit", "maccabi"], response: "🏥 **Медицинская страховка (Kupat Holim):** Государственное здравоохранение управляется 4 кассами: Клалит, Маккаби, Меухедет или Леумит. Регистрация через Битуах Леуми. Для репатриантов это бесплатно в первые месяцы!" }
  ],
  pt: [
    { keywords: ["banco", "conta", "dinheiro", "hapoalim", "leumi"], response: "🏦 **Abertura de conta bancária:** Você precisa da sua Teudat Oleh e da Teudat Zehut temporária. É obrigatório para receber os pagamentos da Sal Klita. Os bancos mais escolhidos são Hapoalim, Leumi e Discount Bank." },
    { keywords: ["sal klita", "cesta", "ajuda", "absorção"], response: "💰 **Sal Klita (cesta de absorção):** É a ajuda econômica inicial. O primeiro pagamento é entregue no aeroporto. Os 6 pagamentos mensais seguintes serão depositados automaticamente após o registro no Misrad Haklita." },
    { keywords: ["ulpan", "hebraico", "idioma", "estudar", "curso"], response: "📚 **Ulpan (curso de hebraico):** Você tem direito a um curso intensivo de hebraico gratuito. Solicite seu voucher oficial no escritório do Misrad Haklita dentro dos primeiros 18 meses." },
    { keywords: ["zehut", "documento", "identidade", "carteira", "pnim"], response: "🪪 **Teudat Zehut:** É sua carteira de identidade israelense. É emitida no Misrad Hapnim (Ministério do Interior). Agende com antecedência pelo app **MyVisit** para evitar filas longas!" },
    { keywords: ["saúde", "kupat", "médico", "clalit", "maccabi"], response: "🏥 **Plano de saúde (Kupat Holim):** A saúde pública é gerida por 4 fundos: Clalit, Maccabi, Meuhedet ou Leumit. O cadastro é feito via Bituach Leumi. É gratuito nos primeiros meses para Olim!" }
  ],
  ur: [
    { keywords: ["بینک", "اکاؤنٹ", "پیسہ", "hapoalim", "leumi"], response: "🏦 **بینک اکاؤنٹ کھولنا:** آپ کو Teudat Oleh اور عارضی Teudat Zehut درکار ہیں۔ یہ Sal Klita ادائیگیاں حاصل کرنے کے لیے لازمی ہے۔ مقبول بینک: Hapoalim، Leumi اور Discount Bank۔" },
    { keywords: ["sal klita", "ٹوکری", "امداد", "انضمام"], response: "💰 **Sal Klita (انضمام کی ٹوکری):** یہ ابتدائی مالی امداد ہے۔ پہلی ادائیگی ہوائی اڈے پر دی جاتی ہے۔ باقی 6 ماہانہ ادائیگیاں Misrad Haklita میں رجسٹریشن کے بعد خودکار طور پر آپ کے اکاؤنٹ میں جمع ہوں گی۔" },
    { keywords: ["ulpan", "عبرانی", "زبان", "پڑھائی", "کورس"], response: "📚 **Ulpan (عبرانی کورس):** آپ مفت گہرے عبرانی کورس کے حقدار ہیں۔ اپنے پہلے 18 مہینوں کے اندر Misrad Haklita کے دفتر میں سرکاری واؤچر کے لیے درخواست دیں۔" },
    { keywords: ["zehut", "دستاویز", "شناخت", "کارڈ"], response: "🪪 **Teudat Zehut:** یہ آپ کا اسرائیلی شناختی کارڈ ہے۔ Misrad Hapnim (وزارتِ داخلہ) میں جاری ہوتا ہے۔ طویل انتظار سے بچنے کے لیے **MyVisit** ایپ میں پہلے سے اپائنٹمنٹ لیں!" },
    { keywords: ["صحت", "kupat", "ڈاکٹر", "clalit", "maccabi"], response: "🏥 **صحت بیمہ (Kupat Holim):** سرکاری صحت کی خدمات 4 اداروں کے ذریعے فراہم کی جاتی ہیں: Clalit، Maccabi، Meuhedet یا Leumit۔ رجسٹریشن Bituach Leumi کے ذریعے ہوتی ہے۔ نئے اولیم کے لیے ابتدائی مہینے مفت ہیں!" }
  ],
  he: [
    { keywords: ["בנק", "חשבון", "כסף", "hapoalim", "leumi"], response: "🏦 **פתיחת חשבון בנק:** תזדקקו לתעודת העולה ולתעודת זהות זמנית. זהו תנאי הכרחי לקבלת תשלומי סל הקליטה. הבנקים הפופולריים ביותר הם הפועלים, לאומי ודיסקונט." },
    { keywords: ["סל קליטה", "סל", "סיוע", "קליטה"], response: "💰 **סל קליטה:** זהו הסיוע הכלכלי הראשוני. התשלום הראשון ניתן בנמל התעופה. שאר 6 התשלומים החודשיים יופקדו אוטומטית לחשבון לאחר רישום במשרד הקליטה." },
    { keywords: ["אולפן", "עברית", "שפה", "לימוד", "קורס"], response: "📚 **אולפן (קורס עברית):** מגיע לכם קורס עברית אינטנסיבי בחינם. יש להגיש בקשה לשובר הרשמי במשרד הקליטה תוך 18 החודשים הראשונים." },
    { keywords: ["זהות", "מסמך", "תעודה", "פנים"], response: "🪪 **תעודת זהות:** זהו מסמך הזיהוי הרשמי שלכם. מונפק במשרד הפנים. קבעו תור מראש דרך אפליקציית **MyVisit** כדי להימנע מהמתנה ארוכה!" },
    { keywords: ["בריאות", "קופת חולים", "רופא", "כללית", "מכבי"], response: "🏥 **ביטוח בריאות (קופת חולים):** הבריאות הציבורית מנוהלת על ידי 4 קופות: כללית, מכבי, מאוחדת או לאומית. ההרשמה מתבצעת דרך הביטוח הלאומי. זה חינם בחודשים הראשונים לעולים!" }
  ]
};

async function loadStateFromFirestore() {
    if (!userDocRef) return;
    try {
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            state = data.progress || {};
            if (data.preferences && data.preferences.currentLang) {
                lang = data.preferences.currentLang;
            }
        } else {
            state = {};
        }
    } catch (error) {
        console.error("Error al cargar desde Firestore:", error);
    }
}

function showToast() {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.innerText = UI[lang].toastDone;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 2500);
}

function updateProgressUI() {
    let totalTasks = 0;
    let completedTasks = 0;
    PHASES_DATA.forEach(phase => {
        phase.tasks.forEach(task => {
            totalTasks++;
            if (state[task.id] === true || state[task.id] === "true") completedTasks++;
        });
    });
    const percent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const progressTextEl = document.getElementById("progressText");
    const progressPctEl = document.getElementById("progressPct");
    const progressFillEl = document.getElementById("progressFill");
    if (progressTextEl) progressTextEl.innerText = `${completedTasks} ${UI[lang].progressOf} ${totalTasks} ${UI[lang].progressDone}`;
    if (progressPctEl) progressPctEl.innerText = `${percent}%`;
    if (progressFillEl) progressFillEl.style.width = `${percent}%`;
}

function applyLang(l) {
    lang = l;
    const uiL = UI[l];
    const transT = TASKS_T[l];
    document.documentElement.dir = uiL.dir;
    document.documentElement.lang = l;
    document.body.classList.toggle("rtl", uiL.dir === "rtl");
    const elements = {
      hTitle: uiL.title, hSubtitle: uiL.subtitle, langLabel: uiL.langLabel,
      progressTitle: uiL.progressTitle, chatTitle: uiL.chatTitle, chatSubtitle: uiL.chatSub,
      footerText: uiL.footer, chatSendBtn: uiL.sendBtn
    };
    Object.entries(elements).forEach(([id, val]) => {
        const el = document.getElementById(id);
        if (el) el.innerText = val;
    });
    const chatInputEl = document.getElementById("chatInput");
    if (chatInputEl) chatInputEl.placeholder = uiL.chatPlaceholder;

    const container = document.getElementById("checklist");
    if (!container) return;
    container.innerHTML = "";

    PHASES_DATA.forEach(phase => {
        const phaseDiv = document.createElement("div");
        phaseDiv.className = "phase";
        let allPhaseDone = true;
        phase.tasks.forEach(t => { if(!state[t.id]) allPhaseDone = false; });
        if (allPhaseDone) phaseDiv.classList.add("phase-done");

        const phaseHeader = document.createElement("div");
        phaseHeader.className = "phase-header";
        const phaseNum = document.createElement("div");
        phaseNum.className = "phase-number";
        phaseNum.innerText = phase.num;
        const phaseTitle = document.createElement("span");
        phaseTitle.className = "phase-title";
        phaseTitle.innerText = transT[phase.titleKey];
        phaseHeader.appendChild(phaseNum);
        phaseHeader.appendChild(phaseTitle);
        phaseDiv.appendChild(phaseHeader);

        const phaseBody = document.createElement("div");
        phaseBody.className = "phase-body";

        phase.tasks.forEach(task => {
            const taskDiv = document.createElement("div");
            const isLocked = task.prereq && !(state[task.prereq] === true || state[task.prereq] === "true");
            const isDone = state[task.id] === true || state[task.id] === "true";
            taskDiv.className = `task ${isDone ? "done" : ""} ${isLocked ? "locked" : ""}`;
            taskDiv.style.cursor = "pointer";

            const checkbox = document.createElement("div");
            checkbox.className = "task-checkbox";

            // Click en la tarea para marcarla como completada (solo en el área principal, no en los links)
            taskDiv.addEventListener("click", async function(e) {
                // Si el click viene de los links o del botón "ver más", no marcar como completado
                if (e.target.closest(".task-details") || e.target.closest(".task-toggle-btn")) return;
                if (isLocked) return;
                const currentStatus = state[task.id] === true || state[task.id] === "true";
                state[task.id] = !currentStatus;
                applyLang(lang);
                try {
                    await setDoc(userDocRef, { progress: state }, { merge: true });
                    showToast();
                } catch (err) {
                    console.error("Error al sincronizar con Firestore:", err);
                }
            });

            const taskInfo = document.createElement("div");
            taskInfo.className = "task-info";

            const taskName = document.createElement("div");
            taskName.className = "task-name";
            taskName.innerText = transT[task.nameKey];

            const taskDesc = document.createElement("p");
            taskDesc.className = "task-desc";
            taskDesc.innerText = transT[task.descKey];

            taskInfo.appendChild(taskName);
            taskInfo.appendChild(taskDesc);

            // ── BOTÓN "VER MÁS" ──────────────────────────────────────────
            const toggleBtn = document.createElement("button");
            toggleBtn.className = "task-toggle-btn";
            toggleBtn.innerText = uiL.showMore;
            toggleBtn.setAttribute("aria-expanded", "false");

            // ── PANEL EXPANDIBLE CON EXPLICACIÓN + LINKS ─────────────────
            const detailsDiv = document.createElement("div");
            detailsDiv.className = "task-details";
            detailsDiv.style.display = "none";

            // Explicación larga
            const explanationP = document.createElement("p");
            explanationP.className = "task-explanation";
            explanationP.innerText = transT[`${task.id}x`] || "";

            // Links contenedor
            const linksDiv = document.createElement("div");
            linksDiv.className = "task-links";

            // Link a video
            const videoKey = `${task.id}v`;
            if (transT[videoKey]) {
                const videoA = document.createElement("a");
                videoA.href = transT[videoKey];
                videoA.target = "_blank";
                videoA.rel = "noopener noreferrer";
                videoA.className = "task-link task-link-video";
                videoA.innerText = uiL.videoLink;
                linksDiv.appendChild(videoA);
            }

            // Link al gobierno
            const govKey = `${task.id}g`;
            if (transT[govKey]) {
                const govA = document.createElement("a");
                govA.href = transT[govKey];
                govA.target = "_blank";
                govA.rel = "noopener noreferrer";
                govA.className = "task-link task-link-gov";
                govA.innerText = uiL.govLink;
                linksDiv.appendChild(govA);
            }

            detailsDiv.appendChild(explanationP);
            detailsDiv.appendChild(linksDiv);

            // Toggle expandir/cerrar
            toggleBtn.addEventListener("click", function(e) {
                e.stopPropagation();
                const isOpen = detailsDiv.style.display !== "none";
                detailsDiv.style.display = isOpen ? "none" : "block";
                toggleBtn.innerText = isOpen ? uiL.showMore : uiL.showLess;
                toggleBtn.setAttribute("aria-expanded", String(!isOpen));
            });

            taskInfo.appendChild(toggleBtn);
            taskInfo.appendChild(detailsDiv);

            // Mensaje de bloqueo si aplica
            if (isLocked) {
                const lockMsg = document.createElement("div");
                lockMsg.className = "task-lock-msg";
                const parentTaskName = transT[PHASES_DATA.flatMap(p => p.tasks).find(t => t.id === task.prereq)?.nameKey];
                lockMsg.innerText = `${uiL.lockMsg} "${parentTaskName}"`;
                taskInfo.appendChild(lockMsg);
            }

            const badge = document.createElement("span");
            badge.className = `task-priority priority-${task.priority}`;
            badge.innerText = isDone ? uiL.completedLabel : uiL.priority[task.priority];

            taskDiv.appendChild(checkbox);
            taskDiv.appendChild(taskInfo);
            taskDiv.appendChild(badge);
            phaseBody.appendChild(taskDiv);
        });

        phaseDiv.appendChild(phaseBody);
        container.appendChild(phaseDiv);
    });

    updateProgressUI();
}

window.changeLang = async function(value) {
    try {
        lang = value;
        if (userDocRef) {
            await setDoc(userDocRef, { preferences: { currentLang: value } }, { merge: true });
        }
        applyLang(value);
        updateChatWelcomeMessage(currentDisplayName || "Olim");
    } catch (error) {
        console.error("Error al cambiar idioma:", error);
    }
};

window.sendChat = function() {
    const chatInput = document.getElementById("chatInput");
    const chatMessages = document.getElementById("chatMessages");
    if (!chatInput || !chatMessages) return;
    const query = chatInput.value.trim();
    if (!query) return;
    const lowerQuery = query.toLowerCase();

    const userMsgDiv = document.createElement("div");
    userMsgDiv.className = "msg msg-user";
    userMsgDiv.innerText = query;
    chatMessages.appendChild(userMsgDiv);
    chatInput.value = "";
    chatMessages.scrollTop = chatMessages.scrollHeight;

    const typingDiv = document.createElement("div");
    typingDiv.className = "msg msg-bot msg-typing";
    typingDiv.innerText = UI[lang].typingMsg;
    chatMessages.appendChild(typingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    let systemReply = "";
    try {
        // Buscamos coincidencias primero en el idioma actual y, si no hay,
        // repasamos TODOS los idiomas disponibles (por si el usuario escribe
        // en un idioma distinto al seleccionado en la interfaz).
        const pool = AI_RESPONSES[lang] || AI_RESPONSES["es"];
        for (const entry of pool) {
            const found = entry.keywords.some(kw => lowerQuery.includes(kw.toLowerCase()));
            if (found) { systemReply = entry.response; break; }
        }

        if (!systemReply) {
            for (const otherLang of Object.keys(AI_RESPONSES)) {
                if (otherLang === lang) continue;
                const otherPool = AI_RESPONSES[otherLang];
                const match = otherPool.find(entry => entry.keywords.some(kw => lowerQuery.includes(kw.toLowerCase())));
                if (match) { systemReply = match.response; break; }
            }
        }
    } catch (err) {
        console.error("Error buscando respuesta del chat:", err);
    }

    if (!systemReply) {
        systemReply = (UI[lang] && UI[lang].noMatch) || UI["es"].noMatch;
    }

    // finally-style: pase lo que pase arriba, siempre quitamos el "Escribiendo…"
    // y mostramos algo, para que el chat nunca se quede colgado.
    setTimeout(() => {
        typingDiv.remove();
        const botMsgDiv = document.createElement("div");
        botMsgDiv.className = "msg msg-bot";
        botMsgDiv.innerHTML = systemReply.replace(/\n/g, "<br>");
        chatMessages.appendChild(botMsgDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }, 800);
};

function updateChatWelcomeMessage(name) {
    const chatWelcomeEl = document.getElementById("chatWelcome");
    if (chatWelcomeEl) {
        chatWelcomeEl.innerHTML = UI[lang].chatWelcome.replace(
            /(¡Shalom!|Shalom!|沙洛姆！|शालोम!|Shalom !|شالوم!|শালোম!|Шалом!|شالوم!|שלום!)/,
            `$1 <strong>${name}</strong>`
        );
    }
}

async function startApp(email, displayName) {
    currentUserEmail = email.trim().toLowerCase();
    currentDisplayName = (displayName && displayName.trim()) || currentUserEmail.split("@")[0];
    currentUsername = emailToDocId(currentUserEmail);
    userDocRef = doc(db, "users", currentUsername);

    document.getElementById("loginContainer").style.display = "none";
    document.getElementById("mainApp").style.display = "block";

    const userBadge = document.getElementById("userBadge");
    if (userBadge) userBadge.textContent = currentDisplayName;

    lang = "es";
    const langSelect = document.getElementById("langSelect");
    if (langSelect) langSelect.value = lang;

    try {
        await loadStateFromFirestore();
    } catch (e) {
        console.warn("Error de conexión remota, iniciando con base limpia.", e);
    }

    if (langSelect) langSelect.value = lang;
    applyLang(lang);
    updateChatWelcomeMessage(currentDisplayName);
}

function showLoginError(message) {
    const errEl = document.getElementById("loginError");
    if (errEl) {
        errEl.textContent = message;
        errEl.style.display = "block";
    } else {
        alert(message);
    }
}

(function init() {
    const googleLoginBtn = document.getElementById("googleLoginBtn");
    const logoutBtn = document.getElementById("logoutBtn");

    googleLoginBtn?.addEventListener("click", async function() {
        googleLoginBtn.disabled = true;
        googleLoginBtn.textContent = "Connecting…";
        try {
            const result = await signInWithPopup(auth, googleProvider);
            const user = result.user;
            // onAuthStateChanged se encarga de llamar a startApp()
        } catch (error) {
            console.error("Google sign-in error:", error.code, error.message, error);
            let msg = `Couldn't sign in with Google (${error.code || "unknown error"}). Check the browser console for details.`;
            if (error.code === "auth/popup-closed-by-user") {
                msg = "You closed the Google window before finishing sign-in.";
            } else if (error.code === "auth/unauthorized-domain") {
                msg = `This domain (${window.location.hostname || window.location.origin}) isn't authorized in Firebase. Add it under Authentication → Settings → Authorized domains.`;
            } else if (error.code === "auth/operation-not-supported-in-this-environment") {
                msg = "Google sign-in doesn't work when opening the file directly (file://). Serve the app over http:// or https://.";
            } else if (error.code === "auth/popup-blocked") {
                msg = "Your browser blocked the Google popup. Allow popups for this site and try again.";
            } else if (error.code === "auth/network-request-failed") {
                msg = "Network error connecting to Google/Firebase. Check your internet connection.";
            } else if (error.code === "auth/configuration-not-found" || error.code === "auth/operation-not-allowed") {
                msg = "The Google provider isn't enabled in Firebase Authentication (Sign-in method).";
            }
            showLoginError(msg);
        } finally {
            googleLoginBtn.disabled = false;
            googleLoginBtn.innerHTML = googleLoginBtn.dataset.originalHtml || "Sign in with Google";
        }
    });

    logoutBtn?.addEventListener("click", async function() {
        try {
            await signOut(auth);
        } catch (e) {
            console.error("Error al cerrar sesión:", e);
        }
    });

    // Mantiene la sesión iniciada entre recargas (persistencia por defecto de Firebase Auth)
    onAuthStateChanged(auth, function(user) {
        if (user && user.email) {
            startApp(user.email, user.displayName);
        } else {
            currentUserEmail = "";
            currentUsername = "";
            currentDisplayName = "";
            userDocRef = null;
            document.getElementById("loginContainer").style.display = "block";
            document.getElementById("mainApp").style.display = "none";
        }
    });

    if (googleLoginBtn) googleLoginBtn.dataset.originalHtml = googleLoginBtn.innerHTML;

    document.getElementById("chatInput")?.addEventListener("keypress", function(e) {
        if (e.key === "Enter") sendChat();
    });
})();