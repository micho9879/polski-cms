document.addEventListener("DOMContentLoaded", () => {
    const loginView = document.getElementById("login-view");
    const levelSelection = document.getElementById("level-selection");
    const passwordForm = document.getElementById("password-form");
    const passwordInput = document.getElementById("password-input");
    const passwordTitle = document.getElementById("password-title");
    const submitLoginBtn = document.getElementById("submit-login-btn");
    const cancelLoginBtn = document.getElementById("cancel-login-btn");
    const loginError = document.getElementById("login-error");
    const homeView = document.getElementById("home-view");
    const postsGrid = document.getElementById("posts-grid");
    const articleView = document.getElementById("article-view");
    const articleContent = document.getElementById("article-content");
    const categoryTabs = document.getElementById("category-tabs");
    const searchInput = document.getElementById("search-input");
    const noResults = document.getElementById("no-results");
    const backBtn = document.getElementById("back-btn");
    const backToLevelsBtn = document.getElementById("back-to-levels-btn");
    const heroTitle = document.getElementById("hero-title");
    const heroSubtitle = document.getElementById("hero-subtitle");
    const notFoundView = document.getElementById("not-found-view");
    const printBtn = document.getElementById("print-btn");

    let allPosts = [];
    let activeCategory = 'Wszystkie';
    let currentLevel = '';
    let settingsData = null;
    let lastFetchedLevel = '';
    
    let favorites = JSON.parse(localStorage.getItem('polski_favorites') || '[]');
    function toggleFavorite(slug) {
        if (favorites.includes(slug)) {
            favorites = favorites.filter(f => f !== slug);
        } else {
            favorites.push(slug);
        }
        localStorage.setItem('polski_favorites', JSON.stringify(favorites));
        
        // Zaktualizuj serduszka na siatce bez przeładowywania DOM
        updateGridHearts();
        
        // Przelicz zakładki
        let favCount = 0;
        allPosts.forEach(p => { if (favorites.includes(p.slug)) favCount++; });
        
        // Jeśli usunęliśmy ostatnie ulubione będąc w zakładce Ulubione, wracamy do Wszystkich
        if (activeCategory === 'Ulubione' && favCount === 0) {
            activeCategory = 'Wszystkie';
        }
        
        renderTabs(allPosts);
        filterPosts();
        
        // Zaktualizuj widok artykułu jeśli jest otwarty
        const heartBtn = document.getElementById(`fav-btn-${slug}`);
        if(heartBtn) {
            const heartSvg = heartBtn.querySelector('svg');
            if (heartSvg) {
                heartSvg.classList.toggle('text-red-500');
                heartSvg.classList.toggle('fill-current');
                heartSvg.classList.toggle('text-slate-400');
                heartSvg.classList.toggle('dark:text-slate-500');
            }
            heartBtn.classList.add('heart-animate');
            setTimeout(() => heartBtn.classList.remove('heart-animate'), 300);
        }
    }

    function updateGridHearts() {
        document.querySelectorAll('.fav-grid-btn').forEach(btn => {
            const slug = btn.dataset.slug;
            const svg = btn.querySelector('svg');
            if (favorites.includes(slug)) {
                svg.classList.remove('text-white', 'drop-shadow-md');
                svg.classList.add('text-red-500', 'fill-current');
            } else {
                svg.classList.add('text-white', 'drop-shadow-md');
                svg.classList.remove('text-red-500', 'fill-current');
            }
        });
    }

    // Sterowanie rozmiarem czcionki
    let currentFontSize = 18; // bazowy rozmiar w px (tekst-lg)
    const fontMinusBtn = document.getElementById("font-minus-btn");
    const fontPlusBtn = document.getElementById("font-plus-btn");
    
    if (fontMinusBtn) fontMinusBtn.addEventListener('click', () => changeFontSize(-2));
    if (fontPlusBtn) fontPlusBtn.addEventListener('click', () => changeFontSize(2));
    
    function changeFontSize(change) {
        currentFontSize = Math.max(14, Math.min(26, currentFontSize + change));
        const proseDiv = document.querySelector('.prose');
        if (proseDiv) proseDiv.style.fontSize = `${currentFontSize}px`;
    }

    // Pasek postępu czytania
    let isScrolling = false;
    window.addEventListener('scroll', () => {
        if (articleView.classList.contains('hidden')) return;
        if (!isScrolling) {
            window.requestAnimationFrame(() => {
                const scrollPx = document.documentElement.scrollTop || document.body.scrollTop;
                const winHeightPx = document.documentElement.scrollHeight - document.documentElement.clientHeight;
                const scrolled = scrollPx / winHeightPx; // 0 do 1
                const progressBar = document.getElementById("progress-bar");
                if (progressBar) progressBar.style.transform = `scaleX(${scrolled})`;
                isScrolling = false;
            });
            isScrolling = true;
        }
    });

    initTheme();

    // --- PRZEŁĄCZANIE WIDOKÓW Z ANIMACJĄ ---
    const allViews = [loginView, homeView, articleView, notFoundView];

    function showView(viewEl) {
        allViews.forEach(v => {
            if (v === viewEl) {
                v.classList.remove('hidden');
                requestAnimationFrame(() => { v.classList.add('fade-in'); });
            } else {
                v.classList.add('hidden');
                v.classList.remove('fade-in');
            }
        });
    }

    // --- ROUTER & ZABEZPIECZENIA ---
    window.addEventListener('hashchange', handleRoute);

    function handleRoute() {
        const hash = window.location.hash;

        if (hash.startsWith('#/artykul/')) {
            const parts = hash.split('/');
            const level = decodeURIComponent(parts[2]);
            const slug = decodeURIComponent(parts[3]);
            if (level && slug) { requireAuth(level, () => loadArticleRoute(level, slug)); return; }
        }
        if (hash === '#/Podstawa' || hash === '#/Rozszerzenie') {
            const level = hash.replace('#/', '');
            requireAuth(level, () => loadGridRoute(level));
            return;
        }
        if (!hash || hash === '#' || hash === '#/') {
            showView(loginView);
            levelSelection.classList.remove('hidden');
            passwordForm.classList.add('hidden');
            loginError.classList.add('hidden');
            currentLevel = '';
            return;
        }
        // Nieznany hash = 404
        showView(notFoundView);
        if(notFoundView) notFoundView.style.display = 'flex';
    }

    function requireAuth(level, onSuccess) {
        const savedPass = localStorage.getItem(`pass_${level}`);
        if (!savedPass) {
            window.location.hash = '#/';
            return;
        }

        if (settingsData) {
            validateAndProceed(level, savedPass, onSuccess);
        } else {
            fetch('https://api.github.com/repos/micho9879/polski-cms/contents/public/data/settings.json', { cache: 'no-cache' })
                .then(res => { if (res.status === 404) return null; if (!res.ok) throw new Error('API'); return res.json(); })
                .then(fi => fi ? fetch(`${fi.download_url}?v=${fi.sha}`, { cache: 'no-cache' }).then(r => r.json()) : null)
                .then(s => { 
                    if (s) settingsData = s; 
                    validateAndProceed(level, savedPass, onSuccess);
                })
                .catch(() => {
                    // W razie błędu API (limit) wpuszczamy ucznia awaryjnie, by nie stracił dostępu przed maturą
                    onSuccess();
                });
        }
    }

    function validateAndProceed(level, savedPass, onSuccess) {
        const correct = level === 'Podstawa' ? settingsData?.password_podstawa : settingsData?.password_rozszerzenie;
        if (savedPass === correct) {
            onSuccess();
        } else {
            localStorage.removeItem(`pass_${level}`);
            window.location.hash = '#/';
        }
    }

    // --- EKRAN LOGOWANIA ---
    document.querySelectorAll('.level-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const level = btn.dataset.level;
            if (localStorage.getItem(`pass_${level}`)) {
                window.location.hash = `#/${level}`; // Router wywoła requireAuth
            } else {
                currentLevel = level;
                levelSelection.classList.add('hidden');
                passwordForm.classList.remove('hidden');
                passwordTitle.textContent = `Hasło: Matura ${currentLevel}`;
                passwordInput.value = '';
                passwordInput.focus();
                loginError.classList.add('hidden');
            }
        });
    });

    cancelLoginBtn.addEventListener('click', () => { window.location.hash = '#/'; });
    backToLevelsBtn.addEventListener('click', () => { window.location.hash = '#/'; });
    
    const logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('pass_Podstawa');
            localStorage.removeItem('pass_Rozszerzenie');
            window.location.hash = '#/';
        });
    }

    if (backBtn) backBtn.addEventListener('click', () => { window.location.hash = `#/${currentLevel}`; });
    if (printBtn) printBtn.addEventListener('click', () => { window.print(); });

    submitLoginBtn.addEventListener('click', verifyPassword);
    passwordInput.addEventListener('keypress', e => { if (e.key === 'Enter') verifyPassword(); });

    function verifyPassword() {
        const entered = passwordInput.value.trim();
        if (!entered) return;
        submitLoginBtn.textContent = 'Sprawdzam...';
        submitLoginBtn.disabled = true;
        if (!settingsData) {
            fetchSettingsAndVerify(entered);
        } else {
            checkPassword(entered);
        }
    }

    function fetchSettingsAndVerify(entered) {
        fetch('https://api.github.com/repos/micho9879/polski-cms/contents/public/data/settings.json', { cache: 'no-cache' })
            .then(res => { if (res.status === 404) return null; if (!res.ok) throw new Error('API'); return res.json(); })
            .then(fi => fi ? fetch(`${fi.download_url}?v=${fi.sha}`, { cache: 'no-cache' }).then(r => r.json()) : null)
            .then(s => { if (s) settingsData = s; checkPassword(entered); })
            .catch(() => {
                loginError.textContent = 'Błąd połączenia. Odśwież stronę.';
                loginError.classList.remove('hidden');
                submitLoginBtn.textContent = 'Wejdź';
                submitLoginBtn.disabled = false;
            });
    }

    function checkPassword(entered) {
        let correct = currentLevel === 'Podstawa' ? settingsData?.password_podstawa : settingsData?.password_rozszerzenie;
        submitLoginBtn.textContent = 'Wejdź';
        submitLoginBtn.disabled = false;
        
        if (entered === correct) {
            localStorage.setItem(`pass_${currentLevel}`, entered);
            window.location.hash = `#/${currentLevel}`;
        } else {
            loginError.textContent = 'Niepoprawne hasło! Spróbuj ponownie.';
            loginError.classList.remove('hidden');
            passwordInput.value = '';
            passwordInput.focus();
        }
    }

    // --- WIDOK SIATKI ---
    function loadGridRoute(level) {
        currentLevel = level;
        showView(homeView);
        if (heroTitle) heroTitle.textContent = `Matura ${level}`;
        if (heroSubtitle) heroSubtitle.textContent = level === 'Podstawa'
            ? 'Baza wiedzy, streszczenia i motywy na egzamin podstawowy.'
            : 'Zaawansowane analizy, epoki i materiały dla rozszerzenia.';
        if (searchInput) searchInput.value = '';
        fetchDataForLevel(level);
    }

    function showSkeletons() {
        if (!postsGrid) return;
        postsGrid.innerHTML = '';
        for (let i = 0; i < 6; i++) {
            postsGrid.innerHTML += `
                <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <div class="skeleton h-48 w-full"></div>
                    <div class="p-6 space-y-3">
                        <div class="skeleton h-3 w-16"></div>
                        <div class="skeleton h-5 w-3/4"></div>
                        <div class="skeleton h-3 w-full"></div>
                        <div class="skeleton h-3 w-2/3"></div>
                    </div>
                </div>`;
        }
    }

    function fetchDataForLevel(level) {
        if (lastFetchedLevel === level && allPosts.length > 0) {
            renderTabs(allPosts);
            renderInitialGrid(allPosts);
            return;
        }

        showSkeletons();
        const folder = level === 'Podstawa' ? 'notatki_podstawa' : 'notatki_rozszerzenie';

        fetch(`https://api.github.com/repos/micho9879/polski-cms/contents/public/data/${folder}`, { cache: 'no-cache' })
            .then(res => {
                if (res.status === 404) return [];
                if (!res.ok) throw new Error('API');
                return res.json();
            })
            .then(files => {
                const jsonFiles = Array.isArray(files) ? files.filter(f => f.name.endsWith('.json')) : [];
                return Promise.all(jsonFiles.map(fi =>
                    fetch(`${fi.download_url}?v=${fi.sha}`, { cache: 'no-cache' })
                        .then(r => r.ok ? r.json().then(d => ({ ...d, slug: fi.name.replace('.json', '') })) : null)
                        .catch(() => null)
                ));
            })
            .then(posts => {
                allPosts = posts.filter(p => p && p.title);
                lastFetchedLevel = level;
                renderTabs(allPosts);
                renderInitialGrid(allPosts);
            })
            .catch(() => {
                if (postsGrid) postsGrid.innerHTML = `
                    <div class="col-span-full p-8 text-center bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-200 dark:border-red-800">
                        <h3 class="text-red-700 dark:text-red-400 font-bold mb-2">Błąd ładowania</h3>
                        <p class="text-red-600 dark:text-red-500 text-sm">Nie udało się załadować notatek. Spróbuj odświeżyć stronę za chwilę.</p>
                    </div>`;
            });
    }

    // --- ZAKŁADKI Z LICZNIKIEM + ULUBIONE ---
    function renderTabs(posts) {
        if (!categoryTabs) return;
        const catCounts = new Map();
        
        // Zliczamy ulubione z AKTUALNEGO poziomu
        let favCount = 0;
        posts.forEach(p => {
            if (p.category) catCounts.set(p.category, (catCounts.get(p.category) || 0) + 1);
            if (favorites.includes(p.slug)) favCount++;
        });

        categoryTabs.innerHTML = '';
        activeCategory = 'Wszystkie';
        const baseClass = 'min-h-[44px] px-5 py-2 rounded-xl text-sm font-medium transition-colors border';
        const activeClass = 'bg-slate-900 dark:bg-indigo-500 text-white border-slate-900 dark:border-indigo-500';
        const inactiveClass = 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/50';

        // Zakładka Wszystkie
        createTab('Wszystkie', posts.length);
        // Zakładka Ulubione
        if (favCount > 0) createTab('Ulubione', favCount, '❤️');
        
        catCounts.forEach((count, category) => {
            createTab(category, count);
        });

        function createTab(name, count, icon = '') {
            const btn = document.createElement('button');
            btn.dataset.cat = name;
            btn.innerHTML = `${icon ? icon + ' ' : ''}${name} <span class="ml-1 opacity-60">(${count})</span>`;
            btn.className = `${baseClass} ${name === activeCategory ? activeClass : inactiveClass}`;
            btn.addEventListener('click', () => {
                activeCategory = name;
                Array.from(categoryTabs.children).forEach(c => {
                    c.className = `${baseClass} ${c.dataset.cat === activeCategory ? activeClass : inactiveClass}`;
                });
                filterPosts();
            });
            categoryTabs.appendChild(btn);
        }
    }

    function filterPosts() {
        if (!searchInput || !postsGrid) return;
        const query = searchInput.value.toLowerCase();
        let visible = 0;
        Array.from(postsGrid.children).forEach(card => {
            const isFavTab = activeCategory === 'Ulubione';
            const matchesCategory = isFavTab ? favorites.includes(card.dataset.slug) : (activeCategory === 'Wszystkie' || card.dataset.category === activeCategory);
            const matchesSearch = card.dataset.search.includes(query);
            
            const ok = matchesCategory && matchesSearch;
            card.classList.toggle('hidden', !ok);
            if (ok) visible++;
        });
        if (noResults) noResults.classList.toggle('hidden', visible > 0);
    }

    if (searchInput) searchInput.addEventListener('input', filterPosts);

    // --- SIATKA ARTYKUŁÓW / EMPTY STATE ---
    function renderInitialGrid(posts) {
        if (!postsGrid) return;
        postsGrid.innerHTML = '';

        if (posts.length === 0) {
            postsGrid.classList.add('hidden');
            if (noResults) {
                noResults.innerHTML = `
                    <svg class="w-20 h-20 mx-auto text-slate-300 dark:text-slate-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                    <p class="text-slate-500 dark:text-slate-400 text-lg font-medium">Tu jeszcze nic nie ma</p>
                    <p class="text-slate-400 dark:text-slate-500 text-sm mt-1">Dodaj notatki w panelu CMS, aby się tutaj pojawiły.</p>`;
                noResults.classList.remove('hidden');
            }
            return;
        }
        postsGrid.classList.remove('hidden');
        if (noResults) noResults.classList.add('hidden');

        posts.forEach(post => {
            const card = document.createElement('article');
            const cat = post.category || 'Inne';
            card.dataset.category = cat;
            card.dataset.slug = post.slug;
            card.dataset.search = (post.title + ' ' + (post.content || '')).toLowerCase();
            card.className = 'group bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 transition-all flex flex-col overflow-hidden hover:shadow-md dark:hover:border-slate-700 relative';

            const img = post.thumbnail || 'https://images.unsplash.com/photo-1456953180671-730de08edaa7?auto=format&fit=crop&q=80&w=600&h=400';
            let plain = (post.content || '').replace(/(\*|_|#|-|\d\.)/g, '').replace(/\n/g, ' ').trim();
            const excerpt = plain.length > 100 ? plain.substring(0, 100) + '...' : plain;

            const isFav = favorites.includes(post.slug);
            const heartColor = isFav ? 'text-red-500 fill-current' : 'text-white drop-shadow-md';

            card.innerHTML = `
                <div class="h-48 overflow-hidden border-b border-slate-100 dark:border-slate-800 relative cursor-pointer" onclick="window.location.hash = '#/artykul/${currentLevel}/${post.slug}'">
                    <img src="${img}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" alt="${post.title}">
                </div>
                <button class="absolute top-3 right-3 p-2 bg-black/20 hover:bg-black/40 backdrop-blur-sm rounded-full transition-colors z-10 fav-grid-btn" data-slug="${post.slug}">
                    <svg class="w-5 h-5 ${heartColor} transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
                </button>
                <div class="p-6 flex flex-col flex-grow cursor-pointer" onclick="window.location.hash = '#/artykul/${currentLevel}/${post.slug}'">
                    <span class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">${cat}</span>
                    <h3 class="text-xl font-bold font-serif text-slate-900 dark:text-slate-100 mb-3 leading-snug line-clamp-2">${post.title}</h3>
                    <p class="text-slate-600 dark:text-slate-400 text-sm flex-grow line-clamp-3 leading-relaxed">${excerpt}</p>
                </div>`;
                
            postsGrid.appendChild(card);
        });

        // Obsługa polubień na kafelkach
        document.querySelectorAll('.fav-grid-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleFavorite(btn.dataset.slug);
            });
        });
    }

    // --- WIDOK ARTYKUŁU ---
    function loadArticleRoute(level, slug) {
        currentLevel = level;
        showView(articleView);
        document.getElementById("progress-bar").style.transform = "scaleX(0)";
        articleContent.innerHTML = `<div class="max-w-4xl mx-auto mt-10 space-y-6 px-4"><div class="skeleton h-10 w-2/3 mx-auto"></div><div class="skeleton h-6 w-1/3 mx-auto"></div><div class="skeleton h-72 w-full rounded-2xl"></div><div class="skeleton h-4 w-full"></div><div class="skeleton h-4 w-5/6"></div><div class="skeleton h-4 w-4/6"></div></div>`;
        window.scrollTo(0, 0);

        const cached = allPosts.find(p => p.slug === slug);
        if (cached) { renderArticle(cached); return; }

        const folder = level === 'Podstawa' ? 'notatki_podstawa' : 'notatki_rozszerzenie';
        fetch(`https://api.github.com/repos/micho9879/polski-cms/contents/public/data/${folder}/${slug}.json`, { cache: 'no-cache', headers: { 'Accept': 'application/vnd.github.v3.raw' } })
            .then(r => r.ok ? r.json() : null)
            .then(post => {
                if (post) {
                    post.slug = slug;
                    renderArticle(post);
                }
                else articleContent.innerHTML = `<div class="text-center py-20"><svg class="w-16 h-16 mx-auto text-slate-300 dark:text-slate-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg><p class="text-slate-500 text-lg font-medium">Nie znaleziono artykułu</p></div>`;
            });
    }

    function renderArticle(post) {
        const img = post.thumbnail || 'https://images.unsplash.com/photo-1456953180671-730de08edaa7?auto=format&fit=crop&q=80&w=600&h=400';
        const cat = post.category || 'Inne';
        
        // Generowanie HTML
        const html = DOMPurify.sanitize(marked.parse(post.content || ''));
        const words = (post.content || '').trim().split(/\s+/).length;
        const time = `${Math.ceil(words / 200)} min czytania`;

        const isFav = favorites.includes(post.slug);
        const heartColor = isFav ? 'text-red-500 fill-current' : 'text-slate-400 dark:text-slate-500';

        // Generowanie Spisu Treści (TOC)
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        const headings = tempDiv.querySelectorAll('h1, h2, h3');
        let tocHtml = '';
        
        if (headings.length > 1) {
            tocHtml = `
            <div class="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 mb-10">
                <h3 class="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center">
                    <svg class="w-5 h-5 mr-2 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h7"></path></svg>
                    Spis Treści
                </h3>
                <ul class="space-y-2 text-sm text-slate-600 dark:text-slate-400 font-sans">
            `;
            
            headings.forEach((h, index) => {
                const id = `heading-${index}`;
                h.id = id;
                const pl = h.tagName === 'H3' ? 'pl-4' : (h.tagName === 'H1' ? 'font-bold' : '');
                tocHtml += `<li class="${pl}"><a href="#${id}" class="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors inline-block py-1" onclick="document.getElementById('${id}').scrollIntoView({behavior: 'smooth'}); return false;">${h.textContent}</a></li>`;
            });
            tocHtml += `</ul></div>`;
        }

        // Finalny HTML
        articleContent.innerHTML = `
            <div class="max-w-4xl mx-auto bg-white dark:bg-slate-900 p-8 sm:p-12 md:p-16 rounded-[2rem] shadow-sm dark:shadow-none border border-slate-200 dark:border-slate-800 mt-6 sm:mt-10 mb-20 relative z-10 transition-colors duration-300">
                <header class="mb-10 text-center relative">
                    <button id="fav-btn-${post.slug}" class="absolute right-0 top-0 p-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-full transition-colors" title="Dodaj do ulubionych">
                        <svg class="w-6 h-6 ${heartColor} transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
                    </button>
                    
                    <span class="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">${cat}</span>
                    <h1 class="text-4xl md:text-5xl font-bold font-serif text-slate-900 dark:text-white mt-4 mb-6 leading-tight">${post.title}</h1>
                    <div class="flex justify-center items-center text-slate-500 dark:text-slate-400 text-sm font-medium">
                        <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        ${time}
                    </div>
                </header>
                <figure class="mb-12 rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 no-print">
                    <img src="${img}" alt="${post.title}" class="w-full h-auto max-h-[500px] object-cover mx-auto block">
                </figure>
                
                ${tocHtml}
                
                <div class="prose prose-slate dark:prose-invert max-w-3xl font-serif leading-relaxed prose-headings:font-sans prose-headings:font-bold prose-a:text-indigo-600 dark:prose-a:text-indigo-400 mx-auto transition-all" style="font-size: ${currentFontSize}px;">
                    ${tempDiv.innerHTML}
                </div>
            </div>`;

        // Event ulubionych w artykule
        document.getElementById(`fav-btn-${post.slug}`).addEventListener('click', () => {
            toggleFavorite(post.slug);
        });
    }

    // --- DARK MODE ---
    function initTheme() {
        const toggle = () => {
            document.documentElement.classList.toggle('dark');
            localStorage.theme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
        };
        ['theme-toggle-login', 'theme-toggle-home', 'theme-toggle-article'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('click', toggle);
        });
    }

    handleRoute();
});
