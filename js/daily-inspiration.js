(function () {
  'use strict';

  // Rotate through the teachings by calendar day (anchored to preserve the user's place).
  const MS_PER_DAY = 24 * 60 * 60 * 1000;

  const DAILY_INSPIRATION_QUOTES = [
    {
      id: 1,
      hebrew: "אֵיזֶהוּ חָכָם? הַלּוֹמֵד מִכָּל אָדָם. אֵיזֶהוּ גִבּוֹר? הַכּוֹבֵשׁ אֶת יִצְרוֹ. אֵיזֶהוּ עָשִׁיר? הַשָּׂמֵחַ בְּחֶלְקוֹ. אֵיזֶהוּ מְכֻבָּד? הַמְכַבֵּד אֶת הַבְּרִיּוֹת",
      translation: "Who is wise? The one who learns from every person. Who is mighty? The one who subdues their own impulses. Who is rich? The one who rejoices in their portion. Who is honored? The one who honors others.",
      source: "Pirkei Avot 4:1",
      reflection: "Ben Zoma revolutionizes traditional definitions of success through four transformative questions. True wisdom isn't about accumulating knowledge, but maintaining openness to learn from everyone. Real strength (Gevurah) lies in conquering internal desires, not external foes. Wealth is found in gratitude (Hakarat Hatov) for what we have, not in endless accumulation. And honor comes from giving respect to all of God's creations (Briyot), thereby honoring the Creator. These teachings shift success from external achievements to internal character development."
    },
    {
      id: 2,
      hebrew: "כִּ֤י שֶׁ֨בַע יִפּ֣וֹל צַדִּ֣יק וָקָ֑ם",
      translation: "For a righteous person falls seven times, and rises again.",
      source: "Proverbs 24:16",
      reflection: "Attributed to King Solomon, this proverb observes that righteousness is not about perfection, but about persistence. Failure is not the opposite of success; it is part of success. A Tzaddik (righteous person) isn't someone who never fails, but someone who refuses to stay down."
    },
    {
      id: 3,
      hebrew: "חֲזַ֣ק וֶאֱמָ֔ץ אַֽל־תַּעֲרֹ֖ץ וְאַל־תֵּחָ֑ת",
      translation: "Be strong and courageous; do not be terrified or dismayed.",
      source: "Joshua 1:9",
      reflection: "Hashem spoke these words to Joshua after Moses died. This is the essence of 'Bitachon' (Trust in God). Courage doesn't mean you aren't afraid; it means you move forward despite your fear, trusting that Hashem is with you."
    },
    {
      id: 4,
      hebrew: "אל תלבין פני חבירך ברבים. כי המלבין פני חבירו דם יחשב לו דם שפך. תדע דאזיל סומקא ואתי חיורא. ואין לו חלק לעולם הבא. ונוח לו לאדם שיפיל עצמו לתוך כבשן האש ואל ילבין פני חבירו ברבים.",
      translation: "Do not shame your fellow in public. For one who shames their fellow, it is considered as if they spilled blood. You can see this as the red [blood] leaves the face and paleness arrives. It is better for a person to throw themselves into a fiery furnace than to shame their fellow in public.",
      source: "Sefer HaYirah (232)",
      reflection: "This teaching from Rabbi Yonah of Gerona emphasizes the infinite dignity of every human being. Shaming someone is compared to murder because it causes a visible physical change—the blood draining from the face—and a devastating spiritual blow to the victim's soul. It serves as a stark reminder that our words carry the weight of life and death; preserving another's dignity is among the highest ethical callings."
    },
    {
      id: 5,
      hebrew: "נֵ֣ר יְ֭הוָה נִשְׁמַ֣ת אָדָ֑ם",
      translation: "The soul of man is the candle of God.",
      source: "Proverbs 20:27",
      reflection: "King Solomon uses the metaphor of light. Just as a candle's purpose is to illuminate, your Neshama (soul) is a divine spark. Your purpose is to let that light shine, illuminating the darkness in your own unique way through Mitzvot and kindness."
    },
    {
      id: 6,
      hebrew: "רַחֲמָנָא לִבָּא בָּעֵי",
      translation: "The Compassionate One desires the heart.",
      source: "Sanhedrin 106b / Zohar",
      reflection: "This concept from the Sages and Jewish Mysticism emphasizes that Hashem looks past external rituals to the internal intent (Kavanah). It's not just about your actions on the outside, but your intention on the inside; sincerity and passion matter more than robotic perfection."
    },
    {
      id: 7,
      hebrew: "וְהַצְנֵ֥עַ לֶ֖כֶת עִם־אֱלֹהֶֽיךָ",
      translation: "Walk humbly with your God.",
      source: "Micah 6:8",
      reflection: "The Prophet Micah summed up the entire Torah into three requirements: Justice, Kindness, and Humility. True greatness is quiet; you don't need to broadcast your virtues, as living them with modesty (Tzniut) and integrity is enough."
    },
    {
      id: 8,
      hebrew: "בְּצֶ֥לֶם אֱלֹהִ֖ים בָּרָ֣א אֹת֑וֹ",
      translation: "In the image of God He created him.",
      source: "Genesis 1:27",
      reflection: "This fundamental definition of humanity from the Creation narrative establishes our inherent worth. Never forget your infinite value; you are a reflection of the Divine (Tzelem Elokim), as is every person you meet."
    },
    {
      id: 9,
      hebrew: "וְאָהַבְתָּ֥ לְרֵעֲךָ֖ כָּמ֑וֹךָ",
      translation: "Love your fellow (Israelites) as yourself.",
      source: "Leviticus 19:18",
      reflection: "Rabbi Akiva called this the 'Great Principle of the Torah.' It teaches that we are all connected souls, and treating others with love is the ultimate expression of our humanity."
    },
    {
      id: 10,
      hebrew: "מָ֣וֶת וְ֭חַיִּים בְּיַד־לָשׁ֑וֹן",
      translation: "Death and life are in the power of the tongue.",
      source: "Proverbs 18:21",
      reflection: "The laws of Lashon Hara (evil speech) are based on this reality. Your words create worlds; you have the power to build someone up or tear them down in a single sentence. Choose to speak life."
    },
    {
      id: 11,
      hebrew: "סוּר מֵרָע וַעֲשֵׂה טוֹב, בַּקֵּשׁ שָׁלוֹם וְרָדְפֵהוּ—בַּקְּשֵׁהוּ בִּמְקוֹמְךָ וְרָדְפֵהוּ בְּמָקוֹם אַחֵר",
      translation: "Turn from evil and do good; seek peace and pursue it—seek it in your own heart, and chase it into the hearts of others.",
      source: "Psalm 34:15 / Midrash Tehillim",
      reflection: "The Hebrew word for Peace, 'Shalom,' comes from the root 'Shalem,' which means 'Wholeness.' This reveals a clever truth: peace is not the absence of conflict, but the presence of completion. King David commands us to 'pursue' it because wholeness is elusive. The Sages teach that God found no vessel capable of holding all other blessings except Peace; if you lack peace, your other blessings leak away."
    },
    {
      id: 12,
      hebrew: "יְהִי בֵיתְךָ פָתוּחַ לִרְוָחָה לְאַרְבַּע רוּחוֹת הָעוֹלָם, וְיִהְיוּ עֲנִיִּים בְּנֵי בֵיתֶךָ",
      translation: "Let your house be open wide to the four winds of the world, and let the vulnerable be the very children of your home.",
      source: "Pirkei Avot 1:5 / Avot D'Rabbi Natan",
      reflection: "In Hebrew, the word for 'wide' (Revacha) also implies 'relief' or 'breathing room.' When you open your doors, you aren't just giving a stranger a seat; you are giving your own soul room to breathe. A closed house is a prison of the self. By making your home a sanctuary for those who have nothing, you transform a physical building into a living extension of Abraham’s tent, where hospitality to man attracts the presence of the Divine."
    },
    {
      id: 13,
      hebrew: "הֱוֵי דָן אֶת כָּל הָאָדָם לְכַף זְכוּת—אַל תָּדִין אֶת חֲבֵרְךָ עַד שֶׁתַּגִּיעַ לִמְקוֹמוֹ",
      translation: "Judge the 'whole' of every person by tipping the scale toward merit—never judging a person until you have stood in their very spot.",
      source: "Pirkei Avot 1:6 / 2:4",
      reflection: "The phrase 'Kol HaAdam' literally means 'The Whole of the person.' Most judge based on a single snapshot of a mistake, but the Sages tell us to look at the 'Whole'—the context and the hidden potential. There is a cosmic mirroring here: the way you judge below determines how the Heavenly Court judges you above. By cleverly finding a 'Zechut' (merit) in a person, you are building a spiritual defense for your own soul."
    },
    {
      id: 14,
      hebrew: "וּקְנֵה לְךָ חָבֵר—אַל תִּקְרָא 'וּקְנֵה' אֶלָּא 'וּקְנֵה' כְּקָנֶה, שֶׁיְּהֵא לִבְּךָ רַךְ כַּקָּנֶה",
      translation: "Acquire for yourself a friend—read it not just as 'purchase' but as 'reed,' for your heart must be as flexible and soft as a reed to sustain a friendship.",
      source: "Pirkei Avot 1:6 / Kallah Rabbati",
      reflection: "The word 'Acquire' (K’neh) is a play on 'Kaneh' (a reed). A true friend is 'acquired' through a high price—the currency of vulnerability—but the bond must be like a reed: able to bend in the storm without breaking. The Talmud warns, 'Either friendship or death' (O Chavruta O Mituta), because a life without a mirror to challenge and love you is a life that has stopped growing."
    },
    {
      id: 15,
      hebrew: "כַּ֭מַּיִם הַפָּנִ֣ים לַפָּנִ֑ים כֵּ֤ן לֵֽב־הָ֝אָדָ֗ם לָאָדָֽם",
      translation: "As water reflects the face, so one heart reflects another.",
      source: "Proverbs 27:19",
      reflection: "King Solomon observed this psychological mirroring in relationships. The energy you put out is the energy you get back—show love, and you will find it reflected in the hearts of others."
    },
    {
      id: 16,
      hebrew: "הִנֵּ֣ה מַה־טּ֭וֹב וּמַה־נָּעִ֑ים שֶׁ֖בֶת אַחִ֣ים גַּם־יָֽחַד",
      translation: "Behold, how good and how pleasant it is for brothers to dwell together in unity.",
      source: "Psalm 133:1",
      reflection: "This Song of Ascents celebrates the rare moments when all tribes stood together. There is a unique spiritual power when people set aside their differences and live in harmony; unity is a vessel for blessing."
    },
    {
      id: 17,
      hebrew: "שַׁלַּ֥ח לַחְמְךָ֖ עַל־פְּנֵ֣י הַמָּ֑יִם",
      translation: "Cast your bread upon the waters.",
      source: "Ecclesiastes 11:1",
      reflection: "King Solomon suggests taking risks in generosity (Tzedakah), even when the return isn't immediately visible. Do good without expecting an immediate reward; kindness has a ripple effect, and eventually, the good you put into the world will return to you."
    },
    {
      id: 18,
      hebrew: "כָּל יִשְׂרָאֵל עֲרֵבִים זֶה בָּזֶה",
      translation: "All of Israel are responsible for one another.",
      source: "Talmud Shavuot 39a",
      reflection: "The Sages discussed communal liability using the word 'arevim' (guarantors). We are not isolated individuals; we are part of a greater whole. When one person falls, we all feel it, and when one rises, we all rise."
    },
    {
      id: 19,
      hebrew: "אִם אֵין אֲנִי לִי, מִי לִי? וּכְשֶׁאֲנִי לְעַצְמִי, מָה אֲנִי? וְאִם לֹא עַכְשָׁיו, אֵימָתַי?",
      translation: "If I am not for myself, who will be for me? And if I am only for myself, what am I? And if not now, when?",
      source: "Pirkei Avot 1:14",
      reflection: "Hillel the Elder's famous trio of questions creates a perfect balance in ethical living. First, you must take personal responsibility for your own life and well-being—no one else can do your work for you. Second, self-care without care for others leads to an empty existence; a meaningful life is one lived in service to others. Finally, stop waiting for the 'perfect time'—the only moment you truly have to make a change is this one. These three questions encapsulate the tension between self and other, and between present action and future procrastination."
    },
    {
      id: 20,
      hebrew: "לֹא עָלֶיךָ הַמְּלָאכָה לִגְמֹר, וְלֹא אַתָּה בֶן חוֹרִין לִבָּטֵל מִמֶּנָּה",
      translation: "It is not your duty to finish the work, but neither are you free to neglect it.",
      source: "Pirkei Avot 2:16",
      reflection: "The Hebrew word `libatel` (to neglect) also means to nullify oneself. In an age of overwhelming problems, we're tempted to think our small efforts are pointless. Rabbi Tarfon teaches that inaction isn't just laziness; it's an erasure of your unique purpose in the cosmic blueprint. You are not commanded to complete the world's repair, but you are forbidden from nullifying the specific role only you can play."
    },
    {
      id: 21,
      hebrew: "לְפוּם צַעֲרָא אַגְרָא",
      translation: "According to the effort is the reward.",
      source: "Pirkei Avot 5:23",
      reflection: "The Aramaic word `Tza'ara` implies not just effort, but the painful struggle. In a world obsessed with shortcuts, this teaches that the process, not the product, is where the real value lies. The reward isn't just the destination, but the spiritual muscles you build during the climb. You aren't just achieving a goal; you are refining the architecture of the soul."
    },
    {
      id: 22,
      hebrew: "הַפֶּה הוּא קוֹלְמוֹס הַלֵּב, אֲבָל הַנְּגִינָה הִיא קוֹלְמוֹס הַנֶּפֶשׁ.",
      translation: "The mouth is the pen of the heart, but song is the pen of the soul.",
      source: "The Baal Shem Tov",
      reflection: "The Hebrew `kolmos` (pen) is used for both heart and soul, but they write in different inks. We often get stuck trying to solve deep human dilemmas with the logical 'pen of the heart.' The Baal Shem Tov teaches that some truths can only be accessed with the 'pen of the soul'—song (`niggun`). When words fail to bridge a gap, you aren't failing; you are simply being called to use a higher form of communication."
    },
    {
      id: 23,
      hebrew: "לְעוֹלָם יִחְיֶה אָדָם בְּתוֹךְ אֶמְצָעָיו, אֲבָל יְכַבֵּד אֶת אִשְׁתּוֹ יוֹתֵר מִמָּה שֶׁיֵּשׁ לוֹ.",
      translation: "A person should live within their means, but honor their spouse above their means.",
      source: "Talmud, Chullin 84b",
      reflection: "The Hebrew places a sharp contrast between living 'within your means' and honoring your spouse 'more than you have.' In a world that tells us to budget everything, the Talmud makes a radical exception for dignity in relationships. This isn't financial advice; it's soul advice. By treating your partner with a generosity that transcends calculation, you are not being irresponsible; you are creating an emotional abundance that no budget can buy."
    },
    {
      id: 24,
      hebrew: "מִצְוָה הַבָּאָה לְיָדְךָ, אַל תַּחְמִיצֶנָּה.",
      translation: "When a good deed comes to your hand, do not let it become 'leavened'—do not let it sour.",
      source: "Mekhilta d'Rabbi Ishmael / Rashi",
      reflection: "The Hebrew `al tachmitzenah` ('do not let it sour') is a brilliant pun on `chametz`, or leavened bread. Just as matzah becomes forbidden if delayed, a good intention 'sours' with the yeast of procrastination. This isn't just a call to act; it's a command to capture the divine energy of a generous impulse before it becomes a heavy burden of regret."
    },
    {
      id: 25,
      hebrew: "אֵין הַקָּדוֹשׁ בָּרוּךְ הוּא בָּא בִּטְרוּנְיָא עִם בְּרִיּוֹתָיו.",
      translation: "The Holy One does not act as a tyrant over His creations.",
      source: "Talmud, Avodah Zarah 3a",
      reflection: "The word used here, `b'trunya`, comes from the Greek for tyranny, implying a demand that cannot be met. We often view life's hardest challenges as an unfair cosmic burden. This Talmudic principle reframes our struggles entirely: God is not a tyrant. The very presence of a difficult test in your life is divine proof that you possess the precise, hidden strengths required to overcome it."
    },
    {
      id: 26,
      hebrew: "לֹא מָצָאנוּ דָּבָר שֶׁיַּעֲמֹד בִּפְנֵי הָרָצוֹן.",
      translation: "Nothing can stand in the face of the human will.",
      source: "Zohar / Jewish Maxim",
      reflection: "The Hebrew word for will, `Ratzon`, shares a root with the word 'to run,' suggesting it's not a passive wish but a dynamic, forward-moving force. In a world where we often feel stuck, this teaches that when our desire is unified and total, it creates its own reality. A focused will transforms you into a force of nature that obstacles cannot withstand."
    },
    {
      id: 27,
      hebrew: "הַכֹּל צָרִיךְ לְמַזָּל, אֲפִילוּ סֵפֶר תּוֹרָה שֶׁבַּהֵיכָל.",
      translation: "Everything requires 'Mazal'—even the Torah scroll in the holy ark.",
      source: "Zohar, Vayikra 16a",
      reflection: "The Hebrew `Mazal` is often mistranslated as 'luck,' but it literally means 'a flow from above.' Even the holiest object, the Torah, needs the right `mazal` to be taken from the ark and read. This teaching transforms the command to 'work hard' into an opportunity to partner with a divine flow you do not control, turning exhausting hustle into humble partnership."
    },
    {
      id: 28,
      hebrew: "אִם אֵין בִּינָה, אֵין דַּעַת. אִם אֵין דַּעַת, אֵין בִּינָה.",
      translation: "If there is no understanding (Binah), there is no knowledge (Da'at); if there is no knowledge, there is no understanding.",
      source: "Pirkei Avot 3:17",
      reflection: "The Hebrew word `Da'at` means raw data, while `Binah` means the insight to connect that data into a meaningful structure. In an age of information overload, we are drowning in `Da'at` but starved for `Binah`. This teaching reframes the goal of learning: it is not to accumulate facts, but to build a coherent inner world. By seeking to understand the connections between the data points, you transform information into wisdom."
    },
    {
      id: 29,
      hebrew: "הַמְּרַחֵם עַל הָאַכְזָרִים, סוֹפוֹ שֶׁיִּתְאַכְזֵר עַל הָרַחְמָנִים.",
      translation: "One who is merciful to the cruel will eventually become cruel to the merciful.",
      source: "Midrash Tanchuma",
      reflection: "The Hebrew `merachem` (merciful) is juxtaposed with `achzar` (cruel), creating a stark choice. In our desire to be 'nice,' we can enable destructive behavior, which the Midrash warns is itself a form of cruelty to the virtuous. True compassion (`Rachamim`) requires the wisdom and strength (`Gevurah`) to set boundaries that protect the innocent from the toxic."
    },
    {
      id: 30,
      hebrew: "לֹא יָגַעְתָּ וּמָצָאתָ—אַל תַּאֲמִין.",
      translation: "If someone says, 'I did not toil but I found success'—do not believe them.",
      source: "Talmud, Megillah 6b",
      reflection: "The Hebrew contrasts `yaga'ta` (toiling) with `matzata` (finding). Our culture celebrates 'overnight success,' which the Talmud calls a lie. Lasting achievement is not 'found' like a lucky object; it is forged in the sweat of `yegiah` (toil). This reframes effort not as a burden, but as the only authentic path to creating value that you can truly call your own."
    },
    {
      id: 31,
      hebrew: "כָּל זְמַן שֶׁהַנֵּר דּוֹלֵק, אֶפְשָׁר עוֹד לְתַקֵּן.",
      translation: "As long as the candle is still burning, it is still possible to repair.",
      source: "Rabbi Yisrael Salanter",
      reflection: "The Hebrew `ner` (candle) is a metaphor for the soul's life force. The modern struggle is the feeling of being 'too far gone' to fix our mistakes. This teaching is a powerful rebuke to despair. As long as the candle of life burns, the potential for `tikkun` (repair) is not just possible, but required. Failure is not a state, but an event that can be overturned by your next right choice."
    },
    {
      id: 32,
      hebrew: "הָאֱמֶת כְּבֵדָה, לְפִיכָךְ נוֹשְׂאֶיהָ מועטים.",
      translation: "Truth is heavy, and therefore its carriers are few.",
      source: "Midrash",
      reflection: "The Hebrew word for truth, `Emet` (אמת), is composed of the first, middle, and last letters of the alphabet, symbolizing its solid, all-encompassing nature. This is why it's 'heavy.' In a world that prefers light, convenient narratives, carrying the weight of truth builds the spiritual 'muscles' of the soul. This transforms the burden of honesty into an empowering act of character-building."
    },
    {
      id: 33,
      hebrew: "חֲנֹךְ לַנַּעַר עַל־פִּי דַרְכּוֹ.",
      translation: "Educate a person according to their own unique way.",
      source: "Proverbs 22:6",
      reflection: "The Hebrew `al-pi darko` means 'according to *his* way,' not a generic way. The dilemma in modern education is forcing a one-size-fits-all model onto unique individuals. This verse reframes a mentor's role from being a sculptor who imposes a form, to being a polisher who reveals the inherent, unique beauty of the gem that is already there."
    },
    {
      id: 34,
      hebrew: "אֵין חָכָם כְּבַעַל נִסָּיוֹן.",
      translation: "There is no wise person like one with experience.",
      source: "Jewish Proverb / Midrash",
      reflection: "The Hebrew word for experience, `nissayon` (נסיון), is the same as the word for a 'test.' We often see trials as painful interruptions to our lives. This proverb reframes them as the curriculum of wisdom. Book knowledge is theory, but a `nissayon` is the final exam that integrates that knowledge into your very being. Your scars are not signs of damage, but the credentials of a soul that has been truly educated."
    },
    {
      id: 35,
      hebrew: "מִי שֶׁטָּרַח בְּעֶרֶב שַׁבָּת, יֹאכַל בְּשַׁבָּת.",
      translation: "He who toils on the eve of the Sabbath will eat on the Sabbath.",
      source: "Talmud, Avodah Zarah 3a",
      reflection: "This quote hinges on the relationship between `Erev Shabbat` (preparation) and `Shabbat` (rest). We often want the peace of Shabbat without the work of Friday. This teaching reframes the entire week: your experience of 'rest' is not a gift, but a direct result of the quality of your 'toil.' By investing effort during the week, you are not just working; you are actively creating the peace you will soon inhabit."
    },
    {
      id: 36,
      hebrew: "גָּדוֹל הַמְעַשֶּׂה יוֹתֵר מִן הָעוֹשֶׂה.",
      translation: "Greater is the one who enables others to act than the one who acts alone.",
      source: "Talmud, Bava Batra 9a",
      reflection: "The Hebrew pivots on the distinction between `oseh` (the one who does) and `me'aseh` (the one who *causes* to do). Our culture celebrates the individual hero. The Talmud reframes greatness as influence and empowerment. Performing one good deed is commendable, but creating an environment where a hundred good deeds can flourish is the true definition of leadership."
    },
    {
      id: 37,
      hebrew: "אֵין שִׂמְחָה כְּהַתָּרַת הַסְּפֵקוֹת.",
      translation: "There is no joy like the resolution of doubt.",
      source: "Metzudat David / Rabbi Nachman of Breslov",
      reflection: "The Hebrew `hatarat ha'sfekot` means the 'untying of the knots of doubt.' We often think joy (`simcha`) comes from getting what we want. Rabbi Nachman teaches that the deepest joy comes from clarity. Doubt (`safek`) is a spiritual friction that drains our energy; resolving it is like untying a knot in the soul, releasing a flow of focused, joyful power."
    },
    {
      id: 38,
      hebrew: "הַלֵּב וְהָעֵינַיִם הֵם שְׁנֵי סַרְסוּרֵי הַחֵטְא.",
      translation: "The heart and the eyes are the two 'agents' of missing the mark.",
      source: "Rashi / Midrash",
      reflection: "The Hebrew `sarsurim` means 'brokers' or 'agents.' The eye and heart are the two agents that bring a sinful 'deal' to the body to sign. This brilliant psychological model reframes the battle for self-control. Instead of fighting the final action, the wise person 'fires the brokers.' By guarding your eyes from temptation and training your heart to value holiness, you prevent the illicit deal from ever reaching your desk."
    },
    {
      id: 39,
      hebrew: "כָּל מַה דְּעָבִיד רַחֲמָנָא, לְטָב עָבִיד.",
      translation: "Whatever the Compassionate One does, He does for the good.",
      source: "Rabbi Akiva (Talmud, Berakhot 60b)",
      reflection: "The key here is the Aramaic phrase `l'tav avid`, 'He does for the good.' This is not a naive claim that everything *is* good, but a radical statement of faith that everything is *for* the good. It reframes tragedy not as divine punishment, but as a hidden, purposeful ingredient in a larger recipe. This mantra doesn't deny pain; it transforms it into an opportunity for growth and trust."
    },
    {
      id: 40,
      hebrew: "הֱוֵי מְקַבֵּל אֶת כָּל הָאָדָם בְּסֵבֶר פָּנִים יָפוֹת.",
      translation: "Receive every person with a pleasant and radiant face.",
      source: "Pirkei Avot 1:15",
      reflection: "The Hebrew `sever panim yafot` means more than 'pleasant'; it implies a 'radiant countenance.' Shammai teaches that your face is not private property; it affects the emotional climate for everyone you meet. In a world of digital isolation, this reframes a simple smile from a social nicety into a profound act of charity (`tzedakah`). You are not just being friendly; you are actively radiating light into another person's world."
    },
    {
      id: 41,
      hebrew: "אֵין אָדָם עוֹבֵר עֲבֵרָה אֶלָּא אִם כֵּן נִכְנַס בּוֹ רוּחַ שְׁטוּת.",
      translation: "A person does not miss the mark unless a spirit of 'folly' enters them.",
      source: "Talmud, Sotah 3a",
      reflection: "The Talmud offers a profoundly compassionate view of human failing through the concept of 'ruach shtut' (a spirit of folly). It teaches that your core, essential self is fundamentally good and desires to do what is right. When we miss the mark, it is not because we are inherently bad, but because a temporary state of confusion or spiritual disconnect has clouded our judgment. This insight allows us to separate our true identity from our mistakes, making it easier to repent, correct course, and return to who we really are."
    },
    {
      id: 42,
      hebrew: "טוֹב פַּת חֲרֵבָה וְשַׁלְוָה־בָהּ, מִבַּיִת מָלֵא זִבְחֵי־רִיב.",
      translation: "Better a dry crust with peace than a house full of feasting with strife.",
      source: "Proverbs 17:1",
      reflection: "King Solomon challenges our definition of wealth by contrasting a meager meal eaten in peace with a luxurious feast consumed in bitterness. We often sacrifice the tranquility of our homes to pursue material abundance, only to find that tension ruins the enjoyment of our success. True prosperity is measured by the emotional climate of our environment, not the contents of our table. This proverb urges us to prioritize harmony over accumulation."
    },
    {
      id: 43,
      hebrew: "בְּכָל־עֶצֶב יִהְיֶה מוֹתָר, וּדְבַר־שְׂפָתַיִם אַךְ־לְמַחְסוֹר.",
      translation: "In all toil there is profit, but mere talk leads only to lack.",
      source: "Proverbs 14:23",
      reflection: "We often mistake talking about a goal for actual progress. This proverb warns that while deliberate effort ('toil') builds real value, endless discussion ('mere talk') only depletes our time and resources. In an age dominated by meetings and social media, this is a timeless reminder that authentic creation requires rolling up our sleeves. Success is found in quiet execution, not loud declarations."
    },
    {
      id: 44,
      hebrew: "הֱוֵי זָנָב לָאֲרָיוֹת, וְאַל תְּהִי רֹאשׁ לַשּׁוּעָלִים.",
      translation: "Be a tail to lions rather than a head to foxes.",
      source: "Pirkei Avot 4:15",
      reflection: "Human ego naturally desires status, tempting us to be a 'big fish in a small pond'—the leader among those who demand little of us. However, true spiritual and intellectual growth requires humility. By choosing to be the least accomplished person in a room of 'lions' (people of great wisdom and integrity), their greatness will inevitably pull you upward. This teaching reminds us to value the quality of our company over the stroke of our ego."
    },
    {
      id: 45,
      hebrew: "חָכְמַת סוֹפְרִים תִּסְרַח... וִירֵאֵי חֵטְא יִמָּאֲסוּ.",
      translation: "The wisdom of the scholars will decay... and those who fear missing the mark will be loathed.",
      source: "Mishnah, Sotah 9:15",
      reflection: "This Mishnah describes the spiritual climate preceding the Messianic era, a time when intellect becomes divorced from morality. When society values cleverness over character, the 'wisdom of scholars' loses its moral fragrance and decays. In such a generation, choosing integrity and holding fast to ethical standards will make one unpopular, even despised. It teaches that true faithfulness requires the courage to maintain your moral compass, even when the rest of the world has lost its way."
    },
    {
      id: 46,
      hebrew: "כָּל כְּנֵסִיָּה שֶׁהִיא לְשֵׁם שָׁמַיִם, סוֹפָהּ לְהִתְקַיֵּם.",
      translation: "Every assembly that is for the sake of Heaven is destined to endure.",
      source: "Pirkei Avot 4:11",
      reflection: "The ultimate test of any community, project, or relationship is its underlying motive. When people unite driven by ego, wealth, or power, their alliance will collapse the moment those self-serving needs clash. However, when an assembly is gathered 'for the sake of Heaven'—dedicated to a higher, selfless purpose—it taps into the eternal. To build something that lasts, build it on the foundation of shared, transcendent values."
    },
    {
      id: 47,
      hebrew: "כָּל הַמְקַיֵּם נֶפֶשׁ אַחַת, כְּאִלּוּ קִיֵּם עוֹלָם מָלֵא",
      translation: "Whoever saves one life, it is as if he saved an entire world.",
      source: "Mishnah Sanhedrin 4:5",
      reflection: "Judaism does not view humanity merely as a collective mass, but sees an entire, infinitely complex universe within each individual. When you save, uplift, or transform a single person, you are also saving all the future generations that will stem from them, along with their unique contributions to history. This principle radically elevates the importance of every single interaction we have."
    },
    {
      id: 48,
      hebrew: "וְכִתְּת֨וּ חַרְבוֹתָ֜ם לְאִתִּ֗ים",
      translation: "They shall beat their swords into plowshares.",
      source: "Isaiah 2:4",
      reflection: "Isaiah’s messianic vision is not just about the cessation of violence, but the radical transformation of destructive energy into productive power. The same iron used to forge a sword of death can be hammered into a plowshare of life. This teaches us that true peace requires redirecting the immense resources, intellect, and passion currently wasted on conflict toward the cultivation of human flourishing and growth."
    },
    {
      id: 49,
      hebrew: "עַל שְׁלֹשָׁה דְבָרִים הָעוֹלָם עוֹמֵד: עַל הַתּוֹרָה וְעַל הַעֲבוֹדָה וְעַל גְּמִילוּת חֲסָדִים",
      translation: "The world stands on three things: On Torah, on Service, and on Acts of Lovingkindness.",
      source: "Pirkei Avot 1:2",
      reflection: "Shimon HaTzaddik outlines the three fundamental pillars required to sustain human civilization and spiritual life. 'Torah' represents the pursuit of divine truth and wisdom; 'Avodah' (service/prayer) represents the inner work of cultivating a relationship with the Creator; and 'Gemilut Chasadim' (lovingkindness) represents our outward responsibility to our fellow human beings. A meaningful life requires a healthy balance of all three: intellectual growth, spiritual depth, and compassionate action."
    },
    {
      id: 50,
      hebrew: "וְיִגַּ֥ל כַּמַּ֖יִם מִשְׁפָּ֑ט",
      translation: "Let justice roll down like waters.",
      source: "Amos 5:24",
      reflection: "The Prophet Amos forcefully rejects a society that performs religious rituals while ignoring the oppression of the vulnerable. He demands that justice must not be a stagnant puddle or a mere trickle of charity. It must flow like a mighty, unyielding river—cleansing society of corruption and nourishing the lives of those who have been marginalized. True righteousness requires active, systemic fairness, not just individual piety."
    },
    {
      id: 51,
      hebrew: "וְאָהַבְתֶּ֖ם אֶת־הַגֵּ֑ר כִּי־גֵרִ֥ים הֱיִיתֶ֖ם",
      translation: "You shall love the stranger, for you were strangers.",
      source: "Deuteronomy 10:19",
      reflection: "The Torah repeats the command to protect and love the stranger more than almost any other law. It demands that we leverage our collective historical trauma—the memory of being oppressed outsiders in Egypt—not as an excuse for bitterness, but as a catalyst for radical empathy. Having experienced the pain of marginalization, we are spiritually obligated to create a society where no one else is made to feel alienated or vulnerable."
    },
    {
      id: 52,
      hebrew: "לֹא בְחַיִל וְלֹא בְכֹחַ כִּי אִם בְּרוּחִי",
      translation: "Not by might, nor by power, but by My Spirit.",
      source: "Zechariah 4:6",
      reflection: "In a world that constantly measures success by military strength, political power, or sheer force, the Prophet Zechariah offers a profound counter-narrative. The ultimate, enduring victories in history are not won through physical domination, but through the quiet, unyielding power of the Divine Spirit. True strength is found in moral clarity, faith, and the patient building of institutions grounded in truth rather than brute force."
    },
    {
      id: 53,
      hebrew: "עֹז־וְהָדָ֥ר לְבוּשָׁ֑הּ וַ֝תִּשְׂחַ֗ק לְי֣וֹם אַחֲרֽוֹן",
      translation: "Strength and dignity are her clothing, and she laughs at the future.",
      source: "Proverbs 31:25",
      reflection: "While this verse praises the Eshet Chayil (Woman of Valor), it offers a universal psychological insight. Anxiety about the future often stems from a feeling of internal unpreparedness. However, when a person 'clothes' their soul in the sturdy garments of moral integrity, resilience, and self-respect, the dread of the unknown vanishes. Confidence in your inner character allows you to face whatever tomorrow brings with a sense of joy and optimism."
    },
    {
      id: 54,
      hebrew: "לַכֹּ֖ל זְמָ֑ן וְעֵ֥ת לְכׇל־חֵ֖פֶץ",
      translation: "To everything there is a season, and a time to every purpose.",
      source: "Ecclesiastes 3:1",
      reflection: "King Solomon's meditation on time teaches us the profound wisdom of spiritual surrender. Every phase of life—both the joyous and the agonizing—has a divinely ordained purpose and a natural expiration date. By recognizing that we are moving through temporary 'seasons,' we can avoid despair during times of hardship and avoid arrogance during times of success. Wisdom lies in accepting the present moment rather than fighting the current of time."
    },
    {
      id: 55,
      hebrew: "עַל הַדִּין וְעַל הָאֱמֶת וְעַל הַשָּׁלוֹם",
      translation: "...on Justice, on Truth, and on Peace.",
      source: "Pirkei Avot 1:18",
      reflection: "Rabban Shimon ben Gamliel outlines the practical blueprint for a functional society. Truth, Justice, and Peace are deeply intertwined. Without Truth, Justice is impossible to administer. Without Justice, any Peace is merely an illusion that masks underlying oppression. To sustain a healthy community or nation, we cannot compromise on honesty or fairness simply to avoid conflict; authentic peace is the natural byproduct of a just and truthful society."
    },
    {
      id: 56,
      hebrew: "שְׁמַ֖ע יִשְׂרָאֵ֑ל יְהוָ֥ה אֱלֹהֵ֖ינוּ יְהוָ֥ה ׀ אֶחָֽד",
      translation: "Hear O Israel, Hashem is our God, Hashem is One.",
      source: "Deuteronomy 6:4",
      reflection: "The Shema is the defining declaration of the Jewish faith, but it is far more than a statement of monotheism. It is a radical assertion that despite the chaotic, fragmented, and often contradictory appearance of the physical world, there is a singular, unified Divine reality beneath it all. Declaring 'God is One' means recognizing that every experience, every law of nature, and every human soul emanates from the exact same Infinite Source."
    },
    {
      id: 57,
      hebrew: "הַיּוֹם קָצֵר, וְהַמְּלָאכָה מְרֻבָּה, וְהַפּוֹעֲלִים עֲצֵלִים, וְהַשָּׂכָר הַרְבֵּה, וּבַעַל הַבַּיִת דּוֹחֵק",
      translation: "The day is short, the work is vast, the workers are lazy, the reward is great, and the Master of the house is pressing.",
      source: "Pirkei Avot 2:15",
      reflection: "Rabbi Tarfon paints a striking picture of the human condition. 'The day' is our fleeting lifespan; 'the work' is our potential for spiritual and ethical growth. Recognizing that time is short and our natural tendency is inertia ('lazy workers'), we must awaken to the urgency of our purpose. The 'Master' doesn't press us to stress us out, but to remind us how much our contribution matters."
    },
    {
      id: 58,
      hebrew: "אַל תֹּאמַר לִכְשֶׁאֶפָּנֶה אֶשְׁנֶה, שֶׁמָּא לֹא תִפָּנֶה",
      translation: "Do not say, 'When I have free time I will study,' for perhaps you will never have free time.",
      source: "Pirkei Avot 2:4",
      reflection: "Hillel cuts to the heart of human procrastination. We constantly delay self-improvement, waiting for perfectly clear schedules that will never arrive. The truth is, 'free time' is an illusion; time is created by prioritizing. If you want to grow, you must fight for the time right now, amidst the chaos, or it will never happen."
    },
    {
      id: 59,
      hebrew: "שׁוּב יוֹם אֶחָד לִפְנֵי מִיתָתָךְ",
      translation: "Repent one day before your death.",
      source: "Pirkei Avot 2:10",
      reflection: "When Rabbi Eliezer taught this, his students asked, 'Does a person know which day they will die?' He replied, 'Exactly. Therefore, repent today.' This transforms our daily mindset. Living as if today is your last day forces you to clear away petty grievances, apologize quickly, and focus only on what truly holds eternal value."
    },
    {
      id: 60,
      hebrew: "הוֹלֵךְ אֶת־חֲכָמִים יֶחְכָּם, וְרֹעֶה כְסִילִים יֵרוֹעַ",
      translation: "He who walks with the wise will become wise, but the companion of fools will be broken.",
      source: "Proverbs 13:20",
      reflection: "King Solomon reveals that character is deeply contagious. You are the average of the people you surround yourself with. 'Walking' with the wise implies a steady, consistent journey rather than a single lesson. Choose your inner circle carefully; an environment of growth will elevate you effortlessly, while an environment of folly will inevitably drag you down."
    },
    {
      id: 61,
      hebrew: "נֶאֱמָנִים פִּצְעֵי אוֹהֵב, וְנַעְתָּרוֹת נְשִׁיקוֹת שׂוֹנֵא",
      translation: "Faithful are the wounds of a friend; but profuse are the kisses of an enemy.",
      source: "Proverbs 27:6",
      reflection: "True friendship is not defined by endless agreement. A real friend values your long-term character more than your short-term comfort, and will risk delivering 'wounds' of honest, constructive criticism to help you grow. An enemy, on the other hand, will flatter you with 'kisses' while you walk off a cliff. Value the one who loves you enough to tell you the hard truth."
    },
    {
      id: 62,
      hebrew: "לֵב מַרְפֵּא חַיֵּי בְשָׂרִים, וּרְקַב עֲצָמוֹת קִנְאָה",
      translation: "A tranquil heart gives life to the flesh, but envy makes the bones rot.",
      source: "Proverbs 14:30",
      reflection: "This ancient proverb perfectly captures the psychosomatic toll of our mental state. 'Envy' is not just an emotional sin; it is a corrosive acid that rots the very core ('the bones') of a person's well-being. A 'tranquil heart'—one that is content and at peace with its own portion—is the ultimate health prescription, infusing vitality into every aspect of life."
    },
    {
      id: 63,
      hebrew: "לִפְנֵי שֶׁבֶר גָּאוֹן, וְלִפְנֵי כִשָּׁלוֹן גֹּבַהּ רוּחַ",
      translation: "Pride goes before destruction, and a haughty spirit before a fall.",
      source: "Proverbs 16:18",
      reflection: "Arrogance creates a massive blind spot. When you believe you have nothing left to learn or that you are inherently superior, you stop paying attention to your footing. The 'fall' is not always a divine punishment, but the natural consequence of a bloated ego ignoring reality. Humility is not weakness; it is the ultimate situational awareness."
    },
    {
      id: 64,
      hebrew: "לֹא יַחְפֹּץ כְּסִיל בִּתְבוּנָה, כִּי אִם בְּהִתְגַּלּוֹת לִבּוֹ",
      translation: "A fool takes no pleasure in understanding, but only in expressing his opinion.",
      source: "Proverbs 18:2",
      reflection: "In the age of social media, this warning is remarkably relevant. True understanding ('tevunah') requires the hard work of listening and wrestling with opposing viewpoints. The 'fool' bypasses learning entirely, treating every conversation not as an opportunity to discover truth, but merely as a stage to broadcast their own pre-existing opinions."
    },
    {
      id: 65,
      hebrew: "מְכַסֶּה פֶּשַׁע מְבַקֵּשׁ אַהֲבָה, וְשׁוֹנֶה בְדָבָר מַפְרִיד אַלּוּף",
      translation: "He who covers over an offense promotes love, but whoever repeats the matter separates close friends.",
      source: "Proverbs 17:9",
      reflection: "Forgiveness is the glue of society. Covering an offense doesn't mean enabling abuse, but rather letting go of the petty mistakes we all make. 'Repeating the matter'—holding grudges or gossiping about a friend’s failure—destroys the trust that holds relationships together. To build deep connections, you must be willing to let some things go."
    },
    {
      id: 66,
      hebrew: "בִּנְפֹל אוֹיִבְךָ אַל תִּשְׂמָח, וּבִכָּשְׁלוֹ אַל יָגֵל לִבֶּךָ",
      translation: "Do not rejoice when your enemy falls, and let not your heart be glad when he stumbles.",
      source: "Proverbs 24:17",
      reflection: "Schadenfreude—taking pleasure in another's pain—is toxic to the human spirit, even when the person 'deserves' it. King Solomon warns that celebrating the downfall of an enemy corrupts your own character. We must seek justice and protect ourselves, but we should mourn the fact that the world is broken, rather than celebrating the destruction of a human life."
    },
    {
      id: 67,
      hebrew: "בַּרְזֶל בְּבַרְזֶל יָחַד, וְאִישׁ יַחַד פְּנֵי רֵעֵהוּ",
      translation: "As iron sharpens iron, so one person sharpens another.",
      source: "Proverbs 27:17",
      reflection: "Sharpening a blade requires friction. A community of 'yes-men' leaves us dull. We need peers who challenge our assumptions, refine our ideas, and push us to be better. The friction of principled debate between people who respect each other produces a razor-sharp intellect and an unbreakable character."
    },
    {
      id: 68,
      hebrew: "עָשִׁיר בְּרָשִׁים יִמְשׁוֹל, וְעֶבֶד לֹוֶה לְאִישׁ מַלְוֶה",
      translation: "The rich rules over the poor, and the borrower is the slave of the lender.",
      source: "Proverbs 22:7",
      reflection: "This is a profound lesson in true independence. Debt is not just a financial state; it is a profound limitation on your personal freedom. When you owe others, your decisions are no longer entirely your own. Living within your means is essential financial hygiene, but it is also a fundamental requirement for maintaining your autonomy."
    },
    {
      id: 69,
      hebrew: "מְכַסֶּה פְשָׁעָיו לֹא יַצְלִיחַ, וּמוֹדֶה וְעֹזֵב יְרֻחָם",
      translation: "He who conceals his sins does not prosper, but whoever confesses and renounces them finds mercy.",
      source: "Proverbs 28:13",
      reflection: "The energy spent hiding our flaws is exhausting and ultimately futile. Acknowledging where we went wrong is terrifying to the ego, but it is the only gateway to freedom. By confessing and abandoning the negative behavior, we open ourselves to 'mercy'—both from others and from God—and clear the path for true success."
    },
    {
      id: 70,
      hebrew: "בְּאֵין חָזוֹן יִפָּרַע עָם",
      translation: "Where there is no vision, the people lose restraint.",
      source: "Proverbs 29:18",
      reflection: "When a person or a society lacks a 'vision'—a compelling, transcendent goal for the future—they devolve into serving their lowest, immediate impulses. A clear sense of purpose acts as an internal moral compass, providing the necessary boundaries and restraint required to build a meaningful and lasting life."
    },
    {
      id: 71,
      hebrew: "טוֹב אַחֲרִית דָּבָר מֵרֵאשִׁיתוֹ, טוֹב אֶרֶךְ רוּחַ מִגְּבַהּ רוּחַ",
      translation: "The end of a matter is better than its beginning, and patience is better than pride.",
      source: "Ecclesiastes 7:8",
      reflection: "Beginnings are fueled by excitement and naive confidence ('pride'), but true value is forged in the completion of a challenging task. Patience ('arech ruach', literally a 'long spirit') is the grit required to see things through the messy middle. The real victory is not the thrill of starting, but the quiet satisfaction of having endured to the end."
    },
    {
      id: 72,
      hebrew: "וְהַחוּט הַמְשֻׁלָּשׁ לֹא בִמְהֵרָה יִנָּתֵק",
      translation: "A cord of three strands is not quickly broken.",
      source: "Ecclesiastes 4:12",
      reflection: "While two people can support each other, a 'third strand' weaves them into something much stronger than the sum of their parts. In Jewish tradition, this often refers to incorporating God into a relationship or a partnership. When personal connections are bound by a shared higher purpose, they become resilient enough to weather any storm."
    },
    {
      id: 73,
      hebrew: "וַאֲנִי תָמִיד אִיחֵל, וְהוֹסַפְתִּי עַל כָּל תְּהִלָּתֶךָ",
      translation: "But as for me, I will always have hope, and will praise You more and more.",
      source: "Psalm 71:14",
      reflection: "Hope is a choice, not just a feeling. King David, despite facing immense betrayal and suffering throughout his life, made a conscious decision to anchor himself in hope and gratitude. By choosing to 'add praise' even in difficult seasons, we train our minds to recognize the light instead of hyper-focusing on the dark."
    },
    {
      id: 74,
      hebrew: "קָרוֹב יְהוָה לְנִשְׁבְּרֵי לֵב, וְאֶת דַּכְּאֵי רוּחַ יוֹשִׁיעַ",
      translation: "The Lord is close to the brokenhearted and saves those who are crushed in spirit.",
      source: "Psalm 34:18",
      reflection: "We often think we must present ourselves to God as perfectly put-together. King David shatters this notion, revealing that God orchestrates a special proximity to the broken. Your pain does not distance you from the Divine; it actually attracts an intimate, saving presence that cannot be accessed when the ego is intact."
    },
    {
      id: 75,
      hebrew: "אֶשָּׂא עֵינַי אֶל־הֶהָרִים, מֵאַיִן יָבֹא עֶזְרִי? עֶזְרִי מֵעִם יְהוָה עֹשֵׂה שָׁמַיִם וָאָרֶץ",
      translation: "I lift up my eyes to the mountains—where does my help come from? My help comes from the Lord, the Maker of heaven and earth.",
      source: "Psalm 121:1-2",
      reflection: "In moments of crisis, we instinctively look 'to the mountains'—the looming obstacles or the powerful people we think can save us. David pulls our gaze higher. True security doesn't come from human institutions or our own limited strength, but from plugging into the infinite power of the Creator of the universe."
    },
    {
      id: 76,
      hebrew: "הַזֹּרְעִים בְּדִמְעָה, בְּרִנָּה יִקְצֹרוּ",
      translation: "Those who sow with tears will reap with songs of joy.",
      source: "Psalm 126:5",
      reflection: "The effort required to build something truly worthwhile—a relationship, a career, a spiritual life—often involves pain, sacrifice, and 'tears.' However, no sincere effort is wasted. This verse promises that the very tears shed during the hard work of planting will become the fertile soil from which the ultimate 'songs of joy' will harvest."
    },
    {
      id: 77,
      hebrew: "אִם יְהוָה לֹא יִבְנֶה בַיִת, שָׁוְא עָמְלוּ בוֹנָיו בּוֹ",
      translation: "Unless the Lord builds the house, the builders labor in vain.",
      source: "Psalm 127:1",
      reflection: "We can pour our blood, sweat, and tears into building our careers, our families, or our legacy, but if we leave out the spiritual foundation, it is built on sand. Success isn't simply the result of maximum effort; it requires aligning our intense human labor with divine providence and ethical truth."
    },
    {
      id: 78,
      hebrew: "רוֹפֵא לִשְׁבוּרֵי לֵב, וּמְחַבֵּשׁ לְעַצְּבוֹתָם",
      translation: "He heals the brokenhearted and binds up their wounds.",
      source: "Psalm 147:3",
      reflection: "Healing is a process, not magic. 'Binding up wounds' implies care, time, and attention. We are reminded that the Divine works actively in our recovery. Just as God tenderly wraps the emotional wounds of the brokenhearted, we are called to be agents of this divine healing for those suffering around us."
    },
    {
      id: 79,
      hebrew: "וְיָדַעְתָּ כִּי אֲנִי יְהוָה, אֲשֶׁר לֹא יֵבֹשׁוּ קֹוָי",
      translation: "Then you will know that I am the Lord; those who hope in Me will not be disappointed.",
      source: "Isaiah 49:23",
      reflection: "To place your ultimate hope in people or systems guarantees eventual disappointment, because human beings are flawed and limited. The prophet Isaiah promises that a soul anchored entirely in trusting the Divine plan will ultimately land in a place of perfect resolution, even if the journey there is wildly unpredictable."
    },
    {
      id: 80,
      hebrew: "כִּי לֹא מַחְשְׁבוֹתַי מַחְשְׁבוֹתֵיכֶם, וְלֹא דַרְכֵיכֶם דְּרָכָי",
      translation: "For My thoughts are not your thoughts, neither are your ways My ways.",
      source: "Isaiah 55:8",
      reflection: "This is the ultimate check on human arrogance. We constantly try to force reality into our limited intellectual boxes. When life takes a sudden, incomprehensible turn, this verse reminds us that the Author of the story operates on a plane of wisdom we cannot fathom. Surrendering the need to fully understand is the leap of faith that brings peace."
    },
    {
      id: 81,
      hebrew: "חַסְדֵי יְהוָה כִּי לֹא תָמְנוּ, כִּי לֹא כָלוּ רַחֲמָיו. חֲדָשִׁים לַבְּקָרִים, רַבָּה אֱמוּנָתֶךָ",
      translation: "Because of the Lord's great love we are not consumed, for His compassions never fail. They are new every morning; great is Your faithfulness.",
      source: "Lamentations 3:22-23",
      reflection: "Written amidst the absolute devastation of Jerusalem, Jeremiah discovers a profound truth: the mere fact that we wake up breathing is proof of ongoing divine mercy. No matter how badly we failed yesterday, the sunrise brings an entirely fresh supply of grace. God's faithfulness gives us clean slate every single morning."
    },
    {
      id: 82,
      hebrew: "וְקֹוֵי יְהוָה יַחֲלִיפוּ כֹחַ, יַעֲלוּ אֵבֶר כַּנְּשָׁרִים",
      translation: "But those who hope in the Lord will renew their strength. They will soar on wings like eagles.",
      source: "Isaiah 40:31",
      reflection: "When we run on our own ego and ambition, we inevitably burn out. However, 'hoping in the Lord' acts as a spiritual battery exchange ('yachalifu koach'). By tying our efforts to a higher, selfless purpose, we tap into an inexhaustible energy source that allows us to rise above the exhausting friction of daily life."
    },
    {
      id: 83,
      hebrew: "אַל תִּירָא כִּי עִמְּךָ אָנִי, אַל תִּשְׁתָּע כִּי אֲנִי אֱלֹהֶיךָ",
      translation: "Do not fear, for I am with you; do not be dismayed, for I am your God.",
      source: "Isaiah 41:10",
      reflection: "Fear paralyzes the human spirit. The antidote to fear is not a map of the future, but the presence of the Guide. When you internalize the reality that the Creator is holding your hand through the chaotic unknowns of life, the anxiety dissolves, replaced by a quiet, unshakeable courage."
    },
    {
      id: 84,
      hebrew: "הִנְנִי עֹשֶׂה חֲדָשָׁה עַתָּה תִצְמָח",
      translation: "See, I am doing a new thing! Now it springs up; do you not perceive it?",
      source: "Isaiah 43:19",
      reflection: "We get stuck looking in the rearview mirror, mourning what we have lost or regretting past mistakes. God is inherently dynamic, constantly bringing new life out of the ashes. This verse is a command to open our eyes and look for the 'new thing'—the fresh opportunities and unexpected blessings springing up right in front of us."
    },
    {
      id: 85,
      hebrew: "דִּרְשׁוּ אֶת שְׁלוֹם הָעִיר אֲשֶׁר הִגְלֵיתִי אֶתְכֶם שָׁמָּה... כִּי בִשְׁלוֹמָהּ יִהְיֶה לָכֶם שָׁלוֹם",
      translation: "Seek the peace and prosperity of the city to which I have carried you into exile... for if it prospers, you too will prosper.",
      source: "Jeremiah 29:7",
      reflection: "The Jewish people were exiled to Babylon, the heart of their enemy. Rather than revolt or isolate, the Prophet commands them to actively contribute to the well-being of the broader society. This defines the Jewish ethic of civic responsibility: we must be a blessing to whatever community we inhabit, understanding that our true peace is bound up in their peace."
    },
    {
      id: 86,
      hebrew: "אַהֲבַת עוֹלָם אֲהַבְתִּיךְ, עַל כֵּן מְשַׁכְתִּיךְ חָסֶד",
      translation: "I have loved you with an everlasting love; therefore I have drawn you with lovingkindness.",
      source: "Jeremiah 31:3",
      reflection: "Much of the world views religion through a lens of fear and punishment. The Prophets shatter this by revealing the core motivation of the Divine: an infinite, everlasting love. It is this profound love (Chesed) that continually draws the Jewish people back, proving that the most powerful force for change is not fear, but profound acceptance."
    },
    {
      id: 87,
      hebrew: "חַיָּב אָדָם לְבָרֵךְ עַל הָרָעָה כְּשֵׁם שֶׁהוּא מְבָרֵךְ עַל הַטּוֹבָה",
      translation: "A person is obligated to bless [God] for the bad, just as he blesses for the good.",
      source: "Mishnah Berakhot 9:5",
      reflection: "This is a radical emotional orientation. It demands we reject the idea of a chaotic, random universe. By blessing the Source even when tragedy strikes, we assert our ultimate trust that the 'bad' is part of an incomprehensibly vast 'good.' It reframes our pain from a meaningless void into a deeply purposeful experience."
    },
    {
      id: 88,
      hebrew: "וְלֹא הַמִּדְרָשׁ הוּא הָעִקָּר, אֶלָּא הַמַּעֲשֶׂה",
      translation: "Study is not the main thing, but rather action.",
      source: "Pirkei Avot 1:17",
      reflection: "Shimon ben Gamliel punctures the bubble of intellectual elitism. Knowing all the theory, reading all the books, and debating philosophy is worthless if it doesn't translate into tangible kindness and ethical behavior. The ultimate test of your learning is not your knowledge, but the quality of your deeds."
    },
    {
      id: 89,
      hebrew: "הַכַּעַס – הֲרֵי הוּא כְּעוֹבֵד עֲבוֹדָה זָרָה",
      translation: "One who becomes angry, it is as if he worships idols.",
      source: "Rambam / Talmud Shabbat 105b",
      reflection: "Why is anger compared to idol worship? Because true faith means believing that God runs the world. When you explode in rage over a situation, you are essentially declaring that God made a mistake and that someone else controls your destiny. Conquering anger is thus not just anger management, but the deepest expression of monotheism."
    },
    {
      id: 90,
      hebrew: "אֵין שׁוּם יֵאוּשׁ בָּעוֹלָם כְּלָל!",
      translation: "There is no such thing as despair in the world at all!",
      source: "Rabbi Nachman of Breslov",
      reflection: "Rebbe Nachman does not deny that life is brutal. Rather, he teaches that 'despair'—the conclusion that a situation is permanently hopeless—is always a lie. Because the Creator is constantly renewing the world and the soul has infinite resilience, holding onto hope is the only realistic way to view the universe."
    },
    {
      id: 91,
      hebrew: "שִׂנְאוּ רַבָּנוּת, וְאַל תִּתְוַדְּעוּ לָרָשׁוּת",
      translation: "Hate mastery (holding office), and do not become overly acquainted with the ruling powers.",
      source: "Pirkei Avot 1:10",
      reflection: "Shemaiah warns against the intoxicating and corrupting nature of political power. Pursuing leadership for the sake of ego or control destroys the soul. True leadership must be viewed as a heavy burden of service, entered into reluctantly, keeping a healthy distance from the seductions of power and status."
    },
    {
      id: 92,
      hebrew: "יְהִי כְּבוֹד תַּלְמִידְךָ חָבִיב עָלֶיךָ כְּשֶׁלָּךְ... וּמוֹרָא רַבְּךָ כְּמוֹרָא שָׁמָיִם",
      translation: "Let the honor of your student be as dear to you as your own... and the reverence for your teacher as the reverence for Heaven.",
      source: "Pirkei Avot 4:12",
      reflection: "Rabbi Elazar ben Shammua establishes the ethics of hierarchical relationships. A leader or teacher must protect the dignity of those below them just as fiercely as their own ego. Simultaneously, society depends on a deep, almost sacred respect for true mentors. When mutual dignity flows both up and down the chain, society thrives."
    },
    {
      id: 93,
      hebrew: "אַל תִּסְתַּכֵּל בַּקַּנְקַן, אֶלָּא בְמַה שֶּׁיֵּשׁ בּוֹ",
      translation: "Do not look at the jug, but at what is inside it.",
      source: "Pirkei Avot 4:20",
      reflection: "Rabbi Meir's famous maxim teaches us to bypass superficial packaging. 'There is a new jug full of old wine, and an old jug that lacks even new wine.' You cannot judge the depth of a person's wisdom or the quality of their heart by their age, their clothes, or their status. True value is an internal quality."
    },
    {
      id: 94,
      hebrew: "אִם אֲנִי כָּאן, הַכֹּל כָּאן, וְאִם אֵינִי כָּאן, מִי כָּאן",
      translation: "If I am here, everything is here. If I am not here, who is here?",
      source: "Hillel (Talmud Sukkah 53a)",
      reflection: "This is often interpreted as Hillel speaking on behalf of the Divine Presence—if God’s presence is recognized, everything exists with purpose; if not, existence is hollow. It also serves as a profound statement on presence: if you are fully present in the moment with your entire soul ('I am here'), your world is complete."
    },
    {
      id: 95,
      hebrew: "לְעוֹלָם יִרְאֶה אָדָם עַצְמוֹ כְּאִלּוּ חֶצְיוֹ חַיָּב וְחֶצְיוֹ זַכַּאי",
      translation: "A person should always view themselves and the entire world as equally balanced between merit and guilt.",
      source: "Talmud Kiddushin 40b",
      reflection: "The Sages offer a powerful visualization for the impact of our actions. Imagine the scales of the universe are perfectly tied. One single good deed tips the entire cosmos toward salvation; one cruel act tips it toward destruction. This eliminates the excuse that 'I'm just one person,' elevating every tiny choice into an act of cosmic significance."
    },
    {
      id: 96,
      hebrew: "כָּל אַהֲבָה שֶׁהִיא תְלוּיָה בְדָבָר, בָּטֵל דָּבָר, בְּטֵלָה אַהֲבָה",
      translation: "Any love that depends on a specific cause, when that cause is gone, the love is gone.",
      source: "Pirkei Avot 5:16",
      reflection: "Conditional love (based on wealth, beauty, or usefulness) has an expiration date. When the utility goes, the affection evaporates. But unconditional love—love for the essence of the person themselves, independent of what they can do for you—is eternal. To build lasting relationships, we must graduate from using people to truly loving them."
    },
    {
      id: 97,
      hebrew: "לֹא הַבַּיְשָׁן לָמֵד, וְלֹא הַקַּפְּדָן מְלַמֵּד",
      translation: "The bashful person cannot learn, and the hot-tempered person cannot teach.",
      source: "Pirkei Avot 2:5",
      reflection: "Hillel identifies the two greatest obstacles to intellectual growth. If a student is too embarrassed to ask questions (fear of looking stupid), they will remain ignorant. If a teacher is quick-tempered and punishes curiosity, they will crush the student's spirit. Effective learning requires an atmosphere of fearless inquiry and supreme patience."
    },
    {
      id: 98,
      hebrew: "בְּמִדָּה שֶׁאָדָם מוֹדֵד, בָּהּ מוֹדְדִין לוֹ",
      translation: "In the very measure that a person measures out, so will it be measured out to them.",
      source: "Sotah 1:7",
      reflection: "The principle of 'Middah k'neged Middah' is the Jewish concept of karma. It is the assurance that the energy we put into the universe is exactly what we receive. Generosity attracts abundance; stinginess attracts lack. By measuring out kindness and grace to others, you actively dictate the terms of your own future."
    },
    {
      id: 99,
      hebrew: "אִם תַּעֲזְבֶנִּי יוֹם, יוֹמַיִם אֶעֶזְבֶךָּ",
      translation: "If you leave me for one day, I will leave you for two.",
      source: "Jerusalem Talmud (Berakhot 9)",
      reflection: "This is a metaphor for the study of Torah and the pursuit of wisdom. Consistency is everything. If you skip your spiritual or intellectual disciplines for just a single day, the momentum you lose will take double the effort to regain. Mastery is built through unrelenting, daily persistence."
    },
    {
      id: 100,
      hebrew: "ּבַמָּקוֹם שֶׁבַּעֲלֵי תְשׁוּבָה עוֹמְדִין, אֵין צַדִּיקִים גְּמוּרִין עֲמוּדִין",
      translation: "In the place where a Ba'al Teshuvah (repentant person) stands, even the completely righteous cannot stand.",
      source: "Talmud Berakhot 34b",
      reflection: "This challenges our assumption that living a flawless life makes you the most spiritual. A person who has experienced the darkness, made mistakes, and fought the agonizing battle to claw their way back to the light has generated a level of passion and depth that someone who never struggled cannot comprehend. Your past mistakes, if used as fuel for growth, become your greatest advantage."
    },
    {
      id: 101,
      hebrew: "רְצוֹנֵנוּ לַעֲשׂוֹת רְצוֹנֶךָ, וּמִי מְעַכֵּב? שְׂאוֹר שֶׁבָּעִיסָה",
      translation: "It is our will to do Your will, and what prevents us? The yeast in the dough.",
      source: "Talmud Berakhot 17a",
      reflection: "Rabbi Alexandri provides a profound psychological insight into human failing. Deep down, our core desire is to be good and do what is right. We are only derailed by the 'yeast in the dough'—a metaphor for the Yetzer Hara (evil inclination), which puffs up our ego and distracts us. We must learn to separate our true, pure identity from the inflating distractions of the ego."
    },
    {
      id: 102,
      hebrew: "טְוֹב לָלֶכֶת אֶל בֵּית אֵבֶל מִלֶּכֶת אֶל בֵּית מִשְׁתֶּה... וְהַחַי יִתֵּן אֶל לִבּוֹ",
      translation: "It is better to go to a house of mourning than to a house of feasting... and the living will take it to heart.",
      source: "Ecclesiastes 7:2",
      reflection: "Parties and celebrations distract us with noise and shallow pleasures. King Solomon notes that standing in the presence of grief forces us to confront our own mortality. A 'house of mourning' strips away the illusions of what matters, clarifying our priorities so that we return to our lives determined to live more deeply and purposefully."
    },
    {
      id: 103,
      hebrew: "סוֹף דָּבָר הַכֹּל נִשְׁמָע, אֶת־הָאֱלֹהִים יְרָא וְאֶת־מִצְוֹתָיו שְׁמוֹר כִּי־זֶה כָּל־הָאָדָם",
      translation: "The end of the matter, all having been heard: fear God, and keep His commandments, for this is the whole duty of man.",
      source: "Ecclesiastes 12:13",
      reflection: "After exploring every philosophy, indulgence, and intellectual pursuit under the sun, King Solomon distills the meaning of human existence into a single sentence. Complexity is an illusion. A satisfying, complete life simplifies down to awe of the Divine (Yirah) and practical, ethical action (keeping the commandments). This is the 'whole' of what makes us human."
    },
    {
      id: 104,
      hebrew: "וִהְיִיתֶם כֵּאלֹהִים, יֹדְעֵי טוֹב וָרָע",
      translation: "...and you will be like God, knowing good and evil.",
      source: "Genesis 3:5",
      reflection: "The serpent's lie in Eden was not just about breaking a rule; it was about autonomy. We constantly strive to be the ultimate arbiters of what is 'good' and 'evil,' defining truth based entirely on our own limited, subjective feelings. Humility requires acknowledging that there is an objective, divine standard of morality that stands above our personal desires."
    },
    {
      id: 105,
      hebrew: "מָה שֶּׁשָּׂנוּא עָלֶיךָ לֹא תַעֲשֶׂה לַחֲבֵרְךָ, זוֹ הִיא כָּל הַתּוֹרָה כֻּלָּהּ",
      translation: "What is hateful to you, do not do to your fellow: this is the whole Torah; the rest is the explanation; go and learn.",
      source: "Talmud Shabbat 31a",
      reflection: "Hillel’s 'Golden Rule' focuses on the negative—refraining from harm. It requires a massive leap of empathy: to pause before every interaction, run the proposed action through your own emotional filter, and stop if it would hurt you. The genius of Hillel is saying that every complex ritual and law in the Torah is essentially a training module to help us achieve this fundamental respect for others."
    },
    {
      id: 106,
      hebrew: "וְזָכַרְתָּ אֶת־יְהוָה אֱלֹהֶיךָ, כִּי הוּא הַנֹּתֵן לְךָ כֹּחַ לַעֲשׂוֹת חָיִל",
      translation: "But remember the Lord your God, for it is He who gives you the ability to produce wealth.",
      source: "Deuteronomy 8:18",
      reflection: "As we become successful, our ego naturally whispers: 'My power and the strength of my hands have produced this wealth for me.' Moses preempts this danger. He does not deny that you worked hard; he simply reminds you that the intellect, the health, and the opportunities required for that hard work were gifts. Gratitude is the safeguard against the arrogance of success."
    },
    {
      id: 107,
      hebrew: "אָכֵן יֵשׁ יְהוָה בַּמָּקוֹם הַזֶּה וְאָנֹכִי לֹא יָדָעְתִּי",
      translation: "Surely Hashem is in this place, and I did not know it.",
      source: "Genesis 28:16",
      reflection: "Awakening from his vision of the ladder, Jacob makes a startling realization: holiness is not restricted to temples or mountaintops. The tragedy of the human condition is not that God is absent, but that 'I did not know it'—we lack the awareness to perceive Him. This verse challenges us to stop searching for the Divine only in spectacular miracles, and to start recognizing the sacred presence hidden within the seemingly ordinary moments of our daily lives."
    },
    {
      id: 108,
      hebrew: "יְהוָה יִלָּחֵם לָכֶם וְאַתֶּם תַּחֲרִשׁוּן",
      translation: "Hashem will fight for you, and you shall remain silent.",
      source: "Exodus 14:14",
      reflection: "Trapped between the Egyptian army and the Red Sea, the Israelites panicked. Moses’ response is a masterclass in spiritual fortitude. There are moments in life when our frantic efforts to save ourselves only create more chaos. When we have reached the absolute limit of human capability, the highest form of faith is to cease striving, remain silent, and create the internal space for God to intervene and perform the impossible."
    },
    {
      id: 109,
      hebrew: "מִצְוָה גְּדוֹלָה לִהְיוֹת בְּשִׂמְחָה תָּמִיד",
      translation: "It is a great Mitzvah to be happy always.",
      source: "Rebbe Nachman of Breslov",
      reflection: "Rebbe Nachman of Breslov radically reframes happiness. We usually view joy as a passive byproduct of good circumstances. Rebbe Nachman teaches that joy is an active, vital discipline—a 'great Mitzvah.' Despair and sadness create emotional blockages that disconnect us from the Divine. Therefore, fighting for our joy, even when life is immensely difficult, is an act of spiritual defiance that keeps the soul open to heaven."
    },
    {
      id: 110,
      hebrew: "לֹא עַל־הַלֶּחֶם לְבַדּוֹ יִחְיֶה הָאָדָם",
      translation: "Man does not live by bread alone.",
      source: "Deuteronomy 8:3",
      reflection: "While physical sustenance keeps the body functioning, it cannot satisfy the hunger of the human soul. This verse reminds us that an existence focused solely on material consumption is fundamentally hollow. True vitality—the essence of what it means to be truly 'alive'—comes from nourishing ourselves with the 'word of God,' meaning purpose, moral wisdom, and a profound connection to the spiritual dimension of reality."
    },
    {
      id: 111,
      hebrew: "כִּי הָאָדָם יִרְאֶה לַעֵינַיִם וַיהוָה יִרְאֶה לַלֵּב",
      translation: "For man looks at the outward appearance, but Hashem looks at the heart.",
      source: "1 Samuel 16:7",
      reflection: "Human beings are naturally captivated by superficial metrics: wealth, charisma, status, and physical appearance. Yet, when selecting King David, God explicitly rejects these external markers. This verse is a powerful reminder that our societal systems of evaluating a person's worth are deeply flawed. In the eyes of Heaven, a person's true majesty is measured exclusively by the hidden qualities of their character, their integrity, and the purity of their heart."
    },
    {
      id: 112,
      hebrew: "קוֹל דְּמָמָה דַקָּה",
      translation: "A still small voice.",
      source: "1 Kings 19:12",
      reflection: "Fleeing into the wilderness, Elijah expected to encounter God in dramatic displays of natural power—wind, earthquakes, and fire. Instead, he found the Divine in a 'kol demamah dakah,' a thin, silent voice. This teaches us that the deepest spiritual truths do not scream for our attention. To hear the quiet guidance of the soul and the subtle presence of the Creator, we must first learn to silence the deafening noise of the outside world."
    },
    {
      id: 113,
      hebrew: "כִּי־תַעֲבֹר בַּמַּיִם אִתְּךָ־אָנִי",
      translation: "When you pass through the waters, I will be with you.",
      source: "Isaiah 43:2",
      reflection: "The prophet does not promise a life free of tragedy; he explicitly acknowledges that we will have to pass through turbulent, overwhelming 'waters.' The divine guarantee is not an exemption from suffering, but the promise of unwavering companionship within it. Knowing that we are accompanied by the Infinite presence gives us the extraordinary resilience needed to walk through life's darkest and most suffocating trials without drowning in despair."
    },
    {
      id: 114,
      hebrew: "כִּי־הֶהָרִים יָמוּשׁוּ... וְחַסְדִּי מֵאִתֵּךְ לֹא־יָמוּשׁ",
      translation: "For the mountains may move... but My kindness shall not move from you.",
      source: "Isaiah 54:10",
      reflection: "Mountains are the ultimate symbols of unyielding permanence. Yet, the prophet declares that even if the bedrock of the physical earth were to shatter and shift, God's lovingkindness (Chesed) toward us remains absolute. In an unpredictable world where human loyalties fade and circumstances change without warning, this verse offers an unshakable psychological anchor: we are held by a Divine love that outlasts the physical universe itself."
    },
    {
      id: 115,
      hebrew: "גַּם זוּ לְטוֹבָה",
      translation: "This too is for the good.",
      source: "Nachum Ish Gamzu (Talmud Taanit 21a)",
      reflection: "The Talmudic sage Nachum earned his name by responding to every seemingly disastrous event with the phrase 'Gam zu l'tovah' (This, too, is for the good). This is the pinnacle of Jewish faith. It is the radical refusal to label any event as a pure tragedy, holding fast to the belief that the Creator is weaving a master tapestry. Even the dark threads of pain and setback are necessary components of an ultimately beautiful and beneficial outcome."
    },
    {
      id: 116,
      hebrew: "כִּי חֶסֶד חָפַצְתִּי וְלֹא־זָבַח",
      translation: "For I desire kindness, and not sacrifice.",
      source: "Hosea 6:6",
      reflection: "The prophets constantly battled against the illusion that religious mechanics could substitute for basic human decency. Hosea delivers a devastating critique of hypocrisy: God is entirely unimpressed by flawless ritual sacrifices if they are offered by people who are cruel to their neighbors. The highest form of worship is not the burning of incense, but the daily, tangible practice of 'Chesed' (lovingkindness) toward our fellow human beings."
    },
    {
      id: 117,
      hebrew: "אַל־תִּשְׂמְחִי אֹיַבְתִּי לִי כִּי נָפַלְתִּי קָמְתִּי",
      translation: "Do not rejoice over me, my enemy; though I have fallen, I will rise.",
      source: "Micah 7:8",
      reflection: "This verse is the anthem of Jewish historical resilience. It addresses the enemy—or one's own inner demons—who celebrates our moments of failure. It teaches the profound concept of 'Yeridah l'tzorech Aliyah': a descent for the sake of an ascent. Falling is not the opposite of success; it is a prerequisite for it. Every collapse contains the seed of a greater rising, transforming our moments of defeat into the very fuel for our ultimate redemption."
    },
    {
      id: 118,
      hebrew: "אֱמֶת וּמִשְׁפַּט שָׁלוֹם שִׁפְטוּ בְּשַׁעֲרֵיכֶם",
      translation: "Execute the judgment of truth and peace in your gates.",
      source: "Zechariah 8:16",
      reflection: "Truth and peace are often in direct conflict. Unfiltered truth can cause brutal hurt, destroying peace; while the pursuit of peace often requires sweeping difficult truths under the rug. The prophet challenges us to reject this false dichotomy. True justice requires the painstaking, courageous work of holding both simultaneously—speaking the truth with enough compassion that it creates genuine, lasting harmony rather than superficial appeasement."
    },
    {
      id: 119,
      hebrew: "הַשָּׁמַיִם מְסַפְּרִים כְּבוֹד־אֵל",
      translation: "The heavens declare the glory of God.",
      source: "Psalm 19:1",
      reflection: "King David recognized that the physical universe is not just matter; it is an ongoing, silent symphony praising its Creator. Looking up at the staggering vastness of the cosmos is meant to induce a profound sense of awe (Yirah). When we truly observe the elegance and majesty of the heavens, it shatters our human arrogance, placing our personal anxieties into perspective and reconnecting us to the infinite mind of God."
    },
    {
      id: 120,
      hebrew: "יְהוָה אוֹרִי וְיִשְׁעִי מִמִּי אִירָא",
      translation: "Hashem is my light and my salvation; whom shall I fear?",
      source: "Psalm 27:1",
      reflection: "Fear thrives in the dark—both physical and spiritual. When we cannot see the path forward, our minds invent terrors. By declaring God as our 'light,' King David teaches that spiritual clarity is the antidote to anxiety. When you navigate life illuminated by faith, trusting that you are guarded by the ultimate salvation, the paralyzing dread of the unknown evaporates. With God as your light, there is simply nothing left in the shadows to fear."
    },
    {
      id: 121,
      hebrew: "לֵב טָהוֹר בְּרָא־לִי אֱלֹהִים",
      translation: "Create in me a pure heart, O God.",
      source: "Psalm 51:12",
      reflection: "King David, after his moral failure, does not ask for riches or victory, but for a spiritual reset. We always have the ability to do Teshuvah and ask for a fresh start and a cleansed conscience."
    },
    {
      id: 122,
      hebrew: "לִמְנוֹת יָמֵינוּ כֵּן הוֹדַע",
      translation: "Teach us to number our days.",
      source: "Psalm 90:12",
      reflection: "Awareness of mortality is not meant to be morbid, but motivating. Realizing our time is limited forces us to prioritize what truly matters—Torah, family, and good deeds—and not waste days on trivialities."
    },
    {
      id: 123,
      hebrew: "כָּל הָעוֹלָם כֻּלּוֹ גֶּשֶׁר צַר מְאֹד",
      translation: "The whole world is a very narrow bridge.",
      source: "Rebbe Nachman of Breslov",
      reflection: "Rebbe Nachman's famous teaching continues: '...and the main thing is not to be afraid at all.' Life is full of danger and instability, but the key to crossing the bridge is to maintain your courage and focus."
    },
    {
      id: 124,
      hebrew: "שִׂנְאָה תְּעוֹרֵר מְדָנִים וְעַל כָּל־פְּשָׁעִים תְּכַסֶּה אַהֲבָה",
      translation: "Hatred stirs up strife, but love covers all offenses.",
      source: "Proverbs 10:12",
      reflection: "Focusing on hatred (Sinat Chinam) only fuels conflict. Love (Ahavat Chinam) doesn't necessarily ignore problems, but it provides a covering—a context of safety—within which problems can be solved without destroying relationships."
    },
    {
      id: 125,
      hebrew: "מַעֲנֶה־רַּךְ יָשִׁיב חֵמָה",
      translation: "A soft answer turns away wrath.",
      source: "Proverbs 15:1",
      reflection: "When faced with anger, the natural instinct is to fight back. Wisdom is knowing that lowering your volume and softening your tone is actually the most powerful weapon to diffuse a fight."
    },
    {
      id: 126,
      hebrew: "חֲנֹךְ לַנַּעַר עַל־פִּי דַרְכּוֹ",
      translation: "Train a child according to his way.",
      source: "Proverbs 22:6",
      reflection: "Education (Chinuch) is not one-size-fits-all. To truly teach someone, you must understand their unique nature ('his way') and tailor your guidance to their specific strengths and weaknesses."
    },
    {
      id: 127,
      hebrew: "טוֹב שֵׁם מִשֶּׁמֶן טוֹב",
      translation: "A good name is better than fine oil.",
      source: "Ecclesiastes 7:1",
      reflection: "Fine oil was a luxury item of the ancient world. King Solomon teaches that your reputation (Shem Tov)—the integrity associated with your name—is more valuable than any status symbol."
    },
    {
      id: 128,
      hebrew: "אַל תִּפְרוֹשׁ מִן הַצִּבּוּר",
      translation: "Do not separate yourself from the community.",
      source: "Pirkei Avot 2:5",
      reflection: "Hillel warns against isolation. Even if the community is flawed, remaining connected ensures you stay grounded, supported, and able to contribute to the Klal (the collective)."
    },
    {
      id: 129,
      hebrew: "הֱוֵי עַז כַּנָּמֵר",
      translation: "Be bold as a leopard.",
      source: "Pirkei Avot 5:20",
      reflection: "Religious living requires boldness. You shouldn't be embarrassed to do the right thing, even if it is unpopular. Have the 'audacity' of a leopard when it comes to doing the will of Hashem."
    },
    {
      id: 130,
      hebrew: "מִצְוָה גּוֹרֶרֶת מִצְוָה",
      translation: "One Mitzvah leads to another Mitzvah.",
      source: "Pirkei Avot 4:2",
      reflection: "Don't worry about doing something huge; just do one small good thing. The spiritual momentum of that single act will naturally propel you toward the next one, creating a positive chain reaction."
    },
    {
      id: 131,
      hebrew: "דַּע מֵאַיִן בָּאתָ וּלְאָן אַתָּה הוֹלֵךְ",
      translation: "Know from where you came and to where you are going.",
      source: "Pirkei Avot 3:1",
      reflection: "Akavya ben Mahalalel gives the formula for humility and purpose. Remembering your origin (dust) keeps you humble; remembering your ultimate destination (standing before the King of Kings) keeps you focused on what truly matters."
    },
    {
      id: 132,
      hebrew: "צַדִּיק בֶּאֱמוּנָתוֹ יִחְיֶה",
      translation: "The righteous shall live by his faith.",
      source: "Habakkuk 2:4",
      reflection: "The Talmud suggests that all 613 commandments can be distilled into this one principle. A life of meaning is sustained by Emunah (faith)—the steadfast belief that life has purpose and God is involved in our destiny."
    },
    {
      id: 133,
      hebrew: "יְהִי כְבוֹד חֲבֵרְךָ חָבִיב עָלֶיךָ כְּשֶׁלָּךְ",
      translation: "Let the honor of your fellow be as dear to you as your own.",
      source: "Pirkei Avot 2:10",
      reflection: "Rabbi Eliezer teaches that empathy must extend to dignity. We guard our own reputation and feelings fiercely; we must be just as vigilant in protecting the dignity of others."
    },
    {
      id: 134,
      hebrew: "ויהיו כל בני אדם גדולים בעיניך, ותכבדם. ואם יהיה עני או מכוער, אל תבזהו, פן תבזה את קונו.",
      translation: "Let all people be great in your eyes, and honor them. If a person is poor or unattractive, do not despise them, lest you despise their Creator.",
      source: "Sefer HaYirah",
      reflection: "This is the ultimate antidote to ego. Rabbeinu Yonah teaches that every person has a unique quality or struggle that makes them superior to you in some regard. By honoring even the most marginalized individuals, you aren't just being 'nice'; you are acknowledging the Divine artist behind the creation and recognizing that every soul is an infinite masterpiece."
    },
    {
      id: 135,
      hebrew: "הוי בורח מן הכבוד, והתרחק מן הגאווה, כי היא תועבת השם. וכל המתגאה ביופיו או בחכמתו, הרי הוא כמודה שאינו מאת השם.",
      translation: "Flee from honor and distance yourself from pride, for it is an abomination to Hashem. Anyone who takes pride in their beauty or wisdom acts as if these gifts were not granted by God.",
      source: "Sefer HaYirah",
      reflection: "True character is built in the absence of an audience. When we chase honor, we become slaves to the shifting perceptions of others. Rabbeinu Yonah reminds us that our talents and traits are 'entrusted goods' from the Creator; pride is essentially a form of spiritual theft, claiming credit for a gift we didn't create ourselves."
    },
    {
      id: 136,
      hebrew: "ואל תכעס ואל תקצף, כי הכעס מוציא את האדם מן העולם. ואם יקניטך אדם, תן לו מענה רך, והעבר על מידותיך.",
      translation: "Do not be angry and do not be fuming, for anger removes a person from the world. If someone provokes you, give a soft answer and overlook the offense.",
      source: "Sefer HaYirah",
      reflection: "Anger is described by the Sages as a form of temporary insanity that blinds us to truth and God's presence. Rabbeinu Yonah teaches that the peak of self-mastery is responding to provocation with softness. By 'overlooking' (Ma'avir al Midotav), we mirror the Divine quality of mercy, showing that we are larger than the petty insults thrown our way."
    },
    {
      id: 137,
      hebrew: "הוי מקדים שלום לכל אדם, ואילו לנכרי בשוק. ואם הקדימך אדם בשלום, השב לו בנחת רוח ובפנים מאירות.",
      translation: "Be the first to greet every person with peace, even a stranger in the marketplace. If someone greets you first, respond with a pleasant spirit and a shining countenance.",
      source: "Sefer HaYirah",
      reflection: "Rabbeinu Yonah emphasizes that 'Shalom' is not just a greeting, but a tool for creating harmony in the world. Being the first to speak shows that you value the other person's existence. A 'shining countenance' (Panim Meirot) reflects a soul that is at peace with itself and seeks to share that light with others, regardless of who they are."
    },
    {
      id: 138,
      hebrew: "עשה חסד עם מי שצריך לו, בין בגופך בין בממונך. ואל תאמר 'מה לי ולצרה הזאת', כי לכך נוצרת.",
      translation: "Perform acts of kindness for whoever needs it, whether with your body or your money. Do not say, 'What does this trouble have to do with me?' for it was for this purpose that you were created.",
      source: "Sefer HaYirah",
      reflection: "This teaching challenges the instinct of indifference. We often view the problems of others as an inconvenience or 'not our business.' Rabbeinu Yonah flips this perspective: serving others is the very definition of our life's mission. Kindness (Chessed) is not an optional extra; it is the fundamental reason for our existence."
    },
    {
      id: 139,
      hebrew: "הדרך הישרה היא מדה בינונית שבכל דעה ודעה מכל הדעות שיש לו לאדם. והיא הדעה הרחוקה משני הקצוות ריחוק שוה.",
      translation: "The straight path is the middle trait within every character quality that a person possesses. It is the temperament which is equidistant from the two extremes.",
      source: "Rambam (Mishneh Torah, Hilchot De'ot 1:4)",
      reflection: "The Rambam’s 'Golden Path' is a guide for emotional stability. Being a better person isn't about extreme asceticism or extreme indulgence, but about balance. True morality is found in the center—knowing when to be firm and when to be soft, when to spend and when to save, and how to navigate the complex world with moderation."
    },
    {
      id: 140,
      hebrew: "שורש הכל הוא להרגיל את עצמו להיות מהנותנים ולא מהנוטלים.",
      translation: "The root of everything is to habituate oneself to be among the givers and not among the takers.",
      source: "Rav Eliyahu Dessler (Michtav Me'Eliyahu)",
      reflection: "Rav Dessler identifies two primary orientations toward life: the Giver and the Taker. Being a good human being starts with a shift in consciousness—looking at every situation and asking, 'What can I contribute?' rather than 'What can I get?' When we give, we mirror the Creator, who is the ultimate Giver."
    },
    {
      id: 141,
      hebrew: "הוי זהיר במשאך ובמתנך שיהיה באמונה. ואל תגזול ואל תעשוק ואל תסיג גבול רעך.",
      translation: "Be careful that your business dealings are conducted with integrity. Do not rob, do not exploit, and do not encroach upon the boundary of your fellow.",
      source: "Sefer HaYirah",
      reflection: "Holiness is found in the marketplace just as much as in the synagogue. Rabbeinu Yonah reminds us that daily morality is tested most acutely in how we handle money. Integrity (Emunah) in business means that our 'yes' is yes and our 'no' is no, ensuring that our success is never built on the loss or exploitation of another."
    },
    {
      id: 142,
      hebrew: "השמחה היא שער גדול לעבודת השם. וצריך האדם להיות בשמחה תמיד, ובפרט בעת עשיית המצוות.",
      translation: "Joy is a great gate to the service of Hashem. A person should always be in a state of joy, especially while performing the commandments.",
      source: "Orchot Tzaddikim (The Gate of Joy)",
      reflection: "Morality without joy can become heavy and robotic. The Sages teach that joy (Simcha) is a spiritual engine. When we perform acts of goodness with a happy heart, we elevate the act itself. Joy is not a result of our circumstances, but a choice in how we approach our duties to God and our fellow man."
    },
    {
      id: 143,
      hebrew: "עיקר עבודת האדם בעולם הזה היא לשבור את מדותיו הרעות.",
      translation: "The essence of a person's work in this world is to break their negative character traits.",
      source: "Vilna Gaon",
      reflection: "The Vilna Gaon provides a sobering focus: the purpose of our life is self-refinement. We all come into the world with certain 'rough edges'—ego, jealousy, or a quick temper. Life is the workshop where we use the tools of Torah and introspection to smooth those edges and transform ourselves into better versions of who we are."
    },
    {
      id: 144,
      hebrew: "כל אדם צריך לדעת שיש לו נר דולק בתוכו, ואין נרו שלו כנר חברו.",
      translation: "Every person must know that they have a candle burning within them, and their candle is not like their fellow's candle.",
      source: "Rav Kook",
      reflection: "To be a better person, you must recognize your own unique value without comparing yourself to others. Rav Kook reminds us that every soul has a specific 'light' to bring to the world. True morality includes respecting your own unique path and potential, while honoring the fact that everyone else has a different light that the world also needs."
    },
    {
      id: 145,
      hebrew: "אם אין אני משנה את עצמי, איך אשנה את העולם?",
      translation: "If I do not change myself, how can I change the world?",
      source: "Rabbi Israel Salanter",
      reflection: "The Mussar movement, founded by Rabbi Salanter, emphasizes that global change begins with the individual. We often look at the flaws in society and want to fix them, but the most effective way to improve the world is to model the behavior we want to see. Personal integrity is the seed of communal transformation."
    },
    {
      id: 146,
      hebrew: "תקן דבריך והזהר מאוד פן תכזב, כי הכזב תועבת השם יתברך. ויהיה פיך ולבך שווים.",
      translation: "Perfect your speech and be very careful lest you lie, for falsehood is an abomination to the Blessed Name. Let your mouth and your heart be at one.",
      source: "Sefer HaYirah",
      reflection: "Rabbeinu Yonah addresses the gap between our internal thoughts and our external words. To be 'whole' (Tamim), our heart and mouth must match. Honesty isn't just about not telling major lies; it’s about the integrity of being consistent. When you speak with truth, you become a vessel for the Divine presence, which is defined as Truth itself."
    },
    {
      id: 147,
      hebrew: "תקדים שלום לכל אדם. ואל תהי מוציא דבה, ואל תקבל לשון הרע.",
      translation: "Greet every person first. Do not spread gossip, and do not accept evil speech.",
      source: "Sefer HaYirah",
      reflection: "This teaching emphasizes the two sides of speech: positive initiative and negative restraint. Greeting someone shows kindness, but protecting someone's reputation in their absence is a deeper act of character. To 'not accept' Lashon Hara means actively choosing to believe the best of people, even when others are trying to plant seeds of doubt in your mind."
    },
    {
      id: 148,
      hebrew: "תתנהג תמיד לדבר כל דבריך בנחת, לכל אדם ובכל עת, ובזה תנצל מן הכעס.",
      translation: "Always conduct yourself to speak all your words gently, to every person and at all times, and by this you will be saved from anger.",
      source: "Igeret HaRamban",
      reflection: "This famous advice from Nachmanides (Ramban) provides a practical 'hack' for character development. He suggests that if you force your voice to be quiet and gentle, your internal anger will naturally dissipate. Gentleness is not a sign of weakness; it is a sign of supreme self-control. It allows you to navigate conflicts with dignity rather than impulse."
    },
    {
      id: 149,
      hebrew: "והווי משתתף בצער חברך, ושמח בשמחתו, ואהוב אותו כנפשך.",
      translation: "Participate in the pain of your fellow, rejoice in their joy, and love them as your own soul.",
      source: "Sefer HaYirah",
      reflection: "Empathy is the cornerstone of Jewish ethics. Rabbeinu Yonah moves beyond the basic command of 'Love your neighbor' to explain *how* to do it: by emotionally linking your destiny to theirs. When a friend succeeds, feel as though you won; when they suffer, feel their weight. This erodes the barrier of ego and builds a truly unified community."
    },
    {
      id: 150,
      hebrew: "יסוד החסידות ושורש העבודה התמימה הוא שיסדיר האדם ויאמת אצלו מה חובתו בעולמו.",
      translation: "The foundation of piety and the root of perfect service is for a person to clarify and verify for themselves what their duty is in their world.",
      source: "Mesillat Yesharim (Path of the Just, Ch. 1)",
      reflection: "Rabbi Moshe Chaim Luzzatto (The Ramchal) teaches that a moral life begins with clarity of purpose. If we don't know why we are here, we wander aimlessly through life's distractions. Being a 'good human being' requires sitting down and asking: 'What does God want from me in this specific moment?' Clarity leads to consistency."
    },
    {
      id: 151,
      hebrew: "כָּל הַמְרַחֵם עַל הַבְּרִיּוֹת, מְרַחֲמִים עָלָיו מִן הַשָּׁמָיִם.",
      translation: "Whoever is merciful to others, mercy is shown to them from Heaven.",
      source: "Talmud (Shabbat 151b)",
      reflection: "This is a fundamental spiritual law: our treatment of others acts as a mirror for how the Universe treats us. If we want God to be patient with our mistakes, we must be patient with the mistakes of our coworkers, family, and neighbors. Our compassion below opens the gates of compassion above."
    },
    {
      id: 152,
      hebrew: "כל ישראל צריכים להיות אוהבים זה את זה כאיש אחד חברים.",
      translation: "All of Israel must love one another as 'one man, companions.'",
      source: "The Chofetz Chaim (Ahavat Yisrael)",
      reflection: "The Chofetz Chaim dedicated his life to the laws of speech and love. He teaches that we should view the Jewish people as a single body. If the left hand is injured, the right hand doesn't judge it—it helps it. Love for a fellow Jew is not an abstract concept; it is the practical realization that we are fundamentally connected."
    },
    {
      id: 153,
      hebrew: "העולם הזה הוא כמו פרוזדור בפני העולם הבא; התקן עצמך בפרוזדור, כדי שתכנס לטרקלין.",
      translation: "This world is like a corridor before the World to Come; prepare yourself in the corridor, so that you may enter the banquet hall.",
      source: "Pirkei Avot 4:16",
      reflection: "This perspective shift helps us prioritize our daily actions. If we view life as a training ground (the corridor), then challenges and moral dilemmas become opportunities to grow. We don't collect 'things' in a corridor; we prepare our character so that we are ready for the ultimate reality of closeness to God."
    },
    {
      id: 154,
      hebrew: "אל תדין את חברך עד שתגיע למקומו.",
      translation: "Do not judge your fellow until you have reached their place.",
      source: "Pirkei Avot 2:4",
      reflection: "We can never truly know the internal struggles, upbringing, or pressures someone else is facing. This quote is a call for radical humility in our social interactions. Instead of judging a person's failure, we should recognize that we might have done worse had we been in their exact circumstances ('their place')."
    },
    {
      id: 155,
      hebrew: "ודע כי אין לך דבר שמקרב את האדם אל השם יתברך יותר מן הענווה.",
      translation: "Know that there is nothing that brings a person closer to the Blessed Name more than humility.",
      source: "Sefer HaYirah",
      reflection: "Humility (Anavah) is not about thinking you are nothing; it is about realizing that you aren't the center of the universe. In the space created by removing our own ego, there is room for the Divine to enter. A humble person is a better person because they are open to learning, open to others, and open to God."
    },
    {
      id: 156,
      hebrew: "בְּכׇל־עֶ֭צֶב יִהְיֶ֣ה מוֹתָ֑ר וּדְבַר־שְׂ֝פָתַ֗יִם אַךְ־לְמַחְסֽוֹר׃",
      translation: "Every true toil leaves a surplus; mere talk ends in lack.",
      source: "Proverbs 14:23",
      reflection: "Etzev means toil that costs you something - and that cost produces motar, a surplus. Lip-service feels productive because it sounds like progress, but it often ends in machsor, in lack. If you want results, honor effort over explanation."
    },
    {
      id: 157,
      hebrew: "אֵיזוֹ הִיא דֶרֶךְ יְשָׁרָה שֶׁיָּבֹר לוֹ הָאָדָם? כֹּל שֶׁהִיא תִּפְאֶרֶת לְעֹשֶׂיהָ, וְתִפְאֶרֶת לוֹ מִן הָאָדָם.",
      translation: "What is the straight path a person should choose? One that is a crown of glory for its maker, and which earns glory from mankind.",
      source: "Pirkei Avot 2:1",
      reflection: "Rabbi Judah the Prince defines the ideal path not as a compromise, but as a synergy. A deed is truly 'straight' when it brings you internal pride (a 'crown' for your soul) and also earns you genuine respect from your community. This teaches that we should neither be slaves to public opinion nor lone actors who ignore their impact; the sweet spot of ethics is where self-respect and communal respect meet."
    },
    {
      id: 158,
      hebrew: "אַל-תְּבַהֵל בְּרוּחֲךָ לִכְעוֹס, כִּי כַעַס בְּחֵיק כְּסִילִים יָנוּחַ.",
      translation: "Never be rash in your spirit to grow angry, for anger rests in the heart of fools.",
      source: "Ecclesiastes 7:9",
      reflection: "King Solomon distinguishes between a flash of feeling and a state of being. Anger can visit anyone, but it only 'rests' (yanuach) and makes a home in the core of a 'kesil' (fool). This teaches that emotional mastery isn't about never feeling anger, but about refusing to let it become a resident in your soul, where it poisons judgment and corrodes wisdom."
    },
    {
      id: 159,
      hebrew: "לְעוֹלָם יְהֵא אָדָם רַךְ כַּקָּנֶה וְאַל יְהֵא קָשֶׁה כָּאֶרֶז.",
      translation: "A person should always be soft and pliable like a reed, and never be hard and unyielding like a cedar.",
      source: "Talmud, Taanit 20b",
      reflection: "The mighty cedar, in its rigid strength, is snapped by the storm, while the humble reed bends and survives. This Talmudic wisdom reveals that true strength lies in flexibility, not in force. In life's tempests and in our relationships, the ability to adapt, yield, and listen is a greater power than unbending pride."
    },
    {
      id: 160,
      hebrew: "טוֹב אֲרֻחַת יָרָק וְאַהֲבָה-שָׁם, מִשּׁוֹר אָבוּס וְשִׂנְאָה בוֹ.",
      translation: "Better a simple meal of herbs where love is present, than a fattened ox served with hatred.",
      source: "Proverbs 15:17",
      reflection: "This proverb teaches that the emotional atmosphere of a meal is more nourishing than the food itself. A 'fattened ox' was the pinnacle of luxury, yet King Solomon reveals that its flavor turns to ash in the presence of animosity. Love makes scarcity feel like a feast, while hatred makes abundance feel like a prison."
    },
    {
      id: 161,
      hebrew: "נִבְחָר שֵׁם מֵעֹשֶׁר רָב, מִכֶּסֶף וּמִזָּהָב חֵן טוֹב.",
      translation: "A chosen name is greater than great wealth; good grace is better than silver and gold.",
      source: "Proverbs 22:1",
      reflection: "Your 'shem' (name) is your reputation, the invisible currency of your character that follows you everywhere. King Solomon teaches that this inner asset is infinitely more valuable than external riches, which can be lost overnight. 'Chen tov'—a 'good grace' or esteem earned through integrity—is the only treasure that truly endures."
    },
    {
      id: 162,
      hebrew: "דַּעַת אָדָם הֶאֱרִיךְ אַפּוֹ, וְתִפאַרְתּוֹ עֲבֹר עַל-פָּשַׁע.",
      translation: "A person's wisdom makes them slow to anger, and it is their glory to overlook a transgression.",
      source: "Proverbs 19:11",
      reflection: "This proverb offers two profound insights into maturity. First, true 'da'at' (knowledge or wisdom) creates emotional space, allowing you to pause before reacting. Second, the highest expression of character—your 'tiferet' (glory)—is not in winning a fight or proving a point, but in having the strength to consciously 'pass over' an offense."
    },
    {
      id: 163,
      hebrew: "הֱוֵי מַקְדִּים בִּשְׁלוֹם כָּל-אָדָם.",
      translation: "Be the first to extend a greeting of peace to every person.",
      source: "Pirkei Avot 4:15",
      reflection: "This simple instruction from Rabbi Matya ben Heresh is a powerful tool for social and spiritual wellness. To be 'makdim' (first) means taking the initiative to affirm the other person's existence and value, without waiting for them to recognize you. It dissolves tension, dismantles ego, and actively injects 'shalom' (peace, wholeness) into the world, one encounter at a time."
    },
    {
      id: 164,
      hebrew: "בּוֹר כָּרָה וַיַּחְפְּרֵהוּ, וַיִּפֹּל בְּשַׁחַת יִפְעָל.",
      translation: "He dug a pit and hollowed it out, and fell into the very trap he made.",
      source: "Psalm 7:16",
      reflection: "King David observes a fundamental law of spiritual physics: the negative energy you direct at others ultimately ensnares you. Whether through gossip, scheming, or ill will, the 'pit' you dig for someone else becomes your own spiritual prison. This serves as a powerful warning to focus on your own growth rather than on another's downfall."
    },
    {
      id: 165,
      hebrew: "סוֹד יְהוָה לִירֵאָיו, וּבְרִיתוֹ לְהוֹדִיעָם.",
      translation: "The secret of God is for those who fear Him, and His covenant is to make them know.",
      source: "Psalm 25:14",
      reflection: "This verse suggests that the deepest layers of wisdom are not available to the intellectually arrogant, but to the humble. 'Yirah' (fear/awe) creates a receptivity of the soul, allowing one to perceive the 'sod'—the hidden dimension of reality. True knowledge is not grasped, but received, as a gift of the covenant to those who live in reverent relationship with the Divine."
    },
    {
      id: 166,
      hebrew: "וְאָהַבְתָּ אֶת יְהוָה אֱלֹהֶיךָ, בְּכָל-לְבָבְךָ וּבְכָל-נַפְשְׁךָ וּבְכָל-מְאֹדֶךָ.",
      translation: "And you shall love the Lord your God with all your heart, with all your soul, and with all your might/possessions.",
      source: "Deuteronomy 6:5",
      reflection: "This core Jewish declaration demands a total fusion of love and life. 'With all your heart' means with both your good and bad inclinations (redirecting them for holy purpose). 'With all your soul' means even to the point of giving your life. And 'with all your me'odecha' (your 'very-ness' or might) means dedicating all your resources—your money, your talents, your energy—to this singular, all-encompassing love."
    },
    {
      id: 167,
      hebrew: "כִּי אָדָם לְעָמָל יוּלָּד.",
      translation: "For a person is born for toil.",
      source: "Job 5:7",
      reflection: "This verse is not a curse, but a statement of purpose. 'Amal' (toil) is the engine of human growth and achievement. We are not born to a life of ease, but to a life of meaningful effort, through which we build ourselves and the world."
    },
    {
      id: 168,
      hebrew: "אַל-תּוֹכַח לֵץ פֶּן-יִשְׂנָאֶךָּ, הוֹכַח לְחָכָם וְיֶאֱהָבֶךָּ.",
      translation: "Do not correct a scoffer, lest he hate you; correct a wise person, and they will love you.",
      source: "Proverbs 9:8",
      reflection: "This is a masterclass in emotional intelligence. A 'letz' (scoffer) is someone whose ego is too fragile for correction, so they react with hatred. A 'chacham' (wise person) craves growth and sees correction not as an insult, but as a gift. Choose your audience for feedback; invest your energy where it can bear fruit."
    },
    {
      id: 169,
      hebrew: "לֵב חָכָם לִימִינוֹ, וְלֵב כְּסִיל לִשְׂמֹאלוֹ.",
      translation: "The heart of the wise inclines to the right, but the heart of a fool to the left.",
      source: "Ecclesiastes 10:2",
      reflection: "In Jewish tradition, the 'right' side represents 'chesed' (kindness) and strength, while the 'left' can symbolize strict judgment or weakness. A wise heart naturally inclines toward constructive paths, while a foolish heart gets entangled in self-destructive detours. It's a reminder that our orientation—where our heart naturally leans—determines our destination."
    },
    {
      id: 170,
      hebrew: "טוֹבִים הַשְּׁנַיִם מִן-הָאֶחָד, אֲשֶׁר יֵשׁ-לָהֶם שָׂכָר טוֹב בַּעֲמָלָם.",
      translation: "Two are better than one, for they have a good reward for their labor.",
      source: "Ecclesiastes 4:9",
      reflection: "King Solomon champions the power of partnership. Whether in marriage, business, or friendship, collaboration yields a 'sachar tov' (good reward) that is more than just double the output. It provides support ('if they fall, one will lift up his fellow'), warmth, and strength, turning solitary toil into shared success."
    },
    {
      id: 171,
      hebrew: "שֹׁמֵר פִּיו וּלְשׁוֹנוֹ, שֹׁמֵר מִצָּרוֹת נַפְשׁוֹ.",
      translation: "One who guards their mouth and their tongue, guards their soul from troubles.",
      source: "Proverbs 21:23",
      reflection: "The mouth is the gateway to the soul's troubles. An unguarded tongue can lead to broken relationships, missed opportunities, and deep regret. King Solomon teaches that self-control in speech is not just a social grace but a form of spiritual self-preservation."
    },
    {
      id: 172,
      hebrew: "הַדֶּרֶךְ הַיְשָׁרָה--הִיא מִדָּה בֵּינוֹנִית שֶׁבְּכָל דֵּעָה וְדֵעָה.",
      translation: "The straight path is the middle road in every single trait.",
      source: "Rambam, Mishneh Torah, De'ot 1:4",
      reflection: "Maimonides defines the 'Golden Mean' as the ideal path for character development. Virtue is not found in extremes—not in asceticism or indulgence, not in recklessness or cowardice. The 'straight path' is a life of balance, cultivating each character trait in a moderate, centered way."
    },
    {
      id: 173,
      hebrew: "מִי שֶׁטָּרַח בְּעֶרֶב שַׁבָּת, יֹאכַל בְּשַׁבָּת.",
      translation: "He who toils on the eve of Shabbat will eat on Shabbat.",
      source: "Talmud, Avodah Zarah 3a",
      reflection: "This is both a practical and a metaphorical truth. To enjoy the rest and holiness of Shabbat, one must prepare beforehand. In life, to enjoy periods of peace, success, or spiritual connection ('Shabbat'), one must put in the 'Erev Shabbat' work of effort, planning, and self-development."
    },
    {
      id: 174,
      hebrew: "לֹא הַבַּיישָׁן לָמֵד, וְלֹא הַקַּפְּדָן מְלַמֵּד.",
      translation: "The shy person cannot learn, and the impatient person cannot teach.",
      source: "Pirkei Avot 2:5",
      reflection: "Hillel the Elder identifies the two enemies of education. A learner must have the courage to ask questions and appear ignorant. A teacher must have the patience to explain and re-explain without anger. Both learning and teaching require a vulnerability that ego cannot tolerate."
    },
    {
      id: 175,
      hebrew: "אִם אֵין בִּינָה, אֵין דַּעַת. אִם אֵין דַּעַת, אֵין בִּינָה.",
      translation: "If there is no understanding, there is no knowledge. If there is no knowledge, there is no understanding.",
      source: "Pirkei Avot 3:17",
      reflection: "This chicken-and-egg paradox highlights the relationship between 'Binah' (deep understanding, connecting ideas) and 'Da'at' (raw knowledge, facts). You cannot build a structure of understanding without the bricks of knowledge. But without a framework of understanding, knowledge remains a disconnected pile of facts. True wisdom requires both."
    },
    {
      id: 176,
      hebrew: "עַל שְׁלשָׁה דְבָרִים הָעוֹלָם קַיָּם: עַל הַדִּין וְעַל הָאֱמֶת וְעַל הַשָּׁלוֹם.",
      translation: "On three things the world stands: on Justice, on Truth, and on Peace.",
      source: "Pirkei Avot 1:18",
      reflection: "Rabban Shimon ben Gamliel identifies the three pillars of a stable society. Without 'Din' (just laws), society descends into chaos. Without 'Emet' (truth and integrity), there can be no trust. And without 'Shalom' (peace and harmony), life is a constant battle. These three values are interdependent and form the bedrock of civilization."
    },
    {
      id: 177,
      hebrew: "מַרְפֵּא לָשׁוֹן עֵץ חַיִּים, וְסֶלֶף בָּהּ שֶׁבֶר בְּרוּחַ.",
      translation: "A healing tongue is a tree of life, but perversity in it breaks the spirit.",
      source: "Proverbs 15:4",
      reflection: "Speech has the power to create or to destroy. A 'marpeh lashon'—a tongue that brings healing, comfort, and encouragement—is like a 'tree of life,' nourishing all who hear it. In contrast, twisted or deceitful words ('selef') inflict a 'shever b'ruach'—a crushing blow to a person's spirit. This proverb reminds us to be conscious of our words, as they are the architects of emotional life and death."
    },
    {
      id: 178,
      hebrew: "יוֹתֵר מִשֶּׁיִּשְׂרָאֵל שָׁמְרוּ אֶת הַשַּׁבָּת, שָׁמְרָה הַשַּׁבָּת אוֹתָם.",
      translation: "More than Israel has kept the Sabbath, the Sabbath has kept them.",
      source: "Ahad Ha'am",
      reflection: "This famous observation captures the reciprocal relationship between the Jewish people and Shabbat. On the surface, we are the guardians of Shabbat, observing its laws and preserving its sanctity. But on a deeper level, Shabbat has been our guardian, preserving our identity, our families, and our spiritual core through millennia of dispersion and assimilation. It is a sanctuary in time that has kept the Jewish soul intact."
    },
    {
      id: 179,
      hebrew: "אַל יֵצֵא הַדָּבָר מִפִּיךָ, אֶלָּא אִם כֵּן תֵּדַע שֶׁהוּא אֱמֶת וְצֹרֶךְ.",
      translation: "Let nothing leave your mouth unless you know it is true and necessary.",
      source: "Chofetz Chaim",
      reflection: "The Chofetz Chaim, the great sage of proper speech, provides two simple but powerful filters for our words: Is it true? And is it necessary? This discipline prevents us from engaging in gossip (which may be true but is not necessary) and falsehoods. By pausing to apply these two tests, we can transform our speech from a source of conflict into a tool for connection and integrity."
    },
    {
      id: 180,
      hebrew: "כָּל הַתְחָלוֹת קָשׁוֹת.",
      translation: "All beginnings are difficult.",
      source: "Mekhilta d'Rabbi Yishmael",
      reflection: "This ancient maxim is a source of profound encouragement. Whether starting a new project, a new relationship, or a new spiritual practice, the initial phase is always the hardest due to inertia and unfamiliarity. Recognizing this as a universal principle, rather than a personal failing, gives us the perseverance to push through the initial friction and reach a state of momentum."
    },
    {
      id: 181,
      hebrew: "שִׂמְחָה שֶׁאֵינָהּ מִן הַמִּצְוָה – אַל תִּשְׂמַח בָּהּ.",
      translation: "In any joy that does not come from a mitzvah, do not rejoice.",
      source: "Sefer Chassidim",
      reflection: "This teaching asks us to examine the source of our happiness. Joy derived from materialism, ego, or the misfortune of others is fleeting and ultimately hollow. True, enduring simcha is found in acts of connection, creation, and holiness—in the fulfillment of our purpose. This is a call to align our sources of pleasure with our deepest values."
    },
    {
      id: 182,
      hebrew: "אֵין אָדָם לוֹמֵד תּוֹרָה אֶלָּא מִמָּקוֹם שֶׁלִּבּוֹ חָפֵץ.",
      translation: "A person only truly learns Torah from a place that their heart desires.",
      source: "Talmud, Avodah Zarah 19a",
      reflection: "The Sages understood that true learning is not a matter of force-feeding information, but of igniting passion. You can be exposed to endless knowledge, but it will only become a part of you when your 'lev chafetz'—your heart desires it. This teaches us to find the area of Torah that speaks to our unique soul, for that is where our greatest growth will occur."
    },
    {
      id: 183,
      hebrew: "הַכֹּל בִּידֵי שָׁמַיִם, חוּץ מִיִּרְאַת שָׁמַיִם.",
      translation: "Everything is in the hands of Heaven, except for the fear/awe of Heaven.",
      source: "Talmud, Berakhot 33b",
      reflection: "This famous Talmudic statement defines the boundaries of free will. The external circumstances of our lives—our wealth, health, and family—are ultimately decreed by God. But the one thing that is entirely in our control is our 'Yirat Shamayim'—our internal response of awe, reverence, and moral choice. This is the realm where our true spiritual work is done."
    },
    {
      id: 184,
      hebrew: "לֹא בַשָּׁמַיִם הִיא.",
      translation: "It is not in heaven.",
      source: "Deuteronomy 30:12",
      reflection: "When discussing the Torah, Moses makes this radical declaration: it is not an inaccessible, otherworldly code. It is here on earth, within human reach, meant to be understood and practiced in our daily lives. This verse empowers us, teaching that we don't need to be angels to live a holy life; we have all the tools we need right here."
    },
    {
      id: 185,
      hebrew: "גּוֹל עַל-יְהוָה דַּרְכֶּךָ, וּבְטַח עָלָיו וְהוּא יַעֲשֶׂה.",
      translation: "Roll your way upon the Lord; trust in Him, and He will act.",
      source: "Psalm 37:5",
      reflection: "The Hebrew 'Gol' means to 'roll,' as if you are rolling a heavy burden off your own shoulders and onto God's. This is the essence of 'bitachon' (trust). It's not about being passive, but about doing your part ('your way') and then consciously releasing the outcome to a higher power. It's an active letting go, which is the key to inner peace."
    },
    {
      id: 186,
      hebrew: "הֲפֹךְ בָּהּ וַהֲפֹךְ בָּהּ, דְּכֹלָּא בָהּ.",
      translation: "Turn it and turn it, for everything is in it.",
      source: "Pirkei Avot 5:22",
      reflection: "Ben Bag Bag's teaching on the Torah is a call for relentless engagement. The Torah is not a book to be read once, but a multi-layered reality to be explored endlessly. The more you 'turn it'—examining it from different angles and at different stages of life—the more you will discover that 'everything is in it': all wisdom, all guidance, and all insight into the human condition."
    },
    {
      id: 187,
      hebrew: "כִּי גָבֹהַּ מֵעַל גָּבֹהַּ שֹׁמֵר, וּגְבֹהִים עֲלֵיהֶם.",
      translation: "For a watcher watches from above the powerful, and there are higher ones above them.",
      source: "Ecclesiastes 5:7",
      reflection: "This is a powerful antidote to injustice and despair. King Solomon reminds us that no human authority is ultimate. There is always a higher Watcher, a higher court of justice. This awareness fosters both humility in the powerful and hope in the powerless."
    },
    {
      id: 188,
      hebrew: "אֵין הַקָּדוֹשׁ בָּרוּךְ הוּא מַקְפִּיחַ שְׂכַר כָּל בְּרִיָּה.",
      translation: "The Holy One, Blessed be He, does not withhold the reward of any creature.",
      source: "Talmud, Pesachim 118a",
      reflection: "This principle assures us that no good deed, no matter how small or unnoticed, is ever lost. Every effort, every kind word, every act of integrity is recorded and valued in the cosmic economy. It encourages us to act righteously even when there is no immediate recognition, trusting that all positive actions have eternal significance."
    },
    {
      id: 189,
      hebrew: "לֹא-תִקֹּם וְלֹא-תִטֹּר אֶת-בְּנֵי עַמֶּךָ.",
      translation: "You shall not take vengeance, nor bear a grudge against the children of your people.",
      source: "Leviticus 19:18",
      reflection: "This commandment goes deeper than just action; it targets the internal state. 'Nekama' (vengeance) is the act of retaliation, but 'netira' (grudge-bearing) is the toxic residue left in the heart. The Torah commands us not only to refrain from revenge but also to cleanse our hearts of the resentment that poisons us from within."
    },
    {
      id: 190,
      hebrew: "הֱוֵי זָנָב לַאֲרָיוֹת, וְאַל תְּהִי רֹאשׁ לַשּׁוּעָלִים.",
      translation: "Be a tail to lions, and not a head to foxes.",
      source: "Pirkei Avot 4:15",
      reflection: "This proverb is a guide for choosing your environment. It's better to be the least important person among great, wise, and righteous individuals (lions) than to be the leader of a group of petty, cunning, and mediocre people (foxes). Surrounding yourself with greatness, even in a humble position, will elevate you more than being the king of a small and compromised world."
    },
    {
      id: 191,
      hebrew: "בְּרֹב חָכְמָה, רָב-כָּעַס.",
      translation: "In much wisdom, there is much vexation.",
      source: "Ecclesiastes 1:18",
      reflection: "King Solomon observes a painful truth: the more you understand about the world, the more you see its flaws, injustices, and foolishness, which can lead to 'ka'as' (vexation, frustration). This isn't a warning against wisdom, but a realistic preparation for its burdens. It teaches that a part of wisdom is learning how to carry the sorrows of a broken world without being broken by them."
    },
    {
      id: 192,
      hebrew: "כָּל הַפּוֹסֵל, בְּמוּמוֹ פּוֹסֵל.",
      translation: "Whoever disqualifies another, disqualifies them with their own flaw.",
      source: "Talmud, Kiddushin 70b",
      reflection: "This is the classic Jewish statement on psychological projection. The flaws we are quickest to notice and condemn in others are often a reflection of our own hidden insecurities and unaddressed faults. The Sages teach us to view our criticism of others as a mirror, prompting us to look inward and work on ourselves first."
    },
    {
      id: 193,
      hebrew: "שֶׁבֶת אָחִים גַם יָחַד.",
      translation: "When brothers dwell also in unity.",
      source: "Psalm 133:1",
      reflection: "The key word is 'gam' (also). Brothers can dwell together in the same house but be emotionally distant. The beauty and blessing of this verse are realized only when they are 'gam yachad'—also in true unity of heart and purpose. It is a call not just for proximity, but for genuine connection."
    },
    {
      id: 194,
      hebrew: "אֵיזֶהוּ הֶחָכָם? הָרוֹאֶה אֶת הַנּוֹלָד.",
      translation: "Who is wise? One who sees what is being born.",
      source: "Talmud, Tamid 32a",
      reflection: "A wise person isn't just someone who knows the past, but someone who has foresight—who can see the 'nolad' (that which is being born) from the present situation. They can anticipate the consequences of actions and trends. This is a call to cultivate long-term thinking, to look beyond immediate gratification and understand where today's choices will lead tomorrow."
    },
    {
      id: 195,
      hebrew: "הַיּוֹם קָצָר, וְהַמְּלָאכָה מְרֻבָּה.",
      translation: "The day is short, and the work is great.",
      source: "Pirkei Avot 2:15",
      reflection: "This teaching from Rabbi Tarfon is a powerful call to action. Our time on earth is limited, but the 'work'—the task of perfecting ourselves and the world (Tikkun Olam)—is immense. It's not meant to create anxiety, but to instill a sense of urgency and purpose, encouraging us to make every moment count."
    },
    {
      id: 196,
      hebrew: "לִבְרֹחַ מִן הַכָּבוֹד.",
      translation: "Flee from honor.",
      source: "Pirkei Avot 6:5",
      reflection: "This is not a call for low self-esteem, but a warning against becoming addicted to public approval. Chasing 'kavod' (honor) makes you a slave to the opinions of others. By 'fleeing' from it, you are free to act with integrity, doing what is right even when no one is watching or applauding. True honor is a byproduct of righteous action, not its goal."
    },
    {
      id: 197,
      hebrew: "דְּרָכֶיהָ דַרְכֵי-נֹעַם, וְכָל-נְתִיבוֹתֶיהָ שָׁלוֹם.",
      translation: "Her ways are ways of pleasantness, and all her paths are peace.",
      source: "Proverbs 3:17",
      reflection: "This verse describes the Torah. It teaches that a life of true Torah observance is not one of harshness or anxiety, but one of 'noam' (pleasantness) and 'shalom' (peace). If your spiritual path is leading you to bitterness and conflict, you may have strayed from the Torah's essential nature."
    },
    {
      id: 198,
      hebrew: "אַל תְּדַבֵּר צָרוֹת שֶׁל אֲחֵרִים, כִּי הַדְּבָרִים נִרְשָׁמִים וְהָאֹזֶן שׁוֹמַעַת.",
      translation: "Do not speak of the troubles of others, for the words are recorded and the ear is listening.",
      source: "Baal Shem Tov",
      reflection: "The Baal Shem Tov warns that speech is never a neutral act. Every word we utter about another person is 'recorded' in the spiritual cosmos. More importantly, our own 'ear is listening,' and speaking negatively about others trains our own soul to focus on negativity, which ultimately harms us more than anyone else."
    },
    {
      id: 199,
      hebrew: "אֵין שִׂמְחָה כְּהַתָּרַת הַסְּפֵקוֹת.",
      translation: "There is no joy like the resolution of doubts.",
      source: "Rabbi Nachman of Breslov",
      reflection: "Doubt ('safek') is a form of mental and spiritual paralysis. It drains our energy and prevents us from moving forward with confidence. Rabbi Nachman teaches that the 'simcha' (joy) that comes from achieving clarity—from resolving a doubt and finding a clear path forward—is one of the most profound and liberating forms of happiness."
    },
    {
      id: 200,
      hebrew: "לְךָ דֻמִיָּה תְהִלָּה.",
      translation: "To You, silence is praise.",
      source: "Psalm 65:2",
      reflection: "While we often think of praise as loud songs and eloquent prayers, King David teaches that sometimes the highest form of praise is 'dumiyah'—deep, contemplative silence. In the face of the Infinite, words can feel inadequate. Sometimes, the most profound way to connect with God is to quiet the mind and simply be present in awe."
    },
    {
      id: 201,
      hebrew: "כָּל הַכּוֹעֵס, כְּאִילּוּ עוֹבֵד עֲבוֹדָה זָרָה.",
      translation: "Anyone who gets angry, it is as if they are worshipping idols.",
      source: "Talmud, Shabbat 105b",
      reflection: "This shocking comparison reveals the spiritual danger of anger. When we are enraged, our ego becomes the center of the universe, and we effectively 'worship' our own will, demanding that reality conform to our desires. Anger displaces God as the true center of reality, making it a form of idolatry."
    },
    {
      id: 202,
      hebrew: "הַמַּאֲרִיךְ בִּתְפִלָּתוֹ, אֵין תְּפִלָּתוֹ חוֹזֶרֶת רֵיקָם.",
      translation: "One who is patient in their prayer, their prayer does not return empty.",
      source: "Talmud, Berakhot 32b",
      reflection: "This doesn't mean to pray with excessive length, but to have patience *with* the process of prayer. Don't give up if you don't see immediate results. Consistent, heartfelt prayer, offered with the trust that it is being heard, will eventually have an effect, even if not in the way you expect."
    },
    {
      id: 203,
      hebrew: "מִצְוַת עֲשֵׂה שֶׁהַזְּמַן גְּרָמָא.",
      translation: "A positive commandment that is caused by time.",
      source: "Talmud, Kiddushin 29a",
      reflection: "This legal category from the Talmud has a deep spiritual lesson. Certain mitzvot are only available at specific times (e.g., hearing the shofar on Rosh Hashanah). It teaches us that time itself creates spiritual opportunities. We must be awake and ready to act when these 'time-bound' moments of potential holiness arrive, lest they pass us by."
    },
    {
      id: 204,
      hebrew: "וְהָיִיתָ אַךְ שָׂמֵחַ.",
      translation: "And you shall be nothing but joyful.",
      source: "Deuteronomy 16:15",
      reflection: "This commandment, given in the context of the festival of Sukkot, is a radical call to cultivate pure joy. It's not just about 'being happy,' but about achieving a state where joy is your dominant reality ('ach sameach' - 'only joyful'). This suggests that with the right spiritual focus, we can train ourselves to access a state of profound, unadulterated gladness."
    },
    {
      id: 205,
      hebrew: "אֵין בָּרָכָה שְׁרוּיָה אֶלָּא בְּדָבָר הַסָּמוּי מִן הָעַיִן.",
      translation: "Blessing rests only on that which is hidden from the eye.",
      source: "Talmud, Taanit 8b",
      reflection: "This mystical concept teaches that things which are flaunted, measured, and overly publicized lose their 'bracha' (blessing). True blessing thrives in modesty and privacy, away from the 'evil eye' of envy and comparison. It encourages a life of inner richness over outer showmanship."
    },
    {
      id: 206,
      hebrew: "יָגַעְתִּי וּמָצָאתִי, תַּאֲמִין.",
      translation: "If someone says 'I have toiled and I have found,' believe them.",
      source: "Talmud, Megillah 6b",
      reflection: "The Sages teach that true wisdom or spiritual attainment is not found by accident. It is the result of 'yegiah'—intense, focused toil. This verse is a testament to the power of human effort. If you put in the sincere work, you are guaranteed to 'find' what you are seeking."
    },
    {
      id: 207,
      hebrew: "כָּל זְמַן שֶׁהַנֵּר דּוֹלֵק, אֶפְשָׁר לְתַקֵּן.",
      translation: "As long as the candle is burning, it is possible to repair.",
      source: "Rabbi Israel Salanter",
      reflection: "This powerful metaphor teaches that as long as we are alive (the 'candle is burning'), the opportunity for 'tikkun' (repair) and 'teshuvah' (return) exists. No mistake is final, and no situation is hopeless. It is a profound call to never give up on ourselves or on the possibility of positive change."
    },
    {
      id: 208,
      hebrew: "הַמְקַנֵּא בְּחַבֵרוֹ, אֵין לוֹ מְנוּחָה.",
      translation: "One who is envious of their friend has no peace of mind.",
      source: "Avot d'Rabbi Natan 28:2",
      reflection: "Envy is a thief of joy. By constantly comparing our lives to others, we rob ourselves of 'menucha' (peace, rest). This teaching reminds us that contentment is found not in having what our neighbor has, but in appreciating our own unique portion."
    },
    {
      id: 209,
      hebrew: "בְּמָקוֹם שֶׁאֵין אֲנָשִׁים, הִשְׁתַּדֵּל לִהְיוֹת אִישׁ.",
      translation: "In a place where there are no 'men,' strive to be a 'man.'",
      source: "Pirkei Avot 2:5",
      reflection: "The term 'ish' here means more than just a person; it implies a mensch, a person of integrity and responsibility. Hillel's teaching is a call to leadership and moral courage. When you find yourself in a situation lacking in leadership, ethics, or responsibility, it is your duty to step up and fill that void."
    },
    {
      id: 210,
      hebrew: "כָּל הַמַּצִּיל נֶפֶשׁ אַחַת מִיִּשְׂרָאֵל, כְּאִלּוּ הִצִּיל עוֹלָם מָלֵא.",
      translation: "Whoever saves a single Jewish soul, it is as if they have saved an entire world.",
      source: "Mishnah, Sanhedrin 4:5",
      reflection: "This foundational teaching establishes the infinite value of every individual. A single person is a universe of potential, of relationships, of future generations. Therefore, the act of saving one life—whether physically or spiritually—is an act of cosmic significance."
    },
    {
      id: 211,
      hebrew: "שְׁתִיקָה לַחֲכָמִים, קַל וָחֹמֶר לַטִּפְּשִׁים.",
      translation: "If silence is good for the wise, how much more so for the foolish.",
      source: "Talmud, Pesachim 99a",
      reflection: "This is a classic 'kal vachomer' (a fortiori) argument from the Talmud. If even wise people, who have valuable things to say, benefit from practicing silence, then how much more should foolish people, whose words often cause damage, practice restraint. It's a witty reminder for everyone to appreciate the virtue of holding one's tongue."
    },
    {
      id: 212,
      hebrew: "מִי שֶׁיֵּשׁ בּוֹ דֵּעָה, כְּאִלּוּ נִבְנָה בֵּית הַמִּקְדָּשׁ בְּיָמָיו.",
      translation: "For whoever has 'da'at' (wisdom/consciousness), it is as if the Holy Temple was built in their days.",
      source: "Talmud, Menachot 110a",
      reflection: "The Beit HaMikdash (Holy Temple) was the central point of connection between the divine and the human. The Sages teach that 'da'at'—a deep, integrated consciousness of God's presence in the world—can turn our own lives into a personal sanctuary. Lacking this consciousness is like living in a world where the Temple is in ruins."
    },
    {
      id: 213,
      hebrew: "אַל תְּהִי רָשָׁע בִּפְנֵי עַצְמְךָ.",
      translation: "Do not be wicked in your own eyes.",
      source: "Pirkei Avot 2:13",
      reflection: "This can be interpreted in two profound ways. First, don't secretly do things you know are wrong, even if no one else sees. Second, don't give up on yourself and resign yourself to being a 'rasha' (wicked person). Maintain your own self-respect and believe in your capacity to do good."
    },
    {
      id: 214,
      hebrew: "עֲשֵׂה תוֹרָתְךָ קֶבַע.",
      translation: "Make your Torah study fixed.",
      source: "Pirkei Avot 1:15",
      reflection: "Shammai teaches that spiritual growth cannot be left to random inspiration. Just as you have fixed times for eating and sleeping, you must establish a 'keva'—a fixed, non-negotiable time—for Torah study. This consistency is what builds a life of wisdom, rather than one of sporadic good intentions."
    },
    {
      id: 215,
      hebrew: "הַקִּנְאָה וְהַתַּאֲוָה וְהַכָּבוֹד, מוֹצִיאִין אֶת הָאָדָם מִן הָעוֹלָם.",
      translation: "Envy, lust, and the pursuit of honor remove a person from the world.",
      source: "Pirkei Avot 4:21",
      reflection: "These three powerful desires are described as forces that 'remove a person from the world.' While the person may still be physically alive, they are spiritually and emotionally absent, their life force consumed by a toxic obsession with what they lack (envy), what they want (lust), and how they are perceived (honor). True life is found when one is freed from these internal tyrants."
    },
    {
      id: 216,
      hebrew: "אִם לֹא תֵדְעִי לָךְ הַיָּפָה בַּנָּשִׁים, צְאִי-לָךְ בְּעִקְבֵי הַצֹּאן.",
      translation: "If you do not know yourself, O most beautiful among women, go out in the footsteps of the flock.",
      source: "Song of Songs 1:8",
      reflection: "The Midrash interprets this as a message to the Jewish soul. When you feel lost ('if you do not know yourself'), the path back to clarity is to follow the 'footsteps of the flock'—to connect with the traditions and the community of those who came before you. Our collective history is the map for our personal journey."
    },
    {
      id: 217,
      hebrew: "הַיּוֹצֵא מִדָּבָר שֶׁבְּחֶטְאוֹ, כְּיוֹצֵא מִן הַחַיִּים.",
      translation: "One who benefits from a transgression is like one who has departed from life.",
      source: "Derech Eretz Zuta 1",
      reflection: "This stark teaching emphasizes that any gain derived from a wrongful act is a spiritual death. The benefit is illusory, as it disconnects the soul from its source of true vitality. It's a powerful reminder that the 'how' of our achievements matters more than the 'what.'"
    },
    {
      id: 218,
      hebrew: "לְעוֹלָם יַרְגִּיל אָדָם עַצְמוֹ לוֹמַר, \"כָּל מַה דְּעָבִיד רַחֲמָנָא, לְטָב עָבִיד.\"",
      translation: "A person should always accustom themselves to say, 'Whatever the Merciful One does, He does for the good.'",
      source: "Talmud, Berakhot 60b",
      reflection: "This is the mantra of Nahum Ish Gamzu, a practice of cultivating deep faith. It's not about denying pain or difficulty, but about training the mind to look for the ultimate good within every situation. It is an active habit ('yargil') of building trust that there is a higher purpose, even when it is hidden from our view."
    },
    {
      id: 219,
      hebrew: "אֵיזֶהוּ עָשִׁיר? כָּל שֶׁיֵּשׁ לוֹ נַחַת רוּחַ בְּעָשְׁרוֹ.",
      translation: "Who is rich? Whoever has peace of mind in their wealth.",
      source: "Avot d'Rabbi Natan 28:4",
      reflection: "This teaching refines the famous definition of wealth. It's not enough to be 'happy with one's portion.' True wealth is having 'nachat ruach'—a settled spirit, a tranquil mind—in the midst of your possessions. If your wealth brings you anxiety, sleepless nights, and constant fear of loss, then you are not truly rich."
    },
    {
      id: 220,
      hebrew: "כָּל דָּבָר שֶׁבַּמִּנְיָן, לֹא בָּטֵל.",
      translation: "Anything that is counted cannot be nullified.",
      source: "Talmud, Beitzah 3b",
      reflection: "This legal principle has a profound spiritual application. Anything that we deem important enough to 'count'—to give our attention and focus to—cannot be dismissed or considered insignificant. It's a reminder to be mindful of what we choose to focus on, as our attention itself imbues things with power and reality in our lives."
    },
    {
      id: 221,
      hebrew: "אֲפִילוּ חֶרֶב חַדָּה מוּנַחַת עַל צַוָּארוֹ שֶׁל אָדָם, אַל יִמְנַע עַצְמוֹ מִן הָרַחֲמִים.",
      translation: "Even if a sharp sword is resting on a person's neck, they should not prevent themselves from seeking mercy.",
      source: "Talmud, Berakhot 10a",
      reflection: "This is the ultimate statement of hope against hopelessness. Even in the most dire and seemingly final moments, we are forbidden from giving up on the possibility of 'rachamim' (mercy). It teaches that despair itself is the greatest sin, and that the door to prayer and return is never, ever closed."
    },
    {
      id: 222,
      hebrew: "לֹא לְךָ הַמְּלָאכָה לִגְמֹר, וְלֹא אַתָּה רַשַּׁאי לְהִבָּטֵל מִמֶּנָּה.",
      translation: "It is not upon you to finish the work, and you are not at liberty to desist from it.",
      source: "Pirkei Avot 2:16 (alternate translation)",
      reflection: "Rabbi Tarfon's teaching is the perfect balance between responsibility and humility. We are not expected to single-handedly solve the world's problems, which protects us from burnout and despair. However, we are also not allowed to use the enormity of the task as an excuse for inaction. We must simply do our part."
    },
    {
      id: 223,
      hebrew: "הַמַּלְבִּין פְּנֵי חֲבֵרוֹ בָּרַבִּים, כְּאִלּוּ שׁוֹפֵךְ דָּמִים.",
      translation: "One who shames his friend in public, it is as if he spills blood.",
      source: "Talmud, Bava Metzia 58b",
      reflection: "The Sages understood that public humiliation is a form of spiritual murder. It causes the blood to drain from the victim's face, and it kills a part of their soul. This teaching serves as a visceral reminder of the immense power of our words and the sacred duty to protect the dignity of every individual."
    },
    {
      id: 224,
      hebrew: "בְּנֵה בֵיתְךָ, נְטַע כַּרְמֶךָ, וְאַחַר כָּךְ תִּשָּׂא אִשָּׁה.",
      translation: "Build your house, plant your vineyard, and after that, take a wife.",
      source: "Talmud, Sotah 44b",
      reflection: "The Talmud offers this practical advice on the proper order of life. First, establish your 'house' (a place to live), then your 'vineyard' (a livelihood), and only then take on the responsibilities of marriage. It is a timeless lesson in the importance of creating stability and self-sufficiency before entering into life's most sacred commitments."
    },
    {
      id: 225,
      hebrew: "גָּדוֹל הַמְעַשֶּׂה יוֹתֵר מִן הָעוֹשֶׂה.",
      translation: "Greater is the one who causes others to do, than the one who does.",
      source: "Talmud, Bava Batra 9a",
      reflection: "This teaching elevates the role of the teacher, the leader, and the facilitator. While personal good deeds are important, the one who inspires, enables, and empowers many others to act has a far greater impact on the world. It encourages us to think not just about our own actions, but about how we can be a catalyst for goodness in others."
    },
    {
      id: 226,
      hebrew: "אִם תִּרְצֶה, אֵין זוֹ אַגָּדָה.",
      translation: "If you will it, it is no dream.",
      source: "Theodor Herzl",
      reflection: "While a modern quote, this statement has become a foundational text of Jewish national aspiration and is rooted in the biblical concept of the power of will and action. It is a powerful reminder that the gap between 'aggadah' (a story, a legend) and reality is bridged by 'ratzon'—a deep, unwavering will. What seems like a fantasy can become history if we are determined enough to make it so."
    },
    {
      id: 227,
      hebrew: "כָּל הַמְקַיֵּם אֶת הַתּוֹרָה מֵעֹנִי, סוֹפוֹ לְקַיְּמָהּ מֵעֹשֶׁר.",
      translation: "Whoever fulfills the Torah out of poverty, their end will be to fulfill it out of wealth.",
      source: "Pirkei Avot 4:9",
      reflection: "This teaches the power of commitment in the face of adversity. One who prioritizes Torah study and mitzvot even when it is difficult ('me'oni' - from poverty) demonstrates a profound level of dedication. That spiritual investment, the Sages promise, will ultimately lead to a life of abundance ('me'osher' - from wealth), both spiritual and physical."
    },
    {
      id: 228,
      hebrew: "לֹא הַקַּפְּדָן מְלַמֵּד.",
      translation: "The impatient person cannot teach.",
      source: "Pirkei Avot 2:5",
      reflection: "Hillel's wisdom is a crucial reminder for anyone in a position of leadership or education. A 'kapdan'—a person who is short-tempered, strict, and easily angered—creates an atmosphere of fear, not learning. True teaching requires immense patience and the ability to meet the student where they are, without frustration."
    },
    {
      id: 229,
      hebrew: "הֱוֵי מִתְאַבֵּק בַּעֲפַר רַגְלֵיהֶם.",
      translation: "Sit in the dust of their feet.",
      source: "Pirkei Avot 1:4",
      reflection: "This is a vivid image of what it means to be a dedicated student. It's not about passive listening, but about deep, humble engagement with a teacher—following them, absorbing their wisdom, and being close enough to be covered in the 'dust' stirred up by their walking. It implies a total commitment to learning from a master."
    },
    {
      id: 230,
      hebrew: "אִם אֵין דַּעַת, הַבְדָּלָה מִנַּיִן?",
      translation: "If there is no knowledge, from where comes discernment?",
      source: "Jerusalem Talmud, Berakhot 5:2",
      reflection: "This rhetorical question is the basis for adding a prayer for 'da'at' (knowledge) into the Havdalah service that separates Shabbat from the weekday. 'Havdalah' (discernment) between the holy and the mundane, the permitted and the forbidden, is not possible without knowledge. It teaches that morality and spirituality are not just feelings; they require a clear, educated mind."
    },
    {
      id: 231,
      hebrew: "שֶׁלֹא לְהַאֲמִין בְּכָל דָּבָר.",
      translation: "Not to believe in everything.",
      source: "Rambam, Sefer HaMitzvot, Lo Ta'aseh 25",
      reflection: "Maimonides, the great rationalist, includes this in his list of commandments. It is a prohibition against gullibility. Judaism demands a thinking faith, not a blind one. We are commanded to use our intellect, to question, and to seek truth, rather than passively accepting every idea that comes our way."
    },
    {
      id: 232,
      hebrew: "הַתְחָלַת הַנְּפִילָה – גַּאֲוָה.",
      translation: "The beginning of the fall is pride.",
      source: "Rebbe Nachman of Breslov, Likutey Moharan II, 85",
      reflection: "Rebbe Nachman teaches that catastrophic failures do not begin with a big mistake, but with a small inflation of the ego. 'Ga'avah' (pride) is the subtle crack in the foundation that precedes the collapse. By cultivating humility, we protect ourselves from the spiritual blindness that leads to a fall."
    },
    {
      id: 233,
      hebrew: "הַרְחֵק מִשָּׁכֵן רָע.",
      translation: "Distance yourself from a bad neighbor.",
      source: "Pirkei Avot 1:7",
      reflection: "This practical advice from Nittai of Arbela has deep implications. Our environment shapes us more than we realize. A 'shachen ra' (bad neighbor)—whether a person, a habit, or a negative influence—can slowly poison our lives. Wisdom requires us to be proactive in choosing our surroundings and creating healthy boundaries."
    },
    {
      id: 234,
      hebrew: "כָּל הַמַּרְגִּיל עַצְמוֹ בִּדְבַר הֲלָכָה, מוֹרִידִין אוֹתוֹ מִן הַשָּׁמַיִם.",
      translation: "Whoever accustoms himself to matters of Jewish law, they bring him down from heaven.",
      source: "Talmud, Bava Metzia 86a",
      reflection: "This seemingly strange statement is a profound insight. A person who is only engaged in lofty, abstract spiritual concepts ('heaven') can become disconnected from real life. The study of 'halacha' (practical Jewish law) forces a person to apply their ideals to the nitty-gritty of daily existence—business, speech, and relationships. It 'brings them down to earth' in the most holy way."
    },
    {
      id: 235,
      hebrew: "מִי שֶׁטָּרַח וְלֹא מָצָא, אַל תַּאֲמִין.",
      translation: "If someone says, 'I have toiled and not found,' do not believe them.",
      source: "Talmud, Megillah 6b",
      reflection: "This is the other half of the famous Talmudic dictum. While effort is required, the Sages give us an unwavering promise: sincere 'yegiah' (toil) in Torah and spiritual growth will never be in vain. If you feel you have worked hard and found nothing, the answer is not to give up, but to re-examine the nature of your effort, because the promise of 'finding' is absolute."
    },
    {
      id: 236,
      hebrew: "וְהַיּוֹדֵעַ שֶׁאָדָם גָּדוֹל חָטָא, חַיָּב לְבַזּוֹתוֹ.",
      translation: "One who knows that a great person has sinned is obligated to hold them in contempt.",
      source: "Rambam, Mishneh Torah, Talmud Torah 6:13",
      reflection: "This shocking statement from Maimonides is a powerful lesson in accountability. We are forbidden from giving a 'pass' to scholars or leaders who sin publicly. Holding them to a high standard protects the integrity of the Torah and prevents the desecration of God's name. It teaches that no one is above the law, and true respect for the Torah means not respecting those who disgrace it."
    },
    {
      id: 237,
      hebrew: "הַיּוֹם לַעֲשׂוֹתָם – וּלְמָחָר לְקַבֵּל שְׂכָרָם.",
      translation: "Today is for doing them - and tomorrow is for receiving their reward.",
      source: "Talmud, Eruvin 22a",
      reflection: "This world is the place of action, of doing mitzvot. The next world is the place of reward. This teaching focuses us on the present moment's opportunity for action, reminding us not to expect immediate gratification. The real 'payday' for our spiritual work comes later; today is for the work itself."
    },
    {
      id: 238,
      hebrew: "אִם רָאִיתָ תַּלְמִיד חָכָם שֶׁדּוֹמֶה לְשַׂק, אַל תִּשְׂנָאֵהוּ.",
      translation: "If you see a Torah scholar who is like a sack, do not hate him.",
      source: "Rambam, Mishneh Torah, De'ot 6:8",
      reflection: "A 'sack' refers to someone who is full of knowledge but may lack refined social graces. Maimonides teaches us to look past the external packaging to the internal content. We must respect the wisdom a person carries, even if their personality is unpolished. It is a call to value substance over style."
    },
    {
      id: 239,
      hebrew: "כָּל הַמַּנִּיחַ דִּבְרֵי תוֹרָה וְעוֹסֵק בְּדִבְרֵי שִׂיחָה, מַאֲכִילִין אוֹתוֹ גֶּחָלִים.",
      translation: "Whoever sets aside words of Torah to engage in idle chatter, they feed him hot coals.",
      source: "Talmud, Avodah Zarah 3b",
      reflection: "This is a stark metaphor for the spiritual damage of 'bitul Torah'—neglecting Torah study for trivial conversation. 'Idle chatter' may seem harmless, but the Sages teach that it is like eating 'hot coals,' burning up our precious time and spiritual potential. It urges us to be mindful of how we use our moments of free time."
    },
    {
      id: 240,
      hebrew: "הַכֹּל צָרִיךְ לְמַזָּל, אֲפִילוּ סֵפֶר תּוֹרָה שֶׁבָּהֵיכָל.",
      translation: "Everything requires 'mazal' (luck/destiny), even the Torah scroll in the Ark.",
      source: "Zohar, Vayikra 16a",
      reflection: "This mystical teaching is a profound statement on destiny. Even the holiest object, the Sefer Torah, needs the right 'mazal' to be taken out and read. It's not enough for something (or someone) to have intrinsic value; it also needs the right time, place, and opportunity to be expressed. It teaches us to be humble about our successes, recognizing the hidden element of divine grace."
    },
    {
      id: 241,
      hebrew: "לְפִי הַגָּמָל, הַשַּׁחַץ.",
      translation: "According to the camel is the burden.",
      source: "Talmud, Sotah 13b",
      reflection: "This proverb, literally 'according to the camel is the load,' teaches that God gives each person challenges and responsibilities that are custom-fit to their unique strengths and capacities. We are never given a test that we do not have the inner resources to handle. It is a message of empowerment, reminding us that we are stronger than we think."
    },
    {
      id: 242,
      hebrew: "מִתּוֹךְ שֶׁלֹא לִשְׁמָהּ, בָּא לִשְׁמָהּ.",
      translation: "From doing it not for its own sake, one comes to do it for its own sake.",
      source: "Talmud, Pesachim 50b",
      reflection: "This is a core principle of Jewish spiritual psychology. Don't wait for perfect, pure motivation to begin doing a mitzvah or learning Torah. Start for any reason—social pressure, personal gain, or just habit. The Sages promise that the act itself has a transformative power to purify one's intentions over time."
    },
    {
      id: 243,
      hebrew: "דֶּרֶךְ אֶרֶץ קָדְמָה לַתּוֹרָה.",
      translation: "The way of the world precedes the Torah.",
      source: "Vayikra Rabbah 9:3",
      reflection: "'Derech Eretz' means proper behavior, basic human decency, and etiquette. The Midrash teaches that this is the prerequisite for receiving the Torah. Without being a good, ethical human being first, Torah study can become distorted and even dangerous. It establishes that being a 'mensch' is the foundation upon which all true holiness is built."
    },
    {
      id: 244,
      hebrew: "הַמַּחְמָאָה הִיא כְּמוֹ מַטְבֵּעַ מְזֻיָּף: אֵין טוֹבָה אֶלָּא אִם כֵּן הוּא נָחוּץ.",
      translation: "Flattery is like a counterfeit coin: it is no good unless it is necessary.",
      source: "Rabbi Nachman of Breslov",
      reflection: "Rabbi Nachman warns against the emptiness of flattery. Like a fake coin, it has the appearance of value but is ultimately worthless. However, there are times when a kind, encouraging word, even if slightly exaggerated, is 'necessary' to lift a fallen spirit. The wisdom is in knowing the difference."
    },
    {
      id: 245,
      hebrew: "אִם קִלְקַלְתָּ, הַאֲמֵן שֶׁתּוּכַל לְתַקֵּן.",
      translation: "If you have damaged, believe that you can repair.",
      source: "Rebbe Nachman of Breslov, Likutey Moharan II, 112",
      reflection: "This is the other side of \"as long as the candle is burning.\" Rebbe Nachman teaches that the power to damage is matched by the power to repair. True despair is not when you sin, but when you stop believing in your ability to fix what you have broken. Faith in 'tikkun' (repair) is the engine of 'teshuvah' (return)."
    },
    {
      id: 246,
      hebrew: "אַל תִּשְׂמַח בִּנְפֹל אוֹיִבְךָ.",
      translation: "Do not rejoice when your enemy falls.",
      source: "Proverbs 24:17",
      reflection: "King Solomon teaches a high level of emotional and spiritual refinement. Taking pleasure in the downfall of another—even an enemy—degrades the soul. It ties your happiness to the suffering of others, which is a spiritual trap. True righteousness finds no joy in destruction, only in creation and repair."
    },
    {
      id: 247,
      hebrew: "כָּל הַמִּתְגָּאֶה, בְּסוֹף נִכְשָׁל.",
      translation: "Whoever is arrogant will eventually stumble.",
      source: "Talmud, Sotah 5a",
      reflection: "Arrogance creates a spiritual blindness that makes a fall inevitable. The 'ga'avtan' (arrogant person) cannot see their own faults, cannot accept correction, and alienates those around them. The Sages teach that pride is not a sign of strength, but a prelude to failure."
    },
    {
      id: 248,
      hebrew: "אֵין אָדָם חוטא וְלֹא לוֹ.",
      translation: "No person sins for no reason.",
      source: "Talmud, Sotah 3a",
      reflection: "This profound psychological insight teaches that sin is not a random act, but a symptom of an underlying lack or desire. People transgress because they are trying to fill an emotional or spiritual void. Understanding this helps us to have more compassion for others and to look for the root cause of our own failings, rather than just treating the symptoms."
    },
    {
      id: 249,
      hebrew: "הֱוֵי מְכַבֵּד אֶת הַמִּצְוֹת, וְאַל תְּהִי בָז לָהֶן.",
      translation: "Honor the commandments, and do not be scornful of them.",
      source: "Derech Eretz Zuta 1",
      reflection: "This is a call to approach our spiritual obligations with a sense of reverence and seriousness. Even mitzvot that seem small or difficult to understand should be treated with 'kavod' (honor). A scornful or dismissive attitude towards any part of the Torah closes a door to spiritual growth."
    },
    {
      id: 250,
      hebrew: "אִם אֵין אֲנִי לִי, מִי יִהְיֶה לִי.",
      translation: "If I am not for myself, who will be for me?",
      source: "Pirkei Avot 1:14",
      reflection: "This first part of Hillel's famous saying is a powerful statement of personal responsibility. No one else can do your spiritual work for you. You must take ownership of your own character development, your own learning, and your own relationship with God."
    },
    {
      id: 251,
      hebrew: "וּכְשֶׁאֲנִי לְעַצְמִי, מָה אֲנִי.",
      translation: "And when I am for myself, what am I?",
      source: "Pirkei Avot 1:14",
      reflection: "This is the crucial second part of Hillel's teaching. After establishing self-responsibility, he immediately warns against selfishness. A life lived only for oneself is empty and meaningless. Our purpose is found in connection to others, in acts of kindness, and in being part of a community."
    },
    {
      id: 252,
      hebrew: "וְאִם לֹא עַכְשָׁיו, אֵימָתַי.",
      translation: "And if not now, when?",
      source: "Pirkei Avot 1:14",
      reflection: "This is the final, electrifying call to action from Hillel. It shatters all procrastination. The only time we have to act, to change, to grow, is right now. The past is gone and the future is uncertain. 'Now' is the only point of power we possess."
    },
    {
      id: 253,
      hebrew: "הֱוֵי מִתְחַמֵּם כְּנֶגֶד אוּרָן שֶׁל חֲכָמִים.",
      translation: "Warm yourself by the fire of the wise.",
      source: "Pirkei Avot 2:10",
      reflection: "The wisdom of the 'chachamim' (sages) is compared to a fire. It provides light to see the right path and warmth to inspire the heart. This teaches us to seek out the company of wise and righteous people, so that their spiritual fire can ignite our own."
    },
    {
      id: 254,
      hebrew: "יְהִי מָמוֹנְךָ חָבִיב עָלֶיךָ כְּגוּפְךָ, וְגוּפְךָ חָבִיב עָלֶיךָ כְּנִשְׁמָתְךָ.",
      translation: "Let your money be as dear to you as your body, and your body as dear to you as your soul.",
      source: "Sefer Chassidim",
      reflection: "This provides a powerful hierarchy of values. We should be careful with our money, as we are with our physical health. But we must be even more careful with our physical health, as it is the vessel for our 'neshama' (soul). It's a practical guide to prioritizing what truly matters in life."
    },
    {
      id: 255,
      hebrew: "אַל תַּרְצֶה אֶת חֲבֵרְךָ בִּשְׁעַת כַּעֲסוֹ.",
      translation: "Do not try to appease your friend in the hour of their anger.",
      source: "Pirkei Avot 4:18",
      reflection: "This is a timeless piece of advice for navigating conflict. When a person is in the grip of 'ka'as' (anger), their mind is closed and they are incapable of truly listening. Trying to reason with them at that moment often makes things worse. The wise approach is to give them space and approach them again only after their anger has subsided."
    },
    {
      id: 256,
      hebrew: "אֲבָנִים שָׁחֲקוּ מַיִם. אִם הַמַּיִם הָרַכִּים נִקְּבוּ אֶת הָאֶבֶן הַקָּשָׁה, דִּבְרֵי תוֹרָה שֶׁקָּשִׁים כְּבַרְזֶל עַל אַחַת כַּמָּה וְכַמָּה שֶׁיַּחְקְקוּ אֶת לִבִּי.",
      translation: "Water wears away stone. If soft water can pierce a hard rock through persistence, how much more can the words of wisdom carve a path into a heart of iron?",
      source: "Rabbi Akiva (Avot D'Rabbi Natan 6:2)",
      reflection: "Rabbi Akiva was an illiterate shepherd until age 40. He saw water dripping on a rock and noticed the stone had been hollowed out. He realized that 'soft' consistency is more powerful than 'hard' force. This is the 'clever' secret of growth: you don't need to be a genius or a hero today; you only need to be the water that never stops dripping until the stone of your ego gives way."
    },
    {
      id: 257,
      hebrew: "כָּל אָדָם צָרִיךְ שֶׁיִּהְיוּ לוֹ שְׁנֵי כִּיסִים. בְּכִיס אֶחָד: 'בִּשְׁבִילִי נִבְרָא הָעוֹלָם', וּבַכִּיס הַשֵּׁנִי: 'וְאָנֹכִי עָפָר וָאֵפֶר'.",
      translation: "Every person should have two pockets. In one: 'For my sake the world was created.' In the other: 'I am but dust and ashes.'",
      source: "Rabbi Simcha Bunim of Peshischa",
      reflection: "This is the ultimate Jewish psychological 'hack' for balance. When you feel discouraged and small, reach into the pocket that reminds you of your infinite, cosmic value. When you feel arrogant and superior, reach into the pocket that reminds you of your mortality. Wisdom is knowing exactly which pocket to reach into at any given moment."
    },
    {
      id: 258,
      hebrew: "אֵיזֶהוּ גִּבּוֹר שֶׁבַּגִּבּוֹרִים? מִי שֶׁעוֹשֶׂה שׂוֹנְאוֹ אוֹהֲבוֹ.",
      translation: "Who is the greatest of heroes? The one who turns an enemy into a friend.",
      source: "Abot de-Rabbi Natan 23",
      reflection: "While a standard hero defeats an enemy, a 'super-hero' eliminates the very existence of the enemy by transforming them. This requires the 'cleverness' of empathy. It is easy to destroy; it is hard to reconcile. True strength (Gevurah) is the courage to lower your guard and find the common ground that makes conflict unnecessary."
    },
    {
      id: 259,
      hebrew: "נַהֲמָא דְּכִסּוּפָא—כָּל מַאן דְּאָכֵל דְּלָא דִּילֵיהּ, בָּהֵית לְאִסְתַּכָּלָא בְּאַנְפֵּיהּ.",
      translation: "The Bread of Shame—one who eats that which is not earned is ashamed to look the giver in the face.",
      source: "Zohar / Jerusalem Talmud",
      reflection: "This Kabbalistic concept explains why humans crave accomplishment. We don't just want things; we want to 'earn' them. Receiving without giving (Nahama D'Kissufa) creates a spiritual weight and a loss of dignity. This teaches that true happiness isn't getting what you want for free, but the pride that comes from being a 'creator' of your own success."
    },
    {
      id: 260,
      hebrew: "לְעוֹלָם יִרְאֶה אָדָם עַצְמוֹ כְּאִלּוּ חֶצְיוֹ חַיָּב וְחֶצְיוֹ זַכַּאי... עָשָׂה מִצְוָה אַחַת—הִכְרִיעַ אֶת עַצְמוֹ וְאֶת כָּל הָעוֹלָם כֻּלּוֹ לְכַף זְכוּת.",
      translation: "A person should always see the world as perfectly balanced between merit and guilt. One single good deed tips the scale for yourself and the entire world toward salvation.",
      source: "Rambam (Hilchot Teshuvah 3:4) / Talmud Kiddushin 40b",
      reflection: "Maimonides provides a powerful antidote to feeling insignificant. In a globalized world, we feel like a drop in the ocean. But the Sages teach that the scale is always at a 50/50 'tie.' Your next choice—a kind word, a focused moment, a small gift—is the deciding vote for the destiny of the entire planet. Your agency is absolute."
    },
    {
      id: 261,
      hebrew: "אִם אֲנִי הוּא אֲנִי כִּי אַתָּה הוּא אַתָּה, וְאַתָּה הוּא אַתָּה כִּי אֲנִי הוּא אֲנִי—אָז אֲנִי לֹא אֲנִי וְאַתָּה לֹא אַתָּה. אֲבָל אִם אֲנִי הוּא אֲנִי כִּי אֲנִי הוּא אֲנִי, וְאַתָּה הוּא אַתָּה כִּי אַתָּה הוּא אַתָּה—אָז אֲנִי אֲנִי וְאַתָּה אַתָּה.",
      translation: "If I am I because you are you, then I am not I. But if I am I because I am I, then I am truly myself.",
      source: "The Kotzker Rebbe",
      reflection: "This is a clever play on the nature of identity and comparison. If your self-worth depends on being better or different than someone else, you have no real self. True character is 'independent.' When you stop defining yourself against others and start living by your own internal truth, you become an authentic being that cannot be shaken."
    },
    {
      id: 262,
      hebrew: "שִׁבְעָה דְבָרִים בְּחָכָם... אֵינוֹ נִכְנָס לְתוֹךְ דִּבְרֵי חֲבֵרוֹ, וְאֵינוֹ נִבְהָל לְהָשִׁיב.",
      translation: "There are seven traits of a wise man... he does not interrupt the words of his fellow, and he is not in a rush to answer.",
      source: "Pirkei Avot 5:7",
      reflection: "Wisdom is defined here not by what you say, but by how you listen. A 'clod' (Gולם) speaks over others to show off. A wise person (Chacham) realizes that you cannot learn while your mouth is moving. By giving others the 'Revacha' (space) to finish their thoughts, you gain their respect and the information you need to make a better decision."
    },
    {
      id: 263,
      hebrew: "מְעַט אוֹר דּוֹחֶה הַרְבֵּה מִן הַחֹשֶׁךְ.",
      translation: "A little bit of light dispels much darkness.",
      source: "Rabbi Shneur Zalman of Liadi (Tanya)",
      reflection: "This is a law of spiritual physics. Darkness has no 'substance'; it is merely the absence of light. Therefore, you don't need to 'fight' the darkness in your life with force. You only need to ignite a small flame of goodness. A single act of kindness doesn't just push back the dark—it reveals that the darkness was never as solid as it appeared."
    },
    {
      id: 264,
      hebrew: "חָכְמָה מִסְכֵּן בְּזוּיָה וּדְבָרָיו אֵינָם נִשְׁמָעִים... טוֹבָה חָכְמָה מִכְּלֵי קְרָב.",
      translation: "The wisdom of a poor man is often despised, yet wisdom is better than weapons of war.",
      source: "Ecclesiastes 9:16-18",
      reflection: "King Solomon tells a story of a small city saved from a great king by a single poor, wise man. The world often listens to the loudest or the wealthiest, but the 'clever' person knows that a quiet, well-timed insight is more effective than an entire army. Don't measure the value of an idea by the status of the person who said it."
    },
    {
      id: 265,
      hebrew: "אֱמֶת מֵאֶרֶץ תִּצְמָח.",
      translation: "Truth shall spring up from the earth.",
      source: "Psalm 85:12",
      reflection: "Truth (Emet) is compared to a seed. You can bury it, cover it with dirt, and try to hide it, but its nature is to grow. You don't have to defend the truth with anxiety; you only have to plant it. Eventually, reality will align with what is true, and the 'growth' of the facts will become undeniable to everyone."
    },
    {
      id: 266,
      hebrew: "נִכְנַס יַיִן, יָצָא סוֹד.",
      translation: "When wine enters, the secret emerges.",
      source: "Talmud, Eruvin 65a",
      reflection: "The Hebrew words for Wine (Yayin) and Secret (Sod) both have the numerical value of 70. This clever 'Gematria' teaches that what a person hides when sober is what they truly are. True character is not what you show when you are in control, but what leaks out when your defenses are down. Strive to be a person whose 'secrets' are as noble as their public face."
    },
    {
      id: 267,
      hebrew: "שֶׁקֶר הַחֵן וְהֶבֶל הַיֹּפִי, אִשָּׁה יִרְאַת־יְהוָה הִיא תִתְהַלָּל.",
      translation: "Grace is false and beauty is vain, but one who fears God shall be praised.",
      source: "Proverbs 31:30",
      reflection: "King Solomon warns against 'Cheyn' (surface charm) and 'Yofi' (external beauty), calling them deceptive and fleeting. The 'clever' person looks for 'Yirah' (inner depth and integrity). Charm is a mask; beauty is a sunset; but a soul aligned with the Divine is a sun that never sets. Value substance over packaging."
    },
    {
      id: 268,
      hebrew: "תּוֹחֶלֶת מְמֻשָּׁכָה מַחֲלָה־לֵב, וְעֵץ חַיִּים תַּאֲוָה בָאָה.",
      translation: "Hope deferred makes the heart sick, but a desire fulfilled is a tree of life.",
      source: "Proverbs 13:12",
      reflection: "There is a deep link between your mental health and your goals. Living in a state of 'waiting' without action drains the heart's energy. But when you finally take the step and manifest a desire ('Ta'avah Ba'ah'), it revitalizes you like the Tree of Life. Don't just hope; create a 'win' to feed your spirit."
    },
    {
      id: 269,
      hebrew: "וְאֹרַח צַדִּיקִים כְּאוֹר נֹגַהּ, הוֹלֵךְ וָאוֹר עַד־נְכוֹן הַיּוֹם.",
      translation: "The path of the righteous is like the light of dawn, shining ever brighter until the full day.",
      source: "Proverbs 4:18",
      reflection: "Growth in character isn't a sudden explosion of light; it’s like the sunrise. It starts as a dim gray and slowly, almost imperceptibly, increases. The 'clever' insight here is to not be discouraged by your small beginnings. As long as you are on the 'Orach' (the path), your light is mathematically destined to reach its full noon."
    },
    {
      id: 270,
      hebrew: "דָּבָר בְּעִתּוֹ מַה־טּוֹב.",
      translation: "A word spoken in its proper season—how good it is!",
      source: "Proverbs 15:23",
      reflection: "Communication is about timing, not just content. Even a 'good' word spoken at the wrong time can be destructive. The Sages teach that silence is often the best seasoning for speech. When you wait for the 'Et' (the right moment), your words carry a weight and a power they would otherwise lack."
    },
    {
      id: 271,
      hebrew: "קָשֶׁה הָאֱמֶת לִסְבֹּל.",
      translation: "Truth is a heavy thing to bear.",
      source: "Midrash",
      reflection: "Truth (Emet) is heavy because it requires change. It is much lighter to live in a convenient lie. But the 'clever' person knows that while a lie is light to carry, it eventually crushes the person beneath it. Truth is heavy to pick up, but once you carry it, it strengthens the 'muscles' of your soul until you are unbreakable."
    },
    {
      id: 272,
      hebrew: "סוֹד יְהוָה לִירֵאָיו.",
      translation: "The secrets of the Lord are for those who stand in awe.",
      source: "Psalm 25:14",
      reflection: "Depth is not a matter of IQ; it is a matter of 'Yirah' (awe). You cannot understand the secrets of life if you treat life with casual arrogance. When you approach reality with reverence, the 'Sod' (the hidden dimension) begins to reveal itself to you. God doesn't hide secrets; we hide from them through our own lack of attention."
    },
    {
      id: 273,
      hebrew: "הוֹלֵךְ אֶת־חֲכָמִים וַחֲכָם.",
      translation: "He who walks with the wise shall become wise.",
      source: "Proverbs 13:20",
      reflection: "Wisdom is contagious. You don't even have to be a genius; you just have to be in the right room. By simply 'walking' with people who have higher standards and deeper insights, their habits and perspectives will naturally rub off on you. Your environment is your destiny; choose your 'walking' companions carefully."
    },
    {
      id: 274,
      hebrew: "מַעֲנֶה־רַּךְ יָשִׁיב חֵמָה, וּדְבַר־עֶצֶב יַעֲלֶה־אָף.",
      translation: "A soft answer turns away wrath, but a provocative word stirs up anger.",
      source: "Proverbs 15:1",
      reflection: "This is the 'Aikido' of speech. When someone attacks you with anger, the 'hard' response creates a collision that explodes. The 'soft' response (Ma'aneh Rach) absorbs the energy and diffuses it. You win the argument by refusing to participate in the fight. Gentleness is not weakness; it is the ultimate form of emotional control."
    },
    {
      id: 275,
      hebrew: "וְנָתַתִּי לָכֶם לֵב חָדָשׁ... וַהֲסִרֹתִי אֶת־לֵב הָאֶבֶן מִבְּשַׂרְכֶם וְנָתַתִּי לָכֶם לֵב בָּשָׂר.",
      translation: "I will remove the heart of stone from your flesh and give you a heart of flesh.",
      source: "Ezekiel 36:26",
      reflection: "A 'heart of stone' is a heart that has become numb to protect itself from pain. But a stone cannot feel joy, either. A 'heart of flesh' (Lev Basar) is vulnerable, but it is alive. The 'clever' choice is to choose feeling over numbness, even if it hurts, because only a soft heart can be a vessel for the Divine."
    },
    {
      id: 276,
      hebrew: "כָּל כְּנֵסִיָּה שֶׁהִיא לְשֵׁם שָׁמַיִם, סוֹפָהּ לְהִתְקַיֵּם.",
      translation: "Every assembly that is for the sake of Heaven is destined to endure.",
      source: "Pirkei Avot 4:11",
      reflection: "The 'clever' secret of longevity is 'L'shem Shamayim' (altruistic intent). If a project or relationship is built on ego, it will crumble when the ego is frustrated. But if it is built on a higher purpose, it becomes part of the eternal structure of the world. Check your 'why' to predict your 'how long.'"
    },
    {
      id: 277,
      hebrew: "שְׁלֹשָׁה כְּתָרִים הֵם... וְכֶתֶר שֵׁם טוֹב עוֹלֶה עַל גַּבֵּיהֶן.",
      translation: "There are three crowns... but the crown of a Good Name rises above them all.",
      source: "Pirkei Avot 4:13",
      reflection: "You can have the crown of Learning, the crown of Priesthood, or the crown of Royalty—all of which represent status and power. But the 'Shem Tov' (Good Name) is the crown of character. It is the only crown that isn't given to you by an institution; it is the one you forge yourself through every small act of integrity."
    },
    {
      id: 278,
      hebrew: "לֵב חָכָם לִימִינוֹ, וְלֵב כְּסִיל לִשְׂמֹאלוֹ.",
      translation: "The heart of the wise man is to his right, but the heart of the fool is to his left.",
      source: "Ecclesiastes 10:2",
      reflection: "In Jewish thought, the 'Right' represents Mercy (Chesed) and the 'Left' represents Judgment (Din). A wise person leads with their 'right'—approaching the world with kindness and a benefit of the doubt. A fool leads with their 'left'—looking for faults and reasons to judge. The direction of your heart determines the flavor of your life."
    },
    {
      id: 279,
      hebrew: "נֵר־רְשָׁעִים יִדְעָךְ... אוֹר־צַדִּיקִים יִשְׂמָח.",
      translation: "The lamp of the wicked will go out, but the light of the righteous rejoices.",
      source: "Proverbs 13:9",
      reflection: "A 'lamp' (Ner) needs external oil to burn; a 'light' (Or) comes from within. Success built on negativity is like a lamp—it eventually runs out of fuel. But success built on righteousness is like the sun—it 'rejoices' (Yismach) because its energy is internal and self-sustaining. Be the source, not the consumer."
    },
    {
      id: 280,
      hebrew: "כָּל הַמִּתְגָּאֶה, אוֹמֵר הַקָּדוֹשׁ בָּרוּךְ הוּא: אֵין אֲנִי וְהוּא יְכוֹלִים לָדוּר בָּעוֹלָם.",
      translation: "Regarding anyone who is arrogant, God says: 'I and he cannot dwell in the same world together.'",
      source: "Talmud, Sotah 5a",
      reflection: "Arrogance (Ga'avah) is the ultimate spiritual 'space-taker.' When you are full of yourself, there is no room for God or anyone else. Humility is the 'clever' act of making space. The less you try to be 'everything,' the more room you create for the Infinite to fill your life."
    }
  ];

  // Anchor the daily progression so it continues in order even when new quotes are appended.
  // Requested mapping:
  // - 2026-01-28 -> id 19
  // - 2026-01-29 -> id 20
  const DAILY_QUOTE_ANCHOR_DATE = { year: 2026, month: 0, day: 28 }; // Months are 0-based.
  const DAILY_QUOTE_ANCHOR_ID = 19;
  const DAILY_QUOTE_ANCHOR_DAY_NUMBER = Math.floor(
    Date.UTC(DAILY_QUOTE_ANCHOR_DATE.year, DAILY_QUOTE_ANCHOR_DATE.month, DAILY_QUOTE_ANCHOR_DATE.day) / MS_PER_DAY
  );
  const DAILY_QUOTE_ANCHOR_INDEX = DAILY_INSPIRATION_QUOTES.findIndex((q) => q.id === DAILY_QUOTE_ANCHOR_ID);

  function getQuoteForDate(date = new Date()) {
    const dayNumber = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / MS_PER_DAY);
    const daysSinceAnchor = dayNumber - DAILY_QUOTE_ANCHOR_DAY_NUMBER;
    const len = DAILY_INSPIRATION_QUOTES.length;

    const anchorIndex = DAILY_QUOTE_ANCHOR_INDEX >= 0 ? DAILY_QUOTE_ANCHOR_INDEX : 0;
    const index = ((anchorIndex + daysSinceAnchor) % len + len) % len;
    return DAILY_INSPIRATION_QUOTES[index];
  }

  function formatDisplayDate(date) {
    return date.toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'short',
      day: 'numeric'
    });
  }

  function ensureBookmarkButton(container) {
    if (!container) {
      return null;
    }

    const existing = container.querySelector('[data-quote-bookmark]');
    if (existing) {
      return existing;
    }

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'reaction-btn daily-quote-bookmark-btn';
    btn.setAttribute('data-quote-bookmark', 'true');
    btn.setAttribute('aria-pressed', 'false');
    btn.setAttribute('aria-label', 'Bookmark this quote');
    btn.innerHTML = `
            <svg class="bookmark-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" fill="currentColor"></path>
            </svg>
            <span class="daily-quote-bookmark-count"></span>
        `;

    const contentBox = container.querySelector('.daily-inspiration-content');
    if (contentBox) {
      const actions = document.createElement('div');
      actions.className = 'daily-inspiration-actions';
      actions.appendChild(btn);
      contentBox.appendChild(actions);
    } else {
      container.appendChild(btn);
    }

    return btn;
  }

  function renderDailyInspiration() {
    const container = document.getElementById('daily-inspiration');
    if (!container) {
      return;
    }

    const quote = getQuoteForDate();
    if (!quote) {
      return;
    }

    const translationEl = container.querySelector('[data-quote-translation]');
    const hebrewEl = container.querySelector('[data-quote-hebrew]');
    const sourceEl = container.querySelector('[data-quote-source]');
    const reflectionEl = container.querySelector('[data-quote-reflection]');

    if (translationEl) {
      translationEl.textContent = quote.translation;
    }
    if (hebrewEl) {
      hebrewEl.textContent = quote.hebrew;
    }
    if (sourceEl) {
      sourceEl.textContent = quote.source || '';
    }
    if (reflectionEl) {
      reflectionEl.textContent = quote.reflection;
    }

    const displayDate = formatDisplayDate(new Date());
    const bookmarkBtn = ensureBookmarkButton(container);

    const renderedQuote = {
      ...quote,
      displayDate
    };

    container.dataset.quoteId = quote.id;
    container.dataset.quoteDate = displayDate;
    window.currentDailyQuote = renderedQuote;

    if (bookmarkBtn) {
      bookmarkBtn.dataset.quoteId = quote.id;
      bookmarkBtn.dataset.displayDate = displayDate;
      bookmarkBtn.setAttribute('aria-pressed', 'false');
      bookmarkBtn.classList.remove('is-active');
      bookmarkBtn.onclick = (event) => {
        event.stopPropagation();
        const toggleEvent = new CustomEvent('dailyQuoteBookmarkToggle', {
          bubbles: true,
          detail: renderedQuote
        });
        bookmarkBtn.dispatchEvent(toggleEvent);
      };
    }

    document.dispatchEvent(new CustomEvent('dailyQuoteRendered', { detail: renderedQuote }));
  }

  document.addEventListener('DOMContentLoaded', renderDailyInspiration);

  /* ── ⌘C / ⌘U  Verse Copy ──────────────────────────────────────── */
  /*   ⌘C (with verse selection) → rich HTML copy for emails        */
  /*   ⌘U                        → clean plain-text copy            */
  var SITE_URL = 'https://sillybob123.github.io/39839/';
  var LOGO_URL = SITE_URL + 'media/images/Icon.png';

  function showCopyToast(message, success) {
    var existing = document.getElementById('verse-copy-toast');
    if (existing) existing.remove();

    var toast = document.createElement('div');
    toast.id = 'verse-copy-toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    Object.assign(toast.style, {
      position: 'fixed',
      bottom: '28px',
      left: '50%',
      transform: 'translateX(-50%) translateY(16px)',
      background: success
        ? 'linear-gradient(135deg, #1e3a5f 0%, #2c5282 100%)'
        : '#c53030',
      color: '#fff',
      padding: '10px 22px',
      borderRadius: '10px',
      fontSize: '13px',
      fontWeight: '600',
      fontFamily: 'Georgia, "Times New Roman", serif',
      boxShadow: '0 6px 24px rgba(0,0,0,0.22)',
      zIndex: '99999',
      opacity: '0',
      transition: 'opacity 0.3s ease, transform 0.3s ease',
      pointerEvents: 'none',
      letterSpacing: '0.02em'
    });
    toast.textContent = message;
    document.body.appendChild(toast);

    requestAnimationFrame(function () {
      toast.style.opacity = '1';
      toast.style.transform = 'translateX(-50%) translateY(0)';
    });

    setTimeout(function () {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(-50%) translateY(16px)';
      setTimeout(function () { toast.remove(); }, 350);
    }, 2200);
  }

  /* ── Collect selected verses from the DOM ───────────────────── */
  function getSelectedVerses() {
    var sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) return null;

    var range = sel.getRangeAt(0);
    var ancestor = range.commonAncestorContainer;
    if (ancestor.nodeType === Node.TEXT_NODE) ancestor = ancestor.parentElement;

    var allContainers = document.querySelectorAll('.verse-container');
    var matched = [];
    var seen = {};

    for (var i = 0; i < allContainers.length; i++) {
      var vc = allContainers[i];
      if (!range.intersectsNode(vc)) continue;

      var ref = vc.dataset.ref || '';
      if (seen[ref]) continue;
      seen[ref] = true;

      var hebrewEl = vc.querySelector('.hebrew-text');
      var englishEl = vc.querySelector('.english-text');
      if (!hebrewEl && !englishEl) continue;

      matched.push({
        ref:     ref,
        hebrew:  hebrewEl  ? hebrewEl.textContent.trim()  : '',
        english: englishEl ? englishEl.textContent.trim() : ''
      });
    }

    return matched.length ? matched : null;
  }

  /* ── Check if user selected text inside the daily inspiration ── */
  function getSelectedDailyQuote() {
    var sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) return null;

    var range = sel.getRangeAt(0);
    var inspirationEl = document.getElementById('daily-inspiration');
    if (!inspirationEl || !range.intersectsNode(inspirationEl)) return null;

    var quote = window.currentDailyQuote;
    if (!quote) return null;

    return [{
      ref:     quote.source || '',
      hebrew:  quote.hebrew || '',
      english: quote.translation || ''
    }];
  }

  /* ── Resolve verses (selection → daily quote fallback) ───────── */
  function resolveVersesToCopy() {
    var verses = getSelectedVerses();
    if (!verses) verses = getSelectedDailyQuote();
    if (!verses) {
      var q = window.currentDailyQuote;
      if (q) {
        verses = [{
          ref:     q.source || '',
          hebrew:  q.hebrew || '',
          english: q.translation || ''
        }];
      }
    }
    return verses;
  }

  /* ── Hebrew → Latin transliteration ────────────────────────── */
  function transliterateHebrew(text) {
    if (!text || typeof text !== 'string') return '';

    // Replace the Tetragrammaton (יהוה with any nikud/cantillation between letters)
    // before any other processing — always rendered as "Adonai"
    text = text.replace(
      /\u05D9[\u0591-\u05C7]*\u05D4[\u0591-\u05C7]*\u05D5[\u0591-\u05C7]*\u05D4/g,
      'Adonai'
    );

    // Base romanization per consonant (no dagesh)
    var CONS = {
      '\u05D0': '',    // alef – silent; show only vowel
      '\u05D1': 'v',   // vet
      '\u05D2': 'g',   // gimel
      '\u05D3': 'd',   // dalet
      '\u05D4': 'h',   // he
      '\u05D5': 'v',   // vav (consonantal)
      '\u05D6': 'z',   // zayin
      '\u05D7': 'ch',  // chet
      '\u05D8': 't',   // tet
      '\u05D9': 'y',   // yod
      '\u05DA': 'ch',  // final kaf
      '\u05DB': 'ch',  // kaf
      '\u05DC': 'l',   // lamed
      '\u05DD': 'm',   // final mem
      '\u05DE': 'm',   // mem
      '\u05DF': 'n',   // final nun
      '\u05E0': 'n',   // nun
      '\u05E1': 's',   // samech
      '\u05E2': '',    // ayin – silent; show only vowel
      '\u05E3': 'f',   // final pe
      '\u05E4': 'f',   // pe
      '\u05E5': 'tz',  // final tsadi
      '\u05E6': 'tz',  // tsadi
      '\u05E7': 'k',   // qof
      '\u05E8': 'r',   // resh
      '\u05E9': 'sh',  // shin (default)
      '\u05EA': 't'    // tav
    };

    // Overrides when dagesh is present
    var CONS_DAG = {
      '\u05D1': 'b',   // bet with dagesh
      '\u05DA': 'k',   // final kaf with dagesh
      '\u05DB': 'k',   // kaf with dagesh
      '\u05E3': 'p',   // final pe with dagesh
      '\u05E4': 'p'    // pe with dagesh
    };

    // Vowel pointing → vowel letter(s)
    var VOWELS = {
      '\u05B0': '',    // shva – silent in most positions
      '\u05B1': 'e',   // hataf segol
      '\u05B2': 'a',   // hataf patach
      '\u05B3': 'o',   // hataf kamatz
      '\u05B4': 'i',   // hiriq
      '\u05B5': 'ei',  // tsere
      '\u05B6': 'e',   // segol
      '\u05B7': 'a',   // patach
      '\u05B8': 'a',   // kamatz
      '\u05B9': 'o',   // holam
      '\u05BA': 'o',   // holam vav
      '\u05BB': 'u',   // kubutz
      '\u05C7': 'o'    // qamatz qatan
    };

    var DAGESH   = '\u05BC';
    var SHIN_DOT = '\u05C1';
    var SIN_DOT  = '\u05C2';
    var MAQAF    = '\u05BE';

    var chars  = Array.from(text);
    var result = '';
    var i      = 0;

    while (i < chars.length) {
      var ch  = chars[i];
      var cp  = ch.codePointAt(0);

      if (ch === ' ' || ch === '\n' || ch === '\r') { result += ' '; i++; continue; }
      if (ch === MAQAF) { result += '-'; i++; continue; }

      // Hebrew consonant
      if (cp >= 0x05D0 && cp <= 0x05EA) {
        var hasDag = false, hasShin = false, hasSin = false, vowel = '';
        var j = i + 1;

        while (j < chars.length) {
          var nc = chars[j], ncp = nc.codePointAt(0);
          if (nc === DAGESH)   { hasDag  = true; j++; }
          else if (nc === SHIN_DOT) { hasShin = true; j++; }
          else if (nc === SIN_DOT)  { hasSin  = true; j++; }
          else if (VOWELS[nc] !== undefined) {
            if (!vowel && VOWELS[nc]) vowel = VOWELS[nc];
            j++;
          } else if (ncp >= 0x0591 && ncp <= 0x05C7) { j++; } // other nikud / cantillation
          else { break; }
        }

        var rom;
        if (ch === '\u05E9') {
          // shin vs. sin
          rom = hasSin ? 's' : 'sh';
        } else if (ch === '\u05D5' && hasDag) {
          // vav + dagesh = shuruk (pure "u" vowel, no consonant sound)
          result += 'u';
          i = j;
          continue;
        } else if (hasDag && CONS_DAG[ch] !== undefined) {
          rom = CONS_DAG[ch];
        } else {
          rom = CONS[ch] !== undefined ? CONS[ch] : '';
        }

        result += rom + vowel;
        i = j;
        continue;
      }

      // Skip standalone nikud / cantillation marks
      if ((cp >= 0x0591 && cp <= 0x05C7) || ch === SHIN_DOT || ch === SIN_DOT) {
        i++;
        continue;
      }

      // Pass through Latin letters (e.g. "Adonai" substitutions) and hyphens
      if ((cp >= 0x41 && cp <= 0x5A) || (cp >= 0x61 && cp <= 0x7A) || ch === '-') {
        result += ch;
        i++;
        continue;
      }

      // Skip everything else (Hebrew punctuation, cantillation, symbols)
      i++;
    }

    return result.replace(/\s+/g, ' ').trim();
  }

  /* ── Merge a reference range, e.g. "Exodus 30:16" + "Exodus 30:17" → "Exodus 30:16-17" ── */
  function mergeRefs(refs) {
    refs = refs.filter(Boolean);
    if (!refs.length) return '';
    if (refs.length === 1) return refs[0];
    var first = refs[0], last = refs[refs.length - 1];
    var m1 = first.match(/^(.*?)\s+(\d+):(\d+)$/);
    var mN = last.match(/^(.*?)\s+(\d+):(\d+)$/);
    if (m1 && mN && m1[1] === mN[1] && m1[2] === mN[2]) {
      return m1[1] + ' ' + m1[2] + ':' + m1[3] + '\u2013' + mN[3];
    }
    return first + ' \u2013 ' + last;
  }

  /* ── Build a single verse block ────────────────────────────── */
  function buildVerseBlock(verse) {
    var translit = verse.hebrew ? transliterateHebrew(verse.hebrew) : '';
    var block = '';

    // Helper: escape then turn \n into <br> for multi-line text in HTML
    function esc(str) {
      return escapeForHTML(str).replace(/\n/g, '<br>');
    }

    // Hebrew — full-width row, right-to-left
    if (verse.hebrew) {
      block +=
        '<div style="' +
          'padding:8px 12px 6px 12px;' +
          'border-bottom:1px solid #e2e6f0;' +
        '">' +
          '<p style="' +
            'font-family:Georgia,\'Times New Roman\',serif;' +
            'font-size:14px;line-height:1.65;direction:rtl;text-align:right;' +
            'color:#1a202c;margin:0;' +
          '">' + esc(verse.hebrew) + '</p>' +
        '</div>';
    }

    // Transliteration — shaded middle band
    if (translit) {
      block +=
        '<div style="' +
          'padding:5px 12px;' +
          'background:#eef0f9;' +
          'border-bottom:1px solid #e2e6f0;' +
        '">' +
          '<p style="' +
            'font-family:Georgia,\'Times New Roman\',serif;' +
            'font-size:11px;line-height:1.55;color:#5a67a0;' +
            'margin:0;font-style:italic;letter-spacing:0.02em;text-align:center;' +
          '">' + esc(translit) + '</p>' +
        '</div>';
    }

    // English translation
    if (verse.english) {
      block +=
        '<div style="padding:6px 12px ' + (verse.ref ? '4px' : '8px') + ' 12px;">' +
          '<p style="' +
            'font-family:Georgia,\'Times New Roman\',serif;' +
            'font-size:12px;line-height:1.55;color:#2d3748;' +
            'margin:0;font-style:italic;text-align:left;' +
          '">' +
            '&ldquo;' + escapeForHTML(verse.english) + '&rdquo;' +
          '</p>' +
        '</div>';
    }

    // Reference
    if (verse.ref) {
      block +=
        '<div style="padding:0 12px 7px 12px;">' +
          '<p style="' +
            'font-family:Georgia,\'Times New Roman\',serif;' +
            'font-size:10px;color:#8896a8;margin:0;font-weight:bold;' +
            'letter-spacing:0.04em;text-align:right;' +
          '">' +
            '\u2014 ' + escapeForHTML(verse.ref) +
          '</p>' +
        '</div>';
    }

    return block;
  }

  /* ── Build the full HTML clipboard payload ───────────────────── */
  function buildClipboardHTML(verses) {
    // Merge all selected verses into one unified block:
    //   Hebrew lines joined by \n (renders as <br> in the div)
    //   English translations joined into one paragraph
    //   Reference condensed to a range (e.g. Exodus 30:16–17)
    var merged;
    if (verses.length === 1) {
      merged = verses[0];
    } else {
      merged = {
        hebrew:  verses.map(function(v) { return v.hebrew;  }).filter(Boolean).join(' '),
        english: verses.map(function(v) { return v.english; }).filter(Boolean).join(' '),
        ref:     mergeRefs(verses.map(function(v) { return v.ref; }))
      };
    }

    var versesHTML = buildVerseBlock(merged);

    // Wrapped in a full-width centering table — the most reliable way to center
    // a block in all email clients. Trailing <br> lets the user click below and type.
    var card =
      '<div style="' +
        'max-width:480px;' +
        'background:#ffffff;' +
        'border-radius:7px;' +
        'border:1px solid #d0d5e8;' +
        'border-top:3px solid #3b5bdb;' +
        'overflow:hidden;' +
      '">' +

        versesHTML +

        '<div style="' +
          'border-top:1px solid #e2e6f0;' +
          'padding:5px 12px;' +
          'background:#f7f8fc;' +
        '">' +
          '<table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">' +
            '<tr>' +
              '<td style="vertical-align:middle;padding-right:5px;">' +
                '<a href="' + SITE_URL + '" target="_blank" style="text-decoration:none;">' +
                  '<img src="' + LOGO_URL + '" alt="A Letter in the Scroll" ' +
                    'width="14" height="14" style="' +
                    'width:14px;height:14px;border-radius:3px;display:block;' +
                  '" />' +
                '</a>' +
              '</td>' +
              '<td style="vertical-align:middle;">' +
                '<a href="' + SITE_URL + '" target="_blank" style="' +
                  'font-family:Georgia,\'Times New Roman\',serif;' +
                  'font-size:9px;color:#3b5bdb;text-decoration:none;font-weight:bold;' +
                  'letter-spacing:0.04em;' +
                '">A Letter in the Scroll</a>' +
              '</td>' +
            '</tr>' +
          '</table>' +
        '</div>' +

      '</div>';

    return (
      '<table width="100%" cellpadding="0" cellspacing="0" border="0">' +
        '<tr><td align="center" style="padding:0;">' +
          card +
        '</td></tr>' +
      '</table>' +
      '<p style="margin:0;padding:0;font-size:inherit;line-height:inherit;"><br></p>'
    );
  }

  /* ── Build plain-text (for ⌘U clean copy) ──────────────────── */
  function buildClipboardPlainText(verses) {
    var parts = [];
    for (var i = 0; i < verses.length; i++) {
      var v = verses[i];
      var chunk = '';
      if (v.hebrew) {
        chunk += v.hebrew + '\n';
        var tl = transliterateHebrew(v.hebrew);
        if (tl) chunk += tl + '\n';
      }
      if (v.english) chunk += '\u201C' + v.english + '\u201D\n';
      if (v.ref)     chunk += '\u2014 ' + v.ref;
      parts.push(chunk.trim());
    }
    parts.push('A Letter in the Scroll\n' + SITE_URL);
    return parts.join('\n\n');
  }

  /* ── Minimal HTML entity escaping ──────────────────────────── */
  function escapeForHTML(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ── Clipboard write helpers ───────────────────────────────── */
  function writeRichClipboard(htmlContent, plainContent, toastMsg) {
    if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
      navigator.clipboard.write([
        new ClipboardItem({
          'text/html':  new Blob([htmlContent],  { type: 'text/html' }),
          'text/plain': new Blob([plainContent], { type: 'text/plain' })
        })
      ]).then(function () {
        showCopyToast(toastMsg, true);
      }).catch(function () {
        showCopyToast('\u2717  Could not copy verse', false);
      });
    } else {
      navigator.clipboard.writeText(plainContent).then(function () {
        showCopyToast(toastMsg, true);
      }).catch(function () {
        showCopyToast('\u2717  Could not copy verse', false);
      });
    }
  }

  function writePlainClipboard(plainContent, toastMsg) {
    navigator.clipboard.writeText(plainContent).then(function () {
      showCopyToast(toastMsg, true);
    }).catch(function () {
      showCopyToast('\u2717  Could not copy verse', false);
    });
  }

  /* ── Keydown listener ──────────────────────────────────────── */
  document.addEventListener('keydown', function (e) {
    if (!(e.metaKey || e.ctrlKey)) return;

    /* ─── ⌘C — Beautiful formatted copy (only when verses selected) ─── */
    if (e.key === 'c') {
      var versesForC = getSelectedVerses();
      if (!versesForC) versesForC = getSelectedDailyQuote();
      if (!versesForC) return;   // no verse text selected — let normal ⌘C happen

      e.preventDefault();
      e.stopPropagation();

      var html  = buildClipboardHTML(versesForC);
      var plain = buildClipboardPlainText(versesForC);
      writeRichClipboard(html, plain, '\u2713  Verse copied \u2014 paste it into an email!');
      return;
    }

    /* ─── ⌘U — Clean plain-text copy (no formatting) ─── */
    if (e.key === 'u') {
      var versesForU = resolveVersesToCopy();
      if (!versesForU || !versesForU.length) return;

      e.preventDefault();
      e.stopPropagation();

      var plainOnly = buildClipboardPlainText(versesForU);
      writePlainClipboard(plainOnly, '\u2713  Verse copied as plain text');
      return;
    }
  });
})();

