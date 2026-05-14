/**
 * Voz do Aluno - Core Logic
 */

// Config
const STORAGE_KEY = 'voz_do_aluno_posts';
const USER_KEY = 'voz_do_aluno_user';
const HIGHLIGHT_THRESHOLD = 50;

// Filtro de Palavras Impróprias Avançado
const BAD_WORDS = ['merda', 'porra', 'caralho', 'puta', 'fdp', 'arrombado', 'buceta', 'cuzão', 'cuzao', 'filho da puta', 'desgraçado', 'corno', 'idiota', 'imbecil', 'otário', 'otario', 'cacete'];

function containsBadWords(text) {
    if (!text) return false;
    // Normaliza 'leetspeak' (números no lugar de letras)
    const normalized = text.toLowerCase()
        .replace(/0/g, 'o')
        .replace(/4/g, 'a')
        .replace(/3/g, 'e')
        .replace(/1/g, 'i')
        .replace(/5/g, 's')
        .replace(/@/g, 'a');
        
    return BAD_WORDS.some(word => normalized.includes(word));
}

// State
let posts = JSON.parse(localStorage.getItem(STORAGE_KEY));
let currentUser = JSON.parse(localStorage.getItem(USER_KEY));
let currentSort = 'hot'; // 'hot' or 'new'
let visiblePostsCount = 5;

const NOTIFICATIONS_KEY = 'voz_do_aluno_notifications';
const ANNOUNCEMENTS_KEY = 'voz_do_aluno_announcements';
const USERS_LIST_KEY = 'voz_do_aluno_users_list';
const BANNED_USERS_KEY = 'voz_do_aluno_banned_users';

let usersList = JSON.parse(localStorage.getItem(USERS_LIST_KEY)) || [];
let bannedUsers = JSON.parse(localStorage.getItem(BANNED_USERS_KEY)) || [];
let userNotifications = [];
let announcements = JSON.parse(localStorage.getItem(ANNOUNCEMENTS_KEY)) || [];
if (announcements.length === 0) {
    announcements = [
        { id: 'a1', type: 'official', title: 'Portal Ativo', text: 'Bem-vindos ao portal de ideias. A coordenação está de olho!', date: new Date().toISOString() }
    ];
    localStorage.setItem(ANNOUNCEMENTS_KEY, JSON.stringify(announcements));
}
if (currentUser) {
    userNotifications = JSON.parse(localStorage.getItem(NOTIFICATIONS_KEY + '_' + currentUser.uid)) || [];
}

// DOM Elements
const postsContainer = document.getElementById('posts-container');
const rankingList = document.getElementById('ranking-list');
const openModalBtn = document.getElementById('open-modal-btn');
const closeModalBtn = document.getElementById('close-modal-btn');
const postModal = document.getElementById('post-modal');
const postForm = document.getElementById('create-post-form');
const cancelPostBtn = document.getElementById('cancel-post-btn');
const filterBtns = document.querySelectorAll('.filter-btn');
const toastContainer = document.getElementById('toast-container');
const userProfileContainer = document.getElementById('user-profile-container');
const loadMoreBtn = document.getElementById('load-more-btn');

if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', () => {
        visiblePostsCount += 5;
        renderPosts();
    });
}

