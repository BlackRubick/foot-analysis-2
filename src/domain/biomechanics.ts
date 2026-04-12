import type { CameraView, StudyUID } from './patient';

// Seis cadenas globales: flexión, extensión, apertura, cierre, inspiración, espiración.
export type ChainType =
  | 'flexion'
  | 'extension'
  | 'apertura'
  | 'cierre'
  | 'inspiracion'
  | 'espiracion';

export interface AnatomicalPoint {
  label: string; // cadera, rodilla, tobillo, etc.
  x: number; // 0-1 relativo a ancho
  y: number; // 0-1 relativo a alto
}

export interface LimbPoints {
  hip: AnatomicalPoint;
  knee: AnatomicalPoint;
  ankle: AnatomicalPoint;
}

export interface TibiofemoralAngleResult {
  angleDeg: number;
  classification: 'normal' | 'valgo' | 'varo';
}

export interface ChainScore {
  chain: ChainType;
  percentage: number; // 0-100
}

export interface ChainTraitDefinition {
  id: string;
  label: string;
  chain: ChainType;
  weight: number;
}

export interface BiomechanicalAnalysisResult {
  studyUID: StudyUID;
  view: CameraView;
  tibiofemoral?: TibiofemoralAngleResult;
  chainScores: ChainScore[];
}

