// DOM Elements
const gamesContainer = document.getElementById('gamesContainer');
const searchBar = document.querySelector('.search-bar');

// State
let checkedGames = {};
let filteredTopics = [];
let gamesData = { topics: [] };
let collapsedSections = {};

// Initialize the application
async function init() {
    await loadGamesData();
    loadCheckedGames();
    
    // Initialize all sections as collapsed
    gamesData.topics.forEach(topic => {
        collapsedSections[topic.id] = true;
    });
    
    renderGames();
    setupEventListeners();
}

// Load games data from external JSON file
async function loadGamesData() {
    try {
        const response = await fetch('dailys.json');
        if (!response.ok) {
            throw new Error('Failed to load dailys data');
        }
        gamesData = await response.json();
    } catch (error) {
        console.error('Error loading dailys data:', error);
        gamesContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Failed to load dailys</h3>
                <p>Please check if dailys.json exists and is valid</p>
            </div>
        `;
    }
}

// Load checked games from localStorage
function loadCheckedGames() {
    const today = new Date().toDateString();
    const storedData = localStorage.getItem('dailysChecked');
    
    if (storedData) {
        const parsedData = JSON.parse(storedData);
        
        if (parsedData.date === today) {
            checkedGames = parsedData.games;
        } else {
            checkedGames = {};
            saveCheckedGames();
        }
    }
}

// Save checked games to localStorage
function saveCheckedGames() {
    const today = new Date().toDateString();
    const dataToStore = {
        date: today,
        games: checkedGames
    };
    localStorage.setItem('dailysChecked', JSON.stringify(dataToStore));
}

// Toggle game completion status
function toggleGameCheck(gameId) {
    if (checkedGames[gameId]) delete checkedGames[gameId];
    else checkedGames[gameId] = true;

    saveCheckedGames();
    updateSectionCompletion(gameId);
}

// Update UI after checking/unchecking
function updateSectionCompletion(gameId) {
    let targetTopic = null;
    let targetTopicId = null;
    const topicsToCheck = filteredTopics.length > 0 ? filteredTopics : gamesData.topics;

    for (const topic of topicsToCheck) {
        for (const game of topic.games) {
            if (game.id === gameId) {
                targetTopic = topic;
                targetTopicId = topic.id;
                break;
            }
        }
        if (targetTopic) break;
    }

    if (!targetTopic) return;

    const isTopicComplete = isTopicCompleted(targetTopic);
    const sectionTitle = document.querySelector(`[data-topic-id="${targetTopicId}"] .section-title h2`);
    if (sectionTitle) {
        const checkmark = sectionTitle.querySelector('.section-checkmark');
        if (checkmark) {
            if (isTopicComplete) checkmark.classList.add('checked');
            else checkmark.classList.remove('checked');
        }
    }

    const gameCard = document.querySelector(`[data-game-id="${gameId}"]`);
    if (gameCard) {
        const title = gameCard.querySelector('.game-title');
        if (checkedGames[gameId]) {
            gameCard.classList.add('checked');
            title.style.textDecoration = 'line-through';
            title.style.color = 'var(--text-secondary)';
        } else {
            gameCard.classList.remove('checked');
            title.style.textDecoration = 'none';
            title.style.color = '';
        }
    }
}

// Check if full topic completed
function isTopicCompleted(topic) {
    return topic.games.every(g => checkedGames[g.id]);
}

// Render topics + games
function renderGames() {
    gamesContainer.innerHTML = '';
    const topicsToRender = filteredTopics.length > 0 ? filteredTopics : gamesData.topics;

    if (topicsToRender.length === 0) {
        gamesContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-search"></i>
                <h3>No dailys found</h3>
                <p>Try adjusting your search terms</p>
            </div>
        `;
        return;
    }

    topicsToRender.forEach(topic => {
        const topicElement = document.createElement('div');
        topicElement.className = 'topic-section';
        topicElement.setAttribute('data-topic-id', topic.id);

        const isTopicComplete = isTopicCompleted(topic);
        const isCollapsed = collapsedSections[topic.id];

        const gamesGrid = topic.games.map(game => {
            const checked = checkedGames[game.id] ? 'checked' : '';
            return `
                <div class="game-card ${checked}" data-game-id="${game.id}">
                    <div class="game-content">
                        <div class="game-info">
                            <div class="game-favicon">
                                ${game.favicon ?
                                `<img src="${game.favicon}" alt="${game.name}" onerror="this.style.display='none'; this.parentNode.innerHTML='<i class=\\'fas fa-gamepad\\'></i>';">`
                                : `<i class="fas fa-gamepad"></i>`}
                            </div>
                            <div class="game-title" style="${checked ? 'text-decoration:line-through;color:var(--text-secondary);' : ''}">
                                ${game.name}
                            </div>
                        </div>
                        <a href="${game.url}" target="_blank" class="game-link">
                            Play Now <i class="fas fa-external-link-alt"></i>
                        </a>
                    </div>
                </div>`;
        }).join('');

        topicElement.innerHTML = `
            <div class="section-title ${isCollapsed ? 'collapsed' : ''}">
                <div>
                    <h2>
                        <div class="section-icon"><i class="${topic.icon}"></i></div>
                        ${topic.name}
                        <div class="section-checkmark ${isTopicComplete ? 'checked' : ''}">
                            <i class="fas fa-check"></i>
                        </div>
                    </h2>
                    <div class="section-description">${topic.description}</div>
                </div>
                <i class="fas fa-chevron-down collapse-icon"></i>
            </div>
            <div class="games-grid" style="display:${isCollapsed ? 'none' : 'grid'}">
                ${gamesGrid}
            </div>
        `;

        gamesContainer.appendChild(topicElement);
    });

    setupGameCardListeners();
    setupSectionToggleListeners();
}

