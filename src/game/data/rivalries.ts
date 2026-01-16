/**
 * Rivalries Data - Historical club rivalries and player quotes
 *
 * Contains:
 * - Famous derby rivalries (Boca-River, Real-Barca, etc.)
 * - Generic player quotes by situation
 * - Derby-specific quotes
 */

// Club rivalries by club name (case-insensitive match)
// Format: { clubName: [rivalClubNames] }
export const CLUB_RIVALRIES: Record<string, string[]> = {
  // Argentina
  'boca juniors': ['river plate'],
  'river plate': ['boca juniors'],
  'racing club': ['independiente'],
  'independiente': ['racing club'],
  'san lorenzo': ['huracán'],
  'huracán': ['san lorenzo'],
  'rosario central': ['newell\'s old boys'],
  'newell\'s old boys': ['rosario central'],
  'estudiantes': ['gimnasia la plata'],
  'gimnasia la plata': ['estudiantes'],

  // Spain
  'real madrid': ['barcelona', 'atlético madrid'],
  'barcelona': ['real madrid', 'espanyol'],
  'atlético madrid': ['real madrid'],
  'espanyol': ['barcelona'],
  'athletic bilbao': ['real sociedad'],
  'real sociedad': ['athletic bilbao'],
  'sevilla': ['real betis'],
  'real betis': ['sevilla'],
  'valencia': ['villarreal', 'levante'],

  // England
  'manchester united': ['manchester city', 'liverpool'],
  'manchester city': ['manchester united'],
  'liverpool': ['everton', 'manchester united'],
  'everton': ['liverpool'],
  'arsenal': ['tottenham'],
  'tottenham': ['arsenal'],
  'chelsea': ['fulham', 'tottenham'],
  'west ham': ['millwall'],
  'newcastle': ['sunderland'],
  'sunderland': ['newcastle'],
  'aston villa': ['birmingham'],
  'birmingham': ['aston villa'],

  // Italy
  'juventus': ['torino', 'inter milan'],
  'torino': ['juventus'],
  'inter milan': ['ac milan', 'juventus'],
  'ac milan': ['inter milan'],
  'roma': ['lazio'],
  'lazio': ['roma'],
  'napoli': ['juventus'],
  'genoa': ['sampdoria'],
  'sampdoria': ['genoa'],

  // Germany
  'bayern munich': ['borussia dortmund', '1860 munich'],
  'borussia dortmund': ['bayern munich', 'schalke 04'],
  'schalke 04': ['borussia dortmund'],
  'hamburg': ['werder bremen'],
  'werder bremen': ['hamburg'],
  'köln': ['borussia mönchengladbach'],
  'borussia mönchengladbach': ['köln'],

  // France
  'paris saint-germain': ['marseille'],
  'marseille': ['paris saint-germain'],
  'lyon': ['saint-étienne'],
  'saint-étienne': ['lyon'],
  'nice': ['monaco'],
  'monaco': ['nice'],

  // Portugal
  'benfica': ['sporting cp', 'porto'],
  'sporting cp': ['benfica'],
  'porto': ['benfica', 'sporting cp'],

  // Netherlands
  'ajax': ['feyenoord', 'psv'],
  'feyenoord': ['ajax', 'sparta rotterdam'],
  'psv': ['ajax'],

  // Scotland
  'celtic': ['rangers'],
  'rangers': ['celtic'],

  // Turkey
  'galatasaray': ['fenerbahçe', 'beşiktaş'],
  'fenerbahçe': ['galatasaray', 'beşiktaş'],
  'beşiktaş': ['galatasaray', 'fenerbahçe'],

  // Greece
  'olympiacos': ['panathinaikos'],
  'panathinaikos': ['olympiacos'],

  // Brazil
  'flamengo': ['fluminense', 'vasco da gama'],
  'fluminense': ['flamengo'],
  'vasco da gama': ['flamengo', 'botafogo'],
  'botafogo': ['vasco da gama'],
  'corinthians': ['palmeiras', 'são paulo'],
  'palmeiras': ['corinthians', 'são paulo'],
  'são paulo': ['corinthians', 'palmeiras'],
  'santos': ['corinthians'],
  'grêmio': ['internacional'],
  'internacional': ['grêmio'],
  'cruzeiro': ['atlético mineiro'],
  'atlético mineiro': ['cruzeiro'],

  // Mexico
  'club américa': ['chivas guadalajara', 'pumas unam'],
  'chivas guadalajara': ['club américa', 'atlas'],
  'pumas unam': ['club américa'],
  'atlas': ['chivas guadalajara'],
  'cruz azul': ['club américa'],
  'tigres uanl': ['monterrey'],
  'monterrey': ['tigres uanl'],
};

