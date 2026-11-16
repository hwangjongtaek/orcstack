# Brief: pstack 0.15.42 갱신과 하네스별 모델 설정

- SSOT: §3, §4 F2 F7, §6 C3 C4 C6 C8
- 작업 항목: M5-4
- 날짜: 2026-11-16

## 무엇을, 왜

upstream pstack `0.15.42`를 sync 도구로 받아 `0.15.36` 이후의 모델 기본값, `how`·`why` 단순화, statechart 수정을 반영한다. `setup-orcstack`은 upstream의 추론 예산을 받되, 공급자별 모델을 공통 기본값으로 박지 않고 각 하네스에서 확인한 모델만 각자의 사용자 설정 파일에 기록한다.

## Acceptance

| # | 기대 결과 | 금지 결과 | 증거 |
|---|---|---|---|
| A1 | pin이 pstack `0.15.42`의 `bf0c7cd`로 이동하고 `src/`와 `dist/`가 같은 내용으로 갱신된다 | pin 수동 편집, 충돌 마커, 낡은 `dist/` | 🔒 `tests/sync-cli.test.mjs`, `tests/build.test.mjs`, `npm run check` |
| A2 | `setup-orcstack`이 `unlimited`, `large`, `medium`, `small` 예산과 현재 역할 목록을 쓰며, 다시 실행해도 같은 선택은 유지된다 | Cursor 전용 모델을 다른 하네스 기본값으로 기록, 은퇴한 역할 유지 | 🔒 contract `tests/build.test.mjs` |
| A3 | Claude Code, Codex, oh-my-pi 설정이 서로 다른 사용자 파일에 저장되고 실제 모델 값은 해당 하네스 카탈로그에서 확인한 값이다 | 한 설정 파일 공유, 다른 공급자의 모델 식별자 혼입 | 🔒 build `tests/build.test.mjs` + 📎 세 사용자 파일을 각 모델 카탈로그와 대조 |
| A4 | upstream 변경 범위와 첫 실제 sync 결과가 CHANGELOG와 작업 기록에서 복원된다 | 버전만 바뀌고 무엇을 가져왔는지 알 수 없음 | 📎 CHANGELOG와 `docs/work-plan.md` 확인 |

## 범위 밖

- Cursor와 opencode의 개인 모델 설정은 만들지 않는다. 이번 요청은 Claude Code, Codex, oh-my-pi만 다룬다.
- 하네스가 제공하는 모델 카탈로그와 권한 체계는 바꾸지 않는다.

## 남은 위험


사용자 모델 파일은 저장소 밖에 있어 CI가 직접 검사하지 못한다. 이번 적용에서 Claude Code의 로컬 모델 카탈로그, `codex debug models`, `omp models --json` 결과와 대조하고, 저장소에는 경로 분리와 setup 계약을 검사하는 테스트를 남긴다.
