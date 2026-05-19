/**
 * Voz do Aluno - Admin Logic
 */

const STORAGE_KEY        = 'voz_do_aluno_posts';
const USER_KEY           = 'voz_do_aluno_user';
const ANNOUNCEMENTS_KEY  = 'voz_do_aluno_announcements';
const USERS_LIST_KEY     = 'voz_do_aluno_users_list';
const BANNED_USERS_KEY   = 'voz_do_aluno_banned_users';

let posts         = JSON.parse(localStorage.getItem(STORAGE_KEY))         || [];
let currentUser   = JSON.parse(localStorage.getItem(USER_KEY));
let announcements = JSON.parse(localStorage.getItem(ANNOUNCEMENTS_KEY))   || [];
let usersList     = JSON.parse(localStorage.getItem(USERS_LIST_KEY))      || [];
let bannedUsers   = JSON.parse(localStorage.getItem(BANNED_USERS_KEY))    || [];

// ─── Auth Guard ───────────────────────────────────────────────────────────────
if (!currentUser || currentUser.role !== 'professor') {
    window.location.href = 'index.html';
}

document.getElementById('user-profile-container').innerHTML = `
    <div style="text-align: right; margin-right: 8px;">
        <div style="font-weight: 700; color: var(--text-main); font-size: 0.95rem;">${currentUser.name}</div>
        <div style="font-size: 0.8rem; color: var(--primary-medium); font-weight: 600;">Direção/Coordenação</div>
    </div>
`;

// ─── Toast ────────────────────────────────────────────────────────────────────
function showToast(title, message, type = 'info') {
    const toastContainer = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    let icon  = 'fa-info-circle';
    let color = 'var(--primary-medium)';
    if (type === 'success') { icon = 'fa-check-circle';  color = 'var(--upvote-color)';   }
    if (type === 'error')   { icon = 'fa-circle-xmark';  color = 'var(--downvote-color)'; }

    toast.innerHTML = `
        <i class="fa-solid ${icon} toast-icon" style="color: ${color};"></i>
        <div class="toast-content">
            <h4 style="color: ${color};">${title}</h4>
            <p>${message}</p>
        </div>
    `;
    toastContainer.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('hide');
        setTimeout(() => toast.remove(), 400);
    }, 4000);
}

// ─── Navigation ───────────────────────────────────────────────────────────────
const menuBtns = document.querySelectorAll('.admin-menu-btn');
const views    = document.querySelectorAll('.view-section');

menuBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        menuBtns.forEach(b => b.classList.remove('active'));
        views.forEach(v => v.classList.remove('active'));

        btn.classList.add('active');
        document.getElementById(btn.dataset.view).classList.add('active');

        // Re-render the active view's data when switching to it
        if (btn.dataset.view === 'users-view')   renderUsers();
        if (btn.dataset.view === 'highlight-view') renderHighlights();
        if (btn.dataset.view === 'reports-view') renderReports();
    });
});

// ─── Persist helpers ──────────────────────────────────────────────────────────
function savePosts()         { localStorage.setItem(STORAGE_KEY,       JSON.stringify(posts));        updateDashboard(); }
function saveAnnouncements() { localStorage.setItem(ANNOUNCEMENTS_KEY, JSON.stringify(announcements)); }
function saveBannedUsers()   { localStorage.setItem(BANNED_USERS_KEY,  JSON.stringify(bannedUsers));  }

// ─── Dashboard ────────────────────────────────────────────────────────────────
function updateDashboard() {
    document.getElementById('stat-total-ideias').textContent = posts.length;

    const destaques   = posts.filter(p => (p.upvotes - p.downvotes) >= 50).length;
    document.getElementById('stat-destaques').textContent = destaques;

    const denunciados = posts.filter(p => p.reports && p.reports.length > 0).length;
    document.getElementById('stat-denuncias').textContent = denunciados;

    renderHighlights();
    renderReports();
    renderAnnouncements();
    renderCharts();
}

let coursesChartInstance = null;
let statusChartInstance = null;

