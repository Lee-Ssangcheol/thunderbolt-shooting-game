// 효과음 시스템
class SoundManager {
    constructor() {
        this.sounds = {};
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return;
        
        try {
            // Electron 환경에서는 IPC를 통해 경로 가져오기
            if (window.electronAPI) {
                const shootPath = await window.electronAPI.getSoundPath('shoot.mp3');
                const explosionPath = await window.electronAPI.getSoundPath('explosion.mp3');
                const collisionPath = await window.electronAPI.getSoundPath('collision.mp3');
                const levelupPath = await window.electronAPI.getSoundPath('levelup.mp3');
                
                console.log('SoundManager 사운드 경로들:');
                console.log('shoot:', shootPath);
                console.log('explosion:', explosionPath);
                console.log('collision:', collisionPath);
                console.log('levelup:', levelupPath);
                
                this.sounds = {
                    shoot: new Audio(shootPath),
                    explosion: new Audio(explosionPath),
                    collision: new Audio(collisionPath),
                    levelup: new Audio(levelupPath)
                };
            } else {
                // 웹 환경에서는 상대 경로 사용
                this.sounds = {
                    shoot: new Audio('sounds/shoot.mp3'),
                    explosion: new Audio('sounds/explosion.mp3'),
                    collision: new Audio('sounds/collision.mp3'),
                    levelup: new Audio('sounds/levelup.mp3')
                };
            }

            // 사운드 볼륨 설정
            Object.values(this.sounds).forEach(sound => {
                sound.volume = 0.3;
            });
            
            this.initialized = true;
        } catch (error) {
            console.error('사운드 매니저 초기화 실패:', error);
        }
    }

    async play(soundName) {
        if (!this.initialized) {
            await this.initialize();
        }
        
        if (this.sounds[soundName]) {
            this.sounds[soundName].currentTime = 0;
            this.sounds[soundName].play().catch(e => console.log('Audio play failed:', e));
        }
    }

    stop(soundName) {
        if (this.sounds[soundName]) {
            this.sounds[soundName].pause();
            this.sounds[soundName].currentTime = 0;
        }
    }

    stopAll() {
        Object.values(this.sounds).forEach(sound => {
            sound.pause();
            sound.currentTime = 0;
        });
    }
}

// 전역 사운드 매니저 인스턴스 생성
const soundManager = new SoundManager();

// window.electronAPI가 준비될 때까지 대기 후 사운드 매니저 초기화
const waitForAPIAndInitSoundManager = () => {
    if (window.electronAPI) {
        soundManager.initialize().then(() => {
            console.log('SoundManager 초기화 완료');
        }).catch(error => {
            console.error('SoundManager 초기화 실패:', error);
        });
    } else {
        setTimeout(waitForAPIAndInitSoundManager, 50);
    }
};

// 사운드 매니저 초기화 시작
waitForAPIAndInitSoundManager(); 