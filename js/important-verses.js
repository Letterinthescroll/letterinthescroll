/**
 * Important Torah Verses - Extremely Significant Verses with Explanations
 * These verses will display a purple asterisk (*) in the top right corner
 * Clicking the asterisk shows why the verse is extremely important
 */

const IMPORTANT_VERSES = {
  "Genesis 1:1": {
    hebrew_start: "Bereshit bara...",
    explanation: "The foundational verse establishing God as Creator. It marks the very beginning of the Torah and the universe."
  },
  "Genesis 1:31": {
    hebrew_start: "Vayachal Elohim...",
    explanation: "These verses form the text of the 'Vayechulu' prayer recited every Friday night during Kiddush, sanctifying the Sabbath."
  },
  "Genesis 2:1": {
    hebrew_start: "Vayachal Elohim...",
    explanation: "These verses form the text of the 'Vayechulu' prayer recited every Friday night during Kiddush, sanctifying the Sabbath."
  },
  "Genesis 2:2": {
    hebrew_start: "Vayachal Elohim...",
    explanation: "These verses form the text of the 'Vayechulu' prayer recited every Friday night during Kiddush, sanctifying the Sabbath."
  },
  "Genesis 2:3": {
    hebrew_start: "Vayachal Elohim...",
    explanation: "These verses form the text of the 'Vayechulu' prayer recited every Friday night during Kiddush, sanctifying the Sabbath."
  },
  "Genesis 12:1": {
    hebrew_start: "Vayomer Adonai el-Avram...",
    explanation: "Known as 'Lech Lecha,' this is the calling of Abraham and the start of the Jewish people's unique journey."
  },
  "Genesis 18:1": {
    hebrew_start: "Vayera eilav...",
    explanation: "This verse is used as the source for the mitzvah of 'Hachnasat Orchim' (hospitality), as Abraham greets guests while God is visiting him."
  },
  "Genesis 18:25": {
    hebrew_start: "Chalilah l'cha mei-asot...",
    explanation: "THE MORAL ACCOUNTABILITY: Abraham asks, 'Shall the Judge of all the earth not do justice?' Judaism rejects the foreign concept of 'Original Sin' and the claim that a human sacrifice is needed to appease God. This verse proves that God is inherently just and does not require the death of an innocent individual to forgive the sins of the guilty; justice is based on deeds, not human blood."
  },
  "Genesis 49:10": {
    hebrew_start: "Lo yasur shevet miYehudah...",
    explanation: "Rabbinic argument: this verse establishes that the scepter and ruler's authority remain with Judah, forming a core messianic lineage requirement. Significance: in Jewish theology, the Messiah must come through the Davidic-Judah line, so this verse is used as a legal foundation for testing all messianic claims."
  },
  "Exodus 3:14": {
    hebrew_start: "Ehyeh asher ehyeh...",
    explanation: "The revelation of God's name to Moses at the burning bush, meaning 'I will be what I will be,' signifying eternal presence."
  },
  "Exodus 15:1": {
    hebrew_start: "Az yashir Moshe...",
    explanation: "The 'Song of the Sea' (Shirat HaYam), recited daily in the morning service (Pesukei D'Zimra) to celebrate the miracle of the splitting of the sea."
  },
  "Exodus 15:2": {
    hebrew_start: "Az yashir Moshe...",
    explanation: "The 'Song of the Sea' (Shirat HaYam), recited daily in the morning service (Pesukei D'Zimra) to celebrate the miracle of the splitting of the sea."
  },
  "Exodus 15:3": {
    hebrew_start: "Az yashir Moshe...",
    explanation: "The 'Song of the Sea' (Shirat HaYam), recited daily in the morning service (Pesukei D'Zimra) to celebrate the miracle of the splitting of the sea."
  },
  "Exodus 15:4": {
    hebrew_start: "Az yashir Moshe...",
    explanation: "The 'Song of the Sea' (Shirat HaYam), recited daily in the morning service (Pesukei D'Zimra) to celebrate the miracle of the splitting of the sea."
  },
  "Exodus 15:5": {
    hebrew_start: "Az yashir Moshe...",
    explanation: "The 'Song of the Sea' (Shirat HaYam), recited daily in the morning service (Pesukei D'Zimra) to celebrate the miracle of the splitting of the sea."
  },
  "Exodus 15:6": {
    hebrew_start: "Az yashir Moshe...",
    explanation: "The 'Song of the Sea' (Shirat HaYam), recited daily in the morning service (Pesukei D'Zimra) to celebrate the miracle of the splitting of the sea."
  },
  "Exodus 15:7": {
    hebrew_start: "Az yashir Moshe...",
    explanation: "The 'Song of the Sea' (Shirat HaYam), recited daily in the morning service (Pesukei D'Zimra) to celebrate the miracle of the splitting of the sea."
  },
  "Exodus 15:8": {
    hebrew_start: "Az yashir Moshe...",
    explanation: "The 'Song of the Sea' (Shirat HaYam), recited daily in the morning service (Pesukei D'Zimra) to celebrate the miracle of the splitting of the sea."
  },
  "Exodus 15:9": {
    hebrew_start: "Az yashir Moshe...",
    explanation: "The 'Song of the Sea' (Shirat HaYam), recited daily in the morning service (Pesukei D'Zimra) to celebrate the miracle of the splitting of the sea."
  },
  "Exodus 15:10": {
    hebrew_start: "Az yashir Moshe...",
    explanation: "The 'Song of the Sea' (Shirat HaYam), recited daily in the morning service (Pesukei D'Zimra) to celebrate the miracle of the splitting of the sea."
  },
  "Exodus 15:11": {
    hebrew_start: "Mi chamocha ba'eilim...",
    explanation: "A central part of the liturgy recited before the Amidah, asking 'Who is like You among the mighty, O Lord?'"
  },
  "Exodus 15:12": {
    hebrew_start: "Az yashir Moshe...",
    explanation: "The 'Song of the Sea' (Shirat HaYam), recited daily in the morning service (Pesukei D'Zimra) to celebrate the miracle of the splitting of the sea."
  },
  "Exodus 15:13": {
    hebrew_start: "Az yashir Moshe...",
    explanation: "The 'Song of the Sea' (Shirat HaYam), recited daily in the morning service (Pesukei D'Zimra) to celebrate the miracle of the splitting of the sea."
  },
  "Exodus 15:14": {
    hebrew_start: "Az yashir Moshe...",
    explanation: "The 'Song of the Sea' (Shirat HaYam), recited daily in the morning service (Pesukei D'Zimra) to celebrate the miracle of the splitting of the sea."
  },
  "Exodus 15:15": {
    hebrew_start: "Az yashir Moshe...",
    explanation: "The 'Song of the Sea' (Shirat HaYam), recited daily in the morning service (Pesukei D'Zimra) to celebrate the miracle of the splitting of the sea."
  },
  "Exodus 15:16": {
    hebrew_start: "Az yashir Moshe...",
    explanation: "The 'Song of the Sea' (Shirat HaYam), recited daily in the morning service (Pesukei D'Zimra) to celebrate the miracle of the splitting of the sea."
  },
  "Exodus 15:17": {
    hebrew_start: "Az yashir Moshe...",
    explanation: "The 'Song of the Sea' (Shirat HaYam), recited daily in the morning service (Pesukei D'Zimra) to celebrate the miracle of the splitting of the sea."
  },
  "Exodus 15:18": {
    hebrew_start: "Az yashir Moshe...",
    explanation: "The 'Song of the Sea' (Shirat HaYam), recited daily in the morning service (Pesukei D'Zimra) to celebrate the miracle of the splitting of the sea."
  },
  "Exodus 20:2": {
    hebrew_start: "Anochi Adonai...",
    explanation: "The Ten Commandments (Aseret HaDibrot). These verses are the moral and legal bedrock of the Covenant at Sinai."
  },
  "Exodus 20:3": {
    hebrew_start: "Anochi Adonai...",
    explanation: "The Ten Commandments (Aseret HaDibrot). These verses are the moral and legal bedrock of the Covenant at Sinai."
  },
  "Exodus 20:4": {
    hebrew_start: "Anochi Adonai...",
    explanation: "The Ten Commandments (Aseret HaDibrot). These verses are the moral and legal bedrock of the Covenant at Sinai."
  },
  "Exodus 20:5": {
    hebrew_start: "Anochi Adonai...",
    explanation: "The Ten Commandments (Aseret HaDibrot). These verses are the moral and legal bedrock of the Covenant at Sinai."
  },
  "Exodus 20:6": {
    hebrew_start: "Anochi Adonai...",
    explanation: "The Ten Commandments (Aseret HaDibrot). These verses are the moral and legal bedrock of the Covenant at Sinai."
  },
  "Exodus 20:7": {
    hebrew_start: "Anochi Adonai...",
    explanation: "The Ten Commandments (Aseret HaDibrot). These verses are the moral and legal bedrock of the Covenant at Sinai."
  },
  "Exodus 20:8": {
    hebrew_start: "Anochi Adonai...",
    explanation: "The Ten Commandments (Aseret HaDibrot). These verses are the moral and legal bedrock of the Covenant at Sinai."
  },
  "Exodus 20:9": {
    hebrew_start: "Anochi Adonai...",
    explanation: "The Ten Commandments (Aseret HaDibrot). These verses are the moral and legal bedrock of the Covenant at Sinai."
  },
  "Exodus 20:10": {
    hebrew_start: "Anochi Adonai...",
    explanation: "The Ten Commandments (Aseret HaDibrot). These verses are the moral and legal bedrock of the Covenant at Sinai."
  },
  "Exodus 20:11": {
    hebrew_start: "Anochi Adonai...",
    explanation: "The Ten Commandments (Aseret HaDibrot). These verses are the moral and legal bedrock of the Covenant at Sinai."
  },
  "Exodus 20:12": {
    hebrew_start: "Anochi Adonai...",
    explanation: "The Ten Commandments (Aseret HaDibrot). These verses are the moral and legal bedrock of the Covenant at Sinai."
  },
  "Exodus 20:13": {
    hebrew_start: "Anochi Adonai...",
    explanation: "The Ten Commandments (Aseret HaDibrot). These verses are the moral and legal bedrock of the Covenant at Sinai."
  },
  "Exodus 20:14": {
    hebrew_start: "Anochi Adonai...",
    explanation: "The Ten Commandments (Aseret HaDibrot). These verses are the moral and legal bedrock of the Covenant at Sinai."
  },
  "Exodus 32:33": {
    hebrew_start: "Vayomer Adonai el-Moshe...",
    explanation: "REJECTION OF VICARIOUS ATONEMENT: When Moses offers to give his own life for the people's sins, God explicitly replies: 'Whoever has sinned against Me, him will I blot out of My book.' This is a direct refutation of the claim that one person can die for the sins of others. The Torah establishes that atonement is an individual responsibility; no one can serve as a substitute for another person's spiritual accountability."
  },
  "Exodus 33:20": {
    hebrew_start: "Lo tukhal lir'ot et panai...",
    explanation: "Rabbinic argument: God declares that a human cannot see the Divine fullness and live, emphasizing the infinite gap between Creator and creature. Significance: this verse is read as proof of Divine transcendence, teaching that God is beyond physical human perception and cannot be reduced to embodied form."
  },
  "Exodus 34:6": {
    hebrew_start: "Adonai, Adonai, El rachum...",
    explanation: "The Thirteen Attributes of Mercy. These are the most important verses recited during Selichot and on the High Holidays (Yom Kippur)."
  },
  "Exodus 34:7": {
    hebrew_start: "Adonai, Adonai, El rachum...",
    explanation: "The Thirteen Attributes of Mercy. These are the most important verses recited during Selichot and on the High Holidays (Yom Kippur)."
  },
  "Leviticus 17:11": {
    hebrew_start: "Ki nefesh habasar badam...",
    explanation: "THE BLOOD FALLACY: While other religions claim 'without blood there is no forgiveness,' the Torah provides many non-blood paths to atonement (flour offerings, prayer, charity, and sincere repentance). Furthermore, the Torah defines human sacrifice as an 'abomination' (Deut 12:31). Therefore, using the death of a man as a 'sacrifice' is a violation of the Law, not a requirement for salvation."
  },
  "Leviticus 19:2": {
    hebrew_start: "Kedoshim tihyu...",
    explanation: "The command to 'be holy,' serving as the moral objective for the entire nation."
  },
  "Leviticus 19:18": {
    hebrew_start: "V'ahavta l'rei-acha kamocha...",
    explanation: "Love your neighbor as yourself. This is the 'Golden Rule' of the Torah and the basis for all interpersonal ethics."
  },
  "Numbers 1:18": {
    hebrew_start: "Vayityaldu al mishpechotam...",
    explanation: "Rabbinic argument: this census text defines tribal identity through the house of the father, establishing patrilineal descent as the Torah standard. Significance: in Jewish messianic evaluation, tribal-Davidic status must come through a biological father, making this verse central in lineage debates."
  },
  "Numbers 6:24": {
    hebrew_start: "Yivarechecha Adonai...",
    explanation: "The Priestly Blessing. It is used by parents to bless children and by priests during the synagogue service."
  },
  "Numbers 6:25": {
    hebrew_start: "Yivarechecha Adonai...",
    explanation: "The Priestly Blessing. It is used by parents to bless children and by priests during the synagogue service."
  },
  "Numbers 6:26": {
    hebrew_start: "Yivarechecha Adonai...",
    explanation: "The Priestly Blessing. It is used by parents to bless children and by priests during the synagogue service."
  },
  "Numbers 10:35": {
    hebrew_start: "Vayehi binsoa ha-aron...",
    explanation: "These verses are sung every single time the Torah Ark is opened and closed in the synagogue."
  },
  "Numbers 10:36": {
    hebrew_start: "Vayehi binsoa ha-aron...",
    explanation: "These verses are sung every single time the Torah Ark is opened and closed in the synagogue."
  },
  "Numbers 15:37": {
    hebrew_start: "Vayomer Adonai... V'asu lahem tzitzit...",
    explanation: "The third paragraph of the Shema. It contains the commandment for Tzitzit and the daily remembrance of the Exodus from Egypt."
  },
  "Numbers 15:38": {
    hebrew_start: "Vayomer Adonai... V'asu lahem tzitzit...",
    explanation: "The third paragraph of the Shema. It contains the commandment for Tzitzit and the daily remembrance of the Exodus from Egypt."
  },
  "Numbers 15:39": {
    hebrew_start: "Vayomer Adonai... V'asu lahem tzitzit...",
    explanation: "The third paragraph of the Shema. It contains the commandment for Tzitzit and the daily remembrance of the Exodus from Egypt."
  },
  "Numbers 15:40": {
    hebrew_start: "Vayomer Adonai... V'asu lahem tzitzit...",
    explanation: "The third paragraph of the Shema. It contains the commandment for Tzitzit and the daily remembrance of the Exodus from Egypt."
  },
  "Numbers 15:41": {
    hebrew_start: "Vayomer Adonai... V'asu lahem tzitzit...",
    explanation: "The third paragraph of the Shema. It contains the commandment for Tzitzit and the daily remembrance of the Exodus from Egypt."
  },
  "Numbers 23:19": {
    hebrew_start: "Hahu amar v'lo ya'aseh...",
    explanation: "THE DOCTRINE OF FULFILLMENT: 'Has He said, and shall He not do it?' This verse challenges any doctrine that relies on a 'Second Coming.' Judaism argues that God does not make 'halfway' prophecies. If a claimant fails to bring world peace or gather the exiles, he has failed the Divine test. The excuse of 'finishing the job later' is a human invention that contradicts the Torah's standard for prophetic truth."
  },
  "Numbers 24:5": {
    hebrew_start: "Mah tovu ohaleycha...",
    explanation: "Balaam's blessing. It is the very first verse recited upon entering a synagogue in the morning."
  },
  "Deuteronomy 4:12": {
    hebrew_start: "Vayedaber Adonai aleichem...",
    explanation: "Rabbinic argument: at Sinai the nation heard God's voice but saw no form, making formless revelation part of Judaism's foundation. Significance: this verse is used to affirm Divine incorporeality and to reject the idea that God is revealed through a human body."
  },
  "Deuteronomy 4:15": {
    hebrew_start: "Venishmartem me'od lenafshoteichem...",
    explanation: "Rabbinic argument: Moses warns Israel to guard itself precisely because no form was seen at Horeb, creating a legal-theological boundary against physicalizing God. Significance: Judaism reads this as rejecting incarnation and any physical image of God; had God intended embodiment, Sinai would have revealed it."
  },
  "Deuteronomy 4:35": {
    hebrew_start: "Atah hareita lada'at...",
    explanation: "THE EXCLUSIVITY OF UNITY: 'Unto thee it was shown... that the LORD He is God; there is none else beside Him.' This verse is used to reject the concept of a 'Mediator' or a 'Son' that must be passed through to reach God. If there is 'none else,' then there is no second person of a godhead. Judaism teaches direct access to the Father, making any human intermediary an idol that distracts from the absolute Unity of God."
  },
  "Deuteronomy 6:4": {
    hebrew_start: "Shema Yisrael...",
    explanation: "Rabbinic argument: the Shema proclaims absolute Divine unity, not a composite or divided godhead. Significance: in this framework, the messianic era should bring universal recognition of the One God, so doctrines that divide God's unity are treated as contradictions of Torah monotheism."
  },
  "Deuteronomy 6:5": {
    hebrew_start: "Shema Yisrael...",
    explanation: "The Shema and the first paragraph of its expansion (V'ahavta). This is the most famous declaration of faith in Judaism."
  },
  "Deuteronomy 6:6": {
    hebrew_start: "Shema Yisrael...",
    explanation: "The Shema and the first paragraph of its expansion (V'ahavta). This is the most famous declaration of faith in Judaism."
  },
  "Deuteronomy 6:7": {
    hebrew_start: "Shema Yisrael...",
    explanation: "The Shema and the first paragraph of its expansion (V'ahavta). This is the most famous declaration of faith in Judaism."
  },
  "Deuteronomy 6:8": {
    hebrew_start: "Shema Yisrael...",
    explanation: "The Shema and the first paragraph of its expansion (V'ahavta). This is the most famous declaration of faith in Judaism."
  },
  "Deuteronomy 6:9": {
    hebrew_start: "Shema Yisrael...",
    explanation: "The Shema and the first paragraph of its expansion (V'ahavta). This is the most famous declaration of faith in Judaism."
  },
  "Deuteronomy 8:10": {
    hebrew_start: "V'achalta v'savata...",
    explanation: "The biblical source for 'Birkat HaMazon' (Grace After Meals): 'And you shall eat and be satisfied and bless the Lord your God.'"
  },
  "Deuteronomy 11:13": {
    hebrew_start: "Vehaya im shamoa...",
    explanation: "The second paragraph of the Shema, emphasizing the rewards and consequences of following God's commandments."
  },
  "Deuteronomy 11:14": {
    hebrew_start: "Vehaya im shamoa...",
    explanation: "The second paragraph of the Shema, emphasizing the rewards and consequences of following God's commandments."
  },
  "Deuteronomy 11:15": {
    hebrew_start: "Vehaya im shamoa...",
    explanation: "The second paragraph of the Shema, emphasizing the rewards and consequences of following God's commandments."
  },
  "Deuteronomy 11:16": {
    hebrew_start: "Vehaya im shamoa...",
    explanation: "The second paragraph of the Shema, emphasizing the rewards and consequences of following God's commandments."
  },
  "Deuteronomy 11:17": {
    hebrew_start: "Vehaya im shamoa...",
    explanation: "The second paragraph of the Shema, emphasizing the rewards and consequences of following God's commandments."
  },
  "Deuteronomy 11:18": {
    hebrew_start: "Vehaya im shamoa...",
    explanation: "The second paragraph of the Shema, emphasizing the rewards and consequences of following God's commandments."
  },
  "Deuteronomy 11:19": {
    hebrew_start: "Vehaya im shamoa...",
    explanation: "The second paragraph of the Shema, emphasizing the rewards and consequences of following God's commandments."
  },
  "Deuteronomy 11:20": {
    hebrew_start: "Vehaya im shamoa...",
    explanation: "The second paragraph of the Shema, emphasizing the rewards and consequences of following God's commandments."
  },
  "Deuteronomy 11:21": {
    hebrew_start: "Vehaya im shamoa...",
    explanation: "The second paragraph of the Shema, emphasizing the rewards and consequences of following God's commandments."
  },
  "Deuteronomy 12:32": {
    hebrew_start: "Et kol hadavar asher anochi metzaveh etchem...",
    explanation: "Rabbinic argument: this verse establishes the Torah's immutability by forbidding additions and subtractions to the commandments. Significance: any claim that core Torah law is replaced, canceled, or no longer binding is treated as a direct violation of the covenantal terms set here."
  },
  "Deuteronomy 13:2": {
    hebrew_start: "Ki yakum bekirbecha navi...",
    explanation: "Rabbinic argument: Deuteronomy 13 teaches that signs and wonders, even if genuine, do not validate a prophet whose message redirects worship or weakens Torah observance. Significance: the legal test is the message, not miracles; any prophet who leads away from Sinai's God and commandments is rejected."
  },
  "Deuteronomy 13:3": {
    hebrew_start: "Ki yakum bekirbecha navi...",
    explanation: "Rabbinic argument: Deuteronomy 13 teaches that signs and wonders, even if genuine, do not validate a prophet whose message redirects worship or weakens Torah observance. Significance: the legal test is the message, not miracles; any prophet who leads away from Sinai's God and commandments is rejected."
  },
  "Deuteronomy 13:4": {
    hebrew_start: "Ki yakum bekirbecha navi...",
    explanation: "Rabbinic argument: Deuteronomy 13 teaches that signs and wonders, even if genuine, do not validate a prophet whose message redirects worship or weakens Torah observance. Significance: the legal test is the message, not miracles; any prophet who leads away from Sinai's God and commandments is rejected."
  },
  "Deuteronomy 13:5": {
    hebrew_start: "Ki yakum bekirbecha navi...",
    explanation: "Rabbinic argument: Deuteronomy 13 teaches that signs and wonders, even if genuine, do not validate a prophet whose message redirects worship or weakens Torah observance. Significance: the legal test is the message, not miracles; any prophet who leads away from Sinai's God and commandments is rejected."
  },
  "Deuteronomy 13:6": {
    hebrew_start: "Ki yakum bekirbecha navi...",
    explanation: "Rabbinic argument: Deuteronomy 13 teaches that signs and wonders, even if genuine, do not validate a prophet whose message redirects worship or weakens Torah observance. Significance: the legal test is the message, not miracles; any prophet who leads away from Sinai's God and commandments is rejected."
  },
  "Deuteronomy 16:20": {
    hebrew_start: "Tzedek tzedek tirdof...",
    explanation: "The absolute mandate to pursue justice, emphasizing that the search for righteousness must be active and tireless."
  },
  "Deuteronomy 24:16": {
    hebrew_start: "Lo yumtu avot al banim...",
    explanation: "THE INDIVIDUALITY OF SIN: 'Every man shall be put to death for his own sin.' This is the legal foundation for rejecting the claim of an 'Atoning Death.' The Torah strictly forbids the execution of one person to pay for the crimes of another. A 'sinless' person dying for the world is a legal impossibility and a violation of the very justice system God established at Sinai."
  },
  "Deuteronomy 30:3": {
    hebrew_start: "Veshav Adonai Elohecha...",
    explanation: "Rabbinic argument: these verses define a concrete messianic outcome - the ingathering of exiles and return to the land. Significance: Judaism evaluates messianic claims by historical fulfillment in this world, not by postponing these tasks to a later second mission."
  },
  "Deuteronomy 30:4": {
    hebrew_start: "Veshav Adonai Elohecha...",
    explanation: "Rabbinic argument: these verses define a concrete messianic outcome - the ingathering of exiles and return to the land. Significance: Judaism evaluates messianic claims by historical fulfillment in this world, not by postponing these tasks to a later second mission."
  },
  "Deuteronomy 30:5": {
    hebrew_start: "Veshav Adonai Elohecha...",
    explanation: "Rabbinic argument: these verses define a concrete messianic outcome - the ingathering of exiles and return to the land. Significance: Judaism evaluates messianic claims by historical fulfillment in this world, not by postponing these tasks to a later second mission."
  },
  "Deuteronomy 30:11": {
    hebrew_start: "Ki hamitzvah hazot...",
    explanation: "THE ACCESSIBILITY OF RIGHTEOUSNESS: 'It is not in heaven... that thou mayest do it.' This refutes the claim that humanity is 'fallen' and unable to keep the Law without a supernatural savior. God states here that the Torah is achievable and near to us. We do not need a savior to go to heaven for us; God gave us the power to achieve holiness through our own free will and actions."
  },
  "Deuteronomy 30:12": {
    hebrew_start: "Ki hamitzvah hazot...",
    explanation: "THE ACCESSIBILITY OF RIGHTEOUSNESS: 'It is not in heaven... that thou mayest do it.' This refutes the claim that humanity is 'fallen' and unable to keep the Law without a supernatural savior. God states here that the Torah is achievable and near to us. We do not need a savior to go to heaven for us; God gave us the power to achieve holiness through our own free will and actions."
  },
  "Deuteronomy 30:13": {
    hebrew_start: "Ki hamitzvah hazot...",
    explanation: "THE ACCESSIBILITY OF RIGHTEOUSNESS: 'It is not in heaven... that thou mayest do it.' This refutes the claim that humanity is 'fallen' and unable to keep the Law without a supernatural savior. God states here that the Torah is achievable and near to us. We do not need a savior to go to heaven for us; God gave us the power to achieve holiness through our own free will and actions."
  },
  "Deuteronomy 30:14": {
    hebrew_start: "Ki hamitzvah hazot...",
    explanation: "THE ACCESSIBILITY OF RIGHTEOUSNESS: 'It is not in heaven... that thou mayest do it.' This refutes the claim that humanity is 'fallen' and unable to keep the Law without a supernatural savior. God states here that the Torah is achievable and near to us. We do not need a savior to go to heaven for us; God gave us the power to achieve holiness through our own free will and actions."
  },
  "Deuteronomy 30:19": {
    hebrew_start: "U-vacharta ba-chayim...",
    explanation: "The final plea from Moses to 'choose life,' cementing the concept of human free will as a core theological pillar."
  },
  "Deuteronomy 31:27": {
    hebrew_start: "Ki anochi yadati...",
    explanation: "THE PERMANENCE OF THE COVENANT: Moses warns that even with miracles present, people struggle to obey. Rabbis use this to show that the rejection of foreign doctrines by the Jewish people is a sign of loyalty to the original Sinai Covenant. Rebellion or failure to keep the Law does not cancel the Law or make the Covenant 'old'; it simply reinforces the need for the eternal Torah as our only guide."
  },
  "Deuteronomy 33:4": {
    hebrew_start: "Torah tziva lanu Moshe...",
    explanation: "A verse often taught to children as their first introduction to Torah: 'The Torah that Moses commanded us is the heritage of the congregation of Jacob.'"
  }
};

/**
 * Check if a verse is marked as important
 * @param {string} verseRef - The verse reference (e.g., "Genesis 1:1")
 * @returns {boolean} - True if the verse is important
 */
export function isImportantVerse(verseRef) {
  return verseRef in IMPORTANT_VERSES;
}

/**
 * Get the explanation for an important verse
 * @param {string} verseRef - The verse reference (e.g., "Genesis 1:1")
 * @returns {object|null} - The verse data or null if not important
 */
export function getImportantVerseData(verseRef) {
  return IMPORTANT_VERSES[verseRef] || null;
}

export { IMPORTANT_VERSES };
