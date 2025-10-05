// 게임 상수 정의
const SPECIAL_WEAPON_MAX_CHARGE = 2000;  // 특수무기 최대 충전량 (2000점으로 완화)
const SPECIAL_WEAPON_CHARGE_RATE = 10;   // 특수무기 충전 속도
const TOP_EFFECT_ZONE = 20;  // 상단 효과 무시 영역 (픽셀)

// 캔버스 설정
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// 캔버스 크기 설정 (사운드 패널을 위한 여백 추가)
function resizeCanvas() {
    const container = document.getElementById('canvas-container');
    if (container) {
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        
        // 컨테이너 스타일 조정
        container.style.height = 'calc(100vh - 100px)';  // 상하 여백 동일하게
        container.style.position = 'relative';
        container.style.overflow = 'hidden';
        
        // 캔버스 스타일 조정
        canvas.style.borderRadius = '0';  // 모서리를 각지게
        
        // 캔버스 크기를 원래대로 복구
        canvas.width = 750;  // 원래 크기로 복구
        canvas.height = 800;  // 캔버스 높이를 800픽셀로 수정
    }
}

// 창 크기 변경 시 캔버스 크기 조정
window.addEventListener('resize', resizeCanvas);

// 초기 캔버스 크기 설정
resizeCanvas();

// 사운드 관리 시스템
class GameSoundManager {
    constructor() {
        this.sounds = {};
        this.audioContext = null;
        this.audioBuffers = {};  // Web Audio API용 오디오 버퍼
        this.initialized = false;
        this.volume = 0.1;
        this.enabled = true;
        this.lastCollisionTime = 0;
        this.collisionSoundCooldown = 300;
        this.useWebAudioAPI = true;  // Web Audio API 사용 여부
    }

    async initialize() {
        if (this.initialized) {
            console.log('사운드 매니저가 이미 초기화됨');
            return;
        }
        
        console.log('사운드 매니저 초기화 시작');
        try {
            // Web Audio API 초기화
            if (typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined') {
                this.audioContext = new (AudioContext || webkitAudioContext)();
                console.log('Web Audio API 초기화 완료');
                
                // Web Audio API를 사용하여 사운드 로드
                await this.loadSoundsWithWebAudioAPI();
            } else {
                console.log('Web Audio API를 지원하지 않음, HTML5 Audio 사용');
                this.useWebAudioAPI = false;
                await this.loadSoundsWithHTML5Audio();
            }
            
            this.initialized = true;
            console.log('사운드 매니저 초기화 완료, 사운드 개수:', Object.keys(this.sounds).length);
            
            // 초기화된 사운드 상태 확인
            Object.keys(this.sounds).forEach(soundName => {
                const sound = this.sounds[soundName];
                console.log(`사운드 ${soundName}: src=${sound.src}, readyState=${sound.readyState}`);
            });
            
            // 1초 후 사운드 상태 재확인
            setTimeout(() => {
                console.log('=== 1초 후 사운드 상태 재확인 ===');
                Object.keys(this.sounds).forEach(soundName => {
                    const sound = this.sounds[soundName];
                    console.log(`사운드 ${soundName}: src=${sound.src}, readyState=${sound.readyState}, duration=${sound.duration}`);
                });
            }, 1000);
            
        } catch (error) {
            console.error('사운드 초기화 실패:', error);
            // Web Audio API 실패 시 HTML5 Audio로 fallback
            console.log('Web Audio API 실패, HTML5 Audio로 fallback');
            this.useWebAudioAPI = false;
            await this.loadSoundsWithHTML5Audio();
            this.initialized = true;
        }
    }
    
    // Web Audio API를 사용한 사운드 로드
    async loadSoundsWithWebAudioAPI() {
        console.log('Web Audio API로 사운드 로드 시작');
        const soundFiles = ['shoot', 'explosion', 'collision', 'levelup', 'warning'];
        
        for (const soundName of soundFiles) {
            try {
                let soundPath;
                if (window.electronAPI) {
                    soundPath = await window.electronAPI.getSoundPath(`${soundName}.mp3`);
                } else {
                    soundPath = `sounds/${soundName}.mp3`;
                }
                
                console.log(`Loading sound with Web Audio API: ${soundName} from ${soundPath}`);
                
                // Fetch API로 오디오 파일 로드
                const response = await fetch(soundPath);
                const arrayBuffer = await response.arrayBuffer();
                
                // Web Audio API로 디코딩
                const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
                this.audioBuffers[soundName] = audioBuffer;
                
                // HTML5 Audio도 함께 로드 (fallback용)
                this.sounds[soundName] = new Audio();
                this.sounds[soundName].src = soundPath;
                this.sounds[soundName].volume = this.volume;
                this.sounds[soundName].preload = 'auto';
                
                console.log(`사운드 로딩 완료 (Web Audio API): ${soundName}`);
                
            } catch (error) {
                console.error(`Web Audio API 사운드 로딩 실패 (${soundName}):`, error);
                // Web Audio API 실패 시 HTML5 Audio만 사용
                await this.loadSingleSoundWithHTML5Audio(soundName);
            }
        }
    }
    
    // HTML5 Audio를 사용한 사운드 로드
    async loadSoundsWithHTML5Audio() {
        console.log('HTML5 Audio로 사운드 로드 시작');
        const soundFiles = ['shoot', 'explosion', 'collision', 'levelup', 'warning'];
        
        for (const soundName of soundFiles) {
            await this.loadSingleSoundWithHTML5Audio(soundName);
        }
    }
    
    // 단일 사운드를 HTML5 Audio로 로드
    async loadSingleSoundWithHTML5Audio(soundName) {
        try {
            let soundPath;
            if (window.electronAPI) {
                soundPath = await window.electronAPI.getSoundPath(`${soundName}.mp3`);
            } else {
                soundPath = `sounds/${soundName}.mp3`;
            }
            
            console.log(`Loading sound with HTML5 Audio: ${soundName} from ${soundPath}`);
            
            this.sounds[soundName] = new Audio();
            this.sounds[soundName].src = soundPath;
            this.sounds[soundName].volume = this.volume;
            this.sounds[soundName].preload = 'auto';
            
            // 로딩 완료 이벤트 리스너
            this.sounds[soundName].addEventListener('canplaythrough', () => {
                console.log(`사운드 로딩 완료 (HTML5): ${soundName}`);
            });
            
            this.sounds[soundName].addEventListener('error', (e) => {
                console.error(`사운드 로딩 실패 (HTML5): ${soundName}`, e);
            });
            
            // 사운드 로드 시작
            this.sounds[soundName].load();
            
        } catch (error) {
            console.error(`HTML5 Audio 사운드 로딩 실패 (${soundName}):`, error);
        }
    }

    async play(soundName, options = {}) {
        console.log('GameSoundManager.play 호출됨:', soundName);
        console.log('사운드 매니저 활성화 상태:', this.enabled);
        console.log('사운드 매니저 초기화 상태:', this.initialized);
        
        if (!this.enabled || !this.initialized) {
            console.log('사운드 재생 실패 - 매니저가 비활성화되었거나 초기화되지 않음');
            return;
        }
        
        if (this.sounds[soundName]) {
            console.log('사운드 파일 존재함:', soundName);
            // 충돌음의 경우 쿨다운 적용
            if (soundName === 'collision') {
                const now = Date.now();
                if (now - this.lastCollisionTime < this.collisionSoundCooldown) {
                    console.log('충돌음 쿨다운 중 - 재생 건너뜀');
                    return;
                }
                this.lastCollisionTime = now;
            }
            
            try {
                // Web Audio API를 사용한 고품질 재생 시도
                if (this.useWebAudioAPI && this.audioContext && this.audioBuffers[soundName]) {
                    await this.playWithWebAudioAPI(soundName, options);
                } else {
                    // HTML5 Audio를 사용한 재생
                    await this.playWithHTML5Audio(soundName, options);
                }
            } catch (e) {
                console.error('Audio play failed:', e);
                // 재생 실패 시 HTML5 Audio로 fallback
                try {
                    await this.playWithHTML5Audio(soundName, options);
                } catch (fallbackError) {
                    console.error('Fallback audio play also failed:', fallbackError);
                }
            }
        } else {
            console.log('사운드 파일이 존재하지 않음:', soundName);
            console.log('사용 가능한 사운드:', Object.keys(this.sounds));
        }
    }
    
    // Web Audio API를 사용한 고품질 사운드 재생
    async playWithWebAudioAPI(soundName, options = {}) {
        try {
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            
            const audioBuffer = this.audioBuffers[soundName];
            const source = this.audioContext.createBufferSource();
            const gainNode = this.audioContext.createGain();
            
            // 고품질 오디오 설정
            source.buffer = audioBuffer;
            source.playbackRate.setValueAtTime(1.0, this.audioContext.currentTime);
            
            // 오디오 체인 연결
            source.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            // 볼륨 설정 (부드러운 페이드 인)
            gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
            const volumeMultiplier = (typeof options.volume === 'number') ? options.volume : 1;
            const targetVolume = Math.max(0, Math.min(1, this.volume * volumeMultiplier));
            gainNode.gain.linearRampToValueAtTime(targetVolume, this.audioContext.currentTime + 0.01);
            
            // 사운드 재생
            source.start(0);
            
            console.log('Web Audio API로 사운드 재생 성공:', soundName);
            
            // 재생 완료 후 정리
            source.onended = () => {
                source.disconnect();
                gainNode.disconnect();
            };
            
        } catch (error) {
            console.error('Web Audio API 재생 실패:', error);
            throw error;
        }
    }
    
    // HTML5 Audio를 사용한 사운드 재생
    async playWithHTML5Audio(soundName, options = {}) {
        try {
            const sound = this.sounds[soundName];
            
            // 사운드가 존재하고 src가 설정되어 있는지 확인
            if (!sound || !sound.src) {
                console.error('사운드가 초기화되지 않음:', soundName);
                return;
            }
            
            // 사운드가 로딩되지 않은 경우 대기
            if (sound.readyState < 2) { // HAVE_CURRENT_DATA 미만
                console.log('사운드 로딩 대기 중:', soundName);
                await new Promise(resolve => {
                    const onCanPlay = () => {
                        sound.removeEventListener('canplaythrough', onCanPlay);
                        sound.removeEventListener('error', onError);
                        clearTimeout(timeoutId);
                        resolve();
                    };
                    
                    const onError = (e) => {
                        sound.removeEventListener('canplaythrough', onCanPlay);
                        sound.removeEventListener('error', onError);
                        clearTimeout(timeoutId);
                        console.error('사운드 로딩 실패:', soundName, e);
                        resolve();
                    };
                    
                    sound.addEventListener('canplaythrough', onCanPlay);
                    sound.addEventListener('error', onError);
                    
                    // 3초 타임아웃
                    const timeoutId = setTimeout(() => {
                        sound.removeEventListener('canplaythrough', onCanPlay);
                        sound.removeEventListener('error', onError);
                        console.log('사운드 로딩 타임아웃:', soundName);
                        resolve();
                    }, 3000);
                });
            }
            
            // 사운드 재생
            sound.currentTime = 0;
            const volumeMultiplier = (typeof options.volume === 'number') ? options.volume : 1;
            sound.volume = Math.max(0, Math.min(1, this.volume * volumeMultiplier));
            
            // 사운드 품질 향상을 위한 추가 설정
            sound.playbackRate = 1.0;
            sound.preservesPitch = true;
            
            console.log('HTML5 Audio로 사운드 재생 시도:', soundName);
            await sound.play();
            
        } catch (error) {
            console.error('HTML5 Audio 재생 실패:', error);
            throw error;
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

    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        Object.values(this.sounds).forEach(sound => {
            // 볼륨을 단계적으로 설정하여 왜곡 방지
            if (sound.readyState >= 2) { // HAVE_CURRENT_DATA 이상
                sound.volume = this.volume;
            }
        });
        
        // Web Audio API 볼륨도 조정
        if (this.audioContext && this.audioContext.state === 'running') {
            // 오디오 컨텍스트의 마스터 볼륨 조정
            console.log('Web Audio API 볼륨 조정:', this.volume);
        }
    }

    setEnabled(enabled) {
        this.enabled = enabled;
        if (!enabled) {
            this.stopAll();
        }
    }

    getVolume() {
        return this.volume;
    }

    isEnabled() {
        return this.enabled;
    }
    
    // 사운드 품질 진단
    diagnoseSoundQuality(soundName) {
        console.log(`=== 사운드 품질 진단 - ${soundName} ===`);
        
        if (this.sounds[soundName]) {
            const sound = this.sounds[soundName];
            console.log('HTML5 Audio 정보:');
            console.log('  - src:', sound.src);
            console.log('  - readyState:', sound.readyState);
            console.log('  - duration:', sound.duration);
            console.log('  - volume:', sound.volume);
            console.log('  - paused:', sound.paused);
            console.log('  - ended:', sound.ended);
            console.log('  - error:', sound.error);
        } else {
            console.log('HTML5 Audio: 사운드가 존재하지 않음');
        }
        
        if (this.audioBuffers[soundName]) {
            const buffer = this.audioBuffers[soundName];
            console.log('Web Audio API 정보:');
            console.log('  - duration:', buffer.duration);
            console.log('  - numberOfChannels:', buffer.numberOfChannels);
            console.log('  - sampleRate:', buffer.sampleRate);
            console.log('  - length:', buffer.length);
        } else {
            console.log('Web Audio API: 오디오 버퍼가 존재하지 않음');
        }
        
        if (this.audioContext) {
            console.log('Web Audio API 컨텍스트:');
            console.log('  - 상태:', this.audioContext.state);
            console.log('  - 샘플레이트:', this.audioContext.sampleRate);
            console.log('  - 현재 시간:', this.audioContext.currentTime);
        } else {
            console.log('Web Audio API: 컨텍스트가 존재하지 않음');
        }
        
        console.log('사용 중인 재생 방식:', this.useWebAudioAPI ? 'Web Audio API' : 'HTML5 Audio');
        console.log('=====================================');
    }
    
    // 모든 사운드 품질 진단
    diagnoseAllSounds() {
        console.log('=== 모든 사운드 품질 진단 ===');
        Object.keys(this.sounds).forEach(soundName => {
            this.diagnoseSoundQuality(soundName);
        });
        console.log('=== 진단 완료 ===');
    }
}

// 전역 사운드 매니저 인스턴스 생성
const gameSoundManager = new GameSoundManager();

// window.electronAPI가 준비될 때까지 대기 후 사운드 초기화
const waitForAPIAndInitSounds = () => {
    console.log('waitForAPIAndInitSounds 호출됨');
    console.log('window.electronAPI 존재:', !!window.electronAPI);
    
    if (window.electronAPI) {
        console.log('Electron API 발견, 사운드 매니저 초기화 시작');
        gameSoundManager.initialize().then(() => {
            console.log('사운드 매니저 초기화 완료 (Promise)');
        }).catch(error => {
            console.error('사운드 매니저 초기화 실패 (Promise):', error);
        });
    } else {
        console.log('Electron API 없음, 웹 환경으로 사운드 매니저 초기화');
        gameSoundManager.initialize().then(() => {
            console.log('웹 환경 사운드 매니저 초기화 완료');
        }).catch(error => {
            console.error('웹 환경 사운드 매니저 초기화 실패:', error);
        });
    }
};

// 사운드 초기화 시작
console.log('사운드 초기화 시작');

// 사용자 상호작용 후 사운드 초기화 (브라우저 정책 준수)
const initSoundsAfterInteraction = () => {
    waitForAPIAndInitSounds();
    // 이벤트 리스너 제거
    document.removeEventListener('click', initSoundsAfterInteraction);
    document.removeEventListener('keydown', initSoundsAfterInteraction);
    document.removeEventListener('touchstart', initSoundsAfterInteraction);
};

// 사용자 상호작용 이벤트 리스너 추가
document.addEventListener('click', initSoundsAfterInteraction, { once: true });
document.addEventListener('keydown', initSoundsAfterInteraction, { once: true });
document.addEventListener('touchstart', initSoundsAfterInteraction, { once: true });

// 자동 초기화도 시도 (일부 브라우저에서 작동)
setTimeout(() => {
    if (!gameSoundManager.initialized) {
        console.log('자동 사운드 초기화 시도');
        waitForAPIAndInitSounds();
    }
}, 1000);

// 기존 사운드 변수들을 사운드 매니저로 대체
const shootSound = { play: () => gameSoundManager.play('shoot') };
const explosionSound = { play: () => gameSoundManager.play('explosion') };
const collisionSound = { play: () => gameSoundManager.play('collision') };
const levelUpSound = { play: () => gameSoundManager.play('levelup') };

// 플레이어 우주선
const player = {
    x: canvas.width / 2 - (240 * 0.7 * 0.7 * 0.8) / 2, // 중앙 정렬
    y: canvas.height - 80, // 30픽셀 위로 올림
    width: 240 * 0.7 * 0.7 * 0.8,   // 폭을 80%로 줄임
    height: 71.5,   // 높이를 110%로 늘림
    speed: 8
};

// 두 번째 비행기
const secondPlane = {
    x: canvas.width / 2 - 60,
    y: canvas.height - 80, // 30픽셀 위로 올림
    width: 40,
    height: 40,
    speed: 8
};

// 게임 상태 변수 설정
let bullets = [];          // 총알 배열
let enemies = [];         // 적 배열
let explosions = [];      // 폭발 효과 배열
let gameLevel = 1;        // 게임 레벨
let levelScore = 0;       // 레벨 점수
let levelUpScore = 3000;  // 레벨업에 필요한 점수
let score = 0;           // 현재 점수
let highScore = 0;       // 최고 점수 (초기값 0으로 설정)
let hasSecondPlane = false;  // 두 번째 비행기 보유 여부
let secondPlaneTimer = 0;    // 두 번째 비행기 타이머
let lastSecondPlaneScore = 0; // 마지막으로 추가 비행기가 등장한 점수
let isPaused = false;     // 일시정지 상태
let collisionCount = 0;   // 충돌 횟수
let isGameOver = false;   // 게임 오버 상태
let flashTimer = 0;       // 깜박임 효과 타이머
let flashDuration = 500;  // 깜박임 지속 시간
let gameOverStartTime = null;  // 게임 오버 시작 시간
let isSnakePatternActive = false;  // 뱀 패턴 활성화 상태
let processedCollisions = new Set(); // 처리된 충돌 추적
let snakePatternTimer = 0;  // 뱀 패턴 타이머
let snakePatternDuration = 10000;  // 뱀 패턴 지속 시간 (10초)
let snakeEnemies = [];  // 뱀 패턴의 적군 배열
let snakePatternInterval = 0;  // 뱀 패턴 생성 간격
let snakeGroups = [];  // 뱀 패턴 그룹 배열
let lastSnakeGroupTime = 0;  // 마지막 뱀 그룹 생성 시간
let bossActive = false;
let bossHealth = 0;
let bossPattern = 0;
let specialWeaponCharged = false;
let specialWeaponCharge = 0;
let specialWeaponCount = 0;  // 특수무기 개수
let enemySpawnRate = 2000;  // 적 생성 주기 (ms)
let enemySpeed = 2;  // 적 이동 속도
let lastCollisionTime = 0;  // 마지막 충돌 시간
let collisionSoundCooldown = 100;  // 충돌음 쿨다운 시간 (300ms → 100ms로 단축)
let shieldedHelicopterDestroyed = 0;  // 보호막 헬리콥터 파괴 카운터
let lifeWarningBlinkTimer = 0;  // 목숨 경고 깜빡임 타이머
let lifeWarningBlinkDuration = 2000;  // 목숨 경고 깜빡임 지속 시간 (2초)
let lastLifeCount = 0;  // 이전 목숨 개수 (변화 감지용)

// 보스 패턴 상수 삭제됨

// 키보드 입력 상태
const keys = {
    ArrowLeft: false,
    ArrowRight: false,
    ArrowUp: false,
    ArrowDown: false,
    Space: false,
    KeyB: false,  // 특수 무기 발사 키를 V에서 B로 변경
    F5: false,
    KeyP: false,
    Enter: false  // Enter 키 추가
};

// 난이도 설정
const difficultySettings = {
    1: {
        enemySpeed: 2,
        enemySpawnRate: 0.3,
        maxEnemies: 5,
        enemyHealth: 1,
        patternChance: 0.3,
        fireInterval: 3000,    // 6000에서 3000으로 감소
        bombDropChance: 0.2,   // 폭탄 발사 확률
        bulletSpeed: 5,        // 총알 속도
        specialPatternChance: 0.1  // 특수 패턴 확률
    },
    2: {
        enemySpeed: 2.5,
        enemySpawnRate: 0.4,
        maxEnemies: 6,
        enemyHealth: 2,
        patternChance: 0.4,
        fireInterval: 2500,    // 5000에서 2500으로 감소
        bombDropChance: 0.3,
        bulletSpeed: 6,
        specialPatternChance: 0.2
    },
    3: {
        enemySpeed: 3,
        enemySpawnRate: 0.5,
        maxEnemies: 7,
        enemyHealth: 3,
        patternChance: 0.5,
        fireInterval: 2000,    // 4000에서 2000으로 감소
        bombDropChance: 0.4,
        bulletSpeed: 7,
        specialPatternChance: 0.3
    },
    4: {
        enemySpeed: 3.5,
        enemySpawnRate: 0.6,
        maxEnemies: 8,
        enemyHealth: 4,
        patternChance: 0.6,
        fireInterval: 1500,    // 3000에서 1500으로 감소
        bombDropChance: 0.5,
        bulletSpeed: 8,
        specialPatternChance: 0.4
    },
    5: {
        enemySpeed: 4,
        enemySpawnRate: 0.7,
        maxEnemies: 8,
        enemyHealth: 5,
        patternChance: 0.7,
        fireInterval: 1200,    // 2500에서 1200으로 감소
        bombDropChance: 0.6,
        bulletSpeed: 10,
        specialPatternChance: 0.5
    }
};

// IndexedDB 설정
const dbName = 'SpaceShooterGameDB_v1';
const dbVersion = 1;
const storeName = 'highScores';

// 최고 점수 로드 함수
async function loadHighScore() {
    try {
        console.log('점수 로드 시작...');
        let maxScore = 0;
        
        // localStorage에서 점수 로드 (가장 먼저)
        try {
            const localStorageScore = parseInt(localStorage.getItem('ThunderboltHighScore')) || 0;
            const backupScore = parseInt(localStorage.getItem('ThunderboltHighScore_backup')) || 0;
            maxScore = Math.max(maxScore, localStorageScore, backupScore);
            console.log('localStorage 점수:', { localStorageScore, backupScore });
        } catch (e) {
            console.warn('localStorage 점수 로드 실패:', e);
        }
        
        // sessionStorage에서 점수 로드
        try {
            const sessionScore = parseInt(sessionStorage.getItem('ThunderboltCurrentHighScore')) || 0;
            maxScore = Math.max(maxScore, sessionScore);
            console.log('sessionStorage 점수:', sessionScore);
        } catch (e) {
            console.warn('sessionStorage 점수 로드 실패:', e);
        }
        
        console.log('최종 선택된 점수:', maxScore);
        return maxScore;
    } catch (error) {
        console.error('점수 로드 중 오류:', error);
        return 0;
    }
}

// IndexedDB 초기화 함수
function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, dbVersion);

        request.onerror = (event) => {
            console.error('IndexedDB 초기화 실패:', event.target.error);
            reject(event.target.error);
        };

        request.onsuccess = (event) => {
            const db = event.target.result;
            console.log('IndexedDB 초기화 성공');
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(storeName)) {
                const store = db.createObjectStore(storeName, { keyPath: 'id' });
                store.createIndex('score', 'score', { unique: false });
                console.log('점수 저장소 생성 완료');
            }
        };
    });
}

// IndexedDB에 점수 저장
async function saveScoreToIndexedDB(score) {
    try {
        const db = await initDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            
            const scoreData = {
                id: 'currentHighScore',
                score: score,
                timestamp: Date.now()
            };

            const request = store.put(scoreData);

            request.onsuccess = () => {
                console.log('IndexedDB 점수 저장 성공:', score);
                // localStorage에도 동시에 저장
                try {
                    localStorage.setItem('ThunderboltHighScore', score.toString());
                    localStorage.setItem('ThunderboltHighScore_backup', score.toString());
                    localStorage.setItem('ThunderboltHighScore_timestamp', Date.now().toString());
                    console.log('localStorage 동시 저장 성공');
                } catch (e) {
                    console.warn('localStorage 동시 저장 실패:', e);
                }
                resolve(true);
            };

            request.onerror = (event) => {
                console.error('IndexedDB 점수 저장 실패:', event.target.error);
                // IndexedDB 실패 시 localStorage에만 저장
                try {
                    localStorage.setItem('ThunderboltHighScore', score.toString());
                    localStorage.setItem('ThunderboltHighScore_backup', score.toString());
                    localStorage.setItem('ThunderboltHighScore_timestamp', Date.now().toString());
                    console.log('localStorage 대체 저장 성공');
                    resolve(true);
                } catch (e) {
                    console.error('localStorage 대체 저장도 실패:', e);
                    reject(e);
                }
            };

            // 트랜잭션 완료 대기
            transaction.oncomplete = () => {
                console.log('IndexedDB 트랜잭션 완료');
            };

            transaction.onerror = (event) => {
                console.error('IndexedDB 트랜잭션 실패:', event.target.error);
            };
        });
    } catch (error) {
        console.error('IndexedDB 저장 중 오류:', error);
        // IndexedDB 실패 시 localStorage에만 저장
        try {
            localStorage.setItem('ThunderboltHighScore', score.toString());
            localStorage.setItem('ThunderboltHighScore_backup', score.toString());
            localStorage.setItem('ThunderboltHighScore_timestamp', Date.now().toString());
            console.log('localStorage 대체 저장 성공');
            return true;
        } catch (e) {
            console.error('localStorage 대체 저장도 실패:', e);
            return false;
        }
    }
}

// IndexedDB에서 점수 로드
async function loadScoreFromIndexedDB() {
    try {
        const db = await initDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get('currentHighScore');

            request.onsuccess = () => {
                const result = request.result;
                const score = result ? result.score : 0;
                console.log('IndexedDB에서 로드된 점수:', score);
                
                // localStorage와 비교하여 더 높은 점수 사용
                try {
                    const localScore = parseInt(localStorage.getItem('ThunderboltHighScore')) || 0;
                    const backupScore = parseInt(localStorage.getItem('ThunderboltHighScore_backup')) || 0;
                    const maxScore = Math.max(score, localScore, backupScore);
                    
                    if (maxScore > score) {
                        console.log('localStorage에서 더 높은 점수 발견:', maxScore);
                        // 더 높은 점수를 IndexedDB에 저장
                        saveScoreToIndexedDB(maxScore).catch(console.error);
                    }
                    
                    resolve(maxScore);
                } catch (e) {
                    console.warn('localStorage 비교 중 오류:', e);
                    resolve(score);
                }
            };

            request.onerror = (event) => {
                console.error('IndexedDB 점수 로드 실패:', event.target.error);
                // IndexedDB 실패 시 localStorage에서 로드
                try {
                    const localScore = parseInt(localStorage.getItem('ThunderboltHighScore')) || 0;
                    const backupScore = parseInt(localStorage.getItem('ThunderboltHighScore_backup')) || 0;
                    const maxScore = Math.max(localScore, backupScore);
                    console.log('localStorage에서 로드된 점수:', maxScore);
                    resolve(maxScore);
                } catch (e) {
                    console.error('localStorage 로드도 실패:', e);
                    reject(e);
                }
            };
        });
    } catch (error) {
        console.error('IndexedDB 로드 중 오류:', error);
        // localStorage에서 로드 시도
        try {
            const localScore = parseInt(localStorage.getItem('ThunderboltHighScore')) || 0;
            const backupScore = parseInt(localStorage.getItem('ThunderboltHighScore_backup')) || 0;
            const maxScore = Math.max(localScore, backupScore);
            console.log('localStorage에서 로드된 점수:', maxScore);
            return maxScore;
        } catch (e) {
            console.error('localStorage 로드도 실패:', e);
            return 0;
        }
    }
}

