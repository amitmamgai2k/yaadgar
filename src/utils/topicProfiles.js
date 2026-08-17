/**
 * Topic Profiles — culturally authentic nostalgic content for predefined topics.
 *
 * Each profile contains:
 *   title:         Array of 1–2 lines for the large poster title (Hinglish where natural)
 *   quotes:        4–6 rotating nostalgic quotes
 *   detailLabels:  5 small scattered text labels
 *   icon:          Emoji for the central visual element
 *   particleColor: Primary particle burst color (hex)
 *   particleAccent: Secondary particle color (hex)
 *   gradientTint:  Warm overlay tint for the background (CSS color with alpha)
 */

const profiles = {
  'independence day': {
    title: ['आज़ादी का जश्न', 'INDEPENDENCE DAY'],
    quotes: [
      'Jai Hind — वो तिरंगे की शान, वो देशभक्ति के गाने',
      'School assembly mein flag hoisting, hands on heart',
      'Mithaiyon ka dabba aur rangoli tricolor wali',
      'Puri colony mein patang-baazi, har chhat pe tiranga',
      '"Mere desh ki dharti" loudspeaker pe full volume',
    ],
    detailLabels: ['15 AUGUST', 'JAI HIND', '🇮🇳 TIRANGA', 'SINCE 1947', 'VANDE MATARAM'],
    icon: '🇮🇳',
    particleColor: '#FF9933',
    particleAccent: '#138808',
    gradientTint: 'rgba(255, 153, 51, 0.08)',
  },

  'cyber cafe': {
    title: ['CYBER CAFE', 'वो ₹20 वाला इंटरनेट'],
    quotes: [
      'Counter Strike ke baad Orkut check karna — mandatory ritual',
      'Yahoo Messenger pe buzz karna aur dost ke ghar phone aana',
      'Download speed 4 KB/s pe poora gaana 40 min mein',
      '"Bhaiya ek ghanta aur dedo, last round hai"',
      'Limewire se songs download, virus free — kabhi nahi',
      'Monitor CRT wala, keyboard ki keys chipki hui',
    ],
    detailLabels: ['₹20 PER HOUR', 'COUNTER STRIKE', 'ORKUT.COM', 'DIAL-UP ERA', '56 KBPS'],
    icon: '🖥️',
    particleColor: '#00ff88',
    particleAccent: '#00ccff',
    gradientTint: 'rgba(0, 255, 136, 0.06)',
  },

  'school days': {
    title: ['SCHOOL DAYS', 'वो सुनहरे दिन'],
    quotes: [
      'Last bench pe baith ke chit pass karna — professional level',
      'Lunch break mein tiffin exchange — "tera paratha de, mera sandwich le"',
      'PT period ka intezaar poore hafte — sirf ek din milta tha',
      '"Homework nahi kiya? Bahar jao!" — daily routine',
      'Annual function mein dance — rehearsal zyada, performance kam',
      'Report card wale din ghar jaane mein darr lagta tha',
    ],
    detailLabels: ['SECTION B', 'ROLL NO. 24', 'LAST BENCH', 'PT PERIOD', 'ANNUAL DAY'],
    icon: '🎒',
    particleColor: '#FFD700',
    particleAccent: '#FF6B35',
    gradientTint: 'rgba(255, 215, 0, 0.06)',
  },

  'old delhi': {
    title: ['OLD DELHI', 'पुरानी दिल्ली की गलियाँ'],
    quotes: [
      'Chandni Chowk ki galiyaan — ek taraf paranthe, doosri taraf jalebi',
      'Jama Masjid ke saamne kebab ki khushboo subah se shaam tak',
      'Cycle rickshaw mein baith ke Dariba Kalan jaana',
      'Fatehpuri ki masalon ki dukaan — aankhon mein mirchi, dil mein khushi',
      'Purani haveli ki chhat se dikhta tha poora sheher',
    ],
    detailLabels: ['CHANDNI CHOWK', 'EST. 1639', 'PARANTHEWALI GALI', '₹30 CHAI', 'DARIBA KALAN'],
    icon: '🕌',
    particleColor: '#E8A87C',
    particleAccent: '#D4A373',
    gradientTint: 'rgba(232, 168, 124, 0.08)',
  },

  'cricket': {
    title: ['GULLY CRICKET', 'वो छक्के वाली यादें'],
    quotes: [
      '"Out hai! Out hai!" — third umpire toh kabhi tha hi nahi',
      'Tennis ball pe tape lagao, swing milega — desi physics',
      'Last over mein 15 run chahiye — sab fielding chhod ke dekhne lagte the',
      'Kisi ke ghar ka glass toota — "bhago bhago!"',
      'Sachin ka shot copy karna — aur phir first ball pe out',
      '"One tip one hand" — ye rule sirf tab lagta tha jab kam log hote the',
    ],
    detailLabels: ['GULLY XI', 'TENNIS BALL', 'LAST OVER', 'BOUNDARY: WALL', 'NOT OUT!'],
    icon: '🏏',
    particleColor: '#4CAF50',
    particleAccent: '#8BC34A',
    gradientTint: 'rgba(76, 175, 80, 0.06)',
  },

  'diwali': {
    title: ['DIWALI', 'रोशनी का त्योहार'],
    quotes: [
      'Anaar aur phuljhadi — best combo since forever',
      'Mummy ke haath ke gulab jamun aur papa ke saath patakhe',
      'Pooja ke baad sabse pehle bomb phoda — phir daant khaayi',
      'Diye sajao, rangoli banao — ghar ko sajana ek art form hai',
      'Naye kapde pehen ke pados mein mithai dena — mandatory',
      'Laxmi Puja ke baad accounting — kitni mithai aayi, kitni gayi',
    ],
    detailLabels: ['शुभ दीपावली', 'ANAAR ₹50', 'PHULJHADI', 'LAXMI PUJA', 'RANGOLI'],
    icon: '🪔',
    particleColor: '#FF9800',
    particleAccent: '#FFC107',
    gradientTint: 'rgba(255, 152, 0, 0.08)',
  },

  '90s india': {
    title: ['90s INDIA', 'वो ज़माना ही कुछ और था'],
    quotes: [
      'Doordarshan pe Mowgli aur Shaktimaan — Sunday fix tha',
      'Cassette player mein tape uljhi — pencil se rewind',
      '"Washing powder Nirma" — ye jingle aaj bhi yaad hai',
      'Maruti 800 mein poora khandaan ghoomne jaata tha',
      'Gold Spot peena meant celebrations — "The zing thing!"',
      'Landline pe baat karna aur ghar wale sunna — privacy zero',
    ],
    detailLabels: ['DOORDARSHAN', 'CASSETTE TAPE', 'MARUTI 800', 'GOLD SPOT', 'SHAKTIMAAN'],
    icon: '📼',
    particleColor: '#E040FB',
    particleAccent: '#FF4081',
    gradientTint: 'rgba(224, 64, 251, 0.06)',
  },

  'college canteen': {
    title: ['COLLEGE CANTEEN', 'वो ₹10 की चाय, वो अनगिनत बातें'],
    quotes: [
      'Ek chai mein 4 log — share karna zaroori tha, budget nahi tha',
      'Canteen uncle se udhar — "kal de dunga" wala permanent rishta',
      'Proxy lagwao, canteen jao — attendance se zyada important',
      'Maggi + bread — the official college canteen diet plan',
      '"Last year ke notes dede yaar" — canteen mein padhai bhi hoti thi',
    ],
    detailLabels: ['CHAI ₹10', 'MAGGI ₹15', 'PROXY DONE', 'LAST BENCH', 'BUNK KING'],
    icon: '☕',
    particleColor: '#795548',
    particleAccent: '#A1887F',
    gradientTint: 'rgba(121, 85, 72, 0.08)',
  },

  'first mobile phone': {
    title: ['FIRST MOBILE', 'पहला फ़ोन, पहला प्यार'],
    quotes: [
      'Nokia 1100 ka torch — puri colony mein famous',
      'Snake game mein high score — isse bada koi achievement nahi tha',
      'Balance ₹10 mein poora mahina — sirf missed calls',
      '"Hello tune" set karna — Airtel wali sabse popular thi',
      'SMS pack — 100 SMS mein pura month, ek ek word count hota tha',
      'Phone pe polyphonic ringtone — sabko sunana mandatory',
    ],
    detailLabels: ['NOKIA 1100', 'SNAKE GAME', '₹10 BALANCE', '100 SMS PACK', 'HELLO TUNE'],
    icon: '📱',
    particleColor: '#2196F3',
    particleAccent: '#03A9F4',
    gradientTint: 'rgba(33, 150, 243, 0.06)',
  },

  'summer vacation': {
    title: ['SUMMER VACATION', 'गर्मियों की छुट्टियाँ'],
    quotes: [
      'Nani ke ghar jaana — train ki upper berth pe sona the best',
      'Aam ka season — aam khao, aam ke ras mein naho, repeat',
      'Homework last 2 din mein — poora summer khelne mein gaya',
      'Barf ka gola ₹2 mein — orange wala sabse best',
      'Cooler ke saamne baith ke Chacha Chaudhary padhna',
      'Cricket subah se shaam — mummy ki awaaz aaye tab tak',
    ],
    detailLabels: ['NANI KA GHAR', 'AAM KA SEASON', 'BARF KA GOLA ₹2', 'HOMEWORK: 0%', 'UPPER BERTH'],
    icon: '🌞',
    particleColor: '#FF7043',
    particleAccent: '#FFAB40',
    gradientTint: 'rgba(255, 112, 67, 0.08)',
  },
};

