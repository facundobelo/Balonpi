/**
 * Club Colors Database
 * Real colors for major clubs across different leagues
 */

import type { ClubColors } from '../types';

// Default colors for clubs without specific colors
const DEFAULT_COLORS: ClubColors = {
  primary: '#4B5563',  // Gray
  secondary: '#9CA3AF',
  text: '#FFFFFF',
};

// Club colors indexed by club ID or short code
const CLUB_COLORS: Record<string, ClubColors> = {
  // ==========================================================================
  // ARGENTINA - PRIMERA DIVISIÓN
  // ==========================================================================

  // Boca Juniors
  't_arg_boc': { primary: '#003DA5', secondary: '#FFD200', text: '#FFFFFF' },
  'BOC': { primary: '#003DA5', secondary: '#FFD200', text: '#FFFFFF' },

  // River Plate
  't_arg_riv': { primary: '#FFFFFF', secondary: '#E31B23', text: '#000000' },
  'RIV': { primary: '#FFFFFF', secondary: '#E31B23', text: '#000000' },

  // Racing Club
  't_arg_rac': { primary: '#8ECAE6', secondary: '#FFFFFF', text: '#000000' },
  'RAC': { primary: '#8ECAE6', secondary: '#FFFFFF', text: '#000000' },

  // Independiente
  't_arg_ind': { primary: '#E31B23', secondary: '#FFFFFF', text: '#FFFFFF' },
  'IND': { primary: '#E31B23', secondary: '#FFFFFF', text: '#FFFFFF' },

  // San Lorenzo
  't_arg_san': { primary: '#003DA5', secondary: '#E31B23', text: '#FFFFFF' },
  'SLO': { primary: '#003DA5', secondary: '#E31B23', text: '#FFFFFF' },

  // Vélez Sarsfield
  't_arg_vel': { primary: '#FFFFFF', secondary: '#003DA5', text: '#000000' },
  'VEL': { primary: '#FFFFFF', secondary: '#003DA5', text: '#000000' },

  // Estudiantes
  't_arg_est': { primary: '#FFFFFF', secondary: '#E31B23', text: '#000000' },
  'EST': { primary: '#FFFFFF', secondary: '#E31B23', text: '#000000' },

  // Lanús
  't_arg_lan': { primary: '#7B001C', secondary: '#FFFFFF', text: '#FFFFFF' },
  'LAN': { primary: '#7B001C', secondary: '#FFFFFF', text: '#FFFFFF' },

  // Talleres
  't_arg_tal': { primary: '#003DA5', secondary: '#FFFFFF', text: '#FFFFFF' },
  'TAL': { primary: '#003DA5', secondary: '#FFFFFF', text: '#FFFFFF' },

  // Belgrano
  't_arg_bel': { primary: '#8ECAE6', secondary: '#FFFFFF', text: '#000000' },
  'BEL': { primary: '#8ECAE6', secondary: '#FFFFFF', text: '#000000' },

  // Rosario Central
  't_arg_roc': { primary: '#003DA5', secondary: '#FFD200', text: '#FFFFFF' },
  'ROC': { primary: '#003DA5', secondary: '#FFD200', text: '#FFFFFF' },

  // Newell's Old Boys
  't_arg_nob': { primary: '#E31B23', secondary: '#000000', text: '#FFFFFF' },
  'NOB': { primary: '#E31B23', secondary: '#000000', text: '#FFFFFF' },

  // Argentinos Juniors
  't_arg_arj': { primary: '#E31B23', secondary: '#FFFFFF', text: '#FFFFFF' },
  'ARJ': { primary: '#E31B23', secondary: '#FFFFFF', text: '#FFFFFF' },

  // Huracán
  't_arg_hur': { primary: '#FFFFFF', secondary: '#E31B23', text: '#000000' },
  'HUR': { primary: '#FFFFFF', secondary: '#E31B23', text: '#000000' },

  // ==========================================================================
  // ENGLAND - PREMIER LEAGUE
  // ==========================================================================

  // Arsenal
  't_epl_ars': { primary: '#EF0107', secondary: '#FFFFFF', text: '#FFFFFF' },
  'ARS': { primary: '#EF0107', secondary: '#FFFFFF', text: '#FFFFFF' },

  // Aston Villa
  't_epl_avl': { primary: '#670E36', secondary: '#95BFE5', text: '#FFFFFF' },
  'AVL': { primary: '#670E36', secondary: '#95BFE5', text: '#FFFFFF' },

  // Bournemouth
  't_epl_bou': { primary: '#DA291C', secondary: '#000000', text: '#FFFFFF' },
  'BOU': { primary: '#DA291C', secondary: '#000000', text: '#FFFFFF' },

  // Brentford
  't_epl_bre': { primary: '#E30613', secondary: '#FFFFFF', text: '#FFFFFF' },
  'BRE': { primary: '#E30613', secondary: '#FFFFFF', text: '#FFFFFF' },

  // Brighton
  't_epl_bri': { primary: '#0057B8', secondary: '#FFFFFF', text: '#FFFFFF' },
  'BHA': { primary: '#0057B8', secondary: '#FFFFFF', text: '#FFFFFF' },

  // Chelsea
  't_epl_che': { primary: '#034694', secondary: '#FFFFFF', text: '#FFFFFF' },
  'CHE': { primary: '#034694', secondary: '#FFFFFF', text: '#FFFFFF' },

  // Crystal Palace
  't_epl_cry': { primary: '#1B458F', secondary: '#C4122E', text: '#FFFFFF' },
  'CRY': { primary: '#1B458F', secondary: '#C4122E', text: '#FFFFFF' },

  // Everton
  't_epl_eve': { primary: '#003399', secondary: '#FFFFFF', text: '#FFFFFF' },
  'EVE': { primary: '#003399', secondary: '#FFFFFF', text: '#FFFFFF' },

  // Fulham
  't_epl_ful': { primary: '#FFFFFF', secondary: '#000000', text: '#000000' },
  'FUL': { primary: '#FFFFFF', secondary: '#000000', text: '#000000' },

  // Ipswich Town
  't_epl_ips': { primary: '#3A64A3', secondary: '#FFFFFF', text: '#FFFFFF' },
  'IPS': { primary: '#3A64A3', secondary: '#FFFFFF', text: '#FFFFFF' },

  // Leicester City
  't_epl_lei': { primary: '#003090', secondary: '#FDBE11', text: '#FFFFFF' },
  'LEI': { primary: '#003090', secondary: '#FDBE11', text: '#FFFFFF' },

  // Liverpool
  't_epl_liv': { primary: '#C8102E', secondary: '#FFFFFF', text: '#FFFFFF' },
  'LIV': { primary: '#C8102E', secondary: '#FFFFFF', text: '#FFFFFF' },

  // Manchester City
  't_epl_mci': { primary: '#6CABDD', secondary: '#FFFFFF', text: '#000000' },
  'MCI': { primary: '#6CABDD', secondary: '#FFFFFF', text: '#000000' },

  // Manchester United
  't_epl_mun': { primary: '#DA291C', secondary: '#FBE122', text: '#FFFFFF' },
  'MUN': { primary: '#DA291C', secondary: '#FBE122', text: '#FFFFFF' },

  // Newcastle United
  't_epl_new': { primary: '#241F20', secondary: '#FFFFFF', text: '#FFFFFF' },
  'NEW': { primary: '#241F20', secondary: '#FFFFFF', text: '#FFFFFF' },

  // Nottingham Forest
  't_epl_not': { primary: '#E53233', secondary: '#FFFFFF', text: '#FFFFFF' },
  'NFO': { primary: '#E53233', secondary: '#FFFFFF', text: '#FFFFFF' },

  // Southampton
  't_epl_sou': { primary: '#D71920', secondary: '#FFFFFF', text: '#FFFFFF' },
  'SOU': { primary: '#D71920', secondary: '#FFFFFF', text: '#FFFFFF' },

  // Tottenham Hotspur
  't_epl_tot': { primary: '#FFFFFF', secondary: '#132257', text: '#000000' },
  'TOT': { primary: '#FFFFFF', secondary: '#132257', text: '#000000' },

  // West Ham United
  't_epl_whu': { primary: '#7A263A', secondary: '#1BB1E7', text: '#FFFFFF' },
  'WHU': { primary: '#7A263A', secondary: '#1BB1E7', text: '#FFFFFF' },

  // Wolverhampton Wanderers
  't_epl_wol': { primary: '#FDB913', secondary: '#231F20', text: '#000000' },
  'WOL': { primary: '#FDB913', secondary: '#231F20', text: '#000000' },

  // ==========================================================================
  // SPAIN - LA LIGA
  // ==========================================================================

  // Real Madrid
  't_spa_rma': { primary: '#FFFFFF', secondary: '#FEBE10', text: '#000000' },
  'RMA': { primary: '#FFFFFF', secondary: '#FEBE10', text: '#000000' },

  // Barcelona
  't_spa_bar': { primary: '#A50044', secondary: '#004D98', text: '#FFFFFF' },
  'BAR': { primary: '#A50044', secondary: '#004D98', text: '#FFFFFF' },

  // Atlético Madrid
  't_spa_atm': { primary: '#CB3524', secondary: '#FFFFFF', text: '#FFFFFF' },
  'ATM': { primary: '#CB3524', secondary: '#FFFFFF', text: '#FFFFFF' },

  // Sevilla
  't_spa_sev': { primary: '#FFFFFF', secondary: '#F43333', text: '#000000' },
  'SEV': { primary: '#FFFFFF', secondary: '#F43333', text: '#000000' },

  // Real Betis
  't_spa_bet': { primary: '#00954C', secondary: '#FFFFFF', text: '#FFFFFF' },
  'BET': { primary: '#00954C', secondary: '#FFFFFF', text: '#FFFFFF' },

  // Real Sociedad
  't_spa_rso': { primary: '#0067B1', secondary: '#FFFFFF', text: '#FFFFFF' },
  'RSO': { primary: '#0067B1', secondary: '#FFFFFF', text: '#FFFFFF' },

  // Valencia
  't_spa_val': { primary: '#FFFFFF', secondary: '#E8501B', text: '#000000' },
  'VAL': { primary: '#FFFFFF', secondary: '#E8501B', text: '#000000' },

  // Athletic Bilbao
  't_spa_ath': { primary: '#E31B23', secondary: '#FFFFFF', text: '#FFFFFF' },
  'ATH': { primary: '#E31B23', secondary: '#FFFFFF', text: '#FFFFFF' },

  // Villarreal
  't_spa_vil': { primary: '#FFE114', secondary: '#005DAA', text: '#000000' },
  'VIL': { primary: '#FFE114', secondary: '#005DAA', text: '#000000' },

  // ==========================================================================
  // ITALY - SERIE A
  // ==========================================================================

  // Juventus
  't_ita_juv': { primary: '#000000', secondary: '#FFFFFF', text: '#FFFFFF' },
  'JUV': { primary: '#000000', secondary: '#FFFFFF', text: '#FFFFFF' },

  // AC Milan
  't_ita_mil': { primary: '#FB090B', secondary: '#000000', text: '#FFFFFF' },
  'MIL': { primary: '#FB090B', secondary: '#000000', text: '#FFFFFF' },

  // Inter Milan
  't_ita_int': { primary: '#010E80', secondary: '#000000', text: '#FFFFFF' },
  'INT': { primary: '#010E80', secondary: '#000000', text: '#FFFFFF' },

  // Napoli
  't_ita_nap': { primary: '#12A0D7', secondary: '#FFFFFF', text: '#FFFFFF' },
  'NAP': { primary: '#12A0D7', secondary: '#FFFFFF', text: '#FFFFFF' },

  // Roma
  't_ita_rom': { primary: '#8E1F2F', secondary: '#F0BC42', text: '#FFFFFF' },
  'ROM': { primary: '#8E1F2F', secondary: '#F0BC42', text: '#FFFFFF' },

  // Lazio
  't_ita_laz': { primary: '#89D0F0', secondary: '#FFFFFF', text: '#000000' },
  'LAZ': { primary: '#89D0F0', secondary: '#FFFFFF', text: '#000000' },

  // Fiorentina
  't_ita_fio': { primary: '#4B2D81', secondary: '#FFFFFF', text: '#FFFFFF' },
  'FIO': { primary: '#4B2D81', secondary: '#FFFFFF', text: '#FFFFFF' },

  // Atalanta
  't_ita_ata': { primary: '#1E71B8', secondary: '#000000', text: '#FFFFFF' },
  'ATA': { primary: '#1E71B8', secondary: '#000000', text: '#FFFFFF' },

  // ==========================================================================
  // GERMANY - BUNDESLIGA
  // ==========================================================================

  // Bayern Munich
  't_ger_bay': { primary: '#DC052D', secondary: '#FFFFFF', text: '#FFFFFF' },
  'BAY': { primary: '#DC052D', secondary: '#FFFFFF', text: '#FFFFFF' },

  // Borussia Dortmund
  't_ger_dor': { primary: '#FDE100', secondary: '#000000', text: '#000000' },
  'BVB': { primary: '#FDE100', secondary: '#000000', text: '#000000' },

  // RB Leipzig
  't_ger_rbl': { primary: '#DD0741', secondary: '#FFFFFF', text: '#FFFFFF' },
  'RBL': { primary: '#DD0741', secondary: '#FFFFFF', text: '#FFFFFF' },

  // Bayer Leverkusen
  't_ger_lev': { primary: '#E32221', secondary: '#000000', text: '#FFFFFF' },
  'B04': { primary: '#E32221', secondary: '#000000', text: '#FFFFFF' },

  // Schalke 04
  't_ger_sch': { primary: '#004D9D', secondary: '#FFFFFF', text: '#FFFFFF' },
  'S04': { primary: '#004D9D', secondary: '#FFFFFF', text: '#FFFFFF' },

  // ==========================================================================
  // FRANCE - LIGUE 1
  // ==========================================================================

  // Paris Saint-Germain
  't_fra_psg': { primary: '#004170', secondary: '#DA291C', text: '#FFFFFF' },
  'PSG': { primary: '#004170', secondary: '#DA291C', text: '#FFFFFF' },

  // Marseille
  't_fra_mar': { primary: '#2FAEE0', secondary: '#FFFFFF', text: '#FFFFFF' },
  'OM': { primary: '#2FAEE0', secondary: '#FFFFFF', text: '#FFFFFF' },

  // Lyon
  't_fra_lyo': { primary: '#FFFFFF', secondary: '#DA291C', text: '#000000' },
  'OL': { primary: '#FFFFFF', secondary: '#DA291C', text: '#000000' },

  // Monaco
  't_fra_mon': { primary: '#E31B23', secondary: '#FFFFFF', text: '#FFFFFF' },
  'ASM': { primary: '#E31B23', secondary: '#FFFFFF', text: '#FFFFFF' },

  // ==========================================================================
  // PORTUGAL - PRIMEIRA LIGA
  // ==========================================================================

  // Benfica
  't_por_ben': { primary: '#FF0000', secondary: '#FFFFFF', text: '#FFFFFF' },
  'SLB': { primary: '#FF0000', secondary: '#FFFFFF', text: '#FFFFFF' },

  // Porto
  't_por_por': { primary: '#003893', secondary: '#FFFFFF', text: '#FFFFFF' },
  'FCP': { primary: '#003893', secondary: '#FFFFFF', text: '#FFFFFF' },

  // Sporting
  't_por_spo': { primary: '#008B00', secondary: '#FFFFFF', text: '#FFFFFF' },
  'SCP': { primary: '#008B00', secondary: '#FFFFFF', text: '#FFFFFF' },

  // ==========================================================================
  // NETHERLANDS - EREDIVISIE
  // ==========================================================================

  // Ajax
  't_ned_aja': { primary: '#FFFFFF', secondary: '#C8102E', text: '#000000' },
  'AJA': { primary: '#FFFFFF', secondary: '#C8102E', text: '#000000' },

  // PSV
  't_ned_psv': { primary: '#ED1C24', secondary: '#FFFFFF', text: '#FFFFFF' },
  'PSV': { primary: '#ED1C24', secondary: '#FFFFFF', text: '#FFFFFF' },

  // Feyenoord
  't_ned_fey': { primary: '#E31E24', secondary: '#FFFFFF', text: '#FFFFFF' },
  'FEY': { primary: '#E31E24', secondary: '#FFFFFF', text: '#FFFFFF' },

  // ==========================================================================
  // BRAZIL - SÉRIE A
  // ==========================================================================

  // Flamengo
  't_bra_fla': { primary: '#E31B23', secondary: '#000000', text: '#FFFFFF' },
  'FLA': { primary: '#E31B23', secondary: '#000000', text: '#FFFFFF' },

  // Palmeiras
  't_bra_pal': { primary: '#006437', secondary: '#FFFFFF', text: '#FFFFFF' },
  'PAL': { primary: '#006437', secondary: '#FFFFFF', text: '#FFFFFF' },

  // São Paulo
  't_bra_sao': { primary: '#FFFFFF', secondary: '#E31B23', text: '#000000' },
  'SAO': { primary: '#FFFFFF', secondary: '#E31B23', text: '#000000' },

  // Corinthians
  't_bra_cor': { primary: '#000000', secondary: '#FFFFFF', text: '#FFFFFF' },
  'COR': { primary: '#000000', secondary: '#FFFFFF', text: '#FFFFFF' },

  // Santos
  't_bra_san': { primary: '#FFFFFF', secondary: '#000000', text: '#000000' },
  'SAN': { primary: '#FFFFFF', secondary: '#000000', text: '#000000' },

  // Botafogo
  't_bra_bot': { primary: '#000000', secondary: '#FFFFFF', text: '#FFFFFF' },
  'BOT': { primary: '#000000', secondary: '#FFFFFF', text: '#FFFFFF' },

  // Fluminense
  't_bra_flu': { primary: '#7B0F34', secondary: '#00A651', text: '#FFFFFF' },
  'FLU': { primary: '#7B0F34', secondary: '#00A651', text: '#FFFFFF' },

  // Grêmio
  't_bra_gre': { primary: '#0060A8', secondary: '#000000', text: '#FFFFFF' },
  'GRE': { primary: '#0060A8', secondary: '#000000', text: '#FFFFFF' },

  // Internacional
  't_bra_int': { primary: '#E31B23', secondary: '#FFFFFF', text: '#FFFFFF' },
  'INT_BR': { primary: '#E31B23', secondary: '#FFFFFF', text: '#FFFFFF' },

  // ==========================================================================
  // MEXICO - LIGA MX
  // ==========================================================================

  // Club América
  't_mex_ame': { primary: '#FFE500', secondary: '#003DA5', text: '#000000' },
  'AME': { primary: '#FFE500', secondary: '#003DA5', text: '#000000' },

  // Chivas
  't_mex_chi': { primary: '#FFFFFF', secondary: '#E31B23', text: '#000000' },
  'GDL': { primary: '#FFFFFF', secondary: '#E31B23', text: '#000000' },

  // Cruz Azul
  't_mex_cru': { primary: '#003DA5', secondary: '#FFFFFF', text: '#FFFFFF' },
  'CAZ': { primary: '#003DA5', secondary: '#FFFFFF', text: '#FFFFFF' },

  // Tigres UANL
  't_mex_tig': { primary: '#FFE500', secondary: '#003DA5', text: '#000000' },
  'TIG': { primary: '#FFE500', secondary: '#003DA5', text: '#000000' },

  // Monterrey
  't_mex_mtg': { primary: '#003DA5', secondary: '#FFFFFF', text: '#FFFFFF' },
  'MTY': { primary: '#003DA5', secondary: '#FFFFFF', text: '#FFFFFF' },
};