// 점수 저장 함수
async function saveHighScoreDirectly(newScore, reason = '') {
    try {
        // 현재 저장된 점수 확인
        const currentStored = parseInt(localStorage.getItem('ThunderboltHighScore')) || 0;
        console.log('현재 저장된 점수:', currentStored, '새 점수:', newScore);
        
        // 새 점수가 더 높은 경우에만 저장
        if (newScore > currentStored) {
            // localStorage에 저장 (가장 먼저)
            try {
                localStorage.setItem('ThunderboltHighScore', newScore.toString());
                localStorage.setItem('ThunderboltHighScore_backup', newScore.toString());
                localStorage.setItem('ThunderboltHighScore_timestamp', Date.now().toString());
                console.log('localStorage 저장 성공');
            } catch (e) {
                console.warn('localStorage 저장 실패:', e);
            }
            
            // sessionStorage에 저장
            try {
                sessionStorage.setItem('ThunderboltCurrentHighScore', newScore.toString());
                console.log('sessionStorage 저장 성공');
            } catch (e) {
                console.warn('sessionStorage 저장 실패:', e);
            }
            
            // IndexedDB에 저장
            try {
                const saved = await saveScoreToIndexedDB(newScore);
                if (!saved) {
                    throw new Error('IndexedDB 저장 실패');
                }
                console.log('IndexedDB 저장 성공');
            } catch (e) {
                console.error('IndexedDB 저장 실패:', e);
            }
            
            console.log(`최고 점수 저장 성공 (${reason}):`, {
                previous: currentStored,
                new: newScore
            });
        }
        return true;
    } catch (error) {
        console.error('점수 저장 실패:', error);
        return false;
    }
}

// 점수 관리 객체 수정
const ScoreManager = {
    async init() {
        try {
            console.log('ScoreManager 초기화 시작');
            // 점수 초기화는 리셋 버튼을 통해서만 수행
            score = 0;
            levelScore = 0;
            
            // 저장된 최고점수 로드
            const savedHighScore = await this.getHighScore();
            highScore = savedHighScore;
            
            console.log('초기화 완료 - 현재 최고점수:', highScore);
        } catch (error) {
            console.error('ScoreManager 초기화 실패:', error);
        }
    },

    async save() {
        try {
            if (score > highScore) {
                highScore = score;
                // Electron 환경인 경우 IPC를 통해 저장
                if (window.electron) {
                    const saved = await window.electron.ipcRenderer.invoke('save-score', highScore);
                    if (saved) {
                        console.log('Electron IPC를 통한 점수 저장 성공:', highScore);
                    }
                }
                // localStorage에도 저장
                await saveHighScoreDirectly(highScore, 'ScoreManager.save');
            }
        } catch (error) {
            console.error('점수 저장 실패:', error);
        }
    },

    async getHighScore() {
        try {
            // Electron 환경인 경우 IPC를 통해 로드
            if (window.electron) {
                const electronScore = await window.electron.ipcRenderer.invoke('load-score');
                if (electronScore > 0) {
                    return electronScore;
                }
            }
            // 브라우저 환경이거나 Electron에서 점수를 가져오지 못한 경우
            return await loadHighScore();
        } catch (error) {
            console.error('최고 점수 로드 실패:', error);
            return 0;
        }
    },

    async reset() {
        try {
            // Electron 환경인 경우 IPC를 통해 초기화
            if (window.electron) {
                await window.electron.ipcRenderer.invoke('reset-score');
            }
            
            // localStorage 초기화
            localStorage.removeItem('ThunderboltHighScore');
            localStorage.removeItem('ThunderboltHighScore_backup');
            localStorage.removeItem('ThunderboltHighScore_timestamp');
            sessionStorage.removeItem('ThunderboltCurrentHighScore');
            
            score = 0;
            levelScore = 0;
            gameLevel = 1;
            
            highScore = await this.getHighScore();
            console.log('게임 리셋 - 현재 최고 점수:', highScore);
        } catch (error) {
            console.error('게임 리셋 중 오류:', error);
        }
    }
};

// 자동 저장 기능 수정
setInterval(async () => {
    if (score > 0 || highScore > 0) {
        const currentMax = Math.max(score, highScore);
        await saveHighScoreDirectly(currentMax, 'AutoSave');
    }
}, 5000);

// 브라우저 종료 시 점수 저장을 위한 이벤트 핸들러들
function setupExitHandlers() {
    // 페이지 가시성 변경 시
    document.addEventListener('visibilitychange', async () => {
        if (document.hidden) {
            const currentMax = Math.max(score, highScore);
            if (currentMax > 0) {
                await saveHighScoreDirectly(currentMax, 'visibilitychange');
            }
        }
    });

    // 페이지 언로드 시
    window.addEventListener('unload', async (event) => {
        const finalScore = Math.max(score, highScore);
        if (finalScore > 0) {
            // 동기적으로 localStorage에 저장
            try {
                localStorage.setItem('ThunderboltHighScore', finalScore.toString());
                localStorage.setItem('ThunderboltHighScore_backup', finalScore.toString());
                localStorage.setItem('ThunderboltHighScore_timestamp', Date.now().toString());
                console.log('unload 이벤트에서 localStorage 저장 성공');
            } catch (e) {
                console.error('unload 이벤트에서 localStorage 저장 실패:', e);
            }
            
            // IndexedDB 저장 시도
            try {
                await saveScoreToIndexedDB(finalScore);
                console.log('unload 이벤트에서 IndexedDB 저장 성공');
            } catch (e) {
                console.error('unload 이벤트에서 IndexedDB 저장 실패:', e);
            }
        }
    });

    // 페이지 숨김 시
    window.addEventListener('pagehide', async (event) => {
        const finalScore = Math.max(score, highScore);
        if (finalScore > 0) {
            await saveHighScoreDirectly(finalScore, 'pagehide');
        }
    });

    // 페이지 언로드 전
    window.addEventListener('beforeunload', async (event) => {
        const finalScore = Math.max(score, highScore);
        if (finalScore > 0) {
            // 동기적으로 localStorage에 먼저 저장
            try {
                localStorage.setItem('ThunderboltHighScore', finalScore.toString());
                localStorage.setItem('ThunderboltHighScore_backup', finalScore.toString());
                localStorage.setItem('ThunderboltHighScore_timestamp', Date.now().toString());
                console.log('beforeunload 이벤트에서 localStorage 저장 성공');
            } catch (e) {
                console.error('beforeunload 이벤트에서 localStorage 저장 실패:', e);
            }
            
            // IndexedDB 저장 시도
            try {
                await saveScoreToIndexedDB(finalScore);
                console.log('beforeunload 이벤트에서 IndexedDB 저장 성공');
            } catch (e) {
                console.error('beforeunload 이벤트에서 IndexedDB 저장 실패:', e);
            }
            
            // 저장이 완료될 때까지 잠시 대기
            const start = Date.now();
            while (Date.now() - start < 200) {
                // 200ms 동안 대기
            }
        }
    });
}

// 게임 초기화 함수 수정
async function initializeGame() {
    console.log('게임 초기화 시작');
    
    try {
        // 종료 이벤트 핸들러 설정
        setupExitHandlers();
        
        // 저장된 최고점수 로드
        const savedHighScore = await loadHighScore();
        highScore = savedHighScore;
        console.log('저장된 최고점수 로드:', highScore);
        
        // 게임 상태 초기화
        score = 0;
        levelScore = 0;
        
        // 특수무기 관련 상태 초기화
        specialWeaponCharged = false;
        specialWeaponCharge = 0;
        specialWeaponCount = 0;
        
        // 모든 투사체 및 폭발물 완전 초기화
        bullets = [];
        enemies = [];
        explosions = [];
        bombs = [];
        dynamites = [];
        helicopterBullets = [];
        enemyBullets = [];
        collisionEffects = [];
        
        collisionCount = 0;
        maxLives = 5;  // 최대 목숨 초기화
        lastLifeCount = maxLives;  // 초기 목숨 개수 설정
        shieldedHelicopterDestroyed = 0;  // 보호막 헬리콥터 파괴 카운터 초기화
        processedCollisions.clear(); // 충돌 추적 세트 초기화
        isGameOver = false;
        isPaused = false;
        flashTimer = 0;
        lifeWarningBlinkTimer = 0;  // 목숨 경고 깜빡임 타이머 초기화
        gameOverStartTime = null;
        isSnakePatternActive = false;
        snakeEnemies = [];
        snakePatternTimer = 0;
        snakePatternInterval = 0;
        snakeGroups = [];
        lastSnakeGroupTime = 0;
        
        // 보스 관련 상태 초기화
        bossActive = false;
        bossHealth = 0;
        bossDestroyed = false;
        lastBossSpawnTime = Date.now();
        
        // 플레이어 초기 위치 설정
        player.x = canvas.width / 2 - (240 * 0.7 * 0.7 * 0.8) / 2;
        player.y = canvas.height - 80; // 30픽셀 위로 올림
        secondPlane.x = canvas.width / 2 - 60;
        secondPlane.y = canvas.height - 80; // 30픽셀 위로 올림
        
        // 적 생성 타이머 초기화 - 즉시 적들이 생성되도록
        lastEnemySpawnTime = 0;
        lastHelicopterSpawnTime = 0;
        
        // 파워업 상태 초기화
        hasShield = false;
        damageMultiplier = 1;
        fireRateMultiplier = 1;
        
        // 발사 관련 상태 초기화
        lastFireTime = 0;
        isSpacePressed = false;
        spacePressTime = 0;
        isContinuousFire = false;
        canFire = true;
        lastReleaseTime = 0;
        
        console.log('게임 상태 초기화 완료');
        
        // 게임 루프 시작
        requestAnimationFrame(gameLoop);
        console.log('게임 루프 시작됨');
    } catch (error) {
        console.error('게임 초기화 중 오류:', error);
    }
}

// 게임 재시작 함수 수정
function restartGame() {
    console.log('게임 재시작 - 재시작 전 최고 점수:', highScore);
    
    // 현재 최고 점수 저장
    const currentHighScore = Math.max(score, highScore);
    if (currentHighScore > 0) {
        saveHighScoreDirectly(currentHighScore, 'restartGame');
    }
    
    // 게임 상태 초기화
    collisionCount = 0;
    maxLives = 5;  // 최대 목숨 초기화
    lastLifeCount = maxLives;  // 초기 목숨 개수 설정
    shieldedHelicopterDestroyed = 0;  // 보호막 헬리콥터 파괴 카운터 초기화
    processedCollisions.clear(); // 충돌 추적 세트 초기화
    isGameOver = false;
    hasSecondPlane = false;
    lastSecondPlaneScore = 0;
    lifeWarningBlinkTimer = 0;  // 목숨 경고 깜빡임 타이머 초기화
    
    // 목숨 추가 메시지 초기화
    if (window.lifeAddedMessage) {
        window.lifeAddedMessage.show = false;
    }
    
    // 모든 투사체 및 폭발물 완전 초기화
    enemies = [];
    bullets = [];
    explosions = [];
    bombs = [];
    dynamites = [];
    helicopterBullets = [];
    enemyBullets = [];
    collisionEffects = [];
    
    // 플레이어 위치 초기화
    player.x = canvas.width / 2 - (240 * 0.7 * 0.7 * 0.8) / 2;
    player.y = canvas.height - 80; // 30픽셀 위로 올림
    secondPlane.x = canvas.width / 2 - 60;
    secondPlane.y = canvas.height - 80; // 30픽셀 위로 올림
    gameOverStartTime = null;
    
    // 현재 점수만 초기화 (최고 점수는 유지)
    score = 0;
    levelScore = 0;
    scoreForSpread = 0;
    gameLevel = 1;
    
    // 특수무기 관련 상태 초기화
    specialWeaponCharged = false;
    specialWeaponCharge = 0;
    specialWeaponCount = 0;
    
    // 보스 관련 상태 초기화
    bossActive = false;
    bossHealth = 0;
    bossDestroyed = false;
    lastBossSpawnTime = Date.now();
    
    // 시작 화면으로 돌아가지 않고 바로 게임 시작
    isStartScreen = false;
    
    // 적 생성 타이머 초기화 - 즉시 적들이 생성되도록
    lastEnemySpawnTime = 0;
    lastHelicopterSpawnTime = 0;
    
    // 뱀 패턴 관련 초기화
    isSnakePatternActive = false;
    snakeEnemies = [];
    snakePatternTimer = 0;
    snakePatternInterval = 0;
    snakeGroups = [];
    lastSnakeGroupTime = 0;
    
    // 파워업 상태 초기화
    hasSpreadShot = false;
    hasShield = false;
    damageMultiplier = 1;
    fireRateMultiplier = 1;
    
    // 발사 관련 상태 초기화
    lastFireTime = 0;
    isSpacePressed = false;
    spacePressTime = 0;
    isContinuousFire = false;
    canFire = true;
    lastReleaseTime = 0;
    
    console.log('게임 재시작 완료 - 현재 최고 점수:', highScore);
}

// 적 생성 함수 수정 - 화면 상단에서 등장하도록 개선
function createEnemy() {
    // 레벨이 difficultySettings 범위를 벗어난 경우 기본값 사용
    let currentDifficulty;
    if (gameLevel <= 5 && difficultySettings[gameLevel]) {
        currentDifficulty = difficultySettings[gameLevel];
    } else {
        // 레벨 5 이후에는 점진적으로 증가하는 난이도 적용
        const baseLevel = 5;
        const levelMultiplier = 1 + (gameLevel - baseLevel) * 0.2; // 레벨당 20% 증가
        
        currentDifficulty = {
            enemySpeed: difficultySettings[baseLevel].enemySpeed * levelMultiplier,
            enemySpawnRate: Math.min(0.9, difficultySettings[baseLevel].enemySpawnRate * levelMultiplier),
            maxEnemies: Math.min(15, difficultySettings[baseLevel].maxEnemies + Math.floor((gameLevel - baseLevel) / 2)),
            enemyHealth: Math.floor(difficultySettings[baseLevel].enemyHealth * levelMultiplier),
            patternChance: Math.min(0.9, difficultySettings[baseLevel].patternChance * levelMultiplier),
            fireInterval: Math.max(500, difficultySettings[baseLevel].fireInterval / levelMultiplier),
            bombDropChance: Math.min(0.8, difficultySettings[baseLevel].bombDropChance * levelMultiplier),
            bulletSpeed: difficultySettings[baseLevel].enemySpeed * levelMultiplier,
            specialPatternChance: Math.min(0.8, difficultySettings[baseLevel].specialPatternChance * levelMultiplier)
        };
    }
    
    // 안전장치: currentDifficulty가 undefined인 경우 기본값 사용
    if (!currentDifficulty) {
        console.warn(`레벨 ${gameLevel}에 대한 난이도 설정을 찾을 수 없음, 기본값 사용`);
        currentDifficulty = difficultySettings[1];
    }
    
    // 헬리콥터 출현 비율을 레벨에 따라 조정
    const isHelicopter = Math.random() < (0.3 + (gameLevel * 0.05));
    
    if (!isBossActive && isHelicopter) {
        // 보호막 헬리콥터 생성 가능 여부 확인
        if (!canCreateShieldedHelicopter()) {
            return; // 보호막 헬리콥터 생성 중단
        }
        
        // 일반 헬리콥터와 helicopter2 중에서 선택 (보호막 헬리콥터는 30% 확률로 생성)
        const isHelicopter2 = Math.random() < 0.3;  // 30% 확률로 helicopter2 생성
        
        if (isHelicopter2) {
            const enemy = {
                x: Math.random() * (canvas.width - 48),
                y: -48,  // 화면 상단에서 시작
                width: 48,
                height: 48,
                speed: currentDifficulty.enemySpeed,
                type: ENEMY_TYPES.HELICOPTER2,
                rotorAngle: 0,
                rotorSpeed: 0.2,
                hoverHeight: Math.random() * 200 + 100,
                hoverTimer: 0,
                hoverDirection: 1,
                canDropBomb: Math.random() < currentDifficulty.bombDropChance,
                lastBombDrop: 0,
                bombDropInterval: 3000,
                lastUpdateTime: Date.now(),
                canFire: true,
                lastFireTime: 0,
                fireInterval: currentDifficulty.fireInterval,
                bulletSpeed: currentDifficulty.bulletSpeed,
                health: currentDifficulty.enemyHealth,
                score: 100 * gameLevel,
                isElite: Math.random() < (0.05 + (gameLevel * 0.02)),
                specialAbility: Math.random() < (0.1 + (gameLevel * 0.03)) ? getRandomSpecialAbility() : null,
                // 보호막 시스템 추가
                shieldHealth: 10,  // 보호막 체력 (10발 맞으면 파괴)
                maxShieldHealth: 10,
                shieldActive: true,
                shieldRadius: 60,  // 보호막 반지름
                shieldAngle: 0,    // 보호막 회전 각도
                shieldRotationSpeed: 0.02,  // 보호막 회전 속도
                hitEffectTimer: 0,  // 피격 효과 타이머
                hitEffectDuration: 200  // 피격 효과 지속 시간
            };

            // 엘리트 적 보너스
            if (enemy.isElite) {
                enemy.health *= (1.5 + (gameLevel * 0.2));
                enemy.speed *= 1.2;
                enemy.score *= 2;
                enemy.bulletSpeed *= 1.2;
                enemy.fireInterval *= 0.8;
                // 엘리트 적은 보호막도 강화
                enemy.shieldHealth = 15;
                enemy.maxShieldHealth = 15;
                enemy.shieldRadius = 70;
            }

            enemies.push(enemy);
            console.log('helicopter2 생성됨:', enemy);
            return;
        } else {
            const helicopter = {
                x: Math.random() * (canvas.width - 48),
                y: -48,  // 화면 상단에서 시작
                width: 48,
                height: 48,
                speed: currentDifficulty.enemySpeed * 0.8,
                type: ENEMY_TYPES.HELICOPTER,
                rotorAngle: 0,
                rotorSpeed: 0.2,
                hoverHeight: Math.random() * 200 + 100,
                hoverTimer: 0,
                hoverDirection: 1,
                canDropBomb: Math.random() < currentDifficulty.bombDropChance,
                lastBombDrop: 0,
                bombDropInterval: 2000 + Math.random() * 3000,
                lastUpdateTime: Date.now(),
                bulletSpeed: currentDifficulty.bulletSpeed,
                health: currentDifficulty.enemyHealth,
                score: 150 * gameLevel,
                isElite: Math.random() < (0.05 + (gameLevel * 0.02)),
                specialAbility: Math.random() < (0.1 + (gameLevel * 0.03)) ? getRandomSpecialAbility() : null,
                // 보호막 시스템 추가
                shieldHealth: 10,  // 보호막 체력 (10발 맞으면 파괴)
                maxShieldHealth: 10,
                shieldActive: true,
                shieldRadius: 60,  // 보호막 반지름
                shieldAngle: 0,    // 보호막 회전 각도
                shieldRotationSpeed: 0.02,  // 보호막 회전 속도
                hitEffectTimer: 0,  // 피격 효과 타이머
                hitEffectDuration: 200  // 피격 효과 지속 시간
            };

            // 엘리트 헬리콥터 보너스
            if (helicopter.isElite) {
                helicopter.health *= (1.5 + (gameLevel * 0.2));
                helicopter.speed *= 1.2;
                helicopter.score *= 2;
                helicopter.bulletSpeed *= 1.2;
                helicopter.bombDropInterval *= 0.8;
                // 엘리트 헬리콥터는 보호막도 강화
                helicopter.shieldHealth = 15;
                helicopter.maxShieldHealth = 15;
                helicopter.shieldRadius = 70;
            }

            enemies.push(helicopter);
            return;
        }
    }

    // 일반 비행기 생성
    const patterns = Object.values(ENEMY_PATTERNS);
    const enemyType = Math.random() < currentDifficulty.patternChance ? 
        patterns[Math.floor(Math.random() * patterns.length)] : ENEMY_PATTERNS.NORMAL;
    
    const spawnX = Math.random() * (canvas.width - 72);  // 크기가 1.5배로 커졌으므로 여백도 1.5배로
    const spawnY = -72;  // 화면 상단에서 시작
    
    const enemy = {
        x: spawnX,
        y: spawnY,  // 화면 상단에서 시작
        width: 72,  // 48 * 1.5 = 72
        height: 72, // 48 * 1.5 = 72
        speed: currentDifficulty.enemySpeed,
        pattern: enemyType,
        angle: 0,
        movePhase: 0,
        type: ENEMY_TYPES.PLANE,
        lastUpdateTime: Date.now(),
        canFire: true,
        lastFireTime: 0,
        fireInterval: currentDifficulty.fireInterval,
        entryDelay: 1000 + Math.random() * 2000,
        canDropBomb: Math.random() < currentDifficulty.bombDropChance,
        lastBombDrop: 0,
        bombDropInterval: 3000,
        bombCount: 3,
        bulletCount: 3,
        bulletSpeed: currentDifficulty.bulletSpeed,
        // 미사일 관련 속성 제거
        chaoticTimer: 0,
        bounceHeight: Math.random() * 100 + 50,
        bounceSpeed: Math.random() * 0.05 + 0.02,
        bounceDirection: Math.random() < 0.5 ? 1 : -1,
        health: currentDifficulty.enemyHealth,
        score: 100 * gameLevel,
        isElite: Math.random() < (0.05 + (gameLevel * 0.02)),
        specialAbility: Math.random() < (0.1 + (gameLevel * 0.03)) ? getRandomSpecialAbility() : null
    };

    // 엘리트 적 보너스
    if (enemy.isElite) {
        enemy.health *= (1.5 + (gameLevel * 0.2));
        enemy.speed *= 1.2;
        enemy.score *= 2;
        enemy.bulletSpeed *= 1.2;
        enemy.fireInterval *= 0.8;
    }

    enemies.push(enemy);
    console.log('일반 비행기 생성됨:', enemy);
}

// 특수 능력 랜덤 선택 함수
function getRandomSpecialAbility() {
    const baseChance = 0.1;  // 기본 확률
    const levelBonus = (gameLevel - 1) * 0.05;  // 레벨당 5% 증가
    const totalChance = Math.min(0.5, baseChance + levelBonus);  // 최대 50%까지
    
    if (Math.random() < totalChance) {
        const abilities = ['bomb', 'dynamite', 'helicopter', 'drone'];
        return abilities[Math.floor(Math.random() * abilities.length)];
    }
    return null;
}

// 적 비행기 총알 배열 추가
let enemyBullets = [];

// 적 비행기 총알 발사 및 이동 처리 함수 추가 (노란색 직사각형으로 그리기)
function handleEnemyBullets() {
    enemyBullets = enemyBullets.filter(bullet => {
        bullet.y += bullet.speed;
        
        // 모든 적 총알을 노란색 직사각형으로 그리기
        ctx.fillStyle = 'yellow';
        ctx.fillRect(bullet.x - bullet.width/2, bullet.y - bullet.height/2, bullet.width, bullet.height);
        
        // 플레이어와 충돌 체크
        if (checkCollision(bullet, player) || (hasSecondPlane && checkCollision(bullet, secondPlane))) {
            handleCollision();
            explosions.push(new Explosion(bullet.x, bullet.y, false));
            // 적 총알 피격 시 shoot 효과음 재생
            safePlaySound('shoot');
            return false;
        }
        // 플레이어 총알과의 충돌 체크 (충돌 이펙트/음으로 변경)
        for (let i = bullets.length - 1; i >= 0; i--) {
            if (checkCollision(bullet, bullets[i])) {
                // 충돌 이펙트: 크기와 지속시간 증가
                collisionEffects.push({ 
                    x: bullet.x, 
                    y: bullet.y, 
                    radius: 30,  // 3배 증가
                    life: 30,    // 3배 증가
                    pulse: 0     // 펄스 효과를 위한 변수 추가
                });
                // 충돌음 제거 - 플레이어 총알과 적 총알 충돌 시에는 사운드 없음
                bullets.splice(i, 1);
                return false;
            }
        }
        return bullet.y < canvas.height;
    });
}

// 적 비행기에서 총알 발사 로직 수정
function handleEnemyPlaneBullets() {
    const currentTime = Date.now();
    enemies.forEach(enemy => {
        if (enemy.type === ENEMY_TYPES.PLANE) {
            // 비행기가 화면에 진입한 후 일정 시간이 지나면 발사 가능하도록 설정
            if (!enemy.canFire && enemy.y >= 0) {
                enemy.entryStartTime = currentTime;
                enemy.canFire = true;
            }

            // 진입 후 지정된 시간이 지났고, 발사 간격이 지났을 때만 발사
            if (enemy.canFire && 
                currentTime - enemy.entryStartTime >= enemy.entryDelay && 
                currentTime - enemy.lastFireTime >= enemy.fireInterval) {
                
                // 특수 능력에 따른 발사 패턴
                if (enemy.specialAbility) {
                    switch(enemy.specialAbility) {
                        case 'rapidFire':
                            // 빠른 발사: 3발 연속 발사
                            for (let i = 0; i < 3; i++) {
                                setTimeout(() => {
                                    fireEnemyBullet(enemy);
                                }, i * 200);
                            }
                            break;
                            
                        case 'tripleShot':
                            // 삼중 발사: 3방향으로 동시 발사
                            const angles = [-Math.PI/6, 0, Math.PI/6];
                            angles.forEach(angle => {
                                const bullet = {
                                    x: enemy.x + enemy.width/2,
                                    y: enemy.y + enemy.height,
                                    width: 8,
                                    height: 18,
                                    speed: enemy.bulletSpeed,
                                    angle: angle
                                };
                                enemyBullets.push(bullet);
                            });
                            break;
                            
                        case 'homingShot':
                            // 유도 발사: 플레이어 방향으로 발사
                            const px = player.x + player.width/2;
                            const py = player.y + player.height/2;
                            const ex = enemy.x + enemy.width/2;
                            const ey = enemy.y + enemy.height;
                            const angle = Math.atan2(py - ey, px - ex);
                            const bullet = {
                                x: ex,
                                y: ey,
                                width: 8,
                                height: 18,
                                speed: enemy.bulletSpeed,
                                angle: angle,
                                isHoming: true
                            };
                            enemyBullets.push(bullet);
                            break;
                            
                        default:
                            // 기본 발사
                            fireEnemyBullet(enemy);
                    }
                } else {
                    // 일반 발사
                    fireEnemyBullet(enemy);
                }
                
                enemy.lastFireTime = currentTime;
            }
        }
    });
}

