document.addEventListener("DOMContentLoaded", () => {
    const homeView = document.getElementById("home-view");
    const postsGrid = document.getElementById("posts-grid");
    const articleView = document.getElementById("article-view");
    const categoryTabs = document.getElementById("category-tabs");
    const searchInput = document.getElementById("search-input");
    const noResults = document.getElementById("no-results");
    
    if (!postsGrid) return;
    
    const cacheBuster = new Date().getTime();
    let allPosts = []; // Przechowuje wszystkie pobrane posty
    let activeCategory = 'Wszystkie';

    // 1. Pobieranie danych
    fetch(`https://api.github.com/repos/micho9879/polski-cms/contents/public/data/notatki?t=${cacheBuster}`, { cache: 'no-store' })
        .then(response => {
            if (!response.ok) throw new Error("Błąd pobierania listy plików z GitHuba");
            return response.json();
        })
        .then(files => {
            const jsonFiles = files.filter(f => f.name.endsWith('.json'));
            postsGrid.innerHTML = ""; 

            // Pobieramy wszystkie pliki równolegle
            const fetchPromises = jsonFiles.map(fileInfo => 
                fetch(`${fileInfo.download_url}?t=${cacheBuster}`, { cache: 'no-store' }).then(res => res.json())
            );

            Promise.all(fetchPromises)
                .then(posts => {
                    allPosts = posts;
                    renderTabs(allPosts);
                    renderGrid(allPosts);
                })
                .catch(err => console.error("Błąd ładowania wpisów:", err));
        })
        .catch(err => {
            console.error(err);
            postsGrid.innerHTML = '<p class="text-red-500 col-span-full text-center py-10 bg-red-50 rounded-lg">Wystąpił problem z wczytywaniem najnowszych notatek z GitHuba.</p>';
        });

    // 2. Renderowanie dynamicznych zakładek
    function renderTabs(posts) {
        // Zbieramy unikalne kategorie
        const categories = new Set();
        categories.add('Wszystkie');
        posts.forEach(post => {
            if(post.category) categories.add(post.category);
        });

        categoryTabs.innerHTML = "";
        categories.forEach(category => {
            const btn = document.createElement("button");
            btn.textContent = category;
            
            // Styl "pigułki" dla zakładki
            const baseClass = "px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 focus:outline-none";
            const activeClass = "bg-indigo-600 text-white shadow-md transform scale-105";
            const inactiveClass = "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200 hover:border-gray-300";
            
            btn.className = `${baseClass} ${category === activeCategory ? activeClass : inactiveClass}`;
            
            btn.addEventListener("click", () => {
                activeCategory = category;
                // Aktualizujemy style wszystkich przycisków
                Array.from(categoryTabs.children).forEach(child => {
                    child.className = `${baseClass} ${child.textContent === activeCategory ? activeClass : inactiveClass}`;
                });
                filterPosts();
            });
            
            categoryTabs.appendChild(btn);
        });
    }

    // 3. Logika filtrowania i wyszukiwania
    function filterPosts() {
        const query = searchInput.value.toLowerCase();
        const filtered = allPosts.filter(post => {
            const matchesCategory = activeCategory === 'Wszystkie' || post.category === activeCategory;
            const matchesSearch = post.title.toLowerCase().includes(query) || (post.content && post.content.toLowerCase().includes(query));
            return matchesCategory && matchesSearch;
        });
        
        renderGrid(filtered);
    }

    // Nasłuchiwanie na wpisywanie w wyszukiwarkę (live search)
    if(searchInput) {
        searchInput.addEventListener("input", filterPosts);
    }

    // 4. Renderowanie siatki kafelków
    function renderGrid(posts) {
        postsGrid.innerHTML = "";
        
        if (posts.length === 0) {
            postsGrid.classList.add('hidden');
            noResults.classList.remove('hidden');
            return;
        } else {
            postsGrid.classList.remove('hidden');
            noResults.classList.add('hidden');
        }

        posts.forEach((post, index) => {
            const card = document.createElement("article");
            // Dodanie animacji wejścia fade-in-up z opóźnieniem zależnym od indeksu
            card.className = "fade-in-up bg-white rounded-3xl shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 flex flex-col cursor-pointer overflow-hidden border border-gray-100 group relative";
            card.style.animationDelay = `${index * 0.1}s`;
            
            const imageUrl = post.thumbnail || 'https://images.unsplash.com/photo-1456953180671-730de08edaa7?auto=format&fit=crop&q=80&w=600&h=400';
            const categoryName = post.category || 'Inne';
            
            // Zajawka bez markdownu
            let plainTextContent = (post.content || '').replace(/(\*|_|#|-|\d\.)/g, '').replace(/\n/g, ' ').trim();
            const excerpt = plainTextContent.length > 120 ? plainTextContent.substring(0, 120) + '...' : plainTextContent;

            card.innerHTML = `
                <div class="relative h-60 overflow-hidden">
                    <img src="${imageUrl}" alt="${post.title}" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110">
                    <div class="absolute inset-0 bg-gradient-to-t from-gray-900/60 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-300"></div>
                    <!-- Badge kategorii na zdjęciu -->
                    <div class="absolute top-4 left-4 bg-white/90 backdrop-blur-sm text-indigo-700 text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wide shadow-sm">
                        ${categoryName}
                    </div>
                </div>
                <div class="p-8 flex flex-col flex-grow">
                    <h3 class="text-2xl font-extrabold text-gray-900 mb-3 line-clamp-2 leading-tight">${post.title}</h3>
                    <p class="text-gray-500 text-base mb-6 flex-grow line-clamp-3 leading-relaxed">${excerpt}</p>
                    <div class="mt-auto pt-4 border-t border-gray-50">
                        <span class="text-indigo-600 group-hover:text-indigo-800 font-bold text-sm uppercase tracking-wider inline-flex items-center transition-colors">
                            Czytaj notatkę 
                            <svg class="ml-2 w-5 h-5 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                        </span>
                    </div>
                </div>
            `;
            
            card.addEventListener("click", () => {
                showArticle(post, imageUrl, categoryName);
            });
            
            postsGrid.appendChild(card);
        });
    }

    // 5. Kalkulator czasu czytania
    function getReadingTime(text) {
        const wordsPerMinute = 200;
        const words = text.trim().split(/\s+/).length;
        const minutes = Math.ceil(words / wordsPerMinute);
        return `${minutes} min czytania`;
    }

    // 6. Wyświetlanie pięknego artykułu
    function showArticle(post, imageUrl, categoryName) {
        const htmlContent = marked.parse(post.content || '');
        const readingTime = getReadingTime(post.content || '');

        articleView.innerHTML = `
            <div class="max-w-3xl mx-auto relative">
                <!-- Sticky przycisk powrotu -->
                <div class="sticky top-6 z-50 mb-8 pointer-events-none flex">
                    <button id="back-btn" class="pointer-events-auto inline-flex items-center px-5 py-3 border border-gray-200 text-sm font-bold rounded-full text-gray-700 bg-white/90 backdrop-blur-md hover:bg-gray-50 hover:text-indigo-600 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
                        <svg class="mr-2 -ml-1 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                        Wróć do wszystkich
                    </button>
                </div>
                
                <article class="bg-white rounded-3xl shadow-2xl overflow-hidden mb-12 ring-1 ring-gray-100">
                    <div class="w-full h-72 md:h-[32rem] relative">
                        <img src="${imageUrl}" alt="${post.title}" class="w-full h-full object-cover">
                        <!-- Płynny gradient -->
                        <div class="absolute inset-0 bg-gradient-to-t from-gray-900/90 via-gray-900/40 to-transparent"></div>
                        <div class="absolute bottom-0 left-0 w-full p-8 md:p-14">
                            <span class="inline-block bg-indigo-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-4 shadow-sm">${categoryName}</span>
                            <h1 class="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white drop-shadow-lg leading-tight font-sans tracking-tight">${post.title}</h1>
                            <div class="mt-6 flex items-center text-gray-300 text-sm font-medium">
                                <svg class="w-5 h-5 mr-2 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                ${readingTime}
                            </div>
                        </div>
                    </div>
                    
                    <div class="p-8 md:px-16 md:py-14 bg-white">
                        <!-- Użycie Tailwinda Typography (.prose) z klasą font-serif -->
                        <div class="prose prose-lg md:prose-xl prose-indigo max-w-none text-gray-800 leading-relaxed font-serif prose-headings:font-sans prose-headings:font-bold prose-a:text-indigo-600 hover:prose-a:text-indigo-500">
                            ${htmlContent}
                        </div>
                    </div>
                </article>
            </div>
        `;

        homeView.classList.add('hidden');
        articleView.classList.remove('hidden');
        
        window.scrollTo({ top: 0, behavior: 'smooth' });

        document.getElementById('back-btn').addEventListener('click', () => {
            articleView.classList.add('hidden');
            homeView.classList.remove('hidden');
            // Przy powrocie czyścimy ew. pole wyszukiwania, żeby użytkownik widział pełną siatkę (opcjonalne, ale UX-owo fajne)
            // searchInput.value = '';
            // filterPosts();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
});
