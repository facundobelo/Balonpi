/**
 * Real Teams Database Generator
 *
 * Creates a database with REAL team names from all major leagues
 * and generates realistic player rosters.
 *
 * Teams are real, player names are generated but plausible.
 *
 * Usage: npx tsx scripts/generateRealTeams.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_FILE = path.join(__dirname, '../public/data/master_db_2026.json');

// ============================================================================
// REAL TEAM DATA - 2024-2025 Season
// ============================================================================

interface LeagueData {
  id: string;
  name: string;
  shortName: string;
  country: string;
  tier: number;
  teams: Array<{
    name: string;
    shortCode: string;
    stadium: string;
    capacity: number;
    founded?: number;
  }>;
}

const LEAGUES: LeagueData[] = [
  // ============================================================================
  // ENGLAND
  // ============================================================================
  {
    id: 'epl',
    name: 'Premier League',
    shortName: 'EPL',
    country: 'England',
    tier: 1,
    teams: [
      { name: 'Arsenal', shortCode: 'ARS', stadium: 'Emirates Stadium', capacity: 60704 },
      { name: 'Aston Villa', shortCode: 'AVL', stadium: 'Villa Park', capacity: 42749 },
      { name: 'Bournemouth', shortCode: 'BOU', stadium: 'Vitality Stadium', capacity: 11307 },
      { name: 'Brentford', shortCode: 'BRE', stadium: 'Gtech Community Stadium', capacity: 17250 },
      { name: 'Brighton', shortCode: 'BHA', stadium: 'Amex Stadium', capacity: 31800 },
      { name: 'Chelsea', shortCode: 'CHE', stadium: 'Stamford Bridge', capacity: 40343 },
      { name: 'Crystal Palace', shortCode: 'CRY', stadium: 'Selhurst Park', capacity: 25486 },
      { name: 'Everton', shortCode: 'EVE', stadium: 'Goodison Park', capacity: 39414 },
      { name: 'Fulham', shortCode: 'FUL', stadium: 'Craven Cottage', capacity: 25700 },
      { name: 'Ipswich Town', shortCode: 'IPS', stadium: 'Portman Road', capacity: 30311 },
      { name: 'Leicester City', shortCode: 'LEI', stadium: 'King Power Stadium', capacity: 32312 },
      { name: 'Liverpool', shortCode: 'LIV', stadium: 'Anfield', capacity: 61276 },
      { name: 'Manchester City', shortCode: 'MCI', stadium: 'Etihad Stadium', capacity: 53400 },
      { name: 'Manchester United', shortCode: 'MUN', stadium: 'Old Trafford', capacity: 74310 },
      { name: 'Newcastle United', shortCode: 'NEW', stadium: "St James' Park", capacity: 52305 },
      { name: 'Nottingham Forest', shortCode: 'NFO', stadium: 'City Ground', capacity: 30445 },
      { name: 'Southampton', shortCode: 'SOU', stadium: "St Mary's Stadium", capacity: 32384 },
      { name: 'Tottenham Hotspur', shortCode: 'TOT', stadium: 'Tottenham Hotspur Stadium', capacity: 62850 },
      { name: 'West Ham United', shortCode: 'WHU', stadium: 'London Stadium', capacity: 62500 },
      { name: 'Wolverhampton', shortCode: 'WOL', stadium: 'Molineux Stadium', capacity: 32050 },
    ],
  },
  {
    id: 'championship',
    name: 'EFL Championship',
    shortName: 'CHA',
    country: 'England',
    tier: 2,
    teams: [
      { name: 'Leeds United', shortCode: 'LEE', stadium: 'Elland Road', capacity: 37890 },
      { name: 'Burnley', shortCode: 'BUR', stadium: 'Turf Moor', capacity: 21944 },
      { name: 'Sheffield United', shortCode: 'SHU', stadium: 'Bramall Lane', capacity: 32050 },
      { name: 'Norwich City', shortCode: 'NOR', stadium: 'Carrow Road', capacity: 27359 },
      { name: 'West Brom', shortCode: 'WBA', stadium: 'The Hawthorns', capacity: 26850 },
      { name: 'Middlesbrough', shortCode: 'MID', stadium: 'Riverside Stadium', capacity: 34742 },
      { name: 'Sunderland', shortCode: 'SUN', stadium: 'Stadium of Light', capacity: 49000 },
      { name: 'Watford', shortCode: 'WAT', stadium: 'Vicarage Road', capacity: 23700 },
      { name: 'Coventry City', shortCode: 'COV', stadium: 'Coventry Building Society Arena', capacity: 32609 },
      { name: 'Stoke City', shortCode: 'STK', stadium: 'bet365 Stadium', capacity: 30089 },
      { name: 'Blackburn Rovers', shortCode: 'BLB', stadium: 'Ewood Park', capacity: 31367 },
      { name: 'Bristol City', shortCode: 'BRC', stadium: 'Ashton Gate', capacity: 27000 },
      { name: 'Millwall', shortCode: 'MIL', stadium: 'The Den', capacity: 20146 },
      { name: 'Swansea City', shortCode: 'SWA', stadium: 'Swansea.com Stadium', capacity: 21088 },
      { name: 'Preston North End', shortCode: 'PRE', stadium: 'Deepdale', capacity: 23404 },
      { name: 'Queens Park Rangers', shortCode: 'QPR', stadium: 'Loftus Road', capacity: 18439 },
      { name: 'Hull City', shortCode: 'HUL', stadium: 'MKM Stadium', capacity: 25586 },
      { name: 'Cardiff City', shortCode: 'CAR', stadium: 'Cardiff City Stadium', capacity: 33280 },
      { name: 'Sheffield Wednesday', shortCode: 'SHW', stadium: 'Hillsborough', capacity: 39732 },
      { name: 'Derby County', shortCode: 'DER', stadium: 'Pride Park', capacity: 33597 },
      { name: 'Plymouth Argyle', shortCode: 'PLY', stadium: 'Home Park', capacity: 18600 },
      { name: 'Oxford United', shortCode: 'OXF', stadium: 'Kassam Stadium', capacity: 12500 },
      { name: 'Portsmouth', shortCode: 'POR', stadium: 'Fratton Park', capacity: 20899 },
      { name: 'Luton Town', shortCode: 'LUT', stadium: 'Kenilworth Road', capacity: 10356 },
    ],
  },

  // ============================================================================
  // SPAIN
  // ============================================================================
  {
    id: 'laliga',
    name: 'La Liga',
    shortName: 'LAL',
    country: 'Spain',
    tier: 1,
    teams: [
      { name: 'Real Madrid', shortCode: 'RMA', stadium: 'Santiago Bernabéu', capacity: 81044 },
      { name: 'Barcelona', shortCode: 'BAR', stadium: 'Spotify Camp Nou', capacity: 99354 },
      { name: 'Atlético Madrid', shortCode: 'ATM', stadium: 'Cívitas Metropolitano', capacity: 70460 },
      { name: 'Athletic Bilbao', shortCode: 'ATH', stadium: 'San Mamés', capacity: 53289 },
      { name: 'Real Sociedad', shortCode: 'RSO', stadium: 'Reale Arena', capacity: 39500 },
      { name: 'Real Betis', shortCode: 'BET', stadium: 'Benito Villamarín', capacity: 60721 },
      { name: 'Villarreal', shortCode: 'VIL', stadium: 'Estadio de la Cerámica', capacity: 23500 },
      { name: 'Sevilla', shortCode: 'SEV', stadium: 'Ramón Sánchez-Pizjuán', capacity: 43883 },
      { name: 'Valencia', shortCode: 'VAL', stadium: 'Mestalla', capacity: 49430 },
      { name: 'Girona', shortCode: 'GIR', stadium: 'Montilivi', capacity: 14286 },
      { name: 'Celta Vigo', shortCode: 'CEL', stadium: 'Balaídos', capacity: 29000 },
      { name: 'Osasuna', shortCode: 'OSA', stadium: 'El Sadar', capacity: 23516 },
      { name: 'Getafe', shortCode: 'GET', stadium: 'Coliseum Alfonso Pérez', capacity: 17393 },
      { name: 'Mallorca', shortCode: 'MLL', stadium: 'Visit Mallorca Estadi', capacity: 23142 },
      { name: 'Las Palmas', shortCode: 'LPA', stadium: 'Gran Canaria', capacity: 32400 },
      { name: 'Rayo Vallecano', shortCode: 'RAY', stadium: 'Vallecas', capacity: 14708 },
      { name: 'Alavés', shortCode: 'ALA', stadium: 'Mendizorroza', capacity: 19840 },
      { name: 'Espanyol', shortCode: 'ESP', stadium: 'RCDE Stadium', capacity: 40000 },
      { name: 'Leganés', shortCode: 'LEG', stadium: 'Butarque', capacity: 12454 },
      { name: 'Valladolid', shortCode: 'VLL', stadium: 'José Zorrilla', capacity: 27846 },
    ],
  },
  {
    id: 'laliga2',
    name: 'La Liga 2',
    shortName: 'LL2',
    country: 'Spain',
    tier: 2,
    teams: [
      { name: 'Racing Santander', shortCode: 'RAC', stadium: 'El Sardinero', capacity: 22222 },
      { name: 'Real Oviedo', shortCode: 'OVI', stadium: 'Carlos Tartiere', capacity: 30500 },
      { name: 'Sporting Gijón', shortCode: 'SGI', stadium: 'El Molinón', capacity: 30000 },
      { name: 'Real Zaragoza', shortCode: 'ZAR', stadium: 'La Romareda', capacity: 34596 },
      { name: 'Levante', shortCode: 'LEV', stadium: 'Ciutat de València', capacity: 26354 },
      { name: 'Eibar', shortCode: 'EIB', stadium: 'Ipurua', capacity: 8164 },
      { name: 'Elche', shortCode: 'ELC', stadium: 'Martínez Valero', capacity: 33732 },
      { name: 'Huesca', shortCode: 'HUE', stadium: 'El Alcoraz', capacity: 9100 },
      { name: 'Tenerife', shortCode: 'TEN', stadium: 'Heliodoro Rodríguez López', capacity: 22824 },
      { name: 'Cádiz', shortCode: 'CAD', stadium: 'Nuevo Mirandilla', capacity: 20724 },
      { name: 'Granada', shortCode: 'GRA', stadium: 'Nuevo Los Cármenes', capacity: 19336 },
      { name: 'Almería', shortCode: 'ALM', stadium: 'Power Horse Stadium', capacity: 17400 },
      { name: 'Deportivo La Coruña', shortCode: 'DEP', stadium: 'Riazor', capacity: 32660 },
      { name: 'Burgos', shortCode: 'BUR', stadium: 'El Plantío', capacity: 12200 },
      { name: 'Mirandés', shortCode: 'MIR', stadium: 'Anduva', capacity: 5762 },
      { name: 'Cartagena', shortCode: 'CTG', stadium: 'Cartagonova', capacity: 15105 },
      { name: 'Racing Ferrol', shortCode: 'FER', stadium: 'A Malata', capacity: 12500 },
      { name: 'Albacete', shortCode: 'ALB', stadium: 'Carlos Belmonte', capacity: 17300 },
      { name: 'Eldense', shortCode: 'ELD', stadium: 'Nuevo Pepico Amat', capacity: 6000 },
      { name: 'Castellón', shortCode: 'CAS', stadium: 'Nou Castalia', capacity: 15500 },
      { name: 'Córdoba', shortCode: 'COR', stadium: 'El Arcángel', capacity: 21822 },
      { name: 'Málaga', shortCode: 'MAL', stadium: 'La Rosaleda', capacity: 30044 },
    ],
  },

  // ============================================================================
  // GERMANY
  // ============================================================================
  {
    id: 'bundesliga',
    name: 'Bundesliga',
    shortName: 'BUN',
    country: 'Germany',
    tier: 1,
    teams: [
      { name: 'Bayern München', shortCode: 'FCB', stadium: 'Allianz Arena', capacity: 75000 },
      { name: 'Borussia Dortmund', shortCode: 'BVB', stadium: 'Signal Iduna Park', capacity: 81365 },
      { name: 'RB Leipzig', shortCode: 'RBL', stadium: 'Red Bull Arena', capacity: 47069 },
      { name: 'Bayer Leverkusen', shortCode: 'B04', stadium: 'BayArena', capacity: 30210 },
      { name: 'Eintracht Frankfurt', shortCode: 'SGE', stadium: 'Deutsche Bank Park', capacity: 58000 },
      { name: 'Wolfsburg', shortCode: 'WOB', stadium: 'Volkswagen Arena', capacity: 30000 },
      { name: 'Freiburg', shortCode: 'SCF', stadium: 'Europa-Park Stadion', capacity: 34700 },
      { name: 'Hoffenheim', shortCode: 'TSG', stadium: 'PreZero Arena', capacity: 30150 },
      { name: 'Mainz 05', shortCode: 'M05', stadium: 'Mewa Arena', capacity: 34000 },
      { name: 'Borussia Mönchengladbach', shortCode: 'BMG', stadium: 'Borussia-Park', capacity: 54057 },
      { name: 'Union Berlin', shortCode: 'FCU', stadium: 'Stadion An der Alten Försterei', capacity: 22012 },
      { name: 'Werder Bremen', shortCode: 'SVW', stadium: 'Weserstadion', capacity: 42100 },
      { name: 'Augsburg', shortCode: 'FCA', stadium: 'WWK Arena', capacity: 30660 },
      { name: 'VfB Stuttgart', shortCode: 'VFB', stadium: 'MHPArena', capacity: 60449 },
      { name: 'Bochum', shortCode: 'BOC', stadium: 'Vonovia Ruhrstadion', capacity: 27599 },
      { name: 'Heidenheim', shortCode: 'HDH', stadium: 'Voith-Arena', capacity: 15000 },
      { name: 'St. Pauli', shortCode: 'STP', stadium: 'Millerntor-Stadion', capacity: 29546 },
      { name: 'Holstein Kiel', shortCode: 'KIE', stadium: 'Holstein-Stadion', capacity: 15034 },
    ],
  },
  {
    id: 'bundesliga2',
    name: '2. Bundesliga',
    shortName: 'BL2',
    country: 'Germany',
    tier: 2,
    teams: [
      { name: 'Hamburger SV', shortCode: 'HSV', stadium: 'Volksparkstadion', capacity: 57000 },
      { name: 'Köln', shortCode: 'KOE', stadium: 'RheinEnergieStadion', capacity: 50000 },
      { name: 'Schalke 04', shortCode: 'S04', stadium: 'Veltins-Arena', capacity: 62271 },
      { name: 'Hertha Berlin', shortCode: 'BSC', stadium: 'Olympiastadion', capacity: 74475 },
      { name: 'Fortuna Düsseldorf', shortCode: 'F95', stadium: 'Merkur Spiel-Arena', capacity: 54600 },
      { name: 'Hannover 96', shortCode: 'H96', stadium: 'Heinz von Heiden Arena', capacity: 49200 },
      { name: 'Nürnberg', shortCode: 'FCN', stadium: 'Max-Morlock-Stadion', capacity: 50000 },
      { name: 'Kaiserslautern', shortCode: 'FCK', stadium: 'Fritz-Walter-Stadion', capacity: 49780 },
      { name: 'Karlsruher SC', shortCode: 'KSC', stadium: 'BBBank Wildpark', capacity: 34302 },
      { name: 'Paderborn', shortCode: 'SCP', stadium: 'Home Deluxe Arena', capacity: 15000 },
      { name: 'Greuther Fürth', shortCode: 'SGF', stadium: 'Sportpark Ronhof', capacity: 16626 },
      { name: 'Darmstadt', shortCode: 'D98', stadium: 'Merck-Stadion am Böllenfalltor', capacity: 17810 },
      { name: 'Magdeburg', shortCode: 'FCM', stadium: 'MDCC-Arena', capacity: 27250 },
      { name: 'Elversberg', shortCode: 'SVE', stadium: 'Ursapharm-Arena', capacity: 8150 },
      { name: 'Braunschweig', shortCode: 'EBS', stadium: 'Eintracht-Stadion', capacity: 23325 },
      { name: 'Preußen Münster', shortCode: 'SCP', stadium: 'Preußenstadion', capacity: 15050 },
      { name: 'Ulm', shortCode: 'SSV', stadium: 'Donaustadion', capacity: 19500 },
      { name: 'Regensburg', shortCode: 'SSV', stadium: 'Jahnstadion', capacity: 15210 },
    ],
  },

  // ============================================================================
  // ITALY
  // ============================================================================
  {
    id: 'seriea',
    name: 'Serie A',
    shortName: 'SEA',
    country: 'Italy',
    tier: 1,
    teams: [
      { name: 'Inter Milan', shortCode: 'INT', stadium: 'San Siro', capacity: 75923 },
      { name: 'AC Milan', shortCode: 'MIL', stadium: 'San Siro', capacity: 75923 },
      { name: 'Juventus', shortCode: 'JUV', stadium: 'Allianz Stadium', capacity: 41507 },
      { name: 'Napoli', shortCode: 'NAP', stadium: 'Diego Armando Maradona', capacity: 54726 },
      { name: 'Roma', shortCode: 'ROM', stadium: 'Stadio Olimpico', capacity: 70634 },
      { name: 'Lazio', shortCode: 'LAZ', stadium: 'Stadio Olimpico', capacity: 70634 },
      { name: 'Atalanta', shortCode: 'ATA', stadium: 'Gewiss Stadium', capacity: 24950 },
      { name: 'Fiorentina', shortCode: 'FIO', stadium: 'Artemio Franchi', capacity: 43147 },
      { name: 'Bologna', shortCode: 'BOL', stadium: "Renato Dall'Ara", capacity: 38279 },
      { name: 'Torino', shortCode: 'TOR', stadium: 'Stadio Olimpico Grande Torino', capacity: 28177 },
      { name: 'Udinese', shortCode: 'UDI', stadium: 'Bluenergy Stadium', capacity: 25144 },
      { name: 'Genoa', shortCode: 'GEN', stadium: 'Luigi Ferraris', capacity: 36536 },
      { name: 'Monza', shortCode: 'MON', stadium: 'U-Power Stadium', capacity: 15039 },
      { name: 'Cagliari', shortCode: 'CAG', stadium: 'Unipol Domus', capacity: 16416 },
      { name: 'Lecce', shortCode: 'LEC', stadium: 'Via del Mare', capacity: 31533 },
      { name: 'Parma', shortCode: 'PAR', stadium: 'Ennio Tardini', capacity: 22352 },
      { name: 'Como', shortCode: 'COM', stadium: 'Stadio Giuseppe Sinigaglia', capacity: 13602 },
      { name: 'Hellas Verona', shortCode: 'VER', stadium: 'Marcantonio Bentegodi', capacity: 39211 },
      { name: 'Empoli', shortCode: 'EMP', stadium: 'Carlo Castellani', capacity: 16284 },
      { name: 'Venezia', shortCode: 'VEN', stadium: 'Pier Luigi Penzo', capacity: 11150 },
    ],
  },
  {
    id: 'serieb',
    name: 'Serie B',
    shortName: 'SEB',
    country: 'Italy',
    tier: 2,
    teams: [
      { name: 'Sassuolo', shortCode: 'SAS', stadium: 'MAPEI Stadium', capacity: 21584 },
      { name: 'Sampdoria', shortCode: 'SAM', stadium: 'Luigi Ferraris', capacity: 36536 },
      { name: 'Cremonese', shortCode: 'CRE', stadium: 'Giovanni Zini', capacity: 20641 },
      { name: 'Palermo', shortCode: 'PAL', stadium: 'Renzo Barbera', capacity: 36349 },
      { name: 'Brescia', shortCode: 'BRE', stadium: 'Mario Rigamonti', capacity: 19797 },
      { name: 'Pisa', shortCode: 'PIS', stadium: 'Arena Garibaldi', capacity: 25000 },
      { name: 'Bari', shortCode: 'BAR', stadium: 'San Nicola', capacity: 58270 },
      { name: 'Spezia', shortCode: 'SPE', stadium: 'Alberto Picco', capacity: 10336 },
      { name: 'Catanzaro', shortCode: 'CTZ', stadium: 'Nicola Ceravolo', capacity: 19547 },
      { name: 'Modena', shortCode: 'MOD', stadium: 'Alberto Braglia', capacity: 21151 },
      { name: 'Reggiana', shortCode: 'REG', stadium: 'Mapei Stadium', capacity: 21584 },
      { name: 'Frosinone', shortCode: 'FRO', stadium: 'Benito Stirpe', capacity: 16227 },
      { name: 'Salernitana', shortCode: 'SAL', stadium: 'Arechi', capacity: 37245 },
      { name: 'Südtirol', shortCode: 'SUD', stadium: 'Druso', capacity: 5000 },
      { name: 'Cittadella', shortCode: 'CIT', stadium: 'Pier Cesare Tombolato', capacity: 7623 },
      { name: 'Mantova', shortCode: 'MAN', stadium: 'Danilo Martelli', capacity: 6500 },
      { name: 'Juve Stabia', shortCode: 'JVS', stadium: 'Romeo Menti', capacity: 12000 },
      { name: 'Carrarese', shortCode: 'CAR', stadium: 'Stadio dei Marmi', capacity: 4000 },
      { name: 'Cesena', shortCode: 'CES', stadium: 'Dino Manuzzi', capacity: 23860 },
      { name: 'Cosenza', shortCode: 'COS', stadium: 'San Vito-Gigi Marulla', capacity: 24528 },
    ],
  },

  // ============================================================================
  // FRANCE
  // ============================================================================
  {
    id: 'ligue1',
    name: 'Ligue 1',
    shortName: 'L1',
    country: 'France',
    tier: 1,
    teams: [
      { name: 'Paris Saint-Germain', shortCode: 'PSG', stadium: 'Parc des Princes', capacity: 47929 },
      { name: 'Monaco', shortCode: 'MON', stadium: 'Stade Louis II', capacity: 18523 },
      { name: 'Marseille', shortCode: 'OM', stadium: 'Stade Vélodrome', capacity: 67394 },
      { name: 'Lyon', shortCode: 'OL', stadium: 'Groupama Stadium', capacity: 59186 },
      { name: 'Lille', shortCode: 'LOSC', stadium: 'Stade Pierre-Mauroy', capacity: 50186 },
      { name: 'Nice', shortCode: 'OGC', stadium: 'Allianz Riviera', capacity: 36178 },
      { name: 'Lens', shortCode: 'RCL', stadium: 'Stade Bollaert-Delelis', capacity: 38223 },
      { name: 'Rennes', shortCode: 'REN', stadium: 'Roazhon Park', capacity: 29778 },
      { name: 'Brest', shortCode: 'SB29', stadium: 'Stade Francis-Le Blé', capacity: 15220 },
      { name: 'Reims', shortCode: 'SDR', stadium: 'Stade Auguste-Delaune', capacity: 21127 },
      { name: 'Strasbourg', shortCode: 'RCSA', stadium: 'Stade de la Meinau', capacity: 29230 },
      { name: 'Nantes', shortCode: 'FCN', stadium: 'Stade de la Beaujoire', capacity: 37473 },
      { name: 'Toulouse', shortCode: 'TFC', stadium: 'Stadium de Toulouse', capacity: 33150 },
      { name: 'Montpellier', shortCode: 'MHSC', stadium: 'Stade de la Mosson', capacity: 32939 },
      { name: 'Saint-Étienne', shortCode: 'ASSE', stadium: 'Stade Geoffroy-Guichard', capacity: 42000 },
      { name: 'Auxerre', shortCode: 'AJA', stadium: "Stade de l'Abbé-Deschamps", capacity: 23467 },
      { name: 'Angers', shortCode: 'SCO', stadium: 'Stade Raymond-Kopa', capacity: 17835 },
      { name: 'Le Havre', shortCode: 'HAC', stadium: 'Stade Océane', capacity: 25178 },
    ],
  },
  {
    id: 'ligue2',
    name: 'Ligue 2',
    shortName: 'L2',
    country: 'France',
    tier: 2,
    teams: [
      { name: 'Lorient', shortCode: 'FCL', stadium: 'Stade du Moustoir', capacity: 18500 },
      { name: 'Metz', shortCode: 'FCM', stadium: 'Stade Saint-Symphorien', capacity: 30000 },
      { name: 'Clermont', shortCode: 'CF63', stadium: 'Stade Gabriel-Montpied', capacity: 11980 },
      { name: 'Paris FC', shortCode: 'PFC', stadium: 'Stade Charléty', capacity: 20000 },
      { name: 'Caen', shortCode: 'SMC', stadium: "Stade Michel d'Ornano", capacity: 21500 },
      { name: 'Bordeaux', shortCode: 'FCGB', stadium: 'Matmut Atlantique', capacity: 42115 },
      { name: 'Guingamp', shortCode: 'EAG', stadium: 'Stade du Roudourou', capacity: 18256 },
      { name: 'Grenoble', shortCode: 'GF38', stadium: 'Stade des Alpes', capacity: 20068 },
      { name: 'Bastia', shortCode: 'SCB', stadium: 'Stade Armand-Cesari', capacity: 16480 },
      { name: 'Laval', shortCode: 'LAV', stadium: 'Stade Francis-Le Basser', capacity: 18603 },
      { name: 'Rodez', shortCode: 'RAF', stadium: 'Stade Paul-Lignon', capacity: 6000 },
      { name: 'Amiens', shortCode: 'ASC', stadium: 'Stade de la Licorne', capacity: 12097 },
      { name: 'Troyes', shortCode: 'ESTAC', stadium: "Stade de l'Aube", capacity: 20400 },
      { name: 'Red Star', shortCode: 'RSF', stadium: 'Stade Bauer', capacity: 10000 },
      { name: 'Dunkerque', shortCode: 'USLD', stadium: 'Stade Marcel-Tribut', capacity: 4500 },
      { name: 'Ajaccio', shortCode: 'ACA', stadium: 'Stade François-Coty', capacity: 10660 },
      { name: 'Martigues', shortCode: 'FCM', stadium: 'Stade Francis-Turcan', capacity: 6500 },
      { name: 'Pau', shortCode: 'PAU', stadium: 'Nouste Camp', capacity: 4950 },
    ],
  },

  // ============================================================================
  // ARGENTINA
  // ============================================================================
  {
    id: 'lpa',
    name: 'Liga Profesional Argentina',
    shortName: 'LPA',
    country: 'Argentina',
    tier: 1,
    teams: [
      { name: 'River Plate', shortCode: 'RIV', stadium: 'Monumental', capacity: 84567 },
      { name: 'Boca Juniors', shortCode: 'BOC', stadium: 'La Bombonera', capacity: 54000 },
      { name: 'Racing Club', shortCode: 'RAC', stadium: 'Cilindro de Avellaneda', capacity: 51389 },
      { name: 'Independiente', shortCode: 'IND', stadium: 'Libertadores de América', capacity: 48069 },
      { name: 'San Lorenzo', shortCode: 'SLO', stadium: 'Nuevo Gasómetro', capacity: 47964 },
      { name: 'Vélez Sarsfield', shortCode: 'VEL', stadium: 'José Amalfitani', capacity: 49540 },
      { name: 'Estudiantes', shortCode: 'EDL', stadium: 'Jorge Luis Hirschi', capacity: 30000 },
      { name: 'Argentinos Juniors', shortCode: 'ARG', stadium: 'Diego Armando Maradona', capacity: 26000 },
      { name: 'Lanús', shortCode: 'LAN', stadium: 'La Fortaleza', capacity: 47027 },
      { name: 'Defensa y Justicia', shortCode: 'DYJ', stadium: 'Norberto Tomaghello', capacity: 15000 },
      { name: 'Talleres', shortCode: 'TAL', stadium: 'Mario Alberto Kempes', capacity: 57000 },
      { name: 'Godoy Cruz', shortCode: 'GOD', stadium: 'Malvinas Argentinas', capacity: 42500 },
      { name: 'Huracán', shortCode: 'HUR', stadium: 'Tomás Adolfo Ducó', capacity: 48314 },
      { name: 'Rosario Central', shortCode: 'ROC', stadium: 'Gigante de Arroyito', capacity: 41654 },
      { name: "Newell's Old Boys", shortCode: 'NOB', stadium: 'Marcelo Bielsa', capacity: 42000 },
      { name: 'Unión Santa Fe', shortCode: 'USF', stadium: '15 de Abril', capacity: 27000 },
      { name: 'Colón', shortCode: 'COL', stadium: 'Brigadier López', capacity: 40000 },
      { name: 'Belgrano', shortCode: 'BEL', stadium: 'Mario Alberto Kempes', capacity: 57000 },
      { name: 'Tigre', shortCode: 'TIG', stadium: 'José Dellagiovanna', capacity: 26282 },
      { name: 'Banfield', shortCode: 'BAN', stadium: 'Florencio Sola', capacity: 34901 },
      { name: 'Gimnasia La Plata', shortCode: 'GLP', stadium: 'Juan Carmelo Zerillo', capacity: 33000 },
      { name: 'Platense', shortCode: 'PLA', stadium: 'Ciudad de Vicente López', capacity: 28000 },
      { name: 'Central Córdoba', shortCode: 'CCA', stadium: 'Alfredo Terrera', capacity: 28000 },
      { name: 'Atlético Tucumán', shortCode: 'ATU', stadium: 'Monumental José Fierro', capacity: 35200 },
      { name: 'Instituto', shortCode: 'INS', stadium: 'Juan Domingo Perón', capacity: 28000 },
      { name: 'Sarmiento', shortCode: 'SAR', stadium: 'Eva Perón', capacity: 18000 },
      { name: 'Barracas Central', shortCode: 'BAR', stadium: 'Claudio Chiqui Tapia', capacity: 10000 },
      { name: 'Riestra', shortCode: 'RIE', stadium: 'Guillermo Laza', capacity: 8000 },
    ],
  },
  {
    id: 'pnacional',
    name: 'Primera Nacional',
    shortName: 'PN',
    country: 'Argentina',
    tier: 2,
    teams: [
      { name: 'San Martín San Juan', shortCode: 'SMSJ', stadium: 'Ingeniero Hilario Sánchez', capacity: 25286 },
      { name: 'Aldosivi', shortCode: 'ALD', stadium: 'José María Minella', capacity: 35160 },
      { name: 'All Boys', shortCode: 'ALB', stadium: 'Islas Malvinas', capacity: 20000 },
      { name: 'Almagro', shortCode: 'ALM', stadium: 'José Dellagiovanna', capacity: 18000 },
      { name: 'Almirante Brown', shortCode: 'ABR', stadium: 'Fragata Sarmiento', capacity: 15000 },
      { name: 'Atlanta', shortCode: 'ATL', stadium: 'Don León Kolbowski', capacity: 14000 },
      { name: 'Brown de Adrogué', shortCode: 'BDA', stadium: 'Lorenzo Arandilla', capacity: 12000 },
      { name: 'Chacarita Juniors', shortCode: 'CHA', stadium: 'Chacarita', capacity: 25500 },
      { name: 'Chaco For Ever', shortCode: 'CFE', stadium: 'Juan Alberto García', capacity: 18000 },
      { name: 'Deportivo Madryn', shortCode: 'DMA', stadium: 'Abel Sastre', capacity: 15000 },
      { name: 'Deportivo Maipú', shortCode: 'DMP', stadium: 'Estadio Olímpico', capacity: 8000 },
      { name: 'Deportivo Morón', shortCode: 'DMO', stadium: 'Nuevo Francisco Urbano', capacity: 12000 },
      { name: 'Estudiantes BA', shortCode: 'EBA', stadium: 'Ciudad de Caseros', capacity: 10000 },
      { name: 'Estudiantes Río Cuarto', shortCode: 'ERC', stadium: 'Carlos Tamagno', capacity: 8000 },
      { name: 'Ferro Carril Oeste', shortCode: 'FER', stadium: 'Ricardo Etcheverri', capacity: 24442 },
      { name: 'Gimnasia Jujuy', shortCode: 'GYM', stadium: '23 de Agosto', capacity: 30000 },
      { name: 'Gimnasia Mendoza', shortCode: 'GYM', stadium: 'Víctor Legrotaglie', capacity: 11000 },
      { name: 'Güemes', shortCode: 'GUE', stadium: 'Padre Martearena', capacity: 18000 },
      { name: 'Ind. Rivadavia', shortCode: 'IRM', stadium: 'Bautista Gargantini', capacity: 34000 },
      { name: 'Mitre Santiago', shortCode: 'MIT', stadium: 'Estadio Único Madre de Ciudades', capacity: 30000 },
      { name: 'Nueva Chicago', shortCode: 'NCH', stadium: 'República de Mataderos', capacity: 22500 },
      { name: 'Quilmes', shortCode: 'QUI', stadium: 'Centenario', capacity: 35000 },
      { name: 'Racing Córdoba', shortCode: 'RCC', stadium: 'Miguel Sancho', capacity: 15000 },
      { name: 'San Martín Tucumán', shortCode: 'SMT', stadium: 'La Ciudadela', capacity: 28000 },
      { name: 'San Telmo', shortCode: 'STE', stadium: 'Estadio San Telmo', capacity: 8000 },
      { name: 'Temperley', shortCode: 'TEM', stadium: 'Alfredo Beranger', capacity: 15000 },
      { name: 'Tristán Suárez', shortCode: 'TRS', stadium: 'Ciudad de Tristán Suárez', capacity: 5000 },
      { name: 'Agropecuario', shortCode: 'AGR', stadium: 'Ofelia Rosenzuaig', capacity: 10000 },
      { name: 'Defensores de Belgrano', shortCode: 'DDB', stadium: 'Juan Pasquale', capacity: 8000 },
      { name: 'Los Andes', shortCode: 'LAN', stadium: 'Eduardo Gallardón', capacity: 18000 },
    ],
  },

  // ============================================================================
  // BRAZIL
  // ============================================================================
  {
    id: 'brasileirao',
    name: 'Brasileirão Série A',
    shortName: 'BRA',
    country: 'Brazil',
    tier: 1,
    teams: [
      { name: 'Flamengo', shortCode: 'FLA', stadium: 'Maracanã', capacity: 78838 },
      { name: 'Palmeiras', shortCode: 'PAL', stadium: 'Allianz Parque', capacity: 43713 },
      { name: 'São Paulo', shortCode: 'SAO', stadium: 'MorumBIS', capacity: 66795 },
      { name: 'Corinthians', shortCode: 'COR', stadium: 'Neo Química Arena', capacity: 49205 },
      { name: 'Fluminense', shortCode: 'FLU', stadium: 'Maracanã', capacity: 78838 },
      { name: 'Atlético Mineiro', shortCode: 'CAM', stadium: 'Arena MRV', capacity: 46000 },
      { name: 'Botafogo', shortCode: 'BOT', stadium: 'Nilton Santos', capacity: 46831 },
      { name: 'Internacional', shortCode: 'INT', stadium: 'Beira-Rio', capacity: 50842 },
      { name: 'Grêmio', shortCode: 'GRE', stadium: 'Arena do Grêmio', capacity: 55662 },
      { name: 'Santos', shortCode: 'SAN', stadium: 'Vila Belmiro', capacity: 16798 },
      { name: 'Cruzeiro', shortCode: 'CRU', stadium: 'Mineirão', capacity: 61846 },
      { name: 'Bahia', shortCode: 'BAH', stadium: 'Arena Fonte Nova', capacity: 47907 },
      { name: 'Fortaleza', shortCode: 'FOR', stadium: 'Arena Castelão', capacity: 63903 },
      { name: 'Athletico Paranaense', shortCode: 'CAP', stadium: 'Arena da Baixada', capacity: 42372 },
      { name: 'Vasco da Gama', shortCode: 'VAS', stadium: 'São Januário', capacity: 21880 },
      { name: 'Red Bull Bragantino', shortCode: 'RBB', stadium: 'Nabi Abi Chedid', capacity: 17728 },
      { name: 'Cuiabá', shortCode: 'CUI', stadium: 'Arena Pantanal', capacity: 44097 },
      { name: 'Vitória', shortCode: 'VIT', stadium: 'Barradão', capacity: 35632 },
      { name: 'Juventude', shortCode: 'JUV', stadium: 'Alfredo Jaconi', capacity: 22669 },
      { name: 'Criciúma', shortCode: 'CRI', stadium: 'Heriberto Hülse', capacity: 19300 },
    ],
  },
  {
    id: 'serieb',
    name: 'Brasileirão Série B',
    shortName: 'BRB',
    country: 'Brazil',
    tier: 2,
    teams: [
      { name: 'Sport Recife', shortCode: 'SPO', stadium: 'Ilha do Retiro', capacity: 35000 },
      { name: 'Ceará', shortCode: 'CEA', stadium: 'Castelão', capacity: 63903 },
      { name: 'Goiás', shortCode: 'GOI', stadium: 'Serrinha', capacity: 15000 },
      { name: 'América Mineiro', shortCode: 'AME', stadium: 'Independência', capacity: 23018 },
      { name: 'Coritiba', shortCode: 'CFC', stadium: 'Couto Pereira', capacity: 40502 },
      { name: 'Ponte Preta', shortCode: 'PON', stadium: 'Moisés Lucarelli', capacity: 19728 },
      { name: 'Guarani', shortCode: 'GUA', stadium: 'Brinco de Ouro', capacity: 29130 },
      { name: 'Avaí', shortCode: 'AVA', stadium: 'Ressacada', capacity: 17800 },
      { name: 'Chapecoense', shortCode: 'CHA', stadium: 'Arena Condá', capacity: 22600 },
      { name: 'CRB', shortCode: 'CRB', stadium: 'Rei Pelé', capacity: 20000 },
      { name: 'Novorizontino', shortCode: 'NOV', stadium: 'Jorge Ismael de Biasi', capacity: 15000 },
      { name: 'Mirassol', shortCode: 'MIR', stadium: 'José Maria de Campos Maia', capacity: 15000 },
      { name: 'Vila Nova', shortCode: 'VIL', stadium: 'Onésio Brasileiro Alvarenga', capacity: 30000 },
      { name: 'Operário PR', shortCode: 'OPE', stadium: 'Germano Krüger', capacity: 10000 },
      { name: 'Brusque', shortCode: 'BRU', stadium: 'Augusto Bauer', capacity: 10000 },
      { name: 'Ituano', shortCode: 'ITU', stadium: 'Novelli Júnior', capacity: 12500 },
      { name: 'Paysandu', shortCode: 'PAY', stadium: 'Curuzu', capacity: 17000 },
      { name: 'Amazonas', shortCode: 'AMA', stadium: 'Carlos Zamith', capacity: 12000 },
      { name: 'Botafogo SP', shortCode: 'BSP', stadium: 'Santa Cruz', capacity: 32076 },
      { name: 'ABC', shortCode: 'ABC', stadium: 'Frasqueirão', capacity: 20000 },
    ],
  },
];

// ============================================================================
// NAME GENERATORS
// ============================================================================

// First names by nationality
const FIRST_NAMES: Record<string, string[]> = {
  'England': ['Harry', 'Jack', 'Oliver', 'George', 'James', 'William', 'Charlie', 'Thomas', 'Oscar', 'Mason', 'Ethan', 'Noah', 'Jacob', 'Lucas', 'Henry', 'Alexander', 'Daniel', 'Matthew', 'Samuel', 'Joseph'],
  'Spain': ['Alejandro', 'Pablo', 'Daniel', 'Adrián', 'Álvaro', 'David', 'Diego', 'Hugo', 'Sergio', 'Carlos', 'Marcos', 'Javier', 'Jorge', 'Mario', 'Miguel', 'Antonio', 'Fernando', 'Raúl', 'Iker', 'Óscar'],
  'Germany': ['Lukas', 'Leon', 'Finn', 'Jonas', 'Felix', 'Noah', 'Elias', 'Paul', 'Max', 'Ben', 'Luca', 'Julian', 'Tim', 'Niklas', 'Moritz', 'Florian', 'Jan', 'Kai', 'Timo', 'Marco'],
  'Italy': ['Francesco', 'Alessandro', 'Andrea', 'Lorenzo', 'Matteo', 'Luca', 'Marco', 'Davide', 'Stefano', 'Federico', 'Simone', 'Riccardo', 'Michele', 'Giacomo', 'Nicola', 'Filippo', 'Paolo', 'Daniele', 'Giovanni', 'Roberto'],
  'France': ['Lucas', 'Hugo', 'Nathan', 'Louis', 'Enzo', 'Gabriel', 'Adam', 'Raphaël', 'Arthur', 'Paul', 'Léo', 'Jules', 'Mathis', 'Thomas', 'Antoine', 'Baptiste', 'Clément', 'Théo', 'Maxime', 'Alexandre'],
  'Argentina': ['Lionel', 'Ángel', 'Paulo', 'Nicolás', 'Leandro', 'Emiliano', 'Julián', 'Rodrigo', 'Alexis', 'Gonzalo', 'Mauro', 'Sergio', 'Exequiel', 'Cristian', 'Nahuel', 'Lautaro', 'Lisandro', 'Gerónimo', 'Thiago', 'Matías'],
  'Brazil': ['Neymar', 'Gabriel', 'Vinícius', 'Richarlison', 'Lucas', 'Raphinha', 'Rodrygo', 'Bruno', 'Casemiro', 'Marquinhos', 'Alisson', 'Thiago', 'Roberto', 'Arthur', 'Fabinho', 'Danilo', 'Alex', 'Felipe', 'Wendell', 'Guilherme'],
};

const LAST_NAMES: Record<string, string[]> = {
  'England': ['Smith', 'Jones', 'Williams', 'Brown', 'Taylor', 'Davies', 'Wilson', 'Evans', 'Johnson', 'Roberts', 'Walker', 'Wright', 'Thompson', 'White', 'Hughes', 'Green', 'Hall', 'Wood', 'Jackson', 'Clarke'],
  'Spain': ['García', 'Martínez', 'López', 'Sánchez', 'González', 'Rodríguez', 'Fernández', 'Pérez', 'Gómez', 'Martín', 'Jiménez', 'Ruiz', 'Hernández', 'Díaz', 'Moreno', 'Álvarez', 'Muñoz', 'Romero', 'Alonso', 'Gutiérrez'],
  'Germany': ['Müller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Meyer', 'Wagner', 'Becker', 'Schulz', 'Hoffmann', 'Koch', 'Bauer', 'Richter', 'Klein', 'Wolf', 'Neumann', 'Schwarz', 'Zimmermann', 'Braun', 'Krüger'],
  'Italy': ['Rossi', 'Russo', 'Ferrari', 'Esposito', 'Bianchi', 'Romano', 'Colombo', 'Ricci', 'Marino', 'Greco', 'Bruno', 'Gallo', 'Conti', 'De Luca', 'Costa', 'Giordano', 'Mancini', 'Rizzo', 'Lombardi', 'Moretti'],
  'France': ['Martin', 'Bernard', 'Thomas', 'Petit', 'Robert', 'Richard', 'Durand', 'Dubois', 'Moreau', 'Laurent', 'Simon', 'Michel', 'Lefèvre', 'Leroy', 'Roux', 'David', 'Bertrand', 'Morel', 'Fournier', 'Girard'],
  'Argentina': ['González', 'Rodríguez', 'Gómez', 'Fernández', 'López', 'Martínez', 'Díaz', 'Pérez', 'Sánchez', 'Romero', 'García', 'Álvarez', 'Torres', 'Ruiz', 'Gutiérrez', 'Flores', 'Acosta', 'Medina', 'Herrera', 'Aguirre'],
  'Brazil': ['Silva', 'Santos', 'Oliveira', 'Souza', 'Lima', 'Pereira', 'Ferreira', 'Costa', 'Rodrigues', 'Almeida', 'Nascimento', 'Araújo', 'Carvalho', 'Gomes', 'Martins', 'Ribeiro', 'Vieira', 'Barbosa', 'Rocha', 'Correia'],
};

function generatePlayerName(country: string): string {
  const firstNames = FIRST_NAMES[country] || FIRST_NAMES['England'];
  const lastNames = LAST_NAMES[country] || LAST_NAMES['England'];

  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];

  return `${firstName} ${lastName}`;
}

// ============================================================================
// PLAYER GENERATION
// ============================================================================

/**
 * Club reputation tiers determine skill ranges.
 * This creates realistic gaps between elite clubs and smaller teams.
 *
 * Elite (90-100 rep):     78-94 skill (Real Madrid, Man City, Bayern)
 * Top (80-89 rep):        72-88 skill (Atletico, Dortmund, Roma)
 * Upper Mid (70-79 rep):  66-82 skill (Sevilla, West Ham, Fiorentina)
 * Mid (60-69 rep):        60-76 skill (Getafe, Bochum, River, Boca)
 * Lower Mid (50-59 rep):  54-70 skill (Promotion teams, small clubs)
 * Low (<50 rep):          48-64 skill (Lower division)
 */
