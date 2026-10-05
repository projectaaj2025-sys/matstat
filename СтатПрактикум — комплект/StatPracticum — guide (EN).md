# StatPracticum — guide

Version 4.0 · interactive course on statistics and random variables · grade 10 (plus one supplementary grade 11 topic).

This document is written in English only. The Russian guide is `Инструкция к СтатПрактикуму.md`; the Kazakh one is `СтатПрактикум — нұсқаулық (KK).md`.

## What the file is

**Live site (nothing to download):** <https://projectaaj2025-sys.github.io/matstat/> — the course opens straight in the browser.

For offline work, download the app file — **`index.html`** in the repository root — and open it in any modern browser by double-clicking it. **No internet connection is required**: the fonts, the maths renderer, the PDF viewer, all 10 source PDFs (179 pages) and the whole task bank are embedded in the file.

Results, notes and settings are stored in the browser of the device you work on, and nothing is sent anywhere automatically: there is no account and no server. **Open answers are graded on the spot** against the criteria of the task; no work is handed over, and a different browser or device starts with empty progress.

## Course contents

- **19 topics** — 18 core grade 10 topics plus one supplementary grade 11 topic on discrete and interval frequency series.
- **610 graded sub-tasks**: 464 in the topics and 146 in the problem bank. 8 answer formats: number, single choice, multiple choice, matching, ordering, table completion, chart reading and open response.
- **75 bank problems** with full statements, source data and solutions.
- **18 interactive labs**, 13 distribution models, 6 presentations (140 slides) and 10 embedded PDFs.
- **PISA-style section**: 90 questions in 15 situations, 12 of them built on real published data (10 from Kazakhstan). Six new situations use published World Bank series: the urban population share (2019–2024), total population and annual growth (2016–2024) and consumer price inflation (2019–2024); and three calculation sets with five questions each — the internet in every home (2016–2024), pupils per teacher (2015–2019) and work and unemployment (2019–2024). The calculation sets are multi-step: the share is first turned into a head count (share × population or share × labour force) and only then are years compared, averages taken, or a staffing decision checked.

## Interface language

The switch in the top bar offers **Рус / Eng / Қаз**. Your choice is kept in the browser.

**The translation of the content was completed on 3 October 2026.** Everything students read is available in English and Kazakh:

- the whole shell, navigation, tabs, bank, progress, library, teacher panel, trainer, test paper, task search and lesson summaries — **1342 phrases in English and 1343 in Kazakh** (version 3.7 added 35 phrases: the teacher profile and the solution mode; version 4.0 adds **105 more**: automatic grading against the criteria, the mistake trainer, the test paper, task search and the lesson summaries; 43 lines of the old work-transfer flow were removed at the same time);
- **all 19 topics and the whole problem bank**: theory articles, task statements, hints, worked solutions, answer options, rubrics, and the captions of tables, charts and labs — **2 781 content units** and **3 295 lines per language**;
- **37 slide notes**, the ones behind the “Slide note” button next to a presentation;
- numbers inside labels are kept: “Task 7” → “TASK 7” / “7-ТАПСЫРМА”, “Source · p. 23”, “18 slides · 1.8 MB” — **119 number-aware patterns**.

A walk through every screen, both printable sheets and all ten presentations in the English version finds no Russian text left. The Kazakh version coincides with Russian only where the words really are the same: “Дисперсия”, “Медиана”, the units “тг” and “мин”, and formula-only solutions.

The screens that the page draws itself are covered as well: chart labels, laboratory tables, input fields, the teacher panel (uploading materials, notes, results, answer review) and the slide notes. Only numbers, units, formulas, task identifiers, the language names in the switch and the supplementary-module code `Д1` stay as they are.

**The printed and downloaded files follow the chosen language too.** A topic worksheet, a bank worksheet (the teacher key and the answer version included), the downloadable summary and the results CSV are built in the language selected in the switch: the downloaded page carries the matching `lang` attribute and the file name is translated (“StatPracticum — worksheet.html”, “…нәтижелер.csv”). If you switch the language while a worksheet is open, the sheet is rebuilt at once and no Russian text is left on the screen.

