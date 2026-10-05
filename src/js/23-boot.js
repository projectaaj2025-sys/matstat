/* ---- 12. Запуск: восстановление состояния и миграция ------------------- */

function spBoot() {
    progress.tests = progress.tests || [];
    progress.auto = progress.auto || {};
    spSettings();
    spExamRestore();
    if (spExam && !spExam.submitted) {
        clearInterval(spExamTimer);
        spExamTimer = setInterval(spExamTick, 1000)
    }
}
spBoot();
renderRoute();loadAdditions();