// 적 비행기 총알 발사 함수 (미사일 모양으로 2발씩 발사)
function fireEnemyBullet(enemy) {
    // 랜덤으로 총알 또는 폭탄 발사 결정
    if (Math.random() < 0.7) {  // 70% 확률로 총알 발사
        const leftX = enemy.x + enemy.width * 0.18;
        const rightX = enemy.x + enemy.width * 0.82;
        const bulletY = enemy.y + enemy.height;
        
        // 왼쪽 총알 (노란색 직사각형)
        enemyBullets.push({
            x: leftX,
            y: bulletY,
            width: 8,
            height: 18,
            speed: enemy.bulletSpeed
        });
        
        // 오른쪽 총알 (노란색 직사각형)
        enemyBullets.push({
            x: rightX,
            y: bulletY,
            width: 8,
            height: 18,
            speed: enemy.bulletSpeed
        });
    } else {  // 30% 확률로 폭탄 발사
        for (let i = 0; i < enemy.bombCount; i++) {
            createBomb(enemy);
        }
    }
}

// 미사일 궤적 그리기 함수 제거됨 (총알로 대체)
// function drawMissileTrail(missile) {
//     // 미사일 궤적이 총알로 대체됨
// }

// 적 비행기 미사일 처리 함수 제거됨 (총알로 대체)
// function handleEnemyMissiles() {
//     // 미사일 발사 로직이 총알 발사로 대체됨
// }

// 적 위치 업데이트 함수 수정
function updateEnemyPosition(enemy, options = {}) {
    if (!enemy) return;

    const currentTime = Date.now();
    const deltaTime = currentTime - enemy.lastUpdateTime;
    enemy.lastUpdateTime = currentTime;

    // 헬리콥터 처리
    if (enemy.type === ENEMY_TYPES.HELICOPTER || enemy.type === ENEMY_TYPES.HELICOPTER2) {
        // 헬리콥터 특수 움직임 (부드러운 로터 회전)
        const rotorDeltaTime = currentTime - (enemy.lastRotorUpdate || currentTime);
        enemy.lastRotorUpdate = currentTime;
        enemy.rotorAngle += enemy.rotorSpeed * (rotorDeltaTime / 16); // 60fps 기준으로 정규화
        
        // 호버링 효과 개선
        enemy.hoverTimer += deltaTime;
        const hoverOffset = Math.sin(enemy.hoverTimer * 0.002) * 30; // 진폭 증가
        
        // 좌우 움직임 개선
        const horizontalSpeed = Math.sin(enemy.hoverTimer * 0.001) * 3; // 속도 증가
        enemy.x += horizontalSpeed;
        
        // 상하 움직임 개선
        if (enemy.y < enemy.hoverHeight) {
            enemy.y += enemy.speed * 1.2; // 상승 속도 증가
        } else {
            // 호버링 중 고도 변화
            const verticalSpeed = Math.cos(enemy.hoverTimer * 0.001) * 2;
            enemy.y = enemy.hoverHeight + hoverOffset + verticalSpeed;
        }
        
        // 급격한 방향 전환 추가
        if (Math.random() < 0.005) { // 0.5% 확률로 급격한 방향 전환
            enemy.hoverDirection *= -1;
            enemy.hoverHeight = Math.random() * 200 + 100;
        }
        
        // 폭탄 투하 체크
        if (enemy.canDropBomb && currentTime - enemy.lastBombDrop >= enemy.bombDropInterval) {
            createBomb(enemy);
            enemy.lastBombDrop = currentTime;
        }
        
        // 헬리콥터 총알 발사
        if (!enemy.fireCooldown) enemy.fireCooldown = 1250 + Math.random()*500; // 2500에서 1250으로 단축
        if (!enemy.lastFireTime) enemy.lastFireTime = 0;
        if (!options.helicopterFiredThisFrame && currentTime - enemy.lastFireTime > enemy.fireCooldown) {
            // 플레이어 방향 각도 계산
            const px = player.x + player.width/2;
            const py = player.y + player.height/2;
            
            // 보스인 경우 동체 앞부분 중앙에서 발사, 일반 헬리콥터는 중앙에서 발사
            let ex, ey;
            if (enemy.isBoss) {
                ex = enemy.x + enemy.width/2;  // 가로 중앙
                ey = enemy.y + enemy.height * 0.8;  // 세로 앞부분 (80% 지점)
            } else {
                ex = enemy.x + enemy.width/2;
                ey = enemy.y + enemy.height/2;
            }
            
            const angle = Math.atan2(py - ey, px - ex);
            helicopterBullets.push({
                x: ex,
                y: ey,
                angle: angle,
                speed: 7,
                width: 36,
                height: 8,
                isBossBullet: enemy.isBoss
            });
            enemy.lastFireTime = currentTime;
            enemy.fireCooldown = 1250 + Math.random()*500; // 2500에서 1250으로 단축
            if (options) options.helicopterFiredThisFrame = true;
        }
    } else if (enemy.type === ENEMY_TYPES.PLANE) {
        // 일반 비행기 처리
        const baseSpeed = enemy.speed || 2;
        
        // 패턴에 따른 이동
        switch(enemy.pattern) {
            case ENEMY_PATTERNS.ZIGZAG:
                // 지그재그 패턴 개선
                const zigzagSpeed = Math.sin(enemy.y * 0.05) * enemy.speed * 2.5; // 진폭 증가
                enemy.x += zigzagSpeed;
                enemy.y += baseSpeed * (1 + Math.sin(enemy.y * 0.02) * 0.3); // 속도 변화 추가
                break;
                
            case ENEMY_PATTERNS.CIRCLE:
                if (!enemy.circleAngle) enemy.circleAngle = 0;
                if (!enemy.circleCenterX) enemy.circleCenterX = enemy.x;
                if (!enemy.circleCenterY) enemy.circleCenterY = enemy.y;
                if (!enemy.circleRadius) enemy.circleRadius = 50;
                
                // 원형 패턴 개선
                enemy.circleAngle += 0.06; // 회전 속도 증가
                const radiusVariation = Math.sin(enemy.circleAngle * 2) * 10; // 반지름 변화
                enemy.x = enemy.circleCenterX + Math.cos(enemy.circleAngle) * (enemy.circleRadius + radiusVariation);
                enemy.y = enemy.circleCenterY + Math.sin(enemy.circleAngle) * (enemy.circleRadius + radiusVariation) + baseSpeed;
                break;
                
            case ENEMY_PATTERNS.DIAGONAL:
                if (!enemy.isDiving) {
                    if (!enemy.diagonalDirection) enemy.diagonalDirection = Math.random() < 0.5 ? 1 : -1;
                    enemy.x += enemy.diagonalDirection * enemy.speed * 1.2; // 대각선 이동 속도 증가
                    enemy.y += baseSpeed * 0.6;
                    if (enemy.x <= 0 || enemy.x >= canvas.width - enemy.width) {
                        enemy.isDiving = true;
                        enemy.originalY = enemy.y;
                    }
                } else {
                    if (!enemy.diveSpeed) enemy.diveSpeed = baseSpeed * 2.5; // 급강하 속도 증가
                    enemy.y += enemy.diveSpeed;
                    if (enemy.y >= enemy.originalY + 250) { // 급강하 거리 증가
                        enemy.isDiving = false;
                        enemy.diagonalDirection *= -1;
                    }
                }
                break;
                
            default: // NORMAL 패턴
                // 기본 이동에 약간의 변화 추가
                enemy.x += Math.sin(enemy.y * 0.02) * 1.5;
                enemy.y += baseSpeed * (1 + Math.sin(enemy.y * 0.01) * 0.2);
                break;
        }
        
        // 급격한 방향 전환 추가 (모든 패턴에 적용)
        if (Math.random() < 0.003) { // 0.3% 확률로 급격한 방향 전환
            enemy.speed *= (Math.random() < 0.5 ? 1.5 : 0.7); // 속도 변화
            if (enemy.pattern === ENEMY_PATTERNS.NORMAL) {
                enemy.pattern = Object.values(ENEMY_PATTERNS)[Math.floor(Math.random() * Object.values(ENEMY_PATTERNS).length)];
            }
        }

        // 미사일 발사 체크
        if (enemy.canFire && currentTime - enemy.lastFireTime > enemy.fireInterval) {
            fireEnemyBullet(enemy);
            enemy.lastFireTime = currentTime;
        }

        // 폭탄 투하 체크
        if (enemy.canDropBomb && currentTime - enemy.lastBombDrop > enemy.bombDropInterval) {
            createBomb(enemy);
            enemy.lastBombDrop = currentTime;
        }
    }
}

// 패턴 타입 상수 수정
const PATTERN_TYPES = {
    SNAKE: 'snake',      // S자 움직임
    VERTICAL: 'vertical', // 세로 움직임
    DIAGONAL: 'diagonal', // 대각선 움직임
    HORIZONTAL: 'horizontal', // 가로 움직임
    SPIRAL: 'spiral'     // 나선형 움직임 추가
};

// 뱀 패턴 시작 함수 수정
function startSnakePattern() {
    isSnakePatternActive = true;
    snakePatternTimer = Date.now();
    
    // 새로운 뱀 그룹 생성
    const newGroup = {
        enemies: [],
        startTime: Date.now(),
        patternInterval: 0,
        isActive: true,
        startX: getRandomStartPosition(),
        startY: -30,
        patternType: getRandomPatternType(),
        direction: Math.random() < 0.5 ? 1 : -1,
        angle: 0,
        speed: 2,
        amplitude: Math.random() * 100 + 150,
        frequency: Math.random() * 0.5 + 0.75,
        spiralRadius: 50,
        spiralAngle: 0,
        initialEnemiesCreated: false
    };
    
    // 첫 번째 적 생성
    const firstEnemy = {
        x: newGroup.startX,
        y: newGroup.startY,
        width: 30,
        height: 30,
        speed: newGroup.speed,
        type: 'dynamite', // 'snake'에서 'dynamite'로 변경
        targetX: newGroup.startX,
        targetY: newGroup.startY,
        angle: 0,
        isHit: false,
        amplitude: newGroup.amplitude,
        frequency: newGroup.frequency,
        lastChange: Date.now()
    };
    newGroup.enemies.push(firstEnemy);
    snakeGroups.push(newGroup);
}

// 그룹별 시작 위치 계산 함수 추가
function getRandomStartPosition() {
    // 화면을 4등분하여 각 구역별로 다른 시작 위치 설정
    const section = Math.floor(Math.random() * 4);
    const sectionWidth = canvas.width / 4;
    
    switch(section) {
        case 0: // 왼쪽 구역
            return Math.random() * (sectionWidth * 0.5) + 50;
        case 1: // 중앙 왼쪽 구역
            return Math.random() * (sectionWidth * 0.5) + sectionWidth;
        case 2: // 중앙 오른쪽 구역
            return Math.random() * (sectionWidth * 0.5) + sectionWidth * 2;
        case 3: // 오른쪽 구역
            return Math.random() * (sectionWidth * 0.5) + sectionWidth * 3;
    }
}

// 랜덤 패턴 타입 선택 함수 추가
function getRandomPatternType() {
    const types = Object.values(PATTERN_TYPES);
    return types[Math.floor(Math.random() * types.length)];
}

