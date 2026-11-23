# Brief: upstream pstack 7a58391 동기화 충돌 해결

- SSOT: §4 F2, §6 C3 C4
- 작업 항목: M5-9
- 날짜: 2026-11-23

## 무엇을, 왜

주간 sync가 upstream pstack `bf0c7cd`에서 `7a58391`로 옮기다 `src/` 14개 파일에서 충돌했고, 충돌 마커가 남은 채 draft PR #2로 올라왔다(tier0·tier1 실패). 각 파일의 orcstack fork 의도(`sync/forks.json`의 `reason`)를 지키면서 upstream 변경을 받아 충돌을 풀고, `sync.mjs --resolved`로 pin을 옮기고 `dist/`를 다시 빌드해 PR을 green으로 만든다.

- fork 의도가 이긴다. upstream이 Cursor 전용 표현, 제거한 skill, denylist 토큰을 다시 들여오면 받지 않는다.
- upstream의 일반 개선(문구, 구조, 새 규칙)은 fork 의도와 충돌하지 않는 한 받는다.
- fork의 `since`는 해결한 파일에 한해 `7a58391`로 갱신한다.

## Acceptance

| # | 기대 결과 | 금지 결과 | 증거 |
|---|---|---|---|
| A1 | `src/`에 충돌 마커가 없다 | 마커가 남은 채 머지 | 🔒 `sync.mjs --resolved`가 마커가 있으면 실패 |
| A2 | `sync.mjs --to 7a58391 --resolved`가 통과하고 pin이 `7a58391`로 옮겨진다 | pin을 손으로 편집 | 🔒 M5-1 A4 e2e가 같은 경로를 고정 |
| A3 | `dist/`가 `node tools/build.mjs`로 다시 만들어진다 | `dist/` 손편집, 빌드와 불일치 | 🔒 tier0 validate |
| A4 | `npm run check`가 green이다 | 일부만 통과 | 🔒 tier0·tier1 |
| A5 | 파일마다 fork 의도를 유지했는지 판단 근거가 PR 본문에 있다 | 근거 없는 ours/theirs 일괄 선택 | 📎 PR 본문의 파일별 판단 표 |

## 범위 밖

- sync 워크플로가 토큰 없이 PR 생성에 실패했을 때의 메시지 개선.
- `ORCSTACK_SYNC_TOKEN` secret 등록.

## 남은 위험

- upstream 변경의 의미를 사람이 검토하지 않으면 fork 의도와 어긋난 병합이 통과할 수 있다. A5의 판단 표로 리뷰어가 파일별로 확인한다.
