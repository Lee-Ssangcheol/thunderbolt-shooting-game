const { app, BrowserWindow, ipcMain, Menu, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// package.json에서 버전 정보 읽기
const packageJson = require('./package.json');
const version = packageJson.version;

// 리소스 경로 설정
const resourcePath = app.isPackaged
  ? path.join(process.resourcesPath)
  : path.join(__dirname);

// 아이콘 경로 설정 - 절대 경로 사용
const iconPath = app.isPackaged
  ? path.join(process.resourcesPath, 'icon.ico')
  : path.join(__dirname, 'build', 'icon.ico');

// 아이콘 파일 존재 확인
const iconExists = fs.existsSync(iconPath);
if (!iconExists) {
  console.warn(`아이콘 파일을 찾을 수 없습니다: ${iconPath}`);
}

let mainWindow = null;

function createWindow() {
  const windowOptions = {
    width: 1500,
    height: 950, // 캔버스 높이 감소에 맞춰 창 높이 조정
    minWidth: 800,
    minHeight: 850, // 최소 높이도 조정
    resizable: true,
    backgroundColor: '#E0E0E0',
    title: `썬더볼트 슈팅게임 v${version}`,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      sandbox: false,
      webSecurity: true,
      allowRunningInsecureContent: false,
      enableRemoteModule: true,
      nodeIntegrationInWorker: true
    }
  };

  // 아이콘 파일이 존재하는 경우에만 아이콘 설정 추가
  if (fs.existsSync(iconPath)) {
    windowOptions.icon = iconPath;
    console.log('아이콘 경로가 설정됨:', iconPath);
  } else {
    console.warn('아이콘 파일을 찾을 수 없음:', iconPath);
  }

  mainWindow = new BrowserWindow(windowOptions);

  // 윈도우 제목 설정
  mainWindow.setTitle(`썬더볼트 슈팅게임 v${version}`);
  mainWindow.center();

  // 메뉴 설정
  const template = [
    {
      label: '파일',
      submenu: [
        { role: 'quit', label: '종료' }
      ]
    },
    {
      label: '편집',
      submenu: [
        { role: 'undo', label: '실행 취소' },
        { role: 'redo', label: '다시 실행' },
        { type: 'separator' },
        { role: 'cut', label: '잘라내기' },
        { role: 'copy', label: '복사' },
        { role: 'paste', label: '붙여넣기' },
        { role: 'delete', label: '삭제' },
        { role: 'selectAll', label: '모두 선택' }
      ]
    },
    {
      label: '보기',
      submenu: [
        { role: 'reload', label: '새로고침' },
        { role: 'forceReload', label: '강력 새로고침' },
        { role: 'toggleDevTools', label: '개발자 도구 토글' },
        { type: 'separator' },
        { role: 'resetZoom', label: '화면 크기 초기화' },
        { role: 'zoomIn', label: '확대' },
        { role: 'zoomOut', label: '축소' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: '전체 화면' }
      ]
    },
    {
      label: '창',
      submenu: [
        { role: 'minimize', label: '최소화' },
        { role: 'close', label: '닫기' }
      ]
    },
    {
      label: '도움말',
      submenu: [
        {
          label: '정보',
          click() {
            dialog.showMessageBox(null, {
              type: 'info',
              title: '썬더볼트 슈팅게임 정보',
              message: `버전: ${packageJson.version}`,
              detail: `Electron: ${process.versions.electron}\nChrome: ${process.versions.chrome}\nNode.js: ${process.versions.node}`
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  // 개발 모드에서는 개발자 도구를 엽니다
  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }

  // Content Security Policy 설정
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'",
          "script-src 'self'",
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: file:",
          "media-src 'self' file:"
        ].join('; ')
      }
    });
  });

  mainWindow.loadFile('index.html');

  // 페이지 로드 완료 후 제목 다시 설정
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.setTitle(`썬더볼트 슈팅게임 v${version}`);
  });

  // IPC 핸들러 설정
  ipcMain.handle('get-sound-path', (event, filename) => {
    const soundPath = path.join(resourcePath, 'sounds', filename);
    console.log('사운드 경로:', soundPath);
    return soundPath;
  });

  ipcMain.handle('get-resource-path', (event, filename) => {
    const resourceFilePath = path.join(resourcePath, 'images', filename);
    console.log('리소스 경로:', resourceFilePath);
    return resourceFilePath;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
}); 