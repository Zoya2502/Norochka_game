window.engine = {
    state: { day: 1, dragon: null, mood: 0, gear: null, feedCount: 0 },khvoynikMood: 'neutral', // Запоминаем настроение Хвойника
    noraMood: 'neutral',
    currentScene: 'start',
    currentStep: 0,
    lastChoiceParams: null,
    pendingScene: null,
    currentChoices: [],
    choiceIndex: 0,
    els: {},

    // === АУДИО СИСТЕМА ===
    audio: {
        currentTrack: null,     // Основная музыка
        currentAmbience: null,  // Фоновый шум (крылья)
        sounds: {},
        
        init() {
            // Предзагрузка важных звуков
            this.sounds.roar = new Audio('audio/roar.ogg');
        },

        playMusic(filename) {
            // Если этот трек уже играет, не перезапускаем
            if (this.currentTrack && this.currentTrack.src.includes(filename)) return;
            
            this.stopMusic();
            this.currentTrack = new Audio(`audio/${filename}.ogg`);
            this.currentTrack.loop = true;
            this.currentTrack.volume = 0.4; // Громкость музыки
            this.currentTrack.play().catch(e => console.log("Браузер заблокировал автоплей:", e));
        },

        stopMusic() {
            if (this.currentTrack) {
                this.currentTrack.pause();
                this.currentTrack.currentTime = 0;
                this.currentTrack = null;
            }
        },

        // Фоновый зацикленный звук (например, крылья)
        playAmbience(filename) {
            if (this.currentAmbience) this.stopAmbience();
            this.currentAmbience = new Audio(`audio/${filename}.ogg`);
            this.currentAmbience.loop = true;
            this.currentAmbience.volume = 0.6; // Громче музыки для атмосферы
            this.currentAmbience.play().catch(e => console.log("Браузер заблокировал эмбиент:", e));
        },

        stopAmbience() {
            if (this.currentAmbience) {
                this.currentAmbience.pause();
                this.currentAmbience = null;
            }
        },

        // Остановить вообще всё (для экрана концовки)
        stopAll() {
            this.stopMusic();
            this.stopAmbience();
        },

        playSfx(filename) {
            const sfx = new Audio(`audio/${filename}.ogg`);
            sfx.volume = 0.7;
            sfx.play();
        }
    },

    init() {
        this.els = {
            bg: document.getElementById('background-layer'),
            slots: { left: document.getElementById('char-left'), right: document.getElementById('char-right'), center: document.getElementById('char-center') },
            dialogue: document.getElementById('dialogue-box'),
            speaker: document.getElementById('speaker-name-box'),
            text: document.getElementById('text-content'),
            carousel: document.getElementById('choice-carousel'),
            carouselText: document.getElementById('current-choice-text'),
            screens: { menu: document.getElementById('main-menu'), race: document.getElementById('race-screen'), end: document.getElementById('end-screen'), transition: document.getElementById('transition-overlay') },
            day: document.getElementById('day-indicator'),
            transitionText: document.getElementById('transition-text')
        };
        this.audio.init();
    },

    startGame() {
        this.init();
        this.els.screens.menu.classList.add('hidden');
        this.runStep();
    },

    runStep() {
        const scene = story[this.currentScene];
        if (!scene || !scene[this.currentStep]) return;
        const step = scene[this.currentStep];

        switch (step.type) {
            case 'dialogue': this.renderDialogue(step); break;
            case 'choice': this.renderChoice(step.options); break;
            case 'setBg': this.els.bg.className = step.bg; this.nextLine(); break;
            case 'setBgFunc': this.els.bg.className = eval(step.func); this.nextLine(); break;
            case 'showChar': this.showChar(step.pos, step.name, step.mood); this.nextLine(); break;
            case 'hideChars': this.hideChars(); this.nextLine(); break;
            case 'setDay': this.state.day = step.day; this.els.day.innerText = "День " + step.day; this.nextLine(); break;
            case 'action': this.actions[step.func](); this.nextLine(); break;
            case 'eval': eval(step.code); break;
            case 'jump': this.jumpTo(step.to); break;
            case 'transition': this.showTransition(step.text, step.to); break;
            case 'end': this.showEnd(step); break;
            
            // Команды аудио
            case 'playMusic': this.audio.playMusic(step.file); this.nextLine(); break;
            case 'stopMusic': this.audio.stopMusic(); this.nextLine(); break;
            case 'stopAmbience': this.audio.stopAmbience(); this.nextLine(); break;
            case 'playSound': this.audio.playSfx(step.file); this.nextLine(); break;
        }
    },

    nextLine() { this.currentStep++; this.runStep(); },
    jumpTo(key) { this.currentScene = key; this.currentStep = 0; this.runStep(); },

    renderDialogue(data) {
        this.els.dialogue.classList.remove('hidden');
        this.els.speaker.innerText = data.speaker || "";
        this.els.speaker.style.display = data.speaker ? "block" : "none";
        this.els.text.innerText = data.text.replace('{feedCount+1}', this.state.feedCount + 1);

        // === ЛОГИКА ПЕРЕКЛЮЧЕНИЯ ЭМОЦИЙ ===
        
        if (data.speaker === "Хвойник") {
            // 1. Обновляем настроение Хвойника (если в сценарии есть новое mood, берем его, иначе оставляем старое)
            this.state.khvoynikMood = data.mood || this.state.khvoynikMood;
            
            // 2. Хвойник ГОВОРИТ (speak) с новым настроением
            this.showChar('left', 'khvoynik', this.state.khvoynikMood, 'speak');
            
            // 3. Нора МОЛЧИТ (silent) со своим ТЕКУЩИМ настроением
            this.showChar('right', 'nora', this.state.noraMood, 'silent');
        } 
        else if (data.speaker === "Предрассветная Мгла") {
            // 1. Обновляем настроение Норы
            this.state.noraMood = data.mood || this.state.noraMood;
            
            // 2. Нора ГОВОРИТ (speak)
            this.showChar('right', 'nora', this.state.noraMood, 'speak');
            
            // 3. Хвойник МОЛЧИТ (silent)
            this.showChar('left', 'khvoynik', this.state.khvoynikMood, 'silent');
        }
    },

    showChar(pos, name, mood = 'neutral', action = 'silent') {
        const slot = this.els.slots[pos];
        slot.classList.remove('hidden');
        const imgName = name === 'dragon' ? `dragon_${this.state.dragon}_${mood}` : `${name}_${mood}_${action}`;
        slot.innerHTML = `<img src="img/${imgName}.png">`;
        slot.style.filter = action === 'speak' ? "brightness(1.1)" : "brightness(0.7)";
    },

    hideChars() { Object.values(this.els.slots).forEach(s => s.classList.add('hidden')); },

    renderChoice(options) {
        this.els.dialogue.classList.add('hidden');
        this.els.carousel.classList.remove('hidden');
        this.currentChoices = options;
        this.choiceIndex = 0;
        this.updateCarousel();
    },

    carouselNext() { this.choiceIndex = (this.choiceIndex + 1) % this.currentChoices.length; this.updateCarousel(); },
    carouselPrev() { this.choiceIndex = (this.choiceIndex - 1 + this.currentChoices.length) % this.currentChoices.length; this.updateCarousel(); },
    updateCarousel() { this.els.carouselText.innerText = this.currentChoices[this.choiceIndex].text; },
    carouselConfirm() {
        const choice = this.currentChoices[this.choiceIndex];
        this.els.carousel.classList.add('hidden');
        this.lastChoiceParams = choice.params;
        this.jumpTo(choice.jumpTo);
    },

    showTransition(text, next) {
        this.els.dialogue.classList.add('hidden');
        this.els.screens.transition.classList.remove('hidden');
        this.els.transitionText.innerText = text;
        this.pendingScene = next;
    },

    finishTransition() {
        if (!this.pendingScene) return;
        this.els.screens.transition.classList.add('hidden');
        this.jumpTo(this.pendingScene);
        this.pendingScene = null;
    },

    showEnd(data) {
        this.stopRace();
        
        // Останавливаем только фоновые шумы (крылья), 
        // музыку НЕ трогаем (она задается в story.js перед концовкой)
        this.audio.stopAmbience(); 
        
        document.getElementById('character-layer').classList.add('hidden');
        this.els.dialogue.classList.add('hidden');
        
        const endScreen = this.els.screens.end;
        endScreen.classList.remove('hidden');
        
        endScreen.style.setProperty('--end-bg', `url('img/${data.art}.jpg')`);

        endScreen.innerHTML = `
            <div class="end-card">
                <img src="img/${data.art}.jpg" class="end-art-preview">
                <h1 class="end-title">${data.title}</h1>
                <p class="end-desc">${data.desc}</p>
                <button class="btn-primary" onclick="location.reload()">В главное меню</button>
            </div>
        `;
    },

    actions: {
        showAllDragonsForChoice() {
            window.engine.els.slots.center.innerHTML = `
                <!-- Фурия: Впереди слева -->
                <img src="img/dragon_fury_neutral.png" style="position:absolute; left:-20%; height:85%; bottom:0; z-index: 10;">
                <!-- Песня Смерти: Центр -->
                <img src="img/dragon_death_neutral.png" style="position:absolute; left:50%; transform:translateX(-50%); height:90%; bottom:0; z-index: 5;">
                <!-- Громобой: Сзади справа -->
                <img src="img/dragon_thunder_neutral.png" style="position:absolute; right:-25%; height:80%; bottom:0; z-index: 1;">`;
            window.engine.els.slots.center.classList.remove('hidden');
        },
        pickDragon() { window.engine.state.dragon = window.engine.lastChoiceParams; },
        showDragonSolo() {
            window.engine.hideChars();
            let mood = window.engine.state.mood >= 1 ? 'happy' : (window.engine.state.mood <= -1 ? 'angry' : 'neutral');
            window.engine.showChar('center', 'dragon', mood);
        },
        showDragonAndNora() {
            let mood = window.engine.state.mood >= 1 ? 'happy' : (window.engine.state.mood <= -1 ? 'angry' : 'neutral');
            window.engine.showChar('center', 'dragon', mood);
            window.engine.showChar('right', 'nora', 'neutral');
        },
        processFeed() {
            const prefs = { fury:{fish:1,chicken:1,bread:-1,honey:0,eel:-1,rocks:-1}, death:{fish:0,chicken:1,bread:0,honey:1,eel:0,rocks:-1}, thunder:{fish:1,chicken:0,bread:-1,honey:-1,eel:1,rocks:1} };
            window.engine.lastFeedPref = prefs[window.engine.state.dragon][window.engine.lastChoiceParams];
            window.engine.state.mood += window.engine.lastFeedPref;
            window.engine.state.feedCount++;
        },
        processGear() {
            const prefs = { fury:{saddle:1,armor:-1,wings:1,spikes:-1}, death:{saddle:1,armor:1,wings:0,spikes:0}, thunder:{saddle:-1,armor:1,wings:-1,spikes:1} };
            window.engine.lastGearChoice = window.engine.lastChoiceParams;
            window.engine.lastGearPref = prefs[window.engine.state.dragon][window.engine.lastChoiceParams];
            window.engine.state.mood += window.engine.lastGearPref;
        },
        startMiniGame() { window.engine.startRace(); }
    },

    // ГОНКА
    raceInterval: null,
    stopRace() { 
        if(this.raceInterval) clearInterval(this.raceInterval); 
        document.onkeydown = null; 
        this.els.screens.race.classList.add('hidden'); 
        document.querySelectorAll('.obstacle').forEach(e => e.remove());
        // Звук НЕ останавливаем здесь, чтобы победная музыка могла доиграть до экрана концовки
    },
    
    startRace() {
        this.els.dialogue.classList.add('hidden');
        const scr = this.els.screens.race;
        scr.classList.remove('hidden');
        scr.className = `overlay bg-${this.state.dragon === 'thunder' ? 'water' : 'sky'}-race`;
        
        // Включаем музыку и звук крыльев
        this.audio.playMusic('race');
        this.audio.playAmbience('wings');

        scr.innerHTML = `
            <div id="race-ui">
                <div id="race-lives">❤️❤️❤️</div>
                <div id="race-progress-bar"><div id="race-progress-fill"></div></div>
            </div>
            <div id="race-player"><img src="img/race_${this.state.dragon}.gif"></div>
            <div id="mobile-controls">
                <button id="btn-left">◀</button>
                <button id="btn-right">▶</button>
            </div>
        `;
        
        // === ПРОВЕРКА НА ФУРИЮ ===
        const isFury = this.state.dragon === 'fury';

        let race = { 
            dist: 0, 
            lives: 3, 
            playerX: 50, 
            // Фурия стартует быстрее (16), остальные (12)
            speed: isFury ? 20 : 16, 
            obstacles: [],
            spawnCooldown: 0 
        };

        const player = document.getElementById('race-player');
        const fill = document.getElementById('race-progress-fill');
        const livesEl = document.getElementById('race-lives');
        const maxDist = 35000;

        let moveInterval = null;

        // Движение игрока
        const movePlayer = (direction) => {
            if (direction === 'left') race.playerX = Math.max(5, race.playerX - 2.5);
            if (direction === 'right') race.playerX = Math.min(95, race.playerX + 2.5);
            player.style.left = `calc(${race.playerX}% - 60px)`;
        };

        const startMoving = (dir) => {
            if (moveInterval) return;
            moveInterval = setInterval(() => movePlayer(dir), 16);
        };

        const stopMoving = () => {
            clearInterval(moveInterval);
            moveInterval = null;
        };

        // Управление: Клавиатура
        document.onkeydown = (e) => {
            if (e.key === "ArrowLeft") startMoving('left');
            if (e.key === "ArrowRight") startMoving('right');
        };
        document.onkeyup = (e) => {
            if (e.key === "ArrowLeft" || e.key === "ArrowRight") stopMoving();
        };

        // Управление: Сенсор / Мышь
        const btnLeft = document.getElementById('btn-left');
        const btnRight = document.getElementById('btn-right');
        
        btnLeft.addEventListener('mousedown', () => startMoving('left'));
        btnRight.addEventListener('mousedown', () => startMoving('right'));
        btnLeft.addEventListener('touchstart', (e) => { e.preventDefault(); startMoving('left'); });
        btnRight.addEventListener('touchstart', (e) => { e.preventDefault(); startMoving('right'); });
        
        document.addEventListener('mouseup', stopMoving);
        document.addEventListener('touchend', stopMoving);

        // Игровой цикл
        this.raceInterval = setInterval(() => {
            race.dist += race.speed;
            fill.style.width = Math.min(100, (race.dist / maxDist) * 100) + "%";
            
            if (race.spawnCooldown > 0) race.spawnCooldown--;

            // Спавн препятствий
            if (race.spawnCooldown <= 0 && Math.random() < 0.15) {
                const ob = document.createElement('div');
                ob.className = 'obstacle'; 
                ob.style.left = (Math.random() * 80 + 10) + "%"; 
                ob.style.top = "-100px";
                ob.innerHTML = `<img src="img/rock.png">`;
                scr.appendChild(ob); 
                race.obstacles.push({ el: ob, y: -100 });
                race.spawnCooldown = 25; // Задержка между камнями
            }

            // Обработка препятствий
            for (let i = race.obstacles.length - 1; i >= 0; i--) {
                let o = race.obstacles[i];
                o.y += race.speed;
                o.el.style.top = o.y + "px";
                
                const pRect = player.getBoundingClientRect();
                const oRect = o.el.getBoundingClientRect(); 
                const hitMargin = 15; // Хитбокс меньше картинки

                const hit = !(pRect.right < oRect.left + hitMargin || 
                              pRect.left > oRect.right - hitMargin || 
                              pRect.bottom < oRect.top + hitMargin || 
                              pRect.top > oRect.bottom - hitMargin);

                if (hit) {
                    race.lives--;
                    livesEl.innerText = "❤️".repeat(race.lives);
                    o.el.remove();
                    race.obstacles.splice(i, 1);
                    race.speed = Math.max(8, race.speed - 5);
                    
                    // === ВОТ ЭТО МЕСТО: ЗВУК РЫКА ===
                    this.audio.playSfx('roar'); 

                    player.style.filter = "sepia(1) hue-rotate(-50deg) saturate(5)";
                    setTimeout(() => player.style.filter = "none", 300);

                    if (race.lives <= 0) { 
                        this.stopRace(); 
                        stopMoving(); 
                        this.jumpTo('race_lose'); 
                    }
                }
                else if (o.y > window.innerHeight) { 
                    o.el.remove(); 
                    race.obstacles.splice(i, 1); 
                    
                    // === УСКОРЕНИЕ ===
                    // Фурия (0.4) разгоняется быстрее остальных (0.2)
                    race.speed += isFury ? 0.6 : 0.4; 
                }
            }

            if (race.dist >= maxDist) { 
                this.stopRace(); 
                stopMoving(); 
                this.jumpTo('race_win'); 
            }
        }, 20);
    }
};