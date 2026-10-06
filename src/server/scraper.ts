import * as cheerio from 'cheerio';
import type { AdItem, DuplicateRecord, ScrapeProgressLog, ScrapeJobResult } from '../types.ts';

// Standard headers with age verification cookies for adult/classifieds portals
const HTTP_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Cookie': 'aviso=1; over18=1; cookies=1; adult=1; legal=1; mundosex_adult=1; consent=1',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache',
};

// Words to exclude when extracting escort/person names from titles or descriptions
const NON_NAME_WORDS = new Set([
  'expertas', 'experta', 'chicas', 'chica', 'amigas', 'amiga', 'fotos', 'foto', 'ricos', 'rico', 'rica', 'ricas',
  'super', 'súper', 'masajes', 'masaje', 'masajista', 'masajistas', 'hola', 'buenas', 'novedad', 'novedades',
  'salidas', 'salida', 'particular', 'particulares', 'independiente', 'independientes', 'piso', 'chalet', 'hotel',
  'domicilio', 'domicilios', 'placer', 'fiesta', 'fiestera', 'fiesteras', 'sensual', 'sensuales', 'traviesa',
  'exclusiva', 'exclusivo', 'exclusivas', 'lujo', 'nuevo', 'nueva', 'nuevas', 'nuevos', 'recien', 'recién',
  'disponible', 'contacto', 'contactos', 'dulces', 'bombom', 'bombon', 'bombón', 'deliciosa', 'deliciosas',
  'folladora', 'mamadora', 'trato', 'disfrutona', 'somos', 'todo', 'toda', 'todos', 'todas', 'quiero', 'ven',
  'solo', 'solas', 'sere', 'seré', 'videos', 'video', 'anuncio', 'anuncios', 'cata', 'trio', 'trío', 'duplex',
  'dúplex', 'senoritas', 'señoritas', 'senorita', 'señorita', 'escort', 'escorts', 'top', 'vip', 'morena',
  'rubia', 'pelirroja', 'blanca', 'madurita', 'joven', 'jovencita', 'universitaria', 'cuerpo', 'curvas', 'pechos',
  'coños', 'coño', 'polla', 'pollas', 'sexo', 'placeres', 'llegada', 'llegadas', 'actriz', 'porno'
]);

// List of nationalities and keywords for deterministic detection
const NATIONALITIES_MAP = [
  { name: 'Colombiana', keywords: ['colombiana', 'colombianas', 'colombia', 'cali', 'medellin', 'medellín', 'bogotana', 'paisa'] },
  { name: 'Venezolana', keywords: ['venezolana', 'venezolanas', 'venezuela', 'maracucha', 'caraquena', 'caraqueña', 'llanera'] },
  { name: 'Española', keywords: ['española', 'espanola', 'españolas', 'espanolas', 'españa', 'espana', 'madrileña', 'valenciana', 'andaluza', 'catalana', 'gallega', 'canaria'] },
  { name: 'Brasileña', keywords: ['brasileña', 'brasilena', 'brasileñas', 'brasil', 'garota', 'carioca'] },
  { name: 'Cubana', keywords: ['cubana', 'cubanas', 'cuba', 'habanera'] },
  { name: 'Dominicana', keywords: ['dominicana', 'dominicanas', 'dominicano', 'quisqueyana'] },
  { name: 'Paraguaya', keywords: ['paraguaya', 'paraguayas', 'paraguay'] },
  { name: 'Ucraniana', keywords: ['ucraniana', 'ucranianas', 'ucrania'] },
  { name: 'Rusa', keywords: ['rusa', 'rusas', 'rusia'] },
  { name: 'Boliviana', keywords: ['boliviana', 'bolivianas', 'bolivia'] },
  { name: 'Argentina', keywords: ['argentina', 'argentinas', 'porteña'] },
  { name: 'Peruana', keywords: ['peruana', 'peruanas', 'peru', 'perú'] },
  { name: 'Ecuatoriana', keywords: ['ecuatoriana', 'ecuatorianas', 'ecuador'] },
  { name: 'Rumana', keywords: ['rumana', 'rumanas', 'rumania', 'moldava'] },
  { name: 'Italiana', keywords: ['italiana', 'italianas', 'italia'] },
  { name: 'Marroquí', keywords: ['marroqui', 'marroquí', 'árabe', 'arabe', 'marruecos', 'marrueca'] },
  { name: 'Asiática', keywords: ['asiatica', 'asiática', 'china', 'japonesa', 'oriental', 'orientales', 'coreana'] },
  { name: 'Portuguesa', keywords: ['portuguesa', 'portugal'] },
  { name: 'Chilena', keywords: ['chilena', 'chile'] },
  { name: 'Latina', keywords: ['latina', 'latinas'] },
];