function estimateSkill(clubReputation: number, age: number): number {
  // Calculate skill range based on club reputation
  // Higher reputation = higher skill floor AND ceiling
  const baseMin = Math.floor(40 + (clubReputation * 0.38)); // 40-78 range
  const baseMax = Math.floor(56 + (clubReputation * 0.38)); // 56-94 range

  let skill = baseMin + Math.floor(Math.random() * (baseMax - baseMin));

  // Age adjustments
  if (age < 22) skill = Math.max(baseMin - 8, skill - Math.floor((22 - age) * 2));
  else if (age > 32) skill = Math.max(baseMin - 5, skill - Math.floor((age - 32) * 2.5));

  return Math.min(99, Math.max(45, skill));
}

function estimatePotential(skill: number, age: number): number {
  if (age <= 20) return Math.min(99, skill + 8 + Math.floor(Math.random() * 15));
  if (age <= 23) return Math.min(99, skill + 5 + Math.floor(Math.random() * 10));
  if (age <= 26) return Math.min(99, skill + Math.floor(Math.random() * 5));
  return skill;
}

function calculateMarketValue(skill: number, potential: number, age: number): number {
  const baseValue = Math.pow(skill, 2.8) * 50;
  let mult = 1;
  if (age <= 22 && potential >= 88) mult = 3;
  else if (age <= 24 && potential >= 85) mult = 2.2;
  else if (age <= 26 && potential >= 82) mult = 1.6;
  else if (age >= 33) mult = 0.4;
  else if (age >= 31) mult = 0.6;
  return Math.round(baseValue * mult);
}

