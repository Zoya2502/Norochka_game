window.engine = {
    state: { day: 1, dragon: null, mood: 0, gear: null, feedCount: 0 },
    currentScene: 'start',
    currentStep: 0,
    lastChoiceParams: null,
    pendingScene: null,
    currentChoices: [],
    choiceIndex: 0,
    els: {},

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
        }
    },

    nextLine() { this.currentStep++; this.runStep(); },
    jumpTo(key) { this.currentScene = key; this.currentStep = 0; this.runStep(); },

    renderDialogue(data) {
        this.els.dialogue.classList.remove('hidden');
        this.els.speaker.innerText = data.speaker || "";
        this.els.speaker.style.display = data.speaker ? "block" : "none";
        this.els.text.innerText = data.text.replace('{feedCount+1}', this.state.feedCount + 1);

        if (data.speaker === "Хвойник") this.showChar('left', 'khvoynik', data.mood || 'neutral', 'speak');
        else if (data.speaker === "Предрассветная Мгла") this.showChar('right', 'nora', data.mood || 'neutral', 'speak');
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
        // Скрываем лишнее
        document.getElementById('character-layer').classList.add('hidden');
        this.els.dialogue.classList.add('hidden');
        
        const endScreen = this.els.screens.end;
        endScreen.classList.remove('hidden');

        // 1. Устанавливаем фон для размытия через переменную CSS
        // Это связывает JS с тем кодом ::before в CSS
        endScreen.style.setProperty('--end-bg', `url('img/${data.art}.jpg')`);

        // 2. Рисуем красивую карточку
        endScreen.innerHTML = `
            <div class="end-card">
                <!-- Четкая картинка сверху -->
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
                <img src="img/dragon_fury_neutral.png" style="position:absolute; left:-30%; height:75%; bottom:0; z-index: 10;">
                <img src="img/dragon_death_neutral.png" style="position:absolute; left:50%; transform:translateX(-50%); height:90%; bottom:0; z-index: 5;">
                <img src="img/dragon_thunder_neutral.png" style="position:absolute; right:-30%; height:75%; bottom:0; z-index: 1;">`;
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
        // Удаляем старые препятствия
        document.querySelectorAll('.obstacle').forEach(e => e.remove());
    },
    
    // В файле engine.js замени ВСЮ функцию startRace

startRace() {
    this.els.dialogue.classList.add('hidden');
    const scr = this.els.screens.race;
    scr.classList.remove('hidden');
    scr.className = `overlay bg-${this.state.dragon === 'thunder' ? 'water' : 'sky'}-race`;
    
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
    
    let race = { 
        dist: 0, 
        lives: 3, 
        playerX: 50, 
        speed: 12, // Чуть снизил базовую скорость для управляемости
        obstacles: [],
        spawnCooldown: 0 // Таймер, чтобы камни не летели кучей
    };

    const player = document.getElementById('race-player');
    const fill = document.getElementById('race-progress-fill');
    const livesEl = document.getElementById('race-lives');
    const maxDist = 10000;

    let moveInterval = null;

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

    // Управление
    document.onkeydown = (e) => {
        if (e.key === "ArrowLeft") startMoving('left');
        if (e.key === "ArrowRight") startMoving('right');
    };
    document.onkeyup = (e) => {
        if (e.key === "ArrowLeft" || e.key === "ArrowRight") stopMoving();
    };

    const btnLeft = document.getElementById('btn-left');
    const btnRight = document.getElementById('btn-right');
    btnLeft.addEventListener('mousedown', () => startMoving('left'));
    btnRight.addEventListener('mousedown', () => startMoving('right'));
    btnLeft.addEventListener('touchstart', (e) => { e.preventDefault(); startMoving('left'); });
    btnRight.addEventListener('touchstart', (e) => { e.preventDefault(); startMoving('right'); });
    document.addEventListener('mouseup', stopMoving);
    document.addEventListener('touchend', stopMoving);

    // ОСНОВНОЙ ЦИКЛ ГОНКИ
    this.raceInterval = setInterval(() => {
        race.dist += race.speed;
        fill.style.width = Math.min(100, (race.dist / maxDist) * 100) + "%";
        
        // Уменьшаем таймер спавна
        if (race.spawnCooldown > 0) race.spawnCooldown--;

        // Спавн препятствий (Только если таймер истек)
        if (race.spawnCooldown <= 0 && Math.random() < 0.08) {
            const ob = document.createElement('div');
            ob.className = 'obstacle'; 
            // Спавним в диапазоне 10% - 90% ширины
            ob.style.left = (Math.random() * 80 + 10) + "%"; 
            ob.style.top = "-100px";
            ob.innerHTML = `<img src="img/rock.png">`;
            scr.appendChild(ob); 
            race.obstacles.push({ el: ob, y: -100 });
            
            // Ставим задержку перед следующим камнем (25 кадров = ~0.5 сек минимум)
            race.spawnCooldown = 5; 
        }

        // Движение препятствий
        for (let i = race.obstacles.length - 1; i >= 0; i--) {
            let o = race.obstacles[i];
            o.y += race.speed;
            o.el.style.top = o.y + "px";
            
            const pRect = player.getBoundingClientRect();
            // Хитбокс камня делаем чуть меньше картинки для честности (+15px отступы)
            const oRect = o.el.getBoundingClientRect(); 
            const hitMargin = 15;

            const hit = !(pRect.right < oRect.left + hitMargin || 
                          pRect.left > oRect.right - hitMargin || 
                          pRect.bottom < oRect.top + hitMargin || 
                          pRect.top > oRect.bottom - hitMargin);

            if (hit) {
                race.lives--;
                livesEl.innerText = "❤️".repeat(race.lives);
                o.el.remove();
                race.obstacles.splice(i, 1);
                race.speed = Math.max(8, race.speed - 5); // Штраф скорости
                
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
                race.speed += 0.2; // Небольшое ускорение
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