window.togglePasswordVisibility = function(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const btn = input.nextElementSibling;
    const icon = btn.querySelector('i');
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

// Auth DOM Elements
const authModal = document.getElementById('auth-modal');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const tabBtns = document.querySelectorAll('.tab-btn');
const closeAuthBtn = document.getElementById('close-auth-btn');

// --- Theme Logic ---
const themeToggleBtn = document.getElementById('theme-toggle');
const rootElement = document.documentElement;

function setTheme(theme) {
    if (theme === 'light') {
        rootElement.setAttribute('data-theme', 'light');
        themeToggleBtn.innerHTML = '<i class="fa-solid fa-moon"></i>';
        localStorage.setItem('voz_do_aluno_theme', 'light');
    } else {
        rootElement.removeAttribute('data-theme');
        themeToggleBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
        localStorage.setItem('voz_do_aluno_theme', 'dark');
    }
}
const savedTheme = localStorage.getItem('voz_do_aluno_theme') || 'dark';
setTheme(savedTheme);

themeToggleBtn.addEventListener('click', () => {
    const currentTheme = rootElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    setTheme(currentTheme === 'light' ? 'dark' : 'light');
});


// --- Global Click Listener for Dropdowns ---
window.addEventListener('click', function(e) {
    if (!e.target.closest('.dropdown')) {
        document.querySelectorAll('.dropdown-content').forEach(el => {
            el.classList.remove('show');
        });
    }
});


// --- Initialization ---
if (!posts || !posts[0] || !posts[0].hasOwnProperty('comments')) {
    posts = [
        {
            id: '1',
            title: 'Colocar mais bancos no pátio principal',
            description: 'Durante o recreio, muitos alunos ficam em pé porque não há lugares suficientes para sentar. Se pudessem adicionar mais alguns bancos de madeira perto das árvores ia ajudar muito!',
            upvotes: 48,
            downvotes: 2,
            createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
            author: 'João M.',
            authorUid: 'user_joao',
            authorMeta: '2º Ano E.M. | Informática',
            highlighted: false,
            userVotes: {},
            tags: ['Infraestrutura', 'Pátio', 'Lazer'],
            pinnedCommentId: 'c1',
            comments: [
                { id: 'c1', authorUid: 'admin_escola', author: 'Direção Escolar', text: 'Boa ideia, João! Já solicitamos o orçamento de 10 novos bancos de madeira sustentável. Aprovada a iniciativa!', createdAt: new Date(Date.now() - 86400000).toISOString(), likes: 25 },
                { id: 'c1x', authorUid: 'user_maria', author: 'Maria Eduarda', text: 'Nossa, super apoio! Tem dias que não tem onde sentar mesmo.', createdAt: new Date(Date.now() - 40000000).toISOString(), likes: 8 }
            ]
        },
        {
            id: '2',
            title: 'Wi-Fi liberado na Biblioteca para pesquisas',
            description: 'A biblioteca é ótima, mas às vezes precisamos usar nossos próprios notebooks para pesquisas escolares e o sinal de rede é muito fraco. Liberar um Wi-Fi estudantil lá ajudaria.',
            upvotes: 125,
            downvotes: 5,
            createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
            author: 'Ana Clara',
            authorUid: 'user_ana',
            authorMeta: '3º Ano E.M.',
            highlighted: true,
            userVotes: {},
            tags: ['Tecnologia', 'Biblioteca'],
            pinnedCommentId: 'c2',
            comments: [
                { id: 'c2', authorUid: 'ti_escola', author: 'Coordenação de T.I', text: 'Infelizmente a nossa rede atual da biblioteca não suporta tráfego aberto para dezenas de alunos simultâneos. Ideia rejeitada temporariamente por restrições técnicas, mas está nos planos para o próximo ano.', createdAt: new Date(Date.now() - 86400000 * 3).toISOString(), likes: 45 },
                { id: 'c2x', authorUid: 'user_lucas', author: 'Lucas R.', text: 'Que pena, ia ajudar muito no TCC.', createdAt: new Date(Date.now() - 80000000).toISOString(), likes: 2 }
            ]
        }
    ];
    savePosts();
}

// Migrate any existing posts missing arrays
posts.forEach(p => {
    if(!p.comments) p.comments = [];
});

// --- Auth Logic ---
function updateAuthUI() {
    if (currentUser) {
        authModal.classList.remove('active');
        document.body.style.overflow = 'auto'; // restore scroll

        let courseTag = currentUser.course === 'Ensino Regular (Sem Curso)' ? '' : ` | ${currentUser.course}`;
        userProfileContainer.innerHTML = `
            <div style="text-align: right; margin-right: 8px;">
                <div style="font-weight: 700; color: var(--text-main); font-size: 0.95rem;">${currentUser.name}</div>
                <div style="font-size: 0.8rem; color: var(--primary-medium); font-weight: 600;">${currentUser.className}${courseTag}</div>
            </div>
            <div class="dropdown">
                <div class="avatar" style="cursor: pointer;" onclick="toggleProfileDropdown(event)"><i class="fa-solid fa-user"></i></div>
                <div class="dropdown-content profile-dropdown" id="profile-dropdown">
                    ${currentUser.role === 'professor' ? '<a href="admin.html" class="dropdown-item" style="color: var(--highlight);"><i class="fa-solid fa-shield-halved"></i> Painel Administrativo</a>' : ''}
                    <button class="dropdown-item" onclick="editProfile()"><i class="fa-solid fa-user-pen"></i> Editar Perfil</button>
                    <button class="dropdown-item" onclick="logout()" style="color: var(--downvote-color);"><i class="fa-solid fa-right-from-bracket"></i> Sair da Conta</button>
                </div>
            </div>
        `;
    } else {
        userProfileContainer.innerHTML = `
            <button onclick="showAuthModal()" class="btn btn-primary" style="padding: 0.5rem 1.2rem; font-size: 0.9rem;">Entrar / Cadastrar</button>
        `;
    }
}

window.toggleProfileDropdown = function(e) {
    e.stopPropagation();
    document.getElementById('profile-dropdown').classList.toggle('show');
}

window.editProfile = function() {
    showToast("Aviso", "Função de edição de perfil em desenvolvimento!", "info");
}

window.logout = function () {
    localStorage.removeItem(USER_KEY);
    currentUser = null;
    userNotifications = [];
    if(typeof renderNotificationsUI === 'function') renderNotificationsUI();
    updateAuthUI();
    renderPosts(); // Re-render posts to hide admin/author menus
}

window.showAuthModal = function () {
    authModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

if (closeAuthBtn) {
    closeAuthBtn.addEventListener('click', () => {
        authModal.classList.remove('active');
        document.body.style.overflow = 'auto'; // restore scroll
    });
}

tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
        if (btn.dataset.tab === 'login') {
            loginForm.classList.add('active');
        } else {
            registerForm.classList.add('active');
        }
    });
});