// 충돌 감지 함수 수정
function checkCollision(rect1, rect2) {
    // 상단 효과 무시 영역 체크
    const isInTopZone = rect1.y < TOP_EFFECT_ZONE || rect2.y < TOP_EFFECT_ZONE;
    
    return !isInTopZone && 
           rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

// 목숨 추가 메시지 표시 함수
function showLifeAddedMessage() {
    // 메시지 표시를 위한 상태 변수 추가
    if (!window.lifeAddedMessage) {
        window.lifeAddedMessage = {
            show: false,
            startTime: 0,
            duration: 3000  // 3초간 표시
        };
    }
    
    window.lifeAddedMessage.show = true;
    window.lifeAddedMessage.startTime = Date.now();
}

// 충돌 처리 함수 수정
function handleCollision(collisionId = null) {
    console.log('handleCollision 호출됨:', { playerY: player.y, TOP_EFFECT_ZONE, collisionId });
    
    // 충돌 ID가 제공된 경우 중복 처리 방지
    if (collisionId && processedCollisions.has(collisionId)) {
        console.log('이미 처리된 충돌:', collisionId);
        return;
    }
    
    // 충돌 ID를 처리된 목록에 추가
    if (collisionId) {
        processedCollisions.add(collisionId);
    }
    
    // 상단 효과 무시 영역 체크
    if (player.y < TOP_EFFECT_ZONE) {
        console.log('상단 효과 무시 영역 - 충돌 처리 건너뜀');
        return;
    }
    
    try {
        if (hasShield) {
            hasShield = false;
            return;
        }
        
        const currentTime = Date.now();
        collisionCount++;
        flashTimer = flashDuration;
        
        // 충돌할 때마다 경고음 재생 및 깜빡임 효과 시작
        const currentLifeCount = maxLives - collisionCount;
        
        // 경고음 재생 (쿨다운 적용) - 충돌할 때마다 재생
        if (currentTime - lastCollisionTime >= collisionSoundCooldown) {
            console.log('경고음 재생:', { currentTime, lastCollisionTime, cooldown: collisionSoundCooldown });
            safePlaySound('warning');
            lastCollisionTime = currentTime;
        } else {
            console.log('경고음 쿨다운 중:', { 
                currentTime, 
                lastCollisionTime, 
                remaining: collisionSoundCooldown - (currentTime - lastCollisionTime) 
            });
        }
        
        // 깜빡임 효과 시작
        lifeWarningBlinkTimer = lifeWarningBlinkDuration;
        
        // 목숨이 줄어들었을 때 추가 효과 (선택사항)
        if (currentLifeCount < lastLifeCount) {
            // 추가 시각 효과나 사운드가 필요하면 여기에 추가
        }
        lastLifeCount = currentLifeCount;
        
        // 충돌음 제거 - 경고음만 재생
        // if (currentTime - lastCollisionTime >= collisionSoundCooldown) {
        //     safePlaySound('collision');
        //     lastCollisionTime = currentTime;
        // }
        
        // 목숨이 모두 소진되었을 때만 게임 오버
        if (collisionCount >= maxLives) {
            handleGameOver();
        }
    } catch (error) {
        console.error('충돌 처리 중 오류 발생:', error);
    }
}

// 폭발 효과 클래스
class Explosion {
    constructor(x, y, isFinal = false, customMaxRadius = null) {
        this.x = x;
        this.y = y;
        this.radius = 1;
        this.maxRadius = customMaxRadius !== null
            ? customMaxRadius
            : (isFinal ? 100 : 30); // 일반 폭발의 최대 반경을 30으로 제한
        this.speed = isFinal ? 1 : 2; // 일반 폭발의 속도를 증가
        this.particles = [];
        this.isFinal = isFinal;
        this.isFinished = false;
        
        // 파티클 생성 (customMaxRadius가 있을 때는 파티클 생성하지 않음)
        if (isFinal && customMaxRadius === null) {
            for (let i = 0; i < 20; i++) {
                this.particles.push({
                    x: this.x,
                    y: this.y,
                    speed: Math.random() * 8 + 2,
                    angle: (Math.PI * 2 / 20) * i,
                    size: Math.random() * 4 + 2,
                    life: 1
                });
            }
        }
    }

    update() {
        if (this.isFinished) return false;
        
        this.radius += this.speed;
        
        if (this.isFinal) {
            // 파티클 업데이트
            for (let particle of this.particles) {
                particle.x += Math.cos(particle.angle) * particle.speed;
                particle.y += Math.sin(particle.angle) * particle.speed;
                particle.life -= 0.02;
                particle.size *= 0.98;
            }
            
            // 파티클이 모두 사라졌는지 확인
            this.isFinished = !this.particles.some(p => p.life > 0);
            return !this.isFinished;
        }
        
        // 일반 폭발은 최대 반경에 도달하면 종료
        if (this.radius >= this.maxRadius) {
            this.isFinished = true;
            return false;
        }
        
        return true;
    }

    draw() {
        if (this.isFinished) return;
        
        if (this.isFinal) {
            // 중심 폭발
            const gradient = ctx.createRadialGradient(
                this.x, this.y, 0,
                this.x, this.y, this.radius
            );
            gradient.addColorStop(0, 'rgba(255, 255, 200, 0.8)');
            gradient.addColorStop(0.4, 'rgba(255, 100, 0, 0.6)');
            gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
            
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = gradient;
            ctx.fill();
            
            // 파티클 그리기
            for (let particle of this.particles) {
                if (particle.life > 0) {
                    ctx.beginPath();
                    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(255, ${Math.floor(200 * particle.life)}, 0, ${particle.life})`;
                    ctx.fill();
                }
            }
        } else {
            // 일반 폭발 효과
            const alpha = 1 - (this.radius / this.maxRadius);
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 200, 0, ${alpha})`;
            ctx.fill();
            
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius * 0.7, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 100, 0, ${alpha})`;
            ctx.fill();
            
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius * 0.4, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 50, 0, ${alpha})`;
            ctx.fill();
        }
    }
}

// 비행기 그리기 함수 (이미지 로딩 체크 포함 버전으로 대체됨)
// function drawAirplane(x, y, width, height, color, isEnemy = false) {
//     ctx.save();
//     if (!isEnemy) {
//         // 플레이어: 준비된 이미지를 그대로 그림
//         ctx.drawImage(playerImage, x, y, width, height);
//     } else {
//         // 적: 이미지 사용
//         ctx.translate(x + width/2, y + height/2);
//         ctx.scale(1, -1); // 아래로 향하도록 뒤집기
//         ctx.drawImage(enemyPlaneImage, -width/2, -height/2, width, height);
//     }
//     ctx.restore();
// }

// 게임 루프 수정
function gameLoop() {
    if (isPaused) {
        requestAnimationFrame(gameLoop);
        return;
    }

    // 화면 전체를 검정색으로 채움 (캔버스 배경)
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (isStartScreen) {
        drawStartScreen();
        requestAnimationFrame(gameLoop);
        return;
    }

    if (isGameOver) {
        try {
            // 폭발 효과 업데이트 및 그리기
            explosions = explosions.filter(explosion => {
                explosion.draw();
                return explosion.update();
            });

            // 폭발 효과가 모두 사라졌을 때만 게임 오버 화면 표시
            if (explosions.length === 0) {
                // 게임 오버 화면 페이드 인 효과
                const fadeInDuration = 2000;
                const currentTime = Date.now();
                const fadeProgress = Math.min(1, (currentTime - (gameOverStartTime || currentTime)) / fadeInDuration);
                
                if (!gameOverStartTime) {
                    gameOverStartTime = currentTime;
                    // 게임 오버 시 최고 점수 업데이트
                    ScoreManager.save();
                }

                // 배경 페이드 인 - 완전한 검정색으로 변경
                ctx.fillStyle = `rgba(0, 0, 0, ${fadeProgress})`;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                if (fadeProgress >= 1) {
                    // 게임 오버 텍스트에 그라데이션 효과
                    const gradient = ctx.createLinearGradient(0, canvas.height/2 - 50, 0, canvas.height/2 + 50);
                    gradient.addColorStop(0, '#ff0000');
                    gradient.addColorStop(0.5, '#ff4444');
                    gradient.addColorStop(1, '#ff0000');
                    
                    ctx.fillStyle = gradient;
                    ctx.font = 'bold 64px Arial';
                    ctx.textAlign = 'center';
                    ctx.fillText('GAME OVER', canvas.width/2, canvas.height/2);
                    
                    ctx.font = 'bold 32px Arial';
                    ctx.fillStyle = '#ffffff';
                    ctx.fillText(`최종 점수: ${score}`, canvas.width/2, canvas.height/2 + 60);
                    ctx.fillText(`충돌 횟수: ${collisionCount}`, canvas.width/2, canvas.height/2 + 100);
                    ctx.fillText('스페이스바를 눌러 재시작', canvas.width/2, canvas.height/2 + 160);
                }
            }
        } catch (error) {
            console.error('게임 오버 화면 처리 중 오류:', error);
            // 오류 발생 시 기본 게임 오버 화면 표시
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 64px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('GAME OVER', canvas.width/2, canvas.height/2);
            ctx.font = 'bold 32px Arial';
            ctx.fillText(`최종 점수: ${score}`, canvas.width/2, canvas.height/2 + 60);
            ctx.fillText('스페이스바를 눌러 재시작', canvas.width/2, canvas.height/2 + 160);
        }
        requestAnimationFrame(gameLoop);
        return;
    }

    try {
        // 깜박임 효과 처리
        if (flashTimer > 0) {
            ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            flashTimer -= 16;
        }

        // 목숨 경고 깜빡임 타이머 업데이트
        if (lifeWarningBlinkTimer > 0) {
            lifeWarningBlinkTimer -= 16;
        }

        // 플레이어 이동 처리
        handlePlayerMovement();

        // 총알 발사 처리
        handleBulletFiring();
        
        // 특수 무기 처리
        handleSpecialWeapon();

        // 적 생성 및 이동 처리
        handleEnemies();
        
        // 보스 체크 및 생성 (레벨에 따라 보스 출현 조건 조정)
        const currentTime = Date.now();
        if (!bossActive && !isBossActive) {
            const timeSinceLastBoss = currentTime - lastBossSpawnTime;
            // 레벨에 따라 보스 출현 점수 조건 조정 (더욱 빠르게)
            const bossSpawnScore = Math.max(50, gameLevel * 100); // 레벨당 100점씩 증가, 최소 50점
            if (timeSinceLastBoss >= BOSS_SETTINGS.SPAWN_INTERVAL && score >= bossSpawnScore) {
                console.log(`보스 생성 조건 확인: 점수 ${score}/${bossSpawnScore}, 레벨 ${gameLevel}, 시간: ${timeSinceLastBoss}/${BOSS_SETTINGS.SPAWN_INTERVAL}`);
                createBoss();
            } else if (timeSinceLastBoss < BOSS_SETTINGS.SPAWN_INTERVAL) {
                // 디버깅: 보스 생성 대기 시간 표시
                if (currentTime % 5000 < 16) { // 5초마다 한 번씩 로그 출력
                    console.log(`보스 생성 대기 중: 점수 ${score}/${bossSpawnScore}, 레벨 ${gameLevel}, 남은 시간: ${Math.ceil((BOSS_SETTINGS.SPAWN_INTERVAL - timeSinceLastBoss) / 1000)}초`);
                }
            }
        } else {
            // 보스가 존재하는 경우 보스 패턴 처리 삭제됨
            const boss = enemies.find(enemy => enemy.isBoss);
            if (boss) {
                // 보스 패턴 처리 함수 삭제됨
            } else {
                // 보스가 enemies 배열에서 제거된 경우 상태 초기화
                console.log('보스가 enemies 배열에서 제거됨, 상태 초기화');
                bossActive = false;
                isBossActive = false;
                bossHealth = 0;
                bossDestroyed = false;
            }
        }

        // 총알 이동 및 충돌 체크
        handleBullets();
        
        // 보스 확산탄 처리
        handleBossSpreadBullets();


        // 두 번째 비행기 처리
        handleSecondPlane();

        // 레벨업 체크
        checkLevelUp();

        // 폭발 효과 업데이트 및 그리기
        handleExplosions();

        // 충돌 효과 업데이트 및 그리기
        handleCollisionEffects();

        // 폭탄 처리 추가
        handleBombs();

        // 다이나마이트 처리 추가
        handleDynamites();

        // UI 그리기
        drawUI();

        // 다음 프레임 요청
        requestAnimationFrame(gameLoop);
    } catch (error) {
        console.error('게임 루프 실행 중 오류:', error);
        
        // 이미지 관련 오류인지 확인
        if (error.message && error.message.includes('drawImage') && error.message.includes('broken')) {
            console.warn('이미지 로딩 오류 감지 - 기본 도형 모드로 전환');
            // 이미지 로딩 상태를 false로 설정하여 기본 도형 사용
            imagesLoaded.player = false;
            imagesLoaded.enemy = false;
            // 게임 계속 진행
            requestAnimationFrame(gameLoop);
        } else {
            // 다른 오류의 경우 게임 오버 처리
            handleGameOver();
        }
    }
}

// 플레이어 이동 처리 함수
function handlePlayerMovement() {
    const margin = 10; 
    if (keys.ArrowLeft && player.x > margin) {
        player.x -= player.speed * 0.5;
        if (hasSecondPlane) {
            secondPlane.x -= player.speed * 0.5;
        }
    }
    if (keys.ArrowRight && player.x < canvas.width - player.width - margin) {
        player.x += player.speed * 0.5;
        if (hasSecondPlane) {
            secondPlane.x += player.speed * 0.5;
        }
    }
    if (keys.ArrowUp && player.y > margin) {
        player.y -= player.speed;
        if (hasSecondPlane) {
            secondPlane.y -= player.speed;
        }
    }
    if (keys.ArrowDown && player.y < canvas.height - player.height - margin) {
        player.y += player.speed;
        if (hasSecondPlane) {
            secondPlane.y += player.speed;
        }
    }
}

// 적 처리 함수 수정 - 적 생성 로직 개선
function handleEnemies() {
    const currentTime = Date.now();
    
    // 레벨이 difficultySettings 범위를 벗어난 경우 기본값 사용
    let currentDifficulty;
    if (gameLevel <= 5 && difficultySettings[gameLevel]) {
        currentDifficulty = difficultySettings[gameLevel];
    } else {
        // 레벨 5 이후에는 점진적으로 증가하는 난이도 적용
        const baseLevel = 5;
        const levelMultiplier = 1 + (gameLevel - baseLevel) * 0.2; // 레벨당 20% 증가
        
        currentDifficulty = {
            enemySpeed: difficultySettings[baseLevel].enemySpeed * levelMultiplier,
            enemySpawnRate: Math.min(0.9, difficultySettings[baseLevel].enemySpawnRate * levelMultiplier),
            maxEnemies: Math.min(15, difficultySettings[baseLevel].maxEnemies + Math.floor((gameLevel - baseLevel) / 2)),
            enemyHealth: Math.floor(difficultySettings[baseLevel].enemyHealth * levelMultiplier),
            patternChance: Math.min(0.9, difficultySettings[baseLevel].patternChance * levelMultiplier),
            fireInterval: Math.max(500, difficultySettings[baseLevel].fireInterval / levelMultiplier),
            bombDropChance: Math.min(0.8, difficultySettings[baseLevel].bombDropChance * levelMultiplier),
            bulletSpeed: difficultySettings[baseLevel].enemySpeed * levelMultiplier,
            specialPatternChance: Math.min(0.8, difficultySettings[baseLevel].specialPatternChance * levelMultiplier)
        };
    }
    
    // 안전장치: currentDifficulty가 undefined인 경우 기본값 사용
    if (!currentDifficulty) {
        console.warn(`레벨 ${gameLevel}에 대한 난이도 설정을 찾을 수 없음, 기본값 사용`);
        currentDifficulty = difficultySettings[1];
    }
    
    const bossExists = enemies.some(enemy => enemy.type === 'helicopter' && enemy.isBoss);
    
    // 보스 생성은 gameLoop에서만 처리하도록 주석 처리
    // if (score >= 1000 && !isBossActive && !bossExists) {
    //     createBoss();
    //     isBossActive = true;
    // }
    
    if (bossExists) {
        isBossActive = true;
    } else if (isBossActive) {
        lastHelicopterSpawnTime = currentTime;
        isBossActive = false;
    }
    
    if (isSnakePatternActive) {
        handleSnakePattern();
    }
    
    // 적 생성 로직 개선 - 게임 시작 시 즉시 적들이 생성되도록
    if (currentTime - lastEnemySpawnTime >= MIN_ENEMY_SPAWN_INTERVAL &&
        Math.random() < currentDifficulty.enemySpawnRate && 
        enemies.length < currentDifficulty.maxEnemies &&
        !isGameOver) {
        createEnemy();
        lastEnemySpawnTime = currentTime;
        console.log('새로운 적 생성됨');
    }
    
    // 헬리콥터 생성 로직 개선 - 게임 시작 시 즉시 생성되도록
    if (!isBossActive && currentTime - lastHelicopterSpawnTime >= MIN_HELICOPTER_SPAWN_INTERVAL) {
        if (Math.random() < 0.01) { // 1% 확률로 헬리콥터 생성
            const helicopter = createHelicopter();
            if (helicopter) {
                enemies.push(helicopter);
                lastHelicopterSpawnTime = currentTime;
                console.log('헬리콥터1이 enemies 배열에 추가됨');
            } else {
                console.log('헬리콥터1 생성 실패 - 보호막 헬리콥터 제한에 도달');
            }
        }
    }
    
    let helicopterFiredThisFrame = false;
    enemies = enemies.filter(enemy => {
        updateEnemyPosition(enemy, {helicopterFiredThisFrame});
        drawEnemy(enemy);
        return checkEnemyCollisions(enemy);
    });
    handleEnemyPlaneBullets();
    handleEnemyBullets();
    handleHelicopterBullets();
}

// 뱀 패턴 처리 함수 수정
function handleSnakePattern() {
    const currentTime = Date.now();
    
    // 새로운 그룹 생성 체크
    if (currentTime - lastSnakeGroupTime >= snakeGroupInterval && 
        snakeGroups.length < maxSnakeGroups) {
        lastSnakeGroupTime = currentTime;
        startSnakePattern();
    }
    
    // 각 그룹 처리
    snakeGroups = snakeGroups.filter(group => {
        if (!group.isActive) return false;
        
        // 그룹의 지속 시간 체크
        if (currentTime - group.startTime >= snakePatternDuration) {
            group.isActive = false;
            return false;
        }
        
        // 초기 비행기 생성 (그룹이 시작될 때 한 번만)
        if (!group.initialEnemiesCreated) {
            if (currentTime - group.patternInterval >= 300 && group.enemies.length < 10) {
                group.patternInterval = currentTime;
                const lastEnemy = group.enemies[group.enemies.length - 1];
                const newEnemy = {
                    x: lastEnemy.x,
                    y: lastEnemy.y,
                    width: 30,
                    height: 30,
                    speed: group.speed,
                    type: 'dynamite', // 'snake'에서 'dynamite'로 변경
                    targetX: lastEnemy.x,
                    targetY: lastEnemy.y,
                    angle: lastEnemy.angle,
                    isHit: false,
                    amplitude: group.amplitude,
                    frequency: group.frequency
                };
                group.enemies.push(newEnemy);
            }
            
            if (group.enemies.length >= 10) {
                group.initialEnemiesCreated = true;
            }
        }
        
        // 그룹 내 적군 이동
        group.enemies.forEach((enemy, index) => {
            if (index === 0) {
                // 첫 번째 적의 이동 패턴
                switch(group.patternType) {
                    case PATTERN_TYPES.SNAKE:
                        enemy.angle += 0.03;
                        const baseX = group.startX;
                        const waveX = Math.sin(enemy.angle * group.frequency) * group.amplitude;
                        enemy.x = baseX + waveX;
                        enemy.y += enemy.speed;
                        break;
                        
                    case PATTERN_TYPES.VERTICAL:
                        enemy.y += enemy.speed;
                        enemy.x = group.startX + Math.sin(enemy.angle) * 30;
                        enemy.angle += 0.02;
                        break;
                        
                    case PATTERN_TYPES.DIAGONAL:
                        enemy.x += enemy.speed * group.direction;
                        enemy.y += enemy.speed;
                        if (enemy.x <= 0 || enemy.x >= canvas.width - enemy.width) {
                            group.direction *= -1;
                            enemy.y += 20;
                        }
                        break;
                        
                    case PATTERN_TYPES.HORIZONTAL:
                        enemy.x += enemy.speed * group.direction;
                        enemy.y = group.startY + Math.sin(enemy.angle) * 40;
                        enemy.angle += 0.02;
                        if (enemy.x <= 0 || enemy.x >= canvas.width - enemy.width) {
                            group.direction *= -1;
                            group.startY += 30;
                        }
                        break;
                        
                    case PATTERN_TYPES.SPIRAL:
                        group.spiralAngle += 0.05;
                        group.spiralRadius += 0.5;
                        enemy.x = group.startX + Math.cos(group.spiralAngle) * group.spiralRadius;
                        enemy.y = group.startY + Math.sin(group.spiralAngle) * group.spiralRadius;
                        break;
                }
            } else {
                const prevEnemy = group.enemies[index - 1];
                const dx = prevEnemy.x - enemy.x;
                const dy = prevEnemy.y - enemy.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                const targetDistance = 35;
                if (distance > targetDistance) {
                    const moveX = (dx / distance) * (distance - targetDistance);
                    const moveY = (dy / distance) * (distance - targetDistance);
                    enemy.x += moveX;
                    enemy.y += moveY;
                }
            }
            
            if (!enemy.isHit) {
                drawEnemy(enemy);
            }
        });
        
        // 충돌 체크
        let collisionOccurred = false;
        group.enemies.forEach((enemy, index) => {
            if (!enemy.isHit && !collisionOccurred) {
                bullets = bullets.filter(bullet => {
                    if (checkCollision(bullet, enemy)) {
                        explosions.push(new Explosion(
                            enemy.x + enemy.width/2,
                            enemy.y + enemy.height/2
                        ));
                        updateScore(100);
                        safePlaySound('shoot');
                        enemy.isHit = true;
                        return false;
                    }
                    return true;
                });
                
                if (!collisionOccurred && (checkCollision(player, enemy) || 
                    (hasSecondPlane && checkCollision(secondPlane, enemy)))) {
                    handleCollision();
                    explosions.push(new Explosion(enemy.x + enemy.width/2, enemy.y + enemy.height/2));
                    enemy.isHit = true;
                    collisionOccurred = true;
                }
            }
        });
        
        // 화면 밖으로 나간 적 제거
        group.enemies = group.enemies.filter(enemy => 
            enemy.y < canvas.height + 100 && 
            enemy.y > -100 && 
            enemy.x > -100 && 
            enemy.x < canvas.width + 100
        );
        
        return group.enemies.length > 0;
    });
    
    if (snakeGroups.length === 0) {
        isSnakePatternActive = false;
    }
}

// 적 충돌 체크 함수 수정
function checkEnemyCollisions(enemy) {
    // 보스가 이미 파괴된 경우 처리하지 않음
    if (enemy.isBoss && bossDestroyed) {
        return false;
    }

    // 총알과 충돌 체크
    let isHit = false;
    bullets = bullets.filter(bullet => {
        // 보스 총알은 여기서 처리하지 않음
        if (bullet.isBossBullet) {
            return true;
        }

        if (checkCollision(bullet, enemy)) {
            // 헬리콥터 보호막 처리
            if ((enemy.type === ENEMY_TYPES.HELICOPTER || enemy.type === ENEMY_TYPES.HELICOPTER2) && 
                enemy.shieldActive && enemy.shieldHealth > 0) {
                
                // 보호막 체력 감소
                enemy.shieldHealth--;
                enemy.hitEffectTimer = enemy.hitEffectDuration;
                
                // 보호막 피격 효과
                explosions.push(new Explosion(
                    bullet.x,
                    bullet.y,
                    false
                ));
                
                // 보호막 파괴 시 (헬리콥터1과 헬리콥터2 모두 포함)
                if (enemy.shieldHealth <= 0) {
                    enemy.shieldActive = false;
                    
                    // 보호막 헬리콥터 파괴 카운터 증가 (헬리콥터1과 헬리콥터2 모두)
                    if (enemy.type === ENEMY_TYPES.HELICOPTER || enemy.type === ENEMY_TYPES.HELICOPTER2) {
                        shieldedHelicopterDestroyed++;
                        console.log(`보호막 헬리콥터 파괴됨: ${enemy.type}, 총 파괴 수: ${shieldedHelicopterDestroyed}`);
                        
                        // 1대 파괴할 때마다 목숨 1개 추가
                        if (shieldedHelicopterDestroyed % 1 === 0) {
                            handleLifeIncrease('보호막 헬리콥터 파괴');
                        }
                    }
                    
                    // 보호막 파괴 효과
                    explosions.push(new Explosion(
                        enemy.x + enemy.width/2,
                        enemy.y + enemy.height/2,
                        false,
                        80  // 보호막 파괴 시 더 큰 폭발
                    ));
                    
                    // 보호막 파괴음 (보스와 동일하게 적용)
                    safePlaySound('explosion');
                    safePlaySound('collision');
                } else {
                    // 보호막 피격음 (보스와 동일하게 적용)
                    safePlaySound('collision');
                    safePlaySound('shoot');
                }
                
                // 총알 제거
                return false;
            }
            
            // 보스인 경우 체력 감소
            if (enemy.isBoss) {
                const currentTime = Date.now();
                
                // 특수 무기인 경우 즉시 파괴
                if (bullet.isSpecial) {
                    console.log('보스가 특수 무기에 맞음');
                    if (handleBossDestruction(enemy, true)) {
                        return false;
                    }
                }
                
                // 일반 총알인 경우
                enemy.hitCount++;
                console.log('보스 총알 맞은 횟수:', enemy.hitCount);
                
                // 피격 시간 추적 시작
                if (!enemy.isBeingHit) {
                    enemy.isBeingHit = true;
                    enemy.lastHitTime = currentTime;
                }
                
                // 보스가 맞았을 때 시각 효과 추가
                explosions.push(new Explosion(
                    bullet.x,
                    bullet.y,
                    false
                ));
                
                // 체력 감소 (각 총알당 50의 데미지로 조정하여 15초 체공에 맞게)
                enemy.health = Math.max(0, enemy.health - 50);
                bossHealth = enemy.health;
                
                // 체력이 0이 되면 즉시 파괴
                if (enemy.health <= 0) {
                    console.log('보스 파괴됨 - 체력 소진:', {
                        health: enemy.health,
                        bossHealth: bossHealth
                    });
                    if (handleBossDestruction(enemy, false)) {
                        return false;
                    }
                }
                
                // 보스 피격음 재생
                safePlaySound('collision');
                // 추가: 플레이어 총알이 보스에 명중 시 발사음도 재생
                safePlaySound('shoot');
                
                // 피격 시간이 15초를 넘으면 화면을 벗어나도록 설정
                const totalTime = currentTime - enemy.lastUpdateTime;
                const hitTimeThreshold = 15000; // 15초로 고정
                
                if (enemy.totalHitTime >= hitTimeThreshold) {
                    console.log('보스가 15초 후 화면을 벗어남:', {
                        totalHitTime: enemy.totalHitTime,
                        threshold: hitTimeThreshold
                    });
                    // 보스를 화면 옆으로 이동시켜 벗어나게 함
                    enemy.exitMode = true;
                    enemy.exitSpeed = Math.random() > 0.5 ? 3 : -3; // 랜덤하게 좌우 중 하나 선택
                }
                
                // 보스가 파괴되지 않은 상태에서는 점수 부여하지 않음
                isHit = true;
                return false;
            } else {
                // 일반 적 처치 (보호막이 없는 헬리콥터 또는 일반 비행기)
                if ((enemy.type === ENEMY_TYPES.HELICOPTER || enemy.type === ENEMY_TYPES.HELICOPTER2) && 
                    enemy.shieldActive && enemy.shieldHealth > 0) {
                    // 보호막이 있는 헬리콥터는 이미 위에서 처리됨
                    return true;
                }
                
                // 보호막이 없는 헬리콥터 파괴 시 보스와 동일한 시각효과 적용
                if (enemy.type === ENEMY_TYPES.HELICOPTER || enemy.type === ENEMY_TYPES.HELICOPTER2) {
                    // 큰 폭발 효과 (보스와 동일)
                    explosions.push(new Explosion(
                        enemy.x + enemy.width/2,
                        enemy.y + enemy.height/2,
                        true
                    ));
                    
                    // 추가 폭발 효과 (보스와 동일)
                    for (let i = 0; i < 8; i++) {
                        const angle = (Math.PI * 2 / 8) * i;
                        const distance = 50;
                        explosions.push(new Explosion(
                            enemy.x + enemy.width/2 + Math.cos(angle) * distance,
                            enemy.y + enemy.height/2 + Math.sin(angle) * distance,
                            false
                        ));
                    }
                    
                    // 헬리콥터 파괴 시 보너스 점수
                    updateScore(enemy.score || 150);
                } else {
                    // 일반 비행기 파괴 시 기존 효과
                    explosions.push(new Explosion(
                        enemy.x + enemy.width/2,
                        enemy.y + enemy.height/2
                    ));
                    updateScore(10);
                }
                
                // 추가: 플레이어 총알이 적 비행기/헬기에 명중 시 발사음 재생
                safePlaySound('shoot');
            }
                        
            isHit = true;
            return false;
        }
        return true;
    });

    // 보스의 피격 시간 업데이트
    if (enemy.isBoss && enemy.isBeingHit) {
        const currentTime = Date.now();
        const timeSinceLastHit = currentTime - enemy.lastHitTime;
        
        // 1초 이상 피격이 없으면 피격 상태 해제
        if (timeSinceLastHit > 1000) {
            enemy.isBeingHit = false;
        } else {
            // 피격 시간 누적
            enemy.totalHitTime += timeSinceLastHit;
            enemy.lastHitTime = currentTime;
        }
    }

    // 보스가 파괴된 경우 enemies 배열에서 제거
    if (enemy.isBoss && bossDestroyed) {
        return false;
    }

    if (isHit && !enemy.isBoss) {
        return false;
    }

    // 플레이어와 충돌 체크
    if (checkCollision(player, enemy) || (hasSecondPlane && checkCollision(secondPlane, enemy))) {
        handleCollision();
        explosions.push(new Explosion(enemy.x + enemy.width/2, enemy.y + enemy.height/2));
        return false;
    }

    // 화면 밖으로 나간 적 제거
    return enemy.y < canvas.height + 100 && 
           enemy.y > -100 && 
           enemy.x > -100 && 
           enemy.x < canvas.width + 100;
}

// 총알 발사 처리 함수 수정
function handleBulletFiring() {
    const currentTime = Date.now();
    const currentFireDelay = isContinuousFire ? continuousFireDelay : fireDelay;
    const adjustedFireDelay = currentFireDelay / fireRateMultiplier;
    const currentBulletSize = calculateBulletSize();
    
    // 연속 발사 상태 체크
    if (isSpacePressed && currentTime - spacePressTime > minPressDuration) {
        isContinuousFire = true;
    }
    
    // 발사 조건 체크
    if (isSpacePressed && canFire) {
        // 단발 발사일 때는 더 엄격한 조건 체크
        if (!isContinuousFire) {
            // 마지막 발사 후 일정 시간이 지나지 않았으면 발사하지 않음
            if (currentTime - lastFireTime < singleShotCooldown) {
                return;
            }
            // 스페이스바를 누른 시간이 너무 짧거나 길면 발사하지 않음
            const pressDuration = currentTime - spacePressTime;
            if (pressDuration < 50 || pressDuration > 150) {
                return;
            }
            // 마지막 해제 후 일정 시간이 지나지 않았으면 발사하지 않음
            if (currentTime - lastReleaseTime < minReleaseDuration) {
                return;
            }
        }
        
        // 연속 발사일 때는 딜레이 체크
        if (isContinuousFire && currentTime - lastFireTime < adjustedFireDelay) {
            return;
        }
        
        lastFireTime = currentTime;
        canFire = false;  // 발사 후 즉시 발사 불가 상태로 변경
        
            // 일반 총알 발사 (한 발씩)
            const bullet = {
                x: player.x + player.width/2, // 기본값에서
                y: player.y,                  // 기본값에서
                width: currentBulletSize,
                height: currentBulletSize * 2,
                speed: bulletSpeed,
                damage: 100 * damageMultiplier,
                isBossBullet: false,
                isSpecial: false
            };
            // 머리 끝 중앙에서 발사되도록 조정
            bullet.x = player.x + player.width/2;
            bullet.y = player.y;
            bullets.push(bullet);
        
        // 두 번째 비행기 발사
        if (hasSecondPlane) {
                    const bullet = {
                        x: secondPlane.x + secondPlane.width/2,
                        y: secondPlane.y,
                        width: currentBulletSize,
                        height: currentBulletSize * 2,
                        speed: bulletSpeed,
                        damage: 100 * damageMultiplier,
                        isBossBullet: false,
                        isSpecial: false
                    };
                    bullets.push(bullet);
        }
        
        // 발사음 재생 (볼륨 조정)
        if (currentTime - lastFireTime >= 20) {
            safePlaySound('shoot');
            // shootSound.volume = 0.4;  // 발사음 볼륨 설정 (이 줄 삭제)
        }
        
        // 일정 시간 후 다시 발사 가능하도록 설정
        setTimeout(() => {
            canFire = true;
        }, isContinuousFire ? 20 : 400);  // 연속 발사일 때는 빠르게, 단발일 때는 더 느리게
    }
}

// 특수 무기 처리 함수 수정 (첨부 파일과 동일한 방식)
function handleSpecialWeapon() {
    if (specialWeaponCount > 0 && keys.KeyB) {  // 특수무기 개수가 0보다 클 때 사용 가능
        // 특수 무기 발사 - 더 많은 총알과 강력한 효과
        for (let i = 0; i < 360; i += 5) { // 각도 간격을 10도에서 5도로 감소
            const angle = (i * Math.PI) / 180;
            const bullet = {
                x: player.x + player.width/2,
                y: player.y,
                width: 12,  // 총알 크기 증가
                height: 12, // 총알 크기 증가
                speed: 12,  // 속도 증가
                angle: angle,
                isSpecial: true,
                life: 100,  // 총알 지속 시간 추가
                trail: []   // 꼬리 효과를 위한 배열
            };
            bullets.push(bullet);
        }
        
        // 두 번째 비행기가 있을 경우 추가 발사
        if (hasSecondPlane) {
            for (let i = 0; i < 360; i += 5) {
                const angle = (i * Math.PI) / 180;
                const bullet = {
                    x: secondPlane.x + secondPlane.width/2,
                    y: secondPlane.y,
                    width: 12,
                    height: 12,
                    speed: 12,
                    angle: angle,
                    isSpecial: true,
                    life: 100,
                    trail: []
                };
                bullets.push(bullet);
            }
        }
        
        // 특수무기 사용 후 상태 업데이트 (첨부 파일과 동일한 방식)
        specialWeaponCount--;  // 특수무기 개수 감소
        specialWeaponCharged = specialWeaponCount > 0;
        
        console.log(`특수무기 사용 후: 개수 ${specialWeaponCount}, 충전량 ${specialWeaponCharge}`);
        
        // 특수무기 소진 시 충전량 초기화
        if (specialWeaponCount === 0) {
            specialWeaponCharge = 0;
            console.log('특수무기 소진 - 충전량 초기화');
        }
        
        // 특수 무기 발사 효과음
        safePlaySound('shoot');
        
        // V키 상태 초기화
        keys.KeyB = false;  // KeyN을 KeyB로 변경
    }
}

// 폭발 효과 업데이트 및 그리기
function handleExplosions() {
    explosions = explosions.filter(explosion => {
        // 상단 효과 무시 영역 체크
        if (explosion.y < TOP_EFFECT_ZONE) {
            return false; // 폭발 효과 제거
        }
        
        explosion.update();
        explosion.draw();
        return !explosion.isFinished;
    });
}

// UI 그리기 함수 수정
function drawUI() {
    // 플레이어 비행기 그리기
    drawAirplane(player.x, player.y, player.width, player.height, 'white');
    if (hasSecondPlane) {
        drawAirplane(secondPlane.x, secondPlane.y, secondPlane.width, secondPlane.height, 'white');
    }

    // 점수와 레벨 표시 (일정한 간격으로 정리)
    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`점수: ${score}`, 20, 40);
    ctx.fillText(`레벨: ${gameLevel} (${getDifficultyName(gameLevel)})`, 20, 70);
    ctx.fillText(`다음 레벨까지: ${Math.max(0, levelUpScore - levelScore)}점`, 20, 100);
    ctx.fillText(`최고 점수: ${highScore}`, 20, 130);
    ctx.fillText(`최고 점수 리셋: R키`, 20, 160);
    if (!hasSecondPlane) {
        // 다음 추가 비행기까지 남은 점수 계산
        const nextPlaneScore = Math.ceil(score / 2000) * 2000;
        const remainingScore = Math.max(0, nextPlaneScore - score);
        ctx.fillText(`다음 추가 비행기까지: ${remainingScore}점`, 20, 190);
    } else {
        const remainingTime = Math.ceil((10000 - (Date.now() - secondPlaneTimer)) / 1000);
        ctx.fillText(`추가 비행기 남은 시간: ${remainingTime}초`, 20, 190);
    }
    ctx.fillText(`일시정지: P키`, 20, 220);
    
    // 충돌 횟수 표시 (깜빡이는 효과 포함)
    if (lifeWarningBlinkTimer > 0) {
        // 깜빡이는 효과: 흰 배경에 빨간 텍스트
        const blinkSpeed = 200; // 깜빡임 속도 (밀리초)
        const currentTime = Date.now();
        const isBlinking = Math.floor(currentTime / blinkSpeed) % 2 === 0;
        
        if (isBlinking) {
            // 흰 배경에 빨간 텍스트 (텍스트 전체를 덮도록)
            ctx.fillStyle = 'white';
            ctx.fillRect(15, 235, 150, 30);
            ctx.fillStyle = 'red';
        } else {
            // 빨간 텍스트
            ctx.fillStyle = 'red';
        }
    } else {
        // 일반 상태: 빨간 텍스트
        ctx.fillStyle = 'red';
    }
    ctx.font = 'bold 20px Arial';  // 폰트를 진하게 변경
    ctx.fillText(`남은 목숨: ${maxLives - collisionCount}`, 20, 255);
    
    // 보호막 정보 표시
    const shieldedHelicopters = getActiveShieldedHelicopters();
    
    // 보호막 헬리콥터 파괴 카운터 표시 제거됨
    
    // 목숨 추가 메시지 표시
    if (window.lifeAddedMessage && window.lifeAddedMessage.show) {
        const currentTime = Date.now();
        const elapsed = currentTime - window.lifeAddedMessage.startTime;
        
        if (elapsed < window.lifeAddedMessage.duration) {
            // 메시지 페이드 아웃 효과
            const alpha = 1 - (elapsed / window.lifeAddedMessage.duration);
            
            // 메시지 배경
            ctx.fillStyle = `rgba(0, 255, 0, ${alpha * 0.3})`;
            ctx.fillRect(canvas.width/2 - 150, canvas.height/2 - 30, 300, 60);
            
            // 메시지 테두리
            ctx.strokeStyle = `rgba(0, 255, 0, ${alpha})`;
            ctx.lineWidth = 3;
            ctx.strokeRect(canvas.width/2 - 150, canvas.height/2 - 30, 300, 60);
            
            // 메시지 텍스트
            ctx.fillStyle = `rgba(0, 255, 0, ${alpha})`;
            ctx.font = 'bold 24px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('목숨 1개 추가!', canvas.width/2, canvas.height/2 + 5);
            ctx.font = 'bold 18px Arial';
            ctx.fillText(`보호막 헬리콥터 ${shieldedHelicopterDestroyed}대 파괴`, canvas.width/2, canvas.height/2 + 30);
        } else {
            // 메시지 표시 시간이 지나면 숨김
            window.lifeAddedMessage.show = false;
        }
    }

    // 제작자 정보 표시
    ctx.fillStyle = 'white';
    ctx.font = '16px Arial';
    ctx.textAlign = 'right';
    ctx.fillText('제작/저작권자:Lee.SS.C', canvas.width - 20, canvas.height - 30); 

    // 특수 무기 게이지 표시
    const shieldInfoHeight = 280;
    
    // 특수 무기 게이지 및 개수 표시 (첨부 파일과 동일한 방식)
    const chargePercent = Math.floor((specialWeaponCharge / SPECIAL_WEAPON_MAX_CHARGE) * 100);
    const hasSpecialWeapon = specialWeaponCount > 0;
    const displayCount = hasSpecialWeapon ? specialWeaponCount : 0;
    
    // 깜빡이는 효과를 위한 시간 계산 (특수무기가 있을 때만)
        const blinkSpeed = 500; // 깜빡임 속도 (밀리초)
        const currentTime = Date.now();
    const isRed = hasSpecialWeapon && Math.floor(currentTime / blinkSpeed) % 2 === 0;
    
    // 배경색 설정 (게이지 바) - 원상복구
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillRect(10, shieldInfoHeight, 200, 20);
    
    // 게이지 바 색상 설정
    if (hasSpecialWeapon) {
        ctx.fillStyle = isRed ? 'rgba(255, 0, 0, 0.5)' : 'rgba(0, 255, 255, 0.8)';  // 청록색/반투명 빨간색
    } else {
        ctx.fillStyle = 'rgba(0, 255, 255, 0.8)';  // 청록색 게이지
    }
    ctx.fillRect(10, shieldInfoHeight, (specialWeaponCharge / SPECIAL_WEAPON_MAX_CHARGE) * 200, 20);
    
    // 테두리 효과 - 원상복구
    if (hasSpecialWeapon) {
        ctx.strokeStyle = isRed ? 'rgba(255, 0, 0, 0.7)' : 'cyan';  // 반투명 빨간색/청록색
    } else {
        ctx.strokeStyle = 'cyan';  // 원래 색상 복구
    }
        ctx.lineWidth = 2;
    ctx.strokeRect(10, shieldInfoHeight, 200, 20);
    
    // 게이지 바 위에 텍스트 표시 (충전률과 보유 개수) - 원상복구
    if (hasSpecialWeapon) {
        ctx.fillStyle = isRed ? 'rgba(255, 0, 0, 0.8)' : 'cyan';  // 반투명 빨간색/청록색
    } else {
        ctx.fillStyle = 'cyan';  // 원래 색상 복구
    }
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
    const displayText = `특수무기: ${chargePercent}%(보유:${displayCount}/5개)`;
    ctx.fillText(displayText, 110, shieldInfoHeight + 15);
        
    // 준비 완료 메시지 (특수무기가 있을 때만)
    if (hasSpecialWeapon) {
        // 준비 완료 메시지 배경
        ctx.fillStyle = isRed ? 'rgba(255, 0, 0, 0.2)' : 'rgba(0, 255, 255, 0.2)';  // 청록색 배경
        ctx.fillRect(10, shieldInfoHeight + 20, 300, 30);
        
        // 텍스트 색상 설정
        ctx.fillStyle = isRed ? 'rgba(255, 0, 0, 0.8)' : 'cyan';  // 반투명 빨간색/청록색
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('특수무기 발사(알파벳 "B"키 클릭)', 15, shieldInfoHeight + 40);
    }
    
    // 보스 체력 표시 개선
    if (bossActive) {
        // 체력바 배경
        ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
        ctx.fillRect(canvas.width/2 - 100, 20, 200, 20);
        
        // 체력바
        const healthPercentage = bossHealth / BOSS_SETTINGS.HEALTH;
        let healthColor;
        if (healthPercentage > 0.7) healthColor = 'rgba(0, 255, 0, 0.8)';
        else if (healthPercentage > 0.3) healthColor = 'rgba(255, 255, 0, 0.8)';
        else healthColor = 'rgba(255, 0, 0, 0.8)';
        
        ctx.fillStyle = healthColor;
        ctx.fillRect(canvas.width/2 - 100, 20, healthPercentage * 200, 20);
        
        // 체력 수치
        ctx.fillStyle = 'white';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`보스 체력: ${Math.ceil(bossHealth)}/${BOSS_SETTINGS.HEALTH}`, canvas.width/2, 35);
        
        // 페이즈 표시
        const currentPhase = BOSS_SETTINGS.PHASE_THRESHOLDS.findIndex(
            threshold => bossHealth > threshold.health
        );
        if (currentPhase >= 0) {
            ctx.fillText(`페이즈 ${currentPhase + 1}`, canvas.width/2, 60);
            
            // 현재 패턴 표시
            const boss = enemies.find(enemy => enemy.isBoss);
            if (boss && boss.currentPattern) {
                // 패턴 이름 매핑 삭제됨
                const patternName = '알 수 없음';
                ctx.fillText(`패턴: ${patternName}`, canvas.width/2, 85);
            }
        }
        
        // 보스 상태 디버깅 정보
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.font = '12px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`보스 상태: ${bossActive ? '활성' : '비활성'}`, 20, 600);
        ctx.fillText(`isBossActive: ${isBossActive}`, 20, 615);
        ctx.fillText(`bossDestroyed: ${bossDestroyed}`, 20, 630);
    }
    
    // 보스 생성 조건 디버깅 정보 (보스가 없을 때만 표시)
    if (!bossActive && !isBossActive) {
        const currentTime = Date.now();
        const timeSinceLastBoss = currentTime - lastBossSpawnTime;
        const bossSpawnScore = Math.max(50, gameLevel * 100);
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = '14px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`보스 생성 조건: 점수 ${score}/${bossSpawnScore}, 레벨 ${gameLevel}`, 20, 600);
        ctx.fillText(`보스 생성 대기: ${Math.ceil((BOSS_SETTINGS.SPAWN_INTERVAL - timeSinceLastBoss) / 1000)}초`, 20, 615);
        ctx.fillText(`마지막 보스: ${Math.ceil(timeSinceLastBoss / 1000)}초 전`, 20, 630);
    }
}

