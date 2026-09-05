document.addEventListener("DOMContentLoaded", () => {
    const grid = document.getElementById("posts-grid");
    if (!grid) return;
    
    const filesToLoad = ['lalka.json', 'wesele.json']; 

    filesToLoad.forEach(fileName => {
        fetch(`/data/notatki/${fileName}`)
            .then(response => {
                if(!response.ok) throw new Error("Nie znaleziono pliku: " + fileName);
                return response.json();
            })
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
                });
                grid.appendChild(card);
            })
            .catch(err => console.error("Błąd ładowania wpisu:", err));
    });
});