// Player quotes by context
export interface PlayerQuote {
  text: string;
  context: 'GENERAL' | 'DERBY' | 'WIN' | 'LOSS' | 'TRANSFER' | 'YOUTH' | 'VETERAN' | 'STAR';
  minSkill?: number;
  maxSkill?: number;
  minAge?: number;
  maxAge?: number;
}

export const PLAYER_QUOTES: PlayerQuote[] = [
  // General quotes
  { text: "Trabajo duro cada día para mejorar.", context: 'GENERAL' },
  { text: "El equipo siempre está primero.", context: 'GENERAL' },
  { text: "Sueño con ganar títulos aquí.", context: 'GENERAL' },
  { text: "La afición nos da una energía increíble.", context: 'GENERAL' },
  { text: "Quiero demostrar de lo que soy capaz.", context: 'GENERAL' },
  { text: "Cada partido es una oportunidad.", context: 'GENERAL' },
  { text: "Me siento bien físicamente.", context: 'GENERAL' },
  { text: "El míster confía en mí y eso me motiva.", context: 'GENERAL' },

  // Youth quotes (under 23)
  { text: "Estoy aprendiendo de los más experimentados.", context: 'YOUTH', maxAge: 22 },
  { text: "Tengo hambre de demostrar mi valía.", context: 'YOUTH', maxAge: 22 },
  { text: "Soy joven pero estoy listo para el desafío.", context: 'YOUTH', maxAge: 22 },
  { text: "El fútbol es mi vida desde pequeño.", context: 'YOUTH', maxAge: 22 },
  { text: "Quiero convertirme en un jugador top.", context: 'YOUTH', maxAge: 22 },
  { text: "Cada minuto en cancha es un regalo.", context: 'YOUTH', maxAge: 22 },

  // Veteran quotes (30+)
  { text: "La experiencia te enseña a leer el juego.", context: 'VETERAN', minAge: 30 },
  { text: "Mi cuerpo ya no es el mismo, pero mi cabeza está más fuerte.", context: 'VETERAN', minAge: 30 },
  { text: "Quiero transmitir todo lo que sé a los jóvenes.", context: 'VETERAN', minAge: 30 },
  { text: "Cada temporada puede ser la última, hay que disfrutar.", context: 'VETERAN', minAge: 30 },
  { text: "He vivido de todo en el fútbol.", context: 'VETERAN', minAge: 30 },
  { text: "La mentalidad es lo que te mantiene al más alto nivel.", context: 'VETERAN', minAge: 32 },

  // Star player quotes (skill 80+)
  { text: "Me exijo ser el mejor en cada entrenamiento.", context: 'STAR', minSkill: 80 },
  { text: "Los grandes partidos me motivan más.", context: 'STAR', minSkill: 80 },
  { text: "Quiero dejar mi huella en la historia del club.", context: 'STAR', minSkill: 80 },
  { text: "La presión es un privilegio.", context: 'STAR', minSkill: 80 },
  { text: "Cuando el equipo me necesita, respondo.", context: 'STAR', minSkill: 85 },
  { text: "Nací para jugar estos partidos.", context: 'STAR', minSkill: 85 },

  // Derby quotes
  { text: "Un derbi se vive diferente, es otra cosa.", context: 'DERBY' },
  { text: "No hay nada como ganarle al clásico rival.", context: 'DERBY' },
  { text: "Los derbis no se juegan, se ganan.", context: 'DERBY' },
  { text: "La rivalidad se siente en el aire.", context: 'DERBY' },
  { text: "Para esto vine aquí, para estos partidos.", context: 'DERBY' },
  { text: "Perder un derbi duele toda la semana.", context: 'DERBY' },

  // After win quotes
  { text: "Disfrutamos la victoria pero ya pensamos en el próximo.", context: 'WIN' },
  { text: "El trabajo del equipo fue espectacular.", context: 'WIN' },
  { text: "Tres puntos más, seguimos en la pelea.", context: 'WIN' },

  // After loss quotes
  { text: "Hay que levantar la cabeza y seguir.", context: 'LOSS' },
  { text: "No estuvimos a la altura, lo admitimos.", context: 'LOSS' },
  { text: "Esto nos da más hambre para el próximo.", context: 'LOSS' },

  // Transfer related
  { text: "Estoy feliz aquí, no pienso en irme.", context: 'TRANSFER' },
  { text: "Mi futuro está en manos de mi representante.", context: 'TRANSFER' },
  { text: "Lo importante es jugar, donde sea.", context: 'TRANSFER' },
];