// 게임 시작 이벤트 리스너 수정
window.addEventListener('load', async () => {
    console.log('페이지 로드 완료');
    
    try {
        // canvas와 context 확인
        if (!canvas || !ctx) {
            throw new Error('Canvas 또는 Context를 찾을 수 없습니다.');
        }
        console.log('Canvas 초기화 확인됨');
        
        // 이미지 로딩 시작
        console.log('이미지 로딩 시작...');
        await loadImages();
        console.log('이미지 로딩 완료');
        
        // 시작 화면 초기화
        initStartScreen();
        
        // IndexedDB 초기화 및 최고 점수 로드
        await initDB();
        highScore = await loadHighScore();
        console.log('초기 최고 점수 로드 완료:', highScore);
        
        // 게임 초기화 실행
        await initializeGame();
    } catch (error) {
        console.error('게임 시작 중 오류:', error);
        // 오류 발생 시 localStorage에서 점수 로드 시도
        try {
            const localScore = parseInt(localStorage.getItem('ThunderboltHighScore')) || 0;
            const backupScore = parseInt(localStorage.getItem('ThunderboltHighScore_backup')) || 0;
            highScore = Math.max(localScore, backupScore);
            console.log('localStorage에서 로드된 최고 점수:', highScore);
            
            // 게임 초기화 재시도
            await initializeGame();
        } catch (e) {
            console.error('localStorage 로드도 실패:', e);
            highScore = 0;
            await initializeGame();
        }
    }
});

// 난이도 이름 반환 함수
function getDifficultyName(level) {
    const names = ['초급', '중급', '고급', '전문가', '마스터'];
    if (level <= 5) {
        return names[level - 1];
    } else if (level <= 10) {
        return `전설 ${level - 5}`;
    } else if (level <= 20) {
        return `신화 ${level - 10}`;
    } else if (level <= 50) {
        return `우주 ${level - 20}`;
    } else {
        return `무한 ${level}`;
    }
}

// 키 이벤트 리스너 수정
document.addEventListener('keydown', (e) => {
    if (e.code in keys) {
        keys[e.code] = true;
        
        // 시작 화면에서 스페이스바를 누르면 게임 시작
        if (isStartScreen && e.code === 'Space') {
            isStartScreen = false;
            return;
        }
        
        // 게임 오버 화면에서 스페이스바를 누르면 게임 재시작
        if (isGameOver && e.code === 'Space') {
            restartGame();
            return;
        }
        
        // 스페이스바를 처음 누를 때
        if (e.code === 'Space' && !isSpacePressed) {
            const currentTime = Date.now();
            // 마지막 해제 후 일정 시간이 지났을 때만 연속 발사 상태 초기화
            if (currentTime - lastReleaseTime > 500) {
                isContinuousFire = false;
            }
            
            isSpacePressed = true;
            spacePressTime = currentTime;
            lastFireTime = 0;  // 첫 발사를 위해 딜레이 초기화
            canFire = true;  // 발사 가능 상태로 설정
        }
    }
    
    // R 키를 눌렀을 때 최고 점수 리셋
    if (e.code === 'KeyR') {
        if (confirm('최고 점수를 리셋하시겠습니까?')) {
            highScore = 0;
            localStorage.setItem('ThunderboltHighScore', '0');
            alert('최고 점수가 리셋되었습니다.');
            console.log('최고 점수 리셋');
        }
    }
    
    // P 키를 눌렀을 때 게임 일시정지/재개
    if (e.code === 'KeyP') {
        isPaused = !isPaused;
    }
});

document.addEventListener('keyup', (e) => {
    if (e.code in keys) {
        keys[e.code] = false;
        
        // 스페이스바를 뗄 때
        if (e.code === 'Space') {
            isSpacePressed = false;
            lastReleaseTime = Date.now();  // 마지막 해제 시간 기록
            canFire = true;  // 발사 가능 상태로 설정
        }
    }
});

// 게임 오버 시 점수 처리 수정
function handleGameOver() {
    safePlaySound('explosion', { volume: 3 }); // 플레이어 폭발음 배 증가
    try {
        if (!isGameOver) {
            isGameOver = true;
            gameOverStartTime = Date.now();
            
            // 최고 점수 저장
            const finalScore = Math.max(score, highScore);
            if (finalScore > 0) {
                saveHighScoreDirectly(finalScore, 'handleGameOver');
            }
            
            // 폭발 효과
            explosions.push(new Explosion(
                player.x + player.width/2,
                player.y + player.height/2,
                true
            ));
            
            // 주변 폭발 효과
            for (let i = 0; i < 12; i++) {
                const angle = (Math.PI * 2 / 12) * i;
                const distance = 60;
                explosions.push(new Explosion(
                    player.x + player.width/2 + Math.cos(angle) * distance,
                    player.y + player.height/2 + Math.sin(angle) * distance,
                    false
                ));
            }
            
            console.log('게임 오버 - 최종 점수:', score, '최고 점수:', highScore);
        }
    } catch (error) {
        console.error('게임 오버 처리 중 오류 발생:', error);
    }
}

// 점수 증가 함수 수정
function updateScore(points) {
    score += points;
    levelScore += points;
    
    // 특수 무기 게이지 증가 (첨부 파일과 동일한 방식)
    // 특수무기가 최대 개수에 도달하지 않은 경우에만 충전
    if (specialWeaponCount < 5) {
        specialWeaponCharge += points;
        console.log(`특수무기 충전: +${points}점, 현재 충전량: ${specialWeaponCharge}/${SPECIAL_WEAPON_MAX_CHARGE}`);
        
        if (specialWeaponCharge >= SPECIAL_WEAPON_MAX_CHARGE) {
            const newWeapons = Math.floor(specialWeaponCharge / SPECIAL_WEAPON_MAX_CHARGE);
            specialWeaponCount += newWeapons;
            // 최대 보유 개수 5개로 제한
            if (specialWeaponCount > 5) {
                specialWeaponCount = 5;
                // 최대 개수 도달 시 충전량 초기화
                specialWeaponCharge = 0;
                console.log('특수무기 최대 개수 도달 - 충전량 초기화');
            } else {
                specialWeaponCharge = specialWeaponCharge % SPECIAL_WEAPON_MAX_CHARGE;
            }
            specialWeaponCharged = specialWeaponCount > 0;
            console.log(`특수무기 획득: ${newWeapons}개, 총 개수: ${specialWeaponCount}, 충전량: ${specialWeaponCharge}`);
        }
    } else {
        // 최대 개수 도달 시 충전량 초기화
        specialWeaponCharge = 0;
        console.log('특수무기 최대 개수 도달 - 충전 중단');
    }
    
    // 최고 점수 즉시 업데이트 및 저장
    if (score > highScore) {
        highScore = score;
        saveHighScoreDirectly(highScore, 'updateScore');
    }
}

// 두 번째 비행기 처리 함수 추가
function handleSecondPlane() {
    // 추가 비행기가 아직 등장하지 않았고, 점수가 2000점 이상이며 이전에 등장한 점수보다 2000점 이상 높을 때 등장
    if (score >= 2000 && !hasSecondPlane && score >= lastSecondPlaneScore + 2000) {
        hasSecondPlane = true;
        lastSecondPlaneScore = score; // 현재 점수를 마지막 등장 점수로 설정
        secondPlane.x = player.x - 60;
        secondPlane.y = player.y;
        secondPlaneTimer = Date.now(); // 타이머 시작
        // 두 번째 비행기 획득 메시지
        ctx.fillStyle = 'yellow';
        ctx.font = '40px Arial';
        ctx.fillText('추가 비행기 획득!', canvas.width/2 - 150, canvas.height/2);
    }

    if (hasSecondPlane) {
        const elapsedTime = Date.now() - secondPlaneTimer;
        if (elapsedTime >= 10000) { // 10초 체크
            hasSecondPlane = false;
            // 두 번째 비행기 소멸 메시지
            ctx.fillStyle = 'red';
            ctx.font = '40px Arial';
            ctx.fillText('추가 비행기 소멸!', canvas.width/2 - 150, canvas.height/2);
        }
    }
}


// 총알 이동 및 충돌 체크 함수 수정
function handleBullets() {
    bullets = bullets.filter(bullet => {
        // 상단 효과 무시 영역 체크
        if (bullet.y < TOP_EFFECT_ZONE) {
            return true; // 총알은 계속 이동하되 효과는 발생하지 않음
        }
        
        if (bullet.isBossBullet && !bullet.isSpread) {
            // 보스 일반 총알 처리 (확산탄 제외)
            bullet.x += Math.cos(bullet.angle) * bullet.speed;
            bullet.y += Math.sin(bullet.angle) * bullet.speed;
            
            // 회전 효과
            bullet.rotation += bullet.rotationSpeed;
            
            // 총알 그리기
            ctx.save();
            ctx.translate(bullet.x, bullet.y);
            ctx.rotate(bullet.rotation);
            
            // 패턴별 색상 및 효과 설정
            const bulletColor = bullet.color || '#ff0000';
            
            // 총알 본체 (꼬리 효과 제거)
            ctx.fillStyle = bulletColor;
            ctx.beginPath();
            ctx.arc(0, 0, bullet.width/2, 0, Math.PI * 2);
            ctx.fill();
            
            // 총알 주변에 빛나는 효과
            const glowGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, bullet.width);
            glowGradient.addColorStop(0, bulletColor.replace(')', ', 0.3)').replace('rgb', 'rgba'));
            glowGradient.addColorStop(1, bulletColor.replace(')', ', 0)').replace('rgb', 'rgba'));
            ctx.fillStyle = glowGradient;
            ctx.beginPath();
            ctx.arc(0, 0, bullet.width, 0, Math.PI * 2);
            ctx.fill();
            
            // 특수 효과 (맥박형 패턴) - 삭제됨
            
            ctx.restore();
            
            // 보스 총알과 플레이어 충돌 체크
            if (checkCollision(bullet, player) || 
                (hasSecondPlane && checkCollision(bullet, secondPlane))) {
                handleCollision();
                // 총알 충돌 시 작은 폭발 효과
                explosions.push(new Explosion(bullet.x, bullet.y, false));
                // 보스 총알 피격 시 shoot 효과음 재생
                safePlaySound('shoot');
                return false;
            }
        } else if (bullet.isSpecial) {
            // 특수 무기 총알 처리
            bullet.x += Math.cos(bullet.angle) * bullet.speed;
            bullet.y += Math.sin(bullet.angle) * bullet.speed;
            
            // 꼬리 효과 제거됨
            
            // 총알 그리기
            ctx.fillStyle = '#00ffff';
            ctx.fillRect(bullet.x - bullet.width/2, bullet.y - bullet.height/2, bullet.width, bullet.height);
            
            // 꼬리 효과 제거됨
            
            // 총알 주변에 빛나는 효과
            const gradient = ctx.createRadialGradient(
                bullet.x, bullet.y, 0,
                bullet.x, bullet.y, bullet.width
            );
            gradient.addColorStop(0, 'rgba(0, 255, 255, 0.3)');
            gradient.addColorStop(1, 'rgba(0, 255, 255, 0)');
            ctx.fillStyle = gradient;
            ctx.fillRect(bullet.x - bullet.width, bullet.y - bullet.height, 
                        bullet.width * 2, bullet.height * 2);
            
            // 총알 지속 시간 감소
            bullet.life--;
            if (bullet.life <= 0) return false;
        } else {
            // 일반 총알 이동
            bullet.y -= bullet.speed;
            ctx.fillStyle = 'yellow';
            ctx.fillRect(bullet.x - bullet.width/2, bullet.y - bullet.height/2, bullet.width, bullet.height);
        }
        
        // 헬리콥터 총알과 충돌 체크
        for (let i = helicopterBullets.length - 1; i >= 0; i--) {
            const helicopterBullet = helicopterBullets[i];
            if (!helicopterBullet.isBossBullet && checkCollision(bullet, helicopterBullet)) {
                // 충돌 시 폭발 효과 추가
                explosions.push(new Explosion(helicopterBullet.x, helicopterBullet.y, false));
                // 충돌음 재생
                safePlay(collisionSound);
                // 헬리콥터 총알 제거
                helicopterBullets.splice(i, 1);
                // 플레이어 총알도 제거
                return false;
            }
        }
        
        // 폭탄과 총알 충돌 체크
        bombs = bombs.filter(bomb => {
            if (checkCollision(bullet, bomb)) {
                // 폭탄 폭발
                explosions.push(new Explosion(bomb.x, bomb.y, true));
                // 충돌음 재생
                safePlay(collisionSound);
                return false;
            }
            return true;
        });

        // 다이나마이트와 총알 충돌 체크
        dynamites = dynamites.filter(dynamite => {
            if (checkCollision(bullet, dynamite)) {
                // 다이나마이트 폭발
                explosions.push(new Explosion(dynamite.x, dynamite.y, true));
                // 충돌음 재생
                safePlay(collisionSound);
                return false;
            }
            return true;
        });
        
        // 화면 밖으로 나간 총알 제거
        return bullet.y > 0 && bullet.y < canvas.height && 
               bullet.x > 0 && bullet.x < canvas.width;
    });
}

// 보스 관련 상수 추가
const BOSS_SETTINGS = {
    HEALTH: 1500,        // 체력 1500으로 조정 (15초 체공에 맞게)
    DAMAGE: 50,          // 보스 총알 데미지
    SPEED: 2,           // 보스 이동 속도
    BULLET_SPEED: 5,    // 보스 총알 속도
    PATTERN_INTERVAL: 4000, // 4초로 조정하여 확산탄과 균형 맞춤
    SPAWN_INTERVAL: 10000,  // 보스 출현 간격 (10초로 단축)
    BONUS_SCORE: 500,    // 보스 처치 보너스 점수를 500으로 설정
    PHASE_THRESHOLDS: [  // 페이즈 전환 체력 임계값 (15초 체공에 맞게 조정)
        { health: 1125, speed: 2.5, bulletSpeed: 6 },
        { health: 750, speed: 3, bulletSpeed: 7 },
        { health: 375, speed: 3.5, bulletSpeed: 8 }
    ]
};

// 게임 상태 변수에 추가
let lastBossSpawnTime = Date.now();  // 마지막 보스 출현 시간을 현재 시간으로 초기화

// 보스 생성 함수 수정
function createBoss() {
    safePlaySound('explosion');
    console.log('보스 헬리콥터 생성 함수 호출됨');
    
    // 이미 보스가 존재하는 경우
    if (bossActive) {
        console.log('보스가 이미 존재하여 생성하지 않음');
        return;
    }
    
    const currentTime = Date.now();
    const timeSinceLastBoss = currentTime - lastBossSpawnTime;
    
    // 시간 체크
    if (timeSinceLastBoss < BOSS_SETTINGS.SPAWN_INTERVAL) {
        console.log('보스 생성 시간이 되지 않음:', {
            timeSinceLastBoss,
            requiredInterval: BOSS_SETTINGS.SPAWN_INTERVAL,
            remainingTime: BOSS_SETTINGS.SPAWN_INTERVAL - timeSinceLastBoss
        });
        return;
    }
    
    console.log('보스 헬리콥터 생성 시작:', {
        currentTime,
        lastBossSpawnTime,
        timeSinceLastBoss
    });
    
    // 보스 상태 초기화
    bossActive = true;
    isBossActive = true; // 보스 활성화 상태 설정
    bossHealth = BOSS_SETTINGS.HEALTH;
    bossPattern = 0;
    bossTimer = currentTime;
    lastBossSpawnTime = currentTime;
    bossDestroyed = false;
    
    // 보스 헬리콥터 객체 생성
    const boss = {
        x: canvas.width / 2 - 34, // 화면 중앙에서 시작
        y: -68,  // 화면 상단에서 시작
        width: 68,
        height: 68,
        speed: BOSS_SETTINGS.SPEED,
        pattern: null, // 패턴 상수 삭제됨
        lastPattern: null, // 이전 패턴 저장용
        angle: 0,
        movePhase: 0,
        phase: 0,
        patternTimer: currentTime,
        bulletSpeed: BOSS_SETTINGS.BULLET_SPEED,
        isBoss: true,
        health: BOSS_SETTINGS.HEALTH,
        randomOffsetX: Math.random() * 120 - 60,
        randomOffsetY: Math.random() * 120 - 60,
        randomAngle: Math.random() * Math.PI * 2,
        randomSpeed: Math.random() * 2 + 1,
        lastUpdateTime: currentTime,
        exitMode: false, // 화면을 벗어나는 모드
        exitSpeed: 3, // 화면을 벗어나는 속도
        lastRotorUpdate: currentTime,  // 로터 회전 업데이트 시간 추적
        hitCount: 0,
        totalHitTime: 0,
        lastHitTime: null,
        isBeingHit: false,
        type: ENEMY_TYPES.HELICOPTER,
        rotorAngle: 0,
        // 좌우 왕복 비행을 위한 속성들
        moveDirection: Math.random() > 0.5 ? 1 : -1, // 1: 오른쪽, -1: 왼쪽
        moveSpeed: 2.0, // 좌우 이동 속도 조정
        moveTimer: 0, // 이동 방향 변경 타이머
        moveInterval: 2000 + Math.random() * 2000, // 2-4초마다 방향 변경 (부드러운 전환)
        rotorSpeed: 0.2,  // 헬리콥터1과 동일한 속도로 설정
        hoverHeight: 150,
        hoverTimer: 0,
        hoverDirection: 1,
        canDropBomb: true,
        lastBombDrop: 0,
        bombDropInterval: 3000,
        currentPattern: null,  // 초기 패턴은 null로 설정 (첫 번째 패턴 실행 시 랜덤 선택)
        isExecutingPattern: false  // 패턴 실행 중 플래그 초기화
    };
    
    // 보스 추가
    enemies.push(boss);
    console.log('보스 헬리콥터 생성 완료:', boss);
    
    // 보스 등장 직후 확산탄 발사 (1초 후)
    setTimeout(() => {
        if (bossActive && enemies.includes(boss)) {
            console.log('보스 등장 직후 확산탄 발사');
            bossFireSpreadShot(boss);
        }
    }, 1000);
    
    // 보스 등장 후 주기적인 확산탄 발사 (7초마다)
    let spreadShotCount = 0;
    const spreadShotInterval = setInterval(() => {
        if (bossActive && enemies.includes(boss) && !bossDestroyed) {
            spreadShotCount++;
            console.log(`보스 주기적 확산탄 발사 (${spreadShotCount}번째)`);
            bossFireSpreadShot(boss);
        } else {
            clearInterval(spreadShotInterval);
        }
    }, 3500); // 3.5초마다 발사
}

// 보스 패턴 처리 함수 삭제됨

// 보스 패턴 실행 함수 삭제됨

// 다양한 모양 그리기 함수들
function drawHeart(bullet) {
    const size = bullet.width;
    ctx.beginPath();
    ctx.moveTo(0, size * 0.3);
    ctx.bezierCurveTo(-size * 0.5, -size * 0.3, -size, size * 0.2, 0, size);
    ctx.bezierCurveTo(size, size * 0.2, size * 0.5, -size * 0.3, 0, size * 0.3);
    ctx.fill();
}

function drawStar(bullet) {
    const size = bullet.width;
    const spikes = 5;
    const outerRadius = size;
    const innerRadius = size * 0.4;
    
    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
        const angle = (i * Math.PI) / spikes;
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
}

function drawFlower(bullet) {
    const size = bullet.width;
    const petals = 6;
    
    ctx.beginPath();
    for (let i = 0; i < petals; i++) {
        const angle = (i * Math.PI * 2) / petals;
        const x = Math.cos(angle) * size * 0.5;
        const y = Math.sin(angle) * size * 0.5;
        ctx.ellipse(x, y, size * 0.2, size * 0.4, angle, 0, Math.PI * 2);
    }
    ctx.fill();
    
    // 중앙 원
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.2, 0, Math.PI * 2);
    ctx.fill();
}

function drawFirework(bullet) {
    const size = bullet.width;
    const rays = 8;
    
    for (let i = 0; i < rays; i++) {
        const angle = (i * Math.PI * 2) / rays;
        const x = Math.cos(angle) * size;
        const y = Math.sin(angle) * size;
        
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(x, y);
        ctx.stroke();
    }
    
    // 중앙 원
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.3, 0, Math.PI * 2);
    ctx.fill();
}

function drawChaos(bullet) {
    const size = bullet.width;
    
    // 랜덤한 선들
    for (let i = 0; i < 5; i++) {
        const angle1 = Math.random() * Math.PI * 2;
        const angle2 = Math.random() * Math.PI * 2;
        const radius1 = Math.random() * size;
        const radius2 = Math.random() * size;
        
        ctx.beginPath();
        ctx.moveTo(Math.cos(angle1) * radius1, Math.sin(angle1) * radius1);
        ctx.lineTo(Math.cos(angle2) * radius2, Math.sin(angle2) * radius2);
        ctx.stroke();
    }
}

function drawTriangle(bullet) {
    const size = bullet.width;
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(-size * 0.866, size * 0.5);
    ctx.lineTo(size * 0.866, size * 0.5);
    ctx.closePath();
    ctx.fill();
}

function drawDiamond(bullet) {
    const size = bullet.width;
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(size, 0);
    ctx.lineTo(0, size);
    ctx.lineTo(-size, 0);
    ctx.closePath();
    ctx.fill();
}

function drawHexagon(bullet) {
    const size = bullet.width;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3;
        const x = Math.cos(angle) * size;
        const y = Math.sin(angle) * size;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
}

function drawOctagon(bullet) {
    const size = bullet.width;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
        const angle = (i * Math.PI) / 4;
        const x = Math.cos(angle) * size;
        const y = Math.sin(angle) * size;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
}

function drawPentagon(bullet) {
    const size = bullet.width;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
        const angle = (i * Math.PI * 2) / 5;
        const x = Math.cos(angle) * size;
        const y = Math.sin(angle) * size;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
}

function drawRectangle(bullet) {
    const size = bullet.width;
    ctx.fillRect(-size/2, -size/2, size, size);
    ctx.strokeRect(-size/2, -size/2, size, size);
}

function drawCircle(bullet) {
    const size = bullet.width;
    ctx.beginPath();
    ctx.arc(0, 0, size/2, 0, Math.PI * 2);
    ctx.fill();
}

function drawSnowflake(bullet) {
    const size = bullet.width;
    ctx.beginPath();
    
    // 중심에서 6방향으로 선 그리기
    for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3;
        const x = Math.cos(angle) * size;
        const y = Math.sin(angle) * size;
        
        ctx.moveTo(0, 0);
        ctx.lineTo(x, y);
        
        // 각 선에 수직선 추가
        const perpAngle = angle + Math.PI / 2;
        const perpX = Math.cos(perpAngle) * size * 0.3;
        const perpY = Math.sin(perpAngle) * size * 0.3;
        
        ctx.moveTo(x * 0.5, y * 0.5);
        ctx.lineTo(x * 0.5 + perpX, y * 0.5 + perpY);
        ctx.moveTo(x * 0.5, y * 0.5);
        ctx.lineTo(x * 0.5 - perpX, y * 0.5 - perpY);
    }
    ctx.stroke();
}

function drawPinwheel(bullet) {
    const size = bullet.width;
    
    // 바람개비의 4개 날개 - 실제 바람개비처럼 삼각형 날개로 그리기
    for (let i = 0; i < 4; i++) {
        const angle = (i * Math.PI) / 2;
        const x1 = Math.cos(angle) * size;
        const y1 = Math.sin(angle) * size;
        const x2 = Math.cos(angle + Math.PI / 4) * size * 0.5;
        const y2 = Math.sin(angle + Math.PI / 4) * size * 0.5;
        const x3 = Math.cos(angle - Math.PI / 4) * size * 0.5;
        const y3 = Math.sin(angle - Math.PI / 4) * size * 0.5;
        
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(x2, y2);
        ctx.lineTo(x1, y1);
        ctx.lineTo(x3, y3);
        ctx.closePath();
        ctx.fill();
    }
}

// 보스 총알 생성 함수 삭제됨