const ALUNO_DOMAIN = '@aluno.educacao.sp.gov.br';
const PROF_DOMAIN = '@prof.educacao.sp.gov.br';

function validateInstitutionalEmail(email) {
    if (email.endsWith(ALUNO_DOMAIN)) return 'aluno';
    if (email.endsWith(PROF_DOMAIN)) return 'professor';
    return null;
}

let verificationTimer = null;
let verificationTimeLeft = 60;

function startVerificationTimer() {
    clearInterval(verificationTimer);
    verificationTimeLeft = 60;
    const resendBtn = document.getElementById('resend-code-btn');
    resendBtn.disabled = true;
    
    verificationTimer = setInterval(() => {
        verificationTimeLeft--;
        if (verificationTimeLeft <= 0) {
            clearInterval(verificationTimer);
            resendBtn.disabled = false;
            resendBtn.textContent = 'Reenviar código';
        } else {
            resendBtn.textContent = `Reenviar código em ${verificationTimeLeft}s`;
        }
    }, 1000);
}

document.getElementById('resend-code-btn').addEventListener('click', () => {
    showToast('Enviado', 'Um novo código foi enviado para o seu e-mail.', 'success');
    startVerificationTimer();
});

const verificationForm = document.getElementById('verification-form');
verificationForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const code = document.getElementById('ver-code').value.trim();
    if (code.length !== 6) {
        showToast('Erro', 'O código deve ter 6 dígitos.', 'error');
        return;
    }
    
    localStorage.setItem(USER_KEY, JSON.stringify(window.pendingUser));
    currentUser = window.pendingUser;
    
    // Save to users list if not exists
    if (!usersList.find(u => u.uid === currentUser.uid)) {
        usersList.push(currentUser);
        localStorage.setItem(USERS_LIST_KEY, JSON.stringify(usersList));
    }
    
    window.pendingUser = null;
    
    document.getElementById('verification-modal').classList.remove('active');
    document.body.style.overflow = 'auto'; // allow scroll again
    document.getElementById('ver-code').value = '';
    userNotifications = JSON.parse(localStorage.getItem(NOTIFICATIONS_KEY + '_' + currentUser.uid)) || [];
    if(typeof renderNotificationsUI === 'function') renderNotificationsUI();
    
    updateAuthUI();
    renderPosts();
    showToast('Sucesso', 'Conta confirmada! Bem-vindo(a) à plataforma.', 'success');
});

document.getElementById('close-ver-btn').addEventListener('click', () => {
    document.getElementById('verification-modal').classList.remove('active');
    document.body.style.overflow = 'auto';
    window.pendingUser = null;
});

registerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('reg-email').value.trim().toLowerCase();

    const role = validateInstitutionalEmail(email);
    if (!role) {
        showToast('Erro', 'Por favor, use um e-mail institucional válido (@aluno.educacao.sp.gov.br ou @prof.educacao.sp.gov.br).', 'error');
        return;
    }

    if (bannedUsers.includes(email)) {
        showToast('Erro', 'Esta conta foi banida por violação das regras.', 'error');
        return;
    }

    const isProf = role === 'professor';
    const course = isProf ? 'Professor/Direção' : document.getElementById('reg-course').value;
    const className = isProf ? 'Professor' : document.getElementById('reg-class').value;

    window.pendingUser = {
        uid: 'user_' + Date.now().toString(),
        name: document.getElementById('reg-name').value,
        email: email,
        course: course,
        className: className,
        role: role
    };

    authModal.classList.remove('active');
    document.getElementById('verification-modal').classList.add('active');
    document.body.style.overflow = 'hidden';
    startVerificationTimer();
});

loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim().toLowerCase();

    const role = validateInstitutionalEmail(email);
    if (!role) {
        showToast('Erro', 'Por favor, use um e-mail institucional válido (@aluno.educacao.sp.gov.br ou @prof.educacao.sp.gov.br).', 'error');
        return;
    }

    if (bannedUsers.includes(email)) {
        showToast('Erro', 'Esta conta foi banida por violação das regras.', 'error');
        return;
    }

    const mockUser = {
        uid: 'user_' + email, // Mock uid
        name: email.split('@')[0].charAt(0).toUpperCase() + email.split('@')[0].slice(1),
        email: email,
        course: role === 'professor' ? 'Professor/Direção' : 'Ensino Regular',
        className: role === 'professor' ? 'Professor' : 'Aluno',
        role: role
    };

    localStorage.setItem(USER_KEY, JSON.stringify(mockUser));
    currentUser = mockUser;

    // Save login user to users list if not registered before
    if (!usersList.find(u => u.uid === mockUser.uid)) {
        usersList.push(mockUser);
        localStorage.setItem(USERS_LIST_KEY, JSON.stringify(usersList));
    }

    userNotifications = JSON.parse(localStorage.getItem(NOTIFICATIONS_KEY + '_' + currentUser.uid)) || [];
    if(typeof renderNotificationsUI === 'function') renderNotificationsUI();
    updateAuthUI();
    renderPosts();
});


// --- Core App Logic ---
function savePosts() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
}

