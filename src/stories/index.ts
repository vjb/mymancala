export interface HistoricalSource {
  author: string;
  work: string;
  year: number;
  publisher?: string;
}

export interface CulturalStory {
  id: string;
  title: {
    en: string;
    es: string;
    ar: string;
  };
  region: string;
  variantId: string;
  body: {
    en: string[];
    es: string[];
    ar: string[];
  };
  sources: HistoricalSource[];
}

export const CULTURAL_STORIES: CulturalStory[] = [
  {
    id: 'oware_akan',
    title: {
      en: 'Oware and the Living Heritage of the Akan',
      es: 'Oware y el patrimonio vivo de los Akan',
      ar: 'أوواري والتراث الحي لشعب الأكان',
    },
    region: "West Africa — Akan Lands (Ghana & Côte d'Ivoire)",
    variantId: 'oware',
    body: {
      en: [
        'In Akan societies, Oware is not merely a pastime, but an intellectual tradition that embodies values of mathematical foresight, respectful rivalry, and community cohesion.',
        'Traditionally carved from sacred hardwood, boards often feature ornate royal motifs reflecting the philosophical principle of mutual cultivation: sowing seeds that enrich the common good.',
      ],
      es: [
        'En las sociedades akan, el oware no es un simple pasatiempo, sino una tradición intelectual que encarna la previsión matemática y el respeto mutuo.',
        'Tallados tradicionalmente en maderas nobles, los tableros reflejan el principio filosófico de enriquecer el bien común sembrando semillas.',
      ],
      ar: [
        'في مجتمعات الأكان، ليست أوواري مجرد لعبة، بل هي تقليد فكري يجسد البصيرة الرياضية والترابط المجتمعي.',
        'تُنحت الألواح تقليديًا من الخشب المقدس وتجسد المبدأ الفلسفي لبذر البذور التي تثري الخير العام.',
      ],
    },
    sources: [
      {
        author: 'R. S. Rattray',
        work: 'Ashanti',
        year: 1923,
        publisher: 'Clarendon Press, Oxford',
      },
      {
        author: 'H. J. R. Murray',
        work: 'A History of Board-Games Other Than Chess',
        year: 1952,
        publisher: 'Oxford University Press',
      },
    ],
  },
  {
    id: 'egypt_ancient_origin',
    title: {
      en: 'Stone Depressions Along the Nile',
      es: 'Depresiones de piedra a lo largo del Nilo',
      ar: 'تجاويف حجرية على طول ضفاف النيل',
    },
    region: 'Nile Valley & Red Sea (Egypt / Nubia)',
    variantId: 'kalah',
    body: {
      en: [
        'Archaeologists have discovered mancala-style pit rows carved directly into sandstone temple roofs at Abydos and Karnak, dating back thousands of years.',
        'The name "Mancala" itself stems from the Arabic root naqala (نقل), meaning "to move" or "to transfer", reflecting the enduring human joy of rhythmically counting stones.',
      ],
      es: [
        'Los arqueólogos han descubierto hileras de fosas de estilo mancala grabadas en los techos de templos en Abidos y Karnak.',
        'El nombre "Mancala" proviene de la raíz árabe naqala (نقل), que significa "mover" o "trasladar", reflejando el ritmo de contar piedras.',
      ],
      ar: [
        'اكتشف علماء الآثار صفوفًا من التجاويف المنحوتة في أسقف معابد أبيدوس والكرنك تعود لآلاف السنين.',
        'مشتق اسم "منقلة" من الجذر العربي (نقل)، بما يعكس فعل نقل الحصى وبذرها بانتظام عبر الحفر.',
      ],
    },
    sources: [
      {
        author: 'Alexander J. de Voogt',
        work: 'Mancala Board Games',
        year: 1997,
        publisher: 'British Museum Press',
      },
    ],
  },
  {
    id: 'congkak_malay',
    title: {
      en: 'Congkak and the Maritime Routes of Southeast Asia',
      es: 'Congkak y las rutas marítimas del sudeste asiático',
      ar: 'كونغكاك وطرق التجارة البحرية في جنوب شرق آسيا',
    },
    region: 'Maritime Southeast Asia (Malaysia, Indonesia, Singapore)',
    variantId: 'congkak',
    body: {
      en: [
        'Carved in the graceful shape of a seafaring perahu (boat), Congkak boards accompanied sailors across the Malacca straits for generations.',
        'The game teaches patience and continuous flow, with cowrie shells serving as counters that echo the maritime commerce of ancient port kingdoms.',
      ],
      es: [
        'Tallados con la forma de un barco tradicional perahu, los tableros de Congkak acompañaron a marineros a través del estrecho de Malaca durante generaciones.',
        'El juego enseña paciencia y flujo continuo, utilizando conchas de cauri que evocan las rutas comerciales marítimas.',
      ],
      ar: [
        'تُنحت ألواح كونغكاك على شكل قوارب بحرية ممتدة ورافقت البحارة عبر مضيق ملقا لأجيال عديدة.',
        'تعلّم اللعبة الصبر والتدفق السلس، وتُستخدم فيها الأصداف البحرية كرمز للتجارة البحرية القديمة.',
      ],
    },
    sources: [
      {
        author: 'Walter William Skeat',
        work: 'Malay Magic: An Introduction to the Folklore and Popular Religion of the Malay Peninsula',
        year: 1900,
        publisher: 'Macmillan and Co.',
      },
    ],
  },
  {
    id: 'bao_swahili',
    title: {
      en: 'Bao la Kiswahili: The Strategy of East Africa',
      es: 'Bao la Kiswahili: la estrategia de África Oriental',
      ar: 'باو السواحلية: استراتيجية شرق إفريقيا',
    },
    region: 'Swahili Coast (Zanzibar, Tanzania, Kenya)',
    variantId: 'bao',
    body: {
      en: [
        'Renowned as one of the most complex board games in the world, Bao la Kiswahili has been played in the gathering squares (baraza) of Zanzibar for centuries.',
        'Masters of Bao cultivate deep foresight, viewing each movement of seeds as an expression of tactical subtlety and poetic rhythm.',
      ],
      es: [
        'Reconocido como uno de los juegos más complejos del mundo, el Bao la Kiswahili se ha jugado en las plazas públicas (baraza) de Zanzíbar durante siglos.',
        'Los maestros de Bao cultivan una gran previsión estratégica, considerando cada siembra como una expresión de sutilidad táctica.',
      ],
      ar: [
        'تُعد لعبة باو السواحلية واحدة من أكثر الألعاب الذهنية تعقيدًا في العالم، وتُلعب في المجالس العامة (البرزة) في زنجبار منذ قرون.',
        'يتقن أساتذة الباو التخطيط التكتيكي العميق، معتبرين حركة البذور تعبيرًا عن البراعة والذكاء الحسابي.',
      ],
    },
    sources: [
      {
        author: 'Philip Townshend',
        work: 'Bao: A Mancala Game of East Africa',
        year: 1979,
        publisher: 'African Studies Center',
      },
    ],
  },
];

export function getStoryById(id: string): CulturalStory | undefined {
  return CULTURAL_STORIES.find(s => s.id === id);
}

export function getStoriesForVariant(variantId: string): CulturalStory[] {
  return CULTURAL_STORIES.filter(s => s.variantId === variantId);
}
