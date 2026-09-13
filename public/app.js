document.addEventListener("DOMContentLoaded", () => {
    // Referencje DOM
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
    const heroTitle = document.getElementById("hero-title");
    const heroSubtitle = document.getElementById("hero-subtitle");
    
    // Zmienne stanu
    let allPosts = [];
    let activeCategory = 'Wszystkie';
    let currentLevel = ''; // 'Podstawa' lub 'Rozszerzenie'
    let settingsData = null; // Przechowuje hasła z GitHuba

    // Inicjalizacja Dark Mode
    initTheme();

    // 1. Obsługa wyboru poziomu (Ekran powitalny)
    const levelBtns = document.querySelectorAll('.level-btn');
    levelBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            currentLevel = btn.dataset.level;
            
            // Sprawdź czy użytkownik jest już zalogowany w tej sesji na dany poziom
            if (sessionStorage.getItem(`auth_${currentLevel}`) === 'true') {
                loadAppForLevel();
            } else {
                // Pokaż formularz hasła
                levelSelection.classList.add('hidden');
                passwordForm.classList.remove('hidden');
                passwordTitle.textContent = `Hasło: Matura ${currentLevel}`;
                passwordInput.value = '';
                passwordInput.focus();
                loginError.classList.add('hidden');
            }
        });
    });

    cancelLoginBtn.addEventListener('click', () => {
        passwordForm.classList.add('hidden');
        levelSelection.classList.remove('hidden');
        passwordInput.value = '';
        loginError.classList.add('hidden');
    });

    // 2. Walidacja hasła
    submitLoginBtn.addEventListener('click', verifyPassword);
    passwordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') verifyPassword();
    });

    function verifyPassword() {
        const enteredPassword = passwordInput.value.trim();
        if (!enteredPassword) return;

        submitLoginBtn.textContent = 'Sprawdzam...';
        submitLoginBtn.disabled = true;

        // Jeśli ustawienia (hasła) nie zostały jeszcze pobrane, pobierz je
        if (!settingsData) {
            fetchSettingsAndVerify(enteredPassword);
        } else {
            checkPassword(enteredPassword);
        }
    }

    function fetchSettingsAndVerify(enteredPassword) {
        // Zawsze pobieramy surowy plik ustawień omijając cache
        fetch(`https://api.github.com/repos/micho9879/polski-cms/contents/public/data/settings.json`, { cache: 'no-cache' })
            .then(res => {
                if (res.status === 404) return null; // Brak pliku ustawień - brak hasła?
                if (!res.ok) throw new Error("Brak dostępu do API GitHuba.");
                return res.json();
            })
            .then(fileInfo => {
                if (!fileInfo) {
                    settingsData = { password_podstawa: "", password_rozszerzenie: "" };
                    checkPassword(enteredPassword);
                    return;
                }
                return fetch(`${fileInfo.download_url}?v=${fileInfo.sha}`, { cache: 'no-cache' });
            })
            .then(res => res ? res.json() : null)
            .then(settings => {
                if (settings) {
                    settingsData = settings;
                }
                checkPassword(enteredPassword);
            })
            .catch(err => {
                console.error("Błąd pobierania ustawień:", err);
                loginError.textContent = "Błąd połączenia. Spróbuj odświeżyć stronę.";
                loginError.classList.remove('hidden');
                submitLoginBtn.textContent = 'Wejdź';
                submitLoginBtn.disabled = false;
            });
    }

    function checkPassword(enteredPassword) {
        let correctPassword = "";
        if (currentLevel === 'Podstawa') correctPassword = settingsData?.password_podstawa || "";
        if (currentLevel === 'Rozszerzenie') correctPassword = settingsData?.password_rozszerzenie || "";

        submitLoginBtn.textContent = 'Wejdź';
        submitLoginBtn.disabled = false;

        // Jeśli hasło w CMS nie zostało ustawione, wpuszczamy bez hasła lub odrzucamy?
        // Zakładamy, że jeśli hasło jest puste w CMS, wymaga jakiegoś domyślnego, albo odrzuca.
        // Bezpieczniej weryfikować po prostu zgodność.
        if (enteredPassword === correctPassword) {
            sessionStorage.setItem(`auth_${currentLevel}`, 'true');
            loadAppForLevel();
        } else {
            loginError.textContent = "Niepoprawne hasło! Spróbuj ponownie.";
            loginError.classList.remove('hidden');
            passwordInput.value = '';
            passwordInput.focus();
        }
    }

    // 3. Ładowanie głównej aplikacji po poprawnej autoryzacji
    function loadAppForLevel() {
        loginView.classList.add('hidden');
        homeView.classList.remove('hidden');
        
        // Zmiana tekstów w nagłówku w zależności od wybranego poziomu
        if (heroTitle) heroTitle.textContent = `Matura ${currentLevel}`;
        if (heroSubtitle) heroSubtitle.textContent = currentLevel === 'Podstawa' ? 'Baza wiedzy, streszczenia i motywy na egzamin podstawowy.' : 'Zaawansowane analizy, epoki i materiały dla rozszerzenia.';

        fetchData();
    }


    // Pobieranie artykułów (Wspierane przez ETagi)
    function fetchData() {
        fetch(`https://api.github.com/repos/micho9879/polski-cms/contents/public/data/notatki`, { cache: 'no-cache' })
            .then(res => {
                if (res.status === 403) throw new Error("API 403");
                if (res.status === 404) return []; // Brak notatek
                if (!res.ok) throw new Error("Brak dostępu do API GitHuba.");
                return res.json();
            })
            .then(files => {
                const jsonFiles = Array.isArray(files) ? files.filter(f => f.name.endsWith('.json')) : [];
                
                const fetchPromises = jsonFiles.map(fileInfo => 
                    fetch(`${fileInfo.download_url}?v=${fileInfo.sha}`, { cache: 'no-cache' })
                        .then(r => {
                            if (!r.ok || r.status === 404) return null;
                            return r.json();
                        })
                        .catch(err => null)
                );

                Promise.all(fetchPromises)
                    .then(posts => {
                        // Filtrujemy tylko artykuły dla wybranego poziomu
                        allPosts = posts.filter(post => post !== null && post && post.title && post.poziom === currentLevel);
                        renderTabs(allPosts);
                        renderInitialGrid(allPosts);
                    });
            })
            .catch(err => {
                console.error("Błąd krytyczny:", err);
                let errorMsg = "Nie udało się załadować danych. Odśwież stronę.";
                if (err.message.includes("403") || err.message.includes("API")) {
                    errorMsg = "Przekroczono limit zapytań do API GitHuba (60/godzinę). Blokada zniknie za chwilę.";
                }
                if (postsGrid) {
                    postsGrid.innerHTML = `
                        <div class="col-span-full p-8 text-center bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-200 dark:border-red-800">
                            <h3 class="text-red-700 dark:text-red-400 font-bold mb-2">Blokada Antyspamowa GitHuba</h3>
                            <p class="text-red-600 dark:text-red-500 text-sm max-w-lg mx-auto">${errorMsg}</p>
                        </div>
                    `;
                }
            });
    }

    function renderTabs(posts) {
        if (!categoryTabs) return;
        const categories = new Set();
        categories.add('Wszystkie');
        // Zaciąganie kategorii dynamicznie z artykułów przypisanych do poziomu
        posts.forEach(post => { if(post.category) categories.add(post.category); });

        categoryTabs.innerHTML = "";
        activeCategory = 'Wszystkie'; // Reset podczas ładowania
        
        categories.forEach(category => {
            const btn = document.createElement("button");
            btn.textContent = category;
            
            const baseClass = "min-h-[44px] px-5 py-2 rounded-xl text-sm font-medium transition-colors border";
            const activeClass = "bg-slate-900 dark:bg-indigo-500 text-white border-slate-900 dark:border-indigo-500";
            const inactiveClass = "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/50";
            
            btn.className = `${baseClass} ${category === activeCategory ? activeClass : inactiveClass}`;
            
            btn.addEventListener("click", () => {
                activeCategory = category;
                Array.from(categoryTabs.children).forEach(child => {
                    child.className = `${baseClass} ${child.textContent === activeCategory ? activeClass : inactiveClass}`;
                });
                filterPosts();
            });
            
            categoryTabs.appendChild(btn);
        });
    }

    function filterPosts() {
        if (!searchInput || !postsGrid) return;
        const query = searchInput.value.toLowerCase();
        const children = Array.from(postsGrid.children);
        let visibleCount = 0;

        children.forEach(card => {
            const matchesCategory = activeCategory === 'Wszystkie' || card.dataset.category === activeCategory;
            const matchesSearch = card.dataset.search.includes(query);
            
            if (matchesCategory && matchesSearch) {
                card.classList.remove('hidden');
                visibleCount++;
            } else {
                card.classList.add('hidden');
            }
        });

        if (visibleCount === 0 && noResults) {
            noResults.classList.remove('hidden');
        } else if (noResults) {
            noResults.classList.add('hidden');
        }
    }

    if(searchInput) {
        searchInput.addEventListener("input", filterPosts);
    }

    function renderInitialGrid(posts) {
        if (!postsGrid) return;
        postsGrid.innerHTML = "";
        
        if (posts.length === 0) {
            postsGrid.classList.add('hidden');
            if (noResults) noResults.classList.remove('hidden');
            return;
        } else {
            postsGrid.classList.remove('hidden');
            if (noResults) noResults.classList.add('hidden');
        }

        posts.forEach((post, index) => {
            const card = document.createElement("article");
            
            const categoryName = post.category || 'Inne';
            card.dataset.category = categoryName;
            card.dataset.search = (post.title + " " + (post.content || '')).toLowerCase();
            
            card.className = "bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 transition-all cursor-pointer flex flex-col overflow-hidden hover:shadow-md dark:hover:border-slate-700";
            
            const imageUrl = post.thumbnail || 'https://images.unsplash.com/photo-1456953180671-730de08edaa7?auto=format&fit=crop&q=80&w=600&h=400';
            
            let plainTextContent = (post.content || '').replace(/(\*|_|#|-|\d\.)/g, '').replace(/\n/g, ' ').trim();
            const excerpt = plainTextContent.length > 100 ? plainTextContent.substring(0, 100) + '...' : plainTextContent;

            card.innerHTML = `
                <div class="h-48 overflow-hidden relative border-b border-slate-100 dark:border-slate-800">
                    <img src="${imageUrl}" class="w-full h-full object-cover">
                </div>
                <div class="p-6 flex flex-col flex-grow">
                    <span class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">${categoryName}</span>
                    <h3 class="text-xl font-bold font-serif text-slate-900 dark:text-slate-100 mb-3 leading-snug line-clamp-2">${post.title}</h3>
                    <p class="text-slate-600 dark:text-slate-400 text-sm mb-6 flex-grow line-clamp-3 leading-relaxed">${excerpt}</p>
                </div>
            `;
            
            card.addEventListener("click", () => showArticle(post, imageUrl, categoryName));
            postsGrid.appendChild(card);
        });
    }

    function getReadingTime(text) {
        const words = text.trim().split(/\s+/).length;
        return `${Math.ceil(words / 200)} min czytania`;
    }

    function showArticle(post, imageUrl, categoryName) {
        const rawHtml = marked.parse(post.content || '');
        const cleanHtml = DOMPurify.sanitize(rawHtml);

        articleContent.innerHTML = `
            <div class="max-w-4xl mx-auto bg-white dark:bg-slate-900 p-8 sm:p-12 md:p-16 rounded-[2rem] shadow-sm dark:shadow-none border border-slate-200 dark:border-slate-800 mt-6 sm:mt-10 mb-20 relative z-10 transition-colors duration-300">
                <header class="mb-10 text-center">
                    <span class="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">${categoryName}</span>
                    <h1 class="text-4xl md:text-5xl font-bold font-serif text-slate-900 dark:text-white mt-4 mb-6 leading-tight">${post.title}</h1>
                    <div class="flex justify-center items-center text-slate-500 dark:text-slate-400 text-sm font-medium">
                        <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        ${getReadingTime(post.content || '')}
                    </div>
                </header>
                
                <figure class="mb-12 rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                    <img src="${imageUrl}" alt="${post.title}" class="w-full h-auto max-h-[500px] object-cover mx-auto block">
                </figure>
                
                <div class="prose prose-slate dark:prose-invert prose-lg md:prose-xl mx-auto max-w-3xl font-serif leading-relaxed prose-headings:font-sans prose-headings:font-bold prose-a:text-indigo-600 dark:prose-a:text-indigo-400">
                    ${cleanHtml}
                </div>
            </div>
        `;

        homeView.classList.add('hidden');
        articleView.classList.remove('hidden');
        window.scrollTo(0, 0);
    }

    if(backBtn) {
        backBtn.addEventListener('click', () => {
            articleView.classList.add('hidden');
            homeView.classList.remove('hidden');
            window.scrollTo({ top: 0, behavior: 'auto' });
        });
    }

    function initTheme() {
        const toggleHome = document.getElementById("theme-toggle-home");
        const toggleArticle = document.getElementById("theme-toggle-article");

        const toggleTheme = () => {
            if (document.documentElement.classList.contains('dark')) {
                document.documentElement.classList.remove('dark');
                localStorage.theme = 'light';
            } else {
                document.documentElement.classList.add('dark');
                localStorage.theme = 'dark';
            }
        };

        if (toggleHome) toggleHome.addEventListener('click', toggleTheme);
        if (toggleArticle) toggleArticle.addEventListener('click', toggleTheme);
    }
});
