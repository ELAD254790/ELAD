import urllib.parse, urllib.request, sys, json
lines = {
 "t1": "בְּדִיּוּק בִּשְׁבִיל זֶה, אֲנַחְנוּ פֹּה.",
 "t2": "לֹא צָרִיךְ לָדַעַת כְּלוּם. אֲנַחְנוּ מַרְאִים לְךָ כָּל מַכְשִׁיר, כָּל תְּנוּעָה.",
 "t3": "תָּכְנִית שֶׁבְּנוּיָה סְבִיב הַמִּשְׁפָּחָה שֶׁלְּךָ. לֹא בִּמְקוֹמָהּ.",
 "t4": "וְאַתָּה אַף פַּעַם לֹא לְבַד. אֲנִי לְיָדְךָ, בְּכָל אִימּוּן.",
 "t5": "חֹדֶשׁ אַחֲרֵי חֹדֶשׁ. הַדֹּפֶק יוֹרֵד, וְהַזְּמַן עוֹלֶה.",
 "t6": "הוּא לֹא צָרִיךְ אַבָּא מֻשְׁלָם. הוּא צָרִיךְ אַבָּא שֶׁמְּשַׂחֵק אִתּוֹ.",
 "t7": "בּוֹא לְאִימּוּן הֶכֵּרוּת.",
}
for k,v in lines.items():
    q = urllib.parse.urlencode({"ie":"UTF-8","client":"tw-ob","tl":"iw","q":v,"ttsspeed":"1"})
    req = urllib.request.Request("https://translate.googleapis.com/translate_tts?"+q, headers={"User-Agent":"Mozilla/5.0"})
    data = urllib.request.urlopen(req, timeout=30).read()
    open(sys.argv[1]+f"/{k}.mp3","wb").write(data)
    print(k, len(data))