function renderCharts() {
    const coursesCanvas = document.getElementById('coursesChart');
    const statusCanvas = document.getElementById('statusChart');
    if (!coursesCanvas || !statusCanvas || typeof Chart === 'undefined') return;

    // Count by course
    const courseCount = {};
    posts.forEach(p => {
        let meta = p.authorMeta || 'Outros';
        if (meta.includes('|')) {
            meta = meta.split('|')[1].trim();
        }
        if (meta === 'Professor/Direção' || meta === 'Professor' || meta === 'Aluno' || meta === 'Ensino Regular (Sem Curso)') meta = 'Ensino Regular';
        courseCount[meta] = (courseCount[meta] || 0) + 1;
    });

    // Count by Status (>50 votes)
    const statusCount = { 'Aguardando': 0, 'Em Análise': 0, 'Aprovada': 0, 'Rejeitada': 0, 'Concluída': 0 };
    posts.forEach(p => {
        if ((p.upvotes - p.downvotes) >= 50) {
            if (!p.status || p.status === 'none') statusCount['Aguardando']++;
            else if (p.status === 'analysis') statusCount['Em Análise']++;
            else if (p.status === 'approved') statusCount['Aprovada']++;
            else if (p.status === 'rejected') statusCount['Rejeitada']++;
            else if (p.status === 'done') statusCount['Concluída']++;
        }
    });

    if (coursesChartInstance) coursesChartInstance.destroy();
    coursesChartInstance = new Chart(coursesCanvas, {
        type: 'pie',
        data: {
            labels: Object.keys(courseCount),
            datasets: [{
                data: Object.values(courseCount),
                backgroundColor: ['#D946EF', '#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#64748B']
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: '#94a3b8' } } } }
    });

    if (statusChartInstance) statusChartInstance.destroy();
    statusChartInstance = new Chart(statusCanvas, {
        type: 'bar',
        data: {
            labels: Object.keys(statusCount),
            datasets: [{
                label: 'Ideias',
                data: Object.values(statusCount),
                backgroundColor: ['#64748B', '#F59E0B', '#10B981', '#EF4444', '#3B82F6']
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { color: '#94a3b8', stepSize: 1 } }, x: { ticks: { color: '#94a3b8' } } }, plugins: { legend: { display: false } } }
    });
}

// ─── Highlights ───────────────────────────────────────────────────────────────
let replyPostId = null;