function generatePlayer(teamId: string, country: string, clubReputation: number, position: 'GK' | 'DEF' | 'MID' | 'FWD', index: number): any {
  const age = position === 'GK'
    ? 22 + Math.floor(Math.random() * 14) // GKs: 22-35
    : 18 + Math.floor(Math.random() * 17); // Others: 18-34

  const skill = estimateSkill(clubReputation, age);
  const potential = estimatePotential(skill, age);
  const marketValue = calculateMarketValue(skill, potential, age);

  const formOptions = ['UP', 'SLIGHT_UP', 'STABLE', 'STABLE', 'STABLE', 'SLIGHT_DOWN', 'DOWN'];

  return {
    id: `p_${teamId}_${index}`,
    name: generatePlayerName(country),
    nationality: country,
    age,
    positionMain: position,
    positionAlt: null,
    skillBase: skill,
    potential,
    form: 60 + Math.floor(Math.random() * 25),
    conditionArrow: formOptions[Math.floor(Math.random() * formOptions.length)],
    clubId: teamId,
    wage: Math.round(skill * skill * 25 + Math.random() * 20000),
    contractEnd: `202${6 + Math.floor(Math.random() * 3)}-06-30`,
    marketValue,
    transferStatus: Math.random() < 0.08 ? 'LISTED' : 'UNAVAILABLE',
    isIdol: Math.random() < 0.03,
    currentSeasonStats: { appearances: 0, goals: 0, assists: 0, cleanSheets: 0, yellowCards: 0, redCards: 0, avgRating: 6.5 },
    careerStats: {
      appearances: Math.floor(Math.random() * 250),
      goals: position === 'FWD' ? Math.floor(Math.random() * 100) : position === 'MID' ? Math.floor(Math.random() * 50) : Math.floor(Math.random() * 15),
      assists: Math.floor(Math.random() * 60),
      trophies: Math.floor(Math.random() * 6),
    },
  };
}