Numbers, units, formulas, task identifiers, the language names in the switch (“Рус”, “Қаз”) and the supplementary-module code `Д1` are deliberately left as they are. The **embedded PDFs stay in their original Russian**: their 179 pages are stored byte for byte, and the captions inside the slides are part of those PDFs.

## Working through a topic

Each topic has four tabs: **Theory**, **Practice**, **Lab** and **Slides**.

- Numerical answers accept a fraction, a decimal (comma or dot) or a percentage, and are checked against a stated tolerance.
- Open answers are checked **as soon as they are saved, on the student's own device**: nothing is handed over. The check shows the answer length, the criterion words, the numbers from the sample solution and the percentage of checkable points, and the credit threshold from the profile decides whether the answer is credited; criteria marked as judged by meaning are never auto-credited — they stay visible in the task.
- “Worked solution” explains the reasoning; it is not a short answer key. By default it is locked and opens after a **correct answer** (the task is credited), after the set number of attempts, or when the teacher opens every solution with one slider.

## Why the casino wins — a study

Inside **Independent research** there is a tab called **“Why the casino wins”**.

The model is European roulette: 37 sectors, 18 winning, a bet of 1 unit. Students are asked to **do the calculation themselves first**:

| Quantity | Result for the standard wheel |
| --- | --- |
| Win probability p | 18/37 ≈ 0.4865 |
| Loss probability q | 19/37 ≈ 0.5135 |
| Player expectation per bet | −1/37 ≈ −0.027 |
| Casino expectation per bet | +1/37 ≈ +0.027 |
| Casino edge | ≈ 2.70 % of turnover |
| Expected casino income over 1,000,000 bets | ≈ 27,027 |

Students type their own values and press **“Check my calculations”**; the worked solution appears only on request. The number of sectors, the winning sectors, the stake and the number of games can all be changed — a wheel without zero gives an expectation of exactly 0, which shows that the advantage comes from the rules, not from cheating.

Ten new graded tasks (`casino-why-01…10`) ask for the same quantities, plus one open question.

**An important precision.** The law of large numbers gives convergence *in probability*: over a long run the average result is almost certainly close to the expectation. It does **not** guarantee a profit in every finite series, and the model ignores the operator’s costs — wages, premises, taxes, licences and bonuses.

## Slides and zoom

Open any presentation from **Materials** or from a topic’s **Slides** tab. The viewer offers:

- zoom levels **Whole page, 35 %, 50 %, 65 %, 80 %, Fit width, 130 %, 160 %, 200 %**;
- **−** and **+** buttons next to the list;
- “Whole page” fits the slide inside the window by height, including on a phone;
- page arrows, the keyboard left/right keys, a text layer and a download button.

## Reflection

Two modes: the **encouragement wheel** (12 supportive prompts) and **European roulette** self-assessment with three colours — red (everything is clear), black (I have questions), zero (I understood nothing).

The class tally counts **one click as one vote**; repeated clicks add further votes. It cannot recognise individual students and does not merge votes from other devices — it is a counter inside one browser. “Reset votes” clears the three counters only; the personal note and academic progress are kept. Spinning the wheel offers a question for reflection and never casts a vote.

## Answer checking

Numeric input accepts `0,25`, `0.25`, `1/4` and `25%`. Keep the units and the scale of the question; empty input and division by zero are rejected. **514 tasks** are checked automatically: number, single choice, multiple choice, matching, ordering, table and chart reading.

**96 open answers are graded automatically** — nothing is sent to the teacher. Each open task carries **check metadata**: the criteria with their key words and the numbers from the model solution. When a student saves an answer, the check

- looks for the words of every criterion and for the numbers from the model answer;
- compares the coverage of the answer with the model solution (at least 70 % of its terms);
- shows the **percentage of checkable points met** and **what is missing** — the criteria whose words were not found and the numbers that are absent;
- **credits** the answer once the threshold share of points is met (100 % by default).