function renderHighlights() {
    const tbody      = document.getElementById('highlight-tbody');
    const searchTerm = (document.getElementById('highlight-search')?.value || '').toLowerCase().trim();

    tbody.innerHTML = '';

    let highlighted = posts.filter(p => (p.upvotes - p.downvotes) >= 50);

    if (searchTerm) {
        highlighted = highlighted.filter(p =>
            p.title.toLowerCase().includes(searchTerm)   ||
            p.author.toLowerCase().includes(searchTerm)  ||
            p.description.toLowerCase().includes(searchTerm)
        );
    }

    if (highlighted.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-muted); padding:2rem;">
            ${searchTerm ? 'Nenhuma ideia encontrada para esta busca.' : 'Nenhuma ideia em destaque no momento.'}
        </td></tr>`;
        return;
    }

    highlighted.forEach(post => {
        const hasOfficialReply = post.pinnedCommentId &&
            post.comments.find(c => c.id === post.pinnedCommentId && c.authorUid === currentUser.uid);

        let statusLabel = '';
        if (post.status && post.status !== 'none') {
            const map = { analysis: 'Em Análise', approved: 'Aprovada', rejected: 'Rejeitada', done: 'Concluída' };
            const cls = { analysis: 'status-analysis', approved: 'status-approved', rejected: 'status-rejected', done: 'status-done' };
            statusLabel = `<span class="status-badge ${cls[post.status] || ''}">${map[post.status] || ''}</span>`;
        }

        tbody.innerHTML += `
            <tr>
                <td>
                    <div style="font-weight:700; margin-bottom:4px;">${post.title} ${statusLabel}</div>
                    <div style="font-size:0.85rem; color:var(--text-muted);">${post.description.substring(0, 60)}…</div>
                </td>
                <td>${post.author}</td>
                <td><span style="color:var(--upvote-color); font-weight:800;">+${post.upvotes - post.downvotes}</span></td>
                <td>
                    ${hasOfficialReply
                        ? `<span style="color:var(--primary-medium); font-size:0.85rem; font-weight:700;"><i class="fa-solid fa-check"></i> Respondido</span>`
                        : `<button class="btn btn-primary" style="padding:0.4rem 0.8rem; font-size:0.85rem;" onclick="openReplyModal('${post.id}')">Responder</button>`
                    }
                </td>
            </tr>
        `;
    });
}

// Search listener for highlights
document.getElementById('highlight-search')?.addEventListener('input', renderHighlights);

window.exportHighlightsCSV = function() {
    const highlighted = posts.filter(p => (p.upvotes - p.downvotes) >= 50);
    if (highlighted.length === 0) {
        showToast('Aviso', 'Não há ideias em destaque para exportar.', 'error');
        return;
    }
    
    let csvContent = "data:text/csv;charset=utf-8,%EF%BB%BF"; // with BOM for Excel UTF-8
    csvContent += "Titulo;Autor;Votos;Status;Data\n"; // semicolon for Excel pt-br
    
    highlighted.forEach(p => {
        const title = p.title.replace(/;/g, ",").replace(/\n/g, " ");
        const author = p.author.replace(/;/g, ",");
        const votes = p.upvotes - p.downvotes;
        const status = p.status || 'none';
        const date = new Date(p.createdAt).toLocaleDateString('pt-BR');
        csvContent += `${title};${author};${votes};${status};${date}\n`;
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "ideias_aprovadas.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Sucesso', 'Download do relatório iniciado!', 'success');
}

// ─── Reply Modal ──────────────────────────────────────────────────────────────
window.openReplyModal = function(id) {
    replyPostId = id;
    document.getElementById('reply-status').value = 'none';
    document.getElementById('reply-modal').classList.add('active');
}
window.closeReplyModal = function() {
    replyPostId = null;
    document.getElementById('reply-modal').classList.remove('active');
    document.getElementById('reply-form').reset();
}

document.getElementById('reply-form').addEventListener('submit', (e) => {
    e.preventDefault();
    if (!replyPostId) return;

    const text   = document.getElementById('reply-text').value.trim();
    const status = document.getElementById('reply-status').value;
    const post   = posts.find(p => p.id === replyPostId);

    if (post && text) {
        const commentId = 'c_' + Date.now();
        post.comments.push({
            id: commentId,
            authorUid: currentUser.uid,
            author: currentUser.name,
            role: 'professor',
            text: text,
            createdAt: new Date().toISOString(),
            likes: 0
        });
        post.pinnedCommentId = commentId;

        // Apply status if chosen
        if (status && status !== 'none') {
            post.status = status;
        }

        savePosts();
        closeReplyModal();
        showToast('Sucesso', 'Resposta oficial fixada na ideia!', 'success');
    }
});

// ─── Reports ──────────────────────────────────────────────────────────────────
function renderReports() {
    const tbody      = document.getElementById('reports-tbody');
    const searchTerm = (document.getElementById('report-search')?.value || '').toLowerCase().trim();

    tbody.innerHTML = '';

    let reported = posts.filter(p => p.reports && p.reports.length > 0);

    if (searchTerm) {
        reported = reported.filter(p =>
            p.title.toLowerCase().includes(searchTerm)  ||
            p.author.toLowerCase().includes(searchTerm) ||
            p.description.toLowerCase().includes(searchTerm) ||
            p.reports.some(r => r.reason.toLowerCase().includes(searchTerm))
        );
    }

    if (reported.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:var(--text-muted); padding:2rem;">
            ${searchTerm ? 'Nenhuma denúncia encontrada para esta busca.' : 'Nenhuma denúncia no momento. Ótimo!'}
        </td></tr>`;
        return;
    }

    reported.forEach(post => {
        const reasonsHtml = post.reports.map(r => `<span class="report-reason-badge">${r.reason}</span>`).join(' ');

        tbody.innerHTML += `
            <tr>
                <td>
                    <div style="font-weight:700; margin-bottom:4px;">${post.title}</div>
                    <div style="font-size:0.85rem; color:var(--text-muted);">${post.description.substring(0, 100)}…</div>
                    <div style="font-size:0.75rem; margin-top:8px;">Por: ${post.author}</div>
                </td>
                <td>${reasonsHtml}</td>
                <td>
                    <div style="display:flex; gap:8px; flex-direction:column;">
                        <button class="btn btn-outline" style="padding:0.4rem; font-size:0.8rem;"
                            onclick="ignoreReports('${post.id}')">Ignorar Denúncia</button>
                        <button class="btn" style="padding:0.4rem; font-size:0.8rem;
                            background-color:rgba(239,68,68,0.2); color:var(--downvote-color);"
                            onclick="deleteReportedPost('${post.id}')">
                            <i class="fa-solid fa-trash"></i> Excluir Post
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
}

// Search listener for reports
document.getElementById('report-search')?.addEventListener('input', renderReports);

window.ignoreReports = function(id) {
    const post = posts.find(p => p.id === id);
    if (post) {
        post.reports = [];
        savePosts();
        showToast('Ignorado', 'As denúncias deste post foram descartadas.', 'info');
    }
}

window.deleteReportedPost = function(id) {
    if (confirm('Tem certeza que deseja excluir esta postagem permanentemente?')) {
        posts = posts.filter(p => p.id !== id);
        savePosts();
        showToast('Excluído', 'Postagem removida do sistema.', 'success');
    }
}

// ─── Announcements ────────────────────────────────────────────────────────────
function renderAnnouncements() {
    const container = document.getElementById('active-announcements');
    container.innerHTML = '';

    if (announcements.length === 0) {
        container.innerHTML = `<p style="color:var(--text-muted);">Nenhum aviso ativo.</p>`;
        return;
    }

    announcements.forEach(ann => {
        const dateStr = new Date(ann.date).toLocaleDateString('pt-BR');
        container.innerHTML += `
            <div style="border:1px solid var(--border); border-radius:var(--radius-md); padding:1rem;
                        display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <div style="font-weight:700; color:var(--text-main); margin-bottom:4px;">${ann.title}</div>
                    <div style="font-size:0.85rem; color:var(--text-muted);">${ann.text}</div>
                    <div style="font-size:0.75rem; color:var(--primary-medium); margin-top:4px;">${dateStr}</div>
                </div>
                <div style="display: flex;">
                    <button class="btn btn-outline" style="padding:0.4rem 0.8rem; margin-right: 5px;"
                        onclick="editAnnouncement('${ann.id}')">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                    <button class="btn btn-outline" style="padding:0.4rem 0.8rem;"
                        onclick="deleteAnnouncement('${ann.id}')">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    });
}