function generateSquad(teamId: string, country: string, clubReputation: number): any[] {
  const squad: any[] = [];

  // Formation: 3 GK, 8 DEF, 8 MID, 6 FWD = 25 players
  const positions: Array<{ pos: 'GK' | 'DEF' | 'MID' | 'FWD'; count: number }> = [
    { pos: 'GK', count: 3 },
    { pos: 'DEF', count: 8 },
    { pos: 'MID', count: 8 },
    { pos: 'FWD', count: 6 },
  ];

  let playerIndex = 0;
  for (const { pos, count } of positions) {
    for (let i = 0; i < count; i++) {
      squad.push(generatePlayer(teamId, country, clubReputation, pos, playerIndex++));
    }
  }

  return squad;
}

// ============================================================================
// CLUB REPUTATION DATA
// Based on real-world status, history, and current squad quality
// ============================================================================

const CLUB_REPUTATIONS: Record<string, number> = {
  // ELITE TIER (92-99) - Champions League winners, world's biggest clubs
  'Real Madrid': 99,
  'Manchester City': 97,
  'Bayern München': 96,
  'Barcelona': 95,
  'Liverpool': 94,
  'Paris Saint-Germain': 93,
  'Arsenal': 92,
  'Inter Milan': 92,

  // TOP TIER (85-91) - Regular UCL contenders
  'Chelsea': 90,
  'Manchester United': 89,
  'Juventus': 89,
  'AC Milan': 88,
  'Borussia Dortmund': 88,
  'Atlético Madrid': 88,
  'Napoli': 87,
  'Tottenham Hotspur': 86,
  'RB Leipzig': 85,
  'Bayer Leverkusen': 85,

  // UPPER MID (78-84) - Strong domestic teams, Europa League level
  'Newcastle United': 83,
  'Aston Villa': 82,
  'Roma': 82,
  'Lazio': 81,
  'Atalanta': 81,
  'Sevilla': 80,
  'Real Sociedad': 80,
  'Athletic Bilbao': 79,
  'Villarreal': 79,
  'Monaco': 79,
  'Marseille': 79,
  'Lyon': 78,
  'West Ham United': 78,
  'Eintracht Frankfurt': 78,
  'Fiorentina': 78,

  // MID TIER (70-77) - Solid first division clubs
  'Brighton': 76,
  'Real Betis': 76,
  'Freiburg': 75,
  'Wolfsburg': 75,
  'Bologna': 75,
  'Lille': 75,
  'Lens': 75,
  'Crystal Palace': 74,
  'Fulham': 74,
  'Wolverhampton': 74,
  'Brentford': 73,
  'Valencia': 73,
  'Torino': 73,
  'Nice': 73,
  'Rennes': 73,
  'Hoffenheim': 72,
  'Mainz 05': 72,
  'Borussia Mönchengladbach': 72,
  'Union Berlin': 72,
  'Werder Bremen': 72,
  'Udinese': 72,
  'Genoa': 71,
  'Nottingham Forest': 71,
  'Bournemouth': 70,
  'Everton': 70,

  // LOWER MID (62-69) - Smaller first division / top second division
  'VfB Stuttgart': 69,
  'Girona': 69,
  'Celta Vigo': 68,
  'Osasuna': 68,
  'Getafe': 67,
  'Mallorca': 67,
  'Augsburg': 66,
  'Bochum': 65,
  'Leicester City': 65,
  'Southampton': 64,
  'Ipswich Town': 63,
  'Cagliari': 63,
  'Lecce': 62,
  'Empoli': 62,
  'Monza': 62,
  'Como': 62,
  'Parma': 62,
  'Venezia': 61,
  'Hellas Verona': 61,
  'Las Palmas': 61,
  'Rayo Vallecano': 61,
  'Alavés': 60,
  'Espanyol': 60,
  'Leganés': 59,
  'Valladolid': 59,
  'Heidenheim': 58,
  'St. Pauli': 58,
  'Holstein Kiel': 55,
  'Toulouse': 64,
  'Montpellier': 63,
  'Strasbourg': 62,
  'Nantes': 62,
  'Reims': 61,
  'Brest': 61,
  'Saint-Étienne': 60,
  'Auxerre': 58,
  'Angers': 57,
  'Le Havre': 56,

  // SOUTH AMERICA - TOP (72-82) - Continental giants
  'Flamengo': 82,
  'Palmeiras': 81,
  'River Plate': 80,
  'Boca Juniors': 79,
  'São Paulo': 77,
  'Atlético Mineiro': 76,
  'Fluminense': 75,
  'Corinthians': 75,
  'Internacional': 74,
  'Grêmio': 74,
  'Racing Club': 73,
  'Botafogo': 73,
  'Independiente': 72,
  'Santos': 72,
  'Cruzeiro': 72,

  // SOUTH AMERICA - MID (62-71)
  'San Lorenzo': 70,
  'Estudiantes': 70,
  'Vélez Sarsfield': 69,
  'Fortaleza': 69,
  'Bahia': 68,
  'Athletico Paranaense': 68,
  'Red Bull Bragantino': 67,
  'Talleres': 67,
  'Argentinos Juniors': 66,
  'Lanús': 66,
  'Defensa y Justicia': 65,
  'Vasco da Gama': 65,
  'Godoy Cruz': 64,
  'Huracán': 64,
  'Rosario Central': 64,
  "Newell's Old Boys": 64,
  'Cuiabá': 63,
  'Vitória': 62,
  'Juventude': 61,
  'Criciúma': 60,

  // SOUTH AMERICA - LOWER (52-61)
  'Unión Santa Fe': 60,
  'Colón': 60,
  'Belgrano': 59,
  'Tigre': 58,
  'Banfield': 58,
  'Gimnasia La Plata': 57,
  'Platense': 56,
  'Central Córdoba': 55,
  'Atlético Tucumán': 55,
  'Instituto': 54,
  'Sarmiento': 53,
  'Barracas Central': 52,
  'Riestra': 50,

  // ============================================================================
  // SECOND DIVISION CLUBS
  // ============================================================================

  // ENGLAND - Championship (52-68)
  'Leeds United': 68,
  'Burnley': 66,
  'Sheffield United': 65,
  'Norwich City': 62,
  'West Brom': 62,
  'Middlesbrough': 60,
  'Sunderland': 60,
  'Watford': 59,
  'Coventry City': 58,
  'Stoke City': 58,
  'Blackburn Rovers': 57,
  'Bristol City': 56,
  'Millwall': 55,
  'Swansea City': 55,
  'Preston North End': 54,
  'Queens Park Rangers': 54,
  'Hull City': 54,
  'Cardiff City': 54,
  'Sheffield Wednesday': 56,
  'Derby County': 55,
  'Plymouth Argyle': 52,
  'Oxford United': 50,
  'Portsmouth': 54,
  'Luton Town': 55,

  // SPAIN - La Liga 2 (48-62)
  'Racing Santander': 55,
  'Real Oviedo': 54,
  'Sporting Gijón': 55,
  'Real Zaragoza': 56,
  'Levante': 60,
  'Eibar': 56,
  'Elche': 55,
  'Huesca': 52,
  'Tenerife': 53,
  'Cádiz': 58,
  'Granada': 60,
  'Almería': 58,
  'Deportivo La Coruña': 58,
  'Burgos': 50,
  'Mirandés': 48,
  'Cartagena': 50,
  'Racing Ferrol': 48,
  'Albacete': 50,
  'Eldense': 46,
  'Castellón': 50,
  'Córdoba': 52,
  'Málaga': 56,

  // GERMANY - 2. Bundesliga (52-68)
  'Hamburger SV': 68,
  'Köln': 67,
  'Schalke 04': 66,
  'Hertha Berlin': 64,
  'Fortuna Düsseldorf': 60,
  'Hannover 96': 58,
  'Nürnberg': 58,
  'Kaiserslautern': 56,
  'Karlsruher SC': 54,
  'Paderborn': 52,
  'Greuther Fürth': 52,
  'Darmstadt': 54,
  'Magdeburg': 52,
  'Elversberg': 48,
  'Braunschweig': 52,
  'Preußen Münster': 48,
  'Ulm': 46,
  'Regensburg': 50,

  // ITALY - Serie B (50-64)
  'Sassuolo': 64,
  'Sampdoria': 62,
  'Cremonese': 56,
  'Palermo': 58,
  'Brescia': 54,
  'Pisa': 54,
  'Bari': 55,
  'Spezia': 55,
  'Catanzaro': 52,
  'Modena': 52,
  'Reggiana': 52,
  'Frosinone': 54,
  'Salernitana': 56,
  'Südtirol': 48,
  'Cittadella': 50,
  'Mantova': 48,
  'Juve Stabia': 50,
  'Carrarese': 46,
  'Cesena': 52,
  'Cosenza': 50,

  // FRANCE - Ligue 2 (48-62)
  'Lorient': 58,
  'Metz': 56,
  'Clermont': 54,
  'Paris FC': 52,
  'Caen': 54,
  'Bordeaux': 62,
  'Guingamp': 52,
  'Grenoble': 50,
  'Bastia': 52,
  'Laval': 50,
  'Rodez': 48,
  'Amiens': 52,
  'Troyes': 54,
  'Red Star': 48,
  'Dunkerque': 46,
  'Ajaccio': 50,
  'Martigues': 46,
  'Pau': 48,

  // ARGENTINA - Primera Nacional (42-55)
  'San Martín San Juan': 52,
  'Aldosivi': 54,
  'All Boys': 48,
  'Almagro': 48,
  'Almirante Brown': 46,
  'Atlanta': 48,
  'Brown de Adrogué': 44,
  'Chacarita Juniors': 52,
  'Chaco For Ever': 46,
  'Deportivo Madryn': 44,
  'Deportivo Maipú': 44,
  'Deportivo Morón': 46,
  'Estudiantes BA': 46,
  'Estudiantes Río Cuarto': 44,
  'Ferro Carril Oeste': 52,
  'Gimnasia Jujuy': 48,
  'Gimnasia Mendoza': 46,
  'Güemes': 44,
  'Ind. Rivadavia': 50,
  'Mitre Santiago': 44,
  'Nueva Chicago': 50,
  'Quilmes': 52,
  'Racing Córdoba': 44,
  'San Martín Tucumán': 50,
  'San Telmo': 42,
  'Temperley': 48,
  'Tristán Suárez': 42,
  'Agropecuario': 44,
  'Defensores de Belgrano': 46,
  'Los Andes': 48,

  // BRAZIL - Série B (50-62)
  'Sport Recife': 60,
  'Ceará': 58,
  'Goiás': 58,
  'América Mineiro': 56,
  'Coritiba': 58,
  'Ponte Preta': 54,
  'Guarani': 54,
  'Avaí': 52,
  'Chapecoense': 52,
  'CRB': 50,
  'Novorizontino': 50,
  'Mirassol': 50,
  'Vila Nova': 52,
  'Operário PR': 48,
  'Brusque': 46,
  'Ituano': 48,
  'Paysandu': 52,
  'Amazonas': 46,
  'Botafogo SP': 50,
  'ABC': 50,
};

