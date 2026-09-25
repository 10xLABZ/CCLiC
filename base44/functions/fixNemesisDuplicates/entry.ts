import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Extra unique gamertag names to use as replacements
const REPLACEMENT_NAMES = [
  'N0tUrHomie','SlickRickk','MaloMalo','AyoRelax','BruhItsKevin','DirtNapDan',
  'WickedV4to','JrzyBrawler','SirClappem','DropDeadDre','ElReyLoco','BlinkyBandit',
  'RawrItsLeXx','DaRealToasty','NenaConFuego','TrynaWinBro','2FastTino',
  'CashMeOutsidee','xKoldHandz','OoopsMyBad','BabyFaceKilla','FuegoMamixoxo',
  'NoAimNico','SeñoraSavage','BoiAintNoWay','ItsYaBoiDre','XtraCrispyyy',
  'MeanMuggin','KillaCammm','PuroCaos2','Aim4DaFac3','LilMissHex','DonTazeMe',
  '2ColdTasha','OopsINukedU','NachoBusiness','Loco4Headshots','DntPushMee',
  'HellaSalty2','MiraMami','xLilSav','NoNoNate','MaddDogg','KinggOfNada',
  'AintScareddd','0ChanceBuddy','DrowsyDemon','YeaItsMe','BigPermJr',
  'MisterMischief','J3faRuthl3ss','DrippyBandito','JustaMenace','NoTeVeo',
  'TuffCookieee','ImHimTho','SassyButDeadly','3AMGremlin','CuhWatchOut',
  'MamiNoMercy','1BackUpTerry','LoquitaMode','Fuhgeddaboudit','xRuthl3ss',
  'PelonProblems','LadyClutchh','SkrrtSkrrtSam2','1MeanSenor','TinyButPsycho',
  'ElBurritoLoko','YungCranker','SleepyAssassin','G0mezGoneWild','TrashTalkTina',
  'BigChileEnergy','iBlinkURGone','SlapzMcGee','ChicoDoom','IzzyInChaos',
  'MaddHatterr','AyoItsMeee','WtfRickyLoL','HolaMurder','ZeroChillVic',
  'DaddysLilMenace','xDeadpanx2','FrijoleFury','NoScopeNanii','PanicAtSpawn',
  'MurderMitten','MijoMeansBiz','CrankyCarnage2','ThatDudeJavi','0ldSchoolFlex',
  'BroRelaxx2','KweenKaboom2','SoyUnProblema','WylinWendy','MissMisfire',
  '2TurntTony','Elbows4Free','ChillTillSudden','NaughtyByAim','SupaGrimy',
  'TiaOfTerror','GrampaGoesHard2','OopsAllViolence','xXtraSpicy2','DontPeekPlz',
  'WrecklessRosa','1TapAbuelo2','BabyFaceBandit','SilentSavage','GlitchQueen'
];

const realNamePattern = /^[A-ZÀ-Ö][a-záéíóúüñç]+ [A-ZÀ-Ö][a-záéíóúüñç]+$/;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

    const allSlots = await base44.asServiceRole.entities.TerritorySlot.list('-created_date', 10000);
    const nemesisSlots = allSlots.filter(s => s.user_id && s.user_id.startsWith('nemesis_'));

    // Collect all currently-used nemesis usernames
    const usedNames = new Set(nemesisSlots.map(s => s.username));

    // Build a pool of replacement names not already in use
    const replacementPool = REPLACEMENT_NAMES.filter(n => !usedNames.has(n));
    let replacementIndex = 0;

    const getNextReplacement = () => {
      while (replacementIndex < replacementPool.length) {
        const name = replacementPool[replacementIndex++];
        if (!usedNames.has(name)) {
          usedNames.add(name);
          return name;
        }
      }
      // Fallback: generate a unique name with timestamp suffix
      const fallback = `NB_${Date.now() % 9999}`;
      usedNames.add(fallback);
      return fallback;
    };

    const fixes = [];

    // Find duplicates — keep the first occurrence, rename subsequent ones
    const seenUsernames = {};
    for (const slot of nemesisSlots) {
      if (seenUsernames[slot.username]) {
        // Duplicate — rename this one
        const newName = getNextReplacement();
        fixes.push({ id: slot.id, oldName: slot.username, newName, city: slot.city, state: slot.state, reason: 'duplicate' });
        usedNames.add(newName);
      } else {
        seenUsernames[slot.username] = true;
      }
    }

    // Find real-name-style bots (e.g. "Kevin Brown")
    for (const slot of nemesisSlots) {
      if (realNamePattern.test(slot.username) && !fixes.find(f => f.id === slot.id)) {
        const newName = getNextReplacement();
        fixes.push({ id: slot.id, oldName: slot.username, newName, city: slot.city, state: slot.state, reason: 'real_name_style' });
        usedNames.add(newName);
      }
    }

    // Apply fixes
    const results = [];
    for (const fix of fixes) {
      await base44.asServiceRole.entities.TerritorySlot.update(fix.id, { username: fix.newName });
      results.push(fix);
      await new Promise(r => setTimeout(r, 100));
    }

    return Response.json({
      success: true,
      total_fixed: results.length,
      fixes: results
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});