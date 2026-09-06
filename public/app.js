document.addEventListener("DOMContentLoaded", () => {
    // Referencje DOM
    const homeView = document.getElementById("home-view");
    const postsGrid = document.getElementById("posts-grid");
    const articleView = document.getElementById("article-view");
    const articleContent = document.getElementById("article-content");
    const categoryTabs = document.getElementById("category-tabs");
    const searchInput = document.getElementById("search-input");
    const noResults = document.getElementById("no-results");
    const backBtn = document.getElementById("back-btn");
    
    if (!postsGrid) return;
    
    // Zmienne stanu
    let allPosts = [];
    let activeCategory = 'Wszystkie';

    // Inicjalizacja Dark Mode
    initTheme();

    // Pobieranie danych (Wspierane przez ETagi i Service Worker)
    fetch(`https://api.github.com/repos/micho9879/polski-cms/contents/public/data/notatki`)
        .then(res => {
            if (!res.ok) throw new Error("Brak dostępu do API GitHuba.");
            return res.json();
        })
        .then(files => {
            const jsonFiles = Array.isArray(files) ? files.filter(f => f.name.endsWith('.json')) : [];
            
            const fetchPromises = jsonFiles.map(fileInfo => 
                fetch(fileInfo.download_url)
                    .then(r => {
                        // Ochrona przed błędem 404 (Zombie plików usuniętych z Firebase)
                        if (!r.ok || r.status === 404) {
                            console.warn(`Zignorowano brakujący/uszkodzony plik: ${fileInfo.name}`);
                            return null;
                        }
                        return r.json();
                    })
                    .catch(err => {
                        console.error(`Krytyczny błąd pobierania pliku ${fileInfo.name}:`, err);
                        return null; // Bezpieczny fallback zapobiegający blokadzie pętli
                    })
            );

            Promise.all(fetchPromises)
                .then(posts => {
                    // Czysta lista z pominieciem nullów wygenerowanych przez 404
                    allPosts = posts.filter(post => post !== null && post && post.title);
                    renderTabs(allPosts);
                    renderInitialGrid(allPosts);
                });
        })
        .catch(err => {
            console.error("Błąd krytyczny:", err);
            postsGrid.innerHTML = `
                <div class="col-span-full p-8 text-center bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-200 dark:border-red-800">
                    <h3 class="text-red-700 dark:text-red-400 font-bold mb-2">Błąd połączenia z bazą wpisów</h3>
                    <p class="text-red-600 dark:text-red-500 text-sm">Nie udało się załadować danych. Odśwież stronę.</p>
                </div>
            `;
        });

    function renderTabs(posts) {
        const categories = new Set();
        categories.add('Wszystkie');
        posts.forEach(post => { if(post.category) categories.add(post.category); });

        categoryTabs.innerHTML = "";
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

    // Optymalizacja SPA: Zamiast niszczyć DOM, manipulujemy klasą 'hidden' na zrenderowanych kafelkach
    function filterPosts() {
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

        if (visibleCount === 0) {
            noResults.classList.remove('hidden');
        } else {
            noResults.classList.add('hidden');
        }
    }

    if(searchInput) {
        searchInput.addEventListener("input", filterPosts);
    }

    // Renderowanie siatki TYLKO RAZ przy inicjalizacji
    function renderInitialGrid(posts) {
        postsGrid.innerHTML = "";
        
        if (posts.length === 0) {
            postsGrid.classList.add('hidden');
            noResults.classList.remove('hidden');
            return;
        }

        posts.forEach((post, index) => {
            const card = document.createElement("article");
            
            // Atrybuty data dla szybkiego filtrowania w DOM
            const categoryName = post.category || 'Inne';
            card.dataset.category = categoryName;
            card.dataset.search = (post.title + " " + (post.content || '')).toLowerCase();
            
            card.className = "fade-in bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 transition-all cursor-pointer flex flex-col overflow-hidden hover:shadow-md dark:hover:border-slate-700";
            card.style.animationDelay = `${index * 0.05}s`;
            
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

    // Wyświetlanie artykułu bez niszczenia #home-view w DOM
    function showArticle(post, imageUrl, categoryName) {
        // Sanityzacja zawartości (Bezpieczeństwo XSS)
        const rawHtml = marked.parse(post.content || '');
        const cleanHtml = DOMPurify.sanitize(rawHtml); // Czysty, bezpieczny HTML

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
                
                <!-- Prose dark mode config -->
                <div class="prose prose-slate dark:prose-invert prose-lg md:prose-xl mx-auto max-w-3xl font-serif leading-relaxed prose-headings:font-sans prose-headings:font-bold prose-a:text-indigo-600 dark:prose-a:text-indigo-400">
                    ${cleanHtml}
                </div>
            </div>
        `;

        homeView.classList.add('hidden');
        articleView.classList.remove('hidden');
        window.scrollTo(0, 0);
    }

    // SPA Powrót do kafelków bez ponownego renderowania!
    if(backBtn) {
        backBtn.addEventListener('click', () => {
            articleView.classList.add('hidden');
            homeView.classList.remove('hidden');
            
            // Scroll powrotny do miejsca, w którym była siatka, lub na górę
            window.scrollTo({ top: 0, behavior: 'auto' });
        });
    }

    // --- LOGIKA TRYBU CIEMNEGO ---
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
