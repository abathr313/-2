/**
 * Logba Platform - Main Logic
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

    map: null,
    marker: null,
    factoryMap: null,
    factoryMarker: null,
    trackMap: null,
    truckMarker: null,
    truckInterval: null,

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
                { id: "f1", name: "مصنع الخليج الأخضر", email: "f@f.com", password: "123", phone: "07703333333", isApproved: true },
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
        selectedLatLng: null,
        activeShipmentId: null,
        trackedShipmentId: null,
        adminTab: 'overview',
        charts: {}
    },

    // --- STORAGE SERVICE (FIREBASE PREP) ---
    db: {
        async save(state) {
            localStorage.setItem('logba_app_state', JSON.stringify(state));
            // Future: firebase.firestore().collection('state').doc('current').set(state);
        },
        async load() {
            const saved = localStorage.getItem('recycling_app_state');
            return saved ? JSON.parse(saved) : null;
        }
    },

    // --- INITIALIZATION ---
    async init() {
        const saved = await this.db.load();
        if (saved) {
            this.state.users = saved.users;
            this.state.shipments = saved.shipments;
            this.state.announcement = saved.announcement || null;
        }

        this.applyTheme();
        this.render();
        
        // Listen for data changes
        window.addEventListener('storage', async (e) => {
            if (e.key === 'logba_app_state') {
                const newState = JSON.parse(e.newValue);
                if (this.state.authRole === 'factory' && newState.shipments.length > this.state.shipments.length) {
                    this.showToast("طلب تجميع جديد وارد!", "success");
                    this.playSound('notification');
                }
                this.state = newState;
                this.render();
            }
        });
    },

    applyTheme() {
        const theme = localStorage.getItem('logba_theme') || 'light';
        document.documentElement.setAttribute('data-theme', theme);
        const toggleBtn = document.getElementById('theme-toggle');
        if (toggleBtn) toggleBtn.innerText = theme === 'dark' ? '☀️' : '🌙';
    },

    toggleTheme() {
        const current = document.documentElement.getAttribute('data-theme') || 'light';
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('logba_theme', next);
        const toggleBtn = document.getElementById('theme-toggle');
        if (toggleBtn) toggleBtn.innerText = next === 'dark' ? '☀️' : '🌙';
        this.showToast(next === 'dark' ? "تفعيل الوضع الليلي" : "تفعيل الوضع الفاتح", "info");
    },

    playSound(type) {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        if (type === 'success') {
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
            oscillator.frequency.exponentialRampToValueAtTime(1046.5, audioCtx.currentTime + 0.1); // C6
            gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
            oscillator.start();
            oscillator.stop(audioCtx.currentTime + 0.3);
        } else if (type === 'notification') {
            oscillator.type = 'triangle';
            oscillator.frequency.setValueAtTime(440, audioCtx.currentTime); // A4
            oscillator.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.1); // E5
            gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
            oscillator.start();
            oscillator.stop(audioCtx.currentTime + 0.5);
        } else if (type === 'truck') {
            oscillator.type = 'square';
            oscillator.frequency.setValueAtTime(110, audioCtx.currentTime); 
            oscillator.frequency.linearRampToValueAtTime(150, audioCtx.currentTime + 0.5);
            gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.6);
            oscillator.start();
            oscillator.stop(audioCtx.currentTime + 0.6);
        }
    },

    showToast(message, type = 'info') {
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        const icons = { success: '✅', error: '❌', info: '🔔' };
        toast.innerHTML = `<span>${icons[type] || '🔔'}</span> <span>${message}</span>`;
        
        container.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => toast.remove(), 400);
        }, 3000);
    },

    switchAdminTab(tab) {
        this.state.adminTab = tab;
        this.render();
        
        if (tab === 'overview') this.renderAdmin();
        if (tab === 'global-map') this.renderAdminGlobalMap();
        if (tab === 'users') this.renderAdminUsers();
        if (tab === 'logs') this.renderAdminLogs();
        if (tab === 'approvals') this.renderAdminApprovals();
    },

    save() {
        this.db.save(this.state);
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
                if (this.state.authRole === 'factory' && !user.isApproved) {
                    this.showToast("عذراً، حسابك قيد المراجعة من قبل الإدارة. سيتم إشعارك فور تفعيله.", "info");
                    this.playSound('notification');
                    return;
                }
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
            const newUser = { 
                id: 'u' + Date.now(), 
                name, 
                email, 
                password: pass, 
                phone,
                isApproved: this.state.authRole === 'factory' ? false : true 
            };
            if (this.state.authRole === 'restaurant') this.state.users.restaurants.push(newUser);
            else {
                this.state.users.factories.push(newUser);
                this.showToast("تم إنشاء الحساب بنجاح! بانتظار موافقة الإدارة.", "success");
                this.navigate('landing');
                this.save();
                return;
            }
            
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
        
        if (step === 2) {
            setTimeout(() => this.initMap(), 100);
        }
    },

    initMap() {
        if (this.map) {
            this.map.invalidateSize();
            return;
        }
        
        // Baghdad as default center
        let lat = 33.3152; 
        let lng = 44.3661;
        
        this.map = L.map('map-picker').setView([lat, lng], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);
        
        this.marker = L.marker([lat, lng], { draggable: true }).addTo(this.map);
        
        this.marker.on('dragend', (e) => {
            const pos = e.target.getLatLng();
            this.state.selectedLatLng = { lat: pos.lat, lng: pos.lng };
        });

        // Try to get current location
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((pos) => {
                const { latitude, longitude } = pos.coords;
                this.map.setView([latitude, longitude], 15);
                this.marker.setLatLng([latitude, longitude]);
                this.state.selectedLatLng = { lat: latitude, lng: longitude };
            }, (error) => console.log("Geolocation denied or error", error));
        }
        
        this.state.selectedLatLng = { lat, lng };
    },

    async searchLocation() {
        const query = document.getElementById('map-search-query').value;
        if (!query) return;
        
        try {
            const resp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
            const data = await resp.json();
            if (data.length > 0) {
                const { lat, lon } = data[0];
                const pos = [parseFloat(lat), parseFloat(lon)];
                this.map.setView(pos, 15);
                this.marker.setLatLng(pos);
                this.state.selectedLatLng = { lat: parseFloat(lat), lng: parseFloat(lon) };
            } else {
                alert("لم يتم العثور على الموقع");
            }
        } catch (e) {
            console.error("Search failed", e);
        }
    },

    openMapModal(id) {
        this.state.activeShipmentId = id;
        const ship = this.state.shipments.find(s => s.id === id);
        if (!ship || !ship.location) return;

        this.showModal('modal-view-map');
        
        setTimeout(() => {
            if (!this.factoryMap) {
                this.factoryMap = L.map('factory-view-map').setView([ship.location.lat, ship.location.lng], 15);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '© OpenStreetMap contributors'
                }).addTo(this.factoryMap);
                this.factoryMarker = L.marker([ship.location.lat, ship.location.lng]).addTo(this.factoryMap);
            } else {
                this.factoryMap.setView([ship.location.lat, ship.location.lng], 15);
                this.factoryMarker.setLatLng([ship.location.lat, ship.location.lng]);
                this.factoryMap.invalidateSize();
            }
        }, 100);
    },

    openInGoogleMaps() {
        const ship = this.state.shipments.find(s => s.id === this.state.activeShipmentId);
        if (ship && ship.location) {
            window.open(`https://www.google.com/maps?q=${ship.location.lat},${ship.location.lng}`, '_blank');
        }
    },

    openTrackingModal(id) {
        const ship = this.state.shipments.find(s => s.id === id);
        if (!ship) return;
        
        this.showModal('modal-track');
        this.renderTrackingTimeline(ship);
        
        setTimeout(() => {
            this.initTrackMap(ship);
        }, 300);
    },

    initTrackMap(ship) {
        if (this.truckInterval) clearInterval(this.truckInterval);
        
        if (!this.trackMap) {
            this.trackMap = L.map('track-map').setView([ship.location.lat, ship.location.lng], 14);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(this.trackMap);
        } else {
            this.trackMap.setView([ship.location.lat, ship.location.lng], 14);
            this.trackMap.invalidateSize();
        }

        // Supplier Marker
        if (this.trackSupplierMarker) this.trackMap.removeLayer(this.trackSupplierMarker);
        this.trackSupplierMarker = L.marker([ship.location.lat, ship.location.lng]).addTo(this.trackMap)
            .bindPopup("موقعك المستلم").openPopup();

        // Factory/Truck simulation
        if (this.truckMarker) this.trackMap.removeLayer(this.truckMarker);
        
        if (ship.status === 'scheduled') {
            const startLat = ship.location.lat - 0.008;
            const startLng = ship.location.lng - 0.012;
            const destination = [ship.location.lat, ship.location.lng];
            const startPoint = [startLat, startLng];

            // Add a route line (Polyline)
            const routeLine = L.polyline([startPoint, destination], {
                color: '#10b981',
                weight: 4,
                dashArray: '10, 10',
                opacity: 0.6
            }).addTo(this.trackMap);

            // Fit bounds so both points are visible
            this.trackMap.fitBounds(L.latLngBounds(startPoint, destination), { padding: [50, 50] });
            
            this.truckMarker = L.marker(startPoint, {
                icon: L.divIcon({ 
                    html: '<div class="truck-wrapper">🚚</div>', 
                    className: 'truck-emoji-icon', 
                    iconSize: [45, 45],
                    iconAnchor: [22, 22] 
                })
            }).addTo(this.trackMap)
            .bindPopup("الشاحنة متجهة إليك حالياً ⚡")
            .openPopup();

            let progress = 0;
            this.truckInterval = setInterval(() => {
                progress += 0.005; 
                if (progress >= 1) {
                    clearInterval(this.truckInterval);
                    this.truckMarker.setLatLng(destination);
                    this.truckMarker.setPopupContent("وصلت الشاحنة!");
                    return;
                }
                const currentLat = startLat + (ship.location.lat - startLat) * progress;
                const currentLng = startLng + (ship.location.lng - startLng) * progress;
                this.truckMarker.setLatLng([currentLat, currentLng]);
                
                // Adjust map follow (optional but nice)
                // this.trackMap.panTo([currentLat, currentLng]);
            }, 60);
        } else if (ship.status === 'pending') {
            // Show that we're waiting for the factory
            L.popup()
                .setLatLng([ship.location.lat, ship.location.lng])
                .setContent("⏰ بانتظار قبول الطلب من المصنع وجدولة استلامه لتبدأ الشاحنة بالتحرك")
                .openOn(this.trackMap);
        }
    },

    renderTrackingTimeline(ship) {
        const timeline = document.getElementById('track-timeline');
        const statusCard = document.getElementById('track-status-card');
        
        const stages = [
            { id: 'sent', label: 'تم إرسال الطلب بنجاح', icon: '📝', data: ship.createdAt },
            { id: 'scheduled', label: 'تم القبول وجدولة موعد الاستلام', icon: '📅', data: ship.pickupTime },
            { id: 'weighted', label: 'تم الاستلام وتأكيد الوزن', icon: '⚖️', data: ship.actualWeight },
            { id: 'completed', label: 'تم اكتمال العملية بنجاح', icon: '✅', data: ship.restaurantConfirmed === 'confirmed' ? 'مكتمل' : null },
        ];

        // Determine current progress
        let activeIdx = 0;
        if (ship.status === 'pending') activeIdx = 0;
        else if (ship.status === 'scheduled') activeIdx = 1;
        else if (ship.status === 'delivered') activeIdx = 2;
        else if (ship.status === 'confirmed') activeIdx = 3;

        statusCard.innerHTML = `
            <div style="font-size: 2rem;">${stages[activeIdx].icon}</div>
            <div>
                <p style="font-weight: 800; color: var(--primary-dark); font-size: 1rem;">الحالة الحالية: ${this.STATUS_MAP[ship.status].label}</p>
                <p style="font-size: 0.8rem; opacity: 0.7;">طلبك الان في مرحلة ${stages[activeIdx].label}</p>
            </div>
        `;

        timeline.innerHTML = stages.map((s, i) => {
            const isCompleted = i <= activeIdx;
            const isCurrent = i === activeIdx;
            return `
                <div class="timeline-item ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}">
                    <div class="timeline-dot">
                        ${isCompleted ? '✓' : ''}
                    </div>
                    <div class="timeline-content">
                        <h5>${s.label}</h5>
                        ${s.data ? `<p>${typeof s.data === 'string' && s.data.includes('T') ? new Date(s.data).toLocaleString('ar-IQ') : (s.data + (s.id === 'weighted' ? ' ' + ship.unit : ''))}</p>` : ''}
                    </div>
                </div>
            `;
        }).join('');
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
        const phone = document.getElementById('col-mng-phone').value;
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
            managementPhone: phone,
            location: this.state.selectedLatLng,
            createdAt: new Date().toISOString()
        };

        this.state.shipments.unshift(newShipment);
        this.save();
        this.closeModal('modal-collect');
        this.showToast("تم إرسال طلب التجميع بنجاح!", "success");
        this.playSound('success');
        this.render();
        // Clear inputs
        document.getElementById('col-weight').value = "";
        document.getElementById('col-mng-phone').value = "";
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
            this.showToast("تمت جدولة الاستلام بنجاح!", "success");
            this.playSound('success');
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

    // --- ANNOUNCEMENT ACTIONS ---
    submitAnnouncement() {
        const msg = document.getElementById('adm-announcement-input').value;
        if (!msg) return;

        this.state.announcement = {
            message: msg,
            date: new Date().toISOString(),
            id: 'ann' + Date.now()
        };
        this.save();
        this.showToast("تم نشر الإعلان بنجاح!", "success");
        document.getElementById('adm-announcement-input').value = "";
        this.render();
    },

    deleteAnnouncement() {
        this.state.announcement = null;
        this.save();
        this.render();
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
        if (page === 'restaurant') {
            this.renderRestaurant();
            this.renderSupplierChart();
        }
        if (page === 'factory') this.renderFactory();
        if (page === 'admin') {
            this.renderAdmin();
            // Handle tabs
            document.querySelectorAll('.admin-tab-content').forEach(el => el.classList.remove('active'));
            document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
            
            document.getElementById(`admin-view-${this.state.adminTab}`).classList.add('active');
            
            // Update all tab buttons
            const tabBtns = document.querySelectorAll('.tab-btn');
            tabBtns.forEach(btn => {
                const onClickAttr = btn.getAttribute('onclick') || "";
                if (onClickAttr.includes(`'${this.state.adminTab}'`)) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });

            if (this.state.adminTab === 'users') this.renderAdminUsers();
            if (this.state.adminTab === 'logs') this.renderAdminLogs();
            if (this.state.adminTab === 'approvals') this.renderAdminApprovals();
            if (this.state.adminTab === 'overview') this.renderAdminMaterialChart();
        }
    },

    renderAuth() {
        const role = this.state.authRole;
        const mode = this.state.authMode;
        
        document.getElementById('auth-emoji').innerText = role === 'admin' ? '🔐' : (role === 'restaurant' ? '🍽️' : '🏭');
        document.getElementById('auth-title').innerText = 
            role === 'admin' ? 'دخول الإدارة' : 
            (mode === 'login' ? (role === 'restaurant' ? 'تسجيل دخول المورد' : 'تسجيل دخول المصنع') : (role === 'restaurant' ? 'إنشاء حساب مورد' : 'إنشاء حساب مصنع'));
        
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
        
        // Render Announcement
        const annContainer = document.getElementById('res-announcement-container');
        if (this.state.announcement) {
            annContainer.innerHTML = `
                <div class="announcement-banner animate-slide-up" style="background: linear-gradient(135deg, #fef3c7, #fffbeb); border: 2px solid #f59e0b; padding: 1.2rem; border-radius: 20px; margin-bottom: 2rem; position: relative;">
                    <div style="display: flex; gap: 1rem; align-items: flex-start;">
                        <span style="font-size: 1.8rem;">📢</span>
                        <div>
                            <h4 style="color: #92400e; margin-bottom: 0.3rem;">تنبيه هام من الإدارة</h4>
                            <p style="font-size: 0.9rem; color: #b45309; line-height: 1.5;">${this.state.announcement.message}</p>
                            <p style="font-size: 0.7rem; color: #b45309; opacity: 0.6; margin-top: 0.5rem;">${new Date(this.state.announcement.date).toLocaleString('ar-IQ')}</p>
                        </div>
                    </div>
                </div>
            `;
        } else {
            annContainer.innerHTML = "";
        }

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
                                <button class="btn-track-mini" onclick="app.openTrackingModal('${s.id}')">تتبع الطلب 🚚</button>
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
        
        // Render Announcement
        const annContainer = document.getElementById('fac-announcement-container');
        if (this.state.announcement) {
            annContainer.innerHTML = `
                <div class="announcement-banner animate-slide-up" style="background: linear-gradient(135deg, #fef3c7, #fffbeb); border: 2px solid #f59e0b; padding: 1.2rem; border-radius: 20px; margin-bottom: 2rem; position: relative;">
                    <div style="display: flex; gap: 1rem; align-items: flex-start;">
                        <span style="font-size: 1.8rem;">📢</span>
                        <div>
                            <h4 style="color: #92400e; margin-bottom: 0.3rem;">تنبيه هام من الإدارة</h4>
                            <p style="font-size: 0.9rem; color: #b45309; line-height: 1.5;">${this.state.announcement.message}</p>
                            <p style="font-size: 0.7rem; color: #b45309; opacity: 0.6; margin-top: 0.5rem;">${new Date(this.state.announcement.date).toLocaleString('ar-IQ')}</p>
                        </div>
                    </div>
                </div>
            `;
        } else {
            annContainer.innerHTML = "";
        }
        
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
                    <p style="font-weight: 800; color: #b91c1c;">⚠️ يوجد ${reported.length} بلاغ من الموردين</p>
                    <p style="font-size: 0.8rem; margin-top: 0.3rem; color: #991b1b;">الأوزان غير متطابقة — يرجى التواصل مع المورد</p>
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
                        
                        <div style="background: #f8fafc; padding: 0.8rem; border-radius: 12px; margin-bottom: 1rem; border: 1px solid #e2e8f0;">
                            ${s.managementPhone ? `<p style="font-size: 0.85rem; margin-bottom: 0.5rem;">📞 هاتف الإدارة: <a href="tel:${s.managementPhone}" style="color: #2563eb; font-weight: 700;">${s.managementPhone}</a></p>` : ''}
                            ${s.location ? `<button class="btn-secondary" style="width: 100%; font-size: 0.8rem; padding: 0.5rem; background: #fff; border: 1px solid #cbd5e1;" onclick="app.openMapModal('${s.id}')">📍 عرض الموقع على الخريطة</button>` : ''}
                        </div>

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

        // Render Announcement Status for Admin
        const annPreview = document.getElementById('adm-current-announcement');
        if (this.state.announcement) {
            annPreview.style.display = 'block';
            document.getElementById('adm-announcement-text').innerText = this.state.announcement.message;
        } else {
            annPreview.style.display = 'none';
        }

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
    },

    renderAdminUsers() {
        const container = document.getElementById('adm-users-list');
        const res = this.state.users.restaurants.map(u => ({...u, role: 'مورد'}));
        const fac = this.state.users.factories.map(u => ({...u, role: 'مصنع'}));
        const all = [...res, ...fac];

        container.innerHTML = all.map(u => `
            <div class="admin-user-item">
                <div>
                    <span style="font-size: 0.7rem; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; margin-left: 8px;">${u.role}</span>
                    <strong>${u.name}</strong>
                    <p style="font-size: 0.8rem; color: #64748b; margin-top: 5px;">📧 ${u.email} | 📞 ${u.phone}</p>
                </div>
                <button class="btn-delete" onclick="app.deleteUser('${u.role === 'مورد' ? 'restaurant' : 'factory'}', '${u.id}')">حذف الحساب</button>
            </div>
        `).join('');
    },

    deleteUser(role, id) {
        if (!confirm("هل أنت متأكد من حذف هذا الحساب؟")) return;
        const poolKey = role === 'restaurant' ? 'restaurants' : 'factories';
        this.state.users[poolKey] = this.state.users[poolKey].filter(u => u.id !== id);
        this.save();
        this.renderAdminUsers();
        this.showToast("تم حذف المستخدم بنجاح", "error");
    },

    renderAdminLogs() {
        const container = document.getElementById('adm-all-shipments');
        container.innerHTML = this.state.shipments.map(s => {
            const mat = this.MATERIALS[s.materialType];
            const status = this.STATUS_MAP[s.status];
            return `
                <tr>
                    <td><strong>${s.restaurantName}</strong></td>
                    <td>${mat.emoji} ${mat.label}</td>
                    <td>${s.weight}${s.unit}</td>
                    <td>${new Date(s.createdAt).toLocaleDateString('ar-IQ')}</td>
                    <td>${s.factoryName || '--'}</td>
                    <td><span class="status-badge" style="background: ${status.bg}; color: ${status.color}">${status.label}</span></td>
                </tr>
            `;
        }).join('');
    },

    exportToCSV() {
        const rows = [
            ["ID", "Supplier", "Material", "Declared Weight", "Actual Weight", "Status", "Date"],
            ...this.state.shipments.map(s => [
                s.id, s.restaurantName, s.materialType, s.weight + s.unit, s.actualWeight || '--', s.status, s.createdAt
            ])
        ];
        const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "recycling_report.csv");
        document.body.appendChild(link);
        link.click();
    },

    // --- CHARTS ---
    renderSupplierChart() {
        const ctx = document.getElementById('supplier-chart');
        if (!ctx) return;
        
        if (this.state.charts.supplier) this.state.charts.supplier.destroy();

        const userShipments = this.state.shipments.filter(s => s.restaurantId === this.state.currentUser.id);
        const labels = Object.values(this.MATERIALS).map(m => m.label);
        const data = Object.keys(this.MATERIALS).map(key => {
            return userShipments.filter(s => s.materialType === key).reduce((sum, s) => sum + (s.actualWeight || s.weight), 0);
        });

        this.state.charts.supplier = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: Object.values(this.MATERIALS).map(m => m.color),
                    borderWidth: 0
                }]
            },
            options: { cutout: '70%', plugins: { legend: { position: 'bottom' } } }
        });
    },

    renderAdminMaterialChart() {
        const ctx = document.getElementById('admin-material-chart');
        if (!ctx) return;

        if (this.state.charts.admin) this.state.charts.admin.destroy();

        const labels = Object.values(this.MATERIALS).map(m => m.label);
        const data = Object.keys(this.MATERIALS).map(key => {
            return this.state.shipments.filter(s => s.materialType === key).reduce((sum, s) => sum + (s.actualWeight || 0), 0);
        });

        this.state.charts.admin = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'إجمالي الوزن المستلم (كغ)',
                    data: data,
                    backgroundColor: Object.values(this.MATERIALS).map(m => m.color + 'aa'),
                    borderColor: Object.values(this.MATERIALS).map(m => m.color),
                    borderWidth: 1
                }]
            },
            options: {
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true } }
            }
        });
    },

    renderAdminGlobalMap() {
        const mapContainer = document.getElementById('admin-global-map');
        if (!mapContainer) return;

        // Cleanup existing map if it exists
        if (this.state.charts.adminGlobalMap) {
            this.state.charts.adminGlobalMap.remove();
        }

        // Initialize Map
        const map = L.map('admin-global-map').setView([33.3152, 44.3661], 12);
        this.state.charts.adminGlobalMap = map;

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);

        // Add markers for all active shipments
        const activeShipments = this.state.shipments.filter(s => s.status !== 'confirmed');
        activeShipments.forEach(s => {
            if (s.location) {
                const mat = this.MATERIALS[s.materialType];
                const marker = L.marker([s.location.lat, s.location.lng]).addTo(map);
                
                const popupContent = `
                    <div style="direction: rtl; text-align: right; font-family: 'Tajawal', sans-serif;">
                        <h4 style="margin-bottom: 5px;">${s.restaurantName}</h4>
                        <p style="font-size: 0.8rem; margin-bottom: 5px;">${mat.emoji} ${mat.label} - ${s.weight}${s.unit}</p>
                        <p style="font-size: 0.7rem; color: #666;">الحالة: ${this.STATUS_MAP[s.status].label}</p>
                        <button onclick="app.showAdminTab('logs')" style="background: #10b981; color: white; border: none; padding: 4px 8px; border-radius: 6px; font-size: 0.7rem; cursor: pointer; margin-top: 8px; width: 100%;">عرض التفاصيل</button>
                    </div>
                `;
                marker.bindPopup(popupContent);
            }
        });
        
        // Auto-fit bounds if there are markers
        if (activeShipments.length > 0) {
            const group = new L.featureGroup(activeShipments.filter(s => s.location).map(s => L.marker([s.location.lat, s.location.lng])));
            map.fitBounds(group.getBounds().pad(0.1));
        }
    },

    renderAdminApprovals() {
        const container = document.getElementById("adm-pending-approvals");
        if (!container) return;

        const pending = this.state.users.factories.filter(f => !f.isApproved);
        if (pending.length === 0) {
            container.innerHTML = `<div class="empty-state" style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--text-muted);">
                <p style="font-size: 3rem; margin-bottom: 1rem;">🏖️</p>
                <p>لا توجد طلبات انضمام معلقة حالياً</p>
            </div>`;
            return;
        }

        container.innerHTML = pending.map(f => `
            <div class="card approval-card animate-slide-up">
                <div style="display: flex; gap: 1rem; align-items: center; margin-bottom: 1.5rem;">
                    <div class="role-icon" style="background: var(--primary-light); width: 50px; height: 50px; font-size: 1.5rem;">🏭</div>
                    <div>
                        <h4 style="font-weight: 800; font-size: 1.1rem;">${f.name}</h4>
                        <p style="font-size: 0.8rem; color: var(--text-muted);">${f.email}</p>
                    </div>
                </div>
                <div style="background: var(--bg-main); padding: 1rem; border-radius: 12px; margin-bottom: 1.5rem; font-size: 0.85rem;">
                    <p style="margin-bottom: 0.5rem;"><strong>📞 الهاتف:</strong> ${f.phone || "غير متوفر"}</p>
                    <p><strong>📅 التاريخ:</strong> ${new Date().toLocaleDateString("ar-EG")}</p>
                </div>
                <div style="display: flex; gap: 0.8rem;">
                    <button class="btn-submit" onclick="app.approveFactory(\'${f.id}\')" style="flex: 2; padding: 0.7rem; font-size: 0.85rem;">✅ قبول</button>
                    <button class="btn-secondary" onclick="app.rejectFactory(\'${f.id}\')" style="flex: 1; padding: 0.7rem; font-size: 0.85rem; background: #fee2e2; color: #ef4444; border: none;">❌ رفض</button>
                </div>
            </div>
        `).join("");
    },

    approveFactory(id) {
        const factory = this.state.users.factories.find(f => f.id === id);
        if (factory) {
            factory.isApproved = true;
            this.showToast(`تمت الموافقة على ${factory.name} بنجاح!`, "success");
            this.playSound("success");
            this.save();
            this.render();
            if (this.state.adminTab === 'approvals') this.renderAdminApprovals();
        }
    },

    rejectFactory(id) {
        if (confirm("هل أنت متأكد من رفض وحذف هذا الطلب؟")) {
            this.state.users.factories = this.state.users.factories.filter(f => f.id !== id);
            this.showToast("تم رفض وحذف الطلب.", "info");
            this.save();
            this.render();
            if (this.state.adminTab === 'approvals') this.renderAdminApprovals();
        }
    }
};

window.onload = () => app.init();
