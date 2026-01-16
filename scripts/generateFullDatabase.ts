/**
 * Full Database Generator for BALONPI 2026
 *
 * Generates a complete database with all leagues, teams, and players.
 * Uses real team names and generates realistic player data.
 *
 * This runs INSTANTLY - no API needed.
 * Later, API data can override/enhance this.
 *
 * Usage: npx tsx scripts/generateFullDatabase.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_FILE = path.join(__dirname, '../public/data/master_db_2026.json');

// Seed for reproducible randomness
let seed = 12345;
function random(): number {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
}

function randomInt(min: number, max: number): number {
  return Math.floor(random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(random() * arr.length)];
}

// ============================================================================
// REAL TEAM DATA
// ============================================================================

interface LeagueData {
  id: string;
  name: string;
  shortName: string;
  country: string;
  tier: number;
  teams: string[];
}

const LEAGUES: LeagueData[] = [
  // ARGENTINA
  {
    id: 'arg1',
    name: 'Liga Profesional Argentina',
    shortName: 'Liga ARG',
    country: 'Argentina',
    tier: 1,
    teams: [
      'River Plate', 'Boca Juniors', 'Racing Club', 'Independiente', 'San Lorenzo',
      'Vélez Sarsfield', 'Estudiantes LP', 'Talleres', 'Lanús', 'Argentinos Juniors',
      'Huracán', 'Banfield', 'Rosario Central', 'Newell\'s Old Boys', 'Colón',
      'Unión Santa Fe', 'Gimnasia LP', 'Central Córdoba', 'Belgrano', 'Instituto',
      'Platense', 'Tigre', 'Defensa y Justicia', 'Godoy Cruz', 'Sarmiento',
      'Barracas Central', 'Atlético Tucumán', 'Arsenal Sarandí'
    ]
  },
  {
    id: 'arg2',
    name: 'Primera Nacional',
    shortName: 'Prim. Nac.',
    country: 'Argentina',
    tier: 2,
    teams: [
      'San Martín SJ', 'Aldosivi', 'All Boys', 'Almirante Brown', 'Alvarado',
      'Atlético Rafaela', 'Brown Adrogué', 'Chacarita', 'Chaco For Ever', 'Deportivo Madryn',
      'Deportivo Maipú', 'Deportivo Morón', 'Estudiantes BA', 'Estudiantes RC', 'Ferro',
      'Flandria', 'Gimnasia Jujuy', 'Gimnasia Mendoza', 'Güemes', 'Independiente Rivadavia',
      'Mitre SE', 'Nueva Chicago', 'Quilmes', 'Racing Córdoba', 'San Martín Tucumán',
      'San Telmo', 'Santamarina', 'Temperley', 'Tristán Suárez', 'Villa Dálmine',
      'Agropecuario', 'Atlanta', 'Almagro', 'Los Andes', 'Comunicaciones', 'Sacachispas'
    ]
  },

  // BRAZIL
  {
    id: 'bra1',
    name: 'Campeonato Brasileiro Série A',
    shortName: 'Brasileirão',
    country: 'Brazil',
    tier: 1,
    teams: [
      'Flamengo', 'Palmeiras', 'São Paulo', 'Corinthians', 'Santos',
      'Fluminense', 'Atlético Mineiro', 'Cruzeiro', 'Internacional', 'Grêmio',
      'Botafogo', 'Vasco da Gama', 'Bahia', 'Fortaleza', 'Athletico Paranaense',
      'Red Bull Bragantino', 'Cuiabá', 'Goiás', 'América Mineiro', 'Coritiba'
    ]
  },
  {
    id: 'bra2',
    name: 'Campeonato Brasileiro Série B',
    shortName: 'Série B',
    country: 'Brazil',
    tier: 2,
    teams: [
      'Sport Recife', 'Ceará', 'Guarani', 'Ponte Preta', 'Vila Nova',
      'Avaí', 'Chapecoense', 'CRB', 'CSA', 'Londrina',
      'Operário PR', 'Sampaio Corrêa', 'Tombense', 'Novorizontino', 'Ituano',
      'ABC', 'Brusque', 'Criciúma', 'Mirassol', 'Náutico'
    ]
  },

  // ENGLAND
  {
    id: 'eng1',
    name: 'Premier League',
    shortName: 'EPL',
    country: 'England',
    tier: 1,
    teams: [
      'Manchester City', 'Arsenal', 'Liverpool', 'Manchester United', 'Chelsea',
      'Tottenham', 'Newcastle', 'Aston Villa', 'Brighton', 'West Ham',
      'Brentford', 'Crystal Palace', 'Fulham', 'Wolverhampton', 'Bournemouth',
      'Nottingham Forest', 'Everton', 'Leicester City', 'Leeds United', 'Southampton'
    ]
  },
  {
    id: 'eng2',
    name: 'EFL Championship',
    shortName: 'Championship',
    country: 'England',
    tier: 2,
    teams: [
      'Burnley', 'Sheffield United', 'Luton Town', 'Middlesbrough', 'Coventry City',
      'Sunderland', 'Watford', 'West Brom', 'Norwich City', 'Swansea City',
      'Millwall', 'Blackburn', 'Bristol City', 'Preston', 'Stoke City',
      'QPR', 'Cardiff City', 'Hull City', 'Reading', 'Birmingham City',
      'Wigan Athletic', 'Rotherham', 'Huddersfield', 'Blackpool'
    ]
  },

  // SPAIN
  {
    id: 'esp1',
    name: 'La Liga',
    shortName: 'La Liga',
    country: 'Spain',
    tier: 1,
    teams: [
      'Real Madrid', 'Barcelona', 'Atlético Madrid', 'Real Sociedad', 'Athletic Bilbao',
      'Real Betis', 'Villarreal', 'Sevilla', 'Valencia', 'Osasuna',
      'Girona', 'Getafe', 'Celta Vigo', 'Mallorca', 'Las Palmas',
      'Rayo Vallecano', 'Alavés', 'Almería', 'Cádiz', 'Granada'
    ]
  },
  {
    id: 'esp2',
    name: 'La Liga 2',
    shortName: 'Liga 2',
    country: 'Spain',
    tier: 2,
    teams: [
      'Eibar', 'Sporting Gijón', 'Racing Santander', 'Oviedo', 'Levante',
      'Huesca', 'Zaragoza', 'Valladolid', 'Elche', 'Tenerife',
      'Leganés', 'Burgos', 'Racing Ferrol', 'Eldense', 'Albacete',
      'Cartagena', 'Mirandés', 'Alcorcón', 'Andorra', 'Amorebieta', 'Villarreal B', 'Castellón'
    ]
  },

  // GERMANY
  {
    id: 'ger1',
    name: 'Bundesliga',
    shortName: 'Bundesliga',
    country: 'Germany',
    tier: 1,
    teams: [
      'Bayern Munich', 'Borussia Dortmund', 'RB Leipzig', 'Bayer Leverkusen', 'Union Berlin',
      'Freiburg', 'Eintracht Frankfurt', 'Wolfsburg', 'Mainz 05', 'Borussia M\'gladbach',
      'Köln', 'Hoffenheim', 'Werder Bremen', 'Bochum', 'Augsburg',
      'Stuttgart', 'Schalke 04', 'Hertha Berlin'
    ]
  },
  {
    id: 'ger2',
    name: '2. Bundesliga',
    shortName: '2. Bund.',
    country: 'Germany',
    tier: 2,
    teams: [
      'Hamburg', 'Hannover 96', 'Fortuna Düsseldorf', 'Nürnberg', 'Kaiserslautern',
      'Paderborn', 'St. Pauli', 'Heidenheim', 'Darmstadt', 'Greuther Fürth',
      'Karlsruher', 'Magdeburg', 'Regensburg', 'Rostock', 'Sandhausen',
      'Braunschweig', 'Bielefeld', 'Elversberg'
    ]
  },

  // ITALY
  {
    id: 'ita1',
    name: 'Serie A',
    shortName: 'Serie A',
    country: 'Italy',
    tier: 1,
    teams: [
      'Inter Milan', 'AC Milan', 'Juventus', 'Napoli', 'Roma',
      'Lazio', 'Atalanta', 'Fiorentina', 'Bologna', 'Torino',
      'Udinese', 'Sassuolo', 'Monza', 'Empoli', 'Salernitana',
      'Lecce', 'Verona', 'Cagliari', 'Frosinone', 'Genoa'
    ]
  },
  {
    id: 'ita2',
    name: 'Serie B',
    shortName: 'Serie B',
    country: 'Italy',
    tier: 2,
    teams: [
      'Parma', 'Como', 'Venezia', 'Cremonese', 'Catanzaro',
      'Palermo', 'Sampdoria', 'Brescia', 'Pisa', 'Bari',
      'Modena', 'Reggiana', 'Südtirol', 'Spezia', 'Cittadella',
      'Ascoli', 'Ternana', 'Cosenza', 'Feralpisalò', 'Perugia'
    ]
  },

  // FRANCE
  {
    id: 'fra1',
    name: 'Ligue 1',
    shortName: 'Ligue 1',
    country: 'France',
    tier: 1,
    teams: [
      'Paris Saint-Germain', 'Marseille', 'Monaco', 'Lyon', 'Lille',
      'Lens', 'Nice', 'Rennes', 'Strasbourg', 'Nantes',
      'Montpellier', 'Toulouse', 'Lorient', 'Reims', 'Brest',
      'Le Havre', 'Metz', 'Clermont'
    ]
  },
  {
    id: 'fra2',
    name: 'Ligue 2',
    shortName: 'Ligue 2',
    country: 'France',
    tier: 2,
    teams: [
      'Bordeaux', 'Saint-Étienne', 'Caen', 'Auxerre', 'Angers',
      'Guingamp', 'Troyes', 'Amiens', 'Paris FC', 'Sochaux',
      'Laval', 'Bastia', 'Grenoble', 'Rodez', 'Valenciennes',
      'Niort', 'Quevilly Rouen', 'Dunkerque', 'Concarneau', 'Annecy'
    ]
  },
];

// National Teams
const NATIONAL_TEAMS = [
  // South America
  { name: 'Argentina', code: 'ARG', confederation: 'CONMEBOL', tier: 1 },
  { name: 'Brazil', code: 'BRA', confederation: 'CONMEBOL', tier: 1 },
  { name: 'Uruguay', code: 'URU', confederation: 'CONMEBOL', tier: 1 },
  { name: 'Colombia', code: 'COL', confederation: 'CONMEBOL', tier: 2 },
  { name: 'Chile', code: 'CHI', confederation: 'CONMEBOL', tier: 2 },
  { name: 'Ecuador', code: 'ECU', confederation: 'CONMEBOL', tier: 2 },
  { name: 'Paraguay', code: 'PAR', confederation: 'CONMEBOL', tier: 2 },
  { name: 'Peru', code: 'PER', confederation: 'CONMEBOL', tier: 2 },
  { name: 'Venezuela', code: 'VEN', confederation: 'CONMEBOL', tier: 3 },
  { name: 'Bolivia', code: 'BOL', confederation: 'CONMEBOL', tier: 3 },

  // Europe
  { name: 'France', code: 'FRA', confederation: 'UEFA', tier: 1 },
  { name: 'England', code: 'ENG', confederation: 'UEFA', tier: 1 },
  { name: 'Spain', code: 'ESP', confederation: 'UEFA', tier: 1 },
  { name: 'Germany', code: 'GER', confederation: 'UEFA', tier: 1 },
  { name: 'Italy', code: 'ITA', confederation: 'UEFA', tier: 1 },
  { name: 'Netherlands', code: 'NED', confederation: 'UEFA', tier: 1 },
  { name: 'Portugal', code: 'POR', confederation: 'UEFA', tier: 1 },
  { name: 'Belgium', code: 'BEL', confederation: 'UEFA', tier: 1 },
  { name: 'Croatia', code: 'CRO', confederation: 'UEFA', tier: 2 },
  { name: 'Denmark', code: 'DEN', confederation: 'UEFA', tier: 2 },
  { name: 'Switzerland', code: 'SUI', confederation: 'UEFA', tier: 2 },
  { name: 'Austria', code: 'AUT', confederation: 'UEFA', tier: 2 },
  { name: 'Poland', code: 'POL', confederation: 'UEFA', tier: 2 },
  { name: 'Serbia', code: 'SRB', confederation: 'UEFA', tier: 2 },
  { name: 'Ukraine', code: 'UKR', confederation: 'UEFA', tier: 2 },
  { name: 'Sweden', code: 'SWE', confederation: 'UEFA', tier: 2 },
  { name: 'Czech Republic', code: 'CZE', confederation: 'UEFA', tier: 2 },
  { name: 'Turkey', code: 'TUR', confederation: 'UEFA', tier: 2 },
  { name: 'Scotland', code: 'SCO', confederation: 'UEFA', tier: 3 },
  { name: 'Wales', code: 'WAL', confederation: 'UEFA', tier: 3 },
  { name: 'Norway', code: 'NOR', confederation: 'UEFA', tier: 3 },
  { name: 'Republic of Ireland', code: 'IRL', confederation: 'UEFA', tier: 3 },
  { name: 'Romania', code: 'ROU', confederation: 'UEFA', tier: 3 },
  { name: 'Greece', code: 'GRE', confederation: 'UEFA', tier: 3 },
  { name: 'Hungary', code: 'HUN', confederation: 'UEFA', tier: 3 },
  { name: 'Slovenia', code: 'SVN', confederation: 'UEFA', tier: 3 },
  { name: 'Slovakia', code: 'SVK', confederation: 'UEFA', tier: 3 },

  // Africa
  { name: 'Morocco', code: 'MAR', confederation: 'CAF', tier: 2 },
  { name: 'Senegal', code: 'SEN', confederation: 'CAF', tier: 2 },
  { name: 'Nigeria', code: 'NGA', confederation: 'CAF', tier: 2 },
  { name: 'Cameroon', code: 'CMR', confederation: 'CAF', tier: 2 },
  { name: 'Egypt', code: 'EGY', confederation: 'CAF', tier: 2 },
  { name: 'Algeria', code: 'ALG', confederation: 'CAF', tier: 2 },
  { name: 'Tunisia', code: 'TUN', confederation: 'CAF', tier: 2 },
  { name: 'Ivory Coast', code: 'CIV', confederation: 'CAF', tier: 2 },
  { name: 'Ghana', code: 'GHA', confederation: 'CAF', tier: 2 },
  { name: 'South Africa', code: 'RSA', confederation: 'CAF', tier: 3 },

  // Asia
  { name: 'Japan', code: 'JPN', confederation: 'AFC', tier: 2 },
  { name: 'South Korea', code: 'KOR', confederation: 'AFC', tier: 2 },
  { name: 'Australia', code: 'AUS', confederation: 'AFC', tier: 2 },
  { name: 'Iran', code: 'IRN', confederation: 'AFC', tier: 2 },
  { name: 'Saudi Arabia', code: 'KSA', confederation: 'AFC', tier: 2 },
  { name: 'Qatar', code: 'QAT', confederation: 'AFC', tier: 3 },

  // North/Central America
  { name: 'Mexico', code: 'MEX', confederation: 'CONCACAF', tier: 2 },
  { name: 'USA', code: 'USA', confederation: 'CONCACAF', tier: 2 },
  { name: 'Canada', code: 'CAN', confederation: 'CONCACAF', tier: 3 },
  { name: 'Costa Rica', code: 'CRC', confederation: 'CONCACAF', tier: 3 },
];

// Names by nationality for realistic generation
const NAMES_BY_COUNTRY: Record<string, { first: string[]; last: string[] }> = {
  'Argentina': {
    first: ['Lionel', 'Enzo', 'Julián', 'Nicolás', 'Rodrigo', 'Leandro', 'Alejandro', 'Marcos', 'Gonzalo', 'Lucas', 'Emiliano', 'Cristian', 'Paulo', 'Ángel', 'Sergio', 'Maximiliano', 'Germán', 'Franco', 'Exequiel', 'Guido'],
    last: ['González', 'Rodríguez', 'Fernández', 'Martínez', 'López', 'García', 'Pérez', 'Romero', 'Díaz', 'Álvarez', 'Acuña', 'Paredes', 'Mac Allister', 'De Paul', 'Molina', 'Otamendi', 'Tagliafico', 'Palacios', 'Sosa', 'Medina']
  },
  'Brazil': {
    first: ['Vinícius', 'Neymar', 'Rodrygo', 'Gabriel', 'Lucas', 'Raphinha', 'Bruno', 'Casemiro', 'Richarlison', 'Alisson', 'Ederson', 'Thiago', 'Marquinhos', 'Eder', 'Antony', 'Pedro', 'Fabinho', 'Roberto', 'João', 'Matheus'],
    last: ['Silva', 'Santos', 'Oliveira', 'Souza', 'Lima', 'Pereira', 'Costa', 'Ferreira', 'Rodrigues', 'Almeida', 'Barbosa', 'Araújo', 'Ribeiro', 'Nascimento', 'Carvalho', 'Gomes', 'Martins', 'Rocha', 'Moura', 'Cunha']
  },
  'England': {
    first: ['Harry', 'Marcus', 'Raheem', 'Jack', 'Phil', 'Mason', 'Bukayo', 'Jude', 'Declan', 'Kyle', 'John', 'Jordan', 'Trent', 'Kieran', 'James', 'Callum', 'Conor', 'Ben', 'Aaron', 'Dominic'],
    last: ['Kane', 'Rashford', 'Sterling', 'Grealish', 'Foden', 'Mount', 'Saka', 'Bellingham', 'Rice', 'Walker', 'Stones', 'Henderson', 'Alexander-Arnold', 'Trippier', 'Maddison', 'Wilson', 'Gallagher', 'White', 'Ramsdale', 'Calvert-Lewin']
  },
  'Spain': {
    first: ['Pedri', 'Gavi', 'Rodri', 'Ferran', 'Álvaro', 'Marco', 'Dani', 'Pablo', 'Sergio', 'David', 'Jordi', 'Mikel', 'Nico', 'Alejandro', 'Carlos', 'Unai', 'Aymeric', 'César', 'Eric', 'Pau'],
    last: ['García', 'Torres', 'Hernández', 'Morata', 'Asensio', 'Olmo', 'Carvajal', 'Alba', 'Busquets', 'Oyarzabal', 'Williams', 'Merino', 'Simón', 'Laporte', 'Azpilicueta', 'Navas', 'Sarabia', 'Llorente', 'Grimaldo', 'Cucurella']
  },
  'Germany': {
    first: ['Joshua', 'Kai', 'Jamal', 'Leroy', 'Serge', 'Antonio', 'Leon', 'Ilkay', 'Niclas', 'Thomas', 'Manuel', 'Marc-André', 'Florian', 'Nico', 'Julian', 'Robin', 'David', 'Karim', 'Timo', 'Jonas'],
    last: ['Kimmich', 'Havertz', 'Musiala', 'Sané', 'Gnabry', 'Rüdiger', 'Goretzka', 'Gündogan', 'Füllkrug', 'Müller', 'Neuer', 'ter Stegen', 'Wirtz', 'Schlotterbeck', 'Brandt', 'Gosens', 'Raum', 'Adeyemi', 'Werner', 'Hofmann']
  },
  'France': {
    first: ['Kylian', 'Antoine', 'Ousmane', 'Olivier', 'Aurélien', 'Theo', 'Jules', 'Ibrahima', 'William', 'Kingsley', 'Eduardo', 'Raphaël', 'Adrien', 'Lucas', 'Marcus', 'Randal', 'Christopher', 'Dayot', 'Benjamin', 'Mike'],
    last: ['Mbappé', 'Griezmann', 'Dembélé', 'Giroud', 'Tchouaméni', 'Hernández', 'Koundé', 'Konaté', 'Saliba', 'Coman', 'Camavinga', 'Varane', 'Rabiot', 'Digne', 'Thuram', 'Kolo Muani', 'Nkunku', 'Upamecano', 'Pavard', 'Maignan']
  },
  'Italy': {
    first: ['Gianluigi', 'Federico', 'Marco', 'Lorenzo', 'Nicolò', 'Sandro', 'Alessandro', 'Giacomo', 'Gianluca', 'Matteo', 'Davide', 'Manuel', 'Giovanni', 'Andrea', 'Simone', 'Domenico', 'Ciro', 'Bryan', 'Francesco', 'Riccardo'],
    last: ['Donnarumma', 'Chiesa', 'Verratti', 'Insigne', 'Barella', 'Tonali', 'Bastoni', 'Raspadori', 'Scamacca', 'Politano', 'Calabria', 'Locatelli', 'Di Lorenzo', 'Belotti', 'Pellegrini', 'Berardi', 'Immobile', 'Cristante', 'Acerbi', 'Calafiori']
  },
  'Netherlands': {
    first: ['Virgil', 'Frenkie', 'Memphis', 'Cody', 'Matthijs', 'Denzel', 'Steven', 'Daley', 'Nathan', 'Jurriën', 'Micky', 'Teun', 'Xavi', 'Donyell', 'Jeremie', 'Wout', 'Luuk', 'Tijjani', 'Brian', 'Ryan'],
    last: ['van Dijk', 'de Jong', 'Depay', 'Gakpo', 'de Ligt', 'Dumfries', 'Bergwijn', 'Blind', 'Aké', 'Timber', 'van de Ven', 'Koopmeiners', 'Simons', 'Malen', 'Frimpong', 'Weghorst', 'de Vrij', 'Reijnders', 'Brobbey', 'Gravenberch']
  },
  'Portugal': {
    first: ['Cristiano', 'Bruno', 'Bernardo', 'João', 'Diogo', 'Rafael', 'Rúben', 'Vitinha', 'Nuno', 'Gonçalo', 'Pedro', 'Pepe', 'Danilo', 'William', 'Matheus', 'António', 'Ricardo', 'André', 'Otávio', 'Francisco'],
    last: ['Ronaldo', 'Fernandes', 'Silva', 'Cancelo', 'Jota', 'Leão', 'Dias', 'Neves', 'Mendes', 'Ramos', 'Neto', 'Pereira', 'Guerreiro', 'Carvalho', 'Palhinha', 'Horta', 'Costa', 'Dalot', 'Tavares', 'Conceição']
  },
};

// Default names for countries without specific data
const DEFAULT_NAMES = {
  first: ['Juan', 'Carlos', 'Miguel', 'José', 'Luis', 'David', 'Daniel', 'Pedro', 'Francisco', 'Antonio'],
  last: ['García', 'Martínez', 'López', 'González', 'Rodríguez', 'Hernández', 'Pérez', 'Sánchez', 'Ramírez', 'Torres']
};

// ============================================================================
// GENERATOR FUNCTIONS
// ============================================================================

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

// Create deterministic ID from name (for consistent references)
function nameToId(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function getNames(country: string): { first: string[]; last: string[] } {
  return NAMES_BY_COUNTRY[country] || DEFAULT_NAMES;
}

function generatePlayerName(country: string): string {
  const names = getNames(country);
  return `${pick(names.first)} ${pick(names.last)}`;
}

function generateSkillForTier(tier: number, position: 'GK' | 'DEF' | 'MID' | 'FWD'): { skill: number; potential: number } {
  // Tier 1 (top leagues): 70-92
  // Tier 2 (second divisions): 55-78
  // Tier 3 (lower): 45-68
  const ranges = {
    1: { min: 68, max: 92 },
    2: { min: 55, max: 78 },
    3: { min: 45, max: 68 },
  };

  const range = ranges[tier as keyof typeof ranges] || ranges[2];
  const skill = randomInt(range.min, range.max);
  const potential = Math.min(99, skill + randomInt(0, 15));

  return { skill, potential };
}

function generateAge(): number {
  // Distribution: young talent, prime years, veterans
  const r = random();
  if (r < 0.15) return randomInt(17, 21);      // 15% young
  if (r < 0.70) return randomInt(22, 29);      // 55% prime
  if (r < 0.90) return randomInt(30, 33);      // 20% experienced
  return randomInt(34, 38);                     // 10% veteran
}

function generatePlayer(
  teamId: string,
  teamCountry: string,
  tier: number,
  position: 'GK' | 'DEF' | 'MID' | 'FWD',
  index: number
): any {
  const { skill, potential } = generateSkillForTier(tier, position);
  const age = generateAge();
  const name = generatePlayerName(teamCountry);

  const marketValue = Math.round(skill * skill * 500 + randomInt(100000, 2000000));
  const wage = Math.round(skill * 800 + randomInt(10000, 50000));

  return {
    id: `p_${generateId()}`,
    name,
    nationality: teamCountry,
    age,
    positionMain: position,
    positionAlt: null,
    skillBase: skill,
    potential,
    form: randomInt(60, 85),
    conditionArrow: pick(['UP', 'UP', 'STABLE', 'STABLE', 'STABLE', 'DOWN']),
    clubId: teamId,
    nationalTeamId: null,
    wage,
    contractEnd: `202${randomInt(5, 9)}-06-30`,
    marketValue,
    transferStatus: pick(['UNAVAILABLE', 'UNAVAILABLE', 'UNAVAILABLE', 'AVAILABLE', 'LISTED']),
    isIdol: random() < 0.05,
    currentSeasonStats: {
      appearances: randomInt(0, 25),
      goals: position === 'FWD' ? randomInt(0, 15) : position === 'MID' ? randomInt(0, 8) : randomInt(0, 3),
      assists: position === 'FWD' || position === 'MID' ? randomInt(0, 10) : randomInt(0, 3),
      cleanSheets: position === 'GK' ? randomInt(0, 12) : 0,
      yellowCards: randomInt(0, 6),
      redCards: randomInt(0, 1),
      avgRating: 6 + random() * 2,
    },
    careerStats: {
      appearances: randomInt(0, 300),
      goals: position === 'FWD' ? randomInt(0, 150) : randomInt(0, 50),
      assists: randomInt(0, 80),
      trophies: randomInt(0, 8),
    },
  };
}

function generateSquad(teamId: string, teamCountry: string, tier: number): any[] {
  const squad: any[] = [];

  // Generate squad: 3 GK, 8 DEF, 8 MID, 6 FWD = 25 players
  const positions: Array<{ pos: 'GK' | 'DEF' | 'MID' | 'FWD'; count: number }> = [
    { pos: 'GK', count: 3 },
    { pos: 'DEF', count: 8 },
    { pos: 'MID', count: 8 },
    { pos: 'FWD', count: 6 },
  ];

  let index = 0;
  for (const { pos, count } of positions) {
    for (let i = 0; i < count; i++) {
      squad.push(generatePlayer(teamId, teamCountry, tier, pos, index++));
    }
  }

  return squad;
}

function generateShortCode(name: string): string {
  // Generate 3-letter code from team name
  const words = name.split(' ').filter(w => w.length > 0);
  if (words.length === 1) {
    return words[0].substring(0, 3).toUpperCase();
  }
  if (words.length === 2) {
    return (words[0].substring(0, 2) + words[1].substring(0, 1)).toUpperCase();
  }
  return words.map(w => w[0]).join('').substring(0, 3).toUpperCase();
}

function generateTeam(name: string, leagueId: string, country: string, tier: number): any {
  const id = nameToId(name);

  const reputation = tier === 1 ? randomInt(70, 95) : randomInt(50, 75);
  const balance = tier === 1
    ? randomInt(10000000, 200000000)
    : randomInt(1000000, 30000000);

  return {
    id,
    name,
    shortCode: generateShortCode(name),
    country,
    tier,
    reputation,
    balance,
    wageBudget: Math.round(balance * 0.03),
    stadium: `${name} Stadium`,
    stadiumCapacity: tier === 1 ? randomInt(30000, 80000) : randomInt(10000, 35000),
    rivalClubIds: [],
    leagueId,
    isNationalTeam: false,
  };
}

function generateManager(teamId: string, country: string): any {
  const names = getNames(country);

  return {
    id: `m_${generateId()}`,
    name: `${pick(names.first)} ${pick(names.last)}`,
    nationality: country,
    age: randomInt(40, 65),
    clubId: teamId,
    reputation: randomInt(60, 90),
    preferredFormation: pick(['4-3-3', '4-4-2', '4-2-3-1', '3-5-2', '5-3-2']),
    style: pick(['ATTACKING', 'BALANCED', 'DEFENSIVE', 'POSSESSION', 'COUNTER']),
  };
}

// ============================================================================
// MAIN GENERATOR
// ============================================================================

function generateDatabase(): any {
  console.log('Generating BALONPI 2026 Database...\n');

  const database: any = {
    meta: {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      season: '2024-2025',
      generated: true,
    },
    players: [],
    clubs: [],
    managers: [],
    competitions: [],
    nationalities: Object.keys(NAMES_BY_COUNTRY).map(country => ({
      id: country.toLowerCase().replace(/\s+/g, '_'),
      name: country,
      namePatterns: NAMES_BY_COUNTRY[country],
    })),
  };

  // Generate clubs and players for each league
  for (const league of LEAGUES) {
    console.log(`Generating ${league.name}...`);

    const competition = {
      id: league.id,
      name: league.name,
      shortName: league.shortName,
      country: league.country,
      type: 'LEAGUE',
      tier: league.tier,
      teamIds: [] as string[],
      standings: [] as any[],
      seasonRecords: null,
    };

    for (const teamName of league.teams) {
      const team = generateTeam(teamName, league.id, league.country, league.tier);
      database.clubs.push(team);
      competition.teamIds.push(team.id);

      // Generate squad
      const squad = generateSquad(team.id, league.country, league.tier);
      database.players.push(...squad);

      // Generate manager
      const manager = generateManager(team.id, league.country);
      database.managers.push(manager);

      // Generate standings entry
      const played = randomInt(10, 25);
      const wins = randomInt(0, played);
      const draws = randomInt(0, played - wins);
      const losses = played - wins - draws;

      competition.standings.push({
        clubId: team.id,
        played,
        won: wins,
        drawn: draws,
        lost: losses,
        goalsFor: randomInt(wins * 1, wins * 3 + draws),
        goalsAgainst: randomInt(losses, losses * 2 + draws),
        points: wins * 3 + draws,
        form: Array.from({ length: 5 }, () => pick(['W', 'W', 'D', 'L'])),
      });
    }

    // Sort standings by points
    competition.standings.sort((a: any, b: any) => b.points - a.points);

    database.competitions.push(competition);
    console.log(`  → ${league.teams.length} teams, ${league.teams.length * 25} players`);
  }

  // Generate national teams
  console.log('\nGenerating National Teams...');
  for (const nation of NATIONAL_TEAMS) {
    const team = {
      id: `nt_${nation.code.toLowerCase()}`,
      name: nation.name,
      shortCode: nation.code,
      country: nation.name,
      tier: nation.tier,
      reputation: nation.tier === 1 ? randomInt(85, 98) : nation.tier === 2 ? randomInt(70, 88) : randomInt(55, 72),
      balance: 0,
      wageBudget: 0,
      stadium: `${nation.name} National Stadium`,
      stadiumCapacity: randomInt(40000, 90000),
      rivalClubIds: [],
      leagueId: null,
      isNationalTeam: true,
      confederation: nation.confederation,
    };
    database.clubs.push(team);

    // National teams pull from club players, so we don't generate dedicated squads
  }
  console.log(`  → ${NATIONAL_TEAMS.length} national teams`);

  // Generate international competitions
  const internationalComps = [
    { id: 'worldcup', name: 'FIFA World Cup', shortName: 'World Cup', type: 'KNOCKOUT' },
    { id: 'copaamerica', name: 'Copa América', shortName: 'Copa América', type: 'KNOCKOUT' },
    { id: 'euro', name: 'UEFA European Championship', shortName: 'Euro', type: 'KNOCKOUT' },
    { id: 'ucl', name: 'UEFA Champions League', shortName: 'UCL', type: 'KNOCKOUT' },
    { id: 'uel', name: 'UEFA Europa League', shortName: 'UEL', type: 'KNOCKOUT' },
    { id: 'libertadores', name: 'Copa Libertadores', shortName: 'Libertadores', type: 'KNOCKOUT' },
    { id: 'sudamericana', name: 'Copa Sudamericana', shortName: 'Sudamericana', type: 'KNOCKOUT' },
  ];

  for (const comp of internationalComps) {
    database.competitions.push({
      ...comp,
      country: null,
      tier: 1,
      teamIds: [],
      standings: [],
      seasonRecords: null,
    });
  }

  return database;
}

// ============================================================================
// EXECUTE
// ============================================================================

function main() {
  const database = generateDatabase();

  // Ensure output directory exists
  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Write database
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(database, null, 2));

  console.log('\n' + '='.repeat(60));
  console.log('DATABASE GENERATED SUCCESSFULLY!');
  console.log('='.repeat(60));
  console.log(`Clubs: ${database.clubs.length}`);
  console.log(`Players: ${database.players.length}`);
  console.log(`Managers: ${database.managers.length}`);
  console.log(`Competitions: ${database.competitions.length}`);
  console.log(`Output: ${OUTPUT_FILE}`);
  console.log('='.repeat(60));
}

main();