export function detectNameAndNationality(
  title: string,
  desc: string = ''
): { detectedName?: string; nationality?: string } {
  const combined = `${title || ''} ${desc || ''}`.trim();
  const lowerCombined = combined.toLowerCase();

  // 1. Nationality Detection
  let nationality: string | undefined = undefined;
  for (const item of NATIONALITIES_MAP) {
    for (const kw of item.keywords) {
      const reg = new RegExp(`\\b${kw}\\b`, 'i');
      if (reg.test(lowerCombined)) {
        nationality = item.name;
        break;
      }
    }
    if (nationality) break;
  }

  // 2. Name Detection
  let detectedName: string | undefined = undefined;

  // Pattern A: "Soy [Nombre]...", "Me llamo [Nombre]...", "Mi nombre es [Nombre]..."
  const selfMatch = combined.match(/(?:soy|me llamo|mi nombre es)\s+([A-ZÁÉÍÓÚÑa-záéíóúñ]{3,16})/i);
  if (selfMatch) {
    const candidate = selfMatch[1].trim();
    if (!NON_NAME_WORDS.has(candidate.toLowerCase())) {
      detectedName = candidate.charAt(0).toUpperCase() + candidate.slice(1).toLowerCase();
    }
  }

  // Pattern B: Title starts with a proper capitalized Name (e.g. "Briyith colombiana", "Samanta 20 añitos", "Andrea boliviana", "Paulina fiestera")
  if (!detectedName && title) {
    const cleanTitle = title.trim();
    const firstWordMatch = cleanTitle.match(/^([A-ZÁÉÍÓÚÑ][a-záéíóúñ]{2,15})(?:\s+(?:tú|tu|[a-záéíóúñ]{3,15}\s+|en\s+|de\s+|\d{2}\s*años|\d{2}\s*añitos)|\s*$)/i);
    if (firstWordMatch) {
      const candidate = firstWordMatch[1].trim();
      const lower = candidate.toLowerCase();
      if (!NON_NAME_WORDS.has(lower) && !/^(hola|fotos|chica|chicas|super|novedad|salidas)$/i.test(lower)) {
        detectedName = candidate.charAt(0).toUpperCase() + candidate.slice(1).toLowerCase();
      }
    }
  }

  return { detectedName, nationality };
}

export function normalizePhoneNumber(raw: string): { normalized: string; formatted: string } {
  if (!raw) return { normalized: '', formatted: '' };

  const digits = raw.replace(/\D/g, '');
  if (!digits || digits.length < 6) {
    return { normalized: '', formatted: raw.trim() };
  }

  let nationalNumber = digits;
  let countryCode = '34';

  if (digits.startsWith('0034')) {
    nationalNumber = digits.slice(4);
    countryCode = '34';
  } else if (digits.startsWith('34') && digits.length >= 11) {
    nationalNumber = digits.slice(2);
    countryCode = '34';
  } else if (digits.length === 9) {
    nationalNumber = digits;
    countryCode = '34';
  } else if (digits.length > 9) {
    nationalNumber = digits.slice(-9);
    countryCode = digits.slice(0, digits.length - 9);
  }

  const normalized = `${countryCode}${nationalNumber}`;

  let formatted = `+${countryCode}`;
  if (nationalNumber.length === 9) {
    formatted += ` ${nationalNumber.slice(0, 3)} ${nationalNumber.slice(3, 5)} ${nationalNumber.slice(5, 7)} ${nationalNumber.slice(7, 9)}`;
  } else {
    formatted += ` ${nationalNumber}`;
  }

  return { normalized, formatted };
}

// Extract phone numbers from arbitrary text
export function extractPhonesFromText(text: string): string[] {
  if (!text) return [];

  const phoneRegexes = [
    /(?:wa\.me|whatsapp\.com\/send\?phone=)(?:\+?34)?(\d{9})/gi,
    /(?:tel:\/\/|tel:)(?:\+?34)?(\d{9})/gi,
    /(?:(?:\+|00)34[\s.-]*)?(?:[67]\d{2}[\s.-]*\d{2}[\s.-]*\d{2}[\s.-]*\d{2})/g,
    /(?:(?:\+|00)34[\s.-]*)?(?:[67]\d{2}[\s.-]*\d{3}[\s.-]*\d{3})/g,
    /(?:(?:\+|00)34[\s.-]*)?(?:[6789]\d{8})/g,
    /\b[67]\d{2}[\s.-]+\d{3}[\s.-]+\d{3}\b/g,
    /\b[67]\d{2}[\s.-]+\d{2}[\s.-]+\d{2}[\s.-]+\d{2}\b/g,
    /\b[6789]\d{8}\b/g,
  ];

  const found = new Set<string>();

  for (const regex of phoneRegexes) {
    const matches = text.matchAll(regex);
    for (const match of matches) {
      const candidate = match[1] || match[0];
      const digits = candidate.replace(/\D/g, '');
      if (digits.length >= 9) {
        found.add(candidate.trim());
      }
    }
  }

  return Array.from(found);
}