// Get a quote for a player based on their profile
export function getPlayerQuote(player: {
  age: number;
  skillBase: number;
  clubId: string | null;
}, clubs: { id: string; name: string; rivalClubIds?: string[] }[]): string {
  const eligibleQuotes: PlayerQuote[] = [];

  // Find the player's club
  const playerClub = clubs.find(c => c.id === player.clubId);
  const hasRival = playerClub?.rivalClubIds && playerClub.rivalClubIds.length > 0;

  for (const quote of PLAYER_QUOTES) {
    // Check age constraints
    if (quote.minAge && player.age < quote.minAge) continue;
    if (quote.maxAge && player.age > quote.maxAge) continue;

    // Check skill constraints
    if (quote.minSkill && player.skillBase < quote.minSkill) continue;
    if (quote.maxSkill && player.skillBase > quote.maxSkill) continue;

    // Context-specific filtering
    if (quote.context === 'DERBY' && !hasRival) continue;

    eligibleQuotes.push(quote);
  }

  // Fallback to general quotes if nothing matches
  if (eligibleQuotes.length === 0) {
    const generalQuotes = PLAYER_QUOTES.filter(q => q.context === 'GENERAL');
    return generalQuotes[Math.floor(Math.random() * generalQuotes.length)]?.text || '';
  }

  // Return a random eligible quote
  return eligibleQuotes[Math.floor(Math.random() * eligibleQuotes.length)].text;
}

// Get a consistent quote for a player (seeded by player id)
export function getConsistentPlayerQuote(
  playerId: string,
  player: { age: number; skillBase: number; clubId: string | null },
  clubs: { id: string; name: string; rivalClubIds?: string[] }[]
): string {
  const eligibleQuotes: PlayerQuote[] = [];

  const playerClub = clubs.find(c => c.id === player.clubId);
  const hasRival = playerClub?.rivalClubIds && playerClub.rivalClubIds.length > 0;

  for (const quote of PLAYER_QUOTES) {
    if (quote.minAge && player.age < quote.minAge) continue;
    if (quote.maxAge && player.age > quote.maxAge) continue;
    if (quote.minSkill && player.skillBase < quote.minSkill) continue;
    if (quote.maxSkill && player.skillBase > quote.maxSkill) continue;
    if (quote.context === 'DERBY' && !hasRival) continue;

    eligibleQuotes.push(quote);
  }

  if (eligibleQuotes.length === 0) {
    const generalQuotes = PLAYER_QUOTES.filter(q => q.context === 'GENERAL');
    // Use playerId to get consistent index
    const seed = playerId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return generalQuotes[seed % generalQuotes.length]?.text || '';
  }

  // Use playerId to get consistent index
  const seed = playerId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return eligibleQuotes[seed % eligibleQuotes.length].text;
}

// Check if two clubs are rivals
export function areRivals(club1Name: string, club2Name: string): boolean {
  const name1 = club1Name.toLowerCase();
  const name2 = club2Name.toLowerCase();

  const rivals1 = CLUB_RIVALRIES[name1];
  if (rivals1) {
    for (const rival of rivals1) {
      if (name2.includes(rival) || rival.includes(name2)) {
        return true;
      }
    }
  }

  return false;
}

// Get rivalry intensity (for match simulation)
export function getRivalryIntensity(club1Name: string, club2Name: string): number {
  if (!areRivals(club1Name, club2Name)) return 0;

  // Some derbies are more intense than others
  const name1 = club1Name.toLowerCase();
  const name2 = club2Name.toLowerCase();

  const majorDerbies = [
    ['boca juniors', 'river plate'],
    ['real madrid', 'barcelona'],
    ['celtic', 'rangers'],
    ['inter milan', 'ac milan'],
    ['galatasaray', 'fenerbahçe'],
    ['flamengo', 'fluminense'],
  ];

  for (const [a, b] of majorDerbies) {
    if ((name1.includes(a) && name2.includes(b)) || (name1.includes(b) && name2.includes(a))) {
      return 100; // Maximum intensity
    }
  }

  return 70; // Regular derby intensity
}
