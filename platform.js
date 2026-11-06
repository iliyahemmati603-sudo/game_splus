const Net = {
    db: null,
    ready: false,
    init() {
        if (!window.FIREBASE_CONFIG?.databaseURL) return;
        try {
            firebase.initializeApp(window.FIREBASE_CONFIG);
            this.db = firebase.database();
            this.ready = true;
        } catch (e) { console.warn('DB Init Failed', e); }
    },
    submit(gameId, score, name) {
        if (!this.ready || !this.db) return Promise.resolve(false);
        
        const uid = Storage.data.uid;
        const gameRef = this.db.ref(`leaderboards/${gameId}`);
        
        return gameRef.orderByChild('uid').equalTo(uid).once('value').then(snap => {
            let existingKey = null, existingScore = 0;
            snap.forEach(c => { existingKey = c.key; existingScore = c.val().score || 0; });
            
            const updates = {};
            
            if (score > existingScore) {
                const entry = { uid, name, score, ts: Date.now() };
                if (existingKey) updates[`leaderboards/${gameId}/${existingKey}`] = entry;
                else updates[`leaderboards/${gameId}/${gameRef.push().key}`] = entry;
            }

            return this.db.ref(`global_leaderboard`).orderByChild('uid').equalTo(uid).once('value');
        }).then(snap => {
            let existingKey = null, existingTotal = 0;
            snap.forEach(c => { existingKey = c.key; existingTotal = c.val().totalScore || 0; });
            
            const updates = {};
            const newTotal = existingTotal + score; 
            
            const entry = { uid, name, totalScore: newTotal, ts: Date.now() };
            if (existingKey) updates[`global_leaderboard/${existingKey}`] = entry;
            else updates[`global_leaderboard/${this.db.ref('global_leaderboard').push().key}`] = entry;
            
            return this.db.ref().update(updates);
        }).catch(() => false);
    },
    get(gameId) {
        if (!this.ready || !this.db) return Promise.resolve([]);
        const ref = this.db.ref(`leaderboards/${gameId}`);
        return ref.orderByChild('score').limitToLast(50).once('value')
            .then(snap => {
                const arr = [];
                snap.forEach(c => arr.push(c.val()));
                return arr.reverse();
            }).catch(() => []);
    },
    getGlobal() {
        if (!this.ready || !this.db) return Promise.resolve([]);
        const ref = this.db.ref('global_leaderboard');
        return ref.orderByChild('totalScore').limitToLast(50).once('value')
            .then(snap => {
                const arr = [];
                snap.forEach(c => arr.push(c.val()));
                return arr.reverse();
            }).catch(() => []);
    }
};
