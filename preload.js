const { contextBridge, ipcRenderer } = require('electron');

// Electron 환경인지 확인
const isElectron = window && window.process && window.process.type;

// 리소스 로딩 상태 추적
const resourceLoadStatus = {
    images: {},
    sounds: {},
    totalResources: 0,
    loadedResources: 0
};

// 리소스 로더 클래스
class ResourceLoader {
    constructor() {
        this.images = {};
        this.sounds = {};
        this.loadedCount = 0;
        this.totalCount = 0;
    }

    async loadImage(key, src) {
        this.totalCount++;
        try {
            let imagePath = src;
            if (window.electronAPI) {
                imagePath = await window.electronAPI.getResourcePath(src);
                console.log(`Loading image from path: ${imagePath}`);
            }
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => {
                    this.images[key] = img;
                    this.loadedCount++;
                    console.log(`Successfully loaded image: ${key}`);
                    resolve(img);
                };
                img.onerror = (error) => {
                    console.error(`이미지 로드 실패 (${src}):`, error);
                    console.error(`시도한 경로: ${imagePath}`);
                    this.loadedCount++;
                    resolve(null);
                };
                img.src = imagePath;
            });
        } catch (error) {
            console.error(`이미지 경로 가져오기 실패 (${src}):`, error);
            this.loadedCount++;
            return null;
        }
    }

    async loadSound(key, src) {
        this.totalCount++;
        try {
            let soundPath = src;
            if (window.electronAPI) {
                soundPath = await window.electronAPI.getSoundPath(src);
                console.log(`Loading sound from path: ${soundPath}`);
            }
            return new Promise((resolve, reject) => {
                const sound = new Audio();
                sound.oncanplaythrough = () => {
                    this.sounds[key] = sound;
                    this.loadedCount++;
                    console.log(`Successfully loaded sound: ${key}`);
                    resolve(sound);
                };
                sound.onerror = (error) => {
                    console.error(`사운드 로드 실패 (${src}):`, error);
                    console.error(`시도한 경로: ${soundPath}`);
                    this.loadedCount++;
                    resolve(null);
                };
                sound.src = soundPath;
                sound.load();
            });
        } catch (error) {
            console.error(`사운드 경로 가져오기 실패 (${src}):`, error);
            this.loadedCount++;
            return null;
        }
    }

    getImage(key) {
        return this.images[key];
    }

    getSound(key) {
        return this.sounds[key];
    }

    getLoadingProgress() {
        return this.totalCount > 0 ? this.loadedCount / this.totalCount : 1;
    }
}

// 전역 리소스 로더 인스턴스 생성
const resourceLoader = new ResourceLoader();

// 리소스 로딩 함수
async function loadResources() {
    try {
        // 이미지 로딩
        await resourceLoader.loadImage('player', 'images/player.png');
        await resourceLoader.loadImage('enemyPlane', 'images/enemyplane.png');
        
        // 사운드 로딩
        await resourceLoader.loadSound('shoot', 'sounds/shoot.mp3');
        await resourceLoader.loadSound('explosion', 'sounds/explosion.mp3');
        await resourceLoader.loadSound('collision', 'sounds/collision.mp3');
        
        console.log('모든 리소스 로딩 완료');
    } catch (error) {
        console.error('리소스 로딩 중 오류 발생:', error);
    }
}

// 렌더러 프로세스에 API 노출
contextBridge.exposeInMainWorld('electronAPI', {
    // 윈도우 컨트롤
    minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
    maximizeWindow: () => ipcRenderer.invoke('maximize-window'),
    closeWindow: () => ipcRenderer.invoke('close-window'),
    
    // 점수 관련
    saveScore: (score) => ipcRenderer.invoke('save-score', score),
    loadScore: () => ipcRenderer.invoke('load-score'),
    resetScore: () => ipcRenderer.invoke('reset-score'),
    
    // 사운드 관련
    getSoundPath: (filename) => ipcRenderer.invoke('get-sound-path', filename),
    
    // 리소스 관련
    getResourcePath: (filename) => ipcRenderer.invoke('get-resource-path', filename),

    // 이미지 로드 함수
    loadImage: async (name) => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            resourceLoadStatus.images[name] = false;
            resourceLoadStatus.totalResources++;

            ipcRenderer.invoke('get-resource-path', `${name}.png`)
                .then(imagePath => {
                    console.log(`이미지 로드 시도: ${imagePath}`);
                    img.src = imagePath;
                    
                    img.onload = () => {
                        console.log(`Successfully loaded image: ${name}`);
                        resourceLoadStatus.images[name] = true;
                        resourceLoadStatus.loadedResources++;
                        resolve(img);
                    };

                    img.onerror = (error) => {
                        console.error(`이미지 로드 실패 (${name}):`, error);
                        console.log('시도한 경로:', imagePath);
                        resourceLoadStatus.images[name] = false;
                        resourceLoadStatus.loadedResources++;
                        reject(error);
                    };
                })
                .catch(error => {
                    console.error(`이미지 경로 가져오기 실패 (${name}):`, error);
                    resourceLoadStatus.images[name] = false;
                    resourceLoadStatus.loadedResources++;
                    reject(error);
                });
        });
    },

    // 사운드 로드 함수
    loadSound: async (name) => {
        return new Promise((resolve, reject) => {
            const sound = new Audio();
            resourceLoadStatus.sounds[name] = false;
            resourceLoadStatus.totalResources++;

            ipcRenderer.invoke('get-sound-path', `${name}.mp3`)
                .then(soundPath => {
                    console.log(`사운드 로드 시도: ${soundPath}`);
                    sound.src = soundPath;
                    
                    sound.load();

                    sound.oncanplaythrough = () => {
                        console.log(`Successfully loaded sound: ${name}`);
                        resourceLoadStatus.sounds[name] = true;
                        resourceLoadStatus.loadedResources++;
                        resolve(sound);
                    };

                    sound.onerror = (error) => {
                        console.error(`사운드 로드 실패 (${name}):`, error);
                        console.log('시도한 경로:', soundPath);
                        resourceLoadStatus.sounds[name] = false;
                        resourceLoadStatus.loadedResources++;
                        resolve(sound);
                    };
                })
                .catch(error => {
                    console.error(`사운드 경로 가져오기 실패 (${name}):`, error);
                    resourceLoadStatus.sounds[name] = false;
                    resourceLoadStatus.loadedResources++;
                    resolve(sound);
                });
        });
    },

    // 리소스 로딩 상태 확인
    checkResourceLoadingStatus: () => {
        const allLoaded = Object.values(resourceLoadStatus.images).every(loaded => loaded) &&
                         Object.values(resourceLoadStatus.sounds).every(loaded => loaded);
        
        if (allLoaded) {
            console.log('모든 리소스 로딩 완료');
            return true;
        }
        return false;
    },

    // 리소스 로딩 상태 확인
    getResourceLoadStatus: () => resourceLoadStatus
});

// API가 초기화된 후 리소스 로딩 시작
window.addEventListener('DOMContentLoaded', () => {
    console.log('페이지 로드 완료');
    setTimeout(() => {
        loadResources();
    }, 100);
}); 