// Convert thumbnail URL into pristine HD high resolution image URL
export function convertToHdImageUrl(thumbUrl: string): string {
  if (!thumbUrl) return '';
  return thumbUrl
    .replace(/_tm?\.jpg$/i, '.jpg')
    .replace(/_t\.jpg$/i, '.jpg')
    .replace('/img_es/', '/img/');
}

// Helper to resolve absolute URL
export function resolveUrl(relativeOrAbsolute: string, baseUrl: string): string {
  try {
    return new URL(relativeOrAbsolute, baseUrl).href;
  } catch {
    return relativeOrAbsolute;
  }
}

// Fetch URL with realistic browser headers and age cookies
export async function fetchHtml(url: string): Promise<{ html: string; finalUrl: string }> {
  const response = await fetch(url, {
    headers: HTTP_HEADERS,
    redirect: 'follow',
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const html = await response.text();
  return { html, finalUrl: response.url || url };
}

// Clean duplicate and repeating location strings
export function cleanLocationText(raw: string): string {
  if (!raw) return 'España';
  let loc = raw
    .replace(/^Contactos\s+(?:Mujeres|Hombres|Travestis)\s+en\s+/i, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Remove identical repeated half (common on mundosexanuncio like "Benicalap (Valencia) Benicalap (Valencia)")
  const len = loc.length;
  if (len > 8) {
    const half = Math.floor(len / 2);
    const p1 = loc.slice(0, half).trim();
    const p2 = loc.slice(half).trim();
    if (p1 === p2) {
      loc = p1;
    }
  }

  return loc;
}

// Check if ad belongs to target requested city/province
export function matchesCityFilter(location: string, title: string, cityFilter?: string): boolean {
  if (!cityFilter || !cityFilter.trim()) return true;

  const target = cityFilter.toLowerCase().trim();
  if (
    target === 'toda espana' ||
    target === 'espana' ||
    target === 'general' ||
    target === ''
  ) {
    return true;
  }

  const locLower = (location || '').toLowerCase();
  const titleLower = (title || '').toLowerCase();

  // Direct match
  if (locLower.includes(target) || titleLower.includes(target)) {
    return true;
  }

  // Major Spanish province towns and neighborhoods
  const provinceAliases: Record<string, string[]> = {
    valencia: [
      'valencia', 'manises', 'sagunto', 'gandia', 'paterna', 'torrent', 'cullera', 'alzira',
      'xativa', 'burjassot', 'mislata', 'aldaia', 'alboraya', 'ontinyent', 'sueca', 'requena',
      'lliria', 'oliva', 'ayora', 'malvarrosa', 'torrefiel', 'benicalap', 'campanar', 'ruzafa', 'russafa',
    ],
    madrid: [
      'madrid', 'alcala', 'alcobendas', 'alcorcon', 'getafe', 'leganes', 'mostoles', 'parla',
      'fuenlabrada', 'torrejon', 'pozuelo', 'majadahonda', 'las rozas', 'coslada', 'vallecas',
      'carabanchel', 'chamartin', 'chamberi', 'usera', 'tetuan', 'barajas', 'tres cantos',
    ],
    barcelona: [
      'barcelona', 'badalona', 'hospitalet', 'sabadell', 'terrassa', 'mataro', 'santa coloma',
      'cornella', 'sant cugat', 'manresa', 'rubi', 'viladecans', 'el prat', 'granollers',
      'eixample', 'gracia', 'sants', 'sarria',
    ],
    sevilla: [
      'sevilla', 'dos hermanas', 'alcala de guadaira', 'utrera', 'mairenadelaljarafe', 'ecija',
      'triana', 'nervion', 'los remedios',
    ],
    malaga: [
      'malaga', 'marbella', 'fuengirola', 'mijas', 'torremolinos', 'benalmadena', 'estepona',
      'velez', 'nerja', 'ronda', 'antequera',
    ],
    alicante: [
      'alicante', 'elche', 'torrevieja', 'orihuela', 'benidorm', 'alcoy', 'elda', 'san vicente',
      'denia', 'villena', 'petrer', 'calpe', 'javea', 'altea', 'novelda',
    ],
    zaragoza: ['zaragoza', 'calatayud', 'utebo', 'ejea', 'tarazona', 'delicias'],
    bilbao: ['bilbao', 'barakaldo', 'getxo', 'portugalete', 'santurtzi', 'basauri', 'leioa', 'bizkaia'],
  };

  const aliases = provinceAliases[target];
  if (aliases) {
    for (const alias of aliases) {
      if (locLower.includes(alias) || titleLower.includes(alias)) {
        return true;
      }
    }
  }

  // Reject if it explicitly specifies a different known province
  const otherProvinces = [
    'madrid', 'barcelona', 'valencia', 'sevilla', 'malaga', 'alicante', 'murcia', 'zaragoza',
    'bilbao', 'girona', 'ibiza', 'baleares', 'tenerife', 'palma', 'granada', 'cadiz', 'cordoba',
    'valladolid', 'castellon',
  ];

  for (const other of otherProvinces) {
    if (other !== target && locLower.includes(other)) {
      return false;
    }
  }

  return true;
}

// Extract primary image from element
function extractImageSrc($elem: cheerio.Cheerio<any>, baseUrl: string): string {
  const imgs = $elem.find('img');
  for (let i = 0; i < imgs.length; i++) {
    const img = imgs.eq(i);
    const src =
      img.attr('data-src') ||
      img.attr('data-original') ||
      img.attr('data-lazy-src') ||
      img.attr('data-zoom') ||
      img.attr('src') ||
      '';

    if (
      src &&
      !src.startsWith('data:image/svg') &&
      !src.includes('pixel') &&
      !src.includes('blank.gif') &&
      !src.includes('destacados.gif') &&
      !src.includes('oro30.png') &&
      !src.includes('icon')
    ) {
      return resolveUrl(src, baseUrl);
    }
  }

  const style =
    $elem.attr('style') ||
    $elem.find('[style*="background-image"]').first().attr('style');
  if (style) {
    const bgMatch = style.match(/url\(['"]?([^'")]+)['"]?\)/);
    if (bgMatch && bgMatch[1] && !bgMatch[1].startsWith('data:')) {
      return resolveUrl(bgMatch[1], baseUrl);
    }
  }

  return '';
}

// Fetch single ad detail page to extract all HD photos, description, name, nationality, and phone
export async function fetchAdDetailPage(
  detailUrl: string,
  baseTitle: string = ''
): Promise<{
  phone: string;
  photoUrl?: string;
  images: string[];
  description: string;
  detectedName?: string;
  nationality?: string;
}> {
  try {
    const { html } = await fetchHtml(detailUrl);
    const $ = cheerio.load(html);

    // 1. Direct tel link
    let phone = '';
    const telHref = $('a[href^="tel:"], a[href^="tel://"]').first().attr('href');
    if (telHref) {
      phone = telHref.replace(/^tel:\/\//, '').replace(/^tel:/, '').trim();
    }

    // 2. WhatsApp link
    if (!phone) {
      const waHref = $(
        'a.whatsapp, a[href*="api.whatsapp.com"], a[href*="wa.me"]'
      )
        .first()
        .attr('href');
      if (waHref) {
        const waMatch = waHref.match(/(?:phone=|wa\.me\/)(\d+)/);
        if (waMatch) {
          phone = waMatch[1];
        }
      }
    }

    // 3. Tel block text
    if (!phone) {
      const telBlockText = $(
        '.fa_tel, .tel, p.tel, address.fa_tel, .contactarAnuncioBoton'
      ).text();
      const extracted = extractPhonesFromText(telBlockText);
      if (extracted.length > 0) {
        phone = extracted[0];
      }
    }

    // 4. Description text
    let description = $('.a_content, .desc, .details, #desc, article p').text().replace(/\s+/g, ' ').trim();
    if (!phone) {
      const extracted = extractPhonesFromText(description);
      if (extracted.length > 0) {
        phone = extracted[0];
      }
    }

    // 5. EXTRACT ALL FULL RESOLUTION HD IMAGES
    const imageSet = new Set<string>();

    // Strategy A: mundosexanuncio data-imgs attribute on #images or .masonry
    const dataImgs = $('#images').attr('data-imgs') || $('[data-imgs]').attr('data-imgs');
    if (dataImgs) {
      const parts = dataImgs.split(';');
      const host = parts[0]?.trim(); // e.g. static2.mundosexanuncio.com/img
      if (host) {
        for (let i = 1; i < parts.length; i++) {
          const hash = parts[i]?.trim();
          if (hash && hash.length >= 8) {
            const prefix = hash.slice(0, 4);
            const fullUrl = `https://${host}/${prefix}/${hash}.jpg`;
            imageSet.add(fullUrl);
          }
        }
      }
    }

    // Strategy B: Masonry and gallery img elements
    $('ul.masonry img, #images img, .gallery img, .img_anuncio img, article img').each((_, el) => {
      const src =
        $(el).attr('data-src') ||
        $(el).attr('data-original') ||
        $(el).attr('data-zoom') ||
        $(el).attr('src') ||
        '';

      if (
        src &&
        !src.startsWith('data:') &&
        !src.includes('pixel') &&
        !src.includes('blank.gif') &&
        !src.includes('destacados.gif') &&
        !src.includes('oro30.png') &&
        !src.includes('banners') &&
        !src.includes('logo')
      ) {
        const full = resolveUrl(convertToHdImageUrl(src), detailUrl);
        imageSet.add(full);
      }
    });

    // Strategy C: Schema.org ImageObject
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const content = $(el).text();
        const json = JSON.parse(content);
        if (json.image && typeof json.image === 'object' && json.image.url) {
          imageSet.add(resolveUrl(convertToHdImageUrl(json.image.url), detailUrl));
        } else if (typeof json.image === 'string') {
          imageSet.add(resolveUrl(convertToHdImageUrl(json.image), detailUrl));
        }
      } catch {
        // ignore json parse error
      }
    });

    const allImages = Array.from(imageSet);
    const photoUrl = allImages[0] || '';

    // 6. DETECT NAME AND NATIONALITY BY CODE
    const titleToUse = baseTitle || $('h1, h2.title, p.title').first().text().trim();
    const { detectedName, nationality } = detectNameAndNationality(titleToUse, description);

    return {
      phone,
      photoUrl,
      images: allImages,
      description,
      detectedName,
      nationality,
    };
  } catch {
    return {
      phone: '',
      photoUrl: '',
      images: [],
      description: '',
    };
  }
}

// Find next page URL (supports mundosexanuncio /page:2, rel="next", ?pag=2, etc.)
export function findNextPageUrl(
  html: string,
  currentUrl: string,
  currentPage: number
): string | null {
  const $ = cheerio.load(html);

  // 1. Look for rel="next"
  const relNext = $('a[rel="next"]').attr('href');
  if (relNext) {
    return resolveUrl(relNext, currentUrl);
  }

  // 2. Check nav.paginator span.next a
  const navNext = $(
    'nav.paginator .next a, .pagination .next a, .paginacion .next a'
  ).attr('href');
  if (navNext) {
    return resolveUrl(navNext, currentUrl);
  }

  // 3. Search link containing "Siguiente", "Sig", ">", "»"
  const nextTextLinks = $('a').filter((_, el) => {
    const t = $(el).text().trim().toLowerCase();
    const aria = $(el).attr('aria-label')?.toLowerCase() || '';
    return (
      t === 'siguiente' ||
      t === 'sig' ||
      t === 'next' ||
      t === '>' ||
      t === '»' ||
      aria.includes('siguiente') ||
      aria.includes('next')
    );
  });

  if (nextTextLinks.length > 0) {
    const href = nextTextLinks.first().attr('href');
    if (href && href !== '#' && !href.startsWith('javascript:')) {
      return resolveUrl(href, currentUrl);
    }
  }

  // 4. Specific mundosexanuncio page:X pattern
  if (currentUrl.includes('/page:')) {
    return currentUrl.replace(/\/page:\d+/, `/page:${currentPage + 1}`);
  }

  // If no page: yet, try appending /page:2
  if (currentUrl.includes('mundosexanuncio.com') && !currentUrl.includes('?')) {
    const cleanUrl = currentUrl.replace(/\/+$/, '');
    return `${cleanUrl}/page:${currentPage + 1}`;
  }

  // 5. Standard query string pagination
  try {
    const u = new URL(currentUrl);
    if (u.searchParams.has('pag')) {
      u.searchParams.set('pag', String(currentPage + 1));
      return u.href;
    }
    if (u.searchParams.has('page')) {
      u.searchParams.set('page', String(currentPage + 1));
      return u.href;
    }
    u.searchParams.set('pag', String(currentPage + 1));
    return u.href;
  } catch {
    return null;
  }
}

// Parse listing HTML with Cheerio (100% pure code)
export async function scrapeClassifiedsHtml(
  html: string,
  baseUrl: string,
  options: {
    maxAds?: number;
    cityFilter?: string;
    fullAdMode?: boolean;
    cropWatermark?: boolean;
    existingPhones?: Set<string>;
    batchSeenPhones?: Set<string>;
    logs?: ScrapeProgressLog[];
  } = {}
): Promise<{ ads: AdItem[]; duplicates: DuplicateRecord[]; totalFound: number }> {
  const $ = cheerio.load(html);
  const maxAds = options.maxAds || 100;
  const cityFilter = options.cityFilter || '';
  const fullAdMode = Boolean(options.fullAdMode);
  const cropWatermark = options.cropWatermark !== false;
  const existingPhones = options.existingPhones || new Set<string>();
  const batchSeenPhones = options.batchSeenPhones || new Set<string>();
  const logs = options.logs || [];

  const addLog = (level: ScrapeProgressLog['level'], message: string) => {
    logs.push({ timestamp: new Date().toISOString(), level, message });
  };

  const candidates: AdItem[] = [];
  const duplicates: DuplicateRecord[] = [];

  let sourceDomain = 'directorio';
  try {
    sourceDomain = new URL(baseUrl).hostname.replace(/^www\./, '');
  } catch {
    // fallback
  }

  // Target selectors for classifieds portals
  const cardSelectors = [
    'tr[itemprop="itemListElement"]',
    'tr.p_odd, tr.p_even',
    'tr[data-id]',
    'tr[id^="box_"]',
    'article.anuncio',
    'article',
    '.item-anuncio',
    '.anuncio-item',
    '.anuncio',
    '.listing-item',
    '.card-anuncio',
    '.card',
    '.ad-item',
    '.list-item',
    'div[data-id]',
    'div[class*="anuncio"]',
    '.result-item',
  ];

  let $cards: cheerio.Cheerio<any> = $('') as any;
  for (const selector of cardSelectors) {
    const found = $(selector);
    if (found.length >= 1) {
      $cards = found;
      break;
    }
  }

  if ($cards.length === 0) {
    $cards = $('a[href*="/contactos-"], a[href*="/anuncio/"], a[href*="/post/"]').closest(
      'tr, div, article'
    );
  }

  if ($cards.length === 0) {
    addLog('warn', `No se encontraron bloques de anuncios en el HTML recibido.`);
    return { ads: [], duplicates: [], totalFound: 0 };
  }

  interface RawCardData {
    title: string;
    imageUrl: string;
    detailUrl: string;
    rawPhone: string;
    location: string;
    initialDetectedName?: string;
    initialNationality?: string;
  }

  const rawCards: RawCardData[] = [];

  for (let i = 0; i < $cards.length && rawCards.length < maxAds * 2; i++) {
    const card = $cards.eq(i);
    const cardText = card.text().replace(/\s+/g, ' ').trim();
    if (!cardText || cardText.length < 5) continue;

    // Title
    let title = card
      .find('h2 a.title span[itemprop="name"], h2 a.title, .title, a[itemprop="url"]')
      .first()
      .text()
      .trim();
    if (!title || title.length < 3) {
      title = card.find('h1, h2, h3, h4, strong, a').first().text().trim();
    }
    if (!title) title = cardText.slice(0, 60);
    title = title.replace(/\s+/g, ' ').slice(0, 100);

    // Location
    let rawLoc = card
      .find('address.region span.zona, address.region, .zona, .ciudad, .location')
      .first()
      .text()
      .trim();
    let location = cleanLocationText(rawLoc);

    // City Filter check: verify the ad matches the requested city!
    if (cityFilter && !matchesCityFilter(location, title, cityFilter)) {
      continue;
    }

    // Photo from card (convert thumbnail to HD)
    let rawThumb = extractImageSrc(card, baseUrl);
    let imageUrl = convertToHdImageUrl(rawThumb);

    // Detail Link
    const adLink =
      card
        .find(
          'h2 a.title, a[itemprop="url"], a[href*="/contactos-"], a[href*="/anuncio/"]'
        )
        .first()
        .attr('href') || card.find('a[href]').first().attr('href');
    const detailUrl = adLink ? resolveUrl(adLink, baseUrl) : '';

    // Direct phone on card if present
    let rawPhone = '';
    const telLink = card.find('a[href^="tel:"], a[href^="tel://"]').first().attr('href');
    if (telLink) {
      rawPhone = telLink.replace(/^tel:\/\//, '').replace(/^tel:/, '').trim();
    }
    if (!rawPhone) {
      const waLink = card
        .find('a.whatsapp, a[href*="wa.me"], a[href*="whatsapp"]')
        .first()
        .attr('href');
      if (waLink) {
        const waMatch = waLink.match(/(?:wa\.me\/|phone=)(\d+)/);
        if (waMatch) rawPhone = waMatch[1];
      }
    }
    if (!rawPhone) {
      const phones = extractPhonesFromText(cardText);
      if (phones.length > 0) rawPhone = phones[0];
    }

    // Pre-detect name and nationality from card title
    const { detectedName: initialDetectedName, nationality: initialNationality } =
      detectNameAndNationality(title, cardText);

    rawCards.push({
      title,
      imageUrl,
      detailUrl,
      rawPhone,
      location: location || 'España',
      initialDetectedName,
      initialNationality,
    });

    if (rawCards.length >= maxAds) break;
  }

  addLog(
    'info',
    `Extrayendo datos de ${rawCards.length} anuncios ${
      cityFilter ? `filtrados para ${cityFilter}` : ''
    }${fullAdMode ? ' [Modo Anuncio Completo: fotos HD + recorte + nombre/nacionalidad]' : ''}...`
  );

  // Concurrency helper: process detail pages in batches of 5 to fetch full details & phones
  const BATCH_SIZE = 5;
  for (let i = 0; i < rawCards.length && candidates.length < maxAds; i += BATCH_SIZE) {
    const chunk = rawCards.slice(i, i + BATCH_SIZE);

    const detailedChunk = await Promise.all(
      chunk.map(async card => {
        let phone = card.rawPhone;
        let photo = card.imageUrl;
        let allImages: string[] = photo ? [photo] : [];
        let description = '';
        let detectedName = card.initialDetectedName;
        let nationality = card.initialNationality;

        // If in fullAdMode OR phone is missing and detailUrl exists, visit detail page
        if ((fullAdMode || !phone) && card.detailUrl) {
          const detailData = await fetchAdDetailPage(card.detailUrl, card.title);
          if (detailData.phone) phone = detailData.phone;
          if (detailData.photoUrl) photo = detailData.photoUrl;
          if (detailData.images && detailData.images.length > 0) {
            allImages = detailData.images;
          }
          if (detailData.description) description = detailData.description;
          if (detailData.detectedName) detectedName = detailData.detectedName;
          if (detailData.nationality) nationality = detailData.nationality;
        }

        // Generate cropped image URLs (proxied with bottom logo crop)
        const croppedImages = allImages.map(
          img => `/api/image/crop?url=${encodeURIComponent(img)}&percent=10`
        );

        const primaryImage = cropWatermark && croppedImages.length > 0
          ? croppedImages[0]
          : photo;

        return {
          ...card,
          rawPhone: phone,
          imageUrl: primaryImage,
          images: allImages,
          croppedImages,
          description,
          detectedName,
          nationality,
          isFullAd: fullAdMode,
        };
      })
    );

    // Deduplicate and register ads
    for (const card of detailedChunk) {
      const { normalized, formatted } = normalizePhoneNumber(card.rawPhone);
      const hasPhone = normalized.length >= 8;

      if (hasPhone) {
        // Check directory duplicates
        if (existingPhones.has(normalized)) {
          duplicates.push({
            phone: formatted,
            normalizedPhone: normalized,
            title: card.title,
            existingTitle: 'Ya registrado previamente en tu directorio',
            sourceUrl: card.detailUrl,
            detectedAt: new Date().toISOString(),
          });
          addLog(
            'warn',
            `⚠️ Teléfono ${formatted} ya en directorio. Omitido: "${card.title.slice(0, 30)}..."`
          );
          continue;
        }

        // Check batch duplicates
        if (batchSeenPhones.has(normalized)) {
          duplicates.push({
            phone: formatted,
            normalizedPhone: normalized,
            title: card.title,
            existingTitle: 'Repetido en este mismo escaneo',
            sourceUrl: card.detailUrl,
            detectedAt: new Date().toISOString(),
          });
          addLog(
            'warn',
            `⚠️ Teléfono ${formatted} repetido en este escaneo. Omitido.`
          );
          continue;
        }

        batchSeenPhones.add(normalized);
      }

      const hasWhatsapp =
        hasPhone && (normalized.startsWith('346') || normalized.startsWith('347'));
      const whatsappUrl = hasPhone
        ? `https://wa.me/${normalized}?text=${encodeURIComponent(
            `Hola${card.detectedName ? ' ' + card.detectedName : ''}, he visto tu anuncio en ` + sourceDomain
          )}`
        : undefined;

      const adItem: AdItem = {
        id: `ad_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        title: card.title || 'Anuncio clasificado',
        imageUrl: card.imageUrl || '',
        images: card.images,
        croppedImages: card.croppedImages,
        detectedName: card.detectedName,
        nationality: card.nationality,
        description: card.description,
        phone: hasPhone ? formatted : card.rawPhone || 'No especificado',
        normalizedPhone: normalized,
        hasWhatsapp,
        whatsappUrl,
        sourceUrl: card.detailUrl || baseUrl,
        location: card.location || 'España',
        category: 'Anuncios',
        scrapedAt: new Date().toISOString(),
        sourceSite: sourceDomain,
        status: 'nuevo',
        isFullAd: card.isFullAd,
      };

      candidates.push(adItem);
      
      const detailsTag = [
        card.detectedName ? `Nombre: ${card.detectedName}` : null,
        card.nationality ? `Origen: ${card.nationality}` : null,
        card.images && card.images.length > 1 ? `${card.images.length} fotos HD` : null,
      ].filter(Boolean).join(' | ');

      addLog(
        'success',
        `✓ [${adItem.location}] "${card.title.slice(0, 30)}" | Tel: ${adItem.phone}${
          detailsTag ? ` (${detailsTag})` : ''
        }`
      );
    }
  }

  return {
    ads: candidates,
    duplicates,
    totalFound: candidates.length + duplicates.length,
  };
}

// Master multi-page crawling runner (100% PURE CODE, NO AI)
export async function executeScrapingJob(
  targetUrl: string,
  options: {
    targetAdCount?: number;
    maxAds?: number;
    maxPages?: number;
    cityFilter?: string;
    followDetailLinks?: boolean;
    fullAdMode?: boolean;
    cropWatermark?: boolean;
    rawHtml?: string;
    existingPhones?: Set<string>;
  } = {}
): Promise<ScrapeJobResult> {
  const startTime = Date.now();
  const logs: ScrapeProgressLog[] = [];
  const targetGoal = options.targetAdCount || options.maxAds || 30;
  const maxPages = options.maxPages || 15;
  const cityFilter = options.cityFilter || '';
  const fullAdMode = Boolean(options.fullAdMode);
  const cropWatermark = options.cropWatermark !== false;
  const existingPhones = options.existingPhones || new Set<string>();
  const batchSeenPhones = new Set<string>();

  const addLog = (level: ScrapeProgressLog['level'], message: string) => {
    logs.push({ timestamp: new Date().toISOString(), level, message });
  };

  let allAds: AdItem[] = [];
  let allDuplicates: DuplicateRecord[] = [];
  let currentUrl: string | null = targetUrl;
  let page = 1;

  try {
    addLog('info', `Iniciando scraper 100% por código para: ${targetUrl}`);
    if (cityFilter) {
      addLog('info', `Filtro de Ciudad/Provincia activo: ${cityFilter.toUpperCase()}`);
    }
    if (fullAdMode) {
      addLog(
        'info',
        `✨ Modo Anuncio Completo activado: se extraerán todas las fotos en HD, se recortará el logo inferior y se detectará nombre y nacionalidad.`
      );
    }
    addLog(
      'info',
      `Meta: recolectar hasta ${targetGoal} anuncios únicos (sin números repetidos).`
    );

    // Handle raw HTML if directly pasted
    if (options.rawHtml) {
      addLog(
        'info',
        `Procesando código HTML manual (${Math.round(options.rawHtml.length / 1024)} KB)`
      );
      const result = await scrapeClassifiedsHtml(options.rawHtml, targetUrl, {
        maxAds: targetGoal,
        cityFilter,
        fullAdMode,
        cropWatermark,
        existingPhones,
        batchSeenPhones,
        logs,
      });

      const durationMs = Date.now() - startTime;
      return {
        success: true,
        scrapedCount: result.ads.length + result.duplicates.length,
        newUniqueAdded: result.ads.length,
        duplicatesSkipped: result.duplicates.length,
        duplicates: result.duplicates,
        ads: result.ads,
        logs,
        durationMs,
      };
    }

    // Multi-page crawler loop
    while (currentUrl && allAds.length < targetGoal && page <= maxPages) {
      addLog('info', `[Página ${page}] Conectando a: ${currentUrl}`);

      let pageHtml = '';
      let resolvedUrl: string = currentUrl;

      try {
        const fetchRes = await fetchHtml(currentUrl);
        pageHtml = fetchRes.html;
        resolvedUrl = fetchRes.finalUrl;
        if (resolvedUrl !== currentUrl) {
          addLog('info', `Redirigido a: ${resolvedUrl}`);
        }
      } catch (err: any) {
        addLog('error', `Error al acceder a página ${page} (${currentUrl}): ${err.message}`);
        break;
      }

      const remainingNeeded = targetGoal - allAds.length;
      const pageResult = await scrapeClassifiedsHtml(pageHtml, resolvedUrl, {
        maxAds: remainingNeeded,
        cityFilter,
        fullAdMode,
        cropWatermark,
        existingPhones,
        batchSeenPhones,
        logs,
      });

      const pageAds = pageResult.ads;
      const pageDuplicates = pageResult.duplicates;

      allAds = [...allAds, ...pageAds];
      allDuplicates = [...allDuplicates, ...pageDuplicates];

      addLog(
        pageAds.length > 0 ? 'success' : 'warn',
        `[Página ${page}] +${pageAds.length} anuncios guardados (${pageDuplicates.length} repetidos omitidos). Progreso: ${allAds.length}/${targetGoal}`
      );

      // Check if target reached
      if (allAds.length >= targetGoal) {
        addLog(
          'success',
          `¡Meta alcanzada! Se completaron los ${allAds.length} anuncios únicos para ${cityFilter || 'la búsqueda'}.`
        );
        break;
      }

      // If page returned zero items, stop paging
      if (pageAds.length === 0 && pageDuplicates.length === 0) {
        addLog('info', `No se detectaron más anuncios en la página ${page}. Fin del listado.`);
        break;
      }

      // Find next page link
      const nextUrl = findNextPageUrl(pageHtml, resolvedUrl, page);
      if (!nextUrl || nextUrl === currentUrl || nextUrl === resolvedUrl) {
        addLog('info', `No hay más páginas disponibles. Fin de la búsqueda.`);
        break;
      }

      currentUrl = nextUrl;
      page++;

      // Polite delay between pages
      await new Promise(r => setTimeout(r, 400));
    }

    const durationMs = Date.now() - startTime;
    addLog(
      'info',
      `Rastreo finalizado en ${(durationMs / 1000).toFixed(1)}s: ${allAds.length} nuevos guardados, ${allDuplicates.length} duplicados omitidos en ${page} página(s).`
    );

    return {
      success: true,
      scrapedCount: allAds.length + allDuplicates.length,
      newUniqueAdded: allAds.length,
      duplicatesSkipped: allDuplicates.length,
      duplicates: allDuplicates,
      ads: allAds,
      logs,
      durationMs,
    };
  } catch (err: any) {
    const durationMs = Date.now() - startTime;
    addLog('error', `Error general en el scraper: ${err.message}`);
    return {
      success: false,
      scrapedCount: allAds.length + allDuplicates.length,
      newUniqueAdded: allAds.length,
      duplicatesSkipped: allDuplicates.length,
      duplicates: allDuplicates,
      ads: allAds,
      logs,
      durationMs,
      error: err.message,
    };
  }
}