function getClubReputation(clubName: string, leagueTier: number): number {
  // Return predefined reputation if exists
  if (CLUB_REPUTATIONS[clubName]) {
    return CLUB_REPUTATIONS[clubName];
  }

  // Default reputation based on league tier with some randomness
  const defaults: Record<number, [number, number]> = {
    1: [65, 80],  // Top 5 leagues default
    2: [55, 70],  // South America default
    3: [45, 60],  // Lower leagues
  };
  const [min, max] = defaults[leagueTier] || [50, 65];
  return min + Math.floor(Math.random() * (max - min));
}

// ============================================================================
// MAIN GENERATION
// ============================================================================

async function main() {
  console.log('═'.repeat(60));
  console.log('  Real Teams Database Generator');
  console.log('═'.repeat(60));
  console.log(`\n  Generating ${LEAGUES.length} leagues with real team data...\n`);

  const database = {
    meta: {
      version: '3.0.0',
      lastUpdated: new Date().toISOString(),
      season: '2024-2025',
      source: 'Real teams with generated players',
    },
    players: [] as any[],
    clubs: [] as any[],
    managers: [] as any[],
    competitions: [] as any[],
    nationalities: [] as string[],
  };

  let totalTeams = 0;
  let totalPlayers = 0;

  for (const league of LEAGUES) {
    console.log(`\n🏆 ${league.name} (${league.country})`);

    const teamIds: string[] = [];

    for (const teamData of league.teams) {
      const teamId = `t_${league.id}_${teamData.shortCode.toLowerCase()}`;
      teamIds.push(teamId);

      // Get club reputation (predefined or calculated)
      const reputation = getClubReputation(teamData.name, league.tier);

      // Budget scales with reputation
      const baseBudget = Math.pow(reputation, 2.5) * 1000;
      const budget = baseBudget * (0.8 + Math.random() * 0.4); // ±20% variance

      database.clubs.push({
        id: teamId,
        name: teamData.name,
        shortCode: teamData.shortCode,
        country: league.country,
        tier: league.tier,
        reputation,
        budget: Math.round(budget),
        wageBudget: Math.round(budget * 0.015),
        stadium: teamData.stadium,
        stadiumCapacity: teamData.capacity,
        rivalClubIds: [],
        leagueId: `l_${league.id}`,
        isNationalTeam: false,
      });

      // Generate squad using club reputation
      const squad = generateSquad(teamId, league.country, reputation);
      database.players.push(...squad);

      // Calculate avg skill for logging
      const avgSkill = Math.round(squad.reduce((sum, p) => sum + p.skillBase, 0) / squad.length);
      console.log(`  ✓ ${teamData.name}: ${squad.length} players (rep: ${reputation}, avg skill: ${avgSkill})`);
      totalTeams++;
      totalPlayers += squad.length;
    }

    // Create competition
    database.competitions.push({
      id: `l_${league.id}`,
      name: league.name,
      shortName: league.shortName,
      country: league.country,
      type: 'LEAGUE',
      tier: league.tier,
      teamIds,
      standings: teamIds.map(clubId => ({
        clubId,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        points: 0,
        form: [],
      })),
    });
  }

  // Collect nationalities
  const nationalities = new Set(database.players.map(p => p.nationality));
  database.nationalities = Array.from(nationalities);

  // Save to file
  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(database, null, 2));

  console.log('\n' + '═'.repeat(60));
  console.log('  DATABASE GENERATED!');
  console.log('═'.repeat(60));
  console.log(`  📊 Teams: ${totalTeams}`);
  console.log(`  👤 Players: ${totalPlayers}`);
  console.log(`  🏆 Competitions: ${database.competitions.length}`);
  console.log(`  📁 Saved to: ${OUTPUT_FILE}`);
  console.log('═'.repeat(60));
}

main().catch(console.error);
