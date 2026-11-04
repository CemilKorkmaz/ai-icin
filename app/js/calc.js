// Üretim hesap motoru — saha görüşmesindeki "geometri, öz kütle, güzel hesaplar" isteğinin tek kaynağı.
// Bütün ekranlar ve server/erp/scripts/event_worker.py aynı kuralları kullanır.
// Şekil/şema yok; yalnızca saf fonksiyonlar.

export const DEFAULT_DENSITY = 2700; // kg/m³ — alaşım kartından okunur, sabit kodlanmaz
export const DEFAULT_DIAMETER_MM = 178;
export const DEFAULT_CAST_MM = 6300;
export const DEFAULT_PRODUCT_MM = 6000;
export const DEFAULT_HEAD_MM = 300;
export const DEFAULT_BLADE_MM = 3;

/** Silindir kütlesi: çap ve uzunluk mm, yoğunluk kg/m³, sonuç kg. */
export function cylinderMassKg(diameterMm, lengthMm, density = DEFAULT_DENSITY, count = 1) {
  const d = Number(diameterMm), l = Number(lengthMm), rho = Number(density), n = Number(count);
  if (!(d > 0) || !(l > 0) || !(rho > 0) || !(n > 0)) return 0;
  const radiusM = d / 2000;
  const lengthM = l / 1000;
  return Math.PI * radiusM * radiusM * lengthM * rho * n;
}

export const kgToTon = (kg) => Number(kg || 0) / 1000;
export const round = (n, d = 3) => Number(Number(n || 0).toFixed(d));

/**
 * Kesim raporu. Konuşmadaki 6300 / 6000 / 300 / 3 mm ve Ø178 örneğini modeller.
 * bladeInsideCastLength=true ise kafa payı 6300−6000−3 = 297 mm olur.
 */
export function cuttingReport({
  diameterMm = DEFAULT_DIAMETER_MM,
  castLengthMm = DEFAULT_CAST_MM,
  productLengthMm = DEFAULT_PRODUCT_MM,
  headMm = DEFAULT_HEAD_MM,
  bladeMm = DEFAULT_BLADE_MM,
  density = DEFAULT_DENSITY,
  count = 1,
  headPerBillet = 2,
  cutsPerBillet = 2,
  bladeInsideCastLength = true,
  scrapBilletKg = 0,
  grossTon = null,
  transferredTon = 0,
  pathHoldTon = 0
} = {}) {
  const n = Math.max(1, Number(count) || 1);
  const blade = Number(bladeMm) || 0;
  const declaredHead = Number(headMm) || 0;
  const effectiveHead = bladeInsideCastLength
    ? Math.max(0, castLengthMm - productLengthMm - blade)
    : declaredHead;
  const deviationMm = castLengthMm - (productLengthMm + effectiveHead + blade);
  const cuts = n * Math.max(1, Number(cutsPerBillet) || 1);
  const heads = n * Math.max(1, Number(headPerBillet) || 1);

  const castKg = cylinderMassKg(diameterMm, castLengthMm, density, n);
  const productKg = cylinderMassKg(diameterMm, productLengthMm, density, n);
  const headKg = cylinderMassKg(diameterMm, effectiveHead, density, heads);
  const sawdustKg = cylinderMassKg(diameterMm, blade, density, cuts);
  const scrapKg = Number(scrapBilletKg) || 0;

  const measuredCastTon = grossTon === null || grossTon === undefined || grossTon === ''
    ? kgToTon(castKg)
    : kgToTon(grossTon * 1000 - (Number(transferredTon) || 0) * 1000 - (Number(pathHoldTon) || 0) * 1000);

  const netKg = Math.max(0, measuredCastTon * 1000 - headKg - sawdustKg - scrapKg);
  const geometryTon = kgToTon(productKg);
  const balanceGapKg = Math.max(0, measuredCastTon * 1000 - headKg - sawdustKg - scrapKg - productKg);

  return {
    diameterMm: Number(diameterMm),
    density: Number(density),
    count: n,
    castLengthMm: Number(castLengthMm),
    productLengthMm: Number(productLengthMm),
    declaredHeadMm: declaredHead,
    effectiveHeadMm: round(effectiveHead, 0),
    bladeMm: blade,
    deviationMm: round(deviationMm, 0),
    headPerBillet: Number(headPerBillet),
    cutsPerBillet: Number(cutsPerBillet),
    kerfCuts: cuts,
    headPieces: heads,
    castKg: round(castKg, 2),
    productKg: round(productKg, 2),
    headKg: round(headKg, 2),
    sawdustKg: round(sawdustKg, 3),
    scrapBilletKg: round(scrapKg, 2),
    unitProductKg: round(cylinderMassKg(diameterMm, productLengthMm, density, 1), 3),
    unitHeadKg: round(cylinderMassKg(diameterMm, effectiveHead, density, 1), 3),
    unitSawdustKg: round(cylinderMassKg(diameterMm, blade, density, 1), 4),
    measuredCastTon: round(measuredCastTon, 3),
    netBilletKg: round(netKg, 2),
    netBilletTon: round(kgToTon(netKg), 3),
    geometryTon: round(geometryTon, 3),
    balanceGapKg: round(balanceGapKg, 2),
    totalLossKg: round(headKg + sawdustKg + scrapKg, 2)
  };
}

