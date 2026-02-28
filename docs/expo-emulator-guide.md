# Expo Emulator Test Guide (macOS/iOS, Windows/Android)

이 문서는 Expo(React Native) 프로젝트를 **에뮬레이터에서 테스트하는 방법**을 정리한 가이드입니다.
프로젝트 폴더(`pace-off-lite`) 밖에 두기 위해 저장 위치는 `docs/` 입니다.

## 공통 준비 사항
- Node.js LTS 설치
- pnpm 설치
  - `npm i -g pnpm`
- 프로젝트 의존성 설치
  - `cd pace-off-lite`
  - `pnpm install`

### Expo 실행
- `pnpm expo start`
- 캐시 문제 시: `pnpm expo start -c`

---

## macOS + iOS Simulator
> iOS 시뮬레이터는 macOS에서만 가능합니다.

1. Xcode 설치 (App Store)
2. Xcode 실행 후 추가 컴포넌트 설치 완료
3. iOS Simulator 실행
   - Xcode → Open Developer Tool → Simulator
4. 프로젝트 실행
   - `cd pace-off-lite`
   - `pnpm expo start`
5. Metro 콘솔에서 `i` 키 입력 → iOS Simulator 실행

### 체크 포인트
- Simulator가 실행 중이어야 `i` 명령이 정상 동작
- 처음 실행 시 Simulator 기기 다운로드 필요

---

## Windows + Android Emulator

1. Android Studio 설치
2. Android Studio → SDK Manager에서 아래 항목 설치
   - Android SDK Platform (최신 안정 버전)
   - Android SDK Platform-Tools
   - Android Emulator
3. AVD(가상 디바이스) 생성
   - Android Studio → Device Manager → Create Device
4. AVD 실행

### 환경변수 설정 (권장)
- `ANDROID_HOME` 또는 `ANDROID_SDK_ROOT` 지정
- PATH에 `platform-tools` 추가
  - 예: `C:\Users\<USER>\AppData\Local\Android\Sdk\platform-tools`

### 실행
- `cd pace-off-lite`
- `pnpm expo start`
- Metro 콘솔에서 `a` 키 입력 → Android Emulator 실행

### 체크 포인트
- 에뮬레이터가 실행 중이어야 `a` 명령이 동작
- 가상화(Windows Hyper-V/WHX) 비활성화 이슈가 있으면 BIOS 설정 확인

---

## Expo Go 사용 (에뮬레이터)
- iOS Simulator: Expo Go는 기본적으로 사용 가능
- Android Emulator: Play Store가 있는 AVD에서 Expo Go 설치 후 사용

---

## 문제 해결 간단 팁
- 실행 오류 시 캐시 제거: `pnpm expo start -c`
- Android 장치 인식 실패 시 `adb devices` 확인
- Expo 로그가 안 뜨면 터미널을 새로 열어 재실행