let editingAnnId = null;

document.getElementById('announcement-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const title = document.getElementById('ann-title').value.trim();
    const text  = document.getElementById('ann-desc').value.trim();
    const type  = document.getElementById('ann-type').value;

    if (title && text) {
        if (editingAnnId) {
            const ann = announcements.find(a => a.id === editingAnnId);
            if (ann) {
                ann.title = title;
                ann.text = text;
                ann.type = type;
            }
            editingAnnId = null;
        } else {
            announcements.unshift({
                id:    'a_' + Date.now(),
                type:  type,
                title: title,
                text:  text,
                date:  new Date().toISOString()
            });
        }
        saveAnnouncements();
        document.getElementById('announcement-form').reset();
        renderAnnouncements();
        showToast('Sucesso', 'Aviso salvo com sucesso no mural dos alunos.', 'success');
    }
});

window.editAnnouncement = function(id) {
    const ann = announcements.find(a => a.id === id);
    if (ann) {
        document.getElementById('ann-title').value = ann.title;
        document.getElementById('ann-desc').value = ann.text;
        document.getElementById('ann-type').value = ann.type;
        editingAnnId = id;
        document.getElementById('announcement-form').scrollIntoView({behavior: 'smooth'});
    }
}

window.deleteAnnouncement = function(id) {
    if (confirm('Deseja remover este aviso?')) {
        announcements = announcements.filter(a => a.id !== id);
        saveAnnouncements();
        renderAnnouncements();
    }
}

