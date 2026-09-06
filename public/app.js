document.addEventListener("DOMContentLoaded", () => {
    const homeView = document.getElementById("home-view");
    const postsGrid = document.getElementById("posts-grid");
    const articleView = document.getElementById("article-view");
    const articleContent = document.getElementById("article-content");
    const categoryTabs = document.getElementById("category-tabs");
    const searchInput = document.getElementById("search-input");
    const noResults = document.getElementById("no-results");
    const backBtn = document.getElementById("back-btn");
    
    if (!postsGrid) return;
    
    let allPosts = [];
    let activeCategory = 'Wszystkie';

    // Pobieranie danych. 
    // Dzięki Service Worker (Stale-While-Revalidate) pierwsze wczytanie nastąpi natychmiast z cache
    fetch(`https://api.github.com/repos/micho9879/polski-cms/contents/public/data/notatki`)
        .then(res => res.ok ? res.json() : [])
        .then(files => {
            const jsonFiles = files.filter(f => f.name.endsWith('.json'));
            
            const fetchPromises = jsonFiles.map(fileInfo => 
                fetch(fileInfo.download_url).then(r => r.json())
            );

            Promise.all(fetchPromises)
                .then(posts => {
                    allPosts = posts;
                    renderTabs(allPosts);
                    renderGrid(allPosts);
                });
        });

    function renderTabs(posts) {
        const categories = new Set();
        categories.add('Wszystkie');
        posts.forEach(post => { if(post.category) categories.add(post.category); });

        categoryTabs.innerHTML = "";
        categories.forEach(category => {
            const btn = document.createElement("button");
            btn.textContent = category;
            
            // Clean UI: proste, delikatne kształty z wystarczającym polem kliknięcia (min 44px)
            const baseClass = "min-h-[44px] px-5 py-2 rounded-xl text-sm font-medium transition-colors border";
            const activeClass = "bg-slate-900 text-white border-slate-900";
            const inactiveClass = "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50";
            
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
        const query = searchInput.value.toLowerCase();
        const filtered = allPosts.filter(post => {
            const matchesCategory = activeCategory === 'Wszystkie' || post.category === activeCategory;
            const matchesSearch = post.title.toLowerCase().includes(query) || (post.content && post.content.toLowerCase().includes(query));
            return matchesCategory && matchesSearch;
        });
        renderGrid(filtered);
    }

    if(searchInput) {
        searchInput.addEventListener("input", filterPosts);
    }

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
            // Kafelki Premium Clean: Ostry, minimalny cień, cienka obwódka
            card.className = "fade-in bg-white rounded-2xl shadow-sm hover:shadow-md border border-slate-200 transition-all cursor-pointer flex flex-col overflow-hidden";
            card.style.animationDelay = `${index * 0.05}s`;
            
            const imageUrl = post.thumbnail || 'https://images.unsplash.com/photo-1456953180671-730de08edaa7?auto=format&fit=crop&q=80&w=600&h=400';
            const categoryName = post.category || 'Inne';
            let plainTextContent = (post.content || '').replace(/(\*|_|#|-|\d\.)/g, '').replace(/\n/g, ' ').trim();
            const excerpt = plainTextContent.length > 100 ? plainTextContent.substring(0, 100) + '...' : plainTextContent;

            card.innerHTML = `
                <div class="h-48 overflow-hidden relative border-b border-slate-100">
                    <img src="${imageUrl}" class="w-full h-full object-cover">
                </div>
                <div class="p-6 flex flex-col flex-grow">
                    <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">${categoryName}</span>
                    <h3 class="text-xl font-bold font-serif text-slate-900 mb-3 leading-snug line-clamp-2">${post.title}</h3>
                    <p class="text-slate-600 text-sm mb-6 flex-grow line-clamp-3 leading-relaxed">${excerpt}</p>
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
        const htmlContent = marked.parse(post.content || '');

        articleContent.innerHTML = `
            <div class="max-w-3xl mx-auto px-4 sm:px-6">
                <header class="mb-10 text-center">
                    <span class="text-sm font-semibold text-slate-500 uppercase tracking-wider">${categoryName}</span>
                    <h1 class="text-4xl md:text-5xl font-bold font-serif text-slate-900 mt-4 mb-6 leading-tight">${post.title}</h1>
                    <div class="flex justify-center items-center text-slate-500 text-sm font-medium">
                        <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        ${getReadingTime(post.content || '')}
                    </div>
                </header>
                
                <figure class="mb-12 rounded-2xl overflow-hidden border border-slate-200">
                    <img src="${imageUrl}" alt="${post.title}" class="w-full h-auto object-cover max-h-[400px]">
                </figure>
                
                <div class="prose prose-slate prose-lg max-w-none font-serif leading-relaxed prose-headings:font-sans prose-headings:font-bold prose-a:text-slate-900">
                    ${htmlContent}
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
            window.scrollTo(0, 0);
        });
    }
});
