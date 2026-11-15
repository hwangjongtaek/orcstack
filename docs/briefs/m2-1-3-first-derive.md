# Brief: 첫 파생과 Cursor 의존 제거 (M2-1~M2-3)

- SSOT: §4 F2·F5, §6 C1·C4
- 작업 항목: M2-1, M2-2, M2-3
- 날짜: 2026-11-06

## 무엇을, 왜

upstream `c742dd6`을 `src/`로 처음 가져오고(M2-1), Cursor 전용 기능에 기대는 문장을 orcstack 경로로 바꾼다(M2-2). 오크 화자로 `orc-help`와 `setup-orcstack`을 다시 쓴다(M2-3). 반입 직후에는 잔존 때문에 Tier 0이 실패하므로 세 항목을 한 PR로 묶었다.

## 결정

- **upstream `README.md`, `LICENSE`, `docs/guide/`는 sync에서 뺀다.** 배포본에 들어가지 않는 Cursor 사용자용 안내다. orcstack 사용 안내는 저장소 루트 README와 `docs/`가 맡는다. 계획의 "guide 재작성"은 범위에서 뺐다.
- **Cursor 기능은 다음처럼 바꾼다.**
  - Origin forge와 내장 PR 도구 → `gh`
  - Bugbot → 일반 리뷰 봇 triage. 기준은 orcstack 고유 파일 `skills/orc-mode/references/review-triage.md`
  - cloud agent → 격리된 worktree(`{{isolated-worktree}}`)
  - `cursor-team-kit`의 `control-ui`·`control-cli` → `{{surface-check}}`
  - `deslop` → `SKILL.md`의 Before commit 경로(subtract-before-you-add + no-comments)
  - `create-skill` → authoring playbook의 Agent Skills 형식 규칙
  - `/loop` → `{{loop}}`
- **모델 시트의 별칭은 리터럴 `inherit`다.** `inherit-parent`를 `{{model-inherit}}` 토큰으로 바꾸면 시트에 적을 수 없는 문구("the session model")가 렌더링된다. 치환 규칙을 `inherit`로 바꾸고 `model-inherit` 능력을 목록에서 뺐다(능력 21개, ADR-0003 갱신).
- **`setup-orcstack`은 Cursor 규칙 파일 대신 skill이 읽는 일반 파일을 쓴다.** budget 사다리와 grok·claude slug 기본값을 없애고, 모든 역할의 기본값을 `inherit`로 둔다(ADR-0002 D4).

## Acceptance

| # | 기대 결과 | 금지 결과 | 증거 |
|---|---|---|---|
| A1 | `src/` Markdown의 denylist 잔존이 0이다 | Cursor·poteto 전제가 배포본에 남음(C1) | 🔒 Tier 0 validate |
| A2 | derive 결과와 다른 파일은 모두 `sync/forks.json`에 이유·since·SSOT와 함께 있다 | 이유 없는 분기(C4) | 🔒 sync 판정. 📎 같은 커밋으로 sync: forked 19, own 1, 미등록·stale 0, pin 불변 |
| A3 | `orc-help`가 오크 화자이고, 출처를 물으면 pstack과 Lauren Tan을 밝힌다 | 출처 누락(F5, C2) | 📎 본문 |
| A4 | `src/`의 상대 링크가 모두 살아 있다 | 제외된 skill·guide로 가는 죽은 링크 | 🔒 Tier 0 validate |
| A5 | `dist/`가 새 `src/`로 다시 빌드된다 | 손으로 고친 배포본(C6) | 🔒 Tier 0 dist 검사 |

## 남은 위험

- fork가 19개로, 작업 계획 리스크 신호(M3 이후 15개 초과)를 이미 넘었다. M3 policy fork는 이미 fork된 `orc-mode` 파일 안에서 처리해 새 fork를 늘리지 않는다.
- `{{model-default}}`는 Claude Code에서 "the session model"로 렌더링된다. 그래서 `arena`의 "default to one each on the session model and the session model"처럼 어색한 문장이 생긴다. 동작에는 문제가 없고, 실제 사용에서 혼동이 보이면 해당 문장을 fork한다.
- 실제 하네스에서의 동작은 M2-5 end-to-end에서 확인한다.