// 보스 확산탄 패턴 함수들 (모바일용에서 복사)
function bossFireSnowflakeShot(boss) {
    console.log('❄️ 눈 결정체 패턴 발사:', { bossId: boss.id, color: '#FFFFFF' });
    // 눈 결정체 패턴 - 흰색 (다층 발사)
    const bossX = boss.x + boss.width/2;
    const bossY = boss.y + boss.height/2;
    
    // 첫 번째 층 - 기본 확산 (방향 변화 추가)
    for (let i = 0; i < 6; i++) {
        const baseAngle = (Math.PI * 2 * i) / 6;
        const directionOffset = Math.sin(i * Math.PI / 3) * 0.3; // 방향 변화
        const angle = baseAngle + directionOffset;
        createBossBullet(boss, angle, 'snowflake_shot', 4);
    }
    
    // 두 번째 층 - 지연 발사 (0.3초 후, 방향 변화 추가)
    setTimeout(() => {
        for (let i = 0; i < 6; i++) {
            const baseAngle = (Math.PI * 2 * i) / 6;
            const rotationOffset = Math.PI / 6; // 30도 회전
            const directionOffset = Math.cos(i * Math.PI / 3) * 0.3; // 방향 변화
            const angle = baseAngle + rotationOffset + directionOffset;
            createBossBullet(boss, angle, 'snowflake_shot', 5);
        }
    }, 300);
}

function bossFirePinwheelShot(boss) {
    console.log('🌀 바람개비 패턴 발사:', { bossId: boss.id, color: '#90EE90' });
    // 바람개비 패턴 - 청녹색 (#90EE90) (나선형 발사)
    const bossX = boss.x + boss.width/2;
    const bossY = boss.y + boss.height/2;
    
    // 나선형 패턴 - 방향 변화가 있는 나선 발사
    for (let i = 0; i < 6; i++) {
        const baseAngle = (Math.PI * 2 * i) / 6;
        const spiralOffset = (i * Math.PI) / 6; // 나선 회전
        const directionOffset = Math.sin(i * Math.PI / 2) * 0.4; // 방향 변화
        const angle = baseAngle + spiralOffset + directionOffset;
        
        // 단순화된 속도
        const speed = 3 + (i * 0.3);
        
        createBossBullet(boss, angle, 'pinwheel_shot', speed);
    }
}

function bossFireTriangleShot(boss) {
    console.log('🔺 삼각형 패턴 발사:', { bossId: boss.id, color: '#32CD32' });
    // 삼각형 패턴 - 밝은 라임그린 (#32CD32) (파동형 발사)
    const bossX = boss.x + boss.width/2;
    const bossY = boss.y + boss.height/2;
    
    // 파동형 패턴 - 3개의 파동으로 발사
    for (let wave = 0; wave < 3; wave++) {
        setTimeout(() => {
            for (let i = 0; i < 4; i++) {
                const baseAngle = (Math.PI * 2 * i) / 4;
                const waveOffset = Math.sin(wave * Math.PI / 3) * 0.5; // 파동 효과
                const angle = baseAngle + waveOffset;
                createBossBullet(boss, angle, 'triangle_shot', 4);
            }
        }, wave * 200); // 200ms 간격으로 파동 발사
    }
}

function bossFireRectangleShot(boss) {
    console.log('🟩 정사각형 패턴 발사:', { bossId: boss.id, color: '#ADFF2F' });
    // 정사각형 패턴 - 연두색 (#ADFF2F) (회전형 발사)
    const bossX = boss.x + boss.width/2;
    const bossY = boss.y + boss.height/2;
    
    // 회전형 패턴 - 4개의 회전으로 발사
    for (let rotation = 0; rotation < 4; rotation++) {
        setTimeout(() => {
            for (let i = 0; i < 3; i++) {
                const baseAngle = (Math.PI * 2 * i) / 3;
                const rotationOffset = (rotation * Math.PI) / 4; // 회전 효과
                const angle = baseAngle + rotationOffset;
                createBossBullet(boss, angle, 'rectangle_shot', 5);
            }
        }, rotation * 150); // 150ms 간격으로 회전 발사
    }
}

function bossFirePentagonShot(boss) {
    console.log('🟠 오각형 패턴 발사:', { bossId: boss.id, color: '#FFA500' });
    // 오각형 패턴 - 주황색 (#FFA500) (폭발형 발사)
    const bossX = boss.x + boss.width/2;
    const bossY = boss.y + boss.height/2;
    
    // 폭발형 패턴 - 3개의 링으로 발사
    for (let ring = 0; ring < 3; ring++) {
        setTimeout(() => {
            for (let i = 0; i < 5; i++) {
                const baseAngle = (Math.PI * 2 * i) / 5;
                const ringOffset = ring * 0.2; // 링 효과
                const angle = baseAngle + ringOffset;
                createBossBullet(boss, angle, 'pentagon_shot', 4 + ring);
            }
        }, ring * 100); // 100ms 간격으로 링 발사
    }
}

function bossFireHexagonShot(boss) {
    console.log('⬡ 육각형 패턴 발사:', { bossId: boss.id, color: '#D3D3D3' });
    // 육각형 패턴 - 밝은 회색 (#D3D3D3) (회전 확산형)
    const bossX = boss.x + boss.width/2;
    const bossY = boss.y + boss.height/2;
    
    // 회전 확산형 패턴 - 3개의 회전으로 발사
    for (let rotation = 0; rotation < 3; rotation++) {
        setTimeout(() => {
            for (let i = 0; i < 6; i++) {
                const baseAngle = (Math.PI * 2 * i) / 6;
                const rotationOffset = (rotation * Math.PI) / 3; // 회전 효과
                const angle = baseAngle + rotationOffset;
                createBossBullet(boss, angle, 'hexagon_shot', 4);
            }
        }, rotation * 150);
    }
}

function bossFireOctagonShot(boss) {
    console.log('🟡 팔각형 패턴 발사:', { bossId: boss.id, color: '#FFD700' });
    // 팔각형 패턴 - 밝은 골드 (#FFD700) (나선 회전형)
    const bossX = boss.x + boss.width/2;
    const bossY = boss.y + boss.height/2;
    
    // 나선 회전형 패턴 - 3개의 나선으로 발사
    for (let spiral = 0; spiral < 3; spiral++) {
        setTimeout(() => {
            for (let i = 0; i < 8; i++) {
                const baseAngle = (Math.PI * 2 * i) / 8;
                const spiralOffset = (spiral * Math.PI) / 4; // 나선 효과
                const angle = baseAngle + spiralOffset;
                createBossBullet(boss, angle, 'octagon_shot', 5);
            }
        }, spiral * 120);
    }
}

function bossFireCircleShot(boss) {
    console.log('🔵 원형 패턴 발사:', { bossId: boss.id, color: '#20B2AA' });
    // 원형 패턴 - 청녹색 (#20B2AA) (원형 파동형)
    const bossX = boss.x + boss.width/2;
    const bossY = boss.y + boss.height/2;
    
    // 원형 파동형 패턴 - 3개의 파동으로 발사
    for (let wave = 0; wave < 3; wave++) {
        setTimeout(() => {
            for (let i = 0; i < 8; i++) {
                const baseAngle = (Math.PI * 2 * i) / 8;
                const waveOffset = Math.sin(wave * Math.PI / 2) * 0.3; // 파동 효과
                const angle = baseAngle + waveOffset;
                createBossBullet(boss, angle, 'circle_shot', 4);
            }
        }, wave * 150);
    }
}

function bossFireCrossShot(boss) {
    console.log('❌ 십자 패턴 발사:', { bossId: boss.id, color: '#FF4500' });
    // 십자 패턴 - 밝은 빨간색 (#FF4500) (교차 확산형 발사)
    const bossX = boss.x + boss.width/2;
    const bossY = boss.y + boss.height/2;
    
    // 교차 확산형 패턴 - 3개의 버스트로 발사
    for (let burst = 0; burst < 3; burst++) {
        setTimeout(() => {
            // 십자 방향으로 발사
            const crossAngles = [0, Math.PI/2, Math.PI, Math.PI*3/2];
            for (let i = 0; i < crossAngles.length; i++) {
                const angle = crossAngles[i] + (burst * 0.2); // 버스트 효과
                createBossBullet(boss, angle, 'cross_shot', 6);
            }
        }, burst * 200); // 200ms 간격으로 버스트 발사
    }
}

function bossFireHeartShot(boss) {
    console.log('💖 하트 패턴 발사:', { bossId: boss.id, color: '#FF69B4' });
    // 하트 패턴 - 밝은 핫핑크 (#FF69B4) (하트 모양 확산)
    const bossX = boss.x + boss.width/2;
    const bossY = boss.y + boss.height/2;
    
    // 하트 모양 확산 패턴 - 3개의 층으로 발사
    for (let layer = 0; layer < 3; layer++) {
        setTimeout(() => {
            for (let i = 0; i < 6; i++) {
                const baseAngle = (Math.PI * 2 * i) / 6;
                const layerOffset = layer * 0.3; // 층 효과
                const angle = baseAngle + layerOffset;
                createBossBullet(boss, angle, 'heart_shot', 4);
            }
        }, layer * 150); // 150ms 간격으로 층 발사
    }
}

function bossFireStarShot(boss) {
    console.log('⭐ 별 패턴 발사:', { bossId: boss.id, color: '#FFFF00' });
    // 별 패턴 - 노란색 (별 모양 확산)
    const bossX = boss.x + boss.width/2;
    const bossY = boss.y + boss.height/2;
    
    // 별 모양 확산 패턴 - 5개의 별로 발사
    for (let star = 0; star < 5; star++) {
        setTimeout(() => {
            for (let i = 0; i < 5; i++) {
                const baseAngle = (Math.PI * 2 * i) / 5;
                const starOffset = (star * Math.PI) / 5; // 별 효과
                const angle = baseAngle + starOffset;
                createBossBullet(boss, angle, 'star_shot', 5);
            }
        }, star * 120); // 120ms 간격으로 별 발사
    }
}

function bossFireFlowerShot(boss) {
    // 꽃 패턴 - 밝은 딥핑크 (#FF1493)
    const bossX = boss.x + boss.width/2;
    const bossY = boss.y + boss.height/2;
    
    for (let i = 0; i < 6; i++) {
        const angle = (Math.PI * 2 * i) / 6;
        createBossBullet(boss, angle, 'flower_shot');
    }
}

function bossFireGearShot(boss) {
    console.log('⚙️ 기어 패턴 발사:', { bossId: boss.id, color: '#C0C0C0' });
    // 기어 패턴 - 은색 (#C0C0C0)
    const bossX = boss.x + boss.width/2;
    const bossY = boss.y + boss.height/2;
    
    for (let i = 0; i < 6; i++) {
        const angle = (Math.PI * 2 * i) / 6;
        createBossBullet(boss, angle, 'gear_shot');
    }
}

function bossFireMoonShot(boss) {
    console.log('🌙 달 패턴 발사:', { bossId: boss.id, color: '#F0E68C' });
    // 달 패턴 - 카키색 (#F0E68C)
    const bossX = boss.x + boss.width/2;
    const bossY = boss.y + boss.height/2;
    
    for (let i = 0; i < 4; i++) {
        const angle = (Math.PI * 2 * i) / 4;
        createBossBullet(boss, angle, 'moon_shot');
    }
}

// 레벨업 체크
function checkLevelUp() {
    if (levelScore >= levelUpScore) {
        safePlaySound('levelup');
        gameLevel++;
        levelScore = 0;
        levelUpScore = 3000; // 항상 3000점으로 고정
        
        // 레벨업 메시지 표시
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffff00';
        ctx.font = '48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Level ${gameLevel}!`, canvas.width/2, canvas.height/2);
        ctx.font = '24px Arial';
        ctx.fillText(`난이도: ${getDifficultyName(gameLevel)}`, canvas.width/2, canvas.height/2 + 40);
    }
}

// 적 공격 패턴 상수 추가
const ENEMY_PATTERNS = {
    NORMAL: 'normal',
    ZIGZAG: 'zigzag',
    CIRCLE: 'circle',
    DIAGONAL: 'diagonal',
    SPIRAL: 'spiral',
    WAVE: 'wave',
    CROSS: 'cross',
    V_SHAPE: 'v_shape',
    RANDOM: 'random',
    CHAOTIC: 'chaotic',  // 새로운 패턴 추가
    BOUNCE: 'bounce'     // 새로운 패턴 추가
};

// 파워업 아이템 타입 상수 추가
const POWERUP_TYPES = {
    SPEED_UP: 'speed_up',
    SHIELD: 'shield',
    DOUBLE_DAMAGE: 'double_damage',
    RAPID_FIRE: 'rapid_fire'
};

// 파워업 아이템 생성 함수
function createPowerUp() {
    const types = Object.values(POWERUP_TYPES);
    const type = types[Math.floor(Math.random() * types.length)];
    
    const powerUp = {
        x: Math.random() * (canvas.width - 30),
        y: -30,
        width: 30,
        height: 30,
        speed: 3,
        type: type,
        active: true,
        duration: 10000, // 10초 지속
        startTime: Date.now()
    };
    
    powerUps.push(powerUp);
}

// 파워업 아이템 처리 함수
function handlePowerUps() {
    powerUps = powerUps.filter(powerUp => {
        // 파워업 아이템 이동
        powerUp.y += powerUp.speed;
        
        // 파워업 아이템 그리기
        ctx.fillStyle = getPowerUpColor(powerUp.type);
        ctx.beginPath();
        ctx.arc(powerUp.x + powerUp.width/2, powerUp.y + powerUp.height/2, 
                powerUp.width/2, 0, Math.PI * 2);
        ctx.fill();
        
        // 플레이어와 충돌 체크
        if (checkCollision(player, powerUp) || 
            (hasSecondPlane && checkCollision(secondPlane, powerUp))) {
            applyPowerUp(powerUp.type);
            return false;
        }
        
        // 화면 밖으로 나간 경우 제거
        return powerUp.y < canvas.height;
    });
}

// 파워업 아이템 색상 반환 함수
function getPowerUpColor(type) {
    switch(type) {
        case POWERUP_TYPES.SPEED_UP:
            return '#00ff00'; // 초록색
        case POWERUP_TYPES.SPREAD_SHOT:
            return '#ffff00'; // 노란색
        case POWERUP_TYPES.SHIELD:
            return '#0000ff'; // 파란색
        case POWERUP_TYPES.DOUBLE_DAMAGE:
            return '#ff0000'; // 빨간색
        case POWERUP_TYPES.RAPID_FIRE:
            return '#ff00ff'; // 보라색
        default:
            return '#ffffff'; // 흰색
    }
}

// 파워업 효과 적용 함수 수정
function applyPowerUp(type) {
    safePlaySound('levelup');
    switch(type) {
        case POWERUP_TYPES.SPEED_UP:
            player.speed *= 1.5;
            setTimeout(() => player.speed /= 1.5, 10000);
            break;
        case POWERUP_TYPES.SHIELD:
            hasShield = true;
            setTimeout(() => hasShield = false, 10000);
            break;
        case POWERUP_TYPES.DOUBLE_DAMAGE:
            damageMultiplier = 2;
            setTimeout(() => damageMultiplier = 1, 10000);
            break;
        case POWERUP_TYPES.RAPID_FIRE:
            fireRateMultiplier = 4;  // 연사 속도 증가 효과 더욱 강화
            setTimeout(() => fireRateMultiplier = 1, 10000);
            break;
    }
}

// 게임 상태 변수에 추가
let powerUps = [];
let hasShield = false;
let damageMultiplier = 1;
let fireRateMultiplier = 1;
let lastFireTime = 0;  // 마지막 발사 시간
let isSpacePressed = false;  // 스페이스바 누름 상태
let spacePressTime = 0;  // 스페이스바를 처음 누른 시간
let fireDelay = 600;  // 기본 발사 딜레이 (끊어서 발사할 때 - 더 느리게)
let continuousFireDelay = 50;  // 연속 발사 딜레이 (빠르게)
let bulletSpeed = 12;  // 총알 속도
let baseBulletSize = 4.5;  // 기본 총알 크기 (1.5배 증가)
let isContinuousFire = false;  // 연속 발사 상태
let canFire = true;  // 발사 가능 상태 추가
let lastReleaseTime = 0;  // 마지막 스페이스바 해제 시간
let singleShotCooldown = 500;  // 단발 발사 쿨다운 시간 (더 길게)
let minPressDuration = 200;  // 연속 발사로 전환되는 최소 누름 시간
let minReleaseDuration = 100;  // 단발 발사를 위한 최소 해제 시간

// 총알 크기 계산 함수 수정
function calculateBulletSize() {
    let size = baseBulletSize;
    
    // 현재 게임 점수에 따른 크기 증가
    if (score >= 10000) {
        size = 7.5;  // 1.5배 증가
    } else if (score >= 5000) {
        size = 6.75;  // 1.5배 증가
    }
    
    // 난이도에 따른 크기 증가
    if (gameLevel >= 4) {
        size = Math.max(size, 7.5);  // 1.5배 증가
    } else if (gameLevel >= 3) {
        size = Math.max(size, 6.75);  // 1.5배 증가
    }
    
    return size;
}

// 게임 상태 변수에 추가
let lastEnemySpawnTime = 0;
const MIN_ENEMY_SPAWN_INTERVAL = 500; // 최소 적 생성 간격 (밀리초)

// 게임 상태 변수에 추가
let isStartScreen = true;  // 시작 화면 상태(시작화면 복구)
const startScreenAnimation = 0;  // 시작 화면 애니메이션 변수
let titleY = -100;  // 제목 Y 위치
let subtitleY = canvas.height + 100;  // 부제목 Y 위치
let stars = [];  // 배경 별들

// 시작 화면 초기화 함수
function initStartScreen() {
    // 배경 별들 생성
    stars = [];
    for (let i = 0; i < 100; i++) {
        stars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 2 + 1,
            speed: Math.random() * 2 + 1,
            brightness: Math.random()
        });
    }
}

