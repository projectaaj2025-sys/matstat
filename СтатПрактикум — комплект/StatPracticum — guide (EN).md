# StatPracticum — guide

Version 3.7 · interactive course on statistics and random variables · grade 10 (plus one supplementary grade 11 topic).

This document is written in English only. The Russian guide is `Инструкция к СтатПрактикуму.md`; the Kazakh one is `СтатПрактикум — нұсқаулық (KK).md`.

## What the file is

**Live site (nothing to download):** <https://projectaaj2025-sys.github.io/matstat/> — the course opens straight in the browser.

For offline work, download the app file — **`index.html`** in the repository root — and open it in any modern browser by double-clicking it. **No internet connection is required**: the fonts, the maths renderer, the PDF viewer, all 10 source PDFs (179 pages) and the whole task bank are embedded in the file.

Results, notes and settings are stored in the browser of the device you work on, and nothing is sent anywhere automatically: there is no account and no server. A student hands the work to the teacher as a file or a code, and the teacher collects the class in the **class journal**. A different browser or device starts with empty progress.

## Course contents

- **19 topics** — 18 core grade 10 topics plus one supplementary grade 11 topic on discrete and interval frequency series.
- **580 graded sub-tasks**: 434 in the topics and 146 in the problem bank. 8 answer formats: number, single choice, multiple choice, matching, ordering, table completion, chart reading and open response.
- **75 bank problems** with full statements, source data and solutions.
- **18 interactive labs**, 13 distribution models, 6 presentations (140 slides) and 10 embedded PDFs.
- **PISA-style section**: 60 questions in 9 situations, 6 of them built on real published data from Kazakhstan and the world.

## Interface language

The switch in the top bar offers **Рус / Eng / Қаз**. Your choice is kept in the browser.

**The translation of the content was completed on 3 October 2026.** Everything students read is available in English and Kazakh:

- the whole shell, navigation, tabs, bank, progress, library, teacher panel, class journal and reflection pages — **1296 phrases in English and 1297 in Kazakh** (version 3.6 adds 139 phrases: the class journal, sending results and the review assistant; version 3.7 adds **35 more**: the teacher profile, the solution mode and auto-credit);
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
- Open answers are saved for the teacher and only count towards progress after the teacher has graded them substantively. An assistant shows the answer length, the numbers from the sample solution found in the text and the criterion words it can see, and prepares a draft comment — it never awards a mark. Complete answers can be credited automatically when the teacher profile allows it.
- “Worked solution” explains the reasoning; it is not a short answer key. In automatically checked tasks it is locked until several attempts have been made, and the teacher can open every solution with one slider.

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

## Class journal and sending results

Student results still live in the browser, but they can now be **handed to the teacher without the internet and without signing up** — as a file or a code.

**The student** opens **“My progress”** and uses the card **“Send the results to the teacher”**:

- **“Download the results file”** — a small JSON file with every answer, open response and progress figure;
- **“Show the transfer code”** / **“Copy the code”** — the same report as text for a messenger or e-mail (browsers that support compression produce a code two to three times shorter);
- **“Upload the review file”** / **“Paste the review code”** — to accept the teacher's review.

**The teacher** opens **“For teachers” → “Class journal”**:

- accepts one or several files at once, drags them onto the upload area or pastes a transfer code;
- sees each student's progress and percentage, open answers and the number of works waiting for review;
- ticks the criteria, writes a comment and accepts an answer in one click, while **“Review for the student”** downloads a review file (and copies its code) for the student to load;
- exports **“Journal to CSV”**, a **“Topic matrix”** (checked/all for every section), a **“Detailed CSV”** covering every task and a **“Printable report”** with the class table and the answers awaiting review;
- answers credited automatically are marked **“Auto-credit”**: the **“Auto-credit by rule”** button applies the same rule to one work or to the whole class at once, and the **“Auto-credit first”** sort starts with them;
- the exports carry an **“Auto-credit”** column (the number of such answers in the journal, a per-task mark in the detailed CSV), and the printable report has the same column;
- re-importing the same student's work updates the record and keeps the reviews already given; when the answer text changes, the entry is marked **“The work was updated — review it again.”**

The journal is stored in the teacher's browser (IndexedDB) and is **not** included in the downloadable course copy: that copy still carries materials only. Export a CSV or print the report before clearing browser data.

## Teacher profile: solutions, attempts and auto-credit

The **For teachers** page now carries a **Teacher profile** card above the panel. The settings apply in this browser and are not carried over with a copy of the course.

**“Show solutions under the tasks”** (slider):

- on — every worked solution and example is open under the tasks, which is handy for going through a solution with the class;
- off (default) — solutions stay hidden, and in an automatically checked task the worked solution opens **after several attempts**. A closed solution shows a counter: “The worked solution opens after several attempts: 2 / 3”.

**“Attempts before the solution opens”** (slider 1–6, three by default) — how many times a student must answer in an automatically checked task before the solution appears. In open tasks the example stays available on click: it explains how to build the reasoning.

**“Automatic checking of open answers”** (slider, on by default):

- when an open answer is saved, the check looks for **criterion words** and the **numbers from the sample solution** and compares the length of the answer with the sample;
- if every criterion and every sample number is found, the answer is **credited at once** and marked “auto-credit”;
- the other answers stay with the teacher, while the student sees how many criteria were found and which words are missing;
- automatic checking **never marks an answer wrong** — it only credits a complete answer;
- the teacher **can change** any automatic decision in the class journal, and the auto-credit mark is then removed.

How strict is the rule? Measured across all 93 open tasks: on the course's sample texts it fires in roughly **one case out of five**, on answers cut in half in 1 %, and on unrelated text never. The check compares words and numbers, not meaning, so a retelling “in one's own words” without the criterion terms will not be auto-credited, and complex reasoning is still read by a human. Auto-credit speeds up marking; it does not replace the teacher.

The student sees the result at once: **“Credited automatically (preliminary)”**, the number of criteria found, or a note that no criterion words were found. Editing the answer withdraws the auto-credit and runs the check again.

## For teachers

The **For teachers** page holds a 45-minute lesson plan per topic, source tables, the theory text, answers, the **class journal** with the works handed in by students, and the ability to add your own materials and export the course with them. Worksheets can be printed or saved as PDF through the browser print dialog.

## Limits to keep in mind

- Progress is local to one browser; the class journal is assembled from files and codes and is not a cloud grade book.
- Auto-credit is a formal signal (criterion words and sample numbers), not an assessment of meaning: it never marks an answer wrong, and the teacher can change every decision.
- Published data snapshots are dated and are not forecasts.
- The labs are teaching models: a simulation does not prove a real-world claim on its own.
