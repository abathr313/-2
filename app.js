/**
 * Recycling Platform - Main Logic
 * Single Page Application (SPA) Controller
 */

const app = {
    // --- CONSTANTS ---
    MATERIALS: {
        plastic:  { label: "بلاستك",   emoji: "🧴", color: "#3B82F6", bg: "#EFF6FF", border: "#BFDBFE" },
        carton:   { label: "كارتون",   emoji: "📦", color: "#92400E", bg: "#FFFBEB", border: "#FCD34D" },
        oil:      { label: "زيوت",     emoji: "🛢️", color: "#C2410C", bg: "#FFF7ED", border: "#FDBA74" },
        aluminum: { label: "ألمنيوم",  emoji: "⚙️", color: "#4B5563", bg: "#F9FAFB", border: "#D1D5DB" },
    },
    
    STATUS_MAP: {
        pending:   { label: "بانتظار المصنع",    color: "#B45309", bg: "#FFFBEB", dot: "#F59E0B" },
        scheduled: { label: "مجدول للاستلام",    color: "#1D4ED8", bg: "#EFF6FF", dot: "#3B82F6" },
        delivered: { label: "بانتظار تأكيدك",   color: "#7C3AED", bg: "#F5F3FF", dot: "#8B5CF6" },
        confirmed: { label: "تم التأكيد ✓",     color: "#065F46", bg: "#ECFDF5", dot: "#10B981" },
        reported:  { label: "تم الإبلاغ ⚠️",    color: "#B91C1C", bg: "#FEF2F2", dot: "#EF4444" },
    },

    // --- STATE ---
    state: {
        currentPage: 'landing',
        currentUser: null,
        authRole: null, // 'restaurant' or 'factory' or 'admin'
        authMode: 'login', // 'login' or 'register'
        
        users: {
            restaurants: [
                { id: "r1", name: "مطعم الشرق",   email: "r@r.com",  password: "123", phone: "07701111111" },
                { id: "r2", name: "مطعم النخيل",  email: "r2@r.com", password: "123", phone: "07702222222" },
            ],
            factories: [
                { id: "f1", name: "مصنع الخليج للتدوير", email: "f@f.com", password: "123", phone: "07703333333" },
            ]
        },

        shipments: [
            {
                id: "s1", restaurantId: "r1", restaurantName: "مطعم الشرق",
                materialType: "plastic", weight: 80, unit: "kg",
                status: "confirmed", pickupTime: "2026-03-30T10:00",
                actualWeight: 80, restaurantConfirmed: "confirmed",
                photo: null, createdAt: "2026-03-28T08:00",
            },
            {
                id: "s2", restaurantId: "r2", restaurantName: "مطعم النخيل",
                materialType: "aluminum", weight: 45, unit: "kg",
                status: "delivered", pickupTime: "2026-04-01T14:00",
                actualWeight: 40, restaurantConfirmed: null,
                photo: null, createdAt: "2026-03-30T09:00",
            },
            {
                id: "s3", restaurantId: "r1", restaurantName: "مطعم الشرق",
                materialType: "oil", weight: 30, unit: "L",
                status: "scheduled", pickupTime: "2026-04-02T11:00",
                actualWeight: null, restaurantConfirmed: null,
                photo: null, createdAt: "2026-04-01T07:00",
            }
        ],

        // Temp UI states
        selectedMaterial: null,
        selectedUnit: 'kg',
        collectionPhoto: null,
        activeShipmentId: null, // For factory modals
    },

    // --- INITIALIZATION ---
    init() {
        // Load from LocalStorage if exists
        const saved = localStorage.getItem('recycling_app_state');
        if (saved) {
            const parsed = JSON.parse(saved);
            this.state.users = parsed.users;
            this.state.shipments = parsed.shipments;
        }

        this.render();
    },

    save() {
        localStorage.setItem('recycling_app_state', JSON.stringify({
            users: this.state.users,
            shipments: this.state.shipments
        }));
    },

    // --- ROUTING ---
    navigate(pageId) {
        this.state.currentPage = pageId;
        document.querySelectorAll('.page-container').forEach(el => el.classList.remove('active'));
        
        let targetId = "";
        if (pageId === 'landing' || pageId === 'auth') {
            targetId = `${pageId}-page`;
        } else {
            targetId = `${pageId}-dashboard`;
        }

        const target = document.getElementById(targetId);
        if (target) target.classList.add('active');
        
        window.scrollTo(0, 0);
        this.render();
    },

    // --- AUTH LOGIC ---
    showAuth(role) {
        this.state.authRole = role;
        this.state.authMode = 'login';
        this.navigate('auth');
        
        // Pre-fill for testing
        const emailField = document.getElementById('auth-email');
        const passField = document.getElementById('auth-pass');
        if (role === 'restaurant') {
            emailField.value = "r@r.com";
            passField.value = "123";
        } else if (role === 'factory') {
            emailField.value = "f@f.com";
            passField.value = "123";
        }
    },

    showAdminLogin() {
        this.state.authRole = 'admin';
        this.state.authMode = 'login';
        this.navigate('auth');
        
        // Pre-fill for admin
        document.getElementById('auth-email').value = "admin@admin.com";
        document.getElementById('auth-pass').value = "admin";
    },

    setAuthMode(mode) {
        this.state.authMode = mode;
        this.render();
    },

    handleAuth(e) {
        e.preventDefault();
        const email = document.getElementById('auth-email').value;
        const pass = document.getElementById('auth-pass').value;
        const name = document.getElementById('reg-name').value;
        const phone = document.getElementById('reg-phone').value;
        const errEl = document.getElementById('auth-error');

        errEl.style.display = 'none';

        if (this.state.authRole === 'admin') {
            if (email === 'admin@admin.com' && pass === 'admin') {
                this.state.currentUser = { id: 'admin', name: 'الإدارة', type: 'admin' };
                this.navigate('admin');
                return;
            }
        }

        const pool = this.state.authRole === 'restaurant' ? this.state.users.restaurants : this.state.users.factories;

        if (this.state.authMode === 'login') {
            const user = pool.find(u => u.email === email && u.password === pass);
            if (user) {
                this.state.currentUser = { ...user, type: this.state.authRole };
                this.navigate(this.state.authRole);
            } else {
                errEl.style.display = 'block';
            }
        } else {
            // Register
            if (!name || !email || !pass) {
                errEl.innerText = "يرجى تعبئة جميع الحقول";
                errEl.style.display = 'block';
                return;
            }
            const newUser = { id: 'u' + Date.now(), name, email, password: pass, phone };
            if (this.state.authRole === 'restaurant') this.state.users.restaurants.push(newUser);
            else this.state.users.factories.push(newUser);
            
            this.state.currentUser = { ...newUser, type: this.state.authRole };
            this.save();
            this.navigate(this.state.authRole);
        }
    },

    logout() {
        this.state.currentUser = null;
        this.navigate('landing');
    },

    // --- RESTAURANT ACTIONS ---
    openCollectionModal() {
        this.state.selectedMaterial = null;
        this.state.selectedUnit = 'kg';
        this.state.collectionPhoto = null;
        this.setCollectStep(1);
        this.showModal('modal-collect');
    },

    setCollectStep(step) {
        document.getElementById('col-step-1').style.display = step === 1 ? 'grid' : 'none';
        document.getElementById('col-step-2').style.display = step === 2 ? 'block' : 'none';
        document.getElementById('modal-collect-title').innerText = step === 1 ? '♻️ اختر نوع المادة' : '📋 تفاصيل الشحنة';
    },

    selectMaterial(matKey) {
        this.state.selectedMaterial = matKey;
        const mat = this.MATERIALS[matKey];
        const banner = document.getElementById('selected-mat-banner');
        banner.innerHTML = `
            <div class="ship-icon" style="background: ${mat.bg}; border: 1.5px solid ${mat.border}; color: ${mat.color}">${mat.emoji}</div>
            <div class="ship-details">
                <h4 style="color: ${mat.color}">${mat.label}</h4>
                <p>تم اختيار المادة</p>
            </div>
        `;
        this.setCollectStep(2);
    },

    setUnit(unit) {
        this.state.selectedUnit = unit;
        document.getElementById('unit-kg').classList.toggle('active', unit === 'kg');
        document.getElementById('unit-L').classList.toggle('active', unit === 'L');
    },

    handleFile(input) {
        const file = input.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                this.state.collectionPhoto = e.target.result;
                document.getElementById('photo-preview-img').src = e.target.result;
                document.getElementById('photo-preview-img').style.display = 'block';
                document.getElementById('photo-preview-placeholder').style.display = 'none';
            };
            reader.readAsDataURL(file);
        }
    },

    submitCollection() {
        const weight = document.getElementById('col-weight').value;
        if (!weight) return;

        const newShipment = {
            id: 's' + Date.now(),
            restaurantId: this.state.currentUser.id,
            restaurantName: this.state.currentUser.name,
            materialType: this.state.selectedMaterial,
            weight: parseFloat(weight),
            unit: this.state.selectedUnit,
            status: "pending",
            pickupTime: null,
            actualWeight: null,
            restaurantConfirmed: null,
            photo: this.state.collectionPhoto,
            createdAt: new Date().toISOString()
        };

        this.state.shipments.unshift(newShipment);
        this.save();
        this.closeModal('modal-collect');
        this.render();
    },

    respondToWeight(id, response) {
        const ship = this.state.shipments.find(s => s.id === id);
        if (ship) {
            ship.restaurantConfirmed = response;
            ship.status = response === 'confirmed' ? 'confirmed' : 'reported';
            this.save();
            this.render();
        }
    },

    // --- FACTORY ACTIONS ---
    openPickupModal(id) {
        this.state.activeShipmentId = id;
        const ship = this.state.shipments.find(s => s.id === id);
        const mat = this.MATERIALS[ship.materialType];
        document.getElementById('pickup-ship-info').innerHTML = `
            <p><strong>${ship.restaurantName}</strong></p>
            <p style="font-size: 0.8rem; margin-top: 0.3rem;">${mat.emoji} ${mat.label} — ${ship.weight}${ship.unit}</p>
        `;
        document.getElementById('pickup-time-input').value = "";
        this.showModal('modal-pickup');
    },

    confirmPickup() {
        const time = document.getElementById('pickup-time-input').value;
        if (!time) return;

        const ship = this.state.shipments.find(s => s.id === this.state.activeShipmentId);
        if (ship) {
            ship.status = 'scheduled';
            ship.pickupTime = time;
            this.save();
            this.closeModal('modal-pickup');
            this.render();
        }
    },

    openWeightModal(id) {
        this.state.activeShipmentId = id;
        const ship = this.state.shipments.find(s => s.id === id);
        document.getElementById('weight-ship-info').innerHTML = `
            <p><strong>${ship.restaurantName}</strong></p>
            <p style="font-size: 0.8rem; margin-top: 0.3rem;">الوزن المُعلن: ${ship.weight}${ship.unit}</p>
        `;
        document.getElementById('actual-weight-input').value = "";
        document.getElementById('actual-weight-unit').innerText = ship.unit;
        this.showModal('modal-weight');
    },

    submitWeight() {
        const actual = document.getElementById('actual-weight-input').value;
        if (!actual) return;

        const ship = this.state.shipments.find(s => s.id === this.state.activeShipmentId);
        if (ship) {
            ship.status = 'delivered';
            ship.actualWeight = parseFloat(actual);
            this.save();
            this.closeModal('modal-weight');
            this.render();
        }
    },

    // --- MODAL HELPERS ---
    showModal(id) {
        const el = document.getElementById(id);
        el.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    },

    closeModal(id) {
        const el = document.getElementById(id);
        el.style.display = 'none';
        document.body.style.overflow = '';
    },

    // --- RENDERING ---
    render() {
        const page = this.state.currentPage;
        
        if (page === 'auth') this.renderAuth();
        if (page === 'restaurant') this.renderRestaurant();
        if (page === 'factory') this.renderFactory();
        if (page === 'admin') this.renderAdmin();
    },

    renderAuth() {
        const role = this.state.authRole;
        const mode = this.state.authMode;
        
        document.getElementById('auth-emoji').innerText = role === 'admin' ? '🔐' : (role === 'restaurant' ? '🍽️' : '🏭');
        document.getElementById('auth-title').innerText = 
            role === 'admin' ? 'دخول الإدارة' : 
            (mode === 'login' ? (role === 'restaurant' ? 'تسجيل دخول المطعم' : 'تسجيل دخول المصنع') : (role === 'restaurant' ? 'إنشاء حساب مطعم' : 'إنشاء حساب مصنع'));
        
        document.getElementById('auth-toggle-container').style.display = role === 'admin' ? 'none' : 'flex';
        document.getElementById('toggle-login').className = mode === 'login' ? 'active' : '';
        document.getElementById('toggle-register').className = mode === 'register' ? 'active' : '';
        
        document.getElementById('field-name').style.display = mode === 'register' ? 'block' : 'none';
        document.getElementById('field-phone').style.display = mode === 'register' ? 'block' : 'none';
        document.querySelector('#auth-form button').innerText = mode === 'login' ? 'دخول' : 'إنشاء الحساب';

        document.getElementById('demo-credentials').style.display = role === 'admin' ? 'none' : 'block';
        document.getElementById('demo-email').innerText = role === 'restaurant' ? 'r@r.com' : 'f@f.com';
    },

    renderRestaurant() {
        const user = this.state.currentUser;
        if (!user) return;

        document.getElementById('res-user-name').innerText = user.name;
        
        const myShips = this.state.shipments.filter(s => s.restaurantId === user.id);
        const confirmed = myShips.filter(s => s.status === 'confirmed').length;
        const pendingConf = myShips.filter(s => s.status === 'delivered' && !s.restaurantConfirmed).length;

        document.getElementById('res-total-orders').innerText = myShips.length;
        document.getElementById('res-confirmed-orders').innerText = confirmed;
        document.getElementById('res-pending-confirm').innerText = pendingConf;
        document.getElementById('res-shipment-count').innerText = myShips.length;

        // Alerts for weight confirmation
        const alertsContainer = document.getElementById('res-alerts-container');
        alertsContainer.innerHTML = "";
        myShips.filter(s => s.status === 'delivered' && !s.restaurantConfirmed).forEach(s => {
            const mat = this.MATERIALS[s.materialType];
            const diff = Math.abs(s.weight - s.actualWeight);
            const alert = document.createElement('div');
            alert.className = 'weight-alert animate-slide-up';
            alert.innerHTML = `
                <div class="alert-header">
                    <div style="font-size: 1.8rem;">📬</div>
                    <div>
                        <h4>تأكيد الوزن المستلم</h4>
                        <p style="font-size: 0.8rem; color: #6b7280;">المصنع أكد استلام شحنتك</p>
                    </div>
                </div>
                <div class="info-grid">
                    <div class="info-row"><span>المادة</span><span style="font-weight: 800; color: ${mat.color}">${mat.emoji} ${mat.label}</span></div>
                    <div class="info-row"><span>الوزن الذي أرسلته</span><span style="font-weight: 800;">${s.weight} ${s.unit}</span></div>
                    <div class="info-row"><span>الوزن المؤكد من المصنع</span><span style="font-weight: 800; color: ${diff > 0 ? '#dc2626' : '#059669'}">${s.actualWeight} ${s.unit}</span></div>
                </div>
                ${diff > 0 ? `<div class="diff-box">⚠️ يوجد فرق في الوزن: ${diff} ${s.unit}</div>` : ''}
                <div class="btn-group">
                    <button class="btn-confirm" onclick="app.respondToWeight('${s.id}', 'confirmed')">✅ تأكيد</button>
                    <button class="btn-report" onclick="app.respondToWeight('${s.id}', 'reported')">⚠️ إبلاغ</button>
                </div>
            `;
            alertsContainer.appendChild(alert);
        });

        // Shipments list
        const list = document.getElementById('res-shipments-list');
        if (myShips.length === 0) {
            list.innerHTML = `<div class="empty-state"><span class="empty-icon">📭</span><p>لا توجد طلبات حتى الآن</p></div>`;
        } else {
            list.innerHTML = myShips.map(s => {
                const mat = this.MATERIALS[s.materialType];
                const status = this.STATUS_MAP[s.status];
                return `
                    <div class="shipment-item">
                        <div class="ship-info">
                            <div class="ship-icon" style="background: ${mat.bg}; border: 1.5px solid ${mat.border}; color: ${mat.color}">${mat.emoji}</div>
                            <div class="ship-details">
                                <h4>${mat.label}</h4>
                                <p>${s.weight} ${s.unit}</p>
                                ${s.pickupTime ? `<p style="color: #059669; font-weight: 700; margin-top: 0.3rem;">🕐 موعد الاستلام: ${new Date(s.pickupTime).toLocaleString('ar-IQ')}</p>` : ''}
                            </div>
                        </div>
                        <div class="status-badge" style="background: ${status.bg}; color: ${status.color}">
                            <span class="status-dot" style="background: ${status.dot}"></span>
                            ${status.label}
                        </div>
                    </div>
                `;
            }).join('');
        }
    },

    renderFactory() {
        const user = this.state.currentUser;
        if (!user) return;

        document.getElementById('fac-user-name').innerText = user.name;
        
        const pending = this.state.shipments.filter(s => s.status === 'pending');
        const scheduled = this.state.shipments.filter(s => s.status === 'scheduled');
        const reported = this.state.shipments.filter(s => s.status === 'reported');

        document.getElementById('fac-new-requests').innerText = pending.length;
        document.getElementById('fac-scheduled').innerText = scheduled.length;
        document.getElementById('fac-reports').innerText = reported.length;

        // Reports Alert
        const reportsContainer = document.getElementById('fac-reports-container');
        if (reported.length > 0) {
            reportsContainer.innerHTML = `
                <div class="weight-alert" style="border-color: #fca5a5; background: #fef2f2; margin-bottom: 2rem;">
                    <p style="font-weight: 800; color: #b91c1c;">⚠️ يوجد ${reported.length} بلاغ من المطاعم</p>
                    <p style="font-size: 0.8rem; margin-top: 0.3rem; color: #991b1b;">الأوزان غير متطابقة — يرجى التواصل مع المطاعم</p>
                </div>
            `;
        } else {
            reportsContainer.innerHTML = "";
        }

        // Pending List
        const pList = document.getElementById('fac-pending-list');
        if (pending.length === 0) {
            pList.innerHTML = `<div class="card" style="text-align: center; color: #94a3b8;">✅ لا توجد طلبات جديدة</div>`;
        } else {
            pList.innerHTML = pending.map(s => {
                const mat = this.MATERIALS[s.materialType];
                return `
                    <div class="card animate-slide-up">
                        <div class="ship-info" style="margin-bottom: 1rem;">
                            <div class="ship-icon" style="background: ${mat.bg}; border: 1.5px solid ${mat.border};">${mat.emoji}</div>
                            <div class="ship-details">
                                <h4 style="margin-bottom: 0;">${mat.label} — ${s.weight}${s.unit}</h4>
                                <p style="font-weight: 700; color: #334155;">${s.restaurantName}</p>
                            </div>
                        </div>
                        ${s.photo ? `<img src="${s.photo}" style="width: 100%; height: 120px; object-fit: cover; border-radius: 12px; margin-bottom: 1rem;">` : ''}
                        <button class="btn-submit" style="background: #2563eb; padding: 0.8rem;" onclick="app.openPickupModal('${s.id}')">📅 تحديد وقت الاستلام</button>
                    </div>
                `;
            }).join('');
        }

        // Scheduled List
        const sList = document.getElementById('fac-scheduled-list');
        if (scheduled.length === 0) {
            sList.innerHTML = `<div class="empty-state" style="padding: 2rem;"><p>لا توجد شحنات مجدولة</p></div>`;
        } else {
            sList.innerHTML = scheduled.map(s => {
                const mat = this.MATERIALS[s.materialType];
                return `
                    <div class="card">
                        <div class="ship-info" style="margin-bottom: 1rem;">
                            <span style="font-size: 1.5rem;">${mat.emoji}</span>
                            <div class="ship-details">
                                <h4 style="margin-bottom: 0;">${mat.label} — ${s.weight}${s.unit}</h4>
                                <p>${s.restaurantName}</p>
                            </div>
                        </div>
                        <div style="background: #eff6ff; padding: 0.8rem; border-radius: 12px; color: #1e40af; font-weight: 800; font-size: 0.85rem; margin-bottom: 1rem;">
                            🕐 ${new Date(s.pickupTime).toLocaleString('ar-IQ')}
                        </div>
                        <button class="btn-submit" style="padding: 0.8rem;" onclick="app.openWeightModal('${s.id}')">⚖️ تأكيد الاستلام وإدخال الوزن</button>
                    </div>
                `;
            }).join('');
        }
    },

    renderAdmin() {
        const ships = this.state.shipments;
        const confirmed = ships.filter(s => s.status === 'confirmed');
        const allKg = ships.filter(s => s.actualWeight).reduce((sum, s) => sum + s.actualWeight, 0);
        
        document.getElementById('adm-res-count').innerText = this.state.users.restaurants.length;
        document.getElementById('adm-fac-count').innerText = this.state.users.factories.length;
        document.getElementById('adm-ship-count').innerText = ships.length;
        
        document.getElementById('adm-total-tons').innerText = (allKg / 1000).toFixed(3);
        document.getElementById('adm-total-kg').innerText = allKg.toLocaleString();
        
        document.getElementById('adm-pending-val').innerText = ships.filter(s => s.status === 'pending').length;
        document.getElementById('adm-confirmed-val').innerText = confirmed.length;
        document.getElementById('adm-reported-val').innerText = ships.filter(s => s.status === 'reported').length;

        // Material Distribution Bars
        const matStats = document.getElementById('adm-material-stats');
        matStats.innerHTML = Object.entries(this.MATERIALS).map(([key, mat]) => {
            const mShips = ships.filter(s => s.materialType === key);
            const mKg = mShips.filter(s => s.actualWeight).reduce((sum, s) => sum + s.actualWeight, 0);
            const percent = ships.length ? (mShips.length / ships.length * 100) : 0;
            return `
                <div class="mat-progress-item">
                    <div class="mat-progress-header">
                        <div style="display: flex; gap: 0.5rem; align-items: center;">
                            <span style="background: ${mat.bg}; padding: 3px; border-radius: 6px;">${mat.emoji}</span>
                            <span style="color: ${mat.color}">${mat.label}</span>
                        </div>
                        <div>${mShips.length} شحنة (${mKg} كغ)</div>
                    </div>
                    <div class="progress-track"><div class="progress-bar" style="width: ${percent}%; background: ${mat.color}"></div></div>
                </div>
            `;
        }).join('');

        // Recent Shipments for Admin
        const recent = document.getElementById('adm-recent-shipments');
        recent.innerHTML = ships.slice(0, 10).map((s, i) => {
            const mat = this.MATERIALS[s.materialType];
            const status = this.STATUS_MAP[s.status];
            return `
                <div style="padding: 1rem 1.2rem; display: flex; justify-content: space-between; align-items: center; border-bottom: ${i < 9 ? '1px solid #f1f5f9' : 'none'};">
                    <div style="display: flex; gap: 0.8rem; align-items: center;">
                        <span style="font-size: 1.2rem;">${mat.emoji}</span>
                        <div>
                            <p style="font-weight: 800; font-size: 0.85rem;">${s.restaurantName}</p>
                            <p style="font-size: 0.75rem; color: #94a3b8;">${mat.label} • ${s.weight}${s.unit}</p>
                        </div>
                    </div>
                    <div class="status-badge" style="background: ${status.bg}; color: ${status.color}; padding: 0.2rem 0.6rem; font-size: 0.65rem;">${status.label}</div>
                </div>
            `;
        }).join('');
    }
};

// Start App
window.onload = () => app.init();
