const fs = require('fs');
const path = require('path');

// package.json 파일 경로
const packagePath = path.join(__dirname, '..', 'package.json');

try {
    // package.json 파일 읽기
    const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    
    // 현재 날짜와 시간 생성
    const now = new Date();
    const date = now.getFullYear() + 
                 String(now.getMonth() + 1).padStart(2, '0') + 
                 String(now.getDate()).padStart(2, '0');
    const time = String(now.getHours()).padStart(2, '0') + 
                 String(now.getMinutes()).padStart(2, '0');
    
    // 새 버전 생성 (썬더볼트 슈팅게임 형식에 맞게 수정)
    const newVersion = `1.0.${date}${time}`;
    
    // 버전 업데이트
    packageData.version = newVersion;
    
    // package.json 파일에 저장
    fs.writeFileSync(packagePath, JSON.stringify(packageData, null, 2));
    
    console.log(`✅ Version updated to: ${newVersion}`);
    console.log(`📅 Date: ${date}`);
    console.log(`⏰ Time: ${time}`);
    console.log(`🎮 Game: 썬더볼트 슈팅게임`);
    
} catch (error) {
    console.error('❌ Error updating version:', error.message);
    process.exit(1);
} 