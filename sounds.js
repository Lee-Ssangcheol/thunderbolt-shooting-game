// 효과음 시스템
class SoundManager {
    constructor() {
        this.sounds = {
            shoot: new Audio('sounds/shoot.mp3'),
            explosion: new Audio('sounds/explosion.mp3'),
            collision: new Audio('sounds/collision.mp3')
        };

        // 사운드 볼륨 설정
        Object.values(this.sounds).forEach(sound => {
            sound.volume = 0.3;
        });
    }

    play(soundName) {
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