'use client';

import { useEffect, useMemo, useState } from 'react';

const languages = [
  ['en', 'English'],
  ['zh', '中文'],
  ['es', 'Español'],
  ['ko', '한국어'],
  ['ja', '日本語'],
  ['de', 'Deutsch'],
  ['fr', 'Français'],
  ['pt', 'Português'],
  ['ru', 'Русский'],
  ['ar', 'العربية'],
  ['hi', 'हिन्दी'],
  ['it', 'Italiano'],
];

const translations = {
  zh: {
    Home: '首页',
    Algorithms: '算法',
    Stories: '故事',
    'Community Events': '社区活动',
    About: '关于',
    'My Stories': '我的故事',
    Login: '登录',
    Admin: '管理',
    Logout: '退出',
    Language: '语言',
    'Browse Algorithms': '浏览算法',
    'Learn More': '了解更多',
    'Transparent profiles': '透明档案',
    'Community stories': '社区故事',
    'A.I. Systems in Local Government': '地方政府中的 AI 系统',
    'Tap a step below to see how AI moves through government': '点击下面的步骤，查看 AI 如何进入政府流程',
    'Algorithms Used in Public Services': '公共服务中的算法',
    'Browse the algorithms powering public services in your city.': '浏览你所在城市公共服务使用的算法。',
    'Community Voices & Updates': '社区声音与更新',
    'Real stories and latest news': '真实故事和最新消息',
    "What's Happening?": '最新活动',
    'View community events': '查看社区活动',
    'Algorithm Registry': '算法登记',
    'Browse and explore all registered public algorithms': '浏览所有登记的公共算法',
    Filters: '筛选',
    Filter: '筛选',
    Location: '地点',
    'Use Case': '用途',
    'All Locations': '所有地点',
    'All Use Cases': '所有用途',
    'Apply filters': '应用筛选',
    'Algorithm Profiles': '算法档案',
    Showing: '显示',
    'Share Your Story': '分享你的故事',
    "Community's stories and perspectives on public algorithms": '社区对公共算法的故事和观点',
    City: '城市',
    'All Cities': '所有城市',
    'Community Metrics': '社区指标',
    'Community Impact': '社区影响',
    'Stories Shared': '已分享故事',
    'Algorithms Affected': '涉及算法',
    'States Represented': '涉及地区',
    'Voices United': '参与声音',
    'Upcoming Events': '即将举行',
    'Past Events': '过去活动',
    'All Events': '所有活动',
    Upcoming: '即将举行',
    Past: '过去',
    'Event Type': '活动类型',
    'All event types': '所有活动类型',
    Register: '注册',
    'Share your experience': '分享你的经历',
    'What Happened?': '发生了什么？',
    'Tell us your story': '告诉我们你的故事',
    'About You': '关于你',
    Impact: '影响',
    'Consent & Privacy': '同意与隐私',
    'Read public stories': '阅读公开故事',
    Comments: '评论',
    'Post comment': '发表评论',
    Reply: '回复',
    'Back to Stories': '返回故事',
    'Eye-Opening': '很有启发',
    Support: '支持',
    Comment: '评论',
    'Admin Dashboard': '管理面板',
    'Testimony Queue': '故事审核队列',
    Approve: '通过',
    Flag: '标记',
    Reject: '拒绝',
    'Moderator note': '审核备注',
  },
  es: {
    Home: 'Inicio',
    Algorithms: 'Algoritmos',
    Stories: 'Historias',
    'Community Events': 'Eventos comunitarios',
    About: 'Acerca de',
    'My Stories': 'Mis historias',
    Login: 'Iniciar sesión',
    Admin: 'Admin',
    Logout: 'Salir',
    Language: 'Idioma',
    'Browse Algorithms': 'Ver algoritmos',
    'Learn More': 'Más información',
    'A.I. Systems in Local Government': 'Sistemas de IA en el gobierno local',
    'Algorithms Used in Public Services': 'Algoritmos usados en servicios públicos',
    Filters: 'Filtros',
    Filter: 'Filtro',
    Location: 'Ubicación',
    'Use Case': 'Uso',
    'Apply filters': 'Aplicar filtros',
    'Share Your Story': 'Comparte tu historia',
    City: 'Ciudad',
    Comments: 'Comentarios',
    'Post comment': 'Publicar comentario',
    Reply: 'Responder',
    Register: 'Registrarse',
    'Admin Dashboard': 'Panel de admin',
    Approve: 'Aprobar',
    Flag: 'Marcar',
    Reject: 'Rechazar',
  },
  ko: {
    Home: '홈',
    Algorithms: '알고리즘',
    Stories: '이야기',
    'Community Events': '커뮤니티 행사',
    About: '소개',
    'My Stories': '내 이야기',
    Login: '로그인',
    Admin: '관리',
    Logout: '로그아웃',
    Language: '언어',
    'Browse Algorithms': '알고리즘 보기',
    'Learn More': '더 알아보기',
    'A.I. Systems in Local Government': '지방정부의 AI 시스템',
    'Algorithms Used in Public Services': '공공서비스에 사용되는 알고리즘',
    Filters: '필터',
    Filter: '필터',
    Location: '위치',
    'Use Case': '사용 사례',
    'Apply filters': '필터 적용',
    'Share Your Story': '이야기 공유',
    City: '도시',
    Comments: '댓글',
    'Post comment': '댓글 쓰기',
    Reply: '답글',
    Register: '등록',
    Approve: '승인',
    Flag: '표시',
    Reject: '거절',
  },
  ja: {
    Home: 'ホーム',
    Algorithms: 'アルゴリズム',
    Stories: 'ストーリー',
    'Community Events': '地域イベント',
    About: '概要',
    'My Stories': '自分のストーリー',
    Login: 'ログイン',
    Admin: '管理',
    Logout: 'ログアウト',
    Language: '言語',
    'Browse Algorithms': 'アルゴリズムを見る',
    'Learn More': '詳しく見る',
    'A.I. Systems in Local Government': '地方政府のAIシステム',
    'Algorithms Used in Public Services': '公共サービスで使われるアルゴリズム',
    Filters: 'フィルター',
    Filter: 'フィルター',
    Location: '場所',
    'Use Case': '用途',
    'Apply filters': '適用',
    'Share Your Story': '体験を共有',
    City: '都市',
    Comments: 'コメント',
    'Post comment': 'コメント投稿',
    Reply: '返信',
    Register: '登録',
    Approve: '承認',
    Flag: 'フラグ',
    Reject: '却下',
  },
  de: {
    Home: 'Start',
    Algorithms: 'Algorithmen',
    Stories: 'Geschichten',
    'Community Events': 'Community-Events',
    About: 'Über',
    'My Stories': 'Meine Geschichten',
    Login: 'Anmelden',
    Admin: 'Admin',
    Logout: 'Abmelden',
    Language: 'Sprache',
    'Browse Algorithms': 'Algorithmen ansehen',
    'Learn More': 'Mehr erfahren',
    'A.I. Systems in Local Government': 'KI-Systeme in der Kommunalverwaltung',
    'Algorithms Used in Public Services': 'Algorithmen in öffentlichen Diensten',
    Filters: 'Filter',
    Filter: 'Filter',
    Location: 'Ort',
    'Use Case': 'Anwendungsfall',
    'Apply filters': 'Filter anwenden',
    'Share Your Story': 'Geschichte teilen',
    City: 'Stadt',
    Comments: 'Kommentare',
    'Post comment': 'Kommentar senden',
    Reply: 'Antworten',
    Register: 'Registrieren',
    Approve: 'Genehmigen',
    Flag: 'Markieren',
    Reject: 'Ablehnen',
  },
  fr: {
    Home: 'Accueil',
    Algorithms: 'Algorithmes',
    Stories: 'Histoires',
    'Community Events': 'Événements',
    About: 'À propos',
    'My Stories': 'Mes histoires',
    Login: 'Connexion',
    Admin: 'Admin',
    Logout: 'Déconnexion',
    Language: 'Langue',
    'Browse Algorithms': 'Voir les algorithmes',
    'Learn More': 'En savoir plus',
    'A.I. Systems in Local Government': 'Systèmes d’IA dans les collectivités',
    'Algorithms Used in Public Services': 'Algorithmes utilisés dans les services publics',
    Filters: 'Filtres',
    Filter: 'Filtre',
    Location: 'Lieu',
    'Use Case': 'Usage',
    'Apply filters': 'Appliquer',
    'Share Your Story': 'Partager votre histoire',
    City: 'Ville',
    Comments: 'Commentaires',
    'Post comment': 'Publier',
    Reply: 'Répondre',
    Register: 'S’inscrire',
    Approve: 'Approuver',
    Flag: 'Signaler',
    Reject: 'Rejeter',
  },
  pt: {
    Home: 'Início',
    Algorithms: 'Algoritmos',
    Stories: 'Histórias',
    'Community Events': 'Eventos comunitários',
    About: 'Sobre',
    'My Stories': 'Minhas histórias',
    Login: 'Entrar',
    Admin: 'Admin',
    Logout: 'Sair',
    Language: 'Idioma',
    'Browse Algorithms': 'Ver algoritmos',
    'Learn More': 'Saiba mais',
    'Apply filters': 'Aplicar filtros',
    'Share Your Story': 'Compartilhe sua história',
    Comments: 'Comentários',
    Reply: 'Responder',
    Register: 'Registrar',
  },
  ru: {
    Home: 'Главная',
    Algorithms: 'Алгоритмы',
    Stories: 'Истории',
    'Community Events': 'События',
    About: 'О проекте',
    'My Stories': 'Мои истории',
    Login: 'Войти',
    Admin: 'Админ',
    Logout: 'Выйти',
    Language: 'Язык',
    'Browse Algorithms': 'Смотреть алгоритмы',
    'Learn More': 'Подробнее',
    'Apply filters': 'Применить',
    'Share Your Story': 'Поделиться историей',
    Comments: 'Комментарии',
    Reply: 'Ответить',
    Register: 'Регистрация',
  },
  ar: {
    Home: 'الرئيسية',
    Algorithms: 'الخوارزميات',
    Stories: 'القصص',
    'Community Events': 'فعاليات المجتمع',
    About: 'حول',
    'My Stories': 'قصصي',
    Login: 'تسجيل الدخول',
    Admin: 'الإدارة',
    Logout: 'خروج',
    Language: 'اللغة',
    'Browse Algorithms': 'تصفح الخوارزميات',
    'Learn More': 'اعرف المزيد',
    'Apply filters': 'تطبيق الفلاتر',
    'Share Your Story': 'شارك قصتك',
    Comments: 'التعليقات',
    Reply: 'رد',
    Register: 'تسجيل',
  },
  hi: {
    Home: 'होम',
    Algorithms: 'एल्गोरिदम',
    Stories: 'कहानियां',
    'Community Events': 'सामुदायिक कार्यक्रम',
    About: 'परिचय',
    'My Stories': 'मेरी कहानियां',
    Login: 'लॉग इन',
    Admin: 'एडमिन',
    Logout: 'लॉग आउट',
    Language: 'भाषा',
    'Browse Algorithms': 'एल्गोरिदम देखें',
    'Learn More': 'और जानें',
    'Apply filters': 'फिल्टर लगाएं',
    'Share Your Story': 'अपनी कहानी साझा करें',
    Comments: 'टिप्पणियां',
    Reply: 'जवाब',
    Register: 'रजिस्टर',
  },
  it: {
    Home: 'Home',
    Algorithms: 'Algoritmi',
    Stories: 'Storie',
    'Community Events': 'Eventi',
    About: 'Informazioni',
    'My Stories': 'Le mie storie',
    Login: 'Accedi',
    Admin: 'Admin',
    Logout: 'Esci',
    Language: 'Lingua',
    'Browse Algorithms': 'Vedi algoritmi',
    'Learn More': 'Scopri di più',
    'Apply filters': 'Applica filtri',
    'Share Your Story': 'Condividi la tua storia',
    Comments: 'Commenti',
    Reply: 'Rispondi',
    Register: 'Registrati',
  },
};