// Rasgos clínicos principales por cadena (resumen del protocolo).
// Se pueden extender más adelante, manteniendo el mismo esquema.
export const CHAIN_TRAITS: ChainTraitDefinition[] = [
  // CADENA DE FLEXIÓN
  {
    id: 'flex-genu-flexum',
    label: 'Genu flexum: rodillas en ligera flexión (< 175°)',
    chain: 'flexion',
    weight: 1,
  },
  {
    id: 'flex-sacro-vertical',
    label: 'Sacro verticalizado / cifosis sacra (flecha S ≈ 0 mm)',
    chain: 'flexion',
    weight: 1,
  },
  {
    id: 'flex-coxis-hacia-adentro',
    label: 'Coxis hacia adentro / retroversión pélvica marcada',
    chain: 'flexion',
    weight: 1,
  },
  {
    id: 'flex-cifosis-dorsal',
    label: 'Hipercifosis dorsal con flecha D7 aumentada',
    chain: 'flexion',
    weight: 1,
  },
  {
    id: 'flex-esternon-hundido',
    label: 'Esternón hundido / pectus excavatum (ángulo de Charpy agudo)',
    chain: 'flexion',
    weight: 1,
  },
  {
    id: 'flex-inversion-cervical',
    label: 'Inversión de cervicales / rectificación marcada',
    chain: 'flexion',
    weight: 1,
  },
  {
    id: 'flex-proyeccion-anterior-cabeza',
    label: 'Proyección anterior de la cabeza (línea de Barré adelantada)',
    chain: 'flexion',
    weight: 1,
  },
  {
    id: 'flex-cierre-mandibula',
    label: 'Cierre de mandíbula / retrognatismo (Clase II)',
    chain: 'flexion',
    weight: 1,
  },
  {
    id: 'flex-cierre-costillas',
    label: 'Cierre de costillas (ángulo de Charpy < 90°)',
    chain: 'flexion',
    weight: 1,
  },
  {
    id: 'flex-ms-descenso-aduccion',
    label: 'MsSs: hombros descendidos, aducción y rotación interna',
    chain: 'flexion',
    weight: 1,
  },
  {
    id: 'flex-rotacion-interna-cadera',
    label: 'Rotación interna de cadera / rótulas convergentes',
    chain: 'flexion',
    weight: 1,
  },

  // CADENA DE EXTENSIÓN
  {
    id: 'ext-genu-recurvatum',
    label: 'Genu recurvatum: rodilla en hiperextensión (> 185°)',
    chain: 'extension',
    weight: 1,
  },
  {
    id: 'ext-sacro-horizontal',
    label: 'Sacro horizontalizado (pendiente sacra baja)',
    chain: 'extension',
    weight: 1,
  },
  {
    id: 'ext-dorso-plano',
    label: 'Dorso plano: flecha dorsal muy reducida',
    chain: 'extension',
    weight: 1,
  },
  {
    id: 'ext-rectificacion-cervical',
    label: 'Rectificación cervical con plomada casi sin flecha',
    chain: 'extension',
    weight: 1,
  },
  {
    id: 'ext-basc-posterior-cabeza',
    label: 'Báscula posterior de la cabeza (trago por detrás de la vertical)',
    chain: 'extension',
    weight: 1,
  },
  {
    id: 'ext-esternon-horizontal',
    label: 'Esternón horizontal / elevado',
    chain: 'extension',
    weight: 1,
  },
  {
    id: 'ext-anteversion-pelvica',
    label: 'Anteversión pélvica marcada (> 15°–20°)',
    chain: 'extension',
    weight: 1,
  },
  {
    id: 'ext-hiperlordosis-baja',
    label: 'Hiperlordosis lumbar baja (flecha lumbar aumentada)',
    chain: 'extension',
    weight: 1,
  },
  {
    id: 'ext-extension-msls',
    label: 'Extensión de MsIs: cadera en extensión, recurvatum, peso anterior',
    chain: 'extension',
    weight: 1,
  },
  {
    id: 'ext-pie-cavo',
    label: 'Pie cavo / supino (huella con arco elevado)',
    chain: 'extension',
    weight: 1,
  },

  // CADENA DE APERTURA
  {
    id: 'ap-ascenso-hombro',
    label: 'Ascenso de hombro (> 15 mm respecto a la línea esternal)',
    chain: 'apertura',
    weight: 1,
  },
  {
    id: 'ap-rotacion-externa-msls',
    label: 'MsSs en rotación externa / supinación, palmas hacia adelante',
    chain: 'apertura',
    weight: 1,
  },
  {
    id: 'ap-abduccion-brazos',
    label: 'Abducción de miembros superiores (ángulo axilar > 15°)',
    chain: 'apertura',
    weight: 1,
  },
  {
    id: 'ap-apertura-costillas',
    label: 'Apertura de costillas (ángulo de Charpy > 90°)',
    chain: 'apertura',
    weight: 1,
  },
  {
    id: 'ap-rotacion-externa-cadera',
    label: 'Caderas en rotación externa (rótulas divergentes)',
    chain: 'apertura',
    weight: 1,
  },
  {
    id: 'ap-varo-calcaneo',
    label: 'Varo de calcáneo (ángulo de Helbing en apertura)',
    chain: 'apertura',
    weight: 1,
  },
  {
    id: 'ap-pie-eversion',
    label: 'Pie en eversión / pronado (pie plano funcional)',
    chain: 'apertura',
    weight: 1,
  },

  // CADENA DE CIERRE
  {
    id: 'cierre-ms-descenso-aduccion',
    label: 'MsSs: descenso de hombros, aducción y rotación interna',
    chain: 'cierre',
    weight: 1,
  },
  {
    id: 'cierre-claviculas-v',
    label: 'Clavículas en V descendente',
    chain: 'cierre',
    weight: 1,
  },
  {
    id: 'cierre-parrilla-costal-cerrada',
    label: 'Parrilla costal cerrada (ángulo de Charpy disminuido)',
    chain: 'cierre',
    weight: 1,
  },
  {
    id: 'cierre-escapula-alada',
    label: 'Despegue del borde espinal de omóplatos (escápula alada)',
    chain: 'cierre',
    weight: 1,
  },
  {
    id: 'cierre-contranutacion-iliacos',
    label: 'Contranutación de ilíacos (báscula anterior de crestas ilíacas)',
    chain: 'cierre',
    weight: 1,
  },
  {
    id: 'cierre-flexo-coxofemoral',
    label: 'Flexo de coxofemoral (ángulo tronco-fémur < 180° en reposo)',
    chain: 'cierre',
    weight: 1,
  },
  {
    id: 'cierre-rotacion-interna-cadera',
    label: 'Rotación interna de cadera (rótulas hacia la línea media)',
    chain: 'cierre',
    weight: 1,
  },
  {
    id: 'cierre-valgo-calcaneo',
    label: 'Valgo de calcáneo (ángulo de Helbing en cierre)',
    chain: 'cierre',
    weight: 1,
  },

  // CADENA DE INSPIRACIÓN
  {
    id: 'insp-rectificacion-cervical',
    label: 'Rectitud cervical (flecha cervical muy reducida)',
    chain: 'inspiracion',
    weight: 1,
  },
  {
    id: 'insp-inversion-cervical',
    label: 'Inversión cervical (C4 por detrás de línea C7-occipital)',
    chain: 'inspiracion',
    weight: 1,
  },
  {
    id: 'insp-dorso-plano',
    label: 'Dorso plano con proyección anterior del tronco',
    chain: 'inspiracion',
    weight: 1,
  },
  {
    id: 'insp-torax-inspiracion',
    label: 'Tórax en inspiración (ángulo de Charpy ≈ 90° y caja elevada)',
    chain: 'inspiracion',
    weight: 1,
  },
  {
    id: 'insp-ascenso-rotula',
    label: 'Ascenso de rótula (rótula alta en frontal)',
    chain: 'inspiracion',
    weight: 1,
  },
  {
    id: 'insp-pelvis-retropulsion',
    label: 'Pelvis posteriorizada (retropulsión respecto a plomada)',
    chain: 'inspiracion',
    weight: 1,
  },
  {
    id: 'insp-rotacion-externa-cadera',
    label: 'Rotación externa de cadera (rótulas hacia fuera)',
    chain: 'inspiracion',
    weight: 1,
  },
  {
    id: 'insp-hiperlordosis-lumbar-baja',
    label: 'Hiperlordosis lumbar baja asociada a inspiración',
    chain: 'inspiracion',
    weight: 1,
  },
  {
    id: 'insp-recurvatum-rodilla',
    label: 'Recurvatum de rodilla en apoyo (hiperextensión en inspiración)',
    chain: 'inspiracion',
    weight: 1,
  },

  // CADENA DE ESPIRACIÓN
  {
    id: 'esp-pelvis-anteriorizada',
    label: 'Pelvis anteriorizada respecto a la plomada (antepulsión pélvica)',
    chain: 'espiracion',
    weight: 1,
  },
  {
    id: 'esp-torax-posterior',
    label: 'Tórax trasladado posteriormente respecto al tobillo',
    chain: 'espiracion',
    weight: 1,
  },
  {
    id: 'esp-hipercifosis-baja',
    label: 'Hipercifosis dorsal baja (vértice en D10–D12)',
    chain: 'espiracion',
    weight: 1,
  },
  {
    id: 'esp-psoas-distendido',
    label: 'Psoas distendido / hiperactividad en espiración',
    chain: 'espiracion',
    weight: 1,
  },
  {
    id: 'esp-hiperlordosis-lumbar',
    label: 'Hiperlordosis lumbar (flecha L3/L5 > 45 mm en espiración)',
    chain: 'espiracion',
    weight: 1,
  },
  {
    id: 'esp-rotacion-interna-cadera',
    label: 'Rotación interna de cadera en espiración (rótulas convergentes)',
    chain: 'espiracion',
    weight: 1,
  },
  {
    id: 'esp-pie-pronado',
    label: 'Pie en pronación / plano (huella con hundimiento del arco)',
    chain: 'espiracion',
    weight: 1,
  },
];

