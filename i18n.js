// English / Khmer / French switch for the homepage.
//
// English lives in index.html as written; this file holds the Khmer and French.
// Elements carry data-i18n (inner HTML), data-i18n-alt or data-i18n-aria,
// and the English is read back from the page on load, so there is one copy
// of each language. The choice is kept in localStorage on the visitor's own
// device (never sent anywhere, and not a cookie) and can be linked to with
// ?lang=km, ?lang=fr or ?lang=en.
(function () {
    var km = {
        skip: "រំលង",
        brandHome: "ទំព័រដើម yummers",
        navMain: "ការរុករកមេ",
        navHow: "របៀបប្រើ",
        navStatus: "ចូលរួមសាកល្បងលើ iPhone",
        heroTitle: "វាយតម្លៃ! <br> បង្កើតតារាង!<br><em>និងចែកគ្នា!</em>",
        heroIntro: "yummers ជាសៀវភៅកត់ត្រាអាហារសម្រាប់អ្នកនៅកម្ពុជា ដែលអាចចែករំលែកជាមួយមិត្តភក្តិ វាយតម្លៃកន្លែងដែលអ្នកបានញ៉ាំ កត់ចំណាំកន្លែងដែលចង់ទៅលើកក្រោយ ហើយមើលថាមិត្តភក្តិកំពុងតែចូលចិត្តអ្វី!",
        heroButton: "ចូលរួមសាកល្បងលើ iPhone",
        heroPeek: "ចូលមើលបន្តិចមក",
        exploreAlt: "ផែនទីភ្នំពេញ ដែលបង្ហាញកន្លែងញ៉ាំជាក្រុមៗ និងបញ្ជីកន្លែងដែលនៅលើផែនទី",
        foodCaption: "របស់ឆ្ងាញ់ៗ នៅមិនឆ្ងាយទេ",
        videoTitle: "មើលវា<em>ដំណើរការ</em>",
        videoPlay: "ចាក់វីដេអូណែនាំ yummers",
        videoCaption: "វីដេអូណែនាំ yummers · វិច្ឆិកា ២០២៦",
        previewCaption: "មើលកម្មវិធីសាកល្បង · វិច្ឆិកា · ២០២៦",
        tickerLabel: "វាយតម្លៃទីតាំង, បង្កើតបញ្ជី, ចែករំលែកជាមួយមិត្ត, កម្ពុជាក្នុងដៃអ្នក",
        tickerRate: "វាយតម្លៃទីតាំង",
        tickerLists: "បង្កើតបញ្ជី",
        tickerShare: "ចែករំលែកជាមួយមិត្ត",
        tickerPlate: "កម្ពុជាក្នុងដៃអ្នក",
        friendsTitle: "មើលថា<br>មិត្តភក្តិអ្នក<br><em>ញ៉ាំនៅណា!</em>",
        friendsP1: "តាមដានមិត្តភក្តិ ដើម្បីមើលថាពួកគេចូលចិត្តអ្វី កុម្ម៉ង់អ្វី និងទៅជាមួយនរណា",
        feedAlt: "ទំព័រដើម៖ khen ចូលចិត្ត Brewie Coffee and Bakery មានអ្វីដែលបានកុម្ម៉ង់ និងរូបថត",
        feedTitle: "អ្វីដែលមិត្តភក្តិអ្នកចូលចិត្ត",
        feedText: "មានរូបថត និងអ្វីដែលពួកគេបានកុម្ម៉ង់",
        profileAlt: "ប្រវត្តិរូបរបស់ yummers៖ វាយតម្លៃ ២ អ្នកតាមដាន ១០៩ កំពុងតាមដាន ០ និងឆ្នាំ ២០២៦ របស់អ្នករហូតមកដល់ពេលនេះ",
        profileTitle: "ឆ្នាំញ៉ាំរបស់អ្នក",
        profileText: "កន្លែងដែលអ្នកបានវាយតម្លៃ មនុស្សដែលអ្នកតាមដាន និងឆ្នាំ ២០២៦ របស់អ្នក",
        shareAlt: "បញ្ជី Date night៖ សាធារណៈ ៤ កន្លែង ជាមួយប៊ូតុងចែករំលែក និងផែនទី",
        shareTitle: "ចែករំលែកបញ្ជី",
        shareText: "តំណតែមួយ អ្នកណាក៏អាចបើកមើលបាន",
        findTitle: "ស្វែងរក!<br>មើលលើផែនទី!<br><em>ទៅញ៉ាំ!</em>",
        findP1: "ស្វែងរកម្ហូប ប្រភេទម្ហូប ឬតំបន់ណាមួយ ឬត្រងផែនទីតាមតំបន់ ប្រភេទម្ហូប និងតម្លៃ។ មានកន្លែង ៤,៩៩៩ នៅភ្នំពេញឱ្យរក",
        resultsAlt: "លទ្ធផលស្វែងរក noodles ក្នុងភ្នំពេញ បែងចែកតាមតំបន់",
        resultsTitle: "ត្រង់ទៅរបស់ឆ្ងាញ់",
        resultsText: "លទ្ធផលបែងចែកតាមសង្កាត់",
        themeLabel: "របៀបងងឹត",
        homeTitle: "មគ្គុទ្ទេសក៍ និងមិត្តភក្តិលើទំព័រដើម", // DRAFT (#129)
        homeText: "មគ្គុទ្ទេសក៍របស់យើងមុនគេ បន្ទាប់មកអ្វីដែលមនុស្សកំពុងញ៉ាំ", // DRAFT (#129)
        saveTitle: "រក្សាទុកក្នុងបញ្ជី",
        saveText: "រក្សាទុកកន្លែងមួយក្នុងបញ្ជីណាមួយរបស់អ្នក",
        homeAlt: "ទំព័រដើម Discover៖ មគ្គុទ្ទេសក៍របស់យើង បន្ទាប់មកកន្លែងពេញនិយមប្រចាំសប្តាហ៍នេះ",
        saveAlt: "ផ្ទាំងរក្សាទុក៖ ធីក Want to try, Favourites ឬបញ្ជីណាមួយរបស់អ្នក ដូចជា BBQ in Phnom Penh រួចចុច Done",
        // DRAFT (#129): the Khmer below was drafted by Claude for the story sections (#134); it needs a native speaker's check.
        tourAlt: "ការបង្ហាញខ្លីៗអំពីកម្មវិធី៖ ទំព័រដើម ទំព័រកន្លែងមួយដែលមាន ចូលចិត្ត និង មិនចូលចិត្ត ផែនទីដែលត្រងតាម BBQ ហើយបន្ទាប់មកបញ្ជី",
        rateTitle: "ធ្លាប់ទៅហើយ?<br><em>ប្រាប់ឱ្យដឹង!</em>",
        rateP1: "ចុច ចូលចិត្ត ឬ មិនចូលចិត្ត។ មិនមានពិន្ទុឱ្យពិបាកគិតទេ។ បើចង់ អាចបន្ថែមអ្វីដែលអ្នកកុម្ម៉ង់ និងអ្នកដែលទៅជាមួយ",
        rateAlt: "ទំព័រ Seorae Korean Charcoal BBQ ជាមួយសំណួរ Been here? និងប៊ូតុងពីរ ចូលចិត្ត និង មិនចូលចិត្ត",
        rateTitle1: "ចុចម្តងគឺរួច",
        rateText1: "ចូលចិត្ត ឬមិនចូលចិត្ត នៅលើទំព័រកន្លែងនោះតែម្តង",
        listsTitle: "បញ្ជីសម្រាប់<br><em>គ្រប់អារម្មណ៍!</em>",
        listsP1: "រក្សាទុកកន្លែងមួយក្នុង Want to try, Been here ឬ Favourites ឬបង្កើតបញ្ជីផ្ទាល់ខ្លួន។ មកពី Google Maps? បិទភ្ជាប់តំណបញ្ជី ហើយនាំកន្លែងរបស់អ្នកមកជាមួយ",
        listsYoursAlt: "ទំព័របញ្ជី៖ Been here, Want to try, Favourites និង Your lists ជាមួយបញ្ជីរបស់អ្នកជាផ្ទាំងរូបថត ដូចជា Rooftop bars និង BBQ in Phnom Penh",
        listsYoursTitle: "បញ្ជីទាំងអស់របស់អ្នក",
        listsYoursText: "ឯកជន រហូតដល់អ្នកសម្រេចចែករំលែក",
        importLink: "របៀបនាំចូល",
        shareSecTitle: "ចែករំលែកដោយ<br><em>តំណតែមួយ!</em>",
        shareSecP1: "ធ្វើបញ្ជីឱ្យសាធារណៈ ហើយផ្ញើតំណ។ អ្នកណាក៏អាចបើកក្នុងកម្មវិធីរុករក ទោះមិនមានកម្មវិធីក៏ដោយ",
        webListAlt: "បញ្ជីដែលបានចែករំលែក បើកក្នុងកម្មវិធីរុករកលើទូរសព្ទ៖ Date night ជាបញ្ជីដោយ yummers មានកន្លែង ៣",
        webListTitle: "បើកបានក្នុងកម្មវិធីរុករកណាក៏បាន",
        webListText: "មិត្តភក្តិអ្នកមើលបញ្ជីបាន ដោយមិនចាំបាច់ដំឡើងអ្វីទេ",
        bbqAlt: "ការរុករកជាមួយតម្រង BBQ៖ ផែនទីភ្នំពេញមានម្ជុលសម្គាល់ និងកន្លែង ១៦៧ ក្នុងទិដ្ឋភាព បង្ហាញខាងក្រោម",
        bbqTitle: "ត្រងផែនទី",
        bbqText: "ជ្រើសប្រភេទម្ហូប ហើយមើលថាវានៅឯណា",
        guidesTitle: "ចាប់ផ្តើមជាមួយ<br><em>មគ្គុទ្ទេសក៍របស់យើង!</em>",
        guidesP1: "បញ្ជីកន្លែងញ៉ាំរបស់យើងផ្ទាល់នៅភ្នំពេញ ៖ កូរ៉េ ខ្មែរ សាច់អាំង អាហារតាមផ្លូវ បារលើដំបូល និងអាហារបួស។ អ្នកឃើញវាមុនគេលើទំព័រដើម ហើយអាចអានវានៅទីនេះផងដែរ។", // DRAFT (#129)
        guidesButton: "មើលមគ្គុទ្ទេសក៍", // DRAFT (#129)
        navGuides: "មគ្គុទ្ទេសក៍", // DRAFT (#129)
        navBlog: "ប្លក់", // DRAFT (#135)
        navAbout: "អំពីយើង", // DRAFT (#129)
        navContact: "ទំនាក់ទំនង", // DRAFT (#129)
        navHelp: "ជំនួយ", // DRAFT
        menuTag: "yummers គឺជាសៀវភៅកត់ត្រាអាហារសង្គមសម្រាប់កម្ពុជា ៖ វាយតម្លៃកន្លែងញ៉ាំ រក្សាបញ្ជី និងចែករំលែកជាមួយមិត្តភក្តិ។", // DRAFT (#129)
        guidesAlt: "ទំព័រដើម៖ Start with our guides ជាមួយកាត Street food in Phnom Penh និង Coffee and bakeries រួចហើយ People to follow",
        guidesTitle1: "កន្លែងចាប់ផ្តើម",
        guidesText1: "បញ្ជីពីក្រុម yummers នៅលើទំព័រដើម",
        closingTitle: "ប្រើ <em>Android ឬ?</em>",
        closingText: "ឥឡូវនេះ yummers មានលើ iPhone ហើយ។ ទុកអ៊ីមែលរបស់អ្នក ហើយយើងនឹងប្រាប់អ្នកនៅពេលវាមានលើ Android",
        signupEmail: "អ៊ីមែលរបស់អ្នក",
        signupButton: "ចូលរួមបញ្ជី Android",
        signupNote: 'យើងនឹងផ្ញើអ៊ីមែលទៅអ្នកតែអំពី yummers លើ Android ប៉ុណ្ណោះ។ មើល<a href="/privacy#android-waitlist">គោលការណ៍ឯកជនភាព</a>របស់យើង',
        signupDone: "ជិតរួចហើយ! សូមពិនិត្យប្រអប់អ៊ីមែលរបស់អ្នក ដើម្បីរកតំណបញ្ជាក់អ៊ីមែល",
        signupError: "មិនដំណើរការទេ។ សូមពិនិត្យអ៊ីមែលរបស់អ្នក ហើយព្យាយាមម្ដងទៀត",
        backTop: "ត្រឡប់ទៅខាងលើ",
        footerNav: "បាតទំព័រ",
        footerLang: "English",
        footExplore: "រុករក", // DRAFT (#129)
        footLegal: "ច្បាប់", // DRAFT (#129)
        footBeta: "ចូលរួមសាកល្បង", // DRAFT (#129)
        footTag: "វាយតម្លៃកន្លែងដែលអ្នកបានញ៉ាំ រក្សាបញ្ជី និងចែករំលែកជាមួយមិត្តភក្តិ។", // DRAFT (#129)
        footMade: "ធ្វើនៅភ្នំពេញ", // DRAFT (#129)
        privacy: "ឯកជនភាព",
        terms: "លក្ខខណ្ឌ",
        about: "អំពីយើង",
        contact: "ទាក់ទង",
        onInstagram: "yummers នៅលើ Instagram",
        onFacebook: "yummers នៅលើ Facebook",
        onLinkedIn: "yummers នៅលើ LinkedIn",
        onTikTok: "yummers នៅលើ TikTok",
        langGroup: "ភាសា"
    };

    var fr = {
        skip: "Aller au contenu",
        brandHome: "Accueil yummers",
        navMain: "Navigation principale",
        navHow: "Comment ça marche",
        navStatus: "Rejoindre la bêta iPhone",
        heroTitle: "Goûtez. Notez.<br><em>Partagez.</em>",
        heroIntro: "yummers, c’est votre carnet d’adresses gourmand au Cambodge, à partager entre amis. Notez les restos que vous avez testés, gardez sous le coude ceux qui vous font envie et découvrez les coups de cœur de vos amis.",
        heroButton: "Rejoindre la bêta iPhone",
        heroPeek: "Jetez un œil",
        exploreAlt: "Carte de Phnom Penh avec des groupes d’adresses, et la liste des adresses visibles en dessous",
        foodCaption: "Un bon plat vous attend au coin de la rue.",
        videoTitle: "Voyez-la en <em>action.</em>",
        videoPlay: "Lire la vidéo de lancement de yummers",
        videoCaption: "La vidéo de lancement de yummers · novembre 2026",
        previewCaption: "Aperçu de l’app · novembre 2026",
        tickerLabel: "Notez vos restos, Créez vos listes, Partagez avec vos amis, Le Cambodge dans l’assiette",
        tickerRate: "Notez vos restos",
        tickerLists: "Créez vos listes",
        tickerShare: "Partagez avec vos amis",
        tickerPlate: "Le Cambodge dans l’assiette",
        friendsTitle: "Voyez où<br>mangent<br><em>vos amis.</em>",
        friendsP1: "Suivez vos amis pour voir ce qu’ils ont aimé, ce qu’ils ont commandé et avec qui ils y sont allés.",
        feedAlt: "Accueil : khen a aimé Brewie Coffee and Bakery, avec la commande et une photo",
        feedTitle: "Ce que vos amis ont aimé.",
        feedText: "Avec des photos et ce qu’ils ont commandé.",
        profileAlt: "Profil de yummers : 2 notés, 109 abonnés, 0 abonnement et son année 2026 jusqu’ici",
        profileTitle: "Votre année gourmande.",
        profileText: "Vos adresses notées, les gens que vous suivez et votre 2026 jusqu’ici.",
        shareAlt: "La liste Date night : publique, 4 adresses, avec un bouton de partage et une carte",
        shareTitle: "Partagez une liste.",
        shareText: "Un lien, et tout le monde peut l’ouvrir.",
        findTitle: "Cherchez.<br>Trouvez.<br><em>Régalez-vous.</em>",
        findP1: "Cherchez un plat, une cuisine ou un quartier, ou filtrez la carte par quartier, cuisine et prix. 4 999 lieux à trouver à Phnom Penh.",
        resultsAlt: "Résultats pour « noodles », regroupés par quartier à Phnom Penh",
        resultsTitle: "Droit au but.",
        resultsText: "Résultats regroupés par quartier.",
        themeLabel: "Mode sombre",
        homeTitle: "Guides et amis sur l’accueil", // DRAFT (#129)
        homeText: "Nos guides d’abord, puis ce que les gens mangent.", // DRAFT (#129)
        saveTitle: "Enregistrer dans une liste",
        saveText: "Enregistrez un lieu dans n’importe laquelle de vos listes.",
        homeAlt: "Accueil, Discover : nos guides, puis les meilleurs lieux de la semaine",
        saveAlt: "La fenêtre Enregistrer : cochez Want to try, Favourites ou l’une de vos listes, comme BBQ in Phnom Penh, puis Done",
        // DRAFT (#129): the French below was drafted by Claude for the story sections (#134); it needs a native speaker's check.
        tourAlt: "Un court tour de l’app : l’accueil, la page d’un lieu avec J’ai aimé et Je n’ai pas aimé, la carte filtrée sur BBQ, puis les listes",
        rateTitle: "Vous y êtes allé ?<br><em>Dites-le.</em>",
        rateP1: "Touchez J’ai aimé ou Je n’ai pas aimé. Pas de note à ruminer. Ajoutez ce que vous avez commandé et avec qui vous y êtes allé si vous voulez.",
        rateAlt: "La page de Seorae Korean Charcoal BBQ, avec « Been here? » et deux boutons : Liked it et Didn’t like it",
        rateTitle1: "Une touche pour noter.",
        rateText1: "J’ai aimé ou je n’ai pas aimé, directement sur la page du lieu.",
        listsTitle: "Une liste pour<br><em>chaque envie.</em>",
        listsP1: "Enregistrez un lieu dans Want to try, Been here ou Favourites, ou créez vos propres listes. Vous venez de Google Maps ? Collez le lien d’une liste et rapatriez vos adresses.",
        listsYoursAlt: "Listes : Been here, Want to try, Favourites et Your lists, avec vos listes en vignettes photo, comme Rooftop bars et BBQ in Phnom Penh",
        listsYoursTitle: "Toutes vos listes.",
        listsYoursText: "Privées, jusqu’à ce que vous décidiez de les partager.",
        importLink: "Comment importer",
        shareSecTitle: "Partagez avec<br><em>un seul lien.</em>",
        shareSecP1: "Rendez une liste publique et envoyez le lien. Chacun peut l’ouvrir dans son navigateur, même sans l’app.",
        webListAlt: "Une liste partagée ouverte dans le navigateur d’un téléphone : Date night, une liste de yummers avec 3 lieux",
        webListTitle: "S’ouvre dans n’importe quel navigateur.",
        webListText: "Vos amis voient la liste sans rien installer.",
        bbqAlt: "Explorer avec le filtre BBQ : une carte de Phnom Penh avec des repères, et 167 lieux visibles listés en dessous",
        bbqTitle: "Filtrez la carte.",
        bbqText: "Choisissez une cuisine et voyez où elle se trouve.",
        guidesTitle: "Commencez par<br><em>nos guides.</em>",
        guidesP1: "Nos propres adresses à Phnom Penh, : coréen, khmer, barbecue, cuisine de rue, bars en rooftop, et végétarien et vegan. Elles s’affichent en premier sur l’accueil, et vous pouvez les lire ici aussi.", // DRAFT (#129)
        guidesButton: "Voir les guides", // DRAFT (#129)
        navGuides: "Guides", // DRAFT (#129)
        navBlog: "Blog", // DRAFT (#135)
        navAbout: "À propos", // DRAFT (#129)
        navContact: "Contact", // DRAFT (#129)
        navHelp: "Aide", // DRAFT
        menuTag: "yummers est un carnet gourmand social pour le Cambodge : notez des adresses, gardez des listes et partagez-les avec vos amis.", // DRAFT (#129)
        guidesAlt: "L’accueil : Start with our guides, avec des cartes pour Street food in Phnom Penh et Coffee and bakeries, puis People to follow",
        guidesTitle1: "Par où commencer.",
        guidesText1: "Des listes de l’équipe yummers, sur l’accueil.",
        closingTitle: "Sur <em>Android ?</em>",
        closingText: "yummers est disponible sur iPhone. Laissez-nous votre e-mail, on vous préviendra dès qu’elle arrive sur Android.",
        signupEmail: "Votre e-mail",
        signupButton: "Rejoindre la liste Android",
        signupNote: 'On ne vous écrira qu’au sujet de yummers sur Android. Voir notre <a href="/privacy#android-waitlist">politique de confidentialité</a>.',
        signupDone: "Presque fini ! Un lien vous attend dans votre boîte de réception pour confirmer votre adresse.",
        signupError: "Oups, ça n’a pas marché. Vérifiez votre adresse e-mail et réessayez.",
        backTop: "Retour en haut",
        footerNav: "Pied de page",
        footerLang: "English",
        footExplore: "Explorer", // DRAFT (#129)
        footLegal: "Mentions légales", // DRAFT (#129)
        footBeta: "Rejoindre la bêta", // DRAFT (#129)
        footTag: "Notez les endroits où vous avez mangé, gardez des listes, partagez-les avec vos amis.", // DRAFT (#129)
        footMade: "Fait à Phnom Penh", // DRAFT (#129)
        privacy: "Confidentialité",
        terms: "Conditions",
        about: "À propos",
        contact: "Contact",
        onInstagram: "yummers sur Instagram",
        onFacebook: "yummers sur Facebook",
        onLinkedIn: "yummers sur LinkedIn",
        onTikTok: "yummers sur TikTok",
        langGroup: "Langue"
    };

    var strings = { km: km, fr: fr };

    var KEY = "hr-lang";
    var root = document.documentElement;
    var group = document.querySelector(".lang-switch");
    var buttons = group.querySelectorAll("button");
    var targets = [
        ["data-i18n", null],
        ["data-i18n-alt", "alt"],
        ["data-i18n-aria", "aria-label"]
    ];

    // Remember the English before anything is swapped.
    var english = [];
    targets.forEach(function (t) {
        document.querySelectorAll("[" + t[0] + "]").forEach(function (el) {
            english.push({
                el: el,
                key: el.getAttribute(t[0]),
                attr: t[1],
                text: t[1] ? el.getAttribute(t[1]) : el.innerHTML
            });
        });
    });

    function apply(lang) {
        var t = strings[lang] || {};
        english.forEach(function (item) {
            var value = t[item.key] || item.text;
            if (item.attr) item.el.setAttribute(item.attr, value);
            else item.el.innerHTML = value;
        });
        root.lang = strings[lang] ? lang : "en";
        buttons.forEach(function (b) {
            b.setAttribute("aria-pressed", b.getAttribute("data-lang") === root.lang ? "true" : "false");
        });
        slide();
    }

    // Move the dark pill (style.css, .lang-switch:before) under the chosen button.
    function slide() {
        var on = group.querySelector('[aria-pressed="true"]');
        group.style.setProperty("--pill-x", on.offsetLeft + "px");
        group.style.setProperty("--pill-w", on.offsetWidth + "px");
    }

    function isLang(l) { return l === "en" || !!strings[l]; }

    function saved() {
        var fromUrl = new URLSearchParams(location.search).get("lang");
        if (isLang(fromUrl)) return fromUrl;
        try { return localStorage.getItem(KEY); } catch (e) { return null; }
    }

    var start = saved();
    if (start && strings[start]) apply(start);
    slide();
    addEventListener("resize", slide);
    if (document.fonts) document.fonts.ready.then(slide);

    buttons.forEach(function (b) {
        b.addEventListener("click", function () {
            var next = b.getAttribute("data-lang");
            if (!isLang(next) || next === root.lang) return;
            group.classList.add("lang-slide");
            apply(next);
            try { localStorage.setItem(KEY, next); } catch (e) { }
            // Keep a shared link in the language being read.
            var url = new URL(location.href);
            url.searchParams.set("lang", next);
            history.replaceState(null, "", url);
        });
    });
})();
