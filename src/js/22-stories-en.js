/* ---- 13в. Исторические сюжеты и запоминалки: English --------------------- */
const SP_STORIES_EN = {
    "probability-foundations": {year: "1654", who: "Blaise Pascal and Pierre de Fermat", title: "The letters that started probability theory", text: [
        "The Chevalier de Méré, a keen gambler, is said to have noticed something odd: the bet “at least one six in 4 rolls of a die” made money, while a similar one — “at least one double six in 24 rolls of two dice” — lost it. He also asked Blaise Pascal how to split the stakes fairly if a game had to be interrupted.",
        "In the summer of 1654 Pascal and Pierre de Fermat discussed these problems in letters and reached the same answers by different routes. The calculation explained the gambler’s observation too: 1 − (5/6)⁴ ≈ 0.518, while 1 − (35/36)²⁴ ≈ 0.491. The difference is only a couple of per cent, but in a long game it decides everything."
    ], moral: "the probability of “at least once” is easiest to find through the opposite event, “never”.", memo: [
        ["OR — add, AND — multiply", "You may add the probabilities of mutually exclusive events and multiply those of independent ones. Otherwise corrections are needed: P(A∪B) = P(A) + P(B) − P(A∩B)."],
        ["At least one? Count “none”", "P(at least one) = 1 − P(none). This is how the chevalier’s problem is solved."],
        ["Combinations are a salad, arrangements are a podium", "In a salad the order of the ingredients does not matter. On a podium it matters who is first and who is third."],
        ["∪ is a cup, ∩ is an arch", "The cup ∪ collects everything: A or B. Only what is common passes under the arch ∩: A and B."]
    ]},
    "intro-stats": {year: "1936", who: "The Literary Digest and George Gallup", title: "Ten million letters and one mistake", text: [
        "Before the US presidential election the Literary Digest magazine mailed out about 10 million ballots. The addresses came from telephone directories and lists of car owners. Roughly 2.4 million replies came back — and the magazine confidently predicted a victory for Alf Landon.",
        "George Gallup questioned dozens of times fewer people — about 50 thousand — but chose them so that they represented all voters, and named Franklin Roosevelt the winner. Roosevelt won 46 states out of 48.",
        "What went wrong? In the middle of the Great Depression telephones and cars belonged to better-off families, and far from everyone answered the letters. The enormous sample turned out to be skewed."
    ], moral: "the size of a sample does not fix a wrong way of selecting it.", memo: [
        ["Soup is tasted with a spoon — but stirred first", "A sample may be small if every object has a chance of getting into it."],
        ["Population — everyone; sample — a spoonful", "The population is all the objects we draw a conclusion about. The sample is those actually observed."],
        ["Range: from the smallest to the largest", "R = x max − x min. One subtraction shows how stretched the data are."]
    ]},
    "variation-series": {year: "1662", who: "John Graunt", title: "The haberdasher who counted London", text: [
        "John Graunt sold cloth and buttons, and in his spare time studied the “Bills of Mortality” — weekly lists of deaths in London parishes. For decades these sheets were read and thrown away.",
        "Graunt put the records into tables, ordered them by year and cause, and saw regularities: slightly more boys are born than girls, and mortality depends on age and season. In 1662 he published “Natural and Political Observations Made upon the Bills of Mortality”, estimated the population of London at about 384 thousand and was elected to the Royal Society."
    ], moral: "until data are put in order, the patterns in them stay invisible.", memo: [
        ["Line them up first — count afterwards", "Arrange the observations in ascending order: the minimum, the maximum and the repeats will show up by themselves."],
        ["Value — “what”, frequency — “how many times”", "In the table of a series the top row holds the values, the bottom row how many times each occurred."],
        ["The frequencies add up to the sample size", "A check for the table: the sum of all frequencies must equal n. Nobody is lost or counted twice."]
    ]},
    "frequency": {year: "1973", who: "University of California, Berkeley", title: "The admissions paradox", text: [
        "In the autumn of 1973 Berkeley’s graduate school admitted about 44% of the men who applied and only 35% of the women. The university was suspected of discrimination.",
        "The statisticians Peter Bickel, Eugene Hammel and William O’Connell examined the data department by department — and the picture flipped: in most departments there was no noticeable bias against women, and some admitted women more readily. Women simply applied more often to departments with fierce competition, and men to those that accepted almost everyone.",
        "Such a reversal is called Simpson’s paradox."
    ], moral: "the overall proportion and the proportions within groups can say opposite things — always check out of whom they were counted.", memo: [
        ["How many? What share? Out of whom?", "Three questions — three frequencies: absolute, relative and conditional."],
        ["Relative = part / whole", "Divide the frequency of a value by the sample size. All relative frequencies add up to 1, or 100%."],
        ["A per cent without “of what” is a fraction without a denominator", "Before comparing percentages, find the number each of them was calculated from."]
    ]},
    "central-tendency": {year: "1907", who: "Francis Galton", title: "How much does the ox weigh?", text: [
        "In 1906, at a country fair in Plymouth, England, visitors paid a small fee to guess how much an ox would weigh after slaughter and dressing. The scientist Francis Galton obtained the tickets — 787 valid answers — and put them in order.",
        "The median guess was 1,207 pounds, and the real weight 1,198 pounds: an error of less than one per cent. Each person could be far off, yet the “middlemost” opinion of the crowd nearly hit the target. In 1907 Galton reported this in the journal Nature in a note called “Vox populi” — “The voice of the people”."
    ], moral: "the centre of a large set of independent observations can be more accurate than a single observation.", memo: [
        ["Mode = Most often", "The value that occurs most frequently. There can be several modes."],
        ["Median — in the Middle", "Order the data and take the middle; with an even number of values, take half the sum of the two middle ones."],
        ["Mean — equal shares for all", "Add everything up and divide by the count: this is what each would get if all were shared equally."],
        ["An outlier? Look at the median", "The mean is dragged by rare huge values; the median resists them."]
    ]},
    "mathematical-statistics-introduction": {year: "1920s", who: "Ronald Fisher and Muriel Bristol", title: "The lady tasting tea", text: [
        "At a tea party at the Rothamsted experimental station the biologist Muriel Bristol claimed she could tell by taste what had been poured into the cup first — the tea or the milk. The statistician Ronald Fisher suggested testing it instead of arguing.",
        "Prepare 8 cups — 4 one way and 4 the other — and serve them in random order. Four cups out of eight can be chosen in C(8, 4) = 70 ways, so guessing all of them by chance succeeds in one case out of 70 — about 1.4%. According to an eyewitness, the lady identified every cup correctly.",
        "Fisher described the experiment in his book “The Design of Experiments” (1935). The idea of hypothesis testing grew out of it."
    ], moral: "to tell skill from luck, first find out how often such a result happens by chance.", memo: [
        ["Probability: model → data. Statistics: data → model", "The same coin, but the questions point in opposite directions."],
        ["Quiet Penguins Collect Pretty Daisies And Pebbles", "The stages of a study by first letters: Question, Plan, Collect, Prepare, Describe, Analyse, Present."],
        ["Sample — Statistic, Population — Parameter", "A number computed from a sample only estimates the unknown parameter of the whole population."]
    ]},
    "random-variables": {year: "1933", who: "Andrey Kolmogorov", title: "Chance gets its axioms", text: [
        "Until the 20th century probability was regarded more as an art than as rigorous mathematics: everyone explained “random” in their own way.",
        "In 1933 the thirty-year-old Moscow mathematician Andrey Kolmogorov published a short book, “Foundations of the Theory of Probability” — first in German. He built the whole structure on three axioms: a probability is non-negative; the probability of the certain event is 1; the probabilities of mutually exclusive events add up.",
        "The random variable received an exact definition: it is a function that assigns a number to every outcome of an experiment."
    ], moral: "a random variable is not a “random number” but a rule “outcome → number”.", memo: [
        ["Discrete is counted, continuous is measured", "Goals, points, mistakes — counting. Time, height, mass — measuring."],
        ["Capital X is the variable, small x is its value", "X is “the number of points on the die”; x = 3 is what came up in a particular roll."],
        ["Outcome → number", "To define a random variable, say which number corresponds to each outcome of the experiment."]
    ]},
    "distribution-law": {year: "c. 1620", who: "Galileo Galilei", title: "The puzzle of three dice", text: [
        "Dice players put a question to Galileo. The sums 9 and 10 on three dice can each be split into addends in the same number of ways — six. Why then does ten come up slightly more often?",
        "Galileo explained: the sets must be counted with order taken into account. The combination 3 + 3 + 3 arises in a single way, while 1 + 2 + 6 arises in six. Out of 216 equally likely outcomes, 27 give a sum of 10 and only 25 give a sum of 9.",
        "The difference in probabilities is less than one per cent — and experienced players managed to notice it at the gaming table."
    ], moral: "a distribution law is built from equally likely outcomes, not from cases that merely “look alike”.", memo: [
        ["One pie — and all of it is shared out", "All the probabilities in a distribution law add up to 1. If they do not, look for a mistake."],
        ["The distribution law is the variable’s passport", "It has two rows: all possible values and the probability of each."],
        ["Polygon: join the points (x; p) with segments", "Values go along the horizontal axis, probabilities along the vertical one."]
    ]},
    "math-expectation": {year: "1713–1738", who: "Nicolaus and Daniel Bernoulli", title: "A game worth any money?", text: [
        "A coin is tossed until the first head. If it comes at once you get 2 ducats, on the second toss 4, on the third 8: the prize doubles every time. How much is it worth paying to play?",
        "The expected value is 2 · ½ + 4 · ¼ + 8 · ⅛ + … = 1 + 1 + 1 + … — it is infinite! Yet nobody would give more than a few coins for such a game.",
        "The problem was invented by Nicolaus Bernoulli in 1713, and in 1738 his cousin Daniel published a solution in the proceedings of the St Petersburg Academy of Sciences — hence the name “St Petersburg paradox”. Daniel suggested that what matters to people is not the sum itself but its utility: an extra ducat pleases a rich man less than a poor one."
    ], moral: "the expected value is the main guide but not the only one: rare huge values can make it misleading.", memo: [
        ["Multiply each value by its chance — and add everything up", "E(X) = x₁p₁ + x₂p₂ + … + xₙpₙ."],
        ["The expected value is the balance point of a seesaw", "Hang the probabilities like weights on a ruler of values, and it will balance at the point E(X)."],
        ["Expected does not mean most likely", "For a die E(X) = 3.5, and there is no such face at all."]
    ]},
    "variance-std": {year: "1894", who: "Karl Pearson and Ronald Fisher", title: "Who invented sigma?", text: [
        "Astronomers of the early 19th century already knew how to measure spread: Gauss called such a measure the “mean error”. But the words we use appeared later.",
        "In 1893–1894 the English statistician Karl Pearson introduced the term “standard deviation” and denoted it by the Greek letter σ. The word “variance” in its present sense was proposed in 1918 by Ronald Fisher in a paper on heredity: the variances of independent causes simply add up, which made them more convenient to work with."
    ], moral: "variance is convenient to add, and the standard deviation is convenient to understand: it is measured in the same units as the data.", memo: [
        ["Deviate → square → average → take the root", "Four steps from the data to σ. Without the last step you get the variance."],
        ["Mean of the squares minus the square of the mean", "D(X) = E(X²) − (E(X))². Do not mix up the order: square first and then average — or the other way round."],
        ["Sigma is in the same units, variance in squared units", "Height in centimetres: σ is in centimetres, D in “square centimetres”."]
    ]},
    "binomial-distribution": {year: "1713", who: "Jacob Bernoulli", title: "The book that waited eight years", text: [
        "The Swiss mathematician Jacob Bernoulli spent about twenty years thinking over how probability and frequency are connected in a long series of identical trials. He did not manage to finish his main book, “The Art of Conjecturing”: he died in 1705.",
        "The manuscript was printed only in 1713. It contains the formula for the number of successes in n independent trials and the first proof in history of the law of large numbers. Jacob himself called it his “golden theorem”. Since then a trial with two outcomes has been called a Bernoulli trial."
    ], moral: "the binomial formula holds only if the trials are independent and the probability of success does not change.", memo: [
        ["BINS", "The conditions of the Bernoulli scheme by first letters: Binary outcomes, Independent trials, Number of trials fixed, Same probability p."],
        ["Which places × successes × failures", "P(X = k) = C(n, k) · pᵏ · qⁿ⁻ᵏ: choose the places for the successes, then multiply the chances."],
        ["E = np, D = npq", "The expected value is the number of trials times the probability of success; for the variance multiply by q = 1 − p as well."]
    ]},
    "geometric-distribution": {year: "1913", who: "The Monte Carlo casino", title: "Twenty-six blacks in a row", text: [
        "On 18 August 1913, at the Monte Carlo casino, the roulette ball kept stopping on black. After the tenth, the fifteenth time, players rushed to bet on red: “It simply has to come up now!”",
        "Black came up 26 times in a row, and the losers left millions of francs in the casino. But a roulette wheel has no memory: before every spin the chances are the same.",
        "The number of tries until the first success is described by the geometric distribution, and it has a rare property — memorylessness: however long the run of failures, the waiting starts over as if from scratch."
    ], moral: "if the trials are independent, past failures do not bring success any closer.", memo: [
        ["Geometric — waiting for the first success", "The random variable is the number of the try on which you first got lucky."],
        ["Failure, failure… success!", "P(X = k) = qᵏ⁻¹ · p: k − 1 failures in a row and one success at the end."],
        ["A 1-in-6 chance — expect about 6 tries", "E(X) = 1/p. The rarer the success, the longer the wait."],
        ["A die has no memory", "The probability of success on the next try does not depend on the length of the run of failures."]
    ]},
    "hypergeometric-distribution": {year: "1896", who: "Carl Petersen", title: "How do you count the fish in the sea?", text: [
        "The Danish biologist Carl Petersen wanted to know how many plaice lived in the Limfjord. Catching all the fish is impossible. So he caught some of them, tagged them and released them, and later looked at what share of the fish in new catches carried a tag.",
        "The reasoning is simple. Suppose 200 tagged fish were released into the fjord, and in a second catch of 100 fish 10 turned out to be tagged. Then the tagged ones make up about 10% of all the fish — so there are roughly 2,000 in total.",
        "A catch is a sample without replacement, so the number of tagged fish in it follows the hypergeometric distribution. Biologists still use the “mark and recapture” method today."
    ], moral: "when you draw from a small population without replacement, its composition changes after every step — and a different model is needed.", memo: [
        ["Hyper — no return: taken out, not put back", "The hypergeometric model describes selection from a finite population without replacement."],
        ["With replacement — binomial; without — hypergeometric", "The main question when choosing a model: does the composition change after each draw?"],
        ["The wanted from the wanted × the rest from the rest", "And all of this is divided by the number of ways to choose “all from all”: C(K, k) · C(N − K, n − k) / C(N, n)."]
    ]},
    "other-distributions": {year: "1898", who: "Ladislaus Bortkiewicz", title: "The statistics of kicking horses", text: [
        "The economist and statistician Ladislaus Bortkiewicz was born in St Petersburg and worked in Berlin. He studied grim reports: how many soldiers of the Prussian cavalry were killed each year by a horse’s kick.",
        "For 10 corps over 20 years — 200 “corps-years” — there were 122 cases, 0.61 per corps per year on average. Poisson’s formula predicted that about 109 corps-years would pass without an accident, 66 with one case and 20 with two. The reports showed 109, 65 and 22!",
        "Siméon Poisson had printed the formula back in 1837, but it was Bortkiewicz’s book “The Law of Small Numbers” that showed how accurately it describes rare events."
    ], moral: "rare independent events in a large stream obey a common law, even though each of them is unpredictable.", memo: [
        ["Poisson — rare events in a large stream", "Calls, misprints, meteors: there are many opportunities, and the probability of each is small."],
        ["Poisson has one letter for everything", "E(X) = D(X) = λ: both the expected value and the variance equal the average number of events."],
        ["Many trials, a small p — take λ = np", "This is how the binomial model is replaced by the Poisson one."]
    ]},
    "law-of-large-numbers": {year: "1940s", who: "John Kerrich", title: "Ten thousand tosses in captivity", text: [
        "The English mathematician John Kerrich found himself in Denmark in 1940 when it was occupied by German troops, and was interned. So as not to waste time, he decided to test the theory by experiment: he tossed a coin 10,000 times and carefully recorded the results.",
        "Heads came up 5,067 times — a frequency of 0.5067. After the first ten tosses it was 0.4, after a hundred 0.44, and then it pressed ever closer to 0.5.",
        "Earlier, similar experiments had been carried out by Georges Buffon (4,040 tosses, 2,048 heads) and Karl Pearson (24,000 tosses, 12,012 heads). The theorem about this behaviour of the frequency was proved by Jacob Bernoulli, and the name “law of large numbers” was coined by Siméon Poisson."
    ], moral: "the frequency approaches the probability only in a long series; a short series can show anything.", memo: [
        ["More trials — the frequency gets closer to the probability", "The law works “in the long run”: for ten tosses it promises nothing."],
        ["A coin has neither memory nor debts", "After a run of heads the probability of tails is still 0.5."],
        ["Close does not mean equal", "The law promises that the frequency approaches the probability, not that they coincide exactly."]
    ]},
    "continuous-rv": {year: "1801", who: "Carl Friedrich Gauss", title: "How a lost planet was found", text: [
        "On 1 January 1801 the Italian astronomer Giuseppe Piazzi discovered a new celestial body — Ceres. He observed it for six weeks, and then it vanished in the glare of the Sun. Where should one look for it again? The measurements were few, and each contained a small error.",
        "The twenty-four-year-old Carl Friedrich Gauss devised a way to extract the most plausible orbit from imprecise data and pointed to a place in the sky. On 31 December 1801 Ceres was found almost exactly there.",
        "In 1809 Gauss published his method and described how measurement errors are distributed: a bell-shaped density curve now called Gaussian, or normal. The curve itself had been found by Abraham de Moivre back in 1733."
    ], moral: "a continuous variable is described by a density: the higher the curve over an interval, the more often values fall into it.", memo: [
        ["Probability is area, not height", "P(a ≤ X ≤ b) is the area under the density curve over the interval [a; b]."],
        ["At a point — zero", "P(X = a) = 0, so for a continuous variable the signs < and ≤ give the same answer."],
        ["The whole area under the density equals 1", "A density is never negative, and its value may exceed 1 — it is not a probability."]
    ]},
    "cognitive-biases": {year: "1943", who: "Abraham Wald", title: "The planes that did not come back", text: [
        "During the Second World War the American military studied the bullet holes in bombers that had returned from missions. Most of the marks were on the wings and the fuselage — and that was where they proposed to add armour.",
        "The mathematician Abraham Wald of the Statistical Research Group at Columbia University objected: planes with holes in those places were precisely the ones that managed to reach the base. Hits to the engines were almost absent on the returning aircraft — because such planes did not return.",
        "Armour is needed where the planes that came back have no holes."
    ], moral: "before drawing a conclusion, ask which data never reached you. This is called survivorship bias.", memo: [
        ["If you cannot see the losers, do not trust the winners", "Survivorship bias: the sample contains only those who passed the selection."],
        ["After does not mean because of", "Two events going together or one after another are not yet cause and effect."],
        ["The rare stays rare", "When judging a test result or a “sure sign”, remember the base rate: how often the event occurs at all."]
    ]},
    "research-tasks": {year: "1854", who: "John Snow", title: "The map that stopped cholera", text: [
        "At the end of the summer of 1854 cholera broke out in the London district of Soho: hundreds of people died within a few days. The disease was believed to be spread by “bad air”.",
        "The physician John Snow thought otherwise — and collected data: he went from house to house and marked every death on a map. The marks clustered around the water pump on Broad Street. Snow checked the exceptions too: the workers of a nearby brewery drank water from their own well — and hardly fell ill.",
        "On 8 September, at his insistence, the handle was removed from the pump. Data collection, a map and the testing of other explanations laid the foundation of epidemiology."
    ], moral: "a good study is a question, carefully collected data and an honest check of other explanations.", memo: [
        ["PPDAC", "The order of work by first letters: Problem, Plan, Data, Analysis, Conclusion."],
        ["Whoever you asked — the conclusion is about them", "A result cannot be transferred to those who had no chance of getting into the sample."],
        ["Check the exceptions first", "They either break the hypothesis or become its best confirmation — like the brewery in Snow’s case."]
    ]},
    "combined-problems": {year: "1990", who: "Marilyn vos Savant", title: "Ten thousand letters about three doors", text: [
        "In September 1990 a reader asked Marilyn vos Savant, a columnist of Parade magazine, whether it pays to switch doors in the game with three doors. She answered: yes, the chance rises from 1/3 to 2/3.",
        "About 10,000 letters reached the editors, nearly a thousand of them from people with a doctorate, and most insisted she was wrong. Even the famous mathematician Paul Erdős believed the answer only after a computer simulation.",
        "School teachers across the country ran the experiment with their classes, and the frequencies confirmed the calculation. The problem is called the Monty Hall paradox — after the host of a TV game show."
    ], moral: "intuition about probability fails even professionals; a step-by-step calculation and an experiment are more reliable.", memo: [
        ["Event → model → formula → check", "Break a complex problem into simple steps and answer each one separately."],
        ["Not sure of the calculation? Check it with a simulation", "A hundred rounds in the lab will quickly show whether the answer looks right."],
        ["Two questions first: with replacement? does order matter?", "The answers determine both the model and the counting formula."]
    ]},
    "pisa-tests": {year: "1858", who: "Florence Nightingale", title: "The lady with the diagram", text: [
        "Florence Nightingale is known as the founder of modern nursing, but she was also a brilliant statistician. During the Crimean War she kept records at a British hospital and saw that far more soldiers were dying not of wounds but of preventable diseases — because of dirt and overcrowding.",
        "Ministers did not read tables. So in 1858 she drew a circular diagram made of wedges — the “rose”: the area of a wedge showed the number of deaths in a month, the colour showed the cause. The drawing worked better than the reports, and sanitary reforms began in the army.",
        "In the same year Nightingale became the first woman admitted to the Statistical Society of London."
    ], moral: "a good chart turns data into an argument — which is why you need to be able both to build charts and to read them critically.", memo: [
        ["Axes → units → values → conclusion", "The order for reading any chart or table in a contextual problem."],
        ["Check whether the axis starts at zero", "A truncated axis turns a small difference into a huge one."],
        ["The question first, the numbers second", "In a long problem statement, find what exactly is being asked, and only then pick the data you need."]
    ]},
    "advanced-variation-series": {year: "1891", who: "Karl Pearson and Herbert Sturges", title: "Who invented the histogram?", text: [
        "Bars for data were drawn as early as the 18th century, but the word “histogram” was introduced by Karl Pearson: in his lectures of 1891 he used it for a diagram in which frequencies are shown by rectangles over intervals.",
        "One question remained, familiar to anyone who has built a histogram: how many intervals should there be? In 1926 the American statistician Herbert Sturges proposed a simple rule in a short note: k = 1 + log₂ n. For 32 observations that is 6 intervals, for 1,000 about 11."
    ], moral: "Sturges’ rule is a guideline, not a law: the final number of intervals depends on the data and on what needs to be shown.", memo: [
        ["Few distinct values — count by value; many — by interval", "A discrete series suits repeating values, an interval series suits data where almost all values differ."],
        ["k ≈ 1 + log₂ n", "The same through the common logarithm: k ≈ 1 + 3.322 · lg n."],
        ["A boundary goes one way only", "Agree in advance which interval a boundary value falls into — and do not change the rule."]
    ]}
};
