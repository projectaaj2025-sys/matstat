/* ---- 2. Настройки профиля ---------------------------------------------- */

const SP_COVERAGE_FLOOR = .7;

function spSettings() {
    if (!progress.settings || typeof progress.settings !== 'object') progress.settings = {};
    const s = progress.settings;
    if (typeof s.showSolutions !== 'boolean') s.showSolutions = false;
    if (typeof s.autoGrade !== 'boolean') s.autoGrade = true;
    const n = Number(s.solutionAttempts);
    s.solutionAttempts = Number.isFinite(n) ? Math.min(6, Math.max(1, Math.round(n))) : 3;
    const p = Number(s.passShare);
    s.passShare = Number.isFinite(p) ? Math.min(1, Math.max(.5, p)) : 1;
    return s
}

function spSetSetting(key, value) {
    const s = spSettings();
    s[key] = value;
    persist()
}

function spPassShare() {
    return spSettings().passShare
}
