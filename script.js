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
    renderGames();
    setupEventListeners();
}

// Load games data from external JSON file
async function loadGamesData() {
    try {
        const response = await fetch('games.json');
        if (!response.ok) {
            throw new Error('Failed to load games data');
        }
        gamesData = await response.json();
    } catch (error) {
        console.error('Error loading games data:', error);
        gamesContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Failed to load games</h3>
                <p>Please check if games.json exists and is valid</p>
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
        
        // Check if the stored data is from today
        if (parsedData.date === today) {
            checkedGames = parsedData.games;
        } else {
            // Reset if it's a new day
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
    if (checkedGames[gameId]) {
        delete checkedGames[gameId];
    } else {
        checkedGames[gameId] = true;
    }
    saveCheckedGames();
    renderGames();
}

// Check if all games in a topic are completed
function isTopicCompleted(topic) {
    return topic.games.every(game => checkedGames[game.id]);
}

// Render all games
function renderGames() {
    // Clear container
    gamesContainer.innerHTML = '';
    
    // Use filtered topics if search is active, otherwise use all topics
    const topicsToRender = filteredTopics.length > 0 ? filteredTopics : gamesData.topics;
    
    if (topicsToRender.length === 0) {
        gamesContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-search"></i>
                <h3>No games found</h3>
                <p>Try adjusting your search terms</p>
            </div>
        `;
        return;
    }
    
    // Render each topic section
    topicsToRender.forEach(topic => {
        const topicElement = document.createElement('div');
        topicElement.className = 'topic-section';
        topicElement.setAttribute('data-topic-id', topic.id);
        
        const isTopicComplete = isTopicCompleted(topic);
        const isCollapsed = collapsedSections[topic.id];
        
        const gamesGrid = topic.games.map(game => {
            const isChecked = checkedGames[game.id] || false;
            
            return `
                <div class="game-card ${isChecked ? 'checked' : ''}" data-game-id="${game.id}">
                    <div class="game-content">
                        <div class="game-info">
                            <div class="game-favicon">
                                ${game.favicon ? 
                                    `<img src="${game.favicon}" alt="${game.name} icon" onerror="this.style.display='none'; this.parentNode.innerHTML='<i class=\\'fas fa-gamepad\\'></i>';">` : 
                                    `<i class="fas fa-gamepad"></i>`
                                }
                            </div>
                            <div class="game-title">${game.name}</div>
                        </div>
                        <a href="${game.url}" target="_blank" class="game-link">
                            Play Now <i class="fas fa-external-link-alt"></i>
                        </a>
                    </div>
                </div>
            `;
        }).join('');
        
        topicElement.innerHTML = `
            <div class="section-title ${isCollapsed ? 'collapsed' : ''}">
                <div>
                    <h2>
                        <div class="section-icon">
                            <i class="${topic.icon}"></i>
                        </div>
                        ${topic.name}
                        <div class="section-checkmark ${isTopicComplete ? 'checked' : ''}">
                            <i class="fas fa-check"></i>
                        </div>
                    </h2>
                    <div class="section-description">${topic.description}</div>
                </div>
                <i class="fas fa-chevron-down collapse-icon"></i>
            </div>
            <div class="games-grid" style="display: ${isCollapsed ? 'none' : 'grid'}">
                ${gamesGrid}
            </div>
        `;
        
        gamesContainer.appendChild(topicElement);
    });
    
    // Add event listeners to game cards and section titles
    setupGameCardListeners();
    setupSectionToggleListeners();
}

// Setup event listeners for game cards
function setupGameCardListeners() {
    document.querySelectorAll('.game-card').forEach(card => {
        // Make entire card clickable (except the Play Now link)
        card.addEventListener('click', (e) => {
            // Don't trigger if the click was on the Play Now link
            if (e.target.closest('.game-link')) {
                return;
            }
            
            const gameId = card.getAttribute('data-game-id');
            toggleGameCheck(gameId);
        });
    });
}

// Setup event listeners for section toggling
function setupSectionToggleListeners() {
    document.querySelectorAll('.section-title').forEach(title => {
        title.addEventListener('click', () => {
            const topicSection = title.closest('.topic-section');
            const topicId = topicSection.getAttribute('data-topic-id');
            const gamesGrid = title.nextElementSibling;
            const isCollapsed = gamesGrid.style.display === 'none';
            
            if (isCollapsed) {
                gamesGrid.style.display = 'grid';
                title.classList.remove('collapsed');
                delete collapsedSections[topicId];
            } else {
                gamesGrid.style.display = 'none';
                title.classList.add('collapsed');
                collapsedSections[topicId] = true;
            }
        });
    });
}

// Filter games based on search query
function filterGames(query) {
    const lowerQuery = query.toLowerCase().trim();
    
    if (!lowerQuery) {
        filteredTopics = [];
        renderGames();
        return;
    }
    
    filteredTopics = gamesData.topics.map(topic => {
        const filteredGames = topic.games.filter(game => 
            game.name.toLowerCase().includes(lowerQuery) || 
            topic.name.toLowerCase().includes(lowerQuery) ||
            topic.description.toLowerCase().includes(lowerQuery)
        );
        
        return filteredGames.length > 0 ? { ...topic, games: filteredGames } : null;
    }).filter(topic => topic !== null);
    
    renderGames();
}

// Setup all event listeners
function setupEventListeners() {
    // Search functionality
    searchBar.addEventListener('input', (e) => {
        filterGames(e.target.value);
    });
    
    // Clear search on escape key
    searchBar.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            searchBar.value = '';
            filterGames('');
        }
    });
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', init);