const reverseLookup = Object.entries(translations).reduce((acc, [, dictionary]) => {
  Object.entries(dictionary).forEach(([english, translated]) => {
    acc[translated] = english;
  });
  return acc;
}, {});

const originals = new WeakMap();

function getTextNodes(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
      if (parent.closest('[data-no-translate], script, style, textarea')) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  return nodes;
}

function applyLanguage(language) {
  const dictionary = translations[language] || {};
  document.documentElement.lang = language;

  getTextNodes(document.body).forEach((node) => {
    const current = node.nodeValue;
    const trimmed = current.trim();
    const leading = current.match(/^\s*/)?.[0] || '';
    const trailing = current.match(/\s*$/)?.[0] || '';
    const original = originals.get(node) || reverseLookup[trimmed] || trimmed;

    if (!originals.has(node)) originals.set(node, original);
    node.nodeValue = `${leading}${language === 'en' ? original : dictionary[original] || original}${trailing}`;
  });
}

export function LanguageSelector() {
  const [language, setLanguage] = useState('en');

  const languageName = useMemo(() => {
    return languages.find(([code]) => code === language)?.[1] || 'English';
  }, [language]);

  useEffect(() => {
    const stored = window.localStorage.getItem('algostories-language') || 'en';
    setLanguage(stored);
    applyLanguage(stored);
  }, []);

  useEffect(() => {
    applyLanguage(language);
    window.localStorage.setItem('algostories-language', language);

    const observer = new MutationObserver(() => applyLanguage(language));
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [language]);

  return (
    <label data-no-translate className="flex items-center gap-1 text-xs text-gray-400">
      <span className="sr-only">Language</span>
      <select
        value={language}
        aria-label="Language"
        title={`Language: ${languageName}`}
        onChange={(event) => setLanguage(event.target.value)}
        className="h-9 max-w-[92px] rounded-md border border-gray-200 bg-white px-2 text-xs text-gray-500 hover:border-gray-300 focus:border-gray-400 focus:outline-none"
      >
        {languages.map(([code, label]) => (
          <option key={code} value={code}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}
