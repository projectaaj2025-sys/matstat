/* ---- 6. Хук после проверки задания ------------------------------------ */

function spAfterCheck(t) {
    if (spExamActive()) return;
    spTrainerSync();
    spHardRefresh()
}
