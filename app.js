document.addEventListener('DOMContentLoaded', () => {
    const homeView = document.getElementById('home-view');
    const postsGrid = document.getElementById('posts-grid');
    const articleView = document.getElementById('article-view');
    
    const dataFiles = ['data/notatki/lalka.json', 'data/notatki/wesele.json'];

    // Przechowujemy załadowane wpisy w tablicy
    let loadedPosts = [];

    Promise.all(dataFiles.map(file => fetch(file).then(res => res.json())))
        .then(posts => {
            loadedPosts = posts;
            renderGrid(posts);
        })
        .catch(error => {
            console.error('Błąd podczas pobierania notatek:', error);
            postsGrid.innerHTML = '<p class="text-red-500 col-span-full text-center">Nie udało się załadować notatek.</p>';
        });

    function renderGrid(posts) {
        postsGrid.innerHTML = '';
        posts.forEach((post, index) => {
            const card = document.createElement('div');
            // Zaktualizowany profesjonalny design: zaokrąglenia, płynne cienie, marginesy, animacja hover (unoszenie się do góry)
            card.className = 'bg-white rounded-2xl shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 flex flex-col cursor-pointer overflow-hidden';
            
            const imageUrl = post.thumbnail || 'https://images.unsplash.com/photo-1456953180671-730de08edaa7?auto=format&fit=crop&q=80&w=600&h=400';
            
            // Proste wyciągnięcie tekstu do zajawki (bez znaczników Markdowna)
            let plainTextContent = post.content.replace(/(\*|_|#|-|\d\.)/g, '').replace(/\n/g, ' ').trim();
            const excerpt = plainTextContent.length > 120 ? plainTextContent.substring(0, 120) + '...' : plainTextContent;

            card.innerHTML = `
                <div class="overflow-hidden h-52">
                    <img src="${imageUrl}" alt="${post.title}" class="w-full h-full object-cover transition-transform duration-500 hover:scale-105">
                </div>
                <div class="p-8 flex flex-col flex-grow">
                    <h3 class="text-2xl font-bold text-gray-900 mb-3 line-clamp-2">${post.title}</h3>
                    <p class="text-gray-600 text-base mb-6 flex-grow line-clamp-3">${excerpt}</p>
                    <div class="mt-auto">
                        <button class="text-indigo-600 hover:text-indigo-800 font-semibold text-base inline-flex items-center group">
                            Czytaj dalej 
                            <svg class="ml-2 w-5 h-5 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                        </button>
                    </div>
                </div>
            `;
            
            // Kliknięcie w dowolne miejsce kafelka otwiera artykuł
            card.addEventListener('click', () => {
                showArticle(index);
            });
            
            postsGrid.appendChild(card);
        });
    }

    // Funkcja ładująca pełen widok artykułu bez przeładowywania strony (SPA)
    function showArticle(index) {
        const post = loadedPosts[index];
        const imageUrl = post.thumbnail || 'https://images.unsplash.com/photo-1456953180671-730de08edaa7?auto=format&fit=crop&q=80&w=1200&h=600';
        
        // Renderowanie markdownu za pomocą biblioteki marked.js na poprawny HTML
        const htmlContent = marked.parse(post.content);

        articleView.innerHTML = `
            <div class="max-w-4xl mx-auto">
                <button id="back-btn" class="mb-8 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-50 hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors shadow-sm">
                    <svg class="mr-2 -ml-1 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                    Wróć do materiałów
                </button>
                
                <article class="bg-white rounded-3xl shadow-xl overflow-hidden mb-12">
                    <div class="w-full h-64 md:h-96 relative">
                        <img src="${imageUrl}" alt="${post.title}" class="w-full h-full object-cover">
                        <!-- Ciemny gradient ułatwiający czytanie nałożonego tytułu -->
                        <div class="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
                        <div class="absolute bottom-0 left-0 p-8 md:p-12">
                            <h1 class="text-3xl md:text-5xl font-extrabold text-white drop-shadow-md">${post.title}</h1>
                        </div>
                    </div>
                    
                    <div class="p-8 md:p-12">
                        <!-- Używamy klasy .prose z wtyczki @tailwindcss/typography do formatowania HTML wygenerowanego z Markdown -->
                        <div class="prose prose-lg prose-indigo max-w-none text-gray-800">
                            ${htmlContent}
                        </div>
                    </div>
                </article>
            </div>
        `;

        // Przełączanie widoków w DOM
        homeView.classList.add('hidden');
        articleView.classList.remove('hidden');
        
        // Automatyczne przewinięcie strony na samą górę dla lepszego wrażenia (UX)
        window.scrollTo({ top: 0, behavior: 'smooth' });

        // Dodanie obsługi przycisku powrotu
        document.getElementById('back-btn').addEventListener('click', () => {
            articleView.classList.add('hidden');
            homeView.classList.remove('hidden');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
});