// ─── Users Management ─────────────────────────────────────────────────────────
function renderUsers(customList) {
    const tbody      = document.getElementById('users-tbody');
    const searchTerm = (document.getElementById('user-search')?.value || '').toLowerCase().trim();

    tbody.innerHTML = '';

    // Re-read fresh data
    usersList    = JSON.parse(localStorage.getItem(USERS_LIST_KEY))   || [];
    bannedUsers  = JSON.parse(localStorage.getItem(BANNED_USERS_KEY)) || [];

    let list = customList || usersList;

    if (searchTerm) {
        list = list.filter(u =>
            u.name.toLowerCase().includes(searchTerm) ||
            u.email.toLowerCase().includes(searchTerm)
        );
    }

    if (list.length === 0) {
        tbody.innerHTML = `
            <tr><td colspan="5" style="text-align:center; color:var(--text-muted); padding:2rem;">
                ${searchTerm ? 'Nenhum usuário encontrado para esta busca.' : 'Nenhum aluno cadastrado ainda.'}
            </td></tr>`;
        return;
    }

    list.forEach(user => {
        const isBanned  = bannedUsers.includes(user.email);
        const isAdmin   = user.role === 'professor';
        const roleLabel = isAdmin
            ? `<span style="color:var(--highlight); font-weight:700;"><i class="fa-solid fa-shield-halved"></i> Admin</span>`
            : `<span style="color:var(--primary-medium); font-weight:600;"><i class="fa-solid fa-user-graduate"></i> Aluno</span>`;

        const statusLabel = isBanned
            ? `<span class="status-badge status-rejected"><i class="fa-solid fa-volume-xmark"></i> Silenciado</span>`
            : `<span class="status-badge status-approved"><i class="fa-solid fa-circle-check"></i> Ativo</span>`;

        const actionBtn = isAdmin
            ? `<span style="color:var(--text-muted); font-size:0.85rem;">—</span>`
            : isBanned
                ? `<button class="btn btn-outline" style="padding:0.4rem 0.8rem; font-size:0.8rem; color:var(--upvote-color); border-color:var(--upvote-color);"
                    onclick="toggleBanUser('${user.email}')"><i class="fa-solid fa-volume-high"></i> Desmutar</button>`
                : `<button class="btn btn-outline" style="padding:0.4rem 0.8rem; font-size:0.8rem; color:var(--downvote-color); border-color:var(--downvote-color);"
                    onclick="toggleBanUser('${user.email}')"><i class="fa-solid fa-volume-xmark"></i> Silenciar</button>`;

        const courseMeta = [user.className, user.course]
            .filter(v => v && v !== 'Ensino Regular (Sem Curso)' && v !== 'Professor/Direção' && v !== 'Professor' && v !== 'Aluno')
            .join(' | ') || '—';

        tbody.innerHTML += `
            <tr>
                <td>
                    <div style="display:flex; align-items:center; gap:10px;">
                        <div style="width:34px; height:34px; border-radius:50%;
                            background:linear-gradient(135deg, var(--primary-medium), var(--highlight));
                            display:flex; align-items:center; justify-content:center; color:#fff; font-size:0.9rem; flex-shrink:0;">
                            <i class="fa-solid fa-user"></i>
                        </div>
                        <div>
                            <div style="font-weight:700;">${user.name}</div>
                            <div>${roleLabel}</div>
                        </div>
                    </div>
                </td>
                <td style="font-size:0.85rem; color:var(--text-muted);">${user.email}</td>
                <td style="font-size:0.85rem;">${courseMeta}</td>
                <td>${statusLabel}</td>
                <td>${actionBtn}</td>
            </tr>
        `;
    });
}

window.toggleBanUser = function(email) {
    const idx = bannedUsers.indexOf(email);
    if (idx > -1) {
        // Unban
        bannedUsers.splice(idx, 1);
        showToast('Desmutado', `O usuário ${email} voltou a poder interagir.`, 'success');
    } else {
        // Ban
        bannedUsers.push(email);
        showToast('Silenciado', `O usuário ${email} foi silenciado da plataforma.`, 'error');
    }
    saveBannedUsers();
    renderUsers();
}

// Search listener for users
document.getElementById('user-search')?.addEventListener('input', renderUsers);

// ─── Initial Render ───────────────────────────────────────────────────────────
updateDashboard();