function renderPosts() {
    postsContainer.innerHTML = '';

    const sortedPosts = [...posts].sort((a, b) => {
        if (currentSort === 'hot') {
            const scoreA = a.upvotes - a.downvotes;
            const scoreB = b.upvotes - b.downvotes;
            return scoreB - scoreA;
        } else {
            return new Date(b.createdAt) - new Date(a.createdAt);
        }
    });

    if (sortedPosts.length === 0) {
        postsContainer.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-ghost empty-state-icon"></i>
                <h3>Nenhuma ideia por aqui</h3>
                <p>Seja o primeiro a compartilhar uma sugestão!</p>
            </div>
        `;
        const loadMoreContainer = document.getElementById('load-more-container');
        if (loadMoreContainer) loadMoreContainer.style.display = 'none';
        renderRanking();
        return;
    }

    const postsToShow = sortedPosts.slice(0, visiblePostsCount);

    postsToShow.forEach(post => {
        const score = post.upvotes - post.downvotes;
        const scoreClass = score > 0 ? 'positive' : (score < 0 ? 'negative' : '');

        let isUpvoted = false;
        let isDownvoted = false;

        if (currentUser && post.userVotes && post.userVotes[currentUser.uid]) {
            isUpvoted = post.userVotes[currentUser.uid] === 'up';
            isDownvoted = post.userVotes[currentUser.uid] === 'down';
        }

        const date = new Date(post.createdAt);
        const dateStr = date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
        
        const isAuthor = currentUser && post.authorUid === currentUser.uid;

        let statusHtml = '';
        if (post.status && post.status !== 'none') {
            let statusText = '';
            let statusClass = '';
            if (post.status === 'analysis') { statusText = 'Em Análise'; statusClass = 'status-analysis'; }
            else if (post.status === 'approved') { statusText = 'Aprovado'; statusClass = 'status-approved'; }
            else if (post.status === 'rejected') { statusText = 'Rejeitado'; statusClass = 'status-rejected'; }
            else if (post.status === 'done') { statusText = 'Concluído'; statusClass = 'status-done'; }
            
            if (statusText) {
                statusHtml = `<span class="status-badge ${statusClass}">${statusText}</span>`;
            }
        }

        const postEl = document.createElement('article');
        postEl.className = 'post';
        postEl.id = `post-${post.id}`;
        postEl.innerHTML = `
            <div class="post-vote-col">
                <button class="vote-btn upvote ${isUpvoted ? 'active' : ''}" onclick="handleVote('${post.id}', 'up')">
                    <i class="fa-solid fa-arrow-up"></i>
                </button>
                <span class="vote-count ${scoreClass}">${score}</span>
                <button class="vote-btn downvote ${isDownvoted ? 'active' : ''}" onclick="handleVote('${post.id}', 'down')">
                    <i class="fa-solid fa-arrow-down"></i>
                </button>
            </div>
            <div class="post-content-col">
                <div class="post-meta" style="justify-content: space-between;">
                    <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
                        <span class="post-author"><i class="fa-solid fa-user-circle"></i> ${post.author}</span>
                        ${post.role === 'professor' || (post.authorMeta && post.authorMeta.includes('Professor')) ? `<span class="teacher-badge"><i class="fa-solid fa-graduation-cap"></i> PROFESSOR</span>` : ''}
                        ${post.authorMeta && !(post.role === 'professor' || (post.authorMeta && post.authorMeta.includes('Professor'))) ? `<span style="color: var(--primary-medium); font-weight: 600;">[${post.authorMeta}]</span>` : ''}
                        <span>• ${dateStr}</span>
                        ${post.highlighted ? '<span class="post-highlight-badge"><i class="fa-solid fa-star"></i> DESTAQUE</span>' : ''}
                    </div>
                    ${isAuthor ? `
                    <div class="dropdown">
                        <button class="action-btn" onclick="togglePostDropdown(event, '${post.id}')" style="padding: 4px;"><i class="fa-solid fa-ellipsis-vertical"></i></button>
                        <div class="dropdown-content" id="post-dropdown-${post.id}">
                            <button class="dropdown-item" onclick="editPost('${post.id}')"><i class="fa-solid fa-pen"></i> Editar Post</button>
                            <button class="dropdown-item" onclick="deletePost('${post.id}')" style="color: var(--downvote-color);"><i class="fa-solid fa-trash"></i> Excluir</button>
                        </div>
                    </div>` : ''}
                </div>
                <h3 class="post-title">${post.title}${statusHtml}</h3>
                <p class="post-desc">${post.description}</p>
                
                <div class="post-actions">
                    <button class="action-btn" onclick="toggleCommentsSection('${post.id}')"><i class="fa-regular fa-comment"></i> Compartilhar / ${post.comments ? post.comments.length : 0} Comentários</button>
                    <button class="action-btn" onclick="reportPost('${post.id}')"><i class="fa-regular fa-flag"></i> Reportar</button>
                </div>
                
                <div class="comments-section" id="comments-section-${post.id}" style="display: none;">
                    <div class="comments-header">
                        <h4 style="font-size: 0.95rem; font-weight: 700;">Comentários (${post.comments.length})</h4>
                        <select id="comment-sort-${post.id}" onchange="renderComments('${post.id}')" class="comment-filter">
                            <option value="recent">Mais Recentes</option>
                            <option value="oldest">Mais Antigos</option>
                            <option value="liked">Mais Curtidos</option>
                        </select>
                    </div>
                    <form class="comment-form" onsubmit="addComment(event, '${post.id}')">
                        <input type="text" id="comment-input-${post.id}" placeholder="Escreva um comentário..." required maxlength="250">
                        <button type="submit" class="btn btn-primary" style="padding: 0.5rem 1rem;"><i class="fa-solid fa-paper-plane"></i></button>
                    </form>
                    <div class="comments-list" id="comments-list-${post.id}"></div>
                </div>
            </div>
        `;
        postsContainer.appendChild(postEl);
    });

    const loadMoreContainer = document.getElementById('load-more-container');
    if (loadMoreContainer) {
        if (sortedPosts.length > visiblePostsCount) {
            loadMoreContainer.style.display = 'block';
        } else {
            loadMoreContainer.style.display = 'none';
        }
    }

    renderRanking();
}

window.togglePostDropdown = function(e, id) {
    e.stopPropagation();
    document.querySelectorAll('.dropdown-content').forEach(el => el.classList.remove('show')); // hide others
    document.getElementById(`post-dropdown-${id}`).classList.toggle('show');
}

let editingPostId = null;
let postToDeleteId = null;

window.editPost = function(id) {
    const post = posts.find(p => p.id === id);
    if (!post) return;
    
    document.getElementById('post-modal-title').textContent = 'Editar Postagem';
    document.getElementById('post-title').value = post.title;
    document.getElementById('post-desc').value = post.description;
    
    editingPostId = id;
    postModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

window.deletePost = function(id) {
    postToDeleteId = id;
    document.getElementById('confirm-delete-modal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

window.closeDeleteModal = function() {
    document.getElementById('confirm-delete-modal').classList.remove('active');
    document.body.style.overflow = 'auto';
    postToDeleteId = null;
}

document.getElementById('confirm-delete-btn').addEventListener('click', () => {
    if (postToDeleteId) {
        posts = posts.filter(p => p.id !== postToDeleteId);
        savePosts();
        renderPosts();
        closeDeleteModal();
        showToast("Excluído", "Sua postagem foi removida com sucesso.", "success");
    }
});

function renderRanking() {
    rankingList.innerHTML = '';
    const topPosts = [...posts]
        .sort((a, b) => (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes))
        .slice(0, 3);

    topPosts.forEach((post, index) => {
        const item = document.createElement('li');
        item.className = 'ranking-item';
        item.style.cursor = 'pointer';
        item.onclick = () => scrollToPost(post.id);

        let rankIcon = index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉';

        item.innerHTML = `
            <div class="rank-badge rank-${index + 1}">${rankIcon}</div>
            <div class="ranking-details">
                <h4>${post.title}</h4>
                <span>${post.upvotes - post.downvotes} votos</span>
            </div>
        `;
        rankingList.appendChild(item);
    });
}

// Voting logic
window.handleVote = function (id, type) {
    if (!currentUser) {
        showAuthModal();
        return;
    }

    const postIndex = posts.findIndex(p => p.id === id);
    if (postIndex === -1) return;

    const post = posts[postIndex];
    if (!post.userVotes) post.userVotes = {};

    const currentVote = post.userVotes[currentUser.uid];

    if (currentVote === 'up') post.upvotes--;
    if (currentVote === 'down') post.downvotes--;

    if (currentVote === type) {
        delete post.userVotes[currentUser.uid]; // Toggle off
    } else {
        post.userVotes[currentUser.uid] = type;
        if (type === 'up') {
            post.upvotes++;
            if (post.authorUid !== currentUser.uid && typeof createNotification === 'function') {
                createNotification(post.authorUid, `Sua ideia "${post.title.substring(0, 30)}..." recebeu um voto!`, 'fa-arrow-up');
            }
        }
        if (type === 'down') post.downvotes++;
    }

    const previousHighlighted = post.highlighted;
    post.highlighted = post.upvotes >= HIGHLIGHT_THRESHOLD;

    if (!previousHighlighted && post.highlighted && typeof createNotification === 'function') {
        createNotification(post.authorUid, `Parabéns! Sua ideia atingiu 50 votos e será levada à coordenação.`, 'fa-star');
        createAnnouncement('milestone', 'Ideia em Alta', `A ideia "${post.title}" alcançou 50 votos e será analisada pela equipe!`);
    }

    savePosts();
    renderPosts();
}

window.scrollToPost = function(id) {
    const el = document.getElementById(`post-${id}`);
    if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Adiciona um efeitinho visual temporário
        const originalBoxShadow = el.style.boxShadow;
        el.style.boxShadow = '0 0 25px var(--primary-medium)';
        setTimeout(() => {
            el.style.boxShadow = originalBoxShadow;
        }, 1500);
    }
}

let postToReportId = null;

window.reportPost = function(id) {
    if (!currentUser) {
        showAuthModal();
        return;
    }
    postToReportId = id;
    document.getElementById('report-modal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

window.closeReportModal = function() {
    document.getElementById('report-modal').classList.remove('active');
    document.body.style.overflow = 'auto';
    postToReportId = null;
    document.getElementById('report-form').reset();
}

document.getElementById('report-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const reason = document.getElementById('report-reason').value.trim();
    if (reason && postToReportId) {
        const post = posts.find(p => p.id === postToReportId);
        if (post) {
            if (!post.reports) post.reports = [];
            // Prevent duplicate reports from same user
            const alreadyReported = post.reports.some(r => r.by === currentUser.uid);
            if (alreadyReported) {
                closeReportModal();
                showToast("Aviso", "Você já denunciou este post anteriormente.", "info");
                return;
            }
            post.reports.push({ reason, by: currentUser.uid, date: new Date().toISOString() });
            savePosts();
        }
        closeReportModal();
        showToast("Reportado", "A denúncia foi enviada para a moderação escolar. Obrigado por ajudar a manter a comunidade segura.", "success");
    }
});

// Comments Logic
window.toggleCommentsSection = function(postId) {
    const section = document.getElementById(`comments-section-${postId}`);
    if (section.style.display === 'none') {
        section.style.display = 'block';
        renderComments(postId);
    } else {
        section.style.display = 'none';
    }
}

window.renderComments = function(postId) {
    const post = posts.find(p => p.id === postId);
    const listEl = document.getElementById(`comments-list-${postId}`);
    const sortVal = document.getElementById(`comment-sort-${postId}`).value;
    listEl.innerHTML = '';

    let sortedComments = [...post.comments];
    
    // Sort logic
    if (sortVal === 'recent') {
        sortedComments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else if (sortVal === 'oldest') {
        sortedComments.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    } else if (sortVal === 'liked') {
        sortedComments.sort((a, b) => (b.likes || 0) - (a.likes || 0));
    }

    // Always put pinned comment at the very top independently of sort
    if (post.pinnedCommentId) {
        const pinnedIndex = sortedComments.findIndex(c => c.id === post.pinnedCommentId);
        if (pinnedIndex !== -1) {
            const pinnedComment = sortedComments.splice(pinnedIndex, 1)[0];
            sortedComments.unshift(pinnedComment);
        }
    }

    sortedComments.forEach(comment => {
        const isPinned = comment.id === post.pinnedCommentId;
        const isPostAuthor = currentUser && post.authorUid === currentUser.uid;
        const pinActionDisplay = isPostAuthor ? '' : 'display: none;';
        
        const hasLiked = comment.likedBy && currentUser && comment.likedBy.includes(currentUser.uid);
        const heartIcon = hasLiked ? 'fa-solid fa-heart' : 'fa-regular fa-heart';
        const heartStyle = hasLiked ? 'color: var(--downvote-color); filter: drop-shadow(0 0 5px rgba(239,68,68,0.5));' : '';
        
        const dateStr = new Date(comment.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour:'2-digit', minute:'2-digit' });

        const html = `
            <div class="comment-node">
                <div class="comment-avatar"><i class="fa-solid fa-user"></i></div>
                <div class="comment-body ${isPinned ? 'pinned' : ''}">
                    <div class="comment-author-row">
                        <span>
                            <span class="comment-author">${comment.author}</span>
                            ${comment.role === 'professor' || (comment.authorMeta && comment.authorMeta.includes('Professor')) ? `<span class="teacher-badge-small"><i class="fa-solid fa-graduation-cap"></i> PROFESSOR</span>` : ''}
                            ${isPinned ? '<span class="pinned-badge"><i class="fa-solid fa-thumbtack"></i> Fixado</span>' : ''}
                        </span>
                        <span class="comment-date">${dateStr}</span>
                    </div>
                    <div class="comment-text">${comment.text}</div>
                    <div class="comment-actions">
                        <button class="comment-action-btn" style="${heartStyle}" onclick="likeComment('${postId}', '${comment.id}')"><i class="${heartIcon}"></i> ${comment.likes || 0}</button>
                        <button class="comment-action-btn" style="${pinActionDisplay}" onclick="pinComment('${postId}', '${comment.id}')">
                            <i class="fa-solid fa-thumbtack"></i> ${isPinned ? 'Desfixar' : 'Fixar'}
                        </button>
                    </div>
                </div>
            </div>
        `;
        listEl.innerHTML += html;
    });
}

window.addComment = function(e, postId) {
    e.preventDefault();
    if (!currentUser) {
        showAuthModal();
        return;
    }

    const input = document.getElementById(`comment-input-${postId}`);
    const text = input.value.trim();

    if (containsBadWords(text)) {
        showToast("Aviso", "Seu comentário contém palavras impróprias. Por favor, seja respeitoso.", "error");
        return;
    }

    const post = posts.find(p => p.id === postId);
    const newComment = {
        id: 'c_' + Date.now(),
        authorUid: currentUser.uid,
        author: currentUser.name,
        authorMeta: currentUser.role === 'professor' ? 'Professor' : '', // Fallback for old check logic
        role: currentUser.role,
        text: text,
        createdAt: new Date().toISOString(),
        likes: 0
    };

    post.comments.push(newComment);
    
    if (post.authorUid !== currentUser.uid && typeof createNotification === 'function') {
        const textPreview = text.length > 20 ? text.substring(0, 20) + '...' : text;
        createNotification(post.authorUid, `${currentUser.name} comentou: "${textPreview}"`, 'fa-comment');
    }
    
    if ((currentUser.role === 'professor' || currentUser.course === 'Professor/Direção') && typeof createAnnouncement === 'function') {
        createAnnouncement('official', 'Resposta Oficial', `A coordenação respondeu à ideia "${post.title}".`);
    }

    savePosts();
    input.value = '';

    // Re-render the post list to update comment counter, then re-open comments
    renderPosts();
    toggleCommentsSection(postId);
}

window.likeComment = function(postId, commentId) {
    if (!currentUser) {
        showAuthModal();
        return;
    }
    const post = posts.find(p => p.id === postId);
    const comment = post.comments.find(c => c.id === commentId);
    if(comment) {
        if (!comment.likedBy) comment.likedBy = [];
        const index = comment.likedBy.indexOf(currentUser.uid);

        if (index > -1) {
            // Already liked -> Unlike
            comment.likedBy.splice(index, 1);
            comment.likes = Math.max(0, (comment.likes || 1) - 1);
        } else {
            // Like
            comment.likedBy.push(currentUser.uid);
            comment.likes = (comment.likes || 0) + 1;
        }

        savePosts();
        renderComments(postId);
    }
}

window.pinComment = function(postId, commentId) {
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    // Toggle Pin
    if (post.pinnedCommentId === commentId) {
        post.pinnedCommentId = null;
    } else {
        post.pinnedCommentId = commentId;
    }
    savePosts();
    renderComments(postId);
}

// Post Creation Modal
function openModal() {
    if (!currentUser) {
        showAuthModal();
        return;
    }
    document.getElementById('post-modal-title').textContent = 'Criar nova postagem';
    editingPostId = null;
    postModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}
function closeModal() {
    postModal.classList.remove('active');
    document.body.style.overflow = 'auto';
    postForm.reset();
    editingPostId = null;
}

openModalBtn.addEventListener('click', openModal);
closeModalBtn.addEventListener('click', closeModal);
cancelPostBtn.addEventListener('click', closeModal);
postModal.addEventListener('click', (e) => {
    if (e.target === postModal) closeModal();
});

postForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const title = document.getElementById('post-title').value.trim();
    const desc = document.getElementById('post-desc').value.trim();

    if (containsBadWords(title) || containsBadWords(desc)) {
        showToast("Aviso", "Sua postagem contém palavras impróprias. Por favor, reescreva de forma respeitosa.", "error");
        return;
    }

    if (title && desc && currentUser) {
        if (typeof editingPostId !== 'undefined' && editingPostId !== null) {
            // Edição
            const post = posts.find(p => p.id === editingPostId);
            if (post) {
                post.title = title;
                post.description = desc;
                savePosts();
                renderPosts();
                closeModal();
                showToast("Sucesso", "Ideia atualizada com sucesso!", "success");
            }
        } else {
            // Criação
            const isProf = currentUser.role === 'professor';
            const courseMeta = isProf ? 'Professor/Direção' : currentUser.course;
            const classMeta = isProf ? 'Professor' : currentUser.className;

            const authorMetaStr = courseMeta === 'Ensino Regular (Sem Curso)'
                ? classMeta
                : `${classMeta} | ${courseMeta}`;

            const newPost = {
                id: Date.now().toString(),
                title: title,
                description: desc,
                upvotes: 1,
                downvotes: 0,
                createdAt: new Date().toISOString(),
                author: currentUser.name,
                authorUid: currentUser.uid,
                authorMeta: authorMetaStr,
                role: currentUser.role,
                highlighted: false,
                userVotes: {
                    [currentUser.uid]: 'up' // auto upvote own post
                },
                comments: [],
                pinnedCommentId: null
            };

            posts.unshift(newPost);
            savePosts();

            const newSortBtn = document.querySelector('[data-sort="new"]');
            if (newSortBtn) newSortBtn.click();
            else renderPosts();
            
            closeModal();
            showToast("Sucesso", "Ideia postada com sucesso!", "success");
        }
    }
});

// Filtering
filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentSort = btn.dataset.sort;
        renderPosts();
    });
});

// Toast Notification
window.showToast = function(title, message, type='info') {
    const toast = document.createElement('div');
    toast.className = 'toast';
    
    let icon = 'fa-paper-plane';
    if(type === 'error') icon = 'fa-triangle-exclamation';
    if(type === 'success') icon = 'fa-check-circle';

    toast.innerHTML = `
        <i class="fa-solid ${icon} toast-icon" style="${type === 'error' ? 'color: var(--downvote-color);' : ''}"></i>
        <div class="toast-content">
            <h4 style="${type === 'error' ? 'color: var(--downvote-color);' : ''}">${title}</h4>
            <p>${message}</p>
        </div>
    `;

    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('hide');
        setTimeout(() => toast.remove(), 400);
    }, 6000);
}

function showHighlightToast(title) {
    showToast('Ideia em Destaque!', `A ideia "${title}" atingiu ${HIGHLIGHT_THRESHOLD} votos e foi enviada para a coordenação!`);
}

// Initial Boostrap
updateAuthUI();
renderPosts();

// --- Notifications & Announcements ---
function saveNotifications() {
    if (currentUser) {
        localStorage.setItem(NOTIFICATIONS_KEY + '_' + currentUser.uid, JSON.stringify(userNotifications));
    }
}
function saveAnnouncements() {
    localStorage.setItem(ANNOUNCEMENTS_KEY, JSON.stringify(announcements));
}

window.createNotification = function(targetUid, text, iconClass) {
    if (!targetUid) return;
    const notifs = JSON.parse(localStorage.getItem(NOTIFICATIONS_KEY + '_' + targetUid)) || [];
    notifs.unshift({
        id: 'n_' + Date.now() + Math.random().toString(36).substr(2, 5),
        text: text,
        icon: iconClass,
        read: false,
        date: new Date().toISOString()
    });
    if (notifs.length > 20) notifs.pop();
    
    localStorage.setItem(NOTIFICATIONS_KEY + '_' + targetUid, JSON.stringify(notifs));
    
    if (currentUser && currentUser.uid === targetUid) {
        userNotifications = notifs;
        renderNotificationsUI();
    }
}

window.createAnnouncement = function(type, title, text) {
    announcements.unshift({
        id: 'a_' + Date.now(),
        type: type,
        title: title,
        text: text,
        date: new Date().toISOString()
    });
    if (announcements.length > 5) announcements.pop();
    saveAnnouncements();
    renderAnnouncements();
}

window.toggleNotificationDropdown = function(e) {
    e.stopPropagation();
    document.querySelectorAll('.dropdown-content').forEach(el => {
        if(el.id !== 'notification-dropdown') el.classList.remove('show');
    });
    const dropdown = document.getElementById('notification-dropdown');
    dropdown.classList.toggle('show');
    if (dropdown.classList.contains('show')) {
        renderNotificationsList();
    }
}

window.renderNotificationsUI = function() {
    const bellContainer = document.getElementById('notification-bell-container');
    const badge = document.getElementById('notification-badge');
    if (!currentUser) {
        bellContainer.style.display = 'none';
        return;
    }
    bellContainer.style.display = 'block';
    
    const unreadCount = userNotifications.filter(n => !n.read).length;
    if (unreadCount > 0) {
        badge.style.display = 'flex';
        badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
    } else {
        badge.style.display = 'none';
    }
}

window.renderNotificationsList = function() {
    const listEl = document.getElementById('notification-list');
    listEl.innerHTML = '';
    
    if (userNotifications.length === 0) {
        listEl.innerHTML = '<li style="padding: 1.5rem 1rem; text-align: center; color: var(--text-muted); font-size: 0.9rem;">Nenhuma notificação no momento.</li>';
        return;
    }
    
    userNotifications.forEach(n => {
        const dateStr = new Date(n.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour:'2-digit', minute:'2-digit' });
        listEl.innerHTML += `
            <li class="notification-item ${n.read ? '' : 'unread'}" onclick="markNotificationRead('${n.id}')">
                <div class="notification-icon"><i class="fa-solid ${n.icon}"></i></div>
                <div class="notification-content">
                    <p>${n.text}</p>
                    <span>${dateStr}</span>
                </div>
            </li>
        `;
    });
}

window.markNotificationRead = function(id) {
    const notif = userNotifications.find(n => n.id === id);
    if (notif && !notif.read) {
        notif.read = true;
        saveNotifications();
        renderNotificationsUI();
        renderNotificationsList();
    }
}

window.markAllNotificationsRead = function() {
    userNotifications.forEach(n => n.read = true);
    saveNotifications();
    renderNotificationsUI();
    renderNotificationsList();
}

window.renderAnnouncements = function() {
    const listEl = document.getElementById('announcements-list');
    if (!listEl) return;
    listEl.innerHTML = '';
    
    if (announcements.length === 0) {
        listEl.innerHTML = '<li style="padding: 1rem; text-align: center; color: var(--text-muted); font-size: 0.9rem;">Nenhum aviso no momento.</li>';
        return;
    }
    
    const displayAnnouncements = announcements.slice(0, 3);
    
    displayAnnouncements.forEach(a => {
        const typeClass = a.type === 'official' ? 'announcement-type-official' : 'announcement-type-milestone';
        const icon = a.type === 'official' ? '<i class="fa-solid fa-circle-check"></i>' : '<i class="fa-solid fa-fire"></i>';
        
        listEl.innerHTML += `
            <li class="announcement-item">
                <div class="announcement-header ${typeClass}">
                    <span>${icon} ${a.title}</span>
                </div>
                <div class="announcement-text">${a.text}</div>
            </li>
        `;
    });
}

// Executar após boostrap
renderAnnouncements();
if (currentUser) renderNotificationsUI();

