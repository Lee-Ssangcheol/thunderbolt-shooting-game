# 썬더볼트 슈팅게임 (웹 버전)

![썬더볼트 슈팅게임](https://img.shields.io/badge/Version-1.0.0-blue)
![License](https://img.shields.io/badge/License-LSSC-green)
![Platform](https://img.shields.io/badge/Platform-Web-orange)

## 🎮 소개

썬더볼트 슈팅게임은 HTML5 Canvas와 JavaScript를 사용하여 만든 웹 기반 슈팅 게임입니다. 데스크탑 설치 없이 브라우저에서 바로 실행할 수 있습니다.

## 🚀 실행 방법

### 방법 1: 로컬 서버 실행 (권장)
1. Python이 설치되어 있다면:
   ```bash
   python -m http.server 8000
   ```
2. 웹 브라우저에서 `http://localhost:8000`으로 접속합니다.

### 방법 2: 직접 실행
1. `index.html` 파일을 웹 브라우저로 직접 열어 게임을 시작합니다.

### 방법 3: Node.js 서버 (선택사항)
```bash
npm install -g http-server
http-server -p 8000
```

## 🎯 게임 조작 방법

| 키 | 기능 |
|---|---|
| **방향키** | 비행기 이동 |
| **스페이스바** | 발사 |
| **F키** | 특수 무기 |
| **P키** | 일시정지 |
| **R키** | 최고 점수 리셋 |

## ✨ 게임 특징

- 🎯 **5단계의 난이도 시스템** - 점진적으로 어려워지는 게임 난이도
- 🤖 **다양한 적 패턴과 AI** - 지능적인 적들의 다양한 공격 패턴
- ⚡ **파워업 시스템** - 다양한 무기와 능력 업그레이드
- 👾 **보스 전투** - 강력한 보스와의 스릴 넘치는 전투
- 🔊 **효과음 시스템** - 몰입감 있는 사운드 효과
- 📱 **반응형 디자인** - 다양한 화면 크기에 최적화

## 🛠️ 기술 스택

- **HTML5 Canvas** - 게임 렌더링
- **JavaScript (ES6+)** - 게임 로직
- **CSS3** - 스타일링
- **Web Audio API** - 사운드 처리

## 📁 프로젝트 구조

```
썬더볼트 슈팅게임/
├── index.html          # 메인 HTML 파일
├── game.js            # 게임 로직
├── style.css          # 스타일시트
├── package.json       # 프로젝트 설정
├── README.md         # 프로젝트 문서
├── images/           # 게임 이미지 리소스
│   ├── player.png
│   ├── enemyplane.png
│   └── enemyplane2.png
└── sounds/           # 게임 사운드 리소스
    ├── shoot.mp3
    ├── explosion.mp3
    ├── collision.mp3
    ├── levelup.mp3
    └── warning.mp3
```

## 🌐 브라우저 지원

- Chrome (권장)
- Firefox
- Safari
- Edge

## 📝 라이선스

LSSC License

## 🤝 기여하기

1. 프로젝트를 포크합니다
2. 새로운 기능 브랜치를 생성합니다 (`git checkout -b feature/AmazingFeature`)
3. 변경사항을 커밋합니다 (`git commit -m 'Add some AmazingFeature'`)
4. 브랜치에 푸시합니다 (`git push origin feature/AmazingFeature`)
5. Pull Request를 생성합니다

## 📞 문의

프로젝트에 대한 문의사항이 있으시면 이슈를 생성해주세요.