// 시작 화면 그리기 함수
function drawStartScreen() {
    // 배경 그라데이션
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#000033');
    gradient.addColorStop(1, '#000066');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 별들 그리기
    stars.forEach(star => {
        star.y += star.speed;
        if (star.y > canvas.height) {
            star.y = 0;
            star.x = Math.random() * canvas.width;
        }
        ctx.fillStyle = `rgba(255, 255, 255, ${star.brightness})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
    });

    // 제목 그라데이션
    const titleGradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
    titleGradient.addColorStop(0, '#ff0000');
    titleGradient.addColorStop(0.5, '#ffff00');
    titleGradient.addColorStop(1, '#ff0000');

    // 제목 그림자
    ctx.shadowColor = 'rgba(255, 0, 0, 0.5)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetX = 5;
    ctx.shadowOffsetY = 5;

    // 제목
    ctx.font = 'bold 60px Arial';
    ctx.fillStyle = titleGradient;
    ctx.textAlign = 'center';
    ctx.fillText('Thunderbolt Shooter', canvas.width/2, titleY);

    // 부제목


    // 시작 화면 애니메이션
    if (titleY < canvas.height/2 - 100) {
        titleY += 5;
    }
    if (subtitleY > canvas.height/2 + 50) {
        subtitleY -= 5;
    }

    // 깜빡이는 효과
    const blinkSpeed = 500;
    const currentTime = Date.now();
    const isVisible = Math.floor(currentTime / blinkSpeed) % 2 === 0;
    
    if (isVisible) {
        ctx.font = 'bold 40px Arial';  // 80px에서 40px로 크기 감소
        ctx.fillStyle = '#ffff00';
        ctx.fillText('Press SPACEBAR to Start', canvas.width/2, canvas.height/2 + 100);
    }

    // 조작법 안내
    ctx.font = '20px Arial';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.fillText('Controls:', 50, canvas.height - 200);  // 50픽셀 위로 이동
    ctx.fillText('↑↓←→ : Move', 50, canvas.height - 170);
    ctx.fillText('SPACE : Shoot', 50, canvas.height - 140);
    ctx.fillText('B : Special Weapon', 50, canvas.height - 110);
    ctx.fillText('P : Pause', 50, canvas.height - 80);
}

// 폭탄 생성 함수 추가
function createBomb(enemy) {
    const bomb = {
        id: Date.now() + Math.random(), // 고유 ID 추가
        x: enemy.x + enemy.width/2,
        y: enemy.y + enemy.height,
        width: 15,
        height: 15,
        speed: 5,
        rotation: 0,
        rotationSpeed: 0.1,
        trail: [],
        isBossBomb: !!enemy.isBoss, // 보스가 발사한 폭탄이면 true
        hasCollided: false // 충돌 플래그 초기화
    };
    bombs.push(bomb);
}

// 폭탄 처리 함수 수정
function handleBombs() {
    bombs = bombs.filter(bomb => {
        // 폭탄 이동
        bomb.y += bomb.speed;
        bomb.rotation += bomb.rotationSpeed;
        
        // 폭탄 꼬리 효과 추가
        bomb.trail.unshift({x: bomb.x, y: bomb.y});
        if (bomb.trail.length > 5) bomb.trail.pop();
        
        // 폭탄 그리기
        ctx.save();
        ctx.translate(bomb.x, bomb.y);
        ctx.rotate(bomb.rotation);
        
        // 폭탄 본체
        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.arc(0, 0, bomb.width/2, 0, Math.PI * 2);
        ctx.fill();
        
        // 폭탄 꼬리
        bomb.trail.forEach((pos, index) => {
            const alpha = 1 - (index / bomb.trail.length);
            ctx.fillStyle = `rgba(255, 0, 0, ${alpha * 0.5})`;
            ctx.beginPath();
            ctx.arc(pos.x - bomb.x, pos.y - bomb.y, bomb.width/2 * (1 - index/bomb.trail.length), 0, Math.PI * 2);
            ctx.fill();
        });
        
        ctx.restore();
        
        // 플레이어와 충돌 체크
        if (!bomb.hasCollided && (checkCollision(bomb, player) || (hasSecondPlane && checkCollision(bomb, secondPlane)))) {
            const collisionId = `bomb_${bomb.id}_${Date.now()}`;
            console.log('폭탄 충돌 감지:', { bombId: bomb.id, playerY: player.y, collisionCount: collisionCount, collisionId });
            bomb.hasCollided = true; // 중복 충돌 방지 플래그 설정
            handleCollision(collisionId);
            explosions.push(new Explosion(bomb.x, bomb.y, true));
            // 폭탄 충돌 시 폭발음 재생
            safePlaySound('explosion');
            return false; // 폭탄 즉시 제거로 중복 충돌 방지
        }
        
        // 화면 밖으로 나간 폭탄 제거
        return bomb.y < canvas.height;
    });
}

// 다이나마이트 생성 함수 추가
function createDynamite(enemy) {
    const dynamite = {
        id: Date.now() + Math.random(), // 고유 ID 추가
        x: enemy.x + enemy.width/2,
        y: enemy.y + enemy.height,
        width: 20,
        height: 30,
        speed: 4,
        rotation: 0,
        rotationSpeed: 0.05,
        flameParticles: [],  // 불꽃 파티클 배열
        fuseTimer: 0,  // 도화선 타이머
        fuseLength: 100,  // 도화선 길이
        fuseBurning: true,  // 도화선 연소 상태
        trail: [],  // 꼬리 효과를 위한 배열
        hasCollided: false // 충돌 플래그 초기화
    };
    
    // 초기 불꽃 파티클 생성
    for (let i = 0; i < 10; i++) {
        dynamite.flameParticles.push({
            x: 0,
            y: -dynamite.height/2,
            speed: Math.random() * 2 + 1,
            angle: Math.random() * Math.PI * 2,
            size: Math.random() * 3 + 1,
            life: 1
        });
    }
    
    dynamites.push(dynamite);
}

// 다이나마이트 처리 함수 수정
function handleDynamites() {
    dynamites = dynamites.filter(dynamite => {
        // 다이나마이트 이동
        dynamite.y += dynamite.speed;
        dynamite.rotation += dynamite.rotationSpeed;
        
        // 도화선 타이머 업데이트
        if (dynamite.fuseBurning) {
            dynamite.fuseTimer += 1;
            if (dynamite.fuseTimer >= dynamite.fuseLength) {
                // 도화선이 다 타면 폭발
                explosions.push(new Explosion(dynamite.x, dynamite.y, true));
                return false;
            }
        }
        
        // 불꽃 파티클 업데이트
        dynamite.flameParticles.forEach(particle => {
            particle.x += Math.cos(particle.angle) * particle.speed;
            particle.y += Math.sin(particle.angle) * particle.speed;
            particle.life -= 0.02;
            particle.size *= 0.98;
        });
        
        // 새로운 불꽃 파티클 추가
        if (Math.random() < 0.3) {
            dynamite.flameParticles.push({
                x: 0,
                y: -dynamite.height/2,
                speed: Math.random() * 2 + 1,
                angle: Math.random() * Math.PI * 2,
                size: Math.random() * 3 + 1,
                life: 1
            });
        }
        
        // 오래된 파티클 제거
        dynamite.flameParticles = dynamite.flameParticles.filter(p => p.life > 0);
        
        // 다이나마이트 그리기
        ctx.save();
        ctx.translate(dynamite.x, dynamite.y);
        ctx.rotate(dynamite.rotation);
        
        // 다이나마이트 본체
        ctx.fillStyle = '#8B4513';  // 갈색
        ctx.fillRect(-dynamite.width/2, -dynamite.height/2, dynamite.width, dynamite.height);
        
        // 다이나마이트 줄무늬
        ctx.fillStyle = '#FF0000';  // 빨간색
        for (let i = 0; i < 3; i++) {
            ctx.fillRect(-dynamite.width/2, -dynamite.height/2 + i * 10, dynamite.width, 3);
        }
        
        // 도화선
        const fuseProgress = dynamite.fuseTimer / dynamite.fuseLength;
        ctx.strokeStyle = '#FFA500';  // 주황색
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -dynamite.height/2);
        ctx.lineTo(0, -dynamite.height/2 - 20 * (1 - fuseProgress));
        ctx.stroke();
        
        // 불꽃 파티클 그리기
        dynamite.flameParticles.forEach(particle => {
            ctx.fillStyle = `rgba(255, ${Math.floor(100 + Math.random() * 155)}, 0, ${particle.life})`;
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fill();
        });
        
        ctx.restore();
        
        // 플레이어와 충돌 체크
        if (!dynamite.hasCollided && (checkCollision(dynamite, player) || (hasSecondPlane && checkCollision(dynamite, secondPlane)))) {
            const collisionId = `dynamite_${dynamite.id}_${Date.now()}`;
            console.log('다이너마이트 충돌 감지:', { dynamiteId: dynamite.id, playerY: player.y, collisionCount: collisionCount, collisionId });
            dynamite.hasCollided = true; // 중복 충돌 방지 플래그 설정
            handleCollision(collisionId);
            explosions.push(new Explosion(dynamite.x, dynamite.y, true));
            // 다이너마이트 충돌 시 폭발음 재생
            safePlaySound('explosion');
            return false; // 다이너마이트 즉시 제거로 중복 충돌 방지
        }
        
        // 화면 밖으로 나간 다이나마이트 제거
        return dynamite.y < canvas.height;
    });
}

// 게임 상태 변수에 추가
let maxLives = 5;  // 최대 목숨 수

// 적 타입 상수 추가
const ENEMY_TYPES = {
    PLANE: 'plane',
    HELICOPTER: 'helicopter',
    HELICOPTER2: 'helicopter2'  // 새로운 헬리콥터 타입 추가
};

// 보호막 헬리콥터 필터링 함수
function getActiveShieldedHelicopters() {
    return enemies.filter(enemy => 
        (enemy.type === ENEMY_TYPES.HELICOPTER || enemy.type === ENEMY_TYPES.HELICOPTER2) && 
        enemy.shieldActive && enemy.shieldHealth > 0
    );
}

// 보호막 헬리콥터 개수 확인 함수
function getCurrentShieldedHelicopterCount() {
    return enemies.filter(enemy => 
        (enemy.type === ENEMY_TYPES.HELICOPTER || enemy.type === ENEMY_TYPES.HELICOPTER2) && 
        enemy.shieldActive
    ).length;
}

// 보호막 헬리콥터 생성 가능 여부 확인 함수
function canCreateShieldedHelicopter() {
    const currentCount = getCurrentShieldedHelicopterCount();
    const maxCount = 4;
    
    if (currentCount >= maxCount) {
        console.log('보호막 헬리콥터가 이미 4대 있어서 생성하지 않음', {
            current: currentCount,
            max: maxCount,
            helicopter1: enemies.filter(enemy => enemy.type === ENEMY_TYPES.HELICOPTER),
            helicopter2: enemies.filter(enemy => enemy.type === ENEMY_TYPES.HELICOPTER2)
        });
        return false;
    }
    return true;
}

// 헬리콥터 생성 함수 수정
function createHelicopter() {
    // 보호막 헬리콥터 생성 가능 여부 확인
    if (!canCreateShieldedHelicopter()) {
        return null; // 헬리콥터 생성 중단
    }
    
    const helicopter = {
        x: Math.random() * (canvas.width - 48), // 40 * 1.2 = 48
        y: -48,  // 화면 상단에서 시작
        width: 48, // 40 * 1.2 = 48
        height: 48, // 40 * 1.2 = 48
        speed: 2,
        type: ENEMY_TYPES.HELICOPTER,
        rotorAngle: 0,
        rotorSpeed: 0.2,  // 기본 헬리콥터 회전 속도
        hoverHeight: Math.random() * 200 + 100,
        hoverTimer: 0,
        hoverDirection: 1,
        canDropBomb: Math.random() < 0.4,  // 40% 확률로 폭탄 투하 가능
        lastBombDrop: 0,
        bombDropInterval: 2000 + Math.random() * 3000,
        // 보호막 시스템 추가 (헬리콥터1도 보호막을 가짐)
        shieldHealth: 8,  // 보호막 체력 (헬리콥터2보다 약함)
        maxShieldHealth: 8,
        shieldActive: true,
        shieldRadius: 50,  // 보호막 반지름
        shieldAngle: 0,    // 보호막 회전 각도
        shieldRotationSpeed: 0.02,  // 보호막 회전 속도
        hitEffectTimer: 0,  // 피격 효과 타이머
        hitEffectDuration: 200  // 피격 효과 지속 시간
    };
    
    console.log('헬리콥터1 생성됨:', helicopter);
    return helicopter;
}

// 헬리콥터 그리기 함수 수정
function drawHelicopter(x, y, width, height, rotorAngle) {
    ctx.save();
    ctx.translate(x + width/2, y + height/2);
    
    // 플레이어 방향으로 회전 각도 계산 (머리가 플레이어를 향하도록)
    const dx = player.x - x;
    const dy = player.y - y;
    const angle = Math.atan2(dy, dx) + Math.PI/2;  // Math.PI/2를 더해서 헬리콥터가 플레이어를 향하도록 수정
    ctx.rotate(angle);
    
    // 보스와 helicopter2 타입 확인
    const isBoss = enemies.find(enemy => enemy.x === x && enemy.y === y && enemy.isBoss);
    const isHelicopter2 = enemies.find(enemy => enemy.x === x && enemy.y === y && enemy.type === ENEMY_TYPES.HELICOPTER2);
    
    // 헬리콥터 객체 찾기 (보호막 정보를 위해)
    const helicopter = enemies.find(enemy => enemy.x === x && enemy.y === y && 
        (enemy.type === ENEMY_TYPES.HELICOPTER || enemy.type === ENEMY_TYPES.HELICOPTER2));
    
    let mainColor, secondaryColor, glassColor, glassBorderColor;
    
    if (isBoss) {
        mainColor = '#ff4500';
        secondaryColor = '#ff8c00';
        glassColor = '#ffd700';
        glassBorderColor = '#ffa500';
    } else if (isHelicopter2) {
        mainColor = '#FF8C00';  // 다크 오렌지
        secondaryColor = '#FFA500';  // 오렌지
        glassColor = 'rgba(255, 140, 0, 0.3)';  // 반투명 다크 오렌지
        glassBorderColor = 'rgba(255, 165, 0, 0.5)';  // 반투명 오렌지
    } else {
        mainColor = '#20B2AA';  // 라이트 시안
        secondaryColor = '#008B8B';  // 다크 시안
        glassColor = '#48D1CC';  // 미디엄 시안
        glassBorderColor = '#008B8B';  // 다크 시안
    }

    // 보호막 그리기 (헬리콥터 그리기 전에)
    if (helicopter && helicopter.shieldActive && helicopter.shieldHealth > 0) {
        // 보호막 회전 업데이트
        helicopter.shieldAngle += helicopter.shieldRotationSpeed;
        
        // 피격 효과 타이머 업데이트
        if (helicopter.hitEffectTimer > 0) {
            helicopter.hitEffectTimer -= 16; // 약 60fps 기준
        }
        
        // 보호막 색상 결정
        let shieldColor, shieldBorderColor;
        if (isHelicopter2) {
            // 오렌지 계열 보호막
            shieldColor = helicopter.hitEffectTimer > 0 ? 
                'rgba(255, 100, 0, 0.4)' : 'rgba(255, 140, 0, 0.3)';
            shieldBorderColor = helicopter.hitEffectTimer > 0 ? 
                'rgba(255, 69, 0, 0.8)' : 'rgba(255, 165, 0, 0.6)';
        } else {
            // 블루 계열 보호막
            shieldColor = helicopter.hitEffectTimer > 0 ? 
                'rgba(0, 100, 255, 0.4)' : 'rgba(32, 178, 170, 0.3)';
            shieldBorderColor = helicopter.hitEffectTimer > 0 ? 
                'rgba(0, 69, 255, 0.8)' : 'rgba(0, 139, 139, 0.6)';
        }
        
        // 보호막 그리기
        ctx.save();
        ctx.rotate(helicopter.shieldAngle);
        
        // 보호막 배경 (원형)
        ctx.beginPath();
        ctx.arc(0, 0, helicopter.shieldRadius, 0, Math.PI * 2);
        ctx.fillStyle = shieldColor;
        ctx.fill();
        
        // 보호막 테두리
        ctx.beginPath();
        ctx.arc(0, 0, helicopter.shieldRadius, 0, Math.PI * 2);
        ctx.strokeStyle = shieldBorderColor;
        ctx.lineWidth = 3;
        ctx.stroke();
        
        // 보호막 내부 패턴 (육각형)
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (i * Math.PI) / 3;
            const radius = helicopter.shieldRadius * 0.7;
            const px = Math.cos(angle) * radius;
            const py = Math.sin(angle) * radius;
            if (i === 0) {
                ctx.moveTo(px, py);
            } else {
                ctx.lineTo(px, py);
            }
        }
        ctx.closePath();
        ctx.strokeStyle = shieldBorderColor;
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // 보호막 체력 표시 (작은 원들)
        const healthDots = helicopter.maxShieldHealth;
        const currentHealth = helicopter.shieldHealth;
        for (let i = 0; i < healthDots; i++) {
            const dotAngle = (i * Math.PI * 2) / healthDots;
            const dotRadius = helicopter.shieldRadius * 0.85;
            const dotX = Math.cos(dotAngle) * dotRadius;
            const dotY = Math.sin(dotAngle) * dotRadius;
            
            ctx.beginPath();
            ctx.arc(dotX, dotY, 3, 0, Math.PI * 2);
            if (i < currentHealth) {
                ctx.fillStyle = shieldBorderColor;
            } else {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            }
            ctx.fill();
        }
        
        ctx.restore();
    }

    // 1. 메인 로터 (세로로 길게, 끝에 흰색 포인트, 투명도 효과 + 회전 잔상)
    ctx.save();
    // 로터 회전 적용 (보스는 더 부드러운 회전)
    const rotorRotationAngle = isBoss ? rotorAngle * 0.8 : rotorAngle; // 보스는 회전 속도 조절
    ctx.rotate(rotorRotationAngle);
    
    // 보스와 일반 헬리콥터 모두 4개 블레이드
    const bladeCount = 4;
    const bladeAngle = (Math.PI * 2) / bladeCount;
    
    // 회전 잔상 효과 (3단계)
    const ghostCount = 3;
    for (let ghost = 0; ghost < ghostCount; ghost++) {
        const ghostAlpha = (ghostCount - ghost) / ghostCount * 0.3; // 잔상 투명도
        const ghostOffset = ghost * 0.1; // 잔상 회전 오프셋
        
        for (let i = 0; i < bladeCount; i++) {
            ctx.save();
            ctx.rotate(i * bladeAngle + ghostOffset);
            // 블레이드(투명도 효과 + 잔상)
            ctx.beginPath();
            ctx.moveTo(0, -height*0.55);
            ctx.lineTo(0, height*0.55);
            ctx.lineWidth = width*0.10;
            
            // 잔상별 색상 및 투명도 조정
            let ghostColor;
            if (isBoss) {
                ghostColor = `rgba(255,69,0,${ghostAlpha})`;
            } else if (isHelicopter2) {
                ghostColor = `rgba(255,140,0,${ghostAlpha})`;
            } else {
                ghostColor = `rgba(32,178,170,${ghostAlpha})`;
            }
            
            ctx.strokeStyle = ghostColor;
            ctx.shadowColor = isBoss ? 'rgba(255,140,0,0.3)' : isHelicopter2 ? 'rgba(255,165,0,0.3)' : 'rgba(0,139,139,0.3)';
            ctx.shadowBlur = isBoss ? 12 : 8; // 보스는 더 강한 그림자 효과
            ctx.stroke();
            ctx.shadowBlur = 0;
            
            // 잔상에는 블레이드 끝 강조와 포인트는 그리지 않음 (성능 최적화)
            if (ghost === 0) { // 메인 블레이드에만 추가 효과
                // 블레이드 끝 강조
                ctx.beginPath();
                ctx.arc(0, height*0.55, width*0.05, 0, Math.PI*2);
                ctx.arc(0, -height*0.55, width*0.05, 0, Math.PI*2);
                ctx.fillStyle = isBoss ? '#ff8c00' : isHelicopter2 ? '#FFA500' : '#008B8B';
                ctx.globalAlpha = 0.7;
                ctx.fill();
                ctx.globalAlpha = 1.0;
                // 블레이드 끝 흰색 포인트
                ctx.beginPath();
                ctx.arc(0, height*0.55, width*0.022, 0, Math.PI*2);
                ctx.arc(0, -height*0.55, width*0.022, 0, Math.PI*2);
                ctx.fillStyle = isBoss ? '#ffd700' : isHelicopter2 ? '#9ACD32' : '#20B2AA';
                ctx.globalAlpha = 0.95;
                ctx.fill();
                ctx.globalAlpha = 1.0;
            }
            ctx.restore();
        }
    }
    ctx.restore();

    // 2. 동체 (앞뒤로 길쭉한 타원, 앞쪽 뾰족)
    ctx.beginPath();
    ctx.ellipse(0, 0, width*0.18, height*0.50, 0, 0, Math.PI*2);
    ctx.fillStyle = mainColor;
    ctx.fill();
    // 앞부분 뾰족하게
    ctx.beginPath();
    ctx.moveTo(0, -height*0.50);
    ctx.lineTo(width*0.10, -height*0.60);
    ctx.lineTo(-width*0.10, -height*0.60);
    ctx.closePath();
    ctx.fillStyle = secondaryColor;
    ctx.fill();

    // 3. 조종석 (앞쪽, 세로로 긴 타원)
    ctx.beginPath();
    ctx.ellipse(0, -height*0.36, width*0.13, height*0.18, 0, 0, Math.PI*2);
    ctx.fillStyle = glassColor;
    ctx.fill();
    ctx.strokeStyle = glassBorderColor;
    ctx.lineWidth = 2;
    ctx.stroke();
    // 유리창 분할선
    ctx.beginPath();
    ctx.moveTo(0, -height*0.54);
    ctx.lineTo(0, -height*0.18);
    ctx.moveTo(-width*0.09, -height*0.36);
    ctx.lineTo(width*0.09, -height*0.36);
    ctx.strokeStyle = isBoss ? 'rgba(255,165,0,0.5)' : 'rgba(80,180,255,0.5)';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // 4. 양쪽 엔진/포드 (동체 옆, 세로로)
    ctx.beginPath();
    ctx.ellipse(-width*0.18, 0, width*0.06, height*0.13, 0, 0, Math.PI*2);
    ctx.ellipse(width*0.18, 0, width*0.06, height*0.13, 0, 0, Math.PI*2);
    ctx.fillStyle = isBoss ? '#ff6b00' : isHelicopter2 ? '#9ACD32' : '#20B2AA';
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(-width*0.18, height*0.10, width*0.04, height*0.07, 0, 0, Math.PI*2);
    ctx.ellipse(width*0.18, height*0.10, width*0.04, height*0.07, 0, 0, Math.PI*2);
    ctx.fillStyle = isBoss ? '#ffa500' : isHelicopter2 ? '#ADFF2F' : '#48D1CC';
    ctx.fill();

    // 5. 꼬리빔 (가늘고 길게 뒤로)
    ctx.beginPath();
    ctx.moveTo(-width*0.05, height*0.50);
    ctx.lineTo(-width*0.05, height*0.90);
    ctx.lineTo(width*0.05, height*0.90);
    ctx.lineTo(width*0.05, height*0.50);
    ctx.closePath();
    ctx.fillStyle = secondaryColor;
    ctx.fill();

    // 6. 꼬리 수직날개
    ctx.beginPath();
    ctx.moveTo(0, height*0.90);
    ctx.lineTo(-width*0.10, height*0.98);
    ctx.lineTo(width*0.10, height*0.98);
    ctx.closePath();
    ctx.fillStyle = isBoss ? '#ff4500' : isHelicopter2 ? '#7CFC00' : '#008B8B';
    ctx.fill();

    // 7. 테일로터 (꼬리 끝)
    ctx.save();
    ctx.translate(0, height*0.98);
    // 테일로터 회전 적용
    ctx.rotate(rotorAngle * 2);
    for (let i = 0; i < 2; i++) {
        ctx.save();
        ctx.rotate(i * Math.PI/2);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, height*0.08);
        ctx.lineWidth = 3;
        ctx.strokeStyle = isBoss ? '#ff8c00' : isHelicopter2 ? '#9ACD32' : '#20B2AA';
        ctx.stroke();
        // 테일로터 끝 포인트
        ctx.beginPath();
        ctx.arc(0, height*0.08, width*0.012, 0, Math.PI*2);
        ctx.fillStyle = isBoss ? '#ffd700' : isHelicopter2 ? '#ADFF2F' : '#48D1CC';
        ctx.globalAlpha = 0.85;
        ctx.fill();
        ctx.globalAlpha = 1.0;
        ctx.restore();
    }
    ctx.restore();

    // 8. 착륙 스키드(다리, 앞뒤로)
    ctx.strokeStyle = isBoss ? '#ff8c00' : isHelicopter2 ? '#9ACD32' : '#20B2AA';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-width*0.13, height*0.30);
    ctx.lineTo(width*0.13, height*0.30);
    ctx.moveTo(-width*0.13, height*0.40);
    ctx.lineTo(width*0.13, height*0.40);
    ctx.stroke();
    // 스키드 연결
    ctx.beginPath();
    ctx.moveTo(-width*0.13, height*0.30);
    ctx.lineTo(-width*0.13, height*0.40);
    ctx.moveTo(width*0.13, height*0.30);
    ctx.lineTo(width*0.13, height*0.40);
    ctx.stroke();

    // 9. 그림자 효과
    ctx.globalAlpha = 0.10;
    ctx.beginPath();
    ctx.ellipse(0, height*0.60, width*0.20, height*0.08, 0, 0, Math.PI*2);
    ctx.fillStyle = '#000';
    ctx.fill();
    ctx.globalAlpha = 1.0;

    ctx.restore();
}

// 적 그리기 함수 수정
function drawEnemy(enemy) {
    if (enemy.type === ENEMY_TYPES.HELICOPTER || enemy.type === ENEMY_TYPES.HELICOPTER2) {
        drawHelicopter(enemy.x, enemy.y, enemy.width, enemy.height, enemy.rotorAngle);
    } else if (enemy.type === ENEMY_TYPES.PLANE) {
        drawAirplane(enemy.x, enemy.y, enemy.width, enemy.height, 'red', true);
    } else if (enemy.type === 'dynamite') {
        drawDrone(enemy.x, enemy.y, enemy.width, enemy.height);
    }
}

// 헬리콥터 총알 배열 추가
let helicopterBullets = [];

// 보스 확산탄 전용 배열 추가
let bossSpreadBullets = [];

// 헬리콥터 총알 그리기 함수
function drawHelicopterBullet(bullet) {
    ctx.save();
    ctx.translate(bullet.x, bullet.y);
    ctx.rotate(bullet.angle);
    ctx.fillStyle = '#ffcc00';
    ctx.beginPath();
    ctx.ellipse(0, 0, 18, 4, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();
}

// 헬리콥터 총알 이동 및 충돌 처리 수정
function handleHelicopterBullets() {
    helicopterBullets = helicopterBullets.filter(bullet => {
        bullet.x += Math.cos(bullet.angle) * bullet.speed;
        bullet.y += Math.sin(bullet.angle) * bullet.speed;
        drawHelicopterBullet(bullet);
        
        // 모든 헬리콥터 총알(보스 포함)이 플레이어 총알과 충돌하도록 수정
        for (let i = bullets.length - 1; i >= 0; i--) {
            const playerBullet = bullets[i];
            if (!playerBullet.isBossBullet && !playerBullet.isSpecial && checkCollision(bullet, playerBullet)) {
                console.log('충돌! 플레이어 총알과 헬기 총알', bullet, playerBullet);
                explosions.push(new Explosion(bullet.x, bullet.y, false));
                
                // 충돌음 제거 - 플레이어 총알과 적 총알 충돌 시에는 사운드 없음
                
                bullets.splice(i, 1);
                return false; // 충돌한 헬리콥터 총알 제거
            }
        }
        
        // 플레이어와 충돌 체크
        if (checkCollision(bullet, player) || (hasSecondPlane && checkCollision(bullet, secondPlane))) {
            handleCollision();
            explosions.push(new Explosion(bullet.x, bullet.y, false));
            // 헬리콥터 총알 피격 시 shoot 효과음 재생
            safePlaySound('shoot');
            return false;
        }
        
        // 화면 밖으로 나가면 제거
        return bullet.x > -20 && bullet.x < canvas.width + 20 && bullet.y > -20 && bullet.y < canvas.height + 20;
    });
}

// 드론(삼각형 델타윙) 그리기 함수를 다이나마이트 지뢰 그리기 함수로 변경
function drawDrone(x, y, width, height) {
    // 크기를 70%로 조정
    width = width * 0.7;
    height = height * 0.7;
    
    ctx.save();
    ctx.translate(x + width/2, y + height/2);
    ctx.rotate(Math.PI); // 180도 회전하여 방향 반전
    
    // 미사일 본체
    ctx.beginPath();
    ctx.rect(-width/4, -height/2, width/2, height);
    ctx.fillStyle = '#808080'; // 회색
    ctx.fill();
    ctx.strokeStyle = '#606060';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // 미사일 날개
    const wingWidth = width * 0.4;
    const wingHeight = height * 0.3;
    
    // 왼쪽 날개
    ctx.beginPath();
    ctx.moveTo(-width/4, -height/4);
    ctx.lineTo(-width/4 - wingWidth, -height/4 + wingHeight);
    ctx.lineTo(-width/4, -height/4 + wingHeight);
    ctx.closePath();
    ctx.fillStyle = '#A0A0A0';
    ctx.fill();
    ctx.strokeStyle = '#606060';
    ctx.stroke();
    
    // 오른쪽 날개
    ctx.beginPath();
    ctx.moveTo(width/4, -height/4);
    ctx.lineTo(width/4 + wingWidth, -height/4 + wingHeight);
    ctx.lineTo(width/4, -height/4 + wingHeight);
    ctx.closePath();
    ctx.fillStyle = '#A0A0A0';
    ctx.fill();
    ctx.strokeStyle = '#606060';
    ctx.stroke();
    
    // 미사일 추진부 (엔진)
    ctx.beginPath();
    ctx.rect(-width/6, height/2, width/3, height/4);
    ctx.fillStyle = '#404040';
    ctx.fill();
    ctx.strokeStyle = '#202020';
    ctx.stroke();
    
    // 엔진 불꽃
    const flameHeight = height * 0.4;
    const flameWidth = width * 0.3;
    
    // 외부 불꽃
    ctx.beginPath();
    ctx.moveTo(-flameWidth/2, height/2 + height/4);
    ctx.lineTo(0, height/2 + height/4 + flameHeight);
    ctx.lineTo(flameWidth/2, height/2 + height/4);
    ctx.closePath();
    ctx.fillStyle = '#FF4500'; // 주황색
    ctx.fill();
    
    // 내부 불꽃
    ctx.beginPath();
    ctx.moveTo(-flameWidth/4, height/2 + height/4);
    ctx.lineTo(0, height/2 + height/4 + flameHeight * 0.8);
    ctx.lineTo(flameWidth/4, height/2 + height/4);
    ctx.closePath();
    ctx.fillStyle = '#FFFF00'; // 노란색
    ctx.fill();
    
    // 미사일 머리 부분
    ctx.beginPath();
    ctx.moveTo(-width/4, -height/2);
    ctx.lineTo(0, -height/2 - height/4);
    ctx.lineTo(width/4, -height/2);
    ctx.closePath();
    ctx.fillStyle = '#A0A0A0';
    ctx.fill();
    ctx.strokeStyle = '#606060';
    ctx.stroke();
    
    // 미사일 장식 (빨간색 줄무늬)
    for (let i = 0; i < 2; i++) {
        ctx.beginPath();
        ctx.rect(-width/4, -height/2 + height/4 * i, width/2, 4);
        ctx.fillStyle = '#FF0000';
        ctx.fill();
    }
    
    // 엔진 파티클 효과
    const particleCount = 8;
    for (let i = 0; i < particleCount; i++) {
        const angle = (Math.random() * Math.PI / 2) - Math.PI / 4; // -45도 ~ 45도
        const distance = Math.random() * flameHeight;
        const particleX = Math.cos(angle) * distance;
        const particleY = height/2 + height/4 + Math.sin(angle) * distance;
        
        ctx.beginPath();
        ctx.arc(particleX, particleY, 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, ${Math.floor(Math.random() * 100 + 100)}, 0, ${Math.random() * 0.5 + 0.5})`;
        ctx.fill();
    }
    
    ctx.restore();
}

// 전역 변수 추가
let lastHelicopterShotTime = 0;
const MIN_SHOT_INTERVAL = 5000; // 최소 발사 간격 (5초)

// 전역 변수 추가
let lastHelicopterSpawnTime = 0;
const MIN_HELICOPTER_SPAWN_INTERVAL = 10000; // 10초(10000ms)로 설정
let isBossActive = false; // 보스 활성화 상태 추적

function handleEnemies() {
    const currentTime = Date.now();
    
    // 레벨이 difficultySettings 범위를 벗어난 경우 기본값 사용
    let currentDifficulty;
    if (gameLevel <= 5 && difficultySettings[gameLevel]) {
        currentDifficulty = difficultySettings[gameLevel];
    } else {
        // 레벨 5 이후에는 점진적으로 증가하는 난이도 적용
        const baseLevel = 5;
        const levelMultiplier = 1 + (gameLevel - baseLevel) * 0.2; // 레벨당 20% 증가
        
        currentDifficulty = {
            enemySpeed: difficultySettings[baseLevel].enemySpeed * levelMultiplier,
            enemySpawnRate: Math.min(0.9, difficultySettings[baseLevel].enemySpawnRate * levelMultiplier),
            maxEnemies: Math.min(15, difficultySettings[baseLevel].maxEnemies + Math.floor((gameLevel - baseLevel) / 2)),
            enemyHealth: Math.floor(difficultySettings[baseLevel].enemyHealth * levelMultiplier),
            patternChance: Math.min(0.9, difficultySettings[baseLevel].patternChance * levelMultiplier),
            fireInterval: Math.max(500, difficultySettings[baseLevel].fireInterval / levelMultiplier),
            bombDropChance: Math.min(0.8, difficultySettings[baseLevel].bombDropChance * levelMultiplier),
            bulletSpeed: difficultySettings[baseLevel].enemySpeed * levelMultiplier,
            specialPatternChance: Math.min(0.8, difficultySettings[baseLevel].specialPatternChance * levelMultiplier)
        };
    }
    
    // 안전장치: currentDifficulty가 undefined인 경우 기본값 사용
    if (!currentDifficulty) {
        console.warn(`레벨 ${gameLevel}에 대한 난이도 설정을 찾을 수 없음, 기본값 사용`);
        currentDifficulty = difficultySettings[1];
    }
    
    const bossExists = enemies.some(enemy => enemy.type === 'helicopter' && enemy.isBoss);
    
    // 보스 생성은 gameLoop에서만 처리하도록 주석 처리
    // if (score >= 1000 && !isBossActive && !bossExists) {
    //     createBoss();
    //     isBossActive = true;
    // }
    
    if (bossExists) {
        isBossActive = true;
    } else if (isBossActive) {
        lastHelicopterSpawnTime = currentTime;
        isBossActive = false;
    }
    if (isSnakePatternActive) {
        handleSnakePattern();
    }
    if (currentTime - lastEnemySpawnTime >= MIN_ENEMY_SPAWN_INTERVAL &&
        Math.random() < currentDifficulty.enemySpawnRate && 
        enemies.length < currentDifficulty.maxEnemies &&
        !isGameOver) {
        createEnemy();
        lastEnemySpawnTime = currentTime;
        console.log('새로운 적 생성됨');
    }
    
    let helicopterFiredThisFrame = false;
    enemies = enemies.filter(enemy => {
        updateEnemyPosition(enemy, {helicopterFiredThisFrame});
        drawEnemy(enemy);
        return checkEnemyCollisions(enemy);
    });
    handleEnemyPlaneBullets();
    handleEnemyBullets();
    handleHelicopterBullets();
}

// 중복된 createBoss 함수 제거 - 첫 번째 함수만 사용

// 목숨 증가 처리 함수
function handleLifeIncrease(reason) {
    maxLives++;
    safePlaySound('levelup');
    console.log(`목숨 증가: ${reason}, 현재 목숨: ${maxLives}`);
}

// 보스 파괴 시 처리 - 통합된 파괴 로직
function handleBossDestruction(boss, isSpecialWeapon = false) {
    // 중복 파괴 방지
    if (bossDestroyed) {
        return false;
    }
    
    console.log('보스 파괴 처리 시작:', { isSpecialWeapon, health: boss.health });
    
    // 보스 상태 설정
    boss.health = 0;
    bossHealth = 0;
    bossDestroyed = true;
    
    // 점수 및 목숨 증가
    updateScore(BOSS_SETTINGS.BONUS_SCORE);
    handleLifeIncrease('보스 파괴');
    
    // 폭발 효과
    explosions.push(new Explosion(
        boss.x + boss.width/2,
        boss.y + boss.height/2,
        isSpecialWeapon // 특수무기인 경우 더 큰 폭발
    ));
    
    // 추가 폭발 효과
    for (let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 / 8) * i;
        const distance = 50;
        explosions.push(new Explosion(
            boss.x + boss.width/2 + Math.cos(angle) * distance,
            boss.y + boss.height/2 + Math.sin(angle) * distance,
            false
        ));
    }
    
    // 보스 상태 초기화
    bossActive = false;
    isBossActive = false;
    lastBossSpawnTime = Date.now();
    
    // 효과음 재생
    safePlaySound('collision');
    
    console.log('보스 파괴 완료');
    return true;
}