// Click toggle — FIXED downward opening
function setupSectionToggleListeners() {
    document.querySelectorAll('.section-title').forEach(title => {
        title.addEventListener('click', () => {

            const section = title.closest('.topic-section');
            const topicId = section.getAttribute('data-topic-id');
            const grid = title.nextElementSibling;
            const opening = grid.style.display === 'none';

            const scrollY = window.scrollY;

            if (opening) {
                grid.style.display = 'grid';
                title.classList.remove('collapsed');
                delete collapsedSections[topicId];

                // restore scroll so it doesn't pop upward
                requestAnimationFrame(()=>{
                    window.scrollTo({ top: scrollY, behavior:"instant" });
                });

            } else {
                grid.style.display = 'none';
                title.classList.add('collapsed');
                collapsedSections[topicId] = true;

                requestAnimationFrame(()=>{
                    window.scrollTo({ top: scrollY, behavior:"instant" });
                });
            }
        });
    });
}


// Game card toggles
function setupGameCardListeners() {
    document.querySelectorAll('.game-card').forEach(card => {
        card.addEventListener('click', e => {
            if (e.target.closest('.game-link')) return; // ignore button click
            toggleGameCheck(card.getAttribute('data-game-id'));
        });
    });
}

// Filtering system
function filterGames(query) {
    const q = query.toLowerCase().trim();
    if (!q) return filteredTopics=[], renderGames();

    filteredTopics = gamesData.topics.map(topic => {
        const matched = topic.games.filter(game =>
            game.name.toLowerCase().includes(q) ||
            topic.name.toLowerCase().includes(q) ||
            topic.description.toLowerCase().includes(q)
        );
        return matched.length ? { ...topic, games: matched } : null;
    }).filter(Boolean);

    renderGames();
}

// Search listeners
function setupEventListeners() {
    searchBar.addEventListener('input', e => filterGames(e.target.value));
    searchBar.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            searchBar.value = '';
            filterGames('');
        }
    });
}

document.addEventListener('DOMContentLoaded', init);
