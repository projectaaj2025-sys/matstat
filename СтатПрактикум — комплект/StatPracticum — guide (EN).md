# StatPracticum — guide

Version 3.5 · interactive course on statistics and random variables · grade 10 (plus one supplementary grade 11 topic).

This document is written in English only. The Russian guide is `Инструкция к СтатПрактикуму.md`; the Kazakh one is `СтатПрактикум — нұсқаулық (KK).md`.

## What the file is

`СтатПрактикум.html` is a single self-contained file, about 36 MB. Open it in any modern browser by double-clicking it. **No internet connection is required**: the fonts, the maths renderer, the PDF viewer, all 10 source PDFs (179 pages) and the whole task bank are embedded in the file.

Results, notes and settings are stored in the browser of the device you work on. Nothing is sent anywhere, there is no account and no class register. A different browser or device starts with empty progress.

## Course contents

- **19 topics** — 18 core grade 10 topics plus one supplementary grade 11 topic on discrete and interval frequency series.
- **580 graded sub-tasks**: 434 in the topics and 146 in the problem bank. 8 answer formats: number, single choice, multiple choice, matching, ordering, table completion, chart reading and open response.
- **75 bank problems** with full statements, source data and solutions.
- **18 interactive labs**, 13 distribution models, 6 presentations (140 slides) and 10 embedded PDFs.
- **PISA-style section**: 60 questions in 9 situations, 6 of them built on real published data from Kazakhstan and the world.

## Interface language

The switch in the top bar offers **Рус / Eng / Қаз**. Your choice is kept in the browser.

**The translation of the content was completed on 3 October 2026.** Everything students read is available in English and Kazakh:

- the whole shell, navigation, tabs, bank, progress, library, teacher panel and reflection pages — **966 phrases in English and 967 in Kazakh**;
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
- Open answers are saved for the teacher and only count towards progress after the teacher has graded them substantively.
- “Worked solution” explains the reasoning; it is not a short answer key.

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

## For teachers

The **For teachers** page holds a 45-minute lesson plan per topic, source tables, the theory text, answers, student results and the ability to add your own materials and export the course with them. Worksheets can be printed or saved as PDF through the browser print dialog.

## Limits to keep in mind

- Progress is local to one browser; it is not a cloud grade book.
- Published data snapshots are dated and are not forecasts.
- The labs are teaching models: a simulation does not prove a real-world claim on its own.