// 미사일 이미지 로드
// let missileImage = new Image();
// missileImage.src = 'taurus.png';

// 타우러스 미사일 그리기 함수
function drawTaurusMissile(ctx, x, y, width, height, angle = Math.PI) {
    ctx.save();
    ctx.translate(x + width / 2, y + height / 2);
    ctx.rotate(angle);

    // 1. 본체(흰색 원통)
    ctx.fillStyle = "#eaeaea";
    ctx.fillRect(-width * 0.18, -height * 0.45, width * 0.36, height * 0.9);

    // 2. 머리(둥글고 약간 뾰족한 회색)
    ctx.beginPath();
    ctx.ellipse(0, height * 0.45, width * 0.18, height * 0.13, 0, Math.PI, 0, true); // 둥글게
    ctx.lineTo(width * 0.18, height * 0.25);
    ctx.lineTo(-width * 0.18, height * 0.25);
    ctx.closePath();
    ctx.fillStyle = "#bbb";
    ctx.fill();

    // 3. 꼬리(편평한 부분, 위쪽)
    ctx.beginPath();
    ctx.arc(0, -height * 0.45, width * 0.09, 0, Math.PI, true);
    ctx.closePath();
    ctx.fillStyle = "#ffb300";
    ctx.fill();

    // 4. 꼬리 화염(더 진한 빨간색, 위쪽)
    let flameLength = height * 1.3;
    let flameWidth = width * 0.5;
    let grad = ctx.createLinearGradient(0, -height * 0.45, 0, -height * 0.45 - flameLength);
    grad.addColorStop(0, "rgba(255,0,0,1)");
    grad.addColorStop(0.2, "rgba(255,80,0,0.8)");
    grad.addColorStop(0.5, "rgba(255,200,0,0.5)");
    grad.addColorStop(1, "rgba(255,0,0,0)");
    ctx.beginPath();
    ctx.moveTo(-flameWidth / 2, -height * 0.45);
    ctx.lineTo(0, -height * 0.45 - flameLength);
    ctx.lineTo(flameWidth / 2, -height * 0.45);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.globalAlpha = 0.95;
    ctx.fill();
    ctx.globalAlpha = 1.0;

    // 5. 날개(4개, 십자형)
    ctx.strokeStyle = "#bbb";
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
        ctx.save();
        ctx.rotate((Math.PI / 2) * i);
        ctx.beginPath();
        ctx.moveTo(0, -height * 0.25);
        ctx.lineTo(0, -height * 0.55);
        ctx.stroke();
        ctx.restore();
    }

    ctx.restore();
}

function drawMissileTrail(missile) {
    // 위쪽(0 라디안)으로 향하도록
    drawTaurusMissile(ctx, missile.x, missile.y, missile.width, missile.height, 0);
}

// 중복된 handleBossPattern 함수 제거 - 첫 번째 함수만 사용

// 충돌 이펙트 배열 추가
let collisionEffects = [];

// 충돌 이펙트 그리기 및 수명 감소
function handleCollisionEffects() {
    collisionEffects = collisionEffects.filter(effect => {
        ctx.save();
        
        // 펄스 효과 계산
        effect.pulse += 0.2;
        const pulseScale = 1 + Math.sin(effect.pulse) * 0.2;
        const currentRadius = effect.radius * pulseScale;
        
        // 메인 그라데이션
        const gradient = ctx.createRadialGradient(
            effect.x, effect.y, 0,
            effect.x, effect.y, currentRadius
        );
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
        gradient.addColorStop(0.3, 'rgba(255, 200, 200, 0.7)');
        gradient.addColorStop(0.6, 'rgba(180, 180, 180, 0.5)');
        gradient.addColorStop(1, 'rgba(100, 100, 100, 0)');
        
        // 메인 원 그리기
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, currentRadius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // 외곽선 그리기 (빛나는 효과)
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.7 + Math.sin(effect.pulse * 2) * 0.3})`;
        ctx.lineWidth = 3;
        ctx.stroke();
        
        // 추가적인 빛나는 효과
        const glowGradient = ctx.createRadialGradient(
            effect.x, effect.y, currentRadius * 0.5,
            effect.x, effect.y, currentRadius * 1.2
        );
        glowGradient.addColorStop(0, 'rgba(255, 255, 255, 0.2)');
        glowGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, currentRadius * 1.2, 0, Math.PI * 2);
        ctx.fillStyle = glowGradient;
        ctx.fill();
        
        // 작은 입자 효과 추가
        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 / 8) * i + effect.pulse;
            const distance = currentRadius * 0.8;
            const particleX = effect.x + Math.cos(angle) * distance;
            const particleY = effect.y + Math.sin(angle) * distance;
            
            ctx.beginPath();
            ctx.arc(particleX, particleY, 2, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.fill();
        }
        
        ctx.restore();
        
        effect.life--;
        return effect.life > 0;
    });
}

// gameLoop 내에서 handleCollisionEffects 호출 (폭발/이펙트 그리기 직후 등)
// ... existing code ...
// 예시: handleExplosions(); 아래에 추가
// handleExplosions();
// handleCollisionEffects();
// ... existing code ...

// 전역에 이미지 객체 생성
const playerImage = new Image();
const enemyPlaneImage = new Image();

// 이미지 로딩 상태 추적
let imagesLoaded = {
    player: false,
    enemy: false
};

// 이미지 로딩 함수
function loadImages() {
    return new Promise((resolve) => {
        let loadedCount = 0;
        const totalImages = 2;
        
        // 5초 타임아웃 설정
        const timeout = setTimeout(() => {
            console.warn('이미지 로딩 타임아웃 - 기본 도형으로 진행');
            resolve();
        }, 5000);
        
        function checkAllLoaded() {
            loadedCount++;
            if (loadedCount === totalImages) {
                clearTimeout(timeout);
                console.log('모든 이미지 로딩 완료');
                resolve();
            }
        }
        
        // 플레이어 이미지 로딩
        playerImage.onload = () => {
            console.log('플레이어 이미지 로딩 완료');
            imagesLoaded.player = true;
            checkAllLoaded();
        };
        playerImage.onerror = (error) => {
            console.error('플레이어 이미지 로딩 실패:', error);
            imagesLoaded.player = false;
            checkAllLoaded();
        };
        playerImage.src = 'images/player.png';
        
        // 적 이미지 로딩
        enemyPlaneImage.onload = () => {
            console.log('적 이미지 로딩 완료');
            imagesLoaded.enemy = true;
            checkAllLoaded();
        };
        enemyPlaneImage.onerror = (error) => {
            console.error('적 이미지 로딩 실패:', error);
            imagesLoaded.enemy = false;
            checkAllLoaded();
        };
        enemyPlaneImage.src = 'images/enemyplane.png';
    });
}

// 사운드 play 함수 예외처리 래퍼 (새로운 사운드 매니저와 호환)
function safePlay(audio) {
    try {
        if (audio && audio.play) {
            audio.currentTime = 0;
            audio.play().catch(() => {});
        }
    } catch (e) {
        // 사운드 파일이 없거나 재생 불가 시 무시
    }
}

// 새로운 사운드 매니저를 사용하는 safePlay 함수
function safePlaySound(soundName, options = undefined) {
    try {
        console.log('safePlaySound 호출됨:', soundName);
        console.log('gameSoundManager 존재:', !!gameSoundManager);
        if (gameSoundManager) {
            console.log('사운드 매니저 초기화 상태:', gameSoundManager.initialized);
            console.log('사운드 매니저 활성화 상태:', gameSoundManager.isEnabled());
            console.log('사운드 매니저 볼륨:', gameSoundManager.getVolume());
        }
        
        if (gameSoundManager && gameSoundManager.isEnabled()) {
            console.log('사운드 재생 시도:', soundName);
            if (options) {
                gameSoundManager.play(soundName, options);
            } else {
                gameSoundManager.play(soundName);
            }
        } else {
            console.log('사운드 재생 실패 - 매니저가 비활성화되었거나 초기화되지 않음');
        }
    } catch (e) {
        console.error('사운드 재생 중 오류:', e);
    }
}

// 최고점수 완전 초기화 함수
async function resetAllHighScores() {
    try {
        // IndexedDB 초기화
        const db = await initDB();
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        await store.clear();
        
        // localStorage 초기화
        localStorage.removeItem('ThunderboltHighScore');
        localStorage.removeItem('ThunderboltHighScore_backup');
        
        // 현재 게임의 최고 점수 초기화
        highScore = 0;
        
        console.log('모든 최고 점수가 초기화되었습니다.');
        return true;
    } catch (error) {
        console.error('최고 점수 초기화 중 오류:', error);
        return false;
    }
}
// 단축키: Ctrl+Shift+R로 최고점수 초기화
window.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.code === 'KeyR') {
        resetAllHighScores();
    }
});

// 단축키: Ctrl+Shift+D로 사운드 품질 진단
window.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.code === 'KeyD') {
        if (gameSoundManager) {
            gameSoundManager.diagnoseAllSounds();
        }
    }
});

// ===== 사운드 컨트롤 패널 동적 생성 및 연동 =====
function createSoundControlPanel() {
    const panel = document.createElement('div');
    panel.id = 'sound-control-panel';
    panel.style.position = 'static'; // fixed에서 static으로 변경
    panel.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    panel.style.padding = '12px';
    panel.style.borderRadius = '8px';
    panel.style.color = 'white';
    panel.style.zIndex = '1000';
    panel.style.cursor = 'move';
    panel.style.userSelect = 'none';
    panel.style.width = '340px';
    panel.style.height = 'fit-content';
    panel.style.display = 'flex';
    panel.style.flexDirection = 'column';
    panel.style.gap = '5px';
    panel.style.boxSizing = 'border-box';
    panel.style.boxShadow = '0 2px 12px rgba(0,0,0,0.2)';
    panel.style.margin = '0 auto'; // 가운데 정렬

    // 볼륨 컨트롤 추가
    const volumeControl = document.createElement('div');
    volumeControl.style.display = 'flex';
    volumeControl.style.alignItems = 'center';
    volumeControl.style.gap = '12px';
    volumeControl.style.width = '100%';
    volumeControl.innerHTML = `
        <label style="white-space: nowrap;">효과음 볼륨:</label>
        <input type="range" min="0" max="100" value="10" id="sfx-volume" style="flex: 1; min-width: 120px; max-width: 200px;"> 
        <span id="volume-value" style="min-width: 40px; text-align:right;">10%</span>
    `;
    panel.appendChild(volumeControl);

    // 캔버스 컨테이너 다음에 패널 추가
    const canvasContainer = document.getElementById('canvas-container');
    if (canvasContainer && canvasContainer.parentNode) {
        canvasContainer.parentNode.insertBefore(panel, canvasContainer.nextSibling);
    } else {
        // fallback: body에 추가
        document.body.appendChild(panel);
    }
    setupSoundControlEvents();
    setupPanelDrag(panel);
}

function setupSoundControlEvents() {
    const sfxVolumeSlider = document.getElementById('sfx-volume');
    const volumeValue = document.getElementById('volume-value');
    
    if (sfxVolumeSlider && volumeValue) {
        // 초기 볼륨 설정 - 10%로 고정
        const initialVolume = 10;
        sfxVolumeSlider.value = initialVolume;
        volumeValue.textContent = `${initialVolume}%`;
        
        // 사운드 매니저도 10%로 설정
        gameSoundManager.setVolume(0.1);
        
        sfxVolumeSlider.addEventListener('input', function(e) {
            e.stopPropagation();  // 이벤트 전파 중단
            const volume = this.value / 100;  // 0-1 사이의 값으로 변환
            volumeValue.textContent = `${this.value}%`;
            
            // 사운드 매니저를 통해 볼륨 업데이트
            gameSoundManager.setVolume(volume);
        });

        // 마우스 이벤트가 다른 요소에 영향을 주지 않도록 처리
        sfxVolumeSlider.addEventListener('mousedown', function(e) {
            e.stopPropagation();
        });
        
        sfxVolumeSlider.addEventListener('mouseup', function(e) {
            e.stopPropagation();
            this.blur();  // 포커스 제거
        });
    }
}

// 패널 드래그 기능 설정
function setupPanelDrag(panel) {
    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;
    let xOffset = 0;
    let yOffset = 0;
    let originalPosition = 'static';

    // 드래그 시작
    panel.addEventListener('mousedown', (e) => {
        if (e.target.tagName === 'INPUT') return;  // 볼륨 슬라이더는 드래그 방지
        
        if (e.target === panel || e.target.parentNode === panel) {
            isDragging = true;
            
            // 드래그 시작 시 position을 absolute로 변경
            if (panel.style.position === 'static') {
                originalPosition = 'static';
                panel.style.position = 'absolute';
                panel.style.top = '50%';
                panel.style.left = '50%';
                panel.style.transform = 'translate(-50%, -50%)';
                panel.style.margin = '0';
            }
            
            const rect = panel.getBoundingClientRect();
            initialX = e.clientX - rect.left;
            initialY = e.clientY - rect.top;
            
            panel.style.transition = 'none';  // 드래그 중 애니메이션 제거
        }
    });

    // 드래그 중
    document.addEventListener('mousemove', (e) => {
        if (isDragging) {
            e.preventDefault();  // 드래그 중 기본 동작 방지
            
            currentX = e.clientX - initialX;
            currentY = e.clientY - initialY;
            
            // 패널 위치 업데이트
            panel.style.left = `${currentX}px`;
            panel.style.top = `${currentY}px`;
            panel.style.transform = 'none'; // transform 초기화
        }
    });

    // 드래그 종료
    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            panel.style.transition = 'transform 0.1s ease';  // 드래그 종료 후 애니메이션 복원
        }
    });

    // 마우스가 창 밖으로 나갈 때 드래그 종료
    document.addEventListener('mouseleave', () => {
        if (isDragging) {
            isDragging = false;
            panel.style.transition = 'transform 0.1s ease';
        }
    });
}

// 페이지 로드 시 사운드 컨트롤 패널 생성
window.addEventListener('DOMContentLoaded', () => {
    createSoundControlPanel();
});

// ... existing code ...

// 전역에 추가 (이미 위에서 선언됨)
// const enemyPlaneImage = new Image();
// enemyPlaneImage.src = 'images/enemyPlane.png';

function drawAirplane(x, y, width, height, color, isEnemy = false) {
    ctx.save();
    try {
        if (!isEnemy) {
            // 플레이어 이미지가 로드되었는지 확인
            if (imagesLoaded.player && playerImage.complete && playerImage.naturalWidth > 0) {
                ctx.drawImage(playerImage, x, y, width, height);
            } else {
                // 이미지가 로드되지 않은 경우 기본 도형으로 그리기
                ctx.fillStyle = color || 'white';
                ctx.fillRect(x, y, width, height);
            }
        } else {
            // 적 이미지가 로드되었는지 확인
            if (imagesLoaded.enemy && enemyPlaneImage.complete && enemyPlaneImage.naturalWidth > 0) {
                ctx.translate(x + width/2, y + height/2);
                ctx.scale(1, -1); // 아래로 향하도록 뒤집기
                ctx.drawImage(enemyPlaneImage, -width/2, -height/2, width, height);
            } else {
                // 이미지가 로드되지 않은 경우 기본 도형으로 그리기
                ctx.fillStyle = color || 'red';
                ctx.fillRect(x, y, width, height);
            }
        }
    } catch (error) {
        console.warn('drawAirplane 오류:', error);
        // 오류 발생 시 기본 도형으로 그리기
        ctx.fillStyle = isEnemy ? (color || 'red') : (color || 'white');
        ctx.fillRect(x, y, width, height);
    }
    ctx.restore();
}
// ... existing code ...

// 새로운 확산탄 모양 그리기 함수들 추가
function drawCross(bullet) {
    const size = bullet.width;
    ctx.beginPath();
    
    // 선 두께를 3배로 설정
    ctx.lineWidth = 6; // 기본 2에서 6으로 증가 (3배)
    
    // 세로선
    ctx.moveTo(0, -size);
    ctx.lineTo(0, size);
    
    // 가로선
    ctx.moveTo(-size, 0);
    ctx.lineTo(size, 0);
    
    ctx.stroke();
}

function drawGear(bullet) {
    const size = bullet.width;
    ctx.beginPath();
    
    // 기어의 톱니 모양
    for (let i = 0; i < 8; i++) {
        const angle = (i * Math.PI) / 4;
        const outerRadius = size;
        const innerRadius = size * 0.6;
        
        const x1 = Math.cos(angle) * outerRadius;
        const y1 = Math.sin(angle) * outerRadius;
        const x2 = Math.cos(angle + Math.PI / 8) * innerRadius;
        const y2 = Math.sin(angle + Math.PI / 8) * innerRadius;
        
        if (i === 0) ctx.moveTo(x1, y1);
        else ctx.lineTo(x1, y1);
        ctx.lineTo(x2, y2);
    }
    ctx.closePath();
    ctx.fill();
}

function drawMoon(bullet) {
    const size = bullet.width;
    ctx.beginPath();
    
    // 달 모양 (초승달)
    ctx.arc(0, 0, size, 0, Math.PI);
    ctx.arc(size * 0.3, 0, size * 0.7, 0, Math.PI, true);
    ctx.fill();
}

// 보스 총알 그리기 함수
function drawBossBullet(bullet) {
    ctx.save();
    ctx.translate(bullet.x, bullet.y);
    ctx.rotate(bullet.rotation); // 회전 적용
    
    // 총알 색상 설정
    ctx.fillStyle = bullet.color || '#FF0000';
    ctx.strokeStyle = bullet.color || '#FF0000';
    
    switch (bullet.shape) {
        case 'snowflake':
            drawSnowflake(bullet);
            break;
        case 'pinwheel':
            drawPinwheel(bullet);
            break;
        case 'triangle':
            drawTriangle(bullet);
            break;
        case 'rectangle':
            drawRectangle(bullet);
            break;
        case 'pentagon':
            drawPentagon(bullet);
            break;
        case 'hexagon':
            drawHexagon(bullet);
            break;
        case 'octagon':
            drawOctagon(bullet);
            break;
        case 'circle':
            drawCircle(bullet);
            break;
        case 'cross':
            drawCross(bullet);
            break;
        case 'heart':
            drawHeart(bullet);
            break;
        case 'star':
            drawStar(bullet);
            break;
        case 'flower':
            drawFlower(bullet);
            break;
        case 'gear':
            drawGear(bullet);
            break;
        case 'moon':
            drawMoon(bullet);
            break;
        default:
            drawCircle(bullet);
            break;
    }
    
    ctx.restore();
}

// 보스 총알 생성 함수
function createBossBullet(boss, angle, patternType = 'spread', customSpeed = null, customColor = null) {
    // 패턴별 색상 및 크기 설정
    let bulletColor = '#FF0000'; // 기본 빨간색
    let bulletSize = 18; // 기본 크기
    
    switch(patternType) {
        case 'snowflake_shot':
            bulletColor = '#FFFFFF';     // 눈 결정체 - 흰색
            bulletSize = 14;             // 크기 조정 (16 → 14)
            break;
        case 'pinwheel_shot':
            bulletColor = '#90EE90';     // 바람개비 - 청녹색
            bulletSize = 16;             // 크기 조정 (20 → 16)
            break;
        case 'triangle_shot':
            bulletColor = '#32CD32';     // 삼각형 - 밝은 라임그린
            bulletSize = 14;             // 크기 조정 (16 → 14)
            break;
        case 'rectangle_shot':
            bulletColor = '#ADFF2F';     // 정사각형 - 연두색
            bulletSize = 14;             // 크기 유지 (사각 모양 제외)
            break;
        case 'pentagon_shot':
            bulletColor = '#FFA500';     // 오각형 - 주황색
            bulletSize = 14;             // 크기 조정 (16 → 14)
            break;
        case 'hexagon_shot':
            bulletColor = '#D3D3D3';     // 육각형 - 밝은 회색
            bulletSize = 14;             // 크기 조정 (16 → 14)
            break;
        case 'octagon_shot':
            bulletColor = '#FFD700';     // 팔각형 - 밝은 골드
            bulletSize = 14;             // 크기 조정 (16 → 14)
            break;
        case 'circle_shot':
            bulletColor = '#20B2AA';     // 원형 - 청녹색
            bulletSize = 16;             // 크기 유지 (원 모양 제외)
            break;
        case 'cross_shot':
            bulletColor = '#FF4500';     // 십자 - 밝은 빨간색
            bulletSize = 12;             // 크기 조정 (14 → 12)
            break;
        case 'heart_shot':
            bulletColor = '#FF69B4';     // 하트 - 밝은 핫핑크
            bulletSize = 16;             // 크기 유지 (하트 모양 제외)
            break;
        case 'star_shot':
            bulletColor = '#FFFF00';     // 별 - 노란색
            bulletSize = 14;             // 크기 조정 (18 → 14)
            break;
        case 'flower_shot':
            bulletColor = '#FF1493';     // 꽃 - 밝은 딥핑크
            bulletSize = 14;             // 크기 조정 (16 → 14)
            break;
        case 'gear_shot':
            bulletColor = '#C0C0C0';     // 기어 - 은색
            bulletSize = 14;             // 크기 조정 (16 → 14)
            break;
        case 'moon_shot':
            bulletColor = '#F0E68C';     // 달 - 카키색
            bulletSize = 14;             // 크기 조정 (16 → 14)
            break;
        default:
            bulletColor = '#FF0000';     // 기본 빨간색
            bulletSize = 18;             // 기본 크기 유지
            break;
    }
    
    // 패턴별 모양 설정
    let bulletShape = 'circle';
    switch(patternType) {
        case 'snowflake_shot':
            bulletShape = 'snowflake';
            break;
        case 'pinwheel_shot':
            bulletShape = 'pinwheel';
            break;
        case 'triangle_shot':
            bulletShape = 'triangle';
            break;
        case 'rectangle_shot':
            bulletShape = 'rectangle';
            break;
        case 'pentagon_shot':
            bulletShape = 'pentagon';
            break;
        case 'hexagon_shot':
            bulletShape = 'hexagon';
            break;
        case 'octagon_shot':
            bulletShape = 'octagon';
            break;
        case 'circle_shot':
            bulletShape = 'circle';
            break;
        case 'cross_shot':
            bulletShape = 'cross';
            break;
        case 'heart_shot':
            bulletShape = 'heart';
            break;
        case 'star_shot':
            bulletShape = 'star';
            break;
        case 'flower_shot':
            bulletShape = 'flower';
            break;
        case 'gear_shot':
            bulletShape = 'gear';
            break;
        case 'moon_shot':
            bulletShape = 'moon';
            break;
        default:
            bulletShape = 'circle';
            break;
    }
    
    const bullet = {
        x: boss.x + boss.width/2,
        y: boss.y + boss.height/2,
        width: bulletSize,
        height: bulletSize,
        speed: customSpeed || boss.bulletSpeed || 5,
        angle: angle,
        isBossBullet: true,
        isSpread: true,
        damage: BOSS_SETTINGS.DAMAGE,
        color: customColor || bulletColor,
        shape: bulletShape,
        patternType: patternType,
        rotation: 0,
        rotationSpeed: (Math.random() - 0.5) * 0.3, // 회전 속도 (-0.15 ~ 0.15)
        life: 100
    };
    
    bossSpreadBullets.push(bullet);
    return bullet;
}

// 보스 확산탄 발사 함수
function bossFireSpreadShot(boss) {
    const patterns = [
        'snowflake_shot', 'pinwheel_shot', 'triangle_shot', 'rectangle_shot',
        'pentagon_shot', 'hexagon_shot', 'octagon_shot', 'circle_shot',
        'cross_shot', 'heart_shot', 'star_shot', 'flower_shot',
        'gear_shot', 'moon_shot'
    ];
    
    const selectedPattern = patterns[Math.floor(Math.random() * patterns.length)];
    
    switch(selectedPattern) {
        case 'snowflake_shot':
            bossFireSnowflakeShot(boss);
            break;
        case 'pinwheel_shot':
            bossFirePinwheelShot(boss);
            break;
        case 'triangle_shot':
            bossFireTriangleShot(boss);
            break;
        case 'rectangle_shot':
            bossFireRectangleShot(boss);
            break;
        case 'pentagon_shot':
            bossFirePentagonShot(boss);
            break;
        case 'hexagon_shot':
            bossFireHexagonShot(boss);
            break;
        case 'octagon_shot':
            bossFireOctagonShot(boss);
            break;
        case 'circle_shot':
            bossFireCircleShot(boss);
            break;
        case 'cross_shot':
            bossFireCrossShot(boss);
            break;
        case 'heart_shot':
            bossFireHeartShot(boss);
            break;
        case 'star_shot':
            bossFireStarShot(boss);
            break;
        case 'flower_shot':
            bossFireFlowerShot(boss);
            break;
        case 'gear_shot':
            bossFireGearShot(boss);
            break;
        case 'moon_shot':
            bossFireMoonShot(boss);
            break;
        default:
            bossFireSnowflakeShot(boss);
            break;
    }
}

// 보스 확산탄 처리 함수
function handleBossSpreadBullets() {
    bossSpreadBullets = bossSpreadBullets.filter(bullet => {
        // 보스 확산탄 이동
        bullet.x += Math.cos(bullet.angle) * bullet.speed;
        bullet.y += Math.sin(bullet.angle) * bullet.speed;
        
        // 회전 효과
        bullet.rotation += bullet.rotationSpeed;
        
        // 보스 총알 그리기
        drawBossBullet(bullet);
        
        // 보스 총알과 플레이어 충돌 체크
        if (checkCollision(bullet, player) || 
            (hasSecondPlane && checkCollision(bullet, secondPlane))) {
            handleCollision();
            // 총알 충돌 시 작은 폭발 효과
            explosions.push(new Explosion(bullet.x, bullet.y, false));
            // 보스 확산탄 피격 시 shoot 효과음 재생
            safePlaySound('shoot');
            return false;
        }
        
        // 화면 밖으로 나간 경우 제거
        return bullet.y < canvas.height + 50 && bullet.y > -50 && 
               bullet.x < canvas.width + 50 && bullet.x > -50;
    });
}