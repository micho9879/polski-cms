document.addEventListener("DOMContentLoaded", () => {
    const grid = document.getElementById("posts-grid");
    if (!grid) return;
    
    // Dodajemy unikalny znacznik czasu, aby całkowicie oszukać pamięć podręczną (cache) przeglądarki i GitHuba
    const cacheBuster = new Date().getTime();

    // Pobieramy listę plików, wymuszając brak cache
    fetch(`https://api.github.com/repos/micho9879/polski-cms/contents/public/data/notatki?t=${cacheBuster}`, { cache: 'no-store' })
        .then(response => {
            if (!response.ok) throw new Error("Błąd pobierania listy plików z GitHuba");
            return response.json();
        })
        .then(files => {
            const jsonFiles = files.filter(f => f.name.endsWith('.json'));
            grid.innerHTML = "";

            jsonFiles.forEach(fileInfo => {
                // Pobieramy surowy tekst pliku, wymuszając najświeższą wersję za pomocą parametru URL
                fetch(`${fileInfo.download_url}?t=${cacheBuster}`, { cache: 'no-store' })
                    .then(res => res.json())
                    .then(data => {
                        const card = document.createElement("div");
                        card.className = "bg-white p-6 rounded-lg shadow-lg hover:-translate-y-1 transition cursor-pointer";
                        card.innerHTML = `
                            <h2 class="text-xl font-bold mb-2">${data.title}</h2>
                            <p class="text-gray-600 mb-4">Kliknij, aby przeczytać całość...</p>
                            <button class="text-blue-600 font-semibold">Czytaj dalej &rarr;</button>
                        `;
                        
                        card.addEventListener("click", () => {
                            document.body.innerHTML = `
                                <div class="max-w-3xl mx-auto p-8">
                                    <button onclick="location.reload()" class="mb-8 text-blue-600 font-semibold hover:underline">&larr; Wróć do materiałów</button>
                                    <h1 class="text-4xl font-bold mb-6">${data.title}</h1>
                                    <div class="prose lg:prose-xl">${marked.parse(data.content)}</div>
                                </div>
                            `;
                            window.scrollTo(0, 0);
                        });
                        grid.appendChild(card);
                    })
                    .catch(err => console.error("Błąd ładowania wpisu:", err));
            });
        })
        .catch(err => {
            console.error(err);
            grid.innerHTML = '<p class="text-red-500">Wystąpił problem z wczytywaniem najnowszych notatek z GitHuba.</p>';
        });
});