/** Kayıtlı tonaj ile geometriden hesaplanan tonajı karşılaştırır. */
export function geometryCheck({ recordedTon, count, diameterMm, productLengthMm = DEFAULT_PRODUCT_MM, density = DEFAULT_DENSITY, tolerancePct = 2 } = {}) {
  const rec = Number(recordedTon) || 0;
  const expected = kgToTon(cylinderMassKg(diameterMm, productLengthMm, density, Math.max(1, Number(count) || 1)));
  const deviationPct = rec > 0 ? Math.abs(rec - expected) / rec * 100 : 0;
  return { recordedTon: round(rec, 3), expectedTon: round(expected, 3), deviationPct: round(deviationPct, 2), ok: deviationPct <= tolerancePct };
}

/** 21 → 18 → 17 → 14 ton zinciri gibi ardışık olaylardan bakiye üretir. */
export function massBalanceChain(steps = []) {
  let balance = 0;
  return steps.map((s, i) => {
    const delta = Number(s.deltaTon) || 0;
    balance = round(balance + delta, 3);
    return { seq: i + 1, ...s, deltaTon: round(delta, 3), balanceTon: balance };
  });
}

/** Yağ ve bıçak sayaç kuralları: parametreler fabrikadan gelir. */
export function maintenanceStatus({ used = 0, limit = 100, warnAt = null } = {}) {
  const u = Number(used) || 0, l = Math.max(1, Number(limit) || 1);
  const warn = warnAt === null || warnAt === undefined || warnAt === '' ? Math.floor(l * 0.9) : Number(warnAt);
  const pct = Math.min(100, u / l * 100);
  const level = u >= l ? 'danger' : u >= warn ? 'warn' : 'ok';
  return { used: u, limit: l, warnAt: warn, percent: round(pct, 1), remaining: Math.max(0, l - u), level, label: level === 'danger' ? 'Eşik Doldu' : level === 'warn' ? 'Yaklaşıyor' : 'Normal' };
}

/** Homojenizasyon süre sapması. */
export function durationCheck({ startedAt, endedAt = null, plannedMinutes = 480, nowMs = Date.now(), toleranceMin = 0 } = {}) {
  const start = new Date(startedAt).getTime();
  const end = endedAt ? new Date(endedAt).getTime() : nowMs;
  if (isNaN(start) || isNaN(end)) return { plannedMinutes, elapsedMinutes: 0, overrunMinutes: 0, status: 'Bilinmiyor' };
  const elapsed = Math.max(0, (end - start) / 60000);
  const over = elapsed - Number(plannedMinutes || 0);
  return {
    plannedMinutes: Number(plannedMinutes),
    elapsedMinutes: round(elapsed, 1),
    overrunMinutes: round(Math.max(0, over), 1),
    status: over > Number(toleranceMin || 0) ? 'Süre Aşımı' : endedAt ? 'Tamamlandı' : 'Devam ediyor'
  };
}

export const FATES = {
  remelt: { label: 'Tekrar Fırına', kind: 'indigo' },
  recycle: { label: 'Döngüsel', kind: 'cyan' },
  sale: { label: 'Satışa', kind: 'warn' },
  waste: { label: 'Atık', kind: 'danger' },
  product: { label: 'Mamul', kind: 'ok' }
};
