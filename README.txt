스텔스 슈팅게임 Electron 템플릿

이 폴더에는 게임 실행에 필요한 모든 파일(코드, 이미지, 사운드, 설정 등)이 포함됩니다.

- 설치형/포터블 빌드 가능
- 리소스 누락 시 dist/images, dist/sounds 폴더에 파일을 넣어주세요
- dist/sounds/ : shoot.mp3, explosion.mp3, collision.mp3, levelup.mp3 등
- dist/images/ : player.png, enemyPlane.png 등 게임 이미지 파일
- 반드시 game.js, sounds.js, preload.js 등 주요 js 파일도 dist 폴더에 복사해야 정상 동작합니다.
- 실행: Node.js 설치 후 npm install, npm run dist

문의: 제작자에게 문의하세요. 