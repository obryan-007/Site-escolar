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
    if(!p.tags) p.tags = [];
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

const editProfileModal = document.getElementById('edit-profile-modal');
const editProfileForm = document.getElementById('edit-profile-form');

window.editProfile = function() {
    if (!currentUser) return;
    document.getElementById('edit-name').value = currentUser.name;
    const courseSelect = document.getElementById('edit-course');
    if (courseSelect) courseSelect.value = currentUser.course || 'Ensino Regular (Sem Curso)';
    document.getElementById('edit-password').value = '';
    
    editProfileModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

window.closeEditProfileModal = function() {
    editProfileModal.classList.remove('active');
    document.body.style.overflow = 'auto';
}

editProfileForm.addEventListener('submit', (e) => {
    e.preventDefault();
    currentUser.name = document.getElementById('edit-name').value;
    currentUser.course = document.getElementById('edit-course').value;
    
    const newPass = document.getElementById('edit-password').value;
    if (newPass && newPass.length >= 6) {
        showToast("Sucesso", "Senha e perfil alterados com sucesso!", "success");
    } else {
        showToast("Sucesso", "Perfil atualizado!", "success");
    }
    
    localStorage.setItem(USER_KEY, JSON.stringify(currentUser));
    
    const authorMetaStr = currentUser.course === 'Ensino Regular (Sem Curso)' 
        ? currentUser.className : `${currentUser.className} | ${currentUser.course}`;
    
    // Altera o nome do autor nos posts antigos dinamicamente
    posts.forEach(p => {
        if (p.authorUid === currentUser.uid) {
            p.author = currentUser.name;
            p.authorMeta = authorMetaStr;
        }
        p.comments.forEach(c => {
            if (c.authorUid === currentUser.uid) {
                c.author = currentUser.name;
            }
        });
    });
    savePosts();
    updateAuthUI();
    renderPosts();
    closeEditProfileModal();
});

window.logout = function () {
    localStorage.removeItem(USER_KEY);
    currentUser = null;
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

registerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('reg-email').value;

    if (!email.includes('@')) {
        showToast('Erro', 'Por favor, insira um e-mail válido.', 'error');
        return;
    }

    const newUser = {
        uid: 'user_' + Date.now().toString(),
        name: document.getElementById('reg-name').value,
        email: email,
        course: document.getElementById('reg-course').value,
        className: document.getElementById('reg-class').value
    };

    localStorage.setItem(USER_KEY, JSON.stringify(newUser));
    currentUser = newUser;
    updateAuthUI();
    renderPosts();
});

loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;

    const mockUser = {
        uid: 'user_' + email, // Mock uid
        name: email.split('@')[0].charAt(0).toUpperCase() + email.split('@')[0].slice(1),
        email: email,
        course: 'Qualquer',
        className: 'Aluno'
    };

    localStorage.setItem(USER_KEY, JSON.stringify(mockUser));
    currentUser = mockUser;
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

    sortedPosts.forEach(post => {
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
        const tagsHtml = post.tags && post.tags.length ? post.tags.map(t => `<span class="tag-badge">${t}</span>`).join('') : '';

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
                        ${post.authorMeta ? `<span style="color: var(--primary-medium); font-weight: 600;">[${post.authorMeta}]</span>` : ''}
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
                <h3 class="post-title">${post.title}</h3>
                <p class="post-desc">${post.description}</p>
                
                ${tagsHtml ? `<div class="tags-container" style="margin-bottom: 1.5rem;">${tagsHtml}</div>` : ''}

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

    renderRanking();
}

window.togglePostDropdown = function(e, id) {
    e.stopPropagation();
    document.querySelectorAll('.dropdown-content').forEach(el => el.classList.remove('show')); // hide others
    document.getElementById(`post-dropdown-${id}`).classList.toggle('show');
}

window.editPost = function(id) {
    alert("Função de edição em desenvolvimento.");
}

window.deletePost = function(id) {
    if(confirm("Tem certeza que deseja excluir esta ideia?")) {
        posts = posts.filter(p => p.id !== id);
        savePosts();
        renderPosts();
        showToast("Excluído", "Seu post foi removido com sucesso.", "success");
    }
}

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
        if (type === 'up') post.upvotes++;
        if (type === 'down') post.downvotes++;
    }

    post.highlighted = post.upvotes >= HIGHLIGHT_THRESHOLD;

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

const reportModal = document.getElementById('report-modal');
const reportForm = document.getElementById('report-form');

window.reportPost = function(id) {
    if (!currentUser) {
        showAuthModal();
        return;
    }
    document.getElementById('report-post-id').value = id;
    reportModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

window.closeReportModal = function() {
    reportModal.classList.remove('active');
    document.body.style.overflow = 'auto';
    reportForm.reset();
}

reportForm.addEventListener('submit', (e) => {
    e.preventDefault();
    closeReportModal();
    showToast("Reportado", "A postagem foi enviada para a moderação escolar. Obrigado por ajudar a manter a comunidade segura.", "success");
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
        text: text,
        createdAt: new Date().toISOString(),
        likes: 0
    };

    post.comments.push(newComment);
    savePosts();
    input.value = '';
    renderComments(postId);

    // Update the counter on the button without full re-render
    renderPosts(); 
    // Wait, renderPosts overrides comments section display, so re-open it
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
    // Tolggle Pin
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
    postModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}
function closeModal() {
    postModal.classList.remove('active');
    document.body.style.overflow = 'auto';
    postForm.reset();
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
    const tagsInput = document.getElementById('post-tags').value.trim();

    if (containsBadWords(title) || containsBadWords(desc) || containsBadWords(tagsInput)) {
        showToast("Aviso", "Sua postagem contém palavras impróprias. Por favor, reescreva de forma respeitosa.", "error");
        return;
    }

    if (title && desc && currentUser) {
        const authorMetaStr = currentUser.course === 'Ensino Regular (Sem Curso)'
            ? currentUser.className
            : `${currentUser.className} | ${currentUser.course}`;

        let parsedTags = [];
        if (tagsInput) {
            parsedTags = tagsInput.split(',').map(t => t.trim()).filter(t => t.length > 0).slice(0, 3);
        }

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
            highlighted: false,
            userVotes: {
                [currentUser.uid]: 'up' // auto upvote own post
            },
            tags: parsedTags,
            comments: [],
            pinnedCommentId: null
        };

        posts.unshift(newPost);
        savePosts();

        document.querySelector('[data-sort="new"]').click();
        closeModal();
        showToast("Sucesso", "Ideia postada com sucesso!", "success");
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