/**
 * Get colors for a club
 * Looks up by club ID first, then by short code
 */
export function getClubColors(clubIdOrCode: string, shortCode?: string): ClubColors {
  // Try club ID first
  if (CLUB_COLORS[clubIdOrCode]) {
    return CLUB_COLORS[clubIdOrCode];
  }

  // Try short code
  if (shortCode && CLUB_COLORS[shortCode]) {
    return CLUB_COLORS[shortCode];
  }

  // Generate consistent colors based on club ID hash
  return generateConsistentColors(clubIdOrCode);
}

/**
 * Generate consistent colors from a string (for clubs without specific colors)
 */
function generateConsistentColors(str: string): ClubColors {
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }

  // Generate a hue from 0-360
  const hue = Math.abs(hash % 360);

  // Convert HSL to hex
  const primary = hslToHex(hue, 70, 45);
  const secondary = hslToHex((hue + 180) % 360, 60, 85);

  // Determine text color based on brightness
  const brightness = (hue >= 40 && hue <= 200) ? 0 : 255;
  const text = brightness === 0 ? '#000000' : '#FFFFFF';

  return { primary, secondary, text };
}

/**
 * Convert HSL to hex color
 */
function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;

  if (0 <= h && h < 60) { r = c; g = x; b = 0; }
  else if (60 <= h && h < 120) { r = x; g = c; b = 0; }
  else if (120 <= h && h < 180) { r = 0; g = c; b = x; }
  else if (180 <= h && h < 240) { r = 0; g = x; b = c; }
  else if (240 <= h && h < 300) { r = x; g = 0; b = c; }
  else if (300 <= h && h < 360) { r = c; g = 0; b = x; }

  const toHex = (n: number) => {
    const hex = Math.round((n + m) * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

/**
 * Get a CSS gradient string for a club
 */
export function getClubGradient(clubIdOrCode: string, shortCode?: string, direction = 'to right'): string {
  const colors = getClubColors(clubIdOrCode, shortCode);
  return `linear-gradient(${direction}, ${colors.primary}, ${colors.secondary})`;
}

/**
 * Get contrast text color for a given background
 */
export function getContrastColor(hexColor: string): string {
  // Convert hex to RGB
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);

  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return luminance > 0.5 ? '#000000' : '#FFFFFF';
}
