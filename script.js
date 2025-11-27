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
    
    // Update only the affected section, not all sections
    updateSectionCompletion(gameId);
}

// Update section completion status without re-rendering everything
function updateSectionCompletion(gameId) {
    // Find which topic this game belongs to
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
    
    // Update the section checkmark
    const isTopicComplete = isTopicCompleted(targetTopic);
    const sectionTitle = document.querySelector(`[data-topic-id="${targetTopicId}"] .section-title h2`);
    if (sectionTitle) {
        const checkmark = sectionTitle.querySelector('.section-checkmark');
        if (checkmark) {
            if (isTopicComplete) {
                checkmark.classList.add('checked');
            } else {
                checkmark.classList.remove('checked');
            }
        }
    }
    
    // Update the game card
    const gameCard = document.querySelector(`[data-game-id="${gameId}"]`);
    if (gameCard) {
        if (checkedGames[gameId]) {
            gameCard.classList.add('checked');
            gameCard.querySelector('.game-title').style.textDecoration = 'line-through';
            gameCard.querySelector('.game-title').style.color = 'var(--text-secondary)';
        } else {
            gameCard.classList.remove('checked');
            gameCard.querySelector('.game-title').style.textDecoration = 'none';
            gameCard.querySelector('.game-title').style.color = '';
        }
    }
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
                <h3>No dailys found</h3>
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
                            <div class="game-title" style="${isChecked ? 'text-decoration: line-through; color: var(--text-secondary)' : ''}">${game.name}</div>
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
    document.querySelectorAll('.topic-section').forEach(section => {
        const title = section.querySelector('.section-title');
        const grid = section.querySelector('.games-grid');
        const topicId = section.getAttribute('data-topic-id');

        // Set default collapsed/expanded state
        if (collapsedSections[topicId]) {
            section.classList.remove("open");
            grid.style.maxHeight = "0px";
        } else {
            section.classList.add("open");
            grid.style.maxHeight = grid.scrollHeight + "px";
        }

        title.addEventListener('click', () => {
            const isOpening = !section.classList.contains("open");

            section.classList.toggle("open", isOpening);

            if (isOpening) {
                collapsedSections[topicId] = false;
                grid.style.maxHeight = grid.scrollHeight + "px";

                section.scrollIntoView({ behavior: "smooth", block: "start" });
            } else {
                collapsedSections[topicId] = true;
                grid.style.maxHeight = "0px";
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
