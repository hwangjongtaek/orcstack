# Brief: README 플러그인 업데이트 안내

- SSOT: §3
- 날짜: 2026-11-16

## 무엇을, 왜

README의 하네스별 갱신 지침이 각 설치 절에 흩어져 있어 실행 위치와 후속 작업을 비교하기 어렵다. 네 하네스의 설치본 업데이트 방법을 한 절에 모으고, 대상 프로젝트 파일 반영과 역할별 모델 설정을 구분한다.

## Acceptance

| # | 기대 결과 | 금지 결과 | 증거 |
|---|---|---|---|
| A1 | README에서 Claude Code, Codex, oh-my-pi, opencode의 업데이트 명령과 실행 위치를 한 표에서 찾을 수 있다 | 하네스별 절에 업데이트 지침이 중복된다 | 🔒 `tests/readme.test.mjs`; 📎 각 CLI 도움말 대조 |
| A2 | Claude Code 업데이트 뒤 재시작 조건이 명시된다 | 재시작 없이 갱신이 끝난다고 안내한다 | 🔒 `tests/readme.test.mjs`; 📎 `claude plugin update --help` 대조 |
| A3 | 설치본 업데이트와 대상 프로젝트의 `adopt guard` 반영, `setup-orcstack` 역할이 서로 구분된다 | 플러그인 업데이트가 프로젝트 파일이나 모델 설정까지 자동 변경한다고 안내한다 | 🔒 `tests/readme.test.mjs`; 📎 README `orcstack 업데이트` 절 직접 확인 |

## 범위 밖과 남은 위험

업데이트 명령 자체, 배포본, 설치 도구는 변경하지 않는다. 각 하네스가 향후 CLI 명령이나 설치 방식을 바꾸면 표를 함께 갱신해야 한다.