export function computeTibiofemoralAngle(points: LimbPoints): TibiofemoralAngleResult {
  const vFemur = { x: points.hip.x - points.knee.x, y: points.hip.y - points.knee.y };
  const vTibia = { x: points.ankle.x - points.knee.x, y: points.ankle.y - points.knee.y };

  const dot = vFemur.x * vTibia.x + vFemur.y * vTibia.y;
  const magFemur = Math.hypot(vFemur.x, vFemur.y);
  const magTibia = Math.hypot(vTibia.x, vTibia.y);
  const cosTheta = dot / (magFemur * magTibia || 1);
  const angleRad = Math.acos(Math.min(1, Math.max(-1, cosTheta)));
  const angleDeg = (angleRad * 180) / Math.PI;

  let classification: TibiofemoralAngleResult['classification'];
  if (angleDeg < 170) classification = 'valgo';
  else if (angleDeg > 185) classification = 'varo';
  else classification = 'normal';

  return { angleDeg, classification };
}

export function computeChainScores(selectedTraitIds: string[]): ChainScore[] {
  // Todas las cadenas están siempre "encendidas" en el cuerpo.
  // Partimos de un peso basal igual para las 6 y sumamos rasgos encima
  // para reflejar la cadena con mayor predominancia.
  const baseWeight = 1;
  const totalsByChain: Record<ChainType, number> = {
    flexion: baseWeight,
    extension: baseWeight,
    apertura: baseWeight,
    cierre: baseWeight,
    inspiracion: baseWeight,
    espiracion: baseWeight,
  };

  for (const trait of CHAIN_TRAITS) {
    if (selectedTraitIds.includes(trait.id)) {
      totalsByChain[trait.chain] += trait.weight;
    }
  }

  const total = Object.values(totalsByChain).reduce((acc, v) => acc + v, 0) || 1;

  return (Object.keys(totalsByChain) as ChainType[]).map((chain) => ({
    chain,
    percentage: Number(((totalsByChain[chain] / total) * 100).toFixed(1)),
  }));
}
