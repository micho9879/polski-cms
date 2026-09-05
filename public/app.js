document.addEventListener("DOMContentLoaded", () => {
    const homeView = document.getElementById("home-view");
    const postsGrid = document.getElementById("posts-grid");
    const articleView = document.getElementById("article-view");
    
    if (!postsGrid) return;
    
    const cacheBuster = new Date().getTime();

    // 1. Pobieranie danych
    fetch(`https://api.github.com/repos/micho9879/polski-cms/contents/public/data/notatki?t=${cacheBuster}`, { cache: 'no-store' })
        .then(response => {
            if (!response.ok) throw new Error("Błąd pobierania listy plików z GitHuba");
            return response.json();
        })
        .then(files => {
            const jsonFiles = files.filter(f => f.name.endsWith('.json'));
            postsGrid.innerHTML = ""; // Czyścimy

            jsonFiles.forEach(fileInfo => {
                fetch(`${fileInfo.download_url}?t=${cacheBuster}`, { cache: 'no-store' })
                    .then(res => res.json())
                    .then(post => {
                        // Tworzenie pięknego kafelka
                        const card = document.createElement("article");
                        card.className = "bg-white rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300 flex flex-col cursor-pointer overflow-hidden border border-gray-100";
                        
                        const imageUrl = post.thumbnail || 'https://images.unsplash.com/photo-1456953180671-730de08edaa7?auto=format&fit=crop&q=80&w=600&h=400';
                        
                        // Zajawka bez markdownu
                        let plainTextContent = (post.content || '').replace(/(\*|_|#|-|\d\.)/g, '').replace(/\n/g, ' ').trim();
                        const excerpt = plainTextContent.length > 120 ? plainTextContent.substring(0, 120) + '...' : plainTextContent;

                        card.innerHTML = `
                            <div class="relative h-56 overflow-hidden">
                                <img src="${imageUrl}" alt="${post.title}" class="w-full h-full object-cover transition-transform duration-500 hover:scale-105">
                                <div class="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                            </div>
                            <div class="p-8 flex flex-col flex-grow">
                                <h3 class="text-2xl font-bold text-gray-900 mb-3 line-clamp-2 leading-tight">${post.title}</h3>
                                <p class="text-gray-600 text-base mb-6 flex-grow line-clamp-3">${excerpt}</p>
                                <div class="mt-auto">
                                    <span class="text-indigo-600 hover:text-indigo-800 font-bold text-sm uppercase tracking-wider inline-flex items-center group">
                                        Czytaj notatkę 
                                        <svg class="ml-2 w-5 h-5 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                                    </span>
                                </div>
                            </div>
                        `;
                        
                        // Obsługa kliknięcia (przejście do artykułu jako SPA)
                        card.addEventListener("click", () => {
                            showArticle(post, imageUrl);
                        });
                        
                        postsGrid.appendChild(card);
                    })
                    .catch(err => console.error("Błąd ładowania wpisu:", err));
            });
        })
        .catch(err => {
            console.error(err);
            postsGrid.innerHTML = '<p class="text-red-500 col-span-full text-center py-10 bg-red-50 rounded-lg">Wystąpił problem z wczytywaniem najnowszych notatek z GitHuba.</p>';
        });

    // 2. Wyświetlanie pięknego artykułu
    function showArticle(post, imageUrl) {
        const htmlContent = marked.parse(post.content || '');

        articleView.innerHTML = `
            <div class="max-w-4xl mx-auto">
                <button id="back-btn" class="mb-8 inline-flex items-center px-5 py-2.5 border border-indigo-200 text-sm font-semibold rounded-full text-indigo-700 bg-indigo-50 hover:bg-indigo-600 hover:text-white transition-all shadow-sm">
                    <svg class="mr-2 -ml-1 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                    Wróć do wszystkich materiałów
                </button>
                
                <article class="bg-white rounded-3xl shadow-2xl overflow-hidden mb-12 ring-1 ring-gray-100">
                    <div class="w-full h-72 md:h-[28rem] relative">
                        <img src="${imageUrl}" alt="${post.title}" class="w-full h-full object-cover">
                        <!-- Płynny gradient poprawiający czytelność tytułu nałożonego na zdjęcie -->
                        <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
                        <div class="absolute bottom-0 left-0 w-full p-8 md:p-14">
                            <h1 class="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white drop-shadow-lg leading-tight">${post.title}</h1>
                            <div class="mt-4 flex items-center text-indigo-200 text-sm font-medium">
                                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                                Zaktualizowano na żywo z CMS
                            </div>
                        </div>
                    </div>
                    
                    <div class="p-8 md:p-14 bg-white">
                        <!-- Użycie Tailwinda Typography (.prose) do przepięknego sformatowania tekstu z CMS -->
                        <div class="prose prose-lg md:prose-xl prose-indigo max-w-none text-gray-800 leading-relaxed">
                            ${htmlContent}
                        </div>
                    </div>
                </article>
            </div>
        `;

        // Przełączanie widoku z listą kafelków na widok artykułu
        homeView.classList.add('hidden');
        articleView.classList.remove('hidden');
        
        // Płynne przewinięcie strony na samą górę
        window.scrollTo({ top: 0, behavior: 'smooth' });

        // Dodanie obsługi powrotu do strony głównej
        document.getElementById('back-btn').addEventListener('click', () => {
            articleView.classList.add('hidden');
            homeView.classList.remove('hidden');
            // Powrót w górę, aby pokazać kafelki od nowa
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
});