/**
 * Fallback generator for topics not in the predefined lookup.
 * Produces reasonable defaults so the page never breaks or shows blanks.
 */
function generateFallback(topic) {
  const clean = topic.trim();
  const words = clean.split(/\s+/);

  // Build a two-line title: first line is the topic in caps, second is a Hindi nostalgia tag
  const titleLine1 = clean.toUpperCase();
  const titleLine2 = 'यादों का सफ़र';

  return {
    title: [titleLine1, titleLine2],
    quotes: [
      `${clean} — वो दिन भी क्या दिन थे`,
      `कुछ यादें कभी पुरानी नहीं होतीं, जैसे ${clean.toLowerCase()}`,
      'Woh lamhe, woh baatein — dil mein aaj bhi zinda hain',
      'Nostalgia hits different jab asli yaadein ho',
      `${clean} ke woh din — ab bas photos mein hain`,
    ],
    detailLabels: [
      `MEMORY #${Math.floor(1990 + Math.random() * 20)}`,
      words[0]?.toUpperCase() || 'YAADEIN',
      'PURANE DIN',
      'DIL SE',
      'TIME MACHINE',
    ],
    icon: '✨',
    particleColor: '#FFB74D',
    particleAccent: '#FF8A65',
    gradientTint: 'rgba(255, 183, 77, 0.07)',
  };
}

/**
 * Get the content profile for a given topic.
 * Returns a predefined profile if available, otherwise generates a fallback.
 */
export function getTopicProfile(topic) {
  if (!topic) return generateFallback('Memory');
  const key = topic.trim().toLowerCase();
  return profiles[key] || generateFallback(topic);
}

export default profiles;