The check **never marks an answer wrong**: it shows what is missing and credits only a complete answer. The percentage is the share of checkable points, not a grade in a register.

The **credit threshold** is set in the teacher profile with a 50–100 % slider, **100 %** by default. At 80 % an answer with one or two missing points is credited. Changing the threshold re-scores every saved open answer at once.

How strict is it? Measured on the build itself across all **96 open tasks**: at the 100 % threshold the course sample texts are credited in **76 %** of tasks and at 80 % in **91 %**; answers cut to 40 % never pass at the 100 % threshold and pass in 9 % of tasks at 80 %; unrelated text never passes. The check compares words and numbers, not meaning, so criteria marked as judged by meaning are never auto-credited — they stay visible in the task for the student to read.

## Teacher profile: solutions, attempts and credit threshold

The **For teachers** page carries a **Teacher profile** card above the panel. The settings apply in this browser and are not carried over with a copy of the course.

**“Show solutions under the tasks”** (switch): on — every worked solution and example is open under the tasks; off (default) — solutions stay hidden, and the solution opens **after a correct answer or several attempts**, with a counter: “The worked solution opens after a correct answer or several attempts: 2 / 3”.

**“Attempts before the solution opens”** (slider 1–6, three by default) — how many attempts are needed while the answer is not credited yet. **A correct answer opens the solution at once**, so a student who solves the task on the first try sees the reasoning immediately; the counter stays as a hint for those who have not solved it yet. In open tasks the block is called “Example and explanation” and follows the same rule.

**“Automatic grading of open answers”** (switch, on by default): when it is on, a saved answer is checked at once; when it is off, the answer is saved without credit and the student checks it against the criteria.

**“Credit threshold”** (slider 50–100 %, **100 %** by default): the share of checkable points required for credit. Changing the threshold re-scores all saved open answers immediately.

The profile also shows how many open answers were credited, how many of them automatically, and how many tests were completed. **There is no class journal any more** — student work is never collected or transferred.

## Trainer, test paper and search

**Mistake trainer** shows **only unsolved tasks**: the whole course, a single topic, or the personal **hard tasks** map built from extra attempts and incomplete answers. Counters show what is left and what was solved in this session.

**Test paper** draws a random sample from a topic or the whole course: 3–30 tasks, a 5–90 minute timer, open answers included or excluded. Solutions, hints and checking stay **locked** during the test; when the time is up the paper is submitted automatically. The result — percentage, tasks solved and a task-by-task review — is computed automatically, and the **last column of the result table opens the solution of every task**; the result is kept in this browser, exported to CSV and listed in the test history.

**Search tasks** looks through questions, criteria, solutions and topics, with filters by **format**, **level** and **status**; a found task can be answered on the spot.

**My progress** brings it together: the progress ring, percentages by topic, the **hard tasks** card, test results and the lesson summaries.

## Lesson summaries

Every lesson and slide deck now has a **one-page summary**: key ideas, formulas, lesson flow and questions for the class. The six summaries are available in **Russian, English and Kazakh** and open in the language chosen in the switcher, in the library, in “My progress” and in the **Lesson summaries** tab of the teacher panel. Each one can be downloaded as text — this closes the gap while the slide PDFs remain Russian-only.

## For teachers

The **For teachers** page holds a 45-minute lesson plan per topic, source tables, the theory text, answers, lesson summaries, and the ability to add your own materials and export the course with them. The journal, review import and file transfer have been **removed**: the panel prepares the lesson, while students are graded automatically on their own devices. Worksheets can be printed or saved as PDF through the browser print dialog.

## Limits to keep in mind

- Progress is local to one browser; there is no server, no accounts and no transfer of student work.
- Automatic grading is a formal check (criterion words, sample numbers and coverage), not an assessment of meaning: it never marks an answer wrong, and the threshold can be lowered in the teacher profile.
- Published data snapshots are dated and are not forecasts.
- The labs are teaching models: a simulation does not prove a real-world claim on its own.
