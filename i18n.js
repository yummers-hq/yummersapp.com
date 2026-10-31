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
        signinAlt: "អេក្រង់ចូលគណនី yummers ៖ Rate it. List it. Share it. ជាមួយប៊ូតុង Continue with Apple, Continue with Google, Continue with Email និង Look around first",
        previewCaption: "មើលកម្មវិធីសាកល្បង · តុលា · ២០២៦",
        tickerLabel: "វាយតម្លៃទីតាំង, បង្កើតបញ្ជី, ចែករំលែកជាមួយមិត្ត, កម្ពុជាក្នុងដៃអ្នក",
        tickerRate: "វាយតម្លៃទីតាំង",
        tickerLists: "បង្កើតបញ្ជី",
        tickerShare: "ចែករំលែកជាមួយមិត្ត",
        tickerPlate: "កម្ពុជាក្នុងដៃអ្នក",
        rateTitle: "ញ៉ាំរួចហើយ?<br>វាយតម្លៃ!<br><em>ដាក់ក្នុងបញ្ជី!</em>",
        rateP1: "ចូលចិត្ត ឬមិនចូលចិត្ត ចុចតែម្ដង។ កន្លែងដែលអ្នកធ្លាប់ញ៉ាំទាំងអស់នៅក្នុង «ធ្លាប់មក» ហើយបញ្ជីរបស់អ្នកពោរពេញដោយកន្លែងដែលគួរត្រឡប់ទៅវិញ",
        placeAlt: "Pépé Bistro៖ កំពុងបើក ម្ហូបបារាំង ដូនពេញ ជាមួយសំណួរ ធ្លាប់មកទីនេះទេ? ចូលចិត្ត ឬ មិនចូលចិត្ត",
        placeTitle: "ចុចតែម្ដង",
        placeText: "ចូលចិត្ត ឬមិនចូលចិត្ត នោះហើយជាការវាយតម្លៃ",
        beenAlt: "បញ្ជី ធ្លាប់មក៖ កន្លែងប្រាំមួយនៅភ្នំពេញ នីមួយៗមានមតិខ្លីៗ",
        beenTitle: "គ្រប់កន្លែងដែលអ្នកធ្លាប់ញ៉ាំ",
        beenText: "មតិរបស់អ្នក តម្រង និងផែនទី ក្នុងបញ្ជីតែមួយ",
        yourListsAlt: "បញ្ជីរបស់អ្នក៖ Laptop-friendly cafés, Date night និង Noodles I’d cross town for នីមួយៗមានរូបគម្រប",
        yourListsTitle: "បញ្ជីដែលអ្នកបង្កើត",
        yourListsText: "កន្លែងណាត់ជួប ហាងកាហ្វេធ្វើការ គុយទាវដែលគួរជិះឆ្ងាយទៅញ៉ាំ",
        friendsTitle: "មើលថា<br>មិត្តភក្តិអ្នក<br><em>ញ៉ាំនៅណា!</em>",
        friendsP1: "តាមដានមិត្តភក្តិ ដើម្បីមើលថាពួកគេចូលចិត្តអ្វី កុម្ម៉ង់អ្វី និងទៅជាមួយនរណា។ ចែករំលែកបញ្ជីណាមួយដោយតំណតែមួយ",
        feedAlt: "ទំព័រដើម៖ dara_noodles ចូលចិត្ត Kravanh Restaurant ជាមួយ sophea_eats មានរូបអាម៉ុកត្រី និងអ្វីដែលបានកុម្ម៉ង់",
        feedTitle: "អ្វីដែលមិត្តភក្តិអ្នកចូលចិត្ត",
        feedText: "មានរូបថត និងអ្វីដែលពួកគេបានកុម្ម៉ង់",
        profileAlt: "ប្រវត្តិរូបរបស់ Sophea៖ វាយតម្លៃ ៦ អ្នកតាមដាន ៤ កំពុងតាមដាន ៣ និងឆ្នាំ ២០២៦ របស់អ្នករហូតមកដល់ពេលនេះ",
        profileTitle: "ឆ្នាំញ៉ាំរបស់អ្នក",
        profileText: "កន្លែងដែលអ្នកបានវាយតម្លៃ មនុស្សដែលអ្នកតាមដាន និងឆ្នាំ ២០២៦ របស់អ្នក",
        shareAlt: "បញ្ជី Date night៖ សាធារណៈ ៤ កន្លែង ជាមួយប៊ូតុងចែករំលែក និងផែនទី",
        shareTitle: "ចែករំលែកបញ្ជី",
        shareText: "តំណតែមួយ អ្នកណាក៏អាចបើកមើលបាន",
        findTitle: "ស្វែងរក!<br>មើលលើផែនទី!<br><em>ទៅញ៉ាំ!</em>",
        findP1: "ស្វែងរកម្ហូប ប្រភេទម្ហូប ឬតំបន់ណាមួយ ហើយមើលបញ្ជីរបស់អ្នកលើផែនទី",
        searchAlt: "អេក្រង់ស្វែងរក ជាមួយប្រភេទម្ហូប តំបន់ក្នុងភ្នំពេញ និងកន្លែងពេញនិយម",
        searchTitle: "ប្រអប់ស្វែងរកតែមួយ",
        searchText: "កន្លែង ប្រភេទម្ហូប និងតំបន់ ទាំងអស់នៅកន្លែងតែមួយ",
        resultsAlt: "លទ្ធផលស្វែងរក noodles បែងចែកតាមទីក្រុង និងតំបន់",
        resultsTitle: "ត្រង់ទៅរបស់ឆ្ងាញ់",
        resultsText: "លទ្ធផលបែងចែកតាមទីក្រុង និងសង្កាត់",
        listMapAlt: "បញ្ជី Noodles I'd cross town for បង្ហាញលើផែនទីភ្នំពេញ",
        listMapTitle: "បញ្ជីរបស់អ្នក លើផែនទី",
        listMapText: "មើលថាកន្លែងនីមួយៗក្នុងបញ្ជីនៅឯណា",
        closingTitle: "ជួបគ្នានៅ<br><em>ហាងសំណព្វថ្មីរបស់អ្នក</em>",
        closingText: "កម្មវិធីសាកល្បងមានតែលើ iPhone សម្រាប់ពេលនេះ ហើយនឹងបើកនៅខែវិច្ឆិកា<br>ទុកអ៊ីមែលរបស់អ្នក ហើយយើងនឹងផ្ញើការអញ្ជើញទៅអ្នក",
        signupEmail: "អ៊ីមែលរបស់អ្នក",
        signupButton: "ចូលរួមសាកល្បងលើ iPhone",
        signupNote: 'យើងនឹងផ្ញើអ៊ីមែលទៅអ្នកតែអំពីកម្មវិធីសាកល្បងប៉ុណ្ណោះ។ មើល<a href="/privacy#beta-sign-up">គោលការណ៍ឯកជនភាព</a>របស់យើង',
        signupDone: "ជិតរួចហើយ! សូមពិនិត្យប្រអប់អ៊ីមែលរបស់អ្នក ដើម្បីរកតំណបញ្ជាក់អ៊ីមែល",
        signupError: "មិនដំណើរការទេ។ សូមពិនិត្យអ៊ីមែលរបស់អ្នក ហើយព្យាយាមម្ដងទៀត",
        backTop: "ត្រឡប់ទៅខាងលើ",
        footerNav: "បាតទំព័រ",
        footerLang: "English",
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
        signinAlt: "Écran de connexion de yummers : Rate it. List it. Share it., avec Continue with Apple, Continue with Google, Continue with Email et Look around first",
        previewCaption: "Aperçu de l’app · octobre 2026",
        tickerLabel: "Notez vos restos, Créez vos listes, Partagez avec vos amis, Le Cambodge dans l’assiette",
        tickerRate: "Notez vos restos",
        tickerLists: "Créez vos listes",
        tickerShare: "Partagez avec vos amis",
        tickerPlate: "Le Cambodge dans l’assiette",
        rateTitle: "Vous y avez mangé ?<br>Notez.<br><em>Listez.</em>",
        rateP1: "J’ai aimé ou je n’ai pas aimé, en un geste. Tous les lieux où vous avez mangé restent dans une liste, et vos propres listes se remplissent d’adresses où revenir.",
        placeAlt: "Pépé Bistro : ouvert, cuisine française, Daun Penh, avec « Vous y êtes allé ? J’ai aimé ou Je n’ai pas aimé »",
        placeTitle: "Un seul geste.",
        placeText: "J’ai aimé ou pas : c’est noté.",
        beenAlt: "Les lieux où vous êtes allé : six adresses de Phnom Penh, chacune avec un court commentaire",
        beenTitle: "Partout où vous avez mangé.",
        beenText: "Vos commentaires, des filtres et une carte, dans une seule liste.",
        yourListsAlt: "Vos listes : Laptop-friendly cafés, Date night et Noodles I’d cross town for, chacune avec des photos en couverture",
        yourListsTitle: "Vos propres listes.",
        yourListsText: "Dîners en amoureux, cafés pour travailler, nouilles qui valent le détour.",
        friendsTitle: "Voyez où<br>mangent<br><em>vos amis.</em>",
        friendsP1: "Suivez vos amis pour voir ce qu’ils ont aimé, ce qu’ils ont commandé et avec qui ils y sont allés. Partagez n’importe quelle liste avec un simple lien.",
        feedAlt: "Accueil : dara_noodles a aimé Kravanh Restaurant avec sophea_eats, avec une photo d’amok de poisson et la commande",
        feedTitle: "Ce que vos amis ont aimé.",
        feedText: "Avec des photos et ce qu’ils ont commandé.",
        profileAlt: "Profil de Sophea : 6 notés, 4 abonnés, 3 abonnements et son année 2026 jusqu’ici",
        profileTitle: "Votre année gourmande.",
        profileText: "Vos adresses notées, les gens que vous suivez et votre 2026 jusqu’ici.",
        shareAlt: "La liste Date night : publique, 4 adresses, avec un bouton de partage et une carte",
        shareTitle: "Partagez une liste.",
        shareText: "Un lien, et tout le monde peut l’ouvrir.",
        findTitle: "Cherchez.<br>Trouvez.<br><em>Régalez-vous.</em>",
        findP1: "Cherchez un plat, une cuisine ou un quartier, et retrouvez vos listes sur la carte.",
        searchAlt: "Écran de recherche avec des cuisines, des quartiers de Phnom Penh et les adresses populaires",
        searchTitle: "Une seule barre de recherche.",
        searchText: "Restos, cuisines et quartiers, tout au même endroit.",
        resultsAlt: "Résultats pour « noodles », regroupés par ville et par quartier",
        resultsTitle: "Droit au but.",
        resultsText: "Résultats regroupés par ville et par quartier.",
        listMapAlt: "La liste « Noodles I'd cross town for » sur une carte de Phnom Penh",
        listMapTitle: "Vos listes, sur une carte.",
        listMapText: "Situez d’un coup d’œil chaque adresse de vos listes.",
        closingTitle: "Rendez-vous à<br>votre prochaine <em>adresse fétiche.</em>",
        closingText: "Pour l’instant, la bêta est réservée à l’iPhone et ouvrira en novembre. <br>Laissez-nous votre e-mail, on vous enverra une invitation.",
        signupEmail: "Votre e-mail",
        signupButton: "Rejoindre la bêta iPhone",
        signupNote: 'On ne vous écrira qu’au sujet de la bêta. Voir notre <a href="/privacy#beta-sign-up">politique de confidentialité</a>.',
        signupDone: "Presque fini ! Un lien vous attend dans votre boîte de réception pour confirmer votre adresse.",
        signupError: "Oups, ça n’a pas marché. Vérifiez votre adresse e-mail et réessayez.",
        backTop: "Retour en haut",
        footerNav: "Pied de page",
        footerLang: "English",